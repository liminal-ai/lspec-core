import { resolve } from "node:path";

import { getExecFileImplementation } from "./runtime-deps";

export async function resolveGitRepoRoot(cwd: string): Promise<string | null> {
	try {
		const stdout = await new Promise<string>((resolveOutput, reject) => {
			getExecFileImplementation()(
				"git",
				["rev-parse", "--show-toplevel"],
				{
					cwd,
					encoding: "utf8",
				},
				(error, gitStdout) => {
					if (error) {
						reject(error);
						return;
					}

					resolveOutput(gitStdout);
				},
			);
		});
		const repoRoot = stdout.trim();
		return repoRoot.length > 0 ? repoRoot : null;
	} catch {
		return null;
	}
}

export async function resolveProviderCwd(
	specPackRoot: string,
): Promise<string> {
	return (await resolveGitRepoRoot(specPackRoot)) ?? resolve(specPackRoot);
}
