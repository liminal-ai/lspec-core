import { BunShim } from "./bun-shim";

Object.assign(globalThis, {
	Bun: BunShim,
});
