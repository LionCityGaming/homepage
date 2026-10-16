// Touch press and spring release for Home Assistant dashboards on phones and wall tablets, like an iOS button: a tile shrinks a little under the finger and, when the finger lifts,
// bounces back past normal to about 2.5 % larger and settles, in 0.45 s. (A plain spring curve overshot by under
// half a pixel on a phone tile, too little to see.)
// Done with the Web Animations API, so nothing in the cards' own styles changes (button-card rewrites its inline
// style on every state update) and it costs one short graphics-card animation per tap.
// Only on the dashboards in PAGES, each with the tallest card that counts as a tile there.
// Install: Settings > Dashboards > Resources > Add resource, type JavaScript module. Set PAGES to your touch
// dashboards (phones, wall tablets) and the height of their tiles.
(function () {
  // dashboard path -> tallest card in px that counts as a tile there (phone tiles are usually under 160)
  var PAGES = { "/phone-dashboard/": 160, "/wall-tablet/": 210 };
  var maxH = 0;
  for (var pg in PAGES) { if ((location.pathname + "/").indexOf(pg) === 0) maxH = PAGES[pg]; }
  if (!maxH || window.__hpPhoneSpring) return;
  window.__hpPhoneSpring = true;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // The tiles' own press (":active" shrink) hardly shows on a real phone: Android applies the pressed state late and
  // briefly (measured on an Android phone: 0.990-0.999 instead of 0.94). So this does the press itself: finger
  // down shrinks the tile to 0.95 in 0.1 s, finger up bounces it back. Only tiles (see PAGES for the height limit),
  // never a whole room panel, and not a card running one of the dashboard's effects (breathing etc.).
  var card = null, press = null;
  // Android draws a translucent square "tap highlight" over whatever is tapped (rgba(0, 0, 0, 0.1) on these cards).
  // Square corners on a rounded tile that shrinks and bounces read as an ugly dark bar, so it is switched
  // off: the bounce is the tap feedback, as on iOS. A page-wide rule plus, on each touch, the touched elements
  // themselves (the cards set it inside their shadow roots, which a page rule doesn't reach). Adding style blocks
  // inside the cards' shadow roots was tried and emptied the whole dashboard: never do that here.
  var top = document.createElement("style");
  top.textContent = "html, body { -webkit-tap-highlight-color: transparent; }";
  document.head.appendChild(top);
  function scaleOf(el) {
    var t = getComputedStyle(el).transform;
    if (!t || t === "none") return 1;
    var m = t.match(/^matrix\(([^,]+),\s*([^,]+)/);
    return m ? Math.sqrt(parseFloat(m[1]) * parseFloat(m[1]) + parseFloat(m[2]) * parseFloat(m[2])) : 1;
  }
  document.addEventListener("pointerdown", function (e) {
    var path = e.composedPath ? e.composedPath() : [];
    var c = null;
    for (var k = 0; k < path.length; k++) { if (path[k] && path[k].tagName === "HA-CARD") { c = path[k]; break; } }
    // tap highlight off on the touched elements themselves (see above)
    for (var j = 0; j < path.length; j++) { if (path[j] && path[j].style) path[j].style.setProperty("-webkit-tap-highlight-color", "transparent", "important"); }
    if (!c || c.getBoundingClientRect().height > maxH) { card = null; return; }
    if (c.getAnimations().some(function (a) { return a.playState === "running" && !a.transitionProperty; })) { card = null; return; }
    card = c;
    press = c.animate([{ transform: "scale(1)" }, { transform: "scale(0.95)" }], { duration: 100, easing: "ease-out", fill: "forwards" });
  }, true);
  function release() {
    if (!card) return;
    var c = card; card = null;
    var s = Math.min(scaleOf(c), 0.97);  // a very quick tap still gets a visible bounce
    if (press) { press.cancel(); press = null; }
    c.animate([
      { transform: "scale(" + s.toFixed(4) + ")" },
      { transform: "scale(1.025)", offset: 0.45 },
      { transform: "scale(0.996)", offset: 0.75 },
      { transform: "scale(1)" },
    ], { duration: 450, easing: "ease-out" });
  }
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
})();
