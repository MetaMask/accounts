"""Shared test fixtures and mocks."""
from __future__ import annotations

import sys
import types
from unittest.mock import MagicMock

import pytest


def _make_bumble_mock() -> types.ModuleType:
    bumble = types.ModuleType("bumble")
    gatt = types.ModuleType("bumble.gatt")
    device = types.ModuleType("bumble.device")

    _Props = type("Properties", (), {"WRITE": 2, "WRITE_WITHOUT_RESPONSE": 4, "READ": 1, "NOTIFY": 16})
    _Access = type("Access", (), {"WRITEABLE": 2, "READABLE": 1})

    class _CharacteristicValue:
        def __init__(self, **kw):
            self._cb = kw.get("write")

    class _Characteristic:
        Properties = _Props
        WRITEABLE = _Access.WRITEABLE
        READABLE = _Access.READABLE

        def __init__(self, uuid, props, access, value=None, **kw):
            self.uuid = uuid
            self.properties = props
            self.access = access
            self.value = value
            self._handlers = {}

        def on(self, event, handler):
            self._handlers[event] = handler

    class _Service:
        def __init__(self, uuid, chars=None, **kw):
            self.uuid = uuid
            self.characteristics = chars or []

    gatt.Characteristic = _Characteristic
    gatt.CharacteristicValue = _CharacteristicValue
    gatt.Service = _Service
    bumble.gatt = gatt

    # Minimal bumble.device stubs so speculos_ble.device can be imported
    # (VirtualLedgerDevice subclasses Device.Listener / Connection.Listener).
    class _Device:
        class Listener:
            pass

        @staticmethod
        def with_hci(**kwargs):
            return _Device()

    class _Connection:
        class Listener:
            pass

    device.Device = _Device
    device.Connection = _Connection
    bumble.device = device

    # Remaining submodules imported by speculos_ble.device (only used at
    # runtime in start(); stubs suffice for import + unit tests).
    data_types = types.ModuleType("bumble.data_types")
    core = types.ModuleType("bumble.core")
    hci = types.ModuleType("bumble.hci")
    pairing = types.ModuleType("bumble.pairing")
    transport = types.ModuleType("bumble.transport")

    core.AdvertisingData = lambda *entries: b""
    core.UUID = lambda value: value
    hci.Address = type("Address", (), {"__init__": lambda self, value: None})
    pairing.PairingConfig = type("PairingConfig", (), {})
    pairing.PairingDelegate = type(
        "PairingDelegate", (), {"IoCapability": type("IoCapability", (), {"NO_OUTPUT_NO_INPUT": 0})}
    )
    transport.open_transport = lambda *args, **kwargs: None

    bumble.data_types = data_types
    bumble.core = core
    bumble.hci = hci
    bumble.pairing = pairing
    bumble.transport = transport

    return bumble


bumble_mock = _make_bumble_mock()
sys.modules.setdefault("bumble", bumble_mock)
sys.modules.setdefault("bumble.gatt", bumble_mock.gatt)
sys.modules.setdefault("bumble.device", bumble_mock.device)
sys.modules.setdefault("bumble.data_types", bumble_mock.data_types)
sys.modules.setdefault("bumble.core", bumble_mock.core)
sys.modules.setdefault("bumble.hci", bumble_mock.hci)
sys.modules.setdefault("bumble.pairing", bumble_mock.pairing)
sys.modules.setdefault("bumble.transport", bumble_mock.transport)
