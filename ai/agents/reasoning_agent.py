import json
import logging

from agno.agent import Agent
from agno.models.groq import Groq

from config import settings
from schemas.response import ClinicalTrial, Publication, StructuredContent

logger = logging.getLogger(__name__)

reasoning_agent = Agent(
    name="Medical Reasoner",
    model=Groq(
        id=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=0.2,
    ),
    description="Synthesize ranked publications and clinical trials into a structured medical summary.",
    instructions=[
        "You are a medical research analyst synthesizing research papers and clinical trials.",
        "ALWAYS cite specific papers by title and year when making claims.",
        "NEVER hallucinate - only reference the provided papers and trials.",
        "Be empathetic but factual - this is medical information.",
        "If location is provided, prioritize trials near that location.",
        "overview: 2-3 sentences about the condition and the specific query.",
        "insights: detailed paragraph synthesizing key findings, citing studies by [Title, Year].",
        "trialSummary: paragraph about relevant clinical trials including status, locations, and eligibility.",
        "Keep your response concise - under 500 words total.",
        "Target 90-120 words total so the answer remains brief and fast.",
        "Respond with SHORT paragraphs, not essays.",
        "Cite at most 3 publications and at most 3 trials.",
        "Respond ONLY with valid JSON, no markdown, no extra text.",
        "The output must include exactly these keys: overview, insights, trialSummary.",
    ],
    markdown=False,
    add_history_to_context=True,
    num_history_runs=5,
    output_schema=StructuredContent,
    structured_outputs=True,
    use_json_mode=True,
)


def _normalize_inline_text(text: str) -> str:
    return " ".join((text or "").split())


def _trim_text(text: str, max_length: int) -> str:
    normalized = _normalize_inline_text(text)
    if len(normalized) <= max_length:
        return normalized
    return f"{normalized[: max_length - 3].rstrip()}..."


def format_research_context(
    query: str,
    disease: str,
    location: str,
    publications: list[Publication],
    trials: list[ClinicalTrial],
) -> str:
    disease_value = (disease or "").strip() or "Unknown"
    location_value = (location or "").strip() or "Not provided"
    query_value = (query or "").strip()
    limited_publications = publications[:5]

    publication_lines = ["=== TOP RESEARCH PUBLICATIONS ==="]
    if limited_publications:
        for index, publication in enumerate(limited_publications, start=1):
            abstract_text = publication.abstract or "No abstract available."
            publication_lines.extend(
                [
                    f"{index}. Title: {_normalize_inline_text(publication.title)}",
                    f"   Year: {publication.year}",
                    f"   Source: {publication.source}",
                    f"   Abstract: {_trim_text(abstract_text, 100)}",
                    "",
                ]
            )
    else:
        publication_lines.append("No publications were provided.")
        publication_lines.append("")

    trial_lines = ["=== RELEVANT CLINICAL TRIALS ==="]
    if trials:
        for index, trial in enumerate(trials, start=1):
            trial_lines.extend(
                [
                    f"{index}. Title: {_normalize_inline_text(trial.title)}",
                    f"   Status: {_normalize_inline_text(trial.status)}",
                    f"   Location: {_normalize_inline_text(trial.location)}",
                    f"   Eligibility: {_trim_text(trial.eligibility or '', 100)}",
                    "",
                ]
            )
    else:
        trial_lines.append("No clinical trials were provided.")
        trial_lines.append("")

    return (
        f"User Query: {query_value}\n"
        f"Disease: {disease_value}\n"
        f"Location: {location_value}\n\n"
        f"{'\n'.join(publication_lines)}\n"
        f"{'\n'.join(trial_lines)}\n"
        "Based on the above research, generate a structured JSON response with exactly this shape:\n"
        '{"overview":"...","insights":"...","trialSummary":"..."}\n'
        "Keep the full response concise and under 500 words."
    )


async def run_medical_reasoning(context_prompt: str) -> str:
    logger.info("Running medical reasoning synthesis")

    try:
        run_output = await reasoning_agent.arun(context_prompt)
    except Exception as exc:
        logger.exception("AGNO medical reasoning failed")
        raise RuntimeError(
            "Could not run the medical reasoning agent. Ensure GROQ_API_KEY is set and the model is available."
        ) from exc

    content = run_output.content
    if isinstance(content, StructuredContent):
        return content.model_dump_json()

    if hasattr(content, "model_dump_json"):
        return content.model_dump_json()  # type: ignore[no-any-return,union-attr]

    if isinstance(content, dict):
        return json.dumps(content)

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        text_items = [item.strip() for item in content if isinstance(item, str) and item.strip()]
        if text_items:
            return "\n".join(text_items)

    logger.warning("Reasoning agent returned non-text content; coercing to string")
    return str(content).strip()
