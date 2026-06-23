#!/usr/bin/env node
/**
 * Quick fleet URL health check. Run: node scripts/audit-fleet-urls.mjs
 */
const URLS = [
  ['client', 'https://client.grudge-studio.com/'],
  ['armada', 'https://armada.grudge-studio.com/'],
  ['arena', 'https://grudge-arena.vercel.app/'],
  ['nemesis', 'https://nexus-nemesis-game.vercel.app/'],
  ['launcher-dev', 'https://dev.grudge-studio.com/'],
  ['launcher', 'https://launcher.grudge-studio.com/'],
  ['studio', 'https://studio.grudge-studio.com/'],
  ['api', 'https://api.grudge-studio.com/health'],
  ['id', 'https://id.grudge-studio.com/'],
  ['assets', 'https://assets.grudge-studio.com/'],
  ['standalone-DEAD', 'https://standalone-grudge.vercel.app/'],
];

for (const [name, url] of URLS) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    console.log(`${res.status} ${name.padEnd(16)} ${url}`);
  } catch (e) {
    console.log(`ERR ${name.padEnd(16)} ${url} (${e.message})`);
  }
}