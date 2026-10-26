/* aruco-chon.js — Chế độ "Thẻ ArUco" (kiểu Plickers) cho "Kéo co & Ôn tập kiến thức"
   Mỗi học sinh có một thẻ in sẵn (mã ArUco riêng). Giơ thẻ sao cho chữ đáp án mình chọn nằm ở phía TRÊN.
   Điện thoại vào phòng bằng mã 6 số (hoặc camera của máy) quét thẻ cả lớp:
     · Chế độ Ôn tập: cả lớp trả lời, đáp án nhiều phiếu nhất được "bấm hộ" cho cả lớp; lưu bảng điểm từng em.
     · Chế độ Kéo co: danh sách chia hai đội, mỗi đội lấy đáp án nhiều phiếu nhất trong đội.
   Không sửa keo-co.js: file này chỉ đọc giao diện và "bấm hộ" các nút. Nạp SAU keo-co.js (và camera-chon.js nếu có).
   Thư viện nhận dạng thẻ: aruco-lib.js (tự nạp khi cần, cùng thư mục với file này). Mọi xử lý chạy trong trình duyệt. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var rvEl = $('kcRv'), kcSt = $('kcStage'), modeBar = $('kcModeBar');
  if (!rvEl || !kcSt || !modeBar) { console.warn('aruco-chon.js: cần nạp sau keo-co.js'); return; }

  var SELF = (document.currentScript && document.currentScript.src) || '';
  var LIB = (SELF ? SELF.replace(/[^\/]*$/, '') : '') + 'aruco-lib.js?v=1';
  var DICT = 'ARUCO_MIP_36h12', MAXID = 250, LET = 'ABCD', CH = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  var LS = 'ar_cfg_v1', LSR = 'ar_log_v1';

  /* ---------- Cấu hình ---------- */
  var C = { on: false, roster: '', split: 'half', secs: 30, rev: 3, next: 5, off: 0, cam: 'environment', res: 640, auto: true, src: 'phone' };
  try { var sv = JSON.parse(localStorage.getItem(LS) || 'null'); if (sv) for (var k in sv) C[k] = sv[k]; } catch (e) {}
  if (C.res === 960) C.res = 640;                 /* 960 từng bỏ sót thẻ to trong ảnh thật */
  if (C.src !== 'local') C.src = 'phone';
  function save() { try { localStorage.setItem(LS, JSON.stringify(C)); } catch (e) {} }
  function num(v, lo, hi, d) { v = parseFloat(v); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function roster() { return String(C.roster || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, MAXID); }
  function teamOf(id, n) { return C.split === 'alt' ? id % 2 : (id < Math.ceil(n / 2) ? 0 : 1); }

  /* Nhật ký kết quả (rv): [{n, q, correct, ans:{id:'A'}}] — giữ qua lần tải lại trang */
  var LOG = [];
  try { LOG = JSON.parse(localStorage.getItem(LSR) || '[]') || []; } catch (e) { LOG = []; }
  function saveLog() { try { localStorage.setItem(LSR, JSON.stringify(LOG.slice(-300))); } catch (e) {} }

  /* ---------- CSS ---------- */
  var st = document.createElement('style');
  st.textContent = [
    '.ar-cfg{border:1px solid #8885;border-radius:10px;padding:6px 10px;margin:8px 0}',
    '.ar-cfg textarea{width:100%;box-sizing:border-box;min-height:110px;font:inherit}',
    '.ar-panel{position:relative;margin:8px auto 0;z-index:8;width:min(100%,380px);flex:0 0 auto;background:#0b1020ee;color:#fff;border:2px solid #38bdf8;border-radius:12px;padding:6px;box-sizing:border-box;font-size:14px}',
    '.ar-panel.inline{margin:8px 0;max-width:460px;width:100%}',
    '@media(min-width:701px) and (min-aspect-ratio:1/1){.kc-stage.on.ar-dock{padding-right:calc(clamp(150px,13vw,210px) + 24px)!important;min-height:420px}.kc-stage.ar-dock>.ar-panel{position:absolute;right:10px;top:10px;bottom:10px;margin:0;width:clamp(150px,13vw,210px);display:flex;flex-direction:column;overflow:auto}.kc-stage.ar-dock>.ar-panel canvas{flex:1 1 0;min-height:80px;width:100%;max-height:none;margin:0}}',
    '.ar-hd{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px 6px;margin-bottom:4px}.ar-hd>span{margin-left:auto}.ar-hd b{line-height:1.25}',
    '.ar-b{background:#1b2347;color:#fff;border:1px solid #333f77;border-radius:8px;padding:2px 8px;font-size:15px;cursor:pointer;flex:none;min-height:0}',
    '.ar-panel canvas{display:block;border-radius:8px;background:#000;max-height:24vh;width:auto;max-width:100%;margin:0 auto}',
    '.ar-bar{height:6px;border-radius:4px;background:#ffffff33;margin-top:4px;overflow:hidden}.ar-bar i{display:block;height:100%;width:0;background:#38bdf8}',
    '.ar-tl{margin-top:4px;font-size:.92em;line-height:1.4}.ar-g{margin-top:4px}.ar-gt{font-weight:700;font-size:.92em;margin:2px 0 3px}',
    '.ar-vb{display:flex;justify-content:center;gap:4px;height:130px}',
    '.ar-vc{flex:1;max-width:56px;min-width:0;display:flex;flex-direction:column}.ar-vc .n{text-align:center;font-weight:800;font-size:1.05em;line-height:1.35}',
    '.ar-vc .col{flex:1;min-height:20px;display:flex;align-items:flex-end;background:#ffffff14;border-radius:6px 6px 0 0;overflow:hidden}.ar-vc .col i{display:block;width:100%;transition:height .25s}',
    '.ar-vc .l{text-align:center;color:#fff;font-weight:800;padding:2px 0;border-radius:0 0 6px 6px}',
    '.ar-join{display:none;text-align:center;padding:6px 0 2px}.ar-join small{display:block;opacity:.9;font-weight:600}.ar-join b{display:block;color:#38bdf8;font:800 clamp(20px,2.2vw,36px)/1.2 ui-monospace,Menlo,monospace;letter-spacing:.05em}',
    '.ar-panel.ph canvas{display:none}',
    '@media(min-width:701px) and (min-aspect-ratio:1/1){.kc-stage.ar-dock>.ar-panel .ar-tl{flex:1 1 0;min-height:0;display:flex;flex-direction:column}.kc-stage.ar-dock>.ar-panel .ar-g{flex:1 1 0;min-height:0;display:flex;flex-direction:column}.kc-stage.ar-dock>.ar-panel .ar-vb{flex:1 1 0;height:auto;min-height:60px}}',
    '.ar-miss{margin-top:3px;font-size:.78em;opacity:.8;line-height:1.3}',
    '.ar-panel.min canvas,.ar-panel.min .ar-bar,.ar-panel.min .ar-tl,.ar-panel.min .ar-miss,.ar-panel.min .ar-join{display:none!important}',
    '.ar-big{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:7;pointer-events:none;font-weight:900;color:#fff;font-size:clamp(90px,34vh,300px);text-shadow:0 6px 30px #000,0 0 40px #000}.ar-big.on{display:flex}',
    '.kc-opt.ar-sel{outline:6px solid #38bdf8;outline-offset:-3px;box-shadow:0 0 22px #38bdf8}',
    '#arOv{position:fixed;inset:0;z-index:99999;background:#fff;color:#000;overflow:auto;padding:12px;display:none}#arOv.on{display:block}',
    '#arOv .ar-top{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
    '#arOv table{border-collapse:collapse;font-size:14px;width:100%}#arOv td,#arOv th{border-bottom:1px solid #ccc;padding:4px 6px;text-align:left}',
    '#arOv .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '#arOv .pc{position:relative;aspect-ratio:1;border:1px dashed #888;background:#fff;color:#000;break-inside:avoid}',
    '#arOv .pc svg{position:absolute;inset:22%;width:56%;height:56%}#arOv .pc i{position:absolute;font:700 22px/1 system-ui;font-style:normal}',
    '#arOv .pc .a{top:5%;left:47%}#arOv .pc .b{right:7%;top:46%;transform:rotate(90deg)}#arOv .pc .c{bottom:5%;left:47%;transform:rotate(180deg)}#arOv .pc .d{left:7%;top:46%;transform:rotate(-90deg)}',
    '#arOv .pc small{position:absolute;left:6px;top:4px;font-size:10px}',
    '@media print{body.ar-open>*:not(#arOv){display:none!important}#arOv{position:static!important;padding:0}#arOv .ar-top{display:none!important}}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- Giao diện cài đặt ---------- */
  var cfgBox = document.createElement('div');
  cfgBox.className = 'ar-cfg';
  cfgBox.innerHTML =
    '<label><input type="checkbox" id="arOn"> 🎫 <b>Chế độ Thẻ ArUco</b> (mỗi em một thẻ in sẵn, camera quét cả lớp)</label>' +
    '<div id="arBox" style="display:none">' +
    '<div class="note">Mỗi em giữ một thẻ riêng và <b>giơ thẻ sao cho chữ đáp án mình chọn nằm ở phía trên</b>. ' +
    'Chế độ <b>Ôn tập</b>: đáp án nhiều phiếu nhất của cả lớp được chọn, có bảng điểm từng em. Chế độ <b>Kéo co</b>: danh sách được chia hai đội, mỗi đội lấy đáp án nhiều phiếu nhất trong đội (hòa phiếu = đội đó không trả lời). ' +
    'Không dùng cùng lúc với Chế độ Camera (cử chỉ tay).</div>' +
    '<div class="bar"><b>Danh sách học sinh</b> <span class="note">mỗi dòng một em; dòng 1 = thẻ số 0, dòng 2 = thẻ số 1… Có thể nhập file Excel/CSV hoặc dán cột tên vào ô.</span></div>' +
    '<textarea id="arRoster" placeholder="Nguyễn Văn An&#10;Trần Thị Bình&#10;..."></textarea>' +
    '<div class="bar"><span class="note" id="arCount"></span> <button class="sec sm" id="arXls" type="button">📥 Nhập từ Excel</button><input type="file" id="arFile" accept=".xlsx,.xls,.csv,.tsv,.txt" style="display:none"> ' +
    '<button class="sec sm" id="arPrint" type="button">🖨 Xem / in thẻ</button> <button class="sec sm" id="arRes" type="button">📊 Kết quả</button></div>' +
    '<div class="bar"><label>Chia đội (Kéo co) <select id="arSplit"><option value="half">Nửa đầu danh sách = Đội 1, nửa sau = Đội 2</option><option value="alt">Xen kẽ: thẻ chẵn = Đội 1, thẻ lẻ = Đội 2</option></select></label></div>' +
    '<div class="bar"><label>⏱ Thời gian quét tối đa mỗi câu (giây) <input type="number" id="arSecs" min="5" max="300" style="width:70px"></label>' +
    '<label><input type="checkbox" id="arAuto"> Chốt sớm khi cả lớp đã trả lời</label></div>' +
    '<div class="bar"><label>Chốt xong, hiện đáp án sau (giây) <input type="number" id="arRev" min="1" max="15" style="width:60px"></label>' +
    '<label>Tự sang câu tiếp sau (giây, 0 = tự bấm) <input type="number" id="arNext" min="0" max="30" style="width:60px"></label></div>' +
    '<div class="bar"><label>Nguồn quét <select id="arSrc"><option value="phone">📱 Điện thoại vào phòng bằng mã 6 số (khuyên dùng)</option><option value="local">💻 Camera của máy này</option></select></label></div>' +
    '<div class="note" id="arRoom"></div>' +
    '<div class="bar" id="arLocalBar"><label>Camera <select id="arCam"><option value="environment">Camera sau (điện thoại)</option><option value="user">Camera trước / webcam</option></select></label>' +
    '<label>Độ phân giải quét <select id="arRes2"><option value="640">640 (khuyên dùng)</option><option value="960">960</option><option value="1280">1280 (lớp đông, máy mạnh)</option></select></label>' +
    '<label>Hiệu chỉnh xoay <select id="arOff"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select></label></div>' +
    '<div class="bar"><button class="sec sm" id="arTest" type="button">🎥 Thử camera</button></div>' +
    '<div class="note" id="arMsg"></div>' +
    '<div class="note">Mẹo: đặt camera ở cuối hoặc góc lớp, nhìn bao quát, đủ sáng; in thẻ cỡ A6 trở lên (khoảng 10–15 cm) để quét được từ xa. ' +
    'Nếu máy đọc sai chữ (ví dụ giơ B ra D), chỉnh “Hiệu chỉnh xoay”. Học sinh giữ thẻ yên khoảng 1 giây.</div>' +
    '</div>';
  var anchor = modeBar.parentNode.querySelector('.cc-cfg') || modeBar;
  anchor.insertAdjacentElement('afterend', cfgBox);

  function fillUi() {
    $('arOn').checked = !!C.on; $('arRoster').value = C.roster; $('arSplit').value = C.split; $('arSecs').value = C.secs;
    $('arAuto').checked = !!C.auto; $('arRev').value = C.rev; $('arNext').value = C.next; $('arCam').value = C.cam;
    $('arRes2').value = String(C.res); $('arOff').value = String(C.off); $('arSrc').value = C.src;
    $('arBox').style.display = C.on ? '' : 'none'; count();
  }
  function count() {
    var n = roster().length;
    $('arCount').textContent = n ? n + ' học sinh (thẻ 0 đến ' + (n - 1) + ')' + (n >= MAXID ? ' — tối đa ' + MAXID : '') : 'Chưa có học sinh nào';
  }
  function readCfg() {
    C.on = $('arOn').checked; C.roster = $('arRoster').value; C.split = $('arSplit').value; C.secs = num($('arSecs').value, 5, 300, 30);
    C.auto = $('arAuto').checked; C.rev = num($('arRev').value, 1, 15, 3); C.next = num($('arNext').value, 0, 30, 5);
    C.cam = $('arCam').value; C.res = num($('arRes2').value, 320, 1920, 640); C.src = $('arSrc').value === 'local' ? 'local' : 'phone'; C.off = num($('arOff').value, 0, 3, 0);
    $('arBox').style.display = C.on ? '' : 'none'; count(); save();
    if (!C.on && testing) toggleTest(false);
    srcUi(); broadcastInfo();
  }
  ['arOn', 'arRoster', 'arSplit', 'arSecs', 'arAuto', 'arRev', 'arNext', 'arCam', 'arRes2', 'arOff', 'arSrc'].forEach(function (id) {
    $(id).addEventListener('change', readCfg);
  });
  $('arRoster').addEventListener('input', function () { C.roster = $('arRoster').value; count(); save(); });
  fillUi();

  /* Loại trừ với Chế độ Camera cử chỉ tay (camera-chon.js) */
  $('arOn').addEventListener('change', function () {
    var cc = $('ccOn'); if ($('arOn').checked && cc && cc.checked) { cc.checked = false; cc.dispatchEvent(new Event('change')); }
  });
  if ($('ccOn')) $('ccOn').addEventListener('change', function () {
    if ($('ccOn').checked && $('arOn').checked) { $('arOn').checked = false; readCfg(); }
  });
  /* ---------- Nhập danh sách học sinh từ Excel / CSV ---------- */
  var XLS_SRC = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];
  var xlsP = null;
  function loadXls() {
    if (window.XLSX) return Promise.resolve();
    if (xlsP) return xlsP;
    xlsP = new Promise(function (ok, bad) {
      var i = 0;
      (function next() {
        if (i >= XLS_SRC.length) { bad(new Error('Không tải được bộ đọc Excel (cần Internet). Bạn có thể lưu file dạng CSV rồi nhập lại, hoặc dán cột tên vào ô danh sách.')); return; }
        var sc = document.createElement('script'); sc.src = XLS_SRC[i++]; sc.onload = ok; sc.onerror = next; document.head.appendChild(sc);
      })();
    }).then(function () { xlsP = null; }, function (e) { xlsP = null; throw e; });
    return xlsP;
  }
  function parseCsv(t) {
    t = t.replace(/^\uFEFF/, '');
    var first = t.split(/\r?\n/, 1)[0] || '', d = ',', best = -1;
    [',', ';', '\t'].forEach(function (c) { var n = first.split(c).length; if (n > best) { best = n; d = c; } });
    var rows = [], row = [], cur = '', q = false, i, ch;
    for (i = 0; i < t.length; i++) {
      ch = t.charAt(i);
      if (q) { if (ch === '"') { if (t.charAt(i + 1) === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t.charAt(i + 1) === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  /* Tự tìm cột họ tên: ưu tiên dòng tiêu đề ("Họ và tên", "Họ tên"…, hoặc hai cột "Họ" + "Tên"); nếu không có thì lấy cột có nhiều ô chữ nhiều từ nhất (bỏ qua cột STT, lớp, ngày sinh…) */
  function pickNames(rows) {
    rows = rows.map(function (r) { return (r || []).map(function (c) { return String(c == null ? '' : c).replace(/\s+/g, ' ').trim(); }); });
    var isNum = function (v) { return /^[\d\s.,\-\/]+$/.test(v); };
    var hi = -1, hc = -1, h1 = -1, h2 = -1, r, c, v, out = [];
    for (r = 0; r < Math.min(rows.length, 15) && hi < 0; r++) {
      for (c = 0; c < rows[r].length; c++) {
        v = rows[r][c].toLowerCase();
        if (/^(họ\s*(và|&)?\s*tên|tên học sinh|tên hs|full ?name|student|name$)/.test(v)) { hi = r; hc = c; break; }
      }
      if (hi < 0) {
        var a = -1, b = -1;
        rows[r].forEach(function (x, k) { x = x.toLowerCase(); if (/^họ( đệm| lót)?$/.test(x)) a = k; else if (/^tên$/.test(x)) b = k; });
        if (a >= 0 && b >= 0) { hi = r; h1 = a; h2 = b; }
      }
    }
    if (hi >= 0 && h1 >= 0) {
      for (r = hi + 1; r < rows.length; r++) { v = ((rows[r][h1] || '') + ' ' + (rows[r][h2] || '')).replace(/\s+/g, ' ').trim(); if (v && !isNum(v)) out.push(v); }
      return { names: out, how: 'cột Họ + Tên' };
    }
    var col = hc, start = hi + 1, w = 0, sc = [];
    if (hi < 0) {
      rows.forEach(function (rw) { w = Math.max(w, rw.length); });
      for (c = 0; c < w; c++) {
        sc[c] = 0;
        rows.forEach(function (rw) { var x = rw[c] || ''; if (x && !isNum(x)) sc[c] += x.indexOf(' ') > 0 ? 2 : 1; });
      }
      col = 0; for (c = 1; c < w; c++) if (sc[c] > sc[col]) col = c;
      start = rows.length && /^(stt|tt|họ|tên|name|danh sách)/i.test((rows[0][col] || '')) ? 1 : 0;
    }
    for (r = start; r < rows.length; r++) { v = rows[r][col] || ''; if (v && !isNum(v)) out.push(v); }
    return { names: out, how: hi >= 0 ? 'cột "' + rows[hi][hc] + '"' : 'cột ' + (col + 1) };
  }
  function applyRows(rows, fname) {
    var r = pickNames(rows), n = r.names.slice(0, MAXID);
    if (!n.length) { $('arMsg').textContent = '⚠ Không tìm thấy tên học sinh trong file. Cần một cột họ tên, mỗi dòng một em.'; return; }
    if (roster().length && !window.confirm('Thay danh sách hiện tại (' + roster().length + ' em) bằng ' + n.length + ' em từ file?')) { $('arMsg').textContent = 'Đã hủy, giữ nguyên danh sách cũ.'; return; }
    $('arRoster').value = n.join('\n'); readCfg();
    $('arMsg').textContent = '✅ Đã nhập ' + n.length + ' học sinh từ ' + fname + ' (' + r.how + ')' + (r.names.length > MAXID ? ' — chỉ lấy ' + MAXID + ' em đầu' : '') + '. Nếu thứ tự đổi, hãy in lại thẻ.';
  }
  function readFile(f) {
    var ext = (f.name.split('.').pop() || '').toLowerCase(), rd = new FileReader();
    $('arMsg').textContent = 'Đang đọc ' + f.name + '…';
    rd.onerror = function () { $('arMsg').textContent = '⚠ Không đọc được file.'; };
    if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
      rd.onload = function () {
        var t;
        try { t = new TextDecoder('utf-8', { fatal: true }).decode(rd.result); }
        catch (e) { try { t = new TextDecoder('windows-1258').decode(rd.result); } catch (e2) { t = new TextDecoder().decode(rd.result); } }
        applyRows(ext === 'txt' ? t.split(/\r?\n/).map(function (l) { return [l]; }) : parseCsv(t), f.name);
      };
    } else {
      rd.onload = function () {
        loadXls().then(function () {
          var wb = window.XLSX.read(rd.result, { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]];
          applyRows(window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }), f.name + (wb.SheetNames.length > 1 ? ' (trang “' + wb.SheetNames[0] + '”)' : ''));
        }).catch(function (e) { $('arMsg').textContent = '⚠ ' + (e && e.message ? e.message : 'Không đọc được file Excel.'); });
      };
    }
    rd.readAsArrayBuffer(f);
  }
  $('arXls').onclick = function () { $('arFile').value = ''; $('arFile').click(); };
  $('arFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (f) readFile(f); });

  /* ---------- Bảng camera trong màn hình chơi ---------- */
  var panel = document.createElement('div');
  panel.className = 'ar-panel inline'; panel.style.display = 'none';
  panel.innerHTML = '<div class="ar-hd"><b id="arSt">🎫</b><span><button class="ar-b" id="arSkip" type="button" title="Chốt ngay">⏭</button> <button class="ar-b" id="arHold" type="button" title="Tạm dừng đếm giờ">⏸</button> <button class="ar-b" id="arMin" type="button" title="Thu nhỏ">▾</button> <button class="ar-b" id="arExit" type="button" title="Dừng chơi và thoát">✕</button></span></div>' +
    '<div class="ar-join" id="arJoin"></div><canvas id="arCv" width="480" height="270"></canvas><div class="ar-bar"><i id="arPg"></i></div><div class="ar-tl" id="arTl"></div><div class="ar-miss" id="arMiss"></div>';
  var big = document.createElement('div'); big.className = 'ar-big';
  var cv = panel.querySelector('#arCv');
  $('arBox').appendChild(panel);
  function undock() { rvEl.classList.remove('ar-dock'); kcSt.classList.remove('ar-dock'); }
  function place(parent) { undock(); parent.classList.add('ar-dock'); parent.appendChild(panel); parent.appendChild(big); panel.classList.remove('inline'); }
  function placeInline() { undock(); $('arBox').appendChild(panel); panel.classList.add('inline'); if (big.parentNode) big.parentNode.removeChild(big); }
  panel.querySelector('#arMin').onclick = function () { panel.classList.toggle('min'); };
  var hold = false;
  panel.querySelector('#arHold').onclick = function () { hold = !hold; this.textContent = hold ? '▶' : '⏸'; };
  function exitGame() {
    var b = kind === 'rv' ? $('kcRvBack') : (kind === 'keo' ? $('kcBack') : null); if (!b) return;
    var oc = window.confirm; window.confirm = function () { return true; };
    try { b.click(); } finally { window.confirm = oc; }
  }
  panel.querySelector('#arExit').onclick = exitGame;
  panel.querySelector('#arSkip').onclick = function () { if (S && S.p === 'select') S.skip = true; };


  /* ---------- Phòng điện thoại: điện thoại quét thẻ, gửi kết quả về máy chiếu (WebRTC qua PeerJS, không cần máy chủ riêng) ---------- */
  var PEER_SRC = ['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
  var RM = { code: '', peer: null, conns: [], state: 'idle', err: '', p: null }, remote = [], remoteT = 0, bc = 0;
  function loadPeer() {
    if (window.Peer) return Promise.resolve();
    if (RM.p) return RM.p;
    RM.p = new Promise(function (ok, bad) {
      var i = 0;
      (function next() {
        if (i >= PEER_SRC.length) { bad(new Error('Không tải được thư viện phòng (cần Internet).')); return; }
        var sc = document.createElement('script'); sc.src = PEER_SRC[i++]; sc.onload = ok; sc.onerror = next; document.head.appendChild(sc);
      })();
    }).catch(function (e) { RM.err = e.message || String(e); }).then(function () { RM.p = null; });
    return RM.p;
  }
  function newCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
  function roomLink() { return (SELF ? SELF.replace(/[^\/]*$/, '') : String(location.href).replace(/[^\/]*$/, '')) + 'quet.html?ma=' + RM.code; }
  function closeRoom() {
    try { if (RM.peer) RM.peer.destroy(); } catch (e) {}
    RM.peer = null; RM.conns = []; RM.state = 'idle';
  }
  function drop(c) {
    RM.conns = RM.conns.filter(function (x) { return x !== c; });
    if (!RM.conns.length) { seen = []; remote = []; }
    srcUi();
  }
  function infoMsg() { return { t: 'info', names: roster().map(function (x) { return x.slice(0, 40); }), o: +C.off || 0 }; }
  function broadcastInfo() { RM.conns.forEach(function (c) { try { c.send(infoMsg()); } catch (e) {} }); }
  function openRoom() {
    if (RM.peer || RM.state === 'loading') return;
    RM.state = 'loading'; RM.err = '';
    loadPeer().then(function () {
      if (!window.Peer) { RM.state = 'idle'; srcUi(); return; }
      if (!RM.code) { try { RM.code = sessionStorage.getItem('ar_room') || ''; } catch (e) {} if (!RM.code) RM.code = newCode(); }
      var pr = new window.Peer('kcaruco-' + RM.code);
      RM.peer = pr; RM.state = 'opening';
      pr.on('open', function () { RM.state = 'open'; RM.err = ''; try { sessionStorage.setItem('ar_room', RM.code); } catch (e) {} srcUi(); });
      pr.on('connection', function (c) {
        c.on('open', function () { RM.conns.push(c); try { c.send(infoMsg()); } catch (e) {} srcUi(); beep(660, 0.08); });
        c.on('data', onRemote);
        c.on('close', function () { drop(c); });
        c.on('error', function () { drop(c); });
      });
      pr.on('disconnected', function () { RM.state = 'lost'; try { pr.reconnect(); } catch (e) {} srcUi(); });
      pr.on('error', function (e) {
        if (e && e.type === 'unavailable-id') { closeRoom(); RM.code = newCode(); try { sessionStorage.removeItem('ar_room'); } catch (x) {} openRoom(); return; }
        RM.err = 'Lỗi phòng: ' + ((e && e.type) || e); srcUi();
      });
    });
  }
  function onRemote(m) {
    if (!m || typeof m !== 'object' || m.t !== 'd' || !Array.isArray(m.d)) return;
    var n = roster().length, out = [];
    m.d.slice(0, 120).forEach(function (x) {
      if (!Array.isArray(x)) return;
      var id = +x[0], q = +x[1];
      if (!(id >= 0 && id < n) || !(q >= 0 && q < 4)) return;
      out.push({ id: id, a: ['A', 'D', 'C', 'B'][((q + (+C.off)) % 4 + 4) % 4], c: null });
    });
    remote = out; remoteT = Date.now(); seen = out; feed(out);
  }
  function broadcast() {
    var tx = (kind || testing) ? $('arSt').textContent : 'Chờ bắt đầu câu hỏi';
    RM.conns.forEach(function (c) { try { c.send({ t: 'st', s: tx }); } catch (e) {} });
  }
  function srcUi() {
    var ph = C.src === 'phone', r = $('arRoom');
    $('arLocalBar').style.display = ph ? 'none' : '';
    r.style.display = ph && C.on ? '' : 'none';
    if (ph && C.on) openRoom(); else if (RM.peer) closeRoom();
    if (!(ph && C.on)) return;
    r.innerHTML = '📱 <b>Phòng điện thoại</b>: ' + (RM.err ? '⚠ ' + esc(RM.err) : (RM.state === 'open'
      ? 'mã <b style="font-size:1.5em;letter-spacing:.12em">' + RM.code + '</b> · ' + RM.conns.length + ' điện thoại đã vào<br><button class="sec sm" id="arGo" type="button">📲 Vào phòng</button> <button class="sec sm" id="arNewRoom" type="button">🔄 Đổi mã</button>'
      : 'đang mở phòng…'));
  }
  $('arRoom').onclick = function (e) {
    var id = e.target && (e.target.id || (e.target.closest && e.target.closest('button') ? e.target.closest('button').id : ''));
    if (id === 'arGo') { window.open(roomLink().replace(/\?ma=.*/, ''), '_blank'); return; }
    if (id === 'arNewRoom') { closeRoom(); RM.code = newCode(); RM.err = ''; try { sessionStorage.setItem('ar_room', RM.code); } catch (x) {} srcUi(); } };
  function fail() { return C.src === 'phone' ? RM.err : failed; }
  function waitMsg() {
    if (C.src !== 'phone') return '⏳ Đang chuẩn bị camera và bộ nhận dạng…';
    if (RM.state !== 'open') return '⏳ Đang mở phòng…';
    if (!RM.conns.length) return '📱 Chờ điện thoại vào phòng…';
    return '📱 Chờ tín hiệu từ điện thoại…';
  }

  /* ---------- Camera + nhận dạng thẻ ---------- */
  var stream = null, camP = null, vid = document.createElement('video'), det = null, libP = null, failed = '';
  var timer = 0, testing = false, seen = [], off = document.createElement('canvas');
  vid.muted = true; vid.playsInline = true; vid.setAttribute('playsinline', '');
  vid.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(vid);

  function errMsg(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Chưa được cấp quyền camera. Bấm biểu tượng ổ khóa cạnh địa chỉ web và cho phép Camera.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Không tìm thấy camera.';
    return 'Không mở được camera' + (e && e.message ? ': ' + e.message : '.');
  }
  function loadLib() {
    if (window.AR && window.AR.Detector) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = LIB; s.onload = ok;
      s.onerror = function () { bad(new Error('Không tải được aruco-lib.js (cần đặt cùng thư mục với trang).')); };
      document.head.appendChild(s);
    }).then(function () {
      det = new window.AR.Detector({ dictionaryName: DICT, maxHammingDistance: 3 });
    }).catch(function (e) { failed = e.message || String(e); }).then(function () { libP = null; });
    return libP;
  }
  function startCam() {
    failed = ''; panel.style.display = '';
    if (C.src === 'phone') { openRoom(); if (!timer) timer = setTimeout(loop, 100); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { failed = 'Trình duyệt không cho dùng camera (cần mở trang bằng https hoặc localhost).'; return; }
    if (!stream && !camP) {
      camP = navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: C.cam }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
        .then(function (s) { stream = s; vid.srcObject = s; return vid.play(); })
        .catch(function (e) { failed = errMsg(e); })
        .then(function () { camP = null; });
    }
    if (!det) loadLib().then(function () { if (!det && !failed) failed = 'Không khởi tạo được bộ nhận dạng thẻ.'; });
    if (!timer) timer = setTimeout(loop, 100);
  }
  function stopCam() {
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null; camP = null; vid.srcObject = null;
    clearTimeout(timer); timer = 0; seen = [];
    panel.style.display = 'none'; big.classList.remove('on');
  }
  function ready() {
    if (C.src === 'phone') return RM.state === 'open' && RM.conns.length > 0 && Date.now() - remoteT < 5000;
    return !!(stream && det && vid.videoWidth && vid.readyState >= 2);
  }

  /* Quét một khung hình. Chữ đáp án = hướng của thẻ: cạnh trên thẻ quay về hướng nào thì ra chữ đó (A thẳng, B quay trái 90°, C ngược, D quay phải 90°) */
  var pend = {}, W = 0, H = 0, fr = 0;
  function scan() {
    var n = roster().length, w = Math.min((fr++ % 2) ? Math.max(C.res, 640) : 640, vid.videoWidth), h = Math.round(vid.videoHeight * w / vid.videoWidth);
    if (off.width !== w || off.height !== h) { off.width = w; off.height = h; }
    var g = off.getContext('2d', { willReadFrequently: true });
    g.drawImage(vid, 0, 0, w, h); W = w; H = h;
    var ms = det.detectImage(w, h, g.getImageData(0, 0, w, h).data), out = [];
    ms.forEach(function (m) {
      if (m.id >= n) return;
      var c = m.corners, ang = Math.atan2(c[1].y - c[0].y, c[1].x - c[0].x) * 180 / Math.PI;
      var kk = ((Math.round(ang / 90) + (+C.off)) % 4 + 4) % 4, a = ['A', 'D', 'C', 'B'][kk];
      out.push({ id: m.id, a: a, c: c });
    });
    return out;
  }
  function loop() {
    timer = 0;
    if (C.src === 'phone') { if (Date.now() - remoteT > 1500) seen = []; draw(); timer = setTimeout(loop, 200); return; }
    if (!stream && !camP) return;
    try { if (ready()) { seen = scan(); feed(seen); } } catch (e) {}
    draw();
    timer = setTimeout(loop, 90);
  }
  /* Lọc nhiễu: một thẻ phải cho cùng một chữ ít nhất 3 trong 5 lần quét gần nhất mới được tính */
  function feed(list) {
    if (!S) return;
    list.forEach(function (m) {
      var b = (pend[m.id] = pend[m.id] || []); b.push(m.a); if (b.length > 5) b.shift();
      for (var v = 0; v < 4; v++) {
        var ch = LET.charAt(v);
        if (b.filter(function (x) { return x === ch; }).length >= 3) { if (S.p === 'select' && !hold) S.cur[m.id] = ch; else if (testing && !kind) S.cur[m.id] = ch; }
      }
    });
  }
  function draw() {
    if (C.src === 'phone') return;
    if (!panel.offsetWidth || panel.classList.contains('min')) return;
    var tw = 480, th = 270;
    if (!panel.classList.contains('inline') && cv.clientWidth > 20 && cv.clientHeight > 20 && window.matchMedia && window.matchMedia('(min-width:701px) and (min-aspect-ratio:1/1)').matches) {
      tw = Math.min(900, Math.round(cv.clientWidth)); th = Math.round(cv.clientHeight * tw / cv.clientWidth);
    }
    if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
    var w = cv.width, h = cv.height, g = cv.getContext('2d'), has = vid.videoWidth && vid.readyState >= 2;
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
    if (!has) return;
    var sc = Math.max(w / vid.videoWidth, h / vid.videoHeight), dw = vid.videoWidth * sc, dh = vid.videoHeight * sc, ox = (w - dw) / 2, oy = (h - dh) / 2;
    g.drawImage(vid, ox, oy, dw, dh);
    var kx = dw / (W || 1), ky = dh / (H || 1), names = roster();
    g.lineWidth = 3; g.font = 'bold ' + Math.max(14, Math.round(h * 0.07)) + 'px system-ui'; g.textAlign = 'left';
    seen.forEach(function (m) {
      var col = CH[LET.indexOf(m.a)];
      g.strokeStyle = col; g.fillStyle = col; g.beginPath();
      m.c.forEach(function (p, i) { var x = ox + p.x * kx, y = oy + p.y * ky; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.closePath(); g.stroke();
      g.shadowColor = '#000'; g.shadowBlur = 4; g.fillStyle = '#fff';
      g.fillText(m.a + ' ' + (names[m.id] ? names[m.id].split(' ').slice(-1)[0] : m.id), ox + m.c[0].x * kx, oy + m.c[0].y * ky - 6); g.shadowBlur = 0;
    });
  }

  /* ---------- Âm thanh nhỏ ---------- */
  var ac = null;
  function beep(f, d) {
    try {
      var s = JSON.parse(localStorage.getItem('kc_cfg_v1') || '{}'); if (s.sound === false) return;
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = 0.14;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
    } catch (e) {}
  }

  /* ---------- Điều khiển vòng chơi ---------- */
  var S = null, vt = 0, lastT = Date.now(), kind = null, lastBig = -1, qn = 0, sess = Date.now();
  function newS() { return { p: null, key: '', dl: 0, pick: [-1, -1], t: 0, revT: 0, msg: '', o: '', skip: false, cur: {}, logged: false }; }
  S = newS();
  function reset() { S = newS(); pend = {}; lastBig = -1; }
  function secs(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
  function begin() { S.p = 'select'; S.dl = vt + C.secs * 1000; S.msg = ''; S.skip = false; S.pick = [-1, -1]; S.cur = {}; S.logged = false; pend = {}; }

  /* Đếm phiếu: nhóm 0 = cả lớp (rv) hoặc Đội 1, nhóm 1 = Đội 2 (keo). Trả về {cnt:[[A,B,C,D],...], tot:[...], win:[idx...], need:[...]} */
  function tally() {
    var n = roster().length, groups = kind === 'keo' ? 2 : 1, cnt = [], tot = [], need = [], win = [], g, i;
    for (g = 0; g < groups; g++) { cnt.push([0, 0, 0, 0]); tot.push(0); need.push(0); }
    for (i = 0; i < n; i++) { g = groups === 1 ? 0 : teamOf(i, n); need[g]++; var a = S.cur[i]; if (a) { cnt[g][LET.indexOf(a)]++; tot[g]++; } }
    for (g = 0; g < groups; g++) {
      var mx = Math.max.apply(null, cnt[g]), w = -1, same = 0;
      cnt[g].forEach(function (c, j) { if (c === mx && mx > 0) { same++; w = j; } });
      win.push(same === 1 ? w : -1);
    }
    return { cnt: cnt, tot: tot, need: need, win: win, any: tot.reduce(function (a, b) { return a + b; }, 0) };
  }
  function allIn() { var t = tally(); return C.auto && t.need.every(function (x) { return x > 0; }) && t.tot.every(function (x, g) { return x >= t.need[g]; }); }
  function activeKind() {
    if (!C.on) return null;
    if (rvEl.classList.contains('on') && !$('kcRvOv').classList.contains('on')) return 'rv';
    if (kcSt.classList.contains('on') && !$('kcOv').classList.contains('on')) return 'keo';
    return null;
  }

  /* Ghi kết quả một câu (chỉ chế độ Ôn tập) khi đáp án đúng đã hiện */
  function logRv() {
    if (S.logged) return;
    var box = $('kcRvBox'), ok = box.querySelector('.kc-opt.ok i'); if (!ok) return;
    S.logged = true;
    var qEl = box.querySelector('.kc-q'), copy = {}, id;
    for (id in S.cur) copy[id] = S.cur[id];
    var mm = /(\d+)/.exec(S.key), nn = mm ? +mm[1] : ++qn;
    LOG = LOG.filter(function (r) { return !(r.s === sess && r.key === S.key); });
    LOG.push({ s: sess, key: S.key, n: nn, q: qEl ? qEl.textContent.slice(0, 120) : '', correct: ok.textContent.trim(), ans: copy });
    saveLog();
  }

  function stepRv() {
    var box = $('kcRvBox'), nm = box.querySelector('.kc-nm'), key = nm ? nm.textContent : '', opts = box.querySelectorAll('.kc-opt');
    var rev = !!box.querySelector('.kc-opt.ok'), pk = rev || !!box.querySelector('.kc-opt.bad'), o = rev ? 'rev' : (pk ? 'pick' : 'open');
    S.o = o; if (!opts.length) return;
    if (key !== S.key) {                                   /* sang câu mới */
      S.key = key; S.logged = false;
      if (o === 'open') begin(); else { S.p = 'post'; S.t = vt; S.revT = rev ? vt : 0; }
    } else if (S.p === 'select' && o !== 'open') {         /* cô tự bấm đáp án / hiện đáp án */
      S.p = 'post'; S.t = vt; S.revT = rev ? vt : 0;
    } else if (S.p === 'post' && o === 'open') {           /* cô bấm “Chọn lại” */
      begin();
    }
    if (S.p === 'select') {
      var tl = tally();
      if (S.skip || vt >= S.dl || allIn()) {
        if (!tl.any) { S.dl = vt + 10000; S.skip = false; S.msg = 'Chưa quét được thẻ nào, thêm 10 giây'; return; }
        if (tl.win[0] < 0) { S.p = 'post'; S.t = vt; S.revT = 0; S.msg = ''; $('kcRvShow').click(); return; }   /* hòa phiếu: hiện đáp án luôn */
        S.pick[0] = tl.win[0]; S.p = 'locked'; S.t = vt; beep(988, 0.25);
      }
    } else if (S.p === 'locked') {
      if (vt - S.t >= C.rev * 1000) { var ob = opts[S.pick[0]]; S.p = 'post'; S.t = vt; S.revT = 0; if (ob) ob.click(); }
    } else if (S.p === 'post') {
      if (o === 'rev') {
        logRv();
        if (!S.revT) S.revT = vt;
        if (C.next > 0 && !hold && vt - S.revT >= C.next * 1000) { S.p = 'adv'; $('kcRvNext').click(); }
      } else if (o === 'pick' && vt - S.t >= 1700) { S.t = vt + 1e9; $('kcRvShow').click(); }   /* chọn sai: chờ nhạc buồn rồi hiện đáp án */
    }
  }
  function keoBlocked() { return $('kcCd').classList.contains('on') || ($('kcPause').textContent || '').indexOf('▶') >= 0; }
  function stepKeo() {
    if (S.p === null) begin();
    if (S.p === 'select') {
      var tl = tally();
      if (S.skip || vt >= S.dl || allIn()) {
        if (!tl.any) { S.dl = vt + 8000; S.skip = false; S.msg = 'Chưa quét được thẻ nào, thêm 8 giây'; return; }
        S.pick = [tl.win[0], tl.win[1]]; S.p = 'locked'; S.t = vt; beep(988, 0.25);
      }
    } else if (S.p === 'locked') {
      if (vt - S.t >= C.rev * 1000) {
        S.pick.forEach(function (j, t) {
          if (j < 0) return;
          var team = t ? $('kcTR') : $('kcTB'); if (team.classList.contains('lock')) return;
          var ob = team.querySelector('.kc-opt[data-o="' + j + '"]'); if (ob) ob.click();
        });
        S.p = 'after'; S.t = vt;
      }
    } else if (S.p === 'after') {
      if (vt - S.t >= 1600) begin();
    }
  }

  /* ---------- Hiển thị ---------- */
  function paintBadges() {
    var boxes = kind === 'rv' ? [$('kcRvBox')] : [$('kcTB'), $('kcTR')];
    boxes.forEach(function (bx, t) {
      Array.prototype.forEach.call(bx.querySelectorAll('.kc-opt'), function (op, j) {
        op.classList.toggle('ar-sel', (S.p === 'locked') && S.pick[t] === j);
      });
    });
  }
  function paintTally() {
    var tl = tally(), h = '', names = roster(), g, j, miss = [], two = tl.cnt.length === 2;
    for (g = 0; g < tl.cnt.length; g++) {
      var mx = Math.max(1, Math.max.apply(null, tl.cnt[g]));
      h += '<div class="ar-g"><div class="ar-gt">' + (two ? 'Đội ' + (g + 1) + ' · ' + tl.tot[g] + '/' + tl.need[g] + (tl.win[g] >= 0 ? ' → ' + LET.charAt(tl.win[g]) : '') : 'Đã trả lời ' + tl.tot[0] + '/' + tl.need[0]) + '</div><div class="ar-vb">';
      for (j = 0; j < 4; j++) h += '<div class="ar-vc"><span class="n">' + tl.cnt[g][j] + '</span><div class="col"><i style="height:' + Math.round(tl.cnt[g][j] / mx * 100) + '%;background:' + CH[j] + '"></i></div><b class="l" style="background:' + CH[j] + '">' + LET.charAt(j) + '</b></div>';
      h += '</div></div>';
    }
    $('arTl').innerHTML = h;
    names.forEach(function (nm, i) { if (!S.cur[i]) miss.push(nm); });
    $('arMiss').textContent = miss.length && miss.length < names.length && S.p === 'select' ? 'Chưa thấy: ' + miss.slice(0, 8).join(', ') + (miss.length > 8 ? ' …(+' + (miss.length - 8) + ')' : '') : '';
  }
  function paintStatus() {
    var stx = $('arSt'), pg = $('arPg'), txt = '';
    pg.style.width = '0';
    if (fail()) { stx.textContent = '⚠ ' + fail(); return; }
    if (!ready()) { stx.textContent = waitMsg(); return; }
    if (!roster().length) { stx.textContent = '⚠ Chưa nhập danh sách học sinh'; return; }
    if (hold) txt = '⏸ Đang giữ (bấm ▶ để tiếp tục)';
    else if (S.p === 'select') { txt = '🎫 Giơ thẻ để trả lời · còn ' + secs(S.dl - vt) + 's' + (S.msg ? ' · ' + S.msg : ''); pg.style.width = Math.max(0, Math.min(100, Math.round((S.dl - vt) / (C.secs * 10)))) + '%'; }
    else if (S.p === 'locked') txt = '🔒 ' + (kind === 'rv' ? 'Lớp chọn ' + LET.charAt(S.pick[0]) : 'Đội 1: ' + (S.pick[0] < 0 ? '—' : LET.charAt(S.pick[0])) + ' · Đội 2: ' + (S.pick[1] < 0 ? '—' : LET.charAt(S.pick[1]))) + ' · đáp án sau ' + secs(C.rev * 1000 - (vt - S.t)) + 's';
    else if (S.p === 'post' && S.o === 'rev' && S.revT && C.next > 0) txt = '✅ Sang câu tiếp sau ' + secs(C.next * 1000 - (vt - S.revT)) + ' giây';
    else if (S.p === 'post' && S.o === 'rev') txt = '✅ Đã hiện đáp án';
    else if (S.p === 'post') txt = '⏳ Đang hiện đáp án…';
    else if (S.p === 'after') txt = '⏳ Chuẩn bị câu tiếp…';
    else txt = '🎫 Camera sẵn sàng';
    stx.textContent = txt;
    var rem = S.p === 'locked' && !hold ? secs(C.rev * 1000 - (vt - S.t)) : 0;
    if (rem >= 1 && rem <= 3) { big.classList.add('on'); if (rem !== lastBig) { big.innerHTML = '<span>' + rem + '</span>'; beep(520, 0.1); } } else big.classList.remove('on');
    lastBig = rem;
  }
  function paintTest() {
    $('arSt').textContent = fail() ? '⚠ ' + fail() : (ready() ? '🎥 Thử quét: thấy ' + seen.length + ' thẻ' : waitMsg());
    $('arPg').style.width = '0';
    var names = roster();
    $('arTl').innerHTML = seen.length ? seen.map(function (m) { return '<div><b style="color:' + CH[LET.indexOf(m.a)] + '">' + m.a + '</b> · ' + esc(names[m.id] || ('Thẻ ' + m.id)) + '</div>'; }).join('') : '';
    $('arMiss').textContent = '';
    $('arMsg').textContent = fail() ? '' : (ready() ? (C.src === 'phone' ? 'Điện thoại đã kết nối.' : 'Camera hoạt động.') + ' Giơ thẻ: chữ hiện trên thẻ là đáp án máy đọc được.' : (C.src === 'phone' ? 'Mở quet.html trên điện thoại và nhập mã phòng.' : 'Lần đầu cần tải bộ nhận dạng, vui lòng chờ…'));
  }
  function testMode() { var r = document.querySelector('input[name="kcMode"]:checked'); return r && r.value === 'on' ? 'rv' : 'keo'; }
  function toggleTest(v) {
    testing = v; $('arTest').textContent = v ? '⏹ Tắt thử camera' : '🎥 Thử camera';
    if (v) { placeInline(); reset(); startCam(); } else { stopCam(); $('arMsg').textContent = ''; $('arTl').innerHTML = ''; }
  }
  $('arTest').onclick = function () { toggleTest(!testing); };
  $('kcStart').addEventListener('click', function () {   /* bấm Bắt đầu: bật camera ngay trong thao tác của người dùng */
    if (!C.on) return;
    if (!roster().length) { $('arMsg').textContent = 'Hãy nhập danh sách học sinh trước (mỗi dòng một em).'; }
    if (testMode() === 'rv') { var s = $('kcRvSecs'); if (s) s.value = 0; }   /* thời gian do chế độ thẻ quản lý */
    if (testing) toggleTest(false);
    startCam();
  }, true);

  function paintJoin() {
    var j = $('arJoin'), show = C.src === 'phone' && !RM.conns.length;
    panel.classList.toggle('ph', C.src === 'phone');
    j.style.display = show ? 'block' : 'none';
    if (show) { var h = '<small>Mã đăng nhập</small><b>' + (RM.code ? RM.code.slice(0, 3) + ' ' + RM.code.slice(3) : '· · ·') + '</b>'; if (j._h !== h) { j._h = h; j.innerHTML = h; } }
  }
  function tick() {
    paintJoin();
    var now = Date.now(), dt = Math.min(1000, now - lastT); lastT = now;
    if (RM.conns.length && ++bc % 3 === 0) broadcast();
    var k2 = activeKind();
    if (k2 !== kind) {
      if (k2 === 'rv') { sess = Date.now(); qn = 0; }   /* mỗi lượt Ôn tập mới = một đợt kết quả riêng */
      kind = k2; reset(); vt = 0; hold = false; panel.querySelector('#arHold').textContent = '⏸';
      if (kind) { testing = false; $('arTest').textContent = '🎥 Thử camera'; place(kind === 'rv' ? rvEl : kcSt); startCam(); }
      else { big.classList.remove('on'); if (!testing) { placeInline(); stopCam(); } }
    }
    if (!kind) { if (testing) { paintTest(); } return; }
    var blocked = !!fail() || !ready() || !roster().length || (kind === 'keo' && keoBlocked());
    if (!hold && !blocked) vt += dt;
    if (!blocked && !hold) { if (kind === 'rv') stepRv(); else stepKeo(); }
    paintStatus(); paintTally(); paintBadges();
  }
  setInterval(tick, 200);

  /* ---------- In thẻ ---------- */
  var ov = document.createElement('div'); ov.id = 'arOv'; document.body.appendChild(ov);
  function closeOv() { ov.classList.remove('on'); document.body.classList.remove('ar-open'); ov.innerHTML = ''; }
  function openCards() {
    var names = roster(); if (!names.length) { $('arMsg').textContent = 'Hãy nhập danh sách học sinh trước.'; return; }
    ov.innerHTML = '<div class="ar-top"><button id="arDoPrint" type="button">🖨 In</button><button id="arClose" type="button">✕ Đóng</button>' +
      '<span style="align-self:center;font-size:13px">In đúng kích thước (không phóng to/thu nhỏ). Mỗi trang 9 thẻ; cắt rời, có thể ép dẻo cho bền.</span></div><div class="cards" id="arCards"></div>';
    ov.classList.add('on'); document.body.classList.add('ar-open');
    loadLib().then(function () {
      if (failed) { $('arCards').textContent = failed; return; }
      var D = new window.AR.Dictionary(DICT);
      $('arCards').innerHTML = names.map(function (n, id) {
        return '<div class="pc"><small>#' + id + ' ' + esc(n) + '</small>' + D.generateSVG(id) + '<i class="a">A</i><i class="b">B</i><i class="c">C</i><i class="d">D</i></div>';
      }).join('');
    });
    $('arClose').onclick = closeOv;
    $('arDoPrint').onclick = function () { try { window.print(); } catch (e) {} };
  }
  $('arPrint').onclick = openCards;

  /* ---------- Kết quả & xuất CSV ---------- */
  function curLog() {   /* chỉ lấy đợt ôn gần nhất, xếp theo số câu */
    if (!LOG.length) return [];
    var s0 = LOG[LOG.length - 1].s;
    return LOG.filter(function (r) { return r.s === s0; }).sort(function (a, b) { return a.n - b.n; });
  }
  function results() {
    var L = curLog(), names = roster(), rows = names.map(function (nm, id) {
      var right = 0, got = 0;
      L.forEach(function (r) { var a = r.ans[id]; if (a) { got++; if (a === r.correct) right++; } });
      return { id: id, name: nm, right: right, got: got };
    });
    return rows;
  }
  function csv() {
    var L = curLog(), names = roster(), head = ['Thẻ', 'Học sinh'].concat(L.map(function (r) { return 'Câu ' + r.n; })).concat(['Đúng', 'Đã trả lời']);
    var rows = [head];
    results().forEach(function (s) {
      rows.push([s.id, s.name].concat(L.map(function (r) { var a = r.ans[s.id] || ''; return a; })).concat([s.right, s.got]));
    });
    rows.push(['', 'Đáp án đúng'].concat(L.map(function (r) { return r.correct; })).concat(['', '']));
    return '\ufeff' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  }
  function dl(text, name) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    if (typeof window.saveBlob === 'function') { window.saveBlob(blob, name); return; }
    var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 3000);
  }
  function openRes() {
    var rows = results().sort(function (a, b) { return b.right - a.right || a.id - b.id; });
    ov.innerHTML = '<div class="ar-top"><button id="arCsv" type="button">⬇ Tải CSV</button><button id="arClr" type="button">🗑 Xóa kết quả</button><button id="arClose" type="button">✕ Đóng</button></div>' +
      '<p>' + curLog().length + ' câu đã ghi nhận trong đợt ôn gần nhất (chỉ chế độ Ôn tập, tính khi đáp án đúng được hiện).</p>' +
      '<table><tr><th>#</th><th>Học sinh</th><th>Đúng</th><th>Đã trả lời</th></tr>' +
      rows.map(function (s, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(s.name) + '</td><td>' + s.right + '</td><td>' + s.got + '/' + curLog().length + '</td></tr>'; }).join('') + '</table>';
    ov.classList.add('on'); document.body.classList.add('ar-open');
    $('arClose').onclick = closeOv;
    $('arCsv').onclick = function () { dl(csv(), 'ket-qua-the-aruco.csv'); };
    $('arClr').onclick = function () { if (window.confirm('Xóa toàn bộ kết quả đã ghi?')) { LOG = []; qn = 0; saveLog(); openRes(); } };
  }
  $('arRes').onclick = openRes;
  srcUi();
  window.addEventListener('afterprint', function () { /* giữ lớp phủ để in lại được; đóng bằng nút ✕ */ });
})();
