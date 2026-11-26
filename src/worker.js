// Serves the app's static files, plus a tiny anonymous usage counter for the shared copies.
// POST /api/ping  {app, device, event}  -> one row in D1 (no homeowner or lead details)
const ALLOWED = ["https://socal-contractor-exchange.pages.dev", "https://genesis-leadgen.goldenbeemalajjewelry.workers.dev", "https://hc.goldenbeemalaj.com", "https://goldback.goldenbeemalaj.com"];
const EVENTS = ["open", "lead_saved"];

function cors(origin) {
  const ok = ALLOWED.includes(origin) || /\.socal-contractor-exchange\.pages\.dev$/.test(new URL(origin || "https://x").hostname);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOWED[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Goldback app: pull website-form inquiries (read-only). Needs the GB_INQ_KEY secret in the x-gb-key header.
    if (url.pathname === "/api/gb-inquiries") {
      const nh = { "Content-Type": "application/json", "Cache-Control": "no-store" };
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      if (!env.GB_INQ_KEY || !env.LEADS_DB) return new Response(JSON.stringify({ error: "not_configured" }), { status: 503, headers: nh });
      const given = request.headers.get("x-gb-key") || "";
      let diff = given.length ^ env.GB_INQ_KEY.length;
      for (let i = 0; i < given.length && i < env.GB_INQ_KEY.length; i++) diff |= given.charCodeAt(i) ^ env.GB_INQ_KEY.charCodeAt(i);
      if (diff !== 0) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: nh });
      const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;
      const r = await env.LEADS_DB.prepare("SELECT id, name, contact, interest, best_time, source_page, created_at FROM leads WHERE id > ?1 AND COALESCE(source_page,'') NOT LIKE 'canvassing%' ORDER BY id LIMIT 100").bind(since).all();
      const osince = parseInt(url.searchParams.get("osince") || "0", 10) || 0;
      let orders = [];
      try { orders = (await env.LEADS_DB.prepare("SELECT id, customer_name, customer_email, series, denomination, quantity, amount_cents, shipping_address, created_at FROM orders WHERE id > ?1 ORDER BY id LIMIT 100").bind(osince).all()).results || []; } catch (e) {}
      return new Response(JSON.stringify({ leads: r.results || [], orders }), { headers: nh });
    }
    // Goldback app -> website: the app sends what the website may show (rate, listed merchants, events). Needs GB_INQ_KEY.
    // The website reads it back from /api/gb-public (plus the newest YouTube videos, cached for an hour).
    // Sales tax rate for a California address, from CDTFA's official Tax Rate API (cached 30 days)
    if (url.pathname === "/api/gb-taxrate") {
      const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      const address = (url.searchParams.get("address") || "").trim().slice(0, 120);
      const city = (url.searchParams.get("city") || "").trim().slice(0, 60);
      const zip = (url.searchParams.get("zip") || "").replace(/[^0-9]/g, "").slice(0, 5);
      const lat = parseFloat(url.searchParams.get("lat") || ""), lng = parseFloat(url.searchParams.get("lng") || "");
      const byGps = Number.isFinite(lat) && Number.isFinite(lng) && lat > 32 && lat < 42.1 && lng > -124.5 && lng < -114;
      if (!byGps && (!address || zip.length !== 5)) return J({ error: "need_address_and_zip" }, 400);
      const key = byGps ? "tax:gps:" + lat.toFixed(3) + "," + lng.toFixed(3) : "tax:" + (address + "|" + city + "|" + zip).toLowerCase();
      try {
        if (env.LEADS_DB) {
          await env.LEADS_DB.prepare("CREATE TABLE IF NOT EXISTS gb_public (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated INTEGER NOT NULL)").run();
          const c = await env.LEADS_DB.prepare("SELECT v, updated FROM gb_public WHERE k = ?1").bind(key).first();
          if (c && Date.now() - c.updated < 30 * 864e5) return J(JSON.parse(c.v));
        }
        const r = await fetch(byGps
          ? "https://services.maps.cdtfa.ca.gov/api/taxrate/GetRateByLngLat?longitude=" + lng + "&latitude=" + lat
          : "https://services.maps.cdtfa.ca.gov/api/taxrate/GetRateByAddress?address=" + encodeURIComponent(address) + "&city=" + encodeURIComponent(city) + "&zip=" + zip);
        if (!r.ok) return J({ error: "lookup_failed" }, 502);
        const d = await r.json();
        const info = (d && d.taxRateInfo) || [];
        if (!info.length || !(info[0].rate > 0)) return J({ error: "not_found" }, 404);
        const out = { rate: Math.round(info[0].rate * 100000) / 1000, place: [info[0].city || info[0].jurisdiction, info[0].county].filter(Boolean).join(", ").replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()), multiple: info.length > 1, address: (d.geocodeInfo && d.geocodeInfo.formattedAddress) || "" };
        if (env.LEADS_DB) await env.LEADS_DB.prepare("INSERT INTO gb_public (k, v, updated) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated").bind(key, JSON.stringify(out), Date.now()).run();
        return J(out);
      } catch (e) { return J({ error: "lookup_failed" }, 502); }
    }
    if (url.pathname === "/api/gb-publish" || url.pathname === "/api/gb-public") {
      const ch = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
      const J = (o, st, extra) => new Response(JSON.stringify(o), { status: st || 200, headers: Object.assign({ "Content-Type": "application/json" }, extra || {}) });
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });
      if (!env.LEADS_DB) return J({ error: "not_configured" }, 503, ch);
      await env.LEADS_DB.prepare("CREATE TABLE IF NOT EXISTS gb_public (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated INTEGER NOT NULL)").run();
      if (url.pathname === "/api/gb-publish") {
        if (request.method !== "POST") return J({ error: "method" }, 405);
        const given = request.headers.get("x-gb-key") || "";
        if (!env.GB_INQ_KEY) return J({ error: "not_configured" }, 503);
        let diff = given.length ^ env.GB_INQ_KEY.length;
        for (let i = 0; i < given.length && i < env.GB_INQ_KEY.length; i++) diff |= given.charCodeAt(i) ^ env.GB_INQ_KEY.charCodeAt(i);
        if (diff !== 0) return J({ error: "unauthorized" }, 401);
        let b = {};
        try { b = await request.json(); } catch (e) { return J({ error: "json" }, 400); }
        const str = (x, n) => String(x == null ? "" : x).slice(0, n);
        const out = {
          rate: b.rate && Number(b.rate.price) > 0 ? { price: Math.round(Number(b.rate.price) * 100) / 100, date: str(b.rate.date, 10) } : null,
          merchants: (Array.isArray(b.merchants) ? b.merchants : []).slice(0, 100).map((m) => ({ name: str(m.name, 80), kind: str(m.kind, 60), area: str(m.area, 60), address: str(m.address, 140), option: str(m.option, 40) })).filter((m) => m.name),
          events: (Array.isArray(b.events) ? b.events : []).slice(0, 30).map((e) => ({ id: str(e.id, 40), title: str(e.title, 100), date: str(e.date, 10), time: str(e.time, 30), place: str(e.place, 120), desc: str(e.desc, 300) })).filter((e) => e.title && /^\d{4}-\d\d-\d\d$/.test(e.date)),
          videos: !!b.videos, youtube: str(b.youtube, 60), review: /^https:\/\//.test(b.review || "") ? str(b.review, 200) : "",
        };
        await env.LEADS_DB.prepare("INSERT INTO gb_public (k, v, updated) VALUES ('site', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated").bind(JSON.stringify(out), Date.now()).run();
        return J({ ok: true });
      }
      if (request.method !== "GET") return J({ error: "method" }, 405, ch);
      const row = await env.LEADS_DB.prepare("SELECT v, updated FROM gb_public WHERE k = 'site'").first();
      const site = row ? JSON.parse(row.v) : { rate: null, merchants: [], events: [], videos: true, youtube: "@goldenbeemalajjewelry", review: "" };
      const handle = (url.searchParams.get("yt") || site.youtube || "@goldenbeemalajjewelry").trim();
      let videos = [];
      if (site.videos !== false || url.searchParams.get("yt")) {
        const vk = "yt:" + handle.toLowerCase();
        const vr = await env.LEADS_DB.prepare("SELECT v, updated FROM gb_public WHERE k = ?1").bind(vk).first();
        if (vr && Date.now() - vr.updated < 3600000) videos = JSON.parse(vr.v);
        else {
          try {
            let cid = /^UC[\w-]{22}$/.test(handle) ? handle : "";
            if (!cid) {
              const pg = await fetch("https://www.youtube.com/" + (handle.startsWith("@") ? handle : "@" + handle), { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US" } });
              const t = await pg.text();
              const m = t.match(/"externalId":"(UC[\w-]{22})"/) || t.match(/channel_id=(UC[\w-]{22})/) || t.match(/"channelId":"(UC[\w-]{22})"/);
              cid = m ? m[1] : "";
            }
            if (cid) {
              const feed = await (await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + cid)).text();
              const ents = feed.split("<entry>").slice(1, 9);
              const dec = (x) => x.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
              videos = ents.map((e) => {
                const id = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
                return id ? { id, title: dec((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ""), published: (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "", link: "https://youtu.be/" + id, thumb: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" } : null;
              }).filter(Boolean);
            }
          } catch (e) {}
          if (videos.length || !vr) await env.LEADS_DB.prepare("INSERT INTO gb_public (k, v, updated) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated").bind(vk, JSON.stringify(videos), Date.now()).run();
          else videos = JSON.parse(vr.v);
        }
      }
      const today = new Date(Date.now() - 8 * 3600000).toISOString().slice(0, 10);
      // keep off-message videos out (Playbook: no collapse talk, never "currency", old Shopify store is closed)
      const SKIP_VID = /collapse|currency|shopify|call to action/i;
      videos = videos.filter((v) => !SKIP_VID.test(v.title || ""));
      // Goldback Inc.'s official daily rate (used as the app's price floor), cached 30 min
      let daily = null, lockUntil = 0;
      try {
        // Holds for the day on Goldback's schedule: 9 AM Pacific to 9 AM Pacific
        const pp = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
        const off = Date.now() - Date.UTC(+pp.year, +pp.month - 1, +pp.day, +pp.hour, +pp.minute, new Date().getUTCSeconds());
        let pStart = Date.UTC(+pp.year, +pp.month - 1, +pp.day, 9, 0) + off;
        if (+pp.hour * 60 + +pp.minute < 540) pStart -= 864e5;
        lockUntil = pStart + 864e5;
        const dkey = "daily:" + new Date(pStart - off).toISOString().slice(0, 10);
        const dr = await env.LEADS_DB.prepare("SELECT v, updated FROM gb_public WHERE k = ?1").bind(dkey).first();
        if (dr) daily = JSON.parse(dr.v);
        else {
          const rr = await fetch("https://www.goldback.com/gb-proxy.php", { headers: { "User-Agent": "Mozilla/5.0 (goldenbee-malaj)" } });
          const dj = rr.ok ? await rr.json() : null;
          const usd = Number(dj && dj.quotes && dj.quotes.USDUSD), dts = Number(dj && dj.timestamp) || 0;
          const freshD = dts ? dts * 1000 >= pStart - 120000 : Date.now() >= pStart + 15 * 60000;
          if (usd > 0 && !freshD) daily = Math.round(usd * 100) / 100;
          else if (usd > 0) { daily = Math.round(usd * 100) / 100; await env.LEADS_DB.prepare("INSERT OR IGNORE INTO gb_public (k, v, updated) VALUES (?1, ?2, ?3)").bind(dkey, JSON.stringify(daily), Date.now()).run(); }
        }
      } catch (e) {}
      return J({ rate: site.rate, daily, lockUntil, merchants: site.merchants || [], events: (site.events || []).filter((e) => e.date >= today), videos: site.videos === false ? [] : videos, youtube: handle, review: site.review || "", updated: row ? row.updated : 0 }, 200, Object.assign({ "Cache-Control": "public, max-age=120" }, ch));
    }
    if (url.pathname === "/api/ping") {
      const h = cors(request.headers.get("Origin") || "");
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: h });
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const app = String(body.app || "").slice(0, 32);
      const device = String(body.device || "").slice(0, 40);
      const event = String(body.event || "");
      if (!EVENTS.includes(event) || !device) return new Response("Bad request", { status: 400, headers: h });
      await env.DB.prepare("INSERT INTO events (app, device, event) VALUES (?1, ?2, ?3)").bind(app, device, event).run();
      return new Response(null, { status: 204, headers: h });
    }
    // Device sync (phone <-> iPad). Same origin only. Data arrives already encrypted on the device;
    // the server only sees an opaque space id (hash of the sync code) and ciphertext.
    if (url.pathname === "/sync/push" || url.pathname === "/sync/pull") {
      const J = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      const space = url.pathname === "/sync/pull" ? url.searchParams.get("space") : null;
      if (url.pathname === "/sync/pull") {
        if (request.method !== "GET" || !/^[0-9a-f]{64}$/.test(space || "")) return J({ error: "bad" }, 400);
        const since = Math.max(0, parseInt(url.searchParams.get("since") || "0", 10) || 0);
        const now = Date.now();
        const r = await env.DB.prepare("SELECT k, v, mt, dev, updated FROM sync_items WHERE space = ?1 AND updated > ?2 ORDER BY updated LIMIT 30").bind(space, since).all();
        const items = r.results || [];
        const next = items.length ? items[items.length - 1].updated : since;
        return J({ now, next, more: items.length === 30, items });
      }
      if (request.method !== "POST") return J({ error: "method" }, 405);
      let body = {};
      try { body = await request.json(); } catch (e) { return J({ error: "json" }, 400); }
      if (!/^[0-9a-f]{64}$/.test(body.space || "") || !Array.isArray(body.items) || body.items.length > 40) return J({ error: "bad" }, 400);
      const dev = String(body.dev || "").slice(0, 40);
      const stmts = [];
      let t = Date.now();
      for (const it of body.items) {
        const k = String(it.k || ""), v = String(it.v || ""), mt = Number(it.mt) || 0;
        if (!k || k.length > 120 || !v || v.length > 1900000) return J({ error: "item" }, 413);
        stmts.push(env.DB.prepare("INSERT INTO sync_items (space, k, v, mt, dev, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(space, k) DO UPDATE SET v = excluded.v, mt = excluded.mt, dev = excluded.dev, updated = excluded.updated WHERE excluded.mt >= sync_items.mt")
          .bind(body.space, k, v, mt, dev, t++));
      }
      if (stmts.length) await env.DB.batch(stmts);
      return J({ ok: true, n: stmts.length });
    }
    // Rep copy lives at /rep — same files, served from the root
    // Villa Pacifica owners link is discontinued along with Canvassing Arena
    if (url.pathname === "/owners/art" || url.pathname.startsWith("/owners/art/")) {
      return new Response('<!DOCTYPE html><meta name="viewport" content="width=device-width,initial-scale=1"><title>No longer available</title><body style="font-family:-apple-system,system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;margin:0;color:#152535"><div><h2>This app is no longer available</h2></div></body>', { status: 410, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (false) {
      const rest = url.pathname.slice(11) || "/";
      const target = new URL("/owners" + (rest === "/" ? "/" : rest), url);
      return env.ASSETS.fetch(new Request(target.toString(), request));
    }
    // goldenbeemalaj.com/hc and /goldback send people to the apps' own addresses (the rest of goldenbeemalaj.com is the website)
    if (url.hostname === "goldenbeemalaj.com" || url.hostname === "www.goldenbeemalaj.com") {
      const gm = url.pathname.match(/^\/(hc|goldback)(\/|$)/);
      if (gm) return Response.redirect("https://" + gm[1] + ".goldenbeemalaj.com/" + url.search, 301);
      return fetch(request);
    }
    // hc.goldenbeemalaj.com = Home Connector, goldback.goldenbeemalaj.com = Goldback app
    const hostKind = /^hc\./.test(url.hostname) ? "app" : /^goldback\./.test(url.hostname) ? "goldback" : "";
    // Goldback community app (Members, Merchants, Exchanges, Inventory, Community) has its own page
    if ((hostKind === "goldback" && (url.pathname === "/" || url.pathname === "/index.html")) || /^\/goldback\/?$/.test(url.pathname)) {
      const res = await env.ASSETS.fetch(new Request(new URL("/gb-app", url).toString(), request));
      const h = new Headers(res.headers); h.set("Cache-Control", "no-cache");
      return new Response(res.body, { status: res.status, headers: h });
    }
    let repM = url.pathname.match(/^\/(rep|ruben|app|custom|goldback)(\/.*)?$/);
    if (hostKind && (url.pathname === "/" || url.pathname === "/index.html")) repM = [url.pathname, hostKind, "/"];
    if (repM) {
      const rest = repM[2] || "/";
      const target = new URL(rest === "/" ? "/" : rest, url);
      target.search = url.search;
      const res = await env.ASSETS.fetch(new Request(target.toString(), request));
      // home-screen apps: give /app and /custom their own name, icon and start page so "Add to Home Screen" doesn't open the SoCal app
      const kind = repM[1];
      if ((kind === "app" || kind === "custom" || kind === "goldback") && (res.headers.get("content-type") || "").includes("text/html")) {
        let html = await res.text();
        const mine = kind === "app";
        html = html.replace('<link rel="manifest" href="/manifest.webmanifest">', '<link rel="manifest" href="/manifest-' + kind + (hostKind ? "-host" : "") + '.webmanifest">')
          .replace('<meta name="apple-mobile-web-app-title" content="SoCal Leads">', '<meta name="apple-mobile-web-app-title" content="' + (kind === "goldback" ? "Goldbacks" : mine ? "Home Connector" : "Lead Gen") + '">')
          .replace(/<link rel="apple-touch-icon" href="[^"]*">/, '<link rel="apple-touch-icon" href="' + (kind === "goldback" ? "/goldenbee-gb-icon.png" : mine ? "/goldenbee-hc-icon-burg2.png" : "/app-icon-180.png") + '">');
        const h = new Headers(res.headers); h.set("Cache-Control", "no-cache"); h.delete("content-length");
        return new Response(html, { status: res.status, headers: h });
      }
      return res;
    }
    return env.ASSETS.fetch(request);
  },
};
