/* the tools sheet only ever shows one panel at a time, and they STACK. thats the
   whole point of this file - if you open teacher view, then tap a teacher to see
   their week, hitting back should take you to the teacher list, not fling you out
   to the menu.

   it lives in its own file so a panel can open another panel without two modules
   having to import each other and creating a lovely circular import. */

import { byId } from "../util.js";

const sheet = byId("toolsSheet");
const body = byId("toolsBody");
const title = byId("toolsTitle");
const backButton = byId("toolBack");

let renderRoot = () => {};
let stack = [];

/* the menu calls this once at startup to say "im the bottom of the stack" */
export function setRootPanel(render)
{
  renderRoot = render;
}

export function pushPanel(panelTitle, render)
{
  stack.push({ title: panelTitle, render });
  paint();
}

export function resetPanels()
{
  stack = [];
  paint();
}

/* one function that redraws whatever is on top. empty stack = the menu. */
function paint()
{
  const top = stack[stack.length - 1];

  backButton.hidden = !top;
  title.textContent = top ? top.title : "Tools";
  body.innerHTML = "";
  (top ? top.render : renderRoot)(body);
  /* always start a new panel at the top, otherwise you open a panel already
     scrolled halfway down because the last one was long */
  sheet.scrollTop = 0;
}

backButton.addEventListener("click", () =>
{
  stack.pop();
  paint();
});
