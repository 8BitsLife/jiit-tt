/* teacher view - search any staff member who shows up in this semesters grid,
   then read their entire week. genuinely useful for "is sir even in college
   today" and for finding someone in their free period. */

import { DAY_NAMES } from "../config.js";
import { courseColor, courseShort, facultyName } from "../courses.js";
import { scopeLine } from "../labels.js";
import { entryMinutes, slotStart } from "../schedule.js";
import { currentSemester } from "../state.js";
import { escapeHtml, formatTime } from "../util.js";
import { pushPanel } from "./panels.js";

/* both campuses have well over a hundred teachers. dumping all of them on screen
   turns the sheet into an endless scroll, so the search box does the work and we
   only ever paint the first 50. */
const VISIBLE_LIMIT = 50;

/* build the list from the timetable itself rather than the faculty table, so you
   only ever see people who actually teach your semester - no ghosts. */
function staffInSemester()
{
  const names = new Map();

  currentSemester().week.flat().forEach(entry =>
  {
    entry.f.forEach(initials =>
    {
      if (!names.has(initials))
      {
        names.set(initials, facultyName(initials));
      }
    });
  });

  return [...names]
    .map(([abbr, name]) => ({ abbr, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function renderTeacherTool(host)
{
  const people = staffInSemester();

  host.innerHTML = `
    <p class="tool-note">${escapeHtml(scopeLine())} · ${people.length} teaching staff</p>
    <input class="tool-input" id="teacherQuery" type="search" placeholder="Search a name or code" autocomplete="off" />
    <div class="tool-list" id="teacherList"></div>`;

  const results = host.querySelector("#teacherList");
  const query = host.querySelector("#teacherQuery");

  const paint = () =>
  {
    /* search matches the name OR the initials, because half the time you only
       know someone as "RSK" off the timetable */
    const term = query.value.trim().toLowerCase();
    const hits = term
      ? people.filter(p => p.name.toLowerCase().includes(term) || p.abbr.toLowerCase().includes(term))
      : people;

    results.innerHTML = "";

    if (!hits.length)
    {
      results.innerHTML = `<p class="tool-empty">Nobody matches that.</p>`;
      return;
    }

    hits.slice(0, VISIBLE_LIMIT).forEach(person =>
    {
      const row = document.createElement("button");
      row.className = "tool-row";

      /* if we have no real name for those initials, facultyName just hands the
         initials back - and printing "AA · AA" looks like a bug, so drop the
         second bit when theyre the same */
      row.innerHTML = `<span class="tool-row-main">${escapeHtml(person.name)}</span>` +
        (person.name === person.abbr ? "" : `<span class="tool-row-side">${escapeHtml(person.abbr)}</span>`);
      row.addEventListener("click", () =>
        pushPanel(person.name, panel => renderTeacherWeek(panel, person)));

      results.appendChild(row);
    });

    /* tell people theres more rather than silently cutting the list off */
    if (hits.length > VISIBLE_LIMIT)
    {
      results.insertAdjacentHTML("beforeend",
        `<p class="tool-empty">…and ${hits.length - VISIBLE_LIMIT} more — keep typing to narrow it.</p>`);
    }
  };

  query.addEventListener("input", paint);
  paint();
}

/* one teachers whole week, grouped by day. days they dont teach are skipped
   entirely instead of showing six headings with nothing under half of them. */
function renderTeacherWeek(host, person)
{
  const semester = currentSemester();
  const prefix = person.name === person.abbr ? "" : escapeHtml(person.abbr) + " · ";

  host.innerHTML = `<p class="tool-note">${prefix}${escapeHtml(scopeLine())}</p>`;

  let total = 0;

  DAY_NAMES.forEach((dayName, day) =>
  {
    const entries = semester.week[day]
      .filter(entry => entry.f.includes(person.abbr))
      .sort((a, b) => a.s - b.s);

    if (!entries.length)
    {
      return;
    }

    total += entries.length;

    const heading = document.createElement("h3");
    heading.className = "tool-day";
    heading.textContent = dayName;
    host.appendChild(heading);

    entries.forEach(entry =>
    {
      const start = slotStart(entry.s);
      const end = start + entryMinutes(semester, entry);
      const where = entry.r ? escapeHtml(entry.r) + " · " : "";

      const row = document.createElement("div");
      row.className = "tool-entry";
      row.style.setProperty("--accent", courseColor(entry.c));
      /* showing which batches theyre teaching matters here - thats how you know
         if its YOUR class or someone elses */
      row.innerHTML =
        `<span class="tool-time">${formatTime(start)}<i>${formatTime(end)}</i></span>` +
        `<span class="tool-what"><b>${escapeHtml(courseShort(entry))}</b>` +
        `<span class="tool-sub">${where}${escapeHtml(entry.b.join(", "))}</span></span>`;

      host.appendChild(row);
    });
  });

  if (!total)
  {
    host.insertAdjacentHTML("beforeend", `<p class="tool-empty">No classes in this semester.</p>`);
  }
}
