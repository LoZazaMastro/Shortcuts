import asyncio
import json
import os
import re
import time

import decky


ICON_ID_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
MAX_ICON_ID_LENGTH = 128
MAX_ORDER_ENTRY_LENGTH = 384
ORDER_PREFIXES = ("steam:", "decky:", "shortcut:")
STATE_VERSION = 3


class Plugin:
    async def _main(self):
        self._lock = asyncio.Lock()
        self._path = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "state.json")
        self._backup_path = f"{self._path}.bak"
        os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)

    async def get_state(self):
        async with self._lock:
            return await asyncio.to_thread(self._read_state)

    async def save_state(self, selected, icons=None, updated_at=0, order=None):
        if isinstance(icons, (int, float)) and updated_at == 0:
            updated_at = icons
            icons = {}
        normalized = self._normalize(selected)
        normalized_icons = self._normalize_icons(icons, normalized)
        normalized_order = self._normalize_order(order)
        timestamp = self._normalize_timestamp(updated_at)
        async with self._lock:
            await asyncio.to_thread(
                self._write_state,
                normalized,
                normalized_icons,
                normalized_order,
                timestamp,
            )
        return {
            "version": STATE_VERSION,
            "selected": normalized,
            "icons": normalized_icons,
            "order": normalized_order,
            "updated_at": timestamp,
            "exists": True,
        }

    def _read_state(self):
        for path in (self._path, self._backup_path):
            state = self._read_state_file(path)
            if state is not None:
                return {**state, "exists": True}
        return self._empty_state()

    def _read_state_file(self, path):
        if not os.path.isfile(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            if not isinstance(data, dict):
                return None
            selected = self._normalize(data.get("selected", []))
            return {
                "version": STATE_VERSION,
                "selected": selected,
                "icons": self._normalize_icons(data.get("icons", {}), selected),
                "order": self._normalize_order(data.get("order", [])),
                "updated_at": self._normalize_timestamp(data.get("updated_at", 0), False),
            }
        except (OSError, ValueError, TypeError, AttributeError):
            return None

    def _empty_state(self):
        return {
            "version": STATE_VERSION,
            "selected": [],
            "icons": {},
            "order": [],
            "updated_at": 0,
            "exists": False,
        }

    def _write_json_atomic(self, path, payload):
        temporary = f"{path}.tmp"
        with open(temporary, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)

    def _write_state(self, selected, icons, order, updated_at):
        previous = self._read_state_file(self._path)
        if previous is not None:
            self._write_json_atomic(self._backup_path, previous)
        payload = {
            "version": STATE_VERSION,
            "selected": selected,
            "icons": icons,
            "order": order,
            "updated_at": updated_at,
        }
        self._write_json_atomic(self._path, payload)

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
            if (
                name not in allowed
                or not icon
                or len(icon) > MAX_ICON_ID_LENGTH
                or ICON_ID_PATTERN.fullmatch(icon) is None
                or name in result
            ):
                continue
            result[name] = icon
        return result

    def _normalize_order(self, order):
        if not isinstance(order, list):
            return []
        result = []
        seen = set()
        for entry in order:
            if not isinstance(entry, str):
                continue
            key = entry.strip()
            if (
                not key
                or len(key) > MAX_ORDER_ENTRY_LENGTH
                or not key.startswith(ORDER_PREFIXES)
                or not key.split(":", 1)[1]
                or key in seen
            ):
                continue
            seen.add(key)
            result.append(key)
        return result

    def _normalize_timestamp(self, value, create=True):
        try:
            timestamp = max(0, int(value))
        except (TypeError, ValueError, OverflowError):
            timestamp = 0
        if timestamp == 0 and create:
            return int(time.time() * 1000)
        return timestamp
