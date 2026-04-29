import { describe, expect, test } from "vitest";

import {
	assertExecutableOnPath,
	assertPersistedEnvelope,
	envelopeFailureSummary,
	INTEGRATION_ENABLED,
	runSmoke,
	sdkEnvelopeSchemas,
	skipIfProviderAuthUnavailable,
} from "./helpers";

const describeIntegration = INTEGRATION_ENABLED ? describe : describe.skip;
const providers = ["claude-code", "codex", "copilot"] as const;

describeIntegration("real-provider smoke coverage", () => {
	for (const provider of providers) {
		test(`TC-5.1a: ${provider} package operation returns a valid envelope and artifact`, async (context) => {
			await assertExecutableOnPath(provider);
			const { envelope } = await runSmoke(provider);
			skipIfProviderAuthUnavailable(context, provider, envelope);

			expect(envelope.command).toBe("story-implement");
			expect(envelope.status, envelopeFailureSummary(envelope)).toBe("ok");
			expect(envelope.outcome).toBe("ready-for-verification");
			expect(envelope.result?.continuation.sessionId).toEqual(
				expect.any(String),
			);
			expect(envelope.artifacts[0]?.path).toEqual(expect.any(String));
			const persisted =
				await assertPersistedEnvelope<typeof envelope>(envelope);
			expect(sdkEnvelopeSchemas.implementor.parse(persisted)).toEqual(envelope);
		}, 240_000);
	}
});
