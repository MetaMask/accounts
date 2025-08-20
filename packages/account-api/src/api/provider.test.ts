import { AccountProviderType } from './provider';

describe('AccountProviderType', () => {
  it('has expected values', () => {
    expect(AccountProviderType).toEqual({
      Evm: 'Evm',
      Solana: 'Solana',
      Btc: 'Btc',
    });
  });
});