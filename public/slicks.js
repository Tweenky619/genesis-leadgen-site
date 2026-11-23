// Damage slicks: full-screen, swipeable slide sets (Roof / Paint & Stucco / Windows) to show homeowners
(function(){
  var H = document.documentElement;
  if (H.classList.contains("wl-app") && !H.classList.contains("wl-mine")) { var b0 = document.getElementById("slicksBtn"); if (b0) b0.remove(); return; }
  var SETS = {
    roof:    { name: "Roof", n: 9 },
    stucco:  { name: "Paint & Stucco", n: 8 },
    windows: { name: "Windows", n: 7 }
  };
  var ORDER = ["roof", "stucco", "windows"];
  var css = document.createElement("style");
  css.textContent =
    "#slx{position:fixed;inset:0;z-index:99999;background:#14212B;display:flex;flex-direction:column;color:#F3EFE7;font-family:-apple-system,system-ui,sans-serif;-webkit-user-select:none;user-select:none}" +
    "#slx[hidden]{display:none}" +
    "#slx .bar{display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top) + 8px) 12px 8px;flex:0 0 auto}" +
    "#slx .tabs{display:flex;gap:6px;flex:1;overflow-x:auto}" +
    "#slx .tab{border:0;border-radius:999px;padding:9px 14px;font-weight:800;font-size:14px;background:#1e2a35;color:#C3CDD3;white-space:nowrap}" +
    "#slx .tab.on{background:#E2672B;color:#14212B}" +
    "#slx .cnt{font-weight:700;font-size:14px;color:#C3CDD3;min-width:48px;text-align:right}" +
    "#slx .x{border:0;background:#1e2a35;color:#fff;font-size:20px;width:40px;height:40px;border-radius:20px}" +
    "#slx .stage{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}" +
    "#slx .stage::-webkit-scrollbar{display:none}" +
    "#slx .sl{flex:0 0 100%;height:100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:0 0 calc(env(safe-area-inset-bottom) + 8px)}" +
    "#slx .sl img{max-width:100%;max-height:100%;object-fit:contain;display:block}" +
    "#slx .nav{position:absolute;top:70px;bottom:0;width:22%;border:0;background:transparent}" +
    "#slx .nav.l{left:0}#slx .nav.r{right:0}" +
    ".slx-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}" +
    ".slx-go{flex:1 1 auto;border:0;border-radius:10px;padding:12px 14px;font-weight:800;font-size:15px;background:#14212B;color:#fff}";
  document.head.appendChild(css);
  var root = document.createElement("div"); root.id = "slx"; root.hidden = true;
  root.innerHTML = '<div class="bar"><div class="tabs">' + ORDER.map(function(k){ return '<button class="tab" data-set="' + k + '">' + SETS[k].name + '</button>'; }).join("") +
    '</div><div class="cnt"></div><button class="x" aria-label="Close">✕</button></div><div class="stage"></div>' +
    '<button class="nav l" aria-label="Previous"></button><button class="nav r" aria-label="Next"></button>';
  document.body.appendChild(root);
  var stage = root.querySelector(".stage"), cnt = root.querySelector(".cnt"), cur = null;
  function idx(){ return Math.round(stage.scrollLeft / Math.max(1, stage.clientWidth)); }
  function upd(){ if (cur) cnt.textContent = (idx() + 1) + " / " + SETS[cur].n; }
  function load(set){
    cur = set;
    root.querySelectorAll(".tab").forEach(function(t){ t.classList.toggle("on", t.getAttribute("data-set") === set); });
    var h = ""; for (var i = 1; i <= SETS[set].n; i++){ var f = (i < 10 ? "0" : "") + i;
      h += '<div class="sl"><img ' + (i <= 2 ? "" : 'loading="lazy" ') + 'src="slicks/sets/' + set + "/" + f + '.jpg?v=1" alt="' + SETS[set].name + ' slide ' + i + '"></div>'; }
    stage.innerHTML = h; stage.scrollLeft = 0; upd();
  }
  function go(d){ var i = Math.max(0, Math.min(SETS[cur].n - 1, idx() + d)); stage.scrollTo({ left: i * stage.clientWidth, behavior: "smooth" }); }
  function open(set){ root.hidden = false; document.body.style.overflow = "hidden"; load(SETS[set] ? set : "roof"); }
  function close(){ root.hidden = true; document.body.style.overflow = ""; stage.innerHTML = ""; cur = null; }
  stage.addEventListener("scroll", upd, { passive: true });
  root.querySelector(".x").onclick = close;
  root.querySelector(".nav.l").onclick = function(){ go(-1); };
  root.querySelector(".nav.r").onclick = function(){ go(1); };
  root.querySelectorAll(".tab").forEach(function(t){ t.onclick = function(){ load(t.getAttribute("data-set")); }; });
  window.addEventListener("resize", function(){ if (cur) upd(); });
  document.addEventListener("keydown", function(e){ if (root.hidden) return; if (e.key === "Escape") close(); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); });
  document.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest("[data-slx]"); if (!b) return; e.preventDefault(); open(b.getAttribute("data-slx")); });
  var btn = document.getElementById("slicksBtn"); if (btn) btn.onclick = function(){ open("roof"); };
  // which sets fit a lead's projects
  window.SLX = { open: open, forLead: function(l){
    var s = {}; (l.interests || []).forEach(function(i){ if (/^Roof/.test(i)) s.roof = 1; else if (/Paint|Stucco|Fascia|Trim/.test(i)) s.stucco = 1; else if (/^Windows/.test(i)) s.windows = 1; });
    var ks = ORDER.filter(function(k){ return s[k]; });
    return ks.length ? '<div class="slx-row">' + ks.map(function(k){ return '<button type="button" class="slx-go" data-slx="' + k + '">📖 Show ' + SETS[k].name.toLowerCase() + ' damage</button>'; }).join("") + '</div>' : "";
  } };
  try { if (window.LG && LG.viewing && LG.viewing()) LG.refreshDetail(); } catch(e){}
})();
