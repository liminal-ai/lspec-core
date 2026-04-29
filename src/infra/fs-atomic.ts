import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

import { mkdir, rename, rm, writeFile } from "../core/runtime-deps.js";
import { AtomicWriteError } from "../sdk/errors/classes.js";

export async function writeAtomic(
	path: string,
	content: string | Buffer,
): Promise<void> {
	const directory = dirname(path);
	const tempPath = `${path}.tmp.${randomUUID()}`;

	await mkdir(directory, {
		recursive: true,
	});

	try {
		await writeFile(tempPath, content);
		await rename(tempPath, path);
	} catch (error) {
		await rm(tempPath, {
			force: true,
		}).catch(() => undefined);
		throw new AtomicWriteError(
			`Atomic write failed for ${path}`,
			error instanceof Error ? error.message : String(error),
			{
				cause: error,
			},
		);
	}
}
