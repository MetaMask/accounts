// Static file server for the connect-web iframe assets on http://localhost:8088/.
//
// The offscreen document (chrome-extension:// origin) loads the iframe from
// this URL via __TREZOR_CONNECT_SRC. The iframe needs to be served with
// permissive CORS so the chrome-extension:// parent can embed it AND so the
// iframe can postMessage back to the parent. The iframe's own fetches to the
// bridge go to http://127.0.0.1:21328 (transport-bridge) — same address
// space, same loopback — and the iframe's Origin becomes http://localhost:8088
// (NOT chrome-extension://) which IS on transport-bridge's whitelist.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'connect-web-assets');
const PORT = Number(process.argv[2] || 8088);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.map': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT) || urlPath === '/') {
    filePath = path.join(ROOT, 'iframe.html');
  }
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${urlPath}`);
      console.log(`${req.method} ${urlPath} -> 404`);
      return;
    }
    const ct = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': ct,
      // Permissive CORS so the chrome-extension:// parent can fetch/embed
      // AND so any XHR from the iframe to this origin succeeds. The
      // iframe itself uses postMessage (no CORS) for parent comms.
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
    console.log(`${req.method} ${urlPath} -> 200 (${st.size}b)`);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`connect-web-assets serving on http://127.0.0.1:${PORT}/ (root: ${ROOT})`);
});
