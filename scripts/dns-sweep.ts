#!/usr/bin/env tsx
/**
 * Bulk DNS + HTTP sweep for grudge-studio.com fleet.
 * Usage: npx tsx scripts/dns-sweep.ts
 */
import { ALL_FLEET_ENTRIES, BLOCKLIST_URLS, FLEET_DNS_ALIASES, validateFleetRegistry } from '../shared/fleetEras';

const ZONE_ID = process.env.CF_ZONE_ID || 'e8c0c2ee3063f24eb31affddabf9730a';
const TOKEN = process.env.CF_TOKEN_HELPER || process.env.CF_DNS_API_TOKEN;

async function cfDns() {
  if (!TOKEN) {
    console.warn('No CF token — skipping DNS audit');
    return [];
  }
  const h = { Authorization: `Bearer ${TOKEN}` };
  let page = 1;
  const all: Array<{ name: string; type: string; content: string }> = [];
  while (true) {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100&page=${page}`,
      { headers: h },
    );
    const j = await r.json();
    if (!j.success) throw new Error(JSON.stringify(j.errors));
    all.push(...j.result);
    if (page >= j.result_info.total_pages) break;
    page++;
  }
  return all.filter((rec) => rec.name.endsWith('grudge-studio.com'));
}

async function probe(url: string): Promise<number | 'ERR'> {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return r.status;
  } catch {
    return 'ERR';
  }
}

async function main() {
  const conflicts = validateFleetRegistry();
  console.log('=== Fleet Registry Validation ===');
  if (conflicts.length === 0) {
    console.log('✓ No era/subdomain conflicts');
  } else {
    for (const c of conflicts) console.log(`✗ ${c}`);
    process.exitCode = 1;
  }

  console.log('\n=== Fleet Era Canonical URLs ===');
  for (const e of ALL_FLEET_ENTRIES) {
    const code = await probe(e.canonicalUrl);
    const flag = code === 200 ? '✓' : code === 'ERR' ? '✗' : '!';
    console.log(`${flag} [${e.era}] ${e.id.padEnd(18)} ${code}  ${e.canonicalUrl}`);
  }

  console.log('\n=== Blocklist (must stay dead) ===');
  for (const url of BLOCKLIST_URLS) {
    const code = await probe(url);
    console.log(`${code === 404 ? '✓ dead' : '! ALIVE'} ${url}`);
  }

  const dns = await cfDns();
  const canonicalHosts = new Set(
    ALL_FLEET_ENTRIES.map((e) => new URL(e.canonicalUrl).hostname).filter((h) => h.endsWith('.grudge-studio.com')),
  );
  const dnsHosts = new Set(dns.map((r) => r.name));

  console.log('\n=== Missing DNS (canonical host, no CF record) ===');
  let missing = 0;
  for (const h of canonicalHosts) {
    if (!dnsHosts.has(h)) {
      console.log(`  MISSING  ${h}`);
      missing++;
    }
  }
  if (missing === 0) console.log('  (none)');

  const aliasHosts = new Set(FLEET_DNS_ALIASES.map((a) => a.host));
  console.log('\n=== Known DNS aliases (not canonical) ===');
  for (const a of FLEET_DNS_ALIASES) {
    const present = dnsHosts.has(a.host) ? '✓' : '✗ missing';
    console.log(`  ${present} [${a.era}] ${a.host} → ${a.canonicalId}${a.notes ? ` (${a.notes})` : ''}`);
  }

  console.log('\n=== Unregistered DNS (no canonical or alias) ===');
  let orphans = 0;
  for (const r of dns) {
    if (['MX', 'TXT', 'NS'].includes(r.type)) continue;
    const skip = r.name === 'grudge-studio.com' || r.name === 'www.grudge-studio.com';
    if (!canonicalHosts.has(r.name) && !aliasHosts.has(r.name) && !skip) {
      console.log(`  ORPHAN   ${r.type} ${r.name} → ${r.content}`);
      orphans++;
    }
  }
  if (orphans === 0) console.log('  (none)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});