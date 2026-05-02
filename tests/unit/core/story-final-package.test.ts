import { describe, expect, test } from "vitest";

import { buildStoryLeadFinalPackage } from "../../../src/core/story-final-package";

describe("story final package", () => {
	test("TC-3.1a, TC-3.1b, TC-3.3a, TC-3.3b, TC-3.7a, TC-3.7b, and TC-3.8a build a complete accepted package", () => {
		const finalPackage = buildStoryLeadFinalPackage({
			outcome: "accepted",
			storyId: "00-foundation",
			storyRunId: "00-foundation-story-run-002",
			attempt: 2,
			storyTitle: "Story 0: Foundation",
			implementedScope: "Accepted package flow.",
			evidence: {
				implementorArtifacts: [
					{
						kind: "implementor-result",
						path: "/tmp/spec-pack/artifacts/00-foundation/001-implementor.json",
					},
				],
				verifierArtifacts: [
					{
						kind: "verifier-result",
						path: "/tmp/spec-pack/artifacts/00-foundation/002-verifier.json",
					},
				],
			},
			verification: {
				finalVerifierOutcome: "pass",
				findings: [],
			},
			gateRun: {
				command: "npm run green-verify",
				result: "pass",
			},
			baselineBeforeStory: 30,
			baselineAfterStory: 33,
			latestActualTotal: 33,
			commitReadiness: {
				state: "ready-for-impl-lead-commit",
			},
		});

		expect(finalPackage.outcome).toBe("accepted");
		expect(finalPackage.riskAndDeviationReview.specDeviations).toEqual([]);
		expect(finalPackage.riskAndDeviationReview.assumedRisks).toEqual([]);
		expect(finalPackage.riskAndDeviationReview.scopeChanges).toEqual([]);
		expect(
			finalPackage.riskAndDeviationReview.shimMockFallbackDecisions,
		).toEqual([]);
		expect(finalPackage.acceptanceChecks.map((check) => check.name)).toEqual([
			"story-gate-result",
			"final-verifier-result",
			"unresolved-findings-status",
			"scope-change-status",
			"shim-mock-fallback-status",
			"baseline-status",
			"receipt-readiness",
			"commit-readiness",
		]);
		expect(finalPackage.summary.acceptanceRationale).toContain(
			"Story-lead scoped acceptance",
		);
		expect(
			finalPackage.logHandoff.storyReceiptDraft.implementorEvidenceRefs,
		).toHaveLength(1);
		expect(finalPackage.logHandoff.commitReadiness.state).toBe(
			"ready-for-impl-lead-commit",
		);
	});

	test("TC-3.2a, TC-3.2b, TC-3.2c, TC-3.2d, TC-3.3c, and TC-3.7c prevent accepted outcome when acceptance checks fail", () => {
		const finalPackage = buildStoryLeadFinalPackage({
			outcome: "accepted",
			storyId: "00-foundation",
			storyRunId: "00-foundation-story-run-003",
			attempt: 3,
			storyTitle: "Story 0: Foundation",
			implementedScope: "Blocked acceptance package flow.",
			evidence: {
				implementorArtifacts: [
					{
						kind: "implementor-result",
						path: "/tmp/spec-pack/artifacts/00-foundation/001-implementor.json",
					},
				],
			},
			verification: {
				finalVerifierOutcome: "pass",
				findings: [],
			},
			riskAndDeviationReview: {
				specDeviations: [
					{
						description: "Intentional deviation remains open.",
						reasoning: "Needs explicit approval before acceptance.",
						evidence: ["deviation.md"],
						approvalStatus: "needs-ruling",
						approvalSource: null,
					},
				],
			},
			commitReadiness: {
				state: "not-ready",
				reason: "Commit has not landed yet.",
			},
		});

		expect(finalPackage.outcome).toBe("blocked");
		expect(
			finalPackage.acceptanceChecks.find(
				(check) => check.name === "receipt-readiness",
			)?.status,
		).toBe("fail");
		expect(
			finalPackage.acceptanceChecks.find(
				(check) => check.name === "commit-readiness",
			)?.status,
		).toBe("fail");
		expect(finalPackage.recommendedImplLeadAction).toBe("reopen");
	});

	test("TC-3.3a and TC-3.7c do not self-certify gate, baseline, or commit readiness when evidence is missing", () => {
		const finalPackage = buildStoryLeadFinalPackage({
			outcome: "accepted",
			storyId: "00-foundation",
			storyRunId: "00-foundation-story-run-004",
			attempt: 4,
			storyTitle: "Story 0: Foundation",
			implementedScope: "Missing acceptance evidence flow.",
			evidence: {
				implementorArtifacts: [
					{
						kind: "implementor-result",
						path: "/tmp/spec-pack/artifacts/00-foundation/001-implementor.json",
					},
				],
				verifierArtifacts: [
					{
						kind: "verifier-result",
						path: "/tmp/spec-pack/artifacts/00-foundation/002-verifier.json",
					},
				],
			},
			verification: {
				finalVerifierOutcome: "pass",
				findings: [],
			},
		});

		expect(finalPackage.outcome).toBe("blocked");
		expect(
			finalPackage.acceptanceChecks.find(
				(check) => check.name === "story-gate-result",
			)?.status,
		).toBe("unknown");
		expect(
			finalPackage.acceptanceChecks.find(
				(check) => check.name === "baseline-status",
			)?.status,
		).toBe("unknown");
		expect(
			finalPackage.acceptanceChecks.find(
				(check) => check.name === "commit-readiness",
			)?.status,
		).toBe("fail");
	});

	test("keeps final verifier acceptance unknown when no recorded verifier result is supplied", () => {
		const finalPackage = buildStoryLeadFinalPackage({
			outcome: "accepted",
			storyId: "00-foundation",
			storyRunId: "00-foundation-story-run-005",
			attempt: 5,
			storyTitle: "Story 0: Foundation",
			implementedScope: "Missing verifier outcome flow.",
			evidence: {
				implementorArtifacts: [
					{
						kind: "implementor-result",
						path: "/tmp/spec-pack/artifacts/00-foundation/001-implementor.json",
					},
				],
				verifierArtifacts: [
					{
						kind: "verifier-result",
						path: "/tmp/spec-pack/artifacts/00-foundation/002-verifier.json",
					},
				],
			},
			gateRun: {
				command: "npm run green-verify",
				result: "pass",
			},
			baselineBeforeStory: 30,
			baselineAfterStory: 33,
			latestActualTotal: 33,
			commitReadiness: {
				state: "ready-for-impl-lead-commit",
			},
		});

		expect(finalPackage.outcome).toBe("blocked");
		expect(finalPackage.verification.finalVerifierOutcome).toBe("not-run");
		expect(
			finalPackage.acceptanceChecks.find(
				(check) => check.name === "final-verifier-result",
			)?.status,
		).toBe("unknown");
	});
});
