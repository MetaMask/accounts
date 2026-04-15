import type { Extends } from '@metamask/keyring-utils';
import { expectTrue } from '@metamask/keyring-utils';

import type {
  BtcP2pkhAccount,
  BtcP2shAccount,
  BtcP2trAccount,
  BtcP2wpkhAccount,
} from './types';
import type { KeyringAccount } from '../api';

// BTC account types extend `KeyringAccount`
expectTrue<Extends<BtcP2pkhAccount, KeyringAccount>>();
expectTrue<Extends<BtcP2shAccount, KeyringAccount>>();
expectTrue<Extends<BtcP2wpkhAccount, KeyringAccount>>();
expectTrue<Extends<BtcP2trAccount, KeyringAccount>>();
