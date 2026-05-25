const fs = require('fs');

const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-search-carousel-1-2-40.yml';
const scriptPath = 'tools/fix-seautils-search-carousel-1-2-40.js';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

const manifest = readJson(manifestPath);
let payload = String(manifest.payload || '');

payload = payload.replace(
  'function enhanceExtensionCard(card) {                    function enhanceExtensionCard(card) {',
  'function enhanceExtensionCard(card) {'
);

const oldPageKeyStart = `                    function getCarouselPageKey() {
                        const path = String(window.location.pathname || '').toLowerCase();
                        const hash = String(window.location.hash || '').toLowerCase();
                        const combined = path + ' ' + hash;

                        if (
                            combined.includes('list') ||`;
const newPageKeyStart = `                    function getCarouselPageKey() {
                        const path = String(window.location.pathname || '').toLowerCase();
                        const hash = String(window.location.hash || '').toLowerCase();
                        const combined = path + ' ' + hash;

                        if (hasSearchPageSignal()) {
                            return 'search';
                        }

                        if (
                            combined.includes('list') ||`;

if (payload.includes(oldPageKeyStart)) {
  payload = payload.replace(oldPageKeyStart, newPageKeyStart);
}

payload = payload.replace(`

                        if (hasSearchPageSignal()) {
                            return 'search';
                        }

                        return 'other';
                    }
`, `

                        return 'other';
                    }
`);

const routeMarker = `                    window.__AMA_APPLY_SETTINGS__ = window.__AMA_SAVE_SETTINGS__;

                    setBodyFlags();`;
const routeInsert = `                    window.__AMA_APPLY_SETTINGS__ = window.__AMA_SAVE_SETTINGS__;

                    let lastAmaRouteKey = String(window.location.pathname || '') + String(window.location.search || '') + String(window.location.hash || '');

                    function refreshForRouteChange() {
                        const nextRouteKey = String(window.location.pathname || '') + String(window.location.search || '') + String(window.location.hash || '');
                        if (nextRouteKey === lastAmaRouteKey) return;

                        lastAmaRouteKey = nextRouteKey;
                        setBodyFlags();

                        if (!areCarouselsEnabledForCurrentPage()) {
                            cleanupCarousels(document);
                        }

                        scheduleRoot(document.body || document.documentElement);
                    }

                    window.addEventListener('popstate', refreshForRouteChange);
                    window.addEventListener('hashchange', refreshForRouteChange);
                    setInterval(refreshForRouteChange, 500);

                    setBodyFlags();`;

if (!payload.includes('function refreshForRouteChange()')) {
  if (!payload.includes(routeMarker)) throw new Error('Route marker not found');
  payload = payload.replace(routeMarker, routeInsert);
}

if (payload.includes('function enhanceExtensionCard(card) {                    function enhanceExtensionCard(card) {')) {
  throw new Error('Duplicate enhanceExtensionCard still present');
}
if (!payload.includes("if (hasSearchPageSignal()) {\n                            return 'search';")) {
  throw new Error('Search route priority fix missing');
}
if (!payload.includes('function refreshForRouteChange()')) {
  throw new Error('Route refresh fix missing');
}

manifest.version = '1.2.40';
manifest.payload = payload;
writeJson(manifestPath, manifest);

const marketplace = readJson(marketplacePath);
for (const extension of marketplace) {
  if (extension.id === 'SeaUtils-Kolex06-Version') extension.version = '1.2.40';
}
writeJson(marketplacePath, marketplace);

let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(/1\.2\.38|1\.2\.39/g, '1.2.40');
fs.writeFileSync(readmePath, readme);

fs.rmSync(scriptPath, { force: true });
fs.rmSync(workflowPath, { force: true });
