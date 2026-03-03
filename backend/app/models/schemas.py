from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ── Document Schemas ──────────────────────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_created: int
    message: str


class DocumentInfo(BaseModel):
    id: UUID
    filename: str
    client_name: Optional[str]
    doc_type: Optional[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ── Advisor Request Schemas ───────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=2000)
    client_name: Optional[str] = None
    top_k: Optional[int] = Field(5, ge=1, le=20)


class SummarizeRequest(BaseModel):
    client_name: str
    focus_areas: Optional[List[str]] = ["portfolio", "risk", "performance"]


class DraftEmailRequest(BaseModel):
    client_name: str
    email_purpose: str = Field(..., description="e.g. quarterly review, risk alert, onboarding")
    tone: Optional[str] = Field("professional", description="professional | friendly | formal")
    additional_context: Optional[str] = None


# ── Advisor Response Schemas ──────────────────────────────────────────────────

class SourceChunk(BaseModel):
    filename: str
    content_preview: str
    relevance_score: float


class AskResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    tokens_used: Optional[int]


class SummarizeResponse(BaseModel):
    summary: str
    risk_notes: str
    key_metrics: List[str]
    sources: List[SourceChunk]


class DraftEmailResponse(BaseModel):
    subject: str
    body: str
    sources: List[SourceChunk]


# ── Audit Schema ──────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: UUID
    action: str
    prompt: str
    response: str
    model_used: str
    tokens_used: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
