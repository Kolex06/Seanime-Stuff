# Seanime-Stuff

Seanime marketplace repository for Kolex06 extensions.

This repo hosts ready-to-install Seanime plugin manifests, icons, and plugin source files for the custom Kolex06 marketplace.

## Marketplace URL

Use this URL in Seanime as the custom marketplace URL:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/marketplace.json
```

After adding or changing the marketplace URL, refresh the catalog or run `Check for updates` in Seanime.

## Included Extensions

| Extension | Version | ID | Description |
| --- | --- | --- | --- |
| SeaUtils Kolex06-Version | 1.2.38 | `SeaUtils-Kolex06-Version` | Utility plugin for Seanime UI improvements, marketplace/full catalog controls, carousels, sub/dub badges, and tray preferences. |
| AsunaTracks Sync | 0.1.13 | `asunatracks-sync` | Syncs Seanime/AniList anime and manga progress to AsunaTracks, with live sync and manual full-library sync options. |

## SeaUtils Kolex06-Version

SeaUtils Kolex06-Version is the current Kolex06 version of SeaUtils.

Features include:

- Better marketplace and Full Catalog layout.
- Horizontal carousel rows for media grids.
- Sub/dub and captions badges on media cards.
- Tray preferences for turning SeaUtils features on or off.
- Full Catalog actions for installed extension info, code, and preferences when available.

Direct manifest:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/SeaUtils-Kolex06-Version.json
```

Source code:

```text
https://github.com/Kolex06/Seanime-Stuff/blob/main/plugins/SeaUtils-Kolex06-Version.json
```

Icon:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/icons/SeaUtils-Kolex06-Version.png
```

## AsunaTracks Sync

AsunaTracks Sync connects Seanime/AniList progress with AsunaTracks.

Features include:

- Login with an AsunaTracks account.
- Live sync for anime and manga progress changes.
- Manual anime and manga full-library sync.
- Progress, repeat count, status, and delete sync support.
- Tray UI with account status, sync buttons, logs, and live-sync toggles.

Direct manifest:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/asunatracks-sync.json
```

Documentation:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/plugins/AsunaTracksSync/README.md
```

Icon:

```text
https://raw.githubusercontent.com/Kolex06/Seanime-Stuff/refs/heads/main/icons/asunatracks.png
```

## Notes

- Use `SeaUtils-Kolex06-Version.json` for SeaUtils Kolex06-Version. The manifest contains the restored old working SeaUtils code directly.
- SeaAnime/Seanime only detects extension updates when the manifest version is higher than the installed version.
- The marketplace file and plugin manifests should stay on matching versions.
- Icons are hosted as raw PNG files from this repo.

## Repository Layout

```text
marketplace.json
plugins/
  SeaUtils-Kolex06-Version.json
  asunatracks-sync.json
  AsunaTracksSync/
    README.md
    provider.ts
icons/
  SeaUtils-Kolex06-Version.png
  asunatracks.png
```
