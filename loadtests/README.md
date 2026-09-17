# ⚡ Wolf HMS Load Testing Suite (k6)

Part of **Wolf HMS Phase 4 Hardening (W4)**.  
This suite provides automated load and concurrency proofs for HTTP endpoints, authentication flows, and Socket.IO cluster connections.

---

## 🛠️ Prerequisites & Installation

[k6](https://k6.io/) is an open-source performance testing tool. Do not vendor k6 binaries in the repository.

### Install k6
- **macOS / Linux (Homebrew)**:
  ```bash
  brew install k6
  ```
- **Ubuntu / Debian VPS**:
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update
  sudo apt-get install k6
  ```
- **Windows (winget / choco)**:
  ```powershell
  winget install k6 --source winget
  # or
  choco install k6
  ```

---

## 🚀 Test Scripts & Execution

### 1. Readiness Smoke Test (`smoke-health.js`)
Measures throughput and latency against the cluster readiness endpoint `/api/health/ready`.
- **Workload**: 50 Virtual Users (VU), 30-second sustained hold.
- **Pass Criteria**: $p(95) < 300\text{ms}$, HTTP failure rate $< 1\%$.
- **Run command**:
  ```bash
  # Against local server
  k6 run loadtests/k6/smoke-health.js

  # Against production / custom target
  k6 run -e TARGET_URL=http://185.213.27.158/wolf loadtests/k6/smoke-health.js
  ```
- **Expected Output**:
  ```text
  ✓ status is 200
  ✓ ready is true

  checks.........................: 100.00% ✓ 2450 ✗ 0
  http_req_duration..............: avg=18.42ms min=4.11ms med=12.23ms max=112.5ms p(90)=28.4ms p(95)=42.1ms
  http_req_failed................: 0.00%   ✓ 0    ✗ 2450
  vus............................: 50      min=0  max=50
  ```

---

### 2. Staggered Login & Authenticated Query (`login-mixed.js`)
Tests bcrypt CPU overhead, JWT token generation, and authenticated queries under concurrent load.
- **Workload**: 25 Virtual Users (VU) staggered ramp, 30-second hold.
- **Fail-Safe**: Fails closed if `K6_USER` and `K6_PASS` are unset.
- **Pass Criteria**: $p(95) < 500\text{ms}$, failure rate $< 2\%$.
- **Run command**:
  ```bash
  k6 run -e K6_USER=admin_taneja -e K6_PASS=Admin@123 loadtests/k6/login-mixed.js

  # Target custom host
  k6 run -e TARGET_URL=http://185.213.27.158/wolf -e K6_USER=admin_taneja -e K6_PASS=Admin@123 loadtests/k6/login-mixed.js
  ```
- **Expected Output**:
  ```text
  ✓ login status is 200
  ✓ token returned
  ✓ auth fetch status is 200
  ✓ queue payload received

  http_req_duration..............: avg=64.8ms min=22.1ms p(95)=180.2ms
  http_req_failed................: 0.00%
  ```

---

### 3. Concurrent Socket Storm (`socket-storm.js`)
Validates horizontal Socket.IO clustering (Redis adapter) under high connection pressure without dropped sockets or handshake errors.
- **Workload**: 100 concurrent WebSocket connections, sustained for 30 seconds with periodic ping heartbeats.
- **Pass Criteria**: Less than 5 join/auth errors across all 100 concurrent sockets.
- **Run command**:
  ```bash
  # Generate a valid token first (or test without auth)
  k6 run -e TARGET_WS_URL=ws://localhost:5002 -e K6_AUTH_TOKEN="<JWT_TOKEN>" loadtests/k6/socket-storm.js
  ```
- **Expected Output**:
  ```text
  ✓ websocket handshake status is 101

  socket_connect_success.........: 100
  socket_join_errors.............: 0
  ```

---

## 📊 Summary of Thresholds & Guarantees

| Script | Metric | Condition | Goal |
|---|---|---|---|
| `smoke-health.js` | Latency $p(95)$ | $< 300\text{ms}$ | Rapid health probe execution under load |
| `smoke-health.js` | Error Rate | $< 1\%$ | Zero unhandled crashes in cluster |
| `login-mixed.js` | Latency $p(95)$ | $< 500\text{ms}$ | Bcrypt + DB query concurrency |
| `login-mixed.js` | Error Rate | $< 2\%$ | Token issuance stability |
| `socket-storm.js`| Join Errors | $< 5$ errors | Redis adapter connection integrity |
