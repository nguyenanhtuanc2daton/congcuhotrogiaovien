/* Bộ đếm lượt truy cập — chú mèo ngồi trên bảng số (hiện ở chân trang, mọi tab).
   Nguồn số: GoatCounter (chính); nếu lỗi thì thử Abacus, rồi CounterAPI. Chạm vào mèo: mèo kêu "Meo~" (nếu chưa đếm được thì thử lại). */
(function(){
  'use strict';
  var GC='https://nguyentuan.goatcounter.com';
  var AB='https://abacus.jasoncameron.dev';                            /* dự phòng 1 */
  var NS='nguyentuan-pages-dev',KEYN='visits';
  var CA='https://api.counterapi.dev/v1/'+NS+'/'+KEYN;                 /* dự phòng 2 */
  var SUB='Cảm ơn quý thầy cô đã ghé thăm! <span class="cc-heart">❤️</span>';
  var SAY=['Meo~ 🐾','Cảm ơn thầy cô đã ghé thăm!','Meo meo! 💖','Chúc thầy cô một ngày vui!'];
  var still=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;

  var css=
'#siteFoot{margin:22px auto 0;padding:0 0 76px;text-align:center}\n'+
'.cc{display:flex;flex-direction:column;align-items:center;width:fit-content;max-width:100%;margin:6px auto 0;position:relative;animation:ccIn .7s ease-out both}\n'+
'.cc-cat{position:relative;z-index:2;width:112px;height:auto;margin-bottom:-13px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;overflow:visible}\n'+
'.cc-board{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:7px;padding:17px 22px 11px;box-sizing:border-box;max-width:100%;border-radius:22px;\n'+
'  background:color-mix(in srgb,var(--card,#131c2e) 92%,transparent);border:2px solid var(--cy,#ffd166);box-shadow:0 10px 26px -12px rgba(0,0,0,.6),0 0 22px -8px var(--tod-glow,rgba(255,209,102,.4))}\n'+
'.cc-lab{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mut,#c3e4ea)}\n'+
'.cc-digits{display:flex;gap:5px;direction:ltr}\n'+
'.cc-d{position:relative;min-width:30px;padding:6px 4px;text-align:center;font:800 28px/1.1 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;font-variant-numeric:tabular-nums;\n'+
'  color:var(--cy,#ffd166);background:linear-gradient(180deg,rgba(255,255,255,.08) 0,rgba(255,255,255,0) 50%),var(--card2,#0a0f26);border:1px solid var(--bd,#2a3b5c);border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}\n'+
'.cc-sub{max-width:330px;font-size:12px;line-height:1.4;text-align:center;color:var(--mut,#c3e4ea)}\n'+
'.cc-say{position:absolute;z-index:3;top:-2px;left:calc(50% + 30px);max-width:170px;padding:5px 11px;border-radius:14px 14px 14px 3px;background:#fff;color:#4a2b17;font-size:13px;font-weight:700;line-height:1.3;box-shadow:0 4px 12px rgba(0,0,0,.3);opacity:0;transform:translateY(6px) scale(.9);transition:opacity .2s,transform .2s;pointer-events:none}\n'+
'.cc-say.on{opacity:1;transform:none}\n'+
'.cc-q{display:none}.cc.sad .cc-q{display:block}\n'+
'.cc .tail{transform-origin:92px 88px;animation:ccTail 2.4s ease-in-out infinite}\n'+
'.cc .eye{transform-box:fill-box;transform-origin:center;animation:ccBlink 4.2s infinite}\n'+
'.cc .head{transform-origin:60px 70px;animation:ccBob 3.6s ease-in-out infinite}\n'+
'.cc-cat.hop{animation:ccHop .5s ease-out}\n'+
'@keyframes ccTail{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(11deg)}}\n'+
'@keyframes ccBlink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}\n'+
'@keyframes ccBob{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}\n'+
'@keyframes ccHop{0%{transform:translateY(0)}35%{transform:translateY(-14px)}70%{transform:translateY(0)}85%{transform:translateY(-4px)}100%{transform:translateY(0)}}\n'+
'.cc-heart{display:inline-block;animation:ccHeart 1s ease-in-out infinite}\n'+
'@keyframes ccHeart{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.8)}}\n'+
'@keyframes ccIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n'+
'@media (max-width:480px){.cc-d{min-width:26px;font-size:24px;padding:5px 3px}.cc-board{padding:16px 16px 9px}.cc-cat{width:100px}}\n'+
'html.tod-nofx .cc .tail,html.tod-nofx .cc .eye,html.tod-nofx .cc .head{animation:none}\n'+
'@media (prefers-reduced-motion:reduce){.cc,.cc .tail,.cc .eye,.cc .head,.cc-cat.hop{animation:none}}\n'+
'@media print{#siteFoot{display:none!important}}\n';

  var CAT='<svg class="cc-cat" viewBox="0 0 120 106" role="img" aria-label="Chú mèo đếm lượt truy cập">'+
    '<path class="tail" d="M90 90C112 88 118 64 104 56" fill="none" stroke="#f59e4b" stroke-width="9" stroke-linecap="round"/>'+
    '<ellipse cx="60" cy="88" rx="31" ry="24" fill="#ffb067"/><ellipse cx="60" cy="94" rx="17" ry="14" fill="#ffe3c2"/>'+
    '<g class="head">'+
      '<path d="M33 36L35 9L55 26Z" fill="#ffb067"/><path d="M38 31L39 17L49 26Z" fill="#ff9fb0"/>'+
      '<path d="M87 36L85 9L65 26Z" fill="#ffb067"/><path d="M82 31L81 17L71 26Z" fill="#ff9fb0"/>'+
      '<ellipse cx="60" cy="50" rx="31" ry="27" fill="#ffb067"/>'+
      '<path d="M60 25v8M51 27l2 6M69 27l-2 6" stroke="#e08a3c" stroke-width="3" stroke-linecap="round"/>'+
      '<g class="eye"><ellipse cx="47" cy="50" rx="4.4" ry="5.4" fill="#2b1a12"/><circle cx="48.6" cy="48" r="1.5" fill="#fff"/></g>'+
      '<g class="eye"><ellipse cx="73" cy="50" rx="4.4" ry="5.4" fill="#2b1a12"/><circle cx="74.6" cy="48" r="1.5" fill="#fff"/></g>'+
      '<circle cx="38" cy="60" r="5" fill="#ff8fa3" opacity=".55"/><circle cx="82" cy="60" r="5" fill="#ff8fa3" opacity=".55"/>'+
      '<path d="M56 58h8l-4 4.2z" fill="#ff6f86"/>'+
      '<path d="M60 62v3M60 65q-5 5-10 1M60 65q5 5 10 1" fill="none" stroke="#7a3b22" stroke-width="1.8" stroke-linecap="round"/>'+
      '<path d="M30 56l-14-3M30 61l-14 3M90 56l14-3M90 61l14 3" stroke="#fff3e3" stroke-width="1.6" stroke-linecap="round"/>'+
      '<g class="cc-q"><circle cx="96" cy="14" r="11" fill="#fff"/><text x="96" y="19.5" text-anchor="middle" font-size="16" font-weight="800" fill="#c2410c" font-family="sans-serif">?</text></g>'+
    '</g>'+
    '<ellipse cx="46" cy="101" rx="9" ry="5.5" fill="#ffe3c2" stroke="#e8b98a" stroke-width="1.2"/><ellipse cx="74" cy="101" rx="9" ry="5.5" fill="#ffe3c2" stroke="#e8b98a" stroke-width="1.2"/>'+
    '</svg>';

  var LK='vc_last';   /* số đếm gần nhất lưu trong máy người xem, dùng khi lần sau chưa lấy được số mới */
  function saved(){try{var o=JSON.parse(localStorage.getItem(LK)||'null');if(o&&isFinite(o.n)&&o.n>=0)return o.n;}catch(e){}return null;}
  function save(n){try{localStorage.setItem(LK,JSON.stringify({n:n,t:Date.now()}));}catch(e){}}
  var root,tiles=[],loadId=0,failed=false,sayT=0,shown=null;
  function $(s){return root.querySelector(s);}
  function sub(t){var e=$('.cc-sub');if(e){if(t===SUB)e.innerHTML=t;else e.textContent=t;}}
  function build(len,ch){
    var row=$('.cc-digits');row.innerHTML='';tiles=[];
    for(var i=0;i<len;i++){var s=document.createElement('span');s.className='cc-d';s.textContent=ch;row.appendChild(s);tiles.push(s);}
    return row;
  }
  function paint(v){var t=String(v);while(t.length<tiles.length)t='0'+t;for(var k=0;k<tiles.length;k++)tiles[k].textContent=t.charAt(k);}
  function show(n,instant){
    failed=false;shown=n;$('.cc').classList.remove('sad');
    var row=build(Math.max(4,String(n).length),'0');
    row.setAttribute('role','img');row.setAttribute('aria-label','Số lượt truy cập: '+n.toLocaleString('vi-VN'));
    sub(SUB);
    if(still||instant||n<2){paint(n);return;}
    var t0=null,dur=1300;
    function step(ts){if(t0===null)t0=ts;var p=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-p,3);paint(Math.round(n*e));if(p<1)requestAnimationFrame(step);else paint(n);}
    requestAnimationFrame(step);
  }
  function fail(){
    failed=true;
    var old=saved();
    if(old!==null){   /* có số cũ: vẫn hiện số gần nhất, không hiện dấu ? */
      show(old,true);failed=true;
      sub('Số lượt gần nhất (chưa cập nhật được). Chạm vào mèo để thử lại.');
      return;
    }
    $('.cc').classList.add('sad');build(4,'?');
    sub('Mèo chưa đếm được (có thể trình duyệt đang chặn). Chạm vào mèo để thử lại.');
  }
  function getJSON(url){
    return new Promise(function(ok,no){
      var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ctl)ctl.abort();no(new Error('timeout'));},8000);
      fetch(url,ctl?{signal:ctl.signal}:undefined).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json();})
        .then(function(j){clearTimeout(tm);ok(j);},function(e){clearTimeout(tm);no(e);});
    });
  }
  function num(j){var v=j&&(j.count!==undefined?j.count:(j.value!==undefined?j.value:undefined));var n=parseInt(String(v).replace(/\D/g,''),10);if(!isFinite(n)||n<0)throw new Error('bad');return n;}
  function counted(){try{return sessionStorage.getItem('vc_up')==='1';}catch(e){return false;}}
  function mark(){try{sessionStorage.setItem('vc_up','1');}catch(e){}}
  function viaGC(){return getJSON(GC+'/counter/TOTAL.json').then(num);}
  function viaAB(){return getJSON(AB+(counted()?'/get/':'/hit/')+NS+'/'+KEYN).then(function(j){mark();return num(j);});}
  function viaCA(){return getJSON(CA+(counted()?'':'/up')).then(function(j){mark();return num(j);});}
  function load(){
    var id=++loadId;
    var old=saved();$('.cc').classList.remove('sad');
    if(old!==null){show(old,true);failed=false;sub('Mèo đang cập nhật…');}   /* hiện ngay số cũ trong lúc chờ */
    else{build(4,'·');sub('Mèo đang đếm…');}
    setTimeout(function(){   /* đợi count.js ghi lượt xem hiện tại rồi mới đọc số */
      viaGC().catch(viaAB).catch(viaCA).then(function(n){if(id!==loadId)return;save(n);show(n,shown!==null&&shown===n);},function(){if(id===loadId)fail();});
    },1200);
  }
  function meow(){
    var c=$('.cc-cat'),b=$('.cc-say');
    b.textContent=failed?'Meo? Để mèo thử lại nhé…':SAY[(Math.random()*SAY.length)|0];
    b.classList.add('on');clearTimeout(sayT);sayT=setTimeout(function(){b.classList.remove('on');},1800);
    c.classList.remove('hop');void c.getBoundingClientRect();c.classList.add('hop');
    if(failed)load();
  }
  function init(){
    root=document.getElementById('visitCounter');if(!root)return;
    var st=document.createElement('style');st.id='cc-css';st.textContent=css;document.head.appendChild(st);
    root.className='';root.removeAttribute('hidden');
    root.innerHTML='<div class="cc">'+CAT+'<div class="cc-say" role="status"></div><div class="cc-board"><div class="cc-lab">🐾 Mèo đếm lượt truy cập</div><div class="cc-digits"></div><div class="cc-sub"></div></div></div>';
    $('.cc-cat').addEventListener('click',meow);
    if(document.readyState==='complete')load();else window.addEventListener('load',load);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
