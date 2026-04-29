export const DEFAULT_ALLOWLIST = [
	"PATH",
	"HOME",
	"USER",
	"TERM",
	"SHELL",
	"LANG",
	"TMPDIR",
	"TEMP",
	"TMP",
	"HTTPS_PROXY",
	"HTTP_PROXY",
	"ALL_PROXY",
	"NO_PROXY",
] as const;

export const DEFAULT_ALLOWLIST_PREFIXES = [
	"LC_",
	"CLAUDE_",
	"CODEX_",
	"GH_",
	"GITHUB_",
	"COPILOT_",
	"ANTHROPIC_",
	"OPENAI_",
] as const;

function isAllowedKey(key: string): boolean {
	return (
		DEFAULT_ALLOWLIST.includes(key as (typeof DEFAULT_ALLOWLIST)[number]) ||
		DEFAULT_ALLOWLIST_PREFIXES.some((prefix) => key.startsWith(prefix))
	);
}

export function filterEnv(
	parentEnv: NodeJS.ProcessEnv,
	overrides: Record<string, string | undefined> = {},
): Record<string, string> {
	const filtered: Record<string, string> = {};

	for (const [key, value] of Object.entries(parentEnv)) {
		if (typeof value !== "string" || !isAllowedKey(key)) {
			continue;
		}
		filtered[key] = value;
	}

	for (const [key, value] of Object.entries(overrides)) {
		if (typeof value === "string" && isAllowedKey(key)) {
			filtered[key] = value;
			continue;
		}
		delete filtered[key];
	}

	return filtered;
}
