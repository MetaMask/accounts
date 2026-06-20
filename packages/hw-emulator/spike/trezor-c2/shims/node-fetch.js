// Shim for node-fetch in the browser bundle.
// node-fetch's CommonJS API: module.exports = fetch; .default = fetch.
// In a browser (incl. extension offscreen document) the global fetch is
// already the right thing — just re-export it in the shape node-fetch's
// callers expect.

if (typeof fetch !== 'function') {
  throw new Error('node-fetch shim loaded in an environment without a global fetch');
}

const f = (...args) => fetch(...args);
f.default = f;
f.fetch = f;
f.Request = Request;
f.Response = Response;
f.Headers = Headers;
module.exports = f;
