import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			defineProject({
				test: {
					name: "default",
					fileParallelism: false,
					include: ["tests/**/*.test.ts"],
					exclude: [
						"tests/build-output.test.ts",
						"tests/command/help.test.ts",
						"tests/command/invocation.test.ts",
						"tests/command/pack-and-install-smoke.test.ts",
						"tests/dist/**/*.test.ts",
						"tests/foundation.test.ts",
						"tests/gorilla/distribution.test.ts",
						"tests/integration/**/*.test.ts",
						"tests/release/**/*.test.ts",
					],
					globals: false,
					setupFiles: ["./tests/setup.ts"],
				},
			}),
			defineProject({
				test: {
					name: "package",
					fileParallelism: false,
					include: [
						"tests/build-output.test.ts",
						"tests/command/help.test.ts",
						"tests/command/invocation.test.ts",
						"tests/command/pack-and-install-smoke.test.ts",
						"tests/dist/**/*.test.ts",
						"tests/foundation.test.ts",
						"tests/gorilla/distribution.test.ts",
						"tests/release/**/*.test.ts",
					],
					globals: false,
					setupFiles: ["./tests/setup.ts"],
				},
			}),
			defineProject({
				test: {
					name: "integration",
					fileParallelism: false,
					include: ["tests/integration/**/*.test.ts"],
					globals: false,
					setupFiles: ["./tests/setup.ts"],
				},
			}),
		],
	},
});
