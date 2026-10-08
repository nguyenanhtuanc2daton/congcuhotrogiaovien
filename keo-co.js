/* keo-co.js — Trò chơi "Kéo co kiến thức" cho tab Công cụ thường dùng
   Mount vào #kcRoot. CSS tự chèn, mọi class đều có tiền tố .kc- nên không đụng style.css. */
(function () {
  'use strict';
  var root = document.getElementById('kcRoot');
  if (!root) return;

  var LS = 'kc_cfg_v1';
  var SAMPLE = [
    'Số nguyên tố nhỏ nhất là số nào? | 0 | 1 | 2 | 3 | 2',
    'Việt Nam nằm ở khu vực nào của Châu Á? | Đông Á | Đông Nam Á | Nam Á | Tây Nam Á | B',
    'Thủ đô của Việt Nam là? | Huế | Đà Nẵng | Hà Nội | TP. Hồ Chí Minh | C',
    '5 × 6 bằng bao nhiêu? | 25 | 30 | 35 | 40 | B',
    'Nước nào có diện tích lớn nhất thế giới? | Canada | Trung Quốc | Mỹ | Nga | D'
  ].join('\n');

  /* ---------- CSS ---------- */
  var st = document.createElement('style');
  st.textContent = [
    '.kc-stage{display:none;background:#0b1020;color:#fff;border-radius:14px;padding:10px;position:relative}',
    '.kc-stage.on{display:block}',
    '.kc-stage:fullscreen{border-radius:0;padding:12px;overflow:auto;height:100%}',
    '.kc-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}',
    '.kc-top .kc-sp{flex:1}',
    '.kc-time{font-size:26px;font-weight:800;background:#151b34;border:1px solid #2a3360;border-radius:12px;padding:4px 16px;min-width:92px;text-align:center}',
    '.kc-time.low{color:#ff6b6b}',
    '.kc-chip{border-radius:999px;padding:5px 14px;font-weight:700;font-size:14px;border:1px solid}',
    '.kc-chip.b{background:#10265c;border-color:#3b82f6;color:#bcd4ff}',
    '.kc-chip.r{background:#4a1018;border-color:#ef4444;color:#ffc4c4}',
    '.kc-btn{background:#1b2347;color:#fff;border:1px solid #333f77;border-radius:10px;padding:7px 12px;font-size:14px;cursor:pointer}',
    '.kc-btn:hover{background:#26305f}',
    '.kc-grid{display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:10px}',
    '.kc-team{border-radius:14px;padding:10px;border:2px solid;display:flex;flex-direction:column;gap:8px;min-height:380px}',
    '.kc-team.b{border-color:#2563eb;background:#0f1a3d}',
    '.kc-team.r{border-color:#dc2626;background:#2a0f16}',
    '.kc-th{display:flex;justify-content:space-between;align-items:center;font-weight:800}',
    '.kc-th small{background:#ffffff1f;border-radius:8px;padding:2px 8px;font-size:12px}',
    '.kc-q{flex:1;border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;font-weight:800;font-size:clamp(18px,2.4vw,34px);line-height:1.3;min-height:140px}',
    '.b .kc-q{background:linear-gradient(160deg,#1e3a9f,#1d4ed8)}',
    '.r .kc-q{background:linear-gradient(160deg,#9f1d1d,#dc2626)}',
    '.kc-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.kc-opt{background:#fff;color:#111;border:0;border-radius:12px;padding:12px 6px;font-weight:800;font-size:clamp(15px,1.8vw,24px);cursor:pointer;min-height:56px;position:relative}',
    '.kc-opt:active{transform:scale(.97)}',
    '.kc-opt i{position:absolute;left:8px;top:5px;font-size:11px;font-style:normal;opacity:.45}',
    '.kc-opt.ok{background:#22c55e;color:#fff}',
    '.kc-opt.bad{background:#ef4444;color:#fff}',
    '.kc-team.lock .kc-opt{pointer-events:none}',
    '.kc-field{background:#fff;border-radius:14px;position:relative;overflow:hidden;min-height:380px;color:#222}',
    '.kc-mid{position:absolute;left:50%;top:0;bottom:0;border-left:4px dashed #16a34a;transform:translateX(-2px)}',
    '.kc-end{position:absolute;top:0;bottom:0;width:6px;opacity:.5}',
    '.kc-end.b{left:8%;background:#2563eb}.kc-end.r{right:8%;background:#dc2626}',
    '.kc-mover{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;transition:left .45s cubic-bezier(.3,1.4,.5,1)}',
    '.kc-grp{font-size:clamp(28px,5vw,56px);letter-spacing:-6px;white-space:nowrap}',
    '.kc-rope{height:10px;width:clamp(60px,12vw,140px);background:repeating-linear-gradient(90deg,#b08a4e 0 8px,#8a6a36 8px 16px);border-radius:6px}',
    '.kc-knot{width:26px;height:40px;background:#ef4444;border:3px solid #7f1d1d;border-radius:8px}',
    '.kc-info{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:#0f172a;color:#d1fae5;border-radius:12px;padding:6px 14px;font-size:13px;text-align:center;white-space:nowrap}',
    '.kc-bar{position:absolute;left:0;right:0;top:0;height:8px;background:linear-gradient(90deg,#2563eb 50%,#dc2626 50%)}',
    '.kc-ov{position:absolute;inset:0;background:#000b;border-radius:14px;display:none;align-items:center;justify-content:center;z-index:5}',
    '.kc-ov.on{display:flex}',
    '.kc-ovbox{background:#fff;color:#111;border-radius:20px;padding:26px 34px;text-align:center;max-width:90%}',
    '.kc-ovbox h2{margin:0 0 6px;font-size:clamp(22px,4vw,40px)}',
    '.kc-ovbox .bar{justify-content:center}',
    '.kc-setup textarea{width:100%;min-height:210px;font-family:inherit}',
    '@media(max-width:820px){.kc-grid{grid-template-columns:1fr 1fr}.kc-field{grid-column:1/-1;order:-1;min-height:230px}.kc-team{min-height:0}}',
    '@media(max-width:520px){.kc-grid{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- Trạng thái ---------- */
  var cfg = { bank: SAMPLE, secs: 120, nameB: 'Đội Xanh', nameR: 'Đội Đỏ', sound: true };
  try { var saved = JSON.parse(localStorage.getItem(LS) || 'null'); if (saved) for (var k in saved) cfg[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }

  var bank = [], teams = [], pos = 0, phase = 'setup', paused = false;
  var endAt = 0, remain = 0, timer = null, step = 0.2;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(ms) { var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------- Âm thanh ---------- */
  var actx = null;
  function beep(f, d, type) {
    if (!cfg.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = f; g.gain.value = 0.08;
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
    } catch (e) {}
  }

  /* ---------- Phân tích câu hỏi: "Câu hỏi | A | B | C | D | Đáp án (A-F / 1-6 / nội dung)" ---------- */
  function parse(text) {
    var out = [];
    String(text).split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (!l) return;
      var p = (l.indexOf('|') >= 0 ? l.split('|') : l.split('\t')).map(function (s) { return s.trim(); });
      if (p.length < 4) return;
      var q = p[0], ans = p[p.length - 1], opts = p.slice(1, -1), idx = -1;
      if (/^[A-Fa-f]$/.test(ans)) idx = ans.toUpperCase().charCodeAt(0) - 65;
      else if (/^[1-6]$/.test(ans)) idx = +ans - 1;
      else idx = opts.indexOf(ans);
      if (!q || idx < 0 || idx >= opts.length) return;
      out.push({ q: q, opts: opts, ans: opts[idx] });
    });
    return out;
  }

  /* ---------- Giao diện ---------- */
  root.innerHTML =
    '<div class="kc-setup" id="kcSetup">' +
    '<h2>🪢 Kéo Co Kiến Thức</h2>' +
    '<p class="note">Hai đội cùng trả lời trên một màn hình. Đội nào trả lời đúng thì kéo dây về phía mình. Hết giờ, đội nào kéo được nhiều hơn sẽ thắng.</p>' +
    '<div class="grid2"><div>' +
    '<b>Bộ câu hỏi</b> <span class="note" id="kcCount"></span>' +
    '<textarea id="kcBank" spellcheck="false" placeholder="Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | Đáp án đúng (A/B/C/D)"></textarea>' +
    '<div class="bar"><button class="ghost sm" id="kcFileBtn" type="button">⬆ Nhập file câu hỏi (.txt, .csv, .xlsx)</button>' +
    '<button class="sec sm" id="kcSample" type="button">Dùng bộ mẫu</button>' +
    '<input type="file" id="kcFile" accept=".txt,.csv,.tsv,.xlsx,.xls" hidden></div>' +
    '<div class="bar" style="margin-top:6px"><b>✨ Tạo câu hỏi bằng AI</b></div>' +
    '<div class="bar"><input id="kcAiTopic" placeholder="Môn / chủ đề / lớp (vd: Toán 6 – phân số)" style="flex:1;min-width:180px">' +
    '<label>Số câu <input type="number" id="kcAiN" value="10" min="3" max="30" style="width:64px"></label></div>' +
    '<div class="bar"><label>Model <select id="kcAiModel"><option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option><option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option><option value="gemini-3.8-flash">Gemini 3.8 Flash</option></select></label>' +
    '<button class="sm" id="kcAiBtn" type="button">✨ Tạo câu hỏi</button>' +
    '<label class="note"><input type="checkbox" id="kcAiAdd"> Nối thêm vào bộ hiện tại</label></div>' +
    '<div id="kcAiMsg" class="note"></div>' +
    '<div class="note">Mỗi dòng một câu: <code>Câu hỏi | A | B | C | D | B</code>. Cột cuối là đáp án đúng (chữ A–D, số 1–4 hoặc chính nội dung đáp án). Excel: cột A câu hỏi, các cột kế tiếp là đáp án, cột cuối là đáp án đúng.</div>' +
    '</div><div>' +
    '<b>Cấu hình</b>' +
    '<div class="bar"><label>Tên đội 1 (Xanh) <input id="kcNB" style="width:150px"></label></div>' +
    '<div class="bar"><label>Tên đội 2 (Đỏ) <input id="kcNR" style="width:150px"></label></div>' +
    '<div class="bar"><label>Thời gian (giây) <input type="number" id="kcSecs" min="20" max="3600" style="width:90px"></label></div>' +
    '<div class="bar"><label><input type="checkbox" id="kcSnd"> Bật âm thanh</label></div>' +
    '<div class="bar"><button class="red" id="kcStart" type="button" style="font-size:18px;padding:12px 26px">▶ BẮT ĐẦU / TRÌNH CHIẾU</button></div>' +
    '<div class="note">Phím tắt cho 2 đội dùng chung bàn phím: đội Xanh bấm <b>A S D F</b>, đội Đỏ bấm <b>J K L ;</b> (tương ứng 4 đáp án).</div>' +
    '<div id="kcMsg" class="status info"></div>' +
    '</div></div></div>' +

    '<div class="kc-stage" id="kcStage">' +
    '<div class="kc-top">' +
    '<button class="kc-btn" id="kcBack" type="button">← Cài đặt</button>' +
    '<div class="kc-time" id="kcTime">0:00</div>' +
    '<span class="kc-chip b" id="kcSB"></span><span class="kc-chip r" id="kcSR"></span>' +
    '<span class="kc-sp"></span>' +
    '<button class="kc-btn" id="kcPause" type="button">⏸ Tạm dừng</button>' +
    '<button class="kc-btn" id="kcMute" type="button"></button>' +
    '<button class="kc-btn" id="kcRestart" type="button">↻ Chơi lại</button>' +
    '<button class="kc-btn" id="kcFull" type="button">⛶ Toàn màn hình</button>' +
    '</div>' +
    '<div class="kc-grid">' +
    '<div class="kc-team b" id="kcTB"></div>' +
    '<div class="kc-field"><div class="kc-bar"></div><div class="kc-mid"></div><div class="kc-end b"></div><div class="kc-end r"></div>' +
    '<div class="kc-mover" id="kcMover"><span class="kc-grp">🧑‍🎓🧑‍🎓🧑‍🎓</span><span class="kc-rope"></span><span class="kc-knot"></span><span class="kc-rope"></span><span class="kc-grp" style="transform:scaleX(-1)">🧑‍🎓🧑‍🎓🧑‍🎓</span></div>' +
    '<div class="kc-info" id="kcInfo"></div></div>' +
    '<div class="kc-team r" id="kcTR"></div>' +
    '</div>' +
    '<div class="kc-ov" id="kcOv"><div class="kc-ovbox"><div style="font-size:54px">🏆</div><h2 id="kcWin"></h2><p id="kcWinSub"></p>' +
    '<div class="bar"><button class="red" id="kcAgain" type="button">↻ Chơi lại</button><button class="sec" id="kcToSetup" type="button">Về cài đặt</button></div></div></div>' +
    '</div>';

  function $(id) { return document.getElementById(id); }
  var el = {
    setup: $('kcSetup'), stage: $('kcStage'), bank: $('kcBank'), count: $('kcCount'), msg: $('kcMsg'),
    nb: $('kcNB'), nr: $('kcNR'), secs: $('kcSecs'), snd: $('kcSnd'), file: $('kcFile'),
    time: $('kcTime'), sb: $('kcSB'), sr: $('kcSR'), tb: $('kcTB'), tr: $('kcTR'),
    mover: $('kcMover'), info: $('kcInfo'), ov: $('kcOv'), win: $('kcWin'), winSub: $('kcWinSub'),
    pause: $('kcPause'), mute: $('kcMute')
  };

  el.bank.value = cfg.bank; el.nb.value = cfg.nameB; el.nr.value = cfg.nameR; el.secs.value = cfg.secs; el.snd.checked = !!cfg.sound;
  function updCount() { el.count.textContent = '(' + parse(el.bank.value).length + ' câu hợp lệ)'; }
  updCount();
  el.bank.addEventListener('input', updCount);

  /* ---------- Nhập file ---------- */
  $('kcFileBtn').onclick = function () { el.file.click(); };
  $('kcSample').onclick = function () { el.bank.value = SAMPLE; updCount(); };
  el.file.addEventListener('change', function () {
    var f = el.file.files[0]; if (!f) return;
    var rd = new FileReader();
    if (/\.xlsx?$/i.test(f.name)) {
      if (!window.XLSX) { el.msg.textContent = 'Chưa tải được thư viện đọc Excel.'; return; }
      rd.onload = function () {
        try {
          var wb = XLSX.read(rd.result, { type: 'array' });
          var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
          el.bank.value = rows.map(function (r) { return r.join(' | '); }).join('\n');
          updCount(); el.msg.textContent = 'Đã nhập từ ' + f.name;
        } catch (e) { el.msg.textContent = 'Không đọc được file Excel.'; }
      };
      rd.readAsArrayBuffer(f);
    } else {
      rd.onload = function () { var tx = String(rd.result); el.bank.value = (/\.csv$/i.test(f.name) && tx.indexOf('|') < 0) ? tx.replace(/\r?\n/g, '\n').split('\n').map(function (l) { return l.split(',').join(' | '); }).join('\n') : tx; updCount(); el.msg.textContent = 'Đã nhập từ ' + f.name; };
      rd.readAsText(f, 'utf-8');
    }
    el.file.value = '';
  });

  /* ---------- Vòng chơi ---------- */
  function newTeam(name, cls) {
    return { name: name, cls: cls, order: shuffle(bank.map(function (_, i) { return i; })), idx: 0, locked: false, ok: 0, bad: 0, opts: [] };
  }
  function loadQ(T) {
    var q = bank[T.order[T.idx % T.order.length]];
    T.q = q; T.opts = shuffle(q.opts); T.locked = false; T.mark = null;
  }

  function start() {
    bank = parse(el.bank.value);
    if (bank.length < 1) { el.msg.textContent = 'Chưa có câu hỏi hợp lệ. Mỗi dòng cần: Câu hỏi | các đáp án | đáp án đúng.'; return; }
    cfg.bank = el.bank.value; cfg.nameB = el.nb.value.trim() || 'Đội Xanh'; cfg.nameR = el.nr.value.trim() || 'Đội Đỏ';
    cfg.secs = Math.max(20, +el.secs.value || 120); cfg.sound = el.snd.checked; save();
    teams = [newTeam(cfg.nameB, 'b'), newTeam(cfg.nameR, 'r')];
    teams.forEach(loadQ);
    pos = 0; step = 1 / bank.length; paused = false; phase = 'play';
    remain = cfg.secs * 1000; endAt = Date.now() + remain;
    el.setup.style.display = 'none'; el.stage.classList.add('on'); el.ov.classList.remove('on');
    el.pause.textContent = '⏸ Tạm dừng';
    renderAll();
    clearInterval(timer); timer = setInterval(tick, 200);
  }

  function renderTeam(i) {
    var T = teams[i], box = i ? el.tr : el.tb, keys = i ? ['J', 'K', 'L', ';'] : ['A', 'S', 'D', 'F'];
    box.className = 'kc-team ' + T.cls + (T.locked ? ' lock' : '');
    box.innerHTML =
      '<div class="kc-th"><span>' + (i ? '🔴 ' : '🔵 ') + esc(T.name) + '</span><small>Câu #' + (T.ok + T.bad + 1) + '</small></div>' +
      '<div class="kc-q">' + esc(T.q.q) + '</div>' +
      '<div class="kc-opts">' + T.opts.map(function (o, j) {
        var c = T.mark && T.mark.j === j ? (T.mark.ok ? ' ok' : ' bad') : (T.mark && !T.mark.ok && o === T.q.ans ? ' ok' : '');
        return '<button type="button" class="kc-opt' + c + '" data-t="' + i + '" data-o="' + j + '">' + (keys[j] ? '<i>' + keys[j] + '</i>' : '') + esc(o) + '</button>';
      }).join('') + '</div>';
  }
  function renderRope() {
    el.mover.style.left = (50 + pos * 34) + '%';
    var pct = Math.round(Math.abs(pos) * 100);
    el.info.innerHTML = pos === 0 ? '⚖ Đang cân bằng ở vạch giữa' : (pos < 0 ? '🔵 ' + esc(teams[0].name) : '🔴 ' + esc(teams[1].name)) + ' đang dẫn ' + pct + '%';
    el.info.innerHTML += '<br><small>Mỗi câu đúng kéo ' + (step * 100).toFixed(1) + '% (' + bank.length + ' câu)</small>';
  }
  function renderScore() {
    el.sb.textContent = teams[0].name + ': ' + teams[0].ok + ' đúng';
    el.sr.textContent = teams[1].name + ': ' + teams[1].ok + ' đúng';
  }
  function renderAll() {
    renderTeam(0); renderTeam(1); renderRope(); renderScore();
    el.time.textContent = fmt(remain); el.time.classList.toggle('low', remain <= 10000);
    el.mute.textContent = cfg.sound ? '🔊 Âm thanh' : '🔇 Tắt âm';
  }

  function answer(t, o) {
    if (phase !== 'play' || paused) return;
    var T = teams[t]; if (T.locked || o >= T.opts.length) return;
    var ok = T.opts[o] === T.q.ans;
    T.locked = true; T.mark = { j: o, ok: ok };
    if (ok) { T.ok++; pos += (t ? 1 : -1) * step; pos = Math.max(-1, Math.min(1, pos)); beep(880, 0.15); }
    else { T.bad++; beep(200, 0.3, 'square'); }
    renderTeam(t); renderRope(); renderScore();
    if (Math.abs(pos) >= 1) { setTimeout(function () { finish(); }, 500); return; }
    setTimeout(function () {
      if (phase !== 'play') return;
      T.idx++; loadQ(T); renderTeam(t);
    }, ok ? 600 : 1100);
  }

  function tick() {
    if (phase !== 'play' || paused) return;
    remain = Math.max(0, endAt - Date.now());
    el.time.textContent = fmt(remain); el.time.classList.toggle('low', remain <= 10000);
    if (remain <= 0) finish();
  }

  function finish() {
    if (phase !== 'play') return;
    phase = 'done'; clearInterval(timer);
    var w = pos < -1e-9 ? 0 : pos > 1e-9 ? 1 : -1;
    el.win.textContent = w < 0 ? 'Hòa nhau!' : teams[w].name + ' chiến thắng!';
    el.winSub.textContent = teams[0].name + ' ' + teams[0].ok + ' đúng – ' + teams[1].name + ' ' + teams[1].ok + ' đúng';
    el.ov.classList.add('on');
    beep(660, 0.15); setTimeout(function () { beep(880, 0.15); }, 160); setTimeout(function () { beep(1100, 0.3); }, 320);
  }

  function toSetup() {
    phase = 'setup'; clearInterval(timer);
    if (document.fullscreenElement) document.exitFullscreen();
    el.stage.classList.remove('on'); el.setup.style.display = '';
  }

  /* ---------- Sự kiện ---------- */
  $('kcStart').onclick = start;
  $('kcRestart').onclick = start; $('kcAgain').onclick = start;
  $('kcBack').onclick = toSetup; $('kcToSetup').onclick = toSetup;
  el.pause.onclick = function () {
    if (phase !== 'play') return;
    paused = !paused;
    if (paused) remain = Math.max(0, endAt - Date.now()); else endAt = Date.now() + remain;
    el.pause.textContent = paused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
  };
  el.mute.onclick = function () { cfg.sound = !cfg.sound; el.snd.checked = cfg.sound; save(); el.mute.textContent = cfg.sound ? '🔊 Âm thanh' : '🔇 Tắt âm'; };
  $('kcFull').onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.stage.requestFullscreen) el.stage.requestFullscreen();
  };
  el.stage.addEventListener('click', function (e) {
    var b = e.target.closest('.kc-opt'); if (!b) return;
    answer(+b.getAttribute('data-t'), +b.getAttribute('data-o'));
  });
  document.addEventListener('keydown', function (e) {
    if (phase !== 'play' || !el.stage.classList.contains('on')) return;
    var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    var k = e.key.toLowerCase(), b = ['a', 's', 'd', 'f'].indexOf(k), r = ['j', 'k', 'l', ';'].indexOf(k);
    if (b >= 0) answer(0, b); else if (r >= 0) answer(1, r);
  });

  /* ---------- Tạo câu hỏi bằng Gemini (dùng khóa chung GKEY từ gkey.js) ---------- */
  var AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  try { var sm = localStorage.getItem('kc_ai_model'); if (sm && AI_MODELS.indexOf(sm) >= 0) $('kcAiModel').value = sm; } catch (e) {}
  $('kcAiModel').addEventListener('change', function () { try { localStorage.setItem('kc_ai_model', this.value); } catch (e) {} });

  /* gọi 1 model; nếu quá tải / hết hạn mức / không có model thì thử model kế tiếp */
  function callGemini(models, i, prompt, m) {
    var model = models[i];
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GKEY.get() },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } })
    }).then(function (r) {
      if (r.ok) return r.json();
      if ((r.status === 429 || r.status === 404 || r.status >= 500) && i + 1 < models.length) {
        m.textContent = '⏳ ' + model + ' đang bận, thử ' + models[i + 1] + '...';
        return callGemini(models, i + 1, prompt, m);
      }
      throw new Error(r.status === 400 || r.status === 403 ? 'Key không hợp lệ hoặc chưa được phép dùng. Hãy kiểm tra lại key.' :
                      r.status === 429 ? 'Các model đều đã hết hạn mức, hãy thử lại sau ít phút.' : 'Lỗi từ Gemini (mã ' + r.status + ').');
    });
  }

  $('kcAiBtn').onclick = function () {
    var m = $('kcAiMsg'), btn = $('kcAiBtn');
    var topic = $('kcAiTopic').value.trim(), n = Math.max(3, Math.min(30, +$('kcAiN').value || 10));
    if (!topic) { m.textContent = 'Hãy nhập môn / chủ đề / lớp.'; return; }
    if (!window.GKEY || !GKEY.has()) {
      m.textContent = 'Chưa có API key Gemini. Hãy nhập key ở thanh phía trên trang.';
      if (window.GKEY) GKEY.open('Nhập key Gemini để tạo câu hỏi bằng AI.');
      return;
    }
    var first = $('kcAiModel').value;
    var models = [first].concat(AI_MODELS.filter(function (x) { return x !== first; }));
    var prompt = 'Bạn là giáo viên Việt Nam. Hãy soạn đúng ' + n + ' câu hỏi trắc nghiệm ngắn gọn (câu hỏi dưới 20 từ, mỗi đáp án dưới 8 từ) về: "' + topic + '". ' +
      'Mỗi câu có đúng 4 đáp án, chỉ 1 đáp án đúng, các đáp án nhiễu hợp lý. Viết bằng tiếng Việt. ' +
      'Chỉ trả về một mảng JSON, mỗi phần tử có dạng {"q":"...","options":["...","...","...","..."],"answer":0} với answer là chỉ số (0-3) của đáp án đúng.';
    btn.disabled = true; m.textContent = '⏳ Đang tạo câu hỏi bằng ' + first + '...';
    callGemini(models, 0, prompt, m).then(function (d) {
      var parts = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts || [];
      var t = parts.filter(function (x) { return !x.thought; }).map(function (x) { return x.text || ''; }).join('');
      if (!t) throw new Error('AI không trả về nội dung. Hãy thử lại.');
      var arr = JSON.parse(t.replace(/^\s*```(?:json)?|```\s*$/g, '').trim());
      var lines = [];
      arr.forEach(function (x) {
        if (!x || !x.q || !x.options || x.options.length < 2 || x.answer == null) return;
        var clean = function (v) { return String(v).replace(/\|/g, '/').replace(/\s+/g, ' ').trim(); };
        var opts = x.options.slice(0, 4).map(clean);
        if (x.answer < 0 || x.answer >= opts.length) return;
        lines.push(clean(x.q) + ' | ' + opts.join(' | ') + ' | ' + 'ABCD'.charAt(x.answer));
      });
      if (!lines.length) throw new Error('Không đọc được kết quả của AI. Hãy thử lại.');
      var cur = el.bank.value.trim();
      el.bank.value = ($('kcAiAdd').checked && cur ? cur + '\n' : '') + lines.join('\n');
      updCount();
      m.textContent = '✓ Đã tạo ' + lines.length + ' câu. Hãy xem lại đáp án đúng trước khi chơi.';
    }).catch(function (e) {
      m.textContent = '⚠ ' + (e && e.message ? e.message : 'Không tạo được câu hỏi.');
    }).then(function () { btn.disabled = false; });
  };

  document.addEventListener('visibilitychange', function () { /* giữ nguyên đồng hồ khi chuyển tab */ });
})();
