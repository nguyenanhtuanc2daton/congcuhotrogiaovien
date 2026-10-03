/* Chấm trắc nghiệm & phân tích câu (File mẫu · Nạp file) — chạy sau toan-hoc.js */
(function(){
const $=id=>document.getElementById(id),on=(i,f)=>{const e=$(i);if(e)e.onclick=f};
const rd=x=>Math.round(x*10000)/10000;
const cp=t=>{try{navigator.clipboard.writeText(t)}catch(e){const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();document.execCommand('copy');x.remove()}};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

/* ===== Chấm trắc nghiệm & phân tích câu =====
   Bản nâng cấp: (1) đọc dòng "Tên + đáp án" linh hoạt, báo lỗi từng dòng; (2) 📄 File mẫu / 📥 Nạp file (Word: Tên | Đáp án → “Tên: đáp án”);
   (3) ⬇️ Tải về (Word). Việc chấm điểm luôn do mã JavaScript bên dưới thực hiện. */
$('mSel').insertAdjacentHTML('beforeend','<option value="mJ">✅ Chấm trắc nghiệm &amp; phân tích câu</option>');
const jSt=document.createElement('style');
/* Giao diện điện thoại: nút cao ≥ 42px, ô nhập không tràn ngang, bảng kết quả cuộn ngang */
jSt.textContent='#mJ .bar button{min-height:42px}#mJ #jIn{font-size:16px}#mJ #jRes{overflow-x:auto;-webkit-overflow-scrolling:touch}#mJ #jRes table.jt{min-width:480px}#mJ .jwarn{background:rgba(250,204,21,.12);border:1px solid #facc15;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:14px;line-height:1.6}#mJ .jchip{background:rgba(250,204,21,.18)!important;border-color:#facc15!important}#mJ tr.jyel td{background:rgba(250,204,21,.16)}@media(max-width:640px){#mJ .bar>label,#mJ #jKey{width:100%!important}#mJ .bar button{flex:1 1 130px}}';
document.head.appendChild(jSt);
$('mI').insertAdjacentHTML('afterend',`<div class="mt" id="mJ"><div class="bar"><label>Đáp án đúng <input type="text" id="jKey" placeholder="ABCDABCDAB..." style="width:320px"></label><label>Thang điểm <input type="number" id="jMax" value="10" min="1" style="width:60px"></label><button class="sm" id="jRun" type="button">Chấm &amp; phân tích</button><button class="sec sm" id="jTpl" type="button" title="Tải file Word mẫu gồm 2 cột: Tên và Đáp án">📄 File mẫu</button><button class="sec sm" id="jLoad" type="button" title="Nạp file Word đã điền Tên và Đáp án">📥 Nạp file</button><button class="orange sm" id="jDoc" type="button" disabled title="Bấm Chấm &amp; phân tích trước">⬇️ Tải về (Word)</button><input type="file" id="jDocIn" accept=".docx,.xlsx,.xls,.csv" style="display:none"></div>
<div id="jMsg"></div>
<textarea id="jIn" style="min-height:130px" placeholder="Mỗi dòng một học sinh, ví dụ:&#10;Nguyễn Văn An: ABCDABCD&#10;Trần Bình ABDDABCA (cách bằng dấu cách)&#10;Lê Chi&lt;Tab&gt;ABCDABCD (dán từ Excel)&#10;Hoặc theo số câu (thứ tự bất kỳ): Dũng 1A 2C 5D 3A 4B&#10;Câu bỏ trống nhập - hoặc ."></textarea><div id="jFlag"></div><div id="jErr"></div><div id="jRes" style="overflow:auto"></div>
<div class="note">Tên và đáp án có thể cách nhau bằng Tab, dấu hai chấm hoặc dấu cách (đáp án là cụm A/B/C/D ở cuối dòng; chữ thường tự đổi thành chữ hoa). Cũng chấp nhận dạng ghi theo số câu như “1A 2C 5D 3A…”, thứ tự lộn xộn cũng được — chương trình tự sắp xếp lại theo số câu và báo nếu thiếu, trùng hoặc thừa câu. Cách nhanh: bấm 📄 File mẫu để tải file Word 2 cột (Tên | Đáp án), điền xong bấm 📥 Nạp file — chương trình tự chuyển thành dạng “Tên: đáp án” theo đúng thứ tự câu. Các dòng có dấu ? được tô vàng để thầy cô kiểm tra trước khi bấm Chấm &amp; phân tích. Kết quả gồm điểm từng học sinh, tỉ lệ làm đúng từng câu, mức khó và phương án sai nhiều nhất.</div></div>`);

/* ---------- Đọc một dòng "Tên + đáp án" ---------- */
const jOkC=/^[A-Da-d\-_.?,;\s]+$/,jCl=s=>s.replace(/[\s,;]/g,'');
function jParse(line,n){
 let name='',ans='';
 /* 0) Dạng ghi theo SỐ CÂU, thứ tự bất kỳ: "An 1A 2C 5D 6B 3A…" → tự sắp xếp lại theo số câu */
 const nm=line.match(/^(.*?)[\s:：\t]*((?:\d{1,3}\s*[.:)\-–]?\s*[A-Da-d?]\s*[,;\s]*){3,})$/);
 if(nm){const arr=Array(n).fill(null),miss=[],dup=[],over=[],re=/(\d{1,3})\s*[.:)\-–]?\s*([A-Da-d?])/g;let m;
  while((m=re.exec(nm[2]))){const q=+m[1],v=m[2].toUpperCase();if(q<1||q>n){over.push(q);continue}if(arr[q-1]!=null&&arr[q-1]!==v)dup.push(q);else arr[q-1]=v}
  for(let i=0;i<n;i++)if(arr[i]==null){miss.push(i+1);arr[i]='-'}
  return{name:nm[1].trim(),a:arr,numbered:true,miss,dup,over}}
 /* 1) Tab (cả trường hợp mỗi đáp án một ô Excel) */
 if(line.includes('\t')){const f=line.split('\t').map(s=>s.trim()),r=f.slice(1).join('');if(f.length>1&&jCl(r)&&jOkC.test(r)){name=f[0];ans=r}}
 /* 2) dấu hai chấm (lấy dấu cuối cùng) */
 if(!ans){const m=line.match(/^(.*)[:：]\s*([^:：]*)$/);if(m&&jCl(m[2])&&jOkC.test(m[2])){name=m[1].trim();ans=m[2]}}
 /* 3) dấu cách: lấy cụm ký tự A/B/C/D ở cuối dòng; ưu tiên cụm có đúng n câu */
 if(!ans){const tk=line.trim().split(/\s+/),ok=t=>/^[A-Da-d\-_.?,;]+$/.test(t);let acc='',k=tk.length;
  while(k>1&&ok(tk[k-1])){acc=tk[k-1]+acc;k--;if(jCl(acc).length>=n)break}
  if(jCl(acc).length!==n){if(tk.length>1&&ok(tk[tk.length-1])){k=tk.length-1;acc=tk[k]}else{acc='';k=tk.length}}
  name=tk.slice(0,k).join(' ');ans=acc}
 const a=jCl(ans).toUpperCase().replace(/[_.]/g,'-').split('').filter(Boolean);
 return{name:name.trim(),a}}
const jKeyStr=()=>$('jKey').value.toUpperCase().replace(/[^A-D]/g,'');

/* ---------- Chấm & phân tích (do mã JS làm, không dùng AI) ---------- */
let jLast=null;
const jEsc=esc;
on('jRun',()=>{
 const key=jKeyStr(),mx=+$('jMax').value||10,n=key.length;$('jDoc').disabled=true;jLast=null;$('jErr').innerHTML='';
 if(!n){$('jRes').innerHTML='Hãy nhập chuỗi đáp án đúng (A–D).';return}
 const lines=$('jIn').value.split('\n'),st=[],er=[],wn=[];
 lines.forEach((raw,i)=>{const line=raw.trim();if(!line)return;const p=jParse(line,n),ln=i+1;
  if(p.numbered){const nx=p.name||'không tên',bad=[];if(p.over.length)bad.push('có câu số '+[...new Set(p.over)].join(', ')+' vượt quá '+n+' câu');if(p.dup.length)bad.push('câu '+[...new Set(p.dup)].join(', ')+' bị ghi 2 lần khác nhau');if(p.miss.length)bad.push('thiếu câu '+p.miss.join(', '));
   if(bad.length){er.push(`Dòng ${ln} (${nx}): ${bad.join('; ')}.`);return}
   const q=[];p.a.forEach((c,k)=>{if(c==='?')q.push(k+1)});if(q.length)wn.push(`Dòng ${ln} (${nx}): ô “?” ở câu ${q.join(', ')} — tính là chưa trả lời.`);st.push({n:nx,a:p.a,q});return}
  if(!p.a.length){er.push(`Dòng ${ln}${p.name?' ('+p.name+')':''}: không tách được tên và đáp án (cần dạng “Tên: ABCD…” hoặc “Tên ABCD…”).`);return}
  if(p.a.length<n){er.push(`Dòng ${ln} (${p.name||'không tên'}): THIẾU ${n-p.a.length} câu — có ${p.a.length}/${n} câu.`);return}
  if(p.a.length>n){er.push(`Dòng ${ln} (${p.name||'không tên'}): THỪA ${p.a.length-n} câu — có ${p.a.length}/${n} câu.`);return}
  const q=[];p.a.forEach((c,k)=>{if(c==='?')q.push(k+1)});if(q.length)wn.push(`Dòng ${ln} (${p.name||'không tên'}): ô “?” ở câu ${q.join(', ')} — tính là chưa trả lời.`);
  st.push({n:p.name||'(không tên)',a:p.a,q})});
 const box=(c,t,l)=>l.length?`<div class="jwarn"><b>${t}</b><br>${l.map(jEsc).join('<br>')}</div>`:'';
 $('jErr').innerHTML=box('',`⚠ ${er.length} dòng chưa chấm được (hãy sửa rồi chấm lại):`,er)+box('',`⚠ Lưu ý ô chưa chắc chắn:`,wn);
 if(!st.length){$('jRes').innerHTML='Chưa có bài làm hợp lệ để chấm.';return}
 const ok=Array(n).fill(0),wr=Array.from({length:n},()=>({A:0,B:0,C:0,D:0,'-':0}));
 const rs=st.map(x=>{let c=0;const bad=[];for(let i=0;i<n;i++){const v='ABCD'.includes(x.a[i])?x.a[i]:'-';if(v==key[i]){c++;ok[i]++}else{wr[i][v]++;bad.push(i+1)}}return{n:x.n,c,bad,q:x.q,s:Math.round(c/n*mx*100)/100}}),avg=rs.reduce((s,r)=>s+r.s,0)/rs.length;
 const qs=ok.map((c,i)=>{const p=c/st.length,w=Object.entries(wr[i]).filter(e=>e[0]!='-').sort((a,b)=>b[1]-a[1])[0];return{i:i+1,p,lv:p>=.8?'Dễ':p>=.4?'Trung bình':'Khó',w:w&&w[1]?w[0]+' ('+w[1]+' HS)':'—',b:wr[i]['-']}});
 const hard=qs.filter(q=>q.p<.5).map(q=>q.i);
 jLast={key,mx,n,rs,avg:Math.round(avg*100)/100,date:new Date()};
 $('jRes').innerHTML=`<p>Số bài chấm: <b>${rs.length}</b> · Điểm trung bình: <b>${rd(avg)}</b> · Cao nhất: <b>${Math.max(...rs.map(r=>r.s))}</b> · Thấp nhất: <b>${Math.min(...rs.map(r=>r.s))}</b></p><p><b>Câu cần dạy lại</b> (dưới 50% làm đúng): ${hard.length?hard.join(', '):'không có'}</p>`+
 `<table class="jt"><tr><th>Câu</th><th>Đáp án</th><th>% đúng</th><th>Mức</th><th>Sai nhiều nhất</th><th>Bỏ trống</th></tr>${qs.map(q=>`<tr><td>${q.i}</td><td>${key[q.i-1]}</td><td>${Math.round(q.p*100)}%</td><td>${q.lv}</td><td>${q.w}</td><td>${q.b}</td></tr>`).join('')}</table><br>`+
 `<table class="jt"><tr><th>Học sinh</th><th>Đúng</th><th>Câu sai</th><th>Điểm</th></tr>${rs.map(r=>`<tr${r.q.length?' class="jyel"':''}><td>${jEsc(r.n)}${r.q.length?' ⚠':''}</td><td>${r.c}/${n}</td><td>${r.bad.join(', ')||'—'}</td><td><b>${r.s}</b></td></tr>`).join('')}</table>`;
 $('jDoc').disabled=false;$('jDoc').title='';
});
/* sửa dữ liệu sau khi chấm → phải chấm lại thì mới tải Word (tránh file lệch với dữ liệu) */
['jIn','jKey','jMax'].forEach(i=>$(i).addEventListener('input',()=>{$('jDoc').disabled=true;jLast=null;jFlagRender()}));

/* ---------- Đánh dấu vàng các dòng AI không chắc (hoặc có “?”) ---------- */
const jFlags={};
function jFlagRender(){
 const n=jKeyStr().length,ta=$('jIn'),lines=ta.value.split('\n'),out=[];let pos=0;
 lines.forEach((raw,i)=>{const line=raw.trim(),start=pos;pos+=raw.length+1;if(!line||!n)return;const p=jParse(line,n),q=new Set();p.a.forEach((c,k)=>{if(c==='?')q.add(k+1)});const f=jFlags[p.name];if(f)f.q.forEach(x=>q.add(x));
  if(q.size||(f&&f.note))out.push({ln:i+1,name:p.name||'(không tên)',q:[...q].sort((a,b)=>a-b),note:f?f.note:'',start,len:raw.length})});
 $('jFlag').innerHTML=out.length?`<div class="jwarn"><b>🟡 Cần kiểm tra (${out.length} dòng)</b> — chạm vào tên để đến dòng cần sửa:<br>${out.map((o,k)=>`<button class="sec sm jchip" type="button" data-k="${k}">${jEsc(o.name)}${o.q.length?': câu '+o.q.join(', '):''}</button>${o.note?' <i>'+jEsc(o.note)+'</i>':''}`).join(' ')}</div>`:'';
 $('jFlag').querySelectorAll('.jchip').forEach(b=>b.onclick=()=>{const o=out[+b.dataset.k];ta.focus();ta.setSelectionRange(o.start,o.start+o.len)})}

/* ---------- 📄 File mẫu & 📥 Nạp file: Word 2 cột (Tên | Đáp án) → dòng "Tên: đáp án" ---------- */
const jMsg=(t,bad)=>{$('jMsg').innerHTML=t?`<div class="jwarn"${bad?'':' style="border-color:var(--bd);background:transparent"'}>${t}</div>`:''};
const jWns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function jTplXml(n){
 const xe=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const F='<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>';
 const run=(t,b,sz)=>`<w:r><w:rPr>${F}${b?'<w:b/>':''}<w:sz w:val="${sz||26}"/><w:szCs w:val="${sz||26}"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
 const P=(parts,al,sa,sz)=>`<w:p><w:pPr><w:spacing w:before="0" w:after="${sa==null?80:sa}"/><w:jc w:val="${al||'left'}"/></w:pPr>${parts.map(x=>run(x[0],x[1],sz)).join('')}</w:p>`;
 const W=[3800,5800],BD=['top','left','bottom','right','insideH','insideV'].map(k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');
 const cell=(w,t,o={})=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.f?`<w:shd w:val="clear" w:color="auto" w:fill="${o.f}"/>`:''}<w:vAlign w:val="center"/></w:tcPr>${t?P([[t,o.b]],o.al||'left',0):'<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>'}</w:tc>`;
 const rows=[`<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${cell(W[0],'Tên',{b:1,f:'D9D9D9',al:'center'})}${cell(W[1],'Đáp án',{b:1,f:'D9D9D9',al:'center'})}</w:tr>`];
 for(let i=0;i<40;i++)rows.push(`<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="400"/></w:trPr>${cell(W[0],'')}${cell(W[1],'')}</w:tr>`);
 const tbl=`<w:tbl><w:tblPr><w:tblW w:w="${W[0]+W[1]}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${BD}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${W.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
 const m=n>0?Math.min(n,60):8,ex=Array.from({length:m},(_,i)=>'ABCD'[i%4]).join('');
 const body=P([['FILE MẪU NHẬP BÀI LÀM TRẮC NGHIỆM',1]],'center',120,32)
  +P([['Hướng dẫn: ',1],['điền tên học sinh vào cột “Tên”, đáp án vào cột “Đáp án”, mỗi học sinh một dòng. Không xóa dòng tiêu đề; cần thêm dòng thì thêm vào cuối bảng.',0]],'left',60,24)
  +P([['Cách ghi đáp án: ',1],['viết liền theo thứ tự câu 1 → câu cuối (có thể cách nhau bằng dấu cách); câu bỏ trống ghi dấu “-”. Ví dụ'+(n>0?' (bài '+n+' câu)':'')+': ',0],[ex,1]],'left',160,24)
  +tbl;
 return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="'+jWns+'"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>'}
on('jTpl',async()=>{try{jMsg('');await downloadBlob(makeZip([{name:'[Content_Types].xml',data:strToBytes(TXT_CONTENT_TYPES)},{name:'_rels/.rels',data:strToBytes(TXT_ROOT_RELS)},{name:'word/_rels/document.xml.rels',data:strToBytes(TXT_DOC_RELS)},{name:'word/document.xml',data:strToBytes(jTplXml(jKeyStr().length))}]),'File-mau-nhap-bai-lam-trac-nghiem.docx')}catch(e){jMsg('Không tạo được file mẫu: '+jEsc(e.message||e),1)}});
/* đọc chữ trong một ô/đoạn của Word */
function jElTxt(el){let t='';const all=el.getElementsByTagName('*');for(let i=0;i<all.length;i++){const n=all[i].localName;if(n==='t')t+=all[i].textContent;else if(n==='tab'||n==='br')t+=' '}return t.normalize('NFC')}
function jCellTxt(tc){const ps=tc.getElementsByTagNameNS(jWns,'p'),o=[];for(let i=0;i<ps.length;i++){const x=jElTxt(ps[i]).trim();if(x)o.push(x)}return o.join(' ').replace(/\s+/g,' ').trim()}
const jKids=(el,n)=>{const o=[];for(let c=el.firstChild;c;c=c.nextSibling)if(c.nodeType===1&&c.localName===n)o.push(c);return o};
function jDocRows(xml){
 const doc=new DOMParser().parseFromString(xml,'application/xml'),rows=[];
 if(doc.getElementsByTagName('parsererror').length)throw new Error('nội dung file Word bị lỗi, không đọc được.');
 const tbs=doc.getElementsByTagNameNS(jWns,'tbl');
 for(let i=0;i<tbs.length;i++)jKids(tbs[i],'tr').forEach(tr=>{const cs=jKids(tr,'tc').map(jCellTxt);if(cs.length>=2)rows.push(cs)});
 if(rows.length)return{rows};
 /* không có bảng: lấy từng đoạn văn như một dòng (nếu thầy cô đã gõ sẵn dạng “Tên: đáp án”) */
 const ps=doc.getElementsByTagNameNS(jWns,'p'),lines=[];for(let i=0;i<ps.length;i++){const x=jElTxt(ps[i]).replace(/\s+/g,' ').trim();if(x)lines.push(x)}
 return{rows:null,lines}}
/* các hàng (Tên, Đáp án…) → các dòng "Tên: đáp án"; đáp án chỉ gồm A–D thì gộp liền theo đúng thứ tự */
function jRowsToLines(rows){
 const lines=[];let ni=0,ai=1;
 rows.forEach(r=>{
  const isNm=c=>/^(họ\s*(và\s*)?tên|tên|học\s*sinh|stt|tt)(\s*(học\s*sinh|hs))?$/i.test(c),isAn=c=>/^(đáp\s*án|bài\s*làm)/i.test(c);
  if(r.some(isNm)&&r.some(isAn)){const a=r.findIndex(isAn),n=r.findIndex(c=>isNm(c)&&!/^(stt|tt)$/i.test(c));ni=n>=0?n:0;ai=a;return}
  let n0=ni,a0=ai;if(r.length>=3&&/^\d+$/.test(r[0])&&ni===0&&ai===1){n0=1;a0=2}
  const name=(r[n0]||'').replace(/[:：]/g,' ').replace(/\s+/g,' ').trim();
  let ans=r.slice(a0).join(' ').replace(/\s+/g,' ').trim();
  if(!name&&!ans)return;
  if(ans&&jOkC.test(ans)&&jCl(ans))ans=jCl(ans).toUpperCase().replace(/[_.]/g,'-');
  lines.push((name||'(không tên)')+': '+ans)});
 return lines}
on('jLoad',()=>{jMsg('');$('jDocIn').click()});
$('jDocIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 try{const ext=(f.name.split('.').pop()||'').toLowerCase();let lines=[];
  if(ext==='docx'){if(typeof JSZip==='undefined')throw new Error('chưa tải được thư viện JSZip (cần mạng để nạp từ CDN).');
   let z;try{z=await JSZip.loadAsync(await f.arrayBuffer())}catch(_){throw new Error('không mở được file (cần đúng file Word .docx).')}
   const x=z.file('word/document.xml');if(!x)throw new Error('đây không phải file Word .docx hợp lệ.');
   const r=jDocRows(await x.async('string'));lines=r.rows?jRowsToLines(r.rows):r.lines}
  else if(/^(xlsx|xls|csv)$/.test(ext)){if(typeof XLSX==='undefined')throw new Error('chưa tải được thư viện đọc Excel (cần mạng).');
   const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false}).map(r=>r.map(c=>String(c).normalize('NFC').trim())).filter(r=>r.some(Boolean));
   lines=jRowsToLines(rows.map(r=>{const k=r.slice();while(k.length<2)k.push('');return k}))}
  else throw new Error('chỉ nạp được file Word (.docx) điền theo File mẫu.');
  if(!lines.length){jMsg('Không tìm thấy dòng nào có tên và đáp án trong file. Hãy điền theo đúng <b>File mẫu</b> (2 cột: Tên | Đáp án).',1);return}
  if($('jIn').value.trim()&&!confirm('Ô danh sách bài làm đang có dữ liệu.\nBấm OK để THAY THẾ bằng '+lines.length+' dòng từ file vừa nạp; Hủy để giữ nguyên.'))return;
  $('jIn').value=lines.join('\n');$('jIn').dispatchEvent(new Event('input'));
  const n=jKeyStr().length,diff=n?lines.filter(l=>{const p=jParse(l,n);return !p.numbered&&p.a.length!==n}).length:0;
  jMsg(`✓ Đã nạp <b>${lines.length}</b> học sinh từ “${jEsc(f.name)}” (dạng “Tên: đáp án”).`+(n?'':' Nhớ nhập <b>Đáp án đúng</b> rồi bấm Chấm &amp; phân tích.')+(diff?` ⚠ Có ${diff} dòng có số câu khác ${n} — sẽ được báo lỗi khi chấm, hãy kiểm tra lại.`:' Kiểm tra lại rồi bấm Chấm &amp; phân tích.'),diff?1:0)}
 catch(err){jMsg('Không nạp được file: '+jEsc(err.message||err),1)}};
function jWordXml(L){
 const xe=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const F='<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>';
 const run=(t,b,sz)=>`<w:r><w:rPr>${F}${b?'<w:b/>':''}<w:sz w:val="${sz||26}"/><w:szCs w:val="${sz||26}"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
 const P=(parts,al,sa,sz)=>`<w:p><w:pPr><w:spacing w:before="0" w:after="${sa==null?80:sa}"/><w:jc w:val="${al||'left'}"/></w:pPr>${(Array.isArray(parts)?parts:[[parts,0]]).map(x=>run(x[0],x[1],sz)).join('')}</w:p>`;
 const C=(w,t,o={})=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.f?`<w:shd w:val="clear" w:color="auto" w:fill="${o.f}"/>`:''}<w:vAlign w:val="center"/></w:tcPr>${P([[t,o.b]],o.al||'left',0)}</w:tc>`;
 const W=[3800,4000,1800],BD=['top','left','bottom','right','insideH','insideV'].map(k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');
 const d=L.date,ds=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
 const kl=[];for(let i=0;i<L.n;i+=10)kl.push(L.key.slice(i,i+10).split('').map((c,k)=>(i+k+1)+'.'+c).join('  '));
 const rows=[`<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${C(W[0],'Tên học sinh',{b:1,f:'D9D9D9',al:'center'})}${C(W[1],'Các câu sai',{b:1,f:'D9D9D9',al:'center'})}${C(W[2],'Điểm',{b:1,f:'D9D9D9',al:'center'})}</w:tr>`].concat(L.rs.map(r=>`<w:tr><w:trPr><w:cantSplit/></w:trPr>${C(W[0],r.n)}${C(W[1],r.bad.length?r.bad.join(', '):'Không sai câu nào')}${C(W[2],String(r.s).replace('.',','),{al:'center',b:1})}</w:tr>`));
 const tbl=`<w:tbl><w:tblPr><w:tblW w:w="${W[0]+W[1]+W[2]}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${BD}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${W.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
 const body=P([['KẾT QUẢ CHẤM TRẮC NGHIỆM',1]],'center',120,32)+P([['Ngày chấm: ',1],[ds,0]])+P([['Số câu: ',1],[String(L.n),0],['    Thang điểm: ',1],[String(L.mx),0],['    Số bài: ',1],[String(L.rs.length),0],['    Điểm trung bình: ',1],[String(L.avg).replace('.',','),0]])+P([['Đáp án đúng:',1]],'left',40)+kl.map(t=>P(t,'left',20,24)).join('')+P('','left',80)+tbl;
 return'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>'}
/* dự phòng: .doc dạng HTML (Word và điện thoại đều mở được) nếu tạo .docx lỗi */
function jWordHtml(L){const d=L.date.toLocaleDateString('vi-VN'),kl=[];for(let i=0;i<L.n;i+=10)kl.push(L.key.slice(i,i+10).split('').map((c,k)=>(i+k+1)+'.'+c).join('&nbsp; '));
 return`<html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:13pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:4px 8px}th{background:#d9d9d9}</style></head><body><h2 style="text-align:center">KẾT QUẢ CHẤM TRẮC NGHIỆM</h2><p><b>Ngày chấm:</b> ${d} &nbsp; <b>Số câu:</b> ${L.n} &nbsp; <b>Thang điểm:</b> ${L.mx} &nbsp; <b>Điểm trung bình:</b> ${String(L.avg).replace('.',',')}</p><p><b>Đáp án đúng:</b><br>${kl.join('<br>')}</p><table><tr><th>Tên học sinh</th><th>Các câu sai</th><th>Điểm</th></tr>${L.rs.map(r=>`<tr><td>${jEsc(r.n)}</td><td>${r.bad.length?r.bad.join(', '):'Không sai câu nào'}</td><td style="text-align:center"><b>${String(r.s).replace('.',',')}</b></td></tr>`).join('')}</table></body></html>`}
on('jDoc',async()=>{const L=jLast;if(!L){jMsg('Hãy bấm “Chấm & phân tích” trước khi tải về.',1);return}
 const d=L.date,nm='Ket-qua-cham-trac-nghiem-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 try{await downloadBlob(makeZip([{name:'[Content_Types].xml',data:strToBytes(TXT_CONTENT_TYPES)},{name:'_rels/.rels',data:strToBytes(TXT_ROOT_RELS)},{name:'word/_rels/document.xml.rels',data:strToBytes(TXT_DOC_RELS)},{name:'word/document.xml',data:strToBytes(jWordXml(L))}]),nm+'.docx')}
 catch(e){try{await downloadBlob(strToBytes(jWordHtml(L)),nm+'.doc','application/msword');jMsg('Không tạo được .docx nên đã tải file .doc (Word vẫn mở được).')}catch(x){jMsg('Không tạo được file Word: '+jEsc(x.message||x),1)}}});

})();
