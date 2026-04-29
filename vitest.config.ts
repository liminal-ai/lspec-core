import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			defineProject({
				test: {
					name: "default",
					fileParallelism: false,
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/integration/**/*.test.ts"],
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
