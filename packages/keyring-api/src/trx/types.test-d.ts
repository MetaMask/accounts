import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { KeyringAccount } from '../api/index.js';
import type { TrxEoaAccount } from './types.js';

// `TrxEoaAccount` extends `KeyringAccount`
expectTrue<Extends<TrxEoaAccount, KeyringAccount>>();
