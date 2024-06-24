import { describe, test } from "vitest";
import { createReadStream } from "fs";
import { readFile } from "fs/promises";
import { assertTags, sourcePath, tags } from "./common.js";
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
