import type { FileHandle } from "node:fs/promises";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";
import { withRuntimeDeps } from "../../../src/core/runtime-deps";
import { writeAtomic } from "../../../src/infra/fs-atomic";
import { AtomicWriteError } from "../../../src/sdk/errors";
import { createTempDir } from "../../support/test-helpers";

test("TC-4.4a: writeAtomic preserves the prior file when rename fails", async () => {
	const tempDir = await createTempDir("fs-atomic-rename-failure");
	const targetPath = join(tempDir, "artifact.json");
	await writeFile(targetPath, '{"before":true}\n', "utf8");

	await expect(
		withRuntimeDeps(
			{
				fs: {
					rename: async () => {
						const error = new Error("rename failed");
						Object.assign(error, {
							code: "EACCES",
						});
						throw error;
					},
				},
			},
			async () => writeAtomic(targetPath, '{"after":true}\n'),
		),
	).rejects.toBeInstanceOf(AtomicWriteError);

	expect(await readFile(targetPath, "utf8")).toBe('{"before":true}\n');
	expect(
		(await readdir(tempDir)).filter((name) => name.includes(".tmp.")),
	).toEqual([]);
});

test("TC-4.4b: writeAtomic fsyncs and closes the temp file before rename", async () => {
	const tempDir = await createTempDir("fs-atomic-durability-order");
	const targetPath = join(tempDir, "artifact.json");
	const events: string[] = [];

	const fileHandle = {
		writeFile: async () => {
			events.push("write-temp");
		},
		sync: async () => {
			events.push("fsync-temp");
		},
		close: async () => {
			events.push("close-temp");
		},
	};
	const directoryHandle = {
		sync: async () => {
			events.push("fsync-dir");
		},
		close: async () => {
			events.push("close-dir");
		},
	};

	await withRuntimeDeps(
		{
			fs: {
				open: async (path) =>
					(String(path).includes(".tmp.")
						? fileHandle
						: directoryHandle) as unknown as FileHandle,
				rename: async () => {
					events.push("rename");
				},
			},
		},
		async () => writeAtomic(targetPath, '{"after":true}\n'),
	);

	expect(events).toEqual([
		"write-temp",
		"fsync-temp",
		"close-temp",
		"rename",
		"fsync-dir",
		"close-dir",
	]);
});
