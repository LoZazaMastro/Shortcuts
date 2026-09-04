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
const alpha = { name: "Alpha", content: createElement("alpha"), icon: createElement("alpha-icon") };
const beta = { name: "Beta", content: createElement("beta"), icon: createElement("beta-icon") };
const storage = {
    value: JSON.stringify({ version: 2, selected: ["Alpha"], icons: { Alpha: "star" }, updatedAt: 100 }),
    getItem() {
        return this.value;
    },
    setItem(key, value) {
        this.value = value;
    }
};
const saves = [];
const api = {
    callable(method) {
        if (method === "get_state") {
            return async () => ({
                version: 2,
                selected: ["Beta"],
                icons: { Beta: "bolt" },
                updated_at: 200,
                exists: true
            });
        }
        if (method === "save_state") {
            return async (...args) => {
                saves.push(args);
                return {};
            };
        }
        return null;
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
    __DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit: {
        connect() {
            return api;
        }
    },
    __TABS_HOOK_INSTANCE: hook,
    DeckyPluginLoader: {
        deckyState: {
            eventBus,
            publicState() {
                return {
                    plugins: [alpha, beta],
                    installedPlugins: [alpha, beta],
                    disabledPlugins: [],
                    activePlugin: null
                };
            }
        }
    },
    addEventListener() {},
    removeEventListener() {}
};

const moduleUrl = new URL(`../dist/index.js?hydration=${Date.now()}`, import.meta.url).href;
const pluginModule = await import(moduleUrl);
const plugin = pluginModule.default();
const runtime = plugin.content.props.runtime;

assert.deepEqual(runtime.getSnapshot().selected, ["Alpha"]);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(runtime.getSnapshot().selected, ["Beta"]);
assert.deepEqual(runtime.getSnapshot().icons, { Beta: "bolt" });
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Beta"]);
assert.equal(saves.length, 0);
assert.deepEqual(JSON.parse(storage.value).selected, ["Beta"]);
assert.deepEqual(JSON.parse(storage.value).icons, { Beta: "bolt" });
assert.equal(JSON.parse(storage.value).updatedAt, 200);

plugin.onDismount();
console.log("Shortcuts preference hydration tests passed");
