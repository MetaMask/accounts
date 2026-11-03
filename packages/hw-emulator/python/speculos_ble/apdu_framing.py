"""APDU fragmentation and reassembly for Ledger BLE protocol.

Protocol:
  Write (phone → device): transport library chunks with headers
  Notify (device → phone): we chunk responses with headers

  Header format:
    Chunk 0: [TagId=0x05][chunk_idx:2B BE][total_len:2B BE][data...]
    Chunk N: [TagId=0x05][chunk_idx:2B BE][data...]
"""

from __future__ import annotations

import struct
from collections.abc import Iterator

from .types import BLE_TAG_ID, MIN_MTU

# The chunk-0 header encodes the total APDU length as a 16-bit BE field,
# so a framed APDU can never exceed 65535 bytes.
MAX_APDU_SIZE = 0xFFFF


def _chunk_overhead(index: int) -> int:
    return 5 if index == 0 else 3


def fragment_apdu(apdu: bytes, mtu: int) -> list[bytes]:
    if mtu < MIN_MTU:
        raise ValueError(f"MTU too small for Ledger framing: {mtu}")
    if len(apdu) > MAX_APDU_SIZE:
        raise ValueError(
            f"APDU too large for Ledger BLE framing: {len(apdu)} bytes "
            f"(max {MAX_APDU_SIZE})"
        )
    if not apdu:
        return []

    chunks: list[bytes] = []
    offset = 0
    index = 0

    while offset < len(apdu):
        overhead = _chunk_overhead(index)
        payload_size = min(mtu - overhead, len(apdu) - offset)
        payload = apdu[offset : offset + payload_size]

        if index == 0:
            header = struct.pack(">BHH", BLE_TAG_ID, index, len(apdu))
        else:
            header = struct.pack(">BH", BLE_TAG_ID, index)

        chunks.append(header + payload)
        offset += payload_size
        index += 1

    return chunks


class ApduReassembler:
    def __init__(self) -> None:
        self._buffer = bytearray()
        self._expected_total: int | None = None
        self._next_index: int = 0

    def reset(self) -> None:
        self._buffer.clear()
        self._expected_total = None
        self._next_index = 0

    def feed(self, frame: bytes) -> bytes | None:
        if len(frame) < 3:
            return None

        tag = frame[0]
        if tag != BLE_TAG_ID:
            return None

        chunk_index = struct.unpack_from(">H", frame, 1)[0]

        if chunk_index == 0:
            if len(frame) < 5:
                return None
            self._buffer.clear()
            self._expected_total = struct.unpack_from(">H", frame, 3)[0]
            if self._expected_total == 0:
                # A zero-length APDU is invalid; fragment_apdu() never
                # emits an empty sequence.
                self.reset()
                return None
            self._next_index = 0
            data_offset = 5
        else:
            if chunk_index != self._next_index:
                self.reset()
                return None
            data_offset = 3

        data = frame[data_offset:]
        self._buffer.extend(data)
        self._next_index = chunk_index + 1

        if self._expected_total is None:
            return None

        if len(self._buffer) > self._expected_total:
            # More data arrived than the chunk-0 header declared. Reject
            # explicitly instead of silently truncating.
            received = len(self._buffer)
            declared = self._expected_total
            self.reset()
            raise ValueError(
                f"APDU reassembly overflow: received {received} bytes but "
                f"chunk-0 header declared a total of {declared} bytes"
            )

        if len(self._buffer) == self._expected_total:
            result = bytes(self._buffer)
            self.reset()
            return result

        return None
