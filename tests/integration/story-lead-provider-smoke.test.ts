import { describe, expect, test } from "vitest";

import {
	storyOrchestrateRun,
	storyOrchestrateStatus,
} from "../../src/sdk/operations/story-orchestrate";
import {
	createRunConfig,
	createSpecPack,
	readJsonLines,
	writeRunConfig,
} from "../support/test-helpers";
import { seedPrimitiveArtifact } from "../support/story-orchestrate-fixtures";
import {
	assertExecutableOnPath,
	INTEGRATION_AUTH_SKIP_MODE,
	INTEGRATION_ENABLED,
} from "./helpers";

const describeIntegration = INTEGRATION_ENABLED ? describe : describe.skip;
const providers = ["claude-code", "codex"] as const;

function maybeSkipStoryLeadAuthFailure(
	context: { skip(message: string): never },
	provider: (typeof providers)[number],
	envelope: {
		status: string;
		errors: Array<{ code: string; detail?: string; message: string }>;
	},
) {
	const detail = envelope.errors
		.map((error) => `${error.code} ${error.message} ${error.detail ?? ""}`)
		.join("\n");

	if (
		/authentication|authenticated|unauthorized|login|sign in|token|api key|No authentication information found/i.test(
			detail,
		)
	) {
		if (!INTEGRATION_AUTH_SKIP_MODE) {
			throw new Error(
				`${provider} story-lead smoke was blocked by missing or failed authentication. Set LSPEC_INTEGRATION_SKIP_AUTH_FAILURES=1 only for local/dev skip mode.`,
			);
		}

		context.skip(
			`${provider} story-lead smoke skipped because authentication is unavailable: ${envelope.errors[0]?.message ?? "provider unavailable"}`,
		);
	}
}

async function createStoryLeadSmokeFixture(
	provider: (typeof providers)[number],
): Promise<{ specPackRoot: string; storyId: string }> {
	const specPackRoot = await createSpecPack(
		`story-lead-provider-smoke-${provider}`,
		{
			companionMode: "four-file",
		},
	);
	const storyId = "00-foundation";

	await writeRunConfig(
		specPackRoot,
		createRunConfig({
			story_lead: {
				secondary_harness: provider === "claude-code" ? "none" : provider,
				model: provider === "claude-code" ? "sonnet" : "gpt-5.4",
				reasoning_effort: "low",
			},
			caller_harness: {
				harness: "codex",
				story_heartbeat_cadence_minutes: 10,
			},
			verification_gates: {
				story: "true",
				epic: "true",
			},
		}),
	);

	await seedPrimitiveArtifact({
		specPackRoot,
		storyId,
		fileName: "001-implementor.json",
		payload: {
			command: "story-implement",
			outcome: "ready-for-verification",
		},
	});
	await seedPrimitiveArtifact({
		specPackRoot,
		storyId,
		fileName: "002-verifier.json",
		payload: {
			command: "story-verify",
			outcome: "pass",
		},
	});

	return { specPackRoot, storyId };
}

describeIntegration("story-lead provider smoke coverage", () => {
	for (const provider of providers) {
		test(`TC-2.9a/TC-5.4: ${provider} story-lead selection reaches a terminal outcome and records durable session artifacts`, async (context) => {
			await assertExecutableOnPath(provider);
			const fixture = await createStoryLeadSmokeFixture(provider);
			const envelope = await storyOrchestrateRun({
				specPackRoot: fixture.specPackRoot,
				storyId: fixture.storyId,
			});

			maybeSkipStoryLeadAuthFailure(context, provider, envelope);

			expect(envelope.command).toBe("story-orchestrate run");
			expect(envelope.result?.case).toBe("completed");

			if (envelope.result?.case !== "completed") {
				throw new Error(
					`Expected a completed story-lead smoke result for ${provider}, received ${envelope.result?.case ?? envelope.status}.`,
				);
			}

			const status = await storyOrchestrateStatus({
				specPackRoot: fixture.specPackRoot,
				storyId: fixture.storyId,
				storyRunId: envelope.result.storyRunId,
			});
			const events = await readJsonLines<
				Array<{ type: string; data?: Record<string, unknown> }>[number]
			>(envelope.result.eventHistoryPath);

			expect(status.result).toEqual(
				expect.objectContaining({
					case: "single-attempt",
					storyRunId: envelope.result.storyRunId,
				}),
			);
			expect(events).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: expect.stringMatching(
							/story-lead-provider-(started|resumed)/,
						),
						data: expect.objectContaining({
							provider,
						}),
					}),
				]),
			);
			expect(envelope.result.finalPackagePath).toEqual(expect.any(String));
			expect(await Bun.file(envelope.result.finalPackagePath).exists()).toBe(
				true,
			);
		}, 240_000);
	}
});
