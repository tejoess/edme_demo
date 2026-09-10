# Requirement Agent — PM-facing app

Phase 1 of the pipeline, as a real (not simulated) working app. A PM
pastes a rough requirement, answers a handful of multiple-choice
questions the agent generates on the fly, and gets back a developer-ready
Technical PRD — with an optional one-click push straight to Jira.

This calls the real Anthropic API for every step (question generation,
drafting, revision). It is not a mock — it costs a small number of real
API tokens per run.

## Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
streamlit run app.py
```

Open the URL Streamlit prints (usually `http://localhost:8501`).

## Optional: push straight to Jira

```bash
export JIRA_BASE_URL=https://yoursite.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_API_TOKEN=...           # id.atlassian.net/manage-profile/security/api-tokens
export JIRA_PROJECT_KEY=KAN          # defaults to KAN if unset
```

Without these three set, the app still works fully — you just copy the
approved PRD into a ticket by hand instead of clicking "Push to Jira."
The sidebar always shows whether each integration is live.

## How it decides whether to ask questions

The agent is instructed to ask 2–4 multiple-choice questions only when
the answer would genuinely change scope or design — not to pad the flow
with busywork. If your requirement is already unambiguous, it skips
straight to drafting. That's a real model decision, not a script — the
questions and the PRD are both freshly generated every run, not
templated.

## What "approved" hands off

The output is exactly the JSON shape `planner.md` (phase 3) expects to
find in the ticket description: `summary`, `acceptance_criteria`,
`out_of_scope`, `risk_tier`, `risk_rationale`. If you push to Jira from
here, phase 3 can read it straight off the ticket with no reformatting.

## Model

Defaults to `claude-sonnet-5`. Override with `ANTHROPIC_MODEL=...` if you
want to try a different one.
