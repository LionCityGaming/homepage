// Homepage glass embed (05/10/2026): when one of the dashboards below is shown inside an
// iframe (Homepage), make the page see-through and give cards the Nest Hub glass look, so
// Homepage's background shows behind them. Does nothing when HA is opened directly.
// 06/10/2026: dashboard-homepage also drops the 500px column cap and uses a 20px column gap, so its
// three columns span the full Homepage width (the frame overhangs the card by 20px each side).
// 07/10/2026: Mac theme values, same as Homepage custom.css "MAC THEME": 52% glass, 0.12 hairline, 18px
// corners, white primary text (was #f2f2f7), 60% secondary, grey macOS text fields. This is the one
// place these panels get their look (a second resource added the same day was merged in here).
// 15/10/2026: Homepage's "Apple touches" carried over: Apple's San Francisco font first (Inter elsewhere), and
// small cards (tiles, buttons, chips; up to 140 px tall) grow a touch on hover with a spring and sink when
// pressed, like Homepage's cards. Big cards (map, weather, calendars) keep still. HA cards sit in shadow DOMs
// that page CSS can't reach, so each small card's shadow root gets a few CSS rules of its own (see below).
// Install: Settings > Dashboards > Resources > Add resource, type JavaScript module (or add it with the API as an
// inline resource). Change EMBEDS to the dashboards you show in Homepage.
(function () {
  var EMBEDS = ["/dashboard-homepage", "/dashboard-calendar", "/dashboard-todo", "/epl-calendar", "/epl-standings"];
  var framed;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (!framed) return;
  var p = location.pathname, hit = false;
  for (var i = 0; i < EMBEDS.length; i++) { if (p.indexOf(EMBEDS[i]) === 0) { hit = true; break; } }
  if (!hit || document.getElementById("homepage-glass-embed")) return;
  var F = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif";
  var css = "html:root, html:root body {" +
    "color-scheme: dark !important;" +
    "background: transparent !important;" +
    "--primary-background-color: transparent !important;" +
    "--secondary-background-color: rgba(44, 44, 46, 0.55) !important;" +
    "--lovelace-background: transparent !important;" +
    "--ha-card-background: rgba(30, 30, 32, 0.52) !important;" +
    "--card-background-color: rgba(30, 30, 32, 0.52) !important;" +
    "--ha-card-border-color: rgba(255, 255, 255, 0.12) !important;" +
    "--ha-card-border-width: 0.5px !important;" +
    "--ha-card-border-radius: 18px !important;" +
    "--ha-card-box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.10) !important;" +
    "--primary-text-color: #ffffff !important;" +
    "--secondary-text-color: rgba(235, 235, 245, 0.6) !important;" +
    "--disabled-text-color: rgba(235, 235, 245, 0.3) !important;" +
    "--primary-color: #0a84ff !important;" +
    "--accent-color: #0a84ff !important;" +
    "--divider-color: rgba(255, 255, 255, 0.08) !important;" +
    "--input-fill-color: rgba(118, 118, 128, 0.24) !important;" +
    "--mdc-text-field-fill-color: rgba(118, 118, 128, 0.24) !important;" +
    "--mdc-text-field-ink-color: #ffffff !important;" +
    "--mdc-text-field-label-ink-color: rgba(235, 235, 245, 0.6) !important;" +
    "--input-ink-color: #ffffff !important;" +
    "--input-label-ink-color: rgba(235, 235, 245, 0.6) !important;" +
    "--ha-color-form-background: rgba(118, 118, 128, 0.24) !important;" +
    "--primary-font-family: " + F + " !important;" +
    "--mdc-typography-font-family: " + F + " !important;" +
    "--ha-font-family-body: " + F + " !important;" +
    "--ha-font-family-heading: " + F + " !important;" +
    "}";
  if (p.indexOf("/dashboard-homepage") === 0) {
    css = css + "html:root {" +
      "--ha-view-sections-column-max-width: 4000px !important;" +
      "--ha-view-sections-column-gap: 20px !important;" +
      "}";
  }
  var s = document.createElement("style");
  s.id = "homepage-glass-embed";
  s.textContent = css;
  document.head.appendChild(s);

  // spring motion for small cards (same curve and feel as Homepage's custom.css --mac-spring), done with CSS
  // :hover / :active rules placed inside each small card's own shadow root. (The first version set the card's
  // inline style from pointer events, but button-card rewrites its inline style on every state update, every
  // few seconds here, so the hover was wiped at once.) The cards render late and change with the view, so
  // the page is scanned a few times after load and then every 5 s; a card's root gets the rules only once.
  var SPRING = "cubic-bezier(0.34, 1.45, 0.64, 1)";
  // the growth itself always applies (as on Homepage's own cards); the spring only when the system allows motion
  // (Chrome and Edge on Windows follow Windows' "Animation effects" setting)
  var RULES = "@media (hover: hover) and (pointer: fine) {" +
    "ha-card:hover { transform: scale(1.03) !important; }" +
    "ha-card:active { transform: scale(0.96) !important; }" +
    "}" +
    "@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {" +
    "ha-card { transition: transform 0.5s " + SPRING + ", background 0.3s ease, border-color 0.3s ease !important; }" +
    "ha-card:active { transition-duration: 0.12s !important; }" +
    "}";
  function springRoots(node) {
    if (!node) return;
    if (node.tagName === "HA-CARD") {
      var root = node.getRootNode(), h = node.getBoundingClientRect().height;
      // only a root holding this one card (a big card's stack would grow with it), and only small cards
      if (h > 0 && h <= 140 && root !== document && root.host && !root.querySelector("style[data-hp-spring]") &&
          root.querySelectorAll("ha-card").length === 1) {
        var st = document.createElement("style");
        st.setAttribute("data-hp-spring", "");
        st.textContent = RULES;
        root.appendChild(st);
      }
    }
    if (node.shadowRoot) springRoots(node.shadowRoot);
    for (var c = node.firstElementChild; c; c = c.nextElementSibling) springRoots(c);
  }
  function scan() { springRoots(document.body); }
  [1000, 3000, 6000, 10000].forEach(function (t) { setTimeout(scan, t); });
  setInterval(scan, 5000);
})();
