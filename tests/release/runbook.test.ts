import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "../test-helpers";

test("TC-6.6a: runbook structural completeness", async () => {
	const runbook = await readFile(
		join(ROOT, "docs", "release-runbook.md"),
		"utf8",
	);

	expect(runbook).toContain("## npm token configuration");
	expect(runbook).toContain("## Package access setup");
	expect(runbook).toContain("## Pre-tag gorilla evidence procedure");
	expect(runbook).toContain("## First publish rehearsal");
	expect(runbook).toContain("## Post-publish verification");
});
