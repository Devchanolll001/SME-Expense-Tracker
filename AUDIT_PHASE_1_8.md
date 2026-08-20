# SME Expense Tracker Phase 1-8 Audit

Audit date: 2026-08-19
Scope: existing application, migrations, RLS policies, server actions, route protection, financial reads/writes, forms, and UI surfaces. No implementation changes were made before this report.

## Executive Summary

Baseline static checks pass: `npm run lint` and `npx tsc --noEmit`.

The active development server is `next dev -p 3000` (process tree rooted at the workspace), and owns port 3000. It must not be stopped blindly before the production build is attempted.

Findings identified before fixes:

- P0 Critical: 0
- P1 High: 2
- P2 Medium: 2
- P3 Low: 1

Remote Supabase runtime/RLS checks have not been run in this environment. The SQL verification scripts are present and were reviewed, but their execution requires a disposable/local Supabase database.

## Findings

### P1-001: Root route is still the create-next-app starter page

- Phase: 1 / 3 / 4 integration
- Evidence: `app/page.tsx` renders Next.js starter content and does not inspect session state or route users to login, onboarding, or dashboard.
- Impact: `/` is not a usable entry point for the completed application and breaks the expected authentication-to-workspace journey for users arriving at the site root.
- Fix: replaced the starter page with the existing authenticated-business decision path; it redirects unauthenticated users to `/login`, users without a business to `/onboarding`, and users with a business to `/dashboard`.
- Verification: TypeScript, lint, production build, and built-server smoke check (`/` returned `307 /login`).

### P1-002: Production build rejected a synchronous export from a server-action module

- Phase: 3 / build integration
- Evidence: `app/auth/actions.ts` used `

### P2-001: Category duplicate prevention is not concurrency-safe

- Phase: 7
- Evidence: `app/categories/actions.ts` performs a select-then-insert duplicate check; Phase 2/4 SQL has no unique constraint for `(business_id, type, normalized name)`.
- Impact: two concurrent submissions can create duplicate categories, producing inconsistent classification choices and violating the apparent category contract.
- Planned smallest fix: add a database uniqueness boundary compatible with the existing normalized-name behavior, then map the unique violation to the existing friendly duplicate message. This requires a migration and must preserve existing data by failing clearly if duplicates already exist.
- Verification: TypeScript/lint, migration review, and a database concurrency/constraint check when Supabase is available.

### P2-002: Money formatting has a duplicated normalization path

- Phase: 5 / 8 financial presentation
- Evidence: dashboard, transactions, and reports each implement their own `normalizeDecimal`; `formatCurrency` converts decimal strings to JavaScript `number` before Intl formatting.
- Impact: current PostgreSQL `numeric(14,2)` values are bounded and generally safe, but the repeated conversion path creates avoidable precision risk for large monetary values and makes future behavior drift likely.
- Planned smallest fix: centralize the existing two-decimal normalization/formatting behavior without changing database representation or authoritative SQL aggregation. Add focused checks for zero, negative balances, large values, and two-decimal amounts.
- Verification: focused unit-like runtime checks for currency helpers plus lint/typecheck.

### P3-001: Accessibility and visual polish are inconsistent in legacy auth surfaces

- Phase: 3
- Evidence: `app/register/page.tsx` duplicates the auth shell pattern, uses a decorative `N` mark while other auth surfaces differ, and its alert containers are less consistent than the shared shell. This is not blocking functionality.
- Impact: minor inconsistency only.
- Planned fix: defer until P1/P2 behavior is stable; do not redesign the application during this audit.

## Phase Checklist

### Phase 1: Architecture

- PASS: App Router structure, shared Supabase server/browser utilities, shared business access helper, server actions, and route proxy are present.
- BUG: Root route remains scaffold content instead of the application entry flow (P1-001).

### Phase 2: Database, RLS, and storage

- PASS by inspection: public profiles, businesses, categories, and transactions have intended keys, foreign keys, checks, timestamp triggers, and RLS policies.
- PASS by inspection: transaction category/business/type trigger and category deletion `ON DELETE SET NULL` preserve transaction history.
- PASS by inspection: storage policies require the financial-documents bucket and an owned business UUID path.
- NEEDS RUNTIME VERIFICATION: SQL checks require a disposable/local Supabase database and have not been executed here.
- NEEDS IMPROVEMENT: category uniqueness is not enforced at the database boundary (P2-001).

### Phase 3: Authentication

- PASS by inspection: registration, login, logout, password recovery/reset, safe redirect validation, cookie session refresh, and friendly auth errors are implemented.
- PASS by inspection: protected route proxy redirects unauthenticated requests.
- NEEDS RUNTIME VERIFICATION: actual Supabase auth/session persistence and expired-session behavior.

### Phase 4: Business onboarding

- PASS by inspection: one-business-per-owner unique index, authenticated ownership check, duplicate handling, default-category trigger, and post-create verification are implemented.
- NEEDS RUNTIME VERIFICATION: trigger/default-category behavior against the target database.

### Phase 5: Dashboard

- PASS by inspection: dashboard RPCs scope by `auth.uid()` ownership, use date-only boundaries, aggregate income/expense separately, and calculate balance with cent-safe subtraction.
- NEEDS RUNTIME VERIFICATION: controlled values and boundary dates against live SQL/RPCs.
- NEEDS IMPROVEMENT: duplicated money normalization path (P2-002).

### Phase 6: Transactions

- PASS by inspection: create/update/delete actions authenticate, derive the owned business, validate input and category compatibility, scope by business and ID, and revalidate dashboard/reports/transactions.
- PASS by inspection: filters, search escaping, sorting, pagination boundary correction, mobile history, and pending submit states exist.
- NEEDS RUNTIME VERIFICATION: end-to-end CRUD, duplicate submissions, filters plus pagination, and RLS isolation.

### Phase 7: Categories

- PASS by inspection: CRUD, search/type filtering, transaction counts, compatibility validation, safe category deletion, and transaction revalidation exist.
- BUG: duplicate category prevention is race-prone without a database uniqueness constraint (P2-001).
- NEEDS RUNTIME VERIFICATION: delete-with-history and concurrent duplicate behavior.

### Phase 8: Reports

- PASS by inspection: reports page, date/custom ranges, comparison, time series, category breakdown, largest expenses, empty states, and ownership-scoped RPCs are implemented.
- PASS by inspection: report mutation paths are revalidated by transaction/category actions.
- NEEDS RUNTIME VERIFICATION: report SQL/RPC results, boundary dates, all-time empty state, and cross-business isolation.
- NEEDS IMPROVEMENT: shared money normalization should be centralized (P2-002).

## Security Review Before Fixes

- Authentication: no bypass identified by static inspection; server actions call `auth.getUser()`, and proxy refreshes/validates claims.
- Authorization: actions derive business ownership through `getOwnedBusinessesForUser`; client-supplied business IDs are not used as authority.
- RLS: intended SELECT/INSERT/UPDATE/DELETE policies exist for the four public tables and storage objects. Runtime proof is pending.
- Server actions: validation precedes writes; transaction category compatibility is checked both in application code and a database trigger.
- Ownership: transaction/category queries and mutations include the owned business ID; RLS independently checks ownership.
- Storage: no application storage code was found; migration policies are scoped to `financial-documents` and business-prefixed object paths.

## Financial Integrity Before Fixes

- PostgreSQL amounts use `numeric(14,2)` and positive checks.
- SQL totals use database `sum`, with null totals coalesced to zero.
- Balance subtraction uses integer cents via `BigInt`.
- Category deletion uses `ON DELETE SET NULL`, so transaction rows remain.
- Controlled live-database calculations and dashboard/report comparisons remain unverified until Supabase is available.

## Planned Fix Order

1. Fix the root route integration (P1-001).
2. Add the smallest database-enforced category uniqueness boundary and friendly conflict handling (P2-001).
3. Centralize money normalization/formatting and add focused checks (P2-002).
4. Re-run lint, TypeScript, migration checks, and production build after resolving the active dev-server lock safely.
5. Run available application and database regression flows; report any remaining runtime limitations without claiming unavailable Supabase tests passed.

## Remaining Audit Limits

- No Supabase local/remote database connection was exercised during the read-only audit.
- No browser automation tool was available in the loaded tool set for this pass; responsive and keyboard checks remain code-inspection findings until a browser session is run.
- No Phase 8 feature expansion is planned; the audit preserves the already-present reports implementation.

## Runtime Verification

Runtime verification date: 2026-08-19

### Environment inspection

- Local Supabase configuration: NOT AVAILABLE. No `supabase/config.toml` exists.
- Supabase CLI: NOT AVAILABLE on PATH.
- Docker: NOT AVAILABLE.
- PostgreSQL client/database URL: NOT AVAILABLE.
- Seed scripts/test users: NOT AVAILABLE.
- Existing SQL verification scripts: PRESENT under `supabase/tests/`; they require a disposable/local database and rollback at the end.
- Configured remote endpoint: reachable at the network layer, but a read-only REST request returned `401`. No writes were attempted.

### Database migrations

NOT VERIFIED. The migration files were statically reviewed, including the category uniqueness migration, foreign keys, `ON DELETE SET NULL`, numeric precision, triggers, and policies. They were not applied because no safe disposable database target exists.

### RLS isolation

NOT VERIFIED. The SQL test scripts define User A/User B scenarios, but execution requires a disposable PostgreSQL/Supabase environment. No production or remote writes were attempted.

### Authentication

NOT VERIFIED at Supabase runtime. Application-level unauthenticated route redirects were smoke-tested successfully against the built server. Sign-up, sign-in, session persistence, expiry, and invalid credentials require usable Supabase auth access and test accounts.

### Transaction CRUD

NOT VERIFIED against the database. The application actions and validation were statically reviewed; no controlled transactions were created or changed.

### Category CRUD

NOT VERIFIED against the database. The uniqueness migration was reviewed but not applied, and no concurrency test was attempted.

### Financial calculations

NOT VERIFIED against live SQL/RPC results. The SQL aggregation and cent-safe application arithmetic were statically reviewed; no controlled financial dataset was loaded.

### Date handling

NOT VERIFIED against database/runtime timezone boundaries. Date-only handling was reviewed in code, but no boundary transactions were created.

### Revalidation

NOT VERIFIED with persisted mutations. Built-server unauthenticated routing passed; authenticated mutation-to-dashboard/report refresh requires a usable test account and database.

### Security/IDOR testing

NOT VERIFIED at runtime. Static review found business-scoped queries, ownership checks, RLS policies, and report RPC ownership scoping. Cross-business ID substitution was not executed against a database.

### Runtime blockers and required next step

No runtime failure was observed because the required runtime suite could not safely start. The missing prerequisites are a disposable Supabase project or local Supabase stack, Supabase CLI/Docker or a PostgreSQL client, migration access, and disposable test users. The configured remote project must not be used for destructive tests unless its disposable status is explicitly confirmed.

Final status: **NOT READY FOR PHASE 8 SIGN-OFF**
