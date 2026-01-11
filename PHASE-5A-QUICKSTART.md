# Phase 5A: Frontend UI Quick Start

## Running the App

```bash
cd tender-automation-platform
npm run dev
```

Open http://localhost:3000

## Available Routes

### 1. Onboarding (First-Time Setup)
**URL:** http://localhost:3000/onboarding

**Flow:**
1. Company Profile (legal name, GSTIN, PAN, address)
2. Role Selection (Senior Tender Analyst, Bid Writer, Legal Officer, Executive)
3. Review & Confirm

### 2. Dashboard (Main Page)
**URL:** http://localhost:3000/dashboard

**Features:**
- Upload tender documents (drag & drop or browse)
- Intelligence snapshot card
- Recent tender activity table
- Market signals ticker

### 3. Analysis View
**URL:** http://localhost:3000/tenders/[tender-id]/analysis

**Example:** http://localhost:3000/tenders/MH-PWD-2024-892/analysis

**Tabs:**
- Summary - Executive summary and key details
- Compliance - Score, risk breakdown, identified risks
- Clauses & Legal - Legal analysis (placeholder)
- BOQ Insights - Bill of quantities (placeholder)
- Metadata - Pipeline execution metadata

## Component Locations

```
components/
├── onboarding/       # 3-step onboarding wizard
├── dashboard/        # Dashboard cards and upload
└── analysis/         # Analysis view panels
```

## State Management

**Onboarding State:** `lib/context/OnboardingContext.tsx`
- Persisted in localStorage
- Gates access to dashboard

**Mock Data:** `lib/mock/mockIntelligenceReport.ts`
- Matches Phase 4C schema
- Used by analysis view

## Integration Points (TODO)

1. **Dashboard Upload** → Wire to `executeIntelligencePipeline()` from Phase 4C
2. **Analysis Data** → Fetch real intelligence reports by tender ID
3. **Pipeline Calls** → Replace mock processing with real Phase 4A → 4B execution

## Design System

- **Primary Color:** amber-900 (#78350f)
- **Font:** Geist Sans/Mono (Next.js default)
- **Components:** Tailwind CSS utility classes
- **Icons:** Unicode emojis (placeholder)

## What's NOT Included

- ❌ Real file parsing
- ❌ Backend API calls
- ❌ Database integration
- ❌ Authentication logic
- ❌ Permissions enforcement

## Next: Phase 5B Integration

Wire frontend to existing Phase 4C intelligence pipeline.
