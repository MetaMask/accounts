import {
  EthAccountType,
  EthScope,
  KeyringRpcMethod,
} from '@metamask/keyring-api';
import type { KeyringAccount } from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { SnapManageAccountsMethod } from '@metamask/keyring-snap-sdk';
import type { JsonRpcRequest } from '@metamask/keyring-utils';
import type { SnapId } from '@metamask/snaps-sdk';

import type { SnapKeyringMessenger } from './SnapKeyringMessenger';
import type { SnapKeyringV1Callbacks } from './SnapKeyringV1';
import { SnapKeyringV1 } from './SnapKeyringV1';

const SNAP_ID = 'npm:@metamask/test-snap' as SnapId;

const account1: KeyringAccount = {
  id: 'b05d918a-b37c-497a-bb28-3d15c0d56b7a' as AccountId,
  address: '0xc728514df8a7f9271f4b7a4dd2aa6d2d723d3ee3',
  options: {},
  methods: [],
  scopes: [EthScope.Eoa],
  type: EthAccountType.Eoa,
};

/**
 * Subclass that exposes {@link SnapKeyringV1.registry} seeding for tests.
 */
class TestSnapKeyringV1 extends SnapKeyringV1 {
  seedAccount(account: KeyringAccount): void {
    this.registry.set(account);
  }
}

/**
 * Build minimal {@link SnapKeyringV1Callbacks} for tests.
 *
 * @returns Callbacks object.
 */
function makeCallbacks(): SnapKeyringV1Callbacks {
  return {
    addAccount: jest
      .fn<Promise<void>, Parameters<SnapKeyringV1Callbacks['addAccount']>>()
      .mockResolvedValue(undefined),
    removeAccount: jest
      .fn<Promise<void>, Parameters<SnapKeyringV1Callbacks['removeAccount']>>()
      .mockResolvedValue(undefined),
    saveState: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    redirectUser: jest
      .fn<Promise<void>, Parameters<SnapKeyringV1Callbacks['redirectUser']>>()
      .mockResolvedValue(undefined),
    assertAccountCanBeUsed: jest
      .fn<Promise<void>, [KeyringAccount]>()
      .mockResolvedValue(undefined),
  };
}

describe('SnapKeyringV1', () => {
  describe('setSelectedAccounts', () => {
    it('forwards only account IDs that exist in this snap registry', async () => {
      let lastSetSelectedAccounts: AccountId[] | undefined;
      const messenger = {
        call: jest.fn(
          async (
            action: string,
            args: { request: JsonRpcRequest },
          ): Promise<null> => {
            if (action === 'SnapController:handleRequest') {
              const { request } = args;
              if (request.method === KeyringRpcMethod.SetSelectedAccounts) {
                const params = request.params as { accounts: AccountId[] };
                lastSetSelectedAccounts = params.accounts;
                return null;
              }
            }
            throw new Error(`Unexpected messenger.call: ${action}`);
          },
        ),
        publish: jest.fn(),
      } as unknown as SnapKeyringMessenger;

      const keyring = new TestSnapKeyringV1({
        snapId: SNAP_ID,
        messenger,
        callbacks: makeCallbacks(),
      });
      keyring.seedAccount(account1);

      const unknownId = '00000000-0000-0000-0000-000000000000' as AccountId;
      await keyring.setSelectedAccounts([unknownId, account1.id, unknownId]);

      expect(lastSetSelectedAccounts).toStrictEqual([account1.id]);
    });

    it('deduplicates repeated known account IDs', async () => {
      let lastSetSelectedAccounts: AccountId[] | undefined;
      const messenger = {
        call: jest.fn(
          async (
            action: string,
            args: { request: JsonRpcRequest },
          ): Promise<null> => {
            if (action === 'SnapController:handleRequest') {
              const { request } = args;
              if (request.method === KeyringRpcMethod.SetSelectedAccounts) {
                const params = request.params as { accounts: AccountId[] };
                lastSetSelectedAccounts = params.accounts;
                return null;
              }
            }
            throw new Error(`Unexpected messenger.call: ${action}`);
          },
        ),
        publish: jest.fn(),
      } as unknown as SnapKeyringMessenger;

      const keyring = new TestSnapKeyringV1({
        snapId: SNAP_ID,
        messenger,
        callbacks: makeCallbacks(),
      });
      keyring.seedAccount(account1);

      await keyring.setSelectedAccounts([account1.id, account1.id]);

      expect(lastSetSelectedAccounts).toStrictEqual([account1.id]);
    });

    it('updates internal selection to the filtered list', async () => {
      const messenger = {
        call: jest.fn(async (): Promise<null> => null),
        publish: jest.fn(),
      } as unknown as SnapKeyringMessenger;

      const keyring = new TestSnapKeyringV1({
        snapId: SNAP_ID,
        messenger,
        callbacks: makeCallbacks(),
      });
      keyring.seedAccount(account1);

      const unknownId = '00000000-0000-0000-0000-000000000000' as AccountId;
      await keyring.setSelectedAccounts([unknownId, account1.id]);

      const selected = await keyring.handleKeyringSnapMessage({
        method: SnapManageAccountsMethod.GetSelectedAccounts,
      });
      expect(selected).toStrictEqual([account1.id]);
    });

    it('logs unknown account IDs', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const messenger = {
        call: jest.fn(async (): Promise<null> => null),
        publish: jest.fn(),
      } as unknown as SnapKeyringMessenger;

      const keyring = new TestSnapKeyringV1({
        snapId: SNAP_ID,
        messenger,
        callbacks: makeCallbacks(),
      });
      keyring.seedAccount(account1);

      const unknownId = '00000000-0000-0000-0000-000000000000' as AccountId;
      await keyring.setSelectedAccounts([unknownId, account1.id]);

      expect(spy).toHaveBeenCalledWith(
        `Snap '${SNAP_ID}' ignored unknown account IDs when setting selected accounts:`,
        [unknownId],
      );
      spy.mockRestore();
    });
  });
});
