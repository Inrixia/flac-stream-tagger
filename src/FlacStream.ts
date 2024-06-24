import { BufferBase } from "./lib/buffer-base.js";
import { MetadataBlock } from "./metadata-block/index.js";
import { MetadataBlockHeader, MetadataBlockType } from "./metadata-block/header.js";
import { parseBlock } from "./metadata-block/parse.js";
import { PictureBlock } from "./metadata-block/picture.js";
import { VorbisCommentBlock } from "./metadata-block/vorbis-comment.js";
import { Readable, PassThrough, Transform, TransformCallback } from "stream";
import { FlacTagMap } from "./lib/createFlacTagMap.js";
import { FlacPicture, FlacTags } from "./lib/FlacTags.js";

const FlacStreamMarker = "fLaC";
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

	static async fromStream(stream: Readable): Promise<FlacStream> {
		const passThrough = new PassThrough();
		stream.pipe(passThrough);

		let headerBuffer = Buffer.alloc(0);
		let metadataBlocks: MetadataBlock[] = [];
		let bufferIndex = 0;

		streamLoop: for await (const chunk of passThrough) {
			headerBuffer = Buffer.concat([headerBuffer, chunk]);

			// Ensure we have enough data to check the marker
			if (bufferIndex === 0) {
				if (headerBuffer.length < 4) throw new Error(`Invalid stream header, must be at least 4 bytes long got ${headerBuffer.length}`);
				const marker = headerBuffer.toString("utf8", 0, 4);
				if (marker !== FlacStreamMarker) throw new Error(`Invalid stream header: ${marker}`);
				bufferIndex = 4;
			}
			// Process metadata blocks
			while (bufferIndex + MetadataBlockHeader.SIZE < headerBuffer.length) {
				const { dataLength } = MetadataBlockHeader.fromBuffer(headerBuffer.subarray(bufferIndex, bufferIndex + MetadataBlockHeader.SIZE));
				if (bufferIndex + dataLength + MetadataBlockHeader.SIZE > headerBuffer.length) break;

				const blockBuffer = headerBuffer.subarray(bufferIndex);
				const block = parseBlock(blockBuffer);
				if (block.type === MetadataBlockType.Invalid) break;

				metadataBlocks.push(block);
				bufferIndex += block.length;

				if (block.header.isLast) break streamLoop;
			}
		}
		return new FlacStream({
			metadataBlocks,
			frameData: Buffer.alloc(0),
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

export class FlacStreamTagger extends Transform {
	private index: number = 0;
	private processedHeader: boolean = false;
	private headerBuffer: Buffer = Buffer.alloc(0);

	private readonly metaBlocks: MetadataBlock[] = [];
	private picBlock?: PictureBlock;
	private vorbisBlock?: VorbisCommentBlock;

	private readOnly: boolean = true;

	constructor(flacTags: FlacTags = {}) {
		super();
		// If no tags for writing are given, then make stream read-only
		this.readOnly = flacTags === undefined;
		const { tagMap, picture } = flacTags;
		if (tagMap !== undefined) {
			this.vorbisBlock = new VorbisCommentBlock();
			for (const key in tagMap) {
				const value = tagMap[key];
				if (Array.isArray(value)) {
					for (const singleValue of value) this.vorbisBlock.commentList.push(`${key.toUpperCase()}=${singleValue}`);
				} else {
					this.vorbisBlock.commentList.push(`${key.toUpperCase()}=${value}`);
				}
			}
			this.metaBlocks.push(this.vorbisBlock);
		}
		if (picture !== undefined) {
			this.picBlock = new PictureBlock(picture);
			this.picBlock.header.isLast = true;
			this.picBlock.header.dataLength = this.picBlock.length - this.picBlock.header.length;
			this.metaBlocks.push(this.picBlock);
		}
	}
	private onDone(callback: TransformCallback) {
		this.processedHeader = true;
		callback(
			null,
			Buffer.concat([
				Buffer.from(FlacStreamMarker),
				...this.metaBlocks.map((block, index) => {
					const isLast = index === this.metaBlocks.length - 1;
					block.header.isLast = isLast;
					block.header.dataLength = block.length - block.header.length;
					return block.toBuffer();
				}),
				this.headerBuffer.subarray(this.index),
			])
		);
	}
	_flush(callback: TransformCallback): void {
		if (!this.processedHeader && !this.readOnly) return this.onDone(callback);
		return callback();
	}
	_transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
		if (this.readOnly) return callback(null, chunk);
		try {
			if (this.processedHeader) return callback(null, chunk);

			this.headerBuffer = Buffer.concat([this.headerBuffer, chunk]);

			// Ensure we have enough data to check the marker
			if (this.index === 0) {
				if (this.headerBuffer.length < 4) return callback(new Error(`Invalid stream header, must be at least 4 bytes long got ${this.headerBuffer.length}`));
				const marker = this.headerBuffer.toString("utf8", 0, 4);
				if (marker !== FlacStreamMarker) return callback(new Error(`Invalid stream header: ${marker}`));
				this.index = 4;
			}

			// Process metadata blocks
			while (this.index + MetadataBlockHeader.SIZE < this.headerBuffer.length) {
				const { dataLength } = MetadataBlockHeader.fromBuffer(this.headerBuffer.subarray(this.index, this.index + MetadataBlockHeader.SIZE));
				if (this.index + dataLength + MetadataBlockHeader.SIZE > this.headerBuffer.length) break;

				const blockBuffer = this.headerBuffer.subarray(this.index);
				const block = parseBlock(blockBuffer);
				this.index += block.length;
				switch (block.type) {
					case MetadataBlockType.VorbisComment:
						if (this.vorbisBlock === undefined) this.metaBlocks.push(block);
						break;
					case MetadataBlockType.Picture:
						if (this.picBlock?.pictureType !== (<PictureBlock>block).pictureType) this.metaBlocks.push(block);
						break;
					default:
						this.metaBlocks.push(block);
						break;
				}
				if (block.header.isLast) return this.onDone(callback);
			}
			callback(null, Buffer.alloc(0));
		} catch (err) {
			callback(<Error>err);
		}
	}
}
