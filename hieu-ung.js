/* Hiệu ứng giao diện: màn chào, sao băng, trái tim (mỗi khối chạy độc lập: lỗi ở khối này không làm hỏng khối khác) */
try{
/* Màn chào: thẻ nhanh = bấm đúng nút tab; logo/tiêu đề = quay về màn chào */
(function(){
  var t0=document.getElementById('t0');
  if(!t0) return;
  t0.addEventListener('click',function(e){
    var c=e.target.closest('.lp-card'); if(!c) return;
    var b=document.querySelector('.tab[data-tab="'+c.getAttribute('data-go')+'"]');
    if(b) b.click();                       // dùng lại logic chuyển tab sẵn có (đã ẩn t0 + phát 'tabshow')
  });
  function home(){
    document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('on');});
    document.querySelectorAll('.panel').forEach(function(p){p.classList.toggle('on',p.id==='t0');});
    window.scrollTo({top:0,behavior:'smooth'});
  }
  ['.hero .logo','.hero h1'].forEach(function(s){
    var el=document.querySelector(s); if(!el) return;
    el.setAttribute('role','button'); el.setAttribute('tabindex','0'); el.title='Về màn chào';
    el.addEventListener('click',home);
    el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();home();}});
  });
})();
}catch(e){console.error('hieu-ung:',e)}
try{
/* Sao băng: mỗi khi một vòng hoạt ảnh kết thúc, đổi sang vị trí/hướng mới (sự kiện, không có vòng lặp JS).
   Sao bắt đầu ở hai dải trời hai bên và bay ra xa, không cắt ngang bảng. */
(function(){
  var st=document.querySelector('#t0 .lp-stage'); if(!st) return;
  st.addEventListener('animationiteration',function(e){
    var s=e.target; if(!s.classList||!s.classList.contains('lp-ss')) return;
    var left=Math.random()<.5, r=Math.random;
    s.style.setProperty('--x',(left?4+r()*20:76+r()*20).toFixed(1)+'%');
    s.style.setProperty('--y',(4+r()*34).toFixed(1)+'%');
    s.style.setProperty('--a',(left?125+r()*25:25+r()*25).toFixed(0)+'deg');
  });
})();
}catch(e){console.error('hieu-ung:',e)}
try{
/* Con trỏ trái tim + vệt tim khi rê chuột / nổ tim khi bấm. Nhẹ: chỉ tạo phần tử khi chuột di chuyển đủ xa, tối đa 36 tim cùng lúc. */
(function(){
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  var root=document.documentElement, on=true, live=0, lx=-99, ly=-99, lt=0;
  try{ if(localStorage.getItem('hc')==='0') on=false; }catch(e){}
  root.classList.toggle('hc',on);
  var still=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var COL=['#ff4d8d','#ff7aa8','#f43f5e','#ff9ec4','#fbbf24','#c084fc'];
  function heart(x,y,big,ang){
    if(still||live>=36) return;
    var h=document.createElement('span'); h.className='hc-h'; h.textContent='♥';
    var r=Math.random(), a=ang!=null?ang:(-Math.PI/2+(r-.5)*1.4), d=big?38+r*34:14+r*22;
    h.style.cssText='left:'+x+'px;top:'+y+'px;--s:'+(big?16+r*10:9+r*9)+'px;--c:'+COL[(Math.random()*COL.length)|0]+
      ';--dx:'+Math.round(Math.cos(a)*d)+'px;--dy:'+Math.round(-Math.sin(a)*d+(big?0:18))+'px;--r:'+Math.round((r-.5)*50)+'deg;--t:'+Math.round(700+r*600)+'ms';
    live++; h.addEventListener('animationend',function(){h.remove();live--;});
    document.body.appendChild(h);
  }
  document.addEventListener('pointermove',function(e){
    if(!on||e.pointerType!=='mouse'||(e.target.closest&&e.target.closest('.gm-board'))) return;
    var n=performance.now(); if(n-lt<45) return;
    var dx=e.clientX-lx, dy=e.clientY-ly; if(dx*dx+dy*dy<576) return;   // >=24px mới nhả tim
    lt=n; lx=e.clientX; ly=e.clientY; heart(lx,ly,false);
  },{passive:true});
  document.addEventListener('pointerdown',function(e){
    if(!on||e.pointerType!=='mouse'||(e.target.closest&&e.target.closest('.gm-board'))) return;
    for(var i=0;i<7;i++) heart(e.clientX,e.clientY,true,i*Math.PI*2/7);
  },{passive:true});
  var b=document.createElement('button'); b.id='hcBtn'; b.type='button'; b.textContent='♥';
  function lab(){ b.title=on?'Tắt hiệu ứng trái tim':'Bật hiệu ứng trái tim'; b.setAttribute('aria-label',b.title); b.setAttribute('aria-pressed',on); }
  b.addEventListener('click',function(){ on=!on; root.classList.toggle('hc',on); lab(); try{localStorage.setItem('hc',on?'1':'0');}catch(e){} });
  lab(); document.body.appendChild(b);
})();
}catch(e){console.error('hieu-ung:',e)}
try{
/* Tim bay lên khi chạm màn hình (ngón tay/bút). Không chặn cuộn trang, không vòng lặp JS, tối đa 48 tim cùng lúc.
   Dùng chung khoá 'hc' với nút ♥ (bật/tắt); tự thêm nút ♥ nếu thiết bị chỉ có cảm ứng. */
(function(){
  var root=document.documentElement, live=0, MAX=48;
  var still=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var COL=['#ff4d8d','#ff7aa8','#f43f5e','#ff9ec4','#ff5c9a','#c084fc','#fbbf24'];
  var SKIP='input,textarea,select,#gcv,#hcBtn,.gm-board,[contenteditable="true"]';
  function enabled(){ try{ return localStorage.getItem('hc')!=='0'; }catch(e){ return true; } }
  function heart(x,y,i,trail){
    if(live>=MAX) return;
    var r=Math.random, h=document.createElement('span'), big=!trail&&r()<.25;
    var size=trail?12+r()*10:(big?28+r()*8:16+r()*12);
    var rise=Math.min(trail?150:260,window.innerHeight*.34)*(.65+r()*.5);
    var sway=(12+r()*22)*(r()<.5?-1:1), dur=(trail?1300:1500)+r()*900, dl=trail?0:i*55;
    h.className='hc-h th'; h.textContent='\u2665\uFE0E';
    h.style.cssText='left:'+x+'px;top:'+y+'px;--s:'+size.toFixed(0)+'px;--c:'+COL[(r()*COL.length)|0]+
      ';--dy:'+rise.toFixed(0)+'px;--sx:'+sway.toFixed(0)+'px;--dx:'+((r()-.5)*70).toFixed(0)+'px;--r:'+Math.round((r()-.5)*60)+
      'deg;--t:'+dur.toFixed(0)+'ms;--dl:'+dl+'ms';
    live++; var gone=false;
    function rm(){ if(gone) return; gone=true; live--; if(h.parentNode) h.parentNode.removeChild(h); }
    h.addEventListener('animationend',rm);
    setTimeout(rm,dur+dl+400);              // dự phòng khi tab bị ẩn và animationend không phát
    document.body.appendChild(h);
  }
  var lx=-99, ly=-99, lt=0;
  document.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse'||still||!enabled()) return;
    if(e.target.closest&&e.target.closest(SKIP)) return;
    lx=e.clientX; ly=e.clientY; lt=performance.now();
    var n=5+((Math.random()*3)|0);
    for(var i=0;i<n;i++) heart(lx+(Math.random()-.5)*26,ly+(Math.random()-.5)*10,i,false);
  },{passive:true});
  document.addEventListener('pointermove',function(e){
    if(e.pointerType==='mouse'||still||!enabled()) return;   // trượt ngón tay: nhả vệt tim nhỏ
    if(e.target.closest&&e.target.closest(SKIP)) return;
    var n=performance.now(); if(n-lt<90) return;
    var dx=e.clientX-lx, dy=e.clientY-ly; if(dx*dx+dy*dy<900) return;
    lt=n; lx=e.clientX; ly=e.clientY; heart(lx,ly,0,true);
  },{passive:true});
  /* Thiết bị chỉ có cảm ứng: script chuột không tạo nút ♥ → tạo ở đây để người dùng tắt/bật được */
  if(!document.getElementById('hcBtn')){
    var on=enabled(); root.classList.toggle('hc',on);
    var b=document.createElement('button'); b.id='hcBtn'; b.type='button'; b.textContent='\u2665';
    var lab=function(){ b.title=on?'Tắt hiệu ứng trái tim':'Bật hiệu ứng trái tim'; b.setAttribute('aria-label',b.title); b.setAttribute('aria-pressed',on); };
    b.addEventListener('click',function(){ on=!on; root.classList.toggle('hc',on); lab(); try{localStorage.setItem('hc',on?'1':'0');}catch(e){} });
    lab(); document.body.appendChild(b);
  }
})();
}catch(e){console.error('hieu-ung:',e)}
