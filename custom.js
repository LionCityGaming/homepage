/* ============================================================================
   HOMEPAGE CUSTOM JAVASCRIPT - OPTIMIZED
   ============================================================================ */

const CONFIG = {
  STORAGE: {
    KEY: "lastFocusedTabId",
  },
  TIMING: {
    RETRY_DELAY: 500,
    STANDARD_REFRESH: 1800000, // 30 minutes (optimized from 5)
    QUICK_REFRESH: 60000, // 1 minute (optimized from 10 sec)
    RETRY_ON_ERROR: 30000,
    BATCH_DELAY: 100,
  },
  CROWDSEC: {
    LIMIT: 50,
    MAX_ALERTS: 100,
  },
  SERVICES: {
    QUICK_REFRESH: ["#hawidget", "#plex2"], // Only critical widgets
  },
};

const RELOAD_BUTTON_SELECTORS = [
  "#revalidate",
  '[data-testid="revalidate"]',
  ".reload-button",
  'button[aria-label="Reload"]',
  '[role="button"][aria-label="Reload"]',
];

const IFRAME_CONFIG = [
  {
    selector: ".home-assistant",
    src: "{{HOMEPAGE_VAR_HOME_ASSISTANT_WIDGET_URL}}",
  },
  {
    selector: ".glance",
    src: "{{HOMEPAGE_VAR_GLANCE_WIDGET_URL}}",
  },
  {
    selector: ".epl",
    src: "{{HOMEPAGE_VAR_EPL_STANDINGS_WIDGET_URL}}",
  },
];

const TAB_MAPPING = {
  "#applications": ["#Applications-tab", "#Applications"],
  "#calendars": ["#Calendars-tab", "#Calendars"],
  "#home": ["#Home-tab", "#Home"],
  "": ["#Home-tab", "#Home"],
};

const state = {
  lastUpdate: new WeakMap(),
  currentFocusedTab: null,
  observers: {
    reloadButton: null,
    resize: null,
    tcm: null,
  },
};

const domCache = {
  myTab: null,
  tabContents: null,
  activeTabContent: null,

  initCache() {
    this.myTab = document.getElementById("myTab");
    this.tabContents = document.querySelectorAll(".tabcontent");
    this.updateActiveTab();
  },

  updateActiveTab() {
    this.activeTabContent = document.querySelector(".tabcontent.active");
  },

  clear() {
    this.myTab = null;
    this.tabContents = null;
    this.activeTabContent = null;
  },
};

const storage = {
  save(tabId) {
    try {
      localStorage.setItem(CONFIG.STORAGE.KEY, tabId);
    } catch (error) {
      console.warn("Storage save failed:", error);
    }
  },

  get() {
    try {
      return localStorage.getItem(CONFIG.STORAGE.KEY);
    } catch (error) {
      console.warn("Storage retrieval failed:", error);
      return null;
    }
  },
};

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function removeReloadButton() {
  RELOAD_BUTTON_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => element.remove());
  });
}

function setupReloadButtonObserver() {
  if (state.observers.reloadButton) {
    return state.observers.reloadButton;
  }

  const observer = new MutationObserver(
    throttle((mutations) => {
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
      if (hasAddedNodes) {
        removeReloadButton();
      }
    }, 100),
  );

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  state.observers.reloadButton = observer;
  return observer;
}

function updateServiceCard(card, data) {
  requestAnimationFrame(() => {
    const titleElement = card.querySelector(".card-title");
    const statusElement = card.querySelector(".card-status");

    if (titleElement && data.title) {
      titleElement.textContent = data.title;
    }

    if (statusElement) {
      statusElement.textContent = Array.isArray(data)
        ? `${data.length} items`
        : (data.status ?? (typeof data === "object" ? "Data received" : ""));
    }
  });
}

function updateServiceCardError(card, error) {
  requestAnimationFrame(() => {
    const statusElement = card.querySelector(".card-status");
    if (statusElement) {
      statusElement.textContent = error.message.includes("404")
        ? "Service unavailable"
        : "Error loading data";
      statusElement.style.color = "red";
    }
  });
}

async function handleCrowdSecAlerts(card, apiEndpoint) {
  const { LIMIT, MAX_ALERTS } = CONFIG.CROWDSEC;
  const allData = [];

  for (let page = 1; allData.length < MAX_ALERTS; page++) {
    const separator = apiEndpoint.includes("?") ? "&" : "?";
    const paginatedEndpoint = `${apiEndpoint}${separator}page=${page}&limit=${LIMIT}`;

    const response = await fetch(paginatedEndpoint, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const results = data.results || data;
    allData.push(...results);

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
  const isQuickRefreshService =
    CONFIG.SERVICES.QUICK_REFRESH.includes(serviceId);
  const minInterval = isQuickRefreshService
    ? CONFIG.TIMING.QUICK_REFRESH
    : CONFIG.TIMING.STANDARD_REFRESH;

  if (now - lastUpdateTime < minInterval) return;

  try {
    card.classList.add("updating");

    const isCrowdSecAlerts =
      apiEndpoint.includes("CrowdSec") && apiEndpoint.includes("alerts");

    const response = isCrowdSecAlerts
      ? await handleCrowdSecAlerts(card, apiEndpoint)
      : await fetch(apiEndpoint, {
          signal: AbortSignal.timeout(10000),
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        });

    updateServiceCard(card, response);
    state.lastUpdate.set(card, now);
  } catch (error) {
    console.error(`${serviceId} refresh failed:`, error);
    updateServiceCardError(card, error);
    state.lastUpdate.set(
      card,
      now - (minInterval - CONFIG.TIMING.RETRY_ON_ERROR),
    );
  } finally {
    card.classList.remove("updating");
  }
}

async function batchUpdateServiceCards(cards) {
  const batchSize = 3;
  const batches = [];

  for (let i = 0; i < cards.length; i += batchSize) {
    batches.push(cards.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await Promise.all(batch.map(refreshService));
    if (batches.length > 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.TIMING.BATCH_DELAY),
      );
    }
  }
}

function handleTabFocusFromURL() {
  const hash = window.location.hash.toLowerCase();
  const [tabSelector, contentSelector] = TAB_MAPPING[hash] || TAB_MAPPING[""];

  const tabToFocus = document.querySelector(tabSelector);
  const contentToShow = document.querySelector(contentSelector);

  if (tabToFocus) {
    setTabFocus(tabToFocus);
    storage.save(tabToFocus.id);

    domCache.tabContents.forEach((content) => {
      content.classList.remove("active");
      content.style.display = "none";
    });

    if (contentToShow) {
      showTabContent(contentToShow);
    }
  }
}

function setTabFocus(tab) {
  requestAnimationFrame(() => {
    if (state.currentFocusedTab) {
      state.currentFocusedTab.classList.remove("tab-focused");
    }
    state.currentFocusedTab = tab;
    state.currentFocusedTab.classList.add("tab-focused");
  });
}

function showTabContent(contentElement) {
  if (!contentElement) return;

  contentElement.classList.add("active");
  contentElement.style.display = "block";

  const iframes = contentElement.querySelectorAll("iframe");
  if (iframes.length > 0) {
    requestAnimationFrame(() => {
      iframes.forEach((iframe) => {
        if (iframe.src && iframe.src !== "about:blank") {
          const currentSrc = iframe.src;
          iframe.src = "about:blank";
          requestAnimationFrame(() => {
            iframe.src = currentSrc;
          });
        }
      });
    });
  }

  domCache.updateActiveTab();
}

function preloadIframes() {
  const maxRetries = 3;
  const retryDelay = 1000;

  function attemptPreload(retryCount = 0) {
    requestAnimationFrame(() => {
      let allLoaded = true;

      IFRAME_CONFIG.forEach(({ selector, src }) => {
        const elements = document.querySelectorAll(selector);

        if (elements.length === 0) {
          allLoaded = false;
          return;
        }

        elements.forEach((el) => {
          if (el && !el.src) {
            el.src = src;
            el.classList.add("iframe-loading");

            el.addEventListener(
              "load",
              () => {
                el.classList.remove("iframe-loading");
                el.classList.add("iframe-loaded");
              },
              { once: true },
            );
          }
        });
      });

      if (!allLoaded && retryCount < maxRetries) {
        setTimeout(() => attemptPreload(retryCount + 1), retryDelay);
      }
    });
  }

  attemptPreload();
}

function initializeWidgetContainers() {
  const iframeSelectors = IFRAME_CONFIG.map((cfg) => cfg.selector).join(", ");
  const widgetContainers = document.querySelectorAll(iframeSelectors);

  widgetContainers.forEach((container) => {
    if (container && !container.classList.contains("initialized")) {
      container.classList.add("initialized");

      requestAnimationFrame(() => {
        const iframe =
          container.tagName === "IFRAME"
            ? container
            : container.querySelector("iframe");
        if (iframe && (!iframe.src || iframe.src === "about:blank")) {
          const config = IFRAME_CONFIG.find((cfg) =>
            container.matches(cfg.selector),
          );
          if (config) {
            iframe.src = config.src;
          }
        }
      });
    }
  });
}

async function preloadAllTabs() {
  const tabContents = document.querySelectorAll(".tab-pane");
  const serviceCards = new Set();

  tabContents.forEach((tab) => {
    tab
      .querySelectorAll(".service-card")
      .forEach((card) => serviceCards.add(card));
  });

  await batchUpdateServiceCards(Array.from(serviceCards));
}

function setupPeriodicRefresh() {
  const debouncedRefresh = debounce(async () => {
    if (domCache.activeTabContent) {
      const cards = domCache.activeTabContent.querySelectorAll(
        ".service-card[data-api-endpoint]",
      );
      await batchUpdateServiceCards(Array.from(cards));
    }
  }, 250);

  setInterval(
    debouncedRefresh,
    Math.min(CONFIG.TIMING.QUICK_REFRESH, CONFIG.TIMING.STANDARD_REFRESH),
  );

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      debouncedRefresh();
    }
  });

  domCache.myTab?.addEventListener("click", (event) => {
    if (event.target.matches('[id$="-tab"]')) {
      debouncedRefresh();
    }
  });
}

function initializeTabFocus() {
  const tabs = document.querySelectorAll(
    "#News-tab, #Calendars-tab, #Applications-tab, #Home-tab",
  );

  handleTabFocusFromURL();

  if (!window.location.hash) {
    const savedTabId = storage.get();
    const savedTab = savedTabId && document.getElementById(savedTabId);

    if (savedTab) {
      setTabFocus(savedTab);
    } else {
      const activeTab = document.querySelector(".tabcontent.active");
      const correspondingTab =
        activeTab &&
        document.querySelector(`[aria-controls="${activeTab.id}"]`);
      if (correspondingTab) {
        setTabFocus(correspondingTab);
      }
    }
  }

  tabs.forEach((tab) => {
    const handleTabAction = function () {
      setTabFocus(this);
      storage.save(this.id);
    };

    tab.addEventListener("click", handleTabAction);

    tab.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
        handleTabAction.call(this);
      }
    });
  });

  window.addEventListener("beforeunload", () => {
    if (state.currentFocusedTab) {
      storage.save(state.currentFocusedTab.id);
    }
  });
}

function setupResizeObserver() {
  if (state.observers.resize) {
    return state.observers.resize;
  }

  const iframeSelectors = IFRAME_CONFIG.map((cfg) => cfg.selector).join(", ");

  const resizeObserver = new ResizeObserver(
    throttle((entries) => {
      entries.forEach((entry) => {
        const container = entry.target;
        const iframe =
          container.tagName === "IFRAME"
            ? container
            : container.querySelector("iframe");
        if (iframe) {
          const { height, width } = entry.contentRect;
          iframe.style.height = `${height}px`;
          iframe.style.width = `${width}px`;
        }
      });
    }, 100),
  );

  document.querySelectorAll(iframeSelectors).forEach((container) => {
    resizeObserver.observe(container);
  });

  state.observers.resize = resizeObserver;
  return resizeObserver;
}

function initializeEverything() {
  removeReloadButton();
  setupReloadButtonObserver();

  [100, 500, 1000].forEach((delay) => {
    setTimeout(removeReloadButton, delay);
  });

  const hasRequiredElements =
    document.querySelector("#myTab") && document.querySelector(".service-card");

  if (hasRequiredElements) {
    domCache.initCache();
    initializeTabFocus();
    preloadIframes();
    initializeWidgetContainers();
    preloadAllTabs();
    setupPeriodicRefresh();
    setupResizeObserver();
  } else {
    setTimeout(initializeEverything, CONFIG.TIMING.RETRY_DELAY);
  }

  window.addEventListener("orientationchange", () => {
    setTimeout(removeReloadButton, 100);
  });
}

document.addEventListener("DOMContentLoaded", removeReloadButton);
window.addEventListener("load", initializeEverything);

if (typeof window.htmlLoaded === "function") {
  const originalHtmlLoaded = window.htmlLoaded;
  window.htmlLoaded = () => {
    originalHtmlLoaded();
    initializeEverything();
  };
}

if ("ontouchstart" in window) {
  window.addEventListener(
    "touchend",
    () => {
      setTimeout(removeReloadButton, 100);
    },
    { passive: true },
  );
}

function cleanup() {
  if (state.observers.reloadButton) {
    state.observers.reloadButton.disconnect();
    state.observers.reloadButton = null;
  }

  if (state.observers.resize) {
    state.observers.resize.disconnect();
    state.observers.resize = null;
  }

  if (state.observers.tcm) {
    state.observers.tcm.disconnect();
    state.observers.tcm = null;
  }

  domCache.clear();
  state.currentFocusedTab = null;
}

window.addEventListener("unload", cleanup);

function hideDuplicateDates() {
  const widgets = [
    { id: "#tautulli_recent_movies", addLeadingZero: true },
    { id: "#tautulli_recent_shows", addLeadingZero: true },
    { id: "#upcominggames", addLeadingZero: false },
  ];

  widgets.forEach(({ id, addLeadingZero }) => {
    const widget = document.querySelector(id);
    if (!widget) return;

    const rows = widget.querySelectorAll(".flex.flex-row.text-right");
    let lastDate = "";

    rows.forEach((row) => {
      const dateElement = row.querySelector("div:first-child");
      if (!dateElement) return;

      let currentDate = dateElement.textContent.trim();

      if (addLeadingZero) {
        currentDate = currentDate.replace(/(\w{3})\s(\d)(?!\d)/g, "$1 0$2");
        dateElement.textContent = currentDate;
      }

      if (currentDate === lastDate) {
        dateElement.style.visibility = "hidden";
      } else {
        dateElement.style.visibility = "visible";
        lastDate = currentDate;
      }
    });
  });
}

const debouncedHideDuplicateDates = debounce(hideDuplicateDates, 500);

window.addEventListener("load", () => {
  setTimeout(hideDuplicateDates, 3000);
  setInterval(hideDuplicateDates, 600000);
});

document.getElementById("myTab")?.addEventListener("click", (e) => {
  if (e.target.matches('[id$="-tab"]')) {
    debouncedHideDuplicateDates();
  }
});

function formatTCMNumbers() {
  const tcmWidget = document.querySelector("li.service:nth-child(22)");

  if (!tcmWidget) return;

  const allDivs = tcmWidget.querySelectorAll("div");

  allDivs.forEach((div) => {
    const text = div.textContent.trim();
    if (/^\d{4,}$/.test(text)) {
      div.textContent = text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  });
}

setTimeout(formatTCMNumbers, 5000);
setInterval(formatTCMNumbers, 600000);

setTimeout(() => {
  const tcmService = document.querySelector("li.service:nth-child(22)");
  if (tcmService) {
    state.observers.tcm = new MutationObserver(formatTCMNumbers);
    state.observers.tcm.observe(tcmService, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}, 2000);
