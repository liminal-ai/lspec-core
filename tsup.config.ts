import { defineConfig } from "tsup";

const shared = {
	format: ["esm"],
	splitting: false,
	sourcemap: true,
	target: "node24",
	external: ["c12"],
} as const;

export default defineConfig([
	{
		...shared,
		entry: {
			"sdk/index": "src/sdk/index.ts",
			"sdk/contracts/index": "src/sdk/contracts/index.ts",
			"sdk/errors/index": "src/sdk/errors/index.ts",
		},
		dts: true,
		clean: true,
	},
	{
		...shared,
		entry: {
			"bin/lbuild-impl": "src/bin/lbuild-impl.ts",
		},
		banner: {
			js: "#!/usr/bin/env node",
		},
		dts: true,
		clean: false,
	},
]);
