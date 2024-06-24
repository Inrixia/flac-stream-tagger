import { describe, test, beforeEach, afterEach } from "vitest";
import { copyFile, unlink } from "fs/promises";
import { writeFlacTags, readFlacTags, writeFlacTagsSync, readFlacTagsSync } from "../index.js";
import { assertTags, sourcePath, tags, writePath } from "./common.js";

beforeEach(async () => {
	await copyFile(sourcePath, writePath);
});
afterEach(async () => {
	await unlink(writePath);
});
describe("write FLAC tags", () => {
	test("write async", async () => {
		await writeFlacTags(tags, writePath);
		const actualTags = await readFlacTags(writePath);
		assertTags(actualTags);
	});
	test("write sync", () => {
		writeFlacTagsSync(tags, writePath);
		const actualTags = readFlacTagsSync(writePath);
		assertTags(actualTags);
	});
});
