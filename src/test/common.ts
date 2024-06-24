import { assert } from "vitest";
import { readFile } from "fs/promises";
import { FlacTags } from "../index.js";
import { join } from "path";

export const coverBuffer = await readFile(join(__dirname, "./cover.jpg"));
export const sourcePath = join(__dirname, "./audio-blank.flac");
export const readPath = join(__dirname, "./audio-read.flac");
export const writePath = join(__dirname, "./audio-write.flac");

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
export const assertTags = (actualTags: FlacTags) => {
	assert.equal(actualTags.tagMap.title, tags.tagMap.title);
	assert.deepEqual(actualTags.tagMap.artist, tags.tagMap.artist);
	assert.equal(actualTags.tagMap.album, tags.tagMap.album);
	assert.equal(actualTags.tagMap.albumSortOrder, tags.tagMap.albumSortOrder);
	assert.isTrue(coverBuffer.equals(actualTags.picture?.buffer!));
};
