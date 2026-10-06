/* Tab Toán học: Tạo đề · Thống kê & Xác suất · Hình học · Số học · Giải PT (bản v2 ghi đè công cụ cũ), xuất SVG/PNG, sao lưu/khôi phục */
/* ---- Tab 5: Toán học (Tạo đề · Thống kê & Xác suất) ---- */
(function(){
const $=id=>document.getElementById(id);
$('mSel').addEventListener('change',()=>{document.querySelectorAll('#t5>.mt').forEach(m=>m.classList.toggle('on',m.id===$('mSel').value));if($('mSel').value==='mI')window.dispatchEvent(new CustomEvent('tabshow',{detail:'t4'}));});
window.addEventListener('tabshow',e=>{if(e.detail==='t5'&&$('mSel').value==='mI')window.dispatchEvent(new CustomEvent('tabshow',{detail:'t4'}));});

/* A. Tạo đề */
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const nz=(a,b)=>{let v=0;while(!v)v=ri(a,b);return v};
const sg=n=>n<0?'- '+(-n):'+ '+n;
const co=(a,v)=>a===1?v:a===-1?'-'+v:a+v;
const G={
 'Phương trình bậc nhất':()=>{const x=ri(-9,9),a=nz(-9,9),b=ri(-9,9);return[`Giải phương trình $${co(a,'x')} ${sg(b)} = ${a*x+b}$.`,`$x = ${x}$`]},
 'Hằng đẳng thức (khai triển)':()=>{const a=ri(1,4),b=ri(1,7),k=ri(0,2);
  if(k==0)return[`Khai triển $(${co(a,'x')} + ${b})^2$.`,`$${a*a}x^2 + ${2*a*b}x + ${b*b}$`];
  if(k==1)return[`Khai triển $(${co(a,'x')} - ${b})^2$.`,`$${a*a}x^2 - ${2*a*b}x + ${b*b}$`];
  return[`Khai triển $(${co(a,'x')} - ${b})(${co(a,'x')} + ${b})$.`,`$${a*a}x^2 - ${b*b}$`]},
 'Phương trình bậc hai':()=>{const p=nz(-6,6),q=nz(-6,6),s=-(p+q),m=p*q;return[`Giải phương trình $x^2 ${s?sg(s)+'x ':''}${sg(m)} = 0$.`,p==q?`$x = ${p}$`:`$x = ${p}$ hoặc $x = ${q}$`]},
 'Hệ hai phương trình':()=>{let a,b,c,d;const x=ri(-5,5),y=ri(-5,5);do{a=nz(-4,4);b=nz(-4,4);c=nz(-4,4);d=nz(-4,4)}while(a*d-b*c===0);
  return[`Giải hệ phương trình $\\begin{cases} ${co(a,'x')} ${sg(b)}y = ${a*x+b*y} \\\\ ${co(c,'x')} ${sg(d)}y = ${c*x+d*y} \\end{cases}$`,`$(x;y) = (${x};${y})$`]},
 'Bất phương trình bậc nhất':()=>{const x=ri(-6,6),a=nz(-7,7),b=ri(-9,9),c=a*x+b;return[`Giải bất phương trình $${co(a,'x')} ${sg(b)} > ${c}$.`,`$x ${a>0?'>':'<'} ${x}$`]},
 'Căn bậc hai (rút gọn)':()=>{const k=ri(2,7),m=[2,3,5,6,7][ri(0,4)];return[`Rút gọn $\\sqrt{${k*k*m}}$.`,`$${k}\\sqrt{${m}}$`]}
};
const names=Object.keys(G);
$('qTopics').innerHTML=names.map((n,i)=>`<label class="qchip"><input type="checkbox" class="qt" value="${i}" ${i<3?'checked':''}> ${n}</label>`).join('');
$('qGen').onclick=()=>{
 const sel=[...document.querySelectorAll('.qt:checked')].map(c=>+c.value),n=+$('qN').value||1,v=+$('qV').value||1;
 if(!sel.length){$('qOut').value='Hãy chọn ít nhất một dạng bài.';return}
 let out='';
 for(let m=1;m<=v;m++){let i=1,ans=[];out+=`ĐỀ SỐ ${m}\n\n`;
  sel.forEach(s=>{for(let k=0;k<n;k++){const[q,a]=G[names[s]]();out+=`Câu ${i}. ${q}\n\n`;ans.push(`Câu ${i}: ${a}`);i++}});
  out+=`ĐÁP ÁN ĐỀ SỐ ${m}\n${ans.join('\n')}\n\n`+(m<v?'--------------------\n\n':'')}
 $('qOut').value=out};
$('qCopy').onclick=()=>{$('qOut').select();try{document.execCommand('copy')}catch(e){}};
$('qSend').onclick=()=>{const t=$('qOut').value;if(!t)return;$('input').value=t;document.querySelector('[data-tab=t1]').click()};

/* Vẽ biểu đồ cột dùng chung */
function bars(cv,labels,series,cols,names){
 const W=cv.width=760,H=cv.height=300,c=cv.getContext('2d');c.clearRect(0,0,W,H);c.font='12px Segoe UI';
 const mx=Math.max(1e-9,...series.flat()),L=40,B=H-30,T=20,w=(W-L-10)/labels.length;
 c.fillStyle='#93a0ba';c.strokeStyle='#25324d';
 for(let g=0;g<=4;g++){const y=B-(B-T)*g/4;c.beginPath();c.moveTo(L,y);c.lineTo(W-10,y);c.stroke();c.fillText((mx*g/4).toFixed(mx<=1?2:0),2,y+4)}
 labels.forEach((lb,i)=>{const bw=w*0.7/series.length;
  series.forEach((s,j)=>{const h=(B-T)*s[i]/mx;c.fillStyle=cols[j];c.fillRect(L+i*w+w*.15+j*bw,B-h,bw-2,h)});
  c.fillStyle='#e6ebf5';c.textAlign='center';c.fillText(lb,L+i*w+w/2,B+16);c.textAlign='left'});
 names.forEach((nm,j)=>{c.fillStyle=cols[j];c.fillRect(W-150,6+j*0+0,0,0);c.fillRect(L+j*130,4,10,10);c.fillStyle='#e6ebf5';c.fillText(nm,L+j*130+14,13)})}
const cols=['#4f5bf0','#34d399'];

/* B. Thống kê */
const med=a=>{const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
$('sRun').onclick=()=>{
 const d=$('sIn').value.trim().split(/[\s;]+/).map(s=>parseFloat(s.replace(',','.'))).filter(x=>!isNaN(x)).sort((a,b)=>a-b);
 if(!d.length){$('sRes').textContent='Chưa có số liệu hợp lệ.';return}
 const n=d.length,mean=d.reduce((a,b)=>a+b,0)/n,f={};d.forEach(x=>f[x]=(f[x]||0)+1);
 const mf=Math.max(...Object.values(f)),mode=Object.keys(f).filter(k=>f[k]==mf).join('; ');
 const h=Math.floor(n/2),q1=n>1?med(d.slice(0,h)):d[0],q3=n>1?med(d.slice(n-h)):d[0];
 const sd=Math.sqrt(d.reduce((s,x)=>s+(x-mean)**2,0)/n),r=x=>Math.round(x*100)/100;
 const keys=Object.keys(f).map(Number).sort((a,b)=>a-b);
 $('sRes').innerHTML=`n = ${n} · Trung bình = ${r(mean)} · Trung vị = ${r(med(d))} · Mốt = ${mode}<br>Min = ${d[0]} · Max = ${d[n-1]} · Khoảng biến thiên = ${r(d[n-1]-d[0])}<br>Q1 = ${r(q1)} · Q3 = ${r(q3)} · Khoảng tứ phân vị = ${r(q3-q1)} · Độ lệch chuẩn = ${r(sd)}<br><b>Bảng tần số:</b> `+keys.map(k=>`${k}: ${f[k]} (${r(f[k]*100/n)}%)`).join(' | ');
 bars($('mbCv'),keys.map(String),[keys.map(k=>f[k])],[cols[0]],['Tần số'])};
/* Xác suất */
$('pRun').onclick=()=>{
 const t=$('pType').value,N=Math.min(100000,+$('pN').value||1);let labs,th,cnt;
 if(t=='coin'){labs=['Sấp','Ngửa'];th=[.5,.5];cnt=[0,0]}
 else if(t=='d6'){labs=[1,2,3,4,5,6].map(String);th=labs.map(()=>1/6);cnt=labs.map(()=>0)}
 else{labs=[];for(let s=2;s<=12;s++)labs.push(String(s));th=labs.map(s=>(6-Math.abs(s-7))/36);cnt=labs.map(()=>0)}
 for(let i=0;i<N;i++){const k=t=='coin'?ri(0,1):t=='d6'?ri(0,5):ri(1,6)+ri(1,6)-2;cnt[k]++}
 const fr=cnt.map(c=>c/N);
 $('pRes').innerHTML=`N = ${N} lần. `+labs.map((l,i)=>`${l}: ${cnt[i]} (tần suất ${fr[i].toFixed(3)} · lí thuyết ${th[i].toFixed(3)})`).join(' | ');
 bars($('mbCv'),labs,[fr,th],cols,['Tần suất thực nghiệm','Xác suất lí thuyết'])};

})();

/* ---- Tab 5 (mở rộng): Số học · Giải PT · Tam giác vuông · Giờ & nhóm ---- */
(function(){
const $=id=>document.getElementById(id);
const rd=x=>Math.round(x*10000)/10000;
const gcd=(a,b)=>{while(b){[a,b]=[b,a%b]}return a};
const fac=n=>{const o=[];for(let p=2;p*p<=n;p++)while(n%p===0){o.push(p);n/=p}if(n>1)o.push(n);return o};
const fs=n=>{if(n<2)return String(n);const f={};fac(n).forEach(p=>f[p]=(f[p]||0)+1);return Object.keys(f).map(p=>f[p]>1?p+'<sup>'+f[p]+'</sup>':p).join(' × ')};
$('nRun').onclick=()=>{
 const a=Math.floor(+$('nA').value),b=Math.floor(+$('nB').value);
 if(!(a>0&&b>0&&a<=1e12&&b<=1e12)){$('nRes').textContent='Hãy nhập số nguyên dương ≤ 10^12.';return}
 const g=gcd(a,b),div=n=>{if(n>1e8)return'(quá lớn để liệt kê)';const o=[];for(let i=1;i*i<=n;i++)if(n%i==0){o.push(i);if(i*i!=n)o.push(n/i)}return o.sort((x,y)=>x-y).join(', ')};
 const pr=n=>n>1&&fac(n).length==1?'là số nguyên tố':'không phải số nguyên tố';
 $('nRes').innerHTML=`<b>${a}</b> = ${fs(a)} (${pr(a)}) · <b>${b}</b> = ${fs(b)} (${pr(b)})<br>ƯCLN(${a}, ${b}) = <b>${g}</b> · BCNN(${a}, ${b}) = <b>${a/g*b}</b><br>Ước của ${a}: ${div(a)}<br>Ước của ${b}: ${div(b)}<br>Rút gọn ${a}/${b} = <b>${a/g}/${b/g}</b>`+(g==1?' (đã tối giản)':'')};

const q=(a,b,c)=>{const D=b*b-4*a*c;return D};
$('eRun').onclick=()=>{
 const m=$('eMode').value,v=[1,2,3,4,5,6].map(i=>+$('e'+i).value),o=[];
 if(m=='1'){const[a,b]=v;o.push(`Phương trình: ${a}x + ${b} = 0`);
  if(a==0)o.push(b==0?'0 = 0: vô số nghiệm.':'Vô nghiệm (a = 0, b ≠ 0).');
  else{o.push(`⇒ ${a}x = ${-b}`,`⇒ x = ${-b}/${a} = <b>${rd(-b/a)}</b>`)}}
 else if(m=='2'){const[a,b,c]=v;
  if(a==0){o.push('a = 0: đây không phải phương trình bậc hai.')}
  else{const D=q(a,b,c);o.push(`Δ = b² − 4ac = ${b}² − 4·${a}·${c} = <b>${rd(D)}</b>`);
   if(D<0)o.push('Δ < 0 ⇒ phương trình vô nghiệm.');
   else if(D==0)o.push(`Δ = 0 ⇒ nghiệm kép x₁ = x₂ = −b/2a = <b>${rd(-b/(2*a))}</b>`);
   else{const s=Math.sqrt(D);o.push(`Δ > 0 ⇒ hai nghiệm phân biệt (√Δ ≈ ${rd(s)}):`,`x₁ = (−b + √Δ)/2a = <b>${rd((-b+s)/(2*a))}</b>`,`x₂ = (−b − √Δ)/2a = <b>${rd((-b-s)/(2*a))}</b>`)}
   o.push(`Kiểm tra Vi-ét: x₁ + x₂ = ${rd(-b/a)} · x₁x₂ = ${rd(c/a)}`)}}
 else{const[a,b,c,d,e,f]=v,D=a*e-b*d,Dx=c*e-b*f,Dy=a*f-c*d;
  o.push(`Hệ: ${a}x + ${b}y = ${c} ; ${d}x + ${e}y = ${f}`,`D = a₁b₂ − a₂b₁ = ${rd(D)} · Dx = ${rd(Dx)} · Dy = ${rd(Dy)}`);
  if(D!=0)o.push(`Nghiệm duy nhất: x = Dx/D = <b>${rd(Dx/D)}</b>, y = Dy/D = <b>${rd(Dy/D)}</b>`);
  else o.push(Dx==0&&Dy==0?'D = Dx = Dy = 0: hệ vô số nghiệm hoặc vô nghiệm (xét thêm tỉ lệ hệ số).':'D = 0 nhưng Dx hoặc Dy ≠ 0: hệ vô nghiệm.')}
 $('eRes').innerHTML=o.join('<br>')};

$('rRun').onclick=()=>{
 let b=parseFloat($('rB').value),c=parseFloat($('rC').value),a=parseFloat($('rA').value);const h=[b,c,a].filter(x=>!isNaN(x)&&x>0).length;
 if(h!=2){$('rRes').textContent='Hãy nhập đúng 2 cạnh (số dương).';return}
 if(isNaN(a)||!(a>0))a=Math.hypot(b,c);else if(isNaN(b)||!(b>0)){if(a<=c){$('rRes').textContent='Cạnh huyền phải lớn hơn cạnh góc vuông.';return}b=Math.sqrt(a*a-c*c)}else{if(a<=b){$('rRes').textContent='Cạnh huyền phải lớn hơn cạnh góc vuông.';return}c=Math.sqrt(a*a-b*b)}
 const H=b*c/a,B=Math.asin(b/a)*180/Math.PI;
 $('rRes').innerHTML=`Cạnh góc vuông b = <b>${rd(b)}</b>, c = <b>${rd(c)}</b>, huyền a = <b>${rd(a)}</b> (a² = b² + c²)<br>Đường cao h = bc/a = <b>${rd(H)}</b> (h² = b'·c')<br>Hình chiếu b' = b²/a = <b>${rd(b*b/a)}</b>, c' = c²/a = <b>${rd(c*c/a)}</b><br>Góc B ≈ <b>${rd(B)}°</b>, góc C ≈ <b>${rd(90-B)}°</b> · sin B = ${rd(b/a)}, cos B = ${rd(c/a)}, tan B = ${rd(b/c)}<br>Diện tích = bc/2 = <b>${rd(b*c/2)}</b>`};

let left=300,tid=null;const disp=()=>{$('kDisp').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0')};
const beep=()=>{try{const x=new(window.AudioContext||window.webkitAudioContext)(),o=x.createOscillator();o.connect(x.destination);o.frequency.value=880;o.start();setTimeout(()=>{o.stop();x.close()},900)}catch(e){}};
const rst=()=>{clearInterval(tid);tid=null;left=Math.max(1,Math.min(180,+$('kMin').value||1))*60;disp()};
$('kMin').onchange=rst;$('kReset').onclick=rst;
$('kGo').onclick=()=>{if(tid){clearInterval(tid);tid=null;return}if(left<=0)rst();tid=setInterval(()=>{left--;disp();if(left<=0){clearInterval(tid);tid=null;beep()}},1000)};
$('kPull').onclick=()=>{try{$('kNames').value=window.TG.names().join('\n')}catch(e){}};
$('kSplit').onclick=()=>{
 const n=$('kNames').value.split('\n').map(s=>s.trim()).filter(Boolean),k=Math.max(1,Math.min(20,+$('kN').value||1));
 if(!n.length){$('kRes').textContent='Chưa có danh sách.';return}
 for(let i=n.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[n[i],n[j]]=[n[j],n[i]]}
 const g=Array.from({length:k},()=>[]);n.forEach((x,i)=>g[i%k].push(x));
 $('kRes').innerHTML=g.map((m,i)=>`<b>Nhóm ${i+1}</b> (${m.length}): ${m.join(', ')}`).join('<br>')};
})();

/* ===== Tab Toán học – bản nâng cấp v2 (ghi đè các công cụ cũ, giữ nguyên id) ===== */
(function(){
const $=id=>document.getElementById(id),on=(i,f)=>{const e=$(i);if(e)e.onclick=f};
const HP=(i,pos,h)=>{const e=$(i);if(e&&e.parentNode)e.parentNode.insertAdjacentHTML(pos,h)},HE=(i,pos,h)=>{const e=$(i);if(e)e.insertAdjacentHTML(pos,h)};
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),nz=(a,b)=>{let v=0;while(!v)v=ri(a,b);return v},pick=a=>a[ri(0,a.length-1)];
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a};
const rd=x=>Math.round(x*10000)/10000,I=Number.isInteger;
const F=(n,d)=>{const g=gcd(n,d)||1;n/=g;d/=g;if(d<0){n=-n;d=-d}return d==1?String(n):n+'/'+d};
const fr=(n,d)=>I(n)&&I(d)?F(n,d):String(rd(n/d));
const LF=(n,d)=>{const g=gcd(n,d)||1;n/=g;d/=g;return d==1?`${n}`:`\\frac{${n}}{${d}}`};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const co=(a,v)=>a===1?v:a===-1?'-'+v:a+v;
const cx=(c,v)=>c==0?'':(c<0?' - ':' + ')+(Math.abs(c)==1?'':Math.abs(c))+v;
const kc=n=>n==0?'':(n<0?' - ':' + ')+Math.abs(n);
const poly=(p,q,r)=>`${p==1?'':p}x^2${cx(q,'x')}${kc(r)}`;
const R=L=>[5,9,15][L-1];
const mon=n=>n.toLocaleString('vi-VN')+' đồng';

/* ---------- A. Bộ tạo đề: 14 dạng, 3 mức độ, tự luận/trắc nghiệm, lời giải ---------- */
const T=[
['Phương trình bậc nhất',L=>{const r=R(L),x=ri(-r,r),a=nz(-r,r),b=ri(-r,r);return{q:`Giải phương trình $${co(a,'x')}${kc(b)} = ${a*x+b}$.`,a:`$x = ${x}$`,w:[x+1,-x,x-1,x+2].map(v=>`$x = ${v}$`),s:`$${co(a,'x')} = ${a*x} \\Rightarrow x = ${x}$`}}],
['Hằng đẳng thức (khai triển)',L=>{const a=ri(1,L+2),b=ri(1,2*L+3),k=ri(0,2),A=a*a,B=2*a*b,C=b*b,x=co(a,'x'),P=(p,q,r)=>`$${poly(p,q,r)}$`;
 const D=[[`Khai triển $(${x} + ${b})^2$.`,P(A,B,C),[P(A,b,C),P(A,0,C),P(A,-B,C),P(A,B,-C)],'$(A+B)^2 = A^2 + 2AB + B^2$'],
  [`Khai triển $(${x} - ${b})^2$.`,P(A,-B,C),[P(A,B,C),P(A,0,C),P(A,-B,-C),P(A,-b,C)],'$(A-B)^2 = A^2 - 2AB + B^2$'],
  [`Khai triển $(${x} - ${b})(${x} + ${b})$.`,P(A,0,-C),[P(A,0,C),P(A,-B,C),P(A,B,-C),P(A,b,-C)],'$(A-B)(A+B) = A^2 - B^2$']][k];
 return{q:D[0],a:D[1],w:D[2],s:D[3]}}],
['Phương trình bậc hai',L=>{const r=R(L)+1;let p=nz(-r,r),q;do{q=nz(-r,r)}while(q==p||q==-p);const s=-(p+q),m=p*q,A=(u,v)=>`$x = ${u}$ hoặc $x = ${v}$`;
 return{q:`Giải phương trình $x^2${cx(s,'x')}${kc(m)} = 0$.`,a:A(p,q),w:[A(-p,-q),A(p,-q),A(-p,q),A(p+1,q+1)],s:`Tổng hai nghiệm ${p+q}, tích ${m} nên nghiệm là ${p} và ${q}`}}],
['Hệ hai phương trình',L=>{const r=Math.min(5,L+2);let a,b,c,d;const x=ri(-r,r),y=ri(-r,r);do{a=nz(-4,4);b=nz(-4,4);c=nz(-4,4);d=nz(-4,4)}while(a*d-b*c===0);const f=(u,v)=>`$(x;y) = (${u};${v})$`,e1=a*x+b*y,e2=c*x+d*y;
 return{q:`Giải hệ phương trình $\\begin{cases} ${co(a,'x')}${cx(b,'y')} = ${e1} \\\\ ${co(c,'x')}${cx(d,'y')} = ${e2} \\end{cases}$`,a:f(x,y),w:[f(x+1,y),f(x,y+1),f(y,x),f(-x,y),f(x-1,y)],s:`$D = ${a*d-b*c}$, $D_x = ${e1*d-b*e2}$, $D_y = ${a*e2-c*e1}$ nên $x = ${x}$, $y = ${y}$`}}],
['Bất phương trình bậc nhất',L=>{const r=R(L),x=ri(-r,r),a=nz(-r,r),b=ri(-r,r),c=a*x+b,sn=a>0?'>':'<',op=a>0?'<':'>',f=(o,v)=>`$x ${o} ${v}$`;
 return{q:`Giải bất phương trình $${co(a,'x')}${kc(b)} > ${c}$.`,a:f(sn,x),w:[f(op,x),f(sn,x+1),f(sn,-x),f(op,x-1)],s:`$${co(a,'x')} > ${c-b}$`+(a<0?', chia hai vế cho số âm nên đổi chiều bất đẳng thức':'')}}],
['Căn bậc hai (rút gọn)',L=>{const k=ri(2,L+4),m=pick([2,3,5,6,7]),f=(u,v)=>`$${u}\\sqrt{${v}}$`;return{q:`Rút gọn $\\sqrt{${k*k*m}}$.`,a:f(k,m),w:[f(m,k),f(k*k,m),f(k,k*m),`$${k*m}$`],s:`$\\sqrt{${k*k*m}} = \\sqrt{${k*k}\\cdot ${m}} = ${k}\\sqrt{${m}}$`}}],
['Thực tế: giảm giá, phần trăm',L=>{const P=ri(10,60)*10000,p=pick([10,15,20,25,30]),A=P*(100-p)/100;let q=`Một cửa hàng giảm giá ${p}% cho chiếc áo niêm yết ${mon(P)}. Hỏi giá sau khi giảm là bao nhiêu?`,s=`${mon(P)} × ${100-p}% = ${mon(A)}`,a=A;
 if(L==3){a=Math.round(A*9/10);q=`Một cửa hàng giảm giá ${p}% cho chiếc áo niêm yết ${mon(P)}. Khách có thẻ thành viên được giảm thêm 10% trên giá đã giảm. Hỏi khách phải trả bao nhiêu?`;s=`${mon(P)} × ${100-p}% × 90% = ${mon(a)}`}
 return{q,a:mon(a),w:[P*p/100,P*(100+p)/100,P-p,P*(100-2*p)/100,a+10000].map(mon),s}}],
['Thực tế: chuyển động',L=>{const t=ri(1,L+2),v1=ri(3,6)*10,v2=ri(4,7)*10,s=(v1+v2)*t,f=n=>`${n} giờ`;return{q:`Hai xe xuất phát cùng lúc từ A và B cách nhau ${s} km, đi ngược chiều với vận tốc ${v1} km/h và ${v2} km/h. Hỏi sau mấy giờ hai xe gặp nhau?`,a:f(t),w:[t+1,t+2,2*t,t+3,Math.max(1,t-1)].map(f),s:`Tổng vận tốc ${v1+v2} km/h nên thời gian = ${s} : ${v1+v2} = ${t} giờ`}}],
['Thực tế: thang dựa tường (Pythagore)',L=>{const[b,h,c]=pick([[3,4,5],[5,12,13],[8,15,17],[6,8,10]]),k=L>1?ri(1,2):1,f=n=>`${n*k} m`;return{q:`Một chiếc thang dài ${c*k} m dựa vào tường thẳng đứng, chân thang cách tường ${b*k} m. Hỏi đầu thang chạm tường ở độ cao bao nhiêu mét?`,a:f(h),w:[f(c-b),f(b+c),f(h+1),f(h+2)],s:`Độ cao = $\\sqrt{${c*k}^2 - ${b*k}^2}$ = ${h*k} m`}}],
['Hàm số bậc nhất',L=>{const r=R(L)-1,a=nz(-r,r),b=ri(-r,r),x1=ri(-3,0),x2=ri(1,4),f=(u,v)=>`$a = ${u}$, $b = ${v}$`;return{q:`Đồ thị hàm số $y = ax + b$ đi qua $A(${x1};${a*x1+b})$ và $B(${x2};${a*x2+b})$. Tìm $a$ và $b$.`,a:f(a,b),w:[f(a,b+1),f(a+1,b),f(-a,b),f(b,a),f(a,-b)],s:`$a = \\frac{${a*(x2-x1)}}{${x2-x1}} = ${a}$; thay tọa độ A vào được $b = ${b}$`}}],
['Thống kê (trung bình, trung vị)',L=>{const v=Array.from({length:4},()=>ri(4,10)),s=v.reduce((p,c)=>p+c,0),l=(5-s%5)%5||5;v.push(l);const mean=(s+l)/5,so=[...v].sort((p,c)=>p-c),z=n=>`$${n}$`;
 return ri(0,1)?{q:`Cho dãy số liệu: ${v.join('; ')}. Tìm trung vị.`,a:z(so[2]),w:[so[1],so[3],so[4],so[0],mean].map(z),s:`Sắp xếp: ${so.join('; ')}; số đứng giữa là ${so[2]}`}:{q:`Điểm kiểm tra của 5 bạn: ${v.join('; ')}. Tính điểm trung bình.`,a:z(mean),w:[mean+1,mean-1,so[2]+1,so[4]].map(z),s:`$(${v.join('+')}) : 5 = ${mean}$`}}],
['Xác suất (lấy bi từ hộp)',L=>{const x=ri(2,3+2*L),y=ri(2,3+2*L),n=x+y,f=(u,v)=>`$${LF(u,v)}$`;return{q:`Một hộp có ${x} bi đỏ và ${y} bi xanh (cùng kích cỡ). Lấy ngẫu nhiên 1 bi. Tính xác suất để bi lấy được màu đỏ.`,a:f(x,n),w:[f(y,n),f(x,y),f(1,n),f(x,n+1),f(n,x)],s:`$P = \\frac{${x}}{${n}}$ (số kết quả thuận lợi chia tổng số kết quả)`}}],
['ƯCLN và BCNN',L=>{let p,q;const g=ri(2,3+3*L);do{p=ri(2,6);q=ri(2,6)}while(gcd(p,q)!=1);const a=g*p,b=g*q,z=n=>`$${n}$`,s=`${a} = ${g}·${p}, ${b} = ${g}·${q}; ƯCLN = ${g}, BCNN = ${g*p*q}`;
 return ri(0,1)?{q:`Tìm ƯCLN($${a}$, $${b}$).`,a:z(g),w:[g*p*q,p*q,g+1,2*g].map(z),s}:{q:`Tìm BCNN($${a}$, $${b}$).`,a:z(g*p*q),w:[g,a*b,g*p*q+g,p*q].map(z),s}}],
['Hệ thức lượng (đường cao)',L=>{const[b,c,a]=pick([[3,4,5],[6,8,10],[5,12,13],[9,12,15]]),f=(u,v)=>`$${LF(u,v)}$ cm`;return{q:`Tam giác ABC vuông tại A, AB = ${b} cm, AC = ${c} cm. Tính đường cao AH.`,a:f(b*c,a),w:[f(b+c,a),f(b*c,b+c),f(a,2),f(a*a,b*c)],s:`BC = ${a} cm, $AH = \\frac{AB\\cdot AC}{BC} = \\frac{${b*c}}{${a}}$`}}],
['Thực tế: tiền điện bậc thang',L=>{const k=ri(120,260),b1=50,p1=1800,p2=2000,p3=2500,t=Math.min(k,b1)*p1+Math.max(0,Math.min(k,100)-b1)*p2+Math.max(0,k-100)*p3;
 return{q:`Giá điện: 50 kWh đầu ${p1} đồng/kWh; từ kWh thứ 51 đến 100 là ${p2} đồng/kWh; từ kWh thứ 101 là ${p3} đồng/kWh. Một hộ dùng ${k} kWh. Tính số tiền điện (chưa thuế).`,a:mon(t),w:[k*p3,k*p1,t+50000,t-25000].map(mon),s:`${b1}·${p1} + 50·${p2} + ${k-100}·${p3} = ${mon(t)}`}}]
];
const names=T.map(t=>t[0]);
$('qTopics').innerHTML=names.map((n,i)=>`<label class="qchip"><input type="checkbox" class="qt" value="${i}" ${i<3?'checked':''}> ${n}</label>`).join('');
HE('qTopics','afterend','<div class="bar"><button class="sec sm" id="qAll" type="button">Chọn tất cả</button><button class="sec sm" id="qNone" type="button">Bỏ chọn</button></div>');
HP('qV','afterend','<label>Mức độ <select id="qL"><option value="1">Nhận biết</option><option value="2" selected>Thông hiểu</option><option value="3">Vận dụng</option></select></label><label>Dạng <select id="qF"><option value="tl">Tự luận</option><option value="tn">Trắc nghiệm A-B-C-D</option></select></label><label class="qchip"><input type="checkbox" id="qS"> Kèm lời giải</label>');
on('qAll',()=>document.querySelectorAll('.qt').forEach(c=>c.checked=true));on('qNone',()=>document.querySelectorAll('.qt').forEach(c=>c.checked=false));
on('qGen',()=>{
 const sel=[...document.querySelectorAll('.qt:checked')].map(c=>+c.value),n=+$('qN').value||1,v=+$('qV').value||1,L=+$('qL').value,tn=$('qF').value=='tn',sol=$('qS').checked,PAD=['Không xác định được','Cả ba đáp án còn lại đều sai','Không có đáp án nào đúng'];
 if(!sel.length){$('qOut').value='Hãy chọn ít nhất một dạng bài.';return}
 let out='';
 for(let m=1;m<=v;m++){let i=1;const ans=[];out+=`ĐỀ SỐ ${m}\n\n`;
  sel.forEach(s=>{for(let k=0;k<n;k++){const t=T[s][1](L);out+=`Câu ${i}. ${t.q}\n`;
   if(tn){const wr=[...new Set(t.w.map(String))].filter(x=>x!==t.a).slice(0,3);while(wr.length<3)wr.push(PAD[wr.length]);const op=shuffle([t.a,...wr]);op.forEach((o,j)=>out+=`${'ABCD'[j]}. ${o}\n`);out+='\n';ans.push(`Câu ${i}: ${'ABCD'[op.indexOf(t.a)]}`+(sol?` (${t.s})`:''))}
   else{out+='\n';ans.push(`Câu ${i}: ${t.a}`+(sol?`\n   Lời giải: ${t.s}`:''))}
   i++}});
  out+=`ĐÁP ÁN ĐỀ SỐ ${m}\n${ans.join('\n')}\n\n`+(m<v?'--------------------\n\n':'')}
 $('qOut').value=out});

/* ---------- B. Thống kê (bổ sung) & Xác suất (viết lại) ---------- */
const med=a=>{const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
HE('mbCv','afterend','<canvas id="mbBox" style="width:100%;margin-top:8px;background:var(--card2);border:1px solid var(--bd);border-radius:10px"></canvas>');
HP('sRun','beforeend','');const sb=$('sRun');if(sb)sb.parentNode.insertAdjacentHTML('beforeend','<button class="sec sm" id="sDemo" type="button">🎲 Dữ liệu mẫu</button>');
const oldS=sb&&sb.onclick;
on('sRun',()=>{oldS&&oldS();
 const d=$('sIn').value.trim().split(/[\s;]+/).map(s=>parseFloat(s.replace(',','.'))).filter(x=>!isNaN(x)).sort((a,b)=>a-b);if(!d.length)return;
 const n=d.length,mean=d.reduce((a,b)=>a+b,0)/n,h=Math.floor(n/2),q1=n>1?med(d.slice(0,h)):d[0],q3=n>1?med(d.slice(n-h)):d[0],iq=q3-q1,lo=q1-1.5*iq,hi=q3+1.5*iq;
 const ss=d.reduce((s,x)=>s+(x-mean)**2,0),out=d.filter(x=>x<lo||x>hi),f={};d.forEach(x=>f[x]=(f[x]||0)+1);let cum=0;
 $('sRes').innerHTML+=`<br>Phương sai = ${rd(ss/n)} · Độ lệch chuẩn mẫu (chia n−1) = ${n>1?rd(Math.sqrt(ss/(n-1))):'—'}<br>Giá trị ngoại lệ (ngoài [${rd(lo)}; ${rd(hi)}]): ${out.length?[...new Set(out)].join('; '):'không có'}<br><b>Tần số tích lũy:</b> `+Object.keys(f).map(Number).sort((a,b)=>a-b).map(k=>`≤${k}: ${cum+=f[k]}`).join(' | ')+`<br><i>Nhận xét: ${mean>med(d)+1e-9?'trung bình lớn hơn trung vị, dữ liệu lệch phải':mean<med(d)-1e-9?'trung bình nhỏ hơn trung vị, dữ liệu lệch trái':'dữ liệu khá đối xứng'}.</i>`;
 const cv=$('mbBox'),W=cv.width=760,Ht=cv.height=120,c=cv.getContext('2d'),mn=d[0],mx=d[n-1],sp=(mx-mn)||1,X=v=>40+(v-mn)/sp*(W-80);
 c.clearRect(0,0,W,Ht);c.font='12px Segoe UI';c.fillStyle='#93a0ba';c.fillText('Biểu đồ hộp (box plot)',6,14);
 const inl=d.filter(x=>x>=lo&&x<=hi),wl=inl[0],wh=inl[inl.length-1];c.strokeStyle='#38bdf8';c.lineWidth=2;
 c.beginPath();c.moveTo(X(wl),64);c.lineTo(X(q1),64);c.moveTo(X(q3),64);c.lineTo(X(wh),64);c.moveTo(X(wl),50);c.lineTo(X(wl),78);c.moveTo(X(wh),50);c.lineTo(X(wh),78);c.stroke();
 c.fillStyle='rgba(79,91,240,.45)';c.fillRect(X(q1),44,Math.max(2,X(q3)-X(q1)),40);c.strokeRect(X(q1),44,Math.max(2,X(q3)-X(q1)),40);
 c.strokeStyle='#facc15';c.beginPath();c.moveTo(X(med(d)),44);c.lineTo(X(med(d)),84);c.stroke();
 c.fillStyle='#fb923c';c.beginPath();c.arc(X(mean),64,5,0,7);c.fill();c.fillStyle='#ef4444';out.forEach(x=>{c.beginPath();c.arc(X(x),64,4,0,7);c.fill()});
 c.fillStyle='#e6ebf5';c.textAlign='center';[[mn,'Min'],[q1,'Q1'],[med(d),'Trung vị'],[q3,'Q3'],[mx,'Max']].forEach(([v,l],i)=>{c.fillText(rd(v)+'',X(v),100+(i%2)*14);});c.textAlign='left';c.fillStyle='#fb923c';c.fillText('● trung bình',W-100,14);
});
on('sDemo',()=>{$('sIn').value=Array.from({length:25},()=>Math.min(10,Math.max(3,Math.round(6.8+(Math.random()+Math.random()+Math.random()-1.5)*3)))).join(' ');$('sRun').onclick()});

const PX={coin:['Tung 1 đồng xu',['Sấp','Ngửa'],[.5,.5],()=>ri(0,1)],c2:['Tung 2 đồng xu (số mặt ngửa)',['0','1','2'],[.25,.5,.25],()=>ri(0,1)+ri(0,1)],c3:['Tung 3 đồng xu (số mặt ngửa)',['0','1','2','3'],[.125,.375,.375,.125],()=>ri(0,1)+ri(0,1)+ri(0,1)],
 d6:['Gieo 1 xúc xắc',['1','2','3','4','5','6'],Array(6).fill(1/6),()=>ri(0,5)],d2:['Gieo 2 xúc xắc (tổng)',Array.from({length:11},(_,i)=>String(i+2)),Array.from({length:11},(_,i)=>(6-Math.abs(i-5))/36),()=>ri(1,6)+ri(1,6)-2]};
const pt=$('pType');if(pt){pt.innerHTML=Object.keys(PX).map(k=>`<option value="${k}">${PX[k][0]}</option>`).join('')+'<option value="box">Rút 1 bi từ hộp (đỏ/xanh)</option>';
 HE('pN','afterend','<input type="number" id="pR" value="3" min="1" title="Số bi đỏ" style="width:60px;display:none"><input type="number" id="pB" value="2" min="1" title="Số bi xanh" style="width:60px;display:none">');
 pt.addEventListener('change',()=>{$('pR').style.display=$('pB').style.display=pt.value=='box'?'':'none'})}
const bars=(cv,labs,ser,cols,nm)=>{const W=cv.width=760,Ht=cv.height=300,c=cv.getContext('2d');c.clearRect(0,0,W,Ht);c.font='12px Segoe UI';const mx=Math.max(1e-9,...ser.flat()),L=40,B=Ht-30,Tp=24,w=(W-L-10)/labs.length;c.strokeStyle='#25324d';c.fillStyle='#93a0ba';
 for(let g=0;g<=4;g++){const y=B-(B-Tp)*g/4;c.beginPath();c.moveTo(L,y);c.lineTo(W-10,y);c.stroke();c.fillText((mx*g/4).toFixed(2),2,y+4)}
 labs.forEach((lb,i)=>{const bw=w*.7/ser.length;ser.forEach((s,j)=>{const h=(B-Tp)*s[i]/mx;c.fillStyle=cols[j];c.fillRect(L+i*w+w*.15+j*bw,B-h,bw-2,h)});c.fillStyle='#e6ebf5';c.textAlign='center';c.fillText(lb,L+i*w+w/2,B+16);c.textAlign='left'});
 nm.forEach((s,j)=>{c.fillStyle=['#4f5bf0','#34d399'][j];c.fillRect(L+j*190,4,10,10);c.fillStyle='#e6ebf5';c.fillText(s,L+j*190+14,13)})};
on('pRun',()=>{const t=$('pType').value,N=Math.min(100000,Math.max(1,+$('pN').value||1));let labs,th,g;
 if(t=='box'){const r=Math.max(1,+$('pR').value||1),b=Math.max(1,+$('pB').value||1);labs=['Đỏ','Xanh'];th=[r/(r+b),b/(r+b)];g=()=>Math.random()<th[0]?0:1}else[,labs,th,g]=PX[t];
 const cnt=labs.map(()=>0);for(let i=0;i<N;i++)cnt[g()]++;const fq=cnt.map(c=>c/N),dev=Math.max(...fq.map((x,i)=>Math.abs(x-th[i])));
 $('pRes').innerHTML=`Thực hiện <b>${N}</b> lần. `+labs.map((l,i)=>`${l}: ${cnt[i]} lần (tần suất ${fq[i].toFixed(3)} · lí thuyết ${th[i].toFixed(3)})`).join(' | ')+`<br>Sai lệch lớn nhất: ${dev.toFixed(3)}. Số lần thử càng lớn thì tần suất càng gần xác suất lí thuyết (luật số lớn).`;
 bars($('mbCv'),labs,[fq,th],['#4f5bf0','#34d399'],['Tần suất thực nghiệm','Xác suất lí thuyết'])});

/* ---------- E. Giải phương trình từng bước (nhãn ô nhập, 5 dạng, kiểm nghiệm) ---------- */
const em=$('eMode');
if(em){em.insertAdjacentHTML('beforeend','<option value="4">Bất phương trình ax + b (&gt;, ≥, &lt;, ≤) 0</option><option value="5">Phương trình trùng phương ax⁴ + bx² + c = 0</option><option value="6">Bất phương trình bậc hai ax² + bx + c (&gt;, ≥, &lt;, ≤) 0</option>');
 em.insertAdjacentHTML('afterend','<select id="eOp" style="display:none"><option value=">">&gt;</option><option value=">=">≥</option><option value="<">&lt;</option><option value="<=">≤</option></select>');
 HP('eRun','beforebegin','');$('eRun').parentNode.insertAdjacentHTML('beforebegin','<div id="eHint" class="note" style="font-size:15px;color:var(--cy)"></div>');
 const n6=[3,2,1,4,5,6],NUM={1:2,2:3,3:6,4:2,5:3,6:3},LB={1:'a, b',2:'a, b, c',3:'a₁, b₁, c₁, a₂, b₂, c₂',4:'a, b',5:'a, b, c',6:'a, b, c'};
 const pv=()=>{const m=em.value,v=[1,2,3,4,5,6].map(i=>+$('e'+i).value),sg=(n)=>n<0?' − ':' + ',ab=Math.abs,cf=n=>ab(n)==1?'':ab(n);
  const L1=(a,b)=>`${a==1?'':a==-1?'−':a}x${b?sg(b)+ab(b):''}`,Q=(a,b,c)=>`${a==1?'':a==-1?'−':a}x²${b?sg(b)+cf(b)+'x':''}${c?sg(c)+ab(c):''}`;
  for(let i=1;i<=6;i++){const e=$('e'+i);e.style.display=i<=NUM[m]?'':'none'}$('eOp').style.display=(m=='4'||m=='6')?'':'none';
  $('eHint').innerHTML=`Nhập ${LB[m]} theo thứ tự các ô: &nbsp;<b>`+(m=='1'?L1(v[0],v[1])+' = 0':m=='2'?Q(v[0],v[1],v[2])+' = 0':m=='3'?`${cf(v[0])}x${sg(v[1])}${cf(v[1])}y = ${v[2]} ; ${cf(v[3])}x${sg(v[4])}${cf(v[4])}y = ${v[5]}`:m=='4'?L1(v[0],v[1])+' '+$('eOp').selectedOptions[0].textContent+' 0':m=='6'?Q(v[0],v[1],v[2])+' '+$('eOp').selectedOptions[0].textContent+' 0':Q(v[0],v[1],v[2]).replace('x²','x⁴').replace(/x(?=( [+−]|$))/,'x²')+' = 0')+'</b>'};
 ['eMode','eOp'].forEach(i=>$(i).addEventListener('change',pv));for(let i=1;i<=6;i++)$('e'+i).addEventListener('input',pv);pv()}
on('eRun',()=>{const m=$('eMode').value,v=[1,2,3,4,5,6].map(i=>+$('e'+i).value),o=[],B=s=>`<b>${s}</b>`,mi=s=>String(s).replace(/-/g,'−');
 if(m=='1'){const[a,b]=v;if(a==0)o.push(b==0?'0 = 0 đúng với mọi x ⇒ vô số nghiệm.':`a = 0 và b = ${b} ≠ 0 nên ${b} = 0 vô lí ⇒ vô nghiệm.`);
  else o.push(`Chuyển vế: ${a}x = ${-b}`,`Chia hai vế cho ${a}: x = ${B(mi(fr(-b,a)))}`+(I(-b/a)?'':` ≈ ${mi(rd(-b/a))}`),`Thử lại: ${a}·(${mi(fr(-b,a))}) ${b<0?'−':'+'} ${Math.abs(b)} = 0 ✓`)}
 else if(m=='2'){const[a,b,c]=v;if(a==0)o.push('a = 0: đây không phải phương trình bậc hai (hãy chọn dạng bậc nhất).');
  else{const D=b*b-4*a*c,ints=[a,b,c].every(I),s=Math.sqrt(Math.max(0,D)),ex=ints&&I(s);o.push(`Hệ số: a = ${a}, b = ${b}, c = ${c}`,`Δ = b² − 4ac = (${b})² − 4·${a}·${c} = ${B(rd(D))}`);
   if(D<-1e-9)o.push('Δ < 0 ⇒ phương trình vô nghiệm trên ℝ.');
   else if(Math.abs(D)<1e-9)o.push(`Δ = 0 ⇒ nghiệm kép x₁ = x₂ = −b/2a = ${B(mi(fr(-b,2*a)))}`);
   else{const x1=ex?fr(-b+s,2*a):rd((-b+s)/(2*a)),x2=ex?fr(-b-s,2*a):rd((-b-s)/(2*a));o.push(`Δ > 0 ⇒ hai nghiệm phân biệt (√Δ ${ex?'= '+s:'≈ '+rd(s)}):`,`x₁ = (−b + √Δ)/2a = ${B(mi(x1))}`,`x₂ = (−b − √Δ)/2a = ${B(mi(x2))}`);if(ex){const r1=(-b+s)/(2*a),r2=(-b-s)/(2*a),fx=r=>r==0?'x':`(x ${r>0?'−':'+'} ${Math.abs(rd(r))})`;o.push(`Phân tích: ${a==1?'':a}${fx(r1)}${r1==r2?'':fx(r2)} = 0`.replace(/^(\S*)x(\(|$)/,'$1x$2'))}}
   o.push(`Vi-ét: x₁ + x₂ = −b/a = ${mi(rd(-b/a))} · x₁x₂ = c/a = ${mi(rd(c/a))}`,`Parabol y = ax² + bx + c: bề lõm ${a>0?'lên trên':'xuống dưới'}, đỉnh I(${mi(rd(-b/(2*a)))}; ${mi(rd(-D/(4*a)))}), trục đối xứng x = ${mi(rd(-b/(2*a)))}`)}}
 else if(m=='3'){const[a,b,c,d,e,f]=v,D=a*e-b*d,Dx=c*e-b*f,Dy=a*f-c*d,pa=n=>n<0?`(${n})`:n,eq=(p,q,r)=>`${p==1?'':p==-1?'−':p}x ${q<0?'−':'+'} ${Math.abs(q)==1?'':Math.abs(q)}y = ${r}`;o.push(`(1) ${eq(a,b,c)}`,`(2) ${eq(d,e,f)}`,`D = a₁b₂ − a₂b₁ = ${a}·${pa(e)} − ${pa(d)}·${pa(b)} = ${B(rd(D))}`,`Dx = c₁b₂ − c₂b₁ = ${B(rd(Dx))} · Dy = a₁c₂ − a₂c₁ = ${B(rd(Dy))}`);
  if(D!=0){const x=Dx/D,y=Dy/D;o.push(`Cách cộng đại số: nhân (1) với ${d}, (2) với ${a} rồi trừ vế ⇒ ${rd(D)}y = ${rd(Dy)} ⇒ y = ${mi(fr(Dy,D))}`,`D ≠ 0 ⇒ nghiệm duy nhất: x = Dx/D = ${B(mi(fr(Dx,D)))}, y = Dy/D = ${B(mi(fr(Dy,D)))}`,`Thử lại: (1) ${rd(a*x+b*y)} = ${c} ${Math.abs(a*x+b*y-c)<1e-9?'✓':'✗'} · (2) ${rd(d*x+e*y)} = ${f} ${Math.abs(d*x+e*y-f)<1e-9?'✓':'✗'}`)}
  else if((a==0&&b==0&&c!=0)||(d==0&&e==0&&f!=0))o.push('Một phương trình có dạng 0 = số khác 0 ⇒ hệ vô nghiệm.');
  else if(Dx==0&&Dy==0)o.push('D = Dx = Dy = 0 ⇒ hai phương trình tương đương: hệ có vô số nghiệm.',b!=0?`Nghiệm tổng quát: x tùy ý, y = (${c} ${a<0?'+':'−'} ${Math.abs(a)}x)/${b}`:`Nghiệm tổng quát: x = ${mi(fr(c,a))}, y tùy ý`);
  else o.push('D = 0 nhưng Dx hoặc Dy ≠ 0 ⇒ hệ vô nghiệm (hai đường thẳng song song).')}
 else if(m=='6'){const[a,b,c]=v,op=$('eOp').value,sym=$('eOp').selectedOptions[0].textContent,st=op.length==1,gt=op[0]=='>',iv=(l,r)=>`${st?'(':'['}${l}; ${r}${st?')':']'}`;
  o.push(`Bất phương trình: ${a}x² ${b<0?'−':'+'} ${Math.abs(b)}x ${c<0?'−':'+'} ${Math.abs(c)} ${sym} 0`);
  if(a==0)o.push('a = 0: đây là bất phương trình bậc nhất, hãy chọn dạng "ax + b".');
  else{const D=b*b-4*a*c,z=Math.abs(D)<1e-9,up=(a>0)==gt;o.push(`Δ = b² − 4ac = ${B(rd(D))}`,`Dấu của f(x): cùng dấu với a (${a>0?'dương':'âm'}) ngoài hai nghiệm, trái dấu với a ở giữa hai nghiệm.`);
   if(D<-1e-9)o.push('Δ < 0 ⇒ f(x) luôn cùng dấu với a.',`Tập nghiệm: S = ${B((a>0)==gt?'ℝ':'∅')}`);
   else if(z){const x0=mi(fr(-b,2*a));o.push(`Δ = 0 ⇒ nghiệm kép x₀ = ${x0}; f(x) cùng dấu a, bằng 0 tại x₀.`);
    o.push(`Tập nghiệm: S = ${B(up?(st?`ℝ ∖ {${x0}}`:'ℝ'):(st?'∅':`{${x0}}`))}`)}
   else{const s=Math.sqrt(D),ex=[a,b,c].every(I)&&I(s),n1=-b-s,n2=-b+s,v1=n1/(2*a),v2=n2/(2*a),lo=v1<v2?[n1,v1]:[n2,v2],hi=v1<v2?[n2,v2]:[n1,v1],f=r=>mi(ex?fr(r[0],2*a):rd(r[1])),x1=f(lo),x2=f(hi);
    o.push(`Δ > 0 ⇒ hai nghiệm x₁ = ${x1} < x₂ = ${x2}`,`Tập nghiệm: S = ${B(up?(st?`(−∞; ${x1}) ∪ (${x2}; +∞)`:`(−∞; ${x1}] ∪ [${x2}; +∞)`):iv(x1,x2))}`)}}}
 else if(m=='4'){const[a,b]=v,op=$('eOp').value,sym=$('eOp').selectedOptions[0].textContent,st=op.length==1,gt=op[0]=='>';o.push(`Bất phương trình: ${a}x ${b<0?'−':'+'} ${Math.abs(b)} ${sym} 0`);
  if(a==0){const ok=gt?(st?b>0:b>=0):(st?b<0:b<=0);o.push(ok?'a = 0 và mệnh đề đúng ⇒ nghiệm là mọi x ∈ ℝ.':'a = 0 và mệnh đề sai ⇒ vô nghiệm.')}
  else{const x0=mi(fr(-b,a)),up=(a>0)==gt,fl=a<0;o.push(`Chuyển vế: ${a}x ${sym} ${-b}`,`Chia hai vế cho ${a}${fl?' (số âm nên ĐỔI chiều bất đẳng thức)':''}: x ${up?(st?'>':'≥'):(st?'<':'≤')} ${B(x0)}`,`Tập nghiệm: S = ${up?(st?'('+x0+'; +∞)':'['+x0+'; +∞)'):(st?'(−∞; '+x0+')':'(−∞; '+x0+']')}`)}}
 else{const[a,b,c]=v;o.push(`Đặt t = x² (t ≥ 0): ${a}t² ${b<0?'−':'+'} ${Math.abs(b)}t ${c<0?'−':'+'} ${Math.abs(c)} = 0`);
  if(a==0)o.push('a = 0: không phải phương trình trùng phương.');
  else{const D=b*b-4*a*c;o.push(`Δ = ${rd(D)}`);if(D<0)o.push('Δ < 0 ⇒ vô nghiệm.');else{const ts=[...new Set([(-b+Math.sqrt(D))/(2*a),(-b-Math.sqrt(D))/(2*a)].map(rd))],xs=[];
   ts.forEach(t=>{if(t<0)o.push(`t = ${mi(t)} < 0 ⇒ loại`);else if(t==0){o.push('t = 0 ⇒ x = 0');xs.push(0)}else{o.push(`t = ${t} ⇒ x = ±√${t} = ±${rd(Math.sqrt(t))}`);xs.push(rd(Math.sqrt(t)),-rd(Math.sqrt(t)))}});
   o.push(xs.length?`Nghiệm: x ∈ {${B(xs.sort((p,q)=>p-q).map(mi).join('; '))}}`:'Không có t ≥ 0 ⇒ phương trình vô nghiệm.')}}}
 $('eRes').innerHTML=o.join('<br>').replace(/(^|[\s(=·:{;/>])-(?=\d)/g,'$1−')});

/* ---------- D. Số học: thêm thuật toán Euclid, số ước, tổng ước ---------- */
const oldN=$('nRun')&&$('nRun').onclick;
on('nRun',()=>{oldN&&oldN();const a=Math.floor(+$('nA').value),b=Math.floor(+$('nB').value);if(!(a>0&&b>0&&a<=1e12&&b<=1e12))return;
 const fm=n=>{const f={};let m=n;for(let p=2;p*p<=m;p++)while(m%p===0){f[p]=(f[p]||0)+1;m/=p}if(m>1)f[m]=(f[m]||0)+1;return f},fa=fm(a),fb=fm(b),ps=[...new Set([...Object.keys(fa),...Object.keys(fb)])].map(Number).sort((x,y)=>x-y);
 const tau=f=>Object.values(f).reduce((p,e)=>p*(e+1),1),sig=f=>Object.keys(f).reduce((p,k)=>p*((+k)**(f[k]+1)-1)/(k-1),1),ex=(p,e)=>e==1?p:`${p}<sup>${e}</sup>`;
 let x=Math.max(a,b),y=Math.min(a,b);const st=[];while(y){st.push(`${x} = ${y}·${Math.floor(x/y)} + ${x%y}`);[x,y]=[y,x%y]}
 const gp=ps.filter(p=>fa[p]&&fb[p]).map(p=>ex(p,Math.min(fa[p],fb[p]))).join(' × ')||'1',lp=ps.map(p=>ex(p,Math.max(fa[p]||0,fb[p]||0))).join(' × ');
 $('nRes').innerHTML+=`<hr style="border:0;border-top:1px solid var(--bd)"><b>Thuật toán Euclid:</b> ${st.join(' ; ')} ⇒ ƯCLN = ${x}<br><b>Theo thừa số nguyên tố:</b> ƯCLN = ${gp} (lấy số mũ nhỏ nhất) · BCNN = ${lp} (lấy số mũ lớn nhất)<br>Số ước của ${a}: <b>${tau(fa)}</b>, tổng các ước: <b>${sig(fa)}</b>${sig(fa)==2*a?' (số hoàn hảo)':''} · Số ước của ${b}: <b>${tau(fb)}</b>, tổng các ước: <b>${sig(fb)}</b><br>${x==1?`${a} và ${b} <b>nguyên tố cùng nhau</b>.`:''}${a%b==0?` ${a} chia hết cho ${b}.`:b%a==0?` ${b} chia hết cho ${a}.`:''}`});

/* ---------- F. Tam giác vuông: hình vẽ, giải theo góc, tình huống thực tế ---------- */
if($('rA')){HP('rA','afterend','<label>Góc B (độ) <input type="number" id="rG" style="width:90px" step="any" min="0" max="90"></label>');
 HP('rRun','afterend','<div class="bar"><label>Tình huống thực tế <select id="rS"><option value="">— chọn —</option><option value="1">Thang dựa tường</option><option value="2">Chiều cao cây theo bóng nắng</option><option value="3">Độ dốc đường lên đồi</option></select></label></div><div id="rQ" class="note" style="font-size:14px"></div>');
 HE('rRes','afterend','<svg id="rSvg" viewBox="0 0 320 190" style="width:100%;max-width:440px;background:var(--card2);border:1px solid var(--bd);border-radius:10px;display:none;margin-top:8px"></svg>');
 const SIT={1:['Thang dài 5 m dựa vào tường, chân thang cách tường 3 m. Coi A là chân tường, B là chân thang, C là đầu thang: thang = cạnh huyền a, khoảng cách chân thang đến tường = cạnh c. Tìm độ cao đầu thang (cạnh b) và góc thang tạo với mặt đất (góc B).',{rC:3,rA:5}],
  2:['Bóng của một cây trên mặt đất dài 6 m khi tia nắng tạo với mặt đất góc 40°. Coi bóng = cạnh c (AB), cây = cạnh b (AC), góc B = 40°. Tìm chiều cao cây và độ dài tia nắng (cạnh huyền).',{rC:6,rG:40}],
  3:['Con đường lên đồi dài 100 m, đồi cao 12 m. Coi đường = cạnh huyền a, độ cao = cạnh b. Tìm góc dốc B và quãng đường nằm ngang c.',{rA:100,rB:12}]};
 $('rS').addEventListener('change',()=>{const s=SIT[$('rS').value];['rB','rC','rA','rG'].forEach(i=>$(i).value='');if(!s){$('rQ').textContent='';return}$('rQ').textContent=s[0];for(const k in s[1])$(k).value=s[1][k];$('rRun').onclick()});
 on('rRun',()=>{let b=parseFloat($('rB').value),c=parseFloat($('rC').value),a=parseFloat($('rA').value),g=parseFloat($('rG').value);const pos=x=>!isNaN(x)&&x>0,hs=pos(g)&&g<90,ns=[b,c,a].filter(pos).length,E=$('rRes'),sv=$('rSvg'),rad=Math.PI/180;
  if(!((ns==2&&!hs)||(ns==1&&hs))){E.textContent='Hãy nhập đúng 2 cạnh, hoặc 1 cạnh và góc B (0° < B < 90°).';sv.style.display='none';return}
  if(hs){const s=Math.sin(g*rad),k=Math.cos(g*rad),t=Math.tan(g*rad);if(pos(a)){b=a*s;c=a*k}else if(pos(b)){a=b/s;c=b/t}else{a=c/k;b=c*t}}
  else if(!pos(a)){a=Math.hypot(b,c)}else if(!pos(b)){if(a<=c){E.textContent='Cạnh huyền phải lớn hơn cạnh góc vuông.';sv.style.display='none';return}b=Math.sqrt(a*a-c*c)}else{if(a<=b){E.textContent='Cạnh huyền phải lớn hơn cạnh góc vuông.';sv.style.display='none';return}c=Math.sqrt(a*a-b*b)}
  const h=b*c/a,B=Math.atan2(b,c)/rad;
  E.innerHTML=`<b>Tam giác ABC vuông tại A</b> (AB = c, AC = b, BC = a, AH ⊥ BC)<br>Cạnh: b = <b>${rd(b)}</b>, c = <b>${rd(c)}</b>, a = <b>${rd(a)}</b> (a² = b² + c²)<br>Góc: B ≈ <b>${rd(B)}°</b>, C ≈ <b>${rd(90-B)}°</b><br>Tỉ số lượng giác góc B: sin = b/a = ${rd(b/a)} · cos = c/a = ${rd(c/a)} · tan = b/c = ${rd(b/c)} · cot = c/b = ${rd(c/b)}<br>Đường cao h = bc/a = <b>${rd(h)}</b> (h² = b'·c') · b' = CH = b²/a = <b>${rd(b*b/a)}</b> · c' = BH = c²/a = <b>${rd(c*c/a)}</b><br>Diện tích = bc/2 = <b>${rd(b*c/2)}</b> · Chu vi = ${rd(a+b+c)}<br>Trung tuyến AM = a/2 = ${rd(a/2)} · Bán kính ngoại tiếp R = a/2 = ${rd(a/2)} · Bán kính nội tiếp r = (b + c − a)/2 = ${rd((b+c-a)/2)}`;
  let vb=b,vc=c;const mm=Math.max(b,c),adj=b<.3*mm||c<.3*mm;if(vb<.3*mm)vb=.3*mm;if(vc<.3*mm)vc=.3*mm;const k=Math.min(240/vb,130/vc),A=[78,160],Cc=[78+vb*k,160],Bb=[78,160-vc*k],t=c*c/(a*a),Hh=[Bb[0]+(Cc[0]-Bb[0])*t,Bb[1]+(Cc[1]-Bb[1])*t],tx=(p,x,y,s,col,an)=>`<text x="${x}" y="${y}" text-anchor="${an||'start'}" fill="${col||'#e6ebf5'}" font-size="11" font-weight="700">${s}</text>`;
  sv.style.display='';if(adj)E.innerHTML+='<br><i>Hình vẽ minh họa, không đúng tỉ lệ vì hai cạnh chênh lệch quá lớn.</i>';sv.innerHTML=`<polygon points="${A} ${Bb} ${Cc}" fill="rgba(56,189,248,.12)" stroke="#38bdf8" stroke-width="2"/><line x1="${A[0]}" y1="${A[1]}" x2="${Hh[0]}" y2="${Hh[1]}" stroke="#fb923c" stroke-dasharray="5 4" stroke-width="2"/><polyline points="${A[0]+10},${A[1]} ${A[0]+10},${A[1]-10} ${A[0]},${A[1]-10}" fill="none" stroke="#e6ebf5"/>`+
   tx(0,A[0]-12,A[1]+14,'A')+tx(0,Bb[0]-14,Bb[1]-4,'B')+tx(0,Cc[0]+4,Cc[1]+14,'C')+tx(0,Hh[0]+5,Hh[1]-3,'H','#fb923c')+tx(0,A[0]-6,(A[1]+Bb[1])/2+4,'c='+rd(c),'','end')+tx(0,(A[0]+Cc[0])/2,A[1]+16,'b='+rd(b),'','middle')+tx(0,(Bb[0]+Cc[0])/2+8,(Bb[1]+Cc[1])/2-4,'a='+rd(a))+tx(0,(A[0]+Hh[0])/2,(A[1]+Hh[1])/2-8,'h='+rd(h),'#fb923c','middle')});
}


/* ---------- G. Đếm giờ (chính xác theo đồng hồ, thanh tiến độ, toàn màn hình) & chia nhóm / gọi tên ---------- */
if($('kDisp')){const st=document.createElement('style');st.textContent='#kDisp:fullscreen{background:#0b1220;display:flex;align-items:center;justify-content:center;font-size:28vw!important;margin:0!important}';document.head.appendChild(st);
 HE('kDisp','afterend','<div style="height:8px;background:var(--card2);border-radius:6px;overflow:hidden;margin-bottom:8px"><div id="kBar" style="height:100%;width:100%;background:var(--a1);transition:width .25s linear"></div></div>');
 HP('kMin','afterend','<div class="bar">'+[1,3,5,10,15,45].map(m=>`<button class="sec sm kp" data-m="${m}" type="button">${m} phút</button>`).join('')+'<button class="ghost sm" id="kFs" type="button">⛶ Toàn màn hình</button></div>');
 let end=0,tid=null,tot=300000,left=300000;
 const disp=ms=>{const s=Math.ceil(ms/1000);$('kDisp').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');$('kDisp').style.color=s<=10&&tid?'#ef4444':'';$('kBar').style.width=Math.max(0,100*ms/tot)+'%'};
 const beep=n=>{try{const x=new(window.AudioContext||window.webkitAudioContext)();for(let i=0;i<n;i++){const o=x.createOscillator();o.connect(x.destination);o.frequency.value=880;o.start(x.currentTime+i*.6);o.stop(x.currentTime+i*.6+.35)}setTimeout(()=>x.close(),n*600+500)}catch(e){}};
 const setT=m=>{clearInterval(tid);tid=null;m=Math.max(1,Math.min(180,m||1));tot=left=m*60000;$('kMin').value=m;disp(left)};
 const tick=()=>{left=end-Date.now();if(left<=0){left=0;clearInterval(tid);tid=null;disp(0);beep(3);return}disp(left)};
 $('kGo').onclick=()=>{if(tid){clearInterval(tid);tid=null;left=end-Date.now();return}if(left<=0)setT(+$('kMin').value);end=Date.now()+left;tid=setInterval(tick,250);tick()};
 $('kReset').onclick=()=>setT(+$('kMin').value);$('kMin').onchange=$('kReset').onclick;
 document.querySelectorAll('.kp').forEach(b=>b.onclick=()=>setT(+b.dataset.m));
 on('kFs',()=>{const e=$('kDisp');e.requestFullscreen&&e.requestFullscreen()});
 HP('kN','afterend','<label>hoặc mỗi nhóm <input type="number" id="kPer" value="0" min="0" style="width:60px"> người</label><label class="qchip"><input type="checkbox" id="kLead" checked> Nhóm trưởng</label>');
 $('kSplit').parentNode.insertAdjacentHTML('beforeend','<button class="sec sm" id="kCopy" type="button">📋 Sao chép</button><button class="orange sm" id="kPick" type="button">🎯 Gọi 1 tên</button>');
 const nm=()=>$('kNames').value.split('\n').map(s=>s.trim()).filter(Boolean);let last='',pool=[],sig='';
 on('kSplit',()=>{const n=shuffle(nm()),per=Math.max(0,+$('kPer').value||0),k=per>0?Math.min(40,Math.ceil(n.length/per)):Math.max(1,Math.min(20,+$('kN').value||1));
  if(!n.length){$('kRes').textContent='Chưa có danh sách.';return}
  const g=Array.from({length:k},()=>[]);n.forEach((x,i)=>g[i%k].push(x));
  last=g.map((m,i)=>`Nhóm ${i+1} (${m.length}): `+m.map((x,j)=>j==0&&$('kLead').checked?x+' (nhóm trưởng)':x).join(', ')).join('\n');
  $('kRes').innerHTML=g.map((m,i)=>`<b>Nhóm ${i+1}</b> (${m.length}): `+m.map((x,j)=>j==0&&$('kLead').checked?`<b>⭐ ${x}</b>`:x).join(', ')).join('<br>')});
 on('kCopy',()=>{if(!last)return;try{navigator.clipboard.writeText(last)}catch(e){const t=document.createElement('textarea');t.value=last;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}});
 on('kPick',()=>{const n=nm();if(!n.length){$('kRes').textContent='Chưa có danh sách.';return}const s=n.join('|');if(s!=sig||!pool.length){sig=s;pool=shuffle(n)}const x=pool.pop();$('kRes').innerHTML=`<div style="font-size:34px;font-weight:700;text-align:center;color:var(--cy)">🎯 ${x}</div><div style="text-align:center">Còn ${pool.length} bạn chưa được gọi (không gọi lặp cho đến khi hết lượt)</div>`})}

/* ---------- v3: công cụ dành cho giáo viên ---------- */
const dl=(n,t,m)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m||'application/json'}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
const cp=t=>{try{navigator.clipboard.writeText(t)}catch(e){const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();document.execCommand('copy');x.remove()}};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const LV=['Nhận biết','Thông hiểu','Vận dụng'],ST=document.createElement('style');
ST.textContent='body.tbig #t5,body.tbig #t8{font-size:120%}body.tbig #t5 input,body.tbig #t5 select,body.tbig #t5 textarea,body.tbig #t5 button,body.tbig #t8 input,body.tbig #t8 select,body.tbig #t8 textarea,body.tbig #t8 button{font-size:inherit}#t5 table.jt{border-collapse:collapse;width:100%;font-size:13px}#t5 table.jt th,#t5 table.jt td{border:1px solid var(--bd);padding:4px 8px;text-align:center}#t5 table.jt th{background:#1a2640;color:var(--cy)}#t5 table.jt td:first-child{text-align:left}';document.head.appendChild(ST);

/* Ngân hàng câu hỏi + ma trận đề */
const BK='tc_bank_v1',bl=()=>{try{return JSON.parse(localStorage.getItem(BK)||'[]')}catch(e){return[]}},bs=a=>{try{localStorage.setItem(BK,JSON.stringify(a))}catch(e){}};
HE('qOut','beforebegin',`<details id="qMxD" style="margin:8px 0"><summary class="note" style="cursor:pointer">🧩 Ma trận đề: số câu theo chủ đề và mức độ (nếu nhập số, công cụ tạo đề theo ma trận thay cho các ô chọn phía trên)</summary>
<div style="overflow:auto"><table class="jt"><tr><th>Chủ đề</th>${LV.map(l=>`<th>${l}</th>`).join('')}</tr>${names.map((n,i)=>`<tr><td>${n}</td>${[1,2,3].map(l=>`<td><input type="number" class="mx" data-t="${i}" data-l="${l}" min="0" max="20" value="0" style="width:56px"></td>`).join('')}</tr>`).join('')}</table></div>
<div class="bar"><button class="sec sm" id="mxClr" type="button">Xóa ma trận</button></div></details>
<details id="qBkD" style="margin:8px 0"><summary class="note" style="cursor:pointer">📚 Ngân hàng câu hỏi của tôi (<span id="bN">0</span> câu, lưu trên máy này)</summary>
<textarea id="bQ" style="min-height:70px" placeholder="Nội dung câu hỏi (công thức viết dạng $...$)"></textarea>
<div class="bar"><input type="text" id="bA" placeholder="Đáp án" style="width:220px"><select id="bT">${names.map(n=>`<option>${n}</option>`).join('')}<option>Khác</option></select><select id="bL"><option value="1">Nhận biết</option><option value="2">Thông hiểu</option><option value="3">Vận dụng</option></select><button class="sm" id="bAdd" type="button">＋ Thêm</button></div>
<div class="bar"><label>Chèn thêm <input type="number" id="qBn" value="0" min="0" max="30" style="width:60px"> câu ngẫu nhiên từ ngân hàng vào đề</label><button class="sec sm" id="bExp" type="button">⬇ Xuất JSON</button><button class="sec sm" id="bImp" type="button">⬆ Nhập JSON</button><button class="sec sm" id="bClr" type="button">🗑 Xóa hết</button><input type="file" id="bFile" accept=".json" style="display:none"></div></details>`);
const bn=()=>{$('bN').textContent=bl().length};bn();
on('mxClr',()=>document.querySelectorAll('.mx').forEach(i=>i.value=0));
on('bAdd',()=>{const q=$('bQ').value.trim();if(!q)return;const a=bl();a.push({q,a:$('bA').value.trim(),t:$('bT').value,l:+$('bL').value});bs(a);$('bQ').value='';$('bA').value='';bn()});
on('bExp',()=>dl('ngan-hang-cau-hoi.json',JSON.stringify(bl(),null,1)));on('bImp',()=>$('bFile').click());
$('bFile').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(Array.isArray(j)){bs(bl().concat(j.filter(x=>x&&x.q)));bn()}}catch(x){alert('File JSON không hợp lệ.')}e.target.value=''};
on('bClr',()=>{if(confirm('Xóa toàn bộ ngân hàng câu hỏi?')){bs([]);bn()}});

const PAD=['Không xác định được','Cả ba đáp án còn lại đều sai','Không có đáp án nào đúng'];
function emit(plan,bank,m,tn,sol){let i=1,out=`ĐỀ SỐ ${m}\n\n`;const ans=[];
 const add=t=>{out+=`Câu ${i}. ${t.q}\n`;
  if(tn&&t.w){const wr=[...new Set(t.w.map(String))].filter(x=>x!==t.a).slice(0,3);while(wr.length<3)wr.push(PAD[wr.length]);const op=shuffle([t.a,...wr]);op.forEach((o,j)=>out+=`${'ABCD'[j]}. ${o}\n`);out+='\n';ans.push(`Câu ${i}: ${'ABCD'[op.indexOf(t.a)]}`+(sol&&t.s?` (${t.s})`:''))}
  else{out+='\n';ans.push(`Câu ${i}: ${t.a}`+(sol&&t.s?`\n   Lời giải: ${t.s}`:''))}i++};
 plan.forEach(([s,L])=>add(T[s][1](L)));bank.forEach(b=>add({q:b.q,a:b.a||'(chưa nhập)',s:''}));
 return out+`ĐÁP ÁN ĐỀ SỐ ${m}\n${ans.join('\n')}\n\n`}
on('qGen',()=>{
 const mx=[...document.querySelectorAll('.mx')].map(i=>({t:+i.dataset.t,l:+i.dataset.l,n:+i.value||0})).filter(x=>x.n>0),useMx=mx.length>0,n=+$('qN').value||1,v=+$('qV').value||1,L=+$('qL').value,tn=$('qF').value=='tn',sol=$('qS').checked,nb=Math.max(0,+$('qBn').value||0);
 let plan=[];
 if(useMx)mx.forEach(x=>{for(let k=0;k<x.n;k++)plan.push([x.t,x.l])});
 else{const sel=[...document.querySelectorAll('.qt:checked')].map(c=>+c.value);sel.forEach(s=>{for(let k=0;k<n;k++)plan.push([s,L])})}
 if(!plan.length&&!nb){$('qOut').value='Hãy chọn ít nhất một dạng bài (hoặc nhập ma trận đề).';return}
 let out='';for(let m=1;m<=v;m++)out+=emit(plan,shuffle(bl()).slice(0,nb),m,tn,sol)+(m<v?'--------------------\n\n':'');
 if(useMx){const tot=[0,0,0,0],rows=names.map((nm,i)=>{const r=[1,2,3].map(l=>(mx.find(x=>x.t==i&&x.l==l)||{n:0}).n),s=r[0]+r[1]+r[2];if(!s)return'';r.forEach((c,j)=>tot[j]+=c);tot[3]+=s;return`${nm}: ${r.join(' | ')} | tổng ${s}`}).filter(Boolean);
  out+=`MA TRẬN ĐỀ (Nhận biết | Thông hiểu | Vận dụng)\n${rows.join('\n')}\nTổng: ${tot.slice(0,3).join(' | ')} | ${tot[3]} câu — tỉ lệ ${tot.slice(0,3).map(x=>Math.round(100*x/tot[3])+'%').join(' / ')}\n`}
 $('qOut').value=out});
HP('qSend','afterend','<button class="orange sm" id="qDoc" type="button">📄 Tải đề + đáp án (.docx)</button>');
on('qDoc',()=>{const t=$('qOut').value;if(!t)return;$('input').value=t;const f=$('fmt');if(f)f.value='docx';document.querySelector('[data-tab=t1]').click();setTimeout(()=>$('btnExport').click(),150)});

/* Phổ điểm: phân loại giỏi/khá/đạt/chưa đạt */
const o3=$('sRun').onclick;$('sRun').onclick=()=>{o3();
 const d=$('sIn').value.trim().split(/[\s;]+/).map(s=>parseFloat(s.replace(',','.'))).filter(x=>!isNaN(x));if(!d.length||d.some(x=>x<0||x>10))return;
 const c=[d.filter(x=>x>=8).length,d.filter(x=>x>=6.5&&x<8).length,d.filter(x=>x>=5&&x<6.5).length,d.filter(x=>x<5).length],p=x=>Math.round(1000*x/d.length)/10;
 $('sRes').innerHTML+=`<br><b>Xếp loại theo điểm:</b> Giỏi (≥8) ${c[0]} (${p(c[0])}%) · Khá (6,5–<8) ${c[1]} (${p(c[1])}%) · Đạt (5–<6,5) ${c[2]} (${p(c[2])}%) · Chưa đạt (<5) ${c[3]} (${p(c[3])}%)<br>Tỉ lệ từ trung bình trở lên: ${p(d.length-c[3])}%`+(c[3]?` · <b>Cần quan tâm: ${c[3]} học sinh dưới 5 điểm</b>`:'')};

/* Chia nhóm theo năng lực (xen kẽ giỏi – yếu) */
HP('kLead','afterend','<label class="qchip"><input type="checkbox" id="kMix"> Ghép theo năng lực (mỗi dòng: Tên, điểm)</label>');
const o4=$('kSplit').onclick;$('kSplit').onclick=()=>{if(!$('kMix').checked)return o4();
 const a=$('kNames').value.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>{const m=s.match(/^(.*?)[,;\t]\s*(\d+(?:[.,]\d+)?)$/);return m?{n:m[1].trim(),s:parseFloat(m[2].replace(',','.'))}:{n:s,s:0}}).sort((x,y)=>y.s-x.s);
 if(!a.length){$('kRes').textContent='Chưa có danh sách.';return}
 const per=+$('kPer').value||0,k=per>0?Math.ceil(a.length/per):Math.max(1,Math.min(20,+$('kN').value||1)),g=Array.from({length:k},()=>[]);
 a.forEach((x,i)=>{const r=Math.floor(i/k);g[r%2?k-1-i%k:i%k].push(x)});
 $('kRes').innerHTML=g.map((m,i)=>`<b>Nhóm ${i+1}</b> (${m.length} · TB ${rd(m.reduce((s,x)=>s+x.s,0)/m.length)}): `+m.map((x,j)=>(j==0&&$('kLead').checked?`<b>⭐ ${esc(x.n)}</b>`:esc(x.n))+` (${x.s})`).join(', ')).join('<br>')+'<br><i>Mỗi nhóm có đủ học sinh giỏi, khá và yếu để giúp nhau.</i>'};
$('kCopy').onclick=()=>cp($('kRes').innerText);



/* Sao lưu / khôi phục dữ liệu, chữ lớn khi chiếu */
$('mSel').parentNode.insertAdjacentHTML('beforeend','<button class="sec sm" id="tBak" type="button" title="Lưu toàn bộ dữ liệu (bảng điểm, ngân hàng câu hỏi...) ra file">💾 Sao lưu</button><button class="sec sm" id="tRes" type="button">📂 Khôi phục</button><button class="ghost sm" id="tBig" type="button">🔠 Chữ lớn</button><input type="file" id="tFile" accept=".json" style="display:none">');
on('tBak',()=>{const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/gemini_key/.test(k))continue;o[k]=localStorage.getItem(k)}}catch(e){}dl('sao-luu-tro-giang-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(o))});
on('tRes',()=>$('tFile').click());
$('tFile').onchange=async e=>{try{const o=JSON.parse(await e.target.files[0].text());if(confirm('Khôi phục '+Object.keys(o).length+' mục dữ liệu? Dữ liệu cùng tên trên máy sẽ bị ghi đè.')){Object.keys(o).filter(k=>!/gemini_key/.test(k)).forEach(k=>localStorage.setItem(k,o[k]));location.reload()}}catch(x){alert('File sao lưu không hợp lệ.')}e.target.value=''};
on('tBig',()=>document.body.classList.toggle('tbig'));

})();

/* ===== v4: chữ to rõ · số thập phân kiểu Việt · biểu đồ rõ nét · sửa lỗi chính xác ===== */
(function(){
const $=id=>document.getElementById(id),ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),rd=x=>Math.round(x*1e4)/1e4;
const RES='#sRes,#pRes,#nRes,#eRes,#rRes,#xRes';
const st=document.createElement('style');
st.textContent=`
#t5 .mt{font-size:17px}
#t5 input[type=number],#t5 input[type=text],#t5 select{font-size:17px!important;min-height:46px;padding:6px 10px;box-sizing:border-box}
#t5 textarea{font-size:17px!important;line-height:1.6}
#t5 button{font-size:16px!important;min-height:46px;padding:8px 14px}
#t5 label{font-size:16px}
#t5 .bar{gap:10px;align-items:center}
#t5 :is(${RES}){font-size:17px!important;line-height:1.85!important;padding:12px 14px;margin-top:10px;background:var(--card2);border:1px solid var(--bd);border-left:4px solid var(--cy);border-radius:10px;color:#e6ebf5;overflow-wrap:anywhere}
#t5 :is(${RES}):empty{display:none}
#t5 .note{font-size:15px;line-height:1.6}
body.tbig #t5 .mt,body.tbig #t5 :is(${RES}){font-size:22px!important}
body.tbig #t5 input,body.tbig #t5 select,body.tbig #t5 textarea,body.tbig #t5 button,body.tbig #t5 label{font-size:21px!important}
body.tbig #t5 input[type=number]{width:110px!important}`;
document.head.appendChild(st);

/* Số thập phân: 1.5 → 1,5 (chỉ ở kết quả hiển thị); hình suy biến thay vì NaN */
const vn=el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),L=[];let n;while(n=w.nextNode())L.push(n);
 L.forEach(t=>{const s=t.nodeValue.replace(/(\d)\.(\d)/g,'$1,$2');if(s!==t.nodeValue)t.nodeValue=s})};
RES.split(',').forEach(s=>{const el=$(s.slice(1));if(!el)return;
 new MutationObserver(()=>{vn(el)}).observe(el,{childList:true,subtree:true,characterData:true})});

/* Biểu đồ cột lớn, chữ rõ, có số trên cột */
const chart=(cv,labs,ser,cols,names)=>{const W=cv.width=760,H=cv.height=420,c=cv.getContext('2d'),fm=x=>(x<=1?x.toFixed(2):String(Math.round(x))).replace('.',',');
 c.clearRect(0,0,W,H);const mx=Math.max(1e-9,...ser.flat())*1.1,L=62,B=H-50,T=60,w=(W-L-12)/labs.length;
 c.font='20px sans-serif';c.strokeStyle='#25324d';c.fillStyle='#b6c2da';
 for(let g=0;g<=4;g++){const y=B-(B-T)*g/4;c.beginPath();c.moveTo(L,y);c.lineTo(W-8,y);c.stroke();c.fillText(fm(mx*g/4),4,y+7)}
 const bw=w*.8/ser.length,lab=labs.length<=8||ser.length==1&&labs.length<=14;
 labs.forEach((lb,i)=>{ser.forEach((s,j)=>{const h=(B-T)*s[i]/mx,x=L+i*w+w*.1+j*bw;c.fillStyle=cols[j];c.fillRect(x,B-h,bw-3,h);
   if(lab){c.fillStyle='#fff';c.font='bold 17px sans-serif';c.textAlign='center';c.fillText(fm(s[i]),x+bw/2,B-h-6);c.textAlign='left'}});
  c.font='20px sans-serif';c.fillStyle='#e6ebf5';c.textAlign='center';c.fillText(lb,L+i*w+w/2,B+28);c.textAlign='left'});
 let x=L;names.forEach((s,j)=>{c.fillStyle=cols[j];c.fillRect(x,12,16,16);c.fillStyle='#e6ebf5';c.font='20px sans-serif';c.fillText(s,x+22,27);x+=c.measureText(s).width+60})};

/* Xác suất: viết lại, vẽ biểu đồ lớn */
const lb=(a,b)=>Array.from({length:b-a+1},(_,i)=>String(a+i));
const PX={coin:[['Sấp','Ngửa'],[.5,.5],()=>ri(0,1)],c2:[lb(0,2),[.25,.5,.25],()=>ri(0,1)+ri(0,1)],c3:[lb(0,3),[.125,.375,.375,.125],()=>ri(0,1)+ri(0,1)+ri(0,1)],
 d6:[lb(1,6),Array(6).fill(1/6),()=>ri(0,5)],d2:[lb(2,12),lb(2,12).map(s=>(6-Math.abs(s-7))/36),()=>ri(1,6)+ri(1,6)-2]};
$('pRun').onclick=()=>{const t=$('pType').value,N=Math.min(100000,Math.max(1,Math.floor(+$('pN').value)||1));let labs,th,g;
 if(t=='box'){const r=Math.max(1,Math.floor(+$('pR').value)||1),b=Math.max(1,Math.floor(+$('pB').value)||1);labs=['Đỏ','Xanh'];th=[r/(r+b),b/(r+b)];g=()=>Math.random()<th[0]?0:1}else[labs,th,g]=PX[t];
 const cnt=labs.map(()=>0);for(let i=0;i<N;i++)cnt[g()]++;const fq=cnt.map(c=>c/N),dev=Math.max(...fq.map((x,i)=>Math.abs(x-th[i])));
 $('pRes').innerHTML=`Thực hiện <b>${N}</b> lần.<br>`+labs.map((l,i)=>`<b>${l}</b>: ${cnt[i]} lần · tần suất ${fq[i].toFixed(3)} · lí thuyết ${th[i].toFixed(3)}`).join('<br>')+`<br>Sai lệch lớn nhất: <b>${dev.toFixed(3)}</b>. Số lần thử càng lớn, tần suất càng gần xác suất lí thuyết (luật số lớn).`;
 chart($('mbCv'),labs,[fq,th],['#4f5bf0','#34d399'],['Thực nghiệm','Lí thuyết'])};

/* Thống kê: biểu đồ lớn, hộp lớn, sửa "mốt" khi mọi giá trị xuất hiện 1 lần */
const med=a=>{const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const s0=$('sRun').onclick;
$('sRun').onclick=()=>{s0();const d=$('sIn').value.trim().split(/[\s;]+/).map(s=>parseFloat(s.replace(',','.'))).filter(x=>!isNaN(x)).sort((a,b)=>a-b);if(!d.length)return;
 const n=d.length,f={};d.forEach(x=>f[x]=(f[x]||0)+1);const keys=Object.keys(f).map(Number).sort((a,b)=>a-b);
 if(n>1&&keys.length==n)$('sRes').innerHTML=$('sRes').innerHTML.replace(/Mốt = [^<]*/,'Mốt = không có (mọi giá trị chỉ xuất hiện 1 lần)');
 chart($('mbCv'),keys.map(String),[keys.map(k=>f[k])],['#4f5bf0'],['Tần số']);
 const cv=$('mbBox');if(!cv)return;const W=cv.width=760,Ht=cv.height=190,c=cv.getContext('2d'),mean=d.reduce((a,b)=>a+b,0)/n,h=Math.floor(n/2),q1=n>1?med(d.slice(0,h)):d[0],q3=n>1?med(d.slice(n-h)):d[0],iq=q3-q1,lo=q1-1.5*iq,hi=q3+1.5*iq,mn=d[0],mx=d[n-1],sp=(mx-mn)||1,X=v=>50+(v-mn)/sp*(W-100),m=med(d),out=d.filter(x=>x<lo||x>hi),inl=d.filter(x=>x>=lo&&x<=hi),wl=inl[0],wh=inl[inl.length-1],fm=v=>String(rd(v)).replace('.',',');
 c.clearRect(0,0,W,Ht);c.font='20px sans-serif';c.fillStyle='#b6c2da';c.fillText('Biểu đồ hộp',6,22);c.fillStyle='#fb923c';c.fillText('● trung bình',W-150,22);
 c.strokeStyle='#38bdf8';c.lineWidth=3;c.beginPath();c.moveTo(X(wl),84);c.lineTo(X(q1),84);c.moveTo(X(q3),84);c.lineTo(X(wh),84);c.moveTo(X(wl),64);c.lineTo(X(wl),104);c.moveTo(X(wh),64);c.lineTo(X(wh),104);c.stroke();
 c.fillStyle='rgba(79,91,240,.5)';c.fillRect(X(q1),54,Math.max(3,X(q3)-X(q1)),60);c.strokeRect(X(q1),54,Math.max(3,X(q3)-X(q1)),60);
 c.strokeStyle='#facc15';c.beginPath();c.moveTo(X(m),54);c.lineTo(X(m),114);c.stroke();
 c.fillStyle='#fb923c';c.beginPath();c.arc(X(mean),84,7,0,7);c.fill();c.fillStyle='#ef4444';out.forEach(x=>{c.beginPath();c.arc(X(x),84,6,0,7);c.fill()});
 c.fillStyle='#e6ebf5';c.textAlign='center';[[mn,'Min'],[q1,'Q1'],[m,'TV'],[q3,'Q3'],[mx,'Max']].forEach(([v,l],i)=>c.fillText(fm(v),X(v),140+(i%2)*26));c.textAlign='left'};

/* Giải hệ: sửa mô tả phép cộng đại số cho đúng dấu */
const e0=$('eRun').onclick;
$('eRun').onclick=()=>{e0();$('eRes').innerHTML=$('eRes').innerHTML.replace(/nhân \(1\) với ([^,]+), \(2\) với ([^ ]+) rồi trừ vế/,'nhân (1) với $1, (2) với $2 rồi lấy (2)×$2 − (1)×$1 (vế theo vế)')};

/* Chữ lớn: ghi nhớ lựa chọn */
try{if(localStorage.getItem('tc_big')==='1')document.body.classList.add('tbig')}catch(e){}
const tb=$('tBig');if(tb){const sync=()=>{tb.textContent=document.body.classList.contains('tbig')?'🔠 Chữ lớn ✓':'🔠 Chữ lớn'};sync();
 tb.addEventListener('click',()=>{try{localStorage.setItem('tc_big',document.body.classList.contains('tbig')?'1':'0')}catch(e){}sync()})}
})();


/* ===== v5: Đồ thị — hàm mẫu bấm nhanh + bảng giá trị ===== */
(function(){
const $=id=>document.getElementById(id),fl=$('fList');if(!fl||!$('gres'))return;
const st=document.createElement('style');st.textContent='#t5 #fList input{flex:1;min-width:0}#t5 .chipb{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}#t5 .chipb button{min-height:42px;padding:6px 12px}#t5 table.vt{border-collapse:collapse;width:100%;font-size:17px}#t5 table.vt th,#t5 table.vt td{border:1px solid var(--bd);padding:6px 8px;text-align:center}#t5 table.vt th{background:#1a2640;color:var(--cy)}#t5 #vOut{overflow:auto;max-height:420px}body.tbig #t5 table.vt{font-size:22px}';document.head.appendChild(st);
const PRE=[['x²','x^2'],['x³','x^3'],['√x','sqrt(x)'],['1/x','1/x'],['|x|','abs(x)'],['sin x','sin(x)'],['cos x','cos(x)'],['tan x','tan(x)'],['2ˣ','2^x'],['ln x','ln(x)'],['(x+1)/(x−1)','(x+1)/(x-1)']];
fl.insertAdjacentHTML('afterend','<div class="chipb" id="fPre"><span class="note" style="width:100%;margin:0">Bấm để thêm hàm mẫu:</span>'+PRE.map(([l,f])=>`<button class="sec sm" type="button" data-f="${f}">${l}</button>`).join('')+'</div>');
$('fPre').addEventListener('click',e=>{const f=e.target.dataset&&e.target.dataset.f;if(!f)return;
 let ins=[...fl.querySelectorAll('input')],last=ins[ins.length-1];if(last&&last.value.trim()){if(ins.length>=6){$('fErr').textContent='Tối đa 6 hàm cùng lúc.';return}$('fAdd').click();ins=[...fl.querySelectorAll('input')];last=ins[ins.length-1]}
 last.value=f;last.dispatchEvent(new Event('input'))});
$('gres').insertAdjacentHTML('afterend',`<div style="margin-top:14px"><b>📋 Bảng giá trị hàm số</b><div class="bar"><label>x từ <input type="number" id="vA" value="-3" step="any" style="width:90px"></label><label>đến <input type="number" id="vB" value="3" step="any" style="width:90px"></label><label>bước <input type="number" id="vS" value="1" step="any" min="0.0001" style="width:90px"></label><button class="sm" id="vGo" type="button">Lập bảng</button></div><div id="vOut"></div></div>`);
$('vGo').onclick=()=>{const T=window._graphTest,o=$('vOut'),a=+$('vA').value,b=+$('vB').value,s=+$('vS').value;
 if(!T){o.textContent='Chưa tải được công cụ vẽ đồ thị.';return}
 if(!(s>0)||b<a){o.textContent='Hãy nhập x từ ≤ đến và bước > 0.';return}
 if((b-a)/s>200){o.textContent='Tối đa 200 dòng — hãy tăng bước hoặc thu hẹp khoảng.';return}
 const F=[];try{[...fl.querySelectorAll('input')].forEach(i=>{if(i.value.trim()){const f=T.compile(i.value);if(f)F.push([i.value.trim(),f])}})}catch(e){o.textContent='Có hàm chưa đúng cú pháp: '+(e.message||'').slice(0,80);return}
 if(!F.length){o.textContent='Chưa có hàm nào để lập bảng.';return}
 const fm=v=>!isFinite(v)?'không xác định':String(Math.round(v*1e6)/1e6).replace('.',',').replace('-','−'),n=Math.floor((b-a)/s+1e-9),R=[];
 for(let i=0;i<=n;i++){const x=Math.round((a+i*s)*1e9)/1e9;R.push(`<tr><td><b>${fm(x)}</b></td>${F.map(([,f])=>`<td>${fm(f(x))}</td>`).join('')}</tr>`)}
 o.innerHTML=`<table class="vt"><tr><th>x</th>${F.map(([s])=>`<th>y = ${s.replace(/[<>&]/g,'')}</th>`).join('')}</tr>${R.join('')}</table>`};
})();

/* ===== v6: Xuất đề + đáp án ra Word chuẩn (mỗi mã đề 1 file đề + 1 file đáp án, nén .zip) ===== */
(function(){
const $=id=>document.getElementById(id),b=$('qDoc');if(!b||!$('qOut'))return;
b.textContent='📄 Xuất Word: đề + đáp án (.zip)';
$('qOut').insertAdjacentHTML('beforebegin',`<details id="qWd" style="margin:8px 0"><summary class="note" style="cursor:pointer">⚙️ Tùy chọn file Word (tiêu đề, thời gian, phông chữ)</summary><div class="bar"><label>Tiêu đề <input type="text" id="qTitle" value="ĐỀ KIỂM TRA" style="width:210px"></label><label>Thời gian (phút) <input type="number" id="qTime" value="45" min="0" style="width:80px"></label><label>Phông <input type="text" id="qFont" value="Times New Roman" style="width:170px"></label><label>Cỡ <input type="number" id="qSz" value="13" min="8" max="24" style="width:70px"></label></div></details>`);
$('qOut').insertAdjacentHTML('afterend','<div id="qMsg" class="note" style="font-size:15px"></div>');
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',kids=n=>[...n.childNodes].filter(c=>c.nodeType==1);
const AFTER=['w:highlight','w:u','w:effect','w:bdr','w:shd','w:fitText','w:vertAlign','w:rtl','w:cs','w:em','w:lang','w:eastAsianLayout','w:specVanish'];
function setSz(doc,pr,tag,val){let e=kids(pr).find(c=>c.nodeName==tag);if(!e){e=doc.createElementNS(W,tag);const r=kids(pr).find(c=>AFTER.includes(c.nodeName));r?pr.insertBefore(e,r):pr.appendChild(e)}e.setAttributeNS(W,'w:val',val)}
async function fmtDocx(bytes,o){if(typeof JSZip=='undefined')return bytes;
 const z=await JSZip.loadAsync(bytes),f=z.file('word/document.xml');if(!f)return bytes;
 const doc=new DOMParser().parseFromString(await f.async('string'),'application/xml'),body=doc.getElementsByTagName('w:body')[0];if(!body)return bytes;
 let sp=[...doc.getElementsByTagName('w:sectPr')].pop();if(!sp){sp=doc.createElementNS(W,'w:sectPr');body.appendChild(sp)}
 const c=v=>String(Math.round(v*567)),mk=(t,at)=>{let e=kids(sp).find(x=>x.nodeName==t);if(!e){e=doc.createElementNS(W,t);t=='w:pgSz'?sp.insertBefore(e,sp.firstChild):sp.appendChild(e)}for(const k in at)e.setAttributeNS(W,'w:'+k,at[k])};
 mk('w:pgSz',{w:'11906',h:'16838'});mk('w:pgMar',{top:c(2),bottom:c(2),left:c(3),right:c(1.5),header:'708',footer:'708',gutter:'0'});
 const sz=String(Math.round(o.sz*2));
 [...body.getElementsByTagName('w:r')].forEach(r=>{let pr=kids(r).find(x=>x.nodeName=='w:rPr');if(!pr){pr=doc.createElementNS(W,'w:rPr');r.insertBefore(pr,r.firstChild)}
  let ft=kids(pr).find(x=>x.nodeName=='w:rFonts');if(!ft){ft=doc.createElementNS(W,'w:rFonts');pr.insertBefore(ft,pr.firstChild)}
  ['ascii','hAnsi','cs','eastAsia'].forEach(a=>ft.setAttributeNS(W,'w:'+a,o.font));['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>ft.removeAttributeNS(W,a));
  if(!kids(pr).some(x=>x.nodeName=='w:sz')){setSz(doc,pr,'w:sz',sz);setSz(doc,pr,'w:szCs',sz)}});
 [...body.getElementsByTagName('w:p')].forEach(p=>{let pr=kids(p).find(x=>x.nodeName=='w:pPr');if(!pr){pr=doc.createElementNS(W,'w:pPr');p.insertBefore(pr,p.firstChild)}
  if(!kids(pr).some(x=>x.nodeName=='w:spacing')){const s=doc.createElementNS(W,'w:spacing');s.setAttributeNS(W,'w:line','276');s.setAttributeNS(W,'w:lineRule','auto');s.setAttributeNS(W,'w:after','60');
   const nx=kids(pr).find(x=>['w:ind','w:contextualSpacing','w:jc','w:rPr'].includes(x.nodeName));nx?pr.insertBefore(s,nx):pr.appendChild(s)}});
 let xml=new XMLSerializer().serializeToString(doc);if(!xml.startsWith('<?xml'))xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+xml;
 z.file('word/document.xml',xml);return await z.generateAsync({type:'uint8array',compression:'DEFLATE'})}
b.onclick=async()=>{const M=$('qMsg'),T=$('qOut').value;if(!T.trim()){M.textContent='Hãy bấm "Tạo đề" trước.';return}
 if(typeof itemToDocxBytes!='function'||typeof makeZip!='function'){M.textContent='Chưa nạp được bộ xuất Word (word-ui.js / word-zip-pdf.js).';return}
 const o={font:$('qFont').value.trim()||'Times New Roman',sz:+$('qSz').value||13},title=$('qTitle').value.trim()||'ĐỀ KIỂM TRA',tm=Math.max(0,Math.floor(+$('qTime').value||0));
 const mx=(T.match(/^MA TRẬN ĐỀ[\s\S]*$/m)||[''])[0].trim(),body=mx?T.slice(0,T.indexOf(mx)):T,parts=body.split(/^ĐỀ SỐ (\d+)[ \t]*$/m),files=[];
 const head=c=>`${title.toUpperCase()}\n${tm?`Thời gian làm bài: ${tm} phút (không kể thời gian phát đề)\n`:''}Mã đề: ${c}\nHọ và tên: ................................................  Lớp: ..........\n\n`;
 const mkDoc=async t=>fmtDocx(await itemToDocxBytes({kind:'txt',text:t.replace(/\n{3,}/g,'\n\n').trim()+'\n'}),o);
 try{
  if(parts.length<3)files.push({name:'de-thi.docx',data:await mkDoc(head(101)+body)});
  else for(let i=1;i<parts.length;i+=2){const n=+parts[i],txt=parts[i+1],k=txt.search(/^ĐÁP ÁN ĐỀ SỐ \d+[ \t]*$/m),qs=k<0?txt:txt.slice(0,k),an=k<0?'':txt.slice(k).replace(/^ĐÁP ÁN ĐỀ SỐ \d+[ \t]*\n?/,'').replace(/\n?-{5,}\s*$/,'').trim(),code=100+n,id=String(n).padStart(2,'0');
   files.push({name:`De_${id}.docx`,data:await mkDoc(head(code)+qs)});
   if(an)files.push({name:`DapAn_${id}.docx`,data:await mkDoc(`ĐÁP ÁN – ${title.toUpperCase()}\nMã đề: ${code}\n\n${an}`)})}
  if(mx)files.push({name:'Ma_tran_de.docx',data:await mkDoc(mx)});
  const dl=typeof downloadBlob=='function'?downloadBlob:(d,n,m)=>saveBlob(new Blob([d],{type:m}),n);
  if(files.length==1)await dl(files[0].data,files[0].name,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  else await dl(await makeZip(files),'de-thi-toan.zip','application/zip');
  M.innerHTML=`Đã xuất <b>${files.length}</b> file Word (A4, lề 2/2/3/1,5 cm, ${o.font} cỡ ${o.sz})${files.length>1?' trong de-thi-toan.zip':''}. Hãy mở kiểm tra công thức trước khi in.`
 }catch(e){M.textContent='Lỗi khi xuất: '+e.message}};
})();
