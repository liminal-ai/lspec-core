import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		"sdk/index": "src/sdk/index.ts",
		"sdk/contracts/index": "src/sdk/contracts/index.ts",
		"sdk/errors/index": "src/sdk/errors/index.ts",
		"bin/lspec": "src/bin/lspec.ts",
	},
	format: ["esm"],
	dts: true,
	clean: true,
	splitting: false,
	sourcemap: true,
	target: "node24",
	external: ["c12"],
});
