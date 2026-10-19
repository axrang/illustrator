'use strict';
/* ===== Vector Studio – core: data model, geometry, history ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const N = n => (+(+n).toFixed(3)).toString();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const KAPPA = 0.5522847498;
const FONTS = { sans: 'Arial, Helvetica, Tahoma, sans-serif', serif: '"Times New Roman", Times, serif', mono: '"Courier New", Courier, monospace' };

function newDoc(w = 1080, h = 1080) {
  return { w, h, bg: '#ffffff', grid: 20, uid: 1, layers: [{ id: 'l1', name: 'لایه ۱', visible: true, locked: false, objs: [] }] };
}
let doc = newDoc();
const nid = () => 'o' + (doc.uid++);

const S = {
  tool: 'select', sel: [], anchors: new Set(), cur: 0,
  view: { x: 0, y: 0, s: 1 },
  style: { fill: '#4c8dff', grad: null, stroke: '#16181d', sw: 3, cap: 'round', join: 'round', dash: 'none', op: 1, rule: 'nonzero' },
  target: 'fill', snap: false, showGrid: false, constrain: false, multi: false, lockRatio: true,
  opt: { radius: 0, sides: 6, points: 5, inner: 0.5, font: 'sans', size: 56, bold: false, italic: false },
  pen: null, draft: null, act: null, clip: null, panel: null, recent: []
};

/* ---- points / paths ---- */
const P = (x, y, s = false) => ({ x, y, ix: x, iy: y, ox: x, oy: y, s });
const hasH = p => p.ix !== p.x || p.iy !== p.y || p.ox !== p.x || p.oy !== p.y;

function pathD(sub) {
  const p = sub.pts, n = p.length;
  if (!n) return '';
  const seg = (a, b) => (a.ox === a.x && a.oy === a.y && b.ix === b.x && b.iy === b.y)
    ? `L${N(b.x)} ${N(b.y)}` : `C${N(a.ox)} ${N(a.oy)} ${N(b.ix)} ${N(b.iy)} ${N(b.x)} ${N(b.y)}`;
  let d = `M${N(p[0].x)} ${N(p[0].y)}`;
  for (let i = 1; i < n; i++) d += seg(p[i - 1], p[i]);
  if (sub.closed && n > 1) d += seg(p[n - 1], p[0]) + 'Z';
  return d;
}
function bez(a, b, t) {
  const u = 1 - t;
  return [u * u * u * a.x + 3 * u * u * t * a.ox + 3 * u * t * t * b.ix + t * t * t * b.x,
          u * u * u * a.y + 3 * u * u * t * a.oy + 3 * u * t * t * b.iy + t * t * t * b.y];
}
function flat(sub, n = 16) {
  const p = sub.pts, out = [];
  if (p.length === 1) return [[p[0].x, p[0].y]];
  const segs = sub.closed ? p.length : p.length - 1;
  for (let i = 0; i < segs; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    for (let k = i === 0 ? 0 : 1; k <= n; k++) out.push(bez(a, b, k / n));
  }
  return out;
}

/* ---- affine matrices ---- */
const M = (a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) => ({ a, b, c, d, e, f });
const ap = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
const compose = (m, n) => M(m.a * n.a + m.c * n.b, m.b * n.a + m.d * n.b, m.a * n.c + m.c * n.d, m.b * n.c + m.d * n.d,
  m.a * n.e + m.c * n.f + m.e, m.b * n.e + m.d * n.f + m.f);
const mTrans = (dx, dy) => M(1, 0, 0, 1, dx, dy);
const mScaleAt = (sx, sy, cx, cy) => M(sx, 0, 0, sy, cx * (1 - sx), cy * (1 - sy));
const mRotAt = (deg, cx, cy) => {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return M(c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy);
};
function mapObj(o, m) {
  if (o.type === 'group') { o.children.forEach(c => mapObj(c, m)); return; }
  if (o.type === 'text') {
    const [nx, ny] = ap(m, o.x, o.y); o.x = nx; o.y = ny;
    o.size *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    o.rot = (o.rot || 0) + Math.atan2(m.b, m.a) * 180 / Math.PI;
    return;
  }
  o.sub.forEach(s => s.pts.forEach(p => {
    [p.x, p.y] = ap(m, p.x, p.y); [p.ix, p.iy] = ap(m, p.ix, p.iy); [p.ox, p.oy] = ap(m, p.ox, p.oy);
  }));
}

/* ---- text metrics ---- */
const mctx = document.createElement('canvas').getContext('2d');
const fontStr = (o, size) => `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${size || o.size}px ${FONTS[o.font] || FONTS.sans}`;
function textLines(o) { return String(o.text).split('\n'); }
function textBox(o) {
  mctx.font = fontStr(o);
  const lines = textLines(o);
  const w = Math.max(1, ...lines.map(l => mctx.measureText(l).width));
  const h = lines.length * 1.2 * o.size, top = o.y - o.size * 0.95;
  const m = mRotAt(o.rot || 0, o.x, o.y);
  const pts = [[o.x, top], [o.x + w, top], [o.x + w, top + h], [o.x, top + h]].map(p => ap(m, p[0], p[1]));
  return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
}
function bbox(o) {
  if (o.type === 'group') return unionBox(o.children.map(bbox));
  if (o.type === 'text') return textBox(o);
  let b = null;
  o.sub.forEach(s => flat(s).forEach(([x, y]) => {
    if (!b) b = [x, y, x, y]; else { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  }));
  return b || [0, 0, 0, 0];
}
function unionBox(list) {
  list = list.filter(Boolean);
  if (!list.length) return null;
  return [Math.min(...list.map(b => b[0])), Math.min(...list.map(b => b[1])), Math.max(...list.map(b => b[2])), Math.max(...list.map(b => b[3]))];
}

/* ---- document lookups ---- */
function findObj(id) {
  for (let li = 0; li < doc.layers.length; li++) {
    const arr = doc.layers[li].objs, idx = arr.findIndex(o => o.id === id);
    if (idx >= 0) return { o: arr[idx], arr, idx, li };
  }
  return null;
}
const selObjs = () => S.sel.map(id => findObj(id)).filter(Boolean).map(r => r.o);
const selBox = () => unionBox(selObjs().map(bbox));
function cloneObj(o) {
  const c = clone(o); c.id = nid();
  if (c.type === 'group') c.children = c.children.map(ch => { const k = cloneObj(ch); return k; });
  return c;
}

/* ---- history ---- */
let hist = [], hi = -1;
function commit() {
  hist = hist.slice(0, hi + 1); hist.push(JSON.stringify(doc));
  if (hist.length > 80) hist.shift();
  hi = hist.length - 1; autosave(); uiRefresh();
}
function restore(str) {
  doc = JSON.parse(str);
  S.sel = S.sel.filter(id => findObj(id));
  S.anchors.clear();
  S.cur = clamp(S.cur, 0, doc.layers.length - 1);
  render(); uiRefresh(true);
}
const undo = () => { if (hi > 0) { hi--; restore(hist[hi]); autosave(); } };
const redo = () => { if (hi < hist.length - 1) { hi++; restore(hist[hi]); autosave(); } };
function autosave() { try { localStorage.setItem('vs_doc', JSON.stringify(doc)); } catch (e) { } }
function autoload() {
  try { const s = localStorage.getItem('vs_doc'); if (s) { const d = JSON.parse(s); if (d && d.layers) doc = d; } } catch (e) { }
}

/* ---- color helpers ---- */
function hex2rgb(h) { h = (h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx];
}
function hsv2rgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
