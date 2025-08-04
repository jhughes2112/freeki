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
		proxy: {
			'/api': {
				target: 'http://localhost:22222', // your backend's dev server
				changeOrigin: true,
				secure: false,
			},
		}
    },
})
