"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Centralizes the user / organization / role pattern used across the web app.
 * Mirrors the mobile app: every screen scopes to the current Clerk organization
 * (the first org membership) and re-derives the role from `organizationIds`.
 */
export function useOrg() {
  const user = useQuery(api.users.getCurrentUser);
  const organizationId = user?.organizationIds?.[0]?.organizationId as
    | string
    | undefined;

  const role = useMemo(() => {
    if (!user || !organizationId) return undefined;
    return user.organizationIds?.find(
      (o: { organizationId: string; role: string }) =>
        o.organizationId === organizationId
    )?.role;
  }, [user, organizationId]);

  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor" || role === "admin";

  return {
    user,
    organizationId,
    role,
    isAdmin,
    isSupervisor,
    // undefined while Convex is still loading the user document
    isLoading: user === undefined,
    // null means signed in but no Convex user / no org membership
    hasOrg: Boolean(organizationId),
  };
}
