/* Vẽ hình tương tác (kiểu Sketchpad) - dùng cho tab Toán học
   Gắn vào <div id="mVeHinh"> trong index.html. Không cần thư viện ngoài. */
(function () {
  'use strict';
  var root = document.getElementById('mVeHinh');
  if (!root || root.getAttribute('data-vh')) return;
  root.setAttribute('data-vh', '1');

  /* ================= Hằng số & trạng thái ================= */
  var WU = 16, HU = 10.5;              // vùng vẽ: 16 x 10,5 ô lưới
  var STEP = 0.5;                       // bước bắt lưới
  var PAL = {
    dark:  { bg: '#0f1626', grid: 'rgba(255,255,255,.07)', line: '#7fd4ff', fill: 'rgba(127,212,255,.13)', free: '#ffd54f', glide: '#4ade80', dep: '#a5b4fc', txt: '#e8eefc', trace: '#ff9ff3', meas: '#ffb86b', pend: '#ffffff' },
    light: { bg: '#ffffff', grid: 'rgba(0,0,0,.09)',       line: '#1d3b8b', fill: 'rgba(29,59,139,.08)',   free: '#c77700', glide: '#118a3e', dep: '#4a4fbf', txt: '#111827', trace: '#c2185b', meas: '#b45309', pend: '#000000' }
  };
  var M = { pts: [], objs: [], meas: [], nid: 1, nname: 0 };
  var ui = { tool: 'select', pend: [], grid: true, snap: true, names: true, meas: true, playing: false, speed: 1, drag: null, ptr: null };
  var traces = {};
  var undoStack = [];
  var S = 40, SW = 0, SH = 0;           // px mỗi ô lưới, kích thước svg

  /* ================= Giao diện ================= */
  var css =
    '#mVeHinh .vh-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px;margin:8px 0}' +
    '#mVeHinh .vh-b{cursor:pointer;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;border-radius:10px;padding:5px 2px;font:inherit;line-height:1.1;text-align:center;min-height:46px}' +
    '#mVeHinh .vh-b i{display:block;font-style:normal;font-size:19px}' +
    '#mVeHinh .vh-b span{display:block;font-size:10.5px;opacity:.85;margin-top:2px}' +
    '#mVeHinh .vh-b.on{background:var(--a1,#4f5bf0);border-color:transparent;color:#fff}' +
    '#mVeHinh .vh-shapes{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}' +
    '#mVeHinh .vh-chip{min-height:36px;cursor:pointer;border:1px solid rgba(255,255,255,.2);background:rgba(255,213,79,.12);color:inherit;border-radius:999px;padding:6px 11px;font:inherit;font-size:13px;white-space:nowrap}' +
    '#mVeHinh .vh-lbl{font-size:12.5px;opacity:.85;margin:8px 0 0}' +
    '#mVeHinh svg.vh-svg{width:100%;aspect-ratio:16/10.5;display:block;touch-action:none;user-select:none;-webkit-user-select:none;background:var(--card2,#0f1626);border:1px solid var(--bd,#25324d);border-radius:10px;margin-top:6px}' +
    '#mVeHinh .vh-status{font-size:13px;margin:6px 0;min-height:19px;opacity:.95}' +
    '#mVeHinh .vh-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}' +
    '#mVeHinh .vh-ctl label{font-size:14.5px;display:inline-flex;align-items:center;gap:4px}' +
    '#mVeHinh .vh-meas{margin:6px 0}' +
    '#mVeHinh .vh-m{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;margin:4px 0;border:1px solid rgba(255,255,255,.14);border-radius:8px;font-size:14px}' +
    '#mVeHinh .vh-m button{min-height:0;padding:2px 8px;cursor:pointer;border:0;background:transparent;color:inherit;font-size:16px;opacity:.7}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var TOOLS = [
    ['select', '👆', 'Kéo', 'Kéo điểm để thay đổi hình. Kéo thân hình để dời cả hình. Điểm vàng kéo tự do, điểm xanh lá chạy trên đường, điểm xanh tím phụ thuộc.'],
    ['point', '●', 'Điểm', 'Chạm chỗ trống để đặt điểm. Chạm lên đoạn, đường, đường tròn để đặt điểm chạy trên đó.'],
    ['seg', '╱', 'Đoạn', 'Chạm 2 điểm (hoặc 2 vị trí trống) để nối thành đoạn thẳng.'],
    ['line', '↔', 'Đường', 'Chạm 2 điểm để vẽ đường thẳng đi qua chúng.'],
    ['circ', '○', 'Tròn', 'Chạm tâm, rồi chạm một điểm nằm trên đường tròn.'],
    ['poly', '⬠', 'Đa giác', 'Chạm lần lượt các đỉnh, chạm lại đỉnh đầu tiên để khép kín.'],
    ['mid', '⊙', 'T.điểm', 'Chạm 2 điểm để lấy trung điểm.'],
    ['perp', '⊥', 'Vuông góc', 'Chạm một điểm rồi chạm một đoạn/đường (thứ tự nào cũng được).'],
    ['par', '∥', 'Song song', 'Chạm một điểm rồi chạm một đoạn/đường (thứ tự nào cũng được).'],
    ['pbis', '⊣', 'Trung trực', 'Chạm 2 điểm để vẽ đường trung trực của đoạn nối chúng.'],
    ['inter', '✕', 'Giao', 'Chạm 2 đối tượng (đoạn, đường, đường tròn, cạnh đa giác) để lấy giao điểm.'],
    ['meas', '📏', 'Đo', 'Chạm đoạn: độ dài. Chạm đa giác: diện tích, chu vi. Chạm đường tròn: bán kính... Chạm 3 điểm liên tiếp: góc (đỉnh là điểm thứ 2).'],
    ['anim', '▶', 'Điểm chạy', 'Chạm vào điểm xanh lá để cho chạy hoặc dừng. Rồi bấm nút Chạy bên dưới.'],
    ['trace', '〰', 'Vệt', 'Chạm vào một điểm để bật/tắt vệt chuyển động của nó.'],
    ['del', '🗑', 'Xóa', 'Chạm vào điểm hoặc hình để xóa (các hình phụ thuộc cũng bị xóa).']
  ];

  root.innerHTML =
    '<div class="vh-lbl"><b>Công cụ</b></div>' +
    '<div class="vh-tools" id="vhTools"></div>' +
    '<div class="vh-lbl"><b>Vẽ nhanh hình cơ bản</b> (kéo điểm để đổi kích thước, hình vẫn giữ tính chất)</div>' +
    '<div class="vh-shapes" id="vhShapes"></div>' +
    '<svg class="vh-svg" id="vhSvg"></svg>' +
    '<div class="vh-status" id="vhStatus"></div>' +
    '<div class="vh-ctl">' +
    '<button class="sm green" id="vhPlay" type="button">▶ Chạy</button>' +
    '<label>Tốc độ <input type="range" id="vhSpeed" min="0.2" max="3" step="0.1" value="1" style="width:110px"></label>' +
    '<button class="sm sec" id="vhUndo" type="button">↶ Hoàn tác</button>' +
    '<button class="sm sec" id="vhClrTr" type="button">🧹 Xóa vệt</button>' +
    '<button class="sm orange" id="vhPng" type="button">📷 Lưu ảnh</button>' +
    '<button class="sm sec" id="vhClear" type="button">🗑 Xóa hết</button>' +
    '</div>' +
    '<div class="vh-ctl">' +
    '<label><input type="checkbox" id="vhGrid" checked> Lưới</label>' +
    '<label><input type="checkbox" id="vhSnap" checked> Bắt lưới</label>' +
    '<label><input type="checkbox" id="vhNames" checked> Tên điểm</label>' +
    '<label><input type="checkbox" id="vhMeasShow" checked> Hiện số đo</label>' +
    '</div>' +
    '<div class="vh-meas" id="vhMeas"></div>' +
    '<div class="note">Gợi ý dạy học: vẽ hình, bật <b>Đo</b>, cho học sinh <b>dự đoán</b> số đo thay đổi thế nào khi kéo điểm hoặc cho điểm chạy; bật <b>Vệt</b> để quan sát quỹ tích. Bấm <b>Hiện số đo</b> để ẩn số rồi mới hé lộ sau khi học sinh dự đoán. 1 ô lưới = 1 đơn vị.</div>';

  var svg = root.querySelector('#vhSvg');
  var elTools = root.querySelector('#vhTools'), elShapes = root.querySelector('#vhShapes');
  var elStatus = root.querySelector('#vhStatus'), elMeas = root.querySelector('#vhMeas');
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
  function nextName() { var n = M.nname++, L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', k = Math.floor(n / 26); return L.charAt(n % 26) + (k ? k : ''); }
  function addPt(o) { o.id = M.nid++; o.name = o.name || nextName(); o.ok = true; o.anim = false; o.trace = false; o.dir = 1; M.pts.push(o); return o; }
  function addObj(o) { o.id = M.nid++; M.objs.push(o); return o; }
  function say(t, keep) { elStatus.textContent = t; if (!keep) { clearTimeout(say.t); say.t = setTimeout(hint, 3500); } }

  /* ================= Hình học ================= */
  function geom(ref) {
    var o = O(ref.id); if (!o) return null;
    function pp(i) { var p = P(o.p[i]); return p && p.ok ? p : null; }
    var a, b, d, g, n, e;
    switch (o.type) {
      case 'seg': a = pp(0); b = pp(1);
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: a, d: d, lo: 0, hi: len(V(a, b)), a: a, b: b, fin: true };
      case 'poly': n = o.p.length; e = ref.e || 0; a = pp(e); b = pp((e + 1) % n);
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: a, d: d, lo: 0, hi: len(V(a, b)), a: a, b: b, fin: true };
      case 'line': a = pp(0); b = pp(1);
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: a, d: d, lo: -Infinity, hi: Infinity };
      case 'perpline': a = pp(0); g = geom(o.o[0]);
        if (!a || !g || g.k !== 'l') return null;
        return { k: 'l', p: a, d: { x: g.d.y, y: -g.d.x }, lo: -Infinity, hi: Infinity };
      case 'parline': a = pp(0); g = geom(o.o[0]);
        if (!a || !g || g.k !== 'l') return null;
        return { k: 'l', p: a, d: g.d, lo: -Infinity, hi: Infinity };
      case 'pbis': a = pp(0); b = pp(1);
        if (!a || !b) return null; d = unit(V(a, b)); if (!d) return null;
        return { k: 'l', p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: { x: d.y, y: -d.x }, lo: -Infinity, hi: Infinity };
      case 'circ': a = pp(0); b = pp(1);
        if (!a || !b) return null;
        return { k: 'c', c: a, r: len(V(a, b)) };
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
      var ok = true, a, b, c, g;
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
          if (g && g.k === 'l') { p.x = g.p.x + g.d.x * p.k; p.y = g.p.y + g.d.y * p.k; } else ok = false; break;
        case 'oncirc': g = geom(p.o[0]);
          if (g && g.k === 'c') { p.x = g.c.x + g.r * Math.cos(p.k); p.y = g.c.y + g.r * Math.sin(p.k); } else ok = false; break;
        case 'inter': var r = inter(p.o[0], p.o[1], p.k);
          if (r) { p.x = r.x; p.y = r.y; } else ok = false; break;
      }
      p.ok = ok;
    });
  }

  function isGlider(p) { return p.type === 'onseg' || p.type === 'online' || p.type === 'oncirc'; }

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

  /* ================= Hoàn tác ================= */
  function dump() { return JSON.stringify({ pts: M.pts, objs: M.objs, meas: M.meas, nid: M.nid, nname: M.nname }); }
  function snap() { var j = dump(); if (undoStack[undoStack.length - 1] !== j) { undoStack.push(j); if (undoStack.length > 60) undoStack.shift(); } }
  function undo() {
    var cur = dump(), j;
    while (undoStack.length) { j = undoStack.pop(); if (j !== cur) break; j = null; }
    if (!j) { say('Không còn thao tác để hoàn tác.'); return; }
    var o = JSON.parse(j); M.pts = o.pts; M.objs = o.objs; M.meas = o.meas; M.nid = o.nid; M.nname = o.nname;
    traces = {}; ui.pend = []; ui.drag = null; refresh();
  }

  /* ================= Hình nhanh ================= */
  function F(x, y) { return addPt({ type: 'free', x: x, y: y }); }
  function hid(o) { o.hidden = true; return addObj(o); }
  function poly(a) {
    /* đặt tên đỉnh theo đúng thứ tự đa giác: A, B, C, D... */
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
    ['△ Tam giác', function () { poly([F(5, 7.5), F(10.5, 7.5), F(7, 2.5)]); }],
    ['△ Tam giác đều', function () { ngonShape(3, 6, 7.5, 4); }],
    ['◺ Tam giác vuông', function () { var a = F(5, 7.5), b = F(10.5, 7.5), c = perpGlide(a, b, 3.5); poly([a, b, c]); }],
    ['△ Tam giác cân', function () {
      var a = F(5, 7.5), b = F(11, 7.5), l = hid({ type: 'pbis', p: [a.id, b.id] });
      var c = addPt({ type: 'online', o: [{ id: l.id }], k: 4.5 }); poly([a, b, c]);
    }],
    ['□ Hình vuông', function () { ngonShape(4, 6, 7.5, 4); }],
    ['▭ Hình chữ nhật', function () { var a = F(5, 7.5), b = F(11, 7.5), d = perpGlide(a, b, 3), c = sumPt(a, b, d); poly([a, b, c, d]); }],
    ['▱ Hình bình hành', function () { var a = F(5, 7.5), b = F(10, 7.5), d = F(6.5, 4), c = sumPt(a, b, d); poly([a, b, c, d]); }],
    ['◇ Hình thoi', function () {
      var a = F(5, 7.5), b = F(9, 7.5), ci = hid({ type: 'circ', p: [a.id, b.id] });
      var d = addPt({ type: 'oncirc', o: [{ id: ci.id }], k: -Math.PI / 3 }), c = sumPt(a, b, d); poly([a, b, c, d]);
    }],
    ['⏢ Hình thang', function () {
      var a = F(4.5, 7.5), b = F(11.5, 7.5), d = F(6, 4), l = lineAB(a, b), pl = hid({ type: 'parline', p: [d.id], o: [{ id: l.id }] });
      var c = addPt({ type: 'online', o: [{ id: pl.id }], k: 3.5 }); poly([a, b, c, d]);
    }],
    ['⬠ Ngũ giác đều', function () { ngonShape(5, 6.5, 8, 3); }],
    ['⬡ Lục giác đều', function () { ngonShape(6, 6.5, 8.5, 3); }],
    ['○ Đường tròn', function () { var o = F(8, 5), r = F(10.5, 5); addObj({ type: 'circ', p: [o.id, r.id] }); }]
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
    var best = null, bd = 17 / S;
    for (var i = M.pts.length - 1; i >= 0; i--) {
      var p = M.pts[i]; if (!p.ok) continue;
      var d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d <= bd) { best = p; bd = d; }
    }
    return best;
  }
  function hitObj(w, opt) {
    opt = opt || {}; var tol = 11 / S;
    for (var i = M.objs.length - 1; i >= 0; i--) {
      var o = M.objs[i]; if (o.hidden) continue;
      if (o.type === 'poly') {
        var pts = o.p.map(P); if (pts.some(function (p) { return !p || !p.ok; })) continue;
        for (var e = 0; e < pts.length; e++) {
          if (dseg(w.x, w.y, pts[e], pts[(e + 1) % pts.length]) <= tol) return { ref: { id: o.id, e: e }, o: o };
        }
        if (opt.interior && inPoly(w, pts)) return { ref: { id: o.id }, o: o };
        continue;
      }
      var g = geom({ id: o.id }); if (!g) continue;
      if (g.k === 'c') { if (!opt.lineOnly && Math.abs(len(V(g.c, w)) - g.r) <= tol) return { ref: { id: o.id }, o: o }; }
      else if (g.fin) { if (dseg(w.x, w.y, g.a, g.b) <= tol) return { ref: { id: o.id }, o: o }; }
      else if (Math.abs((w.x - g.p.x) * g.d.y - (w.y - g.p.y) * g.d.x) <= tol) return { ref: { id: o.id }, o: o };
    }
    return null;
  }

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
  }

  /* ================= Thao tác công cụ ================= */
  function pickPoint(w, create) {
    var h = hitPoint(w); if (h) return h;
    if (!create) return null;
    return addPt({ type: 'free', x: clamp(snapV(w.x), 0, WU), y: clamp(snapV(w.y), 0, HU) });
  }
  function glideOn(ref, w) {
    var o = O(ref.id), g = geom(ref); if (!g) return null;
    if (g.k === 'c') return addPt({ type: 'oncirc', o: [{ id: ref.id, e: ref.e }], k: Math.atan2(w.y - g.c.y, w.x - g.c.x) });
    if (g.fin) {
      var t = ((w.x - g.a.x) * (g.b.x - g.a.x) + (w.y - g.a.y) * (g.b.y - g.a.y)) / Math.pow(len(V(g.a, g.b)), 2);
      return addPt({ type: 'onseg', o: [{ id: ref.id, e: ref.e }], k: clamp(t, 0, 1) });
    }
    return addPt({ type: 'online', o: [{ id: ref.id }], k: (w.x - g.p.x) * g.d.x + (w.y - g.p.y) * g.d.y });
  }
  function segEnds(ref) {
    var o = O(ref.id); if (!o) return null;
    if (o.type === 'poly') { var n = o.p.length, e = ref.e || 0; return [P(o.p[e]), P(o.p[(e + 1) % n])]; }
    return [P(o.p[0]), P(o.p[1])];
  }
  function sameRef(a, b) { return a.id === b.id && (a.e || 0) === (b.e || 0); }

  function toolDown(w) {
    var t = ui.tool, h, ho, p, a, b;
    snap();
    if (t === 'point') {
      h = hitPoint(w); if (h) { say('Đã có điểm ' + h.name + ' ở đó.'); return; }
      ho = hitObj(w);
      if (ho) { p = glideOn(ho.ref, w); say('Điểm ' + p.name + ' chạy trên đối tượng. Dùng công cụ "Điểm chạy" để cho chuyển động.'); }
      else addPt({ type: 'free', x: clamp(snapV(w.x), 0, WU), y: clamp(snapV(w.y), 0, HU) });
      return;
    }
    if (t === 'seg' || t === 'line' || t === 'circ' || t === 'mid' || t === 'pbis') {
      p = pickPoint(w, true);
      if (ui.pend.length && ui.pend[0].id === p.id) return;
      ui.pend.push(p);
      if (ui.pend.length === 2) {
        a = ui.pend[0]; b = ui.pend[1];
        if (t === 'mid') addPt({ type: 'mid', p: [a.id, b.id] });
        else addObj({ type: t, p: [a.id, b.id] });
        ui.pend = [];
      }
      hint(); return;
    }
    if (t === 'poly') {
      p = pickPoint(w, true);
      if (ui.pend.length >= 3 && ui.pend[0].id === p.id) {
        addObj({ type: 'poly', p: ui.pend.map(function (q) { return q.id; }) }); ui.pend = [];
      } else if (!ui.pend.some(function (q) { return q.id === p.id; })) ui.pend.push(p);
      hint(); return;
    }
    if (t === 'perp' || t === 'par') {
      h = hitPoint(w); ho = hitObj(w, { lineOnly: true });
      var item = h ? { k: 'pt', id: h.id } : ho ? { k: 'ln', ref: ho.ref } : { k: 'pt', id: pickPoint(w, true).id };
      if (!ui.pend.length || ui.pend[0].k === item.k) ui.pend = [item];
      else {
        var pt = item.k === 'pt' ? item : ui.pend[0], ln = item.k === 'ln' ? item : ui.pend[0];
        addObj({ type: t === 'perp' ? 'perpline' : 'parline', p: [pt.id], o: [ln.ref] }); ui.pend = [];
      }
      hint(); return;
    }
    if (t === 'inter') {
      ho = hitObj(w); if (!ho) { say('Hãy chạm đúng lên một đoạn, đường, đường tròn hoặc cạnh đa giác.'); return; }
      if (ui.pend.length && sameRef(ui.pend[0], ho.ref)) return;
      ui.pend.push(ho.ref);
      if (ui.pend.length === 2) {
        var r1 = ui.pend[0], r2 = ui.pend[1], made = 0;
        [0, 1].forEach(function (k) { if (inter(r1, r2, k) && !(k === 1 && geom(r1).k === 'l' && geom(r2).k === 'l')) { addPt({ type: 'inter', o: [r1, r2], k: k }); made++; } });
        if (!made) say('Hai đối tượng này không cắt nhau (trong phạm vi hiện tại).');
        ui.pend = [];
      }
      hint(); return;
    }
    if (t === 'meas') {
      h = hitPoint(w);
      if (h) {
        if (ui.pend.length && ui.pend[0].id === undefined) ui.pend = [];
        if (!ui.pend.some(function (q) { return q.id === h.id; })) ui.pend.push(h);
        if (ui.pend.length === 3) { M.meas.push({ id: M.nid++, type: 'ang', p: ui.pend.map(function (q) { return q.id; }) }); ui.pend = []; }
        hint(); return;
      }
      ho = hitObj(w, { interior: true });
      if (!ho) { say('Chạm vào đoạn, đa giác, đường tròn hoặc chọn 3 điểm để đo góc.'); return; }
      ui.pend = [];
      var o = ho.o;
      if (o.type === 'circ') {
        M.meas.push({ id: M.nid++, type: 'rad', o: [ho.ref] }, { id: M.nid++, type: 'circ', o: [ho.ref] }, { id: M.nid++, type: 'carea', o: [ho.ref] });
      } else if (o.type === 'poly' && ho.ref.e === undefined) {
        M.meas.push({ id: M.nid++, type: 'area', o: [ho.ref] }, { id: M.nid++, type: 'per', o: [ho.ref] });
      } else if (geom(ho.ref) && geom(ho.ref).fin) {
        M.meas.push({ id: M.nid++, type: 'len', o: [ho.ref] });
      } else say('Đường thẳng không đo được độ dài.');
      return;
    }
    if (t === 'anim') {
      h = hitPoint(w);
      if (!h) return;
      if (!isGlider(h)) { say('Điểm ' + h.name + ' không chạy được. Hãy dùng công cụ Điểm, chạm lên một đoạn/đường/đường tròn để tạo điểm xanh lá.'); return; }
      h.anim = !h.anim;
      if (h.anim) { ui.playing = true; startLoop(); }
      updPlay(); say(h.anim ? 'Điểm ' + h.name + ' sẽ chuyển động.' : 'Đã dừng điểm ' + h.name + '.');
      return;
    }
    if (t === 'trace') {
      h = hitPoint(w); if (!h) return;
      h.trace = !h.trace; traces[h.id] = [];
      say(h.trace ? 'Đã bật vệt cho điểm ' + h.name + '. Kéo điểm hoặc cho chạy để thấy vệt.' : 'Đã tắt vệt điểm ' + h.name + '.');
      return;
    }
    if (t === 'del') {
      h = hitPoint(w);
      if (h) { var dp = {}; dp[h.id] = 1; cascade(dp, {}); return; }
      ho = hitObj(w, { interior: true });
      if (ho) { var dobj = {}; dobj[ho.o.id] = 1; cascade({}, dobj); }
      return;
    }
  }

  function selDown(w) {
    var h = hitPoint(w), ho, list, seen;
    snap();
    if (h) {
      if (h.type === 'free' || isGlider(h)) { ui.drag = { kind: 'pt', p: h }; return; }
      list = []; freeAnc(h.id, list, {});
      if (list.length) startGroup(list, w); return;
    }
    ho = hitObj(w, { interior: true });
    if (ho) { list = []; seen = {}; objAnc(ho.o.id, list, seen); if (list.length) startGroup(list, w); }
  }
  function startGroup(list, w) {
    ui.drag = { kind: 'grp', list: list.map(function (p) { return { p: p, x: p.x, y: p.y }; }), sx: w.x, sy: w.y };
  }
  function dragMove(w) {
    var d = ui.drag; if (!d) return;
    if (d.kind === 'grp') {
      var dx = w.x - d.sx, dy = w.y - d.sy;
      if (ui.snap) { dx = Math.round(dx / STEP) * STEP; dy = Math.round(dy / STEP) * STEP; }
      d.list.forEach(function (it) { it.p.x = clamp(it.x + dx, -1, WU + 1); it.p.y = clamp(it.y + dy, -1, HU + 1); });
      return;
    }
    var p = d.p, g;
    if (p.type === 'free') { p.x = clamp(snapV(w.x), 0, WU); p.y = clamp(snapV(w.y), 0, HU); }
    else if (p.type === 'onseg') {
      g = geom(p.o[0]); if (g) p.k = clamp(((w.x - g.a.x) * (g.b.x - g.a.x) + (w.y - g.a.y) * (g.b.y - g.a.y)) / Math.pow(len(V(g.a, g.b)), 2), 0, 1);
    } else if (p.type === 'online') {
      g = geom(p.o[0]); if (g && g.k === 'l') p.k = (w.x - g.p.x) * g.d.x + (w.y - g.p.y) * g.d.y;
    } else if (p.type === 'oncirc') {
      g = geom(p.o[0]); if (g && g.k === 'c') p.k = Math.atan2(w.y - g.c.y, w.x - g.c.x);
    }
  }

  /* ================= Chuyển động ================= */
  var last = 0, raf = 0;
  function stepPt(p, dt) {
    var v = ui.speed, g;
    if (p.type === 'onseg') {
      g = geom(p.o[0]); if (!g) return; var L = g.hi; if (L < 1e-6) return;
      p.k += p.dir * (v * 2.5 / L) * dt;
      if (p.k > 1) { p.k = 1; p.dir = -1; } else if (p.k < 0) { p.k = 0; p.dir = 1; }
    } else if (p.type === 'online') {
      p.k += p.dir * v * 2.5 * dt;
      if (p.k > 8) { p.k = 8; p.dir = -1; } else if (p.k < -8) { p.k = -8; p.dir = 1; }
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
    var a, b, c, g, e, pts, i, s, cx, cy, A, B, C;
    if (m.type === 'ang') {
      A = P(m.p[0]); B = P(m.p[1]); C = P(m.p[2]);
      if (!(A && B && C && A.ok && B.ok && C.ok)) return null;
      var u = V(B, A), v = V(B, C), l = len(u) * len(v); if (l < 1e-9) return null;
      var ang = Math.acos(clamp((u.x * v.x + u.y * v.y) / l, -1, 1)) * 180 / Math.PI;
      return { txt: '∠' + A.name + B.name + C.name + ' = ' + fmt(ang) + '°', cv: fmt(ang) + '°', x: B.x, y: B.y, dx: 14, dy: -14 };
    }
    var ref = m.o[0], o = O(ref.id); if (!o) return null;
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
        : { txt: 'Chu vi ' + s + ' = ' + fmt(pr), cv: 'P=' + fmt(pr), x: cx, y: cy, dx: 0, dy: 16 };
    }
    g = geom(ref); if (!g || g.k !== 'c') return null;
    var nm = P(o.p[0]).name, r = g.r;
    if (m.type === 'rad') return { txt: 'Bán kính (' + nm + ') = ' + fmt(r), cv: 'r=' + fmt(r), x: g.c.x, y: g.c.y, dx: 6, dy: -8 };
    if (m.type === 'circ') return { txt: 'Chu vi đường tròn (' + nm + ') = ' + fmt(2 * Math.PI * r), cv: '', x: g.c.x, y: g.c.y, dx: 0, dy: 0 };
    return { txt: 'Diện tích hình tròn (' + nm + ') = ' + fmt(Math.PI * r * r), cv: '', x: g.c.x, y: g.c.y, dx: 0, dy: 0 };
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
  function px(v) { return +(v * S).toFixed(2); }
  function draw(theme) {
    var C = PAL[theme || 'dark'], s = '', i;
    var W = SW, H = SH, FONT = 'font-family="system-ui,Arial,sans-serif"';
    if (ui.grid) {
      var d = '';
      for (i = 0; i <= WU; i++) d += 'M' + px(i) + ' 0V' + H;
      for (i = 0; i <= HU; i++) d += 'M0 ' + px(i) + 'H' + W;
      s += '<path d="' + d + '" stroke="' + C.grid + '" stroke-width="1" fill="none"/>';
    }
    M.objs.forEach(function (o) {
      if (o.hidden || o.type !== 'poly') return;
      var pts = o.p.map(P); if (pts.some(function (p) { return !p || !p.ok; })) return;
      s += '<polygon points="' + pts.map(function (p) { return px(p.x) + ',' + px(p.y); }).join(' ') + '" fill="' + C.fill + '" stroke="' + C.line + '" stroke-width="2.2" stroke-linejoin="round"/>';
    });
    M.objs.forEach(function (o) {
      if (o.hidden || o.type === 'poly') return;
      var g = geom({ id: o.id }); if (!g) return;
      if (g.k === 'c') { s += '<circle cx="' + px(g.c.x) + '" cy="' + px(g.c.y) + '" r="' + px(g.r) + '" fill="none" stroke="' + C.line + '" stroke-width="2.2"/>'; return; }
      var x1, y1, x2, y2, big = 4000;
      if (g.fin) { x1 = px(g.a.x); y1 = px(g.a.y); x2 = px(g.b.x); y2 = px(g.b.y); }
      else { x1 = px(g.p.x) - g.d.x * big; y1 = px(g.p.y) - g.d.y * big; x2 = px(g.p.x) + g.d.x * big; y2 = px(g.p.y) + g.d.y * big; }
      var dash = (o.type === 'perpline' || o.type === 'parline' || o.type === 'pbis') ? ' stroke-dasharray="7 5"' : '';
      s += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + C.line + '" stroke-width="2.2" stroke-linecap="round"' + dash + '/>';
    });
    M.pts.forEach(function (p) {
      var t = traces[p.id]; if (!p.trace || !t || t.length < 2) return;
      s += '<polyline points="' + t.map(function (q) { return px(q[0]) + ',' + px(q[1]); }).join(' ') + '" fill="none" stroke="' + C.trace + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>';
    });
    if (ui.meas || theme === 'light') {
      M.meas.forEach(function (m) {
        var r = measEval(m); if (!r || !r.cv) return;
        s += '<text x="' + (px(r.x) + r.dx) + '" y="' + (px(r.y) + r.dy) + '" text-anchor="middle" font-size="13" font-weight="700" ' + FONT + ' fill="' + C.meas + '" stroke="' + C.bg + '" stroke-width="3" paint-order="stroke">' + r.cv + '</text>';
      });
    }
    if (theme !== 'light' && ui.pend.length) {
      var lastp = ui.pend[ui.pend.length - 1];
      if (lastp && lastp.x !== undefined && ui.ptr && (ui.tool === 'seg' || ui.tool === 'line' || ui.tool === 'circ' || ui.tool === 'poly' || ui.tool === 'mid' || ui.tool === 'pbis')) {
        s += '<line x1="' + px(lastp.x) + '" y1="' + px(lastp.y) + '" x2="' + px(ui.ptr.x) + '" y2="' + px(ui.ptr.y) + '" stroke="' + C.pend + '" stroke-width="1.5" stroke-dasharray="5 5" opacity=".7"/>';
      }
      ui.pend.forEach(function (q) {
        if (q.x === undefined) return;
        s += '<circle cx="' + px(q.x) + '" cy="' + px(q.y) + '" r="11" fill="none" stroke="' + C.pend + '" stroke-width="2" stroke-dasharray="3 3"/>';
      });
    }
    M.pts.forEach(function (p) {
      if (!p.ok) return;
      var col = p.type === 'free' ? C.free : isGlider(p) ? C.glide : C.dep, x = px(p.x), y = px(p.y);
      if (p.anim) s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="none" stroke="' + C.glide + '" stroke-width="1.8" stroke-dasharray="3 3"/>';
      if (p.trace) s += '<circle cx="' + x + '" cy="' + y + '" r="9.5" fill="none" stroke="' + C.trace + '" stroke-width="1.5"/>';
      s += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + col + '" stroke="' + C.bg + '" stroke-width="1.5"/>';
      if (ui.names) s += '<text x="' + (x + 9) + '" y="' + (y - 9) + '" font-size="15" font-weight="700" ' + FONT + ' fill="' + C.txt + '" stroke="' + C.bg + '" stroke-width="3" paint-order="stroke">' + p.name + '</text>';
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
    S = SW / WU; return true;
  }
  function refresh() {
    if (!resize()) return;
    compute(); recordTraces();
    svg.innerHTML = draw('dark');
    updMeas();
  }

  /* ================= Gợi ý & nút công cụ ================= */
  function hint() {
    var t = TOOLS.filter(function (x) { return x[0] === ui.tool; })[0], msg = t ? t[3] : '';
    if (ui.pend.length) {
      if (ui.tool === 'meas') msg = 'Đo góc: đã chọn ' + ui.pend.length + '/3 điểm (điểm thứ 2 là đỉnh góc).';
      else if (ui.tool === 'poly') msg = 'Đã chọn ' + ui.pend.length + ' đỉnh. Chạm lại đỉnh đầu để khép kín.';
      else msg = 'Đã chọn 1/2. Chạm tiếp để hoàn thành.';
    }
    elStatus.textContent = msg;
  }
  function setTool(id) {
    ui.tool = id; ui.pend = [];
    Array.prototype.forEach.call(elTools.children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === id); });
    hint(); refresh();
  }
  TOOLS.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vh-b'; b.setAttribute('data-t', t[0]);
    b.innerHTML = '<i>' + t[1] + '</i><span>' + t[2] + '</span>';
    b.addEventListener('click', function () { setTool(t[0]); });
    elTools.appendChild(b);
  });
  SHAPES.forEach(function (sh) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vh-chip'; b.textContent = sh[0];
    b.addEventListener('click', function () { snap(); sh[1](); setTool('select'); say('Đã thêm ' + sh[0].replace(/^\S+\s/, '') + '. Hãy kéo các điểm để biến đổi hình.'); refresh(); });
    elShapes.appendChild(b);
  });

  /* ================= Sự kiện vùng vẽ ================= */
  function wpos(e) {
    var r = svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * WU, y: (e.clientY - r.top) / r.height * HU };
  }
  svg.addEventListener('pointerdown', function (e) {
    if (!resize()) return;
    e.preventDefault();
    try { svg.setPointerCapture(e.pointerId); } catch (x) { }
    var w = wpos(e); ui.ptr = w;
    compute();
    if (ui.tool === 'select') selDown(w); else toolDown(w);
    refresh();
  });
  svg.addEventListener('pointermove', function (e) {
    if (!resize()) return;
    var w = wpos(e); ui.ptr = w;
    if (ui.drag) { dragMove(w); refresh(); }
    else if (ui.pend.length && e.pointerType === 'mouse') refresh();
  });
  function up(e) { ui.drag = null; if (e && e.pointerType && e.pointerType !== 'mouse') ui.ptr = null; refresh(); }
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('pointerleave', function (e) { if (!ui.drag && e.pointerType === 'mouse') { ui.ptr = null; refresh(); } });

  /* ================= Điều khiển ================= */
  elPlay.addEventListener('click', function () {
    if (!ui.playing) {
      if (!M.pts.some(function (p) { return p.anim; })) { say('Chưa có điểm nào được đặt chạy. Dùng công cụ "Điểm chạy" rồi chạm vào điểm xanh lá.'); return; }
      ui.playing = true; startLoop();
    } else ui.playing = false;
    updPlay();
  });
  root.querySelector('#vhSpeed').addEventListener('input', function () { ui.speed = +this.value; });
  root.querySelector('#vhUndo').addEventListener('click', undo);
  root.querySelector('#vhClrTr').addEventListener('click', function () { traces = {}; refresh(); });
  root.querySelector('#vhClear').addEventListener('click', function () {
    if (!M.pts.length && !M.objs.length) return;
    if (!confirm('Xóa toàn bộ hình đang vẽ?')) return;
    snap(); M.pts = []; M.objs = []; M.meas = []; M.nname = 0; traces = {}; ui.pend = []; ui.playing = false; updPlay(); refresh();
  });
  root.querySelector('#vhGrid').addEventListener('change', function () { ui.grid = this.checked; refresh(); });
  root.querySelector('#vhSnap').addEventListener('change', function () { ui.snap = this.checked; });
  root.querySelector('#vhNames').addEventListener('change', function () { ui.names = this.checked; refresh(); });
  root.querySelector('#vhMeasShow').addEventListener('change', function () { ui.meas = this.checked; refresh(); });
  elMeas.addEventListener('click', function (e) {
    var id = e.target && e.target.getAttribute && e.target.getAttribute('data-m'); if (!id) return;
    snap(); M.meas = M.meas.filter(function (m) { return String(m.id) !== id; }); refresh();
  });

  function exportPng() {
    if (!resize()) return;
    compute();
    var W = SW, H = SH, k = 2, bak = ui.meas, bakPend = ui.pend;
    ui.pend = [];
    var inner = draw('light'); ui.pend = bakPend; ui.meas = bak;
    var xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W * k + '" height="' + H * k + '" viewBox="0 0 ' + W + ' ' + H + '"><rect width="100%" height="100%" fill="#ffffff"/>' + inner + '</svg>';
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
      cv.getContext('2d').drawImage(img, 0, 0);
      cv.toBlob(function (b) {
        if (!b) { say('Không xuất được ảnh trên trình duyệt này.'); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'hinh-ve.png';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        say('Đã lưu ảnh hinh-ve.png (nền trắng, dùng để chèn vào Word/PowerPoint).');
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
  setTool('select');
  refresh();
  window.__veHinh = { M: M, ui: ui, refresh: refresh, compute: compute, SHAPES: SHAPES, setTool: setTool, undo: undo, measEval: measEval, inter: inter };
})();
