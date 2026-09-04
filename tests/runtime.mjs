import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

class LocalStorage {
    constructor() {
        this.values = new Map();
    }

    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

class TabsHook {
    constructor(tabs) {
        this.tabs = tabs;
    }

    add(tab) {
        this.tabs.push(tab);
    }

    removeById(id) {
        this.tabs = this.tabs.filter((tab) => tab.id !== id);
    }

    render(existingTabs, visible) {
        const count = existingTabs.reduce((total, tab) => tab.decky ? total + 1 : total, 0);
        if (count === this.tabs.length) {
            for (const tab of existingTabs) {
                if (!tab.decky) continue;
                if (tab.qAMVisibilitySetter) tab.qAMVisibilitySetter(visible);
                else tab.initialVisibility = visible;
            }
            return undefined;
        }
        for (const { title, icon, content, id } of this.tabs) {
            existingTabs.push({
                key: id,
                title,
                tab: icon,
                decky: true,
                panel: { content },
                initialVisibility: visible
            });
        }
        return undefined;
    }
}

const element = (type, props, ...children) => ({
    type,
    props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children }
});

const component = function Component() {};
const listeners = new Map();
const eventBus = new EventTarget();
const deckyTab = { id: 999, title: null, content: {}, icon: {} };
const plugins = [
    { name: "Alpha", version: "1.0.0", content: element("alpha"), icon: element("i-alpha") },
    { name: "Beta", version: "1.0.0", content: element("beta"), icon: element("i-beta") },
    { name: "Gamma", version: "1.0.0", content: element("gamma"), icon: element("i-gamma") }
];
const state = {
    plugins,
    installedPlugins: plugins,
    disabledPlugins: [],
    activePlugin: null
};
const deckyState = {
    eventBus,
    publicState() {
        return state;
    },
    closeActivePlugin() {
        state.activePlugin = null;
        eventBus.dispatchEvent(new Event("update"));
    }
};
const hook = new TabsHook([deckyTab]);
const storage = new LocalStorage();
storage.setItem("shortcuts:preferences:v1", JSON.stringify({ version: 2, selected: ["Alpha", "Beta"], icons: {} }));

globalThis.SP_REACT = {
    createElement: element,
    Fragment: Symbol("Fragment")
};
globalThis.DFL = {
    staticClasses: { Title: "title" },
    ErrorBoundary: component,
    DialogButton: component,
    Focusable: component,
    PanelSection: component,
    PanelSectionRow: component,
    ButtonItem: component
};
globalThis.localStorage = storage;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US" } });
globalThis.SteamClient = { Settings: { GetCurrentLanguage() { return "italian"; } } };
globalThis.window = {
    __TABS_HOOK_INSTANCE: hook,
    DeckyPluginLoader: { deckyState },
    addEventListener(name, listener) {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) {
        listeners.get(name)?.delete(listener);
    }
};

const moduleUrl = `${pathToFileURL(new URL("../dist/index.js", import.meta.url).pathname).href}?test=${Date.now()}`;
const pluginModule = await import(moduleUrl);
const plugin = pluginModule.default();
const runtime = plugin.content.props.runtime;

assert.equal(plugin.name, "Shortcuts");
assert.equal(runtime.getSnapshot().language, "it");
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Alpha", "Beta"]);
assert.equal(Object.prototype.hasOwnProperty.call(hook, "render"), true);
runtime.setIcon("Alpha", "star");
assert.equal(runtime.getSnapshot().icons.Alpha, "star");
assert.equal(hook.tabs.find((tab) => tab.__shortcutsPlugin === "Alpha").icon.props.id, "star");

const rendered = [{ key: "native", decky: false }];
hook.render(rendered, true);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), hook.tabs.map((tab) => tab.id));
assert.equal(new Set(rendered.filter((tab) => tab.decky).map((tab) => tab.key)).size, hook.tabs.length);

runtime.add("Gamma");
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Alpha", "Beta", "Gamma"]);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), hook.tabs.map((tab) => tab.id));

runtime.move("Gamma", -1);
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Alpha", "Gamma", "Beta"]);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), hook.tabs.map((tab) => tab.id));

runtime.remove("Alpha");
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Gamma", "Beta"]);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), hook.tabs.map((tab) => tab.id));

state.plugins.splice(state.plugins.findIndex((entry) => entry.name === "Gamma"), 1);
eventBus.dispatchEvent(new Event("update"));
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Beta"]);
assert.deepEqual(runtime.getSnapshot().selected, ["Gamma", "Beta"]);

plugin.onDismount();
assert.equal(hook.tabs.some((tab) => tab.__shortcutsOwner), false);
assert.equal(Object.prototype.hasOwnProperty.call(hook, "render"), false);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), [999]);

console.log("Shortcuts runtime tests passed");
