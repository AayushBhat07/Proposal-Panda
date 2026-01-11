# Compliance & Risk Scoring Feature (Phase 4B)

## Overview

Backend-only compliance and risk analysis layer that produces **structured, explainable scoring** without generating advice or opinions.

**Purpose:** Analyze Phase 4A summaries for compliance requirements and risk factors using factual, deterministic rules.

---

## Key Principles

### ✅ What This Feature Does
- Consumes Phase 4A structured summaries (JSON)
- Performs factual compliance checks
- Identifies risk factors in 4 categories
- Produces structured, explainable scoring
- Uses deterministic inference (same input → same output)

### ❌ What This Feature Does NOT Do
- **No advice** or recommendations ("should", "recommended")
- **No opinions** ("unfair", "biased", "bad tender")
- **No generation** or content modification
- **No UI components** (backend-only)
- **No Phase 4A modification** (read-only consumption)

---

## Usage

### Basic Compliance Analysis

```typescript
import { analyzeCompliance } from '@/features/compliance-scoring';
import type { ComplianceScoringInput } from '@/features/compliance-scoring';

// Load Phase 4A summary
const phase4aSummary = loadTenderSummary('tender_summary.json');

// Prepare input
const input: ComplianceScoringInput = {
  summary: phase4aSummary,
  options: {
    model: 'qwen2.5:3b-instruct',
    temperature: 0.1,
    conservativeBias: true,
    verbose: false,
  },
};

// Analyze compliance
const result = await analyzeCompliance(input);

console.log(result.score.complianceScore); // 0-100
console.log(result.score.riskLevel); // Low/Medium/High
console.log(result.score.identifiedRisks); // Array of risks
```

---

## Output Structure

The scoring produces a **SINGLE structured JSON object** with exact keys:

### 1. Compliance Score (0-100)
Overall compliance score based on identified risk factors.
- **Higher score** = more compliant, less risky
- **Deterministic** = same input → same output
- **Conservative bias** = government tenders favor authority

### 2. Risk Level
Overall risk classification: `Low` | `Medium` | `High`

### 3. Risk Categories
Breakdown by category:
- **Financial:** EMD, guarantees, forfeiture clauses
- **Technical:** Scope, duration, complexity
- **Legal:** Finality clauses, indemnity, jurisdiction
- **Submission:** Deadlines, portal requirements

### 4. Identified Risks
Array of factual risk descriptions with source traceability:
```typescript
{
  category: "Financial",
  description: "The tender specifies...",
  sourceSection: "commercialTerms"
}
```

### 5. Missing or Weak Clauses
Identification of clauses that may be absent or unclear:
```typescript
{
  clause: "Dispute Resolution Mechanism",
  reason: "The tender does not explicitly specify..."
}
```

### 6. Submission Traps
Procedural requirements that may cause submission issues:
- "Requires unconditional bank guarantee within 3 days"
- "No explicit provision for deadline extensions"

### 7. Confidence Notes
Explanation of scoring rationale and analysis confidence.

---

## Language Safety Rules

### ✅ ALLOWED Phrasing
- "The tender specifies..."
- "The document states..."
- "The contractor is required to..."
- "The document does not explicitly..."

### ❌ FORBIDDEN Phrasing (HARD FAIL)
- "should"
- "recommended"
- "better to"
- "unfair"
- "biased"
- "bad tender"
- "good/bad idea"

**This is NOT advice. This is factual risk identification only.**

---

## Model Information

**Primary Model:** Qwen2.5-3B-Instruct (via Ollama)  
**Alternative:** Phi-3 Mini  
**Temperature:** 0.1 (deterministic)  
**Inference:** Local only (no cloud APIs)

**Why This Model?**
- Small, fast instruction-following model
- Different from BART (summarization) and LLaMA (generation)
- Designed for structured analysis tasks
- Low creativity, high factual accuracy

**NOT USED:**
- BART (summarization only)
- LLaMA (generation only)
- Any generative prose-heavy model

---

## Scoring Rules

### Baseline Score
Starts at **80/100**, penalties applied based on identified risks.

### Risk Scoring
- **High EMD requirement:** -5
- **Unconditional guarantee:** -10
- **Forfeiture clauses:** -5
- **Long execution period:** -5
- **Extensive scope:** -5
- **Finality clauses:** -10
- **Short submission timelines:** -8
- **Conservative bias:** -5 (government tenders)

### Risk Level Calculation
- **High:** Score < 60 OR 2+ high-risk categories
- **Medium:** Score < 75 OR 1+ high-risk categories
- **Low:** Score >= 75 AND no high-risk categories

---

## Testing

Run the test script:

```bash
npx tsx test-tenders/test-compliance-scoring.ts
```

**Expected Output:**
- ✅ All 6 test steps pass
- ✅ Compliance score between 0-100
- ✅ All risk categories present
- ✅ No forbidden language
- ✅ Exports to JSON, Markdown, Text

---

## Edge Cases Handled

- ✅ Missing Phase 4A sections (validation error)
- ✅ Empty risk categories (returns empty arrays)
- ✅ Invalid model configuration (fallback analysis)
- ✅ Language validation failures (hard stop)
- ✅ Score out of range (clamped to 0-100)
- ✅ Missing metadata (validation error)

---

## Architecture

```
features/compliance-scoring/
├── types/
│   └── compliance.types.ts       # Type definitions
├── services/
│   ├── instructionModelService.ts # Qwen2.5/Phi-3 integration
│   └── complianceScorer.ts       # Main scoring orchestrator
├── tests/
├── index.ts                      # Public API
├── README.md                     # This file
└── PHASE-4B-AUDIT.md            # Audit report
```

**Feature Isolation:** ✅  
**No Phase 4A Modification:** ✅  
**No Cross-Feature Imports:** ✅  

---

## Integration with Other Phases

**Phase 4A (Input):** Tender summarization (READ-ONLY)  
**Phase 4B (This):** Compliance & risk scoring (ANALYSIS)

**Critical Rules:**
1. Phase 4A must NOT be modified
2. No tender content regeneration
3. No UI or frontend work
4. Backend-only analysis

---

## Limitations

### Current
1. **Model is mocked** – Uses rule-based analysis (demo purposes)
2. **Single tender analysis** – No batch processing

### Future Enhancements (Out of Scope)
- Real Qwen2.5/Phi-3 integration via Ollama
- Batch scoring for multiple tenders
- Custom risk weights configuration
- API endpoints for scoring service
- Historical risk trend analysis

---

## Example Output

```json
{
  "complianceScore": 63,
  "riskLevel": "Medium",
  "riskCategories": {
    "financial": "Low",
    "technical": "Medium",
    "legal": "Low",
    "submission": "Low"
  },
  "identifiedRisks": [
    {
      "category": "Financial",
      "description": "The tender specifies an Earnest Money Deposit (EMD) requirement...",
      "sourceSection": "commercialTerms"
    }
  ],
  "missingOrWeakClauses": [
    {
      "clause": "Dispute Resolution Mechanism",
      "reason": "The tender does not explicitly specify..."
    }
  ],
  "submissionTraps": [
    "No explicit provision for deadline extensions mentioned"
  ],
  "confidenceNotes": "Compliance score of 63/100 based on factual analysis..."
}
```

---

## License

Part of Tender Automation Platform (Hackathon Project)

---

**Version:** 1.0.0  
**Phase:** 4B  
**Status:** ✅ Complete  
**Last Updated:** January 12, 2026
