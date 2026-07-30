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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* same values as --bg and --gold in css/style.css */
const BG = [13, 11, 8];      /* #0D0B08 */
const GOLD = [212, 169, 78]; /* #D4A94E */

/* the T, written in a 32x32 grid and scaled to whatever size we're drawing.
   the little ticks hanging off the bar ends and the foot at the bottom are what
   make it read as a serif T rather than a plain sans one. */
const BAR = [7, 8, 25, 12];
const TICK_LEFT = [7, 12, 9, 14];
const TICK_RIGHT = [23, 12, 25, 14];
const STEM = [14, 12, 18, 23];
const FOOT = [11, 23, 21, 25];
const SHAPES = [BAR, TICK_LEFT, TICK_RIGHT, STEM, FOOT];

/* 4x4 subsamples per pixel. without this the rounded corners and the T edges
   come out jagged, which at 16px looks properly cheap. */
const SUB = 4;

function insideRoundedRect(x, y, size, radius)
{
  const near = Math.min(x, size - x);
  const nearY = Math.min(y, size - y);

  if (near < 0 || nearY < 0)
  {
    return false;
  }

  /* only the corners need the circle test, the rest is a plain rectangle */
  if (near >= radius || nearY >= radius)
  {
    return true;
  }

  const dx = radius - near;
  const dy = radius - nearY;

  return dx * dx + dy * dy <= radius * radius;
}

function insideT(x, y, size)
{
  const scale = size / 32;

  return SHAPES.some(([x0, y0, x1, y1]) =>
    x >= x0 * scale && x < x1 * scale && y >= y0 * scale && y < y1 * scale);
}

/* returns bottom-up BGRA rows, which is the order a BMP wants */
function drawIcon(size)
{
  const radius = 7 * size / 32;
  const pixels = Buffer.alloc(size * size * 4);

  for (let row = 0; row < size; row++)
  {
    /* bottom-up: the last row of the image is written first */
    const y = size - 1 - row;

    for (let x = 0; x < size; x++)
    {
      let background = 0;
      let letter = 0;

      for (let sy = 0; sy < SUB; sy++)
      {
        for (let sx = 0; sx < SUB; sx++)
        {
          const px = x + (sx + 0.5) / SUB;
          const py = y + (sy + 0.5) / SUB;

          if (!insideRoundedRect(px, py, size, radius))
          {
            continue;
          }

          background++;

          if (insideT(px, py, size))
          {
            letter++;
          }
        }
      }

      const total = SUB * SUB;
      const alpha = background / total;
      const offset = (row * size + x) * 4;

      if (alpha === 0)
      {
        continue; /* outside the rounded square, leave it transparent */
      }

      /* how much of the *solid* part of this pixel is the letter */
      const mix = letter / background;
      const colour = BG.map((channel, i) => Math.round(channel + (GOLD[i] - channel) * mix));

      pixels[offset] = colour[2];     /* B */
      pixels[offset + 1] = colour[1]; /* G */
      pixels[offset + 2] = colour[0]; /* R */
      pixels[offset + 3] = Math.round(alpha * 255);
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
