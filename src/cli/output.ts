export function writeJson(envelope: unknown): void {
	process.stdout.write(`${JSON.stringify(envelope)}\n`);
}

export function writeHuman(summary: string): void {
	process.stdout.write(`${summary}\n`);
}
