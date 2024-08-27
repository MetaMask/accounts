import type { KeyringAccount } from '../api';
import type { Extends } from '../utils';
import { expectTrue } from '../utils';
import type { BtcP2wpkhAccount } from './types';

// `BtcP2wpkhAccount` extends `KeyringAccount`
expectTrue<Extends<BtcP2wpkhAccount, KeyringAccount>>();
