/**
 * ecosystem.config.cjs — PM2 Production Cluster Configuration
 * 
 * Part of Wolf HMS Phase 4 Hardening (W2).
 * Runs the API server across all available CPU cores using Node.js cluster mode.
 * Paired with Redis Socket.IO adapter (W1) for seamless multi-core realtime fan-out.
 */

module.exports = {
  apps: [
    {
      name: 'wolf-hms-api',
      script: './server-cloud.js',
      cwd: '/var/www/wolf-hms/server',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5002
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8080
      },
      out_file: '/root/.pm2/logs/wolf-hms-api-out.log',
      error_file: '/root/.pm2/logs/wolf-hms-api-error.log',
      merge_logs: true,
      autorestart: true,
      watch: false
    }
  ]
};
