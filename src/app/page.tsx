'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [ping, setPing] = useState<string>('loading…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) setPing(text);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load');
          setPing('');
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Wiki Generator</h1>
      <p className="text-sm text-gray-600">API status:</p>
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <p className="rounded p-3">{ping}</p>
      )}
    </div>
  );
}
