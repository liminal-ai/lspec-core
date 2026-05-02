import { defineCommand } from "citty";

import {
	type CliResultEnvelope,
	type EpicSynthesisPayload,
	epicSynthesize,
} from "../../sdk/index.js";
import {
	createCommandErrorEnvelope,
	createInvalidInvocationEnvelope,
	emitCommandEnvelope,
	emitPersistedCommandEnvelope,
	providerHeartbeatArgs,
	rejectUnknownCommandArgs,
	resolvePrimitiveHeartbeatCliOptions,
	resolveProviderArtifactOptions,
} from "./shared.js";

function collectRepeatedFlag(rawArgs: string[], flag: string): string[] {
	const values: string[] = [];

	for (let index = 0; index < rawArgs.length; index += 1) {
		const value = rawArgs[index];
		if (value === flag) {
			const nextValue = rawArgs[index + 1];
			if (nextValue && !nextValue.startsWith("--")) {
				values.push(nextValue);
			}
			continue;
		}

		if (value.startsWith(`${flag}=`)) {
			values.push(value.slice(flag.length + 1));
		}
	}

	return values;
}

function renderHumanSummary(
	envelope: CliResultEnvelope<EpicSynthesisPayload>,
): string {
	return envelope.result
		? [
				`${envelope.command}: ${envelope.outcome}`,
				`confirmed: ${envelope.result.confirmedIssues.length}`,
				`disputed: ${envelope.result.disputedOrUnconfirmedIssues.length}`,
			].join("\n")
		: `${envelope.command}: ${envelope.outcome}`;
}

export default defineCommand({
	meta: {
		name: "epic-synthesize",
		description: "Independently verify and synthesize epic verifier findings.",
	},
	args: {
		"spec-pack-root": {
			type: "string",
			description: "Absolute or relative path to the spec-pack root",
			required: true,
		},
		"verifier-report": {
			type: "string",
			description:
				"Path to an epic verifier report artifact. Repeat the flag to pass multiple reports.",
		},
		config: {
			type: "string",
			description: "Explicit run-config file relative to the spec-pack root",
		},
		...providerHeartbeatArgs,
		json: {
			type: "boolean",
			description: "Emit the structured JSON envelope on stdout",
		},
	},
	async run({ args, rawArgs, cmd }) {
		const json = Boolean(args.json);
		const startedAt = new Date().toISOString();
		const artifactOptions = await resolveProviderArtifactOptions({
			specPackRoot: args["spec-pack-root"],
			command: "epic-synthesize",
			group: "epic",
			fileName: "epic-synthesis",
		});
		try {
			rejectUnknownCommandArgs(rawArgs, cmd.args);
			const verifierReportPaths = collectRepeatedFlag(
				rawArgs,
				"--verifier-report",
			);

			if (verifierReportPaths.length === 0) {
				await emitPersistedCommandEnvelope({
					artifactPath: artifactOptions.artifactPath,
					envelope: createInvalidInvocationEnvelope({
						command: "epic-synthesize",
						artifactPath: artifactOptions.artifactPath,
						startedAt,
						message: "Provide at least one --verifier-report path.",
					}),
					json,
				});
				return;
			}

			const envelope = await epicSynthesize({
				specPackRoot: args["spec-pack-root"],
				verifierReportPaths,
				configPath: args.config,
				...resolvePrimitiveHeartbeatCliOptions(args),
				artifactPath: artifactOptions.artifactPath,
				streamOutputPaths: artifactOptions.streamOutputPaths,
				runtimeProgressPaths: artifactOptions.runtimeProgressPaths,
			});
			emitCommandEnvelope({
				envelope,
				json,
				renderHumanSummary,
			});
		} catch (error) {
			await emitPersistedCommandEnvelope({
				artifactPath: artifactOptions.artifactPath,
				envelope: createCommandErrorEnvelope({
					command: "epic-synthesize",
					artifactPath: artifactOptions.artifactPath,
					startedAt,
					error,
				}),
				json,
			});
		}
	},
});
