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
    // Rep copy lives at /rep — same files, served from the root
    const repM = url.pathname.match(/^\/(rep|ruben)(\/.*)?$/);
    if (repM) {
      const rest = repM[2] || "/";
      const target = new URL(rest === "/" ? "/" : rest, url);
      target.search = url.search;
      return env.ASSETS.fetch(new Request(target.toString(), request));
    }
    return env.ASSETS.fetch(request);
  },
};
