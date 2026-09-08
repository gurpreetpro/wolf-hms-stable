# Tech Stack & Cloud Infrastructure

## Production Environment

### Cloud Server
- **VPS IP**: `185.213.27.158` (Ubuntu, Debian-based)
- **SSH**: `ssh -i coolify.pem root@185.213.27.158` ⚠️ KEY CURRENTLY REJECTED
- **Coolify**: Container orchestration panel (for deployment management)

### Process Management
- **PM2** running process `wolf-hms-api` on port `5002`
- Entry script: `server-cloud.js`
- Restart: `pm2 restart wolf-hms-api`
- Logs: `pm2 logs wolf-hms-api`

### Reverse Proxy
- **Nginx** routes `http://185.213.27.158/wolf/` → `localhost:5002`
- All API calls from frontend prefixed with `/wolf/api/`
- WebSocket upgrade supported for Socket.IO

### Database
- **PostgreSQL 15** in Docker container `wolf_fitness_db`
- Database name: `wolf_hms_prod`
- User: `wolf` | Password: `password`
- Connection: `postgresql://wolf:password@localhost:5432/wolf_hms_prod`
- Container OS: Alpine Linux (limited tooling)

### SQL Backdoor (Remote DB Operations)
```
POST http://185.213.27.158/wolf/api/health/exec-sql
Content-Type: application/json
Body: { "setupKey": "WolfSetup2024!", "sql": "YOUR SQL HERE" }
```
This is the primary way to perform production DB operations when SSH is down.

### Shell Commands via DB Container
```sql
COPY (SELECT 1) TO PROGRAM 'ls / > /tmp/output.txt 2>&1';
SELECT pg_read_file('/tmp/output.txt') as content;
```
Note: Container runs as `postgres` user (not root), `apk add` fails.

## Local Development Environment

### OS & Tools
- **Windows 11** (user: HP)
- **Workspace**: `C:\Users\HP\.gemini\antigravity\scratch\wolf-hms-stable`
- **IDE**: Google Antigravity IDE (VS Code fork)
- **Shell**: PowerShell

### Local Database
- PostgreSQL (local Docker or native install)
- Connection configured in `server/.env`

### Running Locally
```powershell
# Backend
cd server
node server.js                    # Local dev server

# Frontend (dev mode with HMR)
cd client
npm run dev                       # Vite dev server

# Frontend (production build)
cd client
npm run build                     # Output to client/dist/
# Copy dist/ contents to server/public/ for production
```

### Mobile Apps
```powershell
# Wolf Care (Patient app)
cd wolf-care-app
npx expo start                    # Expo dev server

# Wolf Guard Mobile (Security app)
cd wgm
npx expo start

# Wolf Ultimate (Staff super-app)
cd wolf-ultimate
npx expo start
```

## Full Tech Stack

### Backend Dependencies
| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `pg` (node-postgres) | PostgreSQL driver (raw SQL queries) |
| `socket.io` | Real-time bidirectional events |
| `jsonwebtoken` | JWT authentication |
| `bcrypt` / `bcryptjs` | Password hashing |
| `multer` | File upload handling |
| `pdfmake` / `pdf-lib` | PDF generation (prescriptions, invoices, reports) |
| `xlsx` / `exceljs` | Excel export |
| `nodemailer` | Email sending |
| `twilio` | SMS sending |
| `sharp` | Image processing |
| `crypto` | Encryption utilities |
| `cron` / `node-cron` | Scheduled tasks |
| `winston` | Logging |
| `helmet` | Security headers |
| `cors` | Cross-origin support |
| `compression` | Response compression |
| `express-rate-limit` | Rate limiting |
| `ioredis` | Redis client (caching) |
| `@google/generative-ai` | Gemini AI integration |

### Frontend Dependencies
| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `vite` | Build tool / dev server |
| `antd` (Ant Design) | Component library |
| `react-router-dom` | Client-side routing |
| `axios` | HTTP client |
| `socket.io-client` | Real-time events |
| `recharts` | Charts/graphs |
| `@ant-design/icons` | Icon set |
| `dayjs` / `moment` | Date handling |
| `html2canvas` / `jspdf` | Client-side PDF generation |

### Mobile Dependencies (Common across apps)
| Package | Purpose |
|---------|---------|
| `expo` | React Native framework |
| `expo-router` | File-based routing (Wolf Care) |
| `react-navigation` | Stack/tab navigation (WGM, Ultimate) |
| `expo-camera` | Camera/barcode scanning |
| `expo-location` | GPS tracking |
| `expo-sensors` | Accelerometer, gyroscope |
| `expo-secure-store` | Encrypted storage |
| `expo-notifications` | Push notifications |

## Authentication
- **Web**: JWT Bearer token in `Authorization` header
- **Admin Login**: `admin_user` / `Admin@123`
- **Patient App**: OTP-based authentication
- **Token Storage**: localStorage (web), SecureStore (mobile)

## Known Infrastructure Constraints
1. SSH key (`coolify.pem`) rejected by VPS — cannot SCP files
2. GitHub token expired — `git push` fails
3. No CI/CD pipeline exists
4. No staging environment — production is the only deployment
5. Redis optional — falls back to in-memory caching
6. No automated test suite in production use
7. Database container runs Alpine with limited tools
