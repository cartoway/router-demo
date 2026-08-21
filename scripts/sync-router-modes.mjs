#!/usr/bin/env node

// Script to fetch router capability and compute available/disabled/unknown modes
// Usage:
//   node scripts/sync-router-modes.mjs --url "https://router.cartoway.com/0.1/capability?api_key=demo"
// Or provide API URL and key via the runtime config file:
//   ROUTER_API_BUILD_URL, ROUTER_API_KEY in .env.js

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal .env.js loader (no external dependency): evaluates the runtime config
// file and returns its `config` object.
function loadRuntimeConfig() {
  try {
    const envPath = resolve(process.cwd(), '.env.js');
    const content = readFileSync(envPath, 'utf8');
    const fn = new Function(`${content}\n;return typeof config === 'object' && config !== null ? config : {};`);
    return fn();
  } catch {}
  return {};
}

const runtimeConfig = loadRuntimeConfig();

const toList = (value) => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return null;
};

// Known modes: from config if provided, else default list
const configEnabled = toList(runtimeConfig.ENABLED_TRANSPORT_MODES);
const KNOWN_MODES = configEnabled ?? [
    'car', 'cargo_ebike', 'scooter', 'van',
    'truck_75', 'truck_10', 'truck_12', 'truck_19', 'truck_26', 'truck_32', 'truck_44',
    'bicycle', 'ebike', 'foot'
  ];

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const explicitUrl = getArg('--url');
const baseBuildUrl = typeof runtimeConfig.ROUTER_API_BUILD_URL === 'string' && runtimeConfig.ROUTER_API_BUILD_URL.trim().length > 0
  ? runtimeConfig.ROUTER_API_BUILD_URL.trim()
  : 'https://router.cartoway.com';
const apiKey = typeof runtimeConfig.ROUTER_API_KEY === 'string' && runtimeConfig.ROUTER_API_KEY.trim().length > 0
  ? runtimeConfig.ROUTER_API_KEY.trim()
  : 'demo';
const defaultUrl = `${baseBuildUrl.replace(/\/$/, '')}/0.1/capability?api_key=${encodeURIComponent(apiKey)}`;
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

    // Suggest config entry
    const envLine = `ENABLED_TRANSPORT_MODES: [${enabledKnown.map((m) => `'${m}'`).join(', ')}]`;

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
    console.log('\nAdd this to your .env.js to enable known modes:');
    console.log(envLine);
    console.log('\nReports written to scripts/routerModes.json and src/config/unknownModes.json');
  } catch (err) {
    console.error('Failed to fetch capability from: ', url, err?.message || String(err));
    process.exit(1);
  }
}

main();
