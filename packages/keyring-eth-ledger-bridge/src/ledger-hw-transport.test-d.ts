import type RealTransport from '@ledgerhq/hw-transport';
import { expectAssignable } from 'tsd';

import type { Transport } from './ledger-hw-transport';

declare const realTransport: RealTransport;

expectAssignable<Transport>(realTransport);
