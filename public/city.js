(() => {
  "use strict";
  const CFG = window.AGENT_CITY_CONFIG;
  const canvas = document.getElementById("city");
  const ctx = canvas.getContext("2d");

  const N = 14, TW = 64, TH = 32, SPEED = 1.1;
  const FONT = '"Space Grotesk", system-ui, sans-serif';
  const C = {
    tile1: "#151B32", tile2: "#12182C", grid: "rgba(34, 230, 255, 0.08)",
    road: "#0B0E1C", path: "#1B2443", dirt: "#221A30",
    cyan: "#22E6FF", magenta: "#FF3DCB", amber: "#FFB020",
    ink: "#E8EDFF", muted: "#8F9AC0"
  };
  // Neon colour per agent (falls back to the colour in config.js)
  const NEON = { hospital: "#22E6FF", tower: "#FF3DCB", cloudascent: "#FF4D6D", plot: "#FFB020" };
  const neon = (id) => NEON[id] || (CFG.agents[id] && CFG.agents[id].color) || C.cyan;
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
  let time = 0, last = performance.now();
  let hover = null, tasksDone = 0;
  const feed = [];

  // ---------- geometry helpers ----------
  const iso = (i, j, z = 0) => ({ x: (i - j) * TW / 2, y: (i + j) * TH / 2 - z });
  const toScreen = (p) => ({ x: ox + p.x * scale, y: oy + p.y * scale });
  const toWorld = (sx, sy) => ({ x: (sx - ox) / scale, y: (sy - oy) / scale });

  function poly(pts, fill, stroke, lw = 1) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function line(a, b, color, lw) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke();
  }
  function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function ellipse(x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // glowing versions
  function glowLine(a, b, color, lw, blur = 10) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; line(a, b, color, lw); ctx.restore();
  }
  function glowPoly(pts, fill, blur = 10) {
    ctx.save(); ctx.shadowColor = fill; ctx.shadowBlur = blur; poly(pts, fill); ctx.restore();
  }
  function outline(pts, color, lw, blur = 10) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; poly(pts, null, color, lw); ctx.restore();
  }
  function inPoly(p, pts) {
    let inside = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const xi = pts[a].x, yi = pts[a].y, xj = pts[b].x, yj = pts[b].y;
      if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function boxFaces(i, j, w, d, z, h) {
    const L = (u, v) => iso(i + u * w, j + d, z + v * h);       // front-left face
    const R = (u, v) => iso(i + w, j + d - u * d, z + v * h);   // front-right face
    return {
      L, R,
      left: [L(0, 0), L(1, 0), L(1, 1), L(0, 1)],
      right: [R(0, 0), R(1, 0), R(1, 1), R(0, 1)],
      top: [iso(i, j, z + h), iso(i + w, j, z + h), iso(i + w, j + d, z + h), iso(i, j + d, z + h)]
    };
  }
  function drawBox(i, j, w, d, z, h, cl, cr, ct) {
    const f = boxFaces(i, j, w, d, z, h);
    poly(f.left, cl); poly(f.right, cr); poly(f.top, ct);
    return f;
  }
  const facePts = (fn, u0, v0, u1, v1) => [fn(u0, v0), fn(u1, v0), fn(u1, v1), fn(u0, v1)];
  function quad(fn, u0, v0, u1, v1, color) { poly(facePts(fn, u0, v0, u1, v1), color); }
  function glowQuad(fn, u0, v0, u1, v1, color, blur = 8) { glowPoly(facePts(fn, u0, v0, u1, v1), color, blur); }

  // ---------- the city ----------
  const buildings = [
    { kind: "hospital", agent: "hospital", i: 1, j: 2, w: 4, d: 3, h: 72, hitH: 76, labelZ: 104 },
    { kind: "tower", agent: "tower", i: 8, j: 2, w: 3, d: 3, h: 170, hitH: 184, labelZ: 222 },
    { kind: "burjuman", agent: "cloudascent", i: 12, j: 2, w: 2, d: 2, h: 230, hitH: 262, labelZ: 300 },
    { kind: "plot", agent: "plot", i: 1, j: 8, w: 4, d: 4, h: 0, hitH: 130, labelZ: 158 },
    { kind: "house", i: 8, j: 8, w: 2, d: 2, h: 28 },
    { kind: "house", i: 11, j: 8, w: 2, d: 2, h: 28 }
  ];
  const trees = [[12.5, 1.5], [0.5, 13.5], [12.5, 13.2], [13.5, 12], [7.5, 12.5],
    [5.5, 13.3], [0.5, 0.5], [3.5, 0.6], [13.4, 8.5], [9.5, 13.3], [0.6, 7.4]].map(([i, j]) => ({ i, j }));

  const inRect = (i, j, x, y, w, d) => i >= x && i < x + w && j >= y && j < y + d;
  function tileColor(i, j) {
    if (i === 6 || j === 6) return C.road;
    if (j === 10 && i >= 7 && i <= 12) return C.path;
    if (j === 5 && ((i >= 1 && i <= 4) || (i >= 8 && i <= 10))) return C.path;
    if ((j === 4 || j === 5) && (i === 12 || i === 13)) return C.path;
    if (inRect(i, j, 1, 8, 4, 4)) return C.dirt;
    return (i + j) % 2 ? C.tile1 : C.tile2;
  }

  // ---------- the human agents ----------
  function person(name, agent, look, route) {
    return {
      name, agent, ...look, route, idx: 0,
      i: route[0].p[0], j: route[0].p[1],
      task: route[0].task || null, wait: 1 + Math.random() * 3, waitTotal: 4,
      phase: 0, dir: 1, walking: false
    };
  }
  const people = [
    person("Nora", "hospital", { skin: "#C68B65", hair: "#2B1D16" }, [
      { p: [3, 5.3], task: "Checking in a patient" }, { p: [3, 6.5] }, { p: [6.5, 6.5] },
      { p: [6.5, 9], task: "Calling to confirm an appointment" }, { p: [6.5, 6.5] }, { p: [3, 6.5] }
    ]),
    person("Sam", "hospital", { skin: "#F1C7A6", hair: "#7A4B2A" }, [
      { p: [2, 5.3], task: "Reviewing lab results" }, { p: [2, 6.5] }, { p: [6.5, 6.5] }, { p: [9, 6.5] },
      { p: [9, 5.3], task: "Handing off a relocation request" }, { p: [9, 6.5] }, { p: [2, 6.5] }
    ]),
    person("Omar", "tower", { skin: "#A86D4A", hair: "#1C1410" }, [
      { p: [9.5, 5.3], task: "Preparing a new listing" }, { p: [9.5, 6.5] }, { p: [6.5, 6.5] }, { p: [6.5, 10.5] },
      { p: [9, 10.5], task: "Showing a property" }, { p: [12, 10.5], task: "Measuring the living room" },
      { p: [6.5, 10.5] }, { p: [6.5, 6.5] }, { p: [9.5, 6.5] }
    ]),
    person("Lina", "tower", { skin: "#E7B891", hair: "#3B2417" }, [
      { p: [10.3, 5.3], task: "Drafting a lease" }, { p: [10.3, 6.5] },
      { p: [13.5, 6.5], task: "Answering a buyer's question" }, { p: [10.3, 6.5] }
    ])
  ];
  people.forEach((p) => (p.waitTotal = p.wait));

  function updatePerson(p, dt) {
    if (p.wait > 0) {
      p.walking = false;
      p.wait -= dt;
      if (p.wait <= 0 && p.task) { logTask(p); p.task = null; }
      return;
    }
    const next = p.route[(p.idx + 1) % p.route.length];
    const di = next.p[0] - p.i, dj = next.p[1] - p.j;
    const dist = Math.hypot(di, dj), step = SPEED * dt;
    if (dist <= step) {
      p.i = next.p[0]; p.j = next.p[1];
      p.idx = (p.idx + 1) % p.route.length;
      if (next.task) { p.task = next.task; p.wait = p.waitTotal = 2.8 + Math.random() * 2.2; }
    } else {
      p.i += (di / dist) * step; p.j += (dj / dist) * step;
      p.walking = true; p.phase += dt * 10;
      const sx = di - dj;
      if (Math.abs(sx) > 0.01) p.dir = Math.sign(sx);
    }
  }

  // ---------- hover cars ----------
  const cars = [
    { axis: "i", lane: 6.3, speed: 1.9, pos: 1, col: C.cyan },
    { axis: "i", lane: 6.7, speed: -1.5, pos: 10, col: C.magenta },
    { axis: "j", lane: 6.3, speed: 1.6, pos: 4, col: C.amber },
    { axis: "j", lane: 6.7, speed: -2.1, pos: 12, col: C.cyan }
  ];
  const carPos = (c, pos = c.pos) => (c.axis === "i" ? [pos, c.lane] : [c.lane, pos]);
  function updateCar(c, dt) {
    c.pos += c.speed * dt;
    if (c.pos > N - 0.3) c.pos = 0.3;
    if (c.pos < 0.3) c.pos = N - 0.3;
  }

  // ---------- drawing: ground ----------
  function drawGround() {
    const d = 18;
    poly([iso(0, N), iso(N, N), iso(N, N, -d), iso(0, N, -d)], "#0E1226");
    poly([iso(N, N), iso(N, 0), iso(N, 0, -d), iso(N, N, -d)], "#0A0D1C");
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const c = tileColor(i, j);
      const pts = [iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)];
      poly(pts, c, c, 0.8);
      if (c === C.tile1 || c === C.tile2) poly(pts, null, C.grid, 0.8);
    }
    glowLine(iso(0, N), iso(N, N), C.cyan, 1.5, 12);
    glowLine(iso(N, N), iso(N, 0), C.magenta, 1.5, 12);
    for (const [a, b] of [[0, 6], [7, N]]) {
      line(iso(a, 6), iso(b, 6), rgba(C.cyan, 0.45), 1);
      line(iso(a, 7), iso(b, 7), rgba(C.cyan, 0.45), 1);
      line(iso(6, a), iso(6, b), rgba(C.magenta, 0.45), 1);
      line(iso(7, a), iso(7, b), rgba(C.magenta, 0.45), 1);
    }
    const o = (time * 0.8) % 1;
    for (let k = -1; k < N; k++) {
      const s = k + o, e = s + 0.35;
      if (s < 0 || e > N || (e > 6 && s < 7)) continue;
      glowLine(iso(s, 6.5), iso(e, 6.5), C.cyan, 1.6, 8);
      glowLine(iso(6.5, s), iso(6.5, e), C.magenta, 1.6, 8);
    }
  }

  // ---------- drawing: buildings ----------
  function drawHospital(b) {
    const { i, j, w, d, h } = b;
    const col = neon(b.agent);
    drawBox(i - 0.1, j - 0.1, w + 0.2, d + 0.2, 0, 4, "#1A2034", "#141A2B", "#20283F");
    const f = drawBox(i, j, w, d, 4, h, "#1F2843", "#171E33", "#27314F");
    const tick = Math.floor(time * 0.6);
    for (let r = 0; r < 2; r++) {
      quad(f.L, 0.04, 0.44 + r * 0.28, 0.96, 0.6 + r * 0.28, "#0E1426");
      for (let c = 0; c < 6; c++) {
        const u0 = 0.06 + c * 0.155, v0 = 0.46 + r * 0.28;
        if ((r * 3 + c + tick) % 4 !== 0) glowQuad(f.L, u0, v0, u0 + 0.11, v0 + 0.12, rgba(col, 0.75), 8);
        else quad(f.L, u0, v0, u0 + 0.11, v0 + 0.12, rgba(col, 0.18));
      }
    }
    quad(f.L, 0.43, 0, 0.57, 0.3, "#0A0F1E");
    glowLine(f.L(0.43, 0.3), f.L(0.57, 0.3), col, 1.5, 10);
    glowLine(f.L(0.43, 0), f.L(0.43, 0.3), col, 1, 8);
    glowLine(f.L(0.57, 0), f.L(0.57, 0.3), col, 1, 8);
    const pulse = 0.75 + 0.25 * Math.sin(time * 2);
    glowQuad(f.R, 0.43, 0.42, 0.57, 0.9, rgba("#FF3366", pulse), 16);
    glowQuad(f.R, 0.3, 0.59, 0.7, 0.73, rgba("#FF3366", pulse), 16);
    for (let c = 0; c < 4; c++) { const u0 = 0.08 + c * 0.23; glowQuad(f.R, u0, 0.1, u0 + 0.14, 0.28, rgba(col, 0.55), 6); }
    outline(f.top, rgba(col, 0.8), 1.2, 10);
    const c = iso(i + w / 2, j + d / 2, h + 4);
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, 0.5);
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
    ctx.fillStyle = col; ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("H", 0, 2);
    ctx.restore();
  }

  function drawTower(b) {
    const { i, j, w, d, h } = b;
    const col = neon(b.agent);
    const f = drawBox(i, j, w, d, 0, h, "#1D1733", "#140F26", "#2A2148");
    const tick = Math.floor(time * 0.7);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 5; c++) {
      const v0 = 0.1 + r * 0.072, u0 = 0.08 + c * 0.18;
      const hs = (r * 7 + c * 13 + tick * 3) % 11;
      if (hs === 0) glowQuad(f.L, u0, v0, u0 + 0.11, v0 + 0.045, C.cyan, 6);
      else if (hs < 4) glowQuad(f.L, u0, v0, u0 + 0.11, v0 + 0.045, rgba(col, 0.85), 6);
      else quad(f.L, u0, v0, u0 + 0.11, v0 + 0.045, "#2B2450");
      if (hs === 1) glowQuad(f.R, u0, v0, u0 + 0.11, v0 + 0.045, C.cyan, 6);
      else if (hs > 8) glowQuad(f.R, u0, v0, u0 + 0.11, v0 + 0.045, rgba(col, 0.7), 6);
      else quad(f.R, u0, v0, u0 + 0.11, v0 + 0.045, "#221C40");
    }
    quad(f.L, 0.36, 0, 0.64, 0.07, "#0A0D1A");
    glowLine(f.L(0.36, 0.07), f.L(0.64, 0.07), col, 1.4, 10);
    glowLine(iso(i + w, j + d, 0), iso(i + w, j + d, h), col, 1.6, 14);
    outline(f.top, rgba(col, 0.8), 1.2, 10);
    drawBox(i + 1, j + 1, 1, 1, h, 14, "#241D40", "#1A1530", "#30285A");
    const top = iso(i + 1.5, j + 1.5, h + 14), tip = iso(i + 1.5, j + 1.5, h + 40);
    line(top, tip, "#5B5390", 1.5);
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 14;
    circle(tip.x, tip.y, 2.6, rgba(col, 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 3))));
    ctx.restore();
  }

  // ---------- Business tower: eye-shaped (lens) floor plan, inspired by BurJuman Business Tower ----------
  const logoImg = new Image();
  let logoReady = false;
  logoImg.onload = () => (logoReady = true);
  logoImg.src = "redington-logo.png";

  const LENS_STEPS = 20;
  const mix = (c1, c2, t) => {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
    return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
  };
  const LENS_ANGLE = -20 * Math.PI / 180; // rotation of the eye on the map
  function lensOutline(b, grow = 0) {
    const ci = b.i + b.w / 2 - 0.1, cj = b.j + b.d / 2 + 0.2, A = 1.15 + grow, M = 0.6 + grow * 0.8;
    const ux = Math.cos(LENS_ANGLE), uy = Math.sin(LENS_ANGLE);
    // t: -1 (left tip) to 1 (right tip); side: 1 = front edge, -1 = back edge
    const at = (t, side) => {
      const along = A * t, across = side * M * (1 - t * t);
      return [ci + along * ux - across * uy, cj + along * uy + across * ux];
    };
    const pts = [];
    for (let k = 0; k <= LENS_STEPS; k++) pts.push(at(-1 + (2 * k) / LENS_STEPS, 1));
    for (let k = LENS_STEPS - 1; k > 0; k--) pts.push(at(-1 + (2 * k) / LENS_STEPS, -1));
    return { pts, ci, cj, at };
  }
  function lensFaces(o) {
    const faces = [];
    for (let k = 0; k < o.pts.length; k++) {
      const p = o.pts[k], q = o.pts[(k + 1) % o.pts.length];
      let ni = q[1] - p[1], nj = p[0] - q[0];
      if (((p[0] + q[0]) / 2 - o.ci) * ni + ((p[1] + q[1]) / 2 - o.cj) * nj < 0) { ni = -ni; nj = -nj; }
      const len = Math.hypot(ni, nj) || 1;
      if (ni + nj > 0) faces.push({ p, q, shade: (1 - (nj - ni) / (len * Math.SQRT2)) / 2 });
    }
    return faces;
  }
  function lensBody(o, z, h, light, dark, topColor) {
    lensFaces(o).forEach(({ p, q, shade }) => {
      const col = mix(light, dark, shade);
      poly([iso(p[0], p[1], z), iso(q[0], q[1], z), iso(q[0], q[1], z + h), iso(p[0], p[1], z + h)], col, col, 0.5);
    });
    const topPts = o.pts.map(([i, j]) => iso(i, j, z + h));
    poly(topPts, topColor);
    return topPts;
  }
  function hull(points) {
    const ps = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [], upper = [];
    for (const p of ps) { while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (const p of ps.reverse()) { while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  function drawBurjuman(b) {
    const base = 16, h = b.h, top = base + h, col = neon(b.agent);
    const pod = lensOutline(b, 0.25), body = lensOutline(b), fin = lensOutline(b, -0.3);
    const F = (o, t, z) => { const [i, j] = o.at(t, 1); return iso(i, j, z); }; // point on the front side
    // podium with glowing entrance
    const podTop = lensBody(pod, 0, base, "#262D46", "#141A2B", "#20263C");
    outline(podTop, rgba(C.cyan, 0.5), 1, 8);
    poly([F(pod, -0.25, 0), F(pod, 0.05, 0), F(pod, 0.05, base * 0.85), F(pod, -0.25, base * 0.85)], "#070A14");
    glowLine(F(pod, -0.25, base * 0.85), F(pod, 0.05, base * 0.85), col, 1.4, 10);
    // curved dark-glass body
    const bodyTop = lensBody(body, base, h, "#24446A", "#0C1626", "#1E3556");
    const faces = lensFaces(body);
    ctx.lineWidth = 0.6; ctx.strokeStyle = rgba(C.cyan, 0.22);
    ctx.beginPath();
    for (let v = 0.04; v < 1; v += 0.04) faces.forEach(({ p, q }) => {
      const a = iso(p[0], p[1], base + v * h), c = iso(q[0], q[1], base + v * h);
      ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();
    faces.forEach(({ p }, k) => { if (k % 3 === 0) line(iso(p[0], p[1], base), iso(p[0], p[1], top), "rgba(255, 255, 255, 0.06)", 0.6); });
    glowLine(F(body, -0.65, base), F(body, -0.65, top), rgba(C.cyan, 0.55), 2, 12); // neon reflection
    glowLine(F(body, 1, base), F(body, 1, top), col, 1.5, 14);                       // sharp edge of the eye
    outline(bodyTop, rgba(col, 0.8), 1.2, 10);
    // light band climbing the tower
    const scan = base + ((time * 30) % h);
    ctx.save(); ctx.shadowColor = C.cyan; ctx.shadowBlur = 10; ctx.strokeStyle = rgba(C.cyan, 0.7); ctx.lineWidth = 1.2;
    ctx.beginPath();
    faces.forEach(({ p, q }) => { const a = iso(p[0], p[1], scan), c = iso(q[0], q[1], scan); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); });
    ctx.stroke(); ctx.restore();
    // crown fin and spire
    const finTop = lensBody(fin, top, 14, "#334066", "#1A2238", "#2A3554");
    outline(finTop, col, 1.2, 12);
    const sp = iso(body.ci, body.cj, top + 40);
    line(iso(body.ci, body.cj, top + 14), sp, "#6B7AA6", 1.4);
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 14;
    circle(sp.x, sp.y, 2.4, rgba(col, 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2.5))));
    ctx.restore();
    // logo on the curved front (no background plate)
    const t0 = -0.45, t1 = 0.85, z0 = base + h * 0.64, z1 = base + h * 0.82;
    const p0 = F(body, t0, z1), pu = F(body, t1, z1), pv = F(body, t0, z0);
    ctx.save();
    ctx.transform(pu.x - p0.x, pu.y - p0.y, pv.x - p0.x, pv.y - p0.y, p0.x, p0.y); // unit square = logo area
    if (logoReady) {
      const ratio = Math.hypot(pu.x - p0.x, pu.y - p0.y) / Math.hypot(pv.x - p0.x, pv.y - p0.y);
      const img = logoImg.width / logoImg.height;
      const lw = img > ratio ? 1 : img / ratio, lh = img > ratio ? ratio / img : 1;
      ctx.drawImage(logoImg, (1 - lw) / 2, (1 - lh) / 2, lw, lh);
    } else {
      ctx.scale(1 / 100, 1 / 40);
      ctx.shadowColor = col; ctx.shadowBlur = 12;
      ctx.fillStyle = col; ctx.font = `700 15px ${FONT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("REDINGTON", 50, 21);
    }
    ctx.restore();
    if (hover && hover.b === b) {
      const pts = [];
      body.pts.forEach(([i, j]) => { pts.push(iso(i, j, base)); pts.push(iso(i, j, top)); });
      outline(hull(pts), col, 2, 16);
    }
  }

  function drawHouse(b) {
    const { i, j, w, d, h } = b;
    const f = drawBox(i, j, w, d, 0, h, "#1F2338", "#171A2C", "#262B44");
    quad(f.L, 0.4, 0, 0.6, 0.62, "#0B0E1C");
    glowLine(f.L(0.4, 0.62), f.L(0.6, 0.62), C.amber, 1.2, 8);
    glowQuad(f.R, 0.3, 0.35, 0.7, 0.75, rgba(C.amber, 0.7), 10);
    const apex = iso(i + w / 2, j + d / 2, h + 22);
    const At = iso(i, j + d, h), Bt = iso(i + w, j + d, h), Ct = iso(i + w, j, h), Dt = iso(i, j, h);
    poly([Dt, Ct, apex], "#2C3150"); poly([At, Dt, apex], "#2C3150");
    poly([At, Bt, apex], "#252A45"); poly([Bt, Ct, apex], "#1D2138");
    glowLine(At, apex, rgba(C.amber, 0.8), 0.9, 6);
    glowLine(Bt, apex, rgba(C.amber, 0.8), 0.9, 6);
    glowLine(Ct, apex, rgba(C.amber, 0.8), 0.9, 6);
  }

  function drawPlot(b) {
    const { i, j, w, d } = b;
    drawBox(i + 1.2, j + 1.2, 1.8, 1.8, 0, 8, "#262A3E", "#1D2031", "#2E3349");
    // hologram of the next building
    const pulse = 0.35 + 0.2 * Math.sin(time * 2.2);
    const hf = boxFaces(i + 1.3, j + 1.3, 1.6, 1.6, 8, 96);
    ctx.save(); ctx.setLineDash([4, 3]); ctx.shadowColor = C.cyan; ctx.shadowBlur = 8;
    poly(hf.left, rgba(C.cyan, 0.06), rgba(C.cyan, pulse), 1);
    poly(hf.right, rgba(C.cyan, 0.04), rgba(C.cyan, pulse), 1);
    poly(hf.top, rgba(C.cyan, 0.08), rgba(C.cyan, pulse), 1);
    ctx.restore();
    const sv = (time * 0.35) % 1;
    glowLine(hf.L(0, sv), hf.L(1, sv), C.cyan, 1, 10);
    glowLine(hf.R(0, sv), hf.R(1, sv), C.cyan, 1, 10);
    // neon crane
    const mb = [i + 0.6, j + 0.6], MH = 130;
    const base = iso(...mb, 0), top = iso(...mb, MH);
    glowLine({ x: base.x - 2, y: base.y }, { x: top.x - 2, y: top.y }, C.amber, 1.6, 8);
    glowLine({ x: base.x + 2, y: base.y }, { x: top.x + 2, y: top.y }, C.amber, 1.6, 8);
    for (let z = 4; z < MH; z += 14) {
      const a = iso(...mb, z), c = iso(...mb, Math.min(MH, z + 14));
      line({ x: a.x - 2, y: a.y }, { x: c.x + 2, y: c.y }, rgba(C.amber, 0.6), 0.8);
    }
    const jibEnd = iso(i + w - 0.3, j + 0.6, MH), counter = iso(i - 0.4, j + 0.6, MH);
    const cab = iso(...mb, MH + 12);
    glowLine(counter, jibEnd, C.amber, 2, 10);
    line(top, cab, C.amber, 1.5);
    line(cab, jibEnd, rgba(C.amber, 0.6), 0.8); line(cab, counter, rgba(C.amber, 0.6), 0.8);
    ctx.fillStyle = "#3A3550"; ctx.fillRect(counter.x - 3, counter.y, 8, 7);
    const t = 0.45 + 0.25 * Math.sin(time * 0.6);
    const tr = { x: top.x + (jibEnd.x - top.x) * t, y: top.y + (jibEnd.y - top.y) * t };
    const hookY = tr.y + 52 + 5 * Math.sin(time * 0.9);
    line(tr, { x: tr.x, y: hookY }, rgba(C.amber, 0.7), 0.8);
    ctx.save(); ctx.shadowColor = C.amber; ctx.shadowBlur = 10;
    ctx.fillStyle = C.amber; ctx.fillRect(tr.x - 7, hookY, 14, 5);
    ctx.restore();
    const fence = (a, c) => {
      glowLine(iso(...a, 7), iso(...c, 7), C.amber, 1.2, 8);
      line(iso(...a, 3), iso(...c, 3), rgba(C.magenta, 0.7), 1);
    };
    fence([i, j + d], [i + w, j + d]);
    fence([i + w, j + d], [i + w, j]);
  }

  function drawTree(t) {
    const g = iso(t.i, t.j);
    ellipse(g.x, g.y, 9, 4, "rgba(0, 0, 0, 0.35)");
    ctx.fillStyle = "#2A2340"; ctx.fillRect(g.x - 1.5, g.y - 12, 3, 12);
    ctx.save(); ctx.shadowColor = "#19E3B1"; ctx.shadowBlur = 10;
    circle(g.x, g.y - 20, 10, "rgba(25, 227, 177, 0.5)");
    circle(g.x + 3, g.y - 26, 7, "rgba(120, 255, 220, 0.55)");
    ctx.restore();
  }

  function drawCar(c) {
    const [ci, cj] = carPos(c);
    const a = Math.max(0, Math.min(1, (c.pos - 0.3) / 0.8, (N - 0.3 - c.pos) / 0.8));
    if (a <= 0) return;
    const z = 14 + Math.sin(time * 3 + c.pos) * 1.5;
    const g = iso(ci, cj), body = iso(ci, cj, z);
    const back = carPos(c, c.pos - Math.sign(c.speed) * 1.1);
    const tail = iso(back[0], back[1], z);
    ctx.save(); ctx.globalAlpha = a;
    ellipse(g.x, g.y, 7, 3, rgba(c.col, 0.18));
    const grad = ctx.createLinearGradient(tail.x, tail.y, body.x, body.y);
    grad.addColorStop(0, rgba(c.col, 0)); grad.addColorStop(1, rgba(c.col, 0.8));
    ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(body.x, body.y);
    ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
    ctx.shadowColor = c.col; ctx.shadowBlur = 12;
    ellipse(body.x, body.y, 6.5, 3.2, "#1A1F35");
    ellipse(body.x, body.y + 1.6, 5, 1.4, c.col);
    ellipse(body.x, body.y - 1.4, 3, 1.4, "rgba(200, 240, 255, 0.85)");
    ctx.restore();
  }

  // ---------- drawing: modern human agents ----------
  function drawPerson(p) {
    const g = iso(p.i, p.j), x = g.x, y = g.y;
    const col = neon(p.agent), suit = "#222941";
    const bob = p.walking ? Math.abs(Math.sin(p.phase)) * 1.2 : Math.sin(time * 2 + p.i) * 0.4;
    const sw = p.walking ? Math.sin(p.phase) * 3 : 0;
    const f = p.dir;
    // glowing ring on the ground
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = p.task ? 12 : 6;
    ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(col, p.task ? 0.9 : 0.45); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // legs with light-up shoes
    line({ x: x - 1.5, y: y - 9 - bob }, { x: x - 1.5 + sw, y: y - 1 }, "#151A2C", 2.2);
    line({ x: x + 1.5, y: y - 9 - bob }, { x: x + 1.5 - sw, y: y - 1 }, "#151A2C", 2.2);
    circle(x - 1.5 + sw, y - 1, 1.2, col); circle(x + 1.5 - sw, y - 1, 1.2, col);
    // tapered jacket with neon seam
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 20 - bob); ctx.lineTo(x + 5, y - 20 - bob);
    ctx.lineTo(x + 3.4, y - 8.5 - bob); ctx.lineTo(x - 3.4, y - 8.5 - bob); ctx.closePath();
    ctx.fillStyle = suit; ctx.fill();
    glowLine({ x: x + f * 1.2, y: y - 19.5 - bob }, { x: x + f * 1.2, y: y - 9 - bob }, col, 1, 6);
    if (p.task) {
      // arm raised to a floating holographic screen
      line({ x: x + f * 4, y: y - 18 - bob }, { x: x + f * 8, y: y - 16 - bob }, suit, 2);
      const hx = x + f * 10, hy = y - 24 - bob + Math.sin(time * 3) * 0.6;
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(hx - 4, hy - 4); ctx.lineTo(hx + 4, hy - 5.5); ctx.lineTo(hx + 4, hy + 2.5); ctx.lineTo(hx - 4, hy + 4); ctx.closePath();
      ctx.fillStyle = rgba(col, 0.22); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
      line({ x: hx - 2.5, y: hy - 1.5 }, { x: hx + 2.5, y: hy - 2.3 }, rgba(col, 0.9), 0.6);
      line({ x: hx - 2.5, y: hy + 0.8 }, { x: hx + 1.5, y: hy + 0.2 }, rgba(col, 0.9), 0.6);
    } else {
      line({ x: x - 4, y: y - 18 - bob }, { x: x - 4 - sw * 0.6, y: y - 11 - bob }, suit, 1.8);
      line({ x: x + 4, y: y - 18 - bob }, { x: x + 4 + sw * 0.6, y: y - 11 - bob }, suit, 1.8);
    }
    // head with AR visor
    circle(x, y - 23.5 - bob, 3.8, p.skin);
    ctx.beginPath(); ctx.arc(x, y - 24.5 - bob, 4, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = p.hair; ctx.fill();
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.fillStyle = col;
    rrect(x - 3.2 + f * 0.8, y - 24.6 - bob, 6.4, 1.8, 0.9); ctx.fill();
    ctx.restore();
  }

  function silhouette(b) {
    const { i, j, w, d } = b, h = b.hitH;
    return [iso(i, j + d), iso(i + w, j + d), iso(i + w, j), iso(i + w, j, h), iso(i, j, h), iso(i, j + d, h)];
  }

  function drawBuilding(b) {
    ({ hospital: drawHospital, tower: drawTower, burjuman: drawBurjuman, house: drawHouse, plot: drawPlot })[b.kind](b);
    if (hover && hover.b === b && b.kind !== "burjuman") {
      const { i, j, w, d } = b;
      const pts = b.kind === "plot"
        ? [iso(i, j), iso(i + w, j), iso(i + w, j + d), iso(i, j + d)]
        : silhouette({ ...b, hitH: b.h + (b.kind === "hospital" ? 4 : 0) });
      outline(pts, neon(b.agent), 2, 16);
    }
  }

  // ---------- labels & speech bubbles (screen space) ----------
  function glassPill(x, y, w, h, r, col, hot) {
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = hot ? 18 : 10;
    ctx.fillStyle = hot ? col : "rgba(10, 14, 30, 0.9)";
    rrect(x, y, w, h, r); ctx.fill();
    ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeStyle = col; ctx.stroke();
    ctx.restore();
  }
  function drawLabels() {
    buildings.filter((b) => b.agent).forEach((b) => {
      const a = CFG.agents[b.agent], col = neon(b.agent);
      const p = toScreen(iso(b.i + b.w / 2, b.j + b.d / 2, b.labelZ));
      const hot = hover && hover.agent === b.agent;
      ctx.font = `600 13px ${FONT}`;
      const tw = ctx.measureText(a.label.toUpperCase()).width;
      ctx.font = `400 11px ${FONT}`;
      const sw = ctx.measureText(a.place).width;
      const bw = Math.max(tw, sw) + 26, bh = 40, bx = p.x - bw / 2, by = p.y - bh - 6;
      glassPill(bx, by, bw, bh, 8, col, hot);
      ctx.beginPath(); ctx.moveTo(p.x - 5, by + bh); ctx.lineTo(p.x + 5, by + bh); ctx.lineTo(p.x, by + bh + 6); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = hot ? "#0A0E1E" : C.ink; ctx.font = `600 13px ${FONT}`;
      ctx.fillText(a.label.toUpperCase(), p.x, by + 18);
      ctx.fillStyle = hot ? "rgba(10, 14, 30, 0.75)" : C.muted; ctx.font = `400 11px ${FONT}`;
      ctx.fillText(a.place, p.x, by + 32);
    });
  }

  function drawBubbles() {
    people.forEach((p) => {
      const isHover = hover && hover.p === p;
      if (!p.task && !isHover) return;
      const col = neon(p.agent);
      const head = toScreen(iso(p.i, p.j, 32));
      const text = p.task || `${p.name}, ${CFG.agents[p.agent].title}`;
      ctx.font = `400 12px ${FONT}`;
      const tw = ctx.measureText(text).width;
      const bw = tw + 22, bh = p.task ? 44 : 28, bx = head.x - bw / 2, by = head.y - bh - 8;
      glassPill(bx, by, bw, bh, 8, col, false);
      ctx.beginPath(); ctx.moveTo(head.x - 5, by + bh); ctx.lineTo(head.x + 5, by + bh); ctx.lineTo(head.x, by + bh + 6); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      if (p.task) {
        ctx.fillStyle = col; ctx.font = `600 11px ${FONT}`;
        ctx.fillText(p.name.toUpperCase(), bx + 11, by + 16);
        ctx.fillStyle = C.ink; ctx.font = `400 12px ${FONT}`;
        ctx.fillText(text, bx + 11, by + 31);
        const prog = 1 - Math.max(0, p.wait) / p.waitTotal;
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; ctx.fillRect(bx + 11, by + 37, bw - 22, 2.5);
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 8;
        ctx.fillStyle = col; ctx.fillRect(bx + 11, by + 37, (bw - 22) * prog, 2.5);
        ctx.restore();
      } else {
        ctx.fillStyle = C.ink; ctx.fillText(text, bx + 11, by + 18);
      }
    });
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    drawGround();
    const items = [];
    buildings.forEach((b) => items.push({ k: b.i + b.j + (b.w + b.d) / 2, fn: () => drawBuilding(b) }));
    trees.forEach((t) => items.push({ k: t.i + t.j, fn: () => drawTree(t) }));
    people.forEach((p) => items.push({ k: p.i + p.j, fn: () => drawPerson(p) }));
    cars.forEach((c) => { const [i, j] = carPos(c); items.push({ k: i + j + 0.2, fn: () => drawCar(c) }); });
    items.sort((a, b) => a.k - b.k).forEach((it) => it.fn());
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLabels();
    drawBubbles();
  }

  // ---------- activity feed & counters ----------
  const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  function logTask(p) {
    tasksDone++;
    document.getElementById("count-tasks").textContent = tasksDone;
    feed.unshift({
      name: p.name, color: neon(p.agent), task: p.task,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    });
    feed.length = Math.min(feed.length, 5);
    renderFeed();
  }
  function renderFeed() {
    const ul = document.getElementById("feed-list");
    ul.replaceChildren();
    if (!feed.length) {
      const li = document.createElement("li");
      li.textContent = "Agents are starting their first tasks.";
      ul.append(li);
      return;
    }
    feed.forEach((f) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      const who = document.createElement("span");
      who.className = "who"; who.style.setProperty("--c", f.color); who.textContent = f.name;
      span.append(who, ` finished ${lcFirst(f.task)}`);
      const t = document.createElement("time"); t.textContent = f.time;
      li.append(span, t);
      ul.append(li);
    });
  }

  // ---------- side panel ----------
  const panel = document.getElementById("panel");
  function openPanel(agentId, p) {
    const a = CFG.agents[agentId];
    if (!a) return;
    panel.style.setProperty("--c", neon(agentId));
    panel.querySelector(".place").textContent = a.place;
    panel.querySelector("h2").textContent = a.title;
    panel.querySelector(".desc").textContent = a.description;
    const status = panel.querySelector(".status");
    status.classList.toggle("planned", !!a.comingSoon);
    status.querySelector(".status-text").textContent = a.status;

    const now = panel.querySelector(".now");
    now.hidden = !p;
    if (p) now.textContent = p.task ? `${p.name} is ${lcFirst(p.task)}.` : `${p.name} is walking to the next task.`;

    const dl = panel.querySelector(".stats");
    dl.replaceChildren();
    (a.stats || []).forEach(([k, v]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      row.append(dt, dd); dl.append(row);
    });
    const note = panel.querySelector(".note");
    note.hidden = !(a.stats && a.stats.length);
    note.textContent = CFG.statsNote || "";

    let missing = false;
    panel.querySelector(".actions").hidden = !!a.comingSoon;
    panel.querySelectorAll(".actions a").forEach((link) => {
      const url = a[link.dataset.kind];
      if (url) { link.href = url; link.removeAttribute("aria-disabled"); }
      else { link.removeAttribute("href"); link.setAttribute("aria-disabled", "true"); missing = true; }
    });
    panel.querySelector(".hint").hidden = !missing || !!a.comingSoon;

    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("open"));
    panel.querySelector(".close").focus();
  }
  function closePanel() {
    panel.classList.remove("open");
    setTimeout(() => { if (!panel.classList.contains("open")) panel.hidden = true; }, 220);
  }
  panel.querySelector(".close").addEventListener("click", closePanel);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  const nav = document.getElementById("agent-buttons");
  Object.entries(CFG.agents).forEach(([id, a]) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = a.label; btn.style.setProperty("--c", neon(id));
    btn.addEventListener("click", () => openPanel(id));
    nav.append(btn);
  });

  // ---------- pointer ----------
  function hitTest(sx, sy) {
    const w = toWorld(sx, sy);
    const ps = [...people].sort((a, b) => b.i + b.j - (a.i + a.j));
    for (const p of ps) {
      const g = iso(p.i, p.j);
      if (Math.hypot(w.x - g.x, w.y - (g.y - 13)) < 12) return { p, agent: p.agent };
    }
    const bs = buildings.filter((b) => b.agent).sort((a, b) => b.i + b.j - (a.i + a.j));
    for (const b of bs) if (inPoly(w, silhouette(b))) return { b, agent: b.agent };
    return null;
  }
  function pointerPos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  canvas.addEventListener("pointermove", (e) => {
    hover = hitTest(...pointerPos(e));
    canvas.style.cursor = hover ? "pointer" : "default";
  });
  canvas.addEventListener("pointerleave", () => { hover = null; });
  canvas.addEventListener("click", (e) => {
    const hit = hitTest(...pointerPos(e));
    if (hit) openPanel(hit.agent, hit.p);
    else closePanel();
  });

  // ---------- sizing & loop ----------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const top = -330, bottom = N * TH + 20, half = (N * TW) / 2;
    const narrow = W < 760;
    const usableH = narrow ? H - 120 : H;
    scale = Math.min(W / (half * 2 + 40), usableH / (bottom - top + 40));
    ox = W / 2;
    oy = (narrow ? 120 : 0) + usableH / 2 - ((top + bottom) / 2) * scale;
  }
  window.addEventListener("resize", resize);

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; time += dt;
    people.forEach((p) => updatePerson(p, dt));
    cars.forEach((c) => updateCar(c, dt));
    draw();
    requestAnimationFrame(frame);
  }

  document.getElementById("count-agents").textContent = people.length;
  renderFeed();
  resize();
  requestAnimationFrame(frame);
})();
