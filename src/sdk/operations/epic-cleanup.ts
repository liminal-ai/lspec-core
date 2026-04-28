import { runEpicCleanup } from "../../core/epic-cleanup.js";
import { epicCleanupResultSchema } from "../../core/result-contracts.js";
import type {
	EpicCleanupInput,
	EpicCleanupResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function epicCleanup(
	input: EpicCleanupInput,
): Promise<EpicCleanupResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "epic-cleanup",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
			group: "cleanup",
			fileName: "cleanup-result",
		});

		try {
			const outcome = await runEpicCleanup({
				specPackRoot: input.specPackRoot,
				cleanupBatchPath: input.cleanupBatchPath,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
			});
			return await finalizeEnvelope({
				command: "epic-cleanup",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				resultSchema: epicCleanupResultSchema,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "epic-cleanup",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: epicCleanupResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
