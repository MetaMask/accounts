import { AccountProviderType } from './provider';

describe('AccountProviderType', () => {
  it('has expected values', () => {
    expect(AccountProviderType).toStrictEqual({
      Evm: 'Evm',
      Solana: 'Solana',
      Btc: 'Btc',
    });
  });
});
