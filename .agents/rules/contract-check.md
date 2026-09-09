# Rule: Contract Check — Frontend ↔ Backend Payload Verification

## The #1 recurring bug class in Wolf HMS

Before writing ANY backend field read (`req.body.X`, `req.query.X`, `req.params.X`), you MUST:

1. **Grep the frontend** to find the actual payload being sent
2. **Confirm the exact field name** matches what the backend expects
3. **Confirm the data type** (string vs number vs UUID vs integer)

### Why this rule exists

This project's biggest recurring bugs are frontend/backend payload mismatches:
- `req.body.type` vs `req.body.code` for emergencies — lived 3 months as a silent bug
- `gl.last_update` column mismatch in `pingAllGuards` — caused schema errors
- `status` column referenced in guardController but doesn't exist in users table — crashed production

### How to verify

```bash
# Before writing: req.body.code
grep -rn "code" client/src/components/security/ --include="*.jsx"

# Before writing: req.body.type  
grep -rn "type" client/src/components/emergency/ --include="*.jsx"

# Check what the frontend actually POSTs
grep -rn "api.post\|axios.post\|fetch" wgm/src/services/ --include="*.js"
```

### The rule in one sentence
> **Never add a backend field read or a fallback default without first confirming what the frontend actually sends.**
