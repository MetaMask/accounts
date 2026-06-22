// THE zero-source-change intervention (the ONLY test-side intervention).
// In production this is a build/wiring-time HTML injection (like the
// Ledger navigator.hid mock), NOT a source change to trezor.ts.
//
// Also installs interceptors for iframe creation + window.open so we can
// diagnose init/getPublicKey hangs (offscreen console is invisible).

window.__TREZOR_CONNECT_SRC = 'http://localhost:8088/';

// SPIKE-ONLY DIAGNOSTIC: when true, offscreen.js adds popup:false to init().
// In production this global would NOT be set; the dual-variant driver
// toggles this by editing the file per-variant. The orchestrator decides
// whether to absorb popup:false into trezor.ts (1-line source change) or
// find another seam (none exists today — see README).
// window.__SPIKE_FORCE_POPUP_FALSE = true;

// Diagnostic: capture window.open calls (popup behavior)
window.__openCalls = [];
(function () {
  const origOpen = window.open;
  window.open = function (url, name, features) {
    window.__openCalls.push({ at: Date.now(), url: url && String(url).slice(0, 300), name, features });
    // Return a fake popup window so the SDK doesn't NPE; offscreen CANNOT
    // open real windows. The SDK's PopupManager will likely wait for a
    // 'popup-loaded' handshake message that never comes — that's the
    // expected PARTIAL-PASS failure mode we're trying to characterize.
    const fake = {
      closed: false, close() { this.closed = true; },
      postMessage() {}, focus() {}, location: { href: url || '' }, origin: '',
      onload: null,
    };
    return fake;
  };
})();


// Diagnostic: capture iframe creations
window.__iframeCreations = [];
(function () {
  const origCreate = document.createElement.bind(document);
  document.createElement = function (tag) {
    const el = origCreate(String(tag));
    if (String(tag).toLowerCase() === 'iframe') {
      const rec = { at: Date.now(), src: null };
      window.__iframeCreations.push(rec);
      // Capture src when set
      const origSetAttribute = el.setAttribute.bind(el);
      el.setAttribute = function (name, value) {
        if (name === 'src') rec.src = value;
        return origSetAttribute(name, value);
      };
      try {
        const origSrcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
        if (origSrcDesc && origSrcDesc.set) {
          Object.defineProperty(el, 'src', {
            get: function () { return origSrcDesc.get.call(this); },
            set: function (v) { rec.src = v; return origSrcDesc.set.call(this, v); },
            configurable: true,
          });
        }
      } catch (e) {
        rec.interceptError = String(e);
      }
    }
    return el;
  };
})();

// Diagnostic: capture window.message events (parent ↔ iframe traffic)
window.__messages = [];
window.__allEvents = []; // raw event capture (verbatim, capped)
window.addEventListener('message', (event) => {
  try {
    const data = event.data;
    const src = (event.origin || 'null');
    let summary;
    if (data && typeof data === 'object') {
      summary = { event: data.event, type: data.type, id: data.id, success: data.success, payloadType: data.payload && typeof data.payload };
      if (data.payload && typeof data.payload === 'object') {
        summary.payloadKeys = Object.keys(data.payload).slice(0, 5);
        if (data.payload.error) summary.payloadError = data.payload.error;
        if (data.payload.code) summary.payloadCode = data.payload.code;
      } else if (typeof data.payload === 'string') {
        summary.payloadSnippet = data.payload.slice(0, 120);
      }
    } else {
      summary = String(data).slice(0, 120);
    }
    window.__messages.push({ at: Date.now(), from: src, summary });
    if (window.__messages.length > 100) window.__messages.shift();

    // Also capture full event (verbatim) for diagnostics
    try {
      const raw = JSON.parse(JSON.stringify(data));
      window.__allEvents.push({ at: Date.now(), from: src, raw });
      if (window.__allEvents.length > 50) window.__allEvents.shift();
    } catch (e) {}
  } catch (e) {}
});

// BroadcastChannel intercept — iframe uses BC for some traffic
// (useBroadcastChannel:true in iframe-loaded payload).
(function () {
  if (typeof BroadcastChannel === 'undefined') return;
  ['trezor-connect', 'trezor-connect-channel'].forEach((name) => {
    try {
      const ch = new BroadcastChannel(name);
      ch.addEventListener('message', (event) => {
        try {
          const raw = JSON.parse(JSON.stringify(event.data));
          window.__allEvents.push({ at: Date.now(), from: `bc:${name}`, raw });
          if (window.__allEvents.length > 50) window.__allEvents.shift();
        } catch (e) {}
      });
    } catch (e) {}
  });
})();

// Chrome API access trace — capture what chrome.* the SDK tries to use
// (offscreen docs only have chrome.{runtime,loadTimes,csi}; access to
// chrome.tabs/windows/etc throws and is silently swallowed).
window.__chromeAccess = [];
(function () {
  // Wrap chrome in a Proxy that logs access to unknown props
  try {
    const realChrome = window.chrome;
    if (!realChrome) return;
    const known = new Set(['runtime', 'loadTimes', 'csi']);
    const loggedAccess = (prop) => {
      const val = realChrome[prop];
      if (val === undefined) {
        window.__chromeAccess.push({ at: Date.now(), prop, kind: 'undefined' });
      } else if (!known.has(prop)) {
        window.__chromeAccess.push({ at: Date.now(), prop, kind: 'defined-but-not-known', type: typeof val });
      }
    };
    // We can't replace window.chrome (read-only) but we can scan known
    // likely-to-be-used props and log them. Actually easier: monkey-patch
    // by wrapping the SDK's likely calls. For diagnostic, just record
    // after-the-fact.
    // Best approach: scan after init+getPublicKey for what was used.
    // (Can't proxy read-only window.chrome.)
  } catch (e) {}
})();

// Also intercept parent → iframe postMessage calls
(function () {
  const iframeEl = null; // resolved per-call
  const origPost = window.postMessage.bind(window);
  window.postMessage = function (message, targetOrigin, transfer) {
    try {
      const summary = (message && typeof message === 'object')
        ? { event: message.event, type: message.type, id: message.id }
        : String(message).slice(0, 120);
      window.__messages.push({ at: Date.now(), from: 'self(parent)', summary, direction: 'out' });
    } catch (e) {}
    return origPost(message, targetOrigin, transfer);
  };
})();
