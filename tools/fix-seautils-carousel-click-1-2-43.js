const fs = require('fs');

const manifestPath = 'plugins/SeaUtils-Kolex06-Version.json';
const marketplacePath = 'marketplace.json';
const readmePath = 'README.md';
const workflowPath = '.github/workflows/seautils-carousel-click-1-2-43.yml';
const scriptPath = 'tools/fix-seautils-carousel-click-1-2-43.js';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

const manifest = readJson(manifestPath);
let payload = String(manifest.payload || '');

payload = payload.replace(
`                        let isDown = false;
                        let didDrag = false;
                        let suppressClick = false;
                        let startX = 0;
                        let startScrollLeft = 0;
`,
`                        let isDown = false;
                        let didDrag = false;
                        let suppressClick = false;
                        let startX = 0;
                        let startY = 0;
                        let startScrollLeft = 0;
`
);

payload = payload.replace(
`                            startX = event.clientX;
                            startScrollLeft = el.scrollLeft;
                            el.classList.add('ama-drag-pending');

                            try {
                                el.setPointerCapture(event.pointerId);
                            } catch (_) {}
`,
`                            startX = event.clientX;
                            startY = event.clientY;
                            startScrollLeft = el.scrollLeft;
                            el.classList.add('ama-drag-pending');
`
);

payload = payload.replace(
`                            const dx = event.clientX - startX;

                            if (Math.abs(dx) > 10) {
                                didDrag = true;
                                suppressClick = true;
                                el.classList.remove('ama-drag-pending');
                                el.classList.add('ama-dragging');
                                event.preventDefault();
                                event.stopPropagation();

                                try {
                                    window.getSelection && window.getSelection().removeAllRanges();
                                } catch (_) {}
                            }
`,
`                            const dx = event.clientX - startX;
                            const dy = event.clientY - startY;
                            const isClearHorizontalDrag = Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) + 8;

                            if (isClearHorizontalDrag) {
                                if (!didDrag) {
                                    try {
                                        el.setPointerCapture(event.pointerId);
                                    } catch (_) {}
                                }

                                didDrag = true;
                                suppressClick = true;
                                el.classList.remove('ama-drag-pending');
                                el.classList.add('ama-dragging');
                                event.preventDefault();
                                event.stopPropagation();

                                try {
                                    window.getSelection && window.getSelection().removeAllRanges();
                                } catch (_) {}
                            }
`
);

if (!payload.includes('let startY = 0;')) throw new Error('startY missing');
if (!payload.includes('Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) + 8')) throw new Error('safer drag threshold missing');
if (payload.includes("startScrollLeft = el.scrollLeft;\n                            el.classList.add('ama-drag-pending');\n\n                            try {\n                                el.setPointerCapture")) throw new Error('pointer capture still starts on click');

manifest.version = '1.2.43';
manifest.payload = payload;
writeJson(manifestPath, manifest);

const marketplace = readJson(marketplacePath);
for (const extension of marketplace) {
  if (extension.id === 'SeaUtils-Kolex06-Version') extension.version = '1.2.43';
}
writeJson(marketplacePath, marketplace);

let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(/1\.2\.42/g, '1.2.43');
fs.writeFileSync(readmePath, readme);

fs.rmSync(scriptPath, { force: true });
fs.rmSync(workflowPath, { force: true });
