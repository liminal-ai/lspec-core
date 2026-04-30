import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			defineProject({
				test: {
					name: "default",
					fileParallelism: false,
					include: ["tests/unit/**/*.test.ts"],
					globals: false,
					setupFiles: ["./tests/support/setup.ts"],
				},
			}),
			defineProject({
				test: {
					name: "package",
					fileParallelism: false,
					include: ["tests/package/**/*.test.ts"],
					globals: false,
					setupFiles: ["./tests/support/setup.ts"],
				},
			}),
			defineProject({
				test: {
					name: "integration",
					fileParallelism: false,
					include: ["tests/integration/**/*.test.ts"],
					globals: false,
					setupFiles: ["./tests/support/setup.ts"],
				},
			}),
		],
	},
});
