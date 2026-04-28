import { constants } from "node:fs";

import { access, readFile, writeFile } from "./runtime-deps";

export async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export async function readTextFile(path: string): Promise<string> {
	return (await readFile(path, "utf8")) as string;
}

export async function pathReadable(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export async function writeTextFile(
	path: string,
	content: string,
): Promise<void> {
	await writeFile(path, content, "utf8");
}
