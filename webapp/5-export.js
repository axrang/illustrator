/* ===== export: SVG / PNG / PDF / AI / project; init ===== */
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
const str2u8 = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
const u82str = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return s; };

function saveBytes(name, mime, u8) {
  if (window.AndroidBridge && AndroidBridge.saveFile) { AndroidBridge.saveFile(name, mime, b64(u8)); return; }
  const url = URL.createObjectURL(new Blob([u8], { type: mime })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500); toast('ذخیره شد: ' + name);
}

async function deflate(u8) {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const cs = new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate')));
    return new Uint8Array(await cs.arrayBuffer());
  } catch (e) { return null; }
}

/* ---- PDF ---- */
const pdfEsc = s => s.replace(/[\\()]/g, '\\$&');
const hexU16 = s => '<FEFF' + [...s].map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join('') + '>';
const rgbOps = h => hex2rgb(h).map(v => N(v / 255)).join(' ');
const LATIN = /^[\x20-\x7E\xA0-\xFF\n]*$/;

async function buildPDF() {
  const W = doc.w, H = doc.h, pw = W * 0.75, ph = H * 0.75;
  const objs = [null, null, null, null]; // 1 catalog, 2 pages, 3 page
  const add = b => { objs.push(b); return objs.length - 1; };
  const streams = [];   // {id, dict, data(u8)}
  const res = { font: {}, gs: {}, sh: [], xo: [], oc: [] };
  const addStream = (dict, u8) => { const id = add(null); streams.push({ id, dict, u8 }); return id; };
  const gsKey = op => { const k = 'G' + Math.round(op * 1000); if (!res.gs[k]) res.gs[k] = add(`<</Type/ExtGState/ca ${N(op)}/CA ${N(op)}>>`); return k; };
  const fontKey = (fam, b, i) => {
    const names = { sans: ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'], serif: ['Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'], mono: ['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique'] };
    const nm = (names[fam] || names.sans)[(b ? 1 : 0) + (i ? 2 : 0)];
    if (!res.font[nm]) res.font[nm] = { key: 'F' + (Object.keys(res.font).length + 1), id: add(`<</Type/Font/Subtype/Type1/BaseFont/${nm}/Encoding/WinAnsiEncoding>>`) };
    return res.font[nm].key;
  };
  const shKey = (c1, c2, x0, y0, x1, y1) => {
    const id = add(`<</ShadingType 2/ColorSpace/DeviceRGB/Coords[${N(x0)} ${N(y0)} ${N(x1)} ${N(y1)}]/Function<</FunctionType 2/Domain[0 1]/C0[${rgbOps(c1)}]/C1[${rgbOps(c2)}]/N 1>>/Extend[true true]>>`);
    const key = 'S' + (res.sh.length + 1); res.sh.push([key, id]); return key;
  };
  const pathOps = s => {
    const p = s.pts, n = p.length; if (!n) return '';
    const seg = (a, b) => (a.ox === a.x && a.oy === a.y && b.ix === b.x && b.iy === b.y) ? `${N(b.x)} ${N(b.y)} l\n` : `${N(a.ox)} ${N(a.oy)} ${N(b.ix)} ${N(b.iy)} ${N(b.x)} ${N(b.y)} c\n`;
    let d = `${N(p[0].x)} ${N(p[0].y)} m\n`;
    for (let i = 1; i < n; i++) d += seg(p[i - 1], p[i]);
    if (s.closed && n > 1) d += seg(p[n - 1], p[0]) + 'h\n';
    return d;
  };
  const strokeSetup = o => `${N(o.sw)} w ${{ butt: 0, round: 1, square: 2 }[o.cap] || 0} J ${{ miter: 0, round: 1, bevel: 2 }[o.join] || 0} j ${(() => { const d = dashArr(o); return d ? `[${d.map(N).join(' ')}] 0 d` : '[] 0 d'; })()}\n${rgbOps(o.stroke)} RG\n`;

  const drawObj = (o, opm) => {
    const op = (o.op != null ? o.op : 1) * opm; let c = '';
    if (o.type === 'group') return o.children.map(ch => drawObj(ch, op)).join('');
    c += 'q\n'; if (op < 1) c += `/${gsKey(op)} gs\n`;
    if (o.type === 'text') {
      const col = o.grad ? o.grad.c1 : (o.fill || null), lines = textLines(o), hasS = o.stroke && o.sw > 0;
      if (!col && !hasS) return '';
      if (LATIN.test(o.text)) {
        const fk = fontKey(o.font, o.bold, o.italic);
        c += `1 0 0 1 ${N(o.x)} ${N(o.y)} cm\n`;
        if (o.rot) { const r = o.rot * Math.PI / 180; c += `${N(Math.cos(r))} ${N(Math.sin(r))} ${N(-Math.sin(r))} ${N(Math.cos(r))} 0 0 cm\n`; }
        if (col) c += `${rgbOps(col)} rg\n`; if (hasS) c += strokeSetup(o);
        c += `${col && hasS ? 2 : hasS ? 1 : 0} Tr\n`;
        lines.forEach((l, i) => { c += `BT /${fk} ${N(o.size)} Tf 1 0 0 -1 0 ${N(i * o.size * 1.2)} Tm (${pdfEsc(l)}) Tj ET\n`; });
      } else { // raster fallback for non-Latin scripts (Persian, Arabic, CJK …)
        const sc = 4, cv = document.createElement('canvas'), x = cv.getContext('2d'); x.font = fontStr(o, o.size * sc);
        const w = Math.ceil(Math.max(...lines.map(l => x.measureText(l).width))) + 8 * sc, h = Math.ceil(lines.length * 1.2 * o.size * sc) + 8 * sc;
        cv.width = w; cv.height = h; x.font = fontStr(o, o.size * sc); x.fillStyle = col || o.stroke; x.textBaseline = 'alphabetic';
        lines.forEach((l, i) => x.fillText(l, 4 * sc, 4 * sc + (o.size * 0.95 + i * 1.2 * o.size) * sc));
        const d = x.getImageData(0, 0, w, h).data, rgb = new Uint8Array(w * h * 3), al = new Uint8Array(w * h);
        for (let i = 0, j = 0; i < w * h; i++) { rgb[j++] = d[i * 4]; rgb[j++] = d[i * 4 + 1]; rgb[j++] = d[i * 4 + 2]; al[i] = d[i * 4 + 3]; }
        const sm = addStream(`/Type/XObject/Subtype/Image/Width ${w}/Height ${h}/ColorSpace/DeviceGray/BitsPerComponent 8`, al);
        const im = addStream(`/Type/XObject/Subtype/Image/Width ${w}/Height ${h}/ColorSpace/DeviceRGB/BitsPerComponent 8/SMask ${sm} 0 R`, rgb);
        const key = 'Im' + (res.xo.length + 1); res.xo.push([key, im]);
        c += `1 0 0 1 ${N(o.x)} ${N(o.y)} cm\n`;
        if (o.rot) { const r = o.rot * Math.PI / 180; c += `${N(Math.cos(r))} ${N(Math.sin(r))} ${N(-Math.sin(r))} ${N(Math.cos(r))} 0 0 cm\n`; }
        c += `${N(w / sc)} 0 0 ${N(-h / sc)} ${N(-4)} ${N(-o.size * 0.95 - 4 + h / sc)} cm\n/${key} Do\n`;
      }
      return c + 'Q\n';
    }
    const hasFill = !!(o.fill || o.grad), hasStroke = o.stroke && o.sw > 0, ev = o.rule === 'evenodd';
    const geom = o.sub.map(pathOps).join('');
    if (o.grad) {
      const b = bbox(o), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, a = o.grad.a * Math.PI / 180;
      const half = (Math.abs((b[2] - b[0]) * Math.cos(a)) + Math.abs((b[3] - b[1]) * Math.sin(a))) / 2 || 1;
      const k = shKey(o.grad.c1, o.grad.c2, cx - Math.cos(a) * half, cy - Math.sin(a) * half, cx + Math.cos(a) * half, cy + Math.sin(a) * half);
      c += `q\n${geom}${ev ? 'W*' : 'W'} n\n/${k} sh\nQ\n`;
      if (hasStroke) c += strokeSetup(o) + geom + 'S\n';
    } else if (hasFill && hasStroke) c += `${rgbOps(o.fill)} rg\n` + strokeSetup(o) + geom + (ev ? 'B*' : 'B') + '\n';
    else if (hasFill) c += `${rgbOps(o.fill)} rg\n` + geom + (ev ? 'f*' : 'f') + '\n';
    else if (hasStroke) c += strokeSetup(o) + geom + 'S\n';
    else return '';
    return c + 'Q\n';
  };

  let content = `0.75 0 0 -0.75 0 ${N(ph)} cm\n`;
  if (S.expBg !== false) content += `q ${rgbOps(doc.bg)} rg 0 0 ${W} ${H} re f Q\n`;
  const ocgIds = [];
  doc.layers.forEach((L, i) => {
    if (!L.visible) return;
    const id = add(`<</Type/OCG/Name ${hexU16(L.name)}>>`), key = 'OC' + (i + 1); ocgIds.push(id); res.oc.push([key, id]);
    content += `/OC /${key} BDC\n` + L.objs.map(o => drawObj(o, 1)).join('') + 'EMC\n';
  });
  const cId = addStream('', str2u8(content));
  const date = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const info = add(`<</Title ${hexU16(S.fname || 'drawing')}/Creator(Vector Studio)/Producer(Vector Studio)/CreationDate(D:${date})>>`);
  objs[1] = `<</Type/Catalog/Pages 2 0 R/OCProperties<</OCGs[${ocgIds.map(i => i + ' 0 R').join(' ')}]/D<</Order[${ocgIds.map(i => i + ' 0 R').join(' ')}]/ON[${ocgIds.map(i => i + ' 0 R').join(' ')}]>>>>>>`;
  objs[2] = `<</Type/Pages/Kids[3 0 R]/Count 1>>`;
  const dict = (name, arr) => arr.length ? `/${name}<<${arr.map(([k, id]) => `/${k} ${id} 0 R`).join('')}>>` : '';
  objs[3] = `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${N(pw)} ${N(ph)}]/Contents ${cId} 0 R/Resources<<${dict('Font', Object.values(res.font).map(f => [f.key, f.id]))}${dict('ExtGState', Object.entries(res.gs))}${dict('Shading', res.sh)}${dict('XObject', res.xo)}${dict('Properties', res.oc)}>>>>`;
  // serialise
  let out = '%PDF-1.5\n%\xE2\xE3\xCF\xD3\n'; const offs = [];
  const sByid = {}; streams.forEach(s => sByid[s.id] = s);
  for (let i = 1; i < objs.length; i++) {
    offs[i] = out.length;
    if (sByid[i]) {
      const s = sByid[i]; let data = s.u8, filt = ''; const z = await deflate(data); if (z && z.length < data.length) { data = z; filt = '/Filter/FlateDecode'; }
      out += `${i} 0 obj\n<<${s.dict}${filt}/Length ${data.length}>>\nstream\n${u82str(data)}\nendstream\nendobj\n`;
    } else out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xr = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<</Size ${objs.length}/Root 1 0 R/Info ${info} 0 R>>\nstartxref\n${xr}\n%%EOF\n`;
  return str2u8(out);
}

async function svgToPng(scale) {
  const svg = docSvg({ bg: S.expBg !== false }), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image(); img.decoding = 'async';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const cv = document.createElement('canvas'); cv.width = Math.round(doc.w * scale); cv.height = Math.round(doc.h * scale);
  const x = cv.getContext('2d'); x.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); return new Uint8Array(await blob.arrayBuffer());
}

async function doExport(kind) {
  const base = S.fname || 'drawing';
  try {
    toast('در حال ساخت فایل…');
    if (kind === 'svg') saveBytes(base + '.svg', 'image/svg+xml', new TextEncoder().encode(docSvg({ bg: S.expBg !== false })));
    else if (kind === 'png') saveBytes(base + '.png', 'image/png', await svgToPng(Math.min(S.pngScale || 2, Math.floor(8000 / Math.max(doc.w, doc.h)) || 1)));
    else if (kind === 'pdf') saveBytes(base + '.pdf', 'application/pdf', await buildPDF());
    else if (kind === 'ai') saveBytes(base + '.ai', 'application/postscript', await buildPDF());
    else if (kind === 'json') saveBytes(base + '.vstudio.json', 'application/json', new TextEncoder().encode(JSON.stringify(doc)));
  } catch (e) { console.error(e); toast('خطا در ساخت فایل: ' + (e && e.message || e)); }
}

/* ---- init ---- */
function init() {
  autoload(); buildUI(); installPointer();
  hist = [JSON.stringify(doc)]; hi = 0;
  new ResizeObserver(() => { if (!S.fitted) { S.fitted = true; fitView(); } else render(); }).observe($('#stage'));
  fitView(); uiRefresh(true); uiZoom();
  document.addEventListener('pointerdown', e => { if (e.target.closest('#stage')) { const a = document.activeElement; if (a && a.blur && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) a.blur(); } }, true);
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.__vs = { S, get doc() { return doc; }, buildPDF, docSvg, setTool, commit, render, fitView, toW, toS };
}
window.addEventListener('DOMContentLoaded', init);
