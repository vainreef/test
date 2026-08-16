import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (process.platform !== 'darwin') {
  console.error('This script is for macOS. Use npm run package:msix on Windows.');
  process.exit(1);
}

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, '..');
const outDir = path.join(projectRoot, 'out');
const electronDir = path.join(outDir, 'ZQTextSandbox8F4K2-win32-x64');
const stageDir = path.join(outDir, 'ZQTextSandbox8F4K2-msix-stage');
const verifyDir = path.join(outDir, 'ZQTextSandbox8F4K2-msix-verify');
const manifestSource = path.join(projectRoot, 'Package.appxmanifest');
const manifestTarget = path.join(stageDir, 'AppxManifest.xml');
const assetsSource = path.join(projectRoot, 'Assets');
const makemsixCandidates = [
  process.env.MSIX_MAKEMSIX,
  path.join(projectRoot, '.tools', 'makemsix', 'makemsix'),
].filter(Boolean);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
  return result.stdout;
}

function findMakemsix() {
  for (const candidate of makemsixCandidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    'makemsix was not found. Run: bash scripts/build-makemsix-mac.sh',
  );
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&apos;');
}

function applyStoreIdentity(manifest) {
  const identityName = process.env.STORE_IDENTITY_NAME;
  const publisher = process.env.STORE_PUBLISHER;
  const publisherDisplayName = process.env.STORE_PUBLISHER_DISPLAY_NAME;
  let result = manifest
    .replaceAll('YOUR_STORE_IDENTITY_NAME', identityName || '38959708.ZQTextSandbox8F4K2')
    .replaceAll('CN=YOUR_STORE_PUBLISHER', publisher || 'CN=C6CECE36-E415-4146-A175-E0B24E2A5BE2')
    .replaceAll('YOUR_PUBLISHER_DISPLAY_NAME', publisherDisplayName || '罗运来');

  if (identityName) {
    result = result.replace(
      /(<Identity\b[^>]*\bName=")[^"]*(")/s,
      `$1${xmlEscape(identityName)}$2`,
    );
  }
  if (publisher) {
    result = result.replace(
      /(<Identity\b[^>]*\bPublisher=")[^"]*(")/s,
      `$1${xmlEscape(publisher)}$2`,
    );
  }
  if (publisherDisplayName) {
    result = result.replace(
      /(<PublisherDisplayName>)[\s\S]*?(<\/PublisherDisplayName>)/,
      `$1${xmlEscape(publisherDisplayName)}$2`,
    );
  }
  return result;
}

function readManifestVersion(manifest) {
  const match = manifest.match(/<Identity\b[^>]*\bVersion="([^"]+)"/s);
  return match?.[1] || '1.0.0.0';
}

async function main() {
  const makemsix = findMakemsix();
  if (!fs.existsSync(manifestSource)) throw new Error('Package.appxmanifest was not found.');
  if (!fs.existsSync(assetsSource)) throw new Error('Assets directory was not found.');

  console.log('[1/5] Building the Windows x64 Electron layout...');
  run('npm', ['run', 'package:win']);
  if (!fs.existsSync(electronDir)) {
    throw new Error(`Packaged Electron folder was not created: ${electronDir}`);
  }

  console.log('[2/5] Creating a clean MSIX staging directory...');
  await fs.promises.rm(stageDir, { recursive: true, force: true });
  await fs.promises.rm(verifyDir, { recursive: true, force: true });
  await fs.promises.mkdir(stageDir, { recursive: true });
  await fs.promises.cp(electronDir, stageDir, { recursive: true });

  const manifest = applyStoreIdentity(await fs.promises.readFile(manifestSource, 'utf8'));
  await fs.promises.writeFile(manifestTarget, manifest, 'utf8');
  await fs.promises.cp(assetsSource, path.join(stageDir, 'Assets'), { recursive: true });

  const version = readManifestVersion(manifest);
  const msixPath = path.join(outDir, `ZQTextSandbox8F4K2_${version}_x64.msix`);
  await fs.promises.rm(msixPath, { force: true });

  console.log('[3/5] Packing with Microsoft MSIX SDK makemsix...');
  run(makemsix, ['pack', '-d', stageDir, '-p', msixPath]);

  console.log('[4/5] Verifying the generated package...');
  await fs.promises.mkdir(verifyDir, { recursive: true });
  run(makemsix, ['unpack', '-ss', '-p', msixPath, '-d', verifyDir]);
  const requiredFiles = ['AppxManifest.xml', 'AppxBlockMap.xml'];
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(verifyDir, file)));
  const packageListing = capture('unzip', ['-l', msixPath]);
  if (!packageListing.includes('[Content_Types].xml')) missing.push('[Content_Types].xml');
  await fs.promises.rm(verifyDir, { recursive: true, force: true });
  if (missing.length) throw new Error(`MSIX verification is missing: ${missing.join(', ')}`);
  await fs.promises.rm(stageDir, { recursive: true, force: true });

  console.log('[5/5] Done.');
  console.log(`MSIX: ${msixPath}`);
  console.log('Upload this .msix file in Partner Center → Product release → Start submission → Packages.');
}

main().catch((error) => {
  console.error(`\nMSIX packaging failed: ${error.message}`);
  console.error(`Staging directory kept for inspection: ${stageDir}`);
  process.exit(1);
});
