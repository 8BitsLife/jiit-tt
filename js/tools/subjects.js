/* subject tracker - pick one of your courses and read every lecture, tutorial and
   lab it has all week, in one list.

   the class list on the front page answers "what do I have today". this answers
   the other question people actually ask, which is "when is my DBMS lab" or "how
   many maths lectures am I supposed to be at" - and you cannot get that by staring
   at six separate days.

   it opens on whatever batch you are already viewing, because that is the answer
   99% of the time, and the picker is there for the rest. */

import { COURSES } from "../../data/timetable.js";
import { DAY_NAMES } from "../config.js";
import { courseColor, facultyName } from "../courses.js";
import { semChip } from "../labels.js";
import { entryMinutes, entryPeriods, slotStart } from "../schedule.js";
import { currentCampus, selection } from "../state.js";
import { escapeHtml, formatTime } from "../util.js";
import { pushPanel } from "./panels.js";

/* every batch on THIS campus, both semesters, each carrying its own semester
   object so the timings come out right - a class is 50 minutes in one grid and 60
   in another, and reading that off the wrong semester quietly shifts every end
   time on screen.

   batch names repeat across semesters (there is an F1 in both), so the key has to
   be semester + name. keying on the name alone silently merges two different
   batches into one. */
function campusBatches()
{
  const entries = [];

  for (const [semId, semester] of Object.entries(currentCampus().sems))
  {
    semester.batches.forEach(batchId => entries.push(
      {
        key: `${semId}|${batchId}`,
        group: semChip(semId),
        semId,
        batchId,
        semester,
      }));
  }

  return entries;
}

function optionsHtml(entries)
{
  let html = "";
  let openGroup = null;

  entries.forEach(entry =>
  {
    if (entry.group !== openGroup)
    {
      html += openGroup === null ? "" : "</optgroup>";
      html += `<optgroup label="${escapeHtml(entry.group)}">`;
      openGroup = entry.group;
    }

    html += `<option value="${escapeHtml(entry.key)}">${escapeHtml(entry.batchId)}</option>`;
  });

  return openGroup === null ? html : html + "</optgroup>";
}

/* the short name, straight from the course table. deliberately NOT courseShort(),
   which bolts "Lab" onto practicals - here one row stands for the whole course,
   lectures and lab together, so that suffix would be a lie. */
function courseName(code)
{
  return COURSES[code] ? COURSES[code].short : code;
}

function courseFullName(code)
{
  return COURSES[code] ? COURSES[code].full : code;
}

/* what this batch actually studies, counted off their own week rather than any
   list of courses - if it is not in their grid, it is not theirs. */
function coursesFor(semester, batchId)
{
  const found = new Map();

  semester.week.flat().forEach(entry =>
  {
    if (!entry.b.includes(batchId))
    {
      return;
    }

    if (!found.has(entry.c))
    {
      found.set(entry.c, { code: entry.c, name: courseName(entry.c), count: 0 });
    }

    found.get(entry.c).count += 1;
  });

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function typeTag(entry)
{
  if (entry.t === "T")
  {
    return "Tutorial";
  }

  if (entry.t !== "P")
  {
    return "Lecture";
  }

  const hours = entryPeriods(entry);
  return `Lab · ${hours} hr${hours > 1 ? "s" : ""}`;
}

/* the sheet rebuilds the root panel from scratch every time you come back out of a
   course (see js/tools/panels.js), so without somewhere to keep these you would
   pick a batch, look at one subject, tap back, and land on somebody else's
   timetable with your search wiped. */
let chosenKey = null;
let chosenQuery = "";
let lastDefault = null;

export function renderSubjectTool(host)
{
  const batches = campusBatches();
  const byKey = new Map(batches.map(entry => [entry.key, entry]));

  host.innerHTML = `
    <p class="tool-note">${escapeHtml(currentCampus().label)} · pick a course and see its
      whole week at once.</p>
    <div class="tool-pair">
      <label class="tool-field">
        <span>Batch</span>
        <select class="tool-select" id="subjectBatch"></select>
        <em class="tool-scope" id="subjectScope"></em>
      </label>
    </div>
    <input class="tool-input" id="subjectQuery" type="search" placeholder="Search a subject or code" autocomplete="off" />
    <div class="tool-list" id="subjectList"></div>`;

  const picker = host.querySelector("#subjectBatch");
  const scope = host.querySelector("#subjectScope");
  const query = host.querySelector("#subjectQuery");
  const results = host.querySelector("#subjectList");

  picker.innerHTML = optionsHtml(batches);

  /* start on the batch they are already looking at.

     a remembered pick only outranks that while the main selection has not moved -
     change batch or campus on the front page and you clearly want the tool to
     follow you, not to keep showing whoever you were nosing at last time. */
  const currentKey = `${selection.sem}|${selection.batch}`;

  if (currentKey !== lastDefault)
  {
    chosenKey = null;
    chosenQuery = "";
    lastDefault = currentKey;
  }

  const fallback = byKey.has(currentKey) ? currentKey : batches[0].key;
  picker.value = chosenKey && byKey.has(chosenKey) ? chosenKey : fallback;
  chosenKey = picker.value;
  query.value = chosenQuery;

  const paint = () =>
  {
    const chosen = byKey.get(picker.value);

    /* a closed <select> shows the option text and drops the optgroup label, so
       without this you cannot tell which semester's F1 you picked */
    scope.textContent = `${chosen.group} · batch ${chosen.batchId}`;

    const courses = coursesFor(chosen.semester, chosen.batchId);
    const term = query.value.trim().toLowerCase();
    const hits = term
      ? courses.filter(c => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term))
      : courses;

    results.innerHTML = "";

    if (!hits.length)
    {
      results.innerHTML = courses.length
        ? `<p class="tool-empty">No subject matches that.</p>`
        : `<p class="tool-empty">Batch ${escapeHtml(chosen.batchId)} has no classes at all.</p>`;
      return;
    }

    hits.forEach(course =>
    {
      const row = document.createElement("button");
      row.className = "tool-row";
      row.innerHTML =
        `<span class="tool-row-main">${escapeHtml(course.name)}</span>` +
        `<span class="tool-row-side">${course.count}/week</span>`;
      row.addEventListener("click", () =>
        pushPanel(course.name, panel => renderCourseWeek(panel, chosen, course)));

      results.appendChild(row);
    });
  };

  picker.addEventListener("change", () =>
  {
    chosenKey = picker.value;
    /* the old search term almost never matches the new batch's subjects, and an
       empty list looks like the picker broke */
    query.value = "";
    chosenQuery = "";
    paint();
  });

  query.addEventListener("input", () =>
  {
    chosenQuery = query.value;
    paint();
  });

  paint();
}

/* one course, every session of it, grouped by day. days it does not run are left
   out rather than printed empty. */
function renderCourseWeek(host, chosen, course)
{
  const { semester, batchId } = chosen;

  host.innerHTML =
    `<p class="tool-note">${escapeHtml(courseFullName(course.code))}
      <b>${escapeHtml(course.code)}</b><br>${escapeHtml(chosen.group)} · batch ${escapeHtml(batchId)}</p>`;

  let total = 0;

  DAY_NAMES.forEach((dayName, day) =>
  {
    const entries = semester.week[day]
      .filter(entry => entry.c === course.code && entry.b.includes(batchId))
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
      const where = entry.r ? escapeHtml(entry.r) : "";
      const who = entry.f.map(initials => escapeHtml(facultyName(initials))).join(" · ");
      const separator = where && who ? " · " : "";

      const row = document.createElement("div");
      row.className = "tool-entry";
      row.style.setProperty("--accent", courseColor(entry.c));
      row.innerHTML =
        `<span class="tool-time">${formatTime(start)}<i>${formatTime(end)}</i></span>` +
        `<span class="tool-what"><b>${escapeHtml(typeTag(entry))}</b>` +
        `<span class="tool-sub">${where}${separator}${who}</span></span>`;

      host.appendChild(row);
    });
  });

  const plural = total === 1 ? "" : "es";
  host.insertAdjacentHTML("beforeend",
    total
      ? `<p class="tool-fine">${total} class${plural} a week.</p>`
      : `<p class="tool-empty">Nothing scheduled for this course.</p>`);
}
