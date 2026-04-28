import { expect, test } from "vitest";

import { mapStatusToExitCode } from "../../src/cli/envelope";

test("TC-3.3a: ok envelopes exit 0", () => {
	expect(mapStatusToExitCode("ok")).toBe(0);
});

test("TC-3.3a: error envelopes exit 1", () => {
	expect(mapStatusToExitCode("error")).toBe(1);
});

test("TC-3.3a: needs-user-decision envelopes exit 2", () => {
	expect(mapStatusToExitCode("needs-user-decision")).toBe(2);
});

test("TC-3.3a: blocked envelopes exit 3", () => {
	expect(mapStatusToExitCode("blocked")).toBe(3);
});
