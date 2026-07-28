/* free rooms - pick a day and a period, get every room nobodys booked. built for
   finding somewhere to actually sit and study during a long gap. */

import { DAY_NAMES, DAY_SHORT, SLOT_COUNT } from "../config.js";
import { scopeLine } from "../labels.js";
import { coveredSlots, currentSlot, slotLabel, slotStart } from "../schedule.js";
import { currentSemester, selection } from "../state.js";
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

/* the room list is built from the timetable itself, because theres no master list
   of rooms anywhere. so "all rooms" really means "every room this grid mentions". */
function allRooms(semester)
{
  const rooms = new Set();

  semester.week.flat().forEach(entry => roomTokens(entry.r).forEach(room => rooms.add(room)));

  /* numeric:true so 3098 sorts after 244 like a human would expect */
  return [...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function renderRoomsTool(host)
{
  const semester = currentSemester();
  const rooms = allRooms(semester);

  /* open on the day youre already viewing and the period happening right now,
     since thats what you want 9 times out of 10 */
  let day = selection.day;
  let slot = Math.max(currentSlot(), 0);

  host.innerHTML = `
    <p class="tool-note">${escapeHtml(scopeLine())} · ${rooms.length} rooms appear in this grid</p>
    <div class="pill-row" id="roomDays"></div>
    <div class="pill-row" id="roomSlots"></div>
    <div id="roomResults"></div>
    <p class="tool-fine">“Free” means no class from <em>this</em> semester’s grid is booked there — another year may still be in the room.</p>`;

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

    semester.week[day].forEach(entry =>
    {
      if (coveredSlots(entry).includes(slot))
      {
        roomTokens(entry.r).forEach(room => busy.add(room));
      }
    });

    const free = rooms.filter(room => !busy.has(room));

    const heading =
      `<p class="tool-note">${DAY_NAMES[day]} · ${escapeHtml(slotLabel(slot))} — ` +
      `<b>${free.length} free</b>, ${busy.size} in use</p>`;

    const listing = free.length
      ? `<div class="chip-wrap">${free.map(r => `<span class="room-chip">${escapeHtml(r)}</span>`).join("")}</div>`
      : `<p class="tool-empty">Every room in the grid is booked then.</p>`;

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
