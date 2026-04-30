import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "../../support/test-helpers";

test("TC-4.8a: the test suite does not mock internal modules", async () => {
	const { execSync } = await import("node:child_process");
	const paths = execSync(`find ${join(ROOT, "tests")} -name '*.ts' -type f`, {
		encoding: "utf8",
	})
		.trim()
		.split("\n")
		.filter(Boolean);
	const offenders: string[] = [];

	for (const path of paths) {
		const source = await readFile(path, "utf8");
		if (
			/source\.\/|src\//.test(source) &&
			/(vi\.mock|vi\.spyOn)/.test(source)
		) {
			offenders.push(path);
		}
	}

	expect(offenders).toEqual([]);
});
