# EVM Methods

Here we document the methods that an account Snap may implement to support
requests originated from dapps.

> :pencil2: **Note:** The methods described here may differ from the ones
> defined in the [Ethereum JSON-RPC Specification][execution-api] or in
> [MetaMask's API Reference][metamask-api-reference].

## personal_sign

Adds support to [`personal_sign`][personal-sign].

### Parameters (Array)

1. **Message to sign (required)**
   - Type: `string`
   - Pattern: `^0x[0-9a-f]*$`
2. **Account address (required)**
   - Type: `string`
   - Pattern: `^0x[0-9a-fA-F]{40}$`

### Returns

- **Signature**
  - Type: `string`
  - Pattern: `^0x[0-9a-f]{130}$`

### Example

**Request:**

```json
{
  "method": "personal_sign",
  "params": [
    "0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765",
    "0x5874174dcf1ab6F7Efd8496f4f09404CD1c5bA84"
  ]
}
```

**Response:**

```json
"0x262d12322b75228d09bbe3c104b91c1df32794126ce6a851e5c2721deb42d60e20b6eff3a1e2b5d29c2680edfb42e8497dbd7e75d0591a390a9385861b40f73d1c"
```

## eth_sign

Adds support to [`eth_sign`][eth-sign].

> :warning: **Warning:** Please read the following articles to understand the
> risks of using this method and its differences with `personal_sign`:
>
> - [What is 'eth_sign' and why is it a risk?][eth-sign-risk]
> - [Sign data (MetaMask Docs)][sign-data]

### Parameters

1. **Account address (required)**
   - Type: `string`
   - Pattern: `^0x[0-9a-fA-F]{40}$`
2. **Hash to sign (required)**
   - Type: `string`
   - Pattern: `^0x[0-9a-f]{64}$`

### Returns

- **Signature**
  - Type: `string`
  - Pattern: `^0x[0-9a-f]{130}$`

### Example

**Request:**

```json
{
  "method": "eth_sign",
  "params": [
    "0x5874174dcf1ab6f7efd8496f4f09404cd1c5ba84",
    "0x879a053d4800c6354e76c7985a865d2922c82fb5b3f4577b2fe08b998954f2e0"
  ]
}
```

**Response:**

```json
"0xdc447c7a279a4b2114f453d2251a02904292652d37c8c220e92650429f1ef85230051830cef98de154fe0a52e3d2f308dd8b4e5045006482791bea0e5bbf79f71b"
```

## eth_signTransaction

Adds support to [`eth_sendTransaction`][eth-send-transaction].

### Parameters

1. **Transaction (required)**
   - Type: `object`
   - Properties:
     - `type`:
       - Type: `string`
       - Pattern: `^0x[0-9a-fA-F]{1,2}$`
     - `nonce`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `to`
       - One-of:
         - Contract creation
           - Type: `null`
         - Address:
           - Type: `string`
           - Pattern: `^0x[0-9a-fA-F]{40}$`
     - `from`
       - Type: `string`
       - Pattern: `^0x[0-9a-fA-F]{40}$`
     - `value`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `data`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
     - `gasLimit`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `gasPrice`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `maxPriorityFeePerGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `maxFeePerGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `accessList`:
       - Description: EIP-2930 access list
       - Type: `array`
       - Items:
         - Type: `object`
         - Properties:
           - `address`
             - Type: `string`
             - Pattern: `^0x[0-9a-fA-F]{40}$`
           - `storageKeys`
             - Type: `array`
             - Items:
               - Type: `string`
               - Pattern: `^0x[0-9a-f]{64}$`
     - `chainId`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`

### Returns

- **Signature**
  - Type: `object`
  - Properties:
    - `v`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]{1,2}$`
    - `r`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]{64}$`
    - `s`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]{64}$`

### Example

**EIP-1559 request:**

```json
{
  "method": "eth_signTransaction",
  "params": [
    {
      "type": "0x2",
      "nonce": "0x1",
      "to": "0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb",
      "from": "0x660265edc169bab511a40c0e049cc1e33774443d",
      "value": "0x0",
      "data": "0x",
      "gasLimit": "0x5208",
      "maxPriorityFeePerGas": "0x3b9aca00",
      "maxFeePerGas": "0x2540be400",
      "accessList": [],
      "chainId": "0xaa36a7"
    }
  ]
}
```

**Legacy request:**

```json
{
  "method": "eth_signTransaction",
  "params": [
    {
      "type": "0x0",
      "nonce": "0x0",
      "to": "0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb",
      "from": "0x660265edc169bab511a40c0e049cc1e33774443d",
      "value": "0x0",
      "data": "0x",
      "gasLimit": "0x5208",
      "gasPrice": "0x2540be400",
      "chainId": "0xaa36a7"
    }
  ]
}
```

**Response:**

```json
{
  "v": "0x1",
  "r": "0x51991c5099327d3c7eaa745de60c52a93555e5cbc418eb9b405fe92d986dee08",
  "s": "0x65b1d20a39360c31de69f872244e23a3549b702e11bc7d8eb3586812ac62be8d"
}
```

## eth_signTypedData_v4

Adds support to [`eth_signtypeddata_v4`][eth-sign-typed-data].

> :pencil2: **Note:** You can also implement support for `eth_signTypedData_v1`
> and `eth_signTypedData_v3`, but they are [deprecated](#deprecated-methods).
>
> In summary, the differences between the versions are:
>
> - V1 is based upon [an early version of EIP-712][sign-typed-data-v1] that
>   lacked some later security improvements, and should generally be neglected
>   in favor of later versions.
>
> - V3 is based on [EIP-712][eip-712], except that arrays and recursive data
>   structures are not supported.
>
> - V4 is based on [EIP-712][eip-712], and includes full support of arrays and
>   recursive data structures.

### Parameters

1. **Account address (required)**
   - Type: `string`
   - Pattern: `^0x[0-9a-fA-F]{40}$`
2. **Typed data (required)**
   - Type: `object`
   - Properties:
     - `types`
       - Type: `object`
       - Properties:
         - `EIP712Domain`
           - Type: `array`
     - `primaryType`
       - Type: `string`
     - `domain`
       - Type: `object`
     - `message`
       - Type: `object`

### Returns

- **Signature**
  - Type: `string`
  - Pattern: `^0x[0-9a-f]{130}$`

### Example

**Request:**

```json
{
  "method": "eth_signTypedData_v4",
  "params": [
    "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    {
      "types": {
        "EIP712Domain": [
          { "name": "name", "type": "string" },
          { "name": "version", "type": "string" },
          { "name": "chainId", "type": "uint256" },
          { "name": "verifyingContract", "type": "address" }
        ],
        "Person": [
          { "name": "name", "type": "string" },
          { "name": "wallet", "type": "address" }
        ],
        "Mail": [
          { "name": "from", "type": "Person" },
          { "name": "to", "type": "Person" },
          { "name": "contents", "type": "string" }
        ]
      },
      "primaryType": "Mail",
      "domain": {
        "name": "Ether Mail",
        "version": "1",
        "chainId": 1,
        "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
      },
      "message": {
        "from": {
          "name": "Cow",
          "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
        },
        "to": {
          "name": "Bob",
          "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
        },
        "contents": "Hello, Bob!"
      }
    }
  ]
}
```

**Result:**

```json
"0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c"
```

## Deprecated methods

Please note that the `eth_sign`, `eth_signTypedData_v1` and
`eth_signTypedData_v3` methods are [deprecated][deprecated-methods] but may
still be used by some dapps.

## Reference implementation

A reference implementation of the methods described here can be found in the
[eth-sig-util][eth-sig-util] package.

[execution-api]: https://ethereum.github.io/execution-apis/api-documentation/
[metamask-api-reference]: https://docs.metamask.io/wallet/reference/
[personal-sign]: https://docs.metamask.io/wallet/reference/personal_sign/
[eth-sign-typed-data]: https://docs.metamask.io/wallet/reference/eth_signtypeddata_v4/
[eth-sign]: https://docs.metamask.io/wallet/concepts/signing-methods/#eth_sign
[eth-sign-risk]: https://support.metamask.io/hc/en-us/articles/14764161421467-What-is-eth-sign-and-why-is-it-a-risk-
[sign-data]: https://docs.metamask.io/wallet/how-to/sign-data/
[eth-send-transaction]: https://docs.metamask.io/wallet/reference/eth_sendtransaction/
[deprecated-methods]: https://docs.metamask.io/wallet/concepts/signing-methods/#deprecated-signing-methods
[sign-typed-data-v1]: https://github.com/ethereum/EIPs/pull/712/commits/21abe254fe0452d8583d5b132b1d7be87c0439ca
[eip-712]: https://eips.ethereum.org/EIPS/eip-712
[eth-sig-util]: https://github.com/MetaMask/eth-sig-util
