# flac-stream-tagger

Pure JavaScript FLAC Tag writer and reader.
Improved from `flac-tagger` to have native stream support and better memory handling for large files.

## Installation

```powershell
npm install flac-stream-tagger
```

## Usage

### Read

```ts
import { FlacStreamTagger } from "flac-stream-tagger";
import { createReadStream } from "fs";
import { readFile } from "fs/promises";

// Create read stream from file (can use any readable stream does not have to be a file)
const readStream = createReadStream("input.flac");

// Pipe any Readable stream into tagger
const tagger = readStream.pipe(new FlacStreamTagger());
// or from buffer
const tagger = FlacStreamTagger.fromBuffer(await readFile("input.flac"));
```

### Print Tags

```ts
// Read tags
const tags = await tagger.tags();
console.log(tags);

// Read raw metadata blocks
const blocks = await tagger.metaBlocks();
console.log(blocks);

// read tag by vorbis comment name (case-insensitive)
const { title, artist, album } = tags.tagMap;
// read cover image
const coverBuffer = tags.picture?.buffer;
```

### Write

```ts
import { FlacStreamTagger } from "flac-stream-tagger";
import { readFile } from "fs/promises";

const flacTags: FlacTags = {
	// write vorbis comments (names are case-insensitive)
	tagMap: {
		// single value
		title: "song title",
		// multiple values
		artist: ["artist A", "artist B"],
		album: "album name",
	},
	// (optional) cover image
	picture: {
		buffer: await readFile("coverImage.jpg"),
	},
};

// Some input stream see Read example
const inputStream: Readable;

// Pipe any Readable stream into tagger
const tagger = inputStream.pipe(new FlacStreamTagger(tags));
// or from buffer
const tagger = FlacStreamTagger.fromBuffer(inputBuffer, tags);

// Pipe tagger into any Writable stream
tagger.pipe(createWriteStream("output.flac"));
// or get the buffer
cosnt buffer = await tagger.toBuffer();
```

## Specification

- [FLAC - Format](https://xiph.org/flac/format.html)
- [Ogg Vorbis Documentation](https://www.xiph.org/vorbis/doc/v-comment.html)
