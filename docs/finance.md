# Turtle Jr. Finance

## Scope and approval

Turtle Jr. Finance modernizes the authenticated `/budget` application while preserving its existing per-user budget JSON. The product brief remains in the workspace-level `FINANCE_PLAN.md`.

Milestone 0 (read-only audit) was completed on 2026-10-18. The user approved Milestone 1 on 2026-10-18, then separately authorized the reviewed additive migration against the single database shared by development and production. Milestone 1 is complete. The user approved Milestone 2 source implementation and then separately authorized its reviewed additive migration on 2026-10-18. Milestone 2 is complete. The user approved Milestone 3 on 2026-10-18; its local-only savings advisor is complete and required no database change. The user approved Milestone 4 source implementation and then separately authorized its reviewed additive migration on 2026-10-18. Milestone 4 is complete. The user approved Milestone 5 on 2026-10-18; the integrated overview, history, weekly check-in, and final validation are complete. Authentication and infrastructure changes remain unauthorized.

V1 remains manual-only. Bank connections, imports, live rates, transfers, investments, debt modeling, AI advice, and unrelated redesigns are out of scope.

## Architecture

- Canonical route: `/budget`, protected by the existing Clerk proxy. The visible product label is Finance so bookmarks and auth routing remain compatible.
- Existing budget: `Budget.userid` plus `Budget.budgetItems` JSON. It remains unchanged in storage but is no longer rendered in Turtle Jr. Finance.
- Account persistence: `FinanceAccount`, scoped by Clerk `userId`, limited by validation to checking and savings, and archived instead of deleted.
- Balance persistence: `FinanceBalanceSnapshot`, with integer `BIGINT` cents, local ISO as-of date, UTC recording time, and user/account ownership.
- Corrections: the original snapshot receives `correctedAt`; a new snapshot points to it with `replacesSnapshotId`. Current-balance calculations ignore corrected rows. No historical row is overwritten or deleted.
- Server boundary: all reads derive Clerk `userId`; all mutations combine the authenticated user with the target record ID and validate parent-account ownership.
- UI boundary: Prisma `bigint` values are serialized as decimal strings. The browser never receives raw Prisma records or a selectable user ID.

Because Prisma is configured with `relationMode = "prisma"`, ownership is enforced explicitly in application queries. The schema also uses a composite account/user relation to prevent accidental cross-user association through Prisma.

## Money and date rules

- Persisted USD amounts use integer cents. User input accepts plain decimal dollars with at most two fractional digits and no exponent or thousands separators.
- The current implementation permits negative balances because checking accounts can be overdrawn; it rejects malformed and excessively large amounts.
- Local financial dates use strict `YYYY-MM-DD` strings so a balance date does not move across time zones. Audit timestamps use UTC `DateTime` values. Future-dated balance snapshots are rejected because snapshots represent actual observations, not forecasts.
- Total tracked cash is the sum of each active account's latest non-corrected snapshot. It is an actual snapshot total, not income, spending, interest, or forecast surplus.
- A snapshot is current by latest as-of date, then latest recording timestamp. Same-date corrections therefore select the replacement while retaining the old row.

Goal amounts and contributions use integer cents. Goal allocations are labels on existing savings balances, not transactions or separate cash, and growth simulations are hypothetical estimates rather than actual balance history.

## Milestone status

- [x] Milestone 0: repository audit and proposal.
- [x] Milestone 1: account/snapshot foundation — source, validation, and shared-database migration complete.
- [x] Milestone 2: budget upgrade — source, validation, and shared-database migration complete.
- [x] Milestone 3: savings advisor — source and validation complete; no migration required.
- [x] Milestone 4: goals and simulator — source, validation, and shared-database migration complete.
- [x] Milestone 5: dashboard and weekly check-in — source and final validation complete; no migration required.

## Milestone 1 source changes

- Added additive Prisma account/snapshot models and an unapplied migration file.
- Added exact money parsing/formatting, date/input validation, ownership selectors, current-snapshot selection, authenticated data loading, and server actions.
- Added responsive account management, dated balance recording, preserved corrections, current cash totals, last-updated disclosure, and retained legacy budget UI.
- Added focused Node tests through `npm run check:finance` without adding a dependency.

## Data preservation and migration

Migration `20261018190000_finance_accounts` was applied successfully to the single PostgreSQL database shared by development and production on 2026-10-18. A follow-up `prisma migrate status` reported that the database schema is up to date. The migration created only the Finance enum, account table, snapshot table, and indexes; it did not read, update, migrate, or delete `Budget` rows.

Existing budget entries remain ambiguous between planned recurring items and actual transactions. Their conversion is deferred to Milestone 2 and must begin with a dry-run validation report. The legacy JSON must remain available until the user verifies any later conversion.

Milestone 2 migration `20261018210000_finance_budget` was applied successfully to the shared PostgreSQL database on 2026-10-18. A follow-up status check reported that the database schema is up to date. It created only plan/transaction enums, `FinancePlanItem`, `FinanceTransaction`, and supporting indexes. It did not alter or copy existing `Budget` rows. The existing ledger remains visible and functional; no legacy conversion has begun, so no dry-run or legacy data write occurred.

Milestone 4 migration `20261018230000_finance_goals` was applied successfully to the single shared development/production PostgreSQL database on 2026-10-18. A follow-up `prisma migrate status` reported that the database schema is up to date. The migration created only the `FinanceGoalKind` enum, `FinanceGoal` table, and indexes; it contained no legacy reads, copies, updates, or deletes.

## Milestone 2 budget rules

- Planned income, bills, and discretionary allowances are normalized records linked to an authenticated user's active account. Amounts are positive integer cents; kind determines their forecast sign.
- Supported recurrence is weekly, every 14 days, twice monthly, monthly, quarterly, and yearly. Forecasts generate dated occurrences rather than multiplying by approximate monthly factors.
- Weekly and biweekly schedules use their start date as the anchor. Monthly and quarterly schedules retain the original day and clamp to the month's final day. Yearly February 29 schedules clamp to February 28 in non-leap years.
- Twice-monthly schedules require two distinct days from 1–31. Each day clamps to month-end; when both clamp to the same date, only one occurrence is generated.
- The displayed projected surplus covers the next 30 calendar days: planned income minus planned bills and allowance. It is an estimate, not actual savings.
- Optional recorded transactions are separate from the plan. Income and expense contribute to recorded net cash flow; transfers between owned accounts are tracked but excluded from income, expense, and net cash flow.
- Transaction edits remain user-scoped. Voiding retains the row and excludes it from active results. Transactions do not rewrite balance snapshots; manual snapshots remain the authority for actual account balances.
- Accounts with active planned cash-flow items cannot be archived until those items are archived, preventing dangling active forecasts. Historical transactions remain retained when an account is archived.

## Milestone 3 advisor rules

- The advisor is an in-browser scenario tool. It does not persist APYs or advisor inputs, call external services, recommend products, initiate transfers, or alter account balances.
- It uses the selected checking account's current manual balance and exact dated planned occurrences over a selectable 14-, 30-, 60-, or 90-day horizon. Only plan items assigned to that account are included.
- Undated additional bills and allowance are reserved at the start of the horizon. Undated additional receipts are included only in the projected ending balance and never increase the safe-transfer figure.
- The projected low is the minimum balance across the dated cash-flow path after the conservative undated outflow reserve. The maximum scenario transfer is `max(0, projected low - safety buffer)`, but remains zero until the user confirms that the schedule and known items have been reviewed. A projected shortfall also forces it to zero.
- The calculated transfer is hypothetical and does not count as income, expense, savings, or new wealth. It guarantees only that the entered known scenario does not fall below the entered buffer; incomplete, omitted, or changing obligations remain the user's uncertainty.
- Manual APY input supports 0% through 100% with up to four decimal places. APY is treated as effective annual yield: `ending = principal × (1 + APY)^(days / 365)`. No additional deposits are modeled and the final value is rounded once to the nearest cent.
- APY comparisons disclose that results are illustrative, rates can change, taxes and fees may apply, liquidity and withdrawal terms vary, and deposit protection depends on the institution, ownership, and applicable limits.

## Milestone 4 goal and simulator rules

- Active goals are user-owned records linked to an active savings account. Purposes are emergency fund, purchase, or general savings; target, current allocation, and planned monthly contribution use integer cents.
- An allocation only earmarks part of the account's latest known balance. It does not change snapshots, create a transaction, count as spending, or create additional wealth.
- Create and update actions authenticate the caller, scope every goal and account query by that Clerk user ID, require a savings account, and use a serializable transaction. The sum of active allocations cannot exceed the selected account's latest non-corrected balance at write time.
- A later balance decrease can make prior allocations exceed the account balance. The UI reports that explicitly rather than silently changing allocations. Accounts with active goals cannot be archived.
- Progress is allocated cents divided by target cents. Completion without growth is estimated as `ceil((target - allocation) / monthly contribution)` months; zero contribution produces no estimated date, and month-end dates clamp to the destination month's final day.
- The growth simulator remains in-browser and unpersisted. It treats the entered annual rate as effective annual yield, derives the equivalent monthly rate, assumes end-of-month contributions, keeps principal/contributions separate from estimated interest, and rounds the final balance once to the nearest cent.
- The simulator is labeled hypothetical and is not a stock-return forecast, guarantee, recommendation, or financial directive. It does not alter goals, balances, or transactions.

## Milestone 5 overview and check-in rules

- The overview labels snapshot balances and comparable balance changes as actual, the exact dated 30-day cash-flow surplus and savings rate as estimated, emergency-goal coverage as earmarked, and advisor/simulator outputs as hypothetical scenarios.
- Checking, savings, and total cash use only each active account's latest non-corrected snapshot. Missing balances and balances more than 14 days old are disclosed in the weekly check-in.
- Cash history is built from dated, non-corrected snapshots. At each displayed date it sums the latest balance known on or before that date for each currently active account. The chart is limited to the latest 24 aggregate points from the 60 snapshots retained per account in the page payload.
- An actual balance change is shown only when a prior aggregate point contains the same set of accounts as the latest point. It is described as an unexplained balance difference and never attributed to savings, spending, transfers, or interest.
- Projected savings rate is `30-day planned surplus / 30-day planned income`; it is unavailable when planned income is zero. Emergency reserve coverage is total allocation divided by total target across active emergency goals.
- Weekly check-in reuses the authenticated snapshot action to record an actual account balance and date. It also surfaces upcoming 30-day bills and current goal allocations without requiring daily activity or transaction logging.
- No new persistence, schema, migration, analytics, notification, external service, authentication, or infrastructure change was introduced in Milestone 5.

## Validation record

Completed on 2026-10-18 without running a migration or querying financial records:

- Prisma schema formatting and local client generation passed with Prisma 6.12.0.
- `npm run check:finance`: 6 tests passed, covering exact cents, malformed and negative values, leap/invalid/future dates, validation, ownership query construction, corrected history, and current-snapshot selection.
- Targeted ESLint, full `npm run lint`, and full TypeScript `tsc --noEmit` passed.
- `npm run build` passed with Next.js 16.4.0; `/budget` remains dynamically server-rendered behind the existing proxy.
- VS Code problem inspection reported no Prisma schema errors.
- `prisma migrate deploy` applied `20261018190000_finance_accounts` successfully to the shared database; a subsequent status check reported no pending migrations.
- Milestone 2: Prisma formatting/generation and schema validation passed; `npm run check:finance` passed 12 tests; full ESLint, TypeScript, Next.js production build, and VS Code diagnostics passed.
- `prisma migrate deploy` applied `20261018210000_finance_budget` successfully to the shared database; a subsequent status check reported no pending migrations.
- Milestone 3: `npm run check:finance` passed 15 tests, including conservative transfer boundaries, incomplete-schedule and shortfall behavior, APY parsing, effective-yield math, and final-cent rounding. Full ESLint, TypeScript, Next.js production build, and targeted VS Code diagnostics passed. No schema, migration, database query, dependency, or configuration change was made.
- Milestone 4 source: Prisma formatting, local client generation, and schema validation passed. `npm run check:finance` passed 18 tests, adding goal validation, month-end completion estimates, principal/contribution separation, zero-rate behavior, and effective-yield math. Full ESLint, TypeScript, Next.js production build, manifest asset verification, diff checks, and targeted VS Code diagnostics passed. No migration or financial-record query was run.
- `prisma migrate deploy` applied `20261018230000_finance_goals` successfully to the shared database; a subsequent status check reported all 12 migrations applied and the database schema up to date.
- Milestone 5: `npm run check:finance` passed 20 tests, adding corrected-snapshot exclusion, multi-account history aggregation, comparable-account change guards, projected savings-rate handling, and emergency coverage. Full ESLint, TypeScript, Next.js production build, diff checks, and targeted VS Code diagnostics passed. Static review confirmed labeled inputs, contextual button names, keyboard-native controls, responsive breakpoints, text status cues, authenticated loaders/actions, and per-user mutation ownership checks.
- The replacement PWA artwork was inspected and 192px/512px transparent and maskable derivatives were regenerated from the user-provided source files. Manifest references and intrinsic dimensions were verified. An unauthenticated rendered-page check confirmed the protected `/budget` route redirects without exposing Finance data; authenticated visual inspection remains a manual user check.

## Known issues and next step

- No Finance database integration test is available without a separately authorized isolated test database. Ownership is covered by narrow query construction tests and code review; production data is never used for tests.
- Archived accounts and their snapshots are retained but no unarchive UI is included in Milestone 1.

All approved Turtle Jr. Finance V1 milestones are complete. Future work, including legacy-ledger conversion, unarchive tooling, additional account types, bank connections, or other post-V1 scope, requires a new explicit approval.

On 2026-10-19, the user approved removing the legacy ledger from the Finance interface. Its persisted JSON and dormant component remain untouched; only the page rendering was removed. The Finance desktop header was also aligned with the Health page's stacked accent-eyebrow and main-heading layout.
