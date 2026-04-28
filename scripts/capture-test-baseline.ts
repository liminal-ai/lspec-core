import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = join(
	ROOT,
	".test-tmp",
	"green-verify",
	"test-file-baseline.json",
);

interface BaselineEntry {
	path: string;
	sha256: string;
}

async function collectTestFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		const relativePath = relative(ROOT, fullPath);

		if (
			relativePath.startsWith("node_modules") ||
			relativePath.startsWith("dist") ||
			relativePath.startsWith(".test-tmp")
		) {
			continue;
		}

		if (entry.isDirectory()) {
			files.push(...(await collectTestFiles(fullPath)));
			continue;
		}

		if (entry.isFile() && fullPath.endsWith(".test.ts")) {
			files.push(fullPath);
		}
	}

	return files;
}

async function collectTestBaseline(): Promise<BaselineEntry[]> {
	const testFiles = await collectTestFiles(join(ROOT, "tests"));
	const entries = await Promise.all(
		testFiles.map(async (path) => {
			const content = await readFile(path, "utf8");
			return {
				path: relative(ROOT, path),
				sha256: createHash("sha256").update(content).digest("hex"),
			};
		}),
	);

	return entries.sort((left, right) => left.path.localeCompare(right.path));
}

async function main() {
	const baseline = await collectTestBaseline();
	await mkdir(dirname(BASELINE_PATH), { recursive: true });
	await writeFile(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
	console.log(`Captured test baseline at ${BASELINE_PATH}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
