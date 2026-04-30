import { describe, expect, test } from "vitest";

import { parseClaudeCodePayload } from "../../../src/core/provider-adapters/claude-code";
import { getScenarioDefinition } from "../../support/fixtures/real-provider-scenarios";
import { readProviderFixtures } from "./helpers";

const provider = "claude-code" as const;
const fixturesPromise = readProviderFixtures(provider);
const scenarios = ["resume", "smoke", "stall", "structured-output"] as const;

describe("claude-code parser-contract fixtures", () => {
	for (const scenario of scenarios) {
		test(`TC-5.3a/TC-5.3b: ${scenario} captured output parses through the production parser with exact parsed-shape diffs`, async () => {
			const fixture = (await fixturesPromise).find(
				(entry) => entry.name === `${scenario}.txt`,
			);
			expect(fixture).toBeDefined();
			expect(fixture?.provenance.scenario).toBe(scenario);

			const definition = getScenarioDefinition(provider, scenario);
			const parsed = parseClaudeCodePayload({
				stdout: fixture?.stdout ?? "",
				resultSchema: definition.schema,
			});

			expect(parsed.parseError).toBeUndefined();
			expect(parsed.sessionId).toEqual(expect.any(String));
			expect(parsed.parsedResult).toEqual(definition.expected);
		});
	}
});
