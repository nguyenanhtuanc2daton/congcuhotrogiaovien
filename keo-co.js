/* keo-co.js — Trò chơi "Kéo co kiến thức" cho tab Công cụ thường dùng
   Mount vào #kcRoot. CSS tự chèn, mọi class đều có tiền tố .kc- nên không đụng style.css. */
(function () {
  'use strict';
  var root = document.getElementById('kcRoot');
  if (!root) return;

  var LS = 'kc_cfg_v1';
  /* Bộ mẫu: [câu hỏi, A, B, C, D, đáp án đúng]. Công thức Toán viết LaTeX trong $...$ */
  var SAMPLE_HEAD = ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)'];
  var SAMPLE_ROWS = [
    ['Khai triển $(a+b)^2$ bằng gì?', '$a^2+2ab+b^2$', '$a^2+b^2$', '$a^2-2ab+b^2$', '$a^2+ab+b^2$', 'A'],
    ['Hằng đẳng thức hiệu hai bình phương là?', '$(a-b)^2$', '$(a+b)(a-b)$', '$a^2+b^2$', '$(a+b)^2$', 'B'],
    ['Căn bậc hai số học của 49 là?', '5', '6', '8', '7', 'D'],
    ['Nghiệm của phương trình $2x-6=0$ là?', '$x=-3$', '$x=3$', '$x=6$', '$x=12$', 'B'],
    ['Biệt thức $\\Delta$ của $x^2-5x+6=0$ bằng?', '$1$', '$25$', '$49$', '$11$', 'A'],
    ['Nghiệm của $x^2-5x+6=0$ là?', '$x=1$ hoặc $x=6$', '$x=-2$ hoặc $x=-3$', '$x=2$ hoặc $x=3$', '$x=5$ hoặc $x=6$', 'C'],
    ['Rút gọn phân số $\\frac{6}{8}$ được?', '$\\frac{2}{3}$', '$\\frac{3}{4}$', '$\\frac{4}{3}$', '$\\frac{1}{2}$', 'B'],
    ['Tính $\\frac{1}{2}+\\frac{1}{3}$', '$\\frac{2}{5}$', '$\\frac{1}{5}$', '$\\frac{5}{6}$', '$\\frac{1}{6}$', 'C'],
    ['Tam giác vuông có hai cạnh góc vuông 3 và 4. Cạnh huyền bằng?', '5', '6', '7', '12', 'A'],
    ['Giá trị của $\\sin 30^\\circ$ là?', '$\\frac{\\sqrt{3}}{2}$', '$\\frac{1}{2}$', '$1$', '$\\frac{\\sqrt{2}}{2}$', 'B'],
    ['Hàm số $y=2x-1$ có giá trị bao nhiêu khi $x=3$?', '5', '6', '7', '4', 'A'],
    ['Diện tích hình tròn bán kính $r$ là?', '$2\\pi r$', '$\\pi r^2$', '$\\pi r$', '$2\\pi r^2$', 'B'],
    ['Tổng ba góc của một tam giác bằng?', '$360^\\circ$', '$90^\\circ$', '$270^\\circ$', '$180^\\circ$', 'D'],
    ['Giá trị của $2^3$ là?', '6', '9', '8', '5', 'C'],
    ['Giá trị của $\\lvert -5 \\rvert$ là?', '$-5$', '$5$', '$0$', '$\\frac{1}{5}$', 'B']
  ];
  var SAMPLE = SAMPLE_ROWS.map(function (r) { return r.join(' | '); }).join('\n');

  /* ---------- CSS ---------- */
  var st = document.createElement('style');
  st.textContent = [
    '.kc-stage{display:none;background:#0b1020;color:#fff;border-radius:14px;padding:10px;position:relative;--kb1:#2563eb;--kb2:#0f1a3d;--kb3:#1e3a9f;--kb4:#10265c;--kb5:#bcd4ff;--kr1:#dc2626;--kr2:#2a0f16;--kr3:#9f1d1d;--kr4:#4a1018;--kr5:#ffc4c4;--kc-fs:1}',
    '.kc-stage.on{display:block}',
    '.kc-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}',
    '.kc-top .kc-sp{flex:1}',
    '.kc-time{font-size:26px;font-weight:800;background:#151b34;border:1px solid #2a3360;border-radius:12px;padding:4px 16px;min-width:92px;text-align:center}',
    '.kc-time.low{color:#ff6b6b}',
    '.kc-chip{border-radius:999px;padding:5px 14px;font-weight:700;font-size:14px;border:1px solid}',
    '.kc-chip.b{background:var(--kb4);border-color:var(--kb1);color:var(--kb5)}',
    '.kc-chip.r{background:var(--kr4);border-color:var(--kr1);color:var(--kr5)}',
    '.kc-btn{background:#1b2347;color:#fff;border:1px solid #333f77;border-radius:10px;padding:7px 12px;font-size:14px;cursor:pointer}',
    '.kc-btn:hover{background:#26305f}',
    '.kc-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-areas:"f f" "b r";gap:10px}',
    '.kc-team{border-radius:14px;padding:10px;border:2px solid;display:flex;flex-direction:column;gap:8px;min-height:300px;box-sizing:border-box}',
    '.kc-team.b{grid-area:b}.kc-team.r{grid-area:r}',
    '.kc-team.b{border-color:var(--kb1);background:var(--kb2)}',
    '.kc-team.r{border-color:var(--kr1);background:var(--kr2)}',
    '.kc-th{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px 8px;font-weight:800}',
    '.kc-th small{background:#ffffff1f;border-radius:8px;padding:2px 8px;font-size:12px}',
    '.kc-q{flex:1;border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-weight:800;font-size:calc(clamp(18px,2.6vw,36px)*var(--kc-fs,1));line-height:1.45;min-height:110px;overflow-wrap:anywhere}',
    '.b .kc-q{background:linear-gradient(160deg,var(--kb3),var(--kb1))}',
    '.r .kc-q{background:linear-gradient(160deg,var(--kr3),var(--kr1))}',
    '.kc-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.kc-opt{background:#fff;color:#111;border:0;border-radius:12px;padding:12px 6px;font-weight:800;font-size:calc(clamp(15px,1.8vw,24px)*var(--kc-fs,1));cursor:pointer;min-height:56px;position:relative}',
    '.kc-opt:active{transform:scale(.97)}',
    '.kc-opt i{position:absolute;left:8px;top:5px;font-size:11px;font-style:normal;opacity:.45}',
    '.kc-opt.ok{background:#22c55e;color:#fff}',
    '.kc-opt.bad{background:#ef4444;color:#fff}',
    '.kc-team.lock .kc-opt{pointer-events:none}',
    /* Sân kéo co: dải ngang thấp ở trên cùng, nhường chỗ cho câu hỏi */
    '.kc-field{grid-area:f;background:linear-gradient(180deg,#dbeafe 0,#eff6ff 58%,#cdb98c 58%,#b79f6f 100%);border-radius:14px;position:relative;overflow:hidden;height:clamp(124px,22vh,200px);color:#222;border:2px solid #334155;box-sizing:border-box}',
    '.kc-prog{position:absolute;left:0;right:0;top:0;height:9px;display:flex;background:#0003;z-index:2}',
    '.kc-prog i{display:block;height:100%;transition:width .45s ease}',
    '.kc-pb{background:var(--kb1);width:50%}.kc-pr{background:var(--kr1);width:50%}',
    '.kc-mid{position:absolute;left:50%;top:9px;bottom:0;border-left:3px dashed #16a34a;transform:translateX(-1.5px);opacity:.8}',
    '.kc-win{position:absolute;top:9px;bottom:0;width:0;border-left:4px solid}',
    '.kc-win.b{left:18%;border-color:var(--kb1)}.kc-win.r{left:82%;border-color:var(--kr1)}',
    '.kc-win small{position:absolute;top:4px;left:50%;transform:translateX(-50%);color:#fff;font-weight:800;font-size:11px;border-radius:6px;padding:1px 7px;white-space:nowrap}',
    '.kc-win.b small{background:var(--kb1)}.kc-win.r small{background:var(--kr1)}',
    '.kc-mover{position:absolute;top:47%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;transition:left .45s cubic-bezier(.3,1.4,.5,1);z-index:1}',
    '.kc-grp{font-size:clamp(22px,min(4.4vw,8vh),72px);letter-spacing:-5px;white-space:nowrap;line-height:1}',
    '.kc-grp.b{filter:drop-shadow(0 0 5px var(--kb1))}',
    '.kc-grp.r{transform:scaleX(-1);filter:drop-shadow(0 0 5px var(--kr1))}',
    '.kc-rope{height:8px;width:clamp(20px,5vw,90px);background:repeating-linear-gradient(90deg,#b08a4e 0 7px,#8a6a36 7px 14px);border-radius:6px}',
    '.kc-knot{width:18px;height:30px;background:#ef4444;border:3px solid #7f1d1d;border-radius:8px;box-shadow:0 2px 6px #0005;flex:none}',
    '.kc-info{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);background:#0f172ae6;color:#d1fae5;border-radius:999px;padding:3px 12px;font-size:12px;text-align:center;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis;z-index:2}',
    '.kc-ov{position:absolute;inset:0;background:#000b;border-radius:14px;display:none;align-items:center;justify-content:center;z-index:5}',
    '.kc-ov.on{display:flex}',
    '.kc-ovbox{background:#fff;color:#111;border-radius:20px;padding:26px 34px;text-align:center;max-width:90%;max-height:92%;overflow:auto;box-sizing:border-box}',
    '.kc-ovbox h2{margin:0 0 6px;font-size:clamp(22px,4vw,40px)}',
    '.kc-ovbox .bar{justify-content:center}',
    '.kc-setup textarea{width:100%;min-height:210px;font-family:inherit}',
    '.kc-fire{background:#f59e0b!important;color:#111!important;font-weight:800}',
    '.kc-time.gold{color:#fbbf24;animation:kcPulse .7s ease-in-out infinite alternate}',
    '.kc-field.gold{box-shadow:inset 0 0 0 3px #fbbf24,inset 0 0 22px #fbbf2488}',
    '@keyframes kcPulse{from{transform:scale(1)}to{transform:scale(1.1)}}',
    '.kc-pop{position:absolute;top:24%;transform:translateX(-50%);font-weight:900;font-size:clamp(15px,3vh,30px);color:#fff;padding:2px 12px;border-radius:999px;pointer-events:none;z-index:3;animation:kcPop .95s ease-out forwards;white-space:nowrap}',
    '.kc-pop.b{background:var(--kb1)}.kc-pop.r{background:var(--kr1)}.kc-pop.x{background:#475569}',
    '@keyframes kcPop{0%{opacity:0;transform:translate(-50%,12px) scale(.6)}20%{opacity:1;transform:translate(-50%,0) scale(1.12)}100%{opacity:0;transform:translate(-50%,-28px) scale(1)}}',
    '.kc-cd{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#000a;border-radius:14px;z-index:6;font-weight:900;color:#fff;font-size:clamp(70px,24vh,220px);text-shadow:0 6px 30px #000}',
    '.kc-cd.on{display:flex}.kc-cd span{animation:kcCd .7s ease-out}',
    '@keyframes kcCd{from{transform:scale(2);opacity:0}to{transform:scale(1);opacity:1}}',
    '.kc-cf{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:14px}',
    '.kc-ovbox{position:relative;z-index:1}',
    /* Công thức KaTeX trong câu hỏi / đáp án */
    '.kc-q .katex{font-size:1.12em}.kc-opt .katex{font-size:1.1em}',
    '.kc-opt{line-height:1.25;overflow-wrap:anywhere;font-family:inherit}',
    '.kc-q>span{display:block;min-width:0;max-width:100%}.kc-opt>span{display:block;max-width:100%}',
    '.kc-tn{display:flex;align-items:center;gap:6px;min-width:0;flex:1 1 auto}',
    '.kc-em{font-size:1.3em;line-height:1}',
    '.kc-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.kc-bd{letter-spacing:2px;white-space:nowrap}',
    '.kc-th small.kc-ser{background:#fbbf2433;color:#fde68a}',
    '.kc-cap{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#ffffff14;border:1px dashed #ffffff66;border-radius:10px;padding:4px 10px;font-weight:700;font-size:clamp(12px,1.5vw,18px)}',
    '.kc-cap b{background:#fff;color:#111;border-radius:8px;padding:1px 10px}',
    '.kc-capn{opacity:.7;font-size:.85em}',
    '.kc-skip{margin-left:auto;background:#ffffff22;color:#fff;border:1px solid #ffffff55;border-radius:8px;padding:2px 8px;font-size:.85em;cursor:pointer}',
    '.kc-team.tight{gap:4px;padding:6px}.kc-team.tight .kc-q{padding:4px;min-height:0}.kc-team.tight .kc-opts{gap:4px}.kc-team.tight .kc-opt{min-height:34px!important;padding:3px 4px!important}.kc-team.tight .kc-cap{padding:1px 8px}',
    '.kc-bm{display:flex;flex-direction:column;gap:6px;margin:8px 0}',
    '.kc-bnew{background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:6px 12px;font-weight:700;animation:kcBdg .7s ease-out}',
    '.kc-bi{font-size:1.6em;vertical-align:middle}',
    '@keyframes kcBdg{from{transform:scale(.4);opacity:0}70%{transform:scale(1.08)}to{transform:scale(1);opacity:1}}',
    '.kc-mem{font-size:.9em;opacity:.85}',
    '.kc-fsz{display:inline-flex;gap:4px}',
    '.kc-tcfg{border:1px solid #8885;border-radius:10px;padding:6px 10px;margin:8px 0}',
    '.kc-pk{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}',
    '.kc-ep{width:32px;height:32px;border-radius:8px;border:1px solid #8886;background:transparent;font-size:18px;line-height:1;cursor:pointer;padding:0}',
    '.kc-sw{width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #8888;cursor:pointer;padding:0}',
    '.kc-ep.on,.kc-sw.on{outline:3px solid #f59e0b;outline-offset:1px}',
    '.kc-rec{margin-top:4px}',
    '.kc-sup{font-size:.75em;vertical-align:super}.kc-sub{font-size:.75em;vertical-align:sub}',
    /* Toàn màn hình: lấp đầy 100% khung hình, không để thừa nền đen phía dưới */
    '.kc-stage.on.fs{border-radius:0;padding:12px;width:100vw;height:100vh;height:100dvh;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}',
    '.kc-stage.on.fs .kc-top{flex:0 0 auto}',
    '.kc-stage.on.fs .kc-grid{flex:1 1 auto;min-height:0;grid-template-rows:auto minmax(0,1fr)}',
    '@media(max-width:700px){.kc-stage.on.fs .kc-grid{grid-template-rows:auto minmax(0,1fr) minmax(0,1fr)}}',
    '.kc-stage.on.fs .kc-team{min-height:0;height:100%}',
    '.kc-stage.on.fs .kc-field{height:clamp(110px,21vh,230px)}',
    '.kc-stage.on.fs .kc-q{min-height:0;overflow:hidden;font-size:calc(clamp(20px,min(3.4vw,6vh),110px)*var(--kc-fs,1))}',
    '.kc-stage.on.fs .kc-opts{flex:0 0 auto}',
    '.kc-stage.on.fs .kc-opt{min-height:clamp(60px,14vh,160px);font-size:calc(clamp(16px,min(2.3vw,4.2vh),72px)*var(--kc-fs,1))}',
    '.kc-stage.on.fs .kc-info{font-size:clamp(14px,2.6vh,34px)}',
    '.kc-stage{user-select:none;-webkit-user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
    '.kc-opt i{font-size:13px;opacity:.75;font-weight:800;color:#334155}',
    '.kc-stage.on.fs .kc-time{font-size:clamp(34px,6vh,72px);padding:2px 22px}',
    '.kc-stage.on.fs .kc-chip{font-size:clamp(18px,2.8vh,34px);padding:4px 18px}',
    '.kc-stage.on.fs .kc-btn{font-size:clamp(14px,2.2vh,24px);padding:8px 14px}',
    '.kc-stage.on.fs .kc-th{font-size:clamp(20px,3.2vh,40px)}',
    '.kc-stage.on.fs .kc-th small{font-size:clamp(14px,2.2vh,26px)}',
    '.kc-stage.on.fs .kc-opt i{font-size:clamp(16px,2.6vh,30px);opacity:.85;left:12px;top:6px}',
    '.kc-stage.on.fs .kc-cap{font-size:clamp(16px,2.6vh,30px)}',
    '.kc-stage.on.fs .kc-ovbox{padding:clamp(26px,5vh,60px) clamp(34px,6vw,100px)}',
    '.kc-stage.on.fs .kc-ovbox h2{font-size:clamp(34px,7vh,88px)}',
    '.kc-stage.on.fs .kc-ovbox p,.kc-stage.on.fs .kc-bnew{font-size:clamp(20px,3.2vh,40px);line-height:1.5}',
    '.kc-stage.on.fs .kc-mem{font-size:.8em}',
    '@media(max-width:700px){.kc-grid{grid-template-columns:1fr;grid-template-areas:"f" "b" "r"}.kc-team{min-height:0}}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- Trạng thái ---------- */
  var cfg = { bank: SAMPLE, secs: 120, nameB: 'Đội Xanh', nameR: 'Đội Đỏ', sound: true, combo: true, gold: true, penalty: false,
    emB: '🔵', emR: '🔴', colB: '#2563eb', colR: '#dc2626', memB: '', memR: '', memN: 4, cap: false, badges: true, fscale: 1, rec: {} };
  try { var saved = JSON.parse(localStorage.getItem(LS) || 'null'); if (saved) for (var k in saved) cfg[k] = saved[k]; } catch (e) {}
  cfg.fscale = +cfg.fscale || 1; if (!cfg.rec || typeof cfg.rec !== 'object') cfg.rec = {};
  function save() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }

  var bank = [], teams = [], pos = 0, phase = 'setup', paused = false;
  var endAt = 0, remain = 0, timer = null, step = 0.2;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(ms) { var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------- Màu đội, biểu tượng, huy hiệu, thành viên ---------- */
  function hex2rgb(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); if (isNaN(n)) n = 0x2563eb; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(c) { return '#' + c.map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(''); }
  function mixc(a, b, t) { return [0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * t; }); }
  function lumc(c) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
  function normCol(hex) {      /* chữ trắng luôn đọc rõ trên màu đội, màu không chìm vào nền tối */
    var c = hex2rgb(hex), n = 0;
    while (lumc(c) > 0.28 && n++ < 14) c = mixc(c, [0, 0, 0], 0.1);
    n = 0; while (lumc(c) < 0.05 && n++ < 14) c = mixc(c, [255, 255, 255], 0.12);
    return c;
  }
  function themeVars(hex) {    /* [màu chính, nền khung, đầu dải câu hỏi, nền chip, chữ chip] */
    var c = normCol(hex), dk = [11, 16, 32];
    return [rgb2hex(c), rgb2hex(mixc(dk, c, 0.22)), rgb2hex(mixc(c, [0, 0, 0], 0.4)), rgb2hex(mixc(dk, c, 0.38)), rgb2hex(mixc(c, [255, 255, 255], 0.72))];
  }
  var TH = [themeVars(cfg.colB), themeVars(cfg.colR)];
  function em(i) { return i ? (cfg.emR || '🔴') : (cfg.emB || '🔵'); }
  var BADGES = [{ n: 2, ic: '🔥', nm: 'Nóng máy' }, { n: 3, ic: '⭐', nm: 'Ngôi sao kéo co' }, { n: 4, ic: '💎', nm: 'Kim cương' }, { n: 5, ic: '👑', nm: 'Nhà vô địch' }];
  function recKey(name) { return String(name || '').trim().toLowerCase(); }
  function getRec(name, create) {
    var k = recKey(name);
    if (!cfg.rec[k] && create) {
      var ks = Object.keys(cfg.rec); if (ks.length >= 30) delete cfg.rec[ks[0]];
      cfg.rec[k] = { g: 0, w: 0, s: 0, best: 0, b: [] };
    }
    return cfg.rec[k] || null;
  }
  function badgeIcons(r) { return r ? BADGES.filter(function (b) { return r.b.indexOf(b.n) >= 0; }).map(function (b) { return b.ic; }).join('') : ''; }
  function makeMembers(str, n) {
    var names = String(str || '').split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20), i;
    if (!names.length) { n = Math.max(2, Math.min(12, +n || 4)); for (i = 1; i <= n; i++) names.push('Em ' + i); }
    return names.map(function (nm) { return { name: nm, ok: 0, bad: 0 }; });
  }
  function teamCfgHTML(s, n) {
    return '<div class="kc-tcfg"><div class="bar"><b>' + n + '</b>' +
      '<label>Tên <input id="kcN' + s + '" style="width:140px"></label>' +
      '<label>Biểu tượng <input id="kcE' + s + '" maxlength="8" style="width:56px;text-align:center" placeholder="🦁"></label>' +
      '<label>Màu <input type="color" id="kcC' + s + '" style="width:44px;height:30px;padding:0"></label></div>' +
      '<div class="kc-pk" id="kcPk' + s + '"></div><div class="kc-pk" id="kcSw' + s + '"></div>' +
      '<div class="bar"><input id="kcM' + s + '" placeholder="Thành viên, cách nhau bằng dấu phẩy (cho chế độ Đội trưởng; bỏ trống thì tự đánh số Em 1, Em 2…)" style="width:100%;box-sizing:border-box"></div></div>';
  }

  /* ---------- Hiển thị công thức toán: $...$ , $$...$$ , \(...\) , \[...\] ---------- */
  var KATEX_V = '0.16.11', kxState = 0;
  function loadKatex() {
    if (window.katex || kxState) return;
    kxState = 1;
    var base = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/' + KATEX_V + '/';
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'katex.min.css'; l.onload = function () { if (phase !== 'setup') fitSoon(); }; document.head.appendChild(l);
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
  /* Sửa lỗi LaTeX thường gặp (AI viết thừa dấu \, ký tự Unicode, thiếu ngoặc) để công thức vẫn hiển thị đúng, không hiện mã đỏ */
  function texFix(t) {
    t = String(t).replace(/\\\\(?=[a-zA-Z])/g, '\\');
    if (typeof UNI2TEX !== 'undefined') t = t.replace(/[≤≥≠×÷±∞≈∈∉∪∩⊂→⇒⇔∠△⊥∥∑∏∫π]/g, function (c) { return UNI2TEX[c] || c; });
    t = t.replace(/²/g, '^{2}').replace(/³/g, '^{3}').replace(/°/g, '^{\\circ}');
    var o = (t.match(/\{/g) || []).length, c = (t.match(/\}/g) || []).length;
    while (c < o) { t += '}'; c++; }
    while (o < c) { t = '{' + t; o++; }
    return t;
  }
  function texHTML(t) {
    t = String(t).trim().replace(/(^|[^\\])%/g, '$1\\%');
    if (window.katex) {
      var tries = [t, texFix(t)];
      for (var i = 0; i < tries.length; i++) {
        try { return window.katex.renderToString('\\displaystyle ' + tries[i], { throwOnError: true, output: 'html', displayMode: false, strict: 'ignore', trust: false }); } catch (e) {}
      }
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
      if (actx.state === 'suspended' && actx.resume) actx.resume();
      o.type = type || 'sine'; o.frequency.value = f; g.gain.value = 0.16;
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
    '<button class="sec sm" id="kcTpl" type="button" title="Tải file Excel mẫu để chỉnh sửa rồi nhập lại, dùng khi AI chưa hoạt động">⬇ Tải file mẫu (.xlsx)</button>' +
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
    '<div class="note">Có tài liệu: AI ra câu hỏi đúng trọng tâm bài, mỗi câu tự đủ dữ kiện để học sinh không cần xem tài liệu. Không có tài liệu: AI ra câu hỏi theo chủ đề đã nhập. Công thức Toán được hiển thị đúng khi chiếu; chữ tự co để câu hỏi luôn hiện trọn vẹn (có nút A− / A+ chỉnh cỡ chữ khi chơi).</div>' +
    '<div class="note">Mỗi dòng một câu: <code>Câu hỏi | A | B | C | D | B</code>. Cột cuối là đáp án đúng (chữ A–D, số 1–4 hoặc chính nội dung đáp án). Excel: cột A câu hỏi, các cột kế tiếp là đáp án, cột cuối là đáp án đúng.</div>' +
    '</div><div>' +
    '<b>Cấu hình</b>' +
    teamCfgHTML('B', 'Đội 1') + teamCfgHTML('R', 'Đội 2') +
    '<div class="bar"><label>Thời gian (giây) <input type="number" id="kcSecs" min="20" max="3600" style="width:90px"></label></div>' +
    '<div class="bar"><label><input type="checkbox" id="kcSnd"> Bật âm thanh</label></div>' +
    '<div class="bar"><label><input type="checkbox" id="kcCombo"> 🔥 Combo: đúng liên tiếp 3 câu thì mỗi câu kéo mạnh thêm 50%</label></div>' +
    '<div class="bar"><label><input type="checkbox" id="kcGold"> ⚡ Giờ vàng: 15 giây cuối mỗi câu đúng kéo gấp đôi</label></div>' +
    '<div class="bar"><label><input type="checkbox" id="kcPen"> 😬 Trả lời sai thì dây bị kéo lùi nửa bước</label></div>' +
    '<div class="bar"><label><input type="checkbox" id="kcCap"> 🎤 Chế độ Đội trưởng: mỗi câu chỉ một em trả lời, luân phiên lần lượt để cả nhóm đều tham gia</label></div>' +
    '<div class="bar"><label class="note">Số em mỗi đội khi chưa nhập tên thành viên <input type="number" id="kcMN" min="2" max="12" style="width:64px"></label></div>' +
    '<div class="bar"><label><input type="checkbox" id="kcBdg"> 🏅 Huy hiệu: đội thắng liên tiếp nhiều ván được nhận huy hiệu</label><button class="sec sm" id="kcRecClear" type="button">🧹 Xóa huy hiệu và thành tích</button></div>' +
    '<div id="kcRecInfo" class="note kc-rec"></div>' +
    '<div class="note">Huy hiệu: thắng liên tiếp 2 ván 🔥 Nóng máy · 3 ván ⭐ Ngôi sao kéo co · 4 ván 💎 Kim cương · 5 ván 👑 Nhà vô địch. Hòa hoặc thua thì chuỗi về 0 (huy hiệu đã nhận vẫn được giữ). Thành tích lưu theo tên đội, nên hãy giữ nguyên tên đội khi chơi nhiều ván.</div>' +
    '<div class="bar"><button class="red" id="kcStart" type="button" style="font-size:18px;padding:12px 26px">▶ BẮT ĐẦU / TRÌNH CHIẾU</button></div>' +
    '<div class="note">Cả hai đội đều thấy đáp án <b>A B C D</b>. Chạm / bấm chuột để chọn, hoặc dùng chung một bàn phím: đội Xanh bấm <b>A S D F</b> (= A B C D), đội Đỏ bấm <b>J K L ;</b> (= A B C D).</div>' +
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
    '<span class="kc-fsz"><button class="kc-btn" id="kcFm" type="button" title="Giảm cỡ chữ">A−</button><button class="kc-btn" id="kcFp" type="button" title="Tăng cỡ chữ">A+</button></span>' +
    '<button class="kc-btn" id="kcRestart" type="button">↻ Chơi lại</button>' +
    '<button class="kc-btn" id="kcFull" type="button">⛶ Toàn màn hình</button>' +
    '</div>' +
    '<div class="kc-grid">' +
    '<div class="kc-team b" id="kcTB"></div>' +
    '<div class="kc-field" id="kcField"><div class="kc-prog"><i class="kc-pb" id="kcPB"></i><i class="kc-pr" id="kcPR"></i></div>' +
    '<div class="kc-mid"></div><div class="kc-win b"><small id="kcFlagB">🏁 ĐÍCH</small></div><div class="kc-win r"><small id="kcFlagR">ĐÍCH 🏁</small></div>' +
    '<div class="kc-mover" id="kcMover"><span class="kc-grp b">🧑‍🎓🧑‍🎓</span><span class="kc-rope"></span><span class="kc-knot"></span><span class="kc-rope"></span><span class="kc-grp r">🧑‍🎓🧑‍🎓</span></div>' +
    '<div class="kc-info" id="kcInfo"></div></div>' +
    '<div class="kc-team r" id="kcTR"></div>' +
    '</div>' +
    '<div class="kc-cd" id="kcCd"></div>' +
    '<div class="kc-ov" id="kcOv"><canvas class="kc-cf" id="kcCf"></canvas><div class="kc-ovbox"><div style="font-size:54px">🏆</div><h2 id="kcWin"></h2><p id="kcWinSub"></p><div class="kc-bm" id="kcBM"></div>' +
    '<div class="bar"><button class="red" id="kcAgain" type="button">↻ Chơi lại</button><button class="sec" id="kcToSetup" type="button">Về cài đặt</button></div></div></div>' +
    '</div>';

  function $(id) { return document.getElementById(id); }
  var el = {
    setup: $('kcSetup'), stage: $('kcStage'), bank: $('kcBank'), count: $('kcCount'), msg: $('kcMsg'),
    nb: $('kcNB'), nr: $('kcNR'), secs: $('kcSecs'), snd: $('kcSnd'), file: $('kcFile'),
    time: $('kcTime'), sb: $('kcSB'), sr: $('kcSR'), tb: $('kcTB'), tr: $('kcTR'),
    field: $('kcField'), mover: $('kcMover'), info: $('kcInfo'), ov: $('kcOv'), win: $('kcWin'), winSub: $('kcWinSub'),
    pause: $('kcPause'), mute: $('kcMute'),
    eb: $('kcEB'), er: $('kcER'), cb: $('kcCB'), cr: $('kcCR'), mb: $('kcMB'), mr: $('kcMR'),
    cap: $('kcCap'), mn: $('kcMN'), bdg: $('kcBdg'), bm: $('kcBM'), rec: $('kcRecInfo')
  };

  el.bank.value = cfg.bank; el.nb.value = cfg.nameB; el.nr.value = cfg.nameR; el.secs.value = cfg.secs; el.snd.checked = !!cfg.sound;
  $('kcCombo').checked = !!cfg.combo; $('kcGold').checked = !!cfg.gold; $('kcPen').checked = !!cfg.penalty;

  el.eb.value = cfg.emB; el.er.value = cfg.emR; el.cb.value = cfg.colB; el.cr.value = cfg.colR; el.mb.value = cfg.memB; el.mr.value = cfg.memR;
  el.cap.checked = !!cfg.cap; el.mn.value = cfg.memN; el.bdg.checked = cfg.badges !== false;

  var EMOJIS = ['🔵', '🔴', '🟢', '🟡', '🟣', '🦁', '🐯', '🐲', '🦅', '🐬', '🚀', '⭐', '🔥', '⚡', '🐼', '🦊'];
  var SWATCH = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#0d9488', '#ca8a04'];
  function buildPick(s) {
    var eInp = s === 'B' ? el.eb : el.er, cInp = s === 'B' ? el.cb : el.cr, pk = $('kcPk' + s), sw = $('kcSw' + s);
    pk.innerHTML = EMOJIS.map(function (e) { return '<button type="button" class="kc-ep" data-e="' + e + '">' + e + '</button>'; }).join('');
    sw.innerHTML = SWATCH.map(function (c) { return '<button type="button" class="kc-sw" data-c="' + c + '" style="background:' + c + '" title="' + c + '"></button>'; }).join('');
    function mark() {
      var e = eInp.value.trim(), c = cInp.value.toLowerCase();
      Array.prototype.forEach.call(pk.children, function (b) { b.classList.toggle('on', b.getAttribute('data-e') === e); });
      Array.prototype.forEach.call(sw.children, function (b) { b.classList.toggle('on', b.getAttribute('data-c') === c); });
    }
    pk.onclick = function (ev) { var b = ev.target.closest('.kc-ep'); if (b) { eInp.value = b.getAttribute('data-e'); mark(); renderRecInfo(); } };
    sw.onclick = function (ev) { var b = ev.target.closest('.kc-sw'); if (b) { cInp.value = b.getAttribute('data-c'); mark(); } };
    eInp.addEventListener('input', mark); cInp.addEventListener('input', mark);
    mark();
  }
  function renderRecInfo() {
    var parts = [[el.nb.value.trim() || 'Đội Xanh', el.eb.value.trim() || '🔵'], [el.nr.value.trim() || 'Đội Đỏ', el.er.value.trim() || '🔴']].map(function (p) {
      var r = getRec(p[0], false); if (!r || !r.g) return '';
      return esc(p[1]) + ' ' + esc(p[0]) + ': ' + r.w + '/' + r.g + ' ván thắng · chuỗi hiện tại ' + r.s + (badgeIcons(r) ? ' · huy hiệu ' + badgeIcons(r) : '');
    }).filter(Boolean);
    el.rec.innerHTML = parts.length ? '🏆 Thành tích: ' + parts.join(' | ') : '';
  }
  buildPick('B'); buildPick('R');
  [el.nb, el.nr, el.eb, el.er].forEach(function (i) { i.addEventListener('input', renderRecInfo); });
  $('kcRecClear').onclick = function () { if (confirm('Xóa toàn bộ huy hiệu và thành tích của các đội?')) { cfg.rec = {}; save(); renderRecInfo(); } };
  renderRecInfo();

  /* màu đội + cỡ chữ chung */
  function applyTheme() {
    TH = [themeVars(cfg.colB), themeVars(cfg.colR)];
    [['kb', TH[0]], ['kr', TH[1]]].forEach(function (p) { for (var k = 0; k < 5; k++) el.stage.style.setProperty('--' + p[0] + (k + 1), p[1][k]); });
    el.stage.style.setProperty('--kc-fs', cfg.fscale);
    $('kcFlagB').textContent = em(0) + ' ĐÍCH'; $('kcFlagR').textContent = 'ĐÍCH ' + em(1);
  }
  function setFs(v) {
    cfg.fscale = Math.max(0.6, Math.min(1.6, Math.round(v * 10) / 10));
    el.stage.style.setProperty('--kc-fs', cfg.fscale); save();
    $('kcFm').title = 'Giảm cỡ chữ (hiện ' + Math.round(cfg.fscale * 100) + '%)'; $('kcFp').title = 'Tăng cỡ chữ (hiện ' + Math.round(cfg.fscale * 100) + '%)';
    fitSoon();
  }
  $('kcFm').onclick = function () { setFs(cfg.fscale - 0.1); };
  $('kcFp').onclick = function () { setFs(cfg.fscale + 0.1); };
  applyTheme();
  function updCount() { el.count.textContent = '(' + parse(el.bank.value).length + ' câu hợp lệ)'; }
  updCount();
  el.bank.addEventListener('input', updCount);

  /* ---------- Nhập file ---------- */
  /* Đọc CSV đúng chuẩn: tự nhận dấu phân cách (, ; Tab), hiểu ô đặt trong "..." có dấu phẩy / xuống dòng */
  function csvRows(tx, d) {
    var rows = [], row = [], f = '', q = false, i, c;
    for (i = 0; i < tx.length; i++) {
      c = tx.charAt(i);
      if (q) { if (c === '"') { if (tx.charAt(i + 1) === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && tx.charAt(i + 1) === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    row.push(f); rows.push(row);
    return rows.filter(function (r) { return r.join('').trim(); });
  }
  function csvToBank(tx) {
    tx = tx.replace(/^\uFEFF/, '');
    var best = null, score = -1;
    [',', ';', '\t'].forEach(function (d) {
      var r = csvRows(tx, d), sc = r.filter(function (x) { return x.length >= 4; }).length;
      if (sc > score) { score = sc; best = r; }
    });
    return (best || []).map(function (r) { return r.map(function (x) { return String(x).replace(/\s+/g, ' ').trim().replace(/\|/g, '/'); }).join(' | '); }).join('\n');
  }

  $('kcFileBtn').onclick = function () { el.file.click(); };
  $('kcSample').onclick = function () { el.bank.value = SAMPLE; updCount(); };
  $('kcTpl').onclick = function () {
    var rows = [SAMPLE_HEAD].concat(SAMPLE_ROWS);
    var guide = [['HƯỚNG DẪN DÙNG FILE MẪU'], [''],
      ['1. Sheet "Câu hỏi": mỗi dòng là một câu. Cột A = câu hỏi; cột B–E = 4 đáp án; cột F = đáp án đúng (chữ A, B, C hoặc D).'],
      ['2. Sửa trực tiếp hoặc xóa các dòng mẫu rồi nhập câu của bạn. Dòng tiêu đề (dòng 1) có thể giữ nguyên, phần mềm tự bỏ qua.'],
      ['3. Công thức Toán viết bằng LaTeX đặt trong dấu $...$, ví dụ $x^2$, $\\frac{a}{b}$, $\\sqrt{3}$, $\\leq$, $\\pi$.'],
      ['4. Không dùng ký tự | (gạch đứng) trong ô; với giá trị tuyệt đối hãy viết $\\lvert x \\rvert$.'],
      ['5. Lưu file, vào Kéo co kiến thức > "Nhập file câu hỏi" > chọn file này > Bắt đầu.'],
      ['6. Chỉ sheet đầu tiên ("Câu hỏi") được đọc. Nên có từ 10 câu trở lên để trò chơi hay hơn.']];
    if (window.XLSX) {
      var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows), wg = XLSX.utils.aoa_to_sheet(guide);
      ws['!cols'] = [{ wch: 58 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 22 }]; wg['!cols'] = [{ wch: 120 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Câu hỏi'); XLSX.utils.book_append_sheet(wb, wg, 'Hướng dẫn');
      XLSX.writeFile(wb, 'keo-co-mau.xlsx');
    } else {
      var csv = '\uFEFF' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'keo-co-mau.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    el.msg.textContent = 'Đã tải file mẫu. Chỉnh sửa rồi bấm "Nhập file câu hỏi" để dùng.';
  };
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
      rd.onload = function () {
        var tx = String(rd.result);
        if (/\.csv$/i.test(f.name) && tx.indexOf('|') < 0) {
          if (tx.indexOf('\uFFFD') >= 0) { el.msg.textContent = 'File CSV không phải mã hóa UTF-8 nên tiếng Việt bị lỗi. Hãy lưu lại bằng "CSV UTF-8" hoặc dùng file .xlsx.'; return; }
          tx = csvToBank(tx);
        }
        el.bank.value = tx; updCount(); el.msg.textContent = 'Đã nhập từ ' + f.name;
      };
      rd.readAsText(f, 'utf-8');
    }
    el.file.value = '';
  });

  /* ---------- Vòng chơi ---------- */
  function newTeam(name, cls, mem) {
    return { name: name, cls: cls, order: shuffle(bank.map(function (_, i) { return i; })), idx: 0, locked: false, ok: 0, bad: 0, streak: 0, best: 0, opts: [], members: makeMembers(mem, cfg.memN), turn: 0 };
  }
  function loadQ(T) {
    var q = bank[T.order[T.idx % T.order.length]];
    T.q = q; T.opts = shuffle(q.opts); T.locked = false; T.mark = null;
  }

  var cdTimers = [], goldOn = false, lastSec = -1, cfRaf = 0;
  function clearCd() { cdTimers.forEach(clearTimeout); cdTimers = []; $('kcCd').classList.remove('on'); cancelAnimationFrame(cfRaf); }
  function start() {
    bank = parse(el.bank.value);
    if (bank.length < 1) { el.msg.textContent = 'Chưa có câu hỏi hợp lệ. Mỗi dòng cần: Câu hỏi | các đáp án | đáp án đúng.'; return; }
    var nB = el.nb.value.trim() || 'Đội Xanh', nR = el.nr.value.trim() || 'Đội Đỏ';
    if (recKey(nB) === recKey(nR)) { el.msg.textContent = 'Hai đội cần có tên khác nhau.'; return; }
    var c1 = hex2rgb(themeVars(el.cb.value)[0]), c2 = hex2rgb(themeVars(el.cr.value)[0]);
    if (Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2)) < 70) { el.msg.textContent = 'Hai đội đang chọn màu quá giống nhau, hãy chọn màu khác để dễ phân biệt.'; return; }
    clearCd(); clearInterval(timer);
    cfg.bank = el.bank.value; cfg.nameB = nB; cfg.nameR = nR;
    cfg.emB = el.eb.value.trim() || '🔵'; cfg.emR = el.er.value.trim() || '🔴'; cfg.colB = el.cb.value; cfg.colR = el.cr.value;
    cfg.memB = el.mb.value.trim(); cfg.memR = el.mr.value.trim(); cfg.cap = el.cap.checked; cfg.memN = Math.max(2, Math.min(12, +el.mn.value || 4)); cfg.badges = el.bdg.checked;
    cfg.secs = Math.max(20, +el.secs.value || 120); cfg.sound = el.snd.checked;
    cfg.combo = $('kcCombo').checked; cfg.gold = $('kcGold').checked; cfg.penalty = $('kcPen').checked; save();
    applyTheme(); renderRecInfo();
    teams = [newTeam(cfg.nameB, 'b', cfg.memB), newTeam(cfg.nameR, 'r', cfg.memR)];
    teams.forEach(loadQ);
    pos = 0; step = 1 / bank.length; paused = false; phase = 'count'; goldOn = false; lastSec = -1;
    remain = cfg.secs * 1000;
    el.setup.style.display = 'none'; el.stage.classList.add('on'); el.ov.classList.remove('on');
    el.pause.textContent = '⏸ Tạm dừng';
    el.time.classList.remove('gold'); el.field.classList.remove('gold');
    renderAll();
    /* đếm ngược 3 - 2 - 1 - KÉO! rồi mới tính giờ */
    var cd = $('kcCd'), seq = ['3', '2', '1', 'KÉO!'];
    cd.classList.add('on');
    seq.forEach(function (t, i) {
      cdTimers.push(setTimeout(function () { cd.innerHTML = '<span>' + t + '</span>'; beep(i === 3 ? 988 : 520, i === 3 ? 0.3 : 0.12); }, i * 750));
    });
    cdTimers.push(setTimeout(function () {
      cd.classList.remove('on'); phase = 'play'; endAt = Date.now() + remain;
      clearInterval(timer); timer = setInterval(tick, 200);
    }, 3 * 750 + 650));
  }

  function renderTeam(i) {
    var T = teams[i], box = i ? el.tr : el.tb, keys = ['A', 'B', 'C', 'D'], hot = i ? ['J', 'K', 'L', ';'] : ['A', 'S', 'D', 'F'];
    box.className = 'kc-team ' + T.cls + (T.locked ? ' lock' : '');
    var R = cfg.badges ? getRec(T.name, false) : null, cap = '';
    if (cfg.cap) {
      var len = T.members.length, k = T.turn % len;
      cap = '<div class="kc-cap"><span>🎤 Đội trưởng lượt này:</span><b>' + esc(T.members[k].name) + '</b><span class="kc-capn">(' + (k + 1) + '/' + len + ')</span><button type="button" class="kc-skip" data-t="' + i + '" title="Bạn này vắng hoặc muốn đổi người">⏭ Đổi người</button></div>';
    }
    box.innerHTML =
      '<div class="kc-th"><span class="kc-tn"><span class="kc-em">' + esc(em(i)) + '</span><span class="kc-nm">' + esc(T.name) + '</span>' + (badgeIcons(R) ? '<span class="kc-bd">' + badgeIcons(R) + '</span>' : '') + '</span>' +
      (R && R.s >= 1 ? '<small class="kc-ser" title="Số ván thắng liên tiếp">🏆 ' + R.s + ' ván</small>' : '') +
      (T.streak >= 2 ? '<small class="kc-fire">🔥 ' + T.streak + ' liên tiếp</small>' : '') + '<small>Câu #' + (T.ok + T.bad + 1) + '</small></div>' + cap +
      '<div class="kc-q"><span>' + mathHTML(T.q.q) + '</span></div>' +
      '<div class="kc-opts">' + T.opts.map(function (o, j) {
        var c = T.mark && T.mark.j === j ? (T.mark.ok ? ' ok' : ' bad') : (T.mark && !T.mark.ok && o === T.q.ans ? ' ok' : '');
        return '<button type="button" class="kc-opt' + c + '" data-t="' + i + '" data-o="' + j + '" title="Phím tắt: ' + hot[j] + '">' + (keys[j] ? '<i>' + keys[j] + '</i>' : '') + '<span>' + mathHTML(o) + '</span></button>';
      }).join('') + '</div>';
    fitSoon();
  }
  /* Tự co chữ câu hỏi / đáp án cho tới khi hiện TRỌN VẸN trong khung: không bị cắt, không tràn ngang, công thức không vỡ */
  function fit(box) {
    var q = box.querySelector('.kc-q'), btns = box.querySelectorAll('.kc-opt');
    if (!q || !btns.length) return;
    var qs = q.firstElementChild, fsMode = el.stage.classList.contains('fs'), maxH = Math.max(260, window.innerHeight * 0.92), i;
    box.classList.remove('tight'); q.style.fontSize = ''; q.style.overflowY = '';
    for (i = 0; i < btns.length; i++) btns[i].style.fontSize = '';
    function clip(n) { return n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1; }
    function ok() {
      if (clip(q) || (qs && clip(qs))) return false;
      if (box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1) return false;
      if (!fsMode && box.offsetHeight > maxH) return false;
      for (var k = 0; k < btns.length; k++) { var sp = btns[k].firstElementChild; if (clip(btns[k]) || (sp && clip(sp))) return false; }
      return true;
    }
    if (ok()) return;
    var q0 = parseFloat(getComputedStyle(q).fontSize) || 20, o0 = parseFloat(getComputedStyle(btns[0]).fontSize) || 16;
    function apply(s, tight) {
      box.classList.toggle('tight', !!tight);
      q.style.fontSize = Math.max(10, q0 * s) + 'px';
      var of = Math.max(10, o0 * Math.max(0.6, s)) + 'px';
      for (var k = 0; k < btns.length; k++) btns[k].style.fontSize = of;
    }
    for (var pass = 0; pass < 2; pass++) {
      var tight = pass === 1, lo = 0.2, hi = 1;
      apply(lo, tight);
      if (!ok()) continue;                       /* cỡ nhỏ nhất vẫn chưa vừa: thử chế độ gọn */
      for (var n = 0; n < 9; n++) { var mid = (lo + hi) / 2; apply(mid, tight); if (ok()) lo = mid; else hi = mid; }
      apply(lo, tight); return;
    }
    q.style.overflowY = 'auto';                  /* hết cách: cho cuộn riêng phần câu hỏi, không bao giờ bị cắt cụt */
  }
  function fitAll() { if (phase === 'setup' || !el.stage.classList.contains('on')) return; fit(el.tb); fit(el.tr); }
  var fitTick = 0;
  function fitSoon() { cancelAnimationFrame(fitTick); fitTick = requestAnimationFrame(function () { fitTick = requestAnimationFrame(fitAll); }); fitLater(); }
  window.addEventListener('resize', fitSoon);
  var lateFit = 0;
  function fitLater() { clearTimeout(lateFit); lateFit = setTimeout(fitAll, 450); }       /* chạy lại sau khi font KaTeX tải xong */
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitSoon);
  if (window.ResizeObserver) {
    var roDims = {};
    var ro = new ResizeObserver(function (es) {
      var ch = false;
      es.forEach(function (e) { var d = Math.round(e.contentRect.width) + 'x' + Math.round(e.contentRect.height); if (roDims[e.target.id] !== d) { roDims[e.target.id] = d; ch = true; } });
      if (ch) fitSoon();
    });
    ro.observe(el.tb); ro.observe(el.tr);
  }

  function renderRope() {
    el.mover.style.left = (50 + pos * 32) + '%';
    $('kcPB').style.width = (50 - pos * 50) + '%'; $('kcPR').style.width = (50 + pos * 50) + '%';
    var pct = Math.round(Math.abs(pos) * 100);
    var lead = pos === 0 ? '⚖ Cân bằng' : (pos < 0 ? em(0) + ' ' + teams[0].name : em(1) + ' ' + teams[1].name) + ' dẫn ' + pct + '%';
    el.info.textContent = goldOn ? '⚡ GIỜ VÀNG: kéo gấp đôi · ' + lead
      : lead + ' · mỗi câu đúng kéo ' + (step * 100).toFixed(0) + '% · kéo tới đích để thắng';
  }
  function renderScore() {
    el.sb.textContent = em(0) + ' ' + teams[0].name + ': ' + teams[0].ok + ' đúng';
    el.sr.textContent = em(1) + ' ' + teams[1].name + ': ' + teams[1].ok + ' đúng';
  }
  function renderAll() {
    renderTeam(0); renderTeam(1); renderRope(); renderScore();
    el.time.textContent = fmt(remain); el.time.classList.toggle('low', remain <= 10000);
    el.mute.textContent = cfg.sound ? '🔊 Âm thanh' : '🔇 Tắt âm';
  }

  function pull(T) {            /* hệ số kéo: combo +50%, giờ vàng +100% */
    var m = 1; if (cfg.combo && T.streak >= 3) m += 0.5; if (goldOn) m += 1; return m;
  }
  function popup(cls, text) {
    var d = document.createElement('div'); d.className = 'kc-pop ' + cls; d.textContent = text;
    d.style.left = (50 + pos * 32) + '%'; el.field.appendChild(d); setTimeout(function () { d.remove(); }, 1000);
  }
  function answer(t, o) {
    if (phase !== 'play' || paused) return;
    var T = teams[t]; if (T.locked || o >= T.opts.length) return;
    var ok = T.opts[o] === T.q.ans, dir = t ? 1 : -1;
    T.locked = true; T.mark = { j: o, ok: ok };
    if (cfg.cap) { var M = T.members[T.turn % T.members.length]; if (ok) M.ok++; else M.bad++; }
    if (ok) {
      T.ok++; T.streak++; T.best = Math.max(T.best, T.streak);
      var m = pull(T), d = step * m;
      pos = Math.max(-1, Math.min(1, pos + dir * d)); beep(880, 0.15);
      if (T.streak === 3 && cfg.combo) setTimeout(function () { beep(1175, 0.12); }, 120);
      popup(T.cls, '+' + Math.round(d * 100) + '%' + (m > 1 ? ' 🔥' : ''));
    } else {
      T.bad++; T.streak = 0; beep(200, 0.3, 'square');
      if (cfg.penalty) { pos = Math.max(-1, Math.min(1, pos - dir * step * 0.5)); popup('x', '−' + Math.round(step * 50) + '%'); }
    }
    renderTeam(t); renderRope(); renderScore();
    if (Math.abs(pos) >= 1 - 1e-9) { pos = pos < 0 ? -1 : 1; renderRope(); setTimeout(function () { finish(); }, 500); return; }
    setTimeout(function () {
      if (phase !== 'play') return;
      T.idx++; if (cfg.cap) T.turn++; loadQ(T); renderTeam(t);
    }, ok ? 600 : 1100);
  }

  function tick() {
    if (phase !== 'play' || paused) return;
    remain = Math.max(0, endAt - Date.now());
    el.time.textContent = fmt(remain); el.time.classList.toggle('low', remain <= 10000);
    var g = !!cfg.gold && cfg.secs >= 45 && remain <= 15000 && remain > 0;
    if (g !== goldOn) {
      goldOn = g; el.time.classList.toggle('gold', g); el.field.classList.toggle('gold', g); renderRope();
      if (g) { beep(740, 0.12); setTimeout(function () { beep(988, 0.2); }, 140); }
    }
    var sc = Math.ceil(remain / 1000);
    if (sc <= 5 && sc > 0 && sc !== lastSec) beep(520, 0.05);
    lastSec = sc;
    if (remain <= 0) finish();
  }

  function confetti(colors) {
    var cv = $('kcCf'), ctx = cv.getContext('2d'); cv.width = cv.clientWidth || 600; cv.height = cv.clientHeight || 400;
    var P = [], i; for (i = 0; i < 140; i++) P.push({ x: Math.random() * cv.width, y: -Math.random() * cv.height * 0.6, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length] });
    var t0 = performance.now(); cancelAnimationFrame(cfRaf);
    (function f(t) {
      ctx.clearRect(0, 0, cv.width, cv.height); var live = false;
      P.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.02; if (p.y < cv.height + 20) live = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore();
      });
      if (live && t - t0 < 7000) cfRaf = requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }
  function updateRecords(w) {
    var out = [];
    teams.forEach(function (T, i) {
      var r = getRec(T.name, true); r.g++;
      if (i === w) {
        r.w++; r.s++; r.best = Math.max(r.best, r.s);
        BADGES.forEach(function (b) { if (r.s >= b.n && r.b.indexOf(b.n) < 0) { r.b.push(b.n); out.push({ i: i, b: b }); } });
      } else r.s = 0;
    });
    save(); return out;
  }
  function finish() {
    if (phase !== 'play') return;
    phase = 'done'; clearInterval(timer); goldOn = false; el.time.classList.remove('gold'); el.field.classList.remove('gold');
    var w = pos < -1e-9 ? 0 : pos > 1e-9 ? 1 : -1;
    var newB = cfg.badges ? updateRecords(w) : [];
    el.win.textContent = w < 0 ? 'Hòa nhau!' : em(w) + ' ' + teams[w].name + ' chiến thắng!';
    el.winSub.innerHTML = teams.map(function (T, i) {
      var n = T.ok + T.bad, pc = n ? Math.round(T.ok * 100 / n) : 0, R = cfg.badges ? getRec(T.name, false) : null;
      var line = esc(em(i)) + ' ' + esc(T.name) + ': ' + T.ok + '/' + n + ' câu đúng (' + pc + '%) · chuỗi đúng dài nhất ' + T.best;
      if (cfg.cap) line += '<br><span class="kc-mem">👥 ' + T.members.map(function (M) { return esc(M.name) + ' ' + M.ok + '/' + (M.ok + M.bad); }).join(' · ') + '</span>';
      if (R && (R.s || R.b.length)) line += '<br><span class="kc-mem">🏆 Thắng liên tiếp: ' + R.s + ' ván' + (badgeIcons(R) ? ' · Huy hiệu: ' + badgeIcons(R) : '') + '</span>';
      return line;
    }).join('<br>');
    el.bm.innerHTML = newB.map(function (x) {
      return '<div class="kc-bnew"><span class="kc-bi">' + x.b.ic + '</span> <b>' + esc(em(x.i)) + ' ' + esc(teams[x.i].name) + '</b> nhận huy hiệu <b>' + esc(x.b.nm) + '</b> — thắng liên tiếp ' + x.b.n + ' ván!</div>';
    }).join('');
    renderRecInfo();
    el.ov.classList.add('on');
    confetti(w < 0 ? [TH[0][0], TH[1][0], '#fbbf24', '#22c55e'] : [TH[w][0], TH[w][4], '#fbbf24', '#fff']);
    beep(660, 0.15); setTimeout(function () { beep(880, 0.15); }, 160); setTimeout(function () { beep(1100, 0.3); }, 320);
    if (newB.length) [1318, 1568, 2093].forEach(function (f, k) { setTimeout(function () { beep(f, 0.18); }, 700 + k * 170); });
  }

  function toSetup() {
    phase = 'setup'; clearInterval(timer); clearCd(); goldOn = false; el.time.classList.remove('gold'); el.field.classList.remove('gold');
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    el.stage.classList.remove('fs'); el.stage.classList.remove('on'); el.setup.style.display = '';
  }

  /* ---------- Sự kiện ---------- */
  $('kcStart').onclick = start;
  function midGame() { return phase === 'play' || phase === 'count'; }
  $('kcRestart').onclick = function () { if (midGame() && !confirm('Đang giữa ván. Chơi lại từ đầu và bỏ kết quả hiện tại?')) return; start(); };
  $('kcAgain').onclick = start;
  $('kcBack').onclick = function () { if (midGame() && !confirm('Đang giữa ván. Thoát về cài đặt và bỏ kết quả hiện tại?')) return; toSetup(); };
  $('kcToSetup').onclick = toSetup;
  function setPause(v) {
    if (phase !== 'play' || paused === v) return;
    paused = v;
    if (paused) remain = Math.max(0, endAt - Date.now()); else endAt = Date.now() + remain;
    el.pause.textContent = paused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
  }
  el.pause.onclick = function () { setPause(!paused); };
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
    var sk = e.target.closest('.kc-skip');
    if (sk) { var ti = +sk.getAttribute('data-t'), TT = teams[ti]; if (TT && !TT.locked && !paused && (phase === 'play' || phase === 'count')) { TT.turn++; renderTeam(ti); } return; }
    var b = e.target.closest('.kc-opt'); if (!b) return;
    answer(+b.getAttribute('data-t'), +b.getAttribute('data-o'));
  });
  document.addEventListener('keydown', function (e) {
    if (phase !== 'play' || !el.stage.classList.contains('on') || !el.stage.getClientRects().length) return;
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
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
               'TUYỆT ĐỐI KHÔNG hỏi: thông tin hành chính (tên trường, lớp, năm học, ngày giờ, thời lượng, tên giáo viên, tên tác giả, tiêu đề đề thi), chi tiết phụ, câu đố mẹo, và các số liệu / tên riêng / kết quả của một ví dụ cụ thể trong tài liệu mà câu hỏi không nêu lại đầy đủ. ' +
               'Nếu tài liệu là đề thi / đề kiểm tra / bài tập thì hãy ra câu hỏi về chính kiến thức và kĩ năng mà các bài đó cần (không hỏi về bản thân đề). ' +
               '' :
               'về chủ đề: "' + topic + '", tập trung vào kiến thức cốt lõi, không hỏi chi tiết lan man. ') +
      'NGUYÊN TẮC QUAN TRỌNG NHẤT — MỖI CÂU PHẢI TỰ ĐỦ, ĐỘC LẬP: học sinh chỉ nhìn thấy câu hỏi và 4 đáp án trên màn hình, KHÔNG có tài liệu trong tay. Một học sinh đã học bài phải trả lời được chỉ bằng kiến thức của bài học và các dữ kiện ghi ngay trong câu hỏi. Vì vậy: ' +
      '(1) Hỏi về kiến thức tổng quát của bài (khái niệm, định nghĩa, tính chất, công thức, quy tắc, cách làm), HOẶC một bài tập nhỏ mà MỌI dữ kiện cần thiết (số liệu, đối tượng, đơn vị, điều kiện) đều được viết đầy đủ trong câu hỏi. ' +
      '(2) KHÔNG hỏi về số liệu, kết quả, nhân vật hay tình huống của một ví dụ / bài tập trong tài liệu nếu câu hỏi không nêu đủ dữ kiện. SAI: "Thực tế hợp tác xã đã đánh bắt được tổng cộng bao nhiêu tấn cá?" (không biết kế hoạch, không biết tỉ lệ). ĐÚNG: "Một hợp tác xã có kế hoạch đánh bắt 80 tấn cá, thực tế đạt 125% kế hoạch. Thực tế đánh bắt được bao nhiêu tấn cá?". Khi lấy bài tập từ tài liệu làm câu hỏi, hãy chép lại đủ đề bài vào câu hỏi rồi chỉ hỏi một ý. ' +
      '(3) Cấm các cụm phụ thuộc ngữ cảnh: "theo tài liệu", "theo đề bài", "ở ví dụ trên", "trong hình", "bảng trên", "bài toán trên", "đoạn văn trên", và các từ như "thực tế", "kế hoạch", "dự kiến" khi chưa nêu rõ chúng là gì. Không dùng đại từ chỉ thứ chưa được nhắc trong câu. ' +
      '(4) Mỗi câu chỉ có MỘT đáp án đúng, tính được hoặc suy ra được. Hãy tự giải lại từng câu để kiểm tra đáp án trước khi trả về; các câu không được trùng ý nhau; nếu không thể viết thành câu độc lập thì bỏ câu đó và chọn ý khác. ' +
      '(5) Với bài toán có lời văn, nêu rõ đại lượng cần tìm và đơn vị. ' +
      'ĐỘ DÀI: câu hỏi kiến thức thì ngắn gọn (khoảng 20 từ); câu có nêu dữ kiện bài toán được dài tới khoảng 40 từ — ưu tiên đủ dữ kiện hơn là ngắn. Mỗi đáp án tối đa 6 từ hoặc một biểu thức ngắn. ' +
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
      var arr; try { arr = JSON.parse(fixJson(t)); } catch (e1) { arr = JSON.parse(t); }
      if (arr && !Array.isArray(arr)) arr = arr.questions || arr.items || arr.data || [];
      var lines = [];
      arr.forEach(function (x) {
        if (!x || !x.q || !Array.isArray(x.options) || x.options.length < 2 || x.answer == null) return;
        if (aiDoc && /năm học\s*\d{4}|khảo sát tháng|theo (tài liệu|đề bài|đoạn văn|văn bản|bài đọc|bảng|hình)|(ở|trong) (ví dụ|đề|bài|bảng|hình|đoạn) (trên|này|sau)|(bài toán|ví dụ|bảng|hình vẽ|đoạn văn|đề bài) (trên|nêu trên)|tên (trường|giáo viên)/i.test(x.q)) return;
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

  /* Tự tạm dừng khi chuyển cửa sổ / ẩn tab, để đồng hồ không chạy ngầm (không tự tiếp tục: cô bấm ▶ khi sẵn sàng) */
  document.addEventListener('visibilitychange', function () { if (document.hidden) setPause(true); });
  setInterval(function () { if (phase === 'play' && !paused && !el.stage.getClientRects().length) setPause(true); }, 500);
})();
