/* ============================================================================
   HOMEPAGE CUSTOM JAVASCRIPT - OPTIMIZED
   ============================================================================ */

const CONFIG = {
  STORAGE_KEY: "lastFocusedTabId",
  TIMING: {
    RETRY_DELAY: 500,
    STANDARD_REFRESH: 1800000,
    QUICK_REFRESH: 60000,
    RETRY_ON_ERROR: 30000,
  },
  CROWDSEC: { LIMIT: 50, MAX_ALERTS: 100 },
  QUICK_REFRESH_SERVICES: ["#hawidget", "#plex2"],
};

/* ============================================================================
   MOBILE DETECTION - Simple version using Mobile tab
   ============================================================================ */

function isMobile() {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent);
  return hasTouch || mobileUA;
}

function applyMobileStyles() {
  if (!isMobile()) return;

  // Hide tab bar and show Mobile tab
  const tabBar = document.getElementById("myTab");
  if (tabBar) tabBar.style.display = "none";

  // Hide all tabs except Mobile
  ["Home", "Calendars", "Applications", "Bookmarks", "News"].forEach((tabId) => {
    const tab = document.getElementById(tabId);
    if (tab) tab.style.display = "none";
  });

  // Show Mobile tab
  const mobileTab = document.getElementById("Mobile");
  if (mobileTab) {
    mobileTab.style.display = "block";
    mobileTab.classList.add("active");
  }

  // Click Mobile tab button to activate it
  const mobileTabBtn = document.getElementById("Mobile-tab");
  if (mobileTabBtn) mobileTabBtn.click();

  // Hide widgets
  const widgets = document.getElementById("information-widgets");
  if (widgets) widgets.style.display = "none";
}

function setupMobileHandler() {
  if (!isMobile()) return;

  // Apply mobile styles with delays to catch content as it loads
  [100, 500, 1000, 2000].forEach((delay) => {
    setTimeout(applyMobileStyles, delay);
  });
}

const RELOAD_BUTTON_SELECTORS = [
  "#revalidate",
  '[data-testid="revalidate"]',
  ".reload-button",
  'button[aria-label="Reload"]',
  '[role="button"][aria-label="Reload"]',
];

const IFRAME_CONFIG = [
  { selector: ".home-assistant", src: "{{HOMEPAGE_VAR_HOME_ASSISTANT_WIDGET_URL}}" },
  { selector: ".glance", src: "{{HOMEPAGE_VAR_GLANCE_WIDGET_URL}}" },
  { selector: ".epl", src: "{{HOMEPAGE_VAR_EPL_STANDINGS_WIDGET_URL}}" },
];

const IFRAME_SELECTORS = IFRAME_CONFIG.map((c) => c.selector).join(", ");

const TAB_MAPPING = {
  "#applications": ["#Applications-tab", "#Applications"],
  "#calendars": ["#Calendars-tab", "#Calendars"],
  "#bookmarks": ["#Bookmarks-tab", "#Bookmarks"],
  "#home": ["#Home-tab", "#Home"],
  "": ["#Home-tab", "#Home"],
};

const DATE_WIDGETS = [
  { id: "#tautulli_recent_movies", addLeadingZero: true },
  { id: "#tautulli_recent_shows", addLeadingZero: true },
  { id: "#upcominggames", addLeadingZero: true },
  { id: "#upcomingtv", addLeadingZero: true },
];

const TCM_SELECTORS = [
  "#titlecardmaker",
  'li.service:has(a[href*="tcm."])',
  'li.service:has(a[href*="titlecardmaker"])',
  '[data-name="TitleCardMaker"]',
];

const state = {
  lastUpdate: new WeakMap(),
  currentFocusedTab: null,
  observers: { reloadButton: null, resize: null, tcm: null, dateWidgets: [] },
};

const domCache = {
  myTab: null,
  tabContents: null,
  activeTabContent: null,
  init() {
    this.myTab = document.getElementById("myTab");
    this.tabContents = document.querySelectorAll(".tabcontent");
    this.updateActiveTab();
  },
  updateActiveTab() {
    this.activeTabContent = document.querySelector(".tabcontent.active");
  },
};

const storage = {
  save: (tabId) => {
    try { localStorage.setItem(CONFIG.STORAGE_KEY, tabId); } catch {}
  },
  get: () => {
    try { return localStorage.getItem(CONFIG.STORAGE_KEY); } catch { return null; }
  },
};

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

const retry = (fn, maxRetries, delay) => {
  const attempt = (count = 0) => {
    if (fn() || count >= maxRetries) return;
    setTimeout(() => attempt(count + 1), delay);
  };
  attempt();
};

function removeReloadButton() {
  RELOAD_BUTTON_SELECTORS.forEach((sel) =>
    document.querySelectorAll(sel).forEach((el) => el.remove())
  );
}

function setupReloadButtonObserver() {
  if (state.observers.reloadButton) return;

  const observer = new MutationObserver(
    throttle((mutations) => {
      if (mutations.some((m) => m.addedNodes.length > 0)) {
        removeReloadButton();
      }
    }, 100)
  );

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  state.observers.reloadButton = observer;
}

function updateServiceCard(card, data) {
  requestAnimationFrame(() => {
    const title = card.querySelector(".card-title");
    const status = card.querySelector(".card-status");
    if (title && data.title) title.textContent = data.title;
    if (status) {
      status.textContent = Array.isArray(data)
        ? `${data.length} items`
        : data.status ?? (typeof data === "object" ? "Data received" : "");
    }
  });
}

function updateServiceCardError(card, error) {
  requestAnimationFrame(() => {
    const status = card.querySelector(".card-status");
    if (status) {
      status.textContent = error.message.includes("404") ? "Service unavailable" : "Error loading data";
      status.style.color = "red";
    }
  });
}

async function handleCrowdSecAlerts(apiEndpoint) {
  const { LIMIT, MAX_ALERTS } = CONFIG.CROWDSEC;
  const allData = [];

  for (let page = 1; allData.length < MAX_ALERTS; page++) {
    const sep = apiEndpoint.includes("?") ? "&" : "?";
    const response = await fetch(`${apiEndpoint}${sep}page=${page}&limit=${LIMIT}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    allData.push(...(data.results || data));
    if (!data.hasNextPage || allData.length >= MAX_ALERTS) break;
  }

  return allData.slice(0, MAX_ALERTS);
}

async function refreshService(card) {
  const apiEndpoint = card.dataset.apiEndpoint;
  if (!apiEndpoint) return;

  const serviceId = card.id || apiEndpoint;
  const now = Date.now();
  const lastUpdateTime = state.lastUpdate.get(card) || 0;
  const isQuick = CONFIG.QUICK_REFRESH_SERVICES.includes(serviceId);
  const minInterval = isQuick ? CONFIG.TIMING.QUICK_REFRESH : CONFIG.TIMING.STANDARD_REFRESH;

  if (now - lastUpdateTime < minInterval) return;

  try {
    card.classList.add("updating");
    const isCrowdSec = apiEndpoint.includes("CrowdSec") && apiEndpoint.includes("alerts");

    const response = isCrowdSec
      ? await handleCrowdSecAlerts(apiEndpoint)
      : await fetch(apiEndpoint, { signal: AbortSignal.timeout(10000) }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        });

    updateServiceCard(card, response);
    state.lastUpdate.set(card, now);
  } catch (error) {
    console.error(`${serviceId} refresh failed:`, error);
    updateServiceCardError(card, error);
    state.lastUpdate.set(card, now - (minInterval - CONFIG.TIMING.RETRY_ON_ERROR));
  } finally {
    card.classList.remove("updating");
  }
}

async function batchUpdateServiceCards(cards) {
  const batchSize = 3;
  for (let i = 0; i < cards.length; i += batchSize) {
    await Promise.all(cards.slice(i, i + batchSize).map(refreshService));
    if (i + batchSize < cards.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

function setTabFocus(tab) {
  requestAnimationFrame(() => {
    state.currentFocusedTab?.classList.remove("tab-focused");
    state.currentFocusedTab = tab;
    tab.classList.add("tab-focused");
  });
}

function showTabContent(el) {
  if (!el) return;
  el.classList.add("active");
  el.style.display = "block";

  const iframes = el.querySelectorAll("iframe");
  if (iframes.length) {
    requestAnimationFrame(() => {
      iframes.forEach((iframe) => {
        if (iframe.src && iframe.src !== "about:blank") {
          const src = iframe.src;
          iframe.src = "about:blank";
          requestAnimationFrame(() => (iframe.src = src));
        }
      });
    });
  }
  domCache.updateActiveTab();
}

function handleTabFocusFromURL() {
  const hash = window.location.hash.toLowerCase();
  const [tabSel, contentSel] = TAB_MAPPING[hash] || TAB_MAPPING[""];
  const tab = document.querySelector(tabSel);
  const content = document.querySelector(contentSel);

  if (tab) {
    setTabFocus(tab);
    storage.save(tab.id);
    domCache.tabContents.forEach((c) => {
      c.classList.remove("active");
      c.style.display = "none";
    });
    showTabContent(content);
  }
}

function preloadIframes() {
  retry(() => {
    let allFound = true;
    IFRAME_CONFIG.forEach(({ selector, src }) => {
      const elements = document.querySelectorAll(selector);
      if (!elements.length) { allFound = false; return; }

      elements.forEach((el) => {
        if (!el.src) {
          el.src = src;
          el.classList.add("iframe-loading");
          el.addEventListener("load", () => {
            el.classList.remove("iframe-loading");
            el.classList.add("iframe-loaded");
          }, { once: true });
        }
      });
    });
    return allFound;
  }, 3, 1000);
}

async function preloadAllTabs() {
  const cards = new Set();
  document.querySelectorAll(".tab-pane .service-card").forEach((c) => cards.add(c));
  await batchUpdateServiceCards([...cards]);
}

function setupPeriodicRefresh() {
  const debouncedRefresh = debounce(async () => {
    if (domCache.activeTabContent) {
      const cards = domCache.activeTabContent.querySelectorAll(".service-card[data-api-endpoint]");
      await batchUpdateServiceCards([...cards]);
    }
  }, 250);

  setInterval(debouncedRefresh, CONFIG.TIMING.QUICK_REFRESH);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") debouncedRefresh();
  });

  domCache.myTab?.addEventListener("click", (e) => {
    if (e.target.matches('[id$="-tab"]')) debouncedRefresh();
  });
}

function initializeTabFocus() {
  const tabs = document.querySelectorAll("#News-tab, #Calendars-tab, #Applications-tab, #Home-tab, #Bookmarks-tab");

  handleTabFocusFromURL();

  if (!window.location.hash) {
    const savedTabId = storage.get();
    const savedTab = savedTabId && document.getElementById(savedTabId);

    if (savedTab) {
      setTabFocus(savedTab);
    } else {
      const activeTab = document.querySelector(".tabcontent.active");
      const correspondingTab = activeTab && document.querySelector(`[aria-controls="${activeTab.id}"]`);
      if (correspondingTab) setTabFocus(correspondingTab);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      setTabFocus(this);
      storage.save(this.id);
    });

    tab.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
      }
    });
  });

  window.addEventListener("beforeunload", () => {
    if (state.currentFocusedTab) storage.save(state.currentFocusedTab.id);
  });
}

function setupResizeObserver() {
  if (state.observers.resize) return;

  const observer = new ResizeObserver(
    throttle((entries) => {
      entries.forEach((entry) => {
        const container = entry.target;
        const iframe = container.tagName === "IFRAME" ? container : container.querySelector("iframe");
        if (iframe) {
          iframe.style.height = `${entry.contentRect.height}px`;
          iframe.style.width = `${entry.contentRect.width}px`;
        }
      });
    }, 100)
  );

  document.querySelectorAll(IFRAME_SELECTORS).forEach((c) => observer.observe(c));
  state.observers.resize = observer;
}

let isHidingDates = false;
const DATE_REGEX = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d)(?!\d)/gi;
const TIME_REGEX = /\b(\d):(\d{2})\b/g;
const DATE_PATTERN = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}[\s\/\-])/i;

function formatIframeLeadingZeros() {
  document.querySelectorAll(".home-assistant iframe, iframe[src*='home-assistant'], iframe[src*='homeassistant']").forEach((iframe) => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent;
        if (TIME_REGEX.test(text)) {
          TIME_REGEX.lastIndex = 0;
          node.textContent = text.replace(TIME_REGEX, "0$1:$2");
        }
        TIME_REGEX.lastIndex = 0;
      }
    } catch (e) {
      // Cross-origin iframe - cannot access content
    }
  });
}

function formatLeadingZeros(widget) {
  const walker = document.createTreeWalker(widget, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    if (DATE_REGEX.test(text)) {
      DATE_REGEX.lastIndex = 0;
      node.textContent = text.replace(DATE_REGEX, "$1 0$2");
    }
    DATE_REGEX.lastIndex = 0;
  }
}

function hideDuplicateDates() {
  if (isHidingDates) return;
  isHidingDates = true;

  DATE_WIDGETS.forEach(({ id, addLeadingZero }) => {
    const widget = document.querySelector(id);
    if (!widget) return;

    if (addLeadingZero) {
      formatLeadingZeros(widget);
    }

    let rows = widget.querySelectorAll(".flex.flex-row.text-right");
    if (!rows.length) rows = widget.querySelectorAll(".flex.flex-row");
    if (!rows.length) rows = widget.querySelectorAll("[class*='flex']");
    if (!rows.length) return;

    let lastDate = "";
    rows.forEach((row) => {
      let dateEl = row.querySelector("div:first-child") ||
                   row.querySelector("span:first-child") ||
                   row.firstElementChild;
      if (!dateEl) return;

      const currentDate = dateEl.textContent.trim();

      // Only process elements that actually look like dates, skip show titles etc.
      if (!DATE_PATTERN.test(currentDate)) return;

      const shouldHide = currentDate === lastDate;

      if ((dateEl.style.visibility === "hidden") !== shouldHide) {
        dateEl.style.visibility = shouldHide ? "hidden" : "visible";
      }
      if (!shouldHide) lastDate = currentDate;
    });
  });

  isHidingDates = false;
}

const debouncedHideDates = debounce(hideDuplicateDates, 150);

function setupDateWidgetObservers() {
  const widgetIds = DATE_WIDGETS.map((w) => w.id);

  retry(() => {
    let allFound = true;
    widgetIds.forEach((id) => {
      if (state.observers.dateWidgets.some((o) => o.id === id)) return;

      const widget = document.querySelector(id);
      if (!widget) { allFound = false; return; }

      const observer = new MutationObserver(() => {
        debouncedHideDates();
      });

      observer.observe(widget, { childList: true, subtree: true, characterData: true });
      state.observers.dateWidgets.push({ id, observer });

      debouncedHideDates();
    });
    return allFound;
  }, 10, 1000);
}

function findTCMWidget() {
  for (const sel of TCM_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

let isFormattingTCM = false;

function formatTCMNumbers() {
  if (isFormattingTCM) return false;

  const widget = findTCMWidget();
  if (!widget) return false;

  isFormattingTCM = true;
  let formatted = false;

  widget.querySelectorAll("div, span, p").forEach((el) => {
    if (el.children.length > 0) return;

    const text = el.textContent.trim();
    if (/^\d{4,}$/.test(text)) {
      el.textContent = text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      formatted = true;
    }
  });

  isFormattingTCM = false;
  return formatted;
}

function setupTCMObserver() {
  const widget = findTCMWidget();
  if (!widget) return false;

  state.observers.tcm?.disconnect();

  state.observers.tcm = new MutationObserver((mutations) => {
    const needsFormat = mutations.some((m) => {
      if (m.type === "characterData") {
        return /^\d{4,}$/.test(m.target.textContent?.trim());
      }
      return m.type === "childList" && m.addedNodes.length > 0;
    });

    if (needsFormat) {
      requestAnimationFrame(formatTCMNumbers);
    }
  });

  state.observers.tcm.observe(widget, { childList: true, subtree: true, characterData: true });
  formatTCMNumbers();
  return true;
}

function cleanup() {
  state.observers.reloadButton?.disconnect();
  state.observers.resize?.disconnect();
  state.observers.tcm?.disconnect();
  state.observers.dateWidgets.forEach(({ observer }) => observer.disconnect());

  state.observers = { reloadButton: null, resize: null, tcm: null, dateWidgets: [] };
  state.currentFocusedTab = null;
}

function initializeEverything() {
  removeReloadButton();
  setupReloadButtonObserver();
  [100, 500, 1000].forEach((d) => setTimeout(removeReloadButton, d));

  // Setup mobile handling first (priority)
  setupMobileHandler();

  if (document.querySelector("#myTab") && document.querySelector(".service-card")) {
    domCache.init();
    // Skip tab focus initialization on mobile since we force Applications tab
    if (!isMobile()) {
      initializeTabFocus();
    }
    preloadIframes();
    preloadAllTabs();
    setupPeriodicRefresh();
    setupResizeObserver();
    setupDateWidgetObservers();
    formatTCMNumbers();
    retry(setupTCMObserver, 10, 1000);
    // Format iframe times after they load
    [1000, 3000, 5000].forEach((d) => setTimeout(formatIframeLeadingZeros, d));
  } else {
    setTimeout(initializeEverything, CONFIG.TIMING.RETRY_DELAY);
  }

  setInterval(hideDuplicateDates, 60000);
  setInterval(formatIframeLeadingZeros, 10000);
}

// Mobile: Apply styles on first touch
window.addEventListener("touchstart", () => {
  if (isMobile()) applyMobileStyles();
}, { once: true, passive: true });

document.addEventListener("DOMContentLoaded", () => {
  removeReloadButton();
  if (isMobile()) setupMobileHandler();
});
window.addEventListener("load", initializeEverything);
window.addEventListener("unload", cleanup);

document.getElementById("myTab")?.addEventListener("click", (e) => {
  if (e.target.matches('[id$="-tab"]')) {
    debouncedHideDates();
    requestAnimationFrame(formatTCMNumbers);
    setTimeout(formatTCMNumbers, 100);
    setTimeout(formatTCMNumbers, 500);
    setTimeout(formatIframeLeadingZeros, 200);
    setTimeout(formatIframeLeadingZeros, 1000);
  }
});
// ============================================================================
// HUB GLASS THEME (05/10/2026): give each section its accent colour (--acc),
// used by the CSS for the header dot, hover glow and bookmark chips.
// To go back: restore custom.js.bak-20261005-glass.
// ============================================================================
(function () {
  var ACCENTS = [
    ["infrastructure", "100, 210, 255"], ["networking", "48, 209, 88"], ["acquisition", "255, 159, 10"],
    ["media tools", "255, 55, 95"], ["productivity", "191, 90, 242"], ["more apps", "94, 92, 230"],
    ["3d printing", "255, 159, 10"], ["entertainment", "255, 55, 95"], ["homelab", "100, 210, 255"],
    ["reference", "255, 214, 10"], ["shopping", "48, 209, 88"], ["social", "10, 132, 255"],
    ["tools", "172, 142, 104"], ["work", "191, 90, 242"], ["servers", "10, 132, 255"],
    ["apps", "48, 209, 88"]
  ];
  function tagGroups() {
    document.querySelectorAll(".services-group, .bookmark-group").forEach(function (g) {
      if (g.dataset.acc) return;
      var n = g.querySelector(".service-group-name, .bookmark-group-name");
      if (!n) return;
      var t = n.textContent.toLowerCase();
      for (var i = 0; i < ACCENTS.length; i++) {
        if (t.indexOf(ACCENTS[i][0]) !== -1) {
          g.style.setProperty("--acc-rgb", ACCENTS[i][1]);
          g.style.setProperty("--acc", "rgb(" + ACCENTS[i][1] + ")");
          g.dataset.acc = ACCENTS[i][0];
          return;
        }
      }
      g.dataset.acc = "default";
    });
  }
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; tagGroups(); }, 150);
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", tagGroups);
})();

// ============================================================================
// ROUND 8 (05/10/2026): time-of-day background and coloured disk bars.
// ============================================================================
(function () {
  function sky() {
    var h = new Date().getHours();
    var s = (h >= 22 || h < 5) ? "night" : (h < 8 ? "dawn" : (h < 17 ? "day" : "dusk"));
    if (document.documentElement.dataset.sky !== s) document.documentElement.dataset.sky = s;
  }
  // disk bars: section colour per disk, amber above 75 %, red above 90 %
  var DISKS = [["docker vm", "10, 132, 255"], ["nas storage", "48, 209, 88"], ["usb backup", "255, 159, 10"]];
  function bars() {
    document.querySelectorAll(".widget-container").forEach(function (r) {  // the whole widget (bars + label); Homepage gives it no resources class
      var t = r.textContent.toLowerCase(), rgb = null;
      for (var i = 0; i < DISKS.length; i++) { if (t.indexOf(DISKS[i][0]) !== -1) { rgb = DISKS[i][1]; break; } }
      var fill = r.querySelector(".resource-usage > div");
      var pct = fill ? parseFloat(fill.style.width) : NaN;
      if (!isNaN(pct) && pct > 90) rgb = "255, 69, 58";
      else if (!isNaN(pct) && pct > 75) rgb = "255, 159, 10";
      if (rgb && r.style.getPropertyValue("--bar-rgb") !== rgb) r.style.setProperty("--bar-rgb", rgb);
      var key = t.indexOf("docker vm") !== -1 ? "docker" : (t.indexOf("nas storage") !== -1 ? "nas" : (t.indexOf("usb backup") !== -1 ? "usb" : ""));
      if (key && r.dataset.disk !== key) r.dataset.disk = key;
    });
  }
  sky();
  setInterval(sky, 300000);
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; bars(); }, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", bars);
})();

// Hub-style clock in the top bar (05/10/2026): two datetime widgets; tag the one showing a time
// so the CSS can make it the big clock and the other a date capsule.
(function () {
  function tag() {
    document.querySelectorAll(".information-widget-datetime").forEach(function (d) {
      var k = d.textContent.indexOf(":") !== -1 ? "time" : "date";
      if (d.dataset.clock !== k) d.dataset.clock = k;
    });
  }
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; tag(); }, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", tag);
})();

// Weather mood (05/10/2026): read the Open-Meteo widget's condition text and set data-weather on
// <html> (clear / cloudy / rain / storm); the CSS adds rain streaks, a storm flash or a dimmer glow.
(function () {
  function mood() {
    var w = document.querySelector(".information-widget-openmeteo");
    if (!w) {  // fallback: Homepage may drop the widget class (it did for the disk widgets)
      var all = document.querySelectorAll("#information-widgets .widget-container");
      for (var i = 0; i < all.length; i++) { if (all[i].textContent.indexOf("°") !== -1) { w = all[i]; break; } }
    }
    if (w && !w.classList.contains("hp-weather")) w.classList.add("hp-weather");
    var t = w ? w.textContent.toLowerCase() : "";
    var m = "clear";
    if (/thunder/.test(t)) m = "storm";
    else if (/rain|drizzle|shower/.test(t)) m = "rain";
    else if (/overcast|fog|mist/.test(t) || (/cloud/.test(t) && !/partly|mainly|few/.test(t))) m = "cloudy";  // partly cloudy stays clear
    if (document.documentElement.dataset.weather !== m) document.documentElement.dataset.weather = m;
  }
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; mood(); }, 300);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("load", mood);
})();

// Bookmarks (05/10/2026): order the sections from most to fewest links (ties keep their
// settings.yaml order). Re-runs whenever the page changes, so new bookmarks re-sort.
(function () {
  function activeTab() {
    var b = document.querySelector('#myTab [role="tab"][aria-selected="true"]');
    return b ? b.id.replace(/-tab$/, "").toLowerCase() : "";
  }
  function sortBookmarks() {
    // Homepage shows only the open tab's groups in one shared container (no #Bookmarks panel),
    // so mark the open tab on <html> for the CSS, and sort only while Bookmarks is open.
    var tab = activeTab();
    if (document.documentElement.dataset.tab !== tab) document.documentElement.dataset.tab = tab;
    var groups = document.querySelectorAll(".services-group");
    for (var i = 0; i < groups.length; i++) {
      var order = "";
      if (tab === "bookmarks") order = String((100 - groups[i].querySelectorAll("li.service").length) * 100 + i);
      if (groups[i].style.order !== order) groups[i].style.order = order;
    }
  }
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; sortBookmarks(); }, 200);
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
  window.addEventListener("load", sortBookmarks);
})();
