"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Automatically syncs user's name from Clerk when they sign in
 * if the name is missing or empty in Convex database
 */
export function AutoSyncUser() {
  const { userId, isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const syncUserFromClerk = useAction(api.clerkAdmin.syncUserFromClerk);
  const hasSyncedRef = useRef(false);

  // Get user from Convex using getCurrentUser (uses auth context automatically)
  // Only query if auth is loaded
  const convexUser = useQuery(
    api.users.getCurrentUser,
    authLoaded ? undefined : "skip"
  );

  useEffect(() => {
    // Log that component is mounting
    console.log("🚀 AutoSyncUser component mounted", {
      authLoaded,
      userLoaded,
      isSignedIn,
      hasUserId: !!userId,
      hasClerkUser: !!clerkUser,
      hasConvexUser: !!convexUser,
    });
  }, []);

  useEffect(() => {
    console.log("🔍 AutoSyncUser check:", {
      authLoaded,
      userLoaded,
      isSignedIn,
      hasUserId: !!userId,
      hasClerkUser: !!clerkUser,
      hasConvexUser: !!convexUser,
      hasSynced: hasSyncedRef.current,
      clerkEmail: clerkUser?.emailAddresses?.[0]?.emailAddress,
      convexUserName: convexUser?.name,
      clerkUserName: clerkUser?.fullName || `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim(),
    });
  }, [authLoaded, userLoaded, isSignedIn, userId, clerkUser, convexUser]);

  useEffect(() => {
    // Wait for both Clerk and Convex to be loaded
    if (!authLoaded || !userLoaded) {
      console.log("⏳ AutoSyncUser: Waiting for auth/user to load");
      return;
    }

    // Only run if:
    // 1. User is signed in
    // 2. We have both Clerk and Convex user data
    // 3. We haven't already synced in this session
    // 4. Convex user exists but name is missing/empty
    if (
      !isSignedIn ||
      !clerkUser ||
      !convexUser ||
      hasSyncedRef.current ||
      !clerkUser.emailAddresses?.[0]?.emailAddress
    ) {
      if (!isSignedIn) {
        console.log("⏭️ AutoSyncUser: User not signed in");
      } else if (!clerkUser) {
        console.log("⏭️ AutoSyncUser: No Clerk user");
      } else if (!convexUser) {
        console.log("⏭️ AutoSyncUser: No Convex user");
      } else if (hasSyncedRef.current) {
        console.log("⏭️ AutoSyncUser: Already synced this session");
      } else if (!clerkUser.emailAddresses?.[0]?.emailAddress) {
        console.log("⏭️ AutoSyncUser: No email address");
      }
      return;
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const convexUserName = convexUser.name?.trim();
    const clerkUserName = clerkUser.fullName || 
                          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();

    // Check if the Convex name looks like a default/temporary name
    // Pattern: "FirstName User" or ends with "User" (extracted from email)
    const isDefaultName = (name: string) => {
      if (!name) return true;
      // Check if it ends with " User" (the default last name we set)
      if (name.endsWith(" User")) return true;
      // Check if it's just "User"
      if (name === "User") return true;
      // Check if it matches the email extraction pattern (e.g., "Tmctesterson39 User")
      const emailLocalPart = email.split("@")[0];
      const nameParts = emailLocalPart.split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1));
      const extractedFirstName = nameParts[0] || "";
      const extractedLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";
      const extractedName = `${extractedFirstName} ${extractedLastName}`.trim();
      if (name === extractedName) return true;
      return false;
    };

    // Check if Convex has a default name
    const convexHasDefaultName = convexUserName && isDefaultName(convexUserName);
    
    // Always sync if:
    // 1. Convex has no name and Clerk has any name, OR
    // 2. Convex has a default name (always sync to catch when Clerk updates from Google OAuth)
    // This ensures that when Clerk gets the real name from Google, it will sync to Convex
    const needsSync = (!convexUserName && clerkUserName) || 
                      (convexHasDefaultName && clerkUserName);

    console.log("🔍 AutoSyncUser: Checking if sync needed:", {
      email,
      convexUserName,
      clerkUserName,
      isDefaultName: convexUserName ? isDefaultName(convexUserName) : true,
      clerkHasRealName,
      needsSync,
    });

    // If Convex user has no name OR has a default/temporary name, and Clerk has a real name, sync it
    if (needsSync && clerkUserName) {
      console.log("🔄 Auto-syncing user name from Clerk:", {
        email,
        clerkName: clerkUserName,
        convexName: convexUserName,
      });

      hasSyncedRef.current = true; // Mark as synced to prevent multiple calls

      syncUserFromClerk({ email })
        .then((result) => {
          console.log("✅ User name auto-synced:", result);
        })
        .catch((error) => {
          console.error("❌ Failed to auto-sync user name:", error);
          hasSyncedRef.current = false; // Reset on error so we can retry
        });
    } else if (convexUserName && !isDefaultName(convexUserName)) {
      console.log("✅ AutoSyncUser: User already has a real name, no sync needed");
    } else if (!clerkUserName) {
      console.log("⏭️ AutoSyncUser: Clerk user has no name, cannot sync");
    }
  }, [authLoaded, userLoaded, isSignedIn, clerkUser, convexUser, syncUserFromClerk]);

  return null; // This component doesn't render anything
}
