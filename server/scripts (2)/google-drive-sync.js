#!/usr/bin/env node

/**
 * Google Drive → Local sync
 * - Recursively downloads assets from a shared Drive folder
 * - Writes to attached_assets/drive/<subpaths>
 * - Designed to run in CI (GitHub Actions, Vercel), but safely no-ops if creds missing
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1qEtqs7DJcZE24MV55NwVltmUd-PQT4L8';
const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const LOCAL_SA_PATH = path.resolve(process.cwd(), 'drive-service-account.json');
const OUTPUT_DIR = path.resolve(process.cwd(), 'attached_assets', 'drive');

async function main() {
  // Resolve credentials (env or local file) and safe no-op if still missing
  let rawCred = SA_JSON;
  if (!rawCred && fs.existsSync(LOCAL_SA_PATH)) {
    rawCred = fs.readFileSync(LOCAL_SA_PATH, 'utf8');
    console.log(`🔑 Using local service account file: ${path.basename(LOCAL_SA_PATH)}`);
  }

  if (!rawCred || !DRIVE_FOLDER_ID) {
    console.log('ℹ️  Skipping Google Drive sync (missing GOOGLE_SERVICE_ACCOUNT_JSON and no local drive-service-account.json, or missing DRIVE_FOLDER_ID)');
    process.exit(0);
    return;
  }

  // Parse service account JSON (supports raw JSON or base64-encoded)
  let creds;
  try {
    const raw = rawCred.trim();
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    creds = JSON.parse(json);
  } catch (e) {
    console.error('❌ Failed to parse service account JSON:', e?.message || e);
    process.exit(1);
  }

  // Auth
  const auth = google.auth.fromJSON(creds);
  auth.scopes = ['https://www.googleapis.com/auth/drive.readonly'];
  const drive = google.drive({ version: 'v3', auth });

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`🔄 Syncing Google Drive folder ${DRIVE_FOLDER_ID} → ${path.relative(process.cwd(), OUTPUT_DIR)}`);

  // BFS through folders, tracking their relative path
  const queue = [{ id: DRIVE_FOLDER_ID, rel: '' }];
  let filesDownloaded = 0;
  let foldersProcessed = 0;

  while (queue.length) {
    const { id, rel } = queue.shift();
    foldersProcessed++;

    // List items under current folder
    let pageToken = undefined;
    do {
      const res = await drive.files.list({
        q: `'${id}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageToken,
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const items = res.data.files || [];
      for (const item of items) {
        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
        if (isFolder) {
          const nextRel = path.join(rel, item.name);
          queue.push({ id: item.id, rel: nextRel });
        } else {
          // Skip Google Docs/Sheets/Slides exports (not relevant to assets)
          if (item.mimeType?.startsWith('application/vnd.google-apps')) continue;

          const destDir = path.join(OUTPUT_DIR, rel);
          const destPath = path.join(destDir, item.name);
          fs.mkdirSync(destDir, { recursive: true });

          // Download file stream
          try {
            const dest = fs.createWriteStream(destPath);
            const resp = await drive.files.get(
              { fileId: item.id, alt: 'media' },
              { responseType: 'stream' }
            );

            await new Promise((resolve, reject) => {
              resp.data
                .on('error', (err) => reject(err))
                .pipe(dest)
                .on('finish', resolve)
                .on('error', reject);
            });

            filesDownloaded++;
            console.log(`  ✓ ${path.join(rel, item.name)}`);
          } catch (err) {
            console.warn(`  ✗ Failed ${path.join(rel, item.name)}:`, err?.message || err);
          }
        }
      }

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);
  }

  console.log(`\n✅ Drive sync complete. Folders: ${foldersProcessed}, Files downloaded: ${filesDownloaded}`);
}

main().catch((e) => {
  console.error('❌ Drive sync error:', e?.message || e);
  process.exit(1);
});
