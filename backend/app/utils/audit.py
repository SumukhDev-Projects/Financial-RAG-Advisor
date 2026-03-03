from sqlalchemy.ext.asyncio import AsyncSession
from app.models.db_models import AuditLog
from app.core.config import settings
from typing import List


async def log_action(
    db: AsyncSession,
    action: str,
    prompt: str,
    response: str,
    retrieved_chunks: List[dict],
    tokens_used: int | None = None,
    advisor_id: str | None = None,
):
    """Write every advisor query + response to audit log."""
    entry = AuditLog(
        action=action,
        prompt=prompt,
        response=response,
        retrieved_chunks=[
            {"filename": c["filename"], "score": c["score"]}
            for c in retrieved_chunks
        ],
        model_used=settings.CLAUDE_MODEL,
        tokens_used=tokens_used,
        advisor_id=advisor_id,
    )
    db.add(entry)
    await db.commit()
