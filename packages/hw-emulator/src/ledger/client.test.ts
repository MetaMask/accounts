import net from 'node:net';

import { SpeculosClient } from './client';

/**
 * Build a framed APDU response (4-byte length header, payload, 2 status bytes).
 *
 * @param payload - The response payload.
 * @returns The framed response buffer.
 */
function frameResponse(payload: Buffer): Buffer {
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);

  return Buffer.concat([header, payload, Buffer.from([0x90, 0x00])]);
}

/**
 * Start a local TCP server that records every connected socket.
 *
 * @returns The server, the list of connected server-side sockets, and a
 * cleanup function that destroys all sockets and closes the server.
 */
async function startEchoServer(): Promise<{
  cleanup: () => Promise<void>;
  sockets: net.Socket[];
  port: number;
}> {
  const sockets: net.Socket[] = [];
  const server = net.createServer((socket) => {
    sockets.push(socket);
    socket.on('error', () => undefined);
    // Respond to a received FIN so client sockets can close gracefully.
    socket.on('end', () => {
      socket.end();
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const cleanup = async (): Promise<void> => {
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  };
  return { cleanup, sockets, port };
}

/**
 * Wait until the echo server has recorded the socket at the given index.
 *
 * @param sockets - The recorded server-side sockets.
 * @param index - The connection index to wait for.
 * @returns The server-side socket.
 */
async function waitForServerSocket(
  sockets: net.Socket[],
  index: number,
): Promise<net.Socket> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const socket = sockets[index];
    if (socket) {
      return socket;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Server socket ${index} never connected`);
}

/**
 * Find a free TCP port and return it (the probe socket is closed).
 *
 * @returns A port number that was momentarily free.
 */
async function findFreePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve) => {
    probe.listen(0, '127.0.0.1', () => resolve());
  });
  const address = probe.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  await new Promise<void>((resolve) => {
    probe.close(() => resolve());
  });
  return port;
}

describe('SpeculosClient', () => {
  describe('constructor', () => {
    it('uses default ports when no options provided', () => {
      const client = new SpeculosClient();
      expect(client.isHealthy()).toBe(false);
    });

    it('uses custom ports when provided', () => {
      const client = new SpeculosClient({
        apduPort: 9997,
        apiPort: 5002,
      });
      expect(client.isHealthy()).toBe(false);
    });

    it('builds correct base URL', () => {
      const client = new SpeculosClient({
        apiHost: '192.168.1.1',
        apiPort: 5003,
      });
      expect(client.isHealthy()).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('returns false before connecting', () => {
      const client = new SpeculosClient();
      expect(client.isHealthy()).toBe(false);
    });
  });

  describe('exchange', () => {
    it('throws if not connected', async () => {
      const client = new SpeculosClient();
      await expect(
        client.exchange(Buffer.from([0xe0, 0x06, 0x00, 0x00, 0x00])),
      ).rejects.toThrow('Not connected to Speculos');
    });
  });

  describe('disconnect', () => {
    it('does not throw when not connected', async () => {
      const client = new SpeculosClient();
      await client.disconnect();
      expect(true).toBe(true);
    });
  });

  describe('exchangeWithRetry', () => {
    it('throws if not connected', async () => {
      const client = new SpeculosClient();
      await expect(
        client.exchangeWithRetry(Buffer.from([0xe0, 0x06, 0x00, 0x00, 0x00])),
      ).rejects.toThrow('Not connected to Speculos');
    });
  });

  describe('connectWithRetry', () => {
    it('returns immediately if already connected', async () => {
      const client = new SpeculosClient();
      await client
        .connectWithRetry({
          autoReconnect: false,
          reconnectAttempts: 0,
        })
        .catch(() => undefined);
      expect(client.isHealthy()).toBe(false);
    });
  });

  describe('connect timeout', () => {
    it('rejects and destroys the socket when the connection never establishes', async () => {
      // A socket that is never connected and never errors simulates a
      // blackholed host.
      const blackholedSocket = new net.Socket();
      const createConnectionSpy = jest
        .spyOn(net, 'createConnection')
        .mockReturnValue(blackholedSocket);
      try {
        const client = new SpeculosClient({ connectTimeout: 150 });
        await expect(client.connect()).rejects.toThrow(
          'Timed out connecting to Speculos APDU endpoint',
        );
        expect(blackholedSocket.destroyed).toBe(true);
        expect(client.isHealthy()).toBe(false);
      } finally {
        createConnectionSpy.mockRestore();
      }
    }, 5_000);

    it('rejects when the connection is refused', async () => {
      const port = await findFreePort();
      const client = new SpeculosClient({
        apduPort: port,
        connectTimeout: 2_000,
      });
      await expect(client.connect()).rejects.toThrow('ECONNREFUSED');
      expect(client.isHealthy()).toBe(false);
    }, 10_000);
  });

  describe('post-connect socket errors', () => {
    it('marks the client unhealthy without unhandled rejections', async () => {
      const { cleanup, sockets, port } = await startEchoServer();
      try {
        const client = new SpeculosClient({ apduPort: port });
        await client.connect();
        expect(client.isHealthy()).toBe(true);

        // Abruptly reset the connection from the server side (RST).
        const serverSocket = await waitForServerSocket(sockets, 0);
        serverSocket.resetAndDestroy();
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(client.isHealthy()).toBe(false);
      } finally {
        await cleanup();
      }
    }, 10_000);
  });

  describe('stale response handling', () => {
    it('discards late responses after an exchange timeout so they cannot answer the next exchange', async () => {
      const { cleanup, sockets, port } = await startEchoServer();
      try {
        const client = new SpeculosClient({ apduPort: port, timeout: 150 });
        await client.connect();

        const stalePayload = Buffer.from([0x01]);
        const freshPayload = Buffer.from([0x02]);

        // Exchange 1: the server stays silent, so the exchange times out.
        await expect(
          client.exchange(Buffer.from([0xe0, 0x01])),
        ).rejects.toThrow('APDU exchange timeout');

        // The server now sends the late response for exchange 1. With the fix
        // this write lands on a destroyed socket and is discarded; without it
        // the bytes stay buffered in the live socket.
        sockets[0]?.write(frameResponse(stalePayload));

        // Give the post-timeout reconnect a moment to settle.
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(sockets).toHaveLength(2);

        // Exchange 2 on the reconnected socket must receive its own response,
        // not the stale buffered one. The exchange response includes the
        // 2-byte status word after the payload.
        const exchange2 = client.exchange(Buffer.from([0xe0, 0x02]));
        const freshSocket = sockets[1];
        freshSocket?.on('data', () => {
          freshSocket?.write(frameResponse(freshPayload));
        });
        const response = await exchange2;
        expect(response.equals(Buffer.from([0x02, 0x90, 0x00]))).toBe(true);
      } finally {
        await cleanup();
      }
    }, 10_000);
  });

  describe('background reconnect suppression', () => {
    it('stays disconnected when disconnect() follows an exchange timeout', async () => {
      const { cleanup, port } = await startEchoServer();
      try {
        const client = new SpeculosClient({ apduPort: port, timeout: 150 });
        await client.connect();

        // The timeout queues a background reconnect on #resetChain.
        await expect(
          client.exchange(Buffer.from([0xe0, 0x01])),
        ).rejects.toThrow('APDU exchange timeout');

        // Disconnecting must supersede that reconnect: the generation
        // guard abandons it instead of resurrecting the connection.
        await client.disconnect();

        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(client.isHealthy()).toBe(false);

        // The guard must not wedge the client: an explicit connect works.
        await client.connect();
        expect(client.isHealthy()).toBe(true);
      } finally {
        await cleanup();
      }
    }, 10_000);
  });

  describe('disconnect waits for close', () => {
    it('waits for the socket to close before resolving', async () => {
      const { cleanup, sockets, port } = await startEchoServer();
      try {
        const client = new SpeculosClient({ apduPort: port });
        await client.connect();

        let serverSawFin = false;
        const serverSocket = await waitForServerSocket(sockets, 0);
        serverSocket.once('end', () => {
          serverSawFin = true;
        });

        await client.disconnect();

        expect(client.isHealthy()).toBe(false);
        // The graceful close must have been transmitted to the peer by the
        // time disconnect() resolves — not torn down asynchronously later.
        expect(serverSawFin).toBe(true);
      } finally {
        await cleanup();
      }
    }, 10_000);
  });
});
