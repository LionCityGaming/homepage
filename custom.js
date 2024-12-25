/**
 * Enhanced dashboard management system
 * Handles tab focus, service card updates, and iframe preloading
 */

// Configuration object with all constants
const CONFIG = {
    STORAGE: {
        KEY: 'lastFocusedTabId'
    },
    TIMING: {
        RETRY_DELAY: 500,
        STANDARD_REFRESH: 5 * 60 * 1000,  // 5 minutes
        QUICK_REFRESH: 10 * 1000,         // 10 seconds
        RETRY_ON_ERROR: 30 * 1000,        // 30 seconds
        BATCH_DELAY: 100                  // Delay between batches
    },
    CROWDSEC: {
        LIMIT: 50,
        MAX_ALERTS: 100
    },
    SERVICES: {
        QUICK_REFRESH: []  // Services requiring frequent updates
    }
};

// DOM element selectors for reload buttons
const RELOAD_BUTTON_SELECTORS = [
    '#revalidate',
    '[data-testid="revalidate"]',
    '.reload-button',
    'button[aria-label="Reload"]',
    '[role="button"][aria-label="Reload"]'
];

// Iframe preload configuration
const IFRAME_CONFIG = [
    {
        selector: '.home-assistant',
        src: "{{HOMEPAGE_VAR_HOME_ASSISTANT_WIDGET_URL}}"
    },
    {
        selector: '.glance',
        src: "{{HOMEPAGE_VAR_GLANCE_WIDGET_URL}}"
    },
    {
        selector: '.weather',
        src: "{{HOMEPAGE_VAR_WEATHER_WIDGET_URL}}"
    }
];

// Tab mapping configuration
const TAB_MAPPING = {
    '#applications': ['#Applications-tab', '#Applications'],
    '#smart-home': ['#Smart\\ Home-tab', '#Smart\\ Home'],
    '#calendars': ['#Calendars-tab', '#Calendars'],
    '#home': ['#Home-tab', '#Home'],
    '': ['#Home-tab', '#Home']  // Default mapping
};

// State management
const state = {
    lastUpdate: new WeakMap(),
    currentFocusedTab: null
};

// DOM cache for frequently accessed elements
const domCache = {
    myTab: null,
    tabContents: null,
    activeTabContent: null,
    
    initCache() {
        this.myTab = document.getElementById('myTab');
        this.tabContents = document.querySelectorAll('.tabcontent');
        this.updateActiveTab();
    },
    
    updateActiveTab() {
        this.activeTabContent = document.querySelector('.tabcontent.active');
    }
};

// Storage operations with error handling
const storage = {
    save(tabId) {
        try {
            localStorage.setItem(CONFIG.STORAGE.KEY, tabId);
        } catch (error) {
            console.warn('Storage save failed:', error);
        }
    },
    
    get() {
        try {
            return localStorage.getItem(CONFIG.STORAGE.KEY);
        } catch (error) {
            console.warn('Storage retrieval failed:', error);
            return null;
        }
    }
};

/**
 * Utility Functions
 */

// Create a debounced version of a function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Remove reload buttons from the DOM
function removeReloadButton() {
    RELOAD_BUTTON_SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => element.remove());
    });
}

// Setup mutation observer for dynamic reload button removal
function setupReloadButtonObserver() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                removeReloadButton();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });

    return observer;
}

/**
 * Service Card Management
 */

// Update a service card with new data
function updateServiceCard(card, data) {
    requestAnimationFrame(() => {
        const titleElement = card.querySelector('.card-title');
        const statusElement = card.querySelector('.card-status');
        
        if (titleElement && data.title) {
            titleElement.textContent = data.title;
        }
        
        if (statusElement) {
            statusElement.textContent = Array.isArray(data) 
                ? `${data.length} items` 
                : data.status ?? (typeof data === 'object' ? 'Data received' : '');
        }
    });
}

// Update service card with error state
function updateServiceCardError(card, error) {
    requestAnimationFrame(() => {
        const statusElement = card.querySelector('.card-status');
        if (statusElement) {
            statusElement.textContent = error.message.includes('404')
                ? 'Service unavailable'
                : 'Error loading data';
            statusElement.style.color = 'red';
        }
    });
}

// Handle CrowdSec alerts pagination
async function handleCrowdSecAlerts(card, apiEndpoint) {
    const { LIMIT, MAX_ALERTS } = CONFIG.CROWDSEC;
    let allData = [];
    
    for (let page = 1; allData.length < MAX_ALERTS; page++) {
        const separator = apiEndpoint.includes('?') ? '&' : '?';
        const paginatedEndpoint = `${apiEndpoint}${separator}page=${page}&limit=${LIMIT}`;
        
        const response = await fetch(paginatedEndpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        allData = allData.concat(data.results || data);
        
        if (!data.hasNextPage || allData.length >= MAX_ALERTS) break;
    }
    
    return allData.slice(0, MAX_ALERTS);
}

// Refresh a single service
async function refreshService(card) {
    const apiEndpoint = card.dataset.apiEndpoint;
    if (!apiEndpoint) return;
    
    const serviceId = card.id || apiEndpoint;
    const now = Date.now();
    const lastUpdateTime = state.lastUpdate.get(card) || 0;
    const isQuickRefreshService = CONFIG.SERVICES.QUICK_REFRESH.includes(serviceId);
    const minInterval = isQuickRefreshService 
        ? CONFIG.TIMING.QUICK_REFRESH 
        : CONFIG.TIMING.STANDARD_REFRESH;
    
    if (now - lastUpdateTime < minInterval) return;

    try {
        card.classList.add('updating');
        
        const response = await (apiEndpoint.includes('CrowdSec') && apiEndpoint.includes('alerts')
            ? handleCrowdSecAlerts(card, apiEndpoint)
            : fetch(apiEndpoint).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
            
        updateServiceCard(card, response);
        state.lastUpdate.set(card, now);
    } catch (error) {
        console.error(`${serviceId} refresh failed:`, error);
        updateServiceCardError(card, error);
        state.lastUpdate.set(card, now - (minInterval - CONFIG.TIMING.RETRY_ON_ERROR));
    } finally {
        card.classList.remove('updating');
    }
}

// Batch update service cards
async function batchUpdateServiceCards(cards) {
    const batchSize = 3;
    for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        await Promise.all(batch.map(refreshService));
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.BATCH_DELAY));
    }
}

/**
 * Tab Management
 */

// Handle tab focus based on URL
function handleTabFocusFromURL() {
    const hash = window.location.hash.toLowerCase();
    const [tabSelector, contentSelector] = TAB_MAPPING[hash] || TAB_MAPPING[''];
    
    const tabToFocus = document.querySelector(tabSelector);
    const contentToShow = document.querySelector(contentSelector);

    if (tabToFocus) {
        setTabFocus(tabToFocus);
        storage.save(tabToFocus.id);
        
        domCache.tabContents.forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        if (contentToShow) {
            contentToShow.classList.add('active');
            contentToShow.style.display = 'block';
            domCache.updateActiveTab();
        }
    }
}

// Set focus on a specific tab
function setTabFocus(tab) {
    requestAnimationFrame(() => {
        if (state.currentFocusedTab) {
            state.currentFocusedTab.classList.remove('tab-focused');
        }
        state.currentFocusedTab = tab;
        state.currentFocusedTab.classList.add('tab-focused');
        state.currentFocusedTab.focus();
    });
}

/**
 * Initialization Functions
 */

// Preload iframes
function preloadIframes() {
    requestAnimationFrame(() => {
        IFRAME_CONFIG.forEach(({ selector, src }) => {
            document.querySelectorAll(selector).forEach(el => {
                if (el && !el.src) el.src = src;
            });
        });
    });
}

// Preload all tabs
async function preloadAllTabs() {
    const tabContents = document.querySelectorAll('.tab-pane');
    const serviceCards = new Set();
    
    tabContents.forEach(tab => {
        tab.querySelectorAll('.service-card').forEach(card => serviceCards.add(card));
    });
    
    await batchUpdateServiceCards(Array.from(serviceCards));
}

// Setup periodic refresh
function setupPeriodicRefresh() {
    const debouncedRefresh = debounce(async () => {
        if (domCache.activeTabContent) {
            const cards = domCache.activeTabContent.querySelectorAll('.service-card[data-api-endpoint]');
            await batchUpdateServiceCards(Array.from(cards));
        }
    }, 250);

    setInterval(debouncedRefresh, Math.min(
        CONFIG.TIMING.QUICK_REFRESH,
        CONFIG.TIMING.STANDARD_REFRESH
    ));
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') debouncedRefresh();
    });

    domCache.myTab?.addEventListener('click', event => {
        if (event.target.matches('[id$="-tab"]')) debouncedRefresh();
    });
}

// Initialize tab focus
function initializeTabFocus() {
    const tabs = document.querySelectorAll(
        '#News-tab, #Calendars-tab, #Applications-tab, #Smart\\ Home-tab'
    );
    
    handleTabFocusFromURL();
    
    if (!window.location.hash) {
        const savedTabId = storage.get();
        const savedTab = savedTabId && document.getElementById(savedTabId);
        
        if (savedTab) {
            setTabFocus(savedTab);
        } else {
            const activeTab = document.querySelector('.tabcontent.active');
            const correspondingTab = activeTab && document.querySelector(
                `[aria-controls="${activeTab.id}"]`
            );
            if (correspondingTab) setTabFocus(correspondingTab);
        }
    }

    // Event Handlers
    const mousedownHandler = (e) => {
        if (!e.target.closest('#myTab') && state.currentFocusedTab) {
            e.preventDefault();
            e.stopPropagation();
            state.currentFocusedTab.focus();
        }
    };

    document.addEventListener('mousedown', mousedownHandler, true);

    tabs.forEach(tab => {
        const handleTabAction = function() {
            setTabFocus(this);
            storage.save(this.id);
        };

        tab.addEventListener('click', handleTabAction);
        tab.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
                handleTabAction.call(this);
            }
        });
    });

    window.addEventListener('beforeunload', () => {
        if (state.currentFocusedTab) storage.save(state.currentFocusedTab.id);
    });
}

// Main initialization function
function initializeEverything() {
    removeReloadButton();
    const observer = setupReloadButtonObserver();
    
    // Multiple removal attempts to catch delayed renders
    [100, 500, 1000].forEach(delay => {
        setTimeout(removeReloadButton, delay);
    });

    if (document.querySelector('#myTab') && document.querySelector('.service-card')) {
        domCache.initCache();
        initializeTabFocus();
        preloadIframes();
        preloadAllTabs();
        setupPeriodicRefresh();
    } else {
        setTimeout(initializeEverything, CONFIG.TIMING.RETRY_DELAY);
    }

    // Mobile-specific handling
    window.addEventListener('orientationchange', () => {
        setTimeout(removeReloadButton, 100);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', removeReloadButton);
window.addEventListener('load', initializeEverything);

// Handle dynamic HTML loading
if (typeof window.htmlLoaded === 'function') {
    const originalHtmlLoaded = window.htmlLoaded;
    window.htmlLoaded = () => {
        originalHtmlLoaded();
        initializeEverything();
    };
}

// Mobile touch handling
if ('ontouchstart' in window) {
    window.addEventListener('touchend', () => {
        setTimeout(removeReloadButton, 100);
    }, { passive: true });
}
