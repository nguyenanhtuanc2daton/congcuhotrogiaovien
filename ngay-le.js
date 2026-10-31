/* Ngày lễ: đúng ngày lễ, khi mở trang sẽ bắn pháo hoa khoảng 10 giây kèm dòng chữ chúc mừng (chạm vào dòng chữ để tắt sớm).
   Xem thử: thêm ?ngayle=phunu (hoặc tet, do, nhagiao, thieunhi, khaigiang, doan, bac, duong, thuoc, tri, chung) vào địa chỉ trang.
   Thêm/sửa ngày lễ: bảng FIX (lặp hằng năm) và VAR (ngày đổi theo năm): [năm hoặc 0, tháng, ngày, kiểu, lời chúc, số ngày hiện trước, số ngày hiện sau]. */
(function(){var st=document.createElement('style');st.id='hol-css';st.textContent=`
#hol-msg{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;pointer-events:none;padding:4vw}
#hol-msg .hm-b{max-width:min(92vw,1500px);padding:clamp(16px,2.6vw,48px) clamp(20px,4vw,80px);text-align:center;border-radius:clamp(20px,2.4vw,44px);background:linear-gradient(135deg,rgba(6,12,44,.82),rgba(34,10,64,.82));border:2px solid var(--ca,#ffd24a);box-shadow:0 0 44px var(--cg,rgba(255,210,74,.5)),0 18px 50px rgba(0,0,0,.5);backdrop-filter:blur(6px);pointer-events:auto;cursor:pointer;animation:holIn .9s cubic-bezier(.2,1.4,.4,1) both,holOut .8s ease 9.2s forwards}
#hol-msg .hm-i{font-size:clamp(30px,5vw,96px);line-height:1.1;margin-bottom:.15em;animation:holBob 1.3s ease-in-out infinite}
#hol-msg .hm-t{font-weight:800;font-size:clamp(22px,4.2vw,76px);line-height:1.28;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.65),0 0 26px var(--cg,rgba(255,210,74,.5))}
@keyframes holIn{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
@keyframes holOut{to{opacity:0;transform:scale(.92)}}
@keyframes holBob{50%{transform:translateY(-.12em) scale(1.06)}}
@media print{#hol-msg,#hol-fw{display:none!important}}`;document.head.appendChild(st);})();
(function(){
  'use strict';
  
  var FIX=[[0,1,1,'duong','Chúc mừng năm mới! Tết Dương lịch',3,0],[0,2,3,'do','Chào mừng kỷ niệm ngày thành lập Đảng Cộng sản Việt Nam',3,0],[0,2,27,'thuoc','Chúc mừng Ngày Thầy thuốc Việt Nam',3,0],
    [0,3,8,'phunu','Chúc mừng Ngày Quốc tế Phụ nữ 8/3',3,0],[0,3,26,'doan','Chào mừng kỷ niệm ngày thành lập Đoàn TNCS Hồ Chí Minh',3,0],[0,4,30,'do','Mừng Ngày Giải phóng miền Nam 30/4',3,1],
    [0,5,1,'do','Chúc mừng Ngày Quốc tế Lao động 1/5',2,0],[0,5,7,'do','Kỷ niệm Chiến thắng Điện Biên Phủ',3,0],[0,5,19,'bac','Kỷ niệm ngày sinh Chủ tịch Hồ Chí Minh',3,0],
    [0,6,1,'thieunhi','Chúc mừng Ngày Quốc tế Thiếu nhi 1/6',3,0],[0,6,21,'chung','Chúc mừng Ngày Báo chí cách mạng Việt Nam',3,0],[0,6,28,'chung','Chúc mừng Ngày Gia đình Việt Nam',3,0],
    [0,7,27,'tri','Tri ân Ngày Thương binh Liệt sĩ 27/7',3,0],[0,8,19,'do','Kỷ niệm Cách mạng Tháng Tám thành công',3,0],[0,9,2,'do','Chúc mừng Quốc khánh 2/9',5,1],
    [0,9,5,'khaigiang','Chúc mừng Ngày khai giảng năm học mới',3,0],[0,10,10,'do','Kỷ niệm Ngày Giải phóng Thủ đô',3,0],[0,10,13,'chung','Chúc mừng Ngày Doanh nhân Việt Nam',3,0],
    [0,10,20,'phunu','Chúc mừng Ngày Phụ nữ Việt Nam 20/10',3,0],[0,11,19,'chung','Chúc mừng Ngày Quốc tế Đàn ông',2,0],[0,11,20,'nhagiao','Chúc mừng Ngày Nhà giáo Việt Nam 20/11',5,1],
    [0,12,22,'do','Kỷ niệm Ngày thành lập Quân đội nhân dân Việt Nam',3,0]];
  /* Ngày theo ÂM LỊCH: tự quy ra dương lịch cho các năm quanh năm hiện tại (dùng window.AmLich trong index.html).
     Nếu thiếu thư viện âm lịch thì dùng bảng ghi sẵn bên dưới. */
  var VAR=[[2027,2,6,'tet','Chúc mừng năm mới! Tết Nguyên đán',10,5],[2028,1,26,'tet','Chúc mừng năm mới! Tết Nguyên đán',10,5],[2029,2,13,'tet','Chúc mừng năm mới! Tết Nguyên đán',10,5],
    [2027,4,16,'do','Chào mừng Giỗ Tổ Hùng Vương',3,0],[2028,4,4,'do','Chào mừng Giỗ Tổ Hùng Vương',3,0]];
  try{if(window.AmLich){
    var LV=[[1,1,'tet','Chúc mừng năm mới! Tết Nguyên đán',10,5],[10,3,'do','Chào mừng Giỗ Tổ Hùng Vương',3,0],[15,8,'thieunhi','Chúc mừng Tết Trung thu! Chúc các em một đêm rằm vui vẻ',3,1]],
        y0=new Date().getFullYear(),auto=[];
    for(var ly=y0-1;ly<=y0+2;ly++)for(var q=0;q<LV.length;q++){
      var sd=window.AmLich.lunar2solar(LV[q][0],LV[q][1],ly,0);
      if(sd)auto.push([sd.getFullYear(),sd.getMonth()+1,sd.getDate(),LV[q][2],LV[q][3],LV[q][4],LV[q][5]]);}
    if(auto.length)VAR=auto;
  }}catch(e){}
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
  var root=document.documentElement,active=null,layer=null,banner=null,lite=(window.matchMedia&&matchMedia('(max-width:700px)').matches)||(navigator.hardwareConcurrency||8)<=4;
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

  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  function celebrate(){
    var rec=find();if(!rec||rec.d!==0)return;       /* chỉ đúng ngày lễ */
    var T=TH[rec.k],DUR=10000,done=false,cv=null,box=null,timer=null,
        reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    function end(){if(done)return;done=true;clearTimeout(timer);if(cv&&cv.parentNode)cv.parentNode.removeChild(cv);if(box&&box.parentNode)box.parentNode.removeChild(box);}
    /* dòng chữ chúc mừng */
    box=document.createElement('div');box.id='hol-msg';box.setAttribute('role','status');
    box.style.setProperty('--ca',T.c[5]);box.style.setProperty('--cg',T.c[9]);
    var ic=T.ic,b=document.createElement('div');b.className='hm-b';
    var i1=document.createElement('div');i1.className='hm-i';i1.textContent=ic[0]+' '+ic[1%ic.length]+' '+ic[2%ic.length];
    var tx=document.createElement('div');tx.className='hm-t';tx.textContent=rec.t;
    b.appendChild(i1);b.appendChild(tx);b.addEventListener('click',end);box.appendChild(b);document.body.appendChild(box);
    timer=setTimeout(end,DUR+300);
    if(reduce)return;                                  /* người dùng tắt chuyển động: chỉ hiện chữ */
    /* pháo hoa */
    cv=document.createElement('canvas');cv.id='hol-fw';cv.setAttribute('aria-hidden','true');
    var dpr=Math.min(window.devicePixelRatio||1,lite?1:1.5),W=window.innerWidth,H=window.innerHeight;
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    cv.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;z-index:99998;pointer-events:none';
    var c=cv.getContext&&cv.getContext('2d');if(!c){end();return;}
    document.body.appendChild(cv);c.scale(dpr,dpr);
    var COLS=[T.c[5],T.c[6],T.c[7],T.c[8],'#ffffff','#ffd166','#7dd3fc','#ff6b9d','#a3ff7a'],R=[],P=[],t0=performance.now(),last=t0,next=0;
    function launch(){R.push({x:W*rnd(.1,.9),y:H,ty:H*rnd(.12,.45),v:rnd(7,11),col:pick(COLS)});}
    function burst(x,y,col){var n=lite?34:68,two=Math.random()<.45,col2=pick(COLS);
      for(var i=0;i<n;i++){var a=Math.PI*2*i/n+rnd(-.05,.05),sp=rnd(1.4,4.6)*((two&&i%2)?.55:1);
        P.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l:1,dc:rnd(.008,.017),col:(two&&i%2)?col2:col,s:rnd(1.4,2.9)});}}
    function frame(now){
      if(done)return;
      var dt=Math.min(40,now-last)/16.7,el=now-t0,i;last=now;
      c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.2)';c.fillRect(0,0,W,H);
      c.globalCompositeOperation='lighter';
      if(el<DUR-1800&&el>=next){launch();if(Math.random()<.5)launch();next=el+rnd(300,620);}
      for(i=R.length-1;i>=0;i--){var r=R[i];r.y-=r.v*dt;r.x+=(Math.random()-.5)*.6;
        c.globalAlpha=1;c.fillStyle=r.col;c.beginPath();c.arc(r.x,r.y,2,0,6.2832);c.fill();
        if(r.y<=r.ty){burst(r.x,r.y,r.col);R.splice(i,1);}}
      for(i=P.length-1;i>=0;i--){var p=P[i];p.vx*=.985;p.vy=p.vy*.985+.035*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=p.dc*dt;
        if(p.l<=0){P.splice(i,1);continue;}
        c.globalAlpha=Math.min(1,p.l*1.4);c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.s*(.5+p.l*.6),0,6.2832);c.fill();}
      c.globalAlpha=1;
      if(el<DUR||P.length||R.length)requestAnimationFrame(frame);else end();
    }
    requestAnimationFrame(frame);
  }
  function start(){setTimeout(celebrate,700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
