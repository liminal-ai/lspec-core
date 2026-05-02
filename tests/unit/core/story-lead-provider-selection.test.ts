import { describe, expect, test } from "vitest";

import { createStoryRunLedger } from "../../../src/core/story-run-ledger";
import { runStoryLead } from "../../../src/core/story-lead";
import {
	createTempDir,
	readJsonLines,
	writeFakeProviderExecutable,
} from "../../support/test-helpers";
import {
	createStoryOrchestrateSpecPack,
	seedPrimitiveArtifact,
} from "../../support/story-orchestrate-fixtures";

function codexJsonlEventStream(sessionId: string, finalText: string): string {
	return [
		JSON.stringify({
			type: "thread.started",
			thread_id: sessionId,
		}),
		JSON.stringify({
			type: "item.completed",
			item: {
				id: "item_1",
				type: "agent_message",
				text: finalText,
			},
		}),
		JSON.stringify({
			type: "turn.completed",
		}),
	].join("\n");
}

describe("story-lead provider selection", () => {
	test("TC-2.9a and TC-2.9b launch the configured Codex story-lead provider and persist its session in durable state", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-lead-provider-selection",
			{
				includeStoryLead: true,
			},
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

		const providerBinDir = await createTempDir(
			"story-lead-provider-selection-bin",
		);
		const sessionId = "codex-story-lead-session-001";
		const { env, logPath } = await writeFakeProviderExecutable({
			binDir: providerBinDir,
			provider: "codex",
			responses: [
				{
					stdout: codexJsonlEventStream(
						sessionId,
						JSON.stringify({
							summary:
								"Codex story-lead bootstrap confirmed the configured provider session.",
						}),
					),
					lastMessage: JSON.stringify({
						summary:
							"Codex story-lead bootstrap confirmed the configured provider session.",
					}),
				},
			],
		});

		const ledger = createStoryRunLedger({
			specPackRoot,
			storyId,
		});
		const runtime = await runStoryLead({
			specPackRoot,
			storyId,
			ledger,
			mode: "run",
			env: {
				PATH: `${providerBinDir}:${process.env.PATH ?? ""}`,
				...env,
			},
			startedFromPrimitiveArtifacts: [
				`${specPackRoot}/artifacts/${storyId}/001-implementor.json`,
				`${specPackRoot}/artifacts/${storyId}/002-verifier.json`,
			],
		});

		if (runtime.case !== "completed") {
			throw new Error(
				"Expected the configured story-lead provider run to complete.",
			);
		}

		const attempt = await ledger.getAttemptByStoryRunId(runtime.storyRunId);
		const invocations = await readJsonLines<{
			args: string[];
			cwd: string;
			provider: string;
		}>(logPath);
		const events = await readJsonLines<
			Array<{
				type: string;
				summary: string;
				data?: Record<string, unknown>;
			}>[number]
		>(runtime.eventHistoryPath);

		expect(attempt?.currentSnapshot.storyLeadSession).toEqual({
			provider: "codex",
			sessionId,
			model: "gpt-5.4",
			reasoningEffort: "high",
		});
		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "story-lead-provider-started",
					summary:
						"Codex story-lead bootstrap confirmed the configured provider session.",
					data: expect.objectContaining({
						provider: "codex",
						model: "gpt-5.4",
						sessionId,
					}),
				}),
			]),
		);
		expect(invocations).toHaveLength(1);
		expect(invocations[0]?.provider).toBe("codex");
		expect(invocations[0]?.args.slice(0, 6)).toEqual([
			"exec",
			"--json",
			"-m",
			"gpt-5.4",
			"-c",
			"model_reasoning_effort=high",
		]);
		expect(invocations[0]?.args).toContain("--output-schema");
		expect(invocations[0]?.args).toContain("-o");
		expect(invocations[0]?.args.join(" ")).toContain(`Story id: ${storyId}`);
	});
});
