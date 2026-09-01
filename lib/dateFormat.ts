export function formatUTCDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}
