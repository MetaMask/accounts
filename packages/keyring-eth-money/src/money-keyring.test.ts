import { assert, type Hex } from '@metamask/utils';

import {
  MoneyKeyring,
  type MoneyKeyringSerializedState,
} from './money-keyring';

const mockMnemonic =
  'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

const mockEntropySourceId = 'mock-entropy-source-id';

const mnemonicToBytes = (mnemonic: string): number[] =>
  Array.from(new TextEncoder().encode(mnemonic));

const mockGetMnemonic = jest.fn<Promise<number[]>, [string]>();

const createKeyring = (): MoneyKeyring =>
  new MoneyKeyring({ getMnemonic: mockGetMnemonic });

const mockState: MoneyKeyringSerializedState = {
  entropySource: mockEntropySourceId,
  numberOfAccounts: 1,
};

const getAddressAtIndex = async (
  keyring: MoneyKeyring,
  index: number,
): Promise<Hex> => {
  const accounts = await keyring.getAccounts();
  assert(accounts[index], `Account not found at index ${index}`);
  return accounts[index];
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
        await keyring.deserialize({ entropySource, numberOfAccounts: 1 });

        const address = await getAddressAtIndex(keyring, 0);
        expect(address).toBe(expectedAddress);
      },
    );
  });

  describe('#getSigner (lazy initialization)', () => {
    it('initializes the inner keyring exactly once under concurrent calls', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockResolvedValue(mnemonicToBytes(mockMnemonic));
      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(mockState);

      // Fire multiple concurrent getAccounts calls to exercise the mutex path.
      await Promise.all([
        keyring.getAccounts(),
        keyring.getAccounts(),
        keyring.getAccounts(),
      ]);

      expect(getMnemonic).toHaveBeenCalledTimes(1);
    });

    it('throws if a signing method is called before deserialize', async () => {
      const keyring = createKeyring();
      await expect(keyring.getAccounts()).rejects.toThrow(
        'MoneyKeyring: not yet deserialized',
      );
    });
  });

  describe('serialize', () => {
    it('throws if called before deserialize', async () => {
      const keyring = createKeyring();
      await expect(keyring.serialize()).rejects.toThrow(
        'At path: entropySource',
      );
    });

    it('does not trigger getMnemonic before any account or signing call', async () => {
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
    it('derives accounts using the money account hd path', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      const serialized = await keyring.serialize();
      expect(serialized.entropySource).toBe(mockEntropySourceId);
      expect(serialized.numberOfAccounts).toBe(1);
    });

    it('deserializes with numberOfAccounts: 0', async () => {
      const keyring = createKeyring();
      await keyring.deserialize({
        ...mockState,
        numberOfAccounts: 0,
      });

      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(0);

      const serialized = await keyring.serialize();
      expect(serialized.numberOfAccounts).toBe(0);
    });

    it('derives different addresses than the standard HD keyring path', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');

      const moneyKeyring = createKeyring();
      await moneyKeyring.deserialize(mockState);
      const moneyAccounts = await moneyKeyring.getAccounts();

      const hdKeyring = new HdKeyring();
      await hdKeyring.deserialize({
        mnemonic: mockMnemonic,
        numberOfAccounts: 1,
      });
      const hdAccounts = await hdKeyring.getAccounts();

      expect(moneyAccounts[0]).not.toBe(hdAccounts[0]);
    });

    it('does not call getMnemonic during deserialize (lazy initialization)', async () => {
      const getMnemonic = jest.fn<Promise<number[]>, [string]>();
      const keyring = new MoneyKeyring({ getMnemonic });

      await keyring.deserialize(mockState);

      expect(getMnemonic).not.toHaveBeenCalled();
    });

    it('propagates getMnemonic callback failures on first use', async () => {
      const getMnemonic = jest
        .fn<Promise<number[]>, [string]>()
        .mockRejectedValue(new Error('vault locked'));
      const keyring = new MoneyKeyring({ getMnemonic });
      await keyring.deserialize(mockState);

      await expect(keyring.getAccounts()).rejects.toThrow('vault locked');
    });

    it('throws if called after initialization', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      await expect(keyring.deserialize(mockState)).rejects.toThrow(
        'MoneyKeyring: cannot deserialize after initialization',
      );
    });

    it('rejects an invalid numberOfAccounts', async () => {
      const keyring = createKeyring();
      await expect(
        keyring.deserialize({
          ...mockState,
          numberOfAccounts: 5,
        } as unknown as MoneyKeyringSerializedState),
      ).rejects.toThrow('At path: numberOfAccounts');
    });
  });

  describe('addAccounts', () => {
    it('throws if an account already exists', async () => {
      const keyring = createKeyring();
      await keyring.deserialize(mockState);

      await expect(keyring.addAccounts()).rejects.toThrow(
        'MoneyKeyring: already has an account',
      );
    });

    it('throws if numberOfAccounts is not 1', async () => {
      const keyring = createKeyring();
      await keyring.deserialize({ ...mockState, numberOfAccounts: 0 });

      await expect(keyring.addAccounts(2)).rejects.toThrow(
        'MoneyKeyring: supports adding exactly one account',
      );
    });

    it('adds an account when none exist', async () => {
      const keyring = createKeyring();
      await keyring.deserialize({ ...mockState, numberOfAccounts: 0 });

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
        numberOfAccounts: 1,
      });
    });
  });
});
