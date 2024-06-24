import { MetadataBlock } from "./MetadataBlock.js";
import { MetadataBlockHeader, MetadataBlockType } from "./MetadataBlockHeader.js";

console.log(MetadataBlock);

export class OtherMetadataBlock<T extends MetadataBlockType> extends MetadataBlock<T> {
	constructor(
		public header: MetadataBlockHeader<T>,
		public data: Buffer
	) {
		super();
	}

	static fromBuffer(buffer: Buffer) {
		const header = MetadataBlockHeader.fromBuffer(buffer);
		return new OtherMetadataBlock(header, buffer.subarray(header.length, header.length + header.dataLength));
	}

	toBuffer() {
		return Buffer.concat([this.header.toBuffer(), this.data]);
	}

	get length() {
		return this.header.length + this.data.length;
	}
}
