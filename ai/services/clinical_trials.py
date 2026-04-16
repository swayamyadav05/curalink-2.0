import asyncio
import json
import logging
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import httpx

from schemas.response import ClinicalTrial

logger = logging.getLogger(__name__)

CLINICAL_TRIALS_URL = "https://clinicaltrials.gov/api/v2/studies"
_MULTISPACE_RE = re.compile(r"\s+")
_NON_DISEASE_PREFIXES = (
    r"latest\s+treatments?\s+for\s+",
    r"current\s+treatments?\s+for\s+",
    r"best\s+treatments?\s+for\s+",
    r"clinical\s+trials?\s+for\s+",
    r"recent\s+(?:studies|research)\s+on\s+",
    r"(?:latest|recent)\s+research\s+on\s+",
)


def _fetch_json_via_urllib(url: str, timeout: float = 10.0) -> dict:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json,text/plain,*/*",
    }
    request = Request(url=url, headers=headers)
    with urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8", errors="replace")
    return json.loads(raw)


def _truncate_eligibility(text: str, max_length: int = 500) -> str:
    cleaned = (text or "").strip()
    if len(cleaned) <= max_length:
        return cleaned
    return f"{cleaned[: max_length - 3].rstrip()}..."


def _format_locations(locations: list[dict]) -> str:
    rendered: list[str] = []
    for location in locations:
        city = (location.get("city") or "").strip()
        country = (location.get("country") or "").strip()
        place = ", ".join(part for part in [city, country] if part)
        if not place or place in rendered:
            continue
        rendered.append(place)
        if len(rendered) >= 3:
            break

    return "; ".join(rendered) if rendered else "Not specified"


def _format_contact(contacts: list[dict]) -> str:
    if not contacts:
        return "Not provided"

    contact = contacts[0] or {}
    name = (contact.get("name") or "").strip()
    email = (contact.get("email") or "").strip()
    phone = (contact.get("phone") or "").strip()

    if name and email:
        return f"{name} ({email})"
    if email:
        return email
    if name and phone:
        return f"{name} ({phone})"
    if phone:
        return phone
    if name:
        return name
    return "Not provided"


def _normalize_condition_term(raw_disease: str) -> str:
    cleaned = _MULTISPACE_RE.sub(" ", (raw_disease or "").strip())
    if not cleaned:
        return ""

    lowered = cleaned.lower()
    for prefix in _NON_DISEASE_PREFIXES:
        match = re.match(prefix + r"(.+)$", lowered)
        if match:
            extracted = cleaned[len(cleaned) - len(match.group(1)) :].strip()
            if extracted:
                cleaned = extracted
                lowered = cleaned.lower()
                break

    if " for " in lowered and len(cleaned.split()) > 4:
        candidate = cleaned.rsplit(" for ", 1)[-1].strip()
        if candidate:
            cleaned = candidate

    cleaned = re.sub(r"\s+near\s+me$", "", cleaned, flags=re.IGNORECASE).strip(" .?!,:;")
    return cleaned


async def _fetch_trials_payload(params: dict[str, str | int]) -> dict:
    query_url = f"{CLINICAL_TRIALS_URL}?{urlencode(params)}"
    logger.info("ClinicalTrials request URL: %s", query_url)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(CLINICAL_TRIALS_URL, params=params)
            if response.status_code == 403:
                logger.warning("ClinicalTrials returned 403 via httpx; retrying with urllib fallback")
                return await asyncio.to_thread(_fetch_json_via_urllib, query_url, 10.0)

            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        if status_code == 403:
            logger.warning("ClinicalTrials httpx error 403; retrying with urllib fallback")
            return await asyncio.to_thread(_fetch_json_via_urllib, query_url, 10.0)
        raise


def _parse_trials(studies: list[dict]) -> list[ClinicalTrial]:
    clinical_trials: list[ClinicalTrial] = []

    for study in studies:
        try:
            protocol_section = study.get("protocolSection", {})
            identification_module = protocol_section.get("identificationModule", {})
            status_module = protocol_section.get("statusModule", {})
            eligibility_module = protocol_section.get("eligibilityModule", {})
            contacts_module = protocol_section.get("contactsLocationsModule", {})

            title = (identification_module.get("briefTitle") or "Untitled Clinical Trial").strip()
            status = (status_module.get("overallStatus") or "UNKNOWN").strip()
            eligibility = _truncate_eligibility(eligibility_module.get("eligibilityCriteria") or "")
            locations = contacts_module.get("locations", []) or []
            location_text = _format_locations(locations)
            contact_text = _format_contact(contacts_module.get("centralContacts", []) or [])
            nct_id = (identification_module.get("nctId") or "").strip()
            url = f"https://clinicaltrials.gov/study/{nct_id}" if nct_id else "https://clinicaltrials.gov"

            clinical_trials.append(
                ClinicalTrial(
                    title=title,
                    status=status,
                    eligibility=eligibility,
                    location=location_text,
                    contact=contact_text,
                    url=url,
                )
            )
        except Exception:
            logger.exception("Failed to parse one ClinicalTrials study")
            continue

    return clinical_trials


async def fetch_clinical_trials(
    disease: str,
    queries: list[str],
    location: str | None = None,
    max_results: int = 20,
) -> list[ClinicalTrial]:
    normalized_disease = _normalize_condition_term(disease)
    if not normalized_disease:
        logger.warning("ClinicalTrials fetch skipped because disease is empty")
        return []

    terms = [query.strip() for query in queries if query and query.strip()]
    term_expression = " OR ".join(terms)

    params: dict[str, str | int] = {
        "query.cond": normalized_disease,
        "query.term": term_expression,
        "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED",
        "pageSize": max_results,
        "format": "json",
    }
    if not term_expression:
        del params["query.term"]
    if location and location.strip():
        params["query.locn"] = location.strip()

    try:
        payload = await _fetch_trials_payload(params)
        studies = payload.get("studies", [])

        if not studies:
            logger.warning(
                "ClinicalTrials returned 0 studies with combined filters; retrying cond-only query for '%s'",
                normalized_disease,
            )
            fallback_params: dict[str, str | int] = {
                "query.cond": normalized_disease,
                "pageSize": max_results,
                "format": "json",
            }
            fallback_payload = await _fetch_trials_payload(fallback_params)
            studies = fallback_payload.get("studies", [])

        clinical_trials = _parse_trials(studies)
        logger.info("ClinicalTrials.gov fetched %d trials", len(clinical_trials))
        return clinical_trials
    except Exception:
        logger.exception("ClinicalTrials.gov fetch failed")
        return []
