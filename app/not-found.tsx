import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="folio-not-found"
      className="min-h-screen bg-[#F4EFE6] text-[#1C1917] flex flex-col items-center justify-center p-6 text-center"
    >
      <span className="font-serif text-3xl mb-2 text-[#1C1917]">404</span>
      <h1 className="font-serif text-xl text-[#57534E] mb-6">Page Not Found</h1>
      <p className="text-sm text-[#78716C] max-w-md mb-8">
        The manuscript or page you are seeking could not be found.
      </p>
      <Link
        id="btn-return-library"
        href="/"
        className="px-5 py-2.5 rounded-lg bg-[#1C1917] text-[#F4EFE6] text-sm font-medium hover:bg-[#292524] transition-colors"
      >
        Return to Library
      </Link>
    </main>
  );
}
