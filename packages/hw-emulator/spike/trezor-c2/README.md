# Trezor C2 Spike — does `chrome-extension://` offscreen reach `127.0.0.1:21325`?

Bounded follow-up spike to the Trezor R1 work (Phase 0, commits
`fceda3f1` / `685544fc`). Gates whether **C2** — headless `@trezor/connect`
running in a `chrome-extension://` offscreen document — is a viable
transport architecture for the hardware-wallet-emulator plan.

## The C2 question

Phase 0 proved that the public `connect.trezor.io` iframe is PNA-blocked
from loopback (killing the proxy approach), but the **headless Node
`@trezor/connect` SDK** with an injected
`transports:[new BridgeTransport({url:'http://127.0.0.1:21325',messages,id})]`
DID return the real SLIP-14 xpub. MetaMask's offscreen document runs at
`chrome-extension://<id>` — a user-installed-extension origin that Chrome
*may* treat as trusted for loopback (unlike a public web origin). **If so,
running headless `@trezor/connect` IN the offscreen context (C2) reaches
the emulator without PNA.**

This spike confirms or refutes that, in two parts:

- **Part 1 (gating)**: minimal MV3 extension + Playwright — does an
  offscreen-document fetch to `http://127.0.0.1:21325` succeed, fail
  PNA-blocked, or fail permission-denied?
- **Part 2 (only if Part 1 passes)**: bundle the headless Node SDK into
  the offscreen document, inject `BridgeTransport`, call `getPublicKey`,
  verify the canonical SLIP-14 xpub.

## TL;DR — Decision

> **`C2 PNA-VIABLE but BLOCKED by an orthogonal concern (bridge Origin
> whitelist)`**

- The gating question (**does PNA block `chrome-extension://` offscreen →
  loopback?**) is answered **NO** — Part 1 succeeded against a
  CORS-permissive loopback server, both with and without `host_permissions`.
  PNA does NOT block this path. chrome-extension:// origins are evidently
  treated as "local" address space by Chrome 145.
- **HOWEVER**, Part 2 revealed an additional, harder blocker: the real
  `trezord-go` bridge (v2.0.33 in the current `trezor-user-env:latest`
  image) enforces a hardcoded `Origin` whitelist
  (`https://connect.trezor.io`, `https://suite.trezor.io`, …) and
  **returns 403 for `chrome-extension://` origins**. The offscreen
  document's fetch is sent with `Origin: chrome-extension://<id>` (a
  forbidden header the page cannot rewrite), so the bridge rejects it.
- Net: even though the fetch is PNA-allowed, the bridge refuses to talk
  to it. **C2 cannot work against the production bridge as-is.**

See [§ Decision](#decision) for the full recommendation.

---

## How to run

> The accounts repo doesn't ship `playwright`, `ws`, `@trezor/*`, or
> `esbuild`. We import them from a **symlinked** `node_modules` that
> points at the `metamask-speculos` checkout (Playwright + ws) and use
> esbuild from `metamask-extension`'s node_modules for the SDK bundle.
> Same pattern as Phase 0's `trezor-r1/` spike.

```bash
# 0. prerequisites: docker daemon, metamask-speculos + metamask-extension
#    checked out next to accounts.
cd packages/hw-emulator/spike/trezor-c2

# 1. expose playwright + ws to this dir (gitignored)
ln -sfn /Users/montelai/consensys/metamask-speculos/node_modules node_modules

# 2. boot the emulator + trezord-go bridge (Docker image's default node
#    bridge on :21328 doesn't enumerate the emulator in this container;
#    trezord-go on :21325 does — same binary Phase 0 used)
docker compose -f docker-compose.yml up -d
sleep 25   # let the controller come up
NODE_PATH=/Users/montelai/consensys/metamask-speculos/node_modules \
  node boot-bridge-trezord.cjs

# 3. (Part 1a) PNA test against a synthetic CORS-permissive loopback
#    server on :21325 — isolates the PNA question from bridge Origin
#    handling.
NODE_PATH=/Users/montelai/consensys/metamask-speculos/node_modules \
  node loopback-server.cjs &
node run-pna-test.cjs 2>&1 | tee pna-result.log
pkill -f loopback-server.cjs

# 4. (Part 1b) same offscreen-document fetch, but against the REAL
#    trezord-go bridge — surfaces the Origin-whitelist blocker.
NODE_PATH=/Users/montelai/consensys/metamask-speculos/node_modules \
  node boot-bridge-trezord.cjs   # restart trezord-go on :21325
node run-bridge-probe.cjs 2>&1 | tee bridge-probe-result.log

# 5. (Part 2) bundle the headless @trezor/connect SDK + try getPublicKey
#    inside the offscreen document.
node build-connect-bundle.cjs
NODE_PATH=/Users/montelai/consensys/metamask-speculos/node_modules \
  node run-c2-confirm.cjs 2>&1 | tee c2-result.log

# 6. tear down
docker compose -f docker-compose.yml down
```

## Files

- `docker-compose.yml` — boots `trezor-user-env` with `:21325` mapped.
  The `:latest` image ships a Node bridge on `:21328` (modern default)
  AND trezord-go binaries; we explicitly `bridge-start version=2.0.33`
  to get trezord-go on `:21325` (matches Phase 0 + enumerates the
  emulator; the Node bridge doesn't, in this container).
- `loopback-server.cjs` — synthetic CORS-permissive loopback HTTP server
  for the Part 1 PNA-isolation test.
- `boot-bridge-trezord.cjs` / `boot-bridge.cjs` — drive the controller
  over `ws://127.0.0.1:9001` to boot emulator (SLIP-14 seed) + bridge.
  `-trezord` variant pins trezord-go v2.0.33.
- `extension/` — minimal MV3 extension:
  - `manifest.{with,without,c2}.json` — host-permission variants.
  - `background.js` / `background-c2.js` / `background-probe.js` — service
    workers. Each creates the offscreen doc + opens the test page on
    install (so Playwright can find it without computing the extension ID).
  - `offscreen.{html,js}` — Part 1 offscreen (PNA fetch).
  - `offscreen-c2.{html,js}` + `probe-{before,after}.js` — Part 2
    offscreen (loads the SDK bundle + runs `getPublicKey`).
  - `test{,-c2}.{html,js}` — pages Playwright reads for results.
  - `trezor-connect.bundle.js` — gitignored build artifact.
- `run-pna-test.cjs` — Part 1 driver: launches both `with` and `without`
  host_permissions variants, captures per-context fetch outcomes.
- `run-bridge-probe.cjs` — same as PNA test but additionally POSTs
  `/enumerate` against the real trezord-go bridge.
- `run-c2-confirm.cjs` — Part 2 driver.
- `build-connect-bundle.cjs` + `shims/` — esbuild bundling of
  `@trezor/connect` (Node SDK, browser-entry bypass) + browser shims
  (`Buffer` via `inject`, `process`/`global` via banner, `node-fetch`
  native-fetch passthrough, `crypto`/`stream` via browserify,
  `usb`/`dgram`/`@trezor/utxo-lib` stubbed).
- `pna-result.log`, `bridge-probe-result.log`, `c2-result.log` — captured
  stdout from the last runs.

---

## Part 1 results (the gating question — PNA)

Synthetic CORS-permissive loopback server on `:21325` (sends
`Access-Control-Allow-Origin: *` + `Access-Control-Allow-Private-Network:
true`). MV3 extension loaded via `--load-extension`. Chrome 145.

### (a) offscreen-document fetch

```
=== variant: with (host_permissions for http://127.0.0.1:21325/*) ===
offscreen: ok=true status=200 ms=5
            body = {"ok":true,"method":"GET","url":"/","origin":null,"server":"c2-spike-loopback"}

=== variant: without (no host_permissions) ===
offscreen: ok=true status=200 ms=5
            body = {"ok":true,...,"origin":"chrome-extension://hkphombdgohcgdooikjmgbpcgaflnemp",...}
```

### (b) service-worker fetch

Same as (a): HTTP 200 in both variants. (Same `chrome-extension://`
origin as the offscreen doc; sanity check.)

### (c) without `host_permissions`

Both offscreen and SW fetches **succeeded** even without
`host_permissions`. The bridge server received the request with
`Origin: chrome-extension://<id>` and responded 200.

### Part 1 verdict

> **C2 PNA-ALLOWED.** chrome-extension:// origin (offscreen document OR
> service worker) successfully fetched loopback — Chrome 145 treats
> extension origins as "local" address space, so the public→loopback PNA
> rule that kills the connect.trezor.io iframe does NOT apply. **No new
> host_permissions entry is needed** for `127.0.0.1:21325`.

## Additional finding — bridge Origin whitelist (Part 2 blocker)

Re-running the same fetches against the REAL `trezord-go v2.0.33`
(current `trezor-user-env:latest`) instead of the synthetic server
yields a different result:

```
=== bridge probe (real trezord-go on :21325) ===
loopbackGet (offscreen):      ok=false errorMessage="Failed to fetch"
loopbackGet (sw):             ok=false errorMessage="Failed to fetch"
bridgeEnumeratePost (offscreen): ok=false errorMessage="Failed to fetch"
bridgeEnumeratePost (sw):        ok=false errorMessage="Failed to fetch"
```

Diagnosed via curl inside the container:

```
POST /enumerate  (no Origin)                  → HTTP 403
POST /enumerate  Origin: chrome-extension://X → HTTP 403
POST /enumerate  Origin: http://localhost     → HTTP 403
POST /enumerate  Origin: https://suite.trezor.io     → HTTP 200  ✓
POST /enumerate  Origin: https://connect.trezor.io   → HTTP 200  ✓
OPTIONS /enumerate (preflight)                → HTTP 405  (no preflight handling)
```

So `trezord-go v2.0.33` (and v2.0.32) enforces a hardcoded `Origin`
whitelist of Trezor's own web properties only. `chrome-extension://`
origins get 403. **This is independent of PNA and of CORS in the
browser** — it's a server-side rejection before CORS even matters.

> Note the asymmetry: trezord-go REQUIRES `Origin: https://connect.trezor.io`
> (or suite.trezor.io). The connect.trezor.io iframe satisfies this —
> but Phase 0 already showed that origin is PNA-blocked from loopback
> when the page itself is loaded over HTTPS. So in production, the
> offscreen document (chrome-extension://) has the wrong Origin for the
> bridge, while the connect.trezor.io iframe has the right Origin but
> the wrong address-space for PNA. Neither side lines up cleanly for
> the C2 transport architecture.

## Part 2 results (full C2 confirmation)

Bundled headless `@trezor/connect` SDK + injected `BridgeTransport`
loaded into the offscreen document (`build-connect-bundle.cjs`; see
shims/ for the Node→browser polyfills: Buffer via `inject`, process/global
via banner, node-fetch → native fetch, crypto/stream via browserify,
`@trezor/utxo-lib` stubbed — Bitcoin-only code paths not exercised by
Ethereum `getPublicKey`).

SDK `init()` succeeds. `getPublicKey()` returns:

```json
{
  "ok": false,
  "stage": "getPublicKey",
  "success": false,
  "raw": {
    "success": false,
    "payload": { "error": "Transport is missing", "code": "Transport_Missing" }
  }
}
```

The "Transport is missing" error is the SDK's way of saying the
transport reported zero devices. That's because the SDK's POST
`/enumerate` was rejected by the bridge's Origin whitelist (see
above) — the SDK sees no devices and gives up.

> Side note: re-running Phase 0's `run-approach-b.cjs` (Node SDK) against
> the **current** image yields the SAME `Transport is missing` error.
> Phase 0's "Approach B confirmed working" result was against an older
> `trezor-user-env` image whose trezord-go had looser Origin handling
> (no-Origin requests were accepted). The current image's strict Origin
> whitelist breaks Approach B too — this is a regression vs Phase 0 that
> the orchestrator should be aware of.

## Decision

> **`C2 PNA-VIABLE but BLOCKED in practice by the bridge Origin whitelist.`**

- The gating PNA question has a **positive** answer: chrome-extension://
  offscreen documents CAN fetch loopback. **PNA is not the blocker.**
- **A separate, harder blocker exists**: trezord-go's hardcoded Origin
  whitelist rejects chrome-extension:// origins with 403. Browsers
  forbid pages from overriding the `Origin` header, so the offscreen
  document cannot masquerade as `https://connect.trezor.io` to satisfy
  the whitelist.
- **Implication for the plan**: C2 as stated (headless @trezor/connect
  in offscreen, talking DIRECTLY to trezord-go) cannot work in production
  against the bridge as it ships today. Possible unblocks the
  orchestrator should evaluate before locking C2:
  1. **declarativeNetRequest** to rewrite the `Origin` header on
     `127.0.0.1:21325/*` requests to `https://connect.trezor.io`. MV3
     allows header-rewrite rules without host permission prompts for
     declared hosts. This is the cleanest workaround but adds a new
     moving piece to the production extension.
  2. **Local connectSrc iframe (C1)** — bundle the connect-web iframe
     inside the extension so its origin is `chrome-extension://` (which
     is then PNA-trusted, per Part 1) AND somehow satisfies the bridge.
     But the bridge checks Origin = `connect.trezor.io`, not
     `chrome-extension://`, so this fails for the same reason.
  3. **Run a tiny local HTTP shim** between the SDK and trezord-go that
     adds the right Origin. Adds an external process dependency
     (unusable for production).
  4. **Use a different transport** — WebUSB. But offscreen documents
     don't have access to `navigator.usb`, so this requires the
     background service worker or a different extension surface.

  None of (1)–(4) is "drop-in". The cleanest is (1) (DNR origin rewrite),
  but it adds a production source change — which means **G3 (zero
  production source change) does not hold for Trezor**, regardless of
  Approach A vs B vs C2.

## Manifest implication (for the orchestrator)

**No new `host_permissions` entry is needed for C2.** Part 1's "without
host_permissions" variant succeeded against the CORS-permissive server,
and the failure against the real bridge is server-side (`Origin`
whitelist), not browser-permission-side. Adding `127.0.0.1:21325/*` to
`host_permissions` would NOT fix the bridge-Origin rejection.

If the orchestrator pursues option (1) above (DNR Origin rewrite), the
manifest change is a `declarative_net_request` ruleset, NOT a
`host_permissions` addition.

## Caveats / things this spike did NOT verify

- The Origin whitelist is version-dependent. trezord-go v2.0.32 and
  v2.0.33 (current image) reject chrome-extension://. Older versions
  (whatever Phase 0 used) accepted no-Origin requests. **What real
  end-user trezord-go versions do is unverified** — the orchestrator
  should check Trezor's distribution before concluding C2 is impossible
  in production.
- Production MetaMask uses `@trezor/connect-web` (iframe-based), which
  works today. How it sidesteps the Origin whitelist + PNA combo in
  real Chrome against real trezord-go is **out of scope for this spike**
  and worth a separate investigation if Approach A is still on the
  table.
- The synthetic loopback server in Part 1 sends
  `Access-Control-Allow-Private-Network: true`, which is the explicit
  PNA opt-in. If a future Chrome version starts rejecting extension
  origins from loopback without that header, the Part 1 result could
  change. (Today, Chrome 145 treats extension origins as "local" and
  doesn't require the opt-in — but the synthetic server's header means
  Part 1 is technically a "PNA-opt-in" success, not a "PNA-bypass"
  success.)

## Required follow-ups for the orchestrator

1. Update **ADR-0003** with: (a) the Part 1 PNA result (chrome-extension://
   is loopback-trusted), (b) the new bridge-Origin-whitelist blocker,
   (c) the regression note that Phase 0's Approach B no longer works
   against the current image.
2. Re-evaluate the production Trezor transport architecture. The plan's
   current "C2 vs C1 iframe" framing is incomplete — both are blocked
   by the bridge's Origin whitelist. The realistic options are
   declarativeNetRequest Origin rewrite or out-of-process transport.
3. Verify what `trezord-go` versions real MetaMask users run, and
   whether any of those accept `chrome-extension://` origins. (Trezor's
   macOS/Windows installers ship a specific version; the bridge in
   Trezor Suite, etc.) This determines whether the Origin-whitelist
   blocker is fundamental or image-specific.
