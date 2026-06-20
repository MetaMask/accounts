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
#    to accounts (for playwright + ws), metamask-extension checked out next
#    to accounts (for @trezor/connect + @trezor/transport used by Approach B).
cd packages/hw-emulator/spike/trezor-r1

# 1. expose playwright + ws to this dir (gitignored)
ln -sfn /Users/montelai/consensys/metamask-speculos/node_modules node_modules

# 2. cache the SDK script locally (mimics bundling; gitignored)
curl -sS https://connect.trezor.io/9/trezor-connect.js -o trezor-connect.cached.js

# 3. boot the emulator container
docker compose -f docker-compose.yml up -d
sleep 20   # let the controller + bridge come up

# 4. Approach A probe (proxy on :21328 + browser, online then offline)
node run-spike.mjs 2>&1 | tee spike-result.log

# 5. Approach B confirmation (Node SDK + injected transport)
NODE_PATH=/Users/montelai/consensys/metamask-extension/node_modules \
  node run-approach-b.cjs 2>&1 | tee approach-b-result.log

# 6. tear down
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
- `run-approach-b.cjs` — only present if Approach A failed; same probe with
  an injected `transports: [new BridgeTransport({ url, messages, id })]` to
  confirm the fallback works. (Confirmed — see Outcome.)

## Outcome

**Status:** DONE — APPROACH A FAILS → locked Approach B fallback confirmed.

**Decision:** `APPROACH A FAILS → Approach B fallback`.
connect-web with DEFAULT settings fails to reach the emulator both OFFLINE
**and** ONLINE; Approach B (injected `transports: [new BridgeTransport({...})]`)
succeeds and returns the canonical Trezor test-vector xpub for the SLIP-14
seed.

### Three distinct failure modes for Approach A

Run against `ghcr.io/trezor/trezor-user-env:latest` with the SLIP-14 seed
(`all all all …`), proxy on `:21328` → trezord-go on `:21325`, page origin
`http://127.0.0.1:21329` (SDK served from a local static server to mimic
bundling; only the iframe comes from connect.trezor.io).

1. **OFFLINE — iframe can't load (the R1 question, as posed).**
   When `connect.trezor.io` is blocked, the SDK's iframe
   (`https://connect.trezor.io/9/iframe.html?version=9.7.3`) cannot load.
   `getPublicKey()` returns `{success:false, payload:{error:"handshake failed"}}`.
   This is the CI case.

2. **ONLINE — Chrome Private Network Access blocks the loopback fetch
   (a stronger failure than ADR-0003 anticipated).**
   Even when the iframe loads (online), Chrome's Private Network Access
   protection blocks the iframe's fetch from the public origin
   `https://connect.trezor.io` to the loopback transport:
   > `Access to fetch at 'http://127.0.0.1:21328/' from origin 'https://connect.trezor.io' has been blocked by CORS policy: Permission was denied for this request to access the 'loopback' address space.`
   The iframe also tries `http://127.0.0.1:21325/` (trezord-go direct) and
   `ws://127.0.0.1:21335/connect-ws` — same CORS-PNA block / nothing there.
   The page hangs and `getPublicKey()` times out.

3. **iframe-default-port skew vs the npm package.**
   The connect.trezor.io iframe (v9.7.3) does target port `21328` (matching
   ADR-0003's claim about the modern default). However the installed npm
   `@trezor/transport@1.5.0` has `DEFAULT_URL = http://127.0.0.1:21325` and
   `BridgeTransport`'s constructor takes `{url, messages, id}` — **not**
   `{id, port}` as ADR-0003 §"Note on the in-repo TREZOR_REPLICATION_GUIDE.md"
   and §"Decision" imply. The ADR's "verified constructor signature" is wrong
   for v1.5.0; production must pin a version and re-verify.

### Approach B confirmed working

`run-approach-b.cjs` boots the same emulator + bridge and injects
`transports: [new BridgeTransport({ url: 'http://127.0.0.1:21325', messages: Messages, id: 'spike' })]`
into `TrezorConnect.init()`. No iframe, no proxy. `getPublicKey()` returns
`success:true` with xpub
`xpub6DainZd2Amf7GkkBwKLnfBRDBBrWCf9GWCRwjbMJKweKa9MN2xqhbAH5Myh3uJXkna47WLK8qH7NYn4CsasoqAyHxa4BB5daRqaVBfauhMP`
— the canonical Trezor test-vector xpub for `all all all …` at
`m/44'/60'/0'/0`.

> Implementation note: Approach B was confirmed with the Node SDK
> `@trezor/connect` (resolved via `NODE_PATH` from the metamask-extension
> checkout — accounts does not ship `@trezor/*`). The Node SDK has no iframe
> by design; it uses the same `@trezor/transport` `BridgeTransport` code as
> `@trezor/connect-web`'s `transports`-override path. The transport-level
> behavior is therefore identical. (The UMD bundle on connect.trezor.io
> does not expose `BridgeTransport`, so the same proof from a browser page
> would require a bundler step — skipped as out-of-scope for the spike.)

### Caveat the orchestrator should note before Phase 1

This spike ran the SDK from an `http://127.0.0.1` page origin. MetaMask's
**production** deployment runs `@trezor/connect-web` from the offscreen
document, whose origin is `chrome-extension://<id>`. There are two
open questions for Phase 1 to verify directly in the extension context
(both orthogonal to R1's default-settings question, which is now answered):

- **PNA in extension context.** A `chrome-extension://` parent does NOT
  automatically exempt a `https://connect.trezor.io` iframe from PNA —
  PNA is keyed on the **fetch initiator's** origin, not the parent's. So
  failure mode #2 above likely still applies in production unless
  `@trezor/connect-web` auto-detects extension context and switches
  `connectSrc` to a bundled `chrome-extension://` iframe (which IS
  PNA-trusted). If the extension bundles its own iframe, Approach A might
  still be viable in production; otherwise Approach B is mandatory.
- **`BridgeTransport` constructor signature.** Production code must pin a
  `@trezor/transport` version and construct with the version-correct
  signature (`{url, messages, id}` for v1.5.0) — not the `{id, port}`
  shape ADR-0003 specifies.

### Files

- `run-spike.mjs` — Approach A probe (proxy + browser, online + offline).
- `run-approach-b.cjs` — Approach B confirmation (Node SDK + injected transport).
- `spike-result.log` — captured stdout from the Approach A run.
- `approach-b-result.log` — captured stdout from the Approach B run.
- `trezor-connect.cached.js` — gitignored; downloaded once to mimic bundling.

### Required follow-ups for the orchestrator

1. Update **spec §6.1 / §9.3** (transport section) to mandate Approach B:
   add the `if (process.env.IN_TEST) initSettings.transports = [new BridgeTransport({...})]`
   override to `app/offscreen/hardware-wallets/trezor.ts`.
2. Update **ADR-0003** to mark Approach A as **rejected** (not just "at
   risk"); record the PNA failure mode and the constructor-signature
   correction.
3. In Phase 1, decide whether to attempt the "bundled chrome-extension://
   iframe" variant of Approach A (which might restore zero-source-change)
   or commit to Approach B outright. If the latter, G3 (zero production
   source change) does not hold for Trezor — call this out in the spec.
