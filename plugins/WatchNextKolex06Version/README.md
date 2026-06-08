# Watch Next Kolex06-Version

Kolex06-styled Seanime plugin for building a personal Watch Next anime queue.

## Features

- Sidebar page.
- Add anime from your AniList lists.
- Search, list, year, season, and added-time filters.
- Drag rows by the handle to reorder the queue.
- Up/down buttons remain available as a fallback.
- Auto-sync queued anime into an AniList custom list named Watch Next in queue order.
- Uses AniList priority updates so already-listed anime are reordered too.
- Skips unchanged AniList entries and spaces requests to reduce 429 rate-limit errors.
- Manual Sync AniList List button for forcing a refresh.
- Optional auto-remove when an anime moves to your CURRENT list.
- Migrates the original Watch Next extension storage keys on first load.

## Version Info

- `1.0.2` - Reduced AniList `429 Too Many Requests` errors by skipping unchanged entries, spacing AniList writes, and retrying once after rate-limit waits.
- `1.0.1` - Fixed Seanime webview drag ordering with a dedicated drag handle and pointer-based reorder logic.
- `1.0.0` - Initial GitHub release of Watch Next Kolex06-Version.

## Install

Use this manifest URL in Seanime:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/Watch-Next-Kolex06-Version.json
```

## Local Test

When serving this repository locally on port `18126`, use:

```text
http://127.0.0.1:18126/plugins/Watch-Next-Kolex06-Version.local.json
```
