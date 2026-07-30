/* the offline cache. this is what lets the site open with zero signal, which on
 * campus is basically the whole point.
 *
 * READ THIS BEFORE YOU DEPLOY: bump CACHE below every single time. activate()
 * deletes every other cache starting with "tt-", and that is the only thing
 * stopping people being stuck on an ancient version foreverrrr. that same "tt-"
 * prefix is written again in js/tools/offline.js, keep the two in step.
 *
 * also this is a classic worker, NOT a module. module service workers still arent
 * supported everywhere and theres genuinely nothing in this file worth breaking
 * somebodys browser over.
 */

const CACHE = "tt-v28";

/* every file needed to open the app with no connection. yes you do have to add
   new ones here by hand - but `npm test` cross checks this list against whats
   actually on disk, so if you rename a module and forget, it shouts at you
   instead of silently leaving it out of the offline copy. */
const CORE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./data/timetable.js",
  "./js/config.js",
  "./js/courses.js",
  "./js/labels.js",
  "./js/main.js",
  "./js/schedule.js",
  "./js/splash.js",
  "./js/state.js",
  "./js/theme.js",
  "./js/util.js",
  "./js/wordmark.js",
  "./js/tools/free-slots.js",
  "./js/tools/index.js",
  "./js/tools/offline.js",
  "./js/tools/panels.js",
  "./js/tools/rooms.js",
  "./js/tools/teachers.js",
  "./js/ui/course-legend.js",
  "./js/ui/day-slide.js",
  "./js/ui/day-tabs.js",
  "./js/ui/pickers.js",
  "./js/ui/schedule-list.js",
  "./js/ui/sheet.js",
  "./js/ui/status-bar.js",
  "./js/ui/swipe.js",
  "./js/ui/version.js",
];

self.addEventListener("install", event =>
{
  event.waitUntil(
    caches.open(CACHE)
      /* deliberately NOT cache.addAll here. addAll is all or nothing, so one
         single wrong path and the user ends up with no offline copy whatsoever.
         adding them one by one means a typo costs you one file, not everything. */
      .then(cache => Promise.all(CORE.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()));
});

self.addEventListener("activate", event =>
{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("tt-") && key !== CACHE)
          .map(key => caches.delete(key))))
      .then(() => self.clients.claim()));
});

self.addEventListener("message", event =>
{
  if (event.data === "skip-waiting")
  {
    self.skipWaiting();
  }
});

/* the page itself goes to the NETWORK first. this is the important one - it means
   the second someone has signal they get the newest version, and the cached copy
   is only the backup for when they dont. do it the other way round and people
   would happily be reading last months timetable. */
function handleNavigation(request)
{
  return fetch(request)
    .then(response =>
    {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put("./index.html", copy));
      return response;
    })
    .catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")));
}

/* everything else (css, js, the data) comes straight out of the cache instantly
   and then quietly refreshes itself in the background ready for next time. thats
   why the app opens the moment you tap it even on horrible wifi. */
function handleAsset(request)
{
  return caches.match(request).then(hit =>
  {
    const fromNetwork = fetch(request)
      .then(response =>
      {
        if (response && (response.ok || response.type === "opaque"))
        {
          caches.open(CACHE).then(cache => cache.put(request, response.clone()));
        }

        return response;
      })
      .catch(() => hit);

    return hit || fromNetwork;
  });
}

self.addEventListener("fetch", event =>
{
  const request = event.request;

  if (request.method !== "GET")
  {
    return;
  }

  /* we only ever touch our own files plus google fonts. everything else we keep
     our hands completely off and let the browser handle it normally. */
  const url = new URL(request.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);

  if (!sameOrigin && !isFont)
  {
    return;
  }

  event.respondWith(request.mode === "navigate" ? handleNavigation(request) : handleAsset(request));
});
