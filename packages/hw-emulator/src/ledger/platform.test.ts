import { getPlatform } from './platform';

describe('getPlatform', () => {
  it('returns a valid platform for the current system', () => {
    const result = getPlatform();
    expect(result.platform).toBeDefined();
    expect(result.arch).toBeDefined();
    expect(result.filename).toBeDefined();
    expect(result.checksum).toBeDefined();
  });

  it('throws for unsupported platform', () => {
    const original = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'freebsd' });

    expect(() => getPlatform()).toThrow('Unsupported platform');

    if (original) {
      Object.defineProperty(process, 'platform', original);
    }
  });
});
