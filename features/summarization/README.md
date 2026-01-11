# Tender Summarization Feature (Phase 4A)

## Overview

BART-based post-generation summarization that produces **faithful, non-interpretive summaries** of completed tender documents.

**Purpose:** Compress long tenders into structured 6-section summaries without judgment, scoring, or interpretation.

---

## Key Principles

### ✅ What This Feature Does
- Extracts text from tender documents (.txt, .md, future .docx)
- Chunks text for BART processing (token limit: 1024)
- Generates 6 structured summary sections
- Exports to JSON, Markdown, and plain text

### ❌ What This Feature Does NOT Do
- **No scoring** or risk assessment
- **No judgment** or recommendations
- **No interpretation** of content
- **No modification** of tender generation
- **No UI components** (backend-only)

---

## Usage

### Basic Summarization

```typescript
import { summarizeTenderFromFile } from '@/features/summarization';

// Summarize from file
const result = await summarizeTenderFromFile(
  './tender.txt',
  'TENDER-001',
  'Bridge Construction Tender',
  {
    model: 'BART-large-cnn',
    maxTokensPerChunk: 1024,
  }
);

console.log(result.summary.executiveSummary);
console.log(result.summary.commercialTerms);
// ... 6 sections total
```

### Export Summary

```typescript
import { 
  exportSummaryToJSON, 
  exportSummaryToMarkdown, 
  exportSummaryToText 
} from '@/features/summarization';

// Export to multiple formats
exportSummaryToJSON(result.summary, './summary.json');
exportSummaryToMarkdown(result.summary, './summary.md');
exportSummaryToText(result.summary, './summary.txt');
```

### Text-based Summarization

```typescript
import { summarizeTenderFromText } from '@/features/summarization';

const tenderText = "..."; // Full tender text
const result = await summarizeTenderFromText(
  tenderText,
  'TENDER-002',
  'Road Construction Tender'
);
```

---

## Output Structure

The summarization produces **exactly 6 sections**:

### 1. Executive Summary
High-level project overview, scope, authority, value, duration

### 2. Key Commercial Terms
EMD, performance security, completion period, defect liability

### 3. Important Dates & Obligations
Submission requirements, validity, extension obligations

### 4. Technical Scope Overview
Nature of works, work categories, execution scope (descriptive, not scored)

### 5. Legal & Contractual Highlights
Bond requirements, guarantees, authority hierarchy, jurisdiction

### 6. Risks & Attention Points (FACTUAL ONLY)
Long execution periods, high security requirements, extensive scope

**⚠️ Note:** Section 6 is NOT a risk assessment—it only summarizes what the tender states.

---

## Allowed Phrasing

✅ **Use:**
- "The tender specifies..."
- "The document requires..."
- "The contractor is obligated to..."

❌ **Avoid:**
- "This may be risky..."
- "The contractor should..."
- "This is unfavorable..."

---

## Model Information

**Current Implementation:** Mock BART (rule-based extraction)  
**Production Model:** BART-large-cnn or BART-base (local)  
**Token Limit:** 1024 tokens per chunk  
**Overlap:** 100 tokens between chunks

**Strictly BART Only:**
- No LLaMA
- No GPT
- No reasoning models
- No generative AI

---

## Testing

Run the test script:

```bash
npx tsx test-tenders/test-summarization.ts
```

**Expected Output:**
- ✅ All 6 sections populated
- ✅ Processing time < 5s
- ✅ Exports to JSON, Markdown, Text
- ✅ No errors

---

## Edge Cases Handled

- ✅ Extremely long chapters (chunking)
- ✅ Repetitive clauses (deduplication)
- ✅ Missing data ("Not specified" message)
- ✅ Formatting noise (cleanup)
- ✅ No chapters found (treat as single doc)
- ✅ File not found (clear error)
- ✅ Unsupported formats (validation)

---

## Architecture

```
features/summarization/
├── types/
│   └── summarization.types.ts   # Type definitions
├── services/
│   ├── bartService.ts            # BART summarization engine
│   ├── textExtractor.ts          # Text extraction utilities
│   └── summarizationOrchestrator.ts  # Main orchestrator
├── index.ts                      # Public API
└── PHASE-4A-AUDIT.md            # Audit report
```

**Feature Isolation:** ✅  
**Mock-First:** ✅  
**No Cross-Feature Imports:** ✅  

---

## Limitations

### Current
1. **BART is mocked** – Uses rule-based extraction (demo purposes)
2. **.docx extraction pending** – Use `.txt` version for now

### Future Enhancements (Out of Scope)
- Real BART model integration (transformers.js or Python API)
- .docx extraction with formatting preservation
- Summary caching
- Batch summarization
- API endpoints

---

## Integration with Other Phases

**Phase 4A (This):** Summarization (compression)  
**Phase 4B (Next):** Compliance & Risk Scoring (judgment)

**Important:** Keep summarization and scoring strictly separated.

---

## License

Part of Tender Automation Platform (Hackathon Project)

---

**Version:** 1.0.0  
**Phase:** 4A  
**Status:** ✅ Complete  
**Last Updated:** January 11, 2026
