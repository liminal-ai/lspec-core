import { describe, expect, test } from "vitest";

import {
	buildHeartbeatMessage,
	heartbeatMessageSchema,
} from "../../../src/core/heartbeat";

describe("heartbeat messages", () => {
	test("buildHeartbeatMessage includes every required heartbeat contract field", () => {
		const message = buildHeartbeatMessage({
			command: "story-orchestrate run",
			storyId: "00-foundation-and-contract-alignment",
			storyRunId: "story-run-001",
			elapsedTime: "PT5M",
			phase: "running verifier follow-up",
			lastOutputAt: "2026-05-01T14:30:00.000Z",
			statusArtifact:
				"/tmp/spec-pack/artifacts/00-foundation/story-orchestrate/current.json",
			nextPollRecommendation: {
				afterMinutes: 5,
				action:
					"Poll the same running exec session with empty input while status remains running.",
			},
			callerHarness: "codex",
		});

		expect(message).toEqual({
			command: "story-orchestrate run",
			storyId: "00-foundation-and-contract-alignment",
			storyRunId: "story-run-001",
			elapsedTime: "PT5M",
			phase: "running verifier follow-up",
			lastOutputAt: "2026-05-01T14:30:00.000Z",
			statusArtifact:
				"/tmp/spec-pack/artifacts/00-foundation/story-orchestrate/current.json",
			nextPollRecommendation: {
				afterMinutes: 5,
				action:
					"Poll the same running exec session with empty input while status remains running.",
			},
			callerHarness: "codex",
		});
	});

	test("heartbeat message contract requires last output, status artifact, and next poll recommendation", () => {
		expect(() =>
			heartbeatMessageSchema.parse({
				command: "story-verify",
				elapsedTime: "PT5M",
				phase: "running",
				callerHarness: "generic",
			}),
		).toThrow();
	});

	test("buildHeartbeatMessage preserves null when last provider output time is unknown", () => {
		const message = buildHeartbeatMessage({
			command: "quick-fix",
			elapsedTime: "PT5M",
			phase: "waiting for provider output",
			lastOutputAt: null,
			statusArtifact: "/tmp/spec-pack/artifacts/quick-fix/status.json",
			nextPollRecommendation:
				"Keep monitoring the attached process and status file.",
			callerHarness: "generic",
		});

		expect(message.lastOutputAt).toBeNull();
		expect(message.nextPollRecommendation).toContain("status file");
	});
});
