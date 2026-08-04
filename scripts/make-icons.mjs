/* writes the two PWA icons in icons/, drawn at full size from scripts/icon-art.mjs.
   run it with `npm run icons` if you ever change the colours or the mark.

   there is no image library here on purpose - a png is a signature, three chunks
   and a zlib stream, and node already ships zlib. adding a dependency to draw a
   letter would be daft.

   TWO icons, because android treats them differently:

     icon-512        purpose "any"      - used as-is, keeps our rounded corners
     icon-maskable   purpose "maskable" - android crops it to whatever shape the
                                          launcher uses, so it is full-bleed and
                                          the T is pulled in to survive the crop */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drawRgba } from "./icon-art.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CRC_TABLE = (() =>
{
  const table = new Int32Array(256);

  for (let n = 0; n < 256; n++)
  {
    let c = n;

    for (let k = 0; k < 8; k++)
    {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }

    table[n] = c;
  }

  return table;
})();

function crc32(buffer)
{
  let c = -1;

  for (let i = 0; i < buffer.length; i++)
  {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xFF] ^ (c >>> 8);
  }

  return (c ^ -1) >>> 0;
}

/* every png chunk is length, type, data, then a crc over type+data */
function chunk(type, data)
{
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([length, body, crc]);
}

function png(size, rgba)
{
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);   /* 8 bits per channel */
  ihdr.writeUInt8(6, 9);   /* colour type 6 = RGBA */
  ihdr.writeUInt8(0, 10);  /* deflate */
  ihdr.writeUInt8(0, 11);  /* standard filtering */
  ihdr.writeUInt8(0, 12);  /* not interlaced */

  /* each scanline is prefixed with its filter byte. 0 means "store as is" -
     the image is mostly flat colour, so zlib handles it fine without the
     cleverer filters and this stays easy to read. */
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);

  for (let y = 0; y < size; y++)
  {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* android only guarantees the middle 80% of a maskable icon survives the crop.
   0.62 leaves the T comfortably inside that with room to breathe, rather than
   filling the shape edge to edge like the old icon appeared to. */
const MASKABLE_SCALE = 0.62;

const JOBS = [
  { file: "icons/icon-192.png", size: 192, options: {} },
  { file: "icons/icon-512.png", size: 512, options: {} },
  { file: "icons/icon-maskable-512.png", size: 512, options: { rounded: false, letterScale: MASKABLE_SCALE } },
];

JOBS.forEach(({ file, size, options }) =>
{
  const data = png(size, drawRgba(size, options));
  writeFileSync(path.join(root, file), data);
  console.log(`${file} — ${size}x${size}, ${data.length} bytes`);
});
