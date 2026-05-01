import { defineCommand } from "citty";

import { loadSkill, readSkillChunk } from "../../sdk/index.js";

function parseChunkNumber(value: string | undefined): number | undefined {
	if (!value) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) {
		throw new Error(`Invalid chunk number: ${value}`);
	}
	return parsed;
}

export default defineCommand({
	meta: {
		name: "skill",
		description: "Read the CLI-delivered ls-impl skill in bounded chunks.",
	},
	async run({ rawArgs }) {
		try {
			const [skillName, path, chunkValue, ...extra] = rawArgs;
			if (!skillName || extra.length > 0) {
				throw new Error(
					"Usage: lbuild-impl skill ls-impl [relative-doc-path chunk-number]",
				);
			}

			if (!path) {
				process.stdout.write(loadSkill({ skillName }).markdown);
				return;
			}

			const chunkNumber = parseChunkNumber(chunkValue);
			if (!chunkNumber) {
				throw new Error(
					"Usage: lbuild-impl skill ls-impl <relative-doc-path> <chunk-number>",
				);
			}

			process.stdout.write(
				readSkillChunk({
					skillName,
					path,
					chunkNumber,
				}).markdown,
			);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	},
});
