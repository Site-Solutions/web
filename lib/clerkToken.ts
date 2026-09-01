/**
 * Convex stores users with tokenIdentifier = `${issuer}|${clerkUserId}`.
 * Keep in sync with `web/lib/auth.ts` and the mobile `useAuth` hook.
 */
export function buildClerkTokenIdentifier(
  userId: string | null | undefined
): string | null {
  if (!userId) return null;
  const issuer =
    process.env.NEXT_PUBLIC_CLERK_HOSTNAME != null
      ? `https://${process.env.NEXT_PUBLIC_CLERK_HOSTNAME}`
      : "https://gorgeous-ladybird-14.clerk.accounts.dev";
  return `${issuer}|${userId}`;
}
