import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">
              Complaint Tracker
            </Link>
            <div className="flex items-center gap-3 sm:gap-4 text-sm">
              <Link href="/" className="hidden sm:inline text-neutral-600 hover:text-neutral-900">
                Complaints
              </Link>
              <Link
                href="/dashboard"
                className="text-neutral-600 hover:text-neutral-900 whitespace-nowrap"
              >
                Dashboard
              </Link>
              <AuthNav />
              <Link
                href="/complaints/new"
                className="rounded-md bg-neutral-900 text-white px-3 py-1.5 hover:bg-neutral-700 whitespace-nowrap"
              >
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New Complaint</span>
              </Link>
            </div>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
