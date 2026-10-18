# Code quality review: local database (#29 to #33)

Range reviewed: `3258514..3aacc49` (82 files, +5.7k / -1.7k, mostly lockfile and drizzle snapshots).
Verdict: **not approved as-is.** The core is sound. SQLite + Drizzle, small repos, a server that is the authority
on sessions, and a sealed vault the server can't read are all the right calls. No file crossed 1k lines. But the
change moved storage without settling the **data contract**, so the same shapes are now typed four ways and cast
across every boundary. That is the main thing to fix. The rest is a handful of copy-pasted patterns worth folding.

## 1. One stored-tender contract, not four (structural, highest priority)

`StoredReport` / `StoredBid` are now defined in four places:

- `lib/db/repos/tenders.ts:8-9`: `{ id; fileName; uploadedAt } & Record<string, unknown>`
- `lib/tenders/pipeline.ts:30,50`: the real interfaces the dashboard uses
- `app/(main)/register/page.tsx:36`: a third local interface
- `app/(main)/tenders/[id]/bid/page.tsx:54`: `FoundationBid & { id: string }`

The symptoms follow from that:

- `lib/data/api.ts` uses `fetchRegister<R, B>()` and `fetchTender<R, B>(id)`, so every caller picks its own
  types and nothing checks they agree.
- `app/api/bid/generate/route.ts:632` needs `getTender(...)?.report as unknown as IntelligenceReport`.
- `app/api/tenders/[id]/route.ts:35` digs into `report.summary` through `as { metadata?: ... }`.

**Code judo:** define `StoredReport = IntelligenceReport & { id; fileName; uploadedAt }` and
`StoredBid = FoundationBid & { id }` once (`lib/tenders/pipeline.ts` already owns the concept). Type the Drizzle
columns with `.$type<StoredReport>()` / `.$type<StoredBid>()`, and drop the generics from `fetchRegister` /
`fetchTender`. The cast in the bid route, the shape-digging in PATCH, the register page's private interface and
`as StoredReport` in the repo all go away. Behaviour doesn't change.

## 2. Stage validation is duplicated, and it accepts prototype keys (boundary)

`body.stage in STAGE_LABELS` appears in both `app/api/tenders/[id]/route.ts:26` and `app/api/import/route.ts:62`.
`in` walks the prototype, so `"toString"`, `"constructor"` and `"__proto__"` all pass and get stored as a stage.
Add `isStage(x): x is Stage` (via `Object.hasOwn`) next to `STAGE_LABELS` and use it in both places, and type the
`stage` column as `Stage | null`. Then `stages as Record<string, Stage>` in the dashboard goes too.

## 3. Every route hand-rolls the same guard (spaghetti by repetition)

There are 20 copies of `const auth = await requirePermission(...); if (auth instanceof NextResponse) return auth;`,
most followed by `request.json().catch(() => ({}))`. Both users routes also repeat
`try { ... } catch (e) { if (e instanceof UserInputError) return 400; throw e; }`.
One wrapper, `withPermission(permission, (req, user, ctx) => ...)`, that does the auth check, maps
`UserInputError` to 400 and hands over the parsed body would cut most handlers to their real work. The
`Session | NextResponse` union return type would disappear from the API surface with it. This is the one new
abstraction I'd add, because it deletes more than it introduces.

## 4. Two copies of the browser fetch helper

`lib/data/api.ts:6` (`call`) and `lib/vault/serverBackend.ts:13` (`call`) are the same function with the same
error string, except the vault one lets 404 through. Keep one in `lib/data/api.ts` with an `allow404` option (or
return `undefined` on 404), and have the vault backend import it.

## 5. The vault action list and the access-log contract leak (boundary)

- The action names exist twice: `VAULT_ACTIONS` in `lib/db/repos/audit.ts:10` and the `AccessEntry['action']`
  union in `lib/vault/vault.ts:462`. Put one `as const` array in a shared module and derive the type from it.
- `AccessLog.add` takes a full `AccessEntry`, but the server ignores `at` and `by`. That's why
  `lib/vault/vaultStore.ts:630` sends `{ at: '', by: '', action: 'moved to server' }`, a fake entry made up to
  fit the type. Narrow `add` to `{ action, detail? }` and let the in-vault log stamp `at` and `by` itself.
- `vaultSession(..., accessLog?)` keeps an optional mode where the log is sealed inside the vault. The app
  now always passes `serverAccessLog`, so that branch only serves `tests/vault.test.ts`. Make the parameter
  required and give the test an in-memory `AccessLog`. Then the fallback mode goes away.

## 6. The browser-data import sits inside the company-profile provider (wrong layer)

`lib/context/OnboardingContext.tsx` now calls `importBrowserData()` before it loads the company file. That puts a
one-time migration of all browser data inside a provider whose job is one record. The obvious home,
`app/AppInitializer.tsx`, was deleted in this same change. Run the import once after sign-in from the auth layer
or a small initializer, and let `OnboardingContext` go back to fetch and save only.

On the server side, `app/api/import/route.ts` is five bespoke branches with their own validation. Each branch
re-does what the normal write path already checks (stage validity, tender id, bid shape). After #1 and #2 it
should call the same validators as the regular routes. Since it is meant to be deleted eventually, give it a
removal note (e.g. "delete once no office has pre-database data") so it doesn't become permanent.

## 7. Four pages reimplement the same load/error/spinner state machine (legibility)

The dashboard, register, analysis and bid pages each wire `useEffect` + `useState(data)` + `useState(error)` +
spinner/alert by hand, and each handles failure differently. The bid page swallows a failed `fetchTender` with
`.catch(() => null)`, so "server down" shows up as "tender not found". A tiny `useOfficeData(fetcher, deps)`
returning `{ data, error, reload }` would make all four the same and give the bid page an honest error.

## Smaller notes

- `app/api/auth/me/route.ts` reads the cookie twice and the user row twice. If `getCurrentUser` returned the row
  as well, the "re-issue if name or role changed" check could reuse it.
- `app/api/intelligence/run/route.ts:686` spreads `...result.report` after `id`, `fileName` and `uploadedAt`, so
  a report field could silently override them. Spread first and put the stamped fields last.
- `saveBid` (`repos/tenders.ts:75`) checks `tenderExists` before an upsert, but the foreign key already enforces
  that. It's harmless, just a second query.
- Saved answers get merged three times: in the repo, in the import route's "fresh only" filter, and again in the
  bid page before the server reply. The repo merge is enough; the page can just take the server's answer.

## What's good

Synchronous better-sqlite3 transactions where they matter (`addTender`). `session_version` revocation. The
last-active-Admin guard. The file `Content-Type` comes from the checked extension, not the browser. The header-last
vault move is a nice retry-safe ordering. And moving the vault keeps it zero-knowledge.

Suggested order: #1 and #2 together (one PR, types only, with a test for prototype keys), then #3 and #4, then #5
and #6. #7 can go whenever someone next touches those pages.
