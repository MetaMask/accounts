import { assert } from '@metamask/utils';
import type { Hex } from '@metamask/utils';

import { MoneyKeyring } from './money-keyring';
import type { MoneyKeyringSerializedState } from './money-keyring';

const mockMnemonic =
  'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

const mockEntropySourceId = 'mock-entropy-source-id';

// Address derived from mockMnemonic + MONEY_DERIVATION_PATH.
const mockAccount = '0x13203ef2a0e1fb26bfddcaf86a4a7d08a52d78aa' as Hex;

const mnemonicToBytes = (mnemonic: string): number[] =>
  Array.from(new TextEncoder().encode(mnemonic));

const mockGetMnemonic = jest.fn<Promise<number[]>, [string]>();

const createKeyring = (): MoneyKeyring =>
  new MoneyKeyring({ getMnemonic: mockGetMnemonic });

// State with one pre-existing account.
const mockState: MoneyKeyringSerializedState = {
  entropySource: mockEntropySourceId,
  account: mockAccount,
};

// State with no account yet.
const mockEmptyState: MoneyKeyringSerializedState = {
  entropySource: mockEntropySourceId,
};

const getAddressAtIndex = async (
  keyring: MoneyKeyring,
  index: number,
): Promise<Hex> => {
  const accounts = await keyring.getAccounts();
  const account = accounts[index];
  assert(account, `Account not found at index ${index}`);
  return account;
};

describe('MoneyKeyring', () => {
  beforeEach(() => {
    mockGetMnemonic.mockResolvedValue(mnemonicToBytes(mockMnemonic));
  });

  describe('static properties', () => {
    it('has the correct type', () => {
      expect(MoneyKeyring.type).toBe('Money Keyring');
    });
  });

  describe('type', () => {
    it('returns the correct value', () => {
      const keyring = createKeyring();
      expect(keyring.type).toBe('Money Keyring');
      expect(keyring.type).toBe(MoneyKeyring.type);
    });
  });

  describe('address derivation is deterministic', () => {
    it.each([
      {
        entropySource: 'srp-1',
        mnemonic: mockMnemonic,
        expectedAddress: '0x13203ef2a0e1fb26bfddcaf86a4a7d08a52d78aa',
      },
      {
        entropySource: 'srp-2',
        mnemonic:
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        expectedAddress: '0x9396093a74662a2fef84ad7d99155b0fb1658553',
      },
      {
        entropySource: 'srp-3',
        mnemonic:
          'letter ethics correct bus asset pipe tourist vapor envelope kangaroo warm dawn',
        expectedAddress: '0x4eb3d02b362bb921ce5af3e13dded943af7460ed',
      },
    ])(
      'derives the expected address for a given SRP',
      async ({ entropySource, mnemonic, expectedAddress }) => {
        const getMnemonic = jest
          .fn<Promise<number[]>, [string]>()
          .mockResolvedValue(mnemonicToBytes(mnemonic));
        const keyring = new MoneyKeyring({ getMnemonic });
        await keyring.deserialize({ entropySource });

        await keyring.addAccounts();
        const address = await getAddressAtIndex(keyring, 0);
        expect(address).toBe(expectedAddress);
      },
    );
  });

  describe('#getSigner (lazy initialization)', () => {
    it('initializes the inner keyring exactly once under concurrent signing calls', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockResolvedValue(mnemonicToBytes(mockMnemonic));
      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(mockState);

      const message = '0x68656c6c6f';
      await Promise.all([
        keyring.signPersonalMessage(mockAccount, message),
        keyring.signPersonalMessage(mockAccount, message),
        keyring.signPersonalMessage(mockAccount, message),
      ]);

      expect(getMnemonic).toHaveBeenCalledTimes(1);
    });

    it('throws if a signing method is called before deserialize', async () => {
      const keyring = createKeyring();
      await expect(
        keyring.signPersonalMessage(mockAccount, '0x'),
      ).rejects.toThrow('MoneyKeyring: not yet deserialized');
    });

    it('uses the cached inner keyring on subsequent calls', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockResolvedValue(mnemonicToBytes(mockMnemonic));
      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(mockState);

      const message = '0x68656c6c6f';
      await keyring.signPersonalMessage(mockAccount, message);
      await keyring.signPersonalMessage(mockAccount, message);

      expect(getMnemonic).toHaveBeenCalledTimes(1);
    });
  });

  describe('serialize', () => {
    it('throws if called before deserialize', async () => {
      const keyring = createKeyring();
      await expect(keyring.serialize()).rejects.toThrow(
        'At path: entropySource',
      );
    });

    it('does not trigger getMnemonic', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockResolvedValue(mnemonicToBytes(mockMnemonic));
      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(mockState);

      await keyring.serialize();

      expect(getMnemonic).not.toHaveBeenCalled();
    });

    it('never includes a mnemonic in the serialized state', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const serialized = await keyring.serialize();
      expect(serialized).not.toHaveProperty('mnemonic');
      expect(serialized).not.toHaveProperty('hdPath');
    });
  });

  describe('deserialize', () => {
    it('restores the account from serialized state', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const serialized = await keyring.serialize();
      expect(serialized.entropySource).toBe(mockEntropySourceId);
      expect(serialized.account).toBe(mockAccount);
    });

    it('deserializes with no account', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockEmptyState);

      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(0);

      const serialized = await keyring.serialize();
      expect(serialized.account).toBeUndefined();
    });

    it('derives different addresses than the standard HD keyring path', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');

      const moneyKeyring = createKeyring();
      await moneyKeyring.deserialize(mockEmptyState);
      await moneyKeyring.addAccounts();
      const [moneyAddress] = await moneyKeyring.getAccounts();

      const hdKeyring = new HdKeyring();
      await hdKeyring.deserialize({
        mnemonic: mockMnemonic,
        numberOfAccounts: 1,
      });
      const [hdAddress] = await hdKeyring.getAccounts();

      expect(moneyAddress).not.toBe(hdAddress);
    });

    it('does not call getMnemonic during deserialize (lazy initialization)', async () => {
      const getMnemonic = jest.fn<Promise<number[]>, [string]>();
      const keyring = new MoneyKeyring({ getMnemonic });

      await keyring.deserialize(mockState);

      expect(getMnemonic).not.toHaveBeenCalled();
    });

    it('propagates getMnemonic callback failures on first signing call', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockRejectedValue(new Error('vault locked'));
      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(mockState);

      await expect(
        keyring.signPersonalMessage(mockAccount, '0x'),
      ).rejects.toThrow('vault locked');
    });

    it('throws if called after initialization', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      await expect(keyring.deserialize(mockState)).rejects.toThrow(
        'MoneyKeyring: cannot deserialize after initialization',
      );
    });

    it('rejects an invalid account value', async () => {
      const keyring = createKeyring();
      await expect(
        keyring.deserialize({
          ...mockState,
          account: 123,
        } as unknown as MoneyKeyringSerializedState),
      ).rejects.toThrow('At path: account');
    });
  });

  describe('getAccounts', () => {
    it('returns an empty array before any account is added', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockEmptyState);
      expect(await keyring.getAccounts()).toStrictEqual([]);
    });

    it('returns the account without triggering getMnemonic', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockResolvedValue(mnemonicToBytes(mockMnemonic));
      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(mockState);

      expect(await keyring.getAccounts()).toStrictEqual([mockAccount]);
      expect(getMnemonic).not.toHaveBeenCalled();
    });
  });

  describe('addAccounts', () => {
    it('throws if called before deserialize', async () => {
      const keyring = createKeyring();
      await expect(keyring.addAccounts()).rejects.toThrow(
        'MoneyKeyring: not yet deserialized',
      );
    });

    it('throws if an account already exists', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      await expect(keyring.addAccounts()).rejects.toThrow(
        'MoneyKeyring: already has an account',
      );
    });

    it('throws if numberOfAccounts is not 1', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockEmptyState);

      await expect(keyring.addAccounts(2)).rejects.toThrow(
        'MoneyKeyring: supports adding exactly one account',
      );
    });

    it('throws if the inner keyring returns no accounts', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');
      jest.spyOn(HdKeyring.prototype, 'addAccounts').mockResolvedValue([]);

      const keyring = createKeyring();
      await keyring.deserialize(mockEmptyState);

      await expect(keyring.addAccounts()).rejects.toThrow(
        'MoneyKeyring: failed to add account',
      );
    });

    it('is race-free under concurrent calls', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockEmptyState);

      const results = await Promise.allSettled([
        keyring.addAccounts(),
        keyring.addAccounts(),
      ]);

      const fulfilled = results.filter(
        (result) => result.status === 'fulfilled',
      );
      const rejected = results.filter((result) => result.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason.message).toBe(
        'MoneyKeyring: already has an account',
      );
      expect(mockGetMnemonic).toHaveBeenCalledTimes(1);
      expect(await keyring.getAccounts()).toHaveLength(1);
    });

    it('adds an account when none exist', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockEmptyState);

      await keyring.addAccounts();
      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);
    });
  });

  describe('entropySource', () => {
    it('returns undefined before deserialize', () => {
      const keyring = createKeyring();
      expect(keyring.entropySource).toBeUndefined();
    });

    it('returns the entropy source after deserialize', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);
      expect(keyring.entropySource).toBe(mockEntropySourceId);
    });
  });

  describe('signing', () => {
    it('throws if the derived account does not match the stored account', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockResolvedValue(mnemonicToBytes(mockMnemonic));

      // Construct a state with an account address that won't match the derived one.
      const tampered: MoneyKeyringSerializedState = {
        entropySource: mockEntropySourceId,
        account: '0x0000000000000000000000000000000000000001',
      };

      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(tampered);

      await expect(
        keyring.signPersonalMessage(tampered.account as Hex, '0x'),
      ).rejects.toThrow('MoneyKeyring: signer account mismatch');
    });

    it('throws if the inner keyring derives no account despite one being expected', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');
      jest.spyOn(HdKeyring.prototype, 'getAccounts').mockResolvedValue([]);

      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      await expect(
        keyring.signPersonalMessage(mockAccount, '0x'),
      ).rejects.toThrow('MoneyKeyring: signer account mismatch');
    });
  });

  describe('signing pass-through', () => {
    it('signPersonalMessage delegates to the inner keyring', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');
      const spy = jest.spyOn(HdKeyring.prototype, 'signPersonalMessage');

      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const address = await getAddressAtIndex(keyring, 0);
      const message = '0x68656c6c6f'; // "hello" in hex
      const signature = await keyring.signPersonalMessage(address, message);

      expect(spy).toHaveBeenCalledWith(address, message);
      expect(signature).toMatch(/^0x[0-9a-f]+$/u);
    });

    it('signTransaction delegates to the inner keyring', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');
      const mockSignature = '0xsignature';
      const spy = jest
        .spyOn(HdKeyring.prototype, 'signTransaction')
        .mockResolvedValue(mockSignature as never);

      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const mockTx = {} as never;
      const result = await keyring.signTransaction(mockAccount, mockTx);

      expect(spy).toHaveBeenCalledWith(mockAccount, mockTx);
      expect(result).toBe(mockSignature);
    });

    it('signTypedData delegates to the inner keyring', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');
      const mockSignature = '0xsignature';
      const spy = jest
        .spyOn(HdKeyring.prototype, 'signTypedData')
        .mockResolvedValue(mockSignature);

      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const mockTypedData = {} as never;
      const result = await keyring.signTypedData(mockAccount, mockTypedData);

      expect(spy).toHaveBeenCalledWith(mockAccount, mockTypedData);
      expect(result).toBe(mockSignature);
    });

    it('signEip7702Authorization delegates to the inner keyring', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');
      const mockSignature = '0xsignature' as never;
      const spy = jest
        .spyOn(HdKeyring.prototype, 'signEip7702Authorization')
        .mockResolvedValue(mockSignature);

      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const mockAuthorization = {} as never;
      const result = await keyring.signEip7702Authorization(
        mockAccount,
        mockAuthorization,
      );

      expect(spy).toHaveBeenCalledWith(mockAccount, mockAuthorization);
      expect(result).toBe(mockSignature);
    });
  });

  describe('serialize / deserialize round-trip', () => {
    it('serializes what it deserializes', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const accounts = await keyring.getAccounts();
      const serialized = await keyring.serialize();

      const restored = createKeyring();
      await restored.deserialize(serialized);

      const restoredAccounts = await restored.getAccounts();
      expect(restoredAccounts).toStrictEqual(accounts);

      const restoredSerialized = await restored.serialize();
      expect(restoredSerialized).toStrictEqual({
        entropySource: mockEntropySourceId,
        account: mockAccount,
      });
    });
  });
});
