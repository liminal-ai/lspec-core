import { fileURLToPath } from "node:url";

import { defineCommand, runMain } from "citty";

import epicCleanupCommand from "../commands/epic-cleanup";
import epicSynthesizeCommand from "../commands/epic-synthesize";
import epicVerifyCommand from "../commands/epic-verify";
import inspectCommand from "../commands/inspect";
import preflightCommand from "../commands/preflight";
import quickFixCommand from "../commands/quick-fix";
import storyContinueCommand from "../commands/story-continue";
import storyImplementCommand from "../commands/story-implement";
import storySelfReviewCommand from "../commands/story-self-review";
import storyVerifyCommand from "../commands/story-verify";

const main = defineCommand({
	meta: {
		name: "lspec",
		version: "0.1.0",
		description: "Liminal Spec Core SDK / CLI Runtime",
	},
	default:
		"Use `lspec inspect --spec-pack-root <path> --json` to validate a spec pack.",
	subCommands: {
		"epic-cleanup": epicCleanupCommand,
		"epic-synthesize": epicSynthesizeCommand,
		"epic-verify": epicVerifyCommand,
		inspect: inspectCommand,
		preflight: preflightCommand,
		"quick-fix": quickFixCommand,
		"story-implement": storyImplementCommand,
		"story-continue": storyContinueCommand,
		"story-self-review": storySelfReviewCommand,
		"story-verify": storyVerifyCommand,
	},
});

const isMain = process.argv[1]
	? fileURLToPath(import.meta.url) === process.argv[1]
	: false;

if (isMain) {
	runMain(main).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}

export default main;
