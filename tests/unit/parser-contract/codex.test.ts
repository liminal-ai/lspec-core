import { describe, expect, test } from "vitest";

import { parseCodexJsonlPayload } from "../../../src/core/provider-adapters/codex";
import { getScenarioDefinition } from "../../support/fixtures/real-provider-scenarios";
import { readProviderFixtures } from "./helpers";

const provider = "codex" as const;
const fixturesPromise = readProviderFixtures(provider);
const scenarios = ["resume", "smoke", "stall", "structured-output"] as const;

describe("codex parser-contract fixtures", () => {
	for (const scenario of scenarios) {
		test(`TC-5.3a/TC-5.3b: ${scenario} captured output parses through the production parser with exact parsed-shape diffs`, async () => {
			const fixture = (await fixturesPromise).find(
				(entry) => entry.name === `${scenario}.txt`,
			);
			expect(fixture).toBeDefined();
			expect(fixture?.provenance.scenario).toBe(scenario);

			const definition = getScenarioDefinition(provider, scenario);
			const parsed = parseCodexJsonlPayload({
				stdout: fixture?.stdout ?? "",
				resultSchema: definition.schema,
			});

			expect(parsed?.parseError).toBeUndefined();
			expect(parsed?.sessionId).toEqual(expect.any(String));
			expect(parsed?.parsedResult).toEqual(definition.expected);
		});
	}
});
