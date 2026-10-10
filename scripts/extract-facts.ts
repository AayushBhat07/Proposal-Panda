/**
 * Dev tool: run text extraction and the deterministic fact finders over a folder of tenders.
 * Usage: npx tsx scripts/extract-facts.ts <dir-with-tenders> [<dir-to-write-text>]
 */
import { readdirSync, writeFileSync } from 'fs';
import { join, parse } from 'path';
import { extractTextFromDocx } from '../features/summarization/services/textExtractor';
import * as s from '../features/summarization/services/summarizer';

async function main() {
  const [dir, textDir] = process.argv.slice(2);
  for (const name of readdirSync(dir).sort()) {
    let text: string;
    try {
      text = await extractTextFromDocx(join(dir, name));
    } catch (e) {
      console.log(JSON.stringify({ file: name, error: (e as Error).message }));
      continue;
    }
    if (textDir) writeFileSync(join(textDir, `${parse(name).name}.txt`), text);
    console.log(JSON.stringify({
      file: name,
      chars: text.length,
      nit: s.findNitReference(text),
      months: s.findCompletionMonths(text),
      emd: s.findEmdAmount(text),
      cost: s.findEstimatedCost(text),
      delay: s.findDelayCompensation(text),
      office: s.findInvitingOffice(text),
      kind: s.findTenderKind(text),
      name: s.findNameOfWork(text),
      worksType: s.findWorksType(s.findNameOfWork(text), text),
      keyTerms: s.findKeyTerms(text).map(t => `${t.label}: ${t.text.slice(0, 90)}`),
    }));
  }
}
main();
