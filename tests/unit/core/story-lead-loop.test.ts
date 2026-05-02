import { describe, expect, test, vi } from "vitest";

import { createStoryRunLedger } from "../../../src/core/story-run-ledger";
import { runStoryLead } from "../../../src/core/story-lead";
import {
	storyOrchestrateResume,
	storyOrchestrateStatus,
} from "../../../src/sdk/operations/story-orchestrate";
import { readJsonLines } from "../../support/test-helpers";
import {
	createStoryOrchestrateSpecPack,
	seedPrimitiveArtifact,
	seedStoryRunAttempt,
} from "../../support/story-orchestrate-fixtures";

describe("story-lead loop", () => {
	test("TC-2.6b, TC-3.5d, TC-3.9a, and TC-3.9b preserve review history across a reopened accepted attempt", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-lead-loop-reopen",
		);
		const acceptedAttempt = await seedStoryRunAttempt({
			specPackRoot,
			storyId,
			status: "accepted",
			finalPackageOutcome: "accepted",
		});

		const resumeEnvelope = await storyOrchestrateResume({
			specPackRoot,
			storyId,
			storyRunId: acceptedAttempt.storyRunId,
			reviewRequest: {
				source: "impl-lead",
				decision: "reopen",
				summary: "Please reopen and address the missing package notes.",
				items: [
					{
						id: "review-001",
						severity: "major",
						concern: "Package notes are missing.",
						requiredResponse: "Add the missing notes to the handoff package.",
					},
				],
			},
		});

		if (resumeEnvelope.result?.case !== "completed") {
			throw new Error("Expected the reopened resume envelope to complete.");
		}

		const reopenedStoryRunId = resumeEnvelope.result.storyRunId;
		const explicitStatus = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
			storyRunId: reopenedStoryRunId,
		});
		const priorAcceptedStatus = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
			storyRunId: acceptedAttempt.storyRunId,
		});
		const ledger = createStoryRunLedger({
			specPackRoot,
			storyId,
		});
		const reopenedAttempt =
			await ledger.getAttemptByStoryRunId(reopenedStoryRunId);
		const events = reopenedAttempt
			? await readJsonLines<Array<{ type: string }>[number]>(
					reopenedAttempt.eventHistoryPath,
				)
			: [];

		expect(resumeEnvelope.outcome).toBe("blocked");
		expect(reopenedStoryRunId).not.toBe(acceptedAttempt.storyRunId);
		expect(
			resumeEnvelope.result.finalPackage.callerInputHistory.reviewRequests,
		).toHaveLength(1);
		expect(resumeEnvelope.result.finalPackage.verification.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "review-001",
					status: "unresolved",
				}),
			]),
		);
		expect(
			resumeEnvelope.result.finalPackage.evidence.callerInputArtifacts,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: "prior-final-package",
				}),
				expect.objectContaining({
					kind: "review-request",
				}),
			]),
		);
		expect(explicitStatus.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: reopenedStoryRunId,
				currentSnapshot: expect.objectContaining({
					callerInputHistory: expect.objectContaining({
						reviewRequests: [
							expect.objectContaining({
								summary: "Please reopen and address the missing package notes.",
							}),
						],
					}),
				}),
			}),
		);
		expect(priorAcceptedStatus.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				storyRunId: acceptedAttempt.storyRunId,
				currentStatus: "accepted",
			}),
		);
		expect(events.map((event) => event.type)).toEqual(
			expect.arrayContaining(["story-run-reopened", "review-request-received"]),
		);
	});

	test("TC-3.5a and TC-3.5c classify primitive implementor and verifier artifacts into the correct final-package evidence buckets", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-lead-loop-evidence-split",
		);
		const implementorPath = `${specPackRoot}/artifacts/${storyId}/001-implementor.json`;
		const verifierPath = `${specPackRoot}/artifacts/${storyId}/002-verifier.json`;
		await seedPrimitiveArtifact({
			specPackRoot,
			storyId,
			fileName: "001-implementor.json",
			payload: {
				command: "story-implement",
				outcome: "ready-for-verification",
			},
		});
		await seedPrimitiveArtifact({
			specPackRoot,
			storyId,
			fileName: "002-verifier.json",
			payload: {
				command: "story-verify",
				outcome: "pass",
			},
		});
		const ledger = createStoryRunLedger({
			specPackRoot,
			storyId,
		});

		const runtime = await runStoryLead({
			specPackRoot,
			storyId,
			ledger,
			mode: "run",
			startedFromPrimitiveArtifacts: [implementorPath, verifierPath],
		});

		if (runtime.case !== "completed" || !runtime.finalPackage) {
			throw new Error(
				"Expected a completed final package for evidence-split coverage.",
			);
		}

		expect(runtime.finalPackage.evidence.implementorArtifacts).toEqual([
			expect.objectContaining({
				path: implementorPath,
			}),
		]);
		expect(runtime.finalPackage.evidence.verifierArtifacts).toEqual([
			expect.objectContaining({
				path: verifierPath,
			}),
		]);
		expect(runtime.finalPackage.verification.finalVerifierOutcome).toBe("pass");
		expect(
			runtime.finalPackage.acceptanceChecks.find(
				(check) => check.name === "final-verifier-result",
			)?.status,
		).toBe("pass");
	});

	test("derives a revise verifier outcome from recorded verifier evidence instead of artifact presence", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-lead-loop-verifier-revise",
		);
		const implementorPath = `${specPackRoot}/artifacts/${storyId}/001-implementor.json`;
		const verifierPath = `${specPackRoot}/artifacts/${storyId}/002-verifier.json`;
		await seedPrimitiveArtifact({
			specPackRoot,
			storyId,
			fileName: "001-implementor.json",
			payload: {
				command: "story-implement",
				outcome: "ready-for-verification",
			},
		});
		await seedPrimitiveArtifact({
			specPackRoot,
			storyId,
			fileName: "002-verifier.json",
			payload: {
				command: "story-verify",
				outcome: "revise",
			},
		});

		const runtime = await runStoryLead({
			specPackRoot,
			storyId,
			ledger: createStoryRunLedger({
				specPackRoot,
				storyId,
			}),
			mode: "run",
			startedFromPrimitiveArtifacts: [implementorPath, verifierPath],
		});

		if (runtime.case !== "completed" || !runtime.finalPackage) {
			throw new Error(
				"Expected a completed final package for verifier revise coverage.",
			);
		}

		expect(runtime.finalPackage.verification.finalVerifierOutcome).toBe(
			"revise",
		);
		expect(
			runtime.finalPackage.acceptanceChecks.find(
				(check) => check.name === "final-verifier-result",
			)?.status,
		).toBe("fail");
	});

	test("keeps verifier acceptance unknown when recorded verifier outcomes are missing or ambiguous", async () => {
		const missingFixture = await createStoryOrchestrateSpecPack(
			"story-lead-loop-verifier-missing",
		);
		const missingImplementorPath = `${missingFixture.specPackRoot}/artifacts/${missingFixture.storyId}/001-implementor.json`;
		await seedPrimitiveArtifact({
			specPackRoot: missingFixture.specPackRoot,
			storyId: missingFixture.storyId,
			fileName: "001-implementor.json",
			payload: {
				command: "story-implement",
				outcome: "ready-for-verification",
			},
		});

		const missingRuntime = await runStoryLead({
			specPackRoot: missingFixture.specPackRoot,
			storyId: missingFixture.storyId,
			ledger: createStoryRunLedger({
				specPackRoot: missingFixture.specPackRoot,
				storyId: missingFixture.storyId,
			}),
			mode: "run",
			startedFromPrimitiveArtifacts: [missingImplementorPath],
		});

		if (missingRuntime.case !== "completed" || !missingRuntime.finalPackage) {
			throw new Error(
				"Expected a completed final package for missing verifier coverage.",
			);
		}

		expect(missingRuntime.finalPackage.verification.finalVerifierOutcome).toBe(
			"not-run",
		);
		expect(
			missingRuntime.finalPackage.acceptanceChecks.find(
				(check) => check.name === "final-verifier-result",
			)?.status,
		).toBe("unknown");

		const ambiguousFixture = await createStoryOrchestrateSpecPack(
			"story-lead-loop-verifier-ambiguous",
		);
		const ambiguousImplementorPath = `${ambiguousFixture.specPackRoot}/artifacts/${ambiguousFixture.storyId}/001-implementor.json`;
		const verifierPassPath = `${ambiguousFixture.specPackRoot}/artifacts/${ambiguousFixture.storyId}/002-verifier.json`;
		const verifierRevisePath = `${ambiguousFixture.specPackRoot}/artifacts/${ambiguousFixture.storyId}/003-verifier-followup.json`;
		await seedPrimitiveArtifact({
			specPackRoot: ambiguousFixture.specPackRoot,
			storyId: ambiguousFixture.storyId,
			fileName: "001-implementor.json",
			payload: {
				command: "story-implement",
				outcome: "ready-for-verification",
			},
		});
		await seedPrimitiveArtifact({
			specPackRoot: ambiguousFixture.specPackRoot,
			storyId: ambiguousFixture.storyId,
			fileName: "002-verifier.json",
			payload: {
				command: "story-verify",
				outcome: "pass",
			},
		});
		await seedPrimitiveArtifact({
			specPackRoot: ambiguousFixture.specPackRoot,
			storyId: ambiguousFixture.storyId,
			fileName: "003-verifier-followup.json",
			payload: {
				command: "story-verify",
				outcome: "revise",
			},
		});

		const ambiguousRuntime = await runStoryLead({
			specPackRoot: ambiguousFixture.specPackRoot,
			storyId: ambiguousFixture.storyId,
			ledger: createStoryRunLedger({
				specPackRoot: ambiguousFixture.specPackRoot,
				storyId: ambiguousFixture.storyId,
			}),
			mode: "run",
			startedFromPrimitiveArtifacts: [
				ambiguousImplementorPath,
				verifierPassPath,
				verifierRevisePath,
			],
		});

		if (
			ambiguousRuntime.case !== "completed" ||
			!ambiguousRuntime.finalPackage
		) {
			throw new Error(
				"Expected a completed final package for ambiguous verifier coverage.",
			);
		}

		expect(
			ambiguousRuntime.finalPackage.verification.finalVerifierOutcome,
		).toBe("not-run");
		expect(
			ambiguousRuntime.finalPackage.acceptanceChecks.find(
				(check) => check.name === "final-verifier-result",
			)?.status,
		).toBe("unknown");
	});

	test("TC-3.11a and TC-3.11b record the smallest safe replay boundary for provider-output-invalid and context-window failures", async () => {
		const { specPackRoot, storyId } = await createStoryOrchestrateSpecPack(
			"story-lead-loop-replay-boundaries",
		);
		const ledger = createStoryRunLedger({
			specPackRoot,
			storyId,
		});

		vi.stubEnv(
			"LBUILD_IMPL_STORY_ORCHESTRATE_FAILURE_MODE",
			"provider-output-invalid",
		);
		const providerFailure = await runStoryLead({
			specPackRoot,
			storyId,
			ledger,
			mode: "run",
			startedFromPrimitiveArtifacts: [
				`${specPackRoot}/artifacts/${storyId}/001-implementor.json`,
			],
		});

		vi.stubEnv(
			"LBUILD_IMPL_STORY_ORCHESTRATE_FAILURE_MODE",
			"context-window-limit",
		);
		const contextLedger = createStoryRunLedger({
			specPackRoot,
			storyId,
		});
		const contextFailure = await runStoryLead({
			specPackRoot,
			storyId,
			ledger: contextLedger,
			mode: "run",
			startedFromPrimitiveArtifacts: [
				`${specPackRoot}/artifacts/${storyId}/001-implementor.json`,
			],
		});
		vi.unstubAllEnvs();

		if (
			providerFailure.case !== "interrupted" ||
			contextFailure.case !== "interrupted"
		) {
			throw new Error("Expected both failure paths to interrupt.");
		}

		const providerStatus = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
			storyRunId: providerFailure.storyRunId,
		});
		const contextStatus = await storyOrchestrateStatus({
			specPackRoot,
			storyId,
			storyRunId: contextFailure.storyRunId,
		});

		expect(providerStatus.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				currentSnapshot: expect.objectContaining({
					replayBoundary: expect.objectContaining({
						smallestSafeStep: "resume-from-last-valid-artifact",
						requiresFreshChildProviderSession: true,
					}),
				}),
			}),
		);
		expect(contextStatus.result).toEqual(
			expect.objectContaining({
				case: "single-attempt",
				currentSnapshot: expect.objectContaining({
					replayBoundary: expect.objectContaining({
						smallestSafeStep: "rehydrate-from-durable-ledger",
						requiresFreshStoryLeadSession: true,
					}),
				}),
			}),
		);
	});
});
