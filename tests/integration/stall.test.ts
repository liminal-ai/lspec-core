import { describe, expect, test } from "vitest";

import {
	assertExecutableOnPath,
	INTEGRATION_ENABLED,
	runRealProviderStall,
	skipIfProviderAuthUnavailable,
} from "./helpers";

const describeIntegration = INTEGRATION_ENABLED ? describe : describe.skip;
const providers = ["claude-code", "codex", "copilot"] as const;

describeIntegration("provider stall coverage", () => {
	for (const provider of providers) {
		test(`TC-5.1d: ${provider} real provider stall returns a blocked envelope`, async (context) => {
			await assertExecutableOnPath(provider);
			const { envelope } = await runRealProviderStall(provider);
			skipIfProviderAuthUnavailable(context, provider, envelope);

			expect(envelope.command).toBe("story-implement");
			expect(envelope.status).toBe("blocked");
			expect(envelope.errors[0]?.code).toBe("PROVIDER_STALLED");
			expect(envelope.errors[0]?.message).toContain("stalled");
		}, 60_000);
	}
});
