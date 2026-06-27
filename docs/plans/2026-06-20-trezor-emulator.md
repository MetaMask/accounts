# Trezor Hardware Wallet Emulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-firmware Trezor emulator to `@metamask/hw-emulator` (wrapping the official `trezor-user-env` Docker image), remove `FakeTrezorBridge`, and ship a full Ledger-parity E2E suite — with one unavoidable production-source line (`popup: false`).

**Architecture:** The "Trezor Suite" approach: `@trezor/transport-bridge` (Suite Node Bridge, UDP mode, `:21328`) + a locally-served connect-web iframe (`http://localhost:8088/`, Origin = localhost → bypasses Chrome PNA) + `window.__TREZOR_CONNECT_SRC` HTML injection (Ledger `navigator.hid` pattern). `@trezor/connect-web` runs with exactly one `IN_TEST`-gated line (`popup: false`). See [spec](../specs/trezor-emulator.md) + [ADR-0003](../adr/0003-trezor-transport-boundary.md).

**Tech Stack:** TypeScript, Jest (unit, `accounts` repo), Playwright/Mocha (E2E, `metamask-speculos` repo), Node `http` + `ws`, Docker Compose, `trezor-user-env` image.

---

## Conventions (read first)

- **Two repos.** `accounts` = `/Users/montelai/consensys/accounts` (emulator core, Jest). `metamask-speculos` = `/Users/montelai/consensys/metamask-speculos` (consumer cleanup + E2E, Playwright/Mocha). Each task states its repo + working directory.
- **AGENTS.md rules apply in both repos:** TypeScript only; colocated `.test.ts`; `yarn lint:changed:fix` before commit; Conventional Commits; never commit unless the user explicitly asks. (This plan marks commit steps — execute them only when the user has authorized committing.)
- **TDD discipline:** write failing test → run (red) → implement → run (green) → lint → commit. No skipping the red step.
- **Reference docs:** [spec](../specs/trezor-emulator.md) (interfaces, data flow, risks), [ADR-0003](../adr/0003-trezor-transport-boundary.md) (transport decision + fallback), [QR spec](../specs/qr-emulator.md) (the template that shipped).
- **The Phase-0 spike gates everything.** Do not start Phase 1 until Phase 0 has a written outcome (Approach A confirmed, or Approach B fallback locked).

---

## Phase 0 — R1 Spike: does connect-web work offline against the proxy on its default port?

**Why first:** This is the only task that can invalidate Goal G3 (zero production source change). If connect-web requires an iframe from `connect.trezor.io` that can't be served offline, we fall back to Approach B (ADR-0003). Resolving it before writing core code prevents rework.

**Repo:** `accounts` (a throwaway spike dir; not shipped). **Working dir:** `accounts/`.

### Task 0.1: Spike scaffolding + trezor-user-env docker-compose

**Files:**
- Create: `accounts/packages/hw-emulator/spike/trezor-r1/docker-compose.yml`
- Create: `accounts/packages/hw-emulator/spike/trezor-r1/README.md`

- [ ] **Step 1: Write the docker-compose for trezor-user-env**

```yaml
# accounts/packages/hw-emulator/spike/trezor-r1/docker-compose.yml
services:
  trezor-user-env:
    image: ghcr.io/trezor/trezor-user-env:latest
    container_name: trezor-spike
    ports:
      - '9001:9001'    # WebSocket controller
      - '21325:21325'  # trezord-go HTTP bridge
      - '21324:21324'  # emulator UDP debug-link (informational)
    restart: 'no'
```

- [ ] **Step 2: Write the spike README (goal + decision criteria)**

```markdown
# R1 Spike — connect-web offline + default-port proxy

**Question:** Does `@trezor/connect-web`, initialised with DEFAULT settings
(no `connectSrc`, no `transports` override), successfully call
`getPublicKey()` against a Trezor emulator reached via a proxy on
BridgeTransport's default port 21328?

**Decision gate:**
- If YES  → ADR-0003 Approach A confirmed; G3 (zero prod source change) holds.
- If NO   → Document the exact failure. Fall back to Approach B: add an
            `IN_TEST` transport override in `app/offscreen/hardware-wallets/trezor.ts`
            per ADR-0003. Update spec §6/§9 to reflect the source change.

**Steps to run:** see run-spike.mjs header.
```

- [ ] **Step 3: Commit**

```bash
git add packages/hw-emulator/spike/trezor-r1/docker-compose.yml packages/hw-emulator/spike/trezor-r1/README.md
git commit -m "chore(hw-emulator): add Trezor R1 spike scaffolding"
```

### Task 0.2: Spike controller client + proxy + connect-web driver

**Files:**
- Create: `accounts/packages/hw-emulator/spike/trezor-r1/run-spike.mjs`

- [ ] **Step 1: Write the spike driver (controller + proxy + headless connect-web check)**

The spike drives `trezor-user-env` over `:9001`, stands up the proxy on `:21328`, then evaluates connect-web's default behavior. Because connect-web needs a browser DOM, the spike uses Playwright (already a dev tool in the workspace) to load a tiny HTML page that calls `TrezorConnect.init()` with NO custom settings, then `getPublicKey()`.

```javascript
// accounts/packages/hw-emulator/spike/trezor-r1/run-spike.mjs
// Run: node run-spike.mjs   (after: docker compose up -d)
// Requires: docker, and a browser build of @trezor/connect-web available via
//           connect.trezor.io ONLINE for the first run (to see if the iframe
//           loads), then OFFLINE (network throttled) to test R1's real question.

import http from 'node:http';
import { WebSocket } from 'ws';
import { chromium } from 'playwright'; // dev dep available in workspace

const PROXY_PORT = 21328;       // connect-web BridgeTransport DEFAULT port
const TREZORD_PORT = 21325;      // trezor-user-env trezord-go
const CONTROLLER = 'ws://127.0.0.1:9001';
const SEED = 'all all all all all all all all all all all all'; // SLIP-14

// --- 1. Transparent HTTP proxy: 21328 -> 21325 ---
function startProxy() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      try {
        const upstream = await fetch(`http://127.0.0.1:${TREZORD_PORT}${req.url}`, {
          method: req.method,
          headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
          body: req.method === 'GET' ? undefined : body,
        });
        const up = Buffer.from(await upstream.arrayBuffer());
        res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
        res.end(up);
      } catch (err) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    server.listen(PROXY_PORT, () => resolve(server));
  });
}

// --- 2. Controller client: boot emulator + load seed ---
function controllerSend(ws, msg) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const onMessage = (data) => {
      let parsed;
      try { parsed = JSON.parse(data.toString()); } catch { return; }
      if (parsed.id === id) {
        ws.off('message', onMessage);
        parsed.success ? resolve(parsed.response) : reject(new Error(JSON.stringify(parsed)));
      }
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify({ ...msg, id }));
  });
}

async function setupEmulator() {
  const ws = new WebSocket(CONTROLLER);
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  await controllerSend(ws, { type: 'emulator-start', model: 'T2T1', wipe: true });
  await controllerSend(ws, {
    type: 'emulator-setup',
    mnemonic: SEED, pin: '', passphrase_protection: false, label: 'Spike',
  });
  await controllerSend(ws, { type: 'bridge-start' });
  return ws;
}

// --- 3. Load a page using @trezor/connect-web with DEFAULT settings ---
async function probeConnectWeb(offline) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  if (offline) {
    // Block the iframe host to simulate offline CI
    await ctx.route('**/*', (route) => {
      if (route.request().url().includes('connect.trezor.io')) return route.abort();
      return route.continue();
    });
  }
  const page = await ctx.newPage();
  const result = { console: [], result: null, error: null };
  page.on('console', (m) => result.console.push(`${m.type()}: ${m.text()}`));
  // Inject connect-web from a CDN (online run) — the offline run blocks this and we observe failure mode
  await page.setContent(`
    <!DOCTYPE html><html><body>
    <script type="module">
      import TrezorConnect from 'https://connect.trezor.io/9/trezor-connect.js';
      try {
        await TrezorConnect.init({
          manifest: { appName: 'spike', appUrl: 'http://localhost', email: 's@p.local' },
          // NOTE: no connectSrc, no transports — DEFAULT settings only
        });
        // Auto-confirm on device for the duration of the spike
        TrezorConnect.on('DEVICE_EVENT', () => {});
        const r = await TrezorConnect.getPublicKey({ path: "m/44'/60'/0'/0", coin: 'eth' });
        document.getElementById('out').textContent = JSON.stringify(r);
      } catch (e) {
        document.getElementById('out').textContent = 'ERROR: ' + e.message;
      }
    </script>
    <pre id="out">pending</pre>
    </body></html>
  `);
  try {
    await page.waitForFunction(() => document.getElementById('out').textContent !== 'pending', null, { timeout: 30000 });
    result.result = await page.locator('#out').textContent();
  } catch (e) {
    result.error = String(e);
  }
  await browser.close();
  return result;
}

// --- 4. Run + report ---
const proxy = await startProxy();
console.log(`[proxy] listening on :${PROXY_PORT} -> :${TREZORD_PORT}`);
const ctl = await setupEmulator();
console.log('[controller] emulator + bridge ready');

console.log('\n=== RUN 1: ONLINE (iframe can load) ===');
const online = await probeConnectWeb(false);
console.log(JSON.stringify(online, null, 2));

console.log('\n=== RUN 2: OFFLINE (connect.trezor.io blocked — simulates CI) ===');
const offlineRun = await probeConnectWeb(true);
console.log(JSON.stringify(offlineRun, null, 2));

console.log('\n=== DECISION ===');
if (offlineRun.result && offlineRun.result.includes('"success":true')) {
  console.log('APPROACH A CONFIRMED — default config works offline; G3 holds.');
} else {
  console.log('APPROACH A FAILS offline — adopt Approach B (IN_TEST transport override).');
  console.log('Failure mode:', offlineRun.error ?? offlineRun.result ?? offlineRun.console.slice(-5));
}

proxy.close(); ctl.close();
```

- [ ] **Step 2: Boot trezor-user-env and run the spike**

```bash
cd accounts/packages/hw-emulator/spike/trezor-r1
docker compose up -d
# wait ~20s for the controller + bridge to come up
node run-spike.mjs 2>&1 | tee spike-result.log
```

Expected: two JSON blocks printed + a `=== DECISION ===` line stating either `APPROACH A CONFIRMED` or `APPROACH A FAILS offline`.

- [ ] **Step 3: Record the outcome in the spike README**

Append the `=== DECISION ===` line + the offline-run JSON to `README.md` under a `## Outcome` heading. If Approach A failed, also note the exact override that makes it work (re-run with `transports: [new BridgeTransport({ id:'spike', port: 21325 })]` injected to confirm the fallback succeeds).

- [ ] **Step 4: Commit the spike outcome**

```bash
git add packages/hw-emulator/spike/trezor-r1/run-spike.mjs packages/hw-emulator/spike/trezor-r1/README.md packages/hw-emulator/spike/trezor-r1/spike-result.log
git commit -m "chore(hw-emulator): record Trezor R1 spike outcome"
```

> **Gate:** Do not proceed to Phase 1 until the spike README has a recorded `## Outcome`. If Approach B was forced, update [spec §6.1](../specs/trezor-emulator.md) and §9.3 to add the `IN_TEST` transport override in `trezor.ts` before continuing — every downstream task assumes the locked transport decision.

---

## Phase 1 — Core emulator (`accounts/packages/hw-emulator/src/trezor/`)

**Repo:** `accounts`. **Working dir:** `accounts/packages/hw-emulator/`. **Tests:** Jest, colocated `.test.ts`.

### Task 1.1: Constants + types

**Files:**
- Create: `src/trezor/constants.ts`
- Create: `src/trezor/constants.test.ts`
- Create: `src/trezor/model-profiles.ts` (forward-declared types only here; filled in Task 1.2)

- [ ] **Step 1: Write the failing test for constants**

```typescript
// src/trezor/constants.test.ts
import {
  TREZOR_EMULATOR_SEED,
  TREZOR_DEFAULT_MODEL,
  TREZOR_BRIDGE_PROXY_PORT,
  TREZOR_BRIDGE_PORT,
  TREZOR_CONTROLLER_PORT,
  TREZOR_MSG,
} from './constants';

describe('trezor constants', () => {
  it('exposes the SLIP-14 canonical seed', () => {
    expect(TREZOR_EMULATOR_SEED).toBe('all all all all all all all all all all all all');
  });

  it('defaults to Model T (T2T1)', () => {
    expect(TREZOR_DEFAULT_MODEL).toBe('T2T1');
  });

  it('uses connect-web BridgeTransport default port (21328) for the proxy', () => {
    expect(TREZOR_BRIDGE_PROXY_PORT).toBe(21328);
  });

  it('targets trezord-go on 21325', () => {
    expect(TREZOR_BRIDGE_PORT).toBe(21325);
  });

  it('targets the WS controller on 9001', () => {
    expect(TREZOR_CONTROLLER_PORT).toBe(9001);
  });

  it('maps the Ethereum signing protobuf message type ids', () => {
    expect(TREZOR_MSG.EthereumSignTx).toBe(58);
    expect(TREZOR_MSG.EthereumSignMessage).toBe(60);
    expect(TREZOR_MSG.EthereumSignTypedData).toBe(495);
  });
});
```

- [ ] **Step 2: Run — verify red**

```bash
yarn jest src/trezor/constants.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement constants**

```typescript
// src/trezor/constants.ts
import type { TrezorModel } from './model-profiles';

/** Canonical SLIP-14 test mnemonic (matches trezor-connect's own test preset). */
export const TREZOR_EMULATOR_SEED =
  'all all all all all all all all all all all all';

/** Default model: Trezor Model T / Safe 3 (touchscreen, flagship). */
export const TREZOR_DEFAULT_MODEL: TrezorModel = 'T2T1';

/** connect-web BridgeTransport DEFAULT port — the proxy listens here. */
export const TREZOR_BRIDGE_PROXY_PORT = 21328;

/** trezord-go HTTP bridge port (mapped from the container). */
export const TREZOR_BRIDGE_PORT = 21325;

/** trezor-user-env WebSocket controller port. */
export const TREZOR_CONTROLLER_PORT = 9001;

/** Emulator UDP debug-link port (informational). */
export const TREZOR_EMULATOR_PORT = 21324;

/** Trezor protobuf message type IDs used for signing detection. */
export const TREZOR_MSG = {
  EthereumSignTx: 58,
  EthereumSignMessage: 60,
  EthereumSignTypedData: 495,
} as const;

/** Models supported by trezor-user-env. (Type re-exported for convenience.) */
export type { TrezorModel };
```

- [ ] **Step 4: Create the model-profiles types placeholder (filled in Task 1.2)**

```typescript
// src/trezor/model-profiles.ts
export type TrezorModel = 'T1B1' | 'T2T1' | 'T3B1' | 'T3T1' | 'T3W1';
// ModelProfile + MODEL_PROFILES added in Task 1.2.
```

- [ ] **Step 5: Run — verify green**

```bash
yarn jest src/trezor/constants.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 6: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/constants.ts src/trezor/constants.test.ts src/trezor/model-profiles.ts
git commit -m "feat(hw-emulator/trezor): add constants and model type"
```

### Task 1.2: Model profiles

**Files:**
- Modify: `src/trezor/model-profiles.ts`
- Create: `src/trezor/model-profiles.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/trezor/model-profiles.test.ts
import { MODEL_PROFILES, type TrezorModel, type ModelProfile } from './model-profiles';

const ALL_MODELS: TrezorModel[] = ['T1B1', 'T2T1', 'T3B1', 'T3T1', 'T3W1'];

describe('MODEL_PROFILES', () => {
  it('has a profile for every supported model', () => {
    for (const model of ALL_MODELS) {
      expect(MODEL_PROFILES[model]).toBeDefined();
    }
  });

  it('T1B1 uses physical buttons (press-yes/press-no)', () => {
    expect(MODEL_PROFILES.T1B1.interaction).toBe('button');
    expect(MODEL_PROFILES.T1B1.confirm).toBe('press-yes');
    expect(MODEL_PROFILES.T1B1.reject).toBe('press-no');
    expect(MODEL_PROFILES.T1B1.layout).toBe('oled-128x64');
  });

  it('touchscreen models use click coordinates', () => {
    for (const model of ['T2T1', 'T3B1', 'T3T1', 'T3W1'] as TrezorModel[]) {
      const p = MODEL_PROFILES[model];
      expect(p.interaction).toBe('touch');
      expect(p.layout).toBe('touch-240x280');
      expect(typeof p.confirm).toBe('object');
      expect((p.confirm as { click: { x: number; y: number } }).click).toBeDefined();
    }
  });

  it('every profile has confirm + reject actions matching its interaction paradigm', () => {
    for (const model of ALL_MODELS) {
      const p: ModelProfile = MODEL_PROFILES[model];
      if (p.interaction === 'button') {
        expect(p.confirm).toBe('press-yes');
        expect(p.reject).toBe('press-no');
      } else {
        expect((p.confirm as { click: unknown }).click).toBeDefined();
        expect((p.reject as { click: unknown }).click).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 2: Run — verify red** (`yarn jest src/trezor/model-profiles.test.ts` → FAIL, `MODEL_PROFILES` undefined).

- [ ] **Step 3: Implement profiles**

```typescript
// src/trezor/model-profiles.ts
export type TrezorModel = 'T1B1' | 'T2T1' | 'T3B1' | 'T3T1' | 'T3W1';
export type Interaction = 'button' | 'touch';

export type PressAction =
  | 'press-yes'
  | 'press-no'
  | { click: { x: number; y: number } };

export interface ModelProfile {
  model: TrezorModel;
  interaction: Interaction;
  layout: 'oled-128x64' | 'touch-240x280';
  confirm: PressAction;
  reject: PressAction;
  /** Swipe direction used to scroll through long transaction summaries. */
  scrollApproach?: 'swipe-up' | 'swipe-down';
}

/**
 * Per-model device-interaction config.
 *
 * Touchscreen confirm/reject coordinates are firmware-layout-dependent.
 * T2T1 (Model T) values are validated against trezor-user-env; the Safe 5
 * family (T3*) coords are best-effort and may need tuning if a firmware
 * bump shifts the confirm button (see spec §12.2 R2).
 */
export const MODEL_PROFILES: Record<TrezorModel, ModelProfile> = {
  T1B1: {
    model: 'T1B1',
    interaction: 'button',
    layout: 'oled-128x64',
    confirm: 'press-yes',
    reject: 'press-no',
  },
  T2T1: {
    model: 'T2T1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
  T3B1: {
    model: 'T3B1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
  T3T1: {
    model: 'T3T1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
  T3W1: {
    model: 'T3W1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
};
```

- [ ] **Step 4: Run — verify green** (`yarn jest src/trezor/model-profiles.test.ts` → PASS).
- [ ] **Step 5: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/model-profiles.ts src/trezor/model-profiles.test.ts
git commit -m "feat(hw-emulator/trezor): add model profiles for all 5 models"
```

### Task 1.3: TrezorControllerClient (WebSocket client to :9001)

**Files:**
- Create: `src/trezor/controller-client.ts`
- Create: `src/trezor/controller-client.test.ts`

- [ ] **Step 1: Write failing tests (mocked WebSocket)**

```typescript
// src/trezor/controller-client.test.ts
import { EventEmitter } from 'events';
import { TrezorControllerClient } from './controller-client';

// Minimal WS stub: captures sent frames, lets the test inject replies.
class MockSocket extends EventEmitter {
  sent: any[] = [];
  readyState = 1; // OPEN
  send(payload: string) { this.sent.push(JSON.parse(payload)); }
  close() { this.readyState = 3; this.emit('close'); }
  // Test helper: reply to a sent command by id.
  reply(id: string, response: unknown, success = true) {
    this.emit('message', Buffer.from(JSON.stringify({ id, success, response })));
  }
}

describe('TrezorControllerClient', () => {
  it('sends emulator-start with a generated id and resolves on the matching reply', async () => {
    const sock = new MockSocket();
    const client = new TrezorControllerClient({ socketFactory: async () => sock });
    const pending = client.emulatorStart({ model: 'T2T1', wipe: true });
    await new Promise((r) => setImmediate(r));
    expect(sock.sent).toEqual([
      expect.objectContaining({ type: 'emulator-start', model: 'T2T1', wipe: true, id: expect.any(String) }),
    ]);
    sock.reply(sock.sent[0].id, { ok: true });
    await expect(pending).resolves.toEqual({ ok: true });
  });

  it('rejects when the controller returns success:false', async () => {
    const sock = new MockSocket();
    const client = new TrezorControllerClient({ socketFactory: async () => sock });
    const pending = client.emulatorSetup({ mnemonic: 'x', pin: '', passphrase_protection: false, label: 't' });
    await new Promise((r) => setImmediate(r));
    sock.reply(sock.sent[0].id, { error: 'bad mnemonic' }, false);
    await expect(pending).rejects.toThrow('bad mnemonic');
  });

  it('maps approve/reject to emulator-press-yes/no', async () => {
    const sock = new MockSocket();
    const client = new TrezorControllerClient({ socketFactory: async () => sock });
    client.pressYes();
    client.pressNo();
    await new Promise((r) => setImmediate(r));
    expect(sock.sent.map((s) => s.type)).toEqual(['emulator-press-yes', 'emulator-press-no']);
  });

  it('maps a touchscreen click to emulator-click with coords', async () => {
    const sock = new MockSocket();
    const client = new TrezorControllerClient({ socketFactory: async () => sock });
    client.click({ x: 120, y: 200 });
    await new Promise((r) => setImmediate(r));
    expect(sock.sent[0]).toEqual(expect.objectContaining({ type: 'emulator-click', x: 120, y: 200 }));
  });
});
```

- [ ] **Step 2: Run — verify red** (`yarn jest src/trezor/controller-client.test.ts` → FAIL, module not found).

- [ ] **Step 3: Implement the client**

```typescript
// src/trezor/controller-client.ts
import { randomUUID } from 'node:crypto';
import type { EventEmitter } from 'events';
import { TREZOR_CONTROLLER_PORT } from './constants';
import type { TrezorModel } from './model-profiles';

export interface ControllerClientOptions {
  host?: string;
  port?: number;
  /** Injectable for tests. Default opens a real `ws` WebSocket. */
  socketFactory?: (url: string) => Promise<EventEmitter & { send(payload: string): void; close(): void }>;
}

export interface SetupParams {
  mnemonic: string;
  pin: string;
  passphrase_protection: boolean;
  label: string;
  needs_backup?: boolean;
}

type WireSocket = EventEmitter & { send(payload: string): void; close(): void };

export class TrezorControllerClient {
  readonly #url: string;
  readonly #socketFactory: (url: string) => Promise<WireSocket>;
  #socket: WireSocket | null = null;
  #pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(opts: ControllerClientOptions = {}) {
    const host = opts.host ?? '127.0.0.1';
    const port = opts.port ?? TREZOR_CONTROLLER_PORT;
    this.#url = `ws://${host}:${port}/`;
    this.#socketFactory = opts.socketFactory ?? defaultFactory;
  }

  async connect(): Promise<void> {
    this.#socket = await this.#socketFactory(this.#url);
    this.#socket.on('message', (data: Buffer) => this.#onMessage(data));
    this.#socket.on('close', () => this.#rejectAll(new Error('controller socket closed')));
  }

  async disconnect(): Promise<void> {
    this.#socket?.close();
    this.#socket = null;
  }

  #onMessage(data: Buffer): void {
    let msg: any;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    const pending = this.#pending.get(msg.id);
    if (!pending) return;
    this.#pending.delete(msg.id);
    msg.success ? pending.resolve(msg.response) : pending.reject(new Error(msg.error ?? 'controller error'));
  }

  #rejectAll(err: Error): void {
    for (const [, p] of this.#pending) p.reject(err);
    this.#pending.clear();
  }

  protected send<T>(msg: Record<string, unknown>): Promise<T> {
    if (!this.#socket) return Promise.reject(new Error('not connected'));
    const id = randomUUID();
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.#socket!.send(JSON.stringify({ ...msg, id }));
    });
  }

  // ── controller commands ──────────────────────────────────────────────
  emulatorStart(p: { model: TrezorModel; wipe?: boolean }): Promise<unknown> {
    return this.send({ type: 'emulator-start', ...p });
  }
  emulatorSetup(p: SetupParams): Promise<unknown> {
    return this.send({ type: 'emulator-setup', ...p });
  }
  bridgeStart(): Promise<unknown> { return this.send({ type: 'bridge-start' }); }
  bridgeStop(): Promise<unknown> { return this.send({ type: 'bridge-stop' }); }
  backgroundCheck(): Promise<unknown> { return this.send({ type: 'background-check' }); }
  ping(): Promise<unknown> { return this.send({ type: 'ping' }); }

  // ── device interaction ───────────────────────────────────────────────
  pressYes(): Promise<unknown> { return this.send({ type: 'emulator-press-yes' }); }
  pressNo(): Promise<unknown> { return this.send({ type: 'emulator-press-no' }); }
  input(value: string): Promise<unknown> { return this.send({ type: 'emulator-input', value }); }
  click(p: { x: number; y: number }): Promise<unknown> {
    return this.send({ type: 'emulator-click', x: p.x, y: p.y });
  }
  swipe(direction: 'up' | 'down' | 'left' | 'right'): Promise<unknown> {
    return this.send({ type: 'emulator-swipe', direction });
  }
  async getScreenshot(): Promise<Buffer> {
    const resp: any = await this.send({ type: 'emulator-get-screenshot' });
    return Buffer.from(resp.base64 ?? resp, 'base64');
  }
}

async function defaultFactory(url: string): Promise<WireSocket> {
  const { WebSocket } = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url) as unknown as WireSocket & { on(e: string, cb: (...a: any[]) => void): any };
    ws.on('open', () => resolve(ws as WireSocket));
    ws.on('error', reject);
  });
}
```

- [ ] **Step 4: Run — verify green** (`yarn jest src/trezor/controller-client.test.ts` → PASS).
- [ ] **Step 5: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/controller-client.ts src/trezor/controller-client.test.ts
git commit -m "feat(hw-emulator/trezor): add TrezorControllerClient (WS :9001 protocol)"
```

### Task 1.4: TrezorBridgeProxy (HTTP :21328 → :21325 + signing detection + error injection)

**Files:**
- Create: `src/trezor/bridge-proxy.ts`
- Create: `src/trezor/bridge-proxy.test.ts`

- [ ] **Step 1: Write failing tests (stubbed upstream)**

```typescript
// src/trezor/bridge-proxy.test.ts
import http from 'node:http';
import { TrezorBridgeProxy } from './bridge-proxy';
import { TREZOR_MSG } from './constants';

// Stand up a fake trezord-go on an ephemeral port; the proxy will forward to it.
function startFakeBridge(handler: (req: http.IncomingMessage, body: Buffer) => { status: number; body: string }) {
  return new Promise<{ server: http.Server; port: number; close(): Promise<void> }>((resolve) => {
    const server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const { status, body } = handler(req, Buffer.concat(chunks));
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(body);
    });
    server.listen(0, () => resolve({
      server,
      port: (server.address() as any).port,
      close: () => new Promise((r) => server.close(() => r())),
    }));
  });
}

// Hex-encode a fake protobuf message: [msgType:u16 BE][length:u32 BE][payload]
function protoHex(msgType: number, payload = ''): string {
  const buf = Buffer.alloc(6 + Buffer.byteLength(payload, 'hex'));
  buf.writeUInt16BE(msgType, 0);
  buf.writeUInt32BE(Buffer.byteLength(payload, 'hex'), 2);
  Buffer.from(payload, 'hex').copy(buf, 6);
  return buf.toString('hex');
}

describe('TrezorBridgeProxy', () => {
  it('forwards /enumerate transparently to the upstream trezord-go', async () => {
    const upstream = await startFakeBridge(() => ({ status: 200, body: JSON.stringify([{ path: '1' }]) }));
    const proxy = new TrezorBridgeProxy({ listenPort: 0, upstreamPort: upstream.port });
    await proxy.start();
    const r = await fetch(`http://127.0.0.1:${proxy.getPort()}/enumerate`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual([{ path: '1' }]);
    await proxy.stop(); await upstream.close();
  });

  it('detects EthereumSignTx (msgType 58) and emits signing-call', async () => {
    const upstream = await startFakeBridge(() => ({ status: 200, body: protoHex(0) })); // dummy response
    const proxy = new TrezorBridgeProxy({ listenPort: 0, upstreamPort: upstream.port });
    await proxy.start();
    const seen = new Promise<void>((res) => proxy.once('signing-call', () => res()));
    await fetch(`http://127.0.0.1:${proxy.getPort()}/call/sess1`, {
      method: 'POST', body: protoHex(TREZOR_MSG.EthereumSignTx),
    });
    await expect(seen).resolves.toBeUndefined();
    await proxy.stop(); await upstream.close();
  });

  it('does NOT emit signing-call for non-signing message types', async () => {
    const upstream = await startFakeBridge(() => ({ status: 200, body: protoHex(0) }));
    const proxy = new TrezorBridgeProxy({ listenPort: 0, upstreamPort: upstream.port });
    await proxy.start();
    let fired = false;
    proxy.on('signing-call', () => { fired = true; });
    await fetch(`http://127.0.0.1:${proxy.getPort()}/call/sess1`, { method: 'POST', body: protoHex(11) }); // GetPublicKey=11
    expect(fired).toBe(false);
    await proxy.stop(); await upstream.close();
  });

  it('injectErrorResponse short-circuits the next matching /call', async () => {
    const upstream = await startFakeBridge(() => ({ status: 200, body: protoHex(0) }));
    const proxy = new TrezorBridgeProxy({ listenPort: 0, upstreamPort: upstream.port });
    await proxy.start();
    proxy.injectErrorResponse(TREZOR_MSG.EthereumSignMessage, { error: 'Device disconnected' });
    const r = await fetch(`http://127.0.0.1:${proxy.getPort()}/call/sess1`, {
      method: 'POST', body: protoHex(TREZOR_MSG.EthereumSignMessage),
    });
    expect(await r.json()).toEqual({ error: 'Device disconnected' });
    // Upstream was NOT hit for the injected call:
    await proxy.stop(); await upstream.close();
  });
});
```

- [ ] **Step 2: Run — verify red** (`yarn jest src/trezor/bridge-proxy.test.ts` → FAIL).

- [ ] **Step 3: Implement the proxy**

```typescript
// src/trezor/bridge-proxy.ts
import http from 'node:http';
import { EventEmitter } from 'events';
import { TREZOR_BRIDGE_PROXY_PORT, TREZOR_BRIDGE_PORT, TREZOR_MSG } from './constants';

const SIGNING_MSG_TYPES = new Set<number>([
  TREZOR_MSG.EthereumSignTx,
  TREZOR_MSG.EthereumSignMessage,
  TREZOR_MSG.EthereumSignTypedData,
]);

export interface BridgeProxyOptions {
  listenPort?: number;  // default 21328 (connect-web BridgeTransport default)
  upstreamHost?: string; // default 127.0.0.1
  upstreamPort?: number; // default 21325 (trezord-go)
}

export interface SigningCallEvent {
  msgType: number;
  body: string;
  sessionId: string;
}

export class TrezorBridgeProxy extends EventEmitter {
  readonly #listenPort: number;
  readonly #upstream: string;
  #server: http.Server | null = null;
  #injections = new Map<number, object>(); // msgType -> error payload (one-shot)

  constructor(opts: BridgeProxyOptions = {}) {
    super();
    this.#listenPort = opts.listenPort ?? TREZOR_BRIDGE_PROXY_PORT;
    const host = opts.upstreamHost ?? '127.0.0.1';
    const port = opts.upstreamPort ?? TREZOR_BRIDGE_PORT;
    this.#upstream = `http://${host}:${port}`;
  }

  getPort(): number { return this.#listenPort; }
  isRunning(): boolean { return this.#server?.listening ?? false; }

  async start(): Promise<void> {
    this.#server = http.createServer(async (req, res) => this.#handle(req, res));
    await new Promise<void>((resolve) => this.#server!.listen(this.#listenPort, () => resolve()));
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.#server?.close(() => resolve()));
    this.#server = null;
  }

  injectErrorResponse(msgType: number, errorJson: object): void {
    this.#injections.set(msgType, errorJson);
  }

  clearInjectedErrors(): void { this.#injections.clear(); }

  async #handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks);

    // Signing detection on /call bodies (6-byte protobuf header: [u16 msgType BE][u32 len BE])
    if (req.url?.startsWith('/call/')) {
      const sessionId = req.url.split('/')[2];
      const msgType = parseMessageType(body.toString('ascii')); // body is hex over HTTP
      if (msgType >= 0 && SIGNING_MSG_TYPES.has(msgType)) {
        const injection = this.#injections.get(msgType);
        if (injection) {
          this.#injections.delete(msgType); // one-shot
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(injection));
          return;
        }
        this.emit('signing-call', { msgType, body: body.toString('ascii'), sessionId } satisfies SigningCallEvent);
      }
    }

    // Transparent forward
    try {
      const upstream = await fetch(`${this.#upstream}${req.url}`, {
        method: req.method,
        headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
        body: req.method === 'GET' ? undefined : body,
      });
      const up = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
      res.end(up);
    } catch (err) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String((err as Error).message) }));
    }
  }
}

function parseMessageType(hexBody: string): number {
  const buf = Buffer.from(hexBody, 'hex');
  if (buf.length < 6) return -1;
  return buf.readUInt16BE(0);
}

export function waitForSigningCall(proxy: TrezorBridgeProxy, timeoutMs = 30_000): Promise<SigningCallEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { proxy.removeListener('signing-call', h); reject(new Error('timeout')); }, timeoutMs);
    const h = (e: SigningCallEvent) => { clearTimeout(timer); resolve(e); };
    proxy.once('signing-call', h);
  });
}
```

- [ ] **Step 4: Run — verify green** (`yarn jest src/trezor/bridge-proxy.test.ts` → PASS, 4 tests).
- [ ] **Step 5: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/bridge-proxy.ts src/trezor/bridge-proxy.test.ts
git commit -m "feat(hw-emulator/trezor): add TrezorBridgeProxy (transparent forward + signing detection + error injection)"
```

### Task 1.5: Docker manager (mirrors `ledger/docker-manager.ts`)

**Files:**
- Create: `src/trezor/docker-manager.ts`
- Create: `src/trezor/docker-manager.test.ts`

- [ ] **Step 1: Write failing test (stub `execFileAsync` via injectable runner)**

```typescript
// src/trezor/docker-manager.test.ts
import { TrezorDockerManager } from './docker-manager';

describe('TrezorDockerManager', () => {
  it('runs docker compose up -d with the given compose file', async () => {
    const calls: string[][] = [];
    const mgr = new TrezorDockerManager({
      composeFile: '/tmp/trezor.yml',
      runner: async (file, args) => { calls.push([file, ...args]); return { stdout: '', stderr: '' }; },
    });
    await mgr.start();
    expect(calls[0]).toEqual(['docker', 'compose', '-f', '/tmp/trezor.yml', 'up', '-d']);
  });

  it('runs docker compose down on stop', async () => {
    const calls: string[][] = [];
    const mgr = new TrezorDockerManager({
      composeFile: '/tmp/trezor.yml',
      runner: async (file, args) => { calls.push([file, ...args]); return { stdout: '', stderr: '' }; },
    });
    await mgr.stop();
    expect(calls[0]).toEqual(['docker', 'compose', '-f', '/tmp/trezor.yml', 'down']);
  });
});
```

- [ ] **Step 2: Run — verify red** (`yarn jest src/trezor/docker-manager.test.ts` → FAIL).

- [ ] **Step 3: Implement**

```typescript
// src/trezor/docker-manager.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type DockerRunner = (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export interface DockerManagerOptions {
  composeFile: string;
  runner?: DockerRunner;
}

export class TrezorDockerManager {
  readonly #composeFile: string;
  readonly #runner: DockerRunner;

  constructor(opts: DockerManagerOptions) {
    this.#composeFile = opts.composeFile;
    this.#runner = opts.runner ?? ((file, args) => execFileAsync(file, args));
  }

  async start(): Promise<void> {
    await this.#runner('docker', ['compose', '-f', this.#composeFile, 'up', '-d']);
  }

  async stop(): Promise<void> {
    await this.#runner('docker', ['compose', '-f', this.#composeFile, 'down']);
  }
}
```

- [ ] **Step 4: Run — verify green** (`yarn jest src/trezor/docker-manager.test.ts` → PASS).
- [ ] **Step 5: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/docker-manager.ts src/trezor/docker-manager.test.ts
git commit -m "feat(hw-emulator/trezor): add Docker manager (trezor-user-env lifecycle)"
```

### Task 1.6: Device interaction (multi-model dispatch)

**Files:**
- Create: `src/trezor/device-interaction.ts`
- Create: `src/trezor/device-interaction.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/trezor/device-interaction.test.ts
import { TrezorDeviceInteraction } from './device-interaction';
import { TrezorControllerClient } from './controller-client';
import { MODEL_PROFILES } from './model-profiles';

class FakeController extends TrezorControllerClient {
  calls: string[] = [];
  constructor() { super({ socketFactory: async () => ({}) as any }); }
  override pressYes() { this.calls.push('press-yes'); return Promise.resolve({}); }
  override pressNo() { this.calls.push('press-no'); return Promise.resolve({}); }
  override click(p: { x: number; y: number }) { this.calls.push(`click:${p.x},${p.y}`); return Promise.resolve({}); }
  override swipe(d: 'up'|'down'|'left'|'right') { this.calls.push(`swipe:${d}`); return Promise.resolve({}); }
}

describe('TrezorDeviceInteraction', () => {
  it('T1B1 approve dispatches press-yes', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T1B1);
    await ix.approveTransaction();
    expect(ctl.calls).toEqual(['press-yes']);
  });

  it('T2T1 approve dispatches click at the profile confirm coords', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T2T1);
    await ix.approveTransaction();
    expect(ctl.calls).toEqual(['click:120,200']);
  });

  it('reject dispatches the profile reject action', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T1B1);
    await ix.rejectTransaction();
    expect(ctl.calls).toEqual(['press-no']);
  });

  it('approveSigning is a semantic alias of approveTransaction', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T2T1);
    await ix.approveSigning();
    expect(ctl.calls).toEqual(['click:120,200']);
  });
});
```

- [ ] **Step 2: Run — verify red** (`yarn jest src/trezor/device-interaction.test.ts` → FAIL).

- [ ] **Step 3: Implement**

```typescript
// src/trezor/device-interaction.ts
import type { TrezorControllerClient } from './controller-client';
import type { ModelProfile, PressAction } from './model-profiles';

export interface DeviceInteraction {
  approveTransaction(): Promise<void>;
  approveSigning(): Promise<void>;
  rejectTransaction(): Promise<void>;
  navigateToMainMenu(): Promise<void>;
}

export class TrezorDeviceInteraction implements DeviceInteraction {
  constructor(
    private readonly controller: TrezorControllerClient,
    private readonly profile: ModelProfile,
  ) {}

  async approveTransaction(): Promise<void> { await this.#run(this.profile.confirm); }
  async approveSigning(): Promise<void> { await this.approveTransaction(); }
  async rejectTransaction(): Promise<void> { await this.#run(this.profile.reject); }

  async navigateToMainMenu(): Promise<void> {
    // Best-effort: a couple of swipe-ups returns most layouts to the home screen.
    if (this.profile.scrollApproach) {
      await this.controller.swipe(this.profile.scrollApproach === 'swipe-up' ? 'up' : 'down');
    }
  }

  async #run(action: PressAction): Promise<void> {
    if (action === 'press-yes') { await this.controller.pressYes(); return; }
    if (action === 'press-no') { await this.controller.pressNo(); return; }
    await this.controller.click(action.click);
  }
}
```

- [ ] **Step 4: Run — verify green** (`yarn jest src/trezor/device-interaction.test.ts` → PASS).
- [ ] **Step 5: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/device-interaction.ts src/trezor/device-interaction.test.ts
git commit -m "feat(hw-emulator/trezor): add multi-model device interaction"
```

### Task 1.7: TrezorEmulator orchestrator + derived-address computation

**Files:**
- Create: `src/trezor/trezor-emulator.ts`
- Create: `src/trezor/trezor-emulator.test.ts`
- Modify: `src/trezor/constants.ts` (add `TREZOR_ADDRESSES` / `TREZOR_ADDRESS`)

- [ ] **Step 1: Derive the canonical addresses from the SLIP-14 seed and add to constants**

Run a one-off derivation (Node REPL or a temp script using `hdkey` + `bip39`, already deps of `hw-emulator`):

```bash
node -e "
const bip39 = require('@metamask/bip39');
const hdkey = require('hdkey');
const seed = bip39.mnemonicToSeedSync('all all all all all all all all all all all all');
const root = hdkey.fromMasterSeed(seed);
for (let i = 0; i < 5; i++) {
  const d = root.derive(\"m/44'/60'/0'/0/\" + i);
  const addr = '0x' + require('util').inspect(d.getWallet().getAddressString());
  console.log(i, addr);
}
"
```

Capture the 5 addresses, then extend `constants.ts`:

```typescript
// append to src/trezor/constants.ts
import type { Hex } from '@metamask/utils'; // or the repo's Hex type per AGENTS.md

/** m/44'/60'/0'/0/n (n=0..4) for TREZOR_EMULATOR_SEED. Replace with the real derived values. */
export const TREZOR_ADDRESSES: Record<TrezorModel, Hex[]> = {
  T1B1:  ['0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE'],
  T2T1:  ['0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE'],
  T3B1:  ['0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE'],
  T3T1:  ['0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE'],
  T3W1:  ['0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE', '0x REPLACE'],
};
export const TREZOR_ADDRESS: Hex = TREZOR_ADDRESSES[TREZOR_DEFAULT_MODEL][0];
```

(All five models derive identically at `m/44'/60'/0'/0`; the per-model map is for forward-compat. Fill `REPLACE` with the real values from the derivation output before committing.)

- [ ] **Step 2: Write failing test for TrezorEmulator lifecycle (mocked sub-components)**

```typescript
// src/trezor/trezor-emulator.test.ts
import { TrezorEmulator } from './trezor-emulator';
import { TrezorDockerManager } from './docker-manager';
import { TrezorControllerClient } from './controller-client';
import { TrezorBridgeProxy } from './bridge-proxy';
import { MODEL_PROFILES } from './model-profiles';

describe('TrezorEmulator', () => {
  it('start() brings up docker, controller-setup, and the bridge proxy in order', async () => {
    const order: string[] = [];
    const docker = { start: async () => { order.push('docker'); }, stop: async () => {} } as unknown as TrezorDockerManager;
    const ctl = {
      connect: async () => { order.push('ctl-connect'); },
      ping: async () => { order.push('ping'); return {}; },
      emulatorStart: async () => { order.push('emu-start'); return {}; },
      emulatorSetup: async () => { order.push('emu-setup'); return {}; },
      bridgeStart: async () => { order.push('bridge-start'); return {}; },
      disconnect: async () => {},
      pressYes: async () => ({}), pressNo: async () => ({}),
      click: async () => ({}), swipe: async () => ({}), input: async () => ({}), getScreenshot: async () => Buffer.alloc(0),
    } as unknown as TrezorControllerClient;
    const proxy = {
      start: async () => { order.push('proxy'); },
      stop: async () => {},
      isRunning: () => true, getPort: () => 21328,
      on: () => {}, once: () => {}, emit: () => false,
      injectErrorResponse: () => {}, clearInjectedErrors: () => {},
    } as unknown as TrezorBridgeProxy;

    const emu = new TrezorEmulator({ model: 'T2T1', docker, controller: ctl, bridgeProxy: proxy, composeFile: '/tmp/x.yml' });
    await emu.start();
    expect(order).toEqual(['docker', 'ctl-connect', 'ping', 'emu-start', 'emu-setup', 'bridge-start', 'proxy']);
  });

  it('getInteraction() returns a device interaction bound to the model profile', () => {
    const ctl = {} as unknown as TrezorControllerClient;
    const proxy = {} as unknown as TrezorBridgeProxy;
    const docker = {} as unknown as TrezorDockerManager;
    const emu = new TrezorEmulator({ model: 'T1B1', docker, controller: ctl, bridgeProxy: proxy, composeFile: '/tmp/x.yml' });
    expect(emu.getModel()).toBe('T1B1');
    expect(() => emu.getInteraction()).not.toThrow();
  });
});
```

- [ ] **Step 3: Run — verify red** (`yarn jest src/trezor/trezor-emulator.test.ts` → FAIL).

- [ ] **Step 4: Implement the orchestrator**

```typescript
// src/trezor/trezor-emulator.ts
import type { HardwareWalletEmulator } from '../types';
import type { DeviceInteraction } from './device-interaction';
import { TrezorDeviceInteraction } from './device-interaction';
import type { TrezorDockerManager } from './docker-manager';
import type { TrezorControllerClient } from './controller-client';
import type { TrezorBridgeProxy } from './bridge-proxy';
import { MODEL_PROFILES, type TrezorModel } from './model-profiles';
import { TREZOR_DEFAULT_MODEL, TREZOR_EMULATOR_SEED } from './constants';

export interface TrezorEmulatorOptions {
  model?: TrezorModel;
  seed?: string;
  label?: string;
  composeFile: string;
  // Injectable for tests; production constructs real instances:
  docker?: TrezorDockerManager;
  controller?: TrezorControllerClient;
  bridgeProxy?: TrezorBridgeProxy;
  bridgeProxyPort?: number;
  trezordPort?: number;
  controllerPort?: number;
}

export class TrezorEmulator implements HardwareWalletEmulator {
  readonly #opts: Required<Omit<TrezorEmulatorOptions, 'docker'|'controller'|'bridgeProxy'>>;
  #docker: TrezorDockerManager;
  #controller: TrezorControllerClient;
  #proxy: TrezorBridgeProxy;
  #interaction: TrezorDeviceInteraction | null = null;
  #running = false;

  constructor(opts: TrezorEmulatorOptions) {
    const model = opts.model ?? TREZOR_DEFAULT_MODEL;
    this.#opts = {
      model,
      seed: opts.seed ?? TREZOR_EMULATOR_SEED,
      label: opts.label ?? 'MetaMask Test',
      composeFile: opts.composeFile,
      bridgeProxyPort: opts.bridgeProxyPort ?? 21328,
      trezordPort: opts.trezordPort ?? 21325,
      controllerPort: opts.controllerPort ?? 9001,
    };
    // Allow injection; default-construct lazily (dynamic imports keep the package import-light)
    this.#docker = opts.docker!;
    this.#controller = opts.controller!;
    this.#proxy = opts.bridgeProxy!;
  }

  getModel(): TrezorModel { return this.#opts.model; }
  isRunning(): boolean { return this.#running; }
  getControllerClient(): TrezorControllerClient { return this.#controller; }
  getBridgeProxy(): TrezorBridgeProxy { return this.#proxy; }
  getInteraction(): DeviceInteraction {
    if (!this.#interaction) throw new Error('emulator not started');
    return this.#interaction;
  }
  async getScreenshot(): Promise<Buffer> { return this.#controller.getScreenshot(); }

  async start(): Promise<void> {
    await this.#docker.start();
    await this.#controller.connect();
    await this.#controller.ping();
    await this.#controller.emulatorStart({ model: this.#opts.model, wipe: true });
    await this.#controller.emulatorSetup({
      mnemonic: this.#opts.seed, pin: '', passphrase_protection: false, label: this.#opts.label,
    });
    await this.#controller.bridgeStart();
    await this.#proxy.start();
    this.#interaction = new TrezorDeviceInteraction(this.#controller, MODEL_PROFILES[this.#opts.model]);
    this.#running = true;
  }

  async stop(): Promise<void> {
    await this.#proxy.stop();
    await this.#controller.disconnect();
    await this.#docker.stop();
    this.#interaction = null;
    this.#running = false;
  }

  async approveTransaction(): Promise<void> { await this.getInteraction().approveTransaction(); }
  async approveSigning(): Promise<void> { await this.getInteraction().approveSigning(); }
  async rejectTransaction(): Promise<void> { await this.getInteraction().rejectTransaction(); }
  async navigateToMainMenu(): Promise<void> { await this.getInteraction().navigateToMainMenu(); }
}
```

> **Note:** production (non-test) callers construct `TrezorEmulator` via the factory (Task 1.8), which builds the real `docker`/`controller`/`proxy`. Add a private `buildDefaults()` helper in the factory task that constructs them from options, so the public constructor's `!` non-null assertions are only exercised by tests passing mocks.

- [ ] **Step 5: Run — verify green** (`yarn jest src/trezor/trezor-emulator.test.ts` → PASS).
- [ ] **Step 6: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/trezor-emulator.ts src/trezor/trezor-emulator.test.ts src/trezor/constants.ts
git commit -m "feat(hw-emulator/trezor): add TrezorEmulator orchestrator + derived addresses"
```

### Task 1.8: Barrel + factory wiring

**Files:**
- Create: `src/trezor/index.ts`
- Modify: `src/factory.ts` (replace the Trezor `throw`)
- Modify: `src/index.ts` (re-export public surface)

- [ ] **Step 1: Write the barrel**

```typescript
// src/trezor/index.ts
export { TREZOR_EMULATOR_SEED, TREZOR_DEFAULT_MODEL, TREZOR_BRIDGE_PROXY_PORT, TREZOR_BRIDGE_PORT,
  TREZOR_CONTROLLER_PORT, TREZOR_EMULATOR_PORT, TREZOR_MSG, TREZOR_ADDRESSES, TREZOR_ADDRESS } from './constants';
export { MODEL_PROFILES } from './model-profiles';
export type { TrezorModel, ModelProfile, Interaction, PressAction } from './model-profiles';
export { TrezorControllerClient } from './controller-client';
export type { ControllerClientOptions, SetupParams } from './controller-client';
export { TrezorBridgeProxy, waitForSigningCall } from './bridge-proxy';
export type { BridgeProxyOptions, SigningCallEvent } from './bridge-proxy';
export { TrezorDockerManager } from './docker-manager';
export type { DockerManagerOptions, DockerRunner } from './docker-manager';
export { TrezorDeviceInteraction } from './device-interaction';
export type { DeviceInteraction } from './device-interaction';
export { TrezorEmulator } from './trezor-emulator';
export type { TrezorEmulatorOptions } from './trezor-emulator';
```

- [ ] **Step 2: Wire the factory (replace the throw)**

```typescript
// src/factory.ts — replace:
//   case EmulatorType.Trezor:
//     throw new Error('Trezor emulator is not yet implemented');
// with:
import { TrezorEmulator } from './trezor';
// ...
case EmulatorType.Trezor:
  return new TrezorEmulator(buildTrezorOptions(options));
```

Where `buildTrezorOptions` constructs real `TrezorDockerManager`, `TrezorControllerClient`, `TrezorBridgeProxy` from the loose options bag (defaulting ports per constants). Add `buildTrezorOptions` as a local function in `factory.ts` (or `trezor/index.ts`) — keep it testable.

- [ ] **Step 3: Re-export from the package barrel**

```typescript
// src/index.ts — add:
export * from './trezor';
```

- [ ] **Step 4: Write a factory smoke test (real instances, no start())**

```typescript
// src/factory.test.ts (append, or extend existing factory test)
import { createEmulator, EmulatorType } from './index';

it('createEmulator(Trezor) returns a TrezorEmulator without throwing', () => {
  const emu = createEmulator(EmulatorType.Trezor, { composeFile: '/tmp/x.yml' });
  expect(emu).toBeDefined();
  expect(emu.isRunning()).toBe(false);
});
```

- [ ] **Step 5: Run the full trezor suite + factory test**

```bash
yarn jest src/trezor src/factory.test.ts
```
Expected: all green.

- [ ] **Step 6: Build the package**

```bash
yarn build
```
Expected: clean build, `dist/` includes the trezor module.

- [ ] **Step 7: Lint + commit**

```bash
yarn lint:changed:fix
git add src/trezor/index.ts src/factory.ts src/factory.test.ts src/index.ts
git commit -m "feat(hw-emulator/trezor): wire TrezorEmulator into the factory + public exports"
```

---

## Phase 2 — Remove FakeTrezorBridge (consumer cleanup)

**Repo:** `metamask-speculos`. **Working dir:** repo root.

### Task 2.1: Delete FakeTrezorBridge

**Files:**
- Modify: `test/stub/keyring-bridge.js` (delete lines 72–178, the `FakeTrezorBridge` class)

- [ ] **Step 1: Delete the `FakeTrezorBridge` class**

Open `test/stub/keyring-bridge.js`, delete the entire `FakeTrezorBridge` class definition (lines 72–178 per spec §9.3). Leave `FakeLedgerBridge` (181–364), `KNOWN_PUBLIC_KEY*`, `KNOWN_PRIVATE_KEYS` untouched. If any `KNOWN_*` constants were *only* used by `FakeTrezorBridge`, leave them — `FakeLedgerBridge` may still use them.

- [ ] **Step 2: Confirm no lingering `FakeTrezorBridge` references**

```bash
rg -n "FakeTrezorBridge" app/ test/
```
Expected: the only remaining hit is the import in `app/scripts/wallet-init/keyrings.ts` (removed in Task 2.2). No other references.

- [ ] **Step 3: Commit**

```bash
git add test/stub/keyring-bridge.js
git commit -m "chore(trezor): remove FakeTrezorBridge stub"
```

### Task 2.2: Remove the `trezorBridge` IN_TEST override

**Files:**
- Modify: `app/scripts/wallet-init/keyrings.ts` (lines 34–37, 62, 77)

- [ ] **Step 1: Remove the override object's `trezorBridge` key**

```typescript
// app/scripts/wallet-init/keyrings.ts
// BEFORE (lines 34-37):
const overrides = process.env.IN_TEST
  ? {
      trezorBridge: require('../../../test/stub/keyring-bridge').FakeTrezorBridge,
    }
  : {};

// AFTER:
// (Delete the entire overrides block — Trezor now uses the real bridge in all builds,
//  exactly as QR does. The `overrides?.ledgerBridge` references on lines 70/85 already
//  resolve to undefined, so removing the object is safe.)
const overrides = {};
```

Then remove the `overrides?.trezorBridge ||` fallbacks in both branches:

```typescript
// MV2 (was line 62):
hardwareKeyringBuilderFactory(TrezorKeyring, TrezorConnectBridge),
// MV3 (was line 77):
hardwareKeyringBuilderFactory(TrezorKeyring, TrezorOffscreenBridge),
```

- [ ] **Step 2: Typecheck + lint**

```bash
yarn lint:tsc
yarn lint:changed:fix
```
Expected: clean. (The pre-existing `ledgerBridge` LSP error from the QR work is unrelated and should not change.)

- [ ] **Step 3: Build the test bundle**

```bash
yarn build:test
```
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add app/scripts/wallet-init/keyrings.ts
git commit -m "chore(trezor): remove IN_TEST Trezor bridge override (use real bridge in all builds)"
```

---

## Phase 3 — Integration test (`accounts`)

**Repo:** `accounts`. **Working dir:** `accounts/packages/hw-emulator/`.

### Task 3.1: keyring-eth-trezor integration test (Docker-gated)

**Files:**
- Create: `src/trezor/integration.test.ts`

- [ ] **Step 1: Write the integration test (gated; skips without Docker + env flag)**

```typescript
// src/trezor/integration.test.ts
import { createEmulator, EmulatorType, TREZOR_ADDRESS } from '../index';
import { TrezorKeyring, TrezorConnectBridge } from '@metamask/keyring-eth-trezor';

const RUN = process.env.TREZOR_INTEGRATION === '1';

(RUN ? describe : describe.skip)('Trezor emulator <-> real TrezorKeyring integration', () => {
  it('addAccounts(1) derives TREZOR_ADDRESS via the real connect-web + proxy + firmware', async () => {
    const emulator = createEmulator(EmulatorType.Trezor, {
      composeFile: require('path').join(__dirname, '../../../test/e2e/trezor/docker-compose.yml'),
    });
    await emulator.start();
    try {
      // Wire the real keyring to the real TrezorConnectBridge; transport flows
      // connect-web -> proxy :21328 -> trezord :21325 -> emulator firmware.
      const keyring = new TrezorKeyring({ bridge: new TrezorConnectBridge() });
      await keyring.addAccounts(1);
      const accounts = await keyring.getAccounts();
      expect(accounts[0].toLowerCase()).toBe(TREZOR_ADDRESS.toLowerCase());
    } finally {
      await emulator.stop();
    }
  }, 120_000);
});
```

- [ ] **Step 2: Run (skipped by default)**

```bash
yarn jest src/trezor/integration.test.ts
```
Expected: 1 skipped.

- [ ] **Step 3: Run for real (requires Docker daemon + Phase 5's docker-compose present)**

```bash
# After Phase 5 lands the docker-compose at metamask-speculos/test/e2e/trezor/docker-compose.yml,
# copy/symlink it into the path above, then:
TREZOR_INTEGRATION=1 yarn jest src/trezor/integration.test.ts
```
Expected: PASS within 120s. (This is the first end-to-end proof of the transport seam against real firmware.)

- [ ] **Step 4: Commit**

```bash
yarn lint:changed:fix
git add src/trezor/integration.test.ts
git commit -m "test(hw-emulator/trezor): add Docker-gated integration test against real firmware"
```

---

## Phase 4 — E2E wiring (`metamask-speculos/test/e2e/trezor/`)

**Repo:** `metamask-speculos`. **Working dir:** repo root. **Pattern source:** `test/e2e/speculos/` (Ledger) + `test/e2e/tests/hardware-wallets/qr/qr-helpers.ts`.

### Task 4.1: docker-compose + constants

**Files:**
- Create: `test/e2e/trezor/docker-compose.yml`
- Create: `test/e2e/trezor/constants.ts`

- [ ] **Step 1: docker-compose**

```yaml
# test/e2e/trezor/docker-compose.yml
services:
  trezor-user-env:
    image: ghcr.io/trezor/trezor-user-env:latest
    container_name: metamask-trezor
    ports:
      - '9001:9001'
      - '21325:21325'
      - '21324:21324'
    restart: 'no'
```

- [ ] **Step 2: constants**

```typescript
// test/e2e/trezor/constants.ts
import path from 'path';
import { TREZOR_ADDRESS, TREZOR_ADDRESSES } from '@metamask/hw-emulator';

export const TREZOR_COMPOSE_FILE = path.join(__dirname, 'docker-compose.yml');
export const TREZOR_E2E_PORTS = [9001, 21324, 21325, 21328];
export const TREZOR_SEED_BALANCES = [
  { address: TREZOR_ADDRESS, balance: '0x100000000000000000000' },
];
export const TREZOR_EXPECTED_ADDRESSES = TREZOR_ADDRESSES.T2T1;
export const RECIPIENT = '0x0Cc5261AB8cE458dc977078A3623E2BaDD27afD3';
```

- [ ] **Step 3: Commit**

```bash
git add test/e2e/trezor/docker-compose.yml test/e2e/trezor/constants.ts
git commit -m "feat(trezor-e2e): add docker-compose + constants"
```

### Task 4.2: shared-context + test-helper + cleanup

**Files:**
- Create: `test/e2e/trezor/shared-context.ts`
- Create: `test/e2e/trezor/test-helper.ts`
- Create: `test/e2e/trezor/cleanup.ts`

- [ ] **Step 1: Mirror `test/e2e/speculos/shared-context.ts` for Trezor.**

The shared context owns the singleton `TrezorEmulator` (started once per suite). Use the factory:

```typescript
// test/e2e/trezor/shared-context.ts
import { createEmulator, EmulatorType, type TrezorEmulator } from '@metamask/hw-emulator';
import { TREZOR_COMPOSE_FILE } from './constants';

export interface SharedTrezorContext {
  emulator: TrezorEmulator;
}

export async function startSharedTrezor(): Promise<SharedTrezorContext> {
  const emulator = createEmulator(EmulatorType.Trezor, { composeFile: TREZOR_COMPOSE_FILE }) as TrezorEmulator;
  await emulator.start();
  const cleanup = async () => { try { await emulator.stop(); } catch { /* swallow on exit */ } };
  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);
  return { emulator };
}

export async function stopSharedTrezor(ctx: SharedTrezorContext): Promise<void> {
  await ctx.emulator.stop();
}
```

- [ ] **Step 2: `test-helper.ts` — Docker lifecycle (wait for controller `ping`, port-conflict detection).**

Port the structure of `test/e2e/speculos/test-helper.ts`, replacing Speculos health (REST `/`) with a controller `ping` over WS `:9001`. Reuse `cleanup.ts` from speculos but add `TREZOR_E2E_PORTS`.

```typescript
// test/e2e/trezor/test-helper.ts
import { TrezorControllerClient } from '@metamask/hw-emulator';
import { TREZOR_CONTROLLER_PORT } from '@metamask/hw-emulator';

export async function waitForController(host = '127.0.0.1', timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ctl = new TrezorControllerClient({ host, port: TREZOR_CONTROLLER_PORT });
      await ctl.connect();
      await ctl.ping();
      await ctl.disconnect();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`trezor-user-env controller not reachable on ${host}:${TREZOR_CONTROLLER_PORT}`);
}
```

- [ ] **Step 3: `cleanup.ts`** — copy `test/e2e/speculos/cleanup.ts`, merge `TREZOR_E2E_PORTS` into the port list, swap the container name to `metamask-trezor`.

- [ ] **Step 4: Commit**

```bash
yarn lint:changed:fix
git add test/e2e/trezor/shared-context.ts test/e2e/trezor/test-helper.ts test/e2e/trezor/cleanup.ts
git commit -m "feat(trezor-e2e): add shared context, test helper, cleanup"
```

### Task 4.3: with-trezor-fixtures + build-config + chrome.js gate

**Files:**
- Create: `test/e2e/trezor/with-trezor-fixtures.ts`
- Create: `test/e2e/trezor/build-config.ts`
- Modify: `test/e2e/webdriver/chrome.js` (add `TREZOR_E2E=1` block)

- [ ] **Step 1: `with-trezor-fixtures.ts`** — mirror `test/e2e/speculos/with-speculos-fixtures.ts` minus the HTML-patch step (Trezor has no browser mock). Validate `TREZOR_E2E=1`, start the shared emulator, call `withFixtures()`, expose `{ driver, emulator }`.

- [ ] **Step 2: `build-config.ts`** — env validation only (no Chrome flags needed by default):

```typescript
// test/e2e/trezor/build-config.ts
export function validateTrezorTestEnv(): void {
  if (process.env.TREZOR_E2E !== '1') {
    throw new Error('TREZOR_E2E=1 is required to run Trezor E2E tests');
  }
}
```

- [ ] **Step 3: Add the `TREZOR_E2E=1` block to `test/e2e/webdriver/chrome.js`** (after the existing `QR_E2E` block, ~line 93):

```javascript
// Trezor hardware-wallet E2E: near-zero flags — the transport is a Node-side
// HTTP proxy on connect-web's default port; no WebHID/WebUSB browser mock.
// The gate exists for env-validation + future flag additions (see spec §12.1 R1).
if (process.env.TREZOR_E2E === '1') {
  // Intentionally no flags by default. Add here only if R1 surfaces a need.
}
```

- [ ] **Step 4: Commit**

```bash
yarn lint:changed:fix
git add test/e2e/trezor/with-trezor-fixtures.ts test/e2e/trezor/build-config.ts test/e2e/webdriver/chrome.js
git commit -m "feat(trezor-e2e): add fixture wrapper, build config, chrome.js gate"
```

---

## Phase 5 — E2E specs (`metamask-speculos/test/e2e/tests/hardware-wallets/trezor/`)

**Repo:** `metamask-speculos`. **Pattern source:** `test/e2e/tests/hardware-wallets/ledger/` (8 specs) + `ledger-helpers.ts`.

### Task 5.1: trezor-helpers.ts

**Files:**
- Create: `test/e2e/tests/hardware-wallets/trezor/trezor-helpers.ts`

- [ ] **Step 1: Mirror `ledger-helpers.ts` (48 lines) for Trezor.**

```typescript
// test/e2e/tests/hardware-wallets/trezor/trezor-helpers.ts
import { TREZOR_ADDRESS } from '@metamask/hw-emulator';
import type { TrezorEmulator } from '@metamask/hw-emulator';

export { TREZOR_ADDRESS };
export { TREZOR_SEED_BALANCES as LEDGER_SEED_BALANCE } from '../../../trezor/constants';
export { RECIPIENT } from '../../../trezor/constants';

export async function approveTransaction(emulator: TrezorEmulator): Promise<void> {
  await emulator.approveTransaction();
}
export async function approveSigning(emulator: TrezorEmulator): Promise<void> {
  await emulator.approveSigning();
}
export async function rejectTransaction(emulator: TrezorEmulator): Promise<void> {
  await emulator.rejectTransaction();
}
```

(Adjust the `connectTrezorAccount(driver)` UI flow helper by porting the Ledger equivalent — clicking `connect-hardware-wallet-trezor` per `connect-hardware-wallet-page.ts:23` — into a Trezor version.)

- [ ] **Step 2: Commit.**

### Task 5.2–5.9: The 8 specs (account → smoke first)

For each spec, port the Ledger counterpart under `test/e2e/tests/hardware-wallets/ledger/`, substituting:
- `startSharedSpeculos` → `startSharedTrezor`
- `withSpeculosFixtures` → `withTrezorFixtures`
- `apduBridge`/`interaction` → `emulator` (call `emulator.approveTransaction()` etc.)
- `SPECULOS_LEDGER_ADDRESS` / `LEDGER_SEED_BALANCE` → `TREZOR_ADDRESS` / `TREZOR_SEED_BALANCES`

- [ ] **Task 5.2: `trezor-account.spec.ts`** (SMOKE — do this first; it proves the transport seam in the real extension)
- [ ] **Task 5.3: `trezor-send.spec.ts`** (EIP-1559 ETH send; legacy type-0 if gas-estimation cooperates)
- [ ] **Task 5.4: `trezor-erc20.spec.ts`**
- [ ] **Task 5.5: `trezor-erc721.spec.ts`**
- [ ] **Task 5.6: `trezor-sign.spec.ts`** (EIP-712 v4)
- [ ] **Task 5.7: `trezor-personal-sign.spec.ts`**
- [ ] **Task 5.8: `trezor-error-modals.spec.ts`** — uses `emulator.getBridgeProxy().injectErrorResponse(TREZOR_MSG.EthereumSignTx, { error: '...' })` for the transport-error case + `emulator.rejectTransaction()` for the on-device-reject case
- [ ] **Task 5.9: `trezor-forget-device.spec.ts`**

**Each spec task follows the same step pattern:**

- [ ] **Step 1: Port the Ledger spec to Trezor** (substitutions above).
- [ ] **Step 2: Run the single spec**

```bash
TREZOR_E2E=1 yarn test:e2e:single \
  test/e2e/tests/hardware-wallets/trezor/trezor-account.spec.ts \
  --browser=chrome --leave-running
```

Expected: PASS. If `trezor-account` (the smoke) fails, stop and diagnose via `emulator.getScreenshot()` + the proxy's `'signing-call'` events before proceeding to the next spec.

- [ ] **Step 3: Lint + commit**

```bash
yarn lint:changed:fix
git add test/e2e/tests/hardware-wallets/trezor/<spec>.spec.ts
git commit -m "test(trezor-e2e): add <name> spec"
```

---

## Phase 6 — Documentation + supersede the old guide

**Repo:** both. **Working dir:** as noted.

### Task 6.1: src/trezor/README.md

- [ ] **Step 1: Write `accounts/packages/hw-emulator/src/trezor/README.md`** — public API, the proxy/controller model, a quickstart for both unit tests (no Docker) and integration/E2E (Docker), pointer to the spec + ADR. Mirror `src/qr/README.md`.

### Task 6.2: CHANGELOG entries

- [ ] **Step 1: `accounts/packages/hw-emulator/CHANGELOG.md`** — under `### Added`: `Trezor hardware wallet emulator (wraps trezor-user-env; transparent HTTP-proxy transport). [#TODO]`. Bump version per release process.
- [ ] **Step 2: `metamask-speculos/CHANGELOG.md`** — under `## [Unreleased]`: `Removed FakeTrezorBridge; Trezor E2E now uses @metamask/hw-emulator's Trezor emulator.`

### Task 6.3: Supersede the in-repo TREZOR_REPLICATION_GUIDE.md

- [ ] **Step 1: Prepend a supersession banner to `metamask-speculos/test/e2e/speculos/TREZOR_REPLICATION_GUIDE.md`:**

```markdown
> ⚠️ **SUPERSEDED** by `accounts/docs/specs/trezor-emulator.md` + `accounts/docs/adr/0003-trezor-transport-boundary.md`.
> This document's transport analysis is broadly compatible but contains known errors
> (`BridgeTransport({url})` is wrong — correct API is `BridgeTransport({port, id})`; the
> default BridgeTransport port is 21328, not 21325; file placement should follow the
> hw-emulator package pattern, not `test/e2e/trezor/`). Retained for historical context.
```

- [ ] **Step 2: Commit all docs**

```bash
# accounts
cd accounts
git add packages/hw-emulator/src/trezor/README.md packages/hw-emulator/CHANGELOG.md
git commit -m "docs(hw-emulator/trezor): add README + CHANGELOG"

# metamask-speculos
cd ../metamask-speculos
git add CHANGELOG.md test/e2e/speculos/TREZOR_REPLICATION_GUIDE.md
git commit -m "docs(trezor): CHANGELOG + supersede TREZOR_REPLICATION_GUIDE"
```

---

## Self-Review (run before declaring the plan complete)

- [ ] **Spec coverage:** Every spec section maps to a task — Purpose→all; Goals G1 (Task 1.2 all models), G2 (Phase 2), G3 (Phase 0 gate + ADR-0003), G4 (real firmware via trezor-user-env, Phase 0+3), G5 (Ledger symmetry, Phase 1+4), G6 (8 specs, Phase 5); Non-Goals respected (Firefox skipped, FakeLedgerBridge untouched in Task 2.1, no WebUSB, no Python vendoring); Architecture §5 → Phase 1+4; API §6 → Task 1.1/1.3/1.4/1.7; Cleanup §9.3 → Phase 2; Risks R1→Phase 0, R2→Task 1.2 note, R3/R4/R5 acknowledged.
- [ ] **Placeholder scan:** `0x REPLACE` in Task 1.7 Step 1 is intentional (derived at implementation time from the documented one-off command) — not a placeholder gap. All other code is complete.
- [ ] **Type consistency:** `TrezorControllerClient` method names (`pressYes`/`pressNo`/`click`/`swipe`/`emulatorStart`/`emulatorSetup`/`bridgeStart`/`ping`/`getScreenshot`) match across controller-client, device-interaction, trezor-emulator, and tests. `TrezorBridgeProxy` API (`start`/`stop`/`getPort`/`isRunning`/`injectErrorResponse`/`clearInjectedErrors`/`'signing-call'` event) matches across bridge-proxy, trezor-emulator test mock, and the error-modals spec reference. `MODEL_PROFILES` keys match the `TrezorModel` union.
- [ ] **Repo discipline:** every task states its repo + working dir; commit steps respect AGENTS.md (execute only when the user authorizes committing).
