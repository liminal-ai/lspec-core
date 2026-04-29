import {
	buildRuntimeProgressPaths,
	buildStreamOutputPaths,
	nextArtifactPath,
	nextGroupedArtifactPath,
	writeJsonArtifact,
} from "../../core/artifact-writer.js";
import { classifyCommandError } from "../../core/command-errors.js";
import {
	createResultEnvelope,
	type CliError,
} from "../../core/result-contracts.js";
import type { CliResultEnvelope } from "../../sdk/contracts/envelope.js";
import { mapStatusToExitCode, renderDefaultHumanSummary } from "../envelope.js";
import { writeHuman, writeJson } from "../output.js";

export interface ProviderArtifactOptions {
	artifactPath: string;
	runtimeProgressPaths: {
		statusPath: string;
		progressPath: string;
	};
	streamOutputPaths: {
		stdoutPath: string;
		stderrPath: string;
	};
}

export async function resolveCommandArtifactPath(input: {
	specPackRoot: string;
	command: string;
	group?: string;
	fileName?: string;
}): Promise<string> {
	if (input.group && input.fileName) {
		return await nextGroupedArtifactPath(
			input.specPackRoot,
			input.group,
			input.fileName,
		);
	}

	return await nextArtifactPath(input.specPackRoot, input.command);
}

export async function resolveProviderArtifactOptions(input: {
	specPackRoot: string;
	command: string;
	group?: string;
	fileName?: string;
}): Promise<ProviderArtifactOptions> {
	const artifactPath = await resolveCommandArtifactPath(input);
	return {
		artifactPath,
		streamOutputPaths: buildStreamOutputPaths(artifactPath),
		runtimeProgressPaths: buildRuntimeProgressPaths(artifactPath),
	};
}

export function emitCommandEnvelope<TResult>(input: {
	envelope: CliResultEnvelope<TResult>;
	json: boolean;
	renderHumanSummary?: (envelope: CliResultEnvelope<TResult>) => string;
}): void {
	if (input.json) {
		writeJson(input.envelope);
	} else {
		writeHuman(
			input.renderHumanSummary?.(input.envelope) ??
				renderDefaultHumanSummary(input.envelope),
		);
	}

	process.exitCode = mapStatusToExitCode(input.envelope.status);
}

export async function emitPersistedCommandEnvelope<TResult>(input: {
	artifactPath: string;
	envelope: CliResultEnvelope<TResult>;
	json: boolean;
	renderHumanSummary?: (envelope: CliResultEnvelope<TResult>) => string;
}): Promise<void> {
	await writeJsonArtifact(input.artifactPath, input.envelope);
	emitCommandEnvelope(input);
}

export function createInvalidInvocationEnvelope(input: {
	command: string;
	artifactPath: string;
	startedAt: string;
	message: string;
}): CliResultEnvelope<undefined> {
	return createResultEnvelope({
		command: input.command,
		outcome: "error",
		errors: [
			{
				code: "INVALID_INPUT",
				message: input.message,
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

export function createCommandErrorEnvelope(input: {
	command: string;
	artifactPath: string;
	startedAt: string;
	error: unknown;
	blockedOutcome?: "blocked" | "block";
	code?: CliError["code"];
	outcome?: string;
}): CliResultEnvelope<undefined> {
	const classification = classifyCommandError(
		input.error,
		input.blockedOutcome,
	);
	const code = input.code ?? classification.code;
	const outcome = input.outcome ?? classification.outcome;

	return createResultEnvelope({
		command: input.command,
		outcome,
		errors: [
			{
				code,
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
