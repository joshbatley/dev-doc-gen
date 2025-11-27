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

export interface ReadTarget {
  path: string;
  reason: string;
  priority: 1 | 2 | 3;
  budget_hint: 'preview' | 'full'
}

export interface Slice {
  id: string;           // unique within job (e.g., s_1, s_2)
  file: string;         // path
  startLine: number;
  endLine: number;
  text: string;         // the slice used for context
  url: string;          // GitHub blob with #Lstart-Lend
}

export interface ReadPackage {
  repo: { owner: string; name: string; sha: string };
  slices: Slice[];
  index: Array<{ file: string; totalLines: number; included: Array<{ start: number; end: number }> }>;
  stats: { filesRequested: number; filesFetched: number; totalSlices: number; totalChars: number };
}

export type SeedDoc = {
  path: string;
  preview: string;      // truncated text excerpt
  bytes: number;        // original file size if known
  kind: 'readme' | 'doc' | 'manifest' | 'workflow' | 'other';
};

export type SeedPackage = {
  repo: {
    owner: string;
    name: string;
    ref: string;       // requested ref or default branch
    sha: string;       // resolved commit sha
    description: string;
    languages: Record<string, number>;
  };
  treeSummary: Array<{ path: string; size?: number }>; // only a summary
  seeds: SeedDoc[];
  counts: {
    treeFiles: number;
    seeds: number;
  };
};

export interface WikiFeature {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  sections: {
    overview: { text: string; citations: string[] };
    public_interfaces: Array<{
      type: 'http' | 'cli' | 'function' | 'event' | 'config' | 'other';
      name?: string;
      method?: string;
      path?: string;
      signature?: string;
      description?: string;
      citations: string[];
    }>;
    key_flows: Array<{
      title: string;
      steps: Array<{ text: string; citations: string[] }>;
    }>;
    data_and_state: Array<{
      entity: string;
      fields?: string[];
      storage?: string;
      citations: string[];
    }>;
    key_files: Array<{
      path: string;
      role?: string;
      citations: string[];
    }>;
    dependencies: Array<{
      name: string;
      purpose?: string;
      citations: string[];
    }>;
    limitations?: Array<{ text: string; citations?: string[] }>;
  };
}

export interface WikiDoc {
  repo: { owner: string; name: string; sha: string, description?: string };
  features: WikiFeature[];
  citations: Array<{ id: string; file: string; startLine: number; endLine: number; url: string }>;
}

