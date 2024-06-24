import { FlacTags } from "./lib/FlacTags.js";
import { MetadataBlockType } from "./metadata-block/header.js";
import { PictureBlock } from "./metadata-block/picture.js";
import { VorbisCommentBlock } from "./metadata-block/vorbis-comment.js";
import { FlacStream } from "./FlacStream.js";
import { FlacStreamTagger } from "./FlacStreamTagger.js";
import { WriteStream } from "fs";
import { Readable } from "stream";

export const writeFlacTags = (tags: FlacTags, stream: FlacStream) => {
	const commentList: string[] = [];
	if (tags.tagMap !== undefined) {
		Object.entries(tags.tagMap).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				value.forEach((singleValue) => commentList.push(`${key.toUpperCase()}=${singleValue}`));
			} else {
				commentList.push(`${key.toUpperCase()}=${value}`);
			}
		});
	}

	if (stream.vorbisCommentBlock) {
		stream.vorbisCommentBlock.commentList = commentList;
	} else {
		stream.metadataBlocks.push(
			new VorbisCommentBlock({
				commentList,
			})
		);
	}

	if (tags.picture) {
		const { pictureBlock } = stream;
		if (pictureBlock) {
			stream.metadataBlocks = stream.metadataBlocks.filter((b) => b !== pictureBlock);
		}

		stream.metadataBlocks.push(
			new PictureBlock({
				buffer: tags.picture.buffer,
				mime: tags.picture.mime,
				description: tags.picture.description,
				colorDepth: tags.picture.colorDepth,
				colors: tags.picture.colors,
			})
		);
	}

	stream.metadataBlocks = stream.metadataBlocks.filter((b) => b.type !== MetadataBlockType.Padding);

	return stream.toBuffer();
};
