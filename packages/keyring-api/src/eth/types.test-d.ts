import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';
import { expectAssignable, expectNotAssignable } from 'tsd';

import { EthScope } from './constants';
import type { EthEoaAccount, EthErc4337Account } from './types';
import { EthMethod } from './types';
import { EthAccountType } from '../api';
import type { KeyringAccount } from '../api';

const id = '606a7759-b0fb-48e4-9874-bab62ff8e7eb';
const address = '0x000';

// EOA account with no methods
expectAssignable<EthEoaAccount>({
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
  id,
  address,
  options: {},
  methods: [],
});

// EOA account with all methods
expectAssignable<EthEoaAccount>({
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
  id,
  address,
  options: {},
  methods: [
    `${EthMethod.PersonalSign}`,
    `${EthMethod.Sign}`,
    `${EthMethod.SignTransaction}`,
    `${EthMethod.SignTypedDataV1}`,
    `${EthMethod.SignTypedDataV3}`,
    `${EthMethod.SignTypedDataV4}`,
  ],
});

// EOA account with ERC-4337 methods is an error
expectNotAssignable<EthEoaAccount>({
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
  id,
  address,
  options: {},
  methods: [
    `${EthMethod.PrepareUserOperation}`,
    `${EthMethod.PatchUserOperation}`,
    `${EthMethod.SignUserOperation}`,
  ],
});

// EOA account with ERC-4337 type is an error
expectNotAssignable<EthEoaAccount>({
  type: EthAccountType.Erc4337,
  scopes: [EthScope.Testnet],
  id,
  address,
  options: {},
  methods: [
    `${EthMethod.PrepareUserOperation}`,
    `${EthMethod.PatchUserOperation}`,
    `${EthMethod.SignUserOperation}`,
  ],
});

// ERC-4337 account with no methods
expectAssignable<EthErc4337Account>({
  type: EthAccountType.Erc4337,
  scopes: [EthScope.Testnet],
  id,
  address,
  options: {},
  methods: [],
});

// ERC-4337 account with all methods
expectAssignable<EthErc4337Account>({
  type: EthAccountType.Erc4337,
  scopes: [EthScope.Testnet],
  id,
  address,
  options: {},
  methods: [
    `${EthMethod.PersonalSign}`,
    `${EthMethod.Sign}`,
    `${EthMethod.SignTypedDataV1}`,
    `${EthMethod.SignTypedDataV3}`,
    `${EthMethod.SignTypedDataV4}`,
    `${EthMethod.PrepareUserOperation}`,
    `${EthMethod.PatchUserOperation}`,
    `${EthMethod.SignUserOperation}`,
  ],
});

// ERC-4337 account with only user-ops methods
expectNotAssignable<EthErc4337Account>({
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
  id,
  address,
  options: {},
  methods: [
    `${EthMethod.PrepareUserOperation}`,
    `${EthMethod.PatchUserOperation}`,
    `${EthMethod.SignUserOperation}`,
  ],
});

// ERC-4337 account with EOA type is an error
expectNotAssignable<EthErc4337Account>({
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
  id,
  address,
  options: {},
  methods: [
    `${EthMethod.PrepareUserOperation}`,
    `${EthMethod.PatchUserOperation}`,
    `${EthMethod.SignUserOperation}`,
  ],
});

// `EthEoaAccount` extends `KeyringAccount`
expectTrue<Extends<EthEoaAccount, KeyringAccount>>();

// `EthErc4337Account` extends `KeyringAccount`
expectTrue<Extends<EthErc4337Account, KeyringAccount>>();
