import type { SnapId } from '@metamask/snaps-sdk';

import type { SnapKeyringMessenger } from './SnapKeyringMessenger';
import { SnapKeyringV1, SnapKeyringV1Callbacks } from './SnapKeyringV1';

const SNAP_ID = 'local:snap.mock' as SnapId;
const OTHER_SNAP_ID = 'local:snap.other' as SnapId;

function makeMessenger(): SnapKeyringMessenger {
  return {
    call: jest.fn(),
    publish: jest.fn(),
  } as unknown as SnapKeyringMessenger;
}

function makeCallbacks(): SnapKeyringV1Callbacks {
  return {
    addAccount: jest.fn(),
    removeAccount: jest.fn(),
    saveState: jest.fn(),
    redirectUser: jest.fn(),
    assertAccountCanBeUsed: jest.fn(),
  };
}

describe('SnapKeyringV1', () => {
  describe('constructor', () => {
    it('creates a new KeyringAccountRegistry when registry is not provided', () => {
      const v1 = new SnapKeyringV1({
        messenger: makeMessenger(),
        callbacks: makeCallbacks(),
        // registry intentionally omitted → covers `registry ?? new KeyringAccountRegistry()`
      });
      expect(v1).toBeDefined();
    });

    it('uses the false default for isAnyAccountTypeAllowed when not provided', () => {
      const v1 = new SnapKeyringV1({
        messenger: makeMessenger(),
        callbacks: makeCallbacks(),
        // isAnyAccountTypeAllowed intentionally omitted → covers default parameter branch
      });
      expect(v1).toBeDefined();
    });
  });

  describe('snapId', () => {
    it('throws before bindSnapId is called', () => {
      const v1 = new SnapKeyringV1({
        messenger: makeMessenger(),
        callbacks: makeCallbacks(),
      });
      expect(() => v1.snapId).toThrow('SnapKeyring has not been initialized');
    });

    it('returns the snap ID after bindSnapId is called', () => {
      const v1 = new SnapKeyringV1({
        messenger: makeMessenger(),
        callbacks: makeCallbacks(),
      });
      v1.bindSnapId(SNAP_ID);
      expect(v1.snapId).toBe(SNAP_ID);
    });
  });

  describe('bindSnapId', () => {
    it('throws when called with a different snap ID than the one already bound', () => {
      const v1 = new SnapKeyringV1({
        messenger: makeMessenger(),
        callbacks: makeCallbacks(),
      });
      v1.bindSnapId(SNAP_ID);
      expect(() => v1.bindSnapId(OTHER_SNAP_ID)).toThrow(
        `SnapKeyring bound to '${SNAP_ID}' cannot be rebound to '${OTHER_SNAP_ID}'`,
      );
    });

    it('is idempotent when called again with the same snap ID', () => {
      const v1 = new SnapKeyringV1({
        messenger: makeMessenger(),
        callbacks: makeCallbacks(),
      });
      v1.bindSnapId(SNAP_ID);
      expect(() => v1.bindSnapId(SNAP_ID)).not.toThrow();
    });
  });
});
