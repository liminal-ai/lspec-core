import { defineCommand } from "citty";

import {
	preflight,
	type CliResultEnvelope,
	type PreflightPayload,
} from "../../sdk/index.js";
import {
	createCommandErrorEnvelope,
	emitCommandEnvelope,
	emitPersistedCommandEnvelope,
	resolveCommandArtifactPath,
} from "./shared.js";

function renderHumanSummary(
	envelope: CliResultEnvelope<PreflightPayload>,
): string {
	const result = envelope.result;
	if (!result) {
		return `${envelope.command}: ${envelope.outcome}`;
	}

	const lines = [
		`${envelope.command}: ${envelope.outcome}`,
		`primary: ${result.providerMatrix.primary.available ? "ready" : "blocked"}`,
		`secondary: ${result.providerMatrix.secondary.length}`,
	];

	if (result.verificationGates) {
		lines.push(`story gate: ${result.verificationGates.storyGate}`);
		lines.push(`epic gate: ${result.verificationGates.epicGate}`);
	}

	return lines.join("\n");
}

export default defineCommand({
	meta: {
		name: "preflight",
		description:
			"Validate run config, verification gates, and provider availability.",
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
		"story-gate": {
			type: "string",
			description: "Explicit story verification gate command",
		},
		"epic-gate": {
			type: "string",
			description: "Explicit epic verification gate command",
		},
		json: {
			type: "boolean",
			description: "Emit the structured JSON envelope on stdout",
		},
	},
	async run({ args }) {
		const json = Boolean(args.json);
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveCommandArtifactPath({
			specPackRoot: args["spec-pack-root"],
			command: "preflight",
		});

		try {
			const envelope = await preflight({
				specPackRoot: args["spec-pack-root"],
				configPath: args.config,
				storyGate: args["story-gate"],
				epicGate: args["epic-gate"],
				artifactPath,
			});
			emitCommandEnvelope({
				envelope,
				json,
				renderHumanSummary,
			});
		} catch (error) {
			await emitPersistedCommandEnvelope({
				artifactPath,
				envelope: createCommandErrorEnvelope({
					command: "preflight",
					artifactPath,
					startedAt,
					error,
					blockedOutcome: "blocked",
				}),
				json,
			});
		}
	},
});
