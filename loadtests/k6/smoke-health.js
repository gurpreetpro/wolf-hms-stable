import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * smoke-health.js — k6 Smoke Load Test for Health & Readiness
 * 
 * Part of Wolf HMS Phase 4 Hardening (W4).
 * Concurrency: 50 Virtual Users (VU)
 * Duration: 30 seconds hold
 * Thresholds: p(95) < 300ms, error rate < 1%
 */

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5002';

export const options = {
  stages: [
    { duration: '5s', target: 50 },   // Ramp-up to 50 VUs
    { duration: '30s', target: 50 },  // Hold at 50 VUs
    { duration: '5s', target: 0 },    // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests must complete below 300ms
    http_req_failed: ['rate<0.01'],   // HTTP error rate must be < 1%
  },
};

export default function () {
  const url = `${BASE_URL}/api/health/ready`;
  const params = {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-loadtest/wolf-hms'
    },
    timeout: '5s',
  };

  const res = http.get(url, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'ready is true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ready === true;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.5 + Math.random() * 0.5); // 500ms - 1000ms jitter
}
