/* ============================================================
   GIAO DIỆN TỰ ĐỔI THEO THỜI ĐIỂM TRONG NGÀY
   Sáng 05–10h · Trưa 11–14h · Chiều 15–18h · Tối 19–04h
   - Chỉ vẽ lớp nền trang trí (position:fixed, z-index:-1, pointer-events:none)
   - Không đụng vào HTML/JS của các công cụ; không chặn chuột/chạm
   - Nút tròn nhỏ ở góc trái dưới để xem thử các giao diện (Tự động → Sáng → Trưa → Chiều → Tối)
   ============================================================ */
(function () {
  'use strict';
  if (window.__todTheme) return;
  window.__todTheme = true;

  var doc = document, root = doc.documentElement;

  /* ---------- Bảng màu từng buổi ---------- */
  var THEMES = {
    sang: {
      label: 'Buổi sáng', icon: '🌅', meta: '#0f2f66',
      sky: 'linear-gradient(180deg,#0f2f66 0%,#1c5da6 34%,#3a8aa0 66%,#b3541f 100%)',
      vars: {
        '--tod-bg': '#0f2f66',
        '--tod-card': 'rgba(12,32,66,.92)', '--tod-card2': 'rgba(18,44,86,.90)',
        '--tod-bd': 'rgba(255,214,140,.32)',
        '--a1': '#c2570c', '--a2': '#d6336c', '--cy': '#ffd36b', '--mut': '#d3dff2', '--fg': '#f4f7ff',
        '--tod-glow': 'rgba(255,184,77,.55)'
      }
    },
    trua: {
      label: 'Buổi trưa', icon: '☀️', meta: '#0a3a92',
      sky: 'linear-gradient(180deg,#0a3a92 0%,#1561b8 45%,#1976a8 100%)',
      vars: {
        '--tod-bg': '#0a3a92',
        '--tod-card': 'rgba(6,38,84,.92)', '--tod-card2': 'rgba(10,50,104,.90)',
        '--tod-bd': 'rgba(255,255,255,.34)',
        '--a1': '#1565c0', '--a2': '#0e7490', '--cy': '#9be7ff', '--mut': '#c4dcf7', '--fg': '#f4f7ff',
        '--tod-glow': 'rgba(255,236,120,.50)'
      }
    },
    chieu: {
      label: 'Buổi chiều', icon: '🌇', meta: '#2a0f52',
      sky: 'linear-gradient(180deg,#2a0f52 0%,#7a2a78 34%,#cf3f68 68%,#b64a16 100%)',
      vars: {
        '--tod-bg': '#2a0f52',
        '--tod-card': 'rgba(44,14,60,.92)', '--tod-card2': 'rgba(58,20,74,.90)',
        '--tod-bd': 'rgba(255,170,120,.36)',
        '--a1': '#c2185b', '--a2': '#7b2cbf', '--cy': '#ffb38a', '--mut': '#e3cde3', '--fg': '#f4f7ff',
        '--tod-glow': 'rgba(255,120,100,.55)'
      }
    },
    dem: {
      label: 'Buổi tối', icon: '🌙', meta: '#040b20',
      sky: 'linear-gradient(180deg,#040b20 0%,#0d1745 55%,#2a1b5e 100%)',
      vars: {
        '--tod-bg': '#040b20',
        '--tod-card': 'rgba(8,14,40,.92)', '--tod-card2': 'rgba(14,22,56,.92)',
        '--tod-bd': 'rgba(150,180,255,.32)',
        '--a1': '#4f5bf0', '--a2': '#a02ee0', '--cy': '#38bdf8', '--mut': '#a9b6d0', '--fg': '#f4f7ff',
        '--tod-glow': 'rgba(130,150,255,.50)'
      }
    }
  };
  var ORDER = ['sang', 'trua', 'chieu', 'dem'];

  function periodOf(h) {
    if (h >= 5 && h < 11) return 'sang';
    if (h >= 11 && h < 15) return 'trua';
    if (h >= 15 && h < 19) return 'chieu';
    return 'dem';
  }

  /* ---------- CSS ---------- */
  var css = '';
  ORDER.forEach(function (k) {
    var v = THEMES[k].vars, s = 'html[data-tod="' + k + '"]{';
    for (var p in v) s += p + ':' + v[p] + ';';
    /* Ghi đè các biến thường gặp của trang (nếu style.css có dùng) */
    s += '--bg:' + v['--tod-bg'] + ';--card:' + v['--tod-card'] + ';--card2:' + v['--tod-card2'] + ';--bd:' + v['--tod-bd'] + ';';
    css += s + 'background:' + v['--tod-bg'] + '}';
  });

  css += [
    'html[data-tod] body{background:transparent!important}',
    '#tod-root{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;contain:strict}',
    '.tod-layer{position:absolute;inset:0;opacity:0;transition:opacity 1.8s ease;overflow:hidden}',
    '.tod-layer.show{opacity:1}',
    '.tod-sky{position:absolute;inset:0;background-size:100% 135%;animation:todSky 45s ease-in-out infinite alternate}',
    '@keyframes todSky{from{background-position:0 0}to{background-position:0 100%}}',

    /* Mặt trời */
    '.tod-sunwrap{position:absolute;width:0;height:0}',
    '.tod-glow,.tod-disc,.tod-rays{position:absolute;left:0;top:0;border-radius:50%;transform:translate(-50%,-50%)}',
    '.tod-glow{width:var(--g);height:var(--g);background:radial-gradient(circle,var(--c1) 0,var(--c2) 35%,transparent 70%);animation:todPulse var(--pt,7s) ease-in-out infinite}',
    '.tod-disc{width:var(--d);height:var(--d);background:radial-gradient(circle at 40% 38%,#fff 0,var(--dc1) 45%,var(--dc2) 100%);box-shadow:0 0 50px 12px var(--c2)}',
    '.tod-rays{width:var(--rs);height:var(--rs);background:repeating-conic-gradient(var(--rc) 0 5deg,transparent 5deg 15deg);-webkit-mask-image:radial-gradient(circle,#000 0,transparent 66%);mask-image:radial-gradient(circle,#000 0,transparent 66%);animation:todSpin 140s linear infinite;will-change:transform}',
    '@keyframes todPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.85}50%{transform:translate(-50%,-50%) scale(1.12);opacity:1}}',
    '@keyframes todSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}',

    /* Mây */
    '.tod-cloud{position:absolute;left:0;top:var(--y);width:var(--w);height:calc(var(--w)*.26);border-radius:999px;background:var(--cc);animation:todCloud var(--t) linear infinite;animation-delay:var(--d);will-change:transform}',
    '.tod-cloud:before,.tod-cloud:after{content:"";position:absolute;background:inherit;border-radius:50%}',
    '.tod-cloud:before{width:42%;height:160%;left:14%;top:-75%}',
    '.tod-cloud:after{width:32%;height:125%;left:50%;top:-48%}',
    '@keyframes todCloud{from{transform:translateX(-340px)}to{transform:translateX(calc(100vw + 60px))}}',

    /* Sương mù buổi sáng */
    '.tod-mist{position:absolute;left:-20%;width:140%;height:26vh;bottom:var(--b);background:linear-gradient(0deg,transparent,rgba(255,255,255,.16),transparent);animation:todMist var(--t) ease-in-out infinite alternate}',
    '@keyframes todMist{from{transform:translateX(-6%)}to{transform:translateX(6%)}}',

    /* Hạt sáng bay lên (bụi vàng, đốm lửa, đom đóm) */
    '.tod-p{position:absolute;bottom:-24px;left:var(--x);width:var(--s);height:var(--s);border-radius:50%;background:var(--pc);box-shadow:0 0 calc(var(--s)*3) var(--pc);opacity:0;animation:todRise var(--t) linear infinite;animation-delay:var(--d)}',
    '@keyframes todRise{0%{transform:translate(0,0);opacity:0}10%{opacity:.9}85%{opacity:.7}100%{transform:translate(var(--dx),-108vh);opacity:0}}',

    /* Bokeh buổi trưa */
    '.tod-orb{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.07);animation:todFloat var(--t) ease-in-out infinite alternate;animation-delay:var(--d)}',
    '@keyframes todFloat{from{transform:translate(0,0) scale(1)}to{transform:translate(var(--dx),var(--dy)) scale(1.18)}}',

    /* Chim */
    '.tod-bird{position:absolute;left:0;top:var(--y);animation:todFly var(--t) linear infinite;animation-delay:var(--d);will-change:transform}',
    '.tod-bird svg{display:block;transform-origin:50% 85%;animation:todFlap .55s ease-in-out infinite}',
    '@keyframes todFly{from{transform:translate(-60px,0)}to{transform:translate(calc(100vw + 60px),var(--dy))}}',
    '@keyframes todFlap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.3)}}',

    /* Đồi núi */
    '.tod-hills{position:absolute;left:0;bottom:0;width:100%;height:20vh;min-height:110px;display:block}',

    /* Sao, trăng, sao băng */
    '.tod-star{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border-radius:50%;background:var(--sc,#fff);animation:todTw var(--t) ease-in-out infinite;animation-delay:var(--d)}',
    '@keyframes todTw{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.35)}}',
    '.tod-moon{position:absolute;left:80%;top:11%;width:78px;height:78px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff 0,#f4efd0 60%,#d6cf9f 100%);animation:todMoon 8s ease-in-out infinite}',
    '@keyframes todMoon{0%,100%{box-shadow:0 0 40px 10px rgba(255,248,200,.40),0 0 120px 40px rgba(150,170,255,.25)}50%{box-shadow:0 0 52px 14px rgba(255,248,200,.55),0 0 140px 50px rgba(150,170,255,.35)}}',
    '.tod-shoot{position:absolute;left:var(--x);top:var(--y);width:150px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#fff);opacity:0;animation:todShoot 11s ease-in infinite;animation-delay:var(--d)}',
    '@keyframes todShoot{0%{opacity:0;transform:translate(0,0) rotate(35deg)}2%{opacity:1}12%{opacity:0;transform:translate(280px,196px) rotate(35deg)}100%{opacity:0;transform:translate(280px,196px) rotate(35deg)}}',

    /* Điểm nhấn giao diện (chỉ màu/viền/bóng, không đổi bố cục) */
    'html[data-tod] .hero{box-shadow:0 12px 34px -10px var(--tod-glow)}',

    /* Nút chọn giao diện */
    '#tod-btn{position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:9000;width:40px;height:40px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.45);background:rgba(0,0,0,.42);color:#fff;font-size:19px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.8;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .2s,transform .2s}',
    '#tod-btn:hover,#tod-btn:focus-visible{opacity:1;transform:scale(1.08)}',
    '#tod-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '#tod-tip{position:fixed;left:58px;bottom:calc(17px + env(safe-area-inset-bottom,0px));z-index:9000;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.62);color:#fff;font-size:13px;font-weight:600;white-space:nowrap;opacity:0;transform:translateX(-6px);transition:opacity .25s,transform .25s;pointer-events:none}',
    '#tod-tip.on{opacity:1;transform:none}',

    /* Tạm dừng khi ẩn tab; tắt chuyển động nếu người dùng chọn giảm chuyển động */
    '.tod-paused .tod-layer *{animation-play-state:paused!important}',
    '@media (prefers-reduced-motion:reduce){.tod-layer *{animation:none!important}.tod-layer{transition:none}}'
  ].join('\n');

  var style = doc.createElement('style');
  style.id = 'tod-css';
  style.textContent = css;
  (doc.head || root).appendChild(style);

  /* ---------- Hàm dựng phần tử ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function el(cls, vars, html) {
    var d = doc.createElement('div');
    d.className = cls;
    if (vars) {
      var s = '';
      for (var k in vars) s += k + ':' + vars[k] + ';';
      d.style.cssText = s;
    }
    if (html) d.innerHTML = html;
    return d;
  }

  function sun(layer, o) {
    var w = el('tod-sunwrap');
    w.style.left = o.x; w.style.top = o.y;
    var vars = {
      '--g': o.g, '--d': o.d, '--rs': 'min(1500px,200vmax)',
      '--c1': o.c1, '--c2': o.c2, '--dc1': o.dc1, '--dc2': o.dc2, '--rc': o.rc, '--pt': o.pt || '7s'
    };
    var s = '';
    for (var k in vars) s += k + ':' + vars[k] + ';';
    w.style.cssText += s;
    w.appendChild(el('tod-rays'));
    w.appendChild(el('tod-glow'));
    w.appendChild(el('tod-disc'));
    layer.appendChild(w);
  }

  function clouds(layer, n, color, yMin, yMax, tMin, tMax) {
    for (var i = 0; i < n; i++) {
      var t = rnd(tMin, tMax);
      layer.appendChild(el('tod-cloud', {
        '--y': rnd(yMin, yMax).toFixed(1) + '%',
        '--w': Math.round(rnd(150, 300)) + 'px',
        '--t': t.toFixed(0) + 's',
        '--d': (-rnd(0, t)).toFixed(1) + 's',
        '--cc': color
      }));
    }
  }

  function particles(layer, n, color, sMin, sMax, tMin, tMax, drift) {
    for (var i = 0; i < n; i++) {
      var t = rnd(tMin, tMax);
      layer.appendChild(el('tod-p', {
        '--x': rnd(0, 100).toFixed(1) + '%',
        '--s': rnd(sMin, sMax).toFixed(1) + 'px',
        '--t': t.toFixed(1) + 's',
        '--d': (-rnd(0, t)).toFixed(1) + 's',
        '--dx': Math.round(rnd(-drift, drift)) + 'px',
        '--pc': color
      }));
    }
  }

  function birds(layer, n, color, yMin, yMax) {
    var svg = '<svg viewBox="0 0 30 12" width="' + 26 + '" height="11" aria-hidden="true"><path d="M1 9 Q8 -1 15 7 Q22 -1 29 9" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/></svg>';
    for (var i = 0; i < n; i++) {
      var t = rnd(26, 44);
      layer.appendChild(el('tod-bird', {
        '--y': rnd(yMin, yMax).toFixed(1) + '%',
        '--dy': Math.round(rnd(-70, 40)) + 'px',
        '--t': t.toFixed(0) + 's',
        '--d': (-rnd(0, t)).toFixed(1) + 's'
      }, svg));
    }
  }

  function hills(layer, c1, c2) {
    var d = doc.createElement('div');
    d.innerHTML = '<svg class="tod-hills" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 120 C150 60 300 150 480 100 S800 40 1000 110 S1150 90 1200 80 V220 H0Z" fill="' + c1 + '"/>' +
      '<path d="M0 170 C200 120 380 190 600 150 S950 120 1200 160 V220 H0Z" fill="' + c2 + '"/></svg>';
    layer.appendChild(d.firstChild);
  }

  function stars(layer, n) {
    var cols = ['#fff', '#fff', '#fff', '#cfe0ff', '#ffe9b0'];
    for (var i = 0; i < n; i++) {
      var t = rnd(2.2, 5);
      layer.appendChild(el('tod-star', {
        '--x': rnd(0, 100).toFixed(1) + '%',
        '--y': rnd(0, 78).toFixed(1) + '%',
        '--s': rnd(1.4, 3.2).toFixed(1) + 'px',
        '--t': t.toFixed(1) + 's',
        '--d': (-rnd(0, t)).toFixed(1) + 's',
        '--sc': cols[Math.floor(Math.random() * cols.length)]
      }));
    }
  }

  /* ---------- Dựng từng giao diện ---------- */
  var BUILD = {
    sang: function (L) {
      /* Bình minh: mặt trời mọc ở chân trời, sương mỏng, bụi vàng, vài cánh chim */
      sun(L, { x: '18%', y: '100%', g: '620px', d: '150px', pt: '8s',
        c1: 'rgba(255,214,120,.50)', c2: 'rgba(255,150,60,.26)', dc1: '#fff1b0', dc2: '#ffb347', rc: 'rgba(255,230,160,.10)' });
      clouds(L, 3, 'rgba(255,226,190,.22)', 8, 40, 90, 150);
      L.appendChild(el('tod-mist', { '--b': '4vh', '--t': '26s' }));
      L.appendChild(el('tod-mist', { '--b': '14vh', '--t': '34s' }));
      particles(L, 20, 'rgba(255,224,130,.95)', 2, 5, 16, 30, 70);
      birds(L, 4, 'rgba(20,45,90,.75)', 14, 46);
      hills(L, '#0f3d4a', '#0a2b36');
    },
    trua: function (L) {
      /* Nắng trưa: mặt trời chói ở góc trên, tia nắng xoay, mây trắng trôi, bokeh */
      sun(L, { x: '84%', y: '13%', g: '480px', d: '96px', pt: '5s',
        c1: 'rgba(255,250,200,.60)', c2: 'rgba(255,225,100,.25)', dc1: '#fffbe0', dc2: '#ffe066', rc: 'rgba(255,255,255,.12)' });
      clouds(L, 6, 'rgba(255,255,255,.30)', 6, 62, 70, 130);
      for (var i = 0; i < 9; i++) {
        L.appendChild(el('tod-orb', {
          '--x': rnd(2, 92).toFixed(1) + '%', '--y': rnd(6, 86).toFixed(1) + '%',
          '--s': Math.round(rnd(26, 90)) + 'px', '--t': rnd(9, 18).toFixed(1) + 's',
          '--d': (-rnd(0, 9)).toFixed(1) + 's',
          '--dx': Math.round(rnd(-40, 40)) + 'px', '--dy': Math.round(rnd(-40, 40)) + 'px'
        }));
      }
      particles(L, 10, 'rgba(255,255,255,.9)', 2, 4, 14, 26, 40);
    },
    chieu: function (L) {
      /* Hoàng hôn: mặt trời lớn đỏ cam lặn sau đồi, đàn chim bay về, đốm lửa */
      sun(L, { x: '74%', y: '84%', g: '800px', d: '230px', pt: '6s',
        c1: 'rgba(255,170,90,.50)', c2: 'rgba(255,70,90,.25)', dc1: '#ffe08a', dc2: '#ff6a3d', rc: 'rgba(255,190,120,.08)' });
      clouds(L, 4, 'rgba(255,170,150,.24)', 10, 52, 80, 140);
      particles(L, 18, 'rgba(255,170,90,.95)', 2, 5, 14, 28, 90);
      birds(L, 6, 'rgba(40,10,50,.8)', 16, 55);
      hills(L, '#3a1450', '#220a33');
    },
    dem: function (L) {
      /* Đêm: sao nhấp nháy, trăng sáng, thỉnh thoảng có sao băng */
      stars(L, 70);
      L.appendChild(el('tod-moon'));
      L.appendChild(el('tod-shoot', { '--x': '18%', '--y': '8%', '--d': '3s' }));
      L.appendChild(el('tod-shoot', { '--x': '55%', '--y': '4%', '--d': '9s' }));
      particles(L, 8, 'rgba(190,210,255,.85)', 2, 4, 20, 34, 50);
      hills(L, '#0a1030', '#060a20');
    }
  };

  function buildLayer(name) {
    var L = el('tod-layer');
    var sky = el('tod-sky');
    sky.style.background = THEMES[name].sky;
    sky.style.backgroundSize = '100% 135%';
    L.appendChild(sky);
    BUILD[name](L);
    return L;
  }

  /* ---------- Áp dụng giao diện ---------- */
  var rootEl = null, cur = '', mode = 'auto', btn = null, tip = null, tipTimer = 0;

  function setMeta(color) {
    var m = doc.querySelector('meta[name="theme-color"]');
    if (!m) { m = doc.createElement('meta'); m.name = 'theme-color'; (doc.head || root).appendChild(m); }
    m.content = color;
  }

  function apply(name) {
    if (name === cur || !THEMES[name]) return;
    cur = name;
    root.setAttribute('data-tod', name);
    setMeta(THEMES[name].meta);
    if (!rootEl) return;
    var olds = Array.prototype.slice.call(rootEl.querySelectorAll('.tod-layer'));
    var L = buildLayer(name);
    rootEl.appendChild(L);
    requestAnimationFrame(function () { requestAnimationFrame(function () { L.classList.add('show'); }); });
    setTimeout(function () { olds.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); }); }, 2200);
    updateBtn();
  }

  function currentName() {
    return mode === 'auto' ? periodOf(new Date().getHours()) : mode;
  }

  function tick() { apply(currentName()); }

  /* ---------- Nút xem thử ---------- */
  function modeText() {
    return mode === 'auto' ? 'Tự động theo giờ · ' + THEMES[cur].label : THEMES[mode].label + ' (cố định)';
  }
  function updateBtn() {
    if (!btn) return;
    btn.textContent = mode === 'auto' ? '🎨' : THEMES[mode].icon;
    var t = 'Giao diện: ' + modeText() + '. Bấm để đổi.';
    btn.title = t; btn.setAttribute('aria-label', t);
  }
  function showTip(text) {
    if (!tip) return;
    tip.textContent = text; tip.classList.add('on');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tip.classList.remove('on'); }, 2400);
  }
  function saveMode() { try { localStorage.setItem('tod_mode', mode); } catch (e) {} }

  function makeButton() {
    btn = doc.createElement('button');
    btn.id = 'tod-btn'; btn.type = 'button';
    tip = doc.createElement('div');
    tip.id = 'tod-tip'; tip.setAttribute('aria-hidden', 'true');
    /* Không để cú bấm lọt xuống hiệu ứng thả tim / các bộ lắng nghe chung của trang */
    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function (ev) {
      btn.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
    });
    btn.addEventListener('click', function () {
      var seq = ['auto'].concat(ORDER);
      mode = seq[(seq.indexOf(mode) + 1) % seq.length];
      saveMode();
      apply(currentName());
      updateBtn();
      showTip(modeText());
    });
    doc.body.appendChild(btn);
    doc.body.appendChild(tip);
    updateBtn();
  }

  /* ---------- Khởi động ---------- */
  try {
    var q = /[?&]giaodien=(sang|trua|chieu|dem|auto)\b/.exec(location.search);
    var saved = q ? q[1] : localStorage.getItem('tod_mode');
    if (saved && (saved === 'auto' || THEMES[saved])) mode = saved;
  } catch (e) {}

  /* Đặt màu nền ngay từ đầu để không bị chớp giao diện cũ */
  cur = ''; apply(currentName());

  function init() {
    if (rootEl) return;
    rootEl = doc.createElement('div');
    rootEl.id = 'tod-root'; rootEl.setAttribute('aria-hidden', 'true');
    doc.body.insertBefore(rootEl, doc.body.firstChild);
    var name = cur; cur = ''; apply(name);
    makeButton();
    setInterval(tick, 60000);
    doc.addEventListener('visibilitychange', function () {
      root.classList.toggle('tod-paused', doc.hidden);
      if (!doc.hidden) tick();
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
