const fs = require('fs');

const VERSION = '1.2.36';
const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-carousel-detection-fix.yml';
const scriptPath = '.github/scripts/fix-seautils-carousel-detection.js';

function replaceBetween(source, start, end, replacement) {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) throw new Error('Missing start marker: ' + start);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex === -1) throw new Error('Missing end marker: ' + end);
  return source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let payload = manifest.payload || '';
if (!payload) throw new Error('SeaUtils manifest is missing inline payload');

const helpers = `                    function hasSearchPageSignal() {
                        const path = String(window.location.pathname || '').toLowerCase();
                        const hash = String(window.location.hash || '').toLowerCase();
                        const combined = path + ' ' + hash;

                        if (/(^|[\\/#?&=-])search($|[\\/#?&=-])/.test(combined)) return true;
                        if (document.querySelector('[data-search-page="true"], [data-search-results="true"], [data-media-search-page="true"]')) return true;

                        return false;
                    }

                    function getCarouselPageKey() {
                        const path = String(window.location.pathname || '').toLowerCase();
                        const hash = String(window.location.hash || '').toLowerCase();
                        const combined = path + ' ' + hash;

                        if (
                            combined.includes('list') ||
                            combined.includes('collection') ||
                            combined.includes('library') ||
                            document.querySelector('[data-anilist-collection-lists="true"], [data-anilist-collection-lists-tabs]')
                        ) {
                            return 'lists';
                        }

                        if (
                            combined.includes('manga') ||
                            combined.includes('novel') ||
                            combined.includes('book') ||
                            document.querySelector('[data-manga-page-container="true"], [data-manga-entry-screen="true"], [data-manga-entry-page="true"]')
                        ) {
                            return 'manga';
                        }

                        if (hasSearchPageSignal()) {
                            return 'search';
                        }

                        return 'other';
                    }

`;

if (payload.includes('                    function getCarouselPageKey() {')) {
  payload = replaceBetween(payload, '                    function getCarouselPageKey() {', '                    function areCarouselsEnabledForCurrentPage() {', helpers + '                    function areCarouselsEnabledForCurrentPage() {');
} else if (!payload.includes('function hasSearchPageSignal()')) {
  throw new Error('Could not find carousel page detector');
}

manifest.version = VERSION;
manifest.payload = payload;
delete manifest.payloadURI;
delete manifest.payloadURL;

const required = {
  hasSearchSignal: payload.includes('function hasSearchPageSignal()'),
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
