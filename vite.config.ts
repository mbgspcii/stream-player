import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    server: { port: 5176 },
    build: {
        // dash.js alone is about 800 kB. It is a separate file, loaded only for a DASH stream.
        chunkSizeWarningLimit: 1200,
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.spec.{ts,tsx}'],
        setupFiles: ['src/setupTests.ts'],
    },
});
