/* ===== UI: toolbar, panels, modals ===== */
const ICON = {
  select: '<path d="M6 3l12 9-5 1 3 6-3 1.5-3-6-4 3z" fill="currentColor"/>',
  direct: '<path d="M6 3l12 9-5 1 3 6-3 1.5-3-6-4 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  pen: '<path d="M12 3l6 9-6 5-6-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 17v4M9 21.5h6" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="10.5" r="1.4" fill="currentColor"/>',
  addpt: '<path d="M3 19c6-14 12-14 18 0" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9" r="2.2" fill="currentColor"/><path d="M18 3v6M15 6h6" stroke="currentColor" stroke-width="1.8"/>',
  delpt: '<path d="M3 19c6-14 12-14 18 0" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9" r="2.2" fill="currentColor"/><path d="M15 6h6" stroke="currentColor" stroke-width="1.8"/>',
  convert: '<path d="M4 19L12 5l8 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="5" r="2" fill="currentColor"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 7l3 3" stroke="currentColor" stroke-width="1.8"/>',
  line: '<path d="M5 19L19 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  rect: '<rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  polygon: '<path d="M12 3l8 6-3 10H7L4 9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  star: '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.2-5.6-3-5.6 3 1.2-6.2L3 9.6l6.3-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  eyedrop: '<path d="M15 4l5 5-3 1-1-1-8 8-3 1 1-3 8-8-1-1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 013 0V11V4.5a1.5 1.5 0 013 0V11V6.5a1.5 1.5 0 013 0V15c0 3.5-2.5 6-6 6-3 0-4.5-1.8-5.8-4l-2-3.3a1.4 1.4 0 012.3-1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  undo: '<path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 12" fill="none" stroke="currentColor" stroke-width="2" transform="translate(0 -3)"/>',
  redo: '<path d="M15 7l5 5-5 5M20 12H10a6 6 0 000 12" fill="none" stroke="currentColor" stroke-width="2" transform="translate(0 -3)"/>',
  grid: '<path d="M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" fill="none" stroke="currentColor" stroke-width="1.4"/>'
};
const ic = k => `<svg viewBox="0 0 24 24" width="22" height="22">${ICON[k]}</svg>`;
const TOOLS = [['select', 'انتخاب'], ['direct', 'مستقیم'], ['pen', 'قلم'], ['addpt', 'افزودن نقطه'], ['delpt', 'حذف نقطه'], ['convert', 'تبدیل نقطه'], ['pencil', 'مداد'],
  ['line', 'خط'], ['rect', 'مستطیل'], ['ellipse', 'بیضی'], ['polygon', 'چندضلعی'], ['star', 'ستاره'], ['text', 'متن'], ['eyedrop', 'قطره‌چکان'], ['hand', 'دست']];
const TABS = [['style', 'سبک'], ['layers', 'لایه‌ها'], ['arrange', 'چیدمان'], ['xform', 'تبدیل'], ['page', 'صفحه'], ['export', 'خروجی']];
const SWATCHES = ['#000000', '#ffffff', '#6b7280', '#d1d5db', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#4c8dff', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#7c2d12', '#78350f', '#1e3a8a', '#064e3b', '#fde68a'];

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }

/* ---- modal ---- */
function showModal(html, ready) {
  const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.classList.add('show');
  const close = () => { m.classList.remove('show'); m.innerHTML = ''; };
  m.onclick = e => { if (e.target === m) close(); };
  ready && ready(close); return close;
}
function askText(init, cb) {
  showModal(`<h3>متن</h3><textarea id="mt" rows="4" dir="auto" placeholder="متن را بنویسید…">${esc(init || '')}</textarea><div class="mrow"><button id="mc">انصراف</button><button id="mo" class="pri">تأیید</button></div>`, close => {
    const t = $('#mt'); setTimeout(() => t.focus(), 50);
    $('#mc').onclick = () => { close(); cb(null); }; $('#mo').onclick = () => { const v = t.value; close(); cb(v); };
  });
}
function askInput(title, init, cb) {
  showModal(`<h3>${esc(title)}</h3><input id="mt" type="text" dir="auto" value="${esc(init || '')}"><div class="mrow"><button id="mc">انصراف</button><button id="mo" class="pri">تأیید</button></div>`, close => {
    const t = $('#mt'); setTimeout(() => { t.focus(); t.select(); }, 50);
    $('#mc').onclick = close; $('#mo').onclick = () => { const v = t.value; close(); cb(v); };
  });
}
function confirmBox(msg, cb) {
  showModal(`<h3>${esc(msg)}</h3><div class="mrow"><button id="mc">انصراف</button><button id="mo" class="pri">بله</button></div>`, close => { $('#mc').onclick = close; $('#mo').onclick = () => { close(); cb(); }; });
}

/* ---- build static UI ---- */
function buildUI() {
  $('#tools').innerHTML = TOOLS.map(([k, n]) => `<button class="tool" data-tool="${k}">${ic(k)}<span>${n}</span></button>`).join('');
  $('#tabs').innerHTML = TABS.map(([k, n]) => `<button class="tab" data-tab="${k}">${n}</button>`).join('');
  $('#tools').onclick = e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); };
  $('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; S.panel = S.panel === b.dataset.tab ? null : b.dataset.tab; uiRefresh(true); setTimeout(() => { if (S.panelChanged) { } }, 0); };
  $('#bUndo').innerHTML = ic('undo'); $('#bRedo').innerHTML = ic('redo'); $('#bGrid').innerHTML = ic('grid');
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  $('#bGrid').onclick = () => { S.showGrid = !S.showGrid; uiRefresh(); render(); };
  $('#zIn').onclick = () => zoomAt(1.4); $('#zOut').onclick = () => zoomAt(1 / 1.4); $('#zFit').onclick = fitView;
  $('#ctx').onclick = e => { const b = e.target.closest('[data-c]'); if (b) ctxAct(b.dataset.c); };
  const pn = $('#panel');
  pn.addEventListener('click', panelClick); pn.addEventListener('input', panelInput); pn.addEventListener('change', panelChange);
}

const ctxBtn = (c, label, on) => `<button class="cb ${on ? 'on' : ''}" data-c="${c}">${label}</button>`;
function drawCtx() {
  let h = ctxBtn('multi', 'چندانتخابی', S.multi) + ctxBtn('con', 'قید ⇧ (نسبت/زاویه)', S.constrain) + ctxBtn('snap', 'چسبیدن به شبکه', S.snap);
  if (S.pen && S.pen.pts.length) h = ctxBtn('penok', '✓ پایان مسیر') + ctxBtn('penclose', '◯ بستن مسیر') + ctxBtn('penundo', '↶ حذف آخرین نقطه') + ctxBtn('pencancel', '✕ لغو') + h;
  if (S.sel.length) h += ctxBtn('dup', 'تکثیر') + ctxBtn('del', 'حذف') + ctxBtn('copy', 'کپی') + ctxBtn('paste', 'چسباندن') + ctxBtn('group', 'گروه') + ctxBtn('ungroup', 'خروج از گروه') + ctxBtn('front', 'روی همه') + ctxBtn('back', 'زیر همه');
  else if (S.clip) h += ctxBtn('paste', 'چسباندن');
  if (S.anchors.size) h = ctxBtn('delanc', 'حذف نقطه') + ctxBtn('smooth', 'نرم/گوشه') + h;
  $('#ctx').innerHTML = h;
}
function ctxAct(c) {
  switch (c) {
    case 'multi': S.multi = !S.multi; break; case 'con': S.constrain = !S.constrain; break; case 'snap': S.snap = !S.snap; break;
    case 'penok': finishPen(); break; case 'penclose': if (S.pen) { S.pen.closed = true; finishPen(); } break; case 'penundo': penUndoPoint(); break; case 'pencancel': finishPen(false); break;
    case 'dup': duplicateSel(); break; case 'del': deleteSel(); break; case 'copy': copySel(); break; case 'paste': pasteClip(); break;
    case 'group': groupSel(); break; case 'ungroup': ungroupSel(); break; case 'front': arrange('front'); break; case 'back': arrange('back'); break;
    case 'delanc': deleteSelAnchors(); break; case 'smooth': toggleSmoothSel(); break;
  }
  uiRefresh();
}
function uiZoom() { $('#zFit').textContent = Math.round(S.view.s * 100) + '%'; }

let lastPanelKey = '';
function uiRefresh(force) {
  $$('#tools .tool').forEach(b => b.classList.toggle('on', b.dataset.tool === S.tool));
  $$('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === S.panel));
  $('#bUndo').disabled = hi <= 0; $('#bRedo').disabled = hi >= hist.length - 1;
  $('#bGrid').classList.toggle('on', S.showGrid);
  drawCtx();
  const pn = $('#panel'), was = pn.classList.contains('open');
  pn.classList.toggle('open', !!S.panel);
  if (was !== !!S.panel) setTimeout(() => { /* stage resized */ }, 0);
  if (S.panel) {
    const ae = document.activeElement;
    if (!force && ae && pn.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return;
    const sc = pn.scrollTop, same = lastPanelKey === S.panel; lastPanelKey = S.panel;
    pn.innerHTML = PANELS[S.panel](); pn.scrollTop = same ? sc : 0;
    if (S.panel === 'style') initPicker();
  } else lastPanelKey = '';
}

/* ---- panels ---- */
const row = (...c) => `<div class="prow">${c.join('')}</div>`;
const grp = (name, items, cur, attr) => `<div class="seg">${items.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-${attr}="${v}">${l}</button>`).join('')}</div>`;
const num = (k, v, min, max, step, label, extra) => `<label class="nf"><span>${label}</span><input type="number" dir="ltr" data-k="${k}" value="${N(v)}" min="${min}" max="${max}" step="${step}" ${extra || ''}></label>`;
const rng = (k, v, min, max, step, label) => `<label class="rf"><span>${label}</span><input type="range" data-k="${k}" value="${v}" min="${min}" max="${max}" step="${step}"><output>${N(v)}</output></label>`;

const PANELS = {
  style() {
    const st = S.style, t = S.target, selText = selObjs().some(o => o.type === 'text') || S.tool === 'text';
    const sw = (k, col, label) => `<button class="swt ${t === k ? 'on' : ''}" data-tgt="${k}"><i id="sw_${k}" class="${col ? '' : 'none'}" style="${col ? 'background:' + col : ''}"></i><span>${label}</span></button>`;
    let h = row(sw('fill', st.fill, 'پر کردن'), sw('stroke', st.stroke, 'خط دور'), st.grad ? sw('g2', st.grad.c2, 'رنگ دوم') : '',
      `<button class="cb" data-a="none">بدون رنگ</button><button class="cb" data-a="swap">جابجایی</button>`);
    h += `<div id="pk"><canvas id="pkcv" width="300" height="105"></canvas><input type="range" id="pkh" min="0" max="360" step="1"><input id="pkhex" dir="ltr" maxlength="7"></div>`;
    h += `<div class="sws">${SWATCHES.concat(S.recent).map(c => `<button class="sw" data-c="${c}" style="background:${c}"></button>`).join('')}</div>`;
    h += row(`<label class="chk"><input type="checkbox" data-k="gradon" ${st.grad ? 'checked' : ''}> گرادیان خطی</label>`, st.grad ? rng('gang', st.grad.a, 0, 360, 1, 'زاویه') : '');
    h += `<h4>خط دور (Stroke)</h4>` + row(rng('sw', st.sw, 0, 80, 0.5, 'ضخامت'));
    h += row(`<span class="lb">سر خط</span>` + grp('cap', [['butt', 'تخت'], ['round', 'گرد'], ['square', 'مربع']], st.cap, 'cap'), `<span class="lb">گوشه</span>` + grp('join', [['miter', 'تیز'], ['round', 'گرد'], ['bevel', 'پخ']], st.join, 'join'));
    h += row(`<span class="lb">الگو</span>` + grp('dash', [['none', 'ساده'], ['dash', 'خط‌چین'], ['dot', 'نقطه‌چین']], st.dash, 'dash'), `<span class="lb">قانون پر</span>` + grp('rule', [['nonzero', 'Non-zero'], ['evenodd', 'Even-odd']], st.rule, 'rule'));
    h += rng('op', Math.round(st.op * 100), 0, 100, 1, 'شفافیت %');
    h += `<h4>گزینه‌های ابزار</h4>` + row(rng('radius', S.opt.radius, 0, 300, 1, 'گردی گوشه مستطیل'), rng('sides', S.opt.sides, 3, 16, 1, 'اضلاع چندضلعی'));
    h += row(rng('points', S.opt.points, 3, 16, 1, 'رأس ستاره'), rng('inner', Math.round(S.opt.inner * 100), 5, 95, 1, 'شعاع داخلی ستاره %'));
    if (selText) h += `<h4>متن</h4>` + row(rng('tsize', S.opt.size, 6, 600, 1, 'اندازه'), `<span class="lb">فونت</span>` + grp('font', [['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono']], S.opt.font, 'font'),
      `<button class="cb ${S.opt.bold ? 'on' : ''}" data-a="bold"><b>B</b></button><button class="cb ${S.opt.italic ? 'on' : ''}" data-a="italic"><i>I</i></button>`);
    return h;
  },
  layers() {
    let h = row(`<button class="cb" data-a="ladd">+ لایه جدید</button><button class="cb" data-a="ldel">حذف لایه</button><button class="cb" data-a="lup">▲ بالا</button><button class="cb" data-a="ldn">▼ پایین</button><button class="cb" data-a="lren">تغییر نام</button>`);
    h += '<div class="list">' + doc.layers.map((L, i) => `<div class="li ${i === S.cur ? 'cur' : ''}" data-li="${i}"><button data-a="lvis" data-li="${i}">${L.visible ? '👁' : '◌'}</button><button data-a="llock" data-li="${i}">${L.locked ? '🔒' : '🔓'}</button><span class="nm">${esc(L.name)}</span><span class="cnt">${L.objs.length}</span></div>`).reverse().join('') + '</div>';
    const L = doc.layers[S.cur];
    h += `<h4>اشیاء «${esc(L.name)}»</h4><div class="list">` + L.objs.map(o => `<div class="oi ${S.sel.includes(o.id) ? 'on' : ''}" data-oid="${o.id}"><span>${o.type === 'group' ? '▣' : o.type === 'text' ? 'T' : '◇'}</span><span class="nm">${esc(o.name || o.type)}</span></div>`).reverse().join('') + '</div>';
    return h;
  },
  arrange() {
    const b = (a, l) => `<button class="cb" data-a="${a}">${l}</button>`;
    return `<h4>تراز (Align)</h4>` + row(`<label class="chk"><input type="checkbox" data-k="alignboard" ${S.alignBoard ? 'checked' : ''}> نسبت به صفحه</label>`) +
      row(b('al:l', '⇤ چپ'), b('al:c', '↔ مرکز افقی'), b('al:r', '⇥ راست'), b('al:t', '⤒ بالا'), b('al:m', '↕ مرکز عمودی'), b('al:b', '⤓ پایین'), b('al:dh', 'توزیع افقی'), b('al:dv', 'توزیع عمودی')) +
      `<h4>ترتیب (Arrange)</h4>` + row(b('ar:front', 'آوردن به جلو'), b('ar:fwd', 'یک مرحله جلو'), b('ar:bwd', 'یک مرحله عقب'), b('ar:back', 'بردن به عقب')) +
      `<h4>مسیر</h4>` + row(b('grp', 'گروه (Group)'), b('ungrp', 'خروج از گروه'), b('cmp', 'مسیر مرکب (Compound)'), b('rel', 'آزاد کردن مرکب'), b('closep', 'بستن مسیر'), b('rev', 'معکوس کردن جهت'), b('dup', 'تکثیر'), b('del', 'حذف'));
  },
  xform() {
    const bb = selBox(); if (!bb) return `<p class="hint">یک شیء را انتخاب کنید.</p>`;
    const w = bb[2] - bb[0], hh = bb[3] - bb[1], b = (a, l) => `<button class="cb" data-a="${a}">${l}</button>`;
    return row(num('X', bb[0], -99999, 99999, 1, 'X'), num('Y', bb[1], -99999, 99999, 1, 'Y'), num('W', w, 0.1, 99999, 1, 'عرض'), num('H', hh, 0.1, 99999, 1, 'ارتفاع')) +
      row(`<label class="chk"><input type="checkbox" data-k="lockratio" ${S.lockRatio ? 'checked' : ''}> قفل نسبت</label>`) +
      `<h4>چرخش / مقیاس</h4>` + row(num('rot', 0, -360, 360, 1, 'چرخش°'), b('rotapply', 'اعمال'), b('rot90', '⟳ ۹۰°'), b('rot90n', '⟲ ۹۰°'), b('rot180', '۱۸۰°')) +
      row(num('scl', 100, 1, 5000, 1, 'مقیاس %'), b('sclapply', 'اعمال'), b('flipH', '⇋ قرینه افقی'), b('flipV', '⇅ قرینه عمودی'));
  },
  page() {
    const b = (a, l) => `<button class="cb" data-a="${a}">${l}</button>`;
    return `<h4>بوم (Artboard)</h4>` + row(num('docw', doc.w, 16, 20000, 1, 'عرض px'), num('doch', doc.h, 16, 20000, 1, 'ارتفاع px'), b('docapply', 'اعمال')) +
      row(b('pre:794x1123', 'A4'), b('pre:1123x794', 'A4 افقی'), b('pre:1080x1080', '۱۰۸۰²'), b('pre:1920x1080', 'HD'), b('pre:1080x1920', 'استوری'), b('pre:512x512', 'آیکون ۵۱۲')) +
      `<h4>پس‌زمینه</h4><div class="sws">${['#ffffff', '#f8f4e8', '#e5e7eb', '#9ca3af', '#111827', '#000000', '#fde68a', '#bfdbfe'].map(c => `<button class="sw" data-bg="${c}" style="background:${c}"></button>`).join('')}</div>` +
      `<h4>شبکه</h4>` + row(num('grid', doc.grid, 1, 500, 1, 'اندازه شبکه'), `<label class="chk"><input type="checkbox" data-k="showgrid" ${S.showGrid ? 'checked' : ''}> نمایش</label>`, `<label class="chk"><input type="checkbox" data-k="snap" ${S.snap ? 'checked' : ''}> چسبیدن</label>`) +
      `<h4>سند</h4>` + row(b('newdoc', 'سند جدید'), b('fit', 'جا دادن در صفحه'));
  },
  export() {
    const b = (a, l, c) => `<button class="cb big ${c || ''}" data-a="${a}">${l}</button>`;
    return row(`<label class="nf wide"><span>نام فایل</span><input type="text" dir="ltr" data-k="fname" value="${esc(S.fname || 'drawing')}"></label>`) +
      row(`<label class="chk"><input type="checkbox" data-k="expbg" ${S.expBg !== false ? 'checked' : ''}> شامل پس‌زمینه</label>`, `<span class="lb">PNG</span>` + grp('pngs', [['1', '×۱'], ['2', '×۲'], ['4', '×۴']], String(S.pngScale || 2), 'pngs')) +
      row(b('ex:ai', 'خروجی AI (Illustrator)', 'pri'), b('ex:pdf', 'خروجی PDF', 'pri'), b('ex:svg', 'خروجی SVG'), b('ex:png', 'خروجی PNG')) +
      `<h4>پروژه</h4>` + row(b('ex:json', 'ذخیره پروژه (JSON)'), `<label class="cb big filebtn">باز کردن پروژه<input type="file" id="openf" accept=".json,application/json" hidden></label>`) +
      `<p class="hint">فایل‌ها در پوشه‌ی Downloads/VectorStudio ذخیره می‌شوند.<br>AI: یک فایل PDF-سازگار با پسوند .ai است که Illustrator مستقیم باز می‌کند و مسیرها و لایه‌ها قابل ویرایش هستند.</p>`;
  }
};

/* ---- panel events ---- */
function panelClick(e) {
  const t = e.target, q = s => t.closest(s);
  let b;
  if ((b = q('[data-tgt]'))) { S.target = b.dataset.tgt; uiRefresh(true); return; }
  if ((b = q('.sw[data-c]'))) { pkSetHex(b.dataset.c, true); return; }
  if ((b = q('[data-bg]'))) { doc.bg = b.dataset.bg; commit(); render(); return; }
  if ((b = q('[data-cap]'))) { setStyle({ cap: b.dataset.cap }, true); uiRefresh(true); return; }
  if ((b = q('[data-join]'))) { setStyle({ join: b.dataset.join }, true); uiRefresh(true); return; }
  if ((b = q('[data-dash]'))) { setStyle({ dash: b.dataset.dash }, true); uiRefresh(true); return; }
  if ((b = q('[data-rule]'))) { setStyle({ rule: b.dataset.rule }, true); uiRefresh(true); return; }
  if ((b = q('[data-pngs]'))) { S.pngScale = +b.dataset.pngs; uiRefresh(true); return; }
  if ((b = q('[data-font]'))) { S.opt.font = b.dataset.font; textPatch({ font: S.opt.font }); uiRefresh(true); return; }
  if ((b = q('[data-oid]'))) { setSel([b.dataset.oid]); render(); uiRefresh(true); return; }
  if ((b = q('.li'))) {
    const i = +b.dataset.li, ab = q('[data-a]');
    if (ab && ab.dataset.a === 'lvis') { doc.layers[i].visible = !doc.layers[i].visible; commit(); render(); uiRefresh(true); return; }
    if (ab && ab.dataset.a === 'llock') { doc.layers[i].locked = !doc.layers[i].locked; commit(); uiRefresh(true); return; }
    if (S.cur === i) askInput('نام لایه', doc.layers[i].name, v => { if (v) { doc.layers[i].name = v; commit(); uiRefresh(true); } });
    S.cur = i; uiRefresh(true); return;
  }
  if ((b = q('[data-a]'))) panelAct(b.dataset.a);
}
function textPatch(p) { let ch = false; selObjs().forEach(o => { if (o.type === 'text') { Object.assign(o, p); ch = true; } }); if (ch) { commit(); render(); } }
function panelAct(a) {
  const [k, v] = a.split(':');
  switch (k) {
    case 'none': S.target === 'stroke' ? setStyle({ stroke: null }, true) : setStyle({ fill: null, grad: null }, true); uiRefresh(true); break;
    case 'swap': { const st = S.style; setStyle({ fill: st.stroke, stroke: st.fill, grad: null }, true); uiRefresh(true); break; }
    case 'bold': S.opt.bold = !S.opt.bold; textPatch({ bold: S.opt.bold }); uiRefresh(true); break;
    case 'italic': S.opt.italic = !S.opt.italic; textPatch({ italic: S.opt.italic }); uiRefresh(true); break;
    case 'ladd': doc.layers.push({ id: 'l' + (doc.uid++), name: 'لایه ' + (doc.layers.length + 1), visible: true, locked: false, objs: [] }); S.cur = doc.layers.length - 1; commit(); uiRefresh(true); break;
    case 'ldel': if (doc.layers.length < 2) { toast('حداقل یک لایه لازم است'); break; } confirmBox('این لایه با همه اشیایش حذف شود؟', () => { const ids = new Set(doc.layers[S.cur].objs.map(o => o.id)); doc.layers.splice(S.cur, 1); S.cur = clamp(S.cur, 0, doc.layers.length - 1); S.sel = S.sel.filter(i => !ids.has(i)); commit(); render(); uiRefresh(true); }); break;
    case 'lup': if (S.cur < doc.layers.length - 1) { [doc.layers[S.cur], doc.layers[S.cur + 1]] = [doc.layers[S.cur + 1], doc.layers[S.cur]]; S.cur++; commit(); render(); uiRefresh(true); } break;
    case 'ldn': if (S.cur > 0) { [doc.layers[S.cur], doc.layers[S.cur - 1]] = [doc.layers[S.cur - 1], doc.layers[S.cur]]; S.cur--; commit(); render(); uiRefresh(true); } break;
    case 'lren': askInput('نام لایه', doc.layers[S.cur].name, x => { if (x) { doc.layers[S.cur].name = x; commit(); uiRefresh(true); } }); break;
    case 'al': align(v, !!S.alignBoard); break;
    case 'ar': arrange(v); uiRefresh(true); break;
    case 'grp': groupSel(); break; case 'ungrp': ungroupSel(); break; case 'cmp': compoundSel(); break; case 'rel': releaseSel(); break;
    case 'closep': closeOpenSel(); break; case 'rev': reverseSel(); break; case 'dup': duplicateSel(); break; case 'del': deleteSel(); break;
    case 'rotapply': { const bb = selBox(), d = +$('#panel [data-k=rot]').value || 0; if (bb) transformSel(mRotAt(d, (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)); break; }
    case 'rot90': case 'rot90n': case 'rot180': { const bb = selBox(); if (bb) transformSel(mRotAt(k === 'rot90' ? 90 : k === 'rot90n' ? -90 : 180, (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)); break; }
    case 'sclapply': { const bb = selBox(), s = (+$('#panel [data-k=scl]').value || 100) / 100; if (bb) transformSel(mScaleAt(s, s, (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)); break; }
    case 'flipH': { const bb = selBox(); if (bb) transformSel(mScaleAt(-1, 1, (bb[0] + bb[2]) / 2, 0)); break; }
    case 'flipV': { const bb = selBox(); if (bb) transformSel(mScaleAt(1, -1, 0, (bb[1] + bb[3]) / 2)); break; }
    case 'docapply': { doc.w = clamp(+$('#panel [data-k=docw]').value || doc.w, 16, 20000); doc.h = clamp(+$('#panel [data-k=doch]').value || doc.h, 16, 20000); commit(); fitView(); uiRefresh(true); break; }
    case 'pre': { const [w, h] = v.split('x').map(Number); doc.w = w; doc.h = h; commit(); fitView(); uiRefresh(true); break; }
    case 'fit': fitView(); break;
    case 'newdoc': confirmBox('سند جدید ساخته شود؟ تغییرات ذخیره‌نشده از بین می‌روند.', () => { doc = newDoc(doc.w, doc.h); S.sel = []; S.cur = 0; S.anchors.clear(); hist = []; hi = -1; commit(); fitView(); uiRefresh(true); }); break;
    case 'ex': doExport(v); break;
  }
}
function panelInput(e) {
  const t = e.target, k = t.dataset.k; if (!k) return;
  const v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.type === 'range') { const o = t.parentElement.querySelector('output'); if (o) o.textContent = N(v); }
  switch (k) {
    case 'sw': setStyle({ sw: +v }); break;
    case 'op': setStyle({ op: +v / 100 }); break;
    case 'gang': setStyle({ grad: { ...S.style.grad, a: +v } }); break;
    case 'radius': S.opt.radius = +v; break; case 'sides': S.opt.sides = +v; break; case 'points': S.opt.points = +v; break; case 'inner': S.opt.inner = +v / 100; break;
    case 'tsize': S.opt.size = +v; selObjs().forEach(o => { if (o.type === 'text') o.size = +v; }); render(); break;
  }
}
function panelChange(e) {
  const t = e.target, k = t.dataset.k; if (!k) return;
  const v = t.type === 'checkbox' ? t.checked : t.value, n = parseFloat(v);
  switch (k) {
    case 'sw': case 'op': case 'gang': commit(); break;
    case 'tsize': commit(); break;
    case 'gradon': { const st = S.style; setStyle({ grad: v ? { c1: st.fill || '#4c8dff', c2: '#ffffff', a: 0 } : null, fill: st.fill || '#4c8dff' }, true); uiRefresh(true); break; }
    case 'alignboard': S.alignBoard = v; break;
    case 'lockratio': S.lockRatio = v; break;
    case 'showgrid': S.showGrid = v; render(); uiRefresh(); break;
    case 'snap': S.snap = v; uiRefresh(); break;
    case 'grid': doc.grid = clamp(n || 20, 1, 500); commit(); render(); break;
    case 'fname': S.fname = v.replace(/[^\w\-. ]+/g, '_') || 'drawing'; break;
    case 'expbg': S.expBg = v; break;
    case 'X': case 'Y': case 'W': case 'H': xformInput(k, n); break;
  }
  if (t.id === 'openf') return;
}
document.addEventListener('change', e => {
  if (e.target.id === 'openf' && e.target.files[0]) {
    const fr = new FileReader(); fr.onload = () => {
      try { const d = JSON.parse(fr.result); if (!d.layers) throw 0; doc = d; S.sel = []; S.cur = 0; hist = []; hi = -1; commit(); fitView(); uiRefresh(true); toast('پروژه باز شد'); } catch (x) { toast('فایل پروژه معتبر نیست'); }
    }; fr.readAsText(e.target.files[0]);
  }
});
function xformInput(k, n) {
  const bb = selBox(); if (!bb || isNaN(n)) return;
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  if (k === 'X') mapSel(mTrans(n - bb[0], 0)); else if (k === 'Y') mapSel(mTrans(0, n - bb[1]));
  else if (k === 'W' && w > 0) { const s = n / w; mapSel(mScaleAt(s, S.lockRatio ? s : 1, bb[0], bb[1])); }
  else if (k === 'H' && h > 0) { const s = n / h; mapSel(mScaleAt(S.lockRatio ? s : 1, s, bb[0], bb[1])); }
  commit(); render(); uiRefresh(true);
}
function mapSel(m) { selObjs().forEach(o => mapObj(o, m)); }

/* ---- color picker ---- */
const PK = { h: 210, s: 0.7, v: 1 };
function targetColor() { const st = S.style; return S.target === 'fill' ? st.fill : S.target === 'stroke' ? st.stroke : st.grad && st.grad.c2; }
function initPicker() {
  const c = $('#pkcv'); if (!c) return;
  const col = targetColor(); if (col) { const [r, g, b] = hex2rgb(col), [h, s, v] = rgb2hsv(r, g, b); if (s > 0.02) PK.h = h; PK.s = s; PK.v = v; }
  $('#pkh').value = PK.h; $('#pkhex').value = col || '';
  pkDraw();
  const set = e => { const r = c.getBoundingClientRect(); PK.s = clamp((e.clientX - r.left) / r.width, 0, 1); PK.v = 1 - clamp((e.clientY - r.top) / r.height, 0, 1); pkApply(false); };
  let down = false;
  c.style.touchAction = 'none';
  c.onpointerdown = e => { down = true; c.setPointerCapture(e.pointerId); set(e); };
  c.onpointermove = e => { if (down) set(e); };
  c.onpointerup = c.onpointercancel = () => { if (down) { down = false; pkApply(true); } };
  $('#pkh').oninput = e => { PK.h = +e.target.value; pkApply(false); };
  $('#pkh').onchange = () => pkApply(true);
  $('#pkhex').onchange = e => { let v = e.target.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v) || /^#?[0-9a-f]{3}$/i.test(v)) { if (v[0] !== '#') v = '#' + v; pkSetHex(v.length === 4 ? '#' + v.slice(1).split('').map(x => x + x).join('') : v, true); } };
}
function pkDraw() {
  const c = $('#pkcv'); if (!c) return; const x = c.getContext('2d'), w = c.width, h = c.height;
  x.fillStyle = `hsl(${PK.h},100%,50%)`; x.fillRect(0, 0, w, h);
  let g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.beginPath(); x.arc(PK.s * w, (1 - PK.v) * h, 8, 0, 7); x.lineWidth = 3; x.strokeStyle = '#fff'; x.stroke(); x.lineWidth = 1; x.strokeStyle = '#000'; x.stroke();
}
function pkApply(final) {
  const [r, g, b] = hsv2rgb(PK.h, PK.s, PK.v), hex = rgb2hex(r, g, b);
  $('#pkhex').value = hex; pkDraw(); setTargetColor(hex, final);
}
function pkSetHex(hex, final) {
  const [r, g, b] = hex2rgb(hex), [h, s, v] = rgb2hsv(r, g, b); if (s > 0.02) PK.h = h; PK.s = s; PK.v = v;
  if ($('#pkh')) { $('#pkh').value = PK.h; $('#pkhex').value = hex; pkDraw(); }
  setTargetColor(hex, final);
}
function setTargetColor(hex, final) {
  const st = S.style, t = S.target;
  if (t === 'fill') setStyle({ fill: hex, grad: st.grad ? { ...st.grad, c1: hex } : null }, final);
  else if (t === 'stroke') setStyle({ stroke: hex, sw: st.sw > 0 ? st.sw : 2 }, final);
  else if (st.grad) setStyle({ grad: { ...st.grad, c2: hex } }, final);
  const el = $('#sw_' + t); if (el) { el.style.background = hex; el.classList.remove('none'); }
  if (final) { S.recent = [hex, ...S.recent.filter(c => c !== hex)].slice(0, 8); }
}

/* ---- keyboard (desktop / external keyboard) ---- */
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && k === 'z') { e.shiftKey ? redo() : undo(); e.preventDefault(); return; }
  if (ctrl && k === 'y') { redo(); return; } if (ctrl && k === 'c') { copySel(); return; } if (ctrl && k === 'v') { pasteClip(); return; }
  if (ctrl && k === 'd') { duplicateSel(); e.preventDefault(); return; } if (ctrl && k === 'g') { e.shiftKey ? ungroupSel() : groupSel(); e.preventDefault(); return; }
  if (k === 'delete' || k === 'backspace') { deleteSel(); return; }
  if (k === 'enter' && S.pen) { finishPen(); return; } if (k === 'escape') { if (S.pen) finishPen(false); else { setSel([]); render(); } return; }
  const map = { v: 'select', a: 'direct', p: 'pen', '=': 'addpt', '-': 'delpt', c: 'convert', n: 'pencil', '\\': 'line', m: 'rect', l: 'ellipse', t: 'text', i: 'eyedrop', h: 'hand' };
  if (!ctrl && map[k]) setTool(map[k]);
  if (k.startsWith('arrow') && S.sel.length) { const d = e.shiftKey ? 10 : 1; transformSel(mTrans(k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0, k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0)); e.preventDefault(); }
});

/* Android back button hook */
window.__back = function () {
  if ($('#modal').classList.contains('show')) { $('#modal').classList.remove('show'); return true; }
  if (S.pen) { finishPen(false); return true; }
  if (S.panel) { S.panel = null; uiRefresh(true); return true; }
  if (S.sel.length) { setSel([]); render(); return true; }
  return false;
};
