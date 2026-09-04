import { copyFile, mkdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../src/index.js", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../dist", import.meta.url));
const output = fileURLToPath(new URL("../dist/index.js", import.meta.url));

await mkdir(outputDirectory, { recursive: true });
await readFile(source, "utf8");
const check = spawnSync(process.execPath, ["--check", source], { stdio: "inherit" });
if (check.status !== 0) process.exit(check.status ?? 1);
await copyFile(source, output);
