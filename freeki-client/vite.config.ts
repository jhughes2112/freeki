import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
	build: {
      outDir: 'static-root',
      emptyOutDir: true
    },
    server: {
        port: 56378,
    }
})
