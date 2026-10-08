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
    '.kc-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}',
    '.kc-top .kc-sp{flex:1}',
    '.kc-time{font-size:26px;font-weight:800;background:#151b34;border:1px solid #2a3360;border-radius:12px;padding:4px 16px;min-width:92px;text-align:center}',
    '.kc-time.low{color:#ff6b6b}',
    '.kc-chip{border-radius:999px;padding:5px 14px;font-weight:700;font-size:14px;border:1px solid}',
    '.kc-chip.b{background:#10265c;border-color:#3b82f6;color:#bcd4ff}',
    '.kc-chip.r{background:#4a1018;border-color:#ef4444;color:#ffc4c4}',
    '.kc-btn{background:#1b2347;color:#fff;border:1px solid #333f77;border-radius:10px;padding:7px 12px;font-size:14px;cursor:pointer}',
    '.kc-btn:hover{background:#26305f}',
    '.kc-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-areas:"f f" "b r";gap:10px}',
    '.kc-team{border-radius:14px;padding:10px;border:2px solid;display:flex;flex-direction:column;gap:8px;min-height:300px;box-sizing:border-box}',
    '.kc-team.b{grid-area:b}.kc-team.r{grid-area:r}',
    '.kc-team.b{border-color:#2563eb;background:#0f1a3d}',
    '.kc-team.r{border-color:#dc2626;background:#2a0f16}',
    '.kc-th{display:flex;justify-content:space-between;align-items:center;font-weight:800}',
    '.kc-th small{background:#ffffff1f;border-radius:8px;padding:2px 8px;font-size:12px}',
    '.kc-q{flex:1;border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-weight:800;font-size:clamp(18px,2.6vw,36px);line-height:1.45;min-height:110px;overflow-wrap:anywhere}',
    '.b .kc-q{background:linear-gradient(160deg,#1e3a9f,#1d4ed8)}',
    '.r .kc-q{background:linear-gradient(160deg,#9f1d1d,#dc2626)}',
    '.kc-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.kc-opt{background:#fff;color:#111;border:0;border-radius:12px;padding:12px 6px;font-weight:800;font-size:clamp(15px,1.8vw,24px);cursor:pointer;min-height:56px;position:relative}',
    '.kc-opt:active{transform:scale(.97)}',
    '.kc-opt i{position:absolute;left:8px;top:5px;font-size:11px;font-style:normal;opacity:.45}',
    '.kc-opt.ok{background:#22c55e;color:#fff}',
    '.kc-opt.bad{background:#ef4444;color:#fff}',
    '.kc-team.lock .kc-opt{pointer-events:none}',
    /* Sân kéo co: dải ngang thấp ở trên cùng, nhường chỗ cho câu hỏi */
    '.kc-field{grid-area:f;background:linear-gradient(180deg,#dbeafe 0,#eff6ff 58%,#cdb98c 58%,#b79f6f 100%);border-radius:14px;position:relative;overflow:hidden;height:clamp(124px,22vh,200px);color:#222;border:2px solid #334155;box-sizing:border-box}',
    '.kc-prog{position:absolute;left:0;right:0;top:0;height:9px;display:flex;background:#0003;z-index:2}',
    '.kc-prog i{display:block;height:100%;transition:width .45s ease}',
    '.kc-pb{background:#2563eb;width:50%}.kc-pr{background:#dc2626;width:50%}',
    '.kc-mid{position:absolute;left:50%;top:9px;bottom:0;border-left:3px dashed #16a34a;transform:translateX(-1.5px);opacity:.8}',
    '.kc-win{position:absolute;top:9px;bottom:0;width:0;border-left:4px solid}',
    '.kc-win.b{left:18%;border-color:#2563eb}.kc-win.r{left:82%;border-color:#dc2626}',
    '.kc-win small{position:absolute;top:4px;left:50%;transform:translateX(-50%);color:#fff;font-weight:800;font-size:11px;border-radius:6px;padding:1px 7px;white-space:nowrap}',
    '.kc-win.b small{background:#2563eb}.kc-win.r small{background:#dc2626}',
    '.kc-mover{position:absolute;top:47%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;transition:left .45s cubic-bezier(.3,1.4,.5,1);z-index:1}',
    '.kc-grp{font-size:clamp(22px,min(4.4vw,8vh),72px);letter-spacing:-5px;white-space:nowrap;line-height:1}',
    '.kc-grp.b{filter:drop-shadow(0 0 5px #2563eb)}',
    '.kc-grp.r{transform:scaleX(-1);filter:drop-shadow(0 0 5px #dc2626)}',
    '.kc-rope{height:8px;width:clamp(20px,5vw,90px);background:repeating-linear-gradient(90deg,#b08a4e 0 7px,#8a6a36 7px 14px);border-radius:6px}',
    '.kc-knot{width:18px;height:30px;background:#ef4444;border:3px solid #7f1d1d;border-radius:8px;box-shadow:0 2px 6px #0005;flex:none}',
    '.kc-info{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);background:#0f172ae6;color:#d1fae5;border-radius:999px;padding:3px 12px;font-size:12px;text-align:center;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis;z-index:2}',
    '.kc-ov{position:absolute;inset:0;background:#000b;border-radius:14px;display:none;align-items:center;justify-content:center;z-index:5}',
    '.kc-ov.on{display:flex}',
    '.kc-ovbox{background:#fff;color:#111;border-radius:20px;padding:26px 34px;text-align:center;max-width:90%}',
    '.kc-ovbox h2{margin:0 0 6px;font-size:clamp(22px,4vw,40px)}',
    '.kc-ovbox .bar{justify-content:center}',
    '.kc-setup textarea{width:100%;min-height:210px;font-family:inherit}',
    /* Công thức KaTeX trong câu hỏi / đáp án */
    '.kc-q .katex{font-size:1.12em}.kc-opt .katex{font-size:1.1em}',
    '.kc-opt{line-height:1.25;overflow-wrap:anywhere;font-family:inherit}',
    '.kc-sup{font-size:.75em;vertical-align:super}.kc-sub{font-size:.75em;vertical-align:sub}',
    /* Toàn màn hình: lấp đầy 100% khung hình, không để thừa nền đen phía dưới */
    '.kc-stage.on.fs{border-radius:0;padding:12px;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}',
    '.kc-stage.on.fs .kc-top{flex:0 0 auto}',
    '.kc-stage.on.fs .kc-grid{flex:1 1 auto;min-height:0;grid-template-rows:auto minmax(0,1fr)}',
    '@media(max-width:700px){.kc-stage.on.fs .kc-grid{grid-template-rows:auto minmax(0,1fr) minmax(0,1fr)}}',
    '.kc-stage.on.fs .kc-team{min-height:0;height:100%}',
    '.kc-stage.on.fs .kc-field{height:clamp(110px,21vh,230px)}',
    '.kc-stage.on.fs .kc-q{min-height:0;overflow:hidden;font-size:clamp(20px,min(3.4vw,6vh),60px)}',
    '.kc-stage.on.fs .kc-opts{flex:0 0 auto}',
    '.kc-stage.on.fs .kc-opt{min-height:clamp(60px,14vh,160px);font-size:clamp(16px,min(2.3vw,4.2vh),38px)}',
    '.kc-stage.on.fs .kc-info{font-size:clamp(12px,2vh,20px)}',
    '@media(max-width:700px){.kc-grid{grid-template-columns:1fr;grid-template-areas:"f" "b" "r"}.kc-team{min-height:0}}'
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

  /* ---------- Hiển thị công thức toán: $...$ , $$...$$ , \(...\) , \[...\] ---------- */
  var KATEX_V = '0.16.11', kxState = 0;
  function loadKatex() {
    if (window.katex || kxState) return;
    kxState = 1;
    var base = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/' + KATEX_V + '/';
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'katex.min.css'; document.head.appendChild(l);
    var sc = document.createElement('script'); sc.src = base + 'katex.min.js';
    sc.onload = function () { kxState = 2; if (phase !== 'setup' && teams.length) renderAll(); };
    sc.onerror = function () { kxState = 3; };
    document.head.appendChild(sc);
  }
  var TEX_SYM = { '\\times': '×', '\\cdot': '·', '\\div': '÷', '\\pm': '±', '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥', '\\neq': '≠', '\\ne': '≠',
    '\\approx': '≈', '\\infty': '∞', '\\pi': 'π', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\theta': 'θ', '\\Delta': 'Δ', '\\lambda': 'λ',
    '\\circ': '°', '\\to': '→', '\\rightarrow': '→', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔', '\\in': '∈', '\\cup': '∪', '\\cap': '∩', '\\subset': '⊂',
    '\\angle': '∠', '\\triangle': '△', '\\perp': '⊥', '\\parallel': '∥', '\\forall': '∀', '\\exists': '∃', '\\sum': 'Σ', '\\int': '∫', '\\vert': '|', '\\mid': '|' };
  var SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', 'n': 'ⁿ' };
  /* dự phòng khi chưa tải được KaTeX (mất mạng): vẫn đọc được, không hiện mã LaTeX thô */
  function texFallback(t) {
    t = String(t);
    for (var i = 0; i < 4; i++) t = t.replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    t = t.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, '$1√($2)').replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)').replace(/\\sqrt\s*(\w)/g, '√$1');
    t = t.replace(/\\(?:left|right)\s*/g, '').replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1');
    t = t.replace(/\\[a-zA-Z]+/g, function (m) { return TEX_SYM[m] !== undefined ? TEX_SYM[m] : m.slice(1); });
    t = t.replace(/\^\{([^{}]*)\}|\^(\w)/g, function (_, a, b) {
      var x = a !== undefined ? a : b; return /^[0-9+\-n]+$/.test(x) ? x.replace(/./g, function (c) { return SUPD[c]; }) : '\u0001' + x + '\u0002';
    });
    t = t.replace(/_\{([^{}]*)\}|_(\w)/g, function (_, a, b) { return '\u0003' + (a !== undefined ? a : b) + '\u0004'; });
    t = t.replace(/[{}]/g, '').replace(/\\,|\\;|\\!/g, ' ').replace(/\\\\/g, ' ');
    return esc(t).replace(/\u0001/g, '<span class="kc-sup">').replace(/\u0002/g, '</span>').replace(/\u0003/g, '<span class="kc-sub">').replace(/\u0004/g, '</span>');
  }
  function texHTML(t) {
    t = String(t).trim();
    if (window.katex) {
      try { return window.katex.renderToString('\\displaystyle ' + t, { throwOnError: false, output: 'html', displayMode: false, strict: false, trust: false }); } catch (e) {}
    }
    return texFallback(t);
  }
  var DELIM = '\\$\\$([\\s\\S]+?)\\$\\$|\\$([^$\\n]+?)\\$|\\\\\\(([\\s\\S]+?)\\\\\\)|\\\\\\[([\\s\\S]+?)\\\\\\]';
  var SUPC = { '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '¹': '1' };
  function scanArgs(t, j) {           /* đọc phần đối số sau lệnh LaTeX: {..}{..} [..] ^x _x */
    var n = t.length;
    for (;;) {
      var c = t.charAt(j);
      if (c === '{' || c === '[') {
        var open = c, close = c === '{' ? '}' : ']', d = 0, k = j;
        for (; k < n; k++) { if (t.charAt(k) === open) d++; else if (t.charAt(k) === close) { d--; if (d === 0) break; } }
        if (k >= n) return j; j = k + 1;
      } else if ((c === '^' || c === '_') && j + 1 < n) {
        if (t.charAt(j + 1) === '{') { j++; continue; }
        j += 2;
      } else return j;
    }
  }
  /* Đoạn chữ nằm ngoài $...$ mà có mã LaTeX (AI hay quên bọc $) → tự bọc */
  function fixGap(g) {
    if (g.indexOf('$') >= 0) return g;
    var hasCmd = /\\[a-zA-Z]{2,}/.test(g), hasCaret = /[A-Za-z0-9)\]]\s*\^\s*[-+{(\w]|[A-Za-z]_[{\d]/.test(g), hasUni = /[²³⁴⁵⁶⁷⁸⁹¹√]/.test(g);
    if (!hasCmd && !hasCaret && !hasUni) return g;
    var lead = g.match(/^\s*/)[0], trail = g.match(/\s*$/)[0], core = g.trim();
    if (!core) return g;
    var words = core.replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, ' ');
    if (!/[A-Za-z]{3,}/.test(words) && !/[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u1EF9]/.test(words)) {               /* toàn công thức → bọc cả đoạn */
      core = core.replace(/√\s*(\d+|\([^()]*\)|[A-Za-z])/g, function (_, a) { return '\\sqrt{' + a.replace(/^\(|\)$/g, '') + '}'; })
                 .replace(/([A-Za-z0-9)])([²³⁴⁵⁶⁷⁸⁹¹])/g, function (_, a, b) { return a + '^{' + SUPC[b] + '}'; });
      return lead + '$' + core + '$' + trail;
    }
    /* lẫn chữ và công thức → chỉ bọc từng cụm công thức */
    var o = '', i = 0, n = core.length, m;
    while (i < n) {
      var c = core.charAt(i);
      if (c === '\\' && /[a-zA-Z]/.test(core.charAt(i + 1))) {
        var j = i + 1; while (j < n && /[a-zA-Z]/.test(core.charAt(j))) j++;
        j = scanArgs(core, j); o += '$' + core.slice(i, j) + '$'; i = j; continue;
      }
      m = /^(?:[A-Za-z0-9]+|\([^()]*\))(?:\^\s*(?:\{[^{}]*\}|[-+]?\w+)|_\s*(?:\{[^{}]*\}|\w))+/.exec(core.slice(i));
      if (m && (i === 0 || !/[A-Za-z0-9]/.test(core.charAt(i - 1)))) { o += '$' + m[0] + '$'; i += m[0].length; continue; }
      m = /^[A-Za-z0-9]*[²³⁴⁵⁶⁷⁸⁹¹]/.exec(core.slice(i));
      if (m) { o += '$' + m[0].replace(/[²³⁴⁵⁶⁷⁸⁹¹]/, function (u) { return '^{' + SUPC[u] + '}'; }) + '$'; i += m[0].length; continue; }
      o += c; i++;
    }
    return lead + o.replace(/\$\$/g, '') + trail;
  }
  function autoMath(s) {
    s = String(s);
    var out = '', last = 0, m, re = new RegExp(DELIM, 'g');
    function add(piece) { if (out.slice(-1) === '$' && piece.charAt(0) === '$') out += ' '; out += piece; }
    while ((m = re.exec(s))) { add(fixGap(s.slice(last, m.index))); add(m[0]); last = re.lastIndex; }
    add(fixGap(s.slice(last)));
    return out;
  }
  function mathHTML(s) {
    s = autoMath(s);
    var out = '', last = 0, m, re = new RegExp(DELIM, 'g');
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index)) + texHTML(m[1] || m[2] || m[3] || m[4]);
      last = re.lastIndex;
    }
    return out + esc(s.slice(last));
  }
  loadKatex();

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
    '<div class="bar"><button class="ghost sm" id="kcAiDocBtn" type="button">📄 Chọn giáo án / tài liệu (.docx, .pdf, .pptx, .txt, ảnh)</button>' +
    '<span class="note" id="kcAiDocName"></span><button class="sec sm" id="kcAiDocClear" type="button" style="display:none">✕ Bỏ tài liệu</button>' +
    '<input type="file" id="kcAiDoc" accept=".docx,.pdf,.pptx,.txt,.md,image/*" hidden></div>' +
    '<div class="bar"><input id="kcAiTopic" placeholder="Yêu cầu thêm / chủ đề (không bắt buộc nếu đã chọn tài liệu)" style="flex:1;min-width:180px">' +
    '<label>Số câu <input type="number" id="kcAiN" value="10" min="3" max="30" style="width:64px"></label></div>' +
    '<div class="bar"><label>Model <select id="kcAiModel"><option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option><option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option><option value="gemini-3.8-flash">Gemini 3.8 Flash</option></select></label>' +
    '<button class="sm" id="kcAiBtn" type="button">✨ Tạo câu hỏi</button>' +
    '<label class="note"><input type="checkbox" id="kcAiAdd"> Nối thêm vào bộ hiện tại</label></div>' +
    '<div id="kcAiMsg" class="note"></div>' +
    '<div class="note">Có tài liệu: AI chỉ ra câu hỏi dựa trên nội dung tài liệu đó. Không có tài liệu: AI ra câu hỏi theo chủ đề đã nhập. Công thức Toán được hiển thị đúng khi chiếu.</div>' +
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
    '<div class="kc-field" id="kcField"><div class="kc-prog"><i class="kc-pb" id="kcPB"></i><i class="kc-pr" id="kcPR"></i></div>' +
    '<div class="kc-mid"></div><div class="kc-win b"><small>🏁 ĐÍCH</small></div><div class="kc-win r"><small>ĐÍCH 🏁</small></div>' +
    '<div class="kc-mover" id="kcMover"><span class="kc-grp b">🧑‍🎓🧑‍🎓</span><span class="kc-rope"></span><span class="kc-knot"></span><span class="kc-rope"></span><span class="kc-grp r">🧑‍🎓🧑‍🎓</span></div>' +
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
      '<div class="kc-q"><span>' + mathHTML(T.q.q) + '</span></div>' +
      '<div class="kc-opts">' + T.opts.map(function (o, j) {
        var c = T.mark && T.mark.j === j ? (T.mark.ok ? ' ok' : ' bad') : (T.mark && !T.mark.ok && o === T.q.ans ? ' ok' : '');
        return '<button type="button" class="kc-opt' + c + '" data-t="' + i + '" data-o="' + j + '">' + (keys[j] ? '<i>' + keys[j] + '</i>' : '') + '<span>' + mathHTML(o) + '</span></button>';
      }).join('') + '</div>';
    fitSoon();
  }
  /* Co chữ câu hỏi / đáp án dần cho tới khi hiện đủ trong khung (không bị cắt, không tràn) */
  function fit(box) {
    var q = box.querySelector('.kc-q'), btns = box.querySelectorAll('.kc-opt');
    if (!q || !btns.length) return;
    q.style.fontSize = ''; for (var i = 0; i < btns.length; i++) btns[i].style.fontSize = '';
    function over() {
      if (q.scrollHeight > q.clientHeight + 1 || q.scrollWidth > q.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1) return true;
      for (var k = 0; k < btns.length; k++) if (btns[k].scrollWidth > btns[k].clientWidth + 1 || btns[k].scrollHeight > btns[k].clientHeight + 1) return true;
      return false;
    }
    var qf = parseFloat(getComputedStyle(q).fontSize), of = parseFloat(getComputedStyle(btns[0]).fontSize);
    for (var n = 0; n < 16 && over(); n++) {
      qf = Math.max(12, qf * 0.9); of = Math.max(11, of * 0.92);
      q.style.fontSize = qf + 'px'; for (var j = 0; j < btns.length; j++) btns[j].style.fontSize = of + 'px';
      if (qf <= 12 && of <= 11) break;
    }
  }
  function fitAll() { if (phase === 'setup' || !el.stage.classList.contains('on')) return; fit(el.tb); fit(el.tr); }
  var fitTick = 0;
  function fitSoon() { cancelAnimationFrame(fitTick); fitTick = requestAnimationFrame(function () { fitTick = requestAnimationFrame(fitAll); }); }
  window.addEventListener('resize', fitSoon);

  function renderRope() {
    el.mover.style.left = (50 + pos * 32) + '%';
    $('kcPB').style.width = (50 - pos * 50) + '%'; $('kcPR').style.width = (50 + pos * 50) + '%';
    var pct = Math.round(Math.abs(pos) * 100);
    el.info.textContent = (pos === 0 ? '⚖ Cân bằng' : (pos < 0 ? '🔵 ' + teams[0].name : '🔴 ' + teams[1].name) + ' dẫn ' + pct + '%') +
      ' · mỗi câu đúng kéo ' + (step * 100).toFixed(0) + '% · kéo tới đích để thắng';
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
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    el.stage.classList.remove('fs'); el.stage.classList.remove('on'); el.setup.style.display = '';
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
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function syncFs() { el.stage.classList.toggle('fs', fsEl() === el.stage); fitSoon(); setTimeout(fitAll, 250); }
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  $('kcFull').onclick = function () {
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    else if (el.stage.requestFullscreen) el.stage.requestFullscreen();
    else if (el.stage.webkitRequestFullscreen) el.stage.webkitRequestFullscreen();
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

  /* ---------- Đọc giáo án / tài liệu ---------- */
  var aiDoc = null;               /* {name, text} hoặc {name, mime, b64} */
  var MAX_TEXT = 60000, MAX_BYTES = 14 * 1024 * 1024;
  var UNI2TEX = { '≤': '\\leq ', '≥': '\\geq ', '≠': '\\neq ', '×': '\\times ', '÷': '\\div ', '±': '\\pm ', '∞': '\\infty ', '≈': '\\approx ', '∈': '\\in ', '∉': '\\notin ',
    '∪': '\\cup ', '∩': '\\cap ', '⊂': '\\subset ', '→': '\\to ', '⇒': '\\Rightarrow ', '⇔': '\\Leftrightarrow ', '°': '^\\circ ', '∠': '\\angle ', '△': '\\triangle ', '⊥': '\\perp ',
    '∥': '\\parallel ', '·': '\\cdot ', '−': '-', '∑': '\\sum ', '∏': '\\prod ', '∫': '\\int ', '∮': '\\oint ', '√': '\\sqrt ', 'π': '\\pi ', 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ',
    'δ': '\\delta ', 'Δ': '\\Delta ', 'θ': '\\theta ', 'λ': '\\lambda ', 'μ': '\\mu ', 'φ': '\\varphi ', 'ω': '\\omega ', 'Ω': '\\Omega ', 'Σ': '\\Sigma ' };
  function uni2tex(t) { return String(t).replace(/[^\u0000-\u007f]/g, function (c) { return UNI2TEX[c] !== undefined ? UNI2TEX[c] : c; }).replace(/%/g, '\\%'); }

  /* Công thức Word (OMML) → LaTeX, để AI đọc đúng công thức trong giáo án */
  function omml2tex(root) {
    function kid(e, name) { for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeName === name) return c; return null; }
    function body(e) { var o = ''; for (var c = e.firstChild; c; c = c.nextSibling) o += node(c); return o; }
    function arg(e, name) { var k = kid(e, name); return k ? body(k) : ''; }
    function pr(e, prName, chrName) { var p = kid(e, prName), c = p && kid(p, chrName); return c ? c.getAttribute('m:val') : null; }
    var NARY = { '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint', '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap' };
    var ACC = { '\u0302': 'hat', '^': 'hat', '\u0303': 'tilde', '~': 'tilde', '\u20D7': 'vec', '→': 'vec', '\u0304': 'bar', '¯': 'bar', '\u0307': 'dot' };
    var DEL = { '{': '\\{', '}': '\\}', '⟨': '\\langle ', '⟩': '\\rangle ', '‖': '\\|', '⌊': '\\lfloor ', '⌋': '\\rfloor ', '⌈': '\\lceil ', '⌉': '\\rceil ', '': '.' };
    function node(e) {
      if (e.nodeType !== 1) return '';
      var n = e.nodeName;
      if (/Pr$/.test(n)) return '';
      switch (n) {
        case 'm:t': return uni2tex(e.textContent);
        case 'm:f': return '\\frac{' + arg(e, 'm:num') + '}{' + arg(e, 'm:den') + '}';
        case 'm:sSup': return '{' + arg(e, 'm:e') + '}^{' + arg(e, 'm:sup') + '}';
        case 'm:sSub': return '{' + arg(e, 'm:e') + '}_{' + arg(e, 'm:sub') + '}';
        case 'm:sSubSup': return '{' + arg(e, 'm:e') + '}_{' + arg(e, 'm:sub') + '}^{' + arg(e, 'm:sup') + '}';
        case 'm:sPre': return '{}_{' + arg(e, 'm:sub') + '}^{' + arg(e, 'm:sup') + '}{' + arg(e, 'm:e') + '}';
        case 'm:rad': var dg = arg(e, 'm:deg').trim(); return dg ? '\\sqrt[' + dg + ']{' + arg(e, 'm:e') + '}' : '\\sqrt{' + arg(e, 'm:e') + '}';
        case 'm:d':
          var bc = pr(e, 'm:dPr', 'm:begChr'), ec = pr(e, 'm:dPr', 'm:endChr'), sc = pr(e, 'm:dPr', 'm:sepChr');
          bc = bc === null ? '(' : bc; ec = ec === null ? ')' : ec; sc = sc === null ? '|' : sc;
          var parts = []; for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeName === 'm:e') parts.push(body(c));
          return '\\left' + (DEL[bc] !== undefined ? DEL[bc] : bc) + parts.join(sc === '|' ? '\\mid ' : sc) + '\\right' + (DEL[ec] !== undefined ? DEL[ec] : ec);
        case 'm:nary':
          var ch = pr(e, 'm:naryPr', 'm:chr'); ch = ch === null ? '∫' : ch;
          var sb = arg(e, 'm:sub').trim(), sp = arg(e, 'm:sup').trim();
          return (NARY[ch] || ch) + (sb ? '_{' + sb + '}' : '') + (sp ? '^{' + sp + '}' : '') + '{' + arg(e, 'm:e') + '}';
        case 'm:func':
          var fn = arg(e, 'm:fName').trim();
          return (/^(sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|arcsin|arccos|arctan|sup|inf)$/.test(fn) ? '\\' + fn : '\\operatorname{' + fn + '}') + ' ' + arg(e, 'm:e');
        case 'm:acc': var ac = pr(e, 'm:accPr', 'm:chr'); return '\\' + (ACC[ac === null ? '^' : ac] || 'hat') + '{' + arg(e, 'm:e') + '}';
        case 'm:bar': var pos = pr(e, 'm:barPr', 'm:pos'); return (pos === 'bot' ? '\\underline{' : '\\overline{') + arg(e, 'm:e') + '}';
        case 'm:limLow': return '\\underset{' + arg(e, 'm:lim') + '}{' + arg(e, 'm:e') + '}';
        case 'm:limUpp': return '\\overset{' + arg(e, 'm:lim') + '}{' + arg(e, 'm:e') + '}';
        case 'm:eqArr':
          var rows = []; for (var r = e.firstChild; r; r = r.nextSibling) if (r.nodeName === 'm:e') rows.push(body(r));
          return '\\begin{aligned}' + rows.join('\\\\ ') + '\\end{aligned}';
        case 'm:m':
          var mr = []; for (var q = e.firstChild; q; q = q.nextSibling) if (q.nodeName === 'm:mr') {
            var cells = []; for (var z = q.firstChild; z; z = z.nextSibling) if (z.nodeName === 'm:e') cells.push(body(z));
            mr.push(cells.join(' & '));
          }
          return '\\begin{matrix}' + mr.join('\\\\ ') + '\\end{matrix}';
        default: return body(e);
      }
    }
    return node(root);
  }

  function wordParaText(p) {
    var o = '';
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 1) continue;
        var nm = c.nodeName;
        if (nm === 'm:oMath') o += '$' + omml2tex(c).replace(/\s+/g, ' ').trim() + '$';
        else if (nm === 'w:t') o += c.textContent;
        else if (nm === 'w:tab') o += ' ';
        else if (nm === 'w:br') o += ' ';
        else if (nm === 'mc:Fallback' || nm === 'w:txbxContent' || nm === 'w:instrText') continue;
        else walk(c);
      }
    })(p);
    return o.replace(/\$\s*\$/g, '').replace(/\s+/g, ' ').trim();
  }
  function docxText(buf) {
    if (!window.JSZip) return Promise.reject(new Error('Chưa tải được thư viện đọc .docx.'));
    return JSZip.loadAsync(buf).then(function (z) {
      var f = z.file('word/document.xml'); if (!f) throw new Error('File .docx không hợp lệ.');
      return f.async('string');
    }).then(function (xml) {
      var d = new DOMParser().parseFromString(xml, 'application/xml'), lines = [];
      (function walk(n) {
        for (var c = n.firstChild; c; c = c.nextSibling) {
          if (c.nodeType !== 1) continue;
          if (c.nodeName === 'w:p') { var t = wordParaText(c); if (t) lines.push(t); } else walk(c);
        }
      })(d.documentElement);
      return lines.join('\n');
    });
  }
  function pptxText(buf) {
    if (!window.JSZip) return Promise.reject(new Error('Chưa tải được thư viện đọc .pptx.'));
    return JSZip.loadAsync(buf).then(function (z) {
      var names = Object.keys(z.files).filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n); })
        .sort(function (a, b) { return +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]; });
      return Promise.all(names.map(function (n, i) {
        return z.file(n).async('string').then(function (xml) {
          var d = new DOMParser().parseFromString(xml, 'application/xml'), ps = d.getElementsByTagName('a:p'), L = ['--- Slide ' + (i + 1) + ' ---'];
          for (var k = 0; k < ps.length; k++) {
            var ts = ps[k].getElementsByTagName('a:t'), t = '';
            for (var j = 0; j < ts.length; j++) t += ts[j].textContent;
            if (t.trim()) L.push(t.trim());
          }
          return L.join('\n');
        });
      })).then(function (a) { return a.join('\n'); });
    });
  }
  function readAs(f, how) {
    return new Promise(function (ok, no) {
      var rd = new FileReader(); rd.onload = function () { ok(rd.result); }; rd.onerror = function () { no(new Error('Không đọc được file.')); };
      how === 'buf' ? rd.readAsArrayBuffer(f) : how === 'url' ? rd.readAsDataURL(f) : rd.readAsText(f, 'utf-8');
    });
  }
  function loadDoc(f) {
    var n = f.name, m = $('kcAiMsg');
    if (f.size > MAX_BYTES) { m.textContent = '⚠ File quá lớn (tối đa 14 MB).'; return; }
    m.textContent = '⏳ Đang đọc ' + n + '...';
    var job;
    if (/\.docx$/i.test(n)) job = readAs(f, 'buf').then(docxText).then(function (t) { return { name: n, text: t }; });
    else if (/\.pptx$/i.test(n)) job = readAs(f, 'buf').then(pptxText).then(function (t) { return { name: n, text: t }; });
    else if (/\.(txt|md)$/i.test(n)) job = readAs(f, 'text').then(function (t) { return { name: n, text: t }; });
    else if (/\.pdf$/i.test(n) || /^image\//.test(f.type)) job = readAs(f, 'url').then(function (u) {
      return { name: n, mime: /\.pdf$/i.test(n) ? 'application/pdf' : f.type, b64: u.slice(u.indexOf(',') + 1) };
    });
    else if (/\.(doc|ppt)$/i.test(n)) { m.textContent = '⚠ File Word/PowerPoint đời cũ chưa đọc được. Hãy lưu lại thành .docx / .pptx hoặc xuất ra PDF.'; return; }
    else { m.textContent = '⚠ Định dạng này chưa hỗ trợ. Dùng .docx, .pdf, .pptx, .txt hoặc ảnh.'; return; }
    job.then(function (d) {
      if (d.text !== undefined) {
        d.text = d.text.trim();
        if (d.text.length < 30) throw new Error('Không đọc được chữ trong file (có thể giáo án là ảnh scan). Hãy xuất ra PDF hoặc chụp ảnh rồi chọn lại.');
        if (d.text.length > MAX_TEXT) { d.text = d.text.slice(0, MAX_TEXT); d.cut = true; }
      }
      aiDoc = d;
      $('kcAiDocName').textContent = '✓ ' + n + (d.text !== undefined ? ' (' + d.text.length.toLocaleString('vi-VN') + ' ký tự' + (d.cut ? ', đã cắt bớt phần cuối' : '') + ')' : '');
      $('kcAiDocClear').style.display = '';
      m.textContent = 'Đã nạp tài liệu. Bấm “Tạo câu hỏi” để AI ra câu hỏi theo nội dung này.';
    }).catch(function (e) { aiDoc = null; $('kcAiDocName').textContent = ''; m.textContent = '⚠ ' + (e && e.message ? e.message : 'Không đọc được file.'); });
  }
  $('kcAiDocBtn').onclick = function () { $('kcAiDoc').click(); };
  $('kcAiDoc').addEventListener('change', function () { var f = this.files[0]; this.value = ''; if (f) loadDoc(f); });
  $('kcAiDocClear').onclick = function () { aiDoc = null; $('kcAiDocName').textContent = ''; this.style.display = 'none'; $('kcAiMsg').textContent = ''; };

  /* ---------- Gọi Gemini ---------- */
  /* gọi 1 model; nếu quá tải / hết hạn mức / không có model thì thử model kế tiếp */
  function callGemini(models, i, parts, m) {
    var model = models[i];
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GKEY.get() },
      body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.6 } })
    }).then(function (r) {
      if (r.ok) return r.json();
      if ((r.status === 429 || r.status === 404 || r.status >= 500) && i + 1 < models.length) {
        m.textContent = '⏳ ' + model + ' đang bận, thử ' + models[i + 1] + '...';
        return callGemini(models, i + 1, parts, m);
      }
      throw new Error(r.status === 400 || r.status === 403 ? 'Key không hợp lệ, chưa được phép dùng, hoặc tài liệu không đọc được. Hãy kiểm tra lại key / file.' :
                      r.status === 413 ? 'Tài liệu quá lớn, hãy chọn file nhỏ hơn.' :
                      r.status === 429 ? 'Các model đều đã hết hạn mức, hãy thử lại sau ít phút.' : 'Lỗi từ Gemini (mã ' + r.status + ').');
    });
  }

  /* JSON do AI trả về hay thiếu dấu \ thứ hai trong công thức (\frac → \f bị hiểu thành ký tự điều khiển). Sửa trước khi parse. */
  function fixJson(t) {
    return t.replace(/(^|[^\\])\\(?!["\\\/]|u[0-9a-fA-F]{4})/g, '$1\\\\').replace(/(^|[^\\])\\(?!["\\\/]|u[0-9a-fA-F]{4})/g, '$1\\\\');
  }
  /* làm sạch 1 chuỗi; ký tự | là dấu ngăn cột nên trong công thức đổi thành \vert */
  function cleanCell(v) {
    v = autoMath(String(v).replace(/\s+/g, ' ').trim());
    return v.split('$').map(function (seg, i) { return seg.replace(/\|/g, i % 2 ? '\\vert ' : '/'); }).join('$');
  }

  $('kcAiBtn').onclick = function () {
    var m = $('kcAiMsg'), btn = $('kcAiBtn');
    var topic = $('kcAiTopic').value.trim(), n = Math.max(3, Math.min(30, +$('kcAiN').value || 10));
    if (!aiDoc && !topic) { m.textContent = 'Hãy chọn giáo án / tài liệu, hoặc nhập môn / chủ đề / lớp.'; return; }
    if (!window.GKEY || !GKEY.has()) {
      m.textContent = 'Chưa có API key Gemini. Hãy nhập key ở thanh phía trên trang.';
      if (window.GKEY) GKEY.open('Nhập key Gemini để tạo câu hỏi bằng AI.');
      return;
    }
    var first = $('kcAiModel').value;
    var models = [first].concat(AI_MODELS.filter(function (x) { return x !== first; }));
    var prompt = 'Bạn là giáo viên Việt Nam giàu kinh nghiệm. Hãy soạn đúng ' + n + ' câu hỏi trắc nghiệm ' +
      (aiDoc ? 'để ôn tập KIẾN THỨC TRỌNG TÂM của giáo án / tài liệu được cung cấp' + (topic ? ' (ưu tiên: "' + topic + '")' : '') + '. ' +
               'Trước hết tự xác định mục tiêu bài học và các kiến thức cốt lõi: khái niệm, định nghĩa, tính chất, công thức, quy tắc, định lí, phương pháp giải, dạng bài tiêu biểu. ' +
               'Chỉ ra câu hỏi về những kiến thức cốt lõi đó; nội dung nào được nhấn mạnh hoặc lặp lại nhiều thì ra nhiều câu hơn; các câu phải bao quát các phần chính, không dồn vào một chỗ. ' +
               'TUYỆT ĐỐI KHÔNG hỏi: thông tin hành chính (tên trường, lớp, năm học, ngày giờ, thời lượng, tên giáo viên, tên tác giả, tiêu đề đề thi), số liệu hoặc tên riêng chỉ là bối cảnh của ví dụ, chi tiết phụ, câu đố mẹo. ' +
               'Nếu tài liệu là đề thi / đề kiểm tra / bài tập thì hãy ra câu hỏi về chính kiến thức và kĩ năng mà các bài đó cần (không hỏi về bản thân đề). ' +
               'Mỗi câu phải tự đủ dữ kiện, không viết "theo tài liệu", "trong ví dụ trên". ' :
               'về chủ đề: "' + topic + '", tập trung vào kiến thức cốt lõi, không hỏi chi tiết lan man. ') +
      'YÊU CẦU NGẮN GỌN: câu hỏi tối đa 18 từ nhưng vẫn đủ ý; mỗi đáp án tối đa 6 từ hoặc một biểu thức ngắn. ' +
      'Mỗi câu có đúng 4 đáp án, chỉ 1 đáp án đúng, 3 đáp án nhiễu hợp lý (là lỗi học sinh hay mắc), vị trí đáp án đúng phân bố đều. Viết bằng tiếng Việt. ' +
      'QUY TẮC TOÁN HỌC: mọi công thức, biểu thức, số mũ, phân số, căn, phương trình, ký hiệu toán PHẢI viết bằng LaTeX đặt trong cặp dấu $...$ — KỂ CẢ trong từng đáp án (ví dụ đáp án phân số viết $\\frac{7}{6}$, không viết \\frac{7}{6} trần). ' +
      'Ví dụ: $x^2$, $\\frac{a}{b}$, $\\sqrt{3}$, $(a+b)^2$, $x \\leq 5$. Không dùng ký tự Unicode như ², √, ≤ trong công thức. Không dùng ký tự | trong công thức (dùng \\lvert, \\rvert). Phần chữ thường nằm ngoài dấu $. ' +
      'Vì kết quả là JSON nên mọi dấu gạch chéo ngược phải viết đôi (\\\\frac, \\\\sqrt, \\\\leq). ' +
      'Chỉ trả về một mảng JSON, mỗi phần tử có dạng {"q":"...","options":["...","...","...","..."],"answer":0} với answer là chỉ số (0-3) của đáp án đúng.';
    var parts;
    if (aiDoc && aiDoc.text !== undefined) parts = [{ text: prompt + '\n\n===== NỘI DUNG TÀI LIỆU (' + aiDoc.name + ') =====\n' + aiDoc.text }];
    else if (aiDoc) parts = [{ text: prompt + '\n\nTài liệu được đính kèm (' + aiDoc.name + ').' }, { inlineData: { mimeType: aiDoc.mime, data: aiDoc.b64 } }];
    else parts = [{ text: prompt }];
    btn.disabled = true; m.textContent = '⏳ Đang ' + (aiDoc ? 'đọc tài liệu và ' : '') + 'tạo câu hỏi bằng ' + first + '...';
    callGemini(models, 0, parts, m).then(function (d) {
      var ps = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts || [];
      var t = ps.filter(function (x) { return !x.thought; }).map(function (x) { return x.text || ''; }).join('');
      if (!t) throw new Error('AI không trả về nội dung. Hãy thử lại.');
      t = t.replace(/^\s*```(?:json)?|```\s*$/g, '').trim();
      var arr; try { arr = JSON.parse(t); } catch (e1) { arr = JSON.parse(fixJson(t)); }
      var lines = [];
      arr.forEach(function (x) {
        if (!x || !x.q || !x.options || x.options.length < 2 || x.answer == null) return;
        if (aiDoc && /năm học\s*\d{4}|khảo sát tháng|theo (tài liệu|đoạn văn|văn bản|bài đọc)|trong (ví dụ|đề|bài) (trên|này)|tên (trường|giáo viên)/i.test(x.q)) return;
        var opts = x.options.slice(0, 4).map(cleanCell);
        var a = typeof x.answer === 'number' ? x.answer : (/^\d$/.test(String(x.answer).trim()) ? +String(x.answer).trim() : 'ABCD'.indexOf(String(x.answer).trim().toUpperCase()));
        if (!(a >= 0 && a < opts.length)) return;
        lines.push(cleanCell(x.q) + ' | ' + opts.join(' | ') + ' | ' + 'ABCD'.charAt(a));
      });
      if (!lines.length) throw new Error('Không đọc được kết quả của AI. Hãy thử lại.');
      var cur = el.bank.value.trim();
      el.bank.value = ($('kcAiAdd').checked && cur ? cur + '\n' : '') + lines.join('\n');
      updCount();
      m.textContent = '✓ Đã tạo ' + lines.length + ' câu' + (aiDoc ? ' từ “' + aiDoc.name + '”' : '') + '. Hãy xem lại đáp án đúng trước khi chơi.';
    }).catch(function (e) {
      m.textContent = '⚠ ' + (e && e.message ? e.message : 'Không tạo được câu hỏi.');
    }).then(function () { btn.disabled = false; });
  };

  document.addEventListener('visibilitychange', function () { /* giữ nguyên đồng hồ khi chuyển tab */ });
})();
