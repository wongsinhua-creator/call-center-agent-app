import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function AuthNav({ email }: { email: string | null }) {
  if (!email) {
    return (
      <Link
        href="/login"
        className="block w-full rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 text-center hover:bg-neutral-900 hover:text-white whitespace-nowrap"
      >
        Sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-2 text-neutral-600">
      <span className="max-w-40 truncate" title={email}>
        {email}
      </span>
      <SignOutButton />
    </span>
  );
}
