"use client";

/**
 * Live Clerk keys + localhost are a common footgun (Clerk blocks or misconfigures dev origins).
 * NEXT_PUBLIC_* is inlined at build/dev compile time from the active env file.
 */
export default function DevLocalhostBanner() {
  if (process.env.NODE_ENV !== "development") return null;

  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (!pk.startsWith("pk_live_")) return null;

  return (
    <div
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
      role="status"
    >
      <strong>Clerk live keys</strong> — localhost is often blocked or misconfigured. For local
      work use <code className="rounded bg-amber-100/80 px-1">npm run dev</code> (loads{" "}
      <code className="rounded bg-amber-100/80 px-1">.env.dev.local</code> with{" "}
      <strong>test</strong> Clerk + Convex dev).
    </div>
  );
}
