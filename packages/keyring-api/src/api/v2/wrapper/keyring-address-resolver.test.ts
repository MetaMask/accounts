import { InMemoryKeyringAddressResolver } from './keyring-address-resolver';

describe('InMemoryKeyringAddressResolver', () => {
  it('registers and resolves account IDs and addresses', () => {
    const resolver = new InMemoryKeyringAddressResolver();

    const address = '0xaBc';
    const id = resolver.register(address);

    expect(typeof id).toBe('string');

    const resolvedAddress = resolver.getAddress(id);
    expect(resolvedAddress).toBe(address);

    const resolvedId = resolver.getAccountId(address);
    expect(resolvedId).toBe(id);
  });

  it('reuses the same ID when registering the same address', () => {
    const resolver = new InMemoryKeyringAddressResolver();

    const address = '0xaBc';
    const firstId = resolver.register(address);
    const secondId = resolver.register(address);

    expect(firstId).toBe(secondId);
  });
});
