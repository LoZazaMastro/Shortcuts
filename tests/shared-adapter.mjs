import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

class TabsHook {
    constructor() {
        this.tabs = [
            { id: 999, title: null, content: {}, icon: {} },
            { id: 0x504443, title: {}, content: {}, icon: {}, __pdcOwner: "panel-de-control" }
        ];
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
            existingTabs.push({ key: tab.id, decky: true, panel: { content: tab.content }, initialVisibility: visible });
        }
    }
}

const component = function Component() {};
const createElement = (type, props, ...children) => ({
    type,
    props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children }
});
const hook = new TabsHook();
const original = hook.render;
const sharedSymbol = Symbol.for("panel-de-control.qam-render-adapter");
const sharedState = {
    protocol: 2,
    hook,
    original,
    wrapper: null,
    initialRegistry: hook.tabs.map((tab) => ({ tab, id: tab.id, title: tab.title, content: tab.content, icon: tab.icon, owner: tab.__pdcOwner })),
    arrayStates: new WeakMap(),
    observedArrays: [],
    releaseRequested: true,
    rendering: false,
    failure: null,
    failureListeners: new Set()
};
sharedState.wrapper = function (existingTabs, visible) {
    const native = existingTabs.filter((tab) => !tab.decky);
    const currentKeys = existingTabs.filter((tab) => tab.decky).map((tab) => String(tab.key));
    const desiredKeys = hook.tabs.map((tab) => String(tab.id));
    if (JSON.stringify(currentKeys) !== JSON.stringify(desiredKeys)) {
        const generated = [];
        original.call(hook, generated, visible);
        existingTabs.splice(0, existingTabs.length, ...native, ...generated);
    } else {
        original.call(hook, existingTabs, visible);
    }
    if (!sharedState.observedArrays.some((reference) => reference.deref() === existingTabs)) {
        sharedState.observedArrays.push(new WeakRef(existingTabs));
    }
    sharedState.arrayStates.set(existingTabs, { registry: [], visible });
};
Object.defineProperty(hook, sharedSymbol, { configurable: true, value: sharedState });
Object.defineProperty(hook, "render", { configurable: true, writable: true, value: sharedState.wrapper });

const pluginEntry = { name: "Alpha", content: createElement("alpha"), icon: createElement("alpha-icon") };
const eventBus = new EventTarget();
const storage = {
    value: JSON.stringify({ version: 1, selected: ["Alpha"] }),
    getItem() {
        return this.value;
    },
    setItem(key, value) {
        this.value = value;
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

const rendered = [{ key: "native", decky: false }];
hook.render(rendered, true);

const moduleUrl = `${pathToFileURL(new URL("../dist/index.js", import.meta.url).pathname).href}?shared=${Date.now()}`;
const pluginModule = await import(moduleUrl);
const plugin = pluginModule.default();

assert.equal(hook[sharedSymbol], sharedState);
assert.equal(sharedState.releaseRequested, false);
assert.deepEqual(hook.tabs.map((tab) => tab.id).slice(0, 2), [999, 0x504443]);
assert.deepEqual(hook.tabs.filter((tab) => tab.__shortcutsOwner).map((tab) => tab.__shortcutsPlugin), ["Alpha"]);
assert.deepEqual(rendered.filter((tab) => tab.decky).map((tab) => tab.key), hook.tabs.map((tab) => tab.id));

plugin.onDismount();
assert.equal(hook[sharedSymbol], sharedState);
assert.equal(hook.render, sharedState.wrapper);
assert.equal(hook.tabs.some((tab) => tab.__shortcutsOwner), false);
assert.deepEqual(hook.tabs.map((tab) => tab.id), [999, 0x504443]);

console.log("Shortcuts shared-adapter tests passed");
