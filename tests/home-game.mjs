import assert from "node:assert/strict";

class LocalStorage {
    constructor() {
        this.values = new Map();
    }

    getItem(key) {
        return this.values.get(key) ?? null;
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
        const deckyTabs = existingTabs.filter((tab) => tab.decky === true);
        if (deckyTabs.length === this.tabs.length) {
            for (const tab of deckyTabs) tab.initialVisibility = visible;
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
const deckyTab = { id: 999, title: null, content: {}, icon: {} };
const alpha = { name: "Alpha", version: "1.0.0", content: element("alpha"), icon: element("alpha-icon") };
const hook = new TabsHook([deckyTab]);

// Home's BrowserView rendered before Shortcuts loaded. This is the timing
// reported by users: the later in-game renderer works, while this array is stale.
const homeNative = { key: 0, decky: false, title: "Notifications", tab: element("notifications") };
const homeTabs = [homeNative];
hook.render(homeTabs, false);

// A similarly named prop elsewhere in Steam's tree must never be touched.
const decoyTabs = [{ key: "settings", decky: false }];
const reactRoot = {
    child: {
        memoizedProps: { tabs: decoyTabs },
        sibling: {
            memoizedProps: { tabs: homeTabs },
            child: null,
            sibling: null
        }
    }
};
const rootElement = {};
const documentListeners = new Map();
let qamVisible = true;
let visibilityHookCalls = 0;
const document = {
    visibilityState: "visible",
    getElementById(id) {
        return id === "root" ? rootElement : null;
    },
    addEventListener(name, listener) {
        if (!documentListeners.has(name)) documentListeners.set(name, new Set());
        documentListeners.get(name).add(listener);
    },
    removeEventListener(name, listener) {
        documentListeners.get(name)?.delete(listener);
    }
};
const eventBus = new EventTarget();
const state = {
    plugins: [alpha],
    installedPlugins: [alpha],
    disabledPlugins: [],
    activePlugin: null
};
const storage = new LocalStorage();
storage.setItem("shortcuts:preferences:v1", JSON.stringify({
    version: 2,
    selected: ["Alpha"],
    icons: { Alpha: "star" },
    updatedAt: 10
}));

globalThis.SP_REACT = {
    createElement: element,
    Fragment: Symbol("Fragment"),
    useCallback(callback) {
        return callback;
    },
    useEffect(callback) {
        callback();
    },
    useLayoutEffect() {},
    useRef(initialValue) {
        return { current: initialValue };
    },
    useState(initialValue) {
        return [initialValue, () => undefined];
    }
};
globalThis.DFL = {
    staticClasses: { Title: "title" },
    ErrorBoundary: component,
    DialogButton: component,
    Focusable: component,
    PanelSection: component,
    PanelSectionRow: component,
    ButtonItem: component,
    getReactRoot(node) {
        assert.equal(node, rootElement);
        return { current: reactRoot };
    }
};
globalThis.document = document;
globalThis.localStorage = storage;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "en-US" } });
globalThis.window = {
    __TABS_HOOK_INSTANCE: hook,
    __DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit: {
        connect() {
            return {
                useQuickAccessVisible() {
                    visibilityHookCalls += 1;
                    return qamVisible;
                }
            };
        }
    },
    DeckyPluginLoader: {
        deckyState: {
            eventBus,
            publicState() {
                return state;
            },
            closeActivePlugin() {
                state.activePlugin = null;
            }
        }
    },
    addEventListener() {},
    removeEventListener() {}
};

const moduleUrl = new URL(`../dist/index.js?home-game=${Date.now()}`, import.meta.url).href;
const pluginModule = await import(moduleUrl);
const plugin = pluginModule.default();
const runtime = plugin.content.props.runtime;

assert.deepEqual(decoyTabs, [{ key: "settings", decky: false }]);
assert.deepEqual(
    homeTabs.filter((tab) => tab.decky === true).map((tab) => tab.key),
    hook.tabs.map((tab) => tab.id),
    "the already-mounted Home QAM must be reconciled during plugin startup"
);
assert.equal(runtime.getSnapshot().observed, true);
const alphaTab = hook.tabs.find((tab) => tab.__shortcutsPlugin === "Alpha");
assert.equal(alphaTab.icon.props.id, "star");

const shortcutPanel = alphaTab.content.type(alphaTab.content.props);
const visibleGate = shortcutPanel.type(shortcutPanel.props);
assert.notEqual(visibleGate.props.children, null, "the official QAM visibility signal must show the panel at Home");
qamVisible = false;
const hiddenGate = shortcutPanel.type(shortcutPanel.props);
assert.equal(hiddenGate.props.children, null, "an inactive shortcut panel must stay unmounted");
assert.equal(visibilityHookCalls, 2);

const gameNative = { key: 4, decky: false, title: "Settings", tab: element("settings") };
const gameTabs = [gameNative];
hook.render(gameTabs, true);
assert.deepEqual(
    gameTabs.filter((tab) => tab.decky === true).map((tab) => tab.key),
    hook.tabs.map((tab) => tab.id),
    "the in-game QAM renderer must remain supported"
);

runtime.moveTab("shortcut:Alpha", -1);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(homeTabs.map((tab) => tab.key), [0, alphaTab.id, 999]);
assert.deepEqual(gameTabs.map((tab) => tab.key), [alphaTab.id, 999, 4]);

plugin.onDismount();
assert.deepEqual(homeTabs, [homeNative, homeTabs.find((tab) => tab.key === 999)].filter(Boolean));
assert.deepEqual(gameTabs, [gameNative, gameTabs.find((tab) => tab.key === 999)].filter(Boolean));
assert.deepEqual(hook.tabs.map((tab) => tab.id), [999]);
assert.equal(Object.prototype.hasOwnProperty.call(hook, "render"), false);

console.log("Shortcuts Home/in-game QAM regression tests passed");
