import { isBtcMainnetAddress, isBtcTestnetAddress } from './address';

const BTC_MAINNET_ADDRESSES = [
  // P2WPKH
  'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
  // P2PKH
  '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ',
];

const BTC_TESTNET_ADDRESSES = [
  // P2WPKH
  'tb1q6rmsq3vlfdhjdhtkxlqtuhhlr6pmj09y6w43g8',
];

const ETH_ADDRESSES = ['0x6431726EEE67570BF6f0Cf892aE0a3988F03903F'];

const SOL_ADDRESSES = [
  '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
  'DpNXPNWvWoHaZ9P3WtfGCb2ZdLihW8VW1w1Ph4KDH9iG',
];

describe('address', () => {
  describe('isBtcMainnetAddress', () => {
    it.each(BTC_MAINNET_ADDRESSES)(
      'returns true if address is compatible with BTC mainnet: %s',
      (address: string) => {
        expect(isBtcMainnetAddress(address)).toBe(true);
      },
    );

    it.each([...BTC_TESTNET_ADDRESSES, ...ETH_ADDRESSES, ...SOL_ADDRESSES])(
      'returns false if address is not compatible with BTC mainnet: %s',
      (address: string) => {
        expect(isBtcMainnetAddress(address)).toBe(false);
      },
    );
  });

  describe('isBtcTestnetAddress', () => {
    it.each(BTC_TESTNET_ADDRESSES)(
      'returns true if address is compatible with BTC testnet: %s',
      (address: string) => {
        expect(isBtcTestnetAddress(address)).toBe(true);
      },
    );

    it.each([...BTC_MAINNET_ADDRESSES, ...ETH_ADDRESSES, ...SOL_ADDRESSES])(
      'returns false if address is compatible with BTC testnet: %s',
      (address: string) => {
        expect(isBtcTestnetAddress(address)).toBe(false);
      },
    );
  });
});
