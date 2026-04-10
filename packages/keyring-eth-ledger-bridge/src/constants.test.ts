import { keccak256 } from 'ethereum-cryptography/keccak';

import { ERC20_WRITE_SELECTORS, NFT_ONLY_SELECTORS } from './constants';

/**
 * Computes the four-byte function selector for a canonical Solidity signature.
 *
 * @param signature - Canonical Solidity ABI function signature.
 * @returns Lowercase `0x` + 8-hex-digit selector.
 */
function selectorFromSignature(signature: string): string {
  const hash = keccak256(Buffer.from(signature, 'utf8'));
  return `0x${Buffer.from(hash).subarray(0, 4).toString('hex')}`;
}

describe('NFT_ONLY_SELECTORS', () => {
  const signatures: readonly string[] = [
    'setApprovalForAll(address,bool)',
    'safeTransferFrom(address,address,uint256)',
    'safeTransferFrom(address,address,uint256,bytes)',
    'safeTransferFrom(address,address,uint256,uint256,bytes)',
    'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
  ];

  it('contains exactly one entry per canonical NFT-related signature', () => {
    expect(NFT_ONLY_SELECTORS.size).toBe(signatures.length);
    for (const signature of signatures) {
      expect(NFT_ONLY_SELECTORS.has(selectorFromSignature(signature))).toBe(
        true,
      );
    }
  });
});

describe('ERC20_WRITE_SELECTORS', () => {
  const signatures: readonly string[] = [
    'transfer(address,uint256)',
    'transferFrom(address,address,uint256)',
    'approve(address,uint256)',
  ];

  it('contains exactly the three EIP-20 write function selectors', () => {
    expect(ERC20_WRITE_SELECTORS.size).toBe(signatures.length);
    for (const signature of signatures) {
      expect(ERC20_WRITE_SELECTORS.has(selectorFromSignature(signature))).toBe(
        true,
      );
    }
  });
});
