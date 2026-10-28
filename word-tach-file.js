/* Công cụ Word · "Tách file Word"
   Đưa file .docx lên → xem danh sách trang (kèm dòng đầu mỗi trang) → chọn trang → xuất file .docx mới.
   Tính năng:
   1. Danh sách trang kèm dòng đầu của mỗi trang (bấm vào dòng để chọn / bỏ chọn trang).
   2. Tách theo phần có sẵn trong file: theo ngắt section, hoặc nhận dạng tiêu đề "ĐỀ SỐ", "ĐÁP ÁN", "PHẦN II"...
   3. Tách hàng loạt ra file ZIP: mỗi phần (Đề 01, Đề 02, Đáp án...) là một file .docx riêng.
   4. Nhập nhiều khoảng một lần (vd 1-2, 8-11): gộp vào 1 file hoặc mỗi khoảng 1 file (ZIP); tùy chọn đánh lại số trang từ 1.
   5. Tự chèn lại dòng tiêu đề bảng khi tách giữa chừng một bảng.
   6. AI nhẹ (Gemini): gõ "tách đề 2 và đáp án của nó" → AI nhận danh sách dòng đầu mỗi trang và trả về khoảng trang. Dùng khóa chung window.GKEY (gkey.js).
   Cách tính trang: Word khi lưu file có ghi sẵn vị trí bắt đầu mỗi trang (w:lastRenderedPageBreak) cùng với các ngắt trang cứng,
   "ngắt trang trước" và ngắt section. Công cụ đọc các dấu này nên số trang khớp với số trang mà Word đã hiển thị khi lưu file.
   File chưa từng lưu bằng Word (tạo bằng Google Docs, LibreOffice, python-docx…) có thể không có các dấu này → mở bằng Word, Ctrl+S rồi đưa lên lại.
   Cần: JSZip (index.html đã nạp). Tự thêm ô công cụ vào #t3, mục chọn nằm ngay dưới "Ghép file Word" trong #wtSel. */
(function(){
'use strict';
const sel=document.getElementById('wtSel'),t3=document.getElementById('t3');
if(!sel||!t3||typeof JSZip==='undefined')return;
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  PR='http://schemas.openxmlformats.org/package/2006/relationships';
const g=id=>document.getElementById(id);
const hx=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ln=(e,n)=>!!e&&e.nodeType===1&&e.localName===n&&e.namespaceURI===W;
const kids=(e,n)=>Array.from(e.children).filter(c=>ln(c,n));
const one=(e,n)=>kids(e,n)[0]||null;
const ga=(e,n)=>e?e.getAttributeNS(W,n)||'':'';
const pX=(s,n)=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('XML không đọc được'+(n?' ('+n+')':''));return d};
const ser=d=>{const s=new XMLSerializer().serializeToString(d);return /^<\?xml/.test(s)?s:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+s};
const fsz=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(1)+' MB';

/* ---------- Phân tích: chia tài liệu thành các "đơn vị" (đoạn / hàng bảng) và gán số trang ---------- */
function styleBreaks(sd){
  const s=new Set();if(!sd)return s;
  Array.from(sd.getElementsByTagNameNS(W,'style')).forEach(st=>{
    const pp=one(st,'pPr'),pb=pp&&one(pp,'pageBreakBefore');
    if(pb&&!/^(0|false|off)$/i.test(ga(pb,'val')||'1'))s.add(ga(st,'styleId'))});
  return s}

function analyze(doc,sd){
  const body=doc.getElementsByTagNameNS(W,'body')[0];
  if(!body)throw new Error('File không có phần nội dung (w:body).');
  const sb=styleBreaks(sd),units=[];
  (function add(parent){
    for(const c of Array.from(parent.children)){
      if(ln(c,'p'))units.push({kind:'p',node:c,atomic:false});
      else if(ln(c,'tbl'))kids(c,'tr').forEach(tr=>units.push({kind:'tr',node:tr,tbl:c,atomic:true}));
      else if(ln(c,'sdt')){const sc=one(c,'sdtContent');if(sc)add(sc)}
      else if(ln(c,'customXml'))add(c)}})(body);
  /* danh sách section theo thứ tự: các sectPr trong đoạn, cuối cùng là sectPr của body */
  const secs=[];
  units.forEach(u=>{if(u.kind==='p'){const pp=one(u.node,'pPr'),s=pp&&one(pp,'sectPr');if(s){u.sect=s;secs.push(s)}}});
  const bodySect=one(body,'sectPr');if(bodySect)secs.push(bodySect);
  {let k=0;units.forEach(u=>{u.sec=k;if(u.kind==='p'&&u.sect)k++})} /* chỉ số section của từng đơn vị */
  const S={page:1,started:false,pend:null,bnd:{},events:0};
  units.forEach((u,i)=>{u.i=i;u.atoms=0;u.cuts=[];u.startPage=null;u.endPage=null;u.split=false});

  function consume(u,ctx){
    const pd=S.pend;S.pend=null;
    if(!S.started)return;
    S.page++;
    if(u.atomic){
      if(u.atoms===0){S.bnd[S.page]={u:u.i}}
      else{ /* hàng bảng vắt qua nhiều trang: mỗi ô tự đếm số trang của nó, trang của hàng = trang lớn nhất */
        S.page--;
        const cp=((ctx&&ctx.pg!=null)?ctx.pg:u.rowStart)+1;
        if(ctx)ctx.pg=cp;
        if(cp>u.maxPg){u.maxPg=cp;S.page=cp;S.bnd[cp]={u:u.i+1}}
        else S.page=u.maxPg}}
    else{
      const mine=pd.evs.filter(e=>e.u===u&&e.el);
      if(mine.length&&mine[0].before>0){u.cuts.push({page:S.page,first:mine[0].el,last:mine[mine.length-1].el});S.bnd[S.page]={u:u.i,inpara:true}}
      else S.bnd[S.page]={u:u.i}}}
  function ev(u,el){S.events++;if(!S.pend)S.pend={evs:[]};S.pend.evs.push({u,el,before:u?u.atoms:0})}
  function atom(u,ctx){
    const hp=!!S.pend;if(hp)consume(u,ctx);
    S.started=true;if(u.atomic&&u.atoms===0){u.rowStart=u.maxPg=S.page;u.rowNew=hp;if(ctx)ctx.pg=S.page}u.atoms++;if(ctx)ctx.n++;
    if(u.startPage===null)u.startPage=S.page;
    u.endPage=S.page}
  function evt(u,ctx,el){if(u.atomic&&u.atoms>0&&ctx&&ctx.n===0&&u.rowNew)return;ev(u,el)}

  function walkP(p,u,ctx){
    (function w(n){
      for(const c of Array.from(n.children)){
        if(c.namespaceURI!==W){
          if(c.localName==='AlternateContent'||c.localName==='oMath'||c.localName==='oMathPara')atom(u,ctx);
          continue}
        switch(c.localName){
          case 'pPr':case 'rPr':case 'delText':case 'instrText':case 'proofErr':case 'bookmarkStart':case 'bookmarkEnd':
          case 'commentRangeStart':case 'commentRangeEnd':case 'del':case 'moveFrom':case 'sdtPr':case 'sdtEndPr':case 'fldChar':
          case 'tab':case 'sym':case 'noBreakHyphen':case 'softHyphen':case 'ptab':case 'footnoteReference':case 'endnoteReference':case 'commentReference':break;
          case 't':if(c.textContent.length)atom(u,ctx);break;
          case 'lastRenderedPageBreak':evt(u,ctx,c);break;
          case 'br':{const t=ga(c,'type');if(t==='page')evt(u,ctx,c);else if(t!=='column')atom(u,ctx);break}
          case 'drawing':case 'pict':case 'object':atom(u,ctx);break;
          default:w(c)}}})(p)}
  function walkBox(box,u,ctx){
    for(const c of Array.from(box.children)){
      if(ln(c,'p')){walkP(c,u,ctx);if(u.atoms===0&&!(ctx&&ctx.n))atom(u,ctx)}
      else if(ln(c,'tbl'))kids(c,'tr').forEach(tr=>kids(tr,'tc').forEach(tc=>walkBox(tc,u,ctx)));
      else if(ln(c,'sdt')){const sc=one(c,'sdtContent');if(sc)walkBox(sc,u,ctx)}}}

  units.forEach(u=>{
    if(u.kind==='p'){
      const pp=one(u.node,'pPr'),pb=pp&&one(pp,'pageBreakBefore'),st=pp&&one(pp,'pStyle');
      if((pb&&!/^(0|false|off)$/i.test(ga(pb,'val')||'1'))||(st&&sb.has(ga(st,'val'))))ev(u,null);
      const pendBefore=S.pend&&!S.pend.evs.some(e=>e.u===u);
      walkP(u.node,u,null);
      if(u.atoms===0){ /* đoạn rỗng: dấu đoạn tính là một nội dung, trừ khi ngắt trang do chính nó tạo ra */
        if(S.pend&&pendBefore&&!S.pend.evs.some(e=>e.u===u))atom(u,null);
        else{if(u.startPage===null)u.startPage=S.page;u.endPage=S.page}}
      if(u.sect){
        const k=secs.indexOf(u.sect),nx=secs[k+1],ty=nx&&one(nx,'type'),v=ty?ga(ty,'val'):'nextPage';
        if(v!=='continuous')ev(null,null)}}
    else{
      kids(u.node,'tc').forEach(tc=>{const ctx={n:0};walkBox(tc,u,ctx)});
      if(u.startPage===null){u.startPage=S.page;u.endPage=S.page}}});
  return{doc,body,units,N:S.page,events:S.events,bnd:S.bnd}}

/* Trang chỉ có dòng trống (thường là đoạn trống + ngắt section nằm sau một bảng dài bị đẩy sang trang mới) không có chữ/hình
   nên Word không ghi dấu ngắt trang. Đối chiếu với tổng số trang Word ghi trong docProps/app.xml: nếu thiếu đúng bằng số vị trí
   nghi vấn thì thêm các trang trống đó vào; không khớp thì giữ nguyên và để giao diện cảnh báo. */
function fixBlank(info,wp){
  info.guessed=0;
  const units=info.units,def=wp-info.N;
  if(!wp||def<=0)return info;
  const emptyP=u=>u.kind==='p'&&u.atoms===0&&!u.node.getElementsByTagNameNS(W,'lastRenderedPageBreak').length&&pageBreaks(u.node).length===0;
  const cands=[];
  for(let i=1;i<units.length;i++){
    if(!emptyP(units[i])||units[i-1].kind!=='tr')continue;
    let j=i;while(j+1<units.length&&emptyP(units[j+1])&&!units[j].sect)j++;
    if(units[j].sect&&emptyP(units[j])){cands.push([i,j]);i=j}}
  if(cands.length!==def)return info;
  let k=0;
  cands.forEach(([i,j])=>{
    const prevEnd=units[i-1].endPage+k;
    units.forEach(u=>{if(u.i>j){u.startPage+=1;u.endPage+=1;u.cuts.forEach(c=>c.page+=1)}});
    for(let x=i;x<=j;x++){units[x].startPage=units[x].endPage=prevEnd+1}
    k++});
  info.N+=def;info.guessed=def;return info}

/* ---------- Cắt đoạn tại vị trí ngắt trang ---------- */
const KEEPN=new Set(['pPr','rPr','sdtPr','sdtEndPr']);
function cutStart(p,el){
  let n=el;
  while(n&&n!==p){
    const par=n.parentNode;
    for(let s=n.previousSibling;s;){const pv=s.previousSibling;
      if(!(s.nodeType===1&&s.namespaceURI===W&&KEEPN.has(s.localName)))par.removeChild(s);s=pv}
    n=par}
  if(el.parentNode)el.parentNode.removeChild(el)}
function cutEnd(p,el){
  let n=el;
  while(n&&n!==p){
    const par=n.parentNode;
    for(let s=n.nextSibling;s;){const nx=s.nextSibling;par.removeChild(s);s=nx}
    n=par}
  if(el.parentNode)el.parentNode.removeChild(el)}

/* gỡ ngắt trang cứng nằm ở đầu/cuối phần được giữ (nếu không file mới sẽ có trang trắng) */
const realAtom=n=>n.namespaceURI===W&&((n.localName==='t'&&n.textContent.length)||n.localName==='drawing'||n.localName==='pict'||n.localName==='object');
function pageBreaks(p){return Array.from(p.getElementsByTagNameNS(W,'br')).filter(b=>ga(b,'type')==='page')}
function allNodes(p){return Array.from(p.getElementsByTagName('*'))}
function stripLeading(p){
  const nodes=allNodes(p);
  for(const n of nodes){
    if(realAtom(n))break;
    if(ln(n,'br')&&ga(n,'type')==='page')n.parentNode.removeChild(n);
    else if(ln(n,'lastRenderedPageBreak'))n.parentNode.removeChild(n)}
  const pp=one(p,'pPr'),pb=pp&&one(pp,'pageBreakBefore');if(pb)pp.removeChild(pb)}
function stripTrailing(p){ /* trả về true nếu đoạn còn chữ/hình (dừng quét ngược) */
  const nodes=allNodes(p);let last=-1;
  nodes.forEach((n,i)=>{if(realAtom(n))last=i});
  nodes.forEach((n,i)=>{if(i>last&&ln(n,'br')&&ga(n,'type')==='page'&&n.parentNode)n.parentNode.removeChild(n)});
  return last>=0}

function cleanupMarks(doc){
  const cnt=(tag,idk)=>{const m=new Map();Array.from(doc.getElementsByTagNameNS(W,tag)).forEach(e=>{const k=ga(e,idk),a=m.get(k)||[];a.push(e);m.set(k,a)});return m};
  const cs=cnt('commentRangeStart','id'),ce=cnt('commentRangeEnd','id'),cr=cnt('commentReference','id'),ids=new Set([...cs.keys(),...ce.keys(),...cr.keys()]);
  ids.forEach(id=>{
    if(cs.has(id)&&ce.has(id)&&cr.has(id))return;
    [cs,ce].forEach(m=>(m.get(id)||[]).forEach(e=>e.parentNode&&e.parentNode.removeChild(e)));
    (cr.get(id)||[]).forEach(e=>{const r=e.parentNode;if(ln(r,'r')&&r.parentNode)r.parentNode.removeChild(r);else if(e.parentNode)e.parentNode.removeChild(e)})});
  const bs=cnt('bookmarkStart','id'),be=cnt('bookmarkEnd','id');
  new Set([...bs.keys(),...be.keys()]).forEach(id=>{
    if(bs.has(id)&&be.has(id))return;
    [bs,be].forEach(m=>(m.get(id)||[]).forEach(e=>e.parentNode&&e.parentNode.removeChild(e)))})}

/* ---------- Danh sách trang: dòng đầu mỗi trang ---------- */
const nfc=s=>s.normalize?s.normalize('NFC'):s;
function textOf(p,after,before){
  let s='';
  Array.from(p.getElementsByTagNameNS(W,'t')).forEach(t=>{
    if(after&&!(after.compareDocumentPosition(t)&4))return;
    if(before&&!(before.compareDocumentPosition(t)&2))return;
    s+=t.textContent});
  return nfc(s.replace(/\s+/g,' ').trim())}
const hasPic=n=>!!(n.getElementsByTagNameNS(W,'drawing').length||n.getElementsByTagNameNS(W,'pict').length||n.getElementsByTagNameNS(W,'object').length);
function rowText(tr){return Array.from(tr.getElementsByTagNameNS(W,'tc')).map(tc=>textOf(tc)).filter(Boolean).join(' | ')}
function outline(info){
  const N=info.N,pg=[];
  for(let q=1;q<=N;q++)pg.push({lines:[],pic:false,cont:false});
  const add=(q,t)=>{const o=pg[q-1];if(o&&t&&o.lines.length<6)o.lines.push(t)};
  info.units.forEach(u=>{
    const s=u.startPage,e=u.endPage;if(s==null||s<1)return;
    if(u.kind==='tr'){
      add(s,rowText(u.node));
      if(pg[s-1]&&hasPic(u.node))pg[s-1].pic=true;
      for(let q=s+1;q<=e;q++)if(pg[q-1])pg[q-1].cont=true;
      return}
    const cutAt=q=>u.cuts.find(c=>c.page===q);
    for(let q=s;q<=e;q++){
      let t;
      if(q===s){const nx=cutAt(q+1);t=textOf(u.node,null,nx&&nx.first)}
      else{const c=cutAt(q);if(!c)continue;const nx=cutAt(q+1);t=textOf(u.node,c.last,nx&&nx.first)}
      add(q,t)}
    if(pg[s-1]&&hasPic(u.node))pg[s-1].pic=true});
  return pg.map((o,i)=>({n:i+1,lines:o.lines,pic:o.pic,cont:o.cont,
    text:o.lines[0]||(o.pic?'[hình / đối tượng]':(o.cont?'(phần tiếp của hàng bảng)':'(trang trống)')),
    blank:!o.lines.length&&!o.pic}))}

/* ---------- Nhận dạng các phần ---------- */
const HEAD=/^(?:ĐỀ\s*(?:SỐ|THI|KIỂM\s*TRA|ÔN\s*TẬP|CƯƠNG|MINH\s*HỌA)(?![\p{L}])\s*[\dIVX]*(?![\p{L}\d])|ĐỀ\s*\d+(?![\p{L}\d])|ĐÁP\s*ÁN(?:\s*(?:MÃ\s*ĐỀ|ĐỀ)?\s*(?:SỐ)?\s*\d+)?(?![\p{L}\d])|HƯỚNG\s*DẪN\s*(?:GIẢI|CHẤM)(?![\p{L}])|LỜI\s*GIẢI(?![\p{L}]))/iu;
const HEADW=/^(?:PHẦN|BÀI|CHƯƠNG|CHUYÊN\s*ĐỀ|PHỤ\s*LỤC)\s*[\dIVXLC]+(?![\p{L}\d])/iu;
function headKey(line,wide){
  if(!line||line.length>100)return null;
  const m=HEAD.exec(line)||(wide?HEADW.exec(line):null);
  if(!m)return null;
  const txt=m[0].replace(/\s+/g,' ').trim();
  /* khóa so sánh: chữ hoa, bỏ số 0 đầu ("01" = "1") → tiêu đề lặp lại ở đầu mỗi trang không tạo phần mới */
  return{key:txt.toUpperCase().replace(/\d+/g,x=>String(+x)),txt}}
function partsByHeading(ol,wide){
  const st=[];let cur=null;
  ol.forEach(o=>{
    let h=null;for(const l of o.lines.slice(0,4)){h=headKey(l,wide);if(h)break}
    if(h&&h.key!==cur){st.push({a:o.n,label:h.txt});cur=h.key}});
  if(!st.length)return[];
  const N=ol.length,res=[];
  if(st[0].a>1)res.push({a:1,b:st[0].a-1,label:'Phần đầu'});
  st.forEach((s,i)=>res.push({a:s.a,b:i+1<st.length?st[i+1].a-1:N,label:s.label}));
  return res}
function partsBySection(info,ol){
  const raw=[];let cur=null;
  info.units.forEach(u=>{
    if(u.startPage==null)return;
    if(!cur)cur={a:u.startPage,b:u.endPage};else{cur.a=Math.min(cur.a,u.startPage);cur.b=Math.max(cur.b,u.endPage)}
    if(u.kind==='p'&&u.sect){raw.push(cur);cur=null}});
  if(cur)raw.push(cur);
  const res=[];
  raw.sort((x,y)=>x.a-y.a).forEach(r=>{
    const l=res[res.length-1];
    if(l&&r.a<=l.b){l.b=Math.max(l.b,r.b)}else res.push({a:r.a,b:r.b})});
  res.forEach((r,i)=>{const o=ol[r.a-1];r.label=(o&&!o.blank&&o.text.slice(0,50))||('Section '+(i+1))});
  return res}

/* ---------- Tiện ích dựng XML ---------- */
const mkEl=(doc,n)=>doc.createElementNS(W,'w:'+n);
function pPrOf(doc,p,create){let pp=one(p,'pPr');if(!pp&&create){pp=mkEl(doc,'pPr');p.insertBefore(pp,p.firstChild)}return pp}
function addPBB(doc,p){
  const pp=pPrOf(doc,p,true);if(one(pp,'pageBreakBefore'))return;
  const SKIP=new Set(['pStyle','keepNext','keepLines']);
  const ref=Array.from(pp.children).find(c=>!(c.namespaceURI===W&&SKIP.has(c.localName)))||null;
  pp.insertBefore(mkEl(doc,'pageBreakBefore'),ref)}
function clearPBB(p){const pp=p&&one(p,'pPr'),b=pp&&one(pp,'pageBreakBefore');if(b)pp.removeChild(b)}
function mkSpacer(doc){ /* đoạn cao ~1pt, bắt đầu trang mới: dùng làm chỗ ngắt giữa hai khoảng trang */
  const p=mkEl(doc,'p'),pp=mkEl(doc,'pPr'),sp=mkEl(doc,'spacing'),rp=mkEl(doc,'rPr'),sz=mkEl(doc,'sz');
  ['before','after'].forEach(k=>sp.setAttributeNS(W,'w:'+k,'0'));sp.setAttributeNS(W,'w:line','20');sp.setAttributeNS(W,'w:lineRule','exact');sz.setAttributeNS(W,'w:val','2');
  rp.appendChild(sz);pp.appendChild(mkEl(doc,'pageBreakBefore'));pp.appendChild(sp);pp.appendChild(rp);p.appendChild(pp);return p}
const carrierSect=p=>{const pp=one(p,'pPr');return pp?one(pp,'sectPr'):null};
function shell(t){const n=t.cloneNode(false);['tblPr','tblGrid'].forEach(k=>{const e=one(t,k);if(e)n.appendChild(e.cloneNode(true))});return n}
function headerIdx(rows,mode){
  if(mode==='none')return[];
  const f=[];
  for(let i=0;i<rows.length;i++){const pr=one(rows[i],'trPr'),h=pr&&one(pr,'tblHeader');
    if(h&&!/^(0|false|off)$/i.test(ga(h,'val')||'1'))f.push(i);else break}
  if(f.length||mode==='flagged')return f;
  return rows.length>1?[0]:[]}
function restartNum(doc){
  const s=doc.getElementsByTagNameNS(W,'sectPr')[0];if(!s)return;
  let pn=one(s,'pgNumType');
  if(!pn){pn=mkEl(doc,'pgNumType');
    const AFTER=new Set(['cols','formProt','vAlign','noEndnote','titlePg','textDirection','bidi','rtlGutter','docGrid','printerSettings','sectPrChange']);
    s.insertBefore(pn,Array.from(s.children).find(c=>c.namespaceURI===W&&AFTER.has(c.localName))||null)}
  pn.setAttributeNS(W,'w:start','1')}
function normRanges(rs){
  const a=rs.map(r=>[Math.min(r[0],r[1]),Math.max(r[0],r[1])]).sort((x,y)=>x[0]-y[0]||x[1]-y[1]),o=[];
  a.forEach(r=>{const l=o[o.length-1];if(l&&r[0]<=l[1]+1)l[1]=Math.max(l[1],r[1]);else o.push(r.slice())});
  return o}
const rngTxt=rs=>rs.map(r=>r[0]===r[1]?String(r[0]):r[0]+'–'+r[1]).join(', ');

/* ---------- Tách ---------- */
function extract(info,ranges,opt){
  opt=opt||{};
  const {doc,body,units}=info,rs=normRanges(ranges),inR=q=>rs.some(r=>q>=r[0]&&q<=r[1]);
  const keep=units.map(u=>{
    if(u.atomic)return inR(u.startPage);
    for(let q=u.startPage;q<=u.endPage;q++)if(inR(q))return true;
    return false});
  /* trang nằm trọn trong phần đuôi của một hàng bảng cao: giữ nguyên cả hàng đó thay vì báo rỗng */
  if(!keep.some(Boolean))units.forEach((u,i)=>{if(u.atomic&&rs.some(r=>u.endPage>=r[0]&&u.startPage<=r[1]))keep[i]=true});
  if(!keep.some(Boolean))throw new Error('Không tìm thấy nội dung nào trong các trang đã chọn.');
  const tinfo=new Map();units.forEach(u=>{if(u.tbl&&!tinfo.has(u.tbl))tinfo.set(u.tbl,kids(u.tbl,'tr'))});
  const bodySect0=one(body,'sectPr');

  /* 1) các "mảnh" nội dung sẽ xuất, theo thứ tự tài liệu; đoạn vắt ngang ranh giới thì cắt (nhiều khoảng → nhân bản thành nhiều mảnh) */
  const P=[];
  units.forEach((u,i)=>{
    if(!keep[i])return;
    if(u.atomic){P.push({u,node:u.node,a:u.startPage,b:u.endPage});return}
    const runs=[];
    for(let q=u.startPage;q<=u.endPage;){if(inR(q)){let z=q;while(z<u.endPage&&inR(z+1))z++;runs.push([q,z]);q=z+1}else q++}
    const cutOf=q=>u.cuts.find(c=>c.page===q);
    const okCuts=runs.every(([qa,qb])=>(qa<=u.startPage||cutOf(qa))&&(qb>=u.endPage||cutOf(qb+1)));
    if(!okCuts||(runs.length===1&&runs[0][0]<=u.startPage&&runs[0][1]>=u.endPage)){P.push({u,node:u.node,a:u.startPage,b:u.endPage});return}
    if(runs.length===1){
      const [qa,qb]=runs[0];
      if(qb<u.endPage)cutEnd(u.node,cutOf(qb+1).first);
      if(qa>u.startPage)cutStart(u.node,cutOf(qa).last);
      P.push({u,node:u.node,a:qa,b:qb});return}
    const orig=u.node,par=orig.parentNode,all=allNodes(orig),ix=el=>all.indexOf(el);
    const specs=runs.map(([qa,qb])=>({qa,qb,s:qa>u.startPage?ix(cutOf(qa).last):-1,e:qb<u.endPage?ix(cutOf(qb+1).first):-1}));
    specs.forEach((sp,k)=>{
      const c=orig.cloneNode(true),al=allNodes(c);
      if(sp.e>=0)cutEnd(c,al[sp.e]);
      if(sp.s>=0)cutStart(c,al[sp.s]);
      if(k<specs.length-1){const pp=one(c,'pPr'),sc=pp&&one(pp,'sectPr');if(sc)pp.removeChild(sc)}
      par.insertBefore(c,orig);P.push({u,node:c,a:sp.qa,b:sp.qb})});
    par.removeChild(orig)});
  P.forEach((pc,k)=>{pc.seam=k>0&&pc.a>P[k-1].b+1}); /* chỗ nối giữa hai khoảng trang rời nhau */

  /* 2) bỏ các đơn vị ngoài khoảng chọn */
  const tbls=new Set();
  units.forEach((u,i)=>{if(!keep[i]&&u.node.parentNode){if(u.tbl)tbls.add(u.tbl);u.node.parentNode.removeChild(u.node)}});
  tbls.forEach(t=>{if(!kids(t,'tr').length&&t.parentNode)t.parentNode.removeChild(t)});

  /* 3) bảng: chèn lại dòng tiêu đề khi bắt đầu giữa bảng; tại chỗ nối thì tách bảng làm đôi + ngắt trang */
  const tst=new Map();
  P.forEach(pc=>{
    const u=pc.u;if(!u.atomic)return;
    const t=u.tbl,rows=tinfo.get(t);
    let st=tst.get(t);if(!st){st={H:headerIdx(rows,opt.hdr),cur:t,prev:-2};tst.set(t,st)}
    const idx=rows.indexOf(u.node),contig=st.prev===idx-1;
    if(pc.seam){
      const sp=mkSpacer(doc);
      if(st.prev>=0){const nt=shell(st.cur),ref=st.cur.nextSibling,par=st.cur.parentNode;par.insertBefore(sp,ref);par.insertBefore(nt,ref);st.cur=nt}
      else t.parentNode.insertBefore(sp,t)}
    if(!contig&&idx>0&&opt.hdr!=='none'){
      st.H.filter(h=>h<idx).forEach(h=>{
        const c=rows[h].cloneNode(true);
        if(u.node.parentNode===st.cur)st.cur.insertBefore(c,u.node);else st.cur.appendChild(c)})}
    if(u.node.parentNode!==st.cur)st.cur.appendChild(u.node);
    st.prev=idx});

  /* 4) chỗ nối giữa các khoảng: giữ đúng section của đoạn cuối khoảng trước + ngắt trang trước khoảng sau */
  P.forEach((pc,k)=>{
    if(!pc.seam)return;
    const prev=P[k-1];
    if(prev.u.kind==='p'&&prev.u.sec!==pc.u.sec&&!carrierSect(prev.node)){
      const cu=units.find(x=>x.kind==='p'&&x.sect&&x.sec===prev.u.sec),src=cu?cu.sect:bodySect0;
      if(src)pPrOf(doc,prev.node,true).appendChild(src.cloneNode(true))}
    if(pc.u.kind==='p'){stripLeading(pc.node);addPBB(doc,pc.node)}});

  /* 5) section cuối: dùng đúng khổ giấy/lề của mảnh cuối cùng */
  const lastPc=P[P.length-1],lastU=lastPc.u,bodySect=one(body,'sectPr');let S=null;
  const lsc=lastU.kind==='p'?carrierSect(lastPc.node):null;
  if(lsc){S=lsc;if(S.parentNode)S.parentNode.removeChild(S)}
  else{const nx=units.slice(lastU.i+1).find(u=>u.sect);if(nx)S=nx.sect.cloneNode(true)}
  if(S){if(bodySect&&bodySect.parentNode)bodySect.parentNode.removeChild(bodySect);body.appendChild(S)}
  if(lsc&&lastPc.node.parentNode&&!Array.from(lastPc.node.children).some(c=>!ln(c,'pPr'))&&P.length>1){lastPc.node.parentNode.removeChild(lastPc.node);lastPc.removed=true}

  /* 6) gỡ ngắt trang thừa ở đầu file, cuối mỗi khoảng và cuối file */
  const f0=P[0];
  if(f0.u.kind==='p')stripLeading(f0.node);else clearPBB(f0.node.getElementsByTagNameNS(W,'p')[0]);
  const trim=k=>{for(let j=k;j>=0;j--){const pc=P[j];if(pc.removed)continue;if(pc.u.kind!=='p')break;if(stripTrailing(pc.node))break}};
  P.forEach((pc,k)=>{if(k<P.length-1&&P[k+1].seam)trim(k)});
  trim(P.length-1);

  /* 7) bảng nằm cuối file cần một đoạn rỗng phía sau */
  const bl=Array.from(body.children).filter(c=>!ln(c,'sectPr')).pop();
  if(bl&&ln(bl,'tbl')){
    const p=mkSpacer(doc),pp=one(p,'pPr');pp.removeChild(one(pp,'pageBreakBefore'));
    bl.parentNode.insertBefore(p,bl.nextSibling)}
  if(opt.renum)restartNum(doc);
  cleanupMarks(doc)}

/* bỏ hình/đối tượng nhúng của các trang đã loại để file nhẹ hơn */
async function prune(zip,docXml){
  const rp='word/_rels/document.xml.rels',f=zip.file(rp);if(!f)return 0;
  const rd=pX(await f.async('string'),rp),used=new Set();
  Array.from(docXml.getElementsByTagName('*')).forEach(e=>Array.from(e.attributes).forEach(a=>{if(a.namespaceURI===R)used.add(a.value)}));
  const PRUNE=/\/(image|oleObject|package)$/;let removed=0;const gone=[];
  Array.from(rd.documentElement.children).forEach(r=>{
    if(!PRUNE.test(r.getAttribute('Type')||'')||r.getAttribute('TargetMode')==='External')return;
    if(used.has(r.getAttribute('Id')))return;
    gone.push(r.getAttribute('Target'));r.parentNode.removeChild(r);removed++});
  if(!removed)return 0;
  zip.file(rp,ser(rd));
  const still=new Set();
  for(const n of Object.keys(zip.files).filter(n=>/^word\/_rels\/.+\.rels$/.test(n))){
    const d=pX(await zip.file(n).async('string'),n);
    Array.from(d.documentElement.children).forEach(r=>{if(r.getAttribute('TargetMode')!=='External')still.add(r.getAttribute('Target'))})}
  gone.forEach(t=>{const path=t[0]==='/'?t.slice(1):'word/'+t;if(!still.has(t)&&zip.file(path))zip.remove(path)});
  return removed}

async function load(buf){
  const zip=await JSZip.loadAsync(buf),df=zip.file('word/document.xml');
  if(!df)throw new Error('Không phải file .docx hợp lệ (thiếu word/document.xml).');
  const sf=zip.file('word/styles.xml'),sd=sf?pX(await sf.async('string'),'styles.xml'):null;
  let wp=0;const af=zip.file('docProps/app.xml');
  if(af){const m=/<(?:\w+:)?Pages>\s*(\d+)\s*<\//.exec(await af.async('string'));if(m)wp=parseInt(m[1],10)}
  return{zip,sd,wp,docStr:await df.async('string')}}

async function inspect(buf){
  const L=await load(buf),info=fixBlank(analyze(pX(L.docStr,'document.xml'),L.sd),L.wp),ol=outline(info);
  return{N:info.N,events:info.events,wordPages:L.wp,guessed:info.guessed,outline:ol,
    parts:{head:partsByHeading(ol,false),sec:partsBySection(info,ol),wide:partsByHeading(ol,true)}}}
async function split(buf,ranges,opt){
  if(typeof ranges==='number'){opt=arguments[3];ranges=[[arguments[1],arguments[2]]]}
  opt=opt||{};
  const L=await load(buf),info=fixBlank(analyze(pX(L.docStr,'document.xml'),L.sd),L.wp),rs=normRanges(ranges);
  if(!rs.length||rs.some(r=>r[0]<1||r[1]>info.N||!isFinite(r[0])||!isFinite(r[1])))throw new Error('Khoảng trang không hợp lệ (file có '+info.N+' trang).');
  extract(info,rs,opt);
  const d=info.doc,hasContent=Array.from(d.getElementsByTagNameNS(W,'t')).some(t=>t.textContent.trim().length)||d.getElementsByTagNameNS(W,'drawing').length||d.getElementsByTagNameNS(W,'pict').length||d.getElementsByTagNameNS(W,'object').length;
  if(!hasContent)throw new Error('Trang '+rngTxt(rs)+' không có chữ hay hình nào (chỉ là trang trống hoặc dòng trống). Không xuất file. Hãy kiểm tra lại số trang.');
  const removed=await prune(L.zip,d);
  L.zip.file('word/document.xml',ser(d));
  try{pX(ser(d),'document.xml')}catch(e){throw new Error('Kiểm tra cấu trúc thất bại, KHÔNG xuất file: '+e.message)}
  return{data:await L.zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),N:info.N,removed}}
async function zipFiles(files){
  const z=new JSZip();files.forEach(f=>z.file(f.name,f.data));
  return z.generateAsync({type:'uint8array',compression:'STORE'})}

/* ---------- Giao diện ---------- */
let cur=null,selP=new Set();
const MIME_DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function setSt(m,k){const e=g('ts_st');e.textContent=m;e.className='status'+(k==='e'?' err':k==='o'?' ok':' info')}
function dl(data,name,mime){
  const b=new Blob([data],{type:mime||MIME_DOCX}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);return b}
const safe=s=>nfc(String(s)).replace(/[\\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,50).trim().replace(/[. ]+$/,'');
const pad=(i,n)=>String(i).padStart(String(n).length<2?2:String(n).length,'0');
const pgLbl=(a,b)=>a===b?'Tr.'+a:'Tr.'+a+'–'+b;
const tick=()=>new Promise(r=>setTimeout(r,0));

function parseRanges(s,N){
  const t=String(s).replace(/\s*(?:[-–—]|đến|den)\s*/gi,'-').trim();
  if(!t)return{err:'Chưa nhập khoảng trang. Gõ ví dụ 1-2, 8-11 hoặc bấm chọn các dòng trong danh sách trang.'};
  const out=[];
  for(const tk of t.split(/[,;\s]+/).filter(Boolean)){
    const m=/^(\d+)(?:-(\d*))?$/.exec(tk);
    if(!m)return{err:'Không hiểu “'+tk+'”. Dùng dạng 1-2, 8-11 hoặc 5.'};
    const a=+m[1],b=m[2]===undefined?a:(m[2]===''?N:+m[2]);
    if(a<1||b<a||b>N)return{err:'Khoảng “'+tk+'” không hợp lệ: file có '+N+' trang, “từ” không lớn hơn “đến”.'};
    out.push([a,b])}
  return{ranges:out}}
function pagesToText(set){
  const a=Array.from(set).sort((x,y)=>x-y),o=[];
  for(let i=0;i<a.length;){let j=i;while(j+1<a.length&&a[j+1]===a[j]+1)j++;o.push(a[i]===a[j]?''+a[i]:a[i]+'-'+a[j]);i=j+1}
  return o.join(', ')}
function paintSel(){Array.from(g('ts_pages').querySelectorAll('.ts_pg')).forEach(r=>{r.style.background=selP.has(+r.dataset.p)?'rgba(46,160,67,.22)':''})}
function syncFromText(){
  selP=new Set();if(!cur)return;
  const r=parseRanges(g('ts_rng').value,cur.N);
  if(r.ranges)r.ranges.forEach(([a,b])=>{for(let q=a;q<=b;q++)selP.add(q)});
  paintSel()}
function setRangeText(rs){g('ts_rng').value=rs.map(r=>r[0]===r[1]?r[0]:r[0]+'-'+r[1]).join(', ');syncFromText()}

function renderFile(){
  g('ts_list').innerHTML=cur?'<div class="frow"><span>📄</span><span class="fnm" title="'+hx(cur.name)+'">'+hx(cur.name)+'</span><span class="fsz">'+fsz(cur.size)+'</span><button class="sec sm" type="button" id="ts_x">✕</button></div>':'';
  g('ts_main').style.display=cur?'':'none';
  const x=g('ts_x');if(x)x.onclick=()=>{cur=null;selP=new Set();renderFile();g('ts_info').textContent='';g('ts_out').innerHTML='';setSt('')}}
function curParts(){return cur?(cur.parts[g('ts_pm').value]||[]):[]}
function renderPages(){
  if(!cur){g('ts_pages').innerHTML='';return}
  const starts=new Set(curParts().map(p=>p.a));
  g('ts_pages').innerHTML=cur.ol.map(o=>'<div class="ts_pg" data-p="'+o.n+'" style="display:flex;gap:8px;padding:6px 4px;border-bottom:1px solid rgba(128,128,128,.25);cursor:pointer">'
    +'<span style="min-width:46px;opacity:.7">Tr.'+o.n+'</span>'
    +'<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'+(starts.has(o.n)?'font-weight:700;':'')+(o.blank||o.cont?'opacity:.6;font-style:italic;':'')+'">'+(o.pic&&!o.blank&&o.lines.length?'🖼 ':'')+hx(o.text.length>90?o.text.slice(0,90)+'…':o.text)+'</span></div>').join('');
  paintSel()}
function renderParts(){
  const ps=curParts();
  g('ts_parts').innerHTML=ps.length?ps.map((p,i)=>'<label class="note" style="display:flex;gap:8px;align-items:flex-start;margin:4px 0"><input type="checkbox" class="ts_pc" data-i="'+i+'" checked><span>'+pgLbl(p.a,p.b)+' · <b>'+hx(p.label)+'</b></span></label>').join(''):'<div class="note">Không nhận ra phần nào theo cách này, hãy thử cách khác hoặc nhập khoảng trang thủ công.</div>';
  renderPages()}
const checkedParts=()=>Array.from(g('ts_parts').querySelectorAll('.ts_pc')).filter(c=>c.checked).map(c=>curParts()[+c.dataset.i]);
const getOpt=()=>({renum:g('ts_renum').checked,hdr:g('ts_hdr').value});

/* ---------- AI nhẹ (Gemini): hiểu yêu cầu như "tách đề 2 và đáp án của nó" ---------- */
/* Chỉ gửi danh sách dòng đầu mỗi trang (không gửi cả bài). Dùng khóa chung window.GKEY (gkey.js). Có thể đổi/thêm tên model ở đây. */
const AI_MODELS=[['gemini-flash-lite-latest','Gemini Flash Lite (mới nhất)'],['gemini-flash-latest','Gemini Flash (mới nhất)'],['gemini-pro-latest','Gemini Pro (mới nhất)']];
async function callGemini(prompt,model){
  const key=window.GKEY&&window.GKEY.get();
  if(!key){if(window.GKEY)window.GKEY.open('Hãy nhập API key Gemini để dùng tính năng AI.');throw new Error('Chưa có API key Gemini.')}
  const body=JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0,responseMimeType:'application/json',
    responseSchema:{type:'OBJECT',properties:{ranges:{type:'ARRAY',items:{type:'OBJECT',properties:{from:{type:'INTEGER'},to:{type:'INTEGER'},label:{type:'STRING'}},required:['from','to']}},note:{type:'STRING'}},required:['ranges']}}});
  let status=0,empty=false;
  /* thử model đã chọn (mặc định Flash Lite) trước; nếu lỗi (hết hạn mức, quá tải, không có model, kết quả rỗng...) mới lần lượt thử các model còn lại. Lỗi do key (400/401/403) thì dừng vì model nào cũng vậy. */
  for(const m of [model].concat(AI_MODELS.map(x=>x[0]).filter(x=>x!==model))){
    let r;
    try{r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body})}
    catch(e){status=0;continue}
    if(r.ok){
      const j=await r.json().catch(()=>({})),pt=((((j.candidates||[])[0]||{}).content||{}).parts||[]).map(x=>x.text||'').join('');
      if(pt)return pt;
      empty=true;status=200;continue}
    status=r.status;
    if(status===400||status===401||status===403)break}
  throw new Error(empty?'AI không trả về kết quả (có thể bị chặn nội dung). Hãy thử diễn đạt lại.':status===429?'Đã hết hạn mức Gemini (429) ở cả các model đã thử. Chờ một lát rồi thử lại.':(status===400||status===401||status===403)?'API key Gemini không hợp lệ hoặc bị khóa — hãy nhập key mới.':status?'Gọi Gemini thất bại ở mọi model đã thử (mã '+status+').':'Không kết nối được tới Gemini. Kiểm tra mạng rồi thử lại.')}
async function aiPick(){
  if(!cur){setSt('Chưa chọn file .docx.','e');return}
  const q=(g('ts_ai').value||'').trim();
  if(!q){setSt('Hãy gõ yêu cầu, ví dụ: tách đề 2 và đáp án của nó.','e');return}
  const trunc=(t,n)=>t.length>n?t.slice(0,n)+'…':t;
  const list=cur.ol.map(o=>'Tr.'+o.n+': '+(o.lines.length?o.lines.slice(0,3).map(l=>trunc(l,80)).join(' | '):o.text)).join('\n');
  const prompt='Bạn giúp tách một file Word theo trang. Dưới đây là '+cur.N+' trang, mỗi trang kèm vài dòng đầu của nó.\n\n'+list+
    '\n\nYêu cầu của người dùng: "'+q+'"\n\nHãy trả về JSON gồm "ranges" (các khoảng trang cần lấy: from, to là số trang từ 1 đến '+cur.N+', label là tên ngắn của khoảng đó, ví dụ "ĐỀ SỐ 02" hoặc "Đáp án đề 02") và "note" (một câu giải thích ngắn bằng tiếng Việt, nêu rõ nếu bạn không chắc). Mỗi khoảng là các trang liền nhau; chỉ lấy đúng phần người dùng yêu cầu. Nếu không tìm thấy, trả "ranges" rỗng và giải thích trong "note".';
  const btn=g('ts_aibtn');btn.disabled=true;setSt('AI đang đọc danh sách trang...');await tick();
  try{
    const out=JSON.parse(await callGemini(prompt,g('ts_aim').value));
    const rs=(Array.isArray(out.ranges)?out.ranges:[]).map(r=>({a:Math.round(+r.from),b:Math.round(+r.to),label:String(r.label||'')})).filter(r=>isFinite(r.a)&&isFinite(r.b)&&r.a>=1&&r.b>=r.a&&r.b<=cur.N);
    if(!rs.length){setSt('AI không tìm thấy phần phù hợp. '+(out.note?'Ghi chú: '+out.note:'Hãy thử diễn đạt lại hoặc chọn trang thủ công.'),'e');btn.disabled=false;return}
    setRangeText(normRanges(rs.map(r=>[r.a,r.b])));
    g('ts_out').innerHTML='<div class="note">🤖 AI đề xuất:<br>'+rs.map(r=>'• '+pgLbl(r.a,r.b)+(r.label?' · <b>'+hx(r.label)+'</b>':'')).join('<br>')+(out.note?'<br><i>'+hx(String(out.note))+'</i>':'')+'</div>';
    setSt('Đã điền khoảng trang AI chọn. Hãy xem lại trong danh sách trang rồi bấm “Tách & Xuất file” (AI có thể nhầm).','o')}
  catch(e){setSt('Lỗi: '+e.message,'e')}
  btn.disabled=false}

async function pick(f){
  if(!f)return;
  if(!/\.docx$/i.test(f.name)){setSt('Chỉ nhận file .docx (file .doc cũ: mở bằng Word, Save As → .docx).','e');return}
  setSt('Đang đọc file...');g('ts_out').innerHTML='';
  try{
    const buf=await f.arrayBuffer(),r=await inspect(buf);
    cur={name:f.name,size:f.size,buf,N:r.N,wp:r.wordPages,guessed:r.guessed,ol:r.outline,parts:r.parts};
    selP=new Set();renderFile();
    g('ts_rng').value='';
    g('ts_name').value=f.name.replace(/\.docx$/i,'')+'_tach.docx';
    const order=['head','sec','wide'],best=order.find(k=>r.parts[k].length>1)||'sec';
    g('ts_pm').value=best;renderParts();
    if(r.N<=1&&!r.events){
      g('ts_info').textContent='⚠ Không thấy thông tin ngắt trang trong file (file chưa được lưu bằng Word hoặc chỉ có 1 trang).';
      setSt('Hãy mở file bằng Word, bấm Ctrl+S rồi đưa lên lại để công cụ biết chính xác mỗi trang bắt đầu từ đâu.','e')}
    else{
      g('ts_info').textContent='Phát hiện '+r.N+' trang (theo ngắt trang Word đã lưu trong file'+(r.guessed?'; trong đó '+r.guessed+' trang chỉ có dòng trống, suy ra từ tổng số trang Word ghi nhận':'')+').';
      if(r.wordPages&&r.wordPages!==r.N)
        setSt('⚠ Word ghi nhận file này có '+r.wordPages+' trang nhưng công cụ chỉ nhận ra '+r.N+' trang nên số trang có thể lệch. Hãy mở file bằng Word, bấm Ctrl+S rồi đưa lên lại.','e');
      else setSt('Chọn trang trong danh sách (hoặc nhập khoảng trang), hoặc tách hàng loạt theo phần ở bên dưới.','')}}
  catch(e){cur=null;renderFile();setSt('Lỗi: '+e.message,'e')}}

async function runJobs(jobs,zipName){
  const files=[],errs=[],used=new Set(),opt=getOpt();
  for(let i=0;i<jobs.length;i++){
    const j=jobs[i];setSt('Đang tách '+(i+1)+'/'+jobs.length+': '+j.label+'...');await tick();
    try{
      const r=await split(cur.buf,j.ranges,opt);
      let nm=j.name,k=2;while(used.has(nm.toLowerCase())){nm=j.name+'_'+k++}
      used.add(nm.toLowerCase());files.push({name:nm+'.docx',data:r.data})}
    catch(e){errs.push(j.label+': '+e.message)}}
  if(!files.length){setSt('Lỗi: '+(errs[0]||'không tách được file nào.'),'e');return}
  const data=await zipFiles(files),b=dl(data,zipName,'application/zip');
  g('ts_out').innerHTML='<div class="note">✅ Đã tạo <b>'+hx(zipName)+'</b> ('+fsz(b.size)+') gồm '+files.length+' file:<br>'+files.map(f=>'• '+hx(f.name)).join('<br>')+(errs.length?'<br><br>⚠ Bỏ qua '+errs.length+' phần lỗi:<br>'+errs.map(e=>'• '+hx(e)).join('<br>'):'')+'<br>File gốc không bị thay đổi.</div>';
  setSt('Xong. Giải nén ZIP rồi mở từng file bằng Word để kiểm tra.',errs.length?'e':'o')}
const baseName=()=>cur.name.replace(/\.docx$/i,'');
async function runZipParts(){
  if(!cur){setSt('Chưa chọn file .docx.','e');return}
  const ps=checkedParts();if(!ps.length){setSt('Chưa tick phần nào để tách.','e');return}
  const btn=g('ts_pzip');btn.disabled=true;
  try{await runJobs(ps.map((p,i)=>({ranges:[[p.a,p.b]],label:p.label,name:pad(i+1,ps.length)+'_'+(safe(p.label)||('Phan_'+(i+1)))})),safe(baseName())+'_tach.zip')}
  catch(e){setSt('Lỗi: '+e.message,'e')}
  btn.disabled=false}
async function run(){
  if(!cur){setSt('Chưa chọn file .docx.','e');return}
  const pr=parseRanges(g('ts_rng').value,cur.N);
  if(pr.err){setSt(pr.err,'e');return}
  const rs=normRanges(pr.ranges),btn=g('ts_run');btn.disabled=true;
  try{
    if(g('ts_sep').checked&&rs.length>1)
      await runJobs(rs.map(([a,b],i)=>{const o=cur.ol[a-1];return{ranges:[[a,b]],label:pgLbl(a,b),name:pad(i+1,rs.length)+'_Tr'+(a===b?a:a+'-'+b)+(o&&!o.blank?'_'+safe(o.text.slice(0,30)):'')}}),safe(baseName())+'_tach.zip');
    else{
      let name=(g('ts_name').value||'').trim()||'tach.docx';if(!/\.docx$/i.test(name))name+='.docx';
      setSt('Đang tách trang '+rngTxt(rs)+'...');await tick();
      const r=await split(cur.buf,rs,getOpt()),b2=dl(r.data,name),cnt=rs.reduce((s,x)=>s+x[1]-x[0]+1,0);
      g('ts_out').innerHTML='<div class="note">✅ Đã tách trang '+rngTxt(rs)+' (tổng '+cnt+' trang) từ file '+r.N+' trang → <b>'+hx(name)+'</b> ('+fsz(b2.size)+'). '+(rs.length>1?'Các khoảng được gộp theo thứ tự trong file gốc, mỗi khoảng bắt đầu ở trang mới. ':'')+(r.removed?'Đã bỏ '+r.removed+' hình/đối tượng của các trang không chọn. ':'')+'File gốc không bị thay đổi.</div>';
      setSt('Xong. Mở file kết quả bằng Word để kiểm tra; nếu có mục lục/số trang, bấm Ctrl+A rồi F9 để cập nhật.','o')}}
  catch(e){setSt('Lỗi: '+e.message,'e')}
  btn.disabled=false}
function build(){
  if(g('wtSplit'))return;
  const d=document.createElement('div');d.className='wtool';d.id='wtSplit';
  d.innerHTML='<div class="note">Đưa 1 file .docx lên → xem <b>danh sách trang kèm dòng đầu mỗi trang</b> → bấm chọn trang (hoặc gõ khoảng trang như <b>1-2, 8-11</b>) → xuất file Word mới. Cũng có thể <b>tách hàng loạt theo phần</b> (ĐỀ SỐ, ĐÁP ÁN, section...) ra file ZIP. Số trang lấy theo ngắt trang Word đã lưu trong file. File gốc không bị thay đổi.</div>'
  +'<div class="bar"><input type="file" id="ts_in" accept=".docx" style="display:none"><button class="ghost" id="ts_pick" type="button">📁 Chọn file .docx (hoặc kéo thả vào đây)</button></div><div id="ts_list"></div><div id="ts_info" class="note"></div>'
  +'<div id="ts_main" style="display:none">'
  +'<details open><summary class="note" style="cursor:pointer">📃 Danh sách trang (bấm vào dòng để chọn / bỏ chọn; dòng đậm là chỗ bắt đầu một phần)</summary><div id="ts_pages" style="max-height:320px;overflow:auto;border:1px solid rgba(128,128,128,.3);border-radius:8px"></div></details>'
  +'<div class="bar"><label class="note" style="margin:0">Khoảng trang <input type="text" id="ts_rng" placeholder="vd: 1-2, 8-11" style="width:240px"></label><label class="note" style="margin:0">Tên file xuất <input type="text" id="ts_name" value="tach.docx" style="width:220px"></label></div>'
  +'<div class="bar"><label class="note" style="margin:0;flex:1 1 260px">🤖 Nhờ AI chọn trang <input type="text" id="ts_ai" placeholder="vd: tách đề 2 và đáp án của nó" style="width:min(340px,100%)"></label><select id="ts_aim">'+AI_MODELS.map(m=>'<option value="'+m[0]+'"'+(m[0]==='gemini-flash-lite-latest'?' selected':'')+'>'+m[1]+'</option>').join('')+'</select><button class="ghost" id="ts_aibtn" type="button">Hỏi AI</button></div>'
  +'<div class="note" style="margin-top:-4px">AI chỉ nhận danh sách dòng đầu của từng trang (không gửi cả bài) và dùng API key Gemini đã nhập ở đầu trang.</div>'
  +'<div class="bar"><label class="note" style="margin:0"><input type="checkbox" id="ts_renum" checked> Đánh lại số trang từ 1</label><label class="note" style="margin:0"><input type="checkbox" id="ts_sep"> Mỗi khoảng một file (xuất ZIP)</label>'
  +'<label class="note" style="margin:0">Dòng tiêu đề bảng <select id="ts_hdr"><option value="auto">Tự chèn lại (dòng đã đặt Repeat Header, không có thì dòng đầu)</option><option value="flagged">Chỉ dòng đã đặt Repeat Header</option><option value="none">Không chèn</option></select></label></div>'
  +'<div class="bar"><button class="green" id="ts_run" type="button">✂️ Tách &amp; Xuất file</button></div>'
  +'<div class="note"><b>Tách hàng loạt theo phần có sẵn</b> — chọn cách nhận dạng, tick các phần cần lấy, mỗi phần thành một file trong ZIP.</div>'
  +'<div class="bar"><select id="ts_pm"><option value="head">Theo tiêu đề ĐỀ SỐ / ĐÁP ÁN</option><option value="sec">Theo ngắt section</option><option value="wide">Theo tiêu đề rộng (thêm PHẦN, BÀI, CHƯƠNG, PHỤ LỤC)</option></select></div>'
  +'<div id="ts_parts"></div>'
  +'<div class="bar"><button class="green" id="ts_pzip" type="button">📦 Tách các phần đã tick ra ZIP</button><button class="ghost" id="ts_pfill" type="button">Đưa vào ô khoảng trang</button></div>'
  +'</div><div id="ts_st" class="status"></div><div id="ts_out"></div>'
  +'<div class="note">Lưu ý: nếu một đoạn văn bị ngắt trang ở giữa, công cụ cắt đúng tại dòng đầu/cuối của trang đã chọn. Hàng bảng bị ngắt giữa hai trang được tính vào trang nơi hàng đó bắt đầu. Nhiều khoảng được gộp theo thứ tự trong file gốc. File tạo bằng Google Docs / LibreOffice / python-docx thường chưa có thông tin ngắt trang: hãy mở bằng Word, Ctrl+S rồi đưa lên lại. Ghi chú cuối trang của các trang bị loại không còn hiển thị; mục lục cần cập nhật lại (F9).</div>';
  const mg=g('wtMerge'),tools=Array.from(t3.querySelectorAll('.wtool')),anchor=mg||tools[tools.length-1];
  if(anchor)anchor.insertAdjacentElement('afterend',d);else t3.appendChild(d);
  if(!Array.from(sel.options).some(o=>o.value==='wtSplit')){
    const op=document.createElement('option');op.value='wtSplit';op.textContent='✂️ Tách file Word';
    const m=Array.from(sel.options).find(o=>o.value==='wtMerge');
    if(m)sel.insertBefore(op,m.nextSibling);else sel.appendChild(op)}
  g('ts_pick').onclick=()=>g('ts_in').click();
  g('ts_in').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';pick(f)};
  ['dragover','drop'].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'&&e.dataTransfer&&e.dataTransfer.files[0])pick(e.dataTransfer.files[0])}));
  g('ts_pages').onclick=e=>{
    const r=e.target.closest&&e.target.closest('.ts_pg');if(!r)return;
    const p=+r.dataset.p;if(selP.has(p))selP.delete(p);else selP.add(p);
    g('ts_rng').value=pagesToText(selP);paintSel()};
  g('ts_rng').oninput=syncFromText;
  g('ts_pm').onchange=renderParts;
  g('ts_pfill').onclick=()=>{const ps=checkedParts();if(ps.length)setRangeText(normRanges(ps.map(p=>[p.a,p.b])))};
  g('ts_pzip').onclick=runZipParts;
  g('ts_run').onclick=run;
  /* AI là phần tùy chọn: nếu lỗi gì ở đây thì các chức năng tách file khác vẫn chạy bình thường */
  try{g('ts_aibtn').onclick=()=>aiPick().catch(e=>setSt('Lỗi AI: '+e.message,'e'));
    g('ts_ai').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();g('ts_aibtn').click()}})}catch(e){}}
window.TachFileWord={inspect,split,analyze,extract,outline,_pX:pX};
build();
})();
