import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const greenVerify = spawnSync(process.execPath, ["./scripts/green-verify.mjs"], {
  cwd: root,
  stdio: "inherit"
});

if (greenVerify.status !== 0) {
  process.exit(greenVerify.status ?? 1);
}

const readme = await readFile(resolve(root, "README.md"), "utf8");
if (!readme.includes("verify-all")) {
  throw new Error("Expected README.md to describe the verify-all script.");
}
