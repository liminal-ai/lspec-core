import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT, runSourceCli } from "../../support/test-helpers";

test("story-orchestrate appears in both README and root help with durable story-lead guidance", async () => {
	const [readme, help] = await Promise.all([
		readFile(join(ROOT, "README.md"), "utf8"),
		runSourceCli(["--help"]),
	]);

	expect(readme).toContain("| `story-orchestrate` |");
	expect(readme).toContain("durable story-lead attempt");
	expect(help.exitCode).toBe(0);
	expect(help.stderr).toBe("");
	expect(help.stdout).toContain("story-orchestrate");
	expect(help.stdout).toContain("durable story-lead attempt");
});
