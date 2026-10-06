import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';

import { withDerivedEip712Domain } from './eip712';

type TestTypedMessage = TypedMessage<MessageTypes>;

describe('withDerivedEip712Domain', () => {
  const uniswapV3Domain = {
    name: 'Uniswap V3 Positions NFT-V1',
    version: '1',
    chainId: 1,
    verifyingContract: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  };

  const permitTypes = {
    Permit: [
      { name: 'spender', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  const permitMessage = {
    spender: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    tokenId: 57,
    nonce: 5,
    deadline: 1755555555,
  };

  const fourFieldEip712Domain = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ];

  it('derives a four-field EIP712Domain when types.EIP712Domain is missing and all four domain values are present', () => {
    const data = {
      domain: uniswapV3Domain,
      types: permitTypes,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    const result = withDerivedEip712Domain(data);

    expect(result.types.EIP712Domain).toStrictEqual(fourFieldEip712Domain);
  });

  it('derives a five-field EIP712Domain when salt is also present', () => {
    const data = {
      domain: {
        ...uniswapV3Domain,
        salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
      },
      types: permitTypes,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    const result = withDerivedEip712Domain(data);

    expect(result.types.EIP712Domain).toStrictEqual([
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
      { name: 'salt', type: 'bytes32' },
    ]);
  });

  it('treats an empty EIP712Domain array as missing and derives it', () => {
    const data = {
      domain: uniswapV3Domain,
      types: { EIP712Domain: [], ...permitTypes },
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    const result = withDerivedEip712Domain(data);

    expect(result.types.EIP712Domain).toStrictEqual(fourFieldEip712Domain);
  });

  it('omits domain fields whose value is undefined or null', () => {
    const data = {
      domain: {
        name: null,
        version: '1',
        chainId: 1,
        verifyingContract: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      },
      types: permitTypes,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    const result = withDerivedEip712Domain(data);

    expect(result.types.EIP712Domain).toStrictEqual([
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ]);
  });

  it('ignores domain keys that are not in the canonical EIP-712 field set', () => {
    const data = {
      domain: {
        name: 'My NFT',
        chainId: 1,
        verifyingContract: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        customField: 'not-a-canonical-field',
      },
      types: permitTypes,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    const result = withDerivedEip712Domain(data);

    expect(result.types.EIP712Domain).toStrictEqual([
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ]);
  });

  it('returns the input untouched when EIP712Domain is a non-empty array', () => {
    const data = {
      domain: uniswapV3Domain,
      types: { EIP712Domain: fourFieldEip712Domain, ...permitTypes },
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    expect(withDerivedEip712Domain(data)).toBe(data);
  });

  it('returns the input untouched when no derivable domain fields are present', () => {
    const data = {
      domain: {},
      types: permitTypes,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    expect(withDerivedEip712Domain(data)).toBe(data);
  });

  it('tolerates payloads whose types or domain object is missing', () => {
    const dataWithoutTypes = {
      domain: uniswapV3Domain,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    expect(
      withDerivedEip712Domain(dataWithoutTypes).types.EIP712Domain,
    ).toStrictEqual(fourFieldEip712Domain);

    const dataWithoutDomain = {
      types: permitTypes,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    expect(withDerivedEip712Domain(dataWithoutDomain)).toBe(dataWithoutDomain);
  });

  it('preserves the other entries of types and the top-level keys when deriving', () => {
    const mailType = [{ name: 'from', type: 'Person' }];
    const data = {
      domain: uniswapV3Domain,
      types: { Mail: mailType, ...permitTypes },
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    const result = withDerivedEip712Domain(data);

    expect(result.types.EIP712Domain).toStrictEqual(fourFieldEip712Domain);
    expect(result.types.Permit).toBe(data.types.Permit);
    expect(result.types.Mail).toBe(mailType);
    expect(result.domain).toBe(data.domain);
    expect(result.message).toBe(data.message);
    expect(result.primaryType).toBe('Permit');
  });

  it('pins the derived domain separator to the Uniswap V3 NFT on-chain DOMAIN_SEPARATOR', () => {
    const payload = {
      domain: uniswapV3Domain,
      types: permitTypes,
      primaryType: 'Permit',
      message: permitMessage,
    } as unknown as TestTypedMessage;

    const normalized = withDerivedEip712Domain(payload);

    // The spec-correct separator for these domain values, matching the
    // contract's on-chain DOMAIN_SEPARATOR.
    expect(
      TypedDataUtils.eip712DomainHash(
        normalized,
        SignTypedDataVersion.V4,
      ).toString('hex'),
    ).toBe('24ea63bbfcb16de2524c7c24322b6cbc39cb2d08881bce770af4771e6b1ad117');

    // Documents the broken behavior: without derivation, eth-sig-util hashes
    // the empty domain struct that sanitizeData injects for a missing
    // EIP712Domain type.
    expect(
      TypedDataUtils.eip712DomainHash(
        payload,
        SignTypedDataVersion.V4,
      ).toString('hex'),
    ).toBe('6192106f129ce05c9075d319c1fa6ea9b3ae37cbd0c1ef92e2be7137bb07baa1');
  });
});
