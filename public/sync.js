// ===== Device sync: keeps this app the same on your phone and iPad =====
// Everything is encrypted on the device with your sync code before it leaves; the server only stores ciphertext.
(function(){
  var LG = window.LG; if (!LG || !window.crypto || !crypto.subtle) return;
  var PRE = LG.prefix || "socal_";
  var CODE_K = PRE + "sync_code", META_K = PRE + "sync_meta", SINCE_K = PRE + "sync_since", DEV_K = "lg_sync_dev", LAST_K = PRE + "sync_last";
  var SKIP = /^(sync_|push_)/;   // device-only keys
  var ls = window.localStorage;

  function get(k){ try{ return ls.getItem(k); }catch(e){ return null; } }
  function set(k, v){ try{ rawSet.call(ls, k, v); }catch(e){} }
  function jget(k, d){ try{ return JSON.parse(get(k) || "") || d; }catch(e){ return d; } }
  function synced(k){ return k && k.indexOf(PRE) === 0 && !SKIP.test(k.slice(PRE.length)); }
  var dev = get(DEV_K); if (!dev){ dev = "d_" + Math.random().toString(36).slice(2, 10); try{ ls.setItem(DEV_K, dev); }catch(e){} }

  // ---- track when each key changes on this device ----
  var meta = jget(META_K, { k: {}, it: {} });   // k: key -> mtime ; it: key -> {id: ts (negative = deleted)}
  function saveMeta(){ set(META_K, JSON.stringify(meta)); }
  var rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem, applying = false, dirtyT = null;
  Storage.prototype.setItem = function(k, v){
    rawSet.call(this, k, v);
    if (this === ls && !applying && synced(k)){ meta.k[k] = Date.now(); saveMeta(); soon(); }
  };
  Storage.prototype.removeItem = function(k){
    rawRemove.call(this, k);
    if (this === ls && !applying && synced(k)){ meta.k[k] = Date.now(); saveMeta(); soon(); }
  };
  function soon(){ if (!code()) return; clearTimeout(dirtyT); dirtyT = setTimeout(run, 4000); }

  // per-item stamps for lists of records (leads, call list...) so two devices merge instead of overwrite
  function hash(s){ var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; }
  var ihash = jget(PRE + "sync_ih", {});
  function isRecList(a){ return Array.isArray(a) && a.length > 0 && a.every(function(x){ return x && typeof x === "object" && typeof x.id === "string"; }); }
  function stampItems(k, arr){
    // baseline (right after linking a second device): learn what's here without claiming it's newer than the phone's copy
    var now = Date.now(), base = get(PRE + "sync_base") === "1", its = meta.it[k] || (meta.it[k] = {}), hs = ihash[k] || (ihash[k] = {}), seen = {};
    arr.forEach(function(x){ var h = hash(JSON.stringify(x)); seen[x.id] = 1; if (hs[x.id] !== h){ hs[x.id] = h; its[x.id] = base ? (its[x.id] > 0 ? its[x.id] : 1) : now; } });
    if (!base) Object.keys(hs).forEach(function(id){ if (!seen[id]){ delete hs[id]; its[id] = -now; } });
  }
  function stampAll(){
    for (var i = 0; i < ls.length; i++){ var k = ls.key(i); if (!synced(k)) continue;
      var v = get(k); if (!v || v[0] !== "[") continue;
      var a; try{ a = JSON.parse(v); }catch(e){ continue; }
      if (isRecList(a)) stampItems(k, a);
    }
    set(PRE + "sync_ih", JSON.stringify(ihash)); saveMeta();
    try{ rawRemove.call(ls, PRE + "sync_base"); }catch(e){}
  }

  // ---- crypto: key + space come from the sync code ----
  var keyP = null, spaceP = null, keyFor = null;
  function code(){ return get(CODE_K) || ""; }
  function enc(s){ return new TextEncoder().encode(s); }
  function b64(buf){ var s = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s){ var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function prep(){
    var c = code(); if (keyFor === c && keyP) return;
    keyFor = c;
    spaceP = crypto.subtle.digest("SHA-256", enc("lgsync1|" + PRE + "|" + c)).then(function(d){ return Array.from(new Uint8Array(d)).map(function(x){ return ("0" + x.toString(16)).slice(-2); }).join(""); });
    keyP = crypto.subtle.importKey("raw", enc(c), "PBKDF2", false, ["deriveKey"]).then(function(base){
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc("lgsync-salt|" + PRE), iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  var canGz = typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
  function gz(bytes, mode){ var cs = mode === "c" ? new CompressionStream("gzip") : new DecompressionStream("gzip"); return new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer(); }
  function seal(obj){
    var raw = enc(JSON.stringify(obj));
    return (canGz ? gz(raw, "c") : Promise.resolve(raw)).then(function(data){
      return keyP.then(function(key){ var iv = crypto.getRandomValues(new Uint8Array(12));
        return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data).then(function(ct){ return (canGz ? "g1:" : "p1:") + b64(iv) + ":" + b64(ct); }); });
    });
  }
  function open(s){
    var p = String(s).split(":"); if (p.length !== 3) return Promise.reject(new Error("fmt"));
    return keyP.then(function(key){ return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(p[1]) }, key, unb64(p[2])); })
      .then(function(buf){ return p[0] === "g1" ? gz(buf, "d") : buf; })
      .then(function(buf){ return JSON.parse(new TextDecoder().decode(buf)); });
  }

  // ---- merge one key: lists of records merge per item, everything else newest-wins ----
  function mergeKey(k, remote, rmt){
    var lv = get(k), lmt = meta.k[k] || 0;
    var rv = remote.v;
    if (rv === lv) return { local: false, push: false };
    if (lv == null){ return { local: rv, push: false, mt: rmt, its: remote.its }; }
    var la, ra; try{ la = JSON.parse(lv); ra = JSON.parse(rv); }catch(e){}
    if (Array.isArray(la) && Array.isArray(ra) && (isRecList(la) || isRecList(ra))){
      var lits = meta.it[k] || {}, rits = remote.its || {}, byId = {}, order = [], out = [], its = {};
      function abs(n){ return Math.abs(n || 0); }
      ra.forEach(function(x){ byId[x.id] = { r: x }; order.push(x.id); });
      la.forEach(function(x){ if (!byId[x.id]){ byId[x.id] = {}; order.push(x.id); } byId[x.id].l = x; });
      Object.keys(rits).concat(Object.keys(lits)).forEach(function(id){ if (!byId[id]){ byId[id] = {}; } });
      Object.keys(byId).forEach(function(id){
        var b = byId[id], lt = lits[id] || (b.l ? 1 : 0), rt = rits[id] || (b.r ? 1 : 0);
        var useR = abs(rt) > abs(lt) || (abs(rt) === abs(lt) && rt < 0);
        var t = useR ? rt : lt; its[id] = t;
        if (t < 0) return;                 // deleted on the newer side
        var x = useR ? (b.r || b.l) : (b.l || b.r); if (x) b.pick = x;
      });
      order.forEach(function(id){ if (byId[id].pick) out.push(byId[id].pick); });
      var mv = JSON.stringify(out);
      return { local: mv !== lv ? mv : false, push: mv !== rv, its: its, mt: Math.max(lmt, rmt), mv: mv };
    }
    if (rmt > lmt) return { local: rv, push: false, mt: rmt };
    return { local: false, push: true };
  }

  // ---- the sync loop ----
  var running = false, lastErr = "";
  function status(){ var l = jget(LAST_K, null); return l; }
  function run(){
    if (running || !code() || !navigator.onLine) return Promise.resolve();
    if (LG.busy && LG.busy()){ clearTimeout(dirtyT); dirtyT = setTimeout(run, 15000); return Promise.resolve(); }   // finish the form first
    running = true; prep(); stampAll();
    var space, changedLocal = false, toPush = {};
    return spaceP.then(function(s){ space = s; return pullAll(); })
      .then(function(rows){
        return rows.reduce(function(p, row){
          return p.then(function(){
            if (!synced(row.k) || row.dev === dev && (meta.k[row.k] || 0) <= row.mt) return;
            return open(row.v).then(function(remote){
              var m = mergeKey(row.k, remote, row.mt);
              if (m.local !== false && m.local !== undefined){
                applying = true; try{ rawSet.call(ls, row.k, m.local); }catch(e){} applying = false;
                changedLocal = true; meta.k[row.k] = m.mt || row.mt;
                if (m.its){ meta.it[row.k] = m.its; var hs = ihash[row.k] = {}; try{ JSON.parse(m.local).forEach(function(x){ hs[x.id] = hash(JSON.stringify(x)); }); }catch(e){} }
              } else if (m.its){ meta.it[row.k] = m.its; }
              if (m.push) toPush[row.k] = 1;
            }).catch(function(){ lastErr = "decrypt"; });
          });
        }, Promise.resolve());
      })
      .then(function(){
        saveMeta(); set(PRE + "sync_ih", JSON.stringify(ihash));
        // push every key changed here since the last push, plus merges the server needs
        var pushed = jget(PRE + "sync_pushed", {});
        Object.keys(meta.k).forEach(function(k){ if (synced(k) && (meta.k[k] || 0) > (pushed[k] || 0)) toPush[k] = 1; });
        var keys = Object.keys(toPush).filter(function(k){ return toPush[k]; });
        return keys.reduce(function(p, k){
          return p.then(function(){
            var v = get(k); if (v == null) v = "null";
            if (v.length > 4000000) return;
            var mt = meta.k[k] || Date.now();
            return seal({ v: v, its: meta.it[k] || null }).then(function(sv){
              return fetch("/sync/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ space: space, dev: dev, items: [{ k: k, v: sv, mt: mt }] }) })
                .then(function(r){ if (r.ok){ pushed[k] = mt; } });
            });
          });
        }, Promise.resolve()).then(function(){ set(PRE + "sync_pushed", JSON.stringify(pushed)); });
      })
      .then(function(){
        set(LAST_K, JSON.stringify({ ts: Date.now(), ok: true }));
        if (changedLocal) afterChange();
        lastErr = ""; paint();
      })
      .catch(function(e){ lastErr = "offline"; paint(); })
      .then(function(){ running = false; });
  }
  function pullAll(){
    var since = parseInt(get(SINCE_K) || "0", 10) || 0, rows = [];
    function page(){
      return spaceP.then(function(space){ return fetch("/sync/pull?space=" + space + "&since=" + since, { cache: "no-store" }); })
        .then(function(r){ if (!r.ok) throw new Error("pull"); return r.json(); })
        .then(function(d){ rows = rows.concat(d.items || []); since = d.next || since; if (d.more) return page(); });
    }
    return page().then(function(){ set(SINCE_K, String(since)); return rows; });
  }
  function afterChange(){
    try{ if (LG.reload) LG.reload(); }catch(e){}
    try{ if (window.TM_reload) window.TM_reload(); }catch(e){}
    toast("☁️ Synced — updates from your other device are in.");
  }
  function toast(msg){ var t = document.createElement("div"); t.style.cssText = "position:fixed;left:16px;right:16px;bottom:calc(20px + env(safe-area-inset-bottom,0px));background:#152535;color:#fff;padding:12px 14px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.25)"; t.textContent = msg; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 3000); }

  // ---- setup UI inside the Backup sheet ----
  function newCode(){ var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "", r = crypto.getRandomValues(new Uint8Array(12)); for (var i = 0; i < 12; i++) s += A[r[i] % A.length]; return s.slice(0,4) + "-" + s.slice(4,8) + "-" + s.slice(8); }
  function norm(c){ var s = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return s.length === 12 ? s.slice(0,4) + "-" + s.slice(4,8) + "-" + s.slice(8) : ""; }
  function ago(ts){ var s = Math.round((Date.now() - ts) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + " min ago" : Math.round(s / 3600) + " h ago"; }
  var box = document.createElement("div"); box.className = "full-bk"; box.id = "syncBox";
  function paint(){
    var c = code(), l = status();
    box.innerHTML = '<div class="co-lbl">☁️ Sync phone ↔ iPad</div>' + (c
      ? '<p style="margin:4px 0 8px">On — changes on either device show up on the other within a minute.' + (l ? ' Last synced ' + ago(l.ts) + '.' : '') + (lastErr === "offline" ? ' <b>Offline — will retry.</b>' : lastErr === "decrypt" ? ' <b>Code mismatch on some data.</b>' : '') + '</p>' +
        '<div style="font-size:22px;font-weight:800;letter-spacing:2px;text-align:center;padding:10px;border:2px dashed var(--border);border-radius:12px;margin-bottom:8px" id="syncCodeShow">' + c + '</div>' +
        '<p style="margin:0 0 8px">On your other device: open this same app → ⇅ → <b>I have a code</b> → enter this code. Keep it private — it unlocks your leads.</p>' +
        '<button type="button" id="syncNow">🔄 Sync now</button><button type="button" id="syncOff" style="background:#fff;color:#a8321f;border:1px solid #e3b4ab">Turn off sync on this device</button>'
      : '<p style="margin:4px 0 8px">Keep this app the same on your phone and iPad. Your leads are encrypted with your private code before they leave the device.</p>' +
        '<button type="button" id="syncStart">☁️ Turn on sync (start here on your phone)</button>' +
        '<button type="button" id="syncHave" style="background:#fff;color:var(--brand);border:1px solid var(--border)">🔑 I have a code (on the iPad)</button>');
    var b;
    if ((b = document.getElementById("syncStart"))) b.onclick = function(){
      var c2 = newCode(); try{ ls.setItem(CODE_K, c2); }catch(e){}
      meta.k = meta.k || {}; for (var i = 0; i < ls.length; i++){ var k = ls.key(i); if (synced(k) && !meta.k[k]) meta.k[k] = Date.now(); }
      ihash = {}; saveMeta(); set(SINCE_K, "0"); set(PRE + "sync_pushed", "{}"); paint(); run();
    };
    if ((b = document.getElementById("syncHave"))) b.onclick = function(){
      var c2 = norm(prompt("Enter the sync code shown on your phone (⇅ → Sync phone ↔ iPad):") || "");
      if (!c2){ alert("That code doesn't look right — it's 12 letters/numbers like ABCD-EFGH-JKLM."); return; }
      try{ ls.setItem(CODE_K, c2); }catch(e){}
      // this device's existing data counts as older, so the phone's copy wins where they differ (lists still merge)
      Object.keys(meta.k).forEach(function(k){ meta.k[k] = 1; }); Object.keys(meta.it).forEach(function(k){ Object.keys(meta.it[k]).forEach(function(id){ meta.it[k][id] = meta.it[k][id] < 0 ? -1 : 1; }); });
      ihash = {}; set(PRE + "sync_base", "1"); saveMeta(); set(SINCE_K, "0"); set(PRE + "sync_pushed", "{}"); paint(); toast("🔑 Linked — pulling your leads…"); run();
    };
    if ((b = document.getElementById("syncNow"))) b.onclick = function(){ run().then(function(){ toast("☁️ Synced"); }); };
    if ((b = document.getElementById("syncOff"))) b.onclick = function(){ if (!confirm("Turn off sync on this device? Your leads stay here; they just stop updating from your other device.")) return; try{ rawRemove.call(ls, CODE_K); }catch(e){} paint(); };
  }
  function mount(){ var sh = document.querySelector("#backupSheet .sheet"); if (!sh || document.getElementById("syncBox")) return; var first = sh.querySelector(".full-bk"); sh.insertBefore(box, first || null); paint(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  // ---- when to sync ----
  setTimeout(function(){ if (code()) run(); }, 1500);
  setInterval(function(){ if (code() && document.visibilityState === "visible") run(); }, 45000);
  document.addEventListener("visibilitychange", function(){ if (code()) run(); });
  window.addEventListener("online", function(){ if (code()) run(); });
  window.LG_sync = { run: run, code: code };
})();
