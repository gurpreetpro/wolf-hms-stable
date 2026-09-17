import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * login-mixed.js — k6 Staggered Login & Authenticated Query Test
 * 
 * Part of Wolf HMS Phase 4 Hardening (W4).
 * Concurrency: 25 Virtual Users (VU) staggered
 * Duration: Ramp to 25 VUs, hold 30s
 * Thresholds: p(95) < 500ms, error rate < 2%
 * Fail-Safe: Fails closed if K6_USER or K6_PASS are not provided.
 */

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5002';
const USERNAME = __ENV.K6_USER;
const PASSWORD = __ENV.K6_PASS;

if (!USERNAME || !PASSWORD) {
  throw new Error(
    '❌ [k6/login-mixed] Execution blocked: Environment variables K6_USER and K6_PASS are required.\n' +
    'Example usage:\n' +
    '  k6 run -e K6_USER=admin_taneja -e K6_PASS=Admin@123 loadtests/k6/login-mixed.js'
  );
}

export const options = {
  stages: [
    { duration: '10s', target: 25 },  // Staggered ramp-up to 25 VUs
    { duration: '30s', target: 25 },  // Hold concurrency at 25 VUs
    { duration: '5s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.02'],   // Error rate must be < 2%
  },
};

export default function () {
  const loginUrl = `${BASE_URL}/api/auth/login`;
  const loginPayload = JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
  });

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'k6-loadtest/wolf-hms'
  };

  // 1. Authenticate
  const loginRes = http.post(loginUrl, loginPayload, { headers, timeout: '10s' });
  
  let token = null;
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'token returned': (r) => {
      try {
        const data = JSON.parse(r.body);
        token = data.token || (data.data && data.data.token);
        return !!token;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginSuccess || !token) {
    sleep(1);
    return;
  }

  // 2. Perform Authenticated Fetch
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'User-Agent': 'k6-loadtest/wolf-hms'
  };

  const fetchRes = http.get(`${BASE_URL}/api/opd/queue`, { headers: authHeaders, timeout: '10s' });

  check(fetchRes, {
    'auth fetch status is 200': (r) => r.status === 200,
    'queue payload received': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || (body && typeof body === 'object');
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1 + Math.random()); // Jittered sleep between 1.0s and 2.0s
}
