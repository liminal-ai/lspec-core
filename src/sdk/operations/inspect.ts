import { inspectSpecPack } from "../../core/spec-pack.js";
import { inspectResultSchema } from "../../core/result-contracts.js";
import type { InspectInput, InspectResult } from "../contracts/operations.js";
import {
	ensureReadyTeamImplLog,
	finalizeEnvelope,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

function inspectErrors(result: Awaited<ReturnType<typeof inspectSpecPack>>) {
	if (result.status !== "blocked") {
		return [];
	}

	if (
		result.blockers.some((blocker) =>
			blocker.startsWith("Unreadable prompt insert:"),
		)
	) {
		return [
			{
				code: "PROMPT_INSERT_INVALID",
				message: "Prompt insert inspection failed",
			},
		];
	}

	return [
		{
			code: "INVALID_SPEC_PACK",
			message: "Spec-pack inspection failed",
		},
	];
}

export async function inspect(input: InspectInput): Promise<InspectResult> {
	return await withSdkExecutionContext(input, async () => {
		const startedAt = new Date().toISOString();
		const inspection = await inspectSpecPack(input.specPackRoot);
		await ensureReadyTeamImplLog({
			specPackRoot: inspection.specPackRoot,
			stories: inspection.stories,
			status: inspection.status,
		});
		const artifactPath = await resolveOperationArtifactPath({
			command: "inspect",
			specPackRoot: inspection.specPackRoot,
			artifactPath: input.artifactPath,
		});

		return await finalizeEnvelope({
			command: "inspect",
			artifactPath,
			startedAt,
			outcome: inspection.status,
			resultSchema: inspectResultSchema,
			result: inspection,
			errors: inspectErrors(inspection),
		});
	});
}
