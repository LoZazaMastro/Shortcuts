import asyncio
import json
import os
import time

import decky


ICON_IDS = {
    "grid",
    "star",
    "bolt",
    "gamepad",
    "sliders",
    "gear",
    "music",
    "play",
    "cloud",
    "download",
    "folder",
    "image",
    "palette",
    "monitor",
    "wifi",
    "battery",
    "gauge",
    "trophy",
    "heart",
    "bookmark",
    "search",
    "globe",
    "terminal",
    "wrench",
    "shield",
    "cube",
    "layers",
}


class Plugin:
    async def _main(self):
        self._lock = asyncio.Lock()
        self._path = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "state.json")
        os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)

    async def get_state(self):
        async with self._lock:
            return await asyncio.to_thread(self._read_state)

    async def save_state(self, selected, icons=None, updated_at=0):
        if isinstance(icons, (int, float)) and updated_at == 0:
            updated_at = icons
            icons = {}
        normalized = self._normalize(selected)
        normalized_icons = self._normalize_icons(icons, normalized)
        timestamp = self._normalize_timestamp(updated_at)
        async with self._lock:
            await asyncio.to_thread(self._write_state, normalized, normalized_icons, timestamp)
        return {
            "version": 2,
            "selected": normalized,
            "icons": normalized_icons,
            "updated_at": timestamp,
            "exists": True,
        }

    def _read_state(self):
        if not os.path.isfile(self._path):
            return {"version": 2, "selected": [], "icons": {}, "updated_at": 0, "exists": False}
        try:
            with open(self._path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            selected = self._normalize(data.get("selected", []))
            return {
                "version": 2,
                "selected": selected,
                "icons": self._normalize_icons(data.get("icons", {}), selected),
                "updated_at": self._normalize_timestamp(data.get("updated_at", 0), False),
                "exists": True,
            }
        except (OSError, ValueError, TypeError, AttributeError):
            return {"version": 2, "selected": [], "icons": {}, "updated_at": 0, "exists": False}

    def _write_state(self, selected, icons, updated_at):
        temporary = f"{self._path}.tmp"
        with open(temporary, "w", encoding="utf-8") as handle:
            json.dump(
                {"version": 2, "selected": selected, "icons": icons, "updated_at": updated_at},
                handle,
                ensure_ascii=False,
                indent=2,
            )
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, self._path)

    def _normalize(self, selected):
        if not isinstance(selected, list):
            return []
        result = []
        seen = set()
        for entry in selected:
            if not isinstance(entry, str):
                continue
            name = entry.strip()
            key = name.casefold()
            if not name or key == "shortcuts" or key in seen:
                continue
            seen.add(key)
            result.append(name)
        return result

    def _normalize_icons(self, icons, selected):
        if not isinstance(icons, dict):
            return {}
        allowed = set(selected)
        result = {}
        for raw_name, raw_icon in icons.items():
            if not isinstance(raw_name, str) or not isinstance(raw_icon, str):
                continue
            name = raw_name.strip()
            icon = raw_icon.strip()
            if name not in allowed or icon not in ICON_IDS or name in result:
                continue
            result[name] = icon
        return result

    def _normalize_timestamp(self, value, create=True):
        try:
            timestamp = max(0, int(value))
        except (TypeError, ValueError, OverflowError):
            timestamp = 0
        if timestamp == 0 and create:
            return int(time.time() * 1000)
        return timestamp
