#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WOLF HMS — Phase 2: Clinical Reality Simulation (CHAOS ENGINEERING)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests LOGIC and CONCURRENCY CONFLICTS, not load.
 * 
 * Scenario 1: "Code Blue" Concurrency Collision
 *   → 10 simultaneous ICU fluid charts for the same patient
 *   → Tests PostgreSQL row-locking under millisecond-precision collisions
 * 
 * Scenario 2: Infection Control Paradox (Orthopedics)
 *   → Two procedures using the same sterile implant batch number
 *   → Tests whether the system enforces single-use implant integrity
 * 
 * Scenario 3: "Fat Finger" Odontogram Conflict (Dental)
 *   → Extract tooth #46 then immediately attempt root canal on same tooth
 *   → Tests whether business logic catches treating an extracted tooth
 * 
 * Usage: node tests/load/phase2_clinical_chaos.js
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const path = require('path');
const jwt = require(path.join(__dirname, '../../server/node_modules/jsonwebtoken'));
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET;
const HOSPITAL_ID = 1;

// Known patient UUIDs from the seeded database
const PATIENT_UUID_A = '253c0386-51a8-4cbf-9617-643244bee1a0'; // Ravi Patel
const PATIENT_UUID_B = 'a590639f-a91d-42e6-8642-709383899c3d'; // Ritu Gupta

// ── Forge JWT ───────────────────────────────────────────────────────────────
function forgeToken(role = 'admin') {
    return jwt.sign({
        id: 1, userId: 1,
        username: `chaos_${role}`,
        email: `chaos@wolf-hms.dev`,
        role: role,
        hospital_id: HOSPITAL_ID,
        hospitalId: HOSPITAL_ID,
        is_active: true
    }, JWT_SECRET); // No expiry — immortal test token
}

const ADMIN_TOKEN = forgeToken('admin');

// ── HTTP Helper (native fetch) ──────────────────────────────────────────────
async function api(method, endpoint, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-hospital-id': String(HOSPITAL_ID),
            'Authorization': `Bearer ${ADMIN_TOKEN}`
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

// ── Pretty Printing ─────────────────────────────────────────────────────────
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function banner(text) {
    console.log(`\n${CYAN}${'═'.repeat(72)}`);
    console.log(`  ${BOLD}${text}${RESET}`);
    console.log(`${CYAN}${'═'.repeat(72)}${RESET}\n`);
}

function result(label, status, elapsed, detail = '') {
    const icon = status >= 200 && status < 300 ? `${GREEN}✅` :
                 status >= 400 && status < 500 ? `${YELLOW}⚠️` :
                 status >= 500 ? `${RED}💥` : `${RED}❌`;
    console.log(`  ${icon} ${RESET}${label}: ${BOLD}HTTP ${status}${RESET} ${DIM}(${elapsed}ms)${RESET} ${detail}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 1: "Code Blue" Concurrency Collision
// ═══════════════════════════════════════════════════════════════════════════
async function scenario1_codeBlue() {
    banner('SCENARIO 1: "Code Blue" Concurrency Collision');
    console.log(`  ${DIM}Simulating 10 nurses charting ICU fluid I/O for the SAME patient`);
    console.log(`  at the exact same millisecond. Testing PG row-locking...${RESET}\n`);

    const ADMISSION_ID = 9999; // Shared target — all 10 hit this
    const CONCURRENT_COUNT = 10;

    // Build 10 unique charting payloads (different nurse signatures)
    const payloads = Array.from({ length: CONCURRENT_COUNT }, (_, i) => ({
        admission_id: ADMISSION_ID,
        iv_fluids_ml: 100 + (i * 50),      // 100, 150, 200, ... 550
        blood_products_ml: i * 25,
        oral_intake_ml: 50 + i,
        enteral_feeding_ml: 0,
        urine_output_ml: 80 + (i * 10),
        drain_output_ml: 15 + i,
        stool_output_ml: 0,
        emesis_ml: i % 3 === 0 ? 50 : 0,   // Every 3rd nurse logs emesis
        notes: `Nurse ${i + 1} Code Blue charting — concurrent collision test #${i + 1}`
    }));

    // Fire ALL 10 simultaneously
    const startTime = performance.now();
    const promises = payloads.map((p, i) =>
        api('POST', '/api/icu/fluid-io', p).then(r => ({ ...r, nurse: i + 1 }))
    );
    const results = await Promise.all(promises);
    const totalTime = (performance.now() - startTime).toFixed(1);

    // Analyze results
    let successes = 0;
    let failures = 0;
    const cumulativeBalances = [];

    for (const r of results) {
        const balanceInfo = r.data?.data?.cumulative_balance_ml
            ? `cumul_balance=${r.data.data.cumulative_balance_ml}mL`
            : '';
        result(`Nurse ${r.nurse}`, r.status, r.elapsed, balanceInfo);
        if (r.status === 201) {
            successes++;
            if (r.data?.data?.cumulative_balance_ml !== undefined) {
                cumulativeBalances.push(parseFloat(r.data.data.cumulative_balance_ml));
            }
        } else {
            failures++;
        }
    }

    // Verify: fetch all 10 rows back
    const verify = await api('GET', `/api/icu/fluid-io/${ADMISSION_ID}`);
    const insertedCount = verify.data?.data?.chart_count || 0;

    console.log(`\n  ${BOLD}── Concurrency Analysis ──${RESET}`);
    console.log(`  Total time for 10 simultaneous POSTs: ${BOLD}${totalTime}ms${RESET}`);
    console.log(`  INSERTs landed: ${successes === CONCURRENT_COUNT ? GREEN : RED}${successes}/${CONCURRENT_COUNT}${RESET}`);
    console.log(`  Failures:       ${failures === 0 ? GREEN : RED}${failures}${RESET}`);
    console.log(`  DB rows for admission ${ADMISSION_ID}: ${BOLD}${insertedCount}${RESET}`);

    // Check for cumulative balance integrity
    if (cumulativeBalances.length > 0) {
        const uniqueBalances = [...new Set(cumulativeBalances)];
        const hasDuplicates = uniqueBalances.length < cumulativeBalances.length;
        if (hasDuplicates) {
            console.log(`  ${YELLOW}⚠️  RACE CONDITION DETECTED: ${cumulativeBalances.length - uniqueBalances.length} duplicate cumulative balances!${RESET}`);
            console.log(`     Balances: [${cumulativeBalances.join(', ')}]`);
            console.log(`     ${DIM}This means multiple nurses read the same "previous balance" before`);
            console.log(`     any INSERT committed. No row was lost, but cumulative math diverged.${RESET}`);
        } else {
            console.log(`  ${GREEN}✅ No duplicate cumulative balances — serialization held${RESET}`);
        }
    }

    if (successes === CONCURRENT_COUNT && insertedCount >= CONCURRENT_COUNT) {
        console.log(`\n  ${GREEN}${BOLD}VERDICT: PASS — PG handled 10 simultaneous INSERTs with ZERO data loss${RESET}`);
    } else if (successes === CONCURRENT_COUNT) {
        console.log(`\n  ${YELLOW}${BOLD}VERDICT: PARTIAL — All INSERTs returned 201 but DB count mismatch${RESET}`);
    } else {
        console.log(`\n  ${RED}${BOLD}VERDICT: FAIL — ${failures} requests were dropped or deadlocked${RESET}`);
    }

    return { successes, failures, raceCondition: cumulativeBalances.length !== new Set(cumulativeBalances).size };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 2: Infection Control Paradox (Orthopedics)
// ═══════════════════════════════════════════════════════════════════════════
async function scenario2_infectionControl() {
    banner('SCENARIO 2: Infection Control Paradox (Orthopedics)');
    console.log(`  ${DIM}Testing: Can the same sterile implant batch be used on TWO patients?`);
    console.log(`  A real HMS MUST reject the second usage — implants are single-use.${RESET}\n`);

    const IMPLANT_BATCH = `BATCH-STERILE-${Date.now()}`;

    // Step 1: Create an orthopedic visit for Patient A
    console.log(`  ${DIM}Step 1: Creating orthopedic visit for Patient A...${RESET}`);
    const visitA = await api('POST', '/api/orthopedics/visits', {
        patient_id: PATIENT_UUID_A, // UUID FK
        affected_joint: 'Right Knee',
        affected_side: 'Right',
        injury_mechanism: 'Sports injury — ACL tear during football',
        pain_score_nrs: 8,
        swelling_present: true,
        deformity_present: false,
        diagnosis: 'Complete ACL Rupture',
        treatment_plan: 'ACL reconstruction with hamstring autograft',
        notes: 'Chaos test Patient A — visit creation'
    });
    result('Create Visit A', visitA.status, visitA.elapsed);
    const visitAId = visitA.data?.data?.id;

    // Step 2: Create orthopedic visit for Patient B
    console.log(`  ${DIM}Step 2: Creating orthopedic visit for Patient B...${RESET}`);
    const visitB = await api('POST', '/api/orthopedics/visits', {
        patient_id: PATIENT_UUID_B, // UUID FK
        affected_joint: 'Left Hip',
        affected_side: 'Left',
        injury_mechanism: 'Fall from height — displaced femoral neck fracture',
        pain_score_nrs: 9,
        swelling_present: true,
        deformity_present: true,
        diagnosis: 'Displaced Femoral Neck Fracture',
        treatment_plan: 'Bipolar hemiarthroplasty',
        notes: 'Chaos test Patient B — visit creation'
    });
    result('Create Visit B', visitB.status, visitB.elapsed);
    const visitBId = visitB.data?.data?.id;

    if (!visitAId || !visitBId) {
        console.log(`  ${RED}❌ Cannot continue — visit creation failed${RESET}`);
        console.log(`     Visit A response:`, JSON.stringify(visitA.data));
        console.log(`     Visit B response:`, JSON.stringify(visitB.data));
        return { implantReused: 'UNKNOWN' };
    }

    // Step 3: Log procedure for Patient A WITH the sterile implant batch
    console.log(`\n  ${DIM}Step 3: Logging procedure for Patient A with implant batch ${IMPLANT_BATCH}${RESET}`);
    const procA = await api('POST', '/api/orthopedics/procedures', {
        visit_id: visitAId,
        procedure_name: 'ACL Reconstruction',
        procedure_code: 'CPT-29888',
        joint: 'Right Knee',
        side: 'Right',
        approach: 'Arthroscopic-assisted',
        implants_used_json: [{
            implant_name: 'Titanium Interference Screw 8x25mm',
            batch_number: IMPLANT_BATCH,
            category: 'Fixation Device',
            sterile_status: 'Sterile'
        }],
        tourniquet_time_min: 75,
        blood_loss_ml: 120,
        complications: null
    });
    result('Procedure A (1st implant use)', procA.status, procA.elapsed,
        procA.status === 201 ? `batch=${IMPLANT_BATCH}` : '');

    // Step 4: THE PARADOX — Log procedure for Patient B using the SAME batch
    console.log(`\n  ${YELLOW}${BOLD}Step 4: THE PARADOX — Attempting SAME implant batch on Patient B${RESET}`);
    const procB = await api('POST', '/api/orthopedics/procedures', {
        visit_id: visitBId,
        procedure_name: 'Bipolar Hemiarthroplasty',
        procedure_code: 'CPT-27125',
        joint: 'Left Hip',
        side: 'Left',
        approach: 'Posterior Approach',
        implants_used_json: [{
            implant_name: 'Titanium Interference Screw 8x25mm',
            batch_number: IMPLANT_BATCH,
            category: 'Fixation Device',
            sterile_status: 'Sterile'
        }],
        tourniquet_time_min: 90,
        blood_loss_ml: 250,
        complications: null
    });
    result('Procedure B (2nd implant use — SHOULD FAIL)', procB.status, procB.elapsed);

    console.log(`\n  ${BOLD}── Infection Control Analysis ──${RESET}`);
    if (procA.status === 201 && procB.status === 201) {
        console.log(`  ${RED}${BOLD}💀 CRITICAL VULNERABILITY: Implant batch "${IMPLANT_BATCH}" was used on TWO patients!${RESET}`);
        console.log(`  ${RED}  The system has NO implant batch uniqueness enforcement.${RESET}`);
        console.log(`  ${RED}  In production, this is an INFECTION CONTROL VIOLATION.${RESET}`);
        console.log(`\n  ${YELLOW}RECOMMENDATION: Add a UNIQUE constraint or application-level`);
        console.log(`  check on implant batch numbers in orthopedic_procedures.implants_used JSONB.${RESET}`);
        return { implantReused: true };
    } else if (procA.status === 201 && (procB.status === 400 || procB.status === 409)) {
        console.log(`  ${GREEN}${BOLD}✅ PASS — System correctly rejected duplicate implant batch!${RESET}`);
        return { implantReused: false };
    } else {
        console.log(`  ${YELLOW}⚠️  INCONCLUSIVE — Unexpected status codes (A=${procA.status}, B=${procB.status})${RESET}`);
        return { implantReused: 'UNKNOWN' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 3: "Fat Finger" Odontogram Conflict (Dental)
// ═══════════════════════════════════════════════════════════════════════════
async function scenario3_fatFinger() {
    banner('SCENARIO 3: "Fat Finger" Odontogram Conflict (Dental)');
    console.log(`  ${DIM}Testing: Can you perform a root canal on an already-extracted tooth?`);
    console.log(`  Extract tooth #46, then 50ms later attempt D3330 Endo on #46.${RESET}\n`);

    // Step 1: Create a dental visit (need visit_id for procedures)
    console.log(`  ${DIM}Step 1: Creating dental visit for patient...${RESET}`);
    const visit = await api('POST', '/api/dental/visits', {
        patient_id: PATIENT_UUID_A,
        chief_complaint: 'Severe decay and mobility in lower right first molar (#46)',
        diagnosis: 'Grossly carious #46, Grade III mobility, periapical abscess',
        treatment_plan: 'Extraction of #46 under LA',
        notes: 'Chaos test — Fat Finger scenario',
        odontogram: {
            teeth: {
                '46': { status: 'caries', surfaces: { O: 'caries', D: 'caries', M: 'caries' } }
            }
        }
    });
    result('Create Dental Visit', visit.status, visit.elapsed);
    const visitId = visit.data?.data?.id;

    if (!visitId) {
        console.log(`  ${RED}❌ Cannot continue — dental visit creation failed${RESET}`);
        console.log(`     Response:`, JSON.stringify(visit.data));
        return { extractedToothTreated: 'UNKNOWN' };
    }

    // Step 2: Extract tooth #46
    console.log(`\n  ${DIM}Step 2: Extracting tooth #46 (D7140 — Simple Extraction)...${RESET}`);
    const extraction = await api('POST', '/api/dental/procedures', {
        visit_id: visitId,
        procedure_code: 'D7140',
        procedure_name: 'Simple Extraction',
        tooth_number: '46',
        quadrant: 'LR',
        surface: null,
        fee: 2500,
        notes: 'Extraction of #46 under bilateral IAN block. Tooth delivered in toto. Socket irrigated. Haemostasis achieved.'
    });
    result('Extract #46 (D7140)', extraction.status, extraction.elapsed);

    // Step 3: Wait 50ms then attempt root canal on SAME TOOTH
    await new Promise(r => setTimeout(r, 50));

    console.log(`\n  ${YELLOW}${BOLD}Step 3: THE FAT FINGER — Attempting Root Canal on extracted #46${RESET}`);
    const rootCanal = await api('POST', '/api/dental/procedures', {
        visit_id: visitId,
        procedure_code: 'D3330',
        procedure_name: 'Endodontic Therapy',
        tooth_number: '46',
        quadrant: 'LR',
        surface: null,
        fee: 8000,
        notes: 'Endodontic therapy #46 — access opening, working length determination, biomechanical preparation, obturation with lateral condensation. BUT THIS TOOTH WAS JUST EXTRACTED!'
    });
    result('Root Canal #46 (D3330 — SHOULD FAIL)', rootCanal.status, rootCanal.elapsed);

    console.log(`\n  ${BOLD}── Odontogram Conflict Analysis ──${RESET}`);
    if (extraction.status === 201 && rootCanal.status === 201) {
        console.log(`  ${RED}${BOLD}💀 CLINICAL SAFETY GAP: Root canal charted on an extracted tooth!${RESET}`);
        console.log(`  ${RED}  Tooth #46 was extracted (D7140) then D3330 endo was accepted.${RESET}`);
        console.log(`  ${RED}  No odontogram status validation exists in the procedure pipeline.${RESET}`);
        console.log(`\n  ${YELLOW}RECOMMENDATION: Add pre-INSERT validation that checks the tooth's`);
        console.log(`  current status in the odontogram. If status = 'extracted' or 'missing',`);
        console.log(`  reject any restorative/endodontic procedures on that tooth.${RESET}`);
        return { extractedToothTreated: true };
    } else if (extraction.status === 201 && (rootCanal.status === 400 || rootCanal.status === 409 || rootCanal.status === 422)) {
        console.log(`  ${GREEN}${BOLD}✅ PASS — System correctly rejected procedure on extracted tooth!${RESET}`);
        return { extractedToothTreated: false };
    } else {
        console.log(`  ${YELLOW}⚠️  INCONCLUSIVE — Unexpected status codes`);
        console.log(`     Extraction: ${extraction.status}, Root Canal: ${rootCanal.status}${RESET}`);
        if (extraction.status !== 201) {
            console.log(`     ${DIM}Extraction itself failed — check dental_procedures table schema${RESET}`);
        }
        return { extractedToothTreated: 'UNKNOWN' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
    console.log(`${CYAN}${BOLD}`);
    console.log(`  ██████╗██╗  ██╗ █████╗  ██████╗ ███████╗`);
    console.log(`  ██╔════╝██║  ██║██╔══██╗██╔═══██╗██╔════╝`);
    console.log(`  ██║     ███████║███████║██║   ██║███████╗`);
    console.log(`  ██║     ██╔══██║██╔══██║██║   ██║╚════██║`);
    console.log(`  ╚██████╗██║  ██║██║  ██║╚██████╔╝███████║`);
    console.log(`   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`);
    console.log(`${RESET}`);
    console.log(`  ${DIM}WOLF HMS — Phase 2: Clinical Reality Simulation${RESET}`);
    console.log(`  ${DIM}Testing: LOGIC & CONCURRENCY, not load${RESET}`);
    console.log(`  ${DIM}Target: ${BASE_URL}${RESET}`);
    console.log(`  ${DIM}Token forged for: admin @ hospital_id=${HOSPITAL_ID}${RESET}`);

    const report = {};

    // Run all 3 scenarios
    report.codeBlue = await scenario1_codeBlue();
    report.infectionControl = await scenario2_infectionControl();
    report.fatFinger = await scenario3_fatFinger();

    // ── Final Report Card ───────────────────────────────────────────────
    banner('PHASE 2 FINAL REPORT CARD');

    console.log(`  ${BOLD}Scenario 1 — Code Blue Concurrency:${RESET}`);
    if (report.codeBlue.failures === 0) {
        console.log(`    ${GREEN}✅ PASS${RESET} — ${report.codeBlue.successes}/10 INSERTs landed, zero deadlocks`);
        if (report.codeBlue.raceCondition) {
            console.log(`    ${YELLOW}⚠️  WARNING${RESET} — Race condition in cumulative balance calculation`);
            console.log(`    ${DIM}   (read-before-write anomaly, needs SELECT FOR UPDATE or SERIALIZABLE)${RESET}`);
        }
    } else {
        console.log(`    ${RED}❌ FAIL${RESET} — ${report.codeBlue.failures}/10 requests dropped`);
    }

    console.log(`\n  ${BOLD}Scenario 2 — Infection Control:${RESET}`);
    if (report.infectionControl.implantReused === false) {
        console.log(`    ${GREEN}✅ PASS${RESET} — Duplicate implant batch correctly rejected`);
    } else if (report.infectionControl.implantReused === true) {
        console.log(`    ${RED}💀 FAIL${RESET} — Same implant batch used on TWO patients (no constraint)`);
    } else {
        console.log(`    ${YELLOW}⚠️  INCONCLUSIVE${RESET}`);
    }

    console.log(`\n  ${BOLD}Scenario 3 — Fat Finger Odontogram:${RESET}`);
    if (report.fatFinger.extractedToothTreated === false) {
        console.log(`    ${GREEN}✅ PASS${RESET} — Root canal on extracted tooth correctly rejected`);
    } else if (report.fatFinger.extractedToothTreated === true) {
        console.log(`    ${RED}💀 FAIL${RESET} — Root canal accepted on an extracted tooth (no validation)`);
    } else {
        console.log(`    ${YELLOW}⚠️  INCONCLUSIVE${RESET}`);
    }

    console.log(`\n${CYAN}${'═'.repeat(72)}${RESET}\n`);
}

main().catch(err => {
    console.error(`${RED}Fatal error:${RESET}`, err);
    process.exit(1);
});
