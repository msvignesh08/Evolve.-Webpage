#!/usr/bin/env node
/**
 * Evolve GitHub & Render 19-24 MB File Splitter / Size Auditor
 *
 * Keeps every file in the repository within GitHub's 25 MB browser upload limit
 * by splitting large binaries (such as Android APKs) into 19-24 MB parts that
 * server.ts reassembles transparently on-the-fly on Render.
 *
 * Usage:
 *   npm run check:sizes
 *   npm run split:apk -- ./Evolve-debug.apk --size-mb=20
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MIN_MB = 19;
const MAX_MB = 24;
const DEFAULT_MB = 20;
const GITHUB_WEB_LIMIT_BYTES = 24 * 1024 * 1024;

function parseArgs(argv) {
  let checkOnly = false;
  let hashOnly = false;
  let sizeMb = DEFAULT_MB;
  let inputFile = null;
  let outputDir = path.resolve(process.cwd(), 'public');

  for (const arg of argv) {
    if (arg === '--check') {
      checkOnly = true;
    } else if (arg === '--hash') {
      hashOnly = true;
    } else if (arg.startsWith('--size-mb=')) {
      const val = Number(arg.split('=')[1]);
      if (!Number.isFinite(val) || val < MIN_MB || val > MAX_MB) {
        console.error(`Error: --size-mb must be between ${MIN_MB} and ${MAX_MB} MB.`);
        process.exit(1);
      }
      sizeMb = val;
    } else if (arg.startsWith('--out-dir=')) {
      outputDir = path.resolve(process.cwd(), arg.split('=')[1]);
    } else if (!arg.startsWith('--')) {
      inputFile = path.resolve(process.cwd(), arg);
    }
  }

  return { checkOnly, hashOnly, sizeMb, inputFile, outputDir };
}

function walkRepoFiles(dir, results = []) {
  const skipDirs = new Set(['node_modules', '.git', 'dist']);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRepoFiles(fullPath, results);
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      results.push({ fullPath, size: stat.size });
    }
  }
  return results;
}

function runSizeAudit() {
  const root = process.cwd();
  const files = walkRepoFiles(root);
  const oversized = files.filter((f) => f.size > GITHUB_WEB_LIMIT_BYTES);

  console.log(`Scanned ${files.length} repository files (max single-file limit: 24 MB).`);
  if (oversized.length === 0) {
    const largest = files.reduce((a, b) => (a.size > b.size ? a : b), { fullPath: '-', size: 0 });
    console.log(
      `PASS: Every file is under 24 MB. Largest file: ${path.relative(root, largest.fullPath)} (${(largest.size / 1024).toFixed(1)} KB).`,
    );
    return;
  }

  console.warn('WARNING: Found files larger than 24 MB (exceeds GitHub 25 MB web upload cap):');
  for (const item of oversized) {
    console.warn(`  - ${path.relative(root, item.fullPath)} (${(item.size / (1024 * 1024)).toFixed(2)} MB)`);
  }
  console.warn('Run: npm run split:apk -- <path-to-file> --size-mb=20');
  process.exit(1);
}

async function splitFileIntoParts(inputPath, sizeMb, outputDir) {
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  const chunkBytes = Math.floor(sizeMb * 1024 * 1024);
  const totalBytes = fs.statSync(inputPath).size;
  const baseName = path.basename(inputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Remove stale parts for this file
  for (const existing of fs.readdirSync(outputDir)) {
    if (existing.startsWith(`${baseName}.part`) || existing === `${baseName}.parts.json`) {
      fs.unlinkSync(path.join(outputDir, existing));
    }
  }

  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(inputPath, 'r');
  const buffer = Buffer.allocUnsafe(Math.min(chunkBytes, 4 * 1024 * 1024));
  const partNames = [];

  try {
    let offset = 0;
    let partIdx = 1;

    while (offset < totalBytes) {
      const partName = `${baseName}.part${String(partIdx).padStart(3, '0')}`;
      const partPath = path.join(outputDir, partName);
      const outFd = fs.openSync(partPath, 'w');
      let writtenInPart = 0;

      try {
        while (writtenInPart < chunkBytes && offset < totalBytes) {
          const toRead = Math.min(buffer.length, chunkBytes - writtenInPart, totalBytes - offset);
          const bytesRead = fs.readSync(fd, buffer, 0, toRead, offset);
          if (bytesRead === 0) break;
          const slice = buffer.subarray(0, bytesRead);
          hash.update(slice);
          fs.writeSync(outFd, slice);
          offset += bytesRead;
          writtenInPart += bytesRead;
        }
      } finally {
        fs.closeSync(outFd);
      }

      console.log(
        `Created ${path.relative(process.cwd(), partPath)} (${(writtenInPart / (1024 * 1024)).toFixed(2)} MB)`,
      );
      partNames.push(partName);
      partIdx += 1;
    }
  } finally {
    fs.closeSync(fd);
  }

  const manifest = {
    fileName: baseName,
    totalBytes,
    chunkBytes,
    sha256: hash.digest('hex'),
    parts: partNames,
  };
  const manifestPath = path.join(outputDir, `${baseName}.parts.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`\nSplit complete: ${partNames.length} parts (${sizeMb} MB max each).`);
  console.log(`SHA-256:  ${manifest.sha256}`);
  console.log(`Manifest: ${path.relative(process.cwd(), manifestPath)}`);
  console.log(
    `Remove or move the unsplit original (> 24 MB) before uploading to GitHub. Render/server.ts will stream ${baseName} automatically from these parts.`,
  );
}

async function printSha256(inputPath) {
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(inputPath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  const digest = hash.digest('hex');
  const sizeMb = (fs.statSync(inputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`File:    ${path.basename(inputPath)} (${sizeMb} MB)`);
  console.log(`SHA-256: ${digest}`);
}

const { checkOnly, hashOnly, sizeMb, inputFile, outputDir } = parseArgs(process.argv.slice(2));

if (hashOnly && inputFile) {
  await printSha256(inputFile);
} else if (checkOnly || !inputFile) {
  runSizeAudit();
} else {
  await splitFileIntoParts(inputFile, sizeMb, outputDir);
}
