import { chmod, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const binPath = resolve(import.meta.dirname, "..", "dist", "bin", "lspec.js");
const shebang = "#!/usr/bin/env node\n";
const current = await readFile(binPath, "utf8");

if (!current.startsWith(shebang)) {
	await writeFile(binPath, `${shebang}${current}`);
}

await chmod(binPath, 0o755);
