import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
// If deploying to GitHub Pages at https://<user>.github.io/<repo>/ set base to '/<repo-name>/'
// Use an environment variable fallback to allow local dev unaffected.
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : 'B.E.S.T-Behavior-App';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? `/${repoName}/` : '/',
  plugins: [react()],
  // Expose public envs to the client
  // Accept VITE_ (Vite default), NEXT_PUBLIC_ (Next-style), and SUPABASE_* for convenience
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          lucide: ['lucide-react'],
          router: ['react-router-dom'],
          datefns: ['date-fns'],
        }
      }
    }
  },
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      clientPort: 5173,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
