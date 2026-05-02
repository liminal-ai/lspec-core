import { describe, expect, test } from "vitest";

import { buildLogHandoff } from "../../../src/core/log-handoff";

describe("log handoff", () => {
	test("TC-3.6a and TC-3.6b include state, phase, continuation handles, baseline data, and receipt draft fields", () => {
		const handoff = buildLogHandoff({
			outcome: "accepted",
			storyId: "00-foundation",
			storyTitle: "Story 0: Foundation",
			continuationHandles: {
				implementor: {
					provider: "codex",
					sessionId: "codex-impl-001",
					storyId: "00-foundation",
				},
			},
			gateRun: {
				command: "npm run green-verify",
				result: "pass",
			},
			verification: {
				finalVerifierOutcome: "pass",
				findings: [],
			},
			implementorEvidenceRefs: [
				"/tmp/spec-pack/artifacts/00-foundation/001-implementor.json",
			],
			verifierEvidenceRefs: [
				"/tmp/spec-pack/artifacts/00-foundation/002-verifier.json",
			],
			commitReadiness: {
				state: "ready-for-impl-lead-commit",
			},
			baselineBeforeStory: 20,
			baselineAfterStory: 24,
			latestActualTotal: 24,
		});

		expect(handoff).toEqual(
			expect.objectContaining({
				recommendedState: "BETWEEN_STORIES",
				recommendedCurrentStory: null,
				recommendedCurrentPhase: null,
				continuationHandles: {
					implementor: {
						provider: "codex",
						sessionId: "codex-impl-001",
						storyId: "00-foundation",
					},
				},
				storyReceiptDraft: expect.objectContaining({
					storyId: "00-foundation",
					gateCommand: "npm run green-verify",
					gateResult: "pass",
					baselineBeforeStory: 20,
					baselineAfterStory: 24,
				}),
				cumulativeBaseline: {
					baselineBeforeCurrentStory: 20,
					expectedAfterCurrentStory: 24,
					latestActualTotal: 24,
				},
			}),
		);
	});
});
