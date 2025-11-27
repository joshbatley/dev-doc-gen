import {Octokit} from '@octokit/core';

function octo() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: 'wiki-generator',
  });
}

export async function getRepoMeta(repo: string) {
  const [owner, name] = repo.split('/');
  const meta = await getRepoDetails(owner, name);
  const sha = await resolveRef(owner, name, meta.defaultBranch);
  const tree = await getTreeRecursive(owner, name, sha);

  return {owner, name, meta, sha, tree};
}

export async function getTextFile(owner: string, name: string, path: string, ref: string) {
  const o = octo();
  const {data} = await o.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo: name,
    path,
    ref,
  });
  if (Array.isArray(data)) {
    return null;
  }
  const f = data as unknown as { content?: string | null; encoding?: string | null };
  if (!f.content || f.encoding !== 'base64') {
    return null;
  }
  return Buffer.from(f.content, 'base64').toString('utf-8');
}

async function getRepoDetails(owner: string, name: string) {
  const o = octo();
  const [{data: repo}, {data: languages}] = await Promise.all([
    o.request('GET /repos/{owner}/{repo}', {owner, repo: name}),
    o.request('GET /repos/{owner}/{repo}/languages', {owner, repo: name}),
  ]);
  return {
    description: repo.description ?? '',
    defaultBranch: repo.default_branch ?? 'main',
    languages: languages as Record<string, number>,
  };
}

async function resolveRef(owner: string, name: string, ref?: string) {
  const o = octo();
  const useRef = ref || (await getRepoDetails(owner, name)).defaultBranch;
  const {data: commit} = await o.request('GET /repos/{owner}/{repo}/commits/{ref}', {
    owner,
    repo: name,
    ref: useRef!,
  });
  return commit.sha as string;
}

async function getTreeRecursive(owner: string, name: string, sha: string) {
  const o = octo();
  const {data} = await o.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
    owner,
    repo: name,
    tree_sha: sha,
    recursive: 'true',
  });
  return (data.tree ?? []) as Array<{ path: string; type: 'blob' | 'tree'; size?: number; sha: string }>;
}
