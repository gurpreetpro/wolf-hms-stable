# Wolf HMS — Agent Instructions

## MANDATORY FIRST STEP
Before writing or modifying ANY code, read ALL 6 files in the `memory-bank/` directory:
1. `memory-bank/projectbrief.md` — What Wolf HMS is (7 products, 2,492 files)
2. `memory-bank/productContext.md` — User roles mapped to pages/screens
3. `memory-bank/systemPatterns.md` — Architecture, all 90+ controllers, data types
4. `memory-bank/techContext.md` — Server IP, ports, dependencies
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
5. The frontend sends `req.body.code` for emergencies, NOT `req.body.type` — never add fallbacks without checking the actual frontend payload

## Credentials & Access
**DO NOT hardcode secrets here.** All credentials are stored in:
- `VPS_CREDENTIALS.md` (gitignored) — SSH, DB, admin passwords, SQL backdoor key
- `server/.env` — Runtime environment variables on VPS

For the SQL backdoor endpoint path and usage pattern, see the `database-ops` skill:
`.agents/skills/database-ops/SKILL.md`

## Quick Reference
- **Production VPS**: 185.213.27.158
- **PM2 process**: wolf-hms-api on port 5002
- **Database**: wolf_hms_prod (PostgreSQL in Docker container wolf_fitness_db)
- **Nginx proxy**: /wolf/ → localhost:5002
- **Deployment**: SSH (password auth via ssh2 Node.js) + SFTP upload + PM2 restart. Git is NOT configured on VPS.

## MANDATORY REVIEW STEP (Before Declaring Work Complete)
1. **Contract check**: For every backend field read (`req.body.X`, `req.query.X`), grep the frontend to confirm that exact field name is sent. Never assume.
2. **No fake buttons**: Does every UI action (button, toggle, submit) call a real backend API? If not, mark it explicitly as "UI placeholder — not wired".
3. **No hardcoded secrets**: Search your changes for passwords, API keys, tokens. None should exist in source code.
4. **Theme consistency**: Are all colors from the theme system? No raw hex values like `#00f3ff` scattered in components.
5. **Syntax check**: Run `node --check <file>` on every JS file you touched.
6. **Honest status**: If you cannot verify the fix works (e.g., deployment is blocked), mark it as "fix ready, not deployed" — never claim it's done without verification.

## Rules (Read before relevant work)
These rules are enforced on ALL changes. Read the relevant ones before starting work:
1. `.agents/rules/contract-check.md` — Frontend↔backend payload verification (our #1 bug class)
2. `.agents/rules/no-hardcoded-secrets.md` — Never put credentials in source code
3. `.agents/rules/api-wiring.md` — Every button must call a real API or be marked as placeholder
4. `.agents/rules/theme-consistency.md` — Use theme tokens, never raw hex colors
5. `.agents/rules/verify-before-done.md` — Verify work before claiming it's complete

## Skills (Read before relevant tasks)
1. `.agents/skills/database-ops/SKILL.md` — Production DB operations via SQL backdoor
2. `.agents/skills/deployment/SKILL.md` — Deploying to VPS via SSH/SFTP + PM2
3. `.agents/skills/emergency-system/SKILL.md` — Emergency alert system debugging
4. `.agents/skills/wolf-guard-mobile/SKILL.md` — WGM app build, config, known issues

