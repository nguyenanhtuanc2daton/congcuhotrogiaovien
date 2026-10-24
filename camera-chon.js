/* camera-chon.js — Chế độ Camera (cử chỉ tay) cho "Kéo co & Ôn tập kiến thức"
   Một học sinh lên trước camera, giơ số ngón tay tương ứng để chọn đáp án:
     1 ngón = A · 2 ngón = B · 3 ngón = C · 4 ngón (xòe bàn tay) = D · nắm tay = chưa chọn
   Giữ yên cử chỉ khoảng 1,5 giây thì được chốt. Không sửa keo-co.js: file này chỉ đọc giao diện
   và "bấm hộ" các nút (đáp án, Hiện đáp án, Câu tiếp). Nạp SAU keo-co.js.
   Nhận dạng bàn tay: MediaPipe HandLandmarker (tải từ CDN khi bật, chạy trong trình duyệt, không gửi hình đi đâu). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var rvEl = $('kcRv'), kcSt = $('kcStage'), modeBar = $('kcModeBar');
  if (!rvEl || !kcSt || !modeBar) { console.warn('camera-chon.js: cần nạp sau keo-co.js'); return; }

  /* ---------- Cấu hình ---------- */
  var LS = 'kc_cam_v2';
  var C = { on: false, secs: 30, hold: 1.5, rev: 3, next: 5, mirror: true };
  try { var sv = JSON.parse(localStorage.getItem(LS) || 'null'); if (sv) for (var k in sv) C[k] = sv[k]; } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify(C)); } catch (e) {} }
  function num(v, lo, hi, d) { v = parseFloat(v); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); }

  var VER = '0.10.14', CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VER;
  var HAND = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  var CH = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'], LET = 'ABCD';
  var TEAMC = ['#60a5fa', '#f87171'];
  function handSvg(n) {      /* bàn tay giơ n ngón (ngón trỏ, giữa, áp út, út), ngón cái gập */
    var xs = [9, 15.5, 22, 28.5], hs = [19, 23, 21, 16], sk = 'fill="#fcd9a8" stroke="#92400e" stroke-width="1.5"', o = '<svg viewBox="0 0 40 46" width="26" height="30" style="vertical-align:middle">';
    for (var i = 0; i < 4; i++) o += i < n ? '<rect x="' + xs[i] + '" y="' + (23 - hs[i]) + '" width="5.5" height="' + (hs[i] + 4) + '" rx="2.75" ' + sk + '/>' : '<rect x="' + xs[i] + '" y="19" width="5.5" height="8" rx="2.75" ' + sk + '/>';
    return o + '<rect x="7" y="22" width="27" height="21" rx="8" ' + sk + '/><rect x="3" y="29" width="14" height="8" rx="4" ' + sk + '/></svg>';
  }
  var LEG = [1, 2, 3, 4].map(function (n) { return handSvg(n) + ' = <b>' + LET.charAt(n - 1) + '</b>'; }).join(' &nbsp;·&nbsp; ');
  var BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

  /* ---------- CSS ---------- */
  var st = document.createElement('style');
  st.textContent = [
    '.cc-cfg{border:1px solid #8885;border-radius:10px;padding:6px 10px;margin:8px 0}',
    /* Mặc định (điện thoại / màn hình dọc): bảng camera nằm DƯỚI cùng, không đè lên đáp án */
    '.cc-panel{position:relative;margin:8px auto 0;z-index:8;width:min(100%,380px);flex:0 0 auto;background:#0b1020ee;color:#fff;border:2px solid #fbbf24;border-radius:12px;padding:6px;box-sizing:border-box;font-size:14px}',
    '.cc-panel.inline{margin:8px 0;max-width:460px;width:100%}',
    /* Màn hình ngang: dành hẳn một cột bên phải cho camera, nội dung câu hỏi co lại nhường chỗ */
    '@media(min-width:701px) and (min-aspect-ratio:1/1){.kc-stage.on.cc-dock{padding-right:calc(clamp(230px,22vw,380px) + 24px)!important}.kc-stage.on.cc-dock{min-height:380px}.kc-stage.cc-dock>.cc-panel{position:absolute;right:10px;top:10px;bottom:10px;margin:0;width:clamp(230px,22vw,380px);display:flex;flex-direction:column}.kc-stage.cc-dock>.cc-panel.min{bottom:auto}.kc-stage.cc-dock>.cc-panel canvas{flex:1 1 0;min-height:0;width:100%;max-height:none;margin:0}}',
    '.cc-hd{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}',
    '.cc-hd b{font-size:1em;line-height:1.25}',
    '.cc-b{background:#1b2347;color:#fff;border:1px solid #333f77;border-radius:8px;padding:2px 8px;font-size:15px;cursor:pointer;flex:none;min-height:0}',
    '.cc-panel canvas{display:block;border-radius:8px;background:#000;max-height:24vh;width:auto;max-width:100%;margin:0 auto}',
    '.cc-ct{margin-top:4px;font-weight:700;text-align:center;line-height:1.35}',
    '.cc-leg{margin-top:3px;font-size:.85em;opacity:.9;text-align:center;line-height:1.35}',
    '.cc-bar{height:6px;border-radius:4px;background:#ffffff33;margin-top:4px;overflow:hidden}.cc-bar i{display:block;height:100%;width:0;background:#fbbf24}',
    '.cc-panel.min canvas,.cc-panel.min .cc-ct,.cc-panel.min .cc-leg,.cc-panel.min .cc-bar{display:none}',
    '.cc-big{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:7;pointer-events:none;font-weight:900;color:#fff;font-size:clamp(90px,34vh,300px);text-shadow:0 6px 30px #000,0 0 40px #000}',
    '.cc-big.on{display:flex}.cc-big span{animation:ccPop .8s ease-out}',
    '@keyframes ccPop{from{transform:scale(2);opacity:0}to{transform:scale(1);opacity:1}}',
    '.kc-opt.cc-cand{outline:5px dashed #38bdf8;outline-offset:-3px}',
    '.kc-opt.cc-sel{outline:6px solid #fbbf24;outline-offset:-3px;box-shadow:0 0 22px #fbbf24}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- Giao diện cài đặt ---------- */
  var cfgBox = document.createElement('div');
  cfgBox.className = 'cc-cfg';
  cfgBox.innerHTML =
    '<label><input type="checkbox" id="ccOn"> 📷 <b>Chế độ Camera</b> (một học sinh lên bảng, giơ ngón tay để chọn đáp án)</label>' +
    '<div id="ccBox" style="display:none">' +
    '<div class="note"><b>Cử chỉ</b> (ngón cái gập, không tính): ' + LEG + ' &nbsp;·&nbsp; nắm tay = chưa chọn.</div>' +
    '<div class="bar"><label>⏱ Thời gian tối đa mỗi câu (giây) <input type="number" id="ccSecs" min="5" max="180" style="width:70px"></label>' +
    '<label>Giữ yên cử chỉ (giây) <input type="number" id="ccHold" min="0.5" max="5" step="0.5" style="width:60px"></label></div>' +
    '<div class="bar"><label>Chốt xong, hiện đáp án đúng sau (giây) <input type="number" id="ccRev" min="1" max="15" style="width:60px"></label>' +
    '<label>Rồi sang câu tiếp sau (giây) <input type="number" id="ccNext" min="2" max="30" style="width:60px"></label></div>' +
    '<div class="bar"><label><input type="checkbox" id="ccMirror"> Lật gương hình camera (khuyên bật)</label>' +
    '<button class="sec sm" id="ccTest" type="button">🎥 Thử camera</button></div>' +
    '<div class="note" id="ccMsg"></div>' +
    '<div class="note">Cách dùng: đặt camera ngang tầm ngực học sinh, cách khoảng 1–2 m, đủ sáng; học sinh giơ bàn tay <b>lòng bàn tay hướng về camera</b> và giữ yên. ' +
    'Đáp án đang được nhận sẽ có viền xanh nét đứt; giữ đủ thời gian thì viền vàng đặc là đã chốt. ' +
    'Chế độ <b>Ôn tập</b>: một em trả lời cho cả lớp. Chế độ <b>Kéo co</b>: em đội 1 đứng nửa trái, em đội 2 đứng nửa phải của khung hình (nên đặt thời gian ván từ 300 giây). ' +
    'Khi dùng camera, “Giây mỗi câu” của chế độ Ôn tập tự đặt về 0.</div>' +
    '</div>';
  modeBar.insertAdjacentElement('afterend', cfgBox);

  $('ccOn').checked = !!C.on; $('ccSecs').value = C.secs; $('ccHold').value = C.hold; $('ccRev').value = C.rev; $('ccNext').value = C.next; $('ccMirror').checked = !!C.mirror;
  function readCfg() {
    C.on = $('ccOn').checked; C.secs = num($('ccSecs').value, 5, 180, 30); C.hold = num($('ccHold').value, 0.5, 5, 1.5);
    C.rev = num($('ccRev').value, 1, 15, 3); C.next = num($('ccNext').value, 2, 30, 5); C.mirror = $('ccMirror').checked;
    $('ccBox').style.display = C.on ? '' : 'none'; save();
    if (!C.on && testing) toggleTest(false);
  }
  ['ccOn', 'ccSecs', 'ccHold', 'ccRev', 'ccNext', 'ccMirror'].forEach(function (id) { $(id).addEventListener('change', readCfg); });
  $('ccBox').style.display = C.on ? '' : 'none';

  /* ---------- Bảng camera (nằm trong màn hình chơi để vẫn thấy khi toàn màn hình) ---------- */
  var panel = document.createElement('div');
  panel.className = 'cc-panel inline'; panel.style.display = 'none';
  panel.innerHTML = '<div class="cc-hd"><b id="ccSt">📷</b><span><button class="cc-b" id="ccSkip" type="button" title="Bỏ qua, hiện đáp án luôn">⏭</button> <button class="cc-b" id="ccHold2" type="button" title="Tạm dừng đếm giờ / giữ câu hiện tại">⏸</button> <button class="cc-b" id="ccMin" type="button" title="Thu nhỏ">▾</button></span></div>' +
    '<canvas id="ccCv" width="480" height="270"></canvas><div class="cc-bar"><i id="ccPg"></i></div><div class="cc-ct" id="ccCt"></div><div class="cc-leg">' + LEG + '</div>';
  var big = document.createElement('div'); big.className = 'cc-big';
  var cv = panel.querySelector('#ccCv');
  $('ccBox').appendChild(panel);
  function undock() { rvEl.classList.remove('cc-dock'); kcSt.classList.remove('cc-dock'); }
  function place(parent) { undock(); parent.classList.add('cc-dock'); parent.appendChild(panel); parent.appendChild(big); panel.classList.remove('inline'); }
  function placeInline() { undock(); $('ccBox').appendChild(panel); panel.classList.add('inline'); if (big.parentNode) big.parentNode.removeChild(big); }
  panel.querySelector('#ccMin').onclick = function () { panel.classList.toggle('min'); };
  var hold = false;
  panel.querySelector('#ccHold2').onclick = function () { hold = !hold; this.textContent = hold ? '▶' : '⏸'; };
  panel.querySelector('#ccSkip').onclick = function () { if (S && S.p === 'select') S.skip = true; };

  /* ---------- Camera + nhận dạng bàn tay ---------- */
  var stream = null, camP = null, vid = document.createElement('video'), det = null, detP = null;
  var failed = '', raf = 0, lastDet = 0, hands = [], testing = false;
  vid.muted = true; vid.playsInline = true; vid.setAttribute('playsinline', '');
  vid.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(vid);

  function errMsg(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Chưa được cấp quyền camera. Bấm biểu tượng ổ khóa cạnh địa chỉ web và cho phép Camera.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Không tìm thấy camera.';
    return 'Không mở được camera' + (e && e.message ? ': ' + e.message : '.');
  }
  function mkDet(m, fs, delegate) {
    return m.HandLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: HAND, delegate: delegate }, runningMode: 'VIDEO', numHands: 2,
      minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
    });
  }
  function loadDet() {
    if (det) return Promise.resolve();
    if (detP) return detP;
    detP = import(CDN + '/vision_bundle.mjs').then(function (m) {
      return m.FilesetResolver.forVisionTasks(CDN + '/wasm').then(function (fs) {
        return mkDet(m, fs, 'GPU').catch(function () { return mkDet(m, fs, 'CPU'); }).then(function (d) { det = d; });
      });
    }).catch(function (e) {
      failed = 'Không tải được bộ nhận dạng bàn tay (máy cần có internet lần đầu). ' + (e && e.message ? e.message : '');
    }).then(function () { detP = null; });
    return detP;
  }
  function startCam() {
    failed = '';
    panel.style.display = '';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { failed = 'Trình duyệt không cho dùng camera (cần mở trang bằng https hoặc localhost).'; return; }
    if (!stream && !camP) {
      camP = navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function (s) { stream = s; vid.srcObject = s; return vid.play(); })
        .catch(function (e) { failed = errMsg(e); })
        .then(function () { camP = null; });
    }
    loadDet();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function stopCam() {
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null; camP = null; vid.srcObject = null;
    if (raf) cancelAnimationFrame(raf); raf = 0; hands = [];
    panel.style.display = 'none'; big.classList.remove('on');
  }
  function ready() { return !!(stream && det && vid.videoWidth && vid.readyState >= 2); }

  /* Đếm số ngón đang duỗi (không tính ngón cái): đầu ngón xa cổ tay hơn khớp giữa ngón → ngón duỗi. Không phụ thuộc hướng tay. */
  function countFingers(lm, ar) {
    function d(a, b) { var dx = (a.x - b.x) * ar, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
    var tips = [8, 12, 16, 20], pips = [6, 10, 14, 18], n = 0;
    for (var i = 0; i < 4; i++) if (d(lm[tips[i]], lm[0]) > d(lm[pips[i]], lm[0]) * 1.2) n++;
    return n;
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    var now = performance.now();
    if (ready() && now - lastDet >= 80) {
      lastDet = now;
      try {
        var r = det.detectForVideo(vid, now), ar = vid.videoWidth / vid.videoHeight, hs = [];
        (r.landmarks || []).forEach(function (lm) {
          var pts = lm.map(function (p) { return { x: C.mirror ? 1 - p.x : p.x, y: p.y }; });
          hs.push({ pts: pts, n: countFingers(lm, ar), cx: (pts[0].x + pts[9].x) / 2 });
        });
        hands = hs;
      } catch (e) {}
    }
    draw();
  }
  /* Đọc cử chỉ hiện tại của một "kênh": kênh 0 = nửa trái (hoặc cả khung nếu chỉ 1 kênh), kênh 1 = nửa phải. Trả về 0..3 (A..D) hoặc -1 */
  function reading(ch, chans) {
    var ns = [];
    hands.forEach(function (h) { if (chans === 1 || (ch === 0 ? h.cx < 0.5 : h.cx >= 0.5)) ns.push(h.n); });
    if (!ns.length) return -1;
    for (var i = 1; i < ns.length; i++) if (ns[i] !== ns[0]) return -1;
    return ns[0] >= 1 && ns[0] <= 4 ? ns[0] - 1 : -1;
  }
  var FILLQ = '(min-width:701px) and (min-aspect-ratio:1/1)';
  function draw() {
    if (!panel.offsetWidth || panel.classList.contains('min')) return;
    var fill = !panel.classList.contains('inline') && window.matchMedia && window.matchMedia(FILLQ).matches;
    var tw = 480, th = 270;
    if (fill && cv.clientWidth > 20 && cv.clientHeight > 20) { tw = Math.min(900, Math.round(cv.clientWidth)); th = Math.round(cv.clientHeight * tw / cv.clientWidth); }
    if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
    var w = cv.width, h = cv.height, g = cv.getContext('2d'), has = vid.videoWidth && vid.readyState >= 2;
    var sc = has ? Math.max(w / vid.videoWidth, h / vid.videoHeight) : 1, dw = has ? vid.videoWidth * sc : w, dh = has ? vid.videoHeight * sc : h, ox = (w - dw) / 2, oy = (h - dh) / 2;
    function PX(x) { return ox + x * dw; } function PY(y) { return oy + y * dh; }
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
    if (has) { g.save(); if (C.mirror) { g.translate(w, 0); g.scale(-1, 1); } g.drawImage(vid, ox, oy, dw, dh); g.restore(); }
    var fs = Math.max(12, Math.round(h * 0.07));
    if (chans() === 2) { g.strokeStyle = '#ffffffcc'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
      g.font = 'bold ' + fs + 'px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 4; g.fillText('Đội 1', w * 0.25, fs * 1.2); g.fillText('Đội 2', w * 0.75, fs * 1.2); g.shadowBlur = 0; }
    hands.forEach(function (hd) {
      var v = hd.n >= 1 && hd.n <= 4 ? hd.n - 1 : -1, col = v >= 0 ? CH[v] : '#ffffff';
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath();
      BONES.forEach(function (bn) { g.moveTo(PX(hd.pts[bn[0]].x), PY(hd.pts[bn[0]].y)); g.lineTo(PX(hd.pts[bn[1]].x), PY(hd.pts[bn[1]].y)); });
      g.stroke(); g.fillStyle = col;
      hd.pts.forEach(function (p) { g.beginPath(); g.arc(PX(p.x), PY(p.y), 3, 0, 6.3); g.fill(); });
      if (v >= 0) {
        g.font = 'bold ' + Math.round(h * 0.22) + 'px sans-serif'; g.textAlign = 'center'; g.shadowColor = '#000'; g.shadowBlur = 6; g.fillStyle = '#fff';
        g.fillText(LET.charAt(v), PX(hd.pts[9].x), Math.max(h * 0.25, PY(hd.pts[9].y) - h * 0.1)); g.shadowBlur = 0;
      }
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
  var S = null, vt = 0, lastT = Date.now(), kind = null, lastBig = -1;
  function chans() { return kind === 'keo' || (kind === null && testing && testMode() === 'keo') ? 2 : 1; }
  function newCh() { return { cand: -1, since: 0, lock: -1, buf: [] }; }
  function reset() { S = { p: null, key: '', dl: 0, pick: null, t: 0, revT: 0, msg: '', o: '', skip: false, ch: [newCh(), newCh()] }; lastBig = -1; }
  reset();
  function secs(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
  function begin(p) { S.p = p; S.dl = vt + C.secs * 1000; S.msg = ''; S.skip = false; S.pick = [-1, -1]; S.ch = [newCh(), newCh()]; }

  /* Mỗi 200ms: lấy mẫu cử chỉ, làm mượt (3/4 mẫu giống nhau), đếm thời gian giữ yên */
  function sample() {
    var n = chans();
    for (var i = 0; i < n; i++) {
      var c = S.ch[i], b = c.buf, cur = -1, v, cnt;
      b.push(reading(i, n)); if (b.length > 4) b.shift();
      for (v = 0; v < 4; v++) { cnt = b.filter(function (x) { return x === v; }).length; if (cnt >= 3) cur = v; }
      if (cur !== c.cand) { c.cand = cur; c.since = vt; }
      if (c.lock < 0 && cur >= 0 && vt - c.since >= C.hold * 1000) { c.lock = cur; S.pick[i] = cur; }
    }
  }
  function activeKind() {
    if (!C.on) return null;
    if (rvEl.classList.contains('on') && !$('kcRvOv').classList.contains('on')) return 'rv';
    if (kcSt.classList.contains('on') && !$('kcOv').classList.contains('on')) return 'keo';
    return null;
  }

  function stepRv() {
    var box = $('kcRvBox'), nm = box.querySelector('.kc-nm'), key = nm ? nm.textContent : '', opts = box.querySelectorAll('.kc-opt');
    var rev = !!box.querySelector('.kc-opt.ok'), pk = rev || !!box.querySelector('.kc-opt.bad'), o = rev ? 'rev' : (pk ? 'pick' : 'open');
    S.o = o; if (!opts.length) return;
    if (key !== S.key) {                               /* sang câu mới */
      S.key = key;
      if (o === 'open') begin('select'); else { S.p = 'post'; S.t = vt; S.revT = rev ? vt : 0; }
    } else if (S.p === 'select' && o !== 'open') {     /* cô tự bấm đáp án */
      S.p = 'post'; S.t = vt; S.revT = rev ? vt : 0;
    } else if (S.p === 'post' && o === 'open') {       /* cô bấm “Chọn lại” */
      begin('select');
    }
    if (S.p === 'select') {
      sample();
      if (S.pick[0] >= 0) { S.p = 'locked'; S.t = vt; beep(988, 0.25); }
      else if (S.skip || vt >= S.dl) {                 /* hết giờ / bỏ qua: hiện đáp án luôn */
        S.p = 'post'; S.t = vt; S.revT = 0; $('kcRvShow').click();
      }
    } else if (S.p === 'locked') {
      if (vt - S.t >= C.rev * 1000) { var ob = opts[S.pick[0]]; S.p = 'post'; S.t = vt; S.revT = 0; if (ob) ob.click(); }
    } else if (S.p === 'post') {
      if (o === 'rev') {
        if (!S.revT) S.revT = vt;
        if (!hold && vt - S.revT >= C.next * 1000) { S.p = 'adv'; $('kcRvNext').click(); }
      } else if (o === 'pick' && vt - S.t >= 1700) {   /* chọn sai: chờ nhạc buồn xong rồi hiện đáp án đúng */
        S.t = vt + 1e9; $('kcRvShow').click();
      }
    }
  }

  function keoBlocked() { return $('kcCd').classList.contains('on') || ($('kcPause').textContent || '').indexOf('▶') >= 0; }
  function stepKeo() {
    if (S.p === null) begin('select');
    if (S.p === 'select') {
      sample();
      var any = S.pick[0] >= 0 || S.pick[1] >= 0, all = S.pick[0] >= 0 && S.pick[1] >= 0;
      if (all || ((S.skip || vt >= S.dl) && any)) { S.p = 'locked'; S.t = vt; beep(988, 0.25); }
      else if (S.skip || vt >= S.dl) { S.dl = vt + 5000; S.skip = false; S.msg = 'Chưa nhận được cử chỉ nào, thêm 5 giây'; }
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
      if (vt - S.t >= 1600) begin('select');
    }
  }

  /* ---------- Hiển thị trạng thái, đáp án đang nhận / đã chốt ---------- */
  function paintBadges() {
    var boxes = kind === 'rv' ? [$('kcRvBox')] : [$('kcTB'), $('kcTR')];
    boxes.forEach(function (bx, t) {
      Array.prototype.forEach.call(bx.querySelectorAll('.kc-opt'), function (op, j) {
        var sel = (S.p === 'locked' || S.p === 'select') && S.pick && S.pick[t] === j;
        var cand = S.p === 'select' && S.ch[t] && S.ch[t].cand === j && S.ch[t].lock < 0;
        op.classList.toggle('cc-sel', !!sel); op.classList.toggle('cc-cand', !!cand);
      });
    });
  }
  function chText(i) {
    var c = S.ch[i];
    if (c.lock >= 0) return '🔒 ' + LET.charAt(c.lock);
    if (c.cand >= 0) return '✋ ' + LET.charAt(c.cand) + ' (giữ ' + Math.max(0, (C.hold - (vt - c.since) / 1000)).toFixed(1) + 's)';
    return '—';
  }
  function paintStatus() {
    var stx = $('ccSt'), ct = $('ccCt'), pg = $('ccPg'), txt = '', n = chans(), pr = 0, i;
    pg.style.width = '0';
    if (failed) { stx.textContent = '⚠ ' + failed; ct.innerHTML = ''; return; }
    if (!ready()) { stx.textContent = '⏳ Đang chuẩn bị camera và bộ nhận dạng…'; ct.innerHTML = ''; return; }
    if (hold) txt = '⏸ Đang giữ (bấm ▶ để tiếp tục)';
    else if (S.p === 'select') txt = '🙋 Giơ ngón tay để chọn · còn ' + secs(S.dl - vt) + 's' + (S.msg ? ' · ' + S.msg : '');
    else if (S.p === 'locked') txt = '🔒 ' + (kind === 'rv' ? 'Đã chọn ' + LET.charAt(S.pick[0])
      : 'Đội 1: ' + (S.pick[0] < 0 ? '—' : LET.charAt(S.pick[0])) + ' · Đội 2: ' + (S.pick[1] < 0 ? '—' : LET.charAt(S.pick[1]))) + ' · đáp án sau ' + secs(C.rev * 1000 - (vt - S.t)) + 's';
    else if (S.p === 'post' && S.o === 'rev' && S.revT) txt = '✅ Sang câu tiếp sau ' + secs(C.next * 1000 - (vt - S.revT)) + ' giây';
    else if (S.p === 'post') txt = '⏳ Đang hiện đáp án…';
    else if (S.p === 'after') txt = '⏳ Chuẩn bị câu tiếp…';
    else txt = '📷 Camera sẵn sàng';
    stx.textContent = txt;
    if (S.p === 'select') {
      ct.textContent = n === 1 ? chText(0) : 'Đội 1: ' + chText(0) + ' · Đội 2: ' + chText(1);
      for (i = 0; i < n; i++) if (S.ch[i].cand >= 0 && S.ch[i].lock < 0) pr = Math.max(pr, Math.min(1, (vt - S.ch[i].since) / (C.hold * 1000)));
      pg.style.width = Math.round(pr * 100) + '%';
    } else ct.textContent = '';
    var rem = S.p === 'locked' && !hold ? secs(C.rev * 1000 - (vt - S.t)) : 0;
    if (rem >= 1 && rem <= 3) {
      big.classList.add('on'); if (rem !== lastBig) { big.innerHTML = '<span>' + rem + '</span>'; beep(520, 0.1); }
    } else big.classList.remove('on');
    lastBig = rem;
  }
  function paintTest() {
    var n = chans(), parts = [], i, v;
    for (i = 0; i < n; i++) { v = reading(i, n); parts.push((n === 2 ? 'Đội ' + (i + 1) + ': ' : '') + (v >= 0 ? '✋ ' + LET.charAt(v) : '—')); }
    $('ccSt').textContent = failed ? '⚠ ' + failed : (ready() ? '🎥 Thử camera: thấy ' + hands.length + ' bàn tay' : '⏳ Đang chuẩn bị camera và bộ nhận dạng…');
    $('ccCt').textContent = failed || !ready() ? '' : parts.join(' · ');
    $('ccPg').style.width = '0';
    $('ccMsg').textContent = failed ? '' : (ready() ? 'Camera hoạt động. Giơ 1–4 ngón tay, chữ cái hiện trên bàn tay là đáp án máy nhận được.' : 'Lần đầu cần tải bộ nhận dạng (vài MB), vui lòng chờ…');
  }

  function testMode() { var r = document.querySelector('input[name="kcMode"]:checked'); return r && r.value === 'on' ? 'rv' : 'keo'; }
  function toggleTest(v) {
    testing = v; $('ccTest').textContent = v ? '⏹ Tắt thử camera' : '🎥 Thử camera';
    if (v) { placeInline(); hands = []; startCam(); }
    else { stopCam(); $('ccMsg').textContent = ''; }
  }
  $('ccTest').onclick = function () { toggleTest(!testing); };

  $('kcStart').addEventListener('click', function () {      /* bấm Bắt đầu: bật camera ngay trong thao tác của người dùng */
    if (!C.on) return;
    if (testMode() === 'rv') { var s = $('kcRvSecs'); if (s) s.value = 0; }
    startCam();
  }, true);

  function tick() {
    var now = Date.now(), dt = Math.min(1000, now - lastT); lastT = now;
    var k2 = activeKind();
    if (k2 !== kind) {
      kind = k2; reset(); vt = 0; hold = false; panel.querySelector('#ccHold2').textContent = '⏸';
      if (kind) { testing = false; $('ccTest').textContent = '🎥 Thử camera'; place(kind === 'rv' ? rvEl : kcSt); startCam(); }
      else { big.classList.remove('on'); if (!testing) { placeInline(); stopCam(); } }
    }
    if (!kind) { if (testing) paintTest(); return; }
    var blocked = !!failed || !ready() || (kind === 'keo' && keoBlocked());
    if (!hold && !blocked) vt += dt;
    if (!failed && ready() && !(kind === 'keo' && keoBlocked()) && !hold) { if (kind === 'rv') stepRv(); else stepKeo(); }
    paintStatus(); paintBadges();
  }
  setInterval(tick, 200);
})();
