import { BufferBase } from "../lib/BufferBase.js";
import { MetadataBlockHeader, MetadataBlockType } from "./MetadataBlockHeader.js";
export abstract class MetadataBlock<T extends MetadataBlockType = MetadataBlockType> extends BufferBase {
	abstract header: MetadataBlockHeader<T>;
}
