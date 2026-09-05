<div align="center">

# Shortcuts

### Your favourite Decky plugins, one tab away.

Turn the Decky panels you use most into independent, reorderable tabs in Steam's Quick Access Menu.

[![Release](https://img.shields.io/github/v/release/LoZazaMastro/Shortcuts?style=for-the-badge&label=Release&labelColor=111111&color=ffffff)](https://github.com/LoZazaMastro/Shortcuts/releases/latest)
[![GPL-3.0 License](https://img.shields.io/badge/License-GPL--3.0-ffffff?style=for-the-badge&labelColor=111111)](LICENSE)

</div>

![Shortcuts cover](assets/cover.jpg)

## Put your plugins where you need them

Shortcuts brings compatible Decky plugin panels directly into the main Quick Access Menu tab bar. Your original Decky entries stay untouched, while the panels you choose become immediately available beside Steam's native tabs.

![A Gaming Mode plugin panel opened from its own Quick Access Menu tab](assets/screenshots/shortcuts-qam-tab.png)

## Make the QAM yours

- Add any loaded Decky plugin.
- Reorder the tabs created by Shortcuts.
- Remove a shortcut.
- Use the plugin's original icon or choose from the bundled Tabler icon library.

![Active shortcuts can be reordered, customised or removed](assets/screenshots/shortcuts-active-tabs.png)

## Add and customise shortcuts

Open Shortcuts in Decky and select a compatible plugin from the available list. Select an active plugin's name to choose its icon, then use the controls below it to change its position or remove the shortcut.

![Compatible Decky plugins ready to be added](assets/screenshots/shortcuts-available-plugins.png)

![Searchable controller-friendly icon picker](assets/screenshots/shortcuts-icon-picker.png)

## Requirements

- Steam in Big Picture mode.
- [Decky Loader](https://decky.xyz) 3.x.
- At least one other Decky plugin with a Quick Access Menu panel.

## Installation

Install or update Shortcuts from the [Playhub Plugin Store](https://github.com/LoZazaMastro/Playhub), or install it manually:

1. Download the installer ZIP from the [latest release](https://github.com/LoZazaMastro/Shortcuts/releases/latest).
2. Enable developer mode in Decky Loader.
3. Open **Decky > Settings > Developer > Install Plugin from ZIP**.
4. Select the downloaded archive.

## Development

The frontend source is deployable JavaScript and is copied to `dist/index.js` by the build script.

```bash
npm run build
npm test
```

On Windows, create the installable archive and the complete project archive with:

```powershell
.\package-win.ps1
```

Shortcuts uses Decky's internal QAM tab registry because Decky does not currently expose a public API for independent top-level tabs. The integration is guarded and leaves native tabs and tabs owned by other plugins untouched, but a future Decky update may require an adjustment.

## License and acknowledgements

Shortcuts is distributed under the [GPL-3.0-only license](LICENSE). Complete third-party notices are available in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Special thanks to **Juan Diego MaLó ([Hooandee](https://github.com/Hooandee))** for discovering the method used to inject custom tabs into the Quick Access Menu. The QAM registration and render-reconciliation work is adapted from Panel de Control by Hooandee and contributors under GPL-3.0-only.

The icon picker uses [Tabler Icons](https://tabler.io/icons), released under the MIT License. Thank you to the Tabler team and contributors for making such a broad, consistent icon set available. The license notice is included in [LICENSES/Tabler-Icons-MIT.txt](LICENSES/Tabler-Icons-MIT.txt).

Cover photo by [cottonbro studio](https://www.pexels.com/@cottonbro/) from [Pexels](https://www.pexels.com/).

Shortcuts does not package code or assets from the plugins it exposes. It references their already-loaded runtime panels, which remain part of their own installations.

<div align="center">

Created and maintained by **[LoZazaMastro](https://github.com/LoZazaMastro)**.

</div>
