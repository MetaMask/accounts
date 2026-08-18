from __future__ import annotations

import enum
from dataclasses import dataclass, field


LEDGER_SERVICE_UUID = "13d63400-2c97-0004-0000-4c6564676572"
LEDGER_WRITE_CHAR_UUID = "13d63400-2c97-0004-0002-4c6564676572"
LEDGER_NOTIFY_CHAR_UUID = "13d63400-2c97-0004-0001-4c6564676572"
LEDGER_WRITE_CMD_CHAR_UUID = "13d63400-2c97-0004-0003-4c6564676572"

DEFAULT_DEVICE_NAME = "Ledger Nano X"
DEFAULT_SPECULOS_HOST = "127.0.0.1"
DEFAULT_SPECULOS_APDU_PORT = 9999
DEFAULT_SPECULOS_API_PORT = 5000
DEFAULT_CONTROL_API_PORT = 5002

BLE_TAG_ID = 0x05
MTU_PROBE_BYTE = 0x08
DEFAULT_MTU = 23
LEDGER_REQUESTED_MTU = 156
# Smallest MTU the Ledger BLE framing can carry: chunk-0 overhead
# (5 header bytes) + non-zero payload.
MIN_MTU = 7

VALID_BUTTONS = frozenset({"left", "right", "both"})
MAX_BUTTON_PRESS_COUNT = 20

SIGNING_INS_BYTES = frozenset({
    0x02,  # GET_PUBLIC_KEY (used for derivation verification)
    0x04,  # SIGN (legacy)
    0x08,  # SIGN_PERSONAL_MESSAGE
    0x0C,  # SIGN_TYPED_DATA (EIP-712)
    0x1A,  # SIGN_EIP_712 (alternate)
    0x20,  # SIGN_EIP_1559 (type 2 tx)
    0x22,  # SIGN_EIP_2930 (type 1 tx)
})


class ConnectionState(enum.Enum):
    IDLE = "idle"
    ADVERTISING = "advertising"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    EXCHANGING = "exchanging"
    DISCONNECTING = "disconnecting"


@dataclass
class ApduLogEntry:
    timestamp: float
    direction: str
    data: bytes
    tag: str = ""


@dataclass
class VirtualLedgerConfig:
    transport: str = "vhci"
    device_name: str = DEFAULT_DEVICE_NAME
    speculos_host: str = DEFAULT_SPECULOS_HOST
    speculos_apdu_port: int = DEFAULT_SPECULOS_APDU_PORT
    speculos_api_port: int = DEFAULT_SPECULOS_API_PORT
    control_api_port: int = DEFAULT_CONTROL_API_PORT
    auto_restart_advertising: bool = True
    apdu_log_size: int = 100


def validate_button_press(button: str, count: int) -> None:
    """Validate button press arguments.

    @param button - Button name, must be one of VALID_BUTTONS.
    @param count - Number of presses, an integer in [1, MAX_BUTTON_PRESS_COUNT].
    @raises ValueError if either argument is invalid.
    """
    if not isinstance(button, str) or button not in VALID_BUTTONS:
        raise ValueError(
            f"Invalid button {button!r}: must be one of "
            f"{', '.join(sorted(VALID_BUTTONS))}"
        )
    if (
        not isinstance(count, int)
        or isinstance(count, bool)
        or not 1 <= count <= MAX_BUTTON_PRESS_COUNT
    ):
        raise ValueError(
            f"Invalid count {count!r}: must be an integer between 1 and "
            f"{MAX_BUTTON_PRESS_COUNT}"
        )
