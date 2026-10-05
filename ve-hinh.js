/* Vẽ hình tương tác (kiểu Sketchpad) - phiên bản 2 - dùng cho tab Toán học
   Gắn vào <div id="mVeHinh"> trong index.html. Không cần thư viện ngoài.
   Cách dùng: chọn đối tượng (chạm), rồi bấm lệnh dựng hiện ra bên dưới khung vẽ. */
(function () {
  'use strict';
  var root = document.getElementById('mVeHinh');
  if (!root || root.getAttribute('data-vh')) return;
  root.setAttribute('data-vh', '2');

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
  var M = { pts: [], objs: [], meas: [], nid: 1, nname: 0 };
  var ui = { tool: 'select', lock: false, pend: [], sel: [], grid: true, snap: false, names: true, meas: true,
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
    '#mVeHinh .vh-m button{min-height:0;padding:2px 8px;cursor:pointer;border:0;background:transparent;color:inherit;font-size:16px;opacity:.7}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var TOOLS = [
    ['select', '👆', 'Chọn/Kéo', 'Chạm để chọn điểm, đoạn, đường (chạm nhiều đối tượng để chọn nhiều). Kéo điểm để di chuyển, kéo vùng trống để dời khung, 2 ngón để phóng to/thu nhỏ.'],
    ['point', '●', 'Điểm', 'Chạm chỗ trống để đặt điểm. Chạm lên đoạn, đường, đường tròn để đặt điểm chạy trên đó.'],
    ['seg', '╱', 'Đoạn', 'Kéo từ điểm này sang điểm kia, hoặc chạm lần lượt 2 điểm.'],
    ['line', '↔', 'Đường', 'Kéo qua 2 điểm, hoặc chạm lần lượt 2 điểm.'],
    ['ray', '↗', 'Tia', 'Kéo từ gốc tia qua một điểm, hoặc chạm gốc rồi chạm điểm thứ 2.'],
    ['circ', '○', 'Tròn', 'Kéo từ tâm ra bán kính, hoặc chạm tâm rồi chạm một điểm trên đường tròn.'],
    ['poly', '⬠', 'Đa giác', 'Chạm lần lượt các đỉnh. Chạm lại đỉnh đầu hoặc bấm "Khép đa giác" để kết thúc.']
  ];
  var VIEWBTNS = [['zin', '＋', 'Phóng to'], ['zout', '－', 'Thu nhỏ'], ['zreset', '⌂', 'Về gốc']];

  root.innerHTML =
    '<div class="vh-tools" id="vhTools"></div>' +
    '<div class="vh-lbl"><b>Vẽ nhanh hình cơ bản</b> (trượt ngang để xem thêm; kéo điểm để đổi kích thước, hình vẫn giữ tính chất)</div>' +
    '<div class="vh-shapes" id="vhShapes"></div>' +
    '<svg class="vh-svg" id="vhSvg"></svg>' +
    '<div class="vh-status" id="vhStatus"></div>' +
    '<div class="vh-sel" id="vhSel"></div>' +
    '<div class="vh-acts" id="vhActs"></div>' +
    '<div class="vh-cols" id="vhCols"></div>' +
    '<div class="vh-ctl">' +
    '<button class="sm green" id="vhPlay" type="button">▶ Chạy</button>' +
    '<label>Tốc độ <input type="range" id="vhSpeed" min="0.2" max="3" step="0.1" value="1" style="width:110px"></label>' +
    '<button class="sm sec" id="vhUndo" type="button">↶ Hoàn tác</button>' +
    '<button class="sm sec" id="vhRedo" type="button">↷ Làm lại</button>' +
    '<button class="sm sec" id="vhClrTr" type="button">🧹 Xóa vệt</button>' +
    '<button class="sm orange" id="vhPng" type="button">📷 Lưu ảnh</button>' +
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
    '</div>' +
    '<div class="vh-meas" id="vhMeas"></div>' +
    '<div class="note"><b>Cách dựng hình kiểu Sketchpad:</b> chạm để chọn đối tượng (ví dụ 2 điểm, hoặc 1 điểm và 1 đường), rồi bấm lệnh hiện ra bên dưới khung vẽ (trung điểm, vuông góc, song song, giao điểm, đo, đối xứng, quay, quỹ tích...). Điểm <b>vàng</b> kéo tự do, điểm <b>xanh lá</b> chạy trên đường, điểm <b>xanh tím</b> phụ thuộc. Dạy học: bật số đo, cho học sinh <b>dự đoán</b> rồi kéo điểm hoặc cho điểm chạy; bấm "Hiện số đo" để ẩn số trước khi hé lộ. 1 ô lưới = 1 đơn vị. Chạm lại công cụ đang chọn để khóa công cụ (vẽ liên tục).</div>';

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
  function fmt(v) { return (Math.round(v * 100) / 100).toFixed(2).replace('.', ','); }
  function snapV(v) { return ui.snap ? Math.round(v / STEP) * STEP : v; }
  function X(x) { return view.ox + x * S; }
  function Y(y) { return view.oy + y * S; }
  function toW(px, py) { return { x: (px - view.ox) / S, y: (py - view.oy) / S }; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function nextName() { var n = M.nname++, L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', k = Math.floor(n / 26); return L.charAt(n % 26) + (k ? k : ''); }
  function addPt(o) { o.id = M.nid++; o.name = o.name || nextName(); o.ok = true; o.anim = false; o.trace = false; o.dir = 1; M.pts.push(o); return o; }
  function addObj(o) { o.id = M.nid++; M.objs.push(o); return o; }
  function say(t, keep) { elStatus.textContent = t; if (!keep) { clearTimeout(say.t); say.t = setTimeout(hint, 4000); } }
  function isGlider(p) { return p.type === 'onseg' || p.type === 'online' || p.type === 'oncirc'; }
  function shownPt(p) { return p.ok && !p.hid; }
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
      case 'bis': a = pp(0); b = pp(1); c = pp(2);
        if (!a || !b || !c) return null;
        var u = unit(V(b, a)), v = unit(V(b, c)); if (!u || !v) return null;
        d = unit({ x: u.x + v.x, y: u.y + v.y }) || { x: -u.y, y: u.x };
        return { k: 'l', p: b, d: d, lo: -Infinity, hi: Infinity };
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
  function dump() { return JSON.stringify({ pts: M.pts, objs: M.objs.map(function (o) { var c = {}; for (var k in o) if (k !== '_pts') c[k] = o[k]; return c; }), meas: M.meas, nid: M.nid, nname: M.nname }); }
  function restore(j) {
    var o = JSON.parse(j);
    if (!o || !Array.isArray(o.pts) || !Array.isArray(o.objs) || !Array.isArray(o.meas)) throw new Error('bad');
    M.pts = o.pts; M.objs = o.objs; M.meas = o.meas; M.nid = o.nid || 1; M.nname = o.nname || 0;
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
    ['○ Tròn', function (c) { var o = F(c.x, c.y), r = F(c.x + 3, c.y); addObj({ type: 'circ', p: [o.id, r.id] }); }]
  ];

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
    return { perpline: 'đường vuông góc', parline: 'đường song song', pbis: 'đường trung trực', bis: 'tia phân giác' }[o.type] || 'đường';
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
  function measEval(m) {
    var a, b, c, g, e, pts, i, s, cx, cy, A, B, C, o, ref;
    if (m.type === 'ang') {
      A = P(m.p[0]); B = P(m.p[1]); C = P(m.p[2]);
      if (!(A && B && C && A.ok && B.ok && C.ok)) return null;
      var u = V(B, A), v = V(B, C), l = len(u) * len(v); if (l < 1e-9) return null;
      var ang = Math.acos(clamp((u.x * v.x + u.y * v.y) / l, -1, 1)) * 180 / Math.PI;
      return { txt: '∠' + A.name + B.name + C.name + ' = ' + fmt(ang) + '°', cv: fmt(ang) + '°', x: B.x, y: B.y, dx: 16, dy: -16 };
    }
    if (m.type === 'dist') {
      A = P(m.p[0]); B = P(m.p[1]); if (!(A && B && A.ok && B.ok)) return null;
      var dl = len(V(A, B));
      return { txt: A.name + B.name + ' = ' + fmt(dl), cv: A.name + B.name + '=' + fmt(dl), x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, dx: 0, dy: -10 };
    }
    if (m.type === 'pdist') {
      A = P(m.p[0]); g = geom(m.o[0]); if (!(A && A.ok && g && g.k === 'l')) return null;
      var dp = Math.abs((A.x - g.p.x) * g.d.y - (A.y - g.p.y) * g.d.x);
      return { txt: 'Khoảng cách từ ' + A.name + ' đến ' + lineLabel(m.o[0]) + ' = ' + fmt(dp), cv: 'd=' + fmt(dp), x: A.x, y: A.y, dx: 14, dy: 20 };
    }
    ref = m.o[0]; o = O(ref.id); if (!o) return null;
    if (m.type === 'len') {
      e = segEnds(ref); if (!e || !e[0] || !e[1] || !e[0].ok || !e[1].ok) return null;
      var L = len(V(e[0], e[1]));
      return { txt: e[0].name + e[1].name + ' = ' + fmt(L), cv: e[0].name + e[1].name + '=' + fmt(L), x: (e[0].x + e[1].x) / 2, y: (e[0].y + e[1].y) / 2, dx: 0, dy: -10 };
    }
    if (m.type === 'area' || m.type === 'per') {
      pts = o.p.map(P); if (pts.some(function (p) { return !p || !p.ok; })) return null;
      var ar = 0, pr = 0, n = pts.length; cx = 0; cy = 0;
      for (i = 0; i < n; i++) { a = pts[i]; b = pts[(i + 1) % n]; ar += a.x * b.y - b.x * a.y; pr += len(V(a, b)); cx += a.x; cy += a.y; }
      ar = Math.abs(ar) / 2; cx /= n; cy /= n;
      s = pts.map(function (p) { return p.name; }).join('');
      return m.type === 'area'
        ? { txt: 'Diện tích ' + s + ' = ' + fmt(ar), cv: 'S=' + fmt(ar), x: cx, y: cy, dx: 0, dy: 0 }
        : { txt: 'Chu vi ' + s + ' = ' + fmt(pr), cv: 'P=' + fmt(pr), x: cx, y: cy, dx: 0, dy: 18 };
    }
    g = geom(ref); if (!g || g.k !== 'c') return null;
    var nm = lineLabel(ref), r = g.r;
    if (m.type === 'rad') return { txt: 'Bán kính ' + nm + ' = ' + fmt(r), cv: 'r=' + fmt(r), x: g.c.x, y: g.c.y, dx: 8, dy: -10 };
    if (m.type === 'circ') return { txt: 'Chu vi đường tròn ' + nm + ' = ' + fmt(2 * Math.PI * r), cv: '', x: g.c.x, y: g.c.y, dx: 0, dy: 0 };
    return { txt: 'Diện tích hình tròn ' + nm + ' = ' + fmt(Math.PI * r * r), cv: '', x: g.c.x, y: g.c.y, dx: 0, dy: 0 };
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

  function draw(theme) {
    var C = PAL[theme || 'dark'], CL = COLS[theme || 'dark'], s = '', i, W = SW, H = SH, exp = theme === 'light';
    var FONT = 'font-family="system-ui,Arial,sans-serif"';
    if (ui.grid) {
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
      var col = CL[o.c || 0], dash = (o.type === 'perpline' || o.type === 'parline' || o.type === 'pbis' || o.type === 'bis') ? ' stroke-dasharray="7 5"' : '';
      if (o.type === 'locus') { s += shapeStr({ id: o.id }, 'stroke="' + (o.c ? col : C.trace) + '" stroke-width="2.4"'); return; }
      s += shapeStr({ id: o.id }, 'stroke="' + col + '" stroke-width="2.2"' + dash);
    });
    if (!exp) ui.sel.forEach(function (it) {
      if (it.t === 'o') s += shapeStr(it.ref, 'stroke="' + C.sel + '" stroke-width="8" opacity=".35" fill="none"');
    });
    M.pts.forEach(function (p) {
      var t = traces[p.id]; if (!p.trace || !t || t.length < 2) return;
      s += '<polyline points="' + t.map(function (q) { return r2(X(q[0])) + ',' + r2(Y(q[1])); }).join(' ') + '" fill="none" stroke="' + C.trace + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>';
    });
    if (ui.meas || exp) {
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
      if (ui.names) s += '<text x="' + (x + 9) + '" y="' + (y - 9) + '" font-size="15" font-weight="700" ' + FONT + ' fill="' + C.txt + '" stroke="' + C.bg + '" stroke-width="3" paint-order="stroke">' + String(p.name).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
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
  function buildActs() {
    var a = analyze(), L = [], np = a.pts.length, nl = a.lines.length, nc = a.circs.length, ng = a.polys.length;
    function add(label, fn, cls) { L.push({ label: label, fn: fn, cls: cls || '' }); }
    function act(fn) { return function () { snap(); var r = fn(); if (r !== false) { ui.sel = r || []; } commit(); }; }
    var A = a.pts[0], B = a.pts[1], C3 = a.pts[2], line = nl ? a.lines[0] : null;
    var onlyPts = !nl && !nc && !ng, last = a.pts[np - 1];
    if (np === 2 && onlyPts) {
      add('╱ Đoạn', act(function () { return [objItem(addObj({ type: 'seg', p: [A.id, B.id] }))]; }));
      add('↔ Đường', act(function () { return [objItem(addObj({ type: 'line', p: [A.id, B.id] }))]; }));
      add('↗ Tia', act(function () { return [objItem(addObj({ type: 'ray', p: [A.id, B.id] }))]; }));
      add('⊙ Trung điểm', act(function () { return [ptItem(addPt({ type: 'mid', p: [A.id, B.id] }))]; }));
      add('⊣ Trung trực', act(function () { return [objItem(addObj({ type: 'pbis', p: [A.id, B.id] }))]; }));
      add('○ Đường tròn (tâm ' + A.name + ')', act(function () { return [objItem(addObj({ type: 'circ', p: [A.id, B.id] }))]; }));
      add('📏 Khoảng cách', act(function () { M.meas.push({ id: M.nid++, type: 'dist', p: [A.id, B.id] }); return a.pts.map(ptItem); }));
      if (isGlider(A)) add('🌀 Quỹ tích của ' + B.name, act(function () { return [objItem(addObj({ type: 'locus', p: [A.id, B.id] }))]; }));
    }
    if (np === 3 && onlyPts) {
      add('📐 Đo góc ' + A.name + B.name + C3.name, act(function () { M.meas.push({ id: M.nid++, type: 'ang', p: [A.id, B.id, C3.id] }); return a.pts.map(ptItem); }));
      add('∠ Phân giác', act(function () { return [objItem(addObj({ type: 'bis', p: [A.id, B.id, C3.id] }))]; }));
      add('◯ Đường tròn qua 3 điểm', act(function () { return [objItem(addObj({ type: 'circ3', p: [A.id, B.id, C3.id] }))]; }));
    }
    if (np >= 3 && onlyPts) add('⬠ Đa giác', act(function () { return [objItem(addObj({ type: 'poly', p: a.pts.map(function (p) { return p.id; }) }))]; }));
    if (np >= 1 && nl === 1 && !nc && !ng) {
      add('⊥ Vuông góc', act(function () { return a.pts.map(function (p) { return objItem(addObj({ type: 'perpline', p: [p.id], o: [line.ref] })); }); }));
      add('∥ Song song', act(function () { return a.pts.map(function (p) { return objItem(addObj({ type: 'parline', p: [p.id], o: [line.ref] })); }); }));
      add('⤓ Hình chiếu', act(function () { return a.pts.map(function (p) { return ptItem(addPt({ type: 'foot', p: [p.id], o: [line.ref] })); }); }));
      add('⇋ Đối xứng qua đường', act(function () { return imagesOf(a, function (q) { return addPt({ type: 'refl', name: imgName(q), p: [q.id], o: [line.ref] }); }); }));
      if (np === 1) add('📏 Khoảng cách tới đường', act(function () { M.meas.push({ id: M.nid++, type: 'pdist', p: [A.id], o: [line.ref] }); return ui.sel.slice(); }));
    }
    if (ng === 1 && nl === 1 && !np && !nc) add('⇋ Đối xứng qua đường', act(function () { return imagesOf(a, function (q) { return addPt({ type: 'refl', name: imgName(q), p: [q.id], o: [line.ref] }); }); }));
    if (np === 0 && nl === 1 && !nc && !ng && line.fin) {
      var e = segEnds(line.ref);
      add('⊙ Trung điểm', act(function () { return [ptItem(addPt({ type: 'mid', p: [e[0].id, e[1].id] }))]; }));
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
    var h = curActs.map(function (x, i) { return '<button type="button" class="vh-a ' + x.cls + '" data-a="' + i + '">' + x.label + '</button>'; }).join('');
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
    snap(); M.pts = []; M.objs = []; M.meas = []; M.nname = 0; traces = {}; ui.pend = []; ui.sel = []; ui.playing = false; updPlay(); commit();
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
    if (!root.classList.contains('on') || !ui.sel.length) return;
    var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      var x = curActs.filter(function (a) { return a.label.indexOf('Xóa') >= 0; })[0]; if (x) { e.preventDefault(); x.fn(); }
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

  function exportPng() {
    if (!resize()) return;
    compute(); computeLocus();
    var W = SW, H = SH, k = 2;
    var inner = draw('light');
    var xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W * k + '" height="' + H * k + '" viewBox="0 0 ' + W + ' ' + H + '"><rect width="100%" height="100%" fill="#ffffff"/>' + inner + '</svg>';
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
      cv.getContext('2d').drawImage(img, 0, 0);
      cv.toBlob(function (b) {
        if (!b) { say('Không xuất được ảnh trên trình duyệt này.'); return; }
        download(b, 'hinh-ve.png'); say('Đã lưu ảnh hinh-ve.png (nền trắng, dùng để chèn vào Word/PowerPoint).');
      }, 'image/png');
    };
    img.onerror = function () { say('Không xuất được ảnh trên trình duyệt này.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  }
  root.querySelector('#vhPng').addEventListener('click', exportPng);

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
  } catch (e) { M = { pts: [], objs: [], meas: [], nid: 1, nname: 0 }; try { localStorage.removeItem(SAVE_KEY); } catch (x) { } }
  setTool('select', true);
  hint(); refresh();
  window.__veHinh = {
    M: M, ui: ui, view: view, refresh: refresh, compute: compute, SHAPES: SHAPES, setTool: setTool, undo: undo, redo: redo, measEval: measEval, inter: inter,
    acts: function () { return curActs.map(function (a) { return a.label; }); },
    act: function (sub) { var x = curActs.filter(function (a) { return a.label.indexOf(sub) >= 0; })[0]; if (!x) throw new Error('no act ' + sub + ' in ' + JSON.stringify(curActs.map(function (a) { return a.label; }))); x.fn(); },
    getM: function () { return M; }
  };
})();
