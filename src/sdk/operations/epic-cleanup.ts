import { runEpicCleanup } from "../../core/epic-cleanup.js";
import { epicCleanupResultSchema } from "../../core/result-contracts.js";
import {
	type EpicCleanupInput,
	type EpicCleanupResult,
	epicCleanupInputSchema,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function epicCleanup(
	input: EpicCleanupInput,
): Promise<EpicCleanupResult> {
	const parsedInput = parseSdkInput(epicCleanupInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "epic-cleanup",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: "cleanup",
			fileName: "cleanup-result",
		});

		try {
			const outcome = await runEpicCleanup({
				specPackRoot: parsedInput.specPackRoot,
				cleanupBatchPath: parsedInput.cleanupBatchPath,
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
