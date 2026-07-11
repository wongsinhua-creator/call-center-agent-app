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
