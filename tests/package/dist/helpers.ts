import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ROOT = resolve(import.meta.dirname, "../../..");
export const TYPESCRIPT_CLI = resolve(
	ROOT,
	"node_modules",
	"typescript",
	"bin",
	"tsc",
);

export async function run(
	file: string,
	args: string[],
	options: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
	} = {},
): Promise<{ stdout: string; stderr: string }> {
	const result = await execFileAsync(file, args, {
		cwd: options.cwd ?? ROOT,
		env: {
			...process.env,
			FORCE_COLOR: "0",
			...options.env,
		},
	});

	return {
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

export async function buildPackage(): Promise<void> {
	await run("npm", ["run", "build"]);
}

export async function createFixtureSpecPack(baseDir: string): Promise<string> {
	const specPackRoot = join(baseDir, "fixture");
	await mkdir(join(specPackRoot, "stories"), { recursive: true });
	await writeFile(join(specPackRoot, "epic.md"), "# Epic\n");
	await writeFile(join(specPackRoot, "tech-design.md"), "# Technical Design\n");
	await writeFile(join(specPackRoot, "test-plan.md"), "# Test Plan\n");
	await writeFile(
		join(specPackRoot, "stories", "00-foundation.md"),
		"# Story 0: Foundation\n",
	);
	await writeFile(
		join(specPackRoot, "stories", "01-next.md"),
		"# Story 1: Next\n",
	);

	return specPackRoot;
}

export async function createSandboxProject(scope: string): Promise<{
	root: string;
	fixtureRoot: string;
	cleanup: () => Promise<void>;
}> {
	const root = await mkdtemp(join(tmpdir(), `${scope}-`));
	await run("npm", ["init", "-y"], { cwd: root });
	await run("git", ["init"], { cwd: root });
	const fixtureRoot = await createFixtureSpecPack(root);

	return {
		root,
		fixtureRoot,
		cleanup: async () => {
			await rm(root, { recursive: true, force: true });
		},
	};
}

export async function packPackage(): Promise<{
	filename: string;
	path: string;
	files: string[];
	cleanup: () => Promise<void>;
}> {
	const { stdout } = await run("npm", ["pack", "--json"]);
	const parsed = JSON.parse(stdout) as Array<{
		filename?: string;
		files?: Array<{ path?: string }>;
	}>;
	const filename = parsed[0]?.filename;

	if (!filename) {
		throw new Error("npm pack did not report a tarball filename.");
	}

	return {
		filename,
		path: join(ROOT, filename),
		files: (parsed[0]?.files ?? [])
			.map((file) => file.path)
			.filter((path): path is string => typeof path === "string"),
		cleanup: async () => {
			await rm(join(ROOT, filename), { force: true });
		},
	};
}

export async function installTarball(
	sandboxRoot: string,
	tarballPath: string,
): Promise<void> {
	await run("npm", ["install", tarballPath], { cwd: sandboxRoot });
}
