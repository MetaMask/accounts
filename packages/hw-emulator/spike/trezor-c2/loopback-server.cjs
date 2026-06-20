// Tiny loopback HTTP server for the Part 1 PNA test.
//
// PNA is keyed on address space (loopback), not port — so a synthetic
// server on 127.0.0.1:21325 returning {} answers the gating question
// (can chrome-extension:// fetch loopback at all?) just as well as the
// real trezord-go would. We pick 21325 specifically to match the task
// spec's canonical trezord port.
//
// Permissive CORS so that CORS doesn't masquerade as a PNA failure
// (the gating question is *only* about PNA, not CORS). Real trezord-go
// doesn't send CORS headers — that's a separate, orthogonal question
// the orchestrator must verify separately against production.
//
// Usage:  node loopback-server.cjs [port]

const http = require('node:http');

const PORT = Number(process.argv[2] || 21325);

const server = http.createServer((req, res) => {
  // Echo the request so the test can confirm the request actually landed.
  const body = JSON.stringify({
    ok: true,
    method: req.method,
    url: req.url,
    origin: req.headers.origin || null,
    server: 'c2-spike-loopback',
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Cache-Control': 'no-store',
  });
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`loopback-server listening on http://127.0.0.1:${PORT}`);
});

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
