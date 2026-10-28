/* Công cụ Word · "Tách file Word"
   Đưa file .docx lên → nhập "từ trang … đến trang …" → xuất file .docx mới chỉ gồm các trang đó.
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
  const S={page:1,started:false,pend:null,bnd:{},events:0};
  units.forEach((u,i)=>{u.i=i;u.atoms=0;u.cuts=[];u.startPage=null;u.endPage=null;u.split=false});

  function consume(u){
    const pd=S.pend;S.pend=null;
    if(!S.started)return;
    S.page++;
    if(u.atomic){
      if(u.atoms===0)S.bnd[S.page]={u:u.i};
      else if(!u.split){u.split=true;S.bnd[S.page]={u:u.i+1}}
      else S.page--}
    else{
      const mine=pd.evs.filter(e=>e.u===u&&e.el);
      if(mine.length&&mine[0].before>0){u.cuts.push({page:S.page,first:mine[0].el,last:mine[mine.length-1].el});S.bnd[S.page]={u:u.i,inpara:true}}
      else S.bnd[S.page]={u:u.i}}}
  function ev(u,el){S.events++;if(!S.pend)S.pend={evs:[]};S.pend.evs.push({u,el,before:u?u.atoms:0})}
  function atom(u,ctx){
    if(S.pend)consume(u);
    S.started=true;u.atoms++;if(ctx)ctx.n++;
    if(u.startPage===null)u.startPage=S.page;
    u.endPage=S.page}
  function evt(u,ctx,el){if(u.atomic&&u.atoms>0&&ctx&&ctx.n===0)return;ev(u,el)}

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

/* ---------- Tách ---------- */
function extract(info,a,b){
  const {doc,body,units}=info,keep=units.map(u=>u.atomic?(u.startPage>=a&&u.startPage<=b):(u.endPage>=a&&u.startPage<=b));
  if(!keep.some(Boolean))throw new Error('Không tìm thấy nội dung nào trong các trang '+a+'–'+b+'.');
  const firstU=units.find((u,i)=>keep[i]),lastU=units.slice().reverse().find(u=>keep[u.i]);
  /* 1) cắt đoạn nằm vắt ngang ranh giới */
  units.forEach((u,i)=>{
    if(!keep[i]||u.atomic)return;
    if(u.endPage>b){const c=u.cuts.find(x=>x.page===b+1);if(c)cutEnd(u.node,c.first)}
    if(u.startPage<a){const c=u.cuts.find(x=>x.page===a);if(c)cutStart(u.node,c.last)}});
  /* 2) bỏ các đơn vị ngoài khoảng chọn */
  const tbls=new Set();
  units.forEach((u,i)=>{if(!keep[i]&&u.node.parentNode){if(u.tbl)tbls.add(u.tbl);u.node.parentNode.removeChild(u.node)}});
  tbls.forEach(t=>{if(!kids(t,'tr').length&&t.parentNode)t.parentNode.removeChild(t)});
  /* 3) section: phần cuối của file mới phải dùng đúng khổ giấy/lề của đoạn nội dung cuối cùng */
  const bodySect=one(body,'sectPr');let S=null;
  if(lastU.kind==='p'&&lastU.sect){S=lastU.sect;if(S.parentNode)S.parentNode.removeChild(S)}
  else{const nx=units.slice(lastU.i+1).find(u=>u.sect);if(nx)S=nx.sect.cloneNode(true)}
  if(S){if(bodySect&&bodySect.parentNode)bodySect.parentNode.removeChild(bodySect);body.appendChild(S)}
  /* đoạn chỉ còn dùng để chứa section (không có chữ) thì bỏ luôn để khỏi thừa dòng trống cuối file */
  if(lastU.kind==='p'&&lastU.sect&&lastU.node.parentNode&&!Array.from(lastU.node.children).some(c=>!ln(c,'pPr'))&&lastU.i>0&&keep.slice(0,lastU.i).some(Boolean)){lastU.node.parentNode.removeChild(lastU.node);lastU.removed=true}
  /* 4) gỡ ngắt trang thừa ở đầu/cuối */
  if(firstU.kind==='p')stripLeading(firstU.node);
  for(let i=lastU.i;i>=0;i--){const u=units[i];if(!keep[i]||u.removed)continue;if(u.kind!=='p')break;if(stripTrailing(u.node))break}
  /* 5) bảng nằm cuối file cần một đoạn rỗng phía sau */
  const bl=Array.from(body.children).filter(c=>!ln(c,'sectPr')).pop();
  if(bl&&ln(bl,'tbl')){
    const p=doc.createElementNS(W,'w:p'),pp=doc.createElementNS(W,'w:pPr'),sp=doc.createElementNS(W,'w:spacing'),rp=doc.createElementNS(W,'w:rPr'),sz=doc.createElementNS(W,'w:sz');
    ['before','after'].forEach(k=>sp.setAttributeNS(W,'w:'+k,'0'));sp.setAttributeNS(W,'w:line','20');sp.setAttributeNS(W,'w:lineRule','exact');sz.setAttributeNS(W,'w:val','2');
    rp.appendChild(sz);pp.appendChild(sp);pp.appendChild(rp);p.appendChild(pp);bl.parentNode.insertBefore(p,bl.nextSibling)}
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
  return{zip,sd,docStr:await df.async('string')}}

async function inspect(buf){
  const L=await load(buf),info=analyze(pX(L.docStr,'document.xml'),L.sd);
  return{N:info.N,events:info.events}}
async function split(buf,a,b){
  const L=await load(buf),info=analyze(pX(L.docStr,'document.xml'),L.sd);
  if(a<1||b<a||b>info.N)throw new Error('Khoảng trang không hợp lệ (file có '+info.N+' trang).');
  extract(info,a,b);
  const removed=await prune(L.zip,info.doc);
  L.zip.file('word/document.xml',ser(info.doc));
  const err=[];try{pX(ser(info.doc),'document.xml')}catch(e){err.push(e.message)}
  if(err.length)throw new Error('Kiểm tra cấu trúc thất bại, KHÔNG xuất file: '+err[0]);
  return{data:await L.zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),N:info.N,removed}}

/* ---------- Giao diện ---------- */
let cur=null;
function setSt(m,k){const e=g('ts_st');e.textContent=m;e.className='status'+(k==='e'?' err':k==='o'?' ok':' info')}
function dl(data,name){
  const b=new Blob([data],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);return b}
function renderFile(){
  g('ts_list').innerHTML=cur?'<div class="frow"><span>📄</span><span class="fnm" title="'+hx(cur.name)+'">'+hx(cur.name)+'</span><span class="fsz">'+fsz(cur.size)+'</span><button class="sec sm" type="button" id="ts_x">✕</button></div>':'';
  const x=g('ts_x');if(x)x.onclick=()=>{cur=null;renderFile();g('ts_info').textContent='';g('ts_out').innerHTML='';setSt('')}}
async function pick(f){
  if(!f)return;
  if(!/\.docx$/i.test(f.name)){setSt('Chỉ nhận file .docx (file .doc cũ: mở bằng Word, Save As → .docx).','e');return}
  setSt('Đang đọc file...');g('ts_out').innerHTML='';
  try{
    const buf=await f.arrayBuffer(),r=await inspect(buf);
    cur={name:f.name,size:f.size,buf,N:r.N};renderFile();
    g('ts_from').value=1;g('ts_to').value=r.N;g('ts_from').max=g('ts_to').max=r.N;
    const base=f.name.replace(/\.docx$/i,'');g('ts_name').value=base+'_tach.docx';
    if(r.N<=1&&!r.events){
      g('ts_info').textContent='⚠ Không thấy thông tin ngắt trang trong file (file chưa được lưu bằng Word hoặc chỉ có 1 trang).';
      setSt('Hãy mở file bằng Word, bấm Ctrl+S rồi đưa lên lại để công cụ biết chính xác mỗi trang bắt đầu từ đâu.','e')}
    else{
      g('ts_info').textContent='Phát hiện '+r.N+' trang (theo ngắt trang Word đã lưu trong file).';
      setSt('Nhập khoảng trang cần tách rồi bấm “Tách & Xuất file”.','')}}
  catch(e){cur=null;renderFile();setSt('Lỗi: '+e.message,'e')}}
async function run(){
  if(!cur){setSt('Chưa chọn file .docx.','e');return}
  const a=parseInt(g('ts_from').value,10),b=parseInt(g('ts_to').value,10);
  if(!isFinite(a)||!isFinite(b)||a<1||b<a||b>cur.N){setSt('Khoảng trang không hợp lệ: nhập từ 1 đến '+cur.N+', “từ trang” không lớn hơn “đến trang”.','e');return}
  let name=(g('ts_name').value||'').trim()||'tach.docx';if(!/\.docx$/i.test(name))name+='.docx';
  const btn=g('ts_run');btn.disabled=true;setSt('Đang tách trang '+a+'–'+b+'...');
  try{
    const r=await split(cur.buf,a,b),b2=dl(r.data,name);
    g('ts_out').innerHTML='<div class="note">✅ Đã tách trang '+a+(b>a?' đến '+b:'')+' (tổng '+(b-a+1)+' trang) từ file '+r.N+' trang → <b>'+hx(name)+'</b> ('+fsz(b2.size)+'). '+(r.removed?'Đã bỏ '+r.removed+' hình/đối tượng của các trang không chọn. ':'')+'File gốc không bị thay đổi.</div>';
    setSt('Xong. Mở file kết quả bằng Word để kiểm tra; nếu có mục lục/số trang, bấm Ctrl+A rồi F9 để cập nhật.','o')}
  catch(e){setSt('Lỗi: '+e.message,'e')}
  btn.disabled=false}
function build(){
  if(g('wtSplit'))return;
  const d=document.createElement('div');d.className='wtool';d.id='wtSplit';
  d.innerHTML='<div class="note">Đưa 1 file .docx lên, nhập <b>từ trang … đến trang …</b> → xuất file Word mới chỉ gồm các trang đó (muốn lấy đúng 1 trang thì nhập cùng số, ví dụ từ 16 đến 16). Số trang lấy theo ngắt trang mà Word đã lưu trong file nên khớp với số trang bạn thấy trong Word. File gốc không bị thay đổi.</div>'
  +'<div class="bar"><input type="file" id="ts_in" accept=".docx" style="display:none"><button class="ghost" id="ts_pick" type="button">📁 Chọn file .docx (hoặc kéo thả vào đây)</button></div><div id="ts_list"></div><div id="ts_info" class="note"></div>'
  +'<div class="bar"><label class="note" style="margin:0">Từ trang <input type="number" id="ts_from" value="1" min="1" step="1" style="width:80px"></label><label class="note" style="margin:0">Đến trang <input type="number" id="ts_to" value="1" min="1" step="1" style="width:80px"></label><label class="note" style="margin:0">Tên file xuất <input type="text" id="ts_name" value="tach.docx" style="width:220px"></label></div>'
  +'<div class="bar"><button class="green" id="ts_run" type="button">✂️ Tách &amp; Xuất file</button></div><div id="ts_st" class="status"></div><div id="ts_out"></div>'
  +'<div class="note">Lưu ý: nếu một đoạn văn bị ngắt trang ở giữa, công cụ cắt đúng tại dòng đầu/cuối của trang đã chọn. Hàng bảng bị ngắt giữa hai trang được tính vào trang nơi hàng đó bắt đầu. File tạo bằng Google Docs / LibreOffice / python-docx thường chưa có thông tin ngắt trang: hãy mở bằng Word, Ctrl+S rồi đưa lên lại. Ghi chú cuối trang của các trang bị loại không còn hiển thị; mục lục cần cập nhật lại (F9).</div>';
  const mg=g('wtMerge'),tools=Array.from(t3.querySelectorAll('.wtool')),anchor=mg||tools[tools.length-1];
  if(anchor)anchor.insertAdjacentElement('afterend',d);else t3.appendChild(d);
  /* mục chọn: ngay dưới "Ghép file Word" */
  if(!Array.from(sel.options).some(o=>o.value==='wtSplit')){
    const op=document.createElement('option');op.value='wtSplit';op.textContent='✂️ Tách file Word';
    const m=Array.from(sel.options).find(o=>o.value==='wtMerge');
    if(m)sel.insertBefore(op,m.nextSibling);else sel.appendChild(op)}
  g('ts_pick').onclick=()=>g('ts_in').click();
  g('ts_in').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';pick(f)};
  ['dragover','drop'].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'&&e.dataTransfer&&e.dataTransfer.files[0])pick(e.dataTransfer.files[0])}));
  g('ts_run').onclick=run}
window.TachFileWord={inspect,split,analyze,extract,_pX:pX};
build();
})();
