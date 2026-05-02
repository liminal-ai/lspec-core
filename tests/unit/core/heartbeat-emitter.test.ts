import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	createHeartbeatEmitter,
	type AttachedProgressEvent,
} from "../../../src/core/heartbeat";
import type { RuntimeStatus } from "../../../src/core/runtime-progress";

function runtimeSnapshot(
	overrides: Partial<RuntimeStatus> = {},
): RuntimeStatus {
	return {
		version: 1,
		command: "quick-fix",
		status: "running",
		phase: "quick-fix",
		startedAt: "2026-05-01T12:00:00.000Z",
		updatedAt: "2026-05-01T12:00:00.000Z",
		lastOutputAt: null,
		provider: "codex",
		pid: 123,
		cwd: "/tmp/project",
		timeoutMs: 60_000,
		artifactPath: "/tmp/spec-pack/artifacts/quick-fix/001-quick-fix.json",
		streamPaths: {
			stdoutPath: "/tmp/spec-pack/artifacts/quick-fix/stdout.log",
			stderrPath: "/tmp/spec-pack/artifacts/quick-fix/stderr.log",
		},
		progressPaths: {
			statusPath: "/tmp/spec-pack/artifacts/quick-fix/status.json",
			progressPath: "/tmp/spec-pack/artifacts/quick-fix/progress.jsonl",
		},
		lastEvent: "command-started",
		lastEventSummary: "quick-fix started.",
		...overrides,
	};
}

describe("heartbeat emitter", () => {
	const originalOverride = process.env.LBUILD_IMPL_HEARTBEAT_INTERVAL_MS;

	beforeEach(() => {
		process.env.LBUILD_IMPL_HEARTBEAT_INTERVAL_MS = "1000";
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
	});

	afterEach(() => {
		if (typeof originalOverride === "undefined") {
			delete process.env.LBUILD_IMPL_HEARTBEAT_INTERVAL_MS;
		} else {
			process.env.LBUILD_IMPL_HEARTBEAT_INTERVAL_MS = originalOverride;
		}
		vi.useRealTimers();
	});

	test("TC-1.6a emits fixed-cadence summaries rather than one heartbeat per provider output event", async () => {
		const events: AttachedProgressEvent[] = [];
		let outputIndex = 0;
		const outputTimes = [
			"2026-05-01T12:00:00.200Z",
			"2026-05-01T12:00:00.400Z",
			"2026-05-01T12:00:00.600Z",
			"2026-05-01T12:00:00.800Z",
		];
		const emitter = createHeartbeatEmitter({
			command: "quick-fix",
			callerHarness: "codex",
			cadenceMinutes: 5,
			readSnapshot: () =>
				runtimeSnapshot({
					lastOutputAt:
						outputTimes[Math.min(outputIndex++, outputTimes.length - 1)] ??
						null,
					lastEventSummary: "Provider stdout output continues.",
				}),
			writeAttachedOutput: (event) => events.push(event),
		});

		emitter.start();
		await vi.advanceTimersByTimeAsync(999);
		expect(events).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(1);
		await vi.advanceTimersByTimeAsync(250);
		await vi.advanceTimersByTimeAsync(250);
		await vi.advanceTimersByTimeAsync(250);
		expect(events).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(250);
		expect(events).toHaveLength(2);
		emitter.stop();
	});

	test("TC-1.6b reports silence duration and next poll guidance without declaring final failure", async () => {
		const events: AttachedProgressEvent[] = [];
		const emitter = createHeartbeatEmitter({
			command: "story-verify",
			callerHarness: "generic",
			cadenceMinutes: 5,
			readSnapshot: () =>
				runtimeSnapshot({
					command: "story-verify",
					phase: "verifier-initial",
					startedAt: "2026-05-01T11:55:00.000Z",
					lastOutputAt: "2026-05-01T11:57:30.000Z",
					lastEventSummary: "Story verifier started.",
				}),
			writeAttachedOutput: (event) => events.push(event),
		});

		emitter.start();
		await vi.advanceTimersByTimeAsync(1000);
		emitter.stop();

		expect(events).toHaveLength(1);
		expect(events[0]?.summary).toContain("Silent for 2m 31s");
		expect(events[0]?.summary).toContain("Next:");
		expect(events[0]?.summary).not.toContain("failed");
		expect(events[0]?.nextPollRecommendation).toEqual(
			expect.objectContaining({
				afterMinutes: 5,
				action: expect.stringContaining("status artifact"),
			}),
		);
	});
});
