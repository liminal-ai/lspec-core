import type { AttachedProgressEvent } from "../sdk/contracts/operations.js";

export function writeJson(envelope: unknown): void {
	process.stdout.write(`${JSON.stringify(envelope)}\n`);
}

export function writeHuman(summary: string): void {
	process.stdout.write(`${summary}\n`);
}

export function writeAttachedProgress(event: AttachedProgressEvent): void {
	const nextAction =
		typeof event.nextPollRecommendation === "string"
			? event.nextPollRecommendation
			: event.nextPollRecommendation?.action;
	const details = [
		`[${event.type}] ${event.command}`,
		`phase=${event.phase}`,
		...(event.elapsedTime ? [`elapsed=${event.elapsedTime}`] : []),
		...(event.lastOutputAt ? [`lastOutputAt=${event.lastOutputAt}`] : []),
		...(event.statusArtifact ? [`status=${event.statusArtifact}`] : []),
	];
	const lines = [
		details.join(" "),
		event.summary,
		...(nextAction ? [nextAction] : []),
	];

	process.stderr.write(`${lines.join("\n")}\n`);
}
