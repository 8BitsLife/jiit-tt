import { courseFull, courseShort, facultyName } from "../courses.js";
import { scopeLine } from "../labels.js";
import { classesFor } from "../schedule.js";
import { currentCampus, currentSemester, selection } from "../state.js";
import { escapeHtml } from "../util.js";

function getMondayOfCurrentWeek()
{
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatIcsDateTime(date, minutesSinceMidnight)
{
  const d = new Date(date);
  const hours = Math.floor(minutesSinceMidnight / 60);
  const mins = minutesSinceMidnight % 60;
  d.setHours(hours, mins, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
}

function escapeIcsText(text)
{
  if (!text)
  {
    return "";
  }

  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateBatchIcs(batchId)
{
  const semester = currentSemester();
  const campus = currentCampus();
  const mondayDate = getMondayOfCurrentWeek();
  const nowStamp = formatIcsDateTime(new Date(), new Date().getHours() * 60 + new Date().getMinutes()) + "Z";
  const events = [];

  for (let dayIndex = 0; dayIndex < 6; dayIndex++)
  {
    const classes = classesFor(batchId, dayIndex);
    const classDate = new Date(mondayDate);
    classDate.setDate(mondayDate.getDate() + dayIndex);

    classes.forEach(entry =>
    {
      const dtStart = formatIcsDateTime(classDate, entry.start);
      const dtEnd = formatIcsDateTime(classDate, entry.end);
      const typeLabel = entry.t === "P" ? "Lab" : entry.t === "T" ? "Tutorial" : "Lecture";
      const summary = `${courseShort(entry)} (${typeLabel})`;
      const location = entry.r || "";
      const faculties = entry.f.map(facultyName).join(", ");

      const descriptionLines = [
        `Course: ${courseFull(entry)} (${entry.c})`,
        `Type: ${typeLabel}`,
        `Faculty: ${faculties || "N/A"}`,
        `Batch: ${batchId}`,
        `Campus: ${campus.label}`,
      ];

      const description = descriptionLines.join("\n");
      const uid = `${batchId}-${dayIndex}-${entry.s}-${entry.c}@jiit-tt`;

      const vevent = [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        "RRULE:FREQ=WEEKLY",
        `SUMMARY:${escapeIcsText(summary)}`,
      ];

      if (location)
      {
        vevent.push(`LOCATION:${escapeIcsText(location)}`);
      }

      vevent.push(`DESCRIPTION:${escapeIcsText(description)}`);
      vevent.push("END:VEVENT");

      events.push(vevent.join("\r\n"));
    });
  }

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JIIT Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:JIIT TT - ${batchId}`,
    ...events,
    "END:VCALENDAR",
  ];

  return icsLines.join("\r\n");
}

function downloadIcs(filename, content)
{
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function renderIcsExportTool(host)
{
  const semester = currentSemester();
  const campus = currentCampus();
  const batches = semester.batches;
  let activeBatch = batches.includes(selection.batch) ? selection.batch : batches[0];

  host.innerHTML =
    `<p class="tool-note">${escapeHtml(scopeLine())} · Export calendar</p>` +
    `<div class="tool-pair">` +
    `<label class="tool-field">` +
    `<span>Select Batch</span>` +
    `<select class="tool-select" id="icsBatchSelect">` +
    batches.map(b => `<option value="${escapeHtml(b)}"${b === activeBatch ? " selected" : ""}>Batch ${escapeHtml(b)}</option>`).join("") +
    `</select>` +
    `</label>` +
    `</div>` +
    `<div class="tool-status" id="icsSummary"></div>` +
    `<div class="tool-actions">` +
    `<button class="tool-btn" id="icsDownloadBtn">Export .ics File</button>` +
    `</div>` +
    `<p class="tool-fine">The downloaded file can be imported into Google Calendar, Apple Calendar, Outlook, or any standard calendar application.</p>`;

  const select = host.querySelector("#icsBatchSelect");
  const summaryEl = host.querySelector("#icsSummary");
  const downloadBtn = host.querySelector("#icsDownloadBtn");

  const updateSummary = () =>
  {
    activeBatch = select.value;
    let totalClasses = 0;
    let lectures = 0;
    let labs = 0;
    let tuts = 0;

    for (let day = 0; day < 6; day++)
    {
      const classes = classesFor(activeBatch, day);
      totalClasses += classes.length;
      classes.forEach(entry =>
      {
        if (entry.t === "L")
        {
          lectures++;
        }
        else if (entry.t === "P")
        {
          labs++;
        }
        else if (entry.t === "T")
        {
          tuts++;
        }
      });
    }

    summaryEl.className = "tool-status ok";
    summaryEl.innerHTML =
      `<b>Batch ${escapeHtml(activeBatch)} Summary</b><br/>` +
      `${totalClasses} total weekly classes (${lectures} Lectures, ${labs} Labs, ${tuts} Tutorials)`;
  };

  select.addEventListener("change", updateSummary);
  updateSummary();

  downloadBtn.addEventListener("click", () =>
  {
    const content = generateBatchIcs(activeBatch);
    const filename = `JIIT_${campus.label.replace(/[^a-zA-Z0-9]/g, "_")}_${activeBatch}.ics`;
    downloadIcs(filename, content);
  });
}
