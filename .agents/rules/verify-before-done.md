# Rule: Verify Before Done

## Never claim work is complete without verification

### Verification levels (pick the highest one possible)

1. **Best: Run it locally**
   - Backend: `node --check server/controllers/<file>.js` (syntax), then start server and test endpoint
   - Frontend web: `cd client && npm run build` (catches import errors)
   - Mobile (WGM): `cd wgm && npx expo start` or build APK and test on device
   
2. **Good: Syntax check**
   - `node --check <file.js>` on every file you touched
   - Catches missing imports, syntax errors, unclosed brackets

3. **Minimum: Grep check**
   - Verify the function/endpoint you modified is actually called somewhere
   - Verify imports resolve to real files

### Status labels (use these honestly)
- ✅ **Verified locally** — ran the code, confirmed it works
- 🔨 **Fix ready, not deployed** — code is correct but not pushed to VPS
- ⚠️ **Untested** — code written but no verification done (must explain why)
- ❌ **Blocked** — cannot proceed (state the blocker)

### What NOT to do
- Don't say "deployed and working" if you only uploaded the file but didn't check logs
- Don't say "fixed" if you only changed the code but didn't verify the schema matches
- Don't skip the memory-bank update — it's part of the definition of done
