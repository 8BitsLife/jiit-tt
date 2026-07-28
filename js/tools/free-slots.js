/* free-slot finder - when are these two batches BOTH free. exactly what you need
   for "when can we actually meet".

   every batch from both campuses and both semesters is in here, because loads of
   people have a friend on the other campus. that comparison only works because
   all four grids run the same frame - 8 periods, an hour apart, starting at 9.
   what DOES differ is how long a class runs inside its period (50 mins at 128, 60
   at 62 in III Sem), and thats dealt with further down where we print the time. */

import { CAMPUSES } from "../../data/timetable.js";
import { DAY_NAMES, SLOT_COUNT } from "../config.js";
import { semChip } from "../labels.js";
import { coveredSlots, slotStart } from "../schedule.js";
import { selection } from "../state.js";
import { escapeHtml, formatTime } from "../util.js";

/* every batch in the app, each one carrying its own semester object along with
   it so we never have to go digging back through the campus later.

   watch out: batch NAMES repeat across grids - theres an F1 in more than one, and
   60 names are duplicated overall. so the key is what identifies a choice, never
   the name. get this wrong and picking A1 from two different semesters looks like
   picking the same batch twice. */
function allBatches()
{
  const entries = [];

  for (const [campusId, campus] of Object.entries(CAMPUSES))
  {
    for (const [semId, semester] of Object.entries(campus.sems))
    {
      semester.batches.forEach(batchId => entries.push(
        {
          key: `${campusId}|${semId}|${batchId}`,
          group: `${campus.label} · ${semChip(semId)}`,
          campusId,
          batchId,
          semester,
        }));
    }
  }

  return entries;
}

/* grouped into optgroups otherwise its a wall of 142 options and good luck */
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

function busySlots(semester, batchId, day)
{
  const busy = new Set();

  semester.week[day]
    .filter(entry => entry.b.includes(batchId))
    .forEach(entry => coveredSlots(entry).forEach(slot => busy.add(slot)));

  return busy;
}

/* [1,2,3,6] -> [[1,3],[6,6]]. so three free periods in a row show up as ONE
   chip saying 1:00 - 3:50, instead of three separate little chips which reads
   like theyre unconnected. */
function mergeRuns(slots)
{
  const runs = [];

  slots.forEach(slot =>
  {
    const last = runs[runs.length - 1];

    if (last && slot === last[1] + 1)
    {
      last[1] = slot;
    }
    else
    {
      runs.push([slot, slot]);
    }
  });

  return runs;
}

export function renderFreeSlotsTool(host)
{
  const entries = allBatches();
  const byKey = new Map(entries.map(entry => [entry.key, entry]));

  host.innerHTML = `
    <p class="tool-note">Periods where both batches have nothing booked. Pick from either
      campus — handy when the person you want to meet is on the other one.</p>
    <div class="tool-pair">
      <label class="tool-field">
        <span>Batch A</span>
        <select class="tool-select" id="freeSlotA"></select>
        <em class="tool-scope" id="freeSlotScopeA"></em>
      </label>
      <label class="tool-field">
        <span>Batch B</span>
        <select class="tool-select" id="freeSlotB"></select>
        <em class="tool-scope" id="freeSlotScopeB"></em>
      </label>
    </div>
    <div id="freeSlotResults"></div>`;

  const selectA = host.querySelector("#freeSlotA");
  const selectB = host.querySelector("#freeSlotB");
  const scopeA = host.querySelector("#freeSlotScopeA");
  const scopeB = host.querySelector("#freeSlotScopeB");
  const results = host.querySelector("#freeSlotResults");

  const options = optionsHtml(entries);
  selectA.innerHTML = options;
  selectB.innerHTML = options;

  /* start on the batch youre already looking at, against a neighbour from the
     same grid. thats the everyday case - you can always reach across to the other
     campus from there. */
  const currentKey = `${selection.campus}|${selection.sem}|${selection.batch}`;
  selectA.value = byKey.has(currentKey) ? currentKey : entries[0].key;

  const first = byKey.get(selectA.value);
  const partner =
    entries.find(entry => entry.group === first.group && entry.key !== first.key) ||
    entries.find(entry => entry.key !== first.key);

  selectB.value = partner.key;

  const paint = () =>
  {
    const a = byKey.get(selectA.value);
    const b = byKey.get(selectB.value);

    /* a closed <select> only ever shows the option text and completely drops the
       optgroup label. so without these captions both boxes would just say "A1"
       and youd have no idea which campus each one was. */
    scopeA.textContent = a.group;
    scopeB.textContent = b.group;

    if (a.key === b.key)
    {
      results.innerHTML = `<p class="tool-empty">Pick two different batches.</p>`;
      return;
    }

    /* the periods line up across campuses, but a class inside one runs 50 mins
       and the other 60. we print the SHORTER of the two, so the window shown is
       one both of them are definitely out of - being 10 mins pessimistic is fine,
       telling someone theyre free when theyre still in a lecture is not. */
    const windowMinutes = Math.min(a.semester.cm, b.semester.cm);

    results.innerHTML = "";
    let found = false;

    DAY_NAMES.forEach((dayName, day) =>
    {
      const busyA = busySlots(a.semester, a.batchId, day);
      const busyB = busySlots(b.semester, b.batchId, day);
      const free = [];

      for (let slot = 0; slot < SLOT_COUNT; slot++)
      {
        if (!busyA.has(slot) && !busyB.has(slot))
        {
          free.push(slot);
        }
      }

      if (!free.length)
      {
        return;
      }

      found = true;

      const heading = document.createElement("h3");
      heading.className = "tool-day";
      heading.textContent = dayName;
      results.appendChild(heading);

      const wrap = document.createElement("div");
      wrap.className = "chip-wrap";

      mergeRuns(free).forEach(([from, to]) =>
      {
        const chip = document.createElement("span");
        chip.className = "slot-chip";
        chip.textContent =
          `${formatTime(slotStart(from))} – ${formatTime(slotStart(to) + windowMinutes)}`;
        wrap.appendChild(chip);
      });

      results.appendChild(wrap);
    });

    if (!found)
    {
      results.innerHTML =
        `<p class="tool-empty">${escapeHtml(a.batchId)} and ${escapeHtml(b.batchId)} ` +
        `never share a free period.</p>`;
    }

    if (a.campusId !== b.campusId)
    {
      const note = document.createElement("p");
      note.className = "tool-fine";
      note.textContent =
        "These batches are on different campuses, so a shared free period is time " +
        "off — not time enough to meet. Allow for the journey.";
      results.appendChild(note);
    }
  };

  selectA.addEventListener("change", paint);
  selectB.addEventListener("change", paint);
  paint();
}
