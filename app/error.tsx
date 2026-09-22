'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Folio App Error:', error);
  }, [error]);

  return (
    <main
      id="folio-error-boundary"
      className="min-h-screen bg-[#F4EFE6] text-[#1C1917] flex flex-col items-center justify-center p-6 text-center"
    >
      <span className="font-serif text-3xl mb-2 text-[#1C1917]">Notice</span>
      <h1 className="font-serif text-xl text-[#57534E] mb-4">Something went wrong</h1>
      <p className="text-sm text-[#78716C] max-w-md mb-6">
        An unexpected error occurred while loading this view. Your manuscript data remains safely saved in your browser storage.
      </p>
      <button
        id="btn-retry-error"
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-lg bg-[#1C1917] text-[#F4EFE6] text-sm font-medium hover:bg-[#292524] transition-colors"
      >
        Try Again
      </button>
    </main>
  );
}
