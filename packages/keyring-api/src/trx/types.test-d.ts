import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { TrxEoaAccount } from './types';
import type { KeyringAccount } from '../api';

// `TrxEoaAccount` extends `KeyringAccount`
expectTrue<Extends<TrxEoaAccount, KeyringAccount>>();
