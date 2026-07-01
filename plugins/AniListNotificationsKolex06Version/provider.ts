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
		const sidebarIcon = `<span data-anilist-notifications-icon="true" style="position:relative;display:inline-flex;width:24px;height:24px;min-width:24px;min-height:24px;align-items:center;justify-content:center;vertical-align:middle;color:currentColor;overflow:visible"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 6.2-2.6 8.2-3.2 8.7a.7.7 0 0 0 .4 1.3h17.6a.7.7 0 0 0 .4-1.3C20.6 16.2 18 14.2 18 8Z"></path><path d="M10 21h4"></path></svg></span>`;

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
		const unreadCountLabel = ctx.state<string>("0");
		const loading = ctx.state<boolean>(false);
		const loadingMore = ctx.state<boolean>(false);
		const hasNextPage = ctx.state<boolean>(false);
		const currentPage = ctx.state<number>(1);
		const error = ctx.state<string | null>(null);
		const lastUpdated = ctx.state<string>("");
		let hasLoadedNotifications = false;
		const seenNotificationIds = new Set<number>();
		let activePopupId = 0;
		let activePopupPayload: Record<string, any> | null = null;

		webview.channel.sync("notifications", notifications);
		webview.channel.sync("unreadCount", unreadCount);
		webview.channel.sync("unreadCountLabel", unreadCountLabel);
		webview.channel.sync("loading", loading);
		webview.channel.sync("loadingMore", loadingMore);
		webview.channel.sync("hasNextPage", hasNextPage);
		webview.channel.sync("currentPage", currentPage);
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

		let aniListRateLimitedUntil = 0;

		function aniListRateLimitMessage() {
			const seconds = Math.max(1, Math.ceil((aniListRateLimitedUntil - Date.now()) / 1000));
			return `AniList rate limited requests. Wait about ${seconds}s before refreshing or loading more notifications.`;
		}

		function isAniListRateLimited() {
			return Date.now() < aniListRateLimitedUntil;
		}

		function noteAniListRateLimit(res: any) {
			let waitMs = 90 * 1000;

			try {
				const retryAfter = Number(res?.headers?.get?.("Retry-After") || 0);
				if (retryAfter > 0) waitMs = retryAfter * 1000;
			} catch (_) {}

			try {
				const resetAt = Number(res?.headers?.get?.("X-RateLimit-Reset") || 0);
				if (resetAt > 0) waitMs = Math.max(waitMs, (resetAt * 1000) - Date.now());
			} catch (_) {}

			aniListRateLimitedUntil = Math.max(aniListRateLimitedUntil, Date.now() + Math.max(waitMs, 30 * 1000));
			return aniListRateLimitMessage();
		}

		async function anilistFetch(query: string, variables: Record<string, any> = {}) {
			if (isAniListRateLimited()) {
				throw new Error(aniListRateLimitMessage());
			}

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
				if (res.status === 429) {
					throw new Error(noteAniListRateLimit(res));
				}

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
					pageInfo {
						currentPage
						hasNextPage
					}
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

		const MARK_NOTIFICATIONS_READ = `
			query {
				Page(page: 1, perPage: 1) {
					notifications(resetNotificationCount: true) {
						... on AiringNotification { id }
						... on FollowingNotification { id }
						... on ActivityMessageNotification { id }
						... on ActivityMentionNotification { id }
						... on ActivityReplyNotification { id }
						... on ActivityReplySubscribedNotification { id }
						... on ActivityLikeNotification { id }
						... on ActivityReplyLikeNotification { id }
						... on ThreadCommentMentionNotification { id }
						... on ThreadCommentReplyNotification { id }
						... on ThreadCommentSubscribedNotification { id }
						... on ThreadCommentLikeNotification { id }
						... on ThreadLikeNotification { id }
						... on RelatedMediaAdditionNotification { id }
						... on MediaDataChangeNotification { id }
						... on MediaMergeNotification { id }
						... on MediaDeletionNotification { id }
						... on MediaSubmissionUpdateNotification { id }
						... on StaffSubmissionUpdateNotification { id }
						... on CharacterSubmissionUpdateNotification { id }
					}
				}
			}
		`;

		const GET_NOTIFICATION_MARKERS = `
			query ($page: Int, $perPage: Int) {
				Page(page: $page, perPage: $perPage) {
					pageInfo {
						currentPage
						hasNextPage
					}
					notifications(resetNotificationCount: false) {
						__typename
						... on AiringNotification { id createdAt }
						... on FollowingNotification { id createdAt }
						... on ActivityMessageNotification { id createdAt }
						... on ActivityMentionNotification { id createdAt }
						... on ActivityReplyNotification { id createdAt }
						... on ActivityReplySubscribedNotification { id createdAt }
						... on ActivityLikeNotification { id createdAt }
						... on ActivityReplyLikeNotification { id createdAt }
						... on ThreadCommentMentionNotification { id createdAt }
						... on ThreadCommentReplyNotification { id createdAt }
						... on ThreadCommentSubscribedNotification { id createdAt }
						... on ThreadCommentLikeNotification { id createdAt }
						... on ThreadLikeNotification { id createdAt }
						... on RelatedMediaAdditionNotification { id createdAt }
						... on MediaDataChangeNotification { id createdAt }
						... on MediaMergeNotification { id createdAt }
						... on MediaDeletionNotification { id createdAt }
						... on MediaSubmissionUpdateNotification { id createdAt }
						... on StaffSubmissionUpdateNotification { id createdAt }
						... on CharacterSubmissionUpdateNotification { id createdAt }
					}
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

		const NOTIFICATIONS_PER_PAGE = 25;
		const PREFETCH_DETAIL_LIMIT = 4;
		const UNREAD_COUNT_SCAN_PAGE_LIMIT = 20;
		const READ_MARKER_STORAGE_KEY = "anilist-notifications-kolex06:read-marker";
		const loadingActivityIds = new Set<number>();
		const prefetchedActivityIds = new Set<number>();

		function plainText(value: any): string {
			return String(value || "")
				.replace(/<[^>]*>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
		}

		function shortText(value: any, max = 120): string {
			const text = plainText(value);
			return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
		}

		function titleCase(value: any): string {
			return String(value || "Notification")
				.replace(/_/g, " ")
				.toLowerCase()
				.replace(/\b\w/g, (char) => char.toUpperCase());
		}

		function mediaTitle(media: any): string {
			if (!media?.title) return "";
			return media.title.english || media.title.romaji || media.title.native || "";
		}

		function activitySummary(activity: any): string {
			if (!activity) return "";
			const text = plainText(activity.text || activity.message);
			if (text) return text;

			const title = mediaTitle(activity.media);
			if (title) return title;

			const parts = [activity.user?.name, activity.status, activity.progress].filter(Boolean).map(String);
			return parts.join(" ");
		}

		function notificationToastTitle(item: AniListNotification): string {
			const userName = item.user?.name || "";
			const title = mediaTitle(item.media);

			switch (item.type) {
				case "AIRING":
					return `Episode ${item.episode || "?"} aired`;
				case "FOLLOWING":
					return userName ? `${userName} followed you` : "New follower";
				case "ACTIVITY_MESSAGE":
					return userName ? `Message from ${userName}` : "New activity message";
				case "ACTIVITY_MENTION":
					return userName ? `${userName} mentioned you` : "You were mentioned";
				case "ACTIVITY_REPLY":
					return userName ? `${userName} replied to you` : "New activity reply";
				case "ACTIVITY_LIKE":
					return userName ? `${userName} liked your activity` : "Activity liked";
				case "ACTIVITY_REPLY_LIKE":
					return userName ? `${userName} liked your reply` : "Reply liked";
				case "ACTIVITY_REPLY_SUBSCRIBED":
					return "New reply on a subscribed activity";
				case "THREAD_COMMENT_MENTION":
					return userName ? `${userName} mentioned you in a thread` : "Thread mention";
				case "THREAD_COMMENT_REPLY":
					return userName ? `${userName} replied in a thread` : "Thread reply";
				case "THREAD_COMMENT_SUBSCRIBED":
					return "New comment in a subscribed thread";
				case "THREAD_COMMENT_LIKE":
					return userName ? `${userName} liked your thread comment` : "Thread comment liked";
				case "THREAD_LIKE":
					return userName ? `${userName} liked your thread` : "Thread liked";
				case "RELATED_MEDIA_ADDITION":
					return title ? `Related media added for ${title}` : "Related media added";
				case "MEDIA_DATA_CHANGE":
					return title ? `Media data changed for ${title}` : "Media data changed";
				case "MEDIA_MERGE":
					return title ? `Media merged into ${title}` : "Media merged";
				case "MEDIA_DELETION":
					return item.deletedMediaTitle ? `${item.deletedMediaTitle} was deleted` : "Media deleted";
				default:
					return title || titleCase(item.type);
			}
		}

		function notificationToastText(item: AniListNotification): string {
			return shortText(
				item.context ||
				item.message?.message ||
				item.activity?.text ||
				item.activity?.message ||
				activitySummary(item.activity) ||
				item.comment?.comment ||
				item.reason ||
				"",
			);
		}

		function notificationImage(item: AniListNotification): string {
			return item.user?.avatar?.large || item.user?.avatar?.medium ||
				item.media?.coverImage?.large || item.media?.coverImage?.medium ||
				item.activity?.media?.coverImage?.large || item.activity?.media?.coverImage?.medium ||
				"";
		}

		function popupPayload(item: AniListNotification, count: number) {
			const title = notificationToastTitle(item);
			const text = notificationToastText(item);
			return {
				id: Number(item.id || 0),
				title,
				text: text && text !== title ? text : "",
				image: notificationImage(item),
				count,
				type: titleCase(item.type),
			};
		}

		function escapeHtml(value: any): string {
			return String(value ?? "").replace(/[&<>"']/g, (char) => ({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			}[char] || char));
		}

		function popupInitials(value: any): string {
			return String(value || "AniList")
				.split(/\s+/)
				.filter(Boolean)
				.map((part) => part.charAt(0))
				.join("")
				.slice(0, 2)
				.toUpperCase() || "AL";
		}

		async function hideGlobalNotificationPopup() {
			activePopupId = 0;
			activePopupPayload = null;
			try {
				const root = await ctx.dom.queryOne('[data-anilist-notifications-global-popup="true"]');
				if (root) root.setStyle("display", "none");
			} catch (_) {}
		}

		async function clickNotificationsSidebarButton() {
			try {
				const body = await ctx.dom.queryOne("body");
				if (!body) return;

				const screenPath = String(webview.getScreenPath() || "");
				const script = await ctx.dom.createElement("script");
				script.setText(`
					(() => {
						const pluginId = 'AniList-Notifications-Kolex06-Version';
						const screenPath = ${JSON.stringify(screenPath)};

						function isVisible(element) {
							if (!element) return false;
							const style = window.getComputedStyle(element);
							const rect = element.getBoundingClientRect();
							return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
						}

						function clickableFrom(node) {
							if (!node || !node.closest) return null;
							return node.closest('a[href], button, [role="button"], [tabindex]');
						}

						const candidates = [];
						[
							document.querySelector('[data-anilist-notifications-icon="true"]'),
							document.querySelector('[data-anilist-notifications-badge="true"]'),
							document.querySelector('[data-anilist-notifications-dom-badge="true"]')
						].forEach(node => {
							const target = clickableFrom(node);
							if (target) candidates.push(target);
						});

						document.querySelectorAll('a[href], button, [role="button"], [tabindex]').forEach(element => {
							const href = String(element.getAttribute('href') || '');
							const label = String(element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '').trim();
							if (
								(screenPath && href.indexOf(screenPath) !== -1) ||
								href.indexOf(pluginId) !== -1 ||
								label === 'Notifications' ||
								label.indexOf('AniList Notifications') !== -1
							) {
								candidates.push(element);
							}
						});

						const target = candidates.find(isVisible);
						if (target && typeof target.click === 'function') target.click();
						if (document.currentScript && document.currentScript.remove) document.currentScript.remove();
					})();
				`);
				body.append(script);
			} catch (_) {}
		}

		function openGlobalNotificationPopup() {
			void hideGlobalNotificationPopup();
			void clickNotificationsSidebarButton();
		}

		async function ensureGlobalNotificationPopup() {
			const stopClosePopupEvent = (event: any, preventDefault = false) => {
				try {
					if (preventDefault) event?.preventDefault?.();
					event?.stopPropagation?.();
					event?.stopImmediatePropagation?.();
				} catch (_) {}
			};
			let root = await ctx.dom.queryOne('[data-anilist-notifications-global-popup="true"]');
			if (root) return root;

			const body = await ctx.dom.queryOne("body");
			if (!body) return null;

			root = await ctx.dom.createElement("div");
			root.setAttribute("data-anilist-notifications-global-popup", "true");
			root.setCssText([
				"position:fixed",
				"top:14px",
				"right:14px",
				"left:auto",
				"bottom:auto",
				"width:min(360px, calc(100vw - 28px))",
				"display:none",
				"background:transparent",
				"z-index:2147483000",
				"pointer-events:auto",
			].join(";"));

			const card = await ctx.dom.createElement("div");
			card.setAttribute("data-anilist-notifications-global-card", "true");
			card.setCssText([
				"appearance:none",
				"-webkit-appearance:none",
				"width:100%",
				"min-height:112px",
				"display:grid",
				"grid-template-columns:minmax(0,1fr) 30px",
				"gap:12px",
				"align-items:start",
				"padding:13px",
				"border:1px solid rgba(226,232,240,.22)",
				"border-radius:8px",
				"background:rgba(24,36,56,.96)",
				"box-shadow:0 18px 46px rgba(0,0,0,.34)",
				"color:#f8fafc",
				"font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
				"text-align:left",
				"backdrop-filter:blur(16px)",
			].join(";"));

			const openArea = await ctx.dom.createElement("div");
			openArea.setAttribute("role", "button");
			openArea.setAttribute("tabindex", "0");
			openArea.setAttribute("data-anilist-notifications-global-open", "true");
			openArea.setCssText([
				"min-width:0",
				"display:grid",
				"grid-template-columns:48px minmax(0,1fr)",
				"gap:12px",
				"align-items:start",
				"cursor:pointer",
			].join(";"));
			openArea.addEventListener("click", openGlobalNotificationPopup);
			openArea.addEventListener("keydown", (event: any) => {
				const key = String(event?.key || "");
				if (key !== "Enter" && key !== " ") return;
				try {
					event?.preventDefault?.();
				} catch (_) {}
				openGlobalNotificationPopup();
			});

			const image = await ctx.dom.createElement("div");
			image.setAttribute("data-anilist-notifications-global-image", "true");
			image.setCssText([
				"width:48px",
				"height:48px",
				"display:inline-flex",
				"align-items:center",
				"justify-content:center",
				"overflow:hidden",
				"border-radius:8px",
				"background:rgba(2,169,255,.18)",
				"color:#7dd3fc",
				"font-weight:900",
				"font-size:14px",
				"line-height:1",
			].join(";"));

			const copy = await ctx.dom.createElement("div");
			copy.setCssText("min-width:0");

			const kicker = await ctx.dom.createElement("div");
			kicker.setAttribute("data-anilist-notifications-global-kicker", "true");
			kicker.setCssText("margin-bottom:4px;color:#7dd3fc;font-size:11px;font-weight:900;text-transform:uppercase;line-height:1.1");

			const title = await ctx.dom.createElement("div");
			title.setAttribute("data-anilist-notifications-global-title", "true");
			title.setCssText("margin:0;color:#f8fafc;font-size:15px;font-weight:900;line-height:1.22;word-break:break-word");

			const text = await ctx.dom.createElement("div");
			text.setAttribute("data-anilist-notifications-global-text", "true");
			text.setCssText("display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:5px;color:#cbd5e1;font-size:13px;line-height:1.28;word-break:break-word");

			const more = await ctx.dom.createElement("div");
			more.setAttribute("data-anilist-notifications-global-more", "true");
			more.setCssText("display:none;margin-top:6px;color:#94a3b8;font-size:11px;font-weight:800");

			const close = await ctx.dom.createElement("button");
			close.setAttribute("type", "button");
			close.setAttribute("aria-label", "Close AniList notification popup");
			close.setAttribute("title", "Close");
			close.setAttribute("data-anilist-notifications-global-close", "true");
			close.setText("x");
			const setCloseStyle = (state: "idle" | "hover" | "active") => {
				const hover = state === "hover";
				const active = state === "active";
				close.setCssText([
					"appearance:none",
					"-webkit-appearance:none",
					"width:28px",
					"height:28px",
					"display:inline-flex",
					"align-items:center",
					"justify-content:center",
					`border:1px solid ${hover || active ? "rgba(125,211,252,.95)" : "rgba(226,232,240,.18)"}`,
					"border-radius:8px",
					`background:${active ? "rgba(14,165,233,.98)" : hover ? "rgba(125,211,252,.24)" : "rgba(255,255,255,.06)"}`,
					`color:${active ? "#00111d" : "#f8fafc"}`,
					"font-size:14px",
					"font-weight:900",
					"line-height:1",
					"cursor:pointer",
					"position:relative",
					"z-index:2",
					`box-shadow:${hover || active ? "0 0 0 3px rgba(14,165,233,.18)" : "none"}`,
					"transform:none",
				].join(";"));
			};
			setCloseStyle("idle");
			close.addEventListener("mouseenter", () => setCloseStyle("hover"));
			close.addEventListener("mouseleave", () => setCloseStyle("idle"));
			close.addEventListener("focus", () => setCloseStyle("hover"));
			close.addEventListener("blur", () => setCloseStyle("idle"));
			close.addEventListener("pointerdown", (event: any) => {
				stopClosePopupEvent(event);
				setCloseStyle("active");
			});
			close.addEventListener("pointerup", (event: any) => {
				stopClosePopupEvent(event, true);
				setCloseStyle("hover");
				void hideGlobalNotificationPopup();
			});
			close.addEventListener("mousedown", (event: any) => {
				stopClosePopupEvent(event);
				setCloseStyle("active");
			});
			close.addEventListener("mouseup", (event: any) => {
				stopClosePopupEvent(event, true);
				setCloseStyle("hover");
				void hideGlobalNotificationPopup();
			});
			close.addEventListener("keydown", (event: any) => {
				const key = String(event?.key || "");
				if (key !== "Enter" && key !== " ") return;
				stopClosePopupEvent(event, true);
				void hideGlobalNotificationPopup();
			});
			close.addEventListener("click", (event: any) => {
				stopClosePopupEvent(event, true);
				void hideGlobalNotificationPopup();
			});

			copy.append(kicker);
			copy.append(title);
			copy.append(text);
			copy.append(more);
			openArea.append(image);
			openArea.append(copy);
			card.append(openArea);
			card.append(close);
			root.append(card);
			body.append(root);
			return root;
		}

		async function showGlobalNotificationPopup(payload: Record<string, any>) {
			activePopupId = Number(payload.id || 0);
			activePopupPayload = payload;

			try {
				const root = await ensureGlobalNotificationPopup();
				if (!root) return;

				const image = await root.queryOne('[data-anilist-notifications-global-image="true"]');
				const kicker = await root.queryOne('[data-anilist-notifications-global-kicker="true"]');
				const title = await root.queryOne('[data-anilist-notifications-global-title="true"]');
				const text = await root.queryOne('[data-anilist-notifications-global-text="true"]');
				const more = await root.queryOne('[data-anilist-notifications-global-more="true"]');

				if (image) {
					if (payload.image) {
						image.setInnerHTML(`<img src="${escapeHtml(payload.image)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`);
					} else {
						image.setText(popupInitials(payload.title));
					}
				}
				if (kicker) kicker.setText(payload.type || "AniList");
				if (title) title.setText(payload.title || "AniList notification");
				if (text) {
					text.setText(payload.text || "");
					text.setStyle("display", payload.text ? "-webkit-box" : "none");
				}
				if (more) {
					const extra = Math.max(0, Number(payload.count || 0) - 1);
					more.setText(extra > 0 ? `+${extra} more` : "");
					more.setStyle("display", extra > 0 ? "block" : "none");
				}
				root.setStyle("display", "block");
			} catch (_) {}
		}

		async function updateSidebarBadge(count = unreadCount.get(), displayLabel = unreadCountLabel.get()) {
			const unread = Math.max(0, Number(count || 0));
			const label = String(displayLabel || "").indexOf("+") !== -1 || unread > 99 ? "99+" : String(unread);

			try {
				const badges = await ctx.dom.query('[data-anilist-notifications-badge="true"]');
				for (const badge of badges) {
					badge.setText("");
					badge.setStyle("display", "none");
					badge.setAttribute("aria-label", unread > 0 ? `${unread} unread AniList notifications` : "No unread AniList notifications");
				}
			} catch (_) {}

			try {
				const screenPath = webview.getScreenPath();
				const selectors = [
					`a[href="${screenPath}"]`,
					`a[href*="AniList-Notifications-Kolex06-Version"]`,
					`button[aria-label="Notifications"]`,
					`[title="Notifications"]`,
				].join(",");
				const targets = await ctx.dom.query(selectors);
				for (const target of targets) {
					target.setStyle("position", "relative");
					target.setStyle("overflow", "visible");

					let badge = await target.queryOne('[data-anilist-notifications-dom-badge="true"]');
					if (!badge) {
						badge = await ctx.dom.createElement("span");
						badge.setAttribute("data-anilist-notifications-dom-badge", "true");
						target.append(badge);
					}

					badge.setText(label);
					badge.setCssText([
						"position:absolute",
						"top:-4px",
						"right:-6px",
						"display:" + (unread > 0 ? "inline-flex" : "none"),
						"width:30px",
						"min-width:30px",
						"max-width:none",
						"height:18px",
						"padding:0 4px",
						"box-sizing:border-box",
						"align-items:center",
						"justify-content:center",
						"border-radius:999px",
						"background:#f8fafc",
						"color:#0f172a",
						"border:1px solid rgba(15,23,42,.35)",
						"font-size:9px",
						"font-weight:900",
						"line-height:18px",
						"white-space:nowrap",
						"overflow:visible",
						"text-overflow:clip",
						"z-index:50",
						"box-shadow:0 2px 8px rgba(0,0,0,.35)",
						"pointer-events:none",
					].join(";"));
					badge.setAttribute("aria-label", unread > 0 ? `${unread} unread AniList notifications` : "No unread AniList notifications");
				}
			} catch (_) {}

			try {
				const body = await ctx.dom.queryOne("body");
				if (!body) return;

				const screenPath = String(webview.getScreenPath() || "");
				const script = await ctx.dom.createElement("script");
				script.setText(`
					(() => {
						const unread = ${JSON.stringify(unread)};
						const label = ${JSON.stringify(label)};
						const pluginId = 'AniList-Notifications-Kolex06-Version';
						const screenPath = ${JSON.stringify(screenPath)};
						const aria = unread > 0 ? unread + ' unread AniList notifications' : 'No unread AniList notifications';

						document.querySelectorAll('[data-anilist-notifications-badge="true"]').forEach(badge => {
							badge.textContent = '';
							badge.style.display = 'none';
							badge.setAttribute('aria-label', aria);
						});

						function clickableFrom(node) {
							return node && node.closest ? node.closest('a[href], button, [role="button"], [tabindex]') : null;
						}

						function forceBadgeRoom(node) {
							for (let current = node, depth = 0; current && depth < 5; current = current.parentElement, depth += 1) {
								current.style.setProperty('overflow', 'visible', 'important');
							}
						}

						function setImportantStyles(node, styles) {
							Object.keys(styles).forEach(name => {
								node.style.setProperty(name, styles[name], 'important');
							});
						}

						const targets = [];
						document.querySelectorAll('[data-anilist-notifications-icon="true"], [data-anilist-notifications-dom-badge="true"]').forEach(node => {
							const target = clickableFrom(node);
							if (target) targets.push(target);
						});

						document.querySelectorAll('a[href], button, [role="button"], [tabindex]').forEach(element => {
							const href = String(element.getAttribute('href') || '');
							const text = String(element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '').trim();
							if (
								(screenPath && href.indexOf(screenPath) !== -1) ||
								href.indexOf(pluginId) !== -1 ||
								text === 'Notifications' ||
								text.indexOf('AniList Notifications') !== -1
							) {
								targets.push(element);
							}
						});

						const seen = new Set();
						targets.forEach(target => {
							if (!target || seen.has(target)) return;
							seen.add(target);
							target.style.setProperty('position', 'relative', 'important');
							target.style.setProperty('overflow', 'visible', 'important');
							forceBadgeRoom(target);
							const icon = target.querySelector('[data-anilist-notifications-icon="true"]');
							if (icon) {
								icon.style.setProperty('position', 'relative', 'important');
								icon.style.setProperty('overflow', 'visible', 'important');
								forceBadgeRoom(icon);
							}

							let badge = target.querySelector('[data-anilist-notifications-dom-badge="true"]');
							if (!badge) {
								badge = document.createElement('span');
								badge.setAttribute('data-anilist-notifications-dom-badge', 'true');
								target.appendChild(badge);
							}

							badge.textContent = unread > 0 ? label : '';
							badge.setAttribute('aria-label', aria);
							badge.style.position = 'absolute';
							badge.style.top = '-4px';
							badge.style.right = '-6px';
							badge.style.display = unread > 0 ? 'inline-flex' : 'none';
							badge.style.width = '30px';
							badge.style.minWidth = '30px';
							badge.style.maxWidth = 'none';
							badge.style.height = '18px';
							badge.style.padding = '0 4px';
							badge.style.boxSizing = 'border-box';
							badge.style.alignItems = 'center';
							badge.style.justifyContent = 'center';
							badge.style.borderRadius = '999px';
							badge.style.background = '#f8fafc';
							badge.style.color = '#0f172a';
							badge.style.border = '1px solid rgba(15,23,42,.35)';
							badge.style.fontSize = '9px';
							badge.style.fontWeight = '900';
							badge.style.lineHeight = '18px';
							badge.style.whiteSpace = 'nowrap';
							badge.style.overflow = 'visible';
							badge.style.textOverflow = 'clip';
							badge.style.zIndex = '50';
							badge.style.boxShadow = '0 2px 8px rgba(0,0,0,.35)';
							badge.style.pointerEvents = 'none';
							setImportantStyles(badge, {
								position: 'absolute',
								top: '-4px',
								right: '-6px',
								display: unread > 0 ? 'inline-flex' : 'none',
								width: '30px',
								minWidth: '30px',
								maxWidth: 'none',
								height: '18px',
								padding: '0 4px',
								boxSizing: 'border-box',
								alignItems: 'center',
								justifyContent: 'center',
								borderRadius: '999px',
								background: '#f8fafc',
								color: '#0f172a',
								border: '1px solid rgba(15,23,42,.35)',
								fontSize: '9px',
								fontWeight: '900',
								lineHeight: '18px',
								letterSpacing: '0',
								whiteSpace: 'nowrap',
								overflow: 'visible',
								textOverflow: 'clip',
								zIndex: '50',
								boxShadow: '0 2px 8px rgba(0,0,0,.35)',
								pointerEvents: 'none'
							});
						});

						if (unread <= 0) {
							document.querySelectorAll('[data-anilist-notifications-dom-badge="true"]').forEach(badge => {
								badge.textContent = '';
								badge.style.display = 'none';
								badge.setAttribute('aria-label', aria);
							});
						}

						if (document.currentScript && document.currentScript.remove) document.currentScript.remove();
					})();
				`);
				body.append(script);
			} catch (_) {}
		}

		function rememberNotifications(items: AniListNotification[]) {
			for (const item of items) {
				const id = Number(item?.id || 0);
				if (id) seenNotificationIds.add(id);
			}
		}

		function newUnreadNotifications(items: AniListNotification[], resetNotificationCount: boolean, append: boolean) {
			if (resetNotificationCount || append) return [];
			return items.filter((item) => item.unread && (!hasLoadedNotifications || !seenNotificationIds.has(Number(item.id || 0)))).slice(0, 3);
		}

		function showNewNotificationPopup(items: AniListNotification[]) {
			if (!items.length) return;
			void showGlobalNotificationPopup(popupPayload(items[0], items.length));
		}

		function notificationGlobalIndex(page: number, index: number): number {
			return Math.max(0, (Number(page || 1) - 1) * NOTIFICATIONS_PER_PAGE + index);
		}

		function readableUnreadCount(apiUnread: any, resetNotificationCount: boolean): number {
			if (resetNotificationCount) return 0;
			return Math.max(0, Number(apiUnread || 0));
		}

		function unreadDisplayLabel(count: number, capped = false): string {
			const unread = Math.max(0, Number(count || 0));
			return capped || unread >= 99 ? "99+" : String(unread);
		}

		function exactUnreadDisplayLabel(count: number): string {
			return String(Math.max(0, Number(count || 0)));
		}

		function setUnreadCount(count: number, label?: string) {
			const unread = Math.max(0, Number(count || 0));
			unreadCount.set(unread);
			unreadCountLabel.set(label || exactUnreadDisplayLabel(unread));
			void updateSidebarBadge(unread, label);
		}

		type ReadMarker = {
			createdAt: number;
			id: number;
		};

		function notificationMarker(item: AniListNotification | null | undefined): ReadMarker | null {
			const createdAt = Math.max(0, Number(item?.createdAt || 0));
			const id = Math.max(0, Number(item?.id || 0));
			if (!createdAt && !id) return null;
			return { createdAt, id };
		}

		function newestNotificationMarker(items: AniListNotification[]): ReadMarker | null {
			let marker: ReadMarker | null = null;
			for (const item of items || []) {
				const current = notificationMarker(item);
				if (!current) continue;
				if (!marker || current.createdAt > marker.createdAt || (current.createdAt === marker.createdAt && current.id > marker.id)) {
					marker = current;
				}
			}
			return marker;
		}

		function readStoredReadMarker(): ReadMarker | null {
			try {
				const value = $storage.get<ReadMarker>(READ_MARKER_STORAGE_KEY);
				return notificationMarker(value as any);
			} catch (_) {
				return null;
			}
		}

		function saveReadMarker(marker: ReadMarker | null) {
			if (!marker) return;
			try {
				$storage.set(READ_MARKER_STORAGE_KEY, marker);
			} catch (_) {}
		}

		function saveNewestNotificationAsReadMarker(items: AniListNotification[]) {
			saveReadMarker(newestNotificationMarker(items));
		}

		function isNewerThanReadMarker(item: AniListNotification, marker: ReadMarker): boolean {
			const current = notificationMarker(item);
			if (!current) return false;
			return current.createdAt > marker.createdAt || (current.createdAt === marker.createdAt && current.id > marker.id);
		}

		function countUnreadOnPage(items: AniListNotification[], marker: ReadMarker): { count: number; done: boolean } {
			let count = 0;
			for (const item of items || []) {
				if (isNewerThanReadMarker(item, marker)) {
					count += 1;
					continue;
				}
				return { count, done: true };
			}
			return { count, done: false };
		}

		async function countUnreadFromStoredReadMarker(firstItems: AniListNotification[], firstPageInfo: any): Promise<number | null> {
			const marker = readStoredReadMarker();
			if (!marker) return null;

			let total = 0;
			let page = 1;
			let pageInfo = firstPageInfo || {};
			let items = firstItems || [];

			while (page <= UNREAD_COUNT_SCAN_PAGE_LIMIT) {
				const counted = countUnreadOnPage(items, marker);
				total += counted.count;
				if (counted.done || !pageInfo?.hasNextPage) return total;

				page += 1;
				if (isAniListRateLimited()) return null;

				const data = await anilistFetch(GET_NOTIFICATION_MARKERS, {
					page,
					perPage: NOTIFICATIONS_PER_PAGE,
				});
				items = data?.Page?.notifications || [];
				pageInfo = data?.Page?.pageInfo || {};
			}

			return null;
		}

		function shouldPrefetchActivityDetail(item: AniListNotification): boolean {
			if (!item || !item.activityId) return false;
			const type = String(item.type || "");
			if (type.indexOf("ACTIVITY_") !== 0) return false;
			if (!item.activity) return true;
			if (!item.activity.siteUrl) return true;
			if ((type === "ACTIVITY_REPLY" || type === "ACTIVITY_REPLY_SUBSCRIBED" || type === "ACTIVITY_REPLY_LIKE") && !Array.isArray(item.activity.replies)) return true;
			if ((item.activity.status || item.activity.progress) && !item.activity.media) return true;
			if (type === "ACTIVITY_LIKE" && !item.activity.media && !item.activity.text && !item.activity.message) return true;
			if (type.indexOf("LIKE") !== -1 && !item.activity.media && !item.activity.text && !item.activity.message) return true;
			return false;
		}

		function mergeNotifications(existing: AniListNotification[], incoming: AniListNotification[]) {
			const byId = new Map<number, AniListNotification>();
			for (const item of existing) byId.set(Number(item.id), item);

			for (const item of incoming) {
				const id = Number(item.id);
				const current = byId.get(id);
				byId.set(id, current ? {
					...item,
					activity: {
						...(item.activity || {}),
						...(current.activity || {}),
					},
					unread: current.unread,
				} : item);
			}

			return Array.from(byId.values()).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
		}

		async function prefetchActivityDetails(items: AniListNotification[]) {
			if (isAniListRateLimited()) return;
			let loaded = 0;
			for (const item of items) {
				const id = Number(item.activityId || 0);
				if (!id || loadingActivityIds.has(id) || prefetchedActivityIds.has(id) || !shouldPrefetchActivityDetail(item)) continue;

				loadingActivityIds.add(id);
				try {
					await loadActivityDetail(id, true);
					prefetchedActivityIds.add(id);
				} finally {
					loadingActivityIds.delete(id);
				}

				loaded += 1;
				if (loaded >= PREFETCH_DETAIL_LIMIT || isAniListRateLimited()) break;
			}
		}

		async function fetchNotifications(resetNotificationCount = false, page = 1, append = false) {
			if (append ? loadingMore.get() : loading.get()) return;
			if (isAniListRateLimited()) {
				error.set(aniListRateLimitMessage());
				return;
			}

			try {
				if (append) {
					loadingMore.set(true);
				} else {
					loading.set(true);
				}
				error.set(null);

				const data = await anilistFetch(GET_NOTIFICATIONS, {
					page,
					perPage: NOTIFICATIONS_PER_PAGE,
					resetNotificationCount,
				});

				const pageInfo = data?.Page?.pageInfo || {};
				const rawUnread = resetNotificationCount ? 0 : Number(data?.Viewer?.unreadNotificationCount || 0);
				const viewerId = Number(data?.Viewer?.id || 0);
				const viewerName = data?.Viewer?.name || "";
				let items = (data?.Page?.notifications || []).map((item: AniListNotification, index: number) => ({
					...item,
					viewerId,
					viewerName,
					unread: notificationGlobalIndex(page, index) < readableUnreadCount(rawUnread, resetNotificationCount),
				}));
				let unread = append ? unreadCount.get() : readableUnreadCount(rawUnread, resetNotificationCount);
				let unreadLabel = append ? unreadCountLabel.get() : (unread >= 99 && !resetNotificationCount ? unreadDisplayLabel(unread, true) : exactUnreadDisplayLabel(unread));

				if (!append && !resetNotificationCount && rawUnread >= 99) {
					const trackedUnread = await countUnreadFromStoredReadMarker(items, pageInfo);
					if (trackedUnread !== null) {
						unread = trackedUnread;
						unreadLabel = exactUnreadDisplayLabel(trackedUnread);
					}
				}
				items = items.map((item: AniListNotification, index: number) => ({
					...item,
					unread: notificationGlobalIndex(page, index) < unread,
				}));
				if (!append && (resetNotificationCount || unread <= 0)) {
					saveNewestNotificationAsReadMarker(items);
				}
				const toastItems = newUnreadNotifications(items, resetNotificationCount, append);

				notifications.set(append ? mergeNotifications(notifications.get(), items) : items);
				setUnreadCount(unread, unreadLabel);
				hasNextPage.set(!!pageInfo.hasNextPage);
				currentPage.set(Number(pageInfo.currentPage || page || 1));
				lastUpdated.set(new Date().toLocaleString());
				showNewNotificationPopup(toastItems);
				rememberNotifications(items);
				hasLoadedNotifications = true;
				void prefetchActivityDetails(items);
			} catch (err: any) {
				error.set(err?.message || "Failed to fetch AniList notifications");
			} finally {
				if (append) {
					loadingMore.set(false);
				} else {
					loading.set(false);
				}
			}
		}

		async function loadActivityDetail(activityId: number, quiet = false) {
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
				if (!quiet) error.set(err?.message || "Failed to load AniList activity details");
			}
		}

		function markLocalRead(id: number) {
			const current = notifications.get();
			const target = current.find((item) => item.id === id);
			if (!target || !target.unread) return false;

			notifications.set(current.map((item) => (item.id === id ? { ...item, unread: false } : item)));
			const nextUnread = Math.max(0, unreadCount.get() - 1);
			const previousLabel = String(unreadCountLabel.get() || "");
			setUnreadCount(nextUnread, previousLabel.indexOf("+") !== -1 && nextUnread >= 99 ? "99+" : exactUnreadDisplayLabel(nextUnread));
			return true;
		}

		function markAllLocalRead() {
			const current = notifications.get();
			if (!current.length && unreadCount.get() <= 0) return;

			saveNewestNotificationAsReadMarker(current);
			notifications.set(current.map((item) => ({ ...item, unread: false })));
			setUnreadCount(0, "0");
		}

		async function markNotificationRead(id: number) {
			const changed = markLocalRead(id);
			if (!changed) return;

			try {
				await anilistFetch(MARK_NOTIFICATIONS_READ);
				markAllLocalRead();
			} catch (err: any) {
				error.set(err?.message || "Opened locally, but AniList could not mark notifications as read.");
			}
		}

		ctx.dom.onReady(() => {
			void updateSidebarBadge(unreadCount.get());
		});
		ctx.screen.onNavigate(() => {
			void updateSidebarBadge(unreadCount.get());
			if (activePopupPayload) void showGlobalNotificationPopup(activePopupPayload);
		});

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

		function openSeanimeMedia(value: any) {
			const mediaId = Number(value?.id);
			if (!Number.isFinite(mediaId) || mediaId <= 0) return;

			const type = String(value?.type || "").toUpperCase();
			const path = type === "MANGA" ? "/manga/entry" : "/entry";

			try {
				ctx.screen.navigateTo(path, { id: String(mediaId) });
			} catch (err: any) {
				error.set(err?.message || "Could not open this title in Seanime.");
			}
		}

		webview.channel.on("refresh", () => fetchNotifications(false));
		webview.channel.on("mark-all-read", () => fetchNotifications(true));
		webview.channel.on("load-more", () => {
			if (!hasNextPage.get()) return;
			fetchNotifications(false, currentPage.get() + 1, true);
		});
		webview.channel.on("mark-read-local", (id: number) => void markNotificationRead(Number(id)));
		webview.channel.on("load-activity-detail", (activityId: number) => loadActivityDetail(Number(activityId)));
		webview.channel.on("open-url", (url: string) => openAniListUrl(url));
		webview.channel.on("open-seanime-media", (value: any) => openSeanimeMedia(value));

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

					.card-rich {
						margin-top: 9px;
					}

					.card-rich.media-only {
						width: fit-content;
						max-width: 100%;
					}

					.card-rich:empty,
					.rich-content:empty,
					.rich-media:empty {
						display: none;
					}

					.card-rich .rich-content {
						gap: 8px;
					}

					.card-rich .rich-content-text {
						display: -webkit-box;
						-webkit-line-clamp: 3;
						-webkit-box-orient: vertical;
						overflow: hidden;
						color: var(--muted);
						font-size: 1.04rem;
					}

					.card-rich .rich-media img,
					.card-rich .rich-media video {
						max-width: min(100%, 340px);
						max-height: 210px;
					}

					.card-rich .rich-media {
						max-width: min(100%, 340px);
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

					.media-pill.seanime-media-link,
					.liked-media.seanime-media-link {
						cursor: pointer;
						transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
					}

					.media-pill.seanime-media-link:hover,
					.media-pill.seanime-media-link:focus-visible,
					.liked-media.seanime-media-link:hover,
					.liked-media.seanime-media-link:focus-visible {
						border-color: rgba(125, 211, 252, 0.72);
						background: rgba(2, 169, 255, 0.22);
						outline: none;
						transform: translateY(-1px);
					}

					.media-pill.seanime-media-link:focus-visible,
					.liked-media.seanime-media-link:focus-visible {
						box-shadow: 0 0 0 2px rgba(125, 211, 252, 0.32);
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

					.content-box {
						margin: 14px 0;
						padding: 12px;
						border: 1px solid rgba(125, 211, 252, 0.26);
						border-radius: 8px;
						background: rgba(15, 23, 42, 0.34);
					}

					.content-box.media-only {
						display: inline-block;
						width: auto;
						max-width: 100%;
						padding: 0;
						border: 0;
						background: transparent;
					}

					.content-box .detail-label {
						margin-bottom: 8px;
					}

					.content-box .quote {
						margin: 0;
						background: rgba(2, 169, 255, 0.12);
					}

					.content-box.media-only .detail-label {
						display: none;
					}

					.content-box.media-only .quote,
					.quote.media-only {
						display: inline-block;
						width: auto;
						max-width: 100%;
						padding: 0;
						border-left: 0;
						background: transparent;
					}

					.rich-content {
						display: flex;
						flex-direction: column;
						gap: 10px;
					}

					.rich-content.media-only {
						align-items: flex-start;
						width: fit-content;
						max-width: 100%;
					}

					.rich-content-text {
						white-space: pre-wrap;
						overflow-wrap: anywhere;
					}

					.rich-media {
						display: block;
						align-self: flex-start;
						width: max-content;
						max-width: min(100%, 420px);
						flex: 0 1 auto;
						line-height: 0;
						box-sizing: content-box;
						overflow: hidden;
						border: 1px solid rgba(125, 211, 252, 0.24);
						border-radius: 8px;
						background: rgba(15, 23, 42, 0.45);
						box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
					}

					.rich-media img,
					.rich-media video {
						display: block;
						width: auto;
						height: auto;
						max-width: 100%;
						max-height: 380px;
						object-fit: contain;
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

					.load-more-row {
						display: flex;
						justify-content: center;
						padding: 6px 0 2px;
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
							unreadCountLabel: "0",
							loading: false,
							loadingMore: false,
							hasNextPage: false,
							currentPage: 1,
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

						function safeMediaEmbedUrl(value) {
							var url = String(value || '').trim().replace(/^<|>$/g, '');
							if (/^\\/\\//.test(url)) url = 'https:' + url;
							if (!/^https?:\\/\\//i.test(url)) return '';
							try {
								var parsed = new URL(url, window.location.href);
								if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
								return parsed.href;
							} catch (_) {
								return '';
							}
						}

						function imageUrlForDisplay(url) {
							return String(url || '').replace(/\\.gifv(?=($|[?#]))/i, '.gif');
						}

						function isVideoEmbedUrl(url) {
							return /\\.(?:mp4|webm|mov|m4v|ogv)(?:$|[?#])/i.test(String(url || ''));
						}

						function pushMediaPart(parts, seenMedia, value) {
							var safe = safeMediaEmbedUrl(value);
							if (!safe || seenMedia[safe]) return;
							seenMedia[safe] = true;
							parts.push({ type: 'media', url: safe });
						}

						function richTextParts(value) {
							var html = String(value || '');
							var imageUrls = [];
							html.replace(/<img\\b[^>]*\\bsrc=["']?([^"'\\s>]+)["']?[^>]*>/ig, function(_, url) {
								var safe = safeMediaEmbedUrl(url);
								if (safe) imageUrls.push(safe);
								return '';
							});
							html.replace(/<(?:video|source)\\b[^>]*\\bsrc=["']?([^"'\\s>]+)["']?[^>]*>/ig, function(_, url) {
								var safe = safeMediaEmbedUrl(url);
								if (safe) imageUrls.push(safe);
								return '';
							});

							var text = stripHtml(html);
							var parts = [];
							var seenMedia = {};
							var mediaMacro = '(?:img|image|ing|pic|gif)(?:\\\\d+%?|%)?\\\\s*\\\\(\\\\s*([^)]*?)\\\\s*\\\\)';
							var pattern = new RegExp(mediaMacro + '|!\\\\[[^\\\\]]*\\\\]\\\\(\\\\s*([^)]+?)\\\\s*\\\\)|(https?:\\\\/\\\\/[^\\\\s)]+\\\\.(?:png|apng|jpe?g|gif|gifv|webp|avif|svg|bmp|mp4|webm|mov|m4v|ogv)(?:\\\\?[^\\\\s)]*)?)', 'ig');
							var lastIndex = 0;
							var match;
							while ((match = pattern.exec(text)) !== null) {
								var before = text.slice(lastIndex, match.index);
								if (before.trim()) parts.push({ type: 'text', text: before.trim() });
								pushMediaPart(parts, seenMedia, match[1] || match[2] || match[3]);
								lastIndex = pattern.lastIndex;
							}

							var after = text.slice(lastIndex);
							if (after.trim()) parts.push({ type: 'text', text: after.trim() });

							imageUrls.forEach(function(url) {
								pushMediaPart(parts, seenMedia, url);
							});

							return parts;
						}

						function removeRichMedia(frame, wrap) {
							if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
							if (wrap && !wrap.textContent.trim() && !wrap.querySelector('img, video')) {
								if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
							}
						}

						function fitRichMediaFrame(frame, media) {
							function applyFit() {
								var run = window.requestAnimationFrame;
								if (run) {
									run(function() {
										var rect = media.getBoundingClientRect ? media.getBoundingClientRect() : null;
										if (!rect || rect.width <= 0) return;
										frame.style.width = Math.ceil(rect.width) + 'px';
									});
									return;
								}

								(function() {
									var rect = media.getBoundingClientRect ? media.getBoundingClientRect() : null;
									if (!rect || rect.width <= 0) return;
									frame.style.width = Math.ceil(rect.width) + 'px';
								})();
							}

							if (media.tagName === 'IMG') {
								if (media.complete) applyFit();
								media.addEventListener('load', applyFit, { once: true });
								return;
							}

							media.addEventListener('loadedmetadata', applyFit, { once: true });
							media.addEventListener('canplay', applyFit, { once: true });
							applyFit();
						}

						function appendVideoEmbed(frame, wrap, url) {
							var video = document.createElement('video');
							video.src = url;
							video.autoplay = true;
							video.loop = true;
							video.muted = true;
							video.playsInline = true;
							video.setAttribute('playsinline', '');
							video.onerror = function() {
								removeRichMedia(frame, wrap);
							};
							frame.textContent = '';
							frame.appendChild(video);
							fitRichMediaFrame(frame, video);
							return video;
						}

						function appendRichContent(parent, value) {
							var parts = richTextParts(value);
							if (!parts.length) return false;
							var mediaOnly = parts.every(function(part) { return part.type === 'media'; });
							if (mediaOnly && parent.classList) parent.classList.add('media-only');

							var wrap = create('div', 'rich-content');
							var fitters = [];
							if (mediaOnly) wrap.classList.add('media-only');
							parts.forEach(function(part) {
								if (part.type === 'media') {
									var frame = create('div', 'rich-media');
									if (isVideoEmbedUrl(part.url)) {
										appendVideoEmbed(frame, wrap, part.url);
									} else {
										var img = document.createElement('img');
										img.src = imageUrlForDisplay(part.url);
										img.alt = '';
										img.loading = 'lazy';
										img.decoding = 'async';
										img.onerror = function() {
											if (/\\.gifv(?:$|[?#])/i.test(part.url)) {
												appendVideoEmbed(frame, wrap, part.url);
												return;
											}
											removeRichMedia(frame, wrap);
										};
										frame.appendChild(img);
										fitters.push(function() { fitRichMediaFrame(frame, img); });
									}
									wrap.appendChild(frame);
								} else {
									wrap.appendChild(create('div', 'rich-content-text', part.text));
								}
							});

							parent.appendChild(wrap);
							fitters.forEach(function(fit) { fit(); });
							return true;
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
							var replies = item.activity.replies.slice().sort(function(a, b) {
								return Number(b && b.createdAt || 0) - Number(a && a.createdAt || 0);
							});
							if (item.replyId) {
								var replyId = Number(item.replyId);
								return replies.find(function(reply) {
									return Number(reply && reply.id) === replyId;
								}) || null;
							}
							if (item.type === 'ACTIVITY_REPLY_LIKE' && item.viewerId) {
								var viewerId = Number(item.viewerId);
								return replies.find(function(reply) {
									return Number(reply && reply.user && reply.user.id) === viewerId;
								}) || null;
							}
							if (item.type === 'ACTIVITY_REPLY_LIKE' && item.viewerName) {
								var viewerName = String(item.viewerName).toLowerCase();
								return replies.find(function(reply) {
									return String(reply && reply.user && reply.user.name || '').toLowerCase() === viewerName;
								}) || null;
							}
							if ((item.type === 'ACTIVITY_REPLY' || item.type === 'ACTIVITY_REPLY_SUBSCRIBED') && item.userId) {
								var userId = Number(item.userId);
								return replies.find(function(reply) {
									return Number(reply && reply.user && reply.user.id) === userId;
								}) || null;
							}
							if ((item.type === 'ACTIVITY_REPLY' || item.type === 'ACTIVITY_REPLY_SUBSCRIBED') && item.user && item.user.name) {
								var userName = String(item.user.name).toLowerCase();
								return replies.find(function(reply) {
									return String(reply && reply.user && reply.user.name || '').toLowerCase() === userName;
								}) || null;
							}
							return null;
						}

						function replyText(item) {
							var reply = matchedReply(item);
							return stripHtml(reply && reply.text);
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

							if (liked && String(item.type || '').includes('LIKE')) return liked;
							if (context) return context;
							if (liked) return liked;
							if (messageText) return messageText;
							if (activityText) return activityText;
							if (reason) return 'Reason: ' + reason;
							if (item.deletedMediaTitles && item.deletedMediaTitles.length) return 'Merged titles: ' + item.deletedMediaTitles.join(', ');
							return 'Open this notification for details and the AniList page link.';
						}

						function isFallbackNotificationText(value) {
							return sameText(value, 'Open this notification for details and the AniList page link.');
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

							if (!text || isFallbackNotificationText(text) || sameText(text, title) || sameText(text, liked)) return '';
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
							if ((type === 'ACTIVITY_REPLY' || type === 'ACTIVITY_REPLY_SUBSCRIBED') && !Array.isArray(item.activity.replies)) return true;
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

						function avatarFor(item) {
							return item && item.user && item.user.avatar ? item.user.avatar.large || item.user.avatar.medium : '';
						}

						function mediaCoverFor(item) {
							var media = itemMedia(item);
							return media && media.coverImage ? media.coverImage.large || media.coverImage.medium : '';
						}

						function imageFor(item) {
							var avatar = avatarFor(item);
							if (avatar) return avatar;
							if (item && item.user) return '';
							return mediaCoverFor(item);
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

						function seanimeMediaTarget(media) {
							if (!media || !media.id) return null;
							var type = String(media.type || '').toUpperCase() === 'MANGA' ? 'MANGA' : 'ANIME';
							return { id: String(media.id), type: type };
						}

						function openSeanimeMedia(media, event) {
							if (event) {
								event.preventDefault();
								event.stopPropagation();
							}

							var target = seanimeMediaTarget(media);
							if (!target) return;
							send('open-seanime-media', target);
						}

						function makeSeanimeMediaLink(node, media) {
							if (!seanimeMediaTarget(media)) return node;

							node.classList.add('seanime-media-link');
							node.setAttribute('role', 'link');
							node.setAttribute('tabindex', '0');
							node.title = 'Open in Seanime';
							node.onclick = function(event) {
								openSeanimeMedia(media, event);
							};
							node.onkeydown = function(event) {
								if (event.key === 'Enter' || event.key === ' ') {
									openSeanimeMedia(media, event);
								}
							};

							return node;
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

						function pageUnreadBadgeLabel(value, label) {
							if (label !== undefined && label !== null && String(label).trim()) return String(label).trim();
							var count = Math.max(0, Number(value || 0));
							return String(count);
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
							var badge = create('span', 'badge' + (state.unreadCount > 0 ? '' : ' hidden'), pageUnreadBadgeLabel(state.unreadCount, state.unreadCountLabel));
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
							var thumb = create('div', 'thumb' + ((!item.user && (itemMedia(item) || large)) ? ' media' : ''));
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
							if (!media || !title) return;

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
							var owner = activityOwner(item.activity);
							if (item.activity && item.activity.media && String(item.type || '').includes('LIKE')) {
								typeLabel += owner ? ' from @' + owner : ' from liked activity';
							} else if (item.activity && item.activity.media) {
								typeLabel += owner ? ' from @' + owner : ' from activity';
							}
							copy.appendChild(create('div', 'liked-media-kicker', typeLabel));
							copy.appendChild(create('h3', 'liked-media-title', title));
							var progressText = listProgressText(item);
							if (progressText) copy.appendChild(create('div', 'liked-media-meta', progressText));

							box.appendChild(cover);
							box.appendChild(copy);
							makeSeanimeMediaLink(box, media);
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
									state.unreadCountLabel = String(state.unreadCountLabel || '').indexOf('+') !== -1 && state.unreadCount >= 99 ? '99+' : pageUnreadBadgeLabel(state.unreadCount);
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
							var preview = create('div', 'card-rich');
							if (appendRichContent(preview, notificationText(item))) {
								main.appendChild(preview);
							}

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
								makeSeanimeMediaLink(pill, mediaSource);
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

						function addTextBlock(blocks, label, value) {
							if (!value) return;
							if (!richTextParts(value).length) return;
							blocks.push({ label: label, text: String(value) });
						}

						function textBlocksFor(item, reply) {
							var blocks = [];
							var type = String(item.type || '');
							var activityValue = item.activity && (item.activity.text || item.activity.message);
							var messageValue = item.message && item.message.message;
							var commentValue = item.comment && item.comment.comment;
							var replyValue = reply && reply.text;
							var likedText = likedContent(item);

							if (type === 'ACTIVITY_MESSAGE') {
								addTextBlock(blocks, 'Message', messageValue || activityValue);
							}

							if (type === 'ACTIVITY_REPLY' || type === 'ACTIVITY_REPLY_SUBSCRIBED') {
								addTextBlock(blocks, 'Reply', replyValue);
								addTextBlock(blocks, 'Activity', activityValue);
							}

							if (type === 'ACTIVITY_MENTION') {
								addTextBlock(blocks, 'Mentioned activity', activityValue);
							}

							if (type === 'ACTIVITY_LIKE') {
								addTextBlock(blocks, likedContentLabel(item), likedText || activityValue);
							}

							if (type === 'ACTIVITY_REPLY_LIKE') {
								addTextBlock(blocks, likedContentLabel(item), likedText || replyValue);
								addTextBlock(blocks, 'Activity', activityValue);
							}

							if (type === 'THREAD_COMMENT_MENTION' || type === 'THREAD_COMMENT_REPLY' || type === 'THREAD_COMMENT_SUBSCRIBED') {
								addTextBlock(blocks, 'Thread comment', commentValue);
							}

							if (type === 'THREAD_COMMENT_LIKE') {
								addTextBlock(blocks, likedContentLabel(item), likedText || commentValue);
							}

							if (type === 'THREAD_LIKE') {
								addTextBlock(blocks, likedContentLabel(item), likedText);
							}

							if (type.indexOf('MEDIA_') === 0 || type === 'RELATED_MEDIA_ADDITION') {
								addTextBlock(blocks, 'Reason', item.reason);
							}

							if (!blocks.length) {
								addTextBlock(blocks, 'Details', messageValue || replyValue || commentValue || activityValue || item.reason);
							}

							return blocks;
						}

						function renderTextBoxes(parent, item, reply, introText) {
							var seen = {};
							if (introText) seen[normalizeText(introText)] = true;
							textBlocksFor(item, reply).forEach(function(block) {
								var key = normalizeText(block.text);
								if (!key || seen[key]) return;
								seen[key] = true;
								var mediaOnly = richTextParts(block.text).every(function(part) { return part.type === 'media'; });
								var box = create('div', 'content-box');
								if (mediaOnly) box.classList.add('media-only');
								box.appendChild(create('div', 'detail-label', block.label));
								var quote = create('div', 'quote');
								appendRichContent(quote, block.text);
								box.appendChild(quote);
								parent.appendChild(box);
							});
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
							var introHasMedia = richTextParts(introText).some(function(part) { return part.type === 'media'; });
							if (introText && !introHasMedia) content.appendChild(create('p', 'detail-sheet-text', introText));
							if (introText && introHasMedia) {
								var introBox = create('div', 'content-box');
								var introQuote = create('div', 'quote');
								if (richTextParts(introText).every(function(part) { return part.type === 'media'; })) introBox.classList.add('media-only');
								if (appendRichContent(introQuote, introText)) {
									introBox.appendChild(introQuote);
									content.appendChild(introBox);
								}
							}
							var reply = matchedReply(item);
							var commentLikeCount = item.comment && item.comment.likeCount;
							var replyLikeCount = reply && reply.likeCount;
							renderLikedMedia(content, item);
							renderTextBoxes(content, item, reply, introText);

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

							if (state.hasNextPage) {
								var moreRow = create('div', 'load-more-row');
								var more = create('button', 'btn btn-primary');
								more.type = 'button';
								more.disabled = !!state.loadingMore;
								more.appendChild(iconNode(state.loadingMore ? 'refresh' : 'chevron'));
								more.appendChild(document.createTextNode(state.loadingMore ? 'Loading more' : 'Show more'));
								more.onclick = function() { send('load-more'); };
								moreRow.appendChild(more);
								root.appendChild(moreRow);
							}
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
							window.webview.on('unreadCountLabel', function(value) {
								state.unreadCountLabel = value || pageUnreadBadgeLabel(state.unreadCount);
								render();
							});
							window.webview.on('loading', function(value) {
								state.loading = !!value;
								render();
							});
							window.webview.on('loadingMore', function(value) {
								state.loadingMore = !!value;
								render();
							});
							window.webview.on('hasNextPage', function(value) {
								state.hasNextPage = !!value;
								render();
							});
							window.webview.on('currentPage', function(value) {
								state.currentPage = Number(value || 1);
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
