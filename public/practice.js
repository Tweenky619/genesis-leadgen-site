/* Pitch 1 practice mode — SoCal Contractor Exchange lead app */
(function(){
  "use strict";
  var A = window.App;
  if(!A) return;

  // ---------- Built-in slick illustrations (original drawings) ----------
  var SLICK_SVG = {
    Roof:
      '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="180" fill="#cfe0ee"/>' +
      '<polygon points="0,180 0,60 320,20 320,180" fill="#5b5b5b"/>' +
      (function(){ var s=""; for(var r=0;r<6;r++){ for(var c=0;c<9;c++){ var x=c*38+(r%2?19:0)-10, y=55+r*22-r*3; s+='<rect x="'+x+'" y="'+y+'" width="36" height="20" rx="2" fill="'+((r+c)%3?"#6a6a6a":"#626262")+'" stroke="#4a4a4a"/>'; } } return s; })() +
      '<g><rect x="132" y="96" width="70" height="40" fill="#d9d2b8"/>' +
      (function(){ var s=""; for(var i=0;i<9;i++){ s+='<line x1="'+(134+i*8)+'" y1="98" x2="'+(134+i*8)+'" y2="134" stroke="#b9ae86" stroke-width="1"/>'; } for(var j=0;j<5;j++){ s+='<line x1="134" y1="'+(100+j*8)+'" x2="200" y2="'+(100+j*8)+'" stroke="#b9ae86" stroke-width="1"/>'; } return s; })() +
      '<circle cx="167" cy="116" r="44" fill="none" stroke="#e8423a" stroke-width="4"/></g>' +
      '<rect x="8" y="148" width="190" height="24" rx="6" fill="#152535"/><text x="18" y="165" font-family="Arial" font-size="13" font-weight="700" fill="#fff">Exposed fiberglass mesh</text></svg>',
    "Paint/Stucco":
      '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="180" fill="#e7dcc8"/>' +
      (function(){ var s=""; for(var i=0;i<140;i++){ var x=(i*53)%320, y=(i*37)%180; s+='<circle cx="'+x+'" cy="'+y+'" r="1.3" fill="#d2c4a8"/>'; } return s; })() +
      '<rect x="200" y="30" width="80" height="70" fill="#9fc3dc" stroke="#fff" stroke-width="6"/>' +
      '<path d="M200 100 L182 118 L188 128 L166 150 L172 160 L150 180" fill="none" stroke="#5a4a36" stroke-width="2.5"/>' +
      '<path d="M182 118 L162 120 L150 132" fill="none" stroke="#5a4a36" stroke-width="1.8"/>' +
      '<path d="M40 40 L62 58 L58 72 L80 92" fill="none" stroke="#5a4a36" stroke-width="2"/>' +
      '<circle cx="174" cy="132" r="40" fill="none" stroke="#e8423a" stroke-width="4"/>' +
      '<rect x="8" y="148" width="132" height="24" rx="6" fill="#152535"/><text x="18" y="165" font-family="Arial" font-size="13" font-weight="700" fill="#fff">Stucco cracks</text></svg>',
    "Fascia/Trim Boards":
      '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="180" fill="#cfe0ee"/>' +
      '<polygon points="0,20 320,20 320,70 0,70" fill="#5b5b5b"/>' +
      '<rect x="0" y="70" width="320" height="34" fill="#f2efe8" stroke="#cfc8b8"/>' +
      '<rect x="0" y="104" width="320" height="76" fill="#e7dcc8"/>' +
      '<path d="M170 70 Q190 76 215 72 L240 104 L160 104 Z" fill="#7a5a3a"/>' +
      '<path d="M175 80 q8 6 18 2 M182 92 q10 4 22 0 M200 84 q6 6 14 4" stroke="#4e3824" stroke-width="2" fill="none"/>' +
      '<path d="M120 76 l12 -4 l4 10 l-14 2 z M250 78 l10 -5 l6 9 l-12 3z" fill="#fff" stroke="#cfc8b8"/>' +
      '<circle cx="200" cy="88" r="40" fill="none" stroke="#e8423a" stroke-width="4"/>' +
      '<rect x="8" y="148" width="176" height="24" rx="6" fill="#152535"/><text x="18" y="165" font-family="Arial" font-size="13" font-weight="700" fill="#fff">Peeling paint &amp; wood rot</text></svg>',
    Windows:
      '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="180" fill="#e7dcc8"/>' +
      '<rect x="70" y="20" width="180" height="130" fill="#fff" stroke="#bbb" stroke-width="2"/>' +
      '<rect x="82" y="32" width="74" height="106" fill="#9fc3dc"/><rect x="164" y="32" width="74" height="106" fill="#9fc3dc"/>' +
      '<ellipse cx="200" cy="96" rx="34" ry="30" fill="#ffffff" opacity=".65"/>' +
      (function(){ var s=""; for(var i=0;i<14;i++){ s+='<circle cx="'+(176+(i*13)%50)+'" cy="'+(74+(i*17)%46)+'" r="'+(1.5+(i%3))+'" fill="#e8f2f8"/>'; } return s; })() +
      '<circle cx="200" cy="96" r="44" fill="none" stroke="#e8423a" stroke-width="4"/>' +
      '<rect x="8" y="148" width="214" height="24" rx="6" fill="#152535"/><text x="18" y="165" font-family="Arial" font-size="13" font-weight="700" fill="#fff">Fogging between the panes</text></svg>'
  };

  // ---------- Pitch 1 scripts (problem only — no product details) ----------
  var CLOSE = {
    type: "close", label: "Close",
    say: "Here's what I'll do for you — I'll put you on my priority list. My inspector will come out, take measurements and pictures, and leave you an exact price in writing for whenever you're ready. Is morning or afternoon better — 10 or 2?",
    tip: "Alternative choice: two easy yeses. Then go straight into the close script (spouse, set the stage, confirmation)."
  };
  var PITCHES = {
    Roof: [
      { type: "open", label: "Opener", say: "Hi! I'm Art with SoCal — beautiful home! The reason I stopped by, I noticed some wear on your roof. Quick question — how long have you owned the home?",
        replies: ["About 12 years.", "We bought it in 2008.", "Going on 15 years.", "Since 2010."],
        follow: "Yeah, I figured — around that age is usually when the roof starts showing it.", tip: "Compliment, reason, specific concern, easy question." },
      { type: "q", label: "Question 1", say: "Have you noticed the fiberglass showing on the shingles — right there?", cue: "Point to the worn, shiny spots.", slick: true,
        slickImg: "slicks/roof-dead-shingles.jpg", slickCap: "Exposed fiberglass = dead shingles",
        replies: ["No, I never really look up there.", "I think I've seen that.", "Is that bad?", "What am I looking at?"],
        follow: "Exposed fiberglass means dead shingles. The granules are what protect the asphalt from the sun \u2014 once they wash off, the shingle dries out, cracks, and lets moisture in, which can lead to dry rot, termites, and toxic mold.", tip: "Walk them through the layers on the slick: granules, asphalt, fiberglass." },
      { type: "q", label: "Question 2", say: "Have you noticed the missing shingles \u2014 right there?", cue: "Point to the bare spots.", slick: true,
        slickImg: "slicks/roof-missing-shingles.jpg", slickCap: "Missing shingles",
        replies: ["No, I can't see the roof from here.", "Oh wow, I didn't know that.", "Is that from the wind?", "How bad is that?"],
        follow: "Did you know missing shingles allow moisture in, which can lead to dry rot, termites, and toxic mold?", tip: "SoCal formula: point out damage + consequence of damage." },
      { type: "q", label: "Question 3", say: "Have you noticed the ridge caps up top \u2014 see how they're cracked and lifting?", cue: "Point to the peak of the roof.", slick: true,
        slickImg: "slicks/roof-ridge-caps.jpg", slickCap: "Blown out ridge caps",
        replies: ["I never look up there.", "Yeah, I see it now.", "What's a ridge cap?", "Is that serious?"],
        follow: "The ridge caps seal the very top of your roof. Once they blow out, water runs straight down into the attic.", tip: "Show the slick so they know what to look for on their own roof." },
      { type: "q", label: "Question 4", say: "When's the last time you popped your head in the attic \u2014 any water stains on the ceilings?", slick: true,
        slickImg: ["slicks/roof-leaks-attic.jpg", "slicks/wood-replacement.jpg"], slickCap: ["Roof leaks and attic damage", "The cost of waiting: wood replacement"],
        replies: ["Never been up there.", "There's a spot in the hallway.", "Not that I've noticed.", "A while back."],
        follow: "That's how it starts \u2014 a stain on the ceiling, then wet insulation and rotted decking. And the cost of waiting is the wood: once the decking rots, it's not just shingles anymore \u2014 the wood underneath has to be replaced too.", tip: "Two slicks: the damage, then the cost of waiting. That's your urgency." },
      { type: "q", label: "Question 5", say: "Have you noticed those dark streaks on the roof?", cue: "Point to the darker patches.", slick: true,
        slickImg: "slicks/roof-mold.jpg", slickCap: "Toxic mold",
        replies: ["I thought that was just dirt.", "It's been getting darker.", "Is that mold?", "No."],
        follow: "That's mold growing on the shingles. It holds moisture right against the roof and breaks it down faster.", tip: "Mold is a risk to point out \u2014 never a diagnosis of anyone in the house." },
      CLOSE
    ],
    "Paint/Stucco": [
      { type: "open", label: "Opener", say: "Hi! I'm Art with SoCal — beautiful home! The reason I stopped by, I noticed some cracking in the stucco. Quick question — how long have you owned the home?",
        replies: ["Almost 15 years.", "Since 2012.", "About 10 years.", "We bought it in 2009."],
        follow: "Okay, so that's about right — that's usually when stucco starts letting go.", tip: "Point toward the wall as you say \"cracking\"." },
      { type: "q", label: "Question 1", say: "Have you noticed this damage getting worse?", cue: "Point to the chipping and peeling.",
        replies: ["Yeah, it's spreading.", "It's been like that a while.", "I haven't really paid attention.", "Is it bad?"],
        follow: "Did you know chipping and peeling allows moisture in, which can lead to dry rot, termites, and toxic mold?", tip: "SoCal script: point out damage + consequence of damage." },
      { type: "q", label: "Question 2", say: "Have you seen this damage anywhere else on the home?", cue: "Point to the white, powdery stains near the bottom of the wall.", slick: true,
        slickImg: "slicks/stucco-efflorescence.jpg", slickCap: "Efflorescence aka stucco cancer",
        replies: ["There's some on the back side.", "By the garage, I think.", "I don't know.", "What's that white stuff?"],
        follow: "This efflorescence is your stucco going back to its original form. Sand, water, and glue \u2014 and what's happening is the alkaline in the soil is attacking the glue in the stucco. That's why they call it stucco cancer.", tip: "Know this line cold \u2014 it's what makes you sound like the expert." },
      { type: "q", label: "Question 3", say: "Have you noticed these cracks \u2014 see how this one runs sideways near the bottom, and this one runs straight up?", cue: "Point to a horizontal crack, then a vertical one.", slick: true,
        slickImg: "slicks/house-framing.jpg", slickCap: "House framing \u2014 fundamentals of exterior inspection",
        replies: ["I thought cracks were normal.", "Those have been there forever.", "Why would they go different ways?", "Is that structural?"],
        follow: "Behind the stucco is the framing. A sideways crack down low is where the stucco meets the foundation \u2014 the sill plate. A crack going straight up is where a stud swelled with moisture against the stucco. Either way, it's moisture getting to the wood.", tip: "Use the slick numbers: 1 sill plate, 2 stud, 3 fireblock, 4 foundation." },
      { type: "q", label: "Question 4", say: "Have you noticed any water stains on the other side of this wall?",
        replies: ["No, I don't think so.", "There's a spot in the bedroom.", "Never looked.", "Maybe by the window."],
        follow: "That's the moisture we're talking about \u2014 once it's behind the stucco, that's where the dry rot, termites, and mold start.", tip: "Tie it back to education #1 \u2014 same consequence, now inside their home." },
      { type: "q", label: "Question 5", say: "Does anyone in the home have any respiratory issues?",
        tip: "Ask it and let their answer do the work \u2014 never diagnose anything." },
      { type: "q", label: "Question 6", say: "If you were to paint the exterior, would you change the color?",
        tip: "Future-pacing: they picture the finished house. Then go straight to the close." },
      CLOSE
    ],
    "Fascia/Trim Boards": [
      { type: "open", label: "Opener", say: "Hi! I'm Art with SoCal — beautiful home! The reason I stopped by, I noticed some damage on the trim up by the roofline. Quick question — how long have you owned the home?",
        replies: ["About 10 years.", "Since 2014.", "Almost 20 years.", "It was my parents' house — 30 years."],
        follow: "Gotcha — that's usually when the wood starts going.", tip: "Look up and point — get their eyes on the roofline." },
      { type: "q", label: "Question 1", say: "Have you noticed the paint peeling on the fascia boards up there?", cue: "Point to the peeling section at the roofline.", slick: true,
        slickImg: "slicks/house-framing.jpg", slickCap: "#5 Rafters/eaves \u2014 wood rot, termites, peeling paint, mold",
        replies: ["Yeah, it's been like that.", "I never look up there.", "Is that a big deal?", "No."],
        follow: "Did you know peeling paint allows moisture into the wood, which can lead to dry rot, termites, and toxic mold? The rafters and eaves are where it shows up first.", tip: "Point to #5 on the framing slick \u2014 rafters/eaves." },
      { type: "q", label: "Question 2", say: "See how it's darker and kind of soft-looking at that corner?", cue: "Point to the corner or joint.", slick: true,
        slickImg: "slicks/wood-replacement.jpg", slickCap: "The cost of waiting: wood replacement",
        replies: ["Oh yeah, I see it.", "That's just dirt, right?", "Hmm.", "What does that mean?"],
        follow: "That's moisture in the wood. If it waits, the rot spreads \u2014 and then it's not a paint job anymore, it's replacing the wood. That's the cost of waiting.", tip: "Cost of waiting = urgency without pressure." },
      { type: "q", label: "Question 3", say: "Have you noticed any birds, bees or rodents getting in up there?",
        replies: ["We had a bee nest last summer.", "I hear something in the attic sometimes.", "No.", "Birds, yeah."],
        follow: "Gaps in rotted trim are exactly how pests get into the attic \u2014 and termites love wet wood.", tip: "Pests make it personal \u2014 everyone hates that idea." },
      CLOSE
    ],
    Windows: [
      { type: "open", label: "Opener", say: "Hi! I'm Art with SoCal — beautiful home! The reason I stopped by, I noticed your windows look like they might be original. Quick question — how long have you owned the home?",
        replies: ["Since the 90s.", "About 20 years.", "Going on 25 years.", "Since 2001."],
        follow: "Makes sense — a lot of homes around here still have their original windows.", tip: "Point at the window frame." },
      { type: "q", label: "Question 1", say: "Do you ever notice fog or condensation between the panes?", cue: "Point to the cloudy window.", slick: true,
        slickImg: "slicks/windows-9-signs.jpg", slickCap: "9 signs it's time to explore window replacement",
        replies: ["Yeah, that one's always cloudy.", "In the mornings sometimes.", "Never paid attention.", "No."],
        follow: "Foggy glass means the seal's gone \u2014 that's one of the signs it's time to look at replacement. That's where the outside air and moisture get in.", tip: "Run down the 9 signs on the slick \u2014 let them count how many they have." },
      { type: "q", label: "Question 2", say: "Does this side of the house get hot in the afternoon \u2014 or drafty at night?", slick: true,
        slickImg: "slicks/windows-7-reasons.jpg", slickCap: "Most common reasons to replace your windows",
        replies: ["The bedroom's an oven in summer.", "We run the AC all day.", "It's drafty in winter.", "Not really."],
        follow: "That's drafts and energy loss \u2014 the window working against your AC. That's money going out the glass every month, and it's the number one reason people replace their windows.", tip: "Energy savings and comfort \u2014 #1 and #3 on the slick." },
      { type: "q", label: "Question 3", say: "Are any of them hard to open or close \u2014 or do the locks stick?",
        replies: ["The kitchen one won't stay up.", "A couple are tough.", "We never open them.", "No."],
        follow: "That's the frames wearing out. Hard to open and broken locks are both on the list \u2014 and it's a security thing too.", tip: "Security is #2 on the reasons slick." },
      { type: "q", label: "Question 4", say: "Have you noticed any water stains or soft spots around the frames?",
        replies: ["There's a stain under that one.", "The sill's a little soft.", "Haven't looked.", "No."],
        follow: "That's water getting past the window and into the wall \u2014 leaks and frame damage are two of the 9 signs. Same story: moisture, then rot.", tip: "Tie windows back to moisture \u2014 the same consequence as every core product." },
      CLOSE
    ]
  };
  var PRODUCTS = ["Roof", "Paint/Stucco", "Fascia/Trim Boards", "Windows"];

  var REBUTTALS = [
    { obj: "Not interested.", steps: [
      ["Agree & empathize", "I completely get it — nobody's looking for a project today."],
      ["Open question", "Out of curiosity, what would it take for you to want someone to look at it?"],
      ["Features & benefits", "That's exactly why the inspection is free — pictures, measurements, and an exact price in writing. No pressure."],
      ["Tie down", "Doesn't hurt to know where you stand, right?"],
      ["Close", "Is 10 or 2 better?"] ] },
    { obj: "We don't have the money right now.", steps: [
      ["Agree & empathize", "I hear you — honestly, most people I talk to say the same thing."],
      ["Open question", "If the price made sense, what would you want taken care of first?"],
      ["Features & benefits", "That's why the inspection's free — you'll have an exact number in writing so you can plan for it."],
      ["Tie down", "Better to know now than get surprised later, fair enough?"],
      ["Close", "Morning or afternoon?"] ] },
    { obj: "I need to talk to my spouse.", steps: [
      ["Agree & empathize", "Absolutely — you two should decide together."],
      ["Open question", "What do you think they'd want to know most?"],
      ["Features & benefits", "That's why we set it for when you're both home — he'll walk you both through it, with the price in writing."],
      ["Tie down", "That way nobody's guessing, makes sense?"],
      ["Close", "When are you both home — 10 or 2?"] ] },
    { obj: "We just had it done.", steps: [
      ["Agree & empathize", "That's great — sounds like you take care of your home."],
      ["Open question", "How long ago was that done?"],
      ["Features & benefits", "A second opinion is free — you'll have a written price to compare."],
      ["Tie down", "Never hurts to compare, right?"],
      ["Close", "10 or 2?"] ] },
    { obj: "We already have a guy.", steps: [
      ["Agree & empathize", "That's smart — it's good to have someone you trust."],
      ["Open question", "When's the last time he came out and looked at it?"],
      ["Features & benefits", "We interview and vet hundreds of local contractors so you don't have to \u2014 only 27% get approved into our network, with a 98% customer satisfaction rating. It's a free second opinion, with a written price to compare."],
      ["Tie down", "Can't hurt to have options, right?"],
      ["Close", "Is morning or afternoon better?"] ] },
    { obj: "We're going to get a few quotes first.", steps: [
      ["Agree & empathize", "That's smart \u2014 you should never go with the first guy."],
      ["Open question", "How do you usually decide who to trust?"],
      ["Features & benefits", "That's exactly what we do for you \u2014 we interview and vet hundreds of local contractors, and only 27% make it into our network. 98% customer satisfaction."],
      ["Tie down", "Saves you the hours of interviewing, right?"],
      ["Close", "Morning or afternoon?"] ] },
    { obj: "Just leave a card.", steps: [
      ["Agree & empathize", "Happy to — here you go."],
      ["Open question", "What would make you actually call that number?"],
      ["Features & benefits", "Honestly, it's easier if my inspector just swings by — 20 minutes, pictures, and a price in writing you can keep."],
      ["Tie down", "Saves you a phone call, fair?"],
      ["Close", "10 or 2?"] ] },
    { obj: "We're thinking of selling.", steps: [
      ["Agree & empathize", "Congrats — that's exciting."],
      ["Open question", "What do you think a buyer's inspector is going to say about the roof?"],
      ["Features & benefits", "Knowing the exact number now lets you decide — fix it, or price it in. Either way you're not surprised."],
      ["Tie down", "Better to know before they do, right?"],
      ["Close", "Morning or afternoon?"] ] }
  ];

  // ---------- State ----------
  var LOG_KEY = "socal_practice_log";
  var st = { product: "Roof", mode: "learn", run: null, rb: null };
  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
  function logGet(){ try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]") || []; } catch(e){ return []; } }
  function logAdd(rec){ var l = logGet(); l.push(rec); try { localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(-500))); } catch(e){} }
  function weekStart(){ var d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
  function repsThisWeek(product){ var w = weekStart(); return logGet().filter(function(r){ return r.ts >= w && (!product || r.product === product); }).length; }

  var root = document.getElementById("practiceBody");
  var esc = A.esc;

  function header(){
    var chips = PRODUCTS.concat(["Mix", "Rebuttals", "Progress"]).map(function(p){
      var lbl = p === "Mix" ? "🎲 Mix" : p === "Rebuttals" ? "🛡️ Rebuttals" : p === "Progress" ? "📈 How it advances" : p;
      return '<button type="button" class="tab' + (st.product === p ? " active" : "") + '" data-pp="' + esc(p) + '">' + esc(lbl) + '</button>';
    }).join("");
    var modes = (st.product === "Rebuttals" || st.product === "Progress") ? "" :
      '<div class="pr-modes"><button type="button" class="' + (st.mode === "learn" ? "on" : "") + '" data-pm="learn">📖 Learn</button><button type="button" class="' + (st.mode === "drill" ? "on" : "") + '" data-pm="drill">🎯 Drill</button></div>';
    return '<div class="tabs pr-tabs">' + chips + '</div>' + modes;
  }

  function slickBox(product, step){
    var imgs = step && step.slickImg ? [].concat(step.slickImg) : [];
    var caps = step && step.slickCap ? [].concat(step.slickCap) : [];
    var visual = imgs.length
      ? imgs.map(function(src, i){ return '<img src="' + esc(src) + '" alt="' + esc(caps[i] || "Slick") + '"><div class="pr-slick-cap">' + esc(caps[i] || "") + '</div>'; }).join("")
      : SLICK_SVG[product];
    return '<div class="pr-slick" data-slick="' + esc(product) + '"><div class="pr-slick-img">' + visual + '</div>' +
      '<div class="photo-grid pr-slick-own" id="prSlickOwn"></div>' +
      '<label class="pr-slick-add"><input type="file" accept="image/*" multiple hidden data-slick-add="' + esc(product) + '">➕ Add my own slick photo</label></div>';
  }
  function fillOwnSlicks(product){
    if(document.getElementById("prSlickOwn") && A.renderPhotos){ A.renderPhotos("slick:" + product, "prSlickOwn"); }
  }


  // Practice only the Question -> Education phase (no opener / close)
  function runSteps(product){ return PITCHES[product].filter(function(x){ return x.type === "q"; }); }
  function startRun(){
    var product = st.product === "Mix" ? pick(PRODUCTS) : st.product;
    st.run = { product: product, i: 0, phase: "say", revealed: st.mode === "learn", score: 0, total: 0, reply: null, scored: {} };
    render();
  }

  function stepCard(){
    var r = st.run, steps = runSteps(r.product), s = steps[r.i];
    var hidden = !r.revealed;
    var lineTxt = r.phase === "say" ? s.say : s.follow;
    var who = r.phase === "say" ? "You ask" : "You educate";
    var progress = steps.map(function(_, k){ return '<i class="' + (k < r.i ? "done" : k === r.i ? "now" : "") + '"></i>'; }).join("");
    var html = '<div class="pr-card">' +
      '<div class="pr-top"><span class="pr-prod">' + esc(r.product) + '</span><span class="pr-dots">' + progress + '</span></div>' +
      '<div class="pr-step">' + esc(s.label) + (r.phase === "follow" ? " · Education" : "") + '</div>';
    if(r.phase === "follow" && r.reply){
      html += '<div class="pr-ho"><b>🏠 Homeowner:</b> “' + esc(r.reply) + '”</div>';
    }
    if(s.cue && r.phase === "say"){ html += '<div class="pr-cue">👉 ' + esc(s.cue) + '</div>'; }
    if(s.slick && r.phase === "say"){ html += slickBox(r.product, s); }
    html += '<div class="pr-who">' + who + '</div>';
    if(hidden){
      html += '<div class="pr-line pr-hidden">Say it out loud first…</div>' +
        '<button type="button" class="pr-btn" data-pa="reveal">👁 Reveal</button>';
    } else {
      html += '<div class="pr-line">“' + esc(lineTxt) + '”</div>';
      if(st.mode === "drill" && !r.scored[r.i + r.phase]){
        html += '<div class="pr-score"><span>How did you do?</span><button type="button" class="ok" data-pa="hit">✅ Nailed it</button><button type="button" class="no" data-pa="miss">❌ Missed it</button></div>';
      } else {
        html += '<button type="button" class="pr-btn" data-pa="next">' + (s.type === "close" && r.phase === "say" ? "Finish" : "Next →") + '</button>';
      }
      if(s.tip && (r.phase === "follow" || !s.follow)){ html += '<div class="pr-tip">💡 ' + esc(s.tip) + '</div>'; }
    }
    html += '</div>';
    return html;
  }

  function summaryCard(){
    var r = st.run;
    var line = st.mode === "drill" ? '<div class="pr-big">' + r.score + ' / ' + r.total + '</div><div class="pr-sub">lines nailed</div>' : '<div class="pr-big">✔</div><div class="pr-sub">Run-through complete</div>';
    return '<div class="pr-card pr-done"><div class="pr-step">' + esc(r.product) + ' — done</div>' + line +
      '<div class="pr-sub">' + repsThisWeek(r.product) + ' ' + esc(r.product) + ' reps this week · ' + repsThisWeek() + ' total</div>' +
      '<button type="button" class="pr-btn" data-pa="again">🔁 Run it again</button>' +
      (st.mode === "learn" ? '<button type="button" class="pr-btn alt" data-pa="todrill">🎯 Now drill it</button>' : '') +
      '</div>';
  }

  function rebuttalCard(){
    if(!st.rb){ st.rb = { item: pick(REBUTTALS), shown: 0, done: 0 }; }
    var rb = st.rb;
    var html = '<div class="pr-card"><div class="pr-step">Rebuttal drill · 5 steps</div>' +
      '<div class="pr-ho pr-obj"><b>🏠 Homeowner:</b> “' + esc(rb.item.obj) + '”</div>';
    rb.item.steps.forEach(function(s, k){
      var open = k < rb.shown;
      html += '<div class="pr-rb' + (open ? " open" : "") + '"><span>' + (k + 1) + '. ' + esc(s[0]) + '</span>' + (open ? '<p>“' + esc(s[1]) + '”</p>' : '') + '</div>';
    });
    if(rb.shown < 5){ html += '<button type="button" class="pr-btn" data-pa="rbnext">Say step ' + (rb.shown + 1) + ', then reveal</button>'; }
    else { html += '<button type="button" class="pr-btn" data-pa="rbnew">🎲 Next objection</button>'; }
    html += '<div class="pr-sub" style="margin-top:10px">' + rb.done + ' objections handled this session</div></div>';
    return html;
  }


  // ---------- Damage progression diagrams (original) ----------
  var PROGRESS = [
    { product: "Roof", icon: "🏠", say: "It starts with the granules washing off — and if it waits, it turns into rotted wood and mold in the attic.",
      stages: [
        ["Granule loss", "Shingles look worn and shiny. The sun starts baking the asphalt.", "$"],
        ["Exposed fiberglass", "Shingles crack, curl, and blow off. Water gets underneath.", "$$"],
        ["Attic leaks", "Wet insulation, stained ceilings, the decking starts to rot.", "$$$"],
        ["Rot & mold", "Decking and framing have to be replaced. Mold, termites, interior repairs.", "$$$$"] ],
      fix: "Inspect and fix at stage 1–2 — it's a roofing job. Wait until stage 4 and it's a wood-replacement job." },
    { product: "Paint/Stucco", icon: "🧱", say: "It starts with a little chipping — and if it waits, it's the wood behind the stucco that rots.",
      stages: [
        ["Chalky paint & hairline cracks", "The paint stops sealing. The wall drinks water every rain and sprinkler cycle.", "$"],
        ["Chipping, peeling & efflorescence", "\"Stucco cancer\" — the alkaline in the soil attacks the glue in the stucco.", "$$"],
        ["Water behind the stucco", "Studs swell, the sill plate gets wet, cracks spread sideways and straight up.", "$$$"],
        ["Dry rot, termites & mold", "Stucco comes off to repair the framing. Interior stains and damage.", "$$$$"] ],
      fix: "Seal and repair early — it's a paint and stucco job. Wait and it becomes a framing job." },
    { product: "Fascia/Trim Boards", icon: "🪵", say: "It starts with peeling paint on the trim — and if it waits, the rot moves into the roof edge.",
      stages: [
        ["Peeling paint", "The wood is unprotected and soaks up water and dew.", "$"],
        ["Dark, soft spots", "Moisture in the wood — rot starts at corners and joints.", "$$"],
        ["Gaps & pests", "Bees, birds, rodents, and termites get in through the rotted trim.", "$$$"],
        ["Rot reaches the roof edge", "Rafter tails and the roof edge need repair. Gutters pull away.", "$$$$"] ],
      fix: "Replace the bad boards and seal early — before the rot reaches the rafters." },
    { product: "Windows", icon: "🪟", say: "It starts with a foggy window — and if it waits, the water gets into the wall.",
      stages: [
        ["Foggy glass", "The seal has failed. Outside air and moisture get between the panes.", "$"],
        ["Drafts & energy loss", "Rooms run hot or cold. The AC works harder — money out the glass every month.", "$$"],
        ["Hard to open, broken locks", "Frames wear out — comfort and security both suffer.", "$$$"],
        ["Leaks & frame damage", "Water gets past the window into the wall — rot, stained drywall, mold.", "$$$$"] ],
      fix: "Inspect early and see the options with an exact price — before it's a wall repair too." }
  ];
  function progressCards(){
    var colors = ["#e8b400", "#e07a00", "#d04a2a", "#8f1d12"];
    return '<p class="pr-sub" style="margin:0 0 10px">Show how the damage advances — and that catching it early is the cheap fix.</p>' +
      PROGRESS.map(function(g){
        var rows = g.stages.map(function(sg, i){
          return '<div class="pg-stage"><div class="pg-dot" style="background:' + colors[i] + '">' + (i + 1) + '</div>' +
            '<div class="pg-body"><div class="pg-top"><b>' + esc(sg[0]) + '</b><span class="pg-cost" style="color:' + colors[i] + '">' + sg[2] + '</span></div>' +
            '<div class="pg-txt">' + esc(sg[1]) + '</div></div></div>';
        }).join('<div class="pg-arrow">↓</div>');
        return '<div class="pr-card pg-card"><div class="pg-title">' + g.icon + ' ' + esc(g.product) + '</div>' +
          '<div class="pg-meter"><span>Catch it early</span><i></i><span>Cost of waiting</span></div>' +
          rows +
          '<div class="pg-fix"><b>✅ The fix</b>' + esc(g.fix) + '</div>' +
          '<div class="pg-say"><b>Say it like this:</b> “' + esc(g.say) + '”</div></div>';
      }).join("");
  }

  function startCard(){
    var p = st.product === "Mix" ? "a random core product" : st.product;
    return '<div class="pr-card pr-start"><div class="pr-step">Question → Education · ' + esc(p) + '</div>' +
      '<p class="pr-sub">3 Question → Education loops. You ask, the homeowner answers, you educate.</p>' +
      '<p class="pr-sub">' + (st.mode === "learn" ? "📖 <b>Learn</b> shows every line." : "🎯 <b>Drill</b> hides each line — say it out loud, reveal, then score yourself.") + '</p>' +
      '<button type="button" class="pr-btn" data-pa="start">▶ Start</button>' +
      '<div class="pr-sub" style="margin-top:10px">' + repsThisWeek() + ' practice reps this week</div></div>';
  }

  function render(){
    var body;
    if(st.product === "Rebuttals"){ body = rebuttalCard(); }
    else if(st.product === "Progress"){ body = progressCards(); }
    else if(!st.run){ body = startCard(); }
    else if(st.run.finished){ body = summaryCard(); }
    else { body = stepCard(); }
    root.innerHTML = header() + body;
    var sl = root.querySelector("[data-slick]"); if(sl){ fillOwnSlicks(sl.getAttribute("data-slick")); }
  }

  function advance(){
    var r = st.run, steps = runSteps(r.product), s = steps[r.i];
    if(r.phase === "say" && s.follow){
      r.phase = "follow"; r.reply = pick(s.replies); r.revealed = st.mode === "learn";
    } else if(r.i < steps.length - 1){
      r.i++; r.phase = "say"; r.reply = null; r.revealed = st.mode === "learn";
    } else {
      r.finished = true;
      logAdd({ ts: Date.now(), product: r.product, mode: st.mode, score: r.score, total: r.total });
    }
    render(); window.scrollTo(0, 0);
  }

  root.addEventListener("click", function(e){
    var t = e.target.closest("[data-pp],[data-pm],[data-pa]"); if(!t) return;
    if(t.hasAttribute("data-pp")){ st.product = t.getAttribute("data-pp"); st.run = null; st.rb = null; render(); return; }
    if(t.hasAttribute("data-pm")){ st.mode = t.getAttribute("data-pm"); st.run = null; render(); return; }
    var a = t.getAttribute("data-pa");
    if(a === "start" || a === "again"){ startRun(); }
    else if(a === "todrill"){ st.mode = "drill"; startRun(); }
    else if(a === "reveal"){ st.run.revealed = true; render(); }
    else if(a === "hit" || a === "miss"){ var r = st.run; r.total++; if(a === "hit"){ r.score++; } r.scored[r.i + r.phase] = true; advance(); }
    else if(a === "next"){ advance(); }
    else if(a === "rbnext"){ st.rb.shown++; if(st.rb.shown === 5){ st.rb.done++; logAdd({ ts: Date.now(), product: "Rebuttals", mode: "drill" }); } render(); }
    else if(a === "rbnew"){ var d = st.rb.done; st.rb = { item: pick(REBUTTALS), shown: 0, done: d }; render(); }
  });
  root.addEventListener("change", function(e){
    var inp = e.target.closest("[data-slick-add]"); if(!inp || !A.photoPut) return;
    var product = inp.getAttribute("data-slick-add");
    var files = Array.prototype.slice.call(inp.files || []); inp.value = "";
    files.reduce(function(chain, f){
      return chain.then(function(){ return A.compressImage(f); }).then(function(blob){ return A.photoPut({ id: A.uid(), leadId: "slick:" + product, ts: Date.now(), blob: blob }); });
    }, Promise.resolve()).then(function(){ fillOwnSlicks(product); });
  });

  window.openPractice = function(){ render(); A.showView("view-practice"); };
})();
