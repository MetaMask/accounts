"""Tests for Speculos TCP client framing."""

import asyncio
import struct
import pytest

from speculos_ble.speculos_client import (
    MAX_RESPONSE_SIZE,
    SpeculosProtocolError,
    SpeculosTcpClient,
)

# Start of the IANA ephemeral port range; the reconnect test binds a fixed
# port in that range so it can rebind the same port after closing the server.
EPHEMERAL_PORT_START = 49152


async def _start_echo_server(sw: bytes = b"\x90\x00"):
    """Start a TCP echo server that mirrors the Speculos protocol.

    Request:  [4-byte BE length] [raw APDU]
    Response: [4-byte BE length covering data only] [data] [2-byte SW]
    """

    async def handle_client(reader, writer):
        try:
            while True:
                length_data = await reader.readexactly(4)
                length = struct.unpack(">I", length_data)[0]
                apdu = await reader.readexactly(length)
                resp_frame = struct.pack(">I", len(apdu)) + apdu + sw
                writer.write(resp_frame)
                await writer.drain()
        except asyncio.IncompleteReadError:
            pass
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    return server, port


async def _start_oversize_server(declared_length: int):
    """Server that replies with an oversized declared response length."""

    async def handle_client(reader, writer):
        try:
            length_data = await reader.readexactly(4)
            length = struct.unpack(">I", length_data)[0]
            await reader.readexactly(length)
            writer.write(struct.pack(">I", declared_length))
            await writer.drain()
            # Wait for the client to give up and close the connection.
            await reader.read()
        except (asyncio.IncompleteReadError, ConnectionError):
            pass
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    return server, port


@pytest.mark.asyncio
async def test_exchange_simple_apdu():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        apdu = bytes([0xE0, 0x40, 0x00, 0x00, 0x00])
        response = await client.exchange(apdu)
        assert response == apdu + b"\x90\x00"
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_exchange_with_status_word():
    """The client returns data followed by the 2-byte status word."""
    server, port = await _start_echo_server(sw=b"\x6E\x00")

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        apdu = bytes([0xB0, 0x01, 0x00, 0x00, 0x00])
        response = await client.exchange(apdu)
        assert response == apdu + b"\x6E\x00"
        assert response[-2:] == b"\x6E\x00"
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_response_length_encoding():
    """The 4-byte length prefix covers the data only, not the SW."""
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        apdu = bytes([0x01, 0x02, 0x03, 0x04])
        response = await client.exchange(apdu)
        assert response == apdu + b"\x90\x00"
        assert len(response) == 6
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_auto_connect_on_exchange():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        assert not client.is_connected
        apdu = bytes([0xB0, 0x01, 0x00, 0x00, 0x00])
        response = await client.exchange(apdu)
        assert client.is_connected
        assert response == apdu + b"\x90\x00"
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_disconnect_and_reconnect():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        apdu = bytes([0x01])
        await client.connect()
        r1 = await client.exchange(apdu)
        await client.disconnect()
        assert not client.is_connected
        r2 = await client.exchange(apdu)
        assert client.is_connected
        assert r1 == r2 == apdu + b"\x90\x00"
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_exchange_reconnects_on_connection_drop():
    """When the TCP connection drops, the client reconnects and retries."""
    received_apdus = []

    async def echo_handler(reader, writer):
        try:
            while True:
                length_data = await reader.readexactly(4)
                length = struct.unpack(">I", length_data)[0]
                apdu = await reader.readexactly(length)
                received_apdus.append(apdu)
                response = struct.pack(">I", len(apdu)) + apdu + b"\x90\x00"
                writer.write(response)
                await writer.drain()
                writer.close()
                await writer.wait_closed()
                break
        except asyncio.IncompleteReadError:
            pass

    async def create_server(port):
        return await asyncio.start_server(echo_handler, "127.0.0.1", port)

    # Use a fixed port in the ephemeral range
    port = EPHEMERAL_PORT_START

    server1 = await create_server(port)
    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        apdu = bytes.fromhex("B001000000")

        response1 = await client.exchange(apdu)
        assert response1 == apdu + b"\x90\x00"

        server1.close()
        await server1.wait_closed()

        server2 = await create_server(port)

        response2 = await client.exchange(apdu)
        assert response2 == apdu + b"\x90\x00"

        assert len(received_apdus) == 2

        server2.close()
        await server2.wait_closed()
    finally:
        await client.disconnect()


@pytest.mark.asyncio
async def test_oversize_declared_length_rejected():
    """A declared response length above the 64 KiB cap raises a protocol error."""
    server, port = await _start_oversize_server(MAX_RESPONSE_SIZE + 1)

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        with pytest.raises(SpeculosProtocolError, match="exceeds the maximum"):
            await client.exchange(bytes([0xB0, 0x01, 0x00, 0x00, 0x00]))
        # The connection is torn down after a protocol error.
        assert not client.is_connected
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_max_response_size_accepted():
    """A declared response length exactly at the cap is accepted."""
    payload = bytes([0xAA]) * MAX_RESPONSE_SIZE

    async def handle_client(reader, writer):
        try:
            while True:
                length_data = await reader.readexactly(4)
                length = struct.unpack(">I", length_data)[0]
                await reader.readexactly(length)
                writer.write(
                    struct.pack(">I", len(payload)) + payload + b"\x90\x00"
                )
                await writer.drain()
        except asyncio.IncompleteReadError:
            pass
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        response = await client.exchange(bytes([0xB0, 0x01, 0x00, 0x00, 0x00]))
        assert response == payload + b"\x90\x00"
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()
