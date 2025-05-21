import { isBtcMainnetAddress, isBtcTestnetAddress } from './address';

const BTC_MAINNET_ADDRESSES = [
  // P2PKH
  '1AXaVdPBb6zqrTMb6ebrBb9g3JmeAPGeCF',
  // P2WPKH-P2SH
  '3KQPirCGGbVyWJLGuWN6VPC7uLeiarYB7x',
  // P2WPKH
  'bc1q4degm5k044n9xv3ds7d8l6hfavydte6wn6sesw',
  // P2TR
  'bc1pxfxst7zrkw39vzh0pchq5ey0q7z6u739cudhz5vmg89wa4kyyp9qzrf5sp',
];

const BTC_TESTNET_ADDRESSES = [
  // P2PKH
  'mrDHfcAPosFsabxBKe2U3EdxX5Kph8Zd4f',
  // P2WPKH-P2SH
  '2N7AeKCw7p8uRRQjXPeHW7UPGhR8LYHEzBT',
  // P2WPKH
  'tb1qqecaw32rvyjgez706t5chpr8gan49wfuk94t3g',
  // P2TR
  'tb1p6epn3ctassfp54lnztshnpfjekn7khyarrnm6f0yv738lgc53xxsgevs8k',
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
