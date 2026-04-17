import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { KeyringAccount } from '../api';
import type { XlmAccount } from './types';

// `XlmAccount` extends `KeyringAccount`
expectTrue<Extends<XlmAccount, KeyringAccount>>();
