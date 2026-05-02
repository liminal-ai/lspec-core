import { join } from "node:path";

import type {
	StoryLeadFinalPackage,
	StoryRunStatus,
} from "../../../../src/core/story-orchestrate-contracts.js";
import type { StoryRunAttemptPaths } from "../../../../src/core/story-run-ledger.js";
import {
	createStoryOrchestrateSpecPack,
	seedPrimitiveArtifact,
	seedStoryRunAttempt,
} from "../../story-orchestrate-fixtures.js";

export const storyInventoryFixture = {
	stories: [
		{
			id: "00-foundation",
			title: "Story 0: Foundation",
			path: "stories/00-foundation.md",
		},
		{
			id: "01-next",
			title: "Story 1: Next",
			path: "stories/01-next.md",
		},
	],
} as const;

export const priorPrimitiveArtifactsFixture = [
	{
		fileName: "001-implementor.json",
		payload: {
			command: "story-implement",
			outcome: "ready-for-verification",
		},
	},
	{
		fileName: "002-verifier.json",
		payload: {
			command: "story-verify",
			outcome: "pass",
		},
	},
] as const;

export const priorStoryLeadAttemptFixtures = {
	single: {
		status: "interrupted",
		finalPackageOutcome: "interrupted",
		updatedAt: "2026-05-01T00:00:00.000Z",
	},
	accepted: {
		status: "accepted",
		finalPackageOutcome: "accepted",
		updatedAt: "2026-05-01T00:00:00.000Z",
	},
	interrupted: {
		status: "interrupted",
		finalPackageOutcome: "interrupted",
		updatedAt: "2026-05-01T00:00:00.000Z",
	},
	ambiguous: [
		{
			status: "running",
			finalPackage: null,
			updatedAt: "2026-05-01T02:00:00.000Z",
		},
		{
			status: "interrupted",
			finalPackageOutcome: "interrupted",
			updatedAt: "2026-05-01T01:00:00.000Z",
		},
	],
} as const satisfies {
	single: StoryAttemptFixtureDefinition;
	accepted: StoryAttemptFixtureDefinition;
	interrupted: StoryAttemptFixtureDefinition;
	ambiguous: readonly StoryAttemptFixtureDefinition[];
};

export interface StoryRuntimeSpecPackFixture {
	specPackRoot: string;
	storyId: string;
	storyTitle: string;
	storyPath: string;
	artifactsRoot: string;
}

export interface StoryAttemptFixtureDefinition {
	status: StoryRunStatus;
	updatedAt?: string;
	finalPackageOutcome?: StoryLeadFinalPackage["outcome"];
	finalPackage?: StoryLeadFinalPackage | null;
	latestEventSequence?: number;
}

export interface StoryAttemptFixtureResult {
	specPackRoot: string;
	storyId: string;
	attempts: StoryRunAttemptPaths[];
}

export async function createSpecPackFixture(
	scope = "story-runtime",
): Promise<StoryRuntimeSpecPackFixture> {
	const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(scope);

	return {
		specPackRoot,
		storyId,
		storyTitle: "Story 0: Foundation",
		storyPath: join(specPackRoot, "stories", "00-foundation.md"),
		artifactsRoot: join(specPackRoot, "artifacts"),
	};
}

export async function primitiveArtifactsFixture(input?: {
	scope?: string;
	specPackRoot?: string;
	storyId?: string;
}): Promise<{
	specPackRoot: string;
	storyId: string;
	artifactPaths: string[];
}> {
	const fixture =
		input?.specPackRoot && input.storyId
			? {
					specPackRoot: input.specPackRoot,
					storyId: input.storyId,
				}
			: await createSpecPackFixture(input?.scope ?? "story-runtime-primitives");

	for (const artifact of priorPrimitiveArtifactsFixture) {
		await seedPrimitiveArtifact({
			specPackRoot: fixture.specPackRoot,
			storyId: fixture.storyId,
			fileName: artifact.fileName,
			payload: artifact.payload,
		});
	}

	return {
		specPackRoot: fixture.specPackRoot,
		storyId: fixture.storyId,
		artifactPaths: priorPrimitiveArtifactsFixture.map((artifact) =>
			join(
				fixture.specPackRoot,
				"artifacts",
				fixture.storyId,
				artifact.fileName,
			),
		),
	};
}

export async function attemptFixture(input?: {
	scope?: string;
	specPackRoot?: string;
	storyId?: string;
	attempt?:
		| StoryAttemptFixtureDefinition
		| Exclude<keyof typeof priorStoryLeadAttemptFixtures, "ambiguous">;
}): Promise<StoryAttemptFixtureResult & { attempt: StoryRunAttemptPaths }> {
	const fixture =
		input?.specPackRoot && input.storyId
			? {
					specPackRoot: input.specPackRoot,
					storyId: input.storyId,
				}
			: await createSpecPackFixture(input?.scope ?? "story-runtime-attempt");
	const definition = resolveAttemptDefinition(input?.attempt ?? "single");
	const attempt = await seedStoryRunAttempt({
		specPackRoot: fixture.specPackRoot,
		storyId: fixture.storyId,
		...definition,
	});

	return {
		specPackRoot: fixture.specPackRoot,
		storyId: fixture.storyId,
		attempt,
		attempts: [attempt],
	};
}

export async function ambiguousAttemptsFixture(input?: {
	scope?: string;
	specPackRoot?: string;
	storyId?: string;
}): Promise<StoryAttemptFixtureResult> {
	const fixture =
		input?.specPackRoot && input.storyId
			? {
					specPackRoot: input.specPackRoot,
					storyId: input.storyId,
				}
			: await createSpecPackFixture(input?.scope ?? "story-runtime-ambiguous");
	const attempts: StoryRunAttemptPaths[] = [];

	for (const definition of priorStoryLeadAttemptFixtures.ambiguous) {
		attempts.push(
			await seedStoryRunAttempt({
				specPackRoot: fixture.specPackRoot,
				storyId: fixture.storyId,
				...definition,
			}),
		);
	}

	return {
		specPackRoot: fixture.specPackRoot,
		storyId: fixture.storyId,
		attempts,
	};
}

function resolveAttemptDefinition(
	attempt:
		| StoryAttemptFixtureDefinition
		| Exclude<keyof typeof priorStoryLeadAttemptFixtures, "ambiguous">,
): StoryAttemptFixtureDefinition {
	if (typeof attempt !== "string") {
		return attempt;
	}

	const definition = priorStoryLeadAttemptFixtures[attempt];
	if (Array.isArray(definition)) {
		throw new Error(
			"Use ambiguousAttemptsFixture for ambiguous story-run data.",
		);
	}

	return definition;
}
