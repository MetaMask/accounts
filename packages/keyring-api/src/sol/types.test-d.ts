import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { SolDataAccount } from './types';
import type { KeyringAccount } from '../api';

// `SolDataAccount` extends `KeyringAccount`
expectTrue<Extends<SolDataAccount, KeyringAccount>>();
