import { Readable, Transform, TransformCallback } from "stream";
import { FlacTags } from "./lib/FlacTags.js";
import { MetadataBlockHeader, MetadataBlockType } from "./metadata-block/header.js";
import { MetadataBlock } from "./metadata-block/index.js";
import { parseBlock } from "./metadata-block/parse.js";
import { PictureBlock } from "./metadata-block/picture.js";
import { VorbisCommentBlock } from "./metadata-block/vorbis-comment.js";

export class FlacStreamTagger extends Transform {
	private index: number = 0;
	private done: boolean = false;
	private headerBuffer: Buffer = Buffer.alloc(0);

	private readonly _metaBlocks: MetadataBlock[] = [];
	private readonly _metaBlocksReady: Promise<void>;
	private _metaBlocksInner?: { res: () => void; rej: (err: Error) => void };
	private picBlock?: PictureBlock;
	private vorbisBlock?: VorbisCommentBlock;

	private readOnly: boolean = true;

	private static readonly StreamMarker = "fLaC";

	public static fromBuffer(buffer: Buffer, flacTags?: FlacTags): FlacStreamTagger {
		const tagger = new FlacStreamTagger(flacTags);
		const readable = new Readable();
		readable.push(buffer);
		// Indicate the end of the stream
		readable.push(null);
		readable.pipe(tagger);
		return tagger;
	}

	public static fromStream(stream: Readable, flacTags?: FlacTags): FlacStreamTagger {
		const tagger = new this(flacTags);
		stream.pipe(tagger);
		return tagger;
	}

	public toBuffer(): Promise<Buffer> {
		if (this.readOnly) throw new Error("Stream is read-only");
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			this.on("data", (chunk) => chunks.push(chunk));
			this.on("end", () => resolve(Buffer.concat(chunks)));
			this.on("error", reject);
		});
	}

	constructor(flacTags: FlacTags = {}) {
		super();
		// If no tags for writing are given, then make stream read-only
		this.readOnly = flacTags === undefined;

		this._metaBlocksReady = new Promise((res, rej) => (this._metaBlocksInner = { res, rej }));

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
			this._metaBlocks.push(this.vorbisBlock);
		}
		if (picture !== undefined) {
			this.picBlock = new PictureBlock(picture);
			this.picBlock.header.isLast = true;
			this.picBlock.header.dataLength = this.picBlock.length - this.picBlock.header.length;
			this._metaBlocks.push(this.picBlock);
		}
	}

	public async tags(): Promise<FlacTags> {
		await this._metaBlocksReady;
		return {
			tagMap: this.vorbisBlock?.toTagMap() ?? undefined,
			picture: this.picBlock?.toPicture() ?? undefined,
		};
	}
	public async metaBlocks(): Promise<MetadataBlock[]> {
		await this._metaBlocksReady;
		return this._metaBlocks;
	}

	private onDone(callback: TransformCallback) {
		this.done = true;
		callback(
			null,
			Buffer.concat([
				Buffer.from(FlacStreamTagger.StreamMarker),
				...this._metaBlocks.map((block, index) => {
					const isLast = index === this._metaBlocks.length - 1;
					block.header.isLast = isLast;
					block.header.dataLength = block.length - block.header.length;
					return block.toBuffer();
				}),
				this.headerBuffer.subarray(this.index),
			])
		);
		this._metaBlocksInner?.res?.();
	}
	_flush(_callback: TransformCallback): void {
		const callback = this.safeCallback(_callback);
		if (!this.done && !this.readOnly) return this.onDone(callback);
		return callback();
	}
	safeCallback(callback: TransformCallback): TransformCallback {
		return (error, data) => {
			if (error) this._metaBlocksInner?.rej?.(error);
			// void data if this.readOnly is true
			if (this.readOnly) return callback(error);
			return callback(error, data);
		};
	}
	_transform(chunk: Buffer, encoding: BufferEncoding, _callback: TransformCallback): void {
		const callback = this.safeCallback(_callback);
		try {
			if (this.done) return callback(null, chunk);

			this.headerBuffer = Buffer.concat([this.headerBuffer, chunk]);

			// Ensure we have enough data to check the marker
			if (this.index === 0) {
				if (this.headerBuffer.length < 4) return callback(new Error(`Invalid stream header, must be at least 4 bytes long got ${this.headerBuffer.length}`));
				const marker = this.headerBuffer.toString("utf8", 0, 4);
				if (marker !== FlacStreamTagger.StreamMarker) return callback(new Error(`Invalid stream header: ${marker}`));
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
						if (this.vorbisBlock === undefined) {
							this._metaBlocks.push(block);
							this.vorbisBlock = <VorbisCommentBlock>block;
						}
						break;
					case MetadataBlockType.Picture:
						if (this.picBlock?.pictureType !== (<PictureBlock>block).pictureType) {
							this._metaBlocks.push(block);
							this.picBlock = <PictureBlock>block;
						}
						break;
					default:
						this._metaBlocks.push(block);
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
