import { fingerprint, toEntropySourceId } from './entropy';

const SECRET = new Uint8Array(32).fill(1);

describe('fingerprint', () => {
  it('returns a valid UUID v4 string', async () => {
    const fp = await fingerprint(SECRET);
    expect(fp).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });

  it('is deterministic — same input always produces the same fingerprint', async () => {
    const first = await fingerprint(SECRET);
    const second = await fingerprint(SECRET);
    expect(first).toBe(second);
  });

  it('produces different fingerprints for different secrets', async () => {
    const otherSecret = new Uint8Array(32).fill(2);
    const first = await fingerprint(SECRET);
    const second = await fingerprint(otherSecret);
    expect(first).not.toBe(second);
  });

  it('matches a known value to guard against accidental algorithm changes', async () => {
    // uuid({ random: HMAC-SHA256( key=Uint8Array(32).fill(1), msg='metamask:fingerprint' ).slice(0, 16) })
    const fp = await fingerprint(SECRET);
    expect(fp).toBe('29b22736-01c7-4096-9ae5-9f735d55b5a2');
  });
});

describe('toEntropySourceId', () => {
  it('returns the full entropy:type:uuid format', async () => {
    const id = await toEntropySourceId('mnemonic', SECRET);
    expect(id).toMatch(
      /^entropy:mnemonic:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });

  it('is deterministic — same inputs always produce the same ID', async () => {
    const first = await toEntropySourceId('mnemonic', SECRET);
    const second = await toEntropySourceId('mnemonic', SECRET);
    expect(first).toBe(second);
  });

  it('produces different IDs for different secrets', async () => {
    const otherSecret = new Uint8Array(32).fill(2);
    const first = await toEntropySourceId('mnemonic', SECRET);
    const second = await toEntropySourceId('mnemonic', otherSecret);
    expect(first).not.toBe(second);
  });

  it('produces different IDs for different category:implementation combinations', async () => {
    const mnemonicId = await toEntropySourceId('mnemonic', SECRET);
    const privateKeyId = await toEntropySourceId('private-key', SECRET);
    expect(mnemonicId).not.toBe(privateKeyId);
  });

  it("uses '_' as the UUID segment when no material is provided (hardware wallets)", async () => {
    const id = await toEntropySourceId('ledger');
    expect(id).toBe('entropy:ledger:_');
  });

  it('matches a known value to guard against accidental algorithm changes', async () => {
    const id = await toEntropySourceId('mnemonic', SECRET);
    expect(id).toBe('entropy:mnemonic:29b22736-01c7-4096-9ae5-9f735d55b5a2');
  });
});
