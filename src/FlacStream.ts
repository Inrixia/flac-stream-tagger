import { BufferBase } from "./lib/buffer-base.js";
import { MetadataBlock } from "./metadata-block/index.js";
import { MetadataBlockType } from "./metadata-block/header.js";
import { parseBlock } from "./metadata-block/parse.js";
import { PictureBlock } from "./metadata-block/picture.js";
import { VorbisCommentBlock } from "./metadata-block/vorbis-comment.js";

export const FlacStreamMarker = "fLaC";
export class FlacStream extends BufferBase {
	metadataBlocks!: MetadataBlock[];
	frameData!: Buffer;

	constructor(initialValues: { metadataBlocks: MetadataBlock[]; frameData: Buffer }) {
		super();
		Object.assign(this, initialValues);
	}

	get vorbisCommentBlock(): VorbisCommentBlock | undefined {
		return this.metadataBlocks.find((it) => it.type === MetadataBlockType.VorbisComment) as VorbisCommentBlock;
	}

	get pictureBlock(): PictureBlock | undefined {
		return this.metadataBlocks.find((it) => it.type === MetadataBlockType.Picture) as PictureBlock;
	}

	static fromBuffer(buffer: Buffer) {
		const marker = buffer.subarray(0, 4).toString();
		if (marker !== FlacStreamMarker) {
			throw new Error("Invalid stream header");
		}
		let bufferIndex = 4;
		const blocks: MetadataBlock[] = [];
		const isNotLastBlock = () => (blocks.length > 0 ? !blocks[blocks.length - 1].header.isLast : true);
		while (isNotLastBlock()) {
			const restBlock = buffer.subarray(bufferIndex);
			const block = parseBlock(restBlock);
			if (block.type === MetadataBlockType.Invalid) {
				break;
			}
			blocks.push(block);
			bufferIndex += block.length;
		}
		return new FlacStream({
			metadataBlocks: blocks,
			frameData: buffer.subarray(bufferIndex),
		});
	}

	toBuffer() {
		return Buffer.concat([
			Buffer.from(FlacStreamMarker),
			...this.metadataBlocks.map((block, index) => {
				const isLast = index === this.metadataBlocks.length - 1;
				block.header.isLast = isLast;
				block.header.dataLength = block.length - block.header.length;
				return block.toBuffer();
			}),
			this.frameData,
		]);
	}

	metadataBuffer() {
		return Buffer.concat(
			this.metadataBlocks.map((block, index) => {
				block.header.isLast = index === this.metadataBlocks.length - 1;
				block.header.dataLength = block.length - block.header.length;
				return block.toBuffer();
			})
		);
	}

	get length() {
		return this.metadataBlocks.map((it) => it.length).reduce((previous, current) => previous + current, 0) + this.frameData.length;
	}
}
