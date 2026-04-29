import { expect, test } from "vitest";

import { filterEnv } from "../../src/infra/env-allowlist";

test("TC-4.6a: provider env inherits only allowlisted keys plus overrides", () => {
	const filtered = filterEnv(
		{
			PATH: "/usr/bin",
			HOME: "/tmp/home",
			LANG: "en_US.UTF-8",
			GITHUB_TOKEN: "override-me",
			HTTPS_PROXY: "http://proxy.example:8080",
			NODE_OPTIONS: "--inspect",
			AWS_SECRET_ACCESS_KEY: "secret",
			CUSTOM_LEAK: "nope",
		},
		{
			GITHUB_TOKEN: "override-token",
		},
	);

	expect(filtered).toMatchObject({
		PATH: "/usr/bin",
		HOME: "/tmp/home",
		LANG: "en_US.UTF-8",
		GITHUB_TOKEN: "override-token",
		HTTPS_PROXY: "http://proxy.example:8080",
	});
	expect(filtered.NODE_OPTIONS).toBeUndefined();
	expect(filtered.AWS_SECRET_ACCESS_KEY).toBeUndefined();
	expect(filtered.CUSTOM_LEAK).toBeUndefined();
});

test("TC-4.6a: process.env-shaped overrides cannot restore disallowed keys", () => {
	const parent = {
		PATH: "/usr/bin",
		CODEX_TOKEN: "allowed-token",
		AWS_SECRET_ACCESS_KEY: "secret",
		NODE_OPTIONS: "--inspect",
		CUSTOM_LEAK: "nope",
	};

	const filtered = filterEnv(parent, parent);

	expect(filtered.PATH).toBe("/usr/bin");
	expect(filtered.CODEX_TOKEN).toBe("allowed-token");
	expect(filtered.AWS_SECRET_ACCESS_KEY).toBeUndefined();
	expect(filtered.NODE_OPTIONS).toBeUndefined();
	expect(filtered.CUSTOM_LEAK).toBeUndefined();
});
