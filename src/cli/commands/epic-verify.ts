import { defineCommand } from "citty";

import {
	type CliResultEnvelope,
	type EpicVerifyPayload,
	epicVerify,
} from "../../sdk/index.js";
import {
	createCommandErrorEnvelope,
	emitCommandEnvelope,
	emitPersistedCommandEnvelope,
	rejectUnknownCommandArgs,
	resolveProviderArtifactOptions,
} from "./shared.js";

function renderHumanSummary(
	envelope: CliResultEnvelope<EpicVerifyPayload>,
): string {
	return envelope.result
		? `${envelope.command}: ${envelope.outcome}\nverifiers: ${envelope.result.verifierResults.length}`
		: `${envelope.command}: ${envelope.outcome}`;
}

export default defineCommand({
	meta: {
		name: "epic-verify",
		description: "Launch a fresh epic-level verifier batch.",
	},
	args: {
		"spec-pack-root": {
			type: "string",
			description: "Absolute or relative path to the spec-pack root",
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
			command: "epic-verify",
			group: "epic",
			fileName: "epic-verifier-batch",
		});

		try {
			rejectUnknownCommandArgs(rawArgs, cmd.args);
			const envelope = await epicVerify({
				specPackRoot: args["spec-pack-root"],
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
					command: "epic-verify",
					artifactPath: artifactOptions.artifactPath,
					startedAt,
					error,
					blockedOutcome: "block",
				}),
				json,
			});
		}
	},
});
