/** Format a cents integer as USD currency. */
export function formatCents(cents?: number | null): string {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Title-case a snake_case / lowercase status for display. */
export function humanize(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
