import { describe, expect, test } from "vitest";

import { assertExecutableOnPath, INTEGRATION_ENABLED } from "./helpers";

const providers = ["claude-code", "codex", "copilot"] as const;

describe("integration gating", () => {
	if (!INTEGRATION_ENABLED) {
		test("TC-5.2a: integration project stays gated off without LSPEC_INTEGRATION", () => {
			expect(process.env.LSPEC_INTEGRATION).toBeUndefined();
		});
	}

	if (INTEGRATION_ENABLED) {
		test("TC-5.2b: integration project runs with LSPEC_INTEGRATION enabled", async () => {
			expect(process.env.LSPEC_INTEGRATION).toBe("1");

			for (const provider of providers) {
				await assertExecutableOnPath(provider);
			}
		});
	}
});
