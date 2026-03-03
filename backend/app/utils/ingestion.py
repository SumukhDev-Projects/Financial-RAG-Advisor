import io
import uuid
from typing import List, Tuple

import pypdf
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.db_models import Document, DocumentChunk


# Load embedding model once at module level
_embedder = None

def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedder


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes."""
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def chunk_text(text: str) -> List[str]:
    """Split text into overlapping chunks for retrieval."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def embed_chunks(chunks: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of text chunks."""
    embedder = get_embedder()
    embeddings = embedder.encode(chunks, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()


async def ingest_document(
    db: AsyncSession,
    file_bytes: bytes,
    filename: str,
    client_name: str | None,
    doc_type: str | None,
) -> Tuple[str, int]:
    """
    Full ingestion pipeline:
    1. Extract text
    2. Chunk
    3. Embed
    4. Store in Postgres with pgvector
    Returns (document_id, chunks_created)
    """
    # Extract
    if filename.lower().endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    else:
        text = extract_text_from_txt(file_bytes)

    if not text.strip():
        raise ValueError("Could not extract text from document")

    # Chunk + embed
    chunks = chunk_text(text)
    embeddings = embed_chunks(chunks)

    # Save document record
    doc = Document(
        filename=filename,
        client_name=client_name,
        doc_type=doc_type,
    )
    db.add(doc)
    await db.flush()  # get doc.id

    # Save chunks with embeddings
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        db.add(DocumentChunk(
            document_id=doc.id,
            chunk_index=i,
            content=chunk,
            embedding=embedding,
        ))

    await db.commit()
    return str(doc.id), len(chunks)


async def similarity_search(
    db: AsyncSession,
    query: str,
    top_k: int = 5,
    client_name: str | None = None,
) -> List[dict]:
    """
    Embed query and retrieve top-k most similar chunks.
    Optionally filter by client_name via joined Document table.
    """
    embedder = get_embedder()
    query_embedding = embedder.encode([query], normalize_embeddings=True)[0].tolist()

    # Raw SQL for pgvector cosine similarity
    from sqlalchemy import text
    
    if client_name:
        sql = text("""
            SELECT dc.content, d.filename, 
                   1 - (dc.embedding <=> CAST(:embedding AS vector)) AS score
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            WHERE d.client_name ILIKE :client_name
            ORDER BY dc.embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """)
        result = await db.execute(sql, {
            "embedding": str(query_embedding),
            "client_name": f"%{client_name}%",
            "top_k": top_k,
        })
    else:
        sql = text("""
            SELECT dc.content, d.filename,
                   1 - (dc.embedding <=> CAST(:embedding AS vector)) AS score
            FROM document_chunks dc
            JOIN documents d ON d.id = dc.document_id
            ORDER BY dc.embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """)
        result = await db.execute(sql, {
            "embedding": str(query_embedding),
            "top_k": top_k,
        })

    rows = result.fetchall()
    return [
        {"content": r.content, "filename": r.filename, "score": float(r.score)}
        for r in rows
    ]
