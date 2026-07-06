import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';
import { expectAssignable } from 'tsd';

import type { KeyringAccount } from '../api';
import { EthAccountType } from '../api';
import { EthScope } from './constants';
import type { EthEoaAccount } from './types';
import { EthMethod } from './types';

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

// `EthEoaAccount` extends `KeyringAccount`
expectTrue<Extends<EthEoaAccount, KeyringAccount>>();
