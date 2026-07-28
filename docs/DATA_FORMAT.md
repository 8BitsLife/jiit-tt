# The timetable encoding

`data/timetable.js` holds all four grids — JIIT-128 and JIIT-62, I Sem and III Sem —
in a compact string format rather than as JSON. Decoded, the data is around 150 KB
of JSON; encoded, the whole file is 58 KB. On campus wifi that difference is the
difference between the app opening instantly and not.

This page explains the format so the file is readable if you ever need to check
something by hand.

## Shape after decoding

```js
CAMPUSES["128"].sems["3"] = {
  sub: "B.Tech II Year · III Sem · Odd 2026 · JIIT-128",
  cm: 50,          // minutes in a lecture or tutorial
  lm: 110,         // minutes in a normal two-period practical
  lunch: 4,        // lunch follows this period index
  batches: ["F1", "F2", …],
  week: [ [ …Monday entries ], [ …Tuesday ], … ],   // six days, Monday first
}
```

A single entry:

```js
{ s: 0, t: "P", c: "24B15CS213", r: "CL2", f: ["RSK", "KSA"], b: ["F1", "F2"] }
```

| Field | Meaning |
| --- | --- |
| `s` | Period index. `0` is 9:00; periods are 60 minutes apart. |
| `t` | `L` lecture, `T` tutorial, `P` practical. |
| `c` | Course code — a key into `COURSES`. |
| `r` | Room. May be empty: a few entries carry no room in the official grid. |
| `f` | Faculty initials, keys into that campus's faculty table. |
| `b` | Batches attending. |

## The encoding

Three separators, nested:

| Separator | Splits |
| --- | --- |
| `~` | days of the week |
| `;` | records within a day |
| `\|` | fields within a record |

So a week reads `day0~day1~day2~…`, a day reads `record;record;record`, and a
record reads `s\|t\|codeIndex\|r\|f\|b`.

Two fields have their own inner separator, chosen so they don't collide:
faculty initials are joined with `/`, and batches with `,`.

An empty day is an empty string — Sundays aren't stored, so a six-day week with
nothing on Saturday ends in `~`.

### Course codes are stored by index

`c` is not the course code itself but a position in the `CODES` array at the top
of the file. Codes like `24B15CS213` are 10 characters and repeat hundreds of
times; an index is one or two. This is where most of the size saving comes from.

### The lookup tables

`COURSES` and the two faculty tables use a flatter version of the same idea —
`KEY|value|value;KEY|value|value` — decoded by `parseRecords()`.

## Working out how long a class runs

The period grid is uniform (one hour), but classes are not:

- lectures and tutorials run `cm` minutes
- practicals run `lm` minutes, which covers **two** periods
- a practical listed in `LAB_PERIODS` (`js/config.js`) covers more — Engineering
  Drawing & Design is merged across three columns in both I Sem grids, so it runs
  `lm + 60` minutes

`entryMinutes()` and `entryPeriods()` in `js/schedule.js` are the only places this
is worked out. Nothing else should be doing period arithmetic.

## Regenerating

The file is generated from the official PDF and XLSX grids the institute
publishes. If you edit it by hand, keep two things in mind:

- the header comment says it is generated, so the next regeneration will discard
  your change
- `npm test` will not catch a data error — it only checks that the offline cache
  list matches the files on disk

The safest hand-edit is none. If a class is wrong, the fix belongs in whatever
produced the file.
