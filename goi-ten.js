/* Vòng quay gọi tên */
 // Bảng điểm (tab Công cụ Word) gán lại để Vòng Quay lấy danh sách

/* ======================= MÔ-ĐUN 2: VÒNG QUAY GỌI TÊN ======================= */
(function(){
  const cv=$('wheel'),ctx=cv.getContext('2d');
  const COL=['#4f5bf0','#a02ee0','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];
  let rot=0,spinning=false,called=[],hist=[];
  // Danh sách đã chuẩn hóa: bỏ dòng trống, tên trùng được thêm (2), (3)... để vẫn là các ô riêng
  function parse(){const seen={};return $('wNames').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(n=>{seen[n]=(seen[n]||0)+1;return seen[n]>1?n+' ('+seen[n]+')':n;});}
  function pool(){const all=parse();return $('wRemove').checked?all.filter(n=>!called.includes(n)):all;}
  function randInt(n){ // ngẫu nhiên đều, loại bỏ lệch modulo
    const lim=Math.floor(4294967296/n)*n,a=new Uint32Array(1);
    do{crypto.getRandomValues(a);}while(a[0]>=lim);
    return a[0]%n;
  }
  function info(msg){
    const all=parse().length,p=pool().length;
    $('wInfo').textContent=msg||(all?('Còn '+p+' / '+all+' học sinh trong vòng quay.'):'Hãy nhập danh sách học sinh.');
  }
  function draw(){
    const S=cv.clientWidth; if(!S) return;
    const dpr=window.devicePixelRatio||1; cv.width=cv.height=Math.round(S*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,S,S);
    const c=S/2,Rout=S/2-4,R=Rout-S*0.035;
    const p=pool(),n=p.length,demo=!n;
    // Chưa có tên: vẽ vòng quay mẫu 8 ô mờ để thấy ngay hình dạng vòng quay
    const items=demo?['?','?','?','?','?','?','?','?']:p,N=items.length;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=S*0.04;ctx.shadowOffsetY=S*0.012;
    ctx.beginPath();ctx.arc(c,c,Rout,0,7);ctx.fillStyle='#0b1220';ctx.fill();ctx.restore();
    ctx.save();ctx.translate(c,c);ctx.rotate(rot);
    const a=2*Math.PI/N;
    const fs=Math.max(9,Math.min(S*0.062,a*R*0.46));ctx.font='700 '+fs+'px Segoe UI,Arial';
    for(let i=0;i<N;i++){
      let col=COL[i%COL.length];if(N>1&&i===N-1&&i%COL.length===0)col='#7c3aed';
      const g=ctx.createRadialGradient(0,0,R*0.12,0,0,R);g.addColorStop(0,shade(col,.38));g.addColorStop(.55,col);g.addColorStop(1,shade(col,-.18));
      ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,i*a,(i+1)*a);ctx.closePath();
      ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1,S*0.003);ctx.stroke();
      let t=items[i];const maxW=R*0.66;
      if(ctx.measureText(t).width>maxW){while(t.length>1&&ctx.measureText(t+'…').width>maxW)t=t.slice(0,-1);t+='…';}
      ctx.save();ctx.rotate((i+0.5)*a);ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=3;ctx.shadowOffsetY=1;
      ctx.fillStyle='#fff';ctx.fillText(t,R-S*0.035,0);ctx.restore();
    }
    ctx.restore();
    if(demo){
      ctx.beginPath();ctx.arc(c,c,R,0,7);ctx.fillStyle='rgba(11,18,32,.62)';ctx.fill();
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='700 '+S*0.048+'px Segoe UI,Arial';ctx.fillText('Nhập tên học sinh',c,c-S*0.17);
      ctx.font='500 '+S*0.034+'px Segoe UI,Arial';ctx.fillStyle='#cbd5e1';ctx.fillText('mỗi dòng một em, vòng quay sẽ hiện ra',c,c-S*0.115);
    }
    ctx.beginPath();ctx.arc(c,c,Rout-S*0.0175,0,7);ctx.lineWidth=S*0.035;
    const rg=ctx.createLinearGradient(0,0,S,S);rg.addColorStop(0,'#fde68a');rg.addColorStop(.5,'#f59e0b');rg.addColorStop(1,'#b45309');
    ctx.strokeStyle=rg;ctx.stroke();
    const L=24;for(let i=0;i<L;i++){
      const ang=i/L*Math.PI*2+rot*0.25,x=c+Math.cos(ang)*(Rout-S*0.0175),y=c+Math.sin(ang)*(Rout-S*0.0175);
      ctx.beginPath();ctx.arc(x,y,S*0.0085,0,7);ctx.fillStyle=(i%2?'#fff7d6':'#fffbeb');ctx.shadowColor='#fff';ctx.shadowBlur=S*0.012;ctx.fill();ctx.shadowBlur=0;
    }
    const hr=S*0.075,hg=ctx.createRadialGradient(c-hr*.3,c-hr*.3,hr*.1,c,c,hr);hg.addColorStop(0,'#475569');hg.addColorStop(1,'#0b1220');
    ctx.beginPath();ctx.arc(c,c,hr,0,7);ctx.fillStyle=hg;ctx.fill();ctx.lineWidth=S*0.01;ctx.strokeStyle='#fbbf24';ctx.stroke();
    ctx.fillStyle='#fde68a';ctx.font='800 '+S*0.03+'px Segoe UI,Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('QUAY',c,c+1);
  }
  function shade(hex,k){
    const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;
    const f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k));
    return 'rgb('+f(r)+','+f(g)+','+f(b)+')';
  }
  /* ---- Âm thanh: nhạc khi quay + tiếng lạch cạch qua từng ô + vỗ tay khi hiện tên (Web Audio, tự tổng hợp, chạy offline) ---- */
  const Snd=(function(){
    let ctx=null,master=null,app=null,noiseBuf=null,on=true;
    try{on=localStorage.getItem('wsnd')!=='0';}catch(e){}
    const SC=[261.63,293.66,329.63,392,440,523.25,587.33,659.25,783.99];   // ngũ cung Đô trưởng
    function init(){
      if(!ctx){
        const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
        try{ctx=new AC();}catch(e){return null;}
        master=ctx.createGain(); master.gain.value=on?0.55:0;
        const comp=ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
        const len=ctx.sampleRate*2; noiseBuf=ctx.createBuffer(1,len,ctx.sampleRate);
        const d=noiseBuf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      }
      if(ctx.state==='suspended') ctx.resume();
      return ctx;
    }
    function note(f,t,d,type,v,dest){
      const o=ctx.createOscillator(),g=ctx.createGain(); o.type=type; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
      o.connect(g); g.connect(dest||master); o.start(t); o.stop(t+d+0.05);
    }
    // Nhạc vui, nhịp chậm dần cùng lúc vòng quay giảm tốc, kết bằng một chùm nốt đi lên
    function start(dur){
      if(!on||!init()) return;
      const t0=ctx.currentTime+0.04; let el=0,step=0,i=4;
      while(el<dur-0.35){
        const iv=0.11+0.24*Math.pow(el/dur,2);
        i=Math.max(0,Math.min(SC.length-1,i+[-2,-1,-1,1,1,2][(Math.random()*6)|0]));
        note(SC[i],t0+el,iv*1.7,'triangle',0.26);
        if(step%4===0) note(step%8===0?130.81:196,t0+el,iv*3,'sine',0.34);
        if(step%2===1) note(SC[i]*2,t0+el,iv*0.7,'square',0.04);
        el+=iv; step++;
      }
      [523.25,659.25,783.99,1046.5].forEach((f,k)=>note(f,t0+dur-0.3+k*0.07,0.5,'triangle',0.24));
    }
    function tick(){
      if(!on||!ctx) return;
      const t=ctx.currentTime; note(880+Math.random()*120,t,0.045,'square',0.07);
    }
    // Vỗ tay: nhiều tiếng "bốp" ngắn (nhiễu lọc dải) phân bố ngẫu nhiên, đông dần rồi thưa dần
    function applause(){
      if(!on||!init()) return;
      const t0=ctx.currentTime+0.02, T=3.6, N=120;
      app=ctx.createGain(); app.gain.value=1; app.connect(master);
      [784,1046.5,1318.5].forEach((f,k)=>note(f,t0+k*0.09,0.8,'triangle',0.2));
      for(let k=0;k<N;k++){
        const x=(Math.random()+Math.random())/2, at=t0+0.05+T*x;
        const amp=Math.min(1,x/0.25)*Math.pow(1-x,0.7)*(0.5+Math.random()*0.5);
        const src=ctx.createBufferSource(); src.buffer=noiseBuf;
        const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1200+Math.random()*2800; bp.Q.value=0.7+Math.random()*1.3;
        const g=ctx.createGain();
        g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(amp*1.1,at+0.003); g.gain.exponentialRampToValueAtTime(0.001,at+0.035+Math.random()*0.05);
        src.connect(bp); bp.connect(g); g.connect(app); src.start(at,Math.random()*1.5,0.14);
      }
      const bed=ctx.createBufferSource(); bed.buffer=noiseBuf; bed.loop=true;
      const bf=ctx.createBiquadFilter(); bf.type='bandpass'; bf.frequency.value=1000; bf.Q.value=0.6;
      const bg=ctx.createGain(); bg.gain.setValueAtTime(0.0001,t0); bg.gain.linearRampToValueAtTime(0.09,t0+0.6); bg.gain.linearRampToValueAtTime(0.0001,t0+T+0.3);
      bed.connect(bf); bf.connect(bg); bg.connect(app); bed.start(t0); bed.stop(t0+T+0.4);
    }
    function hush(){ if(ctx&&app){ app.gain.cancelScheduledValues(ctx.currentTime); app.gain.setTargetAtTime(0,ctx.currentTime,0.08); app=null; } }
    function whistle(){
      if(!on||!ctx) return;
      const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(500,t); o.frequency.exponentialRampToValueAtTime(1500,t+0.35);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.045,t+0.05); g.gain.exponentialRampToValueAtTime(0.0001,t+0.38);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+0.42);
    }
    function boom(){
      if(!on||!ctx) return;
      const t=ctx.currentTime, src=ctx.createBufferSource(); src.buffer=noiseBuf;
      const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(900,t); lp.frequency.exponentialRampToValueAtTime(120,t+0.4);
      const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.5,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
      src.connect(lp); lp.connect(g); g.connect(master); src.start(t,Math.random()*1.4,0.5);
      const o=ctx.createOscillator(),og=ctx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(40,t+0.3);
      og.gain.setValueAtTime(0.0001,t); og.gain.exponentialRampToValueAtTime(0.35,t+0.01); og.gain.exponentialRampToValueAtTime(0.0001,t+0.35);
      o.connect(og); og.connect(master); o.start(t); o.stop(t+0.4);
    }
    function isOn(){return on;}
    function setOn(v){
      on=v; try{localStorage.setItem('wsnd',v?'1':'0');}catch(e){}
      if(v) init();
      if(ctx) master.gain.setTargetAtTime(v?0.55:0,ctx.currentTime,0.03);
    }
    return {start,tick,applause,hush,whistle,boom,isOn,setOn};
  })();
  function sndLabel(){const b=$('wSnd'),o=Snd.isOn();b.textContent=o?'🔊 Âm thanh: Bật':'🔇 Âm thanh: Tắt';b.setAttribute('aria-pressed',o);}
  $('wSnd').addEventListener('click',()=>{Snd.setOn(!Snd.isOn());sndLabel();});
  sndLabel();
  /* ---- Pháo hoa: canvas nằm sau bảng tên; tên rực rỡ + có cả pháo hình trái tim. Tắt khi đóng bảng hoặc giảm chuyển động. ---- */
  const FX=(function(){
    const cv=document.createElement('canvas'); cv.id='wFx'; cv.setAttribute('aria-hidden','true');
    const ov=$('wOv'); ov.insertBefore(cv,ov.firstChild);
    const c=cv.getContext('2d');
    let W=0,H=0,dpr=1,parts=[],rockets=[],raf=0,t0=0,nextL=0,active=false,K=1;
    function fit(){
      dpr=Math.min(2,window.devicePixelRatio||1); W=cv.clientWidth||window.innerWidth; H=cv.clientHeight||window.innerHeight;
      cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); c.setTransform(dpr,0,0,dpr,0,0);
      K=Math.max(.55,Math.min(1.3,Math.min(W,H)/620));
    }
    function launch(){
      const x=W*(.12+Math.random()*.76), ty=H*(.14+Math.random()*.34);
      rockets.push({x:x+(Math.random()-.5)*60,y:H+6,tx:x,ty:ty,sp:(9+Math.random()*3)*K+H/160,hue:(Math.random()*360)|0});
      Snd.whistle();
    }
    function burst(x,y,hue){
      Snd.boom();
      if(parts.length>650) return;
      const small=W<520, n=small?46:72, type=Math.random(), heart=type<.24, ring=!heart&&type<.5, two=Math.random()<.4;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2; let vx,vy;
        if(heart){ const tt=a; vx=16*Math.pow(Math.sin(tt),3); vy=-(13*Math.cos(tt)-5*Math.cos(2*tt)-2*Math.cos(3*tt)-Math.cos(4*tt)); const k=.27*K; vx*=k; vy*=k; }
        else { const sp=(ring?4.2:1.5+Math.random()*4.4)*K, aa=a+Math.random()*.2; vx=Math.cos(aa)*sp; vy=Math.sin(aa)*sp; }
        const h=heart?345+Math.random()*20:(two&&i%2?(hue+150)%360:hue)+Math.random()*24;
        parts.push({x:x,y:y,vx:vx,vy:vy,life:1,dec:.009+Math.random()*.012,h:h,r:(1.4+Math.random()*1.4)*K,tw:Math.random()<.3});
      }
    }
    function frame(now){
      if(!active) return;
      const el=now-t0;
      c.globalCompositeOperation='destination-out'; c.fillStyle='rgba(0,0,0,.2)'; c.fillRect(0,0,W,H);
      c.globalCompositeOperation='lighter';
      if(el<4800&&now>=nextL){ launch(); nextL=now+ (el<900?260:380+Math.random()*420); }
      for(let i=rockets.length-1;i>=0;i--){
        const r=rockets[i], dx=r.tx-r.x, dy=r.ty-r.y, d=Math.hypot(dx,dy);
        if(d<r.sp){ burst(r.tx,r.ty,r.hue); rockets.splice(i,1); continue; }
        r.x+=dx/d*r.sp; r.y+=dy/d*r.sp;
        c.fillStyle='hsla('+r.hue+',100%,75%,.95)'; c.beginPath(); c.arc(r.x,r.y,2*K,0,7); c.fill();
        parts.push({x:r.x,y:r.y,vx:(Math.random()-.5)*.5,vy:.6+Math.random()*.6,life:.55,dec:.05,h:r.hue,r:1.1*K,tw:false});
      }
      for(let i=parts.length-1;i>=0;i--){
        const q=parts[i]; q.vx*=.985; q.vy=q.vy*.985+.045*K; q.x+=q.vx; q.y+=q.vy; q.life-=q.dec;
        if(q.life<=0){ parts.splice(i,1); continue; }
        const a=q.tw&&Math.random()<.4?.2:Math.min(1,q.life*1.4);
        c.fillStyle='hsla('+q.h+',100%,'+(55+q.life*20)+'%,'+a+')'; c.beginPath(); c.arc(q.x,q.y,q.r*(.5+q.life*.6),0,7); c.fill();
      }
      if(el>=4800&&!rockets.length&&!parts.length){ stop(); return; }
      raf=requestAnimationFrame(frame);
    }
    function start(){
      stop(); fit(); active=true; t0=performance.now(); nextL=t0+60; raf=requestAnimationFrame(frame);
    }
    function stop(){ active=false; if(raf) cancelAnimationFrame(raf); raf=0; parts=[]; rockets=[]; if(W) c.clearRect(0,0,W,H); }
    window.addEventListener('resize',()=>{ if(active) fit(); });
    return {start,stop};
  })();
  function spin(){
    if(spinning) return;
    const p=pool(),n=p.length;
    if(!n){info(parse().length?'Đã gọi hết học sinh — bấm "Đặt lại" để quay lại từ đầu.':'Danh sách rỗng, hãy nhập tên học sinh.');return;}
    const k=randInt(n),a=2*Math.PI/n,jit=(Math.random()-0.5)*0.7; // lệch nhẹ trong ô, không sát vạch
    // Mũi tên ở đỉnh (góc -π/2): ô k nằm dưới mũi tên khi rot = -π/2 - (k+0.5+jit)*a
    const target=-Math.PI/2-(k+0.5+jit)*a,TAU=2*Math.PI;
    const delta=(((target-rot)%TAU)+TAU)%TAU+TAU*(5+Math.floor(Math.random()*3));
    const r0=rot,dur=4600,t0=performance.now();spinning=true;$('wSpin').disabled=true;
    Snd.start(dur/1000);let lastIdx=-1,lastTick=0;
    (function step(now){
      const t=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-t,3.2); // giảm tốc mượt
      rot=r0+delta*e;draw();
      {const ix=Math.floor((((-Math.PI/2-rot)%TAU)+TAU)%TAU/a);if(ix!==lastIdx){if(lastIdx>=0&&now-lastTick>32){Snd.tick();lastTick=now;}lastIdx=ix;}}   // lạch cạch mỗi khi qua một ô
      if(t<1) return requestAnimationFrame(step);
      spinning=false;$('wSpin').disabled=false;
      const name=p[k];hist.push(name);called.push(name);
      $('wWin').textContent=name;$('wOv').classList.add('on');try{FX.start();}catch(e){console.error('Pháo hoa:',e);}try{Snd.applause();}catch(e){console.error('Âm thanh:',e);}
      renderHist();info();
    })(t0);
  }
  function renderHist(){$('hist').innerHTML=hist.map(esc).map(h=>'<li>'+h+'</li>').join('');$('hist').scrollTop=1e6;}
  function reset(){if(spinning)return;called=[];hist=[];rot=0;renderHist();draw();info();}
  $('wSpin').addEventListener('click',spin);
  $('wReset').addEventListener('click',reset);
  const closeOv=()=>{$('wOv').classList.remove('on');Snd.hush();FX.stop();};
  $('wClose').addEventListener('click',closeOv);
  $('wOv').addEventListener('click',e=>{if(e.target===$('wOv'))closeOv();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOv();});
  $('wNames').addEventListener('input',()=>{if(!spinning){draw();info();}});
  $('wRemove').addEventListener('change',()=>{draw();info();});
  $('wImport').addEventListener('click',()=>{
    const ns=window.TG.names();
    if(!ns.length){info('Bảng điểm (tab Công cụ Word) chưa có tên học sinh nào.');return;}
    $('wNames').value=ns.join('\n');reset();
  });
  window.addEventListener('resize',draw);
  window.addEventListener('tabshow',e=>{if(e.detail==='t2'||e.detail==='t8'){draw();info();}});
  // Sửa lỗi: vòng quay nằm trong khối ẩn nên lúc tải trang rộng = 0 → không vẽ. Vẽ lại ngay khi canvas có kích thước.
  if(window.ResizeObserver){new ResizeObserver(()=>{if(!spinning)draw();}).observe(cv);}
  setTimeout(draw,0);
  cv.style.cursor='pointer';cv.addEventListener('click',()=>{if(pool().length)spin();});
  window._wheelTest={parse,pool,draw,spin,rot:()=>rot}; info();
})();

/* ======================= ĐỒNG HỒ ĐẾM GIỜ + CHIA NHÓM (thay thế bản cũ trong toan-hoc.js) =======================
   Chạy sau khi trang tải xong (sự kiện load) để dựng lại khối #utTimer; mã cũ trong toan-hoc.js vẫn tải bình thường
   nhưng bị vô hiệu vì các nút cũ đã được thay bằng nút mới. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  function randInt(n){const lim=Math.floor(4294967296/n)*n,a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=lim);return a[0]%n;}
  function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=randInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
  function copyText(t){try{navigator.clipboard.writeText(t);}catch(e){const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();document.execCommand('copy');x.remove();}}

  const CSS=`
  .tx-card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:clamp(12px,2vw,20px);margin-bottom:16px}
  .tx-card h3{margin:0 0 10px;font-size:18px}
  .tx-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
  .tx-row label{display:flex;gap:6px;align-items:center;font-size:14px}
  .tx-row input[type=number]{width:84px}
  .tx-row select{max-width:100%}
  .tx-note{font-size:13px;color:var(--mut)}
  .tx-big{font-size:18px!important;padding:12px 24px!important}
  .tx-clock{display:flex;flex-direction:column;align-items:center}
  .tx-face{width:min(100%,520px,78vh);user-select:none}
  .tx-face svg{width:100%;height:auto;display:block;filter:drop-shadow(0 10px 24px rgba(0,0,0,.5))}
  .tx-ctl{width:100%;display:flex;flex-direction:column;align-items:center}
  .tx-ctl .tx-row{justify-content:center}
  .tx-stop{display:none;background:linear-gradient(135deg,#ef4444,#b91c1c)!important;font-size:18px!important;animation:txPulse .8s infinite}
  .tx-stop.on{display:inline-block}
  @keyframes txPulse{50%{transform:scale(1.06)}}
  @keyframes txShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-4deg)}40%{transform:rotate(4deg)}60%{transform:rotate(-3deg)}80%{transform:rotate(3deg)}}
  .tx-done svg{animation:txShake .5s 6}
  .tx-clock:fullscreen,.tx-clock.tx-fs{background:#0b1220;justify-content:center;border-radius:0;margin:0}
  .tx-clock.tx-fs{position:fixed;inset:0;z-index:60;overflow:auto}
  .tx-clock:fullscreen .tx-face,.tx-clock.tx-fs .tx-face{width:min(94vw,80vh)}
  .tx-clock:-webkit-full-screen{background:#0b1220;justify-content:center}
  .tx-res{margin-top:12px}
  .tx-res:fullscreen{background:#0b1220;padding:24px;overflow:auto}
  .tx-gg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
  .tx-g{border-radius:14px;overflow:hidden;background:var(--card2);border:2px solid var(--c);box-shadow:0 4px 14px rgba(0,0,0,.35);animation:txPop .35s both}
  @keyframes txPop{from{opacity:0;transform:translateY(10px) scale(.94)}to{opacity:1;transform:none}}
  .tx-gh{background:var(--c);color:#fff;padding:8px 12px;display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:16px;text-shadow:0 1px 2px rgba(0,0,0,.4)}
  .tx-gh span{font-size:12px;opacity:.9;white-space:nowrap}
  .tx-g ul{list-style:none;margin:0;padding:6px}
  .tx-m{padding:7px 10px;border-radius:8px;cursor:pointer;font-size:15px;display:flex;justify-content:space-between;gap:8px}
  .tx-m:hover{background:rgba(255,255,255,.08)}
  .tx-m.ld{font-weight:700;color:#fde68a}
  .tx-m.sel{outline:2px dashed #fbbf24;background:rgba(251,191,36,.15)}
  .tx-m small{color:var(--mut)}
  .tx-res:fullscreen .tx-gg{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
  .tx-res:fullscreen .tx-m{font-size:clamp(18px,2.2vw,32px)}
  .tx-res:fullscreen .tx-gh{font-size:clamp(20px,2.4vw,34px)}
  .tx-pick{text-align:center;padding:18px}
  .tx-pick .n{font-size:clamp(34px,8vw,84px);font-weight:800;color:var(--cy);line-height:1.15;word-break:break-word}
  @media (prefers-reduced-motion:reduce){.tx-done svg,.tx-stop,.tx-g{animation:none}}
  `;

  /* ---------- Âm thanh (Web Audio, tự tổng hợp, chạy offline) ---------- */
  const Snd=(function(){
    let ctx=null,out=null,ring=null,on=true;
    try{on=localStorage.getItem('txsnd')!=='0';}catch(e){}
    function init(){
      if(!ctx){
        const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
        try{ctx=new AC();}catch(e){return null;}
        out=ctx.createGain(); out.gain.value=.9;
        const comp=ctx.createDynamicsCompressor(); out.connect(comp); comp.connect(ctx.destination);
      }
      if(ctx.state==='suspended') ctx.resume();
      return ctx;
    }
    // Một tiếng chuông: cộng các hài âm không điều hòa, mỗi hài tắt dần với tốc độ riêng
    const PART=[[1,1,1],[2.01,.55,.7],[2.76,.4,.5],[4.07,.22,.32],[5.4,.12,.2]];
    function bell(f,t,v,dur,dest){
      PART.forEach(p=>{
        const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.value=f*p[0];
        g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v*p[1],t+.006);
        g.gain.exponentialRampToValueAtTime(0.0001,t+dur*p[2]);
        o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur*p[2]+.05);
      });
    }
    // Chuông hết giờ: gong trầm + ba nốt chuông đi lên + hợp âm kết, lặp 2 lần (khoảng 7 giây). Bấm "Tắt chuông" để dừng sớm.
    function finish(){
      if(!on||!init()) return 0;
      stop(); ring=ctx.createGain(); ring.gain.value=1; ring.connect(out);
      const t0=ctx.currentTime+.05,GAP=3.4;
      for(let r=0;r<2;r++){
        const t=t0+r*GAP;
        bell(196,t,.5,3,ring);                              // gong trầm
        [659.25,783.99,1046.5].forEach((f,k)=>bell(f,t+.12+k*.22,.32,1.6,ring));
        [1046.5,1318.5,1568].forEach(f=>bell(f,t+.95,.26,2.4,ring));  // hợp âm kết
      }
      return 2*GAP;
    }
    function stop(){ if(ctx&&ring){ring.gain.cancelScheduledValues(ctx.currentTime);ring.gain.setTargetAtTime(0,ctx.currentTime,.06);ring=null;} }
    function tick(hi){
      if(!on||!ctx) return;
      const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.value=hi?1760:1200;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(hi?.2:.1,t+.004); g.gain.exponentialRampToValueAtTime(0.0001,t+.07);
      o.connect(g); g.connect(out); o.start(t); o.stop(t+.09);
    }
    function demo(){ if(!init()) return; const keep=on; on=true; finish(); on=keep; if(!on&&ring){} }
    function isOn(){return on;}
    function setOn(v){on=v;try{localStorage.setItem('txsnd',v?'1':'0');}catch(e){} if(v) init(); else stop();}
    return {init,finish,stop,tick,demo,isOn,setOn};
  })();

  function build(host){
    if(!document.getElementById('txStyle')){const st=document.createElement('style');st.id='txStyle';st.textContent=CSS;document.head.appendChild(st);}
    host.innerHTML=`
<section class="tx-card tx-clock" id="txClock">
  <h3 style="align-self:flex-start">⏱ Đồng hồ đếm giờ</h3>
  <div class="tx-face" id="txFace">
    <svg id="txSvg" viewBox="0 0 400 440" role="img" aria-label="Đồng hồ đếm giờ">
      <defs>
        <linearGradient id="txBez" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#f59e0b"/><stop offset="1" stop-color="#92400e"/></linearGradient>
        <radialGradient id="txFc" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#22305a"/><stop offset="1" stop-color="#0b1220"/></radialGradient>
      </defs>
      <rect x="170" y="4" width="60" height="30" rx="9" fill="url(#txBez)"/>
      <rect x="187" y="28" width="26" height="30" fill="#b45309"/>
      <g transform="rotate(42 200 240)"><rect x="188" y="40" width="24" height="24" rx="5" fill="url(#txBez)"/></g>
      <circle cx="200" cy="240" r="190" fill="url(#txBez)"/>
      <circle cx="200" cy="240" r="176" fill="url(#txFc)"/>
      <circle cx="200" cy="240" r="150" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="16"/>
      <circle id="txArc" cx="200" cy="240" r="150" fill="none" stroke="#10b981" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="0" transform="rotate(-90 200 240)"/>
      <circle id="txDot" cx="200" cy="90" r="11" fill="#fff" stroke="#10b981" stroke-width="4"/>
      <g id="txTicks"></g>
      <text id="txTxt" x="200" y="270" text-anchor="middle" font-size="84" font-weight="800" fill="#fff" style="font-family:'Segoe UI',Arial,sans-serif;font-variant-numeric:tabular-nums">05:00</text>
      <text id="txLbl" x="200" y="316" text-anchor="middle" font-size="24" font-weight="600" fill="#93a0ba" style="font-family:'Segoe UI',Arial,sans-serif">còn lại</text>
    </svg>
  </div>
  <div class="tx-ctl">
    <div class="tx-row" id="txPre">${[1,3,5,10,15,45].map(m=>`<button class="sec sm" type="button" data-m="${m}">${m} phút</button>`).join('')}</div>
    <div class="tx-row"><label>Phút <input type="number" id="txMin" value="5" min="0" max="180"></label><label>Giây <input type="number" id="txSec" value="0" min="0" max="59"></label></div>
    <div class="tx-row"><button class="tx-big" id="txGo" type="button">▶ Bắt đầu</button><button class="sec" id="txAdd" type="button">+1 phút</button><button class="sec" id="txReset" type="button">↺ Đặt lại</button></div>
    <div class="tx-row"><button class="ghost sm" id="txFs" type="button">⛶ Toàn màn hình</button><button class="ghost sm" id="txSnd" type="button"></button><button class="ghost sm" id="txTest" type="button">🔔 Nghe thử chuông</button></div>
    <button class="tx-stop" id="txStop" type="button">🔕 Tắt chuông</button>
  </div>
</section>

<section class="tx-card" id="txGroup">
  <h3>👥 Chia nhóm</h3>
  <textarea id="kNames" style="min-height:130px" placeholder="Mỗi dòng một tên học sinh"></textarea>
  <div class="tx-row"><span class="tx-note" id="kCnt">0 học sinh</span><button class="ghost sm" id="kPull" type="button">⬇ Lấy từ Bảng điểm</button><button class="ghost sm" id="kFromW" type="button">⬇ Lấy từ Vòng quay</button></div>
  <div class="tx-row">
    <select id="kMode"><option value="count">Chia theo số nhóm</option><option value="size">Chia theo số em mỗi nhóm</option></select>
    <input type="number" id="kVal" value="4" min="1" max="40" aria-label="Giá trị">
    <span class="tx-note" id="kUnit">nhóm</span>
    <select id="kStyle" aria-label="Kiểu tên nhóm"><option value="nhom">Tên: Nhóm 1, 2, 3…</option><option value="to">Tên: Tổ 1, 2, 3…</option><option value="ani">Tên: con vật 🐯🦁🐼</option><option value="col">Tên: màu sắc 🎨</option></select>
  </div>
  <div class="tx-row"><label><input type="checkbox" id="kLead" checked> ⭐ Chọn nhóm trưởng ngẫu nhiên</label><label><input type="checkbox" id="kMix"> Ghép theo năng lực (mỗi dòng: Tên, điểm)</label></div>
  <div class="tx-row"><button class="tx-big" id="kSplit" type="button">🎲 Chia nhóm</button><button class="sec" id="kCopy" type="button">📋 Sao chép</button><button class="ghost" id="kResFs" type="button">⛶ Chiếu lớn</button><button class="orange" id="kPick" type="button">🎯 Gọi 1 tên</button></div>
  <div class="tx-res" id="kRes" aria-live="polite"></div>
  <div class="tx-note">Sau khi chia, bấm vào hai tên bất kỳ để đổi chỗ cho nhau. Ghép theo năng lực: mỗi nhóm có đủ em điểm cao và điểm thấp.</div>
</section>`;
    initClock(); initGroups();
  }

  /* ========================= ĐỒNG HỒ ========================= */
  function initClock(){
    const NS='http://www.w3.org/2000/svg',card=$('txClock'),svg=$('txSvg'),arc=$('txArc'),dot=$('txDot'),txt=$('txTxt'),lbl=$('txLbl'),ticks=$('txTicks');
    const tk=[];
    for(let i=0;i<60;i++){
      const a=i*6*Math.PI/180,major=i%5===0,r1=major?116:122,r2=134,l=document.createElementNS(NS,'line');
      l.setAttribute('x1',200+Math.sin(a)*r1);l.setAttribute('y1',240-Math.cos(a)*r1);l.setAttribute('x2',200+Math.sin(a)*r2);l.setAttribute('y2',240-Math.cos(a)*r2);
      l.setAttribute('stroke','#475577');l.setAttribute('stroke-width',major?4:2);l.setAttribute('stroke-linecap','round');ticks.appendChild(l);tk.push(l);
    }
    let tot=300000,left=300000,end=0,tid=null,done=false,lastSec=-1,hl=-1,hideT=0;
    const minI=$('txMin'),secI=$('txSec');
    function readInput(){
      let m=Math.max(0,Math.min(180,parseInt(minI.value)||0)),s=Math.max(0,Math.min(59,parseInt(secI.value)||0));
      if(m===0&&s===0) m=1; return (m*60+s)*1000;
    }
    function color(ms){const s=Math.ceil(ms/1000);return s<=10?'#ef4444':(tot&&ms/tot<=.25?'#f59e0b':'#10b981');}
    function render(ms){
      const s=Math.ceil(ms/1000),mm=Math.floor(s/60),ss=s%60,frac=tot?Math.max(0,Math.min(1,ms/tot)):0,col=ms<=0?'#ef4444':color(ms);
      txt.textContent=pad(mm)+':'+pad(ss); txt.setAttribute('font-size',mm>=100?66:84);
      txt.setAttribute('fill',(ms<=0||s<=10)?'#fca5a5':'#fff');
      arc.setAttribute('stroke',col); arc.setAttribute('stroke-dashoffset',100*(1-frac)); arc.setAttribute('stroke-opacity',ms<=0?0:1);
      const ang=frac*2*Math.PI; dot.setAttribute('cx',200+Math.sin(ang)*150);dot.setAttribute('cy',240-Math.cos(ang)*150);dot.setAttribute('stroke',col);dot.setAttribute('opacity',ms<=0?0:1);
      const cur=ms<=0?-1:(60-(s%60))%60; // tick sáng = giây hiện tại
      if(cur!==hl){if(hl>=0){tk[hl].setAttribute('stroke','#475577');}if(cur>=0){tk[cur].setAttribute('stroke','#fbbf24');}hl=cur;}
      lbl.textContent=ms<=0?'HẾT GIỜ!':(tid?'đang đếm…':(ms<tot?'tạm dừng':'sẵn sàng'));
      lbl.setAttribute('fill',ms<=0?'#fca5a5':'#93a0ba'); lbl.setAttribute('font-size',ms<=0?34:24);
    }
    function setBtn(){ $('txGo').textContent=tid?'⏸ Tạm dừng':(done?'▶ Bắt đầu lại':(left<tot?'▶ Tiếp tục':'▶ Bắt đầu')); }
    function silence(){Snd.stop();$('txStop').classList.remove('on');clearTimeout(hideT);}
    function setT(ms){
      clearInterval(tid);tid=null;silence();done=false;card.classList.remove('tx-done');
      tot=left=ms;lastSec=-1;
      const s=Math.round(ms/1000);minI.value=Math.floor(s/60);secI.value=s%60;
      render(left);setBtn();
    }
    function finish(){
      clearInterval(tid);tid=null;left=0;done=true;render(0);setBtn();card.classList.add('tx-done');
      const dur=Snd.finish();
      if(dur){$('txStop').classList.add('on');hideT=setTimeout(()=>$('txStop').classList.remove('on'),dur*1000+800);}
      try{navigator.vibrate&&navigator.vibrate([400,150,400,150,400]);}catch(e){}
    }
    function tick(){
      left=end-Date.now(); if(left<=0){finish();return;}
      render(left); const s=Math.ceil(left/1000);
      if(s!==lastSec){lastSec=s;if(s<=10)Snd.tick(s<=3);}
    }
    function go(){
      if(tid){clearInterval(tid);tid=null;left=Math.max(0,end-Date.now());render(left);setBtn();return;}
      Snd.init(); silence();
      if(done||left<=0) setT(readInput());
      end=Date.now()+left; tid=setInterval(tick,100); tick(); setBtn();
    }
    $('txGo').onclick=go;
    $('txReset').onclick=()=>setT(readInput());
    $('txAdd').onclick=()=>{
      if(done){setT(60000);return;}
      tot+=60000;left+=60000;if(tid)end+=60000; if(!tid){const s=Math.round(tot/1000);minI.value=Math.floor(s/60);secI.value=s%60;} render(left);setBtn();
    };
    minI.onchange=secI.onchange=()=>{if(!tid) setT(readInput());};
    $('txPre').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;minI.value=b.dataset.m;secI.value=0;setT(readInput());});
    $('txStop').onclick=silence;
    function sndLabel(){const o=Snd.isOn(),b=$('txSnd');b.textContent=o?'🔊 Âm thanh: Bật':'🔇 Âm thanh: Tắt';b.setAttribute('aria-pressed',o);}
    $('txSnd').onclick=()=>{Snd.setOn(!Snd.isOn());sndLabel();}; sndLabel();
    $('txTest').onclick=()=>{Snd.demo();$('txStop').classList.add('on');clearTimeout(hideT);hideT=setTimeout(()=>$('txStop').classList.remove('on'),7500);};
    // Toàn màn hình (dự phòng bằng lớp CSS khi trình duyệt như Safari iPhone không hỗ trợ)
    const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
    function fsToggle(){
      if(card.classList.contains('tx-fs')){card.classList.remove('tx-fs');return;}
      if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return;}
      const rq=card.requestFullscreen||card.webkitRequestFullscreen;
      if(rq){try{const p=rq.call(card);if(p&&p.catch)p.catch(()=>card.classList.add('tx-fs'));}catch(e){card.classList.add('tx-fs');}}
      else card.classList.add('tx-fs');
    }
    $('txFs').onclick=fsToggle;
    card.addEventListener('keydown',e=>{
      if(e.code==='Space'&&!/^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(e.target.tagName)){e.preventDefault();go();}
    });
    card.tabIndex=-1;
    document.addEventListener('keydown',e=>{if(e.key==='Escape')card.classList.remove('tx-fs');});
    setT(readInput());
    window._clockTest={setT,go,finish,left:()=>left};
  }

  /* ========================= CHIA NHÓM ========================= */
  function initGroups(){
    const PAL=['#4f5bf0','#a02ee0','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];
    const ANI=['🐯 Hổ','🦁 Sư tử','🐼 Gấu trúc','🦊 Cáo','🐬 Cá heo','🦅 Đại bàng','🐘 Voi','🐧 Cánh cụt','🦒 Hươu cao cổ','🐙 Bạch tuộc','🐢 Rùa','🦉 Cú mèo','🐨 Koala','🐰 Thỏ','🦋 Bướm','🐝 Ong'];
    const COL=[['🟥 Đỏ','#dc2626'],['🟧 Cam','#ea580c'],['🟨 Vàng','#ca8a04'],['🟩 Xanh lá','#16a34a'],['🟦 Xanh dương','#2563eb'],['🟪 Tím','#9333ea'],['🩷 Hồng','#db2777'],['🟫 Nâu','#92400e'],['⬛ Đen','#475569'],['🩵 Xanh ngọc','#0d9488']];
    const gname=(st,i)=>{
      if(st==='to') return 'Tổ '+(i+1);
      if(st==='ani'){const a=ANI[i%ANI.length];return i<ANI.length?a:a+' '+(Math.floor(i/ANI.length)+1);}
      if(st==='col'){const c=COL[i%COL.length][0];return i<COL.length?c:c+' '+(Math.floor(i/COL.length)+1);}
      return 'Nhóm '+(i+1);
    };
    const gcol=(st,i)=>st==='col'?COL[i%COL.length][1]:PAL[i%PAL.length];
    let groups=[],style='nhom',mix=false,sel=null,pool=[],sig='';
    const res=$('kRes');
    const names=()=>$('kNames').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    function count(){const n=names().length;$('kCnt').textContent=n+' học sinh';}
    function note(t){res.innerHTML='<div class="tx-note" style="font-size:14px">'+esc(t)+'</div>';}
    function unit(){$('kUnit').textContent=$('kMode').value==='size'?'em / nhóm':'nhóm';}
    function parse(){
      return names().map(s=>{
        if(!mix) return {n:s,s:0};
        const m=s.match(/^(.*?)[,;\t]\s*(\d+(?:[.,]\d+)?)\s*$/);
        return m?{n:m[1].trim(),s:parseFloat(m[2].replace(',','.'))}:{n:s,s:0};
      });
    }
    function textOut(){
      return groups.map((g,i)=>gname(style,i)+' ('+g.m.length+'): '+g.m.map((x,j)=>x.n+(mix?' ('+x.s+')':'')+(g.lead===j?' (nhóm trưởng)':'')).join(', ')).join('\n');
    }
    function render(){
      sel=null;
      res.innerHTML='<div class="tx-gg">'+groups.map((g,i)=>{
        const avg=mix&&g.m.length?(g.m.reduce((s,x)=>s+x.s,0)/g.m.length):null;
        return '<div class="tx-g" style="--c:'+gcol(style,i)+';animation-delay:'+(i*60)+'ms"><div class="tx-gh"><b>'+esc(gname(style,i))+'</b><span>'+g.m.length+' em'+(avg!==null?' · TB '+(Math.round(avg*100)/100):'')+'</span></div><ul>'
          +g.m.map((x,j)=>'<li class="tx-m'+(g.lead===j?' ld':'')+'" data-g="'+i+'" data-m="'+j+'" title="Bấm để đổi chỗ"><span>'+(g.lead===j?'⭐ ':'')+esc(x.n)+'</span>'+(mix?'<small>'+x.s+'</small>':'')+'</li>').join('')
          +'</ul></div>';
      }).join('')+'</div>';
    }
    function split(){
      mix=$('kMix').checked; style=$('kStyle').value;
      let a=parse(); if(!a.length){note('Chưa có danh sách — hãy nhập tên học sinh (mỗi dòng một em).');return;}
      const val=Math.max(1,parseInt($('kVal').value)||1);
      let k=$('kMode').value==='size'?Math.ceil(a.length/val):val; k=Math.max(1,Math.min(k,a.length,40));
      const g=Array.from({length:k},()=>({m:[],lead:-1}));
      a=shuffle(a);
      if(mix){ a.sort((x,y)=>y.s-x.s); a.forEach((x,i)=>{const r=Math.floor(i/k),p=i%k;g[r%2?k-1-p:p].m.push(x);}); }
      else a.forEach((x,i)=>g[i%k].m.push(x));
      if($('kLead').checked) g.forEach(o=>{o.lead=randInt(o.m.length);});
      groups=g; render();
    }
    res.addEventListener('click',e=>{
      const li=e.target.closest('.tx-m'); if(!li||!groups.length) return;
      const gi=+li.dataset.g,mi=+li.dataset.m;
      if(!sel){sel={g:gi,m:mi};li.classList.add('sel');return;}
      if(sel.g===gi&&sel.m===mi){sel=null;li.classList.remove('sel');return;}
      const A=groups[sel.g].m,B=groups[gi].m,t=A[sel.m];A[sel.m]=B[mi];B[mi]=t;
      render(); // vị trí ⭐ của mỗi nhóm giữ nguyên; người mới vào vị trí đó trở thành nhóm trưởng
    });
    function pick(){
      mix=$('kMix').checked; const n=parse().map(x=>x.n); if(!n.length){note('Chưa có danh sách — hãy nhập tên học sinh.');return;}
      const s=n.join('|'); if(s!==sig||!pool.length){sig=s;pool=shuffle(n);}
      const x=pool.pop(); groups=[];
      res.innerHTML='<div class="tx-pick"><div class="tx-note">Mời em</div><div class="n">🎯 '+esc(x)+'</div><div class="tx-note">Còn '+pool.length+' em chưa được gọi (không gọi lặp cho đến khi hết lượt)</div></div>';
    }
    $('kNames').addEventListener('input',count);
    $('kMode').addEventListener('change',unit);
    $('kSplit').onclick=split;
    $('kPick').onclick=pick;
    $('kCopy').onclick=()=>{ if(groups.length) copyText(textOut()); else if(res.innerText.trim()) copyText(res.innerText); };
    $('kPull').onclick=()=>{
      let ns=[]; try{ns=window.TG.names();}catch(e){}
      if(!ns.length){note('Bảng điểm (tab Công cụ Word) chưa có tên học sinh nào.');return;}
      $('kNames').value=ns.join('\n');count();
    };
    $('kFromW').onclick=()=>{
      const v=($('wNames')&&$('wNames').value||'').trim();
      if(!v){note('Vòng quay chưa có danh sách tên.');return;}
      $('kNames').value=v;count();
    };
    $('kResFs').onclick=()=>{
      if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return;}
      const rq=res.requestFullscreen||res.webkitRequestFullscreen; if(rq) try{rq.call(res);}catch(e){}
    };
    count();unit();
    window._groupTest={split,names,groups:()=>groups};
  }

  function boot(){const h=$('utTimer'); if(!h||h.dataset.tx) return; h.dataset.tx='1'; build(h);}
  if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);
})();
