/* =====================================================================
   word-flow-fix.js  —  "Gỡ bố cục giả của file Word chuyển từ PDF"
   Chạy TRƯỚC khi chuẩn hóa / rà soát. Làm việc trên DOM của word/document.xml.

   API:  WordFlowFix(doc, opt) -> {fix:{...}, warn:[...]}
         doc : Document (đã parse word/document.xml)
         opt : {optInd:284, flatCols:true, dots:true}

   Xử lý (mỗi mục đều cho ra báo cáo trong rep.fix):
   1. Cột giả (section 2 cột + ngắt cột)            -> 1 cột
   2. Hộp văn bản nổi chứa đáp án A/B/C/D           -> bảng đáp án thật ngay dưới câu hỏi
   3. Một đoạn chứa nhiều "Câu n." (Câu 15+16+17)   -> tách thành từng đoạn riêng
   4. Bảng đáp án A/B/C/D cũ (PDF) và bảng mới      -> dựng lại 4 cột / 2x2 / 1 cột, đều chữ, không viền
   5. Đoạn đệm cỡ chữ 2-3pt giữa câu hỏi và đáp án  -> xóa
   6. Hình chữ nhật nổi "Đề số 1", "BÀI LÀM ĐỀ SỐ.." -> viền đoạn văn (không phụ thuộc dấu cách)
   7. Hộp chữ "ĐỀ CHÍNH THỨC" nổi, nằm đè tiêu đề   -> xóa (báo cáo)
   8. Phiếu trả lời: các hộp lưới A B C D           -> bảng bố cục thật (không nổi)
   9. Dòng chấm ……… dài                              -> tab dẫn chấm tới lề phải (không bị rớt dòng)
  10. Thụt lề giả (căn giữa bằng ind) ở khung tiêu đề -> căn giữa thật
  11. Khoảng cách chữ (w:spacing/w:position) lẻ      -> bỏ
   ===================================================================== */
(function(){
'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  WP='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  PIC='http://schemas.openxmlformats.org/drawingml/2006/picture',
  XMLNS='http://www.w3.org/XML/1998/namespace';
const ORD={
 pPr:'pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange'.split(' '),
 tblPr:'tblStyle tblpPr tblOverlap bidiVisual tblStyleRowBandSize tblStyleColBandSize tblW jc tblCellSpacing tblInd tblBorders shd tblLayout tblCellMar tblLook'.split(' ')};
const one=(p,n)=>p?Array.from(p.children).find(c=>c.localName===n&&c.namespaceURI===W)||null:null;
const wk=(p,n)=>Array.from(p.children).filter(c=>c.localName===n&&c.namespaceURI===W);
const all=(r,n)=>Array.from(r.getElementsByTagNameNS(W,n));
const mk=(d,n)=>d.createElementNS(W,'w:'+n);
const sa=(e,n,v)=>{e.setAttributeNS(W,'w:'+n,String(v));return e};
const ga=(e,n)=>e?e.getAttributeNS(W,n)||'':'';
const anc=(e,n)=>{for(let p=e.parentNode;p&&p.nodeType===1;p=p.parentNode)if(p.localName===n&&p.namespaceURI===W)return p;return null};
const setXS=t=>{if(/^\s|\s$/.test(t.textContent))t.setAttributeNS(XMLNS,'xml:space','preserve')};
function sc(d,par,n,ord){let e=one(par,n);if(e)return e;e=mk(d,n);const i=ord.indexOf(n);let ref=null;
  for(const c of Array.from(par.children)){const k=c.namespaceURI===W?ord.indexOf(c.localName):-1;if(k>i){ref=c;break}}
  par.insertBefore(e,ref);return e}
const inBox=(t,stop)=>{for(let p=t.parentNode;p&&p!==stop;p=p.parentNode)if(p.localName==='txbxContent'&&p.namespaceURI===W)return true;return false};
const ownText=p=>all(p,'t').filter(t=>!inBox(t,p)).map(t=>t.textContent).join('');
const fullText=e=>all(e,'t').map(t=>t.textContent).join('');
const squash=s=>s.replace(/[\s\u00a0]+/g,' ').trim();
/* chữ có ngăn cách: mỗi đoạn / tab / ngắt dòng = 1 dấu cách (fullText dính liền chữ giữa các đoạn nên \sB không khớp) */
const spText=e=>{const out=[];let cur='';const walk=n=>{for(const c of Array.from(n.childNodes)){if(c.nodeType!==1)continue;
  if(c.namespaceURI===W&&c.localName==='t')cur+=c.textContent;
  else if(c.namespaceURI===W&&(c.localName==='tab'||c.localName==='br'||c.localName==='cr'))cur+=' ';
  else{walk(c);if(c.namespaceURI===W&&(c.localName==='p'||c.localName==='tc')){out.push(cur);cur=''}}}};
  walk(e);out.push(cur);return squash(out.join(' '))};
const isP=e=>e&&e.localName==='p'&&e.namespaceURI===W;
const isTbl=e=>e&&e.localName==='tbl'&&e.namespaceURI===W;
const stripIds=e=>{[e].concat(Array.from(e.getElementsByTagName('*'))).forEach(x=>Array.from(x.attributes).forEach(a=>{if(a.localName==='paraId'||a.localName==='textId')x.removeAttributeNode(a)}));return e};
const STEM=/^\s*(Câu|CÂU|Bài|BÀI)\s*\d+\s*[.:]/;

/* ---------- khổ giấy: bề rộng vùng chữ của section chứa phần tử ---------- */
function awOf(sp){const z=one(sp,'pgSz'),m=one(sp,'pgMar');if(!z||!m)return 9900;return Math.max(3000,(+ga(z,'w'))-(+ga(m,'left'))-(+ga(m,'right')))}
function secOf(body,el){let top=el;while(top&&top.parentNode!==body)top=top.parentNode;
  for(let n=top;n;n=n.nextElementSibling){const sp=n.localName==='sectPr'?n:(isP(n)?one(one(n,'pPr'),'sectPr'):null);if(sp)return sp}
  return one(body,'sectPr')}
const awAt=(body,el)=>{const tc=anc(el,'tc');if(tc){const w=one(one(tc,'tcPr'),'tcW');if(w&&+ga(w,'w'))return +ga(w,'w')}return awOf(secOf(body,el))};

/* ---------- thông tin hộp nổi ---------- */
function boxInfo(an){
  const k=n=>Array.from(an.children).find(c=>c.localName===n&&c.namespaceURI===WP);
  const off=x=>{const o=x&&x.getElementsByTagNameNS(WP,'posOffset')[0];return o?+o.textContent:0};
  const ex=k('extent'),ph=k('positionH'),pv=k('positionV');
  return{an,cx:ex?+ex.getAttribute('cx'):0,cy:ex?+ex.getAttribute('cy'):0,h:off(ph),v:off(pv),hRel:ph?ph.getAttribute('relativeFrom'):'',
    behind:an.getAttribute('behindDoc')==='1',tb:an.getElementsByTagNameNS(W,'txbxContent')[0]||null,
    pic:!!an.getElementsByTagNameNS(PIC,'pic').length,
    host:(()=>{for(let p=an.parentNode;p;p=p.parentNode)if(isP(p)&&!inBox(p,null))return p;return null})()}}
function dropAnchor(an){let r=an;while(r&&!(r.localName==='r'&&r.namespaceURI===W))r=r.parentNode;if(r&&r.parentNode)r.parentNode.removeChild(r)}
const isOptBox=tb=>{const t=spText(tb);return /^A\s*[.)]/.test(t)&&/\sB\s*[.)]/.test(t)&&/\sC\s*[.)]/.test(t)};

/* ---------- làm sạch run ---------- */
function cleanRun(r){const rp=one(r,'rPr');if(!rp)return;
  ['spacing','w','fitText'].forEach(n=>{const e=one(rp,n);if(e)rp.removeChild(e)});
  const ps=one(rp,'position');if(ps&&Math.abs(+ga(ps,'val'))<=4)rp.removeChild(ps)}

/* ===================================================================
   1. CỘT GIẢ
   =================================================================== */
function flattenCols(d,body,rep){let n=0;
  all(d,'sectPr').forEach(sp=>{const c=one(sp,'cols');if(c&&(+ga(c,'num')||1)>1){sa(c,'num',1);wk(c,'col').forEach(x=>c.removeChild(x));c.removeAttributeNS(W,'equalWidth');n++}});
  if(n){let b=0;all(body,'br').forEach(x=>{if(ga(x,'type')==='column'&&!inBox(x,null)){const r=x.parentNode;r.removeChild(x);b++;
      if(r.parentNode&&!Array.from(r.children).some(c=>c.localName!=='rPr')){const p=r.parentNode;r.parentNode.removeChild(r);void p}}});
    rep.fix['cột giả (section nhiều cột/ngắt cột của PDF) → 1 cột']=n+(b?' (+'+b+' ngắt cột)':'')}}

/* ===================================================================
   2-3. TÁCH ĐOẠN CHỨA NHIỀU "Câu n."
   =================================================================== */
function splitStems(P){
  const pieces=[];let pos=0,bad=false;
  Array.from(P.children).forEach(c=>{
    if(c.localName==='pPr')return;
    if(c.localName==='r'&&c.namespaceURI===W){
      const ts=wk(c,'t'),others=Array.from(c.children).filter(x=>x.localName!=='rPr'&&x.localName!=='t'&&x.localName!=='AlternateContent'&&x.localName!=='drawing'&&x.localName!=='pict');
      if(ts.length>1||others.length){if(ts.length)bad=true;return}
      if(ts.length===1){const s=ts[0].textContent;pieces.push({run:c,t:ts[0],start:pos,end:pos+s.length});pos+=s.length}
    }else if(all(c,'t').length)bad=true});
  if(bad)return[P];
  const s=pieces.map(x=>x.t.textContent).join('');
  const cuts=[];const re=/(^|[\s?.!:;)])((?:Câu|CÂU|Bài|BÀI)\s*\d+\s*[.:])/g;let m;
  while((m=re.exec(s))){const k=m.index+m[1].length;if(k>0&&s.slice(0,k).trim())cuts.push(k)}
  if(!cuts.length)return[P];
  const segs=[P];
  for(let ci=cuts.length-1;ci>=0;ci--){const k=cuts[ci];let node=null;
    for(const pc of pieces){
      if(k===pc.start){node=pc.run;break}
      if(k>pc.start&&k<pc.end){const full=pc.t.textContent,off=k-pc.start,r2=pc.run.cloneNode(true),t2=wk(r2,'t')[0];
        pc.t.textContent=full.slice(0,off);setXS(pc.t);t2.textContent=full.slice(off);setXS(t2);
        pc.run.parentNode.insertBefore(r2,pc.run.nextSibling);node=r2;break}}
    if(!node)continue;
    const P2=stripIds(P.cloneNode(false)),pp=one(P,'pPr');if(pp)P2.appendChild(stripIds(pp.cloneNode(true)));
    let x=node;const mv=[];while(x){mv.push(x);x=x.nextSibling}
    mv.forEach(y=>P2.appendChild(y));
    P.parentNode.insertBefore(P2,P.nextSibling);segs.splice(1,0,P2)}
  return segs}

/* ===================================================================
   4. DỰNG LẠI BẢNG ĐÁP ÁN
   =================================================================== */
const CWf=c=>/\d/.test(c)?.5:/\p{Lu}/u.test(c)?.68:/\s/.test(c)?.25:/[.,;:'"!()\-]/.test(c)?.32:.47;
function readOptions(box){
  const opts=[];let cur=null;
  for(const p of all(box,'p')){
    const rs=Array.from(p.children).filter(c=>c.localName==='r'&&c.namespaceURI===W);
    const tr=rs.map(r=>fullText(r)).join('').trim();
    if(!tr){if(Array.from(p.children).some(c=>c.localName!=='pPr'&&c.localName!=='r'&&!/^(proofErr|bookmark)/.test(c.localName)))return null;continue}
    const m=/^([A-D])\s*[.)]/.exec(tr),nx=cur?String.fromCharCode(cur.label.charCodeAt(0)+1):'A';
    if(m&&m[1]===nx){cur={label:m[1],runs:[],pStyle:ga(one(one(p,'pPr'),'pStyle'),'val')};opts.push(cur)}
    else if(!cur)return null;
    else if(cur.runs.length){const br=mk(p.ownerDocument,'r');br.appendChild(mk(p.ownerDocument,'br'));cur.runs.push(br)}
    rs.forEach(r=>{const c=r.cloneNode(true);cleanRun(c);cur.runs.push(c)})}
  if(opts.length<2)return null;
  opts.forEach(o=>{const ts=o.runs.flatMap(r=>all(r,'t'));
    for(const t of ts){const v=t.textContent.replace(/^[\s\u00a0\t]+/,'');if(v!==t.textContent)t.textContent=v;if(v)break}
    for(const t of ts.slice().reverse()){const v=t.textContent.replace(/[\s\u00a0\t]+$/,'');if(v!==t.textContent)t.textContent=v;if(v)break}
    o.runs.forEach(r=>{all(r,'tab').forEach(x=>x.parentNode.removeChild(x))})});
  return opts}
function optW(o,pt){let t=0;o.runs.forEach(r=>{const rp=one(r,'rPr'),se=rp&&one(rp,'sz'),p=se?(+ga(se,'val'))/2:pt,b=rp&&one(rp,'b')?1.07:1;
    all(r,'t').forEach(x=>{for(const ch of x.textContent)t+=CWf(ch)*p*20*b})});return t*1.08}
function basePt(opts){for(const o of opts)for(const r of o.runs){const rp=one(r,'rPr'),s=rp&&one(rp,'sz');if(s)return(+ga(s,'val'))/2}return 14}
function buildOptTable(d,opts,aw,IND){
  const n=opts.length,pt=basePt(opts),avail=aw-IND,mx=Math.max(...opts.map(o=>optW(o,pt)))+160;
  let cols=1;for(const k of (n===3?[3,1]:[4,3,2,1])){if(k<=n&&mx<=avail/k){cols=k;break}}
  if(n===4&&cols===3)cols=2;
  const rows=Math.ceil(n/cols),cw=Math.floor(avail/cols);
  const t=mk(d,'tbl'),pr=mk(d,'tblPr');t.appendChild(pr);
  sa(sc(d,pr,'tblW',ORD.tblPr),'w',cw*cols);sa(one(pr,'tblW'),'type','dxa');
  sa(sc(d,pr,'tblInd',ORD.tblPr),'w',IND);sa(one(pr,'tblInd'),'type','dxa');
  const b=sc(d,pr,'tblBorders',ORD.tblPr);['top','left','bottom','right','insideH','insideV'].forEach(x=>{const e=mk(d,x);sa(e,'val','nil');b.appendChild(e)});
  sa(sc(d,pr,'tblLayout',ORD.tblPr),'type','fixed');
  const cm=sc(d,pr,'tblCellMar',ORD.tblPr);[['top',0],['left',0],['bottom',0],['right',60]].forEach(([x,v])=>{const e=mk(d,x);sa(e,'w',v);sa(e,'type','dxa');cm.appendChild(e)});
  const lk=sc(d,pr,'tblLook',ORD.tblPr);sa(lk,'val','0000');
  const g=mk(d,'tblGrid');for(let i=0;i<cols;i++)sa(mk(d,'gridCol'),'w',cw),g.appendChild(sa(mk(d,'gridCol'),'w',cw));
  // (tạo gridCol đúng 1 lần mỗi cột)
  while(g.firstChild&&g.children.length>cols)g.removeChild(g.firstChild);
  t.appendChild(g);
  for(let r=0;r<rows;r++){
    const tr=mk(d,'tr'),tp=mk(d,'trPr');tp.appendChild(mk(d,'cantSplit'));tr.appendChild(tp);
    for(let c=0;c<cols;c++){
      const o=opts[r*cols+c],tc=mk(d,'tc'),cp=mk(d,'tcPr');
      sa(sa(mk(d,'tcW'),'w',cw),'type','dxa');cp.appendChild(one(cp,'tcW')||sa(sa(mk(d,'tcW'),'w',cw),'type','dxa'));
      tc.appendChild(cp);
      const p=mk(d,'p'),pp=mk(d,'pPr');
      if(o&&o.pStyle)sa(sc(d,pp,'pStyle',ORD.pPr),'val',o.pStyle);
      if(r<rows-1)sc(d,pp,'keepNext',ORD.pPr);
      const sp=sc(d,pp,'spacing',ORD.pPr);sa(sp,'before',0);sa(sp,'after',0);sa(sp,'line',264);sa(sp,'lineRule','auto');
      const ind=sc(d,pp,'ind',ORD.pPr);sa(ind,'left',0);sa(ind,'right',0);sa(ind,'firstLine',0);
      sa(sc(d,pp,'jc',ORD.pPr),'val','left');
      p.appendChild(pp);
      if(o)o.runs.forEach(x=>{const rp=one(x,'rPr');if(!rp||!one(rp,'sz')){const q=rp||(()=>{const e=mk(d,'rPr');x.insertBefore(e,x.firstChild);return e})();sa(sc(d,q,'sz',['rStyle','rFonts','b','bCs','i','iCs','caps','smallCaps','strike','dstrike','outline','shadow','emboss','imprint','noProof','snapToGrid','vanish','webHidden','color','spacing','w','kern','position','sz','szCs']),'val',Math.round(pt*2))}p.appendChild(x)});
      tc.appendChild(p);tr.appendChild(tc)}
    t.appendChild(tr)}
  return t}
const isBordered=t=>{const pr=one(t,'tblPr');return !!(one(pr,'tblStyle')||(one(pr,'tblBorders')&&Array.from(one(pr,'tblBorders').children).some(c=>ga(c,'val')!=='nil'&&ga(c,'val')!=='none'))||all(t,'tcBorders').length)};
function rebuildOptionTables(d,body,rep,IND){let n=0;
  Array.from(body.getElementsByTagNameNS(W,'tbl')).forEach(t=>{
    if(anc(t,'tbl')||anc(t,'txbxContent'))return;
    const tx=spText(t);if(!/^A\s*[.)]/.test(tx)||!/\sB\s*[.)]/.test(tx))return;
    if(wk(t,'tr').length>4||isBordered(t))return;
    const opts=readOptions(t);if(!opts)return;
    // an toàn: chữ trong bảng cũ phải còn đủ trong bảng mới
    const nt=buildOptTable(d,opts,awAt(body,t),IND);
    if(squash(fullText(nt)).replace(/\s/g,'')!==tx.replace(/\s/g,'')){rep.warn.push('Bảng đáp án “'+tx.slice(0,30)+'…” giữ nguyên (dựng lại sẽ lệch chữ)');return}
    t.parentNode.replaceChild(nt,t);n++});
  if(n)rep.fix['bảng đáp án A/B/C/D dựng lại (đều cột, không viền, không thụt lệch)']=n}

/* 4b. 4 đoạn liên tiếp "A." "B." "C." "D." (vd. vừa lấy ra từ hộp nổi) -> bảng đáp án */
function paraOptionRuns(d,body,rep,IND){let n=0;
  const lab=p=>{const m=/^([A-D])\s*[.)]/.exec(spText(p));return m?m[1]:''};
  const okP=p=>isP(p)&&!hasStuff(p)&&spText(p).length>2&&spText(p).length<220&&!one(one(p,'pPr'),'numPr');
  const scan=par=>{const kids=Array.from(par.children);
    for(let i=0;i<kids.length;i++){
      if(!okP(kids[i])||lab(kids[i])!=='A')continue;
      const grp=[kids[i]];let want='B';
      for(let j=i+1;j<kids.length&&okP(kids[j])&&lab(kids[j])===want&&want<='D';j++){grp.push(kids[j]);want=String.fromCharCode(want.charCodeAt(0)+1)}
      if(grp.length<4)continue;
      const w=mk(d,'tc');grp.forEach(x=>w.appendChild(x.cloneNode(true)));
      const opts=readOptions(w);if(!opts||opts.length!==grp.length)continue;
      const nt=buildOptTable(d,opts,awAt(body,grp[0]),IND);
      if(spText(nt).replace(/\s/g,'')!==grp.map(spText).join('').replace(/\s/g,'')){rep.warn.push('Đáp án “'+spText(grp[0]).slice(0,25)+'…” giữ nguyên (dựng bảng sẽ lệch chữ)');continue}
      par.insertBefore(nt,grp[0]);grp.forEach(x=>par.removeChild(x));
      if(par.localName==='tc'&&!isP(nt.nextElementSibling))par.insertBefore(tinyP(d),nt.nextSibling);
      n++;i=kids.indexOf(grp[grp.length-1])}};
  scan(body);Array.from(body.getElementsByTagNameNS(W,'tc')).forEach(tc=>{if(!anc(tc,'txbxContent'))scan(tc)});
  if(n)rep.fix['đáp án A/B/C/D rời từng dòng → bảng đáp án đều cột']=n}

/* ===================================================================
   5. ĐOẠN ĐỆM NHỎ GIỮA CÂU HỎI VÀ ĐÁP ÁN
   =================================================================== */
function paraMarkSz(p){const pp=one(p,'pPr'),rp=pp&&one(pp,'rPr'),s=rp&&one(rp,'sz');return s?+ga(s,'val'):null}
const hasStuff=p=>p.getElementsByTagNameNS(W,'drawing').length||p.getElementsByTagNameNS(W,'pict').length||p.getElementsByTagNameNS(W,'sectPr').length||all(p,'br').length||all(p,'fldChar').length;
function microSpacers(body,rep){let n=0;
  Array.from(body.children).forEach(p=>{
    if(!isP(p)||fullText(p).trim()||hasStuff(p))return;
    const sz=paraMarkSz(p),pv=p.previousElementSibling,nx=p.nextElementSibling;
    if(sz!==null&&sz<=14&&isP(pv)&&fullText(pv).trim()&&isTbl(nx)){body.removeChild(p);n++}});
  if(n)rep.fix['đoạn đệm cỡ 2–7pt giữa câu hỏi và đáp án (gây khoảng cách phình ra) đã xóa']=n}

/* ===================================================================
   6-7. KHUNG TIÊU ĐỀ
   =================================================================== */
const LABEL=/^(Đề số\s*\d+|BÀI LÀM ĐỀ SỐ\s*\d+|MÃ ĐỀ\s*\w*)$/i;
function fixRects(d,body,rep){let n=0,st=0;
  Array.from(body.getElementsByTagNameNS(WP,'anchor')).forEach(an=>{
    const bi=boxInfo(an);
    if(bi.pic)return;
    if(bi.tb&&bi.behind&&/^ĐỀ CHÍNH THỨC$/i.test(squash(fullText(bi.tb)))){dropAnchor(an);st++;return}
    if(bi.tb||!bi.behind)return;
    const tc=anc(an,'tc'),tbl=tc&&anc(tc,'tbl');if(!tbl)return;
    const cand=all(tbl,'p').filter(p=>LABEL.test(squash(ownText(p))));
    const p=cand.find(x=>anc(x,'tc')===tc)||cand[0];if(!p)return;
    const ctc=anc(p,'tc'),w=one(one(ctc,'tcPr'),'tcW'),cellW=w?+ga(w,'w'):4000;
    const rw=Math.round(bi.cx/635);let left=bi.hRel==='column'?Math.max(0,Math.round(bi.h/635)):Math.max(0,Math.round((cellW-rw)/2));
    left=Math.min(left,Math.max(0,cellW-rw));const right=Math.max(0,cellW-left-rw);
    const ts=all(p,'t');for(const t of ts){const v=t.textContent.replace(/^[\s\u00a0]+/,'');if(v!==t.textContent)t.textContent=v;if(v)break}
    all(p,'tab').forEach(x=>x.parentNode.removeChild(x));
    const pp=sc(d,p.firstChild&&one(p,'pPr')?p:(()=>{const e=mk(d,'pPr');p.insertBefore(e,p.firstChild);return p})(),'pPr',[]);void pp;
    const PP=one(p,'pPr');const tabs=one(PP,'tabs');if(tabs)PP.removeChild(tabs);
    const bd=sc(d,PP,'pBdr',ORD.pPr);while(bd.firstChild)bd.removeChild(bd.firstChild);
    ['top','left','bottom','right'].forEach(s=>{const e=mk(d,s);sa(e,'val','single');sa(e,'sz',8);sa(e,'space',3);sa(e,'color','000000');bd.appendChild(e)});
    sa(sc(d,PP,'jc',ORD.pPr),'val','center');
    const ind=sc(d,PP,'ind',ORD.pPr);['hanging','firstLine'].forEach(a=>ind.removeAttributeNS(W,a));sa(ind,'left',left);sa(ind,'right',right);
    const sp=sc(d,PP,'spacing',ORD.pPr);sa(sp,'before',80);sa(sp,'after',80);
    all(p,'r').forEach(r=>{const rp=one(r,'rPr');const ps=rp&&one(rp,'position');if(ps)rp.removeChild(ps)});
    dropAnchor(an);n++});
  if(n)rep.fix['hình chữ nhật nổi “Đề số…/BÀI LÀM…” (lệch khi đổi cỡ chữ) → viền đoạn văn']=n;
  if(st)rep.fix['hộp “ĐỀ CHÍNH THỨC” nổi đè lên tiêu đề (bản gốc không hiển thị) đã xóa']=st}
/* căn giữa giả bằng thụt lề trong bảng tiêu đề */
function headerIndents(d,body,rep){let n=0;
  Array.from(body.getElementsByTagNameNS(W,'tbl')).forEach(t=>{
    if(anc(t,'tbl')||anc(t,'txbxContent'))return;
    if(!/UBND|SỞ GD|PHÒNG GD|TRƯỜNG/.test(fullText(t).slice(0,200)))return;
    all(t,'p').forEach(p=>{
      const pp=one(p,'pPr'),ind=pp&&one(pp,'ind');if(!ind||one(pp,'jc')||one(pp,'pBdr'))return;
      const L=+ga(ind,'left')||0,R=+ga(ind,'right')||0,tx=squash(ownText(p));
      if(!tx||tx.length>34)return;
      if(L>=300&&R===0&&/^(UBND|TRƯỜNG|SỞ|PHÒNG)/.test(tx)){sa(sc(d,pp,'jc',ORD.pPr),'val','center');sa(ind,'left',0);n++}
      else if(R>0||L>0){sa(ind,'right',0);if(L<=100)sa(ind,'left',0)}});
    // đoạn ngày/tiết: bỏ thụt phải gây rớt dòng
    all(t,'p').forEach(p=>{const pp=one(p,'pPr'),ind=pp&&one(pp,'ind');if(ind&&+ga(ind,'right')>0&&!one(pp,'jc')&&!one(pp,'pBdr'))sa(ind,'right',0)})});
  if(n)rep.fix['căn giữa giả bằng thụt lề (UBND/TRƯỜNG…) → căn giữa thật']=n}

/* ===================================================================
   8. HỘP NỔI: ĐÁP ÁN, LƯỚI PHIẾU TRẢ LỜI
   =================================================================== */
function contentOf(tb){return Array.from(tb.children).filter(c=>!(isP(c)&&!fullText(c).trim()&&!hasStuff(c)))}
function tinyP(d){const p=mk(d,'p'),pp=mk(d,'pPr'),sp=mk(d,'spacing');sa(sp,'before',0);sa(sp,'after',0);sa(sp,'line',20);sa(sp,'lineRule','exact');pp.appendChild(sp);
  const rp=mk(d,'rPr');sa(mk(d,'sz'),'val',2);rp.appendChild(sa(mk(d,'sz'),'val',2));pp.appendChild(rp);p.appendChild(pp);return p}
function gcols(t){const g=one(t,'tblGrid');return g?wk(g,'gridCol').map(c=>+ga(c,'w')||0):[]}
function rowCells(tr){let col=0;return wk(tr,'tc').map(tc=>{const pr=one(tc,'tcPr'),gs=pr&&one(pr,'gridSpan'),n=gs?(+ga(gs,'val')||1):1;const o={tc,col,n};col+=n;return o})}
/* bảng "khổng lồ" (PDF ghép 2 bảng lệch nhau vào 1): tách theo ô gộp dọc rỗng ở đầu hàng */
function splitMega(d,tbl){
  const rows=wk(tbl,'tr'),isGap=tc=>{const pr=one(tc,'tcPr'),vm=pr&&one(pr,'vMerge');return !!vm&&!fullText(tc).trim()};
  let r0=-1;for(let i=1;i<rows.length;i++){const c=rowCells(rows[i])[0];
    if(c&&c.col===0&&c.n>=2&&isGap(c.tc)&&ga(one(one(c.tc,'tcPr'),'vMerge'),'val')==='restart'){r0=i;break}}
  if(r0<1)return[tbl];
  const grid=gcols(tbl),first=rowCells(rows[r0]),n0=first[0].n;
  const last=first[first.length-1],rEnd=(isGap(last.tc)&&last.col>n0)?last.col:grid.length;
  const A=tbl.cloneNode(true),Ar=wk(A,'tr');Ar.slice(r0).forEach(r=>A.removeChild(r));
  const B=tbl.cloneNode(true),Br=wk(B,'tr');Br.slice(0,r0).forEach(r=>B.removeChild(r));
  wk(B,'tr').forEach(tr=>{rowCells(tr).forEach(c=>{if(c.col<n0||c.col>=rEnd)tr.removeChild(c.tc)})});
  const g=one(B,'tblGrid');while(g.firstChild)g.removeChild(g.firstChild);
  grid.slice(n0,rEnd).forEach(w=>g.appendChild(sa(mk(d,'gridCol'),'w',w)));
  const tw=one(one(B,'tblPr'),'tblW');if(tw){sa(tw,'w',grid.slice(n0,rEnd).reduce((a,b)=>a+b,0));sa(tw,'type','dxa')}
  const ti=one(one(B,'tblPr'),'tblInd');if(ti)sa(ti,'w',0);
  const ta=one(one(A,'tblPr'),'tblW');if(ta){sa(ta,'w',grid.reduce((a,b)=>a+b,0));sa(ta,'type','dxa')}
  const tia=one(one(A,'tblPr'),'tblInd');if(tia)sa(tia,'w',0);
  // vMerge "continue" không còn ô "restart" phía trên → bỏ
  wk(B,'tr').forEach((tr,i)=>{if(i===0)all(tr,'vMerge').forEach(v=>v.parentNode.removeChild(v))});
  return[A,B]}
function layoutTable(d,cells,gap){
  const t=mk(d,'tbl'),pr=mk(d,'tblPr');t.appendChild(pr);
  const tot=cells.reduce((a,c)=>a+c.w,0);
  sa(sa(sc(d,pr,'tblW',ORD.tblPr),'w',tot),'type','dxa');sa(sa(sc(d,pr,'tblInd',ORD.tblPr),'w',0),'type','dxa');
  const b=sc(d,pr,'tblBorders',ORD.tblPr);['top','left','bottom','right','insideH','insideV'].forEach(x=>{const e=mk(d,x);sa(e,'val','nil');b.appendChild(e)});
  sa(sc(d,pr,'tblLayout',ORD.tblPr),'type','fixed');
  const cm=sc(d,pr,'tblCellMar',ORD.tblPr);['top','left','bottom','right'].forEach(x=>{const e=mk(d,x);sa(e,'w',0);sa(e,'type','dxa');cm.appendChild(e)});
  sa(sc(d,pr,'tblLook',ORD.tblPr),'val','0000');
  const g=mk(d,'tblGrid');cells.forEach(c=>g.appendChild(sa(mk(d,'gridCol'),'w',c.w)));t.appendChild(g);
  const tr=mk(d,'tr'),tp=mk(d,'trPr');tp.appendChild(mk(d,'cantSplit'));tr.appendChild(tp);
  cells.forEach(c=>{const tc=mk(d,'tc'),cp=mk(d,'tcPr');sa(sa(mk(d,'tcW'),'w',c.w),'type','dxa');cp.appendChild(sa(sa(mk(d,'tcW'),'w',c.w),'type','dxa'));
    while(cp.children.length>1)cp.removeChild(cp.firstChild);tc.appendChild(cp);
    c.kids.forEach(k=>tc.appendChild(k));
    if(!isP(tc.lastElementChild))tc.appendChild(tinyP(d));
    tr.appendChild(tc)});
  t.appendChild(tr);return t}
function tblWidth(t){const s=gcols(t).reduce((a,b)=>a+b,0);if(s)return s;return 3000}

function hoistBoxes(d,body,rep,IND){
  const boxes=Array.from(body.getElementsByTagNameNS(WP,'anchor')).map(boxInfo).filter(b=>b.tb&&b.host&&!b.pic&&!anc(b.an,'txbxContent'));
  const byHost=new Map();boxes.forEach(b=>{if(!byHost.has(b.host))byHost.set(b.host,[]);byHost.get(b.host).push(b)});
  let nOpt=0,nGrid=0,nSplit=0,nOther=0;
  byHost.forEach((bs,P)=>{
    const opt=bs.filter(b=>isOptBox(b.tb)).sort((a,b)=>a.v-b.v),
      grid=bs.filter(b=>!isOptBox(b.tb)&&b.tb.getElementsByTagNameNS(W,'tbl').length).sort((a,b)=>a.h-b.h),
      other=bs.filter(b=>!opt.includes(b)&&!grid.includes(b));
    bs.forEach(b=>dropAnchor(b.an));
    let segs=[P];
    if(opt.length)segs=splitStems(P);
    const ref0=segs[segs.length-1];
    /* đáp án: sau từng câu tương ứng */
    const place=(i)=>opt.length===segs.length?segs[i]:ref0;
    let lastAt=new Map();
    opt.forEach((b,i)=>{const at=place(i);let ref=lastAt.get(at)||at;
      contentOf(b.tb).forEach(k=>{k.parentNode&&k.parentNode.removeChild(k);ref.parentNode.insertBefore(k,ref.nextSibling);ref=k});
      lastAt.set(at,ref);nOpt++});
    /* lưới phiếu trả lời */
    if(grid.length){
      const aw=awAt(body,P);let tbls=[],B=null;
      grid.forEach(b=>contentOf(b.tb).forEach(k=>{
        if(isTbl(k)){const parts=splitMega(d,k);if(parts.length>1){nSplit++;tbls.push(parts[0]);B=parts[1]}else tbls.push(k)}}));
      const gap=120;
      const cells=tbls.map(t=>({w:tblWidth(t)+gap,kids:[t]}));
      let sum=cells.reduce((a,c)=>a+c.w,0);
      if(sum>aw){const f=aw/sum;cells.forEach(c=>c.w=Math.floor(c.w*f))}
      let ref=ref0;const L1=layoutTable(d,cells);ref.parentNode.insertBefore(L1,ref.nextSibling);ref=L1;
      if(B){
        const bw=tblWidth(B),left=[];let q=L1.nextElementSibling;
        // đoạn tiêu đề "trả lời ngắn" + các dòng chấm ngắn đi cùng
        if(isP(q)&&/trả lời ngắn/i.test(squash(ownText(q)))){left.push(q);q=q.nextElementSibling;
          while(isP(q)&&/^[\s….·]{3,40}$/.test(ownText(q))&&ownText(q).trim().length<=34){left.push(q);q=q.nextElementSibling}}
        const L2=layoutTable(d,[{w:Math.max(1500,aw-bw-gap),kids:left.slice()},{w:bw,kids:[B]}]);
        left.forEach(x=>x.parentNode&&x.parentNode.removeChild(x));
        const tcs=all(L2,'tc').filter(c=>c.parentNode.parentNode===L2);
        left.forEach(x=>tcs[0].insertBefore(x,tcs[0].lastElementChild&&tcs[0].lastElementChild.localName==='p'&&!fullText(tcs[0].lastElementChild).trim()&&!left.includes(tcs[0].lastElementChild)?tcs[0].lastElementChild:null));
        L1.parentNode.insertBefore(L2,L1.nextSibling)}
      nGrid+=grid.length}
    other.forEach(b=>{let ref=ref0;contentOf(b.tb).forEach(k=>{k.parentNode.removeChild(k);ref.parentNode.insertBefore(k,ref.nextSibling);ref=k});nOther++});
    /* đoạn chủ không còn gì → bỏ */
    segs.forEach(s=>{if(s.parentNode&&!fullText(s).trim()&&!hasStuff(s)&&!one(one(s,'pPr'),'numPr')&&opt.length)s.parentNode.removeChild(s)});
    /* làm sạch đoạn câu hỏi */
    if(opt.length)segs.forEach(s=>{if(!s.parentNode)return;const pp=one(s,'pPr');if(!pp)return;
      const sp=sc(d,pp,'spacing',ORD.pPr);['line','lineRule'].forEach(a=>sp.removeAttributeNS(W,a));sa(sp,'before',60);sa(sp,'after',0);
      const ind=sc(d,pp,'ind',ORD.pPr);['hanging','firstLine','right'].forEach(a=>ind.removeAttributeNS(W,a));sa(ind,'left',0);
      sc(d,pp,'keepNext',ORD.pPr)})});
  if(nOpt)rep.fix['hộp văn bản nổi chứa đáp án → bảng đáp án thật ngay dưới câu hỏi']=nOpt;
  if(nGrid)rep.fix['hộp lưới phiếu trả lời nổi → bảng bố cục thật']=nGrid;
  if(nSplit)rep.fix['bảng lưới ghép 2 trong 1 (A-B-C-D + Đúng/Sai) đã tách']=nSplit;
  if(nOther)rep.warn.push(nOther+' hộp văn bản khác đã chuyển thành nội dung thường: hãy kiểm tra');
  const left=body.getElementsByTagNameNS(WP,'anchor').length;
  const pics=Array.from(body.getElementsByTagNameNS(WP,'anchor')).filter(a=>!boxInfo(a).pic).length;
  if(pics)rep.warn.push(pics+' khung nổi chưa xử lý được: kiểm tra vị trí');
  void left}

/* đáp án bị "treo" sang dòng khác: "D. Cả" + "A, B, C." */
function orphanTails(body,rep){let n=0;
  Array.from(body.getElementsByTagNameNS(W,'tbl')).forEach(t=>{
    if(anc(t,'tbl'))return;const ps=all(t,'p');const lp=ps[ps.length-1];if(!lp)return;
    if(!/^A\s*[.)]/.test(squash(fullText(t)))||!/(?:^|\s)Cả\s*$/i.test(squash(fullText(lp))))return;
    let q=t.nextElementSibling;const trash=[];
    while(q&&isP(q)&&!fullText(q).trim()&&!q.getElementsByTagNameNS(W,'sectPr').length){trash.push(q);q=q.nextElementSibling}
    if(!isP(q)||!/^[A-D](?:\s*(?:,|và)\s*[A-D])+\s*\.?$/.test(squash(ownText(q))))return;
    const tx=squash(ownText(q));const rs=Array.from(q.children).filter(c=>c.localName==='r').map(r=>r.cloneNode(true));
    const sp=mk(lp.ownerDocument,'r'),st=mk(lp.ownerDocument,'t');st.textContent=' ';st.setAttributeNS(XMLNS,'xml:space','preserve');sp.appendChild(st);lp.appendChild(sp);
    rs.forEach(r=>{cleanRun(r);lp.appendChild(r)});
    const lr=Array.from(lp.children).filter(c=>c.localName==='r'),lrp=one(lr[0],'rPr');
    rs.forEach(r=>{if(!one(r,'rPr')&&lrp)r.insertBefore(lrp.cloneNode(true),r.firstChild)});
    q.parentNode.removeChild(q);trash.forEach(x=>{if(x.parentNode)x.parentNode.removeChild(x)});void tx;n++});
  if(n)rep.fix['phần đáp án “treo” (D. Cả / A, B, C.) đã ghép lại']=n}

/* ===================================================================
   9. DÒNG CHẤM
   =================================================================== */
function dotLeaders(d,body,rep){let n=0;
  all(body,'p').forEach(p=>{
    if(inBox(p,null))return;
    const s=ownText(p);if(!/^[\s….·]{12,}$/.test(s)||(s.match(/[….·]/g)||[]).length<12)return;
    if(hasStuff(p))return;
    const w=awAt(body,p),pp=sc(d,p.firstChild&&one(p,'pPr')?p:(()=>{const e=mk(d,'pPr');p.insertBefore(e,p.firstChild);return p})(),'pPr',[]);void pp;
    const PP=one(p,'pPr'),tb=one(PP,'tabs');if(tb)PP.removeChild(tb);
    const tabs=sc(d,PP,'tabs',ORD.pPr),tab=mk(d,'tab');sa(tab,'val','right');sa(tab,'leader','dot');sa(tab,'pos',w-10);tabs.appendChild(tab);
    const ind=sc(d,PP,'ind',ORD.pPr);['hanging','firstLine','right'].forEach(a=>ind.removeAttributeNS(W,a));sa(ind,'left',0);
    const r0=all(p,'r').find(r=>all(r,'t').length),rp=r0&&one(r0,'rPr');
    Array.from(p.children).forEach(c=>{if(c.localName!=='pPr')p.removeChild(c)});
    const r=mk(d,'r');if(rp){const q=rp.cloneNode(true);['spacing','w'].forEach(x=>{const e=one(q,x);if(e)q.removeChild(e)});r.appendChild(q)}
    const t=mk(d,'t');t.textContent='…';r.appendChild(t);const r2=mk(d,'r');if(rp)r2.appendChild(rp.cloneNode(true));r2.appendChild(mk(d,'tab'));
    p.appendChild(r);p.appendChild(r2);n++});
  if(n)rep.fix['dòng chấm ……… → tab dẫn chấm đến lề phải (không rớt dòng)']=n}

/* ===================================================================
   10. TIỂU TIẾT
   =================================================================== */
function cleanSpacing(d,rep){let n=0;
  all(d,'rPr').forEach(rp=>{if(rp.parentNode&&/Change$/.test(rp.parentNode.localName))return;
    ['spacing','w','fitText'].forEach(x=>{const e=one(rp,x);if(e){rp.removeChild(e);n++}});
    const ps=one(rp,'position');if(ps&&Math.abs(+ga(ps,'val'))<=4){rp.removeChild(ps);n++}});
  if(n)rep.fix['khoảng cách chữ lẻ (w:spacing/position từ PDF)']=n}

/* ===================================================================
   12. THỤT LỀ NỀN, KHUNG TIÊU ĐỀ, CẤP DANH SÁCH (nguyên nhân "lề trái quá rộng")
   =================================================================== */
/* PDF→Word hay "nướng" lề trang vào thụt lề từng đoạn (vd. mọi đoạn thụt trái 1.5–4 cm): trừ đi mức thụt phổ biến nhất */
function baseIndent(d,body,rep){
  const ps=all(body,'p').filter(p=>!anc(p,'tc')&&!inBox(p,null)&&squash(ownText(p)));
  if(ps.length<6)return;
  const cnt=new Map();let withInd=0;
  ps.forEach(p=>{const ie=one(one(p,'pPr'),'ind');if(!ie)return;const L=+ga(ie,'left')||+ga(ie,'start')||0;if(L>0){withInd++;cnt.set(L,(cnt.get(L)||0)+1)}});
  let M=0,mc=0;cnt.forEach((c,L)=>{if(c>mc||(c===mc&&L<M)){mc=c;M=L}});
  if(M<500||M>3200||mc<ps.length*0.35)return;
  let n=0;
  ps.forEach(p=>{const ie=one(one(p,'pPr'),'ind');if(!ie)return;const a=ie.hasAttributeNS(W,'left')?'left':(ie.hasAttributeNS(W,'start')?'start':'');if(!a)return;
    const L=+ga(ie,a)||0;if(L<=0)return;sa(ie,a,Math.max(0,L-M));n++});
  Array.from(body.children).filter(isTbl).forEach(t=>{const ti=one(one(t,'tblPr'),'tblInd');if(!ti)return;const v=+ga(ti,'w')||0;if(v>0)sa(ti,'w',Math.max(0,v-M))});
  if(n)rep.fix['thụt lề “nướng” sẵn từ PDF (cùng 1 mức '+(M/567).toFixed(1)+' cm ở '+n+' đoạn) đã trừ đi → lề trái không bị rộng thêm']=n}

/* bảng khung tiêu đề 2 cột (UBND/TRƯỜNG | ĐỀ KIỂM TRA…): cột trái đủ rộng để không rớt dòng, tổng khít vùng chữ */
function headerBalance(d,body,rep,aw,pt){let n=0;
  Array.from(body.children).filter(isTbl).forEach(t=>{   /* [v11] mọi khung tiêu đề trong tài liệu (trước: chỉ 3 bảng đầu → đề 2, đáp án, phiếu trả lời vẫn rớt dòng) */
    if(!/UBND|SỞ GD|PHÒNG GD|TRƯỜNG/.test(fullText(t).slice(0,200))||wk(t,'tr').length>3)return;
    const g=one(t,'tblGrid'),cols=g?wk(g,'gridCol'):[];if(cols.length!==2)return;
    /* [v11] đoạn căn giữa trong khung tiêu đề còn thụt lề giả của PDF (left/right/hanging) làm cột hẹp lại → rớt dòng “ĐA / TỐN”, “CÔNG NGHỆ / 7” */
    all(t,'p').forEach(p=>{const pp=one(p,'pPr'),jc=pp&&one(pp,'jc');if(!jc||ga(jc,'val')!=='center')return;const ie=pp&&one(pp,'ind');if(!ie)return;
      ['left','start','right','end','hanging','firstLine','leftChars','rightChars'].forEach(a=>ie.removeAttributeNS(W,a));if(!ie.attributes.length)pp.removeChild(ie);n++});
    /* [v11] “Ngày kiểm tra: … Tiết kiểm tra: …” dính một đoạn → tách hai dòng */
    all(t,'p').forEach(p=>{if(!/Ngày kiểm tra:.*\sTiết kiểm tra:/.test(ownText(p)))return;
      const rs=wk(p,'r'),k=rs.findIndex(r=>/Tiết/.test(ownText(r)));if(k<0)return;
      const p2=p.cloneNode(true),rs2=wk(p2,'r');
      rs2.slice(0,k).forEach(r=>p2.removeChild(r));rs.slice(k+1).forEach(r=>p.removeChild(r));
      const t1=all(rs[k],'t')[0],t2=all(rs2[k],'t')[0];if(!t1||!t2)return;
      const full=t1.textContent,ix=full.indexOf('Tiết');t1.textContent=full.slice(0,ix).replace(/\s+$/,'');t2.textContent=full.slice(ix);
      t1.setAttributeNS(XMLNS,'xml:space','preserve');t2.setAttributeNS(XMLNS,'xml:space','preserve');
      Array.from(p2.getElementsByTagNameNS(W,'ind')).forEach(e=>e.parentNode.removeChild(e));
      Array.from(p.getElementsByTagNameNS(W,'ind')).forEach(e=>e.parentNode.removeChild(e));
      p.parentNode.insertBefore(p2,p.nextSibling);n++});
    const need=ci=>{let m=0;wk(t,'tr').forEach(tr=>{const tc=wk(tr,'tc')[ci];if(!tc)return;
      all(tc,'p').forEach(p=>{const tx=squash(ownText(p));if(!tx)return;
        const bold=all(p,'r').some(r=>one(one(r,'rPr'),'b'));
        let w=0;for(const ch of tx)w+=CWf(ch)*pt*20*(bold?1.07:1);m=Math.max(m,w*1.08)})});return m};
    const nl=need(0)+160,cur=cols.map(c=>+ga(c,'w')||0),tot=cur[0]+cur[1];
    let left=Math.min(Math.max(nl,aw*0.34),aw*0.5);
    if(cur[0]>=left-30&&tot<=aw+20)return;         // đã đủ rộng và vừa lề
    left=Math.round(left);const right=Math.round(aw-left);
    sa(cols[0],'w',left);sa(cols[1],'w',right);
    wk(t,'tr').forEach(tr=>wk(tr,'tc').forEach((tc,i)=>{const w=sc(d,sc(d,tc,'tcPr',['tcW']),'tcW',['tcW']);sa(w,'w',i?right:left);sa(w,'type','dxa')}));
    const pr=one(t,'tblPr');const tw=sc(d,pr,'tblW',ORD.tblPr);sa(tw,'w',aw);sa(tw,'type','dxa');
    const ti=one(pr,'tblInd');if(ti)sa(ti,'w',0);
    sa(sc(d,pr,'tblLayout',ORD.tblPr),'type','fixed');n++});
  if(n)rep.fix['khung tiêu đề (UBND/TRƯỜNG | ĐỀ KIỂM TRA) chia lại độ rộng cột để chữ không rớt dòng']=n}

/* danh sách: thụt lề cấp quá lớn trong numbering.xml (dán từ PDF) → tối đa 1,27 cm × (cấp+1) */
function clampNumbering(nd){let n=0;if(!nd)return 0;
  all(nd,'lvl').forEach(l=>{const il=+ga(l,'ilvl')||0,pp=one(l,'pPr'),ie=pp&&one(pp,'ind');if(!ie)return;
    const cap=720*(il+1),a=ie.hasAttributeNS(W,'left')?'left':(ie.hasAttributeNS(W,'start')?'start':'');if(!a)return;
    const L=+ga(ie,a)||0;if(L>cap){const hg=+ga(ie,'hanging')||0;sa(ie,a,cap);if(hg>cap)sa(ie,'hanging',360);n++}});
  return n}

function WordFlowFix(doc,opt){
  opt=Object.assign({optInd:284,flatCols:true,dots:true,pt:14,aw:0},opt||{});
  const body=doc.getElementsByTagNameNS(W,'body')[0],rep={fix:{},warn:[]};
  if(!body)return rep;
  if(opt.flatCols)flattenCols(doc,body,rep);
  fixRects(doc,body,rep);
  hoistBoxes(doc,body,rep,opt.optInd);
  microSpacers(body,rep);
  rebuildOptionTables(doc,body,rep,opt.optInd);
  paraOptionRuns(doc,body,rep,opt.optInd);
  orphanTails(body,rep);
  headerIndents(doc,body,rep);
  if(opt.dots)dotLeaders(doc,body,rep);
  cleanSpacing(doc,rep);
  baseIndent(doc,body,rep);
  if(opt.aw)headerBalance(doc,body,rep,opt.aw,opt.pt);
  return rep}
WordFlowFix.clampNumbering=clampNumbering;
(typeof window!=='undefined'?window:globalThis).WordFlowFix=WordFlowFix;
})();
