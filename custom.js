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
    ["media tools", "255, 55, 95"], ["productivity", "191, 90, 242"], ["more apps", "94, 92, 230"],
    ["3d printing", "255, 159, 10"], ["entertainment", "255, 55, 95"], ["homelab", "100, 210, 255"],
    ["reference", "255, 214, 10"], ["shopping", "48, 209, 88"], ["social", "10, 132, 255"],
    ["tools", "172, 142, 104"], ["work", "191, 90, 242"], ["servers", "10, 132, 255"],
    ["apps", "48, 209, 88"],  // after "more apps", so that one keeps its own colour
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

  /* ---------- Bookmarks: sections ordered from most to fewest links (ties keep settings.yaml order) ---------- */
  function sortBookmarks() {
    const on = root.dataset.tab === "bookmarks";
    document.querySelectorAll(".services-group").forEach((g, i) => {
      const order = on ? String((100 - g.querySelectorAll("li.service").length) * 100 + i) : "";
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
    let w = document.querySelector(".information-widget-openmeteo");
    if (!w) {  // fallback in case Homepage drops the widget class (it does for the resources widget)
      w = [...document.querySelectorAll("#information-widgets .widget-container")].find((c) => c.textContent.includes("°"));
    }
    if (w && !w.classList.contains("hp-weather")) w.classList.add("hp-weather");
    const t = w ? w.textContent.toLowerCase() : "";
    let mood = "clear";
    if (/thunder/.test(t)) mood = "storm";
    else if (/rain|drizzle|shower/.test(t)) mood = "rain";
    else if (/overcast|fog|mist/.test(t) || (/cloud/.test(t) && !/partly|mainly|few/.test(t))) mood = "cloudy";  // partly cloudy stays clear
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

  /* ---------- run everything on load and whenever the page changes ---------- */
  function run() {
    tabs();
    sectionAccents();
    sortBookmarks();
    disks();
    clock();
    weather();
    dateLists();
    tcmNumbers();
  }

  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; run(); }, 150);
  }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-selected"] });

  sky();
  setInterval(sky, 300000);
  PHONE.addEventListener?.("change", run);
  window.addEventListener("load", run);
})();
