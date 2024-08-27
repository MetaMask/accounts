# EVM Methods for ERC-4337 Accounts

Here we document the methods that an account Snap may implement to support
requests using [ERC-4337][erc-4337] accounts.

## eth_prepareUserOperation

Prepare a new UserOperation from transaction data.

> ✏️ **Note:** The return value of this method requires the properties `dummySignature` and `dummyPaymasterAndData`. This is necessary because the UserOperation needs its total size in bytes to be determined in order to accurately estimate the gas costs from the bundler.

### Parameters (Array)

1. **Transaction Intents (repeated, required)**
   - Type: `object`
   - Properties:
     - `to`
       - Type: `string`
       - Pattern: `^0x[0-9a-fA-F]{40}$`
     - `value`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `data`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`

### Returns

- **UserOperation Details**
  - Type: `object`
  - Properties:
    - `callData`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]*$`
    - `initCode`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]*$`
    - `nonce`
      - Type: `string`
      - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
    - `gasLimits` (optional)
      - Type: `object`
      - Properties
        - `callGasLimit`
          - Type: `string`
          - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
        - `verificationGasLimit`
          - Type: `string`
          - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
        - `preVerificationGas`
          - Type: `string`
          - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
    - `dummySignature`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]*$`
    - `dummyPaymasterAndData`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]*$`
    - `bundlerUrl`
      - Type: `string`

### Example

**Request:**

```json
{
  "method": "eth_prepareUserOperation",
  "params": [
    {
      "to": "0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb",
      "value": "0x0",
      "data": "0x"
    },
    {
      "to": "0x660265edc169bab511a40c0e049cc1e33774443d",
      "value": "0x0",
      "data": "0x619a309f"
    }
  ]
}
```

**Response:**

```json
{
  "callData": "0x70641a22000000000000000000000000f3de3c0d654fda23dad170f0f320a921725091270000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e49871efa4000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000067fd192000000000000000000000000000000000000000001411a0c3b763237f484fdd70000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000280000000000000003b6d03400d4a11d5eeaac28ec3f61d100daf4d40471f185280000000000000003b6d03408f1b19622a888c53c8ee4f7d7b4dc8f574ff906800000000000000000000000000000000000000000000000000000000",
  "initCode": "0x22ff1dc5998258faa1ea45a776b57484f8ab80a2296601cd0000000000000000000000005147ce3947a407c95687131be01a2b8d55fd0a400000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000007d91ea6a0bc4a4238cd72386d935e35e3d8c318400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000",
  "nonce": "0x1",
  "gasLimits": {
    "callGasLimit": "0x58a83",
    "verificationGasLimit": "0xe8c4",
    "preVerificationGas": "0xc57c"
  },
  "dummySignature": "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "dummyPaymasterAndData": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "bundlerUrl": "https://bundler.example.com/rpc"
}
```

## eth_patchUserOperation

Patch _some_ allowed properties of an UserOperation.

### Parameters (Array)

1. **UserOperation object**
   - Type: `object`
   - Properties:
     - `sender`
       - Type: `string`
       - Pattern: `^0x[0-9a-fA-F]{40}$`
     - `nonce`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `initCode`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
     - `callData`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
     - `callGasLimit`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `verificationGasLimit`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `preVerificationGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `maxFeePerGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `maxPriorityFeePerGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `paymasterAndData`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
     - `signature`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`

### Returns

- **Partial UserOperation object**
  - Type: `object`
  - Properties:
    - `paymasterAndData`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]*$`
    - `callGasLimit` (optional)
      - Type: `string`
      - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
    - `preVerificationGas` (optional)
      - Type: `string`
      - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
    - `verificationGasLimit` (optional)
      - Type: `string`
      - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`

### Example

**Request:**

```json
{
  "method": "eth_patchUserOperation",
  "params": [
    {
      "sender": "0x4584d2B4905087A100420AFfCe1b2d73fC69B8E4",
      "nonce": "0x1",
      "initCode": "0x",
      "callData": "0x70641a22000000000000000000000000f3de3c0d654fda23dad170f0f320a921725091270000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e49871efa4000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000067fd192000000000000000000000000000000000000000001411a0c3b763237f484fdd70000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000280000000000000003b6d03400d4a11d5eeaac28ec3f61d100daf4d40471f185280000000000000003b6d03408f1b19622a888c53c8ee4f7d7b4dc8f574ff906800000000000000000000000000000000000000000000000000000000",
      "callGasLimit": "0x58a83",
      "verificationGasLimit": "0xe8c4",
      "preVerificationGas": "0xc57c",
      "maxFeePerGas": "0x87f0878c0",
      "maxPriorityFeePerGas": "0x1dcd6500",
      "paymasterAndData": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "signature": "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    }
  ]
}
```

**Response:**

```json
{
  "paymasterAndData": "0x952514d7cBCB495EACeB86e02154921401dB0Cd9dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000779b3fbb00000000000000006565b267000000000000000000000000000000000000000029195b31a9b1c6ccdeff53e359ebbcd5f075a93c1aaed93302e5fde5faf8047028b296b8a3fa4e22b063af5069ae9f656736ffda0ee090c0311155722b905f781b",
  "callGasLimit": "0x58a83",
  "verificationGasLimit": "0xe8c4",
  "preVerificationGas": "0xc57c"
}
```

## eth_signUserOperation

Sign an UserOperation.

### Parameters (Array)

1. **UserOperation object**
   - Type: `object`
   - Properties:
     - `sender`
       - Type: `string`
       - Pattern: `^0x[0-9a-fA-F]{40}$`
     - `nonce`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `initCode`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
     - `callData`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
     - `callGasLimit`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `verificationGasLimit`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `preVerificationGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `maxFeePerGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `maxPriorityFeePerGas`
       - Type: `string`
       - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
     - `paymasterAndData`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
     - `signature`
       - Type: `string`
       - Pattern: `^0x[0-9a-f]*$`
2. **Entrypoint**
   - Type: `string`
   - Pattern: `^0x[0-9a-f]{40}$`

### Returns

- **Signature**
  - Type: `string`
  - Pattern: `^0x[0-9a-f]*$`

### Example

**Request:**

```json
{
  "method": "eth_signUserOperation",
  "params": [
    {
      "sender": "0x4584d2B4905087A100420AFfCe1b2d73fC69B8E4",
      "nonce": "0x1",
      "initCode": "0x",
      "callData": "0x70641a22000000000000000000000000f3de3c0d654fda23dad170f0f320a921725091270000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e49871efa4000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000067fd192000000000000000000000000000000000000000001411a0c3b763237f484fdd70000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000280000000000000003b6d03400d4a11d5eeaac28ec3f61d100daf4d40471f185280000000000000003b6d03408f1b19622a888c53c8ee4f7d7b4dc8f574ff906800000000000000000000000000000000000000000000000000000000",
      "callGasLimit": "0x58a83",
      "verificationGasLimit": "0xe8c4",
      "preVerificationGas": "0xc57c",
      "maxFeePerGas": "0x87f0878c0",
      "maxPriorityFeePerGas": "0x1dcd6500",
      "paymasterAndData": "0x952514d7cBCB495EACeB86e02154921401dB0Cd9dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000779b3fbb00000000000000006565b267000000000000000000000000000000000000000029195b31a9b1c6ccdeff53e359ebbcd5f075a93c1aaed93302e5fde5faf8047028b296b8a3fa4e22b063af5069ae9f656736ffda0ee090c0311155722b905f781b",
      "signature": "0x"
    },
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
  ]
}
```

**Response:**

```json
"0x6565acc7efd3c85e4c0c221c2958ff6c3ae68401b23b33fdcd1a2d49034c30d97b1cfa17487b90253a5dfd54ef5188688592c2fd56ba44ee4d948ea259d636cd550f6dd21b"
```

## eth_decodeUserOperationCallData

### Parameters (Array)

1. **Call data**
   - Type: `string`
   - Pattern: `^0x[0-9a-f]*$`

### Returns

- **Transaction Intents**
  - Type: `array`
  - Properties:
    - Type: `object`
    - Properties:
    - `to`
      - Type: `string`
      - Pattern: `^0x[0-9a-fA-F]{40}$`
    - `value`
      - Type: `string`
      - Pattern: `^0x([1-9a-f][0-9a-f]*|0)$`
    - `data`
      - Type: `string`
      - Pattern: `^0x[0-9a-f]*$`

### Example

**Request:**

```json
{
  "method": "eth_decodeUserOperationCallData",
  "params": [
    "0x70641a22000000000000000000000000f3de3c0d654fda23dad170f0f320a921725091270"
  ]
}
```

**Response:**

```json
[
  {
    "to": "0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb",
    "value": "0x1234",
    "data": "0x"
  },
  {
    "to": "0x660265edc169bab511a40c0e049cc1e33774443d",
    "value": "0x0",
    "data": "0x619a309f"
  }
]
```

[erc-4337]: https://eips.ethereum.org/EIPS/eip-4337
