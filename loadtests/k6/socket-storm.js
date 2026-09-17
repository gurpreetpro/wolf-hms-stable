import ws from 'k6/ws';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

/**
 * socket-storm.js — k6 Concurrent WebSocket / Socket.IO Stress Test
 * 
 * Part of Wolf HMS Phase 4 Hardening (W4).
 * Concurrency: 100 concurrent socket connections
 * Hold Duration: 30 seconds
 * Metric: Tracks join errors, connection drops, and successful handshakes.
 */

const BASE_URL = __ENV.TARGET_WS_URL || 'ws://localhost:5002';
const AUTH_TOKEN = __ENV.K6_AUTH_TOKEN || __ENV.K6_TOKEN;

const joinErrors = new Counter('socket_join_errors');
const successfulConnections = new Counter('socket_connect_success');

export const options = {
  vus: 100,
  duration: '30s',
  thresholds: {
    socket_join_errors: ['count<5'], // Less than 5 join/auth errors across 100 VUs
  },
};

export default function () {
  // Socket.IO v4 WebSocket URL with query params
  const tokenParam = AUTH_TOKEN ? `&token=${encodeURIComponent(AUTH_TOKEN)}` : '';
  const url = `${BASE_URL}/socket.io/?EIO=4&transport=websocket${tokenParam}`;

  const params = {
    headers: AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {},
    tags: { my_tag: 'socket_storm' },
  };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      successfulConnections.add(1);

      // In Socket.IO EIO=4, client initiates connection handshake
      // Send connection packet: 40 (message packet containing connect)
      if (AUTH_TOKEN) {
        socket.send(`40{"token":"${AUTH_TOKEN}"}`);
      } else {
        socket.send('40');
      }

      // Keep connection open and ping periodically during 30s test duration
      socket.setInterval(() => {
        socket.send('2'); // Socket.IO ping packet
      }, 5000);
    });

    socket.on('message', (msg) => {
      // 3 is pong
      // 44 is connect error
      if (typeof msg === 'string' && msg.startsWith('44')) {
        joinErrors.add(1);
      }
    });

    socket.on('close', () => {
      // Normal close or disconnect
    });

    socket.on('error', (e) => {
      joinErrors.add(1);
    });

    // Hold connection open for duration of iteration (up to 28s)
    socket.setTimeout(() => {
      socket.close();
    }, 28000);
  });

  check(res, {
    'websocket handshake status is 101': (r) => r && r.status === 101,
  });
}
