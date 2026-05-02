import { z } from "zod";

import {
	type CallerHarness,
	type CallerHarnessConfigRecord,
	callerHarnessSchema,
	DEFAULT_PRIMITIVE_HEARTBEAT_CADENCE_MINUTES,
	renderCallerGuidance,
	resolveCallerHarnessConfig,
} from "./caller-guidance.js";
import { type RuntimeStatus, runtimeStatusSchema } from "./runtime-progress.js";
import {
	type StoryRunCurrentSnapshot,
	storyRunCurrentSnapshotSchema,
} from "./story-orchestrate-contracts.js";

export type { CallerHarness, CallerHarnessConfigRecord };
export { callerHarnessSchema };

export const nextPollRecommendationSchema = z.union([
	z.string().min(1),
	z
		.object({
			afterMinutes: z.number().int().positive(),
			action: z.string().min(1),
		})
		.strict(),
]);

export const attachedProgressEventSchema = z
	.object({
		type: z.enum(["progress", "heartbeat", "terminal"]),
		command: z.string().min(1),
		phase: z.string().min(1),
		summary: z.string().min(1),
		callerHarness: callerHarnessSchema,
		storyId: z.string().min(1).optional(),
		storyRunId: z.string().min(1).optional(),
		elapsedTime: z.string().min(1).optional(),
		lastOutputAt: z.string().min(1).nullable().optional(),
		statusArtifact: z.string().min(1).optional(),
		nextPollRecommendation: nextPollRecommendationSchema.optional(),
		finalPackagePath: z.string().min(1).optional(),
	})
	.strict();

export type NextPollRecommendation = z.infer<
	typeof nextPollRecommendationSchema
>;
export type AttachedProgressEvent = z.infer<typeof attachedProgressEventSchema>;

export const heartbeatMessageSchema = z
	.object({
		command: z.string().min(1),
		storyId: z.string().min(1).optional(),
		storyRunId: z.string().min(1).optional(),
		elapsedTime: z.string().min(1),
		phase: z.string().min(1),
		lastOutputAt: z.string().min(1).nullable(),
		statusArtifact: z.string().min(1),
		nextPollRecommendation: nextPollRecommendationSchema,
		callerHarness: callerHarnessSchema,
	})
	.strict();

export type HeartbeatMessage = z.infer<typeof heartbeatMessageSchema>;

export interface HeartbeatOptions {
	callerHarness?: CallerHarness;
	heartbeatCadenceMinutes?: number;
	disableHeartbeats?: boolean;
	progressListener?: (event: AttachedProgressEvent) => void;
}

export interface ResolvedHeartbeatOptions {
	callerHarness: CallerHarness;
	heartbeatCadenceMinutes: number;
	primitiveHeartbeatCadenceMinutes: number;
	storyHeartbeatCadenceMinutes: number;
}

export interface HeartbeatEmitter {
	start(): void;
	stop(): void;
}

const HEARTBEAT_TEST_INTERVAL_OVERRIDE_ENV =
	"LBUILD_IMPL_HEARTBEAT_INTERVAL_MS";

const runtimeSnapshotHeartbeatSchema = runtimeStatusSchema;

type RuntimeSnapshotForHeartbeat = z.infer<
	typeof runtimeSnapshotHeartbeatSchema
>;

export function resolveCallerHeartbeatOptions(input: {
	callerHarness?: CallerHarness;
	heartbeatCadenceMinutes?: number;
	disableHeartbeats?: boolean;
	config?: CallerHarnessConfigRecord;
	operationKind: "primitive" | "story";
}): ResolvedHeartbeatOptions | null {
	if (input.disableHeartbeats) {
		return null;
	}

	const resolvedConfig = resolveCallerHarnessConfig(input.config);
	const heartbeatCadenceMinutes =
		input.heartbeatCadenceMinutes ??
		(input.operationKind === "primitive"
			? resolvedConfig.primitiveHeartbeatCadenceMinutes
			: resolvedConfig.storyHeartbeatCadenceMinutes);

	return {
		callerHarness: input.callerHarness ?? resolvedConfig.harness,
		heartbeatCadenceMinutes,
		primitiveHeartbeatCadenceMinutes:
			resolvedConfig.primitiveHeartbeatCadenceMinutes,
		storyHeartbeatCadenceMinutes: resolvedConfig.storyHeartbeatCadenceMinutes,
	};
}

export function buildHeartbeatMessage(input: {
	command: string;
	storyId?: string;
	storyRunId?: string;
	elapsedTime: string;
	phase: string;
	lastOutputAt: string | null;
	statusArtifact: string;
	nextPollRecommendation: NextPollRecommendation;
	callerHarness: CallerHarness;
}): HeartbeatMessage {
	return heartbeatMessageSchema.parse({
		command: input.command,
		storyId: input.storyId,
		storyRunId: input.storyRunId,
		elapsedTime: input.elapsedTime,
		phase: input.phase,
		lastOutputAt: input.lastOutputAt,
		statusArtifact: input.statusArtifact,
		nextPollRecommendation: input.nextPollRecommendation,
		callerHarness: input.callerHarness,
	});
}

function resolveHeartbeatCadenceMs(cadenceMinutes: number): number {
	const override = process.env[HEARTBEAT_TEST_INTERVAL_OVERRIDE_ENV];
	if (override) {
		const parsed = Number(override);
		if (Number.isFinite(parsed) && parsed > 0) {
			return parsed;
		}
	}

	return cadenceMinutes * 60_000;
}

function formatDuration(durationMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
	const hours = Math.floor(totalSeconds / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;
	const parts: string[] = [];

	if (hours > 0) {
		parts.push(`${hours}h`);
	}
	if (minutes > 0 || hours > 0) {
		parts.push(`${minutes}m`);
	}
	parts.push(`${seconds}s`);

	return parts.join(" ");
}

function formatElapsedSince(timestamp: string, now: number): string {
	const parsed = Date.parse(timestamp);
	if (Number.isNaN(parsed)) {
		return "unknown";
	}

	return formatDuration(now - parsed);
}

function buildPrimitiveHeartbeatEvent(input: {
	command: string;
	callerHarness: CallerHarness;
	cadenceMinutes: number;
	snapshot: RuntimeSnapshotForHeartbeat;
	now: number;
}): AttachedProgressEvent {
	const nextPollRecommendation = {
		afterMinutes: input.cadenceMinutes,
		action: renderCallerGuidance({
			callerHarness: input.callerHarness,
			command: input.command,
			cadenceMinutes: input.cadenceMinutes,
		}),
	} as const;
	const elapsedTime = formatElapsedSince(input.snapshot.startedAt, input.now);
	const silenceSummary =
		input.snapshot.lastOutputAt === null
			? `No provider output yet after ${elapsedTime}.`
			: `Silent for ${formatElapsedSince(input.snapshot.lastOutputAt, input.now)} since the last provider output.`;
	const latestProgressSummary = input.snapshot.lastEventSummary.trim();
	const summary = [
		`${input.command} heartbeat after ${elapsedTime}.`,
		`Phase: ${input.snapshot.phase}.`,
		`Latest progress: ${latestProgressSummary}`,
		silenceSummary,
		`Status artifact: ${input.snapshot.progressPaths.statusPath}.`,
		`Next: ${nextPollRecommendation.action}`,
	].join(" ");

	return attachedProgressEventSchema.parse({
		type: "heartbeat",
		command: input.command,
		phase: input.snapshot.phase,
		summary,
		callerHarness: input.callerHarness,
		elapsedTime,
		lastOutputAt: input.snapshot.lastOutputAt,
		statusArtifact: input.snapshot.progressPaths.statusPath,
		nextPollRecommendation,
	});
}

function buildStoryHeartbeatEvent(input: {
	command: string;
	callerHarness: CallerHarness;
	cadenceMinutes: number;
	snapshot: StoryRunCurrentSnapshot;
	currentSnapshotPath: string;
	startedAt: number;
	now: number;
}): AttachedProgressEvent {
	const nextPollRecommendation = {
		afterMinutes: input.cadenceMinutes,
		action: renderCallerGuidance({
			callerHarness: input.callerHarness,
			command: input.command,
			cadenceMinutes: input.cadenceMinutes,
		}),
	} as const;
	const elapsedTime = formatDuration(input.now - input.startedAt);
	const summary = [
		`${input.command} heartbeat after ${elapsedTime}.`,
		`Story id: ${input.snapshot.storyId}.`,
		`Story run: ${input.snapshot.storyRunId}.`,
		`Phase: ${input.snapshot.currentPhase}.`,
		`Current snapshot: ${input.currentSnapshotPath}.`,
		`Next: ${nextPollRecommendation.action}`,
	].join(" ");

	return attachedProgressEventSchema.parse({
		type: "heartbeat",
		command: input.command,
		phase: input.snapshot.currentPhase,
		summary,
		callerHarness: input.callerHarness,
		storyId: input.snapshot.storyId,
		storyRunId: input.snapshot.storyRunId,
		elapsedTime,
		lastOutputAt: input.snapshot.updatedAt,
		statusArtifact: input.currentSnapshotPath,
		nextPollRecommendation,
	});
}

export function createHeartbeatEmitter(input: {
	command: string;
	callerHarness: CallerHarness;
	cadenceMinutes: number;
	readSnapshot: () => RuntimeStatus;
	writeAttachedOutput: (event: AttachedProgressEvent) => void;
}): HeartbeatEmitter {
	let timer: ReturnType<typeof setInterval> | undefined;

	return {
		start() {
			if (timer) {
				return;
			}

			timer = setInterval(() => {
				const snapshot = runtimeSnapshotHeartbeatSchema.parse(
					input.readSnapshot(),
				);
				if (snapshot.status !== "running") {
					return;
				}

				input.writeAttachedOutput(
					buildPrimitiveHeartbeatEvent({
						command: input.command,
						callerHarness: input.callerHarness,
						cadenceMinutes: input.cadenceMinutes,
						snapshot,
						now: Date.now(),
					}),
				);
			}, resolveHeartbeatCadenceMs(input.cadenceMinutes));

			timer.unref?.();
		},
		stop() {
			if (!timer) {
				return;
			}

			clearInterval(timer);
			timer = undefined;
		},
	};
}

export function createPrimitiveHeartbeatEmitter(input: {
	command: string;
	config?: CallerHarnessConfigRecord;
	callerHarness?: CallerHarness;
	heartbeatCadenceMinutes?: number;
	disableHeartbeats?: boolean;
	progressListener?: (event: AttachedProgressEvent) => void;
	readSnapshot: () => RuntimeStatus;
}): HeartbeatEmitter | null {
	if (!input.progressListener) {
		return null;
	}

	const resolved = resolveCallerHeartbeatOptions({
		callerHarness: input.callerHarness,
		heartbeatCadenceMinutes: input.heartbeatCadenceMinutes,
		disableHeartbeats: input.disableHeartbeats,
		config: input.config,
		operationKind: "primitive",
	});
	if (!resolved) {
		return null;
	}

	return createHeartbeatEmitter({
		command: input.command,
		callerHarness: input.callerHarness ?? resolved.callerHarness,
		cadenceMinutes:
			input.heartbeatCadenceMinutes ??
			resolved.heartbeatCadenceMinutes ??
			DEFAULT_PRIMITIVE_HEARTBEAT_CADENCE_MINUTES,
		readSnapshot: input.readSnapshot,
		writeAttachedOutput: input.progressListener,
	});
}

export function createStoryHeartbeatEmitter(input: {
	command: string;
	callerHarness: CallerHarness;
	cadenceMinutes: number;
	currentSnapshotPath: string;
	startedAt: number;
	readSnapshot: () => StoryRunCurrentSnapshot;
	writeAttachedOutput: (event: AttachedProgressEvent) => void;
}): HeartbeatEmitter {
	let timer: ReturnType<typeof setInterval> | undefined;

	return {
		start() {
			if (timer) {
				return;
			}

			timer = setInterval(() => {
				const snapshot = storyRunCurrentSnapshotSchema.parse(
					input.readSnapshot(),
				);
				if (snapshot.status !== "running") {
					return;
				}

				input.writeAttachedOutput(
					buildStoryHeartbeatEvent({
						command: input.command,
						callerHarness: input.callerHarness,
						cadenceMinutes: input.cadenceMinutes,
						snapshot,
						currentSnapshotPath: input.currentSnapshotPath,
						startedAt: input.startedAt,
						now: Date.now(),
					}),
				);
			}, resolveHeartbeatCadenceMs(input.cadenceMinutes));

			timer.unref?.();
		},
		stop() {
			if (!timer) {
				return;
			}

			clearInterval(timer);
			timer = undefined;
		},
	};
}
