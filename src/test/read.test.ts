import { describe, test } from "vitest";
import { readFlacTags, readFlacTagsSync } from "../index.js";
import { assertTags, readPath } from "./common.js";

describe("read FLAC tags", () => {
	test("read async", async () => {
		const actualTags = await readFlacTags(readPath);
		assertTags(actualTags);
	});
	test("read sync", () => {
		const actualTags = readFlacTagsSync(readPath);
		assertTags(actualTags);
	});
});
