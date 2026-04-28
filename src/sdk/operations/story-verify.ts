import { runStoryVerify } from "../../core/story-verifier.js";
import { storyVerifierResultSchema } from "../../core/result-contracts.js";
import type {
	StoryVerifyInput,
	StoryVerifyResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function storyVerify(
	input: StoryVerifyInput,
): Promise<StoryVerifyResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-verify",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
			group: input.storyId,
			fileName: "verify",
		});

		try {
			const outcome = await runStoryVerify({
				specPackRoot: input.specPackRoot,
				storyId: input.storyId,
				provider: input.provider,
				sessionId: input.sessionId,
				response: input.response,
				orchestratorContext: input.orchestratorContext,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
			});
			return await finalizeEnvelope({
				command: "story-verify",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				resultSchema: storyVerifierResultSchema,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "story-verify",
				artifactPath,
				startedAt,
				outcome: "block",
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: storyVerifierResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
