/* Công cụ Word: Ma trận & Bản đặc tả đề kiểm tra */




/* ===== Công cụ Word: Ma trận & Bản đặc tả đề kiểm tra (theo Phụ lục CV 7991/BGDĐT-GDTrH) – phân tích bằng Gemini ===== */
(function(){
const $=id=>document.getElementById(id);
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AK='ph_gemini_key_s',TY=['NLC','DS','TLN','TL'],LV=['B','H','VD'],TYN={NLC:'Nhiều lựa chọn',DS:'Đúng – Sai',TLN:'Trả lời ngắn',TL:'Tự luận'},LVN={B:'Biết',H:'Hiểu',VD:'Vận dụng'};
const gkey=()=>GKEY.get();
const gmodel=()=>{let m='';try{m=localStorage.getItem('ph_model_v1')||''}catch(e){}return /^gemini-[\w.\-]+$/.test(m)?m:'gemini-3.8-flash'};
const num=x=>{const n=parseFloat(String(x).replace(',','.'));return isFinite(n)?n:0};
const fm=n=>{n=Math.round(n*100)/100;return(Math.abs(n*10-Math.round(n*10))<1e-9?n.toFixed(1):n.toFixed(2)).replace('.',',')};
const pc=n=>String(Math.round(n*10)/10).replace('.',',');

/* ---------- Giao diện ---------- */
const sel=$('wtSel');if(!sel)return;
sel.insertAdjacentHTML('beforeend','<option value="wtMx">🧾 Ma trận &amp; đặc tả đề kiểm tra (AI)</option>');
sel.parentNode.parentNode.insertAdjacentHTML('beforeend',`<div class="wtool" id="wtMx">
<div class="bar"><input type="file" id="mxFile" accept=".docx,.txt" style="display:none"><button class="ghost" id="mxPick" type="button">📁 Chọn đề thi (.docx / .txt)</button><span class="note" id="mxName" style="margin:0"></span></div>
<textarea id="mxText" style="min-height:110px" placeholder="Hoặc dán nội dung đề thi vào đây (cần có đủ các câu hỏi; nên có thang điểm nếu đề ghi sẵn)"></textarea>
<div class="bar"><label>Môn <input type="text" id="mxMon" placeholder="AI tự nhận" style="width:130px"></label><label>Lớp <input type="text" id="mxLop" placeholder="AI tự nhận" style="width:80px"></label><label>Tên đề / học kì <input type="text" id="mxTen" placeholder="VD: Giữa học kì I, năm học 2025–2026" style="width:280px"></label><label>Thời gian <input type="text" id="mxTg" placeholder="90 phút" style="width:90px"></label></div>
<div class="bar"><b>Điểm từng dạng:</b><label>Nhiều lựa chọn <input type="text" id="mxS1" style="width:56px"></label><label>Đúng – Sai <input type="text" id="mxS2" style="width:56px"></label><label>Trả lời ngắn <input type="text" id="mxS3" style="width:56px"></label><label>Tự luận <input type="text" id="mxS4" style="width:56px"></label><span class="note" style="margin:0">Để trống: lấy theo đề (hoặc mặc định 3 – 2 – 2 – 3; nếu đề không có Trả lời ngắn thì chuyển điểm sang Đúng – Sai).</span></div>
<div class="bar" id="mxKeyBar"><label>Khóa Gemini API <input type="password" id="mxKey" placeholder="Dán khóa (chỉ lưu trong phiên làm việc này)" style="width:300px" autocomplete="off"></label><button class="sec sm" id="mxKeySave" type="button">Lưu khóa</button><span class="note" id="mxKeyNote" style="margin:0"></span></div>
<div class="bar"><button class="green" id="mxGo" type="button">🧾 Tạo ma trận &amp; đặc tả</button><button class="orange" id="mxDl" type="button" disabled>⬇ Tải file Word (.docx)</button></div>
<div id="mxSt" class="status"></div><div id="mxOut"></div>
<div class="note">Quy trình: AI phân tích đề → rà soát lần 1 (đối chiếu từng câu) → rà soát lần 2 (kiểm tra nhất quán) → chương trình tự tính lại toàn bộ số câu, điểm, tỉ lệ % rồi mới dựng file Word khổ A4 ngang theo đúng mẫu Phụ lục 1 và 2 của Công văn 7991. Nội dung đề thi được gửi tới Google Gemini để phân tích; không đưa đề chưa công bố nếu chưa được phép. Mỗi câu Đúng – Sai tính theo 4 ý (mỗi ý bằng 1/4 điểm của câu). Hãy mở file Word đọc lại trước khi sử dụng chính thức.</div></div>`);
const keyUI=()=>{const k=gkey();$('mxKeyBar').querySelector('label').style.display='none';$('mxKeySave').style.display='none';$('mxKeyNote').textContent=k?'✓ Đã có khóa Gemini (dùng chung toàn trang).':'Chưa có khóa Gemini — hãy nhập ở ô “API key Gemini” phía đầu trang (chỉ một lần).'};
keyUI();window.addEventListener('ph-key',keyUI);
$('mxKeySave').onclick=()=>{const v=$('mxKey').value.trim();if(!v)return;GKEY.set(v);$('mxKey').value='';keyUI()};
$('mxPick').onclick=()=>$('mxFile').click();

/* ---------- Đọc đề ---------- */
async function readExam(f){
 if(/\.txt$/i.test(f.name))return await f.text();
 const z=await unzipAll(await f.arrayBuffer()),d=z.find(e=>e.name==='word/document.xml');if(!d)throw new Error('File không phải .docx hợp lệ.');
 const x=new DOMParser().parseFromString(new TextDecoder().decode(d.data),'application/xml');if(x.getElementsByTagName('parsererror').length)throw new Error('Không đọc được nội dung file Word.');
 const out=[];[...x.getElementsByTagName('*')].filter(n=>n.localName==='p'&&n.namespaceURI===WNS).forEach(p=>{let t='';[...p.getElementsByTagName('*')].forEach(n=>{if(n.localName==='t')t+=n.textContent;else if(n.localName==='tab'||n.localName==='br')t+=' '});t=t.replace(/\s+/g,' ').trim();if(t)out.push(t)});
 return out.join('\n')}
$('mxFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{$('mxText').value=await readExam(f);$('mxName').textContent='Đã đọc: '+f.name+' ('+$('mxText').value.length+' ký tự)'}catch(x){$('mxSt').className='status err';$('mxSt').textContent=x.message}e.target.value=''};

/* ---------- Gọi Gemini ---------- */
const SYS='Bạn là chuyên gia khảo thí phổ thông Việt Nam, thành thạo Công văn 7991/BGDĐT-GDTrH (ma trận và bản đặc tả đề kiểm tra định kì, đề có 4 dạng: Nhiều lựa chọn, Đúng – Sai, Trả lời ngắn, Tự luận; 3 mức Biết, Hiểu, Vận dụng). Chỉ dựa vào nội dung đề được cung cấp, không bịa thêm câu hỏi. Chỉ trả về một đối tượng JSON hợp lệ, không kèm giải thích ngoài JSON.';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function gem(prompt){
 const key=gkey();if(!key){GKEY.open();throw new Error('Chưa có khóa Gemini API. Hãy nhập ở ô “API key Gemini” phía đầu trang (chỉ cần nhập một lần).');}
 const body=JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],systemInstruction:{parts:[{text:SYS}]},generationConfig:{maxOutputTokens:32768,temperature:0.2,responseMimeType:'application/json'}});
 const url='https://generativelanguage.googleapis.com/v1beta/models/'+gmodel()+':generateContent';let res,data;
 for(let a=0;a<3;a++){
  try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body})}catch(e){throw new Error('Không kết nối được tới Gemini. Kiểm tra mạng (hoặc VPN/tường lửa chặn googleapis.com).')}
  if(res.status===429||res.status>=500){await wait(2500*(a+1));continue}break}
 if(!res.ok){let m='';try{m=(await res.json()).error.message}catch(e){}throw new Error(res.status===400||res.status===403?'Gemini từ chối yêu cầu (khóa API không hợp lệ hoặc chưa được phép dùng mô hình). '+m:'Gemini báo lỗi '+res.status+'. '+m)}
 data=await res.json();const t=((data.candidates||[])[0]||{}).content;const txt=t&&t.parts?t.parts.map(p=>p.text||'').join(''):'';if(!txt)throw new Error('Gemini không trả kết quả (có thể đề bị chặn bởi bộ lọc). Hãy thử lại.');
 return parseJ(txt)}
function parseJ(t){t=t.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');try{return JSON.parse(t)}catch(e){const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a)try{return JSON.parse(t.slice(a,b+1))}catch(x){}}throw new Error('Kết quả AI không đúng định dạng JSON.')}
const SCHEMA=`{"mon":"","lop":"","tenDe":"","thoiGian":"","thangDiem":{"NLC":null,"DS":null,"TLN":null,"TL":null},"cauHoi":[{"so":"1","phan":"NLC|DS|TLN|TL","chuDe":"","noiDung":"","mucDo":"B|H|VD","mucDoY":["B","H","H","VD"],"yeuCau":"","diem":0}],"ghiChu":[]}`;
const RULES=`Quy ước:
- "phan": NLC = trắc nghiệm nhiều lựa chọn (A, B, C, D, chọn 1 đáp án); DS = câu Đúng – Sai gồm 4 ý a), b), c), d); TLN = trả lời ngắn (điền kết quả); TL = tự luận. Mỗi câu hoặc mỗi ý tự luận được chấm điểm riêng thì tách thành mục riêng (so = "17a", "17b"...).
- "so": số thứ tự câu đúng như trong đề. Phải liệt kê ĐỦ mọi câu, không bỏ sót, không trùng.
- "chuDe": tên chương/chủ đề; "noiDung": đơn vị kiến thức. Các câu cùng nội dung phải dùng đúng cùng một cách viết để gộp cùng hàng.
- "mucDo": B = Biết, H = Hiểu, VD = Vận dụng (gộp cả vận dụng cao). Riêng DS bắt buộc có "mucDoY" gồm đúng 4 phần tử cho 4 ý.
- "yeuCau": một câu yêu cầu cần đạt bắt đầu bằng động từ (VD: "Nhận biết được...", "Tính được...", "Vận dụng được... để giải quyết bài toán thực tiễn ...").
- "diem": điểm của mục ghi trong đề (với DS là điểm cả câu); nếu đề không ghi điểm thì để 0. "thangDiem": tổng điểm từng dạng nếu đề nêu rõ, ngược lại null.
- "mon","lop","tenDe","thoiGian": lấy từ đề, không rõ thì "".`;
const mxLog=[];
const st=(m,c)=>{const e=$('mxSt');e.className='status'+(c?' '+c:'');e.innerHTML=m};

/* ---------- Chuẩn hóa dữ liệu AI ---------- */
const lv=s=>{s=String(s||'').toLowerCase().replace(/\s+/g,'');return/^(b|nb|biết|nhậnbiết)$/.test(s)?'B':/^(h|th|hiểu|thônghiểu)$/.test(s)?'H':/^(vd|vdc|vậndụng|vậndụngcao)$/.test(s)?'VD':''};
const ph=s=>{s=String(s||'').toUpperCase().replace(/[^A-Z]/g,'');return TY.includes(s)?s:s==='TNKQ'||s==='MCQ'||s==='TRACNGHIEM'?'NLC':s==='TF'||s==='DUNGSAI'?'DS':s==='SHORT'?'TLN':s==='ESSAY'||s==='TULUAN'?'TL':''};
function norm(j){
 const issues=[],items=[];
 (Array.isArray(j.cauHoi)?j.cauHoi:[]).forEach((c,i)=>{
  const p=ph(c.phan),m=lv(c.mucDo)||'H';if(!p){issues.push(`Mục ${c.so||i+1}: không xác định được dạng câu hỏi nên bị bỏ qua.`);return}
  let y=null;if(p==='DS'){y=(Array.isArray(c.mucDoY)?c.mucDoY:[]).map(lv).map(x=>x||m);if(y.length!==4){issues.push(`Câu ${c.so}: Đúng – Sai không đủ 4 ý, đã tự điền theo mức độ chung.`);while(y.length<4)y.push(m);y=y.slice(0,4)}}
  items.push({so:String(c.so==null?i+1:c.so).trim(),p,m:p==='DS'?y[0]:m,y,cd:String(c.chuDe||'Chủ đề').trim()||'Chủ đề',nd:String(c.noiDung||c.chuDe||'').trim()||'Nội dung',yc:String(c.yeuCau||'').trim(),d:Math.max(0,num(c.diem))})});
 return{items,issues,meta:{mon:j.mon||'',lop:j.lop||'',ten:j.tenDe||'',tg:j.thoiGian||'',td:j.thangDiem||{},gc:Array.isArray(j.ghiChu)?j.ghiChu.map(String):[]}}}

/* ---------- Tính toán chính xác bằng code ---------- */
function compute(items,td,ov){
 const cnt={};TY.forEach(t=>cnt[t]=items.filter(i=>i.p===t).length);const pres=TY.filter(t=>cnt[t]>0);
 let tp={};
 const def={NLC:3,DS:cnt.TLN?2:4,TLN:cnt.TLN?2:0,TL:3},ds=pres.reduce((s,t)=>s+def[t],0);
 const sumd=t=>items.filter(i=>i.p===t).reduce((s,i)=>s+i.d,0),aiSum=pres.reduce((s,t)=>s+sumd(t),0),tdSum=pres.reduce((s,t)=>s+num(td[t]),0);
 pres.forEach(t=>{tp[t]=ov[t]>0?ov[t]:Math.abs(tdSum-10)<.01&&num(td[t])>0?num(td[t]):Math.abs(aiSum-10)<.01&&sumd(t)>0?sumd(t):def[t]*10/ds});
 const ovSum=pres.reduce((s,t)=>s+tp[t],0);if(Math.abs(ovSum-10)>.01&&pres.some(t=>ov[t]>0)){const o=pres.filter(t=>!(ov[t]>0)),fixed=pres.filter(t=>ov[t]>0).reduce((s,t)=>s+tp[t],0),rest=o.reduce((s,t)=>s+tp[t],0);if(o.length&&rest>0&&fixed<10)o.forEach(t=>tp[t]=tp[t]*(10-fixed)/rest)}
 items.forEach(i=>{const arr=items.filter(x=>x.p===i.p),w=arr.reduce((s,x)=>s+(x.d>0?x.d:0),0),ws=w>0&&arr.every(x=>x.d>0);i.pts=tp[i.p]*(ws?i.d/w:1/arr.length)});
 const rows=[],gi=new Map();let order=[];
 items.forEach(i=>{const k=i.cd+'\u0001'+i.nd;if(!gi.has(k)){const r={cd:i.cd,nd:i.nd,c:{},ids:{},pt:{B:0,H:0,VD:0},yc:{B:[],H:[],VD:[]}};TY.forEach(t=>{r.c[t]={B:0,H:0,VD:0};r.ids[t]={B:[],H:[],VD:[]}});gi.set(k,r);rows.push(r)}
  const r=gi.get(k);if(i.p==='DS'){i.y.forEach(l=>{r.c.DS[l]++;r.pt[l]+=i.pts/4;if(!r.ids.DS[l].includes(i.so))r.ids.DS[l].push(i.so)})}else{r.c[i.p][i.m]++;r.pt[i.m]+=i.pts;r.ids[i.p][i.m].push(i.so)}
  const ls=i.p==='DS'?[...new Set(i.y)]:[i.m];ls.forEach(l=>{if(i.yc&&!r.yc[l].includes(i.yc))r.yc[l].push(i.yc)})});
 /* nhóm theo chủ đề, giữ thứ tự xuất hiện */
 const cds=[];rows.forEach(r=>{let g=cds.find(x=>x.cd===r.cd);if(!g){g={cd:r.cd,rows:[]};cds.push(g)}g.rows.push(r)});
 const flat=[];cds.forEach((g,gi2)=>g.rows.forEach((r,ri)=>{r.tt=ri===0?String(gi2+1):'';r.first=ri===0;r.span=g.rows.length;flat.push(r)}));
 const col={},colP={};TY.forEach(t=>{col[t]={B:0,H:0,VD:0};colP[t]={B:0,H:0,VD:0}});
 const lp={B:0,H:0,VD:0},lc={B:0,H:0,VD:0},tpt={};TY.forEach(t=>tpt[t]=0);
 items.forEach(i=>{if(i.p==='DS')i.y.forEach(l=>{col.DS[l]++;colP.DS[l]+=i.pts/4;lp[l]+=i.pts/4;lc[l]++;tpt.DS+=i.pts/4});else{col[i.p][i.m]++;colP[i.p][i.m]+=i.pts;lp[i.m]+=i.pts;lc[i.m]++;tpt[i.p]+=i.pts}});
 const total=TY.reduce((s,t)=>s+tpt[t],0);flat.forEach(r=>{r.sum=LV.reduce((s,l)=>s+r.pt[l],0)});
 return{rows:flat,col,colP,lp,lc,tpt,total,cnt,tp}}

/* ---------- Dựng file Word ---------- */
const xe=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const FN='<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>';
const rn=(t,sz,b,i)=>`<w:r><w:rPr>${FN}${b?'<w:b/>':''}${i?'<w:i/>':''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
const pa=(t,o={})=>`<w:p><w:pPr>${o.keep?'<w:keepNext/>':''}<w:spacing w:before="${o.sb||0}" w:after="${o.sa||0}" w:line="${o.ln||240}" w:lineRule="auto"/><w:jc w:val="${o.al||'left'}"/></w:pPr>${t===''?'':rn(t,o.sz||22,o.b,o.i)}</w:p>`;
const BD=(n)=>`<w:${n} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
function tc(w,lines,o={}){if(!Array.isArray(lines))lines=[lines];const ps=lines.map(l=>typeof l==='object'?pa(l.t,{al:l.al||o.al||'center',sz:l.sz||o.sz||18,b:l.b!=null?l.b:o.b,i:l.i}):pa(l,{al:o.al||'center',sz:o.sz||18,b:o.b})).join('');
 return`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.span>1?`<w:gridSpan w:val="${o.span}"/>`:''}${o.vm?`<w:vMerge${o.vm==='r'?' w:val="restart"':''}/>`:''}${o.fill?`<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>`:''}<w:tcMar><w:top w:w="30" w:type="dxa"/><w:left w:w="50" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="50" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${ps}</w:tc>`}
const tr=(cells,hdr)=>`<w:tr><w:trPr><w:cantSplit/>${hdr?'<w:tblHeader/>':''}</w:trPr>${cells.join('')}</w:tr>`;
const tbl=(widths,rows)=>`<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(BD).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="50" w:type="dxa"/><w:right w:w="50" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
const GH='D9D9D9',GF='F2F2F2';
function buildDoc(R,meta){
 const idsTxt=a=>a.length&&a.length<=3?'('+a.join(', ')+')':'';
 const cell=(w,n,ids,o)=>tc(w,n?[{t:String(n),b:true,sz:18}].concat(idsTxt(ids)?[{t:idsTxt(ids),sz:13}]:[]):'',o||{});
 const H=(w,t,o)=>tc(w,t,Object.assign({fill:GH,b:true},o||{}));
 /* Đầu bảng 4 hàng; fixed = các cột cố định đầu bảng; total = có nhóm "Tổng" + cột tỉ lệ */
 function hdr(fixed,fw,cw,top,total){
  const fx=(m)=>fixed.map((t,i)=>m?H(fw[i],t,{vm:'r'}):H(fw[i],'',{vm:'c'})),r=[];
  r.push(tr(fx(1).concat([H(cw*12,top,{span:12})],total?[H(cw*3,'Tổng',{span:3,vm:'r'}),H(760,'Tỉ lệ % điểm',{vm:'r',sz:16})]:[]),1));
  r.push(tr(fx(0).concat([H(cw*9,'TNKQ',{span:9}),H(cw*3,'Tự luận',{span:3,vm:'r'})],total?[H(cw*3,'',{span:3,vm:'c'}),H(760,'',{vm:'c'})]:[]),1));
  r.push(tr(fx(0).concat(['Nhiều lựa chọn','Đúng – Sai','Trả lời ngắn'].map(t=>H(cw*3,t,{span:3})),[H(cw*3,'',{span:3,vm:'c'})],total?[H(cw*3,'',{span:3,vm:'c'}),H(760,'',{vm:'c'})]:[]),1));
  const lv3=()=>['Biết','Hiểu','Vận dụng'].map(l=>H(cw,l,{sz:16}));
  r.push(tr(fx(0).concat(lv3(),lv3(),lv3(),lv3(),total?lv3().concat([H(760,'',{vm:'c'})]):[]),1));
  return r}
 const KN=x=>x.replace(/<w:pPr>/g,'<w:pPr><w:keepNext/>');
 const out=[];
 const meta1=[meta.mon&&('MÔN: '+meta.mon.toUpperCase()),meta.lop&&('LỚP: '+meta.lop),meta.ten,meta.tg&&('Thời gian làm bài: '+meta.tg)].filter(Boolean).join(' – ');
 {const cw=700,fw=[420,1500,1900],W=fw.concat(Array(15).fill(cw),[760]);
  const body=R.rows.map(r=>{const cs=[tc(420,r.first?r.tt:'',{vm:r.first?'r':'c'}),tc(1500,r.first?r.cd:'',{vm:r.first?'r':'c',al:'left'}),tc(1900,r.nd,{al:'left'})];
   TY.forEach(t=>LV.forEach(l=>cs.push(cell(cw,r.c[t][l],r.ids[t][l]))));
   LV.forEach(l=>cs.push(cell(cw,TY.reduce((s,t)=>s+r.c[t][l],0),[])));cs.push(tc(760,pc(r.sum*10),{b:true}));return tr(cs)});
  const lab=t=>tc(3820,t,{span:3,b:true,fill:GF,al:'left'}),G=(w,t,o)=>tc(w,t,Object.assign({b:true,fill:GF},o||{}));
  const f1=tr([lab('Tổng số câu')].concat(...TY.map(t=>LV.map(l=>G(cw,R.col[t][l]||''))),LV.map(l=>G(cw,R.lc[l]||'')),[G(760,'')]));
  const f2=tr([lab('Tổng số điểm')].concat(TY.map(t=>G(cw*3,fm(R.tpt[t]),{span:3})),LV.map(l=>G(cw,fm(R.lp[l]))),[G(760,fm(R.total))]));
  const f3=tr([lab('Tỉ lệ %')].concat(TY.map(t=>G(cw*3,pc(R.tpt[t]*10),{span:3})),LV.map(l=>G(cw,pc(R.lp[l]*10))),[G(760,pc(R.total*10))]));
  out.push(pa('1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ',{al:'center',b:true,sz:26,sa:60}),pa(meta1,{al:'center',sz:22,sa:120}),tbl(W,hdr(['TT','Chủ đề/Chương','Nội dung/đơn vị kiến thức'],fw,cw,'Mức độ đánh giá',true).concat(body.slice(0,-1),[KN(body[body.length-1]),KN(f1),KN(f2),f3])),
   pa('Ghi chú: ô trong bảng là số câu hỏi (dạng Đúng – Sai tính theo số ý, mỗi câu 4 ý), kèm số thứ tự câu khi có tối đa 3 câu. Tổng điểm toàn đề: '+fm(R.total)+'.',{i:true,sz:18,sb:80}))}
 out.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
 {const cw=640,fw=[420,1400,1700,4200],W=fw.concat(Array(12).fill(cw));
  const body=R.rows.map(r=>{const yc=[];LV.forEach(l=>r.yc[l].forEach(t=>yc.push({t:'- '+LVN[l]+': '+t,al:'left',sz:17})));
   const cs=[tc(420,r.first?r.tt:'',{vm:r.first?'r':'c'}),tc(1400,r.first?r.cd:'',{vm:r.first?'r':'c',al:'left'}),tc(1700,r.nd,{al:'left'}),tc(4200,yc.length?yc:'',{al:'left'})];
   TY.forEach(t=>LV.forEach(l=>cs.push(cell(cw,r.c[t][l],r.ids[t][l]))));return tr(cs)});
  const lab=t=>tc(7720,t,{span:4,b:true,fill:GF,al:'left'}),G=(w,t,o)=>tc(w,t,Object.assign({b:true,fill:GF},o||{}));
  const f1=tr([lab('Tổng số câu')].concat(...TY.map(t=>LV.map(l=>G(cw,R.col[t][l]||'')))));
  const f2=tr([lab('Tổng số điểm')].concat(TY.map(t=>G(cw*3,fm(R.tpt[t]),{span:3}))));
  const f3=tr([lab('Tỉ lệ %')].concat(TY.map(t=>G(cw*3,pc(R.tpt[t]*10),{span:3}))));
  const gc=(meta.gc||[]).filter(Boolean);
  out.push(pa('2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ',{al:'center',b:true,sz:26,sa:60}),pa(meta1,{al:'center',sz:22,sa:120}),tbl(W,hdr(['TT','Chủ đề/Chương','Nội dung/đơn vị kiến thức','Yêu cầu cần đạt'],fw,cw,'Số câu hỏi ở các mức độ đánh giá',false).concat(body.slice(0,-1),[KN(body[body.length-1]),KN(f1),KN(f2),f3])),
   pa('Ghi chú: mỗi câu Đúng – Sai gồm 4 ý, mỗi ý thí sinh chọn đúng hoặc sai; số câu ở dạng này tính theo số ý.'+(gc.length?' '+gc.join(' '):''),{i:true,sz:18,sb:80}))}
 return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+out.join('')+'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="700" w:right="700" w:bottom="700" w:left="700" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>'}

/* ---------- Quy trình chính ---------- */
let lastDoc=null;
$('mxGo').onclick=async()=>{
 const text=$('mxText').value.trim();if(text.length<30){st('Hãy chọn file đề thi hoặc dán nội dung đề (chưa đủ nội dung để phân tích).','err');return}
 $('mxGo').disabled=true;$('mxDl').disabled=true;$('mxOut').innerHTML='';lastDoc=null;const logs=[];
 try{
  const ex=text.length>120000?text.slice(0,120000):text;
  st('⏳ Bước 1/3: AI đang phân tích đề thi…');
  let j=await gem(`Hãy phân tích đề kiểm tra dưới đây và xây dựng dữ liệu để lập ma trận và bản đặc tả.\n${RULES}\n\nĐịnh dạng JSON bắt buộc:\n${SCHEMA}\n\n===== ĐỀ THI =====\n${ex}`);
  let N=norm(j);if(!N.items.length)throw new Error('AI không nhận ra câu hỏi nào trong đề. Hãy kiểm tra lại nội dung đề.');
  logs.push(`Phân tích: nhận diện ${N.items.length} mục câu hỏi.`);
  for(let k=1;k<=2;k++){
   st(`⏳ Bước ${k+1}/3: AI rà soát lần ${k}…`);
   const foc=k===1?'ĐỐI CHIẾU TỪNG CÂU với đề gốc: đúng số câu, đúng dạng (NLC/DS/TLN/TL), đúng chương/nội dung, mức độ Biết–Hiểu–Vận dụng hợp lí, DS đủ 4 ý với mức độ từng ý, điểm đúng như đề ghi, không thiếu/trùng câu, yêu cầu cần đạt chính xác và không chung chung.':'KIỂM TRA TÍNH NHẤT QUÁN VÀ ĐẦY ĐỦ lần cuối: gộp tên chủ đề/nội dung viết khác nhau của cùng một nội dung, số câu liên tục từ câu đầu đến câu cuối, tổng điểm các câu khớp thang điểm của đề (toàn đề 10 điểm), mức độ không lệch so với yêu cầu cần đạt, văn phong yêu cầu cần đạt chuẩn mực. Soát cả chính tả tiếng Việt.';
   try{const j2=await gem(`Đây là lượt RÀ SOÁT LẦN ${k}. Nhiệm vụ: ${foc}\nSửa mọi sai sót, giữ nguyên những gì đã đúng. Trả về JSON đầy đủ cùng định dạng, thêm khóa "daSua" là mảng câu ngắn mô tả từng chỗ đã sửa (mảng rỗng nếu không sửa gì).\n${RULES}\n\nĐịnh dạng JSON:\n${SCHEMA}\n\n===== ĐỀ THI =====\n${ex}\n\n===== DỮ LIỆU CẦN RÀ SOÁT =====\n${JSON.stringify(j)}`);
    const N2=norm(j2);if(N2.items.length>=Math.max(1,N.items.length*.8)){const da=Array.isArray(j2.daSua)?j2.daSua.filter(Boolean):[];logs.push(`Rà soát lần ${k}: ${da.length?'đã sửa '+da.length+' chỗ — '+da.slice(0,6).map(String).join('; '):'không phát hiện sai sót.'}`);j=j2;N=N2}else logs.push(`Rà soát lần ${k}: kết quả bất thường (thiếu câu) nên giữ nguyên bản trước.`)}
   catch(e){if(/khóa|Chưa có khóa|kết nối/.test(e.message))throw e;logs.push(`Rà soát lần ${k}: lỗi (${e.message}), giữ nguyên bản trước.`)}}
  /* kiểm tra bằng code */
  st('⏳ Đang tính lại số câu, điểm, tỉ lệ % và dựng file Word…');
  const issues=N.issues.slice(),meta=N.meta,ov={};TY.forEach((t,i)=>ov[t]=num($('mxS'+(i+1)).value));
  const ids=N.items.map(i=>i.p+i.so),dup=ids.filter((x,i)=>ids.indexOf(x)!==i);if(dup.length)issues.push('Có câu bị trùng số: '+[...new Set(dup)].join(', '));
  const mains=[...new Set(N.items.map(i=>parseInt(i.so)).filter(n=>n>0))].sort((a,b)=>a-b),miss=[];for(let n=mains[0];n<=mains[mains.length-1];n++)if(!mains.includes(n))miss.push(n);if(miss.length)issues.push('Số câu không liên tục, kiểm tra các câu: '+miss.join(', '));
  const R=compute(N.items,meta.td||{},ov);if(Math.abs(R.total-10)>.01)issues.push('Tổng điểm tính được là '+fm(R.total)+' (khác 10). Hãy nhập điểm từng dạng ở trên rồi tạo lại.');
  if(R.rows.length===0)throw new Error('Không có dữ liệu để lập ma trận.');
  const m2={mon:$('mxMon').value.trim()||meta.mon,lop:$('mxLop').value.trim()||meta.lop,ten:$('mxTen').value.trim()||meta.ten,tg:$('mxTg').value.trim()||meta.tg,gc:meta.gc};
  const bytes=makeZip([{name:'[Content_Types].xml',data:strToBytes(TXT_CONTENT_TYPES)},{name:'_rels/.rels',data:strToBytes(TXT_ROOT_RELS)},{name:'word/_rels/document.xml.rels',data:strToBytes(TXT_DOC_RELS)},{name:'word/document.xml',data:strToBytes(buildDoc(R,m2))}]);
  lastDoc={bytes,name:'Ma-tran-va-dac-ta-de-kiem-tra.docx'};
  /* xem trước */
  const cnt=t=>R.col[t].B+R.col[t].H+R.col[t].VD;
  $('mxOut').innerHTML=`<p><b>Kết quả:</b> ${R.rows.length} hàng nội dung · ${N.items.length} mục câu hỏi (NLC: ${cnt('NLC')}, Đúng–Sai: ${cnt('DS')} ý, Trả lời ngắn: ${cnt('TLN')}, Tự luận: ${cnt('TL')}) · Tổng điểm <b>${fm(R.total)}</b> · Tỉ lệ Biết/Hiểu/Vận dụng = ${LV.map(l=>pc(R.lp[l]*10)).join(' / ')} %</p>`+
   `<div style="overflow:auto"><table class="g" style="min-width:0"><thead><tr><th>TT</th><th>Chủ đề</th><th>Nội dung</th><th>NLC</th><th>Đ–S (ý)</th><th>TLN</th><th>TL</th><th>Điểm</th><th>%</th></tr></thead><tbody>${R.rows.map(r=>`<tr><td>${r.tt}</td><td style="text-align:left">${r.first?E(r.cd):''}</td><td style="text-align:left">${E(r.nd)}</td>${TY.map(t=>`<td>${LV.reduce((s,l)=>s+r.c[t][l],0)||''}</td>`).join('')}<td>${fm(r.sum)}</td><td>${pc(r.sum*10)}</td></tr>`).join('')}</tbody></table></div>`+
   `<div class="note" style="font-size:13px;line-height:1.7"><b>Nhật ký rà soát:</b><br>${logs.map(E).join('<br>')}${issues.length?'<br><b style="color:#fb923c">⚠ Cần chú ý:</b><br>'+issues.map(E).join('<br>'):'<br>✓ Kiểm tra bằng chương trình: số câu, điểm và tỉ lệ % đều khớp.'}</div>`;
  st(issues.length?'⚠ Đã tạo xong nhưng có điểm cần chú ý (xem bên dưới). Bấm "Tải file Word".':'✅ Hoàn tất: AI đã rà soát 2 lần và chương trình đã kiểm tra lại số liệu. Bấm "Tải file Word".','ok');
  $('mxDl').disabled=false;
 }catch(e){st('❌ '+e.message,'err')}
 $('mxGo').disabled=false};
$('mxDl').onclick=()=>{if(lastDoc)downloadBlob(lastDoc.bytes,lastDoc.name)};
})();
