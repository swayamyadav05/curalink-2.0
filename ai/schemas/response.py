from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class Publication(BaseModel):
    title: str
    authors: List[str]
    year: int
    source: Literal["PubMed", "OpenAlex"]
    url: str
    abstract: Optional[str] = None
    relevanceScore: float
    citationCount: Optional[int] = 0

    model_config = ConfigDict(extra="forbid")


class ClinicalTrial(BaseModel):
    title: str
    status: str
    eligibility: str
    location: str
    contact: str
    url: str

    model_config = ConfigDict(extra="forbid")


class StructuredContent(BaseModel):
    overview: str
    insights: str
    trialSummary: str

    model_config = ConfigDict(extra="forbid")


class ResearchResponse(BaseModel):
    structured: StructuredContent
    publications: List[Publication]
    clinicalTrials: List[ClinicalTrial]
    expandedQueries: List[str]

    model_config = ConfigDict(extra="forbid")
