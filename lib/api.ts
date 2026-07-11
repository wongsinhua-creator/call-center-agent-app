import { NextResponse } from "next/server";
import { isTimeoutError } from "@/lib/guard";

// Last-resort exception boundary for API routes: anything a handler doesn't
// catch becomes a structured error response instead of a crash — 504 for
// deadline/abort errors, 500 for everything else.
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api] unhandled exception", err);
      if (isTimeoutError(err)) {
        return NextResponse.json(
          { error: "The request timed out. Please try again." },
          { status: 504 },
        );
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
