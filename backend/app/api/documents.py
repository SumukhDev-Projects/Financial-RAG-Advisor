from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from app.core.database import get_db
from app.models.schemas import DocumentUploadResponse, DocumentInfo
from app.models.db_models import Document
from app.utils.ingestion import ingest_document

router = APIRouter()

ALLOWED_TYPES = {"application/pdf", "text/plain", "text/csv"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    client_name: Optional[str] = Form(None),
    doc_type: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Upload a financial document and index it for RAG retrieval."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type not supported. Allowed: PDF, TXT, CSV")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large. Max 20MB.")

    try:
        doc_id, chunks = await ingest_document(
            db=db,
            file_bytes=file_bytes,
            filename=file.filename,
            client_name=client_name,
            doc_type=doc_type,
        )
    except ValueError as e:
        raise HTTPException(422, str(e))

    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename,
        chunks_created=chunks,
        message=f"Successfully indexed {chunks} chunks from '{file.filename}'",
    )


@router.get("/", response_model=List[DocumentInfo])
async def list_documents(
    client_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all indexed documents, optionally filtered by client."""
    query = select(Document).order_by(Document.uploaded_at.desc())
    if client_name:
        query = query.where(Document.client_name.ilike(f"%{client_name}%"))
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and all its chunks (cascades)."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    await db.delete(doc)
    await db.commit()
    return {"message": f"Deleted '{doc.filename}'"}
