import { createHash } from "node:crypto";
import sharp from "sharp";

export const IMAGE_SANITIZER_VERSION = 2;
export const MAX_IMAGE_DIMENSION = 12_000;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_FRAMES = 500;
export const MAX_ANIMATION_PIXELS = 80_000_000;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const JPEG_STANDALONE_MARKERS = new Set([
  0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9,
]);
const PNG_PRIVATE_METADATA = new Set([
  "eXIf",
  "iCCP",
  "iTXt",
  "tEXt",
  "tIME",
  "zTXt",
]);
const PNG_PUBLICATION_CHUNKS = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "cHRM",
  "gAMA",
  "sRGB",
  "bKGD",
  "pHYs",
  "sBIT",
  "hIST",
  "cICP",
  "mDCV",
  "cLLI",
  "acTL",
  "fcTL",
  "fdAT",
]);
const WEBP_PUBLICATION_CHUNKS = new Set([
  "VP8X",
  "ALPH",
  "VP8 ",
  "VP8L",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertDimensions(width, height) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error("Image dimensions are invalid.");
  }
  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new Error(
      `Image dimensions exceed the ${MAX_IMAGE_DIMENSION}px or ${MAX_IMAGE_PIXELS}-pixel publication limit.`,
    );
  }
}

function requireRange(bytes, start, length, label) {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(length) ||
    start < 0 ||
    length < 0 ||
    start + length > bytes.length
  ) {
    throw new Error(`${label} is truncated.`);
  }
}

function sanitizePng(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("PNG structure is invalid.");
  }
  const output = [bytes.subarray(0, 8)];
  const removedMetadata = [];
  let width;
  let height;
  let offset = 8;
  let chunkCount = 0;
  let frameCount = 0;
  let framePixels = 0;
  let declaredFrameCount;
  let sawEnd = false;

  while (offset < bytes.length) {
    if (++chunkCount > 10_000) throw new Error("PNG has too many chunks.");
    requireRange(bytes, offset, 12, "PNG chunk");
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    requireRange(bytes, offset, 12 + length, "PNG chunk");
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    if (!/^[A-Za-z]{4}$/.test(type)) {
      throw new Error("PNG chunk type is invalid.");
    }
    if (chunkCount === 1 && type !== "IHDR") {
      throw new Error("PNG does not begin with IHDR.");
    }
    if (type === "IHDR") {
      if (length !== 13 || width !== undefined) {
        throw new Error("PNG IHDR is invalid.");
      }
      width = bytes.readUInt32BE(offset + 8);
      height = bytes.readUInt32BE(offset + 12);
    }
    if (type === "acTL") {
      if (length !== 8) throw new Error("PNG animation control is invalid.");
      if (declaredFrameCount !== undefined) {
        throw new Error("PNG repeats its animation control.");
      }
      declaredFrameCount = bytes.readUInt32BE(offset + 8);
      if (declaredFrameCount < 1 || declaredFrameCount > MAX_IMAGE_FRAMES) {
        throw new Error("PNG has too many animation frames.");
      }
    }
    if (type === "fcTL") {
      if (length !== 26) throw new Error("PNG frame control is invalid.");
      if (++frameCount > MAX_IMAGE_FRAMES) {
        throw new Error("PNG has too many animation frames.");
      }
      const frameWidth = bytes.readUInt32BE(offset + 12);
      const frameHeight = bytes.readUInt32BE(offset + 16);
      assertDimensions(frameWidth, frameHeight);
      framePixels += frameWidth * frameHeight;
      if (framePixels > MAX_ANIMATION_PIXELS) {
        throw new Error("PNG animation exceeds the decoded-pixel limit.");
      }
    }
    if (PNG_PRIVATE_METADATA.has(type) || !PNG_PUBLICATION_CHUNKS.has(type)) {
      removedMetadata.push(`png:${type}`);
    } else {
      output.push(bytes.subarray(offset, end));
    }
    offset = end;
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }
  if (!sawEnd || width === undefined || height === undefined) {
    throw new Error("PNG is missing required structure.");
  }
  if (
    declaredFrameCount !== undefined &&
    declaredFrameCount !== frameCount
  ) {
    throw new Error("PNG animation frame count is inconsistent.");
  }
  assertDimensions(width, height);
  return {
    bytes: Buffer.concat(output),
    width,
    height,
    removedMetadata,
  };
}

function isPrivateJpegMarker(marker) {
  return (
    marker === 0xe1 ||
    marker === 0xe2 ||
    marker === 0xed ||
    marker === 0xfe ||
    (marker >= 0xe3 && marker <= 0xec) ||
    marker === 0xef
  );
}

function sanitizeJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("JPEG structure is invalid.");
  }
  const output = [];
  const removedMetadata = [];
  let width;
  let height;
  let offset = 0;
  let markerCount = 0;
  let sawEnd = false;

  while (offset < bytes.length) {
    if (++markerCount > 100_000) throw new Error("JPEG has too many markers.");
    if (bytes[offset] !== 0xff) {
      throw new Error("JPEG marker structure is invalid.");
    }
    const markerStart = offset;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    requireRange(bytes, offset, 1, "JPEG marker");
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0x00) throw new Error("JPEG contains an invalid marker.");

    if (JPEG_STANDALONE_MARKERS.has(marker)) {
      output.push(bytes.subarray(markerStart, offset));
      if (marker === 0xd9) {
        sawEnd = true;
        break;
      }
      continue;
    }

    requireRange(bytes, offset, 2, "JPEG segment");
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2) throw new Error("JPEG segment length is invalid.");
    const segmentEnd = offset + segmentLength;
    requireRange(bytes, offset, segmentLength, "JPEG segment");

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 8) throw new Error("JPEG frame header is invalid.");
      height = bytes.readUInt16BE(offset + 3);
      width = bytes.readUInt16BE(offset + 5);
    }

    if (isPrivateJpegMarker(marker)) {
      removedMetadata.push(`jpeg:0x${marker.toString(16).padStart(2, "0")}`);
    } else {
      output.push(bytes.subarray(markerStart, segmentEnd));
    }
    offset = segmentEnd;

    if (marker === 0xda) {
      const scanStart = offset;
      let scanOffset = offset;
      let foundMarker = false;
      while (scanOffset + 1 < bytes.length) {
        if (bytes[scanOffset] !== 0xff) {
          scanOffset += 1;
          continue;
        }
        let markerOffset = scanOffset + 1;
        while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) {
          markerOffset += 1;
        }
        requireRange(bytes, markerOffset, 1, "JPEG scan");
        const scanMarker = bytes[markerOffset];
        if (
          scanMarker === 0x00 ||
          (scanMarker >= 0xd0 && scanMarker <= 0xd7)
        ) {
          scanOffset = markerOffset + 1;
          continue;
        }
        output.push(bytes.subarray(scanStart, scanOffset));
        offset = scanOffset;
        foundMarker = true;
        break;
      }
      if (!foundMarker) throw new Error("JPEG scan is missing an end marker.");
    }
  }
  if (!sawEnd || width === undefined || height === undefined) {
    throw new Error("JPEG is missing required frame structure.");
  }
  assertDimensions(width, height);
  return {
    bytes: Buffer.concat(output),
    width,
    height,
    removedMetadata,
  };
}

function gifSubBlocksEnd(bytes, start) {
  let offset = start;
  let blocks = 0;
  while (true) {
    if (++blocks > 100_000) throw new Error("GIF has too many data blocks.");
    requireRange(bytes, offset, 1, "GIF data block");
    const length = bytes[offset];
    offset += 1;
    if (length === 0) return offset;
    requireRange(bytes, offset, length, "GIF data block");
    offset += length;
  }
}

function sanitizeGif(bytes) {
  const signature = bytes.subarray(0, 6).toString("ascii");
  if (
    bytes.length < 14 ||
    (signature !== "GIF87a" && signature !== "GIF89a")
  ) {
    throw new Error("GIF structure is invalid.");
  }
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  assertDimensions(width, height);
  const globalTableBytes =
    bytes[10] & 0x80 ? 3 * 2 ** ((bytes[10] & 0x07) + 1) : 0;
  const headerEnd = 13 + globalTableBytes;
  requireRange(bytes, 0, headerEnd, "GIF global color table");

  const output = [bytes.subarray(0, headerEnd)];
  const removedMetadata = [];
  let offset = headerEnd;
  let blockCount = 0;
  let frameCount = 0;
  let framePixels = 0;
  let sawTrailer = false;

  while (offset < bytes.length) {
    if (++blockCount > 100_000) throw new Error("GIF has too many blocks.");
    const start = offset;
    const introducer = bytes[offset];
    offset += 1;
    if (introducer === 0x3b) {
      output.push(bytes.subarray(start, offset));
      sawTrailer = true;
      break;
    }
    if (introducer === 0x2c) {
      if (++frameCount > MAX_IMAGE_FRAMES) {
        throw new Error("GIF has too many animation frames.");
      }
      requireRange(bytes, offset, 9, "GIF image descriptor");
      const frameLeft = bytes.readUInt16LE(offset);
      const frameTop = bytes.readUInt16LE(offset + 2);
      const frameWidth = bytes.readUInt16LE(offset + 4);
      const frameHeight = bytes.readUInt16LE(offset + 6);
      assertDimensions(frameWidth, frameHeight);
      framePixels += frameWidth * frameHeight;
      if (framePixels > MAX_ANIMATION_PIXELS) {
        throw new Error("GIF animation exceeds the decoded-pixel limit.");
      }
      if (
        frameLeft + frameWidth > width ||
        frameTop + frameHeight > height
      ) {
        throw new Error("GIF frame exceeds its logical screen.");
      }
      const localFlags = bytes[offset + 8];
      offset += 9;
      if (localFlags & 0x80) {
        const localTableBytes = 3 * 2 ** ((localFlags & 0x07) + 1);
        requireRange(bytes, offset, localTableBytes, "GIF local color table");
        offset += localTableBytes;
      }
      requireRange(bytes, offset, 1, "GIF LZW code size");
      offset += 1;
      offset = gifSubBlocksEnd(bytes, offset);
      output.push(bytes.subarray(start, offset));
      continue;
    }
    if (introducer !== 0x21) throw new Error("GIF block type is invalid.");

    requireRange(bytes, offset, 2, "GIF extension");
    const label = bytes[offset];
    offset += 1;
    const firstBlockLength = bytes[offset];
    offset += 1;
    requireRange(bytes, offset, firstBlockLength, "GIF extension header");
    const header = bytes.subarray(offset, offset + firstBlockLength);
    offset += firstBlockLength;
    const subBlocksStart = offset;
    offset = gifSubBlocksEnd(bytes, offset);

    const applicationId = header.toString("ascii");
    const isCanonicalGraphicsControl =
      label === 0xf9 &&
      firstBlockLength === 4 &&
      offset === subBlocksStart + 1 &&
      bytes[subBlocksStart] === 0;
    const isCanonicalLoopControl =
      label === 0xff &&
      firstBlockLength === 11 &&
      (applicationId === "NETSCAPE2.0" ||
        applicationId === "ANIMEXTS1.0") &&
      offset === subBlocksStart + 5 &&
      bytes[subBlocksStart] === 3 &&
      bytes[subBlocksStart + 1] === 1 &&
      bytes[subBlocksStart + 4] === 0;
    if (label === 0xf9 && !isCanonicalGraphicsControl) {
      throw new Error("GIF graphics control extension is invalid.");
    }
    const preserve = isCanonicalGraphicsControl || isCanonicalLoopControl;
    if (preserve) {
      output.push(bytes.subarray(start, offset));
    } else {
      removedMetadata.push(`gif:0x${label.toString(16).padStart(2, "0")}`);
    }
  }
  if (!sawTrailer) throw new Error("GIF is missing its trailer.");
  return {
    bytes: Buffer.concat(output),
    width,
    height,
    removedMetadata,
  };
}

function readUInt24LE(bytes, offset) {
  requireRange(bytes, offset, 3, "WebP dimension");
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function webpChunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, "ascii");
  header.writeUInt32LE(data.length, 4);
  return data.length % 2
    ? Buffer.concat([header, data, Buffer.from([0])])
    : Buffer.concat([header, data]);
}

function dimensionsFromWebpChunk(type, data) {
  if (type === "VP8X") {
    if (data.length < 10) throw new Error("WebP VP8X header is invalid.");
    return {
      width: readUInt24LE(data, 4) + 1,
      height: readUInt24LE(data, 7) + 1,
    };
  }
  if (type === "VP8 ") {
    if (
      data.length < 10 ||
      data[3] !== 0x9d ||
      data[4] !== 0x01 ||
      data[5] !== 0x2a
    ) {
      throw new Error("WebP VP8 frame header is invalid.");
    }
    return {
      width: data.readUInt16LE(6) & 0x3fff,
      height: data.readUInt16LE(8) & 0x3fff,
    };
  }
  if (type === "VP8L") {
    if (data.length < 5 || data[0] !== 0x2f) {
      throw new Error("WebP VP8L frame header is invalid.");
    }
    return {
      width: 1 + data[1] + ((data[2] & 0x3f) << 8),
      height:
        1 +
        (data[2] >> 6) +
        (data[3] << 2) +
        ((data[4] & 0x0f) << 10),
    };
  }
  return null;
}

function sanitizeWebp(bytes) {
  if (
    bytes.length < 20 ||
    bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
    bytes.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    throw new Error("WebP structure is invalid.");
  }
  const declaredEnd = 8 + bytes.readUInt32LE(4);
  if (declaredEnd > bytes.length || declaredEnd < 20) {
    throw new Error("WebP RIFF length is invalid.");
  }

  const chunks = [];
  const removedMetadata = [];
  let dimensions = null;
  let sawImageFrame = false;
  let offset = 12;
  let chunkCount = 0;
  while (offset < declaredEnd) {
    if (++chunkCount > 100_000) throw new Error("WebP has too many chunks.");
    requireRange(bytes, offset, 8, "WebP chunk");
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    const length = bytes.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    requireRange(bytes, dataStart, length, "WebP chunk");
    let data = Buffer.from(bytes.subarray(dataStart, dataStart + length));
    const chunkDimensions = dimensionsFromWebpChunk(type, data);
    if (chunkDimensions) {
      assertDimensions(chunkDimensions.width, chunkDimensions.height);
      if (
        dimensions &&
        (dimensions.width !== chunkDimensions.width ||
          dimensions.height !== chunkDimensions.height)
      ) {
        throw new Error("WebP frame dimensions do not match its canvas.");
      }
      dimensions = dimensions ?? chunkDimensions;
      if (type === "VP8 " || type === "VP8L") {
        if (sawImageFrame) {
          throw new Error("WebP contains multiple static image frames.");
        }
        sawImageFrame = true;
      }
    }
    if (
      type === "ANIM" ||
      type === "ANMF" ||
      (type === "VP8X" && data.length >= 1 && (data[0] & 0x02) !== 0)
    ) {
      throw new Error(
        "Animated WebP is not supported for privacy-safe publication.",
      );
    }
    if (!WEBP_PUBLICATION_CHUNKS.has(type)) {
      removedMetadata.push(`webp:${type.trim()}`);
    } else {
      if (type === "VP8X" && data.length >= 1) {
        data[0] &= ~0x2c;
      }
      chunks.push(webpChunk(type, data));
    }
    offset = dataStart + length + (length % 2);
  }
  if (!dimensions || !sawImageFrame) {
    throw new Error("WebP is missing an image frame.");
  }
  assertDimensions(dimensions.width, dimensions.height);
  const body = Buffer.concat([Buffer.from("WEBP", "ascii"), ...chunks]);
  const header = Buffer.alloc(8);
  header.write("RIFF", 0, 4, "ascii");
  header.writeUInt32LE(body.length, 4);
  return {
    bytes: Buffer.concat([header, body]),
    ...dimensions,
    removedMetadata,
  };
}

function sanitizeContainer(source, mediaType) {
  if (mediaType === "image/jpeg") return sanitizeJpeg(source);
  if (mediaType === "image/png") return sanitizePng(source);
  if (mediaType === "image/gif") return sanitizeGif(source);
  if (mediaType === "image/webp") return sanitizeWebp(source);
  throw new Error("Unsupported publication image type.");
}

function sharpFormatForMediaType(mediaType) {
  if (mediaType === "image/jpeg") return "jpeg";
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/gif") return "gif";
  if (mediaType === "image/webp") return "webp";
  return null;
}

function assertDecodedImage(metadata, mediaType, structural) {
  const expectedFormat = sharpFormatForMediaType(mediaType);
  const decodedHeight = metadata.pageHeight ?? metadata.height;
  if (
    metadata.format !== expectedFormat ||
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(decodedHeight) ||
    metadata.width !== structural.width ||
    decodedHeight !== structural.height
  ) {
    throw new Error("Decoded image metadata does not match its container.");
  }
  const pages = metadata.pages ?? 1;
  if (
    !Number.isSafeInteger(pages) ||
    pages < 1 ||
    pages > MAX_IMAGE_FRAMES
  ) {
    throw new Error("Decoded image has too many animation frames.");
  }
  assertDimensions(metadata.width, decodedHeight);
  if (metadata.width * decodedHeight * pages > MAX_ANIMATION_PIXELS) {
    throw new Error("Decoded animation exceeds the decoded-pixel limit.");
  }
}

function configureEncoder(pipeline, mediaType) {
  const oriented = pipeline.rotate().toColorspace("srgb");
  if (mediaType === "image/jpeg") {
    return oriented.jpeg({
      quality: 92,
      chromaSubsampling: "4:4:4",
      mozjpeg: true,
    });
  }
  if (mediaType === "image/png") {
    return oriented.png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    });
  }
  if (mediaType === "image/gif") {
    return oriented.gif({
      effort: 7,
      progressive: false,
      reuse: true,
    });
  }
  if (mediaType === "image/webp") {
    return oriented.webp({
      quality: 92,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true,
    });
  }
  throw new Error("Unsupported publication image type.");
}

export async function sanitizeImageForPublication(rawBytes, mediaType) {
  const source = Buffer.from(rawBytes);
  const structural = sanitizeContainer(source, mediaType);
  const decoder = sharp(source, {
    animated: true,
    failOn: "warning",
    limitInputPixels: MAX_ANIMATION_PIXELS,
    sequentialRead: true,
    unlimited: false,
  });
  const metadata = await decoder.metadata();
  assertDecodedImage(metadata, mediaType, structural);
  const encoded = await configureEncoder(decoder, mediaType).toBuffer();
  const sanitized = sanitizeContainer(encoded, mediaType);

  const sourceSha256 = sha256(source);
  const publishedSha256 = sha256(sanitized.bytes);
  return {
    bytes: sanitized.bytes,
    width: sanitized.width,
    height: sanitized.height,
    sourceSha256,
    publishedSha256,
    transform: {
      name: "privacy-metadata-strip",
      version: IMAGE_SANITIZER_VERSION,
      sourceBytes: source.length,
      publishedBytes: sanitized.bytes.length,
      width: sanitized.width,
      height: sanitized.height,
      removedMetadata: [
        "reencode:all-container-metadata",
        ...new Set([
          ...structural.removedMetadata,
          ...sanitized.removedMetadata,
        ]),
      ],
    },
  };
}
