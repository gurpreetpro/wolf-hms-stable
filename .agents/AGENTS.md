# Wolf HMS — Agent Instructions

## MANDATORY FIRST STEP
Before writing or modifying ANY code, read ALL 6 files in the `memory-bank/` directory:
1. `memory-bank/projectbrief.md` — What Wolf HMS is (7 products, 2,492 files)
2. `memory-bank/productContext.md` — User roles mapped to pages/screens
3. `memory-bank/systemPatterns.md` — Architecture, all 90+ controllers, data types
4. `memory-bank/techContext.md` — Server IP, ports, SQL backdoor, dependencies
5. `memory-bank/activeContext.md` — Current bugs, blockers, modified files
6. `memory-bank/progress.md` — What's done, what's pending, known bugs

## MANDATORY LAST STEP
After completing work, update these 2 files:
1. `memory-bank/activeContext.md` — Add what you changed, new bugs found, next steps
2. `memory-bank/progress.md` — Mark completed items, add new items

## Critical Rules
1. NEVER modify `server/server-cloud.js` without understanding its 66K-line structure
2. `patients.id` is UUID, `hospitals.id` is INTEGER, `users.id` is INTEGER — NEVER mix them
3. ALL database changes must go through migrations or the exec-sql backdoor
4. Frontend changes require `cd client && npm run build` then copy `dist/` to `server/public/`
5. VPS SSH is currently BROKEN — use SQL backdoor for production DB changes
6. The frontend sends `req.body.code` for emergencies, NOT `req.body.type` — never add fallbacks without checking the actual frontend payload

## SQL Backdoor (Production DB Access)
```
POST http://185.213.27.158/wolf/api/health/exec-sql
Body: { "setupKey": "WolfSetup2024!", "sql": "YOUR SQL HERE" }
```

## Quick Reference
- **Production VPS**: 185.213.27.158
- **PM2 process**: wolf-hms-api on port 5002
- **Admin login**: admin_user / Admin@123
- **Database**: wolf_hms_prod (PostgreSQL in Docker container wolf_fitness_db)
- **Nginx proxy**: /wolf/ → localhost:5002
