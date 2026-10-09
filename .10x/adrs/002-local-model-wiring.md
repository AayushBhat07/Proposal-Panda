# ADR-002: Local model wiring through one Ollama client

**Status:** Accepted (default) · **Date:** 2026-10-09 · **Feature:** analysis, bid-generation

## Context
Analysis used keyword mocks labelled as BART/Qwen; generation called Ollama directly with a hardcoded URL.

## Decision
One server-side Ollama client configured by env (`OLLAMA_BASE_URL`, `OLLAMA_ANALYSIS_MODEL`,
`OLLAMA_BID_MODEL`, `OLLAMA_TIMEOUT_MS`). Summaries use the analysis model; bids use the bid model.
If Ollama is unreachable during analysis, the extractive fallback runs and the report says so.
Bid generation fails loudly instead (a fake bid is worse than none).

## Alternatives Considered
| Alternative | Why not |
|---|---|
| Hosted model API | User wants local models |
| transformers.js BART in-process | Heavy, slow on CPU; user's BART setup unknown |
