# BTC Methods

Here we document the Bitcoin methods that an account Snap may implement to
support requests originated from dapps.

## sendBitcoin

Send bitcoins to one or more recipients.

### Parameters

- **Transaction intent (required)**
  - Type: `object`
  - Properties:
    - `recipients`
      - Description: A JSON object with recipient addresses and amounts.
      - Type: `object`
      - Properties:
        - `[key]: string`: Address of the recipient.
        - `[value]: string`: Amount to send to the recipient in **BTC**.
    - `replaceable` (optional)
      - Description: Allow this transaction to be replaced by a transaction
        with higher fees via BIP 125.
      - Type: `boolean`
      - Default: `true`

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
  "method": "sendBitcoin",
  "params": {
    "recipients": {
      "bc1q09vm5lfy0j5reeulh4x5752q25uqqvz34hufdl": "0.01",
      "bc1q02ad21edsxd23d32dfgqqsz4vv4nmtfzuklhy3": "0.02"
    },
    "replaceable": true
  }
}
```

**Response:**

```json
{
  "txid": "53de51e2fa75c3cfa51132865f7d430138b1cd92a8f5267ec836ec565b422969"
}
```
