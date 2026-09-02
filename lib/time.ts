/** Local calendar day encoded as UTC midnight timestamp (matches mobile app). */
export function getLocalDateUTCStart(now?: Date | number | null): number {
  const date =
    now instanceof Date ? now : now != null ? new Date(now) : new Date();
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

export function utcDayTimestampToLocalDate(timestamp: number): Date {
  const d = new Date(timestamp);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
