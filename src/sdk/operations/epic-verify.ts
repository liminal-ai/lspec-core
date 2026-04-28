import { runEpicVerify } from "../../core/epic-verifier.js";
import { epicVerifierBatchResultSchema } from "../../core/result-contracts.js";
import type {
	EpicVerifyInput,
	EpicVerifyResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function epicVerify(
	input: EpicVerifyInput,
): Promise<EpicVerifyResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "epic-verify",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
			group: "epic",
			fileName: "epic-verifier-batch",
		});

		try {
			const outcome = await runEpicVerify({
				specPackRoot: input.specPackRoot,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
			});
			return await finalizeEnvelope({
				command: "epic-verify",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				resultSchema: epicVerifierBatchResultSchema,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "epic-verify",
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
				resultSchema: epicVerifierBatchResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
