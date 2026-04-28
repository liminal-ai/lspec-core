import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { defineCommand } from "citty";

import {
	quickFix,
	type CliResultEnvelope,
	type QuickFixPayload,
} from "../../sdk/index.js";
import {
	createCommandErrorEnvelope,
	createInvalidInvocationEnvelope,
	emitCommandEnvelope,
	emitPersistedCommandEnvelope,
	resolveProviderArtifactOptions,
} from "./shared.js";

const REQUEST_CONTENT_LIMIT_BYTES = 128 * 1024;

async function resolveRequest(args: {
	"request-file"?: string;
	"request-text"?: string;
}): Promise<string> {
	const requestSources = [
		typeof args["request-file"] === "string" ? "file" : null,
		typeof args["request-text"] === "string" ? "text" : null,
	].filter(Boolean);

	if (requestSources.length !== 1) {
		throw new Error("Provide exactly one of --request-file or --request-text.");
	}

	if (args["request-text"]) {
		const request = args["request-text"].trim();
		if (request.length === 0) {
			throw new Error("--request-text cannot be empty.");
		}
		if (Buffer.byteLength(request, "utf8") > REQUEST_CONTENT_LIMIT_BYTES) {
			throw new Error(
				`--request-text exceeds the 128 KiB limit (${REQUEST_CONTENT_LIMIT_BYTES} bytes).`,
			);
		}
		return request;
	}

	const requestFile = args["request-file"];
	if (typeof requestFile !== "string") {
		throw new Error("Provide exactly one of --request-file or --request-text.");
	}

	const request = (await readFile(resolve(requestFile), "utf8")).trim();
	if (request.length === 0) {
		throw new Error(
			"--request-file cannot point to an empty task description.",
		);
	}
	if (Buffer.byteLength(request, "utf8") > REQUEST_CONTENT_LIMIT_BYTES) {
		throw new Error(
			`--request-file exceeds the 128 KiB limit (${REQUEST_CONTENT_LIMIT_BYTES} bytes).`,
		);
	}

	return request;
}

function hasFlag(rawArgs: string[], flag: string): boolean {
	return rawArgs.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}

function hasLegacyStoryAwareFlags(rawArgs: string[]): boolean {
	return (
		hasFlag(rawArgs, "--story-id") ||
		hasFlag(rawArgs, "--story-title") ||
		hasFlag(rawArgs, "--story-path") ||
		hasFlag(rawArgs, "--scope-file")
	);
}

function renderHumanSummary(
	envelope: CliResultEnvelope<QuickFixPayload>,
): string {
	return envelope.result
		? `${envelope.command}: ${envelope.outcome}\nprovider: ${envelope.result.provider}`
		: `${envelope.command}: ${envelope.outcome}`;
}

export default defineCommand({
	meta: {
		name: "quick-fix",
		description: "Run a bounded quick-fix with a free-form task description.",
	},
	args: {
		"spec-pack-root": {
			type: "string",
			description: "Absolute or relative path to the spec-pack root",
			required: true,
		},
		"request-file": {
			type: "string",
			description: "Path to a file containing the free-form quick-fix task",
		},
		"request-text": {
			type: "string",
			description: "Inline free-form quick-fix task description",
		},
		"working-directory": {
			type: "string",
			description: "Working directory for the quick-fix provider invocation",
		},
		config: {
			type: "string",
			description: "Explicit run-config file relative to the spec-pack root",
		},
		json: {
			type: "boolean",
			description: "Emit the structured JSON envelope on stdout",
		},
	},
	async run({ args, rawArgs }) {
		const json = Boolean(args.json);
		const startedAt = new Date().toISOString();
		const artifactOptions = await resolveProviderArtifactOptions({
			specPackRoot: args["spec-pack-root"],
			command: "quick-fix",
		});

		if (hasLegacyStoryAwareFlags(rawArgs)) {
			await emitPersistedCommandEnvelope({
				artifactPath: artifactOptions.artifactPath,
				envelope: createInvalidInvocationEnvelope({
					command: "quick-fix",
					artifactPath: artifactOptions.artifactPath,
					startedAt,
					message:
						"quick-fix does not accept story-aware flags such as --story-id, --story-title, --story-path, or --scope-file.",
				}),
				json,
			});
			return;
		}

		try {
			const request = await resolveRequest(args);
			const envelope = await quickFix({
				specPackRoot: args["spec-pack-root"],
				request,
				workingDirectory: args["working-directory"],
				configPath: args.config,
				env: process.env,
				artifactPath: artifactOptions.artifactPath,
				streamOutputPaths: artifactOptions.streamOutputPaths,
				runtimeProgressPaths: artifactOptions.runtimeProgressPaths,
			});
			emitCommandEnvelope({
				envelope,
				json,
				renderHumanSummary,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const invalidInvocation =
				message.includes("--request-") ||
				message.includes("Provide exactly one") ||
				message.includes("does not accept story-aware flags");

			await emitPersistedCommandEnvelope({
				artifactPath: artifactOptions.artifactPath,
				envelope: invalidInvocation
					? createInvalidInvocationEnvelope({
							command: "quick-fix",
							artifactPath: artifactOptions.artifactPath,
							startedAt,
							message,
						})
					: createCommandErrorEnvelope({
							command: "quick-fix",
							artifactPath: artifactOptions.artifactPath,
							startedAt,
							error,
						}),
				json,
			});
		}
	},
});
