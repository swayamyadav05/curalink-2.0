import math
import re
import string
from datetime import datetime
from difflib import SequenceMatcher
from typing import List

from schemas.response import ClinicalTrial, Publication


_PUNCT_TRANSLATION = str.maketrans("", "", string.punctuation)
_WORD_RE = re.compile(r"[a-z0-9]+")
_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "is",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
    "your",
}


def _normalize_title_for_dedupe(title: str) -> str:
    normalized = (title or "").lower().translate(_PUNCT_TRANSLATION)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _publication_metadata_score(publication: Publication) -> tuple[int, int, int]:
    has_abstract = 1 if (publication.abstract or "").strip() else 0
    author_count = len(publication.authors or [])
    citation_count = int(publication.citationCount or 0)
    return has_abstract, author_count, citation_count


def _extract_keywords(*text_parts: str) -> list[str]:
    tokens: list[str] = []
    for text in text_parts:
        if not text:
            continue
        for token in _WORD_RE.findall(text.lower()):
            if token in _STOPWORDS:
                continue
            if token not in tokens:
                tokens.append(token)
    return tokens


def _keyword_matches(text: str, keywords: list[str]) -> int:
    haystack = (text or "").lower()
    return sum(1 for keyword in keywords if keyword in haystack)


def _score_recency(year: int) -> float:
    if year <= 0:
        return 0.0

    current_year = datetime.now().year
    if year >= current_year - 1:
        return 25.0
    if year >= current_year - 3:
        return 20.0
    if year >= current_year - 5:
        return 15.0
    if year >= current_year - 7:
        return 10.0
    return 5.0


def _percentile(sorted_values: list[int], percentile: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return float(sorted_values[0])

    # Linear interpolation percentile to avoid threshold jumps on small batches.
    rank = (percentile / 100.0) * (len(sorted_values) - 1)
    lower_index = int(math.floor(rank))
    upper_index = int(math.ceil(rank))
    lower_value = sorted_values[lower_index]
    upper_value = sorted_values[upper_index]
    if lower_index == upper_index:
        return float(lower_value)

    fraction = rank - lower_index
    return lower_value + (upper_value - lower_value) * fraction


def deduplicate_publications(publications: List[Publication]) -> List[Publication]:
    deduplicated: list[Publication] = []
    normalized_titles: list[str] = []

    for publication in publications:
        normalized_title = _normalize_title_for_dedupe(publication.title)
        if not normalized_title:
            deduplicated.append(publication)
            normalized_titles.append("")
            continue

        duplicate_index = None
        for index, existing_title in enumerate(normalized_titles):
            if not existing_title:
                continue
            similarity = SequenceMatcher(None, normalized_title, existing_title).ratio() * 100.0
            if similarity > 85.0:
                duplicate_index = index
                break

        if duplicate_index is None:
            deduplicated.append(publication)
            normalized_titles.append(normalized_title)
            continue

        existing = deduplicated[duplicate_index]
        if _publication_metadata_score(publication) > _publication_metadata_score(existing):
            deduplicated[duplicate_index] = publication
            normalized_titles[duplicate_index] = normalized_title

    return deduplicated


def rank_publications(
    publications: List[Publication], query: str, disease: str, top_n: int = 8
) -> List[Publication]:
    if not publications:
        return []

    keywords = _extract_keywords(query, disease)
    keyword_count = len(keywords)

    citation_values = [
        int(publication.citationCount)
        for publication in publications
        if publication.citationCount is not None and int(publication.citationCount) > 0
    ]
    citation_values.sort()
    p50 = _percentile(citation_values, 50.0)
    p75 = _percentile(citation_values, 75.0)
    p90 = _percentile(citation_values, 90.0)

    scored: list[Publication] = []
    for publication in publications:
        title_matches = _keyword_matches(publication.title, keywords) if keyword_count else 0
        title_score = min(40.0, (title_matches / keyword_count) * 40.0) if keyword_count else 0.0

        abstract_text = publication.abstract or ""
        if abstract_text and keyword_count:
            abstract_matches = _keyword_matches(abstract_text, keywords)
            abstract_score = min(20.0, (abstract_matches / keyword_count) * 20.0)
        else:
            abstract_score = 0.0

        recency_score = _score_recency(int(publication.year or 0))

        citation_count = int(publication.citationCount or 0)
        if citation_count <= 0 or not citation_values:
            citation_score = 0.0
        elif citation_count >= p90:
            citation_score = 15.0
        elif citation_count >= p75:
            citation_score = 10.0
        elif citation_count >= p50:
            citation_score = 5.0
        else:
            citation_score = 2.0

        total_score = title_score + abstract_score + recency_score + citation_score
        publication.relevanceScore = round(total_score, 2)
        scored.append(publication)

    scored.sort(key=lambda publication: publication.relevanceScore, reverse=True)
    return scored[:top_n]


def _status_score(status: str) -> float:
    normalized = (status or "").upper().strip().replace(" ", "_")
    if normalized == "RECRUITING":
        return 30.0
    if normalized == "ACTIVE_NOT_RECRUITING":
        return 20.0
    if normalized == "COMPLETED":
        return 15.0
    return 5.0


def _location_score(user_location: str | None, trial_location: str) -> float:
    if not user_location or not user_location.strip():
        return 20.0

    trial_location_lower = (trial_location or "").lower()
    user_parts = [part.strip().lower() for part in user_location.split(",") if part.strip()]
    if not user_parts:
        return 0.0

    city = user_parts[0]
    country = user_parts[-1]

    city_match = city and city in trial_location_lower
    country_match = country and country in trial_location_lower

    if city_match:
        return 40.0
    if country_match:
        return 20.0
    return 0.0


def rank_trials(
    trials: List[ClinicalTrial], query: str, location: str | None = None, top_n: int = 5
) -> List[ClinicalTrial]:
    if not trials:
        return []

    keywords = _extract_keywords(query)
    keyword_count = len(keywords)

    scored: list[tuple[float, ClinicalTrial]] = []
    for trial in trials:
        status_score = _status_score(trial.status)
        location_score = _location_score(location, trial.location)

        combined_text = f"{trial.title} {trial.eligibility}".strip()
        query_matches = _keyword_matches(combined_text, keywords) if keyword_count else 0
        query_score = min(30.0, (query_matches / keyword_count) * 30.0) if keyword_count else 0.0

        total_score = status_score + location_score + query_score
        scored.append((round(total_score, 2), trial))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [trial for _, trial in scored[:top_n]]
