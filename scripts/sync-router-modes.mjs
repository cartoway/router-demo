#!/usr/bin/env node

// Script to fetch router capability and compute available/disabled/unknown modes
// Usage:
//   node scripts/sync-router-modes.mjs --url "https://router.cartoway.com/0.1/capability?api_key=demo"
// Or provide API URL and key via env vars:
//   VITE_ROUTER_API_URL, VITE_ROUTER_API_KEY

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal .env loader (no external dependency)
function loadDotEnv() {
  try {
    const dotenvPath = resolve(process.cwd(), '.env');
    const content = readFileSync(dotenvPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
  } catch {}
}

loadDotEnv();

// Known modes: from env if provided, else default list
const envEnabled = process.env.VITE_ENABLED_TRANSPORT_MODES;
const KNOWN_MODES = envEnabled && envEnabled.trim().length > 0
  ? envEnabled.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'car', 'cargo_bike', 'scooter', 'van',
      'truck_19', 'truck_75', 'truck_12', 'truck_26', 'truck_32', 'truck_44',
      'bicycle', 'foot'
    ];

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const explicitUrl = getArg('--url');
const baseUrl = process.env.VITE_ROUTER_API_URL || 'https://router.cartoway.com';
const apiKey = process.env.VITE_ROUTER_API_KEY || 'demo';
const defaultUrl = `${baseUrl.replace(/\/$/, '')}/0.1/capability?api_key=${encodeURIComponent(apiKey)}`;
const url = explicitUrl || defaultUrl;

async function main() {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'router-demo-sync/1.0' } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    const available = new Set();
    const arr = Array.isArray(data?.route) ? data.route : [];
    for (const entry of arr) {
      if (entry && typeof entry.mode === 'string') {
        available.add(entry.mode);
      }
    }

    const availableModes = Array.from(available);
    const knownSet = new Set(KNOWN_MODES);

    const enabledKnown = availableModes.filter(m => knownSet.has(m));
    const disabledKnown = KNOWN_MODES.filter(m => !available.has(m));
    const unknown = availableModes.filter(m => !knownSet.has(m));

    // Suggest ENV line
    const envLine = `VITE_ENABLED_TRANSPORT_MODES=${enabledKnown.join(',')}`;

    const summary = {
      fetchedFrom: url,
      availableModes,
      enabledKnown,
      disabledKnown,
      unknown,
      envSuggestion: envLine,
      timestamp: new Date().toISOString(),
    };

    // Write JSON reports
    const fs = await import('node:fs/promises');
    await fs.writeFile('scripts/routerModes.json', JSON.stringify(summary, null, 2), 'utf8');

    // Ensure target dir exists and write unknown and available modes for app import
    await fs.mkdir('src/config', { recursive: true });
    await fs.writeFile('src/config/unknownModes.json', JSON.stringify(unknown, null, 2), 'utf8');
    await fs.writeFile('src/config/availableModes.json', JSON.stringify(availableModes, null, 2), 'utf8');

    // Print concise output
    console.log('Available modes:', availableModes.join(','));
    console.log('Enabled (known):', enabledKnown.join(','));
    console.log('Disabled (known):', disabledKnown.join(','));
    console.log('Unknown (add on the fly if needed):', unknown.join(','));
    console.log('\nAdd this to your .env to enable known modes:');
    console.log(envLine);
    console.log('\nReports written to scripts/routerModes.json and src/config/unknownModes.json');
  } catch (err) {
    console.error('Failed to fetch capability:', err?.message || String(err));
    process.exit(1);
  }
}

main();
