/* sw.js has a hand written list of files to cache, and absolutely nothing keeps
   it in step with the repo on its own. so this little script nags you about it,
   in both directions:

     - is every path listed in CORE actually on disk
     - is every file we ship actually listed in CORE

   the second one is the one that saves you. forget it and the app half works
   offline, which is worse than not working at all because you dont notice.

   run it with `npm test`. */

import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* the folders that actually get served to a browser. anything outside these is
   tooling and has no business being in the offline cache. */
const SHIPPED_DIRS = ["css", "data", "js"];

async function filesUnder(dir)
{
  const entries = await readdir(path.join(root, dir), { withFileTypes: true, recursive: true });

  return entries
    .filter(entry => entry.isFile())
    .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)))
    .map(file => "./" + file.split(path.sep).join("/"));
}

function coreList()
{
  const source = readFileSync(path.join(root, "sw.js"), "utf8");
  const block = /const CORE = \[([\s\S]*?)\];/.exec(source);

  if (!block)
  {
    throw new Error("could not find the CORE array in sw.js");
  }

  return [...block[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
}

const core = coreList();
const problems = [];

/* skip "./" - thats the directory index, it has no file of its own to find */
for (const entry of core)
{
  if (entry !== "./" && !existsSync(path.join(root, entry)))
  {
    problems.push(`sw.js precaches ${entry}, which does not exist`);
  }
}

for (const dir of SHIPPED_DIRS)
{
  for (const file of await filesUnder(dir))
  {
    if (!core.includes(file))
    {
      problems.push(`${file} is shipped but missing from the CORE list in sw.js`);
    }
  }
}

/* The footer shows APP_VERSION, but what actually decides whether someone gets
   the new build is the cache name in sw.js. If those two drift, the footer
   confidently reports a version the user is not running — which is exactly the
   confusion the version line exists to prevent. */
const swSource = readFileSync(path.join(root, "sw.js"), "utf8");
const cacheName = /const CACHE = "([^"]+)"/.exec(swSource);
const appVersion = /export const APP_VERSION = "([^"]+)"/.exec(
  readFileSync(path.join(root, "js", "config.js"), "utf8"));

if (!cacheName || !appVersion)
{
  problems.push("could not read CACHE from sw.js or APP_VERSION from js/config.js");
}
else if (cacheName[1] !== `tt-v${appVersion[1]}`)
{
  problems.push(
    `APP_VERSION is "${appVersion[1]}" so sw.js should cache "tt-v${appVersion[1]}", ` +
    `but it says "${cacheName[1]}" — bump both together`);
}

if (problems.length)
{
  console.error("Offline cache is out of step:\n");
  problems.forEach(problem => console.error("  - " + problem));
  process.exit(1);
}

console.log(`Offline cache OK — ${core.length} entries, all present and accounted for.`);
