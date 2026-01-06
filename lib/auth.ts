import { ConvexHttpClient } from "convex/browser";
import { currentUser } from "@clerk/nextjs/server";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

// Match the same logic as the app's convex/users.ts
// For dev, this should match what's in your dev Convex deployment
const clerkTokenReference = process.env.NEXT_PUBLIC_CLERK_HOSTNAME
  ? `https://${process.env.NEXT_PUBLIC_CLERK_HOSTNAME}`
  : "https://gorgeous-ladybird-14.clerk.accounts.dev";

console.log("🔧 Clerk Token Reference:", {
  NEXT_PUBLIC_CLERK_HOSTNAME: process.env.NEXT_PUBLIC_CLERK_HOSTNAME,
  clerkTokenReference,
});

/**
 * Check if a user has access to any organization
 * This matches the authentication logic from the mobile app
 * 
 * Note: For production, you may want to pass Clerk session tokens
 * to authenticate Convex queries. For now, this uses public queries.
 */
export async function checkOrganizationAccess(
  userId: string
): Promise<boolean> {
  try {
    // Get full user info from Clerk to see email
    const clerkUser = await currentUser();
    
    // Format userId the same way as the app does
    const tokenIdentifier = `${clerkTokenReference}|${userId}`;

    console.log("🔍 Checking organization access:", {
      userId,
      clerkEmail: clerkUser?.emailAddresses?.[0]?.emailAddress,
      clerkTokenReference,
      tokenIdentifier,
      convexUrl,
    });

    // Create a Convex client for server-side queries
    const client = new ConvexHttpClient(convexUrl);

    // Query the user by tokenIdentifier using function path as string
    // The function path "users:getUser" matches the app's Convex backend
    let user = await client.query("users:getUser" as any, {
      tokenIdentifier,
    });

    console.log("👤 User query result (first attempt):", {
      userFound: !!user,
      userId: user?._id,
      organizationIds: user?.organizationIds,
      organizationCount: user?.organizationIds?.length || 0,
    });

    // If user not found, the userId might have changed (different Clerk instance)
    // This happens when using different Clerk instances (dev vs prod)
    // The user exists with the old tokenIdentifier but we're querying with the new one
    if (!user && clerkUser?.emailAddresses?.[0]?.emailAddress) {
      console.log("❌ User not found with current tokenIdentifier");
      console.log("💡 This likely means you're using a different Clerk instance than the mobile app");
      console.log("💡 Options:");
      console.log("   1. Use the same Clerk instance (set NEXT_PUBLIC_CLERK_HOSTNAME=clerk.buildsimpli.com)");
      console.log("   2. Wait for Clerk webhook to create a new user record");
      console.log("   3. Manually update the user's tokenIdentifier in the database");
      console.log("   Current tokenIdentifier:", tokenIdentifier);
      console.log("   Expected (from mobile app): https://clerk.buildsimpli.com|user_2n8dXN9V0yJYx4rCtiZNsMOfv2U");
      return false;
    }
    
    if (!user) {
      console.log("❌ User not found in Convex database");
      return false;
    }

    // Check if user belongs to at least one organization
    const hasAccess = user.organizationIds && user.organizationIds.length > 0;
    
    console.log("✅ Organization access check:", {
      hasAccess,
      organizationIds: user.organizationIds,
    });

    return hasAccess;
  } catch (error) {
    console.error("❌ Error checking organization access:", error);
    return false;
  }
}

/**
 * Get the current user's information
 */
export async function getCurrentUser(userId: string) {
  try {
    const tokenIdentifier = `${clerkTokenReference}|${userId}`;
    const client = new ConvexHttpClient(convexUrl);

    const user = await client.query("users:getUser" as any, {
      tokenIdentifier,
    });

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

