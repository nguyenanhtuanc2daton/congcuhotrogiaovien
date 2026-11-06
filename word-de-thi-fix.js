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
const kids=(e,n)=>e?Array.from(e.childNodes).filter(c=>c.nodeType===1&&(!n||ln(c,n))):[];
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
  let nMis=0,nStray=0,nBlank=0,nNorm=0,nTxt=0,nTail=0;const strayLeft=[];
  const isQ=k=>k==='S'||k==='O'||k==='Op';
  runs.forEach(run=>{
    const real=run.filter(x=>isQ(x.k)),S=real.filter(x=>x.k==='S'),O=real.filter(x=>x.k!=='S');
    if(!S.length||!O.length)return;
    /* bỏ dòng thừa */
    /* [v2] dòng thừa “A, B, C.” thường là phần đuôi của phương án “D. Cả” bị tách rời → giữ lại chữ để ghép vào D, không xóa mất */
    const strayTxt=[];
    run.filter(x=>x.k==='X').forEach(x=>{x.els.forEach(e=>{strayTxt.push(ptext(e).replace(/\s+/g,' ').trim());e.parentNode.removeChild(e)});nStray++});
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
      let mergedTail=0;
      if(strayTxt.length)blk.opts.forEach((x,i)=>{if(/^(Cả|Tất cả)\.?$/.test(x)&&strayTxt.length){blk.opts[i]=x.replace(/\.$/,'')+' '+strayTxt.shift();mergedTail++}});
      if(mergedTail){nTail+=mergedTail}
      const nt=fixOptText(blk,m=>rep.warn(m),qn,dotMajor)+mergedTail;if(nt)nTxt+=nt;
      const need=tk.k==='Op'||!tk.els[0]||!shapeOK(tk.els[0],blk)||nt>0;
      if(!need)return;
      const L=Math.max.apply(null,blk.opts.map(s=>s.length+3));
      const o=blk.opts.map((s,i)=>'ABCD'[i]+'. '+s);
      const rows=L<=24?[o]:L<=50?[[o[0],o[1]],[o[2],o[3]]]:o.map(x=>[x]);
      const parent=tk.els[0].parentNode,anchor=tk.els[0];
      if(blk.pre.length){const pr=buildTable(doc,tpl,[blk.pre],aw,blk.rpr);parent.insertBefore(pr,anchor)}
      parent.insertBefore(buildTable(doc,tpl,rows,aw,blk.rpr),anchor);
      tk.els.forEach(e=>{if(e.parentNode)e.parentNode.removeChild(e)});nNorm++});
    strayTxt.forEach(t=>strayLeft.push('Đề thi: đã xóa dòng thừa “'+t+'” không ghép được vào phương án nào — kiểm tra lại câu hỏi gần đó.'))});
  strayLeft.forEach(m=>rep.warn(m));
  if(nTail)rep.fix('Đề thi: ghép phần đuôi “A, B, C.” vào phương án “Cả” (D. Cả A, B, C.)',nTail);
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
    const aw=textWidth(sp),ind=0,tw=Math.max(6000,aw-ind);
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
    /* [v2] số dòng chấm tự tính theo chiều cao trang (trước: cố định 30 dòng → khổ/cỡ chữ khác là tràn sang trang thừa) */
    const bx=pgBox(sp),dsz=info.def||12,lineH=dsz*1.15+5,nDot=Math.max(10,Math.min(45,Math.floor((bx.ah/20-dsz*1.15*2-14)/lineH)-1));
    for(let i=0;i<nDot;i++)out.push(paraW(doc,'',{dot:aw-60,ind:ind,after:100}));
    const ref=keep||ch[end]||null;
    if(keep)region.length&&body.insertBefore(keep,ch[end]||null);
    const anchor=keep||(end<ch.length?ch[end]:null);
    out.forEach(e=>body.insertBefore(e,anchor));
    n++}
  if(n)rep.fix('Đề thi: dựng lại phiếu trả lời (lưới tô, trả lời ngắn, Đúng/Sai, tự luận) vừa khổ giấy, bỏ trang trống thừa',n)}

/* ================== 9. ĐÁP ÁN: THỤT LỀ ĐỒNG NHẤT ==================
   Phần đáp án (sau khi PDF→Word) lệch lề lung tung: “Phần I” thụt dòng đầu 1,27 cm, “Câu 1” sát lề, bảng thụt 1,77/1,84 cm,
   mục 1./2./3. thụt 2,2 cm, ý a./b./c. thụt 2 cm... → quy về MỘT hệ thụt lề:
     cấp 0 (Phần I/II, Câu n)  : sát lề
     cấp 1 (1./2./3., •, bảng, đoạn giải thích) : số ở 1 cm, chữ ở 1,63 cm
     cấp 2 (a./b./c., ○)       : số ở 1,63 cm, chữ cách thêm 0,8 cm */
function keyPass(doc,body,rep){
  const ch=elems(body);let n=0;
  const tx=e=>ln(e,'p')?ptext(e).replace(/\s+/g,' ').trim():ttext(e).replace(/\s+/g,' ').trim();
  const B1=567,T1=B1+360,B2=T1,T2=B2+454;
  const sec=e=>{const sp=ln(e,'p')?kid(kid(e,'pPr'),'sectPr'):null;return sp};
  const setInd=(p,o)=>{const pp=kid(p,'pPr')||p.insertBefore(mk(doc,'pPr'),p.firstChild);
    let ie=kid(pp,'ind');if(!ie){ie=mk(doc,'ind');
      const sp=kid(pp,'spacing'),ref=sp?sp.nextSibling:null;
      // ind đứng sau spacing theo thứ tự schema; nếu có jc/rPr... chèn trước phần tử đầu tiên đứng sau 'ind'
      const after=['contextualSpacing','mirrorIndents','suppressOverlap','jc','textDirection','textAlignment','textboxTightWrap','outlineLvl','divId','cnfStyle','rPr','sectPr','pPrChange'];
      let at=null;for(const c of kids(pp)){if(after.indexOf(c.localName)>=0){at=c;break}}
      pp.insertBefore(ie,at)}
    ['left','start','right','end','hanging','firstLine','leftChars','rightChars','hangingChars','firstLineChars'].forEach(a=>ie.removeAttributeNS(W,a));
    sa(ie,'left',o.left);if(o.hanging)sa(ie,'hanging',o.hanging);sa(ie,'right',0)};
  const setTbl=(t,ind,aw)=>{const pr=kid(t,'tblPr');if(!pr)return;
    let ti=kid(pr,'tblInd');if(!ti){ti=mk(doc,'tblInd');
      const order=['tblBorders','shd','tblLayout','tblCellMar','tblLook'];let at=null;for(const c of kids(pr)){if(order.indexOf(c.localName)>=0){at=c;break}}pr.insertBefore(ti,at)}
    sa(ti,'w',ind);sa(ti,'type','dxa');
    const g=kid(t,'tblGrid'),cols=g?kids(g,'gridCol'):[],tot=cols.reduce((a,c)=>a+(+wa(c,'w')||0),0);
    if(tot&&Math.abs(tot+ind-aw)>20){const k=(aw-ind)/tot;cols.forEach(c=>sa(c,'w',Math.floor((+wa(c,'w')||0)*k)));
      all(t,'tc').forEach(tc=>{const w=kid(kid(tc,'tcPr'),'tcW');if(w&&+wa(w,'w'))sa(w,'w',Math.floor(+wa(w,'w')*k))});
      const tw2=kid(pr,'tblW');if(tw2){sa(tw2,'w',Math.floor(aw-ind));sa(tw2,'type','dxa')}}};
  for(let i=0;i<ch.length;i++){
    const e=ch[i];if(!/^ĐÁP ÁN\b/.test(tx(e).replace(/^.*?(ĐÁP ÁN)/,'$1').slice(0,40))||!/ĐÁP ÁN\s+MÔN/.test(tx(e)))continue;
    if(ln(e,'tbl')&&tx(e).length>200)continue;
    /* điểm đầu: dòng “Phần I” đầu tiên sau tiêu đề; điểm cuối: trước tiêu đề UBND kế tiếp (đề/đáp án khác) hoặc hết tài liệu */
    let a=-1;for(let k=i+1;k<Math.min(ch.length,i+14);k++){if(ln(ch[k],'p')&&/^Phần\s*I\b/i.test(tx(ch[k]))){a=k;break}}
    if(a<0)continue;
    let z=ch.length;for(let k=a+1;k<ch.length;k++){const t=tx(ch[k]);if(/^UBND\b/.test(t)||(ln(ch[k],'tbl')&&/^UBND/.test(t)&&/ĐỀ KIỂM TRA|ĐÁP ÁN|PHIẾU/.test(t))){z=k;break}}
    let sp=null;for(let k=a;k<ch.length&&!sp;k++){sp=ln(ch[k],'sectPr')?ch[k]:sec(ch[k])}
    const aw=textWidth(sp||kid(body,'sectPr'));
    let inII=false;
    for(let k=a;k<z;k++){const e2=ch[k];
      if(ln(e2,'tbl')){setTbl(e2,0,aw);n++;continue}
      if(!ln(e2,'p')||sec(e2))continue;
      const t=tx(e2);if(!t)continue;
      const pp=kid(e2,'pPr'),jc=pp&&kid(pp,'jc'),np=pp&&kid(pp,'numPr');
      if(jc&&wa(jc,'val')==='center'&&!np)continue;
      if(/^Phần\s*II\b/i.test(t))inII=true;else if(/^Phần\s*I\b/i.test(t))inII=false;
      if(/^Phần\s*(I|II)\b/i.test(t)||/^Câu\s*\d+/.test(t)){setInd(e2,{left:0});n++;continue}
      if(np){const il=kid(np,'ilvl'),lv=il?+wa(il,'val')||0:0;
        if(lv<=0)setInd(e2,{left:inII?B1+283:T1,hanging:inII?283:360});
        else setInd(e2,{left:(inII?B1+283:T1)+454*lv,hanging:454});
        n++;continue}
      setInd(e2,{left:inII?B1:T1});n++}
    i=z-1}
  if(n)rep.fix('Đề thi: phần ĐÁP ÁN — thụt lề đồng nhất (Phần/Câu sát lề, mục 1./2./3. và bảng cùng 1 mức, ý a./b./c. lùi tiếp)',n)}

/* ================== 10. BẢNG ĐỀU VÀ CÂN ĐỐI ==================
   a) Bảng bị PDF/Word chia thành nhiều mảnh liền nhau (vd. bản đặc tả 6 mảnh) có cột rộng/hẹp mỗi mảnh một kiểu
      (cột số chỉ 0,3 cm ở mảnh này, 1,2 cm ở mảnh kia) → dùng chung MỘT bộ độ rộng cột cân đối cho cả cụm.
   b) Bảng quá hẹp so với vùng chữ (khung tiêu đề khổ ngang chiếm 64%, bảng chữ ký 89%...) → giãn cho vừa bề rộng, tỉ lệ cột giữ nguyên. */
function sectWidthAt(body,e){let top=e;while(top&&top.parentNode!==body)top=top.parentNode;
  for(let n=top;n;n=n.nextSibling){if(n.nodeType!==1)continue;const sp=ln(n,'sectPr')?n:(ln(n,'p')?kid(kid(n,'pPr'),'sectPr'):null);if(sp)return textWidth(sp)}
  return textWidth(kid(body,'sectPr'))}
function gridOf(t){const g=kid(t,'tblGrid');return g?kids(g,'gridCol').map(c=>tw(wa(c,'w'))):[]}
function applyGrid(doc,t,w,ind){
  const g=kid(t,'tblGrid');if(!g)return;kids(g,'gridCol').forEach((c,i)=>sa(c,'w',w[i]));
  const pr=kid(t,'tblPr');
  if(pr){let tww=kid(pr,'tblW');if(!tww){tww=mk(doc,'tblW');pr.insertBefore(tww,kid(pr,'jc')||kid(pr,'tblInd')||kid(pr,'tblBorders')||kid(pr,'tblLayout')||kid(pr,'tblCellMar')||kid(pr,'tblLook')||null)}
    sa(tww,'w',w.reduce((a,b)=>a+b,0));sa(tww,'type','dxa');
    let ti=kid(pr,'tblInd');if(ti){sa(ti,'w',ind);sa(ti,'type','dxa')}
    let lay=kid(pr,'tblLayout');if(!lay){lay=mk(doc,'tblLayout');pr.insertBefore(lay,kid(pr,'tblCellMar')||kid(pr,'tblLook')||null)}sa(lay,'type','fixed')}
  kids(t,'tr').forEach(tr=>{let col=0;const tp=kid(tr,'trPr'),gb=tp&&kid(tp,'gridBefore');if(gb)col+=tw(wa(gb,'val'));
    kids(tr,'tc').forEach(tc=>{const cp=kid(tc,'tcPr'),gs=cp&&kid(cp,'gridSpan'),k=gs?tw(wa(gs,'val'))||1:1;
      let sum=0;for(let j=col;j<col+k&&j<w.length;j++)sum+=w[j];col+=k;
      const cw=cp&&kid(cp,'tcW');if(cw){sa(cw,'w',sum);sa(cw,'type','dxa')}})})}
function scaleTo(w,total,minW){const s0=w.reduce((a,b)=>a+b,0)||1;let r=w.map(x=>Math.max(minW||0,Math.floor(x*total/s0)));
  let d=total-r.reduce((a,b)=>a+b,0);let big=0;r.forEach((x,i)=>{if(x>r[big])big=i});r[big]+=d;return r}
function tablePass(doc,body,rep){
  const ch=elems(body);let nUni=0,nStr=0;
  /* a) cụm bảng liền nhau cùng số cột */
  let i=0;
  while(i<ch.length){
    if(!ln(ch[i],'tbl')){i++;continue}
    const grp=[ch[i]];let j=i+1;
    while(j<ch.length){
      if(ln(ch[j],'p')&&!ptext(ch[j]).trim()&&!all(ch[j],'drawing').length){j++;continue}
      if(ln(ch[j],'tbl')&&gridOf(ch[j]).length===gridOf(grp[0]).length)grp.push(ch[j]);else break;j++}
    const n=gridOf(grp[0]).length;
    if(grp.length>=2&&n>=6){
      const aw=sectWidthAt(body,grp[0]);
      /* bảng mẫu: mảnh có cột hẹp nhất rộng nhất (cân đối nhất) */
      let ref=grp[0],rm=-1;grp.forEach(t=>{const g=gridOf(t),m=Math.min.apply(null,g);if(m>rm){rm=m;ref=t}});
      const ti=kid(kid(ref,'tblPr'),'tblInd'),ind=ti?tw(wa(ti,'w')):0;
      /* cột số (hẹp) chỉ cần ~1 cm; phần còn lại dành cho các cột chữ theo tỉ lệ gốc của mảnh mẫu */
      const rg=gridOf(ref),NUM=560,isN=rg.map(x=>x<1000),nN=isN.filter(Boolean).length,rest=aw-ind-nN*NUM;
      const tsum=rg.reduce((a,x,k)=>a+(isN[k]?0:x),0)||1;
      let w=nN&&nN<n&&rest>0?rg.map((x,k)=>isN[k]?NUM:Math.floor(x*rest/tsum)):scaleTo(rg,aw-ind,0);
      {const d=aw-ind-w.reduce((a,b)=>a+b,0);let big=0;w.forEach((x,k)=>{if(x>w[big])big=k});w[big]+=d}
      grp.forEach(t=>{const old=gridOf(t).join();applyGrid(doc,t,w,ind);if(old!==w.join())nUni++})}
    i=j>i+1?j:i+1}
  /* b) bảng hẹp so với vùng chữ */
  Array.from(body.childNodes).filter(e=>ln(e,'tbl')).forEach(t=>{
    const g=gridOf(t);if(g.length<2)return;
    const ti=kid(kid(t,'tblPr'),'tblInd'),ind=ti?tw(wa(ti,'w')):0,tot=g.reduce((a,b)=>a+b,0),aw=sectWidthAt(body,t);
    if((tot+ind)/aw>=0.97)return;
    /* chỉ giãn bảng khung tiêu đề, chữ ký, bảng nội dung; bỏ qua bảng 1 hàng nhỏ (đáp án A–D thụt lề có chủ đích) */
    const tx=ttext(t);if(/^\s*A\.\s/.test(tx)&&kids(t,'tr').length<=2)return;
    const nw=scaleTo(g,aw-ind,0);applyGrid(doc,t,nw,ind);nStr++});
  if(nUni)rep.fix('Đề thi: bảng bị chia nhiều mảnh (ma trận/đặc tả) — dùng chung một bộ độ rộng cột cân đối cho cả cụm',nUni);
  if(nStr)rep.fix('Đề thi: bảng quá hẹp so với vùng chữ đã giãn cho vừa bề rộng (khung tiêu đề, chữ ký...)',nStr)}

/* ================== 8. GIỮ SỐ TRANG ĐỀ THI ==================
   Đề ghi "(Đề kiểm tra gồm N trang)" nhưng sau khi chuẩn hóa (chữ 14, giãn dòng 1.15, cách đoạn 6pt) lại dài hơn N trang.
   Ước lượng chiều cao nội dung từng đề (đo bề rộng chữ, tự xuống dòng, bảng, ngắt trang) rồi THU GỌN DẦN chỉ trong đề đó:
   cách đoạn → giãn dòng → cỡ chữ (từng 0,5pt, không nhỏ hơn 12pt) cho đến khi vừa N trang (chừa ~4% dự phòng).
   Không thu gọn nếu đề đã vừa N trang. Không động tới ma trận, đặc tả, đáp án, phiếu trả lời. */
const CW=c=>/\d/.test(c)?.5:/\p{Lu}/u.test(c)?.68:/\s/.test(c)?.25:/[.,;:'"!()\-]/.test(c)?.32:.47;
const tw=n=>+n||0;
function pgBox(sp){const z=sp&&kid(sp,'pgSz'),m=sp&&kid(sp,'pgMar');
  const w=z?tw(wa(z,'w')):11906,h=z?tw(wa(z,'h')):16838;
  const L=m?tw(wa(m,'left')):1134,R=m?tw(wa(m,'right')):1134,T=m?tw(wa(m,'top')):1134,B=m?tw(wa(m,'bottom')):1134;
  return{aw:Math.max(2000,w-L-R),ah:Math.max(3000,h-T-B)}}
function szOf(r,p,def){const g=n=>{const e=n&&kid(n,'sz');return e?tw(wa(e,'val'))/2:0};
  return g(kid(r,'rPr'))||g(kid(kid(p,'pPr'),'rPr'))||def}
/* chiều cao (pt) của một đoạn, với hệ số điều chỉnh m={d:giảm cỡ chữ(pt), l:hệ số giãn dòng tối đa, a:hệ số cách đoạn} */
function paraH(p,aw,def,m){
  const pp=kid(p,'pPr'),sp=pp&&kid(pp,'spacing'),ind=pp&&kid(pp,'ind');
  let before=sp?tw(wa(sp,'before'))/20:0,after=sp?tw(wa(sp,'after'))/20:0;
  const line=sp&&wa(sp,'line')?tw(wa(sp,'line')):240,rule=sp&&wa(sp,'lineRule')||'auto';
  const left=ind?tw(wa(ind,'left')||wa(ind,'start')):0,right=ind?tw(wa(ind,'right')||wa(ind,'end')):0,hang=ind?tw(wa(ind,'hanging')):0;
  const avail=Math.max(1200,aw-left-right)/20;
  let maxsz=0,x=0,lines=1;
  const items=[];                                  // [chiều rộng chữ (pt), có thể ngắt sau không, cỡ chữ]
  all(p,'r').forEach(r=>{const sz0=szOf(r,p,def),sz=sz0>=10?Math.max(12,sz0-m.d):sz0,bold=!!kid(kid(r,'rPr'),'b');
    Array.from(r.childNodes).forEach(c=>{if(c.nodeType!==1||c.namespaceURI!==W)return;
      if(c.localName==='t'){maxsz=Math.max(maxsz,sz);
        (c.textContent.match(/\S+\s*|\s+/g)||[]).forEach(w=>{let ww=0;for(const ch of w)ww+=CW(ch)*sz*(bold?1.05:1);items.push([ww,0,sz])})}
      else if(c.localName==='tab'){maxsz=Math.max(maxsz,sz);items.push([sz*2,0,sz])}
      else if(c.localName==='br'&&wa(c,'type')!=='page')items.push([0,1,sz])})});
  if(!maxsz)maxsz=def>=10?Math.max(12,def-m.d):def;
  x=0;items.forEach(it=>{if(it[1]){lines++;x=0;return}
    if(x+it[0]>avail+0.5&&x>0){lines++;x=it[0]}else x+=it[0]});
  if(!/^auto$/.test(rule)){var lh=line/20}
  else{var f=Math.min(line,Math.round(240*m.l))/240;lh=maxsz*1.15*f}
  if(/^auto$/.test(rule)&&line<240)lh=maxsz*1.15*line/240;
  return lines*lh+before+after*m.a}
function tblH(t,aw,def,m){
  const g=kid(t,'tblGrid'),cols=g?kids(g,'gridCol').map(c=>tw(wa(c,'w'))):[];let tot=0;
  kids(t,'tr').forEach(tr=>{let mh=0,ci=0;
    kids(tr,'tc').forEach(tc=>{const pr=kid(tc,'tcPr'),w=pr&&kid(pr,'tcW'),span=pr&&kid(pr,'gridSpan');
      const n=span?tw(wa(span,'val'))||1:1;let cw=w&&tw(wa(w,'w'))?tw(wa(w,'w')):cols.slice(ci,ci+n).reduce((a,b)=>a+b,0)||aw/(cols.length||1);ci+=n;
      let h=0;kids(tc).forEach(e=>{if(ln(e,'p'))h+=paraH(e,Math.max(600,cw-216),def,m);else if(ln(e,'tbl'))h+=tblH(e,cw-216,def,m)});
      mh=Math.max(mh,h+2)});
    const trp=kid(tr,'trPr'),th=trp&&kid(trp,'trHeight');const hv=th?tw(wa(th,'val'))/20:0;
    tot+=Math.max(mh,hv)});
  return tot}
/* số trang ước lượng của một dãy phần tử (bắt đầu ở đầu trang) */
function estPages(els,box,def,m){
  const H=box.ah/20;let page=1,used=0;
  els.forEach(e=>{let h=0;
    if(ln(e,'p')){
      const pp=kid(e,'pPr');
      if(pp&&kid(pp,'pageBreakBefore')&&used>0){page++;used=0}
      h=paraH(e,box.aw,def,m);
      const room=H-used;
      if(h>room&&used>0&&h<=H*0.5){ if(room<h*0.5||h<=40){page++;used=0} }   // đoạn ngắn không chẻ đôi trang
      used+=h;while(used>H){used-=H;page++}
      if(Array.from(e.getElementsByTagNameNS(W,'br')).some(b=>wa(b,'type')==='page')){page++;used=0}
    }else if(ln(e,'tbl')){
      h=tblH(e,box.aw,def,m);
      if(h<=H*0.5&&h>H-used){page++;used=0}
      used+=h;while(used>H){used-=H;page++}}});
  return page-1+used/H}
function fitPass(doc,body,rep,opt,def){
  const ch=elems(body);let nFit=0;const warn=[];
  for(let i=0;i<ch.length;i++){
    const m=/Đề kiểm tra gồm\s*(\d+)\s*trang/i.exec(ln(ch[i],'tbl')||ln(ch[i],'p')?ttext(ch[i]):'');if(!m)continue;
    if(ln(ch[i],'tbl')&&all(ch[i],'tbl').length>1)continue;
    const N=+m[1];if(!N||N>6)continue;
    /* điểm đầu: phần tử đầu của đề (bảng khung tiêu đề ngay trước hoặc chính nó); điểm cuối: "- Hết -" đầu tiên sau đó */
    let a=i;while(a>0&&!(ln(ch[a],'tbl')&&/UBND|TRƯỜNG|SỞ GD|PHÒNG GD/.test(ttext(ch[a]).slice(0,120)))&&i-a<3)a--;
    let b=-1;for(let k=i;k<ch.length;k++){if(ln(ch[k],'p')&&/^[-–—\s]*Hết[-–—\s]*$/i.test(ptext(ch[k]).trim())){b=k;break}
      if(k>i&&ln(ch[k],'tbl')&&/Đề kiểm tra gồm/i.test(ttext(ch[k])))break}
    if(b<0)continue;
    const els=ch.slice(a,b+1);
    /* hộp trang của section chứa đề */
    let sp=null;for(let k=b;k<ch.length&&!sp;k++){const e=ch[k];sp=ln(e,'sectPr')?e:(ln(e,'p')?kid(kid(e,'pPr')||e,'sectPr'):null)}
    const box=pgBox(sp||kid(body,'sectPr'));
    const M0={d:0,l:9,a:1},cap=N*0.96;
    const e0=estPages(els,box,def,M0);
    if(e0<=cap)continue;
    /* thang thu gọn: [giảm cỡ chữ pt, giãn dòng tối đa, hệ số cách đoạn] */
    const ladder=[];
    [[0,1.15,.5],[0,1.08,.3],[0,1,0]].forEach(x=>ladder.push({d:x[0],l:x[1],a:x[2]}));
    for(let d=.5;d<=2;d+=.5)ladder.push({d:d,l:1,a:0});
    let pick=null;for(const L of ladder){if(estPages(els,box,def,L)<=cap){pick=L;break}}
    if(!pick){pick=ladder[ladder.length-1];warn.push('Đề ghi '+N+' trang nhưng sau khi thu nhỏ tối đa (chữ '+(def-2)+'pt) vẫn ước lượng khoảng '+estPages(els,box,def,pick).toFixed(1)+' trang — hãy xem lại tay.')}
    /* áp dụng */
    els.forEach(e=>{
      (ln(e,'p')?[e]:all(e,'p')).forEach(p=>{
        const pp=kid(p,'pPr')||p.insertBefore(mk(doc,'pPr'),p.firstChild);
        let sp2=kid(pp,'spacing');
        if(sp2){const af=tw(wa(sp2,'after'));if(af)sa(sp2,'after',Math.round(af*pick.a));
          if(wa(sp2,'line')&&(wa(sp2,'lineRule')||'auto')==='auto'&&tw(wa(sp2,'line'))>240)sa(sp2,'line',Math.min(tw(wa(sp2,'line')),Math.round(240*pick.l)))}
      });
      if(pick.d)all(e,'sz').concat(all(e,'szCs')).forEach(z=>{const v=tw(wa(z,'val'));if(v>=20)sa(z,'val',Math.min(v,Math.max(24,v-Math.round(pick.d*2))))});
    });
    nFit++;
    rep.fix('Đề thi: giữ đúng '+N+' trang cho đề ở “'+ttext(els[0]).slice(0,30).trim()+'…” (ước lượng '+e0.toFixed(2)+' → '+estPages(els,box,def,{d:0,l:9,a:1}).toFixed(2)+' trang; thu gọn cách đoạn'+(pick.l<1.15?'/giãn dòng':'')+(pick.d?'/chữ −'+pick.d+'pt':'')+')',1);
  }
  warn.forEach(w=>rep.warn('Đề thi: '+w));
  return nFit}

/* ================== ĐỐI CHIẾU CHỮ TRƯỚC/SAU ==================
   Đếm từng "từ" (chữ/số) trong toàn bộ nội dung trước và sau khi sửa. Từ nào bị MẤT (ít đi so với trước) thì báo cảnh báo,
   để bắt các trường hợp như mất "A, B, C." ở phương án D. Cả. Chữ chỉ được SỬA có chủ đích (năm học, chính tả) thì bỏ qua. */
function wordBag(body){const m=new Map();
  all(body,'p').forEach(p=>{const s=ptext(p).replace(/\t/g,' ');
    (s.match(/[\p{L}\p{N}]+/gu)||[]).forEach(w=>{w=w.toLowerCase();m.set(w,(m.get(w)||0)+1)})});
  return m}
function checkLoss(a,b,rep){
  const lost=[];
  a.forEach((n,w)=>{const k=b.get(w)||0;if(k<n)lost.push([w,n-k])});
  /* bỏ qua phần chữ thay đổi có chủ đích: số năm học và dạng chữ cũ */
  const ign=/^(20\d\d\d?|cáng|dạng|nan)$/;
  const real=lost.filter(([w])=>!ign.test(w));
  if(!real.length)return;
  const tot=real.reduce((t,x)=>t+x[1],0);
  /* các chữ cái đơn A-D hay bị lặp rồi xóa hợp lệ (nhãn đáp án dựng lại) → chỉ cảnh báo khi mất NHIỀU hơn số nhãn dựng lại */
  const sh=real.slice(0,12).map(([w,n])=>'“'+w+'”'+(n>1?'×'+n:'')).join(', ');
  if(rep.warn)rep.warn('Đề thi: đối chiếu chữ trước/sau sửa thấy '+tot+' từ ít đi ('+sh+(real.length>12?'…':'')+') — hãy kiểm tra các câu liên quan trong file kết quả');
}

/* ================== API ================== */
async function apply(buf,rep,opt){
  rep=rep||{fix(){},warn(){}};opt=opt||{};
  if(typeof JSZip==='undefined')throw new Error('thiếu JSZip');
  const zip=await JSZip.loadAsync(buf),f=zip.file('word/document.xml');if(!f)return buf;
  const xml=await f.async('string');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)return buf;
  const body=doc.getElementsByTagNameNS(W,'body')[0];if(!body)return buf;
  const info={maxQ:0};
  let def=12;{const sf=zip.file('word/styles.xml');
    if(sf){try{const sd=new DOMParser().parseFromString(await sf.async('string'),'application/xml'),dz=sd.getElementsByTagNameNS(W,'docDefaults')[0],z=dz&&dz.getElementsByTagNameNS(W,'sz')[0];if(z&&tw(wa(z,'val')))def=tw(wa(z,'val'))/2}catch(e){}}}
  info.def=def;
  const before=wordBag(body);
  fixYears(doc,body,rep);
  const isExam=questionPass(doc,body,rep,info);
  if(!isExam)return buf;
  groupPass(doc,body,rep,info);
  sectPass(doc,body,rep);
  sheetPass(doc,body,rep,info);
  if(opt.balanceTables!==false){try{tablePass(doc,body,rep)}catch(e){rep.warn('Đề thi: bước cân đối bảng gặp lỗi và đã bỏ qua: '+e.message)}}
  if(opt.keyIndent!==false){try{keyPass(doc,body,rep)}catch(e){rep.warn('Đề thi: bước đồng nhất thụt lề đáp án gặp lỗi và đã bỏ qua: '+e.message)}}
  if(opt.fitPages!==false){
    try{fitPass(doc,body,rep,opt,def)}catch(e){rep.warn('Đề thi: bước giữ số trang gặp lỗi và đã bỏ qua: '+e.message)}}
  checkLoss(before,wordBag(body),rep);
  let out=new XMLSerializer().serializeToString(doc);
  if(!/^<\?xml/.test(out))out='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+out;
  zip.file('word/document.xml',out);
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'})}
global.WordDeThiFix={apply};
if(typeof module!=='undefined')module.exports=global.WordDeThiFix;
})(typeof window!=='undefined'?window:globalThis);
