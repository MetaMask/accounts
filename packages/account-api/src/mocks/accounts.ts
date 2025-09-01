// istanbul ignore file

import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import {
  BtcAccountType,
  BtcMethod,
  BtcScope,
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
  SolAccountType,
  SolMethod,
  SolScope,
} from '@metamask/keyring-api';
import { v4 as uuid } from 'uuid';

import { isBip44Account, type Bip44Account } from '../api';

const ETH_EOA_METHODS = [
  EthMethod.PersonalSign,
  EthMethod.Sign,
  EthMethod.SignTransaction,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
] as const;

const SOL_METHODS = Object.values(SolMethod);

export const MOCK_SNAP_1 = {
  id: 'local:mock-snap-id-1',
  name: 'Mock Snap 1',
  enabled: true,
  manifest: {
    proposedName: 'Mock Snap 1',
  },
};

export const MOCK_SNAP_2 = {
  id: 'npm:@metamask/mock-snap-id-2',
  name: 'Mock Snap 2',
  enabled: true,
  manifest: {
    proposedName: 'Mock Snap 2',
  },
};

export const MOCK_ENTROPY_SOURCE_1 = 'mock-keyring-id-1';
export const MOCK_ENTROPY_SOURCE_2 = 'mock-keyring-id-2';

export const MOCK_PRIVATE_KEY_KEYRING_TYPE = 'Simple Key Pair';

export const MOCK_HD_ACCOUNT_1: Bip44Account<KeyringAccount> = {
  id: 'mock-id-1',
  address: '0x123',
  options: {
    entropy: {
      type: KeyringAccountEntropyTypeOption.Mnemonic,
      id: MOCK_ENTROPY_SOURCE_1,
      groupIndex: 0,
      derivationPath: '',
    },
  },
  methods: [...ETH_EOA_METHODS],
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
};

export const MOCK_HD_ACCOUNT_2: Bip44Account<KeyringAccount> = {
  id: 'mock-id-2',
  address: '0x456',
  options: {
    entropy: {
      type: KeyringAccountEntropyTypeOption.Mnemonic,
      id: MOCK_ENTROPY_SOURCE_2,
      groupIndex: 0,
      derivationPath: '',
    },
  },
  methods: [...ETH_EOA_METHODS],
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
};

export const MOCK_SOL_ACCOUNT_1: Bip44Account<KeyringAccount> = {
  id: 'mock-snap-id-1',
  address: 'aabbccdd',
  options: {
    entropy: {
      type: KeyringAccountEntropyTypeOption.Mnemonic,
      // NOTE: shares entropy with MOCK_HD_ACCOUNT_2
      id: MOCK_ENTROPY_SOURCE_2,
      groupIndex: 0,
      derivationPath: '',
    },
  },
  methods: SOL_METHODS,
  type: SolAccountType.DataAccount,
  scopes: [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet],
};

export const MOCK_BTC_P2WPKH_ACCOUNT_1: Bip44Account<KeyringAccount> = {
  id: 'b0f030d8-e101-4b5a-a3dd-13f8ca8ec1db',
  type: BtcAccountType.P2wpkh,
  methods: Object.values(BtcMethod),
  address: 'bc1qx8ls07cy8j8nrluy2u0xwn7gh8fxg0rg4s8zze',
  options: {
    entropy: {
      type: KeyringAccountEntropyTypeOption.Mnemonic,
      // NOTE: shares entropy with MOCK_HD_ACCOUNT_2
      id: MOCK_ENTROPY_SOURCE_2,
      groupIndex: 0,
      derivationPath: '',
    },
  },
  scopes: [BtcScope.Mainnet],
};

export const MOCK_BTC_P2TR_ACCOUNT_1: Bip44Account<KeyringAccount> = {
  id: 'a20c2e1a-6ff6-40ba-b8e0-ccdb6f9933bb',
  type: BtcAccountType.P2tr,
  methods: Object.values(BtcMethod),
  address: 'tb1p5cyxnuxmeuwuvkwfem96lxx9wex9kkf4mt9ll6q60jfsnrzqg4sszkqjnh',
  options: {
    entropy: {
      type: KeyringAccountEntropyTypeOption.Mnemonic,
      // NOTE: shares entropy with MOCK_HD_ACCOUNT_2
      id: MOCK_ENTROPY_SOURCE_2,
      groupIndex: 0,
      derivationPath: '',
    },
  },
  scopes: [BtcScope.Testnet],
};

export const MOCK_SNAP_ACCOUNT_1 = MOCK_SOL_ACCOUNT_1;

export const MOCK_SNAP_ACCOUNT_2: KeyringAccount = {
  id: 'mock-snap-id-2',
  address: '0x789',
  options: {},
  methods: [...ETH_EOA_METHODS],
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
};

export const MOCK_SNAP_ACCOUNT_3 = MOCK_BTC_P2WPKH_ACCOUNT_1;
export const MOCK_SNAP_ACCOUNT_4 = MOCK_BTC_P2TR_ACCOUNT_1;

export const MOCK_HARDWARE_ACCOUNT_1: KeyringAccount = {
  id: 'mock-hardware-id-1',
  address: '0xABC',
  options: {},
  methods: [...ETH_EOA_METHODS],
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
};

export class MockAccountBuilder<Account extends KeyringAccount> {
  readonly #account: Account;

  constructor(account: Account) {
    // Make a deep-copy to avoid mutating the same ref.
    this.#account = JSON.parse(JSON.stringify(account));
  }

  static from<Account extends KeyringAccount>(
    account: Account,
  ): MockAccountBuilder<Account> {
    return new MockAccountBuilder(account);
  }

  withId(id: KeyringAccount['id']): MockAccountBuilder<Account> {
    this.#account.id = id;
    return this;
  }

  withUuid(): MockAccountBuilder<Account> {
    this.#account.id = uuid();
    return this;
  }

  withAddressSuffix(suffix: string): MockAccountBuilder<Account> {
    this.#account.address += suffix;
    return this;
  }

  withEntropySource(
    entropySource: EntropySourceId,
  ): MockAccountBuilder<Account> {
    if (isBip44Account(this.#account)) {
      this.#account.options.entropy.id = entropySource;
    }
    return this;
  }

  withGroupIndex(groupIndex: number): MockAccountBuilder<Account> {
    if (isBip44Account(this.#account)) {
      this.#account.options.entropy.groupIndex = groupIndex;
    }
    return this;
  }

  get(): Account {
    return this.#account;
  }
}

export const MOCK_WALLET_1_ENTROPY_SOURCE = MOCK_ENTROPY_SOURCE_1;

export const MOCK_WALLET_1_EVM_ACCOUNT = MockAccountBuilder.from(
  MOCK_HD_ACCOUNT_1,
)
  .withEntropySource(MOCK_WALLET_1_ENTROPY_SOURCE)
  .withGroupIndex(0)
  .get();
export const MOCK_WALLET_1_SOL_ACCOUNT = MockAccountBuilder.from(
  MOCK_SOL_ACCOUNT_1,
)
  .withEntropySource(MOCK_WALLET_1_ENTROPY_SOURCE)
  .withGroupIndex(0)
  .get();
export const MOCK_WALLET_1_BTC_P2WPKH_ACCOUNT = MockAccountBuilder.from(
  MOCK_BTC_P2WPKH_ACCOUNT_1,
)
  .withEntropySource(MOCK_WALLET_1_ENTROPY_SOURCE)
  .withGroupIndex(0)
  .get();
export const MOCK_WALLET_1_BTC_P2TR_ACCOUNT = MockAccountBuilder.from(
  MOCK_BTC_P2TR_ACCOUNT_1,
)
  .withEntropySource(MOCK_WALLET_1_ENTROPY_SOURCE)
  .withGroupIndex(0)
  .get();
