import logging
import re
import xml.etree.ElementTree as ET

import httpx

from schemas.response import Publication

logger = logging.getLogger(__name__)

PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
REQUEST_HEADERS = {"User-Agent": "CuraLink/1.0 (Medical Research Assistant)"}


def _text_or_empty(node: ET.Element | None) -> str:
    if node is None:
        return ""
    return "".join(node.itertext()).strip()


def _extract_year(article: ET.Element) -> int:
    year_text = (
        article.findtext(".//PubDate/Year")
        or article.findtext(".//ArticleDate/Year")
        or article.findtext(".//DateCompleted/Year")
        or ""
    )
    if year_text.isdigit():
        return int(year_text)

    medline_date = article.findtext(".//PubDate/MedlineDate") or ""
    match = re.search(r"(19|20)\\d{2}", medline_date)
    return int(match.group(0)) if match else 0


def _extract_abstract(article: ET.Element) -> str | None:
    chunks: list[str] = []
    for abstract_text in article.findall(".//Abstract/AbstractText"):
        text = _text_or_empty(abstract_text)
        if not text:
            continue
        label = (abstract_text.attrib.get("Label") or "").strip()
        chunks.append(f"{label}: {text}" if label else text)

    if not chunks:
        return None
    return " ".join(chunks).strip()


def _extract_authors(article: ET.Element) -> list[str]:
    authors: list[str] = []
    for author in article.findall(".//AuthorList/Author"):
        collective_name = (author.findtext("CollectiveName") or "").strip()
        if collective_name:
            if collective_name not in authors:
                authors.append(collective_name)
            if len(authors) >= 5:
                break
            continue

        last_name = (author.findtext("LastName") or "").strip()
        fore_name = (author.findtext("ForeName") or "").strip()
        full_name = " ".join(part for part in [fore_name, last_name] if part).strip()
        if not full_name:
            continue
        if full_name not in authors:
            authors.append(full_name)
        if len(authors) >= 5:
            break

    return authors


def _parse_pubmed_xml(xml_content: str) -> list[Publication]:
    publications: list[Publication] = []

    root = ET.fromstring(xml_content)
    for article in root.findall(".//PubmedArticle"):
        try:
            pmid = (article.findtext(".//MedlineCitation/PMID") or "").strip()
            title_node = article.find(".//ArticleTitle")
            title = _text_or_empty(title_node) or "Untitled PubMed Article"
            abstract = _extract_abstract(article)
            authors = _extract_authors(article)
            year = _extract_year(article)
            url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

            publications.append(
                Publication(
                    title=title,
                    authors=authors,
                    year=year,
                    source="PubMed",
                    url=url,
                    abstract=abstract,
                    relevanceScore=0.0,
                )
            )
        except Exception:
            logger.exception("Failed to parse one PubMed article node")
            continue

    return publications


async def fetch_pubmed(queries: list[str], max_per_query: int = 20) -> list[Publication]:
    if not queries:
        return []

    deduped_queries = [query.strip() for query in queries if query and query.strip()]
    if not deduped_queries:
        return []

    all_pmids: set[str] = set()

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=REQUEST_HEADERS) as client:
            for query in deduped_queries:
                try:
                    response = await client.get(
                        PUBMED_SEARCH_URL,
                        params={
                            "db": "pubmed",
                            "term": query,
                            "retmax": max_per_query,
                            "sort": "pub date",
                            "retmode": "json",
                        },
                    )
                    response.raise_for_status()
                    payload = response.json()
                    pmids = payload.get("esearchresult", {}).get("idlist", [])
                    all_pmids.update(str(pmid) for pmid in pmids if str(pmid).strip())
                except Exception:
                    logger.exception("PubMed esearch failed for query: %s", query)
                    continue

            if not all_pmids:
                logger.warning("PubMed returned no IDs for queries")
                return []

            try:
                fetch_response = await client.get(
                    PUBMED_FETCH_URL,
                    params={
                        "db": "pubmed",
                        "id": ",".join(sorted(all_pmids)),
                        "retmode": "xml",
                    },
                )
                fetch_response.raise_for_status()
            except Exception:
                logger.exception("PubMed efetch failed for %d IDs", len(all_pmids))
                return []

        publications = _parse_pubmed_xml(fetch_response.text)
        logger.info("PubMed fetched %d publications", len(publications))
        return publications
    except Exception:
        logger.exception("Unexpected PubMed fetcher failure")
        return []
