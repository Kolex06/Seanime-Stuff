import json
import re
from pathlib import Path

version = '1.2.25'
manifest_uri = 'https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/SeaUtils-Kolex06-Version.json'
provider_path = Path('plugins/SeaUtilsKolex06Version/provider.ts')
manifest_path = Path('plugins/SeaUtils-Kolex06-Version.json')
marketplace_path = Path('marketplace.json')
readme_path = Path('README.md')

provider = provider_path.read_text(encoding='utf-8').replace('\r\n', '\n')
provider = provider.replace('touch-action: pan-x pan-y !important;', 'touch-action: pan-y !important;')
provider = re.sub(r"const dragScrollEnhancementVersion = 'v\d+';", "const dragScrollEnhancementVersion = 'v5';", provider, count=1)

old_row_tail = """                scroll-behavior: auto !important;
                overscroll-behavior-x: contain !important;
                -webkit-overflow-scrolling: touch !important;
                contain: layout paint style !important;
            }

            body[data-ama-better-marketplace=\"true\"] .ama-catalog-card-wrap {"""
new_row_tail = """                scroll-behavior: auto !important;
                overscroll-behavior-x: contain !important;
                -webkit-overflow-scrolling: touch !important;
                touch-action: pan-y !important;
                contain: layout paint style !important;
                cursor: grab !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }

            body[data-ama-better-marketplace=\"true\"] .ama-catalog-card-wrap {"""
if old_row_tail in provider:
    provider = provider.replace(old_row_tail, new_row_tail, 1)

new_drag_block = """                        let isDown = false;
                        let didDrag = false;
                        let suppressClick = false;
                        let startX = 0;
                        let startScrollLeft = 0;
                        let activePointerId = null;
                        let lastPointerDownAt = 0;

                        function isRealControl(target) {
                            return !!(
                                target &&
                                target.closest &&
                                target.closest('.ama-clone-action, .ama-clone-actions, button, input, textarea, select, summary, [contenteditable=\"true\"]')
                            );
                        }

                        function isEnabled() {
                            return el.dataset.amaDragFeature === 'betterMarketplace'
                                ? !!featureSettings.betterMarketplace
                                : !!featureSettings.carousels;
                        }

                        function getClientX(event) {
                            if (event && typeof event.clientX === 'number') return event.clientX;
                            if (event && event.touches && event.touches[0]) return event.touches[0].clientX;
                            if (event && event.changedTouches && event.changedTouches[0]) return event.changedTouches[0].clientX;
                            return startX;
                        }

                        function shouldIgnoreButton(event) {
                            return event && typeof event.button === 'number' && event.button !== 0;
                        }

                        function beginDrag(event, pointerId) {
                            if (!isEnabled()) return false;
                            if (isRealControl(event.target)) return false;
                            if (shouldIgnoreButton(event)) return false;

                            isDown = true;
                            didDrag = false;
                            suppressClick = false;
                            activePointerId = pointerId === undefined ? null : pointerId;
                            startX = getClientX(event);
                            startScrollLeft = el.scrollLeft;
                            el.classList.add('ama-drag-pending');

                            return true;
                        }

                        function moveDrag(event) {
                            if (!isDown) return;
                            if (activePointerId !== null && event.pointerId !== undefined && event.pointerId !== activePointerId) return;

                            const dx = getClientX(event) - startX;

                            if (Math.abs(dx) > 4) {
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

                            if (didDrag) {
                                el.scrollLeft = startScrollLeft - dx;
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }

                        function stopDrag(pointerId) {
                            isDown = false;
                            activePointerId = null;
                            el.classList.remove('ama-drag-pending');
                            el.classList.remove('ama-dragging');

                            setTimeout(() => {
                                suppressClick = false;
                                didDrag = false;
                            }, 350);

                            try {
                                if (pointerId !== undefined) el.releasePointerCapture(pointerId);
                            } catch (_) {}
                        }

                        el.addEventListener('pointerdown', event => {
                            if (!beginDrag(event, event.pointerId)) return;
                            lastPointerDownAt = Date.now();

                            try {
                                el.setPointerCapture(event.pointerId);
                            } catch (_) {}
                        }, true);

                        el.addEventListener('pointermove', event => {
                            moveDrag(event);
                        }, true);

                        el.addEventListener('pointerup', event => {
                            stopDrag(event.pointerId);
                        });

                        el.addEventListener('pointercancel', event => {
                            stopDrag(event.pointerId);
                        });

                        function onMouseMove(event) {
                            moveDrag(event);
                        }

                        function onMouseUp() {
                            stopDrag();
                            document.removeEventListener('mousemove', onMouseMove, true);
                            document.removeEventListener('mouseup', onMouseUp, true);
                        }

                        el.addEventListener('mousedown', event => {
                            if (Date.now() - lastPointerDownAt < 500) return;
                            if (!beginDrag(event)) return;

                            document.addEventListener('mousemove', onMouseMove, true);
                            document.addEventListener('mouseup', onMouseUp, true);
                        }, true);

                        window.addEventListener('blur', () => {
                            stopDrag();
                            document.removeEventListener('mousemove', onMouseMove, true);
                            document.removeEventListener('mouseup', onMouseUp, true);
                        });

"""
function_marker = '                    function makeDraggableScroller(el, featureKey) {'
start_marker = '                        let isDown = false;\n'
click_marker = "                        el.addEventListener('click', event => {"
function_start = provider.index(function_marker)
block_start = provider.index(start_marker, function_start)
block_end = provider.index(click_marker, block_start)
provider = provider[:block_start] + new_drag_block + provider[block_end:]

if "const dragScrollEnhancementVersion = 'v5';" not in provider:
    raise SystemExit('SeaUtils drag handler version was not updated')
if "el.addEventListener('mousedown'" not in provider:
    raise SystemExit('SeaUtils mouse drag fallback is missing')
if 'touch-action: pan-y !important;' not in provider:
    raise SystemExit('SeaUtils touch drag CSS is missing')
if "const marketplaceEnhancementVersion = 'v10';" not in provider:
    raise SystemExit('SeaUtils marketplace version marker was unexpectedly changed')

provider = provider.rstrip()
provider_path.write_text(provider + '\n', encoding='utf-8')

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['version'] = version
manifest['manifestURI'] = manifest_uri
manifest['payload'] = provider
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

marketplace = json.loads(marketplace_path.read_text(encoding='utf-8'))
for item in marketplace:
    if item.get('id') == 'SeaUtils-Kolex06-Version':
        item['version'] = version
        item['manifestURI'] = manifest_uri
        break
else:
    raise SystemExit('SeaUtils marketplace entry not found')
marketplace_path.write_text(json.dumps(marketplace, indent=2) + '\n', encoding='utf-8')

readme = readme_path.read_text(encoding='utf-8')
readme = re.sub(r'(\| SeaUtils Kolex06-Version \| )[^|]+( \| `SeaUtils-Kolex06-Version` \|)', r'\g<1>' + version + r'\g<2>', readme, count=1)
readme_path.write_text(readme, encoding='utf-8')
