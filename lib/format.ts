// Deterministic timestamp formatting: fixed locale + UTC so server-rendered
// HTML matches client hydration on every OS, browser, locale, and timezone.
const DATE_TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTime(iso: string): string {
  return `${DATE_TIME_FMT.format(new Date(iso))} UTC`;
}

// Compact human duration, e.g. "2d 4h", "3h 12m", "45m", "<1m".
export function formatDuration(ms: number): string {
  if (ms < 60_000) return "<1m";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}
