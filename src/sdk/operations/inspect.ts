import { inspectResultSchema } from "../../core/result-contracts.js";
import { inspectSpecPack } from "../../core/spec-pack.js";
import {
	type InspectInput,
	type InspectResult,
	inspectInputSchema,
} from "../contracts/operations.js";
import {
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

const promptInsertBlockers = new Set([
	"Unreadable prompt insert: custom-story-impl-prompt-insert.md",
	"Unreadable prompt insert: custom-story-verifier-prompt-insert.md",
]);

function inspectErrors(result: Awaited<ReturnType<typeof inspectSpecPack>>) {
	if (result.status !== "blocked") {
		return [];
	}

	if (result.blockers.some((blocker) => promptInsertBlockers.has(blocker))) {
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
	const parsedInput = parseSdkInput(inspectInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const inspection = await inspectSpecPack(parsedInput.specPackRoot);
		const artifactPath = await resolveOperationArtifactPath({
			command: "inspect",
			specPackRoot: inspection.specPackRoot,
			artifactPath: parsedInput.artifactPath,
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
