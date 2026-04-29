import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gorillaRoot = dirname(fileURLToPath(import.meta.url));
const baselineRoot = resolve(gorillaRoot, ".baseline", "fixture-spec-pack");
const fixtureRoot = resolve(gorillaRoot, "fixture-spec-pack");

export async function resetFixture(): Promise<void> {
	await rm(fixtureRoot, { recursive: true, force: true });
	await cp(baselineRoot, fixtureRoot, { recursive: true });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	await resetFixture();
}
