/* Question -> Education playbook (original content) */
(function(){
  "use strict";
  function e(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function qe(q, ed){ return '<div class="pb-qe"><div class="pb-q"><b>Q</b>“' + e(q) + '”</div><div class="pb-e"><b>E</b>“' + e(ed) + '”</div></div>'; }
  function table(head, rows){
    return '<div class="pb-tbl"><table><thead><tr>' + head.map(function(h){ return '<th>' + e(h) + '</th>'; }).join("") + '</tr></thead><tbody>' +
      rows.map(function(r){ return '<tr>' + r.map(function(c){ return '<td>' + e(c) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>';
  }
  function sec(title, body, open){ return '<details class="pb-sec"' + (open ? " open" : "") + '><summary>' + title + '</summary><div class="pb-body">' + body + '</div></details>'; }

  var FORMULA =
    '<p class="pb-lead">SoCal’s formula: <b>point out damage + consequence of damage.</b></p>' +
    '<ol class="pb-steps">' +
      '<li><b>Question</b> — get them to <i>see</i> it. Point while you ask.<div class="pb-ex">“Have you noticed ___?”</div></li>' +
      '<li><b>Education</b> — say what it is and what it leads to.<div class="pb-ex">“Did you know ___ allows moisture in, which can lead to dry rot, termites, and toxic mold?”</div></li>' +
      '<li><b>Bridge</b> — use their answer to lead into the next question.</li>' +
    '</ol>' +
    '<p class="pb-sub">The three loops go deeper each time:</p>' +
    table(["Loop", "Goal", "Pattern"], [
      ["1. What they can see", "Get them to notice it", "“Have you noticed ___ right there?”"],
      ["2. What’s hidden", "Show it’s worse than it looks", "“Have you seen this anywhere else?” / “When’s the last time you checked ___?”"],
      ["3. How it reaches them", "Make it personal — inside, cost, family", "“Any stains inside?” / “Has it been getting worse?”"]
    ]);

  var PRODUCTS =
    '<h4>🏠 Roof</h4>' +
    qe("Have you noticed the fiberglass showing on the shingles — right there?", "That means the granules are gone — they protect the shingle from the sun. Without them it dries out, cracks, and lets moisture in, which can lead to dry rot, termites, and toxic mold.") +
    qe("Have you noticed the ridge caps up top — how they’re cracked and lifting?", "Those seal the very top of the roof. Once they blow out, water runs straight into the attic.") +
    qe("When’s the last time you popped your head in the attic — any stains on the ceilings?", "That’s how it starts — a stain, then wet insulation, then rotted wood. Once the wood goes, it’s not just shingles anymore.") +
    '<h4>🧱 Paint/Stucco</h4>' +
    qe("Have you noticed this chipping and peeling getting worse?", "Did you know chipping and peeling allows moisture in, which can lead to dry rot, termites, and toxic mold?") +
    qe("Have you seen this white stuff anywhere else on the home?", "That’s efflorescence — your stucco going back to its original form: sand, water, and glue. The alkaline in the soil is attacking the glue. That’s why they call it stucco cancer.") +
    qe("Have you noticed any water stains on the other side of this wall?", "That’s the moisture getting behind the stucco to the wood framing — that’s where the rot starts, where you can’t see it.") +
    '<h4>🪵 Fascia/Trim</h4>' +
    qe("Have you noticed the paint peeling on the boards up at the roofline?", "Once the paint’s gone, the wood soaks up water every time it rains — and it rots from the inside out.") +
    qe("See how it’s darker and soft-looking at that corner?", "That’s moisture in the wood. If it waits, it’s not a paint job anymore — it’s replacing the wood.") +
    qe("Have you had any bees, birds, or rodents getting in up there?", "Gaps in rotted trim are exactly how pests get into the attic — and termites love wet wood.") +
    '<h4>🪟 Windows</h4>' +
    qe("Do you ever notice fog or condensation between the panes?", "That means the seal’s gone — outside air and moisture are getting in.") +
    qe("Does this room get hot in the afternoon — or drafty at night?", "That’s the window working against your AC — that’s money going out the glass every month.") +
    qe("Any water stains or soft spots around the frames?", "That’s water getting past the window into the wall. Same story — moisture, then rot.");

  function build(icon, title, see, lets, leads, q, ed){
    return '<div class="pb-build"><div class="pb-bt">' + icon + ' ' + e(title) + '</div>' +
      '<div class="pb-think"><span><b>I see:</b> ' + e(see) + '</span><span><b>Lets in:</b> ' + e(lets) + '</span><span><b>Leads to:</b> ' + e(leads) + '</span></div>' +
      qe(q, ed) + '</div>';
  }
  var BUILD =
    '<p class="pb-lead">For damage that isn’t in the script, ask yourself three things:</p>' +
    '<div class="pb-3"><span>1. What do I <b>see</b>?</span><span>2. What does it <b>let in</b>?</span><span>3. What does that <b>lead to</b>?</span></div>' +
    '<p class="pb-sub">Turn #1 into “Have you noticed ___?” and #2 + #3 into your education line.</p>' +
    build("🏠", "Roof — curling shingle edges", "corners curling up", "wind and rain under the shingle", "blow-offs, leaks, rotted decking",
      "Have you noticed how the edges on these shingles are curling up — right there?", "When they curl like that, the wind gets under them and rain blows right in. That’s usually what comes before shingles start blowing off — and then the water’s hitting the wood.") +
    build("🏠", "Roof — rusted flashing", "rust or gaps where metal meets the roof", "water at the seam", "leaks into the attic, rot around the opening",
      "See the rust around that vent pipe — where the metal meets the shingles?", "That metal is what seals the hole in your roof. Once it rusts or pulls away, water goes straight down into the attic. That’s one of the most common leaks we see.") +
    build("🧱", "Stucco — sprinklers hitting the wall", "dark, stained stucco at sprinkler height", "water soaking in daily", "efflorescence, sill plate rot, termites",
      "Have you noticed the sprinklers hitting the wall right here — see how it’s darker on the bottom?", "That wall is drinking water every time they run. That moisture sits right where the stucco meets the foundation — exactly where the wood starts to rot and termites move in.") +
    build("🧱", "Paint — bubbling or blistering", "bubbles in the paint", "moisture trapped behind it", "peeling, then water in the wall",
      "Have you noticed these little bubbles in the paint?", "That’s moisture trapped behind it, pushing the paint off the wall. When those pop, the water has a direct path in — and that’s when it gets to the wood.") +
    build("🪵", "Fascia — gutter pulling away", "gap between gutter and fascia", "water running behind the gutter", "fascia rot, rafter damage, gutters falling",
      "See how the gutter is pulling away from the house right there?", "When that happens, the water runs behind the gutter instead of through it — straight onto the fascia board. That’s what rots the wood that holds your gutters up.") +
    build("🪵", "Trim — garage door frame rot", "soft, chipped frame at the bottom", "water and pests", "rot climbing up, termites",
      "Have you noticed the bottom of the garage trim — how it’s soft and chipping?", "That’s where water sits after it rains. Once the wood goes soft like that, termites love it — and the rot keeps climbing up the frame.") +
    build("🪟", "Windows — cracked caulking", "gaps or cracked caulk around the frame", "air and water into the wall", "drafts, high bills, water damage",
      "Have you noticed the caulking around this window — see how it’s cracked and pulling away?", "That seal is what keeps air and water out. When it cracks, you’re paying to cool the outside — and when it rains, water gets into the wall.") +
    build("🪟", "Windows — old aluminum, single-pane", "old aluminum frames, thin glass", "heat, cold, and noise", "high bills, condensation, frame corrosion",
      "Are these the original aluminum windows?", "Aluminum pulls the heat right through — that’s why these rooms get so hot. And you’ll usually see condensation in the mornings, dripping right onto the sill.");

  var BRIDGES =
    '<p class="pb-lead">Always react to what they said before moving to the next question.</p>' +
    table(["They say", "You bridge with"], [
      ["“I thought that was normal.”", "“A lot of people do — here’s what’s actually happening…”"],
      ["“Is that bad?”", "“Right now it’s still the easy fix — but here’s what it turns into…”"],
      ["“I never look up there.”", "“Most people don’t — that’s why I stopped. Let me show you one more thing…”"],
      ["“Yeah, it’s been like that a while.”", "“That’s the thing — it doesn’t stay like that. Have you noticed ___?”"],
      ["“We were going to get to it.”", "“Smart — and the sooner, the cheaper. Have you seen ___?”"]
    ]) +
    '<div class="pb-key">Pattern to remember: <b>“Have you noticed ___?” → “That’s ___, which lets ___ in, and that leads to ___.”</b></div>';

  var DELIVERY =
    '<h4>The 4 beats of every loop</h4>' +
    '<div class="pb-beat"><b>1. Point — before you speak</b><ul><li>Turn your body toward the damage; point with an open hand or a pen cap.</li><li>Wait until their eyes follow your hand.</li><li>Step a little closer to the damage so they come with you.</li></ul></div>' +
    '<div class="pb-beat"><b>2. Ask — curious, not salesy</b><ul><li>Sound like “Huh, have you seen this?” — not a script.</li><li>Light voice, lifted at the end like a real question.</li><li>One short question, then stop.</li></ul></div>' +
    '<div class="pb-beat"><b>3. Pause — let silence work</b><ul><li>Count to 3 in your head.</li><li>Watch their face — a lean-in or “huh” means they discovered it.</li><li>Nod slightly while they look.</li></ul></div>' +
    '<div class="pb-beat"><b>4. Educate — slower and lower</b><ul><li>Slow down and drop your voice a notch on the consequence.</li><li>Tiny pause before the key words: <i>moisture… rot… termites… mold.</i></li><li>Use your hand to show it spreading.</li><li>End calm — you’re the expert, not the guy selling fear.</li></ul></div>' +
    '<h4>By product</h4>' +
    table(["Product", "Where to stand", "Body", "Key moment"], [
      ["🏠 Roof", "Edge of the driveway — both see the slope", "Look up first; they’ll look where you look", "Pause after “fiberglass showing”"],
      ["🧱 Stucco", "At the wall, arm’s length away", "Run your hand along the crack or do the chalk rub", "Show your chalky hand: “See that?”"],
      ["🪵 Fascia", "Under the roofline, a few steps back", "Point up and trace the bad board", "“See how it’s darker at that corner?”"],
      ["🪟 Windows", "Beside the window, angled so light shows the fog", "Tap the frame gently; point at the fog", "“That one — see the cloudy part?”"]
    ]) +
    '<h4>Energy across the 3 loops</h4>' +
    table(["Loop", "Energy", "Sounds like"], [
      ["1. What they see", "Friendly, curious", "“Oh — have you noticed this?”"],
      ["2. What’s hidden", "Interested, a bit more serious", "“Here’s the thing most people don’t know…”"],
      ["3. How it reaches them", "Calm, caring", "“That’s why I wanted to show you — before it gets inside.”"]
    ]) +
    '<p class="pb-sub">Build slowly — if you start at a 10 on loop 1, there’s nowhere to go.</p>';

  var MISTAKES =
    '<ul class="pb-x">' +
      '<li><b>Talking while they look.</b> They can’t listen and discover at the same time.</li>' +
      '<li><b>Machine-gunning questions.</b> Each loop needs its own moment.</li>' +
      '<li><b>Reading the education line like a commercial.</b> Say it like you’re telling a friend.</li>' +
      '<li><b>Pointing at nothing.</b> No visible damage? Skip that loop.</li>' +
      '<li><b>Ignoring their answer.</b> Always react: “Exactly — and here’s why…”</li>' +
      '<li><b>Scaring instead of educating.</b> “This can lead to mold” = expert. “TOXIC MOLD!!!” = pitch.</li>' +
    '</ul>';

  var DRILLS =
    '<ol class="pb-steps">' +
      '<li><b>Mirror drill</b> — run 3 loops for one product in a mirror. Are you pointing before you speak?</li>' +
      '<li><b>Record yourself</b> — voice-memo one loop, listen back. Are you slowing down on the consequence?</li>' +
      '<li><b>3-second rule</b> — next 10 doors, pause 3 seconds after every question.</li>' +
      '<li><b>One skill a day</b> — Mon: pointing. Tue: the pause. Wed: slower and lower.</li>' +
    '</ol>';

  window.playbookHtml = function(){
    return '<div class="pb">' +
      sec("🧠 The formula", FORMULA, true) +
      sec("📝 Q → E for each core product", PRODUCTS) +
      sec("🛠️ Build your own (8 examples)", BUILD) +
      sec("🌉 Bridges — using their answer", BRIDGES) +
      sec("🎤 Delivery", DELIVERY) +
      sec("⚠️ Common mistakes", MISTAKES) +
      sec("🏋️ Practice drills", DRILLS) +
    '</div>';
  };
})();
