/* all the "facts" about how JIIT runs its timetables, plus the colours we paint
   them with. nothing in here ever changes while the app is running - if you want
   to tweak how the app looks or behaves, this is the first place to look. */

/* bumped on every deploy, and shown in the footer so anyone reporting a problem
   can tell you exactly which build they are looking at. `npm test` checks this
   against the cache name in sw.js, because the two drifting apart is the whole
   reason people end up stuck on an old copy.

   it is a plain string, never compared or sorted, so read it as "major.minor" and
   bump whichever half you mean - 2.9 goes to 2.10, or to 3.0 for something big. */
export const APP_VERSION = "2.9";

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

/* the college day is 8 periods, one hour apart, starting at 9am. note the periods
   are always an hour apart even though the class inside one runs 50 or 60 mins -
   that leftover gap is the changeover time to walk to your next room. thats
   exactly why cm and lm are stored per semester in the data file and not here. */
export const DAY_START = 9 * 60;
export const SLOT_LENGTH = 60;
export const SLOT_COUNT = 8;

/* labs take up 2 periods normally. anything listed here takes more. engineering
   drawing is the one weirdo - its merged across 3 columns in both I Sem grids, so
   it runs a solid 3 hours. keyed by just the subject letters+number so it still
   matches the prefixed versions like "18B15GE111". */
export const LAB_PERIODS = { GE111: 3 };

export const SEM_META = {
  "3": { label: "II Year · III Sem", chip: "Sem 3" },
  "1": { label: "I Year · I Sem", chip: "Sem 1" },
};

/* the little colour stripe on each class card. exact course codes win first, and
   if a code isnt listed it falls back to the colour for its subject letters (so
   every maths paper looks maths-y even if i never listed that specific code). */
export const COURSE_COLORS = {
  "25B11MA213": "#D9B04A",
  "15B11CI311": "#6FCF97",
  "15B17CI371": "#58C2A8",
  "24B11CS212": "#B08CE8",
  "24B11CS213": "#E8875A",
  "24B15CS213": "#DE7268",
  "15B11HS211": "#6FA8DC",
  "24B15CS214": "#B8C46A",
  "24B15CS215": "#E87BAF",
};

export const SUBJECT_COLORS = {
  MA: "#D9B04A",
  CI: "#6FCF97",
  CS: "#58C2A8",
  EC: "#E8875A",
  HS: "#6FA8DC",
  PH: "#8ED0E0",
  BT: "#7CC96F",
  GE: "#B08CE8",
  ME: "#E87BAF",
};

/* boring beige for anything we genuinely have no colour for */
export const FALLBACK_COLOR = "#C9BFA8";

/* localStorage keys. all prefixed "tt-" so we never stomp on something else
   living on the same domain. */
export const STORAGE = {
  campus: "tt-campus",
  sem: "tt-sem",
  batch: "tt-batch",
  theme: "tt-theme",
};
