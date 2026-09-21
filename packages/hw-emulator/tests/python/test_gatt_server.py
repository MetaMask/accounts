"""Tests for LedgerGattServer."""
from __future__ import annotations

import asyncio
import struct

import pytest

from speculos_ble.gatt_server import LedgerGattServer
from speculos_ble.types import BLE_TAG_ID, MTU_PROBE_BYTE


def _chunk0(total: int, data: bytes) -> bytes:
    return struct.pack(">BHH", BLE_TAG_ID, 0, total) + data


def _chunkn(idx: int, data: bytes) -> bytes:
    return struct.pack(">BH", BLE_TAG_ID, idx) + data


@pytest.mark.asyncio
async def test_mtu_probe_calls_callback():
    received_probes = []

    async def on_mtu_probe(connection, value):
        received_probes.append((connection, value))

    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu, on_mtu_probe=on_mtu_probe)
    probe_value = bytes([MTU_PROBE_BYTE, 0x00, 0x00, 0x00, 0x00, 0x17, 0x00])
    mock_connection = object()
    await server._on_write(mock_connection, probe_value)
    assert len(received_probes) == 1
    assert received_probes[0][1] == probe_value


@pytest.mark.asyncio
async def test_mtu_probe_does_not_call_on_apdu():
    called_apdu = []

    async def on_apdu(apdu):
        called_apdu.append(apdu)
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    probe_value = bytes([MTU_PROBE_BYTE, 0x00, 0x00, 0x00, 0x00, 0x17, 0x00])
    await server._on_write(object(), probe_value)
    assert len(called_apdu) == 0


@pytest.mark.asyncio
async def test_single_chunk_apdu():
    complete_apdus = []

    async def on_apdu(apdu):
        complete_apdus.append(apdu)
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    apdu_data = b"\xB0\x01\x00\x00\x00"
    chunk = _chunk0(total=len(apdu_data), data=apdu_data)
    await server._on_write(object(), chunk)
    assert len(complete_apdus) == 1
    assert complete_apdus[0] == apdu_data


@pytest.mark.asyncio
async def test_two_chunk_apdu():
    complete_apdus = []

    async def on_apdu(apdu):
        complete_apdus.append(apdu)
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    data0 = bytes(range(20))
    data1 = bytes(range(20, 40))
    total_len = len(data0) + len(data1)
    await server._on_write(object(), _chunk0(total_len, data0))
    assert len(complete_apdus) == 0
    await server._on_write(object(), _chunkn(1, data1))
    assert len(complete_apdus) == 1
    assert len(complete_apdus[0]) == total_len


@pytest.mark.asyncio
async def test_on_apdu_exception_sends_error():
    """When on_apdu raises, server sends 0x6D00 and doesn't crash."""

    async def failing_on_apdu(apdu):
        raise RuntimeError("Speculos connection lost")

    server = LedgerGattServer(on_apdu=failing_on_apdu)
    chunk = _chunk0(total=5, data=b"\xB0\x01\x00\x00\x00")
    await server._on_write(object(), chunk)


@pytest.mark.asyncio
async def test_reset_clears_reassembler():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    data0 = bytes(range(20))
    data1 = bytes(range(20, 40))
    await server._on_write(object(), _chunk0(len(data0) + len(data1), data0))
    server.reset()

    complete_count = []
    original_on_apdu = server._on_apdu

    async def counting_on_apdu(apdu):
        complete_count.append(1)
        return b"\x90\x00"

    server._on_apdu = counting_on_apdu
    await server._on_write(object(), _chunkn(1, bytes(range(20, 40))))
    assert len(complete_count) == 0


@pytest.mark.asyncio
async def test_apdu_log_records_chunks_and_complete():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    apdu_data = b"\xB0\x01\x00\x00\x00"
    chunk = _chunk0(total=len(apdu_data), data=apdu_data)
    await server._on_write(object(), chunk)
    log = server.apdu_log
    tags = [e.tag for e in log]
    assert "chunk" in tags
    assert "apdu_complete" in tags


@pytest.mark.asyncio
async def test_apdu_log_size_limit():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu, apdu_log_size=3)
    for i in range(5):
        chunk = _chunk0(total=1, data=bytes([i]))
        await server._on_write(object(), chunk)
    assert len(server.apdu_log) <= 3


@pytest.mark.asyncio
async def test_send_notification_no_subscribers():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    await server.send_notification(b"\x90\x00")


@pytest.mark.asyncio
async def test_send_notification_to_no_device():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    await server.send_notification_to(object(), b"\x90\x00")


@pytest.mark.asyncio
async def test_subscription_tracking():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)

    conn1 = object()
    conn2 = object()

    server._on_subscription(conn1, notify_enabled=True, indicate_enabled=False)
    assert conn1 in server._subscribed_connections

    server._on_subscription(conn2, notify_enabled=True, indicate_enabled=False)
    assert conn2 in server._subscribed_connections
    assert len(server._subscribed_connections) == 2

    server._on_subscription(conn1, notify_enabled=False, indicate_enabled=False)
    assert conn1 not in server._subscribed_connections
    assert conn2 in server._subscribed_connections

    server.reset()
    assert len(server._subscribed_connections) == 0


@pytest.mark.asyncio
async def test_exchange_lock_serializes_apdus():
    call_order = []

    async def slow_on_apdu(apdu):
        call_order.append(f"start-{apdu[0]}")
        await asyncio.sleep(0.1)
        call_order.append(f"end-{apdu[0]}")
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=slow_on_apdu)

    chunk1 = _chunk0(total=1, data=bytes([0x01]))
    chunk2 = _chunk0(total=1, data=bytes([0x02]))

    await asyncio.gather(
        server._on_write(object(), chunk1),
        server._on_write(object(), chunk2),
    )

    assert call_order[0].startswith("start-")
    assert call_order[1].startswith("end-")
    assert call_order[2].startswith("start-")
    assert call_order[3].startswith("end-")


def test_reset_keeps_same_exchange_lock():
    """reset() must not replace the lock a coroutine may still hold."""

    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    lock_before = server._exchange_lock
    server.reset()
    assert server._exchange_lock is lock_before


@pytest.mark.asyncio
async def test_reset_cancels_inflight_exchange():
    """An exchange in flight when reset() is called gets cancelled."""
    exchange_started = asyncio.Event()

    async def slow_on_apdu(apdu):
        exchange_started.set()
        await asyncio.sleep(30)
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=slow_on_apdu)

    task = asyncio.ensure_future(
        server._on_write(object(), _chunk0(total=1, data=bytes([0x01])))
    )
    await asyncio.wait_for(exchange_started.wait(), timeout=5)

    server.reset()

    with pytest.raises(asyncio.CancelledError):
        await task


@pytest.mark.asyncio
async def test_reset_lets_waiting_exchange_proceed():
    """A queued writer is not orphaned when reset() runs mid-exchange."""
    first_started = asyncio.Event()
    release_first = asyncio.Event()

    async def controlled_on_apdu(apdu):
        if apdu[0] == 0x01:
            first_started.set()
            await release_first.wait()
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=controlled_on_apdu)

    first = asyncio.ensure_future(
        server._on_write(object(), _chunk0(total=1, data=bytes([0x01])))
    )
    second = asyncio.ensure_future(
        server._on_write(object(), _chunk0(total=1, data=bytes([0x02])))
    )

    await asyncio.wait_for(first_started.wait(), timeout=5)
    server.reset()  # cancels the first (in-flight) exchange
    second_done, _ = await asyncio.wait({second}, timeout=5)
    assert second in second_done  # acquired the same, never-replaced lock

    release_first.set()
    with pytest.raises(asyncio.CancelledError):
        await first


class _OkDevice:
    def __init__(self):
        self.sent_chunks = []

    async def notify_subscriber(self, connection, characteristic):
        self.sent_chunks.append(characteristic.value)


class _FailingDevice:
    def __init__(self, fail_on_call=1):
        self.calls = 0
        self.fail_on_call = fail_on_call

    async def notify_subscriber(self, connection, characteristic):
        self.calls += 1
        if self.calls >= self.fail_on_call:
            raise RuntimeError("notify failed")


@pytest.mark.asyncio
async def test_send_response_success_logs_sent_after_delivery():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    device = _OkDevice()
    server.bind(device)

    response = bytes([0x30, 0x31, 0x32])
    await server._send_response(object(), response)

    tags = [e.tag for e in server.apdu_log]
    assert tags[-1] == "apdu_response_sent"
    assert b"".join(device.sent_chunks) == struct.pack(">BHH", 0x05, 0, 3) + response


@pytest.mark.asyncio
async def test_send_response_failure_propagates():
    """Notification failures are raised, not silently swallowed."""

    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    server.bind(_FailingDevice(fail_on_call=1))

    with pytest.raises(RuntimeError, match="notify failed"):
        await server._send_response(object(), b"\x90\x00")

    tags = [e.tag for e in server.apdu_log]
    assert tags[-1] == "apdu_response_failed"


@pytest.mark.asyncio
async def test_send_response_partial_chunk_failure_propagates():
    """A failure on a later chunk still surfaces the error."""

    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    device = _FailingDevice(fail_on_call=2)
    server.bind(device)

    # 30-byte response with MTU 23 → 2 chunks; second chunk fails.
    with pytest.raises(RuntimeError, match="notify failed"):
        await server._send_response(object(), bytes(range(30)))
    assert device.calls == 2


@pytest.mark.asyncio
async def test_send_response_without_device_raises():
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)

    with pytest.raises(RuntimeError, match="No device bound"):
        await server._send_response(object(), b"\x90\x00")
