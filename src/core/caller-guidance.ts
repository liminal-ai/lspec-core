import { z } from "zod";

export const callerHarnessSchema = z.enum(["generic", "codex", "claude-code"]);

export const DEFAULT_PRIMITIVE_HEARTBEAT_CADENCE_MINUTES = 5;
export const DEFAULT_STORY_HEARTBEAT_CADENCE_MINUTES = 10;

export type CallerHarness = z.infer<typeof callerHarnessSchema>;

export interface CallerHarnessConfigRecord {
	harness: CallerHarness;
	primitive_heartbeat_cadence_minutes?: number;
	story_heartbeat_cadence_minutes?: number;
}

export interface ResolvedCallerHarnessConfig {
	harness: CallerHarness;
	primitiveHeartbeatCadenceMinutes: number;
	storyHeartbeatCadenceMinutes: number;
}

export function resolveCallerHarnessConfig(
	config?: CallerHarnessConfigRecord,
): ResolvedCallerHarnessConfig {
	return {
		harness: config?.harness ?? "generic",
		primitiveHeartbeatCadenceMinutes:
			config?.primitive_heartbeat_cadence_minutes ??
			DEFAULT_PRIMITIVE_HEARTBEAT_CADENCE_MINUTES,
		storyHeartbeatCadenceMinutes:
			config?.story_heartbeat_cadence_minutes ??
			DEFAULT_STORY_HEARTBEAT_CADENCE_MINUTES,
	};
}

export function renderCallerGuidance(input: {
	callerHarness: CallerHarness;
	command: string;
	cadenceMinutes: number;
}): string {
	switch (input.callerHarness) {
		case "codex":
			return `${input.command} is still running. Poll the same running exec session with empty input after ${input.cadenceMinutes} minute(s), and do not final while the status remains running.`;
		case "claude-code":
			return `${input.command} is still running. Use Monitor if it is available, or keep monitoring the attached command until it exits. Check again after ${input.cadenceMinutes} minute(s) while status remains running.`;
		default:
			return `${input.command} is still running. Keep monitoring the attached process and status file or status artifact, then check again after ${input.cadenceMinutes} minute(s) while the process remains active.`;
	}
}

export function callerGuidanceForHarness(input: {
	callerHarness: CallerHarness;
	command: string;
	cadenceMinutes: number;
}): string {
	return renderCallerGuidance(input);
}
