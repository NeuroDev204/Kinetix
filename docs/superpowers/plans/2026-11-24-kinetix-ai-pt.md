# Kinetix AI PT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Tóm tắt (tiếng Việt):** 6 phase, 34 task. P0 nền (dọn CI, đổi tên Kinetix, khung E2E) → P1 định tuyến AI Qwen/Gemini
> → P2 dinh dưỡng (dáng người, ảnh bữa ăn, review tuần) → P3 PT nói tiếng Anh live → P4 phân tích video → P5 iOS IPA + script laptop Windows.
> Mỗi task: test trước → code → test xanh → commit → push. Chạy tự động được; việc cần người làm gom vào `docs/HUMAN_TODO.md`.

**Goal:** Turn the openGym copy in this repo into Kinetix: a single-user AI personal trainer that optimises training and nutrition from weigh-ins and meal photos, analyses set videos, talks English live through earphones, and ships as an unsigned IPA.

**Architecture:** Everything is added inside the existing openGym structure: new Coach job kinds and a per-kind provider router in `api/coach/`, new state keys synced by the existing stamp/merge machinery, new screens in `frontend/src/views/`, a raw-WebSocket Gemini Live client in `frontend/src/lib/live/`, MediaPipe pose analysis in `frontend/src/lib/pose/`, and audio-session control added to the existing `RestAlertPlugin.swift`. Text jobs go to Qwen 3.5 4B on Ollama (OpenAI-compatible endpoint), vision and live go to Gemini free tier.

**Tech Stack:** React 19 + Vite, Zustand, vitest + happy-dom, Node 22 `node:http` + `node --test`, Capacitor 8 iOS (CocoaPods), `@playwright/test` (new), `@google/genai` (new, api only), `@mediapipe/tasks-vision@1.2.3` (new, frontend).

**Spec:** `docs/superpowers/specs/2026-11-24-kinetix-ai-pt-design.md` — read it before any task.

## Global Constraints

- Repo: `NeuroDev204/Kinetix`, public. Never commit `.env`, `data/`, real user photos/videos/audio, or any secret. `.env` and `data/` stay in `.gitignore`.
- Keep `LICENSE`, `NOTICE.md` and every upstream copyright line untouched (AGPL-3.0). Never remove them while "rebranding".
- Exercise media in `catalogue/media/` (Gym visual licence) must never be sent to, or used as input for, any AI system — including MediaPipe in tests. Only the user's own photos/videos go to Gemini.
- Node 22 (`node -v` → v22.x). No TypeScript, no linter; match the surrounding style by hand.
- Every new user-facing string goes through `t('…')` with a literal key and is added to all 24 full locale packs in `frontend/src/locales/` (vi.js included; pt-BR inherits pt). `node scripts/check-locales.mjs` and `node scripts/check-source-strings.mjs --strict` (run in `frontend/`) must pass.
- Generated files are regenerated, not hand-edited: after editing `api/coach/prompts/*.md` run `node scripts/build-coach-assets.mjs`; after editing `api/openapi.yaml` run `node scripts/build-api-docs.mjs`; both `--check` modes must pass.
- `api/coach/core/` must stay loadable under bare node: `node api/scripts/check-core-loadable.mjs` passes.
- Models: text `qwen3.5:4b` via provider `compatible`; vision `gemini-3.8-flash` via provider `gemini`; live `gemini-3.8-live` (v1beta, `BidiGenerateContentConstrained`, ephemeral token).
- Qwen context: `num_ctx` 8192; reserve 2048 output tokens; a prompt estimated above 6144 tokens goes to Gemini.
- Free-tier Gemini: tests never call real Gemini/Ollama. Real calls only in `api/scripts/kinetix-smoke.mjs` with `KINETIX_REAL_AI=1`, at most once per phase.
- iOS: bundle id `io.github.neurodev204.kinetix`, display name `Kinetix`, App Group `group.io.github.neurodev204.kinetix`, minimum iOS 16.4 (MediaPipe SIMD). Keep the `opengym` URL scheme and other lowercase internal identifiers.
- Nothing the AI proposes changes the plan, nutrition targets or routines until the user taps apply (existing openGym rule).
- The phone's own-key Coach (`frontend/src/lib/coach-local.js`) is out of scope: new job kinds run on the server only. Do not break the existing local path.

## Run Rules (unattended)

- Phase branches: `kinetix/p0-foundation`, `kinetix/p1-routing`, `kinetix/p2-nutrition`, `kinetix/p3-live`, `kinetix/p4-form`, `kinetix/p5-ios`. Branch from `main`; at phase end merge `--ff-only` into `main` and push.
- After every commit: `git push -u origin HEAD`. One task = one commit (message given per task).
- "Green" means: no test that passed in the Task 0.1 baseline fails, plus all new tests pass. Gate per task: the task's tests + `cd frontend && npx vitest run` + `cd api && npm test` + the checks in Global Constraints that the task touched.
- Stuck: 3 failed fix attempts → append to `docs/BLOCKERS.md` (`## <task id>`, error, what was tried, suspected cause), mark the task `blocked` in `docs/PROGRESS.md`, continue with the next task whose Interfaces do not consume the blocked one.
- After every task append one line to `docs/PROGRESS.md`: `- [x] <task id> <title> — <commit sha> — <tests run>`.
- Anything only a human can do goes into `docs/HUMAN_TODO.md` as a checkbox; never wait for it.
- Never: push to `DuarteSantos8/openGym`, delete files under `data/`, run the smoke script in a loop, re-enable the disabled upstream workflows.
- Temporary files go in the session scratchpad, never `/tmp`.

## Review Focus

1. **Ollama unreachable or hanging** (Windows laptop asleep): a text job must fall back to Gemini within 3 minutes, not hang for the 10-minute job timeout. Pinned in Task 1.3.
2. **Gemini free-tier 429 mid-workout** (vision or live): the workout keeps working, the user gets one clear message, live falls back to on-device TTS. Pinned in Tasks 1.3, 3.4 and 3.6.
3. **A meal photo with no recognisable food** (blurred, a menu, a selfie): job succeeds with `items: []` and a note; the UI says nothing was found instead of an error. Pinned in Tasks 2.4 and 2.6.
4. **Analysis requested before the photo/video reached the server** (offline at the gym): server answers `409 media-missing`; client syncs media and retries once, otherwise shows "will analyse when online". Pinned in Tasks 2.3, 2.6 and 4.4.
5. **Earphones disconnected mid-turn, or a rest cue fires during a voice turn**: input falls back to the built-in mic, no rest cue reconfigures the audio session while a turn is active. Pinned in Task 3.5.

---

## Phase 0 — Foundation (`kinetix/p0-foundation`)

### Task 0.1: Run-control docs and test baseline

**Files:**
- Create: `docs/PROGRESS.md`, `docs/BLOCKERS.md`, `docs/HUMAN_TODO.md`

**Interfaces:**
- Produces: the baseline list of already-failing tests that defines "green" for every later task.

- [ ] **Step 1:** `cd frontend && npm ci && cd ../api && npm ci && cd .. && npm ci` → all succeed.
- [ ] **Step 2:** Run `cd frontend && npx vitest run 2>&1 | tail -40` and `cd api && npm test 2>&1 | tail -40`; record pass/fail counts and the names of failing tests.
- [ ] **Step 3:** Write `docs/PROGRESS.md` with a `## Baseline (2026-11-24)` section holding those counts and failing test names, then a `## Tasks` section. Write `docs/BLOCKERS.md` with a one-line header. Write `docs/HUMAN_TODO.md` with:
  - `- [ ] Laptop Windows: run scripts/kinetix/windows-setup.ps1 (Task 5.3)`
  - `- [ ] Optional: record a 5-rep squat video of yourself as frontend/e2e/fixtures/squat-5reps.mp4 (Task 4.5 skips that test when missing; the file is in .gitignore so your video is not published)`
  - `- [ ] Check real free-tier limits at https://aistudio.google.com/rate-limit for gemini-3.8-flash and gemini-3.8-live`
  - `- [ ] Install the IPA with Impactor and run the iPhone checklist (Task 5.4)`
  - and add `frontend/e2e/fixtures/squat-5reps.mp4` to `.gitignore`.
- [ ] **Step 4: Commit** `git add -A docs .gitignore && git commit -m "chore: run-control docs and test baseline"`

### Task 0.2: Remove upstream-only CI and dependency bots

**Files:**
- Delete: `.github/workflows/` files named Publish Docker images, Deploy demo to GitHub Pages, Mirror to GitLab, CLA, CLA (issue), Weekly audit (find each by its `name:` line); `.github/dependabot.yml`; `renovate.json`
- Modify: `.github/workflows/ios.yml` (`on.push.branches` → `[main]`)

- [ ] **Step 1:** `grep -H '^name:' .github/workflows/*.yml` → map names to files; `git rm` the six files.
- [ ] **Step 2:** `git rm .github/dependabot.yml renovate.json`.
- [ ] **Step 3:** `grep -h '^name:' .github/workflows/*.yml` prints iOS, Release check, Tests and nothing from the delete list.
- [ ] **Step 4: Commit** `git commit -am "ci: drop openGym-only workflows and dependency bots"`

### Task 0.3: Rebrand the visible name to Kinetix

**Files:**
- Create: `scripts/kinetix/rebrand.mjs`
- Modify (by the script): every `*.js`/`*.jsx` under `frontend/src/` (locale packs, views, components, lib, tests), `frontend/index.html`, `frontend/public/manifest.json`, `frontend/capacitor.config.json` (`appName` only), `api/server.js` (`RP_NAME`), `api/push-messages.js`
- Modify (by hand): `api/coach/core/routine-library.js:14` `DEFAULT_INDEX_URL` → the "off" sentinel that file already understands; `README.md` (short Kinetix README with a "Based on openGym" section linking upstream and the licence)

**Interfaces:**
- Produces: `node scripts/kinetix/rebrand.mjs [--check]` — replaces the exact, case-sensitive token `openGym` with `Kinetix` in the listed files; `--check` exits 1 and lists files that still contain `openGym`.

- [ ] **Step 1:** Write the script with `--check` first; run `--check` → exit 1 with a file list.
- [ ] **Step 2:** Run the script → `--check` → exit 0.
- [ ] **Step 3:** `git diff --stat -- LICENSE NOTICE.md catalogue/ frontend/ios/ frontend/android/` is empty.
- [ ] **Step 4:** In `frontend/`: `npx vitest run && npm run check:native-localizations && node scripts/check-locales.mjs && node scripts/check-source-strings.mjs --strict`; in `api/`: `npm test` → green.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: rebrand visible name to Kinetix; routines index off"`

### Task 0.4: Playwright E2E harness

**Files:**
- Create: `frontend/playwright.config.js`, `frontend/e2e/stack.js`, `frontend/e2e/helpers.js`, `frontend/e2e/smoke.spec.js`, `frontend/e2e/fixtures/.gitkeep`
- Modify: `frontend/package.json` (devDependency `@playwright/test`, script `"e2e": "playwright test"`)

**Interfaces:**
- Produces:
  - `startStack({ coach = { enabled: true, provider: 'fixture' }, env = {} } = {}) -> Promise<{ baseURL, dataDir, stop() }>` in `e2e/stack.js`: temp `DATA_DIR` in the OS temp dir via `fs.mkdtemp`, `FIRST_USER_ADMIN=1`, writes `coach.json` with the api's own `config.save`, starts `node ../api/server.js` on port 3100 and `vite --port 5174` with `/api` proxied to 3100; `stop()` kills both and removes the dir.
  - `signIn(page) -> Promise<void>` in `e2e/helpers.js`: CDP virtual authenticator (`WebAuthn.enable`, `WebAuthn.addVirtualAuthenticator` with `protocol:'ctap2', transport:'internal', hasResidentKey:true, hasUserVerification:true, isUserVerified:true`) then the app's create-profile + passkey flow.
  - `agreeCoach(page)`: completes the Coach consent screen.
  - Chromium only; launch args `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`.

- [ ] **Step 1: Write the failing test** `e2e/smoke.spec.js`: `signIn(page)` then `await expect(page).toHaveTitle(/Kinetix/)` and the tab bar is visible.
- [ ] **Step 2:** `npx playwright install chromium && npm run e2e` → FAIL.
- [ ] **Step 3:** Implement config, stack, helpers.
- [ ] **Step 4:** `npm run e2e` → PASS.
- [ ] **Step 5: Commit** `git commit -m "test: Playwright E2E harness with virtual passkey"`; merge phase to `main`, push.

---

## Phase 1 — AI routing (`kinetix/p1-routing`)

### Task 1.1: Provider-aware credentials and routing config

**Files:**
- Modify: `api/coach/config.js` (`credentialFor` ~:252, `providerMeta` ~:315, `jobEnv` ~:349, defaults ~:81-112)
- Test: `api/test/kinetix-routing-config.test.js`

**Interfaces:**
- Produces:
  - Stored `cfg.routing = { text, vision, fallback, live, liveModel, ctx, textTimeoutMs } | undefined` (strings except `ctx`, `textTimeoutMs` numbers). Absent = upstream single-provider behaviour.
  - `credentialFor(uid, provider = load().provider)`, `providerMeta(provider = load().provider)`, `jobEnv(jobDir, resolved)` injects the key of `resolved.provider`.

- [ ] **Step 1: Write the failing tests** (`tempData()` + dynamic `import()` pattern from `api/test/helpers.mjs`): saving a Gemini key under `auth.gemini` (same shape `config.js` writes, via `encrypt`) while `provider: 'compatible'` → `credentialFor(uid, 'gemini').auth.token === 'g-key'`; `routing` round-trips through `save`/`load`; without `routing`, `credentialFor(uid)` behaves as before.
- [ ] **Step 2:** `cd api && node --test test/kinetix-routing-config.test.js` → FAIL.
- [ ] **Step 3:** Add the optional `provider` parameter; every existing caller unchanged.
- [ ] **Step 4:** Test + `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(coach): provider-aware credentials and routing config"`

### Task 1.2: Router module

**Files:**
- Create: `api/coach/core/route.js`
- Test: `api/test/kinetix-route.test.js`

**Interfaces:**
- Produces:
  - `export const VISION_KINDS = ['physique', 'meal', 'form']`
  - `export function estimateTokens(text) -> number` — `Math.ceil(text.length / 3.5)`, with comment `// shortcut: chars/3.5 heuristic, switch to the model tokenizer if routing misfires`.
  - `export function providerForJob(cfg, kind, promptText) -> { provider, reason: 'single'|'vision'|'too-large'|'text' }` — no `cfg.routing` → `cfg.provider`/`'single'`; vision kind → `routing.vision`/`'vision'`; `estimateTokens(promptText) > routing.ctx - 2048` → `routing.fallback`/`'too-large'`; else `routing.text`/`'text'`.
  - `export function fallbackFor(cfg, provider, errorClass) -> string | null` — `routing.fallback` when routing exists, `provider !== routing.fallback`, and `errorClass` ∈ `['schema','cutoff','unreachable','timeout','provider']`; else `null`.

- [ ] **Step 1: Write the failing tests** (with `R.routing.ctx = 8192` → limit 6144 tokens = 21504 chars):
```js
assert.deepEqual(providerForJob(R, 'meal', 'x'), { provider: 'gemini', reason: 'vision' });
assert.deepEqual(providerForJob(R, 'review', 'a'.repeat(21505)), { provider: 'gemini', reason: 'too-large' });
assert.deepEqual(providerForJob(R, 'review', 'a'.repeat(21504)), { provider: 'compatible', reason: 'text' });
assert.deepEqual(providerForJob({ provider: 'fixture' }, 'meal', 'x'), { provider: 'fixture', reason: 'single' });
assert.equal(fallbackFor(R, 'compatible', 'quota'), null);
assert.equal(fallbackFor(R, 'gemini', 'schema'), null);
assert.equal(fallbackFor(R, 'compatible', 'unreachable'), 'gemini');
```
- [ ] **Step 2–4:** FAIL → implement → PASS + `node api/scripts/check-core-loadable.mjs`.
- [ ] **Step 5: Commit** `git commit -m "feat(coach): per-kind provider router"`

### Task 1.3: Route and fall back in the job runner

**Files:**
- Modify: `api/coach/jobs.js` (`execute` ~:350-445; enqueue privilege check ~:229)
- Test: `api/test/kinetix-jobs-routing.test.js`

**Interfaces:**
- Consumes: `providerForJob`, `fallbackFor` (1.2); `credentialFor(uid, provider)`, `jobEnv` (1.1); `buildPromptParts` (`core/prompt.js`), `classifyFailure` (`core/failure.js:73`), `adapterFor` (`adapters/index.js:55`).
- Produces: job status gains `provider` and `fellBack: boolean`. A job routed by reason `'text'` uses timeout `routing.textTimeoutMs`.

- [ ] **Step 1: Write the failing tests** with fake adapters (pattern of `coach-adapt.test.js:153`):
  - text job → compatible adapter called; `provider: 'compatible'`, `fellBack: false`.
  - compatible returns invalid JSON on the initial and the repair round → gemini called once → ok, `fellBack: true`.
  - compatible never resolves, `textTimeoutMs: 50` → gemini runs → `fellBack: true` (**Review Focus 1**).
  - gemini returns stderr `429 quota exceeded` on a vision job → fails `errorClass: 'quota'`, no second attempt (**Review Focus 2**).
  - no `cfg.routing` → existing `api/test/jobs.test.js` unchanged and green.
- [ ] **Step 2:** FAIL. **Step 3:** In `execute`: build prompt parts once, `providerForJob`, resolve adapter/model (`modelFor(cfg, provider)`)/credential for that provider, `runPipeline`; on failure classify, `fallbackFor`, rerun once with the fallback.
- [ ] **Step 4:** PASS + full api suite.
- [ ] **Step 5: Commit** `git commit -m "feat(coach): route jobs per kind with one fallback"`

### Task 1.4: Image/video input for the Gemini adapter

**Files:**
- Create: `api/coach/media-input.js` (server-only; not in `core/`)
- Modify: `api/coach/core/adapters/gemini.js` (`geminiSpec.body` ~:75-86), `api/coach/jobs.js` (load and pass media), `api/server.js` (give jobs `mediaFile: (uid, hash) => MEDIA.file(uid, hash)` the same way server.js hands other dependencies to jobs; `MEDIA` is created at ~:2178)
- Test: `api/test/kinetix-media-input.test.js`

**Interfaces:**
- Produces:
  - `export async function loadMedia(uid, refs, { mediaFile, maxBytes = 20 * 1024 * 1024 }) -> Array<{ mimeType, data /* base64 */ }>` — `refs` are full media records (`{ hash, mime, … }`); each `hash` must match `HASH_RE` (`api/media.js:31`) and is resolved only through `mediaFile`; missing → `MediaError(409, 'media-missing')`; total above `maxBytes` → `MediaError(413, 'too-large')`.
  - Adapter `invoke(opts)` accepts `opts.media`; `geminiSpec.body` appends `{ inlineData: { mimeType, data } }` parts after the text part. Other adapters ignore it.

- [ ] **Step 1: Write the failing tests**: Gemini body with one image has `contents[0].parts[1].inlineData.mimeType === 'image/jpeg'`; missing hash → 409; 21 MB temp file → 413; a ref whose `hash` is a path (`'../../catalogue/media/still/0001.webp'`) → rejected by `HASH_RE` (catalogue guard).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(coach): inline media for Gemini vision jobs"`

### Task 1.5: Setup and smoke scripts

**Files:**
- Create: `api/scripts/kinetix-setup.mjs`, `api/scripts/kinetix-smoke.mjs`
- Modify: `.env.example` (append `GEMINI_API_KEY=`, `OLLAMA_BASE=http://host.docker.internal:11434`, `FIRST_USER_ADMIN=1`, `KINETIX_REAL_AI=` each with a one-line comment)
- Test: `api/test/kinetix-setup.test.js`

**Interfaces:**
- Produces:
  - `node api/scripts/kinetix-setup.mjs` (env `DATA_DIR`, `GEMINI_API_KEY`, `OLLAMA_BASE`): via `config.save` writes `enabled: true`, `provider: 'compatible'`, `models: { compatible: 'qwen3.5:4b', gemini: 'gemini-3.8-flash' }`, `providerOptions: { compatible: { baseUrl: OLLAMA_BASE } }`, the Gemini key encrypted under `auth.gemini` (same shape the admin card writes), `routing: { text: 'compatible', vision: 'gemini', fallback: 'gemini', live: 'gemini', liveModel: 'gemini-3.8-live', ctx: 8192, textTimeoutMs: 180000 }`. Idempotent; never prints the key.
  - `node api/scripts/kinetix-smoke.mjs`: exits 0 doing nothing unless `KINETIX_REAL_AI=1`; else one compatible text call, one Gemini vision call on a 64×64 PNG generated in memory, one live-token mint (skipped with a note until Task 3.1). One line per check: `OK <name>` / `FAIL <name> <errorClass>`.
- [ ] **Step 1:** Test: setup twice on a temp `DATA_DIR` → `routing.text === 'compatible'`, `credentialFor(uid,'gemini').auth.token === 'test-key'`, stdout lacks `test-key`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** If `/home/neuro/Documents/Kinetix/.env` has `GEMINI_API_KEY`: `set -a; . ./.env; set +a; KINETIX_REAL_AI=1 node api/scripts/kinetix-smoke.mjs` once; copy the output lines into `docs/PROGRESS.md`. Qwen `FAIL unreachable` is expected while the laptop is not set up.
- [ ] **Step 6: Commit** `git commit -m "feat: kinetix setup and real-AI smoke scripts"`; merge phase, push.

---

## Phase 2 — Nutrition (`kinetix/p2-nutrition`)

### Task 2.1: New synced state keys

**Files:**
- Modify: `frontend/src/store/useStore.js` (`DEF` ~:93-294 add `meals: {}`, `english: {}`, `nutritionPlan: null`; `hasData` ~:386 counts live meals), `frontend/src/lib/sync-merge.js` (`STAMPED_MAPS` ~:96, `OWN_MERGE` ~:719-723), `api/sync-stamps.js` (`STAMPED_MAPS` ~:77, `OWN_MERGE` ~:67-71), `api/tokens.js` (`NEVER` ~:59 add `meals`, `english`, `nutritionPlan`), `frontend/src/lib/media-refs.js` (`stateMediaRefs` ~:129), `api/media.js` (`referencedHashes` ~:310; `mediaConfig` ~:102 add `meals: true`), `api/test/fixtures/media-refs.json`
- Test: `frontend/src/lib/kinetix-state.test.js`, `api/test/kinetix-state.test.js`

**Interfaces:**
- Produces the state shapes every later task uses:
  - `S.meals[id] = { d: 'YYYY-MM-DD', at: number, m: MediaRecord, items: MealItem[], note?: string, status: 'pending'|'done'|'failed', edited: boolean, _ts }`, removal `{ _ts }`; `MealItem = { name, grams, kcal, protein, carbs, fat }` (numbers except `name`).
  - `S.english[d] = { transcript: string /* ≤ 20000 chars */, mistakes: Array<{ said, better }>, newWords: string[], _ts }`.
  - `S.nutritionPlan = null | { kcal, protein, carbs, fat, why: string, mealPlan: Array<{ day: string, meals: string[] }>, at }` (plain setting, last write wins).
- [ ] **Step 1: Write the failing tests**: `STAMPED_MAPS` contains `meals` and `english` on both sides; two devices adding different meal ids → merge keeps both; a `{ _ts }` removal beats an older add; `stateMediaRefs` and `referencedHashes` include `S.meals[id].m.hash` (shared fixture case read by both suites); a token with every category at Change cannot read `meals`, `english`, `nutritionPlan`; `hasData` true for a state with one meal.
- [ ] **Step 2–4:** FAIL → implement → PASS (both suites).
- [ ] **Step 5: Commit** `git commit -m "feat: synced meals, english and nutritionPlan state"`

### Task 2.2: Nutrition math

**Files:**
- Create: `frontend/src/lib/nutrition.js`
- Test: `frontend/src/lib/nutrition.test.js`

**Interfaces:**
- Produces:
  - `bmr({ sex: 'm'|'f', kg, cm, age }) -> number` — `10*kg + 6.25*cm - 5*age + (sex === 'm' ? 5 : -161)`.
  - `tdee(bmrKcal, daysPerWeek) -> number` — `bmrKcal * Math.min(1.2 + 0.075 * daysPerWeek, 1.725)`.
  - `initialTarget({ sex, kg, cm, age, daysPerWeek, rateGoal /* kg/week, negative = lose */ }) -> { kcal, protein, carbs, fat }` — `kcal = clamp(round(tdee + rateGoal * 7700 / 7), 1200, 5000)`, `protein = round(1.8 * kg)`, `fat = round(kcal * 0.25 / 9)`, `carbs = max(0, round((kcal - protein*4 - fat*9) / 4))`.
  - `scaleItem(item, grams) -> MealItem` — macros × `grams / item.grams`, 1 decimal; `grams <= 0` → macros 0.
  - `mealsOn(S, d) -> Array<Meal & { id }>` — live entries of that day sorted by `at`.
  - `dayTotals(S, d) -> { kcal, protein, carbs, fat }` (1 decimal).
  - `ageOf(birthYear, now = Date.now()) -> number`.
- [ ] **Step 1: Write the failing tests**: `bmr({sex:'m',kg:70,cm:175,age:25}) === 1673.75`; `tdee(1673.75, 4)` is `2510.625`; `initialTarget({sex:'m',kg:70,cm:175,age:25,daysPerWeek:4,rateGoal:-0.5})` → `kcal 1961, protein 126, fat 54, carbs` = `round((1961-504-486)/4)` = `243`; `scaleItem({name:'cơm',grams:200,kcal:260,protein:5.4,carbs:57,fat:0.6}, 100).kcal === 130`; `dayTotals` ignores `{ _ts }` tombstones and other days.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: nutrition math (BMR, targets, scaling, totals)"`

### Task 2.3: Vision job plumbing + `physique` job

**Files:**
- Create: `api/coach/prompts/physique.md`
- Modify (the new-job-kind file set, in this order): `api/coach/core/schemas.js` (`SCHEMAS`), `core/validate.js` (`validatePhysique`), `core/prompt.js` (`taskOf`), `core/payload.js` (`TASKS` ~:610 + `build` branch; `cleanProfile` ~:106 keeps `physique` and `target`), `core/categories.js` (category "Photos and videos you choose to have analysed"), `core/pipeline.js` (validator chain ~:82-94), `jobs.js` (enqueue copies `media` refs; pending extras), `routes.js` (`POST /api/coach/physique`), `api/openapi.yaml`, `fixture-cli.mjs` (physique answer), `frontend/src/lib/coach-api.js` (`requestPhysique(ref) -> Promise<{ id }>`); then `node scripts/build-coach-assets.mjs` and `node scripts/build-api-docs.mjs`
- Test: `api/test/kinetix-physique.test.js`

**Interfaces:**
- Consumes: `loadMedia` (1.4), router (1.2, 1.3).
- Produces:
  - `POST /api/coach/physique` body `{ media: MediaRecord }` → `202 { id }`; `409 { error: 'media-missing' }` (**Review Focus 4**).
  - Payload `{ task: 'physique', body: { sex, age, heightCm, weightKg, goalKg } }` + media.
  - Result `{ coach_contract: 1, physique: { bodyFatRange: [low, high], notes, focusAreas: string[] } }`; validator: `3 ≤ low ≤ high ≤ 60`, `notes` ≤ 600 chars, ≤ 5 focus areas ≤ 60 chars each.
  - Client applies it as `S.coach.profile.physique = { ...physique, at }`.
- [ ] **Step 1: Write the failing tests**: fixture → valid physique; validator rejects `[40, 20]` and `[1, 70]`; unknown media hash → 409; the serialized payload + prompt contain no `catalogue` path and only the user's hash (catalogue guard); `GET /api/coach/disclosure` lists the new category.
- [ ] **Step 2–4:** FAIL → implement → PASS + both `--check` scripts + `openapi-routes.test.js`.
- [ ] **Step 5: Commit** `git commit -m "feat(coach): physique vision job"`

### Task 2.4: `meal` job

**Files:**
- Create: `api/coach/prompts/meal.md` (expects Vietnamese and other dishes; estimate grams per visible dish and macros per dish; when no food is visible return `items: []` with a `note`)
- Modify: the Task 2.3 file set for kind `meal`; route `POST /api/coach/meal`; `fixture-cli.mjs` adds `FIXTURE_MODE=meal-empty`; `coach-api.js` `requestMeal(mealId, ref) -> Promise<{ id }>`
- Test: `api/test/kinetix-meal.test.js`

**Interfaces:**
- Produces: result `{ coach_contract: 1, items: MealItem[], note?: string }`; validator: ≤ 12 items, `grams` in `(0, 3000]`, `kcal` in `[0, 4000]`, macros in `[0, 500]`, `name` ≤ 80 chars; `items: []` valid only with a non-empty `note` (**Review Focus 3**).
- [ ] **Step 1:** Tests: fixture valid; `meal-empty` accepted; `[]` without note rejected; catalogue guard; 409.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ `--check` scripts).
- [ ] **Step 5: Commit** `git commit -m "feat(coach): meal photo job"`

### Task 2.5: Intake: body facts, goal and body photo

**Files:**
- Modify: `frontend/src/views/CoachIntake.jsx` (`STEPS` ~:75 add `'body'`, `'photo'` after `'goal'`; `canNext` ~:92; `optional` ~:93 includes `'photo'`; `finish()`), `api/coach/core/payload.js` (`create` branch includes `profile.physique` and `profile.target`), all locale packs
- Test: `frontend/src/views/CoachIntake.kinetix.test.jsx`

**Interfaces:**
- Consumes: `initialTarget`, `ageOf` (2.2); `fileProgressPhoto` (`lib/day-photos.js:91`), `serverTakesDayPhotos`, `useMediaPicker` (`components/CustomMediaField.jsx:73`), `syncMedia` (`lib/media-sync.js`), `logWeighIn` (`lib/bodyweight.js`), `requestPhysique` (2.3).
- Produces: `body` step writes `S.birthYear`, `S.heightCm`, `S.sex`, today's weigh-in, `S.targetW`, `S.rateGoal`; `photo` step files the photo for today as a progress photo, `syncMedia({ force: true })`, then `requestPhysique`; `finish()` sets `S.coach.profile.target = initialTarget(...)` and, if `S.nutritionPlan` is null, `S.nutritionPlan = { ...target, why: 'initial', mealPlan: [], at }`.
- [ ] **Step 1: Write the failing test** (happy-dom pattern of `CoachIntake.test.jsx`): 25 y, 175 cm, m, 70 kg, goal 65 kg, −0.5 kg/week, 4 days → `S.heightCm === 175`, `S.targetW === 65`, `S.nutritionPlan.kcal === 1961`; photo step skippable; with a photo `requestPhysique` called once after `syncMedia`.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ locale checks).
- [ ] **Step 5: Commit** `git commit -m "feat: coach intake asks body facts, goal and body photo"`

### Task 2.6: Nutrition screen

**Files:**
- Create: `frontend/src/views/Nutrition.jsx`, `frontend/src/views/Nutrition.css`, `frontend/src/lib/meal-log.js`
- Modify: `frontend/src/App.jsx` (lazy route `/nutrition`), `frontend/src/views/Stats.jsx` (`linkRows` ~:891 entry), `frontend/src/components/TabBar.jsx` (`PARENT` ~:41: `/nutrition` → Stats tab), all locale packs
- Test: `frontend/src/lib/meal-log.test.js`, `frontend/src/views/Nutrition.test.jsx`

**Interfaces:**
- Consumes: 2.1 shapes, `scaleItem`, `mealsOn`, `dayTotals` (2.2), `requestMeal` (2.4), `useMediaPicker`, `useMediaUrl` (`components/CustomMedia.jsx:48`), `syncMedia`.
- Produces (`lib/meal-log.js`):
  - `addMeal(S, ref, now) -> id` — `{ d: today, at: now, m: ref, items: [], status: 'pending', edited: false }`.
  - `applyMealResult(S, id, { items, note })` → `status: 'done'`.
  - `failMeal(S, id, errorClass)` → `status: 'failed'`.
  - `setItemGrams(S, id, index, grams)` — `scaleItem`, `edited: true`.
  - `removeMeal(S, id, now)` — `{ _ts: now }`.
  - `analyseMeal(id) -> Promise<'done'|'offline'|'failed'>` — `syncMedia({ force: true })`, `requestMeal`; on 409 sync again and retry once; still 409 → `'offline'`, meal stays `pending` (**Review Focus 4**).
- Screen: date switcher; today's meals (thumbnail, items with editable grams, kcal per meal); totals vs `S.nutritionPlan` (kcal + 3 macro bars); "Add meal photo" (`<input type="file" accept="image/*" capture="environment">`, like `SetVideo.jsx:97`); empty result shows the note ("No food found in this photo") (**Review Focus 3**); `pending` meals show "Will analyse when online" with a retry button; the week meal plan from `S.nutritionPlan.mealPlan`.
- [ ] **Step 1: Write the failing tests**: lib functions with exact values (grams 200→100 halves kcal, totals equal `dayTotals`); `analyseMeal` with `api` mocked 409 then 202 → `'done'`; 409 twice → `'offline'`, still `pending`; view shows target `1961` and the empty-result note.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ locale checks, `npm run build`).
- [ ] **Step 5: Commit** `git commit -m "feat: nutrition screen with meal photos"`

### Task 2.7: Weekly review adjusts nutrition

**Files:**
- Modify: `api/coach/core/payload.js` (review branch ~:765-780 adds `nutrition: { target, days: [{ d, kcal, protein, carbs, fat, meals }] }` for the last 14 days and `bodyweight.trend14: { perWeek, n }` from `weighIns`), `core/schemas.js` (review: optional `nutrition`), `core/validate.js` (review accepts `nutrition` with `kcal` 1200–5000, `protein` 40–300, `carbs` 0–700, `fat` 20–250, `why` ≤ 400 chars, `mealPlan` ≤ 7 days × ≤ 6 meals × ≤ 120 chars), `prompts/review.md`, `frontend/src/views/CoachChat.jsx` (`ReviewCard` ~:253-260 shows the nutrition change), the review apply/undo code that writes `S.coach.snapshots` (include `nutritionPlan`), `docs/ARCHITECTURE.md` ("Code that exists twice on purpose" table: `dailyMacros` ↔ `dayTotals`), all locale packs; rebuild coach assets
- Test: `api/test/kinetix-review-nutrition.test.js`, `frontend/src/views/CoachChat.nutrition.test.jsx`, `frontend/src/lib/kinetix-parity.test.js`

**Interfaces:**
- Consumes: 2.1 shapes, `dayTotals` (2.2).
- Produces: `dailyMacros(S, fromDay, toDay)` in `payload.js` (server copy of `dayTotals`); applying a review with `nutrition` sets `S.nutritionPlan = { ...nutrition, at }`; Undo restores the previous value.
- [ ] **Step 1:** Tests: 14 seeded days → 14 `days` entries and negative `trend14.perWeek` for a falling series; validator rejects `kcal: 900`; apply → undo round-trips `nutritionPlan`; parity test runs both functions on the same state.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(coach): weekly review adjusts calories and meal plan"`

### Task 2.8: E2E — onboarding, meals, review, routing

**Files:**
- Create: `frontend/e2e/onboarding.spec.js`, `frontend/e2e/meals.spec.js`, `frontend/e2e/review.spec.js`, `frontend/e2e/make-fixtures.mjs` (writes solid-colour `meal.jpg`, `body.jpg` into `e2e/fixtures/`; never copies from `catalogue/`), the generated jpgs
- Modify: `api/coach/fixture-cli.mjs` (`FIXTURE_MODE=quota` → exit 1 with stderr `429 quota exceeded`)

- [ ] **Step 1:** Write spec §10.2 flows 1–4 with `startStack({ coach: { enabled: true, provider: 'fixture', routing: { text: 'fixture', vision: 'fixture', fallback: 'fixture', live: 'gemini', liveModel: 'gemini-3.8-live', ctx: 8192, textTimeoutMs: 180000 } } })`:
  - flow 1: intake → physique stored → plan card applied → routine on Plan → photo in progress photos → target on Nutrition.
  - flow 2: add meal photo → items → change grams → totals update → reload keeps data → a second context on the same profile sees the meal.
  - flow 3: seed 14 days via `PUT /api/data` → review → nutrition block → apply → Undo restores.
  - flow 4: `FIXTURE_MODE=quota` on a meal → quota message, meal retryable.
- [ ] **Step 2:** `npm run e2e` → fix only what the flows expose → PASS.
- [ ] **Step 3: Commit** `git commit -m "test(e2e): onboarding, meals, review, routing flows"`; merge phase, push, smoke once if the key exists.

---

## Phase 3 — Live English PT (`kinetix/p3-live`)

### Task 3.1: Live token endpoint

**Files:**
- Create: `api/kinetix/live-token.js`
- Modify: `api/package.json` (dependency `@google/genai`, exact current version), `api/server.js` (route `POST /api/kinetix/live-token`), `api/openapi.yaml` (+ rebuild docs), `api/scripts/kinetix-smoke.mjs` (enable the live-token check)
- Test: `api/test/kinetix-live-token.test.js`

**Interfaces:**
- Produces:
  - `export async function mintLiveToken({ apiKey, model, now = Date.now, genai }) -> { token, model, expiresAt }` — `new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } }).authTokens.create({ config: { uses: 1, expireTime: <now+30 min ISO>, newSessionExpireTime: <now+1 min ISO>, liveConnectConstraints: { model } } })`; `token = result.name`; `genai` injectable for tests.
  - Route: signed in, Coach consent given, key from `credentialFor(uid, routing.live)`, model `routing.liveModel` → `200 { token, model, expiresAt, wsUrl }` with `wsUrl = process.env.KINETIX_LIVE_WS || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'`; `429 { error: 'quota' }` on Gemini quota; `503 { error: 'no-live' }` without routing; `KINETIX_FAKE_GENAI=1` uses a fake `genai` returning `{ name: 'fake-token' }` (E2E only).
- [ ] **Step 1:** Tests with injected fake `genai`: `config` has `uses: 1` and the model; 401 signed out; 403 without consent; 429 mapping; 503 without routing; response never contains the API key.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ openapi check).
- [ ] **Step 5: Commit** `git commit -m "feat: Gemini Live ephemeral token endpoint"`

### Task 3.2: Live protocol (pure)

**Files:**
- Create: `frontend/src/lib/live/protocol.js`
- Test: `frontend/src/lib/live/protocol.test.js`

**Interfaces:**
- Produces:
  - `buildSetup({ model, systemInstruction, tools, resumeHandle }) -> { setup: { model: 'models/' + model, generationConfig: { responseModalities: ['AUDIO'] }, systemInstruction: { parts: [{ text }] }, tools: [{ functionDeclarations: tools }], inputAudioTranscription: {}, outputAudioTranscription: {}, contextWindowCompression: { slidingWindow: {} }, sessionResumption: resumeHandle ? { handle: resumeHandle } : {} } }`
  - `audioMessage(b64) -> { realtimeInput: { audio: { data: b64, mimeType: 'audio/pcm;rate=16000' } } }`
  - `textTurn(text) -> { clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } }`
  - `toolResponse(results) -> { toolResponse: { functionResponses: results } }` (`results: [{ id, name, response }]`)
  - `parseServerMessage(msg) -> Event[]`, `Event` ∈ `{ type:'setupComplete' }`, `{ type:'audio', data }`, `{ type:'inputText', text }`, `{ type:'outputText', text }`, `{ type:'turnComplete' }`, `{ type:'interrupted' }`, `{ type:'toolCall', calls:[{ id, name, args }] }`, `{ type:'toolCancel', ids }`, `{ type:'resume', handle }` (from `sessionResumptionUpdate.newHandle` when `resumable`), `{ type:'goAway', timeLeftMs }`.
- [ ] **Step 1:** Tests: each builder deep-equal; one sample per server message; a message with both audio and `outputTranscription` yields two events.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(live): Gemini Live protocol messages"`

### Task 3.3: Audio I/O

**Files:**
- Create: `frontend/src/lib/live/pcm.js`, `frontend/src/lib/live/audio-io.js`, `frontend/public/live/mic-worklet.js`
- Test: `frontend/src/lib/live/pcm.test.js`

**Interfaces:**
- Produces:
  - `pcm.js`: `downsample(f32, fromRate, toRate = 16000) -> Float32Array`; `floatTo16(f32) -> Int16Array`; `int16ToBase64(i16) -> string`; `base64ToFloat32(b64) -> Float32Array`; `rms(f32) -> number`.
  - `audio-io.js`: `openMic({ onChunk: (b64, rms) => void }) -> Promise<{ close() }>` (getUserMedia `{ audio: { echoCancellation: true, noiseSuppression: true } }`, AudioWorklet `/live/mic-worklet.js` posting 20 ms frames, downsampled to 16 kHz); `createPlayer() -> { push(b64), clear(), close(), playing() }` (24 kHz, queued `AudioBufferSourceNode`s).
- [ ] **Step 1:** Tests: 480 samples 48k→16k → 160; `floatTo16([1,-1,0])` → `[32767,-32768,0]`; base64 round trip; `rms` of constant 0.5 = 0.5.
- [ ] **Step 2–4:** FAIL → implement → PASS (audio-io is covered by E2E 3.8).
- [ ] **Step 5: Commit** `git commit -m "feat(live): PCM conversion, mic capture and player"`

### Task 3.4: Live session with turns

**Files:**
- Create: `frontend/src/lib/live/turn.js`, `frontend/src/lib/live/session.js`
- Test: `frontend/src/lib/live/turn.test.js`, `frontend/src/lib/live/session.test.js`

**Interfaces:**
- Consumes: 3.2, 3.3, `api('/api/kinetix/live-token', …)` (`lib/api.js`), `beginVoiceTurn`/`endVoiceTurn` (3.5 — build 3.5's JS module first if executing out of order; until then inject no-ops).
- Produces:
  - `createTurnTimer({ silenceMs = 3000, threshold = 0.01, onEnd }) -> { feed(rms, nowMs), reset() }` — `onEnd` once after `silenceMs` below threshold, only after at least one frame above it.
  - `createLiveSession({ systemInstruction, tools, onToolCall, onTranscript, onState, wsFactory = url => new WebSocket(url), audio, voice }) -> { startTurn(), sendText(text), isOpen(), close() }`:
    - `startTurn`: token cached until `expiresAt - 60 s`; open `wsUrl + '?access_token=' + token` if closed; send `buildSetup` with the last resume handle; `voice.beginVoiceTurn()`; open mic; stream `audioMessage`; turn timer ends the user's turn (close mic); model audio → player; `turnComplete` → `voice.endVoiceTurn()`; 5 s idle after that → close socket.
    - `sendText`: same connect path, `textTurn`.
    - `goAway` / unexpected close mid-turn → reconnect once with the resume handle.
    - Token 429 or a quota close → `onState('error', 'quota')`, no retry (**Review Focus 2**).
    - `onState` values: `'idle'|'connecting'|'listening'|'speaking'|'error'`.
- [ ] **Step 1:** Tests with fake WS/audio/voice: setup first; second connect carries the resume handle; tool call → `onToolCall` → `toolResponse` with the same id; 3 s silence → mic closed; `goAway` → reconnect; quota → `error/quota`, one token request only; begin/end voice turn called around the turn; turn timer cases.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(live): turn-based Gemini Live session"`

### Task 3.5: Native voice audio session

**Files:**
- Modify: `frontend/ios/App/App/RestAlertPlugin.swift` (plugin methods `beginVoice`, `endVoice` in `pluginMethods`; route-change observer), `frontend/ios/App/App/Info.plist` (`UIBackgroundModes` add `audio`; `NSMicrophoneUsageDescription` = "Kinetix uses the microphone for clips and for talking to your trainer."), `frontend/ios/App/App/en.lproj/InfoPlist.strings`, `frontend/ios/App/App/it.lproj/InfoPlist.strings` (same meaning), `frontend/src/lib/rest-alert.js` (`speakNative` ~:203 and tone playback return `false` without calling native while `voiceTurnActive()`)
- Create: `frontend/src/lib/voice-session.js`
- Test: `frontend/src/lib/voice-session.test.js`

**Interfaces:**
- Produces:
  - Swift `beginVoice`: `setCategory(.playAndRecord, mode: .default, options: [.duckOthers, .allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker])` (if the SDK renamed `.allowBluetooth` to `.allowBluetoothHFP`, use that), `setActive(true)`, `setPreferredInput` to the first available input with port `.bluetoothHFP`, else `.headsetMic`, else `.builtInMic`; resolves `{ input: 'bluetooth'|'headset'|'builtin' }`. `endVoice`: `setActive(false, options: [.notifyOthersOnDeactivation])`, then `RestAlertPlugin.mixWithMusic()`. While active, `routeChangeNotification` (reasons `.oldDeviceUnavailable`, `.newDeviceAvailable`) re-runs the input choice and `notifyListeners('voiceRoute', { input })`.
  - JS: `beginVoiceTurn() -> Promise<{ input }>` (web → `{ input: 'web' }`), `endVoiceTurn() -> Promise<void>`, `voiceTurnActive() -> boolean`, `onVoiceRoute(cb) -> unsubscribe`, `afterVoiceTurn(fn)` (runs `fn` now if idle, else after the next `endVoiceTurn`). Plugin wrapped in an object like `restPlugin()` (`rest-alert.js:107-112`) because the proxy answers `then`.
- [ ] **Step 1:** JS tests with a mocked plugin: call order; `voiceTurnActive()` true between; `speakNative` returns `false` without a native call while active (**Review Focus 5**); `voiceRoute` reaches subscribers; `afterVoiceTurn` defers; web no-ops.
- [ ] **Step 2–4:** FAIL → implement → PASS. Swift is compiled by the iOS workflow in Task 5.2; note "Swift unverified until 5.2" in `docs/PROGRESS.md`.
- [ ] **Step 5: Commit** `git commit -m "feat(ios): turn-based voice audio session with ducking and hybrid mic"`

### Task 3.6: Voice tools, persona and Talk button

**Files:**
- Create: `frontend/src/lib/live/tools.js`, `frontend/src/lib/live/persona.js`, `frontend/src/components/TalkButton.jsx`
- Modify: `frontend/src/views/Workout.jsx` (`ActiveWorkout`: `bindVoiceActions({...})` next to `bindLiveActions` ~:2508; `<TalkButton/>` beside the Prev/Next row ~:2874), all locale packs
- Test: `frontend/src/lib/live/tools.test.js`, `frontend/src/components/TalkButton.test.jsx`

**Interfaces:**
- Consumes: `createLiveSession` (3.4); Workout handlers `toggle(idx, i, side, opts)` (~:2226), `tickNext()` (~:2608), `navigateUnit(direction)` (~:1812); `startRest(sec, forIdx, opts)` (`store/useUI.js:374`); `speak` (`lib/speech.js`) for the quota fallback line.
- Produces:
  - `TOOL_DECLARATIONS`: `log_set { exercise?: string, weight?: number, reps?: integer }`, `start_rest { seconds: integer }`, `next_exercise {}`, `get_today {}`.
  - `bindVoiceActions(h)`; `handleToolCall({ id, name, args }) -> Promise<object>` — `log_set` fills weight/reps of the next open set of the current (or named) exercise and ticks it → `{ ok: true, exercise, set, weight, reps }`; unknown exercise → `{ ok: false, error: "not in today's session" }`; `start_rest` with `seconds` outside 15–600 → `{ ok: false, error: 'seconds 15-600' }`, else `startRest` → `{ ok: true, seconds }`; `next_exercise` → `navigateUnit(1)`; `get_today` → compact summary (exercise names, sets done/total, next set target).
  - `systemInstruction({ todaySummary, unit }) -> string`: English-speaking personal trainer; brief and friendly between sets; free conversation on any topic allowed; corrects the user's English lightly by repeating the correct sentence once, then moves on; uses the tools to log sets and start rest; never invents numbers it did not log; then today's summary.
  - `TalkButton`: large round button reflecting `onState`; tap → `startTurn()`; `quota` → line "Live trainer limit reached — try later" and one `speak` of the same text; the workout UI keeps working (**Review Focus 2**).
- [ ] **Step 1:** Tests: `log_set {weight:80,reps:5}` fills and ticks the first open set via the fake handler; unknown exercise; `start_rest {seconds:90}` → `startRest(90, …)`, `{seconds:5}` rejected; TalkButton states and quota line.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ locale checks, build).
- [ ] **Step 5: Commit** `git commit -m "feat(live): voice tools, trainer persona and Talk button"`

### Task 3.7: English log and summary job

**Files:**
- Create: `frontend/src/lib/live/english-log.js`, `api/coach/prompts/english-summary.md`, `frontend/src/views/English.jsx`
- Modify: the Task 2.3 file set for kind `english-summary` (text kind → routed to `routing.text`); route `POST /api/coach/english-summary`; `coach-api.js` `requestEnglishSummary(d)`; workout finish path in `Workout.jsx` (enqueue when today's transcript is non-empty); `App.jsx` route `/english`; `Stats.jsx` `linkRows` entry; `TabBar.jsx` `PARENT`; all locale packs
- Test: `frontend/src/lib/live/english-log.test.js`, `api/test/kinetix-english.test.js`

**Interfaces:**
- Produces: `appendTranscript(S, d, role: 'user'|'model', text, now)` — appends `You: …` / `Coach: …` lines, keeps the last 20000 chars; `applyEnglishSummary(S, d, { mistakes, newWords })`. Payload `{ task: 'english-summary', transcript }` with only the last 18000 chars (`// shortcut: only the tail of long sessions is summarised; chunk and merge if sessions run long`). Result `{ coach_contract: 1, mistakes: [{ said, better }] (≤ 20, ≤ 200 chars each), newWords: string[] (≤ 30, ≤ 40 chars) }`. `English.jsx` lists days with mistakes and new words.
- [ ] **Step 1:** Tests: transcript cap keeps the tail; payload length ≤ 18000; fixture summary applied; validator limits.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ asset checks).
- [ ] **Step 5: Commit** `git commit -m "feat: English practice log and summary"`

### Task 3.8: E2E — live trainer

**Files:**
- Create: `frontend/e2e/fake-live-server.mjs`, `frontend/e2e/live.spec.js`; extend `make-fixtures.mjs` to write `speech.wav` (2 s 440 Hz tone + 3 s silence, 16 kHz mono; no real voice)
- Modify: `frontend/e2e/stack.js` (`env: { KINETIX_LIVE_WS: 'ws://127.0.0.1:3199', KINETIX_FAKE_GENAI: '1' }`), Chromium arg `--use-file-for-fake-audio-capture=e2e/fixtures/speech.wav`

**Interfaces:**
- Produces: fake server on 3199 — on `setup` → `setupComplete` + `sessionResumptionUpdate`; on first audio → `inputTranscription "log eighty kilos five reps"`, `toolCall log_set {weight:80,reps:5}`; after the matching `toolResponse` → a short PCM chunk + `outputTranscription "Logged 80 kilos for 5."` + `turnComplete`.
- [ ] **Step 1:** Spec §10.2 flow 5: start a seeded routine → Talk → first open set shows 80 × 5 ticked → state back to idle → finish → `/english` shows the transcript lines and the fixture mistakes.
- [ ] **Step 2:** `npm run e2e` → PASS.
- [ ] **Step 3: Commit** `git commit -m "test(e2e): live trainer with fake Gemini Live server"`; merge phase, push, smoke once.

---

## Phase 4 — Form analysis (`kinetix/p4-form`)

### Task 4.1: Joint angles and rep counting (pure)

**Files:**
- Create: `frontend/src/lib/pose/angles.js`, `frontend/src/lib/pose/reps.js`, `frontend/src/lib/pose/exercise-joints.js`
- Test: `frontend/src/lib/pose/angles.test.js`, `frontend/src/lib/pose/reps.test.js`

**Interfaces:**
- Produces:
  - `angleDeg(a, b, c) -> number` — angle at `b`, degrees, from `{x, y}`.
  - `LM = { lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 }`.
  - `jointSeries(frames: Array<{ t, landmarks }>, joint: 'knee'|'hip'|'elbow'|'shoulder') -> Array<{ t, deg }>` — mean of both sides when both have `visibility ≥ 0.5`, else the visible side, else the frame is skipped.
  - `countReps(series, { minRange = 40 }) -> Array<{ start, bottom, end, minDeg, maxDeg }>` — top → bottom → top with swing ≥ `minRange`, hysteresis of `minRange / 2`.
  - `summarize(frames, joint) -> { reps, perRep: Array<{ minDeg, maxDeg, durationMs }>, trunkLeanMaxDeg }`.
  - `jointFor(exerciseId) -> joint | null` for the catalogue ids of barbell squat, deadlift, bench press, overhead press, barbell row, pull-up, lunge (find ids by name with `grep -l` in `catalogue/exercises/*.json`; list ids and names in a comment).
- [ ] **Step 1:** Tests: `angleDeg({x:0,y:1},{x:0,y:0},{x:1,y:0}) === 90`; 5 synthetic cosine cycles 170°→80° → 5 reps; ±10° noise adds none; `jointFor(<squat id>) === 'knee'`, unmapped → `null`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(pose): joint angles and rep counting"`

### Task 4.2: Pose runner (MediaPipe)

**Files:**
- Create: `frontend/src/lib/pose/runner.js`, `frontend/scripts/copy-mediapipe.mjs`, `frontend/public/models/pose_landmarker_lite.task` (download once from `https://huggingface.co/litert-community/MediaPipe-PoseLandmarker-Lite/resolve/main/pose_landmarker_lite.task` and commit; Apache-2.0 — add a line to `NOTICE.md` under a new "Pose model" heading)
- Modify: `frontend/package.json` (`@mediapipe/tasks-vision` exactly `1.2.3`; `dev`, `build`, `build:mobile` start with `node scripts/copy-mediapipe.mjs &&`), `.gitignore` (`frontend/public/mediapipe/`), `frontend/scripts/check-mobile-bundle.mjs` (raise or exempt the budget for `mediapipe/` and `models/` only if it fails; put the new numbers in the commit message)
- Test: `frontend/src/lib/pose/runner.test.js`

**Interfaces:**
- Produces: `analyzeVideo(blob, { exerciseId, fps = 15, onProgress }) -> Promise<{ joint, frames, summary } | { joint: null }>` — returns `{ joint: null }` without importing MediaPipe when `jointFor` is null; otherwise lazy-imports tasks-vision, `FilesetResolver.forVisionTasks('/mediapipe/wasm')`, `PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate: 'GPU' }, runningMode: 'VIDEO', numPoses: 1 })`, retries with `delegate: 'CPU'` if GPU init throws; seeks a hidden `<video>` every `1/fps` s and calls `detectForVideo(video, tMs)` with increasing timestamps; non-production builds use `window.__KINETIX_POSE_FIXTURE__` frames when set.
- [ ] **Step 1:** Tests with tasks-vision mocked: GPU failure → CPU retry; unmapped exercise → no import; mocked landmarks reach `summarize`; fixture global bypasses MediaPipe.
- [ ] **Step 2–4:** FAIL → implement → PASS; `npm run build` passes; `VITE_MOBILE=1 npx vite build` + `node scripts/check-mobile-bundle.mjs dist` pass (`cap sync` may not run on Linux — note it if so).
- [ ] **Step 5: Commit** `git commit -m "feat(pose): MediaPipe pose runner with CPU fallback"`

### Task 4.3: `form` job

**Files:**
- Create: `api/coach/prompts/form.md` (states that pose numbers come from an on-device model and may be wrong; feedback in English; at most 5 issues)
- Modify: the Task 2.3 file set for kind `form`; route `POST /api/coach/form`; `coach-api.js` `requestForm({ exerciseId, exerciseName, set: { w, r }, summary, media }) -> Promise<{ id }>`
- Test: `api/test/kinetix-form.test.js`

**Interfaces:**
- Produces: payload `{ task: 'form', exercise: { id, name }, set: { w, r }, pose: summary | null }` + the set video (vision → Gemini); result `{ coach_contract: 1, summary (≤ 300), issues: [{ rep: integer|null, issue (≤ 120), cue (≤ 80) }] (≤ 5), score: integer 1–10 }`.
- [ ] **Step 1:** Tests: fixture valid; `score: 11` rejected; catalogue guard (exercise id/name present, no catalogue path or media); 409 when the video is not uploaded.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ checks).
- [ ] **Step 5: Commit** `git commit -m "feat(coach): form analysis job for set videos"`

### Task 4.4: Analyse after the set, speak the feedback

**Files:**
- Create: `frontend/src/lib/form-check.js`
- Modify: `frontend/src/components/SetVideo.jsx` (after `attachSetVideo` returns `'added'` or `'replaced'`, call `checkForm`; show the result under the video), `frontend/src/lib/set-videos.js` (`setFormOf(set) -> form | null`), all locale packs
- Test: `frontend/src/lib/form-check.test.js`

**Interfaces:**
- Consumes: `analyzeVideo` (4.2), `requestForm` (4.3), `syncMedia`, the open live session's `sendText` (3.4; expose the current session from `TalkButton`'s module as `currentLiveSession() -> session | null`), `speak(text, { lang: 'en-US' })` (`lib/speech.js`), `afterVoiceTurn` (3.5).
- Produces: `checkForm({ entryIdx, setIdx }) -> Promise<'done'|'offline'|'failed'>` — pose → sync → `requestForm` (409 → sync + retry once → `'offline'`) → `active.entries[e].sets[s].form = { ...result, at }` via `update` → announcement `"<summary> <first cue>"` wrapped in `afterVoiceTurn`: `currentLiveSession()?.isOpen()` → `sendText("Tell the user briefly: " + text)`, else `speak` (never both).
- [ ] **Step 1:** Tests: live open → `sendText` only; live closed → `speak` with `lang: 'en-US'` only; voice turn active → deferred until `endVoiceTurn`; result stored on the set; 409 twice → `'offline'` (**Review Focus 4**).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: analyse set videos and speak form feedback"`

### Task 4.5: E2E — form video and offline

**Files:**
- Create: `frontend/e2e/form.spec.js`, `frontend/e2e/offline.spec.js`; extend `make-fixtures.mjs` to write `squat-landmarks.json` (synthetic 5-rep frames) and `clip.mp4` (2 s solid colour, via the browser's `MediaRecorder` in a Playwright page or a tiny ffmpeg-free generator; if neither works, commit a 2 s solid-colour mp4 you encode once and note how)

- [ ] **Step 1:** Flow 6: inject `__KINETIX_POSE_FIXTURE__`, upload `clip.mp4` to a squat set → 5 reps → form job (fixture) → feedback under the video; a page-side spy confirms `speak` ran. Extra test skipped unless `e2e/fixtures/squat-5reps.mp4` exists: real MediaPipe counts 5 ± 1 reps.
- [ ] **Step 2:** Flow 7: `context.setOffline(true)` → log two sets → online → a second context sees both sets.
- [ ] **Step 3:** `npm run e2e` → PASS. **Commit** `git commit -m "test(e2e): form analysis and offline sync"`; merge phase, push, smoke once.

---

## Phase 5 — iOS and the home server (`kinetix/p5-ios`)

### Task 5.1: iOS identity and entitlements

**Files:**
- Create: `frontend/scripts/check-ios-identity.mjs`
- Modify: `frontend/ios/App/App.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER` ~:620, ~:648 → `io.github.neurodev204.kinetix`; App target `IPHONEOS_DEPLOYMENT_TARGET` → `16.4`), `frontend/ios/App/Podfile` (`platform :ios, '16.4'`), `frontend/ios/App/App/App.entitlements` (remove `com.apple.developer.associated-domains` and `com.apple.developer.nfc.readersession.formats`; app group → `group.io.github.neurodev204.kinetix`), `frontend/ios/App/App/Info.plist` (`CFBundleDisplayName` Kinetix; `BAAppGroupID` new group; remove `NSSupportsLiveActivities` and `NFCReaderUsageDescription`), `frontend/ios/App/App/WorkoutActivity.swift` (`OpenGymGroup` id → new group), `frontend/src/lib/live-activity.js:565` (platform list `['android']` so iOS gets null)
- Test: the check script + `frontend/src/lib/live-activity.kinetix.test.js` (`livePlugin()` resolves null on iOS)

**Interfaces:**
- Produces: `node frontend/scripts/check-ios-identity.mjs` exits 0 only when: both bundle ids are new; entitlements have no associated-domains or nfc; every `group.` string under `frontend/ios/App/App/` equals the new group; `UIBackgroundModes` contains `audio`; display name Kinetix; deployment target 16.4.
- [ ] **Step 1:** Write the script → exit 1. **Step 2:** Edits → exit 0. **Step 3:** vitest + `npm run check:native-localizations` green.
- [ ] **Step 4: Commit** `git commit -m "feat(ios): Kinetix identity, free-team entitlements, iOS 16.4"`

### Task 5.2: Unsigned IPA workflow and simulator job

**Files:**
- Create: `.github/workflows/ios-ipa.yml`
- Modify: `.github/workflows/ios.yml` (simulator job: remove `add-asset-downloader.rb` (~:99), `add-watch-app.rb` (~:102), `add-widgets.rb` (~:123), `add-garmin.rb` (~:127) steps and any test step that needs the watch target; launch bundle id → `io.github.neurodev204.kinetix` (~:164-190); drop the widget `.appex` assertion (~:197); `ui-tests` job keeps only `add-ui-tests.rb`; delete the `device-archive` job (~:452-501))

**Interfaces:**
- Produces: `ios-ipa.yml` — `on: workflow_dispatch` and `push: tags: ['v*']`; one macOS job copied from the old `device-archive` job without the `add-*.rb` steps, plus `node frontend/scripts/check-ios-identity.mjs`; artifact `kinetix-unsigned-ipa` containing `Kinetix-unsigned.ipa`.
- [ ] **Step 1:** Push the branch; `gh workflow run ios-ipa.yml --ref kinetix/p5-ios`; wait with a Monitor/ScheduleWakeup check every ~8 minutes until `gh run list --workflow ios-ipa.yml --limit 1` is completed.
- [ ] **Step 2:** Failure → `gh run view <id> --log-failed` → fix (Swift errors from Task 3.5 surface here) → rerun; each rerun counts toward the 3-attempt rule.
- [ ] **Step 3:** Success → download the artifact into the session scratchpad, `unzip -l` lists `Payload/App.app/`; run `gh workflow run ios.yml --ref kinetix/p5-ios` and require the simulator job green.
- [ ] **Step 4: Commit** `git commit -m "ci: unsigned Kinetix IPA workflow; App-only simulator build"`

### Task 5.3: Windows home server script and guide

**Files:**
- Create: `scripts/kinetix/windows-setup.ps1`, `docs/KINETIX_SETUP.md`, `scripts/kinetix/windows-setup.test.mjs`

**Interfaces:**
- Produces: `windows-setup.ps1`, run from the repo folder on the laptop, idempotent:
  1. Check `docker`, `ollama`, `tailscale` exist; print install links and stop if missing.
  2. `[Environment]::SetEnvironmentVariable('OLLAMA_CONTEXT_LENGTH','8192','User')` and `('OLLAMA_HOST','0.0.0.0:11434','User')`; ask the user to restart Ollama.
  3. `ollama pull qwen3.5:4b`.
  4. Create `.env` from `.env.example` if missing; read `GEMINI_API_KEY` with `Read-Host -AsSecureString`, never echo it.
  5. `docker compose up -d --build`.
  6. `docker compose exec api node scripts/kinetix-setup.mjs` (path relative to the api image's `WORKDIR` — check `api/Dockerfile`).
  7. `tailscale serve --bg 8080`; print the `https://<machine>.<tailnet>.ts.net` URL.
  8. Print the iPhone pairing steps.
- `KINETIX_SETUP.md` (Vietnamese): laptop setup; power settings (never sleep while plugged in); pairing (Settings → Account → Pair the mobile app, server = the ts.net URL); installing the IPA with Impactor over USB (Flathub `flatpak install flathub <id from github.com/claration/impactor>`), re-signing every 7 days; data in `./data` on the laptop and how to back it up.
- Test (`node --test`): the script contains each command above; if `pwsh` exists, `pwsh -NoProfile -Command "[ScriptBlock]::Create((Get-Content -Raw scripts/kinetix/windows-setup.ps1)) | Out-Null"` exits 0, else skip.
- [ ] **Step 1–3:** Test → FAIL → write → PASS.
- [ ] **Step 4:** Put the exact commands into `docs/HUMAN_TODO.md`.
- [ ] **Step 5: Commit** `git commit -m "docs: Windows home server setup script and guide"`

### Task 5.4: Final verification and handover

**Files:**
- Modify: `docs/PROGRESS.md`, `docs/HUMAN_TODO.md` (spec §10.3 checklist as checkboxes), `README.md` (feature list + link to `docs/KINETIX_SETUP.md`)

- [ ] **Step 1:** Full gate: in `frontend/`: `npx vitest run && npm run build && node scripts/check-locales.mjs && node scripts/check-source-strings.mjs --strict && npm run check:native-localizations && npm run e2e && node scripts/check-ios-identity.mjs`; in `api/`: `npm test`; at root: `node scripts/build-coach-assets.mjs --check && node scripts/build-api-docs.mjs --check && node api/scripts/check-core-loadable.mjs && node scripts/kinetix/rebrand.mjs --check`.
- [ ] **Step 2:** Smoke once with the real key; record results.
- [ ] **Step 3:** `git ls-files | grep -E '(^|/)\.env$|^data/'` prints nothing.
- [ ] **Step 4:** `## Done` in `docs/PROGRESS.md`: each spec §10.4 criterion with ✓/✗; human ones point to HUMAN_TODO.
- [ ] **Step 5: Commit** `git commit -m "docs: Kinetix handover"`; merge to `main`, push, `gh workflow run ios-ipa.yml --ref main`, link the run in PROGRESS.
