const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
// const TARGET_URL = process.argv[2] || 'http://localhost:5001';
const TARGET_URL = 'https://wolf-hms-server-1026194439642.asia-south1.run.app'; // Cloud Run
const SERVER_DIR = path.join(__dirname, '../server');
const REPORT_FILE = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\94935d4e-d228-420a-b064-c3ea8f55deee\\runtime_probe_report.md';

const CREDENTIALS = {
    username: 'admin_user',
    password: 'password123'
};

// State
const endpoints = [];
const results = { success: 0, failed: 0, total: 0 };

// Regex Patterns
const REGEX_ROUTE_USE = /app\.use\(['\"`](.*?)['\"`],\s*(\w+)Routes\)/g;
const REGEX_ROUTE_DEF = /router\.get\(['\"`](.*?)['\"`]/g;

// Query params for routes that require them
const QUERY_PARAM_ROUTES = {
    '/api/patients/check-patient': '?phone=9999999999',
    '/api/patients/profile': '?phone=9999999999',
    '/api/patients/my-appointments': '?phone=9999999999',
    '/api/patients/lab-orders': '?patientId=00000000-0000-0000-0000-000000000000',
    '/api/patients/medications': '?patientId=00000000-0000-0000-0000-000000000000',
    '/api/patients/prescriptions': '?patientId=00000000-0000-0000-0000-000000000000',
    '/api/patients/pharmacy-orders': '?patientId=00000000-0000-0000-0000-000000000000',
    '/api/patients/billing-history': '?patientId=00000000-0000-0000-0000-000000000000'
};

// Routes where 404/400 is EXPECTED (resource doesn't exist)
const EXPECTED_FAILURES = [
    '/api/blood-bank/donors/1',
    '/api/blood-bank/patient/',
    '/api/finance/billable/1',
    '/api/lab/package/1/full',
    '/api/patients/lab-results/1',
    '/api/patients/pharmacy-orders/1',
    '/api/sms/balance'
];

function mapEndpoints() {
    console.log('🗺️  Mapping GET Endpoints...');
    
    let serverFile = path.join(SERVER_DIR, 'server-cloud.js');
    if (!fs.existsSync(serverFile)) {
        serverFile = path.join(SERVER_DIR, 'server.js');
    }
    if (!fs.existsSync(serverFile)) {
        console.error('CRITICAL: server.js not found!');
        return;
    }
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    
    const routeMappings = {};
    let match;
    while ((match = REGEX_ROUTE_USE.exec(serverContent)) !== null) {
        routeMappings[`${match[2]}Routes`] = match[1];
    }

    const routeFiles = fs.readdirSync(path.join(SERVER_DIR, 'routes'));
    routeFiles.forEach(file => {
        if (!file.endsWith('.js')) return;
        
        const content = fs.readFileSync(path.join(SERVER_DIR, 'routes', file), 'utf8');
        const routeName = file.replace('.js', '');
        const basePath = routeMappings[routeName];

        if (!basePath) return;

        let routeMatch;
        while ((routeMatch = REGEX_ROUTE_DEF.exec(content)) !== null) {
            let fullPath = (basePath + routeMatch[1]).replace('//', '/');
            
            // Skip OAuth/callback routes
            if (fullPath.includes('/callback') || fullPath.includes('/auth-url')) continue;
            
            // Replace path params
            const SAMPLE_UUID = '00000000-0000-0000-0000-000000000000';
            fullPath = fullPath
                .replace(/:patient_id/g, SAMPLE_UUID)
                .replace(/:patientId/g, SAMPLE_UUID)
                .replace(/:\w+/g, '1'); // Replace other params with 1
            
            endpoints.push(fullPath);
        }
    });

    console.log(`✅ Identified ${endpoints.length} GET endpoints to probe.`);
}

async function runProbe() {
    console.log('🚀 Starting Wolf Prober...');
    console.log(`🎯 Target: ${TARGET_URL}`);

    // Login
    let token = '';
    try {
        console.log('🔑 Authenticating...');
        const authRes = await axios.post(`${TARGET_URL}/api/auth/login`, CREDENTIALS);
        token = authRes.data.data?.token || authRes.data.token;
        if (!token) throw new Error('No token received');
        console.log('✅ Authentication Successful');
    } catch (err) {
        console.error('❌ Authentication Failed:', err.message);
        return;
    }

    // Probe - SEQUENTIAL with delays
    const reportData = [];
    results.total = endpoints.length;
    console.log(`⚡ Probing ${endpoints.length} endpoints (sequential, 1000ms delay)...`);

    const delay = ms => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < endpoints.length; i++) {
        await delay(1000); // 1 second delay to avoid rate limits
        
        const url = endpoints[i];
        let fullUrl = `${TARGET_URL}${url}`;
        
        // Add query params if needed
        if (QUERY_PARAM_ROUTES[url]) {
            fullUrl += QUERY_PARAM_ROUTES[url];
        }
        
        const isExpectedFailure = EXPECTED_FAILURES.some(ef => url.includes(ef));
        const start = Date.now();

        try {
            const res = await axios.get(fullUrl, {
                headers: { Authorization: `Bearer ${token}` },
                validateStatus: () => true,
                timeout: 30000
            });
            const duration = Date.now() - start;
            
            // Count as success if 2xx OR expected failure
            const isSuccess = (res.status >= 200 && res.status < 300) || 
                              (isExpectedFailure && [400, 404].includes(res.status));
            
            if (isSuccess) results.success++;
            else results.failed++;

            reportData.push({
                icon: isSuccess ? '✅' : '❌',
                url,
                status: res.status,
                duration,
                data: JSON.stringify(res.data).substring(0, 100)
            });
        } catch (err) {
            results.failed++;
            reportData.push({
                icon: '💥',
                url,
                status: 'ERR',
                duration: Date.now() - start,
                data: err.message
            });
        }

        // Progress
        const progress = Math.round(((i + 1) / endpoints.length) * 100);
        if (i % 10 === 0) console.log(`Progress: ${progress}% (${results.success} OK, ${results.failed} Fail)`);
    }
    
    console.log('\n✅ Probe Complete.');

    // Write Report
    let md = '# 🐺 Wolf Runtime Probe Report\n\n';
    md += `**Target:** ${TARGET_URL}\n`;
    md += `**Time:** ${new Date().toLocaleString()}\n\n`;
    md += '## Summary\n';
    md += `| Total | Success | Failed |\n| :---: | :-----: | :----: |\n`;
    md += `| ${results.total} | ✅ ${results.success} | ❌ ${results.failed} |\n\n`;
    
    md += '## Failed Routes\n';
    reportData.filter(r => r.icon !== '✅').forEach(r => {
        md += `- **${r.status}** \`${r.url}\` (${r.duration}ms)\n  - \`${r.data}\`\n`;
    });

    const localReportPath = path.join(__dirname, 'runtime_probe_report_current.md');
    fs.writeFileSync(localReportPath, md);
    console.log(`📝 Report saved to ${localReportPath}`);
    
    // Also try original path but log error if fails
    try {
        fs.writeFileSync(REPORT_FILE, md);
        console.log(`📝 Report saved to Brain artifact.`);
    } catch (e) {
        console.error('Failed to write to Brain artifact:', e.message);
    }
}

mapEndpoints();
runProbe();
