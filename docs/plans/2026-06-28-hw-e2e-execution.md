# Hardware-Wallet E2E Expansion — Execution Plan

> **For agentic workers:** Phases 0–1 and 3 are orchestrator-run (shared infra). Phases 2 and 4 dispatch parallel `@fixer` lanes (one per spec). Phase 5 is bounded cleanup. Design/rationale: [`2026-06-28-hardware-wallet-e2e-expansion.md`](./2026-06-28-hardware-wallet-e2e-expansion.md).
>
> **E2E adaptation note:** These specs ARE the tests — there is no separate TDD implementation loop. Each spec task is: port/adapt → run → observe → fix → re-run → commit-when-green. Verification phases establish the green/red baseline before any new spec is written.

**Goal:** 8 green Trezor specs + 8 green QR specs, debug code removed, CI workflows added.

**Run environment:** `cd /Users/montelai/consensys/metamask-speculos`. Chrome for Testing v126 at `/tmp/chrome-mac-arm64/...`. Trezor services via `test/e2e/trezor/setup-log.cjs`.

---

## Phase 0 — Infra Prep (orchestrator-run, blocking)

- [ ] **0.1 Chrome for Testing v126 downloaded** to `/tmp/chrome-mac-arm64/` (running, log `/tmp/hw-e2e-logs/chrome-download.log`).
- [ ] **0.2 `yarn build:test:trezor` completes** (running, log `/tmp/hw-e2e-logs/build-trezor.log`).
- [ ] **0.3 Confirm QR build path:** verify `QR_E2E` / `QR_E2E_Y4M` branch exists in `test/e2e/webdriver/chrome.js` and that QR specs need only standard `yarn build:test` (no plugin). Read `chrome.js`, confirm the fake-camera flag injection.
- [ ] **0.4 Start Trezor services:** `node test/e2e/trezor/setup-log.cjs` in background. Gate on `=== ALL SERVICES READY ===` in output (per handoff Key Decision #7 — do NOT move Docker startup into a `before` hook; memory contention crashes Chrome).
- [ ] **0.5 Smoke-run `trezor-account`** to confirm the pipeline still green before touching anything else:
  ```bash
  SE_BROWSER_PATH="/tmp/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
    TREZOR_E2E=1 yarn env:e2e test:e2e:single \
    test/e2e/tests/hardware-wallets/trezor/trezor-account.spec.ts --browser=chrome
  ```
  Expected: PASS (~14s). If fail → infra regression; stop and diagnose before Phase 1.

---

## Phase 1 — Trezor Verify + Fix (orchestrator-run)

Run each spec, record green/red. Fix reds. **Gate: all 6 green before Phase 2.**

Run command template (replace `<spec>`):
```bash
SE_BROWSER_PATH="/tmp/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  TREZOR_E2E=1 yarn env:e2e test:e2e:single \
  test/e2e/tests/hardware-wallets/trezor/<spec>.spec.ts --browser=chrome
```

- [ ] **1.1** `trezor-account` — baseline (re-run if not done in 0.5).
- [ ] **1.2** `trezor-send` (2 tests: EIP-1559 + legacy loop).
- [ ] **1.3** `trezor-sign` (2 tests: personal + typed v4).
- [ ] **1.4** `trezor-erc20` (4 tests).
- [ ] **1.5** `trezor-erc721` (4 tests).
- [ ] **1.6** `trezor-forget-device` (1 test).
- [ ] **1.7 Fix failures.** Prime suspects (handoff Key Decisions): `corsValidator` wants `localhost`+port 8188 (not `127.0.0.1`); `popup:false` required; Ledger-init-skip active; `lazyLoad:false` under `IN_TEST`; selector drift vs Ledger. Route persistent/unclear root-causes to `@oracle`.
- [ ] **1.8 Delete junk debug files:** `test/e2e/tests/hardware-wallets/trezor/{minimal,test-all-imports,test-headernavbar,test-suite-import}.spec.ts`.

---

## Phase 2 — Trezor Gap-Fill (parallel @fixer lanes)

Each lane: read the Ledger twin → port to Trezor → run → fix → commit. **Handoff constraint pack** for every lane: the 10 Key Decisions from the trezor handoff (localhost/8188, popup:false, Ledger-init-skip, lazyLoad, etc.).

### Task 2A — `trezor-error-modals.spec.ts`
**Files:** Create `test/e2e/tests/hardware-wallets/trezor/trezor-error-modals.spec.ts`. Template: `test/e2e/tests/hardware-wallets/ledger/ledger-error-modals.spec.ts` (2 tests).
- [ ] Port: (1) reject transaction on device → assert no confirmed tx; (2) remove Trezor account from list.
- [ ] Trezor adaptation: rejection path uses the emulator's debug-link (auto-confirm is on; to test *rejection*, the spec must drive a negative decision via the emulator control API — check `trezor-helpers.ts` / `test/e2e/trezor/with-trezor-fixtures.ts` for the reject primitive; if absent, add a helper).
- [ ] Run; fix; commit `test(trezor-e2e): add error-modals spec`.

### Task 2B — `trezor-swap.spec.ts`
**Files:** Create `test/e2e/tests/hardware-wallets/trezor/trezor-swap.spec.ts`. Template: `ledger-swap.spec.ts` (1 test: ETH→mUSD).
- [ ] Port the swap flow; reuse `withTrezorAccount` fixture.
- [ ] Run; fix; commit `test(trezor-e2e): add swap spec`.

---

## Phase 3 — QR Verify + Fix (orchestrator-run)

QR uses **no Docker** — standard build + fake camera. Run command:
```bash
SE_BROWSER_PATH="/tmp/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  QR_E2E=1 yarn env:e2e test:e2e:single \
  test/e2e/tests/hardware-wallets/qr/<spec>.spec.ts --browser=chrome
```
(`qr-account` lives at `test/e2e/tests/hardware-wallets/qr-account.spec.ts` — top level, not in `qr/`.)

- [ ] **3.1** Confirm standard `yarn build:test` is sufficient for QR (no plugin). If a QR-specific build flag is needed, add `build:test:qr` script first.
- [ ] **3.2** `qr-account` (2 tests — slow, 240s suite timeout; fake-camera→zxing round-trip).
- [ ] **3.3** `qr-send` (1 test: EIP-1559).
- [ ] **3.4** `qr-sign` (2 tests).
- [ ] **3.5** `qr-error-modals` (2 tests).
- [ ] **3.6 Fix failures.** Prime suspects: Y4M rendering (`renderPairY4m` in `qr-helpers.ts`); scan timing (keep the 90–240s timeouts); **single-address constraint** — emulator exports only `QR_EMULATOR_ADDRESS` (`m/44'/60'/0'/0/0`); any multi-account assertion fails → collapse to single-account. Route persistent root-causes to `@oracle`.

---

## Phase 4 — QR Gap-Fill (parallel @fixer lanes)

**Constraint for every lane:** single-address only. Do NOT assert on sibling accounts (`/1…/4`) — deferred to qr-emulator spec §13 Phase 6.

### Task 4A — `qr-erc20.spec.ts`
Template: `ledger-erc20.spec.ts` (4 tests: create/transfer/approve/increase-allowance). **Known issue:** Ledger template has a pre-existing LSP error at `ledger-erc20.spec.ts:93` (`Cannot find name 'AssetListPage'`) — fix the import when porting; do not propagate the bug.

### Task 4B — `qr-erc721.spec.ts`
Template: `ledger-erc721.spec.ts` (4 tests: deploy/mint/approve/set-approval-for-all).

### Task 4C — `qr-forget-device.spec.ts`
Template: `ledger-forget-device.spec.ts` (1 test). Note: `qr-account` already has a *remove-account* test; forget-device is the distinct *forget HW device* flow — confirm the page-object path before writing.

### Task 4D — `qr-send.spec.ts` add legacy case
Modify: add a legacy-tx loop case mirroring `trezor-send.spec.ts` (EIP-1559 + legacy). Currently EIP-1559 only.

- [ ] Each task: port → run → fix → commit `test(qr-e2e): add <name> spec`.

---

## Phase 5 — Cleanup + CI (orchestrator + bounded fixer)

- [ ] **5.1 Remove debug code** (handoff item #3): `dbg2()` in trezor handler; `inspect-iframe` message handler; `debugLog()` document.title writes in offscreen init; `offscreen-debug` listener. Files: `app/offscreen/hardware-wallets/trezor.ts`, `app/offscreen/offscreen.ts`. **Caution:** re-run trezor-account after removal to confirm nothing relied on the debug paths.
- [ ] **5.2 `.github/workflows/e2e-trezor.yml`** mirroring `e2e-speculos.yml`: Docker services (trezor-user-env) + CORS proxy + `build:test:trezor` + run `@trezor-e2e` specs.
- [ ] **5.3 `.github/workflows/e2e-qr.yml`**: fake-camera build + run `@qr` specs (no Docker).
- [ ] **5.4 (optional) Update ADR-0003** to reflect final `popup:false` + `connectSrc` approach (zero-source-change goal was not achievable).
- [ ] **5.5 `yarn lint:changed:fix`** on all touched files.

---

## Self-Review (run after writing)

- **Spec coverage:** every missing spec from the design table has a task (2A,2B,4A–4D). ✅
- **Placeholder scan:** port targets name exact Ledger files; no "TODO/implement later". ✅
- **Consistency:** Trezor 6 existing + 2A/2B = 8; QR 4 existing + 4A/4B/4C + 4D(partial) = 8. ✅
