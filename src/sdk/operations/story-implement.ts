import { runStoryImplement } from "../../core/story-implementor.js";
import { implementorResultSchema } from "../../core/result-contracts.js";
import {
	storyImplementInputSchema,
	type StoryImplementInput,
	type StoryImplementResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function storyImplement(
	input: StoryImplementInput,
): Promise<StoryImplementResult> {
	const parsedInput = parseSdkInput(storyImplementInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-implement",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: parsedInput.storyId,
			fileName: "implementor",
		});

		try {
			const outcome = await runStoryImplement({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
				configPath: parsedInput.configPath,
				env: parsedInput.env,
				artifactPath,
				streamOutputPaths: parsedInput.streamOutputPaths,
				runtimeProgressPaths: parsedInput.runtimeProgressPaths,
			});
			return await finalizeEnvelope({
				command: "story-implement",
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
				command: "story-implement",
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
