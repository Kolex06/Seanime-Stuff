/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

interface AmaSettings {
    betterMarketplace: boolean
    carousels: boolean
    carouselsSearch: boolean
    carouselsExtensions: boolean
    carouselsLists: boolean
    carouselsManga: boolean
    carouselsOther: boolean
    subDubIcons: boolean
    hideFileNames: boolean
}

function init() {
    $ui.register(function(ctx) {

        const SETTINGS_KEY = "ama-ui-tweaks.settings"

        const DEFAULT_SETTINGS: AmaSettings = {
            betterMarketplace: true,
            carousels: true,
            carouselsSearch: false,
            carouselsExtensions: true,
            carouselsLists: true,
            carouselsManga: true,
            carouselsOther: true,
            subDubIcons: true,
            hideFileNames: false,
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
            const betterMarketplace = saved.betterMarketplace !== false

            return {
                betterMarketplace,
                carousels: saved.carousels !== false,
                carouselsSearch: saved.carouselsSearch === true,
                carouselsExtensions: saved.carouselsExtensions !== false,
                carouselsLists: saved.carouselsLists !== false,
                carouselsManga: saved.carouselsManga !== false,
                carouselsOther: saved.carouselsOther !== false,
                subDubIcons: saved.subDubIcons !== false,
                hideFileNames: saved.hideFileNames === true,
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
        const carouselsSearchRef = ctx.fieldRef<boolean>(settingsState.get().carouselsSearch)
        const carouselsExtensionsRef = ctx.fieldRef<boolean>(settingsState.get().carouselsExtensions)
        const carouselsListsRef = ctx.fieldRef<boolean>(settingsState.get().carouselsLists)
        const carouselsMangaRef = ctx.fieldRef<boolean>(settingsState.get().carouselsManga)
        const carouselsOtherRef = ctx.fieldRef<boolean>(settingsState.get().carouselsOther)
        const subDubIconsRef = ctx.fieldRef<boolean>(settingsState.get().subDubIcons)
        const hideFileNamesRef = ctx.fieldRef<boolean>(settingsState.get().hideFileNames)

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

        function setFieldRefValue<T>(fieldRef: any, value: T) {
            try {
                if (fieldRef && typeof fieldRef.set === "function") {
                    fieldRef.set(value)
                }
            } catch (_) {}
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

        carouselsSearchRef.onValueChange((value) => {
            updateSetting("carouselsSearch", !!value)
        })

        carouselsExtensionsRef.onValueChange((value) => {
            updateSetting("carouselsExtensions", !!value)
        })

        carouselsListsRef.onValueChange((value) => {
            updateSetting("carouselsLists", !!value)
        })

        carouselsMangaRef.onValueChange((value) => {
            updateSetting("carouselsManga", !!value)
        })

        carouselsOtherRef.onValueChange((value) => {
            updateSetting("carouselsOther", !!value)
        })

        subDubIconsRef.onValueChange((value) => {
            updateSetting("subDubIcons", !!value)
        })

        hideFileNamesRef.onValueChange((value) => {
            updateSetting("hideFileNames", !!value)
        })

        tray.render(() => {
            const settings = settingsState.get()
            const disabledValueText = (label: string, value: boolean, reason: string) => {
                return tray.text(label + ": " + (value ? "On" : "Off") + " (disabled - " + reason + ")")
            }

            const carouselSearchControl = settings.carousels
                ? tray.switch("Carousels: Search", {
                    fieldRef: carouselsSearchRef,
                })
                : disabledValueText("Carousels: Search", settings.carouselsSearch, "turn on Carousels")

            const carouselExtensionsControl = settings.carousels && settings.betterMarketplace
                ? tray.switch("Carousels: Extensions", {
                    fieldRef: carouselsExtensionsRef,
                })
                : disabledValueText(
                    "Carousels: Extensions",
                    settings.carouselsExtensions,
                    settings.carousels ? "turn on Better Marketplace" : "turn on Carousels"
                )

            const carouselListsControl = settings.carousels
                ? tray.switch("Carousels: My Lists", {
                    fieldRef: carouselsListsRef,
                })
                : disabledValueText("Carousels: My Lists", settings.carouselsLists, "turn on Carousels")

            const carouselMangaControl = settings.carousels
                ? tray.switch("Carousels: Manga", {
                    fieldRef: carouselsMangaRef,
                })
                : disabledValueText("Carousels: Manga", settings.carouselsManga, "turn on Carousels")

            const carouselOtherControl = settings.carousels
                ? tray.switch("Carousels: Other Pages", {
                    fieldRef: carouselsOtherRef,
                })
                : disabledValueText("Carousels: Other Pages", settings.carouselsOther, "turn on Carousels")

            return tray.stack([
                tray.text("SeaUtils Kolex06-Version Settings"),
                tray.switch("Better Marketplace", {
                    fieldRef: betterMarketplaceRef,
                }),
                tray.switch("Carousels", {
                    fieldRef: carouselsRef,
                }),
                carouselSearchControl,
                carouselExtensionsControl,
                carouselListsControl,
                carouselMangaControl,
                carouselOtherControl,
                tray.switch("Sub/Dub Icons", {
                    fieldRef: subDubIconsRef,
                }),
                tray.switch("Hide File Names", {
                    fieldRef: hideFileNamesRef,
                }),
            ])
        })

        const initialFeatureSettings = settingsState.get()

        const carouselCSS = `
            body[data-ama-hide-file-names="true"] [data-episode-grid-item-filename="true"] {
                display: none !important;
            }

            body[data-ama-better-marketplace="true"][data-ama-carousels-active="true"] .group\\/extension-card .absolute.top-3.right-3.flex.flex-col.gap-1 {
                flex-direction: row !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 4px !important;
                padding: 4px !important;
                min-width: 0 !important;
                width: auto !important;
                max-width: max-content !important;
            }

            body[data-ama-better-marketplace="true"][data-ama-carousels-active="true"] .group\\/extension-card .absolute.top-3.right-3.flex.flex-col.gap-1 > button:not(.UI-IconButton_root) {
                width: 32px !important;
                min-width: 32px !important;
                max-width: 32px !important;
                height: 32px !important;
                padding: 0 !important;
                flex: 0 0 32px !important;
            }

            body[data-ama-better-marketplace="true"][data-ama-carousels-active="true"] .group\\/extension-card .absolute.top-3.right-3.flex.flex-col.gap-1 > button:not(.UI-IconButton_root) > .UI-Button__icon {
                margin-inline-end: 0 !important;
            }

            body[data-ama-better-marketplace="true"][data-ama-carousels-active="true"] .group\\/extension-card .absolute.top-3.right-3.flex.flex-col.gap-1 > button:not(.UI-IconButton_root) > span:not(.UI-Button__icon) {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                width: 0 !important;
                max-width: 0 !important;
                overflow: hidden !important;
            }

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

            body[data-ama-better-marketplace="true"][data-ama-better-marketplace-page="true"] input[placeholder*="Search"]:not(.ama-search-input),
            body[data-ama-better-marketplace="true"][data-ama-better-marketplace-page="true"] input[placeholder*="search"]:not(.ama-search-input) {
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

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"],
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"],
            body[data-ama-carousels-active="true"] [data-manga-page-container="true"] [data-media-card-grid="true"],
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"],
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"],
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists-tabs] ~ div .grid {
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

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"],
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"],
            body[data-ama-carousels-active="true"] [data-manga-page-container="true"] [data-media-card-grid="true"],
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"],
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"],
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists-tabs] ~ div .grid,
            body[data-ama-better-marketplace="true"] .ama-carousel-row {
                cursor: grab !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels-active="true"] [data-manga-page-container="true"] [data-media-card-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"]::-webkit-scrollbar,
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists-tabs] ~ div .grid::-webkit-scrollbar,
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

            .ama-dragging a,
            .ama-dragging img,
            .ama-dragging [role="button"] {
                pointer-events: none !important;
            }

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] a,
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] a,
            body[data-ama-carousels-active="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] a,
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] a,
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] a,
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists-tabs] ~ div .grid a,
            body[data-ama-better-marketplace="true"] .ama-carousel-row a,
            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] img,
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] img,
            body[data-ama-better-marketplace="true"] .ama-carousel-row img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] > div,
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] > div,
            body[data-ama-carousels-active="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] > div {
                flex: 0 0 160px !important;
                display: block !important;
                width: 160px !important;
                max-width: 160px !important;
                contain: layout paint style !important;
            }

            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] > div,
            body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] > div {
                flex: 0 0 155px !important;
                display: block !important;
                width: 155px !important;
                max-width: 155px !important;
                contain: layout paint style !important;
            }

            @media (min-width: 768px) {
                body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] > div,
                body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] > div,
                body[data-ama-carousels-active="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] > div {
                    flex: 0 0 185px !important;
                    width: 185px !important;
                    max-width: 185px !important;
                }

                body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] > div,
                body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] > div {
                    flex: 0 0 175px !important;
                    width: 175px !important;
                    max-width: 175px !important;
                }
            }

            @media (min-width: 1280px) {
                body[data-ama-carousels-active="true"] [data-manga-page-container="true"] [data-media-card-grid="true"] > div {
                    flex: 0 0 210px !important;
                    width: 210px !important;
                    max-width: 210px !important;
                }

                body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-grid="true"] > div,
                body[data-ama-carousels-active="true"] [data-anilist-collection-lists="true"] [data-media-card-lazy-grid="true"] > div {
                    flex: 0 0 195px !important;
                    width: 195px !important;
                    max-width: 195px !important;
                }
            }

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] [data-media-entry-card-hover-popup="true"],
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] [data-media-entry-card-hover-popup="true"] {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] [data-media-entry-card-body-image="true"],
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] [data-media-entry-card-body-image="true"] {
                transition: none !important;
                transform: none !important;
                will-change: auto !important;
            }

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] .group\\/media-entry-card:hover [data-media-entry-card-body-image="true"],
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] .group\\/media-entry-card:hover [data-media-entry-card-body-image="true"] {
                transform: none !important;
            }

            body[data-ama-carousels-active="true"] .grid[data-media-card-grid="true"] *,
            body[data-ama-carousels-active="true"] .grid[data-media-card-lazy-grid="true"] * {
                scroll-behavior: auto !important;
            }

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

            .ama-optimized-carousel .group\/media-entry-card:hover [data-media-entry-card-body-image="true"] {
                transform: none !important;
            }

            .ama-optimized-carousel * {
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

            body[data-ama-better-marketplace="true"] .group\\/extension-card[data-ama-update-available="true"],
            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap[data-ama-update-available="true"] > .group\\/extension-card,
            body[data-ama-better-marketplace="true"] .UI-Card__root[data-ama-update-available="true"] {
                border-color: rgba(56, 189, 248, 0.95) !important;
                outline: 1px solid rgba(56, 189, 248, 0.85) !important;
                outline-offset: 0 !important;
                background: rgba(14, 165, 233, 0.12) !important;
                box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.75), 0 0 18px rgba(56, 189, 248, 0.24) !important;
            }

            body[data-ama-better-marketplace="true"] .group\\/extension-card[data-ama-update-available="true"]:hover,
            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap[data-ama-update-available="true"] > .group\\/extension-card:hover,
            body[data-ama-better-marketplace="true"] .UI-Card__root[data-ama-update-available="true"]:hover {
                background: rgba(14, 165, 233, 0.18) !important;
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

            body[data-ama-better-marketplace="true"] .ama-global-catalog-bar {
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 12px !important;
                padding: 0 40px 12px 40px !important;
            }

            body[data-ama-better-marketplace="true"] .ama-global-catalog-btn {
                background: rgba(14,165,233,0.14) !important;
                border: 1px solid rgba(56,189,248,0.45) !important;
                color: #e0f7ff !important;
                padding: 9px 16px !important;
                border-radius: 14px !important;
                cursor: pointer !important;
                font-weight: 700 !important;
                white-space: nowrap !important;
            }

            body[data-ama-better-marketplace="true"] .ama-global-catalog-btn:hover {
                background: rgba(14,165,233,0.22) !important;
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

            body[data-ama-better-marketplace="true"] .ama-catalog-card-wrap[hidden] {
                display: none !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-actions {
                position: absolute !important;
                top: 12px !important;
                right: 12px !important;
                display: grid !important;
                grid-template-columns: 32px 32px !important;
                grid-auto-rows: 32px !important;
                gap: 4px !important;
                z-index: 9999999 !important;
                pointer-events: auto !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="preferences"] {
                grid-column: 1 !important;
                grid-row: 1 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="more"] {
                grid-column: 2 !important;
                grid-row: 1 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="documentation"] {
                grid-column: 1 !important;
                grid-row: 2 !important;
            }

            body[data-ama-better-marketplace="true"] .ama-clone-action[data-ama-action="code"] {
                grid-column: 2 !important;
                grid-row: 2 !important;
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

            .ama-config-switch-row[data-ama-disabled="true"] {
                opacity: .42 !important;
                filter: grayscale(1) !important;
                cursor: not-allowed !important;
                background: rgba(255,255,255,0.025) !important;
                border-color: rgba(255,255,255,0.04) !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] * {
                cursor: not-allowed !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] input {
                opacity: .5 !important;
                accent-color: #64748b !important;
                filter: grayscale(1) saturate(0) !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] input[type="checkbox"] {
                appearance: none !important;
                -webkit-appearance: none !important;
                width: 38px !important;
                height: 22px !important;
                min-width: 38px !important;
                border-radius: 999px !important;
                border: 1px solid rgba(148,163,184,.45) !important;
                background: #1f2937 !important;
                position: relative !important;
                opacity: .9 !important;
                filter: none !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] input[type="checkbox"]:checked {
                background: #475569 !important;
                border-color: rgba(148,163,184,.7) !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] input[type="checkbox"]::before {
                content: "" !important;
                position: absolute !important;
                top: 2px !important;
                left: 2px !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 999px !important;
                background: #94a3b8 !important;
                transition: none !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] input[type="checkbox"]:checked::before {
                transform: translateX(16px) !important;
                background: #cbd5e1 !important;
            }

            .ama-disabled-switch-visual {
                min-width: 44px !important;
                height: 24px !important;
                border-radius: 999px !important;
                border: 1px solid rgba(180,180,180,.45) !important;
                background: #262626 !important;
                color: #d4d4d4 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                line-height: 1 !important;
                pointer-events: none !important;
                box-shadow: none !important;
            }

            .ama-disabled-switch-visual::before {
                content: none !important;
            }

            .ama-disabled-switch-visual[data-ama-checked="true"] {
                background: #3f3f46 !important;
                border-color: rgba(212,212,216,.65) !important;
                color: #f4f4f5 !important;
            }

            .ama-disabled-switch-visual[data-ama-checked="true"]::before {
                content: none !important;
            }

            .ama-config-toggle {
                min-width: 52px !important;
                height: 26px !important;
                border-radius: 999px !important;
                border: 1px solid rgba(148,163,184,.35) !important;
                background: rgba(15,23,42,.9) !important;
                color: #cbd5e1 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 11px !important;
                font-weight: 800 !important;
                cursor: pointer !important;
                box-shadow: none !important;
            }

            .ama-config-toggle[data-ama-value="true"] {
                background: rgba(14,165,233,.22) !important;
                border-color: rgba(56,189,248,.7) !important;
                color: #e0f7ff !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] .ama-config-toggle {
                background: #262626 !important;
                border-color: rgba(180,180,180,.45) !important;
                color: #d4d4d4 !important;
                cursor: not-allowed !important;
            }

            .ama-config-switch-row[data-ama-disabled="true"] .ama-config-toggle[data-ama-value="true"] {
                background: #3f3f46 !important;
                border-color: rgba(212,212,216,.65) !important;
                color: #f4f4f5 !important;
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
                    const arrowQuery = '.ama-carousel-nav-btn, .ama-manga-carousel-parent';
                    const randomSearchIconPath = 'M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 18 10c0-4.411-3.589-8-8-8s-8 3.589-8 8 3.589 8 8 8zm0-14c3.309 0 6 2.691 6 6s-2.691 6-6 6-6-2.691-6-6 2.691-6 6-6z';
                    const dubFeedUrl = 'https://raw.githubusercontent.com/Bas1874/AniSchedule/refs/heads/master/raw/dub-episode-feed.json';
                    const dubFeedCacheKey = 'ama-anischedule-dub-feed-ids-v2';
                    const dubFeedCacheTTL = 1000 * 60 * 60 * 12;

                    const defaultSettings = {
                        betterMarketplace: true,
                        carousels: true,
                        carouselsSearch: false,
                        carouselsExtensions: true,
                        carouselsLists: true,
                        carouselsManga: true,
                        carouselsOther: true,
                        subDubIcons: true,
                        hideFileNames: false,
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

                    function normalizeFeatureSettings(settings) {
                        const next = Object.assign({}, defaultSettings, settings || {});

                        return next;
                    }

                    let featureSettings = normalizeFeatureSettings(Object.assign(
                        {},
                        defaultSettings,
                        ${JSON.stringify(initialFeatureSettings)},
                        readBrowserSettings()
                    ));

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
                    const DOC_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path></svg>';
                    const SETTINGS_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line></svg>';

                    let dubIdSetPromise = null;
                    const dragScrollEnhancementVersion = 'v8';
                    const marketplaceEnhancementVersion = 'v10';
                    const catalogActionSources = new Map();
                    let allExtensionsPromise = null;
                    let catalogActionSourceCounter = 0;
                    let catalogActionHandlerBound = false;

                    function isElement(node) {
                        return node && node.nodeType === 1;
                    }

                    function hasSearchPageSignal() {
                        const path = String(window.location.pathname || '').toLowerCase();
                        const search = String(window.location.search || '').toLowerCase();
                        const hash = String(window.location.hash || '').toLowerCase();
                        const title = String(document.title || '').toLowerCase();
                        const combined = path + ' ' + search + ' ' + hash + ' ' + title;

                        if (/(^|[\/#?&=-])search($|[\/#?&=-])/.test(combined)) return true;
                        if (document.querySelector('[data-search-page-container], [data-search-page-title], [data-search-page-list], [data-search-page="true"], [data-media-search-page="true"]')) return true;
                        if (document.querySelector('input[placeholder*="Search anime"], input[placeholder*="Search Anime"], input[placeholder*="Search manga"], input[placeholder*="Search Manga"], input[placeholder*="Search media"], input[placeholder*="Search Media"], input[placeholder*="Search for anime"], input[placeholder*="Search for Anime"], input[placeholder*="Search for manga"], input[placeholder*="Search for Manga"]')) return true;

                        return false;
                    }

                    function getCarouselPageKey() {
                        const path = String(window.location.pathname || '').toLowerCase();
                        const hash = String(window.location.hash || '').toLowerCase();
                        const combined = path + ' ' + hash;

                        if (hasSearchPageSignal()) {
                            return 'search';
                        }

                        if (isBetterMarketplacePage()) {
                            return 'extensions';
                        }

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

                        return 'other';
                    }

                    function areCarouselsEnabledForCurrentPage() {
                        if (!featureSettings.carousels) return false;

                        const pageKey = getCarouselPageKey();

                        if (pageKey === 'search') return featureSettings.carouselsSearch === true;
                        if (pageKey === 'extensions') return areExtensionCarouselsEnabled();
                        if (pageKey === 'lists') return featureSettings.carouselsLists !== false;
                        if (pageKey === 'manga') return featureSettings.carouselsManga !== false;

                        return featureSettings.carouselsOther !== false;
                    }

                    function areExtensionCarouselsEnabled() {
                        return !!featureSettings.betterMarketplace && !!featureSettings.carousels && featureSettings.carouselsExtensions !== false;
                    }

                    function setBodyFlags() {
                        if (!document.body) return;

                        document.body.setAttribute('data-ama-better-marketplace', String(!!featureSettings.betterMarketplace));
                        document.body.setAttribute('data-ama-better-marketplace-page', String(isBetterMarketplacePage()));
                        document.body.setAttribute('data-ama-carousels', String(!!featureSettings.carousels));
                        document.body.setAttribute('data-ama-carousel-page', getCarouselPageKey());
                        document.body.setAttribute('data-ama-carousels-active', String(areCarouselsEnabledForCurrentPage()));
                        document.body.setAttribute('data-ama-subdub-icons', String(!!featureSettings.subDubIcons));
                        document.body.setAttribute('data-ama-hide-file-names', String(!!featureSettings.hideFileNames));
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
                        let startY = 0;
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
                                : areCarouselsEnabledForCurrentPage();
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
                            if (el.scrollWidth <= el.clientWidth + 2) return;

                            isDown = true;
                            didDrag = false;
                            suppressClick = false;
                            startX = event.clientX;
                            startY = event.clientY;
                            startScrollLeft = el.scrollLeft;
                            el.classList.add('ama-drag-pending');
                        }, true);

                        el.addEventListener('pointermove', event => {
                            if (!isDown) return;

                            const dx = event.clientX - startX;
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
                            suppressClick = false;
                            didDrag = false;
                        }, true);

                        el.addEventListener('dragstart', event => {
                            event.preventDefault();
                            event.stopPropagation();
                        }, true);
                    }

                    function enhanceCarouselGrid(grid) {
                        if (!areCarouselsEnabledForCurrentPage()) return;
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
                            root.querySelectorAll('.ama-global-catalog-bar').forEach(bar => bar.remove());
                            root.querySelectorAll('.ama-extension-carousel').forEach(grid => {
                                grid.classList.remove('ama-extension-carousel');
                                grid.dataset.amaDragScrollEnhanced = "false";
                            });
                            root.querySelectorAll('.ama-modal').forEach(modal => modal.remove());
                        }
                    }

                    function cleanupExtensionCarousels(root) {
                        if (!root) return;

                        const grids = [];

                        if (root.matches && root.matches('.ama-extension-carousel')) {
                            grids.push(root);
                        }

                        if (root.querySelectorAll) {
                            root.querySelectorAll('.ama-extension-carousel').forEach(grid => grids.push(grid));
                        }

                        grids.forEach(grid => {
                            grid.classList.remove('ama-extension-carousel');
                            grid.dataset.amaDragScrollEnhanced = "false";
                            grid.classList.remove('ama-drag-pending');
                            grid.classList.remove('ama-dragging');
                        });
                    }

                    function hasMarketplaceExtensionCards(root) {
                        return !!(root && root.querySelector && root.querySelector('.group\\\\/extension-card'));
                    }

                    function isMarketplaceSectionCard(card) {
                        if (!card || !card.querySelector) return false;

                        const grid = card.querySelector('.ama-extension-carousel, .grid');
                        return hasMarketplaceExtensionCards(grid || card);
                    }

                    function isBetterMarketplacePage() {
                        return hasMarketplaceExtensionCards(document);
                    }

                    function getExtensionCardData(card) {
                        const paragraphs = Array.from(card.querySelectorAll('p')).map(p => p.textContent.trim()).filter(Boolean);
                        const badges = Array.from(card.querySelectorAll('.UI-Badge__root')).map(badge => badge.textContent.trim()).filter(Boolean);
                        const idEl = card.querySelector('.text-xs .opacity-30, [data-extension-id], [data-extension-card-id]');
                        const titleEl = card.querySelector('.font-semibold');
                        const manifestLinkPattern = new RegExp('plugins/[^/?#]+[.]json', 'i');
                        const manifestLink = Array.from(card.querySelectorAll('a[href]')).map(link => link.getAttribute('href') || '').find(href => manifestLinkPattern.test(href)) || '';
                        const manifestId = getExtensionIdFromManifestUri(manifestLink);

                        return {
                            id: (idEl && idEl.textContent.trim()) || manifestId || getKnownExtensionIdFromText(card.innerText || card.textContent || ''),
                            name: (titleEl && titleEl.textContent.trim()) || paragraphs[0] || 'Extension',
                            description: paragraphs[2] || paragraphs[1] || '',
                            version: badges[0] || '',
                            author: badges[1] || '',
                            language: badges[2] || '',
                        };
                    }

                    function hasExtensionUpdateText(value) {
                        const text = String(value || '').trim();
                        if (!text) return false;

                        const normalized = text.replace(/\s+/g, ' ');
                        const arrowChars = [8594, 8658, 10140, 10230].map(code => String.fromCharCode(code));

                        if (normalized.includes('->')) return true;
                        if (arrowChars.some(char => normalized.includes(char))) return true;

                        return new RegExp('\\bv?\\d+(?:\\.\\d+){1,3}\\s+(?:to|updated? to)\\s+v?\\d+(?:\\.\\d+){1,3}\\b', 'i').test(normalized);
                    }

                    function getExtensionUpdateText(card) {
                        if (!card || !card.querySelectorAll) return '';

                        const parts = [];

                        card.querySelectorAll('.UI-Badge__root, [class*="Badge"], [class*="badge"]').forEach(node => {
                            const value = node.textContent && node.textContent.trim();
                            if (value) parts.push(value);
                        });

                        card.querySelectorAll('button, [aria-label], [title]').forEach(node => {
                            const text = node.textContent && node.textContent.trim();
                            const aria = node.getAttribute && node.getAttribute('aria-label');
                            const title = node.getAttribute && node.getAttribute('title');

                            if (text) parts.push(text);
                            if (aria) parts.push(aria);
                            if (title) parts.push(title);
                        });

                        const fullText = card.innerText || card.textContent || '';
                        if (fullText) parts.push(fullText);

                        return parts.join(' | ');
                    }

                    function normalizeVersionText(value) {
                        const match = String(value || '').match(/\d+(?:\.\d+){1,3}/);
                        return match ? match[0] : '';
                    }

                    function compareVersionText(a, b) {
                        const left = normalizeVersionText(a);
                        const right = normalizeVersionText(b);

                        if (!left || !right) return 0;

                        const leftParts = left.split('.').map(part => parseInt(part, 10) || 0);
                        const rightParts = right.split('.').map(part => parseInt(part, 10) || 0);
                        const length = Math.max(leftParts.length, rightParts.length);

                        for (let i = 0; i < length; i += 1) {
                            const diff = (leftParts[i] || 0) - (rightParts[i] || 0);
                            if (diff !== 0) return diff > 0 ? 1 : -1;
                        }

                        return 0;
                    }

                    function getExtensionIdFromManifestUri(value) {
                        const text = String(value || '');
                        const match = text.match(new RegExp('plugins/([^/?#]+)[.]json', 'i'));
                        if (!match) return '';

                        const file = match[1].toLowerCase();
                        if (file === 'seautils-kolex06-version') return 'SeaUtils-Kolex06-Version';
                        if (file === 'asunatracks-sync') return 'asunatracks-sync';

                        return match[1];
                    }

                    function getKnownExtensionIdFromText(value) {
                        const text = normalizeExtensionText(value);

                        if (text.includes('asunatracks sync') || text.includes('asunatracks-sync')) {
                            return 'asunatracks-sync';
                        }

                        if (text.includes('seautils kolex06-version') || text.includes('seautils-kolex06-version')) {
                            return 'SeaUtils-Kolex06-Version';
                        }

                        return '';
                    }

                    function applyExtensionUpdateStyle(card, hasUpdate) {
                        if (!card) return;

                        const wrapper = card.closest && card.closest('.ama-catalog-card-wrap');
                        const targets = wrapper ? [card, wrapper] : [card];

                        if (hasUpdate) {
                            card.dataset.amaUpdateAvailable = 'true';
                            if (wrapper) wrapper.dataset.amaUpdateAvailable = 'true';

                            targets.forEach(target => {
                                if (!target || !target.style) return;

                                target.style.setProperty('border-color', 'rgba(56, 189, 248, 0.95)', 'important');
                                target.style.setProperty('outline', '1px solid rgba(56, 189, 248, 0.85)', 'important');
                                target.style.setProperty('outline-offset', '0', 'important');
                                target.style.setProperty('box-shadow', '0 0 0 1px rgba(56, 189, 248, 0.75), 0 0 18px rgba(56, 189, 248, 0.24)', 'important');
                                target.style.setProperty('background', 'rgba(14, 165, 233, 0.12)', 'important');
                            });
                        } else {
                            delete card.dataset.amaUpdateAvailable;
                            if (wrapper) delete wrapper.dataset.amaUpdateAvailable;

                            targets.forEach(target => {
                                if (!target || !target.style) return;

                                target.style.removeProperty('border-color');
                                target.style.removeProperty('outline');
                                target.style.removeProperty('outline-offset');
                                target.style.removeProperty('box-shadow');
                                target.style.removeProperty('background');
                            });
                        }
                    }

                    function markExtensionUpdateState(card) {
                        if (!card || !card.querySelectorAll) return false;

                        const data = getExtensionCardData(card);
                        const hasUpdate = hasExtensionUpdateText(getExtensionUpdateText(card));
                        const value = hasUpdate ? 'true' : 'false';

                        applyExtensionUpdateStyle(card, hasUpdate);

                        const wrapper = card.closest('.ama-catalog-card-wrap');
                        if (wrapper) {
                            wrapper.dataset.amaUpdateAvailable = value;
                        }

                        if (!hasUpdate && data.version) {
                            findExtensionForCard(card).then(extension => {
                                if (!card.isConnected) return;

                                const installedVersion = extension && extension.version;
                                const marketplaceVersion = data.version;
                                const hasVersionUpdate = compareVersionText(marketplaceVersion, installedVersion) > 0;
                                const nextValue = hasVersionUpdate ? 'true' : 'false';

                                applyExtensionUpdateStyle(card, hasVersionUpdate);

                                const nextWrapper = card.closest('.ama-catalog-card-wrap');
                                if (nextWrapper) {
                                    if (hasVersionUpdate) {
                                        nextWrapper.dataset.amaUpdateAvailable = 'true';
                                    } else {
                                        delete nextWrapper.dataset.amaUpdateAvailable;
                                    }
                                }
                            }).catch(() => {});
                        }

                        return hasUpdate;
                    }

                    function markMarketplaceExtensionCards(root) {
                        if (!root || !root.querySelectorAll) return;

                        const cards = [];

                        if (root.matches && root.matches('.group\\\\/extension-card')) {
                            cards.push(root);
                        }

                        root.querySelectorAll('.group\\\\/extension-card').forEach(card => cards.push(card));

                        cards.forEach(card => markExtensionUpdateState(card));
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

                        if (!data || typeof data !== 'object') return result;

                        if (Array.isArray(data.extensions)) {
                            data.extensions.forEach(extension => {
                                if (extension) result.push(Object.assign({}, extension, { __amaDisabled: false }));
                            });
                        }

                        if (Array.isArray(data.disabledExtensions)) {
                            data.disabledExtensions.forEach(extension => {
                                if (extension) result.push(Object.assign({}, extension, { __amaDisabled: true }));
                            });
                        }

                        ['invalidExtensions', 'invalidUserConfigExtensions'].forEach(key => {
                            if (Array.isArray(data[key])) {
                                data[key].forEach(item => {
                                    if (item && item.extension) result.push(item.extension);
                                });
                            }
                        });

                        return result;
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

                    function getExtensionDocumentationUrl(extension) {
                        if (!extension) return '';

                        return String(extension.readme || extension.documentation || extension.docs || extension.website || '').trim();
                    }

                    function isExtensionDisabled(card, extension) {
                        if (extension && extension.__amaDisabled) return true;
                        return !!(card && /\\bDisabled\\b/i.test(card.innerText || ''));
                    }

                    function isKolex06VersionExtension(data, extension) {
                        const id = normalizeExtensionText(getExtensionActionId(data, extension));
                        const name = normalizeExtensionText((extension && extension.name) || (data && data.name));
                        return id === 'seautils' || id === 'seautils-kolex06-version' || id === 'seautils kolex06-version' || name === 'seautils' || name === 'seautils kolex06-version' || name === 'seautils kolex-version';
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
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: Search</label><button type="button" class="ama-config-toggle" data-ama-pref="carouselsSearch"></button></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: Extensions</label><button type="button" class="ama-config-toggle" data-ama-pref="carouselsExtensions"></button></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: My Lists</label><button type="button" class="ama-config-toggle" data-ama-pref="carouselsLists"></button></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: Manga</label><button type="button" class="ama-config-toggle" data-ama-pref="carouselsManga"></button></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Carousels: Other Pages</label><button type="button" class="ama-config-toggle" data-ama-pref="carouselsOther"></button></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Sub/Dub Icons</label><input data-ama-pref="subDubIcons" type="checkbox"></div>' +
                                '<div class="ama-config-switch-row"><label class="ama-config-switch-label">Hide File Names</label><input data-ama-pref="hideFileNames" type="checkbox"></div>' +
                                '<div class="ama-config-actions"><button type="button" class="ama-config-save">Save</button><span class="ama-config-status"></span></div>' +
                            '</div>';

                        bindAmaModalClose(modal);

                        ['betterMarketplace', 'carousels', 'carouselsSearch', 'carouselsExtensions', 'carouselsLists', 'carouselsManga', 'carouselsOther', 'subDubIcons', 'hideFileNames'].forEach(key => {
                            const control = modal.querySelector('[data-ama-pref="' + key + '"]');
                            if (!control) return;

                            const value = current[key] !== false;

                            if (control.matches('button')) {
                                control.dataset.amaValue = value ? 'true' : 'false';
                                control.textContent = value ? 'On' : 'Off';
                                control.setAttribute('aria-pressed', value ? 'true' : 'false');
                                return;
                            }

                            control.checked = value;
                        });

                        modal.querySelectorAll('.ama-config-toggle').forEach(button => {
                            button.addEventListener('click', () => {
                                if (button.disabled || button.dataset.amaDisabled === 'true') return;

                                const nextValue = button.dataset.amaValue !== 'true';
                                button.dataset.amaValue = nextValue ? 'true' : 'false';
                                button.textContent = nextValue ? 'On' : 'Off';
                                button.setAttribute('aria-pressed', nextValue ? 'true' : 'false');
                            });
                        });

                        const betterMarketplaceInput = modal.querySelector('[data-ama-pref="betterMarketplace"]');
                        const carouselsInput = modal.querySelector('[data-ama-pref="carousels"]');
                        const carouselSettingKeys = ['carouselsSearch', 'carouselsExtensions', 'carouselsLists', 'carouselsManga', 'carouselsOther'];

                        const getPreferenceValue = (control) => {
                            if (!control) return false;
                            if (control.matches && control.matches('button')) return control.dataset.amaValue === 'true';
                            if (control.dataset && control.dataset.amaSavedChecked) return control.dataset.amaSavedChecked === 'true';
                            return !!control.checked;
                        };

                        const setPreferenceDisabled = (input, disabled, title) => {
                            if (!input) return;

                            const row = input.closest('.ama-config-switch-row');
                            let visual = row ? row.querySelector('.ama-disabled-switch-visual') : null;
                            const savedChecked = getPreferenceValue(input);

                            if (input.matches && input.matches('button')) {
                                input.disabled = !!disabled;
                                input.dataset.amaDisabled = disabled ? 'true' : 'false';

                                if (row) {
                                    row.dataset.amaDisabled = disabled ? 'true' : 'false';
                                    row.title = disabled ? (title || '') : '';
                                    row.style.opacity = disabled ? '0.42' : '';
                                    row.style.filter = disabled ? 'grayscale(1)' : '';
                                    row.style.background = disabled ? 'rgba(255,255,255,0.025)' : '';
                                    row.style.borderColor = disabled ? 'rgba(255,255,255,0.04)' : '';
                                }

                                return;
                            }

                            input.disabled = !!disabled;
                            input.style.visibility = disabled ? 'hidden' : '';
                            input.style.position = disabled ? 'absolute' : '';
                            input.style.right = disabled ? '12px' : '';
                            input.style.pointerEvents = disabled ? 'none' : '';
                            input.style.width = disabled ? '0' : '';
                            input.style.height = disabled ? '0' : '';
                            input.style.minWidth = disabled ? '0' : '';
                            input.style.opacity = disabled ? '0' : '';
                            input.style.accentColor = disabled ? '#64748b' : '';
                            input.style.filter = disabled ? 'grayscale(1) saturate(0)' : '';
                            input.style.borderRadius = disabled ? '999px' : '';
                            input.style.border = disabled ? '1px solid rgba(148,163,184,.55)' : '';
                            input.style.background = disabled ? '#262626' : '';
                            input.style.boxShadow = disabled ? 'none' : '';

                            if (!row) return;

                            if (disabled) {
                                input.dataset.amaSavedChecked = savedChecked ? 'true' : 'false';
                                input.checked = false;

                                if (!visual) {
                                    visual = document.createElement('span');
                                    visual.className = 'ama-disabled-switch-visual';
                                    row.appendChild(visual);
                                }

                                visual.dataset.amaChecked = savedChecked ? 'true' : 'false';
                                visual.textContent = savedChecked ? 'On' : 'Off';
                            } else if (visual) {
                                visual.remove();
                            }

                            if (!disabled && input.dataset.amaSavedChecked) {
                                input.checked = input.dataset.amaSavedChecked === 'true';
                                delete input.dataset.amaSavedChecked;
                            }

                            row.dataset.amaDisabled = disabled ? 'true' : 'false';
                            row.title = disabled ? (title || '') : '';
                            row.style.opacity = disabled ? '0.42' : '';
                            row.style.filter = disabled ? 'grayscale(1)' : '';
                            row.style.background = disabled ? 'rgba(255,255,255,0.025)' : '';
                            row.style.borderColor = disabled ? 'rgba(255,255,255,0.04)' : '';
                        };

                        const syncCarouselControls = () => {
                            const carouselsEnabled = !carouselsInput || carouselsInput.checked;
                            const betterMarketplaceEnabled = !betterMarketplaceInput || betterMarketplaceInput.checked;

                            carouselSettingKeys.forEach(key => {
                                const input = modal.querySelector('[data-ama-pref="' + key + '"]');
                                let disabled = !carouselsEnabled;
                                let title = 'Turn on Carousels to use this setting.';

                                if (key === 'carouselsExtensions' && !betterMarketplaceEnabled) {
                                    disabled = true;
                                    title = 'Turn on Better Marketplace to use this setting.';
                                }

                                setPreferenceDisabled(input, disabled, title);
                            });
                        };

                        if (betterMarketplaceInput) {
                            betterMarketplaceInput.addEventListener('change', syncCarouselControls);
                        }

                        if (carouselsInput) {
                            carouselsInput.addEventListener('change', syncCarouselControls);
                        }

                        syncCarouselControls();

                        const save = modal.querySelector('.ama-config-save');
                        const status = modal.querySelector('.ama-config-status');

                        if (save) {
                            save.onclick = () => {
                                const readPreferenceChecked = (key) => {
                                    return getPreferenceValue(modal.querySelector('[data-ama-pref="' + key + '"]'));
                                };

                                const next = {
                                    betterMarketplace: readPreferenceChecked('betterMarketplace'),
                                    carousels: readPreferenceChecked('carousels'),
                                    carouselsSearch: readPreferenceChecked('carouselsSearch'),
                                    carouselsExtensions: readPreferenceChecked('carouselsExtensions'),
                                    carouselsLists: readPreferenceChecked('carouselsLists'),
                                    carouselsManga: readPreferenceChecked('carouselsManga'),
                                    carouselsOther: readPreferenceChecked('carouselsOther'),
                                    subDubIcons: readPreferenceChecked('subDubIcons'),
                                    hideFileNames: readPreferenceChecked('hideFileNames'),
                                };

                                if (typeof window.__AMA_SAVE_SETTINGS__ === 'function') {
                                    window.__AMA_SAVE_SETTINGS__(next);
                                } else {
                                    featureSettings = normalizeFeatureSettings(next);
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
                                    (canManage ? '<button type="button" class="ama-action-button" data-ama-more-action="toggle-disabled">' + (disabled ? 'Enable' : 'Disable') + '</button>' : '') +
                                    (canManage ? '<button type="button" class="ama-action-button danger" data-ama-more-action="uninstall">Uninstall</button>' : '') +
                                    '<div class="ama-action-status"></div>' +
                                '</div>';

                            bindAmaModalClose(modal);

                            const status = modal.querySelector('.ama-action-status');
                            const setStatus = (message) => {
                                if (status) status.textContent = message || '';
                            };

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
                                            setStatus('Update available: ' + fetched.version);
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
                        const extension = await findExtensionForCard(card);
                        return !!(extension && extension.userConfig);
                    }

                    function getKnownDocumentationUrl(data) {
                        const id = normalizeExtensionText(data && data.id);
                        const name = normalizeExtensionText(data && data.name);

                        if (id === 'seautils-kolex06-version' || name === 'seautils kolex06-version') {
                            return 'https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/SeaUtilsKolex06Version/README.md';
                        }

                        if (id === 'asunatracks-sync' || name === 'asunatracks sync') {
                            return 'https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/AsunaTracksSync/README.md';
                        }

                        return '';
                    }

                    async function getDocumentationUrlForCard(card) {
                        const data = getExtensionCardData(card);
                        let url = getKnownDocumentationUrl(data);
                        if (url) return url;

                        const extension = await findExtensionForCard(card);
                        url = getExtensionDocumentationUrl(extension);
                        if (url) return url;

                        if (data.id) {
                            const marketplaceExtension = await fetchMarketplaceExtensionById(data.id);
                            url = getExtensionDocumentationUrl(marketplaceExtension);
                        }

                        return url;
                    }

                    async function hasDocumentationForCard(card) {
                        return !!(await getDocumentationUrlForCard(card));
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

                    async function showInstalledDocumentation(card) {
                        const data = getExtensionCardData(card);

                        try {
                            const url = await getDocumentationUrlForCard(card);

                            if (!url) {
                                openAmaModal('Documentation', '<p>No documentation found for ' + escapeHtml(data.name) + '.</p>');
                                return;
                            }

                            window.open(url, '_blank', 'noopener,noreferrer');
                        } catch (error) {
                            openAmaModal('Documentation', '<p>' + escapeHtml(error && error.message ? error.message : 'Could not open documentation.') + '</p>');
                        }
                    }

                    async function showInstalledCode(card) {
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

                        actions.appendChild(button);
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
                            if (isKolex06VersionExtension(data) || sourceCardHasNativePreferences(sourceCard)) {
                                addCloneAction(actions, 'Preferences', SETTINGS_ICON, 'preferences', sourceId);
                            } else {
                                hasPreferencesForCard(sourceCard).then(hasPreferences => {
                                    if (!hasPreferences) return;

                                    addCloneAction(actions, 'Preferences', SETTINGS_ICON, 'preferences', sourceId);
                                });
                            }

                            addCloneAction(actions, 'More', MORE_ICON, 'more', sourceId);

                            if (getKnownDocumentationUrl(data)) {
                                addCloneAction(actions, 'Documentation', DOC_ICON, 'documentation', sourceId);
                            } else {
                                hasDocumentationForCard(sourceCard).then(hasDocumentation => {
                                    if (!hasDocumentation) return;

                                    addCloneAction(actions, 'Documentation', DOC_ICON, 'documentation', sourceId);
                                });
                            }

                            addCloneAction(actions, 'Code', CODE_ICON, 'code', sourceId);
                        } else if (!isInstalled && liveButtons.length) {
                            addCloneAction(actions, 'Download', DOWNLOAD_ICON, 'download', sourceId);
                        }

                        return actions.children.length ? actions : null;
                    }

                    function getMarketplaceSections() {
                        return Array.from(document.querySelectorAll(cardQuery)).map(card => {
                            if (!isMarketplaceSectionCard(card)) return null;

                            const titleEl = card.querySelector('.ama-header-left h3, h3');
                            const grid = card.querySelector('.ama-extension-carousel, .grid');

                            if (!titleEl || !grid) return null;

                            const items = Array.from(grid.querySelectorAll('.group\\\\/extension-card'));
                            if (!items.length) return null;

                            return {
                                title: titleEl.textContent.trim() || 'Extensions',
                                card,
                                grid,
                                items,
                            };
                        }).filter(Boolean);
                    }

                    function getAuthorFullCatalogSections() {
                        const grouped = new Map();

                        getMarketplaceSections().forEach(section => {
                            section.items.forEach(item => {
                                const data = getExtensionCardData(item);
                                const author = data.author || 'Unknown';

                                if (!grouped.has(author)) {
                                    grouped.set(author, {
                                        title: author,
                                        card: section.card,
                                        grid: section.grid,
                                        items: [],
                                    });
                                }

                                grouped.get(author).items.push(item);
                            });
                        });

                        return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title));
                    }

                    function getCatalogGroupingLabel(item, fallbackTitle) {
                        const data = getExtensionCardData(item);
                        const language = data.language || '';
                        const author = data.author || '';

                        if (language && author) return language + ' - ' + author;
                        if (language) return language;
                        if (author) return author;

                        return fallbackTitle || 'Unknown';
                    }

                    function groupMarketplaceItemsForViewAll(section) {
                        const grouped = new Map();
                        const fallbackTitle = section && section.title ? section.title : 'Full Catalog';

                        if (!section || !Array.isArray(section.items)) return [];

                        section.items.forEach(item => {
                            const title = getCatalogGroupingLabel(item, fallbackTitle);

                            if (!grouped.has(title)) {
                                grouped.set(title, {
                                    title,
                                    card: section.card,
                                    grid: section.grid,
                                    items: [],
                                });
                            }

                            grouped.get(title).items.push(item);
                        });

                        return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title));
                    }

                    function appendCatalogCards(rowGrid, items, isInstalledCatalog) {
                        items.forEach(item => {
                            const clone = item.cloneNode(true);
                            const wrapper = document.createElement('div');
                            wrapper.className = 'ama-catalog-card-wrap';
                            clone.querySelectorAll('button').forEach(button => button.remove());
                            markExtensionUpdateState(clone);
                            optimizeImages(clone);

                            wrapper.appendChild(clone);

                            const actions = createMarketplaceCloneActions(item, isInstalledCatalog);
                            if (actions) {
                                wrapper.appendChild(actions);
                            }

                            rowGrid.appendChild(wrapper);
                        });
                    }

                    function bindFullCatalogSearch(modal) {
                        const modalSearch = modal.querySelector('#ama-modal-search');
                        if (!modalSearch) return;

                        let modalSearchTimer = null;

                        modalSearch.oninput = (e) => {
                            clearTimeout(modalSearchTimer);

                            modalSearchTimer = setTimeout(() => {
                                filterCards(modal, e.target.value);

                                modal.querySelectorAll('.modal-row').forEach(row => {
                                    const visible = Array.from(row.querySelectorAll('.ama-catalog-card-wrap, .group\\/extension-card')).some(card => !card.hidden && card.style.display !== 'none');
                                    row.style.display = visible ? '' : 'none';
                                });
                            }, 140);
                        };
                    }

                    function openFullCatalogModal(sections, title) {
                        const modal = document.createElement('div');
                        modal.className = 'ama-modal';
                        const isInstalledCatalog = !!document.querySelector('input[placeholder="Search installed extensions..."]');

                        modal.innerHTML =
                            '<button type="button" class="ama-modal-close">Close</button>' +
                            '<h2 style="margin-top:0; margin-bottom:16px; font-size:32px;">' + escapeHtml(title || 'Full Catalog') + '</h2>' +
                            '<div class="ama-search-wrapper" style="margin-bottom:24px;">' +
                                '<svg class="ama-search-icon" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                                    '<circle cx="11" cy="11" r="8"/>' +
                                    '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
                                '</svg>' +
                                '<input id="ama-modal-search" class="ama-search-input" placeholder="Search..." style="width:300px;"/>' +
                            '</div>' +
                            '<div id="ama-modal-content"></div>';

                        const content = modal.querySelector('#ama-modal-content');
                        const fragment = document.createDocumentFragment();

                        sections.forEach(section => {
                            const row = document.createElement('div');
                            row.className = 'modal-row';

                            const rowTitle = document.createElement('div');
                            rowTitle.className = 'modal-row-title';
                            rowTitle.textContent = section.title;

                            const rowGrid = document.createElement('div');
                            rowGrid.className = 'ama-carousel-row';

                            appendCatalogCards(rowGrid, section.items, isInstalledCatalog);
                            makeDraggableScroller(rowGrid, 'betterMarketplace');

                            row.appendChild(rowTitle);
                            row.appendChild(rowGrid);
                            fragment.appendChild(row);
                        });

                        content.appendChild(fragment);

                        bindFullCatalogSearch(modal);

                        modal.querySelector('.ama-modal-close').onclick = () => modal.remove();

                        modal.onclick = (e) => {
                            if (e.target === modal) modal.remove();
                        };

                        document.body.appendChild(modal);
                    }

                    function ensureGlobalFullCatalogButton() {
                        if (!featureSettings.betterMarketplace) return;
                        const existing = document.querySelector('.ama-global-catalog-bar');
                        const sections = getMarketplaceSections();
                        if (existing) {
                            if (!sections.length) {
                                existing.remove();
                                return;
                            }

                            existing.querySelector('.ama-global-catalog-btn').onclick = () => openFullCatalogModal(getAuthorFullCatalogSections(), 'Full Catalog');
                            return;
                        }
                        if (!sections.length) return;

                        const firstCard = sections[0].card;
                        if (!firstCard || !firstCard.parentElement) return;

                        const bar = document.createElement('div');
                        bar.className = 'ama-global-catalog-bar';

                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'ama-global-catalog-btn';
                        button.textContent = 'Full Catalog';
                        button.onclick = () => openFullCatalogModal(getAuthorFullCatalogSections(), 'Full Catalog');

                        bar.appendChild(button);
                        firstCard.parentElement.insertBefore(bar, firstCard);
                    }

                    function enhanceExtensionCard(card) {
                        if (!featureSettings.betterMarketplace) return;
                        if (!card) return;

                        if (!isMarketplaceSectionCard(card)) {
                            if (card.dataset.amaEnhanced || card.querySelector(':scope > .ama-header-container')) {
                                cleanupBetterMarketplace(card);
                            }

                            return;
                        }

                        if (card.dataset.amaEnhanced && card.dataset.amaEnhanced !== marketplaceEnhancementVersion) {
                            cleanupBetterMarketplace(card);
                        }

                        markMarketplaceExtensionCards(card);

                        if (card.dataset.amaEnhanced === marketplaceEnhancementVersion) {
                            const enhancedGrid = card.querySelector('.grid');
                            if (enhancedGrid && areExtensionCarouselsEnabled()) {
                                enhancedGrid.classList.add('ama-extension-carousel');
                                makeDraggableScroller(enhancedGrid, 'betterMarketplace');
                            } else {
                                cleanupExtensionCarousels(card);
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
                        if (areExtensionCarouselsEnabled()) {
                            grid.classList.add('ama-extension-carousel');
                            makeDraggableScroller(grid, 'betterMarketplace');
                        } else {
                            cleanupExtensionCarousels(card);
                        }

                        let searchTimer = null;

                        search.oninput = (e) => {
                            clearTimeout(searchTimer);
                            searchTimer = setTimeout(() => {
                                filterCards(grid, e.target.value);
                            }, 140);
                        };

                        viewBtn.onclick = () => {
                            const section = {
                                title: titleEl.textContent.trim() || 'Full Catalog',
                                card,
                                grid,
                                items: Array.from(grid.querySelectorAll('.group\\\\/extension-card')),
                            };

                            openFullCatalogModal(groupMarketplaceItemsForViewAll(section), 'Full Catalog');
                        };

                    }

                    function processRoot(root) {
                        if (!root) return;

                        setBodyFlags();

                        if (!featureSettings.betterMarketplace) {
                            cleanupBetterMarketplace(root);
                        }

                        if (!areCarouselsEnabledForCurrentPage()) {
                            cleanupCarousels(root);
                        }

                        if (!areExtensionCarouselsEnabled()) {
                            cleanupExtensionCarousels(root);
                        }

                        if (!featureSettings.subDubIcons) {
                            cleanupAllMediaBadges(root);
                        }

                        if (root === document) {
                            document.querySelectorAll('.ama-carousel-nav-btn').forEach(btn => btn.remove());

                            document.querySelectorAll('.ama-manga-carousel-parent').forEach(parent => {
                                parent.classList.remove('ama-manga-carousel-parent');
                            });

                            if (areCarouselsEnabledForCurrentPage()) {
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
                                markMarketplaceExtensionCards(document);
                                ensureGlobalFullCatalogButton();
                            } else {
                                cleanupBetterMarketplace(document);
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

                        if (root.querySelectorAll) {
                            if (areCarouselsEnabledForCurrentPage()) {
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
                                markMarketplaceExtensionCards(root);
                                ensureGlobalFullCatalogButton();
                            } else {
                                cleanupBetterMarketplace(root);
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
                        featureSettings = normalizeFeatureSettings(nextSettings);
                        writeBrowserSettings(featureSettings);

                        setBodyFlags();

                        if (!featureSettings.betterMarketplace) {
                            cleanupBetterMarketplace(document);
                        }

                        if (!areCarouselsEnabledForCurrentPage()) {
                            cleanupCarousels(document);
                        }

                        if (!areExtensionCarouselsEnabled()) {
                            cleanupExtensionCarousels(document);
                        }

                        if (!featureSettings.subDubIcons) {
                            cleanupAllMediaBadges(document);
                        }

                        scheduleRoot(document.body || document.documentElement);
                    };

                    window.__AMA_APPLY_SETTINGS__ = window.__AMA_SAVE_SETTINGS__;

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
                                    node.matches('svg')
                                ) {
                                    scheduleRoot(node);
                                    continue;
                                }

                                if (
                                    node.querySelector &&
                                    node.querySelector(arrowQuery + ', ' + targetGridsQuery + ', ' + mediaEntryCardQuery + ', ' + cardQuery + ', svg')
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
