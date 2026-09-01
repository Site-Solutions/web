# BuildSimpli Web Portal

A Next.js web application that integrates with the BuildSimpli Convex backend and Clerk authentication.

## Features

- ✅ Clerk authentication integration
- ✅ Organization membership validation
- ✅ Convex backend integration
- ✅ Protected routes with middleware
- ✅ Modern UI with Tailwind CSS

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

**Local dev: pick which backend `.env` file to load**

- `npm run dev` — **`next dev`** + **`.env.dev.local`** (Convex dev + Clerk test).
- `npm run dev:prod-env` — still **`next dev`**, but **`.env.prod.local`** (prod Convex + live Clerk). The name avoids calling this `prod`, which usually means **`next start`** / `NODE_ENV=production`.
- `npm run build:prod-env` — **`next build`** baked with prod `NEXT_PUBLIC_*` vars (e.g. before testing a prod-like bundle locally).
- **`npm run build`** then **`npm run start`** — actual production-style server (what you deploy).

Copy **`.env.example`** to those two files and fill in values. Keep **`.env.local`** free of secrets (or empty); Next.js merges it and could override `dotenv` otherwise.

**Localhost + organizations:** Clerk **live** (`pk_live_…`) often does not work on `http://localhost`. Use **`npm run dev`** (test Clerk + Convex **dev** deployment). Then verify:

1. **Convex dev** env: `EXPO_PUBLIC_CLERK_HOSTNAME` = test instance hostname (no `https://`), same as `NEXT_PUBLIC_CLERK_HOSTNAME` in `.env.dev.local`.
2. **Convex dev** env: `CLERK_SECRET_KEY` = **`sk_test_…`** for that Clerk app (needed for org sync + debugging).
3. **Clerk (test)** → Webhooks → URL is your **dev** Convex site + **`/clerk`**, secret matches Convex `EXPO_PUBLIC_CLERK_WEBHOOK_SECRET`.
4. **Convex** → Settings → **Auth** uses that same Clerk test instance (JWT issuer), so `getCurrentUser` matches `users.tokenIdentifier` from webhooks.

If you see “no organization”, open **Projects** — the page includes a longer troubleshooting panel.

<details>
<summary>Older single-file `.env.local` instructions</summary>

Create a `.env.local` file in the root directory:

**Option A: Using Production Keys (Recommended if you have production org)**

To use production Clerk keys with localhost, you need to configure Clerk to allow localhost:

1. Go to your Clerk Dashboard: https://dashboard.clerk.com
2. Select your application
3. Go to **Settings** → **Domains** or **Allowed Origins**
4. Add `http://localhost:3000` to the allowed origins/domains list
5. Save the changes

Then use production keys in `.env.local`:

```env
# Clerk Authentication - Production keys (with localhost allowed)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuYnVpbGRzaW1wbGkuY29tJA
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_HOSTNAME=clerk.buildsimpli.com

# Override default redirect URLs (forces redirect to home page after sign-in)
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/

# Convex Backend - Use production for same org, or dev for testing
NEXT_PUBLIC_CONVEX_URL=https://enduring-llama-536.convex.cloud
NEXT_PUBLIC_CONVEX_DEPLOYMENT=prod:enduring-llama-536
```

**Option B: Using Test Keys (Alternative)**

If you prefer to use test keys for local development:

```env
# Clerk Authentication - Test keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_HOSTNAME=your-dev-clerk-hostname.clerk.accounts.dev

# Convex Backend - Use dev deployment
NEXT_PUBLIC_CONVEX_URL=https://perceptive-crow-99.convex.cloud
NEXT_PUBLIC_CONVEX_DEPLOYMENT=dev:perceptive-crow-99
```

</details>

### 3. Link to Shared Convex Backend

This web app uses the same Convex backend as the mobile app. The `convex.json` file is configured to reference the app's convex functions:

```json
{
  "functions": "../app/convex"
}
```

To generate the Convex API types, you can either:
- Run `npx convex dev` from the `app` directory (which will generate types there)
- Or create a symlink/copy of the generated API types

### 4. Run Development Server

```bash
npm run dev
# or next dev against production Convex + Clerk:
npm run dev:prod-env
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Flow

1. **Unauthenticated users** are redirected to `/sign-in`
2. **Authenticated users** are checked for organization membership
3. **Users without organization access** are redirected to `/unauthorized`
4. **Users with organization access** can access the dashboard

## Project Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout with Clerk & Convex providers
│   ├── page.tsx             # Home page (protected)
│   ├── sign-in/             # Clerk sign-in page
│   ├── sign-up/             # Clerk sign-up page
│   └── unauthorized/        # Access denied page
├── components/
│   └── ConvexClientProvider.tsx  # Convex React client provider
├── lib/
│   └── auth.ts              # Organization access checking
└── middleware.ts            # Clerk middleware for route protection
```

## Key Files

- **`middleware.ts`**: Protects routes and requires authentication
- **`lib/auth.ts`**: Checks if users belong to organizations (matches app logic)
- **`app/page.tsx`**: Main dashboard page with organization access check
- **`components/ConvexClientProvider.tsx`**: Provides Convex client to React components

## Organization Access Logic

The web app uses the same organization checking logic as the mobile app:

1. Formats the Clerk `userId` as `tokenIdentifier` using the pattern: `{clerkTokenReference}|{userId}`
2. Queries the Convex `users.getUser` function
3. Checks if the user has at least one organization in `organizationIds` array

This ensures consistency between the mobile app and web portal.

## Using Production Keys Locally

**Yes, you can use production Clerk keys for local development!** Here's how:

1. **In Clerk Dashboard:**
   - Go to **Settings** → **Domains** (or **Allowed Origins**)
   - Add `http://localhost:3000` to the allowed list
   - Save changes

2. **In your `.env.local`:**
   - Use your production keys (`pk_live_...` and `sk_live_...`)
   - Set `NEXT_PUBLIC_CLERK_HOSTNAME=clerk.buildsimpli.com`
   - Use production Convex deployment if you want the same data

This allows you to:
- ✅ Test with your production organization
- ✅ Use the same user accounts
- ✅ Access production data (if using prod Convex)
- ✅ Develop locally without switching keys

**Note:** Make sure to only add `localhost` in development. Remove it before deploying or keep it only for your development environment.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard (use production keys)
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- etc.

Make sure to set all environment variables in your deployment platform.

## Development Notes

- The web app shares the same Convex backend as the mobile app
- Organization membership is validated on every page load
- Clerk handles all authentication UI and flows
- The unauthorized page allows users to sign out or try a different account
