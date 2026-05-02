import { defineCommand } from "citty";

import storyOrchestrateResumeCommand from "./story-orchestrate-resume.js";
import storyOrchestrateRunCommand from "./story-orchestrate-run.js";
import storyOrchestrateStatusCommand from "./story-orchestrate-status.js";

export default defineCommand({
	meta: {
		name: "story-orchestrate",
		description:
			"Run, resume, or inspect one durable story-lead attempt for a story.",
	},
	subCommands: {
		run: storyOrchestrateRunCommand,
		resume: storyOrchestrateResumeCommand,
		status: storyOrchestrateStatusCommand,
	},
});
