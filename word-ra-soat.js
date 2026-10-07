/* Công cụ Word · "Rà soát Word toàn diện"
   Đưa file .docx lên → tự rà soát & sửa lỗi bố cục/định dạng/bảng/hình/công thức → xuất .docx mới + báo cáo.
   Cần: JSZip (index.html đã nạp) · word-latex.js (convertDocumentXML) · gkey.js (tùy chọn, cho AI soát chính tả).
   Tự chèn mục "🔍 Rà soát Word toàn diện" vào ô chọn công cụ #wtSel — không cần sửa HTML, chỉ thêm 1 thẻ <script>. */
(function(){
'use strict';
const sel=document.getElementById('wtSel'),t3=document.getElementById('t3');
if(!sel||!t3)return;
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',
M='http://schemas.openxmlformats.org/officeDocument/2006/math',
WP='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
A='http://schemas.openxmlformats.org/drawingml/2006/main',
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',
XMLNS='http://www.w3.org/XML/1998/namespace';
const ORD={
rPr:'rStyle rFonts b bCs i iCs caps smallCaps strike dstrike outline shadow emboss imprint noProof snapToGrid vanish webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs em lang eastAsianLayout specVanish oMath'.split(' '),
pPr:'pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange'.split(' '),
sectPr:'headerReference footerReference footnotePr endnotePr type pgSz pgMar paperSrc pgBorders lnNumType pgNumType cols formProt vAlign noEndnote titlePg textDirection bidi rtlGutter docGrid printerSettings sectPrChange'.split(' '),
tcPr:'cnfStyle tcW gridSpan hMerge vMerge tcBorders shd noWrap tcMar textDirection tcFitText vAlign hideMark'.split(' '),
tblPr:'tblStyle tblpPr tblOverlap bidiVisual tblStyleRowBandSize tblStyleColBandSize tblW jc tblCellSpacing tblInd tblBorders shd tblLayout tblCellMar tblLook'.split(' '),
trPr:'cnfStyle divId gridBefore gridAfter wBefore wAfter cantSplit trHeight tblHeader tblCellSpacing jc hidden ins del trPrChange'.split(' ')};
const SYM=/symbol|wingdings|webdings|cambria math/i;
const LEGACY_FONT=/^(\.vn|vni-|vn[a-z]|\.?tcvn|\.abc)/i;
const g=id=>document.getElementById(id);
const hx=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tick=()=>new Promise(r=>setTimeout(r,0));
const pX=(s,n)=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('XML không đọc được'+(n?' ('+n+')':''));return d};
const ser=d=>{const s=new XMLSerializer().serializeToString(d);return /^<\?xml/.test(s)?s:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+s};
const one=(p,n)=>p?Array.from(p.children).find(c=>c.localName===n&&c.namespaceURI===W)||null:null;
const wk=(p,n)=>Array.from(p.children).filter(c=>c.localName===n&&c.namespaceURI===W);
const all=(r,n,ns)=>Array.from(r.getElementsByTagNameNS(ns||W,n));
const mk=(d,n)=>d.createElementNS(W,'w:'+n);
const sa=(e,n,v)=>e.setAttributeNS(W,'w:'+n,String(v));
const ga=(e,n)=>e?e.getAttributeNS(W,n)||'':'';
const rm=e=>{if(e&&e.parentNode)e.parentNode.removeChild(e)};
const anc=(e,n)=>{for(let p=e.parentNode;p&&p.nodeType===1;p=p.parentNode)if(p.localName===n&&p.namespaceURI===W)return p;return null};
const inMath=e=>{for(let p=e.parentNode;p&&p.nodeType===1;p=p.parentNode)if(p.namespaceURI===M&&(p.localName==='oMath'||p.localName==='oMathPara'))return true;return false};
function sc(d,par,n,ord){let e=one(par,n);if(e)return e;e=mk(d,n);const i=ord.indexOf(n);let ref=null;
  for(const c of Array.from(par.children)){const k=c.namespaceURI===W?ord.indexOf(c.localName):-1;if(k>i){ref=c;break}}
  par.insertBefore(e,ref);return e}
function setXS(t){if(/^\s|\s$/.test(t.textContent))t.setAttributeNS(XMLNS,'xml:space','preserve')}
function rs(dir,t){if(t[0]==='/')return t.slice(1);const o=[];(dir+t).split('/').forEach(s=>{if(s==='..')o.pop();else if(s&&s!=='.')o.push(s)});return o.join('/')}
function mkRep(){const f=new Map(),w=[],notes=[];return{f,w,notes,fix:(k,n)=>{n=n===undefined?1:n;if(n>0)f.set(k,(f.get(k)||0)+n)},warn:m=>{if(w.indexOf(m)<0)w.push(m)}}}

/* ---------- Phân loại đoạn ---------- */
const PI=new WeakMap();
function pInfo(p){if(PI.has(p))return PI.get(p);
  const pPr=one(p,'pPr'),st=pPr&&one(pPr,'pStyle'),sv=st?ga(st,'val'):'';
  const r={list:!!(pPr&&one(pPr,'numPr'))||/list|bullet|number|danh/i.test(sv),head:/^(head|title|tiêu|tieu)/i.test(sv)||!!(pPr&&one(pPr,'outlineLvl'))||pseudoHead(p)};
  PI.set(p,r);return r}
const ptext=p=>all(p,'t').filter(t=>!inMath(t)).map(t=>t.textContent).join('');
const KEEP=['drawing','pict','object','sym','fldChar','fldSimple','sectPr','footnoteReference','endnoteReference','commentReference','ptab','bookmarkStart'];
const hasSect=p=>{const pp=one(p,'pPr');return !!(pp&&one(pp,'sectPr'))};
const hasPB=p=>all(p,'br').some(b=>ga(b,'type')==='page');
function isE(p){return p.localName==='p'&&p.namespaceURI===W&&!all(p,'t').some(t=>t.textContent.trim())&&!KEEP.some(n=>p.getElementsByTagNameNS(W,n).length)&&!p.getElementsByTagNameNS(M,'oMath').length&&!p.getElementsByTagNameNS(M,'oMathPara').length}
const pbOnly=p=>p.localName==='p'&&p.namespaceURI===W&&hasPB(p)&&!all(p,'t').some(t=>t.textContent.trim())&&!KEEP.some(n=>p.getElementsByTagNameNS(W,n).length)&&!p.getElementsByTagNameNS(M,'oMath').length;

/* ====================================================================
   NÂNG CẤP v2 — mô hình văn bản cấp ĐOẠN · sửa dấu câu · bắt lỗi gõ sai ·
   đánh dấu Comment tại chỗ · Track Changes · kiểm lại nhiều vòng
   ==================================================================== */
const BAR='\u0001',MTH='\u0002',CTNS='http://schemas.openxmlformats.org/package/2006/content-types',RELNS='http://schemas.openxmlformats.org/package/2006/relationships';
const TRK={on:false,id:900000,author:'Rà soát tự động',date:''};
let PSEUDO=true;

/* Văn bản của một đoạn: ghép chữ qua nhiều run. Tab/xuống dòng/hình/trường = BAR, công thức = MTH (không bao giờ bị sửa) */
function pModel(p){
  const nodes=[];let S='';
  const bar=ch=>{if(S[S.length-1]!==ch)S+=ch};
  const walk=n=>{
    for(const c of Array.from(n.childNodes)){
      if(c.nodeType!==1)continue;
      const ns=c.namespaceURI,ln=c.localName;
      if(ns===M){bar(MTH);continue}
      if(ns!==W){bar(BAR);continue}
      switch(ln){
        case 't':nodes.push({t:c,s:S.length,n:c.textContent.length});S+=c.textContent;break;
        case 'pPr':case 'rPr':case 'sdtPr':case 'sdtEndPr':case 'delText':case 'instrText':case 'del':case 'moveFrom':
        case 'bookmarkStart':case 'bookmarkEnd':case 'commentRangeStart':case 'commentRangeEnd':case 'proofErr':
        case 'permStart':case 'permEnd':case 'lastRenderedPageBreak':case 'p':break;
        case 'tab':case 'br':case 'cr':case 'sym':case 'ptab':case 'noBreakHyphen':case 'softHyphen':case 'drawing':case 'pict':
        case 'object':case 'fldChar':case 'footnoteReference':case 'endnoteReference':case 'commentReference':
        case 'footnoteRef':case 'endnoteRef':case 'annotationRef':case 'separator':case 'continuationSeparator':bar(BAR);break;
        default:walk(c)}}};
  walk(p);return{S,nodes}}

/* ---- Sửa trực tiếp hoặc ghi Track Changes ---- */
function trkAttrs(e){sa(e,'id',++TRK.id);sa(e,'author',TRK.author);sa(e,'date',TRK.date)}
function explode(doc,r){
  const pr=one(r,'rPr'),kids=Array.from(r.children).filter(c=>c!==pr);
  if(kids.length<=1)return;
  let ref=r;
  kids.slice(1).forEach(k=>{const nr=r.cloneNode(false);if(pr)nr.appendChild(pr.cloneNode(true));nr.appendChild(k);ref.parentNode.insertBefore(nr,ref.nextSibling);ref=nr})}
function splitRun(doc,r,t,k){
  const txt=t.textContent,nr=r.cloneNode(false),pr=one(r,'rPr');
  if(pr)nr.appendChild(pr.cloneNode(true));
  const nt=mk(doc,'t');nt.textContent=txt.slice(k);setXS(nt);nr.appendChild(nt);
  t.textContent=txt.slice(0,k);setXS(t);
  r.parentNode.insertBefore(nr,r.nextSibling);return nr}
function trkDel(doc,t,a,b){
  let r=t.parentNode;if(!r||r.localName!=='r'||r.namespaceURI!==W)return null;
  explode(doc,r);r=t.parentNode;
  const len=t.textContent.length;let mid=r;
  if(b<len)splitRun(doc,r,t,b);
  if(a>0)mid=splitRun(doc,r,t,a);
  const mt=mid===r?t:one(mid,'t'),dt=mk(doc,'delText');
  dt.textContent=mt.textContent;dt.setAttributeNS(XMLNS,'xml:space','preserve');
  mid.replaceChild(dt,mt);
  const d=mk(doc,'del');trkAttrs(d);mid.parentNode.insertBefore(d,mid);d.appendChild(mid);return d}
function mkIns(doc,pr,text){
  const ins=mk(doc,'ins');trkAttrs(ins);
  const r=mk(doc,'r');if(pr)r.appendChild(pr.cloneNode(true));
  const t=mk(doc,'t');t.textContent=text;setXS(t);r.appendChild(t);ins.appendChild(r);return ins}
function trkInsAfter(doc,d,text){
  const r0=d.firstElementChild,ins=mkIns(doc,r0&&one(r0,'rPr'),text);
  d.parentNode.insertBefore(ins,d.nextSibling)}
function trkInsAt(doc,t,pos,text){
  let r=t.parentNode;
  if(!r||r.localName!=='r'||r.namespaceURI!==W){const v=t.textContent;t.textContent=v.slice(0,pos)+text+v.slice(pos);setXS(t);return}
  explode(doc,r);r=t.parentNode;
  const len=t.textContent.length,pr=one(r,'rPr');
  if(pos<=0){r.parentNode.insertBefore(mkIns(doc,pr,text),r);return}
  if(pos<len)splitRun(doc,r,t,pos);
  r.parentNode.insertBefore(mkIns(doc,pr,text),r.nextSibling)}
/* ed = {s,e,r,k}: xóa [s,e) rồi chèn r (vị trí tính theo pModel(p).S) */
function applyEdit(p,ed){
  const doc=p.ownerDocument,nodes=pModel(p).nodes,pieces=[];
  for(const x of nodes){const a=Math.max(ed.s,x.s),b=Math.min(ed.e,x.s+x.n);if(a<b)pieces.push({x,a:a-x.s,b:b-x.s})}
  let ins=null;
  if(ed.r&&!pieces.length){
    const x=ed.s>0?nodes.find(y=>ed.s-1>=y.s&&ed.s-1<y.s+y.n):null;
    if(x)ins={x,pos:ed.s-x.s};
    else{const f=nodes.find(y=>y.s>=ed.s);if(f)ins={x:f,pos:0}}}
  for(let k=pieces.length-1;k>=0;k--){
    const {x,a,b}=pieces[k],t=x.t,first=k===0;
    let d=null;
    if(TRK.on&&!anc(t,'ins'))d=trkDel(doc,t,a,b);
    if(d){if(first&&ed.r)trkInsAfter(doc,d,ed.r)}
    else{const v=t.textContent;t.textContent=v.slice(0,a)+(first&&ed.r?ed.r:'')+v.slice(b);setXS(t)}}
  if(ins){
    const t=ins.x.t;
    if(TRK.on&&!anc(t,'ins'))trkInsAt(doc,t,ins.pos,ed.r);
    else{const v=t.textContent;t.textContent=v.slice(0,ins.pos)+ed.r+v.slice(ins.pos);setXS(t)}}}

/* ---- Luật dấu câu/khoảng trắng (chạy trên văn bản cả đoạn) ---- */
const normChars=s=>s.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g,'').replace(/[\u00A0\u2002-\u2009\u202F\u3000]/g,' ');
const URLISH=/https?:|ftp:|www\.|@|:\/\/|[?&]\w+=|\.(?:com|vn|org|net|edu|gov|docx?|xlsx?|pdf|png|jpe?g|html?)(?![\p{L}\p{N}])/iu;
function tokAt(S,i){let a=i,b=i;while(a>0&&!/[\s\u0001]/.test(S[a-1]))a--;while(b<S.length&&!/[\s\u0001]/.test(S[b]))b++;return S.slice(a,b)}
const urlish=(S,i)=>URLISH.test(tokAt(S,i));
const SPELL=[['xử dụng','sử dụng'],['xác xuất','xác suất'],['giúp đở','giúp đỡ'],['bổ xung','bổ sung'],['xuất xắc','xuất sắc'],['nghành','ngành'],['sắp sếp','sắp xếp'],['bắc buộc','bắt buộc'],
  ['trao dồi','trau dồi'],['dành giật','giành giật'],['thắc mắt','thắc mắc'],['tập chung','tập trung'],['giây chuyền','dây chuyền'],['đối sứng','đối xứng'],['biễu diễn','biểu diễn'],
  ['biễu thức','biểu thức'],['vân dụng','vận dụng'],['hình bình hàng','hình bình hành'],['dồng biến','đồng biến'],['đường trung trục','đường trung trực']];
const SPELL_RE=SPELL.map(([w,r])=>[new RegExp('(?<![\\p{L}])'+w+'(?![\\p{L}])','giu'),r]);
function paraRules(S,o){
  const E=[],add=(s,e,r,k)=>E.push({s,e,r:r||'',k});
  if(!/[^\s\u0001\u0002]/.test(S))return E;
  let m;
  for(m of S.matchAll(/ {2,}/g))add(m.index+1,m.index+m[0].length,'','sp');
  if((m=/^ +/.exec(S)))add(0,m[0].length,'','sp');
  if((m=/ +$/.exec(S)))add(m.index,S.length,'','sp');
  /* khoảng trắng TRƯỚC dấu đóng/dấu câu */
  for(m of S.matchAll(/(?<=[^\s\u0001(\[{“‘]) +(?=[,;!?)\]}%”])/g))if(!urlish(S,m.index+m[0].length))add(m.index,m.index+m[0].length,'','pu');
  for(m of S.matchAll(/(?<=[^\s\u0001\u0002]) +(?=:(?! *[\d\u0002]))/g))add(m.index,m.index+m[0].length,'','pu');
  for(m of S.matchAll(/(?<=[^\s\u0001.]) +(?=\.(?!\.)(?! \.)(?:[ \u0001]|$|\p{Lu}\p{Ll}))/gu))add(m.index,m.index+m[0].length,'','pu');
  /* khoảng trắng SAU dấu mở */
  for(m of S.matchAll(/(?<=[(\[{“‘]) +(?![\s\u0001)\]}”’])/g))add(m.index,m.index+m[0].length,'','pu');
  /* thiếu khoảng trắng SAU dấu câu */
  for(m of S.matchAll(/[,;](?=\p{L})/gu))if(!urlish(S,m.index))add(m.index+1,m.index+1,' ','pu');
  for(m of S.matchAll(/(?<=[\p{L})\]”])[,;](?=[\d\u0002])/gu))if(!urlish(S,m.index))add(m.index+1,m.index+1,' ','pu');
  for(m of S.matchAll(/(?<=\p{L}):(?=\u0002)/gu))add(m.index+1,m.index+1,' ','pu');
  for(m of S.matchAll(/(?<=\p{L}):(?=["“])/gu))add(m.index+1,m.index+1,' ','pu');
  for(m of S.matchAll(/:(?=\p{Lu}\p{Ll})/gu))if(!urlish(S,m.index))add(m.index+1,m.index+1,' ','pu');
  for(m of S.matchAll(/(?<=\p{Ll}{2}):(?=\p{Ll})/gu))if(!urlish(S,m.index))add(m.index+1,m.index+1,' ','pu');
  for(m of S.matchAll(/(?<=[\p{Ll}\p{N})\]”\u0002])[.?!](?=\p{Lu}\p{Ll})/gu))if(!urlish(S,m.index))add(m.index+1,m.index+1,' ','pu');
  for(m of S.matchAll(/(?<=\p{Ll}[)\]”])(?=\p{Lu}\p{Ll})/gu))add(m.index,m.index,' ','pu');
  /* dấu lặp */
  for(m of S.matchAll(/,{2,}|;{2,}/g))add(m.index+1,m.index+m[0].length,'','dp');
  for(m of S.matchAll(/(?<!\.)\.\.(?!\.)/g))add(m.index+1,m.index+2,'','dp');
  /* từ chức năng bị lặp liền nhau */
  for(m of S.matchAll(/(?<![\p{L}\p{N}])(của|và|các|những|được|trong|với|để|thì|mà)( )\1(?![\p{L}\p{N}])/giu))add(m.index+m[1].length,m.index+m[0].length,'','dw');
  /* lỗi chính tả thường gặp (chỉ các dạng sai chắc chắn, không tồn tại trong tiếng Việt) */
  if(o.spell!==false)for(const [re,rr] of SPELL_RE)for(m of S.matchAll(re)){
    const mt=m[0];let w=rr;
    if(mt.length>1&&mt===mt.toUpperCase())w=rr.toUpperCase();else if(/^\p{Lu}/u.test(mt))w=rr[0].toUpperCase()+rr.slice(1);
    let a=0;while(a<mt.length&&a<w.length&&mt[a]===w[a])a++;
    let b=0;while(b<mt.length-a&&b<w.length-a&&mt[mt.length-1-b]===w[w.length-1-b])b++;
    add(m.index+a,m.index+mt.length-b,w.slice(a,w.length-b),'cw')}
  /* số thập phân: đưa về dấu phẩy (tuỳ chọn) — bỏ qua số hiệu mục/hình/bảng, ngày tháng, số điện thoại */
  if(o.decimal==='comma')for(m of S.matchAll(/(?<![\d.,])\d+\.\d{1,2}(?![\d.,])/g)){
    const pre=S.slice(Math.max(0,m.index-16),m.index);
    if(/(Hình|Bảng|Bài|Câu|Mục|Chương|Phần|Điều|Khoản|Trang|Ví dụ|Sơ đồ|Biểu đồ|Đồ thị|Dạng|Chuyên đề|Tiết|Fig|Table|Section|Chapter|No|Số)\s*$/i.test(pre))continue;
    if(m.index<=1&&/^[ \u0001]/.test(S.slice(m.index+m[0].length)||' '))continue;
    if(urlish(S,m.index))continue;
    const d=m.index+m[0].indexOf('.');add(d,d+1,',','dc')}
  /* viết hoa chữ cái đầu câu sau dấu kết câu (tuỳ chọn) */
  if(o.cap)for(m of S.matchAll(/(\p{L}{2,})([.?!]) +(\p{Ll})/gu))if(!ABBR.has(m[1].toLowerCase())&&!urlish(S,m.index)){
    const k=m.index+m[0].length-1;add(k,k+1,S[k].toUpperCase(),'cp')}
  /* ngoặc kép thẳng → cong (chỉ khi chắc chắn mở/đóng đúng cặp) */
  if(o.quotes!==false){
    const qs=[];for(let i=0;i<S.length;i++)if(S[i]==='"')qs.push(i);
    if(qs.length&&qs.length%2===0&&!/[“”]/.test(S)){
      let ok=true;
      qs.forEach((i,k)=>{const pv=S[i-1],nx=S[i+1];
        if(k%2===0){if(!(i===0||/[\s\u0001\u0002(\[—–-]/.test(pv))||!(nx&&!/\s/.test(nx)))ok=false}
        else{if(!(pv&&!/\s/.test(pv))||!(nx===undefined||/[\s\u0001\u0002)\].,;:!?—–-]/.test(nx)))ok=false}});
      if(ok)qs.forEach((i,k)=>add(i,i+1,k%2===0?'“':'”','qt'))}}
  return E}
function fixParagraph(p,o,cnt){
  for(let it=0;it<4;it++){
    const E=paraRules(pModel(p).S,o);if(!E.length)break;
    E.sort((a,b)=>a.s-b.s||b.e-a.e);
    const keep=[];let last=-1,lastIns=-1;
    for(const e of E){
      if(e.s<last)continue;
      if(e.s===e.e&&e.s===lastIns)continue;
      keep.push(e);last=Math.max(last,e.e);if(e.s===e.e)lastIns=e.s}
    for(let k=keep.length-1;k>=0;k--){applyEdit(p,keep[k]);cnt[keep[k].k]=(cnt[keep[k].k]||0)+1}}}

/* ---- Bộ kiểm tra âm tiết tiếng Việt (offline) ---- */
const TONES=['\u0300','\u0301','\u0303','\u0309','\u0323'],VBASE='aăâeêioôơuưy',VM={};
for(const v of VBASE){VM[v]={b:v,t:0};TONES.forEach((tm,k)=>{VM[(v+tm).normalize('NFC')]={b:v,t:k+1}})}
const ONSETS=['ngh','ng','nh','ch','gh','gi','kh','ph','th','tr','qu','b','c','d','đ','g','h','k','l','m','n','p','r','s','t','v','x',''];
const CODAS=['','ch','ng','nh','c','m','n','p','t'];
const OPENOK=new Set('a e ê i o ô ơ u ư y oa oe uê uy'.split(' '));
const OPENDIPH=new Set('ai ao au ay âu ây eo êu ia iêu iu oai oay oeo oi ôi ơi ua uây ui uôi ưa ưi ươi ươu ưu uya uyu yêu ya uơ'.split(' '));
const CODA={
  c:'a ă â o ô u ư oa oă uâ uô ươ iê oo'.split(' '),
  ch:'a e ê i oa uê uy'.split(' '),
  m:'a ă â e ê i o ô ơ u ư iê yê uô ươ'.split(' '),
  n:'a ă â e ê i o ô ơ u ư oa oă oe uâ uê uy uyê iê yê uô ươ'.split(' '),
  ng:'a ă â e o ô u ư oa oă oe uâ uô ươ iê oo'.split(' '),
  nh:'a e ê i y oa uê uy'.split(' '),
  p:'a ă â e ê i o ô ơ u ư iê yê oa ươ'.split(' '),
  t:'a ă â e ê i o ô ơ u ư oa oă oe uâ uê uy uyê iê yê uô ươ'.split(' ')};
function onsOK(on,n){const f=/^[eêiy]/.test(n);
  switch(on){case 'c':return !f;case 'k':return f;case 'g':return !/^[eê]/.test(n);case 'gh':case 'ngh':return /^[eêi]/.test(n);
    case 'ng':return !f;case 'gi':return !/^i/.test(n);case 'qu':return !/^[uo]/.test(n);default:return true}}
function viSyl(w){
  let tone=0,base='';
  for(const ch of w){const v=VM[ch];if(v){if(v.t){if(tone)return false;tone=v.t}base+=v.b}else base+=ch}
  for(const on of ONSETS){
    if(on&&!base.startsWith(on))continue;
    const rest=base.slice(on.length);
    for(const cd of CODAS){
      if(cd&&!rest.endsWith(cd))continue;
      const nuc=rest.slice(0,rest.length-cd.length);
      if(!nuc)continue;
      const ok=cd?CODA[cd].indexOf(nuc)>=0:(OPENOK.has(nuc)||OPENDIPH.has(nuc));
      if(!ok||!onsOK(on,nuc))continue;
      if((cd==='c'||cd==='ch'||cd==='p'||cd==='t')&&tone!==2&&tone!==5)continue;
      return true}}
  return false}
/* từ ghép dính (vd "côsin") được chấp nhận nếu tách được thành các âm tiết hợp lệ, âm sau bắt đầu bằng phụ âm */
function viWord(w){
  if(viSyl(w))return true;
  const n=w.length;if(n>16)return true;
  const ok=new Array(n+1).fill(false);ok[0]=true;
  for(let j=1;j<=n;j++)for(let i=Math.max(0,j-7);i<j;i++)if(ok[i]&&(i===0||!VM[w[i]])&&viSyl(w.slice(i,j))){ok[j]=true;break}
  return ok[n]}
const VNCH=/[ăâêôơưđàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;
const LOAN=new Set(['vectơ','tenxơ','nitơ','côsin','côtang','hiđrô','hiđro','đôla','ôxi','ôxy','côban','vônfram','phôtpho','bazơ','prôtêin','ađênin','đêxibel','đvdt','đvt','đvđ','đk','đc','đt','đs','đh','đpcm','sđt','ơclit','ơ-clit','ôtô','môtô','xêri','ampe','vôn']);
const ABBR=new Set(['tr','vd','tp','ts','ths','gs','pgs','st','nxb','tt','sđt','tel','vs','tx','tq','ubnd','cty','qđ','bs','cn','etc','dr','mr','mrs','ms','fig','vol','ed','eds','no','kg','cm','mm','km','ml','mg','ha','pt','đt','đc','ph','nn','tl','ký','kí','hs','gv','sgk','sbt','tg','cb','đh','cđ','th','vv','cs','pp']);

/* ---- Lint: các lỗi không tự sửa chắc chắn được → đánh dấu để người dùng xem ---- */
function lintPara(S,c){
  const out=[],txt=S.normalize('NFC'),off=c.off||{};let m;
  if(!off.typo){
    const bad=[],tok=/[\p{L}\p{M}]+/gu;
    while((m=tok.exec(txt))){
      const w=m[0],lo=w.toLowerCase(),i=m.index,pv=txt[i-1]||'',nx=txt[i+w.length]||'';
      if(w.length<2||/[\d_]/.test(pv)||/[\d_]/.test(nx))continue;
      if((/^dd[aeiouy]/.test(lo)||/uow|[a-z]{2}j$/.test(lo))&&lo.length>=3&&/^[a-z]+$/.test(lo)){bad.push(w);continue}
      if(!VNCH.test(lo)||LOAN.has(lo))continue;
      if(w===w.toUpperCase()&&![...lo].some(ch=>VM[ch]&&VM[ch].t))continue;
      let ok=true;for(const ch of lo)if(!(ch>='a'&&ch<='z')&&ch!=='đ'&&!VM[ch]){ok=false;break}
      if(!ok)continue;
      if(!viWord(lo))bad.push(w)}
    if(bad.length){const u=Array.from(new Set(bad)).slice(0,6);out.push('nghi gõ sai/thiếu dấu: '+u.map(x=>'“'+x+'”').join(', ')+(bad.length>u.length?'…':''))}}
  if(!off.dup){
    const dup=[];for(m of txt.matchAll(/(?<![\p{L}\p{N}])(\p{L}{2,}) \1(?![\p{L}\p{N}])/giu))dup.push(m[1]);
    if(dup.length)out.push('lặp từ: '+Array.from(new Set(dup)).slice(0,4).map(x=>'“'+x+' '+x+'”').join(', '))}
  if(!off.bracket){
    const t2=txt.replace(/^\s*\(?[\p{L}\d]{1,3}[.)]\s*/u,'');
    const op=(t2.match(/[(\[{]/g)||[]).length,cl=(t2.match(/[)\]}]/g)||[]).length;
    if(op!==cl)out.push('ngoặc không cân ('+op+' mở / '+cl+' đóng)')}
  if(!off.quote){
    const q1=(txt.match(/“/g)||[]).length,q2=(txt.match(/”/g)||[]).length,qs=(txt.match(/"/g)||[]).length;
    if(q1!==q2||qs%2)out.push('ngoặc kép không cân')}
  if(!off.dollar&&((txt.match(/\$/g)||[]).length)%2)out.push('dấu $ lẻ (công thức LaTeX chưa đóng)');
  if(!off.punct&&(/[,;] ?[.,;]/.test(txt.replace(/\.\.\./g,'…'))||/(?<!v\.v)\. ?[,;]/.test(txt)))out.push('dấu câu liền nhau bất thường (vd “,.” “.,” “, ,”)');
  const t0=txt.trim(),f0=t0.replace(/^[^\p{L}\p{N}]+/u,'');
  if(!off.lower&&!c.tc&&!c.list&&!c.head&&t0.length>=25&&/^\p{Ll}/u.test(f0)&&!/^\p{Ll}\s*[.)]/u.test(f0)&&!/^\p{Ll}(?![\p{L}\p{M}])/u.test(f0)&&/[.?!:]$/.test(c.prevEnd||''))out.push('đoạn bắt đầu bằng chữ thường');
  if(!off.mid){
    const mid=[];for(m of txt.matchAll(/(\p{L}{2,})([.?!]) +(\p{Ll})/gu))if(!ABBR.has(m[1].toLowerCase())&&!urlish(txt,m.index))mid.push(m[1]+m[2]+' '+m[3]);
    if(mid.length)out.push('chữ thường sau dấu kết câu: '+mid.slice(0,2).map(x=>'“…'+x+'…”').join(', '))}
  if(!off.noend&&!c.tc&&!c.list&&!c.head&&t0.length>=100&&/[\p{L}\p{N}]$/u.test(t0)&&!/^\(?[\p{L}\d]{1,2}[.)]\s/u.test(f0))out.push('đoạn dài không kết thúc bằng dấu câu');
  return out}
function lintDoc(body,o,rep,sugs){
  const flags=[],dec={c:0,d:0},used=new Set();let idx=0,prevEnd='';
  all(body,'p').forEach(p=>{
    idx++;
    if(anc(p,'txbxContent'))return;
    const S=pModel(p).S,tr=S.trim();
    if(!/\p{L}/u.test(tr))return;
    const info=pInfo(p),tc=!!anc(p,'tc');
    const issues=lintPara(S,{tc,list:info.list,head:info.head,prevEnd,off:o.lintOff});
    if(o.dry){const E=paraRules(S,o);if(E.length){const e=E.slice().sort((a,b)=>a.s-b.s)[0],c=x=>x.replace(/\u0001/g,'⇥').replace(/\u0002/g,'⟦CT⟧');
      issues.unshift('cần sửa '+E.length+' chỗ dấu câu/khoảng trắng/chính tả, vd: “'+c(S.slice(Math.max(0,e.s-14),Math.min(S.length,e.e+14)))+'”')}}
    sugs.forEach((sg,k)=>{if(!used.has(k)&&S.indexOf(sg.find)>=0){used.add(k);issues.push('AI gợi ý: “'+sg.find+'” → “'+sg.replace+'”')}});
    for(const m of S.matchAll(/(?<![\d.,])\d+,\d{1,2}(?![\d,.])/g))dec.c++;
    for(const m of S.matchAll(/(?<![\d.,])\d+\.\d{1,2}(?![\d,.])/g))if(!(m.index<=1&&/^[ \u0001]/.test(S.slice(m.index+m[0].length)||' ')))dec.d++;
    prevEnd=tr.replace(/[\u0001\u0002]+$/,'').slice(-1)||prevEnd;
    if(issues.length)flags.push({p,n:idx,snip:tr.replace(/[\u0001\u0002]/g,'…').slice(0,60),issues})});
  if(dec.c>=2&&dec.d>=2)rep.warn('Số thập phân dùng lẫn dấu phẩy ('+dec.c+' chỗ) và dấu chấm ('+dec.d+' chỗ) — nên thống nhất một kiểu (tiếng Việt: dấu phẩy).');
  return flags}
/* Gắn Comment vào đoạn; cd = comments.xml (đã có hoặc tạo mới) */
function addComments(doc,cd,flags){
  let id=0;
  [doc,cd].forEach(d=>all(d,'commentRangeStart').concat(all(d,'comment')).forEach(e=>{id=Math.max(id,(+ga(e,'id')||0)+1)}));
  flags.forEach(f=>{
    const cid=id++,c=mk(cd,'comment');
    sa(c,'id',cid);sa(c,'author',TRK.author);sa(c,'date',TRK.date);sa(c,'initials','RS');
    [ 'Cần kiểm tra:' ].concat(f.issues.map(x=>'• '+x)).forEach(line=>{
      const cp=mk(cd,'p'),cr=mk(cd,'r'),ct=mk(cd,'t');ct.textContent=line;setXS(ct);cr.appendChild(ct);cp.appendChild(cr);c.appendChild(cp)});
    cd.documentElement.appendChild(c);
    const st=mk(doc,'commentRangeStart'),en=mk(doc,'commentRangeEnd'),ref=mk(doc,'r'),cr=mk(doc,'commentReference');
    sa(st,'id',cid);sa(en,'id',cid);sa(cr,'id',cid);ref.appendChild(cr);
    const pPr=one(f.p,'pPr');f.p.insertBefore(st,pPr?pPr.nextSibling:f.p.firstChild);f.p.appendChild(en);f.p.appendChild(ref)})}

/* Tiêu đề "giả": dòng ngắn in đậm toàn bộ hoặc IN HOA, không dùng style Heading */
function allBold(p){let n=0;
  for(const r of all(p,'r')){if(anc(r,'p')!==p)continue;if(!all(r,'t').some(t=>t.textContent.trim()))continue;
    const pr=one(r,'rPr'),b=pr&&one(pr,'b'),v=b?ga(b,'val'):'';
    if(!b||v==='0'||v==='false')return false;n++}
  return n>0}
function pseudoHead(p){
  if(!PSEUDO||anc(p,'tc')||anc(p,'txbxContent'))return false;
  const t=ptext(p).trim();
  if(t.length<3||t.length>100||/[.,;]$/.test(t)||!/\p{L}/u.test(t))return false;
  if(/^(Câu|CÂU|Bài|BÀI)\s*\d/.test(t)||/^\(?[A-Za-z0-9]{1,3}[.)]\s/.test(t))return false;
  const caps=t===t.toUpperCase()&&/\p{Lu}.*\p{Lu}.*\p{Lu}/u.test(t);
  return caps||allBold(p)}

/* Thống nhất kiểu nhãn theo kiểu chiếm đa số trong tài liệu: đáp án "A." / "A)", nhãn "Câu 1." / "Câu 1:" */
function unifyLabels(body,o,rep){
  const ps=all(body,'p').filter(p=>!anc(p,'txbxContent')).map(p=>({p,S:pModel(p).S}));
  const groups=[['đáp án (A. B. C. D.)',/^ *([A-F])([.)])(?= )/],['nhãn câu hỏi (“Câu 1.” / “Câu 1:”)',/^ *((?:Câu|CÂU|Bài|BÀI) ?\d+)([.:])(?= )/]];
  let total=0;
  groups.forEach(([name,re])=>{
    const hits=[];
    ps.forEach(x=>{const m=re.exec(x.S);if(m)hits.push({x,sep:m[2],idx:m[0].indexOf(m[1])+m[1].length})});
    const cnt={};hits.forEach(h=>{cnt[h.sep]=(cnt[h.sep]||0)+1});
    const seps=Object.keys(cnt);if(seps.length<2)return;
    seps.sort((a,b)=>cnt[b]-cnt[a]);const major=seps[0];
    if(cnt[major]<3||cnt[major]/hits.length<0.7){rep.warn('Kiểu '+name+' không thống nhất ('+seps.map(s=>'“'+s+'” '+cnt[s]+' chỗ').join(', ')+') nhưng không đủ áp đảo để tự sửa — hãy kiểm tra.');return}
    hits.filter(h=>h.sep!==major).forEach(h=>{applyEdit(h.x.p,{s:h.idx,e:h.idx+1,r:major,k:'lb'});total++})});
  rep.fix('Thống nhất kiểu nhãn đáp án / “Câu n” theo kiểu đa số (chỗ)',total)}
/* Viết hoa chữ cái đầu đoạn khi đoạn trước đã kết thúc câu (tuỳ chọn) */
function capPass(body,o,rep){
  let n=0,prevEnd='';
  all(body,'p').forEach(p=>{
    if(anc(p,'txbxContent'))return;
    const S=pModel(p).S,tr=S.trim();
    if(!/\p{L}/u.test(tr))return;
    const info=pInfo(p),k=/^[^\p{L}\p{N}]*/u.exec(S)[0].length,ch=S[k],f0=S.slice(k);
    if(!anc(p,'tc')&&!info.list&&!info.head&&tr.length>=25&&ch&&/\p{Ll}/u.test(ch)&&!/^\p{Ll}\s*[.)]/u.test(f0)&&!/^\p{Ll}(?![\p{L}\p{M}])/u.test(f0)&&/[.?!:]$/.test(prevEnd)){
      applyEdit(p,{s:k,e:k+1,r:ch.toUpperCase(),k:'cp'});n++}
    prevEnd=tr.replace(/[\u0001\u0002]+$/,'').slice(-1)||prevEnd});
  rep.fix('Viết hoa chữ cái đầu đoạn (chỗ)',n)}
function diffWin(b,a){
  const c=s=>s.replace(/\u0001/g,'⇥').replace(/\u0002/g,'⟦CT⟧');b=c(b);a=c(a);
  let i=0;while(i<b.length&&i<a.length&&b[i]===a[i])i++;
  let j=0;while(j<b.length-i&&j<a.length-i&&b[b.length-1-j]===a[a.length-1-j])j++;
  const s=Math.max(0,i-25),eb=Math.min(b.length,b.length-j+25),ea=Math.min(a.length,a.length-j+25);
  return[(s?'…':'')+b.slice(s,eb)+(eb<b.length?'…':''),(s?'…':'')+a.slice(s,ea)+(ea<a.length?'…':'')]}

/* ---------- Kích thước ảnh từ byte ---------- */
function imgDim(b){try{
  if(b[0]===0x89&&b[1]===0x50){const v=new DataView(b.buffer,b.byteOffset);return{w:v.getUint32(16),h:v.getUint32(20)}}
  if(b[0]===0x47&&b[1]===0x49){return{w:b[6]|b[7]<<8,h:b[8]|b[9]<<8}}
  if(b[0]===0x42&&b[1]===0x4d){const v=new DataView(b.buffer,b.byteOffset);return{w:v.getInt32(18,true),h:Math.abs(v.getInt32(22,true))}}
  if(b[0]===0xff&&b[1]===0xd8){let i=2;while(i<b.length-9){if(b[i]!==0xff){i++;continue}const m=b[i+1];
    if(m>=0xc0&&m<=0xcf&&m!==0xc4&&m!==0xc8&&m!==0xcc)return{h:b[i+5]<<8|b[i+6],w:b[i+7]<<8|b[i+8]};
    i+=2+(b[i+2]<<8|b[i+3])}}
}catch(e){}return null}

/* ====================== CÁC BƯỚC RÀ SOÁT ====================== */
function stripNoise(doc){
  all(doc,'proofErr').forEach(rm);all(doc,'lastRenderedPageBreak').forEach(rm);
  Array.from(doc.getElementsByTagName('*')).forEach(e=>Array.from(e.attributes).forEach(a=>{if(a.namespaceURI===W&&/^rsid/.test(a.localName))e.removeAttributeNode(a)}))}

function reviewMarks(doc,o,rep){
  const dels=all(doc,'del').filter(e=>e.parentNode&&!/^(rPr|trPr)$/.test(e.parentNode.localName));
  const inss=all(doc,'ins').filter(e=>e.parentNode&&!/^(rPr|trPr)$/.test(e.parentNode.localName));
  const nCmt=all(doc,'commentReference').length;
  if(o.accept){
    const rows=all(doc,'del').filter(e=>e.parentNode&&e.parentNode.localName==='trPr');
    rows.forEach(d=>rm(anc(d,'tr')));
    dels.forEach(rm);all(doc,'moveFrom').forEach(rm);
    inss.concat(all(doc,'moveTo')).forEach(e=>{const p=e.parentNode;if(!p)return;while(e.firstChild)p.insertBefore(e.firstChild,e);rm(e)});
    all(doc,'ins').concat(all(doc,'del')).forEach(e=>{if(e.parentNode&&/^(rPr|trPr)$/.test(e.parentNode.localName))rm(e)});
    ['rPrChange','pPrChange','sectPrChange','tblPrChange','tblGridChange','tcPrChange','trPrChange','numberingChange','moveFromRangeStart','moveFromRangeEnd','moveToRangeStart','moveToRangeEnd'].forEach(n=>all(doc,n).forEach(rm));
    rep.fix('Chấp nhận toàn bộ thay đổi Track Changes',dels.length+inss.length)
  }else if(!o.quiet&&dels.length+inss.length)rep.warn('Còn '+(dels.length+inss.length)+' thay đổi Track Changes chưa chấp nhận/từ chối (bật tùy chọn "Chấp nhận Track Changes" nếu muốn xử lý).');
  if(o.nocmt){
    all(doc,'commentRangeStart').concat(all(doc,'commentRangeEnd')).forEach(rm);
    all(doc,'commentReference').forEach(c=>rm(c.parentNode&&c.parentNode.localName==='r'?c.parentNode:c));
    rep.fix('Xóa ghi chú (Comment)',nCmt)
  }else if(nCmt)rep.warn('Còn '+nCmt+' ghi chú (Comment) trong tài liệu — hãy kiểm tra trước khi gửi.')}

function mergeRuns(doc){
  const okRun=r=>r.namespaceURI===W&&r.localName==='r'&&wk(r,'t').length===1&&Array.from(r.children).every(c=>c.namespaceURI===W&&(c.localName==='rPr'||c.localName==='t'));
  const key=r=>{const pr=one(r,'rPr');return pr?new XMLSerializer().serializeToString(pr):''};
  const walk=c=>{let prev=null,pk='';
    Array.from(c.children).forEach(ch=>{
      if(ch.namespaceURI===W&&(ch.localName==='hyperlink'||ch.localName==='smartTag')){walk(ch);prev=null;return}
      if(!okRun(ch)){prev=null;return}
      const k=key(ch);
      if(prev&&k===pk){const a=one(prev,'t'),b=one(ch,'t');a.textContent+=b.textContent;setXS(a);rm(ch)}else{prev=ch;pk=k}})};
  all(doc,'p').forEach(walk)}

/* Làm sạch văn bản: NFC, ký tự ẩn, NBSP, khoảng trắng và dấu câu — xử lý cả đoạn, kể cả khi bị tách thành nhiều run */
function textPass(body,o,rep,tag){
  let nfc=0,tabs=0,idx=0;const cnt={};
  all(body,'p').forEach(p=>{
    idx++;const b0=pModel(p).S;
    all(p,'t').filter(t=>!inMath(t)&&anc(t,'p')===p).forEach(t=>{
      const a=t.textContent,n1=a.normalize('NFC');if(n1!==a)nfc++;
      const b=normChars(n1);if(b!==n1)cnt.sp=(cnt.sp||0)+1;
      if(b!==a){t.textContent=b;setXS(t)}});
    if(o.indent&&!pInfo(p).list){let r=one(p,'pPr')?one(p,'pPr').nextElementSibling:p.firstElementChild;
      while(r&&r.localName==='r'&&Array.from(r.children).every(c=>c.localName==='rPr'||c.localName==='tab')&&one(r,'tab')){const nx=r.nextElementSibling;rm(r);r=nx;tabs++}}
    fixParagraph(p,o,cnt);
    all(p,'t').forEach(setXS);
    const a0=pModel(p).S;
    if(b0!==a0){rep.changes=rep.changes||[];if(rep.changes.length<300)rep.changes.push({n:idx,t:tag||'',b:b0,a:a0})}});
  rep.fix('Dọn khoảng trắng thừa, ký tự ẩn, NBSP (chỗ)',cnt.sp||0);
  rep.fix('Sửa khoảng cách quanh dấu câu: trước/sau dấu chấm, phẩy, hai chấm, ngoặc (chỗ)',cnt.pu||0);
  rep.fix('Gộp dấu câu lặp (,, ;; ..)',cnt.dp||0);
  rep.fix('Bỏ từ chức năng bị lặp liền nhau (vd “của của”)',cnt.dw||0);
  rep.fix('Sửa lỗi chính tả thường gặp (vd “xác xuất” → “xác suất”) (chỗ)',cnt.cw||0);
  rep.fix('Đổi số thập phân sang dấu phẩy (vd 3.5 → 3,5) (chỗ)',cnt.dc||0);
  rep.fix('Viết hoa chữ cái đầu câu sau dấu kết câu (chỗ)',cnt.cp||0);
  rep.fix('Đổi ngoặc kép thẳng (") thành ngoặc kép cong “ ”',cnt.qt||0);
  rep.fix('Chuẩn hóa dấu tiếng Việt về Unicode dựng sẵn (NFC)',nfc);
  rep.fix('Bỏ Tab dùng để thụt đầu dòng thủ công',tabs)}

function renumber(body,rep){
  const cnt={};let fixed=0;const ex=[];
  all(body,'p').forEach(p=>{
    if(anc(p,'tc')||anc(p,'txbxContent'))return;
    const ts=all(p,'t').filter(t=>!inMath(t));if(!ts.length)return;
    const txt=ts.map(t=>t.textContent).join(''),tr=txt.trim();
    if(tr.length<90&&/^(PHẦN|Phần|ĐỀ|Đề|MÃ ĐỀ|Mã đề)\b/.test(tr)){for(const k in cnt)delete cnt[k];return}
    const m=/^(\s*(Câu|CÂU|Bài|BÀI)\s*)(\d{1,3})(?!\d)/.exec(txt);if(!m)return;
    const key=m[2].toLowerCase(),n=+m[3];
    if(n===1||cnt[key]===undefined){cnt[key]=n;return}
    const want=cnt[key]+1;if(n===want){cnt[key]=n;return}
    let off=0;const pos=m[1].length;
    for(const t of ts){const s=t.textContent,L=s.length;
      if(pos>=off&&pos+m[3].length<=off+L){const i=pos-off;t.textContent=s.slice(0,i)+want+s.slice(i+m[3].length);fixed++;if(ex.length<4)ex.push(n+'→'+want);cnt[key]=want;return}
      off+=L}
    cnt[key]=n;rep.warn('Không đánh số lại được "'+m[2]+' '+n+'" (số bị tách giữa nhiều đoạn định dạng) — hãy kiểm tra tay.')});
  rep.fix('Đánh số lại Câu/Bài bị nhảy hoặc trùng'+(ex.length?' (vd '+ex.join(', ')+')':''),fixed)}

function blanks(doc,body,rep){
  let n=0;
  [body].concat(all(body,'tc')).forEach(ct=>{let prev=false;
    Array.from(ct.children).forEach(c=>{
      if(c.localName==='p'&&c.namespaceURI===W&&!hasSect(c)){const e=isE(c)&&!hasPB(c);if(e&&prev){rm(c);n++;return}prev=e}else prev=false});
    if(ct.localName==='tc'){const l=ct.lastElementChild,pv=l&&l.previousElementSibling;
      if(l&&l.localName==='p'&&isE(l)&&!hasPB(l)&&pv&&pv.localName==='p'&&!isE(pv)){rm(l);n++}}});
  while(body.firstElementChild&&body.firstElementChild.localName==='p'&&isE(body.firstElementChild)&&!hasSect(body.firstElementChild)&&!hasPB(body.firstElementChild)){rm(body.firstElementChild);n++}
  rep.fix('Xóa dòng trống thừa (liên tiếp / đầu tài liệu / cuối ô bảng)',n);
  let pb=0,prevPB=null;
  Array.from(body.children).forEach(c=>{
    if(c.localName!=='p'||c.namespaceURI!==W||hasSect(c)){prevPB=null;return}
    if(pbOnly(c)){if(prevPB){rm(c);pb++}else prevPB=c;return}
    const pp=one(c,'pPr');
    if(prevPB){if(isE(c)){rm(c);pb++;return}if(pp&&one(pp,'pageBreakBefore')){rm(prevPB);pb++}prevPB=null;return}
    if(isE(c)&&pp&&one(pp,'pageBreakBefore')){rm(one(pp,'pageBreakBefore'));pb++}});
  let l=body.lastElementChild;l=l&&l.localName==='sectPr'?l.previousElementSibling:l;
  while(l&&l.localName==='p'&&!hasSect(l)&&(pbOnly(l)||isE(l))&&l.previousElementSibling&&l.previousElementSibling.localName==='p'){const pv=l.previousElementSibling;rm(l);pb++;l=pv}
  rep.fix('Xóa ngắt trang thừa gây trang trắng (liên tiếp / cuối tài liệu / sau ngắt trang)',pb)}

function keepPass(doc,body,rep){
  let n=0;
  all(body,'p').forEach(p=>{
    let pPr=one(p,'pPr');
    const info=pInfo(p),kn=pPr&&one(pPr,'keepNext'),kl=pPr&&one(pPr,'keepLines'),t=ptext(p).trim(),nx=p.nextElementSibling;
    const stem=/^(Câu|CÂU|Bài|BÀI)\s*\d+/.test(t),cap=nx&&nx.localName==='p'&&/^(Hình|HÌNH)\s*\d*/.test(ptext(nx).trim())&&!t&&all(p,'drawing').length;
    const want=info.head||stem||cap||(nx&&nx.localName==='tbl'&&t.length<150);
    if(!pPr){if(want&&nx&&nx.localName!=='sectPr'){pPr=mk(doc,'pPr');p.insertBefore(pPr,p.firstChild);sc(doc,pPr,'keepNext',ORD.pPr);n++}return}
    if(kl&&!info.head){rm(kl);n++}
    if(kn&&!want){rm(kn);n++}
    if(!kn&&want&&nx&&nx.localName!=='sectPr'){sc(doc,pPr,'keepNext',ORD.pPr);n++}});
  rep.fix('Chỉnh "giữ với đoạn sau" (tiêu đề/câu hỏi/hình không bị tách trang; bỏ ràng buộc gây đẩy đoạn sang trang mới)',n)}

function sections(doc,body,o,rep){
  const bk=Array.from(body.children),secs=[];
  bk.forEach((c,i)=>{if(c.localName==='p'&&c.namespaceURI===W){const pp=one(c,'pPr'),s=pp&&one(pp,'sectPr');if(s)secs.push({end:i,sp:s})}});
  let fs=one(body,'sectPr');if(!fs){fs=mk(doc,'sectPr');body.appendChild(fs)}
  secs.push({end:bk.length,sp:fs});secs.bk=bk;
  let pg=0,rst=0;
  secs.forEach((s,k)=>{const sp=s.sp;let z=one(sp,'pgSz'),m=one(sp,'pgMar');
    if(o.page){z=sc(doc,sp,'pgSz',ORD.sectPr);m=sc(doc,sp,'pgMar',ORD.sectPr);
      const land=ga(z,'orient')==='landscape'||(+ga(z,'w')>+ga(z,'h')&&+ga(z,'h')>0),w=land?16838:11906,h=land?11906:16838;
      const mm=v=>Math.round(v*56.6929),want=[mm(o.mt),mm(o.mb),mm(o.ml),mm(o.mr)];
      const was=[+ga(z,'w'),+ga(z,'h'),+ga(m,'top'),+ga(m,'bottom'),+ga(m,'left'),+ga(m,'right')].join();
      sa(z,'w',w);sa(z,'h',h);if(land)sa(z,'orient','landscape');else z.removeAttributeNS(W,'orient');
      sa(m,'top',want[0]);sa(m,'bottom',want[1]);sa(m,'left',want[2]);sa(m,'right',want[3]);
      if(!ga(m,'header'))sa(m,'header',709);if(!ga(m,'footer'))sa(m,'footer',709);if(!ga(m,'gutter'))sa(m,'gutter',0);
      if(was!==[w,h].concat(want).join())pg++}
    s.aw=(+ga(z,'w')||11906)-(m?(+ga(m,'left')||1701):1701)-(m?(+ga(m,'right')||850):850);
    s.ah=(+ga(z,'h')||16838)-(m?(+ga(m,'top')||1134):1134)-(m?(+ga(m,'bottom')||1134):1134);
    const pn=one(sp,'pgNumType');
    if(k>0&&pn&&pn.hasAttributeNS(W,'start')){if(o.pgnum){pn.removeAttributeNS(W,'start');rst++}else rep.warn('Section '+(k+1)+' bắt đầu lại số trang từ '+ga(pn,'start')+'.')}
    const ty=one(sp,'type');if(ty&&/^(odd|even)Page$/.test(ga(ty,'val')))rep.warn('Có ngắt section kiểu trang lẻ/chẵn — Word sẽ chèn trang trắng (hữu ích khi in 2 mặt, nhưng thừa nếu xem trên máy).')});
  rep.fix('Đưa khổ giấy về A4 và lề chuẩn (section)',pg);
  rep.fix('Bỏ đặt lại số trang ở section sau (số trang liên tục)',rst);
  return secs}

function pageGeom(secs){return{aw:Math.min.apply(null,secs.map(s=>s.aw)),ah:Math.min.apply(null,secs.map(s=>s.ah))}}

function tablePass(doc,body,secs,o,rep){
  const bk=secs.bk;let fit=0,cs=0,hd=0,al=0,fl=0,bd=0,nb=0;
  all(body,'tbl').forEach(tbl=>{
    const nested=!!anc(tbl,'tc');
    let pr=one(tbl,'tblPr');if(!pr){pr=mk(doc,'tblPr');tbl.insertBefore(pr,tbl.firstChild)}
    const fp=one(pr,'tblpPr');if(fp){rm(fp);fl++}
    if(!nested){
      let top=tbl;while(top.parentNode&&top.parentNode!==body)top=top.parentNode;
      const i=bk.indexOf(top),sec=secs.find(s=>s.end>=i)||secs[secs.length-1],aw=sec.aw;
      const ind=one(pr,'tblInd');let il=0;
      if(ind){const v=parseInt(ga(ind,'w'),10)||0;if(v<0||v>1440){sa(ind,'w',0);sa(ind,'type','dxa');fit++}else il=v}
      const grid=one(tbl,'tblGrid'),cols=grid?wk(grid,'gridCol'):[];
      if(cols.length){
        const ws=cols.map(c=>parseInt(ga(c,'w'),10)||0),tot=ws.reduce((a,b)=>a+b,0),av=aw-il;
        if(tot>av+5){
          const f=av/tot,nw=ws.map(w=>Math.floor(w*f));nw[nw.length-1]+=Math.floor(av)-nw.reduce((a,b)=>a+b,0);
          cols.forEach((c,k)=>sa(c,'w',nw[k]));
          wk(tbl,'tr').forEach(tr=>{let col=0;const tp=one(tr,'trPr'),gb=tp&&one(tp,'gridBefore');if(gb)col+=parseInt(ga(gb,'val'),10)||0;
            wk(tr,'tc').forEach(tc=>{const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),n=gs?(parseInt(ga(gs,'val'),10)||1):1;let w=0;
              for(let k=col;k<col+n&&k<nw.length;k++)w+=nw[k];col+=n;
              if(cp){const x=sc(doc,cp,'tcW',ORD.tcPr);sa(x,'w',w);sa(x,'type','dxa')}})});
          const x=sc(doc,pr,'tblW',ORD.tblPr);if(ga(x,'type')!=='pct'){sa(x,'w',Math.floor(av));sa(x,'type','dxa')}
          fit++
        }else{const x=one(pr,'tblW');if(x&&ga(x,'type')==='dxa'&&+ga(x,'w')>av){sa(x,'w',Math.floor(av));fit++}}
      }}
    const rows=wk(tbl,'tr'),cells=rows.reduce((a,r)=>a+wk(r,'tc').length,0);
    rows.forEach((tr,ri)=>{
      let tp=one(tr,'trPr');if(!tp){tp=mk(doc,'trPr');const ex=one(tr,'tblPrEx');tr.insertBefore(tp,ex?ex.nextSibling:tr.firstChild)}
      if(!one(tp,'cantSplit')){sc(doc,tp,'cantSplit',ORD.trPr);cs++}
      if(ri===0&&!nested&&rows.length>=8&&!one(tp,'tblHeader')&&all(tr,'t').some(t=>t.textContent.trim())){sc(doc,tp,'tblHeader',ORD.trPr);hd++}
      if(rows.length>1)wk(tr,'tc').forEach(tc=>{
        let cp=one(tc,'tcPr');if(!cp){cp=mk(doc,'tcPr');tc.insertBefore(cp,tc.firstChild)}
        if(!one(cp,'vAlign')){sa(sc(doc,cp,'vAlign',ORD.tcPr),'val','center');al++}
        const ps=wk(tc,'p');
        if(ps.length===1&&!pInfo(ps[0]).list){const t=ptext(ps[0]).trim(),pp=one(ps[0],'pPr')||(()=>{const x=mk(doc,'pPr');ps[0].insertBefore(x,ps[0].firstChild);return x})();
          if(/^(\d[\d.,%+\-–−/ ]{0,11}|STT|TT)$/i.test(t)&&!one(pp,'jc')&&!all(ps[0],'br').length){sa(sc(doc,pp,'jc',ORD.pPr),'val','center');al++}}})});
    const hasB=(one(pr,'tblBorders')&&Array.from(one(pr,'tblBorders').children).some(b=>ga(b,'val')&&ga(b,'val')!=='nil'&&ga(b,'val')!=='none'))||all(tbl,'tcBorders').length||(one(pr,'tblStyle')&&!/^TableNormal$/i.test(ga(one(pr,'tblStyle'),'val')));
    if(!hasB&&rows.length>1&&cells>2){if(o.tblborder){const b=sc(doc,pr,'tblBorders',ORD.tblPr);['top','left','bottom','right','insideH','insideV'].forEach(n=>{const e=mk(doc,n);sa(e,'val','single');sa(e,'sz',4);sa(e,'space',0);sa(e,'color','auto');b.appendChild(e)});bd++}else nb++}});
  rep.fix('Bảng: co về vừa lề/khổ giấy',fit);rep.fix('Bảng: không cho hàng bị cắt đôi giữa hai trang',cs);
  rep.fix('Bảng dài: lặp hàng tiêu đề ở mỗi trang',hd);rep.fix('Bảng: căn giữa dọc ô và căn giữa ô số/STT',al);
  rep.fix('Bảng: gỡ chế độ bảng trôi (floating) khiến bảng nhảy vị trí',fl);rep.fix('Bảng: thêm đường viền cho bảng chưa có viền',bd);
  if(nb)rep.warn(nb+' bảng không có đường viền. Nếu là bảng dữ liệu, hãy bật tùy chọn "Thêm viền cho bảng chưa có viền" (bảng bố cục 1 hàng được bỏ qua).')}

function imgPass(doc,secs,o,rep,ctx){
  const geo=pageGeom(secs);let inl=0,fit=0,dist=0,cen=0,ext=0;
  all(doc,'drawing').forEach(dr=>{
    let el=Array.from(dr.children).find(c=>c.namespaceURI===WP&&(c.localName==='inline'||c.localName==='anchor'));if(!el)return;
    const gd=el.getElementsByTagNameNS(A,'graphicData')[0];if(!gd||!/picture/i.test(gd.getAttribute('uri')||''))return;
    const blip=el.getElementsByTagNameNS(A,'blip')[0];
    if(blip){if(blip.getAttributeNS(R,'link'))ext++;
      const rid=blip.getAttributeNS(R,'embed');if(rid&&ctx.rels[rid]&&!ctx.dims.hasOwnProperty(rid)&&ctx.missing.indexOf(rid)>=0)rep.warn('Có hình bị thiếu dữ liệu trong file (hình lỗi/mất).')}
    const take=n=>Array.from(el.children).find(c=>c.namespaceURI===WP&&c.localName===n);
    if(el.localName==='anchor'&&o.imgInline&&el.getAttribute('behindDoc')!=='1'){
      const ex=take('extent'),dp=take('docPr'),gr=el.getElementsByTagNameNS(A,'graphic')[0];
      if(ex&&dp&&gr){const n=doc.createElementNS(WP,'wp:inline');['distT','distB','distL','distR'].forEach(a=>n.setAttribute(a,'0'));
        let ee=take('effectExtent');if(!ee){ee=doc.createElementNS(WP,'wp:effectExtent');['l','t','r','b'].forEach(a=>ee.setAttribute(a,'0'))}
        n.appendChild(ex);n.appendChild(ee);n.appendChild(dp);const cn=take('cNvGraphicFramePr');if(cn)n.appendChild(cn);n.appendChild(gr);
        dr.replaceChild(n,el);el=n;inl++}}
    const e=Array.from(el.children).find(c=>c.namespaceURI===WP&&c.localName==='extent');if(!e)return;
    const ax=Array.from(gd.getElementsByTagNameNS(A,'ext')).find(x=>x.hasAttribute('cx')),xf=gd.getElementsByTagNameNS(A,'xfrm')[0];
    let cx=+e.getAttribute('cx')||0,cy=+e.getAttribute('cy')||0;if(!cx||!cy)return;
    const set=(x,y)=>{cx=Math.round(x);cy=Math.round(y);e.setAttribute('cx',cx);e.setAttribute('cy',cy);if(ax){ax.setAttribute('cx',cx);ax.setAttribute('cy',cy)}};
    const rid=blip&&blip.getAttributeNS(R,'embed'),d=rid&&ctx.dims[rid],rot=xf&&+xf.getAttribute('rot');
    if(o.imgFix&&d&&d.w&&d.h&&!rot){const sr=blip.parentNode&&Array.from(blip.parentNode.children).find(c=>c.localName==='srcRect'),pc=a=>sr?(+sr.getAttribute(a)||0)/100000:0;
      const r0=(d.w*(1-pc('l')-pc('r')))/(d.h*(1-pc('t')-pc('b')));
      if(r0>0&&Math.abs(cx/cy/r0-1)>0.03){set(cx,cx/r0);dist++}}
    if(o.imgFix){let av=geo.aw*635;const tc=anc(dr,'tc');
      if(tc){const tw=tc.firstElementChild&&one(tc.firstElementChild,'tcW'),w=tw&&ga(tw,'type')!=='pct'?+ga(tw,'w'):0;if(w>400)av=Math.min(av,(w-216)*635)}
      const ah=geo.ah*635*0.95;let f=Math.min(1,av/cx,ah/cy);
      if(f<0.995){set(cx*f,cy*f);fit++}}
    if(o.imgFix){const p=anc(dr,'p');
      if(p&&el.localName==='inline'&&!ptext(p).trim()&&all(p,'drawing').length===1&&!all(p,'tab').length){
        const pPr=one(p,'pPr')||(()=>{const x=mk(doc,'pPr');p.insertBefore(x,p.firstChild);return x})(),j=one(pPr,'jc');
        if(!j||/^(left|start)$/.test(ga(j,'val'))){sa(sc(doc,pPr,'jc',ORD.pPr),'val','center');const ind=one(pPr,'ind');if(ind)rm(ind);cen++}}}});
  rep.fix('Hình: chuyển hình "trôi" (anchor) thành hình cùng dòng (inline)',inl);rep.fix('Hình: sửa hình bị méo về đúng tỉ lệ gốc',dist);
  rep.fix('Hình: thu nhỏ hình tràn lề/tràn ô bảng/quá cao',fit);rep.fix('Hình: căn giữa hình đứng riêng một dòng',cen);
  if(ext)rep.warn(ext+' hình là liên kết ngoài (không nhúng trong file) — sẽ mất khi mở trên máy khác. Hãy chèn lại hình bằng Insert → Pictures.');
  const pict=all(doc,'pict').length;if(pict)rep.warn(pict+' hình/đối tượng dạng cũ (VML) — chưa rà soát được, kiểm tra tay.')}

function mathAndRunFmt(doc,rPr,o,ctx,rep,cnt,hf){
  const par=rPr.parentNode;if(!par||/Change$/.test(par.localName))return;
  if(par.namespaceURI===M&&par.localName==='r'){
    if(!o.mathsz)return;
    const sig=()=>['ascii','hAnsi','cs','eastAsia'].map(a=>ga(one(rPr,'rFonts'),a)).concat([ga(one(rPr,'sz'),'val'),ga(one(rPr,'szCs'),'val')]).join('|'),was=sig();
    const f=sc(doc,rPr,'rFonts',ORD.rPr);['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,'Cambria Math'));
    sa(sc(doc,rPr,'sz',ORD.rPr),'val',ctx.sz);sa(sc(doc,rPr,'szCs',ORD.rPr),'val',ctx.sz);if(sig()!==was)cnt.m++;return}
  const p=par.localName==='pPr'?par.parentNode:anc(rPr,'p');
  const head=!hf&&p&&pInfo(p).head;
  /* Run chứa công thức MathType/đối tượng/hình: giữ nguyên w:position & cỡ chữ để công thức thẳng hàng với dòng chữ */
  const hasObj=par.localName==='r'&&['object','pict','drawing'].some(n=>par.getElementsByTagNameNS(W,n).length>0);
  let f=one(rPr,'rFonts');const fam=f?ga(f,'ascii')+ga(f,'hAnsi')+ga(f,'cs')+ga(f,'eastAsia'):'';
  if(fam&&LEGACY_FONT.test(ga(f,'ascii')||ga(f,'hAnsi')))ctx.legacy.add(ga(f,'ascii')||ga(f,'hAnsi'));
  if(!SYM.test(fam)&&o.font){
    const same=f&&['ascii','hAnsi','cs','eastAsia'].every(a=>ga(f,a)===o.font)&&!['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].some(a=>f.hasAttributeNS(W,a));
    if(!same){if(!f)f=sc(doc,rPr,'rFonts',ORD.rPr);['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>f.removeAttributeNS(W,a));['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,o.font));cnt.font++}}
  if(hf)return;
  const va=one(rPr,'vertAlign');
  if(!head&&!va&&!hasObj&&!SYM.test(fam)){const se=one(rPr,'sz'),cur=se?+ga(se,'val'):0;
    if(!cur||(cur!==ctx.sz&&Math.abs(cur-ctx.sz)<=6)){sa(sc(doc,rPr,'sz',ORD.rPr),'val',ctx.sz);sa(sc(doc,rPr,'szCs',ORD.rPr),'val',ctx.sz);if(cur)cnt.sz++}}
  (hasObj?['spacing','w','fitText']:['spacing','w','position','fitText']).forEach(n=>{const e=one(rPr,n);if(e){rm(e);cnt.odd++}});
  if(o.shd){const e=one(rPr,'shd');if(e){rm(e);cnt.shd++}}
  if(o.color){['color','highlight'].forEach(n=>{const e=one(rPr,n);if(e){rm(e);cnt.col++}})}
  if(one(rPr,'vanish'))ctx.hidden++}

function paraFmt(doc,body,o,ctx,rep){
  const line=Math.round(o.line*240),after=Math.round(o.after*20);let sp=0,jf=0,ind=0,fl=0;
  all(body,'p').forEach(p=>{
    let pPr=one(p,'pPr');if(!pPr){pPr=mk(doc,'pPr');p.insertBefore(pPr,p.firstChild)}
    const inTc=!!anc(p,'tc'),info=pInfo(p);
    const s=sc(doc,pPr,'spacing',ORD.pPr),old=[ga(s,'before'),ga(s,'after'),ga(s,'line'),ga(s,'lineRule')].join();
    ['beforeLines','afterLines','beforeAutospacing','afterAutospacing'].forEach(a=>s.removeAttributeNS(W,a));
    if(!info.head){sa(s,'before',0);sa(s,'after',inTc?0:after)}
    sa(s,'line',line);sa(s,'lineRule','auto');
    if([ga(s,'before'),ga(s,'after'),ga(s,'line'),ga(s,'lineRule')].join()!==old)sp++;
    const je=one(pPr,'jc'),jc=je?ga(je,'val'):'',txt=ptext(p).trim();
    const plain=!inTc&&!info.list&&!info.head&&txt.length>=40&&!all(p,'br').length&&!all(p,'tab').length;
    if(o.justify&&plain&&(!jc||jc==='left'||jc==='start')){sa(sc(doc,pPr,'jc',ORD.pPr),'val','both');jf++}
    const ie=one(pPr,'ind');
    if(ie&&!info.list){const L=+ga(ie,'left')||+ga(ie,'start')||0,Rr=+ga(ie,'right')||+ga(ie,'end')||0,F=+ga(ie,'firstLine')||0;
      if(L<0||Rr<0||L>5000||Rr>3000||F>1134){rm(ie);ind++}}
    if(o.firstLine&&plain){const j=ga(one(pPr,'jc'),'val');if(j==='both'){const x=sc(doc,pPr,'ind',ORD.pPr);['hanging','hangingChars','firstLineChars'].forEach(a=>x.removeAttributeNS(W,a));sa(x,'firstLine',567);fl++}}});
  rep.fix('Đồng nhất giãn dòng và khoảng cách đoạn (đoạn)',sp);rep.fix('Căn đều hai bên cho đoạn văn thường (đoạn)',jf);
  rep.fix('Gỡ thụt lề bất thường (âm/quá lớn)',ind);rep.fix('Thụt đầu dòng chuẩn 1 cm cho đoạn văn (đoạn)',fl)}

function dominantSize(body,defSz){
  const c={};all(body,'r').forEach(r=>{const p=anc(r,'p');if(p&&pInfo(p).head)return;const pr=one(r,'rPr');if(pr&&one(pr,'vertAlign'))return;
    const n=all(r,'t').reduce((a,t)=>a+t.textContent.length,0);if(!n)return;const se=pr&&one(pr,'sz'),v=se?+ga(se,'val'):defSz;c[v]=(c[v]||0)+n});
  let best=0,bn=0;for(const k in c)if(c[k]>bn){bn=c[k];best=+k}return best||defSz}

function numberingCheck(doc,numDoc,rep){
  const ids=new Set(numDoc?all(numDoc,'num').map(n=>ga(n,'numId')):[]);let n=0;
  all(doc,'numPr').forEach(np=>{if(np.parentNode&&np.parentNode.localName!=='pPr')return;const ni=one(np,'numId');
    if(ni&&ga(ni,'val')!=='0'&&!ids.has(ga(ni,'val'))){rm(np);n++}
    const il=one(np,'ilvl');if(il&&+ga(il,'val')>8){sa(il,'val',8);n++}});
  rep.fix('Danh sách: gỡ đánh số trỏ tới định dạng không tồn tại / cấp sai',n)}

function insBeforeAny(root,el,names){const ref=Array.from(root.children).find(c=>c.namespaceURI===W&&names.indexOf(c.localName)>=0);root.insertBefore(el,ref||null)}
function settingsPass(sd,o,ctx,rep){
  const root=sd.documentElement;
  if(o.compat){const cp=one(root,'compat');
    if(cp){let cs=wk(cp,'compatSetting').find(e=>ga(e,'name')==='compatibilityMode');
      if(!cs){cs=mk(sd,'compatSetting');sa(cs,'name','compatibilityMode');sa(cs,'uri','http://schemas.microsoft.com/office/word');sa(cs,'val','15');cp.appendChild(cs);rep.fix('Tắt chế độ Compatibility Mode (nâng lên Word 2013+)')}
      else if((+ga(cs,'val')||0)<15){sa(cs,'val','15');rep.fix('Tắt chế độ Compatibility Mode (nâng lên Word 2013+)')}}}
  if(ctx.hasToc&&o.fields&&!one(root,'updateFields')){const u=mk(sd,'updateFields');sa(u,'val','true');insBeforeAny(root,u,['hdrShapeDefaults','footnotePr','endnotePr','compat','docVars','rsids','mathPr','attachedSchema','themeFontLang','clrSchemeMapping']);
    rep.fix('Mục lục/trường: tự cập nhật khi mở file (Word sẽ hỏi 1 lần, bấm Yes)')}
  if(one(root,'evenAndOddHeaders'))rep.warn('Tài liệu bật header/footer trang chẵn–lẻ khác nhau (nếu không chủ ý: Layout → Page Setup → Layout → bỏ "Different odd and even").');
  if(o.accept){const t=one(root,'trackRevisions');if(t)rm(t)}}

function stylesPass(sd,o,ctx){
  const root=sd.documentElement;let dd=one(root,'docDefaults');if(!dd){dd=mk(sd,'docDefaults');root.insertBefore(dd,root.firstChild)}
  let rd=one(dd,'rPrDefault');if(!rd){rd=mk(sd,'rPrDefault');dd.insertBefore(rd,dd.firstChild)}
  let rp=one(rd,'rPr');if(!rp){rp=mk(sd,'rPr');rd.appendChild(rp)}
  if(o.font){const f=sc(sd,rp,'rFonts',ORD.rPr);['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>f.removeAttributeNS(W,a));['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,o.font))}
  sa(sc(sd,rp,'sz',ORD.rPr),'val',ctx.sz);sa(sc(sd,rp,'szCs',ORD.rPr),'val',ctx.sz);sa(sc(sd,rp,'lang',ORD.rPr),'val','vi-VN')}

/* ---------- AI (Gemini): soát chính tả / dấu / gõ nhầm / dấu câu ---------- */
const AI_SYS='Bạn là biên tập viên tiếng Việt cho tài liệu giáo dục (Toán). Nhận mảng JSON [{i,t}] gồm các đoạn văn. Tìm lỗi chính tả, sai/thiếu dấu thanh, gõ nhầm Telex/VNI (vd "đưưọc", "tính toán1"), dính/tách chữ sai, lặp từ do gõ, và lỗi DẤU CÂU (thiếu/thừa dấu chấm, dấu phẩy, dùng phẩy thay chấm, câu hỏi thiếu dấu hỏi chấm). Với lỗi CHẮC CHẮN 100% đặt "kind":"sua". Với lỗi dấu câu hoặc cách dùng từ chưa chắc chắn đặt "kind":"goiy" (chỉ là gợi ý để người dùng xem lại). TUYỆT ĐỐI KHÔNG: sửa công thức, số liệu, ký hiệu toán, tên riêng, chữ viết tắt, đoạn "⟦CT⟧" (đó là công thức); không viết lại câu, không đổi văn phong, không thêm/bớt ý. Trả về DUY NHẤT mảng JSON [{"i":số,"find":"cụm sai nguyên văn (1–6 từ, nằm trọn trong đoạn)","replace":"cụm đã sửa","kind":"sua"|"goiy"}]; nếu không có lỗi trả về [].';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function aiPass(body,o,rep,hooks){
  const key=window.GKEY&&window.GKEY.get();
  if(!key){rep.warn('AI soát chính tả: chưa có API key Gemini — bấm "🔑 Nhập key" ở đầu trang rồi chạy lại.');if(window.GKEY&&window.GKEY.open)window.GKEY.open('Nhập key để dùng AI soát chính tả.');return}
  const walk=(n,out)=>{for(const c of Array.from(n.childNodes)){if(c.nodeType!==1)continue;
    if(c.namespaceURI===M){if(c.localName==='oMath'||c.localName==='oMathPara')out.push('⟦CT⟧');continue}
    if(c.namespaceURI===W&&c.localName==='t'){out.push(c.textContent);continue}
    if(c.namespaceURI===W&&/^(drawing|pict|object|delText)$/.test(c.localName))continue;walk(c,out)}return out};
  const items=[];all(body,'p').forEach((p,i)=>{const t=walk(p,[]).join('');if(/\p{L}{2,}/u.test(t)&&t.length>=8)items.push({i,p,t})});
  const cap=o.aiMax||1500,list=items.slice(0,cap);if(items.length>cap)rep.warn('AI chỉ soát '+cap+' đoạn đầu (tài liệu có '+items.length+' đoạn có chữ).');
  const batches=[];let cur=[],len=0;list.forEach(x=>{if(cur.length>=40||len+x.t.length>6000){batches.push(cur);cur=[];len=0}cur.push(x);len+=x.t.length});if(cur.length)batches.push(cur);
  let applied=0,rejected=0,sugg=0;const failed=[];rep.aiSug=rep.aiSug||[];
  const dg=s=>(String(s).match(/\d+/g)||[]).join(',');
  const handle=(b,x)=>{
    const it=x&&b.find(y=>y.i===x.i);
    if(!it||typeof x.find!=='string'||typeof x.replace!=='string'||!x.find||x.find===x.replace||x.find.length>80||x.find.indexOf('⟦')>=0||dg(x.find)!==dg(x.replace)||x.replace.length>x.find.length*1.5+4){rejected++;return}
    const S=pModel(it.p).S,pos=S.indexOf(x.find);
    if(pos<0||S.indexOf(x.find,pos+1)>=0){rejected++;return}
    if(o.aiMode==='comment'||x.kind==='goiy'){rep.aiSug.push({find:x.find,replace:x.replace});rep.notes.push('AI gợi ý (không tự sửa): “'+x.find+'” → “'+x.replace+'”');sugg++;return}
    let a=0;while(a<x.find.length&&a<x.replace.length&&x.find[a]===x.replace[a])a++;
    let e1=x.find.length,e2=x.replace.length;while(e1>a&&e2>a&&x.find[e1-1]===x.replace[e2-1]){e1--;e2--}
    applyEdit(it.p,{s:pos+a,e:pos+e1,r:x.replace.slice(a,e2),k:'ai'});applied++;rep.notes.push('AI sửa: “'+x.find+'” → “'+x.replace+'”')};
  const doBatch=async(b,label)=>{
    hooks.progress('AI soát chính tả: '+label+'...');
    let res;
    for(let a=0;a<3;a++){
      try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+o.aiModel+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({systemInstruction:{parts:[{text:AI_SYS}]},contents:[{role:'user',parts:[{text:JSON.stringify(b.map(x=>({i:x.i,t:x.t})))}]}],generationConfig:{temperature:0.1,maxOutputTokens:8192,responseMimeType:'application/json'}})})}
      catch(e){return{stop:'không kết nối được Gemini ('+e.message+')'}}
      if((res.status===500||res.status===503)&&a<2){await sleep(2500*(a+1));continue}
      if(res.status===429&&a<1){hooks.progress('AI: chạm hạn mức, chờ 20 giây rồi thử lại...');await sleep(20000);continue}
      break}
    if(!res.ok)return{stop:res.status===429?'hết hạn mức key (đợi ~1 phút rồi chạy lại)':res.status===401||res.status===403||res.status===400?'key không hợp lệ hoặc không có quyền dùng model '+o.aiModel:'lỗi Gemini HTTP '+res.status};
    let fx;try{const data=await res.json();const txt=((data.candidates||[])[0].content.parts||[]).map(p=>p.text||'').join('');fx=JSON.parse(txt.replace(/^\s*```(?:json)?|```\s*$/g,'').trim())}catch(e){return{retry:1}}
    if(!Array.isArray(fx))return{retry:1};
    fx.forEach(x=>handle(b,x));return{ok:1}};
  let stopped=null;
  for(let k=0;k<batches.length&&!stopped;k++){
    const r=await doBatch(batches[k],'lô '+(k+1)+'/'+batches.length);
    if(r.stop)stopped=r.stop;else if(r.retry)failed.push(batches[k])}
  let lost=0;
  for(let k=0;k<failed.length&&!stopped;k++){
    const r=await doBatch(failed[k],'thử lại lô lỗi '+(k+1)+'/'+failed.length);
    if(r.stop)stopped=r.stop;else if(r.retry)lost++}
  if(stopped)rep.warn('AI soát chính tả dừng: '+stopped+'. Phần AI chưa soát hết — chạy lại để soát tiếp.');
  if(lost)rep.warn('AI trả về dữ liệu không đọc được ở '+lost+' lô (đã thử lại, bỏ qua) — các đoạn trong lô đó chưa được AI soát.');
  rep.fix('AI sửa lỗi chính tả/dấu/gõ nhầm (chỗ)',applied);
  if(sugg)rep.warn('AI có '+sugg+' gợi ý chưa tự sửa (dấu câu/dùng từ/chế độ chỉ gợi ý) — xem Comment trong file.');
  if(rejected)rep.warn('AI đề xuất '+rejected+' sửa đổi nhưng bị bỏ qua vì không an toàn (đụng số/công thức, không khớp nguyên văn hoặc xuất hiện nhiều chỗ).')}

/* ====================== HÀM CHÍNH ====================== */
const PKG=()=>typeof window!=='undefined'&&typeof window.WordPkgCheck==='function'?window.WordPkgCheck:null;
async function auditOnce(buf,o,hooks){
  hooks=hooks||{progress(){}};
  const zip=await JSZip.loadAsync(buf);
  /* lỗi cấu trúc có sẵn trong file gốc (Word vẫn mở được) — chỉ chặn lỗi MỚI do công cụ gây ra */
  let base=new Set();const pk=PKG();
  if(pk){try{base=new Set((await pk(await JSZip.loadAsync(buf),true)).er)}catch(e){}}
  if(!zip.file('word/document.xml'))throw new Error('không phải file .docx hợp lệ (thiếu word/document.xml)');
  const rep=mkRep(),ctx={sz:28,rels:{},dims:{},missing:[],legacy:new Set(),hidden:0,hasToc:false};
  const dry=!!o.dry,step=(n,fn)=>{if(dry&&!/^(quét lỗi|ghi Comment)/.test(n))return;try{fn()}catch(e){rep.warn('Bước "'+n+'" gặp lỗi nên đã bỏ qua: '+e.message)}};
  const astep=async(n,fn)=>{try{await fn()}catch(e){rep.warn('Bước "'+n+'" gặp lỗi nên đã bỏ qua: '+e.message)}};
  const rd=async n=>zip.file(n)?pX(await zip.file(n).async('string'),n):null;
  let docXml=await zip.file('word/document.xml').async('string');
  if(o.latex&&!o.dry&&typeof convertDocumentXML==='function'){try{if(typeof eqLogReset==='function')eqLogReset();const c=convertDocumentXML(docXml);docXml=c.xml;
      rep.fix('Công thức LaTeX ($...$, \\[...\\]) → Equation của Word',c.totalEq);
      const EL=typeof EQ_LOG!=='undefined'?EQ_LOG:{degraded:[],opaque:0,skipped:0};
      if(EL.degraded.length)rep.warn(EL.degraded.length+' công thức LaTeX không dựng được Equation (giữ nguyên chữ LaTeX): hãy kiểm tra tay.');
      if(EL.warned&&EL.warned.length){const cut=t=>{t=String(t).replace(/\s+/g,' ');return t.length>60?t.slice(0,60)+'…':t};
        rep.warn(EL.warned.length+' công thức LaTeX đã chuyển nhưng có phần được xử lý gần đúng (có thể sai ký hiệu) — hãy đối chiếu:');
        EL.warned.slice(0,8).forEach(d=>rep.warn('   • “'+cut(d.latex)+'” — '+(d.warn||[]).join('; ')));
        if(EL.warned.length>8)rep.warn('   … và '+(EL.warned.length-8)+' công thức khác')}
      if(EL.opaque)rep.warn(EL.opaque+' công thức dạng MathType/đối tượng nhúng — giữ nguyên, không chuyển được.');
      if(EL.skipped)rep.warn(EL.skipped+' công thức bị ngắt bởi ảnh/xuống dòng/trường đặc biệt nên chưa chuyển — hãy gõ liền trên một dòng.')}
    catch(e){rep.warn('Chuyển LaTeX → Equation gặp lỗi và đã bỏ qua: '+e.message)}}
  {let mx=900000;for(const m of docXml.matchAll(/\bw:id="(\d+)"/g))mx=Math.max(mx,+m[1]+1);
   TRK.id=mx;TRK.on=!!o.track;TRK.date=new Date().toISOString().replace(/\.\d+Z$/,'Z');PSEUDO=o.phead!==false}
  const doc=pX(docXml,'document.xml'),body=doc.getElementsByTagNameNS(W,'body')[0];
  if(!body)throw new Error('thiếu w:body trong document.xml');
  const sd=await rd('word/styles.xml'),setd=await rd('word/settings.xml'),numd=await rd('word/numbering.xml'),relsd=await rd('word/_rels/document.xml.rels');
  if(relsd)Array.from(relsd.documentElement.children).forEach(r=>ctx.rels[r.getAttribute('Id')]={t:r.getAttribute('Target'),m:r.getAttribute('TargetMode')||'',ty:r.getAttribute('Type')||''});
  hooks.progress('Đang đọc kích thước hình...');
  for(const id in ctx.rels){const r=ctx.rels[id];if(!/\/image$/.test(r.ty)||r.m==='External')continue;
    const f=zip.file(rs('word/',r.t));if(!f){ctx.missing.push(id);continue}const d=imgDim(await f.async('uint8array'));if(d)ctx.dims[id]=d}
  ctx.hasToc=all(doc,'instrText').some(t=>/^\s*TOC\b/.test(t.textContent))||all(doc,'fldSimple').some(f=>/^\s*TOC\b/.test(ga(f,'instr')));
  let defSz=20;if(sd){const dr=one(one(sd.documentElement,'docDefaults'),'rPrDefault'),dz=dr&&one(one(dr,'rPr'),'sz');if(dz)defSz=+ga(dz,'val')||defSz;
    const nm=wk(sd.documentElement,'style').find(s=>ga(s,'type')==='paragraph'&&ga(s,'default')==='1'),nz=nm&&one(one(nm,'rPr'),'sz');if(nz)defSz=+ga(nz,'val')||defSz}
  hooks.progress('Đang rà soát...');await tick();
  step('dọn nhiễu XML',()=>stripNoise(doc));
  step('Track Changes/Comment',()=>reviewMarks(doc,o,rep));
  step('gộp đoạn chữ rời rạc',()=>mergeRuns(doc));
  if(o.text)step('dọn văn bản',()=>textPass(body,o,rep));
  if(o.unify!==false)step('thống nhất nhãn',()=>unifyLabels(body,o,rep));
  if(o.cap)step('viết hoa đầu đoạn',()=>capPass(body,o,rep));
  if(o.ai)await astep('AI soát chính tả',()=>aiPass(body,o,rep,hooks));
  if(o.num)step('đánh số Câu/Bài',()=>renumber(body,rep));
  if(o.blank)step('dòng trống/ngắt trang',()=>blanks(doc,body,rep));
  if(o.keep)step('giữ đoạn không bị tách trang',()=>keepPass(doc,body,rep));
  let secs=null;step('khổ giấy & lề',()=>{secs=sections(doc,body,o,rep)});
  if(!secs){secs=[{end:body.children.length,sp:one(body,'sectPr')||mk(doc,'sectPr'),aw:9071,ah:14570}];secs.bk=Array.from(body.children)}
  if(o.tbl)step('bảng',()=>tablePass(doc,body,secs,o,rep));
  if(o.img||o.imgInline||o.imgFix)step('hình ảnh',()=>imgPass(doc,secs,o,rep,ctx));
  step('danh sách',()=>numberingCheck(doc,numd,rep));
  ctx.sz=o.size==='auto'?dominantSize(body,defSz):(+o.size)*2;
  if(o.size==='auto'&&!dry)rep.notes.push('Cỡ chữ chính nhận diện của tài liệu: '+ctx.sz/2+' pt');
  const cnt={font:0,sz:0,odd:0,shd:0,col:0,m:0};
  step('font/cỡ chữ',()=>{all(doc,'rPr').forEach(r=>mathAndRunFmt(doc,r,o,ctx,rep,cnt,false));
    all(doc,'r',M).forEach(r=>{if(!one(r,'rPr')&&o.mathsz){const wr=mk(doc,'rPr'),mp=Array.from(r.children).find(c=>c.namespaceURI===M&&c.localName==='rPr');r.insertBefore(wr,mp?mp.nextSibling:r.firstChild);mathAndRunFmt(doc,wr,o,ctx,rep,cnt,false)}});
    step('định dạng đoạn',()=>paraFmt(doc,body,o,ctx,rep))});
  rep.fix('Đồng nhất font chữ (run)',cnt.font);rep.fix('Đồng nhất cỡ chữ lệch (run)',cnt.sz);
  rep.fix('Gỡ co giãn/giãn cách ký tự/nâng hạ chữ bất thường (dán từ PDF/web)',cnt.odd);rep.fix('Gỡ nền (shading) lạ trong chữ',cnt.shd);
  rep.fix('Gỡ màu chữ/tô sáng',cnt.col);rep.fix('Công thức: đồng bộ font Cambria Math và cỡ chữ với văn bản',cnt.m);
  if(ctx.hidden)rep.warn(ctx.hidden+' đoạn chữ đang ẩn (Hidden text) — kiểm tra nếu thấy thiếu/thừa nội dung.');
  if(ctx.legacy.size)rep.warn('Phát hiện font bảng mã cũ: '+Array.from(ctx.legacy).slice(0,4).join(', ')+' — chữ Việt có thể hiện sai dấu. Hãy đổi sang Unicode bằng UniKey (Ctrl+Shift+F6) rồi rà soát lại.');
  const hf=Object.keys(zip.files).filter(n=>/^word\/(header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(n)),hfDocs={};let hasPage=false;
  for(const n of hf){const d=await rd(n);hfDocs[n]=d;
    if(all(d,'instrText').some(t=>/\bPAGE\b/.test(t.textContent))||all(d,'fldSimple').some(f=>/\bPAGE\b/.test(ga(f,'instr'))))hasPage=true;
    step('header/footer',()=>{const c={font:0,sz:0,odd:0,shd:0,col:0,m:0};all(d,'rPr').forEach(r=>mathAndRunFmt(d,r,o,ctx,rep,c,true))});
    if(o.text)step('dọn văn bản header/footer/chú thích',()=>textPass(d.documentElement,Object.assign({},o,{indent:false}),rep,'đầu/chân trang, chú thích'))}
  if(!hasPage)rep.warn('Chưa thấy số trang (trường PAGE) trong header/footer — thêm bằng Insert → Page Number nếu cần.');
  if(ctx.hasToc){const heads=all(body,'p').filter(p=>pInfo(p).head).length;
    if(!heads)rep.warn('Có mục lục nhưng không đoạn nào dùng kiểu Heading — mục lục sẽ trống. Hãy gán Heading 1/2/3 cho tiêu đề.')}
  if(sd)step('kiểu mặc định',()=>stylesPass(sd,o,ctx));
  if(setd)step('cài đặt tài liệu',()=>settingsPass(setd,o,ctx,rep));
  let cmt=await rd('word/comments.xml'),cmtTouched=false,cmtNew=false,ctd=null,rl=relsd;
  if(cmt&&o.nocmt&&!dry){Array.from(cmt.documentElement.children).forEach(rm);cmtTouched=true}
  if(o.mark){
    const flags=[];
    step('quét lỗi cần kiểm tra tay',()=>{flags.push(...lintDoc(body,o,rep,(o.aiSug||[]).concat(rep.aiSug||[])))});
    rep.lint=flags.map(f=>({n:f.n,snip:f.snip,issues:f.issues}));
    if(flags.length){
      ctd=await rd('[Content_Types].xml');
      step('ghi Comment đánh dấu',()=>{
        if(!cmt){cmt=pX('<w:comments xmlns:w="'+W+'"/>');cmtNew=true}
        cmtTouched=true;const MAXC=o.maxComments||300;addComments(doc,cmt,flags.slice(0,MAXC));if(flags.length>MAXC)rep.warn('Có '+flags.length+' đoạn cần kiểm tra nhưng chỉ gắn Comment cho '+MAXC+' đoạn đầu để file không bị rối — danh sách đầy đủ nằm trong báo cáo .txt.');
        if(cmtNew){
          if(ctd&&!Array.from(ctd.documentElement.children).some(e=>e.getAttribute('PartName')==='/word/comments.xml')){
            const e=ctd.createElementNS(CTNS,'Override');e.setAttribute('PartName','/word/comments.xml');
            e.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml');ctd.documentElement.appendChild(e)}
          if(!rl)rl=pX('<Relationships xmlns="'+RELNS+'"/>');
          if(!Array.from(rl.documentElement.children).some(r=>/\/comments$/.test(r.getAttribute('Type')||''))){
            const e=rl.createElementNS(RELNS,'Relationship');e.setAttribute('Id','rIdRsCmt1');e.setAttribute('Type',R+'/comments');e.setAttribute('Target','comments.xml');rl.documentElement.appendChild(e)}}})}}
  const out=[['word/document.xml',doc]];
  if(sd)out.push(['word/styles.xml',sd]);if(setd)out.push(['word/settings.xml',setd]);
  Object.keys(hfDocs).forEach(n=>out.push([n,hfDocs[n]]));
  if(cmt&&cmtTouched)out.push(['word/comments.xml',cmt]);
  if(cmtNew){if(ctd)out.push(['[Content_Types].xml',ctd]);if(rl)out.push(['word/_rels/document.xml.rels',rl])}
  hooks.progress('Đang kiểm tra cấu trúc file...');
  const er=[];
  for(const [n,d] of out){const s=ser(d);try{pX(s,n)}catch(e){er.push(e.message)}zip.file(n,s,{createFolders:false})}
  const rels=ctx.rels;all(doc,'blip',A).forEach(b=>{['embed','link'].forEach(a=>{const v=b.getAttributeNS(R,a);if(v&&!rels[v])er.push('hình trỏ tới r:id không tồn tại: '+v)})});
  if(pk){const ck=await pk(zip,true);ck.er.forEach(x=>{if(!/^docxToBlocks/.test(x)&&!base.has(x))er.push(x)})}
  if(er.length){const e=new Error('Kiểm tra cấu trúc thất bại, KHÔNG xuất file để tránh làm hỏng: '+er.slice(0,3).join('; '));e.validation=true;throw e}
  return{data:await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),rep}}

/* Chế độ an toàn: nếu file kết quả không qua kiểm tra cấu trúc, tự tắt dần các bước rủi ro nhất rồi thử lại */
const FALLBACK=[['chuyển công thức LaTeX',{latex:false}],['xử lý hình ảnh',{imgInline:false,imgFix:false}],['xử lý bảng',{tbl:false,tblborder:false}],
  ['dọn dòng trống/ngắt trang/giữ đoạn',{blank:false,keep:false}],['dọn văn bản & đánh số lại Câu/Bài',{text:false,num:false,indent:false}]];
async function auditFB(buf,o,hooks){
  hooks=hooks||{progress(){}};
  const off={},dis=[];
  for(let i=0;i<=FALLBACK.length;i++){
    try{
      const r=await auditOnce(buf,Object.assign({},o,off),hooks);
      if(dis.length)r.rep.warn('Để file xuất ra mở trong Word không báo lỗi, công cụ đã tự tắt: '+dis.join('; ')+'. Hãy xử lý tay các mục này nếu cần.');
      return r}
    catch(e){
      if(!e.validation||i===FALLBACK.length)throw e;
      dis.push(FALLBACK[i][0]);Object.assign(off,FALLBACK[i][1]);hooks.progress('Phát hiện lỗi cấu trúc, thử lại ở chế độ an toàn (bước '+(i+1)+')...')}}}

const resid=rep=>Array.from(rep.f.values()).reduce((a,b)=>a+b,0);
async function audit(buf,o,hooks){
  hooks=hooks||{progress(){}};
  if(o.dry){const r=await auditFB(buf,Object.assign({},o,{mark:true,verify:false,aiMode:'comment',track:false}),hooks);
    r.rep.notes.unshift('Chế độ CHỈ KIỂM TRA: không sửa nội dung nào, chỉ gắn Comment tại chỗ cần xem và lập báo cáo.');return r}
  if(!o.verify)return auditFB(buf,o,hooks);
  const first=await auditFB(buf,Object.assign({},o,{mark:false}),hooks);
  const base=Object.assign({},o,{ai:false,latex:false,mark:false,quiet:true,accept:o.track?false:o.accept,aiSug:undefined});
  let cur=first,rounds=0,clean=false;
  for(let k=1;k<=3;k++){
    hooks.progress('Kiểm lại vòng '+k+'/3 (tìm lỗi còn sót trên file kết quả)...');
    let r;try{r=await auditFB(cur.data,base,hooks)}catch(e){first.rep.warn('Vòng kiểm lại '+k+' gặp lỗi nên đã dừng: '+e.message);break}
    cur=r;rounds=k;
    if(resid(r.rep)===0){clean=true;break}
    r.rep.f.forEach((n,key)=>first.rep.fix(key+' (vòng kiểm lại '+k+')',n));
    (r.rep.changes||[]).forEach(x=>{first.rep.changes=first.rep.changes||[];if(first.rep.changes.length<300)first.rep.changes.push(Object.assign({},x,{t:'vòng kiểm lại'}))});
    r.rep.w.forEach(x=>first.rep.warn(x))}
  if(o.mark){
    hooks.progress('Quét lỗi cần kiểm tra tay và ghi Comment...');
    try{const r=await auditFB(cur.data,Object.assign({},base,{mark:true,aiSug:first.rep.aiSug||[]}),hooks);
      cur=r;first.rep.lint=r.rep.lint||[];r.rep.w.forEach(x=>first.rep.warn(x))}
    catch(e){first.rep.warn('Không ghi được Comment đánh dấu: '+e.message)}}
  first.rep.notes.unshift(clean?'✔ Đã kiểm lại '+rounds+' vòng trên chính file kết quả: không còn lỗi nào tự sửa được.':'⚠ Sau '+rounds+' vòng kiểm lại vẫn còn thay đổi — xem mục "Cần kiểm tra tay".');
  if(o.track)first.rep.notes.push('Track Changes: mọi sửa đổi về chữ/dấu câu do công cụ tạo ra được ghi dưới tên "'+TRK.author+'" (Review → Accept/Reject). Định dạng (font, lề, bảng, hình…) được sửa trực tiếp, không ghi Track Changes.');
  return{data:cur.data,rep:first.rep}}

function reportText(name,rep){
  const L=['BÁO CÁO RÀ SOÁT WORD — '+name,''];
  L.push('ĐÃ TỰ ĐỘNG SỬA:');if(!rep.f.size)L.push('  (không có thay đổi nào)');rep.f.forEach((n,k)=>L.push('  • '+k+': '+n));
  if(rep.notes.length){L.push('','GHI CHÚ / CHI TIẾT:');rep.notes.slice(0,200).forEach(x=>L.push('  - '+x))}
  if(rep.lint&&rep.lint.length){L.push('','CHỖ CẦN KIỂM TRA (đã đánh dấu bằng Comment trong file Word):');rep.lint.slice(0,400).forEach(x=>L.push('  • Đoạn '+x.n+' “'+x.snip+'”: '+x.issues.join('; ')));if(rep.lint.length>400)L.push('  … và '+(rep.lint.length-400)+' đoạn khác')}
  if(rep.changes&&rep.changes.length){L.push('','NHẬT KÝ THAY ĐỔI VĂN BẢN (trước → sau; tối đa '+rep.changes.length+' đoạn đầu):');rep.changes.forEach(x=>{const w=diffWin(x.b,x.a);L.push('  • Đoạn '+x.n+(x.t?' ('+x.t+')':'')+': “'+w[0]+'” → “'+w[1]+'”')})}
  L.push('','CẦN BẠN KIỂM TRA TAY:');if(!rep.w.length)L.push('  (không có cảnh báo)');rep.w.forEach(x=>L.push('  ⚠ '+x));
  return L.join('\n')}

/* ====================== GIAO DIỆN ====================== */
const MODELS=[['gemini-3.5-flash-lite','Gemini 3.5 Flash Lite'],['gemini-3.1-flash-lite','Gemini 3.1 Flash Lite'],['gemini-3.8-flash','Gemini 3.8 Flash']];
const cb=(id,t,on)=>'<label class="raC"><input type="checkbox" id="ra_'+id+'"'+(on?' checked':'')+'> '+t+'</label>';
const num=(id,v)=>'<input type="number" id="ra_'+id+'" value="'+v+'" min="0" max="100" step="1" style="width:60px">';
function buildUI(){
  if(g('wtAudit'))return;
  const st=document.createElement('style');
  st.textContent='#wtAudit .raG{border:1px solid rgba(128,128,128,.35);border-radius:10px;margin:8px 0;padding:6px 10px}#wtAudit summary{cursor:pointer;font-weight:600;padding:4px 0}#wtAudit .raC{display:block;margin:5px 0;font-size:14px;line-height:1.4}#wtAudit .raR{margin:5px 0;font-size:14px}#wtAudit .raRes{border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:14px}#wtAudit .raRes ul{margin:4px 0 4px 18px;padding:0}#wtAudit .raRes li{margin:2px 0}';
  document.head.appendChild(st);
  const d=document.createElement('div');d.className='wtool';d.id='wtAudit';
  d.innerHTML='<div class="note">Đưa file .docx lên → công cụ tự rà soát và sửa lỗi bố cục, định dạng, bảng, hình, công thức, đánh số… rồi xuất file mới kèm báo cáo (đã gồm cả chức năng Chuẩn hóa Word). <b>File gốc không bị thay đổi.</b> File xuất ra được tự kiểm tra cấu trúc; nếu có nguy cơ lỗi, công cụ tự thử lại ở chế độ an toàn. Mặc định đã chọn các mục an toàn; mở từng nhóm để tinh chỉnh.</div>'
  +'<div class="bar"><button class="ghost sm" id="ra_preset" type="button">⚡ Chuẩn hóa nhanh: Times New Roman 14, A4, lề chuẩn</button></div>'
  +'<div class="bar"><input type="file" id="ra_in" accept=".docx" multiple style="display:none"><button class="ghost" id="ra_pick" type="button">📁 Chọn file .docx (nhiều file / kéo thả vào đây)</button><button class="sec sm" id="ra_clear" type="button">🗑 Xóa danh sách</button></div><div id="ra_list"></div>'
  +'<details class="raG" open><summary>📝 Văn bản &amp; định dạng</summary>'
  +cb('text','Dọn khoảng trắng thừa, dấu cách trước dấu câu, ký tự ẩn, NBSP; chuẩn hóa dấu tiếng Việt (NFC)',1)+cb('indent','Bỏ Tab/dấu cách thụt đầu dòng thủ công',1)+cb('num','Đánh số lại “Câu/Bài” bị nhảy hoặc trùng (reset theo PHẦN/ĐỀ)',1)+cb('spell','Sửa lỗi chính tả thường gặp chắc chắn sai (vd “xác xuất”→“xác suất”, “bổ xung”→“bổ sung”, “xử dụng”→“sử dụng”)',1)+cb('unify','Thống nhất kiểu nhãn theo kiểu đa số: đáp án “A.” hay “A)”, nhãn “Câu 1.” hay “Câu 1:”',1)+cb('decimal','Đổi số thập phân 3.5 → 3,5 (bỏ qua số mục/hình/bảng, ngày tháng) — chỉ bật nếu tài liệu dùng dấu phẩy',0)+cb('cap','Tự viết hoa chữ đầu câu / đầu đoạn (chỉ khi chắc chắn; mặc định chỉ đánh dấu Comment)',0)+cb('quotes','Đổi ngoặc kép thẳng (") thành ngoặc kép cong “ ” khi mở/đóng đúng cặp',1)+cb('phead','Nhận diện tiêu đề không dùng style Heading (dòng ngắn in đậm hoặc IN HOA) để không căn đều/thụt dòng nhầm',1)
  +'<div class="raR">Font: <select id="ra_font"><option>Times New Roman</option><option>Arial</option><option>Calibri</option><option>Cambria</option><option value="">Giữ nguyên font</option></select> &nbsp; Cỡ chữ: <select id="ra_size"><option value="auto">Tự nhận diện</option><option value="12">12</option><option value="13">13</option><option value="14">14</option></select></div>'
  +'<div class="raR">Giãn dòng: <select id="ra_line"><option value="1">1.0</option><option value="1.15" selected>1.15</option><option value="1.3">1.3</option><option value="1.5">1.5</option></select> &nbsp; Sau đoạn (pt): <select id="ra_after"><option value="0">0</option><option value="3">3</option><option value="6" selected>6</option><option value="8">8</option></select></div>'
  +cb('justify','Căn đều hai bên cho đoạn văn dài (không đụng tiêu đề, danh sách, bảng, đoạn căn giữa/phải)',1)+cb('firstLine','Thụt đầu dòng 1 cm cho đoạn văn thường (tắt nếu là đề trắc nghiệm)',0)+cb('shd','Gỡ nền (shading) lạ khi dán từ web',1)+cb('color','Gỡ màu chữ và tô sáng (tắt nếu có đáp án tô màu)',0)+'</details>'
  +'<details class="raG"><summary>📄 Trang, ngắt trang, tiêu đề</summary>'
  +cb('blank','Xóa dòng trống thừa và ngắt trang thừa (trang trắng)',1)+cb('keep','Giữ tiêu đề/câu hỏi/hình đi cùng đoạn sau; bỏ ràng buộc gây đẩy đoạn sang trang mới',1)
  +cb('page','Đưa khổ giấy về A4 và lề chuẩn:',1)+'<div class="raR">Lề (mm): Trên '+num('mt',20)+' Dưới '+num('mb',20)+' Trái '+num('ml',30)+' Phải '+num('mr',15)+'</div>'
  +cb('pgnum','Giữ số trang liên tục (bỏ “bắt đầu lại số trang” ở section sau)',1)+cb('fields','Tự cập nhật mục lục khi mở file (nếu có mục lục)',1)+cb('compat','Tắt Compatibility Mode (file .doc cũ)',1)+'</details>'
  +'<details class="raG"><summary>📊 Bảng &amp; 🖼 Hình &amp; ∑ Công thức</summary>'
  +cb('tbl','Bảng: vừa lề, không cắt đôi hàng, lặp hàng tiêu đề, căn giữa ô ngắn, gỡ bảng trôi',1)+cb('tblborder','Thêm viền cho bảng nhiều hàng chưa có viền',0)
  +cb('imgInline','Hình: chuyển hình “trôi” thành hình cùng dòng (hết nhảy vị trí/che chữ)',1)+cb('imgFix','Hình: sửa méo, thu nhỏ hình tràn lề/ô bảng, căn giữa hình đứng riêng',1)
  +cb('latex','Công thức: chuyển LaTeX ($...$, \\(...\\), \\[...\\]) thành Equation của Word',1)+cb('mathsz','Công thức: đồng bộ font/cỡ chữ với văn bản',1)+'</details>'
  +'<details class="raG" open><summary>🔎 Kiểm tra &amp; đánh dấu</summary>'
  +cb('mark','Đánh dấu bằng Comment tại chỗ cần kiểm tra tay (nghi gõ sai, ngoặc/ngoặc kép lệch, thiếu dấu chấm cuối, viết hoa, dấu câu lạ…)',1)
  +cb('verify','Kiểm lại nhiều vòng: chạy lại rà soát trên file kết quả cho tới khi không còn lỗi tự sửa được',1)
  +cb('track','Ghi sửa đổi chữ/dấu câu dưới dạng Track Changes (duyệt từng chỗ trong Word)',0)
  +cb('dry','<b>Chỉ kiểm tra, KHÔNG sửa gì</b>: chỉ gắn Comment tại chỗ có lỗi (kể cả chỗ sẽ được tự sửa) và lập báo cáo',0)
  +'<details class="raG" style="margin-left:6px"><summary>Chọn loại lỗi cần đánh dấu</summary>'
  +cb('l_typo','Nghi gõ sai/thiếu dấu (kiểm tra âm tiết tiếng Việt)',1)+cb('l_dup','Lặp từ liền nhau',1)+cb('l_bracket','Ngoặc ( ) [ ] không cân',1)+cb('l_quote','Ngoặc kép không cân',1)
  +cb('l_dollar','Dấu $ lẻ (LaTeX chưa đóng)',1)+cb('l_punct','Dấu câu liền nhau bất thường',1)+cb('l_lower','Đoạn bắt đầu bằng chữ thường',1)+cb('l_mid','Chữ thường sau dấu kết câu',1)+cb('l_noend','Đoạn dài không kết thúc bằng dấu câu',1)+'</details></details>'
  +'<details class="raG"><summary>🤖 AI &amp; xử lý nâng cao</summary>'
  +cb('ai','AI (Gemini) soát chính tả/dấu/gõ nhầm — chỉ gửi chữ, <b>không gửi công thức/hình</b>; có thể mất vài phút',0)
  +'<div class="raR">Model: <select id="ra_model">'+MODELS.map(m=>'<option value="'+m[0]+'">'+m[1]+'</option>').join('')+'</select> <span class="note" style="margin:0">(dùng key Gemini đã nhập ở đầu trang)</span></div>'
  +'<div class="raR">Cách áp dụng: <select id="ra_aimode"><option value="apply">Tự sửa lỗi chắc chắn, gợi ý còn lại ghi vào Comment</option><option value="comment">Chỉ ghi gợi ý vào Comment, không tự sửa</option></select></div>'
  +cb('accept','Chấp nhận toàn bộ Track Changes (không thể hoàn tác trong file xuất)',0)+cb('nocmt','Xóa toàn bộ ghi chú (Comment)',0)+'</details>'
  +'<div class="bar"><label class="note" style="margin:0"><input type="checkbox" id="ra_zip" checked> Nhiều file → nén .zip</label><label class="note" style="margin:0"><input type="checkbox" id="ra_pdf"> Xuất thêm PDF (bản xem nhanh)</label><button class="green" id="ra_run" type="button">🔍 Rà soát &amp; Xuất file hoàn thiện</button></div>'
  +'<div id="ra_st" class="status"></div><div id="ra_out"></div>';
  const tools=Array.from(t3.querySelectorAll('.wtool')),last=tools[tools.length-1];
  if(last)last.insertAdjacentElement('afterend',d);else t3.appendChild(d);
  const op=document.createElement('option');op.value='wtAudit';op.textContent='🔍 Rà soát & Chuẩn hóa Word toàn diện';sel.insertBefore(op,sel.options[1]||null);
  wire()}

const q=[];
const fsz=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(1)+' MB';
function setSt(m,k){const e=g('ra_st');e.textContent=m;e.className='status'+(k==='e'?' err':k==='o'?' ok':' info')}
function renderList(){g('ra_list').innerHTML=q.map((f,i)=>'<div class="frow"><span>📄</span><span class="fnm" title="'+hx(f.name)+'">'+hx(f.name)+'</span><span class="fsz">'+fsz(f.size)+'</span><button class="sec sm" type="button" data-i="'+i+'">✕</button></div>').join('')}
async function addFiles(list){const bad=[];
  for(const f of Array.from(list)){if(!/\.docx$/i.test(f.name)){bad.push(/\.doc$/i.test(f.name)?f.name+' (file .doc cũ — hãy mở bằng Word, Save As → .docx)':f.name+' (không phải .docx)');continue}
    if(q.some(x=>x.name===f.name&&x.size===f.size))continue;q.push({name:f.name,size:f.size,buf:await f.arrayBuffer()})}
  renderList();setSt(bad.length?'Bỏ qua: '+bad.join('; '):(q.length?'Đã chọn '+q.length+' file, sẵn sàng rà soát.':''),bad.length?'e':'')}
function readOpts(){
  const c=id=>g('ra_'+id).checked,v=id=>g('ra_'+id).value,n=id=>parseFloat(String(v(id)).replace(',','.'));
  const o={text:c('text'),indent:c('indent'),num:c('num'),font:v('font'),size:v('size'),line:+v('line'),after:+v('after'),justify:c('justify'),firstLine:c('firstLine'),shd:c('shd'),color:c('color'),
    blank:c('blank'),keep:c('keep'),page:c('page'),mt:n('mt'),mb:n('mb'),ml:n('ml'),mr:n('mr'),pgnum:c('pgnum'),fields:c('fields'),compat:c('compat'),
    tbl:c('tbl'),tblborder:c('tblborder'),imgInline:c('imgInline'),imgFix:c('imgFix'),latex:c('latex'),mathsz:c('mathsz'),ai:c('ai'),aiModel:v('model'),accept:c('accept'),nocmt:c('nocmt'),quotes:c('quotes'),phead:c('phead'),mark:c('mark'),verify:c('verify'),track:c('track'),aiMode:v('aimode'),spell:c('spell'),unify:c('unify'),decimal:c('decimal')?'comma':'',cap:c('cap'),dry:c('dry'),
    lintOff:{typo:!c('l_typo'),dup:!c('l_dup'),bracket:!c('l_bracket'),quote:!c('l_quote'),dollar:!c('l_dollar'),punct:!c('l_punct'),lower:!c('l_lower'),mid:!c('l_mid'),noend:!c('l_noend')}};
  if([o.mt,o.mb,o.ml,o.mr].some(x=>!isFinite(x)||x<0||x>100)||o.ml+o.mr>=150||o.mt+o.mb>=200)throw new Error('Lề không hợp lệ (0–100 mm; trái+phải < 150, trên+dưới < 200).');
  return o}
const MD='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function save(name,data,mime){const b=new Blob([data],{type:mime});if(typeof saveBlob==='function')return saveBlob(b,name);
  const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
async function run(){
  const out=g('ra_out'),btn=g('ra_run');out.innerHTML='';
  if(!q.length)return setSt('Chưa chọn file .docx nào.','e');
  if(typeof JSZip==='undefined')return setSt('Chưa tải được thư viện JSZip (cần mạng để tải từ cdnjs).','e');
  let o;try{o=readOpts()}catch(e){return setSt(e.message,'e')}
  btn.disabled=true;const res=[];let ok=0;
  for(let k=0;k<q.length;k++){const f=q[k],pre='('+(k+1)+'/'+q.length+') '+f.name+': ';
    const card=document.createElement('div');card.className='raRes';
    try{
      const r=await audit(f.buf,o,{progress:m=>setSt(pre+m)});
      const base=f.name.replace(/\.docx$/i,'')+'_rasoat',rt=reportText(f.name,r.rep),total=Array.from(r.rep.f.values()).reduce((a,b)=>a+b,0);
      let pdf=null;
      if(g('ra_pdf').checked){try{
        if(typeof docxToBlocks!=='function'||typeof blocksToPdfBytes!=='function')throw new Error('thiếu mô-đun xuất PDF');
        const z=await JSZip.loadAsync(r.data),dx=await z.file('word/document.xml').async('string');
        pdf=await blocksToPdfBytes(docxToBlocks(dx).blocks,(p,n)=>setSt(pre+'Đang tạo PDF, trang '+p+'/'+n+'...'));
      }catch(e){r.rep.warn('Không tạo được PDF: '+e.message+' (file Word vẫn xuất bình thường).')}}
      res.push({name:base+'.docx',data:r.data,mime:MD},{name:base+'_baocao.txt',data:new TextEncoder().encode('\ufeff'+rt),mime:'text/plain'});
      if(pdf)res.push({name:base+'.pdf',data:pdf,mime:'application/pdf'});
      ok++;
      let h='✅ <b>'+hx(f.name)+'</b> — đã sửa <b>'+total+'</b> chỗ ('+r.rep.f.size+' nhóm lỗi)';
      if(r.rep.f.size)h+='<ul>'+Array.from(r.rep.f).map(([t,n])=>'<li>'+hx(t)+': <b>'+n+'</b></li>').join('')+'</ul>';
      if(r.rep.notes.length)h+='<div class="note" style="margin:4px 0">'+r.rep.notes.slice(0,8).map(hx).join('<br>')+(r.rep.notes.length>8?'<br>… (xem đủ trong báo cáo .txt)':'')+'</div>';
      if(r.rep.lint&&r.rep.lint.length)h+='<div>📝 <b>'+r.rep.lint.length+' đoạn đã được đánh dấu Comment trong file Word</b> (chi tiết đầy đủ trong báo cáo .txt):<ul>'+r.rep.lint.slice(0,6).map(x=>'<li>Đoạn '+x.n+' “'+hx(x.snip)+'”: '+hx(x.issues.join('; '))+'</li>').join('')+(r.rep.lint.length>6?'<li>…</li>':'')+'</ul></div>';
      if(r.rep.changes&&r.rep.changes.length)h+='<div class="note" style="margin:4px 0">🧾 Báo cáo .txt có <b>nhật ký thay đổi trước → sau</b> của '+r.rep.changes.length+' đoạn để bạn đối chiếu.</div>';
      if(r.rep.w.length)h+='<div>⚠ <b>Cần kiểm tra tay:</b><ul>'+r.rep.w.map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul></div>';
      card.innerHTML=h;
      [[base+'.docx',r.data,MD,'⬇ Tải file Word đã rà soát','green sm'],].concat(pdf?[[base+'.pdf',pdf,'application/pdf','⬇ PDF (xem nhanh)','sec sm']]:[]).concat([[base+'_baocao.txt',new TextEncoder().encode('\ufeff'+rt),'text/plain','📋 Báo cáo (.txt)','sec sm']]).forEach(a=>{
        const b=document.createElement('button');b.type='button';b.className=a[4];b.textContent=a[3];b.onclick=()=>save(a[0],a[1],a[2]);card.appendChild(b);card.appendChild(document.createTextNode(' '))})
    }catch(e){card.innerHTML='❌ <b>'+hx(f.name)+'</b>: bỏ qua — '+hx(e.message)}
    out.appendChild(card);await tick()}
  if(res.length>3&&g('ra_zip').checked&&typeof makeZip==='function'){const b=document.createElement('button');b.type='button';b.className='green';b.textContent='📦 Tải gộp tất cả (.zip)';
    b.onclick=()=>save('ra-soat-word.zip',makeZip(res.map(r=>({name:r.name,data:r.data}))),'application/zip');out.appendChild(b)}
  btn.disabled=false;setSt('Xong: '+ok+'/'+q.length+' file. Hãy mở file kết quả bằng Word, bấm Ctrl+A rồi F9 nếu có mục lục/số trang cần cập nhật.',ok?'o':'e')}
function wire(){
  g('ra_pick').onclick=()=>g('ra_in').click();
  g('ra_in').onchange=e=>{const f=Array.from(e.target.files||[]);e.target.value='';if(f.length)addFiles(f)};
  g('ra_list').onclick=e=>{const b=e.target.closest('button');if(b){q.splice(+b.dataset.i,1);renderList()}};
  g('ra_clear').onclick=()=>{q.length=0;renderList();g('ra_out').innerHTML='';setSt('')};
  ['dragover','drop'].forEach(ev=>g('wtAudit').addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'&&e.dataTransfer)addFiles(e.dataTransfer.files)}));
  g('ra_preset').onclick=()=>{
    g('ra_font').value='Times New Roman';g('ra_size').value='14';g('ra_line').value='1.15';g('ra_after').value='6';
    ['justify','firstLine','page','text','indent','num','tbl','imgFix','quotes','phead','mark','verify','spell','unify'].forEach(k=>g('ra_'+k).checked=true);
    g('ra_dry').checked=false;
    g('ra_mt').value=20;g('ra_mb').value=20;g('ra_ml').value=30;g('ra_mr').value=15;
    setSt('Đã đặt: Times New Roman 14pt, giãn dòng 1,15, căn đều, thụt đầu dòng 1 cm, A4, lề 20/20/30/15 mm. Bấm “Rà soát & Xuất file” để chạy.','o')};
  g('ra_run').onclick=run}
window.RaSoatWord={audit,reportText,readOpts};
buildUI();
})();
