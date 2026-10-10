/**
 * Foundation bid generation: analysed tender + company profile → bid draft from the local model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import {
  BidModelUnavailableError,
  generateFoundationBid,
} from '@/features/bid-generation/services/foundationBidGenerator';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';
import type { CompanyProfile } from '@/types/onboarding.types';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'bid.generate');
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const report = body?.report as IntelligenceReport | undefined;
  const companyProfile = body?.companyProfile as CompanyProfile | undefined;

  if (!report?.summary?.metadata || !report.compliance) {
    return NextResponse.json({ error: 'A tender analysis report is required.' }, { status: 400 });
  }
  if (!companyProfile?.legalName) {
    return NextResponse.json({ error: 'Complete the company profile before generating a bid.' }, { status: 400 });
  }

  try {
    const bid = await generateFoundationBid(report, companyProfile);
    return NextResponse.json(bid);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Bid generation failed:', message);
    // Only the model-unavailable message is meant for the user; other internals stay in the server log.
    if (error instanceof BidModelUnavailableError) {
      return NextResponse.json({ error: 'Failed to generate the foundation bid.', details: message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to generate the foundation bid.' }, { status: 500 });
  }
}
