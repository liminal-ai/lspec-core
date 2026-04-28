import { ensureTeamImplLog } from "../../core/log-template.js";
import { classifyCommandError } from "../../core/command-errors.js";
import {
	nextArtifactPath,
	nextGroupedArtifactPath,
	writeJsonArtifact,
} from "../../core/artifact-writer.js";
import {
	cliResultEnvelopeSchema,
	createResultEnvelope,
	epicCleanupResultSchema,
	epicSynthesisResultSchema,
	epicVerifierBatchResultSchema,
	implementorResultSchema,
	inspectResultSchema,
	preflightResultSchema,
	storySelfReviewResultSchema,
	storyVerifierResultSchema,
} from "../../core/result-contracts.js";
import { withRuntimeDeps } from "../../core/runtime-deps.js";
import type {
	ExecFileImplementation,
	FileSystemAdapter,
	SpawnImplementation,
} from "../contracts/operations.js";
import type { z } from "zod";

export {
	epicCleanupResultSchema,
	epicSynthesisResultSchema,
	epicVerifierBatchResultSchema,
	implementorResultSchema,
	inspectResultSchema,
	preflightResultSchema,
	storySelfReviewResultSchema,
	storyVerifierResultSchema,
};

export interface SdkExecutionInput {
	fs?: FileSystemAdapter;
	spawn?: SpawnImplementation;
	execFile?: ExecFileImplementation;
}

export async function withSdkExecutionContext<T>(
	input: SdkExecutionInput,
	callback: () => Promise<T>,
): Promise<T> {
	return await withRuntimeDeps(
		{
			fs: input.fs,
			spawn: input.spawn,
			execFile: input.execFile,
		},
		callback,
	);
}

export function buildUnexpectedEnvelope(input: {
	command: string;
	outcome?: "block" | "blocked";
	error: unknown;
	artifactPath: string;
	startedAt: string;
}) {
	const classification = classifyCommandError(input.error, input.outcome);
	return createResultEnvelope({
		command: input.command,
		outcome: classification.outcome,
		errors: [
			{
				code: classification.code,
				message:
					input.error instanceof Error
						? input.error.message
						: String(input.error),
			},
		],
		artifacts: [
			{
				kind: "result-envelope",
				path: input.artifactPath,
			},
		],
		startedAt: input.startedAt,
		finishedAt: new Date().toISOString(),
	});
}

export async function finalizeEnvelope<TSchema extends z.ZodTypeAny>(input: {
	command: string;
	artifactPath: string;
	startedAt: string;
	outcome: string;
	resultSchema: TSchema;
	result?: z.infer<TSchema>;
	errors?: {
		code: string;
		message: string;
		detail?: string;
	}[];
	warnings?: string[];
	additionalArtifacts?: {
		kind: string;
		path: string;
	}[];
}) {
	const envelope = cliResultEnvelopeSchema(input.resultSchema).parse(
		createResultEnvelope({
			command: input.command,
			outcome: input.outcome,
			result: input.result,
			errors: input.errors,
			warnings: input.warnings,
			artifacts: [
				...(input.additionalArtifacts ?? []),
				{
					kind: "result-envelope",
					path: input.artifactPath,
				},
			],
			startedAt: input.startedAt,
			finishedAt: new Date().toISOString(),
		}),
	);

	await writeJsonArtifact(input.artifactPath, envelope);
	return envelope;
}

export async function finalizeUnknownEnvelope<T>(input: {
	command: string;
	artifactPath: string;
	startedAt: string;
	outcome: string;
	result?: T;
	errors?: {
		code: string;
		message: string;
		detail?: string;
	}[];
	warnings?: string[];
}) {
	const envelope = createResultEnvelope({
		command: input.command,
		outcome: input.outcome,
		result: input.result,
		errors: input.errors,
		warnings: input.warnings,
		artifacts: [
			{
				kind: "result-envelope",
				path: input.artifactPath,
			},
		],
		startedAt: input.startedAt,
		finishedAt: new Date().toISOString(),
	});

	await writeJsonArtifact(input.artifactPath, envelope);
	return envelope;
}

export async function resolveOperationArtifactPath(input: {
	command: string;
	specPackRoot: string;
	artifactPath?: string;
	group?: string;
	fileName?: string;
}): Promise<string> {
	if (input.artifactPath) {
		return input.artifactPath;
	}

	if (input.group && input.fileName) {
		return await nextGroupedArtifactPath(
			input.specPackRoot,
			input.group,
			input.fileName,
		);
	}

	return await nextArtifactPath(input.specPackRoot, input.command);
}

export async function ensureReadyTeamImplLog(input: {
	specPackRoot: string;
	stories: { id: string }[];
	status: string;
}) {
	if (input.status !== "ready") {
		return;
	}

	await ensureTeamImplLog({
		specPackRoot: input.specPackRoot,
		storyIds: input.stories.map((story) => story.id),
	});
}
