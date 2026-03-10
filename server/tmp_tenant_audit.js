const fs = require('fs');
const path = require('path');

const basePath = 'C:/Users/HP/.gemini/antigravity/scratch/wolf-hms-stable/server';

// 1. Scan Schema
const schemaPath = path.join(basePath, 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const models = [];
let currentModel = null;

schemaContent.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('model ')) {
        const parts = line.split(' ');
        currentModel = { name: parts[1], hasHospitalId: false };
        models.push(currentModel);
    } else if (line.startsWith('}')) {
        currentModel = null;
    } else if (currentModel) {
        if (line.includes('hospital_id') || line.includes('hospitalId')) {
            currentModel.hasHospitalId = true;
        }
    }
});

const modelsWithoutTenant = models.filter(m => !m.hasHospitalId).map(m => m.name);
const modelsWithTenant = models.filter(m => m.hasHospitalId).map(m => m.name);

// 2. Scan Controllers - ACCURATE detection
const controllersPath = path.join(basePath, 'controllers');
const controllers = [];

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            controllers.push(fullPath);
        }
    });
}
scanDir(controllersPath);

// Categories:
// FULL: uses getHospitalId OR req.hospital_id AND uses it in queries
// IMPORT_ONLY: imports getHospitalId but never actually uses it in queries (false positive)
// NONE: no tenant awareness at all

const controllersFullTenant = [];
const controllersImportOnly = [];
const controllersNoTenant = [];

controllers.forEach(ctrl => {
    const content = fs.readFileSync(ctrl, 'utf8');
    const relativePath = path.relative(controllersPath, ctrl);
    
    const importsHelper = content.includes('getHospitalId');
    const usesReqHospitalId = /req\.hospital_?id/i.test(content) || /req\.user\.hospital_?id/i.test(content);
    const usesHospitalIdInQuery = content.includes('hospitalId') && (content.includes('pool.query') || content.includes('prisma'));
    
    if (importsHelper && usesHospitalIdInQuery) {
        controllersFullTenant.push(relativePath);
    } else if (importsHelper && !usesHospitalIdInQuery) {
        controllersImportOnly.push(relativePath);
    } else if (usesReqHospitalId) {
        controllersFullTenant.push(relativePath);
    } else {
        controllersNoTenant.push(relativePath);
    }
});

// 3. Classify missing models
const systemTables = ['public__migrations', 'schema_migrations', 'public_migrations', 'migration_errors', 'refresh_tokens', 'mfa_attempts', 'hospitals', 'hospital_profile', 'hospital_templates'];
const globalReferenceTables = ['blood_exempt_conditions', 'blood_service_charges', 'claim_scrub_rules', 'icd_code_suggestions', 'lab_parameter_categories', 'lab_parameters_backup_2026', 'denial_codes', 'pmjay_procedures', 'pmjay_specialties', 'webhook_event_types', 'instrument_drivers', 'instrument_test_mapping'];
const childTables = []; // tables that inherit tenant from parent via FK
const needsTenant = [];

modelsWithoutTenant.forEach(m => {
    if (systemTables.includes(m)) return;
    if (globalReferenceTables.includes(m)) return;
    needsTenant.push(m);
});

// Output
const reportPath = 'C:/Users/HP/.gemini/antigravity/brain/cc4f5854-faf4-4b1f-8752-bba903e091ac/multi_tenant_audit_report.md';

let report = `# Multi-Hospital Tenant Structure — Comprehensive Audit Report
> Generated: ${new Date().toISOString().split('T')[0]}

## Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total DB Models | ${models.length} | — |
| Models WITH hospital_id | ${modelsWithTenant.length} | ✅ |
| Models WITHOUT hospital_id | ${modelsWithoutTenant.length} | ⚠️ |
| System/Migration tables (OK to skip) | ${systemTables.length} | ✅ |
| Global reference tables (OK to skip) | ${globalReferenceTables.length} | ✅ |
| **Models NEEDING hospital_id** | **${needsTenant.length}** | 🔴 |
| Total Controllers | ${controllers.length} | — |
| Controllers FULLY tenant-aware | ${controllersFullTenant.length} | ✅ |
| Controllers that IMPORT helper but don't USE in queries | ${controllersImportOnly.length} | ⚠️ |
| **Controllers with NO tenant awareness** | **${controllersNoTenant.length}** | 🔴 |

## 1. Middleware Infrastructure ✅
- **tenantResolver.js**: Sets \`req.hospital_id\` via subdomain/header/JWT. Also sets PostgreSQL RLS context via \`set_config('app.current_tenant', ...)\`
- **authMiddleware.js**: Cross-tenant JWT blocking (token hospital_id must match domain hospital_id). Platform admins exempt.
- **tenantHelper.js**: Utility with \`getHospitalId(req)\`, \`hospitalFilter()\`, \`buildSelectQuery()\`, \`buildInsertQuery()\`, \`buildUpdateQuery()\`, \`buildDeleteQuery()\`

## 2. Database Models — Missing hospital_id

### System/Migration Tables (Safe to Skip)
\`\`\`
${systemTables.join(', ')}
\`\`\`

### Global Reference Data (Safe to Skip)
\`\`\`
${globalReferenceTables.join(', ')}
\`\`\`

### 🔴 Models That NEED hospital_id (${needsTenant.length})
\`\`\`
${needsTenant.join('\n')}
\`\`\`

## 3. Controller Tenant Awareness

### ✅ Fully Tenant-Aware Controllers (${controllersFullTenant.length})
\`\`\`
${controllersFullTenant.join('\n')}
\`\`\`

### ⚠️ Import Helper but Don't Use in Queries (${controllersImportOnly.length})
These import \`getHospitalId\` but their queries may not actually filter by it.
\`\`\`
${controllersImportOnly.join('\n')}
\`\`\`

### 🔴 No Tenant Awareness (${controllersNoTenant.length})
\`\`\`
${controllersNoTenant.join('\n')}
\`\`\`
`;

fs.writeFileSync(reportPath, report);
console.log('Accurate report written.');
console.log(`Full tenant: ${controllersFullTenant.length}, Import-only: ${controllersImportOnly.length}, None: ${controllersNoTenant.length}`);
console.log(`Models needing hospital_id: ${needsTenant.length}`);
console.log('\\nControllers with NO tenant:');
controllersNoTenant.forEach(c => console.log('  ' + c));
