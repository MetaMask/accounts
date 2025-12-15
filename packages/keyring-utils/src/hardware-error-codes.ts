// Authentication & Security
export const AUTH_PIN_001 = 'PIN invalid';
export const AUTH_PIN_002 = 'PIN cancelled by user';
export const AUTH_PIN_003 = 'PIN attempts remaining';
export const AUTH_PIN_004 = 'PIN mismatch';
export const AUTH_LOCK_001 = 'Device is locked';
export const AUTH_LOCK_002 = 'Device blocked due to failed attempts';
export const AUTH_SEC_001 = 'Security conditions not satisfied';
export const AUTH_SEC_002 = 'Access rights insufficient';
export const AUTH_WIPE_001 = 'Wipe code mismatch';

// User Action
export const USER_CANCEL_001 = 'User rejected action on device';
export const USER_CANCEL_002 = 'User cancelled operation';
export const USER_INPUT_001 = 'User input expected';
export const USER_CONFIRM_001 = 'User confirmation required';

// Device State
export const DEVICE_STATE_001 = 'Device not initialized';
export const DEVICE_STATE_002 = 'Device busy';
export const DEVICE_STATE_003 = 'Device disconnected';
export const DEVICE_STATE_004 = 'Device used elsewhere';
export const DEVICE_STATE_005 = 'Device call in progress';
export const DEVICE_DETECT_001 = 'Device not found';
export const DEVICE_CAP_001 = 'Device missing required capability';
export const DEVICE_CAP_002 = 'Device is BTC-only, operation not supported';
export const DEVICE_MODE_001 = 'Invalid device mode';

// Connection & Transport
export const CONN_TRANSPORT_001 = 'Transport layer missing';
export const CONN_CLOSED_001 = 'Connection closed unexpectedly';
export const CONN_IFRAME_001 = 'Unable to establish iframe connection';
export const CONN_SUITE_001 = 'Unable to connect to Suite';
export const CONN_TIMEOUT_001 = 'Connection timeout';
export const CONN_BLOCKED_001 = 'Connection blocked';

// Data & Validation
export const DATA_FORMAT_001 = 'Incorrect data length';
export const DATA_FORMAT_002 = 'Invalid data received';
export const DATA_FORMAT_003 = 'Invalid parameter';
export const DATA_MISSING_001 = 'Missing critical parameter';
export const DATA_VALIDATION_001 = 'Address mismatch';
export const DATA_VALIDATION_002 = 'Invalid signature';
export const DATA_NOTFOUND_001 = 'Referenced data not found';
export const DATA_NOTFOUND_002 = 'File not found';
export const DATA_NOTFOUND_003 = 'Coin not found';

// Cryptographic Operations
export const CRYPTO_SIGN_001 = 'Signature operation failed';
export const CRYPTO_ALGO_001 = 'Algorithm not supported';
export const CRYPTO_KEY_001 = 'Invalid key check value';
export const CRYPTO_ENTROPY_001 = 'Entropy check failed';

// System & Internal
export const SYS_INTERNAL_001 = 'Internal device error';
export const SYS_MEMORY_001 = 'Not enough memory';
export const SYS_MEMORY_002 = 'Memory problem';
export const SYS_FILE_001 = 'File system error';
export const SYS_FILE_002 = 'Inconsistent file';
export const SYS_LICENSE_001 = 'Licensing error';
export const SYS_FIRMWARE_001 = 'Firmware error';
export const SYS_FIRMWARE_002 = 'Firmware installation failed';

// Command & Protocol
export const PROTO_CMD_001 = 'Command not supported';
export const PROTO_CMD_002 = 'Command incompatible';
export const PROTO_CMD_003 = 'Unexpected message';
export const PROTO_MSG_001 = 'Invalid APDU command';
export const PROTO_PARAM_001 = 'Invalid command parameters';

// Configuration & Initialization
export const CONFIG_INIT_001 = 'Not initialized';
export const CONFIG_INIT_002 = 'Already initialized';
export const CONFIG_INIT_003 = 'Manifest missing';
export const CONFIG_PERM_001 = 'Permissions not granted';
export const CONFIG_METHOD_001 = 'Method not allowed';

// Transaction
export const TX_FUNDS_001 = 'Insufficient funds';
export const TX_FAIL_001 = 'Transaction failed';

// Success
export const SUCCESS_000 = 'Operation successful';

// Unknown/Fallback
export const UNKNOWN_001 = 'Unknown error';
