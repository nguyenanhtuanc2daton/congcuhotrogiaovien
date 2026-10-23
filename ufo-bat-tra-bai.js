/* =====================================================================
   ufo-bat-tra-bai.js  —  Trò chơi "UFO bắt trả bài" cho công cụ "Gọi tên học sinh"
   - Tự thêm nút "🛸 UFO" cạnh nút "Bắt gà" (cạnh "Vòng quay").
   - Lấy danh sách tên từ ô "Mỗi dòng một tên học sinh" của công cụ.
   - Chạy trong Shadow DOM nên không ảnh hưởng/va chạm với CSS & JS của trang.
   - Gọi tay (nếu cần):  UFOGame.open()  |  UFOGame.open(['An','Bình'])  |  UFOGame.close()
   ===================================================================== */
(function(){
'use strict';
if(window.UFOGame)return;
if(window.CanvasRenderingContext2D&&!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(Array.isArray(r)?r[0]:(r||0),w/2,h/2);this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath()}}
const CSS=`
:host{--g:#2e5a43;--bg:#f7f8f2}
*{box-sizing:border-box;margin:0}
#app{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:var(--bg);font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:var(--g);overflow:hidden;font-size:16px;line-height:1.35}
header{padding:8px 14px;padding-top:calc(8px + env(safe-area-inset-top,0px));font-weight:800;font-size:18px;display:flex;gap:10px;align-items:center}
header small{font-weight:600;opacity:.6}
#stage{position:relative;flex:1;min-height:0}
canvas{position:absolute;inset:0;width:100%;height:100%}
#hud{position:absolute;left:50%;top:10px;transform:translateX(-50%);width:min(560px,92%);background:rgba(247,248,242,.92);border-radius:14px;padding:12px 16px;box-shadow:0 4px 18px #0003;transition:background .6s,color .6s}
#hud.dark{background:rgba(25,50,45,.9);color:#d9f5c7}
#msg{font-weight:700;margin-bottom:8px}
#pill{display:inline-block;background:#e5ecd9;border:2px solid #cdd8bd;border-radius:10px;padding:4px 12px;font-weight:800;color:var(--g)}
#bar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid #dde3d4}
button{font:inherit;font-weight:700;border:0;border-radius:12px;padding:10px 16px;background:#eef0e8;color:var(--g);cursor:pointer;box-shadow:0 3px 0 #cfd4c6}
button.main{background:var(--g);color:#fff;box-shadow:0 3px 0 #1c3a2a;min-width:130px}
button:disabled{opacity:.55;cursor:default}
button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #e0a63a;outline-offset:2px}
input[type=number]{width:60px;font:inherit;font-weight:800;padding:8px;border:2px solid #cfd4c6;border-radius:10px;text-align:center;color:var(--g)}
.ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#0006;padding:14px;z-index:5}
.ov.on{display:flex}
#card{background:#1f3f42;color:#f2f7ea;border-radius:26px;border:6px solid #b9c7c4;padding:22px;width:min(520px,100%);max-height:100%;overflow:auto;position:relative}
#card h2{font-size:24px;line-height:1.25;margin:6px 0 14px;padding-right:90px}
#card .st{position:absolute;right:16px;top:20px;border:3px solid #d98e5a;color:#e9a06a;border-radius:8px;padding:4px 10px;font-weight:900;transform:rotate(-8deg)}
.tile{display:flex;align-items:center;gap:14px;background:#e6ecd9;color:#1f4a35;border-radius:18px;padding:10px 14px;margin-bottom:10px;font-size:30px;font-weight:900}
.tile canvas{position:static;width:64px;height:64px;border-radius:16px;background:#d3dcc8}
#set{background:#fff;border-radius:18px;padding:18px;width:min(460px,100%);display:flex;flex-direction:column;gap:10px}
textarea{width:100%;height:240px;font:inherit;padding:10px;border:2px solid #cfd4c6;border-radius:10px;color:#223}
label{display:flex;gap:8px;align-items:center;font-weight:600}
#set{max-height:100%;overflow:auto}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.row button,.row label.fb{padding:8px 12px;font-size:14px;border-radius:10px;background:#eef0e8;box-shadow:0 3px 0 #cfd4c6;cursor:pointer}
#sinfo{font-size:14px;min-height:18px;font-weight:600;opacity:.85}
#scnt{font-size:14px;font-weight:600;opacity:.7}
`;
const HTML=`<div id="app">
<header>🛸 UFO BẮT TRẢ BÀI <small>Gọi tên học sinh</small><button id="x" style="margin-left:auto;padding:6px 14px">✕ Đóng</button></header>
<div id="stage"><canvas id="cv"></canvas>
<div id="hud"><div id="msg"></div><span id="pill"></span> <button id="edit" style="padding:4px 12px;margin-left:8px" title="Sửa danh sách">✏️ Sửa</button></div>
<div class="ov" id="res"><div id="card"><div class="st">ĐÃ BẮT</div><div style="font-weight:700;opacity:.8">Khoang hành khách</div><h2>Chuyến bay này cần phi hành gia thuộc bài!</h2><div id="tiles"></div><div style="text-align:right"><button id="close">Đóng</button></div></div></div>
<div class="ov" id="sov"><div id="set"><b>Danh sách học sinh (mỗi dòng một tên)</b><textarea id="ta"></textarea>
<div class="row"><label class="fb">📂 Nhập Excel/CSV<input type="file" id="fi" accept=".xlsx,.xls,.csv,.txt" hidden></label><button id="sw">⬇ Từ Vòng quay</button><button id="sb">⬇ Từ Bắt gà</button><button id="st">⬇ Từ Bảng điểm</button><button id="sx">Xóa</button></div>
<div class="row"><span id="scnt"></span></div><div id="sinfo"></div>
<label><input type="checkbox" id="shn" checked> Hiện tên trên đầu nhân vật</label>
<div style="display:flex;gap:8px;justify-content:flex-end"><button id="sc">Hủy</button><button class="main" id="ss" style="min-width:0">Lưu</button></div></div></div>
</div>
<div id="bar">
<button class="main" id="go">🛸 Bắt đầu</button>
<label>Số bạn được gọi <input type="number" id="cnt" min="1" max="10" value="1"></label>
<button id="rs">↻ Vòng mới</button><button id="fs">⛶ Toàn màn hình</button><button id="cfg">⚙ Cài đặt</button><button id="mu">🔊</button>
</div>
</div>`;
let host,root,app,$,cv,ctx,on=false,built=false,prevOverflow='';

const DEF="Đức Huy,Hoàng Nam,Ngọc Linh,Gia Bảo,Tuấn Kiệt,Hà My,Thu Hà,Nhật Minh,Quốc Bảo,Thảo Nhi,Anh Khoa,Khánh Vy,Bảo Ngọc,Thành Đạt,Quỳnh Chi,Hải Đăng,Đình Phong,Hồng Nhung,Khánh Ngân,Thanh Trúc,Bảo An,Đăng Khoa,Thiên Phúc,Thanh Tâm,Trọng Nhân,Ngọc Mai,Yến Nhi,Phúc An,Minh Anh,Gia Hân,Bảo Châu,Tiến Dũng".split(',');
let names=DEF.slice(),showNames=true,muted=false,busy=false,called=[],gen=0;
let W,H,dpr=1,bg,people=[],poles=[],bubbles=[],night=0,beam={on:0,x:0,wd:0},ufo={x:0,fy:-.3},ban=null,tagsOff=false,flash=0;
const R=(a,b)=>a+Math.random()*(b-a),P=a=>a[Math.random()*a.length|0],L=(a,b,t)=>a+(b-a)*t,E=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const wait=ms=>{const g=gen;return new Promise((r,j)=>setTimeout(()=>g===gen?r():j('abort'),ms))};
const tw=(d,f)=>{const g=gen;return new Promise((r,j)=>{const s=performance.now();(function k(n){if(g!==gen)return j('abort');const t=Math.min(1,(n-s)/d);f(t);t<1?requestAnimationFrame(k):r()})(s)})};
/* ---------- sound ---------- */
let ac,mg,sir;
function au(){if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();mg=ac.createGain();mg.gain.value=muted?0:.6;mg.connect(ac.destination)}ac.resume()}
function tone(f,d,ty='sine',v=.12,f2,dl=0){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+dl;o.type=ty;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(mg);o.start(t);o.stop(t+d)}
function sirenOn(){if(!ac||sir)return;const o=ac.createOscillator(),l=ac.createOscillator(),lg=ac.createGain(),g=ac.createGain(),f=ac.createBiquadFilter();o.type='sawtooth';o.frequency.value=560;l.frequency.value=.8;lg.gain.value=300;l.connect(lg);lg.connect(o.frequency);f.type='lowpass';f.frequency.value=1500;g.gain.setValueAtTime(0,ac.currentTime);g.gain.linearRampToValueAtTime(.16,ac.currentTime+1.5);o.connect(f);f.connect(g);g.connect(mg);o.start();l.start();sir={o,l,g}}
function sirenOff(){if(!sir)return;const s=sir;sir=null;s.g.gain.linearRampToValueAtTime(0,ac.currentTime+.8);setTimeout(()=>{s.o.stop();s.l.stop()},900)}
/* ---------- scene ---------- */
function scooter(c,x,y,s,col){c.fillStyle='#2b3440';[0,1].forEach(i=>{c.beginPath();c.arc(x+i*s*1.6,y,s*.35,0,7);c.fill()});c.fillStyle=col;c.beginPath();c.roundRect(x-s*.1,y-s*.9,s*1.6,s*.6,s*.25);c.fill();c.fillRect(x+s*1.3,y-s*1.4,s*.12,s*.7)}
function mkbg(){
 bg=document.createElement('canvas');bg.width=W*dpr;bg.height=H*dpr;const c=bg.getContext('2d');c.scale(dpr,dpr);
 let g=c.createLinearGradient(0,0,0,H*.4);g.addColorStop(0,'#a9dfe8');g.addColorStop(1,'#eaf3ea');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='rgba(255,255,255,.85)';[[.1,.05],[.85,.08],[.55,.03]].forEach(([x,y])=>{for(let i=0;i<4;i++){c.beginPath();c.ellipse(W*x+i*H*.03,H*y+(i%2)*H*.01,H*.04,H*.022,0,0,7);c.fill()}});
 const B=[[0,.24,'#e9b3a6','TIỆM BÁNH','#c8432f'],[.24,.54,'#f2dcb4','NHÀ SÁCH','#e69a47'],[.54,.8,'#b7d8c4','CÀ PHÊ','#2f4a45'],[.8,1,'#eec3b4','BÚN BÒ HUẾ','#c8432f']];
 B.forEach(([a,b,col,t,sc])=>{const x=W*a,w=W*(b-a);c.fillStyle=col;c.fillRect(x,H*.1,w,H*.36);c.fillStyle='#7fb0a5';
  for(let r=0;r<2;r++)for(let i=0;i<2;i++)c.fillRect(x+w*(.15+i*.45),H*(.14+r*.07),w*.25,H*.05);
  c.fillStyle=sc;c.fillRect(x,H*.3,w,H*.055);c.fillStyle='#fff';c.font=`800 ${H*.019}px system-ui`;c.textAlign='center';c.fillText(t,x+w/2,H*.335);
  for(let i=0;i<10;i++){c.fillStyle=i%2?'#fff':'#d4432f';c.fillRect(x+w*i/10,H*.355,w/10+1,H*.03)}
  c.fillStyle='#9cc3b0';c.fillRect(x,H*.385,w,H*.075)});
 c.fillStyle='#6cc08a';[[.68,.25,.07],[.64,.29,.05],[.72,.29,.05]].forEach(([x,y,r])=>{c.beginPath();c.arc(W*x,H*y,H*r,0,7);c.fill()});
 c.fillStyle='#6b3f2a';c.fillRect(W*.68-3,H*.3,6,H*.1);
 c.fillStyle='#66727e';c.fillRect(0,H*.46,W,H*.14);c.fillStyle='#ffffff99';for(let x=0;x<W;x+=H*.12)c.fillRect(x,H*.53,H*.06,3);
 c.fillStyle='#e3d7c4';c.fillRect(0,H*.6,W,H*.4);c.fillStyle='#b9ab95';c.fillRect(0,H*.6,W,4);
 c.strokeStyle='#cfc2ac';c.lineWidth=1;for(let y=H*.62,i=1;y<H;y+=H*.02*i,i+=.25){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
 for(let x=-W;x<2*W;x+=H*.09){c.beginPath();c.moveTo(x,H*.6);c.lineTo(W/2+(x-W/2)*3,H);c.stroke()}
 c.fillStyle='#f4f4f0';c.beginPath();c.roundRect(W*.6,H*.47,H*.22,H*.07,10);c.fill();c.fillStyle='#8cc0c6';c.fillRect(W*.6+H*.04,H*.455,H*.13,H*.03);c.fillStyle='#e9a825';c.fillRect(W*.6+H*.08,H*.44,H*.05,H*.015);
 scooter(c,W*.08,H*.45,H*.035,'#f0c040');scooter(c,W*.38,H*.45,H*.03,'#6b8f3a');scooter(c,W*.9,H*.5,H*.035,'#e09a3a');scooter(c,W*.52,H*.62,H*.04,'#4a78a8');
 c.fillStyle='#d4432f';c.fillRect(W*.2,H*.39,H*.11,H*.06);c.fillStyle='#fff';c.fillRect(W*.2,H*.38,H*.11,H*.012);c.font=`700 ${H*.01}px system-ui`;c.fillText('XÔI NÓNG',W*.2+H*.055,H*.425);
}
function mkpoles(){poles=[[.14,.76],[.5,.76],[.86,.76],[.12,.93],[.5,.93],[.88,.93]].map(([a,b])=>({x:W*a,y:H*b,isPole:1}))}
function resize(){if(!cv)return;const r=cv.getBoundingClientRect();if(!r.width||!r.height)return;dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;mkbg();mkpoles();ufo.x=W/2;people.forEach(p=>{p.x=Math.min(p.x,W);p.y=Math.min(Math.max(p.y,H*.48),H*.97)})}
function mk(n){const sk=Math.random()<.5;return{name:n,x:R(0,W),y:R(.5,.96)*H,dir:Math.random()<.5?-1:1,spd:R(.04,.08),ph:R(0,6),mode:'walk',t:0,sk,long:sk||Math.random()<.2,
 skin:P(['#f1c9a5','#e0a97d','#b9794f','#8a5a3a']),hair:P(['#2a1b14','#1d1d22','#4a2c1c']),shirt:P(['#f4f4ee','#dbe9f2','#f6d9de','#fbf0d6']),pant:sk?P(['#7a6a55','#5b5f78']):P(['#4b5b58','#2f3c55','#6d6f61']),bag:P(['#d9798b','#8a7ac8','#e0a24a','#d86b52']),up:0}}
function rebuild(){people=names.filter(n=>!called.includes(n)).map(mk);$('pill').textContent=names.length+' học sinh'}
const ufoBot=()=>ufo.fy*H+Math.min(W*.8,H*.8)*.1;
/* ---------- drawing people ---------- */
function head(c,p,pan){if(p.long){c.fillStyle=p.hair;c.fillRect(-12,-90,24,28)}c.fillStyle=p.skin;c.beginPath();c.arc(0,-84,11,0,7);c.fill();c.fillStyle=p.hair;c.beginPath();c.arc(0,-86,12,Math.PI,0);c.fill();c.fillRect(-12,-87,24,4);
 c.fillStyle='#222';c.beginPath();c.arc(-4,-83,1.7,0,7);c.arc(4,-83,1.7,0,7);c.fill();c.strokeStyle='#7a3b30';c.lineWidth=1.4;c.beginPath();if(pan)c.ellipse(0,-77,3,3.6,0,0,7);else c.arc(0,-78,3,.2,2.9);c.stroke();
 if(pan){c.fillStyle='#7ad0ff';c.beginPath();c.arc(-14,-92,2,0,7);c.arc(15,-88,2,0,7);c.fill()}}
function drawP(p,tm){
 const hs=H*(.07+.06*p.y/H)/100;ctx.save();
 let ox=0,oy=0,rot=0,sc=1;
 const lk=(p.lk||0)*H*.015;
 if(p.mode==='lock'){ox=Math.sin(tm*60)*1.6;oy=-lk}
 if(p.mode==='up'){const e=E(p.up);oy=-(p.y0-ufoBot())*e-lk*(1-e);rot=Math.sin(e*10)*.4+e*2.5;sc=1-.9*e}
 if(p.mode==='up'||p.mode==='lock'){const gx=p.x+ox,gy=p.y+oy-50*hs*sc,gr=hs*55*Math.max(sc,.3);const gg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);gg.addColorStop(0,'rgba(215,255,240,.8)');gg.addColorStop(1,'rgba(215,255,240,0)');ctx.fillStyle=gg;ctx.fillRect(gx-gr,gy-gr,gr*2,gr*2)}
 if(p.mode==='hug')ox=Math.sin(tm*40+p.ph)*.8;
 if(p.mode==='panic')oy=-Math.abs(Math.sin(p.ph))*H*.008;
 ctx.translate(p.x+ox,p.y+oy);ctx.translate(0,-50*hs*sc);ctx.rotate(rot);ctx.translate(0,50*hs*sc);
 ctx.fillStyle='#0002';ctx.beginPath();ctx.ellipse(0,0,hs*14*sc,hs*4*sc,0,0,7);if(p.mode!=='up')ctx.fill();
 ctx.scale(hs*p.dir*sc,hs*sc);
 const mv=p.mode==='walk'||p.mode==='run'||p.mode==='panic',sw=mv?Math.sin(p.ph)*(p.mode==='walk'?.7:1):0,pan=p.mode==='panic'||p.mode==='hug'||p.mode==='up'||p.mode==='lock';
 ctx.lineCap='round';ctx.fillStyle=p.bag;ctx.beginPath();ctx.roundRect(-18,-74,10,28,4);ctx.fill();
 ctx.strokeStyle=p.sk?p.skin:p.pant;ctx.lineWidth=7;
 [-1,1].forEach(s=>{ctx.beginPath();ctx.moveTo(s*4,-42);ctx.lineTo(s*4+s*sw*15,-3);ctx.stroke()});
 if(p.sk){ctx.fillStyle=p.pant;ctx.beginPath();ctx.moveTo(-10,-48);ctx.lineTo(10,-48);ctx.lineTo(14,-30);ctx.lineTo(-14,-30);ctx.fill()}
 ctx.fillStyle=p.shirt;ctx.beginPath();ctx.roundRect(-11,-74,22,30,6);ctx.fill();
 ctx.strokeStyle=p.shirt;ctx.lineWidth=6;
 [-1,1].forEach(s=>{ctx.beginPath();ctx.moveTo(s*11,-70);
  if(p.mode==='hug')ctx.lineTo(17,-62+s*3);else if(p.mode==='panic'||p.mode==='up'||p.mode==='lock')ctx.lineTo(s*22,-100+Math.sin(tm*25+s)*5);else ctx.lineTo(s*13-s*sw*8,-50);ctx.stroke()});
 head(ctx,p,pan);ctx.restore()}
function drawPole(p){const x=p.x,y=p.y,h=H*.33,w=H*.011;ctx.fillStyle='#2f5b47';ctx.beginPath();ctx.moveTo(x-w*1.8,y);ctx.lineTo(x-w*.5,y-h*.12);ctx.lineTo(x+w*.5,y-h*.12);ctx.lineTo(x+w*1.8,y);ctx.fill();
 ctx.fillRect(x-w/2,y-h,w,h*.9);ctx.fillRect(x-w/2,y-h,w*5,w*.8);ctx.fillStyle=night>.3?'#fff7c0':'#cfd6c4';ctx.fillRect(x+w*3,y-h+w*.5,w*2.4,w*.7);
 if(night>.05){const g=ctx.createRadialGradient(x+w*4,y-h+w,0,x+w*4,y-h+w,H*.1);g.addColorStop(0,`rgba(255,240,170,${.5*night})`);g.addColorStop(1,'rgba(255,240,170,0)');ctx.fillStyle=g;ctx.fillRect(x-H*.1,y-h-H*.1,H*.3,H*.25)}}
function drawUfo(){const x=ufo.x,y=ufo.fy*H,w=Math.min(W*.8,H*.8),h=w*.2,t=performance.now()/1000;
 if(beam.on>0){const bx=beam.x,by=beam.y||H*.8,bw=beam.wd||W*.1;let g=ctx.createLinearGradient(0,y,0,by);g.addColorStop(0,`rgba(200,255,235,${.6*beam.on})`);g.addColorStop(1,`rgba(160,235,210,${.22*beam.on})`);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-w*.1,y+h*.5);ctx.lineTo(x+w*.1,y+h*.5);ctx.lineTo(bx+bw,by);ctx.lineTo(bx-bw,by);ctx.fill();
  ctx.fillStyle=`rgba(210,255,240,${.35*beam.on})`;ctx.beginPath();ctx.ellipse(bx,by,bw,bw*.22,0,0,7);ctx.fill()}
 ctx.fillStyle='rgba(180,230,240,.55)';ctx.beginPath();ctx.ellipse(x,y-h*.1,w*.2,h*.95,0,Math.PI,0);ctx.fill();
 ctx.fillStyle='#7fcf6a';[-1,1].forEach(s=>{ctx.beginPath();ctx.ellipse(x+s*w*.07,y-h*.28,w*.03,h*.3,0,0,7);ctx.fill();ctx.fillRect(x+s*w*.07-1,y-h*.75,2,h*.25)});
 let g=ctx.createLinearGradient(0,y-h*.5,0,y+h*.5);g.addColorStop(0,'#f6f8f6');g.addColorStop(.6,'#b8c3c3');g.addColorStop(1,'#78888c');
 ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,w/2,h/2,0,0,7);ctx.fill();
 for(let i=0;i<7;i++){ctx.fillStyle=['#ffd35a','#7fe6d0','#9fd0ff'][(i+(t*3|0))%3];ctx.beginPath();ctx.arc(x-w*.4+i*w*.133,y+h*.1+Math.sin(i/6*Math.PI)*h*.1,w*.014,0,7);ctx.fill()}
 ctx.fillStyle='#bff5dc';ctx.beginPath();ctx.ellipse(x,y+h*.5,w*.12,h*.12,0,0,7);ctx.fill();
 if(flash>0){const g2=ctx.createRadialGradient(x,y+h*.5,0,x,y+h*.5,w*.28);g2.addColorStop(0,`rgba(255,255,255,${flash})`);g2.addColorStop(1,'rgba(200,255,235,0)');ctx.fillStyle=g2;ctx.fillRect(x-w*.3,y-w*.2,w*.6,w*.6)}
 if(ban){const sc=E(Math.min(1,ban.s)),fs=Math.max(18,H*.04);ctx.save();ctx.translate(x,y+h*.5+H*.1);ctx.scale(sc,sc);ctx.font=`800 ${fs}px system-ui`;ctx.textAlign='center';const bwid=ctx.measureText(ban.t).width+44;ctx.fillStyle='#1f3f42';ctx.strokeStyle='#b9c7c4';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-bwid/2,-fs*.95,bwid,fs*1.7,fs*.55);ctx.fill();ctx.stroke();ctx.fillStyle='#f2f7ea';ctx.fillText(ban.t,0,fs*.25);ctx.restore()}}
/* ---------- update/draw loop ---------- */
let last=performance.now(),raf=0;
function frame(n){raf=requestAnimationFrame(frame);const dt=Math.min(.05,(n-last)/1e3);last=n;const tm=n/1e3;
 people.forEach(p=>{if(p.mode==='gone'||p.mode==='up')return;
  if(p.mode==='walk'){p.x+=p.dir*p.spd*H*dt;p.ph+=dt*p.spd*H/ (H*.012);if(p.x>W+30)p.x=-30;if(p.x<-30)p.x=W+30}
  else if(p.mode==='panic'){p.t-=dt;if(p.t<=0){p.t=R(.3,.8);p.vx=R(-1,1)*H*.45;p.vy=R(-1,1)*H*.18}p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(p.x<10||p.x>W-10){p.vx*=-1;p.x=Math.min(W-10,Math.max(10,p.x))}if(p.y<H*.48||p.y>H*.97){p.vy*=-1;p.y=Math.min(H*.97,Math.max(H*.48,p.y))}if(p.vx)p.dir=Math.sign(p.vx);p.ph+=dt*20}
  else if(p.mode==='run'){const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),s=H*.5*dt;p.ph+=dt*20;if(d<s){p.x=p.tx;p.y=p.ty;p.mode='hug';p.dir=p.pole.x>=p.x?1:-1}else{p.x+=dx/d*s;p.y+=dy/d*s;p.dir=dx>=0?1:-1}}});
 if(ufo.scan)ufo.x=L(ufo.x,W/2+(beam.x-W/2)*.45,.03);
 if(!bg||!W)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.drawImage(bg,0,0,W,H);
 const list=people.filter(p=>p.mode!=='gone'&&p.mode!=='up'&&p.mode!=='lock').concat(poles).sort((a,b)=>a.y-b.y);
 list.forEach(o=>o.isPole?drawPole(o):drawP(o,tm));
 if(showNames&&!tagsOff){const fs=Math.max(10,Math.min(14,H*.016));ctx.font=`600 ${fs}px system-ui`;ctx.textAlign='center';
  people.forEach(p=>{if(p.mode==='gone'||p.mode==='up'||p.mode==='lock')return;const ty=p.y-H*(.075+.06*p.y/H)-8,w=ctx.measureText(p.name).width+12;ctx.fillStyle='rgba(255,255,255,.88)';ctx.beginPath();ctx.roundRect(p.x-w/2,ty-fs,w,fs+8,8);ctx.fill();ctx.fillStyle='#2e5a43';ctx.fillText(p.name,p.x,ty)})}
 if(night>0){ctx.fillStyle=`rgba(14,30,52,${night*.58})`;ctx.fillRect(0,0,W,H)}
 poles.forEach(o=>{if(night>.3)drawPole(o)});
 people.forEach(p=>{if(p.mode==='up'||p.mode==='lock')drawP(p,tm)});
 drawUfo();
 bubbles=bubbles.filter(b=>b.until>n);ctx.font=`600 ${Math.max(11,H*.017)}px system-ui`;
 bubbles.forEach(b=>{const w=ctx.measureText(b.t).width+20,x=Math.min(W-w/2-4,Math.max(w/2+4,b.p.x)),y=b.p.y-H*.15;ctx.fillStyle='#e6f3d8';ctx.beginPath();ctx.roundRect(x-w/2,y-14,w,26,13);ctx.fill();ctx.fillStyle='#2e5a43';ctx.fillText(b.t,x,y+4)})}
const chatTick=()=>{if(busy||!people.length)return;const p=P(people);bubbles=[{p,t:P(['Ước gì ba lô tự xếp sách!','Mình làm một tấm thiệp nhé!','Hôm nay ăn bánh mì nhé?','Hôm nay có kiểm tra không nhỉ?','Trời đẹp quá!']),until:performance.now()+2800}]};
/* ---------- game flow ---------- */
const say=(m,d)=>{$('msg').textContent=m;$('hud').classList.toggle('dark',!!d)};
const ctrls=['go','rs','cfg','edit','cnt'];const lock=v=>ctrls.forEach(i=>$(i).disabled=v);
function avatar(p){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.scale(5,5);x.translate(12.8,12.8+84);x.fillStyle=p.shirt;x.fillRect(-14,-76,28,14);head(x,p,false);return c}
async function round(){let ch=0;try{
 if(busy)return;const alive=people.filter(p=>p.mode!=='gone');if(!alive.length){say('Hết tên rồi! Bấm “Vòng mới” để chơi lại.');return}
 busy=true;lock(true);au();bubbles=[];const k=Math.max(1,Math.min(+$('cnt').value||1,alive.length,10));
 say('Cảnh báo! UFO đang đến gần…',1);sirenOn();
 const t0=night;await tw(3200,t=>{ufo.fy=L(-.3,.13,E(t));night=L(t0,1,t);$('hud').classList.toggle('dark',t>.4)});
 say('Chạy đi! Mọi người hoảng loạn!',1);alive.forEach(p=>{p.mode='panic';p.t=0});
 ch=setInterval(()=>tone(R(800,1300),.14,'square',.03,R(1300,1800)),260);await wait(3600);clearInterval(ch);
 say('Bám chặt nhé! UFO đang dò tín hiệu…',1);
 const sh=alive.slice().sort(()=>Math.random()-.5),per=Math.ceil(sh.length/poles.length)+1;
 sh.forEach((p,i)=>{const pl=poles[i%poles.length],j=Math.floor(i/poles.length),s=j%2?1:-1,r=Math.floor(j/2);p.pole=pl;p.tx=pl.x+s*(H*.022+r*H*.014);p.ty=pl.y+((r%3)-1)*H*.02;p.mode='run'});
 for(let i=0;i<35&&!sh.every(p=>p.mode==='hug');i++)await wait(200);
 sh.forEach(p=>{if(p.mode!=='hug'){p.x=p.tx;p.y=p.ty;p.mode='hug';p.dir=p.pole.x>=p.x?1:-1}});
 await wait(500);say('Bạn nào sắp tuột tay đây…',1);ufo.scan=true;beam.x=W/2;beam.y=H*.8;
 tone(220,1.2,'sine',.1,660);await tw(5000,t=>{beam.on=Math.min(1,t*4);beam.x=W/2+Math.sin(t*Math.PI*3)*W*.4;beam.y=H*(.7+.12*Math.sin(t*9))});
 const picks=sh.slice().sort(()=>Math.random()-.5).slice(0,k),got=[];
 tagsOff=true;
 for(const [i,p] of picks.entries()){const f=i?.6:1,bx0=beam.x,by0=beam.y,w0=beam.wd||W*.1;
  say(i?'UFO dò tiếp một mục tiêu…':'UFO đã phát hiện một mục tiêu…',1);
  await tw(1100*f,t=>{beam.x=L(bx0,p.x,E(t));beam.y=L(by0,p.y,E(t));beam.wd=L(w0,W*.1,E(t))});
  say('Khóa mục tiêu! Có người đang bị hút lên…',1);
  const w1=W*.1;p.mode='lock';p.lk=0;tone(300,1,'sawtooth',.06,900);
  await tw(1000*f,t=>{beam.wd=L(w1,Math.max(H*.055,W*.04),E(t));p.lk=E(t)});
  say('Aaa… người đó đang bị hút lên UFO!',1);
  p.y0=p.y;p.mode='up';p.up=0;tone(200,3.2*f,'triangle',.12,1100);const sx=p.x;
  await tw(3200*f,t=>{p.up=t;p.x=L(sx,ufo.x,E(t))});
  p.mode='gone';flash=1;tone(900,.3,'sine',.12,1800);await tw(350,t=>flash=1-t);flash=0;
  got.push(p);called.push(p.name);
  ban={t:p.name,s:0};say('Đã bắt được: '+p.name+'!',1);[659,784,1047].forEach((fr,j)=>tone(fr,.4,'triangle',.12,0,j*.1));
  await tw(500,t=>ban.s=t);await wait(1500*f);ban=null}
 ufo.scan=false;await tw(500,t=>beam.on=1-t);beam.wd=0;sirenOff();
 [523,659,784,1047].forEach((f,i)=>tone(f,.5,'triangle',.12,0,i*.14));
 say('Phù… chuyến này thoát rồi! Ai sẽ là người tiếp theo?',1);
 const tl=$('tiles');tl.innerHTML='';got.forEach(p=>{const d=document.createElement('div');d.className='tile';d.appendChild(avatar(p));d.appendChild(document.createTextNode(p.name));tl.appendChild(d)});
 $('res').classList.add('on');await new Promise(r=>$('close').onclick=r);$('res').classList.remove('on');
 tagsOff=false;sh.forEach(p=>{if(p.mode==='hug'){p.mode='walk';p.dir=Math.random()<.5?-1:1}});
 const n0=night;await tw(2000,t=>{ufo.fy=L(.13,-.35,E(t));night=L(n0,0,t);$('hud').classList.toggle('dark',t<.5)});
 ufo.x=W/2;say('Lớp mẫu đã sẵn sàng. Chờ UFO thôi!');busy=false;lock(false)}catch(e){if(e!=='abort')throw e}finally{if(ch)clearInterval(ch)}}

/* ---------- tích hợp với trang ---------- */
function siteBox(){return document.getElementById('wNames')||[...document.querySelectorAll('textarea')].find(t=>/tên học sinh/i.test(t.placeholder||''))||null}
const lines=s=>String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
function readNamesFile(f,ok,fail){
 const fin=rows=>{const cols=Math.max(1,...rows.map(r=>r.length));let best=0,bs=-1;
  for(let c=0;c<cols;c++){const k=rows.filter(r=>{const v=String(r[c]==null?'':r[c]).trim();return v&&isNaN(Number(v))}).length;if(k>bs){bs=k;best=c}}
  const l=rows.map(r=>String(r[best]==null?'':r[best]).trim()).filter(Boolean);
  if(l.length&&/^(stt|họ|ho|tên|ten|name|danh sách)/i.test(l[0]))l.shift();
  ok(l)};
 if(/\.(txt|csv)$/i.test(f.name))f.text().then(t=>fin(t.replace(/^\uFEFF/,'').split(/\r?\n/).map(r=>r.split(/[,;\t]/).map(x=>x.trim().replace(/^"|"$/g,'')))),fail);
 else if(window.XLSX)f.arrayBuffer().then(b=>{const wb=XLSX.read(b,{type:'array'});fin(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''}))}).catch(fail);
 else fail();
}

const uniq=a=>{const s={};return a.map(n=>{s[n]=(s[n]||0)+1;return s[n]>1?n+' ('+s[n]+')':n})};
const srcWheel=()=>{const t=document.getElementById('wNames');return t?lines(t.value):[]};
const srcUfo=()=>{const t=document.getElementById('ufNames');return t?lines(t.value):[]};
const srcChicken=()=>{const t=document.getElementById('bgNames');return t?lines(t.value):[]};
const srcScore=()=>{try{return window.TG&&window.TG.names?window.TG.names().map(x=>String(x).trim()).filter(Boolean):[]}catch(e){return[]}};
function siteNames(){const bg=document.getElementById('bgNames'),uf=document.getElementById('ufNames');
 const vis=e=>e&&e.offsetParent!==null;
 const first=vis(uf)?[srcUfo,srcWheel,srcChicken]:vis(bg)?[srcChicken,srcWheel,srcUfo]:[srcWheel,srcChicken,srcUfo];
 for(const f of first.concat([srcScore])){const n=f();if(n.length)return n}return[]}
function reset(){gen++;busy=false;sirenOff();beam.on=0;beam.wd=0;ban=null;flash=0;tagsOff=false;night=0;ufo.fy=-.3;ufo.scan=false;bubbles=[];
 $('res').classList.remove('on');$('sov').classList.remove('on');lock(false);$('hud').classList.remove('dark')}
function fit(){if(!app)return;const v=window.visualViewport,s=app.style;
 if(v&&on&&!document.fullscreenElement&&(v.width<innerWidth-2||v.height<innerHeight-2)){s.inset='auto';s.left=v.offsetLeft+'px';s.top=v.offsetTop+'px';s.width=v.width+'px';s.height=v.height+'px'}
 else{s.inset='';s.left=s.top=s.width=s.height=''}}
let chatT=0;
function onKey(e){if(e.key==='Escape'&&!$('res').classList.contains('on')&&!$('sov').classList.contains('on'))close()}
function build(){
 if(built)return;built=true;
 host=document.createElement('div');host.id='ufo-bat-tra-bai-host';host.style.display='none';
 root=host.attachShadow({mode:'open'});
 root.innerHTML='<style>'+CSS+'</style>'+HTML;
 document.body.appendChild(host);
 $=id=>root.getElementById(id);app=$('app');cv=$('cv');ctx=cv.getContext('2d');
 $('go').onclick=round;
 $('rs').onclick=()=>{if(busy)return;called=[];rebuild();say('Vòng mới! Tất cả học sinh đã trở lại.')};
 $('fs').onclick=()=>{try{document.fullscreenElement?document.exitFullscreen():app.requestFullscreen()}catch(e){}};
 $('mu').onclick=()=>{muted=!muted;$('mu').textContent=muted?'🔇':'🔊';if(mg)mg.gain.value=muted?0:.6};
 const info=m=>$('sinfo').textContent=m||'',cnt=()=>$('scnt').textContent=lines($('ta').value).length+' học sinh';
 $('ta').addEventListener('input',cnt);
 const put=(n,msg)=>{if(!n.length){info('Nguồn này chưa có tên học sinh nào.');return}$('ta').value=n.join('\n');cnt();info(msg||'Đã lấy '+n.length+' tên. Bấm Lưu để áp dụng.')};
 $('sw').onclick=()=>put(srcWheel());$('sb').onclick=()=>put(srcChicken());$('st').onclick=()=>put(srcScore());
 $('sx').onclick=()=>{$('ta').value='';cnt();info('')};
 $('fi').onchange=e=>{const f=e.target.files[0];if(!f)return;
  readNamesFile(f,l=>l.length?put(l,'Đã nhập '+l.length+' tên từ file. Bấm Lưu để áp dụng.'):info('Không tìm thấy tên học sinh trong file.'),()=>info('Không đọc được file. Hãy thử dán tên trực tiếp vào ô nhập.'));
  e.target.value=''};
 const openSet=()=>{if(busy)return;$('ta').value=names.join('\n');cnt();info('');$('shn').checked=showNames;$('sov').classList.add('on')};
 $('cfg').onclick=$('edit').onclick=openSet;$('sc').onclick=()=>$('sov').classList.remove('on');
 $('ss').onclick=()=>{const n=$('ta').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(n.length){names=uniq(n);called=[];rebuild();
   const t=siteBox();if(t){t.value=n.join('\n');['input','change'].forEach(ev=>t.dispatchEvent(new Event(ev,{bubbles:true})))}
    const u=document.getElementById('ufNames');if(u){u.value=n.join('\n');u.dispatchEvent(new Event('input',{bubbles:true}))}}
  showNames=$('shn').checked;$('sov').classList.remove('on')};
 $('x').onclick=close;
 new ResizeObserver(()=>{if(on)resize()}).observe($('stage'));
 document.addEventListener('fullscreenchange',()=>{if(on)setTimeout(()=>{fit();resize()},80)});
}
function open(list){
 build();
 let n=Array.isArray(list)&&list.length?list.map(String):siteNames(),demo=false;n=uniq(n);
 if(!n.length){n=DEF.slice();demo=true}
 names=n;called=called.filter(x=>names.includes(x));
 reset();host.style.display='block';host.classList.add('on');on=true;
 prevOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 document.addEventListener('keydown',onKey);
 if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit)}
 fit();resize();rebuild();
 say(demo?'Chưa có danh sách – đang dùng tên mẫu. Bấm ✏️ Sửa hoặc nhập tên ở ô danh sách.':'Lớp mẫu đã sẵn sàng. Chờ UFO thôi!');
 cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(frame);
 clearInterval(chatT);chatT=setInterval(chatTick,3500);
 setTimeout(resize,60);
}
function close(){
 if(!built||!on)return;
 on=false;reset();cancelAnimationFrame(raf);clearInterval(chatT);
 document.removeEventListener('keydown',onKey);
 if(window.visualViewport){visualViewport.removeEventListener('resize',fit);visualViewport.removeEventListener('scroll',fit)}document.documentElement.style.overflow=prevOverflow;
 try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
 host.style.display='none';host.classList.remove('on');
}
/* Chế độ "🛸 UFO" trong mục "Gọi tên học sinh": có khung nhập danh sách riêng giống Bắt gà */
function inject(){
 const wheelBox=document.getElementById('utWheel'),t2=document.getElementById('t2'),wb=document.getElementById('gtBtnWheel'),cb=document.getElementById('gtBtnChicken');
 if(!wheelBox||!t2||!wb||!cb||document.getElementById('utUfo'))return;
 const bar=wb.parentNode,btn=document.createElement('button');
 btn.type='button';btn.id='gtBtnUfo';btn.className='sm ghost';btn.textContent='🛸 UFO';bar.insertBefore(btn,cb.nextSibling);
 const pn=document.createElement('div');pn.id='utUfo';pn.style.display='none';
 pn.innerHTML='<h3 style="margin:4px 0 8px">🛸 UFO bắt trả bài</h3>'+
 '<textarea id="ufNames" style="min-height:170px" placeholder="Mỗi dòng một tên học sinh"></textarea>'+
 '<div class="bar"><label class="ghost sm" style="cursor:pointer;display:inline-block;padding:8px 12px;border-radius:10px">📂 Nhập Excel/CSV<input id="ufFile" type="file" accept=".xlsx,.xls,.csv,.txt" hidden></label>'+
 '<button class="ghost sm" id="ufWheel" type="button">⬇ Lấy từ Vòng quay</button>'+
 '<button class="ghost sm" id="ufChicken" type="button">⬇ Lấy từ Bắt gà</button>'+
 '<button class="ghost sm" id="ufTG" type="button">⬇ Từ Bảng điểm</button>'+
 '<button class="sec sm" id="ufClear" type="button">Xóa</button><span class="note" id="ufCount"></span></div>'+
 '<div id="ufInfo" class="status info"></div>'+
 '<div class="bar" style="justify-content:center"><button class="red" id="ufStart" type="button" style="font-size:18px;padding:13px 30px">🛸 BẮT ĐẦU UFO</button></div>';
 wheelBox.appendChild(pn);
 const q=id=>document.getElementById(id),ta=q('ufNames');
 const info=m=>q('ufInfo').textContent=m||'',cnt=()=>q('ufCount').textContent=lines(ta.value).length+' học sinh';
 const put=(n,msg,emptyMsg)=>{if(!n.length){info(emptyMsg||'Nguồn này chưa có tên học sinh nào.');return}ta.value=n.join('\n');cnt();info(msg||'')};
 ta.addEventListener('input',cnt);cnt();
 q('ufWheel').onclick=()=>put(srcWheel(),'','Vòng Quay Gọi Tên chưa có tên học sinh nào.');
 q('ufChicken').onclick=()=>put(srcChicken(),'','Bắt gà chưa có tên học sinh nào.');
 q('ufTG').onclick=()=>put(srcScore(),'','Bảng điểm (tab Công cụ Word) chưa có tên học sinh nào.');
 q('ufClear').onclick=()=>{ta.value='';cnt();info('')};
 q('ufFile').onchange=e=>{const f=e.target.files[0];if(!f)return;
  readNamesFile(f,l=>l.length?put(l,'Đã nhập '+l.length+' tên từ file.'):info('Không tìm thấy tên học sinh trong file.'),()=>info('Không đọc được file. Hãy thử dán tên trực tiếp vào ô nhập.'));
  e.target.value=''};
 q('ufStart').onclick=()=>{const n=lines(ta.value);if(!n.length){info('Hãy nhập hoặc lấy danh sách học sinh trước (nếu để trống sẽ dùng tên mẫu).')}open(n)};
 /* chuyển chế độ: UFO bật thì tắt Vòng quay & Bắt gà; bấm Vòng quay / Bắt gà thì tắt UFO */
 const bgRoot=()=>document.getElementById('utBatGa');
 btn.onclick=()=>{t2.style.display='none';const r=bgRoot();if(r)r.style.display='none';pn.style.display='';
  wb.className='sm ghost';cb.className='sm ghost';btn.className='sm'};
 const off=()=>{pn.style.display='none';btn.className='sm ghost'};
 wb.addEventListener('click',off);cb.addEventListener('click',off);
}
let injT=0;
const sched=()=>{clearTimeout(injT);injT=setTimeout(inject,150)};
function start(){inject();new MutationObserver(sched).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.UFOGame={open,close};
})();
