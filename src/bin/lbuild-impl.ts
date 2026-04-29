import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineCommand, runMain } from "citty";

import epicCleanupCommand from "../cli/commands/epic-cleanup";
import epicSynthesizeCommand from "../cli/commands/epic-synthesize";
import epicVerifyCommand from "../cli/commands/epic-verify";
import inspectCommand from "../cli/commands/inspect";
import preflightCommand from "../cli/commands/preflight";
import quickFixCommand from "../cli/commands/quick-fix";
import storyContinueCommand from "../cli/commands/story-continue";
import storyImplementCommand from "../cli/commands/story-implement";
import storySelfReviewCommand from "../cli/commands/story-self-review";
import storyVerifyCommand from "../cli/commands/story-verify";

const main = defineCommand({
	meta: {
		name: "lbuild-impl",
		version: "0.1.0",
		description:
			"Implementation runtime for Liminal Build — agentic impl/verify orchestration.",
	},
	default:
		"Use `lbuild-impl inspect --spec-pack-root <path> --json` to validate a spec pack.",
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

function isMainModule() {
	if (!process.argv[1]) {
		return false;
	}

	try {
		return fileURLToPath(import.meta.url) === realpathSync(process.argv[1]);
	} catch {
		return fileURLToPath(import.meta.url) === process.argv[1];
	}
}

if (isMainModule()) {
	runMain(main).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}

export default main;
