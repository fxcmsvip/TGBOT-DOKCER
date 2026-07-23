import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['iife'],
      name: '__acp_plugin_init',
      fileName: () => 'remoteEntry.js',
    },
    outDir: 'dist',
    rollupOptions: {
      // Use host app's shared libs from window globals
      external: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          '@tanstack/react-query': 'TanStackReactQuery',
        },
      },
    },
  },
})
