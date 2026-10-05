/* Vẽ hình tương tác (kiểu Sketchpad) - phiên bản 3 - dùng cho tab Toán học
   Gắn vào <div id="mVeHinh"> trong index.html. Không cần thư viện ngoài.
   Cách dùng: chọn đối tượng (chạm), rồi bấm lệnh dựng hiện ra bên dưới khung vẽ. */
(function () {
  'use strict';
  var root = document.getElementById('mVeHinh');
  if (!root || root.getAttribute('data-vh')) return;
  root.setAttribute('data-vh', '3');

  /* ================= Hằng số & trạng thái ================= */
  var STEP = 0.5;
  var SAVE_KEY = 'vh_save_v2';
  var PAL = {
    dark:  { bg: '#0f1626', grid: 'rgba(255,255,255,.07)', axis: 'rgba(255,255,255,.2)', free: '#ffd54f', glide: '#4ade80', dep: '#a5b4fc', txt: '#e8eefc', trace: '#ff9ff3', meas: '#ffb86b', pend: '#ffffff', sel: '#ffd54f' },
    light: { bg: '#ffffff', grid: 'rgba(0,0,0,.09)',       axis: 'rgba(0,0,0,.25)',       free: '#c77700', glide: '#118a3e', dep: '#4a4fbf', txt: '#111827', trace: '#c2185b', meas: '#b45309', pend: '#000000', sel: '#d97706' }
  };
  var COLS = {
    dark:  ['#7fd4ff', '#ff7b7b', '#ffd54f', '#4ade80', '#c084fc', '#ffffff'],
    light: ['#1d3b8b', '#c62828', '#b8860b', '#118a3e', '#6a1b9a', '#111827']
  };
  var M = { pts: [], objs: [], meas: [], marks: [], nid: 1, nname: 0 };
  var ui = { tool: 'select', lock: false, pend: [], sel: [], grid: true, snap: false, names: true, meas: true, auto: true, dec: 2, unit: '', expGrid: false,
             playing: false, speed: 1, drag: null, down: null, ptr: null, touch: false, pinch: null };
  var view = { z: 1, ox: 0, oy: 0 };
  var traces = {}, undoS = [], redoS = [], ptrs = {};
  var WU = 16, HU = 10.5, S0 = 40, S = 40, SW = 0, SH = 0;
  var curActs = [];

  /* ================= Giao diện ================= */
  var css =
    '#mVeHinh .vh-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px;margin:8px 0}' +
    '#mVeHinh .vh-b{cursor:pointer;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;border-radius:10px;padding:5px 2px;font:inherit;line-height:1.1;text-align:center;min-height:46px}' +
    '#mVeHinh .vh-b i{display:block;font-style:normal;font-size:19px}' +
    '#mVeHinh .vh-b span{display:block;font-size:10.5px;opacity:.85;margin-top:2px}' +
    '#mVeHinh .vh-b.on{background:var(--a1,#4f5bf0);border-color:transparent;color:#fff}' +
    '#mVeHinh .vh-b.lock{box-shadow:0 0 0 2px #ffd54f inset}' +
    '#mVeHinh .vh-shapes{display:flex;flex-wrap:nowrap;gap:6px;margin:6px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}' +
    '#mVeHinh .vh-chip{min-height:36px;flex:0 0 auto;cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,213,79,.12);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;white-space:nowrap}' +
    '#mVeHinh .vh-lbl{font-size:12.5px;opacity:.85;margin:8px 0 0}' +
    '#mVeHinh svg.vh-svg{width:100%;height:clamp(320px,58vh,560px);display:block;touch-action:none;user-select:none;-webkit-user-select:none;background:var(--card2,#0f1626);border:1px solid var(--bd,#25324d);border-radius:10px;margin-top:6px}' +
    '#mVeHinh.vh-big svg.vh-svg{height:clamp(420px,80vh,820px)}' +
    '#mVeHinh .vh-status{font-size:13px;margin:6px 0;min-height:19px;opacity:.95}' +
    '#mVeHinh .vh-sel{font-size:13.5px;margin:4px 0;min-height:18px;opacity:.95}' +
    '#mVeHinh .vh-acts{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}' +
    '#mVeHinh .vh-a{cursor:pointer;min-height:40px;padding:6px 11px;border:1px solid rgba(255,213,79,.5);background:rgba(255,213,79,.12);color:inherit;border-radius:10px;font:inherit;white-space:nowrap}' +
    '#mVeHinh .vh-a.red{border-color:rgba(248,113,113,.7);background:rgba(248,113,113,.14)}' +
    '#mVeHinh .vh-cols{display:flex;gap:8px;margin:6px 0;align-items:center;flex-wrap:wrap}' +
    '#mVeHinh .vh-cols button{min-height:0;width:28px;height:28px;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.5);cursor:pointer}' +
    '#mVeHinh .vh-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}' +
    '#mVeHinh .vh-ctl label{font-size:14.5px;display:inline-flex;align-items:center;gap:4px}' +
    '#mVeHinh .vh-meas{margin:6px 0}' +
    '#mVeHinh .vh-m{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;margin:4px 0;border:1px solid rgba(255,255,255,.14);border-radius:8px;font-size:14px}' +
    '#mVeHinh .vh-m button{min-height:0;padding:2px 8px;cursor:pointer;border:0;background:transparent;color:inherit;font-size:16px;opacity:.7}' +
    '#mVeHinh .vh-dock{position:sticky;bottom:0;z-index:6;background:var(--card2,#0f1626);border:1px solid var(--bd,#25324d);border-radius:10px;padding:4px 8px;margin-top:6px;max-height:42vh;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
    '#mVeHinh .vh-dock .vh-status{margin:2px 0}#mVeHinh .vh-dock .vh-sel{margin:2px 0}' +
    '#mVeHinh .vh-sep{display:inline-flex;align-items:center;min-height:30px;padding:0 4px;font-size:12px;font-weight:700;opacity:.8;color:#ffd54f}' +
    '#mVeHinh .vh-a.tri{border-color:rgba(127,212,255,.6);background:rgba(127,212,255,.12)}' +
    '#mVeHinh details.vh-num{margin:8px 0;border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.04)}' +
    '#mVeHinh details.vh-num summary{cursor:pointer;font-weight:700;min-height:32px;display:flex;align-items:center}' +
    '#mVeHinh .vh-numrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}' +
    '#mVeHinh .vh-numrow label{font-size:14px;display:inline-flex;align-items:center;gap:4px}' +
    '#mVeHinh .vh-numrow input[type=text]{width:78px;min-height:36px;padding:4px 8px}' +
    '#mVeHinh .vh-numhelp{font-size:12.5px;opacity:.85}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var TOOLS = [
    ['select', '👆', 'Chọn/Kéo', 'Chạm để chọn điểm, đoạn, đường; chạm vào bên trong để chọn cả đa giác (chạm nhiều đối tượng để chọn nhiều). Kéo điểm để di chuyển, kéo vùng trống để dời khung, 2 ngón để phóng to/thu nhỏ.'],
    ['point', '●', 'Điểm', 'Chạm chỗ trống để đặt điểm. Chạm lên đoạn, đường, đường tròn để đặt điểm chạy trên đó.'],
    ['seg', '╱', 'Đoạn', 'Kéo từ điểm này sang điểm kia, hoặc chạm lần lượt 2 điểm.'],
    ['line', '↔', 'Đường', 'Kéo qua 2 điểm, hoặc chạm lần lượt 2 điểm.'],
    ['ray', '↗', 'Tia', 'Kéo từ gốc tia qua một điểm, hoặc chạm gốc rồi chạm điểm thứ 2.'],
    ['circ', '○', 'Tròn', 'Kéo từ tâm ra bán kính, hoặc chạm tâm rồi chạm một điểm trên đường tròn.'],
    ['poly', '⬠', 'Đa giác', 'Chạm lần lượt các đỉnh. Chạm lại đỉnh đầu hoặc bấm "Khép đa giác" để kết thúc.']
  ];
  var VIEWBTNS = [['zin', '＋', 'Phóng to'], ['zout', '－', 'Thu nhỏ'], ['zfit', '⤢', 'Vừa khung'], ['zreset', '⌂', 'Về gốc']];

  root.innerHTML =
    '<div class="vh-tools" id="vhTools"></div>' +
    '<div class="vh-lbl"><b>Vẽ nhanh hình cơ bản</b> (trượt ngang để xem thêm; kéo điểm để đổi kích thước, hình vẫn giữ tính chất)</div>' +
    '<div class="vh-shapes" id="vhShapes"></div>' +
    '<details class="vh-num" id="vhNum"><summary>📏 Dựng theo số đo (nhập độ dài, góc)</summary>' +
    '<div class="vh-numrow"><select id="vhNumKind"></select></div>' +
    '<div class="vh-numrow" id="vhNumIn"></div>' +
    '<div class="vh-numrow"><label><input type="checkbox" id="vhNumMeas" checked> Ghi số đo lên hình</label><button class="sm" id="vhNumGo" type="button">✏️ Vẽ hình</button></div>' +
    '<div class="vh-numhelp" id="vhNumHelp"></div></details>' +
    '<svg class="vh-svg" id="vhSvg"></svg>' +
    '<div class="vh-dock" id="vhDock">' +
    '<div class="vh-status" id="vhStatus"></div>' +
    '<div class="vh-sel" id="vhSel"></div>' +
    '<div class="vh-acts" id="vhActs"></div>' +
    '<div class="vh-cols" id="vhCols"></div></div>' +
    '<div class="vh-ctl">' +
    '<button class="sm green" id="vhPlay" type="button">▶ Chạy</button>' +
    '<label>Tốc độ <input type="range" id="vhSpeed" min="0.2" max="3" step="0.1" value="1" style="width:110px"></label>' +
    '<button class="sm sec" id="vhUndo" type="button">↶ Hoàn tác</button>' +
    '<button class="sm sec" id="vhRedo" type="button">↷ Làm lại</button>' +
    '<button class="sm sec" id="vhClrTr" type="button">🧹 Xóa vệt</button>' +
    '<button class="sm orange" id="vhPng" type="button">📷 Lưu ảnh</button>' +
    '<button class="sm orange" id="vhCopy" type="button">📋 Sao chép ảnh</button>' +
    '<button class="sm sec" id="vhSave" type="button">💾 Lưu file</button>' +
    '<button class="sm sec" id="vhOpen" type="button">📂 Mở file</button>' +
    '<button class="sm sec" id="vhClear" type="button">🗑 Xóa hết</button>' +
    '<input type="file" id="vhFile" accept=".json,application/json" style="display:none">' +
    '</div>' +
    '<div class="vh-ctl">' +
    '<label><input type="checkbox" id="vhGrid" checked> Lưới</label>' +
    '<label><input type="checkbox" id="vhSnap"> Bắt lưới</label>' +
    '<label><input type="checkbox" id="vhNames" checked> Tên điểm</label>' +
    '<label><input type="checkbox" id="vhMeasShow" checked> Hiện số đo</label>' +
    '<label><input type="checkbox" id="vhBig"> Khung vẽ lớn</label>' +
    '<label><input type="checkbox" id="vhAuto" checked> Tự ký hiệu (góc vuông, trung điểm...)</label>' +
    '<label><input type="checkbox" id="vhExpGrid"> Ảnh xuất có lưới</label>' +
    '<label>Số lẻ <select id="vhDec"><option value="0">0</option><option value="1">1</option><option value="2" selected>2</option></select></label>' +
    '<label>Đơn vị <select id="vhUnit"><option value="">(không)</option><option value="cm">cm</option><option value="mm">mm</option><option value="dm">dm</option><option value="m">m</option></select></label>' +
    '</div>' +
    '<div class="vh-meas" id="vhMeas"></div>' +
    '<div class="note"><b>Cách dựng hình kiểu Sketchpad:</b> chạm để chọn đối tượng (điểm, đoạn, đường, hoặc chạm <b>vào bên trong</b> một đa giác để chọn cả hình), rồi bấm lệnh hiện ra ở thanh dưới khung vẽ. <b>Tam giác:</b> chọn tam giác (hoặc 3 đỉnh) để dựng nhanh 3 đường cao + trực tâm, 3 trung tuyến + trọng tâm, 3 phân giác + tâm nội tiếp, 3 trung trực + tâm ngoại tiếp, đường trung bình, đo cạnh và góc; chọn thêm 1 đỉnh để chỉ dựng đường từ đỉnh đó. Chọn đa giác để đo cạnh, góc, ký hiệu cạnh bằng nhau, góc vuông. Mở mục <b>Dựng theo số đo</b> để vẽ đúng tam giác, hình chữ nhật, hình bình hành... theo số liệu đề bài. Điểm <b>vàng</b> kéo tự do, điểm <b>xanh lá</b> chạy trên đường, điểm <b>xanh tím</b> phụ thuộc. Dạy học: bật số đo, cho học sinh <b>dự đoán</b> rồi kéo điểm; bỏ chọn \"Hiện số đo\" để ẩn số trước khi hé lộ. Mặc định 1 ô lưới = 1 đơn vị. Chạm lại công cụ đang chọn để khóa công cụ (vẽ liên tục). Phím tắt (máy tính): Esc bỏ chọn, Ctrl+Z hoàn tác, Ctrl+Y làm lại, Delete xóa.</div>';

  var svg = root.querySelector('#vhSvg');
  var elTools = root.querySelector('#vhTools'), elShapes = root.querySelector('#vhShapes');
  var elStatus = root.querySelector('#vhStatus'), elMeas = root.querySelector('#vhMeas');
  var elSel = root.querySelector('#vhSel'), elActs = root.querySelector('#vhActs'), elCols = root.querySelector('#vhCols');
  var elPlay = root.querySelector('#vhPlay');

  /* ================= Tiện ích ================= */
  function byId(a, id) { for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function P(id) { return byId(M.pts, id); }
  function O(id) { return byId(M.objs, id); }
  function V(a, b) { return { x: b.x - a.x, y: b.y - a.y }; }
  function len(v) { return Math.hypot(v.x, v.y); }
  function unit(v) { var l = len(v); return l < 1e-9 ? null : { x: v.x / l, y: v.y / l }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(v) {
    var k = Math.pow(10, ui.dec), t = (Math.round(v * k) / k).toFixed(ui.dec);
    if (t.indexOf('.') >= 0) t = t.replace(/0+$/, '').replace(/\.$/, '');
    if (t === '-0') t = '0';
    return t.replace('.', ',');
  }
  function fmtL(v) { return fmt(v) + (ui.unit ? ' ' + ui.unit : ''); }
  function fmtA(v) { return fmt(v) + (ui.unit ? ' ' + ui.unit + '²' : ''); }
  function snapV(v) { return ui.snap ? Math.round(v / STEP) * STEP : v; }
  function X(x) { return view.ox + x * S; }
  function Y(y) { return view.oy + y * S; }
  function toW(px, py) { return { x: (px - view.ox) / S, y: (py - view.oy) / S }; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function nameUsed(n) { for (var i = 0; i < M.pts.length; i++) if (M.pts[i].name === n) return true; return false; }
  function nextName() {
    var L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', s, n, k;
    do { n = M.nname++; k = Math.floor(n / 26); s = L.charAt(n % 26) + (k ? k : ''); } while (nameUsed(s));
    return s;
  }
  function pickName(list) { for (var i = 0; i < list.length; i++) if (!nameUsed(list[i])) return list[i]; return nextName(); }
  function addMark(m) { m.id = M.nid++; M.marks.push(m); return m; }
  function pairKey(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
  function addPt(o) { o.id = M.nid++; o.name = o.name || nextName(); o.ok = true; o.anim = false; o.trace = false; o.dir = 1; M.pts.push(o); return o; }
  function addObj(o) { o.id = M.nid++; M.objs.push(o); return o; }
  function say(t, keep) { elStatus.textContent = t; if (!keep) { clearTimeout(say.t); say.t = setTimeout(hint, 4000); } }
  function isGlider(p) { return p.type === 'onseg' || p.type === 'online' || p.type === 'oncirc'; }
  function shownPt(p) { return p.ok && !p.hid && !p.aux; }
  function shownObj(o) { return !o.hidden && !o.hid; }
  function ptItem(p) { return { t: 'p', id: p.id }; }
  function objItem(o) { return { t: 'o', ref: { id: o.id } }; }

  /* ================= Hình học ================= */
  function geom(ref) {
    var o = O(ref.id); if (!o) return null;
    function pp(i) { var p = P(o.p[i]); return p && p.ok ? p : null; }
    var a, b, c, d, g, n, e;
    switch (o.type) {
      case 'seg': case 'poly':
        if (o.type === 'poly') { n = o.p.length; e = ref.e || 0; a = pp(e); b = pp((e + 1) % n); } else { a = pp(0); b = pp(1); }
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: a, d: d, lo: 0, hi: len(V(a, b)), a: a, b: b, fin: true };
      case 'line': a = pp(0); b = pp(1);
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: a, d: d, lo: -Infinity, hi: Infinity };
      case 'ray': a = pp(0); b = pp(1);
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: a, d: d, lo: 0, hi: Infinity };
      case 'perpline': a = pp(0); g = geom(o.o[0]);
        if (!a || !g || g.k !== 'l') return null;
        return { k: 'l', p: a, d: { x: g.d.y, y: -g.d.x }, lo: -Infinity, hi: Infinity };
      case 'parline': a = pp(0); g = geom(o.o[0]);
        if (!a || !g || g.k !== 'l') return null;
        return { k: 'l', p: a, d: g.d, lo: -Infinity, hi: Infinity };
      case 'pbis': a = pp(0); b = pp(1);
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: { x: d.y, y: -d.x }, lo: -Infinity, hi: Infinity };
      case 'bis': case 'bisray': a = pp(0); b = pp(1); c = pp(2);
        if (!a || !b || !c) return null;
        var u = unit(V(b, a)), v = unit(V(b, c)); if (!u || !v) return null;
        d = unit({ x: u.x + v.x, y: u.y + v.y }) || { x: -u.y, y: u.x };
        return { k: 'l', p: b, d: d, lo: o.type === 'bisray' ? 0 : -Infinity, hi: Infinity };
      case 'circ': a = pp(0); b = pp(1);
        if (!a || !b) return null;
        return { k: 'c', c: a, r: len(V(a, b)) };
      case 'circ3': a = pp(0); b = pp(1); c = pp(2);
        if (!a || !b || !c) return null;
        var dd = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if (Math.abs(dd) < 1e-9) return null;
        var a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
        var ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / dd, uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / dd;
        return { k: 'c', c: { x: ux, y: uy }, r: Math.hypot(a.x - ux, a.y - uy) };
    }
    return null;
  }

  function inter(r1, r2, k) {
    var g1 = geom(r1), g2 = geom(r2), t, u, tmp;
    if (!g1 || !g2) return null;
    if (g1.k === 'l' && g2.k === 'l') {
      var den = g1.d.x * g2.d.y - g1.d.y * g2.d.x; if (Math.abs(den) < 1e-9) return null;
      var w = V(g1.p, g2.p);
      t = (w.x * g2.d.y - w.y * g2.d.x) / den; u = (w.x * g1.d.y - w.y * g1.d.x) / den;
      if (t < g1.lo - 1e-9 || t > g1.hi + 1e-9 || u < g2.lo - 1e-9 || u > g2.hi + 1e-9) return null;
      return { x: g1.p.x + g1.d.x * t, y: g1.p.y + g1.d.y * t };
    }
    if (g1.k === 'c' && g2.k === 'l') { tmp = g1; g1 = g2; g2 = tmp; }
    if (g1.k === 'l' && g2.k === 'c') {
      var f = V(g2.c, g1.p), bq = f.x * g1.d.x + f.y * g1.d.y, cq = f.x * f.x + f.y * f.y - g2.r * g2.r, disc = bq * bq - cq;
      if (disc < -1e-9) return null;
      var sq = Math.sqrt(Math.max(disc, 0)); t = k ? -bq + sq : -bq - sq;
      if (t < g1.lo - 1e-9 || t > g1.hi + 1e-9) return null;
      return { x: g1.p.x + g1.d.x * t, y: g1.p.y + g1.d.y * t };
    }
    if (g1.k === 'c' && g2.k === 'c') {
      var dd = len(V(g1.c, g2.c));
      if (dd < 1e-9 || dd > g1.r + g2.r + 1e-9 || dd < Math.abs(g1.r - g2.r) - 1e-9) return null;
      var aa = (g1.r * g1.r - g2.r * g2.r + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(g1.r * g1.r - aa * aa, 0));
      var ex = (g2.c.x - g1.c.x) / dd, ey = (g2.c.y - g1.c.y) / dd, mx = g1.c.x + aa * ex, my = g1.c.y + aa * ey, sg = k ? 1 : -1;
      return { x: mx - sg * h * ey, y: my + sg * h * ex };
    }
    return null;
  }

  function circumC(a, b, c) {
    var dd = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if (Math.abs(dd) < 1e-9) return null;
    var a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    return { x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / dd, y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / dd };
  }
  /* các tâm của tam giác: G trọng tâm, H trực tâm, I tâm nội tiếp, O tâm ngoại tiếp */
  function tcenter(a, b, c, k) {
    var o;
    if (k === 'G') return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
    if (k === 'O') return circumC(a, b, c);
    if (k === 'H') { o = circumC(a, b, c); return o ? { x: a.x + b.x + c.x - 2 * o.x, y: a.y + b.y + c.y - 2 * o.y } : null; }
    if (k === 'I') {
      var la = len(V(b, c)), lb = len(V(c, a)), lc = len(V(a, b)), sm = la + lb + lc; if (sm < 1e-9) return null;
      return { x: (la * a.x + lb * b.x + lc * c.x) / sm, y: (la * a.y + lb * b.y + lc * c.y) / sm };
    }
    return null;
  }
  function polySign(po) {
    var pts = po.p.map(P), ar = 0, i, a, b;
    if (pts.some(function (p) { return !p || !p.ok; })) return 0;
    for (i = 0; i < pts.length; i++) { a = pts[i]; b = pts[(i + 1) % pts.length]; ar += a.x * b.y - b.x * a.y; }
    return ar > 1e-9 ? 1 : ar < -1e-9 ? -1 : 0;
  }
  function polyCentroid(o) {
    var pts = o.p.map(P), cx = 0, cy = 0;
    if (pts.some(function (p) { return !p || !p.ok; })) return null;
    pts.forEach(function (p) { cx += p.x; cy += p.y; });
    return { x: cx / pts.length, y: cy / pts.length };
  }

  function compute() {
    M.pts.forEach(function (p) {
      var ok = true, a, b, c, g, q;
      switch (p.type) {
        case 'free': break;
        case 'mid': a = P(p.p[0]); b = P(p.p[1]);
          if (a && b && a.ok && b.ok) { p.x = (a.x + b.x) / 2; p.y = (a.y + b.y) / 2; } else ok = false; break;
        case 'sum': a = P(p.p[0]); b = P(p.p[1]); c = P(p.p[2]);
          if (a && b && c && a.ok && b.ok && c.ok) { p.x = b.x + c.x - a.x; p.y = b.y + c.y - a.y; } else ok = false; break;
        case 'ngon': a = P(p.p[0]); b = P(p.p[1]);
          if (!(a && b && a.ok && b.ok)) { ok = false; break; }
          var dx = b.x - a.x, dy = b.y - a.y, cx = b.x, cy = b.y, ph = -2 * Math.PI / p.n, cs = Math.cos(ph), sn = Math.sin(ph);
          for (var i = 2; i <= p.idx; i++) { var nx = dx * cs - dy * sn, ny = dx * sn + dy * cs; dx = nx; dy = ny; cx += dx; cy += dy; }
          p.x = cx; p.y = cy; break;
        case 'onseg': g = geom(p.o[0]);
          if (g) { var t = clamp(p.k, 0, 1); p.x = g.a.x + (g.b.x - g.a.x) * t; p.y = g.a.y + (g.b.y - g.a.y) * t; } else ok = false; break;
        case 'online': g = geom(p.o[0]);
          if (g && g.k === 'l') { var kk = clamp(p.k, g.lo, g.hi); p.x = g.p.x + g.d.x * kk; p.y = g.p.y + g.d.y * kk; } else ok = false; break;
        case 'oncirc': g = geom(p.o[0]);
          if (g && g.k === 'c') { p.x = g.c.x + g.r * Math.cos(p.k); p.y = g.c.y + g.r * Math.sin(p.k); } else ok = false; break;
        case 'inter': var r = inter(p.o[0], p.o[1], p.k);
          if (r) { p.x = r.x; p.y = r.y; } else ok = false; break;
        case 'tcen': a = P(p.p[0]); b = P(p.p[1]); c = P(p.p[2]);
          if (a && b && c && a.ok && b.ok && c.ok) { var tc = tcenter(a, b, c, p.k); if (tc) { p.x = tc.x; p.y = tc.y; } else ok = false; } else ok = false; break;
        case 'foot': case 'refl':
          q = P(p.p[0]); g = geom(p.o[0]);
          if (q && q.ok && g && g.k === 'l') {
            var tt = (q.x - g.p.x) * g.d.x + (q.y - g.p.y) * g.d.y, fx = g.p.x + g.d.x * tt, fy = g.p.y + g.d.y * tt;
            if (p.type === 'foot') { p.x = fx; p.y = fy; } else { p.x = 2 * fx - q.x; p.y = 2 * fy - q.y; }
          } else ok = false; break;
        case 'pref': q = P(p.p[0]); c = P(p.p[1]);
          if (q && c && q.ok && c.ok) { p.x = 2 * c.x - q.x; p.y = 2 * c.y - q.y; } else ok = false; break;
        case 'rot': q = P(p.p[0]); c = P(p.p[1]);
          if (q && c && q.ok && c.ok) {
            var f2 = p.k * Math.PI / 180, ddx = q.x - c.x, ddy = q.y - c.y;
            p.x = c.x + ddx * Math.cos(f2) + ddy * Math.sin(f2); p.y = c.y - ddx * Math.sin(f2) + ddy * Math.cos(f2);
          } else ok = false; break;
      }
      p.ok = ok;
    });
  }

  /* quỹ tích: lấy mẫu điểm dẫn (điểm chạy) rồi ghi lại vị trí điểm đích */
  function computeLocus() {
    M.objs.forEach(function (o) {
      if (o.type !== 'locus') return;
      var D = P(o.p[0]), T = P(o.p[1]), res = [];
      if (!D || !T || !isGlider(D)) { o._pts = []; return; }
      var k0 = D.k, lo, hi, n = 160, g = geom(D.o[0]);
      if (D.type === 'onseg') { lo = 0; hi = 1; }
      else if (D.type === 'oncirc') { lo = 0; hi = 2 * Math.PI; }
      else { lo = Math.max(g ? g.lo : -12, -12); hi = Math.min(g ? g.hi : 12, 12); }
      for (var i = 0; i <= n; i++) {
        D.k = lo + (hi - lo) * i / n; compute();
        res.push(T.ok ? [T.x, T.y] : null);
      }
      D.k = k0; compute();
      o._pts = res;
    });
  }

  function objAnc(oid, out, seen) {
    var o = O(oid); if (!o || seen['o' + oid]) return; seen['o' + oid] = 1;
    (o.p || []).forEach(function (i) { freeAnc(i, out, seen); });
    (o.o || []).forEach(function (r) { objAnc(r.id, out, seen); });
  }
  function freeAnc(pid, out, seen) {
    var p = P(pid); if (!p || seen[pid]) return; seen[pid] = 1;
    if (p.type === 'free') { out.push(p); return; }
    (p.p || []).forEach(function (i) { freeAnc(i, out, seen); });
    (p.o || []).forEach(function (r) { objAnc(r.id, out, seen); });
  }

  /* ================= Lưu, hoàn tác ================= */
  function dump() { return JSON.stringify({ pts: M.pts, objs: M.objs.map(function (o) { var c = {}; for (var k in o) if (k !== '_pts') c[k] = o[k]; return c; }), meas: M.meas, marks: M.marks, nid: M.nid, nname: M.nname }); }
  function restore(j) {
    var o = JSON.parse(j);
    if (!o || !Array.isArray(o.pts) || !Array.isArray(o.objs) || !Array.isArray(o.meas)) throw new Error('bad');
    M.pts = o.pts; M.objs = o.objs; M.meas = o.meas; M.marks = Array.isArray(o.marks) ? o.marks : []; M.nid = o.nid || 1; M.nname = o.nname || 0;
    traces = {}; ui.pend = []; ui.sel = []; ui.drag = null; ui.down = null;
  }
  function snap() { var j = dump(); if (undoS[undoS.length - 1] !== j) { undoS.push(j); if (undoS.length > 80) undoS.shift(); redoS = []; } }
  function undo() {
    var cur = dump(), j = null;
    while (undoS.length) { j = undoS.pop(); if (j !== cur) break; j = null; }
    if (!j) { say('Không còn thao tác để hoàn tác.'); return; }
    redoS.push(cur); restore(j); commit();
  }
  function redo() {
    var cur = dump(), j = null;
    while (redoS.length) { j = redoS.pop(); if (j !== cur) break; j = null; }
    if (!j) { say('Không có thao tác để làm lại.'); return; }
    undoS.push(cur); restore(j); commit();
  }
  var saveT = 0;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(function () { try { localStorage.setItem(SAVE_KEY, dump()); } catch (e) { } }, 400);
  }
  function commit() { refresh(); persist(); }

  /* ================= Hình nhanh ================= */
  function F(x, y) { return addPt({ type: 'free', x: x, y: y }); }
  function hid(o) { o.hidden = true; return addObj(o); }
  function poly(a) {
    var names = a.map(function (p) { return p.name; }).sort(function (x, y) { return x.length - y.length || (x < y ? -1 : 1); });
    a.forEach(function (p, i) { p.name = names[i]; });
    return addObj({ type: 'poly', p: a.map(function (p) { return p.id; }) });
  }
  function lineAB(a, b) { return hid({ type: 'line', p: [a.id, b.id] }); }
  function perpGlide(a, b, k) {
    var l = lineAB(a, b), pl = hid({ type: 'perpline', p: [a.id], o: [{ id: l.id }] });
    return addPt({ type: 'online', o: [{ id: pl.id }], k: k });
  }
  function sumPt(a, b, d) { return addPt({ type: 'sum', p: [a.id, b.id, d.id] }); }
  function ngonShape(n, ax, ay, side) {
    var a = F(ax, ay), b = F(ax + side, ay), ids = [a, b];
    for (var i = 2; i < n; i++) ids.push(addPt({ type: 'ngon', p: [a.id, b.id], n: n, idx: i }));
    poly(ids);
  }
  var SHAPES = [
    ['△ Tam giác', function (c) { poly([F(c.x - 3, c.y + 2), F(c.x + 3, c.y + 2), F(c.x - 1, c.y - 3)]); }],
    ['△ Đều', function (c) { ngonShape(3, c.x - 2.5, c.y + 2, 5); }],
    ['◺ Vuông', function (c) { var a = F(c.x - 3, c.y + 2), b = F(c.x + 3, c.y + 2), d = perpGlide(a, b, 4); poly([a, b, d]); }],
    ['△ Cân', function (c) {
      var a = F(c.x - 3, c.y + 2), b = F(c.x + 3, c.y + 2), l = hid({ type: 'pbis', p: [a.id, b.id] });
      var d = addPt({ type: 'online', o: [{ id: l.id }], k: 5 }); poly([a, b, d]);
    }],
    ['□ Vuông', function (c) { ngonShape(4, c.x - 2, c.y + 2, 4); }],
    ['▭ Chữ nhật', function (c) { var a = F(c.x - 3, c.y + 2), b = F(c.x + 3, c.y + 2), d = perpGlide(a, b, 4), e = sumPt(a, b, d); poly([a, b, e, d]); }],
    ['▱ Bình hành', function (c) { var a = F(c.x - 3, c.y + 2), b = F(c.x + 2, c.y + 2), d = F(c.x - 2, c.y - 2), e = sumPt(a, b, d); poly([a, b, e, d]); }],
    ['◇ Thoi', function (c) {
      var a = F(c.x - 3, c.y + 2), b = F(c.x + 1, c.y + 2), ci = hid({ type: 'circ', p: [a.id, b.id] });
      var d = addPt({ type: 'oncirc', o: [{ id: ci.id }], k: -Math.PI / 3 }), e = sumPt(a, b, d); poly([a, b, e, d]);
    }],
    ['⏢ Thang', function (c) {
      var a = F(c.x - 4, c.y + 2), b = F(c.x + 4, c.y + 2), d = F(c.x - 2, c.y - 2), l = lineAB(a, b), pl = hid({ type: 'parline', p: [d.id], o: [{ id: l.id }] });
      var e = addPt({ type: 'online', o: [{ id: pl.id }], k: 4 }); poly([a, b, e, d]);
    }],
    ['⬠ Ngũ giác', function (c) { ngonShape(5, c.x - 1.5, c.y + 2.5, 3); }],
    ['⬡ Lục giác', function (c) { ngonShape(6, c.x - 1.5, c.y + 2.5, 3); }],
    ['△ Tù', function (c) { poly([F(c.x - 4, c.y + 2), F(c.x + 3, c.y + 2), F(c.x - 5.5, c.y - 2.5)]); }],
    ['◺ Vuông cân', function (c) { var a = F(c.x - 3, c.y + 2.5), b = F(c.x + 3, c.y + 2.5), d = addPt({ type: 'rot', p: [b.id, a.id], k: 90 }); poly([a, b, d]); }],
    ['⏢ Thang cân', function (c) {
      var a = F(c.x - 4, c.y + 2), b = F(c.x + 4, c.y + 2), l = hid({ type: 'pbis', p: [a.id, b.id] }), d = F(c.x - 2, c.y - 2);
      var e = addPt({ type: 'refl', p: [d.id], o: [{ id: l.id }] }); poly([a, b, e, d]);
    }],
    ['⏢ Thang vuông', function (c) {
      var a = F(c.x - 4, c.y + 2), b = F(c.x + 3, c.y + 2), d = perpGlide(a, b, 4), l2 = lineAB(a, b), pl = hid({ type: 'parline', p: [d.id], o: [{ id: l2.id }] });
      var e = addPt({ type: 'online', o: [{ id: pl.id }], k: 3 }); poly([a, b, e, d]);
    }],
    ['⊙ Tam giác nội tiếp', function (c) { inscribed(c, 3); }],
    ['⊙ Tứ giác nội tiếp', function (c) { inscribed(c, 4); }],
    ['○ Tròn', function (c) { var o = addPt({ type: 'free', x: c.x, y: c.y, name: pickName(['O']) }), r = F(c.x + 3, c.y); addObj({ type: 'circ', p: [o.id, r.id] }); }]
  ];
  /* tam giác / tứ giác nội tiếp: 3 đỉnh kéo tự do, tâm O phụ thuộc, đỉnh thứ 4 chạy trên đường tròn nên luôn nội tiếp */
  function inscribed(c, n) {
    var r = 3.3, rad = function (d) { return d * Math.PI / 180; };
    var A = F(c.x + r * Math.cos(rad(140)), c.y + r * Math.sin(rad(140))), B = F(c.x + r * Math.cos(rad(40)), c.y + r * Math.sin(rad(40)));
    var C = F(c.x + r * Math.cos(rad(n === 3 ? -80 : -40)), c.y + r * Math.sin(rad(n === 3 ? -80 : -40)));
    var Oc = addPt({ type: 'tcen', k: 'O', name: pickName(['O']), p: [A.id, B.id, C.id] });
    var ci = addObj({ type: 'circ', p: [Oc.id, A.id], c: 0 });
    if (n === 3) poly([A, B, C]);
    else { var D = addPt({ type: 'oncirc', o: [{ id: ci.id }], k: rad(-140) }); poly([A, B, C, D]); }
  }

  /* ================= Chọn đối tượng ================= */
  function dseg(px, py, a, b) {
    var vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy, t = l2 ? ((px - a.x) * vx + (py - a.y) * vy) / l2 : 0;
    t = clamp(t, 0, 1); return Math.hypot(px - (a.x + vx * t), py - (a.y + vy * t));
  }
  function inPoly(w, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if (((yi > w.y) !== (yj > w.y)) && (w.x < (xj - xi) * (w.y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function hitPoint(w) {
    var best = null, bd = (ui.touch ? 22 : 14) / S;
    for (var i = M.pts.length - 1; i >= 0; i--) {
      var p = M.pts[i]; if (!shownPt(p)) continue;
      var d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d <= bd) { best = p; bd = d; }
    }
    return best;
  }
  function hitObj(w, opt) {
    opt = opt || {}; var tol = (ui.touch ? 14 : 10) / S;
    for (var i = M.objs.length - 1; i >= 0; i--) {
      var o = M.objs[i]; if (!shownObj(o)) continue;
      if (o.type === 'poly') {
        var pts = o.p.map(P); if (pts.some(function (p) { return !p || !p.ok; })) continue;
        for (var e = 0; e < pts.length; e++) {
          if (dseg(w.x, w.y, pts[e], pts[(e + 1) % pts.length]) <= tol) return { ref: { id: o.id, e: e }, o: o };
        }
        if (opt.interior && inPoly(w, pts)) return { ref: { id: o.id }, o: o };
        continue;
      }
      if (o.type === 'locus') {
        var lp = o._pts || [];
        for (var q = 1; q < lp.length; q++) {
          if (lp[q] && lp[q - 1] && dseg(w.x, w.y, { x: lp[q - 1][0], y: lp[q - 1][1] }, { x: lp[q][0], y: lp[q][1] }) <= tol) return { ref: { id: o.id }, o: o };
        }
        continue;
      }
      var g = geom({ id: o.id }); if (!g) continue;
      if (g.k === 'c') { if (Math.abs(len(V(g.c, w)) - g.r) <= tol) return { ref: { id: o.id }, o: o }; }
      else {
        var lo = Math.max(g.lo, -1e5), hi = Math.min(g.hi, 1e5);
        var a0 = { x: g.p.x + g.d.x * lo, y: g.p.y + g.d.y * lo }, b0 = { x: g.p.x + g.d.x * hi, y: g.p.y + g.d.y * hi };
        if (dseg(w.x, w.y, a0, b0) <= tol) return { ref: { id: o.id }, o: o };
      }
    }
    return null;
  }
  function hitAny(w) {
    var p = hitPoint(w); if (p) return { t: 'p', id: p.id };
    var h = hitObj(w, { interior: true }); if (h) return { t: 'o', ref: h.ref };
    return null;
  }
  function itemKey(it) { return it.t === 'p' ? 'p' + it.id : 'o' + it.ref.id + '.' + (it.ref.e === undefined ? '' : it.ref.e); }
  function selIndex(it) { var k = itemKey(it); for (var i = 0; i < ui.sel.length; i++) if (itemKey(ui.sel[i]) === k) return i; return -1; }
  function itemValid(it) { return it.t === 'p' ? !!P(it.id) : !!O(it.ref.id); }

  function lineLabel(ref) {
    var o = O(ref.id); if (!o) return '?';
    var nm = function (i) { var p = P(i); return p ? p.name : '?'; };
    if (o.type === 'poly') { var n = o.p.length; return ref.e === undefined ? o.p.map(nm).join('') : nm(o.p[ref.e]) + nm(o.p[(ref.e + 1) % n]); }
    if (o.type === 'seg' || o.type === 'line' || o.type === 'ray') return nm(o.p[0]) + nm(o.p[1]);
    if (o.type === 'circ') return '(' + nm(o.p[0]) + ')';
    if (o.type === 'circ3') return '(' + o.p.map(nm).join('') + ')';
    if (o.type === 'locus') return 'quỹ tích ' + nm(o.p[1]);
    return { perpline: 'đường vuông góc', parline: 'đường song song', pbis: 'đường trung trực', bis: 'đường phân giác', bisray: 'tia phân giác' }[o.type] || 'đường';
  }
  function itemName(it) { return it.t === 'p' ? (P(it.id) ? P(it.id).name : '?') : lineLabel(it.ref); }

  /* ================= Xóa ================= */
  function cascade(dp, dobj) {
    var ch = true;
    while (ch) {
      ch = false;
      M.objs.forEach(function (o) {
        if (dobj[o.id]) return;
        if ((o.p || []).some(function (i) { return dp[i]; }) || (o.o || []).some(function (r) { return dobj[r.id]; })) { dobj[o.id] = 1; ch = true; }
      });
      M.pts.forEach(function (p) {
        if (dp[p.id]) return;
        if ((p.p || []).some(function (i) { return dp[i]; }) || (p.o || []).some(function (r) { return dobj[r.id]; })) { dp[p.id] = 1; ch = true; }
      });
    }
    M.pts = M.pts.filter(function (p) { return !dp[p.id]; });
    M.objs = M.objs.filter(function (o) { return !dobj[o.id]; });
    M.meas = M.meas.filter(function (m) {
      return !((m.p || []).some(function (i) { return dp[i]; }) || (m.o || []).some(function (r) { return dobj[r.id]; }));
    });
    M.marks = M.marks.filter(function (m) {
      return !((m.p || []).some(function (i) { return dp[i]; }) || (m.o || []).some(function (r) { return dobj[r.id]; }));
    });
    Object.keys(dp).forEach(function (k) { delete traces[k]; });
    ui.sel = ui.sel.filter(itemValid); ui.pend = ui.pend.filter(function (p) { return !!P(p.id); });
  }

  /* ================= Điểm đặt bằng chạm ================= */
  function glideOn(ref, w) {
    var g = geom(ref); if (!g) return null;
    if (g.k === 'c') return addPt({ type: 'oncirc', o: [{ id: ref.id, e: ref.e }], k: Math.atan2(w.y - g.c.y, w.x - g.c.x) });
    if (g.fin) {
      var t = ((w.x - g.a.x) * (g.b.x - g.a.x) + (w.y - g.a.y) * (g.b.y - g.a.y)) / Math.pow(len(V(g.a, g.b)), 2);
      return addPt({ type: 'onseg', o: [{ id: ref.id, e: ref.e }], k: clamp(t, 0, 1) });
    }
    return addPt({ type: 'online', o: [{ id: ref.id }], k: clamp((w.x - g.p.x) * g.d.x + (w.y - g.p.y) * g.d.y, g.lo, g.hi) });
  }
  /* trả về điểm tại vị trí chạm: điểm có sẵn, điểm chạy trên đối tượng, hoặc điểm tự do mới */
  function pointAt(w, tgt) {
    if (tgt && tgt.t === 'p') return P(tgt.id);
    if (tgt && tgt.t === 'o') {
      var o = O(tgt.ref.id);
      if (o && !(o.type === 'poly' && tgt.ref.e === undefined) && o.type !== 'locus') { var g = glideOn(tgt.ref, w); if (g) return g; }
    }
    return addPt({ type: 'free', x: snapV(w.x), y: snapV(w.y) });
  }
  function segEnds(ref) {
    var o = O(ref.id); if (!o) return null;
    if (o.type === 'poly') { var n = o.p.length, e = ref.e || 0; return [P(o.p[e]), P(o.p[(e + 1) % n])]; }
    return [P(o.p[0]), P(o.p[1])];
  }

  /* ================= Thao tác bằng con trỏ ================= */
  function pxy(e) { var r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function setTool(id, keepSel) {
    ui.tool = id; ui.pend = []; if (id !== 'select' && !keepSel) ui.sel = [];
    updToolBtns(); hint(); refresh();
  }
  function afterDraw(items) {
    ui.pend = []; ui.sel = items || [];
    if (!ui.lock && ui.tool !== 'select') { ui.tool = 'select'; updToolBtns(); }
    hint(); commit();
  }
  function closePoly() {
    if (ui.pend.length < 3) return;
    snap(); var o = addObj({ type: 'poly', p: ui.pend.map(function (q) { return q.id; }) });
    afterDraw([objItem(o)]);
  }

  function tapSelect(tgt) {
    if (!tgt) ui.sel = [];
    else {
      var i = selIndex(tgt);
      if (i >= 0) ui.sel.splice(i, 1); else ui.sel.push(tgt);
    }
    refresh();
  }

  function drawUp(d, w) {
    var t = ui.tool, a, b, p, o;
    if (t === 'point') {
      if (d.moved) return;
      if (d.tgt && d.tgt.t === 'p') { say('Đã có điểm ' + P(d.tgt.id).name + ' ở đó.'); return; }
      snap(); p = pointAt(w, d.tgt); afterDraw([ptItem(p)]);
      return;
    }
    if (t === 'seg' || t === 'line' || t === 'ray' || t === 'circ') {
      if (d.moved) {
        snap(); a = pointAt(d.w, d.tgt); var tg2 = hitAny(w); b = pointAt(w, tg2);
        if (a.id === b.id) { ui.pend = []; refresh(); return; }
        o = addObj({ type: t, p: [a.id, b.id] }); afterDraw([objItem(o)]); return;
      }
      snap(); p = pointAt(w, d.tgt);
      if (ui.pend.length && ui.pend[0].id === p.id) { hint(); commit(); return; }
      ui.pend.push(p);
      if (ui.pend.length === 2) { o = addObj({ type: t, p: [ui.pend[0].id, ui.pend[1].id] }); afterDraw([objItem(o)]); }
      else { hint(); commit(); }
      return;
    }
    if (t === 'poly') {
      if (d.moved) return;
      snap();
      if (ui.pend.length >= 3 && d.tgt && d.tgt.t === 'p' && d.tgt.id === ui.pend[0].id) { M.pts.length; closePoly(); return; }
      p = pointAt(w, d.tgt);
      if (!ui.pend.some(function (q) { return q.id === p.id; })) ui.pend.push(p);
      hint(); commit();
    }
  }

  function beginMove(d) {
    if (ui.tool !== 'select') return;
    var t = d.tgt, list = [], p;
    if (t && t.t === 'p') {
      p = P(t.id);
      if (p.type === 'free') { snap(); ui.drag = { kind: 'pt', p: p, ox: p.x - d.w.x, oy: p.y - d.w.y }; return; }
      if (isGlider(p)) { snap(); ui.drag = { kind: 'pt', p: p, ox: 0, oy: 0 }; return; }
      freeAnc(p.id, list, {});
    } else if (t && t.t === 'o') objAnc(t.ref.id, list, {});
    if (list.length) {
      snap();
      ui.drag = { kind: 'grp', list: list.map(function (q) { return { p: q, x: q.x, y: q.y }; }), sx: d.w.x, sy: d.w.y };
      return;
    }
    ui.drag = { kind: 'pan', ox: view.ox, oy: view.oy, sx: d.px, sy: d.py };
  }
  function doMove(d, q, w) {
    var g = ui.drag; if (!g) return;
    if (g.kind === 'pan') { view.ox = g.ox + (q.x - d.px); view.oy = g.oy + (q.y - d.py); return; }
    if (g.kind === 'grp') {
      var dx = w.x - g.sx, dy = w.y - g.sy;
      if (ui.snap) { dx = Math.round(dx / STEP) * STEP; dy = Math.round(dy / STEP) * STEP; }
      g.list.forEach(function (it) { it.p.x = it.x + dx; it.p.y = it.y + dy; });
      return;
    }
    var p = g.p, gg;
    if (p.type === 'free') { p.x = snapV(w.x + g.ox); p.y = snapV(w.y + g.oy); }
    else if (p.type === 'onseg') {
      gg = geom(p.o[0]); if (gg) p.k = clamp(((w.x - gg.a.x) * (gg.b.x - gg.a.x) + (w.y - gg.a.y) * (gg.b.y - gg.a.y)) / Math.pow(len(V(gg.a, gg.b)), 2), 0, 1);
    } else if (p.type === 'online') {
      gg = geom(p.o[0]); if (gg && gg.k === 'l') p.k = clamp((w.x - gg.p.x) * gg.d.x + (w.y - gg.p.y) * gg.d.y, gg.lo, gg.hi);
    } else if (p.type === 'oncirc') {
      gg = geom(p.o[0]); if (gg && gg.k === 'c') p.k = Math.atan2(w.y - gg.c.y, w.x - gg.c.x);
    }
  }

  function fitView(list) {
    if (!resize() || !list.length) return;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach(function (p) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; });
    var w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1);
    view.z = clamp(Math.min((SW * 0.74) / (w * S0), (SH * 0.74) / (h * S0)), 0.3, 3); S = S0 * view.z;
    view.ox = SW / 2 - ((x0 + x1) / 2) * S; view.oy = SH / 2 - ((y0 + y1) / 2) * S;
  }
  function zoomAt(f, cx, cy) {
    var nz = clamp(view.z * f, 0.3, 6), w = toW(cx, cy);
    view.z = nz; S = S0 * nz; view.ox = cx - w.x * S; view.oy = cy - w.y * S;
  }
  function pinchPts() { var k = Object.keys(ptrs); return k.length >= 2 ? [ptrs[k[0]], ptrs[k[1]]] : null; }
  function startPinch() {
    var pp = pinchPts(); if (!pp) return;
    ui.down = null; ui.drag = null;
    ui.pinch = { d0: Math.max(1, Math.hypot(pp[0].x - pp[1].x, pp[0].y - pp[1].y)), z0: view.z, cx: (pp[0].x + pp[1].x) / 2, cy: (pp[0].y + pp[1].y) / 2, ox: view.ox, oy: view.oy };
  }
  function doPinch() {
    var pp = pinchPts(), pc = ui.pinch; if (!pp || !pc) return;
    var dist = Math.hypot(pp[0].x - pp[1].x, pp[0].y - pp[1].y), cx = (pp[0].x + pp[1].x) / 2, cy = (pp[0].y + pp[1].y) / 2;
    var nz = clamp(pc.z0 * dist / pc.d0, 0.3, 6), s0 = S0 * pc.z0, wx = (pc.cx - pc.ox) / s0, wy = (pc.cy - pc.oy) / s0;
    view.z = nz; S = S0 * nz; view.ox = cx - wx * S; view.oy = cy - wy * S;
  }

  svg.addEventListener('pointerdown', function (e) {
    if (!resize()) return;
    e.preventDefault();
    try { svg.setPointerCapture(e.pointerId); } catch (x) { }
    var q = pxy(e); ui.touch = e.pointerType !== 'mouse';
    if (ui.pinch) { ptrs[e.pointerId] = q; return; }
    ptrs[e.pointerId] = q;
    var n = Object.keys(ptrs).length;
    if (n === 2) { startPinch(); refresh(); return; }
    if (n > 2) return;
    compute();
    var w = toW(q.x, q.y); ui.ptr = w;
    ui.down = { px: q.x, py: q.y, w: w, moved: false, tgt: hitAny(w), id: e.pointerId };
    refresh();
  });
  svg.addEventListener('pointermove', function (e) {
    if (!resize()) return;
    var q = pxy(e); if (ptrs[e.pointerId]) ptrs[e.pointerId] = q;
    if (ui.pinch) { doPinch(); refresh(); return; }
    var w = toW(q.x, q.y); ui.ptr = w;
    var d = ui.down;
    if (d && d.id === e.pointerId) {
      if (!d.moved && Math.hypot(q.x - d.px, q.y - d.py) > (ui.touch ? 8 : 4)) { d.moved = true; beginMove(d); }
      if (d.moved && ui.tool === 'select') doMove(d, q, w);
      refresh();
    } else if (e.pointerType === 'mouse' && ui.pend.length) refresh();
  });
  function up(e) {
    if (e.type === 'pointercancel') { delete ptrs[e.pointerId]; ui.down = null; ui.drag = null; if (!Object.keys(ptrs).length) ui.pinch = null; refresh(); return; }
    var q = pxy(e); delete ptrs[e.pointerId];
    if (ui.pinch) { if (!Object.keys(ptrs).length) { ui.pinch = null; } refresh(); return; }
    var d = ui.down; ui.down = null;
    if (e.pointerType !== 'mouse') ui.ptr = null;
    if (!d || d.id !== e.pointerId) { ui.drag = null; refresh(); return; }
    var w = toW(q.x, q.y);
    if (ui.tool === 'select') {
      if (!d.moved) tapSelect(d.tgt);
      else { ui.drag = null; persist(); refresh(); }
    } else drawUp(d, w);
  }
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('pointerleave', function (e) { if (!ui.down && e.pointerType === 'mouse') { ui.ptr = null; refresh(); } });
  svg.addEventListener('wheel', function (e) {
    if (!resize()) return; e.preventDefault();
    var q = pxy(e); zoomAt(Math.exp(-e.deltaY * 0.0015), q.x, q.y); refresh();
  }, { passive: false });

  /* ================= Chuyển động ================= */
  var last = 0, raf = 0;
  function stepPt(p, dt) {
    var v = ui.speed, g = geom(p.o[0]);
    if (p.type === 'onseg') {
      if (!g) return; var L = g.hi; if (L < 1e-6) return;
      p.k += p.dir * (v * 2.5 / L) * dt;
      if (p.k > 1) { p.k = 1; p.dir = -1; } else if (p.k < 0) { p.k = 0; p.dir = 1; }
    } else if (p.type === 'online') {
      var lo = g ? Math.max(g.lo, -8) : -8, hi = g ? Math.min(g.hi, 8) : 8;
      p.k += p.dir * v * 2.5 * dt;
      if (p.k > hi) { p.k = hi; p.dir = -1; } else if (p.k < lo) { p.k = lo; p.dir = 1; }
    } else if (p.type === 'oncirc') {
      p.k += p.dir * v * 0.9 * dt; if (p.k > Math.PI * 2) p.k -= Math.PI * 2;
    }
  }
  function tick(ts) {
    raf = 0; if (!ui.playing) return;
    var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    var any = false;
    M.pts.forEach(function (p) { if (p.anim) { stepPt(p, dt); any = true; } });
    if (!any) { ui.playing = false; updPlay(); return; }
    refresh(); raf = requestAnimationFrame(tick);
  }
  function startLoop() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function updPlay() { elPlay.textContent = ui.playing ? '⏸ Dừng' : '▶ Chạy'; }

  /* ================= Số đo ================= */
  function angInfo(m) {
    var A = P(m.p[0]), B = P(m.p[1]), C = P(m.p[2]);
    if (!(A && B && C && A.ok && B.ok && C.ok)) return null;
    var u = V(B, A), v = V(B, C), l = len(u) * len(v); if (l < 1e-9) return null;
    var ang = Math.acos(clamp((u.x * v.x + u.y * v.y) / l, -1, 1)) * 180 / Math.PI, reflex = false;
    if (m.o && m.o[0]) {   /* góc trong của đa giác: có thể lớn hơn 180° với đa giác lõm */
      var po = O(m.o[0].id);
      if (po) { var sg = polySign(po), cr = v.x * u.y - v.y * u.x; if (sg * cr < 0) { ang = 360 - ang; reflex = true; } }
    }
    return { A: A, B: B, C: C, u: u, v: v, deg: ang, reflex: reflex };
  }
  function measEval(m) {
    var a, b, c, g, e, pts, i, s, cx, cy, A, B, C, o, ref;
    if (m.type === 'ang') {
      var ai = angInfo(m); if (!ai) return null;
      var uu = unit(ai.u), vv = unit(ai.v), bd = unit({ x: uu.x + vv.x, y: uu.y + vv.y }) || { x: -uu.y, y: uu.x };
      if (ai.reflex) bd = { x: -bd.x, y: -bd.y };
      return { txt: '∠' + ai.A.name + ai.B.name + ai.C.name + ' = ' + fmt(ai.deg) + '°', cv: fmt(ai.deg) + '°', x: ai.B.x, y: ai.B.y, dx: bd.x * 40, dy: bd.y * 40 + 4 };
    }
    if (m.type === 'dist') {
      A = P(m.p[0]); B = P(m.p[1]); if (!(A && B && A.ok && B.ok)) return null;
      var dl = len(V(A, B));
      return { txt: A.name + B.name + ' = ' + fmtL(dl), cv: A.name + B.name + '=' + fmtL(dl), x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, dx: 0, dy: -10 };
    }
    if (m.type === 'pdist') {
      A = P(m.p[0]); g = geom(m.o[0]); if (!(A && A.ok && g && g.k === 'l')) return null;
      var dp = Math.abs((A.x - g.p.x) * g.d.y - (A.y - g.p.y) * g.d.x);
      return { txt: 'Khoảng cách từ ' + A.name + ' đến ' + lineLabel(m.o[0]) + ' = ' + fmtL(dp), cv: 'd=' + fmtL(dp), x: A.x, y: A.y, dx: 14, dy: 20 };
    }
    ref = m.o[0]; o = O(ref.id); if (!o) return null;
    if (m.type === 'len') {
      e = segEnds(ref); if (!e || !e[0] || !e[1] || !e[0].ok || !e[1].ok) return null;
      var L = len(V(e[0], e[1])), mx = (e[0].x + e[1].x) / 2, my = (e[0].y + e[1].y) / 2, dr = unit(V(e[0], e[1])) || { x: 1, y: 0 };
      var nx = dr.y, ny = -dr.x, side = 0, pc;
      if (o.type === 'poly') { pc = polyCentroid(o); if (pc) side = (mx - pc.x) * nx + (my - pc.y) * ny; }
      var sgn = side > 1e-9 ? 1 : side < -1e-9 ? -1 : (ny <= 0 ? 1 : -1);
      var lcv = e[0].name + e[1].name + '=' + fmtL(L), hw = lcv.length * 3.7, off = 11 + hw * Math.abs(nx) + 7 * Math.abs(ny);
      return { txt: e[0].name + e[1].name + ' = ' + fmtL(L), cv: lcv, x: mx, y: my, dx: nx * sgn * off, dy: ny * sgn * off + 4 };
    }
    if (m.type === 'area' || m.type === 'per') {
      pts = o.p.map(P); if (pts.some(function (p) { return !p || !p.ok; })) return null;
      var ar = 0, pr = 0, n = pts.length; cx = 0; cy = 0;
      for (i = 0; i < n; i++) { a = pts[i]; b = pts[(i + 1) % n]; ar += a.x * b.y - b.x * a.y; pr += len(V(a, b)); cx += a.x; cy += a.y; }
      ar = Math.abs(ar) / 2; cx /= n; cy /= n;
      s = pts.map(function (p) { return p.name; }).join('');
      return m.type === 'area'
        ? { txt: 'Diện tích ' + s + ' = ' + fmtA(ar), cv: 'S=' + fmtA(ar), x: cx, y: cy, dx: 0, dy: 0 }
        : { txt: 'Chu vi ' + s + ' = ' + fmtL(pr), cv: 'P=' + fmtL(pr), x: cx, y: cy, dx: 0, dy: 18 };
    }
    g = geom(ref); if (!g || g.k !== 'c') return null;
    var nm = lineLabel(ref), r = g.r;
    if (m.type === 'rad') return { txt: 'Bán kính ' + nm + ' = ' + fmtL(r), cv: 'r=' + fmtL(r), x: g.c.x, y: g.c.y, dx: 8, dy: -10 };
    if (m.type === 'circ') return { txt: 'Chu vi đường tròn ' + nm + ' = ' + fmtL(2 * Math.PI * r), cv: '', x: g.c.x, y: g.c.y, dx: 0, dy: 0 };
    return { txt: 'Diện tích hình tròn ' + nm + ' = ' + fmtA(Math.PI * r * r), cv: '', x: g.c.x, y: g.c.y, dx: 0, dy: 0 };
  }
  var lastMeasHtml = '';
  function updMeas() {
    var h = '';
    M.meas.forEach(function (m) {
      var r = measEval(m);
      h += '<div class="vh-m"><span>' + (r ? r.txt : '(không xác định)') + '</span><button type="button" data-m="' + m.id + '" aria-label="Xóa số đo">✕</button></div>';
    });
    if (!ui.meas && M.meas.length) h = '<div class="note">Số đo đang được ẩn. Bấm "Hiện số đo" để xem.</div>';
    if (h !== lastMeasHtml) { elMeas.innerHTML = h; lastMeasHtml = h; }
  }

  /* ================= Vẽ ================= */
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function shapeStr(ref, attrs) {
    var o = O(ref.id); if (!o) return '';
    var i;
    if (o.type === 'poly') {
      var pts = o.p.map(P); if (pts.some(function (p) { return !p || !p.ok; })) return '';
      if (ref.e === undefined) return '<polygon points="' + pts.map(function (p) { return r2(X(p.x)) + ',' + r2(Y(p.y)); }).join(' ') + '" ' + attrs + ' stroke-linejoin="round"/>';
      var a = pts[ref.e], b = pts[(ref.e + 1) % pts.length];
      return '<line x1="' + r2(X(a.x)) + '" y1="' + r2(Y(a.y)) + '" x2="' + r2(X(b.x)) + '" y2="' + r2(Y(b.y)) + '" ' + attrs + ' stroke-linecap="round"/>';
    }
    if (o.type === 'locus') {
      var lp = o._pts || [], s = '', cur = [];
      for (i = 0; i <= lp.length; i++) {
        if (i < lp.length && lp[i]) cur.push(r2(X(lp[i][0])) + ',' + r2(Y(lp[i][1])));
        else { if (cur.length > 1) s += '<polyline points="' + cur.join(' ') + '" fill="none" ' + attrs + ' stroke-linejoin="round" stroke-linecap="round"/>'; cur = []; }
      }
      return s;
    }
    var g = geom({ id: o.id }); if (!g) return '';
    if (g.k === 'c') return '<circle cx="' + r2(X(g.c.x)) + '" cy="' + r2(Y(g.c.y)) + '" r="' + r2(g.r * S) + '" fill="none" ' + attrs + '/>';
    var big = 6000 / S, lo = Math.max(g.lo, -big), hi = Math.min(g.hi, big);
    return '<line x1="' + r2(X(g.p.x + g.d.x * lo)) + '" y1="' + r2(Y(g.p.y + g.d.y * lo)) + '" x2="' + r2(X(g.p.x + g.d.x * hi)) + '" y2="' + r2(Y(g.p.y + g.d.y * hi)) + '" ' + attrs + ' stroke-linecap="round"/>';
  }

  function nu(dx, dy) { var l = Math.hypot(dx, dy); return l < 1e-9 ? null : { x: dx / l, y: dy / l }; }
  function arcSvg(bx, by, uA, uC, r, reflex, col) {
    var sx = bx + uA.x * r, sy = by + uA.y * r, ex = bx + uC.x * r, ey = by + uC.y * r;
    var cr = uA.x * uC.y - uA.y * uC.x, sweep = cr > 0 ? 1 : 0, large = 0;
    if (reflex) { sweep = 1 - sweep; large = 1; }
    return '<path d="M' + r2(sx) + ' ' + r2(sy) + 'A' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + r2(ex) + ' ' + r2(ey) + '" fill="none" stroke="' + col + '" stroke-width="1.8"/>';
  }
  function rtSvg(bx, by, u, v, k, col) {
    return '<path d="M' + r2(bx + u.x * k) + ' ' + r2(by + u.y * k) + 'L' + r2(bx + (u.x + v.x) * k) + ' ' + r2(by + (u.y + v.y) * k) + 'L' + r2(bx + v.x * k) + ' ' + r2(by + v.y * k) + '" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linejoin="miter"/>';
  }
  /* ký hiệu: gạch bằng nhau, góc vuông, cung góc; và cung của các số đo góc */
  function drawMarks(C) {
    var out = '';
    M.marks.forEach(function (m) {
      var ps = m.p.map(P), k;
      if (ps.some(function (p) { return !p || !p.ok || p.hid; })) return;
      if (m.type === 'tick') {
        var d = nu(ps[1].x - ps[0].x, ps[1].y - ps[0].y); if (!d) return;
        var mx = X((ps[0].x + ps[1].x) / 2), my = Y((ps[0].y + ps[1].y) / 2), nx = d.y, ny = -d.x;
        for (k = 0; k < m.n; k++) {
          var off = (k - (m.n - 1) / 2) * 5, cx = mx + d.x * off, cy = my + d.y * off;
          out += '<line x1="' + r2(cx - nx * 5.5) + '" y1="' + r2(cy - ny * 5.5) + '" x2="' + r2(cx + nx * 5.5) + '" y2="' + r2(cy + ny * 5.5) + '" stroke="' + C.txt + '" stroke-width="1.8" stroke-linecap="round"/>';
        }
      } else if (m.type === 'rt') {
        var u = nu(ps[0].x - ps[1].x, ps[0].y - ps[1].y), v = nu(ps[2].x - ps[1].x, ps[2].y - ps[1].y), q;
        if (!v && m.q) { q = P(m.q); if (q && q.ok) v = nu(q.x - ps[1].x, q.y - ps[1].y); }
        if (!u || !v || Math.abs(u.x * v.x + u.y * v.y) > 0.01) return;   // chỉ vẽ khi thật sự vuông
        out += rtSvg(X(ps[1].x), Y(ps[1].y), u, v, 11, C.txt);
      } else if (m.type === 'arc') {
        var u2 = nu(ps[0].x - ps[1].x, ps[0].y - ps[1].y), v2 = nu(ps[2].x - ps[1].x, ps[2].y - ps[1].y); if (!u2 || !v2) return;
        for (k = 0; k < m.n; k++) out += arcSvg(X(ps[1].x), Y(ps[1].y), u2, v2, 17 + k * 4.5, false, C.txt);
      }
    });
    M.meas.forEach(function (mm) {
      if (mm.type !== 'ang') return;
      var ai = angInfo(mm); if (!ai) return;
      var u = unit(ai.u), v = unit(ai.v), bx = X(ai.B.x), by = Y(ai.B.y);
      if (!ai.reflex && Math.abs(ai.deg - 90) < 0.3) out += rtSvg(bx, by, u, v, 13, C.meas);
      else out += arcSvg(bx, by, u, v, 22, ai.reflex, C.meas);
    });
    return out;
  }
  /* vị trí nhãn tên điểm: đỉnh đa giác và điểm trên cạnh thì đặt nhãn ra phía ngoài hình */
  function labelOff(p) {
    var i, j, o, pts, c, a, b, ed, t, nx, ny, d;
    for (i = 0; i < M.objs.length; i++) {
      o = M.objs[i]; if (o.type !== 'poly' || !shownObj(o)) continue;
      pts = o.p.map(P); if (pts.some(function (q) { return !q || !q.ok; })) continue;
      c = polyCentroid(o); if (!c) continue;
      if (o.p.indexOf(p.id) >= 0) { d = nu(p.x - c.x, p.y - c.y); if (d) return { x: d.x * 15, y: d.y * 15 + 5 }; continue; }
      for (j = 0; j < pts.length; j++) {
        a = pts[j]; b = pts[(j + 1) % pts.length]; ed = nu(b.x - a.x, b.y - a.y); if (!ed) continue;
        t = (p.x - a.x) * ed.x + (p.y - a.y) * ed.y;
        if (t < -1e-6 || t > len(V(a, b)) + 1e-6) continue;
        if (Math.abs((p.x - a.x) * ed.y - (p.y - a.y) * ed.x) > 1e-6) continue;
        nx = ed.y; ny = -ed.x;
        if ((p.x - c.x) * nx + (p.y - c.y) * ny < 0) { nx = -nx; ny = -ny; }
        return { x: nx * 15, y: ny * 15 + 5 };
      }
    }
    return null;
  }

  function draw(theme) {
    var C = PAL[theme || 'dark'], CL = COLS[theme || 'dark'], s = '', i, W = SW, H = SH, exp = theme === 'light';
    var FONT = 'font-family="system-ui,Arial,sans-serif"';
    if (exp ? ui.expGrid : ui.grid) {
      var step = S >= 14 ? 1 : 5, minx = -view.ox / S, maxx = (W - view.ox) / S, miny = -view.oy / S, maxy = (H - view.oy) / S, d = '', x, y;
      for (x = Math.ceil(minx / step) * step; x <= maxx; x += step) d += 'M' + r2(X(x)) + ' 0V' + H;
      for (y = Math.ceil(miny / step) * step; y <= maxy; y += step) d += 'M0 ' + r2(Y(y)) + 'H' + W;
      s += '<path d="' + d + '" stroke="' + C.grid + '" stroke-width="1" fill="none"/>';
      s += '<path d="M' + r2(X(0)) + ' 0V' + H + 'M0 ' + r2(Y(0)) + 'H' + W + '" stroke="' + C.axis + '" stroke-width="1" fill="none"/>';
    }
    M.objs.forEach(function (o) {
      if (!shownObj(o) || o.type !== 'poly') return;
      var col = CL[o.c || 0];
      s += shapeStr({ id: o.id }, 'fill="' + hexA(col, exp ? 0.1 : 0.14) + '" stroke="' + col + '" stroke-width="2.2"');
    });
    M.objs.forEach(function (o) {
      if (!shownObj(o) || o.type === 'poly') return;
      var col = CL[o.c || 0], dsh = (o.type === 'perpline' || o.type === 'parline' || o.type === 'pbis' || o.type === 'bis' || o.type === 'bisray');
      if (o.dash === 1) dsh = true; else if (o.dash === 0) dsh = false;
      var dash = dsh ? ' stroke-dasharray="7 5"' : '';
      if (o.type === 'locus') { s += shapeStr({ id: o.id }, 'stroke="' + (o.c ? col : C.trace) + '" stroke-width="2.4"'); return; }
      s += shapeStr({ id: o.id }, 'stroke="' + col + '" stroke-width="2.2"' + dash);
    });
    if (!exp) ui.sel.forEach(function (it) {
      if (it.t === 'o') s += shapeStr(it.ref, 'stroke="' + C.sel + '" stroke-width="8" opacity=".35" fill="none"');
    });
    s += drawMarks(C);
    M.pts.forEach(function (p) {
      var t = traces[p.id]; if (!p.trace || !t || t.length < 2) return;
      s += '<polyline points="' + t.map(function (q) { return r2(X(q[0])) + ',' + r2(Y(q[1])); }).join(' ') + '" fill="none" stroke="' + C.trace + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>';
    });
    if (ui.meas) {
      M.meas.forEach(function (m) {
        var r = measEval(m); if (!r || !r.cv) return;
        s += '<text x="' + r2(X(r.x) + r.dx) + '" y="' + r2(Y(r.y) + r.dy) + '" text-anchor="middle" font-size="13" font-weight="700" ' + FONT + ' fill="' + C.meas + '" stroke="' + C.bg + '" stroke-width="3" paint-order="stroke">' + r.cv + '</text>';
      });
    }
    if (!exp) {
      var dd = ui.down;
      if (dd && dd.moved && ui.tool !== 'select' && ui.tool !== 'point' && ui.tool !== 'poly' && ui.ptr) {
        var sp = dd.tgt && dd.tgt.t === 'p' ? P(dd.tgt.id) : dd.w;
        if (ui.tool === 'circ') s += '<circle cx="' + r2(X(sp.x)) + '" cy="' + r2(Y(sp.y)) + '" r="' + r2(Math.hypot(ui.ptr.x - sp.x, ui.ptr.y - sp.y) * S) + '" fill="none" stroke="' + C.pend + '" stroke-width="1.5" stroke-dasharray="5 5" opacity=".8"/>';
        else s += '<line x1="' + r2(X(sp.x)) + '" y1="' + r2(Y(sp.y)) + '" x2="' + r2(X(ui.ptr.x)) + '" y2="' + r2(Y(ui.ptr.y)) + '" stroke="' + C.pend + '" stroke-width="1.5" stroke-dasharray="5 5" opacity=".8"/>';
      } else if (ui.pend.length && ui.ptr) {
        var lp = ui.pend[ui.pend.length - 1];
        s += '<line x1="' + r2(X(lp.x)) + '" y1="' + r2(Y(lp.y)) + '" x2="' + r2(X(ui.ptr.x)) + '" y2="' + r2(Y(ui.ptr.y)) + '" stroke="' + C.pend + '" stroke-width="1.5" stroke-dasharray="5 5" opacity=".7"/>';
      }
      ui.pend.forEach(function (q) {
        if (!q || q.x === undefined) return;
        s += '<circle cx="' + r2(X(q.x)) + '" cy="' + r2(Y(q.y)) + '" r="12" fill="none" stroke="' + C.pend + '" stroke-width="2" stroke-dasharray="3 3"/>';
      });
    }
    M.pts.forEach(function (p) {
      if (!shownPt(p)) return;
      var col = p.c !== undefined ? CL[p.c] : p.type === 'free' ? C.free : isGlider(p) ? C.glide : C.dep, x = r2(X(p.x)), y = r2(Y(p.y));
      if (!exp && selIndex({ t: 'p', id: p.id }) >= 0) s += '<circle cx="' + x + '" cy="' + y + '" r="13" fill="' + hexA('#ffd54f', 0.25) + '" stroke="' + C.sel + '" stroke-width="2"/>';
      if (p.anim) s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="none" stroke="' + C.glide + '" stroke-width="1.8" stroke-dasharray="3 3"/>';
      if (p.trace) s += '<circle cx="' + x + '" cy="' + y + '" r="9.5" fill="none" stroke="' + C.trace + '" stroke-width="1.5"/>';
      s += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + col + '" stroke="' + C.bg + '" stroke-width="1.5"/>';
      if (ui.names) {
        var lo = labelOff(p), tx = lo ? x + lo.x : x + 9, ty = lo ? y + lo.y : y - 9;
        s += '<text x="' + r2(tx) + '" y="' + r2(ty) + '"' + (lo ? ' text-anchor="middle"' : '') + ' font-size="15" font-weight="700" ' + FONT + ' fill="' + C.txt + '" stroke="' + C.bg + '" stroke-width="3" paint-order="stroke">' + String(p.name).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
      }
    });
    return s;
  }

  function recordTraces() {
    M.pts.forEach(function (p) {
      if (!p.trace || !p.ok) return;
      var t = traces[p.id] || (traces[p.id] = []), l = t[t.length - 1];
      if (!l || Math.hypot(l[0] - p.x, l[1] - p.y) > 0.04) { t.push([p.x, p.y]); if (t.length > 900) t.shift(); }
    });
  }
  function resize() {
    var w = svg.clientWidth, h = svg.clientHeight;
    if (w < 10 || h < 10) return false;
    if (w !== SW || h !== SH) { SW = w; SH = h; svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); }
    WU = w < 520 ? 12 : 16; S0 = SW / WU; S = S0 * view.z; HU = SH / S0;
    return true;
  }
  var lastActsKey = '';
  function refresh() {
    if (!resize()) return;
    ui.sel = ui.sel.filter(itemValid);
    compute(); computeLocus(); recordTraces();
    svg.innerHTML = draw('dark');
    updMeas(); updSelPanel();
  }

  /* ================= Bảng lệnh dựng theo đối tượng đã chọn ================= */
  function analyze() {
    var a = { pts: [], lines: [], circs: [], polys: [] };
    ui.sel.forEach(function (it) {
      if (it.t === 'p') { var p = P(it.id); if (p) a.pts.push(p); return; }
      var o = O(it.ref.id); if (!o) return;
      if (o.type === 'poly' && it.ref.e === undefined) { a.polys.push(it.ref); return; }
      if (o.type === 'locus') return;
      var g = geom(it.ref); if (!g) return;
      if (g.k === 'c') a.circs.push(it.ref); else a.lines.push({ ref: it.ref, fin: !!g.fin });
    });
    return a;
  }
  function imgName(p) { var n = p.name + "'"; while (M.pts.some(function (q) { return q.name === n; })) n += "'"; return n; }
  function askAngle() {
    var s = prompt('Góc quay (độ), dương là ngược chiều kim đồng hồ:', '90');
    if (s === null) return null;
    var k = parseFloat(String(s).replace(',', '.')); return isNaN(k) ? null : k;
  }
  function imagesOf(a, mk) {   // phép biến đổi cho các điểm đã chọn và đa giác
    var items = [], P0 = a.pts.slice();
    P0.forEach(function (q) { items.push(ptItem(mk(q))); });
    a.polys.forEach(function (ref) {
      var o = O(ref.id), imgs = o.p.map(function (i) { return mk(P(i)); });
      var po = addObj({ type: 'poly', p: imgs.map(function (p) { return p.id; }) }); items.push(objItem(po));
    });
    return items;
  }
  function toggleAnim(a) {
    var gl = a.pts.filter(isGlider), anyOff = gl.some(function (p) { return !p.anim; });
    gl.forEach(function (p) { p.anim = anyOff; });
    if (anyOff) { ui.playing = true; startLoop(); }
    updPlay();
  }
  /* ================= Dựng nhanh: tam giác, đa giác, ký hiệu ================= */
  function hasTag(tag) {
    return M.pts.some(function (p) { return p.tag === tag; }) || M.objs.some(function (o) { return o.tag === tag; });
  }
  function findTagPt(tag) { for (var i = 0; i < M.pts.length; i++) if (M.pts[i].tag === tag) return M.pts[i]; return null; }
  function pushMeas(m) {
    var key = function (q) { return q.type + JSON.stringify(q.p || []) + JSON.stringify(q.o || []); }, k = key(m);
    for (var i = 0; i < M.meas.length; i++) if (key(M.meas[i]) === k) return false;
    m.id = M.nid++; M.meas.push(m); return true;
  }
  function triOf(a) {
    if (a.polys.length === 1 && !a.pts.length && !a.lines.length && !a.circs.length) {
      var o = O(a.polys[0].id);
      if (o && o.p.length === 3) { var ps = o.p.map(P); if (ps.every(function (p) { return !!p; })) return { pts: ps, poly: o }; }
    }
    if (a.pts.length === 3 && !a.lines.length && !a.circs.length && !a.polys.length) return { pts: a.pts.slice(), poly: null };
    return null;
  }
  function triKey(t) { return t.pts.map(function (p) { return p.id; }).sort(function (x, y) { return x - y; }).join('_'); }
  function triName(t) { return t.pts.map(function (p) { return p.name; }).join(''); }
  function lineThrough(a, b) {
    for (var i = 0; i < M.objs.length; i++) {
      var o = M.objs[i];
      if (o.type === 'line' && o.hidden && ((o.p[0] === a.id && o.p[1] === b.id) || (o.p[0] === b.id && o.p[1] === a.id))) return { id: o.id };
    }
    return { id: lineAB(a, b).id };
  }
  /* cạnh đối diện đỉnh thứ i của tam giác (dùng cạnh của đa giác nếu có, không thì đường thẳng ẩn) */
  function sideRef(t, i) {
    var Q = t.pts[(i + 1) % 3], R = t.pts[(i + 2) % 3];
    if (t.poly) {
      for (var e = 0; e < 3; e++) {
        var x = t.poly.p[e], y = t.poly.p[(e + 1) % 3];
        if ((x === Q.id && y === R.id) || (x === R.id && y === Q.id)) return { id: t.poly.id, e: e };
      }
    }
    return lineThrough(Q, R);
  }
  function getMid(a, b) {
    for (var i = 0; i < M.pts.length; i++) {
      var p = M.pts[i];
      if (p.type === 'mid' && ((p.p[0] === a.id && p.p[1] === b.id) || (p.p[0] === b.id && p.p[1] === a.id))) return p;
    }
    return addPt({ type: 'mid', name: pickName(['M', 'N', 'P', 'Q', 'R', 'S']), p: [a.id, b.id] });
  }
  function nextTickGroup() {
    var mx = 0; M.marks.forEach(function (m) { if (m.type === 'tick' && m.n > mx) mx = m.n; });
    return mx >= 4 ? 1 : mx + 1;
  }
  function tickPair(a, b, n) {
    var k = pairKey(a.id, b.id);
    for (var i = 0; i < M.marks.length; i++) { var m = M.marks[i]; if (m.type === 'tick' && pairKey(m.p[0], m.p[1]) === k) { m.n = n; return m; } }
    return addMark({ type: 'tick', p: [a.id, b.id], n: n });
  }
  function rtAt(a, b, c, q) {
    if (!ui.auto) return;
    for (var i = 0; i < M.marks.length; i++) {
      var m = M.marks[i];
      if (m.type === 'rt' && m.p[1] === b.id && ((m.p[0] === a.id && m.p[2] === c.id) || (m.p[0] === c.id && m.p[2] === a.id))) return;
    }
    var mk = { type: 'rt', p: [a.id, b.id, c.id] }; if (q) mk.q = q.id; addMark(mk);
  }
  function arcAt(a, b, c, n) {
    for (var i = 0; i < M.marks.length; i++) {
      var m = M.marks[i];
      if (m.type === 'arc' && m.p[1] === b.id && ((m.p[0] === a.id && m.p[2] === c.id) || (m.p[0] === c.id && m.p[2] === a.id))) { m.n = n; return; }
    }
    addMark({ type: 'arc', p: [a.id, b.id, c.id], n: n });
  }
  function midAndTick(A, B) {
    var had = M.pts.some(function (p) { return p.type === 'mid' && ((p.p[0] === A.id && p.p[1] === B.id) || (p.p[0] === B.id && p.p[1] === A.id)); });
    var m = getMid(A, B);
    if (!had && ui.auto) { var g = nextTickGroup(); tickPair(A, m, g); tickPair(m, B, g); }
    return [ptItem(m)];
  }
  function getCenter(t, kind) {
    var tag = 'cen' + kind + ':' + triKey(t), p = findTagPt(tag);
    if (p) return p;
    return addPt({ type: 'tcen', k: kind, name: pickName([kind, kind + '1']), p: t.pts.map(function (q) { return q.id; }), tag: tag });
  }
  var DNAMES = ['D', 'E', 'F', 'K', 'L', 'T', 'U'];
  function mkAlt(t, i) {
    var A = t.pts[i], Q = t.pts[(i + 1) % 3], R = t.pts[(i + 2) % 3], tag = 'alt' + A.id + ':' + triKey(t);
    if (hasTag(tag)) return;
    var H = addPt({ type: 'foot', name: pickName(DNAMES), p: [A.id], o: [sideRef(t, i)], tag: tag });
    addObj({ type: 'seg', p: [A.id, H.id], c: 1, tag: tag });
    rtAt(A, H, Q, R);
  }
  function mkMed(t, i) {
    var A = t.pts[i], Q = t.pts[(i + 1) % 3], R = t.pts[(i + 2) % 3], tag = 'med' + A.id + ':' + triKey(t);
    if (hasTag(tag)) return;
    var m = getMid(Q, R);
    addObj({ type: 'seg', p: [A.id, m.id], c: 3, tag: tag });
    if (ui.auto) { tickPair(Q, m, i + 1); tickPair(m, R, i + 1); }
  }
  function mkBis(t, i) {
    var A = t.pts[i], Q = t.pts[(i + 1) % 3], R = t.pts[(i + 2) % 3], tag = 'bis' + A.id + ':' + triKey(t);
    if (hasTag(tag)) return;
    var bl = hid({ type: 'bis', p: [Q.id, A.id, R.id], tag: tag });
    var D = addPt({ type: 'inter', name: pickName(DNAMES), o: [{ id: bl.id }, sideRef(t, i)], k: 0, tag: tag });
    addObj({ type: 'seg', p: [A.id, D.id], c: 2, tag: tag });
    if (ui.auto) { arcAt(Q, A, D, i + 1); arcAt(D, A, R, i + 1); }
  }
  function mkPerpBis(t, i) {
    var Q = t.pts[(i + 1) % 3], R = t.pts[(i + 2) % 3], tag = 'pbs' + t.pts[i].id + ':' + triKey(t);
    if (hasTag(tag)) return;
    var m = getMid(Q, R), Oc = getCenter(t, 'O');
    addObj({ type: 'seg', p: [m.id, Oc.id], c: 4, tag: tag });
    if (ui.auto) { tickPair(Q, m, i + 1); tickPair(m, R, i + 1); rtAt(Oc, m, Q, R); }
  }
  function mkMidline(t) {
    var tag = 'mln:' + triKey(t); if (hasTag(tag)) return;
    var m = [0, 1, 2].map(function (i) { return getMid(t.pts[(i + 1) % 3], t.pts[(i + 2) % 3]); });
    for (var i = 0; i < 3; i++) addObj({ type: 'seg', p: [m[i].id, m[(i + 1) % 3].id], c: 5, tag: tag });
  }
  function mkCircum(t) {
    var tag = 'ccl:' + triKey(t); if (hasTag(tag)) return;
    var Oc = getCenter(t, 'O'); addObj({ type: 'circ', p: [Oc.id, t.pts[0].id], c: 4, tag: tag });
  }
  function mkIncircle(t) {
    var tag = 'icl:' + triKey(t); if (hasTag(tag)) return;
    var I = getCenter(t, 'I'), fs = [];
    for (var i = 0; i < 3; i++) {
      var F = addPt({ type: 'foot', name: pickName(DNAMES), p: [I.id], o: [sideRef(t, i)], tag: tag }); fs.push(F);
      addObj({ type: 'seg', p: [I.id, F.id], c: 0, dash: 1, tag: tag });
      rtAt(I, F, t.pts[(i + 1) % 3], t.pts[(i + 2) % 3]);
    }
    addObj({ type: 'circ', p: [I.id, fs[0].id], c: 2, tag: tag });
  }
  function count() { return M.pts.length + M.objs.length + M.marks.length + M.meas.length; }
  function polyAngles(po) {
    var n = po.p.length;
    for (var i = 0; i < n; i++) pushMeas({ type: 'ang', p: [po.p[(i + n - 1) % n], po.p[i], po.p[(i + 1) % n]], o: [{ id: po.id }] });
  }
  function polySides(po) { for (var e = 0; e < po.p.length; e++) pushMeas({ type: 'len', o: [{ id: po.id, e: e }] }); }
  function looseAngles(t) {
    for (var i = 0; i < 3; i++) pushMeas({ type: 'ang', p: [t.pts[(i + 2) % 3].id, t.pts[i].id, t.pts[(i + 1) % 3].id] });
  }
  function looseSides(t) { for (var i = 0; i < 3; i++) pushMeas({ type: 'dist', p: [t.pts[i].id, t.pts[(i + 1) % 3].id] }); }
  function isRightAt(po, i) {
    var n = po.p.length, B = P(po.p[i]), A = P(po.p[(i + n - 1) % n]), C = P(po.p[(i + 1) % n]);
    if (!A || !B || !C || !A.ok || !B.ok || !C.ok) return false;
    var u = unit(V(B, A)), v = unit(V(B, C)); return !!(u && v && Math.abs(u.x * v.x + u.y * v.y) < 0.009);
  }
  function removeMarksFor(a) {   // gỡ ký hiệu liên quan tới các đoạn / điểm đang chọn
    var ids = {};
    a.lines.forEach(function (l) { var e = segEnds(l.ref); if (e && e[0] && e[1]) ids[pairKey(e[0].id, e[1].id)] = 1; });
    var n0 = M.marks.length;
    M.marks = M.marks.filter(function (m) {
      if (m.type === 'tick') return !ids[pairKey(m.p[0], m.p[1])];
      if (a.pts.length && (m.type === 'rt' || m.type === 'arc')) return !a.pts.some(function (p) { return p.id === m.p[1]; });
      return true;
    });
    return n0 - M.marks.length;
  }
  function onCircleOf(P0, cref) {
    var o = O(cref.id), g = geom(cref); if (!o || !g || g.k !== 'c') return false;
    if (P0.type === 'oncirc' && P0.o[0].id === cref.id) return true;
    return Math.abs(len(V(g.c, P0)) - g.r) < 1e-6;
  }

  function buildActs() {
    var a = analyze(), L = [], np = a.pts.length, nl = a.lines.length, nc = a.circs.length, ng = a.polys.length;
    function add(label, fn, cls) { L.push({ label: label, fn: fn, cls: cls || '' }); }
    function act(fn) { return function () { snap(); var r = fn(); if (r !== false) { ui.sel = r || []; } commit(); }; }
    var A = a.pts[0], B = a.pts[1], C3 = a.pts[2], line = nl ? a.lines[0] : null;
    var onlyPts = !nl && !nc && !ng, last = a.pts[np - 1];
    function sep(t) { L.push({ sep: t }); }
    function keep(fn) { return act(function () { var b = count(); fn(); if (count() === b) { say('Các nét này đã được dựng rồi (xóa đi nếu muốn dựng lại).'); return false; } return ui.sel.slice(); }); }
    var tri = triOf(a);
    if (tri) {
      sep('△ Tam giác ' + triName(tri));
      add('⊥ 3 đường cao + trực tâm H', keep(function () { for (var i = 0; i < 3; i++) mkAlt(tri, i); getCenter(tri, 'H'); }), 'tri');
      add('▽ 3 trung tuyến + trọng tâm G', keep(function () { for (var i = 0; i < 3; i++) mkMed(tri, i); getCenter(tri, 'G'); }), 'tri');
      add('∠ 3 phân giác + tâm nội tiếp I', keep(function () { for (var i = 0; i < 3; i++) mkBis(tri, i); getCenter(tri, 'I'); }), 'tri');
      add('⊣ 3 trung trực + tâm ngoại tiếp O', keep(function () { for (var i = 0; i < 3; i++) mkPerpBis(tri, i); getCenter(tri, 'O'); }), 'tri');
      add('◯ Đường tròn ngoại tiếp', keep(function () { mkCircum(tri); }), 'tri');
      add('○ Đường tròn nội tiếp', keep(function () { mkIncircle(tri); }), 'tri');
      add('∥ Đường trung bình', keep(function () { mkMidline(tri); }), 'tri');
      add('📏 Đo 3 cạnh', function () { snap(); if (tri.poly) polySides(tri.poly); else looseSides(tri); commit(); });
      add('📐 Đo 3 góc', function () { snap(); if (tri.poly) polyAngles(tri.poly); else looseAngles(tri); commit(); });
    }
    if (np === 1 && ng === 1 && !nl && !nc) {
      var tv = triOf({ pts: [], lines: [], circs: [], polys: a.polys }), vi = -1;
      if (tv) tv.pts.forEach(function (q, i) { if (q.id === A.id) vi = i; });
      if (tv && vi >= 0) {
        var Qn = tv.pts[(vi + 1) % 3].name, Rn = tv.pts[(vi + 2) % 3].name;
        sep('Từ đỉnh ' + A.name);
        add('⊥ Đường cao ' + A.name + ' (xuống ' + Qn + Rn + ')', keep(function () { mkAlt(tv, vi); }), 'tri');
        add('▽ Trung tuyến ' + A.name, keep(function () { mkMed(tv, vi); }), 'tri');
        add('∠ Phân giác ' + A.name, keep(function () { mkBis(tv, vi); }), 'tri');
        add('⊣ Trung trực ' + Qn + Rn, keep(function () { mkPerpBis(tv, vi); }), 'tri');
      }
    }
    if (np === 2 && onlyPts) {
      add('╱ Đoạn', act(function () { return [objItem(addObj({ type: 'seg', p: [A.id, B.id] }))]; }));
      add('↔ Đường', act(function () { return [objItem(addObj({ type: 'line', p: [A.id, B.id] }))]; }));
      add('↗ Tia', act(function () { return [objItem(addObj({ type: 'ray', p: [A.id, B.id] }))]; }));
      add('⊙ Trung điểm', act(function () { return midAndTick(A, B); }));
      add('⊣ Trung trực', act(function () { return [objItem(addObj({ type: 'pbis', p: [A.id, B.id] }))]; }));
      add('○ Đường tròn (tâm ' + A.name + ')', act(function () { return [objItem(addObj({ type: 'circ', p: [A.id, B.id] }))]; }));
      add('📏 Khoảng cách', act(function () { M.meas.push({ id: M.nid++, type: 'dist', p: [A.id, B.id] }); return a.pts.map(ptItem); }));
      if (isGlider(A)) add('🌀 Quỹ tích của ' + B.name, act(function () { return [objItem(addObj({ type: 'locus', p: [A.id, B.id] }))]; }));
    }
    if (np === 3 && onlyPts) {
      add('📐 Đo góc ' + A.name + B.name + C3.name, act(function () { M.meas.push({ id: M.nid++, type: 'ang', p: [A.id, B.id, C3.id] }); return a.pts.map(ptItem); }));
      add('∠ Tia phân giác', act(function () { return [objItem(addObj({ type: 'bisray', p: [A.id, B.id, C3.id] }))]; }));
      add('∠ Đường phân giác', act(function () { return [objItem(addObj({ type: 'bis', p: [A.id, B.id, C3.id] }))]; }));
      add('◯ Đường tròn qua 3 điểm', act(function () { return [objItem(addObj({ type: 'circ3', p: [A.id, B.id, C3.id] }))]; }));
    }
    if (np >= 3 && onlyPts) add('⬠ Đa giác', act(function () { return [objItem(addObj({ type: 'poly', p: a.pts.map(function (p) { return p.id; }) }))]; }));
    if (np >= 1 && nl === 1 && !nc && !ng) {
      add('⊥ Vuông góc', act(function () { return a.pts.map(function (p) { return objItem(addObj({ type: 'perpline', p: [p.id], o: [line.ref] })); }); }));
      add('∥ Song song', act(function () { return a.pts.map(function (p) { return objItem(addObj({ type: 'parline', p: [p.id], o: [line.ref] })); }); }));
      add('⤓ Hình chiếu', act(function () { return a.pts.map(function (p) { return ptItem(addPt({ type: 'foot', p: [p.id], o: [line.ref] })); }); }));
      add('⊥ Kẻ đoạn vuông góc (chân H)', act(function () {
        var out = [], lo = O(line.ref.id), le = (lo && (lo.type === 'seg' || lo.type === 'line' || lo.type === 'ray' || lo.type === 'poly')) ? segEnds(line.ref) : null;
        a.pts.forEach(function (p) {
          var H = addPt({ type: 'foot', name: pickName(['H', 'K', 'D', 'E', 'F']), p: [p.id], o: [line.ref] });
          out.push(objItem(addObj({ type: 'seg', p: [p.id, H.id], c: 1 })));
          if (le && le[0] && le[1]) rtAt(p, H, le[0], le[1]);
        });
        return out;
      }));
      if (line.fin && np === 1) add('▽ Nối với trung điểm', act(function () {
        var e2 = segEnds(line.ref), m = getMid(e2[0], e2[1]);
        if (ui.auto) { tickPair(e2[0], m, 1); tickPair(m, e2[1], 1); }
        return [objItem(addObj({ type: 'seg', p: [A.id, m.id], c: 3 }))];
      }));
      add('⇋ Đối xứng qua đường', act(function () { return imagesOf(a, function (q) { return addPt({ type: 'refl', name: imgName(q), p: [q.id], o: [line.ref] }); }); }));
      if (np === 1) add('📏 Khoảng cách tới đường', act(function () { M.meas.push({ id: M.nid++, type: 'pdist', p: [A.id], o: [line.ref] }); return ui.sel.slice(); }));
    }
    if (ng === 1 && nl === 1 && !np && !nc) add('⇋ Đối xứng qua đường', act(function () { return imagesOf(a, function (q) { return addPt({ type: 'refl', name: imgName(q), p: [q.id], o: [line.ref] }); }); }));
    if (np === 0 && nl === 1 && !nc && !ng && line.fin) {
      var e = segEnds(line.ref);
      add('⊙ Trung điểm', act(function () { return midAndTick(e[0], e[1]); }));
      add('⊣ Trung trực', act(function () { return [objItem(addObj({ type: 'pbis', p: [e[0].id, e[1].id] }))]; }));
      add('📏 Độ dài', act(function () { M.meas.push({ id: M.nid++, type: 'len', o: [line.ref] }); return ui.sel.slice(); }));
    }
    if (!np && !ng && nl + nc === 2) {
      var r1 = (a.lines.concat(a.circs.map(function (r) { return { ref: r }; })))[0].ref, r2_ = (a.lines.concat(a.circs.map(function (r) { return { ref: r }; })))[1].ref;
      var ord = ui.sel.filter(function (it) { return it.t === 'o'; }); r1 = ord[0].ref; r2_ = ord[1].ref;
      add('✕ Giao điểm', act(function () {
        var out = [];
        [0, 1].forEach(function (k) {
          var g1 = geom(r1), g2 = geom(r2_); if (!g1 || !g2) return;
          if (k === 1 && g1.k === 'l' && g2.k === 'l') return;
          if (inter(r1, r2_, k)) out.push(ptItem(addPt({ type: 'inter', o: [r1, r2_], k: k })));
        });
        if (!out.length) { say('Hai đối tượng này không cắt nhau (trong phạm vi hiện tại).'); return false; }
        return out;
      }));
    }
    if (ng === 1 && !np && !nl && !nc) add('📏 Diện tích, chu vi', act(function () { M.meas.push({ id: M.nid++, type: 'area', o: [a.polys[0]] }, { id: M.nid++, type: 'per', o: [a.polys[0]] }); return ui.sel.slice(); }));
    if (ng === 1 && !np && !nl && !nc) {
      var PO = O(a.polys[0].id), PN = PO.p.length;
      sep('▭ Đa giác ' + PO.p.map(function (i) { return P(i) ? P(i).name : '?'; }).join(''));
      if (!tri) add('📏 Đo các cạnh', act(function () { polySides(PO); return ui.sel.slice(); }));
      if (!tri) add('📐 Đo các góc', act(function () { polyAngles(PO); return ui.sel.slice(); }));
      add('📋 Đo tất cả', act(function () {
        polySides(PO); polyAngles(PO);
        pushMeas({ type: 'area', o: [a.polys[0]] }); pushMeas({ type: 'per', o: [a.polys[0]] }); return ui.sel.slice();
      }));
      add('∟ Ký hiệu góc vuông', act(function () {
        var c0 = M.marks.length;
        for (var i = 0; i < PN; i++) if (isRightAt(PO, i)) {
          var nn = PO.p.length; addMark({ type: 'rt', p: [PO.p[(i + nn - 1) % nn], PO.p[i], PO.p[(i + 1) % nn]] });
        }
        if (M.marks.length === c0) { say('Hình này chưa có góc vuông nào.'); return false; }
        return ui.sel.slice();
      }));
      add('┼ Các cạnh bằng nhau', act(function () {
        var g = nextTickGroup();
        for (var i = 0; i < PN; i++) { var q1 = P(PO.p[i]), q2 = P(PO.p[(i + 1) % PN]); if (q1 && q2) tickPair(q1, q2, g); }
        return ui.sel.slice();
      }));
      if (PN === 4) add('┼ Cạnh đối bằng nhau', act(function () {
        var g1 = nextTickGroup(), g2 = g1 >= 4 ? 1 : g1 + 1;
        for (var i = 0; i < 4; i++) { var q1 = P(PO.p[i]), q2 = P(PO.p[(i + 1) % 4]); if (q1 && q2) tickPair(q1, q2, i % 2 ? g2 : g1); }
        return ui.sel.slice();
      }));
      if (PN >= 4) add('╲ Đường chéo' + (PN === 4 ? ' + giao điểm' : ''), keep(function () {
        var tag = 'dg:' + PO.id; if (hasTag(tag)) return;
        var ds = [], i, j;
        for (i = 0; i < PN; i++) for (j = i + 2; j < PN; j++) {
          if (i === 0 && j === PN - 1) continue;
          ds.push(addObj({ type: 'seg', p: [PO.p[i], PO.p[j]], c: 2, tag: tag }));
        }
        if (PN === 4) addPt({ type: 'inter', name: pickName(['O', 'I', 'J']), o: [{ id: ds[0].id }, { id: ds[1].id }], k: 0, tag: tag });
      }));
    }
    /* ký hiệu bằng nhau cho các đoạn thẳng đang chọn */
    if (!np && !nc && !ng && nl >= 1 && a.lines.every(function (l) { return l.fin; })) {
      add('┼ Ký hiệu bằng nhau', act(function () {
        var g = nextTickGroup();
        a.lines.forEach(function (l) { var e3 = segEnds(l.ref); if (e3 && e3[0] && e3[1]) tickPair(e3[0], e3[1], g); });
        return ui.sel.slice();
      }));
      if (M.marks.some(function (m) { return m.type === 'tick'; })) add('✂ Bỏ ký hiệu', act(function () { removeMarksFor(a); return ui.sel.slice(); }));
    }
    /* ký hiệu góc cho 3 điểm đã chọn (đỉnh là điểm giữa) */
    if (np === 3 && onlyPts) {
      add('⌒ Cung góc ' + A.name + B.name + C3.name, act(function () {
        var ex = M.marks.filter(function (m) { return m.type === 'arc' && m.p[1] === B.id && ((m.p[0] === A.id && m.p[2] === C3.id) || (m.p[0] === C3.id && m.p[2] === A.id)); })[0];
        if (ex) { if (ex.n >= 3) M.marks = M.marks.filter(function (m) { return m !== ex; }); else ex.n++; }
        else addMark({ type: 'arc', p: [A.id, B.id, C3.id], n: 1 });
        return ui.sel.slice();
      }));
      add('∟ Ký hiệu góc vuông tại ' + B.name, act(function () {
        var u = unit(V(B, A)), v = unit(V(B, C3));
        if (!u || !v || Math.abs(u.x * v.x + u.y * v.y) > 0.009) { say('Góc ' + A.name + B.name + C3.name + ' chưa phải góc vuông.'); return false; }
        addMark({ type: 'rt', p: [A.id, B.id, C3.id] }); return ui.sel.slice();
      }));
      if (M.marks.some(function (m) { return (m.type === 'arc' || m.type === 'rt') && m.p[1] === B.id; })) add('✂ Bỏ ký hiệu góc', act(function () { removeMarksFor({ lines: [], pts: [B] }); return ui.sel.slice(); }));
    }
    /* đường tròn: tiếp tuyến, đường kính */
    if (np === 1 && nc === 1 && !nl && !ng) {
      var cref = a.circs[0], cobj = O(cref.id);
      if (cobj && cobj.type === 'circ') {
        var CO = P(cobj.p[0]);
        if (onCircleOf(A, cref)) {
          add('⟂ Tiếp tuyến tại ' + A.name, act(function () {
            var rl = lineThrough(CO, A), pl = addObj({ type: 'perpline', p: [A.id], o: [rl], c: 1, dash: 0 });
            var hp = addPt({ type: 'online', o: [{ id: pl.id }], k: 1.2, name: pickName(['x']) }); hp.aux = true;
            rtAt(CO, A, hp, null); return [objItem(pl)];
          }));
          add('⌀ Đường kính qua ' + A.name, act(function () {
            var Q2 = addPt({ type: 'pref', name: pickName(['B', 'C', 'D', 'E', 'F']), p: [A.id, CO.id] });
            return [objItem(addObj({ type: 'seg', p: [A.id, Q2.id], c: 3 }))];
          }));
        } else {
          add('⌒ Hai tiếp tuyến kẻ từ ' + A.name, act(function () {
            var g = geom(cref), d0 = g ? len(V(g.c, A)) : 0;
            if (!g || d0 <= g.r + 1e-9) { say('Điểm ' + A.name + ' phải nằm ngoài đường tròn để kẻ tiếp tuyến.'); return false; }
            var mp0 = M.pts.length, mp = getMid(CO, A), hc = hid({ type: 'circ', p: [mp.id, CO.id] }), out = [];
            if (M.pts.length > mp0) mp.aux = true;
            [0, 1].forEach(function (k) {
              var T = addPt({ type: 'inter', name: pickName(['M', 'N', 'T', 'S']), o: [{ id: hc.id }, cref], k: k });
              out.push(objItem(addObj({ type: 'seg', p: [A.id, T.id], c: 1 })));
              rtAt(CO, T, A, null);
            });
            return out;
          }));
        }
      }
    }
    /* nét đứt / nét liền cho đường, đoạn, đường tròn đang chọn (không áp dụng cho cạnh đa giác) */
    var dashable = ui.sel.filter(function (it) { var o2 = it.t === 'o' ? O(it.ref.id) : null; return o2 && o2.type !== 'poly' && o2.type !== 'locus'; });
    if (dashable.length) add('┄ Nét đứt / liền', act(function () {
      var isD = function (o3) { return o3.dash === 1 || (o3.dash === undefined && (o3.type === 'perpline' || o3.type === 'parline' || o3.type === 'pbis' || o3.type === 'bis' || o3.type === 'bisray')); };
      var on = dashable.some(function (it) { return !isD(O(it.ref.id)); });
      dashable.forEach(function (it) { O(it.ref.id).dash = on ? 1 : 0; });
      return ui.sel.slice();
    }));
    if (nc === 1 && !np && !nl && !ng) add('📏 Đo đường tròn', act(function () {
      var rf = a.circs[0]; M.meas.push({ id: M.nid++, type: 'rad', o: [rf] }, { id: M.nid++, type: 'circ', o: [rf] }, { id: M.nid++, type: 'carea', o: [rf] }); return ui.sel.slice();
    }));
    if (np >= 2 && onlyPts) {
      var movers = a.pts.slice(0, np - 1);
      add('✱ Đối xứng tâm (qua ' + last.name + ')', act(function () { return imagesOf({ pts: movers, polys: [] }, function (q) { return addPt({ type: 'pref', name: imgName(q), p: [q.id, last.id] }); }); }));
      add('⟳ Quay quanh ' + last.name, act(function () {
        var k = askAngle(); if (k === null) return false;
        return imagesOf({ pts: movers, polys: [] }, function (q) { return addPt({ type: 'rot', name: imgName(q), p: [q.id, last.id], k: k }); });
      }));
    }
    if (ng === 1 && np === 1 && !nl && !nc) {
      add('✱ Đối xứng tâm (qua ' + A.name + ')', act(function () { return imagesOf({ pts: [], polys: a.polys }, function (q) { return addPt({ type: 'pref', name: imgName(q), p: [q.id, A.id] }); }); }));
      add('⟳ Quay quanh ' + A.name, act(function () {
        var k = askAngle(); if (k === null) return false;
        return imagesOf({ pts: [], polys: a.polys }, function (q) { return addPt({ type: 'rot', name: imgName(q), p: [q.id, A.id], k: k }); });
      }));
    }
    if (a.pts.some(isGlider)) {
      var anyOff = a.pts.filter(isGlider).some(function (p) { return !p.anim; });
      add(anyOff ? '▶ Cho điểm chạy' : '⏸ Dừng điểm chạy', function () { toggleAnim(a); commit(); });
    }
    if (np >= 1) add('〰 Vệt', function () {
      var on = a.pts.some(function (p) { return !p.trace; });
      a.pts.forEach(function (p) { p.trace = on; traces[p.id] = []; }); commit();
    });
    if (np === 1) add('✏️ Đổi tên', function () {
      var s = prompt('Tên mới cho điểm ' + A.name + ':', A.name);
      if (s !== null && String(s).trim()) { snap(); A.name = String(s).trim().slice(0, 8); commit(); }
    });
    if (ui.sel.length) {
      add('🙈 Ẩn', act(function () {
        ui.sel.forEach(function (it) { if (it.t === 'p') P(it.id).hid = true; else O(it.ref.id).hid = true; });
        return [];
      }));
      add('🗑 Xóa', act(function () {
        var dp = {}, dobj = {};
        ui.sel.forEach(function (it) { if (it.t === 'p') dp[it.id] = 1; else dobj[it.ref.id] = 1; });
        cascade(dp, dobj); return [];
      }), 'red');
      add('✖ Bỏ chọn', function () { ui.sel = []; refresh(); });
    }
    if (M.pts.some(function (p) { return p.hid; }) || M.objs.some(function (o) { return o.hid; })) {
      add('👁 Hiện hết', function () { snap(); M.pts.forEach(function (p) { delete p.hid; }); M.objs.forEach(function (o) { delete o.hid; }); commit(); });
    }
    if (ui.tool === 'poly' && ui.pend.length >= 3) add('✔ Khép đa giác', closePoly);
    return L;
  }
  function updSelPanel() {
    curActs = buildActs();
    var names = ui.sel.map(itemName).join(', '), selTxt = ui.sel.length ? 'Đã chọn: ' + names : (ui.tool === 'select' ? 'Chưa chọn gì. Chạm vào điểm hoặc đường để chọn.' : '');
    if (elSel.textContent !== selTxt) elSel.textContent = selTxt;
    var h = curActs.map(function (x, i) { return x.sep ? '<span class="vh-sep">' + x.sep + '</span>' : '<button type="button" class="vh-a ' + x.cls + '" data-a="' + i + '">' + x.label + '</button>'; }).join('');
    if (h !== lastActsKey) { elActs.innerHTML = h; lastActsKey = h; }
    var ch = '';
    if (ui.sel.length) {
      ch = '<span style="font-size:13px">Màu:</span>' + COLS.dark.map(function (c, i) { return '<button type="button" data-c="' + i + '" style="background:' + c + '" aria-label="Màu ' + (i + 1) + '"></button>'; }).join('');
    }
    if (elCols.getAttribute('data-k') !== ch) { elCols.innerHTML = ch; elCols.setAttribute('data-k', ch); }
  }
  elActs.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) return;
    var x = curActs[+b.getAttribute('data-a')]; if (x) x.fn();
  });
  elCols.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-c]') : null; if (!b) return;
    var c = +b.getAttribute('data-c'); snap();
    ui.sel.forEach(function (it) { if (it.t === 'p') P(it.id).c = c; else O(it.ref.id).c = c; });
    commit();
  });

  /* ================= Gợi ý & nút công cụ ================= */
  function hint() {
    var t = TOOLS.filter(function (x) { return x[0] === ui.tool; })[0], msg = t ? t[3] : '';
    if (ui.pend.length) {
      if (ui.tool === 'poly') msg = 'Đã chọn ' + ui.pend.length + ' đỉnh. Chạm lại đỉnh đầu hoặc bấm "Khép đa giác" để kết thúc.';
      else msg = 'Đã chọn điểm ' + ui.pend[0].name + '. Chạm điểm thứ hai để hoàn thành.';
    } else if (ui.tool !== 'select' && ui.lock) msg += ' (🔒 Đang khóa công cụ, chạm lại nút để mở khóa.)';
    else if (ui.tool !== 'select') msg += ' (Chạm lại nút công cụ để khóa, vẽ liên tục.)';
    elStatus.textContent = msg;
  }
  function updToolBtns() {
    Array.prototype.forEach.call(elTools.querySelectorAll('[data-t]'), function (b) {
      var on = b.getAttribute('data-t') === ui.tool;
      b.classList.toggle('on', on); b.classList.toggle('lock', on && ui.lock && ui.tool !== 'select');
    });
  }
  TOOLS.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vh-b'; b.setAttribute('data-t', t[0]);
    b.innerHTML = '<i>' + t[1] + '</i><span>' + t[2] + '</span>';
    b.addEventListener('click', function () {
      if (ui.tool === t[0] && t[0] !== 'select') { ui.lock = !ui.lock; updToolBtns(); hint(); return; }
      ui.lock = false; setTool(t[0], t[0] === 'select');
    });
    elTools.appendChild(b);
  });
  VIEWBTNS.forEach(function (v) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vh-b'; b.setAttribute('data-v', v[0]);
    b.innerHTML = '<i>' + v[1] + '</i><span>' + v[2] + '</span>';
    b.addEventListener('click', function () {
      if (!resize()) return;
      if (v[0] === 'zin') zoomAt(1.3, SW / 2, SH / 2); else if (v[0] === 'zout') zoomAt(1 / 1.3, SW / 2, SH / 2);
      else if (v[0] === 'zfit') { var vis = M.pts.filter(shownPt); if (vis.length) fitView(vis); else { view.z = 1; view.ox = 0; view.oy = 0; } }
      else { view.z = 1; view.ox = 0; view.oy = 0; }
      refresh();
    });
    elTools.appendChild(b);
  });
  SHAPES.forEach(function (sh) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vh-chip'; b.textContent = sh[0];
    b.addEventListener('click', function () {
      if (!resize()) return;
      snap(); var w = toW(SW / 2, SH / 2); sh[1]({ x: Math.round(w.x * 2) / 2, y: Math.round(w.y * 2) / 2 });
      ui.sel = []; ui.tool = 'select'; ui.pend = []; updToolBtns(); hint();
      say('Đã thêm ' + sh[0].replace(/^\S+\s/, '') + '. Kéo các điểm để biến đổi hình, chạm để chọn rồi dựng thêm.'); commit();
    });
    elShapes.appendChild(b);
  });

  /* ================= Điều khiển ================= */
  elPlay.addEventListener('click', function () {
    if (!ui.playing) {
      if (!M.pts.some(function (p) { return p.anim; })) { say('Chưa có điểm nào chạy. Chọn một điểm xanh lá (điểm trên đoạn/đường/đường tròn) rồi bấm "Cho điểm chạy".'); return; }
      ui.playing = true; startLoop();
    } else ui.playing = false;
    updPlay();
  });
  root.querySelector('#vhSpeed').addEventListener('input', function () { ui.speed = +this.value; });
  root.querySelector('#vhUndo').addEventListener('click', undo);
  root.querySelector('#vhRedo').addEventListener('click', redo);
  root.querySelector('#vhClrTr').addEventListener('click', function () { traces = {}; refresh(); });
  root.querySelector('#vhClear').addEventListener('click', function () {
    if (!M.pts.length && !M.objs.length) return;
    if (!confirm('Xóa toàn bộ hình đang vẽ?')) return;
    snap(); M.pts = []; M.objs = []; M.meas = []; M.marks = []; M.nname = 0; traces = {}; ui.pend = []; ui.sel = []; ui.playing = false; updPlay(); commit();
  });
  root.querySelector('#vhGrid').addEventListener('change', function () { ui.grid = this.checked; refresh(); });
  root.querySelector('#vhSnap').addEventListener('change', function () { ui.snap = this.checked; });
  root.querySelector('#vhNames').addEventListener('change', function () { ui.names = this.checked; refresh(); });
  root.querySelector('#vhMeasShow').addEventListener('change', function () { ui.meas = this.checked; refresh(); });
  root.querySelector('#vhBig').addEventListener('change', function () { root.classList.toggle('vh-big', this.checked); setTimeout(refresh, 30); });
  elMeas.addEventListener('click', function (e) {
    var id = e.target && e.target.getAttribute && e.target.getAttribute('data-m'); if (!id) return;
    snap(); M.meas = M.meas.filter(function (m) { return String(m.id) !== id; }); commit();
  });
  document.addEventListener('keydown', function (e) {
    if (!root.classList.contains('on')) return;
    var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    var ctrl = e.ctrlKey || e.metaKey, k = String(e.key || '').toLowerCase();
    if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (e.key === 'Escape') {
      ui.sel = []; ui.pend = []; ui.lock = false;
      if (ui.tool !== 'select') { ui.tool = 'select'; updToolBtns(); }
      hint(); refresh(); return;
    }
    if (!ui.sel.length) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      var x = curActs.filter(function (a) { return a.label && a.label.indexOf('Xóa') >= 0; })[0]; if (x) { e.preventDefault(); x.fn(); }
    }
  });

  /* lưu / mở file */
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  root.querySelector('#vhSave').addEventListener('click', function () {
    download(new Blob([dump()], { type: 'application/json' }), 'hinh-ve.json'); say('Đã lưu file hinh-ve.json. Dùng "Mở file" để mở lại.');
  });
  var elFile = root.querySelector('#vhFile');
  root.querySelector('#vhOpen').addEventListener('click', function () { elFile.click(); });
  elFile.addEventListener('change', function () {
    var f = elFile.files && elFile.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { snap(); restore(String(rd.result)); say('Đã mở ' + f.name + '.'); commit(); }
      catch (e) { say('File không hợp lệ.'); }
      elFile.value = '';
    };
    rd.readAsText(f);
  });

  /* khung bao quanh nội dung (px màn hình) để ảnh xuất ra gọn, không thừa nền trống */
  function contentBox() {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    function add(x, y) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    M.pts.forEach(function (p) { if (shownPt(p)) add(X(p.x), Y(p.y)); });
    M.objs.forEach(function (o) {
      if (!shownObj(o)) return;
      if (o.type === 'locus') { (o._pts || []).forEach(function (q) { if (q) add(X(q[0]), Y(q[1])); }); return; }
      if (o.type === 'poly') return;
      var g = geom({ id: o.id });
      if (g && g.k === 'c') { add(X(g.c.x) - g.r * S, Y(g.c.y) - g.r * S); add(X(g.c.x) + g.r * S, Y(g.c.y) + g.r * S); }
    });
    if (x0 === Infinity) return null;
    var m = 38, w = Math.max(x1 - x0 + 2 * m, 220), h = Math.max(y1 - y0 + 2 * m, 170);
    return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h };
  }
  function makePng(cb) {
    if (!resize()) { cb(null); return; }
    compute(); computeLocus();
    var bb = contentBox() || { x: 0, y: 0, w: SW, h: SH }, k = Math.min(3, 4000 / Math.max(bb.w, bb.h));
    var inner = draw('light');
    var xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(bb.w * k) + '" height="' + Math.round(bb.h * k) + '" viewBox="' + r2(bb.x) + ' ' + r2(bb.y) + ' ' + r2(bb.w) + ' ' + r2(bb.h) + '"><rect x="' + r2(bb.x) + '" y="' + r2(bb.y) + '" width="' + r2(bb.w) + '" height="' + r2(bb.h) + '" fill="#ffffff"/>' + inner + '</svg>';
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = Math.round(bb.w * k); cv.height = Math.round(bb.h * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function (b) { cb(b || null); }, 'image/png');
    };
    img.onerror = function () { cb(null); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  }
  function exportPng() {
    makePng(function (b) {
      if (!b) { say('Không xuất được ảnh trên trình duyệt này.'); return; }
      download(b, 'hinh-ve.png'); say('Đã lưu ảnh hinh-ve.png (nền trắng, cắt sát hình, dùng để chèn vào Word/PowerPoint).');
    });
  }
  function copyPng() {
    if (!(navigator.clipboard && window.ClipboardItem)) { say('Trình duyệt này chưa cho sao chép ảnh. Hãy dùng \"Lưu ảnh\".'); return; }
    makePng(function (b) {
      if (!b) { say('Không xuất được ảnh trên trình duyệt này.'); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(
        function () { say('Đã sao chép ảnh. Mở Word hoặc PowerPoint rồi bấm Ctrl+V để dán.'); },
        function () { say('Trình duyệt chặn việc sao chép. Hãy dùng \"Lưu ảnh\".'); });
    });
  }
  root.querySelector('#vhCopy').addEventListener('click', copyPng);
  root.querySelector('#vhPng').addEventListener('click', exportPng);

  /* ================= Dựng theo số đo ================= */
  var NUMS = [
    ['sss', '△ Tam giác biết 3 cạnh', [['AB', 4], ['BC', 5], ['CA', 6]], 'Tổng hai cạnh bất kỳ phải lớn hơn cạnh còn lại.'],
    ['sas', '△ Tam giác biết 2 cạnh và góc xen giữa', [['AB', 4], ['AC', 5], ['góc A (độ)', 60]], 'Góc A nằm giữa hai cạnh AB và AC.'],
    ['asa', '△ Tam giác biết 1 cạnh và 2 góc kề', [['BC', 5], ['góc B (độ)', 50], ['góc C (độ)', 60]], 'Tổng hai góc B và C phải nhỏ hơn 180°.'],
    ['rt', '◺ Tam giác vuông tại A', [['AB', 3], ['AC', 4]], 'Nhập hai cạnh góc vuông AB và AC.'],
    ['iso', '△ Tam giác cân tại A', [['đáy BC', 6], ['cạnh bên AB = AC', 5]], 'Cạnh bên phải lớn hơn nửa đáy.'],
    ['rect', '▭ Hình chữ nhật ABCD', [['AB (dài)', 6], ['AD (rộng)', 4]], ''],
    ['sq', '□ Hình vuông ABCD', [['cạnh', 4]], ''],
    ['par', '▱ Hình bình hành ABCD', [['AB', 6], ['AD', 4], ['góc A (độ)', 60]], ''],
    ['rhomb', '◇ Hình thoi ABCD', [['cạnh', 5], ['góc A (độ)', 60]], ''],
    ['rtrap', '⏢ Hình thang vuông (vuông tại A, D)', [['đáy lớn AB', 7], ['đáy nhỏ CD', 4], ['chiều cao AD', 3]], 'AB song song CD, AD vuông góc hai đáy.'],
    ['itrap', '⏢ Hình thang cân ABCD', [['đáy lớn AB', 8], ['đáy nhỏ CD', 4], ['chiều cao', 3]], 'AB song song CD, AD = BC.'],
    ['circ', '○ Đường tròn (O; r)', [['bán kính r', 3]], ''],
    ['seg', '╱ Đoạn thẳng AB', [['độ dài AB', 5]], ''],
    ['ang', '∠ Góc có số đo cho trước', [['số đo góc ABC (độ)', 60]], 'Đỉnh là B; cạnh BA nằm ngang.']
  ];
  function numShape(id, v) {
    var rad = function (d) { return d * Math.PI / 180; }, a, b, c, al, x, h2, be, ga, cc;
    switch (id) {
      case 'sss':
        c = v[0]; a = v[1]; b = v[2];
        if (a + b <= c + 1e-9 || a + c <= b + 1e-9 || b + c <= a + 1e-9) return { err: 'Ba cạnh ' + fmt(c) + ', ' + fmt(a) + ', ' + fmt(b) + ' không tạo thành tam giác (tổng hai cạnh phải lớn hơn cạnh còn lại).' };
        x = (b * b + c * c - a * a) / (2 * c); h2 = b * b - x * x;
        return { k: 'poly', c: [[0, 0], [c, 0], [x, -Math.sqrt(Math.max(h2, 0))]] };
      case 'sas':
        c = v[0]; b = v[1]; al = v[2]; if (al >= 180) return { err: 'Góc phải nhỏ hơn 180°.' };
        return { k: 'poly', c: [[0, 0], [c, 0], [b * Math.cos(rad(al)), -b * Math.sin(rad(al))]] };
      case 'asa':
        a = v[0]; be = v[1]; ga = v[2]; if (be + ga >= 180) return { err: 'Tổng hai góc B và C phải nhỏ hơn 180°.' };
        cc = a * Math.sin(rad(ga)) / Math.sin(rad(be + ga));
        return { k: 'poly', c: [[cc * Math.cos(rad(be)), -cc * Math.sin(rad(be))], [0, 0], [a, 0]] };
      case 'rt': return { k: 'poly', c: [[0, 0], [v[0], 0], [0, -v[1]]] };
      case 'iso':
        if (v[1] * 2 <= v[0] + 1e-9) return { err: 'Cạnh bên phải lớn hơn nửa đáy.' };
        h2 = Math.sqrt(v[1] * v[1] - v[0] * v[0] / 4);
        return { k: 'poly', c: [[0, -h2], [-v[0] / 2, 0], [v[0] / 2, 0]] };
      case 'rect': return { k: 'poly', c: [[0, 0], [v[0], 0], [v[0], -v[1]], [0, -v[1]]] };
      case 'sq': return { k: 'poly', c: [[0, 0], [v[0], 0], [v[0], -v[0]], [0, -v[0]]] };
      case 'par': case 'rhomb':
        a = v[0]; b = id === 'par' ? v[1] : v[0]; al = id === 'par' ? v[2] : v[1]; if (al >= 180) return { err: 'Góc phải nhỏ hơn 180°.' };
        x = b * Math.cos(rad(al)); h2 = -b * Math.sin(rad(al));
        return { k: 'poly', c: [[0, 0], [a, 0], [a + x, h2], [x, h2]] };
      case 'rtrap': return { k: 'poly', c: [[0, 0], [v[0], 0], [v[1], -v[2]], [0, -v[2]]] };
      case 'itrap': return { k: 'poly', c: [[0, 0], [v[0], 0], [(v[0] + v[1]) / 2, -v[2]], [(v[0] - v[1]) / 2, -v[2]]] };
      case 'circ': return { k: 'circ', c: [[0, 0], [v[0], 0]] };
      case 'seg': return { k: 'seg', c: [[0, 0], [v[0], 0]] };
      case 'ang':
        if (v[0] >= 180) return { err: 'Số đo góc phải nhỏ hơn 180°.' };
        return { k: 'ang', c: [[4, 0], [0, 0], [4 * Math.cos(rad(v[0])), -4 * Math.sin(rad(v[0]))]] };
    }
    return { err: 'Chưa hỗ trợ.' };
  }
  var elNumKind = root.querySelector('#vhNumKind'), elNumIn = root.querySelector('#vhNumIn'), elNumHelp = root.querySelector('#vhNumHelp');
  NUMS.forEach(function (n, i) { var o = document.createElement('option'); o.value = i; o.textContent = n[1]; elNumKind.appendChild(o); });
  function renderNumFields() {
    var d = NUMS[+elNumKind.value];
    elNumIn.innerHTML = d[2].map(function (f, i) { return '<label>' + f[0] + ' <input type="text" inputmode="decimal" data-n="' + i + '" value="' + String(f[1]).replace('.', ',') + '"></label>'; }).join('');
    elNumHelp.textContent = d[3] + (d[3] ? ' ' : '') + 'Độ dài tính theo đơn vị của lưới (chọn đơn vị cm, mm... ở phần cài đặt phía dưới nếu cần).';
  }
  elNumKind.addEventListener('change', renderNumFields);
  function buildNum() {
    if (!resize()) return;
    var d = NUMS[+elNumKind.value], vals = [], bad = false;
    Array.prototype.forEach.call(elNumIn.querySelectorAll('input'), function (inp) {
      var x = parseFloat(String(inp.value).replace(',', '.')); if (!(x > 0) || !isFinite(x)) bad = true; vals.push(x);
    });
    if (bad || vals.length !== d[2].length) { say('Hãy nhập đủ các số dương (có thể dùng dấu phẩy, ví dụ 4,5).'); return; }
    var res = numShape(d[0], vals); if (res.err) { say(res.err); return; }
    var wm = root.querySelector('#vhNumMeas').checked, cw = toW(SW / 2, SH / 2);
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    res.c.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    var dx = cw.x - (x0 + x1) / 2, dy = cw.y - (y0 + y1) / 2, pts, sel = [], o2;
    snap();
    if (res.k === 'circ') {
      pts = [addPt({ type: 'free', x: res.c[0][0] + dx, y: res.c[0][1] + dy, name: pickName(['O']) }), F(res.c[1][0] + dx, res.c[1][1] + dy)];
    } else pts = res.c.map(function (q) { return F(q[0] + dx, q[1] + dy); });
    if (res.k === 'poly') {
      o2 = poly(pts); sel = [objItem(o2)];
      if (wm) { polySides(o2); polyAngles(o2); }
      else if (ui.auto) for (var i = 0; i < pts.length; i++) if (isRightAt(o2, i)) { var n2 = pts.length; rtAt(P(o2.p[(i + n2 - 1) % n2]), P(o2.p[i]), P(o2.p[(i + 1) % n2])); }
    } else if (res.k === 'circ') {
      o2 = addObj({ type: 'circ', p: [pts[0].id, pts[1].id] }); sel = [objItem(o2)];
      if (wm) pushMeas({ type: 'rad', o: [{ id: o2.id }] });
    } else if (res.k === 'seg') {
      o2 = addObj({ type: 'seg', p: [pts[0].id, pts[1].id] }); sel = [objItem(o2)];
      if (wm) pushMeas({ type: 'len', o: [{ id: o2.id }] });
    } else if (res.k === 'ang') {
      addObj({ type: 'seg', p: [pts[1].id, pts[0].id] }); addObj({ type: 'seg', p: [pts[1].id, pts[2].id] });
      sel = pts.map(ptItem); if (wm) pushMeas({ type: 'ang', p: [pts[0].id, pts[1].id, pts[2].id] });
    }
    ui.sel = sel; ui.tool = 'select'; ui.pend = []; updToolBtns(); hint();
    var out = pts.some(function (p) { var sx = X(p.x), sy = Y(p.y); return sx < 24 || sy < 24 || sx > SW - 24 || sy > SH - 24; });
    if (out) fitView(M.pts.filter(shownPt));
    say('Đã vẽ ' + d[1].replace(/^\S+\s/, '') + ' theo số đo. Kéo điểm để thay đổi; chạm vào hình để dựng thêm đường cao, trung tuyến, phân giác...');
    commit();
  }
  root.querySelector('#vhNumGo').addEventListener('click', buildNum);
  elNumIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); buildNum(); } });
  renderNumFields();
  root.querySelector('#vhAuto').addEventListener('change', function () { ui.auto = this.checked; });
  root.querySelector('#vhExpGrid').addEventListener('change', function () { ui.expGrid = this.checked; });
  root.querySelector('#vhDec').addEventListener('change', function () { ui.dec = +this.value; refresh(); });
  root.querySelector('#vhUnit').addEventListener('change', function () { ui.unit = this.value; refresh(); });

  /* ================= Khởi động ================= */
  var sel = document.getElementById('mSel');
  if (sel) sel.addEventListener('change', function () {
    if (sel.value === 'mVeHinh') {
      document.querySelectorAll('#t5>.mt').forEach(function (d) { d.classList.toggle('on', d.id === 'mVeHinh'); });
    }
    setTimeout(refresh, 60); setTimeout(refresh, 400);
  });
  if (window.ResizeObserver) new ResizeObserver(function () { refresh(); }).observe(svg);
  window.addEventListener('resize', refresh);
  document.addEventListener('tabshow', function () { setTimeout(refresh, 60); });
  window.addEventListener('tabshow', function () { setTimeout(refresh, 60); });
  try {
    var saved = localStorage.getItem(SAVE_KEY);
    if (saved) restore(saved);
  } catch (e) { M.pts = []; M.objs = []; M.meas = []; M.marks = []; M.nid = 1; M.nname = 0; try { localStorage.removeItem(SAVE_KEY); } catch (x) { } }
  setTool('select', true);
  hint(); refresh();
  window.__veHinh = {
    M: M, ui: ui, view: view, refresh: refresh, compute: compute, SHAPES: SHAPES, setTool: setTool, undo: undo, redo: redo, measEval: measEval, inter: inter,
    acts: function () { return curActs.map(function (a) { return a.label || a.sep; }); },
    act: function (sub) { var x = curActs.filter(function (a) { return a.label && a.label.indexOf(sub) >= 0; })[0]; if (!x) throw new Error('no act ' + sub + ' in ' + JSON.stringify(curActs.map(function (a) { return a.label || a.sep; }))); x.fn(); },
    draw: draw, fitView: fitView, getM: function () { return M; }
  };
})();
