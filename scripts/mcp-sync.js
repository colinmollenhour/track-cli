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
import { commandMetadata } from '../dist/commands/metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'src/mcp/data');
const SCHEMA_VERSION = 1;

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
  const commandsPayload = {
    commands: commandMetadata.map((cmd) => ({
      name: cmd.name,
      summary: cmd.summary,
      args: cmd.args,
      usage: cmd.usage,
      flags: cmd.flags.map((flag) => {
        const { cliFlag, ...flagRest } = flag;
        void cliFlag;
        return flagRest;
      }),
    })),
  };
  const examplesPayload = {
    examples: commandMetadata.map(({ name, example }) => ({ name, example })),
  };
  const versionPayload = { cli: `track-cli ${pkg.version}`, schema: SCHEMA_VERSION };
  const statePayload = { cwd: '', defaultConfig: '.track/config.json' };

  const { envelope: commandsEnv } = makeEnvelope(commandsPayload);
  const { envelope: examplesEnv } = makeEnvelope(examplesPayload);
  const { envelope: versionEnv } = makeEnvelope(versionPayload);
  const { envelope: stateEnv } = makeEnvelope(statePayload);

  await writeEnvelope('commands.json', JSON.stringify(commandsEnv, null, 2));
  await writeEnvelope('examples.json', JSON.stringify(examplesEnv, null, 2));
  await writeEnvelope('version.json', JSON.stringify(versionEnv, null, 2));
  await writeEnvelope('state.json', JSON.stringify(stateEnv, null, 2));
}

main().catch((error) => {
  console.error('mcp:sync failed', error);
  process.exitCode = 1;
});
