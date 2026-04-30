import { describe, expect, it } from "vitest";
import { packageVersion } from "../../src/package-metadata.js";
import { version } from "../../src/sdk/index.js";

describe("smoke", () => {
	it("exports version", () => {
		expect(version).toBe(packageVersion);
	});
});
