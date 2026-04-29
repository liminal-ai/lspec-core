import { runStoryVerify } from "../../core/story-verifier.js";
import { storyVerifierResultSchema } from "../../core/result-contracts.js";
import {
	storyVerifyInputSchema,
	type StoryVerifyInput,
	type StoryVerifyResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function storyVerify(
	input: StoryVerifyInput,
): Promise<StoryVerifyResult> {
	const parsedInput = parseSdkInput(storyVerifyInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-verify",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: parsedInput.storyId,
			fileName: "verify",
		});

		try {
			const outcome = await runStoryVerify({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
				provider: parsedInput.provider,
				sessionId: parsedInput.sessionId,
				response: parsedInput.response,
				orchestratorContext: parsedInput.orchestratorContext,
				configPath: parsedInput.configPath,
				env: parsedInput.env,
				artifactPath,
				streamOutputPaths: parsedInput.streamOutputPaths,
				runtimeProgressPaths: parsedInput.runtimeProgressPaths,
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
