# Changelog

## 1.2.0 - 2026-09-07

- Added one controller-friendly list for reordering Steam's native tabs, Decky's tab, compatible custom tabs and plugin shortcuts.
- Applied tab changes immediately from QAM renders, Decky events and user actions, with a slower background check used only as a fallback.
- Preserved live tab and panel instances while reordering to avoid unnecessary remounts and reduce latency.
- Added durable full-layout persistence with automatic migration from 1.0.x settings and recovery from the last valid backup.
- Added stricter compatibility checks and transactional cleanup so unexpected Steam or Decky changes leave the original QAM untouched.

## 1.0.1 - 2026-09-04

- Fixed custom tab icons reverting to the original plugin icons after restarting Shortcuts or Steam.

## 1.0.0 — 2026-09-04

- Initial release.
- Added selection of compatible Decky plugin panels.
- Added independent top-level QAM tabs.
- Added controller-friendly reordering and removal.
- Added durable settings with a local startup cache.
- Added automatic recovery for disabled, reloaded or temporarily unavailable plugins.
- Added guarded interoperability with Panel de Control's QAM adapter.
- Added Steam-language auto-detection with English as the fallback language.
- Added translated interface text for the main Steam languages supported by Shortcuts.
- Added per-plugin custom QAM icons with the original plugin icon first, followed by 59 bundled Tabler icons.
- Redesigned active shortcuts as spaced cards with icon selection and move/remove controls.
- Added ellipsis handling for long plugin names.
- Removed the information section from the bottom of the QAM panel.

- Replaced the custom-drawn icon set with Tabler Icons 3.46.0 and rebuilt controller navigation for true four-direction movement across the main page and icon grid.
