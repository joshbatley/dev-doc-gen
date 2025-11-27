import {ReadPackage, ReadTarget, SeedPackage, WikiDoc, WikiFeature} from "@/types";
import {openaiChat} from "@/client/openAI";

const MAX_FILES = 30;
const SMALL_KB = 24;
const MAX_SLICES = 120;

type PlanFeature = {
  id: string;
  title: string;
  description: string;
  reasons?: string[]
};

export async function generateReadTargetsFromSeed(seedPack: SeedPackage) {
  const treePathSet = buildTreePathSet(seedPack.treeSummary);

  const {system, user} = buildReadTargetPrompt(seedPack);

  const raw = await openaiChat([
    {role: 'system', content: system},
    {role: 'user', content: user},
  ]);

  return parseSeedPackage(raw, treePathSet)
}

export async function generateWikiDoc(readPack: ReadPackage, seedPack: SeedPackage): Promise<WikiDoc> {
  const { owner, name, sha } = readPack.repo;
  const citations = buildCitationsArray(readPack);
  const validIds = new Set(readPack.slices.map((s) => s.id));
  const sliceLines = buildSliceLines(readPack);

  const {system, user} = buildWikiDocPrompt(owner, name, sha, sliceLines);

  const raw = await openaiChat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  const { features } = parseAndValidate(raw, validIds);

  return {
    repo: { owner, name, sha, description: seedPack.repo.description },
    features,
    citations,
  };
}

function buildReadTargetPrompt(seedPack: SeedPackage) {
  const {repo, treeSummary, seeds} = seedPack;
  const treeLines = normalizeTreeSummary(treeSummary);

  // SEE TODO BELOW
  const system = `You are an engineering assistant producing a reading plan for developer documentation. Prefer user-facing features and files that reveal public interfaces and flows. Respect the budget. Return strict JSON only.`;
  const seedPreviews = seeds.map((s) => [
    `- path: ${s.path}`,
    `  kind: ${s.kind}`,
    `  excerpt:`,
    `  """`,
    s.preview.slice(0, 2000),
    `  """`,
    ``,
  ].join('\n')).join('\n');

  const user = [
    `Repo: ${repo.owner}/${repo.name}`,
    `Description: ${repo.description || '(none)'}`,
    `Languages: ${topLanguages(repo.languages) || '(unknown)'}`,
    `Ref/SHA: ${repo.ref} @ ${repo.sha}`,
    ``,
    `Budget:`,
    `- Max files: ${MAX_FILES}`,
    `- Per file: preview (first ~200 lines) | full (complete file if < ${SMALL_KB} KB, else truncated)`,
    ``,
    `Tree (path (bytes)) [truncated]:`,
    treeLines.join('\n'),
    ``,
    `Seeds (previews truncated):`,
    seedPreviews,
    `Task:`,
    `1) Propose 3–8 user-facing features (title + brief description).`,
    `2) Propose a read_list (priority 1..3) of at most ${MAX_FILES} files. Use only paths from Tree.`,
    `3) For each read_list item, include a reason and a budget_hint: preview | full.`,
    `Output JSON with keys: features_draft, read_list, notes.`,
  ].join('\n');

  return {system, user};
}

function parseSeedPackage(raw: string, treePathSet: Set<string>) {
  let plan: { features_draft?: PlanFeature[]; read_list?: unknown[]; notes?: string[] } = {};
  try {
    plan = JSON.parse(raw);
  } catch {
    console.warn(`non-JSON response, using empty plan`);
    plan = {features_draft: [], read_list: [], notes: ['Model returned non-JSON']};
  }

  return clampReadList(plan.read_list || [], treePathSet);
}

// TODO: Review this and the prompt, the testing show it working okay but need to dig deeper for optimal behavior.
// This was mostly AI to get a working version off my Idea, the logic make sense but not sure if the approach is right
function clampReadList(readList: unknown[], treePaths: Set<string>): ReadTarget[] {
  const validHints = new Set<ReadTarget['budget_hint']>(['preview', 'full']);
  const seen = new Set<string>();
  const out: ReadTarget[] = [];

  for (const item of readList) {
    if (!item || typeof item !== 'object') continue;

    const record = item as Record<string, unknown>;
    const path = String(record.path ?? '');

    if (!path || !treePaths.has(path) || seen.has(path)) continue;

    const priority = [1, 2, 3].includes(Number(record.priority))
      ? (Number(record.priority) as 1 | 2 | 3)
      : 2;

    const hint = String(record.budget_hint ?? 'preview');
    const budget_hint = validHints.has(hint as ReadTarget['budget_hint'])
      ? (hint as ReadTarget['budget_hint'])
      : 'preview';

    out.push({
      path,
      reason: String(record.reason ?? '').slice(0, 300) || 'Likely public interface or key flow',
      priority,
      budget_hint,
    });

    seen.add(path);
    if (out.length >= MAX_FILES) break;
  }

  return out;
}

function buildTreePathSet(treeSummary: SeedPackage['treeSummary']) {
  return new Set(treeSummary.map((t) => t.path));
}

function topLanguages(langs: Record<string, number>, n = 3) {
  const entries = Object.entries(langs || {}).sort((a, b) => b[1] - a[1]).slice(0, n);
  return entries.map(([k]) => k).join(', ');
}

function normalizeTreeSummary(treeSummary: SeedPackage['treeSummary']) {
  return treeSummary.slice(0, 1000).map((t) => `${t.path} (${t.size ?? 0})`);
}

// TODO: Review this and the prompt, the testing show it working okay but need to dig deeper for optimal behavior.
// This was mostly AI to get a working version off my Idea, the logic make sense but not sure if the approach is right
function buildWikiDocPrompt(owner: string, name: string, sha: string, sliceLines: string[]) {
  const system = `You are generating feature-driven developer documentation grounded ONLY in provided evidence. Every paragraph and list item MUST include one or more citation ids from the provided list.
Prefer user-facing features (e.g., Authentication, Todo Management) over technical layers (e.g., API, utils).
Return valid JSON only in the specified schema. Do not invent facts. If evidence is insufficient for a detail, omit it.`;
  const user = [
    `Repo: ${owner}/${name} @ ${sha}`,
    ``,
    `Available evidence slices (id, file, text excerpt):`,
    sliceLines.join('\n'),
    ``,
    `Task:`,
    `1) Produce a concise set of features. Each feature must be user-facing, have a short description, and be supported by evidence slice ids.`,
    `2) For each feature, fill sections: overview, public_interfaces, key_flows, data_and_state, key_files, dependencies, limitations.`,
    `3) Every paragraph/list entry must include citations: ["s_..."].`,
    `4) Use types: public_interfaces.type ∈ {"http","cli","function","event","config","other"}.`,
    ``,
    `Output JSON schema:`,
    `{"features":[{`,
    `  "id": "string",`,
    `  "title": "string",`,
    `  "description": "string",`,
    `  "evidence": ["s_id"],`,
    `  "sections": {`,
    `    "overview": { "text": "string", "citations": ["s_id"] },`,
    `    "public_interfaces": [{ "type": "http|cli|function|event|config|other", "name":"string?", "method":"string?", "path":"string?", "signature":"string?", "description":"string?", "citations":["s_id"] }],`,
    `    "key_flows": [{ "title":"string", "steps":[{ "text":"string", "citations":["s_id"] }] }],`,
    `    "data_and_state": [{ "entity":"string", "fields":["string"]?, "storage":"string"?, "citations":["s_id"] }],`,
    `    "key_files": [{ "path":"string", "role":"string"?, "citations":["s_id"] }],`,
    `    "dependencies": [{ "name":"string", "purpose":"string"?, "citations":["s_id"] }],`,
    `    "limitations": [{ "text":"string", "citations":["s_id"]? }]`,
    `  }`,
    `}]}`,
  ].join('\n');

  return {
    system,
    user,
  }
}

function buildSliceLines(readPack: ReadPackage): string[] {
  return readPack.slices.slice(0, MAX_SLICES).map((s) => [
    `- id: ${s.id}`,
    `  file: ${s.file}#L${s.startLine}-L${s.endLine}`,
    `  text: """`,
    slicePreview(s.text, 900),
    `  """`,
    ``,
  ].join('\n'));
}

function slicePreview(text: string, maxChars = 600) {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function buildCitationsArray(readPack: ReadPackage) {
  return readPack.slices.map(s => ({
    id: s.id,
    file: s.file,
    startLine: s.startLine,
    endLine: s.endLine,
    url: s.url,
  }));
}

// This is mostly generated, I don't love this but it was an easy win to get this out the door.
function parseAndValidate(raw: string, validIds: Set<string>) {
  let doc: { features?: WikiFeature [] }  = {}
  try {
    doc = JSON.parse(raw);
  } catch {
    console.warn(`non-JSON response, returning empty doc`);
    return { features: [] };
  }

  const ensureCitations = (arr?: string[]) => (Array.isArray(arr) ? arr.filter((c) => validIds.has(c)) : []);
  const features: WikiFeature[] = [];

  for (const f of Array.isArray(doc?.features) ? doc.features : []) {
    const base: WikiFeature = {
      id: String(f?.id ?? '').slice(0, 80) || 'feature',
      title: String(f?.title ?? '').slice(0, 120) || 'Feature',
      description: String(f?.description ?? '').slice(0, 500) || '',
      evidence: ensureCitations(f?.evidence),
      sections: {
        overview: {
          text: String(f?.sections?.overview?.text ?? '').slice(0, 4000),
          citations: ensureCitations(f?.sections?.overview?.citations),
        },
        public_interfaces: [],
        key_flows: [],
        data_and_state: [],
        key_files: [],
        dependencies: [],
        limitations: [],
      },
    };

    // public_interfaces
    for (const it of Array.isArray(f?.sections?.public_interfaces) ? f.sections.public_interfaces : []) {
      const item = {
        type: (['http','cli','function','event','config','other'].includes(it?.type) ? it.type : 'other') as WikiFeature['sections']['public_interfaces'][number]['type'],
        name: typeof it?.name === 'string' ? it.name.slice(0, 200) : undefined,
        method: typeof it?.method === 'string' ? it.method.slice(0, 20) : undefined,
        path: typeof it?.path === 'string' ? it.path.slice(0, 400) : undefined,
        signature: typeof it?.signature === 'string' ? it.signature.slice(0, 400) : undefined,
        description: typeof it?.description === 'string' ? it.description.slice(0, 1000) : undefined,
        citations: ensureCitations(it?.citations),
      };
      if (item.citations.length > 0) base.sections.public_interfaces.push(item);
    }

    // key_flows
    for (const fl of Array.isArray(f?.sections?.key_flows) ? f.sections.key_flows : []) {
      const steps: Array<{ text: string; citations: string[] }> = [];
      for (const st of Array.isArray(fl?.steps) ? fl.steps : []) {
        const s = {
          text: String(st?.text ?? '').slice(0, 1000),
          citations: ensureCitations(st?.citations),
        };
        if (s.citations.length > 0 && s.text) steps.push(s);
      }
      const flow = {
        title: String(fl?.title ?? '').slice(0, 200) || 'Flow',
        steps,
      };
      if (flow.steps.length > 0) base.sections.key_flows.push(flow);
    }

    // data_and_state
    for (const ds of Array.isArray(f?.sections?.data_and_state) ? f.sections.data_and_state : []) {
      const item = {
        entity: String(ds?.entity ?? '').slice(0, 120) || 'Entity',
        fields: Array.isArray(ds?.fields) ? ds.fields.slice(0, 50).map((x: unknown) => String(x).slice(0, 120)) : undefined,
        storage: typeof ds?.storage === 'string' ? ds.storage.slice(0, 200) : undefined,
        citations: ensureCitations(ds?.citations),
      };
      if (item.citations.length > 0) base.sections.data_and_state.push(item);
    }

    // key_files
    for (const kf of Array.isArray(f?.sections?.key_files) ? f.sections.key_files : []) {
      const item = {
        path: String(kf?.path ?? '').slice(0, 400),
        role: typeof kf?.role === 'string' ? kf.role.slice(0, 200) : undefined,
        citations: ensureCitations(kf?.citations),
      };
      if (item.path && item.citations.length > 0) base.sections.key_files.push(item);
    }

    // dependencies
    for (const dep of Array.isArray(f?.sections?.dependencies) ? f.sections.dependencies : []) {
      const item = {
        name: String(dep?.name ?? '').slice(0, 200),
        purpose: typeof dep?.purpose === 'string' ? dep.purpose.slice(0, 400) : undefined,
        citations: ensureCitations(dep?.citations),
      };
      if (item.name && item.citations.length > 0) base.sections.dependencies.push(item);
    }

    // limitations
    for (const lim of Array.isArray(f?.sections?.limitations) ? f.sections.limitations : []) {
      const item = {
        text: String(lim?.text ?? '').slice(0, 800),
        citations: ensureCitations(lim?.citations),
      };
      // allow limitations without citations, but prefer with
      if (item.text) (base.sections.limitations as Array<{ text: string; citations?: string[] }>).push(item);
    }

    // Ensure feature has at least some cited content
    const hasEvidence =
      base.evidence.length > 0 ||
      base.sections.overview.citations.length > 0 ||
      base.sections.public_interfaces.length > 0 ||
      base.sections.key_flows.length > 0 ||
      base.sections.data_and_state.length > 0 ||
      base.sections.key_files.length > 0 ||
      base.sections.dependencies.length > 0;

    if (hasEvidence) features.push(base);
  }

  return { features };
}
