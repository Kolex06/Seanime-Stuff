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

### 1.2.76
- Adds a section-level fallback for the Permissions required area instead of relying only on finding the visible Grant control.
- Styles action clusters inside permission cards even when Seanime hides Grant behind custom markup.

### 1.2.75
- Detects permissions-required Grant controls even when Seanime renders them as role buttons, links, or custom button components instead of real `button` elements.
- Applies the same forced layout to clickable siblings in the permissions action row.

### 1.2.74
- Makes permissions-required action cleanup independent from the Better Marketplace toggle.
- Forces the detected Grant/settings row into the card corner with inline layout so Seanime styles cannot keep it overlapping content.
- Re-scans the page for delayed permission buttons.

### 1.2.73
- Moves the native permissions-required action row onto the extension card so it no longer overlaps the card content.
- Hides the Grant text more aggressively while keeping Seanime's original button and click handler.

### 1.2.72
- Fixed the generated browser script so SeaUtils features run again.
- Replaced manifest-link regex literals with template-safe matching for Full Catalog and Code actions.

### 1.2.71
- Re-added permissions-required action styling using safe CSS-only icon rendering.
- Hides Grant text without replacing Seanime's native button contents.
- Gives the Grant/settings buttons their own compact action area so they stop sitting on top of card content.

### 1.2.70
- Rolled back the native permissions-required action override that could stop SeaUtils from running.
- Kept the update-glow detection fixes and forced a fresh marketplace rebuild.

### 1.2.69
- Broadened permission-required action detection beyond normal extension card classes.
- Force-hides Grant text and styles the native Grant/settings action row directly.

### 1.2.68
- Improved update-card matching for cards that hide the extension ID.
- Restored inline blue update glow so update cards remain visible when Seanime overrides injected CSS.

### 1.2.67
- Made permission-required extension actions cleaner and icon-only.
- Prevented Grant/settings controls from overlapping extension card content.

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
