import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		"sdk/index": "src/sdk/index.ts",
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
