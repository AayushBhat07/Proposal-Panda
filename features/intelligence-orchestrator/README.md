# Phase 4C: Intelligence Orchestration Layer

## Purpose

Thin backend orchestration layer that coordinates:
- **Phase 4A**: Tender Summarization (BART-based)
- **Phase 4B**: Compliance & Risk Scoring

This phase adds **NO intelligence**. It only wires existing systems together.

---

## Scope

### ✅ ALLOWED
- Accepting tender document (.docx) as input
- Calling Phase 4A summarization service
- Passing Phase 4A output into Phase 4B
- Aggregating outputs into a single structured object
- Measuring execution time
- Validating output schema

### ❌ FORBIDDEN
- Modifying Phase 4A code
- Modifying Phase 4B code
- Re-reading the tender document directly
- Re-summarizing content
- Adding AI prompts or models
- Adding scoring logic
- Adding UI components
- Adding API routes
- Adding export/formatting logic

---

## Architecture

```
Input: .docx file
    ↓
┌─────────────────────────────────┐
│  Phase 4C: Orchestration Layer  │
│  (Coordination Only)             │
└─────────────────────────────────┘
    ↓
    ├──→ Phase 4A: Summarization
    │    (BART-based text extraction)
    │    ↓
    └──→ Phase 4B: Compliance Scoring
         (Consumes Phase 4A output)
         ↓
    ┌─────────────────────────────┐
    │  Unified Intelligence Report │
    │  {summary, compliance, meta} │
    └─────────────────────────────┘
```

---

## Usage

```typescript
import { executeIntelligencePipeline } from '@/features/intelligence-orchestrator';

const result = await executeIntelligencePipeline({
  tenderFilePath: '/path/to/tender.docx',
  tenderId: 'TENDER_001',
  tenderTitle: 'Sample Tender',
  verbose: true,
});

console.log('Summary:', result.report.summary);
console.log('Compliance Score:', result.report.compliance.complianceScore);
console.log('Risk Level:', result.report.compliance.riskLevel);
console.log('Execution Time:', result.diagnostics.totalTimeMs, 'ms');
```

---

## Output Structure

```typescript
interface IntelligenceReport {
  summary: TenderSummary;        // Phase 4A output (no transformation)
  compliance: ComplianceScore;   // Phase 4B output (no transformation)
  metadata: {
    generatedAt: string;         // ISO date string
    pipelineVersion: '4A+4B';    // Fixed identifier
    executionTimeMs: number;     // Total pipeline time
  };
}
```

**EXACT keys. No additions. No transformations.**

---

## Execution Flow

1. **Phase 4C** receives tender file path
2. **Phase 4C** calls **Phase 4A** with file path
3. **Phase 4A** extracts text, chunks, summarizes
4. **Phase 4C** receives Phase 4A summary
5. **Phase 4C** calls **Phase 4B** with Phase 4A summary
6. **Phase 4B** analyzes risks, scores compliance
7. **Phase 4C** aggregates results into single object
8. **Phase 4C** returns unified report

**Phase 4B NEVER accesses the tender file directly.**

---

## Validation

Phase 4C performs strict validation:

1. **Execution Order**: Phase 4B cannot run without Phase 4A
2. **Output Schema**: Validates exact structure of output
3. **Data Integrity**: Ensures no data loss between phases
4. **No Transformation**: Phase outputs passed through unchanged

---

## Testing

Test script: `test-tenders/test-intelligence-pipeline.ts`

Verifies:
- ✅ Summary exists and is valid
- ✅ Compliance exists and is valid
- ✅ Compliance score is 0-100
- ✅ No exceptions thrown
- ✅ Execution order enforced
- ✅ Output schema matches specification
- ✅ Total execution time measured

---

## Diagnostics

```typescript
interface IntelligenceOrchestrationResult {
  report: IntelligenceReport;
  diagnostics: {
    phase4ATimeMs: number;
    phase4BTimeMs: number;
    totalTimeMs: number;
    executionOrder: ['Phase 4A', 'Phase 4B'];
    warnings: string[];
    errors: string[];
  };
}
```

---

## What This Phase Is NOT

- ❌ NOT an AI model
- ❌ NOT a scoring engine
- ❌ NOT a summarization engine
- ❌ NOT a document parser
- ❌ NOT a UI layer
- ❌ NOT an API layer
- ❌ NOT an export formatter

**It is ONLY a thin coordination layer.**

---

## Dependencies

- `features/summarization` (Phase 4A) - **READ ONLY**
- `features/compliance-scoring` (Phase 4B) - **READ ONLY**

**NO modifications to these features are allowed.**

---

## Edge Cases Handled

1. **Missing tender file**: Propagates Phase 4A error
2. **Invalid file format**: Propagates Phase 4A error
3. **Summarization failure**: Stops pipeline, returns error
4. **Compliance scoring failure**: Stops pipeline, returns error
5. **Invalid output schema**: Throws validation error
6. **Execution order violation**: Throws error if Phase 4B runs before Phase 4A

---

## Future Integration Points

This layer can be:
- Called from API routes
- Called from UI components
- Called from batch processing scripts
- Called from testing harnesses

But the orchestrator itself remains backend-only and stateless.

---

## Phase Isolation

- ✅ Phase 4A is untouched
- ✅ Phase 4B is untouched
- ✅ No circular dependencies
- ✅ No cross-feature imports
- ✅ Clean separation of concerns

---

## Compliance

- ✅ Follows PHASE-1 PROTOTYPE ARCHITECTURE
- ✅ Feature-first folder structure
- ✅ Mock-first policy (inherited from Phase 4A/4B)
- ✅ Handles empty/loading/error states
- ✅ Incremental development (only this phase)
- ✅ No premature optimizations
