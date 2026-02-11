import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to resolve the "Property 'cwd' does not exist on type 'Process'" error in environments without Node.js type definitions.
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.VITE_GEMINI_API_KEY || env.API_KEY || "";

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false
    },
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});