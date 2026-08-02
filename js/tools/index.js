/* the tools sheet - a menu of four little utilities. tapping one makes it take
   over the whole sheet body, and the back arrow brings you back here.

   this file has no exports on purpose. importing it IS what wires the tools
   button up, see main.js. */

import { scopeLine } from "../labels.js";
import { openSheet } from "../ui/sheet.js";
import { byId, escapeHtml } from "../util.js";
import { renderIcsExportTool } from "./export-ics.js";
import { renderFreeSlotsTool } from "./free-slots.js";
import { renderOfflineTool } from "./offline.js";
import { pushPanel, resetPanels, setRootPanel } from "./panels.js";
import { renderRoomsTool } from "./rooms.js";
import { renderTeacherTool } from "./teachers.js";

const sheet = byId("toolsSheet");
const button = byId("toolsBtn");

const TOOLS = [
  { name: "Teacher view", desc: "Where a lecturer is, all week", render: renderTeacherTool },
  { name: "Free rooms", desc: "Rooms nobody is using, any period", render: renderRoomsTool },
  { name: "Offline access", desc: "Keep the timetable on this device", render: renderOfflineTool },
  { name: "Free-slot finder", desc: "Periods two batches are both free, either campus", render: renderFreeSlotsTool },
  { name: "Export Calendar (.ics)", desc: "Export weekly schedule for your batch", render: renderIcsExportTool },
];

const CHEVRON =
  `<svg class="tool-go" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">` +
  `<path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function renderMenu(host)
{
  host.innerHTML =
    `<p class="tool-note">${escapeHtml(scopeLine())} — tools read the timetable you have ` +
    `selected, apart from the free-slot finder, which spans both campuses.</p>`;

  TOOLS.forEach((tool, index) =>
  {
    const option = document.createElement("button");
    option.className = "tool-option";
    /* each one 40ms behind the last so they cascade in rather than all landing
       at the same instant */
    option.style.animationDelay = `${index * 40}ms`;
    option.innerHTML =
      `<span class="tool-idx">${String(index + 1).padStart(2, "0")}</span>` +
      `<span class="tool-copy">` +
      `<span class="tool-name">${escapeHtml(tool.name)}</span>` +
      `<span class="tool-desc">${escapeHtml(tool.desc)}</span>` +
      `</span>` + CHEVRON;
    option.addEventListener("click", () => pushPanel(tool.name, tool.render));

    host.appendChild(option);
  });
}

setRootPanel(renderMenu);

button.addEventListener("click", () => openSheet(sheet, button, resetPanels));
