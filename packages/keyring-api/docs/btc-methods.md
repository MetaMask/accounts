# BTC Methods

Here we document the Bitcoin methods that an account Snap may implement to
support requests originated from dapps.

## btc_sendmany

This method is similar to the `sendmany` RPC method from Bitcoin Core, but its
parameters are passed in an object instead of an array, and are named in
camelCase. Also, dummy values aren't allowed.

### Parameters

- **Transaction intent (required)**
  - Type: `object`
  - Properties:
    - `amounts`
      - Description: A JSON object with recipient addresses and amounts.
      - Type: `object`
      - Properties:
        - `[key]: string`: Address of the recipient
        - `[value]: string`: Amount to send to the recipient in BTC
    - `comment` (optional)
      - Description: A comment.
      - Type: `string`
    - `subtractFeeFrom` (optional)
      - Description: The fee will be equally deducted from the amount of each
        selected address. Those recipients will receive less bitcoins than you
        enter in their corresponding amount field. If no addresses are specified
        here, the sender pays the fee.
      - Type: `array`
      - Items:
        - Type: `string`
    - `replaceable` (optional)
      - Description: Allow this transaction to be replaced by a transaction
        with higher fees via BIP 125.
      - Type: `boolean`

### Returns

- **Transaction ID**
  - Type: `object`
  - Properties:
    - `txid`
      - Description: The transaction ID.
      - Type: `string`

### Examples

**Request:**

```json
{
  "method": "btc_sendmany",
  "params": {
    "amounts": {
      "bc1q09vm5lfy0j5reeulh4x5752q25uqqvz34hufdl": "0.01",
      "bc1q02ad21edsxd23d32dfgqqsz4vv4nmtfzuklhy3": "0.02"
    },
    "comment": "testing",
    "subtractFeeFrom": ["bc1q09vm5lfy0j5reeulh4x5752q25uqqvz34hufdl"],
    "replaceable": false
  }
}
```

**Response:**

```json
{
  "txid": "53de51e2fa75c3cfa51132865f7d430138b1cd92a8f5267ec836ec565b422969"
}
```
