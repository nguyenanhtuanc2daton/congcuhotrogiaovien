/* =====================================================================
   GAMES — thêm tab "Trò chơi" (Sudoku, Cờ Caro, Cờ vua, Cờ tướng, Pikachu, Chém hoa quả) vào index.html
   - Không sửa code cũ: tự chèn nút tab + panel + thẻ ở màn chào, tự đánh số tab.
   - Chạy hoàn toàn trên trình duyệt, không cần mạng, không gửi dữ liệu đi đâu.
   - Nạp SAU prompt-hub.js:  <script src="games.js"></script>
   - Thêm trò mới: viết hàm initXxx(container) rồi đăng ký trong GAMES ở cuối file.
   ===================================================================== */
(function () {
  'use strict';

  /* =================================================================
     PHẦN 1 — LOGIC THUẦN (không đụng DOM, có thể kiểm thử riêng)
     ================================================================= */
  var POP = []; for (var pi = 0; pi < 1024; pi++) { var pc = 0, px = pi; while (px) { pc += px & 1; px >>= 1; } POP[pi] = pc; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[rnd(a.length)]; }
  function ROW(i) { return (i / 9) | 0; }
  function COL(i) { return i % 9; }
  function BOX(i) { return ((i / 27) | 0) * 3 + (((i % 9) / 3) | 0); }
  var UNITS = (function () {
    var u = [], r, c, b, k;
    for (r = 0; r < 9; r++) { var a = []; for (c = 0; c < 9; c++) a.push(r * 9 + c); u.push(a); }
    for (c = 0; c < 9; c++) { var a2 = []; for (r = 0; r < 9; r++) a2.push(r * 9 + c); u.push(a2); }
    for (b = 0; b < 9; b++) { var a3 = []; for (k = 0; k < 9; k++) a3.push(((b / 3) | 0) * 27 + (b % 3) * 3 + ((k / 3) | 0) * 9 + (k % 3)); u.push(a3); }
    return u;
  })();

  /* ---- Sudoku: bộ giải quay lui có chọn ô ít khả năng nhất (MRV) ---- */
  function solveGrid(g, limit, randomize) {
    var rows = new Int16Array(9), cols = new Int16Array(9), boxes = new Int16Array(9), i;
    for (i = 0; i < 81; i++) if (g[i]) { var bt = 1 << g[i]; rows[ROW(i)] |= bt; cols[COL(i)] |= bt; boxes[BOX(i)] |= bt; }
    var a = g.slice(), count = 0, sol = null;
    (function rec() {
      var best = -1, bm = 0, bc = 10, k;
      for (k = 0; k < 81; k++) {
        if (a[k]) continue;
        var m = 0x3FE & ~(rows[ROW(k)] | cols[COL(k)] | boxes[BOX(k)]), c = POP[m];
        if (c < bc) { bc = c; best = k; bm = m; if (c < 2) break; }
      }
      if (best < 0) { count++; if (!sol) sol = a.slice(); return count >= limit; }
      if (bc === 0) return false;
      var r = ROW(best), cc = COL(best), b = BOX(best), ds = [], d;
      for (d = 1; d <= 9; d++) if (bm & (1 << d)) ds.push(d);
      if (randomize) shuffle(ds);
      for (var q = 0; q < ds.length; q++) {
        d = ds[q]; var bit = 1 << d;
        a[best] = d; rows[r] |= bit; cols[cc] |= bit; boxes[b] |= bit;
        var stop = rec();
        a[best] = 0; rows[r] &= ~bit; cols[cc] &= ~bit; boxes[b] &= ~bit;
        if (stop) return true;
      }
      return false;
    })();
    return { count: count, sol: sol };
  }

  /* ---- Kiểm tra đề có giải được chỉ bằng "ô duy nhất" (naked/hidden single) hay không → đo độ khó thật ---- */
  function solvableBySingles(g) {
    var a = g.slice(), rows = new Int16Array(9), cols = new Int16Array(9), boxes = new Int16Array(9), i;
    for (i = 0; i < 81; i++) if (a[i]) { var bt = 1 << a[i]; rows[ROW(i)] |= bt; cols[COL(i)] |= bt; boxes[BOX(i)] |= bt; }
    function cand(k) { return 0x3FE & ~(rows[ROW(k)] | cols[COL(k)] | boxes[BOX(k)]); }
    function put(k, d) { var bit = 1 << d; a[k] = d; rows[ROW(k)] |= bit; cols[COL(k)] |= bit; boxes[BOX(k)] |= bit; }
    var progress = true;
    while (progress) {
      progress = false;
      for (i = 0; i < 81; i++) {
        if (a[i]) continue;
        var m = cand(i);
        if (POP[m] === 1) { for (var d = 1; d <= 9; d++) if (m & (1 << d)) { put(i, d); break; } progress = true; }
        else if (m === 0) return false;
      }
      for (var u = 0; u < 27; u++) {
        var unit = UNITS[u];
        for (var dd = 1; dd <= 9; dd++) {
          var bit2 = 1 << dd, has = false, cnt = 0, pos = -1, t;
          for (t = 0; t < 9; t++) { var cell = unit[t]; if (a[cell] === dd) { has = true; break; } if (!a[cell] && (cand(cell) & bit2)) { cnt++; pos = cell; } }
          if (!has && cnt === 1) { put(pos, dd); progress = true; }
        }
      }
    }
    for (i = 0; i < 81; i++) if (!a[i]) return false;
    return true;
  }

  var SD_LEVELS = [
    { name: 'Rất dễ', givens: 46, singles: true },
    { name: 'Dễ', givens: 38, singles: true },
    { name: 'Vừa', givens: 32, singles: true },
    { name: 'Khó', givens: 27, singles: false, hard: true },
    { name: 'Chuyên gia', givens: 23, singles: false, hard: true }
  ];

  /* Sinh đề: lấp lưới đầy ngẫu nhiên, rồi bỏ dần từng ô miễn là đề vẫn có ĐÚNG MỘT nghiệm
     (mức 1–3 còn buộc phải giải được bằng kỹ thuật "ô duy nhất"; mức 5 cố tạo đề cần kỹ thuật cao hơn). */
  function generateSudoku(level) {
    var L = SD_LEVELS[level], res = null;
    for (var attempt = 0; attempt < (L.hard ? 12 : 1); attempt++) {
      var full = solveGrid(new Array(81).fill(0), 1, true).sol, p = full.slice(), givens = 81, order = shuffle(Array.apply(null, { length: 81 }).map(function (_, k) { return k; }));
      for (var q = 0; q < order.length; q++) {
        if (givens <= L.givens) break;
        var i = order[q], v = p[i]; p[i] = 0;
        if (solveGrid(p, 2, false).count !== 1 || (L.singles && !solvableBySingles(p))) { p[i] = v; continue; }
        givens--;
      }
      res = { puzzle: p.slice(), solution: full, givens: givens };
      if (!L.hard || !solvableBySingles(p)) break;
    }
    return res;
  }

  /* ---- Cờ Caro: bàn N×N, X đi trước. Thắng khi có ≥5 quân liên tiếp
          (tuỳ chọn "chặn 2 đầu": hàng bị đối phương chặn cả hai đầu thì không tính thắng). ---- */
  function CaroEngine(N, rule) {
    var B = new Int8Array(N * N), stones = 0, DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]], W = [0, 1, 10, 120, 2500, 1000000];
    var WIN = 1e7, TO = {}, nodes = 0, deadline = 0, eng = { N: N, B: B, rule: !!rule };
    function inb(x, y) { return x >= 0 && x < N && y >= 0 && y < N; }
    eng.place = function (i, p) { B[i] = p; stones++; };
    eng.unplace = function (i) { B[i] = 0; stones--; };
    eng.count = function () { return stones; };

    // Quân vừa đặt ở ô i (màu p): trả về mảng ô của hàng thắng hoặc null
    eng.winAt = function (i, p) {
      var x = i % N, y = (i / N) | 0;
      for (var d = 0; d < 4; d++) {
        var dx = DIRS[d][0], dy = DIRS[d][1], cells = [i], fx = x + dx, fy = y + dy;
        while (inb(fx, fy) && B[fy * N + fx] === p) { cells.push(fy * N + fx); fx += dx; fy += dy; }
        var endF = inb(fx, fy) ? B[fy * N + fx] : 0, bx = x - dx, by = y - dy;
        while (inb(bx, by) && B[by * N + bx] === p) { cells.unshift(by * N + bx); bx -= dx; by -= dy; }
        var endB = inb(bx, by) ? B[by * N + bx] : 0;
        if (cells.length >= 5) {
          if (eng.rule && endF === 3 - p && endB === 3 - p) continue;
          return cells;
        }
      }
      return null;
    };

    // Điểm của một ô nếu p đặt vào: cộng điểm các "cửa sổ 5 ô" chứa ô đó và không có quân đối phương
    function cellScore(i, p) {
      var x = i % N, y = (i / N) | 0, o = 3 - p, s = 0;
      for (var d = 0; d < 4; d++) {
        var dx = DIRS[d][0], dy = DIRS[d][1];
        for (var k = 0; k < 5; k++) {
          var sx = x - k * dx, sy = y - k * dy, ex = sx + 4 * dx, ey = sy + 4 * dy;
          if (!inb(sx, sy) || !inb(ex, ey)) continue;
          var mine = 0, blocked = false;
          for (var t = 0; t < 5; t++) {
            var cx = sx + t * dx, cy = sy + t * dy, v = B[cy * N + cx];
            if (v === o) { blocked = true; break; }
            if (v === p || (cx === x && cy === y)) mine++;
          }
          if (!blocked) s += W[mine];
        }
      }
      return s;
    }
    // Đánh giá toàn bàn theo góc nhìn của p (p đang đến lượt)
    function evalBoard(p) {
      var o = 3 - p, sp = 0, so = 0;
      for (var d = 0; d < 4; d++) {
        var dx = DIRS[d][0], dy = DIRS[d][1], step = dy * N + dx;
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          if (!inb(x + 4 * dx, y + 4 * dy)) continue;
          var a = 0, b = 0, idx = y * N + x;
          for (var t = 0; t < 5; t++) { var v = B[idx]; if (v === p) a++; else if (v === o) b++; idx += step; }
          if (a && b) continue;
          if (a) { if (a === 4) return WIN / 2; sp += W[a]; } else if (b) so += W[b];
        }
      }
      return sp - so * 1.1;
    }
    function genCands() {
      if (!stones) return [(N >> 1) * N + (N >> 1)];
      var mark = new Uint8Array(N * N), out = [];
      for (var i = 0; i < N * N; i++) if (B[i]) {
        var x = i % N, y = (i / N) | 0;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
          var nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue;
          var j = ny * N + nx; if (!B[j] && !mark[j]) { mark[j] = 1; out.push(j); }
        }
      }
      return out;
    }
    function ordered(p, K) {
      var c = genCands(), o = 3 - p, sc = [];
      for (var q = 0; q < c.length; q++) sc.push([cellScore(c[q], p) + cellScore(c[q], o) * 0.95, c[q]]);
      sc.sort(function (a, b) { return b[0] - a[0]; });
      return K ? sc.slice(0, K) : sc;
    }
    function node(d, alpha, beta, p, K) {
      if ((++nodes & 63) === 0 && performance.now() > deadline) throw TO;
      var o = 3 - p, list = null, q, i;
      if (d === 0) return evalBoard(p);
      list = ordered(p, K);
      if (!list.length) return 0;
      for (q = 0; q < list.length; q++) { i = list[q][1]; B[i] = p; var w = eng.winAt(i, p); B[i] = 0; if (w) return WIN + d; }
      var best = -Infinity;
      for (q = 0; q < list.length; q++) {
        i = list[q][1]; B[i] = p;
        var v = -node(d - 1, -beta, -alpha, o, Math.max(6, K - 2));
        B[i] = 0;
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }
    function rootSearch(p, d, K, noise) {
      var list = ordered(p, K), best = null, alpha = -Infinity;
      for (var q = 0; q < list.length; q++) {
        var i = list[q][1], v;
        B[i] = p;
        if (eng.winAt(i, p)) v = WIN * 2;
        else v = -node(d - 1, -Infinity, -alpha, 3 - p, Math.max(6, K - 2));
        B[i] = 0;
        v += Math.random() * noise;
        if (!best || v > best.v) { best = { i: i, v: v }; if (v > alpha) alpha = v; }
      }
      return best;
    }
    function searchBest(p, dmax, K, ms, noise) {
      var snap = B.slice(), best = ordered(p, 1)[0][1];
      deadline = performance.now() + ms; nodes = 0;
      for (var d = 2; d <= dmax; d++) {
        try { var r = rootSearch(p, d, K, noise); if (r) best = r.i; if (r && r.v >= WIN) break; }
        catch (e) { B.set(snap); if (e !== TO) throw e; break; }
      }
      return best;
    }

    // Máy chọn nước đi. level 1..5 (càng cao càng mạnh). Trả về chỉ số ô, -1 nếu bàn đã đầy.
    eng.aiMove = function (level, me) {
      var opp = 3 - me, i, c = (N >> 1) * N + (N >> 1);
      if (!stones) { if (level <= 2) { var j = c + (rnd(3) - 1) * N + (rnd(3) - 1); return B[j] ? c : j; } return c; }
      var cands = genCands(); if (!cands.length) return -1;
      var winC = [], blkC = [];
      for (var q = 0; q < cands.length; q++) {
        i = cands[q];
        B[i] = me; if (eng.winAt(i, me)) winC.push(i);
        B[i] = opp; if (eng.winAt(i, opp)) blkC.push(i);
        B[i] = 0;
      }
      var pWin = [0.6, 1, 1, 1, 1][level - 1], pBlk = [0.35, 0.7, 1, 1, 1][level - 1];
      if (winC.length && Math.random() < pWin) return pick(winC);
      if (blkC.length && Math.random() < pBlk) return pick(blkC);
      if (level === 1) return pick(cands);
      if (level === 2) { var l2 = ordered(me, 6); return pick(l2)[1]; }
      if (level === 3) { var l3 = ordered(me, 2); return (l3.length > 1 && Math.random() < 0.15) ? l3[1][1] : l3[0][1]; }
      if (level === 4) return searchBest(me, 2, 10, 600, 8);
      return searchBest(me, 4, 10, 1000, 2);
    };
    return eng;
  }

  /* =================================================================
     BỘ TÌM KIẾM DÙNG CHUNG (alpha-beta + tìm sâu dần + tĩnh lặng) cho Cờ vua & Cờ tướng
     Bộ luật (game) cung cấp: gen, make, unmake, illegal, checked, evalStm, noMove, plies, rep
     ================================================================= */
  var MATE = 100000;
  function Searcher(g) {
    var TO = {}, nodes = 0, deadline = 0;
    function byO(a, b) { return b.o - a.o; }
    function tick() { if ((++nodes & 511) === 0 && performance.now() > deadline) throw TO; }
    function qs(alpha, beta, ply) {
      tick();
      var stand = g.evalStm(), ms, i, v;
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (ply > 12) return stand;
      ms = g.gen(true); ms.sort(byO);
      for (i = 0; i < ms.length; i++) {
        g.make(ms[i]);
        if (g.illegal()) { g.unmake(); continue; }
        v = -qs(-beta, -alpha, ply + 1); g.unmake();
        if (v >= beta) return v;
        if (v > alpha) alpha = v;
      }
      return alpha;
    }
    function ab(d, alpha, beta, ply) {
      tick();
      var chk = g.checked(), ms, n = 0, best = -Infinity, i, v;
      if (chk && ply < 12) d++;
      if (d <= 0) return qs(alpha, beta, ply);
      ms = g.gen(false); ms.sort(byO);
      for (i = 0; i < ms.length; i++) {
        g.make(ms[i]);
        if (g.illegal()) { g.unmake(); continue; }
        n++; v = -ab(d - 1, -beta, -alpha, ply + 1); g.unmake();
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return n ? best : g.noMove(chk, ply);
    }
    // dmax: độ sâu tối đa; ms: giới hạn thời gian; noise: độ "lơ đễnh" (cộng nhiễu vào điểm gốc)
    return function (dmax, ms, noise) {
      var base = g.plies(), root = [], all = g.gen(false), i, m, d, v, alpha, bestV, pick, pickV, nv, bestM;
      for (i = 0; i < all.length; i++) { g.make(all[i]); if (!g.illegal()) root.push(all[i]); g.unmake(); }
      if (!root.length) return null;
      if (root.length === 1) return root[0];
      root.sort(byO);
      for (i = 0; i < root.length; i++) root[i].pen = g.rep(root[i]) * 25;   // hạn chế đi lặp lại thế cờ cũ
      bestM = root[0]; deadline = performance.now() + ms; nodes = 0;
      for (d = 1; d <= dmax; d++) {
        alpha = -Infinity; bestV = -Infinity; pick = null; pickV = -Infinity;
        try {
          for (i = 0; i < root.length; i++) {
            m = root[i]; g.make(m);
            v = -ab(d - 1, -Infinity, -alpha, 1) - m.pen;
            g.unmake(); m.v = v;
            if (v > bestV) { bestV = v; alpha = v - noise; }
            nv = v + Math.random() * noise;
            if (nv > pickV) { pickV = nv; pick = m; }
          }
        } catch (e) { while (g.plies() > base) g.unmake(); if (e !== TO) throw e; break; }
        bestM = pick;
        root.sort(function (a, b) { return b.v - a.v; });
        if (bestV >= MATE - 200) break;
      }
      return bestM;
    };
  }

  /* =================================================================
     CỜ VUA — đủ luật: nhập thành, bắt tốt qua đường, phong cấp, chiếu hết, hết nước (hòa),
     hòa do lặp 3 lần / 50 nước / thiếu lực. Ô = hàng*8 + cột; hàng 0 là hàng 8 (phía Đen).
     Quân: 1 Tốt, 2 Mã, 3 Tượng, 4 Xe, 5 Hậu, 6 Vua; Trắng dương, Đen âm.
     ================================================================= */
  var CH_V = [0, 100, 320, 330, 500, 900, 0];
  var CH_PST = [null,
    [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20]
  ];
  var CH_KM = [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20];
  var CH_KE = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
  var CH_KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var CH_KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var CH_BD = [[-1, -1], [-1, 1], [1, -1], [1, 1]], CH_RD = [[-1, 0], [1, 0], [0, -1], [0, 1]], CH_QD = CH_BD.concat(CH_RD);
  var CH_RT = (function () { var a = new Int8Array(64).fill(15); a[60] = 12; a[63] = 14; a[56] = 13; a[4] = 3; a[7] = 11; a[0] = 7; return a; })();
  var CH_FIG = [['', '♟', '♞', '♝', '♜', '♛', '♚'], ['', '♙', '♘', '♗', '♖', '♕', '♔']];
  var CH_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var CH_LV = [null, { d: 0 }, { d: 1, ms: 200, n: 120 }, { d: 2, ms: 500, n: 35 }, { d: 3, ms: 900, n: 8 }, { d: 6, ms: 1600, n: 2 }];

  function ChessEngine(fen) {
    var B = new Int8Array(64), side = 1, castle = 15, ep = -1, half = 0, ks = [60, 4];
    var st = [], reps = {}, kst = [], mv = [], nm = [], eng = {};

    function sqn(s) { return 'abcdefgh'.charAt(s & 7) + (8 - (s >> 3)); }
    function key() { return Array.prototype.join.call(B, ',') + '|' + side + '|' + castle + '|' + ep; }

    function attacked(sq, by) {
      var r = sq >> 3, c = sq & 7, i, d, rr, cc, v, o;
      rr = r + by;   // Tốt phe "by" đứng ở hàng r+by (Trắng đi lên nên đứng phía dưới)
      if (rr >= 0 && rr < 8) {
        if (c > 0 && B[rr * 8 + c - 1] === by) return true;
        if (c < 7 && B[rr * 8 + c + 1] === by) return true;
      }
      for (i = 0; i < 8; i++) {
        o = CH_KN[i]; rr = r + o[0]; cc = c + o[1];
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && B[rr * 8 + cc] === by * 2) return true;
        o = CH_KG[i]; rr = r + o[0]; cc = c + o[1];
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && B[rr * 8 + cc] === by * 6) return true;
      }
      for (d = 0; d < 4; d++) {
        rr = r + CH_BD[d][0]; cc = c + CH_BD[d][1];
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { v = B[rr * 8 + cc]; if (v) { if (v === by * 3 || v === by * 5) return true; break; } rr += CH_BD[d][0]; cc += CH_BD[d][1]; }
        rr = r + CH_RD[d][0]; cc = c + CH_RD[d][1];
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { v = B[rr * 8 + cc]; if (v) { if (v === by * 4 || v === by * 5) return true; break; } rr += CH_RD[d][0]; cc += CH_RD[d][1]; }
      }
      return false;
    }

    function gen(caps) {
      var ms = [], s = side, sq, p, t, r, c, i, d, rr, cc, to, v, dirs, o, nr, prom, to2;
      function add(f, t2, pc, cap, pr, fl) {
        var m = { f: f, t: t2, pc: pc, cap: cap, pr: pr, fl: fl, o: 0 };
        if (cap) m.o = 1000 + CH_V[cap] * 10 - CH_V[pc];
        if (pr) m.o += CH_V[pr];
        ms.push(m);
      }
      function addProm(f, t2, cap) { if (caps) { add(f, t2, 1, cap, 5, 0); return; } add(f, t2, 1, cap, 5, 0); add(f, t2, 1, cap, 4, 0); add(f, t2, 1, cap, 3, 0); add(f, t2, 1, cap, 2, 0); }
      for (sq = 0; sq < 64; sq++) {
        p = B[sq]; if (!p || (p > 0) !== (s > 0)) continue;
        t = p > 0 ? p : -p; r = sq >> 3; c = sq & 7;
        if (t === 1) {
          nr = r - s;
          if (nr < 0 || nr > 7) continue;
          prom = nr === (s > 0 ? 0 : 7); to = nr * 8 + c;
          if (!B[to]) {
            if (prom) addProm(sq, to, 0);
            else if (!caps) { add(sq, to, 1, 0, 0, 0); to2 = to - 8 * s; if (r === (s > 0 ? 6 : 1) && !B[to2]) add(sq, to2, 1, 0, 0, 3); }
          }
          for (d = -1; d <= 1; d += 2) {
            cc = c + d; if (cc < 0 || cc > 7) continue;
            to = nr * 8 + cc; v = B[to];
            if (v && (v > 0) !== (s > 0)) { if (prom) addProm(sq, to, v > 0 ? v : -v); else add(sq, to, 1, v > 0 ? v : -v, 0, 0); }
            else if (to === ep) add(sq, to, 1, 1, 0, 1);
          }
        } else if (t === 2 || t === 6) {
          dirs = t === 2 ? CH_KN : CH_KG;
          for (i = 0; i < 8; i++) {
            rr = r + dirs[i][0]; cc = c + dirs[i][1];
            if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
            to = rr * 8 + cc; v = B[to];
            if (v) { if ((v > 0) !== (s > 0)) add(sq, to, t, v > 0 ? v : -v, 0, 0); } else if (!caps) add(sq, to, t, 0, 0, 0);
          }
          if (t === 6 && !caps) {
            if (s > 0 && sq === 60) {
              if ((castle & 1) && !B[61] && !B[62] && B[63] === 4 && !attacked(60, -1) && !attacked(61, -1) && !attacked(62, -1)) add(60, 62, 6, 0, 0, 2);
              if ((castle & 2) && !B[59] && !B[58] && !B[57] && B[56] === 4 && !attacked(60, -1) && !attacked(59, -1) && !attacked(58, -1)) add(60, 58, 6, 0, 0, 2);
            } else if (s < 0 && sq === 4) {
              if ((castle & 4) && !B[5] && !B[6] && B[7] === -4 && !attacked(4, 1) && !attacked(5, 1) && !attacked(6, 1)) add(4, 6, 6, 0, 0, 2);
              if ((castle & 8) && !B[3] && !B[2] && !B[1] && B[0] === -4 && !attacked(4, 1) && !attacked(3, 1) && !attacked(2, 1)) add(4, 2, 6, 0, 0, 2);
            }
          }
        } else {
          dirs = t === 3 ? CH_BD : (t === 4 ? CH_RD : CH_QD);
          for (i = 0; i < dirs.length; i++) {
            o = dirs[i]; rr = r + o[0]; cc = c + o[1];
            while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
              to = rr * 8 + cc; v = B[to];
              if (v) { if ((v > 0) !== (s > 0)) add(sq, to, t, v > 0 ? v : -v, 0, 0); break; }
              if (!caps) add(sq, to, t, 0, 0, 0);
              rr += o[0]; cc += o[1];
            }
          }
        }
      }
      return ms;
    }

    function make(m) {
      var p = B[m.f];
      st.push({ m: m, castle: castle, ep: ep, half: half });
      B[m.f] = 0;
      if (m.fl === 1) B[m.t + (side > 0 ? 8 : -8)] = 0;
      B[m.t] = m.pr ? side * m.pr : p;
      if (m.fl === 2) {
        if (m.t === 62) { B[61] = B[63]; B[63] = 0; } else if (m.t === 58) { B[59] = B[56]; B[56] = 0; }
        else if (m.t === 6) { B[5] = B[7]; B[7] = 0; } else { B[3] = B[0]; B[0] = 0; }
      }
      if (m.pc === 6) ks[side > 0 ? 0 : 1] = m.t;
      castle &= CH_RT[m.f] & CH_RT[m.t];
      ep = m.fl === 3 ? (m.f + m.t) >> 1 : -1;
      half = (m.pc === 1 || m.cap) ? 0 : half + 1;
      side = -side;
    }
    function unmake() {
      var u = st.pop(), m = u.m;
      side = -side; castle = u.castle; ep = u.ep; half = u.half;
      B[m.f] = side * m.pc;
      if (m.fl === 1) { B[m.t] = 0; B[m.t + (side > 0 ? 8 : -8)] = -side; }
      else B[m.t] = m.cap ? -side * m.cap : 0;
      if (m.fl === 2) {
        if (m.t === 62) { B[63] = B[61]; B[61] = 0; } else if (m.t === 58) { B[56] = B[59]; B[59] = 0; }
        else if (m.t === 6) { B[7] = B[5]; B[5] = 0; } else { B[0] = B[3]; B[3] = 0; }
      }
      if (m.pc === 6) ks[side > 0 ? 0 : 1] = m.f;
    }
    function illegal() { return attacked(ks[side > 0 ? 1 : 0], side); }
    function checked() { return attacked(ks[side > 0 ? 0 : 1], -side); }

    function evalStm() {
      var sc = 0, mat = 0, sq, p, t, idx, v, eg;
      for (sq = 0; sq < 64; sq++) { p = B[sq]; if (p) { t = p > 0 ? p : -p; if (t !== 1 && t !== 6) mat += CH_V[t]; } }
      eg = mat <= 2600;
      for (sq = 0; sq < 64; sq++) {
        p = B[sq]; if (!p) continue;
        t = p > 0 ? p : -p; idx = p > 0 ? sq : sq ^ 56;
        v = CH_V[t] + (t === 6 ? (eg ? CH_KE[idx] : CH_KM[idx]) : CH_PST[t][idx]);
        sc += p > 0 ? v : -v;
      }
      return side > 0 ? sc : -sc;
    }

    var g = {
      gen: gen, make: make, unmake: unmake, illegal: illegal, checked: checked, evalStm: evalStm,
      plies: function () { return st.length; },
      noMove: function (chk, ply) { return chk ? -MATE + ply : 0; },
      rep: function (m) { var c; make(m); c = reps[key()] || 0; unmake(); return c; }
    };
    var search = Searcher(g);

    function fmt(m) {
      if (m.fl === 2) return m.t > m.f ? 'O-O' : 'O-O-O';
      return CH_FIG[side > 0 ? 1 : 0][m.pc] + sqn(m.f) + (m.cap ? 'x' : '-') + sqn(m.t) + (m.pr ? '=' + 'xxNBRQ'.charAt(m.pr) : '');
    }
    function insufficient() {
      var pcs = [], sq, p, t, cols = {};
      for (sq = 0; sq < 64; sq++) {
        p = B[sq]; t = p > 0 ? p : -p;
        if (!t || t === 6) continue;
        if (t === 1 || t === 4 || t === 5) return false;
        pcs.push(t); if (t === 3) cols[((sq >> 3) + (sq & 7)) & 1] = 1;
      }
      if (pcs.length <= 1) return true;
      return pcs.every(function (x) { return x === 3; }) && Object.keys(cols).length === 1;
    }

    eng.setFen = function (f) {
      var a = f.split(' '), rows = a[0].split('/'), r, c, i, ch, lo, pc, map = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
      B.fill(0);
      for (r = 0; r < 8; r++) {
        c = 0;
        for (i = 0; i < rows[r].length; i++) {
          ch = rows[r].charAt(i);
          if (ch >= '1' && ch <= '8') c += +ch;
          else { lo = ch.toLowerCase(); pc = map[lo]; B[r * 8 + c] = ch === lo ? -pc : pc; if (pc === 6) ks[ch === lo ? 1 : 0] = r * 8 + c; c++; }
        }
      }
      side = a[1] === 'b' ? -1 : 1; castle = 0;
      if (a[2]) { if (a[2].indexOf('K') >= 0) castle |= 1; if (a[2].indexOf('Q') >= 0) castle |= 2; if (a[2].indexOf('k') >= 0) castle |= 4; if (a[2].indexOf('q') >= 0) castle |= 8; }
      ep = a[3] && a[3] !== '-' ? (8 - +a[3].charAt(1)) * 8 + 'abcdefgh'.indexOf(a[3].charAt(0)) : -1;
      half = +a[4] || 0; st = []; mv = []; nm = []; kst = []; reps = {}; reps[key()] = 1;
    };
    eng.turn = function () { return side; };
    eng.at = function (sq) { return B[sq]; };
    eng.kingSq = function (s) { return ks[s > 0 ? 0 : 1]; };
    eng.checked = checked;
    eng.count = function () { return mv.length; };
    eng.names = function () { return nm; };
    eng.last = function () { return mv.length ? mv[mv.length - 1] : null; };
    eng.legal = function () {
      var ms = gen(false), out = [], i;
      for (i = 0; i < ms.length; i++) { make(ms[i]); if (!illegal()) out.push(ms[i]); unmake(); }
      return out;
    };
    eng.play = function (m) {
      var n = fmt(m), k;
      make(m); mv.push(m); k = key(); kst.push(k); reps[k] = (reps[k] || 0) + 1;
      if (checked()) n += eng.legal().length ? '+' : '#';
      nm.push(n);
    };
    eng.undo = function () { if (!mv.length) return; reps[kst.pop()]--; mv.pop(); nm.pop(); unmake(); };
    eng.status = function () {
      var chk = checked();
      if (!eng.legal().length) return chk ? { over: true, winner: -side, reason: 'chiếu hết' } : { over: true, winner: 0, reason: 'hết nước đi mà không bị chiếu (bí)' };
      if (reps[key()] >= 3) return { over: true, winner: 0, reason: 'lặp lại thế cờ 3 lần' };
      if (half >= 100) return { over: true, winner: 0, reason: '50 nước không bắt quân/đi tốt' };
      if (insufficient()) return { over: true, winner: 0, reason: 'không đủ quân để chiếu hết' };
      return { over: false };
    };
    eng.ai = function (level) {
      var L = CH_LV[level] || CH_LV[3], lg, cp;
      if (L.d === 0) { lg = eng.legal(); if (!lg.length) return null; cp = lg.filter(function (m) { return m.cap; }); return (cp.length && Math.random() < 0.4) ? pick(cp) : pick(lg); }
      return search(L.d, L.ms, L.n);
    };
    eng.perft = function (d) {
      if (!d) return 1;
      var ms = gen(false), n = 0, i;
      for (i = 0; i < ms.length; i++) { make(ms[i]); if (!illegal()) n += eng.perft(d - 1); unmake(); }
      return n;
    };
    eng.setFen(fen || CH_START);
    return eng;
  }

  /* =================================================================
     CỜ TƯỚNG — đủ luật: Tướng/Sĩ trong cung, Tượng không qua sông & bị cản mắt, Mã bị cản chân,
     Pháo ăn quân qua đúng một quân "ngòi", Tốt qua sông được đi ngang, hai Tướng không đối mặt.
     Ô = hàng*9 + cột; hàng 0 là phía Đen (trên), hàng 9 là phía Đỏ (dưới). Đỏ đi trước.
     Quân: 1 Tốt, 2 Pháo, 3 Xe, 4 Mã, 5 Tượng, 6 Sĩ, 7 Tướng; Đỏ dương, Đen âm.
     ================================================================= */
  var XQ_V = [0, 100, 450, 900, 400, 200, 200, 0];
  var XQ_DR = [-1, 1, 0, 0], XQ_DC = [0, 0, -1, 1];
  var XQ_HA = (function () {
    var out = [];
    [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(function (m) {
      var sr = Math.abs(m[0]) === 2 ? (m[0] > 0 ? 1 : -1) : 0, sc = Math.abs(m[1]) === 2 ? (m[1] > 0 ? 1 : -1) : 0;
      out.push([-m[0], -m[1], -m[0] + sr, -m[1] + sc]);
    });
    return out;
  })();
  var XQ_NAME = ['', 'Tốt', 'Pháo', 'Xe', 'Mã', 'Tượng', 'Sĩ', 'Tướng'];
  var XQ_START = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
  var XQ_LV = [null, { d: 0 }, { d: 1, ms: 200, n: 90 }, { d: 2, ms: 600, n: 25 }, { d: 3, ms: 1000, n: 6 }, { d: 6, ms: 1800, n: 2 }];

  function XiangqiEngine(fen) {
    var B = new Int8Array(90), side = 1, half = 0, ks = [85, 4];
    var st = [], hs = [], reps = {}, kst = [], mv = [], nm = [], eng = {};

    function key() { return Array.prototype.join.call(B, ',') + '|' + side; }
    function sqn(s) { return 'abcdefghi'.charAt(s % 9) + (10 - ((s / 9) | 0)); }

    function attacked(sq, by) {
      var r = (sq / 9) | 0, c = sq % 9, d, rr, cc, v, scr, i, h, f;
      for (d = 0; d < 4; d++) {
        rr = r + XQ_DR[d]; cc = c + XQ_DC[d]; scr = 0;
        while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
          v = B[rr * 9 + cc];
          if (v) {
            if (!scr) { if (v === by * 3) return true; if (v === by * 7 && XQ_DC[d] === 0) return true; scr = 1; }
            else { if (v === by * 2) return true; break; }
          }
          rr += XQ_DR[d]; cc += XQ_DC[d];
        }
      }
      for (i = 0; i < 8; i++) {
        h = XQ_HA[i]; rr = r + h[0]; cc = c + h[1];
        if (rr < 0 || rr > 9 || cc < 0 || cc > 8 || B[rr * 9 + cc] !== by * 4) continue;
        if (!B[(r + h[2]) * 9 + c + h[3]]) return true;
      }
      f = by > 0 ? -1 : 1;
      rr = r - f;
      if (rr >= 0 && rr < 10 && B[rr * 9 + c] === by) return true;
      if (by > 0 ? r <= 4 : r >= 5) { if (c > 0 && B[r * 9 + c - 1] === by) return true; if (c < 8 && B[r * 9 + c + 1] === by) return true; }
      return false;
    }

    function gen(caps) {
      var ms = [], s = side, sq, p, t, r, c, i, d, rr, cc, to, v, lr, lc, own;
      function add(f, t2, pc) {
        var cp = B[t2];
        if (cp) { if ((cp > 0) === (s > 0)) return; cp = cp > 0 ? cp : -cp; ms.push({ f: f, t: t2, pc: pc, cap: cp, o: 1000 + XQ_V[cp] * 10 - XQ_V[pc] }); }
        else if (!caps) ms.push({ f: f, t: t2, pc: pc, cap: 0, o: 0 });
      }
      function palace(rw, cl) { return cl >= 3 && cl <= 5 && (s > 0 ? rw >= 7 && rw <= 9 : rw >= 0 && rw <= 2); }
      for (sq = 0; sq < 90; sq++) {
        p = B[sq]; if (!p || (p > 0) !== (s > 0)) continue;
        t = p > 0 ? p : -p; r = (sq / 9) | 0; c = sq % 9;
        if (t === 1) {
          rr = r - s; if (rr >= 0 && rr < 10) add(sq, rr * 9 + c, 1);
          if (s > 0 ? r <= 4 : r >= 5) { if (c > 0) add(sq, sq - 1, 1); if (c < 8) add(sq, sq + 1, 1); }
        } else if (t === 7) {
          for (d = 0; d < 4; d++) { rr = r + XQ_DR[d]; cc = c + XQ_DC[d]; if (palace(rr, cc)) add(sq, rr * 9 + cc, 7); }
        } else if (t === 6) {
          for (d = -1; d <= 1; d += 2) for (i = -1; i <= 1; i += 2) { rr = r + d; cc = c + i; if (palace(rr, cc)) add(sq, rr * 9 + cc, 6); }
        } else if (t === 5) {
          for (d = -2; d <= 2; d += 4) for (i = -2; i <= 2; i += 4) {
            rr = r + d; cc = c + i;
            if (rr < 0 || rr > 9 || cc < 0 || cc > 8) continue;
            if (s > 0 ? rr < 5 : rr > 4) continue;
            if (B[(r + d / 2) * 9 + c + i / 2]) continue;
            add(sq, rr * 9 + cc, 5);
          }
        } else if (t === 4) {
          for (d = 0; d < 4; d++) {
            lr = r + XQ_DR[d]; lc = c + XQ_DC[d];
            if (lr < 0 || lr > 9 || lc < 0 || lc > 8 || B[lr * 9 + lc]) continue;
            for (i = -1; i <= 1; i += 2) {
              rr = XQ_DR[d] ? r + XQ_DR[d] * 2 : r + i; cc = XQ_DR[d] ? c + i : c + XQ_DC[d] * 2;
              if (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) add(sq, rr * 9 + cc, 4);
            }
          }
        } else if (t === 3) {
          for (d = 0; d < 4; d++) {
            rr = r + XQ_DR[d]; cc = c + XQ_DC[d];
            while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) { to = rr * 9 + cc; add(sq, to, 3); if (B[to]) break; rr += XQ_DR[d]; cc += XQ_DC[d]; }
          }
        } else {
          for (d = 0; d < 4; d++) {
            rr = r + XQ_DR[d]; cc = c + XQ_DC[d];
            while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9 && !B[rr * 9 + cc]) { add(sq, rr * 9 + cc, 2); rr += XQ_DR[d]; cc += XQ_DC[d]; }
            if (rr < 0 || rr > 9 || cc < 0 || cc > 8) continue;
            rr += XQ_DR[d]; cc += XQ_DC[d];
            while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9 && !B[rr * 9 + cc]) { rr += XQ_DR[d]; cc += XQ_DC[d]; }
            if (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) add(sq, rr * 9 + cc, 2);
          }
        }
      }
      return ms;
    }

    function make(m) {
      st.push(m); hs.push(half);
      B[m.t] = B[m.f]; B[m.f] = 0;
      if (m.pc === 7) ks[side > 0 ? 0 : 1] = m.t;
      half = m.cap ? 0 : half + 1;
      side = -side;
    }
    function unmake() {
      var m = st.pop(); half = hs.pop(); side = -side;
      B[m.f] = B[m.t]; B[m.t] = m.cap ? -side * m.cap : 0;
      if (m.pc === 7) ks[side > 0 ? 0 : 1] = m.f;
    }
    function illegal() { return attacked(ks[side > 0 ? 1 : 0], side); }
    function checked() { return attacked(ks[side > 0 ? 0 : 1], -side); }

    function evalStm() {
      var sc = 0, sq, p, t, r, c, rr, v;
      for (sq = 0; sq < 90; sq++) {
        p = B[sq]; if (!p) continue;
        t = p > 0 ? p : -p; r = (sq / 9) | 0; c = sq % 9; rr = p > 0 ? r : 9 - r; v = XQ_V[t];
        if (t === 1) v += rr <= 4 ? 90 + (4 - rr) * 8 - Math.abs(c - 4) * 4 : (6 - rr) * 4;
        else if (t === 4) v += 24 - Math.abs(c - 4) * 4 - Math.abs(rr - 4.5) * 3;
        else if (t === 2) v += 14 - Math.abs(c - 4) * 2;
        else if (t === 3 && rr <= 4) v += 10;
        sc += p > 0 ? v : -v;
      }
      return side > 0 ? sc : -sc;
    }

    var g = {
      gen: gen, make: make, unmake: unmake, illegal: illegal, checked: checked, evalStm: evalStm,
      plies: function () { return st.length; },
      noMove: function (chk, ply) { return -MATE + ply; },   // Cờ tướng: hết nước đi là THUA (kể cả không bị chiếu)
      rep: function (m) { var c; make(m); c = reps[key()] || 0; unmake(); return c; }
    };
    var search = Searcher(g);

    function attackers() {
      var sq, p, t;
      for (sq = 0; sq < 90; sq++) { p = B[sq]; t = p > 0 ? p : -p; if (t === 1 || t === 2 || t === 3 || t === 4) return true; }
      return false;
    }

    eng.setFen = function (f) {
      var a = f.split(' '), rows = a[0].split('/'), r, c, i, ch, lo, pc, map = { p: 1, c: 2, r: 3, n: 4, h: 4, b: 5, e: 5, a: 6, k: 7 };
      B.fill(0);
      for (r = 0; r < 10; r++) {
        c = 0;
        for (i = 0; i < rows[r].length; i++) {
          ch = rows[r].charAt(i);
          if (ch >= '1' && ch <= '9') c += +ch;
          else { lo = ch.toLowerCase(); pc = map[lo]; B[r * 9 + c] = ch === lo ? -pc : pc; if (pc === 7) ks[ch === lo ? 1 : 0] = r * 9 + c; c++; }
        }
      }
      side = a[1] === 'b' ? -1 : 1; half = 0; st = []; hs = []; mv = []; nm = []; kst = []; reps = {}; reps[key()] = 1;
    };
    eng.turn = function () { return side; };
    eng.at = function (sq) { return B[sq]; };
    eng.kingSq = function (s) { return ks[s > 0 ? 0 : 1]; };
    eng.checked = checked;
    eng.count = function () { return mv.length; };
    eng.names = function () { return nm; };
    eng.last = function () { return mv.length ? mv[mv.length - 1] : null; };
    eng.legal = function () {
      var ms = gen(false), out = [], i;
      for (i = 0; i < ms.length; i++) { make(ms[i]); if (!illegal()) out.push(ms[i]); unmake(); }
      return out;
    };
    eng.play = function (m) {
      var p = B[m.f], n = (p > 0 && m.pc === 1 ? 'Binh' : XQ_NAME[m.pc]) + ' ' + sqn(m.f) + (m.cap ? 'x' : '-') + sqn(m.t), k;
      make(m); mv.push(m); k = key(); kst.push(k); reps[k] = (reps[k] || 0) + 1;
      if (checked()) n += ' (chiếu)';
      nm.push(n);
    };
    eng.undo = function () { if (!mv.length) return; reps[kst.pop()]--; mv.pop(); nm.pop(); unmake(); };
    eng.status = function () {
      if (!eng.legal().length) return { over: true, winner: -side, reason: checked() ? 'chiếu bí' : 'hết nước đi' };
      if (reps[key()] >= 3) return { over: true, winner: 0, reason: 'lặp lại thế cờ 3 lần' };
      if (half >= 120) return { over: true, winner: 0, reason: '60 nước không ăn quân' };
      if (!attackers()) return { over: true, winner: 0, reason: 'hai bên không còn quân tấn công' };
      return { over: false };
    };
    eng.ai = function (level) {
      var L = XQ_LV[level] || XQ_LV[3], lg, cp;
      if (L.d === 0) { lg = eng.legal(); if (!lg.length) return null; cp = lg.filter(function (m) { return m.cap; }); return (cp.length && Math.random() < 0.4) ? pick(cp) : pick(lg); }
      return search(L.d, L.ms, L.n);
    };
    eng.perft = function (d) {
      if (!d) return 1;
      var ms = gen(false), n = 0, i;
      for (i = 0; i < ms.length; i++) { make(ms[i]); if (!illegal()) n += eng.perft(d - 1); unmake(); }
      return n;
    };
    eng.setFen(fen || XQ_START);
    return eng;
  }

  /* ---- Pikachu (nối thú): logic thuần ---- */
  var PK_ICONS = ['⚡', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉', '🦄', '🐝', '🦋', '🐢', '🐙', '🐠', '🐳', '🦀', '🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '🥝'];
  var PK_GRAV = { none: 'Đứng yên', down: 'Rơi xuống ⬇', up: 'Bay lên ⬆', left: 'Dồn sang trái ⬅', right: 'Dồn sang phải ➡', hcenter: 'Dồn vào giữa ⬌', vcenter: 'Dồn vào giữa ⬍' };
  /* r = số hàng, c = số cột, k = số loại thú, t = thời gian (giây), g = kiểu rơi sau khi nối. Bàn xếp dọc (c ≤ 8) để ô đủ lớn trên điện thoại. */
  var PK_LEVELS = [
    { n: 'Khởi động', r: 6, c: 6, k: 8, t: 200, g: 'none' },
    { n: 'Làm quen', r: 8, c: 6, k: 10, t: 240, g: 'none' },
    { n: 'Thung lũng', r: 8, c: 8, k: 12, t: 300, g: 'none' },
    { n: 'Thác đổ', r: 8, c: 6, k: 12, t: 220, g: 'down' },
    { n: 'Bay lên', r: 10, c: 6, k: 14, t: 250, g: 'up' },
    { n: 'Gió trái', r: 8, c: 8, k: 14, t: 280, g: 'left' },
    { n: 'Gió phải', r: 8, c: 8, k: 16, t: 270, g: 'right' },
    { n: 'Hội tụ', r: 10, c: 6, k: 15, t: 240, g: 'hcenter' },
    { n: 'Tâm điểm', r: 10, c: 8, k: 18, t: 330, g: 'vcenter' },
    { n: 'Thử thách', r: 10, c: 8, k: 20, t: 340, g: 'none' },
    { n: 'Mưa sao', r: 10, c: 8, k: 20, t: 300, g: 'down' },
    { n: 'Bão cát', r: 12, c: 6, k: 18, t: 260, g: 'left' },
    { n: 'Cuồng phong', r: 10, c: 8, k: 22, t: 300, g: 'right' },
    { n: 'Núi lửa', r: 12, c: 8, k: 24, t: 360, g: 'up' },
    { n: 'Giao thoa', r: 12, c: 6, k: 20, t: 250, g: 'hcenter' },
    { n: 'Mê cung', r: 12, c: 8, k: 24, t: 340, g: 'vcenter' },
    { n: 'Siêu tốc', r: 8, c: 8, k: 20, t: 180, g: 'down' },
    { n: 'Vực sâu', r: 12, c: 8, k: 28, t: 330, g: 'down' },
    { n: 'Hỗn mang', r: 12, c: 8, k: 30, t: 300, g: 'left' },
    { n: 'Huyền thoại', r: 14, c: 8, k: 32, t: 380, g: 'vcenter' }
  ];
  var PK_DR = [-1, 0, 1, 0], PK_DC = [0, 1, 0, -1];
  /* Bàn lưu phẳng, có viền trống 1 ô: kích thước (R+2) × (C+2); 0 = ô trống, 1..k = loại thú. */
  function pkDeal(R, C, kinds) {
    var C2 = C + 2, g = new Uint8Array((R + 2) * C2), pairs = (R * C) >> 1, list = [], i, r, c;
    kinds = Math.max(1, Math.min(kinds, pairs));
    for (i = 0; i < pairs; i++) { var k = (i % kinds) + 1; list.push(k, k); }
    shuffle(list); i = 0;
    for (r = 1; r <= R; r++) for (c = 1; c <= C; c++) g[r * C2 + c] = list[i++];
    return g;
  }
  /* Đường nối 2 ô cùng loại: đi qua ô trống, tối đa 2 góc rẽ. Trả về mảng điểm góc [{r,c}...] hoặc null. */
  function pkFindPath(g, R2, C2, a, b) {
    if (a === b || !g[a] || g[a] !== g[b]) return null;
    var q = [{ r: (a / C2) | 0, c: a % C2, d: -1, t: 0, p: null }], head = 0, seen = new Int8Array(R2 * C2 * 4), i;
    for (i = 0; i < seen.length; i++) seen[i] = 9;
    while (head < q.length) {
      var s = q[head++];
      for (var d = 0; d < 4; d++) {
        var nt = s.t + ((s.d !== -1 && d !== s.d) ? 1 : 0);
        if (nt > 2) continue;
        var nr = s.r + PK_DR[d], nc = s.c + PK_DC[d];
        if (nr < 0 || nr >= R2 || nc < 0 || nc >= C2) continue;
        var ni = nr * C2 + nc;
        if (ni === b) {
          var cells = [{ r: nr, c: nc }], n = s;
          while (n) { cells.push({ r: n.r, c: n.c }); n = n.p; }
          cells.reverse();
          var pts = [cells[0]], k;
          for (k = 1; k < cells.length - 1; k++) {
            var dr1 = cells[k].r - cells[k - 1].r, dc1 = cells[k].c - cells[k - 1].c, dr2 = cells[k + 1].r - cells[k].r, dc2 = cells[k + 1].c - cells[k].c;
            if (dr1 !== dr2 || dc1 !== dc2) pts.push(cells[k]);
          }
          pts.push(cells[cells.length - 1]);
          return pts;
        }
        if (g[ni]) continue;
        var key = ni * 4 + d;
        if (seen[key] <= nt) continue;
        seen[key] = nt;
        q.push({ r: nr, c: nc, d: d, t: nt, p: s });
      }
    }
    return null;
  }
  function pkFindMove(g, R2, C2) {
    var by = {}, i, k, list, x, y, p;
    for (i = 0; i < g.length; i++) if (g[i]) (by[g[i]] = by[g[i]] || []).push(i);
    for (k in by) {
      list = by[k];
      for (x = 0; x < list.length; x++) for (y = x + 1; y < list.length; y++) {
        p = pkFindPath(g, R2, C2, list[x], list[y]);
        if (p) return { a: list[x], b: list[y], path: p };
      }
    }
    return null;
  }
  function pkHasMove(g, R2, C2) { return !!pkFindMove(g, R2, C2); }
  /* Dồn các ô còn lại theo kiểu rơi của màn chơi. */
  function pkCompact(g, idxs) {
    var vals = [], i;
    for (i = 0; i < idxs.length; i++) if (g[idxs[i]]) vals.push(g[idxs[i]]);
    for (i = 0; i < idxs.length; i++) g[idxs[i]] = i < vals.length ? vals[i] : 0;
  }
  function pkGravity(g, R, C, mode) {
    if (!mode || mode === 'none') return;
    var C2 = C + 2, r, c, idxs, m;
    function line(list) { pkCompact(g, list); }
    if (mode === 'down' || mode === 'up') {
      for (c = 1; c <= C; c++) { idxs = []; for (r = 1; r <= R; r++) idxs.push(mode === 'down' ? (R + 1 - r) * C2 + c : r * C2 + c); line(idxs); }
    } else if (mode === 'left' || mode === 'right') {
      for (r = 1; r <= R; r++) { idxs = []; for (c = 1; c <= C; c++) idxs.push(r * C2 + (mode === 'left' ? c : C + 1 - c)); line(idxs); }
    } else if (mode === 'hcenter') {
      m = C >> 1;
      for (r = 1; r <= R; r++) {
        idxs = []; for (c = m; c >= 1; c--) idxs.push(r * C2 + c); line(idxs);
        idxs = []; for (c = m + 1; c <= C; c++) idxs.push(r * C2 + c); line(idxs);
      }
    } else if (mode === 'vcenter') {
      m = R >> 1;
      for (c = 1; c <= C; c++) {
        idxs = []; for (r = m; r >= 1; r--) idxs.push(r * C2 + c); line(idxs);
        idxs = []; for (r = m + 1; r <= R; r++) idxs.push(r * C2 + c); line(idxs);
      }
    }
  }
  /* Đảo ngẫu nhiên các thú còn lại (giữ nguyên các ô đang có thú), lặp đến khi có nước đi. */
  function pkShuffle(g, R, C) {
    var C2 = C + 2, R2 = R + 2, pos = [], vals = [], i, tries;
    for (i = 0; i < g.length; i++) if (g[i]) { pos.push(i); vals.push(g[i]); }
    for (tries = 0; tries < 120; tries++) {
      shuffle(vals);
      for (i = 0; i < pos.length; i++) g[pos[i]] = vals[i];
      if (pkHasMove(g, R2, C2)) return true;
    }
    return false;
  }

  /* ---- Chém hoa quả: hình học thuần ---- */
  function frDistPointSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    if (len2 < 1e-8) { var ddx = px - x1, ddy = py - y1; return Math.sqrt(ddx * ddx + ddy * ddy); }
    var t = ((px - x1) * dx + (py - y1) * dy) / len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var cx = x1 + t * dx, cy = y1 + t * dy, ex = px - cx, ey = py - cy;
    return Math.sqrt(ex * ex + ey * ey);
  }
  function frSegHitsCircle(x1, y1, x2, y2, cx, cy, r) {
    return frDistPointSeg(cx, cy, x1, y1, x2, y2) <= r;
  }
  function frSegLen(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy);
  }

  var LOGIC = {
    generateSudoku: generateSudoku, solveGrid: solveGrid, solvableBySingles: solvableBySingles, SD_LEVELS: SD_LEVELS,
    CaroEngine: CaroEngine, ChessEngine: ChessEngine, XiangqiEngine: XiangqiEngine,
    PK_ICONS: PK_ICONS, PK_LEVELS: PK_LEVELS, PK_GRAV: PK_GRAV, pkDeal: pkDeal, pkFindPath: pkFindPath, pkFindMove: pkFindMove, pkHasMove: pkHasMove, pkGravity: pkGravity, pkShuffle: pkShuffle,
    frDistPointSeg: frDistPointSeg, frSegHitsCircle: frSegHitsCircle, frSegLen: frSegLen
  };
  if (typeof window !== 'undefined') window.GamesLogic = LOGIC;
  if (typeof document === 'undefined' || !document.querySelector) return;

  /* =================================================================
     PHẦN 2 — GIAO DIỆN
     ================================================================= */
  var tabsBar = document.querySelector('.tabs');
  if (!tabsBar) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  /* ---------- Âm thanh + pháo giấy dùng chung (nút 🔊 của Vòng Quay cũng điều khiển: khoá 'wsnd') ---------- */
  var Au = (function () {
    var ctx = null;
    function soundOn() { try { return localStorage.getItem('wsnd') !== '0'; } catch (e) { return true; } }
    function init() {
      if (!soundOn()) return null;
      if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ctx = new AC(); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f, t, d, type, v) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.05);
    }
    function play(fn) { try { var c = init(); if (c) fn(c.currentTime); } catch (e) { } }
    return {
      unlock: function () { try { init(); } catch (e) { } },
      stone: function (p) { play(function (t) { tone(p === 1 ? 540 : 400, t, 0.09, 'triangle', 0.2); }); },
      ok: function () { play(function (t) { tone(760, t, 0.07, 'triangle', 0.14); }); },
      bad: function () { play(function (t) { tone(170, t, 0.2, 'sawtooth', 0.12); }); },
      win: function () { play(function (t) { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, k) { tone(f, t + k * 0.11, 0.5, 'triangle', 0.22); }); }); },
      lose: function () { play(function (t) { [392, 329.63, 261.63, 196].forEach(function (f, k) { tone(f, t + k * 0.16, 0.35, 'triangle', 0.18); }); }); },
      /* Chém hoa quả */
      slice: function () {
        play(function (t) {
          tone(1200 + rnd(400), t, 0.04, 'square', 0.09);
          tone(700 + rnd(250), t + 0.02, 0.07, 'sawtooth', 0.07);
          tone(320 + rnd(80), t + 0.05, 0.1, 'triangle', 0.05);
        });
      },
      boom: function () {
        play(function (t) {
          tone(80, t, 0.28, 'sawtooth', 0.2);
          tone(55, t + 0.04, 0.4, 'square', 0.14);
          tone(40, t + 0.1, 0.35, 'triangle', 0.1);
        });
      },
      combo: function (n) {
        play(function (t) {
          var base = 520 + Math.min(5, n || 3) * 60;
          [0, 1, 2].forEach(function (k) { tone(base + k * 120, t + k * 0.07, 0.18, 'triangle', 0.16); });
        });
      },
      whoosh: function () {
        play(function (t) {
          tone(280 + rnd(40), t, 0.12, 'sine', 0.04);
          tone(180 + rnd(30), t + 0.05, 0.15, 'sine', 0.03);
        });
      },
      /* Âm thanh cho trò chơi dạng ô (Pikachu...) */
      open: function () {
        play(function (t) {
          tone(620 + rnd(80), t, 0.05, 'triangle', 0.1);
          tone(880 + rnd(60), t + 0.03, 0.06, 'sine', 0.07);
        });
      },
      flag: function (on) {
        play(function (t) {
          if (on) { tone(480, t, 0.06, 'square', 0.08); tone(640, t + 0.05, 0.08, 'triangle', 0.1); }
          else { tone(400, t, 0.07, 'triangle', 0.07); }
        });
      },
      tick: function () {
        play(function (t) { tone(900, t, 0.03, 'square', 0.04); });
      },
      start: function () {
        play(function (t) {
          tone(392, t, 0.1, 'triangle', 0.12);
          tone(523, t + 0.1, 0.12, 'triangle', 0.14);
          tone(659, t + 0.22, 0.16, 'triangle', 0.16);
        });
      }
    };
  })();

  function confetti() {
    var cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9000';
    var W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; document.body.appendChild(cv);
    var c = cv.getContext('2d'); if (!c) { cv.remove(); return; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var COL = ['#ff4d8d', '#fbbf24', '#38bdf8', '#34d399', '#c084fc', '#fb923c', '#f43f5e'], P = [], n = W < 520 ? 90 : 150, i;
    for (i = 0; i < n; i++) P.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3.5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 5 + Math.random() * 7, c: COL[(Math.random() * COL.length) | 0] });
    var t0 = performance.now();
    (function frame(now) {
      var el = now - t0; c.clearRect(0, 0, W, H);
      for (var k = 0; k < P.length; k++) { var q = P[k]; q.x += q.vx + Math.sin(q.y / 40) * 0.6; q.y += q.vy; q.r += q.vr; c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillStyle = q.c; c.globalAlpha = Math.max(0, 1 - Math.max(0, el - 2200) / 1000); c.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); c.restore(); }
      if (el < 3300) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ---------- CSS ---------- */
  var css = [
    '.gm-menu{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 14px}',
    '.gm-menu button{width:100%;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:10px 8px}',
    '@media (max-width:420px){.gm-menu{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.gm-menu button{font-size:12px;padding:9px 4px}}',
    '.gm-menu button.on{background:var(--a1);color:#fff}',
    '.gm-soon{display:inline-flex;align-items:center;padding:8px 12px;border:1px dashed var(--bd);border-radius:10px;font-size:13px;color:var(--mut)}',
    '.gm-view{display:none}.gm-view.on{display:block}',
    '.gm-wrap{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}',
    '.gm-board{flex:1 1 320px;max-width:560px;min-width:0}',
    '.gm-side{flex:1 1 260px;min-width:0}',
    '.gm-line{font-size:14px;margin:8px 0;line-height:1.7}',
    '.sd-grid{display:grid;grid-template-columns:repeat(9,1fr);grid-template-rows:repeat(9,1fr);width:100%;aspect-ratio:1;border:3px solid #8b95ff;border-radius:8px;overflow:hidden;background:var(--card2);container-type:inline-size;user-select:none;-webkit-user-select:none}',
    '.sd-c{position:relative;display:flex;align-items:center;justify-content:center;border-right:1px solid var(--bd);border-bottom:1px solid var(--bd);font-size:clamp(16px,5.2vw,28px);font-size:5.6cqw;font-weight:600;color:#38bdf8;cursor:pointer;min-width:0;min-height:0}',
    '.sd-c.rb{border-right:2.5px solid #8b95ff}.sd-c.bb{border-bottom:2.5px solid #8b95ff}',
    '.sd-c.g{color:#e6ebf5;font-weight:700}',
    '.sd-c.peer{background:#17233d}.sd-c.same{background:#26356b}.sd-c.sel{background:#3b4bd6;color:#fff}',
    '.sd-c.err{color:#f87171;background:#3a1620}.sd-c.sel.err{color:#fecaca}',
    '.sd-n{display:grid;grid-template-columns:repeat(3,1fr);width:92%;height:92%;font-size:clamp(7px,1.8vw,11px);font-size:2.5cqw;line-height:1;color:#93a0ba;font-weight:500}',
    '.sd-n span{display:flex;align-items:center;justify-content:center}',
    '.sd-pad{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;margin-top:10px}',
    '.sd-pad button{padding:6px 0 4px;min-height:46px;font-size:18px;line-height:1.1;display:flex;flex-direction:column;align-items:center;justify-content:center}',
    '.sd-pad button small{font-size:10px;font-weight:400;opacity:.75}',
    '#gcaro{width:100%;aspect-ratio:1;display:block;border-radius:8px;border:2px solid #8b95ff;touch-action:manipulation;cursor:pointer;background:#0f1a2e}',
    '.gm-tally{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
    '.gm-tally span{background:var(--card2);border:1px solid var(--bd);border-radius:10px;padding:6px 12px;font-size:14px}',
    '.bg-stage{position:relative}',
    '.bg-cv{width:100%;display:block;border-radius:8px;border:2px solid #8b95ff;touch-action:manipulation;cursor:pointer;background:#0f1a2e}',
    '.bg-promo{display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;background:rgba(15,22,38,.97);border:1px solid var(--bd);border-radius:12px;padding:10px;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,.55);max-width:92%}',
    '.bg-promo.on{display:flex}.bg-promo span{width:100%;text-align:center;font-size:13px;color:var(--mut)}',
    '.bg-moves{max-height:150px;overflow:auto;background:var(--card2);border:1px solid var(--bd);border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.8;margin:8px 0}',
    '.tabs.six .tab{grid-column:span 2}',
    '.lp-cards.six{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.lp-cards.six .lp-card:last-child{grid-column:auto}',
    '@media (min-width:640px) and (max-width:819px){.lp-cards.six{grid-template-columns:repeat(3,minmax(0,1fr))}.lp-cards.six .lp-card{grid-column:auto}}',
    '@media (min-width:820px){.lp-cards.six{grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.lp-cards.six .lp-card{grid-column:auto;padding:16px 8px}}',
    '.gm-board.pk-board{flex:2 1 340px;max-width:min(780px,100%)}',
    '.pk-stage{position:relative;background:linear-gradient(180deg,#101c33,#0b1322);border:2px solid #facc15;border-radius:12px;padding:8px}',
    '.pk-stage.pk-full{position:fixed;inset:0;z-index:8500;border-radius:0;border:0;padding:8px;display:flex;flex-direction:column;background:#0b1220}',
    '.pk-hud{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-weight:700;font-size:15px;margin:2px 2px 6px}',
    '.pk-hud .pk-sp{flex:1}.pk-hud button{padding:4px 12px;min-height:36px;font-size:17px}',
    '.pk-time{position:relative;height:20px;border-radius:10px;background:#1c2a47;overflow:hidden;margin:0 0 6px;border:1px solid var(--bd)}',
    '.pk-time i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#facc15,#f59e0b);transition:width .2s linear}',
    '.pk-time i.low{background:linear-gradient(90deg,#ef4444,#f97316)}',
    '.pk-time b{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}',
    '.pk-info{font-size:13px;color:var(--mut);margin:0 2px 6px;min-height:18px}',
    '.pk-cvwrap{position:relative;min-height:380px;display:flex;justify-content:center;align-items:flex-start}',
    '.pk-stage.pk-full .pk-cvwrap{flex:1;min-height:0;align-items:center}',
    '#pkCv{display:block;touch-action:manipulation;cursor:pointer;border-radius:10px;max-width:100%}',
    '.pk-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
    '.pk-tools button{flex:1 1 92px;min-height:46px;font-size:15px}',
    '.pk-lvgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:10px 0}',
    '.pk-lv{padding:6px 2px;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2;font-size:16px}',
    '.pk-lv small{font-size:11px;color:#facc15}.pk-lv:disabled{opacity:.45}',
    '.pk-stars{font-size:36px;letter-spacing:4px;color:#facc15;margin:4px 0}',
    '#frCv{width:100%;aspect-ratio:5/4;min-height:min(58vh,480px);display:block;border-radius:8px;border:2px solid #8b95ff;touch-action:none;cursor:crosshair;background:linear-gradient(180deg,#0b1a2e 0%,#132038 60%,#1a2a1a 100%)}',
    '.gm-board.fr-board{flex:1 1 360px;max-width:min(720px,100%)}',
    '@media (max-width:639px){#frCv{min-height:min(62vh,520px);aspect-ratio:4/5}}',
    '.fr-hud{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0;font-size:15px;font-weight:600}',
    '.fr-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(8,12,24,.82);border-radius:8px;z-index:4;text-align:center;padding:16px}',
    '.fr-overlay.on{display:flex}.fr-overlay .box{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:20px 24px;max-width:90%}',
    '.fr-overlay h3{margin:0 0 8px;font-size:22px;color:var(--cy)}.fr-overlay p{margin:6px 0;color:var(--mut)}',
    '.fr-stage{position:relative}',
    /* --- Điện thoại: bàn cờ/Sudoku rộng gần hết màn hình --- */
    '@media (max-width:639px){',
    '#gvSd .gm-wrap,#gvCaro .gm-wrap,#gvCh .gm-wrap,#gvXq .gm-wrap{gap:12px}',
    '#gvSd .gm-board,#gvCaro .gm-board,#gvCh .gm-board,#gvXq .gm-board{flex:1 1 100%;max-width:none}',
    '#gvSd .sd-grid{border-width:2px;border-radius:6px;touch-action:manipulation}',
    '#gvSd .sd-pad{gap:3px;margin-top:8px}',
    '#gvSd .sd-pad button{min-height:54px;font-size:20px;padding:6px 0 4px}',
    '#gcaro,#gvCh .bg-cv,#gvXq .bg-cv{border-width:2px;border-radius:6px}',
    '#gvSd .gm-side .bar button,#gvCaro .gm-side .bar button,#gvCh .gm-side .bar button,#gvXq .gm-side .bar button{min-height:42px}',
    '}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- Chèn tab + panel + thẻ ở màn chào ---------- */
  var btn = document.createElement('button');
  btn.className = 'tab'; btn.type = 'button'; btn.setAttribute('data-tab', 't7');
  tabsBar.appendChild(btn);
  var nTabs = tabsBar.querySelectorAll('.tab').length;
  btn.textContent = '🎮 ' + nTabs + '. Trò chơi';
  if (nTabs >= 6) tabsBar.classList.add('six');

  var panel = document.createElement('section');
  panel.className = 'panel'; panel.id = 't7';
  var allPanels = document.querySelectorAll('.panel'), lastPanel = allPanels[allPanels.length - 1];
  if (lastPanel && lastPanel.parentNode) lastPanel.parentNode.insertBefore(panel, lastPanel.nextSibling); else document.body.appendChild(panel);

  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === btn); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('on', p.id === 't7'); });
    window.dispatchEvent(new CustomEvent('tabshow', { detail: 't7' }));
  });

  var lpCards = document.querySelector('.lp-cards');
  if (lpCards && !lpCards.querySelector('[data-go="t7"]')) {
    var card = document.createElement('button');
    card.type = 'button'; card.className = 'lp-card'; card.setAttribute('data-go', 't7'); card.style.setProperty('--i', '6');
    card.innerHTML = '<span class="ic">🎮</span><b>Trò chơi</b><small>6 trò chơi trí tuệ & giải trí</small>';
    lpCards.appendChild(card); lpCards.classList.add('six');
  }

  panel.innerHTML =
    '<h2>🎮 Trò chơi trí tuệ</h2>' +
    '<div class="gm-menu"><button type="button" class="sec on" data-g="sd">🔢 Sudoku</button><button type="button" class="sec" data-g="caro">⭕ Cờ Caro</button>' +
    '<button type="button" class="sec" data-g="ch">♟ Cờ vua</button><button type="button" class="sec" data-g="xq">🀄 Cờ tướng</button>' +
    '<button type="button" class="sec" data-g="pk">⚡ Pikachu</button><button type="button" class="sec" data-g="fr">🍉 Chém hoa quả</button></div>' +
    '<div class="gm-view on" id="gvSd"></div><div class="gm-view" id="gvCaro"></div><div class="gm-view" id="gvCh"></div><div class="gm-view" id="gvXq"></div>' +
    '<div class="gm-view" id="gvPk"></div><div class="gm-view" id="gvFr"></div>';

  function panelOn() { return panel.classList.contains('on'); }
  function typing(e) { var t = e.target; return t && t.matches && t.matches('input,textarea,select,[contenteditable="true"]'); }

  /* =================================================================
     SUDOKU (giao diện)
     ================================================================= */
  function initSudoku(host) {
    host.innerHTML =
      '<div class="gm-wrap"><div class="gm-board"><div class="sd-grid" id="sdGrid"></div><div class="sd-pad" id="sdPad"></div></div>' +
      '<div class="gm-side">' +
      '<div class="bar"><label class="note" style="margin:0">Mức độ: <select id="sdLevel"></select></label><button type="button" id="sdNew">🔄 Ván mới</button></div>' +
      '<div class="gm-line">⏱ <b id="sdTime">00:00</b> &nbsp;·&nbsp; ❌ Sai: <b id="sdErr">0</b> &nbsp;·&nbsp; 💡 Gợi ý: <b id="sdHint">0</b><br>🏆 Kỷ lục mức này: <b id="sdBest">--</b></div>' +
      '<div class="bar"><button type="button" class="sec sm" id="sdNote">✏️ Ghi chú: Tắt</button><button type="button" class="sec sm" id="sdUndo">↩ Hoàn tác</button><button type="button" class="sec sm" id="sdErase">⌫ Xóa ô</button>' +
      '<button type="button" class="sec sm" id="sdHintB">💡 Gợi ý</button><button type="button" class="sec sm" id="sdCheck">✔ Kiểm tra</button></div>' +
      '<label class="note" style="display:block"><input type="checkbox" id="sdShow" checked> Báo lỗi ngay khi điền sai</label>' +
      '<div id="sdStatus" class="status info"></div>' +
      '<div class="note">Cách chơi: điền số 1–9 sao cho mỗi hàng, mỗi cột và mỗi khối 3×3 đều có đủ 9 số, không lặp. Máy luôn tạo đề có <b>đúng một đáp án</b>. ' +
      'Mức dễ giải được bằng suy luận cơ bản; mức "Chuyên gia" cần kỹ thuật cao hơn.<br>Bàn phím: phím 1–9 điền số, 0/Backspace xóa, phím mũi tên di chuyển, N bật/tắt ghi chú, Ctrl+Z hoàn tác.</div>' +
      '</div></div>';

    var LV = SD_LEVELS, gridEl = $('sdGrid'), padEl = $('sdPad'), cells = [], padBtns = [], i, d;
    $('sdLevel').innerHTML = LV.map(function (l, k) { return '<option value="' + k + '">' + (k + 1) + '. ' + l.name + '</option>'; }).join('');
    for (i = 0; i < 81; i++) {
      var el = document.createElement('div'); el.className = 'sd-c' + (COL(i) % 3 === 2 && COL(i) < 8 ? ' rb' : '') + (ROW(i) % 3 === 2 && ROW(i) < 8 ? ' bb' : '');
      el.setAttribute('data-i', i); gridEl.appendChild(el); cells.push(el);
    }
    for (d = 1; d <= 9; d++) { var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'sec'; pb.setAttribute('data-d', d); padEl.appendChild(pb); padBtns.push(pb); }

    var S = { level: 1, given: [], sol: [], cur: [], notes: [], sel: -1, undo: [], noteMode: false, elapsed: 0, mistakes: 0, hints: 0, won: false, ready: false };
    var best = lsGet('gm_sd_best', {}), lastTick = Date.now(), errFlash = 0, busy = false;

    function fmt(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s %= 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
    function status(msg, cls) { var e = $('sdStatus'); e.textContent = msg || ''; e.className = 'status ' + (cls || 'info'); }
    function save() { if (!S.ready) return; lsSet('gm_sd_game', { level: S.level, given: S.given, sol: S.sol, cur: S.cur, notes: S.notes, elapsed: S.elapsed, mistakes: S.mistakes, hints: S.hints, won: S.won }); }
    function peers(a, b) { return a !== b && (ROW(a) === ROW(b) || COL(a) === COL(b) || BOX(a) === BOX(b)); }

    function paint() {
      var showErr = $('sdShow').checked, sv = S.sel >= 0 ? S.cur[S.sel] : 0, now = Date.now();
      for (var k = 0; k < 81; k++) {
        var v = S.cur[k], el = cells[k], cls = 'sd-c' + (COL(k) % 3 === 2 && COL(k) < 8 ? ' rb' : '') + (ROW(k) % 3 === 2 && ROW(k) < 8 ? ' bb' : '');
        if (S.given[k]) cls += ' g';
        var wrong = v && !S.given[k] && v !== S.sol[k];
        if (wrong && (showErr || now < errFlash)) cls += ' err';
        if (S.sel === k) cls += ' sel'; else if (S.sel >= 0 && v && v === sv) cls += ' same'; else if (S.sel >= 0 && peers(S.sel, k)) cls += ' peer';
        el.className = cls;
        if (v) { if (el.textContent !== String(v) || el.firstChild && el.firstChild.nodeType !== 3) el.textContent = v; }
        else if (S.notes[k]) {
          var h = '<div class="sd-n">'; for (var dd = 1; dd <= 9; dd++) h += '<span>' + ((S.notes[k] & (1 << dd)) ? dd : '') + '</span>'; el.innerHTML = h + '</div>';
        } else if (el.firstChild) el.textContent = '';
      }
      for (var q = 0; q < 9; q++) {
        var left = 9, dq = q + 1; for (var z = 0; z < 81; z++) if (S.cur[z] === dq && S.sol[z] === dq) left--;
        padBtns[q].innerHTML = dq + '<small>' + (left > 0 ? 'còn ' + left : '✓') + '</small>'; padBtns[q].disabled = left <= 0 || S.won;
      }
      $('sdErr').textContent = S.mistakes; $('sdHint').textContent = S.hints; $('sdTime').textContent = fmt(S.elapsed);
      $('sdBest').textContent = best[S.level] ? fmt(best[S.level]) : '--';
      $('sdNote').textContent = '✏️ Ghi chú: ' + (S.noteMode ? 'Bật' : 'Tắt');
      $('sdNote').style.outline = S.noteMode ? '2px solid var(--cy)' : 'none';
      $('sdLevel').value = String(S.level);
    }

    function snapshot(idx) { return idx.map(function (k) { return [k, S.cur[k], S.notes[k]]; }); }
    function clearPeerNotes(i, dgt, rec) {
      var bit = 1 << dgt;
      for (var k = 0; k < 81; k++) if (peers(i, k) && (S.notes[k] & bit)) { rec.push([k, S.cur[k], S.notes[k]]); S.notes[k] &= ~bit; }
    }
    function setNum(dg) {
      if (S.sel < 0 || S.won) return; var i = S.sel; if (S.given[i]) return;
      if (S.noteMode) {
        if (S.cur[i]) return;
        S.undo.push(snapshot([i])); S.notes[i] ^= (1 << dg);
      } else if (S.cur[i] === dg) {
        S.undo.push(snapshot([i])); S.cur[i] = 0;
      } else {
        var rec = snapshot([i]); S.cur[i] = dg; S.notes[i] = 0; clearPeerNotes(i, dg, rec); S.undo.push(rec);
        if (dg !== S.sol[i]) { S.mistakes++; Au.bad(); } else Au.ok();
      }
      paint(); save(); checkWin();
    }
    function erase() {
      if (S.sel < 0 || S.won || S.given[S.sel]) return; var i = S.sel;
      if (!S.cur[i] && !S.notes[i]) return;
      S.undo.push(snapshot([i])); S.cur[i] = 0; S.notes[i] = 0; paint(); save();
    }
    function undo() {
      if (S.won || !S.undo.length) return; var rec = S.undo.pop();
      for (var k = rec.length - 1; k >= 0; k--) { S.cur[rec[k][0]] = rec[k][1]; S.notes[rec[k][0]] = rec[k][2]; }
      paint(); save();
    }
    function hint() {
      if (S.won) return; var i = S.sel;
      if (i < 0 || S.given[i] || S.cur[i] === S.sol[i]) {
        var c = []; for (var k = 0; k < 81; k++) if (!S.given[k] && S.cur[k] !== S.sol[k]) c.push(k);
        if (!c.length) return; i = pick(c); S.sel = i;
      }
      var rec = snapshot([i]); S.cur[i] = S.sol[i]; S.notes[i] = 0; clearPeerNotes(i, S.sol[i], rec); S.undo.push(rec);
      S.hints++; Au.ok(); paint(); save(); checkWin();
    }
    function check() {
      var bad = 0; for (var k = 0; k < 81; k++) if (S.cur[k] && !S.given[k] && S.cur[k] !== S.sol[k]) bad++;
      errFlash = Date.now() + 2500; paint(); setTimeout(paint, 2600);
      status(bad ? 'Có ' + bad + ' ô đang sai (tô đỏ trong giây lát).' : 'Chưa phát hiện ô nào sai — cứ tiếp tục nhé!', bad ? 'err' : 'ok');
    }
    function checkWin() {
      for (var k = 0; k < 81; k++) if (S.cur[k] !== S.sol[k]) return;
      S.won = true; S.sel = -1;
      var ms = S.elapsed, msg = '🎉 Hoàn thành mức "' + LV[S.level].name + '" trong ' + fmt(ms) + '!';
      if (!S.hints && (!best[S.level] || ms < best[S.level])) { best[S.level] = ms; lsSet('gm_sd_best', best); msg += ' Kỷ lục mới!'; }
      else if (S.hints) msg += ' (Ván có dùng gợi ý nên không tính kỷ lục.)';
      status(msg, 'ok'); paint(); save(); Au.win(); confetti();
    }
    function load(g) {
      S.level = g.level; S.given = g.given; S.sol = g.sol; S.cur = g.cur; S.notes = g.notes; S.elapsed = g.elapsed || 0;
      S.mistakes = g.mistakes || 0; S.hints = g.hints || 0; S.won = !!g.won; S.sel = -1; S.undo = []; S.ready = true;
    }
    function newGame(level) {
      if (busy) return; busy = true; status('⏳ Đang tạo đề mức "' + LV[level].name + '"…', 'info'); $('sdNew').disabled = true;
      setTimeout(function () {
        try {
          var g = generateSudoku(level), given = g.puzzle.map(function (v) { return v ? 1 : 0; });
          load({ level: level, given: given, sol: g.solution, cur: g.puzzle.slice(), notes: new Array(81).fill(0), elapsed: 0, mistakes: 0, hints: 0, won: false });
          lastTick = Date.now(); status('Mức "' + LV[level].name + '" — ' + g.givens + ' ô cho sẵn. Chúc bạn chơi vui!', 'info'); paint(); save();
        } catch (e) { status('Không tạo được đề: ' + e.message, 'err'); console.error(e); }
        busy = false; $('sdNew').disabled = false;
      }, 30);
    }
    function inProgress() { if (!S.ready || S.won) return false; for (var k = 0; k < 81; k++) if (!S.given[k] && S.cur[k]) return true; return false; }
    function askNew(level) { if (inProgress() && !window.confirm('Bỏ ván đang chơi và tạo ván mới?')) { $('sdLevel').value = String(S.level); return; } newGame(level); }

    gridEl.addEventListener('click', function (e) { var c = e.target.closest('.sd-c'); if (!c) return; Au.unlock(); S.sel = +c.getAttribute('data-i'); paint(); });
    padEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; Au.unlock(); setNum(+b.getAttribute('data-d')); });
    $('sdNew').addEventListener('click', function () { Au.unlock(); askNew(+$('sdLevel').value); });
    $('sdLevel').addEventListener('change', function () { askNew(+$('sdLevel').value); });
    $('sdNote').addEventListener('click', function () { S.noteMode = !S.noteMode; paint(); });
    $('sdUndo').addEventListener('click', undo); $('sdErase').addEventListener('click', erase);
    $('sdHintB').addEventListener('click', hint); $('sdCheck').addEventListener('click', check);
    $('sdShow').addEventListener('change', paint);
    document.addEventListener('keydown', function (e) {
      if (!panelOn() || !host.classList.contains('on') || typing(e) || !S.ready) return;
      var k = e.key;
      if (k >= '1' && k <= '9') { setNum(+k); e.preventDefault(); }
      else if (k === '0' || k === 'Backspace' || k === 'Delete') { erase(); e.preventDefault(); }
      else if (k === 'n' || k === 'N') { S.noteMode = !S.noteMode; paint(); }
      else if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { undo(); e.preventDefault(); }
      else if (k.indexOf('Arrow') === 0) {
        var cur = S.sel < 0 ? 40 : S.sel, r = ROW(cur), c = COL(cur);
        if (k === 'ArrowUp') r = (r + 8) % 9; else if (k === 'ArrowDown') r = (r + 1) % 9; else if (k === 'ArrowLeft') c = (c + 8) % 9; else c = (c + 1) % 9;
        S.sel = r * 9 + c; paint(); e.preventDefault();
      }
    });
    setInterval(function () {
      var n = Date.now(), active = panelOn() && host.classList.contains('on') && !document.hidden && S.ready && !S.won && !busy;
      if (active) { S.elapsed += n - lastTick; $('sdTime').textContent = fmt(S.elapsed); if (((S.elapsed / 500) | 0) % 20 === 0) save(); }
      lastTick = n;
    }, 500);
    window.addEventListener('beforeunload', save);

    return {
      show: function () {
        if (!S.ready) {
          var g = lsGet('gm_sd_game', null);
          if (g && g.given && g.given.length === 81 && g.sol && g.sol.length === 81) { load(g); lastTick = Date.now(); status(S.won ? 'Ván trước đã hoàn thành — bấm "Ván mới" để chơi tiếp.' : 'Đã nạp lại ván đang chơi dở.', 'info'); paint(); }
          else newGame(S.level);
        } else { lastTick = Date.now(); paint(); }
      }
    };
  }

  /* =================================================================
     CỜ CARO (giao diện)
     ================================================================= */
  function initCaro(host) {
    host.innerHTML =
      '<div class="gm-wrap"><div class="gm-board"><canvas id="gcaro"></canvas></div>' +
      '<div class="gm-side">' +
      '<div class="bar"><label class="note" style="margin:0">Chế độ: <select id="cgMode"><option value="ai">Đấu với máy</option><option value="pvp">2 người chơi chung</option></select></label>' +
      '<label class="note" style="margin:0" id="cgLvBox">Mức độ: <select id="cgLevel"><option value="1">1. Rất dễ</option><option value="2">2. Dễ</option><option value="3">3. Vừa</option><option value="4">4. Khó</option><option value="5">5. Cao thủ</option></select></label></div>' +
      '<div class="bar"><label class="note" style="margin:0" id="cgSideBox">Bạn cầm: <select id="cgSide"><option value="1">X (đi trước)</option><option value="2">O (máy đi trước)</option></select></label>' +
      '<label class="note" style="margin:0">Bàn cờ: <select id="cgSize"><option value="10">10 × 10</option><option value="15">15 × 15</option><option value="19">19 × 19</option></select></label></div>' +
      '<label class="note" style="display:block"><input type="checkbox" id="cgRule"> Luật chặn 2 đầu (hàng 5 quân bị đối phương chặn cả hai đầu thì không tính thắng)</label>' +
      '<div class="bar"><button type="button" id="cgNew">🔄 Ván mới</button><button type="button" class="sec sm" id="cgUndo">↩ Đi lại</button><button type="button" class="sec sm" id="cgHint">💡 Gợi ý nước đi</button></div>' +
      '<div id="cgStatus" class="gm-line" style="font-weight:600"></div>' +
      '<div class="gm-tally"><span>✕ <b id="cgX">0</b></span><span>◯ <b id="cgO">0</b></span><span>Hòa <b id="cgD">0</b></span><button type="button" class="sec sm" id="cgReset">Xóa tỉ số</button></div>' +
      '<div class="note">Luật: hai bên lần lượt đặt quân, X đi trước; ai xếp được <b>5 quân liên tiếp</b> (ngang, dọc hoặc chéo) trước là thắng. Khi bật "chặn 2 đầu", mép bàn cờ không tính là chặn. ' +
      'Mức 1–3 máy đánh theo cảm tính (mức 1 hay bỏ lỡ), mức 4 tính trước 2 nước, mức 5 tính sâu tới 4 nước nên khá khó.</div>' +
      '</div></div>';

    var cv = $('gcaro'), ctx = cv.getContext('2d');
    var cfg = lsGet('gm_caro_cfg', { mode: 'ai', level: 3, size: 15, side: 1, rule: false }), tally = lsGet('gm_caro_tally', { x: 0, o: 0, d: 0 });
    var eng = null, hist = [], over = false, winCells = null, thinking = false, hint = -1, hover = -1, round = 0, hintT = 0;
    $('cgMode').value = cfg.mode; $('cgLevel').value = String(cfg.level); $('cgSize').value = String(cfg.size); $('cgSide').value = String(cfg.side); $('cgRule').checked = !!cfg.rule;

    function turn() { return hist.length % 2 === 0 ? 1 : 2; }
    function saveCfg() { lsSet('gm_caro_cfg', cfg); }
    function showTally() { $('cgX').textContent = tally.x; $('cgO').textContent = tally.o; $('cgD').textContent = tally.d; }
    function syncUi() { var ai = cfg.mode === 'ai'; $('cgLvBox').style.display = ai ? '' : 'none'; $('cgSideBox').style.display = ai ? '' : 'none'; $('cgHint').style.display = ai ? '' : 'none'; }
    function who(p) { return p === 1 ? 'X ✕' : 'O ◯'; }
    function statusText() {
      var t = turn(), s;
      if (over) return $('cgStatus').textContent;
      if (thinking) s = '🤖 Máy đang nghĩ…';
      else if (cfg.mode === 'ai') s = t === cfg.side ? '👉 Đến lượt bạn (' + who(t) + ')' : '🤖 Lượt của máy (' + who(t) + ')';
      else s = '👉 Lượt của ' + who(t);
      return s;
    }
    function setStatus(txt) { $('cgStatus').textContent = txt == null ? statusText() : txt; }

    function draw() {
      if (!eng) return; var S = cv.clientWidth; if (!S) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), px = Math.round(S * dpr);
      if (cv.width !== px) { cv.width = px; cv.height = px; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = eng.N, c = S / n, B = eng.B, k, x, y;
      ctx.fillStyle = '#0f1a2e'; ctx.fillRect(0, 0, S, S);
      if (hist.length) { var lm = hist[hist.length - 1]; ctx.fillStyle = 'rgba(250,204,21,.18)'; ctx.fillRect((lm % n) * c, ((lm / n) | 0) * c, c, c); }
      if (winCells) { ctx.fillStyle = 'rgba(250,204,21,.45)'; for (k = 0; k < winCells.length; k++) ctx.fillRect((winCells[k] % n) * c, ((winCells[k] / n) | 0) * c, c, c); }
      ctx.strokeStyle = '#26375a'; ctx.lineWidth = 1; ctx.beginPath();
      for (k = 0; k <= n; k++) { ctx.moveTo(k * c, 0); ctx.lineTo(k * c, S); ctx.moveTo(0, k * c); ctx.lineTo(S, k * c); }
      ctx.stroke();
      ctx.lineCap = 'round';
      function mark(i, p, alpha) {
        var cx = (i % n + 0.5) * c, cy = (((i / n) | 0) + 0.5) * c; ctx.globalAlpha = alpha; ctx.lineWidth = Math.max(2, c * 0.11);
        if (p === 1) { var m = c * 0.24; ctx.strokeStyle = '#fb7185'; ctx.beginPath(); ctx.moveTo(cx - m, cy - m); ctx.lineTo(cx + m, cy + m); ctx.moveTo(cx + m, cy - m); ctx.lineTo(cx - m, cy + m); ctx.stroke(); }
        else { ctx.strokeStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(cx, cy, c * 0.29, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      for (k = 0; k < n * n; k++) if (B[k]) mark(k, B[k], 1);
      if (hover >= 0 && !B[hover] && !over && !thinking && (cfg.mode === 'pvp' || turn() === cfg.side)) mark(hover, turn(), 0.35);
      if (hint >= 0) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.strokeRect((hint % n) * c + 2, ((hint / n) | 0) * c + 2, c - 4, c - 4); }
    }

    function finish(msg, winner) {
      over = true; setStatus(msg);
      if (winner === 1) tally.x++; else if (winner === 2) tally.o++; else tally.d++;
      lsSet('gm_caro_tally', tally); showTally(); draw();
      if (winner && cfg.mode === 'ai' && winner !== cfg.side) Au.lose(); else if (winner) { Au.win(); confetti(); }
    }
    function play(i) {
      var p = turn(); eng.place(i, p); hist.push(i); hint = -1; Au.stone(p);
      var w = eng.winAt(i, p);
      if (w) { winCells = w; finish(cfg.mode === 'ai' ? (p === cfg.side ? '🎉 Bạn thắng rồi! (' + who(p) + ')' : '🤖 Máy thắng (' + who(p) + '). Thử lại nhé!') : '🎉 ' + who(p) + ' thắng!', p); return; }
      if (hist.length >= eng.N * eng.N) { finish('🤝 Hòa — bàn cờ đã đầy.', 0); return; }
      draw(); setStatus(); maybeAI();
    }
    function maybeAI() {
      if (cfg.mode !== 'ai' || over || turn() === cfg.side) return;
      thinking = true; setStatus(); var my = round;
      setTimeout(function () {
        if (my !== round || over) return;
        var i; try { i = eng.aiMove(cfg.level, turn()); } catch (e) { console.error(e); i = -1; }
        thinking = false;
        if (i >= 0) play(i); else finish('🤝 Hòa — bàn cờ đã đầy.', 0);
      }, 120);
    }
    function newRound() {
      round++; eng = CaroEngine(cfg.size, cfg.rule); hist = []; over = false; winCells = null; thinking = false; hint = -1; hover = -1;
      syncUi(); draw(); setStatus(); maybeAI();
    }
    cv.addEventListener('click', function (e) {
      Au.unlock(); if (!eng || over || thinking) return;
      if (cfg.mode === 'ai' && turn() !== cfg.side) return;
      var r = cv.getBoundingClientRect(), n = eng.N, x = Math.floor((e.clientX - r.left) / r.width * n), y = Math.floor((e.clientY - r.top) / r.height * n);
      if (x < 0 || y < 0 || x >= n || y >= n) return; var i = y * n + x; if (eng.B[i]) return; play(i);
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !eng) return;
      var r = cv.getBoundingClientRect(), n = eng.N, x = Math.floor((e.clientX - r.left) / r.width * n), y = Math.floor((e.clientY - r.top) / r.height * n);
      var h = (x >= 0 && y >= 0 && x < n && y < n) ? y * n + x : -1; if (h !== hover) { hover = h; draw(); }
    });
    cv.addEventListener('pointerleave', function () { if (hover !== -1) { hover = -1; draw(); } });

    $('cgNew').addEventListener('click', function () { Au.unlock(); newRound(); });
    $('cgUndo').addEventListener('click', function () {
      if (thinking || over || !hist.length) return;
      var last = hist.pop(); eng.unplace(last);
      if (cfg.mode === 'ai') { while (hist.length && turn() !== cfg.side) { eng.unplace(hist.pop()); } }
      hint = -1; draw(); setStatus(); maybeAI();
    });
    $('cgHint').addEventListener('click', function () {
      if (thinking || over || !eng || (cfg.mode === 'ai' && turn() !== cfg.side)) return;
      $('cgHint').disabled = true; setStatus('💡 Đang tìm nước đi tốt…');
      setTimeout(function () {
        try { hint = eng.aiMove(4, turn()); } catch (e) { hint = -1; }
        $('cgHint').disabled = false; setStatus(); draw(); clearTimeout(hintT); hintT = setTimeout(function () { hint = -1; draw(); }, 2500);
      }, 30);
    });
    $('cgReset').addEventListener('click', function () { tally = { x: 0, o: 0, d: 0 }; lsSet('gm_caro_tally', tally); showTally(); });
    function bindCfg(id, key, num, boolean, restart) {
      $(id).addEventListener('change', function () {
        cfg[key] = boolean ? $(id).checked : (num ? +$(id).value : $(id).value); saveCfg();
        if (restart) newRound(); else { syncUi(); }
      });
    }
    bindCfg('cgMode', 'mode', false, false, true); bindCfg('cgLevel', 'level', true, false, false);
    bindCfg('cgSide', 'side', true, false, true); bindCfg('cgSize', 'size', true, false, true); bindCfg('cgRule', 'rule', false, true, true);
    $('cgLevel').addEventListener('change', function () { setStatus(); });

    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { draw(); }).observe(cv);
    window.addEventListener('resize', draw);
    showTally();

    return { show: function () { if (!eng) newRound(); else { draw(); setStatus(); } } };
  }

  /* =================================================================
     CỜ VUA & CỜ TƯỚNG (giao diện) — một bộ điều khiển chung, mỗi cờ chỉ khai báo cách vẽ + luật
     ================================================================= */
  var CH_FONT = '"Segoe UI Symbol","Noto Sans Symbols 2","Apple Symbols","DejaVu Sans","Arial Unicode MS",sans-serif';
  var XQ_FONT = '"Noto Serif CJK SC","Songti SC","KaiTi","SimSun","Microsoft YaHei","PingFang SC",serif';
  var XQ_RED = ['', '兵', '炮', '俥', '傌', '相', '仕', '帥'], XQ_BLK = ['', '卒', '砲', '車', '馬', '象', '士', '將'];

  function drawChess(ctx, W, H, v) {
    var c = W / 8, e = v.eng, fl = v.flip, r, cl, sq, p, t, o, k, m, g, xy;
    function pos(s) { var rr = s >> 3, cc = s & 7; if (fl) { rr = 7 - rr; cc = 7 - cc; } return [cc * c, rr * c]; }
    for (r = 0; r < 8; r++) for (cl = 0; cl < 8; cl++) { ctx.fillStyle = ((r + cl) & 1) ? '#b58863' : '#f0d9b5'; ctx.fillRect(cl * c, r * c, c, c); }
    ctx.font = '600 ' + Math.max(9, c * 0.19) + 'px "Segoe UI",Arial,sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    for (cl = 0; cl < 8; cl++) { ctx.fillStyle = (7 + cl) & 1 ? '#f0d9b5' : '#b58863'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('abcdefgh'.charAt(fl ? 7 - cl : cl), (cl + 1) * c - c * 0.05, W - c * 0.03); }
    for (r = 0; r < 8; r++) { ctx.fillStyle = r & 1 ? '#f0d9b5' : '#b58863'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(String(fl ? r + 1 : 8 - r), c * 0.05, r * c + c * 0.03); }
    function fillSq(s, col) { xy = pos(s); ctx.fillStyle = col; ctx.fillRect(xy[0], xy[1], c, c); }
    if (v.last) { fillSq(v.last.f, 'rgba(250,204,21,.45)'); fillSq(v.last.t, 'rgba(250,204,21,.45)'); }
    if (v.sel >= 0) fillSq(v.sel, 'rgba(56,189,248,.6)');
    if (v.check >= 0) {
      xy = pos(v.check); g = ctx.createRadialGradient(xy[0] + c / 2, xy[1] + c / 2, c * 0.1, xy[0] + c / 2, xy[1] + c / 2, c * 0.6);
      g.addColorStop(0, 'rgba(239,68,68,.95)'); g.addColorStop(1, 'rgba(239,68,68,0)'); ctx.fillStyle = g; ctx.fillRect(xy[0], xy[1], c, c);
    }
    if (v.hint) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = Math.max(3, c * 0.07); [v.hint.f, v.hint.t].forEach(function (s) { var q = pos(s); ctx.strokeRect(q[0] + 2, q[1] + 2, c - 4, c - 4); }); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = Math.round(c * 0.84) + 'px ' + CH_FONT; ctx.lineJoin = 'round';
    for (sq = 0; sq < 64; sq++) {
      p = e.at(sq); if (!p) continue; t = p > 0 ? p : -p; xy = pos(sq);
      o = CH_FIG[0][t] + '\uFE0E';
      if (p > 0) { ctx.lineWidth = c * 0.06; ctx.strokeStyle = '#1f2937'; ctx.strokeText(o, xy[0] + c / 2, xy[1] + c * 0.54); ctx.fillStyle = '#ffffff'; }
      else { ctx.lineWidth = c * 0.03; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.strokeText(o, xy[0] + c / 2, xy[1] + c * 0.54); ctx.fillStyle = '#111827'; }
      ctx.fillText(o, xy[0] + c / 2, xy[1] + c * 0.54);
    }
    for (k = 0; k < v.targets.length; k++) {
      m = v.targets[k]; xy = pos(m.t);
      if (e.at(m.t) || m.fl === 1) { ctx.strokeStyle = 'rgba(239,68,68,.9)'; ctx.lineWidth = c * 0.08; ctx.beginPath(); ctx.arc(xy[0] + c / 2, xy[1] + c / 2, c * 0.44, 0, 6.2832); ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(34,197,94,.8)'; ctx.beginPath(); ctx.arc(xy[0] + c / 2, xy[1] + c / 2, c * 0.16, 0, 6.2832); ctx.fill(); }
    }
  }

  function drawXiangqi(ctx, W, H, v) {
    var s = W / 9, mg = s * 0.5, e = v.eng, fl = v.flip, r, c, sq, p, t, k, m, xy, gp, ln;
    function px(cc) { return mg + cc * s; } function py(rr) { return mg + rr * s; }
    function pos(q) { var rr = (q / 9) | 0, cc = q % 9; if (fl) { rr = 9 - rr; cc = 8 - cc; } return [px(cc), py(rr)]; }
    ctx.fillStyle = '#e8c98a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#6b431c'; ctx.lineWidth = Math.max(1.2, s * 0.03); ctx.lineCap = 'round';
    ctx.beginPath();
    for (r = 0; r < 10; r++) { ctx.moveTo(px(0), py(r)); ctx.lineTo(px(8), py(r)); }
    ctx.moveTo(px(0), py(0)); ctx.lineTo(px(0), py(9)); ctx.moveTo(px(8), py(0)); ctx.lineTo(px(8), py(9));
    for (c = 1; c < 8; c++) { ctx.moveTo(px(c), py(0)); ctx.lineTo(px(c), py(4)); ctx.moveTo(px(c), py(5)); ctx.lineTo(px(c), py(9)); }
    ctx.moveTo(px(3), py(0)); ctx.lineTo(px(5), py(2)); ctx.moveTo(px(5), py(0)); ctx.lineTo(px(3), py(2));
    ctx.moveTo(px(3), py(7)); ctx.lineTo(px(5), py(9)); ctx.moveTo(px(5), py(7)); ctx.lineTo(px(3), py(9));
    gp = s * 0.09; ln = s * 0.2;
    [[2, 1], [2, 7], [7, 1], [7, 7], [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]].forEach(function (q) {
      [-1, 1].forEach(function (dx) { [-1, 1].forEach(function (dy) {
        if ((q[1] === 0 && dx < 0) || (q[1] === 8 && dx > 0)) return;
        var x0 = px(q[1]) + dx * gp, y0 = py(q[0]) + dy * gp;
        ctx.moveTo(x0 + dx * ln, y0); ctx.lineTo(x0, y0); ctx.lineTo(x0, y0 + dy * ln);
      }); });
    });
    ctx.stroke();
    ctx.strokeRect(px(0) - s * 0.09, py(0) - s * 0.09, 8 * s + s * 0.18, 9 * s + s * 0.18);
    ctx.fillStyle = 'rgba(107,67,28,.75)'; ctx.font = 'italic 700 ' + Math.round(s * 0.5) + 'px ' + XQ_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('楚 河', px(2), py(4.5)); ctx.fillText('漢 界', px(6), py(4.5));
    function ring(q, col) { var a = pos(q); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a[0], a[1], s * 0.5, 0, 6.2832); ctx.fill(); }
    if (v.last) { ring(v.last.f, 'rgba(250,204,21,.5)'); ring(v.last.t, 'rgba(250,204,21,.5)'); }
    if (v.check >= 0) ring(v.check, 'rgba(239,68,68,.6)');
    if (v.hint) { [v.hint.f, v.hint.t].forEach(function (q) { var a = pos(q); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = Math.max(3, s * 0.07); ctx.beginPath(); ctx.arc(a[0], a[1], s * 0.5, 0, 6.2832); ctx.stroke(); }); }
    for (sq = 0; sq < 90; sq++) {
      p = e.at(sq); if (!p) continue; t = p > 0 ? p : -p; xy = pos(sq);
      ctx.beginPath(); ctx.arc(xy[0], xy[1] + s * 0.03, s * 0.44, 0, 6.2832); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
      ctx.beginPath(); ctx.arc(xy[0], xy[1], s * 0.44, 0, 6.2832); ctx.fillStyle = '#fbeac0'; ctx.fill();
      ctx.lineWidth = s * 0.035; ctx.strokeStyle = '#7a4a1e'; ctx.stroke();
      ctx.beginPath(); ctx.arc(xy[0], xy[1], s * 0.36, 0, 6.2832); ctx.lineWidth = s * 0.022; ctx.strokeStyle = p > 0 ? '#c0261b' : '#1f2937'; ctx.stroke();
      ctx.fillStyle = p > 0 ? '#c0261b' : '#1f2937'; ctx.font = '700 ' + Math.round(s * 0.5) + 'px ' + XQ_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((p > 0 ? XQ_RED : XQ_BLK)[t], xy[0], xy[1] + s * 0.03);
      if (sq === v.sel) { ctx.beginPath(); ctx.arc(xy[0], xy[1], s * 0.48, 0, 6.2832); ctx.lineWidth = s * 0.07; ctx.strokeStyle = '#38bdf8'; ctx.stroke(); }
    }
    for (k = 0; k < v.targets.length; k++) {
      m = v.targets[k]; xy = pos(m.t);
      if (e.at(m.t)) { ctx.strokeStyle = 'rgba(239,68,68,.95)'; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.arc(xy[0], xy[1], s * 0.48, 0, 6.2832); ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(22,163,74,.85)'; ctx.beginPath(); ctx.arc(xy[0], xy[1], s * 0.14, 0, 6.2832); ctx.fill(); }
    }
  }

  var CH_UI = {
    id: 'ch', aspect: '1 / 1', create: function () { return ChessEngine(); }, sideNames: ['Trắng', 'Đen'], checkWord: 'Chiếu Vua!',
    draw: drawChess,
    sqAt: function (x, y, w, h, fl) { var cl = Math.floor(x / w * 8), r = Math.floor(y / h * 8); if (cl < 0 || cl > 7 || r < 0 || r > 7) return -1; if (fl) { r = 7 - r; cl = 7 - cl; } return r * 8 + cl; },
    promoLabel: function (m) { return ['', '', '♘ Mã', '♗ Tượng', '♖ Xe', '♕ Hậu'][m.pr]; },
    note: 'Bấm quân rồi bấm ô đích (chấm xanh = nước đi hợp lệ, vòng đỏ = ăn quân). Đủ luật: nhập thành, bắt tốt qua đường, phong cấp (tốt tới hàng cuối sẽ hỏi chọn quân). ' +
      'Hòa khi: hết nước đi mà không bị chiếu, lặp lại thế cờ 3 lần, 50 nước không bắt quân/đi tốt, hoặc không đủ quân để chiếu hết. ' +
      'Mức 1 đi ngẫu nhiên; mức 2–3 nhìn nông; mức 4 tính trước ~3 nước; mức 5 tìm sâu dần (giới hạn khoảng 1,6 giây/nước) nên khá mạnh.'
  };
  var XQ_UI = {
    id: 'xq', aspect: '9 / 10', create: function () { return XiangqiEngine(); }, sideNames: ['Đỏ', 'Đen'], checkWord: 'Chiếu tướng!',
    draw: drawXiangqi,
    sqAt: function (x, y, w, h, fl) {
      var s = w / 9, mg = s * 0.5, cl = Math.round((x - mg) / s), r = Math.round((y - mg) / s);
      if (cl < 0 || cl > 8 || r < 0 || r > 9) return -1;
      if (Math.abs(x - (mg + cl * s)) > s * 0.5 || Math.abs(y - (mg + r * s)) > s * 0.5) return -1;
      if (fl) { r = 9 - r; cl = 8 - cl; } return r * 9 + cl;
    },
    promoLabel: function () { return ''; },
    note: 'Bấm quân rồi bấm nơi muốn đến (chấm xanh = đi được, vòng đỏ = ăn quân). Tướng và Sĩ đi trong cung; Tượng đi chéo 2 ô, không qua sông và bị cản nếu có quân ở "mắt tượng"; ' +
      'Mã đi chữ L nhưng bị cản chân; Xe đi thẳng; Pháo đi như Xe nhưng muốn ăn quân phải nhảy qua đúng một quân; Tốt đi tới 1 ô, qua sông được đi ngang; hai Tướng không được đối mặt trực tiếp. ' +
      'Hết nước đi là thua. Bản đơn giản: lặp lại thế cờ 3 lần hoặc 60 nước không ăn quân thì hòa (chưa áp dụng luật chiếu liên tục của thi đấu chuyên nghiệp). Đỏ đi trước.'
  };

  function initBoardGame(host, G) {
    var p = G.id, sn = G.sideNames, lvOpts = '<option value="1">1. Rất dễ</option><option value="2">2. Dễ</option><option value="3">3. Vừa</option><option value="4">4. Khó</option><option value="5">5. Cao thủ</option>';
    host.innerHTML =
      '<div class="gm-wrap"><div class="gm-board"><div class="bg-stage"><canvas id="' + p + 'Cv" class="bg-cv" style="aspect-ratio:' + G.aspect + '"></canvas><div class="bg-promo" id="' + p + 'Promo"></div></div></div>' +
      '<div class="gm-side">' +
      '<div class="bar"><label class="note" style="margin:0">Chế độ: <select id="' + p + 'Mode"><option value="ai">Đấu với máy</option><option value="pvp">2 người chơi chung</option></select></label>' +
      '<label class="note" style="margin:0" id="' + p + 'LvBox">Mức độ: <select id="' + p + 'Level">' + lvOpts + '</select></label></div>' +
      '<div class="bar"><label class="note" style="margin:0" id="' + p + 'SideBox">Bạn cầm: <select id="' + p + 'Side"><option value="1">' + sn[0] + ' (đi trước)</option><option value="-1">' + sn[1] + ' (máy đi trước)</option></select></label></div>' +
      '<div class="bar"><button type="button" id="' + p + 'New">🔄 Ván mới</button><button type="button" class="sec sm" id="' + p + 'Undo">↩ Đi lại</button>' +
      '<button type="button" class="sec sm" id="' + p + 'Hint">💡 Gợi ý</button><button type="button" class="sec sm" id="' + p + 'Flip">🔃 Lật bàn</button></div>' +
      '<div id="' + p + 'Status" class="gm-line" style="font-weight:600"></div>' +
      '<div class="gm-tally"><span>' + sn[0] + ' <b id="' + p + 'A">0</b></span><span>' + sn[1] + ' <b id="' + p + 'B">0</b></span><span>Hòa <b id="' + p + 'D">0</b></span><button type="button" class="sec sm" id="' + p + 'Reset">Xóa tỉ số</button></div>' +
      '<div class="bg-moves" id="' + p + 'Moves"></div>' +
      '<div class="note">' + G.note + '</div></div></div>';

    var cv = $(p + 'Cv'), ctx = cv.getContext('2d');
    var cfg = lsGet('gm_' + p + '_cfg', { mode: 'ai', level: 3, side: 1 }), tally = lsGet('gm_' + p + '_tally', { a: 0, b: 0, d: 0 });
    if (cfg.mode !== 'ai' && cfg.mode !== 'pvp') cfg.mode = 'ai';
    if (!(cfg.level >= 1 && cfg.level <= 5)) cfg.level = 3;
    if (cfg.side !== 1 && cfg.side !== -1) cfg.side = 1;
    var eng = null, sel = -1, legal = [], targets = [], over = false, thinking = false, hint = null, round = 0, flip = false, hintT = 0, msg = '', chkSq = -1;
    $(p + 'Mode').value = cfg.mode; $(p + 'Level').value = String(cfg.level); $(p + 'Side').value = String(cfg.side);

    function saveCfg() { lsSet('gm_' + p + '_cfg', cfg); }
    function showTally() { $(p + 'A').textContent = tally.a; $(p + 'B').textContent = tally.b; $(p + 'D').textContent = tally.d; }
    function syncUi() { var ai = cfg.mode === 'ai'; $(p + 'LvBox').style.display = ai ? '' : 'none'; $(p + 'SideBox').style.display = ai ? '' : 'none'; }
    function who(t) { return sn[t > 0 ? 0 : 1]; }
    function setStatus(txt) {
      var t, s;
      if (txt == null) {
        t = eng.turn();
        if (thinking) s = '🤖 Máy đang nghĩ…';
        else if (cfg.mode === 'ai') s = (t === cfg.side ? '👉 Đến lượt bạn (' : '🤖 Lượt của máy (') + who(t) + ')';
        else s = '👉 Lượt của ' + who(t);
        if (chkSq >= 0 && !thinking) s += ' — ⚠ ' + G.checkWord;
        txt = s;
      }
      $(p + 'Status').textContent = txt;
    }
    function listMoves() {
      var n = eng.names(), h = '', i, el = $(p + 'Moves');
      for (i = 0; i < n.length; i++) { if (i % 2 === 0) h += '<b>' + (i / 2 + 1) + '.</b> '; h += esc(n[i]) + (i % 2 ? ' &nbsp; ' : ' '); }
      el.innerHTML = h || '<i style="color:var(--mut)">Chưa có nước đi</i>'; el.scrollTop = el.scrollHeight;
    }
    function draw() {
      if (!eng) return; var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      G.draw(ctx, W, H, { eng: eng, flip: flip, sel: sel, targets: targets, last: eng.last(), hint: hint, check: chkSq });
    }
    function refresh() { var s = eng.status(); legal = s.over ? [] : eng.legal(); chkSq = eng.checked() ? eng.kingSq(eng.turn()) : -1; return s; }
    function hidePromo() { $(p + 'Promo').classList.remove('on'); }

    function finish(s) {
      var w = s.winner, txt;
      over = true; sel = -1; targets = [];
      if (!w) txt = '🤝 Hòa — ' + s.reason + '.';
      else if (cfg.mode === 'ai') txt = w === cfg.side ? '🎉 Bạn thắng! (' + s.reason + ')' : '🤖 Máy thắng (' + s.reason + '). Thử lại nhé!';
      else txt = '🎉 ' + who(w) + ' thắng — ' + s.reason + '!';
      msg = txt; setStatus(txt);
      if (w === 1) tally.a++; else if (w === -1) tally.b++; else tally.d++;
      lsSet('gm_' + p + '_tally', tally); showTally(); draw();
      if (w && cfg.mode === 'ai' && w !== cfg.side) Au.lose(); else if (w) { Au.win(); confetti(); }
    }
    function doMove(m) {
      var mover = eng.turn(), s;
      eng.play(m); sel = -1; targets = []; hint = null; clearTimeout(hintT); hidePromo();
      Au.stone(mover > 0 ? 1 : 2);
      s = refresh(); listMoves();
      if (s.over) { finish(s); return; }
      draw(); setStatus(); maybeAI();
    }
    function maybeAI() {
      if (cfg.mode !== 'ai' || over || eng.turn() === cfg.side) return;
      thinking = true; setStatus(); var my = round;
      setTimeout(function () {
        if (my !== round || over) return;
        var m = null; try { m = eng.ai(cfg.level); } catch (e) { console.error(e); }
        thinking = false;
        if (m) doMove(m); else { var s = refresh(); if (s.over) finish(s); }
      }, 80);
    }
    function newRound() {
      round++; eng = G.create(); over = false; thinking = false; sel = -1; targets = []; hint = null; msg = ''; hidePromo(); clearTimeout(hintT);
      flip = cfg.mode === 'ai' && cfg.side === -1; refresh(); syncUi(); listMoves(); draw(); setStatus(); maybeAI();
    }
    function showPromo(cands) {
      var box = $(p + 'Promo'); box.innerHTML = '<span>Phong quân thành:</span>';
      cands.slice().sort(function (a, b) { return b.pr - a.pr; }).forEach(function (m) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'sec'; b.textContent = G.promoLabel(m);
        b.addEventListener('click', function (ev) { ev.stopPropagation(); doMove(m); }); box.appendChild(b);
      });
      box.classList.add('on');
    }

    cv.addEventListener('click', function (e) {
      Au.unlock(); hidePromo(); if (!eng || over || thinking) return;
      if (cfg.mode === 'ai' && eng.turn() !== cfg.side) return;
      var r = cv.getBoundingClientRect(), sq = G.sqAt(e.clientX - r.left, e.clientY - r.top, r.width, r.height, flip), cands = [], pc;
      if (sq < 0) return;
      if (sel >= 0) cands = targets.filter(function (m) { return m.t === sq; });
      if (cands.length === 1) { doMove(cands[0]); return; }
      if (cands.length > 1) { showPromo(cands); return; }
      pc = eng.at(sq);
      if (pc && (pc > 0) === (eng.turn() > 0) && sq !== sel) { sel = sq; targets = legal.filter(function (m) { return m.f === sq; }); }
      else { sel = -1; targets = []; }
      draw();
    });
    $(p + 'New').addEventListener('click', function () { Au.unlock(); newRound(); });
    $(p + 'Undo').addEventListener('click', function () {
      if (thinking || over || !eng.count()) return;
      eng.undo();
      if (cfg.mode === 'ai') { while (eng.count() && eng.turn() !== cfg.side) eng.undo(); }
      sel = -1; targets = []; hint = null; hidePromo(); refresh(); listMoves(); draw(); setStatus(); maybeAI();
    });
    $(p + 'Hint').addEventListener('click', function () {
      if (thinking || over || !eng || (cfg.mode === 'ai' && eng.turn() !== cfg.side)) return;
      var b = $(p + 'Hint'); b.disabled = true; setStatus('💡 Đang tìm nước đi tốt…');
      setTimeout(function () {
        var m = null; try { m = eng.ai(4); } catch (e) { console.error(e); }
        b.disabled = false; hint = m ? { f: m.f, t: m.t } : null; setStatus(); draw();
        clearTimeout(hintT); hintT = setTimeout(function () { hint = null; draw(); }, 3000);
      }, 30);
    });
    $(p + 'Flip').addEventListener('click', function () { flip = !flip; draw(); });
    $(p + 'Reset').addEventListener('click', function () { tally = { a: 0, b: 0, d: 0 }; lsSet('gm_' + p + '_tally', tally); showTally(); });
    $(p + 'Mode').addEventListener('change', function () { cfg.mode = $(p + 'Mode').value; saveCfg(); newRound(); });
    $(p + 'Level').addEventListener('change', function () { cfg.level = +$(p + 'Level').value; saveCfg(); });
    $(p + 'Side').addEventListener('change', function () { cfg.side = +$(p + 'Side').value; saveCfg(); newRound(); });

    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { draw(); }).observe(cv);
    window.addEventListener('resize', draw);
    showTally();
    return { show: function () { if (!eng) newRound(); else { draw(); setStatus(over ? msg : null); } } };
  }

  /* =================================================================
     PIKACHU — NỐI THÚ (giao diện)
     ================================================================= */
  function initPikachu(host) {
    host.innerHTML =
      '<div class="gm-wrap"><div class="gm-board pk-board"><div class="pk-stage" id="pkStage">' +
      '<div class="pk-hud"><span>⚡ Màn <b id="pkLv">1</b></span><span>⭐ <b id="pkScore">0</b></span><span>🔥 Combo <b id="pkCombo">0</b></span><span class="pk-sp"></span>' +
      '<button type="button" class="sec sm" id="pkFull" title="Toàn màn hình">⛶</button><button type="button" class="sec sm" id="pkPause" title="Tạm dừng (P)">⏸</button></div>' +
      '<div class="pk-time"><i id="pkTbar"></i><b id="pkTtxt">0:00</b></div>' +
      '<div class="pk-info" id="pkInfo"></div>' +
      '<div class="pk-cvwrap" id="pkWrap"><canvas id="pkCv"></canvas>' +
      '<div class="fr-overlay on" id="pkMenuOv"><div class="box" style="max-height:100%;overflow:auto;width:100%;max-width:440px"><h3>⚡ Pikachu — Nối thú</h3>' +
      '<p>Nối 2 con thú giống nhau bằng đường có tối đa 2 góc rẽ. Chọn màn để chơi:</p><div class="pk-lvgrid" id="pkLvGrid"></div>' +
      '<div class="bar" style="justify-content:center"><button type="button" class="sec sm" id="pkUnlock">🔓 Mở tất cả màn</button></div></div></div>' +
      '<div class="fr-overlay" id="pkWinOv"><div class="box"><h3>🎉 Hoàn thành màn <span id="pkWinLv"></span>!</h3><div class="pk-stars" id="pkWinStars"></div>' +
      '<p id="pkWinTxt"></p><div class="bar" style="justify-content:center"><button type="button" id="pkNext">▶ Màn tiếp</button><button type="button" class="sec" id="pkAgain1">🔄 Chơi lại</button><button type="button" class="sec" id="pkMenu1">🗺 Chọn màn</button></div></div></div>' +
      '<div class="fr-overlay" id="pkLoseOv"><div class="box"><h3>⏰ Hết giờ!</h3><p id="pkLoseTxt"></p><div class="bar" style="justify-content:center"><button type="button" id="pkAgain2">🔄 Thử lại</button><button type="button" class="sec" id="pkMenu2">🗺 Chọn màn</button></div></div></div>' +
      '<div class="fr-overlay" id="pkPauseOv"><div class="box"><h3>⏸ Tạm dừng</h3><div class="bar" style="justify-content:center"><button type="button" id="pkResume">▶ Tiếp tục</button><button type="button" class="sec" id="pkMenu3">🗺 Chọn màn</button></div></div></div>' +
      '</div>' +
      '<div class="pk-tools"><button type="button" id="pkHint">💡 Gợi ý (<b id="pkHn">3</b>)</button><button type="button" id="pkShuf">🔀 Đảo bàn (<b id="pkSn">3</b>)</button>' +
      '<button type="button" class="sec" id="pkMenu">🗺 Chọn màn</button><button type="button" class="sec" id="pkRetry">🔄 Chơi lại</button></div>' +
      '</div></div>' +
      '<div class="gm-side"><div id="pkMsg" class="status info"></div>' +
      '<div class="gm-line">🏆 Màn đã mở: <b id="pkOpen">1</b>/' + PK_LEVELS.length + ' &nbsp;·&nbsp; ⭐ Tổng sao: <b id="pkStarSum">0</b></div>' +
      '<div class="note">Cách chơi: bấm 2 con thú <b>giống nhau</b> sao cho nối được bằng đường thẳng có <b>tối đa 2 góc rẽ</b>, không đi qua ô còn thú (được đi vòng ngoài bàn). Nối đúng được cộng giờ và điểm; nối liên tiếp trong ~4 giây để có <b>combo</b>. ' +
      'Từ màn 4, sau mỗi lần nối các ô còn lại sẽ <b>rơi/dồn</b> theo hướng của màn nên hãy tính trước. Hết nước đi máy tự đảo bàn miễn phí. Mỗi màn có 3 lượt gợi ý và 3 lượt đảo bàn. ' +
      'Sao: còn ≥50% thời gian = 3★, ≥25% = 2★, còn lại 1★. Phím tắt: <b>H</b> gợi ý, <b>S</b> đảo bàn, <b>P</b> tạm dừng, <b>Esc</b> thoát toàn màn hình. Bấm ⛶ để chơi toàn màn hình cho bàn to nhất.</div>' +
      '<div class="bar"><button type="button" class="sec sm" id="pkReset">Xóa tiến trình</button></div>' +
      '</div></div>';

    var cfg = lsGet('gm_pk', { unlocked: 1, stars: {}, hi: {} });
    if (!cfg || typeof cfg !== 'object') cfg = { unlocked: 1, stars: {}, hi: {} };
    cfg.unlocked = Math.max(1, Math.min(PK_LEVELS.length, +cfg.unlocked || 1)); cfg.stars = cfg.stars || {}; cfg.hi = cfg.hi || {};
    var stage = $('pkStage'), wrap = $('pkWrap'), cv = $('pkCv'), ctx = cv.getContext('2d');
    var li = 1, L = PK_LEVELS[0], R = 0, C = 0, R2 = 0, C2 = 0, g = null, icons = [], remain = 0;
    var w = 40, h = 46, padX = 20, padY = 23, cssW = 0, cssH = 0, dpr = 1;
    var state = 'menu', busy = false, sel = -1, pathAnim = null, hint = null, score = 0, combo = 0, lastMatch = 0;
    var tLeft = 0, tTotal = 1, hints = 0, shufs = 0, raf = 0, lastTick = performance.now(), full = false, token = 0, msgT = 0;
    var OVS = ['pkMenuOv', 'pkWinOv', 'pkLoseOv', 'pkPauseOv'];

    function showOv(id) { OVS.forEach(function (k) { $(k).classList.toggle('on', k === id); }); }
    function msg(t, k) { var e = $('pkMsg'); e.textContent = t || ''; e.className = 'status ' + (k || 'info'); clearTimeout(msgT); if (t && k !== 'ok') msgT = setTimeout(function () { e.textContent = ''; }, 3200); }
    function starStr(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
    function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function sumStars() { var s = 0, k; for (k in cfg.stars) s += cfg.stars[k] || 0; return s; }
    function save() { lsSet('gm_pk', cfg); }

    function buildMenu() {
      var html = '', n, st;
      for (n = 1; n <= PK_LEVELS.length; n++) {
        st = cfg.stars[n] || 0;
        html += '<button type="button" class="pk-lv' + (n <= cfg.unlocked ? '' : ' sec') + '" data-l="' + n + '"' + (n > cfg.unlocked ? ' disabled' : '') + ' title="' + esc(PK_LEVELS[n - 1].n) + '"><b>' + (n > cfg.unlocked ? '🔒' : n) + '</b><small>' + (st ? starStr(st) : '&nbsp;') + '</small></button>';
      }
      $('pkLvGrid').innerHTML = html;
      $('pkOpen').textContent = cfg.unlocked; $('pkStarSum').textContent = sumStars();
    }
    function setHud() {
      $('pkLv').textContent = li; $('pkScore').textContent = score; $('pkCombo').textContent = combo > 1 ? 'x' + combo : '0';
      $('pkHn').textContent = hints; $('pkSn').textContent = shufs;
      $('pkHint').disabled = hints <= 0; $('pkShuf').disabled = shufs <= 0;
      $('pkInfo').textContent = L ? ('Màn ' + li + ' · ' + L.n + ' · ' + R + '×' + C + ' · ' + PK_GRAV[L.g]) : '';
    }
    function setTime() {
      var p = Math.max(0, Math.min(1, tLeft / tTotal));
      $('pkTbar').style.width = (p * 100) + '%'; $('pkTbar').classList.toggle('low', p < 0.2);
      $('pkTtxt').textContent = fmt(tLeft);
    }

    /* ----- Kích thước & vẽ ----- */
    function layout() {
      if (!g) return;
      var aw = wrap.clientWidth; if (aw < 60) return;
      var ah = full ? wrap.clientHeight : Math.max(320, window.innerHeight * 0.86);
      if (ah < 120) ah = 320;
      var w0 = Math.floor(aw / (C + 1)), h0 = Math.floor(ah / (R + 1));
      var hh = Math.min(h0, Math.round(w0 * 1.25)), ww = Math.min(w0, Math.round(hh * 1.15));
      w = Math.max(24, Math.min(84, ww)); h = Math.max(28, Math.min(100, hh));
      padX = w / 2; padY = h / 2;
      var nw = w * (C + 1), nh = h * (R + 1);
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      if (cssW !== nw || cssH !== nh || cv.width !== Math.round(nw * dpr)) {
        cssW = nw; cssH = nh; cv.style.width = nw + 'px'; cv.style.height = nh + 'px';
        cv.width = Math.round(nw * dpr); cv.height = Math.round(nh * dpr);
      }
      draw();
    }
    function px(c) { return c <= 0 ? padX / 2 : (c >= C + 1 ? padX + C * w + padX / 2 : padX + (c - 1) * w + w / 2); }
    function py(r) { return r <= 0 ? padY / 2 : (r >= R + 1 ? padY + R * h + padY / 2 : padY + (r - 1) * h + h / 2); }
    function rr(x, y, ww, hh, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + ww, y, x + ww, y + hh, r); ctx.arcTo(x + ww, y + hh, x, y + hh, r);
      ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + ww, y, r); ctx.closePath();
    }
    function strokePath(pts, color, lw, alpha, dash) {
      var i; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.shadowColor = color; ctx.shadowBlur = dash ? 0 : 12;
      ctx.beginPath(); ctx.moveTo(px(pts[0].c), py(pts[0].r));
      for (i = 1; i < pts.length; i++) ctx.lineTo(px(pts[i].c), py(pts[i].r));
      ctx.stroke(); ctx.restore();
    }
    function draw() {
      if (!g || !cssW) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
      var grd = ctx.createLinearGradient(0, 0, 0, cssH); grd.addColorStop(0, '#15264a'); grd.addColorStop(1, '#0b1527');
      ctx.fillStyle = grd; rr(0, 0, cssW, cssH, 10); ctx.fill();
      var now = performance.now(), fs = Math.floor(Math.min(w, h) * 0.62), r, c, idx, v, x, y, tw, th, hue, isSel, isHint, pulse;
      ctx.font = fs + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      pulse = 0.5 + 0.5 * Math.sin(now / 130);
      for (r = 1; r <= R; r++) for (c = 1; c <= C; c++) {
        idx = r * C2 + c; v = g[idx]; if (!v) continue;
        x = padX + (c - 1) * w + 1.5; y = padY + (r - 1) * h + 1.5; tw = w - 3; th = h - 3; hue = (v * 47) % 360;
        isSel = idx === sel; isHint = hint && (hint.a === idx || hint.b === idx);
        ctx.fillStyle = isSel ? '#b45309' : 'hsl(' + hue + ',45%,48%)'; rr(x, y + 2, tw, th, 7); ctx.fill();
        ctx.fillStyle = isSel ? '#fde047' : 'hsl(' + hue + ',80%,93%)'; rr(x, y, tw, th - 1, 7); ctx.fill();
        ctx.lineWidth = isSel ? 3 : 1.5; ctx.strokeStyle = isSel ? '#f59e0b' : 'hsl(' + hue + ',50%,58%)'; ctx.stroke();
        if (isHint) { ctx.lineWidth = 3 + pulse * 2; ctx.strokeStyle = 'rgba(249,115,22,' + (0.6 + pulse * 0.4) + ')'; rr(x, y, tw, th - 1, 7); ctx.stroke(); }
        ctx.fillStyle = '#000'; ctx.fillText(icons[v], x + tw / 2, y + th / 2 + 1);
      }
      if (hint && hint.path) strokePath(hint.path, '#fb923c', Math.max(2, w * 0.07), 0.55, [6, 6]);
      if (pathAnim) strokePath(pathAnim.pts, '#fde047', Math.max(3, w * 0.12), Math.max(0.2, 1 - (now - pathAnim.t0) / 330));
    }
    function frame() {
      raf = 0; draw();
      if (hint && performance.now() - hint.t0 > 4500) hint = null;
      if (pathAnim || hint) kick();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    /* ----- Luồng chơi ----- */
    function startLevel(n) {
      n = Math.max(1, Math.min(PK_LEVELS.length, n)); li = n; L = PK_LEVELS[n - 1];
      R = L.r; C = L.c; R2 = R + 2; C2 = C + 2; token++;
      var kinds = Math.min(L.k, (R * C) >> 1), tries = 0;
      icons = [null].concat(shuffle(PK_ICONS.slice()).slice(0, kinds));
      g = pkDeal(R, C, kinds);
      while (!pkHasMove(g, R2, C2) && tries++ < 200) g = pkDeal(R, C, kinds);
      remain = R * C; sel = -1; hint = null; pathAnim = null; busy = false; score = 0; combo = 0; lastMatch = 0;
      tLeft = tTotal = L.t; hints = 3; shufs = 3; state = 'play'; lastTick = performance.now();
      showOv(null); msg('', 'info'); setHud(); setTime(); layout(); Au.start();
    }
    function shuffleBoard(auto) {
      var ok = pkShuffle(g, R, C); sel = -1; hint = null; Au.whoosh();
      msg(auto ? '🔀 Hết nước đi — máy đã tự đảo bàn!' : '🔀 Đã đảo bàn.', 'info');
      if (!ok) msg('Bàn khó nối, hãy thử đảo thêm.', 'info');
      draw();
    }
    function doMatch(a, b, path) {
      var my = token; busy = true; sel = -1; hint = null; pathAnim = { pts: path, t0: performance.now() }; Au.open(); kick();
      setTimeout(function () {
        if (my !== token) return;
        g[a] = 0; g[b] = 0; pathAnim = null; remain -= 2;
        var now = performance.now();
        combo = (lastMatch && now - lastMatch < 4500) ? Math.min(9, combo + 1) : 1; lastMatch = now;
        score += 10 + (combo > 1 ? (combo - 1) * 5 : 0); tLeft = Math.min(tTotal, tLeft + 2);
        if (combo >= 3) Au.combo(combo);
        pkGravity(g, R, C, L.g); busy = false; setHud(); setTime();
        if (remain <= 0) { winLevel(); return; }
        if (!pkHasMove(g, R2, C2)) shuffleBoard(true);
        draw();
      }, 260);
    }
    function winLevel() {
      state = 'win'; draw();
      var bonus = Math.floor(tLeft) * 2, p = tLeft / tTotal, stars = p >= 0.5 ? 3 : p >= 0.25 ? 2 : 1, newBest;
      score += bonus; setHud();
      cfg.stars[li] = Math.max(cfg.stars[li] || 0, stars);
      newBest = score > (cfg.hi[li] || 0); if (newBest) cfg.hi[li] = score;
      if (li < PK_LEVELS.length) cfg.unlocked = Math.max(cfg.unlocked, li + 1);
      save(); buildMenu();
      $('pkWinLv').textContent = li; $('pkWinStars').textContent = starStr(stars);
      $('pkWinTxt').textContent = 'Điểm: ' + score + ' (thưởng thời gian +' + bonus + ')' + (newBest ? ' · 🏆 Kỷ lục mới!' : ' · Kỷ lục: ' + cfg.hi[li]) + (li >= PK_LEVELS.length ? ' · 👑 Bạn đã phá đảo mọi màn!' : '');
      $('pkNext').style.display = li < PK_LEVELS.length ? '' : 'none';
      showOv('pkWinOv'); Au.win(); confetti();
    }
    function loseLevel() {
      state = 'lose'; busy = false; hint = null;
      $('pkLoseTxt').textContent = 'Còn ' + remain + ' ô chưa nối · Điểm: ' + score + '. Cố lên, thử lại nào!';
      showOv('pkLoseOv'); Au.lose();
    }
    function pause() { if (state !== 'play') return; state = 'paused'; showOv('pkPauseOv'); }
    function resume() { if (state !== 'paused') return; state = 'play'; lastTick = performance.now(); showOv(null); }
    function toMenu() { if (state === 'play') state = 'paused'; state = 'menu'; token++; busy = false; buildMenu(); showOv('pkMenuOv'); }
    function tick() {
      var now = performance.now(), dt = Math.min(1000, now - lastTick); lastTick = now;
      if (state !== 'play' || !panelOn() || !host.classList.contains('on') || document.hidden) return;
      tLeft -= dt / 1000;
      if (tLeft <= 0) { tLeft = 0; setTime(); loseLevel(); return; }
      setTime();
    }
    setInterval(tick, 200);

    function onTap(e) {
      Au.unlock(); if (state !== 'play' || busy || !g) return;
      var rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * (cssW / (rc.width || 1)), y = (e.clientY - rc.top) * (cssH / (rc.height || 1));
      var c = Math.floor((x - padX) / w) + 1, r = Math.floor((y - padY) / h) + 1;
      if (c < 1 || c > C || r < 1 || r > R) return;
      var idx = r * C2 + c; if (!g[idx]) return;
      hint = null;
      if (sel < 0) { sel = idx; Au.tick(); draw(); return; }
      if (sel === idx) { sel = -1; draw(); return; }
      if (g[sel] === g[idx]) {
        var p = pkFindPath(g, R2, C2, sel, idx);
        if (p) { doMatch(sel, idx, p); return; }
        Au.flag(false); msg('Hai con này chưa nối được (quá 2 góc rẽ hoặc bị chắn).', 'info');
      }
      sel = idx; Au.tick(); draw();
    }
    cv.addEventListener('click', onTap);
    $('pkLvGrid').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-l]'); if (!b || b.disabled) return;
      Au.unlock(); startLevel(+b.getAttribute('data-l'));
    });
    $('pkUnlock').addEventListener('click', function () { cfg.unlocked = PK_LEVELS.length; save(); buildMenu(); });
    $('pkReset').addEventListener('click', function () {
      if (!confirm('Xóa toàn bộ tiến trình Pikachu (sao, kỷ lục, màn đã mở)?')) return;
      cfg = { unlocked: 1, stars: {}, hi: {} }; save(); toMenu(); msg('Đã xóa tiến trình.', 'info');
    });
    ['pkMenu', 'pkMenu1', 'pkMenu2', 'pkMenu3'].forEach(function (id) { $(id).addEventListener('click', toMenu); });
    ['pkRetry', 'pkAgain1', 'pkAgain2'].forEach(function (id) { $(id).addEventListener('click', function () { Au.unlock(); startLevel(li); }); });
    $('pkNext').addEventListener('click', function () { Au.unlock(); startLevel(li + 1); });
    $('pkPause').addEventListener('click', function () { if (state === 'play') pause(); else if (state === 'paused') resume(); });
    $('pkResume').addEventListener('click', resume);
    $('pkHint').addEventListener('click', function () {
      if (state !== 'play' || busy || hints <= 0) return;
      var m = pkFindMove(g, R2, C2);
      if (!m) { shuffleBoard(true); return; }
      hints--; sel = -1; hint = { a: m.a, b: m.b, path: m.path, t0: performance.now() }; Au.tick(); setHud(); kick();
    });
    $('pkShuf').addEventListener('click', function () {
      if (state !== 'play' || busy || shufs <= 0) return;
      shufs--; combo = 0; shuffleBoard(false); setHud();
    });
    function setFull(on) {
      full = !!on; stage.classList.toggle('pk-full', full); document.body.style.overflow = full ? 'hidden' : '';
      $('pkFull').textContent = full ? '✕' : '⛶'; $('pkFull').title = full ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình';
      setTimeout(layout, 30);
    }
    $('pkFull').addEventListener('click', function () { setFull(!full); });
    document.addEventListener('keydown', function (e) {
      if (!panelOn() || !host.classList.contains('on') || typing(e)) return;
      if (e.key === 'Escape' && full) { setFull(false); return; }
      if (e.key === 'h' || e.key === 'H') $('pkHint').click();
      else if (e.key === 's' || e.key === 'S') $('pkShuf').click();
      else if (e.key === 'p' || e.key === 'P') $('pkPause').click();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { layout(); }).observe(wrap);
    window.addEventListener('resize', layout);

    buildMenu(); setHud(); setTime(); showOv('pkMenuOv');
    return {
      show: function () { layout(); setHud(); if (state === 'menu') buildMenu(); },
      hide: function () { pause(); if (full) setFull(false); }
    };
  }

  /* =================================================================
     CHÉM HOA QUẢ (giao diện)
     ================================================================= */
  function initFruit(host) {
    host.innerHTML =
      '<div class="gm-wrap"><div class="gm-board fr-board"><div class="fr-stage"><canvas id="frCv"></canvas>' +
      '<div class="fr-overlay on" id="frStart"><div class="box"><h3>🍉 Chém hoa quả</h3><p>Vuốt chuột hoặc ngón tay để chém trái cây bay lên.<br>Tránh bom 💣! Có 3 mạng.</p>' +
      '<div class="bar" style="justify-content:center"><label class="note">Mức: <select id="frLevel"><option value="0">Dễ</option><option value="1" selected>Vừa</option><option value="2">Khó</option></select></label>' +
      '<button type="button" id="frGo">▶ Bắt đầu</button></div></div></div>' +
      '<div class="fr-overlay" id="frPause"><div class="box"><h3>⏸ Tạm dừng</h3><button type="button" id="frResume">Tiếp tục</button></div></div>' +
      '<div class="fr-overlay" id="frOver"><div class="box"><h3>Game over</h3><p>Điểm: <b id="frScoreEnd">0</b> · Kỷ lục: <b id="frBestEnd">0</b></p>' +
      '<button type="button" id="frAgain">🔄 Chơi lại</button></div></div></div></div>' +
      '<div class="gm-side">' +
      '<div class="fr-hud"><span>⭐ <b id="frScore">0</b></span><span>❤ <b id="frLives">3</b></span><span>🏆 <b id="frBest">0</b></span>' +
      '<button type="button" class="sec sm" id="frPauseBtn">⏸</button></div>' +
      '<div id="frStatus" class="status info"></div>' +
      '<div class="note">Vuốt nhanh trên canvas để chém. Chém ≥3 quả trong một đường → Combo! Bom làm mất 1 mạng; quả rơi xuống đáy cũng mất mạng. Phím P: tạm dừng.</div>' +
      '</div></div>';

    var cv = $('frCv'), ctx = cv.getContext('2d');
    var cfg = lsGet('gm_fr_cfg', { level: 1 }), best = lsGet('gm_fr_best', { 0: 0, 1: 0, 2: 0 });
    var FRUITS = [
      { e: '🍉', c: '#e11d48' }, { e: '🍊', c: '#f97316' }, { e: '🍎', c: '#ef4444' }, { e: '🍋', c: '#eab308' },
      { e: '🍌', c: '#facc15' }, { e: '🍓', c: '#f43f5e' }, { e: '🍍', c: '#84cc16' }, { e: '🍇', c: '#a855f7' }
    ];
    var state = 'menu', score = 0, lives = 3, items = [], particles = [], trails = [], comboFlash = 0;
    var lastT = 0, raf = 0, spawnT = 0, LW = 800, LH = 600, reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { }
    $('frLevel').value = String(cfg.level);

    function showBest() { $('frBest').textContent = best[cfg.level] || 0; $('frBestEnd').textContent = best[cfg.level] || 0; }
    function setHud() { $('frScore').textContent = score; $('frLives').textContent = lives; showBest(); }
    function showOv(id) {
      ['frStart', 'frPause', 'frOver'].forEach(function (k) { $(k).classList.toggle('on', k === id); });
    }
    function canRun() { return state === 'play' && panelOn() && host.classList.contains('on') && !document.hidden; }
    function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function resize() {
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      var dpr = Math.min(1.75, window.devicePixelRatio || 1);
      if (reduced) dpr = Math.min(dpr, 1.25);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LW = w; LH = h;
      scaleX = w ? (LW / w) : 1; scaleY = h ? (LH / h) : 1;
      rectL = 0; rectT = 0; rectW = w; rectH = h;
      var r = cv.getBoundingClientRect();
      rectL = r.left; rectT = r.top; rectW = r.width || w; rectH = r.height || h;
    }
    function lvl() {
      var base = [{ spawn: 1400, bomb: 0.07, grav: 0.12, speed: 0.65 }, { spawn: 1100, bomb: 0.12, grav: 0.15, speed: 0.78 }, { spawn: 900, bomb: 0.18, grav: 0.18, speed: 0.92 }][cfg.level] || { spawn: 1100, bomb: 0.12, grav: 0.15, speed: 0.78 };
      var prog = Math.min(1, score / 80);
      return { spawn: base.spawn * (1 - prog * 0.28), bomb: Math.min(0.32, base.bomb + prog * 0.07), grav: base.grav, speed: base.speed * (1 + prog * 0.18) };
    }
    function spawn() {
      if (items.length >= 10) return;
      var L = lvl(), isBomb = Math.random() < L.bomb, f = pick(FRUITS), r = Math.min(LW, LH) * 0.078;
      // Bay gần hết chiều cao canvas (đỉnh ~8–18% từ mép trên) rồi mới rơi
      var peakY = LH * (0.08 + Math.random() * 0.10);
      var climb = Math.max(80, (LH + r) - peakY);
      var vy0 = -Math.sqrt(Math.max(0.01, 2 * L.grav * climb)) * (0.92 + Math.random() * 0.16);
      var x = LW * (0.12 + Math.random() * 0.76);
      var vx = (Math.random() - 0.5) * (1.8 + LW * 0.002) * L.speed;
      items.push({ x: x, y: LH + r, vx: vx, vy: vy0, r: r, rot: 0, vr: (Math.random() - 0.5) * 0.18, bomb: isBomb, e: isBomb ? '💣' : f.e, c: isBomb ? '#64748b' : f.c, dead: false, halves: null });
    }
    function sliceFx(it, x1, y1, x2, y2) {
      var ang = Math.atan2(y2 - y1, x2 - x1), n = reduced ? 3 : 6 + rnd(4), i, a, sp, maxP = reduced ? 40 : 80;
      for (i = 0; i < n && particles.length < maxP; i++) {
        a = ang + Math.PI / 2 + (Math.random() - 0.5) * 1.2; sp = 2 + Math.random() * 5;
        particles.push({ x: it.x, y: it.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 0.35 + Math.random() * 0.3, c: it.c, r: 2 + Math.random() * 2.5 });
      }
      it.halves = [
        { x: it.x, y: it.y, vx: it.vx - 2.5, vy: it.vy - 1, rot: it.rot, vr: -0.15, life: 0.85 },
        { x: it.x, y: it.y, vx: it.vx + 2.5, vy: it.vy - 1, rot: it.rot, vr: 0.15, life: 0.85 }
      ];
      it.dead = true;
    }
    function trySlice(x1, y1, x2, y2) {
      if (frSegLen(x1, y1, x2, y2) < 8) return 0;
      var hit = 0, i, it;
      for (i = 0; i < items.length; i++) {
        it = items[i]; if (it.dead || it.halves) continue;
        if (frSegHitsCircle(x1, y1, x2, y2, it.x, it.y, it.r * 1.05)) {
          if (it.bomb) {
            lives--; setHud(); Au.boom();
            if (!reduced) { cv.style.filter = 'brightness(1.6)'; setTimeout(function () { cv.style.filter = ''; }, 100); }
            it.dead = true;
            if (lives <= 0) gameOver();
          } else {
            sliceFx(it, x1, y1, x2, y2); score++; hit++; Au.slice();
          }
        }
      }
      if (hit >= 3) { score += hit; comboFlash = 45; Au.combo(hit); }
      if (hit) setHud();
      return hit;
    }
    function gameOver() {
      state = 'over'; stopLoop();
      if (score > (best[cfg.level] || 0)) { best[cfg.level] = score; lsSet('gm_fr_best', best); }
      $('frScoreEnd').textContent = score; showBest(); showOv('frOver'); Au.lose();
    }
    function startGame() {
      cfg.level = +$('frLevel').value; lsSet('gm_fr_cfg', cfg);
      score = 0; lives = 3; items = []; particles = []; trails = []; comboFlash = 0; spawnT = 0;
      setHud(); showOv(null); state = 'play'; lastT = performance.now(); Au.start(); loop();
    }
    function drawItem(it) {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.font = fontFruit; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.e, 0, 0);
      ctx.restore();
    }
    function drawHalf(it, h) {
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
      ctx.globalAlpha = Math.max(0, h.life);
      ctx.font = fontFruit; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.e, 0, 0);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    function frame(now) {
      raf = 0;
      if (!canRun()) { state = state === 'play' ? 'paused' : state; if (state === 'paused') showOv('frPause'); return; }
      var dt = Math.min(40, now - lastT) / 16.67; lastT = now;
      if (dt < 0.01) dt = 0.01;
      var L = lvl(), i, it, p, t, maxTrail = reduced ? 6 : 12;
      spawnT += dt * 16.67;
      if (spawnT >= L.spawn) { spawnT = 0; spawn(); if (Math.random() < 0.2 && items.length < 8) spawn(); }

      // cập nhật vật thể — gộp mảng bằng lọc ngược một lần
      for (i = items.length - 1; i >= 0; i--) {
        it = items[i];
        if (it.halves) {
          it.halves[0].x += it.halves[0].vx * dt; it.halves[0].y += it.halves[0].vy * dt; it.halves[0].vy += L.grav * dt; it.halves[0].rot += it.halves[0].vr * dt; it.halves[0].life -= 0.025 * dt;
          it.halves[1].x += it.halves[1].vx * dt; it.halves[1].y += it.halves[1].vy * dt; it.halves[1].vy += L.grav * dt; it.halves[1].rot += it.halves[1].vr * dt; it.halves[1].life -= 0.025 * dt;
          if (it.halves[0].life <= 0) items.splice(i, 1);
          continue;
        }
        if (it.dead) { items.splice(i, 1); continue; }
        it.vy += L.grav * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
        if (it.y > LH + it.r * 2) {
          if (!it.bomb) { lives--; setHud(); Au.bad(); if (lives <= 0) { gameOver(); return; } }
          items.splice(i, 1);
        }
      }
      for (i = particles.length - 1; i >= 0; i--) {
        p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.15 * dt; p.life -= 0.04 * dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
      for (i = trails.length - 1; i >= 0; i--) { trails[i].life -= 0.1 * dt; if (trails[i].life <= 0) trails.splice(i, 1); }
      if (trails.length > maxTrail) trails.splice(0, trails.length - maxTrail);
      if (comboFlash > 0) comboFlash -= dt;

      // vẽ
      ctx.clearRect(0, 0, LW, LH);
      if (trails.length) {
        ctx.lineCap = 'round';
        for (i = 0; i < trails.length; i++) {
          t = trails[i];
          ctx.globalAlpha = t.life * 0.65;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2.5 + t.life * 3.5;
          ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      fontFruit = Math.round((items[0] ? items[0].r : Math.min(LW, LH) * 0.078) * 2) + 'px serif';
      for (i = 0; i < items.length; i++) {
        it = items[i];
        fontFruit = Math.round(it.r * 2) + 'px serif';
        if (it.halves) { drawHalf(it, it.halves[0]); drawHalf(it, it.halves[1]); }
        else drawItem(it);
      }
      if (particles.length) {
        for (i = 0; i < particles.length; i++) {
          p = particles[i];
          ctx.globalAlpha = p.life > 0 ? p.life : 0;
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
        ctx.globalAlpha = 1;
      }
      if (comboFlash > 0) {
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = 'rgba(250,204,21,' + (comboFlash > 40 ? 1 : comboFlash / 40) + ')';
        ctx.textAlign = 'center'; ctx.fillText('Combo!', LW / 2, LH * 0.25);
      }
      raf = requestAnimationFrame(frame);
    }
    function loop() { stopLoop(); lastT = performance.now(); raf = requestAnimationFrame(frame); }

    var ptr = null, rectL = 0, rectT = 0, rectW = 1, rectH = 1, scaleX = 1, scaleY = 1, fontFruit = '40px serif';
    function ptrPos(e) {
      return { x: (e.clientX - rectL) / rectW * LW, y: (e.clientY - rectT) / rectH * LH };
    }
    cv.addEventListener('pointerdown', function (e) {
      Au.unlock(); if (state !== 'play') return;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { }
      var r = cv.getBoundingClientRect();
      rectL = r.left; rectT = r.top; rectW = r.width || 1; rectH = r.height || 1;
      ptr = ptrPos(e);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!ptr || state !== 'play') return;
      var pos = ptrPos(e);
      if (trails.length < 14) trails.push({ x1: ptr.x, y1: ptr.y, x2: pos.x, y2: pos.y, life: 1 });
      trySlice(ptr.x, ptr.y, pos.x, pos.y);
      ptr = pos;
    });
    cv.addEventListener('pointerup', function () { ptr = null; });
    cv.addEventListener('pointercancel', function () { ptr = null; });

    $('frGo').addEventListener('click', function () { Au.unlock(); startGame(); });
    $('frAgain').addEventListener('click', function () { Au.unlock(); startGame(); });
    $('frResume').addEventListener('click', function () { if (state === 'paused') { showOv(null); state = 'play'; loop(); } });
    $('frPauseBtn').addEventListener('click', function () {
      if (state === 'play') { state = 'paused'; stopLoop(); showOv('frPause'); }
      else if (state === 'paused') { showOv(null); state = 'play'; loop(); }
    });
    $('frLevel').addEventListener('change', function () { cfg.level = +$('frLevel').value; lsSet('gm_fr_cfg', cfg); showBest(); });
    document.addEventListener('keydown', function (e) {
      if (!panelOn() || !host.classList.contains('on') || typing(e)) return;
      if (e.key === 'p' || e.key === 'P') $('frPauseBtn').click();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'play') { state = 'paused'; stopLoop(); showOv('frPause'); }
    });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { resize(); }).observe(cv);
    window.addEventListener('resize', resize);
    showBest(); setHud(); resize();

    return {
      show: function () { resize(); setHud(); showBest(); if (state === 'play' && canRun()) loop(); },
      hide: function () { if (state === 'play') { state = 'paused'; stopLoop(); } }
    };
  }

  /* ---------- Đăng ký trò + chuyển giữa các trò ---------- */
  var GAMES = {
    sd: { host: $('gvSd'), init: initSudoku }, caro: { host: $('gvCaro'), init: initCaro },
    ch: { host: $('gvCh'), init: function (h) { return initBoardGame(h, CH_UI); } },
    xq: { host: $('gvXq'), init: function (h) { return initBoardGame(h, XQ_UI); } },
    pk: { host: $('gvPk'), init: initPikachu },
    fr: { host: $('gvFr'), init: initFruit }
  };
  var inst = {}, curG = 'sd';

  /* Tự co giãn bàn chơi theo CẢ chiều rộng lẫn chiều cao màn hình (điện thoại / máy tính bảng, dọc / ngang).
     - Dọc: bàn rộng gần hết bề ngang, nhưng không cao quá màn hình.
     - Ngang: bàn cao vừa màn hình, bảng điều khiển nằm bên phải, bàn dính (sticky) khi cuộn.
     - Màn hình >= 1100px (máy tính): giữ nguyên bố cục gốc. */
  var fitRaf = 0;
  function fitBleed() {
    var vv = window.visualViewport, vw = document.documentElement.clientWidth, vh = Math.round(vv ? vv.height : window.innerHeight), PAD = 4;
    panel.querySelectorAll('#gvSd .gm-board,#gvCaro .gm-board,#gvCh .gm-board,#gvXq .gm-board').forEach(function (b) {
      b.style.flex = ''; b.style.width = ''; b.style.maxWidth = ''; b.style.marginLeft = ''; b.style.position = ''; b.style.top = '';
      if (vw >= 1100 || !b.offsetParent) return;
      var v = b.closest('.gm-view'), id = v ? v.id : '';
      var asp = id === 'gvXq' ? 0.9 : 1, extra = id === 'gvSd' ? 64 : 0;
      var land = vw > vh, reserve = land ? (vh < 500 ? 20 : 120) : 90;
      var w = Math.min(vw - 2 * PAD, (vh - reserve - extra) * asp), side = false;
      if (land && vw - 284 >= 300) { w = Math.min(w, vw - 284); side = true; }
      w = Math.max(240, Math.floor(w));
      var left = b.getBoundingClientRect().left, a = b.parentElement;
      while (a && a !== document.documentElement) {
        if (getComputedStyle(a).overflowX !== 'visible') a.style.overflowX = 'visible';
        a = a.parentElement;
      }
      b.style.flex = '0 0 auto'; b.style.maxWidth = 'none'; b.style.width = w + 'px';
      b.style.marginLeft = (PAD - left + (side ? 0 : Math.floor((vw - 2 * PAD - w) / 2))) + 'px';
      if (side) { b.style.position = 'sticky'; b.style.top = '8px'; }
    });
  }
  function fitSoon() { if (fitRaf) return; fitRaf = requestAnimationFrame(function () { fitRaf = 0; fitBleed(); }); }
  window.addEventListener('resize', fitSoon);
  window.addEventListener('orientationchange', function () { setTimeout(fitSoon, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitSoon);

  function openGame(id) {
    if (curG && inst[curG] && inst[curG].hide) try { inst[curG].hide(); } catch (e) { }
    curG = id;
    Object.keys(GAMES).forEach(function (k) { GAMES[k].host.classList.toggle('on', k === id); });
    panel.querySelectorAll('.gm-menu button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-g') === id); });
    if (!inst[id]) { try { inst[id] = GAMES[id].init(GAMES[id].host); } catch (e) { GAMES[id].host.innerHTML = '<div class="status err">Không khởi tạo được trò chơi: ' + esc(e.message) + '</div>'; console.error(e); return; } }
    inst[id].show();
    fitBleed(); requestAnimationFrame(fitBleed);
  }
  panel.querySelector('.gm-menu').addEventListener('click', function (e) { var b = e.target.closest('button[data-g]'); if (b) openGame(b.getAttribute('data-g')); });
  window.addEventListener('tabshow', function (e) { if (e.detail === 't7') openGame(curG); });
})();
