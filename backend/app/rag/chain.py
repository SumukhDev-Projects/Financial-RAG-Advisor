"""
RAG pipeline using Claude (Anthropic) for generation.
Each function handles a distinct advisor use case.
"""
import anthropic
from typing import List, Optional
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _format_context(chunks: List[dict]) -> str:
    """Format retrieved chunks into a readable context block."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(f"[Source {i} — {chunk['filename']}]\n{chunk['content']}")
    return "\n\n---\n\n".join(parts)


def _call_claude(system_prompt: str, user_message: str) -> tuple[str, int]:
    """Single Claude API call. Returns (response_text, input_tokens)."""
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1500,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    text = response.content[0].text
    tokens = response.usage.input_tokens
    return text, tokens


# ── Use Case 1: Ask a Question ────────────────────────────────────────────────

SYSTEM_ASK = """You are a secure AI assistant for financial advisors.
Answer questions ONLY using the provided document context.
Be precise, cite specific figures when available.
If the answer is not in the context, say so clearly — do NOT hallucinate.
Format numbers clearly (e.g., $1.2M, 8.3% YTD)."""

def rag_ask(question: str, chunks: List[dict]) -> tuple[str, int]:
    context = _format_context(chunks)
    user_msg = f"""Context from client documents:
{context}

Advisor question: {question}"""
    return _call_claude(SYSTEM_ASK, user_msg)


# ── Use Case 2: Portfolio Summary ─────────────────────────────────────────────

SYSTEM_SUMMARIZE = """You are a financial analyst AI assistant.
Using the provided documents, generate a structured portfolio summary.
Output format:
## Portfolio Summary
[2-3 paragraph overview]

## Risk Assessment
[Key risk factors, bullet points]

## Key Metrics
[List of important numbers: AUM, returns, allocations, etc.]

Be factual. Only use information present in the documents."""

def rag_summarize(client_name: str, focus_areas: List[str], chunks: List[dict]) -> tuple[str, int]:
    context = _format_context(chunks)
    user_msg = f"""Client: {client_name}
Focus areas: {', '.join(focus_areas)}

Documents:
{context}

Generate a complete portfolio summary."""
    return _call_claude(SYSTEM_SUMMARIZE, user_msg)


# ── Use Case 3: Draft Client Email ────────────────────────────────────────────

SYSTEM_EMAIL = """You are a professional financial advisor drafting client communications.
Write clear, compliant, advisor-quality emails.
Output EXACTLY in this format:
SUBJECT: [subject line here]
---
[email body here]

Guidelines:
- Never make forward-looking guarantees ("will", "guaranteed to")
- Use appropriate disclaimers if discussing performance
- Match the requested tone (professional / friendly / formal)
- Reference specific data from the documents when relevant"""

def rag_draft_email(
    client_name: str,
    email_purpose: str,
    tone: str,
    chunks: List[dict],
    additional_context: Optional[str] = None,
) -> tuple[str, str, int]:
    """Returns (subject, body, tokens)."""
    context = _format_context(chunks)
    extra = f"\nAdditional context: {additional_context}" if additional_context else ""
    
    user_msg = f"""Client: {client_name}
Email purpose: {email_purpose}
Tone: {tone}{extra}

Relevant documents:
{context}

Draft the client email."""
    
    full_response, tokens = _call_claude(SYSTEM_EMAIL, user_msg)
    
    # Parse subject and body
    lines = full_response.strip().split("\n")
    subject = ""
    body_lines = []
    parsing_body = False
    
    for line in lines:
        if line.startswith("SUBJECT:"):
            subject = line.replace("SUBJECT:", "").strip()
        elif line.strip() == "---":
            parsing_body = True
        elif parsing_body:
            body_lines.append(line)
    
    body = "\n".join(body_lines).strip()
    if not subject:
        subject = f"Update for {client_name}"
    
    return subject, body, tokens
