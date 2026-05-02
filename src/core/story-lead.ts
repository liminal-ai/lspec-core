import { setTimeout as sleep } from "node:timers/promises";

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
import { pathExists } from "./fs-utils.js";
import { resolveStoryOrder } from "./story-order.js";
import type {
	ArtifactRef,
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

export interface StoryLeadRuntimeInput {
	specPackRoot: string;
	storyId: string;
	configPath?: string;
	ledger: StoryRunLedger;
	mode: "run" | "resume";
	startedFromPrimitiveArtifacts?: string[];
	existingAttempt?: StoryRunAttemptRecord;
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

function buildArtifactRefs(paths: string[]): ArtifactRef[] {
	return paths.map((path) => ({
		kind: "existing-story-artifact",
		path,
	}));
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

function buildSnapshot(input: {
	storyId: string;
	attemptPaths: StoryRunAttemptPaths;
	status: StoryRunCurrentSnapshot["status"];
	currentSummary: string;
	currentPhase: string;
	latestArtifacts: ArtifactRef[];
	latestContinuationHandles?: StoryRunCurrentSnapshot["latestContinuationHandles"];
	latestEventSequence: number;
	nextIntent: StoryRunCurrentSnapshot["nextIntent"];
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
		nextIntent: input.nextIntent,
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

function buildFinalPackage(input: {
	storyId: string;
	attemptPaths: StoryRunAttemptPaths;
	storyTitle: string;
	startedFromPrimitiveArtifacts?: string[];
}): StoryLeadFinalPackage {
	const orientationEvidence = input.startedFromPrimitiveArtifacts ?? [];

	return {
		outcome: "interrupted",
		storyRunId: input.attemptPaths.storyRunId,
		storyId: input.storyId,
		attempt: input.attemptPaths.attempt,
		summary: {
			storyTitle: input.storyTitle,
			implementedScope:
				"Story-level run surface, durable ledger, discovery, and caller-visible orchestration markers.",
			acceptanceRationale:
				"Story 2 records durable orchestration state and a terminal scaffold while the deeper story-lead decision loop lands in later stories.",
		},
		evidence: {
			implementorArtifacts: buildArtifactRefs(orientationEvidence),
			selfReviewArtifacts: [],
			verifierArtifacts: [],
			quickFixArtifacts: [],
			gateRuns: [
				{
					command: "npm run green-verify",
					result: "not-run",
				},
			],
		},
		verification: {
			finalVerifierOutcome: "not-run",
			findings: [],
		},
		riskAndDeviationReview: {
			specDeviations: [],
			assumedRisks: [
				{
					description:
						"Story-lead provider decisioning, review incorporation, and acceptance semantics are still staged for later stories.",
					reasoning:
						"Story 2 intentionally limits itself to run surfaces, attempt discovery, durable state, and recovery markers.",
					evidence: [
						"docs/spec-build/epics/03-orchestration-enhancements/stories/02-story-lead-run-surface-and-durable-ledger.md",
					],
					approvalStatus: "not-required",
					approvalSource: null,
				},
			],
			scopeChanges: [],
			shimMockFallbackDecisions: [],
		},
		diffReview: {
			changedFiles: [],
			storyScopedAssessment:
				"Runtime writes orchestration artifacts and surfaces durable status without dispatching child implementation actions yet.",
		},
		acceptanceChecks: [
			{
				name: "Durable story-run artifacts written",
				status: "pass",
				evidence: [
					input.attemptPaths.currentSnapshotPath,
					input.attemptPaths.eventHistoryPath,
					input.attemptPaths.finalPackagePath,
				],
				reasoning:
					"Current snapshot, append-only history, and final package artifacts exist for story-id recovery.",
			},
		],
		logHandoff: {
			recommendedState: "STORY_ORCHESTRATION_INTERRUPTED",
			recommendedCurrentStory: input.storyId,
			recommendedCurrentPhase: "story-orchestrate",
			continuationHandles: {},
			storyReceiptDraft: {
				storyId: input.storyId,
				storyTitle: input.storyTitle,
				implementorEvidenceRefs: orientationEvidence,
				verifierEvidenceRefs: [],
				gateCommand: "npm run green-verify",
				gateResult: "fail",
				dispositions: [],
				baselineBeforeStory: null,
				baselineAfterStory: null,
				openRisks: [
					"Resume semantics and full story-lead decisioning continue in later orchestration stories.",
				],
			},
			cumulativeBaseline: {
				baselineBeforeCurrentStory: null,
				expectedAfterCurrentStory: null,
				latestActualTotal: null,
			},
			commitReadiness: {
				state: "not-ready",
				reason:
					"Story orchestration state is durable, but the actual story-lead implementation loop is not complete in Story 2.",
			},
			openRisks: [
				"Resume semantics and full story-lead decisioning continue in later orchestration stories.",
			],
		},
		cleanupHandoff: {
			acceptedRiskItems: [],
			deferredItems: [],
			cleanupRequired: false,
		},
		rulingRequest: null,
		recommendedImplLeadAction: "reopen",
	};
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
	const attemptPaths =
		input.existingAttempt ?? (await input.ledger.createAttempt());
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
	const priorSnapshot = input.existingAttempt?.currentSnapshot;
	const initialArtifacts = input.existingAttempt
		? (priorSnapshot?.latestArtifacts ?? [])
		: buildArtifactRefs(input.startedFromPrimitiveArtifacts ?? []);
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
		nextIntent: {
			actionType: input.mode === "run" ? "orient-from-disk" : "reopen-attempt",
			summary:
				input.startedFromPrimitiveArtifacts &&
				input.startedFromPrimitiveArtifacts.length > 0
					? `Orient from ${input.startedFromPrimitiveArtifacts.length} existing story artifact(s).`
					: input.mode === "resume"
						? "Continue the existing durable story-lead attempt from its latest checkpoint."
						: "Persist durable story-lead state before deeper orchestration lands.",
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
		type: input.mode === "run" ? "story-run-started" : "story-run-resumed",
		summary:
			input.startedFromPrimitiveArtifacts &&
			input.startedFromPrimitiveArtifacts.length > 0
				? `Story orchestration ${input.mode} started after orienting from ${input.startedFromPrimitiveArtifacts.length} existing artifact(s).`
				: `Story orchestration ${input.mode} started.`,
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
		if (shouldLeaveAttemptIncomplete()) {
			const interruptedEvent = buildEvent({
				storyRunId: attemptPaths.storyRunId,
				sequence: currentSnapshot.latestEventSequence + 1,
				type: "interrupted",
				summary:
					"Story orchestration stopped before a terminal final package was written.",
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
				nextIntent: {
					actionType: "resume-story-run",
					summary:
						"Use story-orchestrate resume to continue this interrupted attempt.",
				},
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

		const finalPackage = buildFinalPackage({
			storyId,
			attemptPaths,
			storyTitle,
			startedFromPrimitiveArtifacts: input.startedFromPrimitiveArtifacts,
		});
		const terminalEvent = buildEvent({
			storyRunId: attemptPaths.storyRunId,
			sequence: currentSnapshot.latestEventSequence + 1,
			type: "interrupted",
			summary: `Terminal scaffold finalized with outcome ${finalPackage.outcome}.`,
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
			nextIntent: {
				actionType: "resume-story-run",
				summary:
					"Use story-orchestrate status or resume for explicit follow-up handling.",
				artifactRef: attemptPaths.finalPackagePath,
			},
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
