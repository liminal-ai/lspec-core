import { ConfigLoadError } from "./config-schema";
import type { ImplCliError } from "../sdk/errors/base.js";
import { InternalError } from "../sdk/errors/classes.js";

export function classifyCommandError(
	error: unknown,
	blockedOutcome: "blocked" | "block" = "blocked",
): {
	code: string;
	outcome: "blocked" | "block" | "error";
} {
	if (error instanceof ConfigLoadError) {
		return {
			code: "INVALID_RUN_CONFIG",
			outcome: blockedOutcome,
		};
	}

	if (isImplCliError(error)) {
		return {
			code: error.code,
			outcome: blockedOutcome,
		};
	}

	return {
		code: new InternalError("Unexpected package failure.").code,
		outcome: "error",
	};
}

function isImplCliError(error: unknown): error is ImplCliError {
	return (
		error instanceof Error &&
		"code" in error &&
		typeof error.code === "string" &&
		error.code.length > 0
	);
}
