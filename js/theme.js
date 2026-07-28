/* dark/light switching, and yes the pixel monkey who climbs down to pull the
   light on. thats the whole reason this file is longer than it should be and i
   regret nothing.

   the theme itself is already applied by that tiny inline script in index.html
   before the first paint, so you never see a white flash. everything after that
   moment is this file. */

import { STORAGE } from "./config.js";
import { byId, prefersReducedMotion } from "./util.js";

/* the timings of the little show, counted from when the rig starts coming down.
   change these and the monkey gets out of sync with the light, so change them
   together. */
const FLIP_MS = 750;   /* monkey reaches the bulb, theme actually flips here */
const CLIMB_MS = 1750; /* he starts heading back up */
const DONE_MS = 2500;  /* hes gone, safe to hide the whole rig */

const THEME_COLORS = { light: "#F5F0E6", dark: "#0D0B08" };

const button = byId("themeBtn");
const sunIcon = byId("iconSun");
const moonIcon = byId("iconMoon");
const rig = byId("bulbRig");
const bulb = byId("bulbSvg");
const themeColor = document.querySelector('meta[name="theme-color"]');

let theme = read();
let animating = false;

/* localStorage straight up throws in private mode safari, so every touch of it is
   wrapped. worst case you get dark mode, which is the default anyway. */
function read()
{
  try
  {
    return localStorage.getItem(STORAGE.theme) || "dark";
  }
  catch
  {
    return "dark";
  }
}

function remember(value)
{
  try
  {
    localStorage.setItem(STORAGE.theme, value);
  }
  catch
  {
    /* fine, the theme just wont survive a refresh. not worth crashing over. */
  }
}

export function applyTheme(next)
{
  theme = next;
  remember(next);

  document.documentElement.dataset.theme = next;
  themeColor.content = THEME_COLORS[next] || THEME_COLORS.dark;
  bulb.classList.toggle("on", next === "light");

  /* the icon shows where youre GOING, not where you are. so in dark mode you see
     a sun, because tapping it gives you light mode. */
  const offersLight = next !== "light";
  button.setAttribute("aria-label", offersLight ? "Switch to light mode" : "Switch to dark mode");

  /* careful here - svg elements dont support the `hidden` property like normal
     elements do, setting .hidden on them does absolutely nothing. so we poke
     display by hand instead. found this one the hard way. */
  sunIcon.style.display = offersLight ? "" : "none";
  moonIcon.style.display = offersLight ? "none" : "";

  const shown = offersLight ? sunIcon : moonIcon;
  shown.classList.remove("icon-pop");
  void shown.getBoundingClientRect(); /* touching layout restarts the pop animation */
  shown.classList.add("icon-pop");
}

function toggleTheme()
{
  /* mash the button mid animation and youd get two monkeys fighting. no. */
  if (animating)
  {
    return;
  }

  const next = theme === "light" ? "dark" : "light";

  /* if someones asked their phone for less motion, skip the whole monkey bit and
     just flip it. */
  if (prefersReducedMotion())
  {
    applyTheme(next);
    return;
  }

  animating = true;
  rig.hidden = false;

  /* two frames, not one. the first lets the browser place the rig up top, the
     second lets the class change actually animate. do it in one and it teleports. */
  requestAnimationFrame(() => requestAnimationFrame(() => rig.classList.add("down")));

  setTimeout(() => applyTheme(next), FLIP_MS);
  setTimeout(() => rig.classList.remove("down"), CLIMB_MS);
  setTimeout(() =>
  {
    rig.hidden = true;
    animating = false;
  }, DONE_MS);
}

export function initTheme()
{
  applyTheme(theme);
  button.addEventListener("click", toggleTheme);
}
