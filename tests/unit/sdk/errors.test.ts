import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { inspect, preflight } from "../../../src/sdk";
import { InvalidInputError } from "../../../src/sdk/errors";
import { createSpecPack, writeTextFile } from "../../support/test-helpers";

describe("sdk error contracts", () => {
	test("TC-4.2a: structured failures return envelope errors with stable codes", async () => {
		const specPackRoot = await createSpecPack("sdk-errors-invalid-run-config");
		await writeTextFile(
			join(specPackRoot, "impl-run.config.json"),
			"{ invalid json\n",
		);

		const envelope = await preflight({
			specPackRoot,
		});

		expect(envelope.status).toBe("blocked");
		expect(envelope.errors[0]).toMatchObject({
			code: "INVALID_RUN_CONFIG",
		});
	});

	test("TC-4.2c: SDK input boundary parse failures throw InvalidInputError", async () => {
		await expect(
			inspect({
				specPackRoot: 123 as never,
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
	});
});
