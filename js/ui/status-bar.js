/* that one line at the top telling you whats happening right now. honestly the
   most useful thing on the whole page - most of the time you open this site you
   just want to know "where am i supposed to be" and then close it again. */

import { courseShort } from "../courses.js";
import { classesFor } from "../schedule.js";
import { selection } from "../state.js";
import { byId, escapeHtml, formatTime, nowMinutes, todayIndex } from "../util.js";

const dot = byId("liveDot");
const text = byId("statusText");

/* some entries have no room listed in the official grid, so dont print " in "
   followed by nothing */
function inRoom(entry)
{
  return entry.r ? ` in ${escapeHtml(entry.r)}` : "";
}

/* works down from most useful to least: in class right now > next class > done
   for the day. */
function buildStatus()
{
  const today = todayIndex();

  if (today === -1)
  {
    return { live: false, html: "It's Sunday — no classes. Monday is up next." };
  }

  const now = nowMinutes();
  const classes = classesFor(selection.batch, today);

  if (!classes.length)
  {
    return { live: false, html: `No classes for ${escapeHtml(selection.batch)} today.` };
  }

  const current = classes.find(entry => now >= entry.start && now < entry.end);

  if (current)
  {
    const name = escapeHtml(courseShort(current));
    return {
      live: true,
      html: `Now: <strong>${name}</strong>${inRoom(current)} · ends in ${current.end - now} min`,
    };
  }

  const next = classes.find(entry => entry.start > now);

  if (next)
  {
    /* "in 20 min" is easier to act on than "at 11:00" when its close, but past an
       hour the actual clock time is more useful again */
    const minutes = next.start - now;
    const when = minutes < 60 ? `in ${minutes} min` : `at ${formatTime(next.start)}`;
    const name = escapeHtml(courseShort(next));

    return { live: false, html: `Next: <strong>${name}</strong>${inRoom(next)} · ${when}` };
  }

  return { live: false, html: "Done for today — nothing left on the schedule." };
}

export function renderStatus()
{
  const { live, html } = buildStatus();

  dot.hidden = !live;

  /* only touch the dom if the text genuinely changed. writing identical html back
     every 30 seconds restarts the little pulsing dot animation and it looks
     twitchy. */
  if (text.innerHTML !== html)
  {
    text.innerHTML = html;
  }
}
