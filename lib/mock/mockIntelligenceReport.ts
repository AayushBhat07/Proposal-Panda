/**
 * Phase 5A: Mock Intelligence Report
 * Mock data matching Phase 4C output schema
 */

import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';

export const MOCK_INTELLIGENCE_REPORT: IntelligenceReport = {
  summary: {
    executiveSummary: 'The tender is technically viable for your organization based on current machinery and past experience credentials. However, there are significant financial documentation risks regarding the solvency certificate format. The legal framework contains one unusual arbitration clause that requires review. Submission deadlines are tight with physical submission requirements.',
    commercialTerms: 'EMD: ₹49 lakhs (2% of estimated cost). Performance security: 10% of contract value. Completion period: 18 months. Defect liability period: 24 months. Tender type: Open competitive bidding.',
    datesAndObligations: 'Bid submission deadline: November 15, 2024. Technical bid opening: November 16, 2024. Financial bid opening: November 23, 2024. Bid validity: 180 days from opening date.',
    technicalScope: 'Complete reconstruction of State Highway 14 including widening from 2-lane to 4-lane, full-depth resurfacing with bituminous concrete, drainage improvements, and safety installations. Major work categories include earthwork (grade I & II), PCC and RCC works, bituminous surfacing, and drainage structures.',
    legalHighlights: 'Performance bank guarantee required within 15 days of award. Contract governed by Maharashtra PWD Act. Arbitration as per Arbitration and Conciliation Act, 1996. Venue: Mumbai High Court jurisdiction.',
    attentionPoints: 'Long execution period of 18 months. High EMD requirement at 2% of estimated cost. Extensive technical scope requiring specialized equipment. Physical document submission required 24 hours before online deadline. Multiple original copies required for certain documents.',
    metadata: {
      tenderId: 'MH-PWD-2024-892',
      tenderTitle: 'Reconstruction of State Highway 14 (Nagpur District)',
      generatedAt: new Date(),
      modelUsed: 'BART-large-cnn',
      totalChunks: 12,
      processingTimeMs: 2150,
    },
  },
  compliance: {
    complianceScore: 72,
    riskLevel: 'Medium',
    riskCategories: {
      financial: 'High',
      technical: 'Low',
      legal: 'Medium',
      submission: 'High',
    },
    identifiedRisks: [
      {
        category: 'Financial',
        description: 'Non-standard bid capacity calculation formula uses 5-year average instead of standard PWD maximum in 5 years methodology',
        sourceSection: 'commercialTerms',
      },
      {
        category: 'Technical',
        description: 'Clause implies strict ownership of Paver Finisher; lease arrangement acceptability unclear',
        sourceSection: 'technicalScope',
      },
      {
        category: 'Legal',
        description: 'Arbitration venue specified as Mumbai instead of work location (Nagpur)',
        sourceSection: 'legalHighlights',
      },
    ],
    missingOrWeakClauses: [
      {
        clause: 'Force Majeure compensation',
        reason: 'Standard PWD contracts allow 50% equipment compensation; this tender contains no such provision',
      },
    ],
    submissionTraps: [
      'Physical submission deadline is 24 hours before online bid opening',
      'Affidavits require specific formatting on ₹500 stamp paper',
      'Three original copies of technical documents required',
    ],
    confidenceNotes: 'Analysis based on Phase 4A structured summary. High confidence in financial and submission risk identification. Technical compliance appears strong based on standard contractor profile.',
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    pipelineVersion: '4A+4B',
    executionTimeMs: 4250,
  },
};
