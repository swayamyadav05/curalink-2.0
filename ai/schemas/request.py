from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)

    model_config = ConfigDict(extra="forbid")


class ResearchRequest(BaseModel):
    query: str = Field(min_length=1)
    disease: Optional[str] = None
    location: Optional[str] = None
    conversationHistory: List[ConversationMessage] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")
