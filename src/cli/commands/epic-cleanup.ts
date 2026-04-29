import { defineCommand } from "citty";

import {
	type CliResultEnvelope,
	type EpicCleanupPayload,
	epicCleanup,
} from "../../sdk/index.js";
import {
	createCommandErrorEnvelope,
	emitCommandEnvelope,
	emitPersistedCommandEnvelope,
	rejectUnknownCommandArgs,
	resolveProviderArtifactOptions,
} from "./shared.js";

function renderHumanSummary(
	envelope: CliResultEnvelope<EpicCleanupPayload>,
): string {
	return envelope.result
		? [
				`${envelope.command}: ${envelope.outcome}`,
				`cleanup-batch: ${envelope.result.cleanupBatchPath}`,
				`files-changed: ${envelope.result.filesChanged.length}`,
			].join("\n")
		: `${envelope.command}: ${envelope.outcome}`;
}

export default defineCommand({
	meta: {
		name: "epic-cleanup",
		description:
			"Apply one cleanup-only pass from a curated epic cleanup batch.",
	},
	args: {
		"spec-pack-root": {
			type: "string",
			description: "Absolute or relative path to the spec-pack root",
			required: true,
		},
		"cleanup-batch": {
			type: "string",
			description: "Path to the curated cleanup batch artifact",
			required: true,
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
	async run({ args, rawArgs, cmd }) {
		const json = Boolean(args.json);
		const startedAt = new Date().toISOString();
		const artifactOptions = await resolveProviderArtifactOptions({
			specPackRoot: args["spec-pack-root"],
			command: "epic-cleanup",
			group: "cleanup",
			fileName: "cleanup-result",
		});

		try {
			rejectUnknownCommandArgs(rawArgs, cmd.args);
			const envelope = await epicCleanup({
				specPackRoot: args["spec-pack-root"],
				cleanupBatchPath: args["cleanup-batch"],
				configPath: args.config,
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
			await emitPersistedCommandEnvelope({
				artifactPath: artifactOptions.artifactPath,
				envelope: createCommandErrorEnvelope({
					command: "epic-cleanup",
					artifactPath: artifactOptions.artifactPath,
					startedAt,
					error,
				}),
				json,
			});
		}
	},
});
