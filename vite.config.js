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
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // Large chart library
            if (id.includes('recharts')) {
              return 'recharts';
            }
            // PDF generation
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-libs';
            }
            // UI libraries
            if (id.includes('@radix-ui')) {
              return 'radix-ui';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-fns';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // OpenAI
            if (id.includes('openai')) {
              return 'openai';
            }
            // Other vendor libraries
            return 'vendor';
          }
          
          // App chunks
          if (id.includes('/src/pages/')) {
            const pageName = id.split('/pages/')[1].split('.')[0];
            return `page-${pageName}`;
          }
          
          if (id.includes('/src/components/')) {
            // Group heavy components
            if (id.includes('dashboard') || id.includes('kpi')) {
              return 'dashboard-components';
            }
            if (id.includes('behavior') || id.includes('evaluation')) {
              return 'behavior-components';
            }
            if (id.includes('print')) {
              return 'print-components';
            }
            return 'ui-components';
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.jsx', '').replace('.js', '') : 'chunk';
          return `assets/[name]-[hash].js`;
        },
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
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge'
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
