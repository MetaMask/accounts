import { KeyringPublicClient } from '.';

describe('KeyringPublicCient', () => {
  // IMPORTANT:
  // See `KeyringClient.test.ts` for additional tests.

  it('can be constructed', () => {
    const mockSender = {
      send: jest.fn(),
    };

    const client = new KeyringPublicClient(mockSender);
    expect(client).toBeDefined();
  });
});
