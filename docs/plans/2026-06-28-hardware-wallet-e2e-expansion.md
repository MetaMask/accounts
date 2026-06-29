# Hardware-Wallet E2E Expansion — Trezor + QR

> Created: 2026-06-28
> Status: **Design / awaiting implementation**
> Approach: **Verify-first, then gap-fill** (approved 2026-06-28)
> Scope: Trezor + QR emulators (Ledger already has full coverage and is the template)
> Related: [`specs/trezor-emulator.md`](../specs/trezor-emulator.md), [`specs/qr-emulator.md`](../specs/qr-emulator.md), [`plans/2026-06-20-trezor-emulator.md`](./2026-06-20-trezor-emulator.md), [`../hardware-wallet-emulator-architecture.md`](../hardware-wallet-emulator-architecture.md)

---

## 1. Background & Motivation

The Trezor emulator E2E pipeline is working end-to-end: real protobuf responses flow from `trezor-user-env` Docker → CORS proxy → production `@trezor/connect-web` in the offscreen document. **One** Trezor spec (`trezor-account`) is confirmed passing (13.73s). The QR emulator uses a different, lighter transport — Chrome's fake-camera + an emulator-rendered Y4M video feed into the unmodified `QrKeyringScannerBridge` → `getUserMedia` → `@zxing/browser` → `URDecoder` pipeline.

However, the prior handoff is now **stale**: it claimed "7 remaining Trezor specs pending," but inspection shows **5 of those 7 spec files already exist** as drafts, plus 4 QR specs. Only `trezor-account` has ever been confirmed green. The other **9 existing specs across Trezor + QR are unverified drafts** — well-structured, but never run to green. Writing 6 more specs on top of 9 unverified drafts compounds risk.

This plan closes that gap: verify everything first, fix what's broken, then fill the remaining coverage holes, and finally make the emulators CI-ready.

## 2. Goal

Full Ledger-equivalent E2E coverage for **both** Trezor and QR emulators, with every spec confirmed passing, debug code removed, and CI workflows in place.

**Non-goals:** Ledger changes (it is the template, already green), new emulator features, multi-account derivation for QR (deferred to spec §13 Phase 6 — QR exports only `m/44'/60'/0'/0/0`).

## 3. Current State (verified 2026-06-28)

### Trezor — infra fully built
- `yarn build:test:trezor` ✅, `yarn test:e2e:trezor` ✅, `TrezorPlugin` (raw-asset) ✅, `test/e2e/trezor/setup-log.cjs` ✅
- Transport: Docker `trezor-user-env` → bridge (21329) → CORS proxy (8188) → offscreen `connect-web`

| Spec | Lines | Tests | Status |
|------|-------|-------|--------|
| `trezor-account` | 44 | 1 | ✅ **confirmed passing** |
| `trezor-send` | 59 | 2 (EIP-1559 + legacy loop) | ⚠️ unverified draft |
| `trezor-sign` | 69 | 2 (personal + typed v4) | ⚠️ unverified draft |
| `trezor-erc20` | 251 | 4 | ⚠️ unverified draft |
| `trezor-erc721` | 236 | 4 | ⚠️ unverified draft |
| `trezor-forget-device` | 55 | 1 | ⚠️ unverified draft |
| `trezor-error-modals` | — | — | ❌ missing |
| `trezor-swap` | — | — | ❌ missing |
| `minimal`, `test-all-imports`, `test-headernavbar`, `test-suite-import` | 17–22 | debug | 🗑️ delete (junk) |

### QR — different transport, no Docker
- No `build:test:qr` script, no webpack plugin. Uses standard `build:test` + fake-camera flags (`QR_E2E=1`, `QR_E2M=<path>`) injected in `test/e2e/webdriver/chrome.js`.
- Transport: emulator renders Y4M → Chrome `--use-file-for-fake-video-capture` → production scanner pipeline. Camera decode is slow (5–30s/scan).

| Spec | Lines | Tests | Status |
|------|-------|-------|--------|
| `qr-account` | 194 | 2 | ⚠️ unverified draft |
| `qr-send` | 158 | 1 (EIP-1559 only) | ⚠️ partial — missing legacy |
| `qr-sign` | 134 | 2 (personal + EIP-712 v4) | ⚠️ unverified draft |
| `qr-error-modals` | 181 | 2 | ⚠️ unverified draft |
| `qr-erc20` | — | — | ❌ missing |
| `qr-erc721` | — | — | ❌ missing |
| `qr-forget-device` | — | — | ❌ missing |
| `qr-swap` | — | — | ❌ missing |

### Ledger — the template (9 specs, all green)
`ledger-{account,send,sign,personal-sign,erc20,erc721,error-modals,forget-device,swap}.spec.ts` + `ledger-helpers.ts` + `mocks.ts`. Trezor/QR gap-fills port from these.

## 4. Design

### Phase 0 — Infra prep (one-time, orchestrator-run)
1. Download Chrome for Testing v126 → `/tmp/chrome-mac-arm64` (system Chrome may be incompatible).
2. `cd metamask-speculos && yarn build:test:trezor` (TrezorPlugin build).
3. Confirm QR needs only standard `yarn build:test` (no plugin) — verify the `QR_E2E` branch in `test/e2e/webdriver/chrome.js` is intact.
4. Pre-start Trezor services: `node test/e2e/trezor/setup-log.cjs &` and gate on `=== ALL SERVICES READY ===` (per handoff Key Decision #7 — Docker startup memory contention crashes Chrome if started in a `before` hook).

### Phase 1 — Trezor verify + fix (Trezor first: infra proven)
1. Run all 6 existing Trezor specs; capture green/red baseline.
2. Fix failures. Prime suspects (from handoff §"Key Decisions"):
   - `corsValidator` only accepts `localhost` (not `127.0.0.1`), port 8188.
   - `popup: false` required (offscreen can't `window.open()`).
   - Ledger init must be skipped for Trezor builds.
   - `lazyLoad` must be `false` under `IN_TEST`.
   - Selector drift between Ledger and Trezor UI flows.
3. Delete the 4 junk debug files: `minimal.spec.ts`, `test-all-imports.spec.ts`, `test-headernavbar.spec.ts`, `test-suite-import.spec.ts`.
4. Gate: all 6 existing Trezor specs green before Phase 2.

### Phase 2 — Trezor gap-fill (parallel @fixer lanes)
- `trezor-error-modals.spec.ts` ← port `ledger-error-modals` (reject tx on device + remove account).
- `trezor-swap.spec.ts` ← port `ledger-swap` (ETH → mUSD swap).
- Verify both green. Trezor complete (8 specs).

### Phase 3 — QR verify + fix (QR second: riskier transport)
1. Run all 4 existing QR specs.
2. Fix failures. Prime suspects:
   - Y4M rendering / fake-camera handoff (`renderPairY4m` in `qr-helpers.ts`).
   - Scan timing (specs already carry generous 90–240s timeouts — respect them).
   - **Single-address constraint**: emulator exports only `QR_EMULATOR_ADDRESS` (`m/44'/60'/0'/0/0`). Any assertion on sibling accounts (`/1…/4`) will fail — collapse to single-account scenarios (as `qr-account` already does).
3. Gate: all 4 existing QR specs green before Phase 4.

### Phase 4 — QR gap-fill (parallel @fixer lanes)
- `qr-erc20.spec.ts` ← port `ledger-erc20` (4 tests), single-address adaptation.
- `qr-erc721.spec.ts` ← port `ledger-erc721` (4 tests), single-address adaptation.
- `qr-forget-device.spec.ts` ← port `ledger-forget-device`.
- `qr-swap.spec.ts` ← port `ledger-swap`.
- Add legacy-tx case to `qr-send.spec.ts` (loop EIP-1559 + legacy like `trezor-send`).
- Verify all green. QR complete (8 specs).

### Phase 5 — Cleanup + CI
1. Remove debug code (handoff item #3): `dbg2()` in trezor handler, `inspect-iframe` message handler, `debugLog()` document.title writes in offscreen init, `offscreen-debug` listener.
2. Create `.github/workflows/e2e-trezor.yml` mirroring `e2e-speculos.yml` (Docker services + build + run).
3. Create `.github/workflows/e2e-qr.yml` (fake-camera build + run; no Docker).
4. (Optional) Update ADR-0003 to reflect the final `popup: false` + `connectSrc` approach (the "zero-source-change" goal was not achievable — handoff cleanup item #7).

## 5. Sequencing & Dispatch Model

- **Trezor before QR**: Trezor infra is proven (1 green spec) with documented root causes; QR's fake-camera transport is unproven at the spec level.
- **Verify before write, within each emulator**: broken drafts (shared helpers/fixtures) block new specs.
- **Verification + infra = orchestrator-run** (shared Docker/build; not safely parallelizable).
- **Spec gap-fills = parallel `@fixer` lanes** (one per spec; each is a bounded Ledger→target port).
- **Persistent failures = `@oracle`** for root-cause; `@fixer` for the bounded fix.

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 9 drafts share a systemic helper bug → all red | Verify-first surfaces systemic issues before writing new specs; fix at the helper, not per-spec |
| QR single-address constraint breaks multi-account assertions | Collapse to single-account; defer multi-account to spec §13 Phase 6 |
| Trezor root-cause chain (10 hard-won findings) | Each fixer lane receives the relevant handoff Key Decisions as constraints |
| Slow specs (14–240s each) → long verify loops | Run specs in batches; accept the cost, don't shorten timeouts |
| Chrome for Testing version skew | Pin v126.0.6478.182 (known-good per handoff) |

## 7. Definition of Done

- [ ] 8 Trezor specs green (`account, send, sign, erc20, erc721, error-modals, forget-device, swap`)
- [ ] 8 QR specs green (`account, send[+legacy], sign, error-modals, erc20, erc721, forget-device, swap`)
- [ ] 4 junk Trezor debug files deleted
- [ ] Debug code removed from `trezor.ts` / `offscreen.ts`
- [ ] `e2e-trezor.yml` + `e2e-qr.yml` CI workflows added
- [ ] `yarn lint:changed:fix` clean on all touched files
