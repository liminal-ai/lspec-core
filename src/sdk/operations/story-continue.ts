import { runStoryContinue } from "../../core/story-implementor.js";
import { implementorResultSchema } from "../../core/result-contracts.js";
import type {
	StoryContinueInput,
	StoryContinueResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function storyContinue(
	input: StoryContinueInput,
): Promise<StoryContinueResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-continue",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
			group: input.storyId,
			fileName: "continue",
		});

		try {
			const outcome = await runStoryContinue({
				specPackRoot: input.specPackRoot,
				storyId: input.storyId,
				provider: input.continuationHandle.provider,
				sessionId: input.continuationHandle.sessionId,
				followupRequest: input.followupRequest,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
			});
			return await finalizeEnvelope({
				command: "story-continue",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				resultSchema: implementorResultSchema,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "story-continue",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: implementorResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
