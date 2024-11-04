import { isEvmAccountType } from './utils';
import { BtcAccountType, EthAccountType, SolAccountType } from '../api';

describe('isEvmAccountType', () => {
  it.each([
    [EthAccountType.Eoa, true],
    [EthAccountType.Erc4337, true],
    [BtcAccountType.P2wpkh, false],
    [SolAccountType.Eoa, false],
    [{}, false],
    [null, false],
    ['bitcoin', false],
  ])('%s should return %s', (account, result) => {
    // @ts-expect-error for error cases
    expect(isEvmAccountType(account)).toBe(result);
  });
});
