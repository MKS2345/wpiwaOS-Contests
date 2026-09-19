#!/usr/bin/env node
// Regenerates templates/index.json and events/index.json from the individual files, so apps can
// browse the library with two cheap fetches instead of listing the GitHub tree. Run via
// `npm run build-index` (or `npm run check`, which also validates); CI checks the committed
// index files are up to date.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const templatesDir = join(ROOT, 'templates');
  const templateFiles = (await jsonFilesIn(templatesDir)).sort();
  const templateIndex = [];
  for (const file of templateFiles) {
    const t = await loadJson(file);
    templateIndex.push({ id: t.id, name: t.name, short: t.short, description: t.description, file: relative(templatesDir, file) });
  }
  await writeFile(join(templatesDir, 'index.json'), JSON.stringify(templateIndex, null, 2) + '\n');

  const eventsDir = join(ROOT, 'events');
  const eventFiles = (await jsonFilesIn(eventsDir)).sort();
  const eventIndex = [];
  for (const file of eventFiles) {
    const e = await loadJson(file);
    eventIndex.push({ id: e.id, templateId: e.templateId, name: e.name, year: e.year, start_at: e.start_at, end_at: e.end_at, file: relative(eventsDir, file) });
  }
  eventIndex.sort((a, b) => a.start_at.localeCompare(b.start_at));
  await writeFile(join(eventsDir, 'index.json'), JSON.stringify(eventIndex, null, 2) + '\n');

  console.log(`templates/index.json: ${templateIndex.length} entries`);
  console.log(`events/index.json: ${eventIndex.length} entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
