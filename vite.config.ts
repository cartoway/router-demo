/*
 * Copyright (C) 2025 Cartoway
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Serve .env.js at /env.js (dev) and copy it to dist/env.js (build).
// The deployed file can be overridden at runtime (e.g. Docker volume mount).
const ENV_SOURCE = '.env.js';
const ENV_PUBLIC_PATH = '/env.js';

function runtimeEnvPlugin(): Plugin {
  return {
    name: 'runtime-env-js',
    configureServer(server) {
      server.middlewares.use(ENV_PUBLIC_PATH, (_req, res, next) => {
        if (!existsSync(ENV_SOURCE)) return next();
        res.setHeader('Content-Type', 'text/javascript');
        res.end(readFileSync(ENV_SOURCE));
      });
    },
    closeBundle() {
      if (existsSync(ENV_SOURCE)) {
        copyFileSync(ENV_SOURCE, resolve(process.cwd(), 'dist', 'env.js'));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), runtimeEnvPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  worker: {
    format: 'es',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
