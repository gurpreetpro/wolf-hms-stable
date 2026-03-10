/**
 * Server Error Audit Script
 * Scans controllers for error handling issues and inconsistencies
 * 
 * Usage: node audit_errors.js
 */

const fs = require('fs');
const path = require('path');

const CONTROLLERS_DIR = path.join(__dirname, 'controllers');
const ROUTES_DIR = path.join(__dirname, 'routes');

// Patterns to check
const patterns = {
    // Good patterns
    responseHandler: /ResponseHandler\.(error|success)/g,
    tryCatch: /try\s*\{[\s\S]*?\}\s*catch/g,
    asyncHandler: /asyncHandler\s*\(/g,
    
    // Problematic patterns
    directStatusJson: /res\.status\(\d+\)\.json\(/g,
    bareConsoleError: /console\.error\((error|err)\)/g,
    missingReturn: /res\.status\([45]\d\d\)\.json\([^)]+\)(?!\s*;?\s*return)/g,
    emptyMessage: /res\.status\(500\)\.json\(\s*\{\s*message:\s*['"]Server error['"]/g
};

const results = {
    controllers: [],
    routes: [],
    summary: {
        totalFiles: 0,
        usingResponseHandler: 0,
        usingDirectJson: 0,
        usingAsyncHandler: 0,
        missingTryCatch: 0
    }
};

function scanFile(filePath, isController) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    const fileResult = {
        file: fileName,
        path: filePath,
        issues: [],
        patterns: {}
    };
    
    // Check for ResponseHandler usage
    const responseHandlerMatches = content.match(patterns.responseHandler);
    fileResult.patterns.responseHandler = responseHandlerMatches ? responseHandlerMatches.length : 0;
    
    // Check for direct res.status().json() usage
    const directJsonMatches = content.match(patterns.directStatusJson);
    fileResult.patterns.directJson = directJsonMatches ? directJsonMatches.length : 0;
    
    // Check for try-catch blocks
    const tryCatchMatches = content.match(patterns.tryCatch);
    fileResult.patterns.tryCatch = tryCatchMatches ? tryCatchMatches.length : 0;
    
    // Check for asyncHandler usage
    const asyncHandlerMatches = content.match(patterns.asyncHandler);
    fileResult.patterns.asyncHandler = asyncHandlerMatches ? asyncHandlerMatches.length : 0;
    
    // Check async function count
    const asyncFunctions = content.match(/async\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g) || [];
    const asyncMethods = content.match(/async\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/g) || [];
    fileResult.patterns.asyncFunctions = asyncFunctions.length + asyncMethods.length;
    
    // Identify issues
    if (fileResult.patterns.directJson > 0 && fileResult.patterns.responseHandler === 0) {
        fileResult.issues.push(`Uses direct res.status().json() (${fileResult.patterns.directJson} times) - consider using ResponseHandler`);
    }
    
    if (fileResult.patterns.asyncFunctions > fileResult.patterns.tryCatch) {
        const missing = fileResult.patterns.asyncFunctions - fileResult.patterns.tryCatch;
        fileResult.issues.push(`Potentially ${missing} async functions without try-catch`);
    }
    
    // Check for bare console.error without context
    const bareErrors = content.match(/console\.error\(\s*(error|err)\s*\)/g);
    if (bareErrors && bareErrors.length > 0) {
        fileResult.issues.push(`${bareErrors.length} bare console.error() calls without context`);
    }
    
    // Check for generic "Server error" messages
    const genericErrors = content.match(/['"]Server error['"]/g);
    if (genericErrors && genericErrors.length > 0) {
        fileResult.issues.push(`${genericErrors.length} generic "Server error" messages - consider more specific messages`);
    }
    
    // Update summary
    results.summary.totalFiles++;
    if (fileResult.patterns.responseHandler > 0) results.summary.usingResponseHandler++;
    if (fileResult.patterns.directJson > 0) results.summary.usingDirectJson++;
    if (fileResult.patterns.asyncHandler > 0) results.summary.usingAsyncHandler++;
    
    if (isController) {
        results.controllers.push(fileResult);
    } else {
        results.routes.push(fileResult);
    }
    
    return fileResult;
}

function scanDirectory(dir, isController) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            scanDirectory(filePath, isController);
        } else if (file.endsWith('.js')) {
            scanFile(filePath, isController);
        }
    });
}

function generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 WOLF HMS SERVER ERROR AUDIT REPORT');
    console.log('='.repeat(60) + '\n');
    
    console.log('📊 SUMMARY');
    console.log('-'.repeat(40));
    console.log(`Total Files Scanned: ${results.summary.totalFiles}`);
    console.log(`Using ResponseHandler: ${results.summary.usingResponseHandler} files`);
    console.log(`Using Direct JSON: ${results.summary.usingDirectJson} files`);
    console.log(`Using asyncHandler: ${results.summary.usingAsyncHandler} files`);
    console.log('');
    
    // Controllers with issues
    const controllersWithIssues = results.controllers.filter(c => c.issues.length > 0);
    if (controllersWithIssues.length > 0) {
        console.log('\n⚠️  CONTROLLERS WITH ISSUES');
        console.log('-'.repeat(40));
        controllersWithIssues.forEach(c => {
            console.log(`\n📄 ${c.file}`);
            c.issues.forEach(issue => {
                console.log(`   ⚡ ${issue}`);
            });
        });
    }
    
    // Routes with issues
    const routesWithIssues = results.routes.filter(r => r.issues.length > 0);
    if (routesWithIssues.length > 0) {
        console.log('\n\n⚠️  ROUTES WITH ISSUES');
        console.log('-'.repeat(40));
        routesWithIssues.forEach(r => {
            console.log(`\n📄 ${r.file}`);
            r.issues.forEach(issue => {
                console.log(`   ⚡ ${issue}`);
            });
        });
    }
    
    // Top files needing attention
    console.log('\n\n🔴 TOP FILES NEEDING ATTENTION');
    console.log('-'.repeat(40));
    
    const allFiles = [...results.controllers, ...results.routes]
        .sort((a, b) => b.issues.length - a.issues.length)
        .slice(0, 10);
    
    allFiles.forEach((f, i) => {
        if (f.issues.length > 0) {
            console.log(`${i + 1}. ${f.file} - ${f.issues.length} issue(s)`);
        }
    });
    
    // Recommendations
    console.log('\n\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));
    console.log('1. Add global error handler to server.js ✅ DONE');
    console.log('2. Standardize on ResponseHandler for all error responses');
    console.log('3. Add context to console.error() calls (function name, user, etc.)');
    console.log('4. Replace generic "Server error" with specific messages');
    console.log('5. Consider wrapping route handlers with asyncHandler');
    
    console.log('\n' + '='.repeat(60));
    console.log('Audit completed at:', new Date().toISOString());
    console.log('='.repeat(60) + '\n');
    
    // Save JSON report
    const reportPath = path.join(__dirname, 'error_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📁 Full report saved to: ${reportPath}`);
}

// Run audit
console.log('🔍 Starting error audit...');
console.log(`Scanning controllers: ${CONTROLLERS_DIR}`);
console.log(`Scanning routes: ${ROUTES_DIR}`);

try {
    scanDirectory(CONTROLLERS_DIR, true);
    scanDirectory(ROUTES_DIR, false);
    generateReport();
} catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
}
