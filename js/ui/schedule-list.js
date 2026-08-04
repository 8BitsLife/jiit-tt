/* the main event - the actual list of classes for the day, one card each, with
   the free time in between marked out so you can see your gaps at a glance. */

import { DAY_NAMES, SLOT_LENGTH } from "../config.js";
import { courseColor, courseFull, courseShort, facultyName } from "../courses.js";
import { classesFor, lunchStart } from "../schedule.js";
import { currentSemester, selection } from "../state.js";
import { byId, escapeHtml, formatTime, nowMinutes, todayIndex } from "../util.js";

const list = byId("schedule");
const summary = byId("daySummary");
const hint = byId("tapHint");

/* anything shorter than this isnt free time, its just the walk to the next room.
   showing "10 min free" between back to back classes would be silly. */
const GAP_MIN = 15;

/* remember which cards you opened. the page quietly refreshes every 30s and
   without this every card youd expanded would snap shut while you were reading
   it, which was deeply annoying. the key has to include campus/sem/batch/day too,
   otherwise switching batch would leave a random unrelated card hanging open. */
const expandedKeys = new Set();

function cardKey(entry)
{
  const { campus, sem, batch, day } = selection;
  return `${campus}|${sem}|${batch}|${day}|${entry.s}|${entry.c}|${entry.t}`;
}

/* theres only room for about two names before the card looks stuffed, so the rest
   become "+2" and you get the full list when you tap it open. */
function shortFacultyList(initials)
{
  if (!initials.length)
  {
    return "";
  }

  const shown = initials.slice(0, 2).join(" · ");
  const rest = initials.length - 2;

  return rest > 0 ? `${shown} +${rest}` : shown;
}

/* the little LEC / TUT / LAB tag. labs say how many hours because a 2 hour lab
   and a 3 hour one look identical otherwise, and that matters a lot when youre
   deciding whether to go home in between. */
function typeLabel(entry)
{
  if (entry.t === "T")
  {
    return "TUT";
  }

  if (entry.t !== "P")
  {
    return "LEC";
  }

  const hours = Math.round((entry.end - entry.start) / 60);
  return `LAB · ${hours} HR${hours > 1 ? "S" : ""}`;
}

/* if a break sits across the lunch period we call it lunch instead of just "1 hr
   free". the maths: skipping ONLY lunch leaves a gap of one period minus the
   class length, so anything bigger than that is lunch PLUS real free time, and we
   say so. */
function gapLabel(gapMinutes, previousEnd, nextStart)
{
  const lunch = lunchStart();
  const isLunch = previousEnd <= lunch && nextStart > lunch;

  if (isLunch)
  {
    const semester = currentSemester();
    const extra = Math.round((gapMinutes - (2 * SLOT_LENGTH - semester.cm)) / 60);
    const text = extra >= 1 ? `Lunch + ${extra} hr${extra > 1 ? "s" : ""} free` : "Lunch break";
    return { text, isLunch };
  }

  const hours = Math.floor(gapMinutes / 60);
  const text = hours >= 1 ? `${hours} hr free` : `${gapMinutes} min free`;

  return { text, isLunch };
}

/* When the whole day is sliding in as one page, the rows must NOT also play
   their own entrance — two animations at once looks frantic. Killing it inline
   rather than from a parent class matters: a class would stop applying the
   moment the slide finished, and every card would then animate in late. */
function setEntrance(element, index, animate)
{
  if (animate)
  {
    element.style.animationDelay = `${index * 40}ms`;
  }
  else
  {
    element.style.animation = "none";
  }
}

function buildGapRow(gapMinutes, previousEnd, nextStart, index, animate)
{
  const { text, isLunch } = gapLabel(gapMinutes, previousEnd, nextStart);

  const row = document.createElement("li");
  row.className = "gap-row" + (isLunch ? " lunch" : "");
  row.innerHTML = `<span>${text}</span>`;
  /* staggered so the rows cascade in instead of all appearing at once */
  setEntrance(row, index, animate);

  return row;
}

/* Opens and closes the detail panel by animating its real, measured height.
   Handing the height back to `auto` at the end matters: a long teacher list can
   reflow later, and a pinned pixel height would quietly clip it. */
function setPanelHeight(card, detail, open, animate)
{
  if (!animate)
  {
    detail.style.height = open ? "auto" : "0px";
    return;
  }

  if (open)
  {
    detail.style.height = `${detail.scrollHeight}px`;

    detail.addEventListener("transitionend", function done(event)
    {
      if (event.propertyName !== "height")
      {
        return;
      }

      detail.removeEventListener("transitionend", done);

      /* they may have closed it again before this landed */
      if (card.classList.contains("expanded"))
      {
        detail.style.height = "auto";
      }
    });

    return;
  }

  /* There is nothing to animate *from* while the height is "auto", so pin the
     current pixel height and force the browser to accept it before collapsing. */
  detail.style.height = `${detail.getBoundingClientRect().height}px`;
  void detail.offsetHeight;
  detail.style.height = "0px";
}

function buildCard(entry, index, animate)
{
  const card = document.createElement("li");
  card.className = "class-card";
  /* start/end live on the element so the 30s tick can find whats happening now
     without recalculating anything or touching the data again */
  card.dataset.start = entry.start;
  card.dataset.end = entry.end;
  card.style.setProperty("--accent", courseColor(entry.c));
  setEntrance(card, index, animate);

  const facultyRows = entry.f
    .map(initials =>
      `<li><span class="fname">${escapeHtml(facultyName(initials))}</span>` +
      `<span class="fabbr">${escapeHtml(initials)}</span></li>`)
    .join("");

  /* a few entries (the biotech labs mainly) have no room at all in the official
     grid, so the "·" separator has to be conditional too - otherwise youd get a
     sad floating dot with nothing on one side of it. */
  const room = entry.r ? `<span class="room">${escapeHtml(entry.r)}</span>` : "";
  const separator = entry.r && entry.f.length ? `<span class="dot">·</span>` : "";
  const staff = entry.f.length ? `<span>${escapeHtml(shortFacultyList(entry.f))}</span>` : "";

  card.innerHTML = `
    <button class="card-main" aria-expanded="false">
      <div class="when">
        <span class="start">${formatTime(entry.start)}</span>
        <span class="end">${formatTime(entry.end)}</span>
        <span class="chip">${typeLabel(entry)}</span>
      </div>
      <div class="what">
        <div class="course-name">${escapeHtml(courseShort(entry))}<span class="now-tag">NOW</span></div>
        <div class="meta">${room}${separator}${staff}</div>
      </div>
      <svg class="caret" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="card-detail">
      <div class="card-detail-inner">
        <p class="full-title">${escapeHtml(courseFull(entry))} <span class="code">${escapeHtml(entry.c)}</span></p>
        ${entry.f.length ? `<p class="detail-label">Taught by</p><ul class="fac-list">${facultyRows}</ul>` : ""}
      </div>
    </div>
    <span class="now-line"><i></i></span>`;

  const button = card.querySelector(".card-main");
  const detail = card.querySelector(".card-detail");
  const key = cardKey(entry);

  /* `hidden` used to do this, but it is a hard on/off with nothing for a
     transition to interpolate — which is why tapping a card used to snap.
     The panel is kept out of the tab order and away from screen readers by
     `visibility` in the stylesheet, which unlike `display` can be transitioned,
     so it stays readable for the whole closing animation. */
  const setOpen = (open, animate = true) =>
  {
    button.setAttribute("aria-expanded", String(open));
    card.classList.toggle("expanded", open);
    setPanelHeight(card, detail, open, animate);
  };

  /* Restored from a previous render — it was already open, so it should just be
     open, not replay the animation. */
  if (expandedKeys.has(key))
  {
    setOpen(true, false);
  }

  button.addEventListener("click", () =>
  {
    const open = !card.classList.contains("expanded");
    setOpen(open);

    if (open)
    {
      expandedKeys.add(key);
    }
    else
    {
      expandedKeys.delete(key);
    }
  });

  return card;
}

/* `animateCards` is off while the day is sliding — see js/ui/day-slide.js. */
export function renderSchedule({ animateCards = true } = {})
{
  const classes = classesFor(selection.batch, selection.day);
  const dayName = DAY_NAMES[selection.day];
  list.innerHTML = "";

  /* a free day deserves a nice empty state, not a blank hole in the page */
  if (!classes.length)
  {
    summary.textContent = `${dayName} · no classes`;
    hint.hidden = true;
    list.innerHTML = `
      <li class="empty">
        <div class="glyph">✶</div>
        <h3>Nothing scheduled</h3>
        <p>Batch ${escapeHtml(selection.batch)} has no classes on ${dayName}.</p>
      </li>`;
    return;
  }

  hint.hidden = false;

  const plural = classes.length > 1 ? "es" : "";
  const first = formatTime(classes[0].start);
  const last = formatTime(classes[classes.length - 1].end);
  summary.textContent = `${dayName} · ${classes.length} class${plural} · ${first} – ${last}`;

  classes.forEach((entry, index) =>
  {
    /* look back at the previous class and drop a gap row in if theres a real
       break between them */
    if (index > 0)
    {
      const previousEnd = classes[index - 1].end;
      const gap = entry.start - previousEnd;

      if (gap > GAP_MIN)
      {
        list.appendChild(buildGapRow(gap, previousEnd, entry.start, index, animateCards));
      }
    }

    list.appendChild(buildCard(entry, index, animateCards));
  });

  refreshCardStates();
}

/* marks whats happening now and whats already finished, editing the existing
   cards in place. we deliberately do NOT rebuild the list here - if we did, every
   card would replay its slide-in animation twice a minute and the page would look
   like its having a seizure. */
export function refreshCardStates()
{
  const isToday = selection.day === todayIndex();
  const now = nowMinutes();

  list.querySelectorAll(".class-card").forEach(card =>
  {
    const start = Number(card.dataset.start);
    const end = Number(card.dataset.end);

    /* only ever highlight "now" on the day thats actually today, obviously */
    const isPast = isToday && now >= end;
    const isNow = isToday && now >= start && now < end;

    card.classList.toggle("past", isPast);
    card.classList.toggle("now", isNow);

    /* the thin progress bar creeping across the current class */
    const bar = card.querySelector(".now-line i");

    if (bar)
    {
      bar.style.width = isNow ? Math.round(((now - start) / (end - start)) * 100) + "%" : "0%";
    }
  });
}
