import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// vite.config.ts
export default defineConfig({
	  plugins: [plugin(), {
		name: 'force-full-reload',
		handleHotUpdate({ file, server }) {
		  if (file.endsWith('.css')) {
			server.ws.send({ type: 'full-reload' });
			return [];
		  }
		},
	  }],

	build: {
      outDir: 'static-root',
      emptyOutDir: true
    },
    // PERFORMANCE OPTIMIZATIONS
    optimizeDeps: {
        // Pre-bundle heavy dependencies to avoid re-processing
        include: [
            'react',
            'react-dom',
            '@mui/material',
            '@mui/icons-material',
            '@mui/system'
        ],
        // Exclude problematic packages that cause OnIgnoreList issues
        exclude: ['@vite/client', '@vite/env']
    },
    resolve: {
        // Reduce module resolution overhead
        dedupe: ['react', 'react-dom']
    },
    esbuild: {
        // Faster than SWC for development
        target: 'esnext'
    },
    server: {
        port: 56378,
        proxy: {
            '/api': {
                target: 'http://localhost:22222', // your backend's dev server
                changeOrigin: true,
                secure: false,
            },
        },
		hmr: {
			overlay: true,
		},
        watch: {
            // Ignore heavy directories that cause OnIgnoreList slowness
            ignored: [
                '**/node_modules/**',
                '**/.git/**', 
                '**/dist/**',
                '**/static-root/**',
                '**/*.log'
            ]
        },
        fs: {
            // Allow serving files outside root for better performance
            allow: ['..']
        }
    }
})
