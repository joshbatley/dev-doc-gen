import {NextRequest} from 'next/server';
import {
  hasWikiBeenGenerated,
  createJob,
  updateJobStatus, createWikiDoc, updateWikiIdForJob
} from "@/client/database";
import {JobStatus, ReadPackage, ReadTarget, SeedDoc, SeedPackage, Slice} from "@/types";
import runBackgroundService from "@/services/backgroundService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get('repo');

    if (!repo) {
      return Response.json(
        {error: 'Repository parameter is required'},
        {status: 400}
      );
    }

    const repoPattern = /^[\w.-]+\/[\w.-]+$/;
    if (!repoPattern.test(repo)) {
      return Response.json(
        {error: 'Invalid repository format. Expected: owner/name'},
        {status: 400}
      );
    }

    const generatedWiki = await hasWikiBeenGenerated(repo);
    if (generatedWiki) {
      console.log('repoAlreadyGenerate', generatedWiki);
      return Response.json({message: 'Repository already generate', wikiId: generatedWiki})
    }


    const jobId = await createJob(repo)
    runBackgroundService(repo, jobId).catch(async () => {
      // should be impossible
    })

    return Response.json(
      {
        message: 'OK',
        jobId: jobId,
      },
      {status: 200}
    );
  } catch (error) {
    console.error('Analysis endpoint error:', error);
    return Response.json(
      {error: 'Internal server error'},
      {status: 500}
    );
  }
}
