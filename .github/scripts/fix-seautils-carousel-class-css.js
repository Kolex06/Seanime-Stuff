const fs = require('fs');

const VERSION = '1.2.38';
const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-carousel-class-css-fix.yml';
const scriptPath = '.github/scripts/fix-seautils-carousel-class-css.js';

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let payload = manifest.payload || '';
if (!payload) throw new Error('SeaUtils manifest is missing inline payload');

const classCss = `
            .ama-optimized-carousel {
                display: flex !important;
                flex-wrap: nowrap !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                gap: 16px !important;
                padding: 16px 8px 22px 8px !important;
                margin: 0 !important;
                width: 100% !important;
                scroll-snap-type: none !important;
                scroll-behavior: auto !important;
                overscroll-behavior-x: contain !important;
                -webkit-overflow-scrolling: touch !important;
                touch-action: pan-x pan-y !important;
                contain: layout paint style !important;
                cursor: grab !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }

            .ama-optimized-carousel::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            .ama-optimized-carousel a,
            .ama-optimized-carousel img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }

            .ama-optimized-carousel > div {
                flex: 0 0 160px !important;
                display: block !important;
                width: 160px !important;
                max-width: 160px !important;
                contain: layout paint style !important;
            }

            @media (min-width: 768px) {
                .ama-optimized-carousel > div {
                    flex: 0 0 185px !important;
                    width: 185px !important;
                    max-width: 185px !important;
                }
            }

            @media (min-width: 1280px) {
                .ama-optimized-carousel > div {
                    flex: 0 0 210px !important;
                    width: 210px !important;
                    max-width: 210px !important;
                }
            }

            .ama-optimized-carousel [data-media-entry-card-hover-popup="true"] {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            .ama-optimized-carousel [data-media-entry-card-body-image="true"] {
                transition: none !important;
                transform: none !important;
                will-change: auto !important;
            }

            .ama-optimized-carousel .group\\/media-entry-card:hover [data-media-entry-card-body-image="true"] {
                transform: none !important;
            }

            .ama-optimized-carousel * {
                scroll-behavior: auto !important;
            }
`;

if (!payload.includes('.ama-optimized-carousel {')) {
  const anchor = `            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] *,
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] * {
                scroll-behavior: auto !important;
            }
`;
  if (!payload.includes(anchor)) throw new Error('Missing carousel CSS anchor');
  payload = payload.replace(anchor, anchor + classCss);
}

manifest.version = VERSION;
manifest.payload = payload;
delete manifest.payloadURI;
delete manifest.payloadURL;

const required = {
  classCss: payload.includes('.ama-optimized-carousel {') && payload.includes('.ama-optimized-carousel > div'),
  classAdded: payload.includes("grid.classList.add('ama-optimized-carousel')"),
  classRemoved: payload.includes("grid.classList.remove('ama-optimized-carousel')"),
  noDomSearchDetection: !payload.includes('data-search-results') && !payload.includes('data-search-page') && !payload.includes('data-media-search-page'),
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
