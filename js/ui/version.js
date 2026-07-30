/* the little version line at the bottom of the page.

   normally you never need to touch it - the app updates itself, see
   reloadOnUpdate() in js/tools/offline.js. the button is there for the one case
   that still exists: someone convinced theyre on an old copy and wanting to
   prove it to themselves. */

import { APP_VERSION } from "../config.js";
import { byId } from "../util.js";
import { canWorkOffline, registerServiceWorker } from "../tools/offline.js";

export function initVersion()
{
  const label = byId("appVersion");
  const button = byId("versionCheck");

  if (!label)
  {
    return;
  }

  label.textContent = `v${APP_VERSION}`;

  if (!button)
  {
    return;
  }

  /* no service worker means nothing is cached, so there is nothing to check and
     the button would just lie to them */
  if (!canWorkOffline())
  {
    button.hidden = true;
    return;
  }

  button.addEventListener("click", async () =>
  {
    button.disabled = true;
    button.textContent = "Checking…";

    const registration = await navigator.serviceWorker.getRegistration();

    if (registration)
    {
      await registration.update();
    }
    else
    {
      await registerServiceWorker();
    }

    /* if an update was waiting, the worker takes over and reloadOnUpdate()
       reloads the page out from under this - so this text is only ever seen
       when they were already on the newest build. */
    setTimeout(() =>
    {
      button.textContent = "Up to date";
      button.disabled = false;
    }, 1200);
  });
}
