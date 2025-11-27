import {neon} from '@neondatabase/serverless';
import {JobStatus, JobUpdate, WikiDoc} from "@/types";

const sql = neon(process.env.DATABASE_URL!);

export async function hasWikiBeenGenerated(repo: string): Promise<string | null> {
  const result = await sql`
    SELECT id
    FROM analysis_jobs
    WHERE repository = ${repo} LIMIT 1
  `;

  if (result.length != 0) {
    const wiki = await sql`
      SELECT id
      FROM wiki_docs
      WHERE job_id = ${result[0].id}
    `
    return wiki[0].id;
  }
  return null;
}

export async function createJob(repository: string): Promise<string> {
  const result = await sql`
    INSERT INTO analysis_jobs (repository, status, created_at, updated_at, wiki_data_id)
    VALUES (${repository}, ${JobStatus.PENDING}, NOW(), NOW(), NULL) RETURNING id
  `;

  return result[0].id;
}

export async function updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
  await sql`
    UPDATE analysis_jobs
    SET status     = ${status},
        updated_at = NOW()
    WHERE id = ${jobId}
  `;
}

export async function getJobStatus(jobId: string): Promise<JobUpdate | null> {
  const result = await sql`
    SELECT status, updated_at
    FROM analysis_jobs
    WHERE id = ${jobId} LIMIT 1
  `;

  return result.length > 0 ? (result[0] as JobUpdate) : null;
}

export async function createWikiDoc(
  owner: string,
  name: string,
  commitSha: string,
  docJson: WikiDoc,
  jobId: string,
  repoDesc?: string,
): Promise<string> {
  const result = await sql`
    INSERT INTO wiki_docs (owner, name, commit_sha, repo_desc, doc_json, created_at, job_id)
    VALUES (${owner}, ${name}, ${commitSha}, ${repoDesc || null}, ${JSON.stringify(docJson)}, NOW(),
            ${jobId}) ON CONFLICT (owner, name, commit_sha) DO
    UPDATE
      SET doc_json = EXCLUDED.doc_json,
      repo_desc = EXCLUDED.repo_desc
      RETURNING id
  `;

  return result[0].id;
}

export async function updateWikiIdForJob(jobId: string, wikiDocId: string): Promise<void> {
  await sql`
    UPDATE analysis_jobs
    SET wiki_data_id = ${wikiDocId},
        updated_at   = NOW(),
        WHERE id = ${jobId}
  `;
}

export async function getRecentJobs(limit: number = 10) {
  return sql`
    SELECT id, repository, status, created_at, updated_at
    FROM analysis_jobs
    ORDER BY created_at DESC
      LIMIT ${limit}
  `;
}

export async function getWikiDoc(id: string): Promise<WikiDoc | null> {
  const result = await sql`
    SELECT id, owner, name, commit_sha, repo_desc, doc_json, created_at
    FROM wiki_docs
    WHERE id = ${id} LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0];

  return {
    repo: {
      sha: row.commit_sha,
      name: row.name,
      owner: row.owner,
      description: row.repo_desc || '',
    },
    features: row.doc_json.features || [],
    citations: row.doc_json.citations || [],
  };
}
