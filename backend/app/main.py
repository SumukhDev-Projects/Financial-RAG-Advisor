from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api import documents, advisor, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB and vector extension on startup."""
    await init_db()
    yield


app = FastAPI(
    title="AI Financial Advisor RAG",
    description="Secure RAG pipeline for financial advisors using Claude",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(advisor.router, prefix="/api/advisor", tags=["advisor"])
