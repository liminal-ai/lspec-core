import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "./helpers";

test("TC-6.1a: distribution metadata complete", async () => {
	const packageJson = JSON.parse(
		await readFile(join(ROOT, "package.json"), "utf8"),
	) as {
		name?: string;
		version?: string;
		bin?: Record<string, string>;
		exports?: Record<string, { import?: string; types?: string }>;
		files?: string[];
		types?: string;
	};

	expect(packageJson.name).toBe("lbuild-impl");
	expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
	expect(packageJson.bin).toEqual({
		"lbuild-impl": "dist/bin/lbuild-impl.js",
	});
	expect(packageJson.types).toBe("./dist/sdk/index.d.ts");
	expect(packageJson.exports).toEqual({
		".": {
			import: "./dist/sdk/index.js",
			types: "./dist/sdk/index.d.ts",
		},
		"./sdk": {
			import: "./dist/sdk/index.js",
			types: "./dist/sdk/index.d.ts",
		},
		"./sdk/contracts": {
			import: "./dist/sdk/contracts/index.js",
			types: "./dist/sdk/contracts/index.d.ts",
		},
		"./sdk/errors": {
			import: "./dist/sdk/errors/index.js",
			types: "./dist/sdk/errors/index.d.ts",
		},
	});
	expect(packageJson.files).toEqual([
		"dist",
		"README.md",
		"LICENSE",
		"CHANGELOG.md",
	]);
});
