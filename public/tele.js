// ===== Telemarketing mode: call list, phone script, one-tap outcomes, appointments drop into Lead Gen =====
(function(){
  var LG = window.LG, A = window.App || {};
  if (!LG) return;
  var PRE = LG.prefix || "socal_", KEY = PRE + "tele_v1", LOGK = PRE + "tele_log_v1";
  var view = document.getElementById("view-tele"), body = document.getElementById("teleBody");
  var btn = document.getElementById("teleBtn");
  if (!view || !body || !btn) return;

  // ---------- storage ----------
  function load(k){ try{ return JSON.parse(localStorage.getItem(k) || "[]") || []; }catch(e){ return []; } }
  var list = load(KEY), calls = load(LOGK);
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(list)); localStorage.setItem(LOGK, JSON.stringify(calls.slice(-5000))); }catch(e){} }
  function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function digits(p){ return String(p || "").replace(/\D/g, "").replace(/^1(\d{10})$/, "$1"); }
  function fmtPh(p){ var d = digits(p); return d.length === 10 ? "(" + d.slice(0,3) + ") " + d.slice(3,6) + "-" + d.slice(6) : p; }
  function rep(){ try{ return (A.meFirst && A.meFirst()) || "Art"; }catch(e){ return "Art"; } }
  function co(){ return LG.coName || "our company"; }
  function todayISO(){ return LG.todayISO ? LG.todayISO() : new Date().toISOString().slice(0,10); }
  function isoAdd(n){ var d = new Date(); d.setDate(d.getDate() + n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
  function products(){
    var p = [].map.call(document.querySelectorAll("#view-form .f_interest"), function(i){ return i.value; }).filter(function(v){ return v && v !== "Other"; });
    return p.length ? p.filter(function(v, i){ return p.indexOf(v) === i; }) : ["Roof", "Paint/Stucco", "Windows"];
  }
  var DNC_ST = { dnc: 1, wrong: 1, booked: 1, ni: 1 };
  var OUT = {
    na:     { t: "No answer",      c: "#6b7570", contact: false },
    vm:     { t: "Left voicemail", c: "#6b7570", contact: false },
    cb:     { t: "Call back",      c: "#8a5a00", contact: true },
    ni:     { t: "Not interested", c: "#a8321f", contact: true },
    wrong:  { t: "Wrong number",   c: "#6a2fb0", contact: false },
    dnc:    { t: "Do not call",    c: "#2b2b2b", contact: true },
    booked: { t: "Appointment set",c: "#0b6b3a", contact: true }
  };

  // ---------- calling hours: 8 AM - 9 PM (federal rule, homeowner's local time) ----------
  function inHours(){ var h = new Date().getHours(); return h >= 8 && h < 21; }

  // ---------- queue order: callbacks due -> new -> no-answer retries (2h apart, max 4 tries) ----------
  function nextUp(){
    var now = Date.now();
    var open = list.filter(function(c){ return !DNC_ST[c.status]; });
    var due = open.filter(function(c){ return c.status === "cb" && c.cb_at && c.cb_at <= now; }).sort(function(a, b){ return a.cb_at - b.cb_at; });
    if (due.length) return due[0];
    var fresh = open.filter(function(c){ return !c.status; });
    if (fresh.length) return fresh[0];
    var retry = open.filter(function(c){ return (c.status === "na" || c.status === "vm") && (c.tries || 0) < 4 && now - (c.last || 0) > 2 * 3600e3; })
      .sort(function(a, b){ return (a.last || 0) - (b.last || 0); });
    return retry[0] || null;
  }
  function counts(){
    var now = Date.now(), o = { all: list.length, fresh: 0, cb: 0, retry: 0, done: 0 };
    list.forEach(function(c){
      if (DNC_ST[c.status]) o.done++;
      else if (!c.status) o.fresh++;
      else if (c.status === "cb") o.cb++;
      else o.retry++;
    });
    return o;
  }
  function todayStats(){
    var t0 = new Date(); t0.setHours(0,0,0,0); t0 = +t0;
    var tc = calls.filter(function(x){ return x.ts >= t0; });
    var contacts = tc.filter(function(x){ return OUT[x.o] && OUT[x.o].contact; }).length;
    var appts = tc.filter(function(x){ return x.o === "booked"; }).length;
    return { dials: tc.length, contacts: contacts, appts: appts,
      cr: tc.length ? Math.round(contacts / tc.length * 100) : 0, br: contacts ? Math.round(appts / contacts * 100) : 0 };
  }

  // ---------- import: paste lines or a CSV (name, phone, address, city/zip, notes in any order) ----------
  function parseRows(text){
    var rows = String(text || "").split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
    var out = [], head = null;
    rows.forEach(function(line, i){
      var cells = line.match(/("([^"]|"")*"|[^,\t]*)(?=[,\t]|$)/g) || [line];
      cells = cells.filter(function(x, j){ return !(x === "" && j && cells[j-1] !== ""); }).map(function(x){ return x.replace(/^"|"$/g, "").replace(/""/g, '"').trim(); });
      if (i === 0 && /phone/i.test(line) && !/\d{7}/.test(line)){ head = cells.map(function(h){ return h.toLowerCase(); }); return; }
      var r = {};
      if (head){
        head.forEach(function(h, k){ var v = cells[k] || "";
          if (/phone|cell|mobile|number/.test(h) && !r.phone) r.phone = v;
          else if (/first/.test(h)) r.first = v; else if (/last/.test(h)) r.last = v;
          else if (/name|owner/.test(h) && !r.name) r.name = v;
          else if (/addr|street/.test(h)) r.address = v; else if (/city/.test(h)) r.city = v;
          else if (/zip|postal/.test(h)) r.zip = v; else if (/note|comment/.test(h)) r.notes = v; });
        if (!r.name) r.name = [r.first, r.last].filter(Boolean).join(" ");
      } else {
        cells.forEach(function(v){
          if (!r.phone && digits(v).length >= 10 && digits(v).length <= 11) r.phone = v;
          else if (!r.address && /^\d+\s+\S/.test(v)) r.address = v;
          else if (!r.zip && /^\d{5}$/.test(v)) r.zip = v;
          else if (!r.name && /[a-z]/i.test(v)) r.name = v;
          else if (v) r.notes = (r.notes ? r.notes + " · " : "") + v;
        });
      }
      if (digits(r.phone).length === 10) out.push(r);
    });
    return out;
  }
  function addRows(rows){
    var have = {}; list.forEach(function(c){ have[digits(c.phone)] = 1; });
    var added = 0, dup = 0;
    rows.forEach(function(r){
      var d = digits(r.phone); if (have[d]){ dup++; return; } have[d] = 1;
      var nm = String(r.name || "").trim().replace(/^([^,]+),\s*(.+)$/, "$2 $1");   // "Smith, John" -> "John Smith"
      list.push({ id: "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: nm, phone: d,
        address: r.address || "", city: r.city || "", zip: r.zip || "", notes: r.notes || "", tries: 0, hist: [] });
      added++;
    });
    save(); return { added: added, dup: dup };
  }

  // ---------- phone script (Art's formula, by phone) ----------
  var CUE = { "Roof": "any curling or missing shingles, or leaks after the rain", "Paint/Stucco": "the paint fading or peeling, or cracks in the stucco",
    "Windows": "drafts, foggy glass, or windows that are hard to open", "Fascia/Trim Boards": "the trim boards peeling or rotting", "Solar": "how high the electric bill has been" };
  function scriptHtml(c, prod){
    var first = (c.name || "").split(" ")[0] || "[Name]";
    var cue = CUE[prod] || "anything you've been wanting to fix";
    var S = function(t, say, tip){ return '<div class="tm-s"><b>' + t + '</b><p>' + say + '</p>' + (tip ? '<i>' + tip + '</i>' : '') + '</div>'; };
    return S("1 · Greet", "Hi, is this " + esc(first) + "? Hey " + esc(first) + ", my name is " + esc(rep()) + " with " + esc(co()) + " — how are you?",
             "Say your name and company up front. If they say “doing fine, and yourself?”: “Doing great — first time I heard that all day!”") +
      S("2 · Why you're calling", "The reason I'm calling — my company, tomorrow is leaving estimates in " + esc(c.city || "your neighborhood") + " on different services that we do. Have you noticed " + cue + "?",
             "Let them talk. Whatever they say about the house is your opening.") +
      S("3 · Close", "We'll be right in your area. Would 10 in the morning work, or does 2 in the afternoon sound better for you?",
             "Two times, both yeses. Don't quote prices on the phone — that's what the estimate is for.") +
      S("4 · Lock it in", "Perfect. I have you at " + esc(c.address || "[address]") + ", right? Will everyone on the title be home too, so they can see it firsthand? And this is the best number to confirm?",
             "Confirm address, all decision makers, best number. Then tap Appointment set.") +
      '<details class="tm-obj"><summary>Quick comebacks</summary>' +
      S("“Just send me a quote.”", "I wish I could — every house is different, so it takes a quick look in person to give you a real number. Morning or afternoon better?") +
      S("“I'm busy right now.”", "No problem, I'll be quick — or when's a better time to call you back today?", "Tap Call back and set the time they give you.") +
      S("“Not interested.”", "Totally fair. Is it the timing, or is the " + esc(prod.toLowerCase()) + " already taken care of?", "One try, then let it go politely.") +
      S("“How did you get my number?”", "We reach out to homeowners in your area. If you'd rather not get calls, I'll take you off our list right now.", "If they want off: tap Do not call. Never call again.") +
      '</details>';
  }

  // ---------- render ----------
  var mode = "dial", cur = null, prod = null, timerT0 = 0, timerInt = null;
  function header(){
    var s = todayStats(), k = counts();
    return '<div class="tm-stats"><div><b>' + s.dials + '</b><span>Dials</span></div><div><b>' + s.contacts + '</b><span>Contacts</span></div><div><b>' + s.appts + '</b><span>Appts</span></div><div><b>' + s.cr + '%</b><span>Contact</span></div><div><b>' + s.br + '%</b><span>Booking</span></div></div>' +
      '<div class="tm-tabs"><button data-tm="dial"' + (mode === "dial" ? ' class="on"' : '') + '>📞 Dial</button><button data-tm="list"' + (mode === "list" ? ' class="on"' : '') + '>📋 List (' + k.all + ')</button><button data-tm="add"' + (mode === "add" ? ' class="on"' : '') + '>➕ Add</button></div>';
  }
  function render(){
    clearInterval(timerInt);
    var h = header();
    if (mode === "add") h += addHtml();
    else if (mode === "list") h += listHtml();
    else h += dialHtml();
    body.innerHTML = h;
    wire();
  }
  function dialHtml(){
    if (!list.length) return '<div class="tm-card tm-empty"><b>No numbers yet.</b><p>Tap <b>➕ Add</b> to paste or import your call list.</p></div>' + rules();
    cur = cur && !DNC_ST[cur.status] && list.indexOf(cur) > -1 ? cur : nextUp();
    if (!cur){ var k = counts(); return '<div class="tm-card tm-empty"><b>List done for now 🎉</b><p>' + k.cb + ' callbacks scheduled · ' + k.retry + ' no-answers waiting to retry (2 hours apart).</p></div>' + rules(); }
    var ps = products(); prod = prod && ps.indexOf(prod) > -1 ? prod : (cur.prod || ps[0]);
    var hours = inHours();
    return '<div class="tm-card">' +
      (cur.status === "cb" ? '<div class="tm-flag">⏰ Callback' + (cur.cb_note ? ' — ' + esc(cur.cb_note) : '') + '</div>' : '') +
      '<div class="tm-name">' + esc(cur.name || "Homeowner") + '</div>' +
      '<div class="tm-sub">' + esc([cur.address, cur.city, cur.zip].filter(Boolean).join(", ") || "No address") + '</div>' +
      '<div class="tm-sub">Tries: ' + (cur.tries || 0) + (cur.notes ? ' · ' + esc(cur.notes) : '') + '</div>' +
      (hours ? '<a class="tm-call" id="tmCall" href="tel:' + digits(cur.phone) + '">📞 Call ' + esc(fmtPh(cur.phone)) + '</a>'
             : '<div class="tm-call off">🌙 Outside calling hours (8 AM – 9 PM)</div>') +
      '<div class="tm-timer" id="tmTimer"></div>' +
      '<div class="tm-lbl">Pitch</div><div class="tm-prod">' + ps.map(function(p){ return '<button data-prod="' + esc(p) + '"' + (p === prod ? ' class="on"' : '') + '>' + esc(p) + '</button>'; }).join("") + '</div>' +
      '<details class="tm-script" open><summary>📝 Phone script</summary>' + scriptHtml(cur, prod) + '</details>' +
      '<div class="tm-lbl">Outcome</div><div class="tm-out">' +
        ["na","vm","cb","ni","wrong","dnc","booked"].map(function(o){ return '<button data-out="' + o + '" style="--c:' + OUT[o].c + '"' + (o === "booked" ? ' class="big"' : '') + '>' + OUT[o].t + '</button>'; }).join("") +
      '</div><div id="tmForm"></div>' +
      '<button type="button" class="tm-skip" id="tmSkip">Skip for now →</button></div>' + rules();
  }
  function rules(){
    return '<details class="tm-rules"><summary>⚖️ Calling rules</summary><ul>' +
      '<li>Call only <b>8 AM – 9 PM</b> the homeowner’s time.</li>' +
      '<li>Say your name and company at the start of every call.</li>' +
      '<li>Scrub purchased or cold lists against the National Do Not Call Registry before calling (your company should do this).</li>' +
      '<li>Anyone who asks not to be called → tap <b>Do not call</b>. They’re never shown again.</li>' +
      '<li>Dial by hand only — no auto-dialers or recorded messages to cell phones without written consent.</li>' +
      '<li>No price quotes or promises on the phone.</li></ul></details>';
  }
  function listHtml(){
    if (!list.length) return '<div class="tm-card tm-empty"><p>No numbers yet.</p></div>';
    var k = counts();
    var order = list.slice().sort(function(a, b){ var r = function(c){ return DNC_ST[c.status] ? 3 : c.status === "cb" ? 0 : !c.status ? 1 : 2; }; return r(a) - r(b); });
    return '<div class="tm-sum">' + k.fresh + ' new · ' + k.cb + ' callbacks · ' + k.retry + ' retry · ' + k.done + ' done</div>' +
      order.map(function(c){
        var st = c.status ? OUT[c.status].t : "New";
        return '<div class="tm-row" data-pick="' + c.id + '"><div><b>' + esc(c.name || fmtPh(c.phone)) + '</b><span>' + esc(fmtPh(c.phone)) + (c.address ? ' · ' + esc(c.address) : '') + '</span></div>' +
          '<em style="color:' + (c.status ? OUT[c.status].c : '#1d4f8a') + '">' + st + (c.status === "cb" && c.cb_at ? '<br>' + new Date(c.cb_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : '') + '</em></div>';
      }).join("") +
      '<button type="button" class="tm-clear" id="tmClear">Remove finished numbers</button>';
  }
  function addHtml(){
    return '<div class="tm-card"><div class="tm-lbl">Paste your call list</div>' +
      '<p class="tm-help">One per line: name, phone, address (any order). Or paste a CSV with a header row (Name, Phone, Address, City, Zip, Notes).</p>' +
      '<textarea id="tmPaste" rows="8" placeholder="Maria Lopez, 619-555-1234, 123 Main St\nJohn Smith, (858) 555-9876, 45 Oak Ave, 92113"></textarea>' +
      '<button type="button" class="tm-go" id="tmAddGo">Add to call list</button>' +
      '<label class="tm-file">📂 Import a .csv file<input type="file" id="tmFile" accept=".csv,text/csv,text/plain" hidden></label>' +
      '<div class="tm-lbl" style="margin-top:16px">Or add one</div>' +
      '<input id="tmN" placeholder="Name"><input id="tmP" placeholder="Phone" inputmode="tel"><input id="tmA" placeholder="Address"><input id="tmZ" placeholder="Zip" inputmode="numeric">' +
      '<button type="button" class="tm-go" id="tmOne">Add number</button><div id="tmMsg" class="tm-help"></div></div>';
  }

  // ---------- outcomes ----------
  function record(o, extra){
    var c = cur; if (!c) return;
    c.status = o; c.last = Date.now(); c.tries = (c.tries || 0) + 1; c.prod = prod;
    c.hist = c.hist || []; c.hist.unshift({ ts: Date.now(), o: o, note: extra || "" });
    if (o !== "cb"){ delete c.cb_at; delete c.cb_note; }
    if ((o === "na" || o === "vm") && c.tries >= 4) c.status = "ni", c.hist[0].note = "4 tries, no answer";
    calls.push({ ts: Date.now(), o: o, id: c.id });
    save(); cur = null; prod = null; render();
  }
  function formCb(){
    var f = document.getElementById("tmForm");
    f.innerHTML = '<div class="tm-sub2"><div class="tm-lbl">Call back when?</div>' +
      '<div class="tm-quick"><button data-cbq="60">In 1 hour</button><button data-cbq="tonight">Tonight 6 PM</button><button data-cbq="tmrw">Tomorrow 10 AM</button></div>' +
      '<input type="datetime-local" id="tmCbAt"><input id="tmCbNote" placeholder="Note (e.g. ask for the husband)"><button type="button" class="tm-go" id="tmCbSave">Save callback</button></div>';
    f.querySelectorAll("[data-cbq]").forEach(function(b){ b.onclick = function(){
      var d = new Date(), q = b.getAttribute("data-cbq");
      if (q === "60") d = new Date(Date.now() + 3600e3); else if (q === "tonight"){ d.setHours(18,0,0,0); } else { d.setDate(d.getDate() + 1); d.setHours(10,0,0,0); }
      var loc = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
      document.getElementById("tmCbAt").value = loc; }; });
    document.getElementById("tmCbSave").onclick = function(){
      var v = document.getElementById("tmCbAt").value; if (!v){ alert("Pick when to call back."); return; }
      cur.cb_at = new Date(v).getTime(); cur.cb_note = document.getElementById("tmCbNote").value.trim();
      record("cb", new Date(cur.cb_at).toLocaleString());
    };
    f.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function timesHtml(){ var o = ""; for (var m = 540; m <= 1140; m += 30){ var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "PM" : "AM", hh = h % 12 || 12; var t = hh + ":" + (mm ? "30" : "00") + " " + ap; o += '<option' + (t === "10:00 AM" ? " selected" : "") + '>' + t + '</option>'; } return o; }
  function formBook(){
    var f = document.getElementById("tmForm"), nm = (cur.name || "").split(" ");
    f.innerHTML = '<div class="tm-sub2"><div class="tm-lbl">Appointment</div>' +
      '<input id="tbF" placeholder="First name" value="' + esc(nm[0] || "") + '"><input id="tbL" placeholder="Last name" value="' + esc(nm.slice(1).join(" ")) + '">' +
      '<input id="tbA" placeholder="Address" value="' + esc(cur.address) + '"><input id="tbZ" placeholder="Zip" inputmode="numeric" value="' + esc(cur.zip) + '">' +
      '<input id="tbS" placeholder="Spouse / other decision maker">' +
      '<div class="tm-row2"><input type="date" id="tbD" value="' + isoAdd(1) + '"><select id="tbT">' + timesHtml() + '</select></div>' +
      '<textarea id="tbN" rows="2" placeholder="What they said about the ' + esc(prod.toLowerCase()) + '"></textarea>' +
      '<button type="button" class="tm-go green" id="tbSave">✅ Book it — add to my leads</button></div>';
    document.getElementById("tbSave").onclick = function(){
      var d = document.getElementById("tbD").value, t = document.getElementById("tbT").value;
      if (!d){ alert("Pick the appointment date."); return; }
      var fn = document.getElementById("tbF").value.trim(), ln = document.getElementById("tbL").value.trim();
      var lead = { id: LG.uid(), first_name: fn, last_name: ln, homeowner_name: [fn, ln].filter(Boolean).join(" "),
        spouse: document.getElementById("tbS").value.trim(), address: document.getElementById("tbA").value.trim(), zip: document.getElementById("tbZ").value.trim(),
        phone: fmtPh(cur.phone), interests: [prod], appt_date: d, appt_time: t, notes: document.getElementById("tbN").value.trim(),
        source: "Telemarketing", created_at: Date.now(), status: "Appt Set", next_followup: "", log: [] };
      try{ var wd = new Date(d + "T12:00:00"); lead.appt_day = wd.toLocaleDateString("en-US", { weekday: "long" }); }catch(e){}
      LG.addLog(lead, "Booked by phone (telemarketing) — " + prod);
      LG.leads.push(lead); LG.save(); cur.lead_id = lead.id;
      if (LG.refresh) LG.refresh();
      record("booked", d + " " + t);
      toast("✅ Booked " + (lead.homeowner_name || "appointment") + " — " + t + ". It's in your leads.");
    };
    f.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function toast(msg){ var t = document.createElement("div"); t.className = "tm-toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 3500); }

  function wire(){
    body.querySelectorAll("[data-tm]").forEach(function(b){ b.onclick = function(){ mode = b.getAttribute("data-tm"); render(); }; });
    body.querySelectorAll("[data-prod]").forEach(function(b){ b.onclick = function(){ prod = b.getAttribute("data-prod"); render(); }; });
    body.querySelectorAll("[data-out]").forEach(function(b){ b.onclick = function(){
      var o = b.getAttribute("data-out");
      if (o === "cb") return formCb();
      if (o === "booked") return formBook();
      if (o === "dnc" && !confirm("Mark " + (cur.name || fmtPh(cur.phone)) + " as Do Not Call? They won't come up again.")) return;
      record(o);
    }; });
    var call = document.getElementById("tmCall");
    if (call) call.addEventListener("click", function(){
      timerT0 = Date.now(); clearInterval(timerInt);
      timerInt = setInterval(function(){ var s = Math.floor((Date.now() - timerT0) / 1000), el = document.getElementById("tmTimer"); if (el) el.textContent = "⏱ " + Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }, 1000);
    });
    var sk = document.getElementById("tmSkip");
    if (sk) sk.onclick = function(){ var i = list.indexOf(cur); if (i > -1){ list.splice(i, 1); list.push(cur); save(); } cur = null; render(); };
    body.querySelectorAll("[data-pick]").forEach(function(r){ r.onclick = function(){
      var c = list.filter(function(x){ return x.id === r.getAttribute("data-pick"); })[0]; if (!c) return;
      if (c.lead_id && LG.openDetail){ LG.openDetail(c.lead_id); return; }
      if (DNC_ST[c.status]) { alert((c.name || fmtPh(c.phone)) + ": " + OUT[c.status].t + (c.hist && c.hist[0] && c.hist[0].note ? " (" + c.hist[0].note + ")" : "")); return; }
      cur = c; mode = "dial"; render(); }; });
    var clr = document.getElementById("tmClear");
    if (clr) clr.onclick = function(){
      var n = list.filter(function(c){ return c.status === "booked" || c.status === "ni" || c.status === "wrong"; }).length;
      if (!n){ alert("Nothing finished to remove. Do-not-call numbers are always kept so they're never re-added."); return; }
      if (!confirm("Remove " + n + " finished numbers (booked, not interested, wrong number)? Do-not-call numbers stay blocked.")) return;
      list = list.filter(function(c){ return !(c.status === "booked" || c.status === "ni" || c.status === "wrong"); }); save(); render(); };
    var go = document.getElementById("tmAddGo");
    if (go) go.onclick = function(){ var r = addRows(parseRows(document.getElementById("tmPaste").value)); msg(r); };
    var fl = document.getElementById("tmFile");
    if (fl) fl.onchange = function(){ var f = fl.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function(){ msg(addRows(parseRows(rd.result))); }; rd.readAsText(f); };
    var one = document.getElementById("tmOne");
    if (one) one.onclick = function(){
      var r = { name: document.getElementById("tmN").value.trim(), phone: document.getElementById("tmP").value.trim(), address: document.getElementById("tmA").value.trim(), zip: document.getElementById("tmZ").value.trim() };
      if (digits(r.phone).length !== 10){ alert("Enter a 10-digit phone number."); return; }
      msg(addRows([r]));
    };
  }
  function msg(r){
    var m = document.getElementById("tmMsg") || {};
    toast(r.added ? "Added " + r.added + " number" + (r.added === 1 ? "" : "s") + (r.dup ? " (" + r.dup + " already on the list)" : "") : r.dup ? "Those numbers are already on your list." : "No 10-digit phone numbers found.");
    if (r.added){ mode = "dial"; render(); }
  }

  btn.addEventListener("click", function(){ mode = list.length ? "dial" : "add"; render(); LG.showView("view-tele"); });
  document.getElementById("backFromTeleBtn").addEventListener("click", function(){ clearInterval(timerInt); LG.showView("view-list"); if (LG.refresh) LG.refresh(); });

  var css = document.createElement("style");
  css.textContent =
    ".tm-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}.tm-stats div{background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 2px;text-align:center}" +
    ".tm-stats b{display:block;font-size:18px;color:var(--brand)}.tm-stats span{font-size:10.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase}" +
    ".tm-tabs{display:flex;gap:6px;margin-bottom:12px}.tm-tabs button{flex:1;padding:10px 4px;border-radius:10px;border:1px solid var(--border);background:#fff;font-weight:800;font-size:14px;color:var(--text)}.tm-tabs button.on{background:var(--brand);color:#fff;border-color:var(--brand)}" +
    ".tm-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px}.tm-empty{text-align:center}.tm-name{font-size:22px;font-weight:800}.tm-sub{color:var(--text-muted);font-size:14px;margin-top:2px}" +
    ".tm-flag{background:#fff4e0;color:#8a5a00;font-weight:800;border-radius:8px;padding:6px 10px;margin-bottom:8px;font-size:13px}" +
    ".tm-call{display:block;text-align:center;text-decoration:none;margin:12px 0 4px;padding:16px;border-radius:12px;background:#0b6b3a;color:#fff;font-weight:800;font-size:19px}.tm-call.off{background:#e9edf2;color:#6b7570;font-size:15px}" +
    ".tm-timer{text-align:center;font-weight:800;color:var(--text-muted);min-height:18px}.tm-lbl{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted);margin:12px 0 6px}" +
    ".tm-prod{display:flex;flex-wrap:wrap;gap:6px}.tm-prod button{padding:8px 12px;border-radius:999px;border:1px solid var(--border);background:#fff;font-weight:700;font-size:13px}.tm-prod button.on{background:var(--accent);color:#fff;border-color:var(--accent)}" +
    ".tm-script,.tm-rules{border:2px solid var(--accent);border-radius:12px;padding:0 12px;margin-top:12px;background:#fff}.tm-script summary,.tm-rules summary{padding:11px 0;font-weight:800;cursor:pointer}.tm-rules{border-color:var(--border)}.tm-rules li{margin:6px 0;font-size:14px}" +
    ".tm-s{border-top:1px solid var(--border);padding:9px 0}.tm-s b{font-size:13px}.tm-s p{margin:4px 0;font-size:15.5px;line-height:1.45}.tm-s i{display:block;font-size:12.5px;color:var(--text-muted)}.tm-obj summary{padding:9px 0;font-weight:800;font-size:14px;border-top:1px solid var(--border)}" +
    ".tm-out{display:grid;grid-template-columns:1fr 1fr;gap:6px}.tm-out button{padding:12px 6px;border-radius:10px;border:2px solid var(--c);background:#fff;color:var(--c);font-weight:800;font-size:14px}.tm-out button.big{grid-column:1/-1;background:var(--c);color:#fff;font-size:16px}" +
    ".tm-sub2{margin-top:10px;background:#f7f8f9;border-radius:12px;padding:10px}.tm-sub2 input,.tm-sub2 select,.tm-sub2 textarea,.tm-card>input,#tmPaste{width:100%;box-sizing:border-box;padding:11px;margin-bottom:6px;border:1px solid var(--border);border-radius:10px;font-size:16px;font-family:inherit}" +
    ".tm-row2{display:flex;gap:6px}.tm-quick{display:flex;gap:6px;margin-bottom:6px}.tm-quick button{flex:1;padding:9px 2px;border-radius:9px;border:1px solid var(--border);background:#fff;font-weight:700;font-size:12.5px}" +
    ".tm-go{display:block;width:100%;padding:13px;border:none;border-radius:10px;background:var(--brand);color:#fff;font-weight:800;font-size:15px;margin-top:4px}.tm-go.green{background:#0b6b3a}" +
    ".tm-skip{display:block;width:100%;margin-top:10px;padding:10px;border:none;background:none;color:var(--text-muted);font-weight:700}.tm-help{font-size:13px;color:var(--text-muted);margin:0 0 8px}" +
    ".tm-file{display:block;text-align:center;margin-top:8px;padding:12px;border-radius:10px;border:2px dashed var(--border);font-weight:800;color:var(--brand)}" +
    ".tm-sum{font-size:13px;font-weight:700;color:var(--text-muted);margin:0 2px 8px}.tm-row{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#fff;border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:6px}" +
    ".tm-row span{display:block;font-size:12.5px;color:var(--text-muted)}.tm-row em{font-style:normal;font-size:12px;font-weight:800;text-align:right;flex:none}.tm-clear{width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid var(--border);background:#fff;font-weight:700}" +
    ".tm-toast{position:fixed;left:16px;right:16px;bottom:calc(20px + env(safe-area-inset-bottom,0px));background:#152535;color:#fff;padding:13px 14px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.25)}";
  document.head.appendChild(css);
})();
