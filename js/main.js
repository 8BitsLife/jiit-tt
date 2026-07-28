/* lol everthing here just computes something

   this is the file the browser actually starts at. it wakes everything up in
   order and then keeps the page honest about what time it is. */

import { initSplash } from "./splash.js";
import { setDay, subscribe } from "./state.js";
import { initTheme } from "./theme.js";
import { canWorkOffline, registerServiceWorker } from "./tools/offline.js";
import { initWordmark } from "./wordmark.js";
import { renderLegend } from "./ui/course-legend.js";
import { renderDayTabs } from "./ui/day-tabs.js";
import { syncPickers } from "./ui/pickers.js";
import { refreshCardStates, renderSchedule } from "./ui/schedule-list.js";
import { renderStatus } from "./ui/status-bar.js";
import { defaultDay, todayIndex } from "./util.js";

import "./tools/index.js"; /* this one has no exports, importing it IS the setup */

const REFRESH_MS = 30000;

/* tapping a different day only needs the class list redrawn. but changing your
   batch or semester or campus changes literally everything below it, so that
   redraws the pills, the course legend and the status line too. */
function render(change)
{
  renderDayTabs();
  renderSchedule();

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
  window.addEventListener("load", registerServiceWorker);
}
