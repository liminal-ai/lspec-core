import type { ContinuationHandle } from "./result-contracts.js";
import type {
	CommitReadiness,
	GateRunSummary,
	LogHandoff,
	StoryLeadVerification,
} from "./story-orchestrate-contracts.js";
import { logHandoffSchema } from "./story-orchestrate-contracts.js";

function openRiskSummaries(input: {
	verification: StoryLeadVerification;
	extraRisks: string[];
}): string[] {
	const unresolved = input.verification.findings
		.filter((finding) => finding.status === "unresolved")
		.map((finding) => `Verification finding ${finding.id} remains unresolved.`);

	return [...input.extraRisks, ...unresolved];
}

function recommendedState(input: {
	outcome: "accepted" | "needs-ruling" | "blocked" | "failed" | "interrupted";
}): string {
	switch (input.outcome) {
		case "accepted":
			return "BETWEEN_STORIES";
		case "needs-ruling":
			return "NEEDS_RULING";
		case "blocked":
			return "STORY_BLOCKED";
		case "failed":
			return "STORY_FAILED";
		case "interrupted":
			return "STORY_ORCHESTRATION_INTERRUPTED";
	}
}

export function buildLogHandoff(input: {
	outcome: "accepted" | "needs-ruling" | "blocked" | "failed" | "interrupted";
	storyId: string;
	storyTitle: string;
	continuationHandles?: Record<string, ContinuationHandle>;
	gateRun: GateRunSummary;
	verification: StoryLeadVerification;
	implementorEvidenceRefs: string[];
	verifierEvidenceRefs: string[];
	openRisks?: string[];
	commitReadiness: CommitReadiness;
	recommendedCurrentPhase?: string | null;
	baselineBeforeStory?: number | null;
	baselineAfterStory?: number | null;
	latestActualTotal?: number | null;
}): LogHandoff {
	const openRisks = openRiskSummaries({
		verification: input.verification,
		extraRisks: input.openRisks ?? [],
	});

	return logHandoffSchema.parse({
		recommendedState: recommendedState({ outcome: input.outcome }),
		recommendedCurrentStory:
			input.outcome === "accepted" ? null : input.storyId,
		recommendedCurrentPhase:
			input.recommendedCurrentPhase ??
			(input.outcome === "accepted" ? null : "story-orchestrate"),
		continuationHandles: input.continuationHandles ?? {},
		storyReceiptDraft: {
			storyId: input.storyId,
			storyTitle: input.storyTitle,
			implementorEvidenceRefs: input.implementorEvidenceRefs,
			verifierEvidenceRefs: input.verifierEvidenceRefs,
			gateCommand: input.gateRun.command,
			gateResult: input.gateRun.result === "pass" ? "pass" : "fail",
			dispositions: input.verification.findings,
			baselineBeforeStory: input.baselineBeforeStory ?? null,
			baselineAfterStory: input.baselineAfterStory ?? null,
			openRisks,
		},
		cumulativeBaseline: {
			baselineBeforeCurrentStory: input.baselineBeforeStory ?? null,
			expectedAfterCurrentStory: input.baselineAfterStory ?? null,
			latestActualTotal: input.latestActualTotal ?? null,
		},
		commitReadiness: input.commitReadiness,
		openRisks,
	});
}
