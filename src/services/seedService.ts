import {SeedDoc, SeedPackage} from "@/types";
import {getTextFile} from "@/client/github";
import {createTreeSummary, filterOnlyImportantFiles} from "@/utils/selectors";

const PREVIEW_LIMIT = 5000;
const TOTAL_LIMIT = 150_000;

export async function buildSeedPackage(owner: string, name: string, meta: any, sha: string, tree: any): Promise<SeedPackage> {
  const treeSummary = createTreeSummary(tree);
  const seedsToFetch = filterOnlyImportantFiles(tree);
  const seeds = await getSeedFilePreview(seedsToFetch, owner, name, sha);

  return {
    repo: {
      owner,
      name,
      ref: meta.defaultBranch,
      sha,
      description: meta.description,
      languages: meta.languages,
    },
    treeSummary,
    seeds,
    counts: {
      treeFiles: treeSummary.length,
      seeds: seeds.length,
    }
  }
}

function classifyKind(path: string): SeedDoc['kind'] {
  const p = path.toLowerCase();
  if (p === 'readme.md') return 'readme';
  if (p.startsWith('docs/') || p.startsWith('documentation/')) return 'doc';
  if (p.startsWith('.github/workflows/')) return 'workflow';
  if (
    p.endsWith('package.json') || p.endsWith('pyproject.toml') || p.endsWith('requirements.txt') ||
    p.endsWith('poetry.lock') || p.endsWith('go.mod') || p.endsWith('cargo.toml') ||
    p.endsWith('gemfile') || p.endsWith('composer.json')
  ) return 'manifest';
  return 'other';
}

async function getSeedFilePreview(seedsToFetch: Array<{ path: string; size?: number }>, owner: string, name: string, sha: string) {
  const seeds: SeedDoc[] = [];
  let totalChars = 0;

  for (const item of seedsToFetch) {
    if (totalChars > TOTAL_LIMIT) break;
    try {
      const text = await getTextFile(owner, name, item.path, sha);
      if (!text) continue;
      const preview = text.slice(0, PREVIEW_LIMIT);
      totalChars += preview.length;
      seeds.push({
        path: item.path,
        preview,
        bytes: item.size ?? 0,
        kind: classifyKind(item.path),
      });
    } catch {
      // ignore individual file failures
    }
  }
  return seeds;
}

