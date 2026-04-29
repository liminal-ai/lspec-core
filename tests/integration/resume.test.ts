import { describe, expect, test } from "vitest";

import {
	assertExecutableOnPath,
	assertPersistedEnvelope,
	envelopeFailureSummary,
	INTEGRATION_ENABLED,
	runResume,
	sdkEnvelopeSchemas,
	skipIfProviderAuthUnavailable,
} from "./helpers";

const describeIntegration = INTEGRATION_ENABLED ? describe : describe.skip;
const providers = ["claude-code", "codex", "copilot"] as const;

describeIntegration("real-provider resume coverage", () => {
	for (const provider of providers) {
		test(`TC-5.1b: ${provider} package continuation reuses the session handle`, async (context) => {
			await assertExecutableOnPath(provider);
			const { initial, resumed } = await runResume(provider);
			skipIfProviderAuthUnavailable(context, provider, initial);

			expect(initial.status, envelopeFailureSummary(initial)).toBe("ok");
			expect(initial.result?.continuation.sessionId).toEqual(
				expect.any(String),
			);
			expect(resumed).toBeDefined();
			if (!resumed) {
				throw new Error(
					"Expected resume operation to execute after initial run.",
				);
			}
			skipIfProviderAuthUnavailable(context, provider, resumed);
			expect(resumed.command).toBe("story-continue");
			expect(resumed.status, envelopeFailureSummary(resumed)).toBe("ok");
			expect(resumed.result?.continuation.sessionId).toBe(
				initial.result?.continuation.sessionId,
			);
			expect(resumed.result?.sessionId).toBe(
				initial.result?.continuation.sessionId,
			);
			const persisted = await assertPersistedEnvelope<typeof resumed>(resumed);
			expect(sdkEnvelopeSchemas.implementor.parse(persisted)).toEqual(resumed);
		}, 360_000);
	}
});
