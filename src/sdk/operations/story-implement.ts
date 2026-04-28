import { runStoryImplement } from "../../core/story-implementor.js";
import { implementorResultSchema } from "../../core/result-contracts.js";
import type {
	StoryImplementInput,
	StoryImplementResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function storyImplement(
	input: StoryImplementInput,
): Promise<StoryImplementResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-implement",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
			group: input.storyId,
			fileName: "implementor",
		});

		try {
			const outcome = await runStoryImplement({
				specPackRoot: input.specPackRoot,
				storyId: input.storyId,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
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
