import { describe, expect, test } from "vitest";

import { readProviderFixtures } from "./helpers";

describe("codex parser-contract fixtures", () => {
	test("accepts an empty fixture set until captured outputs land", async () => {
		const fixtures = await readProviderFixtures("codex");
		expect(fixtures).toEqual([]);
	});
});
