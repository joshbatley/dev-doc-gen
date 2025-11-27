import {ReadPackage, ReadTarget, SeedPackage, Slice} from "@/types";
import {getTextFile} from "@/client/github";

const HARD_CHAR_BUDGET = 1_200_000;
const SMALL_KB = 24;

export async function buildReadPackage(seedPack: SeedPackage, readList: ReadTarget[]): Promise<ReadPackage> {
  const { owner, name, sha } = seedPack.repo;
  const slices: Slice[] = [];
  const index: ReadPackage['index'] = [];
  let totalChars = 0;
  let seq = 0;

  for (const target of readList) {
    if (totalChars >= HARD_CHAR_BUDGET) {
      break;
    }
    const path = target.path;
    try {
      const content = await getTextFile(owner, name, path, sha);
      if (!content) continue;
      const lines = content.split('\\n');
      const size = sizeFromTreeSummary(seedPack.treeSummary, path) ?? new TextEncoder().encode(content).length;
      const isSmall = size <= SMALL_KB * 1024;

      const span = pickSpan(lines, target.budget_hint, isSmall);
      const text = lines.slice(span.start - 1, span.end).join('\\n');

      const id = `s_${++seq}`;
      const url = githubBlobUrl(owner, name, sha, path, span.start, span.end);

      const slice: Slice = { id, file: path, startLine: span.start, endLine: span.end, text, url };

      totalChars += slice.text.length;
      if (totalChars > HARD_CHAR_BUDGET) {
        console.log(`exceeded budget after ${path}, trimming`);
        break;
      }

      slices.push(slice);

      const entry = index.find(i => i.file === path);
      if (entry) {
        entry.included.push({ start: span.start, end: span.end });
      } else {
        index.push({ file: path, totalLines: lines.length, included: [{ start: span.start, end: span.end }] });
      }
    } catch (err) {
      console.warn(`failed ${path}: ${err}`);
    }
  }

  return {
    repo: { owner, name, sha },
    slices,
    index,
    stats: {
      filesRequested: readList.length,
      filesFetched: index.length,
      totalSlices: slices.length,
      totalChars,
    },
  };
}

function pickSpan(lines: string[], hint: ReadTarget['budget_hint'], isSmall: boolean) {
  if (hint === 'full' && isSmall) {
    return { start: 1, end: lines.length };
  }
  if (hint === 'full') {
    return { start: 1, end: Math.min(500, lines.length) };
  }
  // preview
  return { start: 1, end: Math.min(200, lines.length) };
}

function githubBlobUrl(owner: string, name: string, sha: string, path: string, start: number, end: number) {
  return `https://github.com/${owner}/${name}/blob/${sha}/${path}#L${start}-L${end}`;
}

function sizeFromTreeSummary(treeSummary: SeedPackage['treeSummary'], path: string): number | undefined {
  return treeSummary.find(t => t.path === path)?.size;
}
