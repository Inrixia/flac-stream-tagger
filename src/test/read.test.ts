import { createReadStream, writeFile } from "fs";
import { readFile } from "fs/promises";
import { describe, test } from "vitest";
import { readFlacTagsBuffer } from "../index.js";
import { assertTags, readPath, sourcePath, tags, writePath } from "./common.js";
import { FlacStreamTagger } from "../FlacStreamTagger.js";

describe("read FLAC tags", () => {
	test("read buffer", () => {
		return readFile(readPath).then(readFlacTagsBuffer).then(assertTags);
	});
	test("read stream", async () => {
		const tagger = createReadStream(readPath).pipe(new FlacStreamTagger());
		return tagger.tags().then(assertTags);
	});
});
