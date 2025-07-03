import { CryptoAccount, ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import { MetaMaskKeyring as KeystoneKeyring } from '@keystonehq/metamask-airgapped-keyring';
import type { Hex } from '@metamask/utils';
import * as uuid from 'uuid';

import type { QrKeyringBridge } from '.';
import { QrKeyring, QrScanRequestType } from '.';
import {
  ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS,
  ACCOUNT_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
  EXPECTED_ACCOUNTS,
  HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS,
  HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
  KNOWN_CRYPTO_ACCOUNT_UR,
  KNOWN_HDKEY_CBOR,
  KNOWN_HDKEY_UR,
  LEGACY_TRANSACTION,
  SERIALIZED_KEYSTONE_KEYRING,
  TRANSACTION,
  TYPED_MESSAGE,
} from '../test/fixtures';

/**
 * Get the xpub from a keyring.
 *
 * @param keyring - The keyring to get the xpub from.
 * @returns The xpub of the keyring.
 */
async function getXPUBFromKeyring(
  keyring: QrKeyring | KeystoneKeyring,
): Promise<string | undefined> {
  const serialized = await keyring.serialize();
  if (!('xpub' in serialized)) {
    return undefined;
  }
  return serialized.xpub;
}

/**
 * Get a Keystone keyring instance using `@keystonehq/metamask-airgapped-keyring`.
 *
 * @returns A Keystone keyring instance with the serialized state.
 */
async function getLegacyKeystoneKeyring(): Promise<KeystoneKeyring> {
  const keystoneKeyring = new KeystoneKeyring();
  keystoneKeyring.deserialize(SERIALIZED_KEYSTONE_KEYRING);
  return keystoneKeyring;
}

/**
 * Get a mock bridge for the QrKeyring.
 *
 * @returns A mock bridge with a requestScan method.
 */
function getMockBridge(): QrKeyringBridge {
  return {
    requestScan: jest.fn(),
  };
}

/**
 * Mocks the bridge scan resolution for a given request ID and signature.
 *
 * @param bridge - The QrKeyringBridge instance to mock.
 * @param signature - The signature to return in the mocked scan resolution.
 * @param requestId - Optional request ID to use in the signature UR.
 */
function mockBridgeScanResolution(
  bridge: QrKeyringBridge,
  signature: string,
  requestId?: string | null,
): void {
  jest.spyOn(bridge, 'requestScan').mockImplementationOnce(async (request) => {
    const signatureUR = new ETHSignature(
      Buffer.from(signature, 'hex'),
      requestId === null
        ? undefined
        : Buffer.from(
            Uint8Array.from(
              uuid.parse(requestId ?? request.request?.requestId ?? ''),
            ),
          ),
    ).toUR();
    return {
      type: signatureUR.type,
      cbor: signatureUR.cbor.toString('hex'),
    };
  });
}

describe('QrKeyring', () => {
  describe('constructor', () => {
    it('can be constructed with the bridge only', () => {
      const keyring = new QrKeyring({ bridge: getMockBridge() });
      expect(keyring).toBeInstanceOf(QrKeyring);
    });

    describe('when a UR is provided', () => {
      it('can be constructed with a UR of type `crypto-hdkey`', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_HDKEY_UR,
        });

        expect(await keyring.serialize()).toStrictEqual({
          ...HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
          accounts: [],
        });
      });

      it('can be constructed with a UR of type `crypto-account`', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_CRYPTO_ACCOUNT_UR,
        });

        expect(await keyring.serialize()).toStrictEqual({
          ...ACCOUNT_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
          accounts: [],
        });
      });

      it('throws an error if the UR is a `crypto-account` but with no descriptors', () => {
        const faultyUR = new CryptoAccount(Buffer.from('37b5eed4', 'hex'), [])
          .toUREncoder(2000)
          .nextPart();

        expect(
          () =>
            new QrKeyring({
              bridge: getMockBridge(),
              ur: faultyUR,
            }),
        ).toThrow('No output descriptors found in CryptoAccount');
      });

      it('throws an error if the UR is not of type `crypto-hdkey` or `crypto-account`', () => {
        expect(
          () =>
            new QrKeyring({
              bridge: getMockBridge(),
              ur: 'invalid-ur',
            }),
        ).toThrow('Invalid Scheme');
      });
    });
  });

  describe('serialize', () => {
    describe('when the QrKeyring has no accounts', () => {
      it('returns the serialized state', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_HDKEY_UR,
        });

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual({
          ...HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
          accounts: [],
          indexes: {},
        });
      });
    });

    describe('when the QrKeyring has accounts', () => {
      it('returns the serialized state including added accounts', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_HDKEY_UR,
        });
        await keyring.addAccounts(2);

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual({
          ...HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
          accounts: [EXPECTED_ACCOUNTS[0], EXPECTED_ACCOUNTS[1]],
          indexes: {
            [EXPECTED_ACCOUNTS[0]]: 0,
            [EXPECTED_ACCOUNTS[1]]: 1,
          },
        });
      });
    });
  });

  describe('deserialize', () => {
    describe('when deserializing an empty state', () => {
      it('deserializes the state with no accounts', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        await keyring.deserialize({});

        expect(await keyring.getAccounts()).toStrictEqual([]);
        expect(await getXPUBFromKeyring(keyring)).toBeUndefined();
      });
    });

    describe('when deserializing a state with accounts', () => {
      it('deserializes the state with accounts', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        await keyring.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS);

        expect(await keyring.getAccounts()).toStrictEqual([]);
        expect(await getXPUBFromKeyring(keyring)).toStrictEqual(
          HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS.xpub,
        );
      });
    });

    describe('when using a serialized state coming from `@keystonehq/metamask-airgapped-keyring`', () => {
      it('deserializes the state with accounts', async () => {
        const keystoneKeyring = await getLegacyKeystoneKeyring();
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        // @ts-expect-error QrKeyring types are stricter than Keystone ones
        await keyring.deserialize(await keystoneKeyring.serialize());

        expect(await keystoneKeyring.getAccounts()).toStrictEqual(
          await keystoneKeyring.getAccounts(),
        );
        expect(await getXPUBFromKeyring(keyring)).toStrictEqual(
          await getXPUBFromKeyring(keystoneKeyring),
        );
      });
    });
  });

  describe('addAccounts', () => {
    describe.each([
      ['crypto-hdkey', KNOWN_HDKEY_UR, EXPECTED_ACCOUNTS],
      [
        'crypto-account',
        KNOWN_CRYPTO_ACCOUNT_UR,
        ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.accounts as Hex[],
      ],
    ])(
      'when the keyring is paired with a device of type `%s`',
      (_, ur, expectedAccounts) => {
        it('returns new accounts added', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur,
          });

          const accounts = await keyring.addAccounts(1);

          expect(accounts).toHaveLength(1);
          expect(accounts[0]).toBe(expectedAccounts[0]);
        });

        it('does not add accounts that already exist', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur,
          });
          const firstAddition = await keyring.addAccounts(1);
          keyring.setAccountToUnlock(0);

          const secondAddition = await keyring.addAccounts(1);

          expect(firstAddition).toStrictEqual(expectedAccounts.slice(0, 1));
          expect(secondAddition).toStrictEqual([]);
          expect(await keyring.getAccounts()).toStrictEqual(
            expectedAccounts.slice(0, 1),
          );
        });
      },
    );

    describe('when the keyring is paired with a device of type `crypto-hdkey`', () => {
      it('adds multiple accounts', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_HDKEY_UR,
        });
        const numberOfAccountsToAdd = 3;

        const accounts = await keyring.addAccounts(numberOfAccountsToAdd);

        expect(accounts).toHaveLength(3);
        expect(accounts).toStrictEqual(
          EXPECTED_ACCOUNTS.slice(0, numberOfAccountsToAdd),
        );
      });

      it('recovers indexes if they are not present in the serialized state', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });
        await keyring.deserialize({
          ...HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
          accounts: EXPECTED_ACCOUNTS.slice(0, 3),
        });

        // This function call will create the third account starting
        // from the last account's index.
        // This will require the keyring to recover indexes for the first two accounts
        await keyring.addAccounts(1);

        const serialized = await keyring.serialize();
        expect(await keyring.getAccounts()).toHaveLength(3);
        expect('indexes' in serialized && serialized.indexes).toStrictEqual({
          [EXPECTED_ACCOUNTS[0]]: 0,
          [EXPECTED_ACCOUNTS[1]]: 1,
          [EXPECTED_ACCOUNTS[2]]: 2,
        });
      });
    });

    describe('when the keyring is paired with a device of type `crypto-account`', () => {
      it('throws an error if the index is not included in the UR descriptors', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_CRYPTO_ACCOUNT_UR,
        });
        keyring.setAccountToUnlock(1);

        await expect(keyring.addAccounts(1)).rejects.toThrow(
          'Address not found for index 1',
        );
      });
    });

    describe('when the keyring is not paired with a device', () => {
      it('throws an error', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        await expect(keyring.addAccounts(1)).rejects.toThrow(
          'No device paired.',
        );
      });
    });
  });

  describe('getAccounts', () => {
    describe('when no accounts have been added', () => {
      it('returns an empty array', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_HDKEY_UR,
        });
        expect(await keyring.getAccounts()).toStrictEqual([]);
      });
    });

    describe('when accounts have been added', () => {
      it('returns all the accounts added', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_HDKEY_UR,
        });
        const numberOfAccountsToAdd = 3;

        const accounts = await keyring.addAccounts(numberOfAccountsToAdd);

        expect(await keyring.getAccounts()).toStrictEqual(
          EXPECTED_ACCOUNTS.slice(0, numberOfAccountsToAdd),
        );
        expect(accounts).toStrictEqual(
          EXPECTED_ACCOUNTS.slice(0, numberOfAccountsToAdd),
        );
      });
    });
  });

  describe('removeAccount', () => {
    it('removes an account from the keyring', async () => {
      const keyring = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      await keyring.addAccounts(3);

      keyring.removeAccount(EXPECTED_ACCOUNTS[1]);

      expect(await keyring.getAccounts()).toStrictEqual([
        EXPECTED_ACCOUNTS[0],
        EXPECTED_ACCOUNTS[2],
      ]);
    });

    it('does not throw if the account does not exist', async () => {
      const keyring = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      await keyring.addAccounts(1);
      const initialAccounts = await keyring.getAccounts();

      expect(() =>
        keyring.removeAccount('0x0000000000000000000000000000000000000000'),
      ).not.toThrow();
      expect(await keyring.getAccounts()).toStrictEqual(initialAccounts);
    });
  });

  describe('getName', () => {
    describe('when the keyring is paired with a device', () => {
      it('returns the name set by the paired device', () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_HDKEY_UR,
        });

        expect(keyring.getName()).toBe(
          HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS.name,
        );
      });
    });

    describe('when the keyring is not paired with a device', () => {
      it('returns the keyring type', () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        expect(keyring.getName()).toBe(QrKeyring.type);
      });
    });
  });

  describe('setAccountToUnlock', () => {
    it('sets an arbitrary account index to unlock', async () => {
      const keyring = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });

      keyring.setAccountToUnlock(2);

      expect(await keyring.addAccounts(1)).toStrictEqual([
        EXPECTED_ACCOUNTS[2],
      ]);
    });
  });

  describe('pairDevice', () => {
    it('pairs a device to the QrKeyring with a UR', async () => {
      const keyring = new QrKeyring({
        bridge: getMockBridge(),
      });

      keyring.pairDevice(KNOWN_HDKEY_UR);

      expect(await getXPUBFromKeyring(keyring)).toStrictEqual(
        SERIALIZED_KEYSTONE_KEYRING.xpub,
      );
    });

    it('throws an error if the UR is invalid', () => {
      const keyring = new QrKeyring({
        bridge: getMockBridge(),
      });

      expect(() => keyring.pairDevice('invalid-ur')).toThrow('Invalid Scheme');
    });

    it('throws an error if the UR is not of type `crypto-hdkey` or `crypto-account`', () => {
      const keyring = new QrKeyring({
        bridge: getMockBridge(),
      });

      expect(() =>
        keyring.pairDevice({
          type: 'invalid-type',
          cbor: 'a0',
        }),
      ).toThrow('Unsupported UR type');
    });
  });

  describe('getFirstPage', () => {
    describe('when the keyring is not paired with a device', () => {
      it('requests a scan through the bridge', async () => {
        const mockBridge = getMockBridge();
        jest.spyOn(mockBridge, 'requestScan').mockResolvedValue({
          type: 'crypto-hdkey',
          cbor: KNOWN_HDKEY_CBOR,
        });
        const keyring = new QrKeyring({
          bridge: mockBridge,
        });

        await keyring.getFirstPage();

        expect(mockBridge.requestScan).toHaveBeenCalledWith({
          type: QrScanRequestType.PAIR,
        });
      });
    });

    it('returns the first page of accounts', async () => {
      const mockBridge = getMockBridge();
      jest.spyOn(mockBridge, 'requestScan').mockResolvedValue({
        type: 'crypto-hdkey',
        cbor: KNOWN_HDKEY_CBOR,
      });
      const keyring = new QrKeyring({
        bridge: mockBridge,
      });

      const accounts = await keyring.getFirstPage();

      expect(accounts).toHaveLength(5);
      expect(accounts).toStrictEqual(
        EXPECTED_ACCOUNTS.slice(0, 5).map((account, index) => ({
          address: account,
          index,
        })),
      );
    });
  });

  describe('getNextPage', () => {
    describe('when the keyring is not paired with a device', () => {
      it('requests a scan through the bridge', async () => {
        const mockBridge = getMockBridge();
        jest.spyOn(mockBridge, 'requestScan').mockResolvedValue({
          type: 'crypto-hdkey',
          cbor: KNOWN_HDKEY_CBOR,
        });
        const keyring = new QrKeyring({
          bridge: mockBridge,
        });

        await keyring.getNextPage();

        expect(mockBridge.requestScan).toHaveBeenCalledWith({
          type: QrScanRequestType.PAIR,
        });
      });
    });

    it('returns the next (second) page of accounts', async () => {
      const mockBridge = getMockBridge();
      jest.spyOn(mockBridge, 'requestScan').mockResolvedValue({
        type: 'crypto-hdkey',
        cbor: KNOWN_HDKEY_CBOR,
      });
      const keyring = new QrKeyring({
        bridge: mockBridge,
      });

      const accounts = await keyring.getNextPage();

      expect(accounts).toHaveLength(5);
      expect(accounts).toStrictEqual(
        EXPECTED_ACCOUNTS.map((account, index) => ({
          address: account,
          index,
        })).slice(5, 10),
      );
    });
  });

  describe('getPreviousPage', () => {
    describe('when the keyring is not paired with a device', () => {
      it('requests a scan through the bridge', async () => {
        const mockBridge = getMockBridge();
        jest.spyOn(mockBridge, 'requestScan').mockResolvedValue({
          type: 'crypto-hdkey',
          cbor: KNOWN_HDKEY_CBOR,
        });
        const keyring = new QrKeyring({
          bridge: mockBridge,
        });

        await keyring.getPreviousPage();

        expect(mockBridge.requestScan).toHaveBeenCalledWith({
          type: QrScanRequestType.PAIR,
        });
      });
    });

    it('returns the first page of accounts when on the first page', async () => {
      const mockBridge = getMockBridge();
      jest.spyOn(mockBridge, 'requestScan').mockResolvedValue({
        type: 'crypto-hdkey',
        cbor: KNOWN_HDKEY_CBOR,
      });
      const keyring = new QrKeyring({
        bridge: mockBridge,
      });

      const accounts = await keyring.getPreviousPage();

      expect(accounts).toHaveLength(5);
      expect(accounts).toStrictEqual(
        EXPECTED_ACCOUNTS.slice(0, 5).map((account, index) => ({
          address: account,
          index,
        })),
      );
    });

    it('returns the previous page of accounts when on page > 0', async () => {
      const mockBridge = getMockBridge();
      jest.spyOn(mockBridge, 'requestScan').mockResolvedValue({
        type: 'crypto-hdkey',
        cbor: KNOWN_HDKEY_CBOR,
      });
      const keyring = new QrKeyring({
        bridge: mockBridge,
      });
      // move cursor to the third page
      await keyring.getNextPage();
      await keyring.getNextPage();

      const accounts = await keyring.getPreviousPage();

      expect(accounts).toHaveLength(5);
      expect(accounts).toStrictEqual(
        EXPECTED_ACCOUNTS.map((account, index) => ({
          address: account,
          index,
        }))
          // we expect to receive the accounts from the second page
          .slice(5, 10),
      );
    });
  });

  describe('forgetDevice', () => {
    it('forgets the device', async () => {
      const keyring = new QrKeyring({
        bridge: getMockBridge(),
      });
      await keyring.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS);
      // let's make sure we have an xpub set
      expect(await keyring.getAccounts()).toStrictEqual(
        HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS.accounts,
      );
      expect(await getXPUBFromKeyring(keyring)).toStrictEqual(
        HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS.xpub,
      );

      await keyring.forgetDevice();

      expect(await keyring.getAccounts()).toStrictEqual([]);
      expect(await getXPUBFromKeyring(keyring)).toBeUndefined();
    });
  });

  describe('signTransaction', () => {
    describe('when the keyring is not paired with a device', () => {
      it('throws an error', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        await expect(
          keyring.signTransaction(EXPECTED_ACCOUNTS[0], TRANSACTION),
        ).rejects.toThrow('No device paired');
      });
    });

    describe.each([
      ['crypto-hdkey', KNOWN_HDKEY_UR, EXPECTED_ACCOUNTS[0]],
      [
        'crypto-account',
        KNOWN_CRYPTO_ACCOUNT_UR,
        ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.accounts?.[0] as Hex,
      ],
    ])(
      'when the keyring is paired with a device of type `%s`',
      (_, ur, from) => {
        it('signs a transaction', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur,
          });
          mockBridgeScanResolution(
            keyring.bridge,
            '33ea4c1dc4b201ad1b1feaf172aadf60dcf2f8bd76d941396bfaebfc3b2868b0340d5689341925c99cdea39e3c5daf7fe2776f220e5b018e85d3b1df19c7bc4701',
          );

          const signedTx = await keyring.signTransaction(from, TRANSACTION);

          expect(signedTx.r).toBeDefined();
          expect(signedTx.s).toBeDefined();
          expect(signedTx.v).toBeDefined();
          expect(signedTx.to).toStrictEqual(TRANSACTION.to);
          expect(signedTx.nonce).toBe(TRANSACTION.nonce);
        });

        it('signs a legacy transaction', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur: KNOWN_HDKEY_UR,
          });
          mockBridgeScanResolution(
            keyring.bridge,
            'c28a6a8eeaedeef76bce7d1b2c255c6ee624feadd3b56797d88198c28853b25573221eb94f4ca5e2bce21d99c7c56823e22c7847064961f2e05d526037393fe701546d71',
          );

          const signedTx = await keyring.signTransaction(
            EXPECTED_ACCOUNTS[0],
            LEGACY_TRANSACTION,
          );

          expect(signedTx.r).toBeDefined();
          expect(signedTx.s).toBeDefined();
          expect(signedTx.v).toBeDefined();
          expect(signedTx.to).toStrictEqual(LEGACY_TRANSACTION.to);
          expect(signedTx.nonce).toBe(LEGACY_TRANSACTION.nonce);
        });

        it('throws an error if the signature scan `requestId` is wrong', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur,
          });
          mockBridgeScanResolution(
            keyring.bridge,
            '33ea4c1dc4b201ad1b1feaf172aadf60dcf2f8bd76d941396bfaebfc3b2868b0340d5689341925c99cdea39e3c5daf7fe2776f220e5b018e85d3b1df19c7bc4701',
            '92fdd736-e03e-4650-9992-ff3c70f16f4e',
          );

          await expect(
            keyring.signTransaction(from, TRANSACTION),
          ).rejects.toThrow(/Signature request ID mismatch./u);
        });

        it('throws an error if the signature scan `requestId` is missing', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur,
          });
          mockBridgeScanResolution(
            keyring.bridge,
            '33ea4c1dc4b201ad1b1feaf172aadf60dcf2f8bd76d941396bfaebfc3b2868b0340d5689341925c99cdea39e3c5daf7fe2776f220e5b018e85d3b1df19c7bc4701',
            null,
          );

          await expect(
            keyring.signTransaction(from, TRANSACTION),
          ).rejects.toThrow('Signature request ID is missing.');
        });
      },
    );
  });

  describe('signTypedData', () => {
    describe('when the keyring is not paired with a device', () => {
      it('throws an error', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        await expect(
          keyring.signTypedData(EXPECTED_ACCOUNTS[0], TYPED_MESSAGE),
        ).rejects.toThrow('No device paired');
      });
    });

    describe.each([
      ['crypto-hdkey', KNOWN_HDKEY_UR, EXPECTED_ACCOUNTS[0]],
      [
        'crypto-account',
        KNOWN_CRYPTO_ACCOUNT_UR,
        ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.accounts?.[0] as Hex,
      ],
    ])(
      'when the keyring is paired with a device of type `%s`',
      (_, ur, from) => {
        it('signs a typed data message', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur,
          });
          mockBridgeScanResolution(
            keyring.bridge,
            '1271c3de4683ed99b11ceecc0a81f48701057174eb0edd729342ecdd9e061ed26eea3c4b84d232e01de00f1f3884fdfe15f664fe2c58c2e565d672b3cb281ccb1c',
          );

          const signedMessage = await keyring.signTypedData(
            from,
            TYPED_MESSAGE,
          );

          expect(signedMessage).toBeDefined();
          expect(signedMessage).toBe(
            '0x1271c3de4683ed99b11ceecc0a81f48701057174eb0edd729342ecdd9e061ed26eea3c4b84d232e01de00f1f3884fdfe15f664fe2c58c2e565d672b3cb281ccb1c',
          );
        });
      },
    );
  });

  describe('signPersonalMessage', () => {
    describe('when the keyring is not paired with a device', () => {
      it('throws an error', async () => {
        const keyring = new QrKeyring({
          bridge: getMockBridge(),
        });

        await expect(
          keyring.signPersonalMessage(EXPECTED_ACCOUNTS[0], '0x1234'),
        ).rejects.toThrow('No device paired');
      });
    });

    describe.each([
      ['crypto-hdkey', KNOWN_HDKEY_UR, EXPECTED_ACCOUNTS[0]],
      [
        'crypto-account',
        KNOWN_CRYPTO_ACCOUNT_UR,
        ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.accounts?.[0] as Hex,
      ],
    ])(
      'when the keyring is paired with a device of type `%s`',
      (_, ur, from) => {
        it('signs a personal message', async () => {
          const keyring = new QrKeyring({
            bridge: getMockBridge(),
            ur,
          });
          mockBridgeScanResolution(
            keyring.bridge,
            'b1c3f8d2e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
          );

          const signedMessage = await keyring.signPersonalMessage(
            from,
            '0x1234',
          );

          expect(signedMessage).toBeDefined();
          expect(signedMessage).toBe(
            '0xb1c3f8d2e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
          );
        });
      },
    );
  });
});
