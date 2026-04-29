import { basename, dirname, join, resolve } from "node:path";

import { writeAtomic } from "../infra/fs-atomic.js";
import { IndexReservationError } from "../sdk/errors/classes.js";
import { mkdir, readdirDirents, rm, stat, writeFile } from "./runtime-deps";

const RESERVATION_RETRY_CAP = 10;
const STALE_RESERVATION_TIMEOUT_MS = 5 * 60 * 1_000;

async function nextArtifactPathForGroup(
	specPackRoot: string,
	group: string,
	fileName: string,
): Promise<string> {
	const [path] = await nextArtifactPathsForGroup(specPackRoot, group, [
		fileName,
	]);
	return path;
}

async function nextArtifactPathsForGroup(
	specPackRoot: string,
	group: string,
	fileNames: string[],
): Promise<string[]> {
	const artifactDir = join(resolve(specPackRoot), "artifacts", group);
	await mkdir(artifactDir, { recursive: true });

	await cleanupStaleReservations(artifactDir);

	let nextIndex = await findMaxArtifactIndex(artifactDir);
	const reservedPaths: string[] = [];

	for (const fileName of fileNames) {
		const reservedPath = await reserveArtifactPath(
			artifactDir,
			fileName,
			nextIndex + 1,
		);
		reservedPaths.push(reservedPath);
		nextIndex = extractArtifactIndex(reservedPath);
	}

	return reservedPaths;
}

async function findMaxArtifactIndex(artifactDir: string): Promise<number> {
	let maxIndex = 0;

	const scanDir = async (directoryPath: string) => {
		try {
			const entries = await readdirDirents(directoryPath);
			for (const entry of entries) {
				if (entry.isDirectory()) {
					continue;
				}

				const match = entry.name.match(/^(\d{3})-/);
				if (!match?.[1]) {
					continue;
				}

				const value = Number.parseInt(match[1], 10);
				if (Number.isFinite(value)) {
					maxIndex = Math.max(maxIndex, value);
				}
			}
		} catch {
			// Missing subdirs are fine; treat them as empty.
		}
	};

	await scanDir(artifactDir);
	await scanDir(join(artifactDir, "progress"));
	await scanDir(join(artifactDir, "streams"));

	return maxIndex;
}

async function cleanupStaleReservations(artifactDir: string): Promise<void> {
	const threshold = Date.now() - STALE_RESERVATION_TIMEOUT_MS;

	try {
		const staleBases = new Set<string>();
		const completedBases = new Set<string>();

		await collectStaleArtifactReservations(
			artifactDir,
			threshold,
			staleBases,
			completedBases,
		);
		await collectStaleSiblingReservations(
			join(artifactDir, "progress"),
			/^(\d{3}-.+)\.(?:status\.json|progress\.jsonl)$/,
			threshold,
			staleBases,
		);
		await collectStaleSiblingReservations(
			join(artifactDir, "streams"),
			/^(\d{3}-.+)\.(?:stdout|stderr)\.log$/,
			threshold,
			staleBases,
		);

		await Promise.all(
			[...staleBases]
				.filter((base) => !completedBases.has(base))
				.flatMap((base) => staleReservationPaths(artifactDir, base))
				.map((targetPath) =>
					rm(targetPath, {
						force: true,
					}),
				),
		);
	} catch {
		// Treat missing directories as empty.
	}
}

async function collectStaleArtifactReservations(
	artifactDir: string,
	threshold: number,
	staleBases: Set<string>,
	completedBases: Set<string>,
): Promise<void> {
	const entries = await readdirDirents(artifactDir);
	await Promise.all(
		entries.map(async (entry) => {
			if (entry.isDirectory() || !/^\d{3}-.+\.json$/.test(entry.name)) {
				return;
			}

			const base = basename(entry.name, ".json");
			const targetPath = join(artifactDir, entry.name);
			const details = await stat(targetPath);
			if (details.size > 0) {
				completedBases.add(base);
				return;
			}
			if (details.mtimeMs < threshold) {
				staleBases.add(base);
			}
		}),
	);
}

async function collectStaleSiblingReservations(
	directoryPath: string,
	pattern: RegExp,
	threshold: number,
	staleBases: Set<string>,
): Promise<void> {
	try {
		const entries = await readdirDirents(directoryPath);
		await Promise.all(
			entries.map(async (entry) => {
				if (entry.isDirectory()) {
					return;
				}

				const match = entry.name.match(pattern);
				const base = match?.[1];
				if (!base) {
					return;
				}

				const details = await stat(join(directoryPath, entry.name));
				if (details.mtimeMs < threshold) {
					staleBases.add(base);
				}
			}),
		);
	} catch {
		// Missing subdirs are fine; treat them as empty.
	}
}

function staleReservationPaths(artifactDir: string, base: string): string[] {
	return [
		join(artifactDir, `${base}.json`),
		join(artifactDir, "progress", `${base}.status.json`),
		join(artifactDir, "progress", `${base}.progress.jsonl`),
		join(artifactDir, "streams", `${base}.stdout.log`),
		join(artifactDir, "streams", `${base}.stderr.log`),
	];
}

async function reserveArtifactPath(
	artifactDir: string,
	fileName: string,
	startIndex: number,
): Promise<string> {
	let nextIndex = startIndex;

	for (let attempt = 0; attempt < RESERVATION_RETRY_CAP; attempt += 1) {
		const candidate = join(
			artifactDir,
			`${String(nextIndex).padStart(3, "0")}-${fileName}.json`,
		);

		try {
			await writeFile(candidate, "", {
				flag: "wx",
			});
			return candidate;
		} catch (error) {
			if (!isAlreadyExistsError(error)) {
				throw error;
			}
			nextIndex += 1;
		}
	}

	throw new IndexReservationError(
		`Failed to reserve an artifact index for ${fileName}.`,
		`artifactDir=${artifactDir}`,
	);
}

function extractArtifactIndex(path: string): number {
	const match = basename(path).match(/^(\d{3})-/);
	return Number.parseInt(match?.[1] ?? "0", 10);
}

function isAlreadyExistsError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "EEXIST";
}

export async function nextArtifactPath(
	specPackRoot: string,
	command: string,
): Promise<string> {
	return nextArtifactPathForGroup(specPackRoot, command, command);
}

export async function nextGroupedArtifactPath(
	specPackRoot: string,
	group: string,
	fileName: string,
): Promise<string> {
	return nextArtifactPathForGroup(specPackRoot, group, fileName);
}

export async function nextGroupedArtifactPaths(
	specPackRoot: string,
	group: string,
	fileNames: string[],
): Promise<string[]> {
	return nextArtifactPathsForGroup(specPackRoot, group, fileNames);
}

export async function writeJsonArtifact(
	path: string,
	payload: unknown,
): Promise<void> {
	await writeAtomic(path, `${JSON.stringify(payload)}\n`);
}

export function buildStreamOutputPaths(
	artifactPath: string,
	suffix?: string,
): {
	stdoutPath: string;
	stderrPath: string;
} {
	const artifactDir = dirname(artifactPath);
	const streamDir = join(artifactDir, "streams");
	const artifactBaseName = basename(artifactPath, ".json");
	const streamBaseName = suffix
		? `${artifactBaseName}.${suffix}`
		: artifactBaseName;

	return {
		stdoutPath: join(streamDir, `${streamBaseName}.stdout.log`),
		stderrPath: join(streamDir, `${streamBaseName}.stderr.log`),
	};
}

export function buildRuntimeProgressPaths(artifactPath: string): {
	statusPath: string;
	progressPath: string;
} {
	const artifactDir = dirname(artifactPath);
	const progressDir = join(artifactDir, "progress");
	const artifactBaseName = basename(artifactPath, ".json");

	return {
		statusPath: join(progressDir, `${artifactBaseName}.status.json`),
		progressPath: join(progressDir, `${artifactBaseName}.progress.jsonl`),
	};
}
