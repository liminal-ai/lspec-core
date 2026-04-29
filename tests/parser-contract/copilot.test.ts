import { describe, expect, test } from "vitest";

import { readProviderFixtures } from "./helpers";

describe("copilot parser-contract fixtures", () => {
	test("accepts an empty fixture set until captured outputs land", async () => {
		const fixtures = await readProviderFixtures("copilot");
		expect(fixtures).toEqual([]);
	});
});
