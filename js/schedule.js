/* turning the encoded week into actual times. everything here is just maths on
   "minutes since midnight" - the app never creates a single Date object for a
   class, because timezones and daylight saving are problems we simply do not
   need to have. */

import { DAY_START, LAB_PERIODS, SLOT_COUNT, SLOT_LENGTH } from "./config.js";
import { currentSemester } from "./state.js";
import { formatTime, nowMinutes } from "./util.js";

export function slotStart(slot)
{
  return DAY_START + slot * SLOT_LENGTH;
}

/* how many periods does this thing eat. lectures and tutorials are always 1,
   labs are 2, except the ones listed in LAB_PERIODS which are longer. */
export function entryPeriods(entry)
{
  if (entry.t !== "P")
  {
    return 1;
  }

  /* course codes carry a random institute prefix that changes between years
     ("18B15GE111", "24B15CS213"...) so we match on the subject letters and
     number at the END and ignore whatever is bolted on the front. */
  const subject = entry.c.match(/([A-Z]{2}\d{3})[A-Z]?$/);
  return (subject && LAB_PERIODS[subject[1]]) || 2;
}

/* `lm` is how long a NORMAL 2-period lab runs, so a longer lab is just that plus
   one full period for every extra column its merged across in the grid. */
export function entryMinutes(semester, entry)
{
  if (entry.t !== "P")
  {
    return semester.cm;
  }

  return semester.lm + (entryPeriods(entry) - 2) * SLOT_LENGTH;
}

/* which period numbers this entry sits in. this is what both the free-rooms and
   free-slot tools are built on - a 3 hour lab starting at slot 1 blocks 1,2,3. */
export function coveredSlots(entry)
{
  const periods = entryPeriods(entry);
  return Array.from({ length: periods }, (_, i) => entry.s + i);
}

/* one batchs day, in order, with real start and end times worked out. this is the
   thing the schedule list actually renders. */
export function classesFor(batchId, dayIndex)
{
  const semester = currentSemester();

  return semester.week[dayIndex]
    .filter(entry => entry.b.includes(batchId))
    .map(entry => (
      {
        ...entry,
        start: slotStart(entry.s),
        end: slotStart(entry.s) + entryMinutes(semester, entry),
      }))
    .sort((a, b) => a.start - b.start);
}

export function slotLabel(slot)
{
  const semester = currentSemester();
  return `${formatTime(slotStart(slot))} – ${formatTime(slotStart(slot) + semester.cm)}`;
}

/* which period is happening RIGHT NOW, or -1 if college isnt running. */
export function currentSlot()
{
  const slot = Math.floor((nowMinutes() - DAY_START) / SLOT_LENGTH);
  return slot >= 0 && slot < SLOT_COUNT ? slot : -1;
}

export function lunchStart()
{
  return slotStart(currentSemester().lunch);
}
