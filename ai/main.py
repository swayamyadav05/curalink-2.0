import asyncio
import json
import logging
import re

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents.query_agent import expand_medical_query
from agents.reasoning_agent import (
    format_research_context,
    run_medical_reasoning,
)
from config import settings
from schemas.request import ResearchRequest
from schemas.response import ResearchResponse, StructuredContent
from services.clinical_trials import fetch_clinical_trials
from services.openalex import fetch_openalex
from services.pubmed import fetch_pubmed
from services.ranker import deduplicate_publications, rank_publications, rank_trials

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="CuraLink AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def check_ollama_connected() -> bool:
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(f"{settings.ollama_host}/api/tags")
            return response.status_code == 200
    except httpx.HTTPError:
        return False


@app.get("/api/health")
async def health_check() -> dict[str, object]:
    ollama_connected = await check_ollama_connected()
    return {"status": "ok", "ollama_connected": ollama_connected}


def _strip_json_code_fences(raw_text: str) -> str:
    cleaned = (raw_text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _extract_reasoning_json(raw_text: str) -> dict[str, object] | None:
    cleaned = _strip_json_code_fences(raw_text)

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        return None

    try:
        extracted = json.loads(match.group(0))
        if isinstance(extracted, dict):
            return extracted
    except json.JSONDecodeError:
        return None

    return None


def _build_structured_content_from_reasoning(raw_text: str) -> tuple[StructuredContent, bool]:
    parsed_json = _extract_reasoning_json(raw_text)
    if parsed_json is not None:
        overview = str(parsed_json.get("overview", "")).strip()
        insights = str(parsed_json.get("insights", "")).strip()
        trial_summary = str(parsed_json.get("trialSummary", "")).strip()

        if overview or insights or trial_summary:
            normalized_overview = overview or insights or trial_summary
            return (
                StructuredContent(
                    overview=normalized_overview,
                    insights=insights,
                    trialSummary=trial_summary,
                ),
                True,
            )

    fallback_overview = (raw_text or "").strip() or "No reasoning output was produced."
    return (
        StructuredContent(
            overview=fallback_overview,
            insights="",
            trialSummary="",
        ),
        False,
    )


@app.post("/api/research", response_model=ResearchResponse)
async def research(request: ResearchRequest) -> ResearchResponse:
    logger.info("Received research request for query='%s'", request.query)
    query_text = request.query.strip()
    requested_disease = (request.disease or "").strip()

    ollama_connected = await check_ollama_connected()
    if not ollama_connected:
        message = (
            "Ollama is not reachable at "
            f"{settings.ollama_host}. Start Ollama with 'ollama serve' and pull the model with "
            f"'ollama pull {settings.ollama_model}'."
        )
        logger.warning(message)
        raise HTTPException(status_code=503, detail=message)

    try:
        expanded_queries = await asyncio.wait_for(expand_medical_query(request), timeout=60)
    except asyncio.TimeoutError:
        fallback_term = f"{requested_disease} {query_text}".strip()
        expanded_queries = [fallback_term]
        logger.warning(
            "Query expansion timed out after 60 seconds; using fallback search term '%s'",
            fallback_term,
        )
    except RuntimeError as exc:
        logger.warning("Query expansion unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        logger.warning("Query expansion parsing issue: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Query expansion returned an invalid format. Expected a JSON array of strings.",
        ) from exc
    except Exception as exc:
        logger.exception("Unhandled error during query expansion")
        raise HTTPException(status_code=500, detail="Internal error during research processing") from exc

    disease_context = requested_disease
    if not disease_context:
        disease_context = query_text
        logger.warning("Disease context missing in request. Falling back to user query.")

    gather_results = await asyncio.gather(
        fetch_pubmed(expanded_queries),
        fetch_openalex(expanded_queries),
        fetch_clinical_trials(disease_context, expanded_queries, request.location),
        return_exceptions=True,
    )

    pubmed_publications = gather_results[0] if isinstance(gather_results[0], list) else []
    openalex_publications = gather_results[1] if isinstance(gather_results[1], list) else []
    clinical_trials = gather_results[2] if isinstance(gather_results[2], list) else []

    if isinstance(gather_results[0], Exception):
        logger.exception("PubMed gather task failed", exc_info=gather_results[0])
    if isinstance(gather_results[1], Exception):
        logger.exception("OpenAlex gather task failed", exc_info=gather_results[1])
    if isinstance(gather_results[2], Exception):
        logger.exception("ClinicalTrials gather task failed", exc_info=gather_results[2])

    publications = [*pubmed_publications, *openalex_publications]
    total_publications = len(publications)
    total_trials = len(clinical_trials)

    deduplicated_publications = deduplicate_publications(publications)
    ranked_publications = rank_publications(
        deduplicated_publications,
        query=request.query,
        disease=disease_context,
        top_n=8,
    )
    ranked_trials = rank_trials(
        clinical_trials,
        query=request.query,
        location=request.location,
        top_n=5,
    )

    logger.info(
        "Ranked %d publications down to 8, %d trials down to 5",
        len(deduplicated_publications),
        total_trials,
    )
    for index, publication in enumerate(ranked_publications[:3], start=1):
        logger.info(
            "Top publication #%d: %s (score=%.2f)",
            index,
            publication.title,
            publication.relevanceScore,
        )

    reasoning_context = format_research_context(
        query=request.query,
        disease=disease_context,
        location=request.location or "",
        publications=ranked_publications,
        trials=ranked_trials,
    )

    try:
        raw_reasoning_output = await asyncio.wait_for(run_medical_reasoning(reasoning_context), timeout=30)
        structured_content, parsed_as_json = _build_structured_content_from_reasoning(raw_reasoning_output)
        if parsed_as_json:
            logger.info("Medical reasoning output parsed as strict JSON")
        else:
            logger.warning("Medical reasoning output was malformed JSON; fallback extraction applied")
    except asyncio.TimeoutError:
        logger.warning("Medical reasoning timed out after 30 seconds; returning fallback structured summary")
        structured_content = StructuredContent(
            overview="Research analysis timed out. Showing ranked publications and trials below.",
            insights="Please review the publications listed below for detailed findings.",
            trialSummary="Clinical trials are listed below ranked by relevance and location.",
        )
    except RuntimeError as exc:
        logger.warning("Medical reasoning unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error during medical reasoning")
        raise HTTPException(status_code=500, detail="Internal error during medical reasoning") from exc

    response = ResearchResponse(
        structured=structured_content,
        publications=ranked_publications,
        clinicalTrials=ranked_trials,
        expandedQueries=expanded_queries,
    )

    logger.info(
        "Returning research response with %d expanded queries, %d publications, and %d trials",
        len(expanded_queries),
        len(ranked_publications),
        len(ranked_trials),
    )
    return response
