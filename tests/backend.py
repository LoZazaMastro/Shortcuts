import asyncio
import importlib.util
import os
import sys
import tempfile
import types


async def run():
    with tempfile.TemporaryDirectory() as directory:
        decky = types.SimpleNamespace(DECKY_PLUGIN_SETTINGS_DIR=directory)
        sys.modules["decky"] = decky
        path = os.path.join(os.path.dirname(__file__), "..", "main.py")
        spec = importlib.util.spec_from_file_location("shortcuts_backend", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        plugin = module.Plugin()
        await plugin._main()
        initial = await plugin.get_state()
        assert initial == {
            "version": 3,
            "selected": [],
            "icons": {},
            "order": [],
            "updated_at": 0,
            "exists": False,
        }
        saved = await plugin.save_state(
            ["Alpha", " Alpha ", "Shortcuts", 4, "Beta"],
            {
                "Alpha": "brand-discord-outline",
                "Beta": "circle-letter-a",
                "Missing": "bolt",
                "Alpha ": "wrench",
                "Beta ": "bad/icon",
            },
            123456,
            ["steam:0", "shortcut:Alpha", "decky:999", "steam:0", "steam:", "invalid"],
        )
        assert saved == {
            "version": 3,
            "selected": ["Alpha", "Beta"],
            "icons": {"Alpha": "brand-discord-outline", "Beta": "circle-letter-a"},
            "order": ["steam:0", "shortcut:Alpha", "decky:999"],
            "updated_at": 123456,
            "exists": True,
        }
        loaded = await plugin.get_state()
        assert loaded == saved
        assert os.path.isfile(os.path.join(directory, "state.json"))

        restarted = module.Plugin()
        await restarted._main()
        assert await restarted.get_state() == saved

        await restarted.save_state(
            ["Beta"],
            {"Beta": "circle-letter-a"},
            234567,
            ["steam:4", "shortcut:Beta"],
        )
        assert os.path.isfile(os.path.join(directory, "state.json.bak"))
        with open(os.path.join(directory, "state.json"), "w", encoding="utf-8") as handle:
            handle.write("{broken")

        recovered = module.Plugin()
        await recovered._main()
        assert await recovered.get_state() == saved


asyncio.run(run())
print("Shortcuts backend tests passed")
