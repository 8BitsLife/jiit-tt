/* swipe left/right anywhere on the schedule to move a day. the day tabs are
   still there and still work - this is just the shortcut your thumb wants when
   youre holding the phone one handed. */

import { DAY_NAMES } from "../config.js";
import { selection, setDay } from "../state.js";

/* how far a finger has to travel before we call it a swipe. too small and every
   slightly-wonky scroll flicks the day; too big and it feels broken. */
const MIN_DISTANCE = 55;

/* it also has to be clearly MORE sideways than up-down. without this you change
   day every time you scroll the page at a slight angle, which is maddening. */
const DIRECTION_RATIO = 1.6;

/* a slow drag is someone scrolling and changing their mind, not a swipe */
const MAX_DURATION = 700;

export function initSwipe()
{
  const surface = document.querySelector("main");

  if (!surface)
  {
    return;
  }

  let startX = 0;
  let startY = 0;
  let startedAt = 0;
  let tracking = false;

  /* passive:true tells the browser we will never preventDefault, so it does not
     have to wait for us before scrolling. keeps scrolling smooth. */
  surface.addEventListener("touchstart", event =>
  {
    /* two fingers means a pinch/zoom, leave it completely alone */
    if (event.touches.length !== 1)
    {
      tracking = false;
      return;
    }

    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startedAt = performance.now();
    tracking = true;
  }, { passive: true });

  surface.addEventListener("touchend", event =>
  {
    if (!tracking)
    {
      return;
    }

    tracking = false;

    const touch = event.changedTouches[0];

    if (!touch)
    {
      return;
    }

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (performance.now() - startedAt > MAX_DURATION) { return; }
    if (Math.abs(dx) < MIN_DISTANCE) { return; }
    if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) { return; }

    /* swiping left drags the page leftwards, which reveals the NEXT day —
       same direction as flicking through photos. */
    const next = selection.day + (dx < 0 ? 1 : -1);

    /* deliberately clamped rather than wrapped. jumping from Saturday back to
       Monday with no visual cue just reads as a bug. */
    if (next < 0 || next >= DAY_NAMES.length)
    {
      return;
    }

    setDay(next);
  }, { passive: true });
}
