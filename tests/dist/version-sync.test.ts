import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "./helpers";

test("TC-6.4a: version sync", async () => {
	const packageJson = JSON.parse(
		await readFile(join(ROOT, "package.json"), "utf8"),
	) as {
		version?: string;
	};
	const changelog = await readFile(join(ROOT, "CHANGELOG.md"), "utf8");
	const versionMarker = (await readFile(join(ROOT, "VERSION"), "utf8")).trim();
	const changelogVersion = changelog.match(
		/^##\s+(\d+\.\d+\.\d+(?:[-+][^\s]+)?)\b/mu,
	)?.[1];

	expect(packageJson.version).toBeTruthy();
	expect(changelogVersion).toBeTruthy();
	expect(versionMarker).toBeTruthy();
	expect(packageJson.version).toBe(changelogVersion);
	expect(packageJson.version).toBe(versionMarker);
});
