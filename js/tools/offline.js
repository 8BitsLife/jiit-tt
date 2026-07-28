/* offline access - this is just the little control panel. the actual caching
   brain lives in sw.js at the root. */

/* every cache this app makes starts with this prefix. sw.js uses the exact same
   one to sweep away its old versions, so if you change it here change it there
   too or youll leave dead caches lying around forever. */
const CACHE_PREFIX = "tt-";

/* service workers and the cache api flat out dont exist unless the page is on a
   secure origin. localhost counts as secure, which is why local testing works. */
export function canWorkOffline()
{
  const secure = location.protocol === "https:" || location.hostname === "localhost";
  return secure && "serviceWorker" in navigator && "caches" in window;
}

export function registerServiceWorker()
{
  if (!("serviceWorker" in navigator))
  {
    return Promise.resolve(null);
  }

  /* swallow the error on purpose. if registration fails the site still works
     perfectly, you just dont get offline mode - not worth an error on screen. */
  return navigator.serviceWorker.register("sw.js").catch(() => null);
}

async function ourCaches()
{
  const keys = await caches.keys();
  return keys.filter(key => key.startsWith(CACHE_PREFIX));
}

export function renderOfflineTool(host)
{
  host.innerHTML = `
    <p class="tool-note">Stores the app in this browser so it opens with no signal.</p>
    <div class="tool-status" id="offlineStatus">Checking…</div>
    <div class="tool-actions" id="offlineActions">
      <button class="tool-btn" id="offlineUpdate">Check for updates</button>
      <button class="tool-btn ghost" id="offlineClear">Remove offline copy</button>
    </div>`;

  const status = host.querySelector("#offlineStatus");
  const actions = host.querySelector("#offlineActions");

  /* two different reasons this can be unavailable and they need different
     wording, because "your browser is too old" and "youre on http" are very
     different problems and only one is fixable by the user */
  if (!("serviceWorker" in navigator) || !("caches" in window))
  {
    status.textContent = "This browser can’t store the app offline.";
    actions.hidden = true;
    return;
  }

  if (!canWorkOffline())
  {
    status.textContent = "Offline storage needs the site served over HTTPS.";
    actions.hidden = true;
    return;
  }

  /* "saved" needs BOTH a registered worker and actual files in a cache. a worker
     that registered but hasnt finished downloading yet would otherwise claim you
     can go offline, and then you couldnt. */
  const refresh = async () =>
  {
    const registration = await navigator.serviceWorker.getRegistration();
    const stored = await ourCaches();
    const ready = Boolean(registration) && stored.length > 0;

    if (!registration)
    {
      status.textContent = "Not saved yet.";
    }
    else if (ready)
    {
      status.textContent = "Saved — the timetable opens without a connection.";
    }
    else
    {
      status.textContent = "Installing…";
    }

    status.classList.toggle("ok", ready);
  };

  host.querySelector("#offlineUpdate").addEventListener("click", async () =>
  {
    status.textContent = "Checking…";
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration)
    {
      await registration.update();
    }
    else
    {
      await registerServiceWorker();
    }

    /* the update lands whenever it lands, theres no promise to await for the new
       worker being live. so wait a beat before re-reading, otherwise it always
       says "installing" even when its done. */
    setTimeout(refresh, 900);
  });

  host.querySelector("#offlineClear").addEventListener("click", async () =>
  {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration)
    {
      await registration.unregister();
    }

    for (const key of await ourCaches())
    {
      await caches.delete(key);
    }

    status.classList.remove("ok");
    status.textContent = "Removed. It comes back next time you load the page.";
  });

  refresh();
}
