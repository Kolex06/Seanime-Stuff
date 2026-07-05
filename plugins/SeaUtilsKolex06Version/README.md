# SeaUtils Kolex06-Version

SeaUtils Kolex06-Version is a Seanime utility extension by Kolex06. It improves the Extensions marketplace, adds better catalog popups, gives media grids optional carousel behavior, and adds small quality-of-life badges for anime cards.

Version `1.2.75` improves Schedule DUB rows, DUB episode placement, and Bas1874 marketplace URL handling.

## Features

- Better Marketplace layout with searchable rows and a Full Catalog popup.
- Combined Full Catalog for Plugins, Anime torrents, Manga, Online streaming, and other marketplace sections.
- Per-section View All popups that group entries like Full Catalog.
- Full Catalog/View All action buttons for More, Preferences, Code, Documentation, and install/update actions when available.
- Update highlighting for extensions with a newer version available.
- Per-page carousel settings for Search, My Lists, Manga, and Other Pages.
- Separate Extensions page carousel setting that depends on Better Marketplace.
- Drag-to-scroll carousel support while keeping normal click behavior.
- Sub/Dub badges on anime cards.
- Tray preferences for toggling SeaUtils features.
- Optional Bas1874 marketplace support with status and scan metadata badges.

## Preferences

SeaUtils adds preferences in the tray and in supported extension action popups:

- Better Marketplace
- Bas1874 Marketplace metadata
- Carousels
- Carousels: Search
- Carousels: Extensions
- Carousels: My Lists
- Carousels: Manga
- Carousels: Other Pages
- Sub/Dub Icons

## Full Catalog

The Full Catalog popup keeps marketplace entries organized and keeps extension actions close to each card:

- Preferences is placed beside More.
- Documentation is placed beside Code and only appears when the extension has docs.
- Code opens the installed extension payload when available.
- More opens extension details and management actions.
- Broken and Deprecated groups are pinned near the bottom when Bas1874 metadata is enabled.
- View All popups use the same author grouping style as Full Catalog.

## Bas1874 Marketplace Metadata

When the Bas1874 marketplace option is enabled, SeaUtils can show extra metadata on marketplace cards:

- Working
- Broken
- Deprecated
- Official
- VirusTotal
- Scanned version
- Last working version
- Flag count

Broken and Deprecated entries are also collected into their own marketplace groups. This keeps normal sections cleaner while still making problem entries easy to find, search, and open.

Virus scan metadata is informational only. You should still review extensions yourself before installing them.

## Version History

### 1.2.75
- Keeps same-time SUB and DUB Schedule entries as separate rows instead of merging DUB into the SUB row.
- Moves `DUB Ep. **` into Seanime's normal episode position where `Ep. **` shows, instead of showing it underneath the Schedule row.
- Prevents stale fallback DUB rows from creating future DUB entries when AsunaTracks no longer has that DUB date.
- Shows Schedule DUB titles with an icon-only microphone prefix.
- Preserves a user's custom marketplace URL when toggling the Bas1874 marketplace option.
- Re-applies the Bas1874 marketplace URL after refresh without overwriting unrelated custom URLs.
- Hides Seanime's native disabled Installed button when SeaUtils action icons are shown on marketplace cards.

### 1.2.74
- Uses the public AsunaTracks Schedule API for Schedule DUB badges.
- Supports Schedule desktop and mobile/list cards.
- Uses MyDubList for regular anime-card DUB badges outside Schedule.
- Keeps older fallback DUB data for past Schedule entries.

### 1.2.73
- Clears the blue update highlight immediately after an extension update/install succeeds.
- Keeps normal pre-update glow visible.
- Detects native update clicks from any button inside a glowing update card.
- Clears update glow only after the installed version reaches the update target.
- Rechecks several times so slow Seanime redraws still clear without leaving the Extensions page.
- Refreshes matching Full Catalog/View All/status clone cards after update actions.

### 1.2.72
- Fixes Broken/Deprecated Extensions sections so they use normal grid-style when Carousels: Extensions is off.
- Keeps Broken/Deprecated Extensions sections in carousel mode when Carousels: Extensions is on.
- Stops drag behavior for Broken/Deprecated Extensions sections when the Carousels: Extensions setting is off.

### 1.2.71
- Adds the optional Bas1874 Marketplace metadata setting.
- Lets marketplace cards show status badges such as Working, Broken, Deprecated, and Official when using Bas1874 Marketplace.
- Adds scan-related metadata badges for VirusTotal, scanned version, last working version, and flag Count when using Bas1874 Marketplace.
- Moves Broken and Deprecated marketplace entries into dedicated groups instead of leaving duplicate cards in normal groups.
- Keeps Broken/Deprecated groups pinned near the bottom and searchable when using Bas1874 Marketplace.
- Keeps Full Catalog/View All grouping based on real authors, not programming language labels.

### 1.2.70
- Made per-section View All popups group rows like Full Catalog.
- Keeps grouping focused on real authors and skips language metadata such as English, JavaScript, and TypeScript.

### 1.2.69
- Added a separate Carousels: Extensions setting.
- Better Marketplace now controls whether the Extensions carousel setting is active.
- Disabled carousel sub-settings keep their saved on/off state and restore automatically when their parent setting is turned back on.
- Replaced disabled tray carousel switches with grey text so disabled settings do not appear as active blue switches.
- Replaced Preferences carousel sub-setting switches with custom On/Off buttons that grey out when disabled.

### 1.2.68
- Fixed update glow selectors so extension cards with available updates get the blue outline/glow.
- Applies the update glow inline to Full Catalog wrappers as well as the extension card.

### 1.2.67
- Added Hide File Names for local library episode filenames.
- Added the marketplace carousel action-button layout fix for SeaUtils Kolex06-Version.
- Added update-card matching/glow improvements for cards that only expose the extension through manifest links or visible card text.

### 1.2.66
- Added marketplace-version versus installed-version detection for update glow.
- Improved update detection for cards that do not show an old-to-new version arrow.

### 1.2.65
- Limited Better Marketplace enhancements to real extension marketplace sections.
- Prevented View All/search controls from appearing in Settings cards such as Video Playback.

### 1.2.64
- Kept the blue outline/glow for extensions with an available update.
- Clears the update glow after the extension is switched to the newest version.

### 1.2.63
- Moved the SeaUtils plugin code into `provider.ts` and switched the manifest to `payloadURI`.
- Reformatted the SeaUtils manifest and marketplace JSON for easier reading.

### 1.2.62
- Changed the combined Full Catalog popup to group all marketplace sections by author.
- Kept the per-section View All buttons focused on their own section.

### 1.2.61
- Fixed the escaped extension-card selectors that stopped View All from appearing on the Extensions page.
- Restored drag setup for Extensions page marketplace rows after the combined Full Catalog changes.

### 1.2.60

- Fixed escaped extension-card selectors used by Full Catalog and marketplace update highlighting.
- Forced a fresh marketplace rebuild and drag rebind so View All and extension-page drag return after updating.

### 1.2.59

- Fixed the page-level Full Catalog button so it still appears after marketplace section headers are moved into SeaUtils headers.
- Restored marketplace carousel drag binding by forcing a new drag enhancement version.

### 1.2.58

- Fixed update highlighting so every extension card in the marketplace carousel is marked directly.
- Added an inline blue outline/glow fallback for update cards when Seanime CSS overrides the injected stylesheet.

### 1.2.57

- Added a page-level Full Catalog button under the Extensions search area.
- The combined Full Catalog popup now shows Plugins, Anime torrents, Manga, and Online streaming sections together.

### 1.2.56

- Fixed Documentation so it appears in View All / Full Catalog for known documented extensions.
- Made Documentation insertion deterministic during Full Catalog popup creation.

### 1.2.54

- Fixed update highlighting so the whole extension card gets the blue outline/glow when an update is available.
- Improved update detection for badge text such as `old -> new`, `old to new`, and arrow-style version badges.
- Fixed Documentation detection in Full Catalog by falling back to marketplace metadata.

### 1.2.53

- Updated the Full Catalog action button layout.
- Added Documentation support beside the Code button when docs are available.

### 1.2.52

- Added blue update-card styling for extensions with available updates.

### 1.2.51

- Fixed carousel page detection so Search uses its own carousel setting instead of Other Pages.
- Refreshed page flags when Seanime route content changes.

### 1.2.50 and earlier

- Improved SeaUtils Kolex06-Version naming and metadata.
- Restored the working payload after provider-based builds caused runtime issues.
- Added marketplace improvements, preferences, code viewing, and extension management actions.
