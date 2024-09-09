import type { BtcP2wpkhAccount } from './types';
import type { KeyringAccount } from '../api';
import type { Extends } from '../utils';
import { expectTrue } from '../utils';

// `BtcP2wpkhAccount` extends `KeyringAccount`
expectTrue<Extends<BtcP2wpkhAccount, KeyringAccount>>();
