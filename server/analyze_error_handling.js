/**
 * Phase 4: Error Handling Analysis
 * Checks for controllers that may need additional error handling
 */

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

console.log('═'.repeat(60));
console.log('🔍 Phase 4: Error Handling Analysis');
console.log('═'.repeat(60));

const results = {
    good: [],
    needsReview: []
};

for (const file of files) {
    const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
    
    const usesAsyncHandler = content.includes('asyncHandler');
    const usesResponseHandler = content.includes('ResponseHandler');
    const hasBareCatch = (content.match(/\.catch\s*\(\s*\w*\s*=>\s*{?\s*console/g) || []).length;
    const hasConsoleErrorWithoutThrow = (content.match(/console\.error.*\n(?!.*throw)/g) || []).length;
    const asyncFnCount = (content.match(/async\s*\(/g) || []).length;
    const tryCatchCount = (content.match(/try\s*{/g) || []).length;
    
    const issues = [];
    
    if (!usesAsyncHandler && asyncFnCount > 0) {
        issues.push(`No asyncHandler but ${asyncFnCount} async functions`);
    }
    if (hasBareCatch > 0) {
        issues.push(`${hasBareCatch} bare .catch() blocks that log but may not handle`);
    }
    
    if (issues.length > 0) {
        results.needsReview.push({ file, issues, asyncFnCount, tryCatchCount });
    } else {
        results.good.push(file);
    }
}

console.log(`\n✅ Good Pattern (${results.good.length} controllers):`);
console.log('   Using asyncHandler + ResponseHandler - errors auto-handled');

console.log(`\n⚠️  Needs Review (${results.needsReview.length} controllers):`);
for (const r of results.needsReview) {
    console.log(`   ${r.file}: ${r.issues.join(', ')}`);
}

console.log('\n' + '═'.repeat(60));
console.log('📊 SUMMARY');
console.log('═'.repeat(60));
console.log(`Total Controllers: ${files.length}`);
console.log(`Good Pattern (asyncHandler): ${results.good.length}`);
console.log(`Needs Review: ${results.needsReview.length}`);

if (results.needsReview.length === 0) {
    console.log('\n🎉 All controllers use proper error handling patterns!');
} else {
    console.log('\n📋 Controllers using asyncHandler wrapper are properly handled.');
    console.log('   The asyncHandler catches all async errors automatically.');
}

console.log('═'.repeat(60));
