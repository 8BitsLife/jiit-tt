/* the big ascii "TIMETABLE" banner at the top. two jobs: size it so it always
   fits the screen exactly, and do the little decode/scramble effect when the
   splash lifts. */

import { prefersReducedMotion } from "./util.js";

const MAX_FONT_PX = 12;
const SIDE_MARGIN = 0.96; /* leave a bit of air on both sides, 100% looks cramped */

const banner = document.querySelector(".ascii pre");

/* we measure how wide ONE character is, instead of measuring the <pre> itself.
   why: the <pre> is a squished flex item, so its width is already limited by its
   container - if we measured that wed never be able to grow the text back, only
   shrink it forever.

   now the important bit, please dont "clean this up". the probe HAS to be
   position:fixed. i had it absolute at first, and an absolutely positioned
   1100px-wide element gets dumped at the bottom of <body> and makes the page
   taller, which yeets you back to the top of the page. and because phones fire a
   resize event every single time the url bar hides, that showed up as the bug
   where "scrolling down jumps you to the top". took ages to find. fixed = out of
   the layout entirely = no scrollbar, no jump. */
function charWidthRatio(element)
{
  const style = getComputedStyle(element);
  const probe = document.createElement("span");

  probe.style.cssText =
    "position:fixed;top:0;left:-9999px;visibility:hidden;white-space:pre;" +
    `font-size:100px;font-family:${style.fontFamily};font-weight:${style.fontWeight};`;
  probe.textContent = "0".repeat(20);

  document.body.appendChild(probe);
  /* 20 chars at 100px, so divide twice to get the ratio for a single char at 1px */
  const ratio = probe.getBoundingClientRect().width / 20 / 100;
  probe.remove();

  return ratio || 0.6; /* 0.6 is a sane monospace guess if measuring somehow fails */
}

let lastWidth = -1;

/* `force` means "resize even though the width looks the same". needed when the
   FONT changed under us rather than the window - webfont finally loading, phone
   rotating, that sort of thing. */
function fitWordmark(force)
{
  if (!banner)
  {
    return;
  }

  const available = banner.parentElement.clientWidth * SIDE_MARGIN;

  /* same deal as above - phones fire resize when the url bar slides away, and
     thats a HEIGHT change. we only care about width, so ignore it. */
  if (!force && available === lastWidth)
  {
    return;
  }

  lastWidth = available;

  const columns = Math.max(...banner.textContent.split("\n").map(line => line.length));
  const size = Math.min(MAX_FONT_PX, available / (columns * charWidthRatio(banner)));

  banner.style.fontSize = size.toFixed(2) + "px";
}

function watchSize()
{
  /* those () => wrappers are not pointless. hand the listener straight to
     fitWordmark and it receives the Event object as `force`, which is truthy,
     which kills the width check up there and makes it re-measure constantly. */
  window.addEventListener("resize", () => fitWordmark());
  window.addEventListener("orientationchange", () => fitWordmark(true));
  window.addEventListener("load", () => fitWordmark(true));

  fitWordmark(true);

  /* the very first fit happens with the fallback font, so its slightly wrong.
     re-fit once the real mono font lands. the extra delayed passes are for
     browsers that lie and still report the old metrics right when fonts.ready
     resolves, yes really. */
  if (document.fonts && document.fonts.ready)
  {
    document.fonts.ready.then(() =>
    {
      fitWordmark(true);
      setTimeout(() => fitWordmark(true), 80);
    });
  }

  setTimeout(() => fitWordmark(true), 400);

  /* watch the CONTAINER, not the <pre>. if we watched the <pre> then us changing
     its font-size would trigger the observer, which would resize it again, which
     would trigger the observer... you get it. */
  if (window.ResizeObserver)
  {
    const host = document.querySelector(".ascii");

    if (host)
    {
      new ResizeObserver(() => fitWordmark()).observe(host);
    }
  }
}

/* the fun part - every letter flickers through junk characters and then locks in,
   left to right, like its being decoded. plays on load and again if you hover or
   tap the banner. */
const SCRAMBLE_CHARS = "#@$%&/\\|<>=+*-_?!░▒▓";
const SCRAMBLE_INTERVAL_MS = 45;

function startShuffle()
{
  const finalText = banner.textContent;
  const chars = [...finalText];

  /* work out the exact moment each character stops scrambling. its a sweep going
     left to right, each row starting a bit later, plus a random nudge so the edge
     isnt a boring straight diagonal. */
  let column = 0;
  let row = 0;
  let lastReveal = 0;

  const revealAt = chars.map(ch =>
  {
    if (ch === "\n")
    {
      row++;
      column = 0;
      return 0;
    }

    const at = 150 + column * 11 + row * 55 + Math.random() * 120;
    column++;
    lastReveal = Math.max(lastReveal, at);

    return at;
  });

  let playing = false;

  function play()
  {
    /* spam-hovering shouldnt start five copies on top of each other */
    if (playing)
    {
      return;
    }

    playing = true;

    const startedAt = performance.now();
    const frame = chars.slice();
    let lastScramble = 0;

    function tick(now)
    {
      const elapsed = now - startedAt;

      /* we run on every animation frame but only actually change letters every
         45ms - scrambling at full 60fps is too fast to even read as scrambling. */
      if (now - lastScramble > SCRAMBLE_INTERVAL_MS)
      {
        lastScramble = now;

        for (let i = 0; i < chars.length; i++)
        {
          const ch = chars[i];
          /* newlines and spaces never scramble, otherwise the shape of the
             letters turns into a solid block of noise and you lose the wordmark */
          const settled = ch === "\n" || ch === " " || elapsed >= revealAt[i];
          frame[i] = settled ? ch : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }

        banner.textContent = frame.join("");
      }

      if (elapsed < lastReveal + 60)
      {
        requestAnimationFrame(tick);
      }
      else
      {
        /* always slam the real text back at the end, never leave it on whatever
           the last random frame happened to be */
        banner.textContent = finalText;
        playing = false;
      }
    }

    requestAnimationFrame(tick);
  }

  const heading = banner.parentElement;
  heading.addEventListener("mouseenter", play);
  heading.addEventListener("click", play);

  setTimeout(play, 900); /* timed so it decodes right as the splash fades out */
}

export function initWordmark()
{
  if (!banner)
  {
    return;
  }

  watchSize();

  /* sizing is not optional, but the scramble is pure decoration - so if someone
     has asked for less motion they just get the plain banner. */
  if (!prefersReducedMotion())
  {
    startShuffle();
  }
}
