"""Tests for VirtualLedgerDevice (stop idempotency, input validation)."""

from __future__ import annotations

import asyncio

import pytest

from speculos_ble.device import VirtualLedgerDevice
from speculos_ble.types import (
    MAX_BUTTON_PRESS_COUNT,
    ConnectionState,
    VirtualLedgerConfig,
    validate_button_press,
)


def _make_device() -> VirtualLedgerDevice:
    return VirtualLedgerDevice(VirtualLedgerConfig(transport="vhci"))


@pytest.mark.asyncio
async def test_stop_is_idempotent():
    """stop() may be called twice (signal handler + finally) safely."""
    device = _make_device()

    await device.stop()
    assert device.state == ConnectionState.IDLE

    # Second call is a no-op and must not raise or re-run teardown.
    await device.stop()
    assert device.state == ConnectionState.IDLE


@pytest.mark.asyncio
async def test_stop_is_idempotent_under_concurrency():
    """Concurrent stop() calls do not interleave teardown."""
    device = _make_device()

    await asyncio.gather(device.stop(), device.stop())
    assert device.state == ConnectionState.IDLE


@pytest.mark.parametrize("button,count", [("left", 1), ("right", 5), ("both", MAX_BUTTON_PRESS_COUNT)])
def test_validate_button_press_accepts_valid(button, count):
    validate_button_press(button, count)  # does not raise


@pytest.mark.parametrize(
    "button,count",
    [
        ("middle", 1),
        ("", 1),
        (None, 1),
        (3, 1),
        ("right", 0),
        ("right", -1),
        ("right", MAX_BUTTON_PRESS_COUNT + 1),
        ("right", "3"),
        ("right", 3.5),
        ("right", True),
    ],
)
def test_validate_button_press_rejects_invalid(button, count):
    with pytest.raises(ValueError):
        validate_button_press(button, count)
