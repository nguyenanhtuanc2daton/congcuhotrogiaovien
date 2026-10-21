/* Bắt gà gọi tên — nằm trong mục "Gọi tên học sinh" (tab "Công cụ thường dùng"), cạnh Vòng quay. Tự dựng giao diện nên index.html chỉ cần nạp file này. */
(function(){
  'use strict';
  var wheelBox=document.getElementById('utWheel'),t2=document.getElementById('t2');
  if(!wheelBox||!t2)return;

  /* Thanh chọn 2 chế độ ngay trong mục "Gọi tên học sinh": Vòng quay | Bắt gà */
  var mode=document.createElement('div');mode.className='bar';mode.style.marginBottom='10px';
  mode.innerHTML='<button class="sm" id="gtBtnWheel" type="button">🎯 Vòng quay</button><button class="sm ghost" id="gtBtnChicken" type="button">🐔 Bắt gà</button>';
  wheelBox.insertBefore(mode,wheelBox.firstChild);
  var root=document.createElement('div');root.id='utBatGa';root.style.display='none';wheelBox.appendChild(root);
  function setMode(chicken){
    t2.style.display=chicken?'none':'';
    root.style.display=chicken?'':'none';
    document.getElementById('gtBtnWheel').className='sm'+(chicken?' ghost':'');
    document.getElementById('gtBtnChicken').className='sm'+(chicken?'':' ghost');
    if(!chicken)setTimeout(function(){window.dispatchEvent(new CustomEvent('tabshow',{detail:'t2'}));},0);
  }
  document.getElementById('gtBtnWheel').onclick=function(){setMode(false);};
  document.getElementById('gtBtnChicken').onclick=function(){setMode(true);};
  root.innerHTML=
'<style>'+
'#utBatGa .bg-stage{position:relative}'+
'#utBatGa .bg-stage:fullscreen{display:flex;align-items:center;justify-content:center;background:#000}'+
'#utBatGa canvas{width:100%;height:auto;border-radius:14px;display:block;border:2px solid var(--bd,#3b72c9)}'+
'#utBatGa .bg-stage:fullscreen canvas{width:100%;height:100%;max-width:none;max-height:none;border-radius:0;border:0}'+
'#utBatGa .bg-x{display:none;position:absolute;top:10px;right:10px;z-index:3}'+
'#utBatGa .bg-stage:fullscreen .bg-x{display:block}'+
'#utBatGa .bg-stage:fullscreen .bg-pop{font-size:clamp(20px,2.4vw,46px);padding:3vh 4vw}'+
'#utBatGa .bg-stage:fullscreen .bg-name{font-size:clamp(48px,11vw,170px)}'+
'#utBatGa .bg-stage:fullscreen .bg-hist{font-size:clamp(13px,1.3vw,24px);max-height:12vh}'+
'#utBatGa .bg-hud{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}'+
'#utBatGa #bgTimer{font-size:24px;font-weight:700;color:var(--cy,#ffd166)}'+
'#utBatGa .bg-ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);border-radius:14px}'+
'#utBatGa .bg-pop{position:relative;z-index:1;background:var(--card2,#12303a);color:var(--fg,#fff);border:2px solid var(--bd,#3b72c9);border-radius:18px;padding:14px 20px;text-align:center;max-width:92%;max-height:96%;overflow:auto;animation:bgPop .5s cubic-bezier(.2,1.6,.4,1)}'+
'#utBatGa .bg-name{font-size:clamp(30px,8vw,64px);font-weight:800;color:var(--cy,#ffd166);margin:2px 0 6px;word-break:break-word}'+
'#utBatGa .bg-hist{font-size:13px;opacity:.8;max-height:56px;overflow:auto;margin-bottom:8px}'+
'#utBatGa canvas.bg-fw,#utBatGa .bg-stage:fullscreen canvas.bg-fw{position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;border:0;border-radius:0;pointer-events:none}'+
'@keyframes bgPop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}'+
'</style>'+
'<div id="bgSetup">'+
'<h3 style="margin:4px 0 8px">🐔 Bắt gà gọi tên</h3>'+
'<textarea id="bgNames" style="min-height:170px" placeholder="Mỗi dòng một tên học sinh"></textarea>'+
'<div class="bar">'+
'<label class="ghost sm" style="cursor:pointer;display:inline-block;padding:8px 12px;border-radius:10px">📂 Nhập Excel/CSV<input id="bgFile" type="file" accept=".xlsx,.xls,.csv,.txt" hidden></label>'+
'<button class="ghost sm" id="bgWheel" type="button">⬇ Lấy từ Vòng quay</button>'+
'<button class="ghost sm" id="bgTG" type="button">⬇ Từ Bảng điểm</button>'+
'<button class="sec sm" id="bgClear" type="button">Xóa</button>'+
'<span class="note" id="bgCount"></span></div>'+
'<div class="bar"><label>Thời gian đuổi <input type="number" id="bgDur" value="15" min="5" max="120" style="width:70px"> giây</label>'+
'<label class="note"><input type="checkbox" id="bgRemove" checked> Loại học sinh đã bị bắt</label></div>'+
'<div id="bgInfo" class="status info"></div>'+
'<div class="bar" style="justify-content:center"><button class="red" id="bgStart" type="button" style="font-size:18px;padding:13px 30px">▶ BẮT ĐẦU ĐUỔI GÀ</button></div>'+
'</div>'+
'<div id="bgGame" style="display:none">'+
'<div class="bg-hud"><button class="ghost sm" id="bgBack" type="button">← Danh sách</button><span id="bgTimer">15s</span>'+
'<span><span class="note" id="bgLeft"></span> <button class="ghost sm" id="bgFs" type="button">⛶ Toàn màn hình</button></span></div>'+
'<div class="bg-stage" id="bgStage"><canvas id="bgCv" width="1000" height="600"></canvas><button class="sec sm bg-x" id="bgX" type="button">✕ Thu nhỏ</button>'+
'<div class="bg-ov" id="bgOv"><div class="bg-pop"><div>Mời em</div><div class="bg-name" id="bgWin"></div><div style="margin-bottom:6px">lên bảng ❤️</div>'+
'<div class="bg-hist" id="bgHist"></div>'+
'<div class="bar" style="justify-content:center;margin:0"><button class="red" id="bgAgain" type="button">Bắt tiếp</button><button class="sec" id="bgBack2" type="button">Về danh sách</button></div></div></div>'+
'</div></div>';

  var q=function(id){return document.getElementById(id);};
  var W=1000,H=600,cv=q('bgCv'),ctx=cv.getContext('2d'),stage=q('bgStage');
  if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h){this.rect(x,y,w,h);};
  var pool=[],chickens=[],farmer,target,chase,nextSwitch=0,t0,T,phase='idle',raf=0,last=0,caught=[];
  var PAL=[{b:'#fffdf5',w:'#e4dcc6'},{b:'#d08c4a',w:'#a96c31'},{b:'#ecc57e',w:'#cfa458'},{b:'#8b5a3c',w:'#6a4028'},{b:'#f1f1f1',w:'#c9c9c9'},{b:'#c4673a',w:'#9a4a22'}];

  /* ---------- nền cỏ (vẽ một lần) ---------- */
  var isFs=false,curT='',bg=document.createElement('canvas');
  function genBg(){
    bg.width=W;bg.height=H;
    var g=bg.getContext('2d'),gr=g.createLinearGradient(0,0,0,H);
    gr.addColorStop(0,'#8fd16a');gr.addColorStop(1,'#6bb449');g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(var i=0,nt=Math.round(260*W*H/600000);i<nt;i++){
      var x=Math.random()*W,y=40+Math.random()*(H-40);
      g.strokeStyle=Math.random()<.5?'#5aa03c':'#a6dd82';g.lineWidth=1.6;g.beginPath();
      g.moveTo(x,y);g.lineTo(x-3,y-8);g.moveTo(x,y);g.lineTo(x+1,y-10);g.moveTo(x,y);g.lineTo(x+4,y-7);g.stroke();
    }
    for(i=0;i<22;i++){
      var fx=Math.random()*W,fy=60+Math.random()*(H-80);
      g.fillStyle=['#fff','#ffe066','#ffa8c5'][i%3];
      for(var k=0;k<5;k++){g.beginPath();g.arc(fx+Math.cos(k*1.256)*3.5,fy+Math.sin(k*1.256)*3.5,2.6,0,6.3);g.fill();}
      g.fillStyle='#f08c00';g.beginPath();g.arc(fx,fy,2,0,6.3);g.fill();
    }
    g.fillStyle='#b9814a';g.strokeStyle='#7a5128';g.lineWidth=1.5;
    g.fillRect(0,14,W,7);g.fillRect(0,30,W,7);g.strokeRect(0,14,W,7);g.strokeRect(0,30,W,7);
    for(var px=10;px<W;px+=50){g.fillRect(px,6,10,42);g.strokeRect(px,6,10,42);}
  }
  genBg();

  /* ---------- vẽ gà ---------- */
  function ell(x,y,rx,ry,rot,fill,stroke){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot||0,0,6.2832);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.stroke();}
  }
  function drawChicken(x,y,u,flip,ph,fl,pal){
    ctx.save();ctx.translate(x,y);ctx.scale(flip*u,u);
    ctx.strokeStyle='rgba(60,40,20,.55)';ctx.lineWidth=1.2;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,25,17,4,0,0,6.3);ctx.fill();
    var bob=Math.abs(Math.sin(ph))*2;ctx.translate(0,-bob);
    ctx.lineWidth=2.6;ctx.strokeStyle='#e8890c';
    for(var i=0;i<2;i++){
      var a=ph+i*Math.PI,hx=-3+i*7,fx=hx+Math.sin(a)*7,fy=25+bob-Math.max(0,Math.cos(a))*3.5;
      ctx.beginPath();ctx.moveTo(hx,14);ctx.lineTo(fx,fy);ctx.stroke();
      ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(fx-2,fy);ctx.lineTo(fx+5,fy);ctx.moveTo(fx,fy);ctx.lineTo(fx+4,fy-1.5);ctx.stroke();ctx.lineWidth=2.6;
    }
    ctx.strokeStyle='rgba(60,40,20,.55)';ctx.lineWidth=1.2;
    [[.3,-19,-1],[.75,-19,-4],[1.15,-18,-7]].forEach(function(f){ell(f[1],f[2],12,4.5,f[0],pal.w,true);});
    ell(0,4,19,14,0,pal.b,true);
    ell(12,-5,7.5,11,.35,pal.b,false);
    ell(16,-14,8,8,0,pal.b,true);
    ctx.fillStyle='#e03131';
    [[13,-21,3],[17,-22.4,3.4],[20.4,-20.4,2.8]].forEach(function(c){ctx.beginPath();ctx.arc(c[0],c[1],c[2],0,6.3);ctx.fill();ctx.stroke();});
    ctx.fillStyle='#f59f00';ctx.beginPath();ctx.moveTo(23,-16);ctx.lineTo(31.5,-12.5);ctx.lineTo(23,-10);ctx.closePath();ctx.fill();ctx.stroke();
    ell(23,-7,2.2,3.6,0,'#e03131',true);
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(19.5,-15.5,1.9,0,6.3);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(20.1,-16.1,.6,0,6.3);ctx.fill();
    ctx.save();ctx.translate(-3,0);ctx.rotate(-.12+Math.sin(fl)*.5);
    ell(-3,4,13,7.5,.12,pal.w,true);
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.moveTo(-13,4);ctx.quadraticCurveTo(-2,2,8,5);ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  /* ---------- vẽ người nông dân ---------- */
  function limb(x1,y1,x2,y2,w,col){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function drawFarmer(x,y,u,flip,ph,swing){
    ctx.save();ctx.translate(x,y);ctx.scale(flip*u,u);ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,45,18,5,0,0,6.3);ctx.fill();
    var s=Math.sin(ph)*11,bob=Math.abs(Math.cos(ph))*1.5;
    limb(-3,10,-3-s,41,8,'#2a5298');ell(-3-s+3,43,7,3.4,0,'#4a2c17');
    limb(0,-18,-s*.8,-2,6,'#c9433f');ell(-s*.8,-1,3.2,3.2,0,'#f1c27d');
    ctx.translate(0,-bob);
    ctx.fillStyle='#d9534f';ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.roundRect(-11,-24,22,36,6);ctx.fill();ctx.stroke();
    ctx.fillStyle='#2f66c4';ctx.beginPath();ctx.roundRect(-11,-6,22,19,4);ctx.fill();ctx.stroke();
    limb(-6,-6,-4,-23,3,'#2f66c4');limb(6,-6,4,-23,3,'#2f66c4');
    ctx.fillStyle='#ffd43b';ctx.beginPath();ctx.arc(-5,-9,1.8,0,6.3);ctx.arc(5,-9,1.8,0,6.3);ctx.fill();
    ctx.translate(0,bob);
    limb(3,10,3+s,41,8,'#2f66c4');ell(3+s+3,43,7,3.4,0,'#4a2c17');
    ctx.translate(0,-bob);
    ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=1.2;
    ell(1,-35,10,10,0,'#f1c27d',true);
    ctx.fillStyle='#222';ctx.beginPath();ctx.arc(5,-36,1.6,0,6.3);ctx.fill();
    ctx.strokeStyle='#8a4b2b';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(5,-32,3.2,.2,2.4);ctx.stroke();
    ell(8,-33,2,1.4,0,'rgba(240,100,100,.5)',false);
    ctx.strokeStyle='#a8842c';ctx.lineWidth=1.2;
    ell(1,-42,18,4.5,0,'#ecc94b',true);
    ctx.fillStyle='#ecc94b';ctx.beginPath();ctx.ellipse(1,-43,9.5,8,0,Math.PI,0);ctx.fill();ctx.stroke();
    ctx.fillStyle='#c0392b';ctx.fillRect(-8.5,-46,19,3);
    var sw=swing+Math.sin(ph)*.12;
    limb(0,-18,10,-8,6,'#c9433f');
    ctx.save();ctx.translate(11,-8);ctx.rotate(-.9+sw);
    limb(-8,0,46,0,3.2,'#8b5a2b');
    ctx.strokeStyle='#6b6b6b';ctx.lineWidth=2;ctx.fillStyle='rgba(255,255,255,.28)';
    ctx.beginPath();ctx.ellipse(58,0,14,17,0,0,6.3);ctx.fill();ctx.stroke();
    ctx.lineWidth=.9;
    for(var k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(58+k*5,-15+Math.abs(k));ctx.lineTo(58+k*5,15-Math.abs(k));ctx.stroke();ctx.beginPath();ctx.moveTo(45,k*5.5);ctx.lineTo(71,k*5.5);ctx.stroke();}
    ctx.restore();
    ell(11,-8,3.4,3.4,0,'#f1c27d',false);
    ctx.restore();
  }

  /* ---------- danh sách ---------- */
  function info(t){q('bgInfo').textContent=t||'';}
  function parseNames(){
    var seen={};
    return q('bgNames').value.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean).map(function(n){seen[n]=(seen[n]||0)+1;return seen[n]>1?n+' ('+seen[n]+')':n;});
  }
  function upd(){q('bgCount').textContent=parseNames().length+' học sinh';}
  q('bgNames').addEventListener('input',upd);upd();
  q('bgClear').onclick=function(){q('bgNames').value='';upd();info();};
  q('bgWheel').onclick=function(){
    var w=q('wNames');
    if(!w||!w.value.trim()){info('Vòng Quay Gọi Tên chưa có tên học sinh nào.');return;}
    q('bgNames').value=w.value;upd();info('');
  };
  q('bgTG').onclick=function(){
    var ns=(window.TG&&window.TG.names)?window.TG.names():[];
    if(!ns.length){info('Bảng điểm (tab Công cụ Word) chưa có tên học sinh nào.');return;}
    q('bgNames').value=ns.join('\n');upd();info('');
  };
  q('bgFile').onchange=function(e){
    var f=e.target.files[0];if(!f)return;
    var fin=function(rows){
      var cols=Math.max.apply(null,rows.map(function(r){return r.length;}).concat([1])),best=0,bs=-1;
      for(var c=0;c<cols;c++){
        var n=rows.filter(function(r){var v=String(r[c]==null?'':r[c]).trim();return v&&isNaN(Number(v));}).length;
        if(n>bs){bs=n;best=c;}
      }
      var list=rows.map(function(r){return String(r[best]==null?'':r[best]).trim();}).filter(Boolean);
      if(list.length&&/^(stt|họ|ho|tên|ten|name|danh sách)/i.test(list[0]))list.shift();
      q('bgNames').value=list.join('\n');upd();info(list.length?'Đã nhập '+list.length+' tên từ file.':'Không tìm thấy tên học sinh trong file.');
    };
    var fail=function(){info('Không đọc được file. Hãy thử dán tên trực tiếp vào ô nhập.');};
    if(/\.(txt|csv)$/i.test(f.name)){
      f.text().then(function(t){fin(t.split(/\r?\n/).map(function(r){return [r.split(',')[0]];}));},fail);
    }else if(window.XLSX){
      f.arrayBuffer().then(function(b){
        var wb=XLSX.read(b,{type:'array'});
        fin(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''}));
      }).catch(fail);
    }else fail();
    e.target.value='';
  };

  /* ---------- toàn màn hình: thế giới game co giãn đúng tỉ lệ màn hình (tivi 16:9...) ---------- */
  function applySize(nw,nh){
    var sx=nw/W,sy=nh/H;
    chickens.forEach(function(c){c.x*=sx;c.y*=sy;});
    if(farmer){farmer.x*=sx;farmer.y*=sy;}
    W=nw;H=nh;cv.width=W;cv.height=H;genBg();
    if(farmer&&chickens.length)draw();
  }
  function fit(){
    var fe=document.fullscreenElement||document.webkitFullscreenElement;
    isFs=(fe===stage);
    var nw=1000,nh=600;
    if(isFs){
      var cw=stage.clientWidth,ch=stage.clientHeight;
      if(cw>0&&ch>0){var a=cw/ch;if(a>=1.2){nh=600;nw=Math.round(600*a);}else{nw=1000;nh=Math.round(1000/a);}}
    }
    if(nw!==W||nh!==H)applySize(nw,nh);
  }
  document.addEventListener('fullscreenchange',function(){fit();setTimeout(fit,120);});
  document.addEventListener('webkitfullscreenchange',function(){fit();setTimeout(fit,120);});
  window.addEventListener('resize',fit);

  /* ---------- pháo hoa khi hiện tên ---------- */
  var exitT=0,fwT=0,fwCv=document.createElement('canvas'),fw={on:false,raf:0,last:0,parts:[],rockets:[],nextL:0,W:0,H:0,d:1};
  fwCv.className='bg-fw';q('bgOv').insertBefore(fwCv,q('bgOv').firstChild);
  function fwFit(){
    var d=Math.min(2,window.devicePixelRatio||1),w=fwCv.clientWidth,h=fwCv.clientHeight;
    if(!w||!h)return false;
    if(fwCv.width!==Math.round(w*d)||fwCv.height!==Math.round(h*d)){fwCv.width=Math.round(w*d);fwCv.height=Math.round(h*d);}
    fw.W=w;fw.H=h;fw.d=d;return true;
  }
  function fwBurst(x,y){
    var hue=Math.random()*360,n=48;
    for(var i=0;i<n;i++){
      var a=i/n*6.283+Math.random()*.25,v=40+Math.random()*170;
      fw.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,hue:hue+Math.random()*50,sz:1.6+Math.random()*2});
    }
  }
  function fwLaunch(){fw.rockets.push({x:fw.W*(.12+Math.random()*.76),y:fw.H,vy:-(fw.H*(.85+Math.random()*.5))});}
  function fwFrame(now){
    if(!fw.on)return;
    var dt=Math.min(.05,(now-fw.last)/1000);fw.last=now;
    if(fwFit()){
      var c=fwCv.getContext('2d');
      c.setTransform(fw.d,0,0,fw.d,0,0);c.clearRect(0,0,fw.W,fw.H);
      fw.nextL-=dt;if(fw.nextL<=0){fwLaunch();fw.nextL=.25+Math.random()*.45;}
      c.globalCompositeOperation='lighter';
      fw.rockets=fw.rockets.filter(function(r){
        r.vy+=fw.H*.9*dt;r.y+=r.vy*dt;
        c.fillStyle='#ffe9a8';c.beginPath();c.arc(r.x,r.y,2.4,0,6.3);c.fill();
        if(r.vy>=-30){fwBurst(r.x,r.y);return false;}
        return true;
      });
      fw.parts=fw.parts.filter(function(p){
        p.vy+=120*dt;p.vx*=.985;p.vy*=.985;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*.6;
        if(p.life<=0)return false;
        c.fillStyle='hsla('+p.hue+',100%,62%,'+p.life.toFixed(2)+')';
        c.beginPath();c.arc(p.x,p.y,p.sz,0,6.3);c.fill();return true;
      });
      c.globalCompositeOperation='source-over';
    }
    fw.raf=requestAnimationFrame(fwFrame);
  }
  function fwStart(){
    fwStop();fw.on=true;fw.parts=[];fw.rockets=[];fw.nextL=0;fw.last=performance.now();
    fw.raf=requestAnimationFrame(fwFrame);
    setTimeout(function(){if(fw.on&&fwFit()){fwBurst(fw.W*.25,fw.H*.3);fwBurst(fw.W*.75,fw.H*.35);}},120);
  }
  function fwStop(){
    clearTimeout(fwT);fw.on=false;cancelAnimationFrame(fw.raf);fw.parts=[];fw.rockets=[];
    var c=fwCv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,fwCv.width,fwCv.height);
  }

  /* ---------- vòng chơi ---------- */
  function startRound(){
    clearTimeout(exitT);fwStop();
    T=Math.max(5,Math.min(120,+q('bgDur').value||15))*1000;
    var n=pool.length,size=Math.max(.72,Math.min(1.25,1.3-n*.012));
    chickens=pool.map(function(name){return {name:name,x:80+Math.random()*(W-160),y:90+Math.random()*(H-170),a:Math.random()*6.28,u:size,ph:Math.random()*6,fl:0,pal:PAL[Math.floor(Math.random()*PAL.length)],vx:1,flip:1};});
    target=null;chase=null;nextSwitch=0;
    farmer={x:W/2,y:H-70,fx:1,ph:0,sw:0};
    phase='run';t0=performance.now();last=t0;
    q('bgOv').style.display='none';
    q('bgLeft').textContent='🐔 '+n;
    cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }
  q('bgStart').onclick=function(){
    pool=parseNames();
    if(!pool.length){info('Hãy nhập ít nhất một tên học sinh.');return;}
    caught=[];info('');
    q('bgSetup').style.display='none';q('bgGame').style.display='block';
    goFs();startRound();
  };
  function exitFs(){if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen();}
  function goFs(){
    if(document.fullscreenElement||document.webkitFullscreenElement)return;
    var f=stage.requestFullscreen||stage.webkitRequestFullscreen;
    if(f){try{var r=f.call(stage);if(r&&r.catch)r.catch(function(){});}catch(e){}}
  }
  function backToList(){clearTimeout(exitT);fwStop();phase='idle';cancelAnimationFrame(raf);exitFs();q('bgGame').style.display='none';q('bgSetup').style.display='block';}
  q('bgBack').onclick=backToList;q('bgBack2').onclick=backToList;
  q('bgAgain').onclick=function(){
    if(!pool.length){backToList();info('Đã hết tên trong danh sách!');return;}
    goFs();startRound();
  };
  q('bgX').onclick=function(){exitFs();};
  q('bgFs').onclick=function(){
    if(document.fullscreenElement){exitFs();return;}
    if(stage.requestFullscreen)stage.requestFullscreen().catch(function(){});
  };

  function pickChase(now){
    var arr=chickens.map(function(c){return {c:c,d:Math.hypot(c.x-farmer.x,c.y-farmer.y)};}).sort(function(a,b){return a.d-b.d;}).slice(0,4).map(function(o){return o.c;});
    if(arr.length>1)arr=arr.filter(function(c){return c!==chase;});
    chase=arr[Math.floor(Math.random()*arr.length)];
    nextSwitch=now+1200+Math.random()*2800;
  }

  function loop(now){
    if(phase==='idle'||phase==='done')return;
    if(!stage.getClientRects().length){t0+=now-last;last=now;raf=requestAnimationFrame(loop);return;} /* đang ẩn: dừng đồng hồ */
    var gap=now-last;if(gap>250)t0+=gap-16;
    var dt=Math.min(.05,gap/1000);last=now;
    var el=now-t0;
    if(phase==='run'&&el>=T){phase='catch';target=chase||chickens[0];}
    var prog=Math.min(el/T,1);

    chickens.forEach(function(c){
      c.a+=(Math.random()-.5)*4*dt;
      var sp=90+(c.pal.b.charCodeAt(2)%7)*6,fleeing=false;
      var dx=c.x-farmer.x,dy=c.y-farmer.y,d=Math.hypot(dx,dy);
      var frozen=phase!=='run'&&c===target;
      if(!frozen&&d<180){
        var away=Math.atan2(dy,dx);
        c.a+=Math.atan2(Math.sin(away-c.a),Math.cos(away-c.a))*Math.min(1,6*dt);
        sp+=(180-d)*1.6;fleeing=true;
      }
      if(frozen)sp=0;
      c.vx=Math.cos(c.a)*sp;var vy=Math.sin(c.a)*sp;
      c.x+=c.vx*dt;c.y+=vy*dt;
      if(c.x<40){c.x=40;c.a=Math.PI-c.a;}
      if(c.x>W-40){c.x=W-40;c.a=Math.PI-c.a;}
      if(c.y<85){c.y=85;c.a=-c.a;}
      if(c.y>H-40){c.y=H-40;c.a=-c.a;}
      c.ph+=sp*dt*.11;
      c.fl+=(frozen?38:fleeing?30:7)*dt;
      if(sp>0)c.flip=c.vx>=0?1:-1;
    });

    if(phase==='run'){
      if(!chase||now>nextSwitch)pickChase(now);
      else{ /* có con khác chạy sượt qua rất gần thì dễ đổi hướng */
        var dc=Math.hypot(chase.x-farmer.x,chase.y-farmer.y);
        for(var i=0;i<chickens.length;i++){
          var c2=chickens[i];
          if(c2!==chase&&Math.hypot(c2.x-farmer.x,c2.y-farmer.y)<dc*.45&&Math.random()<dt*1.2){chase=c2;nextSwitch=now+1200+Math.random()*2800;break;}
        }
      }
    }
    var goal=phase==='run'?chase:target;
    var tx=goal.x-farmer.x,ty=goal.y-farmer.y,td=Math.hypot(tx,ty)||1;
    var fs=phase==='run'?(110+70*prog):700;
    var wob=phase==='run'?Math.sin(now/260)*40:0;
    var mx=(tx/td*fs+(-ty/td)*wob)*dt,my=(ty/td*fs+(tx/td)*wob)*dt;
    farmer.x=Math.max(30,Math.min(W-30,farmer.x+mx));
    farmer.y=Math.max(90,Math.min(H-50,farmer.y+my));
    farmer.ph+=Math.hypot(mx,my)*.06;
    if(Math.abs(tx)>5)farmer.fx=tx>0?1:-1;
    farmer.sw=(phase==='catch'||td<70)?Math.sin(now/60)*.5:0;

    curT=phase==='run'?Math.ceil((T-el)/1000)+'s':'Bắt!';q('bgTimer').textContent=curT;
    draw();
    if(phase==='catch'&&td<42){phase='done';finish();return;}
    raf=requestAnimationFrame(loop);
  }

  function finish(){
    caught.push(target.name);
    if(q('bgRemove').checked)pool=pool.filter(function(n){return n!==target.name;});
    q('bgWin').textContent=target.name;
    q('bgHist').textContent='Đã bắt: '+caught.join(', ');
    q('bgLeft').textContent='🐔 '+pool.length;
    q('bgOv').style.display='flex';
    fwStart();
    clearTimeout(exitT);exitT=setTimeout(exitFs,5000); /* 5 giây sau thì thu nhỏ màn hình */
    fwT=setTimeout(fwStop,12000);
  }

  function label(t,x,y,hl){
    ctx.font='bold 14px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    var w=ctx.measureText(t).width+14;
    ctx.fillStyle=hl?'#e8590c':'rgba(255,255,255,.93)';
    ctx.beginPath();ctx.roundRect(x-w/2,y-11,w,22,11);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=hl?'#fff':'#222';ctx.fillText(t,x,y+1);
  }
  function timerPill(){
    ctx.font='bold 30px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    var tx='⏱ '+curT,w=ctx.measureText(tx).width+36;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.roundRect(W/2-w/2,8,w,42,21);ctx.fill();
    ctx.fillStyle='#ffd166';ctx.fillText(tx,W/2,30);
  }
  function draw(){
    ctx.drawImage(bg,0,0);
    var items=chickens.map(function(c){return {y:c.y,c:c};});items.push({y:farmer.y,f:1});
    items.sort(function(a,b){return a.y-b.y;});
    items.forEach(function(it){
      if(it.f){drawFarmer(farmer.x,farmer.y,.95,farmer.fx,farmer.ph,farmer.sw);return;}
      var c=it.c;
      drawChicken(c.x,c.y,c.u,c.flip,c.ph,c.fl,c.pal);
      label(c.name,c.x,c.y-34*c.u,c===target&&phase!=='run');
    });
  }
})();
