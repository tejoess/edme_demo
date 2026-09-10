"""
Requirement Agent — PM-facing intake for Phase 1 of the agentic pipeline.

PM pastes a rough requirement (and optionally some context about the
existing codebase) -> the agent asks MCQ clarifying questions so nothing
gets built on an assumption -> drafts a developer-ready Technical PRD ->
PM approves (or sends it back with notes) -> optionally pushed straight
to Jira as a ticket, ready for phase 3 (planner) to pick up.

Setup:
    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...
    # optional, only needed for the "Push to Jira" button:
    export JIRA_BASE_URL=https://yoursite.atlassian.net
    export JIRA_EMAIL=you@example.com
    export JIRA_API_TOKEN=...
    export JIRA_PROJECT_KEY=KAN
    streamlit run app.py
"""

import json
import os

import requests
import streamlit as st
from anthropic import Anthropic

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")

SYSTEM_ANALYZE = """You are a Requirements Agent for a software team. Given a PM's rough \
requirement (and optional context about the existing codebase), identify genuine \
ambiguities that would change the technical design or scope depending on the answer. \
Only ask about things that would actually change what gets built — never implementation \
details a PM wouldn't know or care about.

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"confident": true|false, "questions": [{"id": "q1", "question": "...", \
"options": ["...", "...", "...", "Other"]}]}

If you have enough information to draft a complete, unambiguous technical PRD without \
asking anything, set confident=true and questions=[]. Otherwise set confident=false and \
include 2-4 questions, each with 3-4 concrete options plus "Other" as the last option. \
Never ask more than 4 questions."""

SYSTEM_DRAFT = """You are a Requirements Agent for a software team. Draft a developer-ready \
Technical PRD from a PM's requirement, any codebase context, and (if provided) their \
answers to clarifying questions.

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "title": "short title",
  "summary": "2-4 sentences, plain language",
  "acceptance_criteria": ["...", "..."],
  "out_of_scope": ["...", "..."],
  "risk_tier": "LOW|MEDIUM|HIGH|CRITICAL",
  "risk_rationale": "one sentence",
  "open_questions": []
}

Use LOW for isolated feature work with no schema/auth/infra impact, MEDIUM for shared \
services or API changes, HIGH for auth/schema/security-sensitive logic, CRITICAL for \
production infra/IAM/payments/destructive operations. Leave open_questions empty unless \
something genuinely still can't be resolved even after the Q&A."""

SYSTEM_REVISE = """You are revising a previously drafted Technical PRD based on the PM's \
feedback. Keep everything the feedback didn't object to; change only what it addresses. \
Respond with ONLY valid JSON, in the same shape as the PRD you were given — same keys, \
same structure."""


def get_client():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    return Anthropic(api_key=key)


def call_json(client, system, user_content):
    resp = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    text = "".join(block.text for block in resp.content if block.type == "text").strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


def analyze(client, prd_text, context_text):
    user = f"PM's requirement:\n{prd_text}\n\nCodebase context (if any):\n{context_text or '(none provided — treat as a new feature area)'}"
    return call_json(client, SYSTEM_ANALYZE, user)


def draft(client, prd_text, context_text, qa_pairs):
    qa_block = "\n".join(f"Q: {q}\nA: {a}" for q, a in qa_pairs) if qa_pairs else "(no clarifying questions were needed)"
    user = f"PM's requirement:\n{prd_text}\n\nCodebase context:\n{context_text or '(none)'}\n\nClarifying Q&A:\n{qa_block}"
    return call_json(client, SYSTEM_DRAFT, user)


def revise(client, current_prd, notes):
    user = f"Current Technical PRD:\n{json.dumps(current_prd, indent=2)}\n\nPM's feedback:\n{notes}"
    return call_json(client, SYSTEM_REVISE, user)


def text_to_adf(text):
    paragraphs = [p for p in text.split("\n") if p.strip()] or [text or " "]
    return {
        "type": "doc",
        "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": p}]} for p in paragraphs],
    }


def prd_to_description(prd):
    lines = [prd["summary"], "", "Acceptance criteria:"]
    lines += [f"- {c}" for c in prd["acceptance_criteria"]]
    if prd.get("out_of_scope"):
        lines += ["", "Out of scope:"] + [f"- {c}" for c in prd["out_of_scope"]]
    lines += ["", f"Risk tier: {prd['risk_tier']} — {prd.get('risk_rationale', '')}"]
    return "\n".join(lines)


def push_to_jira(prd):
    base = os.environ["JIRA_BASE_URL"].rstrip("/")
    email = os.environ["JIRA_EMAIL"]
    token = os.environ["JIRA_API_TOKEN"]
    project = os.environ.get("JIRA_PROJECT_KEY", "KAN")
    resp = requests.post(
        f"{base}/rest/api/3/issue",
        json={
            "fields": {
                "project": {"key": project},
                "summary": prd["title"],
                "description": text_to_adf(prd_to_description(prd)),
                "issuetype": {"name": "Task"},
            }
        },
        auth=(email, token),
        headers={"Content-Type": "application/json"},
        timeout=20,
    )
    resp.raise_for_status()
    key = resp.json()["key"]
    return key, f"{base}/browse/{key}"


def jira_configured():
    return all(os.environ.get(v) for v in ("JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"))


# ---------------------------------------------------------------- UI ----

st.set_page_config(page_title="Requirement Agent", page_icon="🧭", layout="centered")

if "stage" not in st.session_state:
    st.session_state.stage = "input"
    st.session_state.prd_text = ""
    st.session_state.context_text = ""
    st.session_state.questions = []
    st.session_state.answers = {}
    st.session_state.prd = None
    st.session_state.history = []

with st.sidebar:
    st.markdown("### Status")
    st.write("Anthropic API key: " + ("✅ set" if os.environ.get("ANTHROPIC_API_KEY") else "❌ missing"))
    st.write("Jira push: " + ("✅ configured" if jira_configured() else "⬜ not configured (optional)"))
    st.caption(f"Model: {MODEL}")
    if st.session_state.history:
        st.markdown("### This session")
        for h in st.session_state.history:
            st.caption(f"• {h}")
    st.markdown("---")
    st.caption("Phase 1 of the agentic pipeline — turns a PM requirement into a zero-assumption Technical PRD before any Jira ticket or code exists.")

st.title("Requirement Agent")
st.caption("Raise a requirement in plain language. Answer a few multiple-choice questions. Get a developer-ready spec — with zero assumptions made on your behalf.")

client = get_client()
if client is None:
    st.error("ANTHROPIC_API_KEY is not set. Export it and restart the app to use this tool.")
    st.stop()

# ---- Stage: input -----------------------------------------------------
if st.session_state.stage == "input":
    st.session_state.prd_text = st.text_area(
        "What do you need?",
        value=st.session_state.prd_text,
        height=150,
        placeholder="e.g. Add a way for HR to upload an employee list and have the app tell them who's approved and why.",
    )
    st.session_state.context_text = st.text_area(
        "Codebase context (optional)",
        value=st.session_state.context_text,
        height=90,
        placeholder="e.g. This is a new tab in our existing Streamlit policy-rules app. It already has a rules engine we can call.",
    )
    if st.button("Analyze requirement", type="primary", disabled=not st.session_state.prd_text.strip()):
        with st.spinner("Reading the requirement, checking for ambiguity..."):
            result = analyze(client, st.session_state.prd_text, st.session_state.context_text)
        if result.get("confident") or not result.get("questions"):
            with st.spinner("Drafting the Technical PRD..."):
                st.session_state.prd = draft(client, st.session_state.prd_text, st.session_state.context_text, [])
            st.session_state.stage = "review"
        else:
            st.session_state.questions = result["questions"]
            st.session_state.answers = {}
            st.session_state.stage = "questions"
        st.rerun()

# ---- Stage: questions ---------------------------------------------------
elif st.session_state.stage == "questions":
    st.subheader("A few quick questions")
    st.caption("Answering these now means nothing gets built on a guess.")
    for q in st.session_state.questions:
        choice = st.radio(q["question"], q["options"], key=f"radio_{q['id']}")
        if choice == "Other":
            choice = st.text_input("Please specify", key=f"other_{q['id']}")
        st.session_state.answers[q["id"]] = choice
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Submit answers", type="primary"):
            qa_pairs = [(q["question"], st.session_state.answers.get(q["id"], "")) for q in st.session_state.questions]
            with st.spinner("Drafting the Technical PRD..."):
                st.session_state.prd = draft(client, st.session_state.prd_text, st.session_state.context_text, qa_pairs)
            st.session_state.stage = "review"
            st.rerun()
    with col2:
        if st.button("Start over"):
            for k in ("stage", "prd_text", "context_text", "questions", "answers", "prd"):
                del st.session_state[k]
            st.rerun()

# ---- Stage: review ------------------------------------------------------
elif st.session_state.stage == "review":
    prd = st.session_state.prd
    st.subheader(prd["title"])
    tier_color = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}.get(prd["risk_tier"], "⚪")
    st.markdown(f"{tier_color} **{prd['risk_tier']} risk** — {prd.get('risk_rationale', '')}")
    st.write(prd["summary"])

    st.markdown("**Acceptance criteria**")
    for c in prd["acceptance_criteria"]:
        st.markdown(f"- {c}")

    if prd.get("out_of_scope"):
        st.markdown("**Out of scope**")
        for c in prd["out_of_scope"]:
            st.markdown(f"- {c}")

    if prd.get("open_questions"):
        st.markdown("**Still open**")
        for c in prd["open_questions"]:
            st.markdown(f"- {c}")

    st.markdown("---")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("✅ Approve", type="primary"):
            st.session_state.history.append(f"Approved: {prd['title']}")
            st.session_state.stage = "approved"
            st.rerun()
    with col2:
        with st.popover("✏️ Send back with notes"):
            notes = st.text_area("What should change?", key="revise_notes")
            if st.button("Submit feedback"):
                with st.spinner("Revising..."):
                    st.session_state.prd = revise(client, prd, notes)
                st.rerun()

# ---- Stage: approved ------------------------------------------------------
elif st.session_state.stage == "approved":
    prd = st.session_state.prd
    st.success(f"Approved: {prd['title']}")
    st.json(prd, expanded=False)

    if jira_configured():
        if st.button("Push to Jira", type="primary"):
            with st.spinner("Creating the ticket..."):
                try:
                    key, url = push_to_jira(prd)
                    st.success(f"Created [{key}]({url})")
                    st.session_state.history.append(f"Pushed to Jira: {key}")
                except Exception as e:
                    st.error(f"Jira push failed: {e}")
    else:
        st.info("Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN (and optionally JIRA_PROJECT_KEY) to enable pushing this straight to Jira. Until then, copy the PRD above into a ticket manually.")

    if st.button("Start another requirement"):
        for k in ("stage", "prd_text", "context_text", "questions", "answers", "prd"):
            del st.session_state[k]
        st.rerun()
