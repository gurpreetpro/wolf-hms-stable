/**
 * 🐺 WOLF ECOSYSTEM - STRESS TEST SCRIPT
 * ==========================================
 * Stress tests patient registration & billing routes
 * with 30 concurrent users.
 * 
 * Connected Apps Impacted:
 * - Wolf Care (Patient Registration via OPD)
 * - Wolf Ultimate (Billing/RMO App)
 * - Wolf Runner (Delivery - no direct impact)
 * - Wolf Guard (Access - no direct impact)
 * 
 * Data Flow:
 * 1. Login as receptionist → get JWT token
 * 2. Register patient (OPD) with payment → creates patient, visit, invoice, payment
 * 3. Fetch pending billing items → validates billing queue
 * 4. Record payment → updates invoice status
 *
 * Reports exactly where the system breaks/passes.
 */

const http = require('http');
const https = require('https');

// ============================================
// CONFIGURATION
// ============================================
const BASE_URL = process.env.STRESS_TEST_URL || 'http://127.0.0.1:8080';
const CONCURRENT_USERS = 30;
const REQUESTS_PER_USER = 3; // login + register + billing check
const TIMEOUT_MS = 30000;

// Credentials for stress test login
const RECEPTION_CREDENTIALS = {
    username: 'admin_taneja',
    password: 'password123'
};

// Stats tracking
const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    timedOut: 0,
    byEndpoint: {},
    errors: {},
    startTime: null,
    endTime: null,
    dbConnectionFailures: 0,
    rateLimitHits: 0,
    duplicatePatientErrors: 0,
    authFailures: 0,
    serverErrors: 0,
    concurrentRequests: 0,
    maxConcurrent: 0,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function makeRequest(method, path, data = null, headers = {}, timeoutMs = TIMEOUT_MS) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-hospital-id': '1',
                ...headers,
            },
            timeout: timeoutMs,
        };

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                const duration = Date.now() - startTime;
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = { raw: body.substring(0, 200) };
                }
                resolve({
                    status: res.statusCode,
                    body: parsed,
                    duration,
                    success: res.statusCode >= 200 && res.statusCode < 500,
                });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 0, body: { error: 'TIMEOUT' }, duration: timeoutMs, success: false, timedOut: true });
        });

        req.on('error', (err) => {
            resolve({ status: 0, body: { error: err.message }, duration: Date.now() - startTime, success: false });
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function randomPhone() {
    return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

function randomName() {
    const firstNames = ['Raj', 'Simran', 'Amit', 'Priya', 'Vikram', 'Anjali', 'Rohit', 'Deepa', 'Sunil', 'Kavita',
        'Arjun', 'Neha', 'Manish', 'Pooja', 'Sanjay', 'Ritu', 'Vijay', 'Meera', 'Ajay', 'Shweta',
        'Ravi', 'Anita', 'Suresh', 'Nisha', 'Deepak', 'Rekha', 'Gaurav', 'Sneha', 'Nitin', 'Jyoti'];
    const lastNames = ['Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Joshi', 'Reddy', 'Nair', 'Das',
        'Mehta', 'Agarwal', 'Chopra', 'Malhotra', 'Saxena', 'Bhatia', 'Kapoor', 'Desai', 'Thakur', 'Pillai'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

// ============================================
// STRESS TEST SCENARIOS
// ============================================

/**
 * Step 1: Login as receptionist
 */
async function loginAsReceptionist() {
    const res = await makeRequest('POST', '/api/auth/login', RECEPTION_CREDENTIALS);
    if (res.status === 200 && res.body?.success) {
        // Extract token from the hybrid response format
        const token = res.body?.data?.token || res.body?.token;
        return {
            success: true,
            token: token,
            user: res.body?.data?.user || res.body?.user,
        };
    }
    return {
        success: false,
        error: `Login failed (${res.status}): ${JSON.stringify(res.body)}`,
        status: res.status,
    };
}

/**
 * Step 2: Register a patient with payment
 */
async function registerPatient(token) {
    const phone = randomPhone();
    const name = randomName();
    const payload = {
        name,
        phone,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        dob: new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)).toISOString().split('T')[0],
        complaint: 'Stress test registration - routine checkup',
        doctor_id: 2,
        paymentDetails: {
            amount: 500,
            mode: 'Cash',
            transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        },
    };

    const res = await makeRequest('POST', '/api/opd/register', payload, {
        'Authorization': `Bearer ${token}`,
    });

    return {
        success: res.success && (res.status === 200 || res.status === 201),
        status: res.status,
        patientId: res.body?.data?.patient?.id || res.body?.data?.visit?.patient_id,
        visitId: res.body?.data?.visit?.id,
        invoiceId: res.body?.data?.payment?.invoice_id,
        paymentId: res.body?.data?.payment?.id,
        body: res.body,
        duration: res.duration,
        error: !res.success ? JSON.stringify(res.body) : null,
        isDuplicate: res.body?.data?.isDuplicate || false,
    };
}

/**
 * Step 3: Check billing/pending charges
 */
async function checkBillingPending(token) {
    const res = await makeRequest('GET', '/api/billing/pending', null, {
        'Authorization': `Bearer ${token}`,
    });

    return {
        success: res.success,
        status: res.status,
        count: res.body?.data?.length || 0,
        body: res.body,
        duration: res.duration,
    };
}

/**
 * Step 4: Check patient's charges
 */
async function checkPatientCharges(token, patientId) {
    const res = await makeRequest('GET', `/api/charges/patient/${patientId}`, null, {
        'Authorization': `Bearer ${token}`,
    });

    return {
        success: res.success,
        status: res.status,
        body: res.body,
        duration: res.duration,
    };
}

// ============================================
// SINGLE USER WORKFLOW
// ============================================

async function runUserWorkflow(userId) {
    const userStats = {
        userId,
        steps: [],
        totalDuration: 0,
        passed: 0,
        failed: 0,
    };
    const startTime = Date.now();

    // Step 1: Login
    let stepStart = Date.now();
    const login = await loginAsReceptionist();
    let stepDuration = Date.now() - stepStart;

    userStats.steps.push({
        name: 'LOGIN',
        success: login.success,
        duration: stepDuration,
        error: login.error || null,
    });

    if (!login.success) {
        userStats.totalDuration = Date.now() - startTime;
        userStats.failed = userStats.steps.length;
        return userStats;
    }
    userStats.passed++;

    // Step 2: Register Patient
    stepStart = Date.now();
    const registration = await registerPatient(login.token);
    stepDuration = Date.now() - stepStart;

    userStats.steps.push({
        name: 'REGISTER_PATIENT',
        success: registration.success,
        duration: stepDuration,
        isDuplicate: registration.isDuplicate,
        patientId: registration.patientId,
        error: registration.error || null,
    });

    if (!registration.success) {
        userStats.totalDuration = Date.now() - startTime;
        userStats.failed = userStats.steps.filter(s => !s.success).length;
        return userStats;
    }
    userStats.passed++;

    // Step 3: Check Billing
    stepStart = Date.now();
    const billing = await checkBillingPending(login.token);
    stepDuration = Date.now() - stepStart;

    userStats.steps.push({
        name: 'BILLING_PENDING',
        success: billing.success,
        duration: stepDuration,
        count: billing.count,
        error: billing.error || null,
    });

    if (billing.success) userStats.passed++;
    else userStats.failed++;

    userStats.totalDuration = Date.now() - startTime;
    return userStats;
}

// ============================================
// CATEGORIZE ERRORS
// ============================================

function categorizeError(step) {
    const msg = (step.error || '').toLowerCase();
    const body = typeof step.error === 'object' ? JSON.stringify(step.error) : (step.error || '');

    if (body.includes('timeout')) return 'timeout';
    if (body.includes('too many requests') || body.includes('rate limit')) return 'rate_limited';
    if (body.includes('phone number') && body.includes('already registered')) return 'duplicate_patient';
    if (body.includes('unauthorized') || body.includes('token') || body.includes('not authorized') || body.includes('invalid')) return 'auth_error';
    if (body.includes('database') || body.includes('connection') || body.includes('pool') || body.includes('timeout')) return 'db_error';
    if (body.includes('internal server error') || body.includes('500')) return 'server_error';
    if (body.includes('duplicate') && body.includes('appointment')) return 'duplicate_visit';
    return 'other';
}

// ============================================
// MAIN STRESS TEST RUNNER
// ============================================

async function runStressTest() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     🐺 WOLF HMS - STRESS TEST SUITE                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Target:        ${BASE_URL.padEnd(46)}║`);
    console.log(`║  Users:         ${CONCURRENT_USERS.toString().padEnd(46)}║`);
    console.log(`║  Requests/User: ${REQUESTS_PER_USER.toString().padEnd(46)}║`);
    console.log(`║  Total Calls:   ${(CONCURRENT_USERS * REQUESTS_PER_USER).toString().padEnd(46)}║`);
    console.log(`║  Timeout:       ${TIMEOUT_MS}ms`.padEnd(57) + '║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    // Initial health check
    console.log('📡 [PRE-CHECK] Testing server connectivity...');
    const healthCheck = await makeRequest('GET', '/api/health');
    if (healthCheck.status >= 200 && healthCheck.status < 500) {
        console.log(`   ✅ Server responds (HTTP ${healthCheck.status} in ${healthCheck.duration}ms)`);
    } else {
        console.log(`   ❌ Server UNREACHABLE (${healthCheck.body?.error || healthCheck.status})`);
        console.log('\n⚠️  Make sure the Wolf HMS server is running on port 8080');
        console.log('   Start with: cd server && node server.js\n');
        return;
    }

    // Quick auth pre-check
    console.log('\n🔐 [PRE-CHECK] Verifying credentials...');
    const loginCheck = await loginAsReceptionist();
    if (loginCheck.success) {
        console.log(`   ✅ Login successful as ${RECEPTION_CREDENTIALS.username}`);
        console.log(`   🔑 JWT Token: ${loginCheck.token.substring(0, 30)}...`);
    } else {
        console.log(`   ❌ Login FAILED: ${loginCheck.error}`);
        console.log('   Attempting demo login fallback...');

        const demoRes = await makeRequest('POST', '/api/auth/demo-login');
        if (demoRes.status === 200 && demoRes.body?.token) {
            loginCheck.token = demoRes.body.token;
            loginCheck.success = true;
            console.log('   ✅ Demo login fallback successful');
        } else {
            console.log('   ❌ All login methods failed. Aborting.');
            return;
        }
    }

    console.log('\n🚀 [STRESS TEST] Launching concurrent users...\n');

    stats.startTime = Date.now();

    // Launch all concurrent users
    const userPromises = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        userPromises.push(runUserWorkflow(i + 1));
    }

    const results = await Promise.all(userPromises);
    stats.endTime = Date.now();
    stats.totalDuration = stats.endTime - stats.startTime;

    // ============================================
    // ANALYZE RESULTS
    // ============================================

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 RESULTS SUMMARY                       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    let totalSteps = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    const endpointStats = {};

    for (const user of results) {
        for (const step of user.steps) {
            totalSteps++;
            totalDuration += step.duration;
            if (step.success) totalPassed++;
            else totalFailed++;

            if (!endpointStats[step.name]) {
                endpointStats[step.name] = { passed: 0, failed: 0, durations: [], errors: {} };
            }
            endpointStats[step.name].durations.push(step.duration);
            if (step.success) endpointStats[step.name].passed++;
            else {
                endpointStats[step.name].failed++;
                const cat = categorizeError(step);
                endpointStats[step.name].errors[cat] = (endpointStats[step.name].errors[cat] || 0) + 1;

                // Track globally
                if (cat === 'duplicate_patient') stats.duplicatePatientErrors++;
                else if (cat === 'rate_limited') stats.rateLimitHits++;
                else if (cat === 'auth_error') stats.authFailures++;
                else if (cat === 'server_error') stats.serverErrors++;
                else if (cat === 'db_error') stats.dbConnectionFailures++;
                else if (cat === 'timeout') stats.timedOut++;
            }
        }
    }

    const overallSuccessRate = totalSteps > 0 ? ((totalPassed / totalSteps) * 100).toFixed(1) : 'N/A';

    console.log(`║  Total Requests: ${totalSteps.toString().padEnd(42)}║`);
    console.log(`║  Passed:         ${totalPassed.toString().padEnd(42)}║`);
    console.log(`║  Failed:         ${totalFailed.toString().padEnd(42)}║`);
    console.log(`║  Success Rate:   ${(overallSuccessRate + '%').padEnd(42)}║`);
    console.log(`║  Total Duration: ${(stats.totalDuration + 'ms').padEnd(42)}║`);
    console.log(`║  Avg Request:    ${(totalSteps > 0 ? Math.round(totalDuration / totalSteps) + 'ms' : 'N/A').padEnd(42)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ============================================
    // BREAKDOWN BY ENDPOINT
    // ============================================

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              📋 PER-ENDPOINT BREAKDOWN                      ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    for (const [name, ep] of Object.entries(endpointStats)) {
        const epTotal = ep.passed + ep.failed;
        const epRate = epTotal > 0 ? ((ep.passed / epTotal) * 100).toFixed(1) : 'N/A';
        const durations = ep.durations.sort((a, b) => a - b);
        const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
        const median = durations[Math.floor(durations.length / 2)];
        const min = durations[0] || 0;
        const max = durations[durations.length - 1] || 0;

        console.log(`║  ${name.padEnd(30)}  ║`);
        console.log(`║    Passed/Failed: ${ep.passed}/${ep.failed} (${epRate}%)`.padEnd(58) + '║');
        console.log(`║    Avg/Med/Min/Max: ${avg}ms / ${median}ms / ${min}ms / ${max}ms`.padEnd(58) + '║');

        if (Object.keys(ep.errors).length > 0) {
            const errStr = Object.entries(ep.errors)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ');
            console.log(`║    Errors: ${errStr}`.padEnd(58) + '║');
        }
        console.log('║' + '─'.repeat(56) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ============================================
    // ERROR BREAKDOWN
    // ============================================

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              🚨 ERROR CATEGORIZATION                       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    const errorCategories = {
        'Rate Limited (429)': stats.rateLimitHits,
        'Auth Failures (401/403)': stats.authFailures,
        'Duplicate Patient': stats.duplicatePatientErrors,
        'Server Errors (500)': stats.serverErrors,
        'DB Connection Failures': stats.dbConnectionFailures,
        'Timeouts': stats.timedOut,
    };

    let hasErrors = false;
    for (const [cat, count] of Object.entries(errorCategories)) {
        if (count > 0) {
            hasErrors = true;
            console.log(`║  ❌ ${cat.padEnd(35)} ${count.toString().padStart(15)} ║`);
        }
    }

    if (!hasErrors) {
        console.log(`║  ✅ NO ERRORS - System handled all ${totalSteps} requests`.padEnd(57) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ============================================
    // BREAKPOINT ANALYSIS
    // ============================================

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              🔍 BREAKPOINT ANALYSIS                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    // Check where most failures occur
    const failureByStep = {};
    for (const [name, ep] of Object.entries(endpointStats)) {
        if (ep.failed > 0) {
            failureByStep[name] = ep.failed;
        }
    }

    const sortedFailures = Object.entries(failureByStep).sort((a, b) => b[1] - a[1]);

    if (sortedFailures.length === 0) {
        console.log('║  ✅ ALL SYSTEMS NOMINAL'.padEnd(57) + '║');
        console.log(`║  No breaking points detected under ${CONCURRENT_USERS} concurrent users.`.padEnd(57) + '║');
    } else {
        console.log(`║  ⚠️  System breaks at these points (${CONCURRENT_USERS} concurrent users):`.padEnd(57) + '║');
        console.log('║' + '─'.repeat(56) + '║');

        for (const [step, count] of sortedFailures) {
            const stepLabel = {
                'LOGIN': 'Authentication Endpoint',
                'REGISTER_PATIENT': 'Patient Registration (/api/opd/register)',
                'BILLING_PENDING': 'Billing Queue (/api/billing/pending)',
            }[step] || step;

            const breakReason = endpointStats[step]?.errors || {};
            const mainError = Object.entries(breakReason)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} (${v}x)`)
                .join(', ');

            console.log(`║  🔴 ${stepLabel}`.padEnd(57) + '║');
            console.log(`║     Failures: ${count}/${CONCURRENT_USERS} users`.padEnd(57) + '║');
            console.log(`║     Cause: ${mainError}`.padEnd(57) + '║');
            console.log('║' + '─'.repeat(56) + '║');
        }
    }
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ============================================
    // PERFORMANCE METRICS
    // ============================================

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              ⏱️  PERFORMANCE METRICS                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    for (const [name, ep] of Object.entries(endpointStats)) {
        const durations = ep.durations.sort((a, b) => a - b);
        const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
        const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
        const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
        const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
        const max = durations[durations.length - 1] || 0;

        const perfRating = p95 < 500 ? '✅ FAST' : p95 < 2000 ? '⚠️ MODERATE' : '🔴 SLOW';

        const label = {
            'LOGIN': 'POST /api/auth/login',
            'REGISTER_PATIENT': 'POST /api/opd/register',
            'BILLING_PENDING': 'GET /api/billing/pending',
        }[name] || name;

        console.log(`║  ${label}`.padEnd(57) + '║');
        console.log(`║     Rating: ${perfRating}`.padEnd(57) + '║');
        console.log(`║     Avg: ${avg}ms  |  P50: ${p50}ms  |  P95: ${p95}ms  |  P99: ${p99}ms  |  Max: ${max}ms`.padEnd(57) + '║');
        console.log('║' + '─'.repeat(56) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ============================================
    // FINAL VERDICT
    // ============================================

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    🏁 FINAL VERDICT                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    const failRate = totalSteps > 0 ? (totalFailed / totalSteps) * 100 : 0;
    const criticalFailures = stats.serverErrors + stats.dbConnectionFailures + stats.timedOut;

    if (failRate === 0) {
        console.log('║  ✅ PASS: System handles 30 concurrent users flawlessly.'.padEnd(57) + '║');
        console.log('║  No regressions or breaking points detected.'.padEnd(57) + '║');
    } else if (failRate < 10 && criticalFailures === 0) {
        console.log('║  ⚠️  PASS WITH MINOR ISSUES:'.padEnd(57) + '║');
        console.log('║  System handles load but has minor errors (duplicate detection, etc.)'.padEnd(57) + '║');
        console.log(`║  These are expected race conditions with ${CONCURRENT_USERS}+ users.`.padEnd(57) + '║');
    } else if (criticalFailures > 0) {
        console.log('║  🔴 FAIL: System BREAKS under concurrent load!'.padEnd(57) + '║');
        if (stats.dbConnectionFailures > 0) {
            console.log('║  ├─ DB CONNECTION POOL EXHAUSTED'.padEnd(57) + '║');
            console.log('║  │  Fix: Increase pool size in server/config/dbPools.js'.padEnd(57) + '║');
        }
        if (stats.rateLimitHits > 0) {
            console.log('║  ├─ RATE LIMITING TRIGGERED'.padEnd(57) + '║');
            console.log('║  │  Fix: Increase rate limit max in server/server.js'.padEnd(57) + '║');
        }
        if (stats.serverErrors > 0) {
            console.log('║  ├─ SERVER 500 ERRORS'.padEnd(57) + '║');
            console.log('║  │  Fix: Check async error handling in controllers'.padEnd(57) + '║');
        }
        if (stats.timedOut > 0) {
            console.log('║  ├─ REQUEST TIMEOUTS'.padEnd(57) + '║');
            console.log('║  │  Fix: Optimize slow queries, add connection pooling'.padEnd(57) + '║');
        }
        if (stats.authFailures > 0) {
            console.log('║  ├─ AUTH FAILURES'.padEnd(57) + '║');
            console.log('║  │  Fix: Check token expiry / concurrent login handling'.padEnd(57) + '║');
        }
    } else {
        console.log('║  ⚠️  PARTIAL FAIL: Some endpoints struggle under load.'.padEnd(57) + '║');
        for (const [step, count] of sortedFailures) {
            console.log(`║  ├─ ${step}: ${count}/${CONCURRENT_USERS} failures`.padEnd(57) + '║');
        }
    }
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ============================================
    // RAW RESULTS TABLE
    // ============================================

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              📄 RAW RESULTS PER USER                       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  User │ Login │ Register │ Billing │ Duration  │ Status   ║');
    console.log('║' + '─'.repeat(56) + '║');

    for (const user of results) {
        const loginStep = user.steps.find(s => s.name === 'LOGIN');
        const regStep = user.steps.find(s => s.name === 'REGISTER_PATIENT');
        const billStep = user.steps.find(s => s.name === 'BILLING_PENDING');

        const loginStatus = loginStep?.success ? '✅' : '❌';
        const regStatus = regStep?.success ? '✅' : '❌';
        const billStatus = billStep?.success ? '✅' : '❌';
        const status = user.failed === 0 ? '✅ PASS' : user.passed === 0 ? '❌ FAIL' : '⚠️ PART';

        console.log(`║  #${String(user.userId).padStart(2, '0')}  │  ${loginStatus}   │   ${regStatus}   │   ${billStatus}   │ ${String(user.totalDuration).padStart(5)}ms │ ${status}  ║`);
    }
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ============================================
    // RECOMMENDATIONS
    // ============================================

    if (totalFailed > 0) {
        console.log('\n📋 RECOMMENDATIONS:');
        console.log('───────────────────');

        if (stats.rateLimitHits > 0) {
            console.log('  🔧 Increase rate limit in server/server.js:');
            console.log('     Change `max: 500` to `max: 2000` in generalLimiter');
        }
        if (stats.dbConnectionFailures > 0 || stats.timedOut > 0) {
            console.log('  🔧 Optimize DB connection pool in server/config/dbPools.js:');
            console.log('     Increase max connections from default to 50');
            console.log('     Add connection timeout and retry logic');
        }
        if (stats.duplicatePatientErrors > 0) {
            console.log('  🔧 Race condition in OPD registration:');
            console.log('     The phone-number uniqueness check is not atomic under concurrent load.');
            console.log('     Add INSERT ... ON CONFLICT or use advisory locks.');
        }
        if (stats.serverErrors > 0) {
            console.log('  🔧 Check controllers for unhandled promise rejections:');
            console.log('     Some async operations may not be wrapped in try/catch.');
        }
    }

    console.log('\n✅ Stress test completed.');
    console.log(`   Timestamp: ${new Date().toISOString()}`);
}

// ============================================
// RUN IT
// ============================================

runStressTest().catch((err) => {
    console.error('💥 Stress test crashed:', err);
    process.exit(1);
});
