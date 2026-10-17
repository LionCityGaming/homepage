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
// 16/10/2026: Liquid Glass (macOS 26), same as Homepage's "LIQUID GLASS" block and Glance: clearer cards (a 40% tint, was
// 52%), a bright rim of light on the top edge, a lighter hairline; then the same sheen as Homepage's cards, no hover effects.
// 17/10/2026: a button's name or status that is too long glides to its end and back (like Homepage's Gotify message and
// Live Activities) instead of being cut off with "...".
// Install: Settings > Dashboards > Resources > Add resource, type JavaScript module (or add it with the API as an
// inline resource). Change EMBEDS to the dashboards you show in Homepage; the outline drawn just outside each card is
// used on "/dashboard-homepage" only (the tile panel), as panels made of one full-frame card would clip it.
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
    "--ha-card-background: rgba(28, 28, 30, 0.40) !important;" +  // a plain colour: some cards use it as background-color, where a gradient is invalid
    "--card-background-color: rgba(28, 28, 30, 0.40) !important;" +
    "--ha-card-border-color: rgba(255, 255, 255, 0.16) !important;" +
    "--ha-card-border-width: 0.5px !important;" +
    "--ha-card-border-radius: 18px !important;" +
    "--ha-card-box-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 -0.5px 0 rgba(255, 255, 255, 0.05) !important;" +
    "--ha-ripple-hover-opacity: 0 !important;" +  // no highlight under the pointer either (user 16/10/2026: no hover effects)
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
  // 16/10/2026: no growth on hover any more (user: cleaner if the cards don't resize), only the dip when clicked; the
  // spring only when the system allows motion (Chrome and Edge on Windows follow Windows' "Animation effects" setting)
  var RULES = "@media (hover: hover) and (pointer: fine) {" +
    "ha-card:active { transform: scale(0.96) !important; }" +
    "}" +
    "@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {" +
    "ha-card { transition: transform 0.5s " + SPRING + ", background 0.3s ease, border-color 0.3s ease !important; }" +
    "ha-card:active { transition-duration: 0.12s !important; }" +
    "}";
  // the rest of Homepage's card look (16/10/2026, user: colours and transparency must match Homepage exactly): the faint
  // light sheen over the tint (no hover effects in these panels at all: user 16/10/2026). The tint stays the plain colour above (some cards
  // use it as a background colour, where a gradient is invalid), so the sheen is a separate background picture, set in
  // every card's own shadow root (page CSS can't reach it), on cards of every size
  // (a card whose own style already holds a gradient, like the coloured glow of an active tile or the running washer, keeps it)
  // Cards meant to be invisible (no background colour of their own, like the rows of status chips) are marked
  // data-hp-clear on each scan and get neither (16/10/2026: the sheen drew faint boxes behind the chip rows)
  var GLASS = "ha-card:not([style*=gradient]):not([data-hp-clear]) { background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015) 60%) !important; }" +
    // the hairline as a ring just outside the card, the border itself see-through (16/10/2026, user: the left edge looked
    // cut off). Measured on the user's screen: with a border, or an inner ring, one pixel of the card's tint showed
    // outside the line when the card starts between pixels (the tint rounds outwards, the line inwards). A ring drawn
    // outside the card always sits on its outer edge. 1 px on standard-resolution screens, half a pixel on Retina.
    // The top rim of light is drawn outside too, right above the ring (inside, it showed as a second line one pixel
    // below the ring: "odd double line", user 16/10/2026), so the top edge reads as one brighter line
    // gradients (the sheen, an active tile's glow) sized to the whole card including the see-through border strip: sized
    // to the inside only, they repeated under the strip from their far end, a dark sliver down the left of active tiles
    "ha-card:not([data-hp-clear]) { background-origin: border-box !important; }" +
    // HA's pointer highlight off on every card (16/10/2026, user: still a "weird animation" on hover: a 4% white fade).
    // Button-card sets its own value on each tile, which beat the page-wide one, so it is set on the ripple itself
    "ha-ripple, mwc-ripple, md-ripple { --md-ripple-hover-opacity: 0 !important; --ha-ripple-hover-opacity: 0 !important; --mdc-ripple-hover-opacity: 0 !important; }" +
    // long names glide (glide() below marks them): same timing, pause and fade as Homepage's .hp-glide (custom.css)
    ".hp-glide { text-overflow: clip !important; }" +
    ".hp-glide-on { -webkit-mask: linear-gradient(90deg, #000 88%, transparent); mask: linear-gradient(90deg, #000 88%, transparent);" +
    " animation: hp-glide var(--glide, 4s) ease-in-out 0.8s infinite alternate; }" +
    "@keyframes hp-glide { 0%, 12% { text-indent: 0; } 88%, 100% { text-indent: var(--shift, 0); } }" +
    "@media (prefers-reduced-motion: reduce) { .hp-glide-on { animation: none; -webkit-mask: none; mask: none; text-overflow: ellipsis !important; } }";
  // Only on the Home panel: the calendar, To Do and EPL panels are one card filling the whole frame, so a ring outside it
  // fell just beyond the frame and was cut off (user 16/10/2026: calendar borders disappearing). Those cards start on
  // whole pixels, so they keep a plain border
  if (p.indexOf("/dashboard-homepage") === 0) GLASS = GLASS +
    "ha-card:not([data-hp-clear]) { border-color: transparent !important; box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.16), 0 -0.5px 0 0 rgba(255, 255, 255, 0.12) !important; }" +
    "@media (max-resolution: 1.5dppx) { ha-card:not([data-hp-clear]) { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 -1px 0 0 rgba(255, 255, 255, 0.12) !important; } }";
  // a button-card's name, status or state that doesn't fit: measured again only when its text or the button's width
  // changes, so a running glide isn't restarted by every scan
  function glide(el) {
    var host = el.getRootNode().host, key = el.textContent + "|" + (host ? host.offsetWidth : 0);
    // (the class is checked too: button-card can rewrite an element's classes when its entity updates)
    if (!el.clientWidth || (el.getAttribute("data-glide-key") === key && el.classList.contains("hp-glide"))) return;
    el.setAttribute("data-glide-key", key);
    el.classList.add("hp-glide");
    el.classList.remove("hp-glide-on");
    el.style.removeProperty("width");
    var over = el.scrollWidth - el.clientWidth;
    if (over > 2) {
      // held at its resting width: button-card's grid sizes the name to its text, so the box (and its fade) shrank as
      // the text slid, and the fade caught the last letter again
      el.style.width = el.clientWidth + "px";
      el.style.setProperty("--shift", -(over + Math.ceil(el.clientWidth * 0.12)) + "px");  // past the end by the fade (right 12%), so the last letter shows
      el.style.setProperty("--glide", Math.max(2, over / 30).toFixed(1) + "s");  // about 30 px a second, like Homepage
      el.classList.add("hp-glide-on");
    }
  }
  function springRoots(node) {
    if (!node) return;
    if (node.tagName === "HA-CARD") {
      var root = node.getRootNode(), h = node.getBoundingClientRect().height;
      // invisible = no background colour AND no background picture (active tiles paint their coloured glow as a gradient
      // with no colour under it, and must keep the outline: 16/10/2026, their left edge was missing)
      // (the card's own style is checked for the gradient, as the sheen added here is a background picture too)
      var bg = getComputedStyle(node).backgroundColor, own = node.getAttribute("style") || "";
      if ((bg === "transparent" || bg === "rgba(0, 0, 0, 0)") && !/gradient|url\(/.test(own)) node.setAttribute("data-hp-clear", "");
      else if (node.hasAttribute("data-hp-clear")) node.removeAttribute("data-hp-clear");
      if (root !== document && root.host && !root.querySelector("style[data-hp-glass]")) {
        var gl = document.createElement("style");
        gl.setAttribute("data-hp-glass", "");
        gl.textContent = GLASS;
        root.appendChild(gl);
      }
      if (root !== document && root.host && root.host.tagName === "BUTTON-CARD") root.querySelectorAll("#name, #label, #state").forEach(glide);
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
