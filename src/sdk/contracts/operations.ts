import type {
	ChildProcess,
	ExecFileOptionsWithStringEncoding,
	spawn as nodeSpawn,
} from "node:child_process";
import type { createWriteStream as nodeCreateWriteStream } from "node:fs";
import type {
	access as nodeAccess,
	appendFile as nodeAppendFile,
	mkdir as nodeMkdir,
	mkdtemp as nodeMkdtemp,
	readFile as nodeReadFile,
	readdir as nodeReaddir,
	rename as nodeRename,
	rm as nodeRm,
	stat as nodeStat,
	writeFile as nodeWriteFile,
} from "node:fs/promises";

import {
	epicCleanupResultSchema,
	epicSynthesisResultSchema,
	epicVerifierBatchResultSchema,
	implementorResultSchema,
	inspectResultSchema,
	preflightResultSchema,
	storySelfReviewResultSchema,
	storyVerifierResultSchema,
	type EpicCleanupResult as CoreEpicCleanupResult,
	type EpicSynthesisResult as CoreEpicSynthesisResult,
	type EpicVerifierBatchResult as CoreEpicVerifyResult,
	type ImplementorResult as CoreStoryImplementPayload,
	type InspectResult as CoreInspectPayload,
	type PreflightResult as CorePreflightPayload,
	type StorySelfReviewResult as CoreStorySelfReviewPayload,
	type StoryVerifierResult as CoreStoryVerifyPayload,
} from "../../core/result-contracts.js";
import type { QuickFixWorkflowResult } from "../../core/quick-fix.js";
import type { CliResultEnvelope } from "./envelope.js";
import type { ContinuationHandle } from "./continuation-handle.js";

export {
	epicCleanupResultSchema,
	epicSynthesisResultSchema,
	epicVerifierBatchResultSchema,
	implementorResultSchema,
	inspectResultSchema,
	preflightResultSchema,
	storySelfReviewResultSchema,
	storyVerifierResultSchema,
};

export interface FileSystemAdapter {
	access?: typeof nodeAccess;
	appendFile?: typeof nodeAppendFile;
	createWriteStream?: typeof nodeCreateWriteStream;
	mkdir?: typeof nodeMkdir;
	mkdtemp?: typeof nodeMkdtemp;
	readFile?: typeof nodeReadFile;
	readdir?: typeof nodeReaddir;
	rename?: typeof nodeRename;
	rm?: typeof nodeRm;
	stat?: typeof nodeStat;
	writeFile?: typeof nodeWriteFile;
}

export type SpawnImplementation = typeof nodeSpawn;

export type ExecFileImplementation = (
	file: string,
	args: ReadonlyArray<string>,
	options: ExecFileOptionsWithStringEncoding,
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => ChildProcess;

export interface ProviderStreamOutputPaths {
	stdoutPath?: string;
	stderrPath?: string;
}

export interface RuntimeProgressPaths {
	statusPath: string;
	progressPath: string;
}

export interface OperationInputBase {
	specPackRoot: string;
	configPath?: string;
	env?: Record<string, string | undefined>;
	fs?: FileSystemAdapter;
	spawn?: SpawnImplementation;
	execFile?: ExecFileImplementation;
	artifactPath?: string;
}

export interface ProviderOperationInputBase extends OperationInputBase {
	streamOutputPaths?: ProviderStreamOutputPaths;
	runtimeProgressPaths?: RuntimeProgressPaths;
}

export interface InspectInput extends OperationInputBase {}

export interface PreflightInput extends OperationInputBase {
	storyGate?: string;
	epicGate?: string;
}

export interface EpicSynthesizeInput extends ProviderOperationInputBase {
	verifierReportPaths: string[];
}

export interface EpicVerifyInput extends ProviderOperationInputBase {}

export interface EpicCleanupInput extends ProviderOperationInputBase {
	cleanupBatchPath: string;
}

export interface QuickFixInput extends ProviderOperationInputBase {
	request: string;
	workingDirectory?: string;
}

export interface StoryImplementInput extends ProviderOperationInputBase {
	storyId: string;
}

export interface StoryContinueInput extends ProviderOperationInputBase {
	storyId: string;
	continuationHandle: ContinuationHandle;
	followupRequest: string;
}

export interface StorySelfReviewInput extends ProviderOperationInputBase {
	storyId: string;
	continuationHandle: ContinuationHandle;
	passes: number;
	passArtifactPaths: string[];
}

export interface StoryVerifyInput extends ProviderOperationInputBase {
	storyId: string;
	provider?: ContinuationHandle["provider"];
	sessionId?: string;
	response?: string;
	orchestratorContext?: string;
}

export type QuickFixPayload = NonNullable<QuickFixWorkflowResult["result"]>;

export type InspectPayload = CoreInspectPayload;
export type PreflightPayload = CorePreflightPayload;
export type EpicSynthesisPayload = CoreEpicSynthesisResult;
export type EpicVerifyPayload = CoreEpicVerifyResult;
export type EpicCleanupPayload = CoreEpicCleanupResult;
export type StoryImplementPayload = CoreStoryImplementPayload;
export type StoryContinuePayload = CoreStoryImplementPayload;
export type StorySelfReviewPayload = CoreStorySelfReviewPayload;
export type StoryVerifyPayload = CoreStoryVerifyPayload;

export type InspectResult = CliResultEnvelope<InspectPayload>;
export type PreflightResult = CliResultEnvelope<PreflightPayload>;
export type EpicSynthesisResult = CliResultEnvelope<EpicSynthesisPayload>;
export type EpicVerifyResult = CliResultEnvelope<EpicVerifyPayload>;
export type EpicCleanupResult = CliResultEnvelope<EpicCleanupPayload>;
export type QuickFixResult = CliResultEnvelope<QuickFixPayload>;
export type StoryImplementResult = CliResultEnvelope<StoryImplementPayload>;
export type StoryContinueResult = CliResultEnvelope<StoryContinuePayload>;
export type StorySelfReviewResult = CliResultEnvelope<StorySelfReviewPayload>;
export type StoryVerifyResult = CliResultEnvelope<StoryVerifyPayload>;
