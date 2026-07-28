/* the six day buttons across the top. each one also tells you how many classes
   you have that day, so you can spot a free-ish day without even opening it. */

import { DAY_NAMES, DAY_SHORT } from "../config.js";
import { classesFor } from "../schedule.js";
import { selection, setDay } from "../state.js";
import { byId, todayIndex } from "../util.js";

const tabs = byId("dayTabs");

export function renderDayTabs()
{
  const today = todayIndex();
  tabs.innerHTML = "";

  DAY_NAMES.forEach((name, index) =>
  {
    const count = classesFor(selection.batch, index).length;
    const isToday = index === today;

    const tab = document.createElement("button");
    tab.className = "day-tab" + (isToday ? " is-today" : "");
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(index === selection.day));
    /* screen readers get the full day name and get told which one is today,
       since "MON" and a dot on screen means nothing out loud */
    tab.setAttribute("aria-label", name + (isToday ? " (today)" : ""));
    tab.innerHTML = `${DAY_SHORT[index]}<span class="count">${count ? count + " cls" : "free"}</span>`;
    tab.addEventListener("click", () => setDay(index));

    tabs.appendChild(tab);
  });
}
