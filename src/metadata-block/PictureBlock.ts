import imageinfo from "imageinfo";
import { MetadataBlockHeader, MetadataBlockHeaderLength, MetadataBlockType } from "./MetadataBlockHeader.js";
import { MetadataBlock } from "./MetadataBlock.js";
import { allocBufferAndWrite } from "../lib/BufferBase.js";

export enum PictureType {
	Other,
	FileIcon,
	OtherFileIcon,
	FrontCover,
	BackCover,
	LeafletPage,
	Media,
	LeadArtist,
	Artist,
	Conductor,
	Band,
	Composer,
	Lyricist,
	RecordingLocation,
	DuringRecording,
	DuringPerformance,
	MovieScreenCapture,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	ABrightColouredFish,
	Illustration,
	BandLogotype,
	PublisherLogotype,
}
export class PictureBlock extends MetadataBlock<MetadataBlockType.Picture> {
	public header: MetadataBlockHeader<MetadataBlockType.Picture>;
	public pictureType: PictureType;
	public mime: string;
	public description: string;
	public width: number;
	public height: number;
	public colorDepth: number;
	public colors: number;
	public pictureBuffer: Buffer;

	constructor(initialValues: {
		header?: MetadataBlockHeader<MetadataBlockType.Picture>;
		pictureType?: PictureType;
		mime?: string;
		description?: string;
		width?: number;
		height?: number;
		colorDepth?: number;
		colors?: number;
		buffer: Buffer;
	}) {
		super();
		const {
			header = new MetadataBlockHeader(MetadataBlockType.Picture),
			pictureType = PictureType.FrontCover,
			mime,
			description = "",
			width,
			height,
			colorDepth = 24,
			colors = 0,
			buffer,
		} = initialValues;
		this.header = header;
		this.pictureType = pictureType;
		if (mime && width && height) {
			this.mime = mime;
			this.width = width;
			this.height = height;
		} else {
			const info = imageinfo(buffer);
			this.mime = mime ?? info.mimeType;
			this.width = width ?? info.width;
			this.height = height ?? info.height;
		}
		this.description = description;
		this.colorDepth = colorDepth;
		this.colors = colors;
		this.pictureBuffer = buffer;
	}

	static fromBuffer(buffer: Buffer) {
		let bufferIndex = 0;

		const header = MetadataBlockHeader.fromBuffer<MetadataBlockType.Picture>(buffer);
		if (header.type !== MetadataBlockType.Picture) throw new Error(`Invalid picture block header type! Expected type ${MetadataBlockType.Picture} got ${header.type}`);
		bufferIndex += header.length;

		const pictureType = buffer.readUintBE(bufferIndex, 4) as PictureType;
		bufferIndex += 4;

		const mimeLength = buffer.readUintBE(bufferIndex, 4);
		bufferIndex += 4;

		const mime = buffer.subarray(bufferIndex, bufferIndex + mimeLength).toString();
		bufferIndex += mimeLength;

		const descriptionLength = buffer.readUintBE(bufferIndex, 4);
		bufferIndex += 4;

		const description = buffer.subarray(bufferIndex, bufferIndex + descriptionLength).toString();
		bufferIndex += descriptionLength;

		const width = buffer.readUintBE(bufferIndex, 4);
		bufferIndex += 4;

		const height = buffer.readUintBE(bufferIndex, 4);
		bufferIndex += 4;

		const colorDepth = buffer.readUintBE(bufferIndex, 4);
		bufferIndex += 4;

		const colors = buffer.readUintBE(bufferIndex, 4);
		bufferIndex += 4;

		const pictureDataLength = buffer.readUintBE(bufferIndex, 4);
		bufferIndex += 4;

		const pictureBuffer = buffer.subarray(bufferIndex, bufferIndex + pictureDataLength);

		return new PictureBlock({
			header,
			pictureType,
			mime,
			description,
			width,
			height,
			colorDepth,
			colors,
			buffer: pictureBuffer,
		});
	}

	toBuffer() {
		return Buffer.concat([
			this.header.toBuffer(),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(this.pictureType)),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(Buffer.byteLength(this.mime))),
			Buffer.from(this.mime),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(Buffer.byteLength(this.description))),
			Buffer.from(this.description),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(this.width)),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(this.height)),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(this.colorDepth)),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(this.colors)),
			allocBufferAndWrite(4, (b) => b.writeUint32BE(this.pictureBuffer.length)),
			this.pictureBuffer,
		]);
	}

	toPicture() {
		return {
			pictureType: this.pictureType,
			mime: this.mime,
			description: this.description,
			colorDepth: this.colorDepth,
			colors: this.colors,
			buffer: this.pictureBuffer,
		};
	}

	get length() {
		return (
			MetadataBlockHeaderLength +
			4 + // type length
			4 + // mime length
			Buffer.byteLength(this.mime) +
			4 + // description length
			Buffer.byteLength(this.description) +
			4 * 5 + // width, height, color depth, colors, picture data length
			this.pictureBuffer.length
		);
	}
}
