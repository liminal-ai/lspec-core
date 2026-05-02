import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { discoverStoryRunState } from "../../../src/core/story-run-discovery";
import { InvalidSpecPackError } from "../../../src/sdk/errors";
import { createSpecPack } from "../../support/test-helpers";

describe("story-run discovery", () => {
	test("TC-2.2a accepts a valid story id and classifies it as ready to start", async () => {
		const specPackRoot = await createSpecPack("story-run-discovery-valid");

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId: "00-foundation",
		});

		expect(selection).toEqual({
			case: "start-new",
		});
	});

	test("TC-2.2b returns invalid-story-id without creating story-lead state", async () => {
		const specPackRoot = await createSpecPack("story-run-discovery-invalid");
		const artifactsRoot = join(specPackRoot, "artifacts");

		const selection = await discoverStoryRunState({
			specPackRoot,
			storyId: "99-does-not-exist",
		});

		expect(selection).toEqual({
			case: "invalid-story-id",
			storyId: "99-does-not-exist",
		});
		expect(await Bun.file(artifactsRoot).exists()).toBe(false);
	});

	test("surfaces invalid spec-pack structure before attempting story-id validation", async () => {
		const specPackRoot = await createSpecPack("story-run-discovery-missing", {
			includeStoriesDir: false,
		});

		await expect(
			discoverStoryRunState({
				specPackRoot,
				storyId: "00-foundation",
			}),
		).rejects.toBeInstanceOf(InvalidSpecPackError);
	});
});
