/* camera-chon.js — Chế độ Camera cho "Kéo co & Ôn tập kiến thức"
   Học sinh đứng vào vùng A/B/C/D trước camera để chọn đáp án. Không sửa keo-co.js:
   file này chỉ đọc giao diện đang hiển thị và "bấm hộ" các nút (đáp án, Hiện đáp án, Câu tiếp).
   Nạp SAU keo-co.js:  <script src="camera-chon.js"></script>
   Nhận dạng người: MediaPipe ObjectDetector (tải từ CDN khi bật, chạy trong trình duyệt, không gửi hình đi đâu). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var rvEl = $('kcRv'), kcSt = $('kcStage'), modeBar = $('kcModeBar');
  if (!rvEl || !kcSt || !modeBar) { console.warn('camera-chon.js: cần nạp sau keo-co.js'); return; }

  /* ---------- Cấu hình ---------- */
  var LS = 'kc_cam_v1';
  var C = { on: false, secs: 15, rev: 3, next: 5, mirror: true, hide: true, model: 'lite0' };
  try { var sv = JSON.parse(localStorage.getItem(LS) || 'null'); if (sv) for (var k in sv) C[k] = sv[k]; } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify(C)); } catch (e) {} }
  function num(v, lo, hi, d) { v = parseFloat(v); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); }

  var VER = '0.10.14', CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VER;
  var GS = 'https://storage.googleapis.com/mediapipe-models/object_detector/';
  var MODELS = { lite0: GS + 'efficientdet_lite0/float16/1/efficientdet_lite0.tflite', lite2: GS + 'efficientdet_lite2/float16/1/efficientdet_lite2.tflite' };
  var ZC = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'], LET = 'ABCD';

  /* ---------- CSS ---------- */
  var st = document.createElement('style');
  st.textContent = [
    '.cc-cfg{border:1px solid #8885;border-radius:10px;padding:6px 10px;margin:8px 0}',
    /* Mặc định (điện thoại / màn hình dọc): bảng camera nằm DƯỚI cùng, không đè lên đáp án */
    '.cc-panel{position:relative;margin:8px auto 0;z-index:8;width:min(100%,380px);flex:0 0 auto;background:#0b1020ee;color:#fff;border:2px solid #fbbf24;border-radius:12px;padding:6px;box-sizing:border-box;font-size:14px}',
    '.cc-panel.inline{margin:8px 0;max-width:460px;width:100%}',
    /* Màn hình ngang: dành hẳn một cột bên phải cho camera, nội dung câu hỏi co lại nhường chỗ */
    '@media(min-width:701px) and (min-aspect-ratio:1/1){.kc-stage.on.cc-dock{padding-right:calc(clamp(230px,22vw,380px) + 24px)!important}.kc-stage.cc-dock>.cc-panel{position:absolute;right:10px;top:10px;margin:0;width:clamp(230px,22vw,380px)}}',
    '.cc-panel canvas{max-height:22vh;width:auto;max-width:100%;margin:0 auto}',
    '.cc-hd{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}',
    '.cc-hd b{font-size:1em;line-height:1.25}',
    '.cc-b{background:#1b2347;color:#fff;border:1px solid #333f77;border-radius:8px;padding:2px 8px;font-size:15px;cursor:pointer;flex:none;min-height:0}',
    '.cc-panel canvas{display:block;border-radius:8px;background:#000}',
    '.cc-ct{margin-top:4px;font-weight:700;text-align:center;line-height:1.35}',
    '.cc-panel.min canvas,.cc-panel.min .cc-ct{display:none}',
    '.cc-big{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:7;pointer-events:none;font-weight:900;color:#fff;font-size:clamp(90px,34vh,300px);text-shadow:0 6px 30px #000,0 0 40px #000}',
    '.cc-big.on{display:flex}.cc-big span{animation:ccPop .8s ease-out}',
    '@keyframes ccPop{from{transform:scale(2);opacity:0}to{transform:scale(1);opacity:1}}',
    '.kc-opt .cc-n{position:absolute;right:.5em;top:50%;transform:translateY(-50%);background:#111;color:#fff;border-radius:999px;padding:.05em .6em;font-size:.6em;font-weight:800;pointer-events:none;line-height:1.4}',
    '.kc-opt.cc-sel{outline:6px solid #fbbf24;outline-offset:-3px;box-shadow:0 0 22px #fbbf24}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- Giao diện cài đặt ---------- */
  var cfgBox = document.createElement('div');
  cfgBox.className = 'cc-cfg';
  cfgBox.innerHTML =
    '<label><input type="checkbox" id="ccOn"> 📷 <b>Chế độ Camera</b> (học sinh vận động: đứng vào vùng A / B / C / D để chọn đáp án)</label>' +
    '<div id="ccBox" style="display:none">' +
    '<div class="bar"><label>⏱ Giây để học sinh di chuyển <input type="number" id="ccSecs" min="5" max="120" style="width:70px"></label>' +
    '<label>Chốt xong, hiện đáp án đúng sau (giây) <input type="number" id="ccRev" min="1" max="15" style="width:60px"></label>' +
    '<label>Rồi sang câu tiếp sau (giây) <input type="number" id="ccNext" min="2" max="30" style="width:60px"></label></div>' +
    '<div class="bar"><label><input type="checkbox" id="ccMirror"> Lật gương hình camera (khuyên bật)</label>' +
    '<label><input type="checkbox" id="ccHide"> Ẩn số người ở mỗi đáp án cho đến khi chốt (tránh chạy theo đám đông)</label></div>' +
    '<div class="bar"><label>Độ nhận dạng <select id="ccModel"><option value="lite0">Nhanh (lite0)</option><option value="lite2">Chính xác hơn, nặng hơn (lite2)</option></select></label>' +
    '<button class="sec sm" id="ccTest" type="button">🎥 Thử camera</button></div>' +
    '<div class="note" id="ccMsg"></div>' +
    '<div class="note">Cách dùng: kẻ sàn thành 4 vùng A B C D từ trái sang phải đúng như hình camera trên màn hình (bấm “Thử camera” để căn). Đặt camera cao, nhìn bao quát lớp. ' +
    'Hết giờ di chuyển, vùng đông nhất là đáp án của cả lớp; hai vùng bằng nhau thì được thêm giờ. ' +
    'Chế độ <b>Ôn tập</b>: cả lớp chung một đáp án. Chế độ <b>Kéo co</b>: nửa trái camera là đội 1, nửa phải là đội 2, mỗi nửa chia 4 vùng A–D (nên đặt thời gian ván từ 300 giây). ' +
    'Khi dùng camera, “Giây mỗi câu” của chế độ Ôn tập tự đặt về 0.</div>' +
    '</div>';
  modeBar.insertAdjacentElement('afterend', cfgBox);

  $('ccOn').checked = !!C.on; $('ccSecs').value = C.secs; $('ccRev').value = C.rev; $('ccNext').value = C.next;
  $('ccMirror').checked = !!C.mirror; $('ccHide').checked = !!C.hide; $('ccModel').value = C.model;
  function readCfg() {
    C.on = $('ccOn').checked; C.secs = num($('ccSecs').value, 5, 120, 15); C.rev = num($('ccRev').value, 1, 15, 3); C.next = num($('ccNext').value, 2, 30, 5);
    C.mirror = $('ccMirror').checked; C.hide = $('ccHide').checked; C.model = $('ccModel').value;
    $('ccBox').style.display = C.on ? '' : 'none'; save();
    if (!C.on && testing) toggleTest(false);
  }
  ['ccOn', 'ccSecs', 'ccRev', 'ccNext', 'ccMirror', 'ccHide', 'ccModel'].forEach(function (id) { $(id).addEventListener('change', readCfg); });
  $('ccBox').style.display = C.on ? '' : 'none';

  /* ---------- Bảng camera (nằm trong màn hình chơi để vẫn thấy khi toàn màn hình) ---------- */
  var panel = document.createElement('div');
  panel.className = 'cc-panel inline'; panel.style.display = 'none';
  panel.innerHTML = '<div class="cc-hd"><b id="ccSt">📷</b><span><button class="cc-b" id="ccSkip" type="button" title="Chốt ngay">⏭</button> <button class="cc-b" id="ccHold" type="button" title="Tạm dừng đếm giờ / giữ câu hiện tại">⏸</button> <button class="cc-b" id="ccMin" type="button" title="Thu nhỏ">▾</button></span></div>' +
    '<canvas id="ccCv" width="480" height="270"></canvas><div class="cc-ct" id="ccCt"></div>';
  var big = document.createElement('div'); big.className = 'cc-big';
  var cv = panel.querySelector('#ccCv');
  $('ccBox').appendChild(panel);
  function undock() { rvEl.classList.remove('cc-dock'); kcSt.classList.remove('cc-dock'); }
  function place(parent) { undock(); parent.classList.add('cc-dock'); parent.appendChild(panel); parent.appendChild(big); panel.classList.remove('inline'); }
  function placeInline() { undock(); $('ccBox').appendChild(panel); panel.classList.add('inline'); if (big.parentNode) big.parentNode.removeChild(big); }
  panel.querySelector('#ccMin').onclick = function () { panel.classList.toggle('min'); };
  var hold = false;
  panel.querySelector('#ccHold').onclick = function () { hold = !hold; this.textContent = hold ? '▶' : '⏸'; };
  panel.querySelector('#ccSkip').onclick = function () { if (S && S.p === 'select') S.dl = vt; };

  /* ---------- Camera + bộ nhận dạng người ---------- */
  var stream = null, camP = null, vid = document.createElement('video'), det = null, detModel = '', detP = null;
  var failed = '', raf = 0, lastDet = 0, people = [], hist = [], nZ = 4, testing = false;
  vid.muted = true; vid.playsInline = true; vid.setAttribute('playsinline', '');
  vid.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(vid);

  function errMsg(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Chưa được cấp quyền camera. Bấm biểu tượng ổ khóa cạnh địa chỉ web và cho phép Camera.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Không tìm thấy camera.';
    return 'Không mở được camera' + (e && e.message ? ': ' + e.message : '.');
  }
  function mkDet(m, fs, key, delegate) {
    return m.ObjectDetector.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MODELS[key], delegate: delegate },
      scoreThreshold: 0.35, maxResults: 50, categoryAllowlist: ['person'], runningMode: 'VIDEO'
    });
  }
  function loadDet() {
    if (det && detModel === C.model) return Promise.resolve();
    if (detP) return detP;
    detP = import(CDN + '/vision_bundle.mjs').then(function (m) {
      return m.FilesetResolver.forVisionTasks(CDN + '/wasm').then(function (fs) {
        var key = C.model;
        return mkDet(m, fs, key, 'GPU')
          .catch(function () { return mkDet(m, fs, key, 'CPU'); })
          .catch(function (e) { if (key === 'lite0') throw e; key = 'lite0'; return mkDet(m, fs, key, 'CPU'); })
          .then(function (d) { if (det && det.close) { try { det.close(); } catch (e) {} } det = d; detModel = key; });
      });
    }).catch(function (e) {
      failed = 'Không tải được bộ nhận dạng người (máy cần có internet lần đầu). ' + (e && e.message ? e.message : '');
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
    if (raf) cancelAnimationFrame(raf); raf = 0; people = []; hist = [];
    panel.style.display = 'none'; big.classList.remove('on');
  }
  function ready() { return !!(stream && det && vid.videoWidth && vid.readyState >= 2); }

  function zoneOf(cx) { return Math.min(nZ - 1, Math.max(0, Math.floor(cx * nZ))); }
  function loop() {
    raf = requestAnimationFrame(loop);
    var now = performance.now();
    if (ready() && now - lastDet >= 120) {
      lastDet = now;
      try {
        var r = det.detectForVideo(vid, now), W = vid.videoWidth, H = vid.videoHeight, ps = [], cnt = [], i;
        (r.detections || []).forEach(function (d) {
          var b = d.boundingBox; if (!b) return;
          var x1 = b.originX / W, x2 = (b.originX + b.width) / W;
          if (C.mirror) { var t = 1 - x1; x1 = 1 - x2; x2 = t; }
          ps.push({ x1: x1, x2: x2, y1: b.originY / H, y2: (b.originY + b.height) / H, cx: (x1 + x2) / 2 });
        });
        for (i = 0; i < nZ; i++) cnt.push(0);
        ps.forEach(function (p) { cnt[zoneOf(p.cx)]++; });
        people = ps; hist.push(cnt); if (hist.length > 10) hist.shift();
      } catch (e) {}
    }
    draw();
  }
  function avg() {      /* số người trung bình mỗi vùng trong ~1,2 giây gần nhất */
    var a = [], i, j; for (i = 0; i < nZ; i++) a.push(0);
    if (!hist.length) return a;
    hist.forEach(function (c) { for (j = 0; j < nZ && j < c.length; j++) a[j] += c[j]; });
    return a.map(function (v) { return v / hist.length; });
  }
  function draw() {
    if (!panel.offsetWidth || panel.classList.contains('min')) return;
    var w = cv.width, h = cv.height, g = cv.getContext('2d'), zw = w / nZ, i;
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
    if (vid.videoWidth && vid.readyState >= 2) { g.save(); if (C.mirror) { g.translate(w, 0); g.scale(-1, 1); } g.drawImage(vid, 0, 0, w, h); g.restore(); }
    g.globalAlpha = 0.2; for (i = 0; i < nZ; i++) { g.fillStyle = ZC[i % 4]; g.fillRect(i * zw, 0, zw, h); } g.globalAlpha = 1;
    g.strokeStyle = '#ffffffaa'; g.lineWidth = 2;
    for (i = 1; i < nZ; i++) { g.lineWidth = (nZ === 8 && i === 4) ? 6 : 2; g.beginPath(); g.moveTo(i * zw, 0); g.lineTo(i * zw, h); g.stroke(); }
    g.font = 'bold ' + Math.round(h * 0.16) + 'px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 5;
    for (i = 0; i < nZ; i++) g.fillText(LET.charAt(i % 4), i * zw + zw / 2, h * 0.17);
    g.shadowBlur = 0; g.lineWidth = 3;
    people.forEach(function (p) {
      g.strokeStyle = ZC[zoneOf(p.cx) % 4];
      g.strokeRect(p.x1 * w, p.y1 * h, (p.x2 - p.x1) * w, (p.y2 - p.y1) * h);
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
  function reset() { S = { p: null, key: '', dl: 0, ties: 0, pick: null, snap: null, t: 0, revT: 0, msg: '', o: '' }; lastBig = -1; }
  reset();
  function secs(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
  function begin(p) { S.p = p; S.dl = vt + C.secs * 1000; S.msg = ''; }

  function activeKind() {
    if (!C.on) return null;
    if (rvEl.classList.contains('on') && !$('kcRvOv').classList.contains('on')) return 'rv';
    if (kcSt.classList.contains('on') && !$('kcOv').classList.contains('on')) return 'keo';
    return null;
  }
  function best(a, from, n) {       /* vùng đông nhất trong a[from .. from+n-1] */
    var tot = 0, mx = -1, i, near = [];
    for (i = 0; i < n; i++) { tot += a[from + i]; if (a[from + i] > mx) mx = a[from + i]; }
    for (i = 0; i < n; i++) if (a[from + i] >= mx - 0.5) near.push(i);
    return { total: tot, tie: near.length > 1, z: near[Math.floor(Math.random() * near.length)] };
  }

  function stepRv() {
    var box = $('kcRvBox'), nm = box.querySelector('.kc-nm'), key = nm ? nm.textContent : '', opts = box.querySelectorAll('.kc-opt');
    var rev = !!box.querySelector('.kc-opt.ok'), pk = rev || !!box.querySelector('.kc-opt.bad'), o = rev ? 'rev' : (pk ? 'pick' : 'open');
    S.o = o; if (!opts.length) return;
    if (key !== S.key) {                               /* sang câu mới */
      S.key = key; S.ties = 0; S.pick = null; S.snap = null;
      if (o === 'open') begin('select'); else { S.p = 'post'; S.t = vt; S.revT = rev ? vt : 0; }
    } else if (S.p === 'select' && o !== 'open') {     /* cô tự bấm đáp án */
      S.p = 'post'; S.t = vt; S.revT = rev ? vt : 0;
    } else if (S.p === 'post' && o === 'open') {       /* cô bấm “Chọn lại” */
      S.ties = 0; S.pick = null; S.snap = null; begin('select');
    }
    if (S.p === 'select') {
      if (vt >= S.dl) {
        var a = avg(), b = best(a, 0, 4);
        if (b.total < 0.5) { S.dl = vt + 5000; S.msg = 'Chưa thấy học sinh nào trong khung, thêm 5 giây'; }
        else if (b.tie && S.ties < 2) { S.ties++; S.dl = vt + 4000; S.msg = 'Hai vùng đang hòa, thêm 4 giây'; }
        else { S.pick = b.z; S.snap = a.slice(); S.p = 'locked'; S.t = vt; beep(988, 0.25); }
      }
    } else if (S.p === 'locked') {
      if (vt - S.t >= C.rev * 1000) { var ob = opts[S.pick]; S.p = 'post'; S.t = vt; S.revT = 0; if (ob) ob.click(); }
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
      if (vt >= S.dl) {
        var a = avg(), b0 = best(a, 0, 4), b1 = best(a, 4, 4);
        if (b0.total + b1.total < 0.5) { S.dl = vt + 5000; S.msg = 'Chưa thấy học sinh nào trong khung, thêm 5 giây'; }
        else if (((b0.total >= 0.5 && b0.tie) || (b1.total >= 0.5 && b1.tie)) && S.ties < 1) { S.ties++; S.dl = vt + 3000; S.msg = 'Có vùng đang hòa, thêm 3 giây'; }
        else { S.pick = [b0.total < 0.5 ? -1 : b0.z, b1.total < 0.5 ? -1 : b1.z]; S.snap = a.slice(); S.p = 'locked'; S.t = vt; beep(988, 0.25); }
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
      if (vt - S.t >= 1600) { S.ties = 0; S.pick = null; S.snap = null; begin('select'); }
    }
  }

  /* ---------- Hiển thị trạng thái, số người, vùng được chọn ---------- */
  function countsHTML(a) {
    var out = [], i;
    for (i = 0; i < nZ; i++) {
      if (nZ === 8 && i === 4) out.push('<br>');
      out.push('<span style="color:' + ZC[i % 4] + '">' + LET.charAt(i % 4) + ' ' + Math.round(a[i]) + '</span>');
    }
    return out.join(' · ').replace(/ · <br> · /, '<br>');
  }
  function paintBadges() {
    var boxes = kind === 'rv' ? [$('kcRvBox')] : [$('kcTB'), $('kcTR')];
    var shown = S.p === 'locked' || S.p === 'post' || S.p === 'after' || S.p === 'adv' || (!C.hide && S.p === 'select');
    var a = S.snap || avg();
    boxes.forEach(function (bx, t) {
      var opts = bx.querySelectorAll('.kc-opt');
      Array.prototype.forEach.call(opts, function (op, j) {
        var z = (kind === 'keo' ? t * 4 : 0) + j, nb = op.querySelector('.cc-n');
        if (shown && z < a.length) {
          if (!nb) { nb = document.createElement('b'); nb.className = 'cc-n'; op.appendChild(nb); }
          nb.textContent = '👥 ' + Math.round(a[z]);
        } else if (nb) nb.remove();
        var sel = S.p === 'locked' && ((kind === 'rv' && S.pick === j) || (kind === 'keo' && S.pick && S.pick[t] === j));
        op.classList.toggle('cc-sel', !!sel);
      });
    });
  }
  function paintStatus() {
    var stx = $('ccSt'), ct = $('ccCt'), a = avg(), tot = 0, i, txt = '';
    for (i = 0; i < a.length; i++) tot += a[i];
    if (failed) { stx.textContent = '⚠ ' + failed; ct.innerHTML = ''; return; }
    if (!ready()) { stx.textContent = '⏳ Đang chuẩn bị camera và bộ nhận dạng…'; ct.innerHTML = ''; return; }
    if (hold) txt = '⏸ Đang giữ (bấm ▶ để tiếp tục)';
    else if (S.p === 'select') txt = '🏃 Chọn đáp án: ' + secs(S.dl - vt) + ' giây' + (S.msg ? ' · ' + S.msg : '');
    else if (S.p === 'locked') {
      txt = '🔒 ' + (kind === 'rv' ? 'Cả lớp chọn ' + LET.charAt(S.pick) + ' (' + Math.round(S.snap[S.pick]) + ' bạn)'
        : 'Đội 1: ' + (S.pick[0] < 0 ? '—' : LET.charAt(S.pick[0])) + ' · Đội 2: ' + (S.pick[1] < 0 ? '—' : LET.charAt(S.pick[1]))) + ' · đáp án sau ' + secs(C.rev * 1000 - (vt - S.t)) + 's';
    } else if (S.p === 'post' && S.o === 'rev' && S.revT) txt = '✅ Sang câu tiếp sau ' + secs(C.next * 1000 - (vt - S.revT)) + ' giây';
    else if (S.p === 'post') txt = '⏳ Đang hiện đáp án…';
    else if (S.p === 'after') txt = '⏳ Chuẩn bị câu tiếp…';
    else txt = '📷 Camera sẵn sàng';
    stx.textContent = txt;
    ct.innerHTML = (S.p === 'select' && C.hide) ? '👥 ' + Math.round(tot) + ' bạn trong khung' : countsHTML(S.snap && S.p !== 'select' ? S.snap : a);
    var rem = S.p === 'select' && !hold ? secs(S.dl - vt) : 0;
    if (rem >= 1 && rem <= 3) {
      big.classList.add('on'); if (rem !== lastBig) { big.innerHTML = '<span>' + rem + '</span>'; beep(520, 0.1); }
    } else big.classList.remove('on');
    lastBig = rem;
  }
  function paintTest() {
    var a = avg(), tot = 0, i; for (i = 0; i < a.length; i++) tot += a[i];
    $('ccSt').textContent = failed ? '⚠ ' + failed : (ready() ? '🎥 Thử camera: thấy ' + Math.round(tot) + ' người' : '⏳ Đang chuẩn bị camera và bộ nhận dạng…');
    $('ccCt').innerHTML = failed || !ready() ? '' : countsHTML(a);
    $('ccMsg').textContent = failed ? '' : (ready() ? 'Camera hoạt động. Bước vào các vùng màu để kiểm tra; ô viền màu là người được nhận dạng.' : 'Lần đầu cần tải bộ nhận dạng (vài MB), vui lòng chờ…');
  }

  function testMode() { var r = document.querySelector('input[name="kcMode"]:checked'); return r && r.value === 'on' ? 'rv' : 'keo'; }
  function toggleTest(v) {
    testing = v; $('ccTest').textContent = v ? '⏹ Tắt thử camera' : '🎥 Thử camera';
    if (v) { placeInline(); hist = []; nZ = testMode() === 'rv' ? 4 : 8; startCam(); }
    else { stopCam(); $('ccMsg').textContent = ''; }
  }
  $('ccTest').onclick = function () { toggleTest(!testing); };
  Array.prototype.forEach.call(document.getElementsByName('kcMode'), function (r) {
    r.addEventListener('change', function () { if (testing) { nZ = testMode() === 'rv' ? 4 : 8; hist = []; } });
  });

  $('kcStart').addEventListener('click', function () {      /* bấm Bắt đầu: bật camera ngay trong thao tác của người dùng */
    if (!C.on) return;
    if (testMode() === 'rv') { var s = $('kcRvSecs'); if (s) s.value = 0; }
    startCam();
  }, true);

  function tick() {
    var now = Date.now(), dt = Math.min(1000, now - lastT); lastT = now;
    var k2 = activeKind();
    if (k2 !== kind) {
      kind = k2; reset(); hist = []; vt = 0; hold = false; panel.querySelector('#ccHold').textContent = '⏸';
      if (kind) { testing = false; $('ccTest').textContent = '🎥 Thử camera'; nZ = kind === 'rv' ? 4 : 8; place(kind === 'rv' ? rvEl : kcSt); startCam(); }
      else { big.classList.remove('on'); if (!testing) { placeInline(); stopCam(); } }
    }
    if (!kind) { if (testing) paintTest(); return; }
    var blocked = !!failed || !ready() || (kind === 'keo' && keoBlocked());
    if (!hold && !blocked) vt += dt;
    if (!failed && ready() && !(kind === 'keo' && keoBlocked())) { if (kind === 'rv') stepRv(); else stepKeo(); }
    paintStatus(); paintBadges();
  }
  setInterval(tick, 200);
})();
