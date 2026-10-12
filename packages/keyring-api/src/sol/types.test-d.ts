import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { KeyringAccount } from '../api/index.js';
import type { SolDataAccount } from './types.js';

// `SolDataAccount` extends `KeyringAccount`
expectTrue<Extends<SolDataAccount, KeyringAccount>>();
