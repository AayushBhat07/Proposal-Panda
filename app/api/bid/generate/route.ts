/**
 * Foundation bid generation: analysed tender + company profile → bid draft from the local model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { streamProgress } from '@/lib/progress/stream';
import {
  BidModelUnavailableError,
  generateFoundationBid,
} from '@/features/bid-generation/services/foundationBidGenerator';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';
import { getDb } from '@/lib/db/client';
import { getCompany } from '@/lib/db/repos/company';
import { getTender, saveBid } from '@/lib/db/repos/tenders';
import { record } from '@/lib/db/repos/audit';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'bid.generate');
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const tenderId = String(body?.tenderId ?? '');
  const db = getDb();
  // Both come from the office database, not the browser.
  const report = getTender(db, tenderId)?.report as unknown as IntelligenceReport | undefined;
  // The generator swaps GSTIN and PAN for tokens itself; the profile in the database has neither anyway.
  const companyProfile = getCompany(db).companyProfile;

  if (!report?.summary?.metadata || !report.compliance) {
    return NextResponse.json({ error: 'A tender analysis report is required.' }, { status: 400 });
  }
  if (!companyProfile?.legalName) {
    return NextResponse.json({ error: 'Complete the company profile before generating a bid.' }, { status: 400 });
  }

  return streamProgress(
    async onProgress => {
      const bid = await generateFoundationBid(report, companyProfile, onProgress);
      saveBid(db, tenderId, { ...bid, id: tenderId }, auth.email);
      record(db, auth.email, 'drafted bid', tenderId);
      return { ...bid, id: tenderId };
    },
    error => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API] Bid generation failed:', message);
      // Only the model-unavailable message is meant for the user; other internals stay in the server log.
      if (error instanceof BidModelUnavailableError) return { error: message, status: 503 };
      return { error: 'Failed to generate the foundation bid.', status: 500 };
    }
  );
}
