#!/usr/bin/env node
/**
 * Quick fleet URL health check.
 * Prefer the full sweep: npm run fleet:sweep
 */
import { execSync } from 'node:child_process';

try {
  execSync('npx tsx scripts/dns-sweep.ts', { stdio: 'inherit', env: process.env });
} catch {
  process.exit(1);
}