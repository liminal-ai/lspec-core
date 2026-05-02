import { statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

class BunFile {
	constructor(private readonly path: string) {}

	get size(): number {
		return statSync(this.path).size;
	}

	async exists(): Promise<boolean> {
		try {
			statSync(this.path);
			return true;
		} catch {
			return false;
		}
	}

	async json<T>(): Promise<T> {
		return JSON.parse(await this.text()) as T;
	}

	async text(): Promise<string> {
		return await readFile(this.path, "utf8");
	}
}

export const BunShim = {
	file(path: string): BunFile {
		return new BunFile(path);
	},

	async write(path: string, content: string | Uint8Array): Promise<void> {
		await writeFile(path, content);
	},
};
