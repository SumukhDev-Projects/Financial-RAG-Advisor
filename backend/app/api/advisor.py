from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.schemas import (
    AskRequest, AskResponse,
    SummarizeRequest, SummarizeResponse,
    DraftEmailRequest, DraftEmailResponse,
    SourceChunk, AuditLogOut,
)
from app.models.db_models import AuditLog
from app.utils.ingestion import similarity_search
from app.utils.audit import log_action
from app.rag.chain import rag_ask, rag_summarize, rag_draft_email

router = APIRouter()


def _to_source_chunks(chunks: list) -> list[SourceChunk]:
    return [
        SourceChunk(
            filename=c["filename"],
            content_preview=c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"],
            relevance_score=round(c["score"], 4),
        )
        for c in chunks
    ]


@router.post("/ask", response_model=AskResponse)
async def ask_advisor(req: AskRequest, db: AsyncSession = Depends(get_db)):
    """
    Q&A over indexed financial documents.
    Retrieves relevant context, then generates an answer using Claude.
    """
    chunks = await similarity_search(db, req.question, req.top_k, req.client_name)
    if not chunks:
        raise HTTPException(404, "No relevant documents found. Please upload client documents first.")

    answer, tokens = rag_ask(req.question, chunks)
    await log_action(db, "ask", req.question, answer, chunks, tokens)

    return AskResponse(
        answer=answer,
        sources=_to_source_chunks(chunks),
        tokens_used=tokens,
    )


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_portfolio(req: SummarizeRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate a structured portfolio summary + risk notes for a client.
    """
    query = f"portfolio summary risk performance allocation {req.client_name}"
    chunks = await similarity_search(db, query, top_k=8, client_name=req.client_name)
    if not chunks:
        raise HTTPException(404, f"No documents found for client '{req.client_name}'")

    full_response, tokens = rag_summarize(req.client_name, req.focus_areas, chunks)
    
    # Parse sections from Claude's structured response
    sections = full_response.split("##")
    summary = ""
    risk_notes = ""
    key_metrics = []

    for section in sections:
        section = section.strip()
        if section.startswith("Portfolio Summary"):
            summary = section.replace("Portfolio Summary", "").strip()
        elif section.startswith("Risk Assessment"):
            risk_notes = section.replace("Risk Assessment", "").strip()
        elif section.startswith("Key Metrics"):
            lines = section.replace("Key Metrics", "").strip().split("\n")
            key_metrics = [l.lstrip("- •").strip() for l in lines if l.strip()]

    await log_action(db, "summarize", f"Summarize: {req.client_name}", full_response, chunks, tokens)

    return SummarizeResponse(
        summary=summary or full_response,
        risk_notes=risk_notes or "See full summary above.",
        key_metrics=key_metrics,
        sources=_to_source_chunks(chunks),
    )


@router.post("/draft-email", response_model=DraftEmailResponse)
async def draft_client_email(req: DraftEmailRequest, db: AsyncSession = Depends(get_db)):
    """
    Draft a professional client email grounded in their actual portfolio data.
    """
    query = f"{req.email_purpose} {req.client_name} portfolio performance"
    chunks = await similarity_search(db, query, top_k=5, client_name=req.client_name)
    if not chunks:
        raise HTTPException(404, f"No documents found for client '{req.client_name}'")

    subject, body, tokens = rag_draft_email(
        req.client_name, req.email_purpose, req.tone, chunks, req.additional_context
    )
    await log_action(db, "draft_email", f"{req.email_purpose} for {req.client_name}", body, chunks, tokens)

    return DraftEmailResponse(
        subject=subject,
        body=body,
        sources=_to_source_chunks(chunks),
    )


@router.get("/audit-logs", response_model=List[AuditLogOut])
async def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Return recent audit log entries, newest first."""
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    return result.scalars().all()
