import { Octokit } from '@octokit/core';

export interface RepoInfo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  owner: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

// Initialize Octokit with GitHub token from environment
function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;

  return new Octokit({
    auth: token,
  });
}

export async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const octokit = getOctokit();

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const data = response.data;

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      owner: data.owner.login,
      language: data.language,
      stargazersCount: data.stargazers_count,
      forksCount: data.forks_count,
      openIssuesCount: data.open_issues_count,
      defaultBranch: data.default_branch,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      htmlUrl: data.html_url,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 404) {
        throw new Error('Repository not found');
      }
      if (status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden');
      }
    }
    throw error;
  }
}
