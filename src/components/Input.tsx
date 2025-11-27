
'use client';

import { useState } from 'react';

export function parseRepoInput(input: string): string | null {
  const trimmed = input.trim();

  // Remove trailing slash
  const cleaned = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;

  // Match full URL
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+\/[^\/]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Match owner/repo format
  const directMatch = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (directMatch) {
    return cleaned;
  }

  return null;
}

export function Input() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setJobStatus(null);
    setStatusUpdates('');

    // Parse the input
    const repo = parseRepoInput(input);
    if (!repo) {
      setError('Invalid repository format. Use "owner/repo" or full GitHub URL');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/analyse?repo=${encodeURIComponent(repo)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to analyze repository');
        setLoading(false);
        return;
      }

      setResult(data);

      if (data.jobId) {
        const eventSource = new EventSource(`/api/status?jobId=${data.jobId}`);

        eventSource.onmessage = (event) => {
          try {
            const update = JSON.parse(event.data);

            if (update.error) {
              setError(update.error + (update.details ? `: ${update.details}` : ''));
              eventSource.close();
              setLoading(false);
              return;
            }

            if (update.status) {
              setJobStatus(update.status);
              setStatusUpdates(
                `[${new Date(update.updated_at).toLocaleTimeString()}] Status: ${update.status}`
              );

              // Close connection and stop loading when job is done
              if (update.status === 'complete' || update.status === 'failed') {
                eventSource.close();
                setLoading(false);
              }
            }
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
          }
        };

        eventSource.onerror = () => {
          setError('Connection to job status status failed');
          eventSource.close();
          setLoading(false);
        };
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="repo" className="block text-sm font-medium">
            GitHub Repository
          </label>
          <input
            id="repo"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="owner/repo or https://github.com/owner/repo"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-sm text-gray-500">
            Examples: facebook/react or https://github.com/vercel/next.js
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze Repository'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {jobStatus && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-800 mb-2">
            Job Status: <span className="uppercase">{jobStatus}</span>
          </p>
          {statusUpdates.length > 0 && (
            <div className="mt-2 space-y-1">
                <p  className="text-xs text-gray-600 font-mono">
                  {statusUpdates}
                </p>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800 mb-2">Success!</p>
          <pre className="text-xs overflow-auto text-gray-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
