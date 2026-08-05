import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/', // served from custom domain librarylite.danmorgan.co.uk
  plugins: [react()],
});
