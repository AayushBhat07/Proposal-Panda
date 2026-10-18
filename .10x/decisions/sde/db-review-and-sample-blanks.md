# DB review fixes and sample blanks (2026-10-18)

Built from reviews/2026-10-18-db-code-quality-review.md.

- Stored tender/bid types: one definition in lib/tenders/pipeline.ts, used by the schema (`.$type<>()`), repo,
  `fetchRegister` and the register/dashboard pages.
- `isStage` (own keys only) replaces `in STAGE_LABELS`, which accepted "toString".
- `withPermission(permission, handler)` in lib/auth/server.ts wraps every route except audit GET (its permission
  depends on the query). UserInputError → 400 lives there now.
- One browser fetch helper (`officeFetch` in lib/data/api.ts); the vault backend uses it with `allow404`.
- Vault actions in lib/vault/actions.ts; `AccessLog.add` takes only action and detail.
- Bid page shows the real load error instead of "not analysed in this browser".
- "Fill all with sample data" on the blanks panel (outside production only): `fillSampleBlanks` in
  lib/company/sample.ts. With the vault unlocked it also attaches vault certificates on the checklist.
  Sample fills are not saved as the office's remembered answers.

Skipped on purpose: the optional in-vault log mode stays (vault.test.ts covers it); the browser import stays in
OnboardingContext, because the company file has to be read after the import finishes; no shared load hook for the
four pages.
