# ADR-0001: QR emulator as submodule of `@metamask/hw-emulator`

| Field    | Value                                            |
| -------- | ------------------------------------------------ |
| Status   | Accepted                                         |
| Date     | 2026-06-19                                       |
| Context  | `feat/hw-emulators-master` planning              |
| Related  | [QR Emulator Spec](../specs/qr-emulator.md)      |

## Context

The QR hardware wallet emulator needs a home in the `accounts` monorepo. Three candidate placements were considered during the design grill:

1. **(i) Sibling package** — new `packages/qr-emulator/` published as `@metamask/qr-emulator`, with `@metamask/hw-emulator` re-exporting it via `createEmulator(EmulatorType.Qr, ...)` for unified entry.
2. **(ii) Submodule** — `packages/hw-emulator/src/qr/`, exported via the existing `EmulatorType` enum and `createEmulator` factory. One package, `@metamask/hw-emulator`.
3. **(iii) Hybrid** — sibling package + thin re-export from `hw-emulator`.

The decision matters because it determines:

- **Consumer workflow.** `metamask-extension` already consumes `@metamask/hw-emulator`. Adding a second package (`@metamask/qr-emulator`) doubles the package-management surface (two `file:` entries, two LavaMoat policy regens, two preview publishes).
- **Versioning.** A sibling package can version independently. A submodule versions with `hw-emulator`.
- **Dependency footprint.** `hw-emulator` today carries heavy Ledger-specific dependencies (Docker manager, Python BLE bridge, Speculos binaries). A sibling package could keep the QR emulator's dependency surface (BC-UR codec, ECDSA, QR rendering) cleanly separated.
- **Extension point.** `hw-emulator/src/types.ts` already declares `EmulatorType.Trezor` (which throws "not implemented"). The enum is clearly designed for new device types to slot in.

## Decision

Adopt **(ii) submodule**. The QR emulator lives at `packages/hw-emulator/src/qr/` and is exported via the existing `createEmulator(EmulatorType.Qr, options)` factory.

## Rationale

Three factors drove the decision toward (ii):

1. **The factory is the intended extension point.** `EmulatorType` is an enum, `createEmulator` is a switch over that enum, and `EmulatorType.Trezor` already exists as a not-yet-implemented placeholder. The architecture clearly anticipates new device types being added as `src/<device>/` submodules. A sibling package would fight this design rather than embrace it.

2. **The consumer story collapses to a single edit.** `metamask-extension`'s `package.json` already has `@metamask/hw-emulator` (currently as `npm:@metamask-previews/hw-emulator@0.1.0-de887b2`). Switching to `file:../accounts/packages/hw-emulator` is one line. A sibling package would require a second entry, a second `file:` resolution, a second LavaMoat policy regen, and a second preview publish when the work stabilises.

3. **The dependency-footprint concern is real but bounded.** `hw-emulator`'s `package.json` already has a `browser` field that excludes Node-only modules (`docker-manager.cjs`, `process-manager.cjs`) from browser bundles. The QR emulator adds pure-TypeScript dependencies (`@ngraveio/bc-ur`, `@keystonehq/bc-ur-registry-eth`, `qrcode-generator`, `@zxing/library`) — none of which need browser exclusion. The new deps are small and isomorphic. The blast radius is acceptable.

## Consequences

**Positive:**

- One package, one version, one entry in any consumer's `package.json`.
- The `createEmulator(type, options)` API is the single source of truth for "how do I get a hardware wallet emulator?" — regardless of device family.
- Documentation, CHANGELOG, and release process for `@metamask/hw-emulator` automatically covers QR.
- Discovery is trivial: consumers see `EmulatorType.Qr` in the type and know it exists.

**Negative:**

- Consumers who only want QR still pull in `hw-emulator`'s Ledger-related code paths at install time. Mitigation: the `browser` field already keeps Ledger's Node-only modules out of browser bundles; QR's pure-TS code is fine in either context.
- The QR emulator's release cadence is coupled to Ledger's. In practice this is fine — both are driven by E2E testing needs and rarely release independently.
- A future refactor that splits the monorepo would have to disentangle QR from Ledger. Acceptable cost; no current pressure to split.

## Alternatives considered

- **(i) Sibling package** — rejected. Doubles consumer surface for no clear gain. The factory extension point already provides the discoverability that a separate package would offer.
- **(iii) Hybrid** — rejected. Adds indirection (re-export) without removing any cost. The worst-of-both option.

## References

- [QR Emulator Spec §5.1](../specs/qr-emulator.md#51-component-layout)
- Existing precedent: `packages/hw-emulator/src/ledger/` and `packages/hw-emulator/src/ble/` are already submodules of the same package, exported via the same factory.
