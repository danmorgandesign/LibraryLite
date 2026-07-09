import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/LibraryLite/', // served from https://danmorgandesign.github.io/LibraryLite/
  plugins: [react()],
});
