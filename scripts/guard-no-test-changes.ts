import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
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

async function collectCurrentEntries(): Promise<BaselineEntry[]> {
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
	let baseline: BaselineEntry[];

	try {
		baseline = JSON.parse(
			await readFile(BASELINE_PATH, "utf8"),
		) as BaselineEntry[];
	} catch {
		console.error(
			`Missing test baseline at ${BASELINE_PATH}. Run npm run capture:test-baseline after the red phase.`,
		);
		process.exit(1);
		return;
	}

	const baselineMap = new Map(
		baseline.map((entry) => [entry.path, entry.sha256]),
	);
	const currentMap = new Map(
		(await collectCurrentEntries()).map((entry) => [entry.path, entry.sha256]),
	);
	const changedPaths = new Set<string>();

	for (const [path, sha256] of currentMap) {
		if (baselineMap.get(path) !== sha256) {
			changedPaths.add(path);
		}
	}

	for (const path of baselineMap.keys()) {
		if (!currentMap.has(path)) {
			changedPaths.add(path);
		}
	}

	if (changedPaths.size > 0) {
		console.error("Test files changed after the captured red-phase baseline:");
		for (const path of [...changedPaths].sort((left, right) =>
			left.localeCompare(right),
		)) {
			console.error(`- ${path}`);
		}
		process.exit(1);
		return;
	}

	console.log("No test file changes detected since the captured baseline.");
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
