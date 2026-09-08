import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = (await readFile(new URL("../dist/index.js", import.meta.url), "utf8"))
  .replace("export default function ShortcutsPlugin", "function ShortcutsPlugin") + "\nthis.createPlugin = ShortcutsPlugin;";
const BRIDGE = Symbol.for("shortcuts.qam-bridge.v1");
async function fixture() {
  let time = 100;
  let nextTimer = 0;
  const timers = new Map();
  class Hook {
    tabs = [{ id: 999, content: { type: "NativeProvider", props: { children: "PluginView" } }, icon: {} }];
    add(tab) { this.tabs.push(tab); }
    removeById(id) { this.tabs = this.tabs.filter(tab => tab.id !== id); }
    render(tabs, visible) {
      if (tabs.filter(tab => tab.decky).length === this.tabs.length) {
        for (const tab of tabs) if (tab.decky) {
          if (tab.qAMVisibilitySetter) tab.qAMVisibilitySetter(visible);
          else tab.initialVisibility = visible;
        }
        return;
      }
      for (const entry of this.tabs) {
        const tab = { key: entry.id, decky: true, initialVisibility: visible };
        tab.panel = { type: "NativeVisibilityProvider", tab, content: entry.content };
        tabs.push(tab);
      }
    }
  }
  const host = new EventTarget();
  host.__TABS_HOOK_INSTANCE = new Hook();
  host.DeckyPluginLoader = { deckyState: { publicState: () => ({ plugins: [], installedPlugins: [] }) } };
  const saved = [];
  host.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit = {
    connect: () => ({ callable: name => name === "get_state" ? async () => ({ exists: true, selected: ["Playhub"], order: ["steam:4", "decky:999", "shortcut:Playhub"] }) : async (...args) => saved.push(args) })
  };
  const context = vm.createContext({ window: host, Event, WeakRef, queueMicrotask,
    Date: class extends Date { static now() { return time; } },
    setTimeout: () => ++nextTimer, clearTimeout: () => {},
    setInterval: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearInterval: id => timers.delete(id), navigator: { language: "en" },
    localStorage: { getItem: () => null, setItem: () => {} },
    SP_REACT: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: "fragment" },
    DFL: { staticClasses: {} },
  });
  vm.runInContext(source, context);
  const plugin = context.createPlugin();
  const bridge = host[BRIDGE];
  const releaseRegistration = await bridge.register({ name: "Playhub", content: {}, defaultVisible: true });
  const runtime = plugin.content.props.runtime;
  const hook = host.__TABS_HOOK_INSTANCE;
  const id = hook.tabs.find(tab => tab.__shortcutsPlugin === "Playhub").id;
  let selected = true;
  const element = { isConnected: true, closest: () => ({ id: `quickaccess_content_${id}` }),
    ownerDocument: { getElementById: key => ({ getAttribute: () =>
      (key === "quickaccess_tab_999" ? !selected : selected) ? "true" : "false" }) } };
  const arrays = [[{ key: 4 }], [{ key: 4 }]];
  arrays.forEach((tabs, index) => hook.render(tabs, index === 0));
  const acquire = (extra = {}) => bridge.deckyHost.acquire({ element, createContent: root => ({ ...root, scoped: true }), isHealthy: () => true, ...extra });
  return { plugin, runtime, bridge, hook, arrays, element, saved, acquire, releaseRegistration,
    select: value => { selected = value; },
    advance: ms => { time += ms; [...timers.values()].forEach(callback => callback()); } };
}

const f = await fixture();
assert.equal(f.bridge.deckyHost.protocol, 1);
const registry = [...f.hook.tabs];
const baselines = f.arrays.map(tabs => [...tabs]);
const prefs = JSON.stringify({ order: f.runtime.tabOrder, selected: f.runtime.selected });
const lease = f.acquire();
assert.ok(lease);
assert.equal(f.acquire(), null, "only one owner can host Decky");
assert.notEqual(lease.panel.tab, baselines[0].find(tab => tab.key === 999));
assert.equal(lease.panel.content.scoped, true);
assert.ok(f.arrays.every(tabs => tabs.some(tab => tab.key === 999)), "acquisition alone never hides Decky");
assert.equal(lease.setActive(true), true);
assert.ok(f.arrays.every(tabs => tabs.some(tab => tab.key === 999)), "visibility alone never hides before commit");
assert.equal(lease.setReady(), true);
for (let i = 0; i < 8; i++) f.arrays.forEach((tabs, index) => f.hook.render(tabs, index === 0));
await new Promise(resolve => setImmediate(resolve));
assert.equal(f.arrays[0].some(tab => tab.key === 999), false);
assert.equal(f.arrays[1].some(tab => tab.key === 999), false);
assert.equal(f.runtime.status, "active");
assert.equal(lease.setNativeHidden(false), true);
for (let i = 0; i < 5; i++) f.arrays.forEach(tabs => f.hook.render(tabs, true));
assert.ok(f.arrays.every(tabs => tabs.filter(tab => tab.key === 999).length === 1));
assert.equal(lease.renew(), true, "showing native Decky must retain the host lease");
assert.equal(lease.setNativeHidden(true), true);
assert.ok(f.arrays.every(tabs => !tabs.some(tab => tab.key === 999)));
assert.deepEqual([...f.hook.tabs], registry);
assert.equal(JSON.stringify({ order: f.runtime.tabOrder, selected: f.runtime.selected }), prefs);
lease.setActive(false);
assert.ok(f.arrays.every(tabs => !tabs.some(tab => tab.key === 999)), "Decky stays hosted on Audio and other horizontal tabs");
assert.equal(lease.panel.tab.initialVisibility, false);
f.select(false); lease.setActive(true);
assert.ok(f.arrays.every(tabs => tabs.some(tab => tab.key === 999)), "do not hide when another QAM tab is selected");
f.select(true); lease.setActive(true);
f.runtime.moveTab("shortcut:Playhub", -1);
const changedOrder = [...f.runtime.tabOrder];
lease.release(); lease.release();
assert.deepEqual([...f.runtime.tabOrder], changedOrder, "release preserves the latest user order");
assert.ok(f.arrays.every(tabs => tabs.filter(tab => tab.key === 999).length === 1));
const layout = f.hook[Symbol.for("panel-de-control.qam-render-adapter")][Symbol.for("shortcuts.qam-tab-layout-adapter")];
assert.deepEqual(f.arrays[0].map(tab => tab.key), Array.from(layout.records, record => record.source.key));
f.plugin.onDismount();

for (const reason of ["hidden", "unregister", "registration_replaced", "detach", "expiry", "health_error", "hook_replaced", "unload", "root_replaced", "render_error"]) {
  const f = await fixture();
  let healthy = true;
  let released = 0;
  const lease = f.acquire({ isHealthy: () => { if (!healthy) throw Error("health"); return true; }, onRelease: () => released++ });
  lease.setActive(true);
  lease.setReady();
  assert.equal(f.arrays[0].some(tab => tab.key === 999), false);
  if (reason === "hidden") await f.bridge.setVisible("Playhub", false);
  if (reason === "unregister") f.releaseRegistration();
  if (reason === "registration_replaced") await f.bridge.register({ name: "Playhub", content: {}, defaultVisible: true });
  if (reason === "detach") { f.element.isConnected = false; f.advance(501); }
  if (reason === "expiry") f.advance(3001);
  if (reason === "health_error") { healthy = false; f.advance(501); }
  if (reason === "hook_replaced") { f.hook.render = () => {}; f.advance(501); }
  if (reason === "unload") f.plugin.onDismount();
  if (reason === "root_replaced") { f.hook.tabs[0].content = {}; f.advance(501); }
  if (reason === "render_error") {
    const state = f.hook[Symbol.for("panel-de-control.qam-render-adapter")];
    state.original = () => { throw Error("native renderer"); };
    f.hook.render(f.arrays[0], true);
  }
  assert.equal(released, 1, reason);
  assert.ok(f.arrays.every(tabs => tabs.some(tab => tab.key === 999)), `${reason}: restore every observed array`);
  assert.equal(lease.renew(), false);
  f.plugin.onDismount();
}
const rejected = await fixture();
assert.equal(rejected.acquire({ createContent: () => { throw Error("unsupported root"); } }), null);
assert.ok(rejected.arrays[0].some(tab => tab.key === 999));
rejected.plugin.onDismount();
console.log("Shortcuts Decky host lease and restoration tests passed");
