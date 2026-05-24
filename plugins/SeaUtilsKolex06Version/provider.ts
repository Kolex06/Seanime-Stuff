/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

interface AmaSettings {
    betterMarketplace: boolean
    carousels: boolean
    subDubIcons: boolean
}

function init() {
    $ui.register(function(ctx) {

        const SETTINGS_KEY = "ama-ui-tweaks.settings"

        const DEFAULT_SETTINGS: AmaSettings = {
            betterMarketplace: true,
            carousels: true,
            subDubIcons: true,
        }

        function getStorageApi(): any | null {
            try {
                // @ts-ignore
                if (typeof $storage !== "undefined" && $storage) {
                    // @ts-ignore
                    return $storage
                }
            } catch (_) {}

            return null
        }

        function normalizeSettings(value: Partial<AmaSettings> | null | undefined): AmaSettings {
            const saved = value || {}

            return {
                betterMarketplace: saved.betterMarketplace !== false,
                carousels: saved.carousels !== false,
                subDubIcons: saved.subDubIcons !== false,
            }
        }

        function loadSettings(): AmaSettings {
            try {
                const storage = getStorageApi()

                if (storage && typeof storage.get === "function") {
                    return normalizeSettings(storage.get<Partial<AmaSettings>>(SETTINGS_KEY))
                }
            } catch (_) {}

            return normalizeSettings(null)
        }

        function saveSettings(settings: AmaSettings) {
            try {
                const storage = getStorageApi()

                if (storage && typeof storage.set === "function") {
                    storage.set(SETTINGS_KEY, settings)
                }
            } catch (_) {}
        }

        const settingsState = ctx.state<AmaSettings>(loadSettings())

        const betterMarketplaceRef = ctx.fieldRef<boolean>(settingsState.get().betterMarketplace)
        const carouselsRef = ctx.fieldRef<boolean>(settingsState.get().carousels)
        const subDubIconsRef = ctx.fieldRef<boolean>(settingsState.get().subDubIcons)

        const trayIconUrl = "https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/main/icons/SeaUtils-Kolex06-Version.png"

        const tray = ctx.newTray({
            iconUrl: trayIconUrl,
            withContent: true,
            width: "320px",
            minHeight: "190px",
        })

        async function pushSettingsToClient(settings: AmaSettings) {
            const body = await ctx.dom.queryOne("body")
            if (!body) return

            const bridge = await ctx.dom.createElement("script")
            bridge.setText(
                "window.__AMA_SAVE_SETTINGS__ && window.__AMA_SAVE_SETTINGS__(" +
                JSON.stringify(settings) +
                ");"
            )

            body.append(bridge)
        }

        function saveAndApplySettings(next: AmaSettings) {
            saveSettings(next)
            settingsState.set(next)
            pushSettingsToClient(next)
        }

        function updateSetting<K extends keyof AmaSettings>(key: K, value: boolean) {
            const current = settingsState.get()
            const next: AmaSettings = {
                ...current,
                [key]: value,
            }

            saveAndApplySettings(next)
        }

        betterMarketplaceRef.onValueChange((value) => {
            updateSetting("betterMarketplace", !!value)
        })

        carouselsRef.onValueChange((value) => {
            updateSetting("carousels", !!value)
        })

        subDubIconsRef.onValueChange((value) => {
            updateSetting("subDubIcons", !!value)
        })

        tray.render(() => {
            return tray.stack([
                tray.text("SeaUtils Kolex06-Version Settings"),
                tray.switch("Better Marketplace", {
                    fieldRef: betterMarketplaceRef,
                }),
                tray.switch("Carousels", {
                    fieldRef: carouselsRef,
                }),
                tray.switch("Sub/Dub Icons", {
                    fieldRef: subDubIconsRef,
                }),
            ])
        })

        const initialFeatureSettings = settingsState.get()

        const carouselCSS = `
            .ama-carousel-nav-btn,
            button.ama-carousel-nav-btn,
            .ama-manga-carousel-parent > .ama-carousel-nav-btn,
            svg[data-ama-random-search-icon="true"] {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            *::-webkit-scrollbar-button {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            body[data-ama-better-marketplace="true"] input[placeholder*="Search"]:not(.ama-search-input),
            body[data-ama-better-marketplace="true"] input[placeholder*="search"]:not(.ama-search-input) {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.45)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E") !important;
                background-repeat: no-repeat !important;
                background-position: 10px center !important;
                background-size: 16px 16px !important;
                padding-left: 34px !important;
            }

            [data-anilist-collection-lists="true"] [data-page-wrapper-container="true"],
            [data-anilist-collection-lists="true"] .py-6 {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"],
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"],
            body[data-ama-carousels="true"] [data-manga-page-container="true"] [data-media-card-grid="true"],
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"],
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"],
            body[data-ama-carousels="true"] [data-anilist-collection-lists-tabs] ~ div .grid {
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
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"],
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"],
            body[data-ama-carousels="true"] [data-manga-page-container="true"] [data-media-card-grid="true"],
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"],
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"],
            body[data-ama-carousels="true"] [data-anilist-collection-lists-tabs] ~ div .grid,
            body[data-ama-better-marketplace="true"] .ama-carousel-row {
                cursor: grab !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels="true"] [data-manga-page-container="true"] [data-media-card-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels="true"] [data-anilist-collection-lists-tabs] ~ div .grid::-webkit-scrollbar,
            body[data-ama-better-marketplace="true"] .ama-carousel-row::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            .ama-drag-pending,
            .ama-dragging {
                cursor: grabbing !important;
                user-select: none !important;
            }

            .ama-drag-pending *,
            .ama-dragging * {
                cursor: grabbing !important;
                user-select: none !important;
            }

            .ama-drag-pending a,
            .ama-dragging a,
            .ama-drag-pending img,
            .ama-dragging img,
            .ama-drag-pending [role="button"],
            .ama-dragging [role="button"] {
                pointer-events: none !important;
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] a,
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] a,
            body[data-ama-carousels="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] a,
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] a,
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] a,
            body[data-ama-carousels="true"] [data-anilist-collection-lists-tabs] ~ div .grid a,
            body[data-ama-better-marketplace="true"] .ama-carousel-row a,
            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] img,
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] img,
            body[data-ama-better-marketplace="true"] .ama-carousel-row img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] > div,
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] > div,
            body[data-ama-carousels="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] > div {
                flex: 0 0 160px !important;
                display: block !important;
                width: 160px !important;
                max-width: 160px !important;
                contain: layout paint style !important;
            }

            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] > div,
            body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] > div {
                flex: 0 0 155px !important;
                display: block !important;
                width: 155px !important;
                max-width: 155px !important;
                contain: layout paint style !important;
            }

            @media (min-width: 768px) {
                body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] > div,
                body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] > div,
                body[data-ama-carousels="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] > div {
                    flex: 0 0 185px !important;
                    width: 185px !important;
                    max-width: 185px !important;
                }

                body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] > div,
                body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] > div {
                    flex: 0 0 175px !important;
                    width: 175px !important;
                    max-width: 175px !important;
                }
            }

            @media (min-width: 1280px) {
                body[data-ama-carousels="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] > div {
                    flex: 0 0 210px !important;
                    width: 210px !important;
                    max-width: 210px !important;
                }

                body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] > div,
                body[data-ama-carousels="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] > div {
                    flex: 0 0 195px !important;
                    width: 195px !important;
                    max-width: 195px !important;
                }
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] [data-media-entry-card-hover-popup="true"],
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] [data-media-entry-card-hover-popup="true"] {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] [data-media-entry-card-body-image="true"],
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] [data-media-entry-card-body-image="true"] {
                transition: none !important;
                transform: none !important;
                will-change: auto !important;
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] .group\\/media-entry-card:hover [data-media-entry-card-body-image="true"],
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] .group\\/media-entry-card:hover [data-media-entry-card-body-image="true"] {
                transform: none !important;
            }

            body[data-ama-carousels="true"] .grid[data-media-card-grid="true"] *,
            body[data-ama-carousels="true"] .grid[data-media-card-lazy-grid="true"] * {
                scroll-behavior: auto !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-meta-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 8px !important;
                width: 100% !important;
                min-width: 0 !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-meta-row > [data-media-entry-card-title-section-year-season="true"] {
                min-width: 0 !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-badges {
                margin-left: auto !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 6px !important;
                flex: 0 0 auto !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-badge {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                height: 22px !important;
                min-width: 28px !important;
                padding: 0 6px !important;
                border-radius: 999px !important;
                border: 1px solid currentColor !important;
                background: rgba(255,255,255,0.06) !important;
                line-height: 1 !important;
                flex: 0 0 auto !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-badge svg {
                width: 17px !important;
                height: 17px !important;
                display: block !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-badge.cc {
                color: #a7e7ff !important;
                background: rgba(167, 231, 255, 0.13) !important;
                border-color: rgba(167, 231, 255, 0.65) !important;
                box-shadow: 0 0 10px rgba(167, 231, 255, 0.12) !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-badge.dub {
                color: #ffb7c5 !important;
                background: rgba(255, 183, 197, 0.13) !important;
                border-color: rgba(255, 183, 197, 0.7) !important;
                box-shadow: 0 0 10px rgba(255, 183, 197, 0.12) !important;
            }

            body[data-ama-subdub-icons="true"] .ama-media-badge.dub[hidden] {
                display: none !important;
            }

            body[data-ama-subdub-icons="false"] .ama-media-badges {
                display: none !important;
            }

            body[data-ama-better-marketplace="true"] .group\\/extension-card {
                flex: 0 0 300px !important;
                background: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 24px !important;
                padding: 20px !important;
                transition: background 0.12s ease !important;
                contain: layout paint style !important;
            }

            body[data-ama-better-marketplace="true"] .group\\/extension-card:hover {
                background: rgba(255, 255, 255, 0.08) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-extension-carousel {
                display: flex !important;
                flex-wrap: nowrap !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                gap: 16px !important;
                padding: 10px 40px 22px 40px !important;
                margin: 0 !important;
                width: 100% !important;
                scroll-behavior: auto !important;
                overscroll-behavior-x: contain !important;
                -webkit-overflow-scrolling: touch !important;
                touch-action: pan-x pan-y !important;
                contain: layout paint style !important;
                cursor: grab !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }

            body[data-ama-better-marketplace="true"] .ama-extension-carousel::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-extension-carousel a,
            body[data-ama-better-marketplace="true"] .ama-extension-carousel img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }

            body[data-ama-better-marketplace="true"] .ama-header-container {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 20px !important;
                padding: 14px 40px 0px 40px !important;
                margin-bottom: 8px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-header-left {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                min-width: 0 !important;
                flex-shrink: 1 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-header-left h3 {
                margin: 0 !important;
                white-space: nowrap !important;
            }

            body[data-ama-better-marketplace="true"] .ama-header-right {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                margin-left: auto !important;
            }

            body[data-ama-better-marketplace="true"] .ama-search-wrapper {
                position: relative !important;
                display: flex !important;
                align-items: center !important;
            }

            body[data-ama-better-marketplace="true"] .ama-search-icon {
                position: absolute !important;
                left: 10px !important;
                width: 15px !important;
                height: 15px !important;
                pointer-events: none !important;
                opacity: 0.45 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-search-input {
                background: rgba(255,255,255,0.06) !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
                border-radius: 14px !important;
                padding: 8px 14px 8px 32px !important;
                color: white !important;
                width: 220px !important;
                outline: none !important;
            }

            body[data-ama-better-marketplace="true"] .ama-view-btn {
                background: rgba(255,255,255,0.08) !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
                padding: 8px 16px !important;
                border-radius: 14px !important;
                color: #fff !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                white-space: nowrap !important;
            }

            body[data-ama-better-marketplace="true"] .ama-modal {
                position: fixed !important;
                top: 5% !important;
                left: 5% !important;
                width: 90% !important;
                height: 90% !important;
                background: rgba(18,18,22,0.96) !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
                border-radius: 28px !important;
                padding: 30px !important;
                z-index: 999999 !important;
                overflow-y: auto !important;
                color: white !important;
                contain: layout paint style !important;
            }

            body[data-ama-better-marketplace="true"] .ama-modal-close {
                float: right !important;
                background: rgba(255,255,255,0.08) !important;
                border: none !important;
                color: white !important;
                padding: 8px 14px !important;
                border-radius: 12px !important;
                cursor: pointer !important;
            }

            body[data-ama-better-marketplace="true"] .modal-row {
                margin-bottom: 28px !important;
            }

            body[data-ama-better-marketplace="true"] .modal-row-title {
                font-weight: 700 !important;
                font-size: 18px !important;
                margin-bottom: 12px !important;
                padding-left: 40px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-carousel-row {
                display: flex !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                gap: 20px !important;
                padding: 10px 40px 22px 40px !important;
                scroll-behavior: auto !important;
                overscroll-behavior-x: contain !important;
                -webkit-overflow-scrolling: touch !important;
                contain: layout paint style !important;
            }

            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap {
                position: relative !important;
                flex: 0 0 300px !important;
                width: 300px !important;
                max-width: 300px !important;
                display: block !important;
            }

            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap > .group\\/extension-card {
                width: 100% !important;
                max-width: 100% !important;
                height: 100% !important;
                box-sizing: border-box !important;
            }

            body[data-ama-better-marketplace="true"] .group\\/extension-card.ama-update-available,
            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap.ama-update-available > .group\\/extension-card {
                border-color: rgba(96, 165, 250, 0.78) !important;
                background: linear-gradient(90deg, rgba(37, 99, 235, 0.24), rgba(14, 165, 233, 0.12)) !important;
                box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.32), 0 12px 28px rgba(37, 99, 235, 0.14) !important;
            }

            body[data-ama-better-marketplace="true"] .group\\/extension-card.ama-update-available .ama-update-version-badge,
            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap.ama-update-available .ama-update-version-badge {
                color: #bfdbfe !important;
                background: rgba(37, 99, 235, 0.28) !important;
                border-color: rgba(96, 165, 250, 0.65) !important;
                box-shadow: 0 0 12px rgba(59, 130, 246, 0.22) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap[hidden] {
                display: none !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-actions {
                position: absolute !important;
                top: 12px !important;
                right: 12px !important;
                display: grid !important;
                grid-template-columns: repeat(2, 32px) !important;
                gap: 4px !important;
                z-index: 9999999 !important;
                pointer-events: auto !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="more"] {
                grid-column: 1 !important;
                grid-row: 1 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="preferences"] {
                grid-column: 2 !important;
                grid-row: 1 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="code"] {
                grid-column: 1 !important;
                grid-row: 2 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="documentation"] {
                grid-column: 2 !important;
                grid-row: 2 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="download"] {
                grid-column: 1 !important;
                grid-row: 1 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action {
                width: 32px !important;
                height: 32px !important;
                border-radius: 10px !important;
                border: 1px solid rgba(255,255,255,0.12) !important;
                background: rgba(255,255,255,0.08) !important;
                color: white !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                pointer-events: auto !important;
                position: relative !important;
                z-index: 9999999 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action:hover {
                background: rgba(255,255,255,0.14) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-code-preview {
                margin: 16px 0 0 0 !important;
                padding: 16px !important;
                background: rgba(0,0,0,0.35) !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
                border-radius: 14px !important;
                max-height: 70vh !important;
                overflow: auto !important;
                white-space: pre-wrap !important;
                word-break: break-word !important;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
                font-size: 12px !important;
                line-height: 1.5 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-detail-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
                gap: 12px !important;
                margin-top: 16px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-detail-item {
                padding: 12px !important;
                border-radius: 12px !important;
                background: rgba(255,255,255,0.06) !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-detail-label {
                color: rgba(255,255,255,0.5) !important;
                font-size: 12px !important;
                margin-bottom: 4px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-action-panel {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 10px !important;
                margin-top: 18px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-action-button {
                border: 1px solid rgba(255,255,255,0.12) !important;
                background: rgba(255,255,255,0.08) !important;
                color: white !important;
                padding: 10px 14px !important;
                border-radius: 12px !important;
                cursor: pointer !important;
                font-weight: 700 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-action-button:hover {
                background: rgba(255,255,255,0.14) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-action-button[disabled] {
                cursor: not-allowed !important;
                opacity: .55 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-action-button.danger {
                background: rgba(239,68,68,0.14) !important;
                border-color: rgba(239,68,68,0.35) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-action-button.install-update {
                color: #eff6ff !important;
                background: rgba(37, 99, 235, 0.42) !important;
                border-color: rgba(96, 165, 250, 0.72) !important;
                box-shadow: 0 0 14px rgba(59, 130, 246, 0.22) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-action-status {
                width: 100% !important;
                min-height: 20px !important;
                color: rgba(255,255,255,.68) !important;
                font-size: 13px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-form {
                display: flex !important;
                flex-direction: column !important;
                gap: 14px !important;
                margin-top: 18px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-field {
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-field label,
            body[data-ama-better-marketplace="true"] .ama-config-switch-label {
                font-weight: 700 !important;
                color: rgba(255,255,255,0.9) !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-input,
            body[data-ama-better-marketplace="true"] .ama-config-select {
                background: rgba(255,255,255,0.06) !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                border-radius: 12px !important;
                color: #fff !important;
                padding: 10px 12px !important;
                outline: none !important;
                width: 100% !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-switch-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 14px !important;
                padding: 10px 12px !important;
                background: rgba(255,255,255,0.04) !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
                border-radius: 12px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-help {
                color: rgba(255,255,255,0.5) !important;
                font-size: 12px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-actions {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                margin-top: 4px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-save {
                background: #fff !important;
                border: 0 !important;
                color: #111 !important;
                border-radius: 12px !important;
                cursor: pointer !important;
                font-weight: 700 !important;
                padding: 10px 16px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-config-status {
                color: rgba(255,255,255,0.65) !important;
                font-size: 13px !important;
            }

            body[data-ama-better-marketplace="true"] .flex.gap-2.flex-wrap.pt-4 .UI-Badge__root:nth-child(1),
            body[data-ama-better-marketplace="true"] .group\\/extension-card .UI-Badge__root:nth-child(1) {
                color: aqua !important;
                border-color: aqua !important;
            }

            body[data-ama-better-marketplace="true"] .flex.gap-2.flex-wrap.pt-4 .UI-Badge__root:nth-child(2),
            body[data-ama-better-marketplace="true"] .group\\/extension-card .UI-Badge__root:nth-child(2) {
                color: #4ade80 !important;
                border-color: #4ade80 !important;
            }

            body[data-ama-better-marketplace="true"] .flex.gap-2.flex-wrap.pt-4 .UI-Badge__root:nth-child(3),
            body[data-ama-better-marketplace="true"] .group\\/extension-card .UI-Badge__root:nth-child(3) {
                color: #f87171 !important;
                border-color: #f87171 !important;
                padding-left: 8px !important;
                padding-right: 8px !important;
            }

            @media (max-width: 900px) {
                body[data-ama-better-marketplace="true"] .ama-header-container {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }

                body[data-ama-better-marketplace="true"] .ama-header-right {
                    width: 100% !important;
                }

                body[data-ama-better-marketplace="true"] .ama-search-input {
                    flex: 1 !important;
                    width: 100% !important;
                }
            }
        `;

        ctx.dom.onReady(async () => {
            const body = await ctx.dom.queryOne("body");
            if (!body) return;

            const style = await ctx.dom.createElement("style");
            style.setText(carouselCSS);
            body.append(style);

            const script = await ctx.dom.createElement("script");
            script.setText(`
                (() => {
                    const SETTINGS_KEY = 'ama-ui-tweaks.settings';

                    const targetGridsQuery = '.grid[data-media-card-grid="true"], .grid[data-media-card-lazy-grid="true"]';
                    const mediaEntryCardQuery = '[data-media-entry-card-container="true"]';
                    const cardQuery = '.UI-Card__root';
                    const extensionCardQuery = '.group\\/extension-card';
                    const arrowQuery = '.ama-carousel-nav-btn, .ama-manga-carousel-parent';
                    const randomSearchIconPath = 'M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 18 10c0-4.411-3.589-8-8-8s-8 3.589-8 8 3.589 8 8 8zm0-14c3.309 0 6 2.691 6 6s-2.691 6-6 6-6-2.691-6-6 2.691-6 6-6z';
                    const dubFeedUrl = 'https://raw.githubusercontent.com/Bas1874/AniSchedule/refs/heads/master/raw/dub-episode-feed.json';
                    const dubFeedCacheKey = 'ama-anischedule-dub-feed-ids-v2';
                    const dubFeedCacheTTL = 1000 * 60 * 60 * 12;

                    const defaultSettings = {
                        betterMarketplace: true,
                        carousels: true,
                        subDubIcons: true,
                    };

                    function readBrowserSettings() {
                        try {
                            const raw = window.localStorage.getItem(SETTINGS_KEY);
                            if (!raw) return {};
                            const parsed = JSON.parse(raw);
                            if (!parsed || typeof parsed !== 'object') return {};
                            return parsed;
                        } catch (_) {
                            return {};
                        }
                    }

                    function writeBrowserSettings(settings) {
                        try {
                            window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
                        } catch (_) {}
                    }

                    let featureSettings = Object.assign(
                        {},
                        defaultSettings,
                        ${JSON.stringify(initialFeatureSettings)},
                        readBrowserSettings()
                    );

                    const CC_ICON =
                        '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M19 4H5c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zM5 18V6h14l.002 12H5z"></path>' +
                            '<path d="M8 15h2v-2H8v-2h2V9H8c-1.103 0-2 .897-2 2v2c0 1.103.897 2 2 2zm6 0h2v-2h-2v-2h2V9h-2c-1.103 0-2 .897-2 2v2c0 1.103.897 2 2 2z"></path>' +
                        '</svg>';

                    const MIC_ICON =
                        '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M12 14c1.654 0 3-1.346 3-3V5c0-1.654-1.346-3-3-3S9 3.346 9 5v6c0 1.654 1.346 3 3 3z"></path>' +
                            '<path d="M17 11c0 2.757-2.243 5-5 5s-5-2.243-5-5H5c0 3.519 2.613 6.432 6 6.92V21h2v-3.08c3.387-.488 6-3.401 6-6.92h-2z"></path>' +
                        '</svg>';

                    const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>';
                    const MORE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>';
                    const CODE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg>';
                    const DOCUMENTATION_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>';
                    const SETTINGS_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line></svg>';

                    let dubIdSetPromise = null;
                    const dragScrollEnhancementVersion = 'v4';
                    const marketplaceEnhancementVersion = 'v10';
                    const catalogActionSources = new Map();
                    let allExtensionsPromise = null;
                    let extensionUpdatesPromise = null;
                    let catalogActionSourceCounter = 0;
                    let catalogActionHandlerBound = false;

                    function isElement(node) {
                        return node && node.nodeType === 1;
                    }

                    function setBodyFlags() {
                        if (!document.body) return;

                        document.body.setAttribute('data-ama-better-marketplace', String(!!featureSettings.betterMarketplace));
                        document.body.setAttribute('data-ama-carousels', String(!!featureSettings.carousels));
                        document.body.setAttribute('data-ama-subdub-icons', String(!!featureSettings.subDubIcons));
                    }

                    function escapeHtml(value) {
                        return String(value || '')
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;');
                    }

                    function normalizeId(value) {
                        if (value === null || value === undefined) return '';

                        const id = String(value).trim();

                        if (!id) return '';

                        const numeric = id.match(/\\d+/);

                        return numeric ? numeric[0] : id;
                    }

                    function addId(set, value) {
                        const id = normalizeId(value);
                        if (!id) return;

                        set.add(id);
                    }

                    function isIdKey(key) {
                        const normalized = String(key || '').replace(/[-_\\s]/g, '').toLowerCase();

                        return (
                            normalized === 'id' ||
                            normalized === 'animeid' ||
                            normalized === 'mediaid' ||
                            normalized === 'anilistid' ||
                            normalized === 'aniid' ||
                            normalized === 'malid' ||
                            normalized === 'showid'
                        );
                    }

                    function extractDubIdsFromData(data) {
                        const ids = new Set();

                        if (!data) return ids;

                        if (Array.isArray(data)) {
                            data.forEach(item => {
                                if (typeof item === 'string' || typeof item === 'number') {
                                    addId(ids, item);
                                    return;
                                }

                                if (!item || typeof item !== 'object') return;

                                Object.keys(item).forEach(key => {
                                    if (isIdKey(key)) addId(ids, item[key]);
                                });
                            });

                            return ids;
                        }

                        if (typeof data === 'object') {
                            Object.keys(data).forEach(key => {
                                if (/^\\d+$/.test(key)) {
                                    addId(ids, key);
                                }

                                const value = data[key];

                                if (value && typeof value === 'object' && !Array.isArray(value)) {
                                    Object.keys(value).forEach(innerKey => {
                                        if (isIdKey(innerKey)) addId(ids, value[innerKey]);
                                    });
                                }

                                if (Array.isArray(value)) {
                                    value.forEach(item => {
                                        if (!item || typeof item !== 'object') return;

                                        Object.keys(item).forEach(innerKey => {
                                            if (isIdKey(innerKey)) addId(ids, item[innerKey]);
                                        });
                                    });
                                }
                            });
                        }

                        return ids;
                    }

                    function getCachedDubIds() {
                        try {
                            const raw = window.localStorage.getItem(dubFeedCacheKey);
                            if (!raw) return null;

                            const parsed = JSON.parse(raw);

                            if (!parsed || typeof parsed !== 'object') return null;
                            if (!Array.isArray(parsed.ids)) return null;
                            if (!parsed.time || Date.now() - parsed.time > dubFeedCacheTTL) return null;

                            return new Set(parsed.ids.map(normalizeId).filter(Boolean));
                        } catch (_) {
                            return null;
                        }
                    }

                    function setCachedDubIds(ids) {
                        try {
                            window.localStorage.setItem(dubFeedCacheKey, JSON.stringify({
                                time: Date.now(),
                                ids: Array.from(ids)
                            }));
                        } catch (_) {}
                    }

                    async function fetchJsonWithTimeout(url, timeoutMs) {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), timeoutMs);

                        try {
                            const response = await fetch(url, {
                                signal: controller.signal,
                                cache: 'force-cache'
                            });

                            if (!response.ok) return null;

                            return await response.json();
                        } catch (_) {
                            return null;
                        } finally {
                            clearTimeout(timeout);
                        }
                    }

                    function loadDubIds() {
                        if (dubIdSetPromise) return dubIdSetPromise;

                        dubIdSetPromise = (async () => {
                            const cached = getCachedDubIds();
                            if (cached) return cached;

                            const data = await fetchJsonWithTimeout(dubFeedUrl, 7000);
                            const ids = extractDubIdsFromData(data);

                            setCachedDubIds(ids);

                            return ids;
                        })();

                        return dubIdSetPromise;
                    }

                    async function hasDubForAnimeCard(card) {
                        if (!card) return false;

                        const ids = await loadDubIds();

                        const anilistId = normalizeId(card.getAttribute('data-media-id') || card.dataset.amaDubAnilistId || '');
                        const malId = normalizeId(card.getAttribute('data-media-mal-id') || card.dataset.amaDubMalId || '');

                        return ids.has(anilistId) || ids.has(malId);
                    }

                    function removeArrowArtifacts(root) {
                        if (!root || !isElement(root)) return;

                        if (root.matches('.ama-carousel-nav-btn')) {
                            root.remove();
                            return;
                        }

                        if (root.matches('.ama-manga-carousel-parent')) {
                            root.classList.remove('ama-manga-carousel-parent');
                        }

                        root.querySelectorAll('.ama-carousel-nav-btn').forEach(btn => btn.remove());

                        root.querySelectorAll('.ama-manga-carousel-parent').forEach(parent => {
                            parent.classList.remove('ama-manga-carousel-parent');
                        });
                    }

                    function cleanupCarousels(root) {
                        if (!root || !root.querySelectorAll) return;

                        if (root.matches && root.matches(targetGridsQuery)) {
                            root.classList.remove('ama-optimized-carousel');
                            root.dataset.amaCarouselEnhanced = "false";
                        }

                        root.querySelectorAll(targetGridsQuery).forEach(grid => {
                            grid.classList.remove('ama-optimized-carousel');
                            grid.dataset.amaCarouselEnhanced = "false";
                        });
                    }

                    function isRandomSearchSvg(svg) {
                        if (!svg || svg.tagName.toLowerCase() !== 'svg') return false;

                        const path = svg.querySelector('path');
                        if (!path) return false;

                        return path.getAttribute('d') === randomSearchIconPath;
                    }

                    function shouldRemoveRandomSearchSvg(svg) {
                        if (!svg || svg.classList.contains('ama-search-icon')) return false;
                        if (svg.closest('.ama-search-wrapper')) return false;
                        if (svg.closest('button, a, [role="button"], [role="tab"], [role="menuitem"]')) return false;

                        const parent = svg.parentElement;
                        if (!parent) return false;

                        const parentRect = parent.getBoundingClientRect();
                        const svgRect = svg.getBoundingClientRect();

                        if (!parentRect || !svgRect || parentRect.width < 240) return false;

                        const svgCenterX = svgRect.left + (svgRect.width / 2) - parentRect.left;
                        const isCentered = svgCenterX > parentRect.width * 0.35 && svgCenterX < parentRect.width * 0.65;

                        return isCentered;
                    }

                    function removeRandomSearchIcons(root) {
                        if (!featureSettings.betterMarketplace) return;
                        if (!root) return;

                        const svgs = [];

                        if (root.matches && root.matches('svg')) {
                            svgs.push(root);
                        }

                        if (root.querySelectorAll) {
                            root.querySelectorAll('svg').forEach(svg => svgs.push(svg));
                        }

                        svgs.forEach(svg => {
                            if (!isRandomSearchSvg(svg)) return;
                            if (!shouldRemoveRandomSearchSvg(svg)) return;

                            svg.setAttribute('data-ama-random-search-icon', 'true');
                            svg.remove();
                        });
                    }

                    function optimizeImages(root) {
                        if (!root || !root.querySelectorAll) return;

                        root.querySelectorAll('img:not([data-ama-image-optimized="true"])').forEach(img => {
                            img.dataset.amaImageOptimized = "true";
                            img.loading = 'lazy';
                            img.decoding = 'async';

                            try {
                                img.fetchPriority = 'low';
                            } catch (_) {}

                            try {
                                img.draggable = false;
                            } catch (_) {}
                        });
                    }

                    function makeDraggableScroller(el, featureKey) {
                        if (!el) return;
                        if (el.dataset.amaDragScrollEnhanced === dragScrollEnhancementVersion) return;

                        el.dataset.amaDragScrollEnhanced = dragScrollEnhancementVersion;
                        el.dataset.amaDragFeature = featureKey || (
                            el.classList.contains('ama-carousel-row') || el.classList.contains('ama-extension-carousel')
                                ? 'betterMarketplace'
                                : 'carousels'
                        );

                        if (el.querySelectorAll) {
                            el.querySelectorAll('a, img').forEach(node => {
                                try {
                                    node.draggable = false;
                                } catch (_) {}
                            });
                        }

                        let isDown = false;
                        let didDrag = false;
                        let suppressClick = false;
                        let startX = 0;
                        let startScrollLeft = 0;

                        function isRealControl(target) {
                            return !!(
                                target &&
                                target.closest &&
                                target.closest('.ama-clone-action, .ama-clone-actions, button, input, textarea, select, summary, [contenteditable="true"]')
                            );
                        }

                        function isEnabled() {
                            return el.dataset.amaDragFeature === 'betterMarketplace'
                                ? !!featureSettings.betterMarketplace
                                : !!featureSettings.carousels;
                        }

                        function stopDrag(pointerId) {
                            isDown = false;
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
                            if (!isEnabled()) return;
                            if (isRealControl(event.target)) return;
                            if (event.button !== 0) return;

                            isDown = true;
                            didDrag = false;
                            suppressClick = false;
                            startX = event.clientX;
                            startScrollLeft = el.scrollLeft;
                            el.classList.add('ama-drag-pending');

                            try {
                                el.setPointerCapture(event.pointerId);
                            } catch (_) {}
                        }, true);

                        el.addEventListener('pointermove', event => {
                            if (!isDown) return;

                            const dx = event.clientX - startX;

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
                        }, true);

                        el.addEventListener('pointerup', event => {
                            stopDrag(event.pointerId);
                        });

                        el.addEventListener('pointercancel', event => {
                            stopDrag(event.pointerId);
                        });

                        el.addEventListener('click', event => {
                            if (isRealControl(event.target)) return;
                            if (!suppressClick) return;

                            event.preventDefault();
                            event.stopPropagation();
                            suppressClick = false;
                            didDrag = false;
                        }, true);

                        el.addEventListener('dragstart', event => {
                            event.preventDefault();
                            event.stopPropagation();
                        }, true);
                    }

                    function enhanceCarouselGrid(grid) {
                        if (!featureSettings.carousels) return;
                        if (!grid || grid.dataset.amaCarouselEnhanced === "true") return;

                        grid.dataset.amaCarouselEnhanced = "true";
                        grid.classList.add('ama-optimized-carousel');

                        makeDraggableScroller(grid, 'carousels');
                        optimizeImages(grid);
                    }

                    const dubObserver = new IntersectionObserver(entries => {
                        entries.forEach(entry => {
                            if (!entry.isIntersecting) return;

                            const card = entry.target;
                            dubObserver.unobserve(card);

                            if (!featureSettings.subDubIcons) return;

                            const badge = card.querySelector('.ama-media-badge.dub');
                            if (!badge) return;

                            hasDubForAnimeCard(card).then(hasDub => {
                                if (!badge.isConnected) return;
                                if (!featureSettings.subDubIcons) return;

                                if (hasDub) {
                                    badge.hidden = false;
                                    badge.setAttribute('aria-hidden', 'false');
                                } else {
                                    badge.hidden = true;
                                    badge.setAttribute('aria-hidden', 'true');
                                }
                            });
                        });
                    }, {
                        root: null,
                        rootMargin: '500px 900px',
                        threshold: 0.01
                    });

                    function isAnimeCard(card) {
                        if (!card) return false;

                        const explicitType = String(
                            card.getAttribute('data-media-type') ||
                            card.getAttribute('data-entry-type') ||
                            card.getAttribute('data-media-kind') ||
                            ''
                        ).toLowerCase();

                        if (explicitType.includes('manga') || explicitType.includes('novel') || explicitType.includes('book')) {
                            return false;
                        }

                        if (explicitType.includes('anime')) {
                            return true;
                        }

                        if (card.closest('[data-manga-page-container="true"], [data-manga-entry-screen="true"], [data-manga-entry-page="true"]')) {
                            return false;
                        }

                        const lowerPath = String(window.location.pathname || '').toLowerCase();

                        if (lowerPath.includes('manga') || lowerPath.includes('novel') || lowerPath.includes('book')) {
                            return false;
                        }

                        const link = card.querySelector('a[href]');
                        const href = link ? String(link.getAttribute('href') || '').toLowerCase() : '';

                        if (href.includes('manga') || href.includes('novel') || href.includes('book')) {
                            return false;
                        }

                        return true;
                    }

                    function removeMediaBadges(card) {
                        if (!card) return;

                        const yearEl = card.querySelector('[data-media-entry-card-title-section-year-season="true"]');
                        const row = yearEl ? yearEl.parentElement : null;

                        if (row) {
                            row.classList.remove('ama-media-meta-row');
                            row.querySelectorAll('.ama-media-badges').forEach(el => el.remove());
                        }

                        card.dataset.amaMediaBadgeEnhanced = "false";
                    }

                    function cleanupAllMediaBadges(root) {
                        if (!root) return;

                        if (root.matches && root.matches(mediaEntryCardQuery)) {
                            removeMediaBadges(root);
                        }

                        if (root.querySelectorAll) {
                            root.querySelectorAll(mediaEntryCardQuery).forEach(removeMediaBadges);
                        }
                    }

                    function enhanceMediaEntryCard(card) {
                        if (!featureSettings.subDubIcons) {
                            removeMediaBadges(card);
                            return;
                        }

                        if (!card) return;

                        if (!isAnimeCard(card)) {
                            removeMediaBadges(card);
                            return;
                        }

                        if (card.dataset.amaMediaBadgeEnhanced === "true") return;

                        const yearEl = card.querySelector('[data-media-entry-card-title-section-year-season="true"]');
                        const titleEl = card.querySelector('[data-media-entry-card-title-section-title="true"]');

                        if (!yearEl || !titleEl) return;

                        const row = yearEl.parentElement;
                        if (!row) return;

                        card.dataset.amaMediaBadgeEnhanced = "true";

                        row.classList.add('ama-media-meta-row');

                        row.querySelectorAll('.ama-media-badges').forEach(el => el.remove());

                        const badges = document.createElement('span');
                        badges.className = 'ama-media-badges';

                        const dubBadge = document.createElement('span');
                        dubBadge.className = 'ama-media-badge dub';
                        dubBadge.title = 'Dub available';
                        dubBadge.setAttribute('aria-label', 'Dub available');
                        dubBadge.setAttribute('aria-hidden', 'true');
                        dubBadge.hidden = true;
                        dubBadge.innerHTML = MIC_ICON;

                        const ccBadge = document.createElement('span');
                        ccBadge.className = 'ama-media-badge cc';
                        ccBadge.title = 'Captions';
                        ccBadge.setAttribute('aria-label', 'Captions');
                        ccBadge.innerHTML = CC_ICON;

                        badges.appendChild(dubBadge);
                        badges.appendChild(ccBadge);

                        row.appendChild(badges);

                        card.dataset.amaDubTitle = titleEl.textContent.trim();
                        card.dataset.amaDubMalId = card.getAttribute('data-media-mal-id') || '';
                        card.dataset.amaDubAnilistId = card.getAttribute('data-media-id') || '';

                        dubObserver.observe(card);
                    }

                    function filterCards(container, term) {
                        const normalized = String(term || '').toLowerCase();

                        container.querySelectorAll('.group\\\\/extension-card').forEach(card => {
                            const isVisible = card.innerText.toLowerCase().includes(normalized);
                            const wrapper = card.closest('.ama-catalog-card-wrap');

                            if (wrapper) {
                                wrapper.hidden = !isVisible;
                            } else {
                                card.style.display = isVisible ? 'flex' : 'none';
                            }
                        });
                    }

                    function cleanupBetterMarketplace(root) {
                        if (!root) return;

                        const cards = [];

                        if (root.matches && root.matches(cardQuery)) {
                            cards.push(root);
                        }

                        if (root.querySelectorAll) {
                            root.querySelectorAll(cardQuery).forEach(card => cards.push(card));
                        }

                        cards.forEach(card => {
                            const header = card.querySelector(':scope > .ama-header-container');

                            if (header) {
                                const title = header.querySelector('h3');

                                if (title) {
                                    card.insertBefore(title, header);
                                }

                                header.remove();
                            }

                            card.dataset.amaEnhanced = "false";

                            card.querySelectorAll('.ama-extension-carousel').forEach(grid => {
                                grid.classList.remove('ama-extension-carousel');
                                grid.dataset.amaDragScrollEnhanced = "false";
                            });
                        });

                        if (root.querySelectorAll) {
                            root.querySelectorAll('.ama-modal').forEach(modal => modal.remove());
                        }
                    }

                    function getExtensionCardData(card) {
                        const paragraphs = Array.from(card.querySelectorAll('p')).map(p => p.textContent.trim()).filter(Boolean);
                        const badges = Array.from(card.querySelectorAll('.UI-Badge__root')).map(badge => badge.textContent.trim()).filter(Boolean);
                        const idEl = card.querySelector('.text-xs .opacity-30, [data-extension-id], [data-extension-card-id]');
                        const titleEl = card.querySelector('.font-semibold');

                        return {
                            id: (idEl && idEl.textContent.trim()) || '',
                            name: (titleEl && titleEl.textContent.trim()) || paragraphs[0] || 'Extension',
                            description: paragraphs[2] || paragraphs[1] || '',
                            version: badges[0] || '',
                            author: badges[1] || '',
                            language: badges[2] || '',
                        };
                    }

                    function getAmaElementText(element) {
                        return String((element && (element.innerText || element.textContent)) || '').replace(/\s+/g, ' ').trim();
                    }

                    function getUpdateVersionTextFromCard(card) {
                        if (!card || !card.querySelectorAll) return '';

                        const versionPattern = /v?\d+(?:\.\d+){1,}[\w.-]*\s*(?:->|\u2192|\u2014|\u2013)\s*v?\d+(?:\.\d+){1,}[\w.-]*/i;
                        const candidates = Array.from(card.querySelectorAll('.UI-Badge__root, [class*="Badge"], [class*="badge"], span, div'));

                        for (const element of candidates) {
                            const match = getAmaElementText(element).match(versionPattern);
                            if (match) return match[0].replace(/\s*(?:\u2192|\u2014|\u2013)\s*/g, ' -> ');
                        }

                        const cardMatch = getAmaElementText(card).match(versionPattern);
                        return cardMatch ? cardMatch[0].replace(/\s*(?:\u2192|\u2014|\u2013)\s*/g, ' -> ') : '';
                    }

                    function getUpdateTargetVersionFromText(versionText) {
                        const parts = String(versionText || '').split(/->|\u2192|\u2014|\u2013/);
                        return (parts.length > 1 ? parts[parts.length - 1] : '').trim();
                    }

                    function getUpdateTargetVersionFromCard(card) {
                        return getUpdateTargetVersionFromText(getUpdateVersionTextFromCard(card));
                    }

                    function sourceCardHasUpdateAvailable(card) {
                        if (!card) return false;

                        if (getUpdateVersionTextFromCard(card)) return true;

                        const cardText = getAmaElementText(card).toLowerCase();
                        if (/\b(update available|new version)\b/.test(cardText)) return true;

                        return Array.from(card.querySelectorAll ? card.querySelectorAll('button') : []).some(button => {
                            const text = getAmaElementText(button).toLowerCase();
                            return text === 'update' || text === 'install update' || text === 'update available';
                        });
                    }

                    function findVersionBadge(card, updateVersion) {
                        if (!card || !card.querySelectorAll) return null;

                        const badges = Array.from(card.querySelectorAll('.UI-Badge__root, [class*="Badge"], [class*="badge"]'));
                        if (!badges.length) return null;

                        if (updateVersion) {
                            const matching = badges.find(badge => getAmaElementText(badge).includes(updateVersion));
                            if (matching) return matching;

                            const updateLike = badges.find(badge => getUpdateVersionTextFromCard(badge));
                            if (updateLike) return updateLike;
                        }

                        return badges[0];
                    }

                    function applyBlueUpdateState(card, updateVersion, wrapper) {
                        if (!card) return;

                        if (wrapper) wrapper.classList.add('ama-update-available');
                        card.classList.add('ama-update-available');
                        card.dataset.amaUpdateAvailable = 'true';

                        const versionBadge = findVersionBadge(card, updateVersion);

                        if (versionBadge) {
                            versionBadge.classList.add('ama-update-version-badge');
                            if (updateVersion && !getAmaElementText(versionBadge).includes(updateVersion)) {
                                const currentText = getAmaElementText(versionBadge);
                                versionBadge.textContent = currentText && !currentText.includes('->') ? currentText + ' -> ' + updateVersion : updateVersion;
                            }
                            versionBadge.title = updateVersion ? 'Update available: ' + updateVersion : 'Update available';
                            return;
                        }

                        if (!updateVersion) return;

                        const badge = document.createElement('span');
                        badge.className = 'UI-Badge__root ama-update-version-badge';
                        badge.textContent = updateVersion;
                        badge.title = 'Update available: ' + updateVersion;

                        const title = card.querySelector('.font-semibold') || card.firstElementChild;
                        if (title && title.parentNode) {
                            title.parentNode.appendChild(badge);
                        } else {
                            card.appendChild(badge);
                        }
                    }

                    function clearBlueUpdateState(card, wrapper) {
                        if (wrapper) wrapper.classList.remove('ama-update-available');
                        if (!card) return;

                        card.classList.remove('ama-update-available');
                        delete card.dataset.amaUpdateAvailable;
                    }

                    function applyUpdateStateToExtensionCard(card) {
                        if (!sourceCardHasUpdateAvailable(card)) {
                            clearBlueUpdateState(card, null);
                            return;
                        }

                        applyBlueUpdateState(card, getUpdateTargetVersionFromCard(card) || getUpdateVersionTextFromCard(card), null);
                    }

                    function applyUpdateStateToClone(sourceCard, clone, wrapper) {
                        if (!sourceCardHasUpdateAvailable(sourceCard)) {
                            clearBlueUpdateState(clone, wrapper);
                            return;
                        }

                        applyBlueUpdateState(clone, getUpdateTargetVersionFromCard(sourceCard) || getUpdateVersionTextFromCard(sourceCard), wrapper);
                    }

                    function openAmaModal(title, contentHtml) {
                        const modal = document.createElement('div');
                        modal.className = 'ama-modal';
                        modal.innerHTML =
                            '<button type="button" class="ama-modal-close">Close</button>' +
                            '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">' + escapeHtml(title) + '</h2>' +
                            contentHtml;

                        modal.querySelector('.ama-modal-close').onclick = () => modal.remove();

                        modal.onclick = event => {
                            if (event.target === modal) modal.remove();
                        };

                        document.body.appendChild(modal);

                        return modal;
                    }

                    function readStoredString(storage, key) {
                        try {
                            const raw = storage.getItem(key);
                            if (!raw) return '';

                            try {
                                const parsed = JSON.parse(raw);
                                return typeof parsed === 'string' ? parsed : String(raw || '');
                            } catch (_) {
                                return String(raw || '');
                            }
                        } catch (_) {
                            return '';
                        }
                    }

                    function getOrCreateSeanimeClientId() {
                        const existing = readStoredString(window.localStorage, 'seanime-client-id').trim();
                        if (existing) return existing;

                        let next = '';

                        try {
                            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                                next = window.crypto.randomUUID();
                            }
                        } catch (_) {}

                        if (!next) {
                            next = 'seanime-' + Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
                        }

                        try {
                            window.localStorage.setItem('seanime-client-id', next);
                        } catch (_) {}

                        return next;
                    }

                    function getSeanimeHeaders(extraHeaders) {
                        const headers = Object.assign({}, extraHeaders || {});
                        const token = readStoredString(window.localStorage, 'sea-server-auth-token').trim();
                        const clientId = getOrCreateSeanimeClientId();
                        const clientProof = readStoredString(window.sessionStorage, 'seanime-client-id-proof').trim();

                        if (token) headers['X-Seanime-Token'] = token;
                        if (clientId) headers['X-Seanime-Client-Id'] = clientId;
                        if (clientProof) headers['X-Seanime-Client-Id-Proof'] = clientProof;
                        if (window.electron) headers['X-Seanime-Client-Platform'] = 'denshi';

                        return headers;
                    }

                    function syncSeanimeIdentity(response) {
                        if (!response || !response.headers) return;

                        try {
                            const clientId = response.headers.get('X-Seanime-Client-Id') || response.headers.get('x-seanime-client-id') || '';
                            const clientProof = response.headers.get('X-Seanime-Client-Id-Proof') || response.headers.get('x-seanime-client-id-proof') || '';

                            if (clientId.trim()) {
                                window.localStorage.setItem('seanime-client-id', clientId.trim());
                            }

                            if (clientProof.trim()) {
                                window.sessionStorage.setItem('seanime-client-id-proof', clientProof.trim());
                            }
                        } catch (_) {}
                    }

                    function getSeanimeApiCandidates(endpoint) {
                        const raw = String(endpoint || '');

                        if (/^https?:\\/\\//i.test(raw)) return [raw];

                        const path = raw.charAt(0) === '/' ? raw : '/' + raw;
                        const candidates = [path];

                        try {
                            const protocol = window.location && window.location.protocol && window.location.protocol !== 'file:'
                                ? window.location.protocol
                                : 'http:';
                            const hostname = window.location && window.location.hostname ? window.location.hostname : '';

                            if (hostname) {
                                candidates.push(protocol + '//' + hostname + ':43211' + path);
                            }
                        } catch (_) {}

                        candidates.push('http://127.0.0.1:43211' + path);
                        candidates.push('http://localhost:43211' + path);

                        return candidates.filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);
                    }

                    async function parseSeanimeResponse(response) {
                        const text = await response.text();
                        let parsed = text;

                        if (text) {
                            try {
                                parsed = JSON.parse(text);
                            } catch (_) {}
                        }

                        if (!response.ok) {
                            const message = parsed && typeof parsed === 'object' && parsed.error
                                ? parsed.error
                                : (typeof parsed === 'string' && parsed.trim() ? parsed : 'Request failed (HTTP ' + response.status + ').');
                            throw new Error(message);
                        }

                        if (typeof parsed === 'string' && /^\\s*<!doctype|^\\s*<html/i.test(parsed)) {
                            throw new Error('This address did not return Seanime API data.');
                        }

                        if (parsed && typeof parsed === 'object') {
                            if (parsed.error) throw new Error(parsed.error);
                            if (Object.prototype.hasOwnProperty.call(parsed, 'data')) return parsed.data;
                        }

                        return parsed;
                    }

                    async function fetchSeanime(endpoint, options) {
                        const candidates = getSeanimeApiCandidates(endpoint);
                        let lastError = null;

                        for (const candidate of candidates) {
                            const nextOptions = Object.assign({}, options || {});
                            nextOptions.credentials = 'include';
                            nextOptions.cache = nextOptions.cache || 'no-store';
                            nextOptions.headers = getSeanimeHeaders(nextOptions.headers);

                            try {
                                const response = await fetch(candidate, nextOptions);
                                syncSeanimeIdentity(response);
                                return await parseSeanimeResponse(response);
                            } catch (error) {
                                lastError = error;
                            }
                        }

                        throw lastError || new Error('Request failed.');
                    }

                    function flattenExtensions(data) {
                        const result = [];
                        const updates = flattenUpdateData(data);

                        if (!data || typeof data !== 'object') return result;

                        if (Array.isArray(data.extensions)) {
                            data.extensions.forEach(extension => {
                                if (extension) result.push(Object.assign({}, extension, { __amaDisabled: false, __amaUpdateData: updates.find(update => update.extensionID === extension.id) || null }));
                            });
                        }

                        if (Array.isArray(data.disabledExtensions)) {
                            data.disabledExtensions.forEach(extension => {
                                if (extension) result.push(Object.assign({}, extension, { __amaDisabled: true, __amaUpdateData: updates.find(update => update.extensionID === extension.id) || null }));
                            });
                        }

                        ['invalidExtensions', 'invalidUserConfigExtensions'].forEach(key => {
                            if (Array.isArray(data[key])) {
                                data[key].forEach(item => {
                                    if (item && item.extension) result.push(Object.assign({}, item.extension, { __amaUpdateData: updates.find(update => update.extensionID === item.extension.id) || null }));
                                });
                            }
                        });

                        return result;
                    }

                    function flattenUpdateData(data) {
                        if (Array.isArray(data)) return data.filter(Boolean);
                        if (data && Array.isArray(data.hasUpdate)) return data.hasUpdate.filter(Boolean);
                        return [];
                    }

                    function loadExtensionUpdates() {
                        if (extensionUpdatesPromise) return extensionUpdatesPromise;

                        extensionUpdatesPromise = fetchSeanime('/api/v1/extensions/updates', {
                            method: 'GET'
                        }).then(flattenUpdateData).catch(() => {
                            extensionUpdatesPromise = null;
                            return [];
                        });

                        return extensionUpdatesPromise;
                    }

                    function makeUpdateDataFromFetched(fetched, extension, manifestUri) {
                        if (!fetched || !fetched.version) return null;

                        return {
                            extensionID: (extension && extension.id) || fetched.id || '',
                            manifestURI: fetched.manifestURI || fetched.manifestUri || manifestUri || '',
                            version: fetched.version,
                            payload: fetched.payload || '',
                        };
                    }

                    async function findUpdateDataForCard(card, extension, allowFetchFallback) {
                        const data = getExtensionCardData(card);
                        const actionId = getExtensionActionId(data, extension);
                        const updates = await loadExtensionUpdates();
                        const fromCache = updates.find(update => update && update.extensionID === actionId);

                        if (fromCache) return fromCache;
                        if (extension && extension.__amaUpdateData) return extension.__amaUpdateData;

                        const updateVersion = getUpdateTargetVersionFromCard(card);
                        const manifestUri = getExtensionManifestUri(extension);

                        if (updateVersion) {
                            return {
                                extensionID: actionId,
                                manifestURI: manifestUri,
                                version: updateVersion,
                                payload: '',
                            };
                        }

                        if (!allowFetchFallback || !manifestUri || manifestUri === 'builtin') return null;

                        try {
                            const fetched = await postExtensionAction('/api/v1/extensions/external/fetch', {
                                manifestUri
                            });

                            if (fetched && fetched.version && fetched.version !== ((extension && extension.version) || data.version)) {
                                return makeUpdateDataFromFetched(fetched, extension, manifestUri);
                            }
                        } catch (_) {}

                        return null;
                    }

                    function loadAllExtensions() {
                        if (allExtensionsPromise) return allExtensionsPromise;

                        allExtensionsPromise = fetchSeanime('/api/v1/extensions/all', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                withUpdates: false
                            })
                        }).then(flattenExtensions).catch(() => {
                            allExtensionsPromise = null;
                            return [];
                        });

                        return allExtensionsPromise;
                    }

                    function normalizeExtensionText(value) {
                        return String(value || '').trim().toLowerCase();
                    }

                    async function findExtensionForCard(card) {
                        const data = getExtensionCardData(card);
                        const extensions = await loadAllExtensions();

                        if (data.id) {
                            const byId = extensions.find(extension => extension && extension.id === data.id);
                            if (byId) return byId;
                        }

                        const targetName = normalizeExtensionText(data.name);
                        const targetAuthor = normalizeExtensionText(data.author);
                        const targetVersion = normalizeExtensionText(data.version).replace(/^v/, '');
                        const targetDescription = normalizeExtensionText(data.description);

                        let best = null;
                        let bestScore = 0;

                        extensions.forEach(extension => {
                            if (!extension) return;

                            let score = 0;

                            if (targetName && normalizeExtensionText(extension.name) === targetName) score += 6;
                            if (targetAuthor && normalizeExtensionText(extension.author) === targetAuthor) score += 3;
                            if (targetVersion && normalizeExtensionText(extension.version).replace(/^v/, '') === targetVersion) score += 2;
                            if (targetDescription && normalizeExtensionText(extension.description).includes(targetDescription)) score += 1;

                            if (score > bestScore) {
                                best = extension;
                                bestScore = score;
                            }
                        });

                        return bestScore >= 6 ? best : null;
                    }

                    function showInstalledDetails(card) {
                        const data = getExtensionCardData(card);

                        openAmaModal(data.name, [
                            '<p style="color:rgba(255,255,255,.65); margin:0 0 16px 0;">' + escapeHtml(data.description) + '</p>',
                            '<div class="ama-detail-grid">',
                                '<div class="ama-detail-item"><div class="ama-detail-label">ID</div><div>' + escapeHtml(data.id) + '</div></div>',
                                '<div class="ama-detail-item"><div class="ama-detail-label">Version</div><div>' + escapeHtml(data.version || 'Unknown') + '</div></div>',
                                '<div class="ama-detail-item"><div class="ama-detail-label">Author</div><div>' + escapeHtml(data.author || 'Unknown') + '</div></div>',
                                '<div class="ama-detail-item"><div class="ama-detail-label">Language</div><div>' + escapeHtml(data.language || 'Unknown') + '</div></div>',
                            '</div>'
                        ].join(''));
                    }

                    function bindAmaModalClose(modal) {
                        const close = modal && modal.querySelector ? modal.querySelector('.ama-modal-close') : null;
                        if (close) close.onclick = () => modal.remove();
                    }

                    function getExtensionActionId(data, extension) {
                        return (extension && extension.id) || (data && data.id) || '';
                    }

                    function getExtensionManifestUri(extension) {
                        return extension && (extension.manifestURI || extension.manifestUri) ? (extension.manifestURI || extension.manifestUri) : '';
                    }

                    function isExtensionDisabled(card, extension) {
                        if (extension && extension.__amaDisabled) return true;
                        return !!(card && /\\bDisabled\\b/i.test(card.innerText || ''));
                    }

                    function isKolex06VersionExtension(data, extension) {
                        const id = normalizeExtensionText(getExtensionActionId(data, extension));
                        const name = normalizeExtensionText((extension && extension.name) || (data && data.name));
                        return id === 'seautils' || name === 'seautils' || name === 'seautils kolex06-version' || name === 'seautils kolex-version';
                    }

                    function postExtensionAction(endpoint, body) {
                        return fetchSeanime(endpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(body || {})
                        });
                    }

                    function clearExtensionCache() {
                        allExtensionsPromise = null;
                        extensionUpdatesPromise = null;
                    }

                    function renderKolex06VersionPreferencesModal(modal) {
                        const current = Object.assign({}, defaultSettings, featureSettings || {});

                        modal.innerHTML =
                            '<button type="button" class="ama-modal-close">Close</button>' +
                            '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Preferences</h2>' +
                            '<p style="color:rgba(255,255,255,.65); margin:0 0 16px 0;">SeaUtils Kolex06-Version</p>' +
                            '<div class="ama-config-form">' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Better Marketplace</label><input data-ama-pref="betterMarketplace" type="checkbox"></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels</label><input data-ama-pref="carousels" type="checkbox"></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Sub/Dub Icons</label><input data-ama-pref="subDubIcons" type="checkbox"></div>' +
                                '<div class="ama-config-actions"><button type="button" class="ama-config-save">Save</button><span class="ama-config-status"></span></div>' +
                            '</div>';

                        bindAmaModalClose(modal);

                        ['betterMarketplace', 'carousels', 'subDubIcons'].forEach(key => {
                            const input = modal.querySelector('[data-ama-pref="' + key + '"]');
                            if (input) input.checked = current[key] !== false;
                        });

                        const save = modal.querySelector('.ama-config-save');
                        const status = modal.querySelector('.ama-config-status');

                        if (save) {
                            save.onclick = () => {
                                const next = {
                                    betterMarketplace: !!(modal.querySelector('[data-ama-pref="betterMarketplace"]') || {}).checked,
                                    carousels: !!(modal.querySelector('[data-ama-pref="carousels"]') || {}).checked,
                                    subDubIcons: !!(modal.querySelector('[data-ama-pref="subDubIcons"]') || {}).checked,
                                };

                                if (typeof window.__AMA_SAVE_SETTINGS__ === 'function') {
                                    window.__AMA_SAVE_SETTINGS__(next);
                                } else {
                                    featureSettings = Object.assign({}, defaultSettings, next);
                                    writeBrowserSettings(featureSettings);
                                    setBodyFlags();
                                }

                                if (status) status.textContent = 'Preferences saved.';
                            };
                        }
                    }

                    async function showKolex06VersionPreferences() {
                        const modal = openAmaModal('Preferences', '<p>Loading SeaUtils Kolex06-Version preferences...</p>');
                        renderKolex06VersionPreferencesModal(modal);
                    }

                    async function showInstalledMore(card) {
                        const data = getExtensionCardData(card);
                        const modal = openAmaModal(data.name, '<p>Loading extension actions...</p>');

                        try {
                            const extension = await findExtensionForCard(card);
                            const actionId = getExtensionActionId(data, extension);
                            const manifestUri = getExtensionManifestUri(extension);
                            const disabled = isExtensionDisabled(card, extension);
                            const name = (extension && extension.name) || data.name;
                            const version = (extension && extension.version) || data.version || 'Unknown';
                            const author = (extension && extension.author) || data.author || 'Unknown';
                            const language = (extension && extension.language) || data.language || 'Unknown';
                            const description = (extension && extension.description) || data.description || '';
                            const canManage = !!actionId && manifestUri !== 'builtin';
                            const canShowPreferences = isKolex06VersionExtension(data, extension) || !!(extension && extension.userConfig);
                            let activeUpdateData = await findUpdateDataForCard(card, extension, sourceCardHasUpdateAvailable(card));
                            const updateVersion = activeUpdateData && activeUpdateData.version ? activeUpdateData.version : getUpdateTargetVersionFromCard(card);

                            modal.innerHTML =
                                '<button type="button" class="ama-modal-close">Close</button>' +
                                '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">' + escapeHtml(name) + '</h2>' +
                                '<p style="color:rgba(255,255,255,.65); margin:0 0 16px 0;">' + escapeHtml(description) + '</p>' +
                                '<div class="ama-detail-grid">' +
                                    '<div class="ama-detail-item"><div class="ama-detail-label">ID</div><div>' + escapeHtml(actionId || 'Unknown') + '</div></div>' +
                                    '<div class="ama-detail-item"><div class="ama-detail-label">Version</div><div>' + escapeHtml(version) + '</div></div>' +
                                    '<div class="ama-detail-item"><div class="ama-detail-label">Author</div><div>' + escapeHtml(author) + '</div></div>' +
                                    '<div class="ama-detail-item"><div class="ama-detail-label">Language</div><div>' + escapeHtml(language) + '</div></div>' +
                                '</div>' +
                                '<div class="ama-action-panel">' +
                                    (canShowPreferences ? '<button type="button" class="ama-action-button" data-ama-more-action="preferences">Preferences</button>' : '') +
                                    (manifestUri && manifestUri !== 'builtin' ? '<button type="button" class="ama-action-button" data-ama-more-action="check-update">Check for updates</button>' : '') +
                                    '<button type="button" class="ama-action-button" data-ama-more-action="view-updated-code" hidden>View updated code</button>' +
                                    '<button type="button" class="ama-action-button install-update" data-ama-more-action="install-update" hidden>Install update</button>' +
                                    (canManage ? '<button type="button" class="ama-action-button" data-ama-more-action="toggle-disabled">' + (disabled ? 'Enable' : 'Disable') + '</button>' : '') +
                                    (canManage ? '<button type="button" class="ama-action-button danger" data-ama-more-action="uninstall">Uninstall</button>' : '') +
                                    '<div class="ama-action-status"></div>' +
                                '</div>';

                            bindAmaModalClose(modal);

                            const status = modal.querySelector('.ama-action-status');
                            const viewUpdatedCode = modal.querySelector('[data-ama-more-action="view-updated-code"]');
                            const installUpdate = modal.querySelector('[data-ama-more-action="install-update"]');
                            const setStatus = (message) => {
                                if (status) status.textContent = message || '';
                            };
                            const setUpdateActions = (updateData) => {
                                activeUpdateData = updateData || activeUpdateData;
                                const nextVersion = activeUpdateData && activeUpdateData.version ? activeUpdateData.version : updateVersion;
                                const hasUpdate = !!nextVersion;

                                if (viewUpdatedCode) viewUpdatedCode.hidden = !hasUpdate;
                                if (installUpdate) installUpdate.hidden = !hasUpdate;
                                if (hasUpdate) setStatus('Update available: ' + nextVersion);
                            };

                            setUpdateActions(activeUpdateData || (updateVersion ? { extensionID: actionId, manifestURI: manifestUri, version: updateVersion, payload: '' } : null));

                            const preferences = modal.querySelector('[data-ama-more-action="preferences"]');
                            if (preferences) {
                                preferences.onclick = () => {
                                    if (isKolex06VersionExtension(data, extension)) {
                                        renderKolex06VersionPreferencesModal(modal);
                                    } else {
                                        modal.remove();
                                        showInstalledPreferences(card);
                                    }
                                };
                            }

                            const checkUpdate = modal.querySelector('[data-ama-more-action="check-update"]');
                            if (checkUpdate) {
                                checkUpdate.onclick = async () => {
                                    checkUpdate.disabled = true;
                                    setStatus('Checking for updates...');

                                    try {
                                        const fetched = await postExtensionAction('/api/v1/extensions/external/fetch', {
                                            manifestUri
                                        });

                                        if (fetched && fetched.version && fetched.version !== version) {
                                            setUpdateActions(makeUpdateDataFromFetched(fetched, extension, manifestUri));
                                            applyBlueUpdateState(card, fetched.version, null);
                                        } else {
                                            setStatus('The extension is up to date.');
                                        }
                                    } catch (error) {
                                        setStatus(error && error.message ? error.message : 'Could not check for updates.');
                                    } finally {
                                        checkUpdate.disabled = false;
                                    }
                                };
                            }

                            if (viewUpdatedCode) {
                                viewUpdatedCode.onclick = async () => {
                                    viewUpdatedCode.disabled = true;
                                    setStatus('Loading updated code...');

                                    try {
                                        await showUpdatedCodeModal(name, activeUpdateData, manifestUri);
                                        setUpdateActions(activeUpdateData);
                                    } catch (error) {
                                        setStatus(error && error.message ? error.message : 'Could not load updated code.');
                                    } finally {
                                        viewUpdatedCode.disabled = false;
                                    }
                                };
                            }

                            if (installUpdate) {
                                installUpdate.onclick = async () => {
                                    const targetManifestUri = (activeUpdateData && activeUpdateData.manifestURI) || manifestUri;
                                    if (!targetManifestUri) {
                                        setStatus('Could not find the update manifest URL.');
                                        return;
                                    }

                                    installUpdate.disabled = true;
                                    setStatus('Installing update...');

                                    try {
                                        const response = await postExtensionAction('/api/v1/extensions/external/install', {
                                            manifestUri: targetManifestUri
                                        });
                                        clearExtensionCache();
                                        setStatus(response && response.message ? response.message : 'Extension updated.');
                                    } catch (error) {
                                        setStatus(error && error.message ? error.message : 'Could not install update.');
                                    } finally {
                                        installUpdate.disabled = false;
                                    }
                                };
                            }

                            const toggleDisabled = modal.querySelector('[data-ama-more-action="toggle-disabled"]');
                            if (toggleDisabled) {
                                toggleDisabled.onclick = async () => {
                                    toggleDisabled.disabled = true;
                                    setStatus((disabled ? 'Enabling' : 'Disabling') + ' extension...');

                                    try {
                                        await postExtensionAction('/api/v1/extensions/external/disabled', {
                                            id: actionId,
                                            disabled: !disabled
                                        });
                                        clearExtensionCache();
                                        setStatus(disabled ? 'Extension enabled.' : 'Extension disabled.');
                                    } catch (error) {
                                        setStatus(error && error.message ? error.message : 'Could not update this extension.');
                                    } finally {
                                        toggleDisabled.disabled = false;
                                    }
                                };
                            }

                            const uninstall = modal.querySelector('[data-ama-more-action="uninstall"]');
                            if (uninstall) {
                                uninstall.onclick = async () => {
                                    if (!window.confirm('Uninstall ' + name + '?')) return;

                                    uninstall.disabled = true;
                                    setStatus('Uninstalling extension...');

                                    try {
                                        await postExtensionAction('/api/v1/extensions/external/uninstall', {
                                            id: actionId
                                        });
                                        clearExtensionCache();
                                        setStatus('Extension uninstalled.');
                                    } catch (error) {
                                        setStatus(error && error.message ? error.message : 'Could not uninstall this extension.');
                                    } finally {
                                        uninstall.disabled = false;
                                    }
                                };
                            }
                        } catch (error) {
                            if (modal) {
                                modal.innerHTML =
                                    '<button type="button" class="ama-modal-close">Close</button>' +
                                    '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">' + escapeHtml(data.name) + '</h2>' +
                                    '<p>' + escapeHtml(error && error.message ? error.message : 'Could not load extension actions.') + '</p>';
                                bindAmaModalClose(modal);
                            }
                        }
                    }

                    async function hasPreferencesForCard(card) {
                        try {
                            const extension = await findExtensionForCard(card);
                            return !!(extension && extension.userConfig);
                        } catch (_) {
                            return false;
                        }
                    }

                    function sourceCardHasNativePreferences(card) {
                        if (!card || !card.querySelectorAll) return false;

                        const topRight = card.querySelector('[class*="top-3"][class*="right-3"]');
                        if (!topRight) return false;

                        const rows = Array.from(topRight.children).filter(row => {
                            return row && row.querySelectorAll && row.querySelectorAll('button').length > 0;
                        });

                        const actionRow = rows[0];
                        if (!actionRow) return false;

                        return actionRow.querySelectorAll('button').length > 1;
                    }

                    function getSavedConfigValue(extUserConfig, field) {
                        const savedValues = extUserConfig && extUserConfig.savedUserConfig && extUserConfig.savedUserConfig.values
                            ? extUserConfig.savedUserConfig.values
                            : {};

                        if (Object.prototype.hasOwnProperty.call(savedValues, field.name)) {
                            return savedValues[field.name];
                        }

                        return field.default || '';
                    }

                    function appendConfigHelp(parent, field) {
                        if (!field.default) return;

                        const help = document.createElement('div');
                        help.className = 'ama-config-help';
                        help.textContent = 'Default: ' + String(field.default);
                        parent.appendChild(help);
                    }

                    function renderPreferencesModal(modal, extension, extUserConfig) {
                        const fields = extUserConfig && extUserConfig.userConfig && Array.isArray(extUserConfig.userConfig.fields)
                            ? extUserConfig.userConfig.fields
                            : [];

                        modal.innerHTML =
                            '<button type="button" class="ama-modal-close">Close</button>' +
                            '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Preferences</h2>' +
                            '<p style="color:rgba(255,255,255,.65); margin:0 0 16px 0;">' + escapeHtml(extension.name) + '</p>' +
                            '<div class="ama-config-form"></div>';

                        modal.querySelector('.ama-modal-close').onclick = () => modal.remove();

                        const form = modal.querySelector('.ama-config-form');
                        const controls = {};

                        fields.forEach(field => {
                            const savedValue = getSavedConfigValue(extUserConfig, field);

                            if (field.type === 'switch') {
                                const row = document.createElement('div');
                                row.className = 'ama-config-switch-row';

                                const label = document.createElement('label');
                                label.className = 'ama-config-switch-label';
                                label.textContent = field.label || field.name;

                                const input = document.createElement('input');
                                input.type = 'checkbox';
                                input.checked = String(savedValue || field.default || '') === 'true';

                                row.appendChild(label);
                                row.appendChild(input);
                                form.appendChild(row);
                                appendConfigHelp(form, field);

                                controls[field.name] = () => input.checked ? 'true' : 'false';
                                return;
                            }

                            const wrapper = document.createElement('div');
                            wrapper.className = 'ama-config-field';

                            const label = document.createElement('label');
                            label.textContent = field.label || field.name;
                            wrapper.appendChild(label);

                            if (field.type === 'select' && Array.isArray(field.options)) {
                                const select = document.createElement('select');
                                select.className = 'ama-config-select';

                                field.options.forEach(option => {
                                    const item = document.createElement('option');
                                    item.value = String(option.value || '');
                                    item.textContent = String(option.label || option.value || '');
                                    select.appendChild(item);
                                });

                                select.value = String(savedValue || field.default || '');
                                wrapper.appendChild(select);
                                controls[field.name] = () => select.value;
                            } else {
                                const input = document.createElement('input');
                                input.className = 'ama-config-input';
                                input.type = 'text';
                                input.value = String(savedValue || field.default || '');
                                wrapper.appendChild(input);
                                controls[field.name] = () => input.value;
                            }

                            appendConfigHelp(wrapper, field);
                            form.appendChild(wrapper);
                        });

                        const actions = document.createElement('div');
                        actions.className = 'ama-config-actions';

                        const save = document.createElement('button');
                        save.type = 'button';
                        save.className = 'ama-config-save';
                        save.textContent = 'Save';

                        const status = document.createElement('span');
                        status.className = 'ama-config-status';

                        save.onclick = async () => {
                            const values = {};

                            fields.forEach(field => {
                                values[field.name] = controls[field.name] ? controls[field.name]() : String(field.default || '');
                            });

                            save.disabled = true;
                            status.textContent = 'Saving...';

                            try {
                                await fetchSeanime('/api/v1/extensions/user-config', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        id: extension.id,
                                        version: extUserConfig && extUserConfig.userConfig ? extUserConfig.userConfig.version || 0 : 0,
                                        values
                                    })
                                });

                                status.textContent = 'Preferences saved.';
                            } catch (error) {
                                status.textContent = error && error.message ? error.message : 'Could not save preferences.';
                            } finally {
                                save.disabled = false;
                            }
                        };

                        actions.appendChild(save);
                        actions.appendChild(status);
                        form.appendChild(actions);
                    }

                    async function showInstalledPreferences(card) {
                        const data = getExtensionCardData(card);
                        const modal = openAmaModal('Preferences', '<p>Loading preferences for ' + escapeHtml(data.name) + '...</p>');

                        try {
                            const extension = await findExtensionForCard(card);

                            if (!extension || !extension.id) {
                                throw new Error('Could not find this extension.');
                            }

                            if (!extension.userConfig) {
                                throw new Error('This extension has no preferences.');
                            }

                            const extUserConfig = await fetchSeanime('/api/v1/extensions/user-config/' + encodeURIComponent(extension.id), {
                                method: 'GET'
                            });

                            renderPreferencesModal(modal, extension, extUserConfig);
                        } catch (error) {
                            if (modal) {
                                modal.innerHTML =
                                    '<button type="button" class="ama-modal-close">Close</button>' +
                                    '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Preferences</h2>' +
                                    '<p>' + escapeHtml(error && error.message ? error.message : 'Could not load preferences for this extension.') + '</p>';
                                modal.querySelector('.ama-modal-close').onclick = () => modal.remove();
                            }
                        }
                    }

                    async function showUpdatedCodeModal(name, updateData, fallbackManifestUri) {
                        const modal = openAmaModal('Updated code', '<p>Loading updated code for ' + escapeHtml(name) + '...</p>');

                        try {
                            let nextUpdateData = updateData || null;

                            if ((!nextUpdateData || !nextUpdateData.payload) && (fallbackManifestUri || (nextUpdateData && nextUpdateData.manifestURI))) {
                                const fetched = await postExtensionAction('/api/v1/extensions/external/fetch', {
                                    manifestUri: (nextUpdateData && nextUpdateData.manifestURI) || fallbackManifestUri
                                });
                                nextUpdateData = makeUpdateDataFromFetched(fetched, null, fallbackManifestUri) || nextUpdateData;
                            }

                            const payload = nextUpdateData && nextUpdateData.payload ? nextUpdateData.payload : '';
                            const version = nextUpdateData && nextUpdateData.version ? nextUpdateData.version : 'Unknown';

                            modal.innerHTML =
                                '<button type="button" class="ama-modal-close">Close</button>' +
                                '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Updated code</h2>' +
                                '<p style="color:rgba(255,255,255,.65); margin:0;">' + escapeHtml(name) + ' -> ' + escapeHtml(version) + '</p>' +
                                '<pre class="ama-code-preview">' + escapeHtml(payload || 'No updated code found.') + '</pre>';
                            bindAmaModalClose(modal);
                        } catch (error) {
                            modal.innerHTML =
                                '<button type="button" class="ama-modal-close">Close</button>' +
                                '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Updated code</h2>' +
                                '<p>' + escapeHtml(error && error.message ? error.message : 'Could not load updated code.') + '</p>';
                            bindAmaModalClose(modal);
                        }
                    }

                    async function showInstalledCode(card) {
                        const data = getExtensionCardData(card);

                        const modal = openAmaModal('Code', '<p>Loading code for ' + escapeHtml(data.name) + '...</p>');

                        try {
                            const extension = await findExtensionForCard(card);
                            const extensionId = (extension && extension.id) || data.id;

                            if (!extensionId) {
                                throw new Error('Could not find this extension ID.');
                            }

                            let payload = extension && extension.payload ? extension.payload : '';

                            if (!payload) {
                                payload = await fetchSeanime('/api/v1/extensions/payload/' + encodeURIComponent(extensionId), {
                                    method: 'GET'
                                });
                            }

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

                    function getExtensionDocumentationUrl(extension) {
                        if (!extension) return '';

                        return extension.readme ||
                            extension.readmeURL ||
                            extension.readmeUrl ||
                            extension.documentation ||
                            extension.documentationURL ||
                            extension.documentationUrl ||
                            extension.docs ||
                            extension.website ||
                            '';
                    }

                    async function hasDocumentationForCard(card) {
                        try {
                            const extension = await findExtensionForCard(card);
                            return !!getExtensionDocumentationUrl(extension);
                        } catch (_) {
                            return false;
                        }
                    }

                    async function showInstalledDocumentation(card) {
                        const data = getExtensionCardData(card);
                        const modal = openAmaModal('Documentation', '<p>Loading documentation for ' + escapeHtml(data.name) + '...</p>');

                        try {
                            const extension = await findExtensionForCard(card);
                            const documentationUrl = getExtensionDocumentationUrl(extension);

                            if (!documentationUrl) {
                                throw new Error('This extension has no documentation.');
                            }

                            if (/\.md(?:$|[?#])|raw\.githubusercontent\.com/i.test(documentationUrl)) {
                                const response = await fetch(documentationUrl, {
                                    cache: 'no-store'
                                });

                                if (!response.ok) {
                                    throw new Error('Could not load documentation.');
                                }

                                const text = await response.text();
                                modal.innerHTML =
                                    '<button type="button" class="ama-modal-close">Close</button>' +
                                    '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Documentation</h2>' +
                                    '<p style="color:rgba(255,255,255,.65); margin:0;">' + escapeHtml((extension && extension.name) || data.name) + '</p>' +
                                    '<pre class="ama-code-preview">' + escapeHtml(text || 'No documentation found.') + '</pre>';
                                bindAmaModalClose(modal);
                                return;
                            }

                            modal.innerHTML =
                                '<button type="button" class="ama-modal-close">Close</button>' +
                                '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Documentation</h2>' +
                                '<p style="color:rgba(255,255,255,.65); margin:0 0 16px 0;">' + escapeHtml((extension && extension.name) || data.name) + '</p>' +
                                '<a class="ama-action-button" href="' + escapeHtml(documentationUrl) + '" target="_blank" rel="noopener noreferrer">Open documentation</a>';
                            bindAmaModalClose(modal);
                        } catch (error) {
                            modal.innerHTML =
                                '<button type="button" class="ama-modal-close">Close</button>' +
                                '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Documentation</h2>' +
                                '<p>' + escapeHtml(error && error.message ? error.message : 'Could not load documentation for this extension.') + '</p>';
                            bindAmaModalClose(modal);
                        }
                    }

                    function readMarketplaceUrl() {
                        try {
                            const raw = window.localStorage.getItem('marketplace-url');
                            if (!raw) return '';

                            try {
                                return JSON.parse(raw) || '';
                            } catch (_) {
                                return raw || '';
                            }
                        } catch (_) {
                            return '';
                        }
                    }

                    async function fetchMarketplaceExtensionById(extensionId) {
                        const marketplaceUrl = readMarketplaceUrl();
                        const endpoint = marketplaceUrl
                            ? '/api/v1/extensions/marketplace?marketplace=' + encodeURIComponent(marketplaceUrl)
                            : '/api/v1/extensions/marketplace';

                        const extensions = await fetchSeanime(endpoint, {
                            method: 'GET'
                        });

                        if (!Array.isArray(extensions)) return null;

                        return extensions.find(extension => extension && extension.id === extensionId) || null;
                    }

                    async function installMarketplaceExtension(card) {
                        const data = getExtensionCardData(card);

                        if (!data.id) {
                            openAmaModal('Download', '<p>Could not find this extension ID.</p>');
                            return;
                        }

                        const modal = openAmaModal('Download', '<p>Preparing download for ' + escapeHtml(data.name) + '...</p>');

                        try {
                            const extension = await fetchMarketplaceExtensionById(data.id);
                            const manifestUri = extension && (extension.manifestURI || extension.manifestUri);

                            if (!manifestUri) {
                                throw new Error('Could not find manifest URL.');
                            }

                            const json = await fetchSeanime('/api/v1/extensions/external/install', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    manifestUri
                                })
                            });

                            if (modal) {
                                const message = json && json.message ? json.message : 'Extension installed.';
                                modal.innerHTML =
                                    '<button type="button" class="ama-modal-close">Close</button>' +
                                    '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Downloaded</h2>' +
                                    '<p>' + escapeHtml(message) + '</p>';
                                modal.querySelector('.ama-modal-close').onclick = () => modal.remove();
                            }
                        } catch (error) {
                            if (modal) {
                                modal.innerHTML =
                                    '<button type="button" class="ama-modal-close">Close</button>' +
                                    '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Download failed</h2>' +
                                    '<p>' + escapeHtml(error && error.message ? error.message : 'Could not install this extension.') + '</p>';
                                modal.querySelector('.ama-modal-close').onclick = () => modal.remove();
                            }
                        }
                    }

                    function getCatalogActionSourceId(sourceCard) {
                        if (!sourceCard.dataset.amaCatalogSourceId) {
                            catalogActionSourceCounter += 1;
                            sourceCard.dataset.amaCatalogSourceId = String(catalogActionSourceCounter);
                        }

                        catalogActionSources.set(sourceCard.dataset.amaCatalogSourceId, sourceCard);

                        return sourceCard.dataset.amaCatalogSourceId;
                    }

                    function runCatalogAction(action, sourceId) {
                        const sourceCard = catalogActionSources.get(sourceId);

                        if (!sourceCard || !sourceCard.isConnected) {
                            openAmaModal('Action unavailable', '<p>This card is no longer available. Close Full Catalog, open it again, and try once more.</p>');
                            return;
                        }

                        if (action === 'details' || action === 'more') {
                            showInstalledMore(sourceCard);
                            return;
                        }

                        if (action === 'code') {
                            showInstalledCode(sourceCard);
                            return;
                        }

                        if (action === 'documentation') {
                            showInstalledDocumentation(sourceCard);
                            return;
                        }

                        if (action === 'preferences') {
                            const data = getExtensionCardData(sourceCard);

                            if (isKolex06VersionExtension(data)) {
                                showKolex06VersionPreferences();
                            } else {
                                showInstalledPreferences(sourceCard);
                            }

                            return;
                        }

                        if (action === 'download') {
                            installMarketplaceExtension(sourceCard);
                        }
                    }

                    function ensureCatalogActionHandler() {
                        if (catalogActionHandlerBound) return;

                        catalogActionHandlerBound = true;

                        document.addEventListener('click', event => {
                            const target = event.target;
                            const button = target && target.closest ? target.closest('.ama-clone-action') : null;

                            if (!button) return;

                            event.preventDefault();
                            event.stopPropagation();
                            if (event.stopImmediatePropagation) event.stopImmediatePropagation();

                            runCatalogAction(button.dataset.amaAction, button.dataset.amaSourceId);
                        }, true);
                    }

                    function addCloneAction(actions, title, icon, action, sourceId, prepend) {
                        if (actions.querySelector('[data-ama-action="' + action + '"]')) return;

                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'ama-clone-action';
                        button.title = title;
                        button.setAttribute('aria-label', title);
                        button.dataset.amaAction = action;
                        button.dataset.amaSourceId = sourceId;
                        button.innerHTML = icon;
                        button.onpointerdown = event => {
                            event.stopPropagation();
                            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                        };
                        button.onmousedown = event => {
                            event.stopPropagation();
                            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                        };
                        button.onmouseup = event => {
                            event.stopPropagation();
                            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                        };
                        button.addEventListener('click', event => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                            runCatalogAction(action, sourceId);
                        }, true);

                        if (prepend && actions.firstChild) {
                            actions.insertBefore(button, actions.firstChild);
                        } else {
                            actions.appendChild(button);
                        }
                    }

                    function createMarketplaceCloneActions(sourceCard, isInstalledCatalog) {
                        const actions = document.createElement('div');
                        actions.className = 'ama-clone-actions';

                        const liveButtons = Array.from(sourceCard.querySelectorAll('button'));
                        const isInstalled = !!sourceCard.querySelector('button[disabled]');
                        const data = getExtensionCardData(sourceCard);
                        const sourceId = getCatalogActionSourceId(sourceCard);

                        ensureCatalogActionHandler();

                        if (isInstalledCatalog || isInstalled) {
                            addCloneAction(actions, 'Info', MORE_ICON, 'more', sourceId);
                            addCloneAction(actions, 'Code', CODE_ICON, 'code', sourceId);

                            hasDocumentationForCard(sourceCard).then(hasDocumentation => {
                                if (!hasDocumentation) return;
                                if (!actions.isConnected) return;

                                addCloneAction(actions, 'Documentation', DOCUMENTATION_ICON, 'documentation', sourceId);
                            });

                            if (isKolex06VersionExtension(data) || sourceCardHasNativePreferences(sourceCard)) {
                                addCloneAction(actions, 'Preferences', SETTINGS_ICON, 'preferences', sourceId);
                            } else {
                                hasPreferencesForCard(sourceCard).then(hasPreferences => {
                                    if (!hasPreferences) return;
                                    if (!actions.isConnected) return;

                                    addCloneAction(actions, 'Preferences', SETTINGS_ICON, 'preferences', sourceId);
                                });
                            }
                        } else if (!isInstalled && liveButtons.length) {
                            addCloneAction(actions, 'Download', DOWNLOAD_ICON, 'download', sourceId);
                        }

                        return actions.children.length ? actions : null;
                    }

                    function enhanceExtensionCard(card) {
                        if (!featureSettings.betterMarketplace) return;
                        if (!card) return;

                        if (card.dataset.amaEnhanced && card.dataset.amaEnhanced !== marketplaceEnhancementVersion) {
                            cleanupBetterMarketplace(card);
                        }

                        if (card.dataset.amaEnhanced === marketplaceEnhancementVersion) {
                            const enhancedGrid = card.querySelector('.grid');
                            if (enhancedGrid) {
                                enhancedGrid.classList.add('ama-extension-carousel');
                                enhancedGrid.querySelectorAll(extensionCardQuery).forEach(card => {
                                    applyUpdateStateToExtensionCard(card);
                                });
                                makeDraggableScroller(enhancedGrid, 'betterMarketplace');
                            }

                            return;
                        }

                        const titleEl = card.querySelector('h3');
                        const grid = card.querySelector('.grid');

                        if (!titleEl || !grid) return;

                        card.dataset.amaEnhanced = marketplaceEnhancementVersion;

                        const header = document.createElement('div');
                        header.className = 'ama-header-container';

                        const left = document.createElement('div');
                        left.className = 'ama-header-left';
                        left.appendChild(titleEl);

                        const viewBtn = document.createElement('button');
                        viewBtn.type = 'button';
                        viewBtn.className = 'ama-view-btn';
                        viewBtn.innerText = 'View All';
                        left.appendChild(viewBtn);

                        const right = document.createElement('div');
                        right.className = 'ama-header-right';

                        const searchWrapper = document.createElement('div');
                        searchWrapper.className = 'ama-search-wrapper';

                        const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        searchIcon.setAttribute('class', 'ama-search-icon');
                        searchIcon.setAttribute('viewBox', '0 0 24 24');
                        searchIcon.setAttribute('fill', 'none');
                        searchIcon.setAttribute('stroke', 'white');
                        searchIcon.setAttribute('stroke-width', '2');
                        searchIcon.setAttribute('stroke-linecap', 'round');
                        searchIcon.setAttribute('stroke-linejoin', 'round');
                        searchIcon.innerHTML = '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>';

                        const search = document.createElement('input');
                        search.className = 'ama-search-input';
                        search.placeholder = 'Search...';

                        searchWrapper.appendChild(searchIcon);
                        searchWrapper.appendChild(search);
                        right.appendChild(searchWrapper);

                        header.appendChild(left);
                        header.appendChild(right);
                        card.prepend(header);
                        grid.classList.add('ama-extension-carousel');
                        grid.querySelectorAll(extensionCardQuery).forEach(card => {
                            applyUpdateStateToExtensionCard(card);
                        });
                        makeDraggableScroller(grid, 'betterMarketplace');

                        let searchTimer = null;

                        search.oninput = (e) => {
                            clearTimeout(searchTimer);
                            searchTimer = setTimeout(() => {
                                filterCards(grid, e.target.value);
                            }, 140);
                        };

                        viewBtn.onclick = () => {
                            const modal = document.createElement('div');
                            modal.className = 'ama-modal';
                            const isInstalledCatalog = !!document.querySelector('input[placeholder="Search installed extensions..."]');

                            modal.innerHTML =
                                '<button type="button" class="ama-modal-close">Close</button>' +
                                '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">Full Catalog</h2>' +
                                '<div class="ama-search-wrapper" style="margin-bottom:24px;">' +
                                    '<svg class="ama-search-icon" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<circle cx="11" cy="11" r="8"/>' +
                                        '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
                                    '</svg>' +
                                    '<input id="ama-modal-search" class="ama-search-input" placeholder="Search..." style="width:300px;"/>' +
                                '</div>' +
                                '<div id="ama-modal-content"></div>';

                            const items = Array.from(grid.querySelectorAll('.group\\\\/extension-card'));
                            const grouped = items.reduce((acc, item) => {
                                const badges = item.querySelectorAll('.UI-Badge__root');
                                const author = badges[1]?.innerText?.trim() || 'Unknown';

                                if (!acc[author]) acc[author] = [];
                                acc[author].push(item);

                                return acc;
                            }, {});

                            const content = modal.querySelector('#ama-modal-content');
                            const fragment = document.createDocumentFragment();

                            Object.keys(grouped).sort().forEach(author => {
                                const row = document.createElement('div');
                                row.className = 'modal-row';

                                const title = document.createElement('div');
                                title.className = 'modal-row-title';
                                title.textContent = author;

                                const rowGrid = document.createElement('div');
                                rowGrid.className = 'ama-carousel-row';

                                grouped[author].forEach(item => {
                                    const clone = item.cloneNode(true);
                                    const wrapper = document.createElement('div');
                                    wrapper.className = 'ama-catalog-card-wrap';
                                    clone.querySelectorAll('button').forEach(button => button.remove());
                                    optimizeImages(clone);
                                    applyUpdateStateToClone(item, clone, wrapper);

                                    wrapper.appendChild(clone);

                                    const actions = createMarketplaceCloneActions(item, isInstalledCatalog);
                                    if (actions) {
                                        wrapper.appendChild(actions);
                                    }

                                    rowGrid.appendChild(wrapper);
                                });

                                makeDraggableScroller(rowGrid, 'betterMarketplace');

                                row.appendChild(title);
                                row.appendChild(rowGrid);
                                fragment.appendChild(row);
                            });

                            content.appendChild(fragment);

                            const modalSearch = modal.querySelector('#ama-modal-search');
                            let modalSearchTimer = null;

                            modalSearch.oninput = (e) => {
                                clearTimeout(modalSearchTimer);

                                modalSearchTimer = setTimeout(() => {
                                    filterCards(modal, e.target.value);

                                    modal.querySelectorAll('.modal-row').forEach(row => {
                                        const visible = Array.from(row.querySelectorAll('.ama-catalog-card-wrap, .group\\\\/extension-card')).some(card => !card.hidden && card.style.display !== 'none');
                                        row.style.display = visible ? '' : 'none';
                                    });
                                }, 140);
                            };

                            modal.querySelector('.ama-modal-close').onclick = () => modal.remove();

                            modal.onclick = (e) => {
                                if (e.target === modal) modal.remove();
                            };

                            document.body.appendChild(modal);
                        };
                    }

                    function processRoot(root) {
                        if (!root) return;

                        if (!featureSettings.betterMarketplace) {
                            cleanupBetterMarketplace(root);
                        }

                        if (!featureSettings.carousels) {
                            cleanupCarousels(root);
                        }

                        if (!featureSettings.subDubIcons) {
                            cleanupAllMediaBadges(root);
                        }

                        if (root === document) {
                            document.querySelectorAll('.ama-carousel-nav-btn').forEach(btn => btn.remove());

                            document.querySelectorAll('.ama-manga-carousel-parent').forEach(parent => {
                                parent.classList.remove('ama-manga-carousel-parent');
                            });

                            if (featureSettings.carousels) {
                                document.querySelectorAll(targetGridsQuery).forEach(grid => {
                                    enhanceCarouselGrid(grid);
                                });
                            }

                            if (featureSettings.subDubIcons) {
                                document.querySelectorAll(mediaEntryCardQuery).forEach(card => {
                                    enhanceMediaEntryCard(card);
                                });
                            }

                            if (featureSettings.betterMarketplace) {
                                document.querySelectorAll(cardQuery).forEach(card => {
                                    enhanceExtensionCard(card);
                                });
                                document.querySelectorAll(extensionCardQuery).forEach(card => {
                                    applyUpdateStateToExtensionCard(card);
                                });
                            }

                            optimizeImages(document);
                            removeRandomSearchIcons(document);
                            return;
                        }

                        removeArrowArtifacts(root);
                        removeRandomSearchIcons(root);

                        if (root.matches && root.matches(targetGridsQuery)) {
                            enhanceCarouselGrid(root);
                            return;
                        }

                        if (root.matches && root.matches(mediaEntryCardQuery)) {
                            enhanceMediaEntryCard(root);
                            return;
                        }

                        if (root.matches && root.matches(cardQuery)) {
                            enhanceExtensionCard(root);
                            return;
                        }

                        if (featureSettings.betterMarketplace && root.matches && root.matches(extensionCardQuery)) {
                            applyUpdateStateToExtensionCard(root);
                            return;
                        }

                        if (root.querySelectorAll) {
                            if (featureSettings.carousels) {
                                root.querySelectorAll(targetGridsQuery).forEach(grid => {
                                    enhanceCarouselGrid(grid);
                                });
                            }

                            if (featureSettings.subDubIcons) {
                                root.querySelectorAll(mediaEntryCardQuery).forEach(card => {
                                    enhanceMediaEntryCard(card);
                                });
                            }

                            if (featureSettings.betterMarketplace) {
                                root.querySelectorAll(cardQuery).forEach(card => {
                                    enhanceExtensionCard(card);
                                });
                                root.querySelectorAll(extensionCardQuery).forEach(card => {
                                    applyUpdateStateToExtensionCard(card);
                                });
                            }

                            optimizeImages(root);
                        }
                    }

                    const queuedRoots = new Set();
                    let scheduled = false;

                    function flushQueue() {
                        scheduled = false;

                        const roots = Array.from(queuedRoots);
                        queuedRoots.clear();

                        for (const root of roots) {
                            processRoot(root);
                        }
                    }

                    function scheduleRoot(root) {
                        if (!root || !isElement(root)) return;

                        queuedRoots.add(root);

                        if (scheduled) return;
                        scheduled = true;

                        if ('requestIdleCallback' in window) {
                            window.requestIdleCallback(flushQueue, { timeout: 700 });
                        } else {
                            setTimeout(flushQueue, 220);
                        }
                    }

                    window.__AMA_SAVE_SETTINGS__ = function(nextSettings) {
                        featureSettings = Object.assign({}, defaultSettings, nextSettings || {});
                        writeBrowserSettings(featureSettings);

                        setBodyFlags();

                        if (!featureSettings.betterMarketplace) {
                            cleanupBetterMarketplace(document);
                        }

                        if (!featureSettings.carousels) {
                            cleanupCarousels(document);
                        }

                        if (!featureSettings.subDubIcons) {
                            cleanupAllMediaBadges(document);
                        }

                        scheduleRoot(document.body || document.documentElement);
                    };

                    window.__AMA_APPLY_SETTINGS__ = window.__AMA_SAVE_SETTINGS__;

                    setBodyFlags();
                    writeBrowserSettings(featureSettings);
                    processRoot(document);

                    const observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            for (const node of mutation.addedNodes) {
                                if (!isElement(node)) continue;

                                if (
                                    node.matches('.ama-carousel-nav-btn') ||
                                    node.matches('.ama-manga-carousel-parent') ||
                                    node.matches(targetGridsQuery) ||
                                    node.matches(mediaEntryCardQuery) ||
                                    node.matches(cardQuery) ||
                                    node.matches(extensionCardQuery) ||
                                    node.matches('svg')
                                ) {
                                    scheduleRoot(node);
                                    continue;
                                }

                                if (
                                    node.querySelector &&
                                    node.querySelector(arrowQuery + ', ' + targetGridsQuery + ', ' + mediaEntryCardQuery + ', ' + cardQuery + ', ' + extensionCardQuery + ', svg')
                                ) {
                                    scheduleRoot(node);
                                }
                            }
                        }
                    });

                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                })();
            `);

            body.append(script);
        });
    });
}
