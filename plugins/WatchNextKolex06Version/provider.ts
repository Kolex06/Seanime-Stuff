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
		const lastSyncedListStorageKey = "watch-next-kolex06.lastSyncedList";
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

		function normalizedQueueIds(value: any): number[] {
			if (!Array.isArray(value)) return [];
			const seen = new Set<number>();
			const ids: number[] = [];
			value.forEach((item) => {
				const id = Number(typeof item === "object" ? item?.id : item);
				if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
				seen.add(id);
				ids.push(id);
			});
			return ids;
		}

		function readLastSyncedList() {
			const value = $storage.get<any>(lastSyncedListStorageKey);
			return {
				exists: Array.isArray(value),
				ids: normalizedQueueIds(value),
			};
		}

		function saveLastSyncedList(list: WatchOrderAnime[]) {
			$storage.set(lastSyncedListStorageKey, normalizedQueueIds(list));
		}

		function sameQueueOrder(left: WatchOrderAnime[], right: WatchOrderAnime[]) {
			const leftIds = normalizedQueueIds(left);
			const rightIds = normalizedQueueIds(right);
			return leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
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

		function isWatchNextList(name: any) {
			return String(name || "").trim().toLowerCase() === aniListCustomListName.toLowerCase();
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
			aniListSyncStatus.set("Syncing Watch Next with AniList...");
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
								status
								isCustomList
								entries {
									id
									mediaId
									status
									priority
									customLists(asArray: true)
									media {
										id
										title { userPreferred romaji english }
										coverImage { large medium }
										season
										seasonYear
									}
								}
							}
						}
					}
				`, { userId });

				const entries: any[] = [];
				const customListsByMediaId = new Map<number, string[]>();
				const standardListNames = new Set(["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED", "REPEATING"]);
				(collectionData?.MediaListCollection?.lists || []).forEach((list: any) => {
					const listName = String(list?.name || "").trim();
					const isCustomList = list?.isCustomList === true || (!!listName && !standardListNames.has(listName.toUpperCase()));
					(list.entries || []).forEach((entry: any) => {
						entries.push(entry);
						const mediaId = Number(entry?.mediaId || entry?.media?.id || 0);
						if (!mediaId) return;
						const current = customListsByMediaId.get(mediaId) || [];
						const groupedList = isCustomList && listName ? [listName] : [];
						customListsByMediaId.set(mediaId, uniqueStringList([
							...current,
							...normalizeCustomLists(entry?.customLists),
							...groupedList,
						]));
					});
				});

				const byMediaId = new Map<number, any>();
				entries.forEach((entry) => {
					const mediaId = Number(entry?.mediaId || entry?.media?.id || 0);
					if (mediaId && !byMediaId.has(mediaId)) byMediaId.set(mediaId, entry);
				});

				function currentCustomListsForMedia(mediaId: number, entry: any) {
					return uniqueStringList([
						...normalizeCustomLists(entry?.customLists),
						...(customListsByMediaId.get(mediaId) || []),
					]);
				}

				const existingWatchNextIds = new Set<number>();
				customListsByMediaId.forEach((listNames, mediaId) => {
					if (listNames.some((name) => isWatchNextList(name))) {
						existingWatchNextIds.add(mediaId);
					}
				});

				const remoteQueue: WatchOrderAnime[] = [];
				Array.from(existingWatchNextIds.values()).forEach((mediaId) => {
					const entry = byMediaId.get(mediaId);
					const media = entry?.media || {};
					remoteQueue.push({
						id: mediaId,
						listEntryId: Number(entry?.id || 0),
						title: media?.title?.userPreferred || media?.title?.romaji || media?.title?.english || "Unknown Title",
						coverImage: media?.coverImage?.large || media?.coverImage?.medium || "",
						season: media?.season,
						seasonYear: media?.seasonYear ? Number(media.seasonYear) : undefined,
						status: entry?.status ? String(entry.status) : undefined,
					});
				});
				remoteQueue.sort((left, right) => {
					const leftPriority = Number(byMediaId.get(left.id)?.priority || 0);
					const rightPriority = Number(byMediaId.get(right.id)?.priority || 0);
					return rightPriority - leftPriority;
				});

				const localQueue = normalizeAnimeList(orderedList.get());
				const localIds = new Set(localQueue.map((anime) => anime.id));
				const remoteIds = new Set(remoteQueue.map((anime) => anime.id));
				const lastSynced = readLastSyncedList();
				const lastSyncedIds = new Set(lastSynced.ids);
				const nextIds = new Set<number>();

				if (!lastSynced.exists) {
					localIds.forEach((id) => nextIds.add(id));
					remoteIds.forEach((id) => nextIds.add(id));
				} else {
					const allIds = new Set<number>([...lastSynced.ids, ...Array.from(localIds), ...Array.from(remoteIds)]);
					allIds.forEach((id) => {
						const wasSynced = lastSyncedIds.has(id);
						const isLocal = localIds.has(id);
						const isRemote = remoteIds.has(id);
						const shouldKeep = wasSynced ? isLocal && isRemote : isLocal || isRemote;
						if (shouldKeep) nextIds.add(id);
					});
				}

				const reconciledQueue = localQueue.filter((anime) => nextIds.has(anime.id));
				const reconciledIds = new Set(reconciledQueue.map((anime) => anime.id));
				remoteQueue.forEach((anime) => {
					if (!nextIds.has(anime.id) || reconciledIds.has(anime.id)) return;
					reconciledQueue.push(anime);
					reconciledIds.add(anime.id);
				});

				const importedFromAniList = reconciledQueue.filter((anime) => !localIds.has(anime.id)).length;
				const removedFromSeanime = localQueue.filter((anime) => !reconciledIds.has(anime.id)).length;
				if (!sameQueueOrder(localQueue, reconciledQueue)) {
					orderedList.set(reconciledQueue);
					saveListToStorage(reconciledQueue);
					refreshAvailableAnime();
					sendSnapshot();
				}

				const queuedIds = new Set(reconciledQueue.map((anime) => Number(anime.id)));
				let added = 0;
				let removed = 0;
				let created = 0;
				let ordered = 0;

				for (const mediaId of Array.from(existingWatchNextIds.values())) {
					if (queuedIds.has(mediaId)) continue;

					const entry = byMediaId.get(mediaId);
					const currentLists = currentCustomListsForMedia(mediaId, entry);
					const nextLists = currentLists.filter((name) => !isWatchNextList(name));
					if (sameStringList(currentLists, nextLists)) continue;

					await saveAniListEntryCustomLists(mediaId, nextLists);
					customListsByMediaId.set(mediaId, nextLists);
					removed++;
				}

				const orderedQueue = reconciledQueue.filter((anime) => Number(anime.id) > 0);
				for (let index = orderedQueue.length - 1; index >= 0; index--) {
					const mediaId = Number(orderedQueue[index]?.id || 0);
					if (!mediaId) continue;
					const priority = orderedQueue.length - index;
					const progress = orderedQueue.length - index;

					const entry = byMediaId.get(mediaId);
					const currentLists = currentCustomListsForMedia(mediaId, entry);
					const hasWatchNext = existingWatchNextIds.has(mediaId) || currentLists.some((name) => isWatchNextList(name));
					const nextLists = uniqueStringList([...currentLists, aniListCustomListName]);

					aniListSyncStatus.set("Ordering AniList Watch Next " + progress + "/" + orderedQueue.length + "...");
					sendSnapshot();

					await saveAniListEntryCustomLists(mediaId, nextLists, entry ? undefined : "PLANNING", priority);
					customListsByMediaId.set(mediaId, nextLists);
					byMediaId.set(mediaId, { ...(entry || {}), mediaId, customLists: nextLists, priority });
					existingWatchNextIds.add(mediaId);

					if (!entry) {
						created++;
					} else if (!hasWatchNext) {
						added++;
					}
					ordered++;
				}

				saveLastSyncedList(orderedQueue);
				const message = madeListVisible || importedFromAniList || removedFromSeanime || added || created || removed || ordered
					? "Watch Next synced both ways. Imported " + importedFromAniList + " from AniList, removed " + removedFromSeanime + " from Seanime, created " + created + ", added " + added + ", removed " + removed + ", ordered " + ordered + " on AniList."
					: "AniList list '" + aniListCustomListName + "' is already up to date. Refresh AniList if it is already open.";
				aniListSyncStatus.set(message);
				ctx.toast.success(message);
			} catch (error: any) {
				const message = error?.message || "Failed to sync Watch Next with AniList.";
				aniListSyncStatus.set(message);
				ctx.toast.error(message);
			} finally {
				isSyncingAniList.set(false);
				sendSnapshot();
			}
		}

		$store.watch<$app.AL_AnimeCollection>("watch-next-kolex06.latestAnimeCollection", (newCollection) => {
			if (!newCollection?.MediaListCollection?.lists) return;

			const currentIds = new Set<number>();
			if (autoRemoveSetting) {
				newCollection.MediaListCollection.lists.forEach((list: any) => {
					if ($toString(list.status) !== "CURRENT") return;
					(list.entries || []).forEach((entry: any) => {
						if (entry?.media?.id) currentIds.add(Number(entry.media.id));
					});
				});

				if (currentIds.size) {
					const current = orderedList.get();
					const next = current.filter((anime) => !currentIds.has(anime.id));
					if (next.length !== current.length) {
						orderedList.set(next);
						saveListToStorage(next);
						refreshAvailableAnime();
						ctx.toast.info("Removed anime that moved to your CURRENT list.");
						sendSnapshot();
					}
				}
			}

			if (autoSyncAniListSetting) scheduleAniListAutoSync("AniList refresh");
		});

		webview.channel.on("hydrate", () => {
			loadDataFromStorage();
			refreshAvailableAnime();
			sendSnapshot();
			if (autoSyncAniListSetting) scheduleAniListAutoSync("opening Watch Next");
		});

		webview.channel.on("open-add-view", () => {
			void openAddView();
		});

		webview.channel.on("open-main-view", () => {
			currentView.set("main");
			sendSnapshot();
		});

		webview.channel.on("add-anime", (mediaId: number) => addAnime(Number(mediaId)));
		webview.channel.on("remove-anime", (mediaId: number) => removeAnime(Number(mediaId)));
		webview.channel.on("remove-all", () => clearList());
		webview.channel.on("reorder-list", (ids: number[]) => reorderList((ids || []).map(Number)));
		webview.channel.on("move-anime", (payload: { id: number; direction: number }) => {
			moveAnime(Number(payload?.id), Number(payload?.direction || 0));
		});
		webview.channel.on("toggle-auto-remove", (value: any) => {
			const enabled = readToggleEnabled(value, autoRemoveSetting);
			setAutoRemove(enabled);
			sendSnapshot({ autoRemoveEnabled: enabled });
		});
		webview.channel.on("toggle-auto-sync-anilist", (value: any) => {
			const enabled = readToggleEnabled(value, autoSyncAniListSetting);
			setAutoSyncAniList(enabled);
			if (enabled) {
				scheduleAniListAutoSync("auto-sync being enabled", true);
			} else {
				if (pendingAutoSyncCancel) {
					pendingAutoSyncCancel();
					pendingAutoSyncCancel = null;
				}
				aniListSyncStatus.set("AniList auto-sync is off. Use Sync AniList List when you want to update it.");
				sendSnapshot({
					autoSyncAniListEnabled: false,
					aniListSyncStatus: "AniList auto-sync is off. Use Sync AniList List when you want to update it.",
				});
				return;
			}
		});
		webview.channel.on("sync-anilist-list", () => {
			void syncQueueToAniList();
		});
		webview.channel.on("open-anime", (mediaId: number) => openAnime(Number(mediaId)));

		webview.setContent(() => `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					:root {
						color-scheme: dark;
						--page: transparent;
						--surface: rgba(9, 14, 24, 0.86);
						--surface-2: rgba(18, 26, 42, 0.82);
						--surface-3: rgba(28, 39, 61, 0.86);
						--text: #f8fafc;
						--muted: #cbd5e1;
						--subtle: #94a3b8;
						--border: rgba(226, 232, 240, 0.16);
						--border-strong: rgba(125, 211, 252, 0.42);
						--cyan: #38bdf8;
						--pink: #fb7185;
						--gold: #fbbf24;
						--green: #34d399;
						--danger: #f43f5e;
						--shadow: 0 18px 54px rgba(0, 0, 0, 0.28);
					}

					* { box-sizing: border-box; }

					html, body {
						min-height: 100%;
						margin: 0;
						background: var(--page);
						color: var(--text);
						font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
						font-size: 15px;
						line-height: 1.45;
					}

					button, input, select { font: inherit; }
					button { color: inherit; }

					.app-shell {
						width: min(1180px, calc(100vw - 28px));
						margin: 0 auto;
						padding: 18px 0 28px;
					}

					.header {
						display: grid;
						grid-template-columns: minmax(0, 1fr) auto;
						gap: 16px;
						align-items: end;
						margin-bottom: 16px;
					}

					.brand-row {
						display: flex;
						align-items: center;
						gap: 12px;
						min-width: 0;
					}

					.logo {
						display: grid;
						width: 52px;
						height: 52px;
						min-width: 52px;
						place-items: center;
						border: 1px solid rgba(251, 191, 36, 0.44);
						border-radius: 8px;
						background:
							radial-gradient(circle at 30% 20%, rgba(251, 191, 36, 0.32), transparent 42%),
							linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(251, 113, 133, 0.2)),
							#101826;
						box-shadow: 0 0 30px rgba(56, 189, 248, 0.16);
						font-weight: 950;
						letter-spacing: 0;
					}

					.kicker {
						margin: 0 0 2px;
						color: var(--gold);
						font-size: 0.74rem;
						font-weight: 900;
						text-transform: uppercase;
					}

					h1 {
						margin: 0;
						color: var(--text);
						font-size: clamp(1.72rem, 2.2vw, 2.5rem);
						line-height: 1.03;
						letter-spacing: 0;
					}

					.subtitle {
						margin: 7px 0 0;
						color: var(--muted);
						font-weight: 650;
					}

					.actions {
						display: flex;
						flex-wrap: wrap;
						gap: 8px;
						justify-content: flex-end;
					}

					.btn {
						display: inline-flex;
						min-height: 38px;
						align-items: center;
						justify-content: center;
						gap: 8px;
						border: 1px solid var(--border);
						border-radius: 8px;
						padding: 8px 12px;
						background: var(--surface-3);
						color: var(--text);
						font-weight: 850;
						cursor: pointer;
						transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, opacity 160ms ease;
					}

					.btn:hover {
						transform: translateY(-1px);
						border-color: var(--border-strong);
						background: rgba(37, 51, 78, 0.94);
					}

					.btn:disabled {
						cursor: not-allowed;
						opacity: 0.5;
						transform: none;
					}

					.btn-primary {
						border-color: rgba(56, 189, 248, 0.48);
						background: linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(236, 72, 153, 0.72));
					}

					.btn-danger {
						border-color: rgba(244, 63, 94, 0.42);
						background: rgba(88, 17, 35, 0.78);
					}

					.btn-plain {
						min-height: 32px;
						padding: 6px 9px;
						background: rgba(15, 23, 42, 0.72);
						font-size: 0.86rem;
					}

					.btn-icon {
						width: 34px;
						min-height: 34px;
						padding: 0;
					}

					.btn-icon .icon {
						display: block;
						width: 17px;
						height: 17px;
						pointer-events: none;
					}

					.summary {
						display: grid;
						grid-template-columns: repeat(3, minmax(0, 1fr));
						gap: 10px;
						margin-bottom: 16px;
					}

					.metric {
						min-width: 0;
						border: 1px solid var(--border);
						border-radius: 8px;
						padding: 12px;
						background: var(--surface-2);
						box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
					}

					.metric-label {
						color: var(--subtle);
						font-size: 0.76rem;
						font-weight: 900;
						text-transform: uppercase;
					}

					.metric-value {
						overflow: hidden;
						margin-top: 3px;
						color: var(--text);
						font-size: 1.2rem;
						font-weight: 950;
						text-overflow: ellipsis;
						white-space: nowrap;
					}

					.toolbar {
						display: grid;
						grid-template-columns: minmax(180px, 1.3fr) repeat(4, minmax(130px, 0.7fr));
						gap: 8px;
						margin: 12px 0 16px;
					}

					.field {
						display: flex;
						flex-direction: column;
						gap: 5px;
						min-width: 0;
					}

					.field label {
						color: var(--subtle);
						font-size: 0.72rem;
						font-weight: 900;
						text-transform: uppercase;
					}

					.field input,
					.field select {
						width: 100%;
						min-height: 40px;
						border: 1px solid var(--border);
						border-radius: 8px;
						padding: 8px 10px;
						background: rgba(15, 23, 42, 0.82);
						color: var(--text);
						outline: none;
					}

					.field input:focus,
					.field select:focus {
						border-color: var(--border-strong);
						box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
					}

					.queue {
						display: flex;
						flex-direction: column;
						gap: 10px;
					}

					.queue-row {
						display: grid;
						grid-template-columns: 30px 34px 74px minmax(0, 1fr) auto;
						gap: 12px;
						align-items: center;
						min-height: 106px;
						border: 1px solid var(--border);
						border-radius: 8px;
						padding: 10px;
						background: var(--surface);
						box-shadow: var(--shadow);
						transition: border-color 140ms ease, transform 140ms ease, background 140ms ease;
					}

					.queue-row.dragging {
						opacity: 0.48;
						transform: scale(0.992);
					}

					.queue-row.drag-over {
						border-color: var(--gold);
						background: rgba(37, 51, 78, 0.9);
					}

					.drag-handle {
						display: grid;
						width: 30px;
						height: 46px;
						place-items: center;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: rgba(15, 23, 42, 0.72);
						color: var(--muted);
						cursor: grab;
						font-weight: 950;
						letter-spacing: 0;
						touch-action: none;
						user-select: none;
					}

					.drag-handle:active {
						cursor: grabbing;
						border-color: var(--border-strong);
						color: var(--text);
					}

					.rank {
						display: grid;
						width: 34px;
						height: 34px;
						place-items: center;
						border: 1px solid rgba(251, 191, 36, 0.34);
						border-radius: 8px;
						background: rgba(251, 191, 36, 0.1);
						color: var(--gold);
						font-weight: 950;
					}

					.cover {
						width: 74px;
						height: 100px;
						overflow: hidden;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: rgba(30, 41, 59, 0.72);
					}

					.cover img {
						width: 100%;
						height: 100%;
						object-fit: cover;
						display: block;
					}

					.cover-fallback {
						display: grid;
						width: 100%;
						height: 100%;
						place-items: center;
						color: var(--subtle);
						font-weight: 900;
					}

					.row-main {
						min-width: 0;
					}

					.row-title {
						margin: 0;
						overflow-wrap: anywhere;
						font-size: 1.02rem;
						font-weight: 920;
					}

					.row-meta {
						display: flex;
						flex-wrap: wrap;
						gap: 6px;
						margin-top: 8px;
					}

					.badge {
						display: inline-flex;
						align-items: center;
						border: 1px solid var(--border);
						border-radius: 999px;
						padding: 3px 8px;
						background: rgba(15, 23, 42, 0.72);
						color: var(--muted);
						font-size: 0.76rem;
						font-weight: 850;
					}

					.drag-hint {
						margin-top: 8px;
						color: var(--subtle);
						font-size: 0.8rem;
						font-weight: 700;
					}

					.row-actions {
						display: grid;
						grid-template-columns: repeat(2, 34px);
						gap: 6px;
						justify-content: end;
					}

					.empty {
						display: grid;
						min-height: 260px;
						place-items: center;
						border: 1px dashed rgba(148, 163, 184, 0.36);
						border-radius: 8px;
						padding: 28px;
						background: rgba(15, 23, 42, 0.52);
						text-align: center;
					}

					.empty h2 {
						margin: 0 0 6px;
						font-size: 1.24rem;
					}

					.empty p {
						max-width: 480px;
						margin: 0 auto 16px;
						color: var(--muted);
					}

					.grid {
						display: grid;
						grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
						gap: 12px;
					}

					.anime-card {
						min-width: 0;
						border: 1px solid var(--border);
						border-radius: 8px;
						overflow: hidden;
						background: var(--surface);
						box-shadow: var(--shadow);
					}

					.poster {
						position: relative;
						aspect-ratio: 2 / 3;
						background: rgba(30, 41, 59, 0.72);
					}

					.poster img {
						width: 100%;
						height: 100%;
						object-fit: cover;
						display: block;
					}

					.card-body {
						display: flex;
						min-height: 118px;
						flex-direction: column;
						gap: 8px;
						padding: 10px;
					}

					.card-title {
						display: -webkit-box;
						overflow: hidden;
						min-height: 42px;
						-webkit-box-orient: vertical;
						-webkit-line-clamp: 2;
						font-weight: 900;
					}

					.card-meta {
						color: var(--subtle);
						font-size: 0.8rem;
						font-weight: 780;
					}

					.card-body .btn {
						width: 100%;
						margin-top: auto;
					}

					.notice {
						margin-bottom: 14px;
						border: 1px solid rgba(251, 191, 36, 0.38);
						border-radius: 8px;
						padding: 12px;
						background: rgba(251, 191, 36, 0.1);
						color: #fde68a;
						font-weight: 760;
					}

					.toggle {
						display: inline-flex;
						align-items: center;
						gap: 8px;
						min-height: 32px;
						border: 1px solid var(--border);
						border-radius: 8px;
						padding: 6px 9px;
						background: rgba(15, 23, 42, 0.72);
						color: var(--muted);
						font-weight: 800;
						cursor: pointer;
						user-select: none;
						transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
					}

					.toggle:hover {
						transform: translateY(-1px);
						border-color: var(--border-strong);
						background: rgba(37, 51, 78, 0.94);
					}

					.toggle.is-on {
						border-color: rgba(56, 189, 248, 0.46);
						color: var(--text);
					}

					.toggle-indicator {
						width: 10px;
						height: 10px;
						border-radius: 999px;
						background: rgba(148, 163, 184, 0.68);
					}

					.toggle.is-on .toggle-indicator {
						background: var(--cyan);
						box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14);
					}

					.toggle-state {
						color: var(--subtle);
						font-size: 0.75rem;
						font-weight: 900;
					}

					.hidden { display: none !important; }

					@media (max-width: 900px) {
						.header {
							grid-template-columns: 1fr;
							align-items: start;
						}

						.actions {
							justify-content: flex-start;
						}

						.summary {
							grid-template-columns: 1fr;
						}

						.toolbar {
							grid-template-columns: repeat(2, minmax(0, 1fr));
						}
					}

					@media (max-width: 640px) {
						.app-shell {
							width: min(100vw - 20px, 1180px);
							padding-top: 12px;
						}

						.brand-row {
							align-items: flex-start;
						}

						.logo {
							width: 44px;
							height: 44px;
							min-width: 44px;
						}

						h1 {
							font-size: 1.55rem;
						}

						.toolbar {
							grid-template-columns: 1fr;
						}

						.queue-row {
							grid-template-columns: 30px 32px 62px minmax(0, 1fr);
						}

						.cover {
							width: 62px;
							height: 88px;
						}

						.row-actions {
							grid-column: 1 / -1;
							display: flex;
							justify-content: flex-start;
							flex-wrap: wrap;
						}
					}
				</style>
			</head>
			<body>
				<div id="app" class="app-shell"></div>
				<script>
					(function() {
						var state = {
							orderedList: [],
							availableAnime: [],
							currentView: "main",
							isLoading: false,
							errorMessage: null,
							autoRemoveEnabled: false,
							autoSyncAniListEnabled: true,
							isSyncingAniList: false,
							aniListSyncStatus: ""
						};

						var filters = {
							search: "",
							status: "PLANNING",
							sort: "default",
							year: "all",
							season: "all"
						};

						var draggingId = null;
						var dragOverId = null;
						var pointerDrag = null;
						var root = document.getElementById("app");

						function send(name, value) {
							if (window.webview && typeof window.webview.send === "function") {
								window.webview.send(name, value);
							}
						}

						function escapeText(value) {
							return String(value == null ? "" : value);
						}

						function create(tag, className, text) {
							var node = document.createElement(tag);
							if (className) node.className = className;
							if (text !== undefined && text !== null) node.textContent = String(text);
							return node;
						}

						function button(label, className, onClick, title) {
							var node = create("button", "btn " + (className || ""), label);
							node.type = "button";
							if (title) node.title = title;
							node.onclick = onClick;
							return node;
						}

						function icon(name) {
							if (name === "open") {
								return '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>';
							}
							if (name === "trash") {
								return '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';
							}
							return "";
						}

						function iconButton(name, className, onClick, title) {
							var node = button("", className, onClick, title);
							node.innerHTML = icon(name);
							node.setAttribute("aria-label", title || name);
							return node;
						}

						function toggleButton(label, enabled, onClick) {
							var node = create("button", "toggle " + (enabled ? "is-on" : "is-off"));
							node.type = "button";
							node.setAttribute("aria-pressed", enabled ? "true" : "false");
							node.appendChild(create("span", "toggle-indicator"));
							node.appendChild(create("span", "toggle-label", label));
							node.appendChild(create("span", "toggle-state", enabled ? "On" : "Off"));
							node.onclick = onClick;
							return node;
						}

						function coverNode(anime) {
							var wrap = create("div", "cover");
							if (anime.coverImage) {
								var img = document.createElement("img");
								img.src = anime.coverImage;
								img.alt = anime.title || "Anime cover";
								img.loading = "lazy";
								img.draggable = false;
								wrap.appendChild(img);
							} else {
								wrap.appendChild(create("div", "cover-fallback", "NO COVER"));
							}
							return wrap;
						}

						function seasonText(anime) {
							var bits = [];
							if (anime.season) bits.push(titleCase(anime.season));
							if (anime.seasonYear) bits.push(String(anime.seasonYear));
							return bits.join(" ");
						}

						function titleCase(value) {
							return String(value || "").toLowerCase().replace(/(^|[_\\s-])([a-z])/g, function(_, sep, chr) {
								return (sep ? " " : "") + chr.toUpperCase();
							}).trim();
						}

						function reorderByIds(ids) {
							var byId = {};
							state.orderedList.forEach(function(anime) {
								byId[String(anime.id)] = anime;
							});

							var next = [];
							ids.forEach(function(id) {
								var anime = byId[String(id)];
								if (anime && !next.some(function(item) { return item.id === anime.id; })) {
									next.push(anime);
								}
							});
							state.orderedList.forEach(function(anime) {
								if (!next.some(function(item) { return item.id === anime.id; })) {
									next.push(anime);
								}
							});
							state.orderedList = next;
							send("reorder-list", next.map(function(anime) { return anime.id; }));
							render();
						}

						function dropAnime(fromId, toId, insertAfter) {
							fromId = Number(fromId);
							toId = Number(toId);
							if (!fromId || !toId || fromId === toId) return;

							var ids = state.orderedList.map(function(anime) { return anime.id; });
							var fromIndex = ids.indexOf(fromId);
							var toIndex = ids.indexOf(toId);
							if (fromIndex < 0 || toIndex < 0) return;

							ids.splice(fromIndex, 1);
							var insertIndex = ids.indexOf(toId);
							if (insertIndex < 0) insertIndex = ids.length;
							if (insertAfter) insertIndex += 1;
							ids.splice(insertIndex, 0, fromId);
							reorderByIds(ids);
						}

						function dropTargetFromPoint(clientX, clientY) {
							var target = document.elementFromPoint(clientX, clientY);
							var row = target && typeof target.closest === "function" ? target.closest(".queue-row") : null;
							if (!row || !row.dataset) return null;

							var id = Number(row.dataset.id);
							if (!id) return null;

							var rect = row.getBoundingClientRect();
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
								state.aniListSyncStatus = "Syncing Watch Next with AniList...";
								render();
								send("sync-anilist-list");
							}, "Sync queue membership with the AniList custom list named Watch Next"));

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
