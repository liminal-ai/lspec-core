import { describe, expect, test } from "vitest";

import {
	DEFAULT_PRIMITIVE_HEARTBEAT_CADENCE_MINUTES,
	DEFAULT_STORY_HEARTBEAT_CADENCE_MINUTES,
	callerGuidanceForHarness,
	renderCallerGuidance,
	resolveCallerHarnessConfig,
} from "../../../src/core/caller-guidance";

describe("caller guidance", () => {
	test("TC-1.4a codex guidance tells the caller to poll the same running exec session and not final while work is active", () => {
		const guidance = renderCallerGuidance({
			callerHarness: "codex",
			command: "story-verify",
			cadenceMinutes: 5,
		});

		expect(guidance).toContain("same running exec session");
		expect(guidance).toContain("empty input");
		expect(guidance).toContain("do not final");
		expect(guidance).toContain("status remains running");
	});

	test("TC-1.4b claude-code guidance mentions Monitor and attached command tracking", () => {
		const guidance = renderCallerGuidance({
			callerHarness: "claude-code",
			command: "story-implement",
			cadenceMinutes: 5,
		});

		expect(guidance).toContain("Monitor");
		expect(guidance).toContain("attached command until it exits");
		expect(guidance).toContain("status remains running");
	});

	test("TC-1.4c generic guidance uses attached-process and status-artifact language", () => {
		const guidance = renderCallerGuidance({
			callerHarness: "generic",
			command: "quick-fix",
			cadenceMinutes: 5,
		});

		expect(guidance).toContain("attached process");
		expect(guidance).toContain("status file");
		expect(guidance).toContain("status artifact");
	});

	test("callerGuidanceForHarness returns the same substantive harness-specific guidance", () => {
		const guidance = callerGuidanceForHarness({
			callerHarness: "codex",
			command: "story-verify",
			cadenceMinutes: 5,
		});

		expect(guidance).toContain("same running exec session");
		expect(guidance).toContain("empty input");
		expect(guidance).toContain("do not final");
	});

	test("fills caller-harness heartbeat defaults when the run config omits cadence overrides", () => {
		const resolved = resolveCallerHarnessConfig({
			harness: "codex",
		});

		expect(resolved).toEqual({
			harness: "codex",
			primitiveHeartbeatCadenceMinutes:
				DEFAULT_PRIMITIVE_HEARTBEAT_CADENCE_MINUTES,
			storyHeartbeatCadenceMinutes: DEFAULT_STORY_HEARTBEAT_CADENCE_MINUTES,
		});
	});
});
