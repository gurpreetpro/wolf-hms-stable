// Prisma Client — Graceful Fallback
// Some controllers use Prisma (charges, finance, consent, HCX).
// If @prisma/client is not installed or schema not generated, return a safe proxy.
let prisma;
try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    console.log('[Prisma] ✅ Client initialized');
} catch (e) {
    console.warn(`[Prisma] ⚠️ Not available: ${e.message}. Prisma-dependent features disabled.`);
    // Return a proxy that throws descriptive errors instead of crashing on startup
    const handler = {
        get(target, prop) {
            if (prop === '$connect' || prop === '$disconnect' || prop === '$on') {
                return () => Promise.resolve();
            }
            return new Proxy({}, {
                get(_, method) {
                    return () => {
                        throw new Error(`Prisma not configured. Install @prisma/client and run prisma generate to use ${prop}.${method}()`);
                    };
                }
            });
        }
    };
    prisma = new Proxy({}, handler);
}

module.exports = prisma;
