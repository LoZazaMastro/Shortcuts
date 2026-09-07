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
        const deckyTabs = existingTabs.filter((tab) => tab.decky);
        if (deckyTabs.length === this.tabs.length) return;
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
const alpha = { name: "Alpha", content: createElement("alpha"), icon: createElement("alpha-icon") };
const hook = new TabsHook();
const eventBus = new EventTarget();
const storage = {
    getItem() {
        return JSON.stringify({ version: 2, selected: ["Alpha"], icons: {} });
    },
    setItem() {}
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
const first = { key: 0, decky: false, marker: "first" };
const duplicate = { key: 0, decky: false, marker: "duplicate" };
globalThis.window = {
    __TABS_HOOK_INSTANCE: hook,
    DeckyPluginLoader: {
        deckyState: {
            eventBus,
            publicState() {
                return { plugins: [alpha], installedPlugins: [alpha], disabledPlugins: [], activePlugin: null };
            }
        }
    },
    addEventListener() {},
    removeEventListener() {}
};

const moduleUrl = new URL(`../dist/index.js?guards=${Date.now()}`, import.meta.url).href;
const pluginModule = await import(moduleUrl);
const plugin = pluginModule.default();
const runtime = plugin.content.props.runtime;
const rendered = [first, duplicate];

hook.render(rendered, true);
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(runtime.getSnapshot().status, "unsupported");
assert.equal(runtime.getSnapshot().detail, "duplicate_tab_keys");
assert.equal(rendered[0], first);
assert.equal(rendered[1], duplicate);

plugin.onDismount();
console.log("Shortcuts layout guard tests passed");
