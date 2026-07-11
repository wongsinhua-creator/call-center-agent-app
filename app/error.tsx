"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-6 text-center space-y-3">
      <p className="font-medium">Something went wrong.</p>
      <p className="text-sm text-red-700">{error.message || "Please try again."}</p>
      <button
        onClick={reset}
        className="rounded-md bg-red-800 text-white px-3 py-1.5 text-sm hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
