"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Complaints" },
  { href: "/customers", label: "Customers" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/insights", label: "Insights" },
];

function NavLinks({ pathname, isAdmin }: { pathname: string; isAdmin: boolean }) {
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;
  return (
    <>
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`block rounded-md px-3 py-2 text-sm ${
              active
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <Link
        href="/complaints/new"
        className="block rounded-md bg-neutral-900 text-white px-3 py-2 text-sm text-center hover:bg-neutral-700"
      >
        New Complaint
      </Link>
    </>
  );
}

// `auth` is a server-rendered slot (AuthNav) passed from the layout.
export function AppNav({ auth, isAdmin = false }: { auth: React.ReactNode; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating closes the mobile drawer.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Mobile: top bar with hamburger */}
      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            Complaint Tracker
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
        {open && (
          <nav className="border-t border-neutral-200 px-4 py-3 space-y-1 bg-white">
            <NavLinks pathname={pathname} isAdmin={isAdmin} />
            <div className="pt-2 border-t border-neutral-100 text-sm px-3 py-2">{auth}</div>
          </nav>
        )}
      </header>

      {/* Desktop: fixed left sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-20 w-56 flex-col bg-white border-r border-neutral-200">
        <div className="px-4 py-5 border-b border-neutral-200">
          <Link href="/" className="font-semibold tracking-tight">
            Complaint Tracker
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinks pathname={pathname} isAdmin={isAdmin} />
        </nav>
        <div className="px-4 py-4 border-t border-neutral-200 text-sm">{auth}</div>
      </aside>
    </>
  );
}
