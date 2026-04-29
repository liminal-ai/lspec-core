import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

import { mkdir, open, rename, rm } from "../core/runtime-deps.js";
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

	let handle: Awaited<ReturnType<typeof open>> | undefined;
	try {
		handle = await open(tempPath, "w");
		await handle.writeFile(content);
		await handle.sync();
		await handle.close();
		handle = undefined;

		await rename(tempPath, path);
		await syncDirectory(directory);
	} catch (error) {
		await handle?.close().catch(() => undefined);
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

async function syncDirectory(directory: string): Promise<void> {
	let handle: Awaited<ReturnType<typeof open>> | undefined;
	try {
		handle = await open(directory, "r");
		await handle.sync();
	} catch {
		// Some platforms/filesystems do not allow fsync on directories.
	} finally {
		await handle?.close().catch(() => undefined);
	}
}
