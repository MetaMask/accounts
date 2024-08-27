import { BtcAccountType, EthAccountType } from '../api';
import { isEvmAccountType } from './utils';

describe('isEvmAccountType', () => {
  it.each([
    [EthAccountType.Eoa, true],
    [EthAccountType.Erc4337, true],
    [BtcAccountType.P2wpkh, false],
    [{}, false],
    [null, false],
    ['bitcoin', false],
  ])('%s should return %s', (account, result) => {
    // @ts-expect-error for error cases
    expect(isEvmAccountType(account)).toBe(result);
  });
});
