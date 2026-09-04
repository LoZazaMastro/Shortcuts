# Shortcuts

Shortcuts adds selected Decky plugins as independent, reorderable tabs in the Quick Access Menu.

**Author:** LoZazaMastro  
**Version:** 1.0.0  
**License:** GPL-3.0-only

## Features

- Adds any loaded Decky plugin with a QAM panel as a top-level QAM tab.
- Keeps the original plugin entry inside Decky.
- Reorders only tabs created by Shortcuts.
- Removes a shortcut without disabling or uninstalling the original plugin.
- Preserves entries for disabled or temporarily unavailable plugins and restores them automatically when they return.
- Stores preferences in the Decky plugin settings directory, with a local browser cache for immediate startup.
- Uses the original plugin title and panel at runtime without packaging third-party plugin code or assets.
- Lets each active shortcut use the plugin's original icon or one of 59 bundled Tabler icons.
- Detects Steam's interface language automatically and uses English as the fallback language.

## Installation

Extract or install the release archive so the resulting Decky plugin directory is named `Shortcuts` and contains `dist/index.js`, `main.py`, `plugin.json` and `package.json`.

Open Decky, select Shortcuts, then add plugins from the available list. Active shortcuts are shown as cards. Select a plugin name to choose its QAM icon, or use the controls below it to move or remove the shortcut.

## Development

The frontend source is already deployable JavaScript and is copied to `dist/index.js` by the build script.

```bash
npm run build
npm test
```

Shortcuts uses Decky's internal QAM tab registry because Decky does not expose a public API for creating independent top-level QAM tabs. The integration is guarded and leaves native tabs and tabs owned by other plugins untouched. A future Decky interface change may require an update.

## Licensing

Shortcuts is distributed under GPL-3.0-only. The source and the complete notices are included in the project and installer archives.

The QAM registration and render-reconciliation work is adapted from Panel de Control by Hooandee and contributors under GPL-3.0-only. The selected plugins themselves are not copied into Shortcuts: their already-loaded runtime elements are referenced from Decky and remain part of their own installations.

See `THIRD_PARTY_NOTICES.md` and `LICENSE` for details.
