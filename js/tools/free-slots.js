/* free-slot finder - when are these two batches BOTH free. exactly what you need
   for "when can we actually meet".

   every batch from both campuses and both semesters is in here, because loads of
   people have a friend on the other campus. that comparison only works because
   all four grids run the same frame - 8 periods, an hour apart, starting at 9.
   what DOES differ is how long a class runs inside its period (50 mins at 128, 60
   at 62 in III Sem), and thats dealt with further down where we print the time. */

import { CAMPUSES } from "../../data/timetable.js";
import { DAY_NAMES, SLOT_LENGTH } from "../config.js";
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

/* the college day is not the same length all week. every grid stops at 1pm on a
   saturday, so running the search out to the full 8 periods reported "12:00 – 5:00
   free" - which is not a window you can meet in, it is just the day being over.

   read out of the data rather than written down here, so it keeps itself honest
   when the grids are replaced next semester. */
function dayEnds()
{
  const ends = DAY_NAMES.map(() => -1);

  for (const campus of Object.values(CAMPUSES))
  {
    for (const semester of Object.values(campus.sems))
    {
      semester.week.forEach((day, index) => day.forEach(entry =>
      {
        ends[index] = Math.max(ends[index], ...coveredSlots(entry));
      }));
    }
  }

  return ends;
}

/* lunch still counts as free - plenty of people are meeting up precisely because
   they are both eating. it just gets said out loud instead of being folded into a
   run, because "12:00 - 5:00" hides the fact that an hour of it is lunch.

   the two batches can break at different times (JIIT-62 I Sem eats at 12, everyone
   else at 1) so a slot is lunch if it is lunch for EITHER of them - hence the
   warning under the results. and it only counts as lunch when something actually
   runs afterwards: on saturday nothing does, so that is not a lunch break, the
   day has simply finished. */
function lunchSlots(a, b, dayEnd)
{
  return new Set([a.semester.lunch, b.semester.lunch].filter(slot => slot < dayEnd));
}

function busySlots(semester, batchId, day)
{
  const busy = new Set();

  semester.week[day]
    .filter(entry => entry.b.includes(batchId))
    .forEach(entry => coveredSlots(entry).forEach(slot => busy.add(slot)));

  return busy;
}

/* [1,2,3,6] -> two runs, 1-3 and 6-6. so three free periods in a row show up as
   ONE chip saying 1:00 - 3:50, instead of three separate little chips which reads
   like theyre unconnected.

   lunch splits a run even though it is free time either side, so it can carry its
   own label. that split is the whole fix for "12:00 - 5:00".

   a lunch period never merges with the one next to it either. pair a JIIT-62 I Sem
   batch (eats at 12) with anybody else (eats at 1) and both hours are lunch, but
   they are two different peoples lunch - printing "Lunch 12:00 - 2:00" would claim
   a two hour break that neither of them gets. */
function mergeRuns(slots, lunch)
{
  const runs = [];

  slots.forEach(slot =>
  {
    const last = runs[runs.length - 1];
    const isLunch = lunch.has(slot);

    if (last && slot === last.to + 1 && !isLunch && !last.lunch)
    {
      last.to = slot;
    }
    else
    {
      runs.push({ from: slot, to: slot, lunch: isLunch });
    }
  });

  return runs;
}

export function renderFreeSlotsTool(host)
{
  const entries = allBatches();
  const byKey = new Map(entries.map(entry => [entry.key, entry]));
  const ends = dayEnds();

  host.innerHTML = `
    <p class="tool-note">Periods where both batches have nothing booked. Pick from either
      campus — handy when the person you want to meet is on the other one. Saturday
      stops at 1:00, because that is when college does.</p>
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
    <div id="freeSlotResults"></div>
    <p class="tool-fine">Lunch is not the same hour for everyone — it shifts between
      years and between campuses. Comparing two batches from different grids, a slot
      marked <b>Lunch</b> may only be lunch for one of you.</p>`;

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
      const dayEnd = ends[day];
      const lunch = lunchSlots(a, b, dayEnd);
      const free = [];

      for (let slot = 0; slot <= dayEnd; slot++)
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

      mergeRuns(free, lunch).forEach(run =>
      {
        const chip = document.createElement("span");
        chip.className = run.lunch ? "slot-chip lunch" : "slot-chip";

        /* lunch is a whole period wide. it is the gap BETWEEN classes rather than
           a class itself, so the 50 or 60 minute lesson length does not apply. */
        const width = run.lunch ? SLOT_LENGTH : windowMinutes;
        const time = `${formatTime(slotStart(run.from))} – ${formatTime(slotStart(run.to) + width)}`;

        chip.textContent = run.lunch ? `Lunch · ${time}` : time;
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
