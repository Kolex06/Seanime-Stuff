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

        const LEGACY_SEAUTILS_MANIFEST_URL = "https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/b9b9b0ddabcf3bd4d93cdee04e9155644707fe35/plugins/SeaUtils-Kolex06-Version.json"
        const SEAUTILS_TRAY_ICON_URL = "https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/icons/SeaUtils-Kolex06-Version.png"
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

        const tray = ctx.newTray({
            iconUrl: SEAUTILS_TRAY_ICON_URL,
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

        function normalizeLineEndings(source: string): string {
            return String(source || "").replace(/\r\n/g, "\n")
        }

        function extractTemplate(source: string, startNeedle: string, endNeedle: string): string {
            const start = source.indexOf(startNeedle)
            if (start < 0) {
                throw new Error("Could not find " + startNeedle)
            }

            const bodyStart = start + startNeedle.length
            const end = source.indexOf(endNeedle, bodyStart)
            if (end < 0) {
                throw new Error("Could not find template end for " + startNeedle)
            }

            return source.slice(bodyStart, end)
        }

        function hydrateTemplate(template: string): string {
            return String(template || "").replace(
                /\$\{JSON\.stringify\(initialFeatureSettings\)\}/g,
                JSON.stringify(initialFeatureSettings)
            )
        }

        async function loadLegacyPayload(): Promise<string> {
            const fetcher = (ctx as any).fetch
                ? (ctx as any).fetch.bind(ctx)
                : (globalThis as any).fetch.bind(globalThis)

            const response = await fetcher(LEGACY_SEAUTILS_MANIFEST_URL, {
                cache: "no-store",
            })

            if (!response.ok) {
                throw new Error("Could not fetch old SeaUtils payload")
            }

            const manifest = await response.json()
            const payload = manifest && typeof manifest.payload === "string" ? manifest.payload : ""

            if (!payload) {
                throw new Error("Old SeaUtils payload is empty")
            }

            return normalizeLineEndings(payload)
        }

        ctx.dom.onReady(async () => {
            const body = await ctx.dom.queryOne("body")
            if (!body) return

            try {
                const legacyPayload = await loadLegacyPayload()
                const carouselCSS = hydrateTemplate(
                    extractTemplate(legacyPayload, "const carouselCSS = `", "\n        `;")
                )
                const browserScript = hydrateTemplate(
                    extractTemplate(legacyPayload, "script.setText(`", "\n            `);")
                )

                const style = await ctx.dom.createElement("style")
                style.setText(carouselCSS)
                body.append(style)

                const script = await ctx.dom.createElement("script")
                script.setText(browserScript)
                body.append(script)
            } catch (error) {
                const script = await ctx.dom.createElement("script")
                script.setText(
                    "console.error(" +
                    JSON.stringify("SeaUtils Kolex06-Version failed to load old payload") +
                    ", " +
                    JSON.stringify(error instanceof Error ? error.message : String(error)) +
                    ");"
                )
                body.append(script)
            }
        })
    })
}
