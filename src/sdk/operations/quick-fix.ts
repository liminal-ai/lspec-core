import { runQuickFix } from "../../core/quick-fix.js";
import type { QuickFixInput, QuickFixResult } from "../contracts/operations.js";
import {
	buildUnexpectedEnvelope,
	finalizeUnknownEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

export async function quickFix(input: QuickFixInput): Promise<QuickFixResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "quick-fix",
			specPackRoot: input.specPackRoot,
			artifactPath: input.artifactPath,
		});

		try {
			const outcome = await runQuickFix({
				specPackRoot: input.specPackRoot,
				request: input.request,
				workingDirectory: input.workingDirectory,
				configPath: input.configPath,
				env: input.env,
				artifactPath,
				streamOutputPaths: input.streamOutputPaths,
				runtimeProgressPaths: input.runtimeProgressPaths,
			});
			return (await finalizeUnknownEnvelope({
				command: "quick-fix",
				artifactPath,
				startedAt,
				outcome: outcome.outcome,
				result: outcome.result,
				errors: outcome.errors,
				warnings: outcome.warnings,
			})) as QuickFixResult;
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "quick-fix",
				artifactPath,
				startedAt,
				error,
			});
			return (await finalizeUnknownEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				errors: envelope.errors,
			})) as QuickFixResult;
		}
	});
}
