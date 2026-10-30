# ProposalPanda

Contractors upload a government tender (PDF or DOCX), the app analyses it on local models, and then
drafts a foundation bid from that analysis, also on a local model.

Built by [Aayush Bhat](https://aayushbhat.vercel.app) · [Case study](https://aayushbhat.vercel.app/projects/proposalpanda)

## Run it

```bash
npm install
cp .env.example .env.local     # set AUTH_SECRET for production builds
ollama pull qwen2.5:3b-instruct  # tender analysis
ollama pull llama3               # bid generation
brew install poppler tesseract   # optional: reads scanned PDFs with OCR
npm run dev                      # http://localhost:3000
```

Everything the office shares (tenders, bids, the company file, users, the sealed vault and the activity log) is
in one SQLite file, `data/proposalpanda.db` (`DATABASE_PATH`). It is created and migrated on first start. Back
it up by copying it while the app is stopped. In development an empty database gets the four demo accounts;
in production, create the first Admin with
`ADMIN_PASSWORD='…' npm run db:create-admin -- owner@firm.in "Owner Name"` and add everyone else on the
Users page. After changing `lib/db/schema.ts`, run `npm run db:generate` and commit the new file in `drizzle/`.

No Ollama available? `npm run mock-ollama` starts a stand-in that returns placeholder text, so you can
click through the whole flow. Point `OLLAMA_BASE_URL` at it if it isn't on port 11434.

`npm test` runs the unit tests (auth/RBAC, fact extraction from real tender layouts, bid checks).
`npx tsx scripts/extract-facts.ts <folder>` prints what the analysis reads deterministically from each tender
in a folder (NIT number, EMD, estimated cost, period, key clauses, tender type), without calling a model.

## Flow

1. **Sign in** with a demo account (password `password` in development).
2. **Onboarding**: company profile, used in the bid.
3. **Dashboard → Upload tender**: `/api/intelligence/run` extracts text (PDF text layer with its line
   breaks, DOCX, or OCR for scanned PDFs when poppler and tesseract are installed), reads the NIT number,
   name of work, EMD, estimated cost, period, inviting office and key contract clauses straight from the
   text, decides the tender type (works: building / infrastructure / maintenance; supply; services),
   summarises seven sections with Qwen (`OLLAMA_ANALYSIS_MODEL`), then scores compliance and risk with
   deterministic rules over that summary. If Ollama is down, summaries fall back to keyword extracts and the
   analysis page says so.
4. **Analysis → Foundation Bid**: `/api/bid/generate` builds a bid in the Indian two-bid format
   (CPWD / state PWD):
   - **Cover I, Technical Bid**: letter of transmittal, document checklist (EMD, GST, PAN, EPF/ESI,
     registration, turnover, solvency, similar works, affidavits), tender acceptance letter, site-inspection
     declaration and non-blacklisting affidavit, similar works and bid capacity (2·A·N − B), understanding
     of scope, methodology and work programme, compliance with tender conditions, pre-bid queries.
   - **Cover II, Financial Bid**: percentage-rate / item-rate quotation proforma. Prices are never generated.

   Goods tenders (GeM, store purchase) and services tenders (manpower, security, O&M) get the same split
   with their own checklist, eligibility proforma (past orders and turnover), supply / service methodology
   and queries, and no construction programme. Maintenance and road works get a programme that fits them
   instead of a building sequence.

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

Admins also manage users (Users page) and read the activity log. Bid Writers and Admins open the
document vault.

Users live in the database with scrypt-hashed passwords. The session is a signed HttpOnly cookie, and each
API route re-reads the user, so a role change applies on the next request and turning someone off (or
resetting their password) signs them out.

## Known limits

- One office server: SQLite allows one writer at a time, which is fine for an office, not for a hosted
  multi-company service (the Drizzle schema can move to Postgres).
- Scanned PDFs are read with OCR only when `pdftoppm` and `tesseract` are installed (first 40 pages;
  add the `hin` tesseract language for Hindi). Without them the upload fails with a message saying so.
- Only .pdf and .docx are accepted; old .doc files and Excel BOQs must be converted first.
- Facts printed only in multi-column tables (some state notices) may not be read; the bid then shows a
  placeholder instead of a guess.
- The Clauses and BOQ tabs are placeholders.
