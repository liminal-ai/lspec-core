import type {
	CliResultEnvelope,
	CliStatus,
} from "../sdk/contracts/envelope.js";

export function mapStatusToExitCode(status: CliStatus): number {
	switch (status) {
		case "ok":
			return 0;
		case "needs-user-decision":
			return 2;
		case "blocked":
			return 3;
		default:
			return 1;
	}
}

export function renderDefaultHumanSummary(
	envelope: Pick<CliResultEnvelope<unknown>, "command" | "outcome">,
): string {
	return `${envelope.command}: ${envelope.outcome}`;
}
