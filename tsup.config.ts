import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		bin: "src/bin.ts",
	},
	format: ["esm"],
	dts: true,
	clean: true,
	splitting: false,
	sourcemap: true,
	target: "node24",
	external: ["c12"],
});
