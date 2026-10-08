# MVP verification plan

This plan converts the approved Phase 0 acceptance criteria into checks at the layer that can prove each behavior. Unit tests cover deterministic calculations, PostgreSQL integration tests cover persistence, transaction boundaries, permissions, and races, and Playwright exercises workflows through the running application. Tests use isolated fixture stores and synthetic data; no production data or runtime secret values belong in fixtures.

## Fixtures and execution

- Use the dedicated test PostgreSQL database configured by `DATABASE_URL`; never run destructive setup against a non-test database. Reset only test-owned fixtures between integration tests.
- Seed two stores with separate Owner and Staff memberships, one owner-controlled second-store fixture, hamburger recipes, inventory, tables, and facilities. Generate credentials during setup or use an explicitly documented test-only credential source; do not commit runtime secrets.
- Exercise handlers/services with the same authentication and membership checks as production. Avoid test-only authorization bypasses. E2E may use the local seeded account, with credentials supplied through environment variables.
- Run the actual browser application for E2E. A reachable port by itself is not a passing functional check.
- Prefer black-box assertions on persisted state and API/UI results. Verify both the ledger and cached balances where applicable.

## Unit checks

- Money and daily sales: 10 × 10,000 − 5,000 discount − 10,000 refund = 85,000; subtract 50,000 operating expense to get 35,000 estimated operating profit. Ensure a sale is not added again as a manual income transaction.
- Purchase suggestions: stock 18, minimum 20, target 60, pack 20 recommends 60; 40 outstanding units reduce the next suggestion to 20. Stock exactly at the minimum still triggers a suggestion.
- Reservation interval semantics: `[start,end)` means end exactly at the next start is allowed; a true overlap is rejected; party size above capacity cannot be assigned.
- State and validation rules: reject negative receipt/count values, over-refunds, over-receipts, invalid transitions, and unauthorized role actions.

## PostgreSQL integration checks

### Identity and store scope

- Owner can access the active store; inactive membership or inactive account revokes access even with a previously issued session.
- Login session cookie is HttpOnly and SameSite protected; mutations without valid same-origin/CSRF protection are rejected. Repeated failed logins are rate limited.
- Invitation tokens are stored hashed, expire, and can be accepted only once. Role or membership revocation takes effect on the next request despite a still-valid signed session cookie.
- Staff cannot read or mutate finance/sales data when prohibited by the approved role matrix. Facility responses for Staff omit repair costs.
- A user from Store A cannot read or mutate Store B resources by substituting IDs. Check reads and writes, including nested IDs such as inventory, tables, and purchase orders.
- Attempt cross-store linking through nested ownership fields (recipe ingredient, order supplier/item, reservation table, and maintenance facility); each must fail without changing either store.

### Inventory and daily sales

- Receive 2,000 units, record 300 used and 100 wasted: balance and ledger sum are 1,600. Count 1,500: record a -100 adjustment and reason; balance and ledger sum are 1,500.
- Sell 20 hamburgers with 1 unit each of bun and patty: both balances fall from 100 to 80. Repeating the same submission leaves both at 80.
- Correct the daily quantity to 25: balances become 75. Repeating the correction request leaves them at 75 and creates no duplicate ledger event.
- Reusing an idempotency key with a changed payload returns a conflict and does not overwrite the original event.
- Freeze the recipe snapshot on sale; adding a new recipe version does not change historical usage or stock effects.
- Refund a cooked hamburger: revenue decreases by the refund amount while inventory stays unchanged.
- Record prior-day sales after the day boundary: revenue belongs to the prior business date. After a count close, a past-day quantity change must require reconciliation and must not silently rewrite inventory.
- Refund a prior-month sale in the current month: the original sale stays in its business month and the refund is reported in the month the refund occurred.
- Submit simultaneous duplicate sales/count operations and assert one effective event and ledger/balance agreement.

### Purchasing

- With 18 in stock, minimum 20, target 60, pack 20: recommend 60. A submitted outstanding order of 40 changes recommendation to 20.
- Submit an order of 100, receive 40, then 60: status progresses through Partially Received to Received and inventory increases by exactly 100.
- Retry the same receipt idempotency key: no added inventory or receipt rows. Reject cumulative over-receipt and edits to submitted order lines.

### Reservations

- Reject overlapping active reservations on one table; permit adjacent intervals where one ends exactly as the next begins.
- Reject assignment beyond capacity and use of another store's table. Cancel a reservation and allow a new reservation in the released interval.
- Run concurrent conflicting reservation inserts and assert at most one succeeds. This is a required concurrency check, not a sequential approximation.

### Facilities and finance

- Staff can report an issue; Owner can progress and complete the repair with a 50,000 expense. Repeating completion cannot create a second expense.
- Verify finance calculations from the accepted example: 100,000 income − 5,000 − 10,000 = 85,000 recorded net; after 50,000 operating cost, estimated operating profit is 35,000. Ensure repair costs are included once in the relevant ledger aggregation.
- Staff API payloads do not expose repair cost or finance amounts.

## Playwright end-to-end checks

At a 360px viewport, use the real browser to log in as Owner and complete a coherent flow: enter a daily sale, observe the inventory deduction, open the purchase recommendation and receive stock, create a reservation, record a repair and cost, then confirm the dashboard reflects the resulting data. Assert visible state and API-backed persisted effects at key transitions. Also verify Staff access restrictions in browser where the navigation exposes those surfaces.

## Reporting

Report test counts and status by unit, PostgreSQL integration, and Playwright suites. Keep passed, failed, skipped, and unrun checks distinct. A blocked database/browser prerequisite is a blocker, not a pass. Preserve failing assertions and coordinate product defects with the implementation owner rather than weakening tests.
