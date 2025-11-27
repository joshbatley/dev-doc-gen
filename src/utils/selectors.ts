const EXCLUDE_DIRS = new Set([
  'node_modules','dist','build','.git','.next','coverage','vendor','venv','.venv','.cache','__pycache__'
]);

export function createTreeSummary(tree: Array<{ path: string; type: 'blob' | 'tree'; size?: number }>) {
  return tree
    .filter(t => t.type === 'blob')
    .map(t => ({path: t.path, size: t.size}))
    .slice(0, 5000); // hard cap

}

export function filterOnlyImportantFiles(tree: Array<{ path: string; type: 'blob' | 'tree'; size?: number }>) {
  const files = tree.filter(t => t.type === 'blob' && !isExcluded(t.path));

  const readme = files.filter(f => f.path.toLowerCase() === 'readme.md');
  const docs = files.filter(f =>
    isMarkdown(f.path) &&
    (f.path.toLowerCase().startsWith('docs/') || f.path.toLowerCase().startsWith('documentation/'))
  );
  const workflows = files.filter(f => isWorkflow(f.path));
  const manifests = files.filter(f => isManifest(f.path));

  // Keep caps to avoid huge payloads
  const cap = (arr: typeof files, n: number) => arr.slice(0, n);

  const selected = [
    ...cap(readme, 1),
    ...cap(docs, 15),
    ...cap(manifests, 10),
    ...cap(workflows, 10),
  ];

  // Fallback: if no README, try top-level markdown files
  if (!readme.length) {
    const topLevelMd = files.filter(f => isMarkdown(f.path) && !f.path.includes('/'));
    selected.push(...cap(topLevelMd, 2));
  }

  // Deduplicate by path
  const seen = new Set<string>();
  const out: Array<{ path: string; size?: number }> = [];
  for (const f of selected) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    out.push({ path: f.path, size: f.size });
  }
  return out;
}

function isExcluded(path: string) {
  return path.split('/').some(p => EXCLUDE_DIRS.has(p));
}

function isMarkdown(path: string) {
  const p = path.toLowerCase();
  return p.endsWith('.md') || p.endsWith('.mdx');
}

function isWorkflow(path: string) {
  const p = path.toLowerCase();
  return p.startsWith('.github/workflows/') && (p.endsWith('.yml') || p.endsWith('.yaml'));
}

function isManifest(path: string) {
  const p = path.toLowerCase();
  return (
    p.endsWith('package.json') ||
    p.endsWith('pyproject.toml') ||
    p.endsWith('requirements.txt') ||
    p.endsWith('poetry.lock') ||
    p.endsWith('go.mod') ||
    p.endsWith('cargo.toml') ||
    p.endsWith('gemfile') ||
    p.endsWith('composer.json')
  );
}

