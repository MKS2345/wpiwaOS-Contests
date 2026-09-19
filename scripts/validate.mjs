#!/usr/bin/env node
// Validates every templates/*.json and events/**/*.json against its schema. Run via `npm run
// validate`; CI runs this on every push/PR (see .github/workflows/validate.yml).
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function jsonFilesIn(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await jsonFilesIn(p)));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') out.push(p);
  }
  return out;
}

async function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(await loadJson(join(ROOT, 'schema/region.schema.json')));
  const validateTemplate = ajv.compile(await loadJson(join(ROOT, 'schema/template.schema.json')));
  const validateEvent = ajv.compile(await loadJson(join(ROOT, 'schema/event.schema.json')));

  let failed = false;
  const templateIds = new Set();

  for (const file of await jsonFilesIn(join(ROOT, 'templates'))) {
    const data = await loadJson(file);
    if (!validateTemplate(data)) {
      failed = true;
      console.error(`✗ ${file}`);
      for (const e of validateTemplate.errors) console.error(`    ${e.instancePath || '/'} ${e.message}`);
    } else {
      templateIds.add(data.id);
      console.log(`✓ ${file}`);
    }
  }

  for (const file of await jsonFilesIn(join(ROOT, 'events'))) {
    const data = await loadJson(file);
    if (!validateEvent(data)) {
      failed = true;
      console.error(`✗ ${file}`);
      for (const e of validateEvent.errors) console.error(`    ${e.instancePath || '/'} ${e.message}`);
      continue;
    }
    if (!templateIds.has(data.templateId)) {
      failed = true;
      console.error(`✗ ${file}\n    templateId "${data.templateId}" has no matching templates/${data.templateId}.json`);
      continue;
    }
    if (new Date(data.end_at) <= new Date(data.start_at)) {
      failed = true;
      console.error(`✗ ${file}\n    end_at must be after start_at`);
      continue;
    }
    console.log(`✓ ${file}`);
  }

  if (failed) {
    console.error('\nValidation failed.');
    process.exit(1);
  }
  console.log('\nAll templates and events are valid.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
