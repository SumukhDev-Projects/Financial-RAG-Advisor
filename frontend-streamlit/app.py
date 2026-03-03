"""
Streamlit frontend for AI Financial Advisor RAG
"""
import streamlit as st
import requests
import os
from pathlib import Path

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

st.set_page_config(
    page_title="AI Financial Advisor",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .main { background-color: #0f1117; }
    .stApp { background-color: #0f1117; }
    .source-card {
        background: #1e2130;
        border-left: 3px solid #00d4aa;
        padding: 10px 14px;
        border-radius: 4px;
        margin: 6px 0;
        font-size: 0.85em;
    }
    .metric-pill {
        display: inline-block;
        background: #1e2130;
        border: 1px solid #00d4aa44;
        padding: 4px 12px;
        border-radius: 20px;
        margin: 4px;
        font-size: 0.9em;
    }
</style>
""", unsafe_allow_html=True)


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("📊 Financial RAG")
    st.caption("Powered by Claude + pgvector")
    
    st.divider()
    page = st.radio(
        "Navigate",
        ["📤 Upload Documents", "💬 Ask Advisor", "📋 Portfolio Summary", "✉️ Draft Email"],
        label_visibility="collapsed",
    )
    
    st.divider()
    st.caption("Backend status")
    try:
        r = requests.get(f"{BACKEND_URL}/health", timeout=3)
        if r.status_code == 200:
            data = r.json()
            st.success(f"✅ API: {data['status']} | DB: {data['database']}")
        else:
            st.error("⚠️ API error")
    except Exception:
        st.error("🔴 Backend offline")


# ── Page: Upload Documents ────────────────────────────────────────────────────
if "Upload" in page:
    st.title("📤 Upload Client Documents")
    st.write("Supported formats: **PDF**, **TXT**, **CSV** — Max 20MB per file")

    with st.form("upload_form"):
        uploaded_file = st.file_uploader("Select document", type=["pdf", "txt", "csv"])
        col1, col2 = st.columns(2)
        client_name = col1.text_input("Client Name", placeholder="e.g. John Smith")
        doc_type = col2.selectbox("Document Type", ["portfolio", "report", "email", "statement", "other"])
        submitted = st.form_submit_button("📥 Index Document", use_container_width=True)

    if submitted and uploaded_file:
        with st.spinner("Chunking, embedding, storing..."):
            response = requests.post(
                f"{BACKEND_URL}/api/documents/upload",
                files={"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)},
                data={"client_name": client_name, "doc_type": doc_type},
            )
        if response.status_code == 200:
            data = response.json()
            st.success(f"✅ {data['message']}")
            st.json(data)
        else:
            st.error(f"❌ {response.json().get('detail', 'Unknown error')}")

    st.divider()
    st.subheader("Indexed Documents")
    filter_client = st.text_input("Filter by client", placeholder="Leave blank for all")
    docs_resp = requests.get(f"{BACKEND_URL}/api/documents/", params={"client_name": filter_client or None})
    if docs_resp.status_code == 200:
        docs = docs_resp.json()
        if docs:
            for doc in docs:
                with st.expander(f"📄 {doc['filename']} — {doc.get('client_name', 'No client')}"):
                    st.json(doc)
        else:
            st.info("No documents indexed yet. Upload one above.")


# ── Page: Ask Advisor ─────────────────────────────────────────────────────────
elif "Ask" in page:
    st.title("💬 Ask the Advisor AI")
    st.write("Ask any question about client portfolios. The AI retrieves relevant context and answers using Claude.")

    with st.form("ask_form"):
        question = st.text_area("Your question", placeholder="What is the current asset allocation for John Smith?", height=100)
        col1, col2 = st.columns(2)
        client_filter = col1.text_input("Filter by client (optional)")
        top_k = col2.slider("Sources to retrieve", 3, 10, 5)
        submitted = st.form_submit_button("🔍 Get Answer", use_container_width=True)

    if submitted and question:
        with st.spinner("Retrieving context and querying Claude..."):
            resp = requests.post(f"{BACKEND_URL}/api/advisor/ask", json={
                "question": question,
                "client_name": client_filter or None,
                "top_k": top_k,
            })
        
        if resp.status_code == 200:
            data = resp.json()
            st.subheader("Answer")
            st.markdown(data["answer"])
            st.caption(f"Tokens used: {data.get('tokens_used', 'N/A')}")
            
            st.divider()
            st.subheader(f"📎 Sources ({len(data['sources'])})")
            for src in data["sources"]:
                st.markdown(f"""<div class="source-card">
                    <strong>{src['filename']}</strong> — score: {src['relevance_score']}<br>
                    {src['content_preview']}
                </div>""", unsafe_allow_html=True)
        else:
            st.error(f"❌ {resp.json().get('detail', 'Error')}")


# ── Page: Portfolio Summary ───────────────────────────────────────────────────
elif "Portfolio" in page:
    st.title("📋 Portfolio Summary")

    with st.form("summary_form"):
        client_name = st.text_input("Client Name *", placeholder="John Smith")
        focus = st.multiselect("Focus Areas", ["portfolio", "risk", "performance", "allocation", "fees"], 
                               default=["portfolio", "risk", "performance"])
        submitted = st.form_submit_button("📊 Generate Summary", use_container_width=True)

    if submitted and client_name:
        with st.spinner("Analyzing documents with Claude..."):
            resp = requests.post(f"{BACKEND_URL}/api/advisor/summarize", json={
                "client_name": client_name,
                "focus_areas": focus,
            })

        if resp.status_code == 200:
            data = resp.json()
            
            tab1, tab2, tab3 = st.tabs(["📝 Summary", "⚠️ Risk Notes", "📈 Key Metrics"])
            
            with tab1:
                st.markdown(data["summary"])
            
            with tab2:
                st.markdown(data["risk_notes"])
            
            with tab3:
                for metric in data.get("key_metrics", []):
                    st.markdown(f'<span class="metric-pill">📌 {metric}</span>', unsafe_allow_html=True)
            
            st.divider()
            st.subheader("Sources")
            for src in data["sources"]:
                st.markdown(f'<div class="source-card"><strong>{src["filename"]}</strong> — {src["content_preview"]}</div>',
                            unsafe_allow_html=True)
        else:
            st.error(f"❌ {resp.json().get('detail', 'Error')}")


# ── Page: Draft Email ─────────────────────────────────────────────────────────
elif "Email" in page:
    st.title("✉️ Draft Client Email")

    with st.form("email_form"):
        col1, col2 = st.columns(2)
        client_name = col1.text_input("Client Name *")
        tone = col2.selectbox("Tone", ["professional", "friendly", "formal"])
        email_purpose = st.text_input("Email Purpose", placeholder="Q3 portfolio review, risk alert, annual meeting invite...")
        context = st.text_area("Additional Context (optional)", placeholder="Mention the recent rate changes affecting bonds...")
        submitted = st.form_submit_button("✍️ Draft Email", use_container_width=True)

    if submitted and client_name and email_purpose:
        with st.spinner("Drafting email with Claude..."):
            resp = requests.post(f"{BACKEND_URL}/api/advisor/draft-email", json={
                "client_name": client_name,
                "email_purpose": email_purpose,
                "tone": tone,
                "additional_context": context or None,
            })

        if resp.status_code == 200:
            data = resp.json()
            st.subheader("📬 Draft Email")
            st.text_input("Subject", value=data["subject"])
            st.text_area("Body", value=data["body"], height=350)
            
            col1, col2 = st.columns(2)
            col1.download_button("⬇️ Download .txt", data["body"], file_name=f"email_{client_name}.txt")
            
            st.divider()
            st.caption("Sources used")
            for src in data["sources"]:
                st.markdown(f'<div class="source-card"><strong>{src["filename"]}</strong> — {src["content_preview"]}</div>',
                            unsafe_allow_html=True)
        else:
            st.error(f"❌ {resp.json().get('detail', 'Error')}")
