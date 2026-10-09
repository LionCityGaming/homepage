/* ============================================================================
   Homepage custom.js: helpers for the Hub glass theme (custom.css).
   One debounced MutationObserver re-runs every tagger whenever the page changes,
   because Homepage renders on the client and swaps the visible groups per tab.
   ============================================================================ */
(function () {
  "use strict";

  const root = document.documentElement;
  const PHONE = window.matchMedia("(pointer: coarse), (max-width: 1024px)");  // same query as the phone CSS

  const setData = (el, key, value) => { if (el.dataset[key] !== value) el.dataset[key] = value; };

  /* ---------- tabs: phones always show the Mobile tab; <html data-tab> names the open tab ---------- */
  function activeTab() {
    const b = document.querySelector('#myTab [role="tab"][aria-selected="true"]');
    return b ? b.id.replace(/-tab$/, "").toLowerCase() : "";
  }

  function tabs() {
    if (PHONE.matches && activeTab() !== "mobile") document.getElementById("Mobile-tab")?.click();
    setData(root, "tab", activeTab());
  }

  /* ---------- section accent colours (header dot, hover glow, bookmark chips) ---------- */
  const ACCENTS = [
    ["infrastructure", "100, 210, 255"], ["networking", "48, 209, 88"], ["acquisition", "255, 159, 10"],
    ["media tools", "255, 55, 95"], ["productivity", "191, 90, 242"], ["utilities", "94, 92, 230"],
    ["3d printing", "255, 159, 10"],
    ["homelab help", "94, 92, 230"], ["homelab", "100, 210, 255"],  // "homelab help" first, so it gets its own colour
    ["reference", "255, 214, 10"], ["shopping", "48, 209, 88"], ["social", "255, 55, 95"],  // Social & Media took over Entertainment's pink (blue sat beside Homelab's two blues)
    ["tools", "172, 142, 104"], ["work", "191, 90, 242"], ["servers", "10, 132, 255"],
    ["apps", "48, 209, 88"],
  ];

  function sectionAccents() {
    document.querySelectorAll(".services-group, .bookmark-group").forEach((g) => {
      if (g.dataset.acc) return;
      const name = g.querySelector(".service-group-name, .bookmark-group-name");
      if (!name) return;
      const text = name.textContent.toLowerCase();
      const hit = ACCENTS.find(([key]) => text.includes(key));
      if (hit) {
        g.style.setProperty("--acc-rgb", hit[1]);
        g.style.setProperty("--acc", `rgb(${hit[1]})`);
      }
      g.dataset.acc = hit ? hit[0] : "default";
    });
  }

  /* ---------- Bookmarks: sections in a peak, the most links in the middle stepping down to the fewest at
     both ends (3 4 6 7 7 6 6 4; the page is centred, so its empty space falls away at the corners):
     sorted fewest first (ties keep settings.yaml order), then dealt out alternately to the left and right
     ends, so the biggest land in the middle ---------- */
  function sortBookmarks() {
    const on = root.dataset.tab === "bookmarks";
    const groups = [...document.querySelectorAll(".services-group")];
    const ranked = (on ? groups.filter((g) => g.offsetParent !== null) : [])
      .map((g, i) => ({ g, n: g.querySelectorAll("li.service").length, i }))
      .sort((a, b) => a.n - b.n || a.i - b.i);
    const pos = new Map();
    ranked.forEach((r, k) => pos.set(r.g, k % 2 === 0 ? k / 2 : ranked.length - 1 - (k - 1) / 2));
    groups.forEach((g) => {
      const order = pos.has(g) ? String(pos.get(g)) : "";
      if (g.style.order !== order) g.style.order = order;
    });
  }

  /* ---------- top bar: disk colours and icons, Hub clock, weather mood ---------- */
  const DISKS = [["docker vm", "docker", "10, 132, 255"], ["nas storage", "nas", "48, 209, 88"], ["usb backup", "usb", "255, 159, 10"]];

  function disks() {
    // the whole widget (bar + label); Homepage gives the resources widget no class of its own
    document.querySelectorAll(".widget-container").forEach((w) => {
      const text = w.textContent.toLowerCase();
      const disk = DISKS.find(([label]) => text.includes(label));
      if (!disk) return;
      const pct = parseFloat(w.querySelector(".resource-usage > div")?.style.width);
      const rgb = pct > 90 ? "255, 69, 58" : pct > 75 ? "255, 159, 10" : disk[2];  // red above 90 %, amber above 75 %
      if (w.style.getPropertyValue("--bar-rgb") !== rgb) w.style.setProperty("--bar-rgb", rgb);
      setData(w, "disk", disk[1]);
    });
  }

  function clock() {
    // two datetime widgets: the one showing a time is the big clock, the other the date capsule
    document.querySelectorAll(".information-widget-datetime").forEach((d) => {
      setData(d, "clock", d.textContent.includes(":") ? "time" : "date");
    });
  }

  function weather() {
    let w = document.querySelector(".information-widget-openweathermap, .information-widget-openmeteo");
    if (!w) {  // fallback in case Homepage drops the widget class (it does for the resources widget)
      w = [...document.querySelectorAll("#information-widgets .widget-container")].find((c) => c.textContent.includes("°"));
    }
    if (w && !w.classList.contains("hp-weather")) w.classList.add("hp-weather");
    const t = w ? w.textContent.toLowerCase() : "";
    let mood = "clear";
    if (/thunder/.test(t)) mood = "storm";
    else if (/rain|drizzle|shower/.test(t)) mood = "rain";
    else if (/overcast|fog|mist|haze|smoke/.test(t) || (/cloud/.test(t) && !/partly|mainly|few/.test(t))) mood = "cloudy";  // partly cloudy stays clear
    setData(root, "weather", mood);
  }

  function sky() {
    const h = new Date().getHours();
    setData(root, "sky", h >= 22 || h < 5 ? "night" : h < 8 ? "dawn" : h < 17 ? "day" : "dusk");
  }

  /* ---------- Calendars lists: "Oct 5" -> "Oct 05", and a date shown once per run of rows ---------- */
  const DATE_LISTS = ["#tautulli_recent_movies", "#tautulli_recent_shows", "#upcomingtv"];
  const SHORT_DAY = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d)(?!\d)/gi;
  const LOOKS_LIKE_DATE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}[\s/-])/i;

  function dateLists() {
    DATE_LISTS.forEach((id) => {
      const list = document.querySelector(id);
      if (!list) return;

      const walker = document.createTreeWalker(list, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode());) {
        const fixed = node.textContent.replace(SHORT_DAY, "$1 0$2");
        if (fixed !== node.textContent) node.textContent = fixed;
      }

      let rows = list.querySelectorAll(".flex.flex-row.text-right");
      if (!rows.length) rows = list.querySelectorAll(".flex.flex-row");
      let last = "";
      rows.forEach((row) => {
        const el = row.firstElementChild;
        if (!el) return;
        const date = el.textContent.trim();
        if (!LOOKS_LIKE_DATE.test(date)) return;  // skip titles and other non-date cells
        const repeat = date === last;
        const vis = repeat ? "hidden" : "visible";
        if (el.style.visibility !== vis) el.style.visibility = vis;
        if (!repeat) last = date;
      });
      if (rows.length) setData(list, "ready", "1");  // smooth loading: the list fades in once tidied
    });
  }

  /* ---------- Media Releases: a show with several episodes on one day becomes one row ("· 7 episodes") ---------- */
  const RELEASE_ROWS = 42;  // rows that line Media Releases up with the column beside it (41 left it a row short); services.yaml fetches more so collapsed rows get refilled

  // the event Homepage drew a row from ({ title, date, additional: "S2 E3", color }), read from the row's React
  // props; the row's text is no use for this, as the title cell shows "S2 E3" while the mouse is over it
  function rowEvent(row) {
    const fiberKey = Object.keys(row).find((k) => k.startsWith("__reactFiber$"));
    for (let f = fiberKey && row[fiberKey], i = 0; f && i < 6; f = f.return, i++) {
      const ev = f.memoizedProps && f.memoizedProps.event;
      if (ev) return ev;
    }
    return null;
  }

  function collapseReleases() {
    const list = document.querySelector("#upcomingtv");
    if (!list) return;
    const rows = [...list.querySelectorAll(".flex.flex-row")].filter((r) => r.querySelector(".truncate > .absolute"));
    const groups = new Map();
    let day = "";
    rows.forEach((row) => {
      const title = row.querySelector(".truncate > .absolute");
      const ev = rowEvent(row);
      day = row.firstElementChild.textContent.trim() || day;  // Homepage writes the date on a day's first row only
      const key = ev && ev.title && ev.date && ev.date.toISODate
        ? ev.date.toISODate() + "|" + ev.title
        : day + "|" + title.textContent.trim();  // fallback if Homepage's internals change
      const group = groups.get(key);
      if (group) { group.rows.push(row); setData(row, "dup", "1"); } else { groups.set(key, { title, rows: [row] }); setData(row, "dup", ""); }
    });
    // the kept row says how many episodes it stands for; hovering it lists them all (Homepage's own hover shows the first)
    groups.forEach(({ title, rows: group }) => {
      const n = group.length;
      setData(title, "more", n > 1 ? ` · ${n} episodes` : "");
      const tip = n > 1 ? group.map((r) => (rowEvent(r) || {}).additional).filter(Boolean).join("\n") : "";
      if ((group[0].getAttribute("title") || "") !== tip) {
        if (tip) group[0].setAttribute("title", tip); else group[0].removeAttribute("title");
      }
    });
    // one dot per colour per day (TV cyan, films amber), like the Recently Downloaded lists' one dot per day
    let shown = 0, dotDay = "", dots = new Set();
    rows.forEach((row) => {
      const display = row.dataset.dup === "1" || ++shown > RELEASE_ROWS ? "none" : "";
      if (row.style.display !== display) row.style.display = display;
      const dot = row.children[1];
      if (!dot || display) return;
      const date = row.firstElementChild.textContent.trim();
      if (date && date !== dotDay) { dotDay = date; dots = new Set(); }
      const colour = (dot.innerHTML.match(/bg-[a-z]+-\d+/) || [""])[0];
      const vis = dots.has(colour) ? "hidden" : "";
      dots.add(colour);
      if (dot.style.visibility !== vis) dot.style.visibility = vis;
    });
    if (rows.length) setData(list, "ready", "1");  // smooth loading: fades in only after collapsing
  }

  /* ---------- widget labels that don't match the rest: PBS "Memory" (Proxmox and Synology say "MEM"),
     Caddy's sentence-case "Current requests" / "Failed requests" (every other label is Title Case),
     UniFi's "LAN Users" / "WLAN Users", which count connected clients ("Devices" there means UniFi gear) ---------- */
  const LABELS = [
    ["Proxmox Backup", { "Memory": "MEM" }],
    ["Caddy", { "Current requests": "Current Requests", "Failed requests": "Failed Requests" }],
    ["UniFi", { "LAN Users": "LAN Clients", "WLAN Users": "WLAN Clients" }],
  ];

  function widgetLabels() {
    document.querySelectorAll("li.service").forEach((li) => {
      const name = li.querySelector(".service-name");
      const hit = name && LABELS.find(([service]) => name.textContent.includes(service));
      if (!hit) return;
      li.querySelectorAll(".service-block div, .service-block span").forEach((el) => {
        const to = !el.children.length && hit[1][el.textContent.trim()];
        if (to) el.textContent = to;
      });
    });
  }

  /* ---------- phones: an app tile's name shrinks until it fits its tile (12px down to 9px), so long
     names ("Audiobookshelf", "Free Games Claimer") show whole instead of ending in "..." ---------- */
  /* ---------- money: "SGD 83.43" -> "$83.43" in widget figures (Wallos; Homepage prints the ISO code); plain "$"
     everywhere since 08/10/2026 (was "S$", 07/10/2026) ---------- */
  function currency() {
    document.querySelectorAll("li.service .service-block *").forEach((el) => {
      if (el.children.length) return;
      const t = el.textContent;
      if (/^\s*SGD[\s\u00a0]*/.test(t)) el.textContent = t.replace(/^\s*SGD[\s\u00a0]*/, "$");
    });
  }
  function fitNames() {
    document.querySelectorAll('.services-group[data-acc="apps"] li.service .service-name').forEach((name) => {
      if (!PHONE.matches) { if (name.style.fontSize) name.style.removeProperty("font-size"); return; }
      const room = String(name.clientWidth);
      if (!name.clientWidth || (name.dataset.fitText === name.textContent && name.dataset.fitRoom === room)) return;  // hidden, or already fitted
      name.style.removeProperty("font-size");  // the phone CSS sets 12px !important, so the fitted size is !important too
      for (let px = 12; px > 9 && name.scrollWidth > name.clientWidth; px -= 0.5) name.style.setProperty("font-size", (px - 0.5) + "px", "important");
      name.dataset.fitText = name.textContent;
      name.dataset.fitRoom = room;
    });
  }

  /* ---------- desktop: a card whose figure boxes don't fit (Technitium, Wallos, Maintainerr ... on screens
     below ~2560px) first gets tighter boxes, then smaller figures (down to 88%), then two rows of figures;
     cards that fit are left alone ---------- */
  const FIT_MIN = 0.88;  // below this the figures read as too small next to the cards that fit

  function fitBlocks() {
    document.querySelectorAll("li.service .service-container").forEach((cont) => {
      const blocks = [...cont.children].filter((b) => b.classList.contains("service-block"));
      const texts = blocks.flatMap((b) => [...b.children]);
      const reset = () => {
        cont.classList.remove("fit-tight", "fit-wrap");
        texts.forEach((t) => t.style.removeProperty("font-size"));
      };
      if (PHONE.matches || !blocks.length) { if (cont.dataset.fitKey) { reset(); delete cont.dataset.fitKey; } return; }
      const key = cont.clientWidth + "|" + cont.textContent;
      if (!cont.clientWidth || cont.dataset.fitKey === key) return;  // hidden tab, or already fitted
      reset();
      const over = () => cont.scrollWidth > cont.clientWidth + 1;
      if (over()) {
        cont.classList.add("fit-tight");
        const base = texts.map((t) => parseFloat(getComputedStyle(t).fontSize));
        for (let f = 0.98; f >= FIT_MIN && over(); f -= 0.02) {
          texts.forEach((t, i) => t.style.setProperty("font-size", (base[i] * f).toFixed(1) + "px", "important"));
        }
        if (over()) { texts.forEach((t) => t.style.removeProperty("font-size")); cont.classList.add("fit-wrap"); }
      }
      cont.dataset.fitKey = key;
    });
  }

  /* ---------- TitleCardMaker: thousands separators ("12345" -> "12,345") ---------- */
  function tcmNumbers() {
    const widget = document.querySelector('#titlecardmaker, [data-name="TitleCardMaker"]');
    if (!widget) return;
    widget.querySelectorAll("div, span, p").forEach((el) => {
      if (el.children.length) return;
      const text = el.textContent.trim();
      if (/^\d{4,}$/.test(text)) el.textContent = text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    });
  }

  /* ---------- Gotify card, Latest box: CrowdSec alerts arrive as "🚨 crowdsecurity/http-wordpress-scan";
     show just "http-wordpress-scan" (08/10/2026) ---------- */
  function gotifyLatest() {
    const card = document.querySelector('li.service[data-name="Gotify"]');
    if (!card) return;
    card.querySelectorAll(".service-container ~ .service-container .service-block-value").forEach((el) => {
      // edit the text node itself so React can still update it on the next refresh
      el.childNodes.forEach((n) => {
        if (n.nodeType !== 3) return;
        const short = n.nodeValue.replace(/^\s*🚨\s*crowdsecurity\//, "");
        if (short !== n.nodeValue) n.nodeValue = short;
      });
    });
  }

  /* ---------- Technitium cards: the widget writes "58 (0.02%)"; show just the count (08/10/2026) ---------- */
  function technitiumCounts() {
    document.querySelectorAll('li.service[data-name^="Technitium"] .service-block-value').forEach((el) => {
      el.childNodes.forEach((n) => {
        if (n.nodeType !== 3) return;
        const short = n.nodeValue.replace(/\s*\([\d.,]+\s*%\)\s*$/, "");
        if (short !== n.nodeValue) n.nodeValue = short;
      });
    });
  }

  /* ---------- figures the user prefers plain (08/10/2026): Komodo and Proxmox write "running / total"
     ("49 / 49") and Seerr "open / all" issues ("0 / 0"), shown as just the first number (problems show in
     Komodo's Down/Unhealthy row);
     SABnzbd's idle "0:00:00" Time Left shows as "–"; Audiobookshelf's two "Duration" labels say which, in hours, as does Palworld's uptime; Immich storage in GB.
     Text nodes are edited in place so React keeps updating them ---------- */
  function editText(el, fn) {
    el.childNodes.forEach((n) => {
      if (n.nodeType !== 3) return;
      const v = fn(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
    });
  }

  // "1d3h" / "15h26m" -> whole hours ("27h", "15h"); anything else is left as it is
  function toHours(t) {
    const m = t.trim().match(/^(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:\d+s)?$/);
    if (!m || !(m[1] || m[2])) return t;
    return Math.round((+m[1] || 0) * 24 + (+m[2] || 0) + (+m[3] || 0) / 60).toLocaleString("en") + "h";
  }

  function runningOnly() {
    document.querySelectorAll('li.service:is([data-name="Komodo"], [data-name="Proxmox Server"], [data-name="Seerr"]) .service-block-value')
      .forEach((el) => editText(el, (t) => t.replace(/^\s*([\d,]+)\s*\/\s*[\d,]+\s*$/, "$1")));
    document.querySelectorAll('li.service[data-name="SABnzbd"] .service-block-value')
      .forEach((el) => editText(el, (t) => (/^\s*0:00:00\s*$/.test(t) ? "–" : t)));
    document.querySelectorAll('li.service[data-name="Audiobookshelf"] .service-block').forEach((b) => {
      const label = b.querySelector(".service-block-label");
      const prev = b.previousElementSibling && b.previousElementSibling.querySelector(".service-block-label");
      if (!label || !prev) return;
      const kind = { Podcasts: "Podcast Length", Books: "Book Length" }[prev.textContent.trim()];
      if (!kind) return;
      editText(label, (t) => (t.trim() === "Duration" ? kind : t));
      // "1d3h" -> "27h": whole hours read better than days + hours (user, 08/10/2026)
      const value = b.querySelector(".service-block-value");
      if (value) editText(value, toHours);
    });
    // Home Assistant card: HA states are lower case ("locked", "docked"); show them in Title Case like the rest
    document.querySelectorAll('li.service[data-name="Home Assistant"] .service-block-value')
      .forEach((el) => editText(el, (t) => t.replace(/^(\s*)([a-z])/, (m, s, c) => s + c.toUpperCase())));
    // Palworld uptime too ("15h26m" -> "15h")
    document.querySelectorAll('li.service[data-name="Palworld"] .service-block').forEach((b) => {
      const label = b.querySelector(".service-block-label");
      const value = b.querySelector(".service-block-value");
      if (label && value && label.textContent.trim() === "Uptime") editText(value, toHours);
    });
    // Immich storage in decimal units like drives and phones ("65.7 GiB" -> "70.5 GB")
    document.querySelectorAll('li.service[data-name="Immich"] .service-block-value').forEach((el) => editText(el, (t) => {
      const m = t.trim().match(/^([\d.,]+)\s*(KiB|MiB|GiB|TiB)$/);
      if (!m) return t;
      const bytes = parseFloat(m[1].replace(/,/g, "")) * 1024 ** ({ KiB: 1, MiB: 2, GiB: 3, TiB: 4 }[m[2]]);
      const [n, unit] = bytes >= 1e12 ? [bytes / 1e12, "TB"] : bytes >= 1e9 ? [bytes / 1e9, "GB"] : [bytes / 1e6, "MB"];
      return n.toFixed(1) + " " + unit;
    }));
  }

  /* ---------- "All Stats" switch and section folds (08/10/2026): an iOS-style switch at the end of the
     Infrastructure heading is on while every section shows its figures, and folds or opens them all at once;
     clicking a section's heading (chevron) folds just that section. Infrastructure always keeps its figures.
     Folded sections are remembered in this browser. Desktop only (phones have their own layout) ---------- */
  const STATS_KEY = "homepage-stats-folded";  // JSON list of folded section names
  const STATS_GROUPS = ["Networking & Security", "Media Acquisition", "Media Tools", "Personal & Productivity", "Utilities"];
  const CHEVRON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function groupName(g) {
    return (((g.querySelector(".service-group-name") || {}).firstChild || {}).textContent || "").trim();
  }
  function readFolded() {
    try {
      const v = JSON.parse(localStorage.getItem(STATS_KEY) || "null");
      if (Array.isArray(v)) return v.filter((n) => STATS_GROUPS.includes(n));
      if (localStorage.getItem("homepage-stats") === "off") return STATS_GROUPS.slice();  // the earlier all-or-nothing switch
    } catch (e) { /* storage blocked: everything unfolded */ }
    return [];
  }
  function saveFolded(list) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(list)); } catch (e) { /* not remembered */ }
  }
  function setAttr(el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  function applyFolds(folded) {
    document.querySelectorAll(".services-group.stats-optional").forEach((g) => {
      const isFolded = folded.includes(groupName(g));
      g.classList.toggle("stats-folded", isFolded);
      setAttr(g.querySelector(".stats-fold"), "aria-expanded", String(!isFolded));
    });
    setAttr(document.querySelector(".stats-switch"), "aria-checked", String(folded.length === 0));  // on = every section open
  }

  function statsSwitch() {
    document.querySelectorAll(".services-group").forEach((g) => {
      const name = groupName(g);
      const optional = STATS_GROUPS.includes(name);
      g.classList.toggle("stats-optional", optional);
      const head = g.querySelector(".service-group-name");
      if (!optional || !head || head.querySelector(".stats-fold")) return;
      const chev = document.createElement("button");
      chev.type = "button";
      chev.className = "stats-fold";
      chev.setAttribute("aria-label", "Show or hide the figures in " + name);
      chev.innerHTML = CHEVRON;
      head.appendChild(chev);
      head.classList.add("stats-fold-head");
      head.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const folded = readFolded();
        const i = folded.indexOf(name);
        if (i === -1) folded.push(name); else folded.splice(i, 1);
        saveFolded(folded);
        applyFolds(folded);
      });
    });
    const infra = [...document.querySelectorAll(".service-group-name")]
      .find((h) => ((h.firstChild || {}).textContent || "").trim() === "Infrastructure");
    if (infra && !infra.querySelector(".stats-switch")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stats-switch";
      btn.setAttribute("role", "switch");
      btn.innerHTML = '<span class="stats-switch-label">All Stats</span><span class="stats-switch-track"><span class="stats-switch-knob"></span></span>';
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = readFolded().length === 0 ? STATS_GROUPS.slice() : [];  // all open: fold all; any folded: open all
        saveFolded(next);
        applyFolds(next);
      });
      infra.appendChild(btn);
    }
    applyFolds(readFolded());
  }

  /* ---------- run everything on load and whenever the page changes ---------- */
  function run() {
    tabs();
    sectionAccents();
    sortBookmarks();
    disks();
    clock();
    weather();
    collapseReleases();
    dateLists();
    widgetLabels();
    currency();
    fitNames();
    fitBlocks();
    tcmNumbers();
    gotifyLatest();
    technitiumCounts();
    runningOnly();
    statsSwitch();
  }

  /* ---------- smooth loading (07/10/2026, Mac theme): a newly opened tab stays invisible while the
     taggers above rearrange it (bookmark order, figure fitting), then fades in once; embedded pages
     (HA, Glance) fade in after they have loaded instead of flashing their loading screens.
     Revert: delete this block, its two calls below and the "smooth loading" rules in custom.css ---------- */
  let settleQuiet = 0, settleCap = 0;
  function reveal() {
    clearTimeout(settleQuiet); clearTimeout(settleCap);
    delete root.dataset.settling;
  }
  function startSettling(cap) {
    root.dataset.settling = "1";
    clearTimeout(settleCap);
    settleCap = setTimeout(reveal, cap);  // never hidden longer than this
  }
  function settled() {  // called after each run: reveal once the page has been quiet for 250 ms
    if (!root.dataset.settling) return;
    clearTimeout(settleQuiet);
    settleQuiet = setTimeout(reveal, 250);
  }
  function frames() {
    document.querySelectorAll("iframe:not([data-fade])").forEach((f) => {
      f.dataset.fade = "wait";
      f.addEventListener("load", () => setTimeout(() => { f.dataset.fade = "in"; }, 250), { once: true });
      setTimeout(() => { if (f.dataset.fade === "wait") f.dataset.fade = "in"; }, 3000);
    });
  }
  startSettling(1500);
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest('#myTab [role="tab"]');
    if (t && t.getAttribute("aria-selected") !== "true") startSettling(1000);
  }, true);
  window.addEventListener("hashchange", () => startSettling(1000));

  let pending = false;
  new MutationObserver(() => {
    frames();
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; run(); settled(); }, 150);
  }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-selected"] });

  sky();
  setInterval(sky, 300000);
  PHONE.addEventListener?.("change", run);
  window.addEventListener("load", run);
})();
