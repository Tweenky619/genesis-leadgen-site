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
    "#slx .stage{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;touch-action:pan-x;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}" +
    "#slx .stage::-webkit-scrollbar{display:none}" +
    "#slx .sl{flex:0 0 100%;height:100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:0 0 calc(env(safe-area-inset-bottom) + 8px)}" +
    "#slx .sl img{max-width:100%;max-height:100%;object-fit:contain;display:block}" +
    
    ".slx-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}" +
    ".slx-go{flex:1 1 auto;border:0;border-radius:6px;padding:12px 14px;font-weight:800;font-size:15px;background:#14212B;color:#fff}";
  document.head.appendChild(css);
  var root = document.createElement("div"); root.id = "slx"; root.hidden = true;
  root.innerHTML = '<div class="bar"><button class="back">\u25c0 Sets</button><div class="ttl">Damage slicks</div><div class="cnt"></div><button class="nl" aria-label="Add">+</button><button class="x" aria-label="Close">\u2715</button></div>' +
    '<div class="pick">' + ORDER.map(function(k){ var t = SETS[k]; return '<button class="sq" data-set="' + k + '" style="background:' + t.bg + '"><i>' + t.ic + '</i><span><b>' + t.name + '</b><small>' + t.sub + '</small></span></button>'; }).join("") + '</div>' +
    '<div class="stage"></div>';
  document.body.appendChild(root);
  var stage = root.querySelector(".stage"), cnt = root.querySelector(".cnt"), pick = root.querySelector(".pick"), ttl = root.querySelector(".ttl"), back = root.querySelector(".back"), cur = null;
  function mode(slides){ pick.style.display = slides ? "none" : ""; stage.style.display = slides ? "" : "none"; back.style.display = slides ? "" : "none"; cnt.style.display = slides ? "" : "none"; }
  function picker(){ cur = null; stage.innerHTML = ""; ttl.textContent = "Damage slicks"; mode(false); }
  function idx(){ return Math.round(stage.scrollLeft / Math.max(1, stage.clientWidth)); }
  function upd(){ if (cur) cnt.textContent = (idx() + 1) + " / " + SETS[cur].n; }
  function load(set){
    cur = set;
    ttl.textContent = SETS[set].name; mode(true);
    var h = ""; for (var i = 1; i <= SETS[set].n; i++){ var f = (i < 10 ? "0" : "") + i;
      h += '<div class="sl"><img ' + (i <= 2 ? "" : 'loading="lazy" ') + 'src="slicks/sets/' + set + "/" + f + '.jpg?v=1" alt="' + SETS[set].name + ' slide ' + i + '"></div>'; }
    stage.innerHTML = h; stage.scrollLeft = 0; upd();
  }
  function go(d){ var i = Math.max(0, Math.min(SETS[cur].n - 1, idx() + d)); stage.scrollTo({ left: i * stage.clientWidth, behavior: "smooth" }); }
  function open(set){ root.hidden = false; document.body.style.overflow = "hidden"; if (SETS[set]) load(set); else picker(); }
  function close(){ root.hidden = true; document.body.style.overflow = ""; stage.innerHTML = ""; cur = null; }
  stage.addEventListener("scroll", upd, { passive: true });
  root.querySelector(".x").onclick = close;
  // swipe (finger drag) to change slides; a quick tap on the left/right side also works
  var tx = null, ty = null, t0 = 0, sl0 = 0;
  stage.addEventListener("touchstart", function(e){ var t = e.touches[0]; tx = t.clientX; ty = t.clientY; t0 = Date.now(); sl0 = stage.scrollLeft; }, { passive: true });
  stage.addEventListener("touchend", function(e){
    if (tx === null || !cur) return; var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){ var base = Math.round(sl0 / Math.max(1, stage.clientWidth)); var i = Math.max(0, Math.min(SETS[cur].n - 1, base + (dx < 0 ? 1 : -1))); setTimeout(function(){ stage.scrollTo({ left: i * stage.clientWidth, behavior: "smooth" }); }, 0); }
  }, { passive: true });
  stage.addEventListener("click", function(e){ if (!cur) return; var w = stage.clientWidth; if (e.clientX < w * 0.25) go(-1); else if (e.clientX > w * 0.75) go(1); });
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
