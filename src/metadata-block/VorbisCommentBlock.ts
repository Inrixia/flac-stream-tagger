import { MetadataBlockHeader, MetadataBlockHeaderLength, MetadataBlockType } from "./MetadataBlockHeader.js";
import { MetadataBlock } from "./MetadataBlock.js";
import { allocBufferAndWrite } from "../lib/BufferBase.js";
import { FlacTagMap } from "../lib/FlacTags.js";

export class VorbisCommentBlock extends MetadataBlock<MetadataBlockType.VorbisComment> {
	public header: MetadataBlockHeader<MetadataBlockType.VorbisComment>;
	public vendorString: string;
	public commentList: string[];

	constructor(
		initialValues: {
			header?: MetadataBlockHeader<MetadataBlockType.VorbisComment>;
			vendorString?: string;
			commentList?: string[];
		} = {}
	) {
		super();
		const { header = new MetadataBlockHeader(MetadataBlockType.VorbisComment), vendorString = "", commentList = [] } = initialValues;
		this.header = header;
		this.vendorString = vendorString;
		this.commentList = commentList;
	}

	static fromBuffer(buffer: Buffer) {
		let bufferIndex = 0;

		const header = MetadataBlockHeader.fromBuffer<MetadataBlockType.VorbisComment>(buffer);
		if (header.type !== MetadataBlockType.VorbisComment) throw new Error(`Invalid vorbis comment block header type! Expected type ${MetadataBlockType.VorbisComment} got ${header.type}`);
		bufferIndex += header.length;

		const vendorLength = buffer.readUintLE(bufferIndex, 4);
		bufferIndex += 4;

		const vendorString = buffer.subarray(bufferIndex, bufferIndex + vendorLength).toString();
		bufferIndex += vendorLength;

		const list: string[] = [];
		const listLength = buffer.readUintLE(bufferIndex, 4);
		bufferIndex += 4;

		for (let commentIndex = 0; commentIndex < listLength; commentIndex++) {
			const commentLength = buffer.readUintLE(bufferIndex, 4);
			bufferIndex += 4;

			const comment = buffer.subarray(bufferIndex, bufferIndex + commentLength).toString();
			bufferIndex += commentLength;

			list.push(comment);
		}
		return new VorbisCommentBlock({
			header,
			vendorString,
			commentList: list,
		});
	}

	toBuffer() {
		const commentBuffer = Buffer.alloc(this.commentListLength);
		let commentBufferIndex = 0;
		for (const comment of this.commentList) {
			const length = Buffer.byteLength(comment);
			commentBuffer.writeUintLE(length, commentBufferIndex, 4);
			commentBufferIndex += 4;
			commentBuffer.write(comment, commentBufferIndex);
			commentBufferIndex += length;
		}
		const vendorStringBuffer = Buffer.from(this.vendorString);

		return Buffer.concat([
			this.header.toBuffer(),
			allocBufferAndWrite(4, (b) => b.writeUint32LE(vendorStringBuffer.length)),
			vendorStringBuffer,
			allocBufferAndWrite(4, (b) => b.writeUint32LE(this.commentList.length)),
			commentBuffer,
		]);
	}

	toTagMap() {
		const tagMap = new Proxy<FlacTagMap>(
			{},
			{
				get(target, p, receiver) {
					return Reflect.get(target, p.toString().toUpperCase(), receiver);
				},
				set(target, p, newValue, receiver) {
					return Reflect.set(target, p.toString().toUpperCase(), newValue, receiver);
				},
			}
		);
		for (const it of this.commentList) {
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
		return tagMap;
	}

	get commentListLength() {
		return this.commentList.map((comment) => Buffer.byteLength(comment) + 4).reduce((previous, current) => previous + current, 0);
	}

	get length() {
		return MetadataBlockHeaderLength + 4 + Buffer.byteLength(this.vendorString) + 4 + this.commentListLength;
	}
}
