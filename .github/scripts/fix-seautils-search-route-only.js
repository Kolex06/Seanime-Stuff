const fs = require('fs');

const VERSION = '1.2.37';
const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-search-route-only-fix.yml';
const scriptPath = '.github/scripts/fix-seautils-search-route-only.js';

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let payload = manifest.payload || '';
if (!payload) throw new Error('SeaUtils manifest is missing inline payload');

payload = payload.replace("                        if (document.querySelector('[data-search-page=\"true\"], [data-search-results=\"true\"], [data-media-search-page=\"true\"]')) return true;\n\n", '');

manifest.version = VERSION;
manifest.payload = payload;
delete manifest.payloadURI;
delete manifest.payloadURL;

const required = {
  noDomSearchDetection: !payload.includes('data-search-results') && !payload.includes('data-search-page') && !payload.includes('data-media-search-page'),
  noBrowseAsSearch: !payload.includes("combined.includes('browse')"),
  noDiscoverAsSearch: !payload.includes("combined.includes('discover')"),
  activeCss: payload.includes('data-ama-carousels-active="true"'),
  oldGlobalCssGone: !payload.includes('body[data-ama-carousels="true"]'),
  pageToggles: payload.includes('Carousels: Search') && payload.includes('Carousels: Other Pages'),
  fullCatalogStillFixed: payload.includes('resolveCodePayloadForCard') && payload.includes('flex-direction: row !important')
};
for (const [key, ok] of Object.entries(required)) {
  if (!ok) throw new Error('Validation failed: ' + key);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
const extensions = Array.isArray(marketplace) ? marketplace : marketplace.extensions;
const entry = extensions.find(extension => String(extension.id).toLowerCase() === 'seautils-kolex06-version' || extension.name === 'SeaUtils Kolex06-Version');
if (!entry) throw new Error('Missing SeaUtils marketplace entry');
entry.version = VERSION;
fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n');

let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(/SeaUtils Kolex06-Version \| [0-9.]+ \|/g, `SeaUtils Kolex06-Version | ${VERSION} |`);
fs.writeFileSync(readmePath, readme);

fs.rmSync(workflowPath, { force: true });
fs.rmSync(scriptPath, { force: true });
