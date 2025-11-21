#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
/**
 * Generate MCP metadata JSON files from a single source of truth.
 * Keeps payloads tiny and deterministic for agent consumption.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION } from '../dist/mcp/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'src/mcp/data');

function hashObject(obj) {
  const json = JSON.stringify(obj);
  const hash = createHash('sha1').update(json).digest('hex').slice(0, 12);
  return { json, etag: hash };
}

function makeEnvelope(data) {
  const lastUpdated = new Date().toISOString();
  const { json, etag } = hashObject(data);
  return {
    envelope: {
      data,
      lastUpdated,
      schemaVersion: SCHEMA_VERSION,
      etag,
    },
    json,
  };
}

async function writeEnvelope(filename, envelopeJson) {
  await mkdir(DATA_DIR, { recursive: true });
  const target = resolve(DATA_DIR, filename);
  await writeFile(target, `${envelopeJson}\n`, 'utf8');
  console.log(`wrote ${filename}`);
}

async function main() {
  const pkgRaw = await readFile(resolve(ROOT, 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);

  const versionPayload = { cli: `track-cli ${pkg.version}`, schema: SCHEMA_VERSION };
  const statePayload = { cwd: '', defaultConfig: '.track/config.json' };

  const { envelope: versionEnv } = makeEnvelope(versionPayload);
  const { envelope: stateEnv } = makeEnvelope(statePayload);

  await writeEnvelope('version.json', JSON.stringify(versionEnv, null, 2));
  await writeEnvelope('state.json', JSON.stringify(stateEnv, null, 2));

  console.log('Note: quickstart.json and recipes.json are maintained as static files');
}

main().catch((error) => {
  console.error('mcp:sync failed', error);
  process.exitCode = 1;
});
