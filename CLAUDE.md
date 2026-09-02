# BuildSimpli Web App

Next.js 14 (app router) portal that mirrors the React Native mobile app (`../app`). Hand-rolled Tailwind (no UI lib), Clerk auth, Convex backend (**shared** with mobile via `convex.json` → `../app/convex`).

## Conventions

- **Auth/org:** use `useOrg()` from `@/lib/useOrg` → `{ user, organizationId, role, isAdmin, isSupervisor, isLoading, hasOrg }`. Every query/mutation scopes to `organizationId`. Pass `"skip"` to `useQuery` when args aren't ready.
- **UI kit:** import primitives from `@/components/ui` (Button, ButtonLink, Card, CardHeader, Badge, StatusBadge, Field, Input, Textarea, Select, Modal, Spinner, LoadingState, EmptyState, PageHeader, PageContainer, cx). Brand color from `@/lib/colors` (orange prod / purple dev).
- **Project pages** (`app/projects/[projectId]/*`) render `<ProjectNav projectId={projectId} />` at the top for the in-project tab bar.
- **Money** is stored in **cents** — use `formatCents` from `@/lib/format`. Dates: `formatUTCDate` (`@/lib/dateFormat`), `getLocalDateUTCStart`/`utcDayTimestampToLocalDate` (`@/lib/time`).
- Read project id with `useParams()`: `params.projectId as Id<"projects">`.

## Important: generated Convex types

`web/convex/_generated/` is a **vendored copy** of the app's generated types (the app's `_generated` is the source of truth). After adding/changing Convex functions in `../app/convex`, re-sync:

```
cp ../app/convex/_generated/{api.d.ts,dataModel.d.ts,server.d.ts} convex/_generated/
```

Otherwise new backend modules won't typecheck in the web app.

## Build gotcha (strict mode)

`tsconfig` has `strict: true` and `next build` typechecks. Convex query results infer as `any` here, so **annotate every `.map/.filter/.find/.sort` callback param explicitly** (e.g. `(p: Doc<"projects">) => ...`) or `next build` fails with `TS7006`.

## Feature parity status (mirrors mobile)

Built on web: Projects, Daily Reports, Work Orders (search/view/upload), Address History, Clients, Jobs (+ public updates), Invoices/Billing (+ Stripe), Task Lists, Incidents, Teams, Toolbox Talks, Schedules, Photos/Files (view-only), Earnings, Daily Overview dashboard, Settings (org/branding/users).

Web is **view-only for photo/file uploads** (capture/upload needs the GCS chunk API used by mobile). Signature capture for toolbox talks is also mobile-only.
