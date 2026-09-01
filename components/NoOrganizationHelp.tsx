"use client";

import { useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { buildClerkTokenIdentifier } from "@/lib/clerkToken";

type ConvexUserShape = {
  organizationIds: { organizationId: string }[];
} | null;

/**
 * Explains why org-scoped pages show empty — almost always Convex dev + Clerk test wiring.
 */
export default function NoOrganizationHelp({
  convexUser,
}: {
  convexUser: ConvexUserShape;
}) {
  const { userId: clerkUserId, isSignedIn } = useAuth();
  const { organization: clerkOrg } = useOrganization();
  const expectedTokenIdentifier = buildClerkTokenIdentifier(clerkUserId ?? undefined);
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  const clerkHost = process.env.NEXT_PUBLIC_CLERK_HOSTNAME ?? "(not set)";

  const hasUserRow = convexUser !== null;
  const orgCount = convexUser?.organizationIds?.length ?? 0;
  const emptyOrgs = hasUserRow && orgCount === 0;

  const ensureUser = useAction(api.clerkAdmin.ensureMyConvexUserFromClerk);
  const [ensureStatus, setEnsureStatus] = useState<
    "idle" | "loading" | "ok" | "err"
  >("idle");
  const [ensureMessage, setEnsureMessage] = useState<string | null>(null);

  const runEnsure = async () => {
    setEnsureStatus("loading");
    setEnsureMessage(null);
    try {
      const r = await ensureUser({});
      setEnsureStatus("ok");
      setEnsureMessage(
        r.createdNewUserRow
          ? `Created Convex user + ${r.organizationCount} org(s). Refresh if the page does not update.`
          : `Updated orgs (${r.organizationCount}). Refresh if needed.`,
      );
    } catch (e) {
      setEnsureStatus("err");
      setEnsureMessage(
        e instanceof Error ? e.message : "Request failed — check browser console.",
      );
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-left text-sm text-gray-700 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Fixing “no organization” locally</h2>
      <p className="mt-2 text-gray-600">
        This app reads orgs from your <strong>Convex</strong> user record (filled by Clerk webhooks
        or sync), not directly from Clerk’s UI.
      </p>
      <ol className="mt-4 list-decimal space-y-3 pl-5">
        <li>
          Run <code className="rounded bg-gray-100 px-1">npm run dev</code> so you use{" "}
          <strong>test</strong> Clerk keys from <code className="rounded bg-gray-100 px-1">.env.dev.local</code>{" "}
          (live keys + localhost usually fail).
        </li>
        <li>
          In the <strong>Convex dev</strong> dashboard for <code className="rounded bg-gray-100 px-1">perceptive-crow-99</code>
          : set <code className="rounded bg-gray-100 px-1">EXPO_PUBLIC_CLERK_HOSTNAME</code> to your{" "}
          <strong>test</strong> instance host (e.g.{" "}
          <code className="rounded bg-gray-100 px-1">gorgeous-ladybird-14.clerk.accounts.dev</code>
          ) — same as in <code className="rounded bg-gray-100 px-1">.env.dev.local</code>.
        </li>
        <li>
          Set <code className="rounded bg-gray-100 px-1">CLERK_SECRET_KEY</code> on that Convex
          deployment to the matching <strong>sk_test_…</strong> secret (needed for org sync from
          Clerk’s API).
        </li>
        <li>
          In <strong>Clerk test</strong> → Webhooks: endpoint must hit your{" "}
          <strong>dev</strong> Convex HTTP URL with path <code className="rounded bg-gray-100 px-1">/clerk</code>
          , using the same signing secret as Convex <code className="rounded bg-gray-100 px-1">EXPO_PUBLIC_CLERK_WEBHOOK_SECRET</code>
          .
        </li>
        <li>
          Convex <strong>Auth</strong> must be configured for this same Clerk test instance (JWT
          issuer), or <code className="rounded bg-gray-100 px-1">getCurrentUser</code> won’t find
          your row.
        </li>
      </ol>
      {process.env.NODE_ENV === "development" && isSignedIn && clerkUserId ? (
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800 break-all">
          <p className="mb-2 font-sans text-sm font-semibold text-gray-900">
            Debug (this browser session)
          </p>
          <p>
            <span className="text-gray-500">NEXT_PUBLIC_CONVEX_URL</span>
            <br />
            {convexUrl || "—"}
          </p>
          <p className="mt-2">
            <span className="text-gray-500">NEXT_PUBLIC_CLERK_HOSTNAME</span>
            <br />
            {clerkHost}
          </p>
          <p className="mt-2">
            <span className="text-gray-500">Clerk user id</span>
            <br />
            {clerkUserId}
          </p>
          {clerkOrg?.id ? (
            <p className="mt-2">
              <span className="text-gray-500">Clerk active organization id</span>
              <br />
              {clerkOrg.id}
            </p>
          ) : null}
          <p className="mt-2">
            <span className="text-gray-500">Expected Convex users.tokenIdentifier</span>
            <br />
            {expectedTokenIdentifier ?? "—"}
          </p>
          <p className="mt-3 font-sans text-xs text-gray-600">
            Open Convex → <strong>Data</strong> → <strong>users</strong> and search for that exact{" "}
            <code className="rounded bg-white px-0.5">tokenIdentifier</code>. If no row exists,
            webhooks never created this user on <strong>this</strong> deployment, or you’re using a
            different Clerk instance than the row you inspected (e.g. live vs test).
          </p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={runEnsure}
          disabled={!isSignedIn || ensureStatus === "loading"}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700 disabled:opacity-50"
        >
          {ensureStatus === "loading"
            ? "Working…"
            : "Create / update my user from Clerk"}
        </button>
        <p className="text-xs text-gray-500 sm:flex-1">
          Calls Convex with your session: inserts a <code className="rounded bg-gray-100 px-0.5">users</code> row if
          missing, then pulls org memberships from the Clerk API. Needs{" "}
          <code className="rounded bg-gray-100 px-0.5">CLERK_SECRET_KEY</code> on this Convex deployment (same Clerk
          app as your browser).
        </p>
      </div>
      {ensureMessage ? (
        <p
          className={`mt-2 rounded-md p-3 text-sm ${
            ensureStatus === "ok"
              ? "bg-green-50 text-green-900"
              : "bg-red-50 text-red-900"
          }`}
        >
          {ensureMessage}
        </p>
      ) : null}
      {!hasUserRow ? (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-red-900">
          <strong>No Convex user row</strong> for this session’s JWT — so orgs on another user
          document won’t show here. Match{" "}
          <code className="rounded bg-red-100/80 px-1">tokenIdentifier</code> in Convex to the value
          above, or fix Clerk ↔ Convex auth (issuer + deployment).
        </p>
      ) : emptyOrgs ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-amber-950">
          Your Convex user exists but <strong>organizationIds is empty</strong>. After fixing
          webhooks / secrets, refresh the page — we try to sync orgs from Clerk once per session.
        </p>
      ) : null}
    </div>
  );
}
