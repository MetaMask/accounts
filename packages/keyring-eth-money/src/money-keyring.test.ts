import { assert, type Hex } from '@metamask/utils';

import {
  MONEY_DERIVATION_PATH,
  MoneyKeyring,
  type MoneyKeyringSerializedState,
} from './money-keyring';

const sampleMnemonic =
  'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

const mnemonicToBytes = (mnemonic: string): number[] =>
  Array.from(new TextEncoder().encode(mnemonic));

const mockState = {
  mnemonic: mnemonicToBytes(sampleMnemonic),
  numberOfAccounts: 1,
  hdPath: MONEY_DERIVATION_PATH,
} as const;

const getAddressAtIndex = async (
  keyring: MoneyKeyring,
  index: number,
): Promise<Hex> => {
  const accounts = await keyring.getAccounts();
  assert(accounts[index], `Account not found at index ${index}`);
  return accounts[index];
};

describe('MoneyKeyring', () => {
  describe('static properties', () => {
    it('has the correct type', () => {
      expect(MoneyKeyring.type).toBe('Money Keyring');
    });
  });

  describe('type', () => {
    it('returns the correct value', () => {
      const keyring = new MoneyKeyring();
      expect(keyring.type).toBe('Money Keyring');
      expect(keyring.type).toBe(MoneyKeyring.type);
    });
  });

  describe('hdPath', () => {
    it('uses the money account derivation path', () => {
      const keyring = new MoneyKeyring();
      expect(keyring.hdPath).toBe(MONEY_DERIVATION_PATH);
    });
  });

  describe('address derivation is deterministic', () => {
    it.each([
      {
        mnemonic: sampleMnemonic,
        expectedAddress: '0x13203ef2a0e1fb26bfddcaf86a4a7d08a52d78aa',
      },
      {
        mnemonic:
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        expectedAddress: '0x9396093a74662a2fef84ad7d99155b0fb1658553',
      },
      {
        mnemonic:
          'letter ethics correct bus asset pipe tourist vapor envelope kangaroo warm dawn',
        expectedAddress: '0x4eb3d02b362bb921ce5af3e13dded943af7460ed',
      },
    ])(
      'derives the expected address for a given SRP',
      async ({ mnemonic, expectedAddress }) => {
        const keyring = new MoneyKeyring();
        await keyring.deserialize({
          mnemonic: mnemonicToBytes(mnemonic),
          numberOfAccounts: 1,
          hdPath: MONEY_DERIVATION_PATH,
        });

        const address = await getAddressAtIndex(keyring, 0);
        expect(address).toBe(expectedAddress);
      },
    );
  });

  describe('serialize', () => {
    it('serializes a freshly constructed keyring with 0 accounts', async () => {
      const keyring = new MoneyKeyring();
      const serialized = await keyring.serialize();
      expect(serialized.mnemonic).toStrictEqual([]);
      expect(serialized.numberOfAccounts).toBe(0);
      expect(serialized.hdPath).toBe(MONEY_DERIVATION_PATH);
    });
  });

  describe('deserialize', () => {
    it('derives accounts using the money account hd path', async () => {
      const keyring = new MoneyKeyring();
      await keyring.deserialize(mockState);

      const serialized = await keyring.serialize();
      expect(serialized.mnemonic).toStrictEqual(
        mnemonicToBytes(sampleMnemonic),
      );
      expect(serialized.numberOfAccounts).toBe(1);
      expect(serialized.hdPath).toBe(MONEY_DERIVATION_PATH);
    });

    it('deserializes with numberOfAccounts: 0', async () => {
      const keyring = new MoneyKeyring();
      await keyring.deserialize({
        mnemonic: mnemonicToBytes(sampleMnemonic),
        numberOfAccounts: 0,
        hdPath: MONEY_DERIVATION_PATH,
      });

      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(0);

      const serialized = await keyring.serialize();
      expect(serialized.numberOfAccounts).toBe(0);
    });

    it('derives different addresses than the standard HD keyring path', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');

      const moneyKeyring = new MoneyKeyring();
      await moneyKeyring.deserialize(mockState);
      const moneyAccounts = await moneyKeyring.getAccounts();

      const hdKeyring = new HdKeyring();
      await hdKeyring.deserialize({
        mnemonic: sampleMnemonic,
        numberOfAccounts: 1,
      });
      const hdAccounts = await hdKeyring.getAccounts();

      expect(moneyAccounts[0]).not.toBe(hdAccounts[0]);
    });

    it('rejects an invalid numberOfAccounts', async () => {
      const keyring = new MoneyKeyring();
      await expect(
        keyring.deserialize({
          ...mockState,
          numberOfAccounts: 5,
        } as unknown as MoneyKeyringSerializedState),
      ).rejects.toThrow('At path: numberOfAccounts');
    });

    it('rejects a string mnemonic', async () => {
      const keyring = new MoneyKeyring();
      await expect(
        keyring.deserialize({
          ...mockState,
          mnemonic: sampleMnemonic,
        } as unknown as MoneyKeyringSerializedState),
      ).rejects.toThrow('At path: mnemonic');
    });

    it('rejects an invalid hdPath', async () => {
      const keyring = new MoneyKeyring();
      await expect(
        keyring.deserialize({
          ...mockState,
          hdPath: "m/44'/60'/0'/0",
        } as unknown as MoneyKeyringSerializedState),
      ).rejects.toThrow('At path: hdPath');
    });
  });

  describe('addAccounts', () => {
    it('throws if an account already exists', async () => {
      const keyring = new MoneyKeyring();
      await keyring.deserialize(mockState);

      await expect(keyring.addAccounts()).rejects.toThrow(
        'Money keyring already has an account',
      );
    });

    it('adds an account when none exist', async () => {
      const keyring = new MoneyKeyring();
      await keyring.deserialize(mockState);

      keyring.removeAccount(await getAddressAtIndex(keyring, 0));
      const empty = await keyring.getAccounts();
      expect(empty).toHaveLength(0);

      await keyring.addAccounts();
      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);
    });

    it('re-adds the same account after removal', async () => {
      const keyring = new MoneyKeyring();
      await keyring.deserialize(mockState);

      const originalAddress = await getAddressAtIndex(keyring, 0);

      keyring.removeAccount(originalAddress);
      expect(await keyring.getAccounts()).toHaveLength(0);

      await keyring.addAccounts();
      const restoredAddress = await getAddressAtIndex(keyring, 0);

      expect(restoredAddress).toBe(originalAddress);
    });
  });

  describe('serialize / deserialize round-trip', () => {
    it('serializes what it deserializes', async () => {
      const keyring = new MoneyKeyring();
      await keyring.deserialize(mockState);

      const accounts = await keyring.getAccounts();
      const serialized = await keyring.serialize();

      const restored = new MoneyKeyring();
      await restored.deserialize(serialized);

      const restoredAccounts = await restored.getAccounts();
      expect(restoredAccounts).toStrictEqual(accounts);

      const restoredSerialized = await restored.serialize();
      expect(restoredSerialized.numberOfAccounts).toBe(1);
      expect(restoredSerialized.hdPath).toBe(MONEY_DERIVATION_PATH);
      expect(restoredSerialized.mnemonic).toStrictEqual(serialized.mnemonic);
    });
  });
});
