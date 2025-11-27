export enum JobStatus {
  PENDING = 'pending',
  FETCHING_REPO = 'fetching_repo',
  ANALYZING_REPO = 'analyzing_repo',
  READING_FILES = 'reading_files',
  CREATING_WIKI = 'creating_wiki',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

export interface JobUpdate {
  status: JobStatus;
  updated_at: Date
}
