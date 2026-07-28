/* whatever youre currently looking at - campus, semester, batch, day. this is the
   ONLY file allowed to change those. everything else reads `selection`, calls one
   of the setters, and then redraws when it gets told to.

   if you ever find yourself doing selection.batch = "F3" somewhere else, dont.
   nothing will re-render and youll spend an hour wondering why. */

import { CAMPUSES } from "../data/timetable.js";
import { STORAGE } from "./config.js";
import { defaultDay } from "./util.js";

/* localStorage throws in private-mode safari and when cookies are blocked
   completely. losing someones saved batch is annoying, a blank white page is way
   worse, so every read and write is wrapped. */
function read(key)
{
  try
  {
    return localStorage.getItem(key);
  }
  catch
  {
    return null;
  }
}

function write(key, value)
{
  try
  {
    localStorage.setItem(key, value);
  }
  catch
  {
    /* preferences just wont survive the session, moving on */
  }
}

function firstKey(object)
{
  return Object.keys(object)[0];
}

/* everything saved from a previous visit gets checked before we trust it. the
   timetables get regenerated every semester, so the batch someone saved in march
   might not exist anymore - and if we blindly used it theyd get an empty page. */
const campus = CAMPUSES[read(STORAGE.campus)] ? read(STORAGE.campus) : "128";
const sems = CAMPUSES[campus].sems;
const sem = sems[read(STORAGE.sem)] ? read(STORAGE.sem) : firstKey(sems);
const batches = sems[sem].batches;

export const selection = {
  campus,
  sem,
  batch: batches.includes(read(STORAGE.batch)) ? read(STORAGE.batch) : batches[0],
  day: defaultDay(),
};

export function currentCampus()
{
  return CAMPUSES[selection.campus];
}

export function currentSemester()
{
  return currentCampus().sems[selection.sem];
}

/* a dead simple pub/sub. subscribers get told WHAT moved: "day" means only the
   class list needs redrawing, anything else means the batch/sem/campus changed
   and everything hanging off it is now wrong. */
const listeners = new Set();

export function subscribe(listener)
{
  listeners.add(listener);
}

function emit(change)
{
  listeners.forEach(listener => listener(change));
}

export function setDay(index)
{
  selection.day = index;
  emit("day");
}

export function setBatch(id)
{
  selection.batch = id;
  write(STORAGE.batch, id);
  emit("selection");
}

/* switching semester or campus can leave your batch stranded - I Sem and III Sem
   dont share batch names at all, so "F1" might just stop existing. rather than
   showing nothing we drop you on the first batch that does exist. */
function keepBatchValid()
{
  const list = currentSemester().batches;

  if (!list.includes(selection.batch))
  {
    selection.batch = list[0];
    write(STORAGE.batch, selection.batch);
  }
}

export function setSem(id)
{
  selection.sem = id;
  write(STORAGE.sem, id);
  keepBatchValid();
  emit("selection");
}

export function setCampus(id)
{
  /* tapping the campus youre already on shouldnt reset your batch */
  if (id === selection.campus)
  {
    return;
  }

  selection.campus = id;
  write(STORAGE.campus, id);

  /* and the campuses dont necessarily run the same semesters either */
  if (!currentCampus().sems[selection.sem])
  {
    selection.sem = firstKey(currentCampus().sems);
    write(STORAGE.sem, selection.sem);
  }

  keepBatchValid();
  emit("selection");
}
