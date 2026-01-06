import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/unauthorized",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Get auth state
  const { userId } = await auth();

  // If not authenticated, redirect to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    // Clear any existing redirect_url to prevent loops
    signInUrl.searchParams.delete("redirect_url");
    return NextResponse.redirect(signInUrl);
  }

  // If we have redirect_url in query params, clean it up to prevent loops
  const url = new URL(req.url);
  if (url.searchParams.has("redirect_url")) {
    const cleanUrl = new URL(req.url);
    cleanUrl.searchParams.delete("redirect_url");
    return NextResponse.redirect(cleanUrl);
  }

  // User is authenticated, allow request
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

