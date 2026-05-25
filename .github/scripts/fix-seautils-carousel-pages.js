const fs = require('fs');

const VERSION = '1.2.35';
const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-carousel-pages-fix.yml';
const scriptPath = '.github/scripts/fix-seautils-carousel-pages.js';

function insertAfter(source, anchor, addition) {
  if (!source.includes(anchor)) throw new Error('Missing anchor: ' + anchor);
  return source.replace(anchor, anchor + addition);
}

function replaceRequired(source, from, to) {
  if (!source.includes(from)) throw new Error('Missing text: ' + from.slice(0, 80));
  return source.replace(from, to);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let payload = manifest.payload || '';
if (!payload) throw new Error('SeaUtils manifest is missing inline payload');

if (!payload.includes('carouselsSearch: boolean')) {
  payload = insertAfter(payload, '    carousels: boolean\n', '    carouselsSearch: boolean\n    carouselsLists: boolean\n    carouselsManga: boolean\n    carouselsOther: boolean\n');
}

if (!payload.includes('carouselsSearch: false')) {
  payload = insertAfter(payload, '            carousels: true,\n', '            carouselsSearch: false,\n            carouselsLists: true,\n            carouselsManga: true,\n            carouselsOther: true,\n');
  payload = insertAfter(payload, '                carousels: saved.carousels !== false,\n', '                carouselsSearch: saved.carouselsSearch === true,\n                carouselsLists: saved.carouselsLists !== false,\n                carouselsManga: saved.carouselsManga !== false,\n                carouselsOther: saved.carouselsOther !== false,\n');
}

if (!payload.includes('const carouselsSearchRef = ctx.fieldRef')) {
  payload = insertAfter(payload, '        const carouselsRef = ctx.fieldRef<boolean>(settingsState.get().carousels)\n', '        const carouselsSearchRef = ctx.fieldRef<boolean>(settingsState.get().carouselsSearch)\n        const carouselsListsRef = ctx.fieldRef<boolean>(settingsState.get().carouselsLists)\n        const carouselsMangaRef = ctx.fieldRef<boolean>(settingsState.get().carouselsManga)\n        const carouselsOtherRef = ctx.fieldRef<boolean>(settingsState.get().carouselsOther)\n');
}

if (!payload.includes('updateSetting("carouselsSearch"')) {
  payload = insertAfter(payload, '        carouselsRef.onValueChange((value) => {\n            updateSetting("carousels", !!value)\n        })\n\n', '        carouselsSearchRef.onValueChange((value) => {\n            updateSetting("carouselsSearch", !!value)\n        })\n\n        carouselsListsRef.onValueChange((value) => {\n            updateSetting("carouselsLists", !!value)\n        })\n\n        carouselsMangaRef.onValueChange((value) => {\n            updateSetting("carouselsManga", !!value)\n        })\n\n        carouselsOtherRef.onValueChange((value) => {\n            updateSetting("carouselsOther", !!value)\n        })\n\n');
}

if (!payload.includes('tray.switch("Carousels: Search"')) {
  payload = insertAfter(payload, '                tray.switch("Carousels", {\n                    fieldRef: carouselsRef,\n                }),\n', '                tray.switch("Carousels: Search", {\n                    fieldRef: carouselsSearchRef,\n                }),\n                tray.switch("Carousels: My Lists", {\n                    fieldRef: carouselsListsRef,\n                }),\n                tray.switch("Carousels: Manga", {\n                    fieldRef: carouselsMangaRef,\n                }),\n                tray.switch("Carousels: Other Pages", {\n                    fieldRef: carouselsOtherRef,\n                }),\n');
}

payload = payload.replace(/body\[data-ama-carousels="true"\]/g, 'body[data-ama-carousels-active="true"]');
payload = payload.replace(
  '            .ama-drag-pending a,\n            .ama-dragging a,\n            .ama-drag-pending img,\n            .ama-dragging img,\n            .ama-drag-pending [role="button"],\n            .ama-dragging [role="button"] {',
  '            .ama-dragging a,\n            .ama-dragging img,\n            .ama-dragging [role="button"] {'
);

payload = payload.replace("const dragScrollEnhancementVersion = 'v4';", "const dragScrollEnhancementVersion = 'v5';");

if (!payload.includes('function areCarouselsEnabledForCurrentPage()')) {
  const pageHelpers = `

                    function getCarouselPageKey() {
                        const path = String(window.location.pathname || '').toLowerCase();
                        const hash = String(window.location.hash || '').toLowerCase();
                        const combined = path + ' ' + hash;

                        if (combined.includes('search') || combined.includes('discover') || combined.includes('browse')) return 'search';

                        if (combined.includes('list') || combined.includes('collection') || combined.includes('library') || document.querySelector('[data-anilist-collection-lists="true"], [data-anilist-collection-lists-tabs]')) return 'lists';

                        if (combined.includes('manga') || combined.includes('novel') || combined.includes('book') || document.querySelector('[data-manga-page-container="true"], [data-manga-entry-screen="true"], [data-manga-entry-page="true"]')) return 'manga';

                        return 'other';
                    }

                    function areCarouselsEnabledForCurrentPage() {
                        if (!featureSettings.carousels) return false;

                        const pageKey = getCarouselPageKey();

                        if (pageKey === 'search') return featureSettings.carouselsSearch === true;
                        if (pageKey === 'lists') return featureSettings.carouselsLists !== false;
                        if (pageKey === 'manga') return featureSettings.carouselsManga !== false;

                        return featureSettings.carouselsOther !== false;
                    }`;
  payload = insertAfter(payload, '                    function isElement(node) {\n                        return node && node.nodeType === 1;\n                    }', pageHelpers);
}

if (!payload.includes("data-ama-carousel-page")) {
  payload = insertAfter(payload, "                        document.body.setAttribute('data-ama-carousels', String(!!featureSettings.carousels));\n", "                        document.body.setAttribute('data-ama-carousel-page', getCarouselPageKey());\n                        document.body.setAttribute('data-ama-carousels-active', String(areCarouselsEnabledForCurrentPage()));\n");
}

payload = payload.replace('                                : !!featureSettings.carousels;', '                                : areCarouselsEnabledForCurrentPage();');

if (!payload.includes('el.scrollWidth <= el.clientWidth + 2')) {
  payload = insertAfter(payload, '                            if (event.button !== 0) return;\n', '                            if (el.scrollWidth <= el.clientWidth + 2) return;\n');
}

payload = payload.replace('Math.abs(dx) > 4', 'Math.abs(dx) > 10');
payload = payload.replace('if (!featureSettings.carousels) return;\n                        if (!grid || grid.dataset.amaCarouselEnhanced === "true") return;', 'if (!areCarouselsEnabledForCurrentPage()) return;\n                        if (!grid || grid.dataset.amaCarouselEnhanced === "true") return;');

if (!payload.includes('data-ama-pref="carouselsSearch"')) {
  payload = insertAfter(payload, '                                \'<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels</label><input data-ama-pref="carousels" type="checkbox"></div>\' +\n', '                                \'<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: Search</label><input data-ama-pref="carouselsSearch" type="checkbox"></div>\' +\n                                \'<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: My Lists</label><input data-ama-pref="carouselsLists" type="checkbox"></div>\' +\n                                \'<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: Manga</label><input data-ama-pref="carouselsManga" type="checkbox"></div>\' +\n                                \'<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: Other Pages</label><input data-ama-pref="carouselsOther" type="checkbox"></div>\' +\n');
  payload = payload.replace("['betterMarketplace', 'carousels', 'subDubIcons']", "['betterMarketplace', 'carousels', 'carouselsSearch', 'carouselsLists', 'carouselsManga', 'carouselsOther', 'subDubIcons']");
  payload = insertAfter(payload, '                                    carousels: !!(modal.querySelector(\'[data-ama-pref="carousels"]\') || {}).checked,\n', '                                    carouselsSearch: !!(modal.querySelector(\'[data-ama-pref="carouselsSearch"]\') || {}).checked,\n                                    carouselsLists: !!(modal.querySelector(\'[data-ama-pref="carouselsLists"]\') || {}).checked,\n                                    carouselsManga: !!(modal.querySelector(\'[data-ama-pref="carouselsManga"]\') || {}).checked,\n                                    carouselsOther: !!(modal.querySelector(\'[data-ama-pref="carouselsOther"]\') || {}).checked,\n');
}

payload = payload.replace(/if \(!featureSettings\.carousels\) \{\n\s+cleanupCarousels\((root|document)\);\n\s+\}/g, 'if (!areCarouselsEnabledForCurrentPage()) {\n                            cleanupCarousels($1);\n                        }');
payload = payload.replace(/if \(featureSettings\.carousels\) \{\n\s+(document|root)\.querySelectorAll\(targetGridsQuery\)\.forEach\(grid => \{/g, 'if (areCarouselsEnabledForCurrentPage()) {\n                                $1.querySelectorAll(targetGridsQuery).forEach(grid => {');

if (!payload.includes('setBodyFlags();\n\n                        if (!featureSettings.betterMarketplace)')) {
  payload = insertAfter(payload, '                    function processRoot(root) {\n                        if (!root) return;\n', '\n                        setBodyFlags();\n');
}

manifest.version = VERSION;
manifest.payload = payload;
delete manifest.payloadURI;
delete manifest.payloadURL;

const required = {
  searchDefaultOff: payload.includes('carouselsSearch: false'),
  activeCss: payload.includes('data-ama-carousels-active="true"'),
  oldGlobalCssGone: !payload.includes('body[data-ama-carousels="true"]'),
  pendingLinksNotBlocked: !/ama-drag-pending\s+a|ama-drag-pending\s+img|ama-drag-pending\s+\[role/.test(payload),
  threshold10: payload.includes('Math.abs(dx) > 10'),
  noScrollNoDrag: payload.includes('el.scrollWidth <= el.clientWidth + 2'),
  pageToggles: payload.includes('Carousels: Search') && payload.includes('Carousels: My Lists'),
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
readme = readme.replace(/- Toggle carousel behavior, marketplace layout, and sub\/dub badges from the tray or Preferences\./, '- Toggle carousel behavior by page, marketplace layout, and sub/dub badges from the tray or Preferences.');
if (!readme.includes('Carousels can be controlled separately')) {
  readme = readme.replace('- Full Catalog action buttons for details, preferences, code, and install/update flows.\n', '- Full Catalog action buttons for details, preferences, code, and install/update flows.\n- Carousels can be controlled separately for Search, My Lists, Manga, and Other pages. Search carousels default off so search results stay easy to click.\n');
}
fs.writeFileSync(readmePath, readme);

fs.rmSync(workflowPath, { force: true });
fs.rmSync(scriptPath, { force: true });
