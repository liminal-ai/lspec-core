import { defineCommand } from "citty";

import {
	type CliResultEnvelope,
	type StoryImplementPayload,
	storyImplement,
} from "../../sdk/index.js";
import {
	createCommandErrorEnvelope,
	emitCommandEnvelope,
	emitPersistedCommandEnvelope,
	rejectUnknownCommandArgs,
	resolveProviderArtifactOptions,
} from "./shared.js";

function renderHumanSummary(
	envelope: CliResultEnvelope<StoryImplementPayload>,
): string {
	return envelope.result
		? [
				`${envelope.command}: ${envelope.outcome}`,
				`story: ${envelope.result.story.id}`,
				`session: ${envelope.result.sessionId}`,
			].join("\n")
		: `${envelope.command}: ${envelope.outcome}`;
}

export default defineCommand({
	meta: {
		name: "story-implement",
		description:
			"Launch the retained story implementor for the initial story pass.",
	},
	args: {
		"spec-pack-root": {
			type: "string",
			description: "Absolute or relative path to the spec-pack root",
			required: true,
		},
		"story-id": {
			type: "string",
			description: "The story id to implement",
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
			command: "story-implement",
			group: args["story-id"],
			fileName: "implementor",
		});

		try {
			rejectUnknownCommandArgs(rawArgs, cmd.args);
			const envelope = await storyImplement({
				specPackRoot: args["spec-pack-root"],
				storyId: args["story-id"],
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
					command: "story-implement",
					artifactPath: artifactOptions.artifactPath,
					startedAt,
					error,
				}),
				json,
			});
		}
	},
});
