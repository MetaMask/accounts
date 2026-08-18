"""Tests for ControlApiServer REST endpoints."""

from __future__ import annotations

import asyncio

import pytest
import pytest_asyncio
from aiohttp.test_utils import TestClient, TestServer

from speculos_ble.control_api import (
    MAX_INJECTED_ERROR_SIZE,
    ControlApiServer,
)
from speculos_ble.types import (
    MAX_BUTTON_PRESS_COUNT,
    ConnectionState,
)


class FakeDevice:
    def __init__(self):
        self._state = ConnectionState.ADVERTISING
        self.apdu_bridge = self._FakeBridge()
        self.gatt_server = self._FakeGatt()
        self._button_presses = []
        self.signing_times_out = False
        self.last_signing_timeout = None

    @property
    def state(self):
        return self._state

    async def press_button(self, button, count=1):
        self._button_presses.append((button, count))

    async def take_screenshot(self):
        return b"\x89PNG\r\n\x1a\n" + b"\x00" * 100

    async def start_advertising(self):
        pass

    async def stop_advertising(self):
        pass

    async def disconnect_peer(self):
        pass

    async def wait_for_signing_and_approve(self, sequence, timeout=60.0):
        self.last_signing_timeout = timeout
        if self.signing_times_out:
            raise asyncio.TimeoutError()
        self._button_presses.extend(
            (step["button"], step.get("count", 1)) for step in sequence
        )

    class _FakeBridge:
        is_connected = True

        def __init__(self):
            self.injected = []

        def inject_error(self, response):
            self.injected.append(response)

    class _FakeGatt:
        connection = None
        apdu_log = []


@pytest_asyncio.fixture
async def api_server():
    fake_device = FakeDevice()
    server = ControlApiServer(device=fake_device, port=0)
    await server.start()
    yield server, fake_device
    await server.stop()


@pytest_asyncio.fixture
async def client(api_server):
    server, fake_device = api_server
    tc = TestClient(TestServer(server._app))
    await tc.start_server()
    tc._fake_device = fake_device
    yield tc
    await tc.close()


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status == 200
    body = await resp.json()
    assert body["status"] == "ready"
    assert "ble_state" in body
    assert body["speculos_connected"] is True


@pytest.mark.asyncio
async def test_button_press(client):
    resp = await client.post("/button/press", json={"button": "right", "count": 3})
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True
    assert ("right", 3) in client._fake_device._button_presses


@pytest.mark.asyncio
async def test_screenshot(client):
    resp = await client.get("/screenshot")
    assert resp.status == 200
    assert resp.content_type == "image/png"
    data = await resp.read()
    assert len(data) > 0


@pytest.mark.asyncio
async def test_ble_connection(client):
    resp = await client.get("/ble/connection")
    assert resp.status == 200
    body = await resp.json()
    assert "state" in body
    assert "has_connection" in body


@pytest.mark.asyncio
async def test_error_inject(client):
    resp = await client.post("/error/inject", json={"response": "6985"})
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True


@pytest.mark.asyncio
async def test_apdu_log(client):
    resp = await client.get("/debug/apdu-log")
    assert resp.status == 200
    body = await resp.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_signing_auto_approve(client):
    resp = await client.post(
        "/signing/auto-approve",
        json={
            "presses": [
                {"button": "right", "count": 2},
                {"button": "both", "count": 1},
            ],
        },
    )
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True
    assert ("right", 2) in client._fake_device._button_presses


@pytest.mark.asyncio
async def test_advertise_start(client):
    resp = await client.post("/ble/advertise/start")
    assert resp.status == 200


@pytest.mark.asyncio
async def test_advertise_stop(client):
    resp = await client.post("/ble/advertise/stop")
    assert resp.status == 200


@pytest.mark.asyncio
async def test_blind_signing_enable(client):
    resp = await client.post("/blind-signing/enable")
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True


@pytest.mark.asyncio
@pytest.mark.parametrize("button", ["left", "right", "both"])
async def test_button_press_valid_buttons(client, button):
    resp = await client.post("/button/press", json={"button": button})
    assert resp.status == 200
    assert (button, 1) in client._fake_device._button_presses


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "button", ["middle", "", "RIGHT", "up", None, 3],
)
async def test_button_press_invalid_button_returns_400(client, button):
    resp = await client.post("/button/press", json={"button": button})
    assert resp.status == 400
    body = await resp.json()
    assert body["ok"] is False
    assert "button" in body["error"]


@pytest.mark.asyncio
@pytest.mark.parametrize("count", [0, -1, MAX_BUTTON_PRESS_COUNT + 1, "3", 3.5, True])
async def test_button_press_invalid_count_returns_400(client, count):
    resp = await client.post("/button/press", json={"button": "right", "count": count})
    assert resp.status == 400
    body = await resp.json()
    assert body["ok"] is False
    assert "count" in body["error"]


@pytest.mark.asyncio
async def test_button_press_count_upper_bound_accepted(client):
    resp = await client.post(
        "/button/press", json={"button": "right", "count": MAX_BUTTON_PRESS_COUNT}
    )
    assert resp.status == 200
    assert ("right", MAX_BUTTON_PRESS_COUNT) in client._fake_device._button_presses


@pytest.mark.asyncio
async def test_button_press_malformed_json_returns_400(client):
    resp = await client.post(
        "/button/press", data=b"this is not json", headers={"Content-Type": "application/json"}
    )
    assert resp.status == 400


@pytest.mark.asyncio
@pytest.mark.parametrize("response_hex", ["6985", "6D00", "00" * MAX_INJECTED_ERROR_SIZE])
async def test_error_inject_valid_hex_accepted(client, response_hex):
    resp = await client.post("/error/inject", json={"response": response_hex})
    assert resp.status == 200
    assert bytes.fromhex(response_hex) in client._fake_device.apdu_bridge.injected


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response_hex", ["XYZ", "6E0", "", "6E 8", "00" * (MAX_INJECTED_ERROR_SIZE + 1), 1234],
)
async def test_error_inject_invalid_hex_returns_400(client, response_hex):
    resp = await client.post("/error/inject", json={"response": response_hex})
    assert resp.status == 400
    body = await resp.json()
    assert body["ok"] is False


@pytest.mark.asyncio
async def test_error_inject_empty_body_uses_default(client):
    resp = await client.post("/error/inject", json={})
    assert resp.status == 200
    assert bytes.fromhex("6D00") in client._fake_device.apdu_bridge.injected


@pytest.mark.asyncio
async def test_signing_auto_approve_timeout_returns_504(client):
    client._fake_device.signing_times_out = True
    resp = await client.post("/signing/auto-approve", json={"timeout": 5})
    assert resp.status == 504
    body = await resp.json()
    assert body["ok"] is False
    assert "not detected" in body["error"]


@pytest.mark.asyncio
@pytest.mark.parametrize("timeout", [-1, 0, "60", 301, None])
async def test_signing_auto_approve_invalid_timeout_returns_400(client, timeout):
    resp = await client.post("/signing/auto-approve", json={"timeout": timeout})
    assert resp.status == 400


@pytest.mark.asyncio
async def test_signing_auto_approve_timeout_forwarded(client):
    resp = await client.post("/signing/auto-approve", json={"timeout": 300})
    assert resp.status == 200
    assert client._fake_device.last_signing_timeout == 300


@pytest.mark.asyncio
async def test_signing_auto_approve_invalid_sequence_returns_400(client):
    resp = await client.post(
        "/signing/auto-approve",
        json={"presses": [{"button": "middle", "count": 1}]},
    )
    assert resp.status == 400


@pytest.mark.asyncio
async def test_signing_auto_approve_invalid_press_count_returns_400(client):
    resp = await client.post(
        "/signing/auto-approve",
        json={"presses": [{"button": "right", "count": 99}]},
    )
    assert resp.status == 400
