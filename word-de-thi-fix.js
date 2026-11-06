/* Công cụ Word · "Sửa lỗi đề thi sau rà soát"
   Chạy SAU bước rà soát/chuẩn hóa để xử lý các lỗi còn sót của ĐỀ KIỂM TRA (trắc nghiệm):
   1. Câu hỏi/đáp án bị lệch nhau (Câu 14 mang đáp án của Câu 13...), dòng thừa "A, B, C."
   2. Bảng đáp án xếp sai (A,C,B,D theo 1 cột; bảng lồng nhau; đáp án nằm trong đoạn văn dùng tab) → chuẩn hóa về 1×4 / 2×2 / 4×1
   3. Đáp án bị cụt ("3 → 1 →", thiếu dấu chấm) → tự bổ sung nếu suy ra được, còn lại cảnh báo
   4. Ngắt trang/section thừa giữa các câu hỏi
   5. Thứ tự các dạng (trả lời ngắn / đúng-sai) giữa các đề và đáp án cho đồng nhất
   6. Năm học sai/lẫn ("2025 - 2026", "2026 – 20267") → thống nhất theo năm học xuất hiện nhiều nhất
   7. Dựng lại PHIẾU TRẢ LỜI (lưới tô A-B-C-D, trả lời ngắn, Đúng/Sai, tự luận) vừa khổ giấy, không tràn lề
   API: WordDeThiFix.apply(buf, rep) → Promise<Uint8Array>   (rep: đối tượng báo cáo có fix(k,n) và warn(msg))
   Cần: JSZip. Không đụng tới file không phải đề thi (cần ≥3 câu "Câu N."). */
(function(global){
'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',XNS='http://www.w3.org/XML/1998/namespace';
const ln=(e,n)=>!!e&&e.nodeType===1&&e.namespaceURI===W&&e.localName===n;
const kids=(e,n)=>Array.from(e.childNodes).filter(c=>c.nodeType===1&&(!n||ln(c,n)));
const kid=(e,n)=>kids(e,n)[0]||null;
const all=(e,n)=>Array.from(e.getElementsByTagNameNS(W,n));
const wa=(e,a)=>e.getAttributeNS(W,a);
const sa=(e,a,v)=>e.setAttributeNS(W,'w:'+a,String(v));
const STEM=/^\s*Câu\s*(\d+)\s*[.:]/;
const STRAY=/^[A-D](\s*[,;]\s*[A-D])*\s*\.?$/;
const LBL=/(?<![A-Za-z0-9])([A-D])\.(?=\s)/g;

function ptext(n){let s='';(function w(x){for(const c of Array.from(x.childNodes)){if(c.nodeType!==1)continue;
  if(c.namespaceURI===W){const l=c.localName;
    if(l==='t')s+=c.textContent;else if(l==='tab')s+='\t';else if(l==='br')s+=' ';
    else if(l==='instrText'||l==='delText'||l==='pPr'||l==='rPr')continue;else w(c)}else w(c)}})(n);return s}
const ttext=t=>all(t,'p').map(p=>ptext(p).replace(/\t/g,' ')).join(' ');
const hasSect=e=>ln(e,'p')&&!!kid(kid(e,'pPr')||e,'sectPr');
const elems=body=>Array.from(body.childNodes).filter(c=>c.nodeType===1);
function mk(doc,name,attrs,kidsArr){const e=doc.createElementNS(W,'w:'+name);
  if(attrs)Object.keys(attrs).forEach(k=>sa(e,k,attrs[k]));(kidsArr||[]).forEach(k=>e.appendChild(k));return e}
function setParaText(doc,p,text){
  const runs=kids(p,'r');let r=runs[0];
  if(!r){r=mk(doc,'r');p.appendChild(r)}
  runs.slice(1).forEach(x=>p.removeChild(x));
  Array.from(r.childNodes).forEach(c=>{if(!ln(c,'rPr'))r.removeChild(c)});
  Array.from(p.childNodes).forEach(c=>{if(c.nodeType===1&&!ln(c,'pPr')&&c!==r)p.removeChild(c)});
  const t=mk(doc,'t');t.setAttributeNS(XNS,'xml:space','preserve');t.textContent=text;r.appendChild(t)}
function paraW(doc,text,o){o=o||{};
  const pPr=mk(doc,'pPr');
  if(o.pb)pPr.appendChild(mk(doc,'pageBreakBefore'));
  if(o.keep)pPr.appendChild(mk(doc,'keepNext'));
  if(o.dot){const tabs=mk(doc,'tabs');tabs.appendChild(mk(doc,'tab',{val:'right',leader:'dot',pos:o.dot}));pPr.appendChild(tabs)}
  pPr.appendChild(mk(doc,'spacing',{before:o.before||0,after:o.after==null?60:o.after}));
  if(o.ind!=null)pPr.appendChild(mk(doc,'ind',{left:o.ind}));
  if(o.jc)pPr.appendChild(mk(doc,'jc',{val:o.jc}));
  const p=mk(doc,'p',null,[pPr]);
  if(text)p.appendChild(runW(doc,text,o));
  if(o.dot)p.appendChild(mk(doc,'r',null,[mk(doc,'tab')]));
  return p}
function runW(doc,text,o){const rPr=mk(doc,'rPr');
  if(o&&o.font){const f=mk(doc,'rFonts');['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,o.font));rPr.appendChild(f)}
  if(o&&o.bold)rPr.appendChild(mk(doc,'b'));
  const t=mk(doc,'t');t.setAttributeNS(XNS,'xml:space','preserve');t.textContent=text;
  return mk(doc,'r',null,[rPr,t])}

/* ---- kích thước vùng chữ ---- */
function textWidth(sp){const sz=sp&&kid(sp,'pgSz'),mg=sp&&kid(sp,'pgMar');
  if(!sz||!mg)return 10092;const w=+wa(sz,'w')||11906,l=+wa(mg,'left')||1134,r=+wa(mg,'right')||680;return w-l-r}

/* ================== 5. NĂM HỌC ================== */
function fixYears(doc,body,rep){
  const re=/NĂM HỌC\s*(20\d\d)\s*[–\-]\s*(20\d\d)(\d?)(?!\d)/i,cnt=new Map(),ps=all(body,'p'),hits=[];
  ps.forEach(p=>{const t=ptext(p).replace(/\t/g,' '),m=re.exec(t);if(!m)return;hits.push({p,t,m});
    if(!m[3]){const k=m[1]+'-'+m[2];cnt.set(k,(cnt.get(k)||0)+1)}});
  let best=null,bn=0;cnt.forEach((n,k)=>{if(n>bn){bn=n;best=k}});
  if(!best&&hits.length){const m=hits[0].m;best=m[1]+'-'+m[2]}
  if(!best)return;const[a,b]=best.split('-');let n=0;
  hits.forEach(h=>{const cur=h.m[1]+'-'+h.m[2]+h.m[3];if(cur===best&&!h.m[3])return;
    const nt=h.t.replace(re,'NĂM HỌC '+a+' - '+b);if(nt===h.t)return;setParaText(doc,h.p,nt);n++});
  if(n)rep.fix('Đề thi: thống nhất năm học '+a+' - '+b+' (sửa năm sai/lẫn chữ số)',n)}

/* ================== 1-3. CÂU HỎI & ĐÁP ÁN ================== */
function parseBlock(els){
  const isTbl=els.length===1&&ln(els[0],'tbl');
  const strs=[];
  els.forEach(e=>{(ln(e,'p')?[e]:all(e,'p')).forEach(p=>{
    ptext(p).split(/\t+/).forEach(s=>{s=s.replace(/\s+/g,' ').trim();if(s)strs.push(s)})})});
  function tokens(split){const out=[];
    strs.forEach(s=>{
      if(!split){const m=/^([A-D])\.\s*(.*)$/.exec(s);out.push(m?{L:m[1],t:m[2]}:{L:null,t:s});return}
      const ms=[],seen=new Set();let m;LBL.lastIndex=0;
      while((m=LBL.exec(s))){if(!seen.has(m[1])){seen.add(m[1]);ms.push({i:m.index,L:m[1],e:m.index+m[0].length})}}
      if(!ms.length){out.push({L:null,t:s});return}
      if(ms[0].i>0){const lead=s.slice(0,ms[0].i).trim();if(lead)out.push({L:null,t:lead})}
      ms.forEach((x,k)=>out.push({L:x.L,t:s.slice(x.e,k+1<ms.length?ms[k+1].i:s.length).trim()}))})
    return out}
  for(const split of [true,false]){
    const tk=tokens(split);const pre=[];
    while(tk.length&&tk[0].L===null&&/^\d+[.)]\s/.test(tk[0].t))pre.push(tk.shift().t);
    const lab=tk.filter(x=>x.L),un=tk.filter(x=>!x.L);
    const have=new Set(lab.map(x=>x.L));if(have.size!==lab.length)continue;
    const miss=['A','B','C','D'].filter(l=>!have.has(l));
    if(un.length!==miss.length||lab.length+un.length!==4)continue;
    un.forEach((x,i)=>x.L=miss[i]);
    const o={};tk.forEach(x=>o[x.L]=x.t.trim());
    return{pre,opts:['A','B','C','D'].map(l=>o[l]),isTbl,
      rpr:(function(){const r=all(els[0],'r').find(r=>kid(r,'rPr')&&kid(r,'t'));return r?kid(r,'rPr'):null})()}}
  return null}
function fixOptText(blk,warn,qn,dotMajor){
  const o=blk.opts;let ch=0;
  const digs=s=>(s.match(/\d/g)||[]);
  o.forEach((s,i)=>{
    if(/→\s*$/.test(s)){const used=new Set(digs(s)),uni=new Set();o.forEach(x=>digs(x).forEach(d=>uni.add(d)));
      const miss=[...uni].filter(d=>!used.has(d));
      if(miss.length===1){o[i]=s.replace(/→\s*$/,'→ '+miss[0]+'.');ch++}
      else warn('Câu '+qn+': phương án '+'ABCD'[i]+' bị cụt (“'+s+'”) — cần bổ sung tay.')}
    else if(/^(Cả|Tất cả)\.?$/.test(s))warn('Câu '+qn+': phương án '+'ABCD'[i]+' chỉ có “'+s+'” — cần bổ sung nội dung (vd. “Cả ba ý trên.”).')});
  if(dotMajor)o.forEach((s,i)=>{if(!/[.?!…:;]$/.test(s)){o[i]=s+'.';ch++}});
  return ch}
function shapeOK(tbl,blk){
  if(all(tbl,'tbl').length)return false;
  const rows=kids(tbl,'tr').map(r=>kids(r,'tc'));
  const n=rows.length,c=rows[0]?rows[0].length:0;
  if(!rows.every(r=>r.length===c))return false;
  if(!((n===1&&c===4)||(n===2&&c===2)||(n===4&&c===1)))return false;
  const seq=[];
  for(const r of rows)for(const tc of r){
    const ps=all(tc,'p').map(p=>ptext(p).replace(/\s+/g,' ').trim()).filter(Boolean);
    if(ps.length!==1)return false;const m=/^([A-D])\.\s/.exec(ps[0]);if(!m)return false;
    const l=ps[0].match(LBL)||[];if(l.length>1&&new Set(l).size===l.length&&!blk.opts.some(o=>/(?<![A-Za-z0-9])[A-D]\.\s/.test(o)))return false;
    seq.push(m[1])}
  return seq.join('')==='ABCD'&&!blk.pre.length}
const DEFTBL='<w:tbl xmlns:w="'+W+'"><w:tblPr><w:tblW w:w="9808" w:type="dxa"/><w:tblInd w:w="284" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="9808"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="9808" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:t>x</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
function buildTable(doc,tpl,rows,aw,rpr){
  let t;
  if(tpl)t=tpl.cloneNode(true);else t=doc.importNode(new DOMParser().parseFromString(DEFTBL,'application/xml').documentElement,true);
  const tw=tpl?(+wa(kid(kid(tpl,'tblPr'),'tblW'),'w')||aw-284):aw-284,c=rows[0].length,cw=Math.floor(tw/c);
  const tr0=kid(t,'tr'),tc0=kid(tr0,'tc');
  const p0=kid(tc0,'p');Array.from(tc0.childNodes).forEach(x=>{if(ln(x,'p')&&x!==p0)tc0.removeChild(x)});
  const g=kid(t,'tblGrid');Array.from(g.childNodes).forEach(x=>g.removeChild(x));
  rows.length&&rows[0].forEach(()=>g.appendChild(mk(doc,'gridCol',{w:cw})));
  kid(kid(t,'tblPr'),'tblW')&&sa(kid(kid(t,'tblPr'),'tblW'),'w',cw*c);
  kids(t,'tr').forEach(r=>t.removeChild(r));
  rows.forEach(row=>{const tr=tr0.cloneNode(true);kids(tr,'tc').forEach(x=>tr.removeChild(x));
    row.forEach(s=>{const tc=tc0.cloneNode(true);const tcPr=kid(tc,'tcPr');
      if(tcPr){let w=kid(tcPr,'tcW');if(!w){w=mk(doc,'tcW');tcPr.insertBefore(w,tcPr.firstChild)}sa(w,'w',cw);sa(w,'type','dxa')}
      const p=kid(tc,'p');setParaText(doc,p,s);
      if(rpr){const r=kid(p,'r'),old=kid(r,'rPr');if(old)r.removeChild(old);r.insertBefore(rpr.cloneNode(true),r.firstChild)}
      tr.appendChild(tc)});t.appendChild(tr)});
  return t}

function questionPass(doc,body,rep,info){
  let ch=elems(body),toks=[],inTL=false,lastK=null;
  const isOptTxt=t=>{const m=t.match(LBL)||[];return new Set(m.map(x=>x[0])).size>=3};
  for(const e of ch){
    const t=ln(e,'p')?ptext(e).replace(/\t/g,' ').replace(/\s+/g,' ').trim():(ln(e,'tbl')?ttext(e):'');
    let k='B';
    if(ln(e,'p')&&/^Phần\s*II(?!I)/i.test(t)){inTL=true}
    else if(ln(e,'p')&&/^Phần\s*I(?!I)/i.test(t)){inTL=false}
    else if(inTL){}
    else if(ln(e,'p')&&hasSect(e)){}
    else if(ln(e,'p')&&!t)k='E';
    else if(ln(e,'p')&&STEM.test(t)){k='S';info.maxQ=Math.max(info.maxQ,+STEM.exec(t)[1])}
    else if(ln(e,'p')&&STRAY.test(t))k='X';
    else if(ln(e,'tbl')&&!isOptTxt(t)&&/^\s*1[.)]\s.*\b2[.)]\s/.test(t)&&lastK==='S'){const ps=[...toks].reverse().find(x=>x.k==='S');if(ps){ps.els.push(e);continue}}
    else if(ln(e,'tbl')&&isOptTxt(t))k='O';
    else if(ln(e,'p')&&(lastK==='S'||lastK==='Op')&&/(^|\s)[B-D]\.\s/.test(t)&&t.length<200)k='Op';
    if(k==='Op'){const prev=[...toks].reverse().find(x=>x.k!=='E');
      if(prev&&prev.k==='Op'){prev.els.push(e);toks.push({k:'E2',els:[]});lastK='Op';continue}
      toks.push({k:'Op',els:[e]});lastK='Op';continue}
    toks.push({k,els:[e]});
    if(k!=='E')lastK=k;}
  toks=toks.filter(x=>x.k!=='E2');
  const nstem=toks.filter(x=>x.k==='S').length;if(nstem<3)return false;
  /* bảng mẫu: bảng 1×4 chuẩn có sẵn trong file */
  let tpl=null;
  for(const tk of toks){if(tk.k!=='O')continue;const t=tk.els[0],rows=kids(t,'tr');
    if(rows.length===1&&kids(rows[0],'tc').length===4&&!all(t,'tbl').length&&kids(kids(rows[0],'tc')[0],'p').length===1){tpl=t;break}}
  const aw=textWidth(kid(body,'sectPr'));
  let nd=0,nt0=0;toks.forEach(tk=>{if(tk.k==='O'||tk.k==='Op'){tk.blk=parseBlock(tk.els);if(tk.blk)tk.blk.opts.forEach(x=>{nt0++;if(/[.…]$/.test(x))nd++})}});
  const dotMajor=nt0>0&&nd/nt0>=.5;
  /* tách thành các "đoạn" giữa các điểm chặn */
  const runs=[];let cur=[];toks.forEach(tk=>{if(tk.k==='B'){if(cur.length)runs.push(cur);cur=[]}else cur.push(tk)});if(cur.length)runs.push(cur);
  let nMis=0,nStray=0,nBlank=0,nNorm=0,nTxt=0;
  const isQ=k=>k==='S'||k==='O'||k==='Op';
  runs.forEach(run=>{
    const real=run.filter(x=>isQ(x.k)),S=real.filter(x=>x.k==='S'),O=real.filter(x=>x.k!=='S');
    if(!S.length||!O.length)return;
    /* bỏ dòng thừa */
    run.filter(x=>x.k==='X').forEach(x=>{x.els.forEach(e=>e.parentNode.removeChild(e));nStray++});
    const ok=S.length===O.length;
    if(!ok){const q0=STEM.exec(ptext(S[0].els[0]).trim());
      rep.warn('Đề thi: quanh Câu '+(q0?q0[1]:'?')+' có '+S.length+' câu hỏi nhưng '+O.length+' khối đáp án — không tự ghép lại được, cần kiểm tra tay.')}
    else{let good=true;real.forEach((x,i)=>{if((i%2===0)!==(x.k==='S'))good=false});
      if(!good){
        const first=run[0].els[0],lastEl=run[run.length-1].els.slice(-1)[0],after=lastEl.nextSibling,prev=first.previousSibling;
        const parent=first.parentNode;
        run.forEach(x=>x.els.forEach(e=>{if(e.parentNode)e.parentNode.removeChild(e)}));
        const ref=after;
        for(let i=0;i<S.length;i++){S[i].els.forEach(e=>parent.insertBefore(e,ref));O[i].els.forEach(e=>parent.insertBefore(e,ref))}
        nMis++}}
    /* bỏ đoạn trống thừa giữa các câu */
    run.filter(x=>x.k==='E').forEach(x=>{const e=x.els[0];if(e.parentNode){e.parentNode.removeChild(e);nBlank++}});
    /* chuẩn hóa từng khối đáp án */
    O.forEach(tk=>{
      const blk=tk.blk||parseBlock(tk.els);
      const sEl=ok?S[O.indexOf(tk)]:null;
      const qn=sEl?(STEM.exec(ptext(sEl.els[0]).trim())||[0,'?'])[1]:'?';
      if(!blk){rep.warn('Câu '+qn+': không đọc được đủ 4 phương án A–D để chuẩn hóa — cần kiểm tra tay.');return}
      const nt=fixOptText(blk,m=>rep.warn(m),qn,dotMajor);if(nt)nTxt+=nt;
      const need=tk.k==='Op'||!tk.els[0]||!shapeOK(tk.els[0],blk)||nt>0;
      if(!need)return;
      const L=Math.max.apply(null,blk.opts.map(s=>s.length+3));
      const o=blk.opts.map((s,i)=>'ABCD'[i]+'. '+s);
      const rows=L<=24?[o]:L<=50?[[o[0],o[1]],[o[2],o[3]]]:o.map(x=>[x]);
      const parent=tk.els[0].parentNode,anchor=tk.els[0];
      if(blk.pre.length){const pr=buildTable(doc,tpl,[blk.pre],aw,blk.rpr);parent.insertBefore(pr,anchor)}
      parent.insertBefore(buildTable(doc,tpl,rows,aw,blk.rpr),anchor);
      tk.els.forEach(e=>{if(e.parentNode)e.parentNode.removeChild(e)});nNorm++})});
  if(nMis)rep.fix('Đề thi: ghép lại đáp án đang lệch câu hỏi (đoạn câu)',nMis);
  if(nStray)rep.fix('Đề thi: xóa dòng thừa dạng “A, B, C.”',nStray);
  if(nNorm)rep.fix('Đề thi: chuẩn hóa bảng đáp án A–D (đúng thứ tự, vừa khổ giấy)',nNorm);
  if(nTxt)rep.fix('Đề thi: bổ sung phần bị cụt / dấu chấm cuối phương án',nTxt);
  if(nBlank)rep.fix('Đề thi: xóa đoạn trống thừa giữa các câu',nBlank);
  return true}

/* ================== 4. SECTION THỪA GIỮA CÁC CÂU ================== */
function sectPass(doc,body,rep){
  const ch=elems(body);let n=0;
  const sig=sp=>{const z=sp&&kid(sp,'pgSz');return z?wa(z,'w')+'x'+wa(z,'h')+wa(z,'orient'):''};
  const isQ=e=>{if(ln(e,'tbl'))return(ttext(e).match(LBL)||[]).length>=3;if(!ln(e,'p'))return false;return STEM.test(ptext(e).trim())};
  const nonEmpty=(i,d)=>{for(i+=d;i>=0&&i<ch.length;i+=d){const e=ch[i];if(ln(e,'p')&&!hasSect(e)&&!ptext(e).trim())continue;return e}return null};
  ch.forEach((e,i)=>{if(!hasSect(e))return;
    const a=nonEmpty(i,-1),b=nonEmpty(i,1);
    if(!a||!b||!isQ(a)||!(ln(b,'p')&&STEM.test(ptext(b).trim())))return;
    const sp=kid(kid(e,'pPr'),'sectPr');let nx=null;
    for(let j=i+1;j<ch.length;j++){const x=ch[j];if(hasSect(x)){nx=kid(kid(x,'pPr'),'sectPr');break}if(ln(x,'sectPr')){nx=x;break}}
    if(!nx||sig(nx)!==sig(sp))return;
    let ty=kid(nx,'type');if(ty&&wa(ty,'val')==='continuous')return;
    if(!ty){ty=mk(doc,'type');const ref=kids(nx).find(c=>!/^(headerReference|footerReference|footnotePr|endnotePr)$/.test(c.localName));nx.insertBefore(ty,ref||null)}
    sa(ty,'val','continuous');n++});
  if(n)rep.fix('Đề thi: bỏ ngắt trang/section thừa giữa các câu hỏi',n);
  let d=0;const ch2=elems(body);
  for(let i=0;i+1<ch2.length;i++){const a=ch2[i],b=ch2[i+1];
    if(hasSect(a)&&hasSect(b)&&!ptext(a).trim()&&!ptext(b).trim()&&sig(kid(kid(a,'pPr'),'sectPr'))===sig(kid(kid(b,'pPr'),'sectPr'))){body.removeChild(b);ch2.splice(i+1,1);i--;d++}}
  if(d)rep.fix('Đề thi: xóa section rỗng liền nhau (gây trang trống)',d)}

/* ================== 6. THỨ TỰ CÁC DẠNG ================== */
function groupPass(doc,body,rep,info){
  const ch=elems(body);
  const head=e=>{if(!ln(e,'p'))return null;const t=ptext(e);if(t.length>260)return null;
    if(/Dạng\s+(trắc nghiệm\s+)?trả lời ngắn/i.test(t))return'SA';
    if(/Dạng\s+(trắc nghiệm\s+)?đúng\s*\/?\s*sai/i.test(t))return'TF';return null};
  const stop=e=>head(e)||hasSect(e)||(ln(e,'p')&&/^Phần\s*I/i.test(ptext(e).trim()))||(ln(e,'tbl')&&/NGƯỜI RA ĐỀ/.test(ttext(e)));
  const groups=[];
  for(let i=0;i<ch.length;i++){const k=head(ch[i]);if(!k)continue;
    const g={k,els:[ch[i]],s:i};let j=i+1;while(j<ch.length&&!stop(ch[j])){g.els.push(ch[j]);j++}g.e=j;groups.push(g);i=j-1}
  const cntNum=g=>g.els.slice(1).filter(e=>ln(e,'p')&&kid(kid(e,'pPr')||e,'numPr')).length;
  groups.forEach(g=>{const c=cntNum(g);if(c)info[g.k]=Math.max(info[g.k]||0,c)});
  let ref=null,n=0;
  for(let i=0;i+1<groups.length;i++){const a=groups[i],b=groups[i+1];
    if(a.e!==b.s||a.k===b.k)continue;
    if(!ref){ref=a.k;i++;continue}
    if(a.k!==ref){const first=a.els[0];b.els.forEach(e=>first.parentNode.insertBefore(e,first));n++}
    i++}
  if(n)rep.fix('Đề thi: đổi thứ tự “Dạng trả lời ngắn / Dạng đúng-sai” cho giống đề đầu',n)}

/* ================== 7. PHIẾU TRẢ LỜI ================== */
function sheetPass(doc,body,rep,info){
  const ch=elems(body);
  const isHdr=e=>ln(e,'tbl')&&/PHIẾU TRẢ LỜI/.test(ttext(e))&&/BÀI LÀM/.test(ttext(e));
  const hdrs=ch.map((e,i)=>isHdr(e)?i:-1).filter(i=>i>=0);
  if(!hdrs.length)return;
  const B='○',nQ=info.maxQ>0?info.maxQ:20,nSA=info.SA||3,nTF=info.TF||5;
  const cell=(text,w,o)=>{o=o||{};
    const tc=mk(doc,'tc',null,[mk(doc,'tcPr',null,[mk(doc,'tcW',{w:w,type:'dxa'}),mk(doc,'vAlign',{val:'center'})])]);
    const pPr=mk(doc,'pPr',null,[mk(doc,'spacing',{before:30,after:30})]);
    if(o.center!==false)pPr.appendChild(mk(doc,'jc',{val:'center'}));
    const p=mk(doc,'p',null,[pPr]);if(text)p.appendChild(runW(doc,text,o));tc.appendChild(p);return tc};
  const table=(rows,widths,ind)=>{
    const bd=mk(doc,'tblBorders');['top','left','bottom','right','insideH','insideV'].forEach(s=>bd.appendChild(mk(doc,s,{val:'single',sz:4,space:0,color:'000000'})));
    const cm=mk(doc,'tblCellMar');['left','right'].forEach(s=>cm.appendChild(mk(doc,s,{w:40,type:'dxa'})));
    const t=mk(doc,'tbl',null,[mk(doc,'tblPr',null,[mk(doc,'tblW',{w:widths.reduce((a,b)=>a+b,0),type:'dxa'}),mk(doc,'tblInd',{w:ind,type:'dxa'}),bd,mk(doc,'tblLayout',{type:'fixed'}),cm]),
      mk(doc,'tblGrid',null,widths.map(w=>mk(doc,'gridCol',{w:w})))]);
    rows.forEach(r=>t.appendChild(mk(doc,'tr',null,[mk(doc,'trPr',null,[mk(doc,'cantSplit')])].concat(r))));return t};
  let n=0;
  for(let h=hdrs.length-1;h>=0;h--){
    const hi=hdrs[h];let H=-1;
    for(let i=hi+1;i<Math.min(ch.length,hi+12);i++){if(ln(ch[i],'p')&&/Dạng\s+trắc nghiệm\s+nhiều lựa chọn/i.test(ptext(ch[i]))){H=i;break}}
    if(H<0){rep.warn('Phiếu trả lời #'+(h+1)+': không thấy mục “Dạng trắc nghiệm nhiều lựa chọn” nên không dựng lại được.');continue}
    const end=h+1<hdrs.length?hdrs[h+1]:ch.length-(ln(ch[ch.length-1],'sectPr')?1:0);
    const region=ch.slice(H+1,end),sects=region.filter(hasSect);
    const keep=sects.length?sects[sects.length-1]:null;
    const sp=keep?kid(kid(keep,'pPr'),'sectPr'):kid(body,'sectPr');
    const aw=textWidth(sp),ind=1004,tw=Math.max(6000,aw-ind);
    region.forEach(e=>e.parentNode.removeChild(e));
    const out=[];
    /* lưới tô A-B-C-D */
    const gw=Math.floor(tw/4),lab=472,cw=Math.floor((gw-lab)/4),widths=[];for(let g=0;g<4;g++)widths.push(lab,cw,cw,cw,cw);
    const per=Math.ceil(nQ/4),hdr=[];
    for(let g=0;g<4;g++){hdr.push(cell('',lab));'ABCD'.split('').forEach(c=>hdr.push(cell(c,cw,{bold:true})))}
    const rows=[hdr];
    for(let r=0;r<per;r++){const row=[];
      for(let g=0;g<4;g++){const q=g*per+r+1;
        if(q<=nQ){row.push(cell(String(q),lab,{bold:true}));for(let c=0;c<4;c++)row.push(cell(B,cw,{font:'Arial'}))}
        else for(let c=0;c<5;c++)row.push(cell('',c?cw:lab))}
      rows.push(row)}
    out.push(table(rows,widths,ind));
    out.push(paraW(doc,'2. Dạng trắc nghiệm trả lời ngắn:',{before:160,keep:true,ind:ind}));
    for(let i=0;i<nSA;i++)out.push(paraW(doc,'abcdefgh'[i]+'. ',{dot:aw-60,ind:ind,after:100}));
    out.push(paraW(doc,'3. Dạng đúng (Đ), sai (S):',{before:120,keep:true,ind:ind}));
    const c0=tw-2400,tf=[[cell('',c0),cell('Đúng',1200,{bold:true}),cell('Sai',1200,{bold:true})]];
    for(let i=0;i<nTF;i++)tf.push([cell('abcdefgh'[i],c0,{center:false,bold:true}),cell(B,1200,{font:'Arial'}),cell(B,1200,{font:'Arial'})]);
    out.push(table(tf,[c0,1200,1200],ind));
    out.push(paraW(doc,'Phần II: TỰ LUẬN (3 điểm)',{bold:true,keep:true,pb:true,ind:ind}));
    for(let i=0;i<30;i++)out.push(paraW(doc,'',{dot:aw-60,ind:ind,after:100}));
    const ref=keep||ch[end]||null;
    if(keep)region.length&&body.insertBefore(keep,ch[end]||null);
    const anchor=keep||(end<ch.length?ch[end]:null);
    out.forEach(e=>body.insertBefore(e,anchor));
    n++}
  if(n)rep.fix('Đề thi: dựng lại phiếu trả lời (lưới tô, trả lời ngắn, Đúng/Sai, tự luận) vừa khổ giấy, bỏ trang trống thừa',n)}

/* ================== API ================== */
async function apply(buf,rep){
  rep=rep||{fix(){},warn(){}};
  if(typeof JSZip==='undefined')throw new Error('thiếu JSZip');
  const zip=await JSZip.loadAsync(buf),f=zip.file('word/document.xml');if(!f)return buf;
  const xml=await f.async('string');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)return buf;
  const body=doc.getElementsByTagNameNS(W,'body')[0];if(!body)return buf;
  const info={maxQ:0};
  fixYears(doc,body,rep);
  const isExam=questionPass(doc,body,rep,info);
  if(!isExam)return buf;
  groupPass(doc,body,rep,info);
  sectPass(doc,body,rep);
  sheetPass(doc,body,rep,info);
  let out=new XMLSerializer().serializeToString(doc);
  if(!/^<\?xml/.test(out))out='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+out;
  zip.file('word/document.xml',out);
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'})}
global.WordDeThiFix={apply};
if(typeof module!=='undefined')module.exports=global.WordDeThiFix;
})(typeof window!=='undefined'?window:globalThis);
