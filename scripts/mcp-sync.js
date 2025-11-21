#!/usr/bin/env node
/**
 * Placeholder sync script for MCP data generation.
 * Intended to be replaced with a real extractor that runs `track --help --json`
 * and writes data into src/mcp/data/*.json.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const baseData = {
    data: { commands: [] },
    lastUpdated: new Date().toISOString(),
    schemaVersion: 1,
    etag: `placeholder-${Date.now()}`,
  };

  const target = resolve(__dirname, '../src/mcp/data/commands.json');
  await writeFile(target, `${JSON.stringify(baseData, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log('Wrote placeholder commands.json. Replace with real extraction logic.');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('mcp:sync failed', error);
  process.exitCode = 1;
});
