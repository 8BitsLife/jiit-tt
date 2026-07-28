/* this just has ways of naming the headers, just that*/

import { SEM_META } from "./config.js";
import { currentCampus, selection } from "./state.js";

/* just short forming here nothing much */
export function semChip(id)
{
  return SEM_META[id] ? SEM_META[id].chip : "Sem " + id;
}


export function semLabel(id)
{
  return SEM_META[id] ? SEM_META[id].label : "Sem " + id;
}

/* changing sem in header lists in tools when you change branch or sem, some external help was taken here lol */
export function scopeLine()
{
  return `${currentCampus().label} · ${semChip(selection.sem)}`;
}
