# Kinetix progress

## Baseline (2026-11-24)

- Frontend (`cd frontend && npx vitest run`): 898 files, 10101 tests, all pass, 0 failing.
- API (`cd api && npm test`): 1084 tests, all pass, 0 failing.
- No already-failing tests. "Green" = every test in this baseline passes, plus all new tests.

## Tasks

- [x] 0.1 Run-control docs and test baseline — 9a09952 — frontend vitest + api npm test (baseline above) — frontend vitest + api npm test (baseline above)
- [x] 0.2 Remove upstream-only CI and dependency bots — 4d33c8c — frontend vitest + api npm test
- [x] 0.3 Rebrand the visible name to Kinetix — 5b2c02e — rebrand --check, frontend vitest, native localizations, locales, source strings, api npm test
- [ ] 0.4 Playwright E2E harness — in progress (run locally: `PW_CHROMIUM=$HOME/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome npm run e2e` in frontend/; `npx playwright install` does not work on this Ubuntu 26.04)

## Local environment notes

- Playwright 1.56.1 cannot download Chromium on this OS. Set `PW_CHROMIUM` to a local Chromium binary to run `npm run e2e`.
