/* ===== rendering, overlay, hit-testing ===== */
const stage = () => $('#stage');
const toW = (sx, sy) => ({ x: (sx - S.view.x) / S.view.s, y: (sy - S.view.y) / S.view.s });
const toS = (x, y) => [x * S.view.s + S.view.x, y * S.view.s + S.view.y];
const sn = v => S.snap ? Math.round(v / doc.grid) * doc.grid : v;
const snapPt = p => ({ x: sn(p.x), y: sn(p.y) });

function dashArr(o) {
  const w = Math.max(o.sw || 1, 1);
  if (o.dash === 'dash') return [w * 3, w * 2];
  if (o.dash === 'dot') return [0.01, w * 2];
  return null;
}

function objSvg(o, opt) {
  opt = opt || {};
  const id = opt.ids ? ` data-id="${o.id}"` : '';
  const op = o.op != null && o.op < 1 ? ` opacity="${N(o.op)}"` : '';
  if (o.type === 'group') return `<g${id}${op}>${o.children.map(c => objSvg(c, {})).join('')}</g>`;
  let defs = '', fill = 'none';
  if (o.grad) {
    const b = bbox(o), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, a = o.grad.a * Math.PI / 180;
    const half = (Math.abs((b[2] - b[0]) * Math.cos(a)) + Math.abs((b[3] - b[1]) * Math.sin(a))) / 2 || 1;
    defs = `<linearGradient id="g_${o.id}" gradientUnits="userSpaceOnUse" x1="${N(cx - Math.cos(a) * half)}" y1="${N(cy - Math.sin(a) * half)}" x2="${N(cx + Math.cos(a) * half)}" y2="${N(cy + Math.sin(a) * half)}"><stop offset="0" stop-color="${o.grad.c1}"/><stop offset="1" stop-color="${o.grad.c2}"/></linearGradient>`;
    fill = `url(#g_${o.id})`;
  } else if (o.fill) fill = o.fill;
  let stroke = '';
  if (o.stroke && o.sw > 0) {
    stroke = ` stroke="${o.stroke}" stroke-width="${N(o.sw)}" stroke-linecap="${o.cap || 'butt'}" stroke-linejoin="${o.join || 'miter'}"`;
    const d = dashArr(o); if (d) stroke += ` stroke-dasharray="${d.map(N).join(' ')}"`;
  }
  if (o.type === 'text') {
    const rot = o.rot ? ` transform="rotate(${N(o.rot)} ${N(o.x)} ${N(o.y)})"` : '';
    const lines = textLines(o).map((l, i) => `<tspan x="${N(o.x)}" dy="${i ? N(o.size * 1.2) : 0}">${esc(l) || ' '}</tspan>`).join('');
    return `<g${id}${op}>${defs}<text x="${N(o.x)}" y="${N(o.y)}" font-family="${esc(FONTS[o.font] || FONTS.sans)}" font-size="${N(o.size)}"${o.bold ? ' font-weight="bold"' : ''}${o.italic ? ' font-style="italic"' : ''} fill="${fill}"${stroke}${rot} xml:space="preserve">${lines}</text></g>`;
  }
  const d = o.sub.map(pathD).join('');
  return `<g${id}${op}>${defs}<path d="${d}" fill="${fill}"${o.rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}${stroke}/></g>`;
}

function docSvg(opts) {
  opts = opts || {};
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.w}" height="${doc.h}" viewBox="0 0 ${doc.w} ${doc.h}">`;
  if (opts.bg) s += `<rect width="${doc.w}" height="${doc.h}" fill="${doc.bg}"/>`;
  doc.layers.forEach((L, i) => {
    if (!L.visible) return;
    s += `<g id="Layer_${i + 1}" data-name="${esc(L.name)}">${L.objs.map(o => objSvg(o, {})).join('')}</g>`;
  });
  return s + '</svg>';
}

function draftObj() {
  if (S.draft) return S.draft;
  if (S.pen && S.pen.pts.length) {
    const pts = S.pen.pts.concat(S.pen.tmp ? [S.pen.tmp] : []);
    return { id: 'draft', type: 'path', sub: [{ closed: !!S.pen.closed, pts }], fill: null, grad: null, stroke: S.style.stroke || '#4c8dff', sw: Math.max(S.style.sw, 1), cap: 'round', join: 'round', dash: 'none', op: 1, rule: 'nonzero' };
  }
  return null;
}

let rafPending = false;
function render() { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; renderNow(); }); }
function renderNow() {
  const v = S.view;
  $('#world').setAttribute('transform', `translate(${N(v.x)} ${N(v.y)}) scale(${N(v.s)})`);
  const board = $('#board'); board.setAttribute('width', doc.w); board.setAttribute('height', doc.h); board.setAttribute('fill', doc.bg);
  const sh = $('#shadow'); sh.setAttribute('width', doc.w); sh.setAttribute('height', doc.h);
  const grid = $('#gridrect');
  if (S.showGrid) {
    grid.setAttribute('width', doc.w); grid.setAttribute('height', doc.h); grid.style.display = '';
    const pt = $('#gridpat'); pt.setAttribute('width', doc.grid); pt.setAttribute('height', doc.grid);
    $('#gridpath').setAttribute('d', `M${doc.grid} 0H0V${doc.grid}`);
    $('#gridpath').setAttribute('stroke-width', N(1 / v.s));
  } else grid.style.display = 'none';
  const parts = [];
  doc.layers.forEach(L => { if (L.visible) L.objs.forEach(o => parts.push(objSvg(o, { ids: true }))); });
  const dr = draftObj(); if (dr) parts.push(objSvg(dr, {}));
  $('#content').innerHTML = parts.join('');
  drawOverlay();
}

/* ---- overlay (screen-space UI) ---- */
const HS = 6;
const sq = (x, y, fill, extra) => `<rect x="${N(x - HS)}" y="${N(y - HS)}" width="${HS * 2}" height="${HS * 2}" fill="${fill}" stroke="#4c8dff" stroke-width="1.5" ${extra || ''}/>`;
const ci = (x, y, r, fill) => `<circle cx="${N(x)}" cy="${N(y)}" r="${r}" fill="${fill}" stroke="#4c8dff" stroke-width="1.5"/>`;

function handleList(b) {
  const [x0, y0, x1, y1] = b, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return [['nw', x0, y0], ['n', mx, y0], ['ne', x1, y0], ['e', x1, my], ['se', x1, y1], ['s', mx, y1], ['sw', x0, y1], ['w', x0, my]];
}

function drawOverlay() {
  let h = '';
  const a = S.act;
  if ((S.tool === 'select') && S.sel.length) {
    const b = selBox();
    if (b) {
      const [x0, y0] = toS(b[0], b[1]), [x1, y1] = toS(b[2], b[3]);
      h += `<rect x="${N(x0)}" y="${N(y0)}" width="${N(x1 - x0)}" height="${N(y1 - y0)}" fill="none" stroke="#4c8dff" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      handleList(b).forEach(hd => { const [px, py] = toS(hd[1], hd[2]); h += sq(px, py, '#fff'); });
      const [tx, ty] = toS((b[0] + b[2]) / 2, b[1]);
      h += `<line x1="${N(tx)}" y1="${N(ty)}" x2="${N(tx)}" y2="${N(ty - 30)}" stroke="#4c8dff"/>` + ci(tx, ty - 30, 7, '#fff');
    }
  }
  if (['direct', 'addpt', 'delpt', 'convert'].includes(S.tool)) {
    selObjs().forEach(o => {
      if (o.type !== 'path') return;
      h += `<path d="${o.sub.map(s => pathDS(s)).join('')}" fill="none" stroke="#4c8dff" stroke-width="1.2"/>`;
      o.sub.forEach((s, si) => s.pts.forEach((p, pi) => {
        const sel = S.anchors.has(`${o.id}|${si}|${pi}`);
        const [px, py] = toS(p.x, p.y);
        if (sel) {
          [[p.ix, p.iy], [p.ox, p.oy]].forEach(([hx, hy]) => {
            if (hx === p.x && hy === p.y) return;
            const [qx, qy] = toS(hx, hy);
            h += `<line x1="${N(px)}" y1="${N(py)}" x2="${N(qx)}" y2="${N(qy)}" stroke="#4c8dff"/>` + ci(qx, qy, 5, '#fff');
          });
        }
        h += sq(px, py, sel ? '#4c8dff' : '#fff');
      }));
    });
  }
  if (S.pen) {
    S.pen.pts.forEach((p, i) => {
      const [px, py] = toS(p.x, p.y);
      if (hasH(p) && i === S.pen.pts.length - 1) {
        [[p.ix, p.iy], [p.ox, p.oy]].forEach(([hx, hy]) => { const [qx, qy] = toS(hx, hy); h += `<line x1="${N(px)}" y1="${N(py)}" x2="${N(qx)}" y2="${N(qy)}" stroke="#ff7a1a"/>` + ci(qx, qy, 4, '#fff'); });
      }
      h += sq(px, py, i === 0 ? '#ff7a1a' : '#fff');
    });
    const t = S.pen.tmp;
    if (t) {
      const [px, py] = toS(t.x, t.y);
      if (hasH(t)) [[t.ix, t.iy], [t.ox, t.oy]].forEach(([hx, hy]) => { const [qx, qy] = toS(hx, hy); h += `<line x1="${N(px)}" y1="${N(py)}" x2="${N(qx)}" y2="${N(qy)}" stroke="#ff7a1a"/>` + ci(qx, qy, 4, '#fff'); });
      h += sq(px, py, '#ff7a1a');
    }
  }
  if (a && a.type === 'marquee') {
    const x = Math.min(a.sx, a.cx), y = Math.min(a.sy, a.cy), w = Math.abs(a.cx - a.sx), hh = Math.abs(a.cy - a.sy);
    h += `<rect x="${N(x)}" y="${N(y)}" width="${N(w)}" height="${N(hh)}" fill="rgba(76,141,255,.15)" stroke="#4c8dff" stroke-dasharray="4 3"/>`;
  }
  $('#ovl').innerHTML = h;
}
function pathDS(sub) { // path in screen coords
  const c = JSON.parse(JSON.stringify(sub));
  c.pts.forEach(p => { [p.x, p.y] = toS(p.x, p.y); [p.ix, p.iy] = toS(p.ix, p.iy); [p.ox, p.oy] = toS(p.ox, p.oy); });
  return pathD(c);
}

/* ---- view helpers ---- */
function fitView() {
  const r = stage().getBoundingClientRect(), pad = 24;
  const s = Math.min((r.width - pad * 2) / doc.w, (r.height - pad * 2) / doc.h);
  S.view.s = clamp(s, 0.02, 64);
  S.view.x = (r.width - doc.w * S.view.s) / 2; S.view.y = (r.height - doc.h * S.view.s) / 2;
  render(); uiZoom();
}
function zoomAt(f, sx, sy) {
  const r = stage().getBoundingClientRect();
  if (sx == null) { sx = r.width / 2; sy = r.height / 2; }
  const w = toW(sx, sy), ns = clamp(S.view.s * f, 0.02, 64);
  S.view.s = ns; S.view.x = sx - w.x * ns; S.view.y = sy - w.y * ns;
  render(); uiZoom();
}

/* ---- hit testing ---- */
function pathHit(el, p, tolW) {
  const fill = el.getAttribute('fill');
  if (fill && fill !== 'none' && el.isPointInFill(p)) return true;
  const sw0 = el.getAttribute('stroke-width'), st0 = el.getAttribute('stroke'), da0 = el.getAttribute('stroke-dasharray');
  const sw = parseFloat(sw0) || 0;
  el.setAttribute('stroke', '#000'); el.setAttribute('stroke-width', Math.max(sw, tolW * 2)); el.removeAttribute('stroke-dasharray');
  const r = el.isPointInStroke(p);
  if (st0 == null) el.removeAttribute('stroke'); else el.setAttribute('stroke', st0);
  if (sw0 == null) el.removeAttribute('stroke-width'); else el.setAttribute('stroke-width', sw0);
  if (da0 != null) el.setAttribute('stroke-dasharray', da0);
  return r;
}
function objHit(o, w, tolW) {
  if (o.type === 'text') { const b = textBox(o); return w.x >= b[0] - tolW && w.x <= b[2] + tolW && w.y >= b[1] - tolW && w.y <= b[3] + tolW; }
  const g = $(`#content [data-id="${o.id}"]`);
  if (!g) return false;
  const pt = new DOMPoint(w.x, w.y);
  return $$('path', g).some(el => pathHit(el, pt, tolW));
}
function hitObj(w, tolPx) {
  const tol = (tolPx || 12) / S.view.s;
  for (let li = doc.layers.length - 1; li >= 0; li--) {
    const L = doc.layers[li]; if (!L.visible || L.locked) continue;
    for (let i = L.objs.length - 1; i >= 0; i--) if (objHit(L.objs[i], w, tol)) return { o: L.objs[i], li };
  }
  return null;
}

/* ---- segment helpers ---- */
function nearestSeg(o, w) {
  let best = null;
  o.sub.forEach((s, si) => {
    const n = s.pts.length, segs = s.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = s.pts[i], b = s.pts[(i + 1) % n];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40, [x, y] = bez(a, b, t), d = Math.hypot(x - w.x, y - w.y);
        if (!best || d < best.d) best = { si, i, t, d };
      }
    }
  });
  return best;
}
function splitSeg(sub, i, t) {
  const n = sub.pts.length, a = sub.pts[i], b = sub.pts[(i + 1) % n];
  const L = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const p0 = [a.x, a.y], p1 = [a.ox, a.oy], p2 = [b.ix, b.iy], p3 = [b.x, b.y];
  const p01 = L(p0, p1), p12 = L(p1, p2), p23 = L(p2, p3), p012 = L(p01, p12), p123 = L(p12, p23), m = L(p012, p123);
  a.ox = p01[0]; a.oy = p01[1]; b.ix = p23[0]; b.iy = p23[1];
  sub.pts.splice(i + 1, 0, { x: m[0], y: m[1], ix: p012[0], iy: p012[1], ox: p123[0], oy: p123[1], s: true });
}
function makeSmooth(sub, pi) {
  const n = sub.pts.length, p = sub.pts[pi];
  const prev = sub.pts[pi - 1] || (sub.closed ? sub.pts[n - 1] : null), next = sub.pts[pi + 1] || (sub.closed ? sub.pts[0] : null);
  let dx, dy;
  if (prev && next) { dx = next.x - prev.x; dy = next.y - prev.y; }
  else if (next) { dx = next.x - p.x; dy = next.y - p.y; }
  else if (prev) { dx = p.x - prev.x; dy = p.y - prev.y; }
  else return;
  const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const dp = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) / 3 : len / 6, dn = next ? Math.hypot(next.x - p.x, next.y - p.y) / 3 : len / 6;
  p.ix = p.x - ux * dp; p.iy = p.y - uy * dp; p.ox = p.x + ux * dn; p.oy = p.y + uy * dn; p.s = true;
}
function makeCorner(p) { p.ix = p.x; p.iy = p.y; p.ox = p.x; p.oy = p.y; p.s = false; }
