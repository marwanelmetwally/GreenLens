import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isGitHubPagesBuild = Boolean(
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GITHUB_ACTIONS,
);

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' || isGitHubPagesBuild ? '/GreenLens/' : '/',
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
}));
