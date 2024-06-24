import { FlacStream } from "./FlacStream.js";
import { Readable } from "stream";
import { FlacTags } from "./lib/FlacTags.js";
import { readFlacTags } from "./readFlacTags.js";
import { writeFlacTags } from "./writeFlacTags.js";

export { FlacStream } from "./FlacStream.js";
export { BufferBase } from "./lib/buffer-base.js";
export { MetadataBlockType, MetadataBlockHeaderLength, MetadataBlockHeader } from "./metadata-block/header.js";
export { MetadataBlock } from "./metadata-block/index.js";
export { OtherMetadataBlock } from "./metadata-block/other.js";
export { PictureBlock, PictureType } from "./metadata-block/picture.js";
export { VorbisCommentBlock } from "./metadata-block/vorbis-comment.js";
export { FlacTags } from "./lib/FlacTags.js";
export { createFlacTagMap } from "./lib/createFlacTagMap.js";

/**
 * Read FLAC Tags
 * @param input FLAC buffer
 */
export const readFlacTagsBuffer = (buffer: Buffer) => readFlacTags(FlacStream.fromBuffer(buffer));
export const readFlacTagsStream = (stream: Readable) => FlacStream.fromStream(stream).then(readFlacTags);
/**
 * Write FLAC Tags
 * @param input FLAC buffer
 */
export const writeFlacTagsBuffer = (tags: FlacTags, sourceBuffer: Buffer) => writeFlacTags(tags, FlacStream.fromBuffer(sourceBuffer));
