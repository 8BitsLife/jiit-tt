/* makes changing day look like turning a page instead of the contents just
   blinking into something else.

   the old day slides off in the direction you swiped, the new one comes in from
   the opposite edge. short, because this happens constantly and anything slower
   starts to feel like waiting. */

import { byId, prefersReducedMotion } from "../util.js";

/* leaving is deliberately much quicker than arriving. you already know what you
   are leaving, so it only needs to register - the arrival is the bit worth
   watching. */
const LEAVE_MS = 110;
const ENTER_MS = 240;

/* swipe left = go forward a day. the current page therefore exits LEFT and the
   new one arrives FROM the right, same as flicking through photos. */
const CLASSES = {
  forward: { leave: "leave-left", enter: "enter-right" },
  back: { leave: "leave-right", enter: "enter-left" },
};

const ALL = Object.values(CLASSES).flatMap(c => [c.leave, c.enter]);

/* Swipes come faster than the animation finishes. Each run takes a ticket, and a
   callback that finds its ticket is no longer the newest just gives up - the
   newer swipe is already painting the day the user actually wants. */
let ticket = 0;

export function slideSchedule(direction, paint)
{
  const page = byId("dayPage");

  /* no direction means this was not a day change at all (batch, semester,
     campus), so there is no page to turn. */
  if (!page || !direction || prefersReducedMotion())
  {
    paint();
    return;
  }

  const mine = ++ticket;
  const { leave, enter } = direction > 0 ? CLASSES.forward : CLASSES.back;

  page.classList.remove(...ALL);
  /* reading offsetWidth forces the browser to apply that removal now, otherwise
     re-adding the class in the same frame is a no-op and a fast second swipe
     just would not animate. */
  void page.offsetWidth;
  page.classList.add(leave);

  setTimeout(() =>
  {
    if (mine !== ticket)
    {
      return;
    }

    /* the cards are told not to run their own entrance animation — the whole
       page is already moving, and both at once looks frantic. */
    paint({ animateCards: false });

    page.classList.remove(leave);
    void page.offsetWidth;
    page.classList.add(enter);

    setTimeout(() =>
    {
      if (mine === ticket)
      {
        page.classList.remove(enter);
      }
    }, ENTER_MS);
  }, LEAVE_MS);
}
