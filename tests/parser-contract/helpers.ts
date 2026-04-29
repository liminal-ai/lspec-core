import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { ROOT } from "../test-helpers";

const FIXTURE_ROOT = join(ROOT, "tests/parser-contract/fixtures");

export interface ParserFixture {
	name: string;
	content: string;
	provenance: {
		provider: string;
		command: string;
		captured: string;
	};
}

const PROVENANCE_PATTERN =
	/^# Provider: (?<provider>.+)\n# Command: (?<command>.+)\n# Captured: (?<captured>\d{4}-\d{2}-\d{2})\n/m;

export async function readProviderFixtures(
	provider: "claude-code" | "codex" | "copilot",
): Promise<ParserFixture[]> {
	const providerDir = join(FIXTURE_ROOT, provider);
	const entries = (await readdir(providerDir)).filter(
		(entry) => entry !== ".gitkeep",
	);

	const fixtures: ParserFixture[] = [];
	for (const entry of entries) {
		const content = await readFile(join(providerDir, entry), "utf8");
		const match = content.match(PROVENANCE_PATTERN);
		if (!match?.groups) {
			throw new Error(
				`Fixture ${provider}/${entry} is missing provenance metadata.`,
			);
		}

		fixtures.push({
			name: entry,
			content,
			provenance: {
				provider: match.groups.provider,
				command: match.groups.command,
				captured: match.groups.captured,
			},
		});
	}

	return fixtures;
}
