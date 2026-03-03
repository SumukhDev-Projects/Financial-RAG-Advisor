from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

from app.core.database import Base
from app.core.config import settings


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    client_name = Column(String(255), nullable=True)
    doc_type = Column(String(50), nullable=True)  # portfolio, report, email, etc.
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    metadata_ = Column("metadata", JSON, default={})


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"))
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(settings.EMBEDDING_DIMENSION))
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action = Column(String(50), nullable=False)   # ask, summarize, draft_email
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    retrieved_chunks = Column(JSON, default=[])
    model_used = Column(String(100))
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    advisor_id = Column(String(255), nullable=True)
