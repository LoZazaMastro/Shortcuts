import assert from "node:assert/strict";

class TabsHook {
    constructor() {
        this.tabs = [{ id: 999, title: null, content: {}, icon: {} }];
    }

    add(tab) {
        this.tabs.push(tab);
    }

    removeById(id) {
        this.tabs = this.tabs.filter((tab) => tab.id !== id);
    }

    render(existingTabs, visible) {
        const count = existingTabs.filter((tab) => tab.decky).length;
        if (count === this.tabs.length) {
            for (const tab of existingTabs) {
                if (tab.decky) tab.initialVisibility = visible;
            }
            return;
        }
        for (const tab of this.tabs) {
            existingTabs.push({ key: tab.id, decky: true, panel: {}, initialVisibility: visible });
        }
    }
}

const component = function Component() {};
const createElement = (type, props, ...children) => ({
    type,
    props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children }
});
const hook = new TabsHook();
const eventBus = new EventTarget();
const pluginEntry = { name: "Alpha", content: createElement("alpha"), icon: createElement("alpha-icon") };
const storage = {
    values: new Map(),
    getItem(key) {
        return this.values.get(key) ?? null;
    },
    setItem(key, value) {
        this.values.set(key, String(value));
    }
};

globalThis.SP_REACT = { createElement, Fragment: Symbol("Fragment") };
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
globalThis.window = {
    __TABS_HOOK_INSTANCE: hook,
    DeckyPluginLoader: {
        deckyState: {
            eventBus,
            publicState() {
                return {
                    plugins: [pluginEntry],
                    installedPlugins: [pluginEntry],
                    disabledPlugins: [],
                    activePlugin: null
                };
            }
        }
    },
    addEventListener() {},
    removeEventListener() {}
};

const moduleUrl = new URL(`../dist/index.js?empty=${Date.now()}`, import.meta.url).href;
const pluginModule = await import(moduleUrl);
const plugin = pluginModule.default();
const runtime = plugin.content.props.runtime;

assert.equal(Object.prototype.hasOwnProperty.call(hook, "render"), true);
assert.equal(hook.tabs.length, 1);

const rendered = [{ key: "native", decky: false }];
hook.render(rendered, true);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), [999]);

runtime.add("Alpha");
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Alpha"]);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), hook.tabs.map((tab) => tab.id));

runtime.remove("Alpha");
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), [999]);

plugin.onDismount();
assert.equal(Object.prototype.hasOwnProperty.call(hook, "render"), false);
assert.deepEqual(hook.tabs.map((tab) => tab.id), [999]);

console.log("Shortcuts empty-state tests passed");
