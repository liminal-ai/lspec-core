import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";

import { writeAtomic } from "../infra/fs-atomic.js";
import {
	buildAuthorityBoundaryRulingRequest,
	appendReviewRequest,
	appendRulingResponse,
	createCallerInputHistory,
} from "./review-ruling.js";
import {
	type CallerHarnessConfigRecord,
	loadRunConfig,
	resolveRunConfigPath,
} from "./config-schema.js";
import {
	type AttachedProgressEvent,
	type CallerHarness,
	createStoryHeartbeatEmitter,
	resolveCallerHeartbeatOptions,
} from "./heartbeat.js";
import { pathExists, readTextFile } from "./fs-utils.js";
import { resolveStoryOrder } from "./story-order.js";
import { buildStoryLeadFinalPackage } from "./story-final-package.js";
import type {
	ArtifactRef,
	CallerInputHistory,
	CallerRulingResponse,
	ImplLeadReviewRequest,
	ReplayBoundary,
	StoryLeadFinalPackage,
	StoryRunCurrentSnapshot,
	StoryRunEvent,
} from "./story-orchestrate-contracts.js";
import type {
	StoryRunAttemptPaths,
	StoryRunAttemptRecord,
	StoryRunLedger,
} from "./story-run-ledger.js";

const STORY_ORCHESTRATE_DELAY_MS_ENV = "LBUILD_IMPL_STORY_ORCHESTRATE_DELAY_MS";
const STORY_ORCHESTRATE_INCOMPLETE_ENV =
	"LBUILD_IMPL_STORY_ORCHESTRATE_INCOMPLETE";
const STORY_ORCHESTRATE_FAILURE_MODE_ENV =
	"LBUILD_IMPL_STORY_ORCHESTRATE_FAILURE_MODE";

export interface StoryLeadRuntimeInput {
	specPackRoot: string;
	storyId: string;
	configPath?: string;
	ledger: StoryRunLedger;
	mode: "run" | "resume";
	startedFromPrimitiveArtifacts?: string[];
	existingAttempt?: StoryRunAttemptRecord;
	reviewRequest?: ImplLeadReviewRequest;
	ruling?: CallerRulingResponse;
	callerHarness?: CallerHarness;
	heartbeatCadenceMinutes?: number;
	disableHeartbeats?: boolean;
	progressListener?: (event: AttachedProgressEvent) => void;
}

export interface StoryLeadRuntimeResult {
	case: "completed" | "interrupted";
	storyId: string;
	storyRunId: string;
	currentSnapshotPath: string;
	eventHistoryPath: string;
	finalPackagePath?: string;
	finalPackage?: StoryLeadFinalPackage;
	latestEventSequence: number;
	startedFromPrimitiveArtifacts?: string[];
}

async function loadCallerHarnessConfigIfPresent(input: {
	specPackRoot: string;
	configPath?: string;
}): Promise<CallerHarnessConfigRecord | undefined> {
	const resolvedPath = resolveRunConfigPath(
		input.specPackRoot,
		input.configPath,
	);
	if (!(await pathExists(resolvedPath))) {
		return undefined;
	}

	const config = await loadRunConfig(input);
	return config.caller_harness;
}

async function resolveStoryTitle(
	specPackRoot: string,
	storyId: string,
): Promise<string> {
	const storyOrder = await resolveStoryOrder(`${specPackRoot}/stories`);
	return (
		storyOrder.stories.find((candidate) => candidate.id === storyId)?.title ??
		storyId
	);
}

function nowIso(): string {
	return new Date().toISOString();
}

function readDelayMs(): number {
	const parsed = Number.parseInt(
		process.env[STORY_ORCHESTRATE_DELAY_MS_ENV] ?? "0",
		10,
	);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function shouldLeaveAttemptIncomplete(): boolean {
	return process.env[STORY_ORCHESTRATE_INCOMPLETE_ENV] === "1";
}

function readFailureMode():
	| "provider-output-invalid"
	| "context-window-limit"
	| null {
	const value = process.env[STORY_ORCHESTRATE_FAILURE_MODE_ENV];
	if (value === "provider-output-invalid" || value === "context-window-limit") {
		return value;
	}

	return null;
}

function artifactKindForCommand(
	command: string | undefined,
): ArtifactRef["kind"] {
	switch (command) {
		case "story-verify":
			return "verifier-result";
		case "story-self-review":
			return "self-review-result";
		case "quick-fix":
			return "quick-fix-result";
		default:
			return "implementor-result";
	}
}

async function buildArtifactRefs(paths: string[]): Promise<ArtifactRef[]> {
	const refs: ArtifactRef[] = [];

	for (const path of paths) {
		let command: string | undefined;
		try {
			const parsed = JSON.parse(await readTextFile(path)) as {
				command?: unknown;
			};
			command = typeof parsed.command === "string" ? parsed.command : undefined;
		} catch {
			command = undefined;
		}

		refs.push({
			kind: artifactKindForCommand(command),
			path,
		});
	}

	return refs;
}

function findFinalPackageArtifactPath(
	snapshot: StoryRunCurrentSnapshot,
): string | undefined {
	return snapshot.latestArtifacts.find(
		(artifact) => artifact.kind === "final-package",
	)?.path;
}

function mergeArtifacts(
	current: ArtifactRef[],
	additions: ArtifactRef[],
): ArtifactRef[] {
	const merged = [...current];
	const seen = new Set(
		current.map((artifact) => `${artifact.kind}:${artifact.path}`),
	);

	for (const artifact of additions) {
		const key = `${artifact.kind}:${artifact.path}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		merged.push(artifact);
	}

	return merged;
}

function filterArtifactsByKind(
	artifacts: ArtifactRef[],
	kinds: string[],
): ArtifactRef[] {
	return artifacts.filter((artifact) => kinds.includes(artifact.kind));
}

type DerivedVerifierOutcome = "pass" | "revise" | "block" | "not-run";

function normalizeVerifierOutcome(
	outcome: unknown,
): Exclude<DerivedVerifierOutcome, "not-run"> | null {
	switch (outcome) {
		case "pass":
		case "revise":
		case "block":
			return outcome;
		case "needs-human-ruling":
			return "block";
		default:
			return null;
	}
}

async function deriveVerifierOutcomeFromArtifacts(
	artifacts: ArtifactRef[],
): Promise<DerivedVerifierOutcome> {
	const uniqueOutcomes = new Set<Exclude<DerivedVerifierOutcome, "not-run">>();

	for (const artifact of artifacts) {
		try {
			const parsed = JSON.parse(await readTextFile(artifact.path)) as {
				command?: unknown;
				outcome?: unknown;
			};
			if (parsed.command !== "story-verify") {
				continue;
			}

			const normalized = normalizeVerifierOutcome(parsed.outcome);
			if (normalized) {
				uniqueOutcomes.add(normalized);
			}
		} catch {}
	}

	if (uniqueOutcomes.size !== 1) {
		return "not-run";
	}

	return [...uniqueOutcomes][0] ?? "not-run";
}

function buildSnapshot(input: {
	storyId: string;
	attemptPaths: StoryRunAttemptPaths;
	status: StoryRunCurrentSnapshot["status"];
	currentSummary: string;
	currentPhase: string;
	latestArtifacts: ArtifactRef[];
	latestContinuationHandles?: StoryRunCurrentSnapshot["latestContinuationHandles"];
	latestEventSequence: number;
	callerInputHistory?: CallerInputHistory;
	nextIntent: StoryRunCurrentSnapshot["nextIntent"];
	replayBoundary?: ReplayBoundary | null;
	currentChildOperation?: StoryRunCurrentSnapshot["currentChildOperation"];
	storyLeadSession?: StoryRunCurrentSnapshot["storyLeadSession"];
}): StoryRunCurrentSnapshot {
	return {
		storyRunId: input.attemptPaths.storyRunId,
		storyId: input.storyId,
		attempt: input.attemptPaths.attempt,
		status: input.status,
		currentSummary: input.currentSummary,
		currentPhase: input.currentPhase,
		currentChildOperation: input.currentChildOperation ?? null,
		latestArtifacts: input.latestArtifacts,
		latestContinuationHandles: input.latestContinuationHandles ?? {},
		latestEventSequence: input.latestEventSequence,
		callerInputHistory: input.callerInputHistory ?? createCallerInputHistory(),
		nextIntent: input.nextIntent,
		replayBoundary: input.replayBoundary ?? null,
		...(input.storyLeadSession
			? { storyLeadSession: input.storyLeadSession }
			: {}),
		updatedAt: nowIso(),
	};
}

function buildEvent(input: {
	storyRunId: string;
	sequence: number;
	type: string;
	summary: string;
	artifact?: string;
	data?: Record<string, unknown>;
}): StoryRunEvent {
	return {
		storyRunId: input.storyRunId,
		sequence: input.sequence,
		timestamp: nowIso(),
		type: input.type,
		summary: input.summary,
		...(input.artifact ? { artifact: input.artifact } : {}),
		...(input.data ? { data: input.data } : {}),
	};
}

function callerInputArtifactPath(input: {
	attemptPaths: StoryRunAttemptPaths;
	kind: "review-request" | "ruling-response";
	index: number;
}): string {
	return join(
		input.attemptPaths.artifactDir,
		`${input.attemptPaths.attemptKey}-${input.kind}-${String(input.index).padStart(3, "0")}.json`,
	);
}

async function persistCallerInputArtifact(input: {
	attemptPaths: StoryRunAttemptPaths;
	kind: "review-request" | "ruling-response";
	index: number;
	payload: unknown;
}): Promise<string> {
	const path = callerInputArtifactPath(input);
	await writeAtomic(path, `${JSON.stringify(input.payload, null, 2)}\n`);
	return path;
}

function replayBoundaryForFailure(input: {
	reason: "provider-output-invalid" | "context-window-limit" | "interrupted";
	validArtifactPaths: string[];
}): ReplayBoundary {
	switch (input.reason) {
		case "provider-output-invalid":
			return {
				smallestSafeStep: "resume-from-last-valid-artifact",
				reasoning:
					"Provider output became invalid after durable artifacts were written, so replay should resume from the last valid artifact boundary.",
				validArtifactPaths: input.validArtifactPaths,
				requiresFreshStoryLeadSession: false,
				requiresFreshChildProviderSession: true,
			};
		case "context-window-limit":
			return {
				smallestSafeStep: "rehydrate-from-durable-ledger",
				reasoning:
					"The retained session exhausted its context window, so the next safe step is to rehydrate from the durable ledger before continuing.",
				validArtifactPaths: input.validArtifactPaths,
				requiresFreshStoryLeadSession: true,
				requiresFreshChildProviderSession: false,
			};
		case "interrupted":
			return {
				smallestSafeStep: "resume-current-attempt",
				reasoning:
					"The attempt stopped before terminal finalization, so the safest replay point is the current durable story-run snapshot.",
				validArtifactPaths: input.validArtifactPaths,
				requiresFreshStoryLeadSession: false,
				requiresFreshChildProviderSession: false,
			};
	}
}

function buildAttachedEvent(input: {
	type: AttachedProgressEvent["type"];
	command: string;
	phase: string;
	summary: string;
	callerHarness: CallerHarness;
	storyId: string;
	storyRunId: string;
	statusArtifact: string;
	elapsedTime?: string;
	finalPackagePath?: string;
}): AttachedProgressEvent {
	return {
		type: input.type,
		command: input.command,
		phase: input.phase,
		summary: input.summary,
		callerHarness: input.callerHarness,
		storyId: input.storyId,
		storyRunId: input.storyRunId,
		statusArtifact: input.statusArtifact,
		...(input.elapsedTime ? { elapsedTime: input.elapsedTime } : {}),
		...(input.finalPackagePath
			? { finalPackagePath: input.finalPackagePath }
			: {}),
	};
}

function formatElapsed(startedAt: number): string {
	const elapsedMs = Math.max(0, Date.now() - startedAt);
	const totalSeconds = Math.floor(elapsedMs / 1_000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export async function runStoryLead(
	input: StoryLeadRuntimeInput,
): Promise<StoryLeadRuntimeResult> {
	const reopeningAcceptedAttempt = Boolean(
		input.mode === "resume" &&
			input.existingAttempt?.currentSnapshot.status === "accepted" &&
			input.reviewRequest,
	);
	const attemptPaths = reopeningAcceptedAttempt
		? await input.ledger.createAttempt()
		: (input.existingAttempt ?? (await input.ledger.createAttempt()));
	const storyId = input.storyId;
	const storyTitle = await resolveStoryTitle(input.specPackRoot, storyId);
	const startedAtMs = Date.now();
	const callerHarnessConfig = await loadCallerHarnessConfigIfPresent({
		specPackRoot: input.specPackRoot,
		configPath: input.configPath,
	});
	const resolvedHeartbeat = resolveCallerHeartbeatOptions({
		callerHarness: input.callerHarness,
		heartbeatCadenceMinutes: input.heartbeatCadenceMinutes,
		disableHeartbeats: input.disableHeartbeats,
		config: callerHarnessConfig,
		operationKind: "story",
	});
	const activeCallerHarness =
		input.callerHarness ??
		resolvedHeartbeat?.callerHarness ??
		callerHarnessConfig?.harness ??
		"generic";
	const priorAttempt = input.existingAttempt;
	const priorSnapshot = reopeningAcceptedAttempt
		? undefined
		: input.existingAttempt?.currentSnapshot;
	const priorAcceptedFinalPackage = input.existingAttempt?.finalPackage;
	let callerInputHistory = reopeningAcceptedAttempt
		? createCallerInputHistory()
		: (priorSnapshot?.callerInputHistory ?? createCallerInputHistory());
	let callerInputArtifacts: ArtifactRef[] = reopeningAcceptedAttempt
		? priorAcceptedFinalPackage
			? [
					{
						kind: "prior-final-package",
						path: input.existingAttempt?.finalPackagePath ?? "",
					},
				]
			: []
		: [];
	const primitiveArtifacts = await buildArtifactRefs(
		input.startedFromPrimitiveArtifacts ?? [],
	);
	const initialArtifacts = reopeningAcceptedAttempt
		? mergeArtifacts(
				priorAcceptedFinalPackage?.evidence.implementorArtifacts ?? [],
				mergeArtifacts(
					priorAcceptedFinalPackage?.evidence.verifierArtifacts ?? [],
					callerInputArtifacts,
				),
			)
		: input.existingAttempt
			? (priorSnapshot?.latestArtifacts ?? [])
			: primitiveArtifacts;
	const initialLatestEventSequence =
		input.mode === "resume" && priorSnapshot
			? priorSnapshot.latestEventSequence
			: 0;
	let currentSnapshot = buildSnapshot({
		storyId,
		attemptPaths,
		status: "running",
		currentSummary:
			input.mode === "run"
				? "Story orchestration started and durable state has been initialized."
				: "Story orchestration resume requested and durable state has been reopened.",
		currentPhase:
			input.mode === "run"
				? "story-orchestrate-run"
				: "story-orchestrate-resume",
		latestArtifacts: initialArtifacts,
		latestContinuationHandles:
			input.mode === "resume" ? priorSnapshot?.latestContinuationHandles : {},
		latestEventSequence: initialLatestEventSequence,
		callerInputHistory,
		nextIntent: {
			actionType:
				input.mode === "run"
					? "orient-from-disk"
					: reopeningAcceptedAttempt
						? "reopen-accepted-attempt"
						: "resume-attempt",
			summary:
				input.startedFromPrimitiveArtifacts &&
				input.startedFromPrimitiveArtifacts.length > 0
					? `Orient from ${input.startedFromPrimitiveArtifacts.length} existing story artifact(s).`
					: reopeningAcceptedAttempt
						? `Open a fresh story-lead attempt linked to accepted attempt ${priorAttempt?.storyRunId}.`
						: input.mode === "resume"
							? "Continue the existing durable story-lead attempt from its latest checkpoint."
							: "Assemble a durable story-lead package for impl-lead review.",
		},
		currentChildOperation:
			input.mode === "resume" ? priorSnapshot?.currentChildOperation : null,
		storyLeadSession:
			input.mode === "resume" ? priorSnapshot?.storyLeadSession : undefined,
	});

	await input.ledger.writeCurrentSnapshot({
		storyId,
		storyRunId: attemptPaths.storyRunId,
		snapshot: currentSnapshot,
	});
	const openedEvent = buildEvent({
		storyRunId: attemptPaths.storyRunId,
		sequence: currentSnapshot.latestEventSequence + 1,
		type:
			input.mode === "run"
				? "story-run-started"
				: reopeningAcceptedAttempt
					? "story-run-reopened"
					: "story-run-resumed",
		summary: reopeningAcceptedAttempt
			? `Story orchestration reopened accepted attempt ${priorAttempt?.storyRunId} as ${attemptPaths.storyRunId}.`
			: input.startedFromPrimitiveArtifacts &&
					input.startedFromPrimitiveArtifacts.length > 0
				? `Story orchestration ${input.mode} started after orienting from ${input.startedFromPrimitiveArtifacts.length} existing artifact(s).`
				: `Story orchestration ${input.mode} started.`,
		...(reopeningAcceptedAttempt && priorAttempt
			? {
					data: {
						reopenedFromStoryRunId: priorAttempt.storyRunId,
						priorFinalPackagePath: priorAttempt.finalPackagePath,
					},
				}
			: {}),
	});
	await input.ledger.appendEvent({
		storyId,
		storyRunId: attemptPaths.storyRunId,
		event: openedEvent,
	});
	currentSnapshot = {
		...currentSnapshot,
		latestEventSequence: openedEvent.sequence,
		updatedAt: openedEvent.timestamp,
	};
	await input.ledger.writeCurrentSnapshot({
		storyId,
		storyRunId: attemptPaths.storyRunId,
		snapshot: currentSnapshot,
	});

	if (input.reviewRequest) {
		const reviewArtifactPath = await persistCallerInputArtifact({
			attemptPaths,
			kind: "review-request",
			index: callerInputHistory.reviewRequests.length + 1,
			payload: input.reviewRequest,
		});
		callerInputHistory = appendReviewRequest(
			callerInputHistory,
			input.reviewRequest,
		);
		callerInputArtifacts = [
			...callerInputArtifacts,
			{
				kind: "review-request",
				path: reviewArtifactPath,
			},
		];
		const reviewEvent = buildEvent({
			storyRunId: attemptPaths.storyRunId,
			sequence: currentSnapshot.latestEventSequence + 1,
			type: "review-request-received",
			summary: `Impl-lead review request received: ${input.reviewRequest.summary}`,
			artifact: reviewArtifactPath,
			data: {
				source: input.reviewRequest.source,
				decision: input.reviewRequest.decision,
				itemIds: input.reviewRequest.items.map((item) => item.id),
			},
		});
		await input.ledger.appendEvent({
			storyId,
			storyRunId: attemptPaths.storyRunId,
			event: reviewEvent,
		});
		currentSnapshot = buildSnapshot({
			...currentSnapshot,
			attemptPaths,
			status: "running",
			currentSummary:
				"Review request recorded and story-lead reopen handling is underway.",
			currentPhase: "review-requested",
			latestArtifacts: mergeArtifacts(currentSnapshot.latestArtifacts, [
				{
					kind: "review-request",
					path: reviewArtifactPath,
				},
			]),
			latestEventSequence: reviewEvent.sequence,
			callerInputHistory,
			nextIntent: {
				actionType: "address-review-request",
				summary: input.reviewRequest.summary,
				artifactRef: reviewArtifactPath,
			},
			currentChildOperation: currentSnapshot.currentChildOperation,
			storyLeadSession: currentSnapshot.storyLeadSession,
			latestContinuationHandles: currentSnapshot.latestContinuationHandles,
			replayBoundary: null,
		});
		await input.ledger.writeCurrentSnapshot({
			storyId,
			storyRunId: attemptPaths.storyRunId,
			snapshot: currentSnapshot,
		});
	}

	if (input.ruling) {
		const rulingArtifactPath = await persistCallerInputArtifact({
			attemptPaths,
			kind: "ruling-response",
			index: callerInputHistory.rulings.length + 1,
			payload: input.ruling,
		});
		callerInputHistory = appendRulingResponse(callerInputHistory, input.ruling);
		callerInputArtifacts = [
			...callerInputArtifacts,
			{
				kind: "ruling-response",
				path: rulingArtifactPath,
			},
		];
		const rulingEvent = buildEvent({
			storyRunId: attemptPaths.storyRunId,
			sequence: currentSnapshot.latestEventSequence + 1,
			type: "ruling-received",
			summary: `Caller ruling received for ${input.ruling.rulingRequestId}.`,
			artifact: rulingArtifactPath,
			data: {
				rulingRequestId: input.ruling.rulingRequestId,
				decision: input.ruling.decision,
				source: input.ruling.source,
			},
		});
		await input.ledger.appendEvent({
			storyId,
			storyRunId: attemptPaths.storyRunId,
			event: rulingEvent,
		});
		currentSnapshot = buildSnapshot({
			...currentSnapshot,
			attemptPaths,
			status: "running",
			currentSummary:
				"Caller ruling recorded and story-lead finalization is resuming.",
			currentPhase: "ruling-received",
			latestArtifacts: mergeArtifacts(currentSnapshot.latestArtifacts, [
				{
					kind: "ruling-response",
					path: rulingArtifactPath,
				},
			]),
			latestEventSequence: rulingEvent.sequence,
			callerInputHistory,
			nextIntent: {
				actionType: "apply-ruling",
				summary: `${input.ruling.rulingRequestId}: ${input.ruling.decision}`,
				artifactRef: rulingArtifactPath,
			},
			currentChildOperation: currentSnapshot.currentChildOperation,
			storyLeadSession: currentSnapshot.storyLeadSession,
			latestContinuationHandles: currentSnapshot.latestContinuationHandles,
			replayBoundary: null,
		});
		await input.ledger.writeCurrentSnapshot({
			storyId,
			storyRunId: attemptPaths.storyRunId,
			snapshot: currentSnapshot,
		});
	}

	const heartbeat =
		input.progressListener && resolvedHeartbeat
			? createStoryHeartbeatEmitter({
					command:
						input.mode === "run"
							? "story-orchestrate run"
							: "story-orchestrate resume",
					callerHarness: activeCallerHarness,
					cadenceMinutes: resolvedHeartbeat.heartbeatCadenceMinutes,
					currentSnapshotPath: attemptPaths.currentSnapshotPath,
					startedAt: startedAtMs,
					readSnapshot: () => currentSnapshot,
					writeAttachedOutput: input.progressListener,
				})
			: null;

	input.progressListener?.(
		buildAttachedEvent({
			type: "progress",
			command:
				input.mode === "run"
					? "story-orchestrate run"
					: "story-orchestrate resume",
			phase: currentSnapshot.currentPhase,
			summary:
				input.startedFromPrimitiveArtifacts &&
				input.startedFromPrimitiveArtifacts.length > 0
					? `Oriented from existing artifacts: ${input.startedFromPrimitiveArtifacts.join(", ")}`
					: "Started a fresh durable story-lead attempt.",
			callerHarness: activeCallerHarness,
			storyId,
			storyRunId: attemptPaths.storyRunId,
			statusArtifact: attemptPaths.currentSnapshotPath,
		}),
	);
	heartbeat?.start();

	const delayMs = readDelayMs();
	if (delayMs > 0) {
		await sleep(delayMs);
	}

	try {
		const failureMode = readFailureMode();

		if (failureMode) {
			const failureEvent = buildEvent({
				storyRunId: attemptPaths.storyRunId,
				sequence: currentSnapshot.latestEventSequence + 1,
				type: failureMode,
				summary:
					failureMode === "provider-output-invalid"
						? "Story-lead could not parse the provider output into a valid bounded action."
						: "Story-lead hit a retained-session context-window limit.",
				data: {
					reason: failureMode,
					recoveryBoundary: replayBoundaryForFailure({
						reason: failureMode,
						validArtifactPaths: currentSnapshot.latestArtifacts.map(
							(artifact) => artifact.path,
						),
					}),
				},
			});
			await input.ledger.appendEvent({
				storyId,
				storyRunId: attemptPaths.storyRunId,
				event: failureEvent,
			});
			currentSnapshot = buildSnapshot({
				storyId,
				attemptPaths,
				status: "interrupted",
				currentSummary:
					failureMode === "provider-output-invalid"
						? "Provider output invalidated the retained loop before terminal finalization."
						: "Context-window exhaustion requires a fresh replay from the durable ledger.",
				currentPhase: "interrupted",
				latestArtifacts: currentSnapshot.latestArtifacts,
				latestContinuationHandles: currentSnapshot.latestContinuationHandles,
				latestEventSequence: failureEvent.sequence,
				callerInputHistory,
				nextIntent: {
					actionType: "replay-smallest-safe-step",
					summary: replayBoundaryForFailure({
						reason: failureMode,
						validArtifactPaths: currentSnapshot.latestArtifacts.map(
							(artifact) => artifact.path,
						),
					}).smallestSafeStep,
				},
				replayBoundary: replayBoundaryForFailure({
					reason: failureMode,
					validArtifactPaths: currentSnapshot.latestArtifacts.map(
						(artifact) => artifact.path,
					),
				}),
				currentChildOperation: currentSnapshot.currentChildOperation,
				storyLeadSession: currentSnapshot.storyLeadSession,
			});
			await input.ledger.writeCurrentSnapshot({
				storyId,
				storyRunId: attemptPaths.storyRunId,
				snapshot: currentSnapshot,
			});

			return {
				case: "interrupted",
				storyId,
				storyRunId: attemptPaths.storyRunId,
				currentSnapshotPath: attemptPaths.currentSnapshotPath,
				eventHistoryPath: attemptPaths.eventHistoryPath,
				latestEventSequence: currentSnapshot.latestEventSequence,
				startedFromPrimitiveArtifacts: input.startedFromPrimitiveArtifacts,
			};
		}

		if (shouldLeaveAttemptIncomplete()) {
			const replayBoundary = replayBoundaryForFailure({
				reason: "interrupted",
				validArtifactPaths: currentSnapshot.latestArtifacts.map(
					(artifact) => artifact.path,
				),
			});
			const interruptedEvent = buildEvent({
				storyRunId: attemptPaths.storyRunId,
				sequence: currentSnapshot.latestEventSequence + 1,
				type: "interrupted",
				summary:
					"Story orchestration stopped before a terminal final package was written.",
				data: {
					recoveryBoundary: replayBoundary,
				},
			});
			await input.ledger.appendEvent({
				storyId,
				storyRunId: attemptPaths.storyRunId,
				event: interruptedEvent,
			});
			currentSnapshot = buildSnapshot({
				storyId,
				attemptPaths,
				status: "interrupted",
				currentSummary:
					"Interrupted before a terminal final package was written.",
				currentPhase: "interrupted",
				latestArtifacts: currentSnapshot.latestArtifacts,
				latestContinuationHandles: currentSnapshot.latestContinuationHandles,
				latestEventSequence: interruptedEvent.sequence,
				callerInputHistory,
				nextIntent: {
					actionType: "resume-story-run",
					summary:
						"Use story-orchestrate resume to continue this interrupted attempt.",
				},
				replayBoundary,
				currentChildOperation: currentSnapshot.currentChildOperation,
				storyLeadSession: currentSnapshot.storyLeadSession,
			});
			await input.ledger.writeCurrentSnapshot({
				storyId,
				storyRunId: attemptPaths.storyRunId,
				snapshot: currentSnapshot,
			});
			input.progressListener?.(
				buildAttachedEvent({
					type: "terminal",
					command:
						input.mode === "run"
							? "story-orchestrate run"
							: "story-orchestrate resume",
					phase: "interrupted",
					summary: `Incomplete run recorded for story ${storyId} as ${attemptPaths.storyRunId}. Resume is required because no final package was written.`,
					callerHarness: activeCallerHarness,
					storyId,
					storyRunId: attemptPaths.storyRunId,
					statusArtifact: attemptPaths.currentSnapshotPath,
					elapsedTime: formatElapsed(startedAtMs),
				}),
			);

			return {
				case: "interrupted",
				storyId,
				storyRunId: attemptPaths.storyRunId,
				currentSnapshotPath: attemptPaths.currentSnapshotPath,
				eventHistoryPath: attemptPaths.eventHistoryPath,
				latestEventSequence: currentSnapshot.latestEventSequence,
				startedFromPrimitiveArtifacts: input.startedFromPrimitiveArtifacts,
			};
		}

		const implementorArtifacts = filterArtifactsByKind(
			currentSnapshot.latestArtifacts,
			["implementor-result"],
		);
		const verifierArtifacts = filterArtifactsByKind(
			currentSnapshot.latestArtifacts,
			["verifier-result"],
		);
		const selfReviewArtifacts =
			priorAcceptedFinalPackage?.evidence.selfReviewArtifacts ?? [];
		const quickFixArtifacts =
			priorAcceptedFinalPackage?.evidence.quickFixArtifacts ?? [];
		const inheritedGateRun = input.reviewRequest
			? undefined
			: priorAcceptedFinalPackage?.evidence.gateRuns.at(-1);
		const inheritedBaseline = input.reviewRequest
			? undefined
			: priorAcceptedFinalPackage?.logHandoff.cumulativeBaseline;
		const inheritedCommitReadiness = input.reviewRequest
			? undefined
			: priorAcceptedFinalPackage?.logHandoff.commitReadiness;
		const hasImplementorEvidence = implementorArtifacts.length > 0;
		const hasVerifierEvidence = verifierArtifacts.length > 0;
		const hasRecordedGatePass = inheritedGateRun?.result === "pass";
		const hasRecordedBaseline =
			typeof inheritedBaseline?.baselineBeforeCurrentStory === "number" &&
			typeof inheritedBaseline.latestActualTotal === "number";
		const hasRecordedCommitReadiness =
			inheritedCommitReadiness?.state === "committed" ||
			inheritedCommitReadiness?.state === "ready-for-impl-lead-commit";
		const reviewFindings =
			input.reviewRequest?.items.map((item) => ({
				id: item.id,
				status: "unresolved" as const,
				evidence: [
					...callerInputArtifacts.map((artifact) => artifact.path),
					...(item.evidence ?? []),
				],
			})) ?? [];
		const derivedVerifierOutcome =
			reviewFindings.length > 0
				? "block"
				: await deriveVerifierOutcomeFromArtifacts(verifierArtifacts);
		const requestedOutcome =
			input.reviewRequest?.decision === "ask-ruling"
				? "needs-ruling"
				: input.reviewRequest
					? "blocked"
					: !hasImplementorEvidence && !hasVerifierEvidence && !input.ruling
						? "needs-ruling"
						: hasImplementorEvidence &&
								hasVerifierEvidence &&
								hasRecordedGatePass &&
								hasRecordedBaseline &&
								hasRecordedCommitReadiness
							? "accepted"
							: "blocked";
		const rulingRequest =
			requestedOutcome === "needs-ruling"
				? buildAuthorityBoundaryRulingRequest({
						id: `${attemptPaths.storyRunId}-ruling-001`,
						decisionType:
							input.reviewRequest?.decision === "ask-ruling"
								? "scope-change"
								: "provider-failure",
						question: input.reviewRequest
							? `Should story-lead reopen ${priorAttempt?.storyRunId ?? storyId} according to the impl-lead review request?`
							: "Should story-lead proceed without fresh implementor and verifier evidence for this story?",
						defaultRecommendation: input.reviewRequest
							? "Reopen the story and address the review request before impl-lead acceptance."
							: "Pause for caller ruling instead of accepting without evidence.",
						evidence: [
							...callerInputArtifacts.map((artifact) => artifact.path),
							...implementorArtifacts.map((artifact) => artifact.path),
						],
						allowedResponses:
							input.reviewRequest?.decision === "ask-ruling"
								? ["reopen", "reject"]
								: ["pause", "proceed"],
					})
				: null;
		const finalPackage = buildStoryLeadFinalPackage({
			outcome: requestedOutcome,
			storyId,
			storyRunId: attemptPaths.storyRunId,
			attempt: attemptPaths.attempt,
			storyTitle,
			implementedScope:
				"Story-lead acceptance package, review-driven reopen flow, replay hints, and impl-lead handoff scaffolding.",
			evidence: {
				implementorArtifacts,
				selfReviewArtifacts,
				verifierArtifacts,
				quickFixArtifacts,
				callerInputArtifacts,
			},
			verification: {
				finalVerifierOutcome: derivedVerifierOutcome,
				findings: reviewFindings,
			},
			riskAndDeviationReview: {
				specDeviations: [],
				assumedRisks:
					requestedOutcome === "needs-ruling" && !input.reviewRequest
						? [
								{
									description:
										"Fresh implementor and verifier evidence is still missing for this story-lead attempt.",
									reasoning:
										"Story-lead should not silently accept without durable evidence for receipt and commit review.",
									evidence: [
										attemptPaths.currentSnapshotPath,
										...implementorArtifacts.map((artifact) => artifact.path),
									],
									approvalStatus: "needs-ruling",
									approvalSource: null,
								},
							]
						: [],
				scopeChanges:
					input.reviewRequest?.decision === "ask-ruling"
						? [
								{
									description: input.reviewRequest.summary,
									reasoning:
										"Impl-lead asked for a ruling-boundary reopen instead of silent acceptance.",
									evidence: callerInputArtifacts.map(
										(artifact) => artifact.path,
									),
									approvalStatus: "needs-ruling",
									approvalSource: null,
								},
							]
						: [],
				shimMockFallbackDecisions: [],
			},
			diffReview: priorAcceptedFinalPackage?.diffReview ?? {
				changedFiles: [],
				storyScopedAssessment:
					"Story-lead preserved story scope and surfaced only handoff-specific orchestration evidence.",
			},
			callerInputHistory,
			rulingRequest,
			replayBoundary: null,
			gateRun: inheritedGateRun,
			continuationHandles: currentSnapshot.latestContinuationHandles,
			baselineBeforeStory:
				inheritedBaseline?.baselineBeforeCurrentStory ?? null,
			baselineAfterStory:
				inheritedBaseline?.expectedAfterCurrentStory ??
				inheritedBaseline?.latestActualTotal ??
				null,
			latestActualTotal: inheritedBaseline?.latestActualTotal ?? null,
			commitReadiness:
				requestedOutcome === "accepted"
					? inheritedCommitReadiness
					: {
							state: "not-ready",
							reason: input.reviewRequest
								? "Open review-request findings still require remediation before commit readiness can be claimed."
								: requestedOutcome === "needs-ruling"
									? "Caller ruling is still required before impl-lead commit."
									: "Story-lead did not reach a commit-ready acceptance state.",
						},
		});
		const terminalEvent = buildEvent({
			storyRunId: attemptPaths.storyRunId,
			sequence: currentSnapshot.latestEventSequence + 1,
			type: finalPackage.outcome,
			summary: `Story-lead finalized ${attemptPaths.storyRunId} with outcome ${finalPackage.outcome}.`,
			artifact: attemptPaths.finalPackagePath,
		});
		await input.ledger.appendEvent({
			storyId,
			storyRunId: attemptPaths.storyRunId,
			event: terminalEvent,
		});
		currentSnapshot = buildSnapshot({
			storyId,
			attemptPaths,
			status: finalPackage.outcome,
			currentSummary:
				"Terminal scaffold written; durable state is ready for story-id recovery or explicit resume handling.",
			currentPhase: "terminal",
			latestArtifacts: mergeArtifacts(currentSnapshot.latestArtifacts, [
				{
					kind: "final-package",
					path: attemptPaths.finalPackagePath,
				},
			]),
			latestContinuationHandles: currentSnapshot.latestContinuationHandles,
			latestEventSequence: terminalEvent.sequence,
			callerInputHistory,
			nextIntent: {
				actionType:
					finalPackage.outcome === "accepted"
						? "impl-lead-review"
						: finalPackage.outcome === "needs-ruling"
							? "await-ruling"
							: "reopen-story-run",
				summary:
					finalPackage.outcome === "accepted"
						? "Impl-lead can review the scoped acceptance package."
						: finalPackage.outcome === "needs-ruling"
							? "Pause for caller ruling before impl-lead acceptance."
							: "Use story-orchestrate status or resume for explicit follow-up handling.",
				artifactRef: attemptPaths.finalPackagePath,
			},
			replayBoundary: finalPackage.replayBoundary,
			currentChildOperation: currentSnapshot.currentChildOperation,
			storyLeadSession: currentSnapshot.storyLeadSession,
		});
		await input.ledger.writeCurrentSnapshot({
			storyId,
			storyRunId: attemptPaths.storyRunId,
			snapshot: currentSnapshot,
		});
		await input.ledger.writeFinalPackage({
			storyId,
			storyRunId: attemptPaths.storyRunId,
			finalPackage,
		});
		const terminalFinalPackagePath =
			findFinalPackageArtifactPath(currentSnapshot) ??
			attemptPaths.finalPackagePath;
		input.progressListener?.(
			buildAttachedEvent({
				type: "terminal",
				command:
					input.mode === "run"
						? "story-orchestrate run"
						: "story-orchestrate resume",
				phase: "terminal",
				summary: `Story ${storyId} finished with outcome ${finalPackage.outcome}. storyRunId=${attemptPaths.storyRunId}. Final package: ${terminalFinalPackagePath}`,
				callerHarness: activeCallerHarness,
				storyId,
				storyRunId: attemptPaths.storyRunId,
				statusArtifact: attemptPaths.currentSnapshotPath,
				elapsedTime: formatElapsed(startedAtMs),
				finalPackagePath: terminalFinalPackagePath,
			}),
		);

		return {
			case: "completed",
			storyId,
			storyRunId: attemptPaths.storyRunId,
			currentSnapshotPath: attemptPaths.currentSnapshotPath,
			eventHistoryPath: attemptPaths.eventHistoryPath,
			finalPackagePath: attemptPaths.finalPackagePath,
			finalPackage,
			latestEventSequence: currentSnapshot.latestEventSequence,
			startedFromPrimitiveArtifacts: input.startedFromPrimitiveArtifacts,
		};
	} finally {
		heartbeat?.stop();
	}
}
