import {createWikiDoc, updateJobStatus, updateWikiIdForJob} from "@/client/database";
import {JobStatus} from "@/types";
import {getRepoMeta} from "@/client/github";
import {buildSeedPackage} from "@/services/seedService";
import {generateReadTargetsFromSeed, generateWikiDoc} from "@/services/generateService";
import {buildReadPackage} from "@/services/readService";

export async function runBackgroundService(repo: string, jobId: string) {
  await updateJobStatus(jobId, JobStatus.FETCHING_REPO)

  const {owner, name, meta, sha, tree} = await getRepoMeta(repo);
  const seedPack = await buildSeedPackage(owner, name, meta, sha, tree);

  await updateJobStatus(jobId, JobStatus.ANALYZING_REPO);
  const readTargets = await generateReadTargetsFromSeed(seedPack);

  await updateJobStatus(jobId, JobStatus.READING_FILES);
  const readPack = await buildReadPackage(seedPack, readTargets);

  await updateJobStatus(jobId, JobStatus.CREATING_WIKI);
  const wiki = await generateWikiDoc(readPack, seedPack);

  const wiki_id = await createWikiDoc(owner, name, sha, wiki, jobId, meta.description);
  await updateWikiIdForJob(jobId, wiki_id)
  await updateJobStatus(jobId, JobStatus.COMPLETE);
}
