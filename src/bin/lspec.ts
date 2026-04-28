#!/usr/bin/env node
import { defineCommand, runMain } from "citty";

const main = defineCommand({
	meta: {
		name: "lspec",
		version: "0.1.0",
		description: "Liminal Spec Core SDK / CLI Runtime",
	},
	run() {
		console.log("lspec — placeholder. Story 0 will populate the actual CLI.");
	},
});

runMain(main);
