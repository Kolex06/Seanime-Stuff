# AsunaTracks Sync for Seanime

A Seanime plugin that syncs Seanime/AniList list changes into AsunaTracks.

Keep AsunaTracks up to date from Seanime. The extension can live-sync list edits as you watch or read in Seanime, and it also includes manual anime/manga sync buttons for catching up an existing library in AsunaTracks.

## What It Does

- Signs in with an AsunaTracks account through `/public/api/auth/login`.
- Live-syncs Seanime entry updates, progress updates, repeat counts, and deletes.
- Saves unfinished anime playback positions to AsunaTracks Playback Progress / Scrobbler from Seanime's built-in player and tracked external players.
- Manually pushes the current AniList anime or manga collection into AsunaTracks.
- Uses MAL IDs from AniList as the bridge, so AsunaTracks can resolve or import media through its public API.
- Shows a compact tray UI with notifications, logs, profile menu, manual sync buttons, and live-sync toggles.

## Install

In Seanime, add this extension manifest URL:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/asunatracks-sync.json
```

Then open the AsunaTracks Sync tray icon, sign in with your AsunaTracks account, and run `Sync Anime` or `Sync Manga` once. Leave live sync enabled for future Seanime list changes.

## Additional Notes

- You must be logged in with AniList in Seanime and enable `Automatically update progress` in the app settings for live sync to work.
- Seanime/AniList media is matched to AsunaTracks through MAL IDs when available.
- Private AniList entries are skipped during sync.
- You can disable live sync from the tray at any time without signing out.
- Playback positions update every 15 seconds and on pause, resume, seek, or stop. They use the `Seanime` source label. Successful watched-progress updates clear saved positions for watched episodes; saving a position alone does not mark an episode watched.
- Playback requires a title with a MAL ID that can be matched to AsunaTracks. Private and excluded adult entries are skipped. Player versions without playback event support still use normal list sync.

## Version History

### 0.1.26

- Read built-in player metadata from playback state, with a fallback to the playback-info getter.
- Handled wrapped Seanime values, missing session IDs, and zero progress numbers when parsing player events.
- Added a first update on loaded metadata and logs for successful playback saves, registered listeners, and skipped entries.

### 0.1.25

- Fixed `readableLogTimestamp is not defined` by defining log helpers inside Seanime's isolated UI callback.
- Added a regression test that runs the serialized UI callback in a separate runtime.

### 0.1.24

- Made log timestamps readable in local time with an explicit UTC offset; older saved log timestamps are formatted too.
- Kept the session and showed a connection warning when startup token checks fail due to DNS, timeouts, or server errors. Only an HTTP 401 asks users to sign in again.
- Included failed network requests in the connection failure counter.

### 0.1.23

- Added Playback Progress / Scrobbler integration with `/public/api/me/playback-progress`.
- Added built-in and tracked external player position updates, including pause, resume, seek, and stop.
- Matched MAL IDs to AsunaTracks media IDs before saving positions, and used seconds for position and duration.
- Cleared watched positions after successful progress sync without changing Seanime's watched threshold or rating behavior.

### 0.1.22

- Fixed progress sync being blocked when Seanime/AniList had a score on an unfinished title.
- Scores are now only sent for scoreable statuses, and progress sync retries without score if the API rejects an early rating.

### 0.1.21

- Softened the login/settings text input borders so `Username` and `AsunaTracks URL` no longer look like warning fields.

### 0.1.20

- Updated sync payloads to use the newer AsunaTracks public API fields.
- Added `score_10` for preferred 0-10 ratings while keeping the older score fallback.
- Added manga `progress_volumes` sync when Seanime/AniList provides volume progress.

### 0.1.19

- Added a dedicated `Missing MAL IDs` side panel in the notifications popup.
- Entries skipped because AniList has no MAL ID are now saved there with title, media type, reason, timestamp, and cover image when available.
- Added delete controls for individual missing-MAL entries and a clear button for the full list.

### 0.1.18

- Centered the tray action buttons so the log, account check, anime sync, and manga sync buttons line up cleanly.
- Updated the marketplace and extension manifest version.

### 0.1.17

- Fixed the password field so the password is hidden without showing an extra masked `*` above the input.
- Kept the visible password title as `Password` and left the internal input label blank.
- Updated the installed Seanime cache and GitHub release files.

### 0.1.16

- Added the AsunaTracks logo to the extension manifest so it shows in Seanime's extension install/details screens.
- Improved the login/settings popup styling to better match AsunaTracks.
- Added clearer description and additional notes for Seanime users.

### 0.1.15

- Added per-notification `Delete` and `Read` actions.
- Added `Mark all as Read` and `Delete all` actions to the notifications popup.
- Switched the notification badge text button to a bell icon.

### 0.1.14

- Added the profile avatar menu with `Open in browser` and `Sign out`.
- Fixed profile links to use `/u/{username}`.
- Removed the extra gear/settings button from the main tray header.

### 0.1.13

- Moved the extension into `Kolex06/Seanime-Stuff` for easier Seanime installation.
- Added marketplace and manifest entries for installing from GitHub.
- Added the initial AsunaTracks sync tray UI, live sync hooks, manual anime/manga sync buttons, logs, notifications, and live-sync toggles.

## Local AsunaTracks Testing

The extension defaults to:

```text
https://asunatracks.space
```

Open the profile menu, choose `Settings`, and change the URL to `http://localhost:8000` if you are testing a local AsunaTracks server.

