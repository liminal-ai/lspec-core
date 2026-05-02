import { join } from "node:path";

import { createStoryRunLedger } from "../../src/core/story-run-ledger.js";
import type {
	ArtifactRef,
	StoryLeadFinalPackage,
	StoryRunCurrentSnapshot,
	StoryRunStatus,
} from "../../src/core/story-orchestrate-contracts.js";
import {
	createRunConfig,
	createSpecPack,
	writeRunConfig,
	writeTextFile,
} from "./test-helpers.js";

export async function createStoryOrchestrateSpecPack(
	scope: string,
): Promise<{ specPackRoot: string; storyId: string }> {
	const specPackRoot = await createSpecPack(scope, {
		companionMode: "four-file",
	});
	const storyId = "00-foundation";
	await writeTextFile(
		join(specPackRoot, "package.json"),
		`${JSON.stringify(
			{
				name: "fixture-spec-pack",
				private: true,
				scripts: {
					"green-verify": "npm run test",
					"verify-all": "npm run test",
				},
			},
			null,
			2,
		)}\n`,
	);
	await writeRunConfig(
		specPackRoot,
		createRunConfig({
			caller_harness: {
				harness: "codex",
				story_heartbeat_cadence_minutes: 10,
			},
			story_lead: {
				secondary_harness: "codex",
				model: "gpt-5.4",
				reasoning_effort: "high",
			},
		}),
	);

	return {
		specPackRoot,
		storyId,
	};
}

export async function seedPrimitiveArtifact(input: {
	specPackRoot: string;
	storyId: string;
	fileName: string;
	payload?: unknown;
}) {
	await writeTextFile(
		join(input.specPackRoot, "artifacts", input.storyId, input.fileName),
		`${JSON.stringify(
			input.payload ?? {
				ok: true,
				fileName: input.fileName,
			},
			null,
			2,
		)}\n`,
	);
}

function buildFinalPackage(input: {
	storyId: string;
	storyRunId: string;
	attempt: number;
	outcome: StoryLeadFinalPackage["outcome"];
}): StoryLeadFinalPackage {
	return {
		outcome: input.outcome,
		storyRunId: input.storyRunId,
		storyId: input.storyId,
		attempt: input.attempt,
		summary: {
			storyTitle: "Story 0: Foundation",
			implementedScope: "Fixture story-run attempt.",
			acceptanceRationale: "Fixture acceptance rationale.",
		},
		evidence: {
			implementorArtifacts: [],
			selfReviewArtifacts: [],
			verifierArtifacts: [],
			quickFixArtifacts: [],
			gateRuns: [],
		},
		verification: {
			finalVerifierOutcome: "not-run",
			findings: [],
		},
		riskAndDeviationReview: {
			specDeviations: [],
			assumedRisks: [],
			scopeChanges: [],
			shimMockFallbackDecisions: [],
		},
		diffReview: {
			changedFiles: [],
			storyScopedAssessment: "Fixture assessment.",
		},
		acceptanceChecks: [],
		logHandoff: {
			recommendedState: "BETWEEN_STORIES",
			recommendedCurrentStory: input.storyId,
			recommendedCurrentPhase: "story-orchestrate",
			continuationHandles: {},
			storyReceiptDraft: {
				storyId: input.storyId,
				storyTitle: "Story 0: Foundation",
				implementorEvidenceRefs: [],
				verifierEvidenceRefs: [],
				gateCommand: "npm run green-verify",
				gateResult: "pass",
				dispositions: [],
				baselineBeforeStory: null,
				baselineAfterStory: null,
				openRisks: [],
			},
			cumulativeBaseline: {
				baselineBeforeCurrentStory: null,
				expectedAfterCurrentStory: null,
				latestActualTotal: null,
			},
			commitReadiness: {
				state: "not-ready",
				reason: "Fixture run.",
			},
			openRisks: [],
		},
		cleanupHandoff: {
			acceptedRiskItems: [],
			deferredItems: [],
			cleanupRequired: false,
		},
		rulingRequest: null,
		recommendedImplLeadAction: "accept",
	};
}

function defaultOutcomeForStatus(
	status: StoryRunStatus,
): StoryLeadFinalPackage["outcome"] {
	switch (status) {
		case "accepted":
		case "needs-ruling":
		case "blocked":
		case "interrupted":
		case "failed":
			return status;
		default:
			return "interrupted";
	}
}

export async function seedStoryRunAttempt(input: {
	specPackRoot: string;
	storyId: string;
	status: StoryRunStatus;
	updatedAt?: string;
	finalPackageOutcome?: StoryLeadFinalPackage["outcome"];
	finalPackage?: StoryLeadFinalPackage | null;
	latestEventSequence?: number;
	latestArtifacts?: ArtifactRef[];
}) {
	const ledger = createStoryRunLedger({
		specPackRoot: input.specPackRoot,
		storyId: input.storyId,
	});
	const attemptPaths = await ledger.createAttempt();
	const snapshot: StoryRunCurrentSnapshot = {
		storyRunId: attemptPaths.storyRunId,
		storyId: input.storyId,
		attempt: attemptPaths.attempt,
		status: input.status,
		currentSummary: `Fixture status ${input.status}.`,
		currentPhase:
			input.status === "running" ? "story-orchestrate-run" : "terminal",
		currentChildOperation: null,
		latestArtifacts: input.latestArtifacts ?? [],
		latestContinuationHandles: {},
		latestEventSequence: input.latestEventSequence ?? 1,
		nextIntent: null,
		updatedAt: input.updatedAt ?? "2026-05-01T00:00:00.000Z",
	};
	await ledger.writeCurrentSnapshot({
		storyId: input.storyId,
		storyRunId: attemptPaths.storyRunId,
		snapshot,
	});
	await ledger.appendEvent({
		storyId: input.storyId,
		storyRunId: attemptPaths.storyRunId,
		event: {
			storyRunId: attemptPaths.storyRunId,
			sequence: input.latestEventSequence ?? 1,
			timestamp: input.updatedAt ?? "2026-05-01T00:00:00.000Z",
			type: input.status,
			summary: `Fixture event for ${input.status}.`,
		},
	});

	if (input.finalPackage !== null) {
		const finalPackage =
			input.finalPackage ??
			buildFinalPackage({
				storyId: input.storyId,
				storyRunId: attemptPaths.storyRunId,
				attempt: attemptPaths.attempt,
				outcome:
					input.finalPackageOutcome ?? defaultOutcomeForStatus(input.status),
			});
		await ledger.writeFinalPackage({
			storyId: input.storyId,
			storyRunId: attemptPaths.storyRunId,
			finalPackage,
		});
	}

	return attemptPaths;
}
