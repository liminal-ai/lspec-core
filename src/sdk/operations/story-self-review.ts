import {
	buildRuntimeProgressPaths,
	buildStreamOutputPaths,
	nextGroupedArtifactPaths,
} from "../../core/artifact-writer.js";
import {
	MAX_SELF_REVIEW_PASSES,
	MIN_SELF_REVIEW_PASSES,
	loadRunConfig,
} from "../../core/config-schema.js";
import { storySelfReviewResultSchema } from "../../core/result-contracts.js";
import { runStorySelfReview } from "../../core/story-implementor.js";
import {
	storySelfReviewInputSchema,
	type StorySelfReviewInput,
	type StorySelfReviewResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
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

async function resolveSelfReviewArtifactPaths(
	input: StorySelfReviewInput,
	passes: number,
): Promise<{ artifactPath: string; passArtifactPaths: string[] }> {
	if (!input.artifactPath && input.passArtifactPaths.length === 0) {
		const allocatedPaths = await nextGroupedArtifactPaths(
			input.specPackRoot,
			input.storyId,
			[
				...Array.from({ length: passes }, (_, index) => {
					return `self-review-pass-${index + 1}`;
				}),
				"self-review-batch",
			],
		);
		const artifactPath = allocatedPaths[allocatedPaths.length - 1];
		if (typeof artifactPath !== "string") {
			throw new Error("Unable to allocate story-self-review artifact path.");
		}
		return {
			artifactPath,
			passArtifactPaths: allocatedPaths.slice(0, -1),
		};
	}

	const artifactPath = await resolveOperationArtifactPath({
		command: "story-self-review",
		specPackRoot: input.specPackRoot,
		artifactPath: input.artifactPath,
		group: input.storyId,
		fileName: "self-review-batch",
	});
	const passArtifactPaths = await resolvePassArtifactPaths({
		...input,
		passes,
	});
	return { artifactPath, passArtifactPaths };
}

export async function storySelfReview(
	input: StorySelfReviewInput,
): Promise<StorySelfReviewResult> {
	const parsedInput = parseSdkInput(storySelfReviewInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const resolvedPasses =
			Number.isNaN(parsedInput.passes) || parsedInput.passes <= 0
				? (
						await loadRunConfig({
							specPackRoot: parsedInput.specPackRoot,
							configPath: parsedInput.configPath,
						})
					).self_review.passes
				: parsedInput.passes;

		if (
			resolvedPasses < MIN_SELF_REVIEW_PASSES ||
			resolvedPasses > MAX_SELF_REVIEW_PASSES
		) {
			const artifactPath = await resolveOperationArtifactPath({
				command: "story-self-review",
				specPackRoot: parsedInput.specPackRoot,
				artifactPath: parsedInput.artifactPath,
				group: parsedInput.storyId,
				fileName: "self-review-batch",
			});
			return await finalizeEnvelope({
				command: "story-self-review",
				artifactPath,
				startedAt,
				outcome: "error",
				resultSchema: storySelfReviewResultSchema,
				errors: [
					{
						code: "INVALID_INPUT",
						message: `passes must be between ${MIN_SELF_REVIEW_PASSES} and ${MAX_SELF_REVIEW_PASSES}.`,
					},
				],
			});
		}

		let artifactPath = "";
		try {
			const resolvedArtifacts = await resolveSelfReviewArtifactPaths(
				parsedInput,
				resolvedPasses,
			);
			artifactPath = resolvedArtifacts.artifactPath;
			const outcome = await runStorySelfReview({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
				provider: parsedInput.continuationHandle.provider,
				sessionId: parsedInput.continuationHandle.sessionId,
				passes: resolvedPasses,
				passArtifactPaths: resolvedArtifacts.passArtifactPaths,
				configPath: parsedInput.configPath,
				env: parsedInput.env,
				artifactPath,
				streamOutputPaths:
					parsedInput.streamOutputPaths ?? buildStreamOutputPaths(artifactPath),
				runtimeProgressPaths:
					parsedInput.runtimeProgressPaths ??
					buildRuntimeProgressPaths(artifactPath),
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
			if (artifactPath.length === 0) {
				artifactPath = await resolveOperationArtifactPath({
					command: "story-self-review",
					specPackRoot: parsedInput.specPackRoot,
					artifactPath: parsedInput.artifactPath,
					group: parsedInput.storyId,
					fileName: "self-review-batch",
				});
			}
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
