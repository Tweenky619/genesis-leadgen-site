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
  var DNC_ST = { dnc: 1, wrong: 1, booked: 1, ni: 1, reload: 1 };
  var OUT = {
    na:     { t: "No answer",      c: "#6b7570", contact: false },
    vm:     { t: "Left voicemail", c: "#6b7570", contact: false },
    cb:     { t: "Call back",      c: "#8a5a00", contact: true },
    ni:     { t: "Not interested", c: "#a8321f", contact: true },
    wrong:  { t: "Wrong number",   c: "#6a2fb0", contact: false },
    dnc:    { t: "Do not call",    c: "#2b2b2b", contact: true },
    booked: { t: "Appointment set",c: "#0b6b3a", contact: true },
    reload: { t: "\ud83d\udcb0 Sold before \u2014 Reload", c: "#b7791f", contact: true }
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
    var appts = tc.filter(function(x){ return x.o === "booked" || x.o === "reload"; }).length;
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
    var sl = srcLead(c), met = "";
    if (sl && lfirst(sl)) first = lfirst(sl);
    if (sl){ try{ var dd = new Date(+sl.created_at), ad = ageDays(sl);
      met = ad <= 6 ? "on " + dd.toLocaleDateString("en-US", { weekday: "long" }) : ad <= 30 ? "on " + dd.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "back in " + dd.toLocaleDateString("en-US", { month: "long" }) + (dd.getFullYear() !== new Date().getFullYear() ? " " + dd.getFullYear() : ""); }catch(e){} }
    var S = function(t, say, tip){ return '<div class="tm-s"><b>' + t + '</b><p>' + say + '</p>' + (tip ? '<i>' + tip + '</i>' : '') + '</div>'; };
    if (sl) return S("1 · Greet", "Hi, is this " + esc(first) + "? Hey " + esc(first) + ", it\u2019s " + esc(rep()) + " with " + esc(co()) + " \u2014 we met at your door" + (met ? " " + esc(met) : "") + ". How are you?",
             "They already know you \u2014 smile, keep it friendly. If they say \u201cdoing fine, and yourself?\u201d: \u201cDoing great \u2014 first time I heard that all day!\u201d") +
      S("2 · Why you're calling", "The reason I\u2019m calling \u2014 you mentioned your " + esc(prod.toLowerCase().replace("/", " and ")) + (sl.notes ? " (" + esc(String(sl.notes).slice(0, 80)) + ")" : "") + ", and my company, tomorrow is doing free inspections in your area. Have you noticed " + cue + " since we talked?",
             "Bring back what they told you at the door. Let them talk.") +
      S("3 · Close", "I\u2019d love to get you a free inspection so you know exactly where your " + esc(prod.toLowerCase().replace("/", " and ")) + " stands \u2014 no cost, no obligation. Would 10 in the morning work, or does 2 in the afternoon sound better for you?", "The goal of every call is the inspection. Two times, both yeses. No prices on the phone.") +
      S("4 · Lock it in", "Perfect. Still at " + esc(c.address || "[address]") + ", right? Will everyone on the title be home too, so they can see it firsthand?", "Then tap Appointment set \u2014 it updates this same lead.") +
      '<details class="tm-obj"><summary>Quick comebacks</summary>' +
      S("\u201cJust send me a quote.\u201d", "I wish I could \u2014 every house is different, so the free inspection is how we give you a real number. It\u2019s quick. Morning or afternoon better?") +
      S("\u201cI'm busy right now.\u201d", "No problem \u2014 when's a better time to call you back today?", "Tap Call back and set the time.") +
      S("\u201cNot interested anymore.\u201d", "Totally fair. Even if you\u2019re not ready, the free inspection tells you where things stand before it gets worse \u2014 no obligation. Would a quick look at 10 or 2 work?", "Always come back to the inspection. One try, then let it go politely.") +
      '</details>';
    return S("1 · Greet", "Hi, is this " + esc(first) + "? Hey " + esc(first) + ", my name is " + esc(rep()) + " with " + esc(co()) + " — how are you?",
             "Say your name and company up front. If they say “doing fine, and yourself?”: “Doing great — first time I heard that all day!”") +
      S("2 · Why you're calling", "The reason I'm calling — my company, tomorrow is doing free inspections in " + esc(c.city || "your neighborhood") + " on different services that we do. Have you noticed " + cue + "?",
             "Let them talk. Whatever they say about the house is your opening.") +
      S("3 · Close", "We'll be right in your area — I'd love to get you a free inspection, no cost, no obligation. Would 10 in the morning work, or does 2 in the afternoon sound better for you?",
             "Two times, both yeses. Don't quote prices on the phone — that's what the estimate is for.") +
      S("4 · Lock it in", "Perfect. I have you at " + esc(c.address || "[address]") + ", right? Will everyone on the title be home too, so they can see it firsthand? And this is the best number to confirm?",
             "Confirm address, all decision makers, best number. Then tap Appointment set.") +
      '<details class="tm-obj"><summary>Quick comebacks</summary>' +
      S("“Just send me a quote.”", "I wish I could — every house is different, so the free inspection is how we give you a real number. It's quick. Morning or afternoon better?") +
      S("“I'm busy right now.”", "No problem, I'll be quick — or when's a better time to call you back today?", "Tap Call back and set the time they give you.") +
      S("“Not interested.”", "Totally fair. Even if you're not ready, a free inspection tells you where things stand — no obligation. Would a quick look at 10 or 2 work?", "Always come back to the inspection. One try, then let it go politely.") +
      S("“How did you get my number?”", "We reach out to homeowners in your area. If you'd rather not get calls, I'll take you off our list right now.", "If they want off: tap Do not call. Never call again.") +
      '</details>';
  }

  // ---------- calls to my own leads: SoCal's Blowout, Reset Reconfirmation and Rehash scripts ----------
  var LQ = {
    blow:   { t: "\ud83d\udca8 Blowout", st: ["Blow Out","No Show","No Mr./Mrs.","Call to Cancel"], h: "Missed appointments \u2014 get them rescheduled" },
    reset:  { t: "\ud83d\udd01 Reset confirm", st: ["Rep Reset","Reset"], up: true, h: "Upcoming resets \u2014 confirm and make sure they let the rep in" },
    rehash: { t: "\u267b\ufe0f Rehash", st: ["Pitch & Miss"], h: "Demo, no sale \u2014 ratings, then send a manager" },
    conf:   { t: "\ud83d\udce4 To confirm", st: ["Appt Set","Rep Reset","Reset","Rolled","Confirm NA"], up: true, h: "Upcoming appointments \u2014 text them to your confirmer" }
  };
  function cfName(){ return getSet("tele_cf_name", "Jorge"); }
  function cfPhone(){ return digits(getSet("tele_cf_phone", "6197174342")); }
  function smsUrl(body){ return "sms:+1" + cfPhone() + "&body=" + encodeURIComponent(body); }
  function cfBody(ls){
    return "Hey " + cfName() + ", " + (ls.length > 1 ? ls.length + " leads to confirm" : "lead to confirm") + " \u2014 thank you!\n\n" +
      ls.map(function(l){ return LG.leadText ? LG.leadText(l) : [lname(l), l.phone, l.address, ldate(l)].join("\n"); }).join("\n\n\u2014\u2014\u2014\n\n");
  }
  function markSent(ls){ ls.forEach(function(l){ l.cf_sent = Date.now(); LG.addLog(l, "Sent to " + cfName() + " to confirm"); }); LG.save(); if (LG.refresh) LG.refresh(); }
  var lq = "blow", curLead = null, rate = {};
  function getSet(k, d){ try{ return localStorage.getItem(PRE + k) || d; }catch(e){ return d; } }
  function setSet(k, v){ try{ localStorage.setItem(PRE + k, v); }catch(e){} }
  function leadsFor(q){
    var t = todayISO();
    return LG.leads.filter(function(l){ var st = l.status || "New"; return LQ[q].st.indexOf(st) > -1 && (!LQ[q].up || !l.appt_date || l.appt_date >= t); })
      .sort(function(a, b){ return String(a.last_tele || 0).localeCompare(String(b.last_tele || 0)); });
  }
  function timeKey(t){ var m = String(t || "").match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return "99"; return ("0" + ((+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0))).slice(-2) + m[2]; }
  function lname(l){ return l.homeowner_name || [l.first_name, l.last_name].filter(Boolean).join(" ") || "Homeowner"; }
  function lfirst(l){ return l.first_name || lname(l).split(" ")[0]; }
  function lprod(l){ var i = (l.interests || []).filter(function(x){ return !/^Other/.test(x); })[0] || (l.interests || [])[0] || "roof"; return String(i).replace(/^Other:\s*/, "").replace("Paint/Stucco", "paint and stucco").toLowerCase(); }
  function ldate(l){ var d = l.appt_date ? new Date(l.appt_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "[DATE]"; return d + (l.appt_time ? " at " + l.appt_time : ""); }
  function leadScript(q, l){
    var me = esc(rep()), f = esc(lfirst(l)), p = esc(lprod(l)), con = esc(getSet("tele_contractor", "Tidal Remodeling")), rp = esc(getSet("tele_rep", "Ryan"));
    if (q === "blow"){
      var age = /roof/.test(p) && /^\d+/.test(String(l.roof_age || "")) ? " since you haven\u2019t got your roof done for the past " + esc(String(l.roof_age).match(/^\d+/)[0]) + " years" : "";
      return "Hi " + f + ", how\u2019s your day going? This is " + me + " calling from " + esc(co()) + ", finally getting back to you. We had an appointment with you on " + esc(ldate(l)) + " to give you a free estimate on the " + p + age +
        ". One of my guys came over and it seems like you had something come up and couldn\u2019t make the appointment. Are you still at " + esc(l.address || "[ADDRESS]") + "? <i>(Great.)</i> We\u2019re back in your area again, and based on the notes here about your " + p +
        ", I\u2019d like to get you rescheduled for a free inspection. I have available tomorrow 10am, 2pm, or 6pm \u2014 which works best for you?";
    }
    if (q === "reset"){
      return "Hi " + f + ", how\u2019s your day going? This is " + me + " calling from " + con + ". The reason for my call is I just wanna confirm we do have an appointment on " + esc(ldate(l)) + ". One of the guys that\u2019s coming over, his name is " + rp +
        ", please make sure to let him in and we\u2019re gonna go through the estimate. Once again, there\u2019s no need to pay for anything \u2014 the estimate is good for if and when you\u2019re ready. All we ask back is you think about us when you are ready. Fair enough?";
    }
    return "Hey " + f + ", how\u2019s your day going? This is " + me + ", finally got around to giving you a call back regarding your appointment with " + con + ". One of my guys, " + rp + ", came over to give you a free estimate on your " + p + ".<br><br>" +
      "Let me ask you, how would you rate " + rp + " on a scale of 1 to 5? <i>(Great, thank you.)</i><br><br>How was the product \u2014 can you rate the product please from 1 to 5? <i>(Great, so you can definitely see it on your home \u2014 thank you so much.)</i><br><br>" +
      "On a scale of 1 to 5, how would you rate the company? <i>(Excellent \u2014 someone you can see yourself doing business with? Beautiful, thank you so much.)</i><br><br>" +
      "So let me ask you this: pretty much you loved everything, it sounds to me like it came down to the investment \u2014 you wish the price was cheaper? Cause what I wanna do is send a manager over. You guys have been pre-approved for a free marketing home, so I wanna send a manager over to take a look at the project and give you a better price in writing. The only one that can do it is the manager, and it\u2019s not gonna take two hours anymore \u2014 it\u2019ll be very quick. What time works best for you: 10am, 2pm, or 6pm?";
  }
  function leadsHtml(){
    var h = '<div class="tm-prod" style="margin-bottom:10px">' + Object.keys(LQ).map(function(k){ return '<button data-lq="' + k + '"' + (k === lq ? ' class="on"' : '') + '>' + LQ[k].t + ' (' + leadsFor(k).length + ')</button>'; }).join("") + '</div>';
    if (curLead && LG.leads.indexOf(curLead) < 0) curLead = null;
    if (lq === "conf"){
      var cl = leadsFor("conf").sort(function(a, b){ return (a.appt_date + timeKey(a.appt_time)).localeCompare(b.appt_date + timeKey(b.appt_time)); });
      var unsent = cl.filter(function(l){ return !l.cf_sent; });
      return h + '<div class="tm-card"><div class="tm-lbl" style="margin-top:0">Confirmer</div><div class="tm-row2"><input id="cfN" value="' + esc(cfName()) + '" placeholder="Name"><input id="cfP" value="' + esc(fmtPh(cfPhone())) + '" placeholder="Phone" inputmode="tel"></div>' +
        (unsent.length ? '<a class="tm-call" id="cfAll" href="' + esc(smsUrl(cfBody(unsent))) + '">\ud83d\udcac Text ' + unsent.length + ' new to ' + esc(cfName()) + '</a>' : '<div class="tm-call off">Everything here was sent to ' + esc(cfName()) + ' \u2705</div>') +
        '<p class="tm-help">Opens Messages with every lead not sent yet. Tap a lead below to send just that one.</p></div>' +
        (cl.length ? cl.map(function(l){ return '<div class="tm-row" data-cf="' + esc(l.id) + '"><div><b>' + esc(lname(l)) + '</b><span>' + esc(ldate(l)) + ' \u00b7 ' + esc(l.status) + '</span></div><em style="color:' + (l.cf_sent ? '#0b6b3a' : '#1d4f8a') + '">' + (l.cf_sent ? 'Sent \u2713' : 'Text \u203a') + '</em></div>'; }).join("")
          : '<div class="tm-card tm-empty"><p>No upcoming appointments to confirm.</p></div>');
    }
    if (!curLead){
      var ls = leadsFor(lq);
      return h + '<div class="tm-sum">' + LQ[lq].h + '</div>' + (ls.length ? ls.map(function(l){
        return '<div class="tm-row" data-ld="' + esc(l.id) + '"><div><b>' + esc(lname(l)) + '</b><span>' + esc(l.phone || "No phone") + ' \u00b7 ' + esc(l.status) + (l.appt_date ? ' \u00b7 ' + esc(ldate(l)) : '') + '</span></div><em>' + (l.last_tele ? 'Called<br>' + new Date(l.last_tele).toLocaleDateString([], { month: "short", day: "numeric" }) : 'Call \u203a') + '</em></div>'; }).join("")
        : '<div class="tm-card tm-empty"><p>No leads here right now.</p></div>');
    }
    var l = curLead, d = digits(l.phone);
    return h + '<div class="tm-card"><button type="button" class="tm-skip" style="text-align:left;margin:0 0 6px;padding:0" id="tlBack">\u2190 ' + LQ[lq].t + ' list</button>' +
      '<div class="tm-name">' + esc(lname(l)) + '</div><div class="tm-sub">' + esc(l.address || "") + '</div>' + mapsHtml(l.address, l.zip, l.lat, l.lng) + notesHtml(l) + '<div class="tm-sub">' + esc(l.status) + (l.appt_date ? ' \u00b7 ' + esc(ldate(l)) : '') + '</div>' +
      (d.length === 10 && inHours() ? '<a class="tm-call" id="tmCall" href="tel:+1' + d + '">\ud83d\udcde Call ' + esc(fmtPh(d)) + '</a>' : d.length !== 10 ? '<div class="tm-call off">No phone number on this lead</div>' : '<div class="tm-call off">\ud83c\udf19 Outside calling hours (8 AM \u2013 9 PM)</div>') +
      '<div class="tm-timer" id="tmTimer"></div>' +
      (lq !== "blow" ? '<div class="tm-row2"><input id="tlCon" placeholder="Contractor" value="' + esc(getSet("tele_contractor", "Tidal Remodeling")) + '"><input id="tlRep" placeholder="Rep who went out" value="' + esc(getSet("tele_rep", "Ryan")) + '"></div>' : '') +
      '<details class="tm-script" open><summary>\ud83d\udcdd ' + LQ[lq].t.replace(/^\S+\s/, "") + ' script</summary><div class="tm-s"><p>' + leadScript(lq, l) + '</p></div></details>' +
      (lq === "rehash" ? '<div class="tm-lbl">Ratings (1\u20135)</div>' + ["Rep","Product","Company"].map(function(k){ return '<div class="tm-rate"><span>' + k + '</span>' + [1,2,3,4,5].map(function(n){ return '<button data-rate="' + k + '" data-n="' + n + '"' + (rate[k] === n ? ' class="on"' : '') + '>' + n + '</button>'; }).join("") + '</div>'; }).join("") : '') +
      '<div class="tm-lbl">Outcome</div><div class="tm-out">' +
        (lq === "reset" ? '<button data-lo="conf" style="--c:#0b6b3a" class="big">Confirmed \u2014 fair enough</button>' : '<button data-lo="resched" style="--c:#0b6b3a" class="big">Rescheduled</button>') +
        '<button data-lo="na" style="--c:#6b7570">No answer</button><button data-lo="vm" style="--c:#6b7570">Left voicemail</button>' +
        (lq === "reset" ? '<button data-lo="resched" style="--c:#8a5a00">Moved the time</button>' : '<button data-lo="cb" style="--c:#8a5a00">Call back</button>') +
        '<button data-lo="ni" style="--c:#a8321f">Not interested</button>' +
      '</div><div id="tlForm"></div><button type="button" class="tm-skip" id="tlOpen">Open full lead \u2192</button></div>' + rules();
  }
  function leadOutcome(o){
    var l = curLead, tag = { blow: "Blowout call", reset: "Reset reconfirm call", rehash: "Rehash call" }[lq];
    var rt = lq === "rehash" && (rate.Rep || rate.Product || rate.Company) ? " \u2014 ratings: rep " + (rate.Rep || "-") + ", product " + (rate.Product || "-") + ", company " + (rate.Company || "-") : "";
    function done(text){ l.last_tele = Date.now(); LG.addLog(l, tag + ": " + text + rt); LG.save(); calls.push({ ts: Date.now(), o: o === "resched" || o === "conf" ? "booked" : o === "ni" ? "ni" : o === "cb" ? "cb" : "na", id: l.id }); save(); rate = {}; curLead = null; if (LG.refresh) LG.refresh(); render(); toast("\u2705 " + lname(l) + " \u2014 " + text); }
    var f = document.getElementById("tlForm");
    if (o === "resched"){
      f.innerHTML = '<div class="tm-sub2"><div class="tm-lbl">New appointment</div><div class="tm-row2"><input type="date" id="tlD" value="' + isoAdd(1) + '"><select id="tlT">' + timesHtml().replace(" selected", "") + '</select></div>' +
        '<div class="tm-quick"><button data-qt="10:00 AM">10 AM</button><button data-qt="2:00 PM">2 PM</button><button data-qt="6:00 PM">6 PM</button></div><button type="button" class="tm-go green" id="tlSave">Save new time</button></div>';
      f.querySelectorAll("[data-qt]").forEach(function(b){ b.onclick = function(){ document.getElementById("tlT").value = b.getAttribute("data-qt"); }; });
      document.getElementById("tlSave").onclick = function(){
        var d = document.getElementById("tlD").value, t = document.getElementById("tlT").value; if (!d){ alert("Pick the date."); return; }
        l.appt_date = d; l.appt_time = t; l.status = "Appt Set"; l.next_followup = "";
        try{ l.appt_day = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }); }catch(e){}
        lastBook = { id: l.id, label: "Rescheduled" }; done("rescheduled for " + ldate(l) + (lq === "rehash" ? " (manager visit)" : ""));
      };
      return f.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    if (o === "cb"){
      f.innerHTML = '<div class="tm-sub2"><div class="tm-lbl">Call back on</div><input type="date" id="tlCb" value="' + isoAdd(1) + '"><button type="button" class="tm-go" id="tlCbS">Save callback</button></div>';
      document.getElementById("tlCbS").onclick = function(){ var d = document.getElementById("tlCb").value; l.next_followup = d; done("call back " + d); };
      return f.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    if (o === "conf"){ l.status = "Confirmed"; return done("confirmed for " + ldate(l)); }
    if (o === "ni"){ if (!confirm("Mark " + lname(l) + " Not Interested?")) return; l.status = "Not Interested"; return done("Not Interested"); }
    done(o === "vm" ? "left voicemail" : "no answer");
  }

  // ---------- booking form (monday.com) after every phone booking ----------
  var BOOK_FORM = "https://wkf.ms/3mOAl1A", lastBook = null;
  function bookedPanel(){
    if (!lastBook) return "";
    var l = LG.leads.filter(function(x){ return x.id === lastBook.id; })[0]; if (!l){ lastBook = null; return ""; }
    return '<div class="tm-bk"><b>\u2705 ' + esc(lastBook.label) + ' \u2014 ' + esc(lname(l)) + '</b><span>' + esc(ldate(l)) + '</span>' +
      '<a class="tm-call" id="bkForm" href="' + BOOK_FORM + '" target="_blank" rel="noopener">\ud83d\udcf2 Submit on booking form</a>' +
      '<p class="tm-help">Tapping copies the lead details so you can paste them into the form.</p><button type="button" class="tm-skip" id="bkDone">Done \u2014 next call \u2192</button></div>';
  }

  // ---------- render ----------
  var mode = "dial", cur = null, prod = null, timerT0 = 0, timerInt = null;
  function header(){
    var s = todayStats(), k = counts();
    return '<div class="tm-stats"><div><b>' + s.dials + '</b><span>Dials</span></div><div><b>' + s.contacts + '</b><span>Contacts</span></div><div><b>' + s.appts + '</b><span>Appts</span></div><div><b>' + s.cr + '%</b><span>Contact</span></div><div><b>' + s.br + '%</b><span>Booking</span></div></div>' +
      '<div class="tm-tabs"><button data-tm="dial"' + (mode === "dial" ? ' class="on"' : '') + '>📞 Dial</button><button data-tm="list"' + (mode === "list" ? ' class="on"' : '') + '>📋 List (' + k.all + ')</button><button data-tm="leads"' + (mode === "leads" ? ' class="on"' : '') + '>\ud83d\udd01 Leads</button><button data-tm="add"' + (mode === "add" ? ' class="on"' : '') + '>➕ Add</button></div>';
  }
  function render(){
    clearInterval(timerInt);
    var h = header() + bookedPanel();
    if (mode === "add") h += addHtml();
    else if (mode === "list") h += listHtml();
    else if (mode === "leads") h += leadsHtml();
    else h += dialHtml();
    body.innerHTML = h;
    wire();
  }
  function dialHtml(){
    if (!list.length) return '<div class="tm-card tm-empty"><b>No numbers yet.</b><p>Tap <b>➕ Add</b> to paste or import your call list.</p></div>' + rules();
    cur = cur && !DNC_ST[cur.status] && list.indexOf(cur) > -1 ? cur : nextUp();
    if (!cur){ var k = counts(); return '<div class="tm-card tm-empty"><b>List done for now 🎉</b><p>' + k.cb + ' callbacks scheduled · ' + k.retry + ' no-answers waiting to retry (2 hours apart).</p></div>' + rules(); }
    var ps = products(), slp = srcLead(cur), lp = slp && (slp.interests || []).filter(function(x){ return ps.indexOf(x) > -1; })[0];
    prod = prod && ps.indexOf(prod) > -1 ? prod : (cur.prod || lp || ps[0]);
    var hours = inHours();
    return '<div class="tm-card">' +
      (cur.status === "cb" ? '<div class="tm-flag">⏰ Callback' + (cur.cb_note ? ' — ' + esc(cur.cb_note) : '') + '</div>' : '') +
      '<div class="tm-name">' + esc(cur.name || "Homeowner") + '</div>' +
      '<div class="tm-sub">' + esc([cur.address, cur.city, cur.zip].filter(Boolean).join(", ") || "No address") + '</div>' +
      (function(){ var sl = srcLead(cur); return mapsHtml(cur.address, [cur.city, cur.zip].filter(Boolean).join(" "), sl && sl.lat, sl && sl.lng) + notesHtml(sl); })() +
      (srcLead(cur) ? '<div class="tm-sub">Met at the door ' + ageDays(srcLead(cur)) + ' days ago</div>' : '') +
      '<div class="tm-sub">Tries: ' + (cur.tries || 0) + (cur.notes ? ' · ' + esc(cur.notes) : '') + '</div>' +
      (hours ? '<a class="tm-call" id="tmCall" href="tel:+1' + digits(cur.phone) + '">📞 Call ' + esc(fmtPh(cur.phone)) + '</a>'
             : '<div class="tm-call off">🌙 Outside calling hours (8 AM – 9 PM)</div>') +
      '<div class="tm-timer" id="tmTimer"></div>' +
      '<div class="tm-lbl">Pitch</div><div class="tm-prod">' + ps.map(function(p){ return '<button data-prod="' + esc(p) + '"' + (p === prod ? ' class="on"' : '') + '>' + esc(p) + '</button>'; }).join("") + '</div>' +
      (cur.camp ? '<div class="tm-flag" style="background:#e9edf2;color:#152535">\ud83d\udccb ' + esc(cur.camp) + '</div>' : '') +
      (cur.q && srcLead(cur) ? '<details class="tm-script" open><summary>\ud83d\udcdd ' + (cur.q === "blow" ? "Blowout" : "Rehash") + ' script</summary><div class="tm-s"><p>' + leadScript(cur.q, srcLead(cur)) + '</p></div></details>'
        : '<details class="tm-script" open><summary>\ud83d\udcdd Phone script</summary>' + scriptHtml(cur, prod) + '</details>') +
      vmHtml(cur) +
      '<div class="tm-lbl">Outcome</div><div class="tm-out">' +
        ["na","vm","cb","ni","wrong","dnc","reload","booked"].map(function(o){ return '<button data-out="' + o + '" style="--c:' + OUT[o].c + '"' + (o === "booked" ? ' class="big"' : '') + '>' + OUT[o].t + '</button>'; }).join("") +
      '</div><div id="tmForm"></div>' +
      '<button type="button" class="tm-skip" id="tmSkip">Skip for now →</button></div>' + rules();
  }
  function rules(){
    return '<details class="tm-rules"><summary>⚖️ Calling rules</summary><ul>' +
      '<li>Call only <b>8 AM – 9 PM</b> the homeowner’s time.</li>' +
      '<li>Say your name and company at the start of every call.</li>' +
      '<li>Your own door leads gave you their number \u2014 you can call them back. Purchased or cold lists must be scrubbed against the National Do Not Call Registry first.</li>' +
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
  var CAMP = [
    ["fresh", "\ud83c\udd95 New / never booked", function(st){ return ["New","Contacted","No Answer","Bad Number"].indexOf(st) > -1; }, null],
    ["reset", "\ud83d\udca8 Reset (No Demo)", function(st){ return ["Blow Out","No Show","No Mr./Mrs.","Call to Cancel"].indexOf(st) > -1; }, "blow"],
    ["rehash", "\u267b\ufe0f Rehash (Demo, No Sale)", function(st){ return st === "Pitch & Miss"; }, "rehash"],
    ["dead", "\ud83d\udc80 Not interested (re-knock by phone)", function(st){ return st === "Not Interested"; }, null],
    ["cancel", "\ud83d\udeab Cancelled", function(st){ return st === "Cancelled"; }, null]
  ];
  // Campaigns by lead age (days since you met them at the door); skips Sold, Not Interested and upcoming appointments
  var AGE = [
    ["a7",   "\ud83d\udd25 This week (0\u20137 days)", 0, 7],
    ["a30",  "\ud83d\udcc5 1\u20134 weeks old (8\u201330 days)", 8, 30],
    ["a90",  "\ud83d\uddd3\ufe0f 1\u20133 months old", 31, 90],
    ["a180", "\ud83d\udd70\ufe0f 3\u20136 months old", 91, 180],
    ["aold", "\ud83d\udce6 6+ months old", 181, 99999]
  ];
  function ageDays(l){ return Math.floor((Date.now() - (+l.created_at || Date.now())) / 864e5); }
  function ageOk(l){ var st = l.status || "New", t = todayISO(); return st !== "Sold" && st !== "Not Interested" && !(l.appt_date && l.appt_date >= t && ["Appt Set","Confirmed","Sent to Monday","Rep Reset","Reset","Rolled","Confirm NA"].indexOf(st) > -1); }
  function campLeads(k){
    var a = AGE.filter(function(x){ return x[0] === k; })[0];
    if (a) return LG.leads.filter(function(l){ var d = ageDays(l); return d >= a[2] && d <= a[3] && ageOk(l) && digits(l.phone).length === 10; })
      .sort(function(x, y){ return (+y.created_at || 0) - (+x.created_at || 0); });
    var c = CAMP.filter(function(x){ return x[0] === k; })[0]; return LG.leads.filter(function(l){ return c[2](l.status || "New") && digits(l.phone).length === 10; }); }
  function addCamp(k){
    var c = CAMP.filter(function(x){ return x[0] === k; })[0] || AGE.filter(function(x){ return x[0] === k; }).map(function(a){ return [a[0], a[1], null, null]; })[0], have = {}; list.forEach(function(x){ have[digits(x.phone)] = x; });
    var added = 0, dup = 0;
    campLeads(k).forEach(function(l){
      var d = digits(l.phone);
      if (have[d]){ dup++; return; }
      var it = { id: "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: lname(l), phone: d, address: l.address || "", zip: l.zip || "", city: "",
        notes: [l.status, (l.interests || []).join(", ")].filter(Boolean).join(" \u00b7 "), tries: 0, hist: [], src: l.id, q: c[3], camp: c[1].replace(/^\S+\s/, "") };
      list.push(it); have[d] = it; added++;
    });
    save(); return { added: added, dup: dup };
  }
  function addHtml(){
    var btn = function(c){ var n = campLeads(c[0]).length; return '<button type="button" class="tm-campb" data-camp="' + c[0] + '"' + (n ? '' : ' disabled') + '>' + c[1] + ' <b>' + n + '</b></button>'; };
    return '<div class="tm-card"><div class="tm-lbl" style="margin-top:0">Campaigns by lead age</div><p class="tm-help">Your door leads, by how long ago you met them (newest first). Skips Sold, Not Interested and upcoming appointments. Booking one updates that same lead.</p>' +
      AGE.map(btn).join("") + '</div>' +
      '<div class="tm-card"><div class="tm-lbl" style="margin-top:0">Campaigns by status</div>' +
      CAMP.map(function(c){ var n = campLeads(c[0]).length; return '<button type="button" class="tm-campb" data-camp="' + c[0] + '"' + (n ? '' : ' disabled') + '>' + c[1] + ' <b>' + n + '</b></button>'; }).join("") + '</div>' +
      '<div class="tm-card"><div class="tm-lbl">Paste your call list</div>' +
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
    var sl = srcLead(c); if (sl && o !== "booked" && o !== "reload"){ LG.addLog(sl, "Phone call (" + (c.camp || "telemarketing") + "): " + OUT[o].t + (extra ? " \u2014 " + extra : "")); if (o === "dnc"){ sl.status = "Not Interested"; LG.addLog(sl, "Do Not Call \u2014 asked not to be called"); } LG.save(); }
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
  function srcLead(c){ return c && c.src ? LG.leads.filter(function(l){ return l.id === c.src; })[0] : null; }
  // Voicemail: under 30 seconds, name + company twice, one reason, the free inspection, number twice
  function vmHtml(c){
    var sl = srcLead(c), f = esc(sl ? lfirst(sl) : ((c.name || "").split(" ")[0] || "there")), me = esc(rep()), num = esc(fmtPh(getSet("tele_vm_phone", "6198796874")));
    var p = esc(String(prod || "roof").toLowerCase().replace("/", " and ")), say;
    if (c.q === "blow") say = "Hi " + f + ", it\u2019s " + me + " with " + esc(co()) + ". We had you down for a free estimate on your " + p + " and looks like something came up \u2014 no worries at all. We\u2019re back in your area tomorrow and I saved you a spot for a free inspection.";
    else if (c.q === "rehash") say = "Hi " + f + ", it\u2019s " + me + " with " + esc(co()) + ". Quick follow-up on the estimate for your " + p + " \u2014 I have some good news on the price I want to share with you.";
    else if (sl) say = "Hi " + f + ", it\u2019s " + me + " with " + esc(co()) + " \u2014 we met at your door about your " + p + ". We\u2019re doing free inspections in your area tomorrow and I saved you a spot \u2014 no cost, no obligation.";
    else say = "Hi " + f + ", this is " + me + " with " + esc(co()) + ". We\u2019re doing free inspections in your neighborhood tomorrow on " + p + ", and I\u2019d love to save you a spot \u2014 no cost, no obligation.";
    return '<details class="tm-script" style="border-color:var(--border)"><summary>\ud83c\udf99\ufe0f Voicemail script</summary><div class="tm-s"><p>' + say +
      " If you\u2019re interested, call me back or just send me a text at " + num + " and I\u2019ll get you on the schedule. Again, it\u2019s " + me + ", " + num + ". Talk soon!</p><i>Under 30 seconds. Smile while you talk. Then tap Left voicemail.</i></div>" +
      '<div class="tm-row2" style="padding-bottom:10px"><input id="vmP" value="' + num + '" placeholder="Callback number" inputmode="tel"></div></details>';
  }
  // Sold before -> book a Reload (next project for an existing customer) and send it to the confirmer
  // See the house: Apple Maps (satellite) or Google Maps (Street View when we have the pin)
  function mapsHtml(addr, zip, lat, lng){
    var a = [addr, zip].filter(Boolean).join(", "); if (!a && !(lat && lng)) return "";
    var q = a ? a + (/\bCA\b/i.test(a) ? "" : ", CA") : lat + "," + lng;
    var apple = "https://maps.apple.com/?q=" + encodeURIComponent(q) + (lat && lng ? "&ll=" + lat + "," + lng : "&address=" + encodeURIComponent(q)) + "&t=k";
    var goo = lat && lng ? "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + lat + "," + lng : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    return '<div class="tm-maps"><a href="' + esc(apple) + '" target="_blank" rel="noopener">\ud83d\uddfa\ufe0f Apple Maps</a><a href="' + esc(goo) + '" target="_blank" rel="noopener">\ud83c\udf0e Google Maps' + (lat && lng ? ' \u00b7 Street View' : '') + '</a></div>';
  }
  // Notes you took at the door when the lead was generated
  function notesHtml(l){
    if (!l) return "";
    var F = [["spouse","Spouse / DM"],["years_owned","Years owned"],["roof_age","Roof age"],["roof_layers","Roof layers"],["roof_leaks","Leaks"],["leak_location","Leak location"],
      ["solar_panels","Solar"],["last_painted","Last painted"],["paint_colors","Colors"],["cracks","Cracks"],["wear_tear","Wear & tear"],["fascia","Fascia/wood"],
      ["window_count","Windows"],["sliding_doors","Sliding doors"],["french_doors","French doors"]];
    var rows = F.filter(function(f){ var v = l[f[0]]; return v && v !== "No" && String(v).trim(); }).map(function(f){ return '<div><b>' + f[1] + ':</b> ' + esc(l[f[0]]) + '</div>'; });
    var pn = l.project_notes && typeof l.project_notes === "object" ? Object.keys(l.project_notes).filter(function(k){ return l.project_notes[k]; }).map(function(k){ return '<div><b>' + esc(k) + ':</b> ' + esc(l.project_notes[k]) + '</div>'; }) : [];
    var others = (l.others || []).filter(function(o){ return o.name; }).map(function(o){ return '<div><b>' + esc(o.rel) + ':</b> ' + esc(o.name) + '</div>'; });
    var notes = l.notes ? '<p>' + esc(l.notes).replace(/\n/g, "<br>") + '</p>' : "";
    var prods = (l.interests || []).length ? '<div><b>Interested in:</b> ' + esc(l.interests.join(", ")) + '</div>' : "";
    var body = notes + prods + pn.join("") + rows.join("") + others.join("");
    if (!body) return '<div class="tm-notes empty">\ud83d\udcdd No door notes on this lead.</div>';
    var d = ""; try{ d = new Date(+l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }catch(e){}
    return '<div class="tm-notes"><div class="tm-lbl" style="margin:0 0 6px">\ud83d\udcdd Door notes' + (d ? ' \u00b7 ' + d : '') + '</div>' + body + '</div>';
  }
  function formReload(){
    var f = document.getElementById("tmForm"), sl = srcLead(cur), ps = products();
    var had = sl && (sl.interests || []).filter(function(x){ return ps.indexOf(x) > -1; })[0];
    var opt = function(sel){ return ps.map(function(p){ return '<option' + (p === sel ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join(""); };
    var nm = sl ? lname(sl) : (cur.name || "");
    f.innerHTML = '<div class="tm-sub2" style="border:2px solid #b7791f"><div class="tm-lbl" style="color:#b7791f">\ud83d\udcb0 Reload \u2014 existing customer</div>' +
      '<p class="tm-help">\u201cHow\u2019s the ' + esc((had || "project").toLowerCase()) + ' treating you? \u2026 Since you\u2019re already a customer, I\u2019d love to get you a free inspection on your ___ while we\u2019re in the area. 10 or 2?\u201d</p>' +
      '<div class="tm-lbl">They bought</div><select id="rlSold">' + opt(had || ps[0]) + '</select>' +
      '<div class="tm-lbl">Reload project</div><select id="rlNew">' + opt(ps.filter(function(p){ return p !== (had || ps[0]); })[0] || ps[0]) + '</select>' +
      (sl ? '' : '<input id="rlName" placeholder="Name" value="' + esc(nm) + '"><input id="rlAddr" placeholder="Address" value="' + esc(cur.address) + '">') +
      '<div class="tm-lbl">Appointment</div><div class="tm-row2"><input type="date" id="rlD" value="' + isoAdd(1) + '"><select id="rlT">' + timesHtml() + '</select></div>' +
      '<div class="tm-quick"><button data-rq="10:00 AM">10 AM</button><button data-rq="2:00 PM">2 PM</button><button data-rq="6:00 PM">6 PM</button></div>' +
      '<textarea id="rlN" rows="2" placeholder="Notes (what they want done)"></textarea>' +
      '<button type="button" class="tm-go" style="background:#b7791f" id="rlSave">\ud83d\udcb0 Book reload & send to ' + esc(cfName()) + '</button></div>';
    f.querySelectorAll("[data-rq]").forEach(function(b){ b.onclick = function(){ document.getElementById("rlT").value = b.getAttribute("data-rq"); }; });
    document.getElementById("rlSave").onclick = function(){
      var d = document.getElementById("rlD").value, t = document.getElementById("rlT").value, sold = document.getElementById("rlSold").value, nw = document.getElementById("rlNew").value;
      if (!d){ alert("Pick the appointment date."); return; }
      var nt = document.getElementById("rlN").value.trim(), l = sl;
      if (!l){
        var parts = (document.getElementById("rlName").value.trim() || "").split(" ");
        l = { id: LG.uid(), first_name: parts[0] || "", last_name: parts.slice(1).join(" "), homeowner_name: parts.join(" "), phone: fmtPh(cur.phone),
          address: document.getElementById("rlAddr").value.trim(), zip: cur.zip || "", created_at: Date.now(), log: [], source: "Telemarketing" };
        LG.leads.push(l);
      }
      l.sold_before = sold; l.reload = true; l.interests = [nw];
      l.appt_date = d; l.appt_time = t; l.status = "Appt Set"; l.next_followup = "";
      try{ l.appt_day = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }); }catch(e){}
      l.notes = "RELOAD \u2014 sold " + sold + " before" + (nt ? ". " + nt : "") + (l.notes ? "\n" + l.notes : "");
      LG.addLog(l, "Reload booked by phone \u2014 " + nw + " (sold " + sold + " before) \u2014 " + d + " " + t);
      l.cf_sent = Date.now(); LG.addLog(l, "Sent to " + cfName() + " to confirm (reload)");
      LG.save(); cur.lead_id = l.id; if (LG.refresh) LG.refresh();
      var body = "Hey " + cfName() + ", RELOAD to confirm \u2014 sold " + sold + " before, now " + nw + ". Thank you!\n\n" + (LG.leadText ? LG.leadText(l) : lname(l));
      lastBook = { id: l.id, label: "Reload booked" }; record("reload", nw + " " + d + " " + t);
      toast("\ud83d\udcb0 Reload booked \u2014 " + t + ". Opening Messages to " + cfName() + "\u2026");
      setTimeout(function(){ location.href = smsUrl(body); }, 400);
    };
    f.scrollIntoView({ block: "center", behavior: "smooth" });
  }
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
      var src = srcLead(cur);
      if (src){
        src.appt_date = d; src.appt_time = t; src.status = "Appt Set"; src.next_followup = "";
        try{ src.appt_day = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }); }catch(e){}
        var nt = document.getElementById("tbN").value.trim(); if (nt) src.notes = (src.notes ? src.notes + "\n" : "") + nt;
        LG.addLog(src, "Booked by phone (" + (cur.camp || "telemarketing") + ") \u2014 " + d + " " + t); LG.save(); cur.lead_id = src.id;
        if (LG.refresh) LG.refresh(); lastBook = { id: src.id, label: "Booked" }; record("booked", d + " " + t);
        toast("\u2705 Booked " + lname(src) + " \u2014 " + t + ". Lead updated."); return;
      }
      var lead = { id: LG.uid(), first_name: fn, last_name: ln, homeowner_name: [fn, ln].filter(Boolean).join(" "),
        spouse: document.getElementById("tbS").value.trim(), address: document.getElementById("tbA").value.trim(), zip: document.getElementById("tbZ").value.trim(),
        phone: fmtPh(cur.phone), interests: [prod], appt_date: d, appt_time: t, notes: document.getElementById("tbN").value.trim(),
        source: "Telemarketing", created_at: Date.now(), status: "Appt Set", next_followup: "", log: [] };
      try{ var wd = new Date(d + "T12:00:00"); lead.appt_day = wd.toLocaleDateString("en-US", { weekday: "long" }); }catch(e){}
      LG.addLog(lead, "Booked by phone (telemarketing) — " + prod);
      LG.leads.push(lead); LG.save(); cur.lead_id = lead.id;
      if (LG.refresh) LG.refresh();
      lastBook = { id: lead.id, label: "Booked" }; record("booked", d + " " + t);
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
      if (o === "reload") return formReload();
      if (o === "dnc" && !confirm("Mark " + (cur.name || fmtPh(cur.phone)) + " as Do Not Call? They won't come up again.")) return;
      record(o);
    }; });
    body.querySelectorAll("[data-lq]").forEach(function(b){ b.onclick = function(){ lq = b.getAttribute("data-lq"); curLead = null; rate = {}; render(); }; });
    body.querySelectorAll("[data-ld]").forEach(function(r){ r.onclick = function(){ curLead = LG.leads.filter(function(x){ return x.id === r.getAttribute("data-ld"); })[0] || null; rate = {}; render(); window.scrollTo(0, 0); }; });
    body.querySelectorAll("[data-lo]").forEach(function(b){ b.onclick = function(){ leadOutcome(b.getAttribute("data-lo")); }; });
    body.querySelectorAll("[data-rate]").forEach(function(b){ b.onclick = function(){ rate[b.getAttribute("data-rate")] = +b.getAttribute("data-n"); render(); }; });
    var ca = document.getElementById("cfAll");
    if (ca) ca.addEventListener("click", function(){ markSent(leadsFor("conf").filter(function(l){ return !l.cf_sent; })); setTimeout(render, 600); });
    body.querySelectorAll("[data-cf]").forEach(function(r){ r.onclick = function(){
      var l = LG.leads.filter(function(x){ return x.id === r.getAttribute("data-cf"); })[0]; if (!l) return;
      if (l.cf_sent && !confirm(lname(l) + " was already sent to " + cfName() + ". Send again?")) return;
      markSent([l]); location.href = smsUrl(cfBody([l])); setTimeout(render, 600); }; });
    var bf = document.getElementById("bkForm");
    if (bf) bf.addEventListener("click", function(){
      var l = LG.leads.filter(function(x){ return lastBook && x.id === lastBook.id; })[0]; if (!l) return;
      var txt = (LG.leadText ? LG.leadText(l) : lname(l)) + (lastBook.label === "Reload booked" ? "\nRELOAD" : "") + "\nSet by phone (telemarketing)";
      try{ navigator.clipboard && navigator.clipboard.writeText(txt).catch(function(){}); }catch(e){}
      LG.addLog(l, "Booking form opened (details copied)"); LG.save();
      toast("\ud83d\udccb Lead details copied \u2014 paste them into the form.");
    });
    var bd = document.getElementById("bkDone"); if (bd) bd.onclick = function(){ lastBook = null; render(); };
    var vp = document.getElementById("vmP");
    if (vp) vp.onchange = function(){ if (digits(vp.value).length !== 10){ alert("Enter a 10-digit number."); return; } setSet("tele_vm_phone", digits(vp.value)); render(); };
    var cn = document.getElementById("cfN"), cp = document.getElementById("cfP");
    if (cn) cn.onchange = function(){ setSet("tele_cf_name", cn.value.trim() || "Jorge"); render(); };
    if (cp) cp.onchange = function(){ if (digits(cp.value).length !== 10){ alert("Enter a 10-digit number."); return; } setSet("tele_cf_phone", digits(cp.value)); render(); };
    var tb = document.getElementById("tlBack"); if (tb) tb.onclick = function(){ curLead = null; render(); };
    var to = document.getElementById("tlOpen"); if (to) to.onclick = function(){ if (curLead && LG.openDetail) LG.openDetail(curLead.id); };
    ["tlCon","tlRep"].forEach(function(id){ var el = document.getElementById(id); if (el) el.onchange = function(){ setSet(id === "tlCon" ? "tele_contractor" : "tele_rep", el.value.trim()); render(); }; });
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
    body.querySelectorAll("[data-camp]").forEach(function(b){ b.onclick = function(){ msg(addCamp(b.getAttribute("data-camp"))); }; });
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

  // First campaigns, ready to go: Reset (No Demo) first, then Rehash, then New / never booked
  function autoCampaigns(){
    if (getSet("tele_auto_v2", "")) return;
    list = list.filter(function(c){ return !(c.src && !c.status && !(c.tries > 0)); });   // drop not-yet-called status campaign items
    var tot = 0; AGE.forEach(function(a){ tot += addCamp(a[0]).added; });
    setSet("tele_auto_v2", "1");
    if (tot) toast("\ud83d\udcde " + tot + " of your leads loaded by age \u2014 newest first. Start dialing!");
  }
  btn.addEventListener("click", function(){ autoCampaigns(); mode = list.length ? "dial" : "add"; render(); LG.showView("view-tele"); });
  document.getElementById("backFromTeleBtn").addEventListener("click", function(){ clearInterval(timerInt); LG.showView("view-list"); if (LG.refresh) LG.refresh(); });

  var css = document.createElement("style");
  css.textContent =
    ".tm-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}.tm-stats div{background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 2px;text-align:center}" +
    ".tm-stats b{display:block;font-size:18px;color:var(--brand)}.tm-stats span{font-size:10.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase}" +
    ".tm-tabs{display:flex;gap:6px;margin-bottom:12px}.tm-tabs button{flex:1;padding:10px 2px;white-space:nowrap;border-radius:10px;border:1px solid var(--border);background:#fff;font-weight:800;font-size:14px;color:var(--text)}.tm-tabs button.on{background:var(--brand);color:#fff;border-color:var(--brand)}" +
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
    ".tm-rate{display:flex;align-items:center;gap:5px;margin-bottom:6px}.tm-rate span{width:70px;font-weight:700;font-size:13px}.tm-rate button{flex:1;padding:8px 0;border-radius:8px;border:1px solid var(--border);background:#fff;font-weight:800}.tm-rate button.on{background:var(--brand);color:#fff}" +
    ".tm-row2 input{flex:1;min-width:0}.tm-card .tm-row2 input{padding:10px;border:1px solid var(--border);border-radius:10px;font-size:15px;margin-bottom:6px}" +
    ".tm-campb{display:flex;justify-content:space-between;width:100%;padding:12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--border);background:#fff;font-weight:700;font-size:14.5px;text-align:left}.tm-campb:disabled{opacity:.45}.tm-campb b{color:var(--brand)}" +
    ".tm-sub2 select{width:100%;padding:11px;margin-bottom:6px;border:1px solid var(--border);border-radius:10px;font-size:16px;background:#fff}" +
    ".tm-row2>*{flex:1 1 0!important;width:auto!important;min-width:0}" +
    ".tm-maps{display:flex;gap:6px;margin:8px 0 2px}.tm-maps a{flex:1;text-align:center;text-decoration:none;padding:9px 4px;border-radius:10px;border:1px solid var(--border);background:#f7f8f9;color:var(--text);font-weight:800;font-size:13.5px}" +
    ".tm-notes{background:#fffbea;border:1px solid #f1e2a8;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:14.5px;line-height:1.45}.tm-notes p{margin:0 0 6px}.tm-notes b{font-weight:800}.tm-notes.empty{background:#f7f8f9;border-color:var(--border);color:var(--text-muted);font-size:13px}" +
    ".tm-bk{background:#eef7f1;border:2px solid #0b6b3a;border-radius:14px;padding:12px;margin-bottom:12px}.tm-bk b{display:block;font-size:16px;color:#0b6b3a}.tm-bk span{font-size:13.5px;color:var(--text-muted)}.tm-bk .tm-call{background:#6d28d9;margin-top:10px}" +
    ".tm-toast{position:fixed;left:16px;right:16px;bottom:calc(20px + env(safe-area-inset-bottom,0px));background:#152535;color:#fff;padding:13px 14px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.25)}";
  document.head.appendChild(css);
})();
