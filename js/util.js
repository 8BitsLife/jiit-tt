/* tiny helper functions that dont know anything about timetables.
   if a function here ever starts caring about classes or batches, it moved to the
   wrong file broski */

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/* teacher names and course titles come out of a PDF, and we paste them straight
   into html strings. so anything from the data goes through here first, otherwise
   one weird "&" in a name and the page breaks. */
export function escapeHtml(value)
{
  return String(value).replace(/[&<>"]/g, ch => HTML_ESCAPES[ch]);
}

/* minutes since midnight -> the clock time you see on a card. 780 becomes "1:00".
   no am/pm anywhere because college never runs at 1 in the night, so theres
   nothing to confuse it with. */
export function formatTime(minutes)
{
  let hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours > 12)
  {
    hours -= 12;
  }

  return `${hours}:${String(rest).padStart(2, "0")}`;
}

export function nowMinutes()
{
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/* monday is 0 here, not sunday, because thats how the week arrays are stored.
   sunday has no column in any grid so it gets -1 = "not a college day". */
export function todayIndex()
{
  const day = new Date().getDay();
  return day === 0 ? -1 : day - 1;
}

/* which day tab opens when you land on the site. today normally, but on a sunday
   theres nothing to show so it just gives you monday. */
export function defaultDay()
{
  const today = todayIndex();
  return today === -1 ? 0 : today;
}

export function byId(id)
{
  return document.getElementById(id);
}

export function prefersReducedMotion()
{
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
