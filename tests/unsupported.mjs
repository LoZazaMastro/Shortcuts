import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const component = function Component() {};
const createElement = (type, props, ...children) => ({
    type,
    props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children }
});
const hook = {
    tabs: [{ id: 999, title: null, content: {}, icon: {} }],
    add(tab) {
        this.tabs.push(tab);
    },
    removeById(id) {
        this.tabs = this.tabs.filter((tab) => tab.id !== id);
    },
    render() {}
};
const pluginEntry = { name: "Alpha", content: createElement("alpha"), icon: createElement("alpha-icon") };
const eventBus = new EventTarget();
const storage = {
    getItem() {
        return JSON.stringify({ version: 1, selected: ["Alpha"] });
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

const moduleUrl = `${pathToFileURL(new URL("../dist/index.js", import.meta.url).pathname).href}?unsupported=${Date.now()}`;
const pluginModule = await import(moduleUrl);
const plugin = pluginModule.default();
const runtime = plugin.content.props.runtime;

assert.equal(runtime.getSnapshot().status, "unsupported");
assert.deepEqual(hook.tabs.map((tab) => tab.id), [999]);
assert.equal(hook.tabs.some((tab) => tab.__shortcutsOwner), false);

plugin.onDismount();
assert.deepEqual(hook.tabs.map((tab) => tab.id), [999]);

console.log("Shortcuts unsupported-renderer tests passed");
