import { describe, test, afterEach } from "vitest";
import { createReadStream } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { writeFlacTagsBuffer, readFlacTagsBuffer } from "../index.js";
import { assertTags, sourcePath, tags, writePath } from "./common.js";
import { FlacStreamTagger } from "../FlacStreamTagger.js";
import { Readable } from "stream";

afterEach(() => unlink(writePath));
describe("write FLAC tags", () => {
	test("write buffer", async () => {
		const sourceBuffer = await readFile(sourcePath);
		await writeFile(writePath, await FlacStreamTagger.fromBuffer(sourceBuffer, tags).toBuffer());
		return readFile(writePath).then(readFlacTagsBuffer).then(assertTags);
	});
	test("write stream", async () => {
		const sourceStream = createReadStream(sourcePath);
		await writeFile(writePath, sourceStream.pipe(new FlacStreamTagger(tags)));
		return readFile(writePath).then(readFlacTagsBuffer).then(assertTags);
	});
});
