import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function AuthNav({ email }: { email: string | null }) {
  if (!email) {
    return (
      <Link href="/login" className="text-neutral-600 hover:text-neutral-900 whitespace-nowrap">
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
