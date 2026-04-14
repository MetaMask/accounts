import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { XlmAccount } from './types';
import type { KeyringAccount } from '../api';

// `XlmAccount` extends `KeyringAccount`
expectTrue<Extends<XlmAccount, KeyringAccount>>();
