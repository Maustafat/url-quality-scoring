import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to your GitHub repo name for GitHub Pages deployment.
// e.g. if your repo is github.com/you/url-quality-engine, set base to '/url-quality-engine/'
// For local dev this is ignored.
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || ''

export default defineConfig({
  plugins: [react()],
  base: GITHUB_REPO_NAME ? `/${GITHUB_REPO_NAME}/` : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
