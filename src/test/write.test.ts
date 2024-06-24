import { describe, test, afterEach } from "vitest";
import { createReadStream } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { assertTags, sourcePath, tags, writePath } from "./common.js";
import { FlacStreamTagger } from "../index.js";

describe("write FLAC tags", () => {
	test("write buffer", async () => {
		const taggedBuffer = await FlacStreamTagger.fromBuffer(await readFile(sourcePath), tags).toBuffer();
		return FlacStreamTagger.fromBuffer(taggedBuffer).tags().then(assertTags);
	});
	test("write stream", () => {
		return createReadStream(sourcePath).pipe(new FlacStreamTagger(tags)).pipe(new FlacStreamTagger()).tags().then(assertTags);
	});
});
