/* the panels that slide up from the bottom - batch picker, semester picker,
   tools. they all behave identically so they share one controller instead of me
   writing the same open/close logic three times. only one can be open at once. */

import { byId } from "../util.js";

const CLOSE_MS = 240; /* MUST match the .sheet transition in style.css */

const backdrop = byId("sheetBackdrop");

let activeSheet = null;
let lastTrigger = null;

/* `fill` is called BEFORE we show it, on purpose. that way the sheet slides up
   already full of content, instead of sliding up empty and then popping. */
export function openSheet(element, trigger, fill)
{
  fill();

  lastTrigger = trigger;
  activeSheet = element;
  element.hidden = false;
  backdrop.hidden = false;

  /* one frame gap so the browser paints it in the closed position first,
     otherwise theres nothing to animate FROM and it just appears */
  requestAnimationFrame(() =>
  {
    element.classList.add("open");
    backdrop.classList.add("open");
  });

  const selected = element.querySelector(".active");

  if (selected)
  {
    selected.focus();
  }
}

export function closeSheet()
{
  if (!activeSheet)
  {
    return;
  }

  const element = activeSheet;
  activeSheet = null;
  element.classList.remove("open");
  backdrop.classList.remove("open");

  /* it has to stay in the dom until the slide-down finishes, THEN go properly
     hidden. if we hid it instantly youd see it vanish with no animation, and if
     we never hid it, screen readers and tab-key would still find the buttons
     inside a sheet thats not even on screen. */
  setTimeout(() =>
  {
    element.hidden = true;
    backdrop.hidden = true;
  }, CLOSE_MS);

  /* put focus back on whatever opened this, so keyboard users dont get dumped at
     the top of the page */
  if (lastTrigger)
  {
    lastTrigger.focus();
  }
}

backdrop.addEventListener("click", closeSheet);

document.addEventListener("keydown", event =>
{
  if (event.key === "Escape" && activeSheet)
  {
    closeSheet();
  }
});
