import { AsyncLocalStorage } from "node:async_hooks";
import {
	type ChildProcess,
	type ExecFileOptionsWithStringEncoding,
	execFile as nodeExecFile,
	spawn as nodeSpawn,
} from "node:child_process";
import type { Dirent } from "node:fs";
import * as nodeFs from "node:fs";
import {
	access as nodeAccess,
	appendFile as nodeAppendFile,
	mkdir as nodeMkdir,
	mkdtemp as nodeMkdtemp,
	open as nodeOpen,
	readdir as nodeReaddir,
	readFile as nodeReadFile,
	rename as nodeRename,
	rm as nodeRm,
	stat as nodeStat,
	writeFile as nodeWriteFile,
} from "node:fs/promises";

export interface FileSystemAdapter {
	access?: typeof nodeAccess;
	appendFile?: typeof nodeAppendFile;
	createWriteStream?: typeof nodeFs.createWriteStream;
	mkdir?: typeof nodeMkdir;
	mkdtemp?: typeof nodeMkdtemp;
	open?: typeof nodeOpen;
	readFile?: typeof nodeReadFile;
	readdir?: typeof nodeReaddir;
	rename?: typeof nodeRename;
	rm?: typeof nodeRm;
	stat?: typeof nodeStat;
	writeFile?: typeof nodeWriteFile;
}

export type SpawnImplementation = typeof nodeSpawn;

export type ExecFileImplementation = (
	file: string,
	args: ReadonlyArray<string>,
	options: ExecFileOptionsWithStringEncoding,
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => ChildProcess;

interface RuntimeDepsContext {
	fs?: FileSystemAdapter;
	spawn?: SpawnImplementation;
	execFile?: ExecFileImplementation;
}

const runtimeDepsStorage = new AsyncLocalStorage<RuntimeDepsContext>();

function getContext(): RuntimeDepsContext {
	return runtimeDepsStorage.getStore() ?? {};
}

export async function withRuntimeDeps<T>(
	context: RuntimeDepsContext,
	callback: () => Promise<T>,
): Promise<T> {
	return await runtimeDepsStorage.run(context, callback);
}

export function getSpawnImplementation(): SpawnImplementation {
	return getContext().spawn ?? nodeSpawn;
}

export function getExecFileImplementation(): ExecFileImplementation {
	return getContext().execFile ?? nodeExecFile;
}

export function createWriteStream(
	...args: Parameters<typeof nodeFs.createWriteStream>
): ReturnType<typeof nodeFs.createWriteStream> {
	const implementation =
		getContext().fs?.createWriteStream ?? nodeFs.createWriteStream;
	return implementation(...args);
}

export async function access(
	...args: Parameters<typeof nodeAccess>
): ReturnType<typeof nodeAccess> {
	const implementation = getContext().fs?.access ?? nodeAccess;
	return await implementation(...args);
}

export async function appendFile(
	...args: Parameters<typeof nodeAppendFile>
): ReturnType<typeof nodeAppendFile> {
	const implementation = getContext().fs?.appendFile ?? nodeAppendFile;
	return await implementation(...args);
}

export async function mkdir(
	...args: Parameters<typeof nodeMkdir>
): ReturnType<typeof nodeMkdir> {
	const implementation = getContext().fs?.mkdir ?? nodeMkdir;
	return await implementation(...args);
}

export async function mkdtemp(
	...args: Parameters<typeof nodeMkdtemp>
): ReturnType<typeof nodeMkdtemp> {
	const implementation = getContext().fs?.mkdtemp ?? nodeMkdtemp;
	return await implementation(...args);
}

export async function open(
	...args: Parameters<typeof nodeOpen>
): ReturnType<typeof nodeOpen> {
	const implementation = getContext().fs?.open ?? nodeOpen;
	return await implementation(...args);
}

export async function readFile(
	...args: Parameters<typeof nodeReadFile>
): ReturnType<typeof nodeReadFile> {
	const implementation = getContext().fs?.readFile ?? nodeReadFile;
	return await implementation(...args);
}

export async function readdir(
	...args: Parameters<typeof nodeReaddir>
): ReturnType<typeof nodeReaddir> {
	const implementation = getContext().fs?.readdir ?? nodeReaddir;
	return await implementation(...args);
}

export async function readdirText(path: string): Promise<string[]> {
	const implementation = getContext().fs?.readdir ?? nodeReaddir;
	return (await implementation(path, {
		encoding: "utf8",
	})) as unknown as string[];
}

export async function readdirDirents(path: string): Promise<Dirent[]> {
	const implementation = getContext().fs?.readdir ?? nodeReaddir;
	return (await implementation(path, {
		encoding: "utf8",
		withFileTypes: true,
	})) as unknown as Dirent[];
}

export async function rename(
	...args: Parameters<typeof nodeRename>
): ReturnType<typeof nodeRename> {
	const implementation = getContext().fs?.rename ?? nodeRename;
	return await implementation(...args);
}

export async function rm(
	...args: Parameters<typeof nodeRm>
): ReturnType<typeof nodeRm> {
	const implementation = getContext().fs?.rm ?? nodeRm;
	return await implementation(...args);
}

export async function stat(
	...args: Parameters<typeof nodeStat>
): ReturnType<typeof nodeStat> {
	const implementation = getContext().fs?.stat ?? nodeStat;
	return await implementation(...args);
}

export async function writeFile(
	...args: Parameters<typeof nodeWriteFile>
): ReturnType<typeof nodeWriteFile> {
	const implementation = getContext().fs?.writeFile ?? nodeWriteFile;
	return await implementation(...args);
}
