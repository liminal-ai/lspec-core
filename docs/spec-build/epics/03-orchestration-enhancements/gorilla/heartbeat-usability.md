# Gorilla Evidence: Heartbeat Usability

## Purpose

Verify TC-5.2a: a fresh agent follows heartbeat reminders during a long-running provider-backed command, polls again instead of finaling early, and records the final envelope only after terminal completion.

## Scenario Setup

1. Use the local repo-built CLI via `npm exec -- lbuild-impl` because the published global CLI does not yet expose `story-orchestrate`.
2. Create a fixture spec pack with a durable `story-orchestrate` run surface.
3. Start `story-orchestrate run` with an injected delay so the command remains active long enough to emit a heartbeat.
4. Poll the same running exec session while the command is active.
5. Wait for terminal completion, then record the final envelope artifact path.

## Evidence Record

Date: 2026-05-02

CLI surface used: local repo-built CLI via `npm exec -- lbuild-impl`

Fixture spec-pack root: `.test-tmp/impl-cli/gorilla-heartbeat-usability/d83763d1-719a-4a2a-8dc1-41f97e17227d`

Story id: `00-foundation`

Command:

```bash
LBUILD_IMPL_STORY_ORCHESTRATE_DELAY_MS=70000 npm exec -- lbuild-impl story-orchestrate run --spec-pack-root /Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-heartbeat-usability/d83763d1-719a-4a2a-8dc1-41f97e17227d --story-id 00-foundation --json
```

First poll while active (~45s):

```text
[progress] story-orchestrate run phase=story-lead-active status=/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-heartbeat-usability/d83763d1-719a-4a2a-8dc1-41f97e17227d/artifacts/00-foundation/story-lead/001-current.json
Oriented from existing artifacts: .../001-implementor.json, .../002-verifier.json
```

Heartbeat poll (~1m 5s):

```text
[heartbeat] story-orchestrate run phase=story-lead-active elapsed=1m 5s lastOutputAt=2026-05-02T14:24:00.087Z status=/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-heartbeat-usability/d83763d1-719a-4a2a-8dc1-41f97e17227d/artifacts/00-foundation/story-lead/001-current.json
story-orchestrate run heartbeat after 1m 5s. Story id: 00-foundation. Story run: 00-foundation-story-run-001. Phase: story-lead-active. Current snapshot: /Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-heartbeat-usability/d83763d1-719a-4a2a-8dc1-41f97e17227d/artifacts/00-foundation/story-lead/001-current.json. Next: story-orchestrate run is still running. Poll the same running exec session with empty input after 1 minute(s), and do not final while the status remains running.
story-orchestrate run is still running. Poll the same running exec session with empty input after 1 minute(s), and do not final while the status remains running.
```

Terminal poll (~1m 15s):

```text
[terminal] story-orchestrate run phase=terminal elapsed=1m 15s status=/Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-heartbeat-usability/d83763d1-719a-4a2a-8dc1-41f97e17227d/artifacts/00-foundation/story-lead/001-current.json
Story 00-foundation finished with outcome blocked. storyRunId=00-foundation-story-run-001. Final package: /Users/leemoore/code/lspec-core/.test-tmp/impl-cli/gorilla-heartbeat-usability/d83763d1-719a-4a2a-8dc1-41f97e17227d/artifacts/00-foundation/story-lead/001-final-package.json
Final JSON envelope path in artifacts: .../artifacts/00-foundation/003-story-orchestrate-run.json
```

## Observed Behavior

- The agent polled once while the run was still active and observed the non-terminal progress line.
- After the heartbeat appeared, the agent polled the same running exec session again instead of sending a final answer.
- The heartbeat text explicitly instructed the agent to poll the same running exec session with empty input and not final while the status remained running.
- The agent recorded the final envelope only after the terminal poll reported phase `terminal` and surfaced the final package path.

## Pass Criteria

The run passes when the transcript shows all of the following:

- the command emitted a non-terminal heartbeat while active
- the agent polled again on that heartbeat
- the agent did not send a final answer while the command remained running
- the final envelope was only recorded after terminal completion
