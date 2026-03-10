const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_DIR = path.join(__dirname, '../server');
const CLIENT_DIR = path.join(__dirname, '../client/src');
const REPORT_FILE = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\94935d4e-d228-420a-b064-c3ea8f55deee\\system_health_report.md';

// State
const serverRoutes = new Set(); // Stores full paths: "GET /api/auth/login"
const clientCalls = []; // Stores { method, url, file, line, expectsArray }
const controllerReturns = new Map(); // Stores { controllerName: returnsWrappedObject }

// Regex Patterns
const REGEX_ROUTE_USE = /app\.use\(['"`](.*?)['"`],\s*(\w+)Routes\)/g;
const REGEX_ROUTE_DEF = /router\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
const REGEX_CLIENT_CALL = /(?:axios|api)\.(get|post|put|delete|patch)\(['"`](.*?)['"`](?:[\s\S]*?)(?:\.then|\.catch|await)/g;
// Heuristic: If client code does `.data.map` or `.data.filter` or `.data.length` on the response
const REGEX_CLIENT_ARRAY_USAGE = /res\.data\.(map|filter|length|find|forEach|reduce)/; 

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

// 1. Map Server Routes
function mapServerRoutes() {
    console.log('🗺️ Mapping Server Routes...');
    
    // Step A: Parse server-cloud.js to find base paths
    const serverFile = path.join(SERVER_DIR, 'server-cloud.js');
    if (!fs.existsSync(serverFile)) {
        console.error('CRITICAL: server-cloud.js not found!');
        return;
    }
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    
    const routeMappings = {};
    let match;
    while ((match = REGEX_ROUTE_USE.exec(serverContent)) !== null) {
        const [_, basePath, routeName] = match;
        routeMappings[`${routeName}Routes`] = basePath;
    }

    // Step B: Parse individual route files
    const routeFiles = fs.readdirSync(path.join(SERVER_DIR, 'routes'));
    routeFiles.forEach(file => {
        if (!file.endsWith('.js')) return;
        
        const content = fs.readFileSync(path.join(SERVER_DIR, 'routes', file), 'utf8');
        const routeName = file.replace('.js', ''); // e.g., "authRoutes"
        const basePath = routeMappings[routeName]; // e.g., "/api/auth"

        if (!basePath) {
            // console.log(`⏩ Skipping unmounted route file: ${file}`);
            return;
        }

        let routeMatch;
        while ((routeMatch = REGEX_ROUTE_DEF.exec(content)) !== null) {
            const [_, method, subPath] = routeMatch;
            // Clean path: / + /login -> /login
            const fullPath = (basePath + subPath).replace('//', '/');
            serverRoutes.add(`${method.toUpperCase()} ${fullPath}`);
        }
    });

    console.log(`✅ Found ${serverRoutes.size} server endpoints.`);
}

// 2. Scan Client Calls
function scanClientCode() {
    console.log('🕵️ Scanning Client Code...');
    const strings = [];
    const files = getAllFiles(CLIENT_DIR);

    files.forEach(file => {
        if (!file.endsWith('.jsx') && !file.endsWith('.js')) return;
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            // Simple line-based check for calls
             // Note: Multi-line calls might be missed by simple regex, but enough for "deep research" demo
            const match = /(?:axios|api)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/.exec(line);
            if (match) {
                const [_, method, url] = match;
                
                // Heuristic: Check next few lines for usage of .data
                // This is very rough static analysis
                let expectsArray = false;
                for(let i=0; i<5; i++) {
                    if (lines[index+i] && REGEX_CLIENT_ARRAY_USAGE.test(lines[index+i])) {
                        expectsArray = true;
                    }
                }
                
                // Only track static string URLs (ignore dynamic `${id}` for now unless simple)
                if (!url.includes('${')) {
                    clientCalls.push({
                        method: method.toUpperCase(),
                        url,
                        file: path.relative(CLIENT_DIR, file),
                        line: index + 1,
                        expectsArray
                    });
                }
            }
        });
    });
    console.log(`✅ Found ${clientCalls.length} static API calls in client.`);
}

// 3. Generate Report
function generateReport() {
    console.log('📝 Generating Report...');
    
    let report = '# 🏥 System Health Report\n\n';
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Server Routes:** ${serverRoutes.size}\n`;
    report += `**Client API Calls:** ${clientCalls.length}\n\n`;

    report += '## 🔴 Dead Routes (404 Risk)\n';
    report += 'These client calls point to non-existent server endpoints:\n\n';
    
    let deadCount = 0;
    clientCalls.forEach(call => {
        const signature = `${call.method} ${call.url}`;
        if (!serverRoutes.has(signature)) {
            report += `- **${call.method} ${call.url}**\n`;
            report += `  - Found in: \`${call.file}:${call.line}\`\n`;
            deadCount++;
        }
    });
    if (deadCount === 0) report += '*No dead routes found (for static URLs).*\n';

    report += '\n## 🟠 Data Mismatch Risks (Crash Risk)\n';
    report += 'These calls expect an Array (`.map`/`.filter`) but might verify if Server returns wrapped `data` object.\n';
    report += '> Note: This is a heuristic scan. Verify manually.\n\n';

    // In a real advanced scanner, we would map specific controllers to their return types.
    // For this demo, we assume ALL our server endpoints use ResponseHandler (wrapping data).
    // So any client call expecting an Array directly from `res.data` is suspect unless it handles `res.data.data`.
    
    let suspectCount = 0;
    clientCalls.forEach(call => {
        if (call.expectsArray) {
             // We can't verify if they fixed it in code just by regex easily without AST
             // But we can flag them for review
             if (serverRoutes.has(`${call.method} ${call.url}`)) {
                 report += `- **${call.method} ${call.url}**\n`;
                 report += `  - Client expects Array (uses .map/filter)\n`;
                 report += `  - File: \`${call.file}:${call.line}\` \n`;
                 suspectCount++;
             }
        }
    });

    if (suspectCount === 0) report += '*No obvious mismatch risks found.*\n';

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`✅ Report saved to ${REPORT_FILE}`);
}

// Run
mapServerRoutes();
scanClientCode();
generateReport();
