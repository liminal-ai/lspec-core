import {
	loadEmbeddedSkill,
	readEmbeddedSkillChunk,
	type SkillChunkLoad,
	type SkillLoad,
} from "../../core/skill-assets.js";

export interface LoadSkillInput {
	skillName: string;
}

export interface ReadSkillChunkInput {
	skillName: string;
	path: string;
	chunkNumber: number;
}

export type { SkillChunkLoad, SkillLoad };

export function loadSkill(input: LoadSkillInput): SkillLoad {
	return loadEmbeddedSkill(input.skillName);
}

export function readSkillChunk(input: ReadSkillChunkInput): SkillChunkLoad {
	return readEmbeddedSkillChunk(input);
}
