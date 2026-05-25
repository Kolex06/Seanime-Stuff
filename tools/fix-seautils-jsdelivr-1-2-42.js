const fs = require('fs');

const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-jsdelivr-1-2-42.yml';
const scriptPath = 'tools/fix-seautils-jsdelivr-1-2-42.js';
const manifestUri = 'https://cdn.jsdelivr.net/gh/Kolex06/Seanime-Stuff@main/plugins/SeaUtils-Kolex06-Version.json';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

const manifest = readJson(manifestPath);
let payload = String(manifest.payload || '');
payload = payload.replace('function enhanceExtensionCard(card) {                    function enhanceExtensionCard(card) {', 'function enhanceExtensionCard(card) {');

if (!payload.includes("if (hasSearchPageSignal()) {\n                            return 'search';")) throw new Error('Search route priority fix missing');
if (!payload.includes('function refreshForRouteChange()')) throw new Error('Route refresh fix missing');
if (payload.includes('function enhanceExtensionCard(card) {                    function enhanceExtensionCard(card) {')) throw new Error('Duplicate enhanceExtensionCard still present');

manifest.version = '1.2.42';
manifest.manifestURI = manifestUri;
manifest.payload = payload;
writeJson(manifestPath, manifest);

const marketplace = readJson(marketplacePath);
for (const extension of marketplace) {
  if (extension.id === 'SeaUtils-Kolex06-Version') {
    extension.version = '1.2.42';
    extension.manifestURI = manifestUri;
  }
}
writeJson(marketplacePath, marketplace);

let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(/1\.2\.38|1\.2\.39|1\.2\.40|1\.2\.41/g, '1.2.42');
readme = readme.replace(/https:\/\/raw\.githubusercontent\.com\/Kolex06\/Seanime-Stuff\/(refs\/heads\/main|main)\/plugins\/SeaUtils-Kolex06-Version\.json/g, manifestUri);
fs.writeFileSync(readmePath, readme);

fs.rmSync(scriptPath, { force: true });
fs.rmSync(workflowPath, { force: true });
