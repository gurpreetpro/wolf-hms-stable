---
name: deployment
description: Guide for deploying Wolf HMS updates to the production VPS (185.213.27.158) via SSH/SFTP
---

# Deployment Skill — Wolf HMS to VPS

## Current Reality
- **Git is NOT configured on VPS** — `git pull` fails, the directory is not a repo
- **Standard SSH from Windows fails** — use Node.js `ssh2` library with `tryKeyboard: true`
- **Deployment = SFTP upload + PM2 restart**

## Credentials Location
All credentials are in `VPS_CREDENTIALS.md` (gitignored, in project root).
Never hardcode them in scripts — read from VPS_CREDENTIALS.md or pass as arguments.

## Deployment Steps

### 1. Backend File Upload
Use the `ssh2` Node.js library (already installed):

```javascript
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        // Upload file to /var/www/wolf-hms/server/controllers/<path>
        sftp.fastPut(localPath, remotePath, callback);
    });
}).on('keyboard-interactive', (n,i,l,p,f) => {
    f(['<password from VPS_CREDENTIALS.md>']);
}).connect({
    host: '185.213.27.158', port: 22, username: 'root',
    password: '<from VPS_CREDENTIALS.md>',
    tryKeyboard: true, readyTimeout: 15000
});
```

### 2. PM2 Restart
After uploading, execute remotely:
```bash
pm2 restart wolf-hms-api
pm2 logs wolf-hms-api --lines 20 --nostream
```

### 3. If DB Container Is Down (after VPS reboot)
```bash
docker start wolf_fitness_db   # legacy name, hosts wolf_hms_prod
sleep 3
pm2 restart wolf-hms-api
```

### 4. Frontend Deployment
```bash
# Local: build the client
cd client && npm run build

# Upload entire dist/ to /var/www/wolf-hms/server/public/
# Use SFTP to upload the dist directory
```

## VPS Directory Structure
```
/var/www/wolf-hms/
├── server/
│   ├── server-cloud.js          # Main entry (66K lines — DO NOT modify casually)
│   ├── controllers/
│   │   └── security/
│   │       └── guardController.js
│   └── public/                  # Frontend build output
└── ...
```

## Quick DB Access (when SSH is unavailable)
Use the SQL backdoor endpoint — see `database-ops` skill for details.

## Verification After Deploy
1. Check PM2 status: `pm2 list` (should show `wolf-hms-api` as `online`)
2. Check logs for errors: `pm2 logs wolf-hms-api --lines 30 --nostream`
3. Hit health endpoint: `curl http://localhost:5002/api/health`
