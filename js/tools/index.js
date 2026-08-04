/* the tools sheet - a grid of little utilities. tapping one makes it take over
   the whole sheet body, and the back arrow brings you back here.

   this file has no exports on purpose. importing it IS what wires the tools
   button up, see main.js. */

import { scopeLine } from "../labels.js";
import { closeSheet, openSheet } from "../ui/sheet.js";
import { byId, escapeHtml } from "../util.js";
import { renderIcsExportTool } from "./export-ics.js";
import { renderFreeSlotsTool } from "./free-slots.js";
import { renderInstallTool, renderOfflineTool } from "./offline.js";
import { pushPanel, resetPanels, setRootPanel } from "./panels.js";
import { renderRoomsTool } from "./rooms.js";
import { renderSubjectTool } from "./subjects.js";
import { renderTeacherTool } from "./teachers.js";

const sheet = byId("toolsSheet");
const button = byId("toolsBtn");

const TOOLS = [
  { name: "Subject tracker", desc: "Every class of one course, all week", render: renderSubjectTool },
  { name: "Teacher view", desc: "Where a lecturer is, all week", render: renderTeacherTool },
  { name: "Free rooms", desc: "Rooms nobody is using, any period", render: renderRoomsTool },
  { name: "Offline access", desc: "Keep the timetable on this device", render: renderOfflineTool },
  { name: "Free-slot finder", desc: "Periods two batches are both free, either campus", render: renderFreeSlotsTool },
  { name: "Export Calendar (.ics)", desc: "Export weekly schedule for your batch", render: renderIcsExportTool },
  { name: "Install app", desc: "Put it on your home screen", render: renderInstallTool },
];

/* the corner arrow. it is the only thing telling you a block is tappable at all,
   since a tile has none of the built in "row of a list" affordance. */
const ARROW =
  `<svg class="tool-go" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">` +
  `<path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function renderMenu(host)
{
  host.innerHTML =
    `<p class="tool-note">${escapeHtml(scopeLine())} — tools read the timetable you have ` +
    `selected, apart from the free-slot finder, which spans both campuses.</p>`;

  const grid = document.createElement("div");
  grid.className = "tool-grid";

  TOOLS.forEach((tool, index) =>
  {
    const option = document.createElement("button");
    option.className = "tool-option";
    /* each one 40ms behind the last so they cascade in rather than all landing
       at the same instant */
    option.style.animationDelay = `${index * 40}ms`;
    option.innerHTML =
      `<span class="tool-top">` +
      `<span class="tool-idx">${String(index + 1).padStart(2, "0")}</span>` + ARROW +
      `</span>` +
      `<span class="tool-name">${escapeHtml(tool.name)}</span>` +
      `<span class="tool-desc">${escapeHtml(tool.desc)}</span>`;
    option.addEventListener("click", () => pushPanel(tool.name, tool.render));

    grid.appendChild(option);
  });

  host.appendChild(grid);
}

setRootPanel(renderMenu);

button.addEventListener("click", () => openSheet(sheet, button, resetPanels));

/* closes the whole sheet from any depth - the back arrow next to it only walks
   you up one panel, which is a long way out of a tool you opened by mistake. */
byId("toolClose").addEventListener("click", closeSheet);
