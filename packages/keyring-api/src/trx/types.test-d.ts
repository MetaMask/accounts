import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { KeyringAccount } from '../api';
import type { TrxEoaAccount } from './types';

// `TrxEoaAccount` extends `KeyringAccount`
expectTrue<Extends<TrxEoaAccount, KeyringAccount>>();
