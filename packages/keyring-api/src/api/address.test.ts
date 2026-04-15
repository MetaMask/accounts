import { assert } from '@metamask/superstruct';

import { ResolvedAccountAddressStruct } from './address';
import type { ResolvedAccountAddress } from './address';
import type { CaipAccountId } from './caip';
import { BtcScope } from '../btc';
import { EthScope } from '../eth';
import { SolScope } from '../sol';

const MOCK_ETH_ADDRESS = '0x6431726EEE67570BF6f0Cf892aE0a3988F03903F';
const MOCK_BTC_ADDRESS = 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';
const MOCK_SOL_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

describe('ResolveAccountAddress', () => {
  it.each([
    `${EthScope.Eoa}:${MOCK_ETH_ADDRESS}`,
    `${BtcScope.Mainnet}:${MOCK_BTC_ADDRESS}`,
    `${SolScope.Mainnet}:${MOCK_SOL_ADDRESS}`,
  ] as CaipAccountId[])(
    'allows CAIP-10 account ID: %s',
    (address: CaipAccountId) => {
      const resolvedAddress: ResolvedAccountAddress = {
        address,
      };
      expect(() =>
        assert(resolvedAddress, ResolvedAccountAddressStruct),
      ).not.toThrow();
    },
  );

  it.each([MOCK_ETH_ADDRESS, MOCK_BTC_ADDRESS, MOCK_SOL_ADDRESS])(
    'throws an error if address is not a CAIP-10 account ID: %s',
    (address: string) => {
      const resolvedAddress: ResolvedAccountAddress = {
        // We type-cast to force the error.
        address: address as CaipAccountId,
      };
      expect(() =>
        assert(resolvedAddress, ResolvedAccountAddressStruct),
      ).toThrow(
        `At path: address -- Expected a value of type \`CaipAccountId\`, but received: \`"${address}"\``,
      );
    },
  );
});
