// Home Assistant: make embedded dashboards match Homepage's glass look.
//
// Homepage shows Home Assistant dashboards in iframes. This small module makes those
// dashboards see-through (so Homepage's background shows behind them) and gives every
// card the same frosted look. It only acts when a listed dashboard is shown inside an
// iframe, so opening Home Assistant directly looks exactly as before.
//
// Install: Settings > Dashboards > (three dots) Resources > Add resource, type
// "JavaScript module", pointing at this file (put it in /config/www/ and use
// /local/home-assistant-glass-embed.js). Then edit EMBEDS below to the URL paths of
// the dashboards you embed. Remove any view-level "theme:" from those dashboards, or
// the theme's colours will win.
//
// The values match the macOS look of Homepage's custom.css: 52% glass, a hairline edge, 18px corners,
// white text with 60% grey for secondary text, and grey macOS-style text fields.
(function () {
  var EMBEDS = ["/dashboard-homepage", "/dashboard-calendar", "/dashboard-todo"];
  var framed;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (!framed) return;
  var p = location.pathname, hit = false;
  for (var i = 0; i < EMBEDS.length; i++) { if (p.indexOf(EMBEDS[i]) === 0) { hit = true; break; } }
  if (!hit || document.getElementById("homepage-glass-embed")) return;
  var F = "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
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
  var s = document.createElement("style");
  s.id = "homepage-glass-embed";
  s.textContent = css;
  document.head.appendChild(s);
})();
