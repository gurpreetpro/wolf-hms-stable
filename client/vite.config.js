import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL || ""),
    },
    build: {
      minify: false, // Disable minification
      sourcemap: false, // Disable sourcemaps
      cssCodeSplit: false, // Disable CSS splitting
      chunkSizeWarningLimit: 10000,
      rollupOptions: {

        output: {
          // Remove manual chunks to reduce complexity
          // manualChunks: ...
        }
      }
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        }
      }
    },
  };
});
