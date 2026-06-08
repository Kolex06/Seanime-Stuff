# Account Switcher Kolex06-Version

Account Switcher Kolex06-Version lets you save multiple AniList access tokens and switch between them from Seanime's avatar dropdown menu.

## Version History

### 1.0.10
- Only injects into the real avatar/profile dropdown.
- Stops Account Switcher controls from appearing inside tray extension menus or other non-profile dropdowns.

### 1.0.9
- Moves the account switcher from the tray into the avatar dropdown above `Sign out`.
- Uses the PNG icon at `icons/account-switcher.png`.
- Uses the public manifest file `plugins/Account-Switcher-Kolex06-Version.json`.
- Uses the public source folder `plugins/AccountSwitcherKolex06Version/`.
- Keeps the extension ID as `Account-Switcher-Kolex06-Version`.

### 1.0.8 and earlier
- Original Account Switcher base.
- Saved AniList accounts and switched between them from the extension UI.

## What changed

- The original tray button has been removed.
- Account controls are injected into the profile/avatar menu, above `Sign out`.
- Saved account data is kept available to the avatar menu after installation.

## Usage

1. Open the avatar menu in Seanime.
2. Choose `Add AniList account`.
3. Enter the AniList username and access token.
4. Open the avatar menu again and choose the saved account to switch.

You can also delete saved accounts from the same menu.
