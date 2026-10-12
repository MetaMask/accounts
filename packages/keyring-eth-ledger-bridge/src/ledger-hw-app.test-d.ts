/**
 * Typing test for LedgerHwAppEth.
 *
 * We cannot do a direct assignability check against the real `Eth` class
 * because @ledgerhq/hw-app-eth has no `exports` field and TypeScript 7 +
 * Node16 ESM resolves it as an opaque CJS namespace. Instead we verify each
 * method signature individually: if the real Eth class changes an incompatible
 * way (different parameter or return types), the spy-assignment below will
 * produce a type error.
 */
import type Eth from '@ledgerhq/hw-app-eth';
import { expectAssignable } from 'tsd';

import type { LedgerHwAppEth } from './ledger-hw-app-eth';

declare const realEth: Eth;

// The real Eth instance must be assignable to our local interface --
// i.e. it satisfies every method signature we declared.
expectAssignable<LedgerHwAppEth>(realEth);
