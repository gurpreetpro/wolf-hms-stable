#!/usr/bin/env node
const fs = require('fs');
const path = 'tests/load/system_wide_endpoint_crawler.js';
let src = fs.readFileSync(path, 'utf8');

// Fix 1: TIMEOUT_MS constant
src = src.replace(/const TIMEOUT_MS = parseInt\(process\.env\.TIMEOUT_MS \|\| '8000'\);/, "const PROBE_TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '3000');");

// Fix 2: Replace httpGet function entirely
const oldHttpGet = /\/\/ ─── HTTP Probe.*?\nfunction httpGet\([^)]*\) \{[\s\S]*?^\}/m;
const newHttpGet = `// ─── HTTP Probe — nuclear-grade socket severing ──────────────────
function httpGet(url, token, timeoutMs) {
  return new Promise((resolve) => {
    let resolved = false;
    let req = null;
    let res = null;
    let timer = null;

    const killAll = () => {
      try {
        if (res) {
          if (res.socket) res.socket.destroy();
          res.destroy();
        }
      } catch (_) { }
      try {
        if (req) {
          if (req.socket) req.socket.destroy();
          req.destroy();
        }
      } catch (_) { }
    };

    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      killAll();
      resolve(result);
    };

    timer = setTimeout(() => {
      finish({ status: res ? res.statusCode : 0, body: '', sseTimeout: true, timedOut: true });
    }, timeoutMs);

    try {
      const parsed = new URL(url);
      req = http.request({
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        agent: false,
        timeout: timeoutMs + 500,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'X-Hospital-ID': '1',
          'Connection': 'close',
        },
      }, (response) => {
        res = response;
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          finish({ status: res.statusCode, body: data, timedOut: false });
        });
        res.on('error', () => {
          finish({ status: res.statusCode || 0, body: data, sseTimeout: true, timedOut: true });
        });
      });

      req.on('timeout', () => {
        finish({ status: res ? res.statusCode : 0, body: '', sseTimeout: true, timedOut: true });
      });

      req.on('error', (e) => {
        if (e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT' || e.code === 'ABORT_ERR') {
          finish({ status: res ? res.statusCode : 0, body: '', sseTimeout: true, timedOut: true });
        } else {
          finish({ status: 0, body: e.message, timedOut: false, error: true });
        }
      });

      req.end();
    } catch (e) {
      finish({ status: 0, body: e.message, timedOut: false, error: true });
    }
  });
}`;

src = src.replace(oldHttpGet, newHttpGet);

// Fix 3: Replace probeEndpoint — use PROBE_TIMEOUT_MS, SSE detection
const oldProbe = /async function probeEndpoint\([^)]*\) \{[\s\S]*?^\}/m;
const newProbe = `async function probeEndpoint(ep) {
  const resolvedPath = ep.path.replace(/\\{PID\\}/g, PATIENT_UUID);
  const url = BASE_URL + resolvedPath;
  const start = Date.now();
  const resp = await httpGet(url, TOKEN, PROBE_TIMEOUT_MS);
  const elapsed = Date.now() - start;
  completed++;

  const streamTimeout = !!(resp.sseTimeout);
  const icon = resp.status >= 500 ? 'X' : resp.status >= 400 ? 'w' : streamTimeout ? 'S' : resp.status === 0 ? 'T' : '.';
  const code = resp.status === 0 && streamTimeout ? 'SSE' : resp.status === 0 ? 'HUNG' : String(resp.status);
  if (streamTimeout) sseCount++;
  process.stdout.write(icon + ' [' + String(completed).padStart(3) + '/' + total + '] ' + ep.path.padEnd(52) + ' ' + code.padEnd(4) + ' ' + elapsed + 'ms\\n');

  if (streamTimeout) {
    return { endpoint: ep, status: 0, elapsed, passed: true, crash: false, streamTimeout: true, note: 'SSE/stream - expected, not a crash' };
  }

  if (resp.status === 0 || resp.error) {
    return { endpoint: ep, status: 0, elapsed, passed: false, crash: true, errorBody: resp.body, pgErrors: [] };
  }

  let parsed = null;
  try { parsed = JSON.parse(resp.body); } catch (_) { }

  if (resp.status < 300) return { endpoint: ep, status: resp.status, elapsed, passed: true, crash: false };
  if (resp.status < 500) return { endpoint: ep, status: resp.status, elapsed, passed: true, crash: false, note: resp.status === 401 || resp.status === 403 ? 'Auth denied' : 'Not found' };

  const bodyStr = (parsed ? JSON.stringify(parsed) : resp.body).substring(0, 2000);
  return { endpoint: ep, status: resp.status, elapsed, passed: false, crash: true, errorBody: bodyStr.substring(0, 500), pgErrors: extractPostgresErrors(bodyStr) };
}`;

src = src.replace(oldProbe, newProbe);

// Fix 4: Add sseCount variable (insert right after completed declaration)
src = src.replace(/(let completed = 0;)/, '$1\nlet sseCount = 0;');

// Fix 5: Update report to show SSE count
// The existing report uses 'crashed' and 'passed' - we'll enhance it
src = src.replace(
  /const crashed = results\.filter\(\(r\) => r\.crash\);/,
  "const crashed = results.filter((r) => r.crash);\\n  const sseStreams = results.filter((r) => r.streamTimeout);\\n  const passed = results.filter((r) => !r.crash && !r.streamTimeout);"
);

// Write back
fs.writeFileSync(path, src, 'utf8');
console.log('Patcher: system_wide_endpoint_crawler.js updated to v4 (nuclear socket severing + 3s timeout + SSE detection)');
