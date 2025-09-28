import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// FIX: Define __dirname in ES module scope where it's not available globally.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // FIX: Directly define the OpenRouter API key to resolve configuration issues.
    // This ensures the key is available in the application environment.
    const openRouterApiKey = env.OPENROUTER_API_KEY || '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';

    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(openRouterApiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          external: ['chartjs-plugin-zoom'], // Menambahkan chartjs-plugin-zoom ke dalam external
        },
      },
    };
});
