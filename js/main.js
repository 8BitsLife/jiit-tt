/* lol everthing here just computes something

   this is the file the browser actually starts at. it wakes everything up in
   order and then keeps the page honest about what time it is. */

import { initSplash } from "./splash.js";
import { selection, setDay, subscribe } from "./state.js";
import { initTheme } from "./theme.js";
import { canWorkOffline, initInstallPrompt, registerServiceWorker, reloadOnUpdate } from "./tools/offline.js";
import { initWordmark } from "./wordmark.js";
import { renderLegend } from "./ui/course-legend.js";
import { renderDayTabs } from "./ui/day-tabs.js";
import { syncPickers } from "./ui/pickers.js";
import { refreshCardStates, renderSchedule } from "./ui/schedule-list.js";
import { renderStatus } from "./ui/status-bar.js";
import { initSwipe } from "./ui/swipe.js";
import { initVersion } from "./ui/version.js";
import { slideSchedule } from "./ui/day-slide.js";
import { defaultDay, todayIndex } from "./util.js";

import { DAY_NAMES } from "./config.js";

import "./tools/index.js"; /* this one has no exports, importing it IS the setup */

const REFRESH_MS = 30000;

/* tapping a different day only needs the class list redrawn. but changing your
   batch or semester or campus changes literally everything below it, so that
   redraws the pills, the course legend and the status line too. */
/* which day we were on last time, so a day change knows which way the page
   should travel. forwards is +1, backwards is -1, and anything that is not a
   day change is 0 - no page turn, just redraw. */
let shownDay = selection.day;

function render(change)
{
  let direction = 0;
  if (change === "day")
  {
    const maxIdx = DAY_NAMES.length - 1;
    if (shownDay === maxIdx && selection.day === 0)
    {
      direction = 1;
    }
    else if (shownDay === 0 && selection.day === maxIdx)
    {
      direction = -1;
    }
    else
    {
      direction = Math.sign(selection.day - shownDay);
    }
  }
  shownDay = selection.day;

  /* the tabs update immediately rather than waiting for the slide, so the day
     you picked lights up the instant you touch it */
  renderDayTabs();
  slideSchedule(direction, renderSchedule);

  if (change !== "day")
  {
    syncPickers();
    renderLegend();
    renderStatus();
  }
}

/* every 30s we update whats "now" WITHOUT rebuilding the dom. if we redrew the
   whole thing youd watch all the cards slide in from the side twice a minute,
   which looks broken. the one time we do rebuild is if you left the tab open past
   midnight, because then its genuinely a different day. */
let lastDay = todayIndex();

function tick()
{
  const today = todayIndex();

  if (today === lastDay)
  {
    refreshCardStates();
  }
  else
  {
    lastDay = today;
    setDay(defaultDay()); /* midnight rolled over, jump the view to the new today */
  }

  renderStatus();
}

subscribe(render);

initTheme();
initWordmark();
initSplash();
initSwipe();
initVersion();
initInstallPrompt();
render("selection");

setInterval(tick, REFRESH_MS);

/* coming back to the tab after a while shouldnt show you a stale "now" for up to
   30 seconds, so we catch up the moment youre looking again. */
document.addEventListener("visibilitychange", () =>
{
  if (!document.hidden)
  {
    tick();
  }
});

/* the offline thing. the worker grabs the html network-first, so pushing a fix
   still reaches people on their next online visit instead of them being stuck on
   an old cached copy foreverrrr */
if (canWorkOffline())
{
  /* the watcher goes on FIRST. registering can hand control over almost
     immediately, and if nobody is listening yet the page sits there running the
     old code until the next visit. */
  reloadOnUpdate();
  window.addEventListener("load", registerServiceWorker);
}
