# AsunaTracks Sync for Seanime

A Seanime plugin that syncs Seanime/AniList list changes into AsunaTracks.

Keep AsunaTracks up to date from Seanime. The extension can live-sync list edits as you watch or read in Seanime, and it also includes manual anime/manga sync buttons for catching up an existing library in AsunaTracks.

## What It Does

- Signs in with an AsunaTracks account through `/public/api/auth/login`.
- Live-syncs Seanime entry updates, progress updates, repeat counts, and deletes.
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

## Version History

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
