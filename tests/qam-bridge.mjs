import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = (await readFile(new URL("../dist/index.js", import.meta.url), "utf8"))
  .replace("export default function ShortcutsPlugin", "function ShortcutsPlugin") + "\nthis.createPlugin = ShortcutsPlugin;";
const BRIDGE = Symbol.for("shortcuts.qam-bridge.v1");
const key = "shortcuts:preferences:v1";
async function fixture(local, remote) {
  const values = new Map(local ? [[key, JSON.stringify(local)]] : []);
  const saves = [];
  let resolveRemote;
  const remotePromise = new Promise((resolve) => { resolveRemote = resolve; });
  class Hook {
    tabs = [{ id: 999, content: {}, icon: {} }];
    add(tab) { this.tabs.push(tab); }
    removeById(id) { this.tabs = this.tabs.filter((tab) => tab.id !== id); }
    render(tabs, visible) {
      if (tabs.filter((tab) => tab.decky).length === this.tabs.length) {
        for (const tab of tabs) if (tab.decky) tab.initialVisibility = visible;
        return;
      }
      for (const tab of this.tabs) tabs.push({ key: tab.id, decky: true, panel: {}, initialVisibility: visible });
    }
  }
  const host = new EventTarget();
  host.__TABS_HOOK_INSTANCE = new Hook();
  host.DeckyPluginLoader = { deckyState: { publicState: () => ({ plugins: [], installedPlugins: [] }) } };
  host.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit = {
    connect: () => ({ callable: (name) => name === "get_state" ? () => remotePromise : async (...args) => { saves.push(args); } })
  };
  const context = vm.createContext({
    window: host, Event, WeakRef, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    navigator: { language: "en" },
    localStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) },
    SP_REACT: { createElement: (type, props) => ({ type, props }), Fragment: "fragment" },
    DFL: { staticClasses: {} },
  });
  vm.runInContext(source, context);
  const plugin = context.createPlugin();
  return { plugin, runtime: plugin.content.props.runtime, bridge: host[BRIDGE], host, values, saves,
    hydrate: () => resolveRemote(remote) };
}
const entry = { name: "Playhub", content: {}, icon: {}, defaultVisible: true };
for (const local of [null, { selected: [], order: [], updatedAt: 1 }]) {
  const f = await fixture(local, { exists: false });
  const registered = f.bridge.register(entry);
  assert.equal(f.bridge.getVisible("Playhub"), false, "registration waits for hydration");
  f.hydrate();
  const release = await registered;
  assert.equal(f.bridge.getVisible("Playhub"), local === null);
  if (!local) assert.equal(f.runtime.tabOrder[0], "shortcut:Playhub");
  await f.bridge.setVisible("Playhub", true);
  const order = [...f.runtime.tabOrder];
  let notifications = 0;
  const unsubscribe = f.bridge.subscribe(() => notifications++);
  f.runtime.remove("Playhub");
  assert.equal(f.bridge.getVisible("Playhub"), false);
  assert.deepEqual([...f.runtime.tabOrder], order);
  await f.bridge.setVisible("Playhub", true);
  await f.bridge.register(entry);
  assert.equal(f.host.__TABS_HOOK_INSTANCE.tabs.filter((tab) => tab.__shortcutsPlugin === "Playhub").length, 1);
  assert.ok(notifications > 0);
  release(); // Stale cleanup cannot unregister the replacement.
  assert.equal(f.runtime.registrations.size, 1);
  unsubscribe();
  await f.bridge.setVisible("Playhub", false);
  const persisted = JSON.parse(f.values.get(key));
  f.plugin.onDismount();
  assert.equal(f.host[BRIDGE], undefined);
  const restart = await fixture(persisted, { exists: true, selected: persisted.selected, order: persisted.order, updated_at: persisted.updatedAt });
  restart.hydrate();
  await restart.bridge.register(entry);
  assert.equal(restart.bridge.getVisible("Playhub"), false, "hidden survives restart");
  restart.plugin.onDismount();
}
const f = await fixture(null, { exists: true, selected: ["Other"], order: ["steam:4", "shortcut:Other"], updated_at: 50 });
const waiting = f.bridge.register(entry);
f.hydrate(); await waiting;
assert.equal(f.bridge.getVisible("Playhub"), false);
assert.deepEqual([...f.runtime.tabOrder], ["steam:4", "shortcut:Other"]);
assert.equal(f.saves.length, 0, "existing backend settings are not rewritten by registration");
f.plugin.onDismount();
for (const selected of [[], ["Other"]]) {
  const crossWindow = await fixture(null, { exists: true, selected: ["Playhub"], updated_at: 100 });
  const external = { selected, icons: {}, order: [], updatedAt: 0 };
  crossWindow.values.set(key, JSON.stringify(external));
  const event = new Event("storage");
  Object.defineProperty(event, "key", { value: key });
  crossWindow.host.dispatchEvent(event);
  assert.equal(crossWindow.runtime.configured, true);
  assert.equal(crossWindow.runtime.preferenceRevision, 1, "even identical empty settings protect against pending hydration");
  crossWindow.hydrate();
  await crossWindow.bridge.register(entry);
  assert.equal(crossWindow.bridge.getVisible("Playhub"), false);
  assert.deepEqual([...crossWindow.runtime.selected], selected, "registration preserves cross-window selection");
  crossWindow.plugin.onDismount();
}
console.log("Shortcuts QAM bridge tests passed");
