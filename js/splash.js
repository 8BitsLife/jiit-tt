/* the loading screen you see for a second when the site opens. it sticks around
   just long enough to be read, then leaves - and importantly it leaves whether or
   not the page actually finished loading. nobody should ever be stuck staring at
   a splash because one font didnt turn up. */

import { byId } from "./util.js";

const MIN_VISIBLE_MS = 750;  /* below this it just flickers and looks like a bug */
const HARD_CAP_MS = 2500;    /* the "ok im leaving anyway" timer */
const FADE_MS = 500;         /* MUST match the .splash transition in style.css */

export function initSplash()
{
  const splash = byId("splash");

  if (!splash)
  {
    return;
  }

  const shownAt = performance.now();

  const dismiss = () =>
  {
    /* both timers below can fire, so bail if its already gone. */
    if (!splash.isConnected)
    {
      return;
    }

    splash.classList.add("done");
    setTimeout(() => splash.remove(), FADE_MS);
  };

  /* if the page loaded crazy fast we still hold the splash for the minimum, so it
     doesnt just blink at you. */
  const dismissWhenRead = () =>
    setTimeout(dismiss, Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt)));

  if (document.readyState === "complete")
  {
    dismissWhenRead();
  }
  else
  {
    window.addEventListener("load", dismissWhenRead);
  }

  /* and this is the escape hatch. campus wifi being campus wifi, something is
     eventually not going to load, and youre getting your timetable regardless. */
  setTimeout(dismiss, HARD_CAP_MS);
}
