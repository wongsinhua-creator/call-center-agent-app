import type { Metadata, Viewport } from "next";
import { AuthNav } from "@/components/AuthNav";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/adminAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Complaint Tracker — Call Center",
  description: "AI-tagged complaint tracking for call center agents",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One session read for the whole chrome; the auth check must never take
  // down the layout — render signed-out on failure.
  let email: string | null = null;
  let isAdmin = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    isAdmin = isAdminUser(user);
  } catch {
    // signed-out chrome
  }

  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-neutral-50 text-neutral-900">
        <AppNav isAdmin={isAdmin} auth={<AuthNav email={email} />} />
        <div className="md:pl-56">
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
