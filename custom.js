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
    // an address with ?something and no #tab (the ?mood= and ?dock= previews) opens with no tab selected and an
    // empty page; open the first tab then (15/10/2026)
    else if (!PHONE.matches && !activeTab()) document.querySelector('#myTab [role="tab"]')?.click();
    // the Bookmarks tab is hidden since its links moved into the Dock's Stacks (15/10/2026): an old #bookmarks
    // address goes to Home (add ?dock=0 to see the old tab again)
    else if (!PHONE.matches && activeTab() === "bookmarks" && PARAMS.get("dock") !== "0") document.getElementById("Home-tab")?.click();
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
    else if (/overcast|fog|mist|haze|smoke/.test(t) || (/cloud/.test(t) && !/partly|mainly|few/.test(t))) mood = "cloudy";
    else if (/cloud/.test(t)) mood = "partly";
    setData(root, "weather", preview()[0] || haMood || mood);  // a preview, then Home Assistant's reading, then the widget's text
    topBarWeather(w);
    fxLayer();
  }

  /* weather mood from Home Assistant's weather.openweathermap, the same reading the Nest Hubs use (15/10/2026).
     Homepage's own OpenWeatherMap widget asks a different OWM service and caches it, so it can disagree (it said
     "scattered clouds" while HA said rainy). The HA state arrives through the Home Assistant tile's third widget,
     which custom.css hides; if that fails, weather() falls back to the widget's text */
  const HA_MOOD = {
    sunny: "clear", "clear-night": "clear", windy: "clear", "windy-variant": "partly", partlycloudy: "partly",
    cloudy: "cloudy", fog: "cloudy", exceptional: "cloudy", rainy: "rain", pouring: "rain", "snowy-rainy": "rain",
    snowy: "rain", hail: "rain", lightning: "storm", "lightning-rainy": "storm",
  };
  let haMood = null, haCond = null, haTemp = null;
  function haWeatherPoll() {
    fetch("/api/services/proxy?group=Infrastructure&service=Home%20Assistant&index=2", { cache: "no-store" })
      .then((r) => r.json()).then((d) => {
        const rows = Array.isArray(d) ? d : [];
        const cond = String((rows.find((x) => x.label === "Weather") || {}).value || "").trim().toLowerCase();
        const temp = parseFloat((rows.find((x) => x.label === "Temperature") || {}).value);
        haCond = HA_MOOD[cond] ? cond : null;
        haMood = haCond ? HA_MOOD[haCond] : null;
        haTemp = isNaN(temp) ? null : temp;
        weather();
      }).catch(() => { haMood = haCond = haTemp = null; });
  }

  /* top-bar weather from Home Assistant too (15/10/2026, user: "the weather on the top bar is always different from
     ha"): the widget keeps its place and look, but its temperature, condition and icon are HA's. Whole degrees, like
     HA's weather card (clock-weather-card show_decimal: false) and the Nest Hubs ("30°C"; user 15/10/2026); condition in Title Case; icon = the Material Design weather icon HA itself uses, drawn
     white over the widget's own (custom.css .hp-weather[data-ha-icon]). If HA can't be read, the widget is left as is */
  const HA_LABEL = {
    sunny: "Sunny", "clear-night": "Clear", partlycloudy: "Partly Cloudy", cloudy: "Cloudy", fog: "Fog", rainy: "Rainy",
    pouring: "Pouring", lightning: "Lightning", "lightning-rainy": "Thunderstorms", hail: "Hail", snowy: "Snowy",
    "snowy-rainy": "Sleet", windy: "Windy", "windy-variant": "Windy", exceptional: "Exceptional",
  };
  const HA_ICON = { partlycloudy: "partly-cloudy", "clear-night": "night", "lightning-rainy": "lightning-rainy", "snowy-rainy": "snowy-rainy", "windy-variant": "windy-variant", exceptional: "cloudy-alert" };
  function topBarWeather(w) {
    if (!w || !haCond) { if (w) delete w.dataset.haIcon; return; }
    const primary = w.querySelector(".primary-text"), secondary = w.querySelector(".secondary-text");
    if (primary && haTemp !== null) {
      const t = primary.textContent.replace(/-?[\d.,]+\s*°\s*([CF])?/, Math.round(haTemp) + "°$1");
      if (t !== primary.textContent) primary.textContent = t;
    }
    const label = HA_LABEL[haCond];
    if (secondary && label && secondary.textContent !== label) secondary.textContent = label;
    let icon = HA_ICON[haCond] || haCond;
    if (haCond === "partlycloudy" && root.dataset.sky === "night") icon = "night-partly-cloudy";
    const url = 'url("https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/weather-' + icon + '.svg")';
    if (w.style.getPropertyValue("--ha-icon") !== url) w.style.setProperty("--ha-icon", url);
    setData(w, "haIcon", icon);
  }

  /* the three extra moods (15/10/2026, from the Nest Hub dashboards): stars on clear nights, drifting soft clouds
     (partly cloudy, cloudy and rain), a warm sun glow on clear days. One layer inside #background, so it sits
     behind the glass and drifts with the wallpaper; looks and timings are in custom.css */
  const FX_HTML = '<div id="hp-fx" aria-hidden="true"><i class="fx-sun"></i><i class="fx-stars fx-a"></i>' +
    '<i class="fx-stars fx-b"></i><i class="fx-cloud fx-c1"></i><i class="fx-cloud fx-c2"></i>' +
    '<i class="fx-cloud fx-c3"></i><i class="fx-cloud fx-c4"></i><i class="fx-cloud fx-c5"></i></div>';
  function fxLayer() {
    const bg = document.getElementById("background");
    if (bg && !bg.querySelector("#hp-fx")) bg.insertAdjacentHTML("beforeend", FX_HTML);
    rainLayer();
  }

  /* rain drops (15/10/2026): built only while it rains or storms, removed after, so dry days cost nothing. The same
     drops every time (fixed seed); looks in custom.css (#hp-rain). 140 drops: the first 100 for rain, all 140 in a storm */
  function rainLayer() {
    const wet = root.dataset.weather === "rain" || root.dataset.weather === "storm";
    const layer = document.getElementById("hp-rain");
    if (!wet) { if (layer) layer.remove(); return; }
    if (layer) return;
    let seed = 20261015;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let html = "";
    for (let k = 0; k < 140; k++) {
      const near = k % 3 === 0;  // a third near: longer, brighter, faster
      const len = near ? 90 + rnd() * 70 : 40 + rnd() * 45;
      const dur = near ? 0.55 + rnd() * 0.25 : 0.95 + rnd() * 0.45;
      html += '<i' + (k >= 100 ? ' class="fx-storm"' : "") + ' style="--x:' + (rnd() * 135).toFixed(1) + "%;--l:" + len.toFixed(0) +
        "px;--w:" + (near ? 1.6 : 1.1) + "px;--a:" + (near ? 0.5 + rnd() * 0.25 : 0.22 + rnd() * 0.2).toFixed(2) +
        ";--d:" + dur.toFixed(2) + "s;--t:-" + (rnd() * dur).toFixed(2) + "s;--y:" + (rnd() * 100).toFixed(0) + 'vh"></i>';
    }
    document.body.insertAdjacentHTML("beforeend", '<div id="hp-rain" aria-hidden="true">' + html + "</div>");
  }

  function sky() {
    const h = new Date().getHours();
    setData(root, "sky", preview()[1] || (h >= 22 || h < 5 ? "night" : h < 8 ? "dawn" : h < 17 ? "day" : "dusk"));
  }

  /* mood preview (15/10/2026): add ?mood=clear|partly|cloudy|rain|storm (optionally &sky=day|night|dawn|dusk) to the
     Homepage address to see that mood now, or ?mood=cycle to step through all eight looks every 12 s with a caption.
     Without the parameter nothing changes */
  const PARAMS = new URLSearchParams(location.search);
  // the apps' domain, from the address Homepage is opened on (homepage.example.com -> example.com), so no domain is
  // written in this file; used by the notification banners and the Dock
  const DOMAIN = location.hostname.split(".").slice(-2).join(".");
  const APP = (name) => "https://" + name + "." + DOMAIN;
  const CYCLE = [["clear", "day", "Sun"], ["partly", "day", "Partly Cloudy · Day"], ["cloudy", "day", "Cloudy"],
    ["rain", "day", "Rain"], ["storm", "day", "Storm"], ["clear", "night", "Stars"],
    ["partly", "night", "Partly Cloudy · Night"], ["rain", "night", "Rain · Night"]];
  function preview() {
    const m = PARAMS.get("mood");
    if (m === "cycle") return CYCLE[Math.floor(Date.now() / 12000) % CYCLE.length];
    return m ? [m, PARAMS.get("sky"), "Preview · " + m + (PARAMS.get("sky") ? " · " + PARAMS.get("sky") : "")] : [null, null, null];
  }
  function previewTick() {
    const label = preview()[2];
    if (!label) return;
    weather(); sky();
    let cap = document.getElementById("hp-mood-caption");
    if (!cap) {
      document.body.insertAdjacentHTML("beforeend", '<div id="hp-mood-caption"></div>');
      cap = document.getElementById("hp-mood-caption");
      cap.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:50;padding:6px 14px;" +
        "border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:13px;font-weight:600;pointer-events:none;" +
        "-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)";
    }
    if (cap.textContent !== label) cap.textContent = label;
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
      const room = String((name.closest(".service-card") || name).clientWidth);
      if (!name.clientWidth || (name.dataset.fitText === name.textContent && name.dataset.fitRoom === room)) return;  // hidden, or already fitted
      name.style.removeProperty("font-size");  // the phone CSS sets 12px !important, so the fitted size is !important too
      // measured on the text itself, with 4 px clear each side: a name exactly as wide as its tile (Channel Manager)
      // read as spilling over the tile's edge (16/10/2026)
      const range = document.createRange();
      range.selectNodeContents(name);
      const textW = () => range.getBoundingClientRect().width;
      const tile = (name.closest(".service-card") || name).clientWidth;  // the tile, not the name (its box follows the text)
      for (let px = 12; px > 9 && textW() > tile - 8; px -= 0.5) name.style.setProperty("font-size", (px - 0.5) + "px", "important");
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
    const units = { second: "sec", minute: "min", hour: "hr" };  // "hr" and "min" everywhere (user 15/10/2026); days and longer stay whole words
    card.querySelectorAll(".service-block-value").forEach((el) => {
      // edit the text node itself so React can still update it on the next refresh
      el.childNodes.forEach((n) => {
        if (n.nodeType !== 3) return;
        // "12 minutes ago" -> "12 min" (the label says "Last Received"; 10/10/2026, "ago" dropped 15/10/2026)
        const short = n.nodeValue.replace(/^\s*🚨\s*crowdsecurity\//, "")
          .replace(/\b(\d+) (second|minute|hour)s? ago\b/, (m, num, u) => num + " " + units[u])
          .replace(/\b(\d+) (day|week|month|year)(s?) ago\b/, "$1 $2$3");
        if (short !== n.nodeValue) n.nodeValue = short;
      });
    });
  }

  /* ---------- Gotify card "Received" (10/10/2026): Homepage only redraws a box when its data changes, so
     "3 min ago" froze between messages. Worked out here instead, from the count file (written every 15 s by
     gotify-count on the Docker VM), re-read every 15 s ---------- */
  let gotifyDate = null;
  function gotifyAgo(ms) {
    // no "ago": the labels already say it ("Last Received", "Last Reading"); user 15/10/2026
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return "Now";
    const m = Math.floor(s / 60);
    if (m < 60) return m + " min";
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return h < 24 ? h + " hr" : d + (d === 1 ? " day" : " days");
  }
  function gotifyReceived() {
    if (gotifyDate === null) return;
    const card = document.querySelector('li.service[data-name="Gotify"]');
    const block = card && [...card.querySelectorAll(".service-container:first-of-type > .service-block, .service-block")]
      .find((b) => /^(last )?received$/i.test((b.querySelector(".service-block-label")?.textContent || "").trim()));
    const value = block && block.querySelector(".service-block-value");
    if (!value) return;
    const text = gotifyAgo(gotifyDate);
    const node = [...value.childNodes].find((n) => n.nodeType === 3);
    if (node && node.nodeValue !== text) node.nodeValue = text;  // the text node itself, so React can still update it
  }
  function gotifyPoll() {
    if (!document.querySelector('li.service[data-name="Gotify"]')) return;
    fetch("/images/gotify-count.json", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const t = Date.parse(d.latest_date);
      if (!isNaN(t)) { gotifyDate = t; gotifyReceived(); }
    }).catch(() => {});
  }

  /* ---------- Scrutiny card "Last Reading" (15/10/2026): readings come once a day, so Homepage's own
     "46 minutes ago" would freeze for hours on an open page. Worked out here like Gotify's Received, in the
     same short style ("45 min", no "ago" since 15/10/2026), from the widget's own data via Homepage's proxy, re-read every 60 s ---------- */
  let scrutinyDate = null, scrutinyHot = null, scrutinyHours = null;
  function scrutinyReading() {
    if (scrutinyDate === null) return;
    const card = document.querySelector('li.service[data-name="Scrutiny"]');
    if (!card) return;
    const set = (label, text) => {
      const block = [...card.querySelectorAll(".service-block")]
        .find((b) => (b.querySelector(".service-block-label")?.textContent || "").trim() === label);
      const node = block && [...block.querySelector(".service-block-value").childNodes].find((n) => n.nodeType === 3);
      if (node && node.nodeValue !== text) node.nodeValue = text;  // the text node itself, so React can still update it
    };
    set("Last Reading", gotifyAgo(scrutinyDate));
    if (scrutinyHot !== null) set("Hottest Drive", scrutinyHot + " °C");
    if (scrutinyHours !== null) set("Oldest Drive", scrutinyHours.toLocaleString("en") + " hr");
  }
  /* all drives (15/10/2026): Proxmox NVMe + the NAS's four; archived drives left out like the widget's counts */
  let scrutinyAsked = false;  // a read is under way (the card can appear many times a second while the page builds)
  function scrutinyPoll() {
    if (!document.querySelector('li.service[data-name="Scrutiny"]') || scrutinyAsked) return;
    scrutinyAsked = true;
    fetch("/api/services/proxy?group=Infrastructure&service=Scrutiny&index=1", { cache: "no-store" })
      .then((r) => r.json()).then((d) => {
        const drives = Object.values((d.data || {}).summary || {}).filter((x) => !(x.device || {}).archived);
        const times = drives.map((x) => Date.parse((x.smart || {}).collector_date)).filter((t) => !isNaN(t));
        const temps = drives.map((x) => (x.smart || {}).temp).filter((t) => typeof t === "number" && t > 0);
        const hours = drives.map((x) => (x.smart || {}).power_on_hours).filter((h) => typeof h === "number");
        if (!times.length) return;
        scrutinyDate = Math.min(...times);  // the oldest of the latest readings: a collector that stops shows here
        scrutinyHot = temps.length ? Math.max(...temps) : null;
        scrutinyHours = hours.length ? Math.max(...hours) : null;
        scrutinyReading();
      }).catch(() => {}).finally(() => { scrutinyAsked = false; });
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
    return Math.round((+m[1] || 0) * 24 + (+m[2] || 0) + (+m[3] || 0) / 60).toLocaleString("en") + " hr";
  }

  /* UniFi card (15/10/2026, user): WAN "UP" -> "Up", and Uptime in whole hours ("58 hr") instead of "2.4 Days". The
     exact uptime (seconds) comes from the UniFi data the widget itself reads (gw_system-stats), so the hours are not
     rounded from a tenth of a day; until it arrives, the widget's days are converted */
  let unifiUptime = null;  // [seconds, when read]
  function unifiPoll() {
    if (!document.querySelector('li.service[data-name="UniFi"]')) return;
    fetch("/api/services/proxy?group=Infrastructure&service=UniFi&index=0&endpoint=stat/sites", { cache: "no-store" })
      .then((r) => r.json()).then((d) => {
        let up = null;
        (function walk(o) {
          if (up !== null || !o || typeof o !== "object") return;
          if (o["gw_system-stats"] && o["gw_system-stats"].uptime) { up = parseFloat(o["gw_system-stats"].uptime); return; }
          Object.values(o).forEach(walk);
        })(d);
        if (up !== null && !isNaN(up)) { unifiUptime = [up, Date.now()]; unifiFigures(); }
      }).catch(() => {});
  }
  /* Synology Server uptime in hours like UniFi and Palworld (15/10/2026): "4 Days" -> "109 hr", from the widget's own
     system_info (up_time "108:33:48"), re-read every minute */
  let synoUptime = null;  // [seconds, when read]
  function synoPoll() {
    if (!document.querySelector('li.service[data-name="Synology Server"]')) return;
    fetch("/api/services/proxy?group=Home&service=Synology%20Server&index=0&endpoint=system_info", { cache: "no-store" })
      .then((r) => r.json()).then((d) => {
        const m = String(((d && d.data) || d || {}).up_time || "").match(/^(\d+):(\d+):(\d+)$/);
        if (m) { synoUptime = [+m[1] * 3600 + +m[2] * 60 + +m[3], Date.now()]; unifiFigures(); }
      }).catch(() => {});
  }
  function unifiFigures() {
    document.querySelectorAll('li.service[data-name="UniFi"] .service-block').forEach((b) => {
      const label = (b.querySelector(".service-block-label")?.textContent || "").trim();
      const value = b.querySelector(".service-block-value");
      if (!value) return;
      if (label === "WAN") editText(value, (t) => (/^\s*[A-Z]+\s*$/.test(t) ? t.trim().charAt(0) + t.trim().slice(1).toLowerCase() : t));
      if (label === "Uptime") editText(value, (t) => {
        if (unifiUptime) return Math.round((unifiUptime[0] + (Date.now() - unifiUptime[1]) / 1000) / 3600).toLocaleString("en") + " hr";
        const m = t.match(/^\s*([\d.]+)\s*(day|hour)/i);
        return m ? Math.round(parseFloat(m[1]) * (/day/i.test(m[2]) ? 24 : 1)).toLocaleString("en") + " hr" : t;
      });
    });
    if (synoUptime) document.querySelectorAll('li.service[data-name="Synology Server"] .service-block').forEach((b) => {
      const value = b.querySelector(".service-block-value");
      if (value && (b.querySelector(".service-block-label")?.textContent || "").trim() === "Uptime")
        editText(value, () => Math.round((synoUptime[0] + (Date.now() - synoUptime[1]) / 1000) / 3600).toLocaleString("en") + " hr");
    });
  }

  function runningOnly() {
    document.querySelectorAll('li.service:is([data-name="Komodo"], [data-name="Proxmox Server"], [data-name="Seerr"], [data-name="Beszel"]) .service-block-value')
      .forEach((el) => editText(el, (t) => t.replace(/^\s*([\d,]+)\s*\/\s*[\d,]+\s*$/, "$1")));
    // Beszel: "13.52%" -> "14%", whole percentages like the other cards (user, 15/10/2026)
    document.querySelectorAll('li.service[data-name="Beszel"] .service-block-value')
      .forEach((el) => editText(el, (t) => t.replace(/^\s*(\d+(?:\.\d+)?)\s*%\s*$/, (m, n) => Math.round(+n) + "%")));
    document.querySelectorAll('li.service[data-name="SABnzbd"] .service-block-value')
      .forEach((el) => editText(el, (t) => (/^\s*0:00:00\s*$/.test(t) ? "–" : t)));
    document.querySelectorAll('li.service[data-name="Audiobookshelf"] .service-block').forEach((b) => {
      const label = b.querySelector(".service-block-label");
      const prev = b.previousElementSibling && b.previousElementSibling.querySelector(".service-block-label");
      if (!label || !prev) return;
      const kind = { Podcasts: "Podcast Length", Books: "Book Length" }[prev.textContent.trim()];
      if (!kind) return;
      editText(label, (t) => (t.trim() === "Duration" ? kind : t));
      // "1d3h" -> "27 hr": whole hours read better than days + hours (user, 08/10/2026)
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

  /* ---------- notification banners (15/10/2026, Apple touches): a new Gotify message slides in at the top
     right like a macOS banner. Read every 15 s from the Gotify card's own widget through Homepage's proxy, so
     it works on every tab. The first read only notes the newest message; priority 0-3 stays quiet (as on the
     phone); 8 and up stays until closed. Click opens Gotify. ?note=test shows a sample banner.
     App names and icons follow the From remap on the Gotify card in services.yaml: keep the two in step ---------- */
  const NOTE_APPS = {
    4: ["Radarr", "radarr"], 5: ["Sonarr", "sonarr"], 7: ["CrowdSec", "crowdsec"], 8: ["Tautulli", "tautulli"],
    10: ["Wallos", "wallos"], 11: ["Free Games", null], 13: ["Seerr", "seerr"], 16: ["Komodo", "komodo"],
    17: ["Maintainerr", "maintainerr"], 18: ["PBS", "proxmox"], 19: ["Bazarr", "bazarr"], 20: ["Prowlarr", "prowlarr"],
    22: ["BookStack", "bookstack"], 23: ["Authentik", "authentik"], 24: ["Gatus", "gatus"], 25: ["Synology", "synology"],
    26: ["Bambuddy", null], 27: ["PosterFlow", null],
  };
  const ICON_URL = (slug) => "https://cdn.jsdelivr.net/gh/selfhst/icons/webp/" + slug + ".webp";
  let noteLast = null;
  function plainText(s) {
    return String(s || "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`#>]+/g, "").replace(/\s+/g, " ").trim();
  }
  function showNote(m) {
    let box = document.getElementById("hp-notes");
    if (!box) {
      document.body.insertAdjacentHTML("beforeend", '<div id="hp-notes" aria-live="polite"></div>');
      box = document.getElementById("hp-notes");
    }
    const [app, slug] = NOTE_APPS[m.appid] || ["Gotify", null];
    const note = document.createElement("div");
    note.className = "hp-note";
    note.setAttribute("role", "status");
    note.innerHTML = '<img class="hp-note-icon" alt=""><div class="hp-note-body"><div class="hp-note-head">' +
      '<span class="hp-note-app"></span><span class="hp-note-time">Now</span></div>' +
      '<div class="hp-note-title"></div><div class="hp-note-msg"></div></div>' +
      '<button class="hp-note-close" type="button" aria-label="Close">×</button>';
    const img = note.querySelector("img");
    img.onerror = () => { img.onerror = null; img.src = ICON_URL("gotify"); };
    img.src = ICON_URL(slug || "gotify");
    // message text goes in as text, never as HTML
    note.querySelector(".hp-note-app").textContent = app;
    note.querySelector(".hp-note-title").textContent = plainText(m.title) || app;
    const msg = plainText(m.message);
    if (msg) note.querySelector(".hp-note-msg").textContent = msg; else note.querySelector(".hp-note-msg").remove();
    const close = () => { note.classList.add("hp-note-out"); setTimeout(() => note.remove(), 350); };
    note.querySelector(".hp-note-close").addEventListener("click", (e) => { e.stopPropagation(); close(); });
    note.addEventListener("click", () => { window.open(APP("gotify"), "_blank", "noopener"); close(); });
    if ((m.priority || 0) >= 8) note.dataset.sticky = "1";
    else {
      let timer = setTimeout(close, 7000);
      note.addEventListener("mouseenter", () => clearTimeout(timer));
      note.addEventListener("mouseleave", () => { timer = setTimeout(close, 3000); });
    }
    box.prepend(note);
    [...box.children].slice(3).forEach((n) => n.remove());  // at most three on screen, like Notification Centre's stack
  }
  function notesPoll() {
    fetch("/api/services/proxy?group=Infrastructure&service=Gotify&index=0", { cache: "no-store" })
      .then((r) => r.json()).then((d) => {
        const m = (d.messages || [])[0];
        if (!m || typeof m.id !== "number") return;
        const first = noteLast === null;
        if (!first && m.id <= noteLast) return;
        noteLast = m.id;
        if (first || document.hidden || (m.priority || 0) < 4) return;
        showNote(m);
      }).catch(() => {});
  }

  /* ---------- Dock (15/10/2026; on for everyone on desktop since the same day, ?dock=0 hides it and brings the
     Bookmarks tab back): favourite apps, then the Bookmarks tab's groups as
     macOS Stacks, in a frosted bar at the bottom. Icons grow under the pointer like the macOS Dock's magnification
     and a label shows above. An app click bounces the icon while it opens in a new tab; a Stack click opens a
     frosted grid of that group's links above the Dock (Esc or a click elsewhere closes it). The Stacks read the
     groups live from Homepage (/api/services), so they always match services.yaml; only their names and order
     are listed here ---------- */
  // the Dock's icon size at rest in px (the icons are drawn at 1.5 x and shown scaled); ?docksize=60 previews another
  const DOCK_SIZE = Math.min(96, Math.max(40, parseInt(PARAMS.get("docksize"), 10) || 64));  // 64 px (user 16/10/2026; was 52)
  root.style.setProperty("--ds", DOCK_SIZE + "px");
  // the four apps used most (user 16/10/2026: "komodo, proxmox, home assistant, unifi"); was 11
  const DOCK = [
    ["Komodo", APP("komodo"), "komodo"], ["Proxmox", APP("proxmox"), "proxmox"],
    ["Home Assistant", APP("homeassistant"), "home-assistant"], ["UniFi", APP("unifi"), "ubiquiti-unifi"],
  ];
  const STACKS = ["Homelab", "Homelab Help", "Tools", "Reference", "Work & Admin", "Social & Media", "Shopping", "3D Printing"];
  // Homepage icon values: a full URL, a /images path, "si-<slug>" (Simple Icons, drawn black: inverted by the CSS)
  // or a dashboard-icons file name
  function iconSrc(icon) {
    const i = String(icon || "");
    if (/^(https?:)?\/\//.test(i) || i.startsWith("/")) return i;
    if (i.startsWith("si-")) return "https://cdn.jsdelivr.net/npm/simple-icons@13/icons/" + i.slice(3) + ".svg";
    if (i.startsWith("mdi-")) return "https://cdn.jsdelivr.net/npm/@mdi/svg@7/svg/" + i.slice(4) + ".svg";
    return i ? "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/" + i.replace(/\.(png|svg|webp)$/, "") + ".png" : ICON_URL("homepage");
  }
  function iconImg(icon) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = iconSrc(icon);
    if (/^(si|mdi)-/.test(String(icon || ""))) img.className = "hp-mono";
    img.onerror = () => { img.onerror = null; img.src = ICON_URL("homepage"); img.className = ""; };
    return img;
  }
  function closeStack() {
    const s = document.getElementById("hp-stack");
    if (!s) return;
    s.dataset.out = "1";
    setTimeout(() => s.remove(), 220);
    document.querySelectorAll(".hp-dock-item[data-open]").forEach((b) => delete b.dataset.open);
  }
  function openStack(btn, name, links) {
    const was = btn.dataset.open;
    closeStack();
    if (was) return;  // a second click on the same Stack closes it, as on the Mac
    btn.dataset.open = "1";
    const s = document.createElement("div");
    s.id = "hp-stack";
    s.setAttribute("role", "dialog");
    s.setAttribute("aria-label", name);
    s.innerHTML = '<div class="hp-stack-title"></div><div class="hp-stack-grid"></div>';
    s.querySelector(".hp-stack-title").textContent = name;
    const grid = s.querySelector(".hp-stack-grid");
    grid.style.setProperty("--cols", Math.min(4, Math.max(3, Math.ceil(Math.sqrt(links.length)))));
    links.forEach((l) => {
      const a = document.createElement("a");
      a.className = "hp-stack-link"; a.href = l.href; a.target = "_blank"; a.rel = "noreferrer";
      a.title = l.description || l.name;
      const plate = document.createElement("span");
      plate.className = "hp-stack-icon";
      plate.appendChild(iconImg(l.icon));
      const label = document.createElement("span");
      label.className = "hp-stack-name"; label.textContent = l.name;
      a.append(plate, label);
      a.addEventListener("click", () => setTimeout(closeStack, 120));
      grid.appendChild(a);
    });
    document.body.appendChild(s);
    // centred over its Dock icon, kept on screen
    const r = btn.getBoundingClientRect(), w = s.offsetWidth;
    s.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + "px";
    s.style.setProperty("--arrow", (r.left + r.width / 2 - parseFloat(s.style.left)) + "px");
  }
  function dock() {
    if (PARAMS.get("dock") === "0" || PHONE.matches || document.getElementById("hp-dock")) return;
    root.dataset.dock = "1";
    const bar = document.createElement("nav");
    bar.id = "hp-dock";
    bar.setAttribute("aria-label", "Dock");
    bar.insertAdjacentHTML("afterbegin", '<span class="hp-dock-bg" aria-hidden="true"></span>');
    // each item: a DOCK_SIZE slot holding the icon layer (drawn at 1.5 x, scaled) and its label
    const item = (label, tag) => {
      const el = document.createElement(tag);
      el.className = "hp-dock-item";
      el.setAttribute("aria-label", label);
      el.insertAdjacentHTML("beforeend", '<span class="hp-dock-icon"></span><span class="hp-dock-label"></span>');
      el.querySelector(".hp-dock-label").textContent = label;
      return el;
    };
    DOCK.forEach((d) => {
      if (!d) { bar.insertAdjacentHTML("beforeend", '<span class="hp-dock-sep"></span>'); return; }
      const a = item(d[0], "a");
      a.href = d[1]; a.target = "_blank"; a.rel = "noreferrer";
      const img = document.createElement("img"); img.alt = ""; img.src = ICON_URL(d[2]);
      a.querySelector(".hp-dock-icon").appendChild(img);
      a.addEventListener("click", () => { delete a.dataset.bounce; void a.offsetWidth; a.dataset.bounce = "1"; });
      a.addEventListener("animationend", () => { delete a.dataset.bounce; });
      bar.appendChild(a);
    });
    // magnification: each icon grows with closeness to the pointer (up to 1.5x within 140 px) and its neighbours
    // move aside to make room, as on the Mac. Only transforms change (see the CSS), positions are measured once
    // when the pointer comes in, and the work is done at most once per screen frame
    let rest = null, barLeft = 0, barWidth = 0, px = null, raf = 0;
    const measure = () => {
      rest = [...bar.children].filter((k) => k.matches(".hp-dock-item, .hp-dock-sep")).map((k) => ({
        el: k, icon: k.querySelector(".hp-dock-icon"), label: k.querySelector(".hp-dock-label"),
        c: k.offsetLeft + k.offsetWidth / 2,
      }));
      barLeft = bar.getBoundingClientRect().left; barWidth = bar.offsetWidth;
    };
    // transforms are written straight onto the moving parts (no CSS variables: a variable change restyles the
    // whole icon), and only when they changed, so a frame usually touches just the icons near the pointer
    const put = (el, v) => { if (el && el.__t !== v) { el.__t = v; el.style.transform = v; } };
    // Two modes (user 15/10/2026). "full" is the default in every browser (user: same Dock in Zen as in Chrome).
    // "lite" (?dock=lite), the lighter one for a browser that struggles, e.g. Firefox-based ones where blur is costly: kept as
    // cheap as possible: whole-pixel shifts and 0.005 scale steps (small pointer moves often change nothing), only the
    // two labels nearest the pointer moved (the others are invisible), the bar's stretch (which redoes its blur) in
    // 2 px steps, frames with the pointer under 1 px from the last skipped. "full": no rounding, every label follows,
    // and the icons ease into place (data-full in the CSS) like the first Dock
    const FULL = PARAMS.get("dock") !== "lite";
    // the bar stretches with the icons in every browser (16/10/2026, user: back to the stretching bar after trying a
    // fixed one in Zen); ?dockbar=fixed keeps it at its width, for a browser where the stretch is slow
    const STRETCH = PARAMS.get("dockbar") !== "fixed";
    if (PARAMS.get("dockbar") === "none") bar.dataset.nobar = "1";  // preview: icons with no frosted bar behind them
    if (FULL) bar.dataset.full = "1";
    let lastPx = null, shown = [];
    const frame = () => {
      raf = 0;
      if (px === null || !rest) return;
      if (!FULL && lastPx !== null && Math.abs(px - lastPx) < 1) return;
      lastPx = px;
      const reach = 140 * DOCK_SIZE / 52;  // how far magnification spreads, in step with the icon size
      const extra = rest.map((r) => (r.icon ? DOCK_SIZE * 0.5 * Math.max(0, 1 - Math.abs(px - r.c) / reach) : 0));  // up to 1.5 x
      const total = extra.reduce((a, b) => a + b, 0);
      let before = 0;
      rest.forEach((r, i) => {
        const raw = before + extra[i] / 2 - total / 2;
        const dx = FULL ? Math.round(raw * 10) / 10 : Math.round(raw);
        before += extra[i];
        if (!r.icon) { put(r.el, "translateX(" + dx + "px)"); return; }
        const sc = FULL ? 1 + extra[i] / DOCK_SIZE : Math.round((1 + extra[i] / DOCK_SIZE) * 200) / 200;
        put(r.icon, "translateX(" + dx + "px) scale(" + (sc * 0.6667).toFixed(4) + ")");
        r.dx = dx; r.sc = sc; r.ex = extra[i];
      });
      // labels: in lite only the two icons nearest the pointer (the one under it shows its label; two covers the
      // moment the pointer sits between them); labels that drop out go back to their resting place
      const near = rest.filter((r) => r.icon && r.ex > 0).sort((x, y) => y.ex - x.ex).slice(0, FULL ? 99 : 2);
      shown.forEach((r) => { if (!near.includes(r)) put(r.label, ""); });
      near.forEach((r) => put(r.label, "translateX(calc(-50% + " + r.dx + "px)) translateY(" + (-DOCK_SIZE * (r.sc - 1)).toFixed(1) + "px)"));
      shown = near;
      if (STRETCH) {
        const bw = FULL ? total : Math.round(total / 2) * 2;
        put(bar.querySelector(".hp-dock-bg"), bw ? "scaleX(" + ((barWidth + bw) / barWidth).toFixed(4) + ")" : "");
      }
    };
    bar.addEventListener("mouseenter", () => { measure(); bar.dataset.mag = "1"; });
    bar.addEventListener("mousemove", (e) => {
      if (!rest) { measure(); bar.dataset.mag = "1"; }
      px = e.clientX - barLeft;
      if (!raf) raf = requestAnimationFrame(frame);
    });
    bar.addEventListener("mouseleave", () => {
      px = null; lastPx = null; shown = []; delete bar.dataset.mag;  // transitions back on: everything eases back to rest
      [...bar.querySelectorAll(".hp-dock-icon, .hp-dock-label, .hp-dock-sep, .hp-dock-bg")].forEach((el) => { el.__t = ""; el.style.transform = ""; });
      rest = null;
    });
    document.body.appendChild(bar);
    // Stacks: iOS-folder icons (the group's first four links in a 2 x 2 grid)
    fetch("/api/services").then((r) => r.json()).then((groups) => {
      bar.insertAdjacentHTML("beforeend", '<span class="hp-dock-sep"></span>');
      STACKS.forEach((name) => {
        const g = groups.find((x) => x.name === name);
        const links = ((g && g.services) || []).filter((l) => l.href);
        if (!links.length) return;
        const b = item(name, "button");
        b.type = "button";
        b.classList.add("hp-dock-stack");
        const mini = document.createElement("span");
        mini.className = "hp-dock-folder";
        links.slice(0, 4).forEach((l) => mini.appendChild(iconImg(l.icon)));
        b.querySelector(".hp-dock-icon").appendChild(mini);
        b.addEventListener("click", (e) => { e.stopPropagation(); openStack(b, name, links); });
        bar.appendChild(b);
      });
    }).catch(() => {});
    document.addEventListener("click", (e) => { if (!e.target.closest("#hp-stack")) closeStack(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeStack(); });
  }

  /* ---------- room for the Dock (15/10/2026): only a tab that scrolls anyway gets 100 px under its last row, so the
     Dock never covers it; a tab that fits the screen (Home) gets none, or it would scroll just for that room ---------- */
  function dockRoom() {
    const iw = document.getElementById("inner_wrapper");
    if (!iw || !root.dataset.dock) return;
    const has = !!root.dataset.dockroom;
    const room = DOCK_SIZE + 54;  // as in the CSS
    const need = iw.scrollHeight - (has ? room : 0) > iw.clientHeight + 1;  // the content's own height, without the room
    // (on a tab that fits, the column's min-height keeps it at exactly the screen height, so no room is added)
    if (need !== has) { if (need) root.dataset.dockroom = "1"; else delete root.dataset.dockroom; }
  }

  /* ---------- sliding tab pill (15/10/2026, Apple touches): the grey "open tab" pill slides to the next tab with a
     spring, like an iOS / macOS segmented control, instead of jumping. One extra element at the end of the tab list;
     made again if Homepage ever redraws the list. Desktop only (phones have no tab bar) ---------- */
  let pillTarget = null, pillUntil = 0;  // the tab just pressed: Homepage marks it selected a moment later
  function tabPill(target) {
    const bar = document.getElementById("myTab");
    if (target) { pillTarget = target; pillUntil = Date.now() + 1000; }
    const selected = bar && bar.querySelector('[role="tab"][aria-selected="true"]');
    if (selected === pillTarget) pillUntil = 0;
    const on = (Date.now() < pillUntil && pillTarget && pillTarget.isConnected) ? pillTarget : selected;
    if (!bar || !on || PHONE.matches) return;
    let pill = document.getElementById("hp-tab-pill");
    if (!pill) {
      pill = document.createElement("span");
      pill.id = "hp-tab-pill";
      pill.setAttribute("aria-hidden", "true");
      bar.appendChild(pill);
    }
    // measured on screen, relative to the bar's padding box (the pill's containing block); not offsetLeft, which
    // would be relative to whatever list item happens to be positioned
    const br = bar.getBoundingClientRect(), r = on.getBoundingClientRect();
    const x = Math.round(r.left - br.left - bar.clientLeft), y = Math.round(r.top - br.top - bar.clientTop);
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w) return;
    const val = x + "," + y + "," + w + "," + h;
    if (pill.dataset.at === val) return;
    pill.dataset.at = val;
    pill.style.width = w + "px"; pill.style.height = h + "px"; pill.style.top = y + "px";
    pill.style.transform = "translateX(" + x + "px)";
    if (!root.dataset.pill) requestAnimationFrame(() => requestAnimationFrame(() => { root.dataset.pill = "1"; }));  // no slide on first paint
  }

  /* ---------- Live Activities (16/10/2026; on for everyone on desktop since the same day, ?live=0 hides them, ?live=demo
     shows sample data): like the macOS
     menu bar, compact capsules just before the weather that appear only while something is happening. Built to grow:
     each source below reads its data (through Homepage's own proxy, so no keys reach the page; ESPN's public
     scoreboard directly) and returns capsules; add a source by adding a block to LIVE_SOURCES. Capsules are sorted by
     PRIORITY (problems first), at most LIVE_MAX show and the rest fold into a "+N" capsule; hover shows details ---------- */
  const LIVE = PARAMS.get("live") !== "0" && !PHONE.matches;  // desktop only (phones hide the menu bar's right side)
  const LIVE_DEMO = PARAMS.get("live") === "demo";
  const LIVE_MAX = 6;
  // the football team followed in the menu bar: ESPN's abbreviation and display name, and the ESPN competitions to
  // look in (league codes from site.api.espn.com/apis/site/v2/sports/soccer/<code>/scoreboard)
  const LIVE_TEAM = { abbr: "CHE", name: "Chelsea", leagues: ["eng.1", "uefa.champions", "uefa.europa", "uefa.europa.conf", "eng.fa", "eng.league_cup"] };
  const MDI = (name) => "https://cdn.jsdelivr.net/npm/@mdi/svg@7/svg/" + name + ".svg";
  // lower = further left; within a group the order of the sources
  const PRIORITY = { down: 0, warn: 1, sport: 2, soon: 3, day: 4, home: 5, media: 6, download: 7 };
  let liveItems = [], liveTick = 0, liveCache = {};
  const proxy = (q) => fetch("/api/services/proxy?" + q, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
  const haRows = (i) => proxy("group=Infrastructure&service=Home%20Assistant&index=" + i).then((d) => (Array.isArray(d) ? d : []));
  function shortTime(min) {  // the Homepage standard: "42 min", "1 hr 5 min"
    if (!(min >= 0)) return "";
    if (min < 60) return Math.max(1, Math.round(min)) + " min";
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + " hr" + (m ? " " + m + " min" : "");
  }
  const hhmm = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const pill = (o) => Object.assign({ tone: "", mono: false, pct: 0, tip: "" }, o);

  // Each source: { every: seconds between reads, read: () => Promise of capsules }. Results are cached between reads.
  const LIVE_SOURCES = {
    // Home Assistant (hidden widgets 3-6 on the Home Assistant card): doors, blinds, washer, vacuum, Spotify, calendars
    home: { every: 15, read: () => Promise.all([3, 4, 5, 6].map(haRows)).then((ws) => {
      const rows = [].concat(...ws), v = (l) => String((rows.find((x) => x.label === l) || {}).value || "").trim();
      const out = [];
      if (/^on$/i.test(v("Front Door"))) out.push(pill({ group: "warn", icon: MDI("door-open"), mono: true, tone: "warn", text: "Front Door Open", tip: "The front door is open" }));
      if (/^on$/i.test(v("Gate"))) out.push(pill({ group: "warn", icon: MDI("gate-open"), mono: true, tone: "warn", text: "Gate Unlocked", tip: "The gate lock reports unlocked" }));
      if (/^(open|opening)$/i.test(v("Blinds")) && /below/i.test(v("Sun"))) out.push(pill({ group: "warn", icon: MDI("blinds-open"), mono: true, tone: "warn", text: "Blinds Open", tip: "The blinds are still open after dark" }));
      const ws_ = v("Washer Status"), left = parseFloat(v("Washer Left"));
      if (ws_ && !/^(not run|unknown|unavailable)$/i.test(ws_)) {
        const done = /completed/i.test(ws_), stage = /^washing$/i.test(ws_) ? "" : ws_;
        out.push(pill({ group: "home", icon: MDI(/dry/i.test(ws_) ? "tumble-dryer" : "washing-machine"), mono: true, tone: done ? "good" : "",
          text: done ? "Washer Done" : "Washer" + (stage ? " · " + stage : "") + (left > 0 ? " · " + shortTime(left) : ""),
          tip: "Washer: " + ws_ + (left > 0 && !done ? ", about " + shortTime(left) + " left" : "") }));
      }
      const vac = v("Vacuum"), vp = parseFloat(v("Vacuum Progress"));
      if (/^(cleaning|returning)$/i.test(vac)) out.push(pill({ group: "home", icon: MDI("robot-vacuum"), mono: true, pct: /cleaning/i.test(vac) ? vp : 0,
        text: /returning/i.test(vac) ? "Vacuum Returning" : "Vacuum" + (vp > 0 ? " · " + Math.round(vp) + "%" : ""), tip: "Vacuum: " + vac + (vp > 0 ? ", " + Math.round(vp) + "% done" : "") }));
      // every reading labelled "Spotify <name>" (one per account in services.yaml); the name shows on hover
      rows.filter((x) => /^Spotify /.test(x.label || "")).forEach((x) => {
        const who = x.label.slice(8), [st, title, artist] = String(x.value || "").trim().split("|");
        const art = artist && !/^\{/.test(artist) ? artist : "";
        if (/^playing$/i.test(st) && title && !/^\{/.test(title)) out.push(pill({ group: "media", icon: ICON_URL("spotify"), text: title + (art ? " · " + art : ""), tip: who + " · " + title + (art ? " · " + art : "") }));
      });
      // calendar: an event starting within 30 minutes
      [["Work Next", "calendar-clock"], ["Family Next", "calendar-heart"]].forEach(([l, ic]) => {
        const [msg, start] = v(l).split("|");
        const t = start ? Date.parse(start.replace(" ", "T")) : NaN, mins = (t - Date.now()) / 60000;
        if (msg && !/^\{/.test(msg) && mins > 0 && mins <= 30) out.push(pill({ group: "soon", icon: MDI(ic), mono: true, text: msg + " · in " + shortTime(mins), tip: msg + " at " + hhmm(new Date(t)) }));
      });
      const [bOn, bMsg] = v("Birthday").split("|"), [hOn, hMsg] = v("Holiday").split("|");
      if (/^on$/i.test(bOn) && bMsg) out.push(pill({ group: "day", icon: MDI("cake-variant"), mono: true, tone: "good", text: bMsg, tip: "Today: " + bMsg }));
      if (/^on$/i.test(hOn) && hMsg) out.push(pill({ group: "day", icon: MDI("party-popper"), mono: true, tone: "good", text: hMsg, tip: "Public holiday: " + hMsg }));
      return out;
    }) },
    // problems: services down (Gatus), containers and stacks not running or unhealthy, by name and with their state
    // (Komodo: the hidden third and fourth widgets on its tile list every stack and container; the summary's counts
    // catch anything the list misses), a drive failing (Scrutiny)
    problems: { every: 30, read: () => Promise.all([
      proxy("group=Infrastructure&service=Gatus&index=0&endpoint=status"),
      proxy("group=Infrastructure&service=Komodo&index=0&endpoint=containers"),
      proxy("group=Infrastructure&service=Komodo&index=2"),
      proxy("group=Infrastructure&service=Scrutiny&index=1"),
      proxy("group=Infrastructure&service=Komodo&index=3"),
    ]).then(([gatus, ct, stacks, scr, cons]) => {
      const out = [];
      const down = (Array.isArray(gatus) ? gatus : []).filter((e) => { const r = (e.results || []).slice(-1)[0]; return r && r.success === false; }).map((e) => e.name);
      if (down.length) out.push(pill({ group: "down", icon: MDI("alert-circle"), mono: true, tone: "bad", text: down.length === 1 ? down[0] + " Down" : down.length + " Services Down", tip: "Down (Gatus): " + down.join(", ") }));
      // the word for a state: "Down" for stopped/exited/dead, otherwise the state itself ("Unhealthy", "Restarting")
      const word = (st) => (/^(down|stopped|exited|dead|created|removing)$/i.test(st) ? "Down" : st.charAt(0).toUpperCase() + st.slice(1).toLowerCase());
      const pretty = (n) => n.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      // containers: not running, or running but reporting "(unhealthy)"
      const badC = (Array.isArray(cons) ? cons : []).map((x) => ({ name: x.name || "", st: /unhealthy/i.test(x.status || "") ? "unhealthy" : x.state || "" }))
        .filter((x) => x.name && !/^running$/i.test(x.st));
      // stacks: anything but running or deploying
      const badS = (Array.isArray(stacks) ? stacks : []).filter((x) => x && x.info && !/^(running|deploying)$/i.test(x.info.state || "running"))
        .map((x) => ({ name: x.name, st: x.info.state }));
      const cCount = ct ? (ct.stopped || 0) + (ct.unhealthy || 0) : 0;
      if (badC.length) out.push(pill({ group: "down", icon: MDI("docker"), mono: true, tone: "bad",
        text: badC.length === 1 ? pretty(badC[0].name) + " " + word(badC[0].st) : badC.length + " Containers " + (badC.every((x) => /unhealthy/i.test(x.st)) ? "Unhealthy" : "Down"),
        tip: "Komodo: " + badC.map((x) => x.name + " " + word(x.st).toLowerCase()).join(", ") }));
      else if (cCount) out.push(pill({ group: "down", icon: MDI("docker"), mono: true, tone: "bad", text: cCount + (cCount === 1 ? " Container " : " Containers ") + ((ct.unhealthy || 0) && !(ct.stopped || 0) ? "Unhealthy" : "Down"),
        tip: "Komodo: " + ct.running + " of " + ct.total + " containers running, " + (ct.stopped || 0) + " stopped, " + (ct.unhealthy || 0) + " unhealthy" }));
      if (badS.length && !badC.length) out.push(pill({ group: "down", icon: MDI("layers-triple"), mono: true, tone: "bad",
        text: badS.length === 1 ? pretty(badS[0].name) + " Stack " + word(badS[0].st) : badS.length + " Stacks Down", tip: "Komodo stacks: " + badS.map((x) => x.name + " " + x.st).join(", ") }));
      const drives = Object.values(((scr || {}).data || {}).summary || {}).filter((x) => !(x.device || {}).archived && ((x.device || {}).device_status || 0) !== 0);
      if (drives.length) out.push(pill({ group: "down", icon: MDI("harddisk"), mono: true, tone: "bad", text: drives.length === 1 ? "Drive Failing" : drives.length + " Drives Failing", tip: "Scrutiny: " + drives.map((x) => (x.device || {}).device_name || (x.device || {}).model_name || "drive").join(", ") }));
      return out;
    }) },
    // your team (LIVE_TEAM): kick-off countdown from 3 hours before, the live score and minute, full time for 4 hours
    // after (ESPN's public scoreboard, read directly; every competition in LIVE_TEAM.leagues)
    team: { every: 60, read: () => Promise.all(LIVE_TEAM.leagues.map((lg) =>
      fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/" + lg + "/scoreboard", { cache: "no-store" }).then((r) => r.json()).catch(() => null))).then((boards) => {
      const out = [];
      boards.forEach((b) => ((b || {}).events || []).forEach((e) => {
        const c = (e.competitions || [])[0]; if (!c) return;
        const teams = c.competitors || [];
        if (!teams.some((t) => (t.team || {}).abbreviation === LIVE_TEAM.abbr || (t.team || {}).displayName === LIVE_TEAM.name)) return;
        const home = teams.find((t) => t.homeAway === "home") || teams[0], away = teams.find((t) => t.homeAway === "away") || teams[1];
        const ab = (t) => (t.team || {}).abbreviation || "", ko = Date.parse(e.date), now = Date.now(), state = ((c.status || {}).type || {}).state;
        const score = ab(home) + " " + (home.score || 0) + "–" + (away.score || 0) + " " + ab(away);
        if (state === "in") out.push(pill({ group: "sport", icon: MDI("soccer"), mono: true, tone: "live", text: score + " · " + ((c.status || {}).displayClock || "Live"), tip: e.name + " · live" }));
        else if (state === "pre" && ko - now > 0 && ko - now <= 3 * 3600e3) out.push(pill({ group: "sport", icon: MDI("soccer"), mono: true,
          text: ab(home) + " v " + ab(away) + " · " + (ko - now <= 3600e3 ? "in " + shortTime((ko - now) / 60000) : hhmm(new Date(ko))), tip: e.name + " · kick-off " + hhmm(new Date(ko)) }));
        else if (state === "post" && now - ko <= 4 * 3600e3) out.push(pill({ group: "sport", icon: MDI("soccer"), mono: true, text: "FT " + score, tip: e.name + " · full time" }));
      }));
      return out;
    }) },
    // media: Plex (Tautulli on the Home tab's Plex card), up to two streams
    plex: { every: 15, read: () => proxy("group=Home&service=Plex%20Media%20Server&index=0&endpoint=get_activity").then((d) =>
      ((((d || {}).response || {}).data || {}).sessions || []).slice(0, 2).map((s) => {
        const ep = s.media_type === "episode" && s.parent_media_index ? " · S" + String(s.parent_media_index).padStart(2, "0") + "E" + String(s.media_index).padStart(2, "0") : "";
        const name = (s.grandparent_title || s.title || "Plex") + ep;
        return pill({ group: "media", icon: ICON_URL("plex"), text: (s.state === "paused" ? "❚❚ " : "") + name, pct: +s.progress_percent || 0,
          tip: (s.full_title || name) + " · " + (s.state || "playing") + " · " + (s.progress_percent || 0) + "%" + (s.player ? " · " + s.player : "") });
      })) },
    // downloads: SABnzbd
    downloads: { every: 15, read: () => proxy("group=Media%20Acquisition&service=SABnzbd&index=0&endpoint=queue").then((d) => {
      const q = (d || {}).queue;
      if (!q || !(q.slots || []).length || !/downloading/i.test(q.status || "")) return [];
      const mb = parseFloat(q.mb), mbleft = parseFloat(q.mbleft), pct = mb > 0 ? Math.round((1 - mbleft / mb) * 100) : 0;
      const tl = String(q.timeleft || "").split(":").map(Number), mins = tl.length === 3 ? tl[0] * 60 + tl[1] + tl[2] / 60 : NaN;
      return [pill({ group: "download", icon: ICON_URL("sabnzbd"), text: "Downloading" + (mins >= 0 ? " · " + shortTime(mins) : ""), pct,
        tip: q.slots.length + (q.slots.length === 1 ? " download" : " downloads") + " · " + pct + "% · " + (q.speed || "") + "B/s" })];
    }) },
  };
  const LIVE_DEMO_ITEMS = [
    pill({ group: "down", icon: MDI("alert-circle"), mono: true, tone: "bad", text: "Immich Down", tip: "Down (Gatus): Immich" }),
    pill({ group: "down", icon: MDI("docker"), mono: true, tone: "bad", text: "Immich Server Unhealthy", tip: "Komodo: immich_server unhealthy" }),
    pill({ group: "warn", icon: MDI("door-open"), mono: true, tone: "warn", text: "Front Door Open", tip: "The front door is open" }),
    pill({ group: "sport", icon: MDI("soccer"), mono: true, tone: "live", text: "EVE 0–1 CHE · 63'", tip: "Chelsea at Everton · live" }),
    pill({ group: "soon", icon: MDI("calendar-clock"), mono: true, text: "Team Meeting · in 15 min", tip: "Team Meeting at 10:00" }),
    pill({ group: "home", icon: MDI("washing-machine"), mono: true, text: "Washer · Rinse · 42 min", tip: "Washer: Rinse, about 42 min left" }),
    pill({ group: "media", icon: ICON_URL("plex"), text: "The Bear · S04E03", pct: 38, tip: "The Bear - S04E03 · playing · 38%" }),
    pill({ group: "media", icon: ICON_URL("spotify"), text: "Please Please Please · Sabrina Carpenter", tip: "You · Please Please Please · Sabrina Carpenter" }),
    pill({ group: "download", icon: ICON_URL("sabnzbd"), text: "Downloading · 3 min", pct: 64, tip: "1 download · 64% · 48 MB/s" }),
  ];
  function livePoll() {
    if (!LIVE) return;
    if (LIVE_DEMO) { liveItems = LIVE_DEMO_ITEMS; liveRender(); return; }
    const due = Object.keys(LIVE_SOURCES).filter((k) => liveTick % (LIVE_SOURCES[k].every / 15) === 0);
    liveTick++;
    Promise.all(due.map((k) => LIVE_SOURCES[k].read().then((items) => { liveCache[k] = items; }).catch(() => {}))).then(() => {
      const all = [].concat(...Object.keys(LIVE_SOURCES).map((k) => liveCache[k] || []));
      all.sort((a, b) => (PRIORITY[a.group] ?? 9) - (PRIORITY[b.group] ?? 9));
      liveItems = all.length > LIVE_MAX ? all.slice(0, LIVE_MAX - 1).concat(pill({ group: "more", icon: MDI("dots-horizontal"), mono: true,
        text: "+" + (all.length - LIVE_MAX + 1), tip: all.slice(LIVE_MAX - 1).map((x) => x.text).join(" · ") })) : all;
      liveRender();
    });
  }
  function liveRender() {
    if (!LIVE) return;
    if (!root.dataset.live) root.dataset.live = "1";  // custom.css: the disks move beside the crest to make room
    const w = document.querySelector(".hp-weather");
    const anchor = w && (w.closest(".widget-container") || w);
    if (!anchor || !anchor.parentElement) return;
    let box = document.getElementById("hp-live");
    if (!box) { box = document.createElement("div"); box.id = "hp-live"; box.setAttribute("aria-label", "Live Activities"); }
    if (box.nextElementSibling !== anchor) anchor.parentElement.insertBefore(box, anchor);
    const sig = liveItems.map((it) => it.text + "|" + it.pct + "|" + it.tone).join(";");
    if (box.dataset.sig === sig) return;  // nothing changed since the last read
    box.dataset.sig = sig;
    box.textContent = "";
    liveItems.forEach((it) => {
      const el = document.createElement("div");
      el.className = "hp-live-pill" + (it.tone ? " hp-live-" + it.tone : "");
      el.title = it.tip;
      const icon = document.createElement("span");
      icon.className = "hp-live-icon" + (it.mono ? " hp-live-mono" : "");
      if (it.mono) icon.style.setProperty("--live-icon", 'url("' + it.icon + '")'); else icon.style.backgroundImage = 'url("' + it.icon + '")';
      const text = document.createElement("span");
      text.className = "hp-live-text";
      const inner = document.createElement("span");
      inner.textContent = it.text;
      text.appendChild(inner);
      el.append(icon, text);
      if (it.pct > 0) {  // progress ring
        el.insertAdjacentHTML("beforeend", '<svg class="hp-live-ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"></circle><circle cx="10" cy="10" r="8" pathLength="100" style="stroke-dasharray:' + Math.min(100, it.pct) + ' 100"></circle></svg>');
      }
      box.appendChild(el);
    });
    // text too long for its capsule glides back and forth continuously (custom.css .hp-live-long), at an even reading
    // speed, instead of being cut off with "..."
    box.querySelectorAll(".hp-live-text").forEach((t) => {
      const over = t.firstChild.scrollWidth - t.clientWidth;
      if (over > 2) {
        t.parentElement.classList.add("hp-live-long");
        t.style.setProperty("--shift", -over + "px");
        t.style.setProperty("--glide", Math.max(2, over / 30).toFixed(1) + "s");  // about 30 px a second
      }
    });
  }

  /* ---------- idle dimming for the OLED monitor (16/10/2026; on for everyone on desktop since the same day, after 10
     minutes; ?idle=<seconds> sets another time, e.g. ?idle=10 to try it, ?idle=0 switches it off):
     after that long without mouse, keyboard or touch, the page fades to near black with a dim clock that moves a
     little every minute (so nothing sits still on the panel), and the page's own animations pause. Any movement
     brings it straight back; that first click only wakes the page ---------- */
  const IDLE_S = PARAMS.has("idle") ? parseInt(PARAMS.get("idle"), 10) || 0 : 600;
  let idleTimer = 0, idleClock = 0;
  function idleTick() {
    const el = document.getElementById("hp-idle");
    if (!el) return;
    const now = new Date();
    el.querySelector(".hp-idle-time").textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    el.querySelector(".hp-idle-date").textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    // a small drift each minute: up to 6 % of the screen from the centre
    const k = Math.floor(now.getTime() / 60000);
    el.style.setProperty("--dx", ((k * 37) % 13 - 6) + "vw");
    el.style.setProperty("--dy", ((k * 53) % 13 - 6) + "vh");
  }
  function idleOn() {
    if (document.getElementById("hp-idle")) return;
    document.body.insertAdjacentHTML("beforeend", '<div id="hp-idle" aria-hidden="true"><div class="hp-idle-clock"><div class="hp-idle-time"></div><div class="hp-idle-date"></div></div></div>');
    idleTick();
    idleClock = setInterval(idleTick, 15000);
    requestAnimationFrame(() => { root.dataset.idle = "1"; });
  }
  function idleWake(e) {
    const el = document.getElementById("hp-idle");
    if (el) {
      if (e && (e.type === "pointerdown" || e.type === "click")) { e.preventDefault(); e.stopPropagation(); }  // the waking click does nothing else
      delete root.dataset.idle;
      clearInterval(idleClock);
      setTimeout(() => el.remove(), 400);
    }
    clearTimeout(idleTimer);
    if (IDLE_S > 0 && !PHONE.matches) idleTimer = setTimeout(idleOn, IDLE_S * 1000);
  }
  if (IDLE_S > 0) {
    ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => document.addEventListener(t, idleWake, { capture: true, passive: t !== "pointerdown" }));
    idleWake();
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
    gotifyReceived();
    if (scrutinyDate === null) scrutinyPoll();  // first read as soon as the card exists, not up to a minute later (16/10/2026)
    scrutinyReading();
    technitiumCounts();
    runningOnly();
    unifiFigures();
    statsSwitch();
    dock();
    tabPill();
    dockRoom();
    liveRender();
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
    settleQuiet = setTimeout(reveal, 100);  // 100 ms of quiet (was 250; user 15/10/2026: shorter fade-in)
  }
  function frames() {
    document.querySelectorAll("iframe:not([data-fade])").forEach((f) => {
      f.dataset.fade = "wait";
      f.addEventListener("load", () => setTimeout(() => { f.dataset.fade = "in"; }, 250), { once: true });
      setTimeout(() => { if (f.dataset.fade === "wait") f.dataset.fade = "in"; }, 3000);
    });
  }
  startSettling(800);  // first load: at most 0.8 s hidden (was 1.5 s)
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest('#myTab [role="tab"]');
    if (t && t.getAttribute("aria-selected") !== "true") startSettling(400);  // tab switch: at most 0.4 s (was 1 s)
  }, true);
  window.addEventListener("hashchange", () => startSettling(400));
  // the tab pill starts sliding on pointer-down, before Homepage redraws the new tab (that redraw would otherwise
  // hold the slide back until the page watcher runs)
  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest && e.target.closest('#myTab [role="tab"]');
    if (t && e.button === 0) tabPill(t);
  }, true);

  let pending = false;
  new MutationObserver(() => {
    frames();
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; run(); settled(); }, 150);
  }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-selected"] });

  sky();
  setInterval(sky, 300000);
  haWeatherPoll();
  setInterval(haWeatherPoll, 300000);
  if (PARAMS.get("mood")) { previewTick(); setInterval(previewTick, 1000); }
  gotifyPoll();
  setInterval(gotifyPoll, 15000);
  scrutinyPoll();
  unifiPoll();
  setInterval(unifiPoll, 60000);
  synoPoll();
  setInterval(synoPoll, 60000);
  setInterval(scrutinyPoll, 60000);
  notesPoll();
  setInterval(notesPoll, 15000);
  livePoll();
  if (LIVE) setInterval(livePoll, 15000);
  // sample banners: a normal one and a priority 8 one that stays; ?note=hold keeps both on screen (for screenshots)
  if (/^(test|hold)$/.test(PARAMS.get("note") || "")) setTimeout(() => {
    const hold = PARAMS.get("note") === "hold";
    showNote({ appid: 5, priority: hold ? 8 : 5, title: "Episode Downloaded", message: "The Bear · S04E03 · WEB-DL 1080p" });
    setTimeout(() => showNote({ appid: 24, priority: 8, title: "Immich Is Down", message: "HTTP check failed 3 times in a row." }), 900);
  }, 1500);
  PHONE.addEventListener?.("change", run);
  window.addEventListener("resize", () => { tabPill(); dockRoom(); });
  window.addEventListener("load", run);
})();
