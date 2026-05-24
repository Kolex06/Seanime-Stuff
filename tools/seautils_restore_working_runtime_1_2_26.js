const fs = require('fs');
const cp = require('child_process');

const version = '1.2.26';
const restoreCommit = '8c6b52a61066b39eb107a36077b1992d7ed147bf';
const manifestURI = 'https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/SeaUtils-Kolex06-Version.json';
const providerPath = 'plugins/SeaUtilsKolex06Version/provider.ts';
const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';

const oldManifestText = cp.execFileSync('git', ['show', `${restoreCommit}:${manifestPath}`], { encoding: 'utf8' });
const oldManifest = JSON.parse(oldManifestText);
const payload = oldManifest.payload.replace(/\r\n/g, '\n').replace(/\s+$/u, '');

if (!payload.includes("const dragScrollEnhancementVersion = 'v4';")) {
  throw new Error('Expected old working drag v4 runtime');
}
if (!payload.includes("const marketplaceEnhancementVersion = 'v8';")) {
  throw new Error('Expected old working marketplace v8 runtime');
}
if (!payload.includes('touch-action: pan-x pan-y !important;')) {
  throw new Error('Expected old carousel touch behavior');
}

fs.writeFileSync(providerPath, payload + '\n');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
manifest.manifestURI = manifestURI;
manifest.payload = payload;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
const entry = marketplace.find(item => item.id === 'SeaUtils-Kolex06-Version');
if (!entry) throw new Error('SeaUtils marketplace entry not found');
entry.version = version;
entry.manifestURI = manifestURI;
fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n');

let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(/(\| SeaUtils Kolex06-Version \| )[^|]+( \| `SeaUtils-Kolex06-Version` \|)/, `$1${version}$2`);
fs.writeFileSync(readmePath, readme);
