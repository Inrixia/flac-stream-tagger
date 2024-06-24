import { BufferBase, allocBufferAndWrite } from "../lib/BufferBase.js";

export enum MetadataBlockType {
	StreamInfo = 0,
	Padding,
	Application,
	SeekTable,
	VorbisComment,
	CueSheet,
	Picture,
	Invalid = 127,
}
export const MetadataBlockHeaderLength = 4;
export class MetadataBlockHeader<T extends MetadataBlockType> extends BufferBase {
	constructor(
		public type: T,
		public dataLength: number = 0,
		public isLast: boolean = false
	) {
		super();
		this.isLast = isLast;
		this.type = type;
		this.dataLength = dataLength;
	}

	public static readonly SIZE = 4;
	static fromBuffer<T extends MetadataBlockType>(buffer: Buffer, offset?: number) {
		const lastAndType = buffer.readUint8(offset);
		return new MetadataBlockHeader<T>((lastAndType & 0b01111111) as T, buffer.readUintBE(1, 3), (lastAndType & 0b10000000) === 1);
	}

	toBuffer() {
		return allocBufferAndWrite(this.length, (buffer) => {
			buffer.writeUint8(this.type + (this.isLast ? 0b10000000 : 0));
			buffer.writeUintBE(this.dataLength, 1, 3);
		});
	}

	get length() {
		return MetadataBlockHeaderLength;
	}
}
