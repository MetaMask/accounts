import type { KeyringAccount } from '@metamask/keyring-api';

import { normalizeAccountAddress } from './normalize';

const evmAccount: KeyringAccount = {
  id: '111e1111-e89b-12d3-a456-426614174000',
  type: 'eip155:eoa',
  address: '0xC728514DF8A7F9271F4B7A4DD2AA6D2D723D3EE3',
  scopes: ['eip155:1'],
  options: {},
  methods: [],
};

const solanaAccount: KeyringAccount = {
  id: '222e2222-e89b-12d3-a456-426614174000',
  type: 'solana:data-account',
  address: 'So11111111111111111111111111111111111111112',
  scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  options: {},
  methods: [],
};

describe('normalizeAccountAddress', () => {
  it('lowercases EVM account addresses', () => {
    expect(normalizeAccountAddress(evmAccount)).toBe(
      evmAccount.address.toLowerCase(),
    );
  });

  it('does not lowercase non-EVM account addresses', () => {
    expect(normalizeAccountAddress(solanaAccount)).toBe(solanaAccount.address);
  });
});
