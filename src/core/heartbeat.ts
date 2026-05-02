import { z } from "zod";

import {
	callerHarnessSchema,
	resolveCallerHarnessConfig,
	type CallerHarness,
	type CallerHarnessConfigRecord,
} from "./caller-guidance.js";

export { callerHarnessSchema };
export type { CallerHarness, CallerHarnessConfigRecord };

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
