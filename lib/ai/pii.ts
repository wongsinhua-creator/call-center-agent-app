// Lightweight redaction so raw PII patterns aren't sent to a third-party model.
// Not exhaustive — a best-effort scrub of the obvious structured patterns.
export function redactPii(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "[ssn]")
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[card]")
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[phone]");
}
