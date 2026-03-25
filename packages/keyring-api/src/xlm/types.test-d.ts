import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type { XlmEoaAccount } from './types';
import type { KeyringAccount } from '../api';

// `XlmEoaAccount` extends `KeyringAccount`
expectTrue<Extends<XlmEoaAccount, KeyringAccount>>();
