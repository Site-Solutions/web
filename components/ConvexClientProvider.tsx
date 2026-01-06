"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth();

  const convex = useMemo(() => {
    console.log("🔧 Creating Convex client");
    return new ConvexReactClient(convexUrl);
  }, []);

  // Don't render children until Clerk is loaded
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

