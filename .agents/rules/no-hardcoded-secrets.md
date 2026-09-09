# Rule: No Hardcoded Secrets

## Never commit credentials to source code

### What counts as a secret
- Passwords (SSH, DB, admin login)
- API keys (MapTiler, SQL backdoor setupKey, etc.)
- Tokens (JWT, session, OAuth)
- Connection strings with embedded passwords
- IP addresses paired with access credentials

### Where secrets should live
- **Runtime**: `server/.env` (on VPS, not in repo)
- **Agent reference**: `VPS_CREDENTIALS.md` (gitignored)
- **Never in**: `AGENTS.md`, `memory-bank/*.md`, `.clinerules`, any `.js/.jsx` source file

### What to do instead
- Reference the *location* of secrets: "see VPS_CREDENTIALS.md for the SQL backdoor key"
- Use environment variables: `process.env.DB_PASSWORD`
- For demo/dev defaults, use obviously fake values: `password: 'CHANGE_ME'`

### Known violations to fix
- `LoginScreen.js` had hardcoded `empId='101'`, `password='pass123'`
- `memory-bank/techContext.md` reprints the SQL backdoor key
- `.clinerules` contains the full SQL backdoor curl command
