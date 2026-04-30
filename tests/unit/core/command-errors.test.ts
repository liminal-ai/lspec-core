import { describe, expect, test } from "vitest";

describe("command error classification", () => {
	test("maps ConfigLoadError instances to INVALID_RUN_CONFIG", async () => {
		const { ConfigLoadError } = await import("../../../src/core/config-schema");
		const { classifyCommandError } = await import(
			"../../../src/core/command-errors"
		);

		expect(
			classifyCommandError(new ConfigLoadError("Malformed run-config JSON.")),
		).toEqual({
			code: "INVALID_RUN_CONFIG",
			outcome: "blocked",
		});
	});

	test("maps unrelated failures to INTERNAL_ERROR without string matching", async () => {
		const { classifyCommandError } = await import(
			"../../../src/core/command-errors"
		);

		expect(
			classifyCommandError(
				new Error("provider config drift in downstream output"),
			),
		).toEqual({
			code: "INTERNAL_ERROR",
			outcome: "error",
		});
	});

	test("maps InternalError instances to error outcomes", async () => {
		const { classifyCommandError } = await import(
			"../../../src/core/command-errors"
		);
		const { InternalError } = await import("../../../src/sdk/errors/classes");

		expect(
			classifyCommandError(new InternalError("Invariant failed.")),
		).toEqual({
			code: "INTERNAL_ERROR",
			outcome: "error",
		});
	});

	test("maps unexpected ImplCliError subclasses to error outcomes", async () => {
		const { classifyCommandError } = await import(
			"../../../src/core/command-errors"
		);
		const { ImplCliError } = await import("../../../src/sdk/errors/base");

		class UnexpectedProgrammingError extends ImplCliError {
			readonly code = "UNEXPECTED_PROGRAMMING_FAILURE";
		}

		expect(
			classifyCommandError(
				new UnexpectedProgrammingError("A command invariant failed."),
			),
		).toEqual({
			code: "UNEXPECTED_PROGRAMMING_FAILURE",
			outcome: "error",
		});
	});
});
