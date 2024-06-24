import { assert } from "vitest";
import { readFileSync } from "fs";
import { FlacTags } from "../lib/FlacTags.js";
import { join } from "path";

export const coverBuffer = readFileSync(join(__dirname, "./cover.jpg"));
export const sourcePath = join(__dirname, "./audio-blank.flac");
export const readPath = join(__dirname, "./audio-read.flac");

export const tags: FlacTags = {
	tagMap: {
		title: "test-title",
		artist: ["artist 1", "artist 2"],
		album: "test-album",
		albumSortOrder: "TEST001",
	},
	picture: {
		buffer: coverBuffer,
	},
};
const tagMap = tags.tagMap!;
export const assertTags = (actualTags: FlacTags) => {
	assert.equal(actualTags.tagMap!.title, tagMap.title);
	assert.deepEqual(actualTags.tagMap!.artist, tagMap.artist);
	assert.equal(actualTags.tagMap!.album, tagMap.album);
	assert.equal(actualTags.tagMap!.albumSortOrder, tagMap.albumSortOrder);
	assert.isTrue(coverBuffer.equals(actualTags.picture?.buffer!));
};
