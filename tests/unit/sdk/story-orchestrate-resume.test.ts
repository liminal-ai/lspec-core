import { describe, expect, test } from "vitest";

import type { StoryLeadFinalPackage } from "../../../src/core/story-orchestrate-contracts";
import {
	storyOrchestrateResume,
	storyOrchestrateStatus,
} from "../../../src/sdk/operations/story-orchestrate";
import { readJsonLines } from "../../support/test-helpers";
import {
	createStoryOrchestrateSpecPack,
	seedStoryRunAttempt,
} from "../../support/story-orchestrate-fixtures";

describe("story-orchestrate resume sdk operation", () => {
	function createNeedsRulingFinalPackage(input: {
		storyId: string;
		storyRunId: string;
		attempt: number;
	}): StoryLeadFinalPackage {
		return {
			outcome: "needs-ruling",
			storyId: input.storyId,
			storyRunId: input.storyRunId,
			attempt: input.attempt,
			summary: {
				storyTitle: "Story 0: Foundation",
				implementedScope: "Needs-ruling fixture.",
				acceptanceRationale: "Fixture ruling required.",
			},
			evidence: {
				implementorArtifacts: [
					{
						kind: "implementor-result",
						path: `/tmp/spec-pack/artifacts/${input.storyId}/001-implementor.json`,
					},
				],
				selfReviewArtifacts: [],
				verifierArtifacts: [
					{
						kind: "verifier-result",
						path: `/tmp/spec-pack/artifacts/${input.storyId}/002-verifier.json`,
					},
				],
				quickFixArtifacts: [],
				callerInputArtifacts: [],
				gateRuns: [
					{
						command: "npm run green-verify",
						result: "pass",
					},
				],
			},
			verification: {
				finalVerifierOutcome: "pass",
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
			callerInputHistory: {
				reviewRequests: [],
				rulings: [],
			},
			replayBoundary: null,
			logHandoff: {
				recommendedState: "NEEDS_RULING",
				recommendedCurrentStory: input.storyId,
				recommendedCurrentPhase: "story-orchestrate",
				continuationHandles: {},
				storyReceiptDraft: {
					storyId: input.storyId,
					storyTitle: "Story 0: Foundation",
					implementorEvidenceRefs: [
						`/tmp/spec-pack/artifacts/${input.storyId}/001-implementor.json`,
					],
					verifierEvidenceRefs: [
						`/tmp/spec-pack/artifacts/${input.storyId}/002-verifier.json`,
					],
					gateCommand: "npm run green-verify",
					gateResult: "pass",
					dispositions: [],
					baselineBeforeStory: 10,
					baselineAfterStory: 12,
					openRisks: [],
				},
				cumulativeBaseline: {
					baselineBeforeCurrentStory: 10,
					expectedAfterCurrentStory: 12,
					latestActualTotal: 12,
				},
				commitReadiness: {
					state: "ready-for-impl-lead-commit",
				},
				openRisks: [],
			},
			cleanupHandoff: {
				acceptedRiskItems: [],
				deferredItems: [],
				cleanupRequired: false,
			},
			rulingRequest: {
				id: "ruling-001",
				decisionType: "scope-change",
				question: "Can this proceed?",
				defaultRecommendation: "Wait for approval.",
				evidence: ["evidence.md"],
				allowedResponses: ["approve", "reject"],
			},
			recommendedImplLeadAction: "ask-ruling",
		};
	}

	test("preserves prior artifact history and appends monotonic events when resuming an existing attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-resume-sequencing",
		);
		const checkpointArtifact = `${specPackRoot}/artifacts/${storyId}/001-implementor.json`;
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
			latestEventSequence: 3,
			latestArtifacts: [
				{
					kind: "implementor-result",
					path: checkpointArtifact,
				},
			],
		});

		const resumeEnvelope = await storyOrchestrateResume({
			specPackRoot,
			storyId,
			storyRunId: attempt.storyRunId,
		});
		const statusEnvelope = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
			storyRunId: attempt.storyRunId,
		});
		const events = await readJsonLines<Array<{ sequence: number }>[number]>(
			attempt.eventHistoryPath,
		);

		expect(resumeEnvelope.outcome).toBe("blocked");
		expect(resumeEnvelope.result).toEqual(
			expect.objectContaining({
				case: "completed",
				storyRunId: attempt.storyRunId,
			}),
		);
		expect(events.map((event) => event.sequence)).toEqual([3, 4, 5]);
		expect(statusEnvelope.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: attempt.storyRunId,
				latestEventSequence: 5,
				currentSnapshot: expect.objectContaining({
					latestArtifacts: expect.arrayContaining([
						expect.objectContaining({
							path: checkpointArtifact,
						}),
					]),
				}),
			}),
		);
	});

	test("returns invalid-story-run-id when resume is asked to reopen an unknown explicit attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-resume-invalid-run-id",
		);
		await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "interrupted",
			finalPackageOutcome: "interrupted",
		});

		const envelope = await storyOrchestrateResume({
			specPackRoot,
			storyId,
			storyRunId: "00-foundation-story-run-999",
		});

		expect(envelope.outcome).toBe("invalid-story-run-id");
		expect(envelope.result).toEqual({
			case: "invalid-story-run-id",
			storyId,
			storyRunId: "00-foundation-story-run-999",
		});
	});

	test("returns invalid-ruling when the supplied ruling does not match an outstanding ruling request", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-orchestrate-sdk-invalid-ruling",
		);
		const attempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "needs-ruling",
			finalPackage: createNeedsRulingFinalPackage({
				storyId,
				storyRunId: "00-foundation-story-run-001",
				attempt: 1,
			}),
		});

		const envelope = await storyOrchestrateResume({
			specPackRoot,
			storyId,
			storyRunId: attempt.storyRunId,
			ruling: {
				rulingRequestId: "ruling-999",
				decision: "approve",
				rationale: "Mismatched on purpose.",
				source: "impl-lead",
			},
		});

		expect(envelope.outcome).toBe("invalid-ruling");
		expect(envelope.result).toEqual({
			case: "invalid-ruling",
			storyId,
		});
	});
});
