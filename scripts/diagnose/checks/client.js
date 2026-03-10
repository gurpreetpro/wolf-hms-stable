const logger = require('../core/logger');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CLIENT_ROOT = path.join(process.cwd(), 'client');

// Simple regex-based AST analysis for import detection
// This is faster than full AST parsing and sufficient for 99% of "Missing Import" errors
function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];

    // 1. Detect Orphan JSX (Top-level JSX)
    // Basic heuristic: lines starting with <Tag that are NOT inside a function or return?
    // This is hard with regex. We'll rely on ESLint for that if available, or skip for now.
    // However, we CAN distinctively find imports.

    // 2. Extract Imports
    const importedIdentifiers = new Set();
    const importRegex = /import\s+(?:\{([^}]+)\}|(\w+)|(?:\*\s+as\s+(\w+)))\s+from/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        if (match[1]) { // Named imports { A, B }
            match[1].split(',').forEach(i => importedIdentifiers.add(i.trim().split(' as ')[0])); // Handle 'A as B' ignored for now, just grab A? No, grab local name. 
            // Actually 'A as B' -> local is B.
            // Let's refine: i.trim().split(/\s+as\s+/).pop()
             match[1].split(',').forEach(i => importedIdentifiers.add(i.trim().split(/\s+as\s+/).pop()));
        }
        if (match[2]) importedIdentifiers.add(match[2]); // Default import
        if (match[3]) importedIdentifiers.add(match[3]); // Namespace import
    }
    
    // Add React default imports
    importedIdentifiers.add('React');
    importedIdentifiers.add('useState'); // usually imported
    importedIdentifiers.add('useEffect');

    // 3. Extract JSX usage <Component
    const jsxRegex = /<([A-Z][A-Za-z0-9_]*)/g;
    const usedComponents = new Set();
    while ((match = jsxRegex.exec(content)) !== null) {
        usedComponents.add(match[1]);
    }

    // 4. Compare
    usedComponents.forEach(comp => {
        if (!importedIdentifiers.has(comp)) {
            // Filter out common globals or built-ins if any (React is usually imported, but specific components like Link, Tab, etc are not global)
            // Filter out locally defined components in the same file? 
            // Heuristic: Check if 'const Comp =' or 'function Comp' exists
            const definitionRegex = new RegExp(`(?:function\\s+${comp}|const\\s+${comp}\\s*=)`, 'g');
            if (!definitionRegex.test(content)) {
                errors.push(`Missing import for component: <${comp}>`);
            }
        }
    });
    
    // 5. Detect Tab vs Tabs constraint (Specific for this project)
    if (usedComponents.has('Tab') && !importedIdentifiers.has('Tab')) {
         // Already caught above, but we can be specific
    }

    return errors;
}

function scanDirectory(dir, issues) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') {
                scanDirectory(fullPath, issues);
            }
        } else if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
            const fileErrors = scanFile(fullPath);
            if (fileErrors.length > 0) {
                issues.push({ file: fullPath, errors: fileErrors });
            }
        }
    });
}

module.exports = async function runClientChecks(options) {
    let success = true;
    
    // Check 1: Client Directory Exists
    if (!fs.existsSync(CLIENT_ROOT)) {
        logger.error('Client directory not found at ' + CLIENT_ROOT);
        return false;
    }

    // Check 2: Environment Variables
    const envFile = path.join(CLIENT_ROOT, '.env');
    if (!fs.existsSync(envFile)) {
        logger.warn('Client .env file missing!');
    } else {
        const envContent = fs.readFileSync(envFile, 'utf8');
        if (!envContent.includes('VITE_API_URL')) {
            logger.error('Client .env missing VITE_API_URL');
            success = false;
        } else {
            logger.success('Client Environment configuration looks correct.');
        }
    }

    // Check 3: Deep AST / Syntax Analysis
    if (options.deep) {
        console.log(chalk.gray('Running Deep Component Scan...'));
        const issues = [];
        scanDirectory(path.join(CLIENT_ROOT, 'src'), issues);
        
        if (issues.length > 0) {
            success = false;
            logger.error(`Found ${issues.length} files with missing imports or errors:`);
            issues.forEach(issue => {
                console.log(chalk.red(`\nExample File: ${path.relative(process.cwd(), issue.file)}`));
                issue.errors.forEach(e => console.log(chalk.red(`  - ${e}`)));
            });
        } else {
            logger.success('No missing imports detected in JSX files.');
        }
    }

    return success;
};
