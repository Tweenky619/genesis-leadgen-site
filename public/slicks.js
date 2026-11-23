// Damage slicks: full-screen, swipeable slide sets (Roof / Paint & Stucco / Windows) to show homeowners
(function(){
  var H = document.documentElement;
  if (H.classList.contains("wl-app") && !H.classList.contains("wl-mine")) { var b0 = document.getElementById("slicksBtn"); if (b0) b0.remove(); return; }
  var SETS = {
    roof:    { name: "Roof", n: 9, ic: "\ud83c\udfe0", sub: "Shingles \u00b7 leaks \u00b7 wood", bg: "#E8B04A" },
    stucco:  { name: "Paint & Stucco", n: 8, ic: "\ud83e\uddf1", sub: "Cracks \u00b7 stucco cancer", bg: "#E2672B" },
    windows: { name: "Windows", n: 7, ic: "\ud83e\ude9f", sub: "Fog \u00b7 drafts \u00b7 frames", bg: "#F3EFE7" }
  };
  var ORDER = ["roof", "stucco", "windows"];
  // preview of the new roof pitch slides + tap-a-photo: open the app once with ?slxpreview=1 (or =0 to turn off)
  var PV = false; try { var q = (location.search.match(/slxpreview=(\d)/) || [])[1]; if (q) localStorage.setItem("slx_preview", q); PV = localStorage.getItem("slx_preview") === "1"; } catch(e){}
  var PH = PV ? {"roof": [[], [["missing", 0.0889, 0.2515, 0.2648, 0.4352, "Missing shingles"], ["ridge", 0.3676, 0.2515, 0.2648, 0.4352, "Damaged ridge caps"], ["mold", 0.6463, 0.2515, 0.2648, 0.4352, "Dark streaks"]], [["dead_a", 0.0889, 0.2515, 0.4042, 0.2176, "Worn shingles"], ["dead_b", 0.5069, 0.2515, 0.4042, 0.2176, "What protects a shingle"], ["dead_c", 0.0889, 0.525, 0.4042, 0.2176, "Granules: new vs. 10 years"], ["dead_d", 0.5069, 0.525, 0.4042, 0.2176, "Exposed fiberglass = dead shingles"]], [], [["leak_c", 0.0889, 0.2025, 0.4042, 0.3889, "What people expect: a stain on the ceiling"], ["leak_b", 0.5069, 0.2025, 0.4042, 0.3889, "What happens first: water gets under the shingles"]], [["leak_a", 0.0889, 0.2515, 0.4042, 0.3889, "Wet, stained insulation"], ["leak_d", 0.5069, 0.2515, 0.4042, 0.3889, "Stained, rotting decking"]], [], [["wood_a", 0.0889, 0.2117, 0.4042, 0.2778, "Rotted roof decking"], ["wood_b", 0.5069, 0.2117, 0.4042, 0.2778, "Sections of decking replaced"], ["wood_c", 0.0889, 0.5454, 0.4042, 0.2778, "Eaves and rafters exposed"], ["wood_d", 0.5069, 0.5454, 0.4042, 0.2778, "New wood going down"]], [], []], "stucco": [[], [["stucco_a", 0.0889, 0.2025, 0.4042, 0.3981, "Chipping and peeling"], ["stucco_b", 0.5069, 0.2025, 0.4042, 0.3981, "Stucco letting go"]], [["stucco_m", 0.0889, 0.2515, 0.4042, 0.3704, "Efflorescence: white, powdery stains"], ["stucco_c", 0.5069, 0.2515, 0.4042, 0.3704, "Stucco crumbling at the bottom"]], [["framing", 0.0889, 0.2552, 0.4444, 0.4352, "House framing — what’s behind the stucco"]], [], [["wood_c", 0.0889, 0.2515, 0.4042, 0.3704, "Eaves and rafters exposed"], ["wood_a", 0.5069, 0.2515, 0.4042, 0.3704, "Rotted wood"]], [], [], [], []], "windows": [[], [["win_fog", 0.0889, 0.2552, 0.4444, 0.4352, "Foggy glass — the seal has failed"]], [["win_room", 0.0889, 0.2552, 0.4444, 0.4352, "New windows: quiet, bright, comfortable"]], [["win_frame", 0.0889, 0.2552, 0.4444, 0.4352, "Worn frames and tracks"]], [], [], [], []]} : {};
  if (PV){ SETS.roof.n = 10; SETS.roof.dir = "roof-preview"; SETS.stucco.n = 10; SETS.stucco.dir = "stucco-preview"; SETS.windows.n = 8; SETS.windows.dir = "windows-preview"; }
  var css = document.createElement("style");
  css.textContent =
    "#slx{position:fixed;inset:0;z-index:99999;background:#14212B;display:flex;flex-direction:column;color:#F3EFE7;font-family:-apple-system,system-ui,sans-serif;-webkit-user-select:none;user-select:none}" +
    "#slx[hidden]{display:none}" +
    "#slx .bar{display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top) + 8px) 12px 8px;flex:0 0 auto}" +
    "#slx .ttl{flex:1;font-weight:900;font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#E2672B}" +
    "#slx .nl{border:0;width:40px;height:40px;border-radius:20px;padding:0;font-size:26px;font-weight:600;line-height:1;background:#1e2a35;color:#fff}" +
    "#slx .back{border:0;border-radius:6px;padding:10px 14px;font-weight:800;font-size:14px;background:#1e2a35;color:#F3EFE7}" +
    "#slx .pick{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:16px 20px calc(env(safe-area-inset-bottom) + 20px);align-content:center;overflow:auto}" +
    "#slx .sq{aspect-ratio:1;border:0;border-radius:6px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;text-align:left;padding:20px;color:#14212B;font-family:inherit}" +
    "#slx .sq i{font-style:normal;font-size:clamp(44px,8vw,80px);flex:1;align-self:center;display:flex;align-items:center}" +
    "#slx .sq b{font-size:clamp(20px,3vw,30px);font-weight:900;text-transform:uppercase;line-height:1.05}" +
    "#slx .sq small{font-size:14px;font-weight:700;opacity:.8;margin-top:6px}" +
    "#slx .sq span{display:flex;flex-direction:column}" +
    "#slx .sq:active{transform:scale(.97)}" +
    "@media (max-width:600px) and (orientation:portrait){#slx .pick{grid-template-columns:1fr;align-content:start}#slx .sq{aspect-ratio:auto;min-height:140px;flex-direction:row;align-items:center;justify-content:flex-start;gap:18px}#slx .sq i{flex:0 0 auto;align-self:center;font-size:56px}#slx .sq span{display:flex;flex-direction:column}}" +
    "#slx .cnt{font-weight:700;font-size:14px;color:#C3CDD3;min-width:48px;text-align:right}" +
    "#slx .x{border:0;background:#1e2a35;color:#fff;font-size:20px;width:40px;height:40px;border-radius:20px}" +
    "#slx .stage{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;touch-action:none;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}" +
    "#slx .stage::-webkit-scrollbar{display:none}" +
    "#slx .sl{flex:0 0 100%;height:100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:0 0 calc(env(safe-area-inset-bottom) + 8px)}" +
    "#slx .sl{overflow:hidden}#slx .sl img{max-width:100%;max-height:100%;object-fit:contain;display:block;will-change:transform;transform-origin:center center}" +
    
    "#slxF{position:fixed;inset:0;z-index:100000;background:#0b1117;display:flex;align-items:center;justify-content:center}" +
    "#slxF[hidden]{display:none}#slxF img{max-width:96vw;max-height:92vh;object-fit:contain;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.5)}" +
    "#slxF .fx{position:absolute;top:calc(env(safe-area-inset-top) + 10px);right:14px;border:0;background:#1e2a35;color:#fff;font-size:20px;width:44px;height:44px;border-radius:22px}" +
    ".slx-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}" +
    ".slx-go{flex:1 1 auto;border:0;border-radius:6px;padding:12px 14px;font-weight:800;font-size:15px;background:#14212B;color:#fff}";
  document.head.appendChild(css);
  var root = document.createElement("div"); root.id = "slx"; root.hidden = true;
  root.innerHTML = '<div class="bar"><button class="back">\u25c0 Sets</button><div class="ttl">Damage slicks</div><div class="cnt"></div><button class="nl" aria-label="Add">+</button><button class="x" aria-label="Close">\u2715</button></div>' +
    '<div class="pick">' + ORDER.map(function(k){ var t = SETS[k]; return '<button class="sq" data-set="' + k + '" style="background:' + t.bg + '"><i>' + t.ic + '</i><span><b>' + t.name + '</b><small>' + t.sub + '</small></span></button>'; }).join("") + '</div>' +
    '<div class="stage"></div>';
  document.body.appendChild(root);
  var F = document.createElement("div"); F.id = "slxF"; F.hidden = true; F.innerHTML = '<img alt=""><button class="fx" aria-label="Back">\u2715</button>'; document.body.appendChild(F);
  F.addEventListener("click", function(){ F.hidden = true; F.querySelector("img").removeAttribute("src"); });
  function photoAt(e){   // which photo on the current slide was tapped (only when not zoomed)
    if (!PV || !cur || Z.s > 1 || !PH[cur]) return null; var i = idx(), rows = PH[cur][i]; if (!rows || !rows.length) return null;
    var im = stage.children[i] && stage.children[i].querySelector("img"); if (!im) return null; var r = im.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    for (var j = 0; j < rows.length; j++){ var p = rows[j]; if (fx >= p[1] && fx <= p[1] + p[3] && fy >= p[2] && fy <= p[2] + p[4]) return p; }
    return null;
  }
  var stage = root.querySelector(".stage"), cnt = root.querySelector(".cnt"), pick = root.querySelector(".pick"), ttl = root.querySelector(".ttl"), back = root.querySelector(".back"), cur = null;
  function mode(slides){ pick.style.display = slides ? "none" : ""; stage.style.display = slides ? "" : "none"; back.style.display = slides ? "" : "none"; cnt.style.display = slides ? "" : "none"; }
  function picker(){ cur = null; stage.innerHTML = ""; ttl.textContent = "Damage slicks"; mode(false); }
  function idx(){ return Math.round(stage.scrollLeft / Math.max(1, stage.clientWidth)); }
  function upd(){ if (cur) cnt.textContent = (idx() + 1) + " / " + SETS[cur].n; }
  function load(set){
    cur = set;
    ttl.textContent = SETS[set].name; mode(true);
    var h = ""; for (var i = 1; i <= SETS[set].n; i++){ var f = (i < 10 ? "0" : "") + i;
      h += '<div class="sl"><img ' + (i <= 2 ? "" : 'loading="lazy" ') + 'src="slicks/sets/' + (SETS[set].dir || set) + "/" + f + '.jpg?v=2" alt="' + SETS[set].name + ' slide ' + i + '"></div>'; }
    Z = { s: 1, x: 0, y: 0, img: null }; stage.style.overflowX = ""; stage.innerHTML = h; stage.scrollLeft = 0; upd();
  }
  function go(d){ zreset(); var i = Math.max(0, Math.min(SETS[cur].n - 1, idx() + d)); stage.scrollTo({ left: i * stage.clientWidth, behavior: "smooth" }); }
  function open(set){ root.hidden = false; document.body.style.overflow = "hidden"; if (SETS[set]) load(set); else picker(); }
  function close(){ F.hidden = true; root.hidden = true; document.body.style.overflow = ""; stage.innerHTML = ""; cur = null; }
  stage.addEventListener("scroll", upd, { passive: true });
  root.querySelector(".x").onclick = close;
  // swipe to change slides; pinch to zoom (spread = bigger, pinch = smaller); drag to look around while zoomed; double-tap to reset
  var tx = null, ty = null, sl0 = 0, Z = { s: 1, x: 0, y: 0, img: null }, P = null, pan = null, pinched = false, lastTap = 0;
  function zimg(){ var i = Math.round(stage.scrollLeft / Math.max(1, stage.clientWidth)); var sl = stage.children[i]; return sl ? sl.querySelector("img") : null; }
  function zapply(){ if (!Z.img) return; var w = Z.img.clientWidth, h = Z.img.clientHeight, mx = w * (Z.s - 1) / 2, my = h * (Z.s - 1) / 2;
    Z.x = Math.max(-mx, Math.min(mx, Z.x)); Z.y = Math.max(-my, Math.min(my, Z.y));
    Z.img.style.transform = Z.s > 1 ? "translate(" + Z.x + "px," + Z.y + "px) scale(" + Z.s + ")" : ""; stage.style.overflowX = Z.s > 1 ? "hidden" : ""; }
  function zreset(){ if (Z.img){ Z.img.style.transition = "transform .2s"; Z.s = 1; Z.x = Z.y = 0; zapply(); var im = Z.img; setTimeout(function(){ im.style.transition = ""; }, 220); } Z = { s: 1, x: 0, y: 0, img: null }; stage.style.overflowX = ""; }
  function dist(a, b){ return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  stage.addEventListener("touchstart", function(e){
    if (!cur) return;
    if (e.touches.length === 2){ pinched = true; tx = null; var im = zimg(); if (Z.img !== im){ zreset(); Z.img = im; }
      P = { d: dist(e.touches[0], e.touches[1]), s: Z.s, x: Z.x, y: Z.y, mx: (e.touches[0].clientX + e.touches[1].clientX) / 2, my: (e.touches[0].clientY + e.touches[1].clientY) / 2 }; return; }
    if (e.touches.length === 1){ var t = e.touches[0];
      if (Z.s > 1){ pan = { x: t.clientX, y: t.clientY, ox: Z.x, oy: Z.y }; tx = null; }
      else { tx = t.clientX; ty = t.clientY; sl0 = stage.scrollLeft; pinched = false; } }
  }, { passive: true });
  stage.addEventListener("touchmove", function(e){
    if (P && e.touches.length === 2 && Z.img){ e.preventDefault();
      var r = Z.img.getBoundingClientRect(), cx0 = r.left + r.width / 2 - Z.x, cy0 = r.top + r.height / 2 - Z.y;   // image centre when not panned
      var ns = Math.max(1, Math.min(3.5, P.s * dist(e.touches[0], e.touches[1]) / P.d));
      var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      Z.x = (P.mx - cx0) - (P.mx - cx0 - P.x) * ns / P.s + (mx - P.mx); Z.y = (P.my - cy0) - (P.my - cy0 - P.y) * ns / P.s + (my - P.my);
      Z.s = ns; zapply(); return; }
    if (pan && e.touches.length === 1 && Z.s > 1){ e.preventDefault(); var t = e.touches[0]; Z.x = pan.ox + (t.clientX - pan.x); Z.y = pan.oy + (t.clientY - pan.y); zapply(); return; }
    if (tx !== null && e.touches.length === 1 && Z.s === 1){ e.preventDefault(); stage.style.scrollSnapType = "none"; stage.scrollLeft = sl0 - (e.touches[0].clientX - tx); }   // slide follows your finger
  }, { passive: false });
  stage.addEventListener("touchend", function(e){
    if (P && e.touches.length < 2){ P = null; if (Z.s < 1.05) zreset(); return; }
    if (pan && e.touches.length === 0){ pan = null; }
    if (e.touches.length === 0 && e.changedTouches.length === 1 && !pinched){ var now = Date.now(); if (now - lastTap < 300){ lastTap = 0; if (Z.s > 1) zreset(); else { Z.img = zimg(); Z.s = 2.2; Z.x = Z.y = 0; if (Z.img){ Z.img.style.transition = "transform .2s"; zapply(); var im = Z.img; setTimeout(function(){ im.style.transition = ""; }, 220); } } tx = null; return; } lastTap = now; }
    if (tx === null || !cur || Z.s > 1) { tx = null; return; } var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
    var base = Math.round(sl0 / Math.max(1, stage.clientWidth)), i = base;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) i = Math.max(0, Math.min(SETS[cur].n - 1, base + (dx < 0 ? 1 : -1)));
    stage.scrollTo({ left: i * stage.clientWidth, behavior: "smooth" }); setTimeout(function(){ stage.style.scrollSnapType = ""; }, 450);
  }, { passive: true });
  root.addEventListener("gesturestart", function(e){ e.preventDefault(); });   // stop Safari zooming the whole page
  stage.addEventListener("scroll", function(){ if (Z.img && Z.s === 1) Z.img = null; }, { passive: true });
  stage.addEventListener("click", function(e){ if (!cur || Z.s > 1) return;
    var ph = photoAt(e); if (ph){ lastTap = 0; var fi = F.querySelector("img"); fi.src = "slicks/photos/" + ph[0] + ".jpg?v=1"; fi.alt = ph[5] || ""; F.hidden = false; return; } var w = stage.clientWidth; if (e.clientX < w * 0.25) go(-1); else if (e.clientX > w * 0.75) go(1); });
  root.querySelectorAll(".sq").forEach(function(t){ t.onclick = function(){ load(t.getAttribute("data-set")); }; });
  back.onclick = picker;
  root.querySelector(".nl").onclick = function(){ close(); var b = document.getElementById("newBtnTop") || document.getElementById("newBtnFab"); if (b) b.click(); };
  window.addEventListener("resize", function(){ if (cur) upd(); });
  document.addEventListener("keydown", function(e){ if (root.hidden || !cur && e.key !== "Escape") return; if (e.key === "Escape") close(); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); });
  document.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest("[data-slx]"); if (!b) return; e.preventDefault(); open(b.getAttribute("data-slx")); });
  var btn = document.getElementById("slicksBtn"); if (btn) btn.onclick = function(){ open(); };
  // which sets fit a lead's projects
  window.SLX = { open: open, forLead: function(l){
    var s = {}; (l.interests || []).forEach(function(i){ if (/^Roof/.test(i)) s.roof = 1; else if (/Paint|Stucco|Fascia|Trim/.test(i)) s.stucco = 1; else if (/^Windows/.test(i)) s.windows = 1; });
    var ks = ORDER.filter(function(k){ return s[k]; });
    return ks.length ? '<div class="slx-row">' + ks.map(function(k){ return '<button type="button" class="slx-go" data-slx="' + k + '">📖 Show ' + SETS[k].name.toLowerCase() + ' damage</button>'; }).join("") + '</div>' : "";
  } };
  try { if (window.LG && LG.viewing && LG.viewing()) LG.refreshDetail(); } catch(e){}
})();
