const esbuild = require('esbuild');
const fs = require('fs');
const crypto = require('crypto');

async function build() {
    console.log('Building with raw esbuild...');
    
    // Clean and create dist
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.mkdirSync('dist');
    fs.mkdirSync('dist/assets');

    // Copy public folder
    if (fs.existsSync('public')) {
        fs.cpSync('public', 'dist', { recursive: true });
    }

    // Generate a short hash for cache busting
    const buildHash = crypto.randomBytes(4).toString('hex');
    const jsFilename = `index.${buildHash}.js`;
    const cssFilename = `index.${buildHash}.css`;

    try {
        await esbuild.build({
            entryPoints: ['src/main.jsx'],
            bundle: true,
            outfile: `dist/assets/${jsFilename}`,
            loader: { '.js': 'jsx', '.jsx': 'jsx', '.png': 'file', '.jpg': 'file', '.svg': 'file' },
            define: {
                'process.env.NODE_ENV': '"production"',
                'global': 'window',
                'import.meta.env.MODE': '"production"',
                'import.meta.env.PROD': 'true',
                'import.meta.env.DEV': 'false',
                'import.meta.env.VITE_API_URL': '"https://wolf-hms-server-1026194439642.asia-south1.run.app"',
            },
            minify: false,
            sourcemap: false,
        });
        console.log(`JS Bundle success: ${jsFilename}`);

        // Rename CSS if generated
        if (fs.existsSync(`dist/assets/index.${buildHash}.css`)) {
            // CSS is already named correctly by esbuild
        }

        // Update index.html with hashed filenames
        let html = fs.readFileSync('index.html', 'utf8');
        html = html.replace(
            '<script type="module" src="/src/main.jsx"></script>',
            `<script src="/assets/${jsFilename}"></script>`
        );
        
        // Check for any CSS file in assets and add it
        const assetsDir = fs.readdirSync('dist/assets');
        const cssFile = assetsDir.find(f => f.endsWith('.css'));
        if (cssFile) {
            html = html.replace('</head>', `<link rel="stylesheet" href="/assets/${cssFile}"></head>`);
            console.log(`CSS Bundle: ${cssFile}`);
        }
        
        fs.writeFileSync('dist/index.html', html);
        console.log('Build complete with cache-busting hashes!');
        console.log(`Build hash: ${buildHash}`);

    } catch (e) {
        console.error('Build failed', e);
        process.exit(1);
    }
}

build();
