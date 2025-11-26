
import { NextRequest } from 'next/server';
import {fetchRepoInfo} from "@/client/github";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get('repo');

    if (!repo) {
      return Response.json(
        { error: 'Repository parameter is required' },
        { status: 400 }
      );
    }

    const repoPattern = /^[\w.-]+\/[\w.-]+$/;
    if (!repoPattern.test(repo)) {
      return Response.json(
        { error: 'Invalid repository format. Expected: owner/name' },
        { status: 400 }
      );
    }

    const [owner, repoName] = repo.split('/');

    // Fetch repository information from GitHub
    const repoInfo = await fetchRepoInfo(owner, repoName);

    // Return 200 OK with repo info
    return Response.json(
      {
        message: 'OK',
        repository: repoInfo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Analysis endpoint error:', error);

    if (error instanceof Error) {
      return Response.json(
        { error: error.message },
        { status: error.message.includes('not found') ? 404 : 500 }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
