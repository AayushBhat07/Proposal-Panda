/**
 * Phase 5C.1: Intelligence API Route - Step 3
 * Real backend integration with Phase 4A → 4B → 4C pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { requirePermission } from '@/lib/auth/server';
import { executeIntelligencePipeline } from '@/features/intelligence-orchestrator';
import { UnreadableDocumentError } from '@/features/summarization/services/textExtractor';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'tender.upload');
  if (auth instanceof NextResponse) return auth;

  let tempFilePath: string | null = null;

  try {
    // Parse multipart form data
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Expected a multipart form upload.' }, { status: 400 });
    }
    const file = formData.get('file');
    const tenderId = formData.get('tenderId');
    const tenderTitle = formData.get('tenderTitle');

    // Validate required fields; a text field named "file" is not an upload
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a tender document.' },
        { status: 400 }
      );
    }

    if (typeof tenderId !== 'string' || typeof tenderTitle !== 'string' || !tenderId.trim() || !tenderTitle.trim()) {
      return NextResponse.json(
        { error: 'Missing tender metadata (tenderId or tenderTitle).' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .docx and .pdf files are supported.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File must be 50MB or smaller.' }, { status: 413 });
    }

    // Create temporary directory if it doesn't exist
    const tempDir = join(tmpdir(), 'tender-uploads');
    await mkdir(tempDir, { recursive: true });

    // Save file to temporary location
    const buffer = Buffer.from(await file.arrayBuffer());
    // Never build the path from client input (tenderId / file name could contain ../)
    tempFilePath = join(tempDir, `${randomUUID()}${extname(fileName)}`);
    await writeFile(tempFilePath, buffer);

    console.log(`[API] Processing tender: ${tenderTitle} (${tenderId})`);
    console.log(`[API] File saved to: ${tempFilePath}`);

    // Execute real intelligence pipeline
    const result = await executeIntelligencePipeline({
      tenderFilePath: tempFilePath,
      tenderId,
      tenderTitle,
      verbose: true,
    });

    // Clean up temporary file
    if (tempFilePath) {
      await unlink(tempFilePath).catch(err => 
        console.warn(`[API] Failed to delete temp file: ${err.message}`)
      );
      tempFilePath = null;
    }

    // Extract the intelligence report
    const report: IntelligenceReport = result.report;

    console.log(`[API] Pipeline completed successfully`);
    console.log(`[API] Total execution time: ${result.diagnostics.totalTimeMs}ms`);

    // Return the full intelligence report
    return NextResponse.json(report, { status: 200 });

  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }

    if (error instanceof UnreadableDocumentError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    // Internal details stay in the server log, not the response.
    console.error('[API] Intelligence pipeline error:', error);

    return NextResponse.json(
      { error: 'Failed to process tender document. Please try again.' },
      { status: 500 }
    );
  }
}
