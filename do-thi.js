/* Vẽ đồ thị */


/* ======================= MÔ-ĐUN 4: VẼ ĐỒ THỊ ======================= */
(function(){
  const cv=$('gcv'),COLS=['#f97316','#38bdf8','#34d399','#f472b6','#facc15','#a78bfa'];
  let fns=[{s:'x^2 - 4x + 3',f:null,err:'',pts:null}],V={cx:0,cy:0,sx:40,sy:40},moved=false,inited=false,W=0,H=0,raf=0,tmr=0,atm=0;
  const OKF=new Set(['sqrt','cbrt','sin','cos','tan','cot','sec','csc','asin','acos','atan','sinh','cosh','tanh','log','log10','log2','exp','abs','floor','ceil','round','sign']);
  const OKS=new Set(['x','pi','e','PI','E']),OKT=['ConstantNode','OperatorNode','FunctionNode','ParenthesisNode'];
  const VN=m=>{const e=new Error(m);e.vn=1;return e;};
  /* Bộ phân tích an toàn: math.js parse -> kiểm tra danh sách trắng nút/hàm/ký hiệu -> compile. Không eval/new Function trên chuỗi nhập. */
  function compile(src){
    const s=String(src).trim().replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i,'').replace(/π/g,'pi').replace(/[−–]/g,'-').replace(/×/g,'*').replace(/÷/g,'/')
      .replace(/\blog\s*\(/gi,'log10(').replace(/\bln\s*\(/gi,'log(');
    if(!s) return null;
    if(typeof math==='undefined') throw VN('Chưa tải được thư viện math.js (cần mạng để nạp từ CDN).');
    const node=math.parse(s);
    node.traverse((n,path,parent)=>{
      if(n.type==='SymbolNode'){
        if(path==='fn'&&parent&&parent.type==='FunctionNode'){if(!OKF.has(n.name))throw VN('Hàm "'+n.name+'" chưa được hỗ trợ');}
        else if(!OKS.has(n.name))throw VN('Không hiểu ký hiệu "'+n.name+'" (chỉ dùng biến x)');
      } else if(!OKT.includes(n.type)) throw VN('Biểu thức có thành phần không được hỗ trợ');
    });
    const code=node.compile(),sc={x:0};
    return x=>{sc.x=x;try{const v=code.evaluate(sc);return typeof v==='number'?v:NaN;}catch(e){return NaN;}}; // số phức/miền không xác định -> NaN
  }
  /* Tìm nghiệm (đổi dấu + chia đôi) và cực trị (tam phân) trên [a,b]; loại bỏ tiệm cận */
  function analyze(f,a,b,N){
    const h=(b-a)/N,xs=[],ys=[],roots=[],ext=[];
    for(let i=0;i<=N;i++){const x=a+i*h;xs.push(x);ys.push(f(x));}
    const addRoot=r=>{if(!roots.some(q=>Math.abs(q-r)<1e-6))roots.push(r);};
    for(let i=1;i<=N;i++){
      const y0=ys[i-1],y1=ys[i];if(!isFinite(y0)||!isFinite(y1))continue;
      if(y0===0)addRoot(xs[i-1]);
      else if(y0*y1<0){let lo=xs[i-1],hi=xs[i],fl=y0;
        for(let k=0;k<60;k++){const m=(lo+hi)/2,fm=f(m);if(!isFinite(fm))break;if(fl*fm<=0)hi=m;else{lo=m;fl=fm;}}
        const r=(lo+hi)/2,fr=f(r);if(isFinite(fr)&&Math.abs(fr)<1e-5)addRoot(r);}
    }
    for(let i=1;i<N;i++){
      const p=ys[i-1],q=ys[i],n=ys[i+1];if(!isFinite(p)||!isFinite(q)||!isFinite(n))continue;
      const mx=q>p&&q>=n,mn=q<p&&q<=n;if(!mx&&!mn)continue;
      let lo=xs[i-1],hi=xs[i+1];const sg=mx?1:-1;
      for(let k=0;k<70;k++){const m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;if(sg*f(m1)<sg*f(m2))lo=m1;else hi=m2;}
      const x=(lo+hi)/2,y=f(x);
      if(!isFinite(y)||Math.abs(y)>1e6||x-xs[i-1]<h*1e-6||xs[i+1]-x<h*1e-6)continue; // sát tiệm cận/biên -> bỏ
      if(!ext.some(e=>Math.abs(e.x-x)<1e-5))ext.push({x,y,t:mx?'Cực đại':'Cực tiểu'});
      if(Math.abs(y)<1e-8)addRoot(x);
    }
    return{roots:roots.sort((u,v)=>u-v).slice(0,12),ext:ext.slice(0,12)};
  }
  let XS=[]; // giao điểm giữa các cặp đồ thị (để vẽ + liệt kê)
  /* Giao điểm hai đồ thị = nghiệm của f(x) - g(x) = 0 (đổi dấu + chia đôi, có cả trường hợp tiếp xúc) */
  function crossings(a,b,N){
    const out=[];
    for(let i=0;i<fns.length;i++)for(let j=i+1;j<fns.length;j++){
      const f=fns[i].f,g=fns[j].f;if(!f||!g)continue;
      const d=x=>f(x)-g(x);let same=true;
      for(let k=0;k<41;k++){if(!(Math.abs(d(a+(b-a)*k/40))<1e-9)){same=false;break;}}
      if(same){out.push({i,j,same:true,pts:[]});continue;}
      out.push({i,j,same:false,pts:analyze(d,a,b,N).roots.slice(0,8).map(x=>({x,y:f(x)})).filter(p=>isFinite(p.y))});
    }
    return out;
  }
  const bnd=()=>({x0:V.cx-W/2/V.sx,x1:V.cx+W/2/V.sx,y0:V.cy-H/2/V.sy,y1:V.cy+H/2/V.sy});
  /* Tự chọn tỉ lệ: gom nghiệm/cực trị/giao Oy gần gốc nhất để khung nhìn thấy rõ đỉnh và giao điểm */
  function autofit(){
    if(!W||!H)return;
    const keys=[];
    fns.forEach(fn=>{if(!fn.f)return;const a=analyze(fn.f,-30,30,3000);fn.noExt=!a.ext.length;
      a.roots.forEach(x=>keys.push({x,y:0}));a.ext.forEach(e=>keys.push({x:e.x,y:e.y}));
      const y0=fn.f(0);if(isFinite(y0))keys.push({x:0,y:y0});});
    const ik=[];crossings(-30,30,3000).forEach(c=>c.pts.forEach(p=>ik.push({x:p.x,y:p.y})));
    const byx=(p,q)=>Math.abs(p.x)-Math.abs(q.x);keys.sort(byx);ik.sort(byx);
    const K=keys.slice(0,6).concat(ik.slice(0,4)).filter(k=>Math.abs(k.y)<1e4); // luôn đưa giao điểm gần gốc vào khung
    let xl=Math.min(-3,...K.map(k=>k.x)),xh=Math.max(3,...K.map(k=>k.x));
    let mg=Math.max(1,(xh-xl)*0.25);xl-=mg;xh+=mg;
    const ys=[0,...K.map(k=>k.y)];
    fns.forEach(fn=>{if(!fn.f||!fn.noExt)return;const v=[];for(let i=0;i<=200;i++){const y=fn.f(xl+(xh-xl)*i/200);if(isFinite(y))v.push(y);}
      if(v.length){v.sort((a,b)=>a-b);ys.push(Math.max(-10,Math.min(10,v[Math.floor(v.length*0.04)])),Math.max(-10,Math.min(10,v[Math.floor(v.length*0.96)])));}});
    let yl=Math.min(-2,...ys),yh=Math.max(2,...ys);mg=Math.max(1,(yh-yl)*0.25);yl-=mg;yh+=mg;
    let sx=W/(xh-xl),sy=H/(yh-yl);
    if(Math.max(sx,sy)/Math.min(sx,sy)<=6)sx=sy=Math.min(sx,sy); // ưu tiên tỉ lệ 1:1 khi hợp lý
    V={cx:(xl+xh)/2,cy:(yl+yh)/2,sx,sy};
  }
  const nice=(px)=>{const raw=60/px,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;return(m<=1?1:m<=2?2:m<=5?5:10)*p;};
  const LT={bg:'#0a101d',grid:'#1c2942',axis:'#7d8aa6',txt:'#93a0ba',dot:'#0a101d',lab:'#fde68a'},LL={bg:'#ffffff',grid:'#e3e8f2',axis:'#334155',txt:'#334155',dot:'#ffffff',lab:'#b45309'};
  function render(ctx,w,h,T,v){
    ctx.fillStyle=T.bg;ctx.fillRect(0,0,w,h);
    const X=x=>w/2+(x-v.cx)*v.sx,Y=y=>h/2-(y-v.cy)*v.sy;
    const x0=v.cx-w/2/v.sx,x1=v.cx+w/2/v.sx,y0=v.cy-h/2/v.sy,y1=v.cy+h/2/v.sy;
    const dx=nice(v.sx),dy=nice(v.sy),ax=Math.min(w,Math.max(0,X(0))),ay=Math.min(h,Math.max(0,Y(0)));
    ctx.font='12px Segoe UI,Arial';ctx.lineWidth=1;
    for(let x=Math.ceil(x0/dx);x<=x1/dx;x++){const px=Math.round(X(x*dx))+.5;ctx.strokeStyle=T.grid;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.stroke();
      if(x){ctx.fillStyle=T.txt;ctx.textAlign='center';ctx.fillText(fmtNum(x*dx,6),px,ay+15>h-2?ay-6:ay+15);}}
    for(let y=Math.ceil(y0/dy);y<=y1/dy;y++){const py=Math.round(Y(y*dy))+.5;ctx.strokeStyle=T.grid;ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w,py);ctx.stroke();
      if(y){ctx.fillStyle=T.txt;const L=ax<40;ctx.textAlign=L?'left':'right';ctx.fillText(fmtNum(y*dy,6),L?ax+5:ax-5,py+4);}}
    ctx.strokeStyle=T.axis;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(0,ay);ctx.lineTo(w,ay);ctx.moveTo(ax,0);ctx.lineTo(ax,h);ctx.stroke();
    ctx.fillStyle=T.txt;ctx.textAlign='left';ctx.fillText('x',w-12,ay-6<12?ay+16:ay-6);ctx.fillText('y',ax+6>w-12?ax-14:ax+6,12);
    ctx.textAlign=ax<40?'left':'right';ctx.fillText('O',ax<40?ax+5:ax-5,ay+15>h-2?ay-6:ay+15);
    fns.forEach((fn,i)=>{
      if(!fn.f)return;const col=COLS[i%COLS.length];ctx.strokeStyle=col;ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.beginPath();
      let pen=false,yp=NaN,Yp=0;
      for(let px=0;px<=w;px++){
        const y=fn.f(x0+px/v.sx);if(!isFinite(y)){pen=false;continue;}
        const Yc=Math.max(-1e5,Math.min(1e5,Y(y)));
        if(pen&&((y>0)!==(yp>0))&&Math.abs(Yc-Yp)>h)pen=false; // không nối qua tiệm cận
        pen?ctx.lineTo(px,Yc):ctx.moveTo(px,Yc);pen=true;yp=y;Yp=Yc;
      }
      ctx.stroke();
      if(fn.pts){ctx.lineWidth=2;fn.pts.forEach(p=>{ctx.beginPath();ctx.arc(X(p.x),Y(p.y),4.5,0,7);ctx.fillStyle=T.dot;ctx.fill();ctx.strokeStyle=col;ctx.stroke();});}
    });
    XS.forEach(c=>c.pts.forEach(p=>{const px=X(p.x),py=Y(p.y);
      ctx.beginPath();ctx.arc(px,py,6,0,7);ctx.fillStyle='#ef4444';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=T.dot;ctx.stroke();
      ctx.font='bold 13px Segoe UI,Arial';ctx.fillStyle=T.lab;ctx.textAlign='left';ctx.fillText(p.l,px+8,py-8);}));
  }
  function draw(){raf=0;if(!W)return;const c=cv.getContext('2d'),d=window.devicePixelRatio||1;c.setTransform(d,0,0,d,0,0);render(c,W,H,LT,V);}
  const redraw=()=>{if(!raf)raf=requestAnimationFrame(draw);};
  function results(){
    const b=bnd(),out=[];
    fns.forEach((fn,i)=>{
      if(!fn.f){fn.pts=null;return;}
      const a=analyze(fn.f,b.x0,b.x1,1600),pts=[],y0=fn.f(0);
      const P=(x,y)=>'('+fmtNum(x,4)+'; '+fmtNum(y,4)+')';
      a.roots.forEach(x=>pts.push({x,y:0}));a.ext.forEach(e=>pts.push({x:e.x,y:e.y}));if(isFinite(y0))pts.push({x:0,y:y0});
      fn.pts=pts;
      out.push('<div><b style="color:'+COLS[i%COLS.length]+'">y = '+esc(fn.s.replace(/^\s*y\s*=\s*/i,''))+'</b><br>• Giao Ox: '+(a.roots.length?a.roots.map(x=>P(x,0)).join(', '):'không thấy trong khung nhìn')+
        '<br>• Giao Oy: '+(isFinite(y0)?P(0,y0):'không xác định')+
        '<br>• Cực trị: '+(a.ext.length?a.ext.map(e=>e.t+' '+P(e.x,e.y)).join(', '):'không có / không tính được')+'</div>');
    });
    XS=crossings(b.x0,b.x1,1600);let L=0;
    XS.forEach(c=>{
      const P=(x,y)=>'('+fmtNum(x,4)+'; '+fmtNum(y,4)+')';
      c.pts.forEach(p=>{p.l=String.fromCharCode(65+(L++%26));});
      out.push('<div style="border-top:1px solid var(--bd);margin-top:6px;padding-top:6px"><b>⚡ Giao điểm đồ thị '+(c.i+1)+' và '+(c.j+1)+':</b> '+
        (c.same?'hai đồ thị trùng nhau (vô số giao điểm)':c.pts.length?c.pts.map(p=>'<b style="color:#fca5a5">'+p.l+'</b>'+P(p.x,p.y)).join(', '):'không có giao điểm trong khung nhìn hiện tại (thử thu nhỏ hoặc bấm "Về mặc định")')+'</div>');
    });
    $('gres').innerHTML=out.join('')||'<span class="note">Nhập hàm số để xem giao điểm và cực trị.</span>';
    redraw();
  }
  const later=()=>{clearTimeout(tmr);tmr=setTimeout(results,140);};
  function update(){ // biên dịch lại toàn bộ hàm, báo lỗi thân thiện
    const errs=[];
    fns.forEach((fn,i)=>{fn.err='';fn.f=null;fn.pts=null;
      try{fn.f=compile(fn.s);}catch(e){fn.err=e.vn?e.message:'Cú pháp chưa đúng ('+String(e.message).slice(0,80)+')';errs.push('Hàm '+(i+1)+': '+fn.err);}});
    $('fErr').textContent=errs.join(' — ');
    if(!moved)autofit();
    redraw();later();
  }
  function list(){
    const L=$('fList');L.innerHTML='';
    fns.forEach((fn,i)=>{
      const r=document.createElement('div');r.className='fr';
      r.innerHTML='<i style="background:'+COLS[i%COLS.length]+'"></i><span style="color:var(--mut);white-space:nowrap">y =</span><input type="text" spellcheck="false" placeholder="ví dụ: x^2 - 4x + 3">'+(fns.length>1?'<button class="sm sec" type="button">✕</button>':'');
      const inp=r.querySelector('input');inp.value=fn.s.replace(/^\s*y\s*=\s*/i,'');
      inp.addEventListener('input',()=>{fn.s=inp.value;clearTimeout(atm);atm=setTimeout(update,180);});
      const bt=r.querySelector('button');if(bt)bt.addEventListener('click',()=>{fns.splice(i,1);moved=false;list();update();});
      L.appendChild(r);
    });
  }
  $('fAdd').addEventListener('click',()=>{if(fns.length>=6){$('fErr').textContent='Tối đa 6 hàm cùng lúc.';return;}fns.push({s:'',f:null,err:'',pts:null});moved=false;list();});
  $('gReset').addEventListener('click',()=>{moved=false;autofit();redraw();later();});
  /* Kéo để dịch, cuộn chuột / chụm hai ngón để thu phóng */
  function zoomAt(px,py,k){
    const wx=V.cx+(px-W/2)/V.sx,wy=V.cy-(py-H/2)/V.sy;
    V.sx=Math.min(1e6,Math.max(1e-4,V.sx*k));V.sy=Math.min(1e6,Math.max(1e-4,V.sy*k));
    V.cx=wx-(px-W/2)/V.sx;V.cy=wy+(py-H/2)/V.sy;moved=true;
  }
  const P=new Map();let pd=0,pm=null;
  const pos=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);P.set(e.pointerId,pos(e));pd=0;pm=null;cv.style.cursor='grabbing';});
  cv.addEventListener('pointermove',e=>{
    if(!P.has(e.pointerId))return;const o=P.get(e.pointerId),n=pos(e);P.set(e.pointerId,n);
    if(P.size===1){V.cx-=(n.x-o.x)/V.sx;V.cy+=(n.y-o.y)/V.sy;moved=true;}
    else if(P.size===2){const[a,b]=[...P.values()],d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      if(pd&&d>0)zoomAt(m.x,m.y,d/pd);if(pm){V.cx-=(m.x-pm.x)/V.sx;V.cy+=(m.y-pm.y)/V.sy;}pd=d;pm=m;}
    redraw();later();
  });
  const up=e=>{P.delete(e.pointerId);pd=0;pm=null;if(!P.size)cv.style.cursor='grab';};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e);zoomAt(p.x,p.y,Math.exp(-e.deltaY*0.0015));redraw();later();},{passive:false});
  /* Tải PNG: vẽ lại nền trắng, độ phân giải cao */
  $('gPng').addEventListener('click',()=>{
    if(!W)return;const k=Math.max(1.5,1400/W),c=document.createElement('canvas');c.width=Math.round(W*k);c.height=Math.round(H*k);
    const x=c.getContext('2d');x.setTransform(k,0,0,k,0,0);render(x,W,H,LL,V);
    c.toBlob(b=>{if(b)saveBlob(b,'do-thi.png');else $('fErr').textContent='Không tạo được ảnh.';},'image/png');
  });
  function fit(){
    const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;const d=window.devicePixelRatio||1;
    const first=!W;W=w;H=h;cv.width=Math.round(w*d);cv.height=Math.round(h*d);
    if(first||!inited){inited=true;if(!moved)autofit();later();}
    redraw();
  }
  if(window.ResizeObserver)new ResizeObserver(fit).observe(cv);
  window.addEventListener('resize',fit);
  window.addEventListener('tabshow',e=>{if(e.detail==='t4'){fit();if(!moved)autofit();redraw();later();}});
  window._graphTest={compile,analyze,fns:()=>fns,V:()=>V};
  list();update();
})();
