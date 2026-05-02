import { implementorResultSchema } from "../../core/result-contracts.js";
import { runStoryContinue } from "../../core/story-implementor.js";
import {
	type StoryContinueInput,
	type StoryContinueResult,
	storyContinueInputSchema,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function storyContinue(
	input: StoryContinueInput,
): Promise<StoryContinueResult> {
	const parsedInput = parseSdkInput(storyContinueInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-continue",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: parsedInput.storyId,
			fileName: "continue",
		});

		try {
			const outcome = await runStoryContinue({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
				provider: parsedInput.continuationHandle.provider,
				sessionId: parsedInput.continuationHandle.sessionId,
				followupRequest: parsedInput.followupRequest,
				configPath: parsedInput.configPath,
				env: parsedInput.env,
				artifactPath,
				streamOutputPaths: parsedInput.streamOutputPaths,
				runtimeProgressPaths: parsedInput.runtimeProgressPaths,
				callerHarness: parsedInput.callerHarness,
				heartbeatCadenceMinutes: parsedInput.heartbeatCadenceMinutes,
				disableHeartbeats: parsedInput.disableHeartbeats,
				progressListener: parsedInput.progressListener,
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
