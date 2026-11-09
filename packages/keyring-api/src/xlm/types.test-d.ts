import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { KeyringAccount } from '../api/index.js';
import type { XlmAccount } from './types.js';

// `XlmAccount` extends `KeyringAccount`
expectTrue<Extends<XlmAccount, KeyringAccount>>();
