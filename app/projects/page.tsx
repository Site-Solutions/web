"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { FolderOpen, ChevronRight } from "lucide-react";
import NoOrganizationHelp from "@/components/NoOrganizationHelp";
import { buildClerkTokenIdentifier } from "@/lib/clerkToken";

export default function ProjectsPage() {
  const {
    userId: clerkUserId,
    isLoaded: clerkLoaded,
    isSignedIn,
    getToken,
  } = useAuth();
  const user = useQuery(api.users.getCurrentUser);
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!clerkLoaded || !isSignedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const convexJwt = await getToken({ template: "convex" });
        if (cancelled) return;
        console.log("[ProjectsPage] Clerk → Convex JWT", {
          template: "convex",
          ok: Boolean(convexJwt),
          hint:
            convexJwt == null
              ? 'Create a JWT template named "convex" in Clerk (Convex + Clerk docs). Without it, getCurrentUser is always null.'
              : "token present; if getCurrentUser still null, check Convex Dashboard → Auth issuer matches this Clerk instance.",
        });
      } catch (e) {
        if (!cancelled) {
          console.warn("[ProjectsPage] getToken({ template: \"convex\" }) threw", e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!clerkLoaded) return;
    const expectedTokenIdentifier = buildClerkTokenIdentifier(clerkUserId ?? undefined);
    console.log("[ProjectsPage] dev debug", {
      isSignedIn,
      clerkUserId,
      expectedTokenIdentifier,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      NEXT_PUBLIC_CLERK_HOSTNAME: process.env.NEXT_PUBLIC_CLERK_HOSTNAME,
      convexGetCurrentUser:
        user === undefined
          ? "loading"
          : user === null
            ? "null — usually no Convex JWT (see [ProjectsPage] Clerk → Convex JWT above) or no users row for that JWT"
            : {
                _id: user._id,
                tokenIdentifier: user.tokenIdentifier,
                organizationCount: user.organizationIds?.length ?? 0,
              },
    });
  }, [clerkLoaded, isSignedIn, clerkUserId, user]);

  const isAdmin = useMemo(
    () =>
      user?.organizationIds?.some(
        (org: { organizationId: string; role: string }) =>
          org.organizationId === organizationId && org.role === "admin"
      ) ?? false,
    [user?.organizationIds, organizationId]
  );

  const [showArchived, setShowArchived] = useState(false);
  const setProjectArchived = useMutation(api.projects.setProjectArchived);

  const projects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId
      ? { organizationId, includeArchived: isAdmin && showArchived ? true : undefined }
      : "skip"
  );

  if (user === undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-600">
        <p className="text-lg font-medium text-gray-900">No organization found for your account.</p>
        <NoOrganizationHelp convexUser={user} />
      </div>
    );
  }

  if (projects === undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading projects…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
        <p className="mt-2 text-gray-600">
          You don&apos;t have access to any projects yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      <p className="mt-1 text-sm text-gray-600">
        Open daily reports for a project.
      </p>
      {isAdmin ? (
        <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Show archived projects
        </label>
      ) : null}
      <ul className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
        {projects.map((p: Doc<"projects">) => (
          <li key={p._id} className="flex items-stretch">
            <Link
              href={`/projects/${p._id}`}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <FolderOpen
                className="h-8 w-8 shrink-0 text-gray-400"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">
                  {p.name}
                  {p.archivedAt != null ? (
                    <span className="ml-2 text-xs font-normal text-gray-500">(archived)</span>
                  ) : null}
                </p>
                {p.description ? (
                  <p className="text-sm text-gray-500 truncate">{p.description}</p>
                ) : null}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
            {isAdmin ? (
              <div className="flex shrink-0 items-center border-l border-gray-100 px-2">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() =>
                    void setProjectArchived({
                      projectId: p._id as Id<"projects">,
                      organizationId,
                      archived: p.archivedAt == null,
                    })
                  }
                >
                  {p.archivedAt != null ? "Restore" : "Archive"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
