# ProposalPanda

Contractors upload a government tender (PDF or DOCX), the app analyses it on local models, and then
drafts a foundation bid from that analysis, also on a local model.

## Run it

```bash
npm install
cp .env.example .env.local     # set AUTH_SECRET for production builds
ollama pull qwen2.5:3b-instruct  # tender analysis
ollama pull llama3               # bid generation
npm run dev                      # http://localhost:3000
```

No Ollama available? `npm run mock-ollama` starts a stand-in that returns placeholder text, so you can
click through the whole flow. Point `OLLAMA_BASE_URL` at it if it isn't on port 11434.

`npm test` runs the auth/RBAC tests.

## Flow

1. **Sign in** with a demo account (password `password` in development).
2. **Onboarding**: company profile, used in the bid.
3. **Dashboard → Upload tender**: `/api/intelligence/run` extracts text (PDF text layer or DOCX),
   summarises six sections with Qwen (`OLLAMA_ANALYSIS_MODEL`), then scores compliance and risk with
   deterministic rules over that summary. If Ollama is down, summaries fall back to keyword extracts and the
   analysis page says so.
4. **Analysis → Foundation Bid**: `/api/bid/generate` builds a bid in the Indian two-bid format
   (CPWD / state PWD):
   - **Cover I, Technical Bid**: letter of transmittal, document checklist (EMD, GST, PAN, EPF/ESI,
     registration, turnover, solvency, similar works, affidavits), tender acceptance letter, site-inspection
     declaration and non-blacklisting affidavit, similar works and bid capacity (2·A·N − B), understanding
     of scope, methodology and work programme, compliance with tender conditions, pre-bid queries.
   - **Cover II, Financial Bid**: percentage-rate / item-rate quotation proforma. Prices are never generated.

   Narrative sections are drafted by Llama 3 (`OLLAMA_BID_MODEL`); proformas are filled from the company
   profile. Anything the contractor must supply is left as a `[placeholder]`. Download as Markdown.

## Roles

Defined once in `lib/auth/rbac.ts`; enforced in `proxy.ts` and in each API route.

| Role | Demo account | Upload & analyse | Generate bid | View tenders & bids |
|---|---|---|---|---|
| Admin | admin@proposalpanda.dev | ✓ | ✓ | ✓ |
| Bid Writer | writer@proposalpanda.dev | ✓ | ✓ | ✓ |
| Tender Analyst | analyst@proposalpanda.dev | ✓ | | ✓ |
| Viewer (owner, reviewer, management) | viewer@proposalpanda.dev | | | ✓ |

The role is carried in a signed HttpOnly cookie, so it can't be changed from the browser. Users are a
demo directory in `lib/auth/users.ts`; swap `findUser()` for a real user store.

## Known limits

- Reports and bids are stored in the browser's localStorage, so they aren't shared between users or devices.
- Scanned PDFs need OCR before upload.
- The Clauses and BOQ tabs are placeholders.
