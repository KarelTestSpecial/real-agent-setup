---
title: "Testing Chrome extensions: `--load-extension` is blocked in branded Chrome"
category: technical
domain: extension-browser-testing
tier: 2
last_updated: 2026-10-10
---

# Testing Chrome extensions: `--load-extension` is blocked in branded Chrome

## The trap
Loading an unpacked extension into `google-chrome` (the branded build) **has not
worked since Chrome 137** — `--load-extension` was removed from production
Chrome. There is **no error message**: the browser starts, `chrome://extensions`
shows nothing, and the service worker never appears in `/json/list`. The natural
reading ("the MV3 worker is asleep", "the manifest is wrong", "my code is
broken") is exactly backwards — costing you half an hour of dead ends.
Chrome for Testing (`chrome-linux64`) still supports the switch.

## The fix
1. Fetch `https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json`
   → `channels.Stable.downloads.chrome` (`linux64`). Note that
   `versions-with-downloads.json` returns **404**; only the `last-known-good-…`
   variant exists.
2. Install permanently (not in `/tmp`): `~/.local/share/chrome-for-testing/<version>/chrome-linux64/`,
   keep the `chrome-linux64.zip` next to it as the install archive, and add a
   launcher `~/.local/bin/chrome-for-testing` (`exec …"$@"`) on your PATH.
   The sandbox works **without** `--no-sandbox` (user namespaces are available).
3. Register the tool in `~/BRAIN/system-info/TOOL_REGISTER.md` — one line per
   new reusable tool (rule 1.b).
4. Run it with a separate `--user-data-dir`, `--remote-debugging-port`, and
   `--load-extension="<path to unpacked extension>"`.

## Three CDP pitfalls from the same test session
1. **Wake the MV3 worker without stacking tabs.** The worker sleeps when idle,
   and the only reliable wake is a `chrome.runtime.sendMessage` from one of its
   own pages. **Reuse that page and never recurse**: one new page per wake sends
   dozens of blank tabs flooding in, and Chrome throttles the burst. (One such
   recursive wake loop produced a visible flood of tabs.)
2. **Pick the right worker.** `service_worker … /background.js` also matches
   *other* extensions; filter candidates on `chrome.runtime.getManifest().name`,
   never on URL — otherwise you test someone else's code and read
   "function not defined" as if it were your bug.
3. **`tab.url` *is* readable for your own extension pages** (also via
   `windows.getAll({populate:true})`) without the `tabs` permission. Do not add
   a broad permission just to find your own pages — it is an unnecessary
   privacy claim in the Web Store.

## Verification pattern
Chrome APIs you cannot fire programmatically (toolbar clicks, context menus)
are tested through the functions the listener calls, in the worker context via
`Runtime.evaluate`. For menu items you cannot enumerate (Chrome 155 has no
`contextMenus.getAll`) a **duplicate-id probe** works: `create({id: "…"})`
returns "Cannot create item with duplicate id" when the item already exists.
