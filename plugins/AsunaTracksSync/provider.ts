type MediaType = "anime" | "manga";
type SyncAction = "update" | "progress" | "repeat" | "delete";

type FuzzyDate = {
	day?: number;
	month?: number;
	year?: number;
};

type AniListEntry = {
	id: number;
	media?: ($app.AL_BaseAnime | $app.AL_BaseManga) & { idMal?: number };
	notes?: string;
	private?: boolean;
	progress?: number;
	progressVolumes?: number;
	repeat?: number;
	score?: number;
	startedAt?: FuzzyDate;
	completedAt?: FuzzyDate;
	status?: $app.AL_MediaListStatus;
};

type AsunaTracksPayload = {
	media_type: MediaType;
	mal_id: number;
	status?: string;
	progress?: number;
	progress_volumes?: number;
	repeat_count?: number;
	score?: number;
	score_10?: number;
	notes?: string;
	start_date?: string;
	finish_date?: string;
};

// @ts-ignore
function init() {

	$ui.register((ctx) => {
		const iconUrl = "https://asunatracks.space/static/asunatracks-logo.png";
		const theme = {
			bg: "#050b1a",
			panel: "#081225",
			card: "#101826",
			cardSoft: "#17203a",
			border: "#ff69b433",
			borderStrong: "#ff69b480",
			text: "#f7f8ff",
			muted: "#9ba8c7",
			pink: "#ff3f8d",
			purple: "#a855f7",
			gold: "#fbbf24",
			green: "#86efac",
			red: "#fb7185",
		};
		const tray = ctx.newTray({
			iconUrl,
			withContent: true,
			width: "30rem",
		});

		const fields = {
			baseUrl: ctx.fieldRef<string>($storage.get("asunatracks-sync:base-url") ?? "https://asunatracks.space"),
			username: ctx.fieldRef<string>(""),
			password: ctx.fieldRef<string>(""),
			disableLiveSync: ctx.fieldRef<boolean>($storage.get("asunatracks-sync:disable-live-sync")?.valueOf() ?? false),
			skipAdult: ctx.fieldRef<boolean>($storage.get("asunatracks-sync:skip-adult")?.valueOf() ?? true),
			suppressBadge: ctx.fieldRef<boolean>($storage.get("asunatracks-sync:suppress-badge")?.valueOf() ?? false),
		};

		const state = {
			token: ctx.state<string | null>($storage.get("asunatracks-sync:token") ?? null),
			user: ctx.state<any | null>($storage.get("asunatracks-sync:user") ?? null),
			busy: ctx.state<boolean>(false),
			status: ctx.state<string>("Ready"),
			lastError: ctx.state<string | null>(null),
			success: ctx.state<number>($storage.get("asunatracks-sync:success-count") ?? 0),
			fail: ctx.state<number>($storage.get("asunatracks-sync:fail-count") ?? 0),
		};

		const log = {
			id: "asunatracks-sync:logs",
			open: ctx.state<boolean>(false),
			push(level: "Info" | "Success" | "Warning" | "Error", message: string) {
				const entries = ($storage.get<[string, string][]>(this.id) ?? []).slice(-199);
				entries.push([`${new Date().toISOString().slice(0, 19)} | ${level.padEnd(7, " ")} | ${message}`, level]);
				$storage.set(this.id, entries);
			},
			entries() {
				return this.open.get() ? ($storage.get<[string, string][]>(this.id) ?? []) : [];
			},
			clear() {
				$storage.set(this.id, []);
				this.push("Info", "Log cleared");
			},
		};
		type SyncNotification = {
			id: string;
			title: string;
			image?: string;
			unread: boolean;
			timestamp: number;
			details: Record<string, string | number | boolean | undefined>;
		};

		const notifications = {
			id: "asunatracks-sync:notifications",
			open: ctx.state<boolean>(false),
			unreads: ctx.state<number>(($storage.get<SyncNotification[]>("asunatracks-sync:notifications") ?? []).filter((entry) => entry.unread).length),
			entries() {
				return this.open.get() ? ($storage.get<SyncNotification[]>(this.id) ?? []) : [];
			},
			push(entry: Omit<SyncNotification, "id" | "timestamp" | "unread">) {
				const entries = ($storage.get<SyncNotification[]>(this.id) ?? []).slice(-49);
				entries.push({ ...entry, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now(), unread: true });
				$storage.set(this.id, entries);
				this.unreads.set(entries.filter((item) => item.unread).length);
			},
			markAllRead() {
				const entries = ($storage.get<SyncNotification[]>(this.id) ?? []).map((entry) => ({ ...entry, unread: false }));
				$storage.set(this.id, entries);
				this.unreads.set(0);
			},
			markRead(id: string) {
				const entries = ($storage.get<SyncNotification[]>(this.id) ?? []).map((entry) => (entry.id === id ? { ...entry, unread: false } : entry));
				$storage.set(this.id, entries);
				this.unreads.set(entries.filter((entry) => entry.unread).length);
			},
			delete(id: string) {
				const entries = ($storage.get<SyncNotification[]>(this.id) ?? []).filter((entry) => entry.id !== id);
				$storage.set(this.id, entries);
				this.unreads.set(entries.filter((entry) => entry.unread).length);
			},
			deleteAll() {
				$storage.set(this.id, []);
				this.unreads.set(0);
			},
		};
		type MissingMalEntry = {
			id: string;
			title: string;
			type: MediaType;
			mediaId?: number;
			image?: string;
			reason: string;
			timestamp: number;
		};

		const missingMal = {
			id: "asunatracks-sync:missing-mal",
			entries() {
				return notifications.open.get() ? ($storage.get<MissingMalEntry[]>(this.id) ?? []) : [];
			},
			push(entry: Omit<MissingMalEntry, "id" | "timestamp">) {
				const key = `${entry.type}:${entry.mediaId ?? entry.title}`;
				const entries = ($storage.get<MissingMalEntry[]>(this.id) ?? []).filter((item) => `${item.type}:${item.mediaId ?? item.title}` !== key).slice(-49);
				entries.push({ ...entry, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now() });
				$storage.set(this.id, entries);
			},
			delete(id: string) {
				$storage.set(this.id, ($storage.get<MissingMalEntry[]>(this.id) ?? []).filter((entry) => entry.id !== id));
			},
			clear() {
				$storage.set(this.id, []);
			},
		};

		function cleanBaseUrl() {
			let value = String(fields.baseUrl.current || "https://asunatracks.space").trim();
			if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
			return value.replace(/\/+$/, "");
		}

		function setToken(token: string | null, user: any | null = null) {
			$storage.set("asunatracks-sync:token", token);
			$storage.set("asunatracks-sync:user", user);
			state.token.set(token);
			state.user.set(user);
		}
		function absoluteAsunaUrl(value?: string | null) {
			if (!value) return "";
			if (/^https?:\/\//i.test(value)) return value;
			return `${cleanBaseUrl()}${String(value).startsWith("/") ? value : `/${value}`}`;
		}

		function updateCounters(ok: boolean) {
			const key = ok ? "success" : "fail";
			const next = state[key].get() + 1;
			state[key].set(next);
			$storage.set(`asunatracks-sync:${ok ? "success" : "fail"}-count`, next);
		}

		async function api(path: string, init: RequestInit = {}) {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"X-Asunatracks-Client": "seanime-extension",
				...((init.headers as Record<string, string>) ?? {}),
			};
			const token = state.token.get();
			if (token) headers.Authorization = `Bearer ${token}`;

			const res = await ctx.fetch(`${cleanBaseUrl()}${path}`, {
				...init,
				headers,
			} as FetchOptions);

			updateCounters(res.ok);
			if (!res.ok) {
				let message = res.statusText;
				try {
					const body = await res.json();
					message = body?.error || body?.message || message;
				} catch {}
				if (res.status === 401) setToken(null, null);
				throw new Error(message || `Request failed (${res.status})`);
			}
			return res;
		}

		async function login() {
			state.busy.set(true);
			state.lastError.set(null);
			state.status.set("Signing in...");
			try {
				$storage.set("asunatracks-sync:base-url", cleanBaseUrl());
				const res = await api("/public/api/auth/login", {
					method: "POST",
					body: JSON.stringify({
						username: fields.username.current,
						password: fields.password.current,
					}),
				});
				const data = await res.json();
				setToken(data.token, data.user ?? null);
				fields.password.setValue("");
				state.status.set(`Signed in as ${data.user?.username ?? "AsunaTracks"}`);
				log.push("Success", "Signed in to AsunaTracks");
				ctx.toast.success("Signed in to AsunaTracks");
			} catch (err) {
				fields.password.setValue("");
				const message = (err as Error).message;
				state.lastError.set(message);
				state.status.set("Sign in failed");
				log.push("Error", `Sign in failed: ${message}`);
			} finally {
				state.busy.set(false);
			}
		}

		async function logout() {
			state.busy.set(true);
			state.status.set("Signing out...");
			try {
				if (state.token.get()) {
					await api("/public/api/auth/logout", { method: "POST" }).catch(() => undefined);
				}
				setToken(null, null);
				state.status.set("Signed out");
				log.push("Info", "Signed out");
				ctx.toast.info("Signed out of AsunaTracks Sync");
			} finally {
				state.busy.set(false);
			}
		}

		function unwrap<T>(value: T | null | undefined): T | undefined {
			if (value == null) return undefined;
			if (typeof value === "object") {
				const v = (value as any).valueOf?.();
				return v == null ? undefined : v;
			}
			return value;
		}

		function isCustomSource(mediaId?: number) {
			return (mediaId ?? 0) >= 2 ** 31;
		}

		function toISODate(date?: FuzzyDate): string | undefined {
			const year = unwrap(date?.year);
			if (!year) return undefined;
			const month = unwrap(date?.month) ?? 1;
			const day = unwrap(date?.day) ?? 1;
			return new Date(Date.UTC(year, month - 1, day)).toISOString().substring(0, 10);
		}

		function normalizeStatus(type: MediaType, status?: $app.AL_MediaListStatus) {
			if (!status) return undefined;
			const anime: Record<$app.AL_MediaListStatus, string> = {
				CURRENT: "watching",
				PLANNING: "planning",
				COMPLETED: "completed",
				DROPPED: "dropped",
				PAUSED: "paused",
				REPEATING: "rewatching",
			};
			const manga: Record<$app.AL_MediaListStatus, string> = {
				CURRENT: "reading",
				PLANNING: "planning",
				COMPLETED: "completed",
				DROPPED: "dropped",
				PAUSED: "paused",
				REPEATING: "rereading",
			};
			return type === "anime" ? anime[status] : manga[status];
		}

		function normalizeScore10(score?: number) {
			if (typeof score !== "number" || Number.isNaN(score) || score <= 0) return undefined;
			return score > 10 ? Math.round(score) / 10 : score;
		}

		function mangaVolumeProgress(value: unknown) {
			if (typeof value !== "number" || Number.isNaN(value) || value < 0) return undefined;
			return Math.floor(value);
		}

		function canSendScore(status?: string) {
			return ["completed", "rewatched", "reread", "rewatching", "rereading"].includes(String(status ?? "").toLowerCase());
		}

		function removeScore(body: AsunaTracksPayload) {
			delete body.score;
			delete body.score_10;
			return body;
		}

		function anilistEntries(type: MediaType): AniListEntry[] {
			const collection =
				type === "anime"
					? $anilist.getAnimeCollection(false).MediaListCollection
					: $anilist.getMangaCollection(false).MediaListCollection;
			return (collection?.lists ?? [])
				.flatMap((list) => list.entries ?? [])
				.filter((entry): entry is AniListEntry => !!entry && !isCustomSource(entry.media?.id));
		}

		async function mediaForEvent(mediaId?: number): Promise<{ type: MediaType; entry: AniListEntry; media: AniListEntry["media"] } | null> {
			if (!mediaId) return null;

			try {
				const anime = await ctx.anime.getAnimeEntry(mediaId);
				const entry = anilistEntries("anime").find((item) => item.media?.id === mediaId || item.id === anime.listData?.id);
				if (entry?.media) return { type: "anime", entry, media: entry.media };
			} catch {}

			const mangaEntry = anilistEntries("manga").find((item) => item.media?.id === mediaId);
			if (mangaEntry?.media) return { type: "manga", entry: mangaEntry, media: mangaEntry.media };
			return null;
		}

		function payloadFromEntry(type: MediaType, entry: AniListEntry, overrides: Partial<AsunaTracksPayload> = {}): AsunaTracksPayload | null {
			const malId = unwrap(entry.media?.idMal);
			if (!malId) return null;
			const body: AsunaTracksPayload = {
				media_type: type,
				mal_id: malId,
				status: normalizeStatus(type, entry.status),
				progress: unwrap(entry.progress) ?? 0,
				progress_volumes: type === "manga" ? mangaVolumeProgress(unwrap(entry.progressVolumes)) : undefined,
				repeat_count: unwrap(entry.repeat) ?? 0,
				score: unwrap(entry.score),
				score_10: normalizeScore10(unwrap(entry.score)),
				notes: unwrap(entry.notes),
				start_date: toISODate(entry.startedAt),
				finish_date: toISODate(entry.completedAt),
				...overrides,
			};
			return canSendScore(body.status) ? body : removeScore(body);
		}
		function readableKey(value: string) {
			return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
		}

		function formatTimestamp(t: number) {
			const d = new Date(t);
			return `${d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
		}

		function notifySync(title: string, entry: AniListEntry, details: Record<string, string | number | boolean | undefined>) {
			notifications.push({
				title,
				image: entry.media?.coverImage?.large ?? entry.media?.coverImage?.medium,
				details,
			});
		}

		async function pushEntry(type: MediaType, entry: AniListEntry, reason: string, overrides: Partial<AsunaTracksPayload> = {}) {
			if (!state.token.get()) {
				log.push("Warning", `${reason}: skipped because AsunaTracks is not signed in`);
				return;
			}
			if (fields.skipAdult.current.valueOf() && entry.media?.isAdult?.valueOf()) {
				log.push("Warning", `${reason}: skipped adult entry ${entry.media?.title?.userPreferred ?? entry.media?.id}`);
				return;
			}
			if (unwrap(entry.private)) {
				log.push("Warning", `${reason}: skipped private entry ${entry.media?.title?.userPreferred ?? entry.media?.id}`);
				return;
			}
			const body = payloadFromEntry(type, entry, overrides);
			if (!body) {
				const title = entry.media?.title?.userPreferred ?? `AniList #${entry.media?.id ?? entry.id}`;
				missingMal.push({
					title,
					type,
					mediaId: entry.media?.id,
					image: entry.media?.coverImage?.large ?? entry.media?.coverImage?.medium,
					reason,
				});
				log.push("Warning", `${reason}: skipped ${title} because it has no MAL ID`);
				return;
			}

			try {
				await api("/public/api/me/list", {
					method: "POST",
					body: JSON.stringify(body),
				});
			} catch (err) {
				const message = (err as Error).message;
				if (!/finish this title before giving it a score/i.test(message)) throw err;
				log.push("Warning", `${reason}: score rejected before completion, retrying progress sync without score`);
				removeScore(body);
				await api("/public/api/me/list", {
					method: "POST",
					body: JSON.stringify(body),
				});
			}
			log.push("Success", `${reason}: synced ${entry.media?.title?.userPreferred ?? body.mal_id}`);
			notifySync(`Updated ${entry.media?.title?.userPreferred ?? body.mal_id}`, entry, {
				Action: reason,
				Type: type,
				Status: body.status,
				Progress: body.progress,
				Volumes: body.progress_volumes,
				Score: body.score_10 ?? body.score,
				Repeat: body.repeat_count,
			});
		}

		async function removeEntry(type: MediaType, entry: AniListEntry, reason: string) {
			const malId = unwrap(entry.media?.idMal);
			if (!state.token.get() || !malId) return;
			await api("/public/api/me/list/remove", {
				method: "POST",
				body: JSON.stringify({ media_type: type, mal_id: malId }),
			});
			log.push("Success", `${reason}: removed ${entry.media?.title?.userPreferred ?? malId}`);
			notifySync(`Removed ${entry.media?.title?.userPreferred ?? malId}`, entry, { Action: reason, Type: type, Status: "Deleted" });
		}

		async function liveSync<TData extends { mediaId?: number; status?: $app.AL_MediaListStatus; progress?: number; progressVolumes?: number; repeat?: number; scoreRaw?: number; startedAt?: FuzzyDate; completedAt?: FuzzyDate }>(
			action: SyncAction,
			event: { mediaId?: number },
			preDataKey: string,
			buildOverrides: (data: TData, type: MediaType) => Partial<AsunaTracksPayload>,
		) {
			if (fields.disableLiveSync.current.valueOf()) {
				log.push("Info", `${action}: live sync is disabled`);
				$store.set(preDataKey, null);
				return;
			}

			const data = $store.get(preDataKey) as TData | null;
			$store.set(preDataKey, null);
			if (!data || data.mediaId !== event.mediaId) {
				log.push("Warning", `${action}: missing pre-update payload`);
				return;
			}

			const target = await mediaForEvent(event.mediaId);
			if (!target) {
				log.push("Warning", `${action}: media not found (${event.mediaId ?? "unknown"})`);
				return;
			}

			try {
				await pushEntry(target.type, target.entry, action, buildOverrides(data, target.type));
				state.status.set(`Last sync: ${target.media?.title?.userPreferred ?? target.media?.id}`);
			} catch (err) {
				const message = (err as Error).message;
				state.lastError.set(message);
				log.push("Error", `${action}: ${message}`);
			}
		}

		async function liveDelete(event: { mediaId?: number }) {
			if (fields.disableLiveSync.current.valueOf()) return;
			const target = await mediaForEvent(event.mediaId);
			if (!target) {
				log.push("Warning", `delete: media not found (${event.mediaId ?? "unknown"})`);
				return;
			}
			try {
				await removeEntry(target.type, target.entry, "delete");
				state.status.set(`Removed: ${target.media?.title?.userPreferred ?? target.media?.id}`);
			} catch (err) {
				const message = (err as Error).message;
				state.lastError.set(message);
				log.push("Error", `delete: ${message}`);
			}
		}

		async function manualSync(type: MediaType) {
			state.busy.set(true);
			state.lastError.set(null);
			const entries = anilistEntries(type).filter((entry) => !unwrap(entry.private));
			let synced = 0;
			let skipped = 0;
			state.status.set(`Syncing ${type}...`);
			log.push("Info", `Manual ${type} sync started with ${entries.length} AniList entries`);

			for (const entry of entries) {
				if (!state.busy.get()) break;
				try {
					if (!entry.media?.idMal) {
						skipped++;
						continue;
					}
					await pushEntry(type, entry, "manual");
					synced++;
					await new Promise((resolve) => ctx.setTimeout(resolve, 500));
				} catch (err) {
					skipped++;
					log.push("Error", `manual: ${(err as Error).message}`);
					await new Promise((resolve) => ctx.setTimeout(resolve, 1000));
				}
			}

			state.status.set(`Manual ${type} sync finished: ${synced} synced, ${skipped} skipped`);
			ctx.toast.success(`AsunaTracks ${type} sync finished`);
			state.busy.set(false);
		}

		function textInput(label: string, fieldRef: $ui.FieldRef<string>, placeholder: string, password = false) {
			return tray.input({
				label,
				placeholder,
				fieldRef,
				type: password ? "password" : "text",
				disabled: state.busy.get(),
				className: "border focus-visible:ring-1",
				style: { backgroundColor: theme.panel, borderColor: "#2c3a5c", color: theme.text, "--ring": theme.pink },
			} as any);
		}

		function passwordInput() {
			return tray.div([
				tray.css(`
					.asunatracks-password input,
					.asunatracks-password textarea {
						-webkit-text-security: disc !important;
						text-security: disc !important;
					}
				`),
				tray.text("Password", { className: "text-sm font-semibold mb-1", style: { color: theme.text } }),
				tray.input({
					label: "",
					placeholder: "Password",
					fieldRef: fields.password,
					type: "password",
					disabled: state.busy.get(),
					className: "asunatracks-password",
				}),
			]);
		}

		function logsModal(trigger: any) {
			return tray.modal({
				trigger,
				title: "AsunaTracks Sync Logs",
				className: "max-w-4xl",
				onOpenChange: ctx.eventHandler("asunatracks-sync:logs-open", ({ open }) => log.open.set(open)),
				items: [
					tray.flex([
						tray.button("Clear", {
							intent: "gray-subtle",
							size: "md",
							className: "w-fit border font-bold",
							style: { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
							onClick: ctx.eventHandler("asunatracks-sync:logs-clear", () => log.clear()),
						}),
					]),
					tray.div(
						log.entries().length
							? log.entries().map(([message, level], idx) =>
									tray.text(message, {
										className: "font-mono text-sm whitespace-pre-wrap break-all px-2 py-1",
										style: {
											color: level === "Error" ? theme.red : level === "Success" ? theme.green : level === "Warning" ? theme.gold : theme.muted,
											backgroundColor: idx % 2 === 0 ? theme.panel : theme.card,
										},
									}),
								)
							: [tray.text("No logs yet.", { className: "text-center p-5", style: { color: theme.muted } })],
						{ className: "max-h-[34rem] overflow-y-auto border rounded-lg", style: { backgroundColor: theme.panel, borderColor: theme.border } },
					),
				],
			});
		}
		function notificationsModal(trigger: any) {
			return tray.modal({
				trigger,
				title: "AsunaTracks Sync Notifications",
				className: "max-w-5xl",
				onOpenChange: ctx.eventHandler("asunatracks-sync:notifications-open", ({ open }) => notifications.open.set(open)),
				items: [
					tray.flex([
						tray.button("Mark all as Read", {
							intent: "gray-subtle",
							size: "md",
							className: "w-fit border font-bold",
							style: { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
							disabled: notifications.unreads.get() <= 0,
							onClick: ctx.eventHandler("asunatracks-sync:notifications-read", () => notifications.markAllRead()),
						}),
						tray.button("Delete all", {
							intent: "alert-subtle",
							size: "md",
							className: "w-fit",
							disabled: notifications.entries().length <= 0,
							onClick: ctx.eventHandler("asunatracks-sync:notifications-delete", () => notifications.deleteAll()),
						}),
						tray.button("Clear missing MAL IDs", {
							intent: "gray-subtle",
							size: "md",
							className: "w-fit border font-bold",
							style: { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
							disabled: missingMal.entries().length <= 0,
							onClick: ctx.eventHandler("asunatracks-sync:missing-mal-clear", () => missingMal.clear()),
						}),
					]),
					tray.flex(
						[
							tray.div(
								notifications.entries().length
									? notifications.entries().slice().reverse().map((entry) =>
											{
												const eventId = entry.id.replace(/[^a-zA-Z0-9_-]/g, "-");
												return tray.div(
													[
													entry.unread ? tray.div([], { className: "absolute w-3 h-3 rounded-full border", style: { right: "-0.25rem", top: "-0.25rem", background: theme.pink, borderColor: theme.text } }) : [],
													tray.flex([
														entry.image
															? tray.img({ src: entry.image, width: "52px", className: "rounded-md shrink-0" })
															: tray.div([], { className: "w-[52px] h-[70px] rounded-md shrink-0", style: { backgroundColor: theme.cardSoft } }),
														tray.div(
															[
																tray.text(entry.title, { className: "font-extrabold text-base line-clamp-1", style: { color: theme.text } }),
																tray.div(
																	Object.entries(entry.details)
																		.filter(([, value]) => value !== undefined && value !== "")
																		.map(([key, value]) =>
																			tray.p([
																				tray.span(`${readableKey(key)}: `, { className: "text-xs", style: { color: theme.muted } }),
																				tray.span(String(value), { className: "font-bold text-xs", style: { color: theme.text } }),
																			]),
																		),
																	{ className: "grid grid-cols-2 gap-x-4" },
																),
																tray.text(formatTimestamp(entry.timestamp), { className: "text-xs mt-1", style: { color: theme.muted } }),
															],
															{ className: "flex-1" },
														),
														tray.stack(
															[
																tray.button("Delete", {
																	intent: "alert-subtle",
																	size: "sm",
																	className: "w-fit text-xs px-2 py-1",
																	onClick: ctx.eventHandler(`asunatracks-sync:notification-delete:${eventId}`, () => notifications.delete(entry.id)),
																}),
																entry.unread
																	? tray.button("Read", {
																			intent: "success-subtle",
																			size: "sm",
																			className: "w-fit text-xs px-2 py-1",
																			onClick: ctx.eventHandler(`asunatracks-sync:notification-read:${eventId}`, () => notifications.markRead(entry.id)),
																		})
																	: [],
															],
															{ className: "items-end shrink-0", gap: 1 },
														),
													], { className: "items-start gap-3" }),
												],
												{ className: "relative p-3 rounded-md border mb-2", style: { background: theme.card, borderColor: entry.unread ? theme.borderStrong : theme.border } },
												);
											},
										)
									: [tray.text("No Notifications", { className: "text-center p-5 border rounded-md", style: { color: theme.muted, backgroundColor: theme.card, borderColor: theme.border } })],
								{ className: "max-h-[30rem] overflow-y-auto mt-2 pr-1 flex-1" },
							),
							tray.div(
								[
									tray.text("Missing MAL IDs", { className: "font-extrabold text-base mb-2", style: { color: theme.text } }),
									missingMal.entries().length
										? missingMal.entries().slice().reverse().map((entry) => {
												const eventId = entry.id.replace(/[^a-zA-Z0-9_-]/g, "-");
												return tray.div(
													[
														tray.flex([
															entry.image
																? tray.img({ src: entry.image, width: "42px", className: "rounded-md shrink-0" })
																: tray.div([], { className: "w-[42px] h-[56px] rounded-md shrink-0", style: { backgroundColor: theme.cardSoft } }),
															tray.div(
																[
																	tray.text(entry.title, { className: "font-bold text-sm line-clamp-2", style: { color: theme.text } }),
																	tray.text(`${entry.type.toUpperCase()} - ${entry.reason}`, { className: "text-xs", style: { color: theme.muted } }),
																	tray.text(formatTimestamp(entry.timestamp), { className: "text-[10px] mt-1", style: { color: theme.muted } }),
																],
																{ className: "flex-1" },
															),
															tray.button("Delete", {
																intent: "alert-subtle",
																size: "sm",
																className: "w-fit text-xs px-2 py-1",
																onClick: ctx.eventHandler(`asunatracks-sync:missing-mal-delete:${eventId}`, () => missingMal.delete(entry.id)),
															}),
														], { className: "items-start gap-2" }),
													],
													{ className: "p-2 rounded-md border mb-2", style: { backgroundColor: theme.panel, borderColor: theme.border } },
												);
											})
										: tray.text("No missing MAL IDs", { className: "text-center p-4 border rounded-md text-sm", style: { color: theme.muted, borderColor: theme.border } }),
								],
								{ className: "w-[17rem] max-h-[30rem] overflow-y-auto mt-2 p-2 rounded-md border", style: { backgroundColor: theme.card, borderColor: theme.border } },
							),
						],
						{ className: "gap-3 items-start" },
					),
				],
			});
		}

		function svgIcon(name: "code" | "refresh" | "play" | "book" | "settings" | "power" | "bell") {
			const svgs: Record<typeof name, string> = {
				code: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#d6dcff" viewBox="0 0 16 16"><path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0m6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0"/></svg>`,
				refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#d6dcff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-15.74-6.26L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.74 6.26L21 16"/><path d="M16 16h5v5"/></svg>`,
				play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#d6dcff" viewBox="0 0 16 16"><path d="M6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814z"/><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z"/></svg>`,
				book: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#d6dcff" viewBox="0 0 16 16"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492z"/></svg>`,
				settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#f4b86a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2"/><circle cx="12" cy="12" r="3"/></svg>`,
				power: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#f0a1a1" viewBox="0 0 16 16"><path d="M7.5 1v7h1V1z"/><path d="M3 8.812a5 5 0 0 1 2.578-4.375l-.485-.874A6 6 0 1 0 11 3.616l-.501.865A5 5 0 1 1 3 8.812"/></svg>`,
				bell: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#f4b86a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
			};
			const html = svgs[name]
				.replace(/#d6dcff/g, theme.text)
				.replace(/#f4b86a/g, theme.gold)
				.replace(/#f0a1a1/g, theme.red);
			return `data:image/svg+xml;base64,${Buffer.from(html.trim(), "utf-8").toString("base64")}`;
		}

		function iconButton(icon: "code" | "refresh" | "play" | "book" | "settings" | "power" | "bell" | "profile", tooltip: string, onClick?: string, disabled = false) {
			const props: any = {
				intent: "gray-subtle",
				size: "md",
				disabled,
				className: "h-10 rounded-md border p-0 text-xs font-bold bg-center bg-no-repeat",
				style: {
					width: "64px",
					backgroundColor: theme.card,
					borderColor: theme.border,
					backgroundImage: icon === "profile" ? "" : `url(${svgIcon(icon as any)})`,
					backgroundSize: "1.05rem",
				},
			};
			if (onClick) props.onClick = onClick;
			const button = tray.button(" ", props);
			return tray.tooltip(button, { text: tooltip });
		}

		function settingsModal(trigger: any, signedIn: boolean) {
			return tray.modal({
				trigger,
				title: "AsunaTracks Sync Settings",
				className: "max-w-lg",
				items: [
					textInput("AsunaTracks URL", fields.baseUrl, "https://asunatracks.space"),
					signedIn
						? tray.button("Sign out", {
								intent: "alert-subtle",
								size: "md",
								className: "border font-bold",
								style: { backgroundColor: "#2d0c18", borderColor: "#fb718566", color: "#ffe4ef" },
								loading: state.busy.get(),
								onClick: ctx.eventHandler("asunatracks-sync:logout", logout),
							})
						: [
								textInput("Username", fields.username, "username or email"),
								passwordInput(),
								tray.button("Sign in", {
									intent: "primary",
									size: "md",
									className: "border font-bold",
									style: { background: `linear-gradient(135deg, ${theme.pink}, ${theme.purple})`, borderColor: theme.borderStrong, color: theme.text },
									loading: state.busy.get(),
									onClick: ctx.eventHandler("asunatracks-sync:login", login),
								}),
							],
				],
			});
		}

		const ui = {
			render() {
				const signedIn = !!state.token.get();
				const user = state.user.get();
				const username = user?.username ?? user?.display_name ?? "Username";
				const total = state.success.get() + state.fail.get();
				const successRate = total ? ((state.success.get() / total) * 100).toFixed(2) : "0.00";
				const lastState = state.lastError.get() ? `Failed (${state.lastError.get()})` : state.status.get();
				const error = state.lastError.get()
					? tray.text(state.lastError.get() ?? "", {
							className: "break-normal text-xs border rounded-md px-2 py-1 line-clamp-2",
							style: { background: "#2d0c18", color: "#ffe4ef", borderColor: "#fb718566" },
						})
					: [];

				const notificationTrigger = notificationsModal(tray.button(" ", {
					intent: "gray-subtle",
					size: "md",
					onClick: ctx.eventHandler("asunatracks-sync:notifications-trigger", () => undefined),
					className: "h-9 rounded-full border p-0 bg-center bg-no-repeat",
					style: { width: "42px", backgroundColor: theme.card, borderColor: theme.border, backgroundImage: `url(${svgIcon("bell")})`, backgroundSize: "1rem" },
				}));
				const logs = logsModal(tray.button(" ", { intent: "gray-subtle", size: "md", onClick: ctx.eventHandler("asunatracks-sync:logs-trigger", () => undefined), className: "h-10 rounded-md border p-0 bg-center bg-no-repeat", style: { width: "64px", backgroundColor: theme.card, borderColor: theme.border, backgroundImage: `url(${svgIcon("code")})`, backgroundSize: "1.05rem" } }));
				const profileHref = signedIn && username ? `${cleanBaseUrl()}/u/${encodeURIComponent(username)}` : `${cleanBaseUrl()}/login`;
				const avatarUrl = absoluteAsunaUrl(user?.avatar_url);
				const profileTrigger = tray.button(avatarUrl ? " " : "PFP", {
					intent: "gray-subtle",
					size: "md",
					onClick: ctx.eventHandler("asunatracks-sync:profile-trigger", () => undefined),
					className: "h-9 rounded-full border bg-center bg-cover bg-no-repeat p-0 text-xs font-bold",
					style: { width: "36px", backgroundColor: avatarUrl ? undefined : theme.card, borderColor: theme.borderStrong, color: theme.text, backgroundImage: avatarUrl ? `url(${avatarUrl})` : "" },
				});
				const profileButton = signedIn
					? tray.dropdownMenu({
							trigger: profileTrigger,
							items: [
								tray.dropdownMenuItem([
									tray.a({
										items: [tray.span("Open in browser")],
										href: profileHref,
										className: "no-underline",
									}),
								]),
								tray.dropdownMenuItem([tray.span("Sign out")], {
									className: "text-[--red]",
									onClick: ctx.eventHandler("asunatracks-sync:profile-signout", logout),
								}),
							],
						})
					: settingsModal(profileTrigger, false);

				return tray.div(
					[
						tray.flex(
							[
								tray.div([], {
									className: "w-14 h-14 rounded-full bg-center bg-cover bg-no-repeat shrink-0 border",
									style: { backgroundImage: `url(${iconUrl})`, borderColor: theme.borderStrong, boxShadow: "0 0 22px rgba(255,63,141,0.28)" },
								}),
								tray.div(
									[
										tray.text("AsunaTracks", { className: "font-extrabold text-2xl leading-none", style: { color: theme.text } }),
										tray.text("for Seanime", { className: "text-xs font-semibold mt-1", style: { color: theme.gold } }),
									],
									{ className: "flex-1" },
								),
								tray.flex([notificationTrigger, profileButton], { className: "items-start gap-1" }),
							],
							{ className: "items-center gap-3" },
						),
						tray.div(
							[
								tray.text(signedIn ? "Signed in as" : "Ready to sync", { className: "font-bold text-xs uppercase tracking-wide", style: { color: theme.gold } }),
								tray.text(signedIn ? username : "Sign in to AsunaTracks", { className: "font-extrabold text-2xl leading-none line-clamp-1", style: { color: theme.text } }),
								tray.text(signedIn ? "Live sync listens for Seanime/AniList updates." : "Connect your account to start syncing.", {
									className: "text-xs mt-2",
									style: { color: theme.muted },
								}),
							],
							{
								className: "rounded-md border px-3 py-3 mt-3 mb-3",
								style: {
									background: "radial-gradient(circle at 15% 0%, rgba(255,63,141,0.24), transparent 42%), linear-gradient(135deg, rgba(168,85,247,0.18), rgba(255,63,141,0.12)), #101826",
									borderColor: theme.border,
									boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
								},
							},
						),
						error,
						tray.flex(
							[ 
								logs,
								iconButton("refresh", "Check account", ctx.eventHandler("asunatracks-sync:me", async () => {
									state.busy.set(true);
									try {
										const res = await api("/public/api/me");
										const data = await res.json();
										setToken(state.token.get(), data.user ?? null);
										state.status.set("Success (200)");
										state.lastError.set(null);
										ctx.toast.success("AsunaTracks account check passed");
									} catch (err) {
										state.lastError.set((err as Error).message);
									} finally {
										state.busy.set(false);
									}
								}), !signedIn),
								iconButton("play", "Sync Anime", ctx.eventHandler("asunatracks-sync:manual-anime", () => manualSync("anime")), !signedIn),
								iconButton("book", "Sync Manga", ctx.eventHandler("asunatracks-sync:manual-manga", () => manualSync("manga")), !signedIn),
							],
							{ className: "grid grid-cols-4 gap-2 mb-3 justify-items-center" },
						),
						tray.div(
							[
								tray.switch("Temporarily disable livesync", {
									fieldRef: fields.disableLiveSync,
									disabled: !signedIn,
									style: { "--color-brand-500": "255 63 141" },
									onChange: ctx.eventHandler("asunatracks-sync:disable-live", ({ value }) => $storage.set("asunatracks-sync:disable-live-sync", value)),
								}),
								tray.switch("Skip adult entries for livesync", {
									fieldRef: fields.skipAdult,
									disabled: !signedIn,
									style: { "--color-brand-500": "255 63 141" },
									onChange: ctx.eventHandler("asunatracks-sync:skip-adult", ({ value }) => $storage.set("asunatracks-sync:skip-adult", value)),
								}),
								tray.switch("Disable badge for non-critical notifications", {
									fieldRef: fields.suppressBadge,
									style: { "--color-brand-500": "255 63 141" },
									onChange: ctx.eventHandler("asunatracks-sync:suppress-badge", ({ value }) => $storage.set("asunatracks-sync:suppress-badge", value)),
								}),
							],
							{ className: "font-bold text-sm space-y-2", style: { color: theme.text } },
						),
						tray.div([], { className: "h-14" }),
						tray.div(
							[
								tray.text(`Connections made: ${total}`, { className: "text-[10px] leading-tight", style: { color: theme.muted } }),
								tray.text(`Successful connections: ${state.success.get()} (${successRate}%)`, { className: "text-[10px] leading-tight", style: { color: theme.muted } }),
								tray.p([
									tray.span("Last connection: ", { style: { color: theme.muted } }),
									tray.span(lastState, { style: { color: state.lastError.get() ? theme.red : theme.green } }),
								], { className: "text-[10px] leading-tight" }),
							],
							{ className: "mt-4" },
						),
						tray.flex(
							[
								tray.anchor("Privacy Policy", { href: "https://asunatracks.space/info/privacy", className: "no-underline hover:underline", style: { color: theme.muted } }),
								tray.span("|", { style: { color: theme.borderStrong } }),
								tray.anchor("Terms", { href: "https://asunatracks.space/info/terms", className: "no-underline hover:underline", style: { color: theme.muted } }),
							],
							{ className: "justify-center text-xs mt-2 gap-2" },
						),
					],
					{
						className: "m-1 p-3 rounded-md border",
						style: {
							background: `radial-gradient(circle at 100% 0%, rgba(255,63,141,0.16), transparent 38%), linear-gradient(180deg, rgba(168,85,247,0.08), rgba(255,63,141,0.04)), ${theme.bg}`,
							borderColor: theme.border,
							color: theme.text,
							minHeight: "22rem",
						},
					},
				);
			},
		};
		$store.watch<$app.PostUpdateEntryEvent>("asunatracks-sync:post-update", (event) =>
			liveSync<$app.PreUpdateEntryEvent>("update", event, "asunatracks-sync:pre-update", (data, type) => ({
				status: normalizeStatus(type, data.status),
				progress: data.progress,
				progress_volumes: type === "manga" ? mangaVolumeProgress(data.progressVolumes) : undefined,
				score: typeof data.scoreRaw === "number" ? data.scoreRaw : undefined,
				score_10: normalizeScore10(data.scoreRaw),
				start_date: toISODate(data.startedAt),
				finish_date: toISODate(data.completedAt),
			})),
		);

		$store.watch<$app.PostUpdateEntryProgressEvent>("asunatracks-sync:post-progress", (event) =>
			liveSync<$app.PreUpdateEntryProgressEvent>("progress", event, "asunatracks-sync:pre-progress", (data, type) => ({
				status: normalizeStatus(type, data.progress && data.progress === data.totalCount ? "COMPLETED" : data.status),
				progress: data.progress,
				progress_volumes: type === "manga" ? mangaVolumeProgress((data as any).progressVolumes) : undefined,
			})),
		);

		$store.watch<$app.PostUpdateEntryRepeatEvent>("asunatracks-sync:post-repeat", (event) =>
			liveSync<$app.PreUpdateEntryRepeatEvent>("repeat", event, "asunatracks-sync:pre-repeat", (data) => ({
				repeat_count: data.repeat,
			})),
		);

		$store.watch<$app.PostDeleteEntryEvent>("asunatracks-sync:post-delete", liveDelete);

		tray.render(() => ui.render());
		ctx.effect(() => {
			if (!state.token.get()) return tray.updateBadge({ number: 1, intent: "error" });
			if (state.busy.get() && !fields.suppressBadge.current.valueOf()) return tray.updateBadge({ number: 1, intent: "warning" });
			return tray.updateBadge({ number: 0 });
		}, [state.token, state.busy, notifications.unreads]);

		if (state.token.get()) {
			api("/public/api/me")
				.then((res) => res.json())
				.then((data) => {
					setToken(state.token.get(), data.user ?? state.user.get());
					state.status.set(`Signed in${data.user?.username ? ` as ${data.user.username}` : ""}`);
					log.push("Success", "Existing AsunaTracks token is valid");
				})
				.catch((err) => {
					state.lastError.set((err as Error).message);
					state.status.set("Please sign in again");
					log.push("Error", `Token check failed: ${(err as Error).message}`);
				});
		}
	});

	$app.onPreUpdateEntry((event) => {
		$store.set("asunatracks-sync:pre-update", $clone(event));
		event.next();
	});

	$app.onPostUpdateEntry((event) => {
		$store.set("asunatracks-sync:post-update", $clone(event));
		event.next();
	});

	$app.onPreUpdateEntryProgress((event) => {
		$store.set("asunatracks-sync:pre-progress", $clone(event));
		event.next();
	});

	$app.onPostUpdateEntryProgress((event) => {
		$store.set("asunatracks-sync:post-progress", $clone(event));
		event.next();
	});

	$app.onPreUpdateEntryRepeat((event) => {
		$store.set("asunatracks-sync:pre-repeat", $clone(event));
		event.next();
	});

	$app.onPostUpdateEntryRepeat((event) => {
		$store.set("asunatracks-sync:post-repeat", $clone(event));
		event.next();
	});

	$app.onPostDeleteEntry((event) => {
		$store.set("asunatracks-sync:post-delete", $clone(event));
		event.next();
	});
}
