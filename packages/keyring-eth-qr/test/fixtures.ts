/**
 * fixtures.ts
 *
 * Contains test fixtures with predefined inputs and expected outputs
 * for use in unit and integration tests. These fixtures provide
 * deterministic and reusable test data to ensure test consistency.
 *
 * The constants in this file are all derived from this SRP:
 * `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`
 */

import { Common } from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';
import {
  CryptoAccount,
  CryptoHDKey,
  CryptoOutput,
  ScriptExpressions,
} from '@keystonehq/bc-ur-registry-eth';

import { DeviceMode } from '../src/device';

export const KNOWN_HDKEY_CBOR =
  'a503582102eae4b876a8696134b868f88cc2f51f715f2dbedb7446b8e6edf3d4541c4eb67b045820d882718b7a42806803eeb17f7483f20620611adb88fc943c898dc5aba94c281906d90130a20186182cf5183cf500f5021ad32e4508081ad32e45080972696d546f6b656e2d4163636f756e74203031';

export const KNOWN_HDKEY: CryptoHDKey = CryptoHDKey.fromCBOR(
  Buffer.from(KNOWN_HDKEY_CBOR, 'hex'),
);

export const KNOWN_HDKEY_UR = KNOWN_HDKEY.toUREncoder(2000).nextPart();

export const KNOWN_CRYPTO_ACCOUNT = new CryptoAccount(
  Buffer.from('37b5eed4', 'hex'),
  [new CryptoOutput([ScriptExpressions.WITNESS_SCRIPT_HASH], KNOWN_HDKEY)],
);

export const KNOWN_CRYPTO_ACCOUNT_UR =
  KNOWN_CRYPTO_ACCOUNT.toUREncoder(2000).nextPart();

export const EXPECTED_ACCOUNTS = [
  '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
  '0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0',
  '0xb6716976A3ebe8D39aCEB04372f22Ff8e6802D7A',
  '0xF3f50213C1d2e255e4B2bAD430F8A38EEF8D718E',
  '0x51cA8ff9f1C0a99f88E86B8112eA3237F55374cA',
  '0xA40cFBFc8534FFC84E20a7d8bBC3729B26a35F6f',
  '0xB191a13bfE648B61002F2e2135867015B71816a6',
  '0x593814d3309e2dF31D112824F0bb5aa7Cb0D7d47',
  '0xB14c391e2bf19E5a26941617ab546FA620A4f163',
  '0x4C1C56443AbFe6dD33de31dAaF0a6E929DBc4971',
] as const;

// Coming from an extension installation using `@keystonehq/metamask-airgapped-keyring`
// and with a paired QR-based Device configured with the above known SRP
export const SERIALIZED_KEYSTONE_KEYRING = {
  initialized: true,
  accounts: [
    '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
    '0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0',
    '0xb6716976A3ebe8D39aCEB04372f22Ff8e6802D7A',
  ],
  keyringAccount: 'account.standard',
  keyringMode: 'hd',
  name: 'imToken-Account 01',
  version: 1,
  xfp: '65174ca1',
  xpub: 'xpub6DCoCpSuQZB2jawqnGMEPS63ePKWkwWPH4TU45Q7LPXWuNd8TMtVxRrgjtEshuqpK3mdhaWHPFsBngh5GFZaM6si3yZdUsT8ddYM3PwnATt',
  hdPath: "m/44'/60'/0'",
  childrenPath: '0/*',
  indexes: {
    '0x9858EfFD232B4033E47d90003D41EC34EcaEda94': 0,
    '0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0': 1,
    '0xb6716976A3ebe8D39aCEB04372f22Ff8e6802D7A': 2,
  },
  paths: {},
  // These last properties are not used by `@metamask/eth-qr-keyring`
  currentAccount: 0,
  page: 0,
  perPage: 5,
};

export const HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS = {
  initialized: true,
  name: 'imToken-Account 01',
  keyringMode: DeviceMode.HD,
  keyringAccount: KNOWN_HDKEY.getNote(),
  xfp: 'd32e4508',
  xpub: 'xpub6DCoCpSuQZB2jawqnGMEPS63ePKWkwWPH4TU45Q7LPXWuNd8TMtVxRrgjtEshuqpK3mdhaWHPFsBngh5GFZaM6si3yZdUsT8ddYM3PwnATt',
  indexes: {},
  hdPath: "m/44'/60'/0'",
  childrenPath: '0/*',
} as const;

export const HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS = {
  ...HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
  accounts: EXPECTED_ACCOUNTS.slice(0, 3),
  indexes: {
    [EXPECTED_ACCOUNTS[0]]: 0,
    [EXPECTED_ACCOUNTS[1]]: 1,
    [EXPECTED_ACCOUNTS[2]]: 2,
  },
} as const;

export const ACCOUNT_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS = {
  initialized: true as const,
  name: 'imToken-Account 01',
  keyringMode: DeviceMode.ACCOUNT as const,
  keyringAccount: KNOWN_HDKEY.getNote(),
  xfp: '37b5eed4',
  paths: {
    '0x2043858DA83bCD92Ae342C1bAaD4D5F5B5C328B3': "M/44'/60'/0'",
  },
  indexes: {},
};

export const ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS = {
  ...ACCOUNT_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
  accounts: ['0x2043858DA83bCD92Ae342C1bAaD4D5F5B5C328B3'],
  indexes: {
    '0x2043858DA83bCD92Ae342C1bAaD4D5F5B5C328B3': 0,
  },
};

export const TRANSACTION = TransactionFactory.fromTxData({
  accessList: [],
  chainId: '0x1',
  data: '0x',
  gasLimit: '0x5208',
  maxFeePerGas: '0x2540be400',
  maxPriorityFeePerGas: '0x3b9aca00',
  nonce: '0x68',
  to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
  value: '0x0',
  type: 2,
});

export const LEGACY_TRANSACTION = TransactionFactory.fromTxData(
  {
    chainId: '0xaa36a7',
    data: '0x',
    gasLimit: '0x5208',
    gasPrice: '0x2540be400',
    nonce: '0x68',
    to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
    value: '0x0',
  },
  {
    common: new Common({ chain: 'sepolia' }),
  },
);

export const TYPED_MESSAGE = {
  domain: {
    chainId: 1,
    name: 'Ether Mail',
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    version: '1',
    salt: new TextEncoder().encode('hello'),
  },
  message: {
    contents: 'Hello, Bob!',
    from: {
      name: 'Cow',
      wallets: [
        '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
      ],
    },
    to: [
      {
        name: 'Bob',
        wallets: [
          '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
          '0xB0B0b0b0b0b0B000000000000000000000000000',
        ],
      },
    ],
  },
  primaryType: 'Mail' as const,
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Group: [
      { name: 'name', type: 'string' },
      { name: 'members', type: 'Person[]' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person[]' },
      { name: 'contents', type: 'string' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallets', type: 'address[]' },
    ],
  },
};
