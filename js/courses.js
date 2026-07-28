/* the human readable side of a class - what its actually called, who teaches it,
   and what colour the little stripe on the card is. */

import { COURSES } from "../data/timetable.js";
import { COURSE_COLORS, FALLBACK_COLOR, SUBJECT_COLORS } from "./config.js";
import { currentCampus } from "./state.js";

/* the name printed on the card. some grids give a lab the SAME course code as its
   lecture, so if this is a practical and the name doesnt already say "Lab" we
   stick it on - otherwise youd see two identical looking cards and have no idea
   which one is the lab. */
export function courseShort(entry)
{
  const course = COURSES[entry.c];
  const name = course ? course.short : entry.c;

  if (entry.t === "P" && !/Lab/i.test(name))
  {
    return name + " Lab";
  }

  return name;
}

/* the long proper name, the one you get when you tap a card open */
export function courseFull(entry)
{
  const course = COURSES[entry.c];
  return course ? course.full : entry.c;
}

export function courseColor(code)
{
  if (COURSE_COLORS[code])
  {
    return COURSE_COLORS[code];
  }

  /* no exact match, so fall back to the subject. the two subject letters are
     always sitting right before the last three digits*/
  const subject = code.match(/([A-Z]{2})\d{3}$/);
  return (subject && SUBJECT_COLORS[subject[1]]) || FALLBACK_COLOR;
}

/* the college writes these in the grid when a teacher hadnt been decided yet at
   the time it was published. showing you "NFCS24" helps nobody, so we translate. */
const PLACEHOLDERS = [
  [/^NFCS/i, "New Faculty · CSE"],
  [/^NFMATHS/i, "New Faculty · Maths"],
  [/^NFHSS/i, "New Faculty · HSS"],
  [/^NF\d/i, "New Faculty"],
];

/* teachers are written as initials in the grid... except when theyre not. some
   cells just have the whole name typed in already, so
   anything long enough to obviously be a name gets nicely capitalised instead of
   being looked up and failing. real data is messy, this is the mess. */
export function facultyName(abbr)
{
  const known = currentCampus().faculty[abbr.toUpperCase()];

  if (known)
  {
    return known;
  }

  for (const [pattern, label] of PLACEHOLDERS)
  {
    if (pattern.test(abbr))
    {
      return label;
    }
  }

  if (abbr.length >= 4)
  {
    return abbr
      .split(/\s+/)
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  /* genuinely just initials we dont have a name for. show them as is. */
  return abbr;
}
