const { execSync } = require('child_process');
const fs = require('fs');

try {
    const out = execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
    fs.writeFileSync('build_err_node.txt', out);
    console.log("Build SUCCESS");
} catch (e) {
    fs.writeFileSync('build_err_node.txt', e.stdout + '\n' + e.stderr);
    console.log("Build FAILED. Check build_err_node.txt");
}
