import {
	cliArtifactRefSchema,
	cliErrorSchema,
	cliResultEnvelopeSchema,
	cliStatusSchema,
	type CliArtifactRef as CoreCliArtifactRef,
	type CliError as CoreCliError,
	type CliStatus as CoreCliStatus,
} from "../../core/result-contracts.js";

export {
	cliArtifactRefSchema,
	cliErrorSchema,
	cliResultEnvelopeSchema,
	cliStatusSchema,
};

export type CliStatus = CoreCliStatus;
export type CliError = CoreCliError;
export type CliArtifactRef = CoreCliArtifactRef;

export interface CliResultEnvelope<TResult> {
	command: string;
	version: 1;
	status: CliStatus;
	outcome: string;
	result?: TResult;
	errors: CliError[];
	warnings: string[];
	artifacts: CliArtifactRef[];
	startedAt: string;
	finishedAt: string;
}
