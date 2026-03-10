import { build } from 'vite';
import path from 'path';

(async () => {
  try {
    console.log('Starting programmatic build...');
    await build({
      root: process.cwd(),
      logLevel: 'silent', 
      configFile: path.resolve(process.cwd(), 'vite.config.js'),
    });
    console.log('Build completed successfully.');
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
})();
