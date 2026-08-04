/* makes favicon.ico. yes the icon is also inline in index.html as an svg data uri,
   and that svg is the nicer one - it scales perfectly. but ios safari and a few
   others just go and ask for /favicon.ico anyway no matter what you put in the
   html, and every one of those was a 404 in the netlify logs.

   so this draws the same mark (dark rounded square, gold serif T) as a proper ico
   file. run it with `npm run favicon` if you ever change the colours.

   why generate it instead of just committing a binary: a mystery .ico in a repo
   is annoying, this way you can actually see what it is and change it. */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drawRgba } from "./icon-art.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* the mark lives in scripts/icon-art.mjs so the favicon and the PWA icons can
   never end up looking like two different apps.

   a BMP inside an ico wants BGRA, bottom row first, which is the opposite of the
   top-down RGBA everything else uses - so flip and swizzle here. */
function drawIcon(size)
{
  const rgba = drawRgba(size);
  const pixels = Buffer.alloc(size * size * 4);

  for (let row = 0; row < size; row++)
  {
    const y = size - 1 - row;

    for (let x = 0; x < size; x++)
    {
      const from = (y * size + x) * 4;
      const to = (row * size + x) * 4;

      pixels[to] = rgba[from + 2];     /* B */
      pixels[to + 1] = rgba[from + 1]; /* G */
      pixels[to + 2] = rgba[from];     /* R */
      pixels[to + 3] = rgba[from + 3]; /* A */
    }
  }

  return pixels;
}

/* an ico is a tiny header, then one BMP per size. the BMP inside an ico is odd in
   two ways: its height is stored DOUBLED, and it carries a 1-bit "AND mask" after
   the pixels. we use the alpha channel instead, so the mask is all zeros - but it
   still has to be there or some readers choke. */
function buildImage(size)
{
  const pixels = drawIcon(size);
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRowBytes * size);

  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);          /* header size */
  header.writeInt32LE(size, 4);         /* width */
  header.writeInt32LE(size * 2, 8);     /* height, doubled on purpose */
  header.writeUInt16LE(1, 12);          /* planes */
  header.writeUInt16LE(32, 14);         /* bits per pixel */
  header.writeUInt32LE(0, 16);          /* no compression */
  header.writeUInt32LE(pixels.length + mask.length, 20);

  return Buffer.concat([header, pixels, mask]);
}

const SIZES = [16, 32];
const images = SIZES.map(buildImage);

const directory = Buffer.alloc(6 + 16 * SIZES.length);
directory.writeUInt16LE(0, 0);             /* reserved */
directory.writeUInt16LE(1, 2);             /* 1 = icon */
directory.writeUInt16LE(SIZES.length, 4);

let offset = directory.length;

SIZES.forEach((size, i) =>
{
  const entry = 6 + i * 16;
  directory.writeUInt8(size, entry);
  directory.writeUInt8(size, entry + 1);
  directory.writeUInt8(0, entry + 2);      /* palette size, 0 for truecolour */
  directory.writeUInt8(0, entry + 3);
  directory.writeUInt16LE(1, entry + 4);   /* planes */
  directory.writeUInt16LE(32, entry + 6);  /* bits per pixel */
  directory.writeUInt32LE(images[i].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
});

const ico = Buffer.concat([directory, ...images]);
writeFileSync(path.join(root, "favicon.ico"), ico);

console.log(`favicon.ico written — ${SIZES.join("px, ")}px, ${ico.length} bytes`);
