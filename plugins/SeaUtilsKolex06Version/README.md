# SeaUtils Kolex06-Version

SeaUtils Kolex06-Version is a Seanime utility extension focused on improving the extension marketplace and common browsing pages.

## Features

- Better Marketplace layout with searchable rows and a Full Catalog popup.
- Full Catalog action buttons for More, Preferences, Code, and Documentation when available.
- Update highlighting for extensions with a newer version available.
- Per-page carousel settings for Search, My Lists, Manga, and Other Pages.
- Separate Extensions page carousel setting that depends on Better Marketplace.
- Drag-to-scroll carousel support while keeping normal click behavior.
- Sub/Dub badges on anime cards.
- Tray preferences for toggling SeaUtils features.

## Preferences

SeaUtils adds preferences in the tray and in supported extension action popups:

- Better Marketplace
- Carousels
- Carousels: Search
- Carousels: Extensions
- Carousels: My Lists
- Carousels: Manga
- Carousels: Other Pages
- Sub/Dub Icons

## Full Catalog

The Full Catalog popup keeps extension actions close to each card:

- Preferences is placed beside More.
- Documentation is placed beside Code and only appears when the extension has docs.
- Code opens the installed extension payload when available.
- More opens extension details and management actions.

## Version History

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
