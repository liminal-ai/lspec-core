import { readdir, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { nextGroupedArtifactPath } from "../../src/core/artifact-writer";
import { IndexReservationError } from "../../src/sdk/errors";
import { withRuntimeDeps } from "../../src/core/runtime-deps";
import { createTempDir, writeTextFile } from "../test-helpers";

describe("artifact index reservation", () => {
	test("TC-4.5a: concurrent reservations receive distinct indexes", async () => {
		const specPackRoot = await createTempDir("index-reservation-concurrent");
		const [firstPath, secondPath] = await Promise.all([
			nextGroupedArtifactPath(specPackRoot, "story-03", "implementor"),
			nextGroupedArtifactPath(specPackRoot, "story-03", "implementor"),
		]);

		expect(new Set([firstPath, secondPath]).size).toBe(2);
		expect(await stat(firstPath)).toMatchObject({
			size: 0,
		});
		expect(await stat(secondPath)).toMatchObject({
			size: 0,
		});
	});

	test("TC-4.5c: stale zero-byte placeholders are reclaimed before a new reservation", async () => {
		const specPackRoot = await createTempDir("index-reservation-stale");
		const artifactDir = join(specPackRoot, "artifacts", "story-03");
		const stalePath = join(artifactDir, "001-implementor.json");
		await writeTextFile(stalePath, "");
		const staleDate = new Date(Date.now() - 10 * 60 * 1_000);
		await utimes(stalePath, staleDate, staleDate);

		const nextPath = await nextGroupedArtifactPath(
			specPackRoot,
			"story-03",
			"implementor",
		);

		expect(nextPath).toContain("/001-implementor.json");
		expect(await readdir(artifactDir)).toContain("001-implementor.json");
	});

	test("non-TC: reservation throws a typed error when the retry cap is exhausted", async () => {
		const specPackRoot = await createTempDir("index-reservation-exhausted");
		const artifactDir = join(specPackRoot, "artifacts", "story-03");

		await expect(
			withRuntimeDeps(
				{
					fs: {
						writeFile: async (path, content, options) => {
							if (
								typeof options === "object" &&
								options &&
								"flag" in options &&
								options.flag === "wx"
							) {
								const error = new Error("exists");
								Object.assign(error, {
									code: "EEXIST",
								});
								throw error;
							}
							return await writeFile(
								String(path),
								content as Parameters<typeof writeFile>[1],
								options as Parameters<typeof writeFile>[2],
							);
						},
					},
				},
				async () =>
					nextGroupedArtifactPath(specPackRoot, "story-03", "implementor"),
			),
		).rejects.toBeInstanceOf(IndexReservationError);

		expect(await readdir(join(specPackRoot, "artifacts"))).toContain(
			"story-03",
		);
		expect(await readdir(artifactDir)).toEqual([]);
	});
});
