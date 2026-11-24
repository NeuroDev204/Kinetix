# Kinetix progress

## Baseline (2026-11-24)

- Frontend (`cd frontend && npx vitest run`): 898 files, 10101 tests, all pass, 0 failing.
- API (`cd api && npm test`): 1084 tests, all pass, 0 failing.
- No already-failing tests. "Green" = every test in this baseline passes, plus all new tests.

## Tasks

- [x] 0.1 Run-control docs and test baseline — 9a09952 — frontend vitest + api npm test (baseline above) — frontend vitest + api npm test (baseline above)
- [x] 0.2 Remove upstream-only CI and dependency bots — 4d33c8c — frontend vitest + api npm test
- [x] 0.3 Rebrand the visible name to Kinetix — 5b2c02e — rebrand --check, frontend vitest, native localizations, locales, source strings, api npm test
- [x] 0.4 Playwright E2E harness — f3d9804 — vitest, api npm test, e2e smoke (run locally: `PW_CHROMIUM=$HOME/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome npm run e2e` in frontend/; `npx playwright install` does not work on this Ubuntu 26.04)

## Local environment notes

- Playwright 1.56.1 cannot download Chromium on this OS. Set `PW_CHROMIUM` to a local Chromium binary to run `npm run e2e`.

## Phase 1: AI routing (kinetix/p1-routing)

- [x] 1.1 Provider-aware credentials and routing config — 81e452e — api npm test (+ frontend vitest)
- [x] 1.2 Router module — 165a76b — api npm test, check-core-loadable
- [x] 1.3 Route and fall back in the job runner — 8a04580 — api npm test
- [x] 1.4 Image/video input for the Gemini adapter — 58260d7 — api npm test
- [x] 1.5 Setup and smoke scripts — cce4e0d — api npm test; real smoke run once (see below)

Real smoke, phase 1 (`KINETIX_REAL_AI=1 node api/scripts/kinetix-smoke.mjs`):
- FAIL compatible-text unreachable (laptop Ollama not reachable from this machine; expected)
- FAIL gemini-vision timeout (gemini-3.8-flash answered HTTP 503 to a direct call; the adapter retried until its budget ran out)
- [x] 2.8 E2E flows — 2 for this run; 5 E2E specs pass (meals, onboarding, review, routing, smoke)

## Phase 3: live English PT (kinetix/p3-live)

- [x] 3.1 Live token endpoint — 8764113 — api npm test, frontend vitest
- [x] 3.2 Live protocol (pure) — 9a332e4 (committed with 3.3) — frontend live tests
- [x] 3.3 Audio I/O — 9a332e4 — live tests, build
- [x] 3.4 Live session with turns — 53e4c53 — live tests, build
- [ ] 3.5 Native voice audio session — JS done (voice-session.js, speak guard); Swift part blocked, see docs/BLOCKERS.md
- [x] 3.6 Voice tools, persona and Talk button — ca6986c — frontend vitest, locales, build
- [x] 3.7 English log and summary job — f76915f — api npm test, frontend vitest, locales
- [x] 3.8 E2E live trainer — channel only (see ledger); 5 E2E specs pass

## Phase 4: form analysis (kinetix/p4-form) — merged to main

- [x] 4.1 Joint angles and rep counting — d9b7fed — pose tests
- [x] 4.2 Pose runner (MediaPipe) — b970144 — frontend vitest, build
- [x] 4.3 Form job — ff11b34 — api npm test, asset and docs checks
- [x] 4.4 Analyse after the set, speak the feedback — ae03fef — api npm test, frontend vitest, build
- [~] 4.5 E2E form and offline — flow 6 passes but asserts 'offline' during a live workout (BLOCKERS); flow 7 not written

## Phase 5: iOS and the home server (kinetix/p5-ios)

- [x] 5.1 iOS identity and entitlements — e632a00 — identity check, native localizations, live-activity tests
- [x] 5.2 Unsigned IPA workflow — ios-ipa.yml success on main (artifact Kinetix-unsigned.ipa checked: Payload/App.app present); ios.yml simulator success on main
- [x] 5.3 Windows setup script and guide — 3407fab — script tests (pwsh parse skipped: not installed here)
- [x] 5.4 Final verification and handover — merged to main; local gates green; CI green for ios-ipa.yml and ios.yml

## Done (draft, pending the merge and the CI run)

Spec §10.4 acceptance criteria:
- ✗ Every §10.2 flow green on Linux: flows 1, 2, 3, 4 and the live channel pass; flow 5 covers the channel only (no workout-screen log); flow 6 asserts the live-workout 'offline' path; flow 7 not written (BLOCKERS).
- ✓ IPA downloadable from Actions (artifact kinetix-unsigned-ipa checked locally); installable by USB: not yet tried (human item in HUMAN_TODO).
- ✗ §10.3 checklist ticked by the user: not started; human items are in docs/HUMAN_TODO.md.
- ✗ Meal photo logged under a minute: not measured.

Real-key smoke: run once in Phase 1 (Gemini returned 503, Qwen unreachable). Not repeated.
