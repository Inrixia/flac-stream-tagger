import { createFlacTagMap } from "./lib/createFlacTagMap.js";
import { FlacTags } from "./lib/FlacTags.js";
import { FlacStream } from "./FlacStream.js";

export const readFlacTags = (flacStream: FlacStream): FlacTags => {
	const { vorbisCommentBlock, pictureBlock } = flacStream;
	const commentList = vorbisCommentBlock?.commentList ?? [];
	const tagMap = createFlacTagMap();
	for (const it of commentList) {
		const splitIndex = it.indexOf("=");
		if (splitIndex === -1) continue;

		const key = it.substring(0, splitIndex);
		const value = it.substring(splitIndex + 1);
		const existingValue = tagMap[key];

		if (existingValue) {
			if (Array.isArray(existingValue)) existingValue.push(value);
			else tagMap[key] = [existingValue, value];
		} else {
			tagMap[key] = value;
		}
	}
	const tags: FlacTags = {
		tagMap,
		picture: pictureBlock
			? {
					pictureType: pictureBlock.pictureType,
					mime: pictureBlock.mime,
					description: pictureBlock.description,
					colorDepth: pictureBlock.colorDepth,
					colors: pictureBlock.colors,
					buffer: pictureBlock.pictureBuffer,
				}
			: undefined,
	};
	return tags;
};
