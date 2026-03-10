const fsNative = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CLIENT_DIR = path.join(PROJECT_ROOT, 'client');
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');
const SERVER_PUBLIC = path.join(SERVER_DIR, 'public');

console.log('🚀 Starting One-Click Deployment Preparation...');

// 1. Build Client
console.log(`\n📦 Building React Client in ${CLIENT_DIR}...`);
try {
    // Check if node_modules exists, install if not
    if (!fsNative.existsSync(path.join(CLIENT_DIR, 'node_modules'))) {
        console.log('   Installing client dependencies...');
        execSync('npm install', { cwd: CLIENT_DIR, stdio: 'inherit' });
    }
    
    // Run Build
    execSync('npm run build', { cwd: CLIENT_DIR, stdio: 'inherit' });
    console.log('✅ Client Build Complete.');
} catch (err) {
    console.error('❌ Failed to build client:', err);
    process.exit(1);
}

// 2. Stage Assets
console.log(`\n🚚 Staging Assets to ${SERVER_PUBLIC}...`);
try {
    // Clean target
    if (fsNative.existsSync(SERVER_PUBLIC)) {
        fsNative.rmSync(SERVER_PUBLIC, { recursive: true, force: true });
    }
    fsNative.mkdirSync(SERVER_PUBLIC);

    // Copy dist content to public
    const distSource = path.join(CLIENT_DIR, 'dist');
    if (!fsNative.existsSync(distSource)) {
        throw new Error(`Client dist folder not found at ${distSource}`);
    }

    fsNative.cpSync(distSource, SERVER_PUBLIC, { recursive: true });
    console.log('✅ Assets Staged Successfully.');
    
} catch (err) {
    console.error('❌ Failed to stage assets:', err);
    process.exit(1);
}

console.log('\n✨ Deployment Preparation Complete! You can now run docker build.');
