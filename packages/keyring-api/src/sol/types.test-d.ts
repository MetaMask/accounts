import type { SolEoaAccount } from './types';
import type { KeyringAccount } from '../api';
import type { Extends } from '../utils';
import { expectTrue } from '../utils';

// `SolEoaAccount` extends `KeyringAccount`
expectTrue<Extends<SolEoaAccount, KeyringAccount>>();
