/* Giao diện ngày lễ: đổi màu + dải chúc mừng + hoa/lá/sao rơi trước và đúng các ngày lễ.
   Bấm nút "🎨 Giao diện ngày lễ" dưới lời chào để tắt/bật. Xem thử: thêm ?ngayle=phunu (hoặc tet, do, nhagiao, thieunhi, khaigiang, doan, bac, duong, thuoc, tri, chung) vào địa chỉ trang.
   Thêm/sửa ngày lễ: bảng FIX (lặp hằng năm) và VAR (ngày đổi theo năm): [năm hoặc 0, tháng, ngày, kiểu, lời chúc, số ngày hiện trước, số ngày hiện sau]. */
(function(){var st=document.createElement('style');st.id='hol-css';st.textContent=`#hol-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;
  background:linear-gradient(180deg,var(--hol-tint,transparent),transparent 60%),radial-gradient(120% 45% at 50% 100%,var(--hol-tint,transparent),transparent)}
.hol-p{position:absolute;top:0;left:var(--x);font-size:var(--s,20px);line-height:1;opacity:.9;animation:holFall var(--t,12s) linear var(--d,0s) infinite;will-change:transform}
@keyframes holFall{0%{transform:translate3d(0,-10vh,0) rotate(0)}100%{transform:translate3d(var(--dx,0),112vh,0) rotate(360deg)}}
html.tod-nofx .hol-p{display:none}
#hol-banner{position:relative;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 10px;margin:0 0 10px;padding:9px 14px;text-align:center;
  border-radius:var(--tod-r,14px);color:#fff;font-weight:800;font-size:clamp(14px,3.6vw,18px);line-height:1.35;text-shadow:0 1px 6px rgba(0,0,0,.4);
  background:linear-gradient(100deg,var(--tod-h1),var(--tod-h2) 55%,var(--tod-h3));border:1px solid var(--cy);box-shadow:0 8px 22px -10px var(--tod-glow)}
#hol-banner::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.35) 50%,transparent 65%) 150% 0/250% 100% no-repeat;animation:holShine 3.4s ease-in-out 1s infinite}
@keyframes holShine{to{background-position:-50% 0}}
#hol-banner .hb-d{padding:2px 10px;border-radius:999px;background:rgba(0,0,0,.3);font-size:.78em;color:var(--cy);text-shadow:none}
html.tod-nofx #hol-banner::after{animation:none}
#hol-banner{padding-left:44px;padding-right:44px}
html button.hol-x{position:absolute;z-index:2;top:50%;right:8px;transform:translateY(-50%);width:28px;height:28px;min-width:0;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(255,255,255,.55)!important;background:rgba(0,0,0,.3)!important;color:#fff!important;font-size:13px;line-height:1;cursor:pointer;box-shadow:none}
html button.hol-on{display:block;margin:0 0 6px auto;padding:3px 10px;min-width:0;border-radius:999px;border:1px solid rgba(255,255,255,.5)!important;background:rgba(0,0,0,.28)!important;color:#fff!important;font-size:11.5px;font-weight:600;line-height:1.3;cursor:pointer;box-shadow:none}
@media (prefers-reduced-motion:reduce){.hol-p{display:none}#hol-banner::after{animation:none}}
@media print{#hol-layer,#hol-banner,.hol-x,.hol-on{display:none!important}}`;document.head.appendChild(st);})();
(function(){
  'use strict';
  var SK='hol_skin';
  var FIX=[[0,1,1,'duong','Chúc mừng năm mới! Tết Dương lịch',3,0],[0,2,3,'do','Chào mừng kỷ niệm ngày thành lập Đảng Cộng sản Việt Nam',3,0],[0,2,27,'thuoc','Chúc mừng Ngày Thầy thuốc Việt Nam',3,0],
    [0,3,8,'phunu','Chúc mừng Ngày Quốc tế Phụ nữ 8/3',3,0],[0,3,26,'doan','Chào mừng kỷ niệm ngày thành lập Đoàn TNCS Hồ Chí Minh',3,0],[0,4,30,'do','Mừng Ngày Giải phóng miền Nam 30/4',3,1],
    [0,5,1,'do','Chúc mừng Ngày Quốc tế Lao động 1/5',2,0],[0,5,7,'do','Kỷ niệm Chiến thắng Điện Biên Phủ',3,0],[0,5,19,'bac','Kỷ niệm ngày sinh Chủ tịch Hồ Chí Minh',3,0],
    [0,6,1,'thieunhi','Chúc mừng Ngày Quốc tế Thiếu nhi 1/6',3,0],[0,6,21,'chung','Chúc mừng Ngày Báo chí cách mạng Việt Nam',3,0],[0,6,28,'chung','Chúc mừng Ngày Gia đình Việt Nam',3,0],
    [0,7,27,'tri','Tri ân Ngày Thương binh Liệt sĩ 27/7',3,0],[0,8,19,'do','Kỷ niệm Cách mạng Tháng Tám thành công',3,0],[0,9,2,'do','Chúc mừng Quốc khánh 2/9',5,1],
    [0,9,5,'khaigiang','Chúc mừng Ngày khai giảng năm học mới',3,0],[0,10,10,'do','Kỷ niệm Ngày Giải phóng Thủ đô',3,0],[0,10,13,'chung','Chúc mừng Ngày Doanh nhân Việt Nam',3,0],
    [0,10,20,'phunu','Chúc mừng Ngày Phụ nữ Việt Nam 20/10',3,0],[0,11,19,'chung','Chúc mừng Ngày Quốc tế Đàn ông',2,0],[0,11,20,'nhagiao','Chúc mừng Ngày Nhà giáo Việt Nam 20/11',5,1],
    [0,12,22,'do','Kỷ niệm Ngày thành lập Quân đội nhân dân Việt Nam',3,0]];
  var VAR=[[2027,2,6,'tet','Chúc mừng năm mới! Tết Nguyên đán',10,5],[2028,1,26,'tet','Chúc mừng năm mới! Tết Nguyên đán',10,5],[2029,2,13,'tet','Chúc mừng năm mới! Tết Nguyên đán',10,5],
    [2027,4,16,'do','Chào mừng Giỗ Tổ Hùng Vương',3,0],[2028,4,4,'do','Chào mừng Giỗ Tổ Hùng Vương',3,0]];
  /* màu: [card, card2, bd, a1, a2, cy, h1, h2, h3, glow, tint]; ic: hình rơi; n: số hình */
  var TH={
    tet:{ic:['🌸','🧧','🏮','✨'],n:12,c:['rgba(110,12,18,.93)','#5a0a10','#d4a017','#b91c1c','#c2410c','#ffd24a','#b91c1c','#dc2626','#f59e0b','rgba(255,210,74,.5)','rgba(220,38,38,.28)']},
    do:{ic:['⭐','🇻🇳','🌟'],n:9,c:['rgba(120,14,20,.93)','#5c0b12','#e0a526','#c8102e','#a50e25','#ffdd33','#c8102e','#e11d2e','#f2b01e','rgba(255,221,51,.45)','rgba(220,38,38,.25)']},
    bac:{ic:['🪷','🌺','⭐','🇻🇳'],n:9,c:['rgba(110,20,30,.93)','#560d18','#e0a526','#b91c1c','#be185d','#ffd9a0','#b91c1c','#be185d','#f59e0b','rgba(255,200,120,.45)','rgba(255,120,120,.22)']},
    duong:{ic:['❄️','✨','🎆','🎉'],n:12,c:['rgba(14,38,86,.93)','#0a2250','#6fa3ef','#2563eb','#7c3aed','#cfe6ff','#1d4ed8','#6d28d9','#0ea5e9','rgba(160,200,255,.5)','rgba(120,160,255,.25)']},
    phunu:{ic:['🌹','🌸','💐','🌷'],n:12,c:['rgba(92,18,56,.93)','#4a0d2e','#c2578f','#be185d','#9d174d','#ffd1e3','#be185d','#db2777','#f59e0b','rgba(255,150,200,.45)','rgba(255,120,170,.28)']},
    nhagiao:{ic:['🌻','📚','🍎','✏️'],n:11,c:['rgba(10,64,52,.93)','#07463a','#35a58a','#059669','#0f766e','#ffd447','#047857','#0d9488','#d97706','rgba(255,212,71,.45)','rgba(250,204,21,.2)']},
    thieunhi:{ic:['🎈','🌈','🧸','🍭'],n:12,c:['rgba(70,30,120,.92)','#3a1670','#b07af0','#db2777','#7c3aed','#7df9ff','#7c3aed','#db2777','#f59e0b','rgba(125,249,255,.4)','rgba(255,170,60,.22)']},
    khaigiang:{ic:['🎒','📚','✏️','🌻'],n:10,c:['rgba(12,52,110,.93)','#082e66','#4d92e6','#2563eb','#0284c7','#ffb347','#1d4ed8','#0284c7','#ea580c','rgba(255,179,71,.45)','rgba(255,180,70,.2)']},
    doan:{ic:['⭐','🌟','✨'],n:9,c:['rgba(10,50,120,.93)','#072e70','#4f8ee8','#1d4ed8','#0369a1','#ffe14d','#1d4ed8','#2563eb','#0ea5e9','rgba(255,225,77,.45)','rgba(60,130,255,.25)']},
    thuoc:{ic:['💚','🌿','🩺'],n:9,c:['rgba(8,66,60,.93)','#064840','#3bb5a4','#0d9488','#0891b2','#b9fbe7','#0f766e','#0891b2','#16a34a','rgba(185,251,231,.4)','rgba(80,220,190,.2)']},
    tri:{ic:['🌼','🕯️'],n:6,c:['rgba(40,20,28,.94)','#241018','#8a4a52','#7f1d1d','#44403c','#f2c46d','#5b1218','#7f1d1d','#44403c','rgba(242,196,109,.35)','rgba(120,20,30,.25)']},
    chung:{ic:['🎉','✨','🎊','🌟'],n:11,c:['rgba(52,26,100,.93)','#2d1260','#8b6ae0','#7c3aed','#db2777','#ffd66b','#6d28d9','#db2777','#f59e0b','rgba(255,214,107,.45)','rgba(190,120,255,.22)']}
  };
  var VN=['--card','--card2','--bd','--a1','--a2','--cy','--tod-h1','--tod-h2','--tod-h3','--tod-glow','--hol-tint'];
  var css='';for(var k in TH){var c=TH[k].c,r='';for(var i=0;i<VN.length;i++)r+=VN[i]+':'+c[i]+';';css+='html[data-hol="'+k+'"]:not(#_){'+r+'}\n';}
  var st=document.createElement('style');st.id='hol-theme-vars';st.textContent=css;document.head.appendChild(st);

  var root=document.documentElement,active=null,layer=null,banner=null,on=true,lite=(window.matchMedia&&matchMedia('(max-width:700px)').matches)||(navigator.hardwareConcurrency||8)<=4;
  try{if(localStorage.getItem(SK)==='off')on=false;}catch(e){}
  function rnd(a,b){return a+Math.random()*(b-a);}
  function find(){
    var q='',m;try{m=location.search.match(/[?&]ngayle=([^&]*)/);if(m)q=decodeURIComponent(m[1]);}catch(e){}
    if(q){var key=TH[q]?q:(q==='1'?'nhagiao':'');
      if(key){var all=FIX.concat(VAR),tx='';for(var a=0;a<all.length;a++)if(all[a][3]===key){tx=all[a][4];break;}
        return {k:key,t:tx||'Chúc mừng ngày lễ!',d:0};}}
    var n=new Date(),t0=new Date(n.getFullYear(),n.getMonth(),n.getDate()),best=null;
    function chk(dt,rec){var d=Math.round((dt-t0)/864e5);
      if(d<=rec[5]&&d>=-rec[6]&&(!best||Math.abs(d)<Math.abs(best.d)||(Math.abs(d)===Math.abs(best.d)&&d>best.d)))best={k:rec[3],t:rec[4],d:d};}
    var j,y=t0.getFullYear();
    for(j=0;j<FIX.length;j++)for(var yy=y-1;yy<=y+1;yy++)chk(new Date(yy,FIX[j][1]-1,FIX[j][2]),FIX[j]);
    for(j=0;j<VAR.length;j++)chk(new Date(VAR[j][0],VAR[j][1]-1,VAR[j][2]),VAR[j]);
    return best;
  }
  function clear(){
    root.removeAttribute('data-hol');
    if(layer&&layer.parentNode)layer.parentNode.removeChild(layer);layer=null;
    if(banner&&banner.parentNode)banner.parentNode.removeChild(banner);banner=null;
  }
  function render(){
    clear();
    if(!active)return;
    if(!on){offBtn();return;}
    var T=TH[active.k];root.setAttribute('data-hol',active.k);
    layer=document.createElement('div');layer.id='hol-layer';layer.setAttribute('aria-hidden','true');
    var cnt=lite?Math.ceil(T.n*0.6):T.n,h='';
    for(var i=0;i<cnt;i++)h+='<i class="hol-p" style="--x:'+rnd(2,96).toFixed(0)+'%;--s:'+rnd(15,26).toFixed(0)+'px;--t:'+rnd(11,19).toFixed(1)+'s;--d:-'+rnd(0,18).toFixed(1)+'s;--dx:'+rnd(-14,14).toFixed(0)+'vw;font-style:normal">'+T.ic[i%T.ic.length]+'</i>';
    layer.innerHTML=h;
    var sc=document.getElementById('tod-scene');document.body.insertBefore(layer,sc?sc.nextSibling:document.body.firstChild);
    var hero=document.querySelector('.app .hero');
    if(hero&&hero.parentNode){
      banner=document.createElement('div');banner.id='hol-banner';banner.setAttribute('role','status');
      var d=active.d,when=d>0?'Còn '+d+' ngày':(d===0?'Hôm nay!':'Vừa diễn ra');
      var a=document.createElement('span');a.textContent=T.ic[0]+' '+active.t+' '+T.ic[1%T.ic.length];
      var b=document.createElement('span');b.className='hb-d';b.textContent=when;
      banner.appendChild(a);banner.appendChild(b);
      var x=document.createElement('button');x.type='button';x.className='hol-x';x.textContent='✕';x.title='Tắt giao diện ngày lễ';x.setAttribute('aria-label','Tắt giao diện ngày lễ');
      x.addEventListener('click',function(){setOn(false);});banner.appendChild(x);
      hero.parentNode.insertBefore(banner,hero);
    }
  }
  function setOn(v){on=v;try{localStorage.setItem(SK,on?'on':'off');}catch(e){}render();}
  function offBtn(){   /* đang tắt: chỉ còn một nút nhỏ phía trên để bật lại */
    var hero=document.querySelector('.app .hero');if(!hero||!hero.parentNode)return;
    banner=document.createElement('div');banner.id='hol-off';
    var c=document.createElement('button');c.type='button';c.className='hol-on';c.textContent='🎨 Bật giao diện ngày lễ';
    c.addEventListener('click',function(){setOn(true);});banner.appendChild(c);hero.parentNode.insertBefore(banner,hero);
  }
  function init(){
    active=find();
    render();
  }
  function start(){setTimeout(init,0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
