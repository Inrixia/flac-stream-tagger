import { createReadStream, writeFile } from "fs";
import { readFile } from "fs/promises";
import { describe, test } from "vitest";
import { assertTags, readPath, sourcePath, tags, writePath } from "./common.js";
import { FlacStreamTagger } from "../index.js";

describe("read FLAC tags", () => {
	test("read buffer", () => {
		return readFile(readPath)
			.then(FlacStreamTagger.fromBuffer)
			.then((tagger) => tagger.tags())
			.then(assertTags);
	});
	test("read stream", async () => {
		const tagger = createReadStream(readPath).pipe(new FlacStreamTagger());
		return tagger.tags().then(assertTags);
	});
});
