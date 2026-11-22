// Serves the app's static files, plus a tiny anonymous usage counter for the shared copies.
// POST /api/ping  {app, device, event}  -> one row in D1 (no homeowner or lead details)
const ALLOWED = ["https://socal-contractor-exchange.pages.dev", "https://genesis-leadgen.goldenbeemalajjewelry.workers.dev"];
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
    if (url.pathname === "/owners/art" || url.pathname.startsWith("/owners/art/")) {
      const rest = url.pathname.slice(11) || "/";
      const target = new URL("/owners" + (rest === "/" ? "/" : rest), url);
      return env.ASSETS.fetch(new Request(target.toString(), request));
    }
    const repM = url.pathname.match(/^\/(rep|ruben|app|custom)(\/.*)?$/);
    if (repM) {
      const rest = repM[2] || "/";
      const target = new URL(rest === "/" ? "/" : rest, url);
      target.search = url.search;
      return env.ASSETS.fetch(new Request(target.toString(), request));
    }
    return env.ASSETS.fetch(request);
  },
};
