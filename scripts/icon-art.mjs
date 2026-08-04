/* the app mark - dark rounded square, gold serif T - described as numbers rather
   than kept as a picture. everything that needs the icon (favicon.ico, the two
   PWA pngs) draws from this one file, so the mark can never drift between them.

   drawing it instead of scaling a source image is the whole point: every size
   comes out with real detail at that size. the 512px png that shipped before this
   was a ~32px image blown up, which is exactly why the installed app opened on a
   blurry splash. */

/* same values as --bg and --gold in css/style.css */
export const BG = [13, 11, 8];      /* #0D0B08 */
export const GOLD = [212, 169, 78]; /* #D4A94E */

/* the T, written in a 32x32 grid and scaled to whatever size we're drawing.
   the little ticks hanging off the bar ends and the foot at the bottom are what
   make it read as a serif T rather than a plain sans one. */
const BAR = [7, 8, 25, 12];
const TICK_LEFT = [7, 12, 9, 14];
const TICK_RIGHT = [23, 12, 25, 14];
const STEM = [14, 12, 18, 23];
const FOOT = [11, 23, 21, 25];
const SHAPES = [BAR, TICK_LEFT, TICK_RIGHT, STEM, FOOT];

/* the middle of the letter, not the middle of the canvas - the T sits a shade low
   in the grid, and scaling about the wrong point makes it drift off centre. */
const CX = 16;
const CY = 16.5;

/* 4x4 subsamples per pixel. without this the rounded corners and the T edges come
   out jagged, which at 16px looks properly cheap. */
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

function insideT(x, y, size, letterScale)
{
  const gx = (x / size) * 32;
  const gy = (y / size) * 32;

  /* undo the scaling on the sample point rather than scaling every shape */
  const u = (gx - CX) / letterScale + CX;
  const v = (gy - CY) / letterScale + CY;

  return SHAPES.some(([x0, y0, x1, y1]) => u >= x0 && u < x1 && v >= y0 && v < y1);
}

/* top-down RGBA, which is the order a png wants.

   `rounded` off gives a full-bleed square: android applies its OWN shape to a
   maskable icon, and baking our corners in as well is what makes the mark look
   cropped and zoomed on the launcher.

   `letterScale` shrinks the T about its own centre, to keep it inside the safe
   zone a maskable icon is allowed to use. */
export function drawRgba(size, { rounded = true, letterScale = 1 } = {})
{
  const radius = 7 * size / 32;
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++)
  {
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

          if (rounded && !insideRoundedRect(px, py, size, radius))
          {
            continue;
          }

          background++;

          if (insideT(px, py, size, letterScale))
          {
            letter++;
          }
        }
      }

      const offset = (y * size + x) * 4;

      if (background === 0)
      {
        continue; /* outside the rounded square, leave it transparent */
      }

      /* how much of the *solid* part of this pixel is the letter */
      const mix = letter / background;
      const colour = BG.map((channel, i) => Math.round(channel + (GOLD[i] - channel) * mix));

      pixels[offset] = colour[0];
      pixels[offset + 1] = colour[1];
      pixels[offset + 2] = colour[2];
      pixels[offset + 3] = Math.round((background / (SUB * SUB)) * 255);
    }
  }

  return pixels;
}
