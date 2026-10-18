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
import { streamProgress } from '@/lib/progress/stream';
import { getDb } from '@/lib/db/client';
import { addTender, isTenderId, tenderExists } from '@/lib/db/repos/tenders';
import { record } from '@/lib/db/repos/audit';

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

    if (!isTenderId(tenderId)) {
      return NextResponse.json({ error: 'Invalid tender id.' }, { status: 400 });
    }
    if (tenderExists(getDb(), tenderId)) {
      return NextResponse.json({ error: 'A tender with this id is already on the register.' }, { status: 409 });
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

    // Stream progress, then the report. The temp file goes once the job settles either way.
    const filePath = tempFilePath;
    tempFilePath = null;
    return streamProgress(
      async onProgress => {
        try {
          const result = await executeIntelligencePipeline({
            tenderFilePath: filePath,
            tenderId,
            tenderTitle,
            verbose: true,
            onProgress,
          });
          console.log(`[API] Pipeline completed in ${result.diagnostics.totalTimeMs}ms`);
          // On the office register before the browser hears it finished, so a closed tab loses nothing.
          const stored = { id: tenderId, fileName: file.name, uploadedAt: new Date().toISOString(), ...result.report };
          if (!addTender(getDb(), stored, auth.email)) throw new Error(`Tender ${tenderId} was added twice`);
          record(getDb(), auth.email, 'analysed tender', tenderId);
          return stored;
        } finally {
          await unlink(filePath).catch(err => console.warn(`[API] Failed to delete temp file: ${err.message}`));
        }
      },
      pipelineError
    );

  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }
    const { error: message, status } = pipelineError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

function pipelineError(error: unknown): { error: string; status: number } {
  if (error instanceof UnreadableDocumentError) return { error: error.message, status: 422 };
  // Internal details stay in the server log, not the response.
  console.error('[API] Intelligence pipeline error:', error);
  return { error: 'Failed to process tender document. Please try again.', status: 500 };
}
