# JIIT Timetable

A weekly timetable for JIIT-128 and JIIT-62 B.Tech students, Odd Semester 2026.
Pick your campus, semester and batch once, and the app remembers. It tells you
what class is on right now, what's next, and who's teaching it.

Built as a static site with no runtime dependencies, and it works with no signal.

## Running it

```bash
npm install
npm start
```

Then open <http://localhost:8888>.

`npm start` is only serving files — there is no build step, and nothing is
compiled or bundled. Editing a file and refreshing is the whole loop.

> The app uses ES modules, so it needs to be served over `http://` rather than
> opened as a `file://` path. Any static server will do; `npm start` just saves
> you picking one.

## What's here

```
index.html          markup and the SVG art; every script tag but one lives here
css/style.css       all styling, sectioned by feature
data/timetable.js   the four grids, encoded — see docs/DATA_FORMAT.md
sw.js               offline cache
js/
  main.js           start-up and wiring; the file to read first
  config.js         days, periods, colours, storage keys
  state.js          what the user is looking at, and the only place it's written
  schedule.js       turning encoded entries into times
  courses.js        course names, colours, lecturer names
  labels.js         naming the current selection
  util.js           escaping, clock helpers
  theme.js          dark/light, and the monkey who pulls the light on
  wordmark.js       sizing and animating the ASCII banner
  splash.js         the opening screen
  ui/               one module per region of the page
  tools/            the four utilities in the Tools sheet
```

### How it hangs together

`state.js` owns the selection — campus, semester, batch, day. Views never write to
it; they call a setter and re-render from the subscription in `main.js`. That is
the only control flow worth internalising:

```
click → state setter → emit → main.js render() → the views that care
```

Everything in `schedule.js` is arithmetic on minutes past midnight. The app never
constructs a `Date` for a class, which keeps it free of timezone questions it has
no business asking.

## Tools

Behind the grid icon in the header:

- **Teacher view** — search a lecturer, see their whole week
- **Free rooms** — which rooms are unbooked in a given period
- **Offline access** — save the app to the device, check for updates, remove it
- **Free-slot finder** — periods where two batches are both free

## Offline

A service worker precaches the app on first visit. Navigations are network-first,
so a deploy lands on the next online visit; everything else is served from cache
and refreshed in the background.

Two things have to stay in step when you add or rename a shipped file:

- the `CORE` list in `sw.js`
- the `CACHE` version string in `sw.js`, bumped on each deploy

`npm test` checks the first for you. It fails if `CORE` mentions a file that
doesn't exist, or if a shipped file is missing from `CORE`.

## Code style

Braces go on their own line:

```js
function entryPeriods(entry)
{
  if (entry.t !== "P")
  {
    return 1;
  }

  …
}
```

Object literals keep their brace on the assignment line — that's the usual Allman
convention, and it's what the linter can check.

```bash
npm run lint
```

ESLint enforces the brace style, indentation, quotes and a few correctness rules.
There is deliberately no Prettier: it has no Allman option and would reformat
every file against the house style on first run.

## No runtime dependencies

Nothing is shipped to the browser except the files in this repo. That is a
deliberate constraint rather than an oversight — the point of the app is that it
opens on a dead campus connection, and every CDN script is one more thing that has
to arrive first. The dev dependencies (ESLint, a static server) never reach a user.

## Data

`data/timetable.js` is generated from the official grids the institute publishes.
The encoding is documented in [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md).

If a class is wrong, that's a data bug, not a code bug — please open an issue with
the campus, semester, batch and day so it can be checked against the source grid.

## Deploying

Netlify, publishing the repo root. `netlify.toml` sets `Cache-Control` so every
asset revalidates: filenames carry no content hash, so this is what makes a deploy
take effect immediately.

## License

MIT — see [LICENSE](LICENSE).

The timetable data belongs to Jaypee Institute of Information Technology and is
reproduced here for students' convenience. This is an unofficial project and is
not affiliated with or endorsed by the institute.
