import { nextGroupedArtifactPaths } from "../../core/artifact-writer.js";
import {
	MAX_SELF_REVIEW_PASSES,
	MIN_SELF_REVIEW_PASSES,
	loadRunConfig,
} from "../../core/config-schema.js";
import { storySelfReviewResultSchema } from "../../core/result-contracts.js";
import { runStorySelfReview } from "../../core/story-implementor.js";
import type {
	StorySelfReviewInput,
	StorySelfReviewResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

async function resolvePassArtifactPaths(
	input: StorySelfReviewInput,
): Promise<string[]> {
	if (input.passArtifactPaths.length > 0) {
		return input.passArtifactPaths;
	}

	const allocatedPaths = await nextGroupedArtifactPaths(
		input.specPackRoot,
		input.storyId,
		Array.from({ length: input.passes }, (_, index) => {
			return `self-review-pass-${index + 1}`;
		}),
	);
	return allocatedPaths;
}

export async function storySelfReview(
	input: StorySelfReviewInput,
): Promise<StorySelfReviewResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-self-review",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
			group: input.storyId,
			fileName: "self-review-batch",
		});

		const resolvedPasses =
			Number.isNaN(input.passes) || input.passes <= 0
				? (
						await loadRunConfig({
							specPackRoot: input.specPackRoot,
							configPath: input.configPath,
						})
					).self_review.passes
				: input.passes;

		if (
			resolvedPasses < MIN_SELF_REVIEW_PASSES ||
			resolvedPasses > MAX_SELF_REVIEW_PASSES
		) {
			return await finalizeEnvelope({
				command: "story-self-review",
				artifactPath,
				startedAt,
				outcome: "error",
				resultSchema: storySelfReviewResultSchema,
				errors: [
					{
						code: "INVALID_INVOCATION",
						message: `passes must be between ${MIN_SELF_REVIEW_PASSES} and ${MAX_SELF_REVIEW_PASSES}.`,
					},
				],
			});
		}

		try {
			const passArtifactPaths = await resolvePassArtifactPaths({
				...input,
				passes: resolvedPasses,
			});
			const outcome = await runStorySelfReview({
				specPackRoot: input.specPackRoot,
				storyId: input.storyId,
				provider: input.continuationHandle.provider,
				sessionId: input.continuationHandle.sessionId,
				passes: resolvedPasses,
				passArtifactPaths,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
			});
			const passArtifacts =
				outcome.result?.passArtifacts ?? outcome.passArtifacts ?? [];
			return await finalizeEnvelope({
				command: "story-self-review",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				resultSchema: storySelfReviewResultSchema,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
				additionalArtifacts: passArtifacts.map((artifact) => ({
					kind: "self-review-pass",
					path: artifact.path,
				})),
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "story-self-review",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: storySelfReviewResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
