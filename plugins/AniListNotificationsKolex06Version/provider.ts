/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

type AniListNotification = Record<string, any> & {
	id: number;
	type?: string;
	createdAt?: number;
	unread?: boolean;
};

function init() {
	$ui.register((ctx) => {
		const sidebarIcon = `<span style="display:inline-block;width:24px;height:24px;min-width:24px;min-height:24px;vertical-align:middle;border-radius:6px;background-image:url(https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/main/icons/AniList-Notifications-Kolex06-Version.png),url(http://127.0.0.1:18126/icons/AniList-Notifications-Kolex06-Version.png);background-size:contain;background-position:center;background-repeat:no-repeat;filter:drop-shadow(0 0 5px rgba(8,168,255,.45))"></span>`;

		const webview = ctx.newWebview({
			slot: "screen",
			fullWidth: true,
			autoHeight: true,
			sidebar: {
				label: "Notifications",
				icon: sidebarIcon,
			},
		});

		const notifications = ctx.state<AniListNotification[]>([]);
		const unreadCount = ctx.state<number>(0);
		const loading = ctx.state<boolean>(false);
		const error = ctx.state<string | null>(null);
		const lastUpdated = ctx.state<string>("");

		webview.channel.sync("notifications", notifications);
		webview.channel.sync("unreadCount", unreadCount);
		webview.channel.sync("loading", loading);
		webview.channel.sync("error", error);
		webview.channel.sync("lastUpdated", lastUpdated);

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
				throw new Error("AniList token missing. Sign in to AniList in Seanime settings, then refresh this page.");
			}

			return String(token);
		}

		async function anilistFetch(query: string, variables: Record<string, any> = {}) {
			const token = getAniListToken();
			const res = await ctx.fetch("https://graphql.anilist.co", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ query, variables }),
			});

			if (!res.ok) {
				let detail = "";
				try {
					detail = await res.text();
				} catch (_) {}
				throw new Error(`AniList returned HTTP ${res.status}${detail ? ": " + detail.slice(0, 120) : ""}`);
			}

			const json = await res.json();
			if (json.errors && json.errors.length) {
				throw new Error(json.errors[0].message || "AniList returned an error");
			}

			return json.data;
		}

		const GET_NOTIFICATIONS = `
			fragment AniListNotifUser on User {
				id
				name
				avatar { large medium }
			}

			fragment AniListNotifMedia on Media {
				id
				type
				siteUrl
				title { romaji english native }
				coverImage { large medium color }
			}

			fragment AniListNotifActivity on ActivityUnion {
				... on TextActivity {
					id
					type
					text
					siteUrl
					createdAt
					user { ...AniListNotifUser }
				}
				... on ListActivity {
					id
					type
					status
					progress
					siteUrl
					createdAt
					user { ...AniListNotifUser }
					media { ...AniListNotifMedia }
				}
				... on MessageActivity {
					id
					message
					siteUrl
					createdAt
				}
			}

			fragment AniListNotifThreadComment on ThreadComment {
				id
				comment
				siteUrl
				createdAt
				likeCount
				user { ...AniListNotifUser }
			}

			query ($page: Int, $perPage: Int, $resetNotificationCount: Boolean) {
				Page(page: $page, perPage: $perPage) {
					notifications(resetNotificationCount: $resetNotificationCount) {
						... on AiringNotification {
							id type animeId episode createdAt
							media { ...AniListNotifMedia }
						}
						... on FollowingNotification {
							id type userId context createdAt
							user { ...AniListNotifUser }
						}
						... on ActivityMessageNotification {
							id type userId activityId context createdAt
							message { id message }
							user { ...AniListNotifUser }
						}
						... on ActivityMentionNotification {
							id type userId activityId context createdAt
							activity { ...AniListNotifActivity }
							user { ...AniListNotifUser }
						}
						... on ActivityReplyNotification {
							id type userId activityId context createdAt
							activity { ...AniListNotifActivity }
							user { ...AniListNotifUser }
						}
						... on ActivityLikeNotification {
							id type userId activityId context createdAt
							activity { ...AniListNotifActivity }
							user { ...AniListNotifUser }
						}
						... on ActivityReplyLikeNotification {
							id type userId activityId context createdAt
							activity { ...AniListNotifActivity }
							user { ...AniListNotifUser }
						}
						... on ActivityReplySubscribedNotification {
							id type userId activityId context createdAt
							activity { ...AniListNotifActivity }
							user { ...AniListNotifUser }
						}
						... on ThreadCommentMentionNotification {
							id type userId commentId context createdAt
							thread { id title }
							comment { ...AniListNotifThreadComment }
							user { ...AniListNotifUser }
						}
						... on ThreadCommentReplyNotification {
							id type userId commentId context createdAt
							thread { id title }
							comment { ...AniListNotifThreadComment }
							user { ...AniListNotifUser }
						}
						... on ThreadCommentSubscribedNotification {
							id type userId commentId context createdAt
							thread { id title }
							comment { ...AniListNotifThreadComment }
							user { ...AniListNotifUser }
						}
						... on ThreadCommentLikeNotification {
							id type userId commentId context createdAt
							thread { id title }
							comment { ...AniListNotifThreadComment }
							user { ...AniListNotifUser }
						}
						... on ThreadLikeNotification {
							id type userId threadId context createdAt
							thread { id title }
							user { ...AniListNotifUser }
						}
						... on RelatedMediaAdditionNotification {
							id type mediaId context createdAt
							media { ...AniListNotifMedia }
						}
						... on MediaDataChangeNotification {
							id type mediaId context reason createdAt
							media { ...AniListNotifMedia }
						}
						... on MediaMergeNotification {
							id type mediaId context reason deletedMediaTitles createdAt
							media { ...AniListNotifMedia }
						}
						... on MediaDeletionNotification {
							id type deletedMediaTitle context reason createdAt
						}
					}
				}
				Viewer {
					id
					name
					unreadNotificationCount
				}
			}
		`;

		const GET_ACTIVITY_DETAIL = `
			query ($id: Int) {
				Activity(id: $id) {
					... on TextActivity {
						id
						type
						text
						siteUrl
						createdAt
						user { id name avatar { large medium } }
						replies {
							id
							text
							createdAt
							likeCount
							user { id name avatar { large medium } }
						}
					}
					... on ListActivity {
						id
						type
						status
						progress
						siteUrl
						createdAt
						user { id name avatar { large medium } }
						media { id type siteUrl title { romaji english native } coverImage { large medium color } }
						replies {
							id
							text
							createdAt
							likeCount
							user { id name avatar { large medium } }
						}
					}
					... on MessageActivity {
						id
						message
						siteUrl
						createdAt
						replies {
							id
							text
							createdAt
							likeCount
							user { id name avatar { large medium } }
						}
					}
				}
			}
		`;

		async function fetchNotifications(resetNotificationCount = false) {
			if (loading.get()) return;

			try {
				loading.set(true);
				error.set(null);

				const data = await anilistFetch(GET_NOTIFICATIONS, {
					page: 1,
					perPage: 50,
					resetNotificationCount,
				});

				const unread = resetNotificationCount ? 0 : Number(data?.Viewer?.unreadNotificationCount || 0);
				const viewerId = Number(data?.Viewer?.id || 0);
				const viewerName = data?.Viewer?.name || "";
				const items = (data?.Page?.notifications || []).map((item: AniListNotification, index: number) => ({
					...item,
					viewerId,
					viewerName,
					unread: index < unread,
				}));

				notifications.set(items);
				unreadCount.set(unread);
				lastUpdated.set(new Date().toLocaleString());
			} catch (err: any) {
				error.set(err?.message || "Failed to fetch AniList notifications");
			} finally {
				loading.set(false);
			}
		}

		async function loadActivityDetail(activityId: number) {
			const id = Number(activityId || 0);
			if (!id) return;

			try {
				const data = await anilistFetch(GET_ACTIVITY_DETAIL, { id });
				const activity = data?.Activity;
				if (!activity) return;

				notifications.set(notifications.get().map((item) => {
					if (Number(item.activityId || item.activity?.id || 0) !== id) return item;

					return {
						...item,
						activity: {
							...(item.activity || {}),
							...activity,
						},
					};
				}));
			} catch (err: any) {
				error.set(err?.message || "Failed to load AniList activity details");
			}
		}

		function markLocalRead(id: number) {
			const current = notifications.get();
			const target = current.find((item) => item.id === id);
			if (!target || !target.unread) return;

			notifications.set(current.map((item) => (item.id === id ? { ...item, unread: false } : item)));
			unreadCount.set(Math.max(0, unreadCount.get() - 1));
		}

		function safeAniListUrl(value: any): string {
			const url = String(value || "").trim();
			if (!/^https:\/\/anilist\.co(?:\/|$)/i.test(url)) return "";
			return url;
		}

		function openAniListUrl(value: any) {
			const url = safeAniListUrl(value);
			if (!url) return;

			try {
				if (typeof $os !== "undefined" && $os.platform === "windows") {
					$os.cmd("rundll32", "url.dll,FileProtocolHandler", url).start();
					return;
				}

				error.set("Could not open AniList automatically on this platform. Copy this link: " + url);
			} catch (err: any) {
				error.set((err?.message || "Could not open AniList link") + ". Copy this link: " + url);
			}
		}

		webview.channel.on("refresh", () => fetchNotifications(false));
		webview.channel.on("mark-all-read", () => fetchNotifications(true));
		webview.channel.on("mark-read-local", (id: number) => markLocalRead(Number(id)));
		webview.channel.on("load-activity-detail", (activityId: number) => loadActivityDetail(Number(activityId)));
		webview.channel.on("open-url", (url: string) => openAniListUrl(url));

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
						--panel: rgba(24, 36, 56, 0.74);
						--panel-strong: rgba(35, 51, 76, 0.86);
						--panel-soft: rgba(49, 70, 102, 0.72);
						--text: #f8fafc;
						--muted: #cbd5e1;
						--subtle: #94a3b8;
						--border: rgba(226, 232, 240, 0.18);
						--border-strong: rgba(125, 211, 252, 0.45);
						--accent: #02a9ff;
						--accent-strong: #7dd3fc;
						--accent-soft: rgba(2, 169, 255, 0.2);
						--green: #16a34a;
						--red: #fb7185;
						--shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
					}

					* {
						box-sizing: border-box;
					}

					html {
						min-height: 100%;
						background: var(--page);
					}

					body {
						min-height: 100vh;
						margin: 0;
						background: var(--page);
						color: var(--text);
						font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
						font-size: 15px;
						line-height: 1.5;
					}

					button,
					a {
						font: inherit;
					}

					.app-shell {
						width: min(1120px, calc(100vw - 28px));
						margin: 0 auto;
						padding: 24px 0 36px;
					}

					.header {
						display: flex;
						align-items: center;
						justify-content: space-between;
						gap: 16px;
						padding: 18px;
						margin-bottom: 18px;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: var(--panel);
						box-shadow: var(--shadow);
						backdrop-filter: blur(18px);
					}

					.header-title-row {
						display: flex;
						align-items: center;
						gap: 12px;
						min-width: 0;
					}

					.header-icon {
						width: 44px;
						height: 44px;
						display: inline-flex;
						align-items: center;
						justify-content: center;
						flex: 0 0 44px;
						border-radius: 8px;
						background: var(--accent-soft);
						color: var(--accent-strong);
					}

					.header-title {
						margin: 0;
						font-size: 1.45rem;
						font-weight: 800;
						letter-spacing: 0;
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
					}

					.header-subtitle {
						margin: 2px 0 0;
						color: var(--muted);
						font-size: 0.9rem;
					}

					.header-actions {
						display: flex;
						align-items: center;
						justify-content: flex-end;
						flex-wrap: wrap;
						gap: 10px;
					}

					.badge {
						display: inline-flex;
						align-items: center;
						justify-content: center;
						min-width: 28px;
						height: 28px;
						padding: 0 9px;
						border-radius: 999px;
						background: var(--red);
						color: #fff;
						font-size: 0.78rem;
						font-weight: 800;
					}

					.badge.hidden {
						display: none;
					}

					.btn,
					.icon-button {
						display: inline-flex;
						align-items: center;
						justify-content: center;
						gap: 8px;
						min-height: 40px;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: var(--panel-strong);
						color: var(--text);
						cursor: pointer;
						text-decoration: none;
						transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
					}

					.btn {
						padding: 0 14px;
						font-weight: 700;
					}

					.icon-button {
						width: 40px;
						padding: 0;
					}

					.btn:hover,
					.icon-button:hover {
						border-color: var(--border-strong);
						background: var(--panel-soft);
						transform: translateY(-1px);
					}

					.btn:disabled,
					.icon-button[aria-disabled="true"] {
						opacity: 0.45;
						cursor: not-allowed;
						transform: none;
					}

					.btn-primary {
						border-color: transparent;
						background: var(--accent);
						color: #fff;
					}

					.btn-primary:hover {
						background: var(--accent-strong);
					}

					a.btn,
					a.icon-button {
						text-decoration: none;
					}

					.list {
						display: flex;
						flex-direction: column;
						gap: 16px;
					}

					.notification {
						width: 100%;
						display: grid;
						grid-template-columns: 96px minmax(0, 1fr) 52px;
						gap: 20px;
						align-items: start;
						min-height: 148px;
						padding: 24px;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: var(--panel);
						box-shadow: 0 14px 34px rgba(0, 0, 0, 0.16);
						color: var(--text);
						text-align: left;
						cursor: pointer;
						backdrop-filter: blur(18px);
					}

					.notification:hover {
						border-color: rgba(2, 169, 255, 0.5);
						background: rgba(38, 56, 84, 0.86);
					}

					.notification.open {
						border-color: rgba(125, 211, 252, 0.8);
						background: rgba(38, 56, 84, 0.92);
					}

					.notification.unread {
						border-left: 5px solid var(--accent);
						padding-left: 19px;
					}

					.thumb {
						width: 96px;
						height: 96px;
						display: inline-flex;
						align-items: center;
						justify-content: center;
						overflow: hidden;
						border-radius: 8px;
						background: linear-gradient(135deg, rgba(14, 165, 233, 0.34), rgba(56, 189, 248, 0.2));
						color: var(--accent-strong);
						font-weight: 900;
						font-size: 1.15rem;
					}

					.thumb.media {
						height: 132px;
					}

					.thumb img {
						width: 100%;
						height: 100%;
						object-fit: cover;
					}

					.card-main {
						min-width: 0;
					}

					.meta-row {
						display: flex;
						align-items: center;
						flex-wrap: wrap;
						gap: 8px;
						margin-bottom: 8px;
					}

					.type-tag {
						display: inline-flex;
						align-items: center;
						min-height: 28px;
						padding: 0 11px;
						border-radius: 999px;
						background: var(--accent-soft);
						color: var(--accent-strong);
						font-size: 0.78rem;
						font-weight: 900;
						text-transform: uppercase;
					}

					.user-tag,
					.time-tag {
						color: var(--muted);
						font-size: 0.88rem;
						font-weight: 650;
					}

					.card-title {
						margin: 0;
						font-size: 1.26rem;
						font-weight: 800;
						letter-spacing: 0;
					}

					.card-text {
						margin: 8px 0 0;
						color: var(--muted);
						font-size: 1.04rem;
					}

					.media-pill {
						display: inline-flex;
						align-items: center;
						max-width: 100%;
						gap: 10px;
						margin-top: 14px;
						padding: 10px 13px;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: var(--panel-soft);
						color: var(--text);
						font-weight: 750;
					}

					.media-pill img {
						width: 46px;
						height: 64px;
						object-fit: cover;
						border-radius: 6px;
					}

					.media-pill span {
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
					}

					.card-action {
						align-self: center;
						color: var(--accent-strong);
					}

					.state {
						padding: 46px 18px;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: var(--panel);
						text-align: center;
						box-shadow: var(--shadow);
						backdrop-filter: blur(18px);
					}

					.state h2 {
						margin: 0 0 8px;
						font-size: 1.25rem;
					}

					.state p {
						margin: 0 0 18px;
						color: var(--muted);
					}

					.error-banner {
						margin: 0 0 16px;
						padding: 12px 14px;
						border: 1px solid rgba(251, 113, 133, 0.45);
						border-radius: 8px;
						background: rgba(251, 113, 133, 0.14);
						color: #fecdd3;
						font-weight: 750;
					}

					.detail-sheet {
						margin: -6px 0 6px 116px;
						overflow: hidden;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: rgba(18, 28, 46, 0.92);
						box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
						backdrop-filter: blur(18px);
					}

					.detail-sheet-head {
						display: flex;
						align-items: flex-start;
						justify-content: space-between;
						gap: 16px;
						padding: 20px 20px 14px;
						border-bottom: 1px solid var(--border);
					}

					.detail-sheet-title {
						margin: 0;
						font-size: 1.35rem;
						font-weight: 900;
						letter-spacing: 0;
					}

					.detail-sheet-body {
						display: grid;
						grid-template-columns: 112px minmax(0, 1fr);
						gap: 20px;
						padding: 20px;
					}

					.detail-sheet-text {
						margin: 0 0 14px;
						color: var(--text);
						font-size: 1.06rem;
					}

					.detail-grid {
						display: grid;
						grid-template-columns: repeat(2, minmax(0, 1fr));
						gap: 10px;
					}

					.detail {
						min-width: 0;
						padding: 10px;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: var(--panel-soft);
					}

					.detail-label {
						margin-bottom: 2px;
						color: var(--subtle);
						font-size: 0.72rem;
						font-weight: 900;
						text-transform: uppercase;
					}

					.detail-value {
						overflow-wrap: anywhere;
						color: var(--text);
						font-weight: 720;
					}

					.quote {
						grid-column: 1 / -1;
						margin-top: 4px;
						padding: 12px;
						border-left: 4px solid var(--accent);
						border-radius: 8px;
						background: var(--accent-soft);
						color: var(--text);
						white-space: pre-wrap;
					}

					.liked-media {
						display: grid;
						grid-template-columns: 72px minmax(0, 1fr);
						gap: 14px;
						align-items: center;
						margin: 14px 0;
						padding: 12px;
						border: 1px solid rgba(125, 211, 252, 0.32);
						border-radius: 8px;
						background: rgba(2, 169, 255, 0.14);
					}

					.liked-media-cover {
						width: 72px;
						height: 102px;
						overflow: hidden;
						border-radius: 8px;
						background: var(--panel-soft);
					}

					.liked-media-cover img {
						width: 100%;
						height: 100%;
						object-fit: cover;
					}

					.liked-media-kicker {
						margin-bottom: 4px;
						color: var(--accent-strong);
						font-size: 0.74rem;
						font-weight: 900;
						text-transform: uppercase;
					}

					.liked-media-title {
						margin: 0;
						color: var(--text);
						font-size: 1.08rem;
						font-weight: 900;
					}

					.liked-media-meta {
						margin-top: 5px;
						color: var(--muted);
						font-weight: 760;
					}

					.info-note {
						margin: 14px 0;
						padding: 10px 12px;
						border: 1px solid rgba(125, 211, 252, 0.26);
						border-radius: 8px;
						background: rgba(2, 169, 255, 0.1);
						color: var(--muted);
						font-weight: 700;
					}

					.raw-data {
						grid-column: 1 / -1;
						margin-top: 10px;
						border: 1px solid var(--border);
						border-radius: 8px;
						background: rgba(255, 255, 255, 0.025);
					}

					.raw-data summary {
						cursor: pointer;
						padding: 10px 12px;
						color: var(--muted);
						font-weight: 800;
					}

					.raw-data pre {
						max-height: 340px;
						overflow: auto;
						margin: 0;
						padding: 0 12px 12px;
						color: var(--muted);
						font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
						font-size: 0.78rem;
						line-height: 1.45;
						white-space: pre-wrap;
						overflow-wrap: anywhere;
					}

					.detail-sheet-actions {
						display: flex;
						align-items: center;
						justify-content: flex-end;
						gap: 10px;
						flex-wrap: wrap;
						padding: 0 20px 20px;
					}

					.hidden {
						display: none !important;
					}

					@media (max-width: 720px) {
						.app-shell {
							width: min(100vw - 20px, 980px);
							padding-top: 14px;
						}

						.header {
							align-items: flex-start;
							flex-direction: column;
						}

						.header-actions {
							width: 100%;
							justify-content: flex-start;
						}

						.notification {
							grid-template-columns: 72px minmax(0, 1fr);
							gap: 12px;
							min-height: 120px;
							padding: 18px;
						}

						.notification.unread {
							padding-left: 10px;
						}

						.thumb {
							width: 72px;
							height: 72px;
						}

						.thumb.media {
							height: 98px;
						}

						.card-action {
							display: none;
						}

						.detail-sheet {
							margin-left: 0;
						}

						.detail-sheet-body {
							grid-template-columns: 1fr;
						}

						.detail-grid {
							grid-template-columns: 1fr;
						}
					}
				</style>
			</head>
			<body>
				<div id="app" class="app-shell"></div>

				<script>
					(function() {
						var state = {
							notifications: [],
							unreadCount: 0,
							loading: false,
							error: null,
							lastUpdated: "",
							selectedId: null
						};

						var icons = {
							bell: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 6.2-2.6 8.2-3.2 8.7a.7.7 0 0 0 .4 1.3h17.6a.7.7 0 0 0 .4-1.3C20.6 16.2 18 14.2 18 8Z"/><path d="M10 21h4"/></svg>',
							refresh: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.3 6.4"/><path d="M3 12A9 9 0 0 1 18.3 5.6"/><path d="M3 18v-6h6"/><path d="M21 6v6h-6"/></svg>',
							check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
							external: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
							close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
							chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
						};

						function create(tag, className, text) {
							var node = document.createElement(tag);
							if (className) node.className = className;
							if (text !== undefined && text !== null) node.textContent = String(text);
							return node;
						}

						function iconNode(name, className) {
							var span = create('span', className || '');
							span.innerHTML = icons[name] || '';
							return span;
						}

						function stripHtml(value) {
							if (!value) return '';
							var div = document.createElement('div');
							div.innerHTML = String(value);
							return (div.textContent || div.innerText || '').trim();
						}

						function normalizeText(value) {
							return stripHtml(value).replace(/\s+/g, ' ').trim().toLowerCase();
						}

						function sameText(left, right) {
							var a = normalizeText(left);
							var b = normalizeText(right);
							return !!a && !!b && a === b;
						}

						function titleCase(value) {
							return String(value || 'Notification')
								.replace(/_/g, ' ')
								.toLowerCase()
								.replace(/\\b\\w/g, function(char) { return char.toUpperCase(); });
						}

						function mediaTitle(media) {
							if (!media || !media.title) return '';
							return media.title.english || media.title.romaji || media.title.native || '';
						}

						function itemMedia(item) {
							return item && (item.media || (item.activity && item.activity.media)) || null;
						}

						function mediaUrl(media) {
							if (!media) return '';
							if (media.siteUrl) return media.siteUrl;
							if (!media.id) return '';
							return 'https://anilist.co/' + (media.type === 'MANGA' ? 'manga' : 'anime') + '/' + encodeURIComponent(media.id);
						}

						function activityOwner(activity) {
							return activity && activity.user && activity.user.name ? activity.user.name : '';
						}

						function activitySummary(activity) {
							if (!activity) return '';

							var text = stripHtml(activity.text || activity.message);
							if (text) return text;

							var title = mediaTitle(activity.media);
							if (title) return title;

							if (activity.status || activity.progress || title) {
								var owner = activityOwner(activity);
								var parts = [];
								if (owner) parts.push(owner);
								if (activity.status) parts.push(String(activity.status));
								if (activity.progress) parts.push(String(activity.progress));
								if (title) parts.push(title);
								return parts.join(' ');
							}

							return '';
						}

						function matchedReply(item) {
							if (!item || !item.activity || !Array.isArray(item.activity.replies)) return null;
							if (item.replyId) {
								var replyId = Number(item.replyId);
								return item.activity.replies.find(function(reply) {
									return Number(reply && reply.id) === replyId;
								}) || null;
							}
							if (item.type === 'ACTIVITY_REPLY_LIKE' && item.viewerId) {
								var viewerId = Number(item.viewerId);
								return item.activity.replies.find(function(reply) {
									return Number(reply && reply.user && reply.user.id) === viewerId;
								}) || null;
							}
							if (item.type === 'ACTIVITY_REPLY_LIKE' && item.viewerName) {
								var viewerName = String(item.viewerName).toLowerCase();
								return item.activity.replies.find(function(reply) {
									return String(reply && reply.user && reply.user.name || '').toLowerCase() === viewerName;
								}) || null;
							}
							return null;
						}

						function likedContent(item) {
							if (!item) return '';

							if (item.type === 'ACTIVITY_LIKE') {
								var text = stripHtml(item.activity && (item.activity.text || item.activity.message));
								if (text) return text;
								if (itemMedia(item)) return '';
								return activitySummary(item.activity);
							}

							if (item.type === 'ACTIVITY_REPLY_LIKE') {
								var reply = matchedReply(item);
								var replyText = stripHtml(reply && reply.text);
								if (replyText) return replyText;
								return activitySummary(item.activity);
							}

							if (item.type === 'THREAD_COMMENT_LIKE') {
								return stripHtml(item.comment && item.comment.comment);
							}

							if (item.type === 'THREAD_LIKE') {
								return item.thread && item.thread.title ? item.thread.title : '';
							}

							return '';
						}

						function likedContentLabel(item) {
							if (!item) return 'Liked content';
							if (item.type === 'ACTIVITY_REPLY_LIKE') return 'Liked reply';
							if (item.type === 'THREAD_COMMENT_LIKE') return 'Liked comment';
							if (item.type === 'THREAD_LIKE') return 'Liked thread';
							return 'Liked activity';
						}

						function notificationTitle(item) {
							var userName = item.user && item.user.name ? item.user.name : '';
							var title = mediaTitle(item.media);

							switch (item.type) {
								case 'AIRING':
									return 'Episode ' + (item.episode || '?') + ' aired';
								case 'FOLLOWING':
									return userName ? userName + ' followed you' : 'New follower';
								case 'ACTIVITY_MESSAGE':
									return userName ? 'Message from ' + userName : 'New activity message';
								case 'ACTIVITY_MENTION':
									return userName ? userName + ' mentioned you' : 'You were mentioned';
								case 'ACTIVITY_REPLY':
									return userName ? userName + ' replied to you' : 'New activity reply';
								case 'ACTIVITY_LIKE':
									return userName ? userName + ' liked your activity' : 'Activity liked';
								case 'ACTIVITY_REPLY_LIKE':
									return userName ? userName + ' liked your reply' : 'Reply liked';
								case 'ACTIVITY_REPLY_SUBSCRIBED':
									return 'New reply on a subscribed activity';
								case 'THREAD_COMMENT_MENTION':
									return userName ? userName + ' mentioned you in a thread' : 'Thread mention';
								case 'THREAD_COMMENT_REPLY':
									return userName ? userName + ' replied in a thread' : 'Thread reply';
								case 'THREAD_COMMENT_SUBSCRIBED':
									return 'New comment in a subscribed thread';
								case 'THREAD_COMMENT_LIKE':
									return userName ? userName + ' liked your thread comment' : 'Thread comment liked';
								case 'THREAD_LIKE':
									return userName ? userName + ' liked your thread' : 'Thread liked';
								case 'RELATED_MEDIA_ADDITION':
									return title ? 'Related media added for ' + title : 'Related media added';
								case 'MEDIA_DATA_CHANGE':
									return title ? 'Media data changed for ' + title : 'Media data changed';
								case 'MEDIA_MERGE':
									return title ? 'Media merged into ' + title : 'Media merged';
								case 'MEDIA_DELETION':
									return item.deletedMediaTitle ? item.deletedMediaTitle + ' was deleted' : 'Media deleted';
								default:
									return title || titleCase(item.type);
							}
						}

						function notificationText(item) {
							var context = stripHtml(item.context);
							var liked = likedContent(item);
							var activityText = activitySummary(item.activity);
							var messageText = stripHtml(item.message && item.message.message);
							var reason = stripHtml(item.reason);

							if (liked && String(item.type || '').includes('LIKE')) return likedContentLabel(item) + ': ' + liked;
							if (context) return context;
							if (liked) return likedContentLabel(item) + ': ' + liked;
							if (messageText) return messageText;
							if (activityText) return activityText;
							if (reason) return 'Reason: ' + reason;
							if (item.deletedMediaTitles && item.deletedMediaTitles.length) return 'Merged titles: ' + item.deletedMediaTitles.join(', ');
							return 'Open this notification for details and the AniList page link.';
						}

						function popupIntroText(item) {
							var type = String(item.type || '');
							var title = notificationTitle(item);
							var liked = likedContent(item);
							var text = notificationText(item);
							var context = stripHtml(item.context);

							if (type.indexOf('LIKE') !== -1) {
								if (context && !sameText(context, title) && !sameText(context, liked)) return context;
								return '';
							}

							if (!text || sameText(text, title) || sameText(text, liked)) return '';
							return text;
						}

						function formatTime(ts) {
							if (!ts) return '';
							var diff = Math.max(0, Math.floor(Date.now() / 1000) - Number(ts));
							if (diff < 60) return 'just now';
							if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
							if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
							if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
							return new Date(Number(ts) * 1000).toLocaleDateString();
						}

						function aniListUrl(item) {
							var media = item.media || null;
							var mediaId = item.animeId || item.mediaId || (media && media.id);
							if (mediaId) {
								return mediaUrl(media) || ('https://anilist.co/anime/' + encodeURIComponent(mediaId));
							}

							if (item.comment && item.comment.siteUrl) {
								return item.comment.siteUrl;
							}

							if (item.activity && item.activity.siteUrl) {
								return item.activity.siteUrl;
							}

							var activityId = item.activityId || (item.activity && item.activity.id) || (item.message && item.message.id);
							if (activityId) {
								return 'https://anilist.co/activity/' + encodeURIComponent(activityId);
							}

							var threadId = item.threadId || (item.thread && item.thread.id);
							if (threadId && item.commentId) {
								return 'https://anilist.co/forum/thread/' + encodeURIComponent(threadId) + '/comment/' + encodeURIComponent(item.commentId);
							}
							if (threadId) {
								return 'https://anilist.co/forum/thread/' + encodeURIComponent(threadId);
							}

							if (item.user && item.user.name) {
								return 'https://anilist.co/user/' + encodeURIComponent(item.user.name);
							}
							if (item.userId) {
								return 'https://anilist.co/user/' + encodeURIComponent(item.userId);
							}

							return 'https://anilist.co/notifications';
						}

						function userUrl(user, userId) {
							if (user && user.name) return 'https://anilist.co/user/' + encodeURIComponent(user.name);
							if (userId) return 'https://anilist.co/user/' + encodeURIComponent(userId);
							return '';
						}

						function activityUrl(item) {
							if (item.activity && item.activity.siteUrl) return item.activity.siteUrl;
							var activityId = item.activityId || (item.activity && item.activity.id) || (item.message && item.message.id);
							return activityId ? 'https://anilist.co/activity/' + encodeURIComponent(activityId) : '';
						}

						function threadUrl(item) {
							var threadId = item.threadId || (item.thread && item.thread.id);
							if (threadId && item.commentId) {
								return 'https://anilist.co/forum/thread/' + encodeURIComponent(threadId) + '/comment/' + encodeURIComponent(item.commentId);
							}
							return threadId ? 'https://anilist.co/forum/thread/' + encodeURIComponent(threadId) : '';
						}

						function uniqueActions(actions) {
							var seen = {};
							return actions.filter(function(action) {
								if (!action || !action.url || seen[action.url]) return false;
								seen[action.url] = true;
								return true;
							});
						}

						function shouldLoadActivityDetail(item) {
							if (!item || !item.activityId) return false;
							var type = String(item.type || '');
							if (type.indexOf('ACTIVITY_') !== 0) return false;
							if (!item.activity) return true;
							if (type === 'ACTIVITY_REPLY_LIKE' && !Array.isArray(item.activity.replies)) return true;
							if (type.indexOf('LIKE') !== -1 && !item.activity.siteUrl) return true;
							if (type === 'ACTIVITY_LIKE' && !item.activity.media && !item.activity.text && !item.activity.message) return true;
							return false;
						}

						function listProgressText(item) {
							if (!item || !item.activity) return '';
							var status = titleCase(item.activity.status || '').trim();
							var progress = item.activity.progress !== undefined && item.activity.progress !== null ? String(item.activity.progress).trim() : '';
							if (!status && !progress) return '';
							if (status && progress) return status + ' ' + progress;
							return status || progress;
						}

						function imageFor(item) {
							var media = itemMedia(item);
							var cover = media && media.coverImage ? media.coverImage.large || media.coverImage.medium : '';
							var avatar = item.user && item.user.avatar ? item.user.avatar.large || item.user.avatar.medium : '';
							return cover || avatar || '';
						}

						function initialsFor(item) {
							var name = (item.user && item.user.name) || mediaTitle(item.media) || mediaTitle(item.activity && item.activity.media) || activityOwner(item.activity) || 'AniList';
							return String(name)
								.split(/\\s+/)
								.filter(Boolean)
								.map(function(part) { return part.charAt(0); })
								.join('')
								.slice(0, 2)
								.toUpperCase() || 'AL';
						}

						function send(name, value) {
							if (window.webview && typeof window.webview.send === 'function') {
								window.webview.send(name, value);
							}
						}

						function linkButton(href, className, iconName, label, title) {
							var link = document.createElement('a');
							link.className = className;
							link.href = href || 'https://anilist.co/notifications';
							link.target = '_blank';
							link.rel = 'noopener noreferrer';
							if (title) {
								link.title = title;
								link.setAttribute('aria-label', title);
							}
							if (iconName) link.appendChild(iconNode(iconName));
							if (label) link.appendChild(document.createTextNode(label));
							link.onclick = function(event) {
								event.preventDefault();
								event.stopPropagation();
								send('open-url', link.href);
							};
							return link;
						}

						function renderHeader(root) {
							var header = create('div', 'header');
							var left = create('div', 'header-title-row');
							var headerIcon = iconNode('bell', 'header-icon');
							var copy = create('div');
							var title = create('h1', 'header-title', 'AniList Notifications');
							var subtitle = create('p', 'header-subtitle', state.lastUpdated ? 'Updated ' + state.lastUpdated : 'Kolex06 Version');
							copy.appendChild(title);
							copy.appendChild(subtitle);
							left.appendChild(headerIcon);
							left.appendChild(copy);

							var actions = create('div', 'header-actions');
							var badge = create('span', 'badge' + (state.unreadCount > 0 ? '' : ' hidden'), state.unreadCount);
							var refresh = create('button', 'btn btn-primary');
							refresh.type = 'button';
							refresh.disabled = !!state.loading;
							refresh.appendChild(iconNode('refresh'));
							refresh.appendChild(document.createTextNode(state.loading ? 'Refreshing' : 'Refresh'));
							refresh.onclick = function() { send('refresh'); };

							var markAll = create('button', 'btn');
							markAll.type = 'button';
							markAll.disabled = Number(state.unreadCount) <= 0;
							markAll.appendChild(iconNode('check'));
							markAll.appendChild(document.createTextNode('Mark all read'));
							markAll.onclick = function() { send('mark-all-read'); };

							var openAniList = linkButton('https://anilist.co/notifications', 'icon-button', 'external', '', 'Open AniList notifications');

							actions.appendChild(badge);
							actions.appendChild(refresh);
							actions.appendChild(markAll);
							actions.appendChild(openAniList);
							header.appendChild(left);
							header.appendChild(actions);
							root.appendChild(header);
						}

						function renderThumb(parent, item, large) {
							var image = imageFor(item);
							var thumb = create('div', 'thumb' + ((itemMedia(item) || large) ? ' media' : ''));
							if (image) {
								var img = document.createElement('img');
								img.src = image;
								img.alt = '';
								thumb.appendChild(img);
							} else {
								thumb.textContent = initialsFor(item);
							}
							parent.appendChild(thumb);
						}

						function renderLikedMedia(parent, item) {
							var media = itemMedia(item);
							var title = mediaTitle(media);
							if (!media || !title) {
								if (String(item.type || '').includes('LIKE')) {
									parent.appendChild(create('div', 'info-note', 'No anime or manga title is attached to this like.'));
								}
								return;
							}

							var box = create('div', 'liked-media');
							var cover = create('div', 'liked-media-cover');
							var image = media.coverImage ? media.coverImage.large || media.coverImage.medium : '';
							if (image) {
								var img = document.createElement('img');
								img.src = image;
								img.alt = '';
								cover.appendChild(img);
							}

							var copy = create('div');
							var typeLabel = media.type === 'MANGA' ? 'Manga' : 'Anime';
							if (item.activity && item.activity.media && String(item.type || '').includes('LIKE')) {
								typeLabel += ' from liked activity';
							} else if (item.activity && item.activity.media) {
								typeLabel += ' from activity';
							}
							copy.appendChild(create('div', 'liked-media-kicker', typeLabel));
							copy.appendChild(create('h3', 'liked-media-title', title));
							var progressText = listProgressText(item);
							if (progressText) copy.appendChild(create('div', 'liked-media-meta', progressText));

							box.appendChild(cover);
							box.appendChild(copy);
							parent.appendChild(box);
						}

						function renderAllAniListData(parent, item) {
							var details = document.createElement('details');
							details.className = 'raw-data';

							var summary = document.createElement('summary');
							summary.textContent = 'More AniList data';

							var pre = document.createElement('pre');
							try {
								pre.textContent = JSON.stringify(item, null, 2);
							} catch (_) {
								pre.textContent = 'AniList data could not be shown.';
							}

							details.appendChild(summary);
							details.appendChild(pre);
							parent.appendChild(details);
						}

						function renderNotification(list, item) {
							var isOpen = state.selectedId === item.id;
							var card = create('button', 'notification' + (item.unread ? ' unread' : '') + (isOpen ? ' open' : ''));
							card.type = 'button';
							card.onclick = function() {
								state.selectedId = item.id;
								send('mark-read-local', item.id);
								if (shouldLoadActivityDetail(item)) {
									send('load-activity-detail', item.activityId);
								}
								if (item.unread) {
									item.unread = false;
									state.unreadCount = Math.max(0, Number(state.unreadCount || 0) - 1);
								}
								render();
							};

							renderThumb(card, item, false);

							var main = create('div', 'card-main');
							var meta = create('div', 'meta-row');
							meta.appendChild(create('span', 'type-tag', titleCase(item.type)));
							if (item.user && item.user.name) meta.appendChild(create('span', 'user-tag', '@' + item.user.name));
							meta.appendChild(create('span', 'time-tag', formatTime(item.createdAt)));

							main.appendChild(meta);
							main.appendChild(create('h2', 'card-title', notificationTitle(item)));
							main.appendChild(create('p', 'card-text', notificationText(item)));

							var media = mediaTitle(item.media) || mediaTitle(item.activity && item.activity.media);
							if (media) {
								var pill = create('div', 'media-pill');
								var mediaSource = item.media || (item.activity && item.activity.media) || null;
								var cover = mediaSource && mediaSource.coverImage ? mediaSource.coverImage.medium || mediaSource.coverImage.large : '';
								if (cover) {
									var img = document.createElement('img');
									img.src = cover;
									img.alt = '';
									pill.appendChild(img);
								}
								pill.appendChild(create('span', '', media));
								main.appendChild(pill);
							}

							card.appendChild(main);
							card.appendChild(iconNode('chevron', 'card-action'));
							list.appendChild(card);
						}

						function detail(label, value) {
							if (value === undefined || value === null || value === '') return null;
							var box = create('div', 'detail');
							box.appendChild(create('div', 'detail-label', label));
							box.appendChild(create('div', 'detail-value', value));
							return box;
						}

						function renderDetailSheet(list, item) {
							var sheet = create('div', 'detail-sheet');
							var head = create('div', 'detail-sheet-head');
							var titleWrap = create('div');
							titleWrap.appendChild(create('div', 'type-tag', titleCase(item.type)));
							titleWrap.appendChild(create('h2', 'detail-sheet-title', notificationTitle(item)));

							var close = create('button', 'icon-button');
							close.type = 'button';
							close.title = 'Close';
							close.setAttribute('aria-label', 'Close notification details');
							close.appendChild(iconNode('close'));
							close.onclick = function() {
								state.selectedId = null;
								render();
							};

							head.appendChild(titleWrap);
							head.appendChild(close);

							var body = create('div', 'detail-sheet-body');
							renderThumb(body, item, true);
							var content = create('div');
							var introText = popupIntroText(item);
							if (introText) content.appendChild(create('p', 'detail-sheet-text', introText));
							var reply = matchedReply(item);
							var commentLikeCount = item.comment && item.comment.likeCount;
							var replyLikeCount = reply && reply.likeCount;
							renderLikedMedia(content, item);

							var grid = create('div', 'detail-grid');
							var shownMediaTitle = mediaTitle(itemMedia(item));
							var directMediaTitle = mediaTitle(item.media);
							var activityMediaTitle = item.activity && item.activity.media ? mediaTitle(item.activity.media) : '';
							if (shownMediaTitle && sameText(directMediaTitle, shownMediaTitle)) directMediaTitle = '';
							if (shownMediaTitle && sameText(activityMediaTitle, shownMediaTitle)) activityMediaTitle = '';
							if (directMediaTitle && sameText(activityMediaTitle, directMediaTitle)) activityMediaTitle = '';
							var details = [
								detail('When', formatTime(item.createdAt)),
								detail('User', item.user && item.user.name ? '@' + item.user.name : ''),
								detail('Activity owner', activityOwner(item.activity) ? '@' + activityOwner(item.activity) : ''),
								detail('Reply by', reply && reply.user && reply.user.name ? '@' + reply.user.name : ''),
								detail('Media', directMediaTitle),
								detail('Activity media', activityMediaTitle),
								detail('Episode', item.episode),
								detail('Thread', item.thread && item.thread.title),
								detail('Like count', replyLikeCount !== undefined && replyLikeCount !== null ? replyLikeCount : commentLikeCount),
								detail('Reason', stripHtml(item.reason)),
								detail('Deleted title', item.deletedMediaTitle),
								detail('Merged titles', item.deletedMediaTitles && item.deletedMediaTitles.length ? item.deletedMediaTitles.join(', ') : '')
							].filter(Boolean);

							details.forEach(function(node) { grid.appendChild(node); });
							if (details.length) content.appendChild(grid);

							var likedText = likedContent(item);
							if (likedText) {
								content.appendChild(create('div', 'detail-label', likedContentLabel(item)));
								content.appendChild(create('div', 'quote', likedText));
							}

							var quoteText = stripHtml((item.message && item.message.message) || (item.activity && (item.activity.text || item.activity.message)) || (item.comment && item.comment.comment));
							if (quoteText) {
								if (!sameText(quoteText, likedText) && !sameText(quoteText, introText)) {
									content.appendChild(create('div', 'detail-label', 'Context'));
									content.appendChild(create('div', 'quote', quoteText));
								}
							}

							renderAllAniListData(content, item);
							body.appendChild(content);

							var actions = create('div', 'detail-sheet-actions');
							var media = itemMedia(item);
							var actionItems = uniqueActions([
								{ url: aniListUrl(item), label: 'Open on AniList', title: 'Open this notification on AniList', primary: true },
								{ url: mediaUrl(media), label: media && media.type === 'MANGA' ? 'Open manga' : 'Open anime', title: 'Open this title on AniList' }
							]);
							actionItems.forEach(function(action) {
								actions.appendChild(linkButton(action.url, action.primary ? 'btn btn-primary' : 'btn', 'external', action.label, action.title));
							});

							sheet.appendChild(head);
							sheet.appendChild(body);
							sheet.appendChild(actions);
							list.appendChild(sheet);
						}

						function renderState(root, title, message, showRetry) {
							var stateBox = create('div', 'state');
							stateBox.appendChild(create('h2', '', title));
							stateBox.appendChild(create('p', '', message));
							if (showRetry) {
								var retry = create('button', 'btn btn-primary');
								retry.type = 'button';
								retry.appendChild(iconNode('refresh'));
								retry.appendChild(document.createTextNode('Retry'));
								retry.onclick = function() { send('refresh'); };
								stateBox.appendChild(retry);
							}
							root.appendChild(stateBox);
						}

						function render() {
							var root = document.getElementById('app');
							root.textContent = '';
							renderHeader(root);
							if (state.error && state.notifications.length) {
								root.appendChild(create('div', 'error-banner', state.error));
							}

							if (state.loading && !state.notifications.length) {
								renderState(root, 'Loading notifications', 'Checking AniList for your latest updates.', false);
								return;
							}

							if (state.error && !state.notifications.length) {
								renderState(root, 'Could not load AniList notifications', state.error, true);
								return;
							}

							if (!state.notifications.length) {
								renderState(root, 'No notifications yet', 'AniList did not return any notifications right now.', true);
								return;
							}

							var list = create('div', 'list');
							state.notifications.forEach(function(item) {
								renderNotification(list, item);
								if (state.selectedId === item.id) {
									renderDetailSheet(list, item);
								}
							});
							root.appendChild(list);
						}

						function bindWebview() {
							if (!window.webview || typeof window.webview.on !== 'function') {
								state.error = 'Seanime webview bridge is not available yet.';
								render();
								return;
							}

							window.webview.on('notifications', function(value) {
								state.notifications = Array.isArray(value) ? value : [];
								render();
							});
							window.webview.on('unreadCount', function(value) {
								state.unreadCount = Number(value || 0);
								render();
							});
							window.webview.on('loading', function(value) {
								state.loading = !!value;
								render();
							});
							window.webview.on('error', function(value) {
								state.error = value || null;
								render();
							});
							window.webview.on('lastUpdated', function(value) {
								state.lastUpdated = value || '';
								render();
							});

							send('refresh');
						}

						render();
						bindWebview();
					})();
				</script>
			</body>
			</html>
		`);

		fetchNotifications(false);
	});
}
