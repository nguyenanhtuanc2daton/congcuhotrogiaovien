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
    const R=S/2-6,c=S/2,p=pool(),n=p.length;
    ctx.save(); ctx.translate(c,c);
    if(!n){
      ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fillStyle='#16223a';ctx.fill();
      ctx.fillStyle='#93a0ba';ctx.textAlign='center';ctx.font='600 '+S*0.045+'px Segoe UI,Arial';
      ctx.fillText('Chưa có học sinh',0,0);
    } else {
      const a=2*Math.PI/n; ctx.rotate(rot);
      const fs=Math.max(8,Math.min(S*0.055,a*R*0.42)); ctx.font='600 '+fs+'px Segoe UI,Arial';
      for(let i=0;i<n;i++){
        ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,i*a,(i+1)*a);ctx.closePath();
        ctx.fillStyle=COL[i%COL.length];if(n>1&&i===n-1&&i%COL.length===0)ctx.fillStyle='#7c3aed';
        ctx.fill();ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1.5;ctx.stroke();
        // Tên dài bị cắt bằng "…" cho vừa ô
        let t=p[i];const maxW=R*0.62;
        if(ctx.measureText(t).width>maxW){while(t.length>1&&ctx.measureText(t+'…').width>maxW)t=t.slice(0,-1);t+='…';}
        ctx.save();ctx.rotate((i+0.5)*a);ctx.fillStyle='#fff';ctx.textAlign='right';ctx.textBaseline='middle';
        ctx.fillText(t,R-12,0);ctx.restore();
      }
    }
    ctx.restore();
    ctx.beginPath();ctx.arc(c,c,S*0.06,0,7);ctx.fillStyle='#0b1220';ctx.fill();
    ctx.lineWidth=4;ctx.strokeStyle='#38bdf8';ctx.stroke();
    ctx.beginPath();ctx.arc(c,c,R+2,0,7);ctx.lineWidth=4;ctx.strokeStyle='#38bdf8';ctx.stroke();
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
  window.addEventListener('tabshow',e=>{if(e.detail==='t2'){draw();info();}});
  window._wheelTest={parse,pool,draw,spin,rot:()=>rot}; info();
})();
