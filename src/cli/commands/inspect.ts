import { defineCommand } from "citty";

import {
	inspect,
	type CliResultEnvelope,
	type InspectPayload,
} from "../../sdk/index.js";
import {
	createCommandErrorEnvelope,
	emitCommandEnvelope,
	emitPersistedCommandEnvelope,
	resolveCommandArtifactPath,
} from "./shared.js";

function renderHumanSummary(
	envelope: CliResultEnvelope<InspectPayload>,
): string {
	const result = envelope.result;
	if (!result) {
		return `${envelope.command}: ${envelope.outcome}`;
	}

	const lines = [
		`${envelope.command}: ${envelope.outcome}`,
		`tech design: ${result.techDesignShape}`,
		`stories: ${result.stories.length}`,
		`impl insert: ${result.inserts.customStoryImplPromptInsert}`,
		`verifier insert: ${result.inserts.customStoryVerifierPromptInsert}`,
	];

	for (const blocker of result.blockers) {
		lines.push(`blocker: ${blocker}`);
	}

	return lines.join("\n");
}

export default defineCommand({
	meta: {
		name: "inspect",
		description:
			"Resolve the spec-pack layout, tech-design shape, and public insert files.",
	},
	args: {
		"spec-pack-root": {
			type: "string",
			description: "Absolute or relative path to the spec-pack root",
			required: true,
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
			command: "inspect",
		});

		try {
			const envelope = await inspect({
				specPackRoot: args["spec-pack-root"],
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
					command: "inspect",
					artifactPath,
					startedAt,
					error,
				}),
				json,
			});
		}
	},
});
