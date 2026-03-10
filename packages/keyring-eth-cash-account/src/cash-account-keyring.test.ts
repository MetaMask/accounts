import {
  recoverPersonalSignature,
  recoverTypedSignature,
  SignTypedDataVersion,
  type MessageTypes,
  type TypedMessage,
} from '@metamask/eth-sig-util';
import { normalize } from '@metamask/eth-sig-util';
import { assert, type Hex } from '@metamask/utils';

import { CashAccountKeyring } from './cash-account-keyring';

const sampleMnemonic =
  'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

const cashAccountHdPath = `m/44'/4392018'/0'/0`;

const getAddressAtIndex = async (
  keyring: CashAccountKeyring,
  index: number,
): Promise<Hex> => {
  const accounts = await keyring.getAccounts();
  assert(accounts[index], `Account not found at index ${index}`);
  return accounts[index];
};

describe('CashAccountKeyring', () => {
  describe('static properties', () => {
    it('has the correct type', () => {
      expect(CashAccountKeyring.type).toBe('Cash Account Keyring');
    });
  });

  describe('#type', () => {
    it('returns the correct value', () => {
      const keyring = new CashAccountKeyring();
      expect(keyring.type).toBe('Cash Account Keyring');
      expect(keyring.type).toBe(CashAccountKeyring.type);
    });
  });

  describe('#hdPath', () => {
    it('uses the cash account derivation path', () => {
      const keyring = new CashAccountKeyring();
      expect(keyring.hdPath).toBe(cashAccountHdPath);
    });
  });

  describe('#deserialize', () => {
    it('derives accounts using the cash account hd path', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const serialized = await keyring.serialize();
      expect(serialized.hdPath).toBe(cashAccountHdPath);
    });

    it('derives different addresses than the standard HD keyring path', async () => {
      const { HdKeyring } = await import('@metamask/eth-hd-keyring');

      const cashKeyring = new CashAccountKeyring();
      await cashKeyring.deserialize({
        mnemonic: sampleMnemonic,
      });
      const cashAccounts = await cashKeyring.getAccounts();

      const hdKeyring = new HdKeyring();
      await hdKeyring.deserialize({
        mnemonic: sampleMnemonic,
        numberOfAccounts: 1,
      });
      const hdAccounts = await hdKeyring.getAccounts();

      expect(cashAccounts[0]).not.toBe(hdAccounts[0]);
    });

    it('uses the cash account hd path when no hdPath option is provided', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const serialized = await keyring.serialize();
      expect(serialized.hdPath).toBe(cashAccountHdPath);
    });

    it('always uses the cash account hd path', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const serialized = await keyring.serialize();
      expect(serialized.hdPath).toBe(cashAccountHdPath);
    });

    it('always deserializes exactly one account', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);
    });
  });

  describe('#addAccounts', () => {
    it('adds a single account', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      await keyring.addAccounts();
      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(2);
    });

    it('only adds one account per call', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      await keyring.addAccounts();
      await keyring.addAccounts();
      await keyring.addAccounts();
      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(4);
    });
  });

  describe('#signPersonalMessage', () => {
    it('signs and the signature can be recovered', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const address = await getAddressAtIndex(keyring, 0);
      const message = '0x68656c6c6f20776f726c64';
      const signature = await keyring.signPersonalMessage(address, message);

      const restored = recoverPersonalSignature({
        data: message,
        signature,
      });
      expect(restored).toStrictEqual(normalize(address));
    });
  });

  describe('#signTypedData', () => {
    it('signs V1 typed data and the signature can be recovered', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const address = await getAddressAtIndex(keyring, 0);
      const typedData = [
        {
          type: 'string',
          name: 'message',
          value: 'Hi, Alice!',
        },
      ];

      const signature = await keyring.signTypedData(address, typedData);
      const restored = recoverTypedSignature({
        data: typedData,
        signature,
        version: SignTypedDataVersion.V1,
      });
      expect(restored).toStrictEqual(address);
    });

    it('signs V3 typed data and the signature can be recovered', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const address = await getAddressAtIndex(keyring, 0);
      const typedData: TypedMessage<MessageTypes> = {
        types: {
          EIP712Domain: [],
        },
        domain: {},
        primaryType: 'EIP712Domain',
        message: {},
      };

      const signature = await keyring.signTypedData(address, typedData, {
        version: SignTypedDataVersion.V3,
      });
      const restored = recoverTypedSignature({
        data: typedData,
        signature,
        version: SignTypedDataVersion.V3,
      });
      expect(restored).toStrictEqual(address);
    });
  });

  describe('#removeAccount', () => {
    it('removes an existing account', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);

      keyring.removeAccount(await getAddressAtIndex(keyring, 0));
      const remaining = await keyring.getAccounts();
      expect(remaining).toHaveLength(0);
    });

    it('throws when removing a non-existent account', () => {
      const keyring = new CashAccountKeyring();
      const fakeAddress = '0x0000000000000000000000000000000000000000';
      expect(() => keyring.removeAccount(fakeAddress)).toThrow(
        `Address ${fakeAddress} not found in this keyring`,
      );
    });
  });

  describe('#serialize / #deserialize round-trip', () => {
    it('serializes what it deserializes', async () => {
      const keyring = new CashAccountKeyring();
      await keyring.deserialize({
        mnemonic: sampleMnemonic,
      });

      const accounts = await keyring.getAccounts();
      const serialized = await keyring.serialize();

      const restored = new CashAccountKeyring();
      await restored.deserialize({
        mnemonic: serialized.mnemonic,
      });

      const restoredAccounts = await restored.getAccounts();
      expect(restoredAccounts).toStrictEqual(accounts);

      const restoredSerialized = await restored.serialize();
      expect(restoredSerialized.hdPath).toBe(cashAccountHdPath);
      expect(restoredSerialized.numberOfAccounts).toBe(1);
    });
  });
});
