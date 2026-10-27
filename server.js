// Agent City web server: serves the city and relays real agent activity to it.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = process.env.PORT || 3000;
const root = path.join(__dirname, "public");
const ACTIVITY_KEY = process.env.ACTIVITY_KEY || "";  // secret shared with Copilot Studio
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
  ".json": "application/json", ".ico": "image/x-icon"
};

// Recent agent events, newest last. Kept in memory only (cleared when the app restarts).
const events = [];
let nextId = 1;
const clean = (v, max) => String(v || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const sameKey = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function sendJson(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health") return res.end("ok");

  // Copilot Studio calls this when someone asks an agent a question.
  if (url.pathname === "/api/agent-event" && req.method === "POST") {
    if (!ACTIVITY_KEY || !sameKey(String(req.headers["x-activity-key"] || ""), ACTIVITY_KEY)) {
      return sendJson(res, 401, { error: "unauthorized" });
    }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 4000) req.destroy(); });
    req.on("end", () => {
      let data;
      try { data = JSON.parse(body || "{}"); } catch { return sendJson(res, 400, { error: "invalid JSON" }); }
      const agent = clean(data.agent, 40);
      if (!/^[a-z_]+$/.test(agent)) return sendJson(res, 400, { error: "agent id missing" });
      events.push({ id: nextId++, agent, channel: clean(data.channel, 20) || "Teams", at: Date.now() });
      if (events.length > 200) events.shift();
      sendJson(res, 200, { ok: true });
    });
    return;
  }

  // The city page asks for new events every few seconds.
  if (url.pathname === "/api/activity" && req.method === "GET") {
    const since = Number(url.searchParams.get("since")) || 0;
    return sendJson(res, 200, { events: events.filter((e) => e.id > since), last: nextId - 1 });
  }

  let urlPath = "/";
  try { urlPath = decodeURIComponent(url.pathname); } catch { /* keep "/" */ }
  const file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, () => console.log(`Agent City running on http://localhost:${port}`));