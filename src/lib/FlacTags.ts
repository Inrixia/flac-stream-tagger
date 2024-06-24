import { FlacTagMap } from "./createFlacTagMap.js";
import { PictureType } from "../metadata-block/picture.js";

export type FlacPicture = {
	/** Specify the {@link PictureType}
	 * @default PictureType.FrontCover
	 * @see https://xiph.org/flac/format.html#metadata_block_picture
	 */
	pictureType?: PictureType;
	/** MIME type of the image, inferred from buffer by default */
	mime?: string;
	/** Description of the image */
	description?: string;
	/** Color depth of the image in bits-per-pixel
	 * @default 24
	 */
	colorDepth?: number;
	/**
	 * The number of colors used in the image (Only for indexed-color image like GIF)
	 * @default 0
	 */
	colors?: number;
	/** Buffer data of the image */
	buffer: Buffer;
};

/**
 * The FLAC tags interface for read / write.
 */
export interface FlacTags {
	/** FLAC tag map, see {@link FlacTagMap} */
	tagMap?: FlacTagMap;
	/** Cover image definition */
	picture?: FlacPicture;
}
