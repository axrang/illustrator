/* ===== tools & pointer interaction ===== */

/* ---- object factories ---- */
function mkPath(sub, o) {
  o = o || {}; const st = S.style, hasFill = o.fill !== false;
  const stroke = st.stroke || (hasFill ? null : '#16181d');
  return { id: nid(), type: 'path', name: o.name || 'مسیر', sub, fill: hasFill ? st.fill : null, grad: hasFill && st.grad ? { ...st.grad } : null,
    stroke, sw: st.sw, cap: st.cap, join: st.join, dash: st.dash, op: st.op, rule: st.rule };
}
function addObj(o) {
  const L = doc.layers[S.cur];
  if (!L || L.locked || !L.visible) { toast('لایه فعال قفل یا مخفی است'); return false; }
  L.objs.push(o); S.sel = [o.id]; S.anchors.clear(); return true;
}
function rectSub(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); const x1 = x + w, y1 = y + h;
  if (r <= 0.01) return { closed: true, pts: [P(x, y), P(x1, y), P(x1, y1), P(x, y1)] };
  const k = r * (1 - KAPPA), q = (px, py, ix, iy, ox, oy) => ({ x: px, y: py, ix, iy, ox, oy, s: false });
  return { closed: true, pts: [
    q(x + r, y, x + k, y, x + r, y), q(x1 - r, y, x1 - r, y, x1 - k, y), q(x1, y + r, x1, y + k, x1, y + r), q(x1, y1 - r, x1, y1 - r, x1, y1 - k),
    q(x1 - r, y1, x1 - k, y1, x1 - r, y1), q(x + r, y1, x + r, y1, x + k, y1), q(x, y1 - r, x, y1 - k, x, y1 - r), q(x, y + r, x, y + r, x, y + k)] };
}
function ellipseSub(cx, cy, rx, ry) {
  const kx = rx * KAPPA, ky = ry * KAPPA, q = (px, py, ix, iy, ox, oy) => ({ x: px, y: py, ix, iy, ox, oy, s: true });
  return { closed: true, pts: [q(cx, cy - ry, cx - kx, cy - ry, cx + kx, cy - ry), q(cx + rx, cy, cx + rx, cy - ky, cx + rx, cy + ky),
    q(cx, cy + ry, cx + kx, cy + ry, cx - kx, cy + ry), q(cx - rx, cy, cx - rx, cy + ky, cx - rx, cy - ky)] };
}
function polySub(cx, cy, r, n, inner, rot) {
  const pts = [], cnt = inner ? n * 2 : n;
  for (let i = 0; i < cnt; i++) {
    const a = rot + i * 2 * Math.PI / cnt, rr = inner && i % 2 ? r * inner : r;
    pts.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  return { closed: true, pts };
}
function mkShape(tool, a, b, con) {
  let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
  if (tool === 'line') {
    if (con) { const ang = Math.round(Math.atan2(y1 - y0, x1 - x0) / (Math.PI / 4)) * Math.PI / 4, d = Math.hypot(x1 - x0, y1 - y0); x1 = x0 + Math.cos(ang) * d; y1 = y0 + Math.sin(ang) * d; }
    return mkPath([{ closed: false, pts: [P(x0, y0), P(x1, y1)] }], { fill: false, name: 'خط' });
  }
  if (tool === 'polygon' || tool === 'star') {
    const r = Math.hypot(x1 - x0, y1 - y0);
    const rot = con ? -Math.PI / 2 : Math.atan2(y1 - y0, x1 - x0);
    return mkPath([tool === 'star' ? polySub(x0, y0, r, S.opt.points, S.opt.inner, rot) : polySub(x0, y0, r, S.opt.sides, 0, rot)], { name: tool === 'star' ? 'ستاره' : 'چندضلعی' });
  }
  let w = x1 - x0, h = y1 - y0;
  if (con) { const m = Math.max(Math.abs(w), Math.abs(h)); w = (w < 0 ? -1 : 1) * m; h = (h < 0 ? -1 : 1) * m; }
  const x = Math.min(x0, x0 + w), y = Math.min(y0, y0 + h), W = Math.abs(w), H = Math.abs(h);
  if (tool === 'ellipse') return mkPath([ellipseSub(x + W / 2, y + H / 2, W / 2, H / 2)], { name: 'بیضی' });
  return mkPath([rectSub(x, y, W, H, S.opt.radius)], { name: 'مستطیل' });
}

/* ---- freehand smoothing ---- */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  let mx = 0, mi = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > mx) { mx = d; mi = i; } }
  if (mx > eps) { const l = rdp(pts.slice(0, mi + 1), eps), r = rdp(pts.slice(mi), eps); return l.slice(0, -1).concat(r); }
  return [pts[0], pts[pts.length - 1]];
}
function fitCurve(raw, closed) {
  let pts = raw.map((p, i) => {
    if (i === 0 || i === raw.length - 1) return p;
    return [(raw[i - 1][0] + p[0] + raw[i + 1][0]) / 3, (raw[i - 1][1] + p[1] + raw[i + 1][1]) / 3];
  });
  pts = rdp(pts, 2.2 / S.view.s);
  const n = pts.length, out = pts.map(p => P(p[0], p[1], true));
  out.forEach((p, i) => {
    const prev = out[i - 1] || (closed ? out[n - 1] : null), next = out[i + 1] || (closed ? out[0] : null);
    if (!prev || !next) {
      makeCorner(p);
      if (next) { p.ox = p.x + (next.x - p.x) / 3; p.oy = p.y + (next.y - p.y) / 3; }
      else if (prev) { p.ix = p.x + (prev.x - p.x) / 3; p.iy = p.y + (prev.y - p.y) / 3; }
      return;
    }
    const dx = next.x - prev.x, dy = next.y - prev.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const d1 = Math.hypot(p.x - prev.x, p.y - prev.y) / 3, d2 = Math.hypot(next.x - p.x, next.y - p.y) / 3;
    p.ix = p.x - ux * d1; p.iy = p.y - uy * d1; p.ox = p.x + ux * d2; p.oy = p.y + uy * d2;
  });
  return { closed, pts: out };
}

/* ---- pen ---- */
function penStart() { if (!S.pen) S.pen = { pts: [], tmp: null, closed: false }; }
function finishPen(keep) {
  const p = S.pen; S.pen = null;
  if (p && keep !== false && p.pts.length >= 2) {
    const o = mkPath([{ closed: p.closed, pts: p.pts }], { fill: p.closed });
    if (!p.closed) { o.fill = null; o.grad = null; }
    if (addObj(o)) commit();
  }
  render(); uiRefresh();
}
function penUndoPoint() { if (S.pen) { S.pen.pts.pop(); if (!S.pen.pts.length) S.pen = null; render(); uiRefresh(); } }

/* ---- selection helpers ---- */
function setSel(ids, keepAnch) {
  S.sel = ids; if (!keepAnch) S.anchors.clear();
  if (ids.length) { const r = findObj(ids[0]); if (r) S.cur = r.li; }
  syncStyleFromSel(); uiRefresh();
}
function syncStyleFromSel() {
  const o = selObjs()[0]; if (!o) return;
  let p = o; while (p && p.type === 'group') p = p.children[0];
  if (!p) return;
  const st = S.style;
  st.fill = p.fill || null; st.grad = p.grad ? { ...p.grad } : null; st.stroke = p.stroke || null;
  if (p.sw != null) st.sw = p.sw;
  if (p.cap) st.cap = p.cap; if (p.join) st.join = p.join; if (p.dash) st.dash = p.dash; if (p.rule) st.rule = p.rule;
  st.op = o.op != null ? o.op : 1;
  if (p.type === 'text') { S.opt.size = p.size; S.opt.font = p.font; S.opt.bold = !!p.bold; S.opt.italic = !!p.italic; }
}
function lockedIds() { return new Set(doc.layers.filter(l => l.locked).flatMap(l => l.objs.map(o => o.id))); }

/* ---- pointer plumbing ---- */
const ptrs = new Map();
let pinch = null, pinching = false, startDoc = null;
const HIT = 22;

function installPointer() {
  const st = stage();
  const pos = e => { const r = st.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  st.addEventListener('pointerdown', e => {
    e.preventDefault(); try { st.setPointerCapture(e.pointerId); } catch (x) { }
    ptrs.set(e.pointerId, pos(e));
    if (ptrs.size === 2) { cancelAct(); pinching = true; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, v: { ...S.view } }; return; }
    if (ptrs.size > 2 || pinching) return;
    startDoc = null; onDown(pos(e), e);
  });
  st.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, pos(e));
    if (pinching) {
      if (ptrs.size >= 2 && pinch) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        const s = clamp(pinch.v.s * d / pinch.d, 0.02, 64), wx = (pinch.cx - pinch.v.x) / pinch.v.s, wy = (pinch.cy - pinch.v.y) / pinch.v.s;
        S.view.s = s; S.view.x = cx - wx * s; S.view.y = cy - wy * s; render(); uiZoom();
      }
      return;
    }
    onMove(pos(e), e);
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return;
    const was = pinching; ptrs.delete(e.pointerId);
    if (was) { if (ptrs.size === 0) { pinching = false; pinch = null; } return; }
    onUp(pos(e), e);
  };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
}
function cancelAct() {
  if (startDoc) { doc = JSON.parse(startDoc); S.sel = S.sel.filter(id => findObj(id)); }
  S.act = null; S.draft = null; if (S.pen) S.pen.tmp = null;
  startDoc = null; render();
}

/* ---- hit helpers for anchors ---- */
function anchorHit(sp, objs, wantHandles) {
  for (let k = objs.length - 1; k >= 0; k--) {
    const o = objs[k]; if (o.type !== 'path') continue;
    for (let si = 0; si < o.sub.length; si++) {
      const pts = o.sub[si].pts;
      for (let pi = pts.length - 1; pi >= 0; pi--) {
        const p = pts[pi], key = `${o.id}|${si}|${pi}`;
        if (wantHandles && S.anchors.has(key)) {
          for (const [kind, hx, hy] of [['out', p.ox, p.oy], ['in', p.ix, p.iy]]) {
            if (hx === p.x && hy === p.y) continue;
            const [qx, qy] = toS(hx, hy); if (Math.hypot(qx - sp.x, qy - sp.y) < HIT) return { kind, o, si, pi, key };
          }
        }
      }
      for (let pi = pts.length - 1; pi >= 0; pi--) {
        const p = pts[pi], [qx, qy] = toS(p.x, p.y);
        if (Math.hypot(qx - sp.x, qy - sp.y) < HIT) return { kind: 'a', o, si, pi, key: `${o.id}|${si}|${pi}` };
      }
    }
  }
  return null;
}
function allPathObjs() { const out = []; doc.layers.forEach(L => { if (L.visible && !L.locked) L.objs.forEach(o => { if (o.type === 'path') out.push(o); }); }); return out; }

/* ---- DOWN ---- */
function onDown(sp, e) {
  const w = toW(sp.x, sp.y), t = S.tool, con = S.constrain;
  S.act = { sx: sp.x, sy: sp.y, cx: sp.x, cy: sp.y, start: w, moved: false, last: w };
  const A = S.act;
  if (t === 'hand') { A.type = 'pan'; A.v = { ...S.view }; return; }
  if (t === 'select') {
    const objs = selObjs();
    if (objs.length) {
      const b = selBox();
      if (b) {
        const [tx, ty] = toS((b[0] + b[2]) / 2, b[1]);
        if (Math.hypot(sp.x - tx, sp.y - (ty - 30)) < HIT) {
          startDoc = JSON.stringify(doc); A.type = 'rotate'; A.cl = objs.map(clone); A.c = { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 };
          A.a0 = Math.atan2(w.y - A.c.y, w.x - A.c.x); return;
        }
        for (const hd of handleList(b)) {
          const [px, py] = toS(hd[1], hd[2]);
          if (Math.hypot(sp.x - px, sp.y - py) < HIT) { startDoc = JSON.stringify(doc); A.type = 'scale'; A.h = hd[0]; A.b = b; A.cl = objs.map(clone); return; }
        }
      }
    }
    const hit = hitObj(w, 14);
    if (hit) {
      if (S.multi) {
        if (S.sel.includes(hit.o.id)) { setSel(S.sel.filter(i => i !== hit.o.id)); S.act = null; render(); return; }
        setSel(S.sel.concat(hit.o.id));
      } else if (!S.sel.includes(hit.o.id)) setSel([hit.o.id]);
      startDoc = JSON.stringify(doc); A.type = 'move'; A.dx = 0; A.dy = 0; A.b0 = selBox(); render(); return;
    }
    if (!S.multi) setSel([]);
    A.type = 'marquee'; render(); return;
  }
  if (t === 'direct') {
    const objs = selObjs().filter(o => o.type === 'path');
    const h = anchorHit(sp, objs, true);
    if (h) {
      startDoc = JSON.stringify(doc);
      if (h.kind === 'a') {
        if (!S.anchors.has(h.key)) { if (!S.multi) S.anchors.clear(); S.anchors.add(h.key); }
        else if (S.multi) { S.anchors.delete(h.key); S.act = null; render(); uiRefresh(); return; }
        A.type = 'anchor'; A.lastW = w; A.base = S.snap ? { x: h.o.sub[h.si].pts[h.pi].x, y: h.o.sub[h.si].pts[h.pi].y } : null; A.tot = { x: 0, y: 0 };
      } else { A.type = 'handle'; A.h = h; }
      render(); uiRefresh(); return;
    }
    const hit = hitObj(w, 14);
    if (hit && hit.o.type === 'path') {
      const wasSel = S.sel.includes(hit.o.id);
      if (!wasSel) { setSel([hit.o.id]); }
      const ns = nearestSeg(hit.o, w);
      if (wasSel && ns && ns.d * S.view.s < 18) { startDoc = JSON.stringify(doc); A.type = 'seg'; A.o = hit.o; A.ns = ns; A.cl = clone(hit.o); }
      else { startDoc = JSON.stringify(doc); A.type = 'move'; A.dx = 0; A.dy = 0; A.b0 = selBox(); }
      render(); return;
    }
    if (hit && hit.o.type === 'group') toast('گروه را با «خروج از گروه» باز کنید تا نقاط قابل ویرایش شوند');
    A.type = 'marquee'; if (!S.multi) { S.anchors.clear(); } render(); return;
  }
  if (t === 'pen') {
    penStart(); const p = snapPt(w), pen = S.pen;
    if (pen.pts.length >= 2) { const f0 = pen.pts[0], [fx, fy] = toS(f0.x, f0.y); if (Math.hypot(fx - sp.x, fy - sp.y) < HIT) { A.type = 'penclose'; render(); return; } }
    A.type = 'pen'; pen.tmp = P(p.x, p.y); render(); return;
  }
  if (t === 'addpt') {
    let objs = selObjs().filter(o => o.type === 'path'); if (!objs.length) { const h = hitObj(w, 20); if (h && h.o.type === 'path') { setSel([h.o.id]); objs = [h.o]; } }
    let best = null; objs.forEach(o => { const ns = nearestSeg(o, w); if (ns && (!best || ns.d < best.ns.d)) best = { o, ns }; });
    if (best && best.ns.d * S.view.s < 26) {
      splitSeg(best.o.sub[best.ns.si], best.ns.i, clamp(best.ns.t, 0.02, 0.98)); S.anchors.clear();
      const pi = best.ns.i + 1; S.anchors.add(`${best.o.id}|${best.ns.si}|${pi}`); commit(); render();
    }
    S.act = null; return;
  }
  if (t === 'delpt' || t === 'convert') {
    const objs = selObjs().filter(o => o.type === 'path'); let h = anchorHit(sp, objs, false);
    if (!h) { const o2 = allPathObjs(); h = anchorHit(sp, o2, false); if (h) setSel([h.o.id]); }
    if (!h) { S.act = null; return; }
    if (t === 'delpt') { deleteAnchor(h.o, h.si, h.pi); commit(); render(); S.act = null; return; }
    startDoc = JSON.stringify(doc); A.type = 'convert'; A.h = h; render(); return;
  }
  if (t === 'pencil') { A.type = 'pencil'; A.pts = [[w.x, w.y]]; return; }
  if (['line', 'rect', 'ellipse', 'polygon', 'star'].includes(t)) { A.type = 'shape'; A.a = snapPt(w); return; }
  if (t === 'text') {
    const hit = hitObj(w, 10); S.act = null;
    if (hit && hit.o.type === 'text') { setSel([hit.o.id]); askText(hit.o.text, v => { if (v == null) return; hit.o.text = v; commit(); render(); }); return; }
    const p = snapPt(w);
    askText('', v => {
      if (!v) return;
      const st = S.style;
      const o = { id: nid(), type: 'text', name: 'متن', x: p.x, y: p.y + S.opt.size * 0.95, text: v, size: S.opt.size, font: S.opt.font, bold: S.opt.bold, italic: S.opt.italic, rot: 0, fill: st.fill || '#16181d', grad: null, stroke: null, sw: 0, op: st.op };
      if (addObj(o)) { commit(); render(); }
    }); return;
  }
  if (t === 'eyedrop') {
    const hit = hitObj(w, 12); S.act = null;
    if (hit) { setSel([hit.o.id]); syncStyleFromSel(); uiRefresh(true); toast('سبک برداشته شد'); render(); }
  }
}

/* ---- MOVE ---- */
function onMove(sp, e) {
  const A = S.act; if (!A) return;
  A.cx = sp.x; A.cy = sp.y;
  if (Math.hypot(sp.x - A.sx, sp.y - A.sy) > 3) A.moved = true;
  const w = toW(sp.x, sp.y), con = S.constrain;
  switch (A.type) {
    case 'pan': S.view.x = A.v.x + (sp.x - A.sx); S.view.y = A.v.y + (sp.y - A.sy); render(); return;
    case 'marquee': drawOverlay(); return;
    case 'move': {
      if (!A.moved) return;
      let dx = w.x - A.start.x, dy = w.y - A.start.y;
      if (con) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (S.snap && A.b0) { dx = sn(A.b0[0] + dx) - A.b0[0]; dy = sn(A.b0[1] + dy) - A.b0[1]; }
      const m = mTrans(dx - A.dx, dy - A.dy); A.dx = dx; A.dy = dy;
      selObjs().forEach(o => mapObj(o, m)); render(); return;
    }
    case 'scale': {
      const [x0, y0, x1, y1] = A.b, h = A.h, ax = h.includes('w') ? x1 : x0, ay = h.includes('n') ? y1 : y0;
      const hx = h.includes('w') ? x0 : h.includes('e') ? x1 : null, hy = h.includes('n') ? y0 : h.includes('s') ? y1 : null;
      let sx = hx == null || Math.abs(hx - ax) < 1e-6 ? 1 : (w.x - ax) / (hx - ax), sy = hy == null || Math.abs(hy - ay) < 1e-6 ? 1 : (w.y - ay) / (hy - ay);
      if (hx != null && hy != null && con) { const s = Math.max(Math.abs(sx), Math.abs(sy)); sx = (sx < 0 ? -1 : 1) * s; sy = (sy < 0 ? -1 : 1) * s; }
      else if (hx != null && hy == null && con) sy = sx; else if (hy != null && hx == null && con) sx = sy;
      const fix = v => Math.abs(v) < 0.01 ? (v < 0 ? -0.01 : 0.01) : v; sx = fix(sx); sy = fix(sy);
      const m = M(sx, 0, 0, sy, ax * (1 - sx), ay * (1 - sy));
      A.cl.forEach(c => { const k = clone(c); mapObj(k, m); const r = findObj(k.id); if (r) r.arr[r.idx] = k; }); render(); return;
    }
    case 'rotate': {
      let d = (Math.atan2(w.y - A.c.y, w.x - A.c.x) - A.a0) * 180 / Math.PI;
      if (con) d = Math.round(d / 15) * 15;
      const m = mRotAt(d, A.c.x, A.c.y);
      A.cl.forEach(c => { const k = clone(c); mapObj(k, m); const r = findObj(k.id); if (r) r.arr[r.idx] = k; }); render(); return;
    }
    case 'anchor': {
      if (!A.moved) return;
      let dx = w.x - A.lastW.x, dy = w.y - A.lastW.y;
      if (S.snap && A.base) { const tx = w.x - A.start.x + A.base.x, ty = w.y - A.start.y + A.base.y; const nx = sn(tx) - A.base.x, ny = sn(ty) - A.base.y; dx = nx - A.tot.x; dy = ny - A.tot.y; A.tot = { x: nx, y: ny }; A.lastW = w; }
      else A.lastW = w;
      S.anchors.forEach(k => { const [id, si, pi] = k.split('|'), r = findObj(id); if (!r) return; const p = r.o.sub[+si].pts[+pi]; p.x += dx; p.y += dy; p.ix += dx; p.iy += dy; p.ox += dx; p.oy += dy; });
      render(); return;
    }
    case 'handle': {
      if (!A.moved) return;
      const { kind, o, si, pi } = A.h, p = o.sub[si].pts[pi], q = snapPt(w);
      const mine = kind === 'out' ? ['ox', 'oy'] : ['ix', 'iy'], oth = kind === 'out' ? ['ix', 'iy'] : ['ox', 'oy'];
      p[mine[0]] = q.x; p[mine[1]] = q.y;
      if (p.s) {
        const d = Math.hypot(q.x - p.x, q.y - p.y) || 1; let len = Math.hypot(p[oth[0]] - p.x, p[oth[1]] - p.y); if (!len) len = d;
        p[oth[0]] = p.x - (q.x - p.x) / d * len; p[oth[1]] = p.y - (q.y - p.y) / d * len;
      }
      render(); return;
    }
    case 'seg': {
      if (!A.moved) return;
      const r = findObj(A.o.id); if (!r) return;
      const c = clone(A.cl), { si, i } = A.ns, t = clamp(A.ns.t, 0.15, 0.85), dx = w.x - A.start.x, dy = w.y - A.start.y, f = 1 / (3 * t * (1 - t));
      const sub = c.sub[si], n = sub.pts.length, a = sub.pts[i], b = sub.pts[(i + 1) % n];
      a.ox += dx * f; a.oy += dy * f; b.ix += dx * f; b.iy += dy * f; a.s = false; b.s = false;
      r.arr[r.idx] = c; render(); return;
    }
    case 'pen': {
      const pen = S.pen; if (!pen || !pen.tmp) return; const t = pen.tmp;
      if (Math.hypot(sp.x - A.sx, sp.y - A.sy) > 4) { const q = snapPt(w); t.ox = q.x; t.oy = q.y; t.ix = 2 * t.x - q.x; t.iy = 2 * t.y - q.y; t.s = true; }
      render(); return;
    }
    case 'penclose': {
      const f0 = S.pen.pts[0]; if (Math.hypot(sp.x - A.sx, sp.y - A.sy) > 4) { f0.ox = w.x; f0.oy = w.y; f0.ix = 2 * f0.x - w.x; f0.iy = 2 * f0.y - w.y; f0.s = true; }
      render(); return;
    }
    case 'convert': {
      if (!A.moved) return; const { o, si, pi } = A.h, p = o.sub[si].pts[pi];
      p.ox = w.x; p.oy = w.y; p.ix = 2 * p.x - w.x; p.iy = 2 * p.y - w.y; p.s = true; render(); return;
    }
    case 'pencil': {
      const l = A.pts[A.pts.length - 1]; if (Math.hypot(w.x - l[0], w.y - l[1]) * S.view.s < 2) return;
      A.pts.push([w.x, w.y]);
      S.draft = { id: 'draft', type: 'path', sub: [{ closed: false, pts: A.pts.map(p => P(p[0], p[1])) }], fill: null, grad: null, stroke: S.style.stroke || '#16181d', sw: S.style.sw, cap: 'round', join: 'round', dash: 'none', op: 1, rule: 'nonzero' };
      render(); return;
    }
    case 'shape': {
      if (!A.moved) return; S.draft = mkShape(S.tool, A.a, snapPt(w), con); render(); return;
    }
  }
}

/* ---- UP ---- */
function onUp(sp, e) {
  const A = S.act; if (!A) return; S.act = null;
  const w = toW(sp.x, sp.y);
  switch (A.type) {
    case 'marquee': {
      const x0 = Math.min(A.sx, sp.x), y0 = Math.min(A.sy, sp.y), x1 = Math.max(A.sx, sp.x), y1 = Math.max(A.sy, sp.y);
      if (!A.moved) { render(); return; }
      const a = toW(x0, y0), b = toW(x1, y1);
      if (S.tool === 'direct') {
        selObjs().forEach(o => { if (o.type !== 'path') return; o.sub.forEach((s, si) => s.pts.forEach((p, pi) => { if (p.x >= a.x && p.x <= b.x && p.y >= a.y && p.y <= b.y) S.anchors.add(`${o.id}|${si}|${pi}`); })); });
        if (!S.sel.length) { /* select objects touched */
          const ids = []; doc.layers.forEach(L => { if (L.visible && !L.locked) L.objs.forEach(o => { const bb = bbox(o); if (o.type === 'path' && bb[2] >= a.x && bb[0] <= b.x && bb[3] >= a.y && bb[1] <= b.y) ids.push(o.id); }); });
          setSel(ids, true);
          selObjs().forEach(o => o.sub.forEach((s, si) => s.pts.forEach((p, pi) => { if (p.x >= a.x && p.x <= b.x && p.y >= a.y && p.y <= b.y) S.anchors.add(`${o.id}|${si}|${pi}`); })));
        }
        uiRefresh(); render(); return;
      }
      const ids = S.multi ? S.sel.slice() : [];
      doc.layers.forEach(L => { if (L.visible && !L.locked) L.objs.forEach(o => { const bb = bbox(o); if (bb[2] >= a.x && bb[0] <= b.x && bb[3] >= a.y && bb[1] <= b.y && !ids.includes(o.id)) ids.push(o.id); }); });
      setSel(ids); render(); return;
    }
    case 'move': case 'scale': case 'rotate': case 'anchor': case 'handle': case 'seg':
      if (A.moved) { commit(); } startDoc = null; render(); return;
    case 'convert': {
      const { o, si, pi } = A.h, p = o.sub[si].pts[pi];
      if (!A.moved) { if (p.s || hasH(p)) makeCorner(p); else makeSmooth(o.sub[si], pi); }
      S.anchors.clear(); S.anchors.add(A.h.key); commit(); render(); return;
    }
    case 'pen': {
      const pen = S.pen; if (pen && pen.tmp) { pen.pts.push(pen.tmp); pen.tmp = null; }
      render(); uiRefresh(); return;
    }
    case 'penclose': { S.pen.closed = true; finishPen(); return; }
    case 'pencil': {
      S.draft = null;
      if (A.pts.length > 2) {
        const f0 = A.pts[0], l = A.pts[A.pts.length - 1], closed = Math.hypot(f0[0] - l[0], f0[1] - l[1]) * S.view.s < 16 && A.pts.length > 6;
        const o = mkPath([fitCurve(closed ? A.pts.slice(0, -1) : A.pts, closed)], { fill: false, name: 'مداد' });
        if (addObj(o)) commit();
      }
      render(); uiRefresh(); return;
    }
    case 'shape': {
      S.draft = null; let o;
      if (!A.moved) {
        const c = A.a, sz = 100 / S.view.s, rad = S.tool === 'polygon' || S.tool === 'star';
        o = rad ? mkShape(S.tool, c, { x: c.x, y: c.y - sz / 2 }, true)
          : mkShape(S.tool, { x: c.x - sz / 2, y: c.y - sz / 2 }, { x: c.x + sz / 2, y: c.y + sz / 2 }, false);
      } else o = mkShape(S.tool, A.a, snapPt(w), S.constrain);
      if (addObj(o)) commit();
      render(); uiRefresh(); return;
    }
    case 'pan': return;
  }
}

function deleteAnchor(o, si, pi) {
  const s = o.sub[si]; s.pts.splice(pi, 1);
  if (s.pts.length < 2 && !(s.pts.length === 1 && false)) { if (s.pts.length < 2) o.sub.splice(si, 1); }
  if (!o.sub.length) { const r = findObj(o.id); if (r) r.arr.splice(r.idx, 1); S.sel = S.sel.filter(i => i !== o.id); }
  S.anchors.clear();
}

/* ---- commands ---- */
function setTool(t) {
  if (S.tool === 'pen' && t !== 'pen') finishPen();
  S.tool = t; S.act = null; if (t !== 'direct' && !['addpt', 'delpt', 'convert'].includes(t)) S.anchors.clear();
  if (t === 'text' || t === 'rect' || t === 'polygon' || t === 'star') { if (!S.panel) { /* keep */ } }
  uiRefresh(true); render();
}
function deleteSel() {
  if (S.tool === 'direct' && S.anchors.size) { deleteSelAnchors(); return; }
  const ids = new Set(S.sel); if (!ids.size) return;
  doc.layers.forEach(L => { if (!L.locked) L.objs = L.objs.filter(o => !ids.has(o.id)); });
  S.sel = []; S.anchors.clear(); commit(); render();
}
function deleteSelAnchors() {
  const list = [...S.anchors].map(k => k.split('|')).map(([id, si, pi]) => ({ id, si: +si, pi: +pi })).sort((a, b) => b.pi - a.pi);
  list.forEach(({ id, si, pi }) => { const r = findObj(id); if (r && r.o.sub[si]) deleteAnchor(r.o, si, pi); });
  S.anchors.clear(); commit(); render(); uiRefresh();
}
function toggleSmoothSel() {
  [...S.anchors].forEach(k => { const [id, si, pi] = k.split('|'), r = findObj(id); if (!r) return; const p = r.o.sub[+si].pts[+pi]; if (p.s || hasH(p)) makeCorner(p); else makeSmooth(r.o.sub[+si], +pi); });
  commit(); render();
}
function duplicateSel(off) {
  const objs = selObjs(); if (!objs.length) return; const L = doc.layers[S.cur]; if (L.locked) return;
  const ids = [];
  objs.forEach(o => { const c = cloneObj(o); mapObj(c, mTrans(off == null ? 20 : off, off == null ? 20 : off)); const r = findObj(o.id); doc.layers[r.li].objs.splice(r.idx + 1, 0, c); ids.push(c.id); });
  setSel(ids); commit(); render();
}
function copySel() { const o = selObjs(); if (o.length) { S.clip = clone(o); toast('کپی شد'); } }
function pasteClip() {
  if (!S.clip) return; const L = doc.layers[S.cur]; if (L.locked) return; const ids = [];
  S.clip.forEach(o => { const c = cloneObj(o); mapObj(c, mTrans(20, 20)); L.objs.push(c); ids.push(c.id); });
  S.clip = S.clip.map(o => { const c = clone(o); mapObj(c, mTrans(20, 20)); return c; });
  setSel(ids); commit(); render();
}
function groupSel() {
  const objs = selObjs(); if (objs.length < 2) return;
  const r0 = findObj(objs[objs.length - 1].id), ids = new Set(objs.map(o => o.id));
  const members = []; doc.layers[r0.li].objs.forEach(o => { if (ids.has(o.id)) members.push(o); });
  const g = { id: nid(), type: 'group', name: 'گروه', op: 1, children: members.map(clone) };
  doc.layers[r0.li].objs = doc.layers[r0.li].objs.filter(o => !ids.has(o.id)); doc.layers[r0.li].objs.push(g);
  setSel([g.id]); commit(); render();
}
function ungroupSel() {
  const ids = []; selObjs().forEach(o => {
    if (o.type !== 'group') { ids.push(o.id); return; }
    const r = findObj(o.id); r.arr.splice(r.idx, 1, ...o.children); o.children.forEach(c => ids.push(c.id));
  });
  setSel(ids); commit(); render();
}
function compoundSel() {
  const objs = selObjs().filter(o => o.type === 'path'); if (objs.length < 2) { toast('حداقل دو مسیر انتخاب کنید'); return; }
  const base = clone(objs[objs.length - 1]); base.id = nid(); base.name = 'مسیر مرکب'; base.sub = objs.flatMap(o => clone(o.sub)); base.rule = 'evenodd';
  const ids = new Set(objs.map(o => o.id)), r = findObj(objs[objs.length - 1].id), li = r.li;
  doc.layers[li].objs = doc.layers[li].objs.filter(o => !ids.has(o.id)); doc.layers[li].objs.push(base);
  setSel([base.id]); commit(); render();
}
function releaseSel() {
  const ids = []; selObjs().forEach(o => {
    if (o.type !== 'path' || o.sub.length < 2) { ids.push(o.id); return; }
    const r = findObj(o.id), parts = o.sub.map(s => { const c = clone(o); c.id = nid(); c.sub = [s]; c.rule = 'nonzero'; c.name = 'مسیر'; return c; });
    r.arr.splice(r.idx, 1, ...parts); parts.forEach(p => ids.push(p.id));
  });
  setSel(ids); commit(); render();
}
function closeOpenSel() { selObjs().forEach(o => { if (o.type === 'path') o.sub.forEach(s => { if (s.pts.length > 2) s.closed = true; }); }); commit(); render(); }
function reverseSel() { selObjs().forEach(o => { if (o.type === 'path') o.sub.forEach(s => { s.pts.reverse(); s.pts.forEach(p => { [p.ix, p.ox] = [p.ox, p.ix]; [p.iy, p.oy] = [p.oy, p.iy]; }); }); }); commit(); render(); }
function arrange(mode) {
  const ids = new Set(S.sel); if (!ids.size) return;
  doc.layers.forEach(L => {
    const arr = L.objs, pick = arr.filter(o => ids.has(o.id)); if (!pick.length) return;
    if (mode === 'front') L.objs = arr.filter(o => !ids.has(o.id)).concat(pick);
    else if (mode === 'back') L.objs = pick.concat(arr.filter(o => !ids.has(o.id)));
    else if (mode === 'fwd') { for (let i = arr.length - 2; i >= 0; i--) if (ids.has(arr[i].id) && !ids.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
    else if (mode === 'bwd') { for (let i = 1; i < arr.length; i++) if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; }
  });
  commit(); render();
}
function align(mode, toBoard) {
  const objs = selObjs(); if (!objs.length) return;
  const bs = objs.map(bbox), ref = toBoard || objs.length === 1 ? [0, 0, doc.w, doc.h] : unionBox(bs);
  if (mode === 'dh' || mode === 'dv') {
    if (objs.length < 3) { toast('برای توزیع حداقل ۳ شیء لازم است'); return; }
    const i = mode === 'dh' ? 0 : 1, order = objs.map((o, k) => ({ o, b: bs[k] })).sort((a, b) => a.b[i] - b.b[i]);
    const first = order[0].b[i], last = order[order.length - 1].b[i], step = (last - first) / (order.length - 1);
    order.forEach((e, k) => { const d = first + step * k - e.b[i]; mapObj(e.o, mode === 'dh' ? mTrans(d, 0) : mTrans(0, d)); });
  } else objs.forEach((o, k) => {
    const b = bs[k]; let dx = 0, dy = 0;
    if (mode === 'l') dx = ref[0] - b[0]; if (mode === 'r') dx = ref[2] - b[2]; if (mode === 'c') dx = (ref[0] + ref[2]) / 2 - (b[0] + b[2]) / 2;
    if (mode === 't') dy = ref[1] - b[1]; if (mode === 'b') dy = ref[3] - b[3]; if (mode === 'm') dy = (ref[1] + ref[3]) / 2 - (b[1] + b[3]) / 2;
    mapObj(o, mTrans(dx, dy));
  });
  commit(); render();
}
function transformSel(m) { selObjs().forEach(o => mapObj(o, m)); commit(); render(); uiRefresh(true); }

/* ---- style application ---- */
function eachPaint(o, fn) { if (o.type === 'group') o.children.forEach(c => eachPaint(c, fn)); else fn(o); }
function applyStyle(patch, topOnly) {
  selObjs().forEach(o => {
    if (patch.op !== undefined) o.op = patch.op;
    const p = { ...patch }; delete p.op;
    if (Object.keys(p).length) eachPaint(o, x => { Object.assign(x, p); if (x.type === 'text') { if (p.fill !== undefined && !p.fill) x.fill = '#16181d'; } });
  });
}
function setStyle(patch, final) {
  Object.assign(S.style, patch);
  applyStyle(patch); render();
  if (final) commit();
}
