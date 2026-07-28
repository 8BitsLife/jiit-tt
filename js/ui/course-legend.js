/* the "your courses" list at the bottom - every subject your batch actually
   attends, with the colour its cards use. its basically a key for the colours,
   plus a handy list of your full subject names in one place. */

import { COURSES } from "../../data/timetable.js";
import { DAY_NAMES } from "../config.js";
import { courseColor } from "../courses.js";
import { classesFor } from "../schedule.js";
import { selection } from "../state.js";
import { byId, escapeHtml } from "../util.js";

const list = byId("courseList");

export function renderLegend()
{
  /* sweep the whole week, not just today, otherwise the list would change every
     time you tapped a different day. a Set because the same subject obviously
     shows up loads of times across a week. */
  const codes = new Set();

  DAY_NAMES.forEach((_, day) =>
  {
    classesFor(selection.batch, day).forEach(entry => codes.add(entry.c));
  });

  list.innerHTML = "";

  [...codes].sort().forEach((code, index) =>
  {
    const course = COURSES[code];
    const item = document.createElement("li");

    item.style.setProperty("--accent", courseColor(code));
    item.style.animationDelay = `${index * 30}ms`;
    /* full name here, not the short one - theres room, and this is the place you
       come to when you cant remember what "SDF-I" stands for */
    item.innerHTML =
      `<span class="swatch" aria-hidden="true"></span>` +
      `<span class="lname">${escapeHtml(course ? course.full : code)}</span>` +
      `<span class="lcode">${escapeHtml(code)}</span>`;

    list.appendChild(item);
  });
}
