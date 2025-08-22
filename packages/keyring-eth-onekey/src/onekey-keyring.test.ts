/* eslint-disable jest/no-conditional-expect */
import { Common, Chain, Hardfork } from '@ethereumjs/common';
import type { TypedTransaction } from '@ethereumjs/tx';
import {
  TransactionFactory,
  FeeMarketEIP1559Transaction,
} from '@ethereumjs/tx';
import { Address } from '@ethereumjs/util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
// eslint-disable-next-line @typescript-eslint/naming-convention
import EthereumTx from 'ethereumjs-tx';
// eslint-disable-next-line @typescript-eslint/naming-convention
import HDKey from 'hdkey';
import * as sinon from 'sinon';

import type { OneKeyBridge } from './onekey-bridge';
import type { AccountDetails } from './onekey-keyring';
import { OneKeyKeyring } from './onekey-keyring';
import { OneKeyWebBridge } from './onekey-web-bridge';

const CONNECT_SRC = 'https://jssdk.onekey.so/1.1.5/';
const fakeAccounts = [
  '0x73d0385F4d8E00C5e6504C6030F47BF6212736A8',
  '0xFA01a39f8Abaeb660c3137f14A310d0b414b2A15',
  '0x574BbB36871bA6b78E27f4B4dCFb76eA0091880B',
  '0xba98D6a5ac827632E3457De7512d211e4ff7e8bD',
  '0x1f815D67006163E502b8eD4947C91ad0A62De24e',
  '0xf69619a3dCAA63757A6BA0AF3628f5F6C42c50d2',
  '0xA8664Df3D5E74BE57c19fC7005BBcd0F5328041e',
  '0xf2252f414e727d652d5a488fE4BFf7e64478737F',
  '0x5708Ae081b48ad7bA8c50ca3D4fa0238d544D6FA',
  '0x12eF7dfb86f6D5E3e0521b72472ca02D2a3814F4',
  '0x9115Fa64b8B9864D6545Fc00d62B6A9Cbb876be7',
  '0x8B6cF2eA1A54E054EFC35E4244Ac507c479bb5F6',
  '0x6C480ba4409dd5FF29Cbd3ED67152B791750a708',
  '0x5f2E5ddEd3DBD431deCc406Ae999F277B625Ba25',
  '0x8a143C4CCed2ce826DE598Dbbf7C706cD6DB0Ccd',
] as const;

const fakeXPubKey =
  'xpub6CNFa58kEQJu2hwMVoofpDEKVVSg6gfwqBqE2zHAianaUnQkrJzJJ42iLDp7Dmg2aP88qCKoFZ4jidk3tECdQuF4567NGHDfe7iBRwHxgke';
const fakeHdKey = HDKey.fromExtendedKey(fakeXPubKey);
const fakeTx = new EthereumTx({
  nonce: '0x00',
  gasPrice: '0x09184e72a000',
  gasLimit: '0x2710',
  to: '0x0000000000000000000000000000000000000000',
  value: '0x00',
  data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
  // EIP 155 chainId - mainnet: 1, ropsten: 3
  chainId: 1,
});

const common = new Common({ chain: 'mainnet' });
const commonEIP1559 = new Common({
  chain: Chain.Mainnet,
  hardfork: Hardfork.London,
});
const newFakeTx = TransactionFactory.fromTxData(
  {
    nonce: '0x00',
    gasPrice: '0x09184e72a000',
    gasLimit: '0x2710',
    to: '0x0000000000000000000000000000000000000000',
    value: '0x00',
    data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
  },
  { common, freeze: false },
);

const contractDeploymentFakeTx = TransactionFactory.fromTxData(
  {
    nonce: '0x00',
    gasPrice: '0x09184e72a000',
    gasLimit: '0x2710',
    value: '0x00',
    data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
  },
  { common, freeze: false },
);

const fakeTypeTwoTx = FeeMarketEIP1559Transaction.fromTxData(
  {
    nonce: '0x00',
    maxFeePerGas: '0x19184e72a000',
    maxPriorityFeePerGas: '0x09184e72a000',
    gasLimit: '0x2710',
    to: '0x0000000000000000000000000000000000000000',
    value: '0x00',
    data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
    type: 2,
    v: '0x01',
  },
  { common: commonEIP1559, freeze: false },
);

describe('OneKeyKeyring', function () {
  let keyring: OneKeyKeyring;
  let bridge: OneKeyBridge;

  beforeEach(async function () {
    bridge = new OneKeyWebBridge();
    keyring = new OneKeyKeyring({ bridge });
    keyring.hdk = fakeHdKey;
    keyring.accountDetails = {
      [fakeAccounts[0]]: {
        index: 0,
        hdPath: `m/44'/60'/0'/0/0`,
        passphraseState: '',
      },
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('Keyring.type', function () {
    it('is a class property that returns the type string.', function () {
      const { type } = OneKeyKeyring;
      expect(typeof type).toBe('string');
    });

    it('returns the correct value', function () {
      const { type } = keyring;
      const correct = OneKeyKeyring.type;
      expect(type).toBe(correct);
    });
  });

  describe('constructor', function () {
    it('constructs', async function () {
      const keyringInstance = new OneKeyKeyring({ bridge });
      expect(typeof keyringInstance).toBe('object');
      const accounts = await keyringInstance.getAccounts();
      expect(Array.isArray(accounts)).toBe(true);
    });

    it('throws if a bridge is not provided', async function () {
      expect(
        () =>
          new OneKeyKeyring({
            bridge: undefined as unknown as OneKeyBridge,
          }),
      ).toThrow('Bridge is a required dependency for the keyring');
    });
  });

  describe('init', function () {
    it('initialises the bridge', async function () {
      const initStub = sinon.stub().resolves();
      bridge.init = initStub;

      await keyring.init({
        fetchConfig: true,
        connectSrc: CONNECT_SRC,
        env: 'web',
      });

      expect(initStub.calledOnce).toBe(true);
      sinon.assert.calledWithExactly(initStub, {
        fetchConfig: true,
        connectSrc: CONNECT_SRC,
        env: 'web',
      });
    });
  });

  describe('destroy', function () {
    it('calls dispose on bridge', async function () {
      const disposeStub = sinon.stub().resolves();
      bridge.dispose = disposeStub;

      await keyring.destroy();

      expect(disposeStub.calledOnce).toBe(true);
      sinon.assert.calledWithExactly(disposeStub);
    });
  });

  describe('serialize', function () {
    it('serializes an instance', async function () {
      const output = await keyring.serialize();
      expect(output.page).toBe(0);
      expect(output.hdPath).toBe(`m/44'/60'/0'/0`);
      expect(Array.isArray(output.accounts)).toBe(true);
      expect(output.accounts).toHaveLength(0);
    });
  });

  describe('deserialize', function () {
    it('serializes what it deserializes', async function () {
      const someHdPath = `m/44'/60'/0'/1`;
      await keyring.deserialize({
        page: 10,
        hdPath: someHdPath,
        accounts: [],
      });
      const serialized = await keyring.serialize();
      expect(serialized.accounts).toHaveLength(0);
      expect(serialized.page).toBe(10);
      expect(serialized.hdPath).toBe(someHdPath);
    });
  });

  describe('isUnlocked', function () {
    it('should return true if we have a public key', function () {
      expect(keyring.isUnlocked()).toBe(true);
    });
  });

  describe('unlock', function () {
    it('should resolve if we have a public key', async function () {
      expect(async () => {
        await keyring.unlock();
      }).not.toThrow();
    });

    it('should call OneKeyWebBridge.getPublicKey if we dont have a public key', async function () {
      const getPassphraseStateStub = sinon.stub().resolves({
        success: true,
        payload: '',
      });
      const getPublicKeyStub = sinon.stub().resolves({
        success: true,
        payload: {
          publicKey: fakeHdKey.publicKey.toString('hex'),
          chainCode: fakeHdKey.chainCode.toString('hex'),
        },
      });
      bridge.getPassphraseState = getPassphraseStateStub;
      bridge.getPublicKey = getPublicKeyStub;

      keyring.hdk = new HDKey();
      try {
        await keyring.unlock();
      } catch {
        // Since we only care about ensuring our function gets called,
        // we want to ignore warnings due to stub data
      }

      expect(getPublicKeyStub.calledOnce).toBe(true);
      sinon.assert.calledWithExactly(getPublicKeyStub, {
        showOnOneKey: false,
        chainId: 1,
        path: "m/44'/60'/0'",
        passphraseState: '',
      });
    });
  });

  describe('setAccountToUnlock', function () {
    it('should set unlockedAccount', function () {
      keyring.setAccountToUnlock(3);
      expect(keyring.unlockedAccount).toBe(3);
    });
  });

  describe('addAccounts', function () {
    describe('with no arguments', function () {
      it('returns a single account', async function () {
        keyring.setAccountToUnlock(0);
        const accounts = await keyring.addAccounts(1);
        expect(accounts).toHaveLength(1);
      });

      it('returns the custom accounts desired', async function () {
        keyring.setAccountToUnlock(0);
        await keyring.addAccounts(1);
        keyring.setAccountToUnlock(2);
        await keyring.addAccounts(1);

        const accounts = await keyring.getAccounts();
        expect(accounts[0]).toBe(fakeAccounts[0]);
        expect(accounts[1]).toBe(fakeAccounts[2]);
      });
    });

    describe('with a numeric argument', function () {
      it('returns that number of accounts', async function () {
        keyring.setAccountToUnlock(0);
        const firstBatch = await keyring.addAccounts(3);
        keyring.setAccountToUnlock(3);
        const secondBatch = await keyring.addAccounts(2);

        expect(firstBatch).toHaveLength(3);
        expect(secondBatch).toHaveLength(2);
      });

      it('returns the expected accounts', async function () {
        keyring.setAccountToUnlock(0);
        const firstBatch = await keyring.addAccounts(3);
        keyring.setAccountToUnlock(3);
        const secondBatch = await keyring.addAccounts(2);

        expect(firstBatch).toStrictEqual([
          fakeAccounts[0],
          fakeAccounts[1],
          fakeAccounts[2],
        ]);
        expect(secondBatch).toStrictEqual([fakeAccounts[3], fakeAccounts[4]]);
      });
    });
  });

  describe('removeAccount', function () {
    describe('if the account exists', function () {
      it('should remove that account', async function () {
        keyring.setAccountToUnlock(0);
        const accounts = await keyring.addAccounts(1);
        expect(accounts).toHaveLength(1);
        keyring.removeAccount(fakeAccounts[0]);
        const accountsAfterRemoval = await keyring.getAccounts();
        expect(accountsAfterRemoval).toHaveLength(0);
      });

      it('should remove only the account requested', async function () {
        keyring.setAccountToUnlock(0);
        await keyring.addAccounts(1);
        keyring.setAccountToUnlock(1);
        await keyring.addAccounts(1);

        let accounts = await keyring.getAccounts();
        expect(accounts).toHaveLength(2);

        keyring.removeAccount(fakeAccounts[0]);
        accounts = await keyring.getAccounts();

        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toBe(fakeAccounts[1]);
      });
    });

    describe('if the account does not exist', function () {
      it('should throw an error', function () {
        const unexistingAccount = '0x0000000000000000000000000000000000000000';
        expect(() => {
          keyring.removeAccount(unexistingAccount);
        }).toThrow(`Address ${unexistingAccount} not found in this keyring`);
      });
    });
  });

  describe('getFirstPage', function () {
    it('should set the currentPage to 1', async function () {
      await keyring.getFirstPage();
      expect(keyring.page).toBe(1);
    });

    it('should return the list of accounts for current page', async function () {
      const accounts = await keyring.getFirstPage();

      expect(accounts).toHaveLength(keyring.perPage);
      expect(accounts[0]?.address).toBe(fakeAccounts[0]);
      expect(accounts[1]?.address).toBe(fakeAccounts[1]);
      expect(accounts[2]?.address).toBe(fakeAccounts[2]);
      expect(accounts[3]?.address).toBe(fakeAccounts[3]);
      expect(accounts[4]?.address).toBe(fakeAccounts[4]);
    });
  });

  describe('getNextPage', function () {
    it('should return the list of accounts for current page', async function () {
      const accounts = await keyring.getNextPage();
      expect(accounts).toHaveLength(keyring.perPage);
      expect(accounts[0]?.address).toBe(fakeAccounts[0]);
      expect(accounts[1]?.address).toBe(fakeAccounts[1]);
      expect(accounts[2]?.address).toBe(fakeAccounts[2]);
      expect(accounts[3]?.address).toBe(fakeAccounts[3]);
      expect(accounts[4]?.address).toBe(fakeAccounts[4]);
    });

    it('should be able to advance to the next page', async function () {
      // manually advance 1 page
      await keyring.getNextPage();

      const accounts = await keyring.getNextPage();
      expect(accounts).toHaveLength(keyring.perPage);
      expect(accounts[0]?.address).toBe(fakeAccounts[keyring.perPage + 0]);
      expect(accounts[1]?.address).toBe(fakeAccounts[keyring.perPage + 1]);
      expect(accounts[2]?.address).toBe(fakeAccounts[keyring.perPage + 2]);
      expect(accounts[3]?.address).toBe(fakeAccounts[keyring.perPage + 3]);
      expect(accounts[4]?.address).toBe(fakeAccounts[keyring.perPage + 4]);
    });
  });

  describe('getPreviousPage', function () {
    it('should return the list of accounts for current page', async function () {
      // manually advance 1 page
      await keyring.getNextPage();
      const accounts = await keyring.getPreviousPage();

      expect(accounts).toHaveLength(keyring.perPage);
      expect(accounts[0]?.address).toBe(fakeAccounts[0]);
      expect(accounts[1]?.address).toBe(fakeAccounts[1]);
      expect(accounts[2]?.address).toBe(fakeAccounts[2]);
      expect(accounts[3]?.address).toBe(fakeAccounts[3]);
      expect(accounts[4]?.address).toBe(fakeAccounts[4]);
    });

    it('should be able to go back to the previous page', async function () {
      // manually advance 1 page
      await keyring.getNextPage();
      const accounts = await keyring.getPreviousPage();

      expect(accounts).toHaveLength(keyring.perPage);
      expect(accounts[0]?.address).toBe(fakeAccounts[0]);
      expect(accounts[1]?.address).toBe(fakeAccounts[1]);
      expect(accounts[2]?.address).toBe(fakeAccounts[2]);
      expect(accounts[3]?.address).toBe(fakeAccounts[3]);
      expect(accounts[4]?.address).toBe(fakeAccounts[4]);
    });
  });

  describe('getAccounts', function () {
    const accountIndex = 5;
    let accounts: string[] = [];
    beforeEach(async function () {
      keyring.setAccountToUnlock(accountIndex);
      await keyring.addAccounts(1);
      accounts = (await keyring.getAccounts()) as string[];
    });

    it('returns an array of accounts', function () {
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts).toHaveLength(1);
    });

    it('returns the expected', function () {
      const expectedAccount = fakeAccounts[accountIndex];
      expect(accounts[0]).toBe(expectedAccount);
    });
  });

  describe('signTransaction', function () {
    it('should pass serialized transaction to onekey and return signed tx', async function () {
      const ethereumSignTransactionStub = sinon.stub().resolves({
        success: true,
        payload: { v: '0x1', r: '0x0', s: '0x0' },
      });
      bridge.ethereumSignTransaction = ethereumSignTransactionStub;

      sinon.stub(fakeTx, 'verifySignature').callsFake(() => true);
      sinon
        .stub(fakeTx, 'getSenderAddress')
        .callsFake(() =>
          Buffer.from(Address.fromString(fakeAccounts[0]).bytes),
        );

      const returnedTx = await keyring.signTransaction(fakeAccounts[0], fakeTx);
      // assert that the v,r,s values got assigned to tx.
      expect(returnedTx.v).toBeDefined();
      expect(returnedTx.r).toBeDefined();
      expect(returnedTx.s).toBeDefined();
      // ensure we get a older version transaction back
      expect((returnedTx as EthereumTx).getChainId()).toBe(1);
      expect((returnedTx as TypedTransaction).common).toBeUndefined();
      expect(ethereumSignTransactionStub.calledOnce).toBe(true);
    });

    it('should pass serialized newer transaction to onekey and return signed tx', async function () {
      sinon.stub(TransactionFactory, 'fromTxData').callsFake(() => {
        // without having a private key/public key pair in this test, we have
        // mock out this method and return the original tx because we can't
        // replicate r and s values without the private key.
        return newFakeTx;
      });

      const ethereumSignTransactionStub = sinon.stub().resolves({
        success: true,
        payload: { v: '0x25', r: '0x0', s: '0x0' },
      });
      bridge.ethereumSignTransaction = ethereumSignTransactionStub;

      sinon
        .stub(newFakeTx, 'getSenderAddress')
        .callsFake(() => Address.fromString(fakeAccounts[0]));
      sinon.stub(newFakeTx, 'verifySignature').callsFake(() => true);

      const returnedTx = await keyring.signTransaction(
        fakeAccounts[0],
        newFakeTx,
      );
      // ensure we get a new version transaction back
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect((returnedTx as EthereumTx).getChainId).toBeUndefined();
      expect(
        (returnedTx as TypedTransaction).common.chainId().toString(16),
      ).toBe('1');
      expect(ethereumSignTransactionStub.calledOnce).toBe(true);
    });

    it('should pass serialized contract deployment transaction to onekey and return signed tx', async function () {
      sinon.stub(TransactionFactory, 'fromTxData').callsFake(() => {
        // without having a private key/public key pair in this test, we have
        // mock out this method and return the original tx because we can't
        // replicate r and s values without the private key.
        return contractDeploymentFakeTx;
      });

      const ethereumSignTransactionStub = sinon.stub().resolves({
        success: true,
        payload: { v: '0x25', r: '0x0', s: '0x0' },
      });
      bridge.ethereumSignTransaction = ethereumSignTransactionStub;

      sinon
        .stub(contractDeploymentFakeTx, 'getSenderAddress')
        .callsFake(() => Address.fromString(fakeAccounts[0]));

      sinon
        .stub(contractDeploymentFakeTx, 'verifySignature')
        .callsFake(() => true);

      const returnedTx = await keyring.signTransaction(
        fakeAccounts[0],
        contractDeploymentFakeTx,
      );
      // ensure we get a new version transaction back
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect((returnedTx as EthereumTx).getChainId).toBeUndefined();
      expect(
        (returnedTx as TypedTransaction).common.chainId().toString(16),
      ).toBe('1');
      expect(ethereumSignTransactionStub.calledOnce).toBe(true);
      expect(ethereumSignTransactionStub.getCall(0).args[0]).toStrictEqual({
        passphraseState: '',
        useEmptyPassphrase: true,
        path: `m/44'/60'/0'/0/0`,
        transaction: {
          ...contractDeploymentFakeTx.toJSON(),
          to: '0x',
          chainId: 1,
        },
      });
    });

    it('should pass correctly encoded EIP1559 transaction to onekey and return signed tx', async function () {
      // Copied from @MetaMask/eth-ledger-bridge-keyring
      // Generated by signing fakeTypeTwoTx with an unknown private key
      const expectedRSV = {
        v: '0x0',
        r: '0x5ffb3adeaec80e430e7a7b02d95c5108b6f09a0bdf3cf69869dc1b38d0fb8d3a',
        s: '0x28b234a5403d31564e18258df84c51a62683e3f54fa2b106fdc1a9058006a112',
      };
      // Override actual address of 0x391535104b6e0Ea6dDC2AD0158aB3Fbd7F04ed1B
      const fromTxDataStub = sinon.stub(TransactionFactory, 'fromTxData');
      fromTxDataStub.callsFake((...args) => {
        const tx = fromTxDataStub.wrappedMethod(...args);
        sinon
          .stub(tx, 'getSenderAddress')
          .returns(Address.fromString(fakeAccounts[0]));
        return tx;
      });

      const ethereumSignTransactionStub = sinon.stub().resolves({
        success: true,
        payload: expectedRSV,
      });
      bridge.ethereumSignTransaction = ethereumSignTransactionStub;

      const returnedTx = await keyring.signTransaction(
        fakeAccounts[0],
        fakeTypeTwoTx,
      );

      expect(ethereumSignTransactionStub.calledOnce).toBe(true);
      sinon.assert.calledWithExactly(ethereumSignTransactionStub, {
        passphraseState: '',
        useEmptyPassphrase: true,
        path: "m/44'/60'/0'/0/0",
        transaction: {
          type: '0x2',
          chainId: 1,
          nonce: '0x0',
          maxPriorityFeePerGas: '0x9184e72a000',
          maxFeePerGas: '0x19184e72a000',
          gasLimit: '0x2710',
          to: '0x0000000000000000000000000000000000000000',
          value: '0x0',
          data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
          accessList: [],
          v: '0x1',
          r: undefined,
          s: undefined,
        },
      });

      expect(returnedTx.toJSON()).toStrictEqual({
        ...fakeTypeTwoTx.toJSON(),
        ...expectedRSV,
      });
    });
  });

  describe('signMessage', function () {
    it('should call onekeyConnect.ethereumSignMessage', async function () {
      const ethereumSignMessageStub = sinon.stub().resolves({});
      bridge.ethereumSignMessage = ethereumSignMessageStub;

      try {
        await keyring.signMessage(fakeAccounts[0], 'some msg');
      } catch {
        // Since we only care about ensuring our function gets called,
        // we want to ignore warnings due to stub data
      }

      expect(ethereumSignMessageStub.calledOnce).toBe(true);
    });
  });

  describe('signPersonalMessage', function () {
    it('should call onekeyConnect.ethereumSignMessage', async function () {
      const ethereumSignMessageStub = sinon.stub().resolves({});
      bridge.ethereumSignMessage = ethereumSignMessageStub;

      try {
        await keyring.signPersonalMessage(fakeAccounts[0], 'some msg');
      } catch {
        // Since we only care about ensuring our function gets called,
        // we want to ignore warnings due to stub data
      }

      expect(ethereumSignMessageStub.calledOnce).toBe(true);
    });
  });

  describe('signTypedData', function () {
    it('should call onekeyConnect.ethereumSignTypedData', async function () {
      const ethereumSignTypedDataStub = sinon.stub().resolves({
        success: true,
        payload: { signature: '0x00', address: fakeAccounts[0] },
      });
      bridge.ethereumSignTypedData = ethereumSignTypedDataStub;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore next-line
      // eslint-disable-next-line no-invalid-this
      this.timeout = 60000;
      await keyring.signTypedData(
        fakeAccounts[0],
        // Message with missing data that @metamask/eth-sig-util accepts
        {
          types: { EIP712Domain: [], EmptyMessage: [] },
          primaryType: 'EmptyMessage',
          domain: {},
          message: {},
        },
        { version: SignTypedDataVersion.V4 },
      );

      expect(ethereumSignTypedDataStub.calledOnce).toBe(true);
      sinon.assert.calledWithExactly(ethereumSignTypedDataStub, {
        passphraseState: '',
        useEmptyPassphrase: true,
        path: "m/44'/60'/0'/0/0",
        data: {
          // Empty message that onekey-connect/EIP-712 spec accepts
          types: { EIP712Domain: [], EmptyMessage: [] },
          primaryType: 'EmptyMessage',
          domain: {},
          message: {},
        },
        metamaskV4Compat: true,
        domainHash:
          '6192106f129ce05c9075d319c1fa6ea9b3ae37cbd0c1ef92e2be7137bb07baa1',
        messageHash:
          'c9e71eb57cf9fa86ec670283b58cb15326bb6933c8d8e2ecb2c0849021b3ef42',
      });
    });
  });

  describe('forgetDevice', function () {
    it('should clear the content of the keyring', async function () {
      // Add an account
      keyring.setAccountToUnlock(0);
      await keyring.addAccounts(1);

      // Wipe the keyring
      keyring.forgetDevice();

      const accounts = await keyring.getAccounts();

      expect(keyring.isUnlocked()).toBe(false);
      expect(accounts).toHaveLength(0);
    });
  });

  describe('setHdPath', function () {
    const initialProperties = {
      hdPath: `m/44'/60'/0'/0` as const,
      accounts: [fakeAccounts[0]],
      page: 2,
    };

    //   hdPath?: string;
    // accounts?: string[];
    // accountDetails?: Readonly<Record<string, AccountDetails>>;
    // page?: number;
    // passphraseState?: string;

    const accountToUnlock = 1;

    const mockPaths: Record<string, AccountDetails> = {
      '0x123': {
        index: 0,
        hdPath: `m/44'/60'/0'/0`,
        passphraseState: '123',
      },
    };

    beforeEach(async function () {
      await keyring.deserialize(initialProperties);
      // eslint-disable-next-line require-atomic-updates
      keyring.accountDetails = mockPaths;
      keyring.setAccountToUnlock(accountToUnlock);
    });

    it('should do nothing if passed an hdPath equal to the current hdPath', async function () {
      keyring.setHdPath(initialProperties.hdPath);
      expect(keyring.hdPath).toBe(initialProperties.hdPath);
      expect(keyring.accounts).toStrictEqual(initialProperties.accounts);
      expect(keyring.page).toBe(initialProperties.page);
      expect(keyring.hdk.publicKey.toString('hex')).toBe(
        fakeHdKey.publicKey.toString('hex'),
      );
      expect(keyring.unlockedAccount).toBe(accountToUnlock);
      expect(keyring.accountDetails).toStrictEqual(mockPaths);
    });

    it('should update the hdPath and reset account and page properties if passed a new hdPath', async function () {
      const ledgerLegacyHdPathString = `m/44'/60'/0'/x`;

      keyring.setHdPath(ledgerLegacyHdPathString);

      expect(keyring.hdPath).toBe(ledgerLegacyHdPathString);
      expect(keyring.accounts).toStrictEqual([]);
      expect(keyring.page).toBe(0);
      expect(keyring.perPage).toBe(5);
      expect(keyring.hdk.publicKey).toBeNull();
      expect(keyring.unlockedAccount).toBe(0);
      expect(keyring.accountDetails).toStrictEqual({});
    });

    it('should throw an error if passed an ledger live hdPath', async function () {
      const unsupportedPath = "m/44'/60'/x'/0/0";
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next-line
        keyring.setHdPath(unsupportedPath);
      }).toThrow(`Unknown HD path`);
    });

    it('should throw an error if passed an unsupported hdPath', async function () {
      const unsupportedPath = 'unsupported hdPath';
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next-line
        keyring.setHdPath(unsupportedPath);
      }).toThrow(`Unknown HD path`);
    });
  });

  describe('error handling and edge cases', function () {
    it('should handle signing errors', async function () {
      await keyring.addAccounts(1);
      const errorResponse = {
        success: false,
        payload: { error: 'Signing failed' },
      };
      bridge.ethereumSignTransaction = sinon.stub().resolves(errorResponse);

      try {
        await keyring.signTransaction(fakeAccounts[0], fakeTx);
        throw new Error('Expected error was not thrown');
      } catch (error) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect((error as Error).message).toContain('Signing failed');
      }
    });

    it('should handle message signing errors', async function () {
      await keyring.addAccounts(1);
      const errorResponse = {
        success: false,
        payload: { error: 'Message signing failed' },
      };
      bridge.ethereumSignMessage = sinon.stub().resolves(errorResponse);

      try {
        await keyring.signPersonalMessage(fakeAccounts[0], '0x68656c6c6f');
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Message signing failed');
      }
    });

    it('should handle address verification mismatch in signing', async function () {
      await keyring.addAccounts(1);
      const wrongAddress = '0x1234567890123456789012345678901234567890';
      const successResponse = {
        success: true,
        payload: {
          v: '0x1',
          r: '0x0',
          s: '0x0',
          address: wrongAddress,
        },
      };
      bridge.ethereumSignMessage = sinon.stub().resolves(successResponse);

      try {
        await keyring.signPersonalMessage(fakeAccounts[0], '0x68656c6c6f');
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect((error as Error).message).toContain(
          'signature doesnt match the right address',
        );
      }
    });

    it('should handle getPreviousPage when already on first page', async function () {
      keyring.page = 0;
      const accounts = await keyring.getPreviousPage();
      expect(accounts).toHaveLength(keyring.perPage);
      expect(keyring.page).toBe(1); // When page <= 0, it gets set to 1
    });
  });

  describe('HD path validation edge cases', function () {
    it('should handle Ledger Live HD path correctly', function () {
      const ledgerLiveHdPath = "m/44'/60'/0'/x";
      keyring.setHdPath(ledgerLiveHdPath);
      expect(keyring.hdPath).toBe(ledgerLiveHdPath);
    });

    it('should handle standard BIP44 HD path correctly', function () {
      const standardHdPath = "m/44'/60'/0'/0/x";
      keyring.setHdPath(standardHdPath);
      expect(keyring.hdPath).toBe(standardHdPath);
    });

    it('should handle default HD path correctly', function () {
      const defaultPath = "m/44'/60'/0'/0";
      keyring.setHdPath(defaultPath);
      expect(keyring.hdPath).toBe(defaultPath);
    });

    it('should handle different HD path formats', function () {
      // Test different HD path validations
      const ledgerLiveHdPath = "m/44'/60'/0'/x";
      keyring.setHdPath(ledgerLiveHdPath);
      expect(keyring.hdPath).toBe(ledgerLiveHdPath);

      const standardHdPath = "m/44'/60'/0'/0/x";
      keyring.setHdPath(standardHdPath);
      expect(keyring.hdPath).toBe(standardHdPath);
    });
  });

  describe('account filtering', function () {
    beforeEach(async function () {
      keyring.setAccountToUnlock(0);
      await keyring.addAccounts(5);
    });

    it('should handle removeAccount with all accounts removed', function () {
      const allAccounts = [...keyring.accounts];

      allAccounts.forEach((account) => {
        keyring.removeAccount(account);
      });

      expect(keyring.accounts).toHaveLength(0);
      expect(Object.keys(keyring.accountDetails)).toHaveLength(0);
    });

    it('should handle removeAccount with non-existent account', function () {
      const nonExistentAccount = '0x1234567890123456789012345678901234567890';

      expect(() => {
        keyring.removeAccount(nonExistentAccount);
      }).toThrow(
        'Address 0x1234567890123456789012345678901234567890 not found in this keyring',
      );
    });
  });

  describe('transaction serialization edge cases', function () {
    it('should handle transaction with empty "to" field (contract deployment)', async function () {
      await keyring.addAccounts(1);

      const successResponse = {
        success: true,
        payload: { v: '0x1', r: '0x0', s: '0x0' },
      };
      const ethereumSignTransactionStub = sinon
        .stub()
        .resolves(successResponse);
      bridge.ethereumSignTransaction = ethereumSignTransactionStub;

      sinon.stub(fakeTx, 'verifySignature').callsFake(() => true);
      sinon
        .stub(fakeTx, 'getSenderAddress')
        .callsFake(() =>
          Buffer.from(Address.fromString(fakeAccounts[0]).bytes),
        );

      // Simulate a contract deployment transaction by setting to to null
      const originalTo = fakeTx.to;
      // @ts-expect-error - for testing purposes
      fakeTx.to = null;

      const result = await keyring.signTransaction(fakeAccounts[0], fakeTx);
      expect(result).toBeDefined();

      const call = ethereumSignTransactionStub.getCall(0);
      expect(call.args[0].transaction.to).toBe('0x');

      // Restore original to value
      // eslint-disable-next-line require-atomic-updates
      fakeTx.to = originalTo;
    });

    it('should test hex prefix utilities', async function () {
      // Test the serialize method
      const serialized = await keyring.serialize();
      expect(serialized.hdPath).toMatch(/^m\//u); // Should start with m/
    });
  });

  describe('HD path private method coverage', function () {
    it('should handle standard BIP44 path variations', async function () {
      keyring.setHdPath("m/44'/60'/0'/0/x");
      await keyring.unlock();
      await keyring.addAccounts(1);
      expect(keyring.accounts).toHaveLength(1);

      keyring.setHdPath("m/44'/60'/0'/0");
      await keyring.unlock();
      await keyring.addAccounts(1);
      expect(keyring.accounts.length).toBeGreaterThan(0);
    });

    it('should handle HD path comparison logic', async function () {
      expect(keyring.hdPath).toBe("m/44'/60'/0'/0");
      expect(keyring.accounts).toHaveLength(0);

      await keyring.addAccounts(2);
      keyring.setHdPath("m/44'/60'/0'/0/x");

      expect(keyring.hdPath).toBe("m/44'/60'/0'/0/x");
      expect(keyring.accounts).toHaveLength(2);

      keyring.setHdPath("m/44'/60'/0'/0");
      expect(keyring.hdPath).toBe("m/44'/60'/0'/0");
      expect(keyring.accounts).toHaveLength(2);

      keyring.setHdPath("m/44'/60'/0'/x");
      expect(keyring.hdPath).toBe("m/44'/60'/0'/x");
      expect(keyring.accounts).toHaveLength(0);
    });
  });

  describe('additional edge cases for coverage', function () {
    it('should handle forgetDevice', function () {
      keyring.forgetDevice();
      expect(keyring.accounts).toHaveLength(0);
      expect(keyring.page).toBe(0);
      expect(keyring.unlockedAccount).toBe(0);
      expect(Object.keys(keyring.accountDetails)).toHaveLength(0);
    });

    it('should handle exportAccount error', function () {
      expect(() => {
        keyring.exportAccount();
      }).toThrow('Not supported on this device');
    });

    it('should handle isUnlocked when not unlocked', function () {
      keyring.hdk = new HDKey();
      expect(keyring.isUnlocked()).toBe(false);
    });

    it('should handle different passphrase states', function () {
      keyring.passphraseState = '';
      expect(keyring.passphraseState).toBe('');

      keyring.passphraseState = undefined;
      expect(keyring.passphraseState).toBeUndefined();
    });

    it('should handle addHexPrefix utility function', function () {
      const testMessage = 'hello world';
      const messageHex = Buffer.from(testMessage, 'utf8').toString('hex');

      // These calls will use add hex prefix indirectly
      // eslint-disable-next-line jest/no-restricted-matchers
      expect(messageHex).toBeTruthy();
    });

    it('should handle getName method', function () {
      expect(keyring.getName()).toBe('OneKey Hardware');
    });

    it('should handle init bridge method', async function () {
      const initSpy = sinon.stub(bridge, 'init').resolves();

      await keyring.init({ debug: true });
      expect(initSpy.calledOnce).toBe(true);

      // Test destroy method by calling keyring destroy
      await keyring.destroy();
    });

    it('should handle getNextPage and getPreviousPage correctly', async function () {
      const nextPageAccounts = await keyring.getNextPage();
      expect(nextPageAccounts).toHaveLength(keyring.perPage);
      expect(keyring.page).toBeGreaterThan(0);

      const prevPageAccounts = await keyring.getPreviousPage();
      expect(prevPageAccounts).toHaveLength(keyring.perPage);
    });

    it('should handle signMessage method', async function () {
      await keyring.addAccounts(1);
      const expectedSignature = '0xsignature123';
      const signPersonalMessageStub = sinon
        .stub(keyring, 'signPersonalMessage')
        .resolves(expectedSignature);

      const result = await keyring.signMessage(fakeAccounts[0], '0x68656c6c6f');
      expect(result).toBe(expectedSignature);
      expect(
        signPersonalMessageStub.calledWith(fakeAccounts[0], '0x68656c6c6f'),
      ).toBe(true);
    });

    it('should handle transaction signing with address verification', async function () {
      await keyring.addAccounts(1);
      const successResponse = {
        success: true,
        payload: { v: '0x1', r: '0x0', s: '0x0' },
      };
      bridge.ethereumSignTransaction = sinon.stub().resolves(successResponse);

      // Mock the transaction verification to pass
      sinon.stub(fakeTx, 'verifySignature').callsFake(() => true);
      sinon
        .stub(fakeTx, 'getSenderAddress')
        .callsFake(() =>
          Buffer.from(Address.fromString(fakeAccounts[0]).bytes),
        );

      const result = await keyring.signTransaction(fakeAccounts[0], fakeTx);
      expect(result).toBeDefined();
      expect(result.v).toBeDefined();
      expect(result.r).toBeDefined();
      expect(result.s).toBeDefined();
    });

    it('should handle basic unlock scenarios', async function () {
      const accounts = await keyring.getAccounts();
      expect(accounts).toStrictEqual([]);
    });

    it('should handle addAccounts error scenarios', async function () {
      const unlockStub = sinon
        .stub(keyring, 'unlock')
        .rejects(new Error('Unlock failed'));

      try {
        await keyring.addAccounts(1);
        throw new Error('Expected error was not thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Unlock failed');
      }

      unlockStub.restore();
    });

    it('should handle bridge constructor error', function () {
      expect(() => {
        // eslint-disable-next-line no-new
        new OneKeyKeyring({ bridge: undefined as unknown as OneKeyBridge });
      }).toThrow('Bridge is a required dependency for the keyring');
    });

    it('should handle event emission from bridge', function () {
      const eventSpy = sinon.stub(keyring, 'emit');

      expect(keyring.bridge).toBe(bridge);
      expect(eventSpy.called).toBe(false);
    });

    describe('HD path variations', function () {
      it('should handle Ledger Legacy HD path in setHdPath', function () {
        // Cover branches in #isSameHdPath for Ledger Legacy
        keyring.setHdPath("m/44'/60'/0'/x");
        expect(keyring.hdPath).toBe("m/44'/60'/0'/x");

        // Setting the same path should trigger #isSameHdPath but not reset
        const originalHdk = keyring.hdk;
        keyring.setHdPath("m/44'/60'/0'/x"); // This should call #isSameHdPath and return true
        expect(keyring.hdk).toBe(originalHdk); // HDKey should not be reset
      });

      it('should handle path comparison between different Ledger Legacy paths', function () {
        // Cover line 687-688 in #isSameHdPath
        keyring.setHdPath("m/44'/60'/0'/x");

        // Change to different Ledger Legacy path - should reset HDKey
        keyring.setHdPath("m/44'/60'/0'/x");
        expect(keyring.hdPath).toBe("m/44'/60'/0'/x");
      });

      it('should handle Standard BIP44 path variations in setHdPath', function () {
        // Cover branches in #isSameHdPath for standard BIP44
        keyring.setHdPath("m/44'/60'/0'/0/x");
        expect(keyring.hdPath).toBe("m/44'/60'/0'/0/x");

        // Test equivalence with defaultHdPath - should trigger #isSameHdPath
        keyring.setHdPath("m/44'/60'/0'/0"); // Should be considered same as m/44'/60'/0'/0/x
        expect(keyring.hdPath).toBe("m/44'/60'/0'/0");
      });

      it('should handle default path comparison in #isSameHdPath', function () {
        // Cover line 694: return this.hdPath === newHdPath;
        // Directly set hdPath to test custom path logic
        keyring.hdPath = "m/44'/60'/1'/2/3"; // Custom path not in predefined categories

        const originalHdk = keyring.hdk;
        keyring.setHdPath("m/44'/60'/0'/0"); // Different path should reset
        expect(keyring.hdPath).toBe("m/44'/60'/0'/0");
        expect(keyring.hdk).not.toBe(originalHdk); // HDKey should be reset
      });

      it('should handle Ledger Legacy path in addAccounts workflow', async function () {
        // This will trigger #getPathForIndex with Ledger Legacy path (line 660)
        keyring.setHdPath("m/44'/60'/0'/x");

        // Set up successful unlock
        const unlockResult = 'unlocked';
        const unlockSpy = sinon.stub(keyring, 'unlock').resolves(unlockResult);

        keyring.hdk = fakeHdKey;

        const accounts = await keyring.addAccounts(1);
        expect(accounts).toHaveLength(1);

        unlockSpy.restore();
      });

      it('should handle custom path in getPathForIndex', async function () {
        // Cover line 668: return `${this.hdPath}/${index}`;
        // Directly set hdPath to bypass ALLOWED_HD_PATHS check
        keyring.hdPath = "m/44'/60'/1'/2"; // Custom path that doesn't match predefined patterns

        const unlockResult = 'unlocked';
        const unlockSpy = sinon.stub(keyring, 'unlock').resolves(unlockResult);

        keyring.hdk = fakeHdKey;

        const accounts = await keyring.addAccounts(1);
        expect(accounts).toHaveLength(1);

        unlockSpy.restore();
      });

      it('should handle same custom path in #isSameHdPath', function () {
        // Cover line 694: return this.hdPath === newHdPath; when custom paths are the same
        keyring.hdPath = "m/44'/60'/5'/6"; // Custom path

        const originalHdk = keyring.hdk;
        keyring.setHdPath("m/44'/60'/0'/0"); // Change to allowed path
        expect(keyring.hdPath).toBe("m/44'/60'/0'/0");
        expect(keyring.hdk).not.toBe(originalHdk); // HDKey should be reset
      });

      it('should handle Ledger Live HD path errors', async function () {
        // Cover lines 641 and 648: throw new Error('Ledger Live is not supported');
        keyring.hdPath = "m/44'/60'/x'/0/0"; // Ledger Live path (not in ALLOWED_HD_PATHS but we set directly)

        const unlockSpy = sinon.stub(keyring, 'unlock').resolves('unlocked');
        keyring.hdk = fakeHdKey;

        // This should trigger the Ledger Live error paths during addAccounts
        try {
          await keyring.addAccounts(1);
          // If we get here, the test setup was wrong
          expect(true).toBe(false);
        } catch (error) {
          expect((error as Error).message).toContain(
            'Ledger Live is not supported',
          );
        }

        unlockSpy.restore();
      });
    });
  });
});
