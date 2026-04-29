import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { writeAtomic } from "../../src/infra/fs-atomic";
import { withRuntimeDeps } from "../../src/core/runtime-deps";
import { AtomicWriteError } from "../../src/sdk/errors";
import { createTempDir } from "../test-helpers";

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
