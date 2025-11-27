import {neon} from '@neondatabase/serverless';
import {JobStatus} from "@/types";

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
