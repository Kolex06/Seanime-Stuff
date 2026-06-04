# AniList Notifications Kolex06-Version

AniList Notifications Kolex06-Version adds a Seanime sidebar page for your AniList notifications.

## Features

- Sidebar button with an AniList notification bell icon.
- Light, transparent page background instead of the black webview background.
- Bigger notification cards with larger avatars, cover art, unread highlighting, and timestamps.
- Click any notification to open a detail popup.
- Detail popup includes an icon button to open the matching AniList anime, manga, activity, user, thread, or notifications page.
- Refresh and Mark all read controls.

## Requirements

- Sign in to AniList from Seanime first.
- The plugin needs AniList token access so it can call AniList GraphQL for your notifications.

## Version History

### 1.0.2
- Keeps the sender/user avatar on the left side of opened notification details.
- Shows anime and manga covers inside the media box instead of replacing the sender avatar.
- Adds consistent text boxes for replies, messages, thread comments, liked content, activity text, and reasons.

### 1.0.1
- Removes repeated liked text, repeated media titles, and duplicate media action buttons from the notification popup.
- Keeps watched episode/progress info in the media block and AniList links in the bottom action row.

### 1.0.0
- First stable Kolex06 release for the GitHub marketplace.
- Includes larger notification cards, readable detail popups, AniList page links, liked activity details, watched progress, and the PNG sidebar/extension icon.

### 0.1.8
- Makes the Seanime sidebar button use the served PNG icon instead of an inline image.
- Keeps a GitHub PNG fallback for the sidebar icon when the local test server is not being used.

### 0.1.7
- Restored watched episode/progress/status info under the liked anime or manga title.
- Keeps that info in one place so it does not repeat in the popup.

### 0.1.6
- Removed the duplicate Activity info/status strip from the popup.
- Stopped repeating watch status/progress under the liked title.
- Switched the sidebar/plugin icon to PNG.

### 0.1.5
- Simplified the notification popup so it is easier to read.
- Hid the full AniList data inside a collapsed section.
- Reduced the action buttons to the main AniList page and title link.

### 0.1.4
- Routes AniList link buttons through Seanime so the default browser opens reliably.
- Loads more activity details for liked notifications and shows the full AniList data in the popup.
- Uses a stronger sidebar notification bell icon.

### 0.1.3
- Added a compact notification-dot icon for the Seanime sidebar button.
- Changed AniList action buttons to real links so Seanime's webview can open them.
- Added a prominent liked anime/manga block for list activity likes, including cover art, progress/status, and a direct title link.

### 0.1.2
- Added richer liked-content previews for activity likes, activity reply likes, thread comment likes, and thread likes.
- Expanded the AniList query to fetch activity text, list activity media/progress, matching reply text, and thread comment text.
- Made the AniList button prefer the liked activity/comment/thread URL instead of the liker profile.

### 0.1.1
- Replaced the gray overlay popup with an inline detail panel under the clicked notification.
- Changed the page from white cards to transparent blue-gray glass panels.
- Enlarged notification cards, cover art, avatars, and text.

### 0.1.0
- Initial Kolex06 version.
- Added the AniList sidebar page, larger notification cards, light background styling, and click-to-popup AniList links.
