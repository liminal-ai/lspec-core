import { runQuickFix } from "../../core/quick-fix.js";
import { quickFixResultSchema } from "../../core/result-contracts.js";
import {
	quickFixInputSchema,
	type QuickFixInput,
	type QuickFixResult,
} from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function quickFix(input: QuickFixInput): Promise<QuickFixResult> {
	const parsedInput = parseSdkInput(quickFixInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "quick-fix",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
		});

		try {
			const outcome = await runQuickFix({
				specPackRoot: parsedInput.specPackRoot,
				request: parsedInput.request,
				workingDirectory: parsedInput.workingDirectory,
				configPath: parsedInput.configPath,
				env: parsedInput.env,
				artifactPath,
				streamOutputPaths: parsedInput.streamOutputPaths,
				runtimeProgressPaths: parsedInput.runtimeProgressPaths,
			});
			return await finalizeEnvelope({
				command: "quick-fix",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				resultSchema: quickFixResultSchema,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "quick-fix",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: quickFixResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
