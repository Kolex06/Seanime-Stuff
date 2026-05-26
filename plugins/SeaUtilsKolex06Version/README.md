# SeaUtils Kolex06-Version

SeaUtils Kolex06-Version is a Seanime utility extension focused on improving the extension marketplace and common browsing pages.

## Features

- Better Marketplace layout with searchable rows and a Full Catalog popup.
- Full Catalog action buttons for More, Preferences, Code, and Documentation when available.
- Update highlighting for extensions with a newer version available.
- Per-page carousel settings for Search, My Lists, Manga, and Other Pages.
- Drag-to-scroll carousel support while keeping normal click behavior.
- Sub/Dub badges on anime cards.
- Tray preferences for toggling SeaUtils features.

## Preferences

SeaUtils adds preferences in the tray and in supported extension action popups:

- Better Marketplace
- Carousels
- Carousels: Search
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
