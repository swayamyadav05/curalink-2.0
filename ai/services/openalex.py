import logging
import re

import httpx

from schemas.response import Publication

logger = logging.getLogger(__name__)

OPENALEX_URL = "https://api.openalex.org/works"


def _normalize_title(title: str) -> str:
    return re.sub(r"\\s+", " ", title.strip()).lower()


def _reconstruct_abstract(inverted_index: dict[str, list[int]] | None) -> str | None:
    if not inverted_index:
        return None

    position_map: dict[int, str] = {}
    for word, positions in inverted_index.items():
        if not isinstance(positions, list):
            continue
        for position in positions:
            if not isinstance(position, int):
                continue
            if position not in position_map:
                position_map[position] = word

    if not position_map:
        return None

    ordered_positions = sorted(position_map)
    tokens = [position_map[position] for position in ordered_positions]
    abstract = " ".join(tokens).strip()
    return abstract or None


def _resolve_openalex_url(work: dict) -> str:
    doi = (work.get("doi") or "").strip()
    if doi:
        if doi.startswith("http://") or doi.startswith("https://"):
            return doi
        cleaned = doi.replace("doi:", "").strip()
        return f"https://doi.org/{cleaned}"

    landing_page_url = ((work.get("primary_location") or {}).get("landing_page_url") or "").strip()
    if landing_page_url:
        return landing_page_url

    return (work.get("id") or "").strip()


async def fetch_openalex(queries: list[str], max_per_query: int = 20) -> list[Publication]:
    if not queries:
        return []

    deduped_queries = [query.strip() for query in queries if query and query.strip()]
    if not deduped_queries:
        return []

    publications: list[Publication] = []
    seen_titles: set[str] = set()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for query in deduped_queries:
                try:
                    response = await client.get(
                        OPENALEX_URL,
                        params={
                            "search": query,
                            "per-page": max_per_query,
                            "sort": "relevance_score:desc",
                            "filter": "from_publication_date:2020-01-01",
                        },
                    )
                    response.raise_for_status()
                    payload = response.json()
                except Exception:
                    logger.exception("OpenAlex fetch failed for query: %s", query)
                    continue

                for work in payload.get("results", []):
                    try:
                        title = (work.get("title") or "").strip()
                        if not title:
                            continue

                        normalized_title = _normalize_title(title)
                        if normalized_title in seen_titles:
                            continue
                        seen_titles.add(normalized_title)

                        authors: list[str] = []
                        for authorship in work.get("authorships", []):
                            display_name = ((authorship.get("author") or {}).get("display_name") or "").strip()
                            if not display_name or display_name in authors:
                                continue
                            authors.append(display_name)
                            if len(authors) >= 5:
                                break

                        publication_year = work.get("publication_year") or 0
                        year = int(publication_year) if isinstance(publication_year, int) else 0
                        abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))
                        citation_count = int(work.get("cited_by_count") or 0)

                        publications.append(
                            Publication(
                                title=title,
                                authors=authors,
                                year=year,
                                source="OpenAlex",
                                url=_resolve_openalex_url(work),
                                abstract=abstract,
                                relevanceScore=0.0,
                                citationCount=citation_count,
                            )
                        )
                    except Exception:
                        logger.exception("Failed to parse one OpenAlex work")
                        continue

        logger.info("OpenAlex fetched %d publications", len(publications))
        return publications
    except Exception:
        logger.exception("Unexpected OpenAlex fetcher failure")
        return []
