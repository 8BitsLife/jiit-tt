/* the three ways of choosing what youre looking at - the campus slider at the
   top, and the semester and batch sheets that slide up from the bottom. */

import { semChip, semLabel } from "../labels.js";
import { currentCampus, currentSemester, selection, setBatch, setCampus, setSem } from "../state.js";
import { byId, escapeHtml } from "../util.js";
import { closeSheet, openSheet } from "./sheet.js";

const campusSwitch = byId("campusSwitch");
const batchButton = byId("batchOpen");
const batchLabelEl = byId("batchLabel");
const batchSheet = byId("batchSheet");
const batchGroups = byId("batchGroups");
const semButton = byId("semOpen");
const semLabelEl = byId("semLabel");
const semSheet = byId("semSheet");
const semOptions = byId("semOptions");

/* strip the letter and sort by the actual number. a plain sort puts "F10" before
   "F9" because it compares character by character, and then the batch grid looks
   like someone shuffled it. */
function batchNumber(id)
{
  return parseInt(id.slice(1), 10);
}

/* batches get grouped by their first letter (F batches, E batches, H batches...)
   because scrolling one flat list of 40+ chips to find yours is painful */
function fillBatchSheet()
{
  const batches = currentSemester().batches;
  const letters = [...new Set(batches.map(id => id[0]))];

  batchGroups.innerHTML = "";

  letters.forEach(letter =>
  {
    const group = batches
      .filter(id => id[0] === letter)
      .sort((a, b) => batchNumber(a) - batchNumber(b));

    const section = document.createElement("div");
    section.className = "batch-group";
    section.innerHTML = `<h3>${escapeHtml(letter)} batches</h3>`;

    const grid = document.createElement("div");
    grid.className = "batch-grid";

    group.forEach(id =>
    {
      const chip = document.createElement("button");
      chip.className = "batch-chip" + (id === selection.batch ? " active" : "");
      chip.textContent = id;
      chip.addEventListener("click", () =>
      {
        setBatch(id);
        closeSheet();
      });

      grid.appendChild(chip);
    });

    section.appendChild(grid);
    batchGroups.appendChild(section);
  });
}

function fillSemSheet()
{
  const campus = currentCampus();
  semOptions.innerHTML = "";

  Object.keys(campus.sems).forEach(id =>
  {
    const option = document.createElement("button");
    option.className = "sem-option" + (id === selection.sem ? " active" : "");
    option.innerHTML =
      `<span>${escapeHtml(semLabel(id))}</span>` +
      `<span class="sem-sub">${escapeHtml(campus.label)}</span>`;
    option.addEventListener("click", () =>
    {
      setSem(id);
      closeSheet();
    });

    semOptions.appendChild(option);
  });
}

/* run after ANY selection change. important bit: state.js can quietly correct
   your batch underneath you (switch campus and your old batch might not exist
   there), so these labels have to re-read state rather than assume they already
   know what was clicked. */
export function syncPickers()
{
  batchLabelEl.textContent = selection.batch;
  semLabelEl.textContent = semChip(selection.sem);
  /* the sliding thumb is pure css, it just follows this data attribute */
  campusSwitch.dataset.active = selection.campus;

  campusSwitch.querySelectorAll(".campus-btn").forEach(button =>
  {
    button.setAttribute("aria-selected", String(button.dataset.campus === selection.campus));
  });
}

campusSwitch.querySelectorAll(".campus-btn").forEach(button =>
{
  button.addEventListener("click", () => setCampus(button.dataset.campus));
});

batchButton.addEventListener("click", () => openSheet(batchSheet, batchButton, fillBatchSheet));
semButton.addEventListener("click", () => openSheet(semSheet, semButton, fillSemSheet));
