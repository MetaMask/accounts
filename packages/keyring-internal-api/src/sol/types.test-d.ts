import type { SolDataAccount } from './types';
import type { KeyringAccount } from '@metamask/keyring-api';
import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

// `SolDataAccount` extends `KeyringAccount`
expectTrue<Extends<SolDataAccount, KeyringAccount>>();
