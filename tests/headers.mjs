import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const block = source.slice(source.indexOf("function ShortcutHeader("), source.indexOf("function ShortcutPanel("));
const context = vm.createContext({
    DFL: { Focusable: "Focusable", staticClasses: { Title: "native-title" } },
    h: (type, props, ...children) => ({ type, props, children })
});
vm.runInContext(block + "\nthis.renderHeader = ShortcutHeader;", context);
const custom = { type: "CSSLoaderTitle", props: { buttons: [() => {}, () => {}] } };
const header = context.renderHeader({ name: "CSS Loader", titleView: custom });
assert.equal(header.props.style.width, "100%", "header follows the bounded content panel");
assert.equal(header.props.style.boxSizing, "border-box");
assert.equal(header.type, "Focusable", "header buttons retain controller navigation");
assert.equal(header.children[0], custom, "preserve original title component and its callbacks");
assert.equal(context.renderHeader({ name: "Legacy", legacyTitle: custom }).children[0], custom);
assert.match(source, /h\(Boundary, null, h\(ShortcutHeader, \{ name, titleView, legacyTitle \}\)\)/);
assert.match(source.slice(source.indexOf("descriptorFor(name")), /title: null/);
assert.match(source, /cached\.legacyTitle === plugin\.title/);
const identity = source.slice(source.indexOf("function PluginIdentity("), source.indexOf("function PluginIdentity(") + 2600);
assert.match(identity, /className: "shortcuts-identity-icon"/);
assert.match(identity, /\.shortcuts-identity-icon svg, \.shortcuts-identity-icon img/);
assert.match(identity, /width:100% !important; height:100% !important/);
console.log("Shortcuts header bounds and component-preservation checks passed");
