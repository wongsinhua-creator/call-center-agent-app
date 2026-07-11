import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-16 space-y-3">
      <p className="text-lg font-medium text-neutral-700">Not found</p>
      <p className="text-sm text-neutral-500">This complaint doesn&apos;t exist or was removed.</p>
      <Link href="/" className="inline-block text-sm text-neutral-900 underline">
        Back to complaints
      </Link>
    </div>
  );
}
