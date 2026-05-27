/**
 * Selectors that are used only by NFT standards (ERC721/ERC1155), not by ERC20.
 * When the tx uses one of these, we enable Ledger NFT clear signing.
 * approve(0x095ea7b3) is shared by ERC20 and ERC721 so we do NOT include it here.
 */
export const NFT_ONLY_SELECTORS = new Set([
  '0xa22cb465', // setApprovalForAll (ERC721 + ERC1155)
  '0x42842e0e', // safeTransferFrom (ERC721)
  '0xb88d4fde', // safeTransferFrom(address,address,uint256,bytes) (ERC721)
  '0xf242432a', // safeTransferFrom (ERC1155)
  '0x2eb2c2d6', // safeBatchTransferFrom (ERC1155)
]);

/**
 * Four-byte selectors for the three state-changing functions defined in EIP-20.
 *
 * @see https://eips.ethereum.org/EIPS/eip-20
 */
export const ERC20_WRITE_SELECTORS = new Set([
  '0xa9059cbb', // transfer(address,uint256)
  '0x23b872dd', // transferFrom(address,address,uint256)
  '0x095ea7b3', // approve(address,uint256)
]);
