# Trezor R1 Spike — does `@trezor/connect-web` work offline against a default-port proxy?

Phase-0 throwaway spike for the Trezor hardware-wallet-emulator plan.
Gates the transport decision in
[ADR-0003](../../../docs/adr/0003-trezor-transport-boundary.md) ("Approach A"
vs the locked "Approach B" fallback).

## The R1 question

`@trezor/connect-web` (the production SDK) is initialized with **default**
settings — no `connectSrc`, no `transports` override. Its default
`BridgeTransport` posts to port `21328`. We run a transparent HTTP proxy on
that port that forwards to `trezord-go` at `:21325` inside the
`trezor-user-env` container.

**Does `TrezorConnect.getPublicKey()` succeed against the emulator through
that proxy — and crucially, does it work OFFLINE (when `connect.trezor.io` is
unreachable, as in CI)?**

If `connect-web` *requires* its iframe from `connect.trezor.io` and the
iframe cannot load offline, Approach A fails.

## The decision gate (verbatim)

- If connect-web with DEFAULT settings returns a successful `getPublicKey`
  response from the emulator **while offline** (connect.trezor.io blocked) →
  **APPROACH A CONFIRMED**; zero-production-source-change goal holds; proceed
  to Phase 1 as-planned.
- Otherwise → **APPROACH A FAILS**; document the exact failure mode; fall
  back to Approach B (re-run with an injected
  `transports: [new BridgeTransport({ id:'spike', port: 21325 })]` to confirm
  the fallback works); the orchestrator will update the spec/plan to add the
  `IN_TEST` override in `app/offscreen/hardware-wallets/trezor.ts`.

## How to run

> The accounts repo does not ship `playwright`. The spike imports `playwright`
> and `ws` from a **symlinked** `node_modules` that points at the
> `metamask-speculos` checkout (which has Playwright installed with cached
> Chromium browsers). Adaptation chosen: **option (a)** from the plan — share
> the metamask-speculos Playwright install via a local symlink. Documented
> here so the run is reproducible.

```bash
# 0. prerequisites: docker daemon running, metamask-speculos checked out next
#    to accounts.
cd packages/hw-emulator/spike/trezor-r1

# 1. expose playwright + ws to this dir (gitignored)
ln -sfn /Users/montelai/consensys/metamask-speculos/node_modules node_modules

# 2. boot the emulator container
docker compose -f docker-compose.yml up -d
sleep 20   # let the controller + bridge come up

# 3. run the spike (proxy on :21328 + browser probe, online then offline)
node run-spike.mjs 2>&1 | tee spike-result.log

# 4. tear down
docker compose -f docker-compose.yml down
```

## Files

- `docker-compose.yml` — boots `trezor-user-env` (controller `:9001`,
  trezord-go `:21325`, emulator UDP `:21324`).
- `run-spike.mjs` — the driver:
  1. stands up a transparent HTTP proxy on `:21328` → `:21325`;
  2. drives the controller over `ws://127.0.0.1:9001` to boot the emulator,
     load the SLIP-14 seed, and start the bridge;
  3. loads a page with Playwright that calls `TrezorConnect.init()` (default
     settings) + `getPublicKey()` — once ONLINE, once OFFLINE
     (`connect.trezor.io` aborted);
  4. prints an `=== DECISION ===` line.
- `spike-result.log` — captured stdout from the last run.
- `run-approach-b.mjs` — only present if Approach A failed; same probe with
  an injected `transports: [new BridgeTransport({ id, port: 21325 })]` to
  confirm the fallback works.

## Outcome

<!-- Filled in by the spike operator after the run. -->
