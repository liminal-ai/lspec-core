import { ImplCliError } from "./base.js";

export class InvalidInputError extends ImplCliError {
	readonly code = "INVALID_INPUT" as const;
}

export class InvalidSpecPackError extends ImplCliError {
	readonly code = "INVALID_SPEC_PACK" as const;
}

export class InvalidRunConfigError extends ImplCliError {
	readonly code = "INVALID_RUN_CONFIG" as const;
}

export class VerificationGateUnresolvedError extends ImplCliError {
	readonly code = "VERIFICATION_GATE_UNRESOLVED" as const;
}

export class ProviderUnavailableError extends ImplCliError {
	readonly code = "PROVIDER_UNAVAILABLE" as const;
}

export class ProviderTimeoutError extends ImplCliError {
	readonly code = "PROVIDER_TIMEOUT" as const;
}

export class ProviderStalledError extends ImplCliError {
	readonly code = "PROVIDER_STALLED" as const;
}

export class ProviderOutputInvalidError extends ImplCliError {
	readonly code = "PROVIDER_OUTPUT_INVALID" as const;
}

export class ContinuationHandleInvalidError extends ImplCliError {
	readonly code = "CONTINUATION_HANDLE_INVALID" as const;
}

export class PromptInsertInvalidError extends ImplCliError {
	readonly code = "PROMPT_INSERT_INVALID" as const;
}

export class AtomicWriteError extends ImplCliError {
	readonly code = "ATOMIC_WRITE_FAILED" as const;
}

export class IndexReservationError extends ImplCliError {
	readonly code = "INDEX_RESERVATION_FAILED" as const;
}

export class InternalError extends ImplCliError {
	readonly code = "INTERNAL_ERROR" as const;
}
