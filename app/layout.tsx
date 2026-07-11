import type { Metadata, Viewport } from "next";
import { AuthNav } from "@/components/AuthNav";
import { AppNav } from "@/components/AppNav";
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
        <AppNav auth={<AuthNav />} />
        <div className="md:pl-56">
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
