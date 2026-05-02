import { assemblePrompt } from "./prompt-assembly.js";
import { inspectSpecPack } from "./spec-pack.js";

export interface StoryLeadPromptContext {
	specPackRoot: string;
	storyId: string;
	storyTitle: string;
	storyRunId: string;
	mode: "run" | "resume";
	durableStateSummary: string;
	gateCommands: {
		story?: string;
		epic?: string;
	};
}

export async function assembleStoryLeadPrompt(
	input: StoryLeadPromptContext,
): Promise<string> {
	const inspection = await inspectSpecPack(input.specPackRoot);
	const story = inspection.stories.find(
		(candidate) => candidate.id === input.storyId,
	);

	return (
		await assemblePrompt({
			role: "story_lead",
			storyId: input.storyId,
			storyTitle: input.storyTitle,
			storyPath:
				story?.path ?? `${input.specPackRoot}/stories/${input.storyId}.md`,
			techDesignPath: inspection.artifacts.techDesignPath,
			techDesignCompanionPaths: inspection.artifacts.techDesignCompanionPaths,
			testPlanPath: inspection.artifacts.testPlanPath,
			gateCommands: input.gateCommands,
			storyRunId: input.storyRunId,
			mode: input.mode,
			durableStateSummary: input.durableStateSummary,
		})
	).prompt;
}
