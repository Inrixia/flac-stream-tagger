import { createReadStream } from "fs";
import { readFile } from "fs/promises";
import { describe, test } from "vitest";
import { readFlacTagsBuffer } from "../index.js";
import { assertTags, readPath, sourcePath } from "./common.js";

describe("read FLAC tags", () => {
	test("read buffer", () => readFile(readPath).then(readFlacTagsBuffer).then(assertTags));
	// test("read stream", () => readFlacTagsStream(createReadStream(sourcePath)).then(assertTags));
});
