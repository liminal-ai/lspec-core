import { EMBEDDED_SKILL_ASSETS } from "./embedded-assets.generated";

const DEFAULT_CHUNK_SIZE_LINES = 500;
const SINGLE_CHUNK_MAX_LINES = 600;
const SKILL_LOAD_PATH = "SKILL.md";

export interface SkillFileSummary {
	path: string;
	lineCount: number;
	chunkCount: number;
}

export interface SkillChunk {
	skillName: string;
	path: string;
	chunkNumber: number;
	chunkCount: number;
	lineStart: number;
	lineEnd: number;
	content: string;
	nextCommand?: string;
}

export interface SkillLoad {
	skillName: string;
	markdown: string;
	files: SkillFileSummary[];
}

export interface SkillChunkLoad extends SkillChunk {
	markdown: string;
}

function skillRecord(skillName: string): Record<string, string> {
	const record =
		EMBEDDED_SKILL_ASSETS[skillName as keyof typeof EMBEDDED_SKILL_ASSETS];
	if (!record) {
		throw new Error(`Unknown skill: ${skillName}`);
	}
	return record;
}

function normalizePath(record: Record<string, string>, path: string): string {
	if (path.startsWith("/") || path.includes("..")) {
		throw new Error(`Invalid skill path: ${path}`);
	}

	if (record[path]) {
		return path;
	}

	const markdownPath = path.endsWith(".md") ? path : `${path}.md`;
	if (record[markdownPath]) {
		return markdownPath;
	}

	throw new Error(`Unknown skill path: ${path}`);
}

function linesFor(content: string): string[] {
	const normalized = content.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	if (lines.length > 1 && lines.at(-1) === "") {
		lines.pop();
	}
	return lines;
}

function chunkCountFor(lineCount: number): number {
	if (lineCount <= SINGLE_CHUNK_MAX_LINES) {
		return 1;
	}
	return Math.ceil(lineCount / DEFAULT_CHUNK_SIZE_LINES);
}

function sortedSkillPaths(record: Record<string, string>): string[] {
	return Object.keys(record).sort((left, right) => {
		if (left === SKILL_LOAD_PATH) {
			return -1;
		}
		if (right === SKILL_LOAD_PATH) {
			return 1;
		}
		return left.localeCompare(right);
	});
}

function summarizeFile(path: string, content: string): SkillFileSummary {
	const lineCount = linesFor(content).length;
	return {
		path,
		lineCount,
		chunkCount: chunkCountFor(lineCount),
	};
}

function commandFor(input: {
	skillName: string;
	path: string;
	chunkNumber: number;
}): string {
	return `lbuild-impl skill ${input.skillName} ${input.path} ${input.chunkNumber}`;
}

function renderGeneratedDirectory(input: {
	skillName: string;
	files: SkillFileSummary[];
}): string {
	const lines = [
		"---",
		"",
		"## Auto-Generated Skill Directory",
		"",
		"This directory lists every CLI-loadable file in this skill. Use the authored instructions above to decide what to read first, when to load phase-specific references, and when to stop.",
		"",
		"If interrupted or unsure what is available, reload this root map:",
		"",
		`\`lbuild-impl skill ${input.skillName}\``,
		"",
	];

	const grouped = new Map<string, SkillFileSummary[]>();
	for (const file of input.files.filter(
		(entry) => entry.path !== SKILL_LOAD_PATH,
	)) {
		const slashIndex = file.path.lastIndexOf("/");
		const group = slashIndex === -1 ? "." : file.path.slice(0, slashIndex);
		const groupFiles = grouped.get(group) ?? [];
		groupFiles.push(file);
		grouped.set(group, groupFiles);
	}

	for (const [group, files] of [...grouped.entries()].sort((left, right) =>
		left[0].localeCompare(right[0]),
	)) {
		lines.push(`### ${group}/`);
		for (const file of files) {
			lines.push(`- \`${file.path}\``);
			lines.push(`  - Lines: ${file.lineCount}`);
			lines.push(`  - Chunks: ${file.chunkCount}`);
			for (let chunk = 1; chunk <= file.chunkCount; chunk += 1) {
				lines.push(
					`  - \`${commandFor({
						skillName: input.skillName,
						path: file.path,
						chunkNumber: chunk,
					})}\``,
				);
			}
		}
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}

export function loadEmbeddedSkill(skillName: string): SkillLoad {
	const record = skillRecord(skillName);
	const skillMarkdown = record[SKILL_LOAD_PATH];
	if (!skillMarkdown) {
		throw new Error(`Skill is missing ${SKILL_LOAD_PATH}: ${skillName}`);
	}

	const files = sortedSkillPaths(record).map((path) =>
		summarizeFile(path, record[path] ?? ""),
	);
	const markdown = [
		skillMarkdown.trimEnd(),
		"",
		renderGeneratedDirectory({
			skillName,
			files,
		}),
		"",
	].join("\n");

	return {
		skillName,
		markdown,
		files,
	};
}

export function readEmbeddedSkillChunk(input: {
	skillName: string;
	path: string;
	chunkNumber: number;
}): SkillChunkLoad {
	const record = skillRecord(input.skillName);
	const path = normalizePath(record, input.path);
	if (path === SKILL_LOAD_PATH) {
		throw new Error(
			"Use `lbuild-impl skill ls-impl` for the initial skill load.",
		);
	}

	const lines = linesFor(record[path] ?? "");
	const chunkCount = chunkCountFor(lines.length);
	if (
		!Number.isInteger(input.chunkNumber) ||
		input.chunkNumber < 1 ||
		input.chunkNumber > chunkCount
	) {
		throw new Error(
			`Invalid chunk ${input.chunkNumber} for ${path}; expected 1-${chunkCount}.`,
		);
	}

	const startIndex =
		chunkCount === 1 ? 0 : (input.chunkNumber - 1) * DEFAULT_CHUNK_SIZE_LINES;
	const endIndex =
		chunkCount === 1
			? lines.length
			: Math.min(startIndex + DEFAULT_CHUNK_SIZE_LINES, lines.length);
	const lineStart = startIndex + 1;
	const lineEnd = endIndex;
	const nextCommand =
		input.chunkNumber < chunkCount
			? commandFor({
					skillName: input.skillName,
					path,
					chunkNumber: input.chunkNumber + 1,
				})
			: undefined;
	const content = lines.slice(startIndex, endIndex).join("\n");
	const markdown = [
		`# ${input.skillName} / ${path} / chunk ${input.chunkNumber} of ${chunkCount}`,
		`Lines ${lineStart}-${lineEnd}`,
		"",
		content,
		"",
		"## Carry Forward",
		"Before loading the next chunk, summarize the key rules, boundaries, filenames, and decisions from this chunk into the chat.",
		"",
		"If interrupted or unsure what else is available, reload the root skill map:",
		`\`lbuild-impl skill ${input.skillName}\``,
		...(nextCommand ? ["", "Next:", `\`${nextCommand}\``] : []),
		"",
	].join("\n");

	return {
		skillName: input.skillName,
		path,
		chunkNumber: input.chunkNumber,
		chunkCount,
		lineStart,
		lineEnd,
		content,
		nextCommand,
		markdown,
	};
}
