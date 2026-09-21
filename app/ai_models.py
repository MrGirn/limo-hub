from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

Role = Literal['booking', 'support', 'quote', 'dispatch', 'recovery', 'finance', 'vendor_operations']


class Citation(BaseModel):
    model_config = ConfigDict(extra='forbid')
    document_id: str
    excerpt: str = Field(min_length=5, max_length=600)


class AgentOutput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    status: Literal['answered', 'needs_information', 'unable_to_determine']
    answer: str = Field(max_length=6000)
    citations: list[Citation] = Field(default_factory=list, max_length=12)
    missing_fields: list[str] = Field(default_factory=list, max_length=20)
    extracted_fields: dict[str, str] = Field(default_factory=dict)
    proposed_actions: list[str] = Field(default_factory=list, max_length=10)


class Critique(BaseModel):
    model_config = ConfigDict(extra='forbid')
    supported: bool
    issues: list[str] = Field(default_factory=list, max_length=10)


class AgentRequest(BaseModel):
    role: Role = 'support'
    question: str = Field(min_length=3, max_length=4000)
    facts: dict[str, str] = Field(default_factory=dict, max_length=30)
    graph_enabled: bool = True


class DocumentRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=10, max_length=60000)
    valid_from: str | None = None
    valid_until: str | None = None


class EdgeRequest(BaseModel):
    source: str = Field(min_length=1, max_length=120)
    relation: str = Field(min_length=1, max_length=120)
    target: str = Field(min_length=1, max_length=120)
    document_id: str


class EvaluationCase(BaseModel):
    request: AgentRequest
    expected_status: Literal['answered', 'needs_information', 'unable_to_determine']
    expected_document_ids: list[str] = Field(default_factory=list)


class EvaluationRequest(BaseModel):
    cases: list[EvaluationCase] = Field(min_length=1, max_length=10)
