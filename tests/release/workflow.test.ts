import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { ROOT } from "../test-helpers";

const PUBLISH_WORKFLOW_PATH = join(ROOT, ".github", "workflows", "publish.yml");

async function readPublishWorkflow(): Promise<string> {
	return await readFile(PUBLISH_WORKFLOW_PATH, "utf8");
}

test("TC-6.5a: workflow triggers on tag push", async () => {
	const workflow = await readPublishWorkflow();

	expect(workflow).toContain("push:");
	expect(workflow).toContain("tags:");
	expect(workflow).toContain('- "v*.*.*"');
	expect(workflow).not.toContain("branches:");
});

test("TC-6.5b: default-CI gate blocks publish on failure", async () => {
	const workflow = await readPublishWorkflow();

	expect(workflow).toContain("default-ci:");
	expect(workflow).toContain("needs: default-ci");
	expect(workflow).toContain("npm run verify");
	expect(workflow).toContain("if: ${{ success() }}");
});

test("TC-6.5c: integration gate blocks publish on failure", async () => {
	const workflow = await readPublishWorkflow();

	expect(workflow).toContain("integration:");
	expect(workflow).toContain('LSPEC_INTEGRATION: "1"');
	expect(workflow).toContain(
		"needs:\n      - default-ci\n      - integration\n      - gorilla-evidence",
	);
	expect(workflow).toContain("npm run test:integration");
});

test("TC-6.5d: gorilla evidence required for publish", async () => {
	const workflow = await readPublishWorkflow();

	expect(workflow).toContain("gorilla-evidence:");
	expect(workflow).toContain("scripts/check-release-evidence.ts");
	expect(workflow).toContain("--release-window-days");
	expect(workflow).toContain("RELEASE_WINDOW_DAYS");
});

test("TC-6.5e: all gates green publishes", async () => {
	const workflow = await readPublishWorkflow();

	expect(workflow).toContain("scripts/check-release-version-sync.ts");
	expect(workflow).toContain("npm publish --access public --provenance");
	expect(workflow).toContain(
		"npm publish --access public --provenance --dry-run",
	);
	expect(workflow).toContain(
		"Manual workflow_dispatch runs only support dry_run=true.",
	);
	expect(workflow).toContain("registry-url: https://registry.npmjs.org");
});

test("workflow YAML remains release-ready", async () => {
	const workflowsDir = join(ROOT, ".github", "workflows");
	const workflowFiles = (await readdir(workflowsDir)).filter((fileName) =>
		fileName.endsWith(".yml"),
	);

	expect(workflowFiles.length).toBeGreaterThanOrEqual(3);

	for (const fileName of workflowFiles) {
		const workflow = await readFile(join(workflowsDir, fileName), "utf8");
		expect(workflow).toContain("name:");
		expect(workflow).toContain("jobs:");
		expect(workflow).not.toContain("\t");
	}
});
