import { join, resolve } from "node:path";

import { pathExists } from "./fs-utils.js";
import {
	storyRunSelectionSchema,
	type StoryRunSelection,
} from "./story-orchestrate-contracts.js";
import { resolveStoryOrder } from "./story-order.js";
import { InvalidSpecPackError } from "../sdk/errors/classes.js";

export async function discoverStoryRunState(input: {
	specPackRoot: string;
	storyId: string;
	storyRunId?: string;
}): Promise<StoryRunSelection> {
	void input.storyRunId;
	const resolvedRoot = resolve(input.specPackRoot);
	const storiesDir = join(resolvedRoot, "stories");

	if (!(await pathExists(storiesDir))) {
		throw new InvalidSpecPackError(
			`Story inventory is unavailable because stories/ is missing under ${resolvedRoot}.`,
		);
	}

	const storyOrder = await resolveStoryOrder(storiesDir);
	const storyExists = storyOrder.stories.some(
		(candidate) => candidate.id === input.storyId,
	);

	if (!storyExists) {
		return storyRunSelectionSchema.parse({
			case: "invalid-story-id",
			storyId: input.storyId,
		});
	}

	return storyRunSelectionSchema.parse({
		case: "start-new",
	});
}
