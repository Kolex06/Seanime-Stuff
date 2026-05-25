const fs = require('fs');

const VERSION = '1.2.34';
const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-fullcatalog-fix.yml';
const scriptPath = '.github/scripts/fix-seautils-fullcatalog.js';

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

payload = payload.replace("const marketplaceEnhancementVersion = 'v5';", "const marketplaceEnhancementVersion = 'v6';");

payload = payload.replace(
  /\.ama-clone-actions \{\n\s+position: absolute !important;\n\s+top: 12px !important;\n\s+right: 12px !important;\n\s+display: flex !important;\n\s+flex-direction: column !important;\n\s+gap: 4px !important;/,
  `.ama-clone-actions {
                position: absolute !important;
                top: 12px !important;
                right: 12px !important;
                display: flex !important;
                flex-direction: row !important;
                flex-wrap: wrap !important;
                justify-content: flex-end !important;
                gap: 4px !important;`
);

const slidersIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line></svg>';
payload = payload.replace(
  /const SETTINGS_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">.*?<\/svg>';/,
  `const SETTINGS_ICON = '${slidersIcon}';`
);

if (!payload.includes('async function fetchTextWithTimeout')) {
  const fetchTextFunction = `

                    async function fetchTextWithTimeout(url, timeoutMs) {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), timeoutMs);

                        try {
                            const response = await fetch(url, {
                                signal: controller.signal,
                                cache: 'no-store'
                            });

                            if (!response.ok) return '';

                            return await response.text();
                        } catch (_) {
                            return '';
                        } finally {
                            clearTimeout(timeout);
                        }
                    }`;
  payload = payload.replace('\n\n                    function loadDubIds() {', fetchTextFunction + '\n\n                    function loadDubIds() {');
}

payload = payload.replace(
  "return id === 'seautils' || name === 'seautils' || name === 'seautils kolex06-version' || name === 'seautils kolex-version';",
  "return id === 'seautils' || id === 'seautils-kolex06-version' || id === 'seautils kolex06-version' || name === 'seautils' || name === 'seautils kolex06-version' || name === 'seautils kolex-version';"
);

if (!payload.includes('async function resolveCodePayloadForCard')) {
  const helpers = `
                    function normalizeCodePayload(value) {
                        if (!value) return '';

                        if (typeof value === 'string') return value;

                        if (value && typeof value === 'object') {
                            if (typeof value.payload === 'string') return value.payload;
                            if (typeof value.code === 'string') return value.code;
                            if (typeof value.source === 'string') return value.source;
                            if (typeof value.data === 'string') return value.data;
                        }

                        return '';
                    }

                    async function fetchManifestPayload(manifestUri) {
                        const payloadUri = String(manifestUri || '').trim();
                        if (!payloadUri || payloadUri === 'builtin') return '';

                        const text = await fetchTextWithTimeout(payloadUri, 10000);
                        if (!text) return '';

                        try {
                            const manifest = JSON.parse(text);
                            return normalizeCodePayload(manifest.payload);
                        } catch (_) {
                            return '';
                        }
                    }

                    async function resolveCodePayloadForCard(card, extension, data) {
                        const extensionId = (extension && extension.id) || data.id;
                        const manifestUri = getExtensionManifestUri(extension);
                        const directPayload = normalizeCodePayload(extension && extension.payload);

                        if (directPayload) return directPayload;

                        if (extensionId) {
                            try {
                                const apiPayload = await fetchSeanime('/api/v1/extensions/payload/' + encodeURIComponent(extensionId), {
                                    method: 'GET'
                                });

                                const normalizedApiPayload = normalizeCodePayload(apiPayload);
                                if (normalizedApiPayload) return normalizedApiPayload;
                            } catch (_) {}
                        }

                        const manifestPayload = await fetchManifestPayload(manifestUri);
                        if (manifestPayload) return manifestPayload;

                        if (isKolex06VersionExtension(data, extension)) {
                            const fallbackPayload = await fetchManifestPayload('https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/SeaUtils-Kolex06-Version.json');
                            if (fallbackPayload) return fallbackPayload;
                        }

                        if (!extensionId) {
                            throw new Error('Could not find this extension ID.');
                        }

                        return '';
                    }

`;
  payload = payload.replace('                    async function showInstalledCode(card) {', helpers + '                    async function showInstalledCode(card) {');
}

const showInstalledCode = `                    async function showInstalledCode(card) {
                        const data = getExtensionCardData(card);

                        const modal = openAmaModal('Code', '<p>Loading code for ' + escapeHtml(data.name) + '...</p>');

                        try {
                            const extension = await findExtensionForCard(card);
                            const payload = await resolveCodePayloadForCard(card, extension, data);

                            if (modal) {
                                modal.innerHTML =
                                    '<button type="button" class="ama-modal-close">Close</button>' +
                                    '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Code</h2>' +
                                    '<p style="color:rgba(255,255,255,.65); margin:0;">' + escapeHtml(data.name) + '</p>' +
                                    '<pre class="ama-code-preview">' + escapeHtml(payload || 'No code found.') + '</pre>';
                                modal.querySelector('.ama-modal-close').onclick = () => modal.remove();
                            }
                        } catch (error) {
                            if (modal) {
                                modal.innerHTML =
                                    '<button type="button" class="ama-modal-close">Close</button>' +
                                    '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Code</h2>' +
                                    '<p>' + escapeHtml(error && error.message ? error.message : 'Could not load code for this extension.') + '</p>';
                                modal.querySelector('.ama-modal-close').onclick = () => modal.remove();
                            }
                        }
                    }
`;
payload = replaceBetween(payload, '                    async function showInstalledCode(card) {', '\n\n                    function readMarketplaceUrl()', showInstalledCode);

const createMarketplaceCloneActions = `                    function createMarketplaceCloneActions(sourceCard, isInstalledCatalog) {
                        const actions = document.createElement('div');
                        actions.className = 'ama-clone-actions';

                        const liveButtons = Array.from(sourceCard.querySelectorAll('button'));
                        const isInstalled = !!sourceCard.querySelector('button[disabled]');
                        const data = getExtensionCardData(sourceCard);
                        const sourceId = getCatalogActionSourceId(sourceCard);

                        ensureCatalogActionHandler();

                        if (isInstalledCatalog || isInstalled) {
                            addCloneAction(actions, 'More', MORE_ICON, 'more', sourceId);

                            if (isKolex06VersionExtension(data) || sourceCardHasNativePreferences(sourceCard)) {
                                addCloneAction(actions, 'Preferences', SETTINGS_ICON, 'preferences', sourceId);
                            } else {
                                hasPreferencesForCard(sourceCard).then(hasPreferences => {
                                    if (!hasPreferences) return;
                                    if (!actions.isConnected) return;

                                    addCloneAction(actions, 'Preferences', SETTINGS_ICON, 'preferences', sourceId);
                                });
                            }

                            addCloneAction(actions, 'Code', CODE_ICON, 'code', sourceId);
                        } else if (!isInstalled && liveButtons.length) {
                            addCloneAction(actions, 'Download', DOWNLOAD_ICON, 'download', sourceId);
                        }

                        return actions.children.length ? actions : null;
                    }

`;
payload = replaceBetween(payload, '                    function createMarketplaceCloneActions(sourceCard, isInstalledCatalog) {', '                    function enhanceExtensionCard(card) {', createMarketplaceCloneActions + '                    function enhanceExtensionCard(card) {');

manifest.version = VERSION;
manifest.payload = payload;
delete manifest.payloadURI;
delete manifest.payloadURL;

if (!payload.includes("marketplaceEnhancementVersion = 'v6'")) throw new Error('Missing v6 enhancer marker');
if (!payload.includes('flex-direction: row !important')) throw new Error('Missing row actions CSS');
if (!payload.includes('<line x1="21" x2="14" y1="4" y2="4"></line>')) throw new Error('Missing sliders icon');
if (!payload.includes('resolveCodePayloadForCard')) throw new Error('Missing code fallback');
if (payload.indexOf("'Preferences', SETTINGS_ICON") === -1 || payload.indexOf("'Preferences', SETTINGS_ICON") > payload.indexOf("'Code', CODE_ICON")) throw new Error('Preferences not before Code');

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
