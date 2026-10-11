/* =====================================================================
   kho-de.js — Kho đề lớp 6-9 & thi vào 10 (Toán học → "📚 Kho đề")
   - Đọc data/chuong-trinh.json và các file đề trong data/ (tự tìm file mới)
   - Lọc theo lớp, loại đề, chương, dạng, mức độ, từ khóa
   - AI (Gemini) chọn bài theo yêu cầu tiếng Việt, sinh bài tương tự, tự giải lại để kiểm tra
   - Xuất đề: sao chép, tải .txt, gửi sang "Chuyển LaTeX → Word / PDF"
   Không sửa các file cũ. Chỉ cần thêm 1 dòng <script src="kho-de.js"> vào index.html.
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var S = {
    ready: false, loading: false, ct: null, items: [], byId: {}, errs: [],
    CH: {}, DG: {}, sel: {}, order: [], ai: [], shown: 40, filtered: [], onlySel: false,
    f: { lop: '', loai: '', chuong: '', dang: '', ts: '', md: [], q: '' }
  };
  var MD_NAME = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' };

  /* ------------------------------------------------------------------ CSS */
  function addCss() {
    if ($('kd-css')) return;
    var st = document.createElement('style');
    st.id = 'kd-css';
    st.textContent =
      '#mKho .kd-card{border:1px solid var(--bd,#cfd8dc);border-radius:10px;padding:8px 10px;margin:8px 0;background:var(--card,transparent)}' +
      '#mKho .kd-card.pick{border-color:#2e7d32;box-shadow:0 0 0 1px #2e7d32 inset}' +
      '#mKho .kd-h{display:flex;flex-wrap:wrap;gap:6px;align-items:center;cursor:pointer;font-size:13px}' +
      '#mKho .kd-chip{display:inline-block;padding:1px 8px;border-radius:99px;background:var(--card2,#eceff1);font-size:12px}' +
      '#mKho .kd-warn{background:#fff3cd;color:#7a5d00}' +
      '#mKho .kd-ok{background:#d7f0dc;color:#1b5e20}' +
      '#mKho .kd-bad{background:#fde0dd;color:#b71c1c}' +
      '#mKho .kd-tags{font-size:12px;opacity:.75;margin:2px 0 4px}' +
      '#mKho .kd-body{font-size:14px;line-height:1.7;overflow-x:auto}' +
      '#mKho .kd-body img{max-width:min(100%,280px);display:block;margin:6px 0;border-radius:6px;background:#fff}' +
      '#mKho .kd-body table{border-collapse:collapse;margin:6px 0;font-size:13px}' +
      '#mKho .kd-body td,#mKho .kd-body th{border:1px solid var(--bd,#999);padding:2px 8px;text-align:center}' +
      '#mKho .kd-y{margin:2px 0 2px 14px}' +
      '#mKho details{margin-top:6px;font-size:13px}' +
      '#mKho details>div{padding:4px 0 2px 10px;border-left:3px solid var(--bd,#cfd8dc);margin-top:4px}' +
      '#mKho h3{margin:14px 0 6px;font-size:15px}' +
      '#mKho .kd-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}' +
      '#mKho .kd-row input[type=text],#mKho .kd-row input[type=password]{flex:1 1 200px;min-width:150px}';
    document.head.appendChild(st);
  }

  /* ----------------------------------------------------------------- KaTeX */
  var kxQueue = null;
  function loadKatex(cb) {
    if (window.renderMathInElement) { cb(); return; }
    if (kxQueue) { kxQueue.push(cb); return; }
    kxQueue = [cb];
    var base = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/';
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'katex.min.css'; document.head.appendChild(l);
    var s = document.createElement('script'); s.src = base + 'katex.min.js';
    s.onload = function () {
      var a = document.createElement('script'); a.src = base + 'contrib/auto-render.min.js';
      a.onload = function () { var q = kxQueue; kxQueue = null; q.forEach(function (f) { f(); }); };
      a.onerror = function () { kxQueue = null; };
      document.head.appendChild(a);
    };
    s.onerror = function () { kxQueue = null; };
    document.head.appendChild(s);
  }
  function math(node) {
    if (!node) return;
    loadKatex(function () {
      try {
        window.renderMathInElement(node, {
          delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
          throwOnError: false
        });
      } catch (e) { /* bỏ qua, vẫn hiện LaTeX thô */ }
    });
  }

  /* ------------------------------------------------------------- Tải dữ liệu */
  function fetchJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
      return r.json();
    });
  }
  function apiList() {
    var host = location.hostname;
    if (!/\.github\.io$/.test(host)) return Promise.reject(new Error('không phải GitHub Pages'));
    var owner = host.split('.')[0];
    var repo = location.pathname.split('/')[1];
    if (!repo) return Promise.reject(new Error('không xác định được repo'));
    var api = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/';
    return fetchJSON(api + 'data').then(function (root) {
      var files = [], dirs = [];
      root.forEach(function (x) {
        if (x.type === 'dir') dirs.push(x.path);
        else if (/\.json$/i.test(x.name) && x.name !== 'chuong-trinh.json' && x.name !== 'index.json') files.push(x.path);
      });
      return Promise.all(dirs.map(function (d) {
        return fetchJSON(api + d).then(function (arr) {
          arr.forEach(function (x) { if (x.type === 'file' && /\.json$/i.test(x.name)) files.push(x.path); });
        }).catch(function () { });
      })).then(function () { return files; });
    });
  }
  function indexList() {
    return fetchJSON('data/index.json').then(function (j) {
      var a = Array.isArray(j) ? j : (j.files || []);
      return a.map(function (p) { return /^data\//.test(p) ? p : 'data/' + p; });
    });
  }
  function listFiles(force) {
    if (!force) {
      try {
        var c = JSON.parse(sessionStorage.getItem('kd_files') || 'null');
        if (c && Date.now() - c.t < 300000 && c.f && c.f.length) return Promise.resolve(c.f);
      } catch (e) { }
    }
    return apiList().then(function (f) {
      if (!f.length) throw new Error('rỗng');
      return f;
    }).catch(function () { return indexList(); }).then(function (f) {
      try { sessionStorage.setItem('kd_files', JSON.stringify({ t: Date.now(), f: f })); } catch (e) { }
      return f;
    });
  }
  function status(t, err) {
    var s = $('kdStatus'); if (!s) return;
    s.textContent = t; s.style.color = err ? '#c62828' : '';
  }
  function load(force) {
    if (S.loading) return;
    if (S.ready && !force) { refresh(); return; }
    S.loading = true; S.items = []; S.byId = {}; S.errs = [];
    status('Đang tải kho đề…');
    fetchJSON('data/chuong-trinh.json').then(function (ct) {
      S.ct = ct; indexNames(ct);
      return listFiles(force);
    }).then(function (files) {
      return Promise.all(files.map(function (p) {
        return fetchJSON(p).then(function (d) {
          var dir = p.replace(/[^\/]+$/, '');
          (d.bai || []).forEach(function (b) {
            if (S.byId[b.id]) return;
            b._dir = dir; b._file = p; S.byId[b.id] = b; S.items.push(b);
          });
        }).catch(function () { S.errs.push(p); });
      }));
    }).then(function () {
      S.ready = true; S.loading = false;
      status('Kho có ' + S.items.length + ' bài từ ' + new Set(S.items.map(function (b) { return b._file; })).size + ' file đề' +
        (S.errs.length ? ' · lỗi đọc ' + S.errs.length + ' file' : '') + '.');
      fillFilters(); refresh();
    }).catch(function (e) {
      S.loading = false;
      var local = location.protocol === 'file:';
      status('Không tải được kho đề' + (local ? ' (mở bằng file:// nên trình duyệt chặn; hãy mở bản trên GitHub Pages)' : '') + ': ' + e.message, true);
    });
  }
  function indexNames(ct) {
    S.CH = {}; S.DG = {};
    (ct.lop || []).forEach(function (L) {
      (L.chuong || []).forEach(function (c) {
        S.CH[c.ma] = 'L' + L.lop + ' · ' + c.ten;
        (c.dang || []).forEach(function (d) { S.DG[d.ma] = d.ten; });
      });
    });
    if (ct.ts10) (ct.ts10.dang || []).forEach(function (d) { S.DG[d.ma] = d.ten; });
  }
  function dangNames(b) {
    var a = [];
    if (b.dang) a.push(S.DG[b.dang] || b.dang);
    (b.dang_phu || []).forEach(function (d) { a.push(S.DG[d] || d); });
    if (b.dang_ts10) a.push('[TS10] ' + (S.DG[b.dang_ts10] || b.dang_ts10));
    return a.join(' · ');
  }

  /* ----------------------------------------------------------- Giao diện chính */
  function build(p) {
    p.innerHTML =
      '<div class="kd-row"><span class="note" id="kdStatus" style="margin:0">Mở công cụ để tải kho đề…</span>' +
      '<button class="sec sm" id="kdReload" type="button">🔄 Tải lại kho</button></div>' +

      '<div class="kd-row">' +
      '<label>Lớp <select id="kdLop"><option value="">Tất cả</option><option>6</option><option>7</option><option>8</option><option>9</option></select></label>' +
      '<label>Loại đề <select id="kdLoai"><option value="">Tất cả</option></select></label>' +
      '<label>Chương <select id="kdChuong"><option value="">Tất cả</option></select></label>' +
      '<label>Dạng <select id="kdDang"><option value="">Tất cả</option></select></label>' +
      '<label>Dạng thi vào 10 <select id="kdTs"><option value="">Tất cả</option></select></label></div>' +

      '<div class="kd-row"><b>Mức độ:</b>' +
      ['NB', 'TH', 'VD', 'VDC'].map(function (m) {
        return '<label class="qchip"><input type="checkbox" class="kdMd" value="' + m + '"> ' + m + '</label>';
      }).join('') +
      '<input type="text" id="kdQ" placeholder="Tìm theo từ khóa trong nội dung…" style="flex:1 1 200px">' +
      '<button class="sec sm" id="kdClear" type="button">✖ Xóa lọc</button></div>' +

      '<div class="kd-row"><input type="text" id="kdReq" placeholder="Nhờ AI chọn bài, ví dụ: lấy 5 bài hệ thức Vi-ét mức vận dụng">' +
      '<button class="sm" id="kdPick" type="button">🤖 AI chọn bài</button></div>' +

      '<div class="kd-row"><label for="kdKey" class="note" style="margin:0">API key Gemini · ' +
      '<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">lấy miễn phí</a></label>' +
      '<input type="password" id="kdKey" placeholder="Dán API key vào đây" autocomplete="off" spellcheck="false">' +
      '<label>Model <input type="text" id="kdModel" value="auto" list="kdModelList" title="auto = tự chọn model mới nhất còn hoạt động" style="width:200px;flex:0 0 auto"></label>' +
      '<datalist id="kdModelList"></datalist>' +
      '<label>Ưu tiên <select id="kdTier"><option value="lite">Flash-Lite</option><option value="flash">Flash</option><option value="pro">Pro</option></select></label>' +
      '<button class="sec sm" id="kdModels" type="button">🔍 Dò model mới nhất</button>' +
      '<label class="qchip"><input type="checkbox" id="kdRem"> Ghi nhớ trên máy này</label></div>' +
      '<div class="note" id="kdModelNote" style="margin:0 0 4px">Model: <b>auto</b> — tự dò và dùng bản mới nhất còn hoạt động theo mức ưu tiên đã chọn; nếu một model lỗi sẽ tự thử model kế tiếp.</div>' +

      '<div class="kd-row"><span class="note" id="kdCount" style="margin:0"></span>' +
      '<button class="sec sm" id="kdSelAll" type="button">Chọn tất cả đang hiện</button>' +
      '<button class="sec sm" id="kdSelNone" type="button">Bỏ chọn hết</button>' +
      '<button class="sec sm" id="kdOnly" type="button">Chỉ xem bài đã chọn</button></div>' +
      '<div id="kdList"></div>' +
      '<div class="kd-row"><button class="sec sm" id="kdMore" type="button">Hiện thêm</button></div>' +

      '<h3>✨ Bài tương tự do AI sinh</h3>' +
      '<div class="kd-row"><label>Số biến thể mỗi bài <input type="number" id="kdNVar" value="3" min="1" max="5" style="width:60px"></label>' +
      '<label class="qchip"><input type="checkbox" id="kdVerify" checked> AI giải lại để kiểm tra đáp án</label>' +
      '<button class="green sm" id="kdGen" type="button">✨ Sinh bài tương tự cho các bài đã chọn</button>' +
      '<button class="sec sm" id="kdAiClear" type="button">🗑 Xóa bài AI</button></div>' +
      '<div class="note" id="kdAiMsg"></div>' +
      '<div id="kdAiList"></div>' +

      '<h3>📄 Xuất đề</h3>' +
      '<div class="kd-row">' +
      '<label class="qchip"><input type="checkbox" id="kdPt"> Ghi điểm</label>' +
      '<label class="qchip"><input type="checkbox" id="kdDa" checked> Kèm đáp án</label>' +
      '<label class="qchip"><input type="checkbox" id="kdLg" checked> Kèm lời giải</label>' +
      '<button class="sm" id="kdMake" type="button">📝 Tạo nội dung đề</button>' +
      '<button class="sec sm" id="kdCopy" type="button">📋 Sao chép</button>' +
      '<button class="sec sm" id="kdTxt" type="button">⬇ Tải .txt</button>' +
      '<button class="green sm" id="kdSend" type="button">➡ Gửi sang Chuyển LaTeX (Công cụ Word)</button></div>' +
      '<textarea id="kdOut" style="min-height:240px" placeholder="Chọn bài ở trên rồi bấm Tạo nội dung đề. Công thức viết dạng LaTeX $...$"></textarea>' +
      '<div class="note" id="kdOutMsg">Hình vẽ không nằm trong văn bản: bài có hình sẽ được ghi chú tên file ảnh (trong data/…/hinh/) để bạn chèn thủ công. Hãy kiểm tra lại đề, đặc biệt các bài do AI sinh, trước khi phát cho học sinh.</div>';

    // khôi phục key / model
    var key = '';
    try { key = localStorage.getItem('kd_key') || ''; } catch (e) { }
    if (key) { $('kdKey').value = key; $('kdRem').checked = true; }
    else { var f = findStoredKey(); if (f) $('kdKey').value = f; }
    try { var m = localStorage.getItem('kd_model'); if (m && !/^gemini-2\.5-flash$/.test(m)) $('kdModel').value = m; var tr = localStorage.getItem('kd_tier'); if (tr) $('kdTier').value = tr; } catch (e) { }

    bind();
  }

  function findStoredKey() {
    var re = /^AIza[0-9A-Za-z_\-]{30,}$/;
    try {
      var g = $('gAiK'); if (g && re.test((g.value || '').trim())) return g.value.trim();
      var stores = [localStorage, sessionStorage];
      for (var s = 0; s < stores.length; s++) {
        for (var i = 0; i < stores[s].length; i++) {
          var v = stores[s].getItem(stores[s].key(i));
          if (v && re.test(v.trim())) return v.trim();
        }
      }
    } catch (e) { }
    return '';
  }

  function bind() {
    $('kdReload').onclick = function () { try { sessionStorage.removeItem('kd_files'); } catch (e) { } S.ready = false; load(true); };
    ['kdLoai', 'kdTs'].forEach(function (id) { $(id).onchange = readFilters; });
    $('kdLop').onchange = function () { fillChuong(); readFilters(); };
    $('kdChuong').onchange = function () { fillDang(); readFilters(); };
    $('kdDang').onchange = readFilters;
    [].forEach.call(document.querySelectorAll('#mKho .kdMd'), function (c) { c.onchange = readFilters; });
    var t = null;
    $('kdQ').oninput = function () { clearTimeout(t); t = setTimeout(readFilters, 250); };
    $('kdClear').onclick = function () {
      $('kdLop').value = ''; $('kdLoai').value = ''; $('kdTs').value = ''; $('kdQ').value = '';
      [].forEach.call(document.querySelectorAll('#mKho .kdMd'), function (c) { c.checked = false; });
      fillChuong(); readFilters();
    };
    $('kdMore').onclick = function () { S.shown += 40; renderList(); };
    $('kdSelAll').onclick = function () { S.filtered.slice(0, S.shown).forEach(function (b) { setSel(b.id, true); }); renderList(); };
    $('kdSelNone').onclick = function () { S.sel = {}; S.order = []; S.onlySel = false; renderList(); };
    $('kdOnly').onclick = function () { S.onlySel = !S.onlySel; renderList(); };
    $('kdPick').onclick = aiPick;
    $('kdGen').onclick = function () { genSimilar(S.order.slice()); };
    $('kdAiClear').onclick = function () { S.ai = []; renderAi(); };
    $('kdMake').onclick = compose;
    $('kdCopy').onclick = copyOut;
    $('kdTxt').onclick = downloadTxt;
    $('kdSend').onclick = sendLatex;
    $('kdRem').onchange = saveKey; $('kdKey').onchange = saveKey; $('kdModel').onchange = saveKey; $('kdTier').onchange = saveKey; $('kdModels').onclick = detectModels;

    $('kdList').addEventListener('change', function (e) {
      var c = e.target.closest ? e.target.closest('.kd-pick') : null; if (!c) return;
      var card = c.closest('.kd-card'); setSel(card.getAttribute('data-id'), c.checked);
      card.classList.toggle('pick', c.checked); countText();
    });
    $('kdList').addEventListener('click', function (e) {
      var g = e.target.closest ? e.target.closest('.kd-gen1') : null; if (!g) return;
      e.preventDefault(); genSimilar([g.getAttribute('data-id')]);
    });
    $('kdAiList').addEventListener('change', function (e) {
      var c = e.target.closest ? e.target.closest('.kd-aipick') : null; if (!c) return;
      var x = S.ai[+c.getAttribute('data-i')]; if (x) x.picked = c.checked;
    });
    $('kdAiList').addEventListener('click', function (e) {
      var d = e.target.closest ? e.target.closest('.kd-aidel') : null; if (!d) return;
      S.ai.splice(+d.getAttribute('data-i'), 1); renderAi();
    });
  }
  function saveKey() {
    try {
      if ($('kdRem').checked) localStorage.setItem('kd_key', $('kdKey').value.trim()); else localStorage.removeItem('kd_key');
      localStorage.setItem('kd_model', $('kdModel').value.trim()); localStorage.setItem('kd_tier', $('kdTier').value);
    } catch (e) { }
  }

  function fillFilters() {
    var lo = $('kdLoai'); lo.innerHTML = '<option value="">Tất cả</option>';
    var m = (S.ct.meta && S.ct.meta.loai_de) || {};
    Object.keys(m).forEach(function (k) { lo.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + esc(m[k]) + '</option>'); });
    var ts = $('kdTs'); ts.innerHTML = '<option value="">Tất cả</option>';
    ((S.ct.ts10 && S.ct.ts10.dang) || []).forEach(function (d) { ts.insertAdjacentHTML('beforeend', '<option value="' + d.ma + '">' + esc(d.ten) + '</option>'); });
    fillChuong();
  }
  function fillChuong() {
    var lop = $('kdLop').value, sel = $('kdChuong');
    sel.innerHTML = '<option value="">Tất cả</option>';
    ((S.ct && S.ct.lop) || []).forEach(function (L) {
      if (lop && String(L.lop) !== lop) return;
      L.chuong.forEach(function (c) {
        sel.insertAdjacentHTML('beforeend', '<option value="' + c.ma + '">' + esc((lop ? '' : 'L' + L.lop + ' · ') + c.ten) + '</option>');
      });
    });
    fillDang();
  }
  function fillDang() {
    var ma = $('kdChuong').value, sel = $('kdDang');
    sel.innerHTML = '<option value="">Tất cả</option>';
    if (!ma) return;
    ((S.ct && S.ct.lop) || []).forEach(function (L) {
      L.chuong.forEach(function (c) {
        if (c.ma !== ma) return;
        c.dang.forEach(function (d) { sel.insertAdjacentHTML('beforeend', '<option value="' + d.ma + '">' + esc(d.ten) + '</option>'); });
      });
    });
  }

  /* ---------------------------------------------------------------- Lọc bài */
  function readFilters() {
    S.f.lop = $('kdLop').value; S.f.loai = $('kdLoai').value; S.f.chuong = $('kdChuong').value;
    S.f.dang = $('kdDang').value; S.f.ts = $('kdTs').value; S.f.q = $('kdQ').value.trim().toLowerCase();
    S.f.md = [].filter.call(document.querySelectorAll('#mKho .kdMd'), function (c) { return c.checked; }).map(function (c) { return c.value; });
    S.shown = 40; S.onlySel = false; refresh();
  }
  function ys(b) { return b.y || []; }
  function hasChuong(b, ma) {
    if (b.chuong === ma) return true;
    return (b.dang_phu || []).some(function (d) { return d.indexOf(ma + '-') === 0; }) || ys(b).some(function (y) { return y.dang && y.dang.indexOf(ma + '-') === 0; });
  }
  function hasDang(b, ma) {
    return b.dang === ma || (b.dang_phu || []).indexOf(ma) >= 0 || ys(b).some(function (y) { return y.dang === ma; });
  }
  function hasMd(b, m) { return b.mucdo === m || ys(b).some(function (y) { return y.mucdo === m; }); }
  function plain(b) {
    return [b.id, b.noidung].concat(ys(b).map(function (y) { return y.noidung; })).concat([dangNames(b)]).join(' ').toLowerCase();
  }
  function match(b) {
    var f = S.f;
    if (f.lop && String(b.lop) !== f.lop) return false;
    if (f.loai && b.loai !== f.loai) return false;
    if (f.chuong && !hasChuong(b, f.chuong)) return false;
    if (f.dang && !hasDang(b, f.dang)) return false;
    if (f.ts && b.dang_ts10 !== f.ts) return false;
    if (f.md.length && !f.md.some(function (m) { return hasMd(b, m); })) return false;
    if (f.q && plain(b).indexOf(f.q) < 0) return false;
    return true;
  }
  function refresh() {
    S.filtered = S.items.filter(match);
    renderList(); renderAi();
  }
  function setSel(id, on) {
    if (on) { if (!S.sel[id]) { S.sel[id] = true; S.order.push(id); } }
    else if (S.sel[id]) { delete S.sel[id]; S.order = S.order.filter(function (x) { return x !== id; }); }
  }
  function countText() {
    var c = $('kdCount'); if (!c) return;
    c.textContent = 'Đang lọc được ' + S.filtered.length + ' bài · đã chọn ' + S.order.length + ' bài' + (S.ai.filter(function (x) { return x.picked; }).length ? ' + ' + S.ai.filter(function (x) { return x.picked; }).length + ' bài AI' : '');
  }

  /* --------------------------------------------------------- Hiển thị bài */
  function lbl(y) { return /^\d+$/.test(y.ma) ? y.ma + ')' : y.ma + ')'; }
  function bangHTML(bg) {
    if (!bg || !bg.tieu_de) return '';
    var h = '<table><tr>' + bg.tieu_de.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
    (bg.hang || []).forEach(function (r) { h += '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; });
    return h + '</table>';
  }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function bodyHTML(b, dir) {
    var h = '<div>' + nl(b.noidung) + '</div>' + bangHTML(b.bang);
    if (b.hinh && dir != null) h += '<img loading="lazy" alt="Hình" src="' + esc(dir + b.hinh) + '" onerror="this.style.display=\'none\'">';
    if (b.hinh_mo_ta) h += '<div class="note">Hình (mô tả): ' + nl(b.hinh_mo_ta) + '</div>';
    ys(b).forEach(function (y) { h += '<div class="kd-y"><b>' + esc(lbl(y)) + '</b> ' + nl(y.noidung) + '</div>'; });
    var ans = '';
    ys(b).forEach(function (y) {
      if (y.dapan || y.loigiai) ans += '<div class="kd-y"><b>' + esc(lbl(y)) + '</b> ' + (y.dapan ? '<b>Đáp án:</b> ' + nl(y.dapan) : '') + (y.loigiai ? '<br>' + nl(y.loigiai) : '') + '</div>';
    });
    if (b.dapan || b.loigiai) ans += '<div>' + (b.dapan ? '<b>Đáp án:</b> ' + nl(b.dapan) : '') + (b.loigiai ? '<br>' + nl(b.loigiai) : '') + '</div>';
    if (ans) h += '<details><summary>Đáp án &amp; lời giải</summary>' + ans + '</details>';
    return h;
  }
  function cardHTML(b) {
    var chips = '<span class="kd-chip">Lớp ' + esc(b.lop) + '</span><span class="kd-chip">' + esc(b.loai) + (b.nam ? ' ' + esc(b.nam) : '') + '</span>';
    if (b.mucdo) chips += '<span class="kd-chip" title="' + esc(MD_NAME[b.mucdo] || '') + '">' + esc(b.mucdo) + '</span>';
    if (b.diem) chips += '<span class="kd-chip">' + esc(b.diem) + ' đ</span>';
    if (b.can_duyet) chips += '<span class="kd-chip kd-warn" title="' + esc(b.ghi_chu || 'Cần duyệt lại') + '">⚠ cần duyệt</span>';
    return '<div class="kd-card' + (S.sel[b.id] ? ' pick' : '') + '" data-id="' + esc(b.id) + '">' +
      '<label class="kd-h"><input type="checkbox" class="kd-pick"' + (S.sel[b.id] ? ' checked' : '') + '> <b>' + esc(b.id) + '</b> ' + chips + '</label>' +
      '<div class="kd-tags">' + esc(dangNames(b)) + '</div>' +
      '<div class="kd-body">' + bodyHTML(b, b._dir) + '</div>' +
      '<div class="kd-row"><button class="sec sm kd-gen1" type="button" data-id="' + esc(b.id) + '">✨ Sinh bài tương tự</button>' +
      (b.ghi_chu ? '<span class="note" style="margin:0">' + esc(b.ghi_chu) + '</span>' : '') + '</div></div>';
  }
  function renderList() {
    var box = $('kdList'); if (!box) return;
    var list = S.onlySel ? S.order.map(function (id) { return S.byId[id]; }).filter(Boolean) : S.filtered;
    var part = list.slice(0, S.shown);
    box.innerHTML = part.length ? part.map(cardHTML).join('') :
      '<div class="note">' + (S.ready ? 'Không có bài nào khớp bộ lọc.' : '') + '</div>';
    $('kdMore').style.display = list.length > part.length ? '' : 'none';
    $('kdOnly').textContent = S.onlySel ? 'Xem tất cả bài đang lọc' : 'Chỉ xem bài đã chọn';
    countText(); math(box);
  }
  function renderAi() {
    var box = $('kdAiList'); if (!box) return;
    box.innerHTML = S.ai.map(function (x, i) {
      var chips = '<span class="kd-chip">AI · từ ' + esc(x.from) + '</span>';
      if (x.check) chips += '<span class="kd-chip ' + (x.check.ok ? 'kd-ok' : 'kd-bad') + '" title="' + esc(x.check.note) + '">' + (x.check.ok ? '✔ AI giải lại cho kết quả khớp' : '⚠ AI giải lại cho kết quả khác — hãy kiểm tra') + '</span>';
      var more = x.check && !x.check.ok ? '<div class="note">AI giải lại ra: ' + nl(x.check.other) + '</div>' : '';
      return '<div class="kd-card' + (x.picked ? ' pick' : '') + '">' +
        '<label class="kd-h"><input type="checkbox" class="kd-aipick" data-i="' + i + '"' + (x.picked ? ' checked' : '') + '> <b>Bài AI #' + (i + 1) + '</b> ' + chips + '</label>' +
        '<div class="kd-body">' + bodyHTML(x, null) + more + '</div>' +
        '<div class="kd-row"><button class="sec sm kd-aidel" type="button" data-i="' + i + '">🗑 Xóa</button></div></div>';
    }).join('');
    countText(); math(box);
  }

  /* ---------------------------------------------------------------- Gemini */
  function getKey() {
    var k = ($('kdKey').value || '').trim();
    if (!k) { var g = $('gAiK'); if (g && g.value) k = g.value.trim(); }
    return k;
  }
  /* ---- Chọn model tự động: dò danh sách model của key, dùng bản mới nhất còn hoạt động ---- */
  var BAD_MODEL = /(image|tts|audio|live|embed|aqa|imagen|veo|robotics|computer-use|learnlm|gemma|native|vision|deprecated)/i;
  function verOf(n) {
    var m = String(n).match(/gemini-(\d+)(?:\.(\d+))?/);
    return m ? parseInt(m[1], 10) + parseInt(m[2] || '0', 10) / 100 : 0;
  }
  function tierOf(n) { return /flash-lite/.test(n) ? 'lite' : /flash/.test(n) ? 'flash' : /pro/.test(n) ? 'pro' : 'other'; }
  function isPrev(n) { return /(preview|exp)/.test(n) ? 1 : 0; }
  function rankModels(list, tier) {
    var order = tier === 'pro' ? ['pro', 'flash', 'lite'] : tier === 'flash' ? ['flash', 'lite', 'pro'] : ['lite', 'flash', 'pro'];
    var out = [];
    order.forEach(function (t) {
      list.filter(function (n) { return tierOf(n) === t; }).sort(function (a, b) {
        return (verOf(b) - verOf(a)) || (isPrev(a) - isPrev(b)) || (a.length - b.length);
      }).forEach(function (n) { out.push(n); });
    });
    return out;
  }
  function listModels(force) {
    var key = getKey();
    if (!key) return Promise.reject(new Error('Chưa nhập API key Gemini (ô "API key Gemini" ở trên).'));
    if (!force) {
      try {
        var c = JSON.parse(sessionStorage.getItem('kd_models') || 'null');
        if (c && Date.now() - c.t < 3600000 && c.k === key.slice(-6) && c.l && c.l.length) return Promise.resolve(c.l);
      } catch (e) { }
    }
    return fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=' + encodeURIComponent(key)).then(function (r) {
      if (!r.ok) {
        var bad = r.status === 400 || r.status === 403;
        var er = new Error(bad ? 'API key không hợp lệ hoặc không có quyền (HTTP ' + r.status + ').' : 'Không dò được danh sách model (HTTP ' + r.status + ').');
        er.fatal = bad; throw er;
      }
      return r.json();
    }).then(function (j) {
      var l = (j.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; })
        .map(function (m) { return String(m.name).replace(/^models\//, ''); })
        .filter(function (n) { return /^gemini-/.test(n) && !BAD_MODEL.test(n); });
      try { sessionStorage.setItem('kd_models', JSON.stringify({ t: Date.now(), k: key.slice(-6), l: l })); } catch (e) { }
      return l;
    });
  }
  function candidates() {
    var m = ($('kdModel').value || '').trim();
    if (m && m.toLowerCase() !== 'auto') return Promise.resolve([m]);
    return listModels(false).then(function (l) {
      var r = rankModels(l, $('kdTier').value);
      if (!r.length) throw new Error('Key này không có model Gemini nào dùng được.');
      return r;
    }, function (e) {
      if (e.fatal || /Chưa nhập/.test(e.message)) throw e;
      return ['gemini-flash-lite-latest', 'gemini-flash-latest'];
    });
  }
  function detectModels() {
    var n = $('kdModelNote'); n.textContent = 'Đang dò model…'; n.style.color = '';
    listModels(true).then(function (l) {
      var r = rankModels(l, $('kdTier').value);
      $('kdModelList').innerHTML = l.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('');
      n.innerHTML = 'Key này dùng được <b>' + l.length + '</b> model. Tự chọn: <b>' + esc(r[0] || '—') + '</b>' + (r[1] ? ' (dự phòng: ' + esc(r.slice(1, 3).join(', ')) + ')' : '') + '.';
    }).catch(function (e) { n.textContent = e.message; n.style.color = '#c62828'; });
  }
  function once(model, prompt, temp) {
    var key = getKey();
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
    var gc = { responseMimeType: 'application/json' };
    if (verOf(model) < 3 && temp != null) gc.temperature = temp;   // Gemini 3.x: để nhiệt độ mặc định
    return fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gc })
    }).then(function (r) {
      if (r.ok) return r.json();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var msg = (j.error && j.error.message) || '';
        var human = r.status === 400 ? 'API key không hợp lệ hoặc yêu cầu bị từ chối' :
          r.status === 403 ? 'Key không có quyền hoặc bị chặn' :
            r.status === 404 ? 'Model không tồn tại hoặc đã ngừng' :
              r.status === 429 ? 'Hết lượt gọi (giới hạn miễn phí)' : 'Lỗi máy chủ Gemini';
        var e = new Error(human + ' (HTTP ' + r.status + ', ' + model + ').');
        e.retry = [404, 429, 500, 503].indexOf(r.status) >= 0 ||
          (r.status === 400 && /model|not supported|unsupported|not found/i.test(msg) && !/api key/i.test(msg));
        throw e;
      });
    }).then(function (j) {
      var c = j.candidates && j.candidates[0];
      var t = c && c.content && c.content.parts ? c.content.parts.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('') : '';
      if (!t) { var e = new Error('Gemini không trả về nội dung (' + model + '; có thể bị bộ lọc an toàn chặn).'); e.retry = true; throw e; }
      S.model = model;
      var n = $('kdModelNote'); if (n) { n.innerHTML = 'Đang dùng model: <b>' + esc(model) + '</b>'; n.style.color = ''; }
      return t;
    });
  }
  function callGemini(prompt, temp) {
    if (!getKey()) return Promise.reject(new Error('Chưa nhập API key Gemini (ô "API key Gemini" ở trên).'));
    saveKey();
    return candidates().then(function (c) {
      function go(i) {
        return once(c[i], prompt, temp).catch(function (e) {
          if (e.retry && i + 1 < c.length && i < 3) return go(i + 1);
          throw e;
        });
      }
      return go(0);
    });
  }
  function parseJSON(t) {
    t = String(t).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) { }
    // sửa dấu gạch chéo ngược của LaTeX chưa được escape
    var fixed = t.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');
    try { return JSON.parse(fixed); } catch (e2) { }
    var s = t.search(/[\[{]/), e = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
    if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch (e3) { } }
    throw new Error('Không đọc được kết quả AI trả về. Hãy thử lại.');
  }
  function aiMsg(t, err) { var m = $('kdAiMsg'); if (m) { m.textContent = t; m.style.color = err ? '#c62828' : ''; } }

  function short(b) {
    var t = (b.noidung || '') + ' ' + ys(b).map(function (y) { return (y.ma || '') + ') ' + (y.noidung || ''); }).join(' ');
    t = t.replace(/\s+/g, ' ').trim();
    return t.length > 230 ? t.slice(0, 230) + '…' : t;
  }
  function aiPick() {
    var req = $('kdReq').value.trim();
    if (!S.ready) { aiMsg('Kho chưa tải xong.', true); return; }
    if (!req) { aiMsg('Hãy gõ yêu cầu, ví dụ: lấy 5 bài hệ thức Vi-ét mức vận dụng.', true); return; }
    var pool = S.filtered.slice(0, 150);
    if (!pool.length) { aiMsg('Bộ lọc hiện không có bài nào để AI chọn.', true); return; }
    var lines = pool.map(function (b) {
      return b.id + ' | L' + b.lop + ' | ' + b.loai + ' | ' + (b.mucdo || '?') + ' | ' + dangNames(b) + ' | ' + short(b);
    }).join('\n');
    var prompt = 'Bạn là trợ lý của giáo viên Toán THCS Việt Nam. Dưới đây là danh sách bài trong kho đề, mỗi dòng gồm: id | lớp | loại đề | mức độ (NB/TH/VD/VDC) | dạng toán | nội dung rút gọn.\n\n' +
      lines + '\n\nYÊU CẦU CỦA GIÁO VIÊN: ' + req + '\n\n' +
      'Hãy chọn các bài phù hợp nhất. Chỉ được chọn id có trong danh sách, không bịa id. Nếu yêu cầu nêu số lượng thì chọn đúng số lượng đó (hoặc ít hơn nếu không đủ bài phù hợp).\n' +
      'Trả về DUY NHẤT một JSON: {"ids":["id1","id2"],"ghi_chu":"một câu giải thích ngắn bằng tiếng Việt"}';
    aiMsg('AI đang chọn bài trong ' + pool.length + ' bài' + (S.filtered.length > 150 ? ' (chỉ gửi 150/' + S.filtered.length + ' bài đầu, hãy lọc bớt để chính xác hơn)' : '') + '…');
    $('kdPick').disabled = true;
    callGemini(prompt, 0.2).then(function (t) {
      var j = parseJSON(t), ids = (j.ids || []).filter(function (id) { return S.byId[id]; });
      if (!ids.length) { aiMsg('AI không chọn được bài nào khớp. ' + (j.ghi_chu || ''), true); return; }
      ids.forEach(function (id) { setSel(id, true); });
      S.onlySel = true; renderList();
      aiMsg('AI đã chọn ' + ids.length + ' bài. ' + (j.ghi_chu || '') + ' (bấm "Xem tất cả bài đang lọc" để quay lại danh sách đầy đủ).');
    }).catch(function (e) { aiMsg(e.message, true); }).then(function () { $('kdPick').disabled = false; });
  }

  /* ------------------------------------------------------- Sinh bài tương tự */
  function bankText(b, withAns) {
    var t = b.noidung || '';
    if (b.bang && b.bang.tieu_de) {
      t += '\n[Bảng] ' + b.bang.tieu_de.join(' | ');
      (b.bang.hang || []).forEach(function (r) { t += '\n' + r.join(' | '); });
    }
    ys(b).forEach(function (y) {
      t += '\n' + y.ma + ') ' + y.noidung;
      if (withAns && (y.dapan || y.loigiai)) t += '\n   → Đáp án: ' + (y.dapan || '') + (y.loigiai ? ' | Lời giải: ' + y.loigiai : '');
    });
    if (withAns && (b.dapan || b.loigiai)) t += '\n→ Đáp án: ' + (b.dapan || '') + (b.loigiai ? ' | Lời giải: ' + b.loigiai : '');
    return t;
  }
  function genOne(b, n) {
    var prompt = 'Bạn là giáo viên Toán THCS giàu kinh nghiệm, soạn đề theo chương trình GDPT 2018 (sách Kết nối tri thức).\n\n' +
      'BÀI MẪU (lớp ' + b.lop + ', loại đề ' + b.loai + ', mức độ ' + (b.mucdo || '?') + ', dạng: ' + dangNames(b) + '):\n' + bankText(b, true) + '\n\n' +
      'Hãy viết ' + n + ' bài TƯƠNG TỰ: giữ nguyên dạng toán, cấu trúc các ý và mức độ khó; đổi số liệu và ngữ cảnh.\n' +
      'Yêu cầu:\n- Số liệu hợp lý, bài giải được và có đáp án đẹp; phương trình, hệ phương trình, biểu thức phải có nghiệm/điều kiện phù hợp.\n' +
      '- Công thức viết bằng LaTeX đặt trong $...$.\n- Mỗi bài có đáp án và lời giải đủ các bước chính; tự kiểm tra lại kết quả trước khi trả lời.\n' +
      '- Nếu bài mẫu có hình vẽ hoặc biểu đồ, mô tả hình bằng lời trong "hinh_mo_ta" (không vẽ). Nếu không có hình thì để chuỗi rỗng.\n' +
      'Trả về DUY NHẤT một mảng JSON, mỗi phần tử có dạng:\n' +
      '{"noidung":"...","y":[{"ma":"a","noidung":"...","dapan":"...","loigiai":"..."}],"dapan":"...","loigiai":"...","hinh_mo_ta":""}\n' +
      'Nếu bài mẫu không chia ý thì "y" là []. Nếu bài mẫu chia ý thì giữ đúng các ý đó (đáp án và lời giải để trong từng ý, còn "dapan","loigiai" ở ngoài để rỗng).\n' +
      'Trong JSON, mỗi dấu gạch chéo ngược của LaTeX phải viết thành hai dấu (\\\\), ví dụ \\\\frac.';
    return callGemini(prompt, 0.7).then(function (t) {
      var arr = parseJSON(t); if (!Array.isArray(arr)) arr = arr.bai || arr.items || [arr];
      return arr.filter(function (x) { return x && x.noidung; }).slice(0, n).map(function (x) {
        return {
          from: b.id, picked: true, noidung: String(x.noidung), dapan: x.dapan ? String(x.dapan) : '', loigiai: x.loigiai ? String(x.loigiai) : '',
          hinh_mo_ta: x.hinh_mo_ta ? String(x.hinh_mo_ta) : '', mucdo: b.mucdo, diem: b.diem,
          y: (x.y || []).map(function (y) { return { ma: String(y.ma || ''), noidung: String(y.noidung || ''), dapan: y.dapan ? String(y.dapan) : '', loigiai: y.loigiai ? String(y.loigiai) : '' }; })
        };
      });
    });
  }
  function nums(s) {
    return (String(s).replace(/\\[a-zA-Z]+/g, ' ').match(/-?\d+(?:[.,]\d+)?/g) || []).map(function (x) { return x.replace(',', '.'); });
  }
  function sameAnswer(a, b) {
    var na = nums(a), nb = nums(b);
    if (na.length || nb.length) {
      var A = new Set(na), B = new Set(nb);
      if (!A.size || !B.size) return false;
      var inter = 0; A.forEach(function (x) { if (B.has(x)) inter++; });
      return inter === Math.min(A.size, B.size) && Math.abs(A.size - B.size) <= Math.max(1, Math.floor(Math.max(A.size, B.size) / 2));
    }
    var n = function (s) { return String(s).toLowerCase().replace(/[\s$\\{}]/g, ''); };
    return n(a) === n(b);
  }
  function verifyOne(x) {
    var q = x.noidung + ys(x).map(function (y) { return '\n' + y.ma + ') ' + y.noidung; }).join('');
    var prompt = 'Hãy giải độc lập bài toán sau (Toán THCS Việt Nam), tính cẩn thận từng bước.\n\n' + q +
      '\n\nChỉ trả về JSON: {"dapan_cuoi":"đáp án cuối cùng ngắn gọn; nếu có nhiều ý thì ghi theo từng ý a), b), ..."}. Trong JSON, mỗi dấu gạch chéo ngược của LaTeX viết thành hai dấu.';
    return callGemini(prompt, 0.1).then(function (t) {
      var j = parseJSON(t), other = String(j.dapan_cuoi || '');
      var mine = (x.dapan || '') + ' ' + ys(x).map(function (y) { return y.dapan || ''; }).join(' ');
      x.check = { ok: sameAnswer(mine, other), other: other, note: 'So sánh số liệu trong hai lần giải; chỉ là kiểm tra sơ bộ.' };
    }).catch(function () { x.check = null; });
  }
  var genBusy = false;
  function genSimilar(ids) {
    if (genBusy) return;
    ids = ids.filter(function (id) { return S.byId[id]; });
    if (!ids.length) { aiMsg('Hãy tick chọn ít nhất một bài (hoặc bấm nút "Sinh bài tương tự" trên bài đó).', true); return; }
    if (ids.length > 6) { aiMsg('Mỗi lần chỉ nên sinh cho tối đa 6 bài; tôi sẽ làm 6 bài đầu trong số đã chọn.'); ids = ids.slice(0, 6); }
    var n = Math.max(1, Math.min(5, parseInt($('kdNVar').value, 10) || 3));
    var verify = $('kdVerify').checked, k = 0, added = 0;
    genBusy = true; $('kdGen').disabled = true;
    (function next() {
      if (k >= ids.length) {
        genBusy = false; $('kdGen').disabled = false;
        aiMsg('Đã sinh ' + added + ' bài tương tự' + (verify ? ' và cho AI giải lại để kiểm tra' : '') + '. Hãy xem lại trước khi dùng.');
        renderAi(); return;
      }
      var b = S.byId[ids[k]]; k++;
      aiMsg('Đang sinh bài tương tự cho ' + b.id + ' (' + k + '/' + ids.length + ')…');
      genOne(b, n).then(function (arr) {
        var chain = Promise.resolve();
        arr.forEach(function (x) {
          S.ai.push(x); added++;
          if (verify) chain = chain.then(function () { aiMsg('AI đang giải lại để kiểm tra (' + b.id + ')…'); return verifyOne(x); });
        });
        return chain;
      }).catch(function (e) { aiMsg(e.message, true); k = ids.length; }).then(function () { renderAi(); next(); });
    })();
  }

  /* ----------------------------------------------------------------- Xuất đề */
  function pickedItems() {
    var a = S.order.map(function (id) { return S.byId[id]; }).filter(Boolean);
    return a.concat(S.ai.filter(function (x) { return x.picked; }));
  }
  function compose() {
    var items = pickedItems();
    if (!items.length) { $('kdOutMsg').textContent = 'Chưa chọn bài nào.'; return ''; }
    var pt = $('kdPt').checked, da = $('kdDa').checked, lg = $('kdLg').checked;
    var de = [], dk = [];
    items.forEach(function (b, i) {
      var n = i + 1, head = 'Câu ' + n + '. ' + (pt && b.diem ? '(' + String(b.diem).replace('.', ',') + ' điểm) ' : '');
      var t = head + (b.noidung || '');
      if (b.bang && b.bang.tieu_de) {
        t += '\n' + b.bang.tieu_de.join(' | ');
        (b.bang.hang || []).forEach(function (r) { t += '\n' + r.join(' | '); });
      }
      if (b.hinh) t += '\n(Hình vẽ: ' + b._dir + b.hinh + ')';
      if (b.hinh_mo_ta) t += '\n(Hình vẽ: ' + b.hinh_mo_ta + ')';
      ys(b).forEach(function (y) { t += '\n' + lbl(y) + ' ' + (y.noidung || ''); });
      de.push(t);
      var s = 'Câu ' + n + '.';
      var has = false;
      ys(b).forEach(function (y) {
        var part = '';
        if (da && y.dapan) part += ' Đáp án: ' + y.dapan;
        if (lg && y.loigiai) part += '\n   Lời giải: ' + y.loigiai;
        if (part) { s += '\n' + lbl(y) + part; has = true; }
      });
      var top = '';
      if (da && b.dapan) top += 'Đáp án: ' + b.dapan;
      if (lg && b.loigiai) top += (top ? '\n' : '') + 'Lời giải: ' + b.loigiai;
      if (top) { s += '\n' + top; has = true; }
      if (has) dk.push(s);
    });
    var out = de.join('\n\n') + '\n\n--- HẾT ---';
    if (dk.length) out += '\n\nĐÁP ÁN VÀ LỜI GIẢI\n\n' + dk.join('\n\n');
    $('kdOut').value = out;
    $('kdOutMsg').textContent = 'Đã tạo đề gồm ' + items.length + ' câu' + (S.ai.some(function (x) { return x.picked; }) ? ' (có bài do AI sinh, cần kiểm tra lại)' : '') + '.';
    return out;
  }
  function getOut() { var v = $('kdOut').value; return v && v.trim() ? v : compose(); }
  function copyOut() {
    var v = getOut(); if (!v) return;
    var done = function () { $('kdOutMsg').textContent = 'Đã sao chép vào bộ nhớ tạm.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { $('kdOut').select(); document.execCommand('copy'); done(); });
    else { $('kdOut').select(); document.execCommand('copy'); done(); }
  }
  function downloadTxt() {
    var v = getOut(); if (!v) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + v], { type: 'text/plain;charset=utf-8' }));
    a.download = 'de-tu-kho-de.txt'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function sendLatex() {
    var v = getOut(); if (!v) return;
    var inp = $('input');
    if (!inp) { $('kdOutMsg').textContent = 'Không tìm thấy ô nhập của công cụ Chuyển LaTeX. Hãy bấm "Sao chép" rồi dán vào công cụ đó.'; return; }
    // Nếu công cụ đang giữ danh sách file (ô nhập bị khóa / chỉ để xem) thì xóa danh sách trước,
    // vì word-ui.js ưu tiên file đã chọn hơn văn bản dán vào ô nhập.
    var clr = $('btnClearFiles');
    if (clr && (inp.readOnly || inp.dataset.fromFile === '1')) clr.click();
    inp.readOnly = false;
    inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true }));
    var wt = $('wtSel');
    if (wt) { wt.value = 'wtLatex'; wt.dispatchEvent(new Event('change', { bubbles: true })); }
    var tab = document.querySelector('.tab[data-tab="t3"]'); if (tab) tab.click();
    $('kdOutMsg').textContent = 'Đã gửi sang Chuyển LaTeX → Word / PDF.';
  }

  /* ------------------------------------------------------------------ Khởi tạo */
  function init() {
    try {
      var sel = $('mSel'), t5 = $('t5');
      if (!sel || !t5 || $('mKho')) return;
      addCss();
      var o = document.createElement('option'); o.value = 'mKho'; o.textContent = '📚 Kho đề (lớp 6–9, thi vào 10)';
      sel.appendChild(o);
      var p = document.createElement('div'); p.className = 'mt'; p.id = 'mKho'; t5.appendChild(p);
      build(p);
      sel.addEventListener('change', function () {
        var k = $('mKho'), kids = t5.children;
        if (sel.value === 'mKho') {
          for (var i = 0; i < kids.length; i++) if (kids[i].classList.contains('mt')) kids[i].classList.remove('on');
          k.classList.add('on'); load(false);
        } else k.classList.remove('on');
      });
    } catch (e) { if (window.console) console.error('kho-de.js:', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
