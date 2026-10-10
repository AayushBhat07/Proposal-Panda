# ADR-003: Foundation bid follows the CPWD two-bid structure

**Status:** Accepted · **Date:** 2026-10-09 · **Feature:** bid-generation

## Context
User asked that bids look like Indian construction bids. CPWD/PWD tenders use Cover I (technical/eligibility documents and forms) and Cover II (price, usually percentage rate on BOQ).

## Decision
Fixed proformas (checklist, declarations, affidavit, bid capacity, price bid) are deterministic templates filled from the company profile; narrative sections are drafted by Llama 3. No prices are generated.

## Alternatives Considered
| Alternative | Why not |
|---|---|
| Everything from the LLM | 8B model invents figures and form wording; proformas must be exact |
| Department-specific form numbering | Varies per department; common CPWD wording used instead |
