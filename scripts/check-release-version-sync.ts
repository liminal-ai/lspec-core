import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG_PATH = join(ROOT, "CHANGELOG.md");
const PACKAGE_JSON_PATH = join(ROOT, "package.json");
const VERSION_MARKER_PATH = join(ROOT, "VERSION");

function normalizeTag(tag: string): string {
	return tag.replace(/^refs\/tags\//u, "");
}

function parseChangelogVersion(markdown: string): string {
	const match = markdown.match(
		/^##\s+\[?(\d+\.\d+\.\d+(?:[-+][^\]\s]+)?)\]?/mu,
	);
	if (!match?.[1]) {
		throw new Error(
			`Could not find the most recent release heading in ${CHANGELOG_PATH}.`,
		);
	}

	return match[1];
}

async function main() {
	const { values } = parseArgs({
		options: {
			tag: {
				type: "string",
			},
		},
	});
	const packageJson = JSON.parse(await readFile(PACKAGE_JSON_PATH, "utf8")) as {
		version?: string;
	};
	const packageVersion = packageJson.version?.trim();
	const changelogVersion = parseChangelogVersion(
		await readFile(CHANGELOG_PATH, "utf8"),
	);
	const versionMarker = (await readFile(VERSION_MARKER_PATH, "utf8")).trim();

	if (!packageVersion) {
		throw new Error(`${PACKAGE_JSON_PATH} is missing a version value.`);
	}

	if (packageVersion !== changelogVersion || packageVersion !== versionMarker) {
		throw new Error(
			[
				"Release version markers are out of sync.",
				`package.json: ${packageVersion}`,
				`CHANGELOG.md: ${changelogVersion}`,
				`VERSION: ${versionMarker}`,
			].join("\n"),
		);
	}

	const tag = values.tag?.trim();
	if (tag) {
		const normalizedTag = normalizeTag(tag);
		const expectedTag = `v${packageVersion}`;

		if (normalizedTag !== expectedTag) {
			throw new Error(
				`Release tag ${normalizedTag} does not match package version ${packageVersion}. Expected ${expectedTag}.`,
			);
		}
	}

	console.log(
		`Release version markers are in sync at ${packageVersion}${
			tag ? ` for ${normalizeTag(tag)}` : ""
		}.`,
	);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
