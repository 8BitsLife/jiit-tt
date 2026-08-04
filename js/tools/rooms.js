/* free rooms - pick a day and a period, get every room nobodys booked. built for
   finding somewhere to actually sit and study during a long gap. */

import { DAY_NAMES, DAY_SHORT, SLOT_COUNT } from "../config.js";
import { semChip } from "../labels.js";
import { coveredSlots, currentSlot, slotStart } from "../schedule.js";
import { currentCampus, selection } from "../state.js";
import { escapeHtml, formatTime } from "../util.js";

/* one cell in the grid can name two rooms at once - "CL18,19" means CL18 AND
   CL19, and if we treated that as one room called "CL18,19" then both of them
   would look free while a lab is very much running in them.

   only splits when it looks like letters-then-numbers-with-commas though.
   compound names like "EDD/CADD (DW04)" are left completely alone. */
export function roomTokens(room)
{
  if (!room)
  {
    return [];
  }

  const flat = room.replace(/\s+/g, "");
  const pair = /^([A-Za-z]+)(\d+(?:,\d+)+)$/.exec(flat);

  if (pair)
  {
    return pair[2].split(",").map(number => pair[1] + number);
  }

  return [room.trim()];
}

/* EVERY grid we hold for this campus, not just the one you are viewing.

   this tool used to only look at your own semester, which made it confidently
   wrong: a room with a first year lecture running in it was reported free to
   anyone browsing III Sem. the people sitting in there do not care which
   timetable you happen to have open.

   campuses stay separate on purpose though - JIIT-62 and JIIT-128 both have a
   room called CL01 and they are ten kilometres apart. */
function campusGrids()
{
  return Object.entries(currentCampus().sems);
}

/* the room list is built from the timetables themselves, because theres no master
   list of rooms anywhere. so "all rooms" really means "every room these grids
   mention". */
function allRooms(grids)
{
  const rooms = new Set();

  grids.forEach(([, semester]) =>
    semester.week.flat().forEach(entry => roomTokens(entry.r).forEach(room => rooms.add(room))));

  /* numeric:true so 3098 sorts after 244 like a human would expect */
  return [...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/* a period is one hour wide, but what runs INSIDE it is 50 minutes for some
   semesters and 60 for others. now that we count several grids at once the only
   honest window is the longest one - a room is not free at 9:50 if III Sem is in
   there until 10:00. */
function periodLabel(slot, grids)
{
  const longest = Math.max(...grids.map(([, semester]) => semester.cm));
  return `${formatTime(slotStart(slot))} – ${formatTime(slotStart(slot) + longest)}`;
}

export function renderRoomsTool(host)
{
  const grids = campusGrids();
  const rooms = allRooms(grids);
  const campus = currentCampus();
  const semList = grids.map(([id]) => semChip(id)).join(" and ");
  const batchCount = grids.reduce((total, [, semester]) => total + semester.batches.length, 0);

  /* open on the day youre already viewing and the period happening right now,
     since thats what you want 9 times out of 10 */
  let day = selection.day;
  let slot = Math.max(currentSlot(), 0);

  host.innerHTML = `
    <p class="tool-note">${escapeHtml(campus.label)} · checked against
      <b>${escapeHtml(semList)}</b> together — every one of the ${batchCount} batches
      in both, ${rooms.length} rooms.</p>
    <div class="pill-row" id="roomDays"></div>
    <div class="pill-row" id="roomSlots"></div>
    <div id="roomResults"></div>
    <p class="tool-fine"><b>Have a look before you settle in.</b> Only ${escapeHtml(semList)}
      are published, so a room shown free can still hold another year’s class — and
      teachers and students swap rooms by hand all the time, which no timetable
      anywhere knows about.</p>`;

  const dayPills = host.querySelector("#roomDays");
  const slotPills = host.querySelector("#roomSlots");
  const results = host.querySelector("#roomResults");

  const paint = () =>
  {
    [...dayPills.children].forEach((pill, i) => pill.classList.toggle("on", i === day));
    [...slotPills.children].forEach((pill, i) => pill.classList.toggle("on", i === slot));

    /* coveredSlots is doing the heavy lifting - a 2 or 3 hour lab that STARTED
       two periods ago still has that room busy right now */
    const busy = new Set();

    grids.forEach(([, semester]) => semester.week[day].forEach(entry =>
    {
      if (coveredSlots(entry).includes(slot))
      {
        roomTokens(entry.r).forEach(room => busy.add(room));
      }
    }));

    const free = rooms.filter(room => !busy.has(room));

    const heading =
      `<p class="tool-note">${DAY_NAMES[day]} · ${escapeHtml(periodLabel(slot, grids))} — ` +
      `<b>${free.length} free</b>, ${busy.size} in use</p>`;

    const listing = free.length
      ? `<div class="chip-wrap">${free.map(r => `<span class="room-chip">${escapeHtml(r)}</span>`).join("")}</div>`
      : `<p class="tool-empty">Every room in the grids is booked then.</p>`;

    results.innerHTML = heading + listing;
  };

  DAY_SHORT.forEach((name, index) =>
  {
    const pill = document.createElement("button");
    pill.className = "pill";
    pill.textContent = name;
    pill.addEventListener("click", () =>
    {
      day = index;
      paint();
    });

    dayPills.appendChild(pill);
  });

  for (let index = 0; index < SLOT_COUNT; index++)
  {
    const pill = document.createElement("button");
    pill.className = "pill";
    pill.textContent = formatTime(slotStart(index));
    pill.addEventListener("click", () =>
    {
      slot = index;
      paint();
    });

    slotPills.appendChild(pill);
  }

  paint();
}
