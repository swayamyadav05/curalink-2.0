import json
import logging
import re

from agno.agent import Agent
from agno.models.ollama import Ollama

from config import settings
from schemas.request import ResearchRequest

logger = logging.getLogger(__name__)

query_agent = Agent(
    name="Query Expander",
    model=Ollama(id=settings.ollama_model, host=settings.ollama_host),
    description="Expand medical research queries into high-signal search terms.",
    instructions=[
        "You are a medical research query expansion specialist.",
        "Generate 3 to 5 search terms that broaden and refine the user query.",
        "Prioritize terms useful for PubMed, OpenAlex, and ClinicalTrials.gov.",
        "Combine the disease context with the user intent when available.",
        "Include a mix of therapy, mechanism, biomarkers, and trial-oriented phrasing when relevant.",
        "Output ONLY a valid JSON array of strings with no markdown, no preface, and no explanation.",
    ],
    markdown=False,
    add_history_to_context=True,
    num_history_runs=3,
)


def _build_prompt(request: ResearchRequest) -> str:
    history_lines = [
        f"- {message.role}: {message.content.strip()}"
        for message in request.conversationHistory
        if message.content.strip()
    ]

    history_block = "\n".join(history_lines) if history_lines else "- No prior conversation context"

    disease = request.disease.strip() if request.disease else ""
    location = request.location.strip() if request.location else ""

    return (
        "Expand the following user question into 3-5 medical research search terms.\n"
        "Return ONLY a JSON array of strings.\n\n"
        f"User query: {request.query.strip()}\n"
        f"Disease context: {disease or 'None'}\n"
        f"Location context: {location or 'None'}\n"
        "Conversation history:\n"
        f"{history_block}\n"
    )


def _parse_expanded_queries(raw_content: str, fallback_query: str) -> list[str]:
    cleaned = raw_content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    parsed: object
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\[[\s\S]*\]", cleaned)
        if not match:
            logger.warning("Agent output did not contain a JSON array. Falling back.")
            parsed = [fallback_query]
        else:
            parsed = json.loads(match.group(0))

    if not isinstance(parsed, list):
        raise ValueError("Query agent output is not a JSON array")

    normalized: list[str] = []
    for item in parsed:
        if not isinstance(item, str):
            continue
        value = item.strip()
        if value and value not in normalized:
            normalized.append(value)

    if len(normalized) < 3:
        if fallback_query not in normalized:
            normalized.insert(0, fallback_query)
        normalized = normalized[:5]

    return normalized[:5]


async def expand_medical_query(request: ResearchRequest) -> list[str]:
    prompt = _build_prompt(request)
    logger.info("Running query expansion for '%s'", request.query)

    try:
        run_output = await query_agent.arun(prompt)
    except Exception as exc:
        logger.exception("AGNO query expansion failed")
        raise RuntimeError(
            "Could not reach Ollama/AGNO query expander. Ensure Ollama is running and the model is available."
        ) from exc

    content = run_output.content
    if not isinstance(content, str):
        raise ValueError("Query agent returned non-text content")

    expanded = _parse_expanded_queries(content, request.query.strip())
    logger.info("Generated %d expanded query terms", len(expanded))
    return expanded
