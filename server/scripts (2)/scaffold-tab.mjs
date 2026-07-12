#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/scaffold-tab.mjs <slug> [Title...]');
  process.exit(1);
}
const title = process.argv.slice(3).join(' ') || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const tabDir = path.join(root, 'apps', slug);
const clientDir = path.join(root, 'client', 'src', 'tabs', slug);
const assetDir = path.join(root, 'attached_assets', 'tabs', slug);

fs.mkdirSync(tabDir, { recursive: true });
fs.mkdirSync(clientDir, { recursive: true });
fs.mkdirSync(path.join(assetDir, 'sprites'), { recursive: true });
fs.mkdirSync(path.join(assetDir, 'models'), { recursive: true });

const tabConfig = {
  slug,
  title,
  version: '0.0.1',
  description: `${title} tab`,
  routes: [{ path: `/${slug}`, entry: `tabs/${slug}/index.tsx` }],
  assets: {
    sprites: `assets/${slug}/sprites/`,
    models: `assets/${slug}/models/`
  }
};

fs.writeFileSync(path.join(tabDir, 'tab.config.json'), JSON.stringify(tabConfig, null, 2));

const readme = `# ${title}\n\nThis folder tracks metadata and packaging for the '${slug}' tab.\n`;
fs.writeFileSync(path.join(tabDir, 'README.md'), readme);

const pageTsx = `import React from 'react';\nexport default function ${slug.replace(/[-_](\w)/g, (_,c)=>c.toUpperCase()).replace(/^(\w)/,(_,c)=>c.toUpperCase())}() {\n  return (<div style={{color:'#fff'}}>\n    <h1>${title}</h1>\n    <p>Scaffolded tab '${slug}'. Add content in client/src/tabs/${slug}/</p>\n  </div>);\n}\n`;
fs.writeFileSync(path.join(clientDir, 'index.tsx'), pageTsx);

// Update or create tabs registry
const registryPath = path.join(root, 'client', 'src', 'tabs.registry.json');
let registry = [];
if (fs.existsSync(registryPath)) {
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf8')); } catch {}
}
if (!registry.find(t => t.slug === slug)) {
  registry.push({ slug, title, entry: `tabs/${slug}/index.tsx` });
  registry.sort((a,b)=>a.slug.localeCompare(b.slug));
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

console.log(`✅ Scaffolded tab '${slug}'`);
console.log(`- App code: client/src/tabs/${slug}`);
console.log(`- Assets: attached_assets/tabs/${slug}`);
console.log(`- Config: apps/${slug}/tab.config.json`);
