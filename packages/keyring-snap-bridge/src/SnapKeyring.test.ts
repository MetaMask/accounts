import { TransactionFactory } from '@ethereumjs/tx';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import type {
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
  KeyringAccount,
  KeyringExecutionContext,
} from '@metamask/keyring-api';
import {
  BtcAccountType,
  BtcMethod,
  EthAccountType,
  EthMethod,
} from '@metamask/keyring-api';
import { KeyringEvent } from '@metamask/keyring-api/dist/events';
import type { SnapController } from '@metamask/snaps-controllers';
import type { SnapId } from '@metamask/snaps-sdk';
import { KnownCaipNamespace, toCaipChainId } from '@metamask/utils';

import type { KeyringState } from '.';
import { SnapKeyring } from '.';

const regexForUUIDInRequiredSyncErrorMessage =
  /Request '[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}' to snap 'local:snap.mock' is pending and expectSync is true/u;

const ETH_4337_METHODS = [
  EthMethod.PatchUserOperation,
  EthMethod.PrepareUserOperation,
  EthMethod.SignUserOperation,
];

const ETH_EOA_METHODS = [
  EthMethod.PersonalSign,
  EthMethod.Sign,
  EthMethod.SignTransaction,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
];

describe('SnapKeyring', () => {
  let keyring: SnapKeyring;

  const mockSnapController = {
    handleRequest: jest.fn(),
    get: jest.fn(),
  };

  const mockCallbacks = {
    saveState: jest.fn(),
    addressExists: jest.fn(),
    addAccount: jest.fn(
      async (
        _address,
        _snapId,
        handleUserInput,
        _accountNameSuggestion,
        _displayConfirmation,
      ) => {
        await handleUserInput(true);
        return Promise.resolve();
      },
    ),
    removeAccount: jest.fn(async (address, _snapId, handleUserInput) => {
      await keyring.removeAccount(address);
      await handleUserInput(true);
      return Promise.resolve();
    }),
    redirectUser: jest.fn(async () => Promise.resolve()),
  };

  const snapId = 'local:snap.mock' as SnapId;

  const ethEoaAccount1 = {
    id: 'b05d918a-b37c-497a-bb28-3d15c0d56b7a',
    address: '0xC728514Df8A7F9271f4B7a4dd2Aa6d2D723d3eE3'.toLowerCase(),
    options: {},
    methods: ETH_EOA_METHODS,
    type: EthAccountType.Eoa,
  };
  const ethEoaAccount2 = {
    id: '33c96b60-2237-488e-a7bb-233576f3d22f',
    address: '0x34b13912eAc00152bE0Cb409A301Ab8E55739e63'.toLowerCase(),
    options: {},
    methods: ETH_EOA_METHODS,
    type: EthAccountType.Eoa,
  };
  const ethEoaAccount3 = {
    id: 'c6697bcf-5710-4751-a1cb-340e4b50617a',
    address: '0xab1G3q98V7C67T9103g30C0417610237A137d763'.toLowerCase(),
    options: {},
    methods: ETH_EOA_METHODS,
    type: EthAccountType.Eoa,
  };

  const ethErc4337Account = {
    id: 'fc926fff-f515-4eb5-9952-720bbd9b9849',
    address: '0x2f15b30952aebe0ed5fdbfe5bf16fb9ecdb31d9a'.toLowerCase(),
    options: {},
    methods: ETH_4337_METHODS,
    type: EthAccountType.Erc4337,
  };
  const btcP2wpkhAccount = {
    id: '11cffca0-12cc-4779-8f82-23273c062e29',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'.toLowerCase(),
    options: {},
    methods: [...Object.values(BtcMethod)],
    type: BtcAccountType.P2wpkh,
  };

  const accounts = [
    ethEoaAccount1,
    ethEoaAccount2,
    ethEoaAccount3,
    ethErc4337Account,
    btcP2wpkhAccount,
  ] as const;

  const executionContext: KeyringExecutionContext = {
    chainId: '1',
  };

  beforeEach(async () => {
    keyring = new SnapKeyring(
      mockSnapController as unknown as SnapController,
      mockCallbacks,
    );
    mockCallbacks.addAccount.mockImplementation(
      async (
        _address,
        _snapId,
        handleUserInput,
        _accountNameSuggestion,
        _displayConfirmation,
      ) => {
        await handleUserInput(true);
      },
    );
    for (const account of accounts) {
      mockSnapController.handleRequest.mockResolvedValue(accounts);
      await keyring.handleKeyringSnapMessage(snapId, {
        method: KeyringEvent.AccountCreated,
        params: { account: account as unknown as KeyringAccount },
      });
    }
  });

  describe('handleKeyringSnapMessage', () => {
    describe('#handleAccountCreated', () => {
      it('cannot add an account that already exists (address)', async () => {
        mockCallbacks.addressExists.mockResolvedValue(true);
        await expect(
          keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountCreated,
            params: {
              account: {
                ...(ethEoaAccount1 as unknown as KeyringAccount),
                id: 'c6697bcf-5710-4751-a1cb-340e4b50617a',
              },
            },
          }),
        ).rejects.toThrow(
          `Account address '${ethEoaAccount1.address}' already exists`,
        );
      });

      it('cannot add an account that already exists (ID)', async () => {
        mockCallbacks.addressExists.mockResolvedValue(false);
        await expect(
          keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountCreated,
            params: {
              account: {
                ...(ethEoaAccount1 as unknown as KeyringAccount),
                address: '0x0',
              },
            },
          }),
        ).rejects.toThrow(`Account '${ethEoaAccount1.id}' already exists`);
      });

      it('cannot add an account that already exists (ID owned by another Snap', async () => {
        await expect(
          keyring.handleKeyringSnapMessage('a-different-snap-id' as SnapId, {
            method: KeyringEvent.AccountCreated,
            params: {
              account: { ...(ethEoaAccount1 as unknown as KeyringAccount) },
            },
          }),
        ).rejects.toThrow(
          'Snap "a-different-snap-id" is not allowed to set "b05d918a-b37c-497a-bb28-3d15c0d56b7a"',
        );
      });
      describe('with options', () => {
        it.each([
          [
            'handles account creation with accountNameSuggestion',
            { ...ethEoaAccount1 },
            'New Account',
            undefined,
          ],
          [
            'handles account creation with displayConfirmation',
            { ...ethEoaAccount2 },
            undefined,
            false,
          ],
          [
            'handles account creation with both accountNameSuggestion and displayConfirmation',
            { ...ethEoaAccount3 },
            'New Account',
            false,
          ],
        ])(
          '%s',
          async (
            _description,
            account,
            accountNameSuggestion,
            displayConfirmation,
          ) => {
            // Reset mock
            mockCallbacks.addAccount.mockClear();
            // Reset the keyring so it's empty.
            keyring = new SnapKeyring(
              mockSnapController as unknown as SnapController,
              mockCallbacks,
            );

            const params = {
              account: account as unknown as KeyringAccount,
              ...(displayConfirmation !== undefined && { displayConfirmation }),
              ...(accountNameSuggestion !== undefined && {
                accountNameSuggestion,
              }),
            };

            await keyring.handleKeyringSnapMessage(snapId, {
              method: KeyringEvent.AccountCreated,
              params,
            });

            expect(mockCallbacks.addAccount).toHaveBeenCalledWith(
              account.address.toLowerCase(),
              snapId,
              expect.any(Function),
              accountNameSuggestion,
              displayConfirmation,
            );
          },
        );
      });
    });

    describe('#handleAccountUpdated', () => {
      it('updates the methods of an account', async () => {
        // Return the updated list of accounts when the keyring requests it.
        mockSnapController.handleRequest.mockResolvedValue([
          { ...ethEoaAccount1, methods: [] },
          { ...ethEoaAccount2 },
        ]);

        expect(
          await keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountUpdated,
            params: { account: { ...ethEoaAccount1, methods: [] } },
          }),
        ).toBeNull();

        const keyringAccounts = keyring.listAccounts();
        expect(keyringAccounts.length).toBeGreaterThan(0);
        expect(keyringAccounts[0]?.methods).toStrictEqual([]);
      });

      it('returns null after successfully updating an account', async () => {
        const result = await keyring.handleKeyringSnapMessage(snapId, {
          method: KeyringEvent.AccountUpdated,
          params: { account: ethEoaAccount1 as unknown as KeyringAccount },
        });
        expect(mockCallbacks.saveState).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it("cannot update an account that doesn't exist", async () => {
        await expect(
          keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountUpdated,
            params: {
              account: {
                ...(ethEoaAccount1 as unknown as KeyringAccount),
                id: '0b3551da-1685-4750-ad4c-01fc3a9e90b1',
              },
            },
          }),
        ).rejects.toThrow(
          "Account '0b3551da-1685-4750-ad4c-01fc3a9e90b1' not found",
        );
      });

      it('cannot change the address of an account', async () => {
        await expect(
          keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountUpdated,
            params: {
              account: {
                ...(ethEoaAccount1 as unknown as KeyringAccount),
                address: ethEoaAccount2.address,
              },
            },
          }),
        ).rejects.toThrow(
          "Cannot change address of account 'b05d918a-b37c-497a-bb28-3d15c0d56b7a'",
        );
      });

      it('cannot update an account owned by another Snap', async () => {
        await expect(
          keyring.handleKeyringSnapMessage('invalid-snap-id' as SnapId, {
            method: KeyringEvent.AccountUpdated,
            params: {
              account: {
                ...(ethEoaAccount1 as unknown as KeyringAccount),
              },
            },
          }),
        ).rejects.toThrow(
          "Account 'b05d918a-b37c-497a-bb28-3d15c0d56b7a' not found",
        );
      });

      it('fails when the EthMethod is not supported after update', async () => {
        // Update first account to remove `EthMethod.PersonalSign`
        let updatedMethods = Object.values(EthMethod).filter(
          (method) => method !== EthMethod.PersonalSign,
        );
        expect(
          await keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountUpdated,
            params: {
              account: {
                ...ethEoaAccount1,
                methods: updatedMethods,
              },
            },
          }),
        ).toBeNull();
        expect(keyring.listAccounts()[0]?.methods).toStrictEqual(
          updatedMethods,
        );
        await expect(
          keyring.signPersonalMessage(ethEoaAccount1.address, 'hello'),
        ).rejects.toThrow(
          `Method '${EthMethod.PersonalSign}' not supported for account ${ethEoaAccount1.address}`,
        );
        // Restore `EthMethod.PersonalSign` and remove `EthMethod.SignTransaction`
        updatedMethods = Object.values(EthMethod).filter(
          (method) => method !== EthMethod.SignTransaction,
        );
        expect(
          await keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountUpdated,
            params: {
              account: {
                ...ethEoaAccount1,
                methods: updatedMethods,
              },
            },
          }),
        ).toBeNull();
        expect(keyring.listAccounts()[0]?.methods).toStrictEqual(
          updatedMethods,
        );
        const mockTx = {
          data: '0x0',
          gasLimit: '0x26259fe',
          gasPrice: '0x1',
          nonce: '0xfffffffe',
          to: '0xccccccccccccd000000000000000000000000000',
          value: '0x1869e',
          chainId: '0x1',
          type: '0x00',
        };
        const tx = TransactionFactory.fromTxData(mockTx);
        await expect(
          keyring.signTransaction(ethEoaAccount1.address, tx),
        ).rejects.toThrow(
          `Method '${EthMethod.SignTransaction}' not supported for account ${ethEoaAccount1.address}`,
        );
      });
    });

    describe('#handleAccountDeleted', () => {
      it('removes an account', async () => {
        mockSnapController.handleRequest.mockResolvedValue(null);
        mockCallbacks.removeAccount.mockImplementation(
          async (address, _snapId, handleUserInput) => {
            await keyring.removeAccount(address);
            await handleUserInput(true);
          },
        );

        await keyring.handleKeyringSnapMessage(snapId, {
          method: KeyringEvent.AccountDeleted,
          params: { id: ethEoaAccount1.id },
        });
        expect(await keyring.getAccounts()).toStrictEqual([
          ethEoaAccount2.address.toLowerCase(),
          ethEoaAccount3.address.toLowerCase(),
          ethErc4337Account.address.toLowerCase(),
          btcP2wpkhAccount.address.toLowerCase(),
        ]);
      });

      it('cannot delete an account owned by another Snap', async () => {
        await keyring.handleKeyringSnapMessage('invalid-snap-id' as SnapId, {
          method: KeyringEvent.AccountDeleted,
          params: { id: ethEoaAccount1.id },
        });
        expect(await keyring.getAccounts()).toStrictEqual([
          ethEoaAccount1.address.toLowerCase(),
          ethEoaAccount2.address.toLowerCase(),
          ethEoaAccount3.address.toLowerCase(),
          ethErc4337Account.address.toLowerCase(),
          btcP2wpkhAccount.address.toLowerCase(),
        ]);
      });

      it('returns null when removing an account that does not exist', async () => {
        mockCallbacks.removeAccount.mockImplementation(async (address) => {
          await keyring.removeAccount(address);
        });

        expect(
          await keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountDeleted,
            params: { id: 'bcda5b5f-098f-4706-919b-ee919402f0dd' },
          }),
        ).toBeNull();
      });

      it('throws an error if the removeAccount callback fails', async () => {
        mockCallbacks.removeAccount.mockImplementation(
          async (_address, _snapId, _handleUserInput) => {
            throw new Error('Some error occurred while removing account');
          },
        );

        await expect(
          keyring.handleKeyringSnapMessage(snapId, {
            method: KeyringEvent.AccountDeleted,
            params: { id: ethEoaAccount1.id },
          }),
        ).rejects.toThrow('Some error occurred while removing account');
      });
    });

    describe('#handleRequestApproved', () => {
      it('approves an async request', async () => {
        mockSnapController.handleRequest.mockResolvedValue({
          pending: true,
        });
        const requestPromise = keyring.signPersonalMessage(
          ethEoaAccount1.address,
          'hello',
        );

        const { calls } = mockSnapController.handleRequest.mock;
        const requestId = calls[calls.length - 1][0].request.params.id;
        await keyring.handleKeyringSnapMessage(snapId, {
          method: KeyringEvent.RequestApproved,
          params: {
            id: requestId,
            result: '0x123',
          },
        });
        expect(await requestPromise).toBe('0x123');
      });

      it("fails to approve a request that doesn't exist", async () => {
        const responsePromise = keyring.handleKeyringSnapMessage(snapId, {
          method: KeyringEvent.RequestApproved,
          params: {
            id: 'b59b5449-5517-4622-99f2-82670cc7f3f3',
            result: '0x123',
          },
        });
        await expect(responsePromise).rejects.toThrow(
          "Request 'b59b5449-5517-4622-99f2-82670cc7f3f3' not found",
        );
      });

      it("cannot approve another Snap's request", async () => {
        mockSnapController.handleRequest.mockResolvedValue({
          pending: true,
        });
        // eslint-disable-next-line no-void
        void keyring.signPersonalMessage(ethEoaAccount1.address, 'hello');

        const { calls } = mockSnapController.handleRequest.mock;
        const requestId: string = calls[calls.length - 1][0].request.params.id;
        await expect(
          keyring.handleKeyringSnapMessage('another-snap-id' as SnapId, {
            method: KeyringEvent.RequestApproved,
            params: { id: requestId, result: '0x1234' },
          }),
        ).rejects.toThrow(`Request '${requestId}' not found`);
      });

      it('fails to approve a request that failed when submitted', async () => {
        mockSnapController.handleRequest.mockRejectedValue(new Error('error'));
        const mockMessage = 'Hello World!';
        await expect(
          keyring.signPersonalMessage(ethEoaAccount1.address, mockMessage),
        ).rejects.toThrow('error');

        const { calls } = mockSnapController.handleRequest.mock;
        const requestId = calls[calls.length - 1][0].request.params.id;
        const responsePromise = keyring.handleKeyringSnapMessage(snapId, {
          method: KeyringEvent.RequestApproved,
          params: {
            id: requestId,
            result: '0x123',
          },
        });
        await expect(responsePromise).rejects.toThrow(
          `Request '${requestId as string}' not found`,
        );
      });
    });

    describe('#handleRequestRejected', () => {
      it('rejects an async request', async () => {
        mockSnapController.handleRequest.mockResolvedValue({
          pending: true,
        });
        const requestPromise = keyring.signPersonalMessage(
          ethEoaAccount1.address,
          'hello',
        );

        const { calls } = mockSnapController.handleRequest.mock;
        const requestId = calls[calls.length - 1][0].request.params.id;
        await keyring.handleKeyringSnapMessage(snapId, {
          method: KeyringEvent.RequestRejected,
          params: { id: requestId },
        });
        await expect(requestPromise).rejects.toThrow(
          'Request rejected by user or snap.',
        );
      });

      it("fails to reject a request that doesn't exist", async () => {
        const responsePromise = keyring.handleKeyringSnapMessage(snapId, {
          method: KeyringEvent.RequestRejected,
          params: {
            id: 'b59b5449-5517-4622-99f2-82670cc7f3f3',
          },
        });
        await expect(responsePromise).rejects.toThrow(
          "Request 'b59b5449-5517-4622-99f2-82670cc7f3f3' not found",
        );
      });

      it("cannot reject another Snap's request", async () => {
        mockSnapController.handleRequest.mockResolvedValue({
          pending: true,
        });
        // eslint-disable-next-line no-void
        void keyring.signPersonalMessage(ethEoaAccount1.address, 'hello');

        const { calls } = mockSnapController.handleRequest.mock;
        const requestId: string = calls[calls.length - 1][0].request.params.id;
        await expect(
          keyring.handleKeyringSnapMessage('another-snap-id' as SnapId, {
            method: KeyringEvent.RequestRejected,
            params: { id: requestId },
          }),
        ).rejects.toThrow(`Request '${requestId}' not found`);
      });
    });

    it('fails when the method is invalid', async () => {
      await expect(
        keyring.handleKeyringSnapMessage(snapId, {
          method: 'invalid',
        }),
      ).rejects.toThrow('Method not supported: invalid');
    });
  });

  describe('getAccounts', () => {
    it('returns all account addresses', async () => {
      const addresses = await keyring.getAccounts();
      expect(addresses).toStrictEqual(
        accounts.map((a) => a.address.toLowerCase()),
      );
    });
  });

  describe('serialize', () => {
    it('returns the keyring state', async () => {
      const expectedState = {
        accounts: {
          [ethEoaAccount1.id]: { account: ethEoaAccount1, snapId },
          [ethEoaAccount2.id]: { account: ethEoaAccount2, snapId },
          [ethEoaAccount3.id]: { account: ethEoaAccount3, snapId },
          [ethErc4337Account.id]: { account: ethErc4337Account, snapId },
          [btcP2wpkhAccount.id]: { account: btcP2wpkhAccount, snapId },
        },
      };
      const state = await keyring.serialize();
      expect(state).toStrictEqual(expectedState);
    });
  });

  describe('deserialize', () => {
    it('restores the keyring state', async () => {
      // State only contains the first account
      const state = {
        accounts: {
          [ethEoaAccount1.id]: { account: ethEoaAccount1, snapId },
        },
      };
      const expectedAddresses = [ethEoaAccount1.address];
      await keyring.deserialize(state as unknown as KeyringState);
      const addresses = await keyring.getAccounts();
      expect(addresses).toStrictEqual(expectedAddresses);
    });

    it('fails to restore an undefined state', async () => {
      // Reset the keyring so it's empty.
      keyring = new SnapKeyring(
        mockSnapController as unknown as SnapController,
        mockCallbacks,
      );
      await keyring.deserialize(undefined as unknown as KeyringState);
      expect(await keyring.getAccounts()).toStrictEqual([]);
    });

    it('fails to restore an empty state', async () => {
      // Reset the keyring so it's empty.
      keyring = new SnapKeyring(
        mockSnapController as unknown as SnapController,
        mockCallbacks,
      );
      await expect(
        keyring.deserialize({} as unknown as KeyringState),
      ).rejects.toThrow('Cannot convert undefined or null to object');
      expect(await keyring.getAccounts()).toStrictEqual([]);
    });
  });
  describe('async request redirect', () => {
    const isNotAllowedOrigin = async (
      allowedOrigins: string[],
      redirectUrl: string,
    ) => {
      const { origin } = new URL(redirectUrl);
      const snapObject = {
        id: snapId,
        manifest: {
          initialPermissions:
            allowedOrigins.length > 0
              ? { 'endowment:keyring': { allowedOrigins } }
              : {},
        },
        enabled: true,
      };
      mockSnapController.get.mockReturnValue(snapObject);
      mockSnapController.handleRequest.mockResolvedValue({
        pending: true,
        redirect: {
          message: 'Go to dapp to continue.',
          url: redirectUrl,
        },
      });
      const requestPromise = keyring.signPersonalMessage(
        ethEoaAccount1.address,
        'hello',
      );

      await expect(requestPromise).rejects.toThrow(
        `Redirect URL domain '${origin}' is not an allowed origin by snap '${snapId}'`,
      );
    };

    it.each([
      [{ message: 'Go to dapp to continue.' }],
      [{ url: 'https://example.com/sign?tx=1234' }],
      [{ url: 'https://example.com/sign?tx=12345', message: 'Go to dapp.' }],
    ])('returns a redirect %s', async (redirect) => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      const snapObject = {
        id: snapId,
        manifest: {
          initialPermissions: {
            'endowment:keyring': {
              allowedOrigins: ['https://example.com'],
            },
          },
        },
        enabled: true,
      };
      mockSnapController.get.mockReturnValue(snapObject);

      mockSnapController.handleRequest.mockResolvedValue({
        pending: true,
        redirect,
      });
      const requestPromise = keyring.signPersonalMessage(
        ethEoaAccount1.address,
        'hello',
      );

      const { calls } = mockSnapController.handleRequest.mock;
      const requestId = calls[calls.length - 1][0].request.params.id;
      await keyring.handleKeyringSnapMessage(snapId, {
        method: KeyringEvent.RequestRejected,
        params: { id: requestId },
      });

      const { url = '', message = '' } = redirect as {
        url?: string;
        message?: string;
      };

      // We need to await on the request promise because the request submission
      // is async, so if we don't await, the test will exit before the promise
      // gets resolved.
      await expect(requestPromise).rejects.toThrow(
        'Request rejected by user or snap.',
      );

      // Check that `redirectUser` was called with the correct parameters
      expect(mockCallbacks.redirectUser).toHaveBeenCalledWith(
        snapId,
        url,
        message,
      );
      spy.mockRestore();
    });

    it('throws an error if async request redirect url is not an allowed origin', async () => {
      expect.hasAssertions();
      await isNotAllowedOrigin(
        ['https://allowed.com'],
        'https://notallowed.com/sign?tx=1234',
      );
    });

    it('throws an error if no allowed origins', async () => {
      expect.hasAssertions();
      await isNotAllowedOrigin([], 'https://example.com/sign?tx=1234');
    });

    it('throws an error if the Snap is undefined', async () => {
      const redirect = {
        message: 'Go to dapp to continue.',
        url: 'https://example.com/sign?tx=1234',
      };

      mockSnapController.get.mockReturnValue(undefined);

      mockSnapController.handleRequest.mockResolvedValue({
        pending: true,
        redirect,
      });
      const requestPromise = keyring.signPersonalMessage(
        ethEoaAccount1.address,
        'hello',
      );

      await expect(requestPromise).rejects.toThrow(
        `Snap '${snapId}' not found.`,
      );
    });
  });

  describe('signTransaction', () => {
    it('signs a ethereum transaction synchronously', async () => {
      const mockTx = {
        data: '0x00',
        gasLimit: '0x26259fe',
        gasPrice: '0x1',
        nonce: '0xfffffffe',
        to: '0xccccccccccccd000000000000000000000000000',
        value: '0x1869e',
        chainId: '0x1',
        type: '0x0',
      };
      const mockSignedTx = {
        ...mockTx,
        r: '0x0',
        s: '0x0',
        v: '0x27',
      };
      const tx = TransactionFactory.fromTxData(mockTx);
      const expectedSignedTx = TransactionFactory.fromTxData(mockSignedTx);
      const expectedScope = 'eip155:1';

      mockSnapController.handleRequest.mockResolvedValue({
        pending: false,
        result: mockSignedTx,
      });

      const signature = await keyring.signTransaction(
        ethEoaAccount1.address,
        tx,
      );
      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: expectedScope,
            account: ethEoaAccount1.id,
            request: {
              method: 'eth_signTransaction',
              params: [
                {
                  ...mockTx,
                  from: ethEoaAccount1.address,
                },
              ],
            },
          },
        },
      });
      expect(signature).toStrictEqual(expectedSignedTx);
    });
  });

  describe('signTypedData', () => {
    const dataToSign = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' },
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' },
        ],
      },
      primaryType: 'Mail',
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      },
      message: {
        from: {
          name: 'Cow',
          wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        },
        to: {
          name: 'Bob',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
        contents: 'Hello, Bob!',
      },
    };

    const expectedScope = 'eip155:1';
    const expectedSignature =
      '0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c';

    it('signs typed data without options', async () => {
      mockSnapController.handleRequest.mockResolvedValue({
        pending: false,
        result: expectedSignature,
      });

      const signature = await keyring.signTypedData(
        ethEoaAccount1.address,
        dataToSign,
      );
      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: expectedScope,
            account: ethEoaAccount1.id,
            request: {
              method: 'eth_signTypedData_v1',
              params: [ethEoaAccount1.address, dataToSign],
            },
          },
        },
      });
      expect(signature).toStrictEqual(expectedSignature);
    });

    it('signs typed data options (v4)', async () => {
      mockSnapController.handleRequest.mockResolvedValue({
        pending: false,
        result: expectedSignature,
      });

      const signature = await keyring.signTypedData(
        ethEoaAccount1.address,
        dataToSign,
        { version: SignTypedDataVersion.V4 },
      );
      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: expectedScope,
            account: ethEoaAccount1.id,
            request: {
              method: 'eth_signTypedData_v4',
              params: [ethEoaAccount1.address, dataToSign],
            },
          },
        },
      });
      expect(signature).toStrictEqual(expectedSignature);
    });

    it('signs typed data invalid options (v2)', async () => {
      mockSnapController.handleRequest.mockResolvedValue({
        pending: false,
        result: expectedSignature,
      });

      const signature = await keyring.signTypedData(
        ethEoaAccount1.address,
        dataToSign,
        { version: 'V2' as any },
      );
      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: expectedScope,
            account: ethEoaAccount1.id,
            request: {
              method: 'eth_signTypedData_v1',
              params: [ethEoaAccount1.address, dataToSign],
            },
          },
        },
      });
      expect(signature).toStrictEqual(expectedSignature);
    });

    it('signs typed data without domain chainId has no scope', async () => {
      mockSnapController.handleRequest.mockResolvedValue({
        pending: false,
        result: expectedSignature,
      });

      const dataToSignWithoutDomainChainId = {
        ...dataToSign,
        domain: {
          name: dataToSign.domain.name,
          version: dataToSign.domain.version,
          verifyingContract: dataToSign.domain.verifyingContract,
          // We do not defined the chainId (it's currently marked as
          // optional in the current type declaration).
          // chainId: 1,
        },
      };

      const signature = await keyring.signTypedData(
        ethEoaAccount1.address,
        dataToSignWithoutDomainChainId,
        { version: SignTypedDataVersion.V4 },
      );
      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            // Without chainId alongside the typed message, we cannot
            // compute the scope for this request!
            scope: '', // Default value for `signTypedTransaction`
            account: ethEoaAccount1.id,
            request: {
              method: 'eth_signTypedData_v4',
              params: [ethEoaAccount1.address, dataToSignWithoutDomainChainId],
            },
          },
        },
      });
      expect(signature).toStrictEqual(expectedSignature);
    });

    it('calls eth_prepareUserOperation', async () => {
      const baseTxs = [
        {
          to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
          value: '0x0',
          data: '0x',
        },
        {
          to: '0x660265edc169bab511a40c0e049cc1e33774443d',
          value: '0x0',
          data: '0x619a309f',
        },
      ];

      const expectedBaseUserOp = {
        callData: '0x70641a22000000000000000000000000f3de3c0d654fda23da',
        initCode: '0x',
        nonce: '0x1',
        gasLimits: {
          callGasLimit: '0x58a83',
          verificationGasLimit: '0xe8c4',
          preVerificationGas: '0xc57c',
        },
        dummySignature: '0x',
        dummyPaymasterAndData: '0x',
        bundlerUrl: 'https://bundler.example.com/rpc',
      };

      mockSnapController.handleRequest.mockReturnValueOnce({
        pending: false,
        result: expectedBaseUserOp,
      });

      const baseUserOp = await keyring.prepareUserOperation(
        ethErc4337Account.address,
        baseTxs,
        executionContext,
      );

      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: toCaipChainId(
              KnownCaipNamespace.Eip155,
              executionContext.chainId,
            ),
            account: ethErc4337Account.id,
            request: {
              method: 'eth_prepareUserOperation',
              params: baseTxs,
            },
          },
        },
      });

      expect(baseUserOp).toStrictEqual(expectedBaseUserOp);
    });

    it('calls eth_patchUserOperation', async () => {
      const userOp = {
        sender: ethErc4337Account.address,
        nonce: '0x1',
        initCode: '0x',
        callData: '0x1234',
        callGasLimit: '0x58a83',
        verificationGasLimit: '0xe8c4',
        preVerificationGas: '0xc57c',
        maxFeePerGas: '0x87f0878c0',
        maxPriorityFeePerGas: '0x1dcd6500',
        paymasterAndData: '0x',
        signature: '0x',
      };

      const expectedPatch = {
        paymasterAndData: '0x1234',
      };

      mockSnapController.handleRequest.mockReturnValueOnce({
        pending: false,
        result: expectedPatch,
      });

      const patch = await keyring.patchUserOperation(
        ethErc4337Account.address,
        userOp,
        executionContext,
      );

      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: toCaipChainId(
              KnownCaipNamespace.Eip155,
              executionContext.chainId,
            ),
            account: ethErc4337Account.id,
            request: {
              method: 'eth_patchUserOperation',
              params: [userOp],
            },
          },
        },
      });

      expect(patch).toStrictEqual(expectedPatch);
    });

    it('calls eth_signUserOperation', async () => {
      const userOp = {
        sender: ethErc4337Account.address,
        nonce: '0x1',
        initCode: '0x',
        callData: '0x1234',
        callGasLimit: '0x58a83',
        verificationGasLimit: '0xe8c4',
        preVerificationGas: '0xc57c',
        maxFeePerGas: '0x87f0878c0',
        maxPriorityFeePerGas: '0x1dcd6500',
        paymasterAndData: '0x',
        signature: '0x',
      };

      mockSnapController.handleRequest.mockReturnValueOnce({
        pending: false,
        result: expectedSignature,
      });

      const signature = await keyring.signUserOperation(
        ethErc4337Account.address,
        userOp,
        executionContext,
      );

      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        snapId,
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: toCaipChainId(
              KnownCaipNamespace.Eip155,
              executionContext.chainId,
            ),
            account: ethErc4337Account.id,
            request: {
              method: 'eth_signUserOperation',
              params: [userOp],
            },
          },
        },
      });

      expect(signature).toStrictEqual(expectedSignature);
    });
  });

  describe('signPersonalMessage', () => {
    it('signs a personal message', async () => {
      const mockMessage = 'Hello World!';
      const expectedSignature = '0x0';
      mockSnapController.handleRequest.mockResolvedValue({
        pending: false,
        result: expectedSignature,
      });
      const signature = await keyring.signPersonalMessage(
        ethEoaAccount1.address,
        mockMessage,
      );
      expect(signature).toStrictEqual(expectedSignature);
    });

    it('fails if the address is not found', async () => {
      const mockMessage = 'Hello World!';
      await expect(
        keyring.signPersonalMessage('0x0', mockMessage),
      ).rejects.toThrow("Account '0x0' not found");
    });
  });

  describe('signMessage', () => {
    it('signs a message', async () => {
      const mockMessage =
        '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8';
      const expectedSignature = '0x0';
      mockSnapController.handleRequest.mockResolvedValue({
        pending: false,
        result: expectedSignature,
      });
      const signature = await keyring.signMessage(
        ethEoaAccount1.address,
        mockMessage,
      );
      expect(signature).toStrictEqual(expectedSignature);
      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: expect.any(String),
            account: ethEoaAccount1.id,
            request: {
              method: 'eth_sign',
              params: [ethEoaAccount1.address, mockMessage],
            },
          },
        },
        snapId: 'local:snap.mock',
      });
    });
  });

  describe('exportAccount', () => {
    it('fails to export an account', async () => {
      expect(() => keyring.exportAccount(ethEoaAccount1.address)).toThrow(
        'Exporting accounts from snaps is not supported',
      );
    });
  });

  describe('removeAccount', () => {
    it('throws an error if the account is not found', async () => {
      await expect(keyring.removeAccount('0x0')).rejects.toThrow(
        "Account '0x0' not found",
      );
    });

    it('removes an account', async () => {
      mockSnapController.handleRequest.mockResolvedValue(null);
      await keyring.removeAccount(ethEoaAccount1.address);
      expect(await keyring.getAccounts()).toStrictEqual([
        accounts[1].address,
        accounts[2].address,
        accounts[3].address,
        accounts[4].address,
      ]);
    });

    it('removes the account and warn if Snap fails', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      mockSnapController.handleRequest.mockRejectedValue('some error');
      await keyring.removeAccount(ethEoaAccount1.address);
      expect(await keyring.getAccounts()).toStrictEqual([
        accounts[1].address,
        accounts[2].address,
        accounts[3].address,
        accounts[4].address,
      ]);
      expect(console.error).toHaveBeenCalledWith(
        "Account '0xc728514df8a7f9271f4b7a4dd2aa6d2d723d3ee3' may not have been removed from snap 'local:snap.mock':",
        'some error',
      );
      spy.mockRestore();
    });
  });

  describe('listAccounts', () => {
    it('returns the list of accounts', async () => {
      const snapMetadata = {
        id: snapId,
        name: 'Snap Name',
        enabled: true,
      };
      const snapObject = {
        id: snapId,
        manifest: {
          proposedName: 'Snap Name',
        },
        enabled: true,
      };
      mockSnapController.get.mockReturnValue(snapObject);
      const result = keyring.listAccounts();
      const expected = accounts.map((a) => ({
        ...a,
        metadata: {
          name: '',
          importTime: 0,
          snap: snapMetadata,
          keyring: {
            type: 'Snap Keyring',
          },
        },
      }));
      expect(result).toStrictEqual(expected);
    });
  });

  describe('getAccountsBySnapId', () => {
    it('returns the list of addresses of a Snap', async () => {
      const addresses = await keyring.getAccountsBySnapId(snapId);
      expect(addresses).toStrictEqual(
        accounts.map((a) => a.address.toLowerCase()),
      );
    });
  });

  describe('getAccountByAddress', () => {
    it('returns the account with that address', async () => {
      const snapMetadata = {
        manifest: {
          proposedName: 'snap-name',
        },
        id: snapId,
        enabled: true,
      };
      mockSnapController.get.mockReturnValue(snapMetadata);
      expect(keyring.getAccountByAddress(ethEoaAccount1.address)).toStrictEqual(
        {
          ...ethEoaAccount1,
          metadata: {
            name: '',
            importTime: 0,
            snap: { id: snapId, name: 'snap-name', enabled: true },
            keyring: { type: 'Snap Keyring' },
          },
        },
      );
    });
  });

  describe('prepareUserOperation', () => {
    const mockIntents = [
      {
        to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
        value: '0x0',
        data: '0x',
      },
    ];

    const mockExpectedUserOp: EthBaseUserOperation = {
      callData: '0x70641a22000000000000000000000000f3de3c0d654fda23da',
      initCode: '0x',
      nonce: '0x1',
      gasLimits: {
        callGasLimit: '0x58a83',
        verificationGasLimit: '0xe8c4',
        preVerificationGas: '0xc57c',
      },
      dummySignature: '0x',
      dummyPaymasterAndData: '0x',
      bundlerUrl: 'https://bundler.example.com/rpc',
    };

    it('calls eth_prepareUserOperation', async () => {
      mockSnapController.handleRequest.mockReturnValueOnce({
        pending: false,
        result: mockExpectedUserOp,
      });

      await keyring.prepareUserOperation(
        ethErc4337Account.address,
        mockIntents,
        executionContext,
      );

      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: toCaipChainId(
              KnownCaipNamespace.Eip155,
              executionContext.chainId,
            ),
            account: ethErc4337Account.id,
            request: {
              method: 'eth_prepareUserOperation',
              params: mockIntents,
            },
          },
        },
        snapId: 'local:snap.mock',
      });
    });

    it('throws error if an pending response is returned from the Snap', async () => {
      mockSnapController.handleRequest.mockReturnValueOnce({
        pending: true,
      });

      await expect(
        keyring.prepareUserOperation(
          ethErc4337Account.address,
          mockIntents,
          executionContext,
        ),
      ).rejects.toThrow(regexForUUIDInRequiredSyncErrorMessage);
    });
  });

  describe('patchUserOperation', () => {
    const mockUserOp: EthUserOperation = {
      sender: ethErc4337Account.address,
      callData: '0x70641a22000000000000000000000000f3de3c0d654fda23da',
      initCode: '0x',
      nonce: '0x1',
      callGasLimit: '0x58a83',
      verificationGasLimit: '0xe8c4',
      preVerificationGas: '0xc57c',
      maxFeePerGas: '0x87f0878c0',
      maxPriorityFeePerGas: '0x1dcd6500',
      signature: '0x',
      paymasterAndData: '0x',
    };

    const mockExpectedPatch: EthUserOperationPatch = {
      paymasterAndData: '0x1234',
    };

    it('calls eth_patchUserOperation', async () => {
      mockSnapController.handleRequest.mockReturnValueOnce({
        pending: false,
        result: mockExpectedPatch,
      });

      await keyring.patchUserOperation(
        ethErc4337Account.address,
        mockUserOp,
        executionContext,
      );

      expect(mockSnapController.handleRequest).toHaveBeenCalledWith({
        handler: 'onKeyringRequest',
        origin: 'metamask',
        request: {
          id: expect.any(String),
          jsonrpc: '2.0',
          method: 'keyring_submitRequest',
          params: {
            id: expect.any(String),
            scope: toCaipChainId(
              KnownCaipNamespace.Eip155,
              executionContext.chainId,
            ),
            account: ethErc4337Account.id,
            request: {
              method: 'eth_patchUserOperation',
              params: [mockUserOp],
            },
          },
        },
        snapId: 'local:snap.mock',
      });
    });

    it('throws error if an pending response is returned from the Snap', async () => {
      mockSnapController.handleRequest.mockReturnValueOnce({
        pending: true,
      });

      await expect(
        keyring.patchUserOperation(
          ethErc4337Account.address,
          mockUserOp,
          executionContext,
        ),
      ).rejects.toThrow(regexForUUIDInRequiredSyncErrorMessage);
    });
  });
});
