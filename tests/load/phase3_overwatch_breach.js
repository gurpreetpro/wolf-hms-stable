#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WOLF HMS — Phase 3: WOLF Guard Perimeter Breach Test
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests the AI Overwatch security layer deployed by DeepSeek V4 Pro:
 *
 * Scenario 1: Cross-Tenant Intrusion Probe
 *   → Authenticated as hospital_id:1, attempt to POST with hospital_id:2
 *   → Must receive HTTP 409 with WOLF_GUARD_CROSS_TENANT code
 *
 * Scenario 2: Hardware Blackout Simulation
 *   → Register a mock device, start monitoring, then starve it of pings
 *   → Must trigger ⚠️ HARDWARE DROPOUT console alert after 15s
 *
 * Usage: node tests/load/phase3_overwatch_breach.js
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const path = require('path');
const jwt = require(path.join(__dirname, '../../server/node_modules/jsonwebtoken'));
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET;
const LEGITIMATE_HOSPITAL_ID = 1;  // Our assigned tenant
const HOSTILE_HOSPITAL_ID = 2;     // The tenant we're trying to breach into

// ── Pretty Printing ─────────────────────────────────────────────────────────
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';
const MAG    = '\x1b[35m';

function banner(text) {
    console.log(`\n${CYAN}${'═'.repeat(72)}`);
    console.log(`  ${BOLD}${text}${RESET}`);
    console.log(`${CYAN}${'═'.repeat(72)}${RESET}\n`);
}

function result(label, status, elapsed, detail = '') {
    const icon = status >= 200 && status < 300 ? `${GREEN}✅` :
                 status === 409 ? `${MAG}🛡️` :
                 status >= 400 && status < 500 ? `${YELLOW}⚠️` :
                 status >= 500 ? `${RED}💥` : `${RED}❌`;
    console.log(`  ${icon} ${RESET}${label}: ${BOLD}HTTP ${status}${RESET} ${DIM}(${elapsed}ms)${RESET} ${detail}`);
}

// ── Forge JWT for Hospital 1 ────────────────────────────────────────────────
function forgeToken(hospitalId = LEGITIMATE_HOSPITAL_ID) {
    return jwt.sign({
        id: 1, userId: 1,
        username: 'redteam_intruder',
        email: 'intruder@wolf-hms.dev',
        role: 'admin',
        hospital_id: hospitalId,
        hospitalId: hospitalId,
        is_active: true
    }, JWT_SECRET);
}

const LEGIT_TOKEN = forgeToken(LEGITIMATE_HOSPITAL_ID);

// ── HTTP Helper ─────────────────────────────────────────────────────────────
async function api(method, endpoint, body = null, headerHospitalId = LEGITIMATE_HOSPITAL_ID) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-hospital-id': String(headerHospitalId),
            'Authorization': `Bearer ${LEGIT_TOKEN}`
        }
    };
    if (body) opts.body = JSON.stringify(body);

    const start = performance.now();
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, opts);
        const elapsed = (performance.now() - start).toFixed(1);
        let data;
        try { data = await res.json(); } catch { data = null; }
        return { status: res.status, elapsed, data, error: null };
    } catch (err) {
        return { status: 0, elapsed: 0, data: null, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 1: Cross-Tenant Intrusion Probe
// ═══════════════════════════════════════════════════════════════════════════
async function scenario1_crossTenantIntrusion() {
    banner('SCENARIO 1: Cross-Tenant Intrusion Probe');
    console.log(`  ${DIM}JWT is locked to hospital_id: ${LEGITIMATE_HOSPITAL_ID}`);
    console.log(`  Attempting to inject hospital_id: ${HOSTILE_HOSPITAL_ID} into request body...${RESET}\n`);

    // ── Attack Vector A: Body injection on ICU Fluid I/O ────────────────
    console.log(`  ${YELLOW}${BOLD}Attack A: POST /api/icu/fluid-io with hospital_id:${HOSTILE_HOSPITAL_ID} in body${RESET}`);
    const attackA = await api('POST', '/api/icu/fluid-io', {
        admission_id: 9999,
        hospital_id: HOSTILE_HOSPITAL_ID,  // ← HOSTILE INJECTION
        iv_fluids_ml: 500,
        blood_products_ml: 0,
        oral_intake_ml: 200,
        urine_output_ml: 150,
        drain_output_ml: 0,
        stool_output_ml: 0,
        emesis_ml: 0,
        notes: 'RED TEAM: Cross-tenant body injection via hospital_id field'
    });
    result('Attack A (body hospital_id)', attackA.status, attackA.elapsed,
        attackA.data?.code || attackA.data?.error || '');

    // ── Attack Vector B: Query param injection on ventilator logs ────────
    console.log(`\n  ${YELLOW}${BOLD}Attack B: GET /api/icu/ventilator-logs/1?hospital_id=${HOSTILE_HOSPITAL_ID}${RESET}`);
    const attackB = await api('GET', `/api/icu/ventilator-logs/1?hospital_id=${HOSTILE_HOSPITAL_ID}`);
    result('Attack B (query hospital_id)', attackB.status, attackB.elapsed,
        attackB.data?.code || attackB.data?.error || '');

    // ── Attack Vector C: Body hospitalId (camelCase variant) ────────────
    console.log(`\n  ${YELLOW}${BOLD}Attack C: POST /api/orthopedics/visits with hospitalId:${HOSTILE_HOSPITAL_ID} in body${RESET}`);
    const attackC = await api('POST', '/api/orthopedics/visits', {
        patient_id: '253c0386-51a8-4cbf-9617-643244bee1a0',
        hospitalId: HOSTILE_HOSPITAL_ID,  // ← camelCase variant
        affected_joint: 'Left Knee',
        affected_side: 'Left',
        injury_mechanism: 'RED TEAM cross-tenant attack via camelCase hospitalId',
        diagnosis: 'Intrusion test',
        treatment_plan: 'None'
    });
    result('Attack C (body hospitalId camelCase)', attackC.status, attackC.elapsed,
        attackC.data?.code || attackC.data?.error || '');

    // ── Sanity Check: Legitimate request (should still work) ────────────
    console.log(`\n  ${DIM}Sanity check: Legitimate POST to /api/icu/fluid-io with hospital_id:${LEGITIMATE_HOSPITAL_ID}${RESET}`);
    const legit = await api('POST', '/api/icu/fluid-io', {
        admission_id: 9999,
        iv_fluids_ml: 100,
        urine_output_ml: 80,
        notes: 'RED TEAM: Sanity check — legitimate request, no injection'
    });
    result('Sanity (legit request)', legit.status, legit.elapsed);

    // ── Analysis ────────────────────────────────────────────────────────
    console.log(`\n  ${BOLD}── Intrusion Detection Analysis ──${RESET}`);
    const attacks = [
        { name: 'A (body hospital_id)', r: attackA },
        { name: 'B (query hospital_id)', r: attackB },
        { name: 'C (body hospitalId)',   r: attackC }
    ];

    let blocked = 0;
    let leaked = 0;
    for (const a of attacks) {
        if (a.r.status === 409) {
            console.log(`  ${GREEN}🛡️ BLOCKED${RESET} — Attack ${a.name}: ${BOLD}409 Conflict${RESET} ${DIM}(${a.r.data?.code || ''})${RESET}`);
            blocked++;
        } else if (a.r.status === 201 || a.r.status === 200) {
            console.log(`  ${RED}💀 LEAKED${RESET} — Attack ${a.name}: ${BOLD}${a.r.status}${RESET} — data was served/written to wrong tenant!`);
            leaked++;
        } else {
            console.log(`  ${YELLOW}⚠️  UNEXPECTED${RESET} — Attack ${a.name}: ${BOLD}${a.r.status}${RESET}`);
        }
    }

    if (legit.status === 201) {
        console.log(`  ${GREEN}✅ SANITY${RESET} — Legitimate request still works: ${BOLD}201${RESET}`);
    } else {
        console.log(`  ${RED}❌ SANITY FAIL${RESET} — Legitimate request blocked: ${BOLD}${legit.status}${RESET}`);
    }

    console.log(`\n  ${BOLD}Result: ${blocked}/3 attacks blocked, ${leaked}/3 leaked${RESET}`);
    if (blocked === 3 && legit.status === 201) {
        console.log(`  ${GREEN}${BOLD}VERDICT: PASS — WOLF Guard perimeter is airtight${RESET}`);
    } else if (leaked > 0) {
        console.log(`  ${RED}${BOLD}VERDICT: FAIL — ${leaked} cross-tenant breaches detected!${RESET}`);
    } else {
        console.log(`  ${YELLOW}${BOLD}VERDICT: PARTIAL — Some attacks returned unexpected codes${RESET}`);
    }

    return { blocked, leaked, sanitPassed: legit.status === 201 };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 2: Hardware Blackout Simulation
// ═══════════════════════════════════════════════════════════════════════════
async function scenario2_hardwareBlackout() {
    banner('SCENARIO 2: Hardware Blackout Simulation');
    console.log(`  ${DIM}Registering mock device "Lab-Analyzer-01" and starving it of pings.`);
    console.log(`  The DeviceHeartbeatMonitor should fire a HARDWARE DROPOUT after 15s.${RESET}\n`);

    // Import the DeviceHeartbeatMonitor directly from the service
    const { DeviceHeartbeatMonitor } = require(
        path.join(__dirname, '../../server/services/ClinicalSentinel')
    );

    const heartbeat = new DeviceHeartbeatMonitor();
    const DEVICE_ID = 'Lab-Analyzer-01';

    // Step 1: Register and ping the device
    console.log(`  ${DIM}Step 1: Registering device "${DEVICE_ID}" with initial ping...${RESET}`);
    heartbeat.pingDevice(DEVICE_ID);
    const status1 = heartbeat.getStatus();
    console.log(`  ${GREEN}✅${RESET} Device registered — online: ${status1[0]?.online}, lastPing: ${status1[0]?.lastPing}`);

    // Step 2: Start monitoring with 5-second sweep
    console.log(`  ${DIM}Step 2: Starting heartbeat monitor (5s sweep interval)...${RESET}`);
    heartbeat.startMonitoring(5000);
    console.log(`  ${GREEN}✅${RESET} Monitor started — sweeping every 5s, dropout threshold: 15s`);

    // Step 3: Wait 18 seconds WITHOUT pinging — intentional starvation
    console.log(`\n  ${YELLOW}${BOLD}Step 3: STARVING device of pings for 18 seconds...${RESET}`);
    console.log(`  ${DIM}  (Expecting HARDWARE DROPOUT alert after ~15s silence)${RESET}`);
    console.log(`  ${DIM}  Waiting...${RESET}\n`);

    // Capture console.error output to detect the alert
    const originalError = console.error;
    let dropoutDetected = false;
    let dropoutMessage = '';
    
    console.error = function (...args) {
        const msg = args.join(' ');
        if (msg.includes('HARDWARE DROPOUT')) {
            dropoutDetected = true;
            dropoutMessage = msg;
        }
        originalError.apply(console, args);
    };

    await new Promise(resolve => setTimeout(resolve, 18000));

    // Restore console.error
    console.error = originalError;

    // Step 4: Check final status
    const status2 = heartbeat.getStatus();
    const device = status2.find(d => d.deviceId === DEVICE_ID);

    console.log(`  ${BOLD}── Hardware Blackout Analysis ──${RESET}`);
    console.log(`  Device: ${DEVICE_ID}`);
    console.log(`  Online: ${device?.online ? `${GREEN}true${RESET}` : `${RED}false${RESET}`}`);
    console.log(`  Silent for: ${BOLD}${(device?.silentSinceMs / 1000).toFixed(1)}s${RESET}`);

    if (dropoutDetected) {
        console.log(`\n  ${GREEN}${BOLD}🛡️ WOLF GUARD ALERT FIRED:${RESET}`);
        console.log(`  ${MAG}${dropoutMessage}${RESET}`);
        console.log(`\n  ${GREEN}${BOLD}VERDICT: PASS — Hardware dropout detected and alerted${RESET}`);
    } else {
        console.log(`\n  ${RED}${BOLD}VERDICT: FAIL — No HARDWARE DROPOUT alert was fired${RESET}`);
    }

    // Cleanup
    heartbeat.stopMonitoring();

    return { dropoutDetected, silentForSec: (device?.silentSinceMs / 1000).toFixed(1) };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
    console.log(`${MAG}${BOLD}`);
    console.log(`  ██╗    ██╗ ██████╗ ██╗     ███████╗`);
    console.log(`  ██║    ██║██╔═══██╗██║     ██╔════╝`);
    console.log(`  ██║ █╗ ██║██║   ██║██║     █████╗  `);
    console.log(`  ██║███╗██║██║   ██║██║     ██╔══╝  `);
    console.log(`  ╚███╔███╔╝╚██████╔╝███████╗██║     `);
    console.log(`   ╚══╝╚══╝  ╚═════╝ ╚══════╝╚═╝     `);
    console.log(`   ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ `);
    console.log(`  ██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗`);
    console.log(`  ██║  ███╗██║   ██║███████║██████╔╝██║  ██║`);
    console.log(`  ██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║`);
    console.log(`  ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝`);
    console.log(`   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ `);
    console.log(`${RESET}`);
    console.log(`  ${DIM}WOLF HMS — Phase 3: AI Overwatch Breach Test${RESET}`);
    console.log(`  ${DIM}Testing: Cross-Tenant Intrusion + Hardware Blackout${RESET}`);
    console.log(`  ${DIM}Target: ${BASE_URL}${RESET}`);

    const report = {};

    report.intrusion = await scenario1_crossTenantIntrusion();
    report.blackout = await scenario2_hardwareBlackout();

    // ── Final Report Card ───────────────────────────────────────────────
    banner('PHASE 3 FINAL REPORT CARD');

    console.log(`  ${BOLD}Scenario 1 — Cross-Tenant Intrusion:${RESET}`);
    if (report.intrusion.blocked === 3 && report.intrusion.sanitPassed) {
        console.log(`    ${GREEN}✅ PASS${RESET} — 3/3 attacks blocked with 409, legitimate traffic unaffected`);
    } else if (report.intrusion.leaked > 0) {
        console.log(`    ${RED}💀 FAIL${RESET} — ${report.intrusion.leaked}/3 breaches leaked through`);
    } else {
        console.log(`    ${YELLOW}⚠️  PARTIAL${RESET} — ${report.intrusion.blocked}/3 blocked`);
    }

    console.log(`\n  ${BOLD}Scenario 2 — Hardware Blackout:${RESET}`);
    if (report.blackout.dropoutDetected) {
        console.log(`    ${GREEN}✅ PASS${RESET} — HARDWARE DROPOUT fired after ${report.blackout.silentForSec}s silence`);
    } else {
        console.log(`    ${RED}💀 FAIL${RESET} — No dropout alert was triggered`);
    }

    console.log(`\n${CYAN}${'═'.repeat(72)}${RESET}\n`);
}

main().catch(err => {
    console.error(`${RED}Fatal error:${RESET}`, err);
    process.exit(1);
});
