"""GATT server exposing the Ledger Nano X BLE service.

Characteristics:
  - Write (UUID ...0002): receives chunked APDU frames from phone
  - Notify (UUID ...0001): sends chunked APDU responses to phone
  - WriteCmd (UUID ...0003): receives APDU frames without response

Uses the actual Bumble API: Characteristic + CharacteristicValue callbacks.
"""

from __future__ import annotations

import asyncio
import logging
import struct
import time
from typing import TYPE_CHECKING

from bumble.gatt import Characteristic, CharacteristicValue, Service

from .apdu_framing import ApduReassembler, fragment_apdu
from .types import (
    LEDGER_SERVICE_UUID,
    LEDGER_NOTIFY_CHAR_UUID,
    LEDGER_WRITE_CHAR_UUID,
    LEDGER_WRITE_CMD_CHAR_UUID,
    MTU_PROBE_BYTE,
    DEFAULT_MTU,
    MIN_MTU,
    ApduLogEntry,
)

if TYPE_CHECKING:
    from bumble.device import Device, Connection

logger = logging.getLogger(__name__)

# Status word 0x6D00 ("instruction not supported"), notified to the peer
# when an APDU exchange fails.
DEFAULT_APDU_ERROR_RESPONSE = bytes([0x6D, 0x00])


class LedgerGattServer:
    def __init__(
        self,
        on_apdu: "asyncio.coroutine",
        on_mtu_probe: "asyncio.coroutine | None" = None,
        apdu_log_size: int = 100,
    ) -> None:
        self._on_apdu = on_apdu
        self._on_mtu_probe = on_mtu_probe
        self._reassembler = ApduReassembler()
        self._connection: Connection | None = None
        self._device: Device | None = None
        self._mtu: int = DEFAULT_MTU
        # Single lock for the server lifetime; reset() never replaces it
        # (a coroutine holding the old lock would be orphaned). In-flight
        # exchanges are cancelled in reset() instead, via _exchange_task.
        self._exchange_lock = asyncio.Lock()
        self._exchange_task: "asyncio.Task[None] | None" = None
        self._apdu_log: list[ApduLogEntry] = []
        self._apdu_log_size = apdu_log_size
        self._subscribed_connections: set[Connection] = set()

        self.write_char = Characteristic(
            LEDGER_WRITE_CHAR_UUID,
            Characteristic.Properties.WRITE,
            Characteristic.WRITEABLE,
            CharacteristicValue(write=self._on_write),
        )

        self.write_cmd_char = Characteristic(
            LEDGER_WRITE_CMD_CHAR_UUID,
            Characteristic.Properties.WRITE_WITHOUT_RESPONSE,
            Characteristic.WRITEABLE,
            CharacteristicValue(write=self._on_write),
        )

        self.notify_char = Characteristic(
            LEDGER_NOTIFY_CHAR_UUID,
            Characteristic.Properties.READ | Characteristic.Properties.NOTIFY,
            Characteristic.READABLE,
            bytes([0x00]),
        )

        self.service = Service(
            LEDGER_SERVICE_UUID,
            [self.write_char, self.write_cmd_char, self.notify_char],
        )

        self.notify_char.on("subscription", self._on_subscription)

    def bind(self, device: "Device") -> None:
        self._device = device

    def set_mtu(self, mtu: int) -> None:
        self._mtu = max(mtu, MIN_MTU)

    def _log_apdu(self, direction: str, data: bytes, tag: str = "") -> None:
        entry = ApduLogEntry(
            timestamp=time.monotonic(),
            direction=direction,
            data=data,
            tag=tag,
        )
        self._apdu_log.append(entry)
        if len(self._apdu_log) > self._apdu_log_size:
            self._apdu_log.pop(0)

    @property
    def apdu_log(self) -> list[ApduLogEntry]:
        return list(self._apdu_log)

    @property
    def connection(self) -> Connection | None:
        return self._connection

    def _on_subscription(
        self,
        connection: "Connection",
        notify_enabled: bool,
        indicate_enabled: bool,
    ) -> None:
        logger.info(
            "Subscription changed: notify=%s indicate=%s conn=%s",
            notify_enabled,
            indicate_enabled,
            connection,
        )
        if notify_enabled:
            self._subscribed_connections.add(connection)
        else:
            self._subscribed_connections.discard(connection)

    async def _on_write(self, connection: "Connection", value: bytes) -> None:
        self._connection = connection

        try:
            if len(value) >= 1 and value[0] == MTU_PROBE_BYTE:
                logger.debug("MTU probe received: %s", value.hex())
                self._log_apdu("in", value, "mtu_probe")
                if self._on_mtu_probe:
                    await self._on_mtu_probe(connection, value)
                return

            self._log_apdu("in", value, "chunk")

            complete_apdu = self._reassembler.feed(value)
            if complete_apdu is None:
                return

            self._log_apdu("in", complete_apdu, "apdu_complete")
            logger.info("Complete APDU received (%d bytes)", len(complete_apdu))

            async with self._exchange_lock:
                # Track the in-flight exchange so reset() can cancel it
                # instead of orphaning the coroutine on a replaced lock.
                self._exchange_task = asyncio.current_task()
                try:
                    await self._run_apdu_exchange(connection, complete_apdu)
                finally:
                    self._exchange_task = None
        except asyncio.CancelledError:
            logger.info("In-flight APDU exchange cancelled (connection reset)")
            raise
        except Exception:
            logger.exception("GATT write handler error")

    async def _run_apdu_exchange(
        self, connection: "Connection", apdu: bytes,
    ) -> None:
        """Run one complete-APDU exchange and notify the response.

        On failure the reassembler is reset and the standard 0x6D00 error
        status word is notified to the peer instead of a real response.
        """
        try:
            response = await self._on_apdu(apdu)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("APDU exchange failed")
            self._reassembler.reset()
            await self._send_response(connection, DEFAULT_APDU_ERROR_RESPONSE)
            return

        if response:
            self._log_apdu("out", response, "apdu_response")
            await self._send_response(connection, response)

    async def _send_response(
        self, connection: "Connection", response: bytes,
    ) -> None:
        if self._device is None:
            raise RuntimeError(
                "No device bound to GATT server, cannot send notification"
            )

        chunks = fragment_apdu(response, self._mtu)
        logger.debug(
            "Sending response (%d bytes) in %d chunk(s)",
            len(response),
            len(chunks),
        )

        send_error: Exception | None = None
        for i, chunk in enumerate(chunks):
            self.notify_char.value = chunk
            try:
                await self._device.notify_subscriber(connection, self.notify_char)
            except Exception as e:
                logger.error(
                    "Failed to send notification chunk %d/%d: %s",
                    i + 1,
                    len(chunks),
                    e,
                )
                send_error = e
                break

        if send_error is not None:
            # The response was NOT delivered (or only partially); record
            # the failure and propagate so the caller doesn't treat the
            # exchange as successful.
            self._log_apdu("out", response, "apdu_response_failed")
            raise send_error

        self._log_apdu("out", response, "apdu_response_sent")

    async def send_notification(self, data: bytes) -> None:
        if self._device is None or not self._subscribed_connections:
            return
        chunks = fragment_apdu(data, self._mtu)
        for chunk in chunks:
            self.notify_char.value = chunk
            await self._device.notify_subscribers(self.notify_char)

    async def send_notification_to(self, connection: Connection, data: bytes) -> None:
        if self._device is None:
            return
        chunks = fragment_apdu(data, self._mtu)
        for chunk in chunks:
            self.notify_char.value = chunk
            await self._device.notify_subscriber(connection, self.notify_char)

    async def send_raw_notification(
        self, connection: Connection, data: bytes,
    ) -> None:
        if self._device is None:
            return
        self.notify_char.value = data
        await self._device.notify_subscriber(connection, self.notify_char)

    def reset(self) -> None:
        """Reset per-connection state.

        The exchange lock is intentionally NOT replaced: a coroutine
        holding it during an in-flight exchange would be orphaned by a
        swap. Instead, the in-flight exchange task (if any) is cancelled,
        which releases the single lock and lets queued writers proceed.
        """
        self._reassembler.reset()
        self._connection = None
        self._subscribed_connections.clear()
        task = self._exchange_task
        if task is not None and not task.done():
            logger.info("Cancelling in-flight APDU exchange on reset")
            task.cancel()
