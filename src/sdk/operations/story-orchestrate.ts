import { runStoryLead } from "../../core/story-lead.js";
import {
	storyOrchestrateResumeResultSchema,
	storyOrchestrateRunResultSchema,
	storyOrchestrateStatusResultSchema,
} from "../../core/story-orchestrate-contracts.js";
import { discoverStoryRunState } from "../../core/story-run-discovery.js";
import { createStoryRunLedger } from "../../core/story-run-ledger.js";
import {
	type StoryOrchestrateResumeInput,
	type StoryOrchestrateResumeResult,
	type StoryOrchestrateRunInput,
	type StoryOrchestrateRunResult,
	type StoryOrchestrateStatusInput,
	type StoryOrchestrateStatusResult,
	storyOrchestrateResumeInputSchema,
	storyOrchestrateRunInputSchema,
	storyOrchestrateStatusInputSchema,
} from "../contracts/story-orchestrate.js";
import {
	buildUnexpectedEnvelope,
	finalizeEnvelope,
	parseSdkInput,
	resolveOperationArtifactPath,
	withSdkExecutionContext,
} from "./shared.js";

function resultArtifacts(input: {
	currentSnapshotPath?: string;
	eventHistoryPath?: string;
	finalPackagePath?: string;
	acceptedReviewRequestArtifactPath?: string;
	acceptedRulingArtifactPath?: string;
}) {
	return [
		...(input.currentSnapshotPath
			? [{ kind: "story-run-current", path: input.currentSnapshotPath }]
			: []),
		...(input.eventHistoryPath
			? [{ kind: "story-run-events", path: input.eventHistoryPath }]
			: []),
		...(input.finalPackagePath
			? [{ kind: "story-run-final-package", path: input.finalPackagePath }]
			: []),
		...(input.acceptedReviewRequestArtifactPath
			? [
					{
						kind: "review-request",
						path: input.acceptedReviewRequestArtifactPath,
					},
				]
			: []),
		...(input.acceptedRulingArtifactPath
			? [
					{
						kind: "ruling-response",
						path: input.acceptedRulingArtifactPath,
					},
				]
			: []),
	];
}

function runOutcome(result: StoryOrchestrateRunResult): string {
	switch (result.case) {
		case "completed":
		case "interrupted":
			return result.outcome;
		default:
			return result.case;
	}
}

function resumeOutcome(result: StoryOrchestrateResumeResult): string {
	switch (result.case) {
		case "completed":
		case "interrupted":
			return result.outcome;
		default:
			return result.case;
	}
}

function runAdditionalArtifacts(result: StoryOrchestrateRunResult) {
	switch (result.case) {
		case "completed":
			return resultArtifacts({
				currentSnapshotPath: result.currentSnapshotPath,
				eventHistoryPath: result.eventHistoryPath,
				finalPackagePath: result.finalPackagePath,
			});
		case "interrupted":
			return resultArtifacts({
				currentSnapshotPath: result.currentSnapshotPath,
				eventHistoryPath: result.eventHistoryPath,
			});
		case "existing-accepted-attempt":
			return resultArtifacts({
				finalPackagePath: result.finalPackagePath,
			});
		case "resume-required":
		case "active-attempt-exists":
			return resultArtifacts({
				currentSnapshotPath: result.currentSnapshotPath,
			});
		default:
			return [];
	}
}

function resumeAdditionalArtifacts(result: StoryOrchestrateResumeResult) {
	switch (result.case) {
		case "completed":
			return resultArtifacts({
				currentSnapshotPath: result.currentSnapshotPath,
				eventHistoryPath: result.eventHistoryPath,
				finalPackagePath: result.finalPackagePath,
				acceptedReviewRequestArtifactPath:
					result.acceptedReviewRequestArtifact?.path,
				acceptedRulingArtifactPath: result.acceptedRulingArtifact?.path,
			});
		case "interrupted":
			return resultArtifacts({
				currentSnapshotPath: result.currentSnapshotPath,
				eventHistoryPath: result.eventHistoryPath,
				acceptedReviewRequestArtifactPath:
					result.acceptedReviewRequestArtifact?.path,
				acceptedRulingArtifactPath: result.acceptedRulingArtifact?.path,
			});
		case "existing-accepted-attempt":
			return resultArtifacts({
				finalPackagePath: result.finalPackagePath,
			});
		default:
			return [];
	}
}

export async function storyOrchestrateRun(input: StoryOrchestrateRunInput) {
	const parsedInput = parseSdkInput(storyOrchestrateRunInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-orchestrate-run",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: parsedInput.storyId,
			fileName: "story-orchestrate-run",
		});

		try {
			const selection = await discoverStoryRunState({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
			});
			let result: StoryOrchestrateRunResult;

			switch (selection.case) {
				case "start-new":
				case "start-from-primitive-artifacts": {
					const ledger = createStoryRunLedger({
						specPackRoot: parsedInput.specPackRoot,
						storyId: parsedInput.storyId,
					});
					const runtime = await runStoryLead({
						specPackRoot: parsedInput.specPackRoot,
						storyId: parsedInput.storyId,
						configPath: parsedInput.configPath,
						env: parsedInput.env,
						ledger,
						mode: "run",
						startedFromPrimitiveArtifacts:
							selection.case === "start-from-primitive-artifacts"
								? selection.sourceArtifactPaths
								: undefined,
						callerHarness: parsedInput.callerHarness,
						heartbeatCadenceMinutes: parsedInput.heartbeatCadenceMinutes,
						disableHeartbeats: parsedInput.disableHeartbeats,
						progressListener: parsedInput.progressListener,
					});
					if (runtime.case === "completed") {
						if (!runtime.finalPackage || !runtime.finalPackagePath) {
							throw new Error(
								"Story runtime completed without a final package.",
							);
						}
						result = storyOrchestrateRunResultSchema.parse({
							case: "completed",
							outcome: runtime.finalPackage.outcome,
							storyId: runtime.storyId,
							storyRunId: runtime.storyRunId,
							currentSnapshotPath: runtime.currentSnapshotPath,
							eventHistoryPath: runtime.eventHistoryPath,
							finalPackagePath: runtime.finalPackagePath,
							finalPackage: runtime.finalPackage,
							...(runtime.startedFromPrimitiveArtifacts
								? {
										startedFromPrimitiveArtifacts:
											runtime.startedFromPrimitiveArtifacts,
									}
								: {}),
						});
					} else {
						result = storyOrchestrateRunResultSchema.parse({
							case: "interrupted",
							outcome: "interrupted",
							storyId: runtime.storyId,
							storyRunId: runtime.storyRunId,
							currentSnapshotPath: runtime.currentSnapshotPath,
							eventHistoryPath: runtime.eventHistoryPath,
							latestEventSequence: runtime.latestEventSequence,
						});
					}
					break;
				}
				case "existing-accepted-attempt":
					result = storyOrchestrateRunResultSchema.parse({
						case: "existing-accepted-attempt",
						storyId: parsedInput.storyId,
						storyRunId: selection.storyRunId,
						finalPackagePath: selection.finalPackagePath,
						suggestedNext: "status",
					});
					break;
				case "resume-required":
					result = storyOrchestrateRunResultSchema.parse({
						case: "resume-required",
						storyId: parsedInput.storyId,
						storyRunId: selection.storyRunId,
						currentSnapshotPath: selection.currentSnapshotPath,
						suggestedCommand: `lbuild-impl story-orchestrate resume --spec-pack-root ${parsedInput.specPackRoot} --story-id ${parsedInput.storyId} --story-run-id ${selection.storyRunId}`,
					});
					break;
				case "active-attempt-exists":
					result = storyOrchestrateRunResultSchema.parse({
						case: "active-attempt-exists",
						storyId: parsedInput.storyId,
						storyRunId: selection.storyRunId,
						currentSnapshotPath: selection.currentSnapshotPath,
					});
					break;
				case "ambiguous-story-run":
					result = storyOrchestrateRunResultSchema.parse({
						case: "ambiguous-story-run",
						storyId: parsedInput.storyId,
						candidates: selection.candidates,
					});
					break;
				case "invalid-story-id":
					result = storyOrchestrateRunResultSchema.parse(selection);
					break;
				case "invalid-story-run-id":
					throw new Error(
						"Run discovery should never receive an explicit storyRunId.",
					);
			}

			return await finalizeEnvelope({
				command: "story-orchestrate run",
				artifactPath,
				startedAt,
				outcome: runOutcome(result),
				resultSchema: storyOrchestrateRunResultSchema,
				result,
				additionalArtifacts: runAdditionalArtifacts(result),
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "story-orchestrate run",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: storyOrchestrateRunResultSchema,
				errors: envelope.errors,
			});
		}
	});
}

export async function storyOrchestrateResume(
	input: StoryOrchestrateResumeInput,
) {
	const parsedInput = parseSdkInput(storyOrchestrateResumeInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-orchestrate-resume",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: parsedInput.storyId,
			fileName: "story-orchestrate-resume",
		});

		try {
			const ledger = createStoryRunLedger({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
			});
			const selection = await discoverStoryRunState({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
				storyRunId: parsedInput.storyRunId,
			});
			let result: StoryOrchestrateResumeResult;

			switch (selection.case) {
				case "invalid-story-id":
					result = storyOrchestrateResumeResultSchema.parse(selection);
					break;
				case "invalid-story-run-id":
					result = storyOrchestrateResumeResultSchema.parse(selection);
					break;
				case "ambiguous-story-run":
					result = storyOrchestrateResumeResultSchema.parse({
						case: "ambiguous-story-run",
						storyId: parsedInput.storyId,
						candidates: selection.candidates,
					});
					break;
				case "existing-accepted-attempt":
				case "resume-required":
				case "active-attempt-exists": {
					if (
						selection.case === "existing-accepted-attempt" &&
						!parsedInput.reviewRequest &&
						!parsedInput.ruling
					) {
						result = storyOrchestrateResumeResultSchema.parse({
							case: "existing-accepted-attempt",
							storyId: parsedInput.storyId,
							storyRunId: selection.storyRunId,
							finalPackagePath: selection.finalPackagePath,
							suggestedNext: "resume-with-review-request",
						});
						break;
					}

					const attempt = await ledger.getAttemptByStoryRunId(
						selection.storyRunId,
					);
					if (!attempt) {
						throw new Error(
							`Unable to resolve story-run ${selection.storyRunId} for resume.`,
						);
					}
					if (parsedInput.ruling) {
						const outstandingRulingRequest =
							attempt.finalPackage?.rulingRequest;
						const hasMatchingOutstandingRequest =
							outstandingRulingRequest?.id ===
								parsedInput.ruling.rulingRequestId &&
							outstandingRulingRequest.allowedResponses.includes(
								parsedInput.ruling.decision,
							);

						if (!hasMatchingOutstandingRequest) {
							result = storyOrchestrateResumeResultSchema.parse({
								case: "invalid-ruling",
								storyId: parsedInput.storyId,
							});
							break;
						}
					}

					const runtime = await runStoryLead({
						specPackRoot: parsedInput.specPackRoot,
						storyId: parsedInput.storyId,
						configPath: parsedInput.configPath,
						env: parsedInput.env,
						ledger,
						mode: "resume",
						existingAttempt: attempt,
						reviewRequest: parsedInput.reviewRequest,
						ruling: parsedInput.ruling,
						callerHarness: parsedInput.callerHarness,
						heartbeatCadenceMinutes: parsedInput.heartbeatCadenceMinutes,
						disableHeartbeats: parsedInput.disableHeartbeats,
						progressListener: parsedInput.progressListener,
					});
					if (runtime.case === "completed") {
						if (!runtime.finalPackage || !runtime.finalPackagePath) {
							throw new Error(
								"Story runtime completed without a final package.",
							);
						}
						const acceptedReviewRequestArtifact =
							runtime.acceptedReviewRequestArtifact ??
							(parsedInput.reviewRequest
								? runtime.finalPackage.evidence.callerInputArtifacts
										.filter((artifact) => artifact.kind === "review-request")
										.at(-1)
								: undefined);
						const acceptedRulingArtifact =
							runtime.acceptedRulingArtifact ??
							(parsedInput.ruling
								? runtime.finalPackage.evidence.callerInputArtifacts
										.filter((artifact) => artifact.kind === "ruling-response")
										.at(-1)
								: undefined);
						result = storyOrchestrateResumeResultSchema.parse({
							case: "completed",
							outcome: runtime.finalPackage.outcome,
							storyId: runtime.storyId,
							storyRunId: runtime.storyRunId,
							currentSnapshotPath: runtime.currentSnapshotPath,
							eventHistoryPath: runtime.eventHistoryPath,
							finalPackagePath: runtime.finalPackagePath,
							finalPackage: runtime.finalPackage,
							...(parsedInput.reviewRequest
								? {
										acceptedReviewRequestId: parsedInput.reviewRequest.source,
										...(acceptedReviewRequestArtifact
											? { acceptedReviewRequestArtifact }
											: {}),
									}
								: {}),
							...(parsedInput.ruling
								? {
										acceptedRulingRequestId: parsedInput.ruling.rulingRequestId,
										...(acceptedRulingArtifact
											? { acceptedRulingArtifact }
											: {}),
									}
								: {}),
						});
					} else {
						result = storyOrchestrateResumeResultSchema.parse({
							case: "interrupted",
							outcome: "interrupted",
							storyId: runtime.storyId,
							storyRunId: runtime.storyRunId,
							currentSnapshotPath: runtime.currentSnapshotPath,
							eventHistoryPath: runtime.eventHistoryPath,
							latestEventSequence: runtime.latestEventSequence,
							...(runtime.acceptedReviewRequestArtifact
								? {
										acceptedReviewRequestArtifact:
											runtime.acceptedReviewRequestArtifact,
									}
								: {}),
							...(runtime.acceptedRulingArtifact
								? {
										acceptedRulingArtifact: runtime.acceptedRulingArtifact,
									}
								: {}),
						});
					}
					break;
				}
				case "start-new":
				case "start-from-primitive-artifacts":
					throw new Error(
						"No existing story-lead attempt is available to resume for this story.",
					);
			}

			return await finalizeEnvelope({
				command: "story-orchestrate resume",
				artifactPath,
				startedAt,
				outcome: resumeOutcome(result),
				resultSchema: storyOrchestrateResumeResultSchema,
				result,
				additionalArtifacts: resumeAdditionalArtifacts(result),
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "story-orchestrate resume",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: storyOrchestrateResumeResultSchema,
				errors: envelope.errors,
			});
		}
	});
}

export async function storyOrchestrateStatus(
	input: StoryOrchestrateStatusInput,
) {
	const parsedInput = parseSdkInput(storyOrchestrateStatusInputSchema, input);

	return await withSdkExecutionContext(parsedInput, async () => {
		const startedAt = new Date().toISOString();
		const artifactPath = await resolveOperationArtifactPath({
			command: "story-orchestrate-status",
			specPackRoot: parsedInput.specPackRoot,
			artifactPath: parsedInput.artifactPath,
			group: parsedInput.storyId,
			fileName: "story-orchestrate-status",
		});

		try {
			const selection = await discoverStoryRunState({
				specPackRoot: parsedInput.specPackRoot,
				storyId: parsedInput.storyId,
				storyRunId: parsedInput.storyRunId,
			});
			let result: StoryOrchestrateStatusResult;

			switch (selection.case) {
				case "invalid-story-id":
					result = storyOrchestrateStatusResultSchema.parse(selection);
					break;
				case "invalid-story-run-id":
					result = storyOrchestrateStatusResultSchema.parse(selection);
					break;
				case "ambiguous-story-run":
					result = storyOrchestrateStatusResultSchema.parse({
						case: "ambiguous-story-run",
						storyId: parsedInput.storyId,
						candidates: selection.candidates,
					});
					break;
				case "start-new":
				case "start-from-primitive-artifacts":
					throw new Error(
						"No durable story-lead attempt exists yet for the requested story.",
					);
				default: {
					const ledger = createStoryRunLedger({
						specPackRoot: parsedInput.specPackRoot,
						storyId: parsedInput.storyId,
					});
					const attempt = await ledger.getAttemptByStoryRunId(
						selection.storyRunId,
					);
					if (!attempt) {
						throw new Error(
							`Unable to resolve story-run ${selection.storyRunId} for status.`,
						);
					}

					result = storyOrchestrateStatusResultSchema.parse({
						case: "single-attempt",
						storyId: parsedInput.storyId,
						storyRunId: attempt.storyRunId,
						currentSnapshotPath: attempt.currentSnapshotPath,
						currentSnapshot: attempt.currentSnapshot,
						currentStatus: attempt.currentSnapshot.status,
						latestEventSequence: attempt.currentSnapshot.latestEventSequence,
						...(attempt.finalPackage
							? {
									finalPackagePath: attempt.finalPackagePath,
									finalPackage: attempt.finalPackage,
								}
							: {}),
					});
					break;
				}
			}

			return await finalizeEnvelope({
				command: "story-orchestrate status",
				artifactPath,
				startedAt,
				outcome: result.case,
				resultSchema: storyOrchestrateStatusResultSchema,
				result,
				additionalArtifacts:
					result.case === "single-attempt"
						? resultArtifacts({
								currentSnapshotPath: result.currentSnapshotPath,
								finalPackagePath: result.finalPackagePath,
							})
						: [],
			});
		} catch (error) {
			const envelope = buildUnexpectedEnvelope({
				command: "story-orchestrate status",
				artifactPath,
				startedAt,
				error,
			});
			return await finalizeEnvelope({
				command: envelope.command,
				artifactPath,
				startedAt,
				outcome: envelope.outcome,
				resultSchema: storyOrchestrateStatusResultSchema,
				errors: envelope.errors,
			});
		}
	});
}
