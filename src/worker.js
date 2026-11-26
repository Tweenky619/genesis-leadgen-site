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
