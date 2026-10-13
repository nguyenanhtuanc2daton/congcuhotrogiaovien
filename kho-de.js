/* =====================================================================
   kho-de.js — Kho đề lớp 6-9 & thi vào 10 (Toán học → "📚 Kho đề") — BẢN TỐI GIẢN
   - Tự động lấy API key Gemini từ gkey.js (không cần ô nhập riêng)
   - Tự động chọn model AI mới nhất còn hoạt động, không cần bấm "Dò"
   - Giao diện gọn: chỉ Lớp, Loại đề, Chương
   - Nút "AI chọn bài": AI tự chọn bài phù hợp theo đúng dạng đã lọc
   - Nút "Sinh bài tương tự": AI tạo biến thể, TỰ GIẢI LẠI kiểm tra đáp án,
     chỉ giữ bài khi AI giải lại cho kết quả khớp
   - Nút "Xuất file Word": chuyển nội dung sang dạng văn bản phối hợp LaTeX
     tương thích MathType (tách chữ thường và công thức bằng $, không dùng
     \textbf hay \qquad trong phần văn bản), rồi gửi sang tab Chuyển LaTeX
   - BẢN SỬA LỖI XUẤT WORD:
       + Chuẩn hóa LaTeX trước khi gửi (\backsim→\sim, \dfrac→\frac, \leqslant→\leq, \big...→bỏ, ...)
         để tab Chuyển LaTeX → Word không báo "lệnh chưa hỗ trợ"
       + Sửa lỗi đọc JSON của AI làm hỏng \frac, \triangle, \neq, \right... (bị hiểu thành \f, \t, \n, \r)
       + Rà soát công thức trước khi gửi: dấu $ lẻ, ngoặc {} lệch, \begin/\end lệch, lệnh lạ
       + Hình vẽ: kiểm tra/tải trước file hình, hiển thị ảnh thật ở ô xem trước của tab Chuyển LaTeX
       + Sửa lỗi gửi nhầm đề cũ (S.lastOut không được làm mới khi đổi bài chọn)
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var S = {
    ready: false, loading: false, ct: null, items: [], byId: {}, errs: [],
    CH: {}, DG: {}, sel: {}, order: [], ai: [], filtered: [],
    f: { lop: '', loai: '', chuong: '' },
    model: '', lastOut: ''
  };
  var MD_NAME = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' };

  /* ------------------------------------------------------------------ CSS */
  function addCss() {
    if ($('kd-css')) return;
    var st = document.createElement('style');
    st.id = 'kd-css';
    st.textContent =
      '#mKho .kd-chip{display:inline-block;padding:1px 8px;border-radius:99px;background:var(--card2,#eceff1);font-size:12px;margin-left:4px}' +
      '#mKho .kd-warn{background:#fff3cd;color:#7a5d00}' +
      '#mKho .kd-ok{background:#d7f0dc;color:#1b5e20}' +
      '#mKho .kd-bad{background:#fde0dd;color:#b71c1c}' +
      '#mKho h3{margin:14px 0 6px;font-size:15px}' +
      '#mKho .kd-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}' +
      '#mKho .kd-row input[type=text]{flex:1 1 200px;min-width:150px}' +
      '#mKho .kd-sel-list{max-height:200px;overflow:auto;border:1px solid var(--bd,#cfd8dc);border-radius:8px;padding:6px 10px;background:var(--card2,#fafafa)}' +
      '#mKho .kd-sel-item{display:flex;justify-content:space-between;gap:8px;padding:2px 0;font-size:13px;border-bottom:1px dashed var(--bd,#e0e0e0)}' +
      '#mKho .kd-sel-item:last-child{border-bottom:none}' +
      '#mKho .kd-ai-preview{width:100%;min-height:180px;font-family:inherit;font-size:13px}' +
      '#mKho .kd-count{font-weight:600;color:var(--cy,#0a7)}' +
      '#mKho #kdOutMsg{white-space:pre-line}';
    document.head.appendChild(st);
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
          (d.bai || []).forEach(function (b, pos) {
            if (S.byId[b.id]) return;
            b._dir = dir; b._file = p; b._pos = pos + 1; S.byId[b.id] = b; S.items.push(b);
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
      '<button class="sec sm" id="kdClear" type="button">✖ Xóa lọc</button></div>' +

      '<div class="kd-row"><input type="text" id="kdReq" placeholder="Yêu cầu thêm cho AI (không bắt buộc), ví dụ: ưu tiên bài mức vận dụng, có hình vẽ">' +
      '<button class="sm" id="kdPick" type="button">🤖 AI chọn bài</button></div>' +

      '<div class="kd-row"><span class="note kd-count" id="kdCount" style="margin:0"></span>' +
      '<button class="sec sm" id="kdSelAll" type="button">Chọn tất cả đang lọc</button>' +
      '<button class="sec sm" id="kdSelNone" type="button">Bỏ chọn hết</button></div>' +

      '<div id="kdSelBox" style="display:none"><b>Bài đã chọn:</b><div class="kd-sel-list" id="kdSelList"></div></div>' +

      '<h3>✨ Sinh bài tương tự</h3>' +
      '<div class="kd-row"><label>Số biến thể mỗi bài <input type="number" id="kdNVar" value="3" min="1" max="5" style="width:60px"></label>' +
      '<button class="green sm" id="kdGen" type="button">✨ Sinh bài tương tự cho các bài đã chọn</button>' +
      '<button class="sec sm" id="kdAiClear" type="button">🗑 Xóa bài AI</button></div>' +
      '<div class="note" id="kdAiMsg"></div>' +
      '<div id="kdAiBox" style="display:none"><b>Bài AI đã sinh:</b> <span id="kdAiCount"></span> ' +
      '<button class="sec sm" id="kdAiToggle" type="button">Xem trước</button> ' +
      '<button class="sec sm" id="kdAiCopy" type="button">Sao chép</button>' +
      '<textarea id="kdAiPreview" class="kd-ai-preview" readonly style="display:none;margin-top:6px"></textarea></div>' +

      '<h3>📄 Xuất đề Word</h3>' +
      '<div class="kd-row">' +
      '<label class="qchip"><input type="checkbox" id="kdDa" checked> Kèm đáp án</label>' +
      '<label class="qchip"><input type="checkbox" id="kdLg" checked> Kèm lời giải</label>' +
      '<button class="sm" id="kdRandom5" type="button">🎲 Tạo đề ngẫu nhiên</button>' +
      '<button class="green sm" id="kdSend" type="button">📄 Xuất file Word</button></div>' +
      '<div class="note" id="kdOutMsg">Chọn bài ở trên (hoặc để AI chọn) rồi bấm "Tạo đề ngẫu nhiên". Nút "Xuất file Word" sẽ chuyển công thức sang dạng LaTeX tương thích MathType và gửi sang tab Chuyển LaTeX → Word / PDF.</div>';

    bind();
  }

  function bind() {
    $('kdReload').onclick = function () { try { sessionStorage.removeItem('kd_files'); } catch (e) { } S.ready = false; load(true); };
    $('kdLop').onchange = function () { fillChuong(); readFilters(); };
    $('kdChuong').onchange = readFilters;
    $('kdLoai').onchange = readFilters;
    $('kdClear').onclick = function () {
      $('kdLop').value = ''; $('kdLoai').value = ''; $('kdReq').value = '';
      fillChuong(); readFilters();
    };
    $('kdSelAll').onclick = function () { S.filtered.forEach(function (b) { setSel(b.id, true); }); renderSelList(); refresh(); };
    $('kdSelNone').onclick = function () { S.lastOut = ''; S.sel = {}; S.order = []; renderSelList(); refresh(); };
    $('kdPick').onclick = aiPick;
    $('kdGen').onclick = function () { genSimilar(S.order.slice()); };
    $('kdAiClear').onclick = function () { S.lastOut = ''; S.ai = []; renderAi(); $('kdOutMsg').textContent = 'Đã xóa bài AI.'; };
    $('kdAiToggle').onclick = function () {
      var ta = $('kdAiPreview');
      if (ta.style.display === 'none') { ta.value = composeAiText(); ta.style.display = 'block'; this.textContent = 'Ẩn'; }
      else { ta.style.display = 'none'; this.textContent = 'Xem trước'; }
    };
    $('kdAiCopy').onclick = function () {
      var v = composeAiText();
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { $('kdAiMsg').textContent = 'Đã sao chép bài AI.'; });
      else { var ta = $('kdAiPreview'); ta.value = v; ta.select(); document.execCommand('copy'); }
    };
    $('kdDa').onchange = $('kdLg').onchange = function () { S.lastOut = ''; };
    $('kdRandom5').onclick = function () { compose(true); };
    $('kdSend').onclick = function () { sendLatex(); };
  }

  function fillFilters() {
    var lo = $('kdLoai'); lo.innerHTML = '<option value="">Tất cả</option>';
    var m = (S.ct.meta && S.ct.meta.loai_de) || {};
    Object.keys(m).forEach(function (k) { lo.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + esc(m[k]) + '</option>'); });
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
  }

  /* ---------------------------------------------------------------- Lọc bài */
  function readFilters() {
    S.f.lop = $('kdLop').value; S.f.loai = $('kdLoai').value; S.f.chuong = $('kdChuong').value;
    refresh();
  }
  function ys(b) { return b.y || []; }
  function hasChuong(b, ma) {
    if (b.chuong === ma) return true;
    return (b.dang_phu || []).some(function (d) { return d.indexOf(ma + '-') === 0; }) || ys(b).some(function (y) { return y.dang && y.dang.indexOf(ma + '-') === 0; });
  }
  function plain(b) {
    return [b.id, b.noidung].concat(ys(b).map(function (y) { return y.noidung; })).concat([dangNames(b)]).join(' ').toLowerCase();
  }
  function match(b) {
    var f = S.f;
    if (f.lop && String(b.lop) !== f.lop) return false;
    if (f.loai && b.loai !== f.loai) return false;
    if (f.chuong && !hasChuong(b, f.chuong)) return false;
    return true;
  }
  function refresh() {
    S.filtered = S.items.filter(match);
    var c = $('kdCount'); if (c) c.textContent = 'Đang lọc được ' + S.filtered.length + ' bài · đã chọn ' + S.order.length + ' bài';
    renderSelList();
  }
  function setSel(id, on) {
    S.lastOut = '';
    if (on) { if (!S.sel[id]) { S.sel[id] = true; S.order.push(id); } }
    else if (S.sel[id]) { delete S.sel[id]; S.order = S.order.filter(function (x) { return x !== id; }); }
  }
  function renderSelList() {
    var box = $('kdSelBox'), list = $('kdSelList');
    if (!box || !list) return;
    if (!S.order.length) { box.style.display = 'none'; list.innerHTML = ''; return; }
    box.style.display = '';
    list.innerHTML = S.order.map(function (id) {
      var b = S.byId[id]; if (!b) return '';
      return '<div class="kd-sel-item"><span><b>' + esc(b.id) + '</b> · L' + esc(b.lop) + ' · ' + esc(b.mucdo || '?') + ' · ' + esc(dangNames(b)) + '</span>' +
        '<button class="sec sm" type="button" data-id="' + esc(b.id) + '">✕</button></div>';
    }).join('');
    list.onclick = function (e) {
      var btn = e.target.closest('button[data-id]'); if (!btn) return;
      setSel(btn.getAttribute('data-id'), false); renderSelList(); refresh();
    };
  }
  function renderAi() {
    var box = $('kdAiBox'), cnt = $('kdAiCount');
    if (!box) return;
    if (!S.ai.length) { box.style.display = 'none'; return; }
    box.style.display = '';
    if (cnt) cnt.textContent = S.ai.length + ' bài';
  }

  /* ---------------------------------------------------------------- Gemini */
  function getKey() {
    if (window.GKEY && typeof window.GKEY.get === 'function') return window.GKEY.get();
    var g = $('gAiK'); if (g && g.value) return g.value.trim();
    return '';
  }
  function requireKey() {
    var k = getKey();
    if (k) return k;
    if (window.GKEY && typeof window.GKEY.open === 'function') {
      window.GKEY.open('Vui lòng nhập API key Gemini ở khung phía trên (dùng chung cho mọi tính năng AI).');
    }
    throw new Error('Chưa nhập API key Gemini. Hãy nhập ở khung phía trên đầu trang.');
  }

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
    if (!key) return Promise.reject(new Error('Chưa nhập API key Gemini.'));
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
    var tier = 'lite';
    return listModels(false).then(function (l) {
      var r = rankModels(l, tier);
      if (!r.length) throw new Error('Key này không có model Gemini nào dùng được.');
      return r;
    }, function (e) {
      if (e.fatal) throw e;
      return ['gemini-flash-lite-latest', 'gemini-flash-latest'];
    });
  }
  function once(model, prompt, temp) {
    var key = getKey();
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
    var gc = { responseMimeType: 'application/json' };
    if (verOf(model) < 3 && temp != null) gc.temperature = temp;
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
      return t;
    });
  }
  function callGemini(prompt, temp) {
    if (!getKey()) return Promise.reject(new Error('Chưa nhập API key Gemini. Hãy nhập ở khung phía trên đầu trang.'));
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
  /* Các lệnh LaTeX bắt đầu bằng b/f/n/r/t/u dễ bị JSON.parse hiểu nhầm thành \b \f \n \r \t \u
     (ví dụ "\frac" → ký tự form-feed + "rac"; "\triangle" → tab + "riangle"). Nhân đôi dấu \ trước khi parse. */
  var TEX_ESC = 'frac|forall|flat|frown|fbox|triangle|times|theta|therefore|text|textbf|textit|textstyle|tan|tanh|tau|to|top|tilde|tfrac|tag|tiny|' +
    'bar|begin|beta|because|binom|bigcup|bigcap|bigl|bigr|bigm|Bigl|Bigr|bigg|Bigg|big|Big|boxed|bmod|backsim|bot|bullet|bf|' +
    'neq|ne|nu|not|notin|ni|neg|nabla|nearrow|nparallel|nmid|nsubseteq|nolimits|nonumber|notag|' +
    'right|rho|rightarrow|Rightarrow|rangle|rbrace|rfloor|rceil|rvert|rVert|rm';
  var TEX_RE = new RegExp('\\\\\\\\|\\\\(?=(?:' + TEX_ESC + ')(?![a-zA-Z]))|\\\\u(?![0-9a-fA-F]{4})', 'g');
  function dblSlash(m) { return m === '\\\\' ? m : '\\\\' + m.slice(1); }
  function parseJSON(t) {
    t = String(t).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    var t2 = t.replace(TEX_RE, dblSlash);
    try { return JSON.parse(t2); } catch (e) { }
    var fixed = t2.replace(/\\\\|\\(?!["\/bfnrtu])/g, dblSlash);
    try { return JSON.parse(fixed); } catch (e2) { }
    var s = fixed.search(/[\[{]/), e = Math.max(fixed.lastIndexOf(']'), fixed.lastIndexOf('}'));
    if (s >= 0 && e > s) { try { return JSON.parse(fixed.slice(s, e + 1)); } catch (e3) { } }
    throw new Error('Không đọc được kết quả AI trả về. Hãy thử lại.');
  }
  function aiMsg(t, err) { var m = $('kdAiMsg'); if (m) { m.textContent = t; m.style.color = err ? '#c62828' : ''; } }

  function short(b) {
    var t = (b.noidung || '') + ' ' + ys(b).map(function (y) { return (y.ma || '') + ') ' + (y.noidung || ''); }).join(' ');
    t = t.replace(/\s+/g, ' ').trim();
    return t.length > 230 ? t.slice(0, 230) + '…' : t;
  }

  /* ---------------------------------------------- AI chọn bài theo bộ lọc */
  function aiPick() {
    if (!S.ready) { aiMsg('Kho chưa tải xong.', true); return; }
    if (!S.filtered.length) { aiMsg('Bộ lọc hiện không có bài nào. Hãy nới bộ lọc (chọn Lớp/Chương rộng hơn).', true); return; }
    try { requireKey(); } catch (e) { aiMsg(e.message, true); return; }
    var extra = $('kdReq').value.trim();
    var ctx = [];
    if (S.f.lop) ctx.push('lớp ' + S.f.lop);
    if (S.f.loai) ctx.push('loại đề ' + S.f.loai);
    if (S.f.chuong) ctx.push('chương ' + (S.CH[S.f.chuong] || S.f.chuong));
    var ctxStr = ctx.length ? ctx.join(' · ') : 'toàn bộ kho';
    var pool = S.filtered.slice(0, 200);
    var lines = pool.map(function (b) {
      return b.id + ' | L' + b.lop + ' | ' + b.loai + ' | ' + (b.mucdo || '?') + ' | ' + dangNames(b) + ' | ' + short(b);
    }).join('\n');
    var prompt = 'Bạn là trợ lý của giáo viên Toán THCS Việt Nam. Bộ lọc hiện tại: ' + ctxStr + '.\n' +
      'Dưới đây là danh sách bài trong kho đề, mỗi dòng: id | lớp | loại đề | mức độ (NB/TH/VD/VDC) | dạng toán | nội dung rút gọn.\n\n' +
      lines + '\n\n' +
      (extra ? 'YÊU CẦU THÊM CỦA GIÁO VIÊN: ' + extra + '\n\n' : '') +
      'Hãy chọn các bài phù hợp nhất với bộ lọc' + (extra ? ' và yêu cầu thêm' : '') + '. ' +
      'Chỉ được chọn id có trong danh sách, không bịa id. Nếu không có yêu cầu số lượng cụ thể, hãy chọn khoảng 5–10 bài đa dạng mức độ.\n' +
      'Trả về DUY NHẤT một JSON: {"ids":["id1","id2"],"ghi_chu":"một câu giải thích ngắn bằng tiếng Việt"}';
    aiMsg('AI đang chọn bài trong ' + pool.length + ' bài' + (S.filtered.length > 200 ? ' (chỉ gửi 200/' + S.filtered.length + ' bài đầu)' : '') + '…');
    $('kdPick').disabled = true;
    callGemini(prompt, 0.2).then(function (t) {
      var j = parseJSON(t), ids = (j.ids || []).filter(function (id) { return S.byId[id]; });
      if (!ids.length) { aiMsg('AI không chọn được bài nào khớp. ' + (j.ghi_chu || ''), true); return; }
      S.sel = {}; S.order = [];
      ids.forEach(function (id) { setSel(id, true); });
      renderSelList(); refresh();
      aiMsg('AI đã chọn ' + ids.length + ' bài. ' + (j.ghi_chu || ''));
    }).catch(function (e) { aiMsg(e.message, true); }).then(function () { $('kdPick').disabled = false; });
  }

  /* ---------------------------------------------- Sinh bài tương tự + AI tự giải lại */
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
      'Nếu bài mẫu không chia ý thì "y" là []. Nếu bài mẫu chia ý thì giữ đúng các ý đó.\n' +
      'Trong JSON, mỗi dấu gạch chéo ngược của LaTeX phải viết thành hai dấu (\\\\), ví dụ \\\\frac.';
    return callGemini(prompt, 0.7).then(function (t) {
      var arr = parseJSON(t); if (!Array.isArray(arr)) arr = arr.bai || arr.items || [arr];
      return arr.filter(function (x) { return x && x.noidung; }).slice(0, n).map(function (x) {
        return {
          from: b.id, noidung: String(x.noidung), dapan: x.dapan ? String(x.dapan) : '', loigiai: x.loigiai ? String(x.loigiai) : '',
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
      x.check = { ok: sameAnswer(mine, other), other: other };
    }).catch(function () { x.check = null; });
  }
  var genBusy = false;
  function genSimilar(ids) {
    if (genBusy) return;
    ids = ids.filter(function (id) { return S.byId[id]; });
    if (!ids.length) { aiMsg('Hãy để AI chọn bài (hoặc chọn bài thủ công) trước khi sinh bài tương tự.', true); return; }
    try { requireKey(); } catch (e) { aiMsg(e.message, true); return; }
    if (ids.length > 6) { aiMsg('Mỗi lần chỉ nên sinh cho tối đa 6 bài; tôi sẽ làm 6 bài đầu trong số đã chọn.'); ids = ids.slice(0, 6); }
    var n = Math.max(1, Math.min(5, parseInt($('kdNVar').value, 10) || 3));
    var k = 0, added = 0, rejected = 0;
    genBusy = true; $('kdGen').disabled = true;
    (function next() {
      if (k >= ids.length) {
        genBusy = false; $('kdGen').disabled = false;
        aiMsg('Đã sinh ' + added + ' bài tương tự (đã qua kiểm tra AI tự giải lại).' + (rejected ? ' Bỏ ' + rejected + ' bài vì AI giải lại cho kết quả khác.' : '') + ' Hãy xem lại trước khi dùng.');
        renderAi(); return;
      }
      var b = S.byId[ids[k]]; k++;
      aiMsg('Đang sinh bài tương tự cho ' + b.id + ' (' + k + '/' + ids.length + ')…');
      genOne(b, n).then(function (arr) {
        var chain = Promise.resolve();
        arr.forEach(function (x) {
          chain = chain.then(function () {
            aiMsg('AI đang tự giải lại để kiểm tra (' + b.id + ')…');
            return verifyOne(x).then(function () {
              if (x.check && x.check.ok) { S.ai.push(x); S.lastOut = ''; added++; }
              else { rejected++; }
            });
          });
        });
        return chain;
      }).catch(function (e) { aiMsg(e.message, true); k = ids.length; }).then(function () { renderAi(); next(); });
    })();
  }

  /* ------------------------------------ Chuyển công thức sang LaTeX tương thích MathType */
  /* Quy tắc:
     - Chữ thường (văn bản) để nguyên ngoài $...$
     - Công thức toán đặt trong $...$
     - KHÔNG dùng \textbf, \qquad trong phần văn bản
     - Các môi trường \begin{cases}...\end{cases}, \begin{aligned}...\end{aligned}
       được giữ trong $...$ để MathType nhận diện
     - Dấu \\ trong môi trường giữ nguyên (MathType hiểu)
  */
  /* Bảng lệnh LaTeX "lạ" → lệnh cơ bản mà bộ chuyển đổi hiểu (kết quả chụp màn hình: \backsim chưa hỗ trợ) */
  var TEX_MAP = [
    [/\\(?:backsim|thicksim|varsim)(?![a-zA-Z])/g, '\\sim'],
    [/\\backsimeq(?![a-zA-Z])/g, '\\simeq'],
    [/\\(?:dfrac|tfrac|cfrac)(?![a-zA-Z])/g, '\\frac'],
    [/\\leqslant(?![a-zA-Z])|\\leqq(?![a-zA-Z])|\\le(?![a-zA-Z])/g, '\\leq'],
    [/\\geqslant(?![a-zA-Z])|\\geqq(?![a-zA-Z])|\\ge(?![a-zA-Z])/g, '\\geq'],
    [/\\ne(?![a-zA-Z])/g, '\\neq'],
    [/\\lbrace(?![a-zA-Z])/g, '\\{'],
    [/\\rbrace(?![a-zA-Z])/g, '\\}'],
    [/\\varnothing(?![a-zA-Z])/g, '\\emptyset'],
    [/\\(?:implies|Longrightarrow)(?![a-zA-Z])/g, '\\Rightarrow'],
    [/\\(?:iff|Longleftrightarrow)(?![a-zA-Z])/g, '\\Leftrightarrow'],
    [/\\longrightarrow(?![a-zA-Z])/g, '\\rightarrow'],
    [/\\land(?![a-zA-Z])/g, '\\wedge'],
    [/\\lor(?![a-zA-Z])/g, '\\vee'],
    [/\\(?:lvert|rvert)(?![a-zA-Z])/g, '|'],
    [/\\(?:lVert|rVert)(?![a-zA-Z])/g, '\\|'],
    [/\\measuredangle(?![a-zA-Z])/g, '\\angle'],
    [/\\degree(?![a-zA-Z])/g, '^\\circ'],
    [/\\(?:dotsc|dots)(?![a-zA-Z])/g, '\\ldots'],
    [/\\dotsb(?![a-zA-Z])/g, '\\cdots'],
    [/\\cdotp(?![a-zA-Z])/g, '\\cdot'],
    [/\\(?:[Bb]ig{1,2}[lrm]?)(?![a-zA-Z])\s*/g, ''],
    [/\\operatorname\*?\s*\{([^{}]*)\}/g, '\\mathrm{$1}'],
    [/\\(?:overset|stackrel)\s*\{\s*\\(?:frown|smile)\s*\}\s*\{([^{}]*)\}/g, '\\widehat{$1}'],
    [/\\overparen\s*\{([^{}]*)\}/g, '\\widehat{$1}']
  ];
  function fixLatex(t) {
    // \( \) \[ \] → $ ; $$...$$ → $...$ (giữ nguyên \\ xuống dòng)
    t = t.replace(/\\\\|\\[()\[\]]/g, function (m) { return m === '\\\\' ? m : '$'; });
    t = t.replace(/\$\$([^$]+?)\$\$/g, '$$$1$');
    TEX_MAP.forEach(function (r) { t = t.replace(r[0], r[1]); });
    // \, \; \: \! và "\ " → khoảng trắng (không đụng tới \\)
    t = t.replace(/\\\\|\\[,;:! ]/g, function (m) { return m === '\\\\' ? m : ' '; });
    return t;
  }
  var KNOWN = {};
  ('frac sqrt left right cdot times div pm mp leq geq neq approx equiv sim simeq cong triangle angle perp parallel widehat widetilde hat bar overline underline ' +
   'vec overrightarrow overleftarrow circ text mathrm mathbf mathbb mathcal begin end cases aligned array matrix pmatrix sum prod int lim infty to ' +
   'rightarrow leftarrow Rightarrow Leftarrow Leftrightarrow leftrightarrow in notin subset subseteq supset supseteq cup cap emptyset setminus forall exists neg ' +
   'wedge vee alpha beta gamma delta epsilon varepsilon theta lambda mu pi rho sigma tau phi varphi omega Delta Gamma Theta Lambda Pi Sigma Phi Omega ' +
   'ldots cdots vdots ddots log ln sin cos tan cot sec csc arcsin arccos arctan max min gcd lcm mod binom hline cdot ' +
   'mid prime ast star oplus otimes odot nabla partial sqrt overbrace underbrace not ' +
   'Longrightarrow').split(/\s+/).forEach(function (k) { KNOWN[k] = 1; });
  function lintLatex(t) {
    var w = [], bad = {};
    (String(t).match(/\\[a-zA-Z]+/g) || []).forEach(function (c) { if (!KNOWN[c.slice(1)]) bad[c] = 1; });
    var bl = Object.keys(bad);
    if (bl.length) w.push('lệnh LaTeX ít gặp, nên kiểm tra khi chuyển đổi: ' + bl.slice(0, 8).join(' '));
    var odd = 0;
    String(t).split(/\n\s*\n/).forEach(function (p) { if (((p.replace(/\\\$/g, '').match(/\$/g) || []).length) % 2) odd++; });
    if (odd) w.push(odd + ' đoạn có số dấu $ bị lẻ (công thức bị hở)');
    var o = (String(t).match(/\\begin\{/g) || []).length, e = (String(t).match(/\\end\{/g) || []).length;
    if (o !== e) w.push('\\begin/\\end không khớp (' + o + '/' + e + ')');
    var u = String(t).replace(/\\[{}]/g, '');
    var ob = (u.match(/\{/g) || []).length, cb = (u.match(/\}/g) || []).length;
    if (ob !== cb) w.push('ngoặc { } không khớp (' + ob + '/' + cb + ')');
    return w;
  }
  function lintMsg(t) { var w = lintLatex(t); return w.length ? '\n⚠ Rà soát: ' + w.join('; ') + '.' : ''; }

  function toMathTypeText(s) {
    if (s == null) return '';
    var t = fixLatex(String(s));
    // Bỏ \textbf{...} → giữ nội dung bên trong, không có dấu sao
    t = t.replace(/\\textbf\s*\{([^{}]*)\}/g, '$1');
    t = t.replace(/\\textit\s*\{([^{}]*)\}/g, '$1');
    t = t.replace(/\\emph\s*\{([^{}]*)\}/g, '$1');
    // Bỏ \qquad, \quad → thay bằng khoảng trắng thường
    t = t.replace(/\\qquad\b/g, '   ');
    t = t.replace(/\\quad\b/g, '  ');
    // Bỏ \hspace{...}, \vspace{...}
    t = t.replace(/\\[hv]space\s*\{[^}]*\}/g, ' ');
    // Bỏ \displaystyle, \textstyle, \scriptstyle
    t = t.replace(/\\(displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b/g, '');
    // Bỏ \limits, \nolimits
    t = t.replace(/\\(limits|nolimits)\b/g, '');
    // Bỏ \nonumber, \notag
    t = t.replace(/\\(nonumber|notag)\b/g, '');
    // Bỏ \label{...}, \tag{...}
    t = t.replace(/\\(label|tag)\s*\{[^}]*\}/g, '');
    // Chuẩn hóa khoảng trắng
    t = t.replace(/[ \t]+/g, ' ');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
  }

  /* ----------------------------------------------------------------- Xuất đề */
  function pickedItems() {
    var a = S.order.map(function (id) { return S.byId[id]; }).filter(Boolean);
    return a.concat(S.ai);
  }
  function itemToText(b, n, da, lg) {
    var head = 'Câu ' + n + '. ';
    var t = head + (b.noidung || '');
    if (b.bang && b.bang.tieu_de) {
      t += '\n' + b.bang.tieu_de.join(' | ');
      (b.bang.hang || []).forEach(function (r) { t += '\n' + r.join(' | '); });
    }
    if (b.hinh) t += '\n(Hình vẽ: ' + figPath(b, b.hinh) + ')';
    if (b.hinh_mo_ta) t += '\n(Hình vẽ: ' + b.hinh_mo_ta + ')';
    ys(b).forEach(function (y) {
      t += '\n' + lbl(y) + ' ' + (y.noidung || '');
      if (y.hinh) t += '\n(Hình vẽ: ' + figPath(b, y.hinh) + ')';
    });
    var ans = '', has = false;
    ys(b).forEach(function (y) {
      var part = '';
      if (da && y.dapan) part += ' Đáp án: ' + y.dapan;
      if (lg && y.loigiai) part += '\n   Lời giải: ' + y.loigiai;
      if (part) { ans += '\n' + lbl(y) + part; has = true; }
    });
    if (da && b.dapan) { ans += '\nĐáp án: ' + b.dapan; has = true; }
    if (lg && b.loigiai) { ans += '\nLời giải: ' + b.loigiai; has = true; }
    return { de: t, dk: has ? 'Câu ' + n + '.' + ans : null };
  }
  function lbl(y) { return y.ma + ')'; }
  function figPath(b, h) {
    h = String(h).trim();
    if (/^(https?:|data:|\/|data\/)/i.test(h)) return h;
    return (b._dir || '') + h;
  }
  // Số thứ tự câu của bài trong đề gốc (câu 1, 2, 3...)
  function cauNo(b) {
    var v = b.cau != null ? b.cau : (b.stt != null ? b.stt : (b.so_cau != null ? b.so_cau : (b.thu_tu != null ? b.thu_tu : null)));
    if (v != null) { var n = parseInt(String(v).replace(/\D/g, ''), 10); if (n) return n; }
    var m = /(?:^|[-_.\s])(?:c|cau|câu)[-_ ]?0*(\d+)$/i.exec(String(b.id || ''));
    if (m) return parseInt(m[1], 10);
    return b._pos || 0; // vị trí trong file đề
  }
  function pickRandomExam() {
    var pool = S.filtered.length ? S.filtered : [];
    var used = {}, items = [], miss = [];
    for (var k = 1; k <= 5; k++) {
      var cand = pool.filter(function (b) { return cauNo(b) === k && !used[b.id]; });
      if (!cand.length) { miss.push(k); continue; }
      var b = cand[Math.floor(Math.random() * cand.length)];
      used[b.id] = 1; items.push(b);
    }
    // Thiếu câu ở vị trí nào thì lấy tạm bài ngẫu nhiên còn lại trong bộ lọc
    if (miss.length) {
      var rest = pool.filter(function (b) { return !used[b.id]; });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      items = items.concat(rest.slice(0, miss.length));
    }
    return { items: items, miss: miss };
  }
  function compose(random5) {
    var items, note = '';
    if (random5) {
      if (!S.filtered.length) { $('kdOutMsg').textContent = 'Bộ lọc hiện không có bài nào. Hãy nới bộ lọc.'; return; }
      var r = pickRandomExam(); items = r.items;
      if (!items.length) { $('kdOutMsg').textContent = 'Không chọn được câu nào theo bộ lọc hiện tại.'; return; }
      var srcs = items.map(function (b, i) { return (i + 1) + ':' + b.id; }).join(' · ');
      note = ' [' + srcs + ']' + (r.miss.length ? ' (không có câu ' + r.miss.join(', ') + ' trong bộ lọc, đã lấy bài khác thay thế)' : '');
    } else {
      items = pickedItems();
      if (!items.length) {
        $('kdOutMsg').textContent = 'Chưa có bài nào. Hãy để AI chọn bài, hoặc bấm \"Tạo đề ngẫu nhiên\".';
        return;
      }
    }
    var da = $('kdDa').checked, lg = $('kdLg').checked;
    var de = [], dk = [];
    items.forEach(function (b, i) {
      var r = itemToText(b, i + 1, da, lg);
      de.push(r.de); if (r.dk) dk.push(r.dk);
    });
    var out = de.join('\n\n') + '\n\n--- HẾT ---';
    if (dk.length) out += '\n\nĐÁP ÁN VÀ LỜI GIẢI\n\n' + dk.join('\n\n');
    S.lastOut = toMathTypeText(out);
    $('kdOutMsg').textContent = 'Đã tạo đề gồm ' + items.length + ' câu' + figInfo(S.lastOut) + '.' + note + ' Bấm "Xuất file Word" để gửi sang tab Chuyển LaTeX.' + lintMsg(S.lastOut);
    return S.lastOut;
  }
  function composeByAI() {
    if (!S.filtered.length) { $('kdOutMsg').textContent = 'Bộ lọc hiện không có bài nào. Hãy nới bộ lọc.'; return; }
    try { requireKey(); } catch (e) { $('kdOutMsg').textContent = e.message; return; }
    var ctx = [];
    if (S.f.lop) ctx.push('lớp ' + S.f.lop);
    if (S.f.loai) ctx.push('loại đề ' + S.f.loai);
    if (S.f.chuong) ctx.push('chương ' + (S.CH[S.f.chuong] || S.f.chuong));
    var ctxStr = ctx.length ? ctx.join(' · ') : 'Toán THCS tổng hợp';
    $('kdOutMsg').textContent = 'AI đang tạo đề 5 câu theo bộ lọc: ' + ctxStr + '…';
    $('kdRandom5').disabled = true;
    var prompt = 'Bạn là giáo viên Toán THCS Việt Nam. Hãy soạn 1 đề gồm đúng 5 câu hỏi tự luận ngắn theo chương trình GDPT 2018, phù hợp với bối cảnh: ' + ctxStr + '.\n' +
      'Yêu cầu:\n' +
      '- Mỗi câu có nội dung rõ ràng, số liệu hợp lý, giải được.\n' +
      '- Công thức viết bằng LaTeX đặt trong $...$.\n' +
      '- Có đáp án và lời giải ngắn gọn cho từng câu.\n' +
      '- Nếu bài có hình, mô tả bằng lời (không vẽ).\n' +
      'Trả về DUY NHẤT một mảng JSON gồm 5 phần tử, mỗi phần tử dạng:\n' +
      '{"noidung":"...","y":[{"ma":"a","noidung":"...","dapan":"...","loigiai":"..."}],"dapan":"...","loigiai":"...","hinh_mo_ta":""}\n' +
      'Nếu câu không chia ý thì "y" là []. Trong JSON, mỗi dấu gạch chéo ngược của LaTeX phải viết thành hai dấu (\\\\).';
    callGemini(prompt, 0.8).then(function (t) {
      var arr = parseJSON(t); if (!Array.isArray(arr)) arr = arr.bai || arr.items || [];
      arr = arr.filter(function (x) { return x && x.noidung; }).slice(0, 5);
      if (arr.length < 5) throw new Error('AI chỉ trả về ' + arr.length + ' câu, cần 5 câu. Hãy thử lại.');
      // AI tự giải lại để kiểm tra từng câu
      var verified = [];
      var chain = Promise.resolve();
      arr.forEach(function (x) {
        var item = {
          from: 'AI-random', noidung: String(x.noidung), dapan: x.dapan ? String(x.dapan) : '', loigiai: x.loigiai ? String(x.loigiai) : '',
          hinh_mo_ta: x.hinh_mo_ta ? String(x.hinh_mo_ta) : '',
          y: (x.y || []).map(function (y) { return { ma: String(y.ma || ''), noidung: String(y.noidung || ''), dapan: y.dapan ? String(y.dapan) : '', loigiai: y.loigiai ? String(y.loigiai) : '' }; })
        };
        chain = chain.then(function () {
          $('kdOutMsg').textContent = 'AI đang tự giải lại để kiểm tra… (' + (verified.length + 1) + '/5)';
          return verifyOne(item).then(function () {
            if (item.check && item.check.ok) verified.push(item);
            else if (!item.check) verified.push(item); // không verify được thì vẫn giữ, nhưng cảnh báo
          });
        });
      });
      return chain.then(function () {
        if (verified.length < 5) throw new Error('Chỉ ' + verified.length + '/5 câu qua kiểm tra. Hãy thử lại.');
        S.ai = verified;
        renderAi();
        var da = $('kdDa').checked, lg = $('kdLg').checked;
        var de = [], dk = [];
        S.ai.forEach(function (b, i) {
          var r = itemToText(b, i + 1, da, lg);
          de.push(r.de); if (r.dk) dk.push(r.dk);
        });
        var out = de.join('\n\n') + '\n\n--- HẾT ---';
        if (dk.length) out += '\n\nĐÁP ÁN VÀ LỜI GIẢI\n\n' + dk.join('\n\n');
        S.lastOut = toMathTypeText(out);
        $('kdOutMsg').textContent = 'AI đã tạo đề 5 câu (đã tự giải lại kiểm tra). Bấm "Xuất file Word" để gửi sang tab Chuyển LaTeX.' + lintMsg(S.lastOut);
      });
    }).catch(function (e) {
      $('kdOutMsg').textContent = 'Lỗi tạo đề AI: ' + e.message;
    }).then(function () { $('kdRandom5').disabled = false; });
  }
  function composeAiText() {
    return toMathTypeText(S.ai.map(function (b, i) {
      var r = itemToText(b, i + 1, true, true);
      return r.de + (r.dk ? '\n' + r.dk : '');
    }).join('\n\n'));
  }
  function getOut() {
    if (S.lastOut) return S.lastOut;
    return compose(false);
  }

  /* ------------------------------------------------------------- Hình vẽ */
  var FIG_RE_SRC = '\\(Hình vẽ: ([^)\\n]+?\\.(?:png|jpe?g|gif|webp|svg))\\)';
  function figPaths(t) {
    var re = new RegExp(FIG_RE_SRC, 'ig'), r = [], m;
    while ((m = re.exec(String(t)))) { var p = m[1].trim(); if (r.indexOf(p) < 0) r.push(p); }
    return r;
  }
  function figInfo(t) { var n = figPaths(t).length; return n ? ' (có ' + n + ' hình vẽ)' : ''; }
  function loadFig(p) {
    var F = window.KD_FIGS = window.KD_FIGS || {};
    if (F[p]) return Promise.resolve(true);
    return fetch(p, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    }).then(function (b) {
      return new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () { F[p] = fr.result; res(true); };
        fr.onerror = rej; fr.readAsDataURL(b);
      });
    }).catch(function () { return false; });
  }
  function figEl(doc, p) {
    var box = doc.createElement('span');
    box.className = 'kd-fig';
    box.style.cssText = 'display:block;text-align:center;margin:10px 0';
    var img = doc.createElement('img');
    img.alt = 'Hình vẽ'; img.src = (window.KD_FIGS && window.KD_FIGS[p]) || p;
    img.style.cssText = 'max-width:min(100%,420px);height:auto;border:1px solid #cfd8dc;border-radius:6px;background:#fff';
    img.onerror = function () {
      var w = doc.createElement('span');
      w.style.cssText = 'display:block;color:#b71c1c;font-size:13px';
      w.textContent = '⚠ Không tải được hình: ' + p + ' (kiểm tra đường dẫn / tên file trong thư mục hinh).';
      if (box.parentNode) box.replaceChild(w, img);
    };
    box.appendChild(img);
    return box;
  }
  function enhanceRoot(root) {
    var doc = root.ownerDocument, nodes = [], n;
    var w = doc.createTreeWalker(root, 4, null);   // 4 = SHOW_TEXT
    while ((n = w.nextNode())) {
      if (n.nodeValue.indexOf('Hình vẽ:') < 0) continue;
      var pn = n.parentNode && n.parentNode.nodeName;
      if (/^(TEXTAREA|INPUT|SCRIPT|STYLE|OPTION)$/.test(pn)) continue;
      nodes.push(n);
    }
    nodes.forEach(function (tn) {
      var s = tn.nodeValue, re = new RegExp(FIG_RE_SRC, 'ig'), last = 0, m, hit = false, frag = doc.createDocumentFragment();
      while ((m = re.exec(s))) {
        hit = true;
        if (m.index > last) frag.appendChild(doc.createTextNode(s.slice(last, m.index)));
        frag.appendChild(figEl(doc, m[1].trim()));
        last = re.lastIndex;
      }
      if (!hit) return;
      if (last < s.length) frag.appendChild(doc.createTextNode(s.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });
  }
  function enhanceFigs() {
    var host = $('t3') || document.body;
    try { enhanceRoot(host); } catch (e) { }
    try {
      var ifr = host.querySelectorAll('iframe');
      for (var i = 0; i < ifr.length; i++) {
        var d = ifr[i].contentDocument;
        if (d && d.body) enhanceRoot(d.body);
      }
    } catch (e) { }
  }
  var figTimer = 0;
  function installFigPreview() {
    var host = $('t3');
    if (!host || host._kdObs || !window.MutationObserver) return;
    host._kdObs = new MutationObserver(function () {
      clearTimeout(figTimer);
      figTimer = setTimeout(enhanceFigs, 120);
    });
    host._kdObs.observe(host, { childList: true, subtree: true, characterData: true });
  }

  function sendLatex() {
    var v = getOut();
    if (!v || !v.trim()) { $('kdOutMsg').textContent = 'Chưa có nội dung đề. Hãy bấm "Tạo đề ngẫu nhiên" hoặc để AI chọn bài trước.'; return; }
    v = toMathTypeText(v);
    var paths = figPaths(v);
    $('kdOutMsg').textContent = paths.length ? 'Đang kiểm tra / tải ' + paths.length + ' hình vẽ…' : 'Đang gửi đề…';
    Promise.all(paths.map(loadFig)).then(function (ok) {
      var bad = paths.filter(function (p, i) { return !ok[i]; });
      var inp = $('input');
      if (!inp) { $('kdOutMsg').textContent = 'Không tìm thấy ô nhập của công cụ Chuyển LaTeX.'; return; }
      var clr = $('btnClearFiles');
      if (clr && (inp.readOnly || inp.dataset.fromFile === '1')) clr.click();
      inp.readOnly = false;
      inp.value = v;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      var wt = $('wtSel');
      if (wt) { wt.value = 'wtLatex'; wt.dispatchEvent(new Event('change', { bubbles: true })); }
      var tab = document.querySelector('.tab[data-tab="t3"]');
      if (tab) tab.click();
      installFigPreview();
      [150, 600, 1500].forEach(function (ms) { setTimeout(enhanceFigs, ms); });
      var msg = 'Đã gửi đề sang tab Chuyển LaTeX → Word / PDF (chữ thường + $công thức$).';
      if (paths.length) msg += '\n🖼 ' + (paths.length - bad.length) + '/' + paths.length + ' hình vẽ đã tải và hiện ở ô xem trước.';
      if (bad.length) msg += '\n⚠ Không tìm thấy hình: ' + bad.join(', ') + ' — kiểm tra tên file trong thư mục hinh.';
      msg += '\nHãy kiểm tra ô xem trước, rồi bấm "Chuyển Đổi & Xuất File" ở tab đó.' + lintMsg(v);
      $('kdOutMsg').textContent = msg;
    });
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
      installFigPreview();
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