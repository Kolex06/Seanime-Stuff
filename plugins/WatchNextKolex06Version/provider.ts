/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

type WatchOrderAnime = {
	id: number;
	listEntryId: number;
	title: string;
	coverImage: string;
	season?: $app.AL_MediaSeason;
	seasonYear?: number;
	status?: string;
};

type WatchNextSettings = {
	autoRemove: boolean;
	autoSyncAniList?: boolean;
};

function init() {
	$app.onGetAnimeCollection((e) => {
		if (e.animeCollection) {
			$store.set("watch-next-kolex06.latestAnimeCollection", $clone(e.animeCollection));
		}
		e.next();
	});

	$ui.register((ctx) => {
		const listStorageKey = "watch-next-kolex06.watchOrderList";
		const settingsStorageKey = "watch-next-kolex06.settings";
		const legacyListStorageKey = "watchOrderList";
		const legacySettingsStorageKey = "watchOrderSettings";

		const orderedList = ctx.state<WatchOrderAnime[]>([]);
		const availableAnime = ctx.state<WatchOrderAnime[]>([]);
		const entireAnimeCollection = ctx.state<$app.AL_AnimeCollection | null>(null);
		const currentView = ctx.state<"main" | "add">("main");
		const isLoading = ctx.state<boolean>(false);
		const errorMessage = ctx.state<string | null>(null);
		const autoRemoveEnabled = ctx.state<boolean>(false);
		const autoSyncAniListEnabled = ctx.state<boolean>(true);
		const isSyncingAniList = ctx.state<boolean>(false);
		const aniListSyncStatus = ctx.state<string>("");
		const aniListCustomListName = "Watch Next";
		const aniListRequestSpacingMs = 2200;
		let pendingAutoSyncCancel: (() => void) | null = null;
		let lastAniListRequestAt = 0;
		let autoRemoveSetting = false;
		let autoSyncAniListSetting = true;

		const sidebarIcon = '<span style="display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center;color:currentColor"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5h11"></path><path d="M5 5h.01"></path><path d="M8 12h11"></path><path d="M5 12h.01"></path><path d="M8 19h11"></path><path d="M5 19h.01"></path></svg></span>';

		const webview = ctx.newWebview({
			slot: "screen",
			fullWidth: true,
			autoHeight: true,
			sidebar: {
				label: "Watch Next",
				icon: sidebarIcon,
			},
		});

		webview.channel.sync("orderedList", orderedList);
		webview.channel.sync("availableAnime", availableAnime);
		webview.channel.sync("currentView", currentView);
		webview.channel.sync("isLoading", isLoading);
		webview.channel.sync("errorMessage", errorMessage);
		webview.channel.sync("isSyncingAniList", isSyncingAniList);
		webview.channel.sync("aniListSyncStatus", aniListSyncStatus);

		function loadDataFromStorage() {
			const savedList = $storage.get<WatchOrderAnime[]>(listStorageKey);
			const legacyList = !Array.isArray(savedList) ? $storage.get<WatchOrderAnime[]>(legacyListStorageKey) : null;
			const listToLoad = Array.isArray(savedList) ? savedList : legacyList;
			if (Array.isArray(listToLoad)) {
				const normalized = normalizeAnimeList(listToLoad);
				orderedList.set(normalized);
				if (!Array.isArray(savedList) && Array.isArray(legacyList)) {
					saveListToStorage(normalized);
				}
			}

			const savedSettings = $storage.get<WatchNextSettings>(settingsStorageKey);
			const legacySettings = !savedSettings ? $storage.get<WatchNextSettings>(legacySettingsStorageKey) : null;
			const settingsToLoad = savedSettings || legacySettings;
			const autoRemove = !!settingsToLoad?.autoRemove;
			const autoSync = settingsToLoad?.autoSyncAniList !== false;
			autoRemoveSetting = autoRemove;
			autoSyncAniListSetting = autoSync;
			autoRemoveEnabled.set(autoRemove);
			autoSyncAniListEnabled.set(autoSync);
			if (!savedSettings && legacySettings) {
				saveSettingsToStorage({ autoRemove, autoSyncAniList: autoSync });
			}
		}

		function normalizeAnimeList(list: WatchOrderAnime[]): WatchOrderAnime[] {
			const seen = new Set<number>();
			const normalized: WatchOrderAnime[] = [];

			list.forEach((anime) => {
				const id = Number(anime?.id);
				if (!Number.isFinite(id) || seen.has(id)) return;
				seen.add(id);
				normalized.push({
					id,
					listEntryId: Number(anime.listEntryId || 0),
					title: anime.title || "Unknown Title",
					coverImage: anime.coverImage || "",
					season: anime.season,
					seasonYear: anime.seasonYear ? Number(anime.seasonYear) : undefined,
					status: anime.status ? String(anime.status) : undefined,
				});
			});

			return normalized;
		}

		function saveListToStorage(list: WatchOrderAnime[]) {
			$storage.set(listStorageKey, list);
		}

		function saveSettingsToStorage(settings: WatchNextSettings) {
			$storage.set(settingsStorageKey, settings);
		}

		function readToggleEnabled(value: any, fallback: boolean) {
			if (typeof value === "boolean") return value;
			if (typeof value === "number") return value !== 0;
			if (typeof value === "string") {
				const normalized = value.trim().toLowerCase();
				if (normalized === "true" || normalized === "1" || normalized === "on") return true;
				if (normalized === "false" || normalized === "0" || normalized === "off") return false;
			}
			if (value && typeof value === "object") {
				if (typeof value.enabled === "boolean") return value.enabled;
				if (typeof value.value === "boolean") return value.value;
				if (typeof value.checked === "boolean") return value.checked;
			}
			return fallback;
		}

		function setAutoRemove(value: boolean) {
			const enabled = !!value;
			autoRemoveSetting = enabled;
			autoRemoveEnabled.set(enabled);
			saveSettingsToStorage({
				autoRemove: enabled,
				autoSyncAniList: autoSyncAniListSetting,
			});
		}

		function setAutoSyncAniList(value: boolean) {
			const enabled = !!value;
			autoSyncAniListSetting = enabled;
			autoSyncAniListEnabled.set(enabled);
			saveSettingsToStorage({
				autoRemove: autoRemoveSetting,
				autoSyncAniList: enabled,
			});
		}

		function buildAvailableAnime(collection: $app.AL_AnimeCollection | null): WatchOrderAnime[] {
			if (!collection?.MediaListCollection?.lists) return [];

			const orderedIds = new Set(orderedList.get().map((anime) => anime.id));
			const mapped: WatchOrderAnime[] = [];

			collection.MediaListCollection.lists.forEach((list: any) => {
				const status = $toString(list.status || "UNKNOWN");
				(list.entries || []).forEach((entry: any) => {
					const media = entry?.media;
					if (!media?.id || orderedIds.has(media.id)) return;

					mapped.push({
						id: Number(media.id),
						listEntryId: Number(entry.id || 0),
						title: media.title?.userPreferred || media.title?.romaji || media.title?.english || "Unknown Title",
						coverImage: media.coverImage?.large || media.coverImage?.medium || "",
						season: media.season,
						seasonYear: media.seasonYear ? Number(media.seasonYear) : undefined,
						status,
					});
				});
			});

			const unique = new Map<number, WatchOrderAnime>();
			mapped.forEach((anime) => {
				if (!unique.has(anime.id)) unique.set(anime.id, anime);
			});

			return Array.from(unique.values());
		}

		function refreshAvailableAnime() {
			availableAnime.set(buildAvailableAnime(entireAnimeCollection.get()));
		}

		function sendSnapshot(overrides?: { autoRemoveEnabled?: boolean; autoSyncAniListEnabled?: boolean; aniListSyncStatus?: string }) {
			const values = overrides || {};
			webview.channel.send("snapshot", {
				orderedList: orderedList.get(),
				availableAnime: availableAnime.get(),
				currentView: currentView.get(),
				isLoading: isLoading.get(),
				errorMessage: errorMessage.get(),
				autoRemoveEnabled: typeof values.autoRemoveEnabled === "boolean" ? values.autoRemoveEnabled : autoRemoveSetting,
				autoSyncAniListEnabled: typeof values.autoSyncAniListEnabled === "boolean" ? values.autoSyncAniListEnabled : autoSyncAniListSetting,
				isSyncingAniList: isSyncingAniList.get(),
				aniListSyncStatus: typeof values.aniListSyncStatus === "string" ? values.aniListSyncStatus : aniListSyncStatus.get(),
			});
		}

		function scheduleAniListAutoSync(reason: string, autoSyncOverride?: boolean) {
			const autoSyncEnabled = typeof autoSyncOverride === "boolean" ? autoSyncOverride : autoSyncAniListSetting;
			if (!autoSyncEnabled) return;
			if (pendingAutoSyncCancel) {
				pendingAutoSyncCancel();
				pendingAutoSyncCancel = null;
			}

			aniListSyncStatus.set("Auto-sync queued after " + reason + ".");
			pendingAutoSyncCancel = ctx.setTimeout(() => {
				pendingAutoSyncCancel = null;
				void syncQueueToAniList();
			}, 1400);
			sendSnapshot({ autoSyncAniListEnabled: autoSyncEnabled });
		}

		function waitForAniListOrderStep(ms: number) {
			return new Promise<void>((resolve) => {
				ctx.setTimeout(() => resolve(), ms);
			});
		}

		async function waitForAniListRateSlot() {
			if (!lastAniListRequestAt) return;
			const elapsed = Date.now() - lastAniListRequestAt;
			const remaining = aniListRequestSpacingMs - elapsed;
			if (remaining > 0) await waitForAniListOrderStep(remaining);
		}

		async function openAddView() {
			currentView.set("add");
			isLoading.set(true);
			errorMessage.set(null);
			sendSnapshot();

			try {
				const animeCollection = await $anilist.getRawAnimeCollection(true);
				entireAnimeCollection.set(animeCollection);
				refreshAvailableAnime();
			} catch (error: any) {
				errorMessage.set(error?.message || "Failed to load your AniList anime lists.");
				availableAnime.set([]);
				ctx.toast.error("Failed to load your AniList anime lists.");
			} finally {
				isLoading.set(false);
				sendSnapshot();
			}
		}

		function addAnime(mediaId: number) {
			const id = Number(mediaId);
			const anime = availableAnime.get().find((item) => item.id === id);
			if (!anime) return;

			const next = [...orderedList.get(), anime];
			orderedList.set(next);
			saveListToStorage(next);
			refreshAvailableAnime();
			ctx.toast.success("'" + anime.title + "' added to Watch Next.");
			sendSnapshot();
			scheduleAniListAutoSync("queue change");
		}

		function removeAnime(mediaId: number) {
			const id = Number(mediaId);
			const current = orderedList.get();
			const removed = current.find((anime) => anime.id === id);
			const next = current.filter((anime) => anime.id !== id);

			if (next.length === current.length) return;

			orderedList.set(next);
			saveListToStorage(next);
			refreshAvailableAnime();
			if (removed) ctx.toast.info("'" + removed.title + "' removed from Watch Next.");
			sendSnapshot();
			scheduleAniListAutoSync("queue change");
		}

		function clearList() {
			orderedList.set([]);
			saveListToStorage([]);
			refreshAvailableAnime();
			ctx.toast.success("Watch Next was cleared.");
			sendSnapshot();
			scheduleAniListAutoSync("queue clear");
		}

		function reorderList(ids: number[]) {
			if (!Array.isArray(ids)) return;

			const current = orderedList.get();
			const byId = new Map<number, WatchOrderAnime>();
			current.forEach((anime) => byId.set(anime.id, anime));

			const next: WatchOrderAnime[] = [];
			ids.forEach((rawId) => {
				const id = Number(rawId);
				const anime = byId.get(id);
				if (anime && !next.some((item) => item.id === id)) {
					next.push(anime);
				}
			});

			current.forEach((anime) => {
				if (!next.some((item) => item.id === anime.id)) {
					next.push(anime);
				}
			});

			orderedList.set(next);
			saveListToStorage(next);
			sendSnapshot();
			scheduleAniListAutoSync("queue order change");
		}

		function moveAnime(mediaId: number, direction: number) {
			const current = orderedList.get();
			const index = current.findIndex((anime) => anime.id === Number(mediaId));
			const nextIndex = index + direction;
			if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;

			const next = [...current];
			[next[index], next[nextIndex]] = [next[nextIndex], next[index]];
			orderedList.set(next);
			saveListToStorage(next);
			sendSnapshot();
			scheduleAniListAutoSync("queue order change");
		}

		function openAnime(mediaId: number) {
			const id = Number(mediaId);
			if (!Number.isFinite(id) || id <= 0) return;
			ctx.screen.navigateTo("/entry", { id: String(id) });
		}

		function getAniListToken(): string {
			let token: any = null;

			try {
				// @ts-ignore
				if (typeof $database !== "undefined" && $database?.anilist?.getToken) {
					// @ts-ignore
					token = $database.anilist.getToken();
				}
			} catch (_) {}

			try {
				// @ts-ignore
				if (!token && typeof $anilist !== "undefined" && $anilist?.getToken) {
					// @ts-ignore
					token = $anilist.getToken();
				}
			} catch (_) {}

			if (token && typeof token === "object") {
				token = token.accessToken || token.token || token.value || null;
			}

			if (!token) {
				throw new Error("AniList token missing. Sign in to AniList in Seanime settings, then refresh this plugin.");
			}

			return String(token);
		}

		function responseHeader(response: any, name: string): string | null {
			try {
				return response?.headers?.get ? response.headers.get(name) : null;
			} catch (_) {
				return null;
			}
		}

		function rateLimitDelayFromResponse(response: any) {
			const retryAfter = Number(responseHeader(response, "Retry-After"));
			if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.ceil(retryAfter * 1000) + 1000;

			const resetAt = Number(responseHeader(response, "X-RateLimit-Reset"));
			if (Number.isFinite(resetAt) && resetAt > 0) {
				return Math.max(Math.ceil(resetAt * 1000 - Date.now()) + 1000, 5000);
			}

			return 65000;
		}

		async function waitForAniListRetry(response: any) {
			const waitMs = rateLimitDelayFromResponse(response);
			const seconds = Math.max(1, Math.ceil(waitMs / 1000));
			aniListSyncStatus.set("AniList rate limit hit. Waiting " + seconds + "s, then retrying...");
			sendSnapshot();
			await waitForAniListOrderStep(waitMs);
		}

		async function aniListFetch(query: string, variables: Record<string, any> = {}) {
			const token = getAniListToken();

			for (let attempt = 0; attempt < 2; attempt++) {
				await waitForAniListRateSlot();
				lastAniListRequestAt = Date.now();

				const res = await ctx.fetch("https://graphql.anilist.co", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer " + token,
					},
					body: JSON.stringify({ query, variables }),
				});

				if (!res.ok) {
					let detail = "";
					try {
						detail = await res.text();
					} catch (_) {}

					if (res.status === 429 && attempt === 0) {
						await waitForAniListRetry(res);
						continue;
					}

					throw new Error("AniList returned HTTP " + res.status + (detail ? ": " + detail.slice(0, 160) : ""));
				}

				const json = await res.json();
				if (json.errors && json.errors.length) {
					const firstError = json.errors[0] || {};
					if (Number(firstError.status) === 429 && attempt === 0) {
						await waitForAniListRetry(res);
						continue;
					}

					throw new Error(firstError.message || "AniList returned an error.");
				}

				return json.data;
			}

			throw new Error("AniList is still rate limiting requests. Wait a minute, then sync again.");
		}

		function normalizeCustomLists(value: any): string[] {
			if (Array.isArray(value)) {
				return value.filter(Boolean).map((item) => String(item));
			}

			if (value && typeof value === "object") {
				return Object.keys(value).filter((key) => !!value[key]);
			}

			return [];
		}

		function sameStringList(a: string[], b: string[]) {
			if (a.length !== b.length) return false;
			const set = new Set(a);
			return b.every((item) => set.has(item));
		}

		function uniqueStringList(value: string[]) {
			const seen = new Set<string>();
			const result: string[] = [];
			value.forEach((item) => {
				const text = String(item || "").trim();
				if (!text || seen.has(text)) return;
				seen.add(text);
				result.push(text);
			});
			return result;
		}

		async function ensureAniListCustomListVisible(viewer: any) {
			const animeOptions = viewer?.mediaListOptions?.animeList || {};
			const currentCustomLists = normalizeCustomLists(animeOptions.customLists);
			const currentSectionOrder = normalizeCustomLists(animeOptions.sectionOrder);
			const nextCustomLists = uniqueStringList([...currentCustomLists, aniListCustomListName]);
			const nextSectionOrder = uniqueStringList([...currentSectionOrder, aniListCustomListName]);

			if (sameStringList(currentCustomLists, nextCustomLists) && sameStringList(currentSectionOrder, nextSectionOrder)) {
				return false;
			}

			const animeListOptions: Record<string, any> = {
				customLists: nextCustomLists,
				sectionOrder: nextSectionOrder,
			};

			try {
				await aniListFetch(`
					mutation WatchNextKolex06UpdateUserList($animeListOptions: MediaListOptionsInput) {
						UpdateUser(animeListOptions: $animeListOptions) {
							id
							mediaListOptions {
								animeList {
									customLists
									sectionOrder
								}
							}
						}
					}
				`, { animeListOptions });
			} catch (firstError) {
				await aniListFetch(`
					mutation WatchNextKolex06UpdateUserList($animeListOptions: MediaListOptionsInput) {
						UpdateUser(mediaListOptions: { animeList: $animeListOptions }) {
							id
							mediaListOptions {
								animeList {
									customLists
									sectionOrder
								}
							}
						}
					}
				`, { animeListOptions });
			}

			return true;
		}

		async function saveAniListEntryCustomLists(mediaId: number, customLists: string[], status?: string, priority?: number) {
			const variables: Record<string, any> = {
				mediaId,
				customLists,
			};
			if (status) variables.status = status;
			if (typeof priority === "number") variables.priority = priority;

			await aniListFetch(`
				mutation WatchNextKolex06SaveList($mediaId: Int, $customLists: [String], $status: MediaListStatus, $priority: Int) {
					SaveMediaListEntry(mediaId: $mediaId, customLists: $customLists, status: $status, priority: $priority) {
						id
						mediaId
						customLists
						priority
					}
				}
			`, variables);
		}

		async function syncQueueToAniList() {
			if (pendingAutoSyncCancel) {
				pendingAutoSyncCancel();
				pendingAutoSyncCancel = null;
			}
			if (isSyncingAniList.get()) return;

			isSyncingAniList.set(true);
			aniListSyncStatus.set("Syncing Watch Next to AniList...");
			sendSnapshot();

			try {
				const viewerData = await aniListFetch(`
					query WatchNextKolex06Viewer {
						Viewer {
							id
							name
							mediaListOptions {
								animeList {
									customLists
									sectionOrder
									splitCompletedSectionByFormat
									advancedScoring
									advancedScoringEnabled
								}
							}
						}
					}
				`);
				const viewer = viewerData?.Viewer;
				const userId = Number(viewer?.id || 0);
				if (!userId) throw new Error("Could not read the signed-in AniList user.");
				const madeListVisible = await ensureAniListCustomListVisible(viewer);

				const collectionData = await aniListFetch(`
					query WatchNextKolex06Collection($userId: Int) {
						MediaListCollection(userId: $userId, type: ANIME) {
							lists {
								name
								isCustomList
								entries {
									id
									mediaId
									priority
									customLists(asArray: true)
									media {
										id
										title { userPreferred romaji english }
									}
								}
							}
						}
					}
				`, …6359 tokens truncated…ect = row.getBoundingClientRect();
							return {
								id: id,
								after: clientY > rect.top + rect.height / 2
							};
						}

						function cleanupPointerDrag() {
							document.removeEventListener("pointermove", handlePointerDragMove, true);
							document.removeEventListener("pointerup", handlePointerDragEnd, true);
							document.removeEventListener("pointercancel", handlePointerDragCancel, true);
							pointerDrag = null;
							draggingId = null;
							dragOverId = null;
						}

						function startPointerDrag(event, anime) {
							if (event.button !== undefined && event.button !== 0) return;
							event.preventDefault();
							event.stopPropagation();
							pointerDrag = {
								id: Number(anime.id),
								target: null
							};
							draggingId = Number(anime.id);
							dragOverId = Number(anime.id);
							document.addEventListener("pointermove", handlePointerDragMove, true);
							document.addEventListener("pointerup", handlePointerDragEnd, true);
							document.addEventListener("pointercancel", handlePointerDragCancel, true);
							render();
						}

						function handlePointerDragMove(event) {
							if (!pointerDrag) return;
							event.preventDefault();
							var target = dropTargetFromPoint(event.clientX, event.clientY);
							pointerDrag.target = target;
							var nextOverId = target ? target.id : null;
							if (dragOverId !== nextOverId) {
								dragOverId = nextOverId;
								render();
							}
						}

						function handlePointerDragEnd(event) {
							if (!pointerDrag) return;
							event.preventDefault();
							event.stopPropagation();
							var fromId = pointerDrag.id;
							var target = pointerDrag.target || dropTargetFromPoint(event.clientX, event.clientY);
							cleanupPointerDrag();
							if (target && target.id) {
								dropAnime(fromId, target.id, !!target.after);
							} else {
								render();
							}
						}

						function handlePointerDragCancel() {
							if (!pointerDrag) return;
							cleanupPointerDrag();
							render();
						}

						function moveAnime(id, direction) {
							var ids = state.orderedList.map(function(anime) { return anime.id; });
							var index = ids.indexOf(Number(id));
							var nextIndex = index + direction;
							if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
							var tmp = ids[index];
							ids[index] = ids[nextIndex];
							ids[nextIndex] = tmp;
							reorderByIds(ids);
						}

						function filteredAvailable() {
							var search = filters.search.trim().toLowerCase();
							var list = state.availableAnime.slice();

							if (filters.status !== "ALL") {
								list = list.filter(function(anime) { return String(anime.status || "") === filters.status; });
							}
							if (search) {
								list = list.filter(function(anime) { return String(anime.title || "").toLowerCase().indexOf(search) !== -1; });
							}
							if (filters.year !== "all") {
								list = list.filter(function(anime) { return String(anime.seasonYear || "") === filters.year; });
							}
							if (filters.season !== "all") {
								list = list.filter(function(anime) { return String(anime.season || "") === filters.season; });
							}
							if (filters.sort === "added_desc") {
								list.sort(function(a, b) { return Number(b.listEntryId || 0) - Number(a.listEntryId || 0); });
							} else if (filters.sort === "added_asc") {
								list.sort(function(a, b) { return Number(a.listEntryId || 0) - Number(b.listEntryId || 0); });
							} else {
								list.sort(function(a, b) { return String(a.title || "").localeCompare(String(b.title || "")); });
							}

							return list;
						}

						function yearOptions() {
							var years = {};
							state.availableAnime.forEach(function(anime) {
								if (anime.seasonYear) years[String(anime.seasonYear)] = true;
							});
							return Object.keys(years).sort(function(a, b) { return Number(b) - Number(a); });
						}

						function renderHeader(title, subtitle) {
							var header = create("div", "header");
							var brand = create("div", "brand-row");
							brand.appendChild(create("div", "logo", "WN"));
							var text = create("div", "");
							text.appendChild(create("p", "kicker", "Kolex06-Version"));
							text.appendChild(create("h1", "", title));
							text.appendChild(create("p", "subtitle", subtitle));
							brand.appendChild(text);

							var actions = create("div", "actions");
							actions.appendChild(button(state.isSyncingAniList ? "Syncing AniList" : "Sync AniList List", "btn-plain", function() {
								if (state.isSyncingAniList) return;
								state.isSyncingAniList = true;
								state.aniListSyncStatus = "Syncing Watch Next to AniList...";
								render();
								send("sync-anilist-list");
							}, "Sync queue membership to an AniList custom list named Watch Next"));

							if (state.currentView === "main") {
								actions.appendChild(button("Add Anime", "btn-primary", function() {
									filters.search = "";
									filters.status = "PLANNING";
									filters.sort = "default";
									filters.year = "all";
									filters.season = "all";
									send("open-add-view");
								}));
								if (state.orderedList.length) {
									actions.appendChild(button("Remove All", "btn-danger", function() {
										if (window.confirm("Clear your full Watch Next order?")) send("remove-all");
									}));
								}
							} else {
								actions.appendChild(button("Back to Queue", "btn-primary", function() {
									state.currentView = "main";
									state.isLoading = false;
									render();
									send("open-main-view");
								}));
							}

							actions.appendChild(toggleButton("Auto-remove CURRENT", !!state.autoRemoveEnabled, function() {
								state.autoRemoveEnabled = !state.autoRemoveEnabled;
								send("toggle-auto-remove", { enabled: state.autoRemoveEnabled });
								render();
							}));

							actions.appendChild(toggleButton("Auto-sync AniList", !!state.autoSyncAniListEnabled, function() {
								state.autoSyncAniListEnabled = !state.autoSyncAniListEnabled;
								send("toggle-auto-sync-anilist", { enabled: state.autoSyncAniListEnabled });
								render();
							}));

							header.appendChild(brand);
							header.appendChild(actions);
							return header;
						}

						function renderSummary() {
							var first = state.orderedList[0];
							var last = state.orderedList[state.orderedList.length - 1];
							var summary = create("div", "summary");
							[
								["Queued", String(state.orderedList.length)],
								["Next up", first ? first.title : "Nothing yet"],
								["Last slot", last ? last.title : "Empty"]
							].forEach(function(item) {
								var metric = create("div", "metric");
								metric.appendChild(create("div", "metric-label", item[0]));
								metric.appendChild(create("div", "metric-value", item[1]));
								summary.appendChild(metric);
							});
							return summary;
						}

						function renderQueueRow(anime, index) {
							var row = create("div", "queue-row" + (draggingId === anime.id ? " dragging" : "") + (dragOverId === anime.id ? " drag-over" : ""));
							row.draggable = true;
							row.dataset.id = String(anime.id);

							row.addEventListener("dragstart", function(event) {
								draggingId = anime.id;
								if (event.dataTransfer) {
									event.dataTransfer.effectAllowed = "move";
									event.dataTransfer.setData("text/plain", String(anime.id));
								}
								window.setTimeout(render, 0);
							});

							row.addEventListener("dragover", function(event) {
								event.preventDefault();
								if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
								if (dragOverId !== anime.id) {
									dragOverId = anime.id;
									render();
								}
							});

							row.addEventListener("dragleave", function() {
								if (dragOverId === anime.id) {
									dragOverId = null;
									render();
								}
							});

							row.addEventListener("drop", function(event) {
								event.preventDefault();
								var target = dropTargetFromPoint(event.clientX, event.clientY);
								var fromId = draggingId || (event.dataTransfer ? event.dataTransfer.getData("text/plain") : null);
								draggingId = null;
								dragOverId = null;
								dropAnime(fromId, anime.id, !!(target && target.after));
							});

							row.addEventListener("dragend", function() {
								draggingId = null;
								dragOverId = null;
								render();
							});

							var handle = create("div", "drag-handle", "||");
							handle.title = "Drag to reorder";
							handle.setAttribute("role", "button");
							handle.setAttribute("aria-label", "Drag " + (anime.title || "anime") + " to reorder");
							handle.tabIndex = 0;
							handle.addEventListener("pointerdown", function(event) {
								startPointerDrag(event, anime);
							});
							row.appendChild(handle);
							row.appendChild(create("div", "rank", String(index + 1)));
							row.appendChild(coverNode(anime));

							var main = create("div", "row-main");
							main.appendChild(create("h3", "row-title", escapeText(anime.title)));
							var meta = create("div", "row-meta");
							var season = seasonText(anime);
							if (season) meta.appendChild(create("span", "badge", season));
							if (anime.status) meta.appendChild(create("span", "badge", titleCase(anime.status)));
							meta.appendChild(create("span", "badge", "Drag handle"));
							main.appendChild(meta);
							main.appendChild(create("div", "drag-hint", "Grab the handle and drop above or below another anime."));
							row.appendChild(main);

							var actions = create("div", "row-actions");
							actions.appendChild(button("^", "btn-plain btn-icon", function(event) {
								event.stopPropagation();
								moveAnime(anime.id, -1);
							}, "Move up"));
							actions.appendChild(iconButton("open", "btn-plain btn-icon", function(event) {
								event.stopPropagation();
								send("open-anime", anime.id);
							}, "Open anime in Seanime"));
							actions.appendChild(button("v", "btn-plain btn-icon", function(event) {
								event.stopPropagation();
								moveAnime(anime.id, 1);
							}, "Move down"));
							actions.appendChild(iconButton("trash", "btn-danger btn-plain btn-icon", function(event) {
								event.stopPropagation();
								send("remove-anime", anime.id);
							}, "Remove from queue"));
							row.appendChild(actions);

							return row;
						}

						function renderMain() {
							root.innerHTML = "";
							root.appendChild(renderHeader("Watch Next", "Drag your anime into the exact order you want to watch."));
							if (state.errorMessage) root.appendChild(create("div", "notice", state.errorMessage));
							if (state.aniListSyncStatus) root.appendChild(create("div", "notice", state.aniListSyncStatus));
							root.appendChild(renderSummary());

							if (!state.orderedList.length) {
								var empty = create("div", "empty");
								var box = create("div", "");
								box.appendChild(create("h2", "", "Your queue is empty"));
								box.appendChild(create("p", "", "Add anime from your AniList lists, then drag the rows up or down to shape the order."));
								box.appendChild(button("Add Anime", "btn-primary", function() {
									send("open-add-view");
								}));
								empty.appendChild(box);
								root.appendChild(empty);
								return;
							}

							var queue = create("div", "queue");
							state.orderedList.forEach(function(anime, index) {
								queue.appendChild(renderQueueRow(anime, index));
							});
							root.appendChild(queue);
						}

						function selectField(labelText, value, options, onChange) {
							var field = create("div", "field");
							var label = create("label", "", labelText);
							var select = document.createElement("select");
							options.forEach(function(option) {
								var node = document.createElement("option");
								node.value = option.value;
								node.textContent = option.label;
								select.appendChild(node);
							});
							select.value = value;
							select.onchange = function() {
								onChange(select.value);
							};
							field.appendChild(label);
							field.appendChild(select);
							return field;
						}

						function renderToolbar(onFiltersChanged) {
							var toolbar = create("div", "toolbar");
							var searchField = create("div", "field");
							searchField.appendChild(create("label", "", "Search"));
							var input = document.createElement("input");
							input.type = "search";
							input.placeholder = "Find anime";
							input.value = filters.search;
							input.oninput = function() {
								filters.search = input.value;
								if (typeof onFiltersChanged === "function") onFiltersChanged();
							};
							searchField.appendChild(input);
							toolbar.appendChild(searchField);

							toolbar.appendChild(selectField("List", filters.status, [
								{ label: "Planning", value: "PLANNING" },
								{ label: "Current", value: "CURRENT" },
								{ label: "Completed", value: "COMPLETED" },
								{ label: "Paused", value: "PAUSED" },
								{ label: "Dropped", value: "DROPPED" },
								{ label: "All Lists", value: "ALL" }
							], function(value) { filters.status = value; if (typeof onFiltersChanged === "function") onFiltersChanged(); }));

							toolbar.appendChild(selectField("Sort", filters.sort, [
								{ label: "Title", value: "default" },
								{ label: "Time Added Newest", value: "added_desc" },
								{ label: "Time Added Oldest", value: "added_asc" }
							], function(value) { filters.sort = value; if (typeof onFiltersChanged === "function") onFiltersChanged(); }));

							var years = [{ label: "All Years", value: "all" }].concat(yearOptions().map(function(year) {
								return { label: year, value: year };
							}));
							toolbar.appendChild(selectField("Year", filters.year, years, function(value) { filters.year = value; if (typeof onFiltersChanged === "function") onFiltersChanged(); }));

							toolbar.appendChild(selectField("Season", filters.season, [
								{ label: "All Seasons", value: "all" },
								{ label: "Winter", value: "WINTER" },
								{ label: "Spring", value: "SPRING" },
								{ label: "Summer", value: "SUMMER" },
								{ label: "Fall", value: "FALL" }
							], function(value) { filters.season = value; if (typeof onFiltersChanged === "function") onFiltersChanged(); }));

							return toolbar;
						}

						function renderAddCard(anime) {
							var card = create("article", "anime-card");
							var poster = create("div", "poster");
							if (anime.coverImage) {
								var img = document.createElement("img");
								img.src = anime.coverImage;
								img.alt = anime.title || "Anime cover";
								img.loading = "lazy";
								img.draggable = false;
								poster.appendChild(img);
							} else {
								poster.appendChild(create("div", "cover-fallback", "NO COVER"));
							}
							card.appendChild(poster);

							var body = create("div", "card-body");
							body.appendChild(create("div", "card-title", anime.title || "Unknown Title"));
							body.appendChild(create("div", "card-meta", [titleCase(anime.status), seasonText(anime)].filter(Boolean).join(" / ")));
							body.appendChild(button("Add to Queue", "btn-primary", function() {
								send("add-anime", anime.id);
							}));
							card.appendChild(body);
							return card;
						}

						function renderAddResults(container) {
							if (!container) return;
							container.innerHTML = "";
							var list = filteredAvailable();

							if (!list.length) {
								var empty = create("div", "empty");
								var box = create("div", "");
								box.appendChild(create("h2", "", "No anime found"));
								box.appendChild(create("p", "", state.availableAnime.length ? "Adjust the filters or search text." : "This list is empty, or everything here is already queued."));
								empty.appendChild(box);
								container.appendChild(empty);
								return;
							}

							var grid = create("div", "grid");
							list.forEach(function(anime) {
								grid.appendChild(renderAddCard(anime));
							});
							container.appendChild(grid);
						}

						function renderAdd() {
							root.innerHTML = "";
							root.appendChild(renderHeader("Add Anime", "Pull from AniList, filter fast, then send picks into your queue."));

							if (state.errorMessage) root.appendChild(create("div", "notice", state.errorMessage));
							if (state.aniListSyncStatus) root.appendChild(create("div", "notice", state.aniListSyncStatus));
							if (state.isLoading) {
								var loading = create("div", "empty");
								loading.appendChild(create("h2", "", "Loading your AniList lists"));
								root.appendChild(loading);
								return;
							}

							var results = create("div", "add-results");
							root.appendChild(renderToolbar(function() {
								renderAddResults(results);
							}));
							root.appendChild(results);
							renderAddResults(results);
						}

						function applySnapshot(value) {
							if (!value || typeof value !== "object") return;
							if (Array.isArray(value.orderedList)) state.orderedList = value.orderedList;
							if (Array.isArray(value.availableAnime)) state.availableAnime = value.availableAnime;
							if (value.currentView) state.currentView = value.currentView;
							if ("isLoading" in value) state.isLoading = !!value.isLoading;
							if ("errorMessage" in value) state.errorMessage = value.errorMessage || null;
							if ("autoRemoveEnabled" in value) state.autoRemoveEnabled = !!value.autoRemoveEnabled;
							if ("autoSyncAniListEnabled" in value) state.autoSyncAniListEnabled = !!value.autoSyncAniListEnabled;
							if ("isSyncingAniList" in value) state.isSyncingAniList = !!value.isSyncingAniList;
							if ("aniListSyncStatus" in value) state.aniListSyncStatus = value.aniListSyncStatus || "";
							render();
						}

						function bindWebview() {
							if (!window.webview || typeof window.webview.on !== "function") {
								state.errorMessage = "Seanime webview bridge is not available yet.";
								render();
								return;
							}

							window.webview.on("snapshot", applySnapshot);
							window.webview.on("orderedList", function(value) {
								state.orderedList = Array.isArray(value) ? value : [];
								render();
							});
							window.webview.on("availableAnime", function(value) {
								state.availableAnime = Array.isArray(value) ? value : [];
								render();
							});
							window.webview.on("currentView", function(value) {
								state.currentView = value || "main";
								render();
							});
							window.webview.on("isLoading", function(value) {
								state.isLoading = !!value;
								render();
							});
							window.webview.on("errorMessage", function(value) {
								state.errorMessage = value || null;
								render();
							});
							window.webview.on("isSyncingAniList", function(value) {
								state.isSyncingAniList = !!value;
								render();
							});
							window.webview.on("aniListSyncStatus", function(value) {
								state.aniListSyncStatus = value || "";
								render();
							});

							send("hydrate");
						}

						function render() {
							if (state.currentView === "add") {
								renderAdd();
							} else {
								renderMain();
							}
						}

						render();
						bindWebview();
					})();
				</script>
			</body>
			</html>
		`);

		loadDataFromStorage();
	});
}

