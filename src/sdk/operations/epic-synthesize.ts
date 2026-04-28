import { runEpicSynthesize } from "../../core/epic-synthesizer.js";
import { epicSynthesisResultSchema } from "../../core/result-contracts.js";
import type {
	EpicSynthesizeInput,
	EpicSynthesisResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function epicSynthesize(
	input: EpicSynthesizeInput,
): Promise<EpicSynthesisResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "epic-synthesize",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
			group: "epic",
			fileName: "epic-synthesis",
		});

		if (input.verifierReportPaths.length === 0) {
			return await finalizeEnvelope({
				command: "epic-synthesize",
				artifactPath,
				startedAt,
				outcome: "error",
				resultSchema: epicSynthesisResultSchema,
				errors: [
					{
						code: "INVALID_INVOCATION",
						message: "Provide at least one verifier report path.",
					},
				],
			});
		}

		try {
			const outcome = await runEpicSynthesize({
				specPackRoot: input.specPackRoot,
				verifierReportPaths: input.verifierReportPaths,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
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
