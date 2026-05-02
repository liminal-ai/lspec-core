import { runEpicSynthesize } from "../../core/epic-synthesizer.js";
import { epicSynthesisResultSchema } from "../../core/result-contracts.js";
import {
	type EpicSynthesisResult,
	type EpicSynthesizeInput,
	epicSynthesizeInputSchema,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function epicSynthesize(
	input: EpicSynthesizeInput,
): Promise<EpicSynthesisResult> {
	const parsedInput = parseSdkInput(epicSynthesizeInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "epic-synthesize",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: "epic",
			fileName: "epic-synthesis",
		});

		if (parsedInput.verifierReportPaths.length === 0) {
			return await finalizeEnvelope({
				command: "epic-synthesize",
				artifactPath,
				startedAt,
				outcome: "error",
				resultSchema: epicSynthesisResultSchema,
				errors: [
					{
						code: "INVALID_INPUT",
						message: "Provide at least one verifier report path.",
					},
				],
			});
		}

		try {
			const outcome = await runEpicSynthesize({
				specPackRoot: parsedInput.specPackRoot,
				verifierReportPaths: parsedInput.verifierReportPaths,
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
				command: "epic-synthesize",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				resultSchema: epicSynthesisResultSchema,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "epic-synthesize",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: epicSynthesisResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
