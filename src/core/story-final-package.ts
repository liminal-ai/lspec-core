import type { ContinuationHandle } from "./result-contracts.js";
import { buildCleanupHandoff } from "./cleanup-handoff.js";
import { buildLogHandoff } from "./log-handoff.js";
import type {
	AcceptanceCheckItem,
	ArtifactRef,
	CallerInputHistory,
	CallerRulingRequest,
	CommitReadiness,
	DiffReview,
	GateRunSummary,
	ReplayBoundary,
	RiskOrDeviationItem,
	StoryLeadFinalPackage,
	StoryLeadVerification,
} from "./story-orchestrate-contracts.js";
import {
	storyLeadFinalPackageSchema,
	type StoryLeadOutcome,
} from "./story-orchestrate-contracts.js";

function defaultCommitReadiness(input: {
	outcome: StoryLeadOutcome;
}): CommitReadiness {
	return {
		state: "not-ready",
		reason:
			input.outcome === "accepted"
				? "No recorded commit evidence is available for this story-lead attempt."
				: "Impl-lead acceptance remains blocked until story-lead closes the outstanding follow-up.",
	};
}

function acceptanceChecks(input: {
	gateRun: { command: string; result: "pass" | "fail" | "not-run" };
	verification: StoryLeadVerification;
	scopeChanges: RiskOrDeviationItem[];
	shimMockFallbackDecisions: RiskOrDeviationItem[];
	baselineBeforeStory: number | null;
	baselineAfterStory: number | null;
	commitReadiness: CommitReadiness;
	implementorEvidenceRefs: string[];
	verifierEvidenceRefs: string[];
}): AcceptanceCheckItem[] {
	const unresolvedFindings = input.verification.findings.filter(
		(finding) => finding.status === "unresolved",
	);
	const scopeChangeBlockers = input.scopeChanges.filter(
		(item) =>
			item.approvalStatus === "needs-ruling" ||
			item.approvalStatus === "rejected",
	);
	const shimBlockers = input.shimMockFallbackDecisions.filter(
		(item) =>
			item.approvalStatus === "needs-ruling" ||
			item.approvalStatus === "rejected",
	);
	const baselineKnown =
		input.baselineBeforeStory !== null && input.baselineAfterStory !== null;
	const baselinePass = baselineKnown
		? (input.baselineAfterStory ?? 0) >= (input.baselineBeforeStory ?? 0)
		: null;
	const receiptReady =
		input.implementorEvidenceRefs.length > 0 &&
		input.verifierEvidenceRefs.length > 0 &&
		input.gateRun.result === "pass";

	return [
		{
			name: "story-gate-result",
			status:
				input.gateRun.result === "pass"
					? "pass"
					: input.gateRun.result === "fail"
						? "fail"
						: "unknown",
			evidence: [input.gateRun.command],
			reasoning: `Story gate ${input.gateRun.command} reported ${input.gateRun.result}.`,
		},
		{
			name: "final-verifier-result",
			status:
				input.verification.finalVerifierOutcome === "pass"
					? "pass"
					: input.verification.finalVerifierOutcome === "not-run"
						? "unknown"
						: "fail",
			evidence: input.verifierEvidenceRefs,
			reasoning: `Final verifier outcome is ${input.verification.finalVerifierOutcome}.`,
		},
		{
			name: "unresolved-findings-status",
			status: unresolvedFindings.length === 0 ? "pass" : "fail",
			evidence: unresolvedFindings.flatMap((finding) => finding.evidence),
			reasoning:
				unresolvedFindings.length === 0
					? "No unresolved verifier findings remain."
					: `${unresolvedFindings.length} verifier finding(s) remain unresolved.`,
		},
		{
			name: "scope-change-status",
			status: scopeChangeBlockers.length === 0 ? "pass" : "fail",
			evidence: input.scopeChanges.flatMap((item) => item.evidence),
			reasoning:
				scopeChangeBlockers.length === 0
					? "No scope changes require further ruling."
					: "At least one scope change still requires ruling or was rejected.",
		},
		{
			name: "shim-mock-fallback-status",
			status: shimBlockers.length === 0 ? "pass" : "fail",
			evidence: input.shimMockFallbackDecisions.flatMap(
				(item) => item.evidence,
			),
			reasoning:
				shimBlockers.length === 0
					? "No shim/mock/fallback decisions require further approval."
					: "At least one shim/mock/fallback decision still requires approval.",
		},
		{
			name: "baseline-status",
			status:
				baselinePass === null ? "unknown" : baselinePass ? "pass" : "fail",
			evidence: [
				`baselineBefore=${input.baselineBeforeStory ?? "unknown"}`,
				`baselineAfter=${input.baselineAfterStory ?? "unknown"}`,
			],
			reasoning: baselineKnown
				? baselinePass
					? "The current baseline did not drop below the prior accepted baseline."
					: "The current baseline dropped below the prior accepted baseline."
				: "Baseline evidence is not recorded for this attempt.",
		},
		{
			name: "receipt-readiness",
			status: receiptReady ? "pass" : "fail",
			evidence: [
				...input.implementorEvidenceRefs,
				...input.verifierEvidenceRefs,
			],
			reasoning: receiptReady
				? "Receipt draft includes implementor evidence, verifier evidence, and a passing story gate."
				: "Receipt draft is incomplete because evidence or gate results are missing.",
		},
		{
			name: "commit-readiness",
			status: input.commitReadiness.state === "not-ready" ? "fail" : "pass",
			evidence: [
				input.commitReadiness.commitSha ??
					input.commitReadiness.reason ??
					input.commitReadiness.state,
			],
			reasoning:
				input.commitReadiness.state === "committed"
					? "The required story commit has already landed."
					: input.commitReadiness.state === "ready-for-impl-lead-commit"
						? "The story is ready for impl-lead to create the required commit."
						: (input.commitReadiness.reason ??
							"Commit readiness has not been satisfied yet."),
		},
	];
}

function resolvedOutcome(input: {
	requestedOutcome: StoryLeadOutcome;
	acceptanceChecks: AcceptanceCheckItem[];
}): StoryLeadOutcome {
	if (input.requestedOutcome !== "accepted") {
		return input.requestedOutcome;
	}

	return input.acceptanceChecks.every((check) => check.status === "pass")
		? "accepted"
		: "blocked";
}

function recommendedImplLeadAction(input: {
	outcome: StoryLeadOutcome;
}): StoryLeadFinalPackage["recommendedImplLeadAction"] {
	switch (input.outcome) {
		case "accepted":
			return "accept";
		case "needs-ruling":
			return "ask-ruling";
		default:
			return "reopen";
	}
}

function acceptanceRationale(input: {
	outcome: StoryLeadOutcome;
	acceptanceChecks: AcceptanceCheckItem[];
	rulingRequest: CallerRulingRequest | null;
}): string {
	switch (input.outcome) {
		case "accepted":
			return "Story-lead scoped acceptance is ready for impl-lead review and outer acceptance.";
		case "needs-ruling":
			return input.rulingRequest
				? `Story-lead is pausing for caller ruling ${input.rulingRequest.id} before impl-lead can accept the story.`
				: "Story-lead needs a caller ruling before impl-lead can accept the story.";
		case "blocked":
			return `Story-lead could not accept the story because ${input.acceptanceChecks.filter((check) => check.status !== "pass").length} acceptance check(s) remain incomplete.`;
		case "failed":
			return "Story-lead failed before it could assemble a safe acceptance package.";
		case "interrupted":
			return "Story-lead was interrupted before it could reach a terminal acceptance decision.";
	}
}

function openRiskSummaries(input: {
	assumedRisks: RiskOrDeviationItem[];
	replayBoundary: ReplayBoundary | null;
	verification: StoryLeadVerification;
}): string[] {
	const riskDescriptions = input.assumedRisks.map((risk) => risk.description);
	const unresolved = input.verification.findings
		.filter((finding) => finding.status === "unresolved")
		.map((finding) => `Verification finding ${finding.id} remains unresolved.`);

	return [
		...riskDescriptions,
		...unresolved,
		...(input.replayBoundary ? [input.replayBoundary.reasoning] : []),
	];
}

export interface BuildStoryLeadFinalPackageInput {
	outcome: StoryLeadOutcome;
	storyId: string;
	storyRunId: string;
	attempt: number;
	storyTitle: string;
	implementedScope: string;
	diffReview?: DiffReview;
	evidence?: {
		implementorArtifacts?: ArtifactRef[];
		selfReviewArtifacts?: ArtifactRef[];
		verifierArtifacts?: ArtifactRef[];
		quickFixArtifacts?: ArtifactRef[];
		callerInputArtifacts?: ArtifactRef[];
	};
	verification?: StoryLeadVerification;
	riskAndDeviationReview?: {
		specDeviations?: RiskOrDeviationItem[];
		assumedRisks?: RiskOrDeviationItem[];
		scopeChanges?: RiskOrDeviationItem[];
		shimMockFallbackDecisions?: RiskOrDeviationItem[];
	};
	gateRun?: GateRunSummary;
	callerInputHistory?: CallerInputHistory;
	rulingRequest?: CallerRulingRequest | null;
	replayBoundary?: ReplayBoundary | null;
	continuationHandles?: Record<string, ContinuationHandle>;
	baselineBeforeStory?: number | null;
	baselineAfterStory?: number | null;
	latestActualTotal?: number | null;
	commitReadiness?: CommitReadiness;
}

export function buildStoryLeadFinalPackage(
	input: BuildStoryLeadFinalPackageInput,
): StoryLeadFinalPackage {
	const gateRun = input.gateRun ?? {
		command: "npm run green-verify",
		result: "not-run" as const,
	};
	const verification = input.verification ?? {
		finalVerifierOutcome: "not-run" as const,
		findings: [],
	};
	const riskAndDeviationReview = {
		specDeviations: input.riskAndDeviationReview?.specDeviations ?? [],
		assumedRisks: input.riskAndDeviationReview?.assumedRisks ?? [],
		scopeChanges: input.riskAndDeviationReview?.scopeChanges ?? [],
		shimMockFallbackDecisions:
			input.riskAndDeviationReview?.shimMockFallbackDecisions ?? [],
	};
	const commitReadiness =
		input.commitReadiness ?? defaultCommitReadiness({ outcome: input.outcome });
	const evidence = {
		implementorArtifacts: input.evidence?.implementorArtifacts ?? [],
		selfReviewArtifacts: input.evidence?.selfReviewArtifacts ?? [],
		verifierArtifacts: input.evidence?.verifierArtifacts ?? [],
		quickFixArtifacts: input.evidence?.quickFixArtifacts ?? [],
		callerInputArtifacts: input.evidence?.callerInputArtifacts ?? [],
		gateRuns: [gateRun],
	};
	const checks = acceptanceChecks({
		gateRun,
		verification,
		scopeChanges: riskAndDeviationReview.scopeChanges,
		shimMockFallbackDecisions: riskAndDeviationReview.shimMockFallbackDecisions,
		baselineBeforeStory: input.baselineBeforeStory ?? null,
		baselineAfterStory: input.baselineAfterStory ?? null,
		commitReadiness,
		implementorEvidenceRefs: evidence.implementorArtifacts.map(
			(artifact) => artifact.path,
		),
		verifierEvidenceRefs: evidence.verifierArtifacts.map(
			(artifact) => artifact.path,
		),
	});
	const outcome = resolvedOutcome({
		requestedOutcome: input.outcome,
		acceptanceChecks: checks,
	});
	const openRisks = openRiskSummaries({
		assumedRisks: riskAndDeviationReview.assumedRisks,
		replayBoundary: input.replayBoundary ?? null,
		verification,
	});
	const cleanupHandoff = buildCleanupHandoff({
		acceptedRiskItems: riskAndDeviationReview.assumedRisks.filter(
			(item) => item.approvalStatus === "approved",
		),
		deferredItems: riskAndDeviationReview.scopeChanges.filter(
			(item) => item.approvalStatus === "needs-ruling",
		),
		verification,
		replayBoundary: input.replayBoundary ?? null,
	});
	const effectiveRulingRequest =
		outcome === "needs-ruling" ? (input.rulingRequest ?? null) : null;

	return storyLeadFinalPackageSchema.parse({
		outcome,
		storyRunId: input.storyRunId,
		storyId: input.storyId,
		attempt: input.attempt,
		summary: {
			storyTitle: input.storyTitle,
			implementedScope: input.implementedScope,
			acceptanceRationale: acceptanceRationale({
				outcome,
				acceptanceChecks: checks,
				rulingRequest: effectiveRulingRequest,
			}),
		},
		evidence,
		verification,
		riskAndDeviationReview,
		diffReview:
			input.diffReview ??
			({
				changedFiles: [],
				storyScopedAssessment:
					"Story-lead package is scoped to orchestration evidence and impl-lead handoff data.",
			} satisfies DiffReview),
		acceptanceChecks: checks,
		callerInputHistory: input.callerInputHistory ?? {
			reviewRequests: [],
			rulings: [],
		},
		replayBoundary: input.replayBoundary ?? null,
		logHandoff: buildLogHandoff({
			outcome,
			storyId: input.storyId,
			storyTitle: input.storyTitle,
			continuationHandles: input.continuationHandles,
			gateRun,
			verification,
			implementorEvidenceRefs: evidence.implementorArtifacts.map(
				(artifact) => artifact.path,
			),
			verifierEvidenceRefs: evidence.verifierArtifacts.map(
				(artifact) => artifact.path,
			),
			openRisks,
			commitReadiness,
			baselineBeforeStory: input.baselineBeforeStory ?? null,
			baselineAfterStory: input.baselineAfterStory ?? null,
			latestActualTotal: input.latestActualTotal ?? null,
		}),
		cleanupHandoff,
		rulingRequest: effectiveRulingRequest,
		recommendedImplLeadAction: recommendedImplLeadAction({ outcome }),
	});
}
