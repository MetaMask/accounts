import type { SolDataAccount } from './types';
import type { KeyringAccount } from '../api';
import type { Extends } from '../utils';
import { expectTrue } from '../utils';

// `SolDataAccount` extends `KeyringAccount`
expectTrue<Extends<SolDataAccount, KeyringAccount>>();
