'use client';

import {useEffect, useState} from 'react';
import {fetchRecentJobs} from "@/actions/jobs";
import {useRouter} from 'next/navigation';
import {JobStatus} from "@/types";

type Job = {
  id: string;
  wiki_data_id: string;
  repository: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
};

export function Recent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchJobs = async () => {
      const updatedJobs = await fetchRecentJobs();
      setJobs(updatedJobs as Job[]);
    };

    fetchJobs();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    const updatedJobs = await fetchRecentJobs();
    setJobs(updatedJobs as Job[]);
    setIsLoading(false);
  };

  const handleJobClick = (job: Job) => {
    if (job.status ===  JobStatus.COMPLETE) {
      router.push(`/wiki/${job.id}`);
    }
  };

  if (jobs.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Recent Jobs</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => handleJobClick(job)}
            className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50  ${
              job.status === JobStatus.COMPLETE ? 'cursor-pointer' : ''
            }`}
          >
            <div className="flex-1">
              <p className="font-medium">{job.repository}</p>
              <p className="text-sm text-gray-500">
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                job.status === JobStatus.COMPLETE
                  ? 'bg-green-100 text-green-800'
                  : job.status === JobStatus.FAILED
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {job.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
