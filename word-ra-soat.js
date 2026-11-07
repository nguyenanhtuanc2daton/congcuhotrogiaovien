/* Công cụ Word · "Rà soát Word toàn diện"
   Đưa file .docx lên → tự rà soát & sửa lỗi bố cục/định dạng/bảng/hình/công thức → xuất .docx mới + báo cáo.
   Cần: JSZip (index.html đã nạp) · word-latex.js (convertDocumentXML) · gkey.js (tùy chọn, cho AI soát chính tả).
   Mới: cũng nhận file .xlsx → tự RÀ SOÁT & SỬA LỖI (khoảng trắng/dấu tiếng Việt, số & ngày lưu dạng chữ, công thức lỗi, cột hẹp #####, chữ bị cắt, thiếu viền, ô gộp chồng nhau, liên kết ngoài) rồi căn trang in Excel (A4, hướng, lề, vùng in, vừa trang, lặp dòng tiêu đề, số trang).
   [v15] Giáo án nhiều tiết: kiểm tra từng tiết; thêm từ điển lỗi gõ (nhóm “more” nằm trong word-chuan-hoa.js, nhận qua window.RA_SPELL_EXTRA), viết hoa đầu mục danh sách, cỡ chữ lẻ → 14 pt, báo công thức A(x) thiếu ngoặc.
   [v16] Giáo án Toán: tự sửa “trọng tại/gọi tiếp xúc/a à đường/Ổn định tổ chức/Luyện Tập/…. vì”; bỏ báo nhầm A(x), giờ, bước dùng chung ô, “song song”, nhãn a) b); thêm cảnh báo số HĐ lệch cột, nhảy số hoạt động, tên hoạt động lệch tên bài, “Chuẩn bị bài sau” sai, số HS ≠ “hai bạn”.
   [v18] Sửa lỗi bảng ma trận/đặc tả bị bóp cột (chữ, số viết dọc): gộp cột đệm 12 twips; giữ tỉ lệ cột gốc; không thu nhỏ chữ khi đã chọn cỡ cố định; khôi phục bảng trong trang khổ ngang bị ép về khổ dọc; đồng bộ kiểu Normal (Times New Roman, cỡ đã chọn); mặc định cỡ chữ 14.
   Tự chèn mục "🔍 Rà soát & Chuẩn hóa toàn diện" vào ô chọn công cụ #wtSel — không cần sửa HTML, chỉ thêm 1 thẻ <script>. */
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
const SYM=/symbol|wingdings|webdings|math|mt extra|mt symbol|mt fences|euclid|stix|fences|monotype sorts|opensymbol|mtextra/i;
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
const ptextAll=e=>all(e,'t').filter(t=>!inMath(t)).map(t=>t.textContent).join('');
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
const VERSION='v20 (v20: giữ nguyên hình có chữ chạy quanh (không đổi thành hình cùng dòng); sửa bảng ma trận bị bóp cột (chữ/số viết dọc), giữ tỉ lệ cột gốc, không tự thu nhỏ chữ khi đã chọn cỡ, mặc định Times New Roman 14; nền v19: đổi công thức MathType → Equation của Word; căn đáp án trắc nghiệm nằm trong ô bảng và giữ nguyên câu trên một trang; ghép đoạn bị ngắt giữa câu; tách gạch đầu dòng nằm giữa đoạn; tự sửa đáp số cặp số sai khi phép thay số ngay dưới đã cho biết đáp số đúng; gom tiêu đề bài bị tách nhiều đoạn, căn giữa, in đậm đồng nhất; bỏ dấu “-” thừa cuối dòng đầu trang; bảng giáo án 2 cột vừa vùng chữ và đường chia cột thẳng hàng; giữ lề của giáo án gốc); nền v18 (v18: tự sửa “ưo”→“ươ”, kiểm tra “cặp số là/không là nghiệm” bằng cách thay số, cảnh báo tổng thời lượng lệch khi >60 phút và không là bội của 45); nền v17-khbd-mau-loi-giao-an (v17: đọc ký hiệu w:sym (∈ ℝ…) cho AI, đặt ngôn ngữ tiếng Việt cho từng run, dấu trừ số âm “= - 0,5”, thiếu cách trước “+”, chữ thường đầu đoạn trong ô bảng, dấu phẩy cuối đoạn, gạch đầu dòng giữa đoạn, hết báo nhầm số thập phân do phép nhân/“Bài 1.1”; thêm: tự sửa “trọng tại”, “gọi tiếp xúc”, “a à đường”, viết hoa “Ổn định tổ chức” / “Luyện tập” / đầu câu “Vì…”; hết báo nhầm công thức A(x), thời gian có ổn định + hướng dẫn về nhà, bước 2–4 dùng chung ô bảng, “song song”, nhãn a) b) c); thêm cảnh báo: số HĐ lệch cột, tên hoạt động lệch tên bài, nhảy số hoạt động, “Chuẩn bị bài sau” khi tiết sau cùng bài, số HS ≠ “hai bạn”); nền v14-khbd-5512 (kiểm tra thời gian & cấu trúc CV 5512, tự sửa phép tính sai, mở rộng bộ giải trắc nghiệm, thống nhất dấu trừ/số thập phân, phát hiện công thức bị mất, đầu trang còn dở, thêm lỗi chính tả thuật ngữ Toán); nền v13-sua-loi-noi-dung (tự xóa dấu chấm thừa, thêm nhãn “Câu 1.” còn thiếu, điền đáp án trống, sửa kết quả giải phương trình bậc nhất hai ẩn sai, sửa câu chữ chép nhầm “hai HĐ”; có Track Changes + Comment); nền v10-bang-gon-1-trang (dàn cột bảng theo nội dung: cột chữ dài được rộng, cột số vừa đủ; bỏ thụt lề thừa và dòng trống đầu ô; ma trận/bản đặc tả gọn 1 trang khi có thể; lặp đủ các hàng tiêu đề nhiều tầng; hàng “Tổng” không bị bỏ lẻ sang trang sau; hàng cao được phép tách trang; kiểm lại nhiều vòng không còn báo thay đổi giả); nền v9-hoan-chinh (lề đề thi gọn mặc định, không thụt đầu dòng đề trắc nghiệm, căn lại nhãn a./b./c., căn trái ô bảng hẹp, sửa “đúng/ sai” và “0,25đ”, bớt báo nhầm kì/kỳ và dấu hai chấm); nền v8-phan-cap-canh-bao (mức LỖI / NGHI NGỜ / GỢI Ý có công tắc từng loại, đối chiếu điểm–đáp án–hình/bảng–tham chiếu câu, xóa thông tin cá nhân, danh sách tự kiểm; nền v7-to-mau-bien-ban: tô màu đúng cụm chữ lỗi, Comment neo đúng chỗ, biên bản .docx khổ ngang, cột Xử lý để trống; nền v6-to-truong: bớt báo nhầm, nhất quán toàn đề, neo ô bảng đáp án, bằng chứng ngắn, mã số comment; nền v5: prompt rà soát đề chuẩn hóa, schema JSON, thẩm định kép, khớp bằng chứng mềm, Comment AI tại câu, đối chiếu đáp án)';
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
  ['biễu thức','biểu thức'],['vân dụng','vận dụng'],['hình bình hàng','hình bình hành'],['dồng biến','đồng biến'],['đường trung trục','đường trung trực'],['thưc','thức'],['bâc','bậc'],['phương trinh','phương trình'],['hê phương','hệ phương'],
  /* [v14] thuật ngữ Toán (dạng sai chắc chắn; “nghiêm/hê” chỉ sửa khi đứng trong cụm Toán quen thuộc để không đụng từ “nghiêm túc”) */
  ['hê số','hệ số'],['hê thức','hệ thức'],['hê hai','hệ hai'],['hê bất','hệ bất'],['hê trục','hệ trục'],['hê tọa','hệ tọa'],['hê toạ','hệ toạ'],
  ['vô nghiêm','vô nghiệm'],['có nghiêm','có nghiệm'],['tập nghiêm','tập nghiệm'],['nghiêm của','nghiệm của'],['nghiêm duy nhất','nghiệm duy nhất'],['nghiêm nguyên','nghiệm nguyên'],['nghiêm kép','nghiệm kép'],['nghiêm chung','nghiệm chung'],['nghiêm phân biệt','nghiệm phân biệt'],['vô số nghiêm','vô số nghiệm'],['một nghiêm','một nghiệm'],['hai nghiêm','hai nghiệm'],['là nghiêm','là nghiệm'],
  ['đồ thi','đồ thị'],['hàm sô','hàm số'],['cặp sô','cặp số'],['ẩn sô','ẩn số'],['tọa đô','tọa độ'],['toạ đô','toạ độ'],['giá tri','giá trị'],['biêu đồ','biểu đồ'],['biêu thức','biểu thức'],['biễu đồ','biểu đồ'],
  /* [v15] lỗi gõ nhầm sang âm tiết HỢP LỆ (bộ kiểm tra âm tiết không bắt được) — gặp trong giáo án/đề Toán; có thể bổ sung thêm qua window.RA_SPELL_EXTRA (khai báo ở word-chuan-hoa.js, nạp trước file này) */
  ['bất phường','bất phương'],['phường trình','phương trình'],['như cầu','nhu cầu'],['trả lới','trả lời'],['hoạt đông','hoạt động'],['dự dịnh','dự định'],['theo cá thể','theo cá nhân'],['chứng một','chứng minh một'],
  /* [v16] lỗi gặp trong giáo án Toán 9 (đã đối chiếu thực tế): “trọng tải”, thiếu “là” trong định nghĩa, thiếu “thùng” */
  ['trọng tại','trọng tải'],['gọi tiếp xúc','gọi là tiếp xúc'],['là số sữa','là số thùng sữa']].concat(Array.isArray(window.RA_SPELL_EXTRA)?window.RA_SPELL_EXTRA.filter(x=>Array.isArray(x)&&x.length===2&&x[0]&&x[1]):[]);
const SPELL_RE=SPELL.map(([w,r])=>[new RegExp('(?<![\\p{L}])'+w+'(?![\\p{L}])','giu'),r]);
function paraRules(S,o){
  const E=[],add=(s,e,r,k)=>E.push({s,e,r:r||'',k});
  if(!/[^\s\u0001\u0002]/.test(S))return E;
  let m;
  for(m of S.matchAll(/ {2,}/g))add(m.index+1,m.index+m[0].length,'','sp');
  if((m=/^ +/.exec(S)))add(0,m[0].length,'','sp');
  if((m=/ +$/.exec(S)))add(m.index,S.length,'','sp');
  /* khoảng trắng TRƯỚC dấu đóng/dấu câu */
  for(m of S.matchAll(/(?<=[^\s\u0001(\[{“‘]) +(?=[,;!?)\]}%”])/g))if(!urlish(S,m.index+m[0].length)&&!(S[m.index+m[0].length]==='%'&&!/[\d)]/.test(S[m.index-1]||'')))add(m.index,m.index+m[0].length,'','pu');   /* [v11] giữ dấu cách trong “Tỷ lệ %”: chỉ gộp “50 %” → “50%” khi % liền sau số */
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
  /* [v17] “4.2+ 3.(–1)”, “ax+ by = c”: sau dấu + đã có cách nhưng trước + thì dính liền → thêm một dấu cách (chữ thường/số/ngoặc đứng trước; không đụng “A+”, “C++”) */
  for(m of S.matchAll(/(?<=[\p{Ll}\p{N})\]])\+(?= [\p{L}\p{N}(\u2013\u2212-])/gu))if(!urlish(S,m.index)&&S[m.index-1]!=='+')add(m.index,m.index,' ','pu');
  /* dấu gạch chéo giữa hai chữ: “đúng/ sai” → “đúng/sai”; số liền đơn vị điểm: “0,25đ” → “0,25 đ” */
  for(m of S.matchAll(/(?<=\p{L}\/) +(?=\p{L})/gu))add(m.index,m.index+m[0].length,'','pu');
  for(m of S.matchAll(/(?<=\p{L}) +(?=\/\p{L})/gu))add(m.index,m.index+m[0].length,'','pu');
  for(m of S.matchAll(/(?<=\d)(?=đ(?!\p{L}))/gu))add(m.index,m.index,' ','pu');
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
  /* [v18] lỗi gõ Telex “ưo” → “ươ” (phưong, thưong, đưoc, nưoc…): tiếng Việt không có vần “ưo”, nên sửa chắc chắn */
  if(o.spell!==false)for(m of S.matchAll(/(?<=\p{L})ư(o)(?=(?:ng|nh|ch|c|i|m|n|p|t|u)?(?![\p{L}]))/giu))add(m.index+1,m.index+2,m[1]==='O'?'Ơ':'ơ','cw');
  /* [v6] lỗi gõ "cáng … càng …" (vd "cáng sớm càng tốt" → "càng sớm càng tốt") */
  if(o.spell!==false)for(m of S.matchAll(/(?<![\p{L}\p{N}])([Cc])áng(?= \p{L}+ càng(?![\p{L}\p{N}]))/gu))add(m.index+1,m.index+2,'à','cw');
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
  /* [v6] ngoặc kép lẫn kiểu: “abc" hoặc "abc” (đúng 1 cặp) → chuẩn hóa thành “ ” */
  if(o.quotes!==false){const qa=[],qb=[],qs2=[];for(let i=0;i<S.length;i++){const ch=S[i];if(ch==='“')qa.push(i);else if(ch==='”')qb.push(i);else if(ch==='"')qs2.push(i)}
    if(qa.length===1&&!qb.length&&qs2.length===1&&qs2[0]>qa[0])add(qs2[0],qs2[0]+1,'”','qt');
    else if(qb.length===1&&!qa.length&&qs2.length===1&&qs2[0]<qb[0])add(qs2[0],qs2[0]+1,'“','qt')}
  /* [v12] dán liền / sai nhãn thường gặp trong giáo án */
  if((m=/^[\s\u0001\u0002]*(?:I{1,3}|IV|VI{0,3}|IX|X)\.(?=\p{L}{2})/u.exec(S)))add(m.index+m[0].length,m.index+m[0].length,' ','pu');   /* “I.Mục tiêu” → “I. Mục tiêu” */
  if((m=/^[\s\u0001\u0002]*[-+–](?=\p{L}{2})/u.exec(S)))add(m.index+m[0].length,m.index+m[0].length,' ','pu');                            /* “-Rèn”, “+Mục tiêu” → có dấu cách sau gạch đầu dòng */
  for(m of S.matchAll(/(?<![\p{L}])(?:Ví dụ|Bài tập|Bài|Câu)(?=\d)/gu))add(m.index+m[0].length,m.index+m[0].length,' ','pu');                /* “Ví dụ2” → “Ví dụ 2” */
  for(m of S.matchAll(/(?<=(?:Câu|Bài) \d{1,3}\.)(?=[A-D](?![\p{L}\p{N}]))/gu))add(m.index,m.index,' ','pu');                             /* “Câu 2.B” → “Câu 2. B” */
  for(m of S.matchAll(/\(\s*(\d{1,3})\s*\.?\s*(?:phút|phut|ph)\s*\)/giu)){const c='('+m[1]+' phút)';if(m[0]!==c)add(m.index,m.index+m[0].length,c,'cw')}   /* “(10.phut)”, “(25 ph)”, “(3ph)” → “(n phút)” */
  for(m of S.matchAll(/(?<=[\p{L}:.])(?=\(\s*\d{1,3}\s*\.?\s*(?:phút|phut|ph|tiết)\s*\))/giu))add(m.index,m.index,' ','pu');                  /* “ẨN(2 tiết)”, “định:(1 phút)” → thêm dấu cách trước “(” */
  if((m=/\(nếu có(?=[\s\u0001\u0002]*$)/.exec(S)))add(m.index+m[0].length,m.index+m[0].length,')','pu');                                      /* “(nếu có” thiếu “)” ở cuối đoạn */
  if(o.quotes!==false){const qa1=[...S.matchAll(/“/g)],qb1=S.match(/”/g);
    if(qa1.length===1&&!qb1){const mm=/(’’|'')/.exec(S.slice(qa1[0].index+1));if(mm){const st=qa1[0].index+1+mm.index;add(st,st+2,'”','qt')}}}   /* “abc’’ → “abc” */
  /* [v13] dấu chấm thừa: “. Phương trình…” đầu đoạn; “B. .x – 2y” trong phương án */
  if(o.fixdot!==false){
    if((m=/^([ \u0001]*)\.(?=[ \u0001]*\p{Lu})/u.exec(S)))add(m[1].length,m[1].length+1,'','sd');   /* chỉ xóa dấu “.”; dấu cách đứng đầu đoạn do bước dọn khoảng trắng gỡ tiếp */
    for(m of S.matchAll(/(?<=(?:^|[ \u0001])[A-D]\. )\.(?=[\p{L}\u0001])/gu))add(m.index,m.index+1,'','sd')}
  /* [v16] lỗi gặp trong KHBD Toán (tự sửa, chỉ các dạng chắc chắn) */
  if(o.spell!==false){
    /* “- ổn định tổ chức (3 phút)” → viết hoa “Ổn định…” ở đầu mục */
    if((m=/^([\s\u0001\u0002]*(?:[-–+•*]\s*)?)ổn định (?=tổ chức|lớp)/u.exec(S)))add(m[1].length,m[1].length+1,'Ổ','cp');
    /* “Hoạt động 4. Luyện Tập” → “Luyện tập” (các tên hoạt động khác trong file đều viết thường chữ sau) */
    for(m of S.matchAll(/((?:Hoạt động|Hoạt Động) ?\d+ ?[.:] ?(?:Luyện|Vận|Khởi) )(Tập|Dụng|Động)(?![\p{L}])/gu)){const k=m.index+m[1].length;add(k,k+1,S[k].toLowerCase(),'cw')}
    /* “đường thẳng a à đường tròn” → “a và đường tròn” */
    for(m of S.matchAll(/(?<![\p{L}\p{N}])([A-Za-z]) à (?=đường)/gu))add(m.index+2,m.index+3,'và','cw');
    /* “R=3cm. vì d>R nên…” → viết hoa chữ đầu câu khi câu sau mở bằng từ nối quen thuộc */
    for(m of S.matchAll(/(\S{2,})\. +(vì|nên|do đó|suy ra|khi đó|vậy|ta có)(?![\p{L}])/gu)){
      const w=m[1].toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
      if(ABBR.has(w)||/^\d+$/.test(m[1])||urlish(S,m.index))continue;
      const k=m.index+m[0].length-m[2].length;add(k,k+1,S[k].toUpperCase(),'cp')}
  }
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
const ONSETS=['ngh','ng','nh','ch','gh','gi','kh','ph','th','tr','qu','q','b','c','d','đ','g','h','k','l','m','n','p','r','s','t','v','x',''];
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
    case 'ng':return !f;case 'gi':return !/^i/.test(n);case 'qu':return !/^[uo]/.test(n);case 'q':return /^u/.test(n);default:return true}}
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
/* [v6] ngoại lệ cho luật "lặp từ": từ láy / ranh giới từ ghép hợp lệ trong tiếng Việt (vd "sử dụng dụng cụ", "nhà nhà", "ngày ngày") */
const DUP_OK=new Set('dụng nhà người ngày năm đời dần từ đều mãi hàng từng xa lâu khắp muôn tưng rưng song'.split(' '));
/* [v6] đoạn KHÔNG cần dấu chấm cuối: dòng điểm/thời gian/tiêu đề; câu dẫn trắc nghiệm có luật riêng (lintStruct) */
const NOEND_SKIP=t=>{const s=t.replace(/[\u0001\u0002]/g,' ').trim();
  if(/^[-–+]?\s*Đáp án\b/i.test(s)&&s.length<80)return true;   /* [v15] nhãn “Đáp án …” không phải câu */
  if(/\d\s*(đ|điểm|phút|trang|giờ|%)\s*$/i.test(s))return true;
  if(/^(Mỗi|Thời gian|Tiết|Ngày|Năm học|Họ và tên|Lớp|Điểm|Lưu ý)\b/i.test(s))return true;
  if(/\(\s*\d+\s*(phút|ph|tiết)\s*\)\s*$/i.test(s))return true;
  {const LL=s.replace(/[^\p{L}]/gu,'');if(LL.length>=6&&LL===LL.toUpperCase())return true}
  if(/[,:;]\s*$/.test(s))return true;
  if(/^(?:I{1,3}|IV|VI{0,3}|IX|X)\.\s/.test(s)&&s.length<90)return true;
  if(/(?:\p{Lu}{2,}\s+){2,}\p{Lu}{2,}\s*$/u.test(s))return true;
  if(/^(Câu|CÂU)\s*\d+\s*[.:]/.test(s)&&!/\(\s*\d+(?:[.,]\d+)?\s*(?:điểm|đ)\s*\)/i.test(s))return true;
  return false};

/* [v7] Khoảng chữ lỗi: chuẩn hóa (sắp xếp, gộp, bỏ khoảng chỉ có khoảng trắng/ký hiệu ẩn) và cắt ngữ cảnh có dấu 【…】 */
const sR=(s,str)=>{const i=s.indexOf(str);return i<0||!str?null:[{s:i,e:i+str.length}]};
function normRg(rg,S){
  const L=S.length,a=(rg||[]).map(r=>({s:Math.max(0,r.s),e:Math.min(L,r.e),c:r.c})).filter(r=>r.e>r.s&&/[^\s\u0001\u0002]/.test(S.slice(r.s,r.e))).sort((x,y)=>x.s-y.s),o=[];
  a.forEach(r=>{const l=o[o.length-1];if(l&&r.s<=l.e){l.e=Math.max(l.e,r.e);if(r.c==='red')l.c='red'}else o.push(Object.assign({},r))});
  return o.slice(0,8)}
function mkCtx(S,rg){
  const flat=x=>x.replace(/[\u0001\u0002]/g,'…').replace(/\s+/g,' ');
  if(!rg.length)return flat(S.trim()).slice(0,70);
  const use=rg.filter(r=>r.e-rg[0].s<=160).slice(0,3),a=Math.max(0,use[0].s-28),b=Math.min(S.length,use[use.length-1].e+28);
  let o='',pos=a;use.forEach(r=>{o+=S.slice(pos,r.s)+'【'+S.slice(r.s,r.e)+'】';pos=r.e});o+=S.slice(pos,b);
  return (a>0?'…':'')+flat(o).trim()+(b<S.length?'…':'')}
function lintPara(S,c){
  const out=[],txt=S.normalize('NFC'),off=c.off||{};let m;
  const rg=(c.rg&&txt.length===S.length)?c.rg:null,R=(s,e)=>{if(rg&&e>s)rg.push({s,e})};
  let mk=rg?rg.length:0;const P=msg=>{out.push(msg);if(rg){for(let i=mk;i<rg.length;i++)rg[i].m=msg;mk=rg.length}};
  if(!off.typo){
    const bad=[],tok=/[\p{L}\p{M}]+/gu;
    while((m=tok.exec(txt))){
      const w=m[0],lo=w.toLowerCase(),i=m.index,pv=txt[i-1]||'',nx=txt[i+w.length]||'';
      if(w.length<2||/[\d_]/.test(pv)||/[\d_]/.test(nx))continue;
      if((/^dd[aeiouy]/.test(lo)||/uow|[a-z]{2}j$/.test(lo))&&lo.length>=3&&/^[a-z]+$/.test(lo)){bad.push(w);R(i,i+w.length);continue}
      if(!VNCH.test(lo)||LOAN.has(lo))continue;
      if(w===w.toUpperCase()&&![...lo].some(ch=>VM[ch]&&VM[ch].t))continue;
      let ok=true;for(const ch of lo)if(!(ch>='a'&&ch<='z')&&ch!=='đ'&&!VM[ch]){ok=false;break}
      if(!ok)continue;
      if(!viWord(lo)){bad.push(w);R(i,i+w.length)}}
    if(bad.length){const u=Array.from(new Set(bad)).slice(0,6);P('nghi gõ sai/thiếu dấu: '+u.map(x=>'“'+x+'”').join(', ')+(bad.length>u.length?'…':''))}}
  if(!off.dup){
    const dup=[];for(m of txt.matchAll(/(?<![\p{L}\p{N}])(\p{L}{2,}) \1(?![\p{L}\p{N}])/giu))if(!DUP_OK.has(m[1].toLowerCase())){dup.push(m[1]);R(m.index,m.index+m[0].length)}
    if(dup.length)P('lặp từ: '+Array.from(new Set(dup)).slice(0,4).map(x=>'“'+x+' '+x+'”').join(', '))}
  if(!off.bracket&&!/[\u0001\u0002]/.test(txt)){   /* đoạn có công thức: ngoặc có thể nằm bên trong MathType/Equation nên không kết luận */
    const t2=txt.replace(/^\s*[+\-–•*]\s*\)?\s*/,'').replace(/^\s*\(?[\p{L}\d]{1,3}[.)]\s*/u,'').replace(/(?<=^|\s)[a-dđ]\)(?=\s)/gu,'');   /* [v16] bỏ nhãn a) b) c) giữa dòng */
    const op=(t2.match(/[(\[{]/g)||[]).length,cl=(t2.match(/[)\]}]/g)||[]).length;
    if(op!==cl)P('ngoặc không cân ('+op+' mở / '+cl+' đóng)')}
  if(!off.quote){
    const q1=(txt.match(/“/g)||[]).length,q2=(txt.match(/”/g)||[]).length,qs=(txt.match(/"/g)||[]).length;
    if(q1!==q2||qs%2)P((qs>0&&q1+q2>0)?'dùng lẫn ngoặc kép cong (“ ”) và thẳng (") trong cùng một cụm — nên thống nhất dùng “ ”':'ngoặc kép không cân')}
  if(!off.dollar&&((txt.match(/\$/g)||[]).length)%2)P('dấu $ lẻ (công thức LaTeX chưa đóng)');
  /* [v14] công thức/hình bị mất: chỉ còn khoảng trắng giữa các chữ nối (không còn ảnh \u0001 hoặc Equation \u0002) */
  if(!off.fmiss){const fm=[];
    for(m of txt.matchAll(/\(\s*(?:hoặc|và)\s*\)/giu))fm.push(m);
    for(m of txt.matchAll(/(?<![\p{L}\p{N}])(?:tại|với)\s+(?:và|hoặc)(?![\p{L}\p{N}])/giu))fm.push(m);
    for(m of txt.matchAll(/(?<![\p{L}\p{N}])(?:tại|với)\s*[….]{1,}\s*(?:và|hoặc)\s*[….]+/giu))fm.push(m);
    if(fm.length){fm.forEach(z=>R(z.index,z.index+z[0].length));P('có vẻ mất công thức/hình: '+Array.from(new Set(fm.map(z=>'“'+z[0].replace(/\s+/g,' ')+'”'))).slice(0,3).join(', ')+' — chỗ này đang trống (không còn ảnh hoặc Equation tương ứng)')}}
  if(!off.punct){const pz=txt.replace(/\.\.\./g,'…\u0000\u0000'),p1=/[,;] ?[.,;]/.exec(pz),p2=/(?<!v\.v)\. ?[,;]/.exec(txt),pm=p1||p2;
    if(pm){R(pm.index,pm.index+pm[0].length);P('dấu câu liền nhau bất thường (vd “,.” “.,” “, ,”)')}}
  const t0=txt.trim(),f0=t0.replace(/^[^\p{L}\p{N}]+/u,'');
  if(!off.lower&&(!c.tc||c.cellPrev!==undefined)&&!c.list&&!c.head&&t0.length>=25&&/^\p{Ll}/u.test(f0)&&!/^\p{Ll}\s*[.)]/u.test(f0)&&!/^\p{Ll}(?![\p{L}\p{M}])/u.test(f0)&&/[.?!:]$/.test((c.tc?c.cellPrev:c.prevEnd)||''))R(txt.length-txt.trimStart().length+(t0.length-f0.length),txt.length-txt.trimStart().length+(t0.length-f0.length)+1),P('đoạn bắt đầu bằng chữ thường');
  if(!off.mid){
    const mid=[];for(m of txt.matchAll(/(\p{L}{2,})([.?!]) +(\p{Ll})/gu))if(!ABBR.has(m[1].toLowerCase())&&!urlish(txt,m.index)){mid.push(m[1]+m[2]+' '+m[3]);R(m.index,m.index+m[0].length)}
    if(mid.length)P('chữ thường sau dấu kết câu: '+mid.slice(0,2).map(x=>'“…'+x+'…”').join(', '))}
  if(!off.noend&&!c.tc&&!c.list&&!c.head&&!c.pseudo&&!c.inKey&&!NOEND_SKIP(t0)){
    /* câu tự luận có vẻ thiếu dấu chấm: chỉ GỢI Ý bằng Comment, không tự sửa */
    const t1=t0.replace(/[\u0001\u0002]+$/,''),sc=/\s*\(\s*\d+(?:[.,]\d+)?\s*(?:điểm|đ)\s*\)\s*$/iu.exec(t1),
      core=(sc?t1.slice(0,sc.index):t1).replace(/\s+$/,''),bd=core.replace(/^[^\p{L}\p{N}]+/u,''),
      words=bd.split(/\s+/).filter(w=>/[\p{L}\p{N}]/u.test(w)).length;
    if(core&&words>=5&&/[\p{L}\p{N})\]"”%]$/u.test(core)&&!/(\.{2,}|…)\s*$/.test(core)&&/\p{Ll}/u.test(core)
      &&!/^[\s\u0001]*[A-D][.)]/.test(core)&&!/^(Hình|Bảng|Sơ đồ|Biểu đồ|Nguồn|Ghi chú)\b/u.test(bd))
      R(txt.length-txt.trimStart().length+core.search(/\S+$/),txt.length-txt.trimStart().length+core.length),P('câu chưa có dấu chấm kết câu — gợi ý thêm “.” '+(sc?'trước '+sc[0].trim():'sau “…'+core.slice(-24).replace(/[\u0001\u0002]/g,'…')+'”'))}
  if(!off.noend&&!c.tc&&!c.inKey){
    const bd2=t0.replace(/[\u0001\u0002]+/g,' ').replace(/^\s*(Câu|CÂU|Bài|BÀI)\s*\d+\s*(\(\s*\d+(?:[.,]\d+)?\s*(?:điểm|đ)\s*\))?\s*[.:]?\s*/,'').trim();
    if(/\?$/.test(bd2)&&/^(Hãy|Em hãy|Nêu|Trình bày|Phân tích|Giải thích|Kể tên|Cho biết|So sánh|Mô tả|Liệt kê|Tính|Chứng minh|Vẽ)\b/i.test(bd2))
      R(txt.lastIndexOf('?'),txt.lastIndexOf('?')+1),P('câu lệnh (“'+bd2.slice(0,28)+'…”) kết thúc bằng “?” — câu yêu cầu nên kết thúc bằng dấu chấm “.” và thống nhất giữa các đề')}
  return out}
/* Gợi ý về cấu trúc / ngữ nghĩa mà công cụ KHÔNG tự sửa được: chỉ gắn Comment để người dùng quyết định */
function lintStruct(body,o,add){
  const off=o.lintOff||{};if(off.struct)return;
  const ps=all(body,'p').filter(p=>!anc(p,'txbxContent')&&!anc(p,'tc')),S=ps.map(p=>pModel(p).S);
  const QRE=/^[\s\u0001]*(?:Câu|CÂU)\s*(\d+)\b/,clean=x=>x.replace(/[\u0001\u0002]/g,' ').replace(/\s+/g,' ').trim();
  const RESET=/^(PHẦN|Phần|ĐỀ|Đề|MÃ ĐỀ)\b|^([A-C]\.|[IVX]+\.)?\s*(Trắc nghiệm|TRẮC NGHIỆM|Tự luận|TỰ LUẬN)\b/;
  const isQ=i=>QRE.test(S[i]),isReset=i=>RESET.test(clean(S[i]));
  const lblR=s=>{const m=QRE.exec(s);if(!m)return null;const l=m[0].length-m[0].replace(/^[\s\u0001]+/,'').length;return[{s:l,e:m[0].length}]};
  /* 1. số thứ tự "Câu n" */
  let prev=0;
  ps.forEach((p,i)=>{
    if(isReset(i))prev=0;
    const m=QRE.exec(S[i]);if(!m)return;
    const n=+m[1];
    if(prev&&n===prev)add(p,'số câu bị trùng: có hai “Câu '+n+'” liên tiếp',lblR(S[i]));
    else if(prev&&n>prev+1)add(p,'số câu nhảy: sau “Câu '+prev+'” là “Câu '+n+'” (có thể thiếu hoặc đánh sai số)',lblR(S[i]));
    else if(prev&&n<prev&&n!==1)add(p,'số câu bị lùi: sau “Câu '+prev+'” là “Câu '+n+'”',lblR(S[i]));
    prev=n});
  /* 2. đáp án A-B-C-D của từng câu: thiếu, sai thứ tự, trùng nội dung */
  ps.forEach((p,i)=>{
    if(!isQ(i))return;
    let e=i+1;while(e<ps.length&&!isQ(e)&&!isReset(e))e++;
    const Q=S.slice(i,e).join('\n'),re=/(^|\n|[\u0001\u0002]|  )[ \t]*([A-D])[.)](?=\s|[\u0001\u0002]|$)/g,labs=[];let m;
    while((m=re.exec(Q)))labs.push({L:m[2],s:m.index+m[0].length-0,st:m.index});
    const a0=labs.findIndex(x=>x.L==='A'||x.L==='B');if(a0<0)return;
    const lb=labs.slice(a0),seq=lb.map(x=>x.L).join('');
    if(seq.length>=2&&seq.length<=6&&seq!=='ABCD'){
      const have=Array.from(new Set(lb.map(x=>x.L)));
      const miss=['A','B','C','D'].filter(x=>have.indexOf(x)<0);
      add(p,'đáp án ghi là '+lb.map(x=>x.L).join(', ')+(miss.length?' — thiếu '+miss.join(', ')+'?':' — nhãn bị lặp hoặc sai thứ tự'))}
    else if(seq==='ABCD'){
      const tx=lb.map((x,k)=>clean(Q.slice(x.s,k+1<lb.length?lb[k+1].st:Q.length)).replace(/[.;,\s]+$/,'').toLowerCase());
      for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)if(tx[a].length>=1&&tx[a]===tx[b])add(p,'đáp án '+lb[a].L+' và '+lb[b].L+' có nội dung giống hệt nhau (“'+tx[a].slice(0,30)+'”)')}});
  /* 3. tiêu đề phần ghi số câu / điểm: đối chiếu với số câu đếm được */
  ps.forEach((p,i)=>{
    const t=clean(S[i]),mN=/\(\s*(\d+)\s*câu\b/i.exec(t);if(!mN)return;
    const N=+mN[1],mY=/mỗi\s+câu\s*(\d+(?:[.,]\d+)?)\s*điểm/i.exec(t),mX=/\(\s*(\d+(?:[.,]\d+)?)\s*điểm\s*\)/i.exec(t),num=x=>parseFloat(String(x).replace(',','.'));
    if(mY&&mX&&Math.abs(N*num(mY[1])-num(mX[1]))>0.01)add(p,'điểm không khớp: '+N+' câu × '+mY[1]+' = '+String(+(N*num(mY[1])).toFixed(2)).replace('.',',')+' điểm, nhưng tiêu đề ghi ('+mX[1]+' điểm)',sR(S[i],mX[0]));
    let c=0;for(let k=i+1;k<ps.length;k++){if(isReset(k)&&c>0)break;if(isQ(k)){const n=+QRE.exec(S[k])[1];if(n===1&&c>0)break;c++}}
    if(c>0&&c!==N)add(p,'tiêu đề ghi '+N+' câu nhưng đếm được '+c+' câu “Câu n” ngay sau đó (đếm tự động — hãy kiểm tra lại)',sR(S[i],mN[0]))});
  /* 4. các lỗi theo từng đoạn */
  const kids=Array.from(body.children),vis=el=>!!el&&(el.localName==='tbl'||all(el,'drawing').length||all(el,'pict').length||all(el,'object').length||all(el,'tbl').length);
  const REF=/(?:\b(?:hình|bảng|sơ đồ|biểu đồ|đồ thị|bản vẽ)\s+(?:sau đây|sau|dưới đây|bên dưới|bên cạnh|bên|ở trên)\b|\bnhư\s+(?:hình|bảng)\s+(?:vẽ|bên|sau|dưới|trên|\d)|\b(?:quan sát|xem|đọc|dựa vào)\s+(?:hình vẽ|bảng số liệu|bảng|sơ đồ|biểu đồ|đồ thị|bản vẽ)\s+(?:sau|dưới|bên|trên))/iu;
  ps.forEach((p,i)=>{
    const t=S[i],tt=clean(t);if(!/\p{L}/u.test(tt))return;
    if(REF.test(tt)){
      const k=kids.indexOf(p);
      if(k>=0&&!vis(p)){let ok=false;for(let d=-2;d<=3&&!ok;d++)ok=vis(kids[k+d]);
        if(!ok)add(p,'có nhắc “'+(REF.exec(tt)[0])+'” nhưng không thấy hình/bảng ở các đoạn gần đó — thiếu hình?',sR(t,REF.exec(tt)[0]))}}
    const lx=/\\(?:frac|sqrt|times|cdot|alpha|beta|gamma|theta|leq?|geq?|neq|pi|sum|int|left|right|Delta|vec|overline|text)\b/.exec(tt);
    if(lx)add(p,'còn mã LaTeX chưa chuyển thành công thức (“'+lx[0]+'”) — hãy bật chuyển LaTeX hoặc nhập lại bằng Equation',sR(t,lx[0]));
    else if(!/\$/.test(tt)){
      const pm=[];for(const q of tt.matchAll(/(?<![\p{L}\p{N}_^])[\p{L}\d)]\^\{?[\p{L}\d+\-]+\}?|\bsqrt\s*\(|[^\s<>=]\s?(?:<=|>=|!=)\s?[^\s<>=]/gu))pm.push(q[0].trim());
      if(pm.length)add(p,'có ký hiệu toán gõ dạng chữ ('+Array.from(new Set(pm)).slice(0,3).map(x=>'“'+x+'”').join(', ')+') — nên dùng Equation hoặc ký tự toán (², ≤, ≥, ≠)',Array.from(new Set(pm)).slice(0,3).reduce((a,x)=>a.concat(sR(t,x)||[]),[]))}
    const ph=/\bx{3,}\b|\?{3,}|\blorem ipsum\b|\bTODO\b|\[\s*(?:điền|nhập|chèn)[^\]]*\]/i.exec(tt);
    if(ph)add(p,'còn nội dung giữ chỗ chưa điền (“'+ph[0]+'”)',sR(t,ph[0]));
    const mm=/[.?!:;)\u0001]\s*(Câu|CÂU)\s*(\d+)\s*[.:]/.exec(t);
    if(mm&&mm.index>0)add(p,'“Câu '+mm[2]+'” nằm giữa một đoạn — nên tách thành đoạn riêng',sR(t,mm[0].replace(/^[.?!:;)\u0001]\s*/,'')))})}

/* [v6] Nhất quán toàn đề: kì/kỳ, kĩ/kỹ, "(x điểm)"/"(x đ)", dấu ":" sau tiêu đề phần, đánh số dạng câu; câu dẫn trắc nghiệm */
function lintConsist(body,o,add,rep){
  const off=o.lintOff||{};if(off.struct)return;
  const ps=all(body,'p').filter(p=>!anc(p,'txbxContent')),G={};
  const reg=(g,form,p)=>{(G[g]=G[g]||{})[form]=(G[g][form]||[]).concat([p])};
  const fR=(p,f)=>{if(f==='có “:”'){const i=pModel(p).S.lastIndexOf(':');return i<0?null:[{s:i,e:i+1}]}if(/^“\(.+\)”$/.test(f)){const S1=pModel(p).S,mu=new RegExp('\\(\\s*[\\d.,]+\\s*(?:'+f.slice(2,-2)+')\\s*\\)').exec(S1);return mu?[{s:mu.index,e:mu.index+mu[0].length}]:null}if(!/^k[ìỳĩỹ]$/.test(f))return null;const S0=pModel(p).S,S=S0.normalize('NFC'),out=[];if(S.length!==S0.length)return null;for(const m of S.matchAll(new RegExp('(?<!\\p{L})'+f+'(?!\\p{L})','giu')))out.push({s:m.index,e:m.index+f.length});return out};
  ps.forEach(p=>{const S=pModel(p).S.normalize('NFC'),tl=S.toLowerCase(),cl=S.replace(/[\u0001\u0002]/g,' ').replace(/\s+/g,' ').trim();
    for(const [g,res] of [['kì/kỳ',[['kì',/(?<!\p{L})[kK]ì(?!\p{L})/gu],['kỳ',/(?<!\p{L})[kK]ỳ(?!\p{L})/gu]]],['kĩ/kỹ',[['kĩ',/(?<!\p{L})[kK]ĩ(?!\p{L})/gu],['kỹ',/(?<!\p{L})[kK]ỹ(?!\p{L})/gu]]]])
      for(const [f,re] of res)if(re.test(S))reg(g,f,p);   /* so khớp trên chữ gốc: tiêu đề IN HOA (KỲ) không bị tính là lệch quy ước */
    const mp=/^(?:Câu|CÂU|Bài|BÀI)\s*\d+\s*\(\s*[\d.,]+\s*(điểm|đ)\s*\)/.exec(cl);if(mp)reg('đơn vị điểm của câu','“('+mp[1]+')”',p);
    const mh=/^Phần\s+[IVX]+\s*[:.]\s*(?:TRẮC NGHIỆM|TỰ LUẬN)[^()]*\(\s*[\d.,]+\s*điểm\s*\)\s*(:?)\s*$/i.exec(cl);if(mh)reg('dấu ":" cuối tiêu đề Phần',mh[1]?'có “:”':'không có “:”',p)});
  const GOFF={'kì/kỳ':'c_ky','kĩ/kỹ':'c_ki','đơn vị điểm của câu':'c_unit','dấu ":" cuối tiêu đề Phần':'c_colon'},cv=o.conv||{},
    PREF={'dấu ":" cuối tiêu đề Phần':{has:'có “:”',none:'không có “:”'}[cv.colon],'đơn vị điểm của câu':{diem:'“(điểm)”',d:'“(đ)”'}[cv.unit]};
  Object.keys(G).forEach(g=>{if(off[GOFF[g]])return;const forms=Object.keys(G[g]),want=PREF[g];
    if(want){forms.filter(f=>f!==want).forEach(f=>G[g][f].forEach(p=>add(p,'không thống nhất “'+g+'”: chỗ này dùng '+f+' trong khi quy ước đã chọn là '+want,fR(p,f))));return}
    if(forms.length<2)return;
    const sorted=forms.sort((a,b)=>G[g][b].length-G[g][a].length),maj=sorted[0];
    if(G[g][sorted[1]].length===G[g][maj].length){const msg='Không thống nhất “'+g+'”: '+sorted.map(f=>f+' '+G[g][f].length+' chỗ').join(' / ');rep.warn(msg+' — hãy chọn một cách dùng.');if(g==='dấu ":" cuối tiêu đề Phần'||g==='đơn vị điểm của câu')return;sorted.forEach(f=>add(G[g][f][0],msg+' (đây là chỗ đầu tiên dùng '+f+') — hãy chọn một cách dùng cho cả tài liệu',fR(G[g][f][0],f)));return}
    sorted.slice(1).forEach(f=>G[g][f].forEach(p=>add(p,'không thống nhất “'+g+'”: chỗ này dùng '+f+' trong khi toàn tài liệu chủ yếu dùng '+maj+' ('+G[g][maj].length+' chỗ)',fR(p,f))))});
  /* câu dẫn trắc nghiệm thiếu dấu kết thúc */
  const S2=ps.map(p=>pModel(p).S),isQ=i=>/^[\s\u0001]*(?:Câu|CÂU)\s*\d+\s*[.:]/.test(S2[i]),isOpt=i=>/^[\s\u0001]*[A-D][.)]\s/.test(S2[i]);
  ps.forEach((p,i)=>{if(!isQ(i)||anc(p,'tc'))return;const t=S2[i].replace(/[\u0001\u0002]/g,' ').trim();
    if(/\(\s*[\d.,]+\s*(điểm|đ)\s*\)/.test(t))return;
    let hasOpt=false;for(let k=i;k<Math.min(ps.length,i+4)&&!(k>i&&isQ(k));k++)if(isOpt(k)||/(^|\s)A[.)]\s.*\sB[.)]\s/.test(S2[k]))hasOpt=true;
    if(!hasOpt||/[?:.!…]$/.test(t))return;
    const q=/\b(nào|gì|sao|đâu|bao nhiêu|không)\s*$/i.test(t)||/\b(nào|gì|sao|đâu|bao nhiêu)\b/i.test(t);
    {const S0=S2[i],e0=S0.replace(/[\s\u0001\u0002]+$/,'').length,s0=S0.slice(0,e0).search(/\S+$/);add(p,'câu dẫn chưa có dấu kết thúc — nên thêm “'+(q?'?':':')+'” ('+(q?'câu hỏi':'câu bỏ lửng, phương án điền tiếp')+')',s0>=0?[{s:s0,e:e0}]:null)}})}
/* [v8] Mức độ cảnh báo: 1 = LỖI (chắc chắn sai) · 2 = NGHI NGỜ (cần người xem) · 3 = GỢI Ý (không bắt buộc). Tô màu: đỏ · vàng · lục lam */
const SEV_NAME={1:'LỖI',2:'NGHI NGỜ',3:'GỢI Ý'},SEV_HL={1:'red',2:'yellow',3:'cyan'};
const SEV_RULES=[
  [1,/^(phép tính sai|thời gian không khớp|số câu bị trùng|điểm không khớp|tổng điểm các Phần = .* nhưng đề ghi|còn mã LaTeX|còn nội dung giữ chỗ|dấu \$ lẻ|đáp án ghi là|đáp án [A-D] và [A-D]|đáp án câu \d|kết quả giải sai|cặp số không thỏa|thiếu nhãn “Câu|chú thích “[^”]+” bị trùng)/],
  [3,/^(câu chưa có dấu chấm|câu dẫn chưa có dấu kết thúc|có ký hiệu toán gõ dạng chữ|AI gợi ý)/]
];
function sevOf(m){for(const [s,re] of SEV_RULES)if(re.test(m))return s;return 2}

/* [v8] Đối chiếu điểm – đáp án – chú thích Hình/Bảng – tham chiếu “câu n”. Chỉ ghi Comment, không tự sửa.
   Công tắc riêng: lintOff.pts / lintOff.key / lintOff.xref */
function lintStruct2(body,o,add){
  const off=o.lintOff||{};if(off.struct)return;
  const clean=x=>x.replace(/[\u0001\u0002]/g,' ').replace(/\s+/g,' ').trim(),
    num=x=>parseFloat(String(x).replace(',','.')),fmt=x=>String(+(+x).toFixed(2)).replace('.',',');
  const PA=all(body,'p').filter(p=>!anc(p,'txbxContent')),TA=PA.map(p=>clean(pModel(p).S));
  let kA=-1;for(let i=1;i<PA.length;i++)if(/^(BẢNG\s+)?(ĐÁP ÁN|HƯỚNG DẪN CHẤM)/i.test(TA[i])){kA=i;break}
  const endI=kA<0?PA.length:kA,ix=[];
  for(let i=0;i<endI;i++)if(!anc(PA[i],'tc'))ix.push(i);          /* đoạn ngoài bảng, nằm trước phần đáp án */
  const ps=ix.map(i=>PA[i]),S=ps.map(p=>pModel(p).S),T=ix.map(i=>TA[i]);
  const QL=/^(?:Câu|CÂU|Bài|BÀI)\s*(\d+)\b/,PH=/^(?:PHẦN|Phần)\s+[IVX\d]+/,PTS=/\(\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|đ)\s*\)/i,PTH=/\(\s*(\d+(?:[.,]\d+)?)\s*điểm\s*\)/i,
    RST=/^(?:ĐỀ|Đề|MÃ ĐỀ)\b/,EXAM=/^(MÃ ĐỀ|ĐỀ SỐ|ĐỀ\s+[A-D\d]\b)/i;
  const multi=T.filter(t=>EXAM.test(t)).length>=2;                /* một file chứa nhiều đề / nhiều mã đề */
  const lead=(s,re)=>{const r=re.exec(s);if(!r)return null;const a=r[0].length-r[0].replace(/^[\s\u0001]+/,'').length;return[{s:a,e:r[0].length}]};
  const isQ=i=>/^(?:Câu|CÂU)\s*\d+/.test(T[i]);

  /* ---- 1. ĐIỂM: các câu cộng lại có bằng điểm của Phần; các Phần cộng lại có đủ tổng điểm không ---- */
  if(!off.pts){
    const heads=[];
    ps.forEach((p,i)=>{if(PH.test(T[i])){const m=PTH.exec(T[i]);if(m)heads.push({i,pts:num(m[1]),m:m[0]})}});
    heads.forEach((h,k)=>{
      const nxt=k+1<heads.length?heads[k+1].i:ps.length;let sum=0,seen=0,allPts=true;
      for(let j=h.i+1;j<nxt;j++){if(RST.test(T[j])&&EXAM.test(T[j]))break;if(!QL.test(T[j]))continue;seen++;const m=PTS.exec(T[j]);if(m)sum+=num(m[1]);else allPts=false}
      if(seen>0&&allPts&&Math.abs(sum-h.pts)>0.01)add(ps[h.i],'điểm không khớp: các câu trong phần này cộng lại '+fmt(sum)+' điểm, nhưng tiêu đề ghi ('+fmt(h.pts)+' điểm)',sR(S[h.i],h.m))});
    if(heads.length>=2&&!multi){
      const tot=heads.reduce((a,h)=>a+h.pts,0);let dec=null;
      for(let i=0;i<Math.min(T.length,25);i++){const m=/(?:tổng điểm|thang điểm|điểm tối đa)\s*[:\-–]?\s*(?:là\s*)?(\d+(?:[.,]\d+)?)/i.exec(T[i]);if(m){dec=num(m[1]);break}}
      const want=dec!=null?dec:10;
      if(Math.abs(tot-want)>0.01&&(dec!=null||(tot>=6&&tot<=14)))
        add(ps[heads[0].i],dec!=null?'tổng điểm các Phần = '+fmt(tot)+' nhưng đề ghi tổng '+fmt(dec)+' điểm':'tổng điểm các Phần cộng được '+fmt(tot)+' — thang điểm thường dùng là 10, hãy kiểm tra lại',sR(S[heads[0].i],heads[0].m))}}

  /* ---- 2. ĐÁP ÁN: đề có bao nhiêu câu trắc nghiệm, đáp án có đủ và không mâu thuẫn không ---- */
  const ALLQ=new Set(),EQ=new Set();
  ps.forEach((p,i)=>{const m=/^(?:Câu|CÂU)\s*(\d+)\b/.exec(T[i]);if(!m)return;const n=+m[1];ALLQ.add(n);
    let e=i+1;while(e<ps.length&&!isQ(e)&&!PH.test(T[e]))e++;
    const Q=S.slice(i,e).join('\n'),lb=L=>new RegExp('(?:^|\\s|[\\u0001\\u0002])'+L+'[.)](?=\\s|[\\u0001\\u0002]|$)').test(Q);
    if(lb('A')&&lb('B'))EQ.add(n)});
  if(!off.key&&kA>0&&EQ.size){
    const kp={},addP=(n,L)=>{n=+n;if(n<1||n>300)return;(kp[n]=kp[n]||new Set()).add(L.toUpperCase())},kt=TA.slice(kA+1).join('\n');
    for(const m of kt.matchAll(/(?:^|[\s|:;,])(?:Câu\s*)?(\d{1,3})\s*[-–:.)]\s*([A-D])(?![\p{L}\d])/gu))addP(m[1],m[2]);
    const cellT=c=>clean(all(c,'p').map(p=>pModel(p).S).join(' '));
    all(body,'tbl').filter(t=>!anc(t,'tbl')&&((PA[kA].compareDocumentPosition(t)&4)||(PA[kA].compareDocumentPosition(t)&8))).forEach(t=>{
      const rows=Array.from(t.children).filter(c=>c.localName==='tr').map(r=>Array.from(r.children).filter(c=>c.localName==='tc').map(cellT));
      rows.forEach((a,r)=>{
        for(let k=0;k+1<a.length;k++)if(/^\d{1,3}$/.test(a[k])&&/^[A-D]$/i.test(a[k+1]))addP(a[k],a[k+1]);
        const b=rows[r+1];if(!b)return;
        const na=a.filter(x=>/^\d{1,3}$/.test(x)),lb=b.filter(x=>/^[A-D]$/i.test(x));
        if(na.length>=3&&na.length===lb.length&&a.length-na.length<=1&&b.length-lb.length<=1)na.forEach((n,k)=>addP(n,lb[k]))})});
    const kn=Object.keys(kp).map(Number).sort((a,b)=>a-b),need=Array.from(EQ).sort((a,b)=>a-b),at=PA[kA],atS=pModel(at).S,atR=lead(atS,/^[\s\u0001|$]*(?:BẢNG\s+)?(?:ĐÁP ÁN|HƯỚNG DẪN CHẤM)/i);
    if(kn.length>=Math.max(3,Math.ceil(need.length/2))){
      const miss=need.filter(n=>!kp[n]);
      if(miss.length)add(at,'đáp án chưa thấy câu '+miss.slice(0,12).join(', ')+(miss.length>12?'…':'')+' ('+miss.length+' câu trắc nghiệm của đề chưa có đáp án — đếm tự động, hãy kiểm tra lại cách trình bày đáp án)',atR);
      if(!multi){
        const extra=kn.filter(n=>!ALLQ.has(n));
        if(extra.length)add(at,'đáp án có câu '+extra.slice(0,12).join(', ')+(extra.length>12?'…':'')+' nhưng đề không có các câu này',atR);
        const dup=kn.filter(n=>kp[n].size>1);
        if(dup.length)add(at,'đáp án câu '+dup.slice(0,8).map(n=>n+' ('+Array.from(kp[n]).join('/')+')').join(', ')+' ghi nhiều hơn một đáp án khác nhau',atR)}}}

  /* ---- 3. THAM CHIẾU CHÉO: chú thích Hình/Bảng liên tục, hình/bảng/câu được nhắc có tồn tại ---- */
  if(!off.xref){
    const CAP=/^(Hình|Bảng)\s*(\d+)\s*(?:[.:–\-)]|$)/,caps={'Hình':[],'Bảng':[]};let prev={'Hình':0,'Bảng':0};
    ps.forEach((p,i)=>{
      if(EXAM.test(T[i]))prev={'Hình':0,'Bảng':0};
      const m=CAP.exec(T[i]);if(!m)return;const ty=m[1],n=+m[2],pv=prev[ty],rg=lead(S[i],/^[\s\u0001]*(?:Hình|Bảng)\s*\d+/);caps[ty].push(n);
      if(pv&&n===pv&&n>1)add(p,'chú thích “'+ty+' '+n+'” bị trùng số',rg);
      else if(pv&&n>pv+1)add(p,'chú thích nhảy số: sau “'+ty+' '+pv+'” là “'+ty+' '+n+'” (thiếu “'+ty+' '+(pv+1)+'”?)',rg);
      else if(pv&&n<pv&&n!==1)add(p,'chú thích bị lùi số: sau “'+ty+' '+pv+'” là “'+ty+' '+n+'”',rg);
      prev[ty]=n});
    ps.forEach((p,i)=>{
      if(CAP.test(T[i]))return;
      for(const m of T[i].matchAll(/(?<![\p{L}\d])(hình|bảng)\s*(\d+)(?![\p{L}\d]|[.,]\d)/giu)){
        const ty=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase(),n=+m[2];
        if(new Set(caps[ty]).size>=2&&caps[ty].indexOf(n)<0){add(p,'nhắc “'+ty+' '+n+'” nhưng không thấy chú thích “'+ty+' '+n+'” trong đề',sR(S[i],m[0]));break}}
      if(ALLQ.size>=3)for(const m of T[i].matchAll(/(?<=(?:xem|ở|như|theo|dựa vào|từ|trong|so với|của|vào)\s+)câu\s*(\d+)\b/giu))
        if(!ALLQ.has(+m[1])){add(p,'nhắc “câu '+m[1]+'” nhưng đề không có Câu '+m[1],sR(S[i],m[0]));break}})}
}

function lintDoc(body,o,rep,sugs){
  const flags=[],dec={c:0,d:0},used=new Set(),byP=new Map(),idxOf=new Map();let idx=0,prevEnd='',inKey=false;
  const PL=all(body,'p'),cellEnd=new Map();
  PL.forEach(p=>{
    idx++;idxOf.set(p,idx);
    if(anc(p,'txbxContent'))return;
    const S=pModel(p).S,tr=S.trim();
    if(!/\p{L}/u.test(tr))return;
    if(/^\s*ĐÁP ÁN\b|\bĐÁP ÁN MÔN|HƯỚNG DẪN CHẤM/.test(S))inKey=true;else if(/PHIẾU TRẢ LỜI|BÀI LÀM ĐỀ|^\s*ĐỀ KIỂM TRA|^\s*MA TRẬN|BẢN ĐẶC TẢ/.test(S))inKey=false;
    const info=pInfo(p),tc=!!anc(p,'tc');
    const tcEl=tc?anc(p,'tc'):null,cx={tc,list:info.list,head:info.head,pseudo:pseudoHead(p),prevEnd,cellPrev:tcEl?(cellEnd.get(tcEl)||''):undefined,inKey,off:o.lintOff,rg:[]},issues=lintPara(S,cx);
    if(!(o.lintOff&&o.lintOff.mid)){/* [v17] đoạn kết thúc bằng dấu phẩy nhưng đoạn kế bắt đầu bằng chữ hoa; gạch đầu dòng thứ hai nằm giữa đoạn */
      const tl=S.replace(/[\s\u0001\u0002]+$/,'');
      if(tl.length>=8&&/,$/.test(tl)){let nt='';for(let k=idx;k<Math.min(PL.length,idx+3);k++){const s2=pModel(PL[k]).S.replace(/^[\s\u0001\u0002]+/,'');if(/\p{L}/u.test(s2)){nt=s2;break}}
        if(/^\p{Lu}/u.test(nt)){const mg='đoạn kết thúc bằng dấu phẩy “,” nhưng đoạn kế tiếp bắt đầu bằng chữ hoa — có thể bỏ sót nội dung hoặc nên đổi thành dấu chấm';issues.push(mg);const ci=tl.length-1;cx.rg.push({s:ci,e:ci+1,m:mg})}}
      if(/^[\s\u0001]*[-\u2013+*]\s/.test(S)){const mb=/[:;.]\s+([-\u2013])\s+(?=\p{Lu})/u.exec(S);if(mb){const mg='có gạch đầu dòng thứ hai nằm giữa đoạn (“…: - …”) — nên tách thành dòng riêng';issues.push(mg);const bi=mb.index+mb[0].search(/[-\u2013]/);cx.rg.push({s:bi,e:bi+1,m:mg})}}}
    {const ms=/^[\s\u0001]*\.(?=\s+\p{Lu})/u.exec(S);
      if(ms){const i=ms[0].lastIndexOf('.'),mg='đoạn bắt đầu bằng dấu chấm lạ “.” (có thể là gạch đầu dòng gõ nhầm) — hãy kiểm tra';issues.push(mg);cx.rg.push({s:i,e:i+1,m:mg})}
      const mo=/(?<=(?:^|[\s\u0001])[A-D]\. )\.(?=[\p{L}\u0001])/u.exec(S);
      if(mo){const mg='dấu chấm thừa ngay trước chữ trong phương án — hãy kiểm tra';issues.push(mg);cx.rg.push({s:mo.index,e:mo.index+1,m:mg})}}
    if(o.dry){const E=paraRules(S,o);if(E.length){const e=E.slice().sort((a,b)=>a.s-b.s)[0],c=x=>x.replace(/\u0001/g,'⇥').replace(/\u0002/g,'⟦CT⟧');
      const dm='cần sửa '+E.length+' chỗ dấu câu/khoảng trắng/chính tả, vd: “'+c(S.slice(Math.max(0,e.s-14),Math.min(S.length,e.e+14)))+'”';E.forEach(z=>cx.rg.push({s:Math.max(0,z.s-(z.e>z.s?0:1)),e:Math.max(z.e,z.s+1),m:dm}));issues.unshift(dm)}}
    sugs.forEach((sg,k)=>{if(!used.has(k)&&S.indexOf(sg.find)>=0){used.add(k);{const ix=S.indexOf(sg.find);cx.rg.push({s:ix,e:ix+sg.find.length,m:'AI gợi ý: “'+sg.find+'” → “'+sg.replace+'”'})}issues.push('AI gợi ý: “'+sg.find+'” → “'+sg.replace+'”')}});
    for(const m of S.matchAll(/(?<![\d.,])\d+,\d{1,2}(?![\d,.])/g))dec.c++;
    /* [v17] cùng bộ lọc với unifyNums: bỏ “Bài 1.1/Hình 2.3”, và dấu chấm là phép nhân (4.2+3.(–1)) */
    if(!/\d\.\s?\(|\)\s?\.\s?[\d(]/.test(S))for(const m of S.matchAll(/(?<![\d.,])\d+\.\d{1,2}(?![\d,.])/g)){
      if(m.index<=1&&/^[ \u0001]/.test(S.slice(m.index+m[0].length)||' '))continue;
      if(/(Hình|Bảng|Bài|Câu|Mục|Chương|Phần|Điều|Khoản|Trang|Ví dụ|Sơ đồ|Biểu đồ|Đồ thị|Dạng|Chuyên đề|Tiết|Fig|Table|Section|Chapter|No|Số)\s*$/i.test(S.slice(Math.max(0,m.index-16),m.index)))continue;
      const bf=S.slice(0,m.index).replace(/\s+$/,''),af=S.slice(m.index+m[0].length).replace(/^\s+/,'');
      if(/[+\u00d7\u00b7*\/\u00f7]$/.test(bf)||/^[+\u00d7\u00b7*\/\u00f7]/.test(af)||/\d\s*[-\u2212\u2013]$/.test(bf)||/^[-\u2212\u2013]\s*[\d(]/.test(af))continue;
      dec.d++}
    prevEnd=tr.replace(/[\u0001\u0002]+$/,'').slice(-1)||prevEnd;if(tcEl)cellEnd.set(tcEl,tr.replace(/[\u0001\u0002]+$/,'').slice(-1));
    if(issues.length){const f={p,n:idx,snip:tr.replace(/[\u0001\u0002]/g,'…').slice(0,60),issues,rg:cx.rg};flags.push(f);byP.set(p,f)}});
  const addI=(p,msg,rg)=>{let f=byP.get(p);if(!f){const tr=pModel(p).S.trim();f={p,n:idxOf.get(p)||0,snip:tr.replace(/[\u0001\u0002]/g,'…').slice(0,60),issues:[],rg:[]};byP.set(p,f);flags.push(f)}if(f.issues.indexOf(msg)<0)f.issues.push(msg);if(rg&&rg.length)f.rg=(f.rg||[]).concat(rg.map(r=>Object.assign({m:msg},r)))};
  lintStruct(body,o,addI);
  try{lintStruct2(body,o,addI)}catch(e){rep.warn('Bước đối chiếu điểm/đáp án/hình–bảng gặp lỗi nên đã bỏ qua: '+e.message)}
  lintContent(body,o,addI);
  try{lintLesson(body,o,addI,rep)}catch(e){rep.warn('Bước kiểm tra cấu trúc/thời gian KHBD gặp lỗi nên đã bỏ qua: '+e.message)}
  lintConsist(body,o,addI,rep);
  /* [v8] phân mức, lọc theo mức người dùng chọn, tô màu theo mức */
  const sv=o.sevOn||{};
  flags.forEach(f=>{
    const it=f.issues.map(m=>({m,s:sevOf(m)})).filter(x=>sv[x.s]!==false).sort((a,b)=>a.s-b.s),ok=new Set(it.map(x=>x.m));
    f.issues=it.map(x=>'['+SEV_NAME[x.s]+'] '+x.m);f.sev=it.length?it[0].s:3;
    f.rg=(f.rg||[]).filter(r=>!r.m||ok.has(r.m)).map(r=>Object.assign({},r,{c:r.c||SEV_HL[r.m?sevOf(r.m):f.sev]}))});
  for(let i=flags.length-1;i>=0;i--)if(!flags[i].issues.length)flags.splice(i,1);
  flags.sort((a,b)=>a.n-b.n);
  flags.forEach(f=>{const S=pModel(f.p).S;f.rg=normRg(f.rg,S);f.hits=f.rg.map(r=>S.slice(r.s,r.e).replace(/[\u0001\u0002]/g,'…'));f.ctx=mkCtx(S,f.rg)});
  if(dec.c>=2&&dec.d>=2)rep.warn('Số thập phân dùng lẫn dấu phẩy ('+dec.c+' chỗ) và dấu chấm ('+dec.d+' chỗ) — nên thống nhất một kiểu (tiếng Việt: dấu phẩy).');
  return flags}
/* [v7] Tô nền đúng các khoảng [s,e) của đoạn (tính theo pModel(p).S). Trả về mảng theo thứ tự văn bản: mỗi phần tử = các run đã tô của một khoảng */
function hlRuns(doc,p,rgs){
  const out=[];
  rgs.slice().sort((a,b)=>b.s-a.s).forEach(r=>{
    const pieces=[];for(const x of pModel(p).nodes){const a=Math.max(r.s,x.s),b=Math.min(r.e,x.s+x.n);if(a<b)pieces.push({x,a:a-x.s,b:b-x.s})}
    const runs=[];
    pieces.reverse().forEach(pc=>{   /* từ cuối về đầu: tách run không làm lệch các node phía trước */
      let r0=pc.x.t.parentNode;if(!r0||r0.localName!=='r'||r0.namespaceURI!==W)return;
      explode(doc,r0);r0=pc.x.t.parentNode;
      const len=pc.x.t.textContent.length;let mid=r0;
      if(pc.b<len)splitRun(doc,r0,pc.x.t,pc.b);
      if(pc.a>0)mid=splitRun(doc,r0,pc.x.t,pc.a);
      let pr=one(mid,'rPr');if(!pr){pr=mk(doc,'rPr');mid.insertBefore(pr,mid.firstChild)}
      sa(sc(doc,pr,'highlight',ORD.rPr),'val',(r.c==='cyan'||r.c==='red')?r.c:'yellow');
      runs.unshift(mid)});
    if(runs.length)out.unshift(runs)});
  return out}
/* Gắn Comment vào đoạn; cd = comments.xml (đã có hoặc tạo mới). o.hl !== false: tô nền đúng cụm chữ lỗi và neo Comment đúng chỗ đó */
function addComments(doc,cd,flags,o){
  let id=0;
  [doc,cd].forEach(d=>all(d,'commentRangeStart').concat(all(d,'comment')).forEach(e=>{id=Math.max(id,(+ga(e,'id')||0)+1)}));
  const useHl=!o||o.hl!==false;
  flags.forEach((f,fi)=>{
    const cid=id++,c=mk(cd,'comment'),code='#L'+String(fi+1).padStart(2,'0');f.code=code;
    /* tô nền trước (vì tách run), rồi mới đặt mốc Comment */
    let groups=[];if(useHl&&f.rg&&f.rg.length){try{groups=hlRuns(doc,f.p,f.rg)}catch(e){groups=[]}}
    sa(c,'id',cid);sa(c,'author','Rà soát đề');sa(c,'date',TRK.date);sa(c,'initials','RS');
    const lines=[code+' · '+(SEV_NAME[f.sev]||'')+' · Cần kiểm tra:'].concat(f.issues.map(x=>'• '+x));
    if(f.hits&&f.hits.length)lines.push('→ Chỗ cần xem'+(groups.length?' (đã tô màu)':'')+': '+f.hits.slice(0,4).map(x=>'“'+x+'”').join(', ')+(f.hits.length>4?'…':''));
    lines.forEach(line=>{
      const cp=mk(cd,'p'),cr=mk(cd,'r'),ct=mk(cd,'t');ct.textContent=line;setXS(ct);cr.appendChild(ct);cp.appendChild(cr);c.appendChild(cp)});
    cd.documentElement.appendChild(c);
    const st=mk(doc,'commentRangeStart'),en=mk(doc,'commentRangeEnd'),ref=mk(doc,'r'),cr=mk(doc,'commentReference');
    sa(st,'id',cid);sa(en,'id',cid);sa(cr,'id',cid);ref.appendChild(cr);
    if(groups.length){
      /* neo từ đầu khoảng lỗi đầu tiên đến cuối khoảng lỗi cuối; nếu các khoảng cách xa nhau thì chỉ neo vào khoảng đầu */
      const wide=f.rg[f.rg.length-1].e-f.rg[0].s>220,use=wide?[groups[0]]:groups,
        top=e=>{while(e.parentNode&&e.parentNode!==f.p)e=e.parentNode;return e},
        a=top(use[0][0]),z=top(use[use.length-1][use[use.length-1].length-1]);
      f.p.insertBefore(st,a);f.p.insertBefore(en,z.nextSibling);f.p.insertBefore(ref,en.nextSibling)}
    else{const pPr=one(f.p,'pPr');f.p.insertBefore(st,pPr?pPr.nextSibling:f.p.firstChild);f.p.appendChild(en);f.p.appendChild(ref)}})}

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
    /* [v15] mục danh sách/đánh số bắt đầu bằng chữ thường (vd “ổn định tổ chức”) → viết hoa; bỏ qua khi đoạn trước kết thúc bằng , ; (câu còn dang dở) */
    if(!anc(p,'tc')&&info.list&&!info.head&&tr.length>=4&&ch&&/\p{Ll}/u.test(ch)&&!/^\p{Ll}\s*[.)]/u.test(f0)&&!/^\p{Ll}(?![\p{L}\p{M}])/u.test(f0)&&!/[,;]$/.test(prevEnd)){
      applyEdit(p,{s:k,e:k+1,r:ch.toUpperCase(),k:'cp'});n++}
    else if(!anc(p,'tc')&&!info.list&&!info.head&&tr.length>=25&&ch&&/\p{Ll}/u.test(ch)&&!/^\p{Ll}\s*[.)]/u.test(f0)&&!/^\p{Ll}(?![\p{L}\p{M}])/u.test(f0)&&/[.?!:]$/.test(prevEnd)){
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

/* ====================================================================
   [v13] SỬA LỖI NỘI DUNG giáo án / bài tập (tự sửa, ghi Track Changes khi bật):
   dấu chấm thừa · thiếu nhãn “Câu 1.” · đáp án trắc nghiệm để trống · kết quả giải phương trình bậc nhất hai ẩn sai ·
   câu chữ sao chép nhầm giữa các hoạt động. Chỉ sửa khi TÍNH ĐƯỢC chắc chắn; còn lại gắn Comment.
   ==================================================================== */
const NT=s=>String(s).replace(/[\u2212\u2013\u2014]/g,'-').replace(/\s+/g,'');
function linParse(side){
  let s=NT(side).replace(/,/g,'.');
  if(!s||!/^[0-9xy.+\-]+$/.test(s))return null;
  if(!/^[+\-]/.test(s))s='+'+s;
  const re=/([+\-])(\d*\.?\d*)([xy]?)/y,r={x:0,y:0,c:0};let pos=0;
  while(pos<s.length){
    re.lastIndex=pos;const m=re.exec(s);if(!m||!m[0])return null;pos=re.lastIndex;
    if(m[2]==='.')return null;
    let k=m[2]===''?(m[3]?1:NaN):parseFloat(m[2]);if(isNaN(k))return null;
    if(m[1]==='-')k=-k;
    if(m[3])r[m[3]]+=k;else r.c+=k}
  return r}
function linEq(t){
  t=String(t).replace(/^[\s.]+/,'').replace(/[.;,\s]+$/,'');
  const p=t.split('=');if(p.length!==2)return null;
  const L=linParse(p[0]),R=linParse(p[1]);if(!L||!R)return null;
  return{a:L.x-R.x,b:L.y-R.y,c:R.c-L.c}}
const numOf=s=>{const v=parseFloat(NT(s).replace(',','.'));return isFinite(v)?v:null};
const fmtN=v=>String(+(+v).toFixed(6)).replace('.',',');
/* tách các phương án A–D khỏi một khối câu hỏi */
function mcqOpts(block){
  const t=block.replace(/[\u0001\u0002]/g,' ').replace(/[ \t]+/g,' '),re=/(?:^|\s)([A-D])[.)]\s+/g,hits=[];let m;
  while((m=re.exec(t)))hits.push({L:m[1],s:m.index+m[0].length,st:m.index});
  let a=-1;for(let i=hits.length-1;i>=0;i--)if(hits[i].L==='A'){a=i;break}
  if(a<0)return null;
  const seq=[hits[a]];for(let i=a+1;i<hits.length;i++){if(hits[i].L.charCodeAt(0)===seq[seq.length-1].L.charCodeAt(0)+1)seq.push(hits[i])}
  if(seq.length<2)return null;
  const map={};seq.forEach((h,k)=>{map[h.L]=t.slice(h.s,k+1<seq.length?seq[k+1].st:t.length).replace(/\s+/g,' ').replace(/^[.\s]+/,'').replace(/[.;,\s]+$/,'')});
  return{map,stem:t.slice(0,seq[0].st).replace(/\s+/g,' ').replace(/^\s*(?:Câu|CÂU)\s*\d+\s*[.:]\s*/,'').trim()}}
/* giải các dạng trắc nghiệm chắc chắn tính được (phương trình bậc nhất hai ẩn) → chữ cái đáp án hoặc null */
function solveMcq(block){
  const q=mcqOpts(block);if(!q)return null;
  const Ls=Object.keys(q.map);if(Ls.length<4)return null;
  const only=a=>a.length===1?a[0]:null;
  let m;
  if(/số nghiệm của (?:mỗi )?phương trình bậc nhất hai ẩn/i.test(q.stem))return only(Ls.filter(L=>/vô số/i.test(q.map[L])));
  const eqs={};let ok=true;
  if(/KHÔNG\s+(?:phải\s+)?là phương trình bậc nhất hai ẩn/i.test(q.stem)){
    Ls.forEach(L=>{const e=linEq(q.map[L]);if(!e)ok=false;eqs[L]=e});
    if(!ok)return null;
    return only(Ls.filter(L=>eqs[L].a===0&&eqs[L].b===0))}
  if((m=/nhận cặp số\s*\(\s*([^;()]+?)\s*;\s*([^()]+?)\s*\)\s*làm nghiệm/i.exec(q.stem))){
    const x0=numOf(m[1]),y0=numOf(m[2]);if(x0===null||y0===null)return null;
    Ls.forEach(L=>{const e=linEq(q.map[L]);if(!e)ok=false;eqs[L]=e});
    if(!ok)return null;
    return only(Ls.filter(L=>Math.abs(eqs[L].a*x0+eqs[L].b*y0-eqs[L].c)<1e-9))}
  if((m=/phương trình\s+(.+?)\s+có nghiệm là cặp số/i.exec(q.stem))){
    const e=linEq(m[1]);if(!e)return null;
    const sat=[];
    for(const L of Ls){const pm=/^\(\s*([^;]+?)\s*;\s*([^)]+?)\s*\)/.exec(q.map[L]);if(!pm)return null;
      const x0=numOf(pm[1]),y0=numOf(pm[2]);if(x0===null||y0===null)return null;
      if(Math.abs(e.a*x0+e.b*y0-e.c)<1e-9)sat.push(L)}
    return only(sat)}
  return solveMcqExt(q,Ls)}
const cellParas=c=>Array.from(c.children).filter(e=>e.localName==='p'&&e.namespaceURI===W);
const LABRE=/^[\s\u0001]*(?:Câu|CÂU)\s*(\d+)\s*[.:]/,KEYRE=/^[\s\u0001]*(?:Câu|CÂU)\s*(\d+)\s*[.:]?\s*([A-D])?\s*$/,
  CUTRE=/^[\s\u0001]*[-–+*•]*\s*(?:Bước\s*\d|GV\b|HS\b)/;
/* khối câu hỏi số n trong danh sách đoạn (đến câu kế/ dòng hướng dẫn GV–HS) */
function qBlock(ps,n){
  for(let i=0;i<ps.length;i++){const S=pModel(ps[i]).S,m=LABRE.exec(S);
    if(!m||+m[1]!==n||KEYRE.test(S))continue;
    const parts=[S];
    for(let k=i+1;k<ps.length;k++){const s2=pModel(ps[k]).S;if(LABRE.test(s2)||CUTRE.test(s2))break;parts.push(s2)}
    const b=parts.join('\n');if(/(^|[\s\u0001])A[.)]\s/.test(b)&&/(^|[\s\u0001])B[.)]\s/.test(b))return b}
  return null}
/* đáp án trắc nghiệm nằm ở ô khác cùng hàng với ô chứa câu hỏi */
function keyJobs(body){
  const out=[];
  all(body,'tr').forEach(tr=>{
    const cells=wk(tr,'tc').map(tc=>cellParas(tc));
    cells.forEach((K,ki)=>K.forEach(p=>{
      const S=pModel(p).S,m=KEYRE.exec(S);if(!m)return;
      const n=+m[1];let block=null;
      cells.forEach((Q,qi)=>{if(!block&&qi!==ki)block=qBlock(Q,n)});
      if(!block)return;
      out.push({p,n,S,letter:m[2]||'',sol:solveMcq(block)})}))});
  return out}
/* câu hỏi đầu tiên của ô/phần bị mất nhãn “Câu 1.” (phía sau là “Câu 2.”) */
function lblMissing(PS){
  const S=PS.map(p=>pModel(p).S);let f=-1,n1=0;
  for(let i=0;i<S.length;i++){const m=LABRE.exec(S[i]);if(m){f=i;n1=+m[1];break}}
  if(f<1||n1!==2)return null;
  let o=-1;
  for(let i=0;i<f;i++)if(/^[\s\u0001]*A[.)]\s/.test(S[i])||/(^|\s)A[.)]\s.*\sB[.)]\s/.test(S[i])){o=i;break}
  if(o<0)return null;
  let st=o;
  if(/^[\s\u0001]*A[.)]\s/.test(S[o])){st=o-1;while(st>=0&&!/[^\s\u0001\u0002]/.test(S[st]))st--}
  if(st<0)return null;
  const t=S[st];
  if(!/\p{L}/u.test(t)||LABRE.test(t)||CUTRE.test(t)||/^[\s\u0001]*[A-D][.)]\s/.test(t)||t.replace(/[\s\u0001\u0002]/g,'').length<8)return null;
  return{p:PS[st],pos:t.search(/[^\s\u0001\u0002]/),n:1}}
/* “<pt> ta có x|y = …” — tính lại nghiệm biểu diễn theo biến còn lại */
const TACO=/^([\s\u0001]*(?:[a-d]\)\s*)?)([0-9xy+\-\u2013\u2212.,\s]+=[0-9xy+\-\u2013\u2212.,\s]+?)\s+ta có\s+([xy])\s*=\s*([0-9xy+\-\u2013\u2212.,\s]+?)\s*$/;
function taCoCheck(p){
  const S=pModel(p).S,m=TACO.exec(S);if(!m)return null;
  const e=linEq(m[2]),v=m[3],o=v==='x'?'y':'x',R=linParse(m[4]);
  if(!e||!R||R[v]!==0)return null;
  const den=v==='y'?e.b:e.a;if(!den)return null;
  const co=-(v==='y'?e.a:e.b)/den,cc=e.c/den;
  if(Math.abs(R[o]-co)<1e-9&&Math.abs(R.c-cc)<1e-9)return null;
  const mn=/\u2013/.test(m[4])?'–':'-',f=x=>(x<0?mn:'')+fmtN(Math.abs(x));
  let nr='';
  if(Math.abs(co)>1e-12)nr+=(co<0?mn:'')+(Math.abs(Math.abs(co)-1)<1e-12?'':fmtN(Math.abs(co)))+o;
  if(Math.abs(cc)>1e-12||!nr)nr+=nr?(' '+(cc<0?mn:'+')+' '+fmtN(Math.abs(cc))):f(cc);
  const end=S.replace(/\s+$/,'').length,old=m[4].trim(),s0=end-old.length;
  return{S,eq:m[2].trim(),v,old,nr,s:s0,e:end}}
const COPYRE=/hai HĐ(?!\s*\d)/;
function copyIssues(body){
  const out=[];
  all(body,'tc').forEach(tc=>{const ps=cellParas(tc);let before='';
    ps.forEach(p=>{const S=pModel(p).S,m=COPYRE.exec(S);
      if(m&&!/HĐ\s*\d|hoạt động\s*\d/i.test(before))out.push({p,at:m.index,len:m[0].length,tn:/trắc nghiệm/i.test(before)});
      before+=S+'\n'})});
  return out}
function trimEd(S,ed){
  const old=S.slice(ed.s,ed.e);let a=0;
  while(a<old.length&&a<ed.r.length&&old[a]===ed.r[a])a++;
  let b=0;while(b<old.length-a&&b<ed.r.length-a&&old[old.length-1-b]===ed.r[ed.r.length-1-b])b++;
  return{s:ed.s+a,e:ed.e-b,r:ed.r.slice(a,ed.r.length-b)}}
function contentPass(doc,body,o,rep){
  const note=m=>{rep.notes=rep.notes||[];if(rep.notes.length<60)rep.notes.push(m)};
  /* 1. thiếu nhãn “Câu 1.” */
  if(o.fixlbl!==false){let n=0;
    [body].concat(all(body,'tc')).forEach(c=>{const r=lblMissing(cellParas(c));
      if(r){const sn=pModel(r.p).S.replace(/[\u0001\u0002]/g,' ').replace(/\s+/g,' ').trim().slice(0,60);
        applyEdit(r.p,{s:r.pos,e:r.pos,r:'Câu '+r.n+'. ',k:'lbl'});n++;
        note('Đã thêm nhãn “Câu '+r.n+'.” còn thiếu trước: “'+sn+'…”')}});
    rep.fix('Thêm nhãn “Câu 1.” còn thiếu trước câu trắc nghiệm đầu tiên',n)}
  /* 2. điền đáp án trắc nghiệm còn để trống (chỉ khi tính được chắc chắn) */
  if(o.fixkey!==false){let n=0;
    keyJobs(body).forEach(j=>{
      if(j.letter||!j.sol)return;
      const S=pModel(j.p).S,L=S.replace(/\s+$/,'').length;
      applyEdit(j.p,{s:S.length,e:S.length,r:(S.length>L&&S[S.length-1]===' '?'':' ')+j.sol,k:'key'});n++;
      note('Đã điền đáp án Câu '+j.n+' = '+j.sol+' (tự tính từ đề) — hãy xem lại trước khi dùng.')});
    rep.fix('Điền đáp án trắc nghiệm còn để trống (tự tính từ đề)',n)}
  /* 3. kết quả “ta có x|y = …” sai */
  if(o.fixmath!==false){let n=0;
    all(body,'p').forEach(p=>{const r=taCoCheck(p);if(!r)return;
      const ed=trimEd(r.S,{s:r.s,e:r.e,r:r.nr});applyEdit(p,{s:ed.s,e:ed.e,r:ed.r,k:'math'});n++;
      note('Đã sửa kết quả sai: “'+r.eq+' ta có '+r.v+' = '+r.old+'” → “'+r.v+' = '+r.nr+'” (tính lại từ phương trình).')});
    rep.fix('Sửa kết quả giải phương trình bậc nhất hai ẩn bị sai (tự tính lại)',n)}
  /* 4. “hai HĐ” chép nhầm sang hoạt động không có HĐ nào */
  if(o.fixcopy!==false){let n=0;
    copyIssues(body).forEach(c=>{if(!c.tn)return;
      applyEdit(c.p,{s:c.at,e:c.at+c.len,r:'các câu hỏi trắc nghiệm',k:'copy'});n++;
      note('Đã sửa câu chữ sao chép nhầm “hai HĐ” → “các câu hỏi trắc nghiệm” (hoạt động này không có HĐ nào).')});
    rep.fix('Sửa câu chữ sao chép nhầm từ hoạt động khác (“hai HĐ”)',n)}
  /* 5. [v14] phép tính số học sai */
  if(o.fixarith!==false)arithFix(doc,body,o,rep,note);
  all(body,'t').forEach(setXS)}
/* Comment cho những chỗ không tự sửa được / cần người xem (dùng cả ở chế độ chỉ kiểm tra) */
function lintContent(body,o,add){
  const off=o.lintOff||{};if(off.struct)return;
  try{keyJobs(body).forEach(j=>{
    const lab=[{s:j.S.search(/\S/),e:j.S.replace(/\s+$/,'').length}];
    if(!j.letter){add(j.p,'đáp án câu '+j.n+' còn để trống'+(j.sol?' — tính ra đáp án là '+j.sol:' — hãy điền đáp án'),lab)}
    else if(j.sol&&j.sol!==j.letter)add(j.p,'đáp án câu '+j.n+' ghi '+j.letter+' nhưng tính từ đề ra '+j.sol+' — hãy kiểm tra',lab)})}catch(e){}
  try{[body].concat(all(body,'tc')).forEach(c=>{const r=lblMissing(cellParas(c));
    if(r)add(r.p,'thiếu nhãn “Câu '+r.n+'.” — phía sau là “Câu 2.”',[{s:r.pos,e:Math.min(pModel(r.p).S.length,r.pos+12)}])})}catch(e){}
  try{all(body,'p').forEach(p=>{const r=taCoCheck(p);
    if(r)add(p,'kết quả giải sai: “'+r.eq+' ta có '+r.v+' = '+r.old+'” — tính lại ra '+r.v+' = '+r.nr,[{s:r.s,e:r.e}])})}catch(e){}
  try{copyIssues(body).forEach(c=>add(c.p,'nhắc “hai HĐ” nhưng hoạt động này không có HĐ nào — nội dung có thể sao chép nhầm từ hoạt động trước',[{s:c.at,e:c.at+c.len}]))}catch(e){}
  try{arithLint(body,add)}catch(e){}
  try{pairLint(body,add)}catch(e){}}

/* ====================== [v14] CẢI TIẾN THEO ĐỀ XUẤT RÀ SOÁT KHBD ======================
   1) Kiểm tra thời gian (mốc “(n phút)” so với 45 phút/tiết; mục A–D = tổng các HĐ)   2) Kiểm tra & tự sửa phép tính số học sai
   3) Mở rộng bộ giải trắc nghiệm (phương trình một ẩn, giá trị biểu thức, hệ hai phương trình)  4) Thống nhất dấu trừ và số thập phân
   5) Kiểm tra cấu trúc theo CV 5512 (mục I/II/III, mục A–B–C–D, 4 bước)  6) Phát hiện công thức bị mất  7) Tiêu đề đầu trang còn dở / thiếu ngày soạn, tuần
   (8 = mở rộng SPELL ở đầu file). Mọi bước là phần thêm, có công tắc riêng, không đổi hành vi các bước cũ. */

/* ---- bộ tính biểu thức nhỏ (không dùng eval): số, + − × ÷, ngoặc, ẩn x/y bậc nhất ---- */
function lnParse(str,dotMul){
  const s=String(str).replace(/[\u2212\u2013\u2014]/g,'-').replace(/[×·*]/g,'*').replace(/÷/g,'/').replace(/\s+/g,'');
  if(!s)return null;
  const T=[];let i=0;
  while(i<s.length){
    const ch=s[i];
    if(ch>='0'&&ch<='9'){const re=dotMul?/\d+(?:,\d+)?/y:/\d+(?:[.,]\d+)?/y;re.lastIndex=i;const m=re.exec(s);T.push({n:parseFloat(m[0].replace(',','.'))});i=re.lastIndex;continue}
    if(ch==='.'){T.push({o:'*'});i++;continue}
    if('+-*/()'.indexOf(ch)>=0){T.push({o:ch});i++;continue}
    if(ch==='x'||ch==='y'){T.push({v:ch});i++;continue}
    return null}
  let p=0;
  const F=(c,x,y)=>({c:c||0,x:x||0,y:y||0}),isC=f=>!f.x&&!f.y;
  const add=(a,b,k)=>F(a.c+k*b.c,a.x+k*b.x,a.y+k*b.y);
  const mul=(a,b)=>{if(isC(a))return F(a.c*b.c,a.c*b.x,a.c*b.y);if(isC(b))return F(a.c*b.c,a.x*b.c,a.y*b.c);throw 0};
  const div=(a,b)=>{if(!isC(b)||b.c===0)throw 0;return F(a.c/b.c,a.x/b.c,a.y/b.c)};
  let expr;
  const prim=()=>{const t=T[p];if(!t)throw 0;
    if(t.n!==undefined){p++;return F(t.n)}
    if(t.v){p++;return t.v==='x'?F(0,1,0):F(0,0,1)}
    if(t.o==='('){p++;const v=expr();if(!T[p]||T[p].o!==')')throw 0;p++;return v}
    throw 0};
  const unary=()=>{const t=T[p];if(t&&t.o==='-'){p++;return mul(F(-1),unary())}if(t&&t.o==='+'){p++;return unary()}return prim()};
  const term=()=>{let v=unary();
    for(;;){const t=T[p];if(!t)break;
      if(t.o==='*'){p++;v=mul(v,unary())}
      else if(t.o==='/'){p++;v=div(v,unary())}
      else if(t.o==='('||t.v){v=mul(v,prim())}          /* nhân ngầm: 2x, 3(x − 1), (a)(b) */
      else break}
    return v};
  expr=()=>{let v=term();for(;;){const t=T[p];if(t&&(t.o==='+'||t.o==='-')){p++;const w=term();v=add(v,w,t.o==='+'?1:-1)}else break}return v};
  try{const v=expr();return p===T.length?v:null}catch(e){return null}}
const lnConst=(s,dm)=>{const f=lnParse(s,dm);return f&&!f.x&&!f.y?f.c:null};
function lnEq(t){
  t=String(t).replace(/^[\s{\[\u23a7\u23a8\u23a9]+/,'').replace(/[\s.;,]+$/,'');
  const p=t.split('=');if(p.length!==2)return null;
  const L=lnParse(p[0],false),R=lnParse(p[1],false);if(!L||!R)return null;
  return{a:L.x-R.x,b:L.y-R.y,c:R.c-L.c}}

/* [v14-3] Mở rộng bộ giải trắc nghiệm: chỉ trả lời khi tính được CHẮC CHẮN và đúng 1 phương án khớp */
function solveMcqExt(q,Ls){
  const only=a=>a.length===1?a[0]:null,st=q.stem;let m;
  const optNum=L=>{const t=String(q.map[L]).replace(/^(?:x|S|nghiệm)\s*=\s*/i,'').replace(/^\{/,'').replace(/\}$/,'');return lnConst(t,false)};
  const near=(u,v)=>Math.abs(u-v)<=1e-9*(1+Math.abs(v));
  /* (a) phương trình bậc nhất một ẩn: “Nghiệm của phương trình 2x − 4 = 0 là” */
  for(const re of [/phương trình\s*:?\s*(.+?=.+?)\s+có\s+(?:nghiệm|tập nghiệm)\b/i,/(?:nghiệm|tập nghiệm) của\s*(?:phương trình\s*)?:?\s*(.+?=.+?)\s+(?:là|bằng)(?=\s|[:?.]|$)/i,/\bgiải\s+phương trình\s*:?\s*(.+?=.+?)\s*[:?.]*\s*$/i]){
    if(!(m=re.exec(st)))continue;
    if(/cặp số|hệ/i.test(st))break;
    const e=lnEq(m[1]);if(!e||e.b!==0||e.a===0)return null;
    const sol=e.c/e.a,v=Ls.map(optNum);if(v.some(x=>x===null))return null;
    return only(Ls.filter((L,k)=>near(v[k],sol)))}
  /* (b) giá trị biểu thức (có thể kèm “tại x = …”) */
  if((m=/(?:giá trị của biểu thức|giá trị biểu thức|kết quả của phép tính|kết quả phép tính)\s*(?:[A-Za-z]\s*=\s*)?:?\s*(.+?)\s*(?:là|bằng)?\s*[:?.]*\s*$/i.exec(st))){
    let ex=m[1];const vars={};
    const sm=/\s+(?:tại|khi|với)\s+((?:[xy]\s*=\s*[-\u2212\u2013]?[\d.,]+\s*(?:,|;|và)?\s*)+)$/i.exec(ex);
    if(sm){ex=ex.slice(0,sm.index);for(const z of sm[1].matchAll(/([xy])\s*=\s*([-\u2212\u2013]?[\d.,]+)/g))vars[z[1]]=lnConst(z[2],false)}
    const v=Ls.map(optNum);if(v.some(x=>x===null))return null;
    const got=new Set();let any=false;
    for(const dm of [true,false]){const f=lnParse(ex,dm);if(!f)continue;
      let val=f.c;if(f.x){if(vars.x==null)continue;val+=f.x*vars.x}if(f.y){if(vars.y==null)continue;val+=f.y*vars.y}
      any=true;Ls.forEach((L,k)=>{if(near(v[k],val))got.add(L)})}
    return any&&got.size===1?Array.from(got)[0]:null}
  /* (c) hệ hai phương trình bậc nhất hai ẩn → chọn cặp nghiệm */
  const pairOf=L=>{const pm=/^\(?\s*(?:x\s*=\s*)?([^;()]+?)\s*;\s*(?:y\s*=\s*)?([^;()]+?)\s*\)?$/.exec(q.map[L]);if(!pm)return null;const a=lnConst(pm[1],false),b=lnConst(pm[2],false);return a===null||b===null?null:[a,b]};
  if((m=/hệ\s+phương\s+trình\s*:?\s*([\s\S]+?)\s+(?:có|nhận)\s+(?:nghiệm|cặp)/i.exec(st))){
    const parts=m[1].split(/[;\n]|\s+và\s+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length!==2)return null;
    const e1=lnEq(parts[0]),e2=lnEq(parts[1]);if(!e1||!e2)return null;
    const det=e1.a*e2.b-e2.a*e1.b;if(!det)return null;
    const X=(e1.c*e2.b-e2.c*e1.b)/det,Y=(e1.a*e2.c-e2.a*e1.c)/det,pr=Ls.map(pairOf);if(pr.some(x=>!x))return null;
    return only(Ls.filter((L,k)=>near(pr[k][0],X)&&near(pr[k][1],Y)))}
  /* (d) “Cặp số nào là nghiệm của phương trình …” */
  if((m=/cặp số(?:\s+nào)?(?:\s+sau đây)?\s+(?:là\s+)?(?:nghiệm của|làm nghiệm của)\s*(?:phương trình\s*)?:?\s*(.+?=.+?)\s*[?:.]*\s*$/i.exec(st))){
    const e=lnEq(m[1]);if(!e)return null;const pr=Ls.map(pairOf);if(pr.some(x=>!x))return null;
    return only(Ls.filter((L,k)=>Math.abs(e.a*pr[k][0]+e.b*pr[k][1]-e.c)<1e-9))}
  return null}

/* [v14-2] Phép tính số học dạng văn bản: “4.2 + 3.(-1) = 5” (trong tiếng Việt “.” là dấu nhân; “,” là dấu thập phân) */
const AR_SET=/[\d.,+\-\u2212\u2013\u00d7\u00b7*\/\u00f7() ]/;
const AR_BAL=s=>{let d=0;for(const c of s){if(c==='(')d++;else if(c===')'){d--;if(d<0)return false}}return d===0};
function arithScan(S){
  const res=[];
  for(let i=0;i<S.length;i++){
    if(S[i]!=='=')continue;
    const pv=S[i-1]||'',nx=S[i+1]||'';
    if(/[<>\u2260\u2264\u2265!=:]/.test(pv)||nx==='=')continue;
    let a=i;while(a>0&&AR_SET.test(S[a-1]))a--;
    let b=i+1;while(b<S.length&&AR_SET.test(S[b]))b++;
    let L=S.slice(a,i);const stopL=S[a-1]||'',stopR=S[b]||'';
    let labelCut=false;
    const lm=/^\s*(?:\d{1,3}\s*[.)]|\))\s+/.exec(L);
    if(lm){L=L.slice(lm[0].length);labelCut=true}
    const Lt=L.trim().replace(/^[.,]+\s*/,'');
    const R0=S.slice(i+1,b),lead=R0.length-R0.replace(/^\s+/,'').length,Rt=R0.slice(lead).replace(/[\s.,(]+$/,''),rs=i+1+lead,re=rs+Rt.length;
    if(!Lt||!Rt)continue;
    if(!/^[\d(\-\u2212\u2013]/.test(Lt)||!/[\d)]$/.test(Lt)||!/^[\d(\-\u2212\u2013]/.test(Rt)||!/[\d)]$/.test(Rt))continue;
    if(!/[+\u00d7\u00b7*\/\u00f7]|[-\u2212\u2013]|\.\(|\)\./.test(Lt.replace(/^[-\u2212\u2013]/,'')))continue;
    if(/[\^_\u221a\u0001\u0002=]/.test(stopL)||/[\u0001\u0002^_\u221a=\u2260]/.test(stopR))continue;
    if(!labelCut&&/\p{L}/u.test(stopL)&&(!/^\s/.test(L)||/^[\s]*[-+\u2212\u2013]/.test(L)))continue;
    if(/\p{L}/u.test(stopR)&&!/\s/.test(S[b-1]||''))continue;
    if(!AR_BAL(Lt)||!AR_BAL(Rt))continue;
    if(/\d\.\d{3}(?!\d)/.test(Lt)||/\d\.\d{3}(?!\d)/.test(Rt))continue;      /* 1.000.000 (dấu chấm ngăn nghìn) */
    const plain=/^[-\u2212\u2013]?\d+(?:[.,]\d+)?$/.test(Rt),dec=(/[.,](\d+)$/.exec(Rt)||[])[1];
    const eqv=(l,r)=>Math.abs(l-r)<=1e-9*(1+Math.abs(r))||(plain&&dec&&Math.abs(Math.round(l*Math.pow(10,dec.length))/Math.pow(10,dec.length)-r)<1e-9);
    const modes=[];let ok=false;
    for(const dm of [true,false]){const l=lnConst(Lt,dm),r=lnConst(Rt,dm);if(l===null||r===null)continue;modes.push({l,r});if(eqv(l,r))ok=true}
    if(!modes.length||ok)continue;
    const amb=modes.length>1&&Math.abs(modes[0].l-modes[1].l)>1e-9,v=modes[0].l;
    const fx=!amb&&plain&&Math.abs(v*1e4-Math.round(v*1e4))<1e-7;
    res.push({s:rs,e:re,lhs:Lt,rhs:Rt,plain,v,amb,vM:modes[0].l,vD:modes.length>1?modes[1].l:modes[0].l,fixable:fx})}
  return res}
const AR_GUARD=/\bsai\b|không đúng|chưa đúng|khác nhau|\u2260|vô lí|vô lý|mâu thuẫn|giả sử|phản chứng|nhầm|\bkhông bằng\b|phút|tiết|giờ|điểm/i;
function arithFix(doc,body,o,rep,note){
  let n=0;
  all(body,'p').forEach(p=>{
    if(anc(p,'txbxContent'))return;
    for(let it=0;it<6;it++){
      const S=pModel(p).S;if(AR_GUARD.test(S))return;
      const h=arithScan(S).find(x=>x.fixable);if(!h)return;
      const mn=/\u2212/.test(h.lhs+h.rhs)?'\u2212':/\u2013/.test(h.lhs+h.rhs)?'\u2013':'-',neg=h.v<0;
      const txt=(neg?mn:'')+fmtN(Math.abs(h.v)),old=S.slice(h.s,h.e);
      applyEdit(p,{s:h.s,e:h.e,r:txt,k:'ar'});n++;
      note('Đã sửa phép tính sai: “'+h.lhs+' = '+old+'” → “'+h.lhs+' = '+txt+'” (tính lại).')}});
  rep.fix('Sửa kết quả phép tính số học sai (tự tính lại)',n)}
/* [v18] “Cặp số (a; b) là / không là nghiệm của phương trình …”: thay vào phương trình để kiểm tra (phương trình có thể nằm ở đoạn kế tiếp) */
function pairLint(body,add){
  const ps=all(body,'p').filter(p=>!anc(p,'txbxContent'));
  const num=t=>lnConst(String(t).replace(/\s+/g,''),false),fm=x=>String(+(+x).toFixed(6)).replace('.',',');
  ps.forEach((p,i)=>{
    const S=pModel(p).S.replace(/[\u0001\u0002]/g,' '),m=/(?:cặp số|cặp)\s*\(\s*([^;()]+?)\s*;\s*([^;()]+?)\s*\)\s*(không\s+)?(?:là|làm)\s+(?:một\s+)?nghiệm\s+của\s+(?:phương trình\s*)?:?\s*([^\n]*)$/i.exec(S);
    if(!m)return;
    let rest=m[4].trim();
    if(!/=/.test(rest)&&i+1<ps.length)rest=pModel(ps[i+1]).S.replace(/[\u0001\u0002]/g,' ').trim();
    const em=/^([\dxy+\-\u2212\u2013.,()\s]+=[\dxy+\-\u2212\u2013.,()\s]+?)(?=\s*(?:[;,]|\bvì\b|\bnên\b|\bthì\b|\.\s|\.?$))/i.exec(rest);
    if(!em)return;
    const e=lnEq(em[1]),x0=num(m[1]),y0=num(m[2]);
    if(!e||x0===null||y0===null||(e.a===0&&e.b===0))return;
    const val=e.a*x0+e.b*y0,holds=Math.abs(val-e.c)<1e-9,neg=!!m[3];
    if(holds!==neg)return;
    let hint='';
    if(!neg)for(const [sx,sy] of [[1,-1],[-1,1],[-1,-1]])if(Math.abs(e.a*x0*sx+e.b*y0*sy-e.c)<1e-9){hint=' — cặp số đúng có thể là ('+fm(x0*sx)+'; '+fm(y0*sy)+')';break}
    const msg=neg?'cặp số không thỏa phương trình: ghi “('+m[1]+'; '+m[2]+') không là nghiệm” nhưng thay vào “'+em[1].trim()+'” thì đúng'
      :'cặp số không thỏa phương trình: ghi “('+m[1]+'; '+m[2]+') là nghiệm” nhưng thay vào “'+em[1].trim()+'” ra '+fm(val)+' ≠ '+fm(e.c)+hint;
    const s0=S.search(/(?:cặp số|cặp)\s*\(/i),e0=S.indexOf(')',s0)+1;
    add(p,msg,[{s:s0,e:e0}])})}
function arithLint(body,add){
  all(body,'p').forEach(p=>{
    if(anc(p,'txbxContent'))return;
    const S=pModel(p).S;if(!/=/.test(S))return;
    const g=AR_GUARD.test(S);
    arithScan(S).forEach(h=>{
      const f=x=>String(+(+x).toFixed(6)).replace('.',',');
      const msg=(h.amb?'phép tính nghi sai (dấu “.” có thể là nhân hoặc thập phân): “'+h.lhs+' = '+h.rhs+'” — nếu “.” là nhân thì ra '+f(h.vM)+', nếu là thập phân thì ra '+f(h.vD)
        :'phép tính sai: “'+h.lhs+' = '+h.rhs+'” — tính lại ra '+f(h.v))+(g&&!h.amb?' (đoạn có từ cho thấy có thể cố ý ghi sai, hoặc là mốc thời gian/điểm — hãy xem lại)':'');
      add(p,msg,[{s:h.s,e:h.e}])})})}

/* [v14-4] Thống nhất dấu trừ (− – -) và số thập phân (0,5 / 0.5) theo kiểu chiếm đa số, chỉ trong biểu thức số */
function unifyNums(body,o,rep){
  const ps=all(body,'p').filter(p=>!anc(p,'txbxContent')).map(p=>({p,S:pModel(p).S}));
  /* --- dấu trừ --- */
  const hits=[];
  ps.forEach(x=>{const S=x.S;
    for(const m of S.matchAll(/(?<=[\s\u0001\u0002(=;\[])([-\u2212\u2013])(?=\d|\((?!\s)|[xy](?![\p{L}]))/gu)){
      if(!S.slice(0,m.index).trim()||urlish(S,m.index))continue;hits.push({x,i:m.index,ch:m[1]})}
    if(/=/.test(S))for(const m of S.matchAll(/(?<=[\d)xy] )([-\u2212\u2013])(?= [\d(xy])/g))hits.push({x,i:m.index,ch:m[1]})});
  /* [v17] số âm viết cách rời “= - 0,5x”, “( - 2 ;” → “= –0,5x” (gộp dấu trừ vào số, dùng đúng kiểu dấu trừ đa số) */
  const spHits=[];
  ps.forEach(x=>{const S=x.S;for(const m of S.matchAll(/(?<=[=(;] )([-\u2212\u2013]) (?=\d)/g)){if(!S.slice(0,m.index).trim()||urlish(S,m.index))continue;spHits.push({x,i:m.index,ch:m[1]})}});
  const cnt={};hits.forEach(h=>{cnt[h.ch]=(cnt[h.ch]||0)+1});
  const chs=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
  if(chs.length>=2&&hits.length>=3){
    const NM={'-':'gạch nối “-”','\u2212':'dấu trừ “−”','\u2013':'gạch ngang “–”'};
    if(cnt[chs[0]]===cnt[chs[1]])rep.warn('Dấu trừ trong biểu thức dùng lẫn lộn ('+chs.map(c=>NM[c]+' '+cnt[c]+' chỗ').join(', ')+') nhưng số lượng ngang nhau nên chưa tự sửa — hãy chọn một kiểu.');
    else{const maj=chs[0];let n=0;
      hits.filter(h=>h.ch!==maj).forEach(h=>{applyEdit(h.x.p,{s:h.i,e:h.i+1,r:maj,k:'mn'});n++});
      rep.fix('Thống nhất dấu trừ trong biểu thức về '+NM[maj]+' (kiểu đa số) (chỗ)',n)}}
  if(spHits.length){const maj=chs.length?chs[0]:'\u2013';let n=0;
    if(!(chs.length>=2&&cnt[chs[0]]===cnt[chs[1]])){
      const byP=new Map();spHits.forEach(h=>{if(!byP.has(h.x.p))byP.set(h.x.p,[]);byP.get(h.x.p).push(h)});
      byP.forEach((a,p)=>{a.sort((u,v)=>v.i-u.i).forEach(h=>{applyEdit(p,{s:h.i,e:h.i+2,r:maj,k:'mn'});n++})});
      rep.fix('Số âm viết cách rời (“= - 0,5x”) → gộp dấu trừ vào số (“= –0,5x”) (chỗ)',n)}}
  /* --- số thập phân --- */
  const PRE=/(Hình|Bảng|Bài|Câu|Mục|Chương|Phần|Điều|Khoản|Trang|Ví dụ|Sơ đồ|Biểu đồ|Đồ thị|Dạng|Chuyên đề|Tiết|Fig|Table|Section|Chapter|No|Số)\s*$/i;
  let comma=0;const dots=[];
  ps.forEach(x=>{const S=x.S;
    for(const m of S.matchAll(/(?<![\d.,])\d+,\d{1,2}(?![\d,.])/g))comma++;
    if(/\d\.\s?\(|\)\s?\.\s?[\d(]/.test(S))return;                             /* có dấu chấm là phép nhân → bỏ cả đoạn */
    for(const m of S.matchAll(/(?<![\d.,])\d+\.\d{1,2}(?![\d,.])/g)){
      if(PRE.test(S.slice(Math.max(0,m.index-16),m.index))||urlish(S,m.index))continue;
      if(m.index<=1&&/^[ \u0001]/.test(S.slice(m.index+m[0].length)||' '))continue;
      const before=S.slice(0,m.index).replace(/\s+$/,''),after=S.slice(m.index+m[0].length).replace(/^\s+/,'');
      if(/[+\u00d7\u00b7*\/\u00f7]$/.test(before)||/^[+\u00d7\u00b7*\/\u00f7]/.test(after)||/\d\s*[-\u2212\u2013]$/.test(before)||/^[-\u2212\u2013]\s*[\d(]/.test(after))continue;   /* nằm trong phép tính: dấu chấm có thể là nhân */
      dots.push({x,d:m.index+m[0].indexOf('.')})}});
  if(dots.length&&comma>=1&&comma*3>=dots.length){
    dots.forEach(h=>applyEdit(h.x.p,{s:h.d,e:h.d+1,r:',',k:'dc'}));
    rep.fix('Thống nhất số thập phân về dấu phẩy (vd 0.5 → 0,5) (chỗ)',dots.length)}
  else if(dots.length&&comma>=1)rep.warn('Số thập phân dùng lẫn dấu phẩy ('+comma+' chỗ) và dấu chấm ('+dots.length+' chỗ), dấu chấm chiếm đa số nên chưa tự đổi — hãy kiểm tra (dấu chấm có thể là dấu nhân).')}

/* [v14-1,5,7] Kiểm tra KHBD: thời gian, cấu trúc theo CV 5512, đầu trang. Chỉ ghi Comment, không tự sửa */
/* [v15] File có nhiều tiết (Tiết 41, 42, 43…): tách thành từng phần rồi kiểm tra riêng từng tiết (trước đây chỉ kiểm tra tiết đầu).
   File chỉ có 1 bài → chạy đúng như cũ. Thêm: tiết thiếu tiêu đề, công thức A(x) thiếu ngoặc, style Heading dùng cho nội dung thường, “vận tốc lớn nhất” + “kịp/trước”. */
/* [v16] văn bản công thức OMML có tính cả dấu ngoặc của <m:d> (trước đây bỏ sót nên báo nhầm “A(x) thiếu ngoặc”) */
function mathTxtD(n){let s='';
  for(const c of Array.from(n.childNodes)){if(c.nodeType!==1)continue;const ln=c.localName,isM=c.namespaceURI===M;
    if(ln==='rPr'||ln==='ctrlPr'||ln==='dPr')continue;
    if(isM&&ln==='t'){s+=c.textContent;continue}
    if(isM&&ln==='d'){const dp=Array.from(c.children).find(k=>k.localName==='dPr'),
        bc=dp&&Array.from(dp.children).find(k=>k.localName==='begChr'),ec=dp&&Array.from(dp.children).find(k=>k.localName==='endChr'),
        bv=bc?(bc.getAttributeNS(M,'val')||''):'(',ev=ec?(ec.getAttributeNS(M,'val')||''):')';
      s+=bv+Array.from(c.children).filter(k=>k.localName==='e').map(mathTxtD).join(',')+ev;continue}
    s+=mathTxtD(c)}
  return s}
function lintLesson(body,o,add,rep){
  const off=o.lintOff||{};if(off.khbd)return;
  if(!isLessonPlan(body))return;
  const cl=x=>x.replace(/[\u0001\u0002]/g,' ').replace(/\s+/g,' ').trim();
  const PA0=all(body,'p').filter(p=>!anc(p,'txbxContent')),S0=PA0.map(p=>pModel(p).S);
  const TIET=/^(?:Tiết|TIẾT)\s*\d+\b/,MT=/^(?:I\s*[.)]\s*)?(?:MỤC TIÊU|Mục tiêu)\b/;
  const cuts=[];let seenMT=false;
  PA0.forEach((p,i)=>{if(anc(p,'tc'))return;const t=cl(S0[i]);if(!t||t.length>200)return;
    if(TIET.test(t)){cuts.push(i);seenMT=false;return}
    if(MT.test(t)){
      if(seenMT){cuts.push(i);add(p,'bắt đầu một tiết/bài mới (“Mục tiêu”) nhưng thiếu tiêu đề “Tiết n. …” ở phía trên',lead0(S0[i]))}
      seenMT=true}});
  const bnd=[0].concat(cuts.filter(i=>i>0)).filter((v,k,a)=>a.indexOf(v)===k).sort((a,b)=>a-b);
  bnd.forEach((b,k)=>{const e=k+1<bnd.length?bnd[k+1]:PA0.length,PA=PA0.slice(b,e),S=S0.slice(b,e);
    if(!PA.length)return;
    try{lintLessonSeg(body,o,add,rep,{PA,S,skip3:k>0,pre:k>=1?S0.slice(bnd[k-1],b).filter(x=>/^[^\p{L}]*ổn định/iu.test(cl(x))):[]})}catch(err){rep.warn('Kiểm tra KHBD phần '+(k+1)+' gặp lỗi nên đã bỏ qua: '+err.message)}});
  /* công thức dạng Ax<B(x) (thiếu ngoặc ở A(x)) */
  all(body,'oMath',M).forEach(om=>{const t=mathTxtD(om).replace(/\s+/g,''),p=anc(om,'p');
    if(p&&/^[A-Z]x\d?[<>≤≥=][A-Z]\(x\d?\)$/.test(t))add(p,'công thức “'+t+'” có thể thiếu ngoặc ở vế trái — nên viết dạng A(x) < B(x) (và A(x₀) < B(x₀))')});
  PA0.forEach((p,i)=>{
    const t=cl(S0[i]),pp=one(p,'pPr'),st=pp&&one(pp,'pStyle'),sv=st?ga(st,'val'):'';
    if(!anc(p,'tc')&&/^Heading/i.test(sv)&&(/^[-–+•*]\s/.test(t)||t.length>90))add(p,'đoạn đang dùng style tiêu đề ('+sv+') nhưng là nội dung thường — nên đổi về kiểu văn bản thường để không lẫn vào mục lục/định dạng tiêu đề',lead0(S0[i]));
    if(/vận tốc[^.?!]{0,40}(?:lớn nhất|tối đa)/i.test(t)&&/(?:trước|kịp|không muộn|đúng giờ|không quá)/i.test(t))add(p,'đề yêu cầu đến “trước/kịp” giờ thì vận tốc phải “nhỏ nhất/tối thiểu” — kiểm tra lại cụm “lớn nhất/tối đa”',sR(S0[i],'lớn nhất')||sR(S0[i],'tối đa'))});
  /* [v16-a] “GV mời 1 HS … nhận xét bài làm của hai bạn” → số HS không khớp */
  PA0.forEach((p,i)=>{if(i===0)return;const prev=cl(S0[i-1]),cur=cl(S0[i]);let m;
    if((m=/(?:mời|gọi|chỉ định)\s+(\d+)\s*HS/i.exec(prev))&&+m[1]!==2&&/(?:của|bài làm của)\s+(?:hai|2)\s+bạn/i.test(cur))
      add(p,'câu trước ghi “'+m[0]+'” nhưng câu này ghi “hai bạn” — kiểm tra số HS (1 HS → “của bạn”; 2 HS → giữ “hai bạn”)',sR(S0[i],'hai bạn')||lead0(S0[i]))});
  /* [v16-b] số “HĐ” ở cột nội dung lệch số “HĐ” ở cột hoạt động trong cùng một hàng bảng */
  all(body,'tr').forEach(tr=>{const tcs=Array.from(tr.children).filter(c=>c.localName==='tc'&&c.namespaceURI===W);if(tcs.length<2)return;
    const RE=/(?<![\p{L}])HĐ\s*(\d+)\b/u,hdOf=tc=>{const st=new Set();all(tc,'p').forEach(pp=>{for(const m of cl(pModel(pp).S).matchAll(/(?<![\p{L}])HĐ\s*(\d+)\b/gu))st.add(m[1])});return st};
    const lastTc=tcs[tcs.length-1],Ls=hdOf(tcs[0]),Rs=hdOf(lastTc);
    if(!Ls.size||!Rs.size||Array.from(Rs).some(x=>Ls.has(x)))return;
    for(const pp of all(lastTc,'p')){const SS=pModel(pp).S,m=RE.exec(SS);
      if(m){add(pp,'cột “Nội dung cần đạt” ghi “HĐ'+m[1]+'” nhưng cột hoạt động GV–HS nói tới '+Array.from(Ls).map(x=>'HĐ'+x).join(', ')+' — kiểm tra lại số HĐ ở cột nội dung',[{s:m.index,e:m.index+m[0].length}]);break}}});
  /* [v16-c] tiết sau vẫn cùng một BÀI mà phần hướng dẫn về nhà ghi “Chuẩn bị bài sau …” */
  {const info=bnd.map((b,k)=>{const e=k+1<bnd.length?bnd[k+1]:PA0.length;let id=null;
      if(TIET.test(cl(S0[b])))for(let i=b;i<Math.min(e,b+4);i++){const m=/BÀI\s*(\d+)/i.exec(cl(S0[i]));if(m){id=m[1];break}}
      let hw=-1;for(let i=b;i<e;i++)if(/chuẩn bị\s+bài\s+sau/i.test(cl(S0[i])))hw=i;return{id,hw}});
    info.forEach((x,k)=>{const nx=info[k+1];if(nx&&x.id&&nx.id&&x.id===nx.id&&x.hw>=0)add(PA0[x.hw],'tiết sau vẫn là BÀI '+x.id+' nên “Chuẩn bị bài sau” có thể chưa đúng — nên ghi “Chuẩn bị tiết sau: …”',sR(S0[x.hw],'bài sau')||lead0(S0[x.hw]))})}
}
function lintLessonSeg(body,o,add,rep,seg){
  const clean=x=>x.replace(/[\u0001\u0002]/g,' ').replace(/\s+/g,' ').trim();
  const PA=seg.PA,S=seg.S,T=S.map(clean);
  const first=Math.max(0,T.findIndex(t=>/\p{L}/u.test(t)));
  const tmOf=s=>{const m=/\(\s*(\d{1,3})\s*(?:phút|ph)\s*\)/i.exec(s)||/[-\u2013:]\s*(\d{1,3})\s*phút\s*$/i.exec(s);return m?{v:+m[1],m:m[0]}:null};
  const SEC=/^([A-D])\s*[.):]\s*(.{3,})$/,SECK=/HOẠT ĐỘNG|KHỞI ĐỘNG|MỞ ĐẦU|HÌNH THÀNH|LUYỆN TẬP|VẬN DỤNG/i,ACT=/^(?:HOẠT ĐỘNG|Hoạt động|Hoạt Động|HĐ)\s*(\d+)\b/;
  const KIND=[['KĐ',/KHỞI ĐỘNG|MỞ ĐẦU/i,'khởi động/mở đầu','A'],['HT',/HÌNH THÀNH/i,'hình thành kiến thức','B'],['LT',/LUYỆN TẬP/i,'luyện tập','C'],['VD',/VẬN DỤNG/i,'vận dụng','D']];
  const secs=[],acts=[],bound=[];let cur=null;
  T.forEach((t,i)=>{let m;
    if(t.length<=220&&(m=SEC.exec(t))&&SECK.test(m[2])&&(/hoạt động/i.test(m[2])||m[2]===m[2].toUpperCase())&&!secs.some(s=>s.L===m[1])){
      const k=KIND.find(K=>K[1].test(m[2])),tm=tmOf(S[i]);
      cur={L:m[1],i,kind:k?k[0]:null,min:tm?tm.v:null,tm:tm?tm.m:null};secs.push(cur);bound.push(i);return}
    if(t.length<=250&&(m=ACT.exec(t))){bound.push(i);const tm=tmOf(S[i])||((i+1<S.length&&/^\(/.test(T[i+1])&&T[i+1].length<30)?tmOf(S[i+1]):null);
      if(!acts.some(a=>a.sec===(cur&&cur.L)&&a.n===+m[1]&&a.min!=null))acts.push({n:+m[1],i,min:tm?tm.v:null,tm:tm?tm.m:null,sec:cur&&cur.L});return}
    if(/^(?:IV|V)\s*[.)]\s+\p{Lu}/u.test(t))bound.push(i)});
  /* [v16] số thứ tự hoạt động bị nhảy (HĐ1 → HĐ3) và tên hoạt động lệch tên bài */
  {const bySec=new Map();acts.forEach(a=>{const k=a.sec||'';if(!bySec.has(k))bySec.set(k,[]);bySec.get(k).push(a)});
    bySec.forEach(arr=>{for(let k=1;k<arr.length;k++)if(arr[k].n>arr[k-1].n+1)add(PA[arr[k].i],'số thứ tự hoạt động nhảy từ '+arr[k-1].n+' sang '+arr[k].n+' (thiếu “Hoạt động '+(arr[k-1].n+1)+'”) — kiểm tra lại đánh số hoặc thêm tên hoạt động còn thiếu',lead0(S[arr[k].i]))});
    const ttl=T.slice(0,6).join(' ').toLowerCase();
    if(/đường thẳng và đường tròn/.test(ttl)&&!/hai đường tròn/.test(ttl))
      T.forEach((t,i)=>{let mm;if(ACT.test(t)&&(mm=/vị trí tương đối của (?:hai|2) đường tròn/i.exec(t)))add(PA[i],'tên hoạt động ghi “'+mm[0]+'” nhưng bài học là “đường thẳng và đường tròn” — nên sửa cho khớp tên bài',sR(S[i],'hai đường tròn')||lead0(S[i]))})}
  /* ---- 1. THỜI GIAN ---- */
  const secT=secs.filter(s=>s.min!=null);
  secT.forEach(s=>{const as=acts.filter(a=>a.sec===s.L);
    if(as.length>=1&&as.every(a=>a.min!=null)){const sum=as.reduce((q,a)=>q+a.min,0);
      if(sum!==s.min)add(PA[s.i],'thời gian không khớp: mục '+s.L+' ghi '+s.min+' phút nhưng '+as.map(a=>'HĐ'+a.n+' ('+a.min+')').join(' + ')+' cộng lại '+sum+' phút',sR(S[s.i],s.tm))}});
  {let items=null,label='';
    if(secT.length>=2){items=secT;label='các mục '+secT.map(s=>s.L).join(' + ')}
    else if(!secT.length){const at=acts.filter(a=>a.min!=null);if(at.length>=2){items=at;label=at.map(a=>'HĐ'+a.n).join(' + ')}}
    if(items){
      const EX=(()=>{let v=0;const lb=[];let a1=false,b1=false;   /* [v16] cộng thêm phút “ổn định tổ chức” và “hướng dẫn về nhà” (trước đây bị bỏ → báo nhầm lệch giờ) */
        (T.concat((seg.pre||[]).map(clean))).forEach(t=>{if(t.length>160)return;let m1;const mm=/\(\s*(\d{1,2})\s*(?:phút|ph)\s*\)/i;
          if(!a1&&/^[^\p{L}]*ổn định/iu.test(t)&&(m1=mm.exec(t))){a1=true;v+=+m1[1];lb.push('ổn định')}
          else if(!b1&&/^[^\p{L}]*(?:(?:IV|V|VI)\s*[.):]\s*)?hướng dẫn(?: học bài)?(?: (?:về nhà|công việc ở nhà|ở nhà))/iu.test(t)&&(m1=mm.exec(t))){b1=true;v+=+m1[1];lb.push('hướng dẫn về nhà')}});
        return{v,lb}})();
      const sum=items.reduce((q,x)=>q+x.min,0)+EX.v;if(EX.lb.length)label+=' + '+EX.lb.join(' + ');let exp=null,expl=false,m;
      for(let i=0;i<Math.min(T.length,60)&&exp===null;i++){
        if((m=/(?:thời lượng|thời gian thực hiện|thời gian)[^.]{0,60}?(\d+)\s*tiết/i.exec(T[i]))){exp=45*(+m[1]);expl=true}
        else if((m=/(?:thời lượng|thời gian thực hiện)[^.]{0,40}?(\d+)\s*phút/i.exec(T[i]))){exp=+m[1];expl=true}}
      const tgt=items[0],at=tgt.i!==undefined?PA[tgt.i]:PA[first],rg=tgt.tm?sR(S[tgt.i],tgt.tm):null;
      if(exp!==null){if(sum!==exp)add(at,'thời gian không khớp: '+label+' cộng lại '+sum+' phút, nhưng thời lượng ghi '+exp+' phút (45 phút/tiết)',rg)}
      else if((sum>=30&&sum<=60&&sum!==45)||(sum>60&&sum<=180&&sum%45!==0))add(at,'thời gian có thể chưa khớp: '+label+' cộng lại '+sum+' phút, trong khi một tiết là 45 phút (hoặc bội của 45 nếu bài nhiều tiết; không thấy ghi thời lượng khác trong đầu bài)',rg)}}
  /* ---- 2. CẤU TRÚC THEO CV 5512 ---- */
  {const H=[['I',/^I\s*[.)]\s*(?:MỤC TIÊU|Mục tiêu)/,'I. Mục tiêu'],['II',/^II\s*[.)]\s*(?:THIẾT BỊ|Thiết bị|CHUẨN BỊ|Chuẩn bị)/,'II. Thiết bị dạy học và học liệu'],['III',/^III\s*[.)]\s*(?:TIẾN TRÌNH|Tiến trình)/,'III. Tiến trình dạy học']];
    const pos=H.map(h=>T.findIndex(t=>t.length<=160&&h[1].test(t))),found=pos.filter(x=>x>=0).length;
    if(found>=1&&found<3){const miss=H.filter((h,k)=>pos[k]<0).map(h=>h[2]);add(PA[first],'thiếu mục theo cấu trúc CV 5512: '+miss.join('; ')+' (KHBD gồm I. Mục tiêu – II. Thiết bị dạy học và học liệu – III. Tiến trình dạy học)')}
    else if(found===3&&!(pos[0]<pos[1]&&pos[1]<pos[2]))add(PA[pos.filter(x=>x>=0).sort((a,b)=>b-a)[0]],'thứ tự các mục I, II, III bị lệch so với CV 5512 (I. Mục tiêu → II. Thiết bị → III. Tiến trình)');
    const ks=secs.filter(s=>s.kind);
    ks.forEach(s=>{const K=KIND.find(z=>z[0]===s.kind);
      if(K[3]!==s.L)add(PA[s.i],'thứ tự mục A–B–C–D bị lệch: “'+s.L+'.” đang là hoạt động '+K[2]+' (theo chuẩn là mục '+K[3]+')',lead0(S[s.i]))});
    {const rk=ks.map(s=>KIND.findIndex(z=>z[0]===s.kind));for(let k=1;k<rk.length;k++)if(rk[k]<rk[k-1]){add(PA[ks[k].i],'thứ tự các hoạt động bị lệch: mục “'+ks[k].L+'.” ('+KIND[rk[k]][2]+') đứng sau mục “'+ks[k-1].L+'.” ('+KIND[rk[k-1]][2]+') — chuẩn là A khởi động → B hình thành kiến thức → C luyện tập → D vận dụng',lead0(S[ks[k].i]));break}}
    if(ks.length>=2){
      const miss=KIND.filter(K=>!ks.some(s=>s.kind===K[0])).map(K=>K[3]+'. '+K[2]);
      if(miss.length)add(PA[ks[0].i],'thiếu hoạt động theo CV 5512: '+miss.join('; ')+' (4 hoạt động: khởi động – hình thành kiến thức – luyện tập – vận dụng)')}
    const STEP=[['Chuyển giao nhiệm vụ',/chuyển giao|giao nhiệm vụ/i],['Thực hiện nhiệm vụ',/thực hiện nhiệm vụ|bước\s*2\b/i],['Báo cáo, thảo luận',/báo cáo/i],['Kết luận, nhận định',/kết luận|nhận định/i]];
    acts.forEach(a=>{const nb=bound.filter(x=>x>a.i).sort((x,y)=>x-y)[0],end0=nb===undefined?T.length:nb;let end=end0;
        const tcA=anc(PA[a.i],'tc');if(tcA)PA.forEach((pp,ix)=>{if(ix>=end0&&anc(pp,'tc')===tcA)end=Math.max(end,ix+1)});   /* [v16] nhiều hoạt động chung 1 ô bảng: các bước 2–4 ghi chung ở cuối ô vẫn tính */
        const blk=T.slice(a.i,end).join('\n');
      const got=STEP.filter(z=>z[1].test(blk)),miss=STEP.filter(z=>!z[1].test(blk)).map(z=>z[0]);
      if(!miss.length)return;
      if(got.length||/Tổ chức thực hiện/i.test(blk))add(PA[a.i],'hoạt động '+a.n+(a.sec?' (mục '+a.sec+')':'')+' thiếu bước: '+miss.join(', ')+' (CV 5512: 4 bước Chuyển giao – Thực hiện – Báo cáo, thảo luận – Kết luận, nhận định)',lead0(S[a.i]))}) }
  /* ---- 3. ĐẦU TRANG: dòng còn dở, thiếu/để trống Ngày soạn – Tuần (chỉ kiểm tra ở phần đầu file) ---- */
  if(!seg.skip3){const hf=String(rep.hfText||'').split('\n').map(clean).filter(Boolean),head=T.slice(0,40);
    const trow=p=>{const tr=anc(p,'tr');return tr?clean(all(tr,'p').map(q=>pModel(q).S).join(' ')):null};
    hf.forEach(t=>{if(/^(?:Trường|TRƯỜNG)\s.+[-\u2013\u2014]\s*$/.test(t))rep.warn('Tiêu đề đầu trang còn dở: “'+t.slice(0,60)+'” kết thúc bằng gạch nối — thiếu phần sau (vd tên tổ/môn). Hãy sửa trong Header.')});
    head.forEach((t,i)=>{if(/^(?:Trường|TRƯỜNG)\s.+[-\u2013\u2014]\s*$/.test(t)){const k=S[i].replace(/[\s\u0001\u0002]+$/,'').length-1;add(PA[i],'tiêu đề đầu trang còn dở: “'+t.slice(0,60)+'” kết thúc bằng gạch nối — thiếu phần sau (vd tên tổ/môn)',[{s:Math.max(0,k),e:k+1}])}});
    const LBL=[['Ngày soạn',/ngày soạn/i,/ngày soạn\s*[:：]?\s*([.…_\s\/\-]*)(?=$|\s*(?:ngày dạy|tuần|tiết|lớp|môn))/i],['Tuần',/(?:^|[\s|])tuần\b/i,/(?:^|[\s|])tuần\s*[:：]?\s*([.…_\s\/\-]*)(?=$|\s*(?:ngày|tiết|lớp|môn))/i]];
    LBL.forEach(([nm,has,emp])=>{
      const all0=head.concat(hf);
      if(!all0.some(t=>has.test(t))){add(PA[first],'thiếu “'+nm+'” ở đầu giáo án (KHBD cần ghi ngày soạn và tuần)');return}
      for(let i=0;i<head.length;i++){if(!has.test(head[i]))continue;
        const row=trow(PA[i]),txt=row!==null?row:head[i];
        if(emp.test(txt)&&/^[.…_\s\/\-]*$/.test((emp.exec(txt)||[])[1]||'x')){const m=has.exec(head[i]);add(PA[i],'“'+nm+'” chưa điền nội dung',m?sR(S[i],m[0].trim()):null)}
        break}})}}
const lead0=s=>{const a=s.length-s.replace(/^[\s\u0001]+/,'').length;return[{s:a,e:Math.min(s.length,a+14)}]};

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
  rep.fix('Xóa dấu chấm thừa (vd “. Phương trình…” đầu đoạn, “B. .x”)',cnt.sd||0);
  rep.fix('Gộp dấu câu lặp (,, ;; ..)',cnt.dp||0);
  rep.fix('Bỏ từ chức năng bị lặp liền nhau (vd “của của”)',cnt.dw||0);
  rep.fix('Sửa lỗi chính tả thường gặp (vd “xác xuất” → “xác suất”) (chỗ)',cnt.cw||0);
  rep.fix('Đổi số thập phân sang dấu phẩy (vd 3.5 → 3,5) (chỗ)',cnt.dc||0);
  rep.fix('Viết hoa chữ cái đầu câu sau dấu kết câu (chỗ)',cnt.cp||0);
  rep.fix('Đổi ngoặc kép thẳng (") thành ngoặc kép cong “ ”',cnt.qt||0);
  rep.fix('Chuẩn hóa dấu tiếng Việt về Unicode dựng sẵn (NFC)',nfc);
  rep.fix('Bỏ Tab dùng để thụt đầu dòng thủ công',tabs)}

function renumber(body,rep){
  const cnt={};let fixed=0,inKey=false;const ex=[];
  all(body,'p').forEach(p=>{
    if(anc(p,'tc')||anc(p,'txbxContent'))return;
    const ts=all(p,'t').filter(t=>!inMath(t));if(!ts.length)return;
    const txt=ts.map(t=>t.textContent).join(''),tr=txt.trim();
    if(tr.length<90&&/^(ĐỀ|Đề)\s+(KIỂM TRA|THI|SỐ)\b/i.test(tr))inKey=false;
    if(tr.length<90&&/^(BẢNG\s+)?(ĐÁP ÁN|HƯỚNG DẪN CHẤM)/i.test(tr)&&cnt&&Object.keys(cnt).length){inKey=true;for(const k in cnt)delete cnt[k];return}
    if(inKey)return;   /* [v8] phần Đáp án/Hướng dẫn chấm: không đánh số lại (tránh sửa nhầm và che mất lỗi thiếu/trùng đáp án) */
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

/* ====================================================================
   [v19] SỬA CÁC LỖI CÒN TỒN TRONG GIÁO ÁN
   · Trắc nghiệm nằm TRONG Ô BẢNG · bảng giáo án 2 cột · ghép/tách đoạn · tiêu đề · đáp số cặp số · đầu trang · MathType → Equation
   ==================================================================== */
const mcqBoxes=body=>[body].concat(all(body,'tc'));
function mcqTop(e,body){let t=e;while(t.parentNode&&t.parentNode!==body)t=t.parentNode;return t}
function mcqCellW(tc,def){const cp=one(tc,'tcPr'),w=cp&&one(cp,'tcW');
  if(w&&ga(w,'type')==='dxa'){const v=parseInt(ga(w,'w'),10)||0;if(v>600)return v-216}
  return def}
const ptxt=p=>ptext(p).replace(/\s+/g,' ').trim();
const isCenterP=p=>{const pp=one(p,'pPr'),j=pp&&one(pp,'jc');return !!j&&ga(j,'val')==='center'};
const hasObjP=p=>all(p,'drawing').length||all(p,'pict').length||all(p,'object').length||p.getElementsByTagNameNS(M,'oMath').length||all(p,'sym').length;
const lpNote=(rep,m)=>{rep.notes=rep.notes||[];if(rep.notes.length<60)rep.notes.push(m)};
/* nối nội dung đoạn `from` vào cuối đoạn `to` (cách một dấu cách) rồi xóa `from` */
function moveInto(doc,to,from){
  const tt=all(to,'t').filter(t=>!inMath(t)),ft=all(from,'t').filter(t=>!inMath(t)),lt=tt[tt.length-1],ff=ft[0];
  if(lt&&ff&&!/\s$/.test(lt.textContent)&&!/^\s/.test(ff.textContent)){lt.textContent=lt.textContent+' ';setXS(lt)}
  Array.from(from.childNodes).forEach(c=>{if(c.nodeType===1&&c.namespaceURI===W&&c.localName==='pPr')return;to.appendChild(c)});
  rm(from)}
/* cắt một đoạn tại vị trí `pos` (tính theo pModel(p).S) thành hai đoạn; trả về đoạn mới (phần sau) */
function splitParaAt(doc,p,pos){
  if(hasSect(p))return null;
  const nd=pModel(p).nodes.find(x=>pos>=x.s&&pos<x.s+x.n);if(!nd)return null;
  let r=nd.t.parentNode;if(!r||r.localName!=='r'||r.namespaceURI!==W||r.parentNode!==p)return null;
  explode(doc,r);r=nd.t.parentNode;if(!r||r.parentNode!==p)return null;
  let cut=r;if(pos-nd.s>0)cut=splitRun(doc,r,nd.t,pos-nd.s);
  const np=p.cloneNode(false);Array.from(np.attributes).forEach(a=>{if(/^(paraId|textId)$/.test(a.localName))np.removeAttribute(a.name)});
  const pp=one(p,'pPr');if(pp)np.appendChild(pp.cloneNode(true));
  const mv=[];for(let n=cut;n;n=n.nextSibling)mv.push(n);
  mv.forEach(x=>np.appendChild(x));
  p.parentNode.insertBefore(np,p.nextSibling);return np}
function trimTail(p){const ts=all(p,'t').filter(t=>!inMath(t));for(let i=ts.length-1;i>=0;i--){const v=ts[i].textContent,w=v.replace(/\s+$/,'');if(w!==v)ts[i].textContent=w;if(w)break}}

/* ---- Bảng 2 cột của giáo án (HOẠT ĐỘNG CỦA GV VÀ HS | NỘI DUNG CẦN ĐẠT): đường chia cột phải thẳng hàng ở mọi hàng; bảng rộng vừa đúng vùng chữ ---- */
function normTwoCol(doc,tbl,av,lp){
  const grid=one(tbl,'tblGrid');if(!grid)return false;
  const cols=wk(grid,'gridCol'),rows=wk(tbl,'tr');
  if(cols.length<2||rows.length<3||av<3000)return false;
  const ws=cols.map(c=>parseInt(ga(c,'w'),10)||0),tot=ws.reduce((a,b)=>a+b,0),cuts=[];let bad=false,one1=0;
  for(const tr of rows){
    const tp=one(tr,'trPr');
    if(tp&&['gridBefore','gridAfter','wBefore','wAfter'].some(n=>one(tp,n))){bad=true;break}
    const tcs=wk(tr,'tc');if(tcs.length<1||tcs.length>2){bad=true;break}
    const span=[];
    for(const tc of tcs){const cp=one(tc,'tcPr');if(cp&&(one(cp,'vMerge')||one(cp,'hMerge'))){bad=true;break}const gs=cp&&one(cp,'gridSpan');span.push(gs?(parseInt(ga(gs,'val'),10)||1):1)}
    if(bad||span.reduce((a,b)=>a+b,0)!==cols.length){bad=true;break}
    if(tcs.length===2)cuts.push(ws.slice(0,span[0]).reduce((a,b)=>a+b,0));else one1++}
  if(bad||!cuts.length||!tot)return false;
  const same=cuts.every(v=>Math.abs(v-cuts[0])<=2),W2=lp?av:Math.min(tot,av);
  const need=!same||(lp&&(Math.abs(tot-W2)>5||cols.length!==2));
  if(!need)return false;
  const ratio=Math.min(0.8,Math.max(0.2,cuts[0]/tot)),L=Math.round(W2*ratio),R=W2-L;
  while(grid.firstChild)grid.removeChild(grid.firstChild);
  [L,R].forEach(w=>{const g=mk(doc,'gridCol');sa(g,'w',w);grid.appendChild(g)});
  rows.forEach(tr=>{const tcs=wk(tr,'tc');
    tcs.forEach((tc,k)=>{let cp=one(tc,'tcPr');if(!cp){cp=mk(doc,'tcPr');tc.insertBefore(cp,tc.firstChild)}
      const gs=one(cp,'gridSpan');
      if(tcs.length===1)sa(sc(doc,cp,'gridSpan',ORD.tcPr),'val',2);else if(gs)rm(gs);
      const tw=sc(doc,cp,'tcW',ORD.tcPr);sa(tw,'w',tcs.length===1?W2:(k===0?L:R));sa(tw,'type','dxa')})});
  let pr=one(tbl,'tblPr');if(!pr){pr=mk(doc,'tblPr');tbl.insertBefore(pr,tbl.firstChild)}
  const tw=sc(doc,pr,'tblW',ORD.tblPr);sa(tw,'w',W2);sa(tw,'type','dxa');
  sa(sc(doc,pr,'tblLayout',ORD.tblPr),'type','fixed');
  return true}
function twoColPass(doc,body,secs,o,rep,ctx){
  const bk=secs.bk;let n=0;
  all(body,'tbl').forEach(tbl=>{
    if(anc(tbl,'tc'))return;
    let top=tbl;while(top.parentNode&&top.parentNode!==body)top=top.parentNode;
    const i=bk.indexOf(top),sec=secs.find(s=>s.end>=i)||secs[secs.length-1];
    const pr=one(tbl,'tblPr'),ind=pr&&one(pr,'tblInd');let il=0;if(ind){const v=parseInt(ga(ind,'w'),10)||0;if(v>=0&&v<=1440)il=v}
    if(normTwoCol(doc,tbl,Math.floor(sec.aw-il),!!(ctx&&ctx.lp)))n++});
  rep.fix('Bảng 2 cột (giáo án): đường chia cột thẳng hàng ở mọi hàng và bảng rộng vừa đúng vùng chữ (bảng)',n)}
function afterTableGap(doc,body,rep){
  let n=0;
  all(body,'tbl').forEach(tbl=>{
    if(tbl.parentNode!==body)return;
    const nx=tbl.nextElementSibling;if(!nx||nx.localName!=='p'||nx.namespaceURI!==W||isE(nx)||hasSect(nx))return;
    let pp=one(nx,'pPr');if(!pp){pp=mk(doc,'pPr');nx.insertBefore(pp,nx.firstChild)}
    const sp=sc(doc,pp,'spacing',ORD.pPr),bf=parseInt(ga(sp,'before'),10)||0;
    if(bf<120){['beforeLines','beforeAutospacing'].forEach(a=>sp.removeAttributeNS(W,a));sa(sp,'before',120);n++}});
  rep.fix('Giáo án: cách 6 pt giữa đáy bảng và đoạn kế tiếp (không dính sát bảng) (chỗ)',n)}

/* ---- Tiêu đề bài: gom các dòng IN HOA bị tách thành nhiều đoạn, căn giữa, in đậm đồng nhất ---- */
function lpTitle(doc,body,rep){
  const kids=Array.from(body.children);
  const isT=p=>{if(!p||p.localName!=='p'||p.namespaceURI!==W||hasSect(p)||hasObjP(p)||pInfo(p).list)return false;
    const t=ptxt(p).replace(/\([^)]*\)/g,' ').trim();if(!t||t.length>110)return false;
    const up=(t.match(/\p{Lu}/gu)||[]).length,lo=(t.match(/\p{Ll}/gu)||[]).length;return up>=3&&lo<=Math.max(1,up*0.1)};
  let st=-1;for(let i=0;i<Math.min(kids.length,12);i++){if(isT(kids[i])){st=i;break}}
  if(st<0)return;
  const blk=[];for(let i=st;i<kids.length&&blk.length<8&&isT(kids[i]);i++)blk.push(kids[i]);
  const CONN=/^(VÀ|HOẶC|CỦA|VỚI|TRONG|VỀ|CHO|BẰNG|TỪ|ĐẾN|THEO|TẠI|CÁC|NHỮNG)(?=\s|$)/u;
  let merged=0,fm=0;
  for(let k=0;k+1<blk.length;){
    const a=ptxt(blk[k]),b=ptxt(blk[k+1]);
    if(!/[.:;!?]$/.test(a)&&CONN.test(b)){moveInto(doc,blk[k],blk[k+1]);blk.splice(k+1,1);merged++}else k++}
  blk.forEach(p=>{
    let pPr=one(p,'pPr');if(!pPr){pPr=mk(doc,'pPr');p.insertBefore(pPr,p.firstChild)}
    const j=sc(doc,pPr,'jc',ORD.pPr);if(ga(j,'val')!=='center'){sa(j,'val','center');fm++}
    const ie=one(pPr,'ind');if(ie){rm(ie);fm++}
    wk(p,'r').forEach(r=>{if(!wk(r,'t').length)return;
      let rp=one(r,'rPr');if(!rp){rp=mk(doc,'rPr');r.insertBefore(rp,r.firstChild)}
      const b=one(rp,'b');
      if(!b){sc(doc,rp,'b',ORD.rPr);fm++}else if(/^(0|false|off)$/i.test(ga(b,'val'))){b.removeAttributeNS(W,'val');fm++}
      const bc=one(rp,'bCs');if(!bc)sc(doc,rp,'bCs',ORD.rPr);else if(/^(0|false|off)$/i.test(ga(bc,'val')))bc.removeAttributeNS(W,'val')})});
  if(merged)lpNote(rep,'Đã ghép '+merged+' dòng tiêu đề bị tách thành đoạn riêng: “'+ptxt(blk[0]).slice(0,90)+'…”');
  rep.fix('Tiêu đề bài: ghép các dòng tiêu đề bị tách nhiều đoạn, căn giữa, in đậm đồng nhất',merged+fm)}

/* ---- Đoạn bị ngắt giữa câu / đặt lạc chỗ / gạch đầu dòng nằm giữa đoạn ---- */
function lpOrphans(doc,body,rep){
  let nm=0,nv=0;
  mcqBoxes(body).forEach(box=>{
    const ok=p=>!hasSect(p)&&!hasPB(p)&&!hasObjP(p)&&!pInfo(p).list;
    const lowStart=t=>/^\p{Ll}{2,}/u.test(t)&&!/[=+<>]/.test(t.slice(0,30))&&!/^[a-d][.)]/i.test(t);
    let ps=wk(box,'p');
    /* B. “các HS khác lắng nghe…” bị đặt lạc xuống sau Bước 3 → nối vào đoạn Bước 2 đang kết thúc bằng “;” */
    for(let i=1;i<ps.length;i++){
      const p=ps[i],t=ptxt(p);
      if(!/^các HS khác(?=\s)/u.test(t)||!ok(p)||isCenterP(p))continue;
      if(!/[.!?…]$/.test(ptxt(ps[i-1])))continue;
      let c=-1;
      for(let k=i-2;k>=Math.max(0,i-14);k--){const tk=ptxt(ps[k]);
        if(/[;,]$/.test(tk)&&ps[k+1]&&/^[-–]?\s*Bước\s*\d/u.test(ptxt(ps[k+1]))&&!/các HS khác/u.test(tk)&&ok(ps[k])){c=k;break}}
      if(c<0)continue;
      lpNote(rep,'Đã chuyển đoạn lạc chỗ “'+t.slice(0,50)+'…” về nối vào cuối bước 2 (“…'+ptxt(ps[c]).slice(-40)+'”).');
      moveInto(doc,ps[c],p);nm++;ps=wk(box,'p');i=Math.max(0,i-1)}
    /* A. đoạn bắt đầu bằng chữ thường, đoạn trước chưa kết thúc câu → là phần tiếp của đoạn trước */
    for(let i=1;i<ps.length;i++){
      const p=ps[i],pv=ps[i-1],t=ptxt(p),a=ptxt(pv);
      if(!t||!a||!lowStart(t)||!ok(p)||!ok(pv)||isCenterP(p)||isCenterP(pv))continue;
      if(/[.!?…]$/.test(a)||a.length<8)continue;
      lpNote(rep,'Đã ghép đoạn bị ngắt giữa câu: “…'+a.slice(-35)+'” + “'+t.slice(0,35)+'…”.');
      moveInto(doc,pv,p);nv++;ps=wk(box,'p');i--}});
  rep.fix('Giáo án: nối “các HS khác lắng nghe…” bị đặt lạc chỗ về đúng bước (đoạn)',nm);
  rep.fix('Giáo án: ghép đoạn bị ngắt giữa câu (đoạn con bắt đầu bằng chữ thường) (chỗ)',nv)}
function lpSplit(doc,body,rep){
  let n=0;
  all(body,'p').filter(p=>!anc(p,'txbxContent')).forEach(p0=>{
    let p=p0;
    for(let it=0;it<6&&p;it++){
      if(hasSect(p))return;
      const S=pModel(p).S;if(!/^\s*[-–+*•]/.test(S))return;
      const re=/:(\s+)([-–])\s*\p{Lu}/gu;let m,hit=null;
      while((m=re.exec(S))){if(m.index<=70&&!/[\u0001\u0002]/.test(S.slice(0,m.index))){hit=m;break}}
      if(!hit)return;
      const np=splitParaAt(doc,p,hit.index+1+hit[1].length);if(!np)return;
      trimTail(p);n++;lpNote(rep,'Đã tách gạch đầu dòng nằm giữa đoạn thành dòng riêng: “'+S.slice(0,hit.index+1).trim().slice(0,60)+'” / “'+ptxt(np).slice(0,40)+'…”.');
      p=np}});
  rep.fix('Giáo án: tách gạch đầu dòng nằm giữa đoạn (“…: - …”) thành dòng riêng (chỗ)',n)}
function lpFix(doc,body,o,rep){lpTitle(doc,body,rep);lpOrphans(doc,body,rep);lpSplit(doc,body,rep)}

/* ---- “Cặp số (a; b) là nghiệm của phương trình …” sai dấu: sửa khi phép thay số ngay dưới cho biết đúng đáp số ---- */
function pairFix(doc,body,rep){
  const ps=all(body,'p').filter(p=>!anc(p,'txbxContent'));let n=0;
  const num=t=>lnConst(String(t).replace(/\s+/g,''),false),esc=t=>String(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  ps.forEach((p,i)=>{
    const S=pModel(p).S.replace(/[\u0001\u0002]/g,' '),
      m=/(?:cặp số|cặp)\s*\(\s*([^;()]+?)\s*;\s*([^;()]+?)\s*\)\s*(?:là|làm)\s+(?:một\s+)?nghiệm\s+của\s+(?:phương trình\s*)?:?\s*([^\n]*)$/i.exec(S);
    if(!m)return;
    if(/không\s+(?:là|làm)\s+(?:một\s+)?nghiệm/i.test(S))return;
    let rest=m[3].trim(),evS=S;
    if(!/=/.test(rest)&&i+1<ps.length){evS=pModel(ps[i+1]).S.replace(/[\u0001\u0002]/g,' ');rest=evS.trim()}
    const em=/^([\dxy+\-\u2212\u2013.,()\s]+=[\dxy+\-\u2212\u2013.,()\s]+?)(?=\s*(?:[;,]|\bvì\b|\bnên\b|\bthì\b|\.\s|\.?$))/i.exec(rest);
    if(!em)return;
    const e=lnEq(em[1]),x0=num(m[1]),y0=num(m[2]);
    if(!e||x0===null||y0===null||(e.a===0&&e.b===0))return;
    if(Math.abs(e.a*x0+e.b*y0-e.c)<1e-9)return;
    const cands=[];for(const [sx,sy] of [[1,-1],[-1,1],[-1,-1]])if(Math.abs(e.a*x0*sx+e.b*y0*sy-e.c)<1e-9)cands.push([sx,sy]);
    if(cands.length!==1)return;
    const [sx,sy]=cands[0],jobs=[];let minus='–',good=true;
    [[sx,x0,m[1],0],[sy,y0,m[2],1]].forEach(([sg,v,tok,k])=>{
      if(sg!==-1)return;
      const t=String(tok).trim();
      if(!(v>0)||/^[-\u2212\u2013]/.test(t)){good=false;return}
      const ev=new RegExp('\\(\\s*([\\u2013\\u2212-])\\s*'+esc(t)+'\\s*\\)').exec(evS);
      if(!ev){good=false;return}
      minus=ev[1];jobs.push({k:k,tok:t})});
    if(!good||!jobs.length)return;
    const s0=S.search(/(?:cặp số|cặp)\s*\(/i),e0=S.indexOf(')',s0)+1;if(s0<0||e0<=s0)return;
    const pairTxt=S.slice(s0,e0),pos={0:s0+pairTxt.indexOf(m[1],pairTxt.indexOf('(')+1),1:s0+pairTxt.lastIndexOf(m[2])};
    const old=pairTxt;
    jobs.sort((a,b)=>b.k-a.k).forEach(j=>{applyEdit(p,{s:pos[j.k],e:pos[j.k]+j.tok.length,r:minus+j.tok,k:'pair'})});
    const nw=pModel(p).S.replace(/[\u0001\u0002]/g,' ').slice(s0,s0+pairTxt.length+jobs.length);
    n++;lpNote(rep,'Đã sửa đáp số: “'+old+'” → “'+nw.replace(/\).*$/,')')+'” (thay vào “'+em[1].trim()+'” mới đúng, khớp phép thay số ngay dưới).')});
  rep.fix('Sửa đáp số “cặp số là nghiệm” sai dấu (khớp phép thay số ngay dưới)',n)}

/* ---- Đầu trang: bỏ dấu gạch nối thừa cuối dòng (“Trường THCS Đa Tốn-”) ---- */
function hdrDash(d,rep){
  let n=0;
  all(d,'p').forEach(p=>{const S=pModel(p).S,m=/([\p{L}\d])(\s*[-–—]\s*)$/u.exec(S);
    if(!m)return;applyEdit(p,{s:m.index+1,e:S.length,r:'',k:'hdr'});n++});
  rep.fix('Đầu trang: bỏ dấu gạch nối thừa cuối dòng (dòng)',n)}

/* ---- MathType (đối tượng OLE) → Equation của Word ---- */
async function mtPass(zip,doc,relsd,ctx,rep){
  const API=window.MathTypeOle;if(!API||!relsd)return;
  const OO='urn:schemas-microsoft-com:office:office',VV='urn:schemas-microsoft-com:vml';
  const isEq=ob=>{const e=ob.getElementsByTagNameNS(OO,'OLEObject')[0];return e&&/^Equation\.DSMT/i.test(e.getAttribute('ProgID')||'')?e:null};
  const objs=all(doc,'object').concat(all(doc,'pict')).filter(isEq);
  if(!objs.length)return;
  let ok=0;const bad=[],texts=[],drop=new Set();
  for(const ob of objs){
    const ole=isEq(ob),rid=ole.getAttributeNS(R,'id'),rel=ctx.rels[rid];let res=null;
    if(rel&&rel.m!=='External'){const f=zip.file(rs('word/',rel.t));
      if(f){try{res=API.convert(await f.async('uint8array'))}catch(e){res={err:String(e&&e.message)}}}}
    if(!res||!res.xml){bad.push(res&&res.err?res.err:'không đọc được dữ liệu công thức');continue}
    let r=ob.parentNode;if(!r||r.namespaceURI!==W||r.localName!=='r')continue;
    explode(doc,r);r=ob.parentNode;if(!r||r.localName!=='r'||!r.parentNode)continue;
    const wrap=new DOMParser().parseFromString('<x xmlns:m="'+M+'" xmlns:w="'+W+'">'+res.xml+'</x>','application/xml');
    if(wrap.getElementsByTagName('parsererror').length){bad.push('XML công thức dựng không hợp lệ');continue}
    const nm=doc.importNode(wrap.documentElement.firstElementChild,true),rp=one(r,'rPr'),sz=rp&&one(rp,'sz'),szc=rp&&one(rp,'szCs');
    if(sz)Array.from(nm.getElementsByTagNameNS(W,'rPr')).forEach(x=>{x.appendChild(sz.cloneNode(true));if(szc)x.appendChild(szc.cloneNode(true))});
    const ids=[rid].concat(Array.from(ob.getElementsByTagNameNS(VV,'imagedata')).map(x=>x.getAttributeNS(R,'id')));
    r.parentNode.replaceChild(nm,r);ok++;texts.push(res.text);ids.forEach(i=>i&&drop.add(i))}
  if(ok){
    const used=new Set();Array.from(doc.getElementsByTagName('*')).forEach(e=>Array.from(e.attributes).forEach(a=>{if(a.namespaceURI===R)used.add(a.value)}));
    drop.forEach(id=>{if(used.has(id))return;
      const el=Array.from(relsd.documentElement.children).find(x=>x.getAttribute('Id')===id);if(!el)return;
      const tg=el.getAttribute('Target'),ext=el.getAttribute('TargetMode')==='External';rm(el);delete ctx.rels[id];
      if(!ext&&!Array.from(relsd.documentElement.children).some(x=>x.getAttribute('Target')===tg)){const path=rs('word/',tg);if(zip.file(path))zip.remove(path)}});
    ctx.relsTouched=true;
    rep.fix('Công thức MathType (đối tượng nhúng) → Equation của Word (cùng font, cùng cỡ chữ với văn bản) (công thức)',ok);
    lpNote(rep,'Đã đổi '+ok+' công thức MathType sang Equation của Word: '+texts.slice(0,12).map(t=>'“'+t+'”').join(', ')+(texts.length>12?'…':'')+' — hãy liếc lại các công thức quan trọng.')}
  if(bad.length){const u=Array.from(new Set(bad));rep.warn(bad.length+' công thức MathType chưa đọc hiểu trọn vẹn nên được GIỮ NGUYÊN (không đoán bừa): '+u.slice(0,3).join('; ')+'.')}}

/* ====================================================================
   NÂNG CẤP v4 — Trắc nghiệm: căn đáp án A/B/C/D thẳng hàng, cách đều (4 cột / 2×2 / mỗi dòng 1 đáp án)
   · Giữ câu hỏi đi cùng đáp án · Bảng ngắn không bị tách sang 2 trang
   ==================================================================== */
const OPT_RE=/(^|[\s\u0001\u0002])([A-D])[.)]/g;
const optLead=S=>/^[\s\u0001]*[A-Da-d][.)]/.test(S);
const MCQ_OK_KIDS=new Set(['r','proofErr','bookmarkStart','bookmarkEnd','commentRangeStart','commentRangeEnd']);
function optLabels(S){
  const out=[];let m;OPT_RE.lastIndex=0;
  while((m=OPT_RE.exec(S))){out.push({L:m[2],pos:m.index+m[1].length});OPT_RE.lastIndex=m.index+m[1].length+2}
  return out}
const isWsRun=n=>{
  if(n.namespaceURI!==W||n.localName!=='r')return false;
  const ks=Array.from(n.children).filter(c=>c.localName!=='rPr');
  return ks.every(c=>c.namespaceURI===W&&(c.localName==='tab'||c.localName==='lastRenderedPageBreak'||(c.localName==='br'&&ga(c,'type')!=='page')||(c.localName==='t'&&!c.textContent.trim())))};
function trimFrag(a){
  while(a.length&&isWsRun(a[0]))a.shift();
  while(a.length&&isWsRun(a[a.length-1]))a.pop();
  const lastT=n=>{if(n.namespaceURI!==W||n.localName!=='r')return null;const ts=wk(n,'t');return ts.length===1&&Array.from(n.children).every(c=>c.localName==='rPr'||c.localName==='t')?ts[0]:null};
  if(a.length){const t=lastT(a[a.length-1]);if(t){t.textContent=t.textContent.replace(/[ \t\u00a0\u3000]+$/,'');setXS(t)}}
  while(a.length&&isWsRun(a[a.length-1]))a.pop();
  return a}
/* Ước lượng bề rộng (twips) của một đáp án */
const CW=c=>/[0-9]/.test(c)?0.5:/[A-ZÀ-Ỹ]/.test(c)?0.68:/\s/.test(c)?0.25:/[.,;:'"!()\-]/.test(c)?0.32:/[\u2E80-\u9FFF]/.test(c)?1:0.47;
function estW(nodes,baseSz,sizeOf){
  let tw=0;
  const run=(r,sz)=>{
    const pr=one(r,'rPr'),se=pr&&one(pr,'sz'),pt=(se?+ga(se,'val'):sz)/2,b=pr&&one(pr,'b')?1.07:1;
    r.childNodes.forEach(c=>{
      if(c.nodeType!==1)return;
      if(c.namespaceURI===W){
        if(c.localName==='t'){let w=0;for(const ch of c.textContent)w+=CW(ch);tw+=w*pt*20*b}
        else if(c.localName==='tab')tw+=pt*20*2;
        else if(c.localName==='object'||c.localName==='pict'){
          const sh=c.getElementsByTagName('v:shape')[0]||c.getElementsByTagName('v:imagedata')[0],st=sh?(sh.getAttribute('style')||''):'',m=/width:\s*([\d.]+)pt/.exec(st);
          tw+=(m?+m[1]:60)*20}
        else if(c.localName==='drawing'){const ex=c.getElementsByTagNameNS(WP,'extent')[0];tw+=ex?(+ex.getAttribute('cx')||0)/635:1800}}})};
  const mathW=m=>{let w=0;all(m,'t',M).forEach(t=>{w+=t.textContent.length*0.55*baseSz/2*20});
    ['f','rad','nary','d','acc','bar','box'].forEach(n=>{w+=all(m,n,M).length*0.35*baseSz/2*20});return w};
  const walk=n=>{
    if(n.nodeType!==1)return;
    if(n.namespaceURI===M&&n.localName==='oMath'){tw+=mathW(n);return}
    if(n.namespaceURI===W&&n.localName==='r'){run(n,baseSz);return}
    Array.from(n.children).forEach(walk)};
  nodes.forEach(walk);return tw*1.1}
const hasMulti=nodes=>nodes.some(n=>n.nodeType===1&&n.namespaceURI===W&&n.localName==='r'&&all(n,'br').some(b=>ga(b,'type')!=='page'));
function indStart(pPr){
  const ie=pPr&&one(pPr,'ind');if(!ie)return 0;
  const L=+ga(ie,'left')||+ga(ie,'start')||0,H=+ga(ie,'hanging')||0,F=+ga(ie,'firstLine')||0;
  return Math.max(0,Math.min(1134,L-H+F))}
function setInd(doc,pPr,L){
  const x=sc(doc,pPr,'ind',ORD.pPr);
  ['start','end','right','hanging','hangingChars','firstLine','firstLineChars','leftChars','startChars'].forEach(a=>x.removeAttributeNS(W,a));
  sa(x,'left',L)}
/* Tìm các nhóm đáp án A,B,C,D (1 đoạn chứa cả 4 / 2 đoạn / 4 đoạn) ở mức thân văn bản */
function mcqFind(body){
  const blocks=[];let bad=0;
  mcqBoxes(body).forEach(box=>{const kids=Array.from(box.children);
  for(let i=0;i<kids.length;i++){
    const p=kids[i];
    if(p.localName!=='p'||p.namespaceURI!==W)continue;
    const S0=pModel(p).S,L0=optLabels(S0);
    if(!L0.length||L0[0].L!=='A')continue;
    const pre0=S0.slice(0,L0[0].pos);let split=false;
    if(!/^[\s\u0001]*$/.test(pre0)){if(/\u0001[ \t]*$/.test(pre0))split=true;else continue}
    const ps=[p],seq=L0.map(x=>x.L);let j=i+1,ok='ABCD'.indexOf(seq.join(''))===0;
    while(ok&&seq.join('')!=='ABCD'&&seq.length<4){
      const q=kids[j];if(!q||q.localName!=='p'||q.namespaceURI!==W){ok=false;break}
      const Sq=pModel(q).S,Lq=optLabels(Sq);
      if(!Lq.length||!/^[\s\u0001]*$/.test(Sq.slice(0,Lq[0].pos))){ok=false;break}
      seq.push(...Lq.map(x=>x.L));ps.push(q);j++;
      if('ABCD'.indexOf(seq.join(''))!==0){ok=false;break}}
    if(seq.join('')==='ABCD'&&ok){
      const clean=ps.every(q=>{
        const pp=one(q,'pPr');
        if(pp&&(one(pp,'numPr')||one(pp,'sectPr')||one(pp,'framePr')||one(pp,'pageBreakBefore')))return false;
        if(hasPB(q)||all(q,'fldChar').length||all(q,'fldSimple').length||all(q,'oMathPara',M).length)return false;
        return Array.from(q.children).every(c=>c.localName==='pPr'||c.namespaceURI===M&&c.localName==='oMath'||(c.namespaceURI===W&&MCQ_OK_KIDS.has(c.localName)))});
      if(clean)blocks.push({ps,i,split,box});else bad++;
      i=j-1}
    else if(ps.length>1||seq.length>=2)bad++}
  });
  return{blocks,bad}}
/* Tách một nhóm thành 4 đoạn con (frag) bắt đầu bằng chính nhãn A/B/C/D */
function mcqFrags(doc,ps,split){
  const frags=[];let stem=[];
  for(let pi=0;pi<ps.length;pi++){const p=ps[pi];
    Array.from(p.children).forEach(c=>{if(c.namespaceURI===W&&c.localName==='r')explode(doc,c)});
    const mdl=pModel(p),labs=optLabels(mdl.S),starts=[];
    for(let k=labs.length-1;k>=0;k--){
      const pos=labs[k].pos,nd=mdl.nodes.find(x=>pos>=x.s&&pos<x.s+x.n);
      if(!nd||!nd.t.parentNode||nd.t.parentNode.parentNode!==p)return null;
      let r=nd.t.parentNode;
      if(pos-nd.s>0)r=splitRun(doc,r,nd.t,pos-nd.s);
      starts[k]=r}
    const kids=Array.from(p.children).filter(c=>c.localName!=='pPr'),cut=starts.map(r=>kids.indexOf(r));
    if(cut.some(x=>x<0))return null;
    let pre=kids.slice(0,cut[0]);
    if(pi===0&&split){
      /* câu hỏi và đáp án chung một đoạn: "A." phải đứng ngay sau một lần xuống dòng (Shift+Enter) */
      let q=cut[0]-1,sawBr=false;
      while(q>=0&&isWsRun(kids[q])){if(all(kids[q],'br').length)sawBr=true;q--}
      if(!sawBr||q<0)return null;
      stem=kids.slice(0,q+1);pre=kids.slice(q+1,cut[0]);
      pre.forEach(rm);pre=[];
      const lt=(()=>{const n=stem[stem.length-1];if(n.namespaceURI!==W||n.localName!=='r')return null;const ts=wk(n,'t');return ts.length===1&&Array.from(n.children).every(c=>c.localName==='rPr'||c.localName==='t')?ts[0]:null})();
      if(lt){lt.textContent=lt.textContent.replace(/[ \t\u00a0\u3000]+$/,'');setXS(lt)}}
    starts.forEach((r,k)=>{
      const seg=kids.slice(cut[k],k+1<cut.length?cut[k+1]:kids.length);
      frags.push(k===0?pre.concat(seg):seg)})}
  if(frags.length!==4)return null;
  const out=frags.map(trimFrag);
  return out.every(f=>f.length)?{frags:out,stem}:null}
function psig(ps){return ps.map(p=>{const c=p.cloneNode(true);
  Array.from(c.getElementsByTagNameNS(W,'r')).forEach(r=>{const ks=Array.from(r.children).filter(x=>x.localName!=='rPr');if(ks.length===1&&ks[0].localName==='tab'){const x=one(r,'rPr');if(x)r.removeChild(x)}});
  return new XMLSerializer().serializeToString(c)}).join('')}
/* Xóa dòng trống nằm xen giữa câu hỏi và đáp án, hoặc giữa các đáp án A–B–C–D / a)–b)–c)–d) liên tiếp */
function lastLbl(S){let m,l=null;const re=/(^|[\s\u0001\u0002])([A-Da-d])[.)]/g;while((m=re.exec(S)))l=m[2];return l}
function gapClean(body,rep){
  let n=0;
  mcqBoxes(body).forEach(box=>{const kids=Array.from(box.children);
  for(let i=0;i<kids.length;i++){
    const e=kids[i];
    if(e.localName!=='p'||e.namespaceURI!==W||!isE(e)||hasPB(e)||hasSect(e))continue;
    let a=i;while(a>0&&kids[a-1].localName==='p'&&isE(kids[a-1])&&!hasPB(kids[a-1])&&!hasSect(kids[a-1]))a--;
    let b=i;while(kids[b+1]&&kids[b+1].localName==='p'&&isE(kids[b+1])&&!hasPB(kids[b+1])&&!hasSect(kids[b+1]))b++;
    const pv=kids[a-1],nx=kids[b+1];
    if(pv&&nx&&pv.localName==='p'&&nx.localName==='p'&&!hasSect(pv)&&!hasPB(pv)&&!hasSect(nx)){
      const Sn=pModel(nx).S,Sp=pModel(pv).S,mn=/^[\s\u0001]*([A-Da-d])[.)]/.exec(Sn);
      if(mn&&Sp.replace(/[\s\u0001\u0002]/g,'')){
        const lp=optLead(Sp)?lastLbl(Sp):null,ln=mn[1];
        const ok=lp?ln.charCodeAt(0)===lp.charCodeAt(0)+1&&(ln===ln.toLowerCase())===(lp===lp.toLowerCase()):(ln==='A'||ln==='a');
        if(ok){for(let k=a;k<=b;k++){rm(kids[k]);n++}}}}
    i=b}});
  rep.fix('Trắc nghiệm: xóa dòng trống xen giữa câu hỏi và các đáp án (đáp án hết bị cách xa nhau không đều)',n)}
/* Thêm dấu chấm cuối đáp án nếu chưa có dấu kết câu */
const END_PUNCT=/[.;,:!?…]$/;
function addDot(doc,frag){
  const last=frag[frag.length-1];if(!last)return false;
  const mkDot=ref=>{const r=mk(doc,'r'),rp=ref&&one(ref,'rPr');if(rp)r.appendChild(rp.cloneNode(true));const t=mk(doc,'t');t.textContent='.';r.appendChild(t);return r};
  if(last.namespaceURI===M&&last.localName==='oMath'){
    const prevR=frag.slice().reverse().find(n=>n.namespaceURI===W&&n.localName==='r'&&wk(n,'t').length);
    frag.push(mkDot(prevR));return true}
  if(last.namespaceURI!==W||last.localName!=='r')return false;
  const ks=Array.from(last.children).filter(c=>c.localName!=='rPr');
  if(ks.length!==1)return false;
  const k=ks[0];
  if(k.localName==='t'){
    const tx=k.textContent.replace(/\s+$/,'');
    if(!tx||END_PUNCT.test(tx))return false;
    k.textContent=tx+'.';setXS(k);return true}
  if(k.localName==='object'||k.localName==='pict'||k.localName==='sym'){frag.push(mkDot(last));return true}
  return false}
function mcqPass(doc,body,secs,o,rep,ctx){
  gapClean(body,rep);
  const {blocks,bad}=mcqFind(body);
  const cnt={c4:0,c2:0,c1:0,skip:bad,keep:0,stem:0,dot:0};
  const mode=o.mcqMode||'auto',bk=secs.bk,sz=ctx.szEst||28;
  /* lề trái đáp án theo đa số trong tài liệu (để mọi câu thẳng hàng với nhau) */
  const freq={};blocks.forEach(b=>{if(b.split)return;const v=indStart(one(b.ps[0],'pPr'));freq[v]=(freq[v]||0)+1});
  let L0=blocks.some(b=>b.split)&&!Object.keys(freq).length?567:0,best=-1;Object.keys(freq).map(Number).sort((a,b)=>a-b).forEach(k=>{if(freq[k]>best){best=freq[k];L0=k}});
  const GAP=170;
  blocks.forEach(b=>{
    const ps=b.ps,first=ps[0],snap=psig(ps);
    const idx=bk.indexOf(mcqTop(first,body)),sec=secs.find(s=>s.end>=(idx<0?0:idx))||secs[secs.length-1];
    const fr=mcqFrags(doc,ps,b.split);
    if(!fr){cnt.skip++;return}
    const frags=fr.frags,stemP=fr.stem.length?first:null;
    if(o.mcqDot!==false)frags.forEach(f=>{if(addDot(doc,f))cnt.dot++});
    const aw=(b.box&&b.box!==body?Math.max(1500,Math.min(sec.aw,mcqCellW(b.box,sec.aw))):sec.aw)-L0,w=frags.map(f=>estW(f,sz)),mx=Math.max.apply(null,w),multi=frags.some(f=>hasMulti(f));
    let lay=1;
    if(!multi&&mode!=='one'){
      if(mode==='auto'&&mx+GAP<=aw/4)lay=4;
      else if(mx+GAP<=aw/2)lay=2}
    const lines=lay===4?[[0,1,2,3]]:lay===2?[[0,1],[2,3]]:[[0],[1],[2],[3]];
    const tabs=lay===4?[1,2,3].map(k=>Math.round(L0+aw*k/4)):lay===2?[Math.round(L0+aw/2)]:[];
    const lastP=ps[ps.length-1],lastPr=one(lastP,'pPr'),lastSp=lastPr&&one(lastPr,'spacing');
    let pPr=one(first,'pPr');if(!pPr){pPr=mk(doc,'pPr');first.insertBefore(pPr,first.firstChild)}
    if(stemP){pPr=pPr.cloneNode(true);const kn0=one(pPr,'keepNext');if(kn0)rm(kn0)}
    const tb=one(pPr,'tabs');if(tb)rm(tb);
    if(tabs.length){const t=sc(doc,pPr,'tabs',ORD.pPr);tabs.forEach(pos=>{const e=mk(doc,'tab');sa(e,'val','left');sa(e,'pos',pos);t.appendChild(e)})}
    setInd(doc,pPr,L0);
    sa(sc(doc,pPr,'jc',ORD.pPr),'val','left');
    sc(doc,pPr,'keepLines',ORD.pPr);
    const tabRun=(ref)=>{const r=mk(doc,'r'),rp=ref&&one(ref,'rPr');
      if(rp){const np=mk(doc,'rPr');['rFonts','sz','szCs'].forEach(n=>{const e=one(rp,n);if(e)np.appendChild(e.cloneNode(true))});if(np.children.length)r.appendChild(np)}
      r.appendChild(mk(doc,'tab'));return r};
    const paras=[];let prev=first;
    lines.forEach((ln,li)=>{
      let p;
      if(li===0&&!stemP)p=first;
      else{p=first.cloneNode(false);Array.from(p.attributes).forEach(a=>{if(/^(paraId|textId)$/.test(a.localName))p.removeAttribute(a.name)});p.appendChild(pPr.cloneNode(true));prev.parentNode.insertBefore(p,prev.nextSibling)}
      prev=p;paras.push(p);
      if(!stemP)Array.from(p.children).forEach(c=>{if(c.localName!=='pPr')p.removeChild(c)});
      ln.forEach((fi,k)=>{
        if(k>0){const lr=frags[fi].find(n=>n.localName==='r');p.appendChild(tabRun(lr))}
        frags[fi].forEach(n=>p.appendChild(n))})});
    if(stemP)Array.from(stemP.children).forEach(c=>{if(c.localName!=='pPr'&&fr.stem.indexOf(c)<0)rm(c)});
    ps.forEach(p=>{if(paras.indexOf(p)<0&&p!==stemP)rm(p)});
    paras.forEach((p,li)=>{
      const pp=one(p,'pPr');
      if(li===paras.length-1){
        const kn=one(pp,'keepNext');if(kn)rm(kn);
        const sp=one(pp,'spacing');
        if(lastSp){if(sp)rm(sp);const c=lastSp.cloneNode(true);const ref=Array.from(pp.children).find(x=>x.namespaceURI===W&&ORD.pPr.indexOf(x.localName)>ORD.pPr.indexOf('spacing'));pp.insertBefore(c,ref||null)}}
      else{sc(doc,pp,'keepNext',ORD.pPr);const sp=sc(doc,pp,'spacing',ORD.pPr);['beforeLines','afterLines','beforeAutospacing','afterAutospacing'].forEach(a=>sp.removeAttributeNS(W,a));sa(sp,'before',0);sa(sp,'after',0)}
      if(li===paras.length-1){const sp=one(pp,'spacing');if(sp){['beforeLines','beforeAutospacing'].forEach(a=>sp.removeAttributeNS(W,a));sa(sp,'before',0)}}});
    /* câu hỏi đi cùng đáp án */
    const pv=stemP||paras[0].previousElementSibling;
    if(pv&&pv.localName==='p'&&!hasSect(pv)&&!isE(pv)&&!hasPB(pv)&&!STEM_RE.test(ptext(paras[0]).trim())){let pp=one(pv,'pPr');if(!pp){pp=mk(doc,'pPr');pv.insertBefore(pp,pv.firstChild)}sc(doc,pp,'keepNext',ORD.pPr)}
    const after=psig(stemP?[stemP].concat(paras):paras);
    if(after!==snap){if(lay===4)cnt.c4++;else if(lay===2)cnt.c2++;else cnt.c1++}});
  /* lề trái "Câu n." đồng nhất (bỏ qua khi người dùng chọn thụt đầu dòng 1 cm) */
  if(!o.firstLine&&o.mcqStem!==false){
    all(body,'p').forEach(p=>{
      if(p.parentNode!==body)return;
      const t=ptext(p).trim();if(!/^(Câu|CÂU)\s*\d+/.test(t))return;
      const pp=one(p,'pPr'),ie=pp&&one(pp,'ind');if(!ie||pInfo(p).list)return;
      const L=+ga(ie,'left')||+ga(ie,'start')||0,F=+ga(ie,'firstLine')||0,H=+ga(ie,'hanging')||0;
      if((L||F||H)&&L<=1134){['left','start','firstLine','hanging','hangingChars','firstLineChars','leftChars','startChars'].forEach(a=>ie.removeAttributeNS(W,a));if(!ie.attributes.length)rm(ie);cnt.stem++}})}
  rep.fix('Trắc nghiệm: thêm dấu chấm cuối đáp án còn thiếu (đáp án)',cnt.dot);
  rep.fix('Trắc nghiệm: đáp án A B C D xếp 1 hàng, 4 cột cách đều (câu)',cnt.c4);
  rep.fix('Trắc nghiệm: đáp án xếp 2 hàng × 2 cột thẳng hàng (câu)',cnt.c2);
  rep.fix('Trắc nghiệm: đáp án dài xếp mỗi đáp án một dòng, thẳng lề (câu)',cnt.c1);
  rep.fix('Trắc nghiệm: bỏ thụt lề lệch của dòng “Câu n.” để các câu thẳng hàng',cnt.stem);
  if(cnt.skip)rep.warn(cnt.skip+' nhóm đáp án A/B/C/D có cấu trúc đặc biệt (chứa trường, siêu liên kết, danh sách tự đánh số, đáp án nằm trong bảng/hộp văn bản hoặc thiếu đáp án) nên giữ nguyên, chưa tự căn — hãy kiểm tra tay.')}

/* Bảng: ước lượng chiều cao để biết bảng có vừa trọn một trang không */
function tblHeight(tbl,aw,sz){
  const pt=sz/2,line=pt*20*1.2,cwChar=pt*20*0.5,grid=one(tbl,'tblGrid'),cols=grid?wk(grid,'gridCol').map(c=>parseInt(ga(c,'w'),10)||0):[];
  let H=0;
  wk(tbl,'tr').forEach(tr=>{
    let col=0,rowH=line;
    wk(tr,'tc').forEach(tc=>{
      const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),n=gs?(parseInt(ga(gs,'val'),10)||1):1;
      let w=0;for(let k=col;k<col+n;k++)w+=cols[k]||(aw/Math.max(1,cols.length||1));col+=n;
      const cpl=Math.max(3,Math.floor((w-200)/cwChar));let h=0;
      wk(tc,'p').forEach(p=>{
        const L=Math.max(1,Math.ceil(ptext(p).length/cpl));h+=L*line+60;
        all(p,'drawing').forEach(d=>{const ex=d.getElementsByTagNameNS(WP,'extent')[0];h+=ex?(+ex.getAttribute('cy')||0)/635:900});
        all(p,'object').concat(all(p,'pict')).forEach(d=>{const sh=d.getElementsByTagName('v:shape')[0],m=sh&&/height:\s*([\d.]+)pt/.exec(sh.getAttribute('style')||'');h+=(m?+m[1]:24)*20});
        if(all(p,'f',M).length||all(p,'rad',M).length)h+=line*0.8});
      h+=all(tc,'tbl').length*2400;rowH=Math.max(rowH,h)});
    H+=rowH+40});
  return H}

/* Bỏ ngắt trang cứng (Ctrl+Enter / ngắt trang trước) đặt trước PHẦN/Câu/Bài: nguyên nhân hay gặp của khoảng trống cuối trang */
const SOFT_RE=/^(PHẦN|Phần|Câu|CÂU|Bài|BÀI)\b/,HARD_RE=/^(ĐỀ|Đề|MÃ ĐỀ|Mã đề|ĐÁP ÁN|Đáp án|HƯỚNG DẪN|MA TRẬN|Ma trận|BẢNG ĐẶC TẢ|BẢN ĐẶC TẢ)/;
function softBreaks(doc,body,o,rep){
  let n=0;const kids=Array.from(body.children);
  kids.forEach((p,i)=>{
    if(p.localName!=='p'||p.namespaceURI!==W||hasSect(p))return;
    const t=ptext(p).trim(),pp=one(p,'pPr'),pb=pp&&one(pp,'pageBreakBefore');
    if(pb&&t&&SOFT_RE.test(t)&&!HARD_RE.test(t)&&i>0){rm(pb);n++}
    if(t&&SOFT_RE.test(t)&&!HARD_RE.test(t)){
      const fr=Array.from(p.children).find(c=>c.localName==='r'&&c.namespaceURI===W);
      if(fr&&all(fr,'br').some(b=>ga(b,'type')==='page')&&!all(fr,'t').some(x=>x.textContent.trim())&&Array.from(fr.children).every(c=>c.localName==='rPr'||c.localName==='br')){rm(fr);n++}}
    if(pbOnly(p)){
      let j=i+1;while(kids[j]&&kids[j].localName==='p'&&isE(kids[j])&&!hasSect(kids[j]))j++;
      const nx=kids[j];if(!nx||nx.localName!=='p')return;
      const nt=ptext(nx).trim();
      if(SOFT_RE.test(nt)&&!HARD_RE.test(nt)&&i>0){rm(p);n++}}});
  rep.fix('Bỏ ngắt trang cứng đặt trước PHẦN/Câu/Bài (hết khoảng trống cuối trang; Word tự ngắt trang theo nội dung)',n)}

const STEM_RE=/^(Câu|CÂU|Bài|BÀI)\s*\d+/;
/* Khoảng cách giữa các câu đều nhau: bỏ dòng trống đơn lẻ trước "Câu n"/PHẦN và đặt cùng một khoảng sau đoạn cuối của mỗi câu */
function questionGaps(doc,body,rep){
  const GAP=120;let em=0,sp=0;
  const isStemP=q=>!!q&&q.localName==='p'&&q.namespaceURI===W&&STEM_RE.test(ptext(q).trim());
  const plainE=q=>!!q&&q.localName==='p'&&q.namespaceURI===W&&isE(q)&&!hasPB(q)&&!hasSect(q);
  const kids=Array.from(body.children);
  kids.forEach((q,i)=>{
    if(!plainE(q))return;
    let j=i+1;while(kids[j]&&plainE(kids[j]))j++;
    const nx=kids[j],pv=kids[i-1];
    if(pv&&pv.localName==='p'&&!isE(pv)&&(isStemP(nx)||(nx&&nx.localName==='p'&&pInfo(nx).head&&/^(PHẦN|Phần)\b/.test(ptext(nx).trim())))){rm(q);em++}});
  const setSp=(p,before,after)=>{let pp=one(p,'pPr');if(!pp){pp=mk(doc,'pPr');p.insertBefore(pp,p.firstChild)}
    const e=sc(doc,pp,'spacing',ORD.pPr),key=()=>Array.from(e.attributes).map(a=>a.name+'='+a.value).sort().join(),k0=key();['beforeLines','afterLines','beforeAutospacing','afterAutospacing'].forEach(a=>e.removeAttributeNS(W,a));
    if(before!==null)sa(e,'before',before);if(after!==null)sa(e,'after',after);return key()!==k0};
  Array.from(body.children).forEach(q=>{
    if(!isStemP(q)||anc(q,'tc'))return;
    const pv=q.previousElementSibling;
    setSp(q,0,null);
    if(pv&&pv.localName==='p'&&!isE(pv)&&!hasSect(pv)&&!hasPB(pv)&&!pInfo(pv).head){if(setSp(pv,null,GAP))sp++}});
  rep.fix('Đều khoảng cách giữa các câu (bỏ dòng trống lẻ, cùng một khoảng sau mỗi câu)',em+sp)}

function keepPass(doc,body,o,rep){
  let n=0;
  all(body,'p').forEach(p=>{
    let pPr=one(p,'pPr');
    const info=pInfo(p),kn=pPr&&one(pPr,'keepNext'),kl=pPr&&one(pPr,'keepLines'),t=ptext(p).trim(),nx=p.nextElementSibling;
    if(anc(p,'tc')){if(o.tbl&&o.tblkeep)return; /* keepNext trong ô bảng do tablePass quản lý */
      const tr=anc(p,'tr'),tb=tr&&tr.parentNode;
      if(tr&&tb&&tb.localName==='tbl'&&wk(tb,'tr')[0]===tr&&wk(tb,'tr').length>1)return; /* hàng tiêu đề: giữ keepNext do tablePass đặt */
      if(kn){rm(kn);n++}if(kl){rm(kl);n++}return}
    const stem=/^(Câu|CÂU|Bài|BÀI)\s*\d+/.test(t),cap=nx&&nx.localName==='p'&&/^(Hình|HÌNH)\s*\d*/.test(ptext(nx).trim())&&!t&&all(p,'drawing').length;
    const inTb=!!anc(p,'txbxContent'),optHere=!inTb&&optLead(pModel(p).S),nxOpt=!inTb&&nx&&nx.localName==='p'&&optLead(pModel(nx).S);
    /* Sửa lỗi trống cuối trang: các dòng "Câu n." đứng liền nhau (Đúng/Sai, Trả lời ngắn) KHÔNG được giữ-với-đoạn-sau,
       nếu không cả chuỗi câu dính thành một khối và bị đẩy nguyên sang trang mới. */
    const nxStem=!!nx&&nx.localName==='p'&&STEM_RE.test(ptext(nx).trim()),nxHead=!!nx&&nx.localName==='p'&&pInfo(nx).head;
    const stemKeep=stem&&!nxStem&&!nxHead&&!(nx&&nx.localName==='p'&&isE(nx));
    const pv=p.previousElementSibling,lead=!stem&&!info.head&&pv&&pv.localName==='p'&&pInfo(pv).head&&t.length>0&&t.length<200&&nxStem;   /* dòng hướng dẫn ngay sau tiêu đề PHẦN */
    const want=info.head||stemKeep||lead||cap||(nx&&nx.localName==='tbl'&&t.length<150)||nxOpt;
    if(!pPr){if(want&&nx&&nx.localName!=='sectPr'){pPr=mk(doc,'pPr');p.insertBefore(pPr,p.firstChild);sc(doc,pPr,'keepNext',ORD.pPr);n++}return}
    if(kl&&!info.head&&!optHere){rm(kl);n++}
    if(kn&&!want){rm(kn);n++}
    if(!kn&&want&&nx&&nx.localName!=='sectPr'){sc(doc,pPr,'keepNext',ORD.pPr);n++}});
  /* Chốt an toàn: chuỗi keepNext liên tiếp quá dài (>8 đoạn) sẽ bị cắt ở ranh giới giữa các câu */
  {const kids=Array.from(body.children);let run=[];
   const flush=()=>{if(run.length>8)run.forEach(q=>{const nq=q.nextElementSibling;
     if(nq&&nq.localName==='p'&&STEM_RE.test(ptext(nq).trim())&&!pInfo(q).head){const kn=one(one(q,'pPr'),'keepNext');if(kn){rm(kn);n++}}});run=[]};
   kids.forEach(q=>{const pp=q.localName==='p'&&one(q,'pPr');if(pp&&one(pp,'keepNext'))run.push(q);else flush()});flush()}
  rep.fix('Chỉnh "giữ với đoạn sau" (tiêu đề/câu hỏi/hình không bị tách trang; bỏ ràng buộc gây đẩy đoạn sang trang mới)',n)}

/* [v18] Bề rộng vùng chữ của TỪNG section (tính trước khi sections() chỉnh lề). Khổ ngang rộng hơn khổ dọc nên không được dùng chung một số cho cả file. */
function preSecAw(doc,body,o){
  const bk=Array.from(body.children),res=[],mm=v=>Math.round(v*56.6929);
  const calc=sp=>{const z=one(sp,'pgSz'),m=one(sp,'pgMar');
    const land=!!z&&(ga(z,'orient')==='landscape'||(+ga(z,'w')>+ga(z,'h')&&+ga(z,'h')>0));
    if(o.page){const L=land?Math.min(o.ml,10):o.ml,R=land?Math.min(o.mr,10):o.mr;return (land?16838:11906)-mm(L)-mm(R)}
    return ((z&&+ga(z,'w'))||11906)-(m?(+ga(m,'left')||1701):1701)-(m?(+ga(m,'right')||850):850)};
  bk.forEach((c,i)=>{if(c.localName==='p'&&c.namespaceURI===W){const pp=one(c,'pPr'),sp=pp&&one(pp,'sectPr');if(sp)res.push({end:i,aw:calc(sp)})}});
  const fs=one(body,'sectPr');res.push({end:bk.length,aw:fs?calc(fs):9071});res.bk=bk;return res}
/* Chụp độ rộng cột/ô của bảng trước bước “gỡ bố cục giả”, rồi khôi phục nếu bước đó bóp bảng nhỏ hơn vùng chữ thật của section chứa nó
   (bước ngoài này tính theo khổ DỌC nên làm bảng ma trận/đặc tả nằm trong section khổ NGANG bị thu còn ~2/3 bề ngang). */
function snapTables(body,ps){
  const out=[];
  all(body,'tbl').forEach(t=>{if(anc(t,'tc'))return;
    let top=t;while(top.parentNode&&top.parentNode!==body)top=top.parentNode;
    const i=ps.bk.indexOf(top),sec=ps.find(x=>x.end>=i)||ps[ps.length-1],g=one(t,'tblGrid');if(!g)return;
    const gw=wk(g,'gridCol').map(c=>parseInt(ga(c,'w'),10)||0),pr=one(t,'tblPr'),tw=pr&&one(pr,'tblW');
    const cells=[];wk(t,'tr').forEach(tr=>wk(tr,'tc').forEach(tc=>{const cp=one(tc,'tcPr'),x=cp&&one(cp,'tcW');cells.push({tc,w:x?ga(x,'w'):null,ty:x?ga(x,'type'):null})}));
    out.push({t,aw:sec.aw,gw,tot:gw.reduce((a,b)=>a+b,0),tw:tw?{w:ga(tw,'w'),ty:ga(tw,'type')}:null,cells})});
  return out}
function restoreTables(doc,snap){let n=0;
  snap.forEach(s=>{const g=one(s.t,'tblGrid');if(!g)return;const cols=wk(g,'gridCol');
    const cur=cols.reduce((a,c)=>a+(parseInt(ga(c,'w'),10)||0),0);
    if(cols.length!==s.gw.length||s.tot<=0||s.tot>s.aw+5||cur>=s.tot*0.97)return;
    cols.forEach((c,k)=>sa(c,'w',s.gw[k]));
    s.cells.forEach(c=>{if(c.w===null||!c.tc.parentNode)return;const cp=one(c.tc,'tcPr');if(!cp)return;const x=one(cp,'tcW');if(!x)return;sa(x,'w',c.w);if(c.ty)sa(x,'type',c.ty)});
    const pr=one(s.t,'tblPr'),tw=pr&&one(pr,'tblW');if(tw&&s.tw){sa(tw,'w',s.tw.w);if(s.tw.ty)sa(tw,'type',s.tw.ty)}
    n++});
  return n}
function sections(doc,body,o,rep){
  const bk=Array.from(body.children),secs=[];
  bk.forEach((c,i)=>{if(c.localName==='p'&&c.namespaceURI===W){const pp=one(c,'pPr'),s=pp&&one(pp,'sectPr');if(s)secs.push({end:i,sp:s})}});
  let fs=one(body,'sectPr');if(!fs){fs=mk(doc,'sectPr');body.appendChild(fs)}
  secs.push({end:bk.length,sp:fs});secs.bk=bk;
  let pg=0,rst=0,nxp=0;
  secs.forEach((s,k)=>{const sp=s.sp;let z=one(sp,'pgSz'),m=one(sp,'pgMar');
    if(o.page){z=sc(doc,sp,'pgSz',ORD.sectPr);m=sc(doc,sp,'pgMar',ORD.sectPr);
      const land=ga(z,'orient')==='landscape'||(+ga(z,'w')>+ga(z,'h')&&+ga(z,'h')>0),w=land?16838:11906,h=land?11906:16838;
      const mm=v=>Math.round(v*56.6929);let want=[mm(o.mt),mm(o.mb),mm(o.ml),mm(o.mr)];
      /* khổ ngang (sổ/biểu mẫu nhiều cột): lề hẹp hơn để bảng có đủ chỗ */
      if(land)want=[mm(Math.min(o.mt,8)),mm(Math.min(o.mb,8)),mm(Math.min(o.ml,10)),mm(Math.min(o.mr,10))];
      const was=[+ga(z,'w'),+ga(z,'h'),+ga(m,'top'),+ga(m,'bottom'),+ga(m,'left'),+ga(m,'right')].join();
      sa(z,'w',w);sa(z,'h',h);if(land)sa(z,'orient','landscape');else z.removeAttributeNS(W,'orient');
      sa(m,'top',want[0]);sa(m,'bottom',want[1]);sa(m,'left',want[2]);sa(m,'right',want[3]);
      if(!ga(m,'header'))sa(m,'header',709);if(!ga(m,'footer'))sa(m,'footer',709);sa(m,'gutter',0);   /* gutter cũ làm lề trái rộng thêm */
      /* khoảng cách header/footer không được lớn hơn nửa lề (nếu không Word sẽ tự đẩy nội dung xuống, lề thực tế lại rộng ra) */
      sa(m,'header',Math.min(+ga(m,'header')||709,Math.max(170,Math.floor(want[0]*0.5))));sa(m,'footer',Math.min(+ga(m,'footer')||709,Math.max(170,Math.floor(want[1]*0.5))));
      if(was!==[w,h].concat(want).join())pg++}
    s.aw=(+ga(z,'w')||11906)-(m?(+ga(m,'left')||1701):1701)-(m?(+ga(m,'right')||850):850);
    s.ah=(+ga(z,'h')||16838)-(m?(+ga(m,'top')||1134):1134)-(m?(+ga(m,'bottom')||1134):1134);
    const pn=one(sp,'pgNumType');
    if(k>0&&pn&&pn.hasAttributeNS(W,'start')){if(o.pgnum){pn.removeAttributeNS(W,'start');rst++}else rep.warn('Section '+(k+1)+' bắt đầu lại số trang từ '+ga(pn,'start')+'.')}
    if(k>0){const t0=one(sp,'type');if(!t0||ga(t0,'val')==='nextPage')nxp++}
    const ty=one(sp,'type');if(ty&&/^(odd|even)Page$/.test(ga(ty,'val')))rep.warn('Có ngắt section kiểu trang lẻ/chẵn — Word sẽ chèn trang trắng (hữu ích khi in 2 mặt, nhưng thừa nếu xem trên máy).')});
  if(nxp)rep.warn('Có '+nxp+' ngắt section kiểu “Trang mới” (Next Page): mỗi chỗ luôn bắt đầu trang mới nên có thể để lại khoảng trống cuối trang trước. Nếu không cần tách riêng, vào Layout → Breaks → đổi thành Continuous.');
  rep.fix('Đưa khổ giấy về A4 và lề chuẩn (section)',pg);
  rep.fix('Bỏ đặt lại số trang ở section sau (số trang liên tục)',rst);
  return secs}

function pageGeom(secs){return{aw:Math.min.apply(null,secs.map(s=>s.aw)),ah:Math.min.apply(null,secs.map(s=>s.ah))}}


/* ===== Bảng nền tối → nền sáng, chữ đen (để in ra dễ đọc) ===== */
const LT_LIGHT='FFFFFF',LT_THR=150;
const LT_DARKTHEME=/^(text1|dark1|tx1|text2|dark2|tx2|accent\d)$/i,LT_LIGHTTHEME=/^(background1|light1|bg1|background2|light2|bg2)$/i;
const LT_DARKHL=/^(black|darkBlue|darkCyan|darkGreen|darkMagenta|darkRed|darkYellow|darkGray)$/i;
function ltLum(h){if(!/^[0-9a-f]{6}$/i.test(h||''))return null;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return .299*r+.587*g+.114*b}
function ltShdDark(e){if(!e)return false;const val=ga(e,'val'),fill=ga(e,'fill'),col=ga(e,'color'),th=ga(e,'themeFill');
  if(val==='nil'||val==='')return false;
  let eff=val==='solid'?col:fill;
  if(!/^[0-9a-f]{6}$/i.test(eff||'')){return !!th&&LT_DARKTHEME.test(th)&&!ga(e,'themeFillTint')}
  const l=ltLum(eff);return l!==null&&l<LT_THR}
function ltShdVisible(e){if(!e)return false;const val=ga(e,'val'),fill=ga(e,'fill'),col=ga(e,'color'),th=ga(e,'themeFill');
  if(val==='nil'||val==='')return false;
  const eff=val==='solid'?col:fill;
  if(/^[0-9a-f]{6}$/i.test(eff||''))return !/^ffffff$/i.test(eff);
  return !!th&&!LT_LIGHTTHEME.test(th)||(!!th&&!!ga(e,'themeFillTint'))}
function ltLighten(e){['val','color','fill'].forEach(a=>e.removeAttributeNS(W,a));
  ['themeFill','themeFillTint','themeFillShade','themeColor','themeTint','themeShade'].forEach(a=>e.removeAttributeNS(W,a));
  sa(e,'val','clear');sa(e,'color','auto');sa(e,'fill',LT_LIGHT)}
function ltLightText(c){if(!c)return false;const v=ga(c,'val'),th=ga(c,'themeColor');
  if(v&&v!=='auto'){const l=ltLum(v);if(l!==null)return l>=170}
  return !!th&&LT_LIGHTTHEME.test(th)}
/* bỏ màu chữ sáng (trắng/xám nhạt) trong rPr → về màu tự động (đen) */
function ltFixRPr(r,force){if(!r)return 0;let n=0;
  const c=one(r,'color');if(c&&(ltLightText(c)||(force&&ga(c,'val')!=='auto'&&ltLum(ga(c,'val'))!==null&&ltLum(ga(c,'val'))>=LT_THR))){rm(c);n++}
  return n}
function lightTables(doc,root,rep,perCell){
  let cells=0,runs=0;
  all(root,'tbl').forEach(tbl=>{
    const tp=one(tbl,'tblPr'),tblShd=tp&&one(tp,'shd'),tblDark=tblShd&&ltShdDark(tblShd);
    if(tblShd&&ltShdVisible(tblShd)){ltLighten(tblShd);cells++}
    all(tbl,'tr').forEach(tr=>{
      const trp=one(tr,'trPr');
      wk(tr,'tc').forEach(tc=>{
        const cp=one(tc,'tcPr'),sh=cp&&one(cp,'shd');let dark=!!tblDark;
        if(sh&&ltShdVisible(sh)){const dk=ltShdDark(sh);ltLighten(sh);if(dk)dark=true;cells++}
        /* đoạn & chữ trong ô */
        all(tc,'p').forEach(p=>{
          const pp=one(p,'pPr'),psh=pp&&one(pp,'shd');let pd=dark;
          if(psh&&ltShdVisible(psh)){const dk=ltShdDark(psh);ltLighten(psh);if(dk)pd=true;cells++}
          if(pd&&pp)runs+=ltFixRPr(one(pp,'rPr'),false);
          all(p,'r').forEach(r=>{
            const rp=one(r,'rPr');if(!rp)return;let rd=pd;
            const hl=one(rp,'highlight');if(hl&&LT_DARKHL.test(ga(hl,'val'))){rm(hl);rd=true;cells++}
            const rs=one(rp,'shd');if(rs&&ltShdVisible(rs)){const dk=ltShdDark(rs);rm(rs);if(dk)rd=true;cells++}
            if(rd)runs+=ltFixRPr(rp,false)})})})})});
  if(rep){rep.fix('Bảng: đổi mọi ô có nền màu (xám, tối, tô màu) sang nền trắng; ô nền tối thì đổi luôn chữ sang đen',cells);rep.fix('Bảng: bỏ màu chữ sáng/trắng trong ô nền tối',runs)}}
/* kiểu bảng (styles.xml) có nền tối + chữ trắng */
function lightTableStyles(sd,rep){let n=0,m=0;
  all(sd.documentElement,'style').forEach(st=>{
    const chk=[st].concat(all(st,'tblStylePr'));
    chk.forEach(scope=>{
      const tcp=scope===st?one(st,'tcPr'):one(scope,'tcPr'),tpp=scope===st?one(st,'tblPr'):one(scope,'tblPr');
      let dark=false;
      [tcp,tpp].forEach(x=>{const sh=x&&one(x,'shd');if(sh&&ltShdVisible(sh)){const dk=ltShdDark(sh);ltLighten(sh);if(dk)dark=true;n++}});
      const rp=scope===st?one(st,'rPr'):one(scope,'rPr');
      if(rp&&dark){const c=one(rp,'color');if(c&&ltLightText(c)){rm(c);m++}}})});
  if(rep){rep.fix('Kiểu bảng có sẵn: bỏ nền tối',n);rep.fix('Kiểu bảng có sẵn: bỏ chữ trắng',m)}}

/* ===== Bảng nhiều cột (sổ, biểu mẫu): dàn độ rộng cột theo nội dung + cỡ chữ chuẩn trong bảng ===== */
/* độ rộng ước lượng (em) theo Times New Roman ĐẬM — chọn dư một chút để không bao giờ bị ngắt giữa từ */
function chW(ch){if(/\d/.test(ch))return .5;if(/\p{Lu}/u.test(ch))return /[MWĐ]/.test(ch)?.98:.78;if(/[iíìỉĩịltfjr.,;:!\/()\-]/.test(ch))return .36;if(/[mw]/.test(ch))return .86;return .55}
/* [v18] Bảng ma trận/đặc tả xuất từ Word cũ hay có CỘT ĐỆM siêu hẹp (12 twips) nằm xen giữa các cột thật; ô nào cũng gridSpan=2 (đệm + cột thật),
   riêng hàng “Tổng cộng” thì đệm lại nằm CUỐI ô. fitCols chỉ đo ô gridSpan=1 nên coi các cột “Nhận biết / Thông hiểu / Vận dụng…” là cột trống
   → ép còn ~173 twips → chữ & số bị viết dọc. Ở đây bỏ cột đệm khỏi lưới (cộng độ rộng vào cột thật kề bên), mỗi ô chỉ còn phủ các cột thật.
   Không chắc chắn (ô chỉ phủ mỗi cột đệm, hàng lệch lưới, gridBefore/After…) thì bỏ qua, không đụng bảng. */
function mergeSpacerCols(doc,tbl){
  const grid=one(tbl,'tblGrid');if(!grid)return 0;
  const cols=wk(grid,'gridCol'),n=cols.length;if(n<4)return 0;
  const ws=cols.map(c=>parseInt(ga(c,'w'),10)||0),tiny=ws.map(w=>w>0&&w<=60);
  if(!tiny.some(Boolean)||tiny[0]||tiny.every(Boolean))return 0;
  for(let k=1;k<n;k++)if(tiny[k]&&tiny[k-1])return 0;
  const idx=new Array(n).fill(-1);let nN=0;for(let k=0;k<n;k++)if(!tiny[k])idx[k]=nN++;
  const nw=new Array(nN).fill(0);
  for(let k=0;k<n;k++){const t=tiny[k]?(k+1<n?idx[k+1]:idx[k-1]):idx[k];nw[t]+=ws[k]}
  const plan=[];
  for(const tr of wk(tbl,'tr')){
    const tp=one(tr,'trPr');if(tp&&['gridBefore','gridAfter','wBefore','wAfter'].some(x=>one(tp,x)))return 0;
    let col=0,run=0;const row=[];
    for(const tc of wk(tr,'tc')){const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),k=gs?(parseInt(ga(gs,'val'),10)||1):1;
      if(col+k>n)return 0;
      let f=-1,l=-1;for(let q=col;q<col+k;q++)if(!tiny[q]){if(f<0)f=idx[q];l=idx[q]}
      if(f<0||f!==run)return 0;row.push({tc,k2:l-f+1,f});run=l+1;col+=k}
    if(col!==n||run!==nN)return 0;plan.push(row)}
  cols.slice(nN).forEach(rm);wk(grid,'gridCol').forEach((c,k)=>sa(c,'w',nw[k]));
  plan.forEach(row=>row.forEach(c=>{let cp=one(c.tc,'tcPr');if(!cp){cp=mk(doc,'tcPr');c.tc.insertBefore(cp,c.tc.firstChild)}
    if(c.k2>1)sa(sc(doc,cp,'gridSpan',ORD.tcPr),'val',c.k2);else{const g=one(cp,'gridSpan');if(g)rm(g)}
    let w=0;for(let q=c.f;q<c.f+c.k2;q++)w+=nw[q];const x=sc(doc,cp,'tcW',ORD.tcPr);sa(x,'w',w);sa(x,'type','dxa')}));
  return n-nN}

function fitColsOld(tbl,ws,av,sz0,keepSz){
  const n=ws.length,mw=new Array(n).fill(0);
  wk(tbl,'tr').forEach(tr=>{let col=0;const tp=one(tr,'trPr'),gb=tp&&one(tp,'gridBefore');if(gb)col+=parseInt(ga(gb,'val'),10)||0;
    wk(tr,'tc').forEach(tc=>{const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),k=gs?(parseInt(ga(gs,'val'),10)||1):1;
      if(k===1&&col<n)wk(tc,'p').forEach(p=>ptext(p).split(/\s+/).forEach(w=>{if(!w)return;let e=0;for(const ch of w)e+=chW(ch);if(e>mw[col])mw[col]=e}));col+=k})});
  const need=s=>mw.map(e=>Math.ceil(e*s*10*1.04)+170),sum=a=>a.reduce((x,y)=>x+y,0);
  let s=sz0,m=need(s);
  while(sum(m)>av*0.98&&s>(keepSz?sz0:20)){s-=2;m=need(s)}
  if(sum(m)>av){const f=av/sum(m);m=m.map(x=>Math.floor(x*f))}
  const base=ws.map(x=>Math.max(x,1)),w=new Array(n).fill(0),lock=new Array(n).fill(false);
  for(let it=0;it<=n;it++){
    let ls=0,fs=0;for(let k=0;k<n;k++){if(lock[k])ls+=m[k];else fs+=base[k]}
    let bad=false;
    for(let k=0;k<n;k++){if(lock[k])w[k]=m[k];else{w[k]=fs>0?base[k]*(av-ls)/fs:m[k];if(w[k]<m[k]){lock[k]=true;bad=true}}}
    if(!bad)break}
  const nw=w.map(x=>Math.floor(x));let big=0;nw.forEach((x,k)=>{if(x>nw[big])big=k});
  nw[big]+=Math.floor(av)-sum(nw);
  return{nw,sz:s}}
/* [v12] Bảng BỐ CỤC (giáo án, bảng 2–3 cột chữ + vài cột đệm hẹp): KHÔNG dàn lại cột theo kiểu ma trận.
   Ma trận/đặc tả có nhiều cột số hẹp (chiếm ≥15% bề rộng); bảng bố cục chỉ có ≤3 cột chữ rộng, phần hẹp là cột đệm/viền (<15%).
   Với bảng này chỉ co tỉ lệ đều khi tràn lề, còn không thì giữ nguyên bề rộng cột — tránh cột “Nội dung cần đạt” bị bóp còn ~1,4 cm. */
function isLayoutTbl(ws){const tot=ws.reduce((a,b)=>a+b,0)||1,main=ws.filter(w=>w>=1000).length,narrow=ws.filter(w=>w<1000).reduce((a,b)=>a+b,0);
  return main>=2&&main<=3&&narrow/tot<0.15}
/* ===== v10: dàn cột bảng nhiều cột (ma trận / bản đặc tả) theo NỘI DUNG, ưu tiên gọn 1 trang ===== */
const chW2=ch=>/[a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/.test(ch)&&!/[iíìỉĩịltfjr]/.test(ch)?(/[mw]/.test(ch)?.8:.5):chW(ch);
function colStats(tbl,n){
  const mw=new Array(n).fill(0),ex=new Array(n).fill(0),len=new Array(n).fill(0),cnt=new Array(n).fill(0);
  wk(tbl,'tr').forEach(tr=>{let col=0;const tp=one(tr,'trPr'),gb=tp&&one(tp,'gridBefore');if(gb)col+=parseInt(ga(gb,'val'),10)||0;
    wk(tr,'tc').forEach(tc=>{const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),k=gs?(parseInt(ga(gs,'val'),10)||1):1;
      if(k===1&&col<n){let tl=0;
        wk(tc,'p').forEach(p=>{const t=ptext(p);tl+=t.trim().length;
          const bf=allBold(p)?1.07:1,pp=one(p,'pPr'),ie=pp&&one(pp,'ind'),
            ind=ie?Math.max(0,+ga(ie,'left')||+ga(ie,'start')||0)+Math.max(0,+ga(ie,'right')||+ga(ie,'end')||0):0;
          t.split(/\s+/).forEach(w=>{if(!w)return;let e=0;for(const ch of w)e+=chW2(ch);e*=bf;if(e>mw[col]){mw[col]=e;ex[col]=ind}})});
        if(tl>0){len[col]+=tl;cnt[col]++}}
      col+=k})});
  return{mw,ex,len,cnt}}
/* Ước lượng chiều cao bảng (twips) với độ rộng cột w[] và cỡ chữ s (nửa điểm) */
function estTbl(tbl,w,s){
  const n=w.length,lh=s*13.2,trs=wk(tbl,'tr'),rowH=[],pend=[],at=[];
  trs.forEach((tr,ri)=>{
    let col=0,mx=1;const tp=one(tr,'trPr'),gb=tp&&one(tp,'gridBefore');if(gb)col+=parseInt(ga(gb,'val'),10)||0;
    const th=tp&&one(tp,'trHeight'),minH=th?(parseInt(ga(th,'val'),10)||0):0;at[ri]={};
    wk(tr,'tc').forEach(tc=>{
      const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),k=gs?(parseInt(ga(gs,'val'),10)||1):1,vm=cp&&one(cp,'vMerge');
      let cw=0;for(let j=col;j<col+k&&j<n;j++)cw+=w[j];
      const c0=col;col+=k;
      at[ri][c0]=vm?(ga(vm,'val')==='restart'?'restart':'cont'):'';
      if(vm&&ga(vm,'val')!=='restart')return;
      let L=0;
      wk(tc,'p').forEach(p=>{
        const t=ptext(p);if(!t.trim()){L+=1;return}
        const bf=allBold(p)?1.07:1,pp=one(p,'pPr'),ie=pp&&one(pp,'ind'),
          ind=ie?Math.max(0,+ga(ie,'left')||+ga(ie,'start')||0)+Math.max(0,+ga(ie,'right')||+ga(ie,'end')||0):0,
          inner=Math.max(200,cw-140-ind),sp=0.25*s*10;
        let ln=1,cur=0;
        t.split(/\s+/).forEach(wd=>{if(!wd)return;let e=0;for(const ch of wd)e+=chW2(ch);const ww=e*s*10*1.04*bf;
          if(!cur)cur=ww;else if(cur+sp+ww<=inner)cur+=sp+ww;else{ln++;cur=ww}
          while(cur>inner){ln++;cur-=inner}});
        L+=ln;
        all(p,'drawing').forEach(d=>{const ex=d.getElementsByTagNameNS(WP,'extent')[0];L+=ex?(+ex.getAttribute('cy')||0)/635/lh:3})});
      if(vm&&ga(vm,'val')==='restart')pend.push({r:ri,c:c0,h:L*lh+40});else mx=Math.max(mx,L)});
    rowH.push(Math.max(minH,mx*lh+40))});
  pend.forEach(pd=>{let r=pd.r+1;while(r<trs.length&&at[r][pd.c]==='cont')r++;
    let sm=0;for(let q=pd.r;q<r;q++)sm+=rowH[q];if(sm<pd.h)rowH[r-1]+=pd.h-sm});
  return{H:rowH.reduce((x,y)=>x+y,0),rows:rowH}}
function fitCols(tbl,ws,av,sz0,ah,above,keepSz){
  const n=ws.length,st=colStats(tbl,n),sum=a=>a.reduce((x,y)=>x+y,0);
  const avg=st.len.map((l,k)=>st.cnt[k]?l/st.cnt[k]:0),isT=avg.map(a=>a>=14),nT=isT.filter(Boolean).length;
  const need=s=>st.mw.map((e,k)=>Math.ceil(e*s*10*1.03)+150+st.ex[k]);
  const dist=(m)=>{
    /* [v18] giữ TỈ LỆ cột của file gốc (co/giãn đều cho vừa vùng chữ); chỉ nới riêng cột nào thật sự thiếu chỗ, lấy phần dư từ các cột còn rộng — không bóp cột số/mức độ */
    {const tw=sum(ws)||1,base0=ws.map(x=>x*av/tw);let w0=base0.slice(),def=0;
      w0.forEach((x,k)=>{if(x<m[k]){def+=m[k]-x;w0[k]=m[k]}});
      if(def>0){const slack=w0.map((x,k)=>base0[k]>m[k]?x-m[k]:0),st=sum(slack);if(st>=def)w0=w0.map((x,k)=>slack[k]?x-def*slack[k]/st:x);else w0=null}
      if(w0){const o2=w0.map(x=>Math.floor(x));let b=0;o2.forEach((x,k)=>{if(x>o2[b])b=k});o2[b]+=Math.floor(av)-sum(o2);if(o2.every((x,k)=>x>=m[k]-1))return o2}}
    if(!(nT>0&&nT<n)){ /* không có cột chữ nổi bật: giữ cách chia theo độ rộng gốc */
      const base=ws.map(x=>Math.max(x,1)),w=new Array(n).fill(0),lock=new Array(n).fill(false);
      for(let it=0;it<=n;it++){let ls=0,fs=0;for(let k=0;k<n;k++){if(lock[k])ls+=m[k];else fs+=base[k]}
        let bad=false;for(let k=0;k<n;k++){if(lock[k])w[k]=m[k];else{w[k]=fs>0?base[k]*(av-ls)/fs:m[k];if(w[k]<m[k]){lock[k]=true;bad=true}}}
        if(!bad)break}
      const nw=w.map(x=>Math.floor(x));let big=0;nw.forEach((x,k)=>{if(x>nw[big])big=k});nw[big]+=Math.floor(av)-sum(nw);return nw}
    /* cột số/ngắn: vừa đủ chữ; phần rộng còn lại chia cho các cột chữ dài theo lượng chữ */
    let base=m.map((x,k)=>isT[k]?x:Math.ceil(x*1.02)+20);if(sum(base)>av)base=m.slice();
    const rest=Math.floor(av)-sum(base),ds=sum(st.len.map((l,k)=>isT[k]?l:0))||1;
    const nw=base.map((x,k)=>isT[k]?x+Math.floor(rest*st.len[k]/ds):x);
    let big=0;nw.forEach((x,k)=>{if(isT[k]&&x>=nw[big])big=k});nw[big]+=Math.floor(av)-sum(nw);return nw};
  const target=Math.max(ah*0.35,ah-(above||0)-300);
  let firstOk=null,smallest=null,chosen=null;
  for(let s=sz0;s>=(keepSz?sz0:20);s-=2){const m=need(s);if(sum(m)>av)continue;
    const w=dist(m),H=estTbl(tbl,w,s).H;
    let dk=0;st.len.forEach((l,k)=>{if(isT[k]&&l>st.len[dk])dk=k});
    if(nT&&nT<n&&w[dk]<av*0.2&&s>20)continue;
    if(!firstOk)firstOk={nw:w,sz:s,H};
    if(H<=target){chosen={nw:w,sz:s,H};break}
    if(s>=22)smallest={nw:w,sz:s,H}}
  const pick=chosen||(smallest&&smallest.H<=target*1.05?smallest:null)||firstOk;
  if(!pick)return fitColsOld(tbl,ws,av,sz0,keepSz);
  return{nw:pick.nw,sz:pick.sz,est:pick.H,target}}
/* Bỏ thụt lề nhỏ thừa & dòng trống đầu/cuối trong ô của bảng nhiều cột (hay gặp khi dán từ PDF/Word cũ) */
function cellClean(doc,tbl){
  let ind=0,blk=0,tabSp=0;
  all(tbl,'tc').forEach(tc=>{if(anc(tc,'tbl')!==tbl)return;
    const ps=wk(tc,'p');
    ps.forEach(p=>{const pp=one(p,'pPr'),ie=pp&&one(pp,'ind');if(!ie||pInfo(p).list)return;
      /* [v11] thụt dòng đầu nhỏ (≤ 0,63 cm) do PDF để lại cũng bỏ — trước đây cả đoạn bị bỏ qua nên ô hẹp (vd “Tỷ lệ % điểm”) rớt từng chữ */
      if(['hanging','hangingChars','firstLineChars'].some(a=>+ga(ie,a)))return;
      const FL=+ga(ie,'firstLine')||0;if(FL>360)return;
      const L=+ga(ie,'left')||+ga(ie,'start')||0,R=+ga(ie,'right')||+ga(ie,'end')||0;
      if((L||R||FL)&&L<=240&&R<=240){['left','start','right','end','leftChars','rightChars','startChars','endChars','firstLine'].forEach(a=>ie.removeAttributeNS(W,a));if(!ie.attributes.length)rm(ie);ind++}});
    /* [v11] Tab giả giữa các chữ trong ô (“-⇥Làm⇥đất trồng cây” do PDF canh bằng tab) → dấu cách; hết giãn chữ “-      Làm      đất” khi căn đều */
    ps.forEach(p=>{if(pInfo(p).list)return;
      const kids=Array.from(p.childNodes).filter(c=>c.nodeType===1&&c.namespaceURI===W&&c.localName==='r');
      kids.forEach((r,ri)=>{const tabs=wk(r,'tab');if(!tabs.length)return;
        const before=kids.slice(0,ri).map(x=>ptext(x)).join('').replace(/\s+$/,'')+(ri?'':''),after=kids.slice(ri+1).map(x=>ptext(x)).join('');
        if(!before.trim()||!after.trim())return;                 /* tab ở đầu/cuối đoạn là canh lề thật → giữ */
        if(/[.…·]{4,}\s*$/.test(before))return;                  /* tab dẫn chấm … → giữ */
        const prevTxt=kids.slice(0,ri).map(x=>ptext(x)).join(''),nextTxt=after,needSp=!/\s$/.test(prevTxt)&&!/^\s/.test(nextTxt);
        tabs.forEach(tb=>{if(needSp){const t=doc.createElementNS(W,'w:t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=' ';r.replaceChild(t,tb)}else r.removeChild(tb)});
        tabSp++;
        if(!Array.from(r.childNodes).some(c=>c.nodeType===1&&c.localName!=='rPr'))p.removeChild(r)})});
    if(ps.length>1&&ps.some(p=>!isE(p)&&ptext(p).trim())){
      const ok=p=>isE(p)&&!hasSect(p)&&!hasPB(p);
      let i=0;while(i<ps.length-1&&ok(ps[i])){rm(ps[i]);blk++;i++}
      let j=ps.length-1;while(j>i&&ok(ps[j])){rm(ps[j]);blk++;j--}}});
  return{ind,blk,tabSp}}
/* Số hàng tiêu đề: hàng 1 + các hàng mà ô của hàng 1 gộp dọc xuống (vMerge) */
function headerSpan(rows){
  if(rows.length<2)return 1;
  const pos=tr=>{const m=[];let col=0;const tp=one(tr,'trPr'),gb=tp&&one(tp,'gridBefore');if(gb)col+=parseInt(ga(gb,'val'),10)||0;
    wk(tr,'tc').forEach(tc=>{const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),k=gs?(parseInt(ga(gs,'val'),10)||1):1,vm=cp&&one(cp,'vMerge');
      m.push({c:col,vm:vm?(ga(vm,'val')==='restart'?'restart':'cont'):''});col+=k});return m};
  const P=rows.map(pos);let span=1;
  P[0].forEach(x=>{if(x.vm!=='restart')return;let r=1;while(r<rows.length&&P[r].some(y=>y.c===x.c&&y.vm==='cont'))r++;span=Math.max(span,r)});
  /* hàng tiêu đề nhóm (gộp ngang) liền dưới ô gộp dọc cũng thuộc tiêu đề: đã nằm trong span */
  return Math.min(span,4)}
/* Ước lượng chiều cao các đoạn/bảng nằm phía trên bảng trong cùng trang (tiêu đề ma trận, quốc hiệu...) */
function aboveH(top,aw,sz){
  let h=0;
  for(let q=top.previousElementSibling;q;q=q.previousElementSibling){
    if(q.namespaceURI!==W)break;
    if(q.localName==='tbl'){h+=tblHeight(q,aw,sz||28);continue}
    if(q.localName!=='p')break;
    if(hasSect(q))break;
    h+=Math.max(1,Math.ceil(ptext(q).length*140/Math.max(1,aw)))*340+80;
    if(hasPB(q))break}
  return h}

function tblFont(doc,tbl,sz,ctx){
  ctx.fixSz=ctx.fixSz||new WeakSet();let n=0;const own=e=>anc(e,'tbl')===tbl;
  all(tbl,'r').forEach(r=>{if(!own(r))return;
    if(['object','pict','drawing'].some(t=>r.getElementsByTagNameNS(W,t).length))return;
    let pr=one(r,'rPr');if(!pr){pr=mk(doc,'rPr');r.insertBefore(pr,r.firstChild)}
    const f=one(pr,'rFonts');if(f&&SYM.test(ga(f,'ascii')+ga(f,'hAnsi')))return;
    if(one(pr,'vertAlign'))return;
    {const se0=one(pr,'sz'),was0=se0?ga(se0,'val'):'';sa(sc(doc,pr,'sz',ORD.rPr),'val',sz);sa(sc(doc,pr,'szCs',ORD.rPr),'val',sz);ctx.fixSz.add(pr);if(String(was0)!==String(sz))n++}});
  all(tbl,'p').forEach(p=>{if(!own(p))return;
    let pp=one(p,'pPr');if(!pp){pp=mk(doc,'pPr');p.insertBefore(pp,p.firstChild)}
    const pr=sc(doc,pp,'rPr',ORD.pPr);sa(sc(doc,pr,'sz',ORD.rPr),'val',sz);sa(sc(doc,pr,'szCs',ORD.rPr),'val',sz);ctx.fixSz.add(pr)});
  /* hàng đặt chiều cao CỐ ĐỊNH sẽ cắt mất chữ cỡ lớn → đổi thành "tối thiểu" */
  all(tbl,'trHeight').forEach(h=>{if(own(h)&&ga(h,'hRule')==='exact')sa(h,'hRule','atLeast')});
  return n}

function tablePass(doc,body,secs,o,rep,ctx){
  const bk=secs.bk;let tf=0,fit=0,cs=0,hd=0,al=0,fl=0,bd=0,nb=0,kt=0,ci=0,cb=0,ct=0,spc=0;
  const lockSz=o.forcesz!==false&&o.size!=='auto';   /* [v18] người dùng đã chọn cỡ chữ cố định → bảng KHÔNG tự thu nhỏ chữ */
  all(body,'tbl').forEach(tbl=>{
    const nested=!!anc(tbl,'tc');let aw0=9071,ah0=14570,tblSz=(ctx&&ctx.szEst)||28;
    let pr=one(tbl,'tblPr');if(!pr){pr=mk(doc,'tblPr');tbl.insertBefore(pr,tbl.firstChild)}
    const fp=one(pr,'tblpPr');if(fp){rm(fp);fl++}
    if(!nested){
      let top=tbl;while(top.parentNode&&top.parentNode!==body)top=top.parentNode;
      const i=bk.indexOf(top),sec=secs.find(s=>s.end>=i)||secs[secs.length-1],aw=sec.aw;aw0=aw;ah0=sec.ah;
      const ind=one(pr,'tblInd');let il=0;
      if(ind){const v=parseInt(ga(ind,'w'),10)||0;if(v<0||v>1440){sa(ind,'w',0);sa(ind,'type','dxa');fit++}else il=v}
      if(o.tblfit)try{spc+=mergeSpacerCols(doc,tbl)}catch(e){}
      const grid=one(tbl,'tblGrid'),cols=grid?wk(grid,'gridCol'):[];
      if(cols.length){
        const ws=cols.map(c=>parseInt(ga(c,'w'),10)||0),tot=ws.reduce((a,b)=>a+b,0),av=aw-il;
        let nw=null,fz=0;
        if(o.tblfit&&cols.length>=4&&wk(tbl,'tr').length>=2&&!isLayoutTbl(ws)){const cc=cellClean(doc,tbl);ci+=cc.ind;cb+=cc.blk;ct+=cc.tabSp;const fr=fitCols(tbl,ws,Math.floor(av),(ctx&&ctx.szEst)||28,ah0,aboveH(top,aw,(ctx&&ctx.szEst)||28),lockSz);nw=fr.nw;fz=fr.sz;
          if(fz<((ctx&&ctx.szEst)||28))rep.warn('Bảng nhiều cột: cỡ chữ trong bảng được giảm còn '+fz/2+' pt để mọi cột đủ rộng, không bị xuống dòng giữa từ.')}
        if(nw||tot>av+5){
          if(!nw){const f=av/tot;nw=ws.map(w=>Math.floor(w*f));nw[nw.length-1]+=Math.floor(av)-nw.reduce((a,b)=>a+b,0)}
          cols.forEach((c,k)=>sa(c,'w',nw[k]));
          wk(tbl,'tr').forEach(tr=>{let col=0;const tp=one(tr,'trPr'),gb=tp&&one(tp,'gridBefore');if(gb)col+=parseInt(ga(gb,'val'),10)||0;
            wk(tr,'tc').forEach(tc=>{const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),n=gs?(parseInt(ga(gs,'val'),10)||1):1;let w=0;
              for(let k=col;k<col+n&&k<nw.length;k++)w+=nw[k];col+=n;
              if(cp){const x=sc(doc,cp,'tcW',ORD.tcPr);sa(x,'w',w);sa(x,'type','dxa')}})});
          const x=sc(doc,pr,'tblW',ORD.tblPr);if(ga(x,'type')!=='pct'){sa(x,'w',Math.floor(av));sa(x,'type','dxa')}
          if(fz){const lt=sc(doc,pr,'tblLayout',ORD.tblPr);sa(lt,'type','fixed');
            {const cm=sc(doc,pr,'tblCellMar',ORD.tblPr);Array.from(cm.children).forEach(rm);['left','right'].forEach(n=>{const e=mk(doc,n);sa(e,'w',70);sa(e,'type','dxa');cm.appendChild(e)})}
            const tw=sc(doc,pr,'tblW',ORD.tblPr);sa(tw,'w',Math.floor(av));sa(tw,'type','dxa');if(tblFont(doc,tbl,fz,ctx)>0)tf++;tblSz=fz}
          if(nw.some((v,k)=>v!==ws[k]))fit++
        }else{const x=one(pr,'tblW');if(x&&ga(x,'type')==='dxa'&&+ga(x,'w')>av){sa(x,'w',Math.floor(av));fit++}}
      }}
    const rows=wk(tbl,'tr'),cells=rows.reduce((a,r)=>a+wk(r,'tc').length,0);
    let rowEst=null,tall=false;
    try{const g2=one(tbl,'tblGrid'),w2=g2?wk(g2,'gridCol').map(c=>parseInt(ga(c,'w'),10)||0):[];
      if(w2.length&&!nested){const te=estTbl(tbl,w2,tblSz);rowEst=te.rows;tall=te.H>ah0*0.92}}catch(e){rowEst=null}
    let hdrN=1;try{if(!nested)hdrN=headerSpan(rows)}catch(e){hdrN=1}
    if(hdrN>=rows.length)hdrN=1;
    const th0=rows[0]&&one(rows[0],'trPr'),hasTH0=!!(th0&&one(th0,'tblHeader'));
    const totKeep=new Set();
    if(!nested&&rows.length>=4){const isTot=tr=>{const t=wk(tr,'tc').map(tc=>ptextAll(tc).trim()).find(x=>x);return !!t&&/^(Tổng|TỔNG|Cộng|CỘNG|Tỷ lệ|TỶ LỆ)(\s|$)/.test(t)};
      let f=rows.length;while(f>hdrN&&isTot(rows[f-1]))f--;
      if(f<rows.length&&f-1>=hdrN)for(let q=f-1;q<rows.length-1;q++)totKeep.add(q)}
    /* Bảng ngắn (vừa trọn một trang) → giữ nguyên cả bảng trên một trang */
    const keepAll=!!(o.tblkeep&&!nested&&rows.length>1&&cells>1&&rows.length<=12&&tblHeight(tbl,aw0,(ctx&&ctx.szEst)||28)<=ah0*0.2);let tch=false;
    rows.forEach((tr,ri)=>{
      let tp=one(tr,'trPr');if(!tp){tp=mk(doc,'trPr');const ex=one(tr,'tblPrEx');tr.insertBefore(tp,ex?ex.nextSibling:tr.firstChild)}
      /* Hàng chỉ được "không cắt đôi" khi thật sự NHỎ. Hàng nhiều nội dung/hình/công thức mà bị cấm cắt sẽ bị Word đẩy nguyên sang trang sau → trang trước chỉ còn dòng tiêu đề + khoảng trống lớn. */
      const tcs=wk(tr,'tc'),
        rowSmall0=tcs.every(tc=>wk(tc,'p').length<=3&&ptextAll(tc).length<=250&&!all(tc,'tbl').length&&!all(tc,'drawing').length&&!all(tc,'pict').length&&!all(tc,'object').length&&!all(tc,'br').some(b=>ga(b,'type')==='page')),
        csE=one(tp,'cantSplit'),rowSmall=rowSmall0&&(!rowEst||rowEst[ri]<=ah0*0.2);
      if(!rowSmall&&!keepAll){if(csE){rm(csE);cs++}}
      else if(!csE){sc(doc,tp,'cantSplit',ORD.trPr);cs++}
      /* Hàng tiêu đề (hàng 1) luôn đi cùng hàng nội dung kế tiếp: không bị bỏ lẻ một mình ở cuối trang */
      if(o.tblkeep&&!nested&&rows.length>1){
        const wantK=keepAll?ri<rows.length-1:((ri<hdrN&&rowSmall)||totKeep.has(ri));
        tcs.forEach(tc=>wk(tc,'p').forEach(pp=>{let pr2=one(pp,'pPr');const kn=pr2&&one(pr2,'keepNext'),kl=pr2&&one(pr2,'keepLines');const tq=ptext(pp),mq=!!o.mcq&&(optLead(tq)||/^\s*(Câu|CÂU)\s*\d+/.test(tq));
          if(wantK&&!kn){if(!pr2){pr2=mk(doc,'pPr');pp.insertBefore(pr2,pp.firstChild)}sc(doc,pr2,'keepNext',ORD.pPr);tch=true}
          else if(!wantK&&kn&&!mq){rm(kn);tch=true}
          if(!wantK&&kl&&!mq){rm(kl);tch=true}}))}
      else if(ri===0&&rows.length>1&&rowSmall&&!nested)tcs.forEach(tc=>wk(tc,'p').forEach(pp=>{let pr2=one(pp,'pPr');if(!pr2){pr2=mk(doc,'pPr');pp.insertBefore(pr2,pp.firstChild)}if(!one(pr2,'keepNext')){sc(doc,pr2,'keepNext',ORD.pPr);cs++}}));
      if(!nested&&ri<hdrN&&(rows.length>=8||tall||hasTH0)&&!one(tp,'tblHeader')&&(ri>0||all(tr,'t').some(t=>t.textContent.trim()))){sc(doc,tp,'tblHeader',ORD.trPr);hd++}
      if(rows.length>1)wk(tr,'tc').forEach(tc=>{
        let cp=one(tc,'tcPr');if(!cp){cp=mk(doc,'tcPr');tc.insertBefore(cp,tc.firstChild)}
        if(!one(cp,'vAlign')){sa(sc(doc,cp,'vAlign',ORD.tcPr),'val','center');al++}
        const ps=wk(tc,'p');
        if(ps.length===1&&!pInfo(ps[0]).list){const t=ptext(ps[0]).trim(),pp=one(ps[0],'pPr')||(()=>{const x=mk(doc,'pPr');ps[0].insertBefore(x,ps[0].firstChild);return x})();
          if(/^(\d[\d.,%+\-–−/ ]{0,11}|STT|TT)$/i.test(t)&&!one(pp,'jc')&&!all(ps[0],'br').length){sa(sc(doc,pp,'jc',ORD.pPr),'val','center');al++}}})});
    if(tch)kt++;
    const hasB=(one(pr,'tblBorders')&&Array.from(one(pr,'tblBorders').children).some(b=>ga(b,'val')&&ga(b,'val')!=='nil'&&ga(b,'val')!=='none'))||all(tbl,'tcBorders').length||(one(pr,'tblStyle')&&!/^TableNormal$/i.test(ga(one(pr,'tblStyle'),'val')));
    if(!hasB&&rows.length>1&&cells>2){if(o.tblborder){const b=sc(doc,pr,'tblBorders',ORD.tblPr);['top','left','bottom','right','insideH','insideV'].forEach(n=>{const e=mk(doc,n);sa(e,'val','single');sa(e,'sz',4);sa(e,'space',0);sa(e,'color','auto');b.appendChild(e)});bd++}else nb++}});
  rep.fix('Bảng ma trận: gộp cột đệm siêu hẹp vào cột thật (hết chữ/số bị viết dọc)',spc);
  rep.fix('Bảng: co về vừa lề/khổ giấy',fit);rep.fix('Bảng nhiều cột: dàn lại độ rộng cột theo nội dung (đủ chỗ ghi) và dùng cỡ chữ chuẩn trong bảng',tf);rep.fix('Bảng: hàng ngắn không bị cắt đôi giữa hai trang; hàng dài (nhiều nội dung) cho phép tràn trang để không chừa khoảng trống lớn',cs);
  rep.fix('Bảng nhỏ: giữ nguyên cả bảng trên một trang',kt);rep.fix('Bảng nhiều cột: đổi tab giả giữa chữ thành dấu cách (hết giãn chữ “-      Làm      đất”)',ct);rep.fix('Bảng nhiều cột: bỏ thụt lề thừa trong ô (hết xuống dòng giữa từ như “Vận dụng”)',ci);rep.fix('Bảng nhiều cột: bỏ dòng trống đầu/cuối ô (hàng gọn hơn, vừa trang)',cb);rep.fix('Bảng dài: lặp hàng tiêu đề ở mỗi trang',hd);rep.fix('Bảng: căn giữa dọc ô và căn giữa ô số/STT',al);
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
    /* [v20] Hình “trôi” có chữ chạy quanh (wrapSquare/Tight/Through/TopAndBottom) là bố cục CÓ CHỦ Ý của đề (hình bên cạnh câu hỏi) → luôn giữ nguyên, không đổi thành hình cùng dòng
       (trước đây đổi hết làm hình dồn vào dòng “Bài III/Bài IV”, chữ bị đẩy xuống, hình nhảy vị trí) */
    const wrapKeep=el.localName==='anchor'&&Array.from(el.children).some(c=>c.namespaceURI===WP&&/^wrap(Square|Tight|Through|TopAndBottom)$/.test(c.localName));
    if(wrapKeep)ctx.keptFloat=(ctx.keptFloat||0)+1;
    if(el.localName==='anchor'&&o.imgInline&&!wrapKeep&&el.getAttribute('behindDoc')!=='1'){
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
      const ah=geo.ah*635*(o.imgMaxH||0.95);let f=Math.min(1,av/cx,ah/cy);
      if(f<0.995){set(cx*f,cy*f);fit++}}
    if(o.imgFix){const p=anc(dr,'p');
      if(p&&el.localName==='inline'&&!ptext(p).trim()&&all(p,'drawing').length===1&&!all(p,'tab').length&&!p.getElementsByTagNameNS(M,'oMath').length&&!all(p,'object').length){
        const pPr=one(p,'pPr')||(()=>{const x=mk(doc,'pPr');p.insertBefore(x,p.firstChild);return x})(),j=one(pPr,'jc');
        if(!j||/^(left|start)$/.test(ga(j,'val'))){sa(sc(doc,pPr,'jc',ORD.pPr),'val','center');const ind=one(pPr,'ind');if(ind)rm(ind);cen++}}}});
  rep.fix('Hình: chuyển hình "trôi" (anchor) thành hình cùng dòng (inline)',inl);
  if(ctx.keptFloat)rep.notes.push('Giữ nguyên '+ctx.keptFloat+' hình đang có chữ chạy quanh (không đổi vị trí/kiểu bố trí).');rep.fix('Hình: sửa hình bị méo về đúng tỉ lệ gốc',dist);
  rep.fix('Hình: thu nhỏ hình tràn lề/tràn ô bảng/quá cao',fit);rep.fix('Hình: căn giữa hình đứng riêng một dòng',cen);
  if(ext)rep.warn(ext+' hình là liên kết ngoài (không nhúng trong file) — sẽ mất khi mở trên máy khác. Hãy chèn lại hình bằng Insert → Pictures.');
  const pict=all(doc,'pict').length;if(pict)rep.warn(pict+' hình/đối tượng dạng cũ (VML) — chưa rà soát được, kiểm tra tay.')}

/* Cỡ chữ đích cho công thức = cỡ của chữ trong cùng đoạn (không ép về cỡ thân bài nếu đoạn là tiêu đề / bảng chữ nhỏ) */
function mathTargetSz(mr,ctx){
  const p=anc(mr,'p');if(!p)return ctx.sz;
  const c={};
  all(p,'r').forEach(x=>{if(anc(x,'p')!==p)return;const n=all(x,'t').reduce((a,t)=>a+t.textContent.length,0);if(!n)return;
    const pr=one(x,'rPr'),se=pr&&one(pr,'sz'),v=se?+ga(se,'val'):0;c[v]=(c[v]||0)+n});
  let best=-1,bn=0;for(const k in c)if(c[k]>bn){bn=c[k];best=+k}
  if(best>0)return best;
  return pInfo(p).head?0:ctx.sz}

function mathAndRunFmt(doc,rPr,o,ctx,rep,cnt,hf){
  const par=rPr.parentNode;if(!par||/Change$/.test(par.localName))return;
  if(par.namespaceURI===M&&par.localName==='r'){
    if(!o.mathsz||hf)return;
    const sig=()=>['ascii','hAnsi','cs','eastAsia'].map(a=>ga(one(rPr,'rFonts'),a)).concat([ga(one(rPr,'sz'),'val'),ga(one(rPr,'szCs'),'val')]).join('|'),was=sig();
    /* m:nor = chữ thường trong công thức (vd "khi", "với") → dùng font văn bản; còn lại Cambria Math */
    const nor=Array.from(par.children).some(c=>c.namespaceURI===M&&c.localName==='rPr'&&Array.from(c.children).some(x=>x.namespaceURI===M&&x.localName==='nor'&&!/^(0|off|false)$/.test(x.getAttributeNS(M,'val')||'')));
    const fn=nor?o.font:'Cambria Math';
    if(fn){const f=sc(doc,rPr,'rFonts',ORD.rPr);['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>f.removeAttributeNS(W,a));['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,fn))}
    const tg=mathTargetSz(par,ctx);
    if(tg){sa(sc(doc,rPr,'sz',ORD.rPr),'val',tg);sa(sc(doc,rPr,'szCs',ORD.rPr),'val',tg)}
    if(sig()!==was)cnt.m++;return}
  /* w:rPr nằm trong m:ctrlPr (định dạng dấu ngoặc/căn/phân số/tổng...) — giữ nguyên, đổi font sẽ làm hỏng cấu trúc công thức */
  if(par.namespaceURI===M)return;
  /* [v17] ngôn ngữ kiểm tra chính tả của từng run: chữ Việt hay bị gắn nl-NL/fr-FR/pt-BR… (dán từ web/PDF) → gạch đỏ chính tả khắp nơi. Đặt về vi-VN. */
  if(o.lang!==false){const lg=one(rPr,'lang'),v=lg?ga(lg,'val'):'';
    if(v&&!/^vi(-|$)/i.test(v)){
      const tx=par.localName==='r'?all(par,'t').map(t=>t.textContent).join(''):'';
      if(/^(nl|fr|de|es|it|pt|sv|da|nb|nn|no|fi|pl|cs|sk|hu|ro|tr|id|ms|tl|ca|hr|sl|et|lv|lt)(-|$)/i.test(v)||(/^en(-|$)/i.test(v)&&/[ăâêôơưđàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(tx))){sa(lg,'val','vi-VN');cnt.lang=(cnt.lang||0)+1}}}
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
  /* [v15] run mang cỡ chữ lẻ sát cỡ chính (vd 27 = 13,5 pt khi cỡ chính là 28) → đồng nhất về cỡ chính */
  {const so=one(rPr,'sz'),c1=so?+ga(so,'val'):0;
    if(c1&&c1%2===1&&ctx.sz%2===0&&Math.abs(c1-ctx.sz)<=1&&!va&&!hasObj&&!SYM.test(fam)&&!(ctx.fixSz&&ctx.fixSz.has(rPr))){sa(so,'val',ctx.sz);sa(sc(doc,rPr,'szCs',ORD.rPr),'val',ctx.sz);cnt.sz++}}
  /* tiêu đề/dòng in đậm đang nhỏ hơn cỡ đã chọn (vd tiêu đề sổ 8 pt): nâng lên đúng cỡ đã chọn, không thu nhỏ tiêu đề lớn hơn */
  if(head&&o.forcesz&&o.size!=='auto'&&!va&&!hasObj&&!SYM.test(fam)&&!(ctx.fixSz&&ctx.fixSz.has(rPr))){const s0=one(rPr,'sz'),c0=s0?+ga(s0,'val'):0;
    if(c0&&c0<ctx.sz){sa(s0,'val',ctx.sz);sa(sc(doc,rPr,'szCs',ORD.rPr),'val',ctx.sz);cnt.sz++}}
  if(!head&&!va&&!hasObj&&!SYM.test(fam)&&!(ctx.fixSz&&ctx.fixSz.has(rPr))){const se=one(rPr,'sz'),cur=se?+ga(se,'val'):0;
    if(!cur||(cur!==ctx.sz&&Math.abs(cur-ctx.sz)<=6)||(o.forcesz&&o.size!=='auto'&&cur<ctx.sz)){sa(sc(doc,rPr,'sz',ORD.rPr),'val',ctx.sz);sa(sc(doc,rPr,'szCs',ORD.rPr),'val',ctx.sz);if(cur)cnt.sz++}}
  (hasObj||SYM.test(fam)?['spacing','w','fitText']:['spacing','w','position','fitText']).forEach(n=>{const e=one(rPr,n);if(e){rm(e);cnt.odd++}});
  if(o.shd){const e=one(rPr,'shd');if(e){
    /* [v12] giữ nền màu nhấn có chủ ý (vàng cam FFC000, vàng, xanh nhạt… ở nhãn “Ví dụ 1”, “Chú ý”); chỉ gỡ nền xám/trắng/tối do dán từ web/PDF */
    const fl=(ga(e,'val')==='solid'?ga(e,'color'):ga(e,'fill'))||'';let keep=false;
    if(/^[0-9a-f]{6}$/i.test(fl)){const r0=parseInt(fl.slice(0,2),16),g0=parseInt(fl.slice(2,4),16),b0=parseInt(fl.slice(4,6),16),mx=Math.max(r0,g0,b0),mn=Math.min(r0,g0,b0),lum=.299*r0+.587*g0+.114*b0;keep=(mx-mn)>=60&&lum>=150}
    if(!keep){rm(e);cnt.shd++}}}
  if(o.color){['color','highlight'].forEach(n=>{const e=one(rPr,n);if(e){rm(e);cnt.col++}})}
  if(one(rPr,'vanish'))ctx.hidden++}

/* Căn lại nhãn danh sách tự động a./b./c. (cùng numId + cấp): cùng thụt lề, cùng khoảng cách sau nhãn — hết “a.Làm” sát chữ, “b.   Vẽ” cách xa */
function numLeft(numd,id,l){
  if(!numd)return null;const R0=numd.documentElement,num=wk(R0,'num').find(x=>ga(x,'numId')===id),a=num&&one(num,'abstractNumId');if(!a)return null;
  const ab=wk(R0,'abstractNum').find(x=>ga(x,'abstractNumId')===ga(a,'val')),lvl=ab&&wk(ab,'lvl').find(x=>ga(x,'ilvl')===String(l)),ie=lvl&&one(one(lvl,'pPr'),'ind');
  return ie?(+ga(ie,'left')||+ga(ie,'start')||0):null}
function listAlign(doc,body,rep,numd){
  const kids=Array.from(body.children);let n=0,i=0,tb0=0;
  /* tab riêng đặt TRƯỚC mép chữ của danh sách làm chữ nhảy về tab đó (a.Làm sát nhau) hoặc về mép chữ (b.  Vẽ cách xa) tùy bề rộng nhãn → bỏ tab thừa đó */
  kids.forEach(p=>{if(p.localName!=='p')return;const pp=one(p,'pPr'),np=pp&&one(pp,'numPr'),tb=pp&&one(pp,'tabs');if(!np||!tb)return;
    const id=one(np,'numId'),l=one(np,'ilvl');if(!id||ga(id,'val')==='0')return;
    const ie=one(pp,'ind'),left=ie&&(ie.hasAttributeNS(W,'left')||ie.hasAttributeNS(W,'start'))?(+ga(ie,'left')||+ga(ie,'start')||0):numLeft(numd,ga(id,'val'),l?+ga(l,'val'):0);
    if(!left)return;let ch=false;
    wk(tb,'tab').forEach(t=>{const pos=+ga(t,'pos');if(ga(t,'val')!=='clear'&&pos>0&&pos<left){rm(t);ch=true}});
    if(ch){if(!wk(tb,'tab').length)rm(tb);tb0++}});
  const lv=p=>{if(p.localName!=='p')return null;const pp=one(p,'pPr'),np=pp&&one(pp,'numPr');if(!np)return null;
    const id=one(np,'numId'),l=one(np,'ilvl');if(!id||ga(id,'val')==='0')return null;if(pInfo(p).head)return null;
    return {id:ga(id,'val'),l:l?+ga(l,'val'):0}};
  const apply=p=>{const pp=one(p,'pPr'),ie=sc(doc,pp,'ind',ORD.pPr),was=['left','hanging','firstLine'].map(a=>ga(ie,a)).join();
    ['start','hangingChars','firstLineChars','leftChars','startChars','firstLine'].forEach(a=>ie.removeAttributeNS(W,a));
    sa(ie,'left',1134);sa(ie,'hanging',454);
    const tb=one(pp,'tabs');if(tb)rm(tb);
    if(was!==['1134','454',''].join())n++};
  while(i<kids.length){if(!lv(kids[i])){i++;continue}
    let j=i;while(j+1<kids.length&&lv(kids[j+1]))j++;
    const run=kids.slice(i,j+1),cnt={};run.forEach(p=>{const l=lv(p).l;cnt[l]=(cnt[l]||0)+1});
    const dom=+Object.keys(cnt).sort((x,y)=>cnt[y]-cnt[x])[0],stray=run.length-cnt[dom];
    if(run.length>=2&&dom>=1&&stray<=1)run.forEach(apply);   /* a. b. c. d. (+ 1 mục lạc cấp, vd “e.”) cùng một kiểu thụt lề */
    else{const g={};run.forEach(p=>{const q=lv(p),k=q.id+':'+q.l;(g[k]=g[k]||[]).push(p)});
      Object.keys(g).forEach(k=>{if(g[k].length>=2&&+k.split(':')[1]>=1)g[k].forEach(apply)})}
    i=j+1}
  rep.fix('Danh sách a./b./c.: căn lại thụt lề và khoảng cách sau nhãn cho đều (đoạn)',n+tb0)}

/* Ô bảng hẹp: bỏ căn đều hai bên (hết giãn chữ kiểu “Làm   đất”), căn trái */
function tableJustify(doc,body,rep){
  let n=0;
  all(body,'tc').forEach(tc=>{const tp=one(tc,'tcPr'),w=tp&&one(tp,'tcW');if(!w)return;
    const ty=ga(w,'type');if(ty&&ty!=='dxa')return;const v=+ga(w,'w');if(!v||v>3200)return;
    all(tc,'p').forEach(p=>{if(anc(p,'tc')!==tc)return;const pp=one(p,'pPr'),j=pp&&one(pp,'jc');
      if(j&&ga(j,'val')==='both'){sa(j,'val','left');n++}})});
  rep.fix('Bảng: ô hẹp căn trái thay vì căn đều (hết giãn chữ) (đoạn)',n)}

function paraFmt(doc,body,o,ctx,rep){
  const line=Math.round(o.line*240),after=Math.round(o.after*20);let sp=0,jf=0,ind=0,fl=0;
  const isExam=all(body,'p').filter(q=>!anc(q,'tc')&&/^\s*(Câu|CÂU)\s*\d+/.test(ptext(q))).length>=3;
  if(o.firstLine&&isExam)rep.notes.push('Đây là đề kiểm tra (có từ 3 “Câu n” trở lên) nên bỏ qua “thụt đầu dòng 1 cm” để câu hỏi/đáp án thẳng hàng.');
  all(body,'p').forEach(p=>{
    let pPr=one(p,'pPr');if(!pPr){pPr=mk(doc,'pPr');p.insertBefore(pPr,p.firstChild)}
    const inTc=!!anc(p,'tc'),info=pInfo(p),t0=ptext(p).trim(),nxp=p.nextElementSibling;
    const optMid=!!(o.mcq&&!inTc&&/^[A-Da-d][.)]\s/.test(t0)&&nxp&&nxp.localName==='p'&&/^[A-Da-d][.)]\s/.test(ptext(nxp).trim()));
    if(o.spacing!==false){
    const s=sc(doc,pPr,'spacing',ORD.pPr),old=[ga(s,'before'),ga(s,'after'),ga(s,'line'),ga(s,'lineRule')].join();
    ['beforeLines','afterLines','beforeAutospacing','afterAutospacing'].forEach(a=>s.removeAttributeNS(W,a));
    if(!info.head){const aT=!!(ctx&&ctx.lp&&p.parentNode===body&&p.previousElementSibling&&p.previousElementSibling.localName==='tbl');sa(s,'before',aT?120:0);sa(s,'after',inTc||optMid?0:after)}
    sa(s,'line',line);sa(s,'lineRule','auto');
    if([ga(s,'before'),ga(s,'after'),ga(s,'line'),ga(s,'lineRule')].join()!==old)sp++}
    const je=one(pPr,'jc'),jc=je?ga(je,'val'):'',txt=ptext(p).trim();
    const plain=!inTc&&!info.list&&!info.head&&txt.length>=40&&!/^[A-Da-d][.)]\s/.test(txt)&&!all(p,'br').length&&!all(p,'tab').length;
    if(o.justify&&plain&&(!jc||jc==='left'||jc==='start')){sa(sc(doc,pPr,'jc',ORD.pPr),'val','both');jf++}
    const ie=one(pPr,'ind');
    if(ie&&!info.list){const L=+ga(ie,'left')||+ga(ie,'start')||0,Rr=+ga(ie,'right')||+ga(ie,'end')||0,F=+ga(ie,'firstLine')||0;
      if(L<0||Rr<0||L>5000||Rr>3000||F>1134){rm(ie);ind++}}
    if(o.firstLine&&plain&&!isExam&&!/^(Câu|CÂU|Bài|BÀI|Phần|PHẦN)\s*[\dIVX]/.test(txt)){const j=ga(one(pPr,'jc'),'val');if(j==='both'){const x=sc(doc,pPr,'ind',ORD.pPr),was=['hanging','hangingChars','firstLineChars','firstLine'].map(a=>ga(x,a)).join();['hanging','hangingChars','firstLineChars'].forEach(a=>x.removeAttributeNS(W,a));sa(x,'firstLine',567);if(was!==',,,567')fl++}}});
  rep.fix('Đồng nhất giãn dòng và khoảng cách đoạn (đoạn)',sp);rep.fix('Căn đều hai bên cho đoạn văn thường (đoạn)',jf);
  rep.fix('Gỡ thụt lề bất thường (âm/quá lớn)',ind);rep.fix('Thụt đầu dòng chuẩn 1 cm cho đoạn văn (đoạn)',fl)}

function dominantSize(body,defSz){
  const c={};all(body,'r').forEach(r=>{const p=anc(r,'p');if(p&&pInfo(p).head)return;const pr=one(r,'rPr');if(pr&&one(pr,'vertAlign'))return;
    const n=all(r,'t').reduce((a,t)=>a+t.textContent.length,0);if(!n)return;const se=pr&&one(pr,'sz'),v=se?+ga(se,'val'):defSz;c[v]=(c[v]||0)+n});
  let best=0,bn=0;for(const k in c)if(c[k]>bn){bn=c[k];best=+k}best=best||defSz;return best%2?best+1:best}   /* [v15] cỡ lẻ (vd 13,5 pt) → làm tròn lên cỡ chuẩn (14 pt) */

function numberingCheck(doc,numDoc,rep){
  const ids=new Set(numDoc?all(numDoc,'num').map(n=>ga(n,'numId')):[]);let n=0;
  all(doc,'numPr').forEach(np=>{if(np.parentNode&&np.parentNode.localName!=='pPr')return;const ni=one(np,'numId');
    if(ni&&ga(ni,'val')!=='0'&&!ids.has(ga(ni,'val'))){rm(np);n++}
    const il=one(np,'ilvl');if(il&&+ga(il,'val')>8){sa(il,'val',8);n++}});
  rep.fix('Danh sách: gỡ đánh số trỏ tới định dạng không tồn tại / cấp sai',n)}

function insBeforeAny(root,el,names){const ref=Array.from(root.children).find(c=>c.namespaceURI===W&&names.indexOf(c.localName)>=0);root.insertBefore(el,ref||null)}
function settingsPass(sd,o,ctx,rep){
  const root=sd.documentElement;
  if(o.compat&&ctx.hasMath){const cp0=one(root,'compat'),c0=cp0&&wk(cp0,'compatSetting').find(e=>ga(e,'name')==='compatibilityMode');if(!c0||(+ga(c0,'val')||0)<15)rep.warn('Giữ nguyên Compatibility Mode vì tài liệu có công thức (MathType/Equation): nâng lên Word 2013+ có thể làm công thức lệch dòng và đổi ngắt trang.')}
  if(o.compat&&!ctx.hasMath){const cp=one(root,'compat');
    if(cp){let cs=wk(cp,'compatSetting').find(e=>ga(e,'name')==='compatibilityMode');
      if(!cs){cs=mk(sd,'compatSetting');sa(cs,'name','compatibilityMode');sa(cs,'uri','http://schemas.microsoft.com/office/word');sa(cs,'val','15');cp.appendChild(cs);rep.fix('Tắt chế độ Compatibility Mode (nâng lên Word 2013+)')}
      else if((+ga(cs,'val')||0)<15){sa(cs,'val','15');rep.fix('Tắt chế độ Compatibility Mode (nâng lên Word 2013+)')}}}
  if(ctx.hasToc&&o.fields&&!one(root,'updateFields')){const u=mk(sd,'updateFields');sa(u,'val','true');insBeforeAny(root,u,['hdrShapeDefaults','footnotePr','endnotePr','compat','docVars','rsids','mathPr','attachedSchema','themeFontLang','clrSchemeMapping']);
    rep.fix('Mục lục/trường: tự cập nhật khi mở file (Word sẽ hỏi 1 lần, bấm Yes)')}
  if(o.page){['mirrorMargins','gutterAtTop','bookFoldPrinting'].forEach(n=>{const e=one(root,n);if(e){rm(e);rep.fix('Bỏ lề đối xứng/gáy sách (làm lề trái–phải lệch, rộng thêm)')}})}
  if(one(root,'evenAndOddHeaders'))rep.warn('Tài liệu bật header/footer trang chẵn–lẻ khác nhau (nếu không chủ ý: Layout → Page Setup → Layout → bỏ "Different odd and even").');
  if(o.accept){const t=one(root,'trackRevisions');if(t)rm(t)}}

function stylesPass(sd,o,ctx){
  const root=sd.documentElement;let dd=one(root,'docDefaults');if(!dd){dd=mk(sd,'docDefaults');root.insertBefore(dd,root.firstChild)}
  let rd=one(dd,'rPrDefault');if(!rd){rd=mk(sd,'rPrDefault');dd.insertBefore(rd,dd.firstChild)}
  let rp=one(rd,'rPr');if(!rp){rp=mk(sd,'rPr');rd.appendChild(rp)}
  if(o.font){const f=sc(sd,rp,'rFonts',ORD.rPr);['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>f.removeAttributeNS(W,a));['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,o.font))}
  sa(sc(sd,rp,'sz',ORD.rPr),'val',ctx.sz);sa(sc(sd,rp,'szCs',ORD.rPr),'val',ctx.sz);sa(sc(sd,rp,'lang',ORD.rPr),'val','vi-VN');
  /* [v18] kiểu Normal của file gốc ghi cứng Calibri 12 → đoạn/ô nào không có định dạng riêng vẫn hiện Calibri 12 dù đã chọn Times New Roman 14. Đồng bộ kiểu Normal với font/cỡ đã chọn. */
  const nm=wk(root,'style').find(x=>ga(x,'type')==='paragraph'&&ga(x,'default')==='1');
  if(nm){let r2=one(nm,'rPr');if(!r2){r2=mk(sd,'rPr');nm.appendChild(r2)}
    if(o.font){const f=sc(sd,r2,'rFonts',ORD.rPr);['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>f.removeAttributeNS(W,a));['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,o.font))}
    sa(sc(sd,r2,'sz',ORD.rPr),'val',ctx.sz);sa(sc(sd,r2,'szCs',ORD.rPr),'val',ctx.sz)}}

/* ---------- AI (Gemini): soát chính tả / dấu / gõ nhầm / dấu câu ---------- */
const AI_SYS=`Bạn là biên tập viên tiếng Việt chuyên soát lỗi văn bản giáo dục (môn Toán THCS). Đầu vào: mảng JSON [{"i":số,"t":"đoạn văn"}]. Chỉ soát LỖI GÕ / CHÍNH TẢ / DẤU CÂU, không biên tập văn phong.

CÁC LOẠI LỖI CẦN TÌM
1. Sai/thiếu dấu thanh, dấu mũ, dấu móc làm từ vô nghĩa: "xác xuất"→"xác suất", "chắc chắng"→"chắc chắn", "gía trị"→"giá trị", "duy nhât"→"duy nhất".
2. Nhầm hỏi/ngã, s/x, ch/tr, d/gi/r, n/l khi ngữ cảnh chỉ có một cách đúng: "bỏ xung"→"bổ sung", "xử dụng"→"sử dụng", "sữa chữa"→"sửa chữa".
3. Mã gõ Telex/VNI còn sót: "đưưọc", "tinhs", "ddường", "hamf số", "tính toán1", chữ cái w/j/s/f/r/x cuối từ, chữ số dính vào chữ.
4. Chữ dính hoặc tách sai: "trongtam giác", "tam giá c".
5. Lặp từ do gõ ("các các", "của của"); thiếu/thừa chữ cái làm từ vô nghĩa.
6. Dấu câu: thiếu dấu chấm cuối câu, câu hỏi thiếu "?", dấu phẩy/chấm dùng lẫn, dấu câu thừa hoặc liền nhau.
7. Thuật ngữ Toán viết sai so với dạng chuẩn: xác suất, tập xác định, bất phương trình, hằng đẳng thức, đường trung trực, đường phân giác, đồng dạng, tiếp tuyến, nội tiếp, ngoại tiếp, căn bậc hai, hệ phương trình, tứ giác, hình thang cân, đường trung bình, tỉ số, tần số tương đối, biểu đồ cột, biểu đồ quạt tròn.

MỨC CHẮC CHẮN
- "sua": CHỈ khi chắc chắn 100% là lỗi và chỉ có MỘT cách sửa đúng (từ vô nghĩa trong tiếng Việt, mã gõ Telex/VNI còn sót, lặp từ vô nghĩa, chữ dính rõ ràng).
- "goiy": khi có thể đúng ý tác giả (từ có thể đúng ở ngữ cảnh khác, cách dùng từ, mọi lỗi dấu câu). Chỉ thiếu "?" ở câu có từ nghi vấn rõ ràng mới xem là "sua".

TUYỆT ĐỐI KHÔNG
- Không động vào: công thức, số liệu, ký hiệu toán (ΔABC, x^2, góc A), tên điểm/đường/hình (A, B, AB, d, (O)), tên riêng, chữ viết tắt (GV, HS, THCS, SGK), từ tiếng Anh, đoạn "⟦CT⟧" (đó là công thức).
- Không viết lại câu, không đổi văn phong, không thêm/bớt ý, không thay bằng từ đồng nghĩa, không "chuẩn hóa" cách diễn đạt đang đúng.
- Không sửa chữ in hoa/thường có chủ ý (tiêu đề IN HOA, "Câu 1", "PHẦN I").
- Gặp từ chuyên môn lạ mà không chắc → bỏ qua. Báo ít nhưng đúng quan trọng hơn báo nhiều.
- "find" phải trùng NGUYÊN VĂN từng chữ và dấu, đủ dài để chỉ xuất hiện đúng một lần trong đoạn.

TRẢ VỀ: DUY NHẤT một mảng JSON, không Markdown: [{"i":số,"find":"cụm sai nguyên văn (1–6 từ, nằm trọn trong đoạn)","replace":"cụm đã sửa (giữ nguyên mọi chữ số)","kind":"sua"|"goiy"}]. Mỗi lỗi một mục. Không có lỗi trả về [].`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* ---- Model Gemini: chỉ 3 tên "latest" (Google tự trỏ tới bản mới nhất nên không hỏng khi đổi phiên bản) ---- */
const MODELS=[['gemini-flash-lite-latest','Gemini Flash Lite (bản mới nhất)'],['gemini-flash-latest','Gemini Flash (bản mới nhất)'],['gemini-pro-latest','Gemini Pro (bản mới nhất)']];
const GURL='https://generativelanguage.googleapis.com/v1beta/models/';
const USED=new Set();   /* model thực sự đã chạy được trong lần xử lý hiện tại */
/* thứ tự thử: model người dùng chọn (nếu có) trước, rồi các model còn lại theo Lite → Flash → Pro */
function chainFor(model){const c=MODELS.map(m=>m[0]);const i=c.indexOf(model);if(i>0){c.splice(i,1);c.unshift(model)}else if(i<0&&model)c.unshift(model);return c}
async function aiPass(body,o,rep,hooks){
  const key=window.GKEY&&window.GKEY.get();
  if(!key){rep.warn('AI soát chính tả: chưa có API key Gemini — bấm "🔑 Nhập key" ở đầu trang rồi chạy lại.');if(window.GKEY&&window.GKEY.open)window.GKEY.open('Nhập key để dùng AI soát chính tả.');return}
  const walk=(n,out)=>{for(const c of Array.from(n.childNodes)){if(c.nodeType!==1)continue;
    if(c.namespaceURI===M){if(c.localName==='oMath'||c.localName==='oMathPara')out.push('⟦CT⟧');continue}
    if(c.namespaceURI===W&&c.localName==='t'){out.push(c.textContent);continue}
    if(c.namespaceURI===W&&c.localName==='object'){out.push('⟦CT⟧');continue}
    if(c.namespaceURI===W&&/^(drawing|pict|delText)$/.test(c.localName))continue;walk(c,out)}return out};
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
    const body=JSON.stringify({systemInstruction:{parts:[{text:AI_SYS}]},contents:[{role:'user',parts:[{text:JSON.stringify(b.map(x=>({i:x.i,t:x.t})))}]}],generationConfig:{temperature:0,maxOutputTokens:8192,responseMimeType:'application/json'}});
    let res=null;const tried=[];
    for(let round=0;round<2;round++){
      let allRate=true;
      for(const mdl of chainFor(o.aiModel)){
        for(let a=0;a<3;a++){
          try{res=await fetch(GURL+mdl+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body})}
          catch(e){return{stop:'không kết nối được Gemini ('+e.message+')'}}
          if((res.status===500||res.status===503)&&a<2){await sleep(2500*(a+1));continue}
          break}
        if(res.ok){USED.add(mdl);break}
        if(res.status!==429)allRate=false;
        if(tried.indexOf(mdl)<0)tried.push(mdl);
        hooks.progress('AI: '+mdl+' không dùng được (HTTP '+res.status+'), thử model kế tiếp...')}
      if(res.ok||!allRate||round)break;
      hooks.progress('AI: các model đều chạm hạn mức, chờ 25 giây rồi thử lại...');await sleep(25000)}
    if(!res.ok)return{stop:(res.status===429?'hết hạn mức key (đợi ~1 phút rồi chạy lại)':[400,401,403].indexOf(res.status)>=0?'key không hợp lệ hoặc không có quyền dùng model Gemini':'lỗi Gemini HTTP '+res.status)+' (đã thử: '+tried.join(', ')+')'};
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

/* ---------- AI (Gemini): RÀ SOÁT ĐỀ THI TOÀN DIỆN (chạy sau khi rà soát/chuẩn hóa; chỉ chạy khi đã có key Gemini) ---------- */
const AI_EXAM_SYS=`Bạn là chuyên gia khảo thí kiêm giáo viên Toán THCS giàu kinh nghiệm (Chương trình GDPT 2018, lớp 6–9), đồng thời là biên tập viên đề thi. Nhiệm vụ: rà soát đề thi, chỉ nêu những lỗi có bằng chứng kiểm chứng được, kèm cách sửa nhỏ nhất. Môn khác (Công nghệ, KHTN, Ngữ văn...) áp dụng cùng quy trình với kiến thức của môn đó.

ƯU TIÊN TUYỆT ĐỐI: chính xác hơn số lượng. Một lỗi báo nhầm làm giáo viên mất niềm tin hơn một lỗi bị sót. Chỉ khi chắc chắn mới đưa vào "loi"; còn nghi ngờ thì đưa vào "canxacminh".

DỮ LIỆU ĐẦU VÀO
- THÔNG TIN BỔ SUNG: môn, lớp, dạng đề, đáp án, ma trận... do giáo viên cung cấp (tin hơn suy luận của bạn).
- GỢI Ý CẤU TRÚC: số câu, số phương án, điểm từng câu do CÔNG CỤ ĐẾM BẰNG MÃ — đáng tin hơn bạn khi đếm. Nếu thấy mâu thuẫn với đề thì nêu rõ.
- ĐỀ THI: mỗi dòng bắt đầu bằng mã đoạn [Pn]. Công thức nằm trong $...$ (LaTeX, do công cụ trích). Hàng bảng: các ô cách nhau bằng " | ".
- ⟦HÌNH⟧ = hình vẽ/ảnh bạn KHÔNG nhìn thấy. ⟦CT-ẢNH⟧ = công thức dạng đối tượng/ảnh (MathType) bạn KHÔNG đọc được. Hai ký hiệu này KHÔNG phải lỗi. Với câu có chúng: không giải, không kết luận đúng/sai phần phụ thuộc vào chỗ đó, không đoán nội dung; chỉ rà soát phần chữ nhìn thấy; cần xác nhận thì đưa vào "canxacminh".

QUY TRÌNH (làm tuần tự, không bỏ bước)
Bước 1 — Nhận diện: môn, lớp, dạng đề (trắc nghiệm nhiều lựa chọn A–D / đúng–sai a–d / trả lời ngắn / tự luận), số câu, thang điểm, thời gian. Thiếu thông tin thì suy luận từ đề và ghi rõ "suy luận".
Bước 2 — Tự giải độc lập: với MỖI câu có tính toán/suy luận/chọn đáp án, tự giải từ đầu, KHÔNG nhìn đáp án trong đề; trắc nghiệm thì thử từng phương án A–D và đếm số phương án đúng. Ghi kết quả ngắn vào "kiemtra". Chỉ sau đó mới đối chiếu với đáp án/hướng dẫn chấm có trong đề (thường ở cuối đề hoặc bảng đáp án; đối chiếu theo số câu).
Bước 3 — Rà soát theo các nhóm lỗi bên dưới. Mỗi lỗi phải có bằng chứng trích nguyên văn.
Bước 4 — Tự phản biện: với từng lỗi định nêu, hỏi "nếu đề đúng thì sao?": thử cách hiểu khác, kiểm tra lại phép tính bằng cách khác (thế ngược, ước lượng, kiểm tra điều kiện). Không vượt qua phản biện thì hạ xuống "canxacminh" hoặc bỏ.
Bước 5 — Kiểm tra toàn cục khi thấy đủ dữ liệu: số câu, thứ tự đánh số, tổng điểm so với thang điểm, đáp án đủ cho mọi câu.

CÁC NHÓM LỖI VÀ ĐIỂM CẦN KIỂM TRA
a. Kiến thức: sai khái niệm/định lí/công thức/tính chất; sai điều kiện xác định, điều kiện của tham số, nghiệm ngoại lai; sai đơn vị, làm tròn; ký hiệu hình học sai (đường thẳng/đoạn thẳng/tia, góc, tam giác vuông tại đỉnh nào); số liệu phi thực tế (tuổi, giá tiền, độ dài âm, tam giác không tồn tại, xác suất ngoài [0;1], tần số tương đối không cộng thành 100%, tổng tần số không khớp); nội dung vượt hoặc lệch chương trình của lớp đang thi.
b. Đáp án: đáp án trong đề khác kết quả bạn tự giải; trắc nghiệm không có hoặc có hơn một phương án đúng; hai phương án giống hệt hoặc tương đương nhau; phương án nhiễu vô lý (khác loại, ngoài miền xác định); câu đúng–sai: kiểm riêng từng ý a, b, c, d; câu trả lời ngắn: kết quả phải duy nhất và có yêu cầu làm tròn; hướng dẫn chấm không khớp đề, điểm thành phần không cộng ra điểm câu.
c. Logic đề: dữ kiện thiếu, thừa, mâu thuẫn; đề không giải được hoặc có nhiều nghiệm trong khi hỏi nghiệm duy nhất; câu hỏi mơ hồ, nhiều cách hiểu; ý sau lộ đáp án ý trước; yêu cầu chứng minh điều sai; tham chiếu "hình bên", "bảng sau", "câu trước" nhưng không có.
d. Ngôn ngữ: chính tả, dấu câu, ngữ pháp, diễn đạt tối nghĩa; ký hiệu/tên không nhất quán (gọi cùng một điểm là M ở chỗ này, N ở chỗ khác là lỗi; còn chỗ viết "ΔABC" chỗ viết "tam giác ABC" thì KHÔNG phải lỗi).
e. Hình thức: đánh số câu/phần nhảy, trùng, thiếu; nhãn đáp án thiếu/lặp (A, B, C, C); lời dẫn/hướng dẫn làm bài; thông tin đầu đề (thời gian, số trang...).
f. Điểm số và cấu trúc: tổng điểm lệch thang; điểm từng ý cộng không ra điểm câu; thời gian không phù hợp khối lượng; mức độ khó/phân bố nhận biết–thông hiểu–vận dụng lệch hẳn ma trận (chỉ khi có ma trận).

KHÔNG COI LÀ LỖI
Khác biệt phong cách; cách diễn đạt khác nhưng vẫn đúng; việc không thấy hình (⟦HÌNH⟧) hay công thức ảnh (⟦CT-ẢNH⟧); công thức hiển thị dạng LaTeX do công cụ trích; số thập phân dùng dấu phẩy hay chấm nếu cả đề nhất quán; đáp án đúng nhưng có cách giải khác; đề không kèm đáp án (khi đó vẫn tự giải để kiểm tra tính giải được và số đáp án đúng, nhưng không kết luận "đáp án sai"); thứ tự trình bày không ảnh hưởng nội dung; chỗ bạn không chắc về chương trình.

QUY TẮC BẰNG CHỨNG VÀ MỨC ĐỘ
1. Mỗi lỗi có "bangchung": trích NGUYÊN VĂN không quá 15 từ từ đề (đúng chữ, đúng dấu; ưu tiên đoạn CHỮ, tránh trích công thức) và "id" là mã [Pn] của đoạn chứa trích dẫn đó. Không trích được thì không phải lỗi chắc chắn.
2. "tincay": cao = đã tự giải/kiểm tra bằng ít nhất hai cách, hoặc lỗi hiển nhiên đếm/nhìn thấy được (thiếu phương án, lặp nhãn, sai chính tả rõ); trungbinh = lập luận hợp lý nhưng còn cách hiểu khác; thap = chỉ nghi ngờ.
3. "mucdo": Nghiêm trọng = làm đáp án sai, đề không giải được, nhiều/không có đáp án đúng, sai kiến thức; Trung bình = gây hiểu nhầm, thiếu chặt chẽ, lệch điểm; Nhẹ = chính tả, trình bày.
4. Mỗi lỗi một mục riêng, không gộp nhiều chỗ, không lặp lại cùng một lỗi (lỗi giống nhau ở nhiều câu: nêu ở câu đầu và ghi "tương tự ở câu ...").
5. "sua": cách sửa NHỎ NHẤT, không bịa dữ kiện/số liệu; nhiều cách hợp lý thì nêu cách chọn và phương án còn lại. Nếu đáp án đúng là kết quả bạn tính ra, ghi phép tính chính (ngắn).
6. Không thêm nhận xét thừa, không giải thích kiến thức nền, không viết lại đề, không giải chi tiết.

VÍ DỤ MẪU (nội dung giả định, minh họa mức chuẩn)
- ĐÚNG: đề "Câu 5. Giá trị của biểu thức 2^3+3 là A. 9 B. 11 C. 14 D. 8", đáp án ghi A. Tự giải: 2^3=8, 8+3=11 nên đáp án đúng là B. → loi: nhom "Đáp án", mucdo "Nghiêm trọng", tincay "cao", bangchung "Giá trị của biểu thức 2^3+3 là", sua "Sửa đáp án thành B (2^3+3=11)".
- ĐÚNG: nhãn đáp án "A. B. C. C." → loi: nhom "Hình thức", mucdo "Nhẹ", tincay "cao", sua "Đổi nhãn C thứ hai thành D".
- KHÔNG PHẢI LỖI: "Cho hình vẽ bên. Tính số đo góc x" mà đề có ⟦HÌNH⟧ → không báo "thiếu dữ kiện"; nếu cần thì đưa vào canxacminh với lý do "phụ thuộc hình".
- CHỈ LÀ NGHI NGỜ: không chắc nội dung đã học ở lớp đang thi chưa → canxacminh, không đưa vào loi.

QUY ƯỚC CỦA CÔNG CỤ
- Đề chia nhiều phần (Phần k/n): chỉ rà soát phần được gửi; kiểm tra toàn cục (tổng điểm, tổng số câu) chỉ làm khi thấy đủ dữ liệu.
- Trong JSON TUYỆT ĐỐI KHÔNG dùng dấu gạch chéo ngược. Viết công thức dạng chữ: x^2, căn(x), (a)/(b), pi, <=, >=.
- Nội dung mờ/thiếu thì nói rõ phần không đọc được, không đoán.

OUTPUT: CHỈ MỘT đối tượng JSON hợp lệ, không Markdown, đúng dạng:
{"tomtat":"môn/lớp/dạng đề nhận diện được (ghi rõ nếu suy luận), số câu, thang điểm, số lỗi theo nhóm, đánh giá chung",
 "kiemtra":[{"cau":"số câu","cach_giai":"cách giải ngắn của bạn, tối đa 25 từ","ketqua_ai":"đáp án/kết quả bạn tự tính","trong_de":"đáp án ghi trong đề hoặc rỗng","khop":true|false|null}],
 "loi":[{"id":"Pn","vitri":"phần/câu/ý","nhom":"Kiến thức|Đáp án|Logic|Ngôn ngữ|Hình thức|Điểm số","bangchung":"trích nguyên văn ≤15 từ","noidung":"nội dung lỗi, ngắn gọn","mucdo":"Nghiêm trọng|Trung bình|Nhẹ","tincay":"cao|trungbinh|thap","sua":"cách sửa nhỏ nhất"}],
 "canxacminh":[{"id":"Pn","vitri":"phần/câu","lydo":"điều chưa chắc hoặc câu hỏi cần giáo viên xác nhận"}],
 "xacnhan":"các hạng mục đã kiểm tra lại (đáp án, tổng điểm, số câu, chính tả, định dạng) và kết quả; không khẳng định tuyệt đối không còn lỗi nếu còn mục chưa xác minh"}
"kiemtra" liệt kê mọi câu bạn đã tự giải (kể cả khi đề không có đáp án: để "trong_de" rỗng và "khop":null). Không xuất đề đã sửa. Nếu không có lỗi thì "loi":[].`;

const AI_VERIFY_SYS=`Bạn là thẩm định viên độc lập về chuyên môn đề thi (Toán THCS và các môn khác). Bạn nhận danh sách "ứng viên lỗi" do một người rà soát khác nêu ra, kèm đoạn đề chứa chỗ bị nêu và (nếu có) phần ĐÁP ÁN/HƯỚNG DẪN CHẤM của đề. Người rà soát có thể SAI; KHÔNG mặc định lỗi tồn tại. Mặc định hoài nghi.
Với MỖI ứng viên làm đúng thứ tự:
(1) Tự giải/kiểm tra lại từ đầu bằng chính đoạn đề, chưa nhìn kết luận của người rà soát (trắc nghiệm: thử từng phương án A–D; tính toán: kiểm tra bằng cách thứ hai như thế ngược hoặc ước lượng).
(2) Đối chiếu với kết luận của người rà soát và với đáp án trong đề.
(3) Kiểm tra cách sửa đề xuất: sửa xong có tạo ra lỗi mới không.
Kết luận:
- "dung": lỗi có thật, kiểm chứng được từ đoạn đề, cách sửa hợp lý.
- "sai": đề đúng, ứng viên là báo nhầm (nêu lý do ngắn).
- "khongchac": không đủ dữ kiện (phụ thuộc hình ⟦HÌNH⟧ hoặc công thức ảnh ⟦CT-ẢNH⟧ bạn không đọc được, cần chương trình/nguồn ngoài, có nhiều cách hiểu hợp lý).
Không bịa dữ kiện. Công thức nằm trong $...$ (LaTeX).
Trả về DUY NHẤT một mảng JSON, không Markdown, KHÔNG dùng dấu gạch chéo ngược: [{"k":số thứ tự ứng viên,"giai":"kết quả tự giải/kiểm tra, tối đa 40 từ","ketluan":"dung"|"sai"|"khongchac","lydo":"tối đa 30 từ","sua":"cách sửa chính xác nếu kết luận dung, ngắn gọn; nếu cách sửa đề xuất chưa đúng thì nêu cách đúng"}]. Phải có đủ mọi k được gửi.`;

const _S={type:'STRING'},_B={type:'BOOLEAN',nullable:true};
const _arr=(props,order,req)=>({type:'ARRAY',items:{type:'OBJECT',properties:props,propertyOrdering:order,required:req}});
const EXAM_SCHEMA={type:'OBJECT',properties:{
  tomtat:_S,
  kiemtra:_arr({cau:_S,cach_giai:_S,ketqua_ai:_S,trong_de:_S,khop:_B},['cau','cach_giai','ketqua_ai','trong_de','khop'],['cau','ketqua_ai']),
  loi:_arr({id:_S,vitri:_S,nhom:{type:'STRING',enum:['Kiến thức','Đáp án','Logic','Ngôn ngữ','Hình thức','Điểm số']},bangchung:_S,noidung:_S,mucdo:{type:'STRING',enum:['Nghiêm trọng','Trung bình','Nhẹ']},tincay:{type:'STRING',enum:['cao','trungbinh','thap']},sua:_S},['id','vitri','nhom','bangchung','noidung','mucdo','tincay','sua'],['id','nhom','bangchung','noidung','mucdo','tincay']),
  canxacminh:_arr({id:_S,vitri:_S,lydo:_S},['id','vitri','lydo'],['lydo']),
  xacnhan:_S},
  propertyOrdering:['tomtat','kiemtra','loi','canxacminh','xacnhan'],required:['loi','canxacminh']};
const VERIFY_SCHEMA=_arr({k:{type:'INTEGER'},giai:_S,ketluan:{type:'STRING',enum:['dung','sai','khongchac']},lydo:_S,sua:_S},['k','giai','ketluan','lydo','sua'],['k','ketluan']);

function ommlTex(n){
  if(!n||n.namespaceURI!==M)return '';
  const ch=(p,nm)=>Array.from(p.children).find(c=>c.namespaceURI===M&&c.localName===nm)||null;
  const kids=p=>Array.from(p.children).filter(c=>c.namespaceURI===M&&!/Pr$/.test(c.localName)).map(ommlTex).join('');
  switch(n.localName){
    case 't':return n.textContent;
    case 'f':return '\\frac{'+ommlTex(ch(n,'num'))+'}{'+ommlTex(ch(n,'den'))+'}';
    case 'sSup':return '{'+ommlTex(ch(n,'e'))+'}^{'+ommlTex(ch(n,'sup'))+'}';
    case 'sSub':return '{'+ommlTex(ch(n,'e'))+'}_{'+ommlTex(ch(n,'sub'))+'}';
    case 'sSubSup':return '{'+ommlTex(ch(n,'e'))+'}_{'+ommlTex(ch(n,'sub'))+'}^{'+ommlTex(ch(n,'sup'))+'}';
    case 'rad':{const dg=ommlTex(ch(n,'deg')).trim();return '\\sqrt'+(dg?'['+dg+']':'')+'{'+ommlTex(ch(n,'e'))+'}'}
    case 'd':{const pr=ch(n,'dPr'),b=pr&&ch(pr,'begChr'),e2=pr&&ch(pr,'endChr'),s=pr&&ch(pr,'sepChr');
      const bc=b?b.getAttributeNS(M,'val'):'(',ec=e2?e2.getAttributeNS(M,'val'):')',sc2=s?s.getAttributeNS(M,'val'):'|';
      const es=Array.from(n.children).filter(c=>c.namespaceURI===M&&c.localName==='e').map(ommlTex);
      const B=bc==='{'?'\\{':bc,E=ec==='}'?'\\}':ec;return B+es.join(sc2)+E}
    case 'nary':{const pr=ch(n,'naryPr'),c=pr&&ch(pr,'chr'),cv=c?c.getAttributeNS(M,'val'):'∫';
      const mp={'∑':'\\sum','∏':'\\prod','∫':'\\int','∬':'\\iint','∮':'\\oint'};
      const sub=ommlTex(ch(n,'sub')),sup=ommlTex(ch(n,'sup'));
      return (mp[cv]||cv)+(sub?'_{'+sub+'}':'')+(sup?'^{'+sup+'}':'')+' '+ommlTex(ch(n,'e'))}
    case 'func':return ommlTex(ch(n,'fName')).trim()+' '+ommlTex(ch(n,'e'));
    case 'limLow':return ommlTex(ch(n,'e'))+'_{'+ommlTex(ch(n,'lim'))+'}';
    case 'limUpp':return ommlTex(ch(n,'e'))+'^{'+ommlTex(ch(n,'lim'))+'}';
    case 'bar':return '\\overline{'+ommlTex(ch(n,'e'))+'}';
    case 'acc':{const pr=ch(n,'accPr'),c=pr&&ch(pr,'chr'),cv=c?c.getAttributeNS(M,'val'):'\u0302',nm={'\u20d7':'vec','\u0302':'hat','\u0303':'tilde','\u0304':'overline','\u0305':'overline'}[cv]||'hat';return '\\'+nm+'{'+ommlTex(ch(n,'e'))+'}'}
    case 'eqArr':return Array.from(n.children).filter(c=>c.namespaceURI===M&&c.localName==='e').map(ommlTex).join(' \\\\ ');
    case 'm':return '\\begin{matrix}'+Array.from(n.children).filter(c=>c.namespaceURI===M&&c.localName==='mr').map(r=>Array.from(r.children).filter(c=>c.namespaceURI===M&&c.localName==='e').map(ommlTex).join(' & ')).join(' \\\\ ')+'\\end{matrix}';
    case 'sPre':return '{}_{'+ommlTex(ch(n,'sub'))+'}^{'+ommlTex(ch(n,'sup'))+'} '+ommlTex(ch(n,'e'));
    default:return kids(n)}}
/* [v17] w:sym = ký hiệu chèn bằng Insert → Symbol (∈, ℝ, ≠, ≤…). Trước đây bị bỏ qua nên AI thấy “với x .” cụt và báo nhầm. */
const SYM_UNI={symbol:{F0CE:'∈',F0CF:'∉',F0B9:'≠',F0A3:'≤',F0B3:'≥',F0B1:'±',F0B4:'×',F0B8:'÷',F0AE:'→',F0AC:'←',F0AB:'↔',F0DE:'⇒',F0DB:'⇔',F0A5:'∞',F0D6:'√',F0B0:'°',F0C7:'∩',F0C8:'∪',F0CC:'⊂',F0CD:'⊆',F0D0:'∠',F0B7:'•'},'euclid extra':{F0A1:'ℝ'}};
function symChar(font,ch){const u=(SYM_UNI[String(font||'').toLowerCase()]||{})[String(ch||'').toUpperCase()];return u||'⟦KÝ-HIỆU⟧'}
function docxToParas(doc){
  const body=doc.getElementsByTagNameNS(W,'body')[0],items=[];
  const walk=(n,o)=>{for(const c of Array.from(n.childNodes)){if(c.nodeType!==1)continue;
    if(c.namespaceURI===M){if(c.localName==='oMathPara'){o.push('$'+Array.from(c.children).map(ommlTex).join(' ')+'$')}else if(c.localName==='oMath')o.push('$'+ommlTex(c)+'$');continue}
    if(c.namespaceURI!==W){walk(c,o);continue}
    const l=c.localName;
    if(l==='t'){o.push(c.textContent);continue}
    if(l==='tab'||l==='br'||l==='cr'){o.push(l==='br'&&ga(c,'type')==='page'?'':' ');continue}
    if(l==='sym'){o.push(symChar(ga(c,'font'),ga(c,'char')));continue}
    if(l==='delText'||l==='instrText'||l==='rPr'||l==='pPr')continue;
    if(l==='drawing'||l==='pict'||l==='object'){let tag='⟦HÌNH⟧';
      if(l!=='drawing'){const ole=c.getElementsByTagNameNS('urn:schemas-microsoft-com:office:office','OLEObject')[0];if(ole&&/Equation|MathType|DSMT/i.test(ole.getAttribute('ProgID')||''))tag='⟦CT-ẢNH⟧'}
      if(o[o.length-1]!==tag)o.push(tag);continue}
    walk(c,o)}return o};
  const para=p=>walk(p,[]).join('').replace(/[ \t\u00a0]+/g,' ').trim();
  const push=(t,el)=>{if(t){const it={id:'P'+(items.length+1),t,el};items.push(it);return it}};
  for(const el of Array.from(body.children)){
    if(el.namespaceURI!==W)continue;
    if(el.localName==='p')push(para(el),el);
    else if(el.localName==='tbl')wk(el,'tr').forEach(tr=>{const tcs=wk(tr,'tc'),cells=tcs.map(tc=>wk(tc,'p').map(para).filter(Boolean).join(' / '));if(cells.some(x=>x)){const it=push('| '+cells.join(' | ')+' |',tcs.map(tc=>wk(tc,'p').find(p=>para(p))).find(Boolean));if(it){it.cts=cells;it.cps=tcs.map(tc=>wk(tc,'p').find(p=>para(p))||null)}}})}
  /* nhãn Câu/Bài hiện hành và khối (một câu hỏi = một khối) cho từng đoạn */
  let cau='',blk=0,de=0,sec='de';
  items.forEach((it,i)=>{
    if(/(^|\|)\s*ĐÁP ÁN\b|\bĐÁP ÁN MÔN|HƯỚNG DẪN CHẤM/.test(it.t)){sec='key';cau='';blk=i}
    else if(/PHIẾU TRẢ LỜI|BÀI LÀM ĐỀ/.test(it.t)){sec='phieu';cau='';blk=i}
    else if(/ĐỀ KIỂM TRA|MA TRẬN ĐỀ|BẢN ĐẶC TẢ/.test(it.t)){sec='de';cau='';blk=i}
    const md=/Đề\s*số\s*(\d+)/i.exec(it.t);if(md)de=+md[1];it.de=de;it.sec=sec;
    const m=/^[\s$]*(Câu|Bài|CÂU|BÀI)\s*(\d+)/.exec(it.t);if(m){cau=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()+' '+m[2];blk=i}else if(/^(PHẦN|Phần|PHẦN|ĐỀ|Đề)\s*[IVX\d]/.test(it.t)){cau='';blk=i}
    it.cau=cau;it.blk=blk});
  return items}

const nzs=t=>String(t||'').normalize('NFC').toLowerCase().replace(/[$\u00a0]/g,' ').replace(/\s+/g,' ').trim();
function parseJ(t){t=String(t).trim().replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,'');
  try{return JSON.parse(t)}catch(e){return JSON.parse(t.replace(/\\(?!["\\\/bfnrtu])/g,'\\\\'))}}
const FEATS={};
async function geminiJSON1(key,model,sys,userText,hooks,label,rep,schema){
  const F=FEATS[model]||(FEATS[model]={think:true,schema:true});
  let useT=F.think,useS=!!schema&&F.schema,res=null,dropped=false;
  for(let a=0;a<6;a++){
    const gen={temperature:0,maxOutputTokens:32768,responseMimeType:'application/json'};
    if(useT)gen.thinkingConfig={thinkingBudget:12288};
    if(useS)gen.responseSchema=schema;
    try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:[{role:'user',parts:[{text:userText}]}],generationConfig:gen})})}
    catch(e){return{err:'không kết nối được Gemini ('+e.message+')'}}
    /* 400 có thể do model không hỗ trợ schema/thinking: bỏ dần từng tính năng rồi thử lại */
    if(res.status===400&&(useS||useT)){if(useS)useS=false;else useT=false;dropped=true;continue}
    if((res.status===500||res.status===503)&&a<3){await sleep(3000*(a+1));continue}
    break}
  if(!res.ok)return{err:'HTTP '+res.status,down:true,st:res.status};   /* model không dùng được → bộ bọc sẽ thử model kế tiếp */
  if(dropped){F.schema=useS;F.think=useT}
  try{const j=await res.json(),c=(j.candidates||[])[0],fin=c&&c.finishReason||'';
    const t=((c&&c.content&&c.content.parts)||[]).map(x=>x.text||'').filter((x,i)=>!(c.content.parts[i]&&c.content.parts[i].thought)).join('');
    try{return{json:parseJ(t),fin}}catch(e){return{err:'dữ liệu Gemini trả về không đọc được'+(fin==='MAX_TOKENS'?' (bị cắt do quá dài)':''),retry:1}}}
  catch(e){return{err:'dữ liệu Gemini trả về không đọc được',retry:1}}}
/* gọi Gemini, tự chuyển model khi model đó lỗi/hết hạn mức/ngừng hoạt động: Lite → Flash → Pro */
async function geminiJSON(key,model,sys,userText,hooks,label,rep,schema){
  const tried=[];let last=null;
  for(let round=0;round<2;round++){
    let allRate=true;
    for(const m of chainFor(model)){
      const r=await geminiJSON1(key,m,sys,userText,hooks,label,rep,schema);
      if(!r.down){if(!r.err||r.retry)USED.add(m);return r}
      last=r;if(r.st!==429)allRate=false;if(tried.indexOf(m)<0)tried.push(m);
      hooks.progress(label+': '+m+' không dùng được ('+r.err+'), thử model kế tiếp...')}
    if(!allRate||round)break;
    hooks.progress(label+': các model đều chạm hạn mức, chờ 25 giây rồi thử lại...');await sleep(25000)}
  const st=last&&last.st;
  return{err:(st===429?'hết hạn mức key (đợi ~1 phút rồi chạy lại)':[400,401,403].indexOf(st)>=0?'key không hợp lệ hoặc không có quyền dùng model Gemini':'lỗi Gemini HTTP '+st)+' (đã thử: '+tried.join(', ')+')'}}
function chunkParas(items){
  const LIM=45000,PART=26000,tot=items.reduce((a,x)=>a+x.t.length+8,0);
  if(tot<=LIM)return[items];
  let head=[],hl=0;for(const it of items){if(/^[\s$]*(Câu|Bài)\s*\d+/i.test(it.t)||hl>1500)break;head.push(it);hl+=it.t.length}
  const chunks=[];let cur=[],len=0,i=0;
  while(i<items.length){let j=i+1;while(j<items.length&&items[j].blk===items[i].blk)j++;
    const blk=items.slice(i,j),bl=blk.reduce((a,x)=>a+x.t.length+8,0);
    if(cur.length&&len+bl>PART){chunks.push(cur);cur=[];len=0}
    cur=cur.concat(blk);len+=bl;i=j}
  if(cur.length)chunks.push(cur);
  chunks.forEach((c,k)=>{if(k>0&&head.length)c.head=head});return chunks}
const fmtP=its=>its.map(x=>'['+x.id+'] '+(x.de?'(Đề '+x.de+(x.sec==='key'?' – đáp án':x.sec==='phieu'?' – phiếu':'')+') ':'')+x.t).join('\n');

/* ---- Chứng cứ: khớp mềm (bỏ dấu câu/ký hiệu, hoặc các từ chữ xuất hiện đúng thứ tự trong đoạn) ---- */
const nzk=t=>String(t||'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const wtok=t=>String(t||'').normalize('NFC').toLowerCase().match(/\p{L}{2,}/gu)||[];
function evHit(bc,text){
  const a=nzk(bc);if(a.length>=4&&nzk(text).indexOf(a)>=0)return true;
  const tk=wtok(bc);if(tk.length<3)return false;
  const tl=String(text).normalize('NFC').toLowerCase();let pos=0;
  let seq=true;for(const w of tk){const k=tl.indexOf(w,pos);if(k<0){seq=false;break}pos=k+w.length}
  if(seq)return true;
  /* [v15] AI hay trích dẫn lệch một từ (vd thêm “quyết”): chấp nhận khi ≥2 cặp từ liền nhau của trích dẫn có thật trong đoạn */
  const tj=wtok(text).join(' ');let bg=0;for(let i=0;i+1<tk.length;i++)if(tk[i].length+tk[i+1].length>=6&&tj.indexOf(tk[i]+' '+tk[i+1])>=0)bg++;
  return bg>=2&&bg>=Math.ceil((tk.length-1)/2)}
const KEY_RE=/^[\s|$]*(BẢNG\s+)?(ĐÁP ÁN|HƯỚNG DẪN CHẤM)/i;
function answerKeyText(items){
  const i=items.findIndex((x,k)=>k>0&&KEY_RE.test(x.t));if(i<0)return '';
  const tx=fmtP(items.slice(i));return tx.length>4500?tx.slice(0,4500)+'…':tx}
/* Số liệu cấu trúc đếm bằng mã (đáng tin hơn AI khi đếm): số câu, thứ tự, phương án A–D, điểm */
function structHints(items){
  const qs=[];let cur=null,stop=false;
  const optRe=/(?:^|[\s|])([A-F])[.)](?=\s|$)/g;
  items.forEach((it,k)=>{
    if(stop)return;const t=it.t;
    if(k>0&&KEY_RE.test(t)){stop=true;return}
    if(/^[\s$]*(PHẦN|Phần|ĐỀ|Đề)\s*[IVX\d]/.test(t)){qs.push({sec:true});cur=null;return}
    const m=/^[\s$|]*(Câu|Bài|CÂU|BÀI)\s*(\d+)/.exec(t);
    if(m){cur={n:+m[2],lab:m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()+' '+m[2],opts:[],pts:null};
      const pm=/\(\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|đ)\s*\)/i.exec(t);if(pm)cur.pts=parseFloat(pm[1].replace(',','.'));qs.push(cur)}
    if(cur){let mm;optRe.lastIndex=0;while((mm=optRe.exec(t)))cur.opts.push(mm[1])}});
  const real=qs.filter(q=>!q.sec);if(!real.length)return '';
  const L=['Số câu/bài nhận diện: '+real.length];
  const odd=[];let prev=null;qs.forEach(q=>{if(q.sec){prev=null;return}if(prev!==null&&q.n!==prev+1)odd.push('sau câu '+prev+' là câu '+q.n);prev=q.n});
  L.push('Đánh số: '+(odd.length?'có chỗ không liên tục ('+odd.slice(0,6).join('; ')+') — có thể do đề đánh số lại theo từng phần':'liên tục'));
  const withO=real.filter(q=>q.opts.length>=2),badO=withO.filter(q=>{const s=q.opts.join('');return !'ABCDEF'.startsWith(s)});
  if(withO.length)L.push('Câu có phương án A, B, C...: '+withO.length+(badO.length?'; thứ tự/nhãn đáng ngờ: '+badO.slice(0,8).map(q=>q.lab+' ('+q.opts.join(',')+')').join('; '):'; nhãn đều đúng thứ tự'));
  const wp=real.filter(q=>q.pts!=null);
  if(wp.length)L.push('Câu có ghi điểm dạng "(x điểm)": '+wp.length+'/'+real.length+'; tổng điểm cộng được: '+(Math.round(wp.reduce((a,q)=>a+q.pts,0)*100)/100));
  const hd=items.slice(0,12).filter(x=>/thời gian|thang điểm|tổng\s*điểm|\d\s*điểm/i.test(x.t)).map(x=>x.t.slice(0,120));
  if(hd.length)L.push('Dòng đầu đề có nhắc thời gian/điểm: '+hd.join(' // '));
  const s=L.join('\n');return s.length>1600?s.slice(0,1600)+'…':s}

/* Ghi lỗi AI thành Comment tại đoạn trong file Word */
async function aiWriteComments(z,dx,groups,origBuf){
  const pk=PKG();let base=new Set();
  if(pk){try{base=new Set((await pk(await JSZip.loadAsync(origBuf),true)).er)}catch(e){}}
  const cf=z.file('word/comments.xml');let cd,isNew=false;
  if(cf)cd=pX(await cf.async('string'),'comments.xml');else{cd=pX('<w:comments xmlns:w="'+W+'"/>');isNew=true}
  let id=0;[dx,cd].forEach(d=>all(d,'commentRangeStart').concat(all(d,'comment')).forEach(e=>{id=Math.max(id,(+ga(e,'id')||0)+1)}));
  const date=TRK.date||new Date().toISOString().replace(/\.\d+Z$/,'Z');let n=0;
  groups.forEach(grp=>{
    if(!grp.p||!grp.p.parentNode)return;
    const cid=id++,c=mk(cd,'comment');
    sa(c,'id',cid);sa(c,'author','Rà soát đề');sa(c,'date',date);sa(c,'initials','RS');
    grp.lines.forEach((line0,li)=>{const line=(li===0?'#A'+String(n+1).padStart(2,'0')+' · ':'')+line0;const cp=mk(cd,'p'),cr=mk(cd,'r'),ct=mk(cd,'t');ct.textContent=line;setXS(ct);cr.appendChild(ct);cp.appendChild(cr);c.appendChild(cp)});
    cd.documentElement.appendChild(c);
    const st=mk(dx,'commentRangeStart'),en=mk(dx,'commentRangeEnd'),ref=mk(dx,'r'),cr2=mk(dx,'commentReference');
    sa(st,'id',cid);sa(en,'id',cid);sa(cr2,'id',cid);ref.appendChild(cr2);
    const pPr=one(grp.p,'pPr');grp.p.insertBefore(st,pPr?pPr.nextSibling:grp.p.firstChild);grp.p.appendChild(en);grp.p.appendChild(ref);n++});
  if(!n)return{n:0,data:null};
  z.file('word/document.xml',ser(dx));z.file('word/comments.xml',ser(cd));
  if(isNew){
    const ctF=z.file('[Content_Types].xml'),ctd=ctF?pX(await ctF.async('string'),'[Content_Types].xml'):null;
    if(ctd&&!Array.from(ctd.documentElement.children).some(e=>e.getAttribute('PartName')==='/word/comments.xml')){
      const e=ctd.createElementNS(CTNS,'Override');e.setAttribute('PartName','/word/comments.xml');
      e.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml');ctd.documentElement.appendChild(e);z.file('[Content_Types].xml',ser(ctd))}
    const rF=z.file('word/_rels/document.xml.rels'),rl=rF?pX(await rF.async('string'),'rels'):pX('<Relationships xmlns="'+RELNS+'"/>');
    if(!Array.from(rl.documentElement.children).some(r=>/\/comments$/.test(r.getAttribute('Type')||''))){
      const e=rl.createElementNS(RELNS,'Relationship');e.setAttribute('Id','rIdRsAiCmt1');e.setAttribute('Type',R+'/comments');e.setAttribute('Target','comments.xml');rl.documentElement.appendChild(e)}
    z.file('word/_rels/document.xml.rels',ser(rl))}
  if(pk){const ck=await pk(z,true);const bad=ck.er.filter(x=>!/^docxToBlocks/.test(x)&&!base.has(x));if(bad.length)throw new Error('kiểm tra cấu trúc: '+bad[0])}
  return{n,data:await z.generateAsync({type:'uint8array',compression:'DEFLATE'})}}

async function aiExamReview(buf,o,hooks,rep){
  const key=window.GKEY&&window.GKEY.get&&window.GKEY.get();
  if(!key){rep.notes.push('AI rà soát đề: chưa nhập API key Gemini nên bỏ qua — công cụ đã rà soát bình thường không dùng AI (nhập key ở đầu trang để bật AI).');return null}
  let items,z,dx;
  try{z=await JSZip.loadAsync(buf);dx=pX(await z.file('word/document.xml').async('string'),'document.xml');items=docxToParas(dx)}
  catch(e){rep.warn('AI rà soát đề: không đọc được nội dung file ('+e.message+').');return null}
  if(items.reduce((a,x)=>a+x.t.replace(/\s/g,'').length,0)<30){rep.warn('AI rà soát đề: file gần như không có chữ để rà soát.');return null}
  const nOle=items.reduce((a,x)=>a+(x.t.split('⟦CT-ẢNH⟧').length-1),0);
  if(nOle)rep.warn('Đề có '+nOle+' công thức MathType/đối tượng dạng ảnh mà AI KHÔNG đọc được — các câu đó AI chỉ soát phần chữ và sẽ không kết luận đúng/sai về công thức. Muốn AI soát cả công thức: trong Word dùng MathType → Convert Equations sang Equation của Word (hoặc gõ LaTeX rồi dùng công cụ chuyển LaTeX), rồi rà soát lại.');
  const byId=new Map(items.map(x=>[x.id,x]));
  const info=[o.aiGrade&&o.aiGrade!=='auto'?'Môn/lớp: '+o.aiGrade:'',o.aiKind&&o.aiKind!=='auto'?'Dạng đề: '+o.aiKind:'',(o.aiInfo||'').trim()].filter(Boolean).join('. ');
  const keyTx=answerKeyText(items),vModel=o.aiModelV||o.aiModel;
  const hint=structHints(items)+(items.length?'\nMục ĐÁP ÁN/HƯỚNG DẪN CHẤM trong file: '+(keyTx?'có (đối chiếu theo số câu)':'không thấy — chỉ kiểm tính giải được và số đáp án đúng, không kết luận "đáp án sai"'):'');
  const chunks=chunkParas(items);
  if(chunks.length>1)rep.warn('Đề dài nên AI rà soát theo '+chunks.length+' phần; các kiểm tra toàn cục (tổng điểm, tổng số câu) có thể chưa đầy đủ.');
  const cand=[],xm=[],ktra=[],kall=[],tomtat=[],xacnhan=[];let stop=null,lostParts=0;
  /* ---- Lượt 1: rà soát ---- */
  for(let k=0;k<chunks.length&&!stop;k++){
    const ch=chunks[k],label='AI rà soát'+(chunks.length>1?' phần '+(k+1)+'/'+chunks.length:'');
    hooks.progress(label+' (tự giải từng câu, có thể mất 1–3 phút)...');
    const msg='THÔNG TIN BỔ SUNG: '+(info||'(không có — hãy suy luận từ đề và ghi rõ là suy luận)')+'\n'
      +'GỢI Ý CẤU TRÚC (công cụ đếm bằng mã; có thể sai nếu đề dùng chữ cái/số theo cách khác):\n'+hint+'\n'
      +(chunks.length>1?'PHẦN '+(k+1)+'/'+chunks.length+' của đề.\n':'')
      +(ch.head?'[NGỮ CẢNH ĐẦU ĐỀ — chỉ để tham khảo, không rà soát lại]\n'+fmtP(ch.head)+'\n[HẾT NGỮ CẢNH]\n':'')+'ĐỀ THI:\n'+fmtP(ch);
    let r=await geminiJSON(key,o.aiModel,AI_EXAM_SYS,msg,hooks,label,rep,EXAM_SCHEMA);
    if(r.retry)r=await geminiJSON(key,o.aiModel,AI_EXAM_SYS,msg,hooks,label,rep,EXAM_SCHEMA);
    if(r.err){if(r.retry){lostParts++;continue}stop=r.err;break}
    const d=r.json||{};
    if(r.fin==='MAX_TOKENS')rep.warn('Phần '+(k+1)+': báo cáo AI bị cắt do quá dài — có thể sót lỗi ở cuối phần này.');
    if(d.tomtat)tomtat.push(String(d.tomtat));if(d.xacnhan)xacnhan.push(String(d.xacnhan));
    (Array.isArray(d.kiemtra)?d.kiemtra:[]).forEach(x=>{if(!x||!x.cau)return;if(!kall.some(y=>String(y.cau)===String(x.cau)))kall.push(x);if(x.khop===false)ktra.push(x)});
    (Array.isArray(d.loi)?d.loi:[]).forEach(x=>{if(x&&x.noidung)cand.push(Object.assign({},x,{ck:k}))});
    (Array.isArray(d.canxacminh)?d.canxacminh:[]).forEach(x=>{if(x&&x.lydo)xm.push(x)})}
  if(stop)rep.warn('AI rà soát đề dừng: '+stop+'. Phần chưa rà soát có thể sót lỗi — chạy lại để rà soát tiếp.');
  if(lostParts)rep.warn('AI trả về dữ liệu không đọc được ở '+lostParts+' phần của đề (đã thử lại) — các phần đó chưa được AI rà soát.');
  if(!cand.length&&!xm.length&&!ktra.length&&!tomtat.length)return null;
  /* ---- Kiểm bằng chứng bằng code: trích dẫn phải có thật trong đề (khớp mềm) ---- */
  let noEv=0;const located=[];
  cand.forEach(x=>{
    const bc=String(x.bangchung||''),idm=/(\d+)/.exec(String(x.id||'')),it0=idm?byId.get('P'+idm[1]):null,nb=nzk(bc);
    let it=null;
    if(nb.length>=2&&it0&&nzk(it0.t).indexOf(nb)>=0)it=it0;
    else if(nb.length>=2&&nb.length<4&&wtok(bc).length<3){let hs=items.filter(y=>y.cts&&y.cts.some(ct=>nzk(ct)===nb));const dh=/Đề\s*(?:số\s*)?(\d+)/i.exec(String(x.vitri||''));if(hs.length>1&&dh)hs=hs.filter(y=>y.de===+dh[1]);if(hs.length===1)it=hs[0]}
    if(!it&&(nb.length>=4||wtok(bc).length>=3)){
      if(it0&&evHit(bc,it0.t))it=it0;
      else{
        let hits=nb.length>=4?items.filter(y=>nzk(y.t).indexOf(nb)>=0):[];
        if(!hits.length)hits=items.filter(y=>evHit(bc,y.t));
        if(hits.length===1)it=hits[0];else if(hits.length>1&&it0)it=hits.find(y=>y.cau&&y.cau===it0.cau)||hits[0]}}
    x.it=it||null;x.ev=!!it;if(!it)noEv++;x.itFall=it0;
    if(it&&it.cps&&nb.length>=2){const k=it.cts.findIndex(ct=>nzk(ct).indexOf(nb)>=0);if(k>=0&&it.cps[k])x.cell=it.cps[k]}
    located.push(x)});
  /* ---- Lượt 2: thẩm định kép (AI khác tự giải lại từng lỗi, có thể dùng model mạnh hơn) ---- */
  const stat={giu:0,xm:0,loai:0,chua:0};
  const verify=o.aiVerify!==false&&!stop;
  const verd=new Map();
  if(verify&&located.length){
    const list=located.slice(0,60);
    if(located.length>60)rep.warn('AI nêu '+located.length+' lỗi; chỉ thẩm định kép 60 lỗi đầu, phần còn lại ghi “chưa thẩm định”.');
    const B=8;
    for(let b=0;b<list.length;b+=B){
      const part=list.slice(b,b+B);hooks.progress('AI thẩm định kép lỗi '+(b+1)+'–'+(b+part.length)+'/'+list.length+'...');
      const pay=part.map((x,i)=>{const it=x.it||x.itFall,blk=it?items.filter(y=>y.blk===it.blk):[];let tx=fmtP(blk);if(tx.length>3500)tx=tx.slice(0,3500)+'…';
        return{k:b+i+1,nhom:x.nhom||'',noidung:x.noidung,bangchung:x.bangchung||'',sua_de_xuat:x.sua||'',doan_de:tx||'(không xác định được đoạn đề)'}});
      const vmsg='THÔNG TIN BỔ SUNG: '+(info||'(không có)')+(keyTx?'\nĐÁP ÁN/HƯỚNG DẪN CHẤM CÓ TRONG ĐỀ:\n'+keyTx:'\n(đề không kèm đáp án trong file)')+'\nỨNG VIÊN LỖI:\n'+JSON.stringify(pay);
      let r=await geminiJSON(key,vModel,AI_VERIFY_SYS,vmsg,hooks,'AI thẩm định',rep,VERIFY_SCHEMA);
      if(r.retry)r=await geminiJSON(key,vModel,AI_VERIFY_SYS,vmsg,hooks,'AI thẩm định',rep,VERIFY_SCHEMA);
      if(r.err){rep.warn('AI thẩm định kép dừng: '+r.err+'. Các lỗi còn lại ghi “chưa thẩm định”.');break}
      (Array.isArray(r.json)?r.json:[]).forEach(v=>{if(v&&+v.k)verd.set(+v.k,v)})}}
  /* ---- Tổng hợp ---- */
  const loi=[],canx=[],seen=new Set();
  const elOf=x=>{if(x.cell)return x.cell;const it=x.it||x.itFall;return it&&it.el||null};
  const where=(x)=>{const it=x.it||x.itFall,cv=it&&it.cau,b=(x.vitri&&/câu|bài|phần|ý/i.test(x.vitri)?x.vitri:(cv||'Toàn đề'));return it&&it.de&&!/đề\s*\d|đề số/i.test(b)?'Đề '+it.de+(it.sec==='key'?' (đáp án)':'')+' · '+b:b};
  located.forEach((x,i)=>{
    const key2=nzs(where(x)+'|'+x.noidung).slice(0,80);if(seen.has(key2))return;seen.add(key2);
    const v=verd.get(i+1),q=x.bangchung?' (trích: “'+String(x.bangchung).slice(0,80)+'”)':'';
    let tin=String(x.tincay||'').toLowerCase().replace(/\s/g,'');
    if(v&&v.ketluan==='sai'){stat.loai++;return}
    if(v&&v.ketluan==='khongchac'){stat.xm++;canx.push({vitri:where(x),el:elOf(x),lydo:'AI chưa chắc sau thẩm định: '+x.noidung+q+(v.lydo?' — '+v.lydo:'')});return}
    if(!x.ev){stat.xm++;canx.push({vitri:where(x),el:elOf(x),lydo:'AI nêu lỗi nhưng không đối chiếu được trích dẫn với đề: '+x.noidung+q});return}
    if(tin==='thap'){stat.xm++;canx.push({vitri:where(x),el:elOf(x),lydo:'AI nghi ngờ (độ tin cậy thấp): '+x.noidung+q});return}
    if(!v&&verify&&/Đáp án|Kiến thức|Logic/i.test(x.nhom||'')&&/Nghiêm/i.test(x.mucdo||'')){stat.xm++;canx.push({vitri:where(x),el:elOf(x),lydo:'Lỗi nghiêm trọng do AI nêu nhưng CHƯA qua thẩm định kép: '+x.noidung+q});return}
    const dk=!!v;if(dk)stat.giu++;else stat.chua++;
    loi.push({vitri:where(x),el:elOf(x),nhom:x.nhom||'',mucdo:x.mucdo||'',tincay:tin==='cao'?'cao':'trung bình',noidung:x.noidung+q,sua:(v&&v.sua)||x.sua||'',tt:dk?'đã thẩm định kép':(verify?'chưa thẩm định':'')})});
  xm.forEach(x=>{const idm=/(\d+)/.exec(String(x.id||'')),it=idm?byId.get('P'+idm[1]):null;
    canx.push({vitri:x.vitri||(it&&it.cau)||'—',el:it&&it.el||null,lydo:String(x.lydo)})});
  /* đối chiếu chéo: AI tự tính khác đáp án trong đề mà không nêu thành lỗi */
  ktra.forEach(x=>{const cv='Câu '+String(x.cau||'').replace(/\D/g,'');if(cv==='Câu ')return;
    if(loi.some(y=>nzs(y.vitri).indexOf(nzs(cv))===0)||canx.some(y=>nzs(y.vitri).indexOf(nzs(cv))===0))return;
    const it=items.find(y=>y.cau===cv);
    canx.push({vitri:cv,el:it&&it.el||null,lydo:'AI tự tính ra “'+String(x.ketqua_ai||'?')+'” nhưng đáp án trong đề là “'+String(x.trong_de||'?')+'” — hãy tự giải lại để xác nhận.'})});
  const tk='AI nêu '+located.length+' lỗi → thẩm định kép: giữ '+stat.giu+(stat.chua?', chưa thẩm định '+stat.chua:'')+', chuyển sang “cần xác minh” '+stat.xm+', loại '+stat.loai+' (thẩm định thấy đề đúng).'+(noEv?' '+noEv+' mục không đối chiếu được trích dẫn nên không xếp vào lỗi chắc chắn.':'');
  /* ---- Ghi Comment tại câu trong file Word ---- */
  let ncm=0,newData=null;
  if(o.aiComment!==false&&(loi.length||canx.length)){
    const groups=new Map(),add=(el,line)=>{if(!el)return;if(!groups.has(el))groups.set(el,[]);groups.get(el).push(line)};
    loi.forEach(x=>add(x.el,'[LỖI · '+[x.nhom,x.mucdo,x.tincay&&'tin cậy '+x.tincay].filter(Boolean).join(' · ')+'] '+x.noidung+(x.sua?' → Gợi ý sửa: '+x.sua:'')));
    canx.forEach(x=>add(x.el,'[CẦN XÁC MINH] '+x.lydo));
    try{const w=await aiWriteComments(z,dx,Array.from(groups).slice(0,200).map(([p,lines])=>({p,lines})),buf);ncm=w.n;newData=w.data;if(ncm)Array.from(groups.keys()).slice(0,200).forEach((el,k)=>{loi.concat(canx).forEach(x=>{if(x.el===el)x.code='#A'+String(k+1).padStart(2,'0')})})}
    catch(e){rep.warn('Không ghi được Comment của AI vào file Word: '+e.message+' (lỗi vẫn có đầy đủ trong báo cáo .txt).')}}
  const strip=a=>a.map(x=>{const y=Object.assign({},x);delete y.el;return y});
  return{d:{tomtat:tomtat.join(' | '),xacnhan:xacnhan.join(' | '),loi:strip(loi),canxacminh:strip(canx),doichieu:kall,thongke:tk},data:newData,ncmt:ncm}}

/* ====================== HÀM CHÍNH ====================== */
const PKG=()=>typeof window!=='undefined'&&typeof window.WordPkgCheck==='function'?window.WordPkgCheck:null;
/* ===== Giữ biểu mẫu/sổ trong 1 trang: ước lượng chiều cao nội dung rồi chọn mức thu gọn nhẹ nhất vẫn vừa 1 trang ===== */
function chR(ch){if(ch===' ')return .25;if(/\d/.test(ch))return .5;if(/\p{Lu}/u.test(ch))return /[MWĐ]/.test(ch)?.9:.7;if(/[iíìỉĩịltfjr.,;:!\/()\-'"]/.test(ch))return .3;if(/[mw]/.test(ch))return .76;return .46}
function estP(p,cfg,aw,cell,defSz){
  const pp=one(p,'pPr'),sp=pp&&one(pp,'spacing'),ind=pp&&one(pp,'ind');
  let so=0,bold=false;
  all(p,'r').forEach(r=>{if(anc(r,'p')!==p||!all(r,'t').some(t=>t.textContent.length))return;const rp=one(r,'rPr'),se=rp&&one(rp,'sz');so=Math.max(so,se?+ga(se,'val'):defSz);if(rp&&one(rp,'b'))bold=true});
  if(!so){const mr=pp&&one(pp,'rPr'),me=mr&&one(mr,'sz');so=me?+ga(me,'val'):defSz}
  const head=!cell&&pInfo(p).head;
  const sz=cfg.orig?so:(cell&&cfg.cellSz?cfg.cellSz:(cfg.force?Math.max(so,cfg.size):so));
  const txt=ptext(p);let e=0;for(const ch of txt)e+=chR(ch);
  let w=e*sz*10*(bold?1.07:1)+all(p,'tab').length*sz*10*2;
  const l=ind?(+ga(ind,'left')||+ga(ind,'start')||0):0,r=ind?(+ga(ind,'right')||0):0,fl=ind?(+ga(ind,'firstLine')||0):0;
  const avail=Math.max(300,aw-l-r);
  let lines=txt.length?Math.max(1,Math.ceil((w+fl)/avail*1.03)):1;
  lines+=all(p,'br').filter(b=>!ga(b,'type')||ga(b,'type')==='textWrapping').length;
  let lf=1,exact=0;if(sp&&ga(sp,'line')){if(ga(sp,'lineRule')==='exact')exact=+ga(sp,'line');else lf=(+ga(sp,'line'))/240||1}
  if(!cfg.orig&&!head&&cfg.line)lf=cfg.line;
  const lh=exact&&cfg.orig?exact:sz*10*1.15*lf;
  let before=sp?(+ga(sp,'before')||0):0,after=sp?(+ga(sp,'after')||0):0;
  if(!cfg.orig&&!head&&cfg.after!=null){before=0;after=cell?0:cfg.after*20}
  let img=0;all(p,'drawing').forEach(d=>{const ex=d.getElementsByTagNameNS(WP,'extent')[0];img+=ex?(+ex.getAttribute('cy')||0)/635:0});
  return lines*lh+before+after+img}
function estBox(box,cfg,aw,cell,defSz){
  let H=0;
  Array.from(box.children).forEach(c=>{
    if(c.namespaceURI!==W)return;
    if(c.localName==='p')H+=estP(c,cfg,aw,cell,defSz);
    else if(c.localName==='sdt'){const sc=one(c,'sdtContent');if(sc)H+=estBox(sc,cfg,aw,cell,defSz)}
    else if(c.localName==='tbl')H+=estTbl(c,cfg,aw,defSz)});
  return H}
function estTbl(tbl,cfg,aw,defSz){
  const grid=one(tbl,'tblGrid'),ws=grid?wk(grid,'gridCol').map(c=>parseInt(ga(c,'w'),10)||0):[],rows=wk(tbl,'tr');
  if(!ws.length)return rows.length*400;
  let nw=ws,tot=ws.reduce((a,b)=>a+b,0),pad=216,cellSz=0;
  if(!cfg.orig&&cfg.tblfit&&ws.length>=4&&rows.length>=2&&!isLayoutTbl(ws)){const fr=fitCols(tbl,ws,Math.floor(aw),cfg.size);nw=fr.nw;cellSz=fr.sz;pad=140}
  else if(tot>aw){nw=ws.map(x=>x*aw/tot)}
  const c2=Object.assign({},cfg,{cellSz});let H=0;
  rows.forEach(tr=>{
    let col=0,rh=0;const tp=one(tr,'trPr'),th=tp&&one(tp,'trHeight'),minH=th?(+ga(th,'val')||0):0;
    wk(tr,'tc').forEach(tc=>{
      const cp=one(tc,'tcPr'),gs=cp&&one(cp,'gridSpan'),n=gs?(parseInt(ga(gs,'val'),10)||1):1,vm=cp&&one(cp,'vMerge');
      let w=0;for(let k=col;k<col+n;k++)w+=nw[k]||0;col+=n;
      if(vm&&(ga(vm,'val')!=='restart'))return;
      if(vm)return; /* ô gộp dọc: chiều cao do các hàng gộp quyết định */
      rh=Math.max(rh,estBox(tc,c2,Math.max(300,w-pad),true,defSz))});
    H+=Math.max(rh,minH)+15});
  return H}
function planOnePage(body,o,defSz,pages){
  const sp=one(body,'sectPr');if(!sp||wk(body,'p').some(p=>{const pp=one(p,'pPr');return pp&&one(pp,'sectPr')}))return null;
  const z=one(sp,'pgSz'),land=z&&(ga(z,'orient')==='landscape'||(+ga(z,'w')>+ga(z,'h')&&+ga(z,'h')>0));
  const mm=v=>Math.round(v*56.6929),PH=land?11906:16838,PW=land?16838:11906;
  const mt=land?Math.min(o.mt,8):o.mt,mb=land?Math.min(o.mb,8):o.mb,ml=land?Math.min(o.ml,10):o.ml,mr=land?Math.min(o.mr,10):o.mr;
  const S0=(+o.size)*2;if(!isFinite(S0)||S0<=0)return null;
  const tiers=[{size:S0,line:o.line,after:o.after,t:0},{size:S0,line:1,after:3,t:1},{size:S0,line:1,after:0,t:2},{size:S0-2,line:1,after:0,t:3},{size:S0-4,line:1,after:0,t:4}].filter(t=>t.size>=24||t.t<=2);
  let pick=null,last=null;
  for(const t of tiers){
    const mt2=(t.t>=2&&!land)?Math.min(mt,10):mt,mb2=(t.t>=2&&!land)?Math.min(mb,10):mb;
    const aw=PW-mm(ml)-mm(mr),ah=PH-mm(mt2)-mm(mb2);
    const cfg={orig:false,size:t.size,force:o.forcesz!==false,line:t.line,after:t.after,tblfit:!!o.tblfit},H=estBox(body,cfg,aw,false,defSz);
    t.H=H;t.ah=ah;t.mt=mt2;t.mb=mb2;last=t;
    if(H<=ah*0.93){pick=t;break}}
  return{pick:pick||last,fit:!!pick,last}}

/* [v12] Chân trang/đầu trang dùng hàng chục dấu cách để đẩy chữ sang phải → đổi thành 1 Tab + tab phải sát lề (không bị gộp mất khi dọn khoảng trắng) */
function spaceRunsToTab(d,sd,aw,rep){
  let n=0;
  const stTabs=id=>{const out=[];if(!sd||!id)return out;const sty=wk(sd.documentElement,'style').find(s=>ga(s,'styleId')===id),pp=sty&&one(sty,'pPr'),tb=pp&&one(pp,'tabs');if(tb)wk(tb,'tab').forEach(t=>out.push(+ga(t,'pos')));return out};
  const txt=r=>all(r,'t').map(t=>t.textContent).join('');
  all(d.documentElement,'p').forEach(p=>{
    const runs=wk(p,'r');let i=0,hit=false;
    while(i<runs.length){
      const sp=r=>!one(r,'tab')&&!one(r,'fldChar')&&!one(r,'instrText')&&!all(r,'drawing').length&&/^\s*$/.test(txt(r))&&all(r,'t').length>0;
      if(!sp(runs[i])){i++;continue}
      let j=i,tot=0;while(j<runs.length&&sp(runs[j])){tot+=txt(runs[j]).length;j++}
      const hasB=runs.slice(0,i).some(r=>txt(r).trim()||one(r,'fldChar')),hasA=runs.slice(j).some(r=>txt(r).trim()||one(r,'fldChar'));
      if(tot>=8&&hasB&&hasA){
        const r0=runs[i];all(r0,'t').forEach(t=>rm(t));r0.appendChild(mk(d,'tab'));
        for(let k=i+1;k<j;k++)rm(runs[k]);
        hit=true;n++}
      i=j}
    if(hit){
      let pp=one(p,'pPr');if(!pp){pp=mk(d,'pPr');p.insertBefore(pp,p.firstChild)}
      const ps=one(pp,'pStyle'),id=ps?ga(ps,'val'):'',tabs=sc(d,pp,'tabs',ORD.pPr);Array.from(tabs.children).forEach(rm);
      stTabs(id).forEach(pos=>{if(Math.abs(pos-aw)>5){const e=mk(d,'tab');sa(e,'val','clear');sa(e,'pos',pos);tabs.appendChild(e)}});
      const e=mk(d,'tab');sa(e,'val','right');sa(e,'pos',Math.floor(aw));tabs.appendChild(e)}});
  if(rep)rep.fix('Đầu/chân trang: đổi dãy dấu cách căn phải thủ công thành Tab căn phải sát lề',n)}
/* [v12] Đoạn có thụt treo (hanging) mà không có lề trái → dòng đầu bị đẩy RA NGOÀI lề trái; đưa vào trong lề */
function hangFix(doc,body,rep){let n=0;
  all(body,'p').forEach(p=>{const pp=one(p,'pPr'),ie=pp&&one(pp,'ind');if(!ie||one(pp,'numPr')||pInfo(p).list)return;
    const hg=+ga(ie,'hanging')||0,L=+ga(ie,'left')||+ga(ie,'start')||0;
    if(hg>0&&L<hg&&!ga(ie,'hangingChars')){sa(ie,'left',hg);ie.removeAttributeNS(W,'start');n++}});
  rep.fix('Đoạn thụt treo lệch ra ngoài lề trái → đưa dòng đầu về đúng lề',n)}
/* [v12] Nhận diện Kế hoạch bài dạy / giáo án (khác đề thi) */
function isLessonPlan(body){let T='';all(body,'p').slice(0,500).forEach(p=>{T+=ptext(p)+'\n'});
  if(/(KẾ HOẠCH BÀI DẠY|KHBD|GIÁO ÁN)/i.test(T))return true;
  return /Mục tiêu/i.test(T)&&/Tiến trình/i.test(T)&&/HOẠT ĐỘNG CỦA (GV|GIÁO VIÊN)/i.test(T)}

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
  if(o.mtconv!==false&&!o.dry&&window.MathTypeOle)await astep('MathType → Equation',()=>mtPass(zip,doc,relsd,ctx,rep));
  hooks.progress('Đang đọc kích thước hình...');
  for(const id in ctx.rels){const r=ctx.rels[id];if(!/\/image$/.test(r.ty)||r.m==='External')continue;
    const f=zip.file(rs('word/',r.t));if(!f){ctx.missing.push(id);continue}const d=imgDim(await f.async('uint8array'));if(d)ctx.dims[id]=d}
  ctx.hasMath=!!(doc.getElementsByTagNameNS(M,'oMath').length||all(doc,'object').length||all(doc,'pict').length);
  ctx.hasToc=all(doc,'instrText').some(t=>/^\s*TOC\b/.test(t.textContent))||all(doc,'fldSimple').some(f=>/^\s*TOC\b/.test(ga(f,'instr')));
  let defSz=20;if(sd){const dr=one(one(sd.documentElement,'docDefaults'),'rPrDefault'),dz=dr&&one(one(dr,'rPr'),'sz');if(dz)defSz=+ga(dz,'val')||defSz;
    const nm=wk(sd.documentElement,'style').find(s=>ga(s,'type')==='paragraph'&&ga(s,'default')==='1'),nz=nm&&one(one(nm,'rPr'),'sz');if(nz)defSz=+ga(nz,'val')||defSz}
  {/* Sổ/biểu mẫu vốn chỉ 1 trang: giữ nguyên 1 trang sau khi chuẩn hóa */
    let onePg=false;
    if(o.onepage&&!o.dry&&o.size!=='auto'){
      const ap=zip.file('docProps/app.xml');let pg=0;
      if(ap){const m=/<Pages>\s*(\d+)\s*<\/Pages>/.exec(await ap.async('string'));if(m)pg=+m[1]}
      onePg=pg?pg===1:!/lastRenderedPageBreak|w:br\b[^>]*w:type="page"|pageBreakBefore/.test(docXml);
      /* [v12] app.xml hay ghi sai “Pages=1” (chưa lưu lại): kiểm chứng bằng dấu ngắt trang Word đã lưu, độ dài chữ và bảng dài */
      if(onePg){const tl=all(body,'t').reduce((a,t)=>a+t.textContent.length,0);if(/lastRenderedPageBreak/.test(docXml)||tl>3600||all(body,'tbl').some(t=>all(t,'tr').length>=8))onePg=false}
      if(onePg){const pl=planOnePage(body,o,defSz);
        if(pl&&pl.pick&&pl.fit){const t=pl.pick;
          o=Object.assign({},o,{size:String(t.size/2),line:t.line,after:t.after});
          if(t.t>0)rep.notes.push('Giữ trong 1 trang: để vừa 1 trang, đã thu gọn '+(t.t>=3?'cỡ chữ còn '+t.size/2+' pt, ':'')+'giãn dòng '+t.line+', khoảng cách sau đoạn '+t.after+' pt.');
          if(!pl.fit)rep.warn('Ước tính nội dung vẫn có thể hơi tràn 1 trang dù đã thu gọn tối đa (chữ '+t.size/2+' pt) — hãy mở file kiểm tra, nếu tràn thì bớt dòng ghi chú hoặc giảm cỡ chữ.')}}}}
  hooks.progress('Đang rà soát...');await tick();
  if(o.flow!==false&&!o.dry&&typeof window!=='undefined'&&typeof window.WordFlowFix==='function')step('gỡ bố cục giả của file chuyển từ PDF',()=>{
    /* [v18] WordFlowFix chỉ biết một bề rộng chung → trước đây tính theo khổ DỌC, làm bảng trong section khổ NGANG bị bóp còn ~10 000 twips.
       Nay: truyền bề rộng của section RỘNG NHẤT, rồi khôi phục bảng nào vẫn bị bóp nhỏ hơn vùng chữ thật của section chứa nó. */
    const ps=preSecAw(doc,body,o),snap=snapTables(body,ps),awMax=o.page?Math.max.apply(null,ps.map(x=>x.aw)):0;
    const fr=window.WordFlowFix(doc,{flatCols:true,dots:true,pt:(o.size&&o.size!=='auto'&&+o.size)||14,aw:awMax});
    const rt=restoreTables(doc,snap);
    Object.keys(fr.fix).forEach(k=>rep.fix(k,parseInt(fr.fix[k],10)||1));fr.warn.forEach(w=>rep.warn(w));rep.fix('Giữ nguyên bề ngang bảng trong trang khổ ngang (không bị thu về khổ dọc)',rt)});
  step('dọn nhiễu XML',()=>stripNoise(doc));
  step('Track Changes/Comment',()=>reviewMarks(doc,o,rep));
  step('gộp đoạn chữ rời rạc',()=>mergeRuns(doc));
  if(o.text)step('dọn văn bản',()=>textPass(body,o,rep));
  if(o.content!==false&&!o.dry)step('sửa lỗi nội dung giáo án/bài tập',()=>contentPass(doc,body,o,rep));
  if(o.unify!==false)step('thống nhất nhãn',()=>unifyLabels(body,o,rep));
  if(o.unum!==false&&!o.dry)step('thống nhất dấu trừ & số thập phân',()=>unifyNums(body,o,rep));
  ctx.lp=false;try{ctx.lp=o.lpfix!==false&&isLessonPlan(body)}catch(e){}
  if(o.lpfix!==false&&!o.dry){
    if(o.fixmath!==false)step('sửa đáp số cặp số',()=>pairFix(doc,body,rep));
    if(ctx.lp)step('giáo án: tiêu đề và đoạn bị ngắt',()=>lpFix(doc,body,o,rep))}
  if(o.cap)step('viết hoa đầu đoạn',()=>capPass(body,o,rep));
  if(o.ai)await astep('AI soát chính tả',()=>aiPass(body,o,rep,hooks));
  if(o.num)step('đánh số Câu/Bài',()=>renumber(body,rep));
  if(o.softbreak)step('ngắt trang cứng',()=>softBreaks(doc,body,o,rep));
  if(o.blank)step('dòng trống/ngắt trang',()=>blanks(doc,body,rep));
  if(o.keep)step('giữ đoạn không bị tách trang',()=>keepPass(doc,body,o,rep));
  if(o.page&&o.lpfix!==false&&!(o.mt===20&&o.mb===20&&o.ml===30&&o.mr===15)){let lp=false;try{lp=isLessonPlan(body)}catch(e){}
    if(lp){const sp0=one(body,'sectPr'),pm=sp0&&one(sp0,'pgMar'),mm=a=>pm&&ga(pm,a)?Math.round(parseInt(ga(pm,a),10)/56.6929):0;
      let m=[mm('top'),mm('bottom'),mm('left'),mm('right')];
      const okM=m[0]>=10&&m[1]>=10&&m[2]>=20&&m[3]>=10&&m.every(x=>x<=45);
      if(!okM)m=[20,20,30,15];
      o=Object.assign({},o,{mt:m[0],mb:m[1],ml:m[2],mr:m[3]});
      rep.notes.push('Nhận diện Kế hoạch bài dạy/giáo án → '+(okM?'giữ lề của file gốc':'dùng lề chuẩn văn bản')+' '+m.join('/')+' mm (trên/dưới/trái/phải) thay cho lề đề thi gọn, vì giáo án cần lề trái rộng để đóng quyển. Muốn dùng đúng lề đã nhập: bỏ tick mục “Giáo án” rồi chạy lại.')}}
  let secs=null;step('khổ giấy & lề',()=>{secs=sections(doc,body,o,rep)});
  if(!secs){secs=[{end:body.children.length,sp:one(body,'sectPr')||mk(doc,'sectPr'),aw:9071,ah:14570}];secs.bk=Array.from(body.children)}
  ctx.szEst=o.size==='auto'?dominantSize(body,defSz):(+o.size)*2;
  if(o.tbl&&o.tblfit!==false)step('bảng 2 cột giáo án',()=>twoColPass(doc,body,secs,o,rep,ctx));
  if(o.mcq)step('căn đáp án trắc nghiệm',()=>mcqPass(doc,body,secs,o,rep,ctx));
  if(o.mcq||o.blank)step('đều khoảng cách giữa các câu',()=>questionGaps(doc,body,rep));
  if(o.tbl)step('bảng',()=>tablePass(doc,body,secs,o,rep,ctx));
  if(o.tbljust!==false)step('căn trái ô bảng hẹp',()=>tableJustify(doc,body,rep));
  if(o.listfix!==false)step('căn nhãn danh sách',()=>listAlign(doc,body,rep,numd));
  step('bảng nền tối → sáng',()=>lightTables(doc,body,rep));
  if(o.img||o.imgInline||o.imgFix)step('hình ảnh',()=>imgPass(doc,secs,o,rep,ctx));
  step('danh sách',()=>numberingCheck(doc,numd,rep));
  step('thụt treo lệch lề',()=>hangFix(doc,body,rep));
  if(numd&&o.flow!==false&&!o.dry&&typeof window!=='undefined'&&window.WordFlowFix&&window.WordFlowFix.clampNumbering)step('thụt lề cấp danh sách',()=>{const k=window.WordFlowFix.clampNumbering(numd);if(k){ctx.numTouched=true;rep.fix('Danh sách (bullet/số): thu lại thụt lề cấp quá lớn',k)}});
  ctx.sz=o.size==='auto'?dominantSize(body,defSz):(+o.size)*2;
  if(o.size==='auto'&&!dry)rep.notes.push('Cỡ chữ chính nhận diện của tài liệu: '+ctx.sz/2+' pt');
  const cnt={font:0,sz:0,odd:0,shd:0,col:0,m:0};
  step('font/cỡ chữ',()=>{all(doc,'rPr').forEach(r=>{const pa=r.parentNode;if(pa&&pa.namespaceURI===M&&pa.localName==='r')return;mathAndRunFmt(doc,r,o,ctx,rep,cnt,false)});
    all(doc,'r',M).forEach(r=>{if(!o.mathsz)return;let wr=one(r,'rPr');if(!wr){wr=mk(doc,'rPr');const mp=Array.from(r.children).find(c=>c.namespaceURI===M&&c.localName==='rPr');r.insertBefore(wr,mp?mp.nextSibling:r.firstChild)}mathAndRunFmt(doc,wr,o,ctx,rep,cnt,false)});
    step('định dạng đoạn',()=>paraFmt(doc,body,o,ctx,rep))});
  if(ctx.lp)step('khoảng cách sau bảng',()=>afterTableGap(doc,body,rep));
  rep.fix('Đồng nhất font chữ (run)',cnt.font);rep.fix('Đồng nhất cỡ chữ lệch (run)',cnt.sz);
  rep.fix('Gỡ co giãn/giãn cách ký tự/nâng hạ chữ bất thường (dán từ PDF/web)',cnt.odd);rep.fix('Gỡ nền (shading) lạ trong chữ',cnt.shd);
  rep.fix('Đặt ngôn ngữ kiểm tra chính tả = Tiếng Việt cho chữ đang gắn nhầm Hà Lan/Pháp/Bồ Đào Nha… (hết gạch đỏ chính tả) (run)',cnt.lang||0);
  rep.fix('Gỡ màu chữ/tô sáng',cnt.col);rep.fix('Công thức: đồng bộ font Cambria Math và cỡ chữ với văn bản',cnt.m);
  if(ctx.hidden)rep.warn(ctx.hidden+' đoạn chữ đang ẩn (Hidden text) — kiểm tra nếu thấy thiếu/thừa nội dung.');
  if(ctx.legacy.size)rep.warn('Phát hiện font bảng mã cũ: '+Array.from(ctx.legacy).slice(0,4).join(', ')+' — chữ Việt có thể hiện sai dấu. Hãy đổi sang Unicode bằng UniKey (Ctrl+Shift+F6) rồi rà soát lại.');
  const hf=Object.keys(zip.files).filter(n=>/^word\/(header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(n)),hfDocs={};let hasPage=false;
  for(const n of hf){const d=await rd(n);hfDocs[n]=d;
    if(all(d,'instrText').some(t=>/\bPAGE\b/.test(t.textContent))||all(d,'fldSimple').some(f=>/\bPAGE\b/.test(ga(f,'instr'))))hasPage=true;
    step('header/footer',()=>{const c={font:0,sz:0,odd:0,shd:0,col:0,m:0};all(d,'rPr').forEach(r=>mathAndRunFmt(d,r,o,ctx,rep,c,true))});
    step('bảng header/footer',()=>lightTables(d,d.documentElement,rep));
    if(o.text&&/^word\/(header|footer)/.test(n))step('căn phải đầu/chân trang',()=>spaceRunsToTab(d,sd,(secs&&secs[0]&&secs[0].aw)||9071,rep));
    if(o.text)step('dọn văn bản header/footer/chú thích',()=>textPass(d.documentElement,Object.assign({},o,{indent:false}),rep,'đầu/chân trang, chú thích'));
    if(o.lpfix!==false&&!o.dry&&/^word\/header/.test(n))step('đầu trang: bỏ gạch nối thừa',()=>hdrDash(d,rep))}
  rep.hfText=Object.keys(hfDocs).filter(n=>/header/.test(n)).map(n=>all(hfDocs[n],'p').map(p=>ptext(p)).join('\n')).join('\n');
  if(!hasPage)rep.warn('Chưa thấy số trang (trường PAGE) trong header/footer — thêm bằng Insert → Page Number nếu cần.');
  if(ctx.hasToc){const heads=all(body,'p').filter(p=>pInfo(p).head).length;
    if(!heads)rep.warn('Có mục lục nhưng không đoạn nào dùng kiểu Heading — mục lục sẽ trống. Hãy gán Heading 1/2/3 cho tiêu đề.')}
  if(sd)step('kiểu mặc định',()=>stylesPass(sd,o,ctx));
  if(sd)step('kiểu bảng',()=>lightTableStyles(sd,rep));
  if(setd)step('cài đặt tài liệu',()=>settingsPass(setd,o,ctx,rep));
  let cmt=await rd('word/comments.xml'),cmtTouched=false,cmtNew=false,ctd=null,rl=relsd;
  if(cmt&&o.nocmt&&!dry){Array.from(cmt.documentElement.children).forEach(rm);cmtTouched=true}
  if(o.mark){
    const flags=[];
    step('quét lỗi cần kiểm tra tay',()=>{flags.push(...lintDoc(body,o,rep,(o.aiSug||[]).concat(rep.aiSug||[])))});
    rep.lint=flags.map((f,i)=>({n:f.n,snip:f.snip,issues:f.issues,sev:f.sev,code:'#L'+String(i+1).padStart(2,'0'),hits:f.hits||[],ctx:f.ctx||f.snip}));
    if(flags.length){
      ctd=await rd('[Content_Types].xml');
      step('ghi Comment đánh dấu',()=>{
        if(!cmt){cmt=pX('<w:comments xmlns:w="'+W+'"/>');cmtNew=true}
        cmtTouched=true;const MAXC=o.maxComments||300;addComments(doc,cmt,flags.slice(0,MAXC),o);if(flags.length>MAXC)rep.warn('Có '+flags.length+' đoạn cần kiểm tra nhưng chỉ gắn Comment cho '+MAXC+' đoạn đầu để file không bị rối — danh sách đầy đủ nằm trong báo cáo .txt.');
        if(cmtNew){
          if(ctd&&!Array.from(ctd.documentElement.children).some(e=>e.getAttribute('PartName')==='/word/comments.xml')){
            const e=ctd.createElementNS(CTNS,'Override');e.setAttribute('PartName','/word/comments.xml');
            e.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml');ctd.documentElement.appendChild(e)}
          if(!rl)rl=pX('<Relationships xmlns="'+RELNS+'"/>');
          if(!Array.from(rl.documentElement.children).some(r=>/\/comments$/.test(r.getAttribute('Type')||''))){
            const e=rl.createElementNS(RELNS,'Relationship');e.setAttribute('Id','rIdRsCmt1');e.setAttribute('Type',R+'/comments');e.setAttribute('Target','comments.xml');rl.documentElement.appendChild(e)}}})}}
  const metaDocs=[];
  {const PN=[['docProps/core.xml',{creator:'tác giả',lastModifiedBy:'người sửa cuối'}],['docProps/app.xml',{Company:'đơn vị',Manager:'người quản lý'}]],found=[];
   for(const [fn,mp] of PN){let d=null;try{d=await rd(fn)}catch(e){}if(!d)continue;let ch=false;
     Array.from(d.getElementsByTagName('*')).forEach(e=>{const lb=mp[e.localName];if(!lb||e.children.length)return;const val=e.textContent.trim();if(!val)return;found.push(lb+' “'+val+'”');if(o.meta&&!o.dry){e.textContent='';ch=true}});
     if(ch)metaDocs.push([fn,d])}
   if(found.length){
     if(o.meta&&!o.dry){rep.fix('Xóa thông tin cá nhân trong thuộc tính file (tác giả, người sửa cuối, đơn vị)',found.length);rep.meta=true;rep.notes.push('Đã xóa khỏi thuộc tính file: '+found.join('; ')+'.')}
     else rep.notes.push('Lưu ý bảo mật: thuộc tính file còn '+found.join('; ')+'. Nếu đề cần giữ kín, bật “Xóa thông tin cá nhân” rồi chạy lại.')}}
  const out=[['word/document.xml',doc]];metaDocs.forEach(x=>out.push(x));
  if(sd)out.push(['word/styles.xml',sd]);if(setd)out.push(['word/settings.xml',setd]);if(numd&&ctx.numTouched)out.push(['word/numbering.xml',numd]);
  Object.keys(hfDocs).forEach(n=>out.push([n,hfDocs[n]]));
  if(cmt&&cmtTouched)out.push(['word/comments.xml',cmt]);
  if(cmtNew){if(ctd)out.push(['[Content_Types].xml',ctd]);if(rl)out.push(['word/_rels/document.xml.rels',rl])}
  else if(ctx.relsTouched&&relsd)out.push(['word/_rels/document.xml.rels',relsd]);
  hooks.progress('Đang kiểm tra cấu trúc file...');
  const er=[];
  for(const [n,d] of out){const s=ser(d);try{pX(s,n)}catch(e){er.push(e.message)}zip.file(n,s,{createFolders:false})}
  const rels=ctx.rels;all(doc,'blip',A).forEach(b=>{['embed','link'].forEach(a=>{const v=b.getAttributeNS(R,a);if(v&&!rels[v])er.push('hình trỏ tới r:id không tồn tại: '+v)})});
  if(pk){const ck=await pk(zip,true);ck.er.forEach(x=>{if(!/^docxToBlocks/.test(x)&&!base.has(x))er.push(x)})}
  if(er.length){const e=new Error('Kiểm tra cấu trúc thất bại, KHÔNG xuất file để tránh làm hỏng: '+er.slice(0,3).join('; '));e.validation=true;throw e}
  return{data:await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),rep}}

/* Chế độ an toàn: nếu file kết quả không qua kiểm tra cấu trúc, tự tắt dần các bước rủi ro nhất rồi thử lại */
const FALLBACK=[['căn đáp án trắc nghiệm & giữ bảng trên một trang',{mcq:false,tblkeep:false}],['chuyển công thức LaTeX',{latex:false}],['xử lý hình ảnh',{imgInline:false,imgFix:false}],['xử lý bảng',{tbl:false,tblborder:false}],
  ['dọn dòng trống/ngắt trang/giữ đoạn',{blank:false,keep:false,softbreak:false}],['dọn văn bản & đánh số lại Câu/Bài',{text:false,num:false,indent:false}]];
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

function wrapTxt(t,w){const out=[];String(t==null?'':t).split('\n').forEach(par=>{let line='';par.split(/\s+/).filter(Boolean).forEach(word=>{while(word.length>w){if(line){out.push(line);line=''}out.push(word.slice(0,w));word=word.slice(w)}
    if(!line)line=word;else if((line+' '+word).length<=w)line+=' '+word;else{out.push(line);line=word}});out.push(line)});return out.length?out:['']}
function txtTable(head,rows,wd,boldCol){
  const sep='+'+wd.map(w=>'-'.repeat(w+2)).join('+')+'+',L=[sep];
  const cell=(r,ri)=>r.map((c,k)=>{const b=boldCol.indexOf(k)>=0&&ri>=0,w=wd[k]-(b?4:0);return wrapTxt(c,w).map(x=>b&&x?'**'+x+'**':x)});
  const emit=(cs)=>{const h=Math.max.apply(null,cs.map(c=>c.length));for(let i=0;i<h;i++)L.push('| '+cs.map((c,k)=>(c[i]||'').padEnd(wd[k])).join(' | ')+' |')};
  emit(head.map(x=>[x.toUpperCase()]));L.push(sep);
  rows.forEach((r,ri)=>{emit(cell(r,ri));L.push(sep)});return L.join('\n')}
/* [v8] Thống kê mức cảnh báo + danh sách tự kiểm cho người rà soát (phụ lục biên bản) */
function sevCount(rep){const c={1:0,2:0,3:0};(rep.lint||[]).forEach(x=>(x.issues||[]).forEach(m=>{const k=/^\[(LỖI|NGHI NGỜ|GỢI Ý)\]/.exec(m);if(k)c[k[1]==='LỖI'?1:k[1]==='GỢI Ý'?3:2]++}));return c}
function sevLine(rep){const c=sevCount(rep);return 'LỖI chắc chắn: '+c[1]+' · NGHI NGỜ: '+c[2]+' · GỢI Ý: '+c[3]+' (các mục xếp từ nặng đến nhẹ)'}
function checklistItems(name,rep){
  const nL=(rep.lint||[]).length,nC=nL+rep.w.length+(rep.ai?((rep.ai.d.loi||[]).length+(rep.ai.d.canxacminh||[]).length):0),L=[];
  const rv=nC?'Đã xem hết '+nC+' mục ở phần II và ghi cách xử lý vào cột “Xử lý”':'Phần II không có mục nào — vẫn đọc lướt toàn bộ file một lượt bằng mắt';
  if(/\.xlsx$/i.test(name)){
    L.push(rv,'Số liệu, điểm số và công thức sau khi sửa vẫn đúng (đối chiếu ngẫu nhiên vài dòng với bản gốc)','Số/ngày công cụ đổi từ dạng chữ sang số/ngày đã đúng (đặc biệt ngày dd/mm/yyyy)','Mã định danh, số điện thoại, số 0 đầu vẫn giữ nguyên dạng chữ','Xem trước khi in (File → Print): đủ cột, không cắt chữ, dòng tiêu đề lặp đúng ở mỗi trang','In thử 1 trang để kiểm tra lề và cỡ chữ')}
  else{
    const lx=rep.w.some(x=>/công thức LaTeX đã chuyển nhưng có phần được xử lý gần đúng/.test(x));
    L.push(rv,'Đáp án từng câu đúng: tự giải lại ít nhất các câu khó, câu có hình, câu vận dụng'+(rep.ai?' và mọi câu AI báo “KHÔNG KHỚP” / “cần xác minh”':''),
      'Đáp án / hướng dẫn chấm khớp với đề (đúng số câu, đúng mã đề, cùng thang điểm)','Hình vẽ, đồ thị, bảng số liệu đúng với lời dẫn, đủ nét, không vỡ khi in',
      'Công thức hiển thị đúng ký hiệu'+(lx?' — đặc biệt các công thức công cụ đã báo là chuyển gần đúng':''),
      'Nội dung nằm trong chương trình, ma trận/đặc tả; tỉ lệ nhận biết – thông hiểu – vận dụng đúng quy định',
      'Thông tin đầu đề đầy đủ: trường, môn, lớp, thời gian, mã đề, họ tên – số báo danh','Thang điểm và tổng điểm đúng quy định',
      'In thử 1 bản: ngắt trang, bảng, hình, số trang hiển thị đúng; không còn trang trắng',
      rep.meta?'Thông tin cá nhân trong thuộc tính file đã được công cụ xóa — mở File → Info để xác nhận':'Nếu là đề thi cần giữ kín: kiểm tra File → Info → Inspect Document (tên tác giả, bản nháp, lịch sử sửa)',
      'Bản nộp cuối: đã xóa hết Comment của công cụ, đã chấp nhận hoặc từ chối mọi Track Changes')}
  return L}
function reportText(name,rep){
  const L=['BÁO CÁO RÀ SOÁT '+(/\.xlsx$/i.test(name)?'EXCEL (SỬA LỖI & CĂN TRANG IN)':'WORD')+' — '+name,'Phiên bản công cụ: '+VERSION,''];
  const tot=Array.from(rep.f.values()).reduce((a,b)=>a+b,0);
  /* 1. Đã sửa */
  L.push('I. NỘI DUNG CÔNG CỤ ĐÃ RÀ SOÁT VÀ TỰ SỬA ('+tot+' chỗ)');if(!rep.f.size)L.push('  (không có thay đổi nào)');rep.f.forEach((n,k)=>L.push('  • '+k+': '+n));
  if(rep.notes.length){L.push('','  Ghi chú:');rep.notes.slice(0,200).forEach(x=>L.push('   - '+x))}
  if(rep.changes&&rep.changes.length){L.push('','  Nhật ký thay đổi văn bản (trước → sau; tối đa '+rep.changes.length+' đoạn đầu):');rep.changes.forEach(x=>{const w=diffWin(x.b,x.a);L.push('   • Đoạn '+x.n+(x.t?' ('+x.t+')':'')+': “'+w[0]+'” → “'+w[1]+'”')})}
  /* 2. Cần chú ý — gộp vào một bảng */
  let R=[];const ai=rep.ai;
  (rep.lint||[]).forEach(x=>R.push([(x.code?x.code+' · ':'')+'Đoạn '+x.n+' “'+(x.ctx||x.snip)+'”','Công cụ',x.issues.join('; '),'Đã đánh dấu Comment trong file Word, chưa tự sửa — cần kiểm tra tay']));
  if(ai){
    (ai.d.loi||[]).forEach(x=>R.push([(x.code?x.code+' · ':'')+(x.vitri||'—'),'AI ('+[x.nhom,x.mucdo,x.tincay&&'tin cậy '+x.tincay].filter(Boolean).join(', ')+')'+(x.tt?' — '+x.tt:''),x.noidung,'AI đề xuất (chưa sửa trong file): '+(x.sua||'—')]));
    (ai.d.canxacminh||[]).forEach(x=>R.push([(x.code?x.code+' · ':'')+(x.vitri||'—'),'AI','[CẦN XÁC MINH] '+x.lydo,'Chưa biết đúng/sai — giáo viên xác nhận']))}
  rep.w.forEach(x=>R.push(['Toàn file','Công cụ',x,'Chưa xử lý — cần kiểm tra tay']));
  {const nL=(rep.lint||[]).length,sv=R.map((r,i)=>i<nL?(rep.lint[i].sev||2):2),ord=R.map((r,i)=>i).sort((a,b)=>(sv[a]-sv[b])||(a-b));R=ord.map(i=>R[i])}
  L.push('','II. NỘI DUNG CẦN CHÚ Ý (chưa sửa hoặc chưa biết đúng/sai) — '+R.length+' mục');if(rep.lint&&rep.lint.length)L.push('  '+sevLine(rep));
  if(R.length)L.push(txtTable(['STT','Vị trí','Nguồn','Nội dung cần chú ý','Xử lý / Gợi ý'],R.map((r,i)=>[String(i+1)].concat(r)),[4,18,13,50,34],[3]),'  (Chữ đặt giữa **…** là phần in đậm — mở bằng Word/Markdown để thấy đậm; cột “Nội dung” là điểm cần xem trước; phần đặt trong 【…】 là cụm chữ lỗi — trong file Word được tô màu, mã #L/#A khớp với số Comment.)');
  else L.push('  (không có)');
  if(ai&&(ai.d.tomtat||ai.d.xacnhan||ai.d.thongke)){L.push('','III. NHẬN XÉT CỦA AI');if(ai.d.tomtat)L.push('  Tóm tắt: '+ai.d.tomtat);if(ai.d.thongke)L.push('  Thống kê: '+ai.d.thongke);if(ai.d.xacnhan)L.push('  Xác nhận: '+ai.d.xacnhan);
    L.push('  Lưu ý: AI không nhìn thấy hình vẽ; các đề xuất chỉ để tham khảo — hãy tự giải lại và đối chiếu trước khi sửa đề.')}
  if(ai&&ai.d.doichieu&&ai.d.doichieu.length){const D=ai.d.doichieu.slice(0,150);L.push('','IV. ĐỐI CHIẾU ĐÁP ÁN (AI tự giải trước, rồi so với đáp án ghi trong đề)');
    L.push(txtTable(['STT','Câu','Cách giải ngắn của AI','Kết quả AI','Đáp án trong đề','Khớp'],D.map((x,i)=>[String(i+1),String(x.cau||''),String(x.cach_giai||''),String(x.ketqua_ai||''),String(x.trong_de||'—'),x.khop===true?'Khớp':x.khop===false?'KHÔNG KHỚP':'—']),[4,6,34,16,16,11],[]),'  (Chỉ là kết quả AI tự tính để bạn đối chiếu nhanh; câu có hình hoặc công thức ảnh AI có thể không giải được.)')}
  L.push('','PHỤ LỤC. DANH SÁCH TỰ KIỂM CỦA NGƯỜI RÀ SOÁT (công cụ không tự kiểm được)');checklistItems(name,rep).forEach(t=>L.push('  [ ] '+t));
  L.push('','  Người lập đề: ..............   Người rà soát: ..............   Tổ trưởng duyệt: ..............   Ngày: ....../....../......');
  return L.join('\n')}

/* [v7] Biên bản rà soát .docx — khổ A4 NGANG. Bảng "Nội dung cần chú ý": STT · Mã · Vị trí · Nội dung · Xử lý (để trống cho giáo viên ghi).
   Mã #L../#A.. khớp số Comment trong file Word; cụm chữ lỗi (đặt trong 【…】) được tô nền ngay trong cột Vị trí. */
async function reportDocx(name,rep){
  const xe=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const rn=(t,o)=>{o=o||{};return '<w:r><w:rPr>'+(o.b?'<w:b/>':'')+(o.i?'<w:i/>':'')+'<w:sz w:val="'+(o.sz||21)+'"/><w:szCs w:val="'+(o.sz||21)+'"/>'+(o.hl?'<w:highlight w:val="'+o.hl+'"/>':'')+'</w:rPr><w:t xml:space="preserve">'+xe(t)+'</w:t></w:r>'};
  /* chữ trong 【…】 được tô nền; **…** được in đậm */
  const rich=(s,o)=>{o=o||{};let h='';String(s==null?'':s).split(/(【[^】]*】)/).forEach(seg=>{if(!seg)return;
    const m=/^【([^】]*)】$/.exec(seg);if(m)h+=rn(m[1],Object.assign({},o,{hl:o.hlc||'yellow',b:true}));else h+=rn(seg,o)});return h};
  const para=(runs,o)=>{o=o||{};return '<w:p><w:pPr>'+(o.keep?'<w:keepNext/>':'')+'<w:spacing w:before="'+(o.before||0)+'" w:after="'+(o.after==null?60:o.after)+'"/>'+(o.ind?'<w:ind w:left="'+o.ind+'" w:hanging="'+(o.hang||0)+'"/>':'')+(o.jc?'<w:jc w:val="'+o.jc+'"/>':'')+'</w:pPr>'+runs+'</w:p>'};
  const lines=(t,o)=>String(t==null?'':t).split('\n').map(x=>para(rich(x,o),{after:30})).join('');
  const h2=t=>para(rn(t,{b:true,sz:24}),{before:200,after:80,keep:true});
  const W_=[620,1000,4300,6000,2650];                    /* tổng 14570 twips = A4 ngang trừ lề 2 cm */
  const cell=(w,inner,o)=>{o=o||{};return '<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+(o.fill?'<w:shd w:val="clear" w:color="auto" w:fill="'+o.fill+'"/>':'')+'</w:tcPr>'+(inner||para('',{after:0}))+'</w:tc>'};
  const table=(wd,head,rows)=>{
    const bd=['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:space="0" w:color="808080"/>').join('');
    let x='<w:tbl><w:tblPr><w:tblW w:w="'+wd.reduce((a,b)=>a+b,0)+'" w:type="dxa"/><w:tblBorders>'+bd+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+wd.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
    x+='<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>'+head.map((t,k)=>cell(wd[k],para(rn(t,{b:true}),{after:0,jc:'center'}),{fill:'D9E2F3'})).join('')+'</w:tr>';
    rows.forEach(r=>{x+='<w:tr><w:trPr><w:cantSplit/></w:trPr>'+r.map((c,k)=>cell(wd[k],c==null||c===''?'':(typeof c==='object'?c.xml:lines(c)),{fill:(c&&typeof c==='object')?c.fill:undefined})).join('')+'</w:tr>'});
    return x+'</w:tbl>'};
  const R_='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const isX=/\.xlsx$/i.test(name),tot=Array.from(rep.f.values()).reduce((a,b)=>a+b,0);
  let B='';
  B+=para(rn('BIÊN BẢN RÀ SOÁT '+(isX?'FILE EXCEL':'FILE WORD'),{b:true,sz:32}),{jc:'center',after:80});
  B+=para(rn('File: ',{b:true})+rn(name),{after:20})+para(rn('Ngày lập: ',{b:true})+rn(new Date().toLocaleDateString('vi-VN'))+rn('    Công cụ: ',{b:true})+rn(VERSION.split(' (')[0]),{after:80});
  B+=para(rn('Chú giải: ',{b:true,sz:19})+rn('chữ ',{sz:19})+rn('tô đỏ',{sz:19,hl:'red',b:true})+rn(' = LỖI chắc chắn; ',{sz:19})+rn('tô vàng',{sz:19,hl:'yellow',b:true})+rn(' = NGHI NGỜ (cần xem); ',{sz:19})+rn('tô lục lam',{sz:19,hl:'cyan',b:true})+rn(' = GỢI Ý (không bắt buộc). Màu theo mức nặng nhất của đoạn; các mục xếp từ nặng đến nhẹ. Mã #L.. và #A.. trùng với số trong Comment của file Word. Cột “Xử lý” để trống cho người rà soát ghi.',{sz:19}),{after:100});
  /* I. Đã tự sửa */
  B+=h2('I. NỘI DUNG CÔNG CỤ ĐÃ RÀ SOÁT VÀ TỰ SỬA ('+tot+' chỗ)');
  if(!rep.f.size)B+=para(rn('(không có thay đổi nào)',{i:true}));
  rep.f.forEach((n,k)=>{B+=para(rn('• '+k+': ')+rn(String(n),{b:true}),{ind:360,hang:180,after:20})});
  if(rep.notes.length){B+=para(rn('Ghi chú:',{b:true}),{before:80,after:20});rep.notes.slice(0,60).forEach(x=>{B+=para(rn('– '+x,{sz:20}),{ind:540,hang:180,after:10})})}
  if(rep.changes&&rep.changes.length){
    B+=para(rn('Nhật ký thay đổi văn bản (trước → sau), '+rep.changes.length+' đoạn:',{b:true}),{before:100,after:60,keep:true});
    const ch=rep.changes.map(x=>({x,w:diffWin(x.b,x.a)})),isTab=c=>c.w[0]==='⇥'&&c.w[1]==='',tabs=ch.filter(isTab),oth=ch.filter(c=>!isTab(c));
    const rows=oth.map(c=>['Đoạn '+c.x.n+(c.x.t?'\n('+c.x.t+')':''),c.w[0]||'(trống)',c.w[1]||'(đã xóa)']);
    if(tabs.length)rows.push(['Đoạn '+tabs.slice(0,40).map(c=>c.x.n).join(', ')+(tabs.length>40?'…':'')+'\n('+tabs.length+' đoạn)','⇥ (ký tự Tab thụt đầu dòng)','(đã xóa)']);
    B+=table([620,1900,5925,6125],['STT','Đoạn','Trước','Sau'],rows.map((r,i)=>[String(i+1)].concat(r)))}
  /* II. Cần chú ý */
  let R=[];const ai=rep.ai;
  (rep.lint||[]).forEach(x=>R.push({sev:x.sev||2,code:x.code||'',pos:'Đoạn '+x.n+'\n'+(x.ctx||x.snip),txt:x.issues.map(s=>'• '+s).join('\n')}));
  if(ai){
    (ai.d.loi||[]).forEach(x=>R.push({code:x.code||'',pos:x.vitri||'—',txt:'['+['AI',x.nhom,x.mucdo,x.tincay&&'tin cậy '+x.tincay].filter(Boolean).join(' · ')+(x.tt?' · '+x.tt:'')+'] '+x.noidung+(x.sua?'\nGợi ý sửa: '+x.sua:'')}));
    (ai.d.canxacminh||[]).forEach(x=>R.push({code:x.code||'',pos:x.vitri||'—',txt:'[AI · CẦN XÁC MINH] '+x.lydo}))}
  rep.w.forEach(x=>R.push({code:'',pos:'Toàn file',txt:'[Công cụ] '+x}));
  R=R.map((r,i)=>[r,i]).sort((a,b)=>((a[0].sev||2)-(b[0].sev||2))||(a[1]-b[1])).map(x=>x[0]);
  B+=h2('II. NỘI DUNG CẦN CHÚ Ý (chưa sửa hoặc chưa biết đúng/sai) — '+R.length+' mục');if(rep.lint&&rep.lint.length)B+=para(rn(sevLine(rep),{b:true,sz:20}),{after:60});
  if(R.length)B+=table(W_,['STT','Mã','Vị trí','Nội dung cần chú ý','Xử lý'],R.map((r,i)=>[String(i+1),{xml:para(rn(r.code||'—',{b:true}),{after:0,jc:'center'}),fill:r.sev?({1:'F8CBAD',2:'FFF2CC',3:'DDEBF7'}[r.sev]):undefined},r.pos,r.txt,'']));
  else B+=para(rn('(không có)',{i:true}));
  /* III–IV. AI */
  if(ai&&(ai.d.tomtat||ai.d.xacnhan||ai.d.thongke)){
    B+=h2('III. NHẬN XÉT CỦA AI');
    [['Tóm tắt',ai.d.tomtat],['Thống kê',ai.d.thongke],['Xác nhận',ai.d.xacnhan]].forEach(a=>{if(a[1])B+=para(rn(a[0]+': ',{b:true})+rn(a[1]),{after:40})});
    B+=para(rn('Lưu ý: AI không nhìn thấy hình vẽ; các đề xuất chỉ để tham khảo — hãy tự giải lại và đối chiếu trước khi sửa đề.',{i:true,sz:19}))}
  if(ai&&ai.d.doichieu&&ai.d.doichieu.length){
    B+=h2('IV. ĐỐI CHIẾU ĐÁP ÁN (AI tự giải rồi so với đáp án ghi trong đề)');
    B+=table([620,900,6200,2200,2200,2450],['STT','Câu','Cách giải ngắn của AI','Kết quả AI','Đáp án trong đề','Khớp'],ai.d.doichieu.slice(0,150).map((x,i)=>[String(i+1),String(x.cau||''),String(x.cach_giai||''),String(x.ketqua_ai||''),String(x.trong_de||'—'),{xml:para(rn(x.khop===true?'Khớp':x.khop===false?'KHÔNG KHỚP':'—',{b:x.khop===false}),{after:0})}]))}
  B+=h2('PHỤ LỤC. DANH SÁCH TỰ KIỂM CỦA NGƯỜI RÀ SOÁT (công cụ không tự kiểm được)');
  B+=table([800,9300,2470,2000],['Đã kiểm','Nội dung cần tự kiểm','Người kiểm','Ghi chú'],checklistItems(name,rep).map(t=>[{xml:para(rn('☐',{sz:26}),{after:0,jc:'center'})},t,'','']));
  B+=para(rn('Người lập đề: ............................    Người rà soát: ............................    Tổ trưởng duyệt: ............................    Ngày: ....../....../......'),{before:240});
  const sect='<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
  const NS='xmlns:w="'+W+'"',HD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const z=new JSZip();
  z.file('[Content_Types].xml',HD+'<Types xmlns="'+CTNS+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  z.file('_rels/.rels',HD+'<Relationships xmlns="'+RELNS+'"><Relationship Id="rId1" Type="'+R_+'/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/_rels/document.xml.rels',HD+'<Relationships xmlns="'+RELNS+'"><Relationship Id="rId1" Type="'+R_+'/styles" Target="styles.xml"/></Relationships>');
  z.file('word/styles.xml',HD+'<w:styles '+NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>');
  z.file('word/document.xml',HD+'<w:document '+NS+'><w:body>'+B+sect+'</w:body></w:document>');
  return z.generateAsync({type:'uint8array',compression:'DEFLATE'})}

/* ====================== EXCEL (.xlsx): TỰ CĂN CHỈNH TRANG IN ======================
   Mở gói .xlsx bằng JSZip, chỉ sửa phần cài đặt in (khổ giấy, hướng, lề, vùng in, thu phóng, dòng tiêu đề lặp)
   và (tuỳ chọn) độ cao dòng. Công thức, số liệu, định dạng, cột ẩn được giữ nguyên. */
const SN='http://schemas.openxmlformats.org/spreadsheetml/2006/main',RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XL_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const sk=(p,n)=>p?Array.from(p.children).filter(c=>c.localName===n):[];
const s1=(p,n)=>sk(p,n)[0]||null;
const mkS=(d,n)=>d.createElementNS(SN,n);
const isT=v=>/^(1|true)$/i.test(v||'');
function colNum(s){let n=0;for(const ch of s)n=n*26+ch.charCodeAt(0)-64;return n}
function colName(n){let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26}return s}
function parseRef(a){const m=/^\$?([A-Z]+)\$?(\d+)$/.exec(a||'');return m?{c:colNum(m[1]),r:+m[2]}:null}
const A4={w:595.28,h:841.89};
const qName=n=>"'"+String(n).replace(/'/g,"''")+"'";
function xlScan(doc){
  const root=doc.documentElement,sd=s1(root,'sheetData'),fmt=s1(root,'sheetFormatPr');
  const defH=(fmt&&parseFloat(fmt.getAttribute('defaultRowHeight')))||15;
  let defW=fmt&&parseFloat(fmt.getAttribute('defaultColWidth'));if(!(defW>0))defW=9.14;
  const specs=sk(s1(root,'cols'),'col').map(e=>({a:+e.getAttribute('min'),b:+e.getAttribute('max'),w:parseFloat(e.getAttribute('width')),h:isT(e.getAttribute('hidden'))}));
  const colW=c=>{const s=specs.find(x=>c>=x.a&&c<=x.b);if(!s)return defW;return s.h?0:(isFinite(s.w)?s.w:defW)};
  const rows=new Map();let minR=1e9,maxR=0,minC=1e9,maxC=0,idx=0;
  sk(sd,'row').forEach(re=>{idx++;const r=+re.getAttribute('r')||idx;let cnt=0,txt=0;
    sk(re,'c').forEach(ce=>{const ref=parseRef(ce.getAttribute('r'));if(!ref)return;
      const has=sk(ce,'f').length>0||sk(ce,'is').length>0||sk(ce,'v').some(v=>v.textContent!=='');
      if(!has)return;cnt++;const t=ce.getAttribute('t');if(t==='s'||t==='inlineStr'||t==='str')txt++;
      minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,ref.c);maxC=Math.max(maxC,ref.c)});
    const h=re.getAttribute('ht');
    rows.set(r,{el:re,r,ht:h!==null&&h!==''&&isFinite(parseFloat(h))?parseFloat(h):null,hid:isT(re.getAttribute('hidden')),cnt,txt})});
  const merges=sk(s1(root,'mergeCells'),'mergeCell').map(m=>{const p=String(m.getAttribute('ref')||'').split(':'),a=parseRef(p[0]),b=parseRef(p[1]||p[0]);return a&&b?{r1:a.r,c1:a.c,r2:b.r,c2:b.c}:null}).filter(Boolean);
  if(maxR)merges.forEach(m=>{if(m.r1>=minR&&m.r1<=maxR&&m.c1>=minC&&m.c1<=maxC){maxR=Math.max(maxR,m.r2);maxC=Math.max(maxC,m.c2)}});
  return{rows,defH,colW,minR,maxR,minC,maxC,merges,empty:!maxR,drawing:!!(s1(root,'drawing')||s1(root,'legacyDrawing'))}}
function xlSize(S){
  let cw=0,ch=0;
  for(let c=S.minC;c<=S.maxC;c++)cw+=S.colW(c)*7*0.75;      /* độ rộng cột (ký tự) → điểm: ~7 px/ký tự, 1 px = 0,75 pt */
  for(let r=S.minR;r<=S.maxR;r++){const ro=S.rows.get(r);ch+=ro?(ro.hid?0:(ro.ht!=null?ro.ht:S.defH)):S.defH}
  return{cw,ch}}
function xlHeader(S){
  const nc=S.maxC-S.minC+1;
  for(let r=S.minR;r<=Math.min(S.maxR-1,S.minR+30);r++){const ro=S.rows.get(r);if(!ro||ro.hid)continue;
    if(ro.cnt>=Math.max(3,Math.ceil(nc*.6))&&ro.txt>=ro.cnt*.6){let b=r;S.merges.forEach(m=>{if(m.r1===r&&m.r2>b)b=m.r2});return b<S.maxR?{a:r,b}:null}}
  return null}
function xlPlan(cw,ch,xo){
  const mm=v=>v/25.4*72,mg={t:mm(xo.mt),b:mm(xo.mb),l:mm(xo.ml),r:mm(xo.mr)};
  const cand=['landscape','portrait'].filter(o=>xo.orient==='auto'||xo.orient===o).map(o=>{
    const pw=o==='landscape'?A4.h:A4.w,ph=o==='landscape'?A4.w:A4.h,aw=pw-mg.l-mg.r,ah=ph-mg.t-mg.b,sw=Math.min(1,aw/cw),sa=Math.min(sw,ah/ch);
    const pg1=Math.ceil(ch*sw/ah-1e-6),one=sa>=xo.minScale-1e-9||pg1<=1,e=one?sa:sw;
    return{o,aw,ah,sw,sa,one,e,pages:one?1:Math.ceil(ch*sw/ah-1e-6)}});
  cand.sort((a,b)=>Math.abs(a.e-b.e)>.03?b.e-a.e:(a.pages!==b.pages?a.pages-b.pages:((cw>=ch)===(a.o==='landscape')?-1:1)));
  return Object.assign({mg},cand[0])}
function xlVC(sd,cache,s){
  if(cache.has(s))return cache.get(s);
  const xfs=s1(sd.documentElement,'cellXfs'),list=sk(xfs,'xf'),base=list[s];
  if(!base){cache.set(s,s);return s}
  const al=s1(base,'alignment');
  if(al&&al.getAttribute('vertical')&&al.getAttribute('vertical')!=='bottom'){cache.set(s,s);return s}
  const nx=base.cloneNode(true);let a2=s1(nx,'alignment');
  if(!a2){a2=mkS(sd,'alignment');nx.insertBefore(a2,nx.firstChild)}
  a2.setAttribute('vertical','center');nx.setAttribute('applyAlignment','1');
  xfs.appendChild(nx);xfs.setAttribute('count',String(list.length+1));cache.set(s,list.length);return list.length}
const XL_AFTER_PS=['headerFooter','rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','legacyDrawingHF','drawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'];
function xlSetPrint(doc,plan,xo,single){
  const root=doc.documentElement;
  let sp=s1(root,'sheetPr');if(!sp){sp=mkS(doc,'sheetPr');root.insertBefore(sp,root.firstChild)}
  let ps=s1(sp,'pageSetUpPr');if(!ps){ps=mkS(doc,'pageSetUpPr');sp.appendChild(ps)}
  ps.setAttribute('fitToPage','1');
  const old=s1(root,'pageSetup');
  ['printOptions','pageMargins','pageSetup'].forEach(n=>sk(root,n).forEach(e=>root.removeChild(e)));
  const ref=Array.from(root.children).find(c=>XL_AFTER_PS.indexOf(c.localName)>=0)||null;
  if(xo.center){const po=mkS(doc,'printOptions');po.setAttribute('horizontalCentered','1');if(single)po.setAttribute('verticalCentered','1');root.insertBefore(po,ref)}
  const pm=mkS(doc,'pageMargins'),inch=v=>(v/72).toFixed(3);
  pm.setAttribute('left',inch(plan.mg.l));pm.setAttribute('right',inch(plan.mg.r));pm.setAttribute('top',inch(plan.mg.t));pm.setAttribute('bottom',inch(plan.mg.b));pm.setAttribute('header','0.3');pm.setAttribute('footer','0.3');
  root.insertBefore(pm,ref);
  const pg=old||mkS(doc,'pageSetup');
  ['scale','useFirstPageNumber','firstPageNumber'].forEach(a=>pg.removeAttribute(a));
  pg.setAttribute('paperSize','9');pg.setAttribute('orientation',plan.o);pg.setAttribute('fitToWidth','1');pg.setAttribute('fitToHeight',plan.one?'1':'0');
  root.insertBefore(pg,ref);
  if(xo.footer&&!single){   /* số trang “Trang x/y” ở chân trang (chỉ khi in nhiều trang, và chưa có chân trang) */
    let hf=s1(root,'headerFooter');
    if(!hf){hf=mkS(doc,'headerFooter');const r2=Array.from(root.children).find(c=>XL_AFTER_PS.indexOf(c.localName)>0)||null;root.insertBefore(hf,r2)}
    if(!sk(hf,'oddFooter').some(e=>e.textContent.trim())){sk(hf,'oddFooter').forEach(e=>hf.removeChild(e));const f=mkS(doc,'oddFooter');f.textContent='&CTrang &P/&N';
      const nxt=Array.from(hf.children).find(c=>['evenHeader','evenFooter','firstHeader','firstFooter'].indexOf(c.localName)>=0)||null;hf.insertBefore(f,nxt)}}}
const XL_AFTER_DN=['calcPr','oleSize','customWorkbookViews','pivotCaches','smartTagPr','smartTagTypes','webPublishing','fileRecoveryPr','webPublishObjects','extLst'];
function xlDefName(wbRoot,wbDoc,idx,kind,val){
  let dn=s1(wbRoot,'definedNames');
  if(!dn){dn=wbDoc.createElementNS(SN,'definedNames');const ref=Array.from(wbRoot.children).find(c=>XL_AFTER_DN.indexOf(c.localName)>=0)||null;wbRoot.insertBefore(dn,ref)}
  sk(dn,'definedName').forEach(e=>{if(e.getAttribute('name')==='_xlnm.'+kind&&e.getAttribute('localSheetId')===String(idx))dn.removeChild(e)});
  if(val===null)return;
  const e=wbDoc.createElementNS(SN,'definedName');e.setAttribute('name','_xlnm.'+kind);e.setAttribute('localSheetId',String(idx));e.textContent=val;dn.appendChild(e)}
/* ---------- EXCEL: RÀ SOÁT & SỬA LỖI DỮ LIỆU (chạy trước bước căn trang in) ----------
   Sửa: khoảng trắng/ký tự ẩn/dấu tiếng Việt dạng tổ hợp · số & ngày lưu dạng văn bản · công thức lỗi (#DIV/0!, #N/A…)
   · cột hẹp (#####) và chữ bị cắt · bảng chưa có viền · vùng gộp ô chồng nhau (gây báo “file bị hỏng”) · liên kết ngoài.
   Cảnh báo (không tự sửa): điểm ngoài 0–10, dòng trùng, dòng/cột ẩn, font Việt cũ, ô lỗi còn lại. */
const XL_ERRS=['#DIV/0!','#N/A','#REF!','#NAME?','#VALUE!','#NUM!','#NULL!','#SPILL!','#CALC!'];
const XL_BI={1:'0',2:'0.00',3:'#,##0',4:'#,##0.00',9:'0%',10:'0.00%',37:'#,##0 ;(#,##0)',38:'#,##0 ;[Red](#,##0)',39:'#,##0.00;(#,##0.00)',40:'#,##0.00;[Red](#,##0.00)',41:'#,##0',42:'#,##0',43:'#,##0.00',44:'#,##0.00',48:'##0.0E+0',49:'@'};
const XL_HID=/[\u200B-\u200D\u2060\uFEFF\u00AD]/g,XL_SP=/[\u00A0\u2007\u202F\u3000]/g;
const xlClean=x=>x.normalize('NFC').replace(XL_SP,' ').replace(XL_HID,'');
function xlTs(si){const o=[];Array.from(si.children).forEach(c=>{if(c.localName==='t')o.push(c);else if(c.localName==='r')sk(c,'t').forEach(t=>o.push(t))});return o}
function xlCleanTs(ts,keep){let ch=false;ts.forEach((t,i)=>{const b=t.textContent;let a=xlClean(b);if(!keep)a=a.replace(/[ \t]{2,}/g,' ');a=a.replace(/ ?\r?\n ?/g,'\n');
  if(i===0)a=a.replace(/^\s+/,'');if(i===ts.length-1)a=a.replace(/\s+$/,'');
  if(a!==b){t.textContent=a;if(/^\s|\s$/.test(a))t.setAttributeNS(XMLNS,'xml:space','preserve');ch=true}});return ch}
function xlParseNum(x){let s=String(x).trim();if(!s)return null;
  if(/^[-+]?0\d/.test(s))return null;                                   /* 007, 0912… là mã/SĐT, giữ dạng chữ */
  if(/^[-+]?\d{1,3}(\.\d{3}){2,}(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  else if(/^[-+]?\d{1,3}(,\d{3}){2,}(\.\d+)?$/.test(s))s=s.replace(/,/g,'');
  else if(/^[-+]?\d+([.,]\d+)?$/.test(s))s=s.replace(',','.');
  else return null;
  const dg=s.replace(/[^0-9]/g,'');
  if(s.indexOf('.')<0&&dg.length>8)return null;                         /* dãy số dài: mã định danh, CCCD, SĐT */
  if(dg.length>15)return null;
  const v=Number(s);return isFinite(v)?v:null}
function xlParseDate(x){const m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(String(x).trim());if(!m)return null;
  const d=+m[1],mo=+m[2],y=+m[3];if(y<1900||y>2100||mo<1||mo>12||d<1||d>31)return null;
  const t=Date.UTC(y,mo-1,d),dt=new Date(t);if(dt.getUTCDate()!==d||dt.getUTCMonth()!==mo-1)return'bad';return t/86400000+25569}
function xlStyles(sd){const root=sd.documentElement,nf=new Map(),xfs=s1(root,'cellXfs');if(!xfs)return null;
  sk(s1(root,'numFmts'),'numFmt').forEach(e=>nf.set(+e.getAttribute('numFmtId'),e.getAttribute('formatCode')||''));
  return{root,nf,xfs,fonts:s1(root,'fonts'),borders:s1(root,'borders'),list:sk(xfs,'xf'),cache:new Map(),fc:new Map(),dirty:false,thin:null,dfmt:null}}
function xfAt(X,s){if(s>=X.list.length)X.list=sk(X.xfs,'xf');return X.list[s]||X.list[0]}
function xlFmtCode(X,id){id=+id||0;if(id===0)return'General';if(X.nf.has(id))return X.nf.get(id);if((id>=14&&id<=22)||(id>=45&&id<=47))return'dd/mm/yyyy';return XL_BI[id]||'General'}
function xlIsDate(code){const c=String(code).replace(/"[^"]*"/g,'').replace(/\[[^\]]*\]/g,'').replace(/\\./g,'');return/[dmyhs]/i.test(c)&&!/^\s*General\s*$/i.test(c)}
function xlFont(X,s){const k=s;if(X.fc.has(k))return X.fc.get(k);const xf=xfAt(X,s);
  const fo=sk(X.fonts,'font')[+(xf&&xf.getAttribute('fontId'))||0],se=fo&&s1(fo,'sz'),sz=(se&&parseFloat(se.getAttribute('val')))||11,be=fo&&s1(fo,'b'),
    bold=!!be&&(be.getAttribute('val')===null||isT(be.getAttribute('val'))),al=xf&&s1(xf,'alignment');
  const r={k:sz/11*(bold?1.1:1),sz,wrap:!!al&&isT(al.getAttribute('wrapText')),h:al&&al.getAttribute('horizontal')!=='general'?al.getAttribute('horizontal')||'':'',v:al?al.getAttribute('vertical')||'':'',
    nf:+(xf&&xf.getAttribute('numFmtId'))||0,bd:+(xf&&xf.getAttribute('borderId'))||0};X.fc.set(k,r);return r}
function xlClone(X,s,key,mut){const k=s+'|'+key;if(X.cache.has(k))return X.cache.get(k);
  const list=sk(X.xfs,'xf'),base=list[s]||list[0];if(!base){X.cache.set(k,s);return s}
  const nx=base.cloneNode(true);mut(nx);X.xfs.appendChild(nx);X.xfs.setAttribute('count',String(list.length+1));X.dirty=true;X.cache.set(k,list.length);return list.length}
function xlAlign(X,nx,o){let a=s1(nx,'alignment');if(!a){a=mkS(X.root.ownerDocument,'alignment');nx.insertBefore(a,nx.firstChild)}
  Object.keys(o).forEach(n=>{const cv=a.getAttribute(n);if(o[n]===true||!cv||cv==='general'||(n==='vertical'&&cv==='bottom'))a.setAttribute(n,o[n]===true?'1':o[n])});nx.setAttribute('applyAlignment','1')}
function xlHasBorder(X,s){const bd=xlFont(X,s).bd;if(!bd)return false;const b=sk(X.borders,'border')[bd];
  return['left','right','top','bottom'].some(n=>{const e=s1(b,n),st=e&&e.getAttribute('style');return st&&st!=='none'})}
function xlThin(X){if(X.thin!=null)return X.thin;const d=X.root.ownerDocument,list=sk(X.borders,'border'),b=mkS(d,'border');
  ['left','right','top','bottom'].forEach(n=>{const e=mkS(d,n);e.setAttribute('style','thin');const c=mkS(d,'color');c.setAttribute('auto','1');e.appendChild(c);b.appendChild(e)});
  b.appendChild(mkS(d,'diagonal'));X.borders.appendChild(b);X.borders.setAttribute('count',String(list.length+1));X.dirty=true;return(X.thin=list.length)}
function xlDateFmt(X){if(X.dfmt!=null)return X.dfmt;const d=X.root.ownerDocument;let nf=s1(X.root,'numFmts');
  if(nf){const e=sk(nf,'numFmt').find(e=>/^dd\/mm\/yyyy$/i.test(e.getAttribute('formatCode')||''));if(e)return(X.dfmt=+e.getAttribute('numFmtId'))}
  if(!nf){nf=mkS(d,'numFmts');X.root.insertBefore(nf,X.root.firstChild)}
  let id=163;sk(nf,'numFmt').forEach(e=>{id=Math.max(id,+e.getAttribute('numFmtId')||0)});id++;
  const e=mkS(d,'numFmt');e.setAttribute('numFmtId',String(id));e.setAttribute('formatCode','dd/mm/yyyy');nf.appendChild(e);nf.setAttribute('count',String(sk(nf,'numFmt').length));X.nf.set(id,'dd/mm/yyyy');X.dirty=true;return(X.dfmt=id)}
function xlNumLen(v,code){const n=Number(v);if(!isFinite(n))return String(v).length;
  const base=code.replace(/"[^"]*"/g,'');
  if(xlIsDate(code)){const t=/[hs]/i.test(base),d=/[dy]/i.test(base);return t&&d?16:t?8:/mmmm/i.test(base)?18:10}
  const sec=base.split(';')[0].replace(/\[[^\]]*\]/g,''),lit=(code.split(';')[0].match(/"[^"]*"/g)||[]).join('').replace(/"/g,'').length;
  if(/^\s*General\s*$/i.test(sec)||sec.trim()===''){const a=Math.abs(n),ip=a>=1?Math.floor(a).toString().length:1;return(n<0?1:0)+Math.min(ip,11)+(Number.isInteger(n)?0:2)}
  if(sec.trim()==='@')return String(v).length;
  if(/E[+-]/i.test(sec))return 9+lit;
  const dm=/\.([0#?]+)/.exec(sec),dec=dm?dm[1].length:0,pct=/%/.test(sec),a=Math.abs(pct?n*100:n),ip=Math.floor(a+1e-9).toString().length,grp=/#,#|0,0|#,0|0,#/.test(sec);
  return(n<0?1:0)+ip+(grp?Math.floor((ip-1)/3):0)+(dec?dec+1:0)+(pct?1:0)+lit}
function xlCollect(doc,SS){const sd=s1(doc.documentElement,'sheetData'),out=[];let ri=0;
  sk(sd,'row').forEach(ro=>{ri++;const r=+ro.getAttribute('r')||ri;let ci=0;
    sk(ro,'c').forEach(ce=>{ci++;const ref=parseRef(ce.getAttribute('r'))||{r,c:ci},t=ce.getAttribute('t')||'n',f=s1(ce,'f'),vE=s1(ce,'v'),v=vE?vE.textContent:'';
      let text=null;if(t==='s')text=SS[+v]!=null?SS[+v]:'';else if(t==='inlineStr'){const is=s1(ce,'is');text=is?xlTs(is).map(x=>x.textContent).join(''):''}else if(t==='str'||t==='e')text=v;
      out.push({ce,ro,r:ref.r,c:ref.c,t,f,v,text,has:!!f||(t==='inlineStr'?text!=='':v!==''),s:+ce.getAttribute('s')||0})})});return out}
function xlFixMerges(doc){const mc=s1(doc.documentElement,'mergeCells');if(!mc)return 0;const list=[];let bad=0;
  sk(mc,'mergeCell').forEach(e=>{const p=String(e.getAttribute('ref')||'').split(':'),a=parseRef(p[0]),b=parseRef(p[1]||p[0]);
    if(!a||!b||(a.r===b.r&&a.c===b.c)){mc.removeChild(e);bad++;return}
    const m={r1:Math.min(a.r,b.r),r2:Math.max(a.r,b.r),c1:Math.min(a.c,b.c),c2:Math.max(a.c,b.c)};
    if(list.some(x=>m.r1<=x.r2&&m.r2>=x.r1&&m.c1<=x.c2&&m.c2>=x.c1)){mc.removeChild(e);bad++}else list.push(m)});
  if(!list.length)doc.documentElement.removeChild(mc);else mc.setAttribute('count',String(list.length));return bad}
const XL_AFTER_MC=['phoneticPr','conditionalFormatting','dataValidations','hyperlinks','printOptions','pageMargins','pageSetup','headerFooter','rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'];
function xlAddMerge(doc,r,c1,c2){const root=doc.documentElement;let mc=s1(root,'mergeCells');
  if(!mc){mc=mkS(doc,'mergeCells');root.insertBefore(mc,Array.from(root.children).find(x=>XL_AFTER_MC.indexOf(x.localName)>=0)||null)}
  const e=mkS(doc,'mergeCell');e.setAttribute('ref',colName(c1)+r+':'+colName(c2)+r);mc.appendChild(e);mc.setAttribute('count',String(sk(mc,'mergeCell').length))}
function xlSetCols(doc,widths,maxC){const root=doc.documentElement;let cols=s1(root,'cols');const per=new Map(),tail=[];
  sk(cols,'col').forEach(e=>{const a=+e.getAttribute('min'),b=+e.getAttribute('max'),at={};Array.from(e.attributes).forEach(x=>{if(x.name!=='min'&&x.name!=='max')at[x.name]=x.value});
    for(let c=a;c<=Math.min(b,maxC);c++)per.set(c,Object.assign({},at));if(b>maxC)tail.push({a:Math.max(a,maxC+1),b,at})});
  widths.forEach((w,c)=>{const at=per.get(c)||{};at.width=String(w);at.customWidth='1';per.set(c,at)});
  const out=[];Array.from(per.keys()).sort((x,y)=>x-y).forEach(c=>{const at=per.get(c),k=JSON.stringify(at),L=out[out.length-1];if(L&&L.b===c-1&&L.k===k)L.b=c;else out.push({a:c,b:c,at,k})});
  tail.forEach(t=>out.push({a:t.a,b:t.b,at:t.at}));out.sort((x,y)=>x.a-y.a);
  if(cols)while(cols.firstChild)cols.removeChild(cols.firstChild);else{cols=mkS(doc,'cols');root.insertBefore(cols,s1(root,'sheetData'))}
  out.forEach(o=>{const e=mkS(doc,'col');e.setAttribute('min',String(o.a));e.setAttribute('max',String(o.b));Object.keys(o.at).forEach(n=>e.setAttribute(n,o.at[n]));cols.appendChild(e)})}
function xlEnsureCell(doc,ro,r,c){let before=null;
  for(const ce of sk(ro,'c')){const ref=parseRef(ce.getAttribute('r'));if(!ref)continue;if(ref.c===c)return ce;if(ref.c>c){before=ce;break}}
  const ce=mkS(doc,'c');ce.setAttribute('r',colName(c)+r);ro.insertBefore(ce,before);return ce}
function xlToNum(k,val,X,kind){const ce=k.ce;ce.removeAttribute('t');sk(ce,'is').forEach(e=>ce.removeChild(e));
  let v=s1(ce,'v');if(!v){v=mkS(ce.ownerDocument,'v');ce.appendChild(v)}v.textContent=String(val);k.t='n';k.v=String(val);k.text=null;
  if(X){let ns=k.s;
    if(kind==='date')ns=xlClone(X,k.s,'date',nx=>{nx.setAttribute('numFmtId',String(xlDateFmt(X)));nx.setAttribute('applyNumberFormat','1')});
    else if(xlFont(X,k.s).nf===49)ns=xlClone(X,k.s,'gen',nx=>{nx.setAttribute('numFmtId','0');nx.setAttribute('applyNumberFormat','1')});
    if(ns!==k.s){ce.setAttribute('s',String(ns));k.s=ns}}}
const xlAddr=k=>colName(k.c)+k.r;
const xlList=a=>a.slice(0,6).join(', ')+(a.length>6?'… (+'+(a.length-6)+')':'');
/* Bảng: kẻ viền + căn giữa/xuống dòng dòng tiêu đề — chỉ khi bảng chưa có viền */
function xlBorders(doc,X,S,hdr,rep,nm){
  if(!X||!hdr)return false;let c1=1e9,c2=0;
  for(let r=hdr.a;r<=hdr.b;r++){const ro=S.rows.get(r);if(!ro)continue;
    sk(ro.el,'c').forEach(ce=>{const ref=parseRef(ce.getAttribute('r'));if(!ref)return;
      if(sk(ce,'f').length||sk(ce,'is').length||sk(ce,'v').some(v=>v.textContent!=='')){c1=Math.min(c1,ref.c);c2=Math.max(c2,ref.c)}})}
  S.merges.forEach(m=>{if(m.r1>=hdr.a&&m.r1<=hdr.b&&m.c1>=c1&&m.c1<=c2)c2=Math.max(c2,m.c2)});
  if(!(c2>c1))return false;
  const need=Math.max(2,Math.floor((c2-c1+1)*.3));let last=hdr.b;
  for(let r=hdr.b+1;r<=S.maxR;r++){const ro=S.rows.get(r);if(!ro||ro.cnt<need)break;last=r}
  if(last<=hdr.b)return false;
  let tot=0,bd=0;
  for(let r=hdr.a;r<=last;r++){const ro=S.rows.get(r);if(!ro)continue;
    sk(ro.el,'c').forEach(ce=>{const ref=parseRef(ce.getAttribute('r'));if(ref&&ref.c>=c1&&ref.c<=c2){tot++;if(xlHasBorder(X,+ce.getAttribute('s')||0))bd++}})}
  if(tot&&bd/tot>=.4){rep.notes.push(nm+'bảng đã có viền — giữ nguyên.');return false}
  const th=xlThin(X);let n=0;
  for(let r=hdr.a;r<=last;r++){const ro=S.rows.get(r);if(!ro)continue;ro.el.removeAttribute('spans');
    for(let c=c1;c<=c2;c++){const ce=xlEnsureCell(doc,ro.el,r,c),s=+ce.getAttribute('s')||0;
      const ns=r<=hdr.b?xlClone(X,s,'hb'+th,nx=>{nx.setAttribute('borderId',String(th));nx.setAttribute('applyBorder','1');xlAlign(X,nx,{horizontal:'center',vertical:'center',wrapText:true})})
        :xlClone(X,s,'bd'+th,nx=>{nx.setAttribute('borderId',String(th));nx.setAttribute('applyBorder','1')});
      ce.setAttribute('s',String(ns))}n++}
  rep.fix('Kẻ viền bảng dữ liệu, căn giữa dòng tiêu đề (dòng)',n);rep.notes.push(nm+'kẻ viền bảng '+colName(c1)+hdr.a+':'+colName(c2)+last+'.');return true}
/* Cột hẹp (#####), chữ bị cắt → nới cột, bật xuống dòng, tăng độ cao dòng */
function xlFit(doc,X,SS,rep,nm){
  const S=xlScan(doc);if(S.empty||!X)return;
  const hd0=xlHeader(S),tStart=hd0?hd0.b+1:S.minR+1;
  const cells=xlCollect(doc,SS),mAt=new Map(),inM=new Set(),occ=new Set();
  S.merges.forEach(m=>{mAt.set(m.r1+','+m.c1,m);if((m.r2-m.r1+1)*(m.c2-m.c1+1)<=20000)for(let r=m.r1;r<=m.r2;r++)for(let c=m.c1;c<=m.c2;c++)if(r!==m.r1||c!==m.c1)inM.add(r+','+c)});
  cells.forEach(k=>{if(k.has)occ.add(k.r+','+k.c)});
  const cur=c=>S.colW(c),numNeed=new Map(),txtNeed=new Map(),wordNeed=new Map(),wr=[],clip=[];let nMg=0;const bump=(m,c,v)=>{if(v>(m.get(c)||0))m.set(c,v)};
  cells.forEach(k=>{
    if(!k.has||k.t==='e'||k.r<S.minR||k.r>S.maxR||k.c<S.minC||k.c>S.maxC||inM.has(k.r+','+k.c))return;
    const m=mAt.get(k.r+','+k.c),span=!!m&&m.c2>m.c1;let avail=0;
    if(m){for(let c=m.c1;c<=m.c2;c++)avail+=cur(c)}else avail=cur(k.c);if(!(avail>0))return;
    const fi=xlFont(X,k.s);
    if(k.t==='n'){if(k.v===''||span)return;bump(numNeed,k.c,xlNumLen(k.v,xlFmtCode(X,fi.nf))*fi.k+1.2);return}
    if(k.t==='b'){if(!span)bump(numNeed,k.c,6);return}
    const tx=k.text;if(tx==null||tx==='')return;
    const lines=tx.split('\n'),mx=Math.max.apply(null,lines.map(x=>x.length))*fi.k,rec={k,m,fi,lines,force:false};
    if(fi.wrap){wr.push(rec);if(!span&&!k.f){const lw=Math.max.apply(null,tx.split(/\s+/).map(xlWordW));bump(wordNeed,k.c,lw*fi.k+1.6)}return}
    if(mx+1.2<=avail&&lines.length===1)return;
    if(lines.length>1){rec.force=true;wr.push(rec);return}
    const h=fi.h,c2=m?m.c2:k.c,rE=!occ.has(k.r+','+(c2+1)),lE=k.c===1||!occ.has(k.r+','+(k.c-1));
    const over=h==='right'?lE:(h==='center'||h==='centerContinuous')?(rE&&lE):rE;
    if(over){if(h===''||h==='left'){let run=avail;for(let c=c2+1;c<=S.maxC&&!occ.has(k.r+','+c);c++)run+=cur(c);if(mx+1.2>run){
        if(k.r>=tStart&&!span){rec.force=true;wr.push(rec);bump(txtNeed,k.c,40)}
        else if(!span&&c2<S.maxC&&!S.merges.some(q=>q.r1<=k.r&&q.r2>=k.r&&q.c2>k.c)){   /* dòng tiêu đề/ghi chú dài: gộp ngang sang các ô trống bên phải rồi xuống dòng */
          let e=k.c;while(e<S.maxC&&!occ.has(k.r+','+(e+1)))e++;
          if(e>k.c){xlAddMerge(doc,k.r,k.c,e);rec.m={r1:k.r,c1:k.c,r2:k.r,c2:e};rec.force=true;wr.push(rec);nMg++}else clip.push(xlAddr(k))}
        else clip.push(xlAddr(k))}}return}
    if(span||mx+1.2>60){rec.force=true;wr.push(rec);if(!span)bump(txtNeed,k.c,40);return}
    bump(txtNeed,k.c,mx+1.2)});
  /* Cột kiểu STT (chỉ số/chữ ngắn) đang rộng vô lý (vd 43 ký tự cho số 1–12) → thu về vừa đủ */
  const shrink=new Map();
  if(hd0){for(let c=S.minC;c<=S.maxC;c++){const w0=cur(c);if(!(w0>0))continue;
    let hNeed=0,hasH=false,run=0,dMax=0,ok=true;
    cells.forEach(k=>{if(k.c!==c||!k.has||inM.has(k.r+','+k.c))return;const m=mAt.get(k.r+','+k.c);if(m&&m.c2>m.c1)return;
      if(k.r>=hd0.a&&k.r<=hd0.b){const tx=k.text!=null?String(k.text):String(k.v);hasH=true;const fi=xlFont(X,k.s);hNeed=Math.max(hNeed,Math.max.apply(null,tx.split(/\s+/).map(xlWordW))*fi.k+1.6)}});
    for(let r=hd0.b+1;r<=S.maxR;r++){const k=cells.find(q=>q.r===r&&q.c===c&&q.has);if(!k)break;const tx=k.text!=null?String(k.text):String(k.v);
      if(tx.length>4||k.f){ok=false;break}run++;dMax=Math.max(dMax,tx.length*1+1.2)}
    if(!ok||!hasH||run<3)continue;
    const base=Math.max(5,dMax,hNeed),target=Math.ceil((base*1.25+1)*10)/10;
    if(w0>Math.max(target*2,target+8))shrink.set(c,target)}}
  const widths=new Map();let nShr=0;
  for(let c=S.minC;c<=S.maxC;c++){const w0=cur(c);if(!(w0>0))continue;
    const need=Math.max(Math.min(txtNeed.get(c)||0,60),Math.min(numNeed.get(c)||0,120),Math.min(wordNeed.get(c)||0,40));
    let w=Math.ceil(Math.max(w0,need)*10)/10;
    if(shrink.has(c)){w=Math.ceil(Math.max(shrink.get(c),need)*10)/10;if(w<w0-.05){widths.set(c,w);nShr++}continue}
    if(w>w0+.05)widths.set(c,w)}
  const fw=c=>widths.get(c)||cur(c),rowNeed=new Map();let nWrap=0;
  wr.forEach(o=>{const k=o.k,m=o.m;let av=0;if(m){for(let c=m.c1;c<=m.c2;c++)av+=fw(c)}else av=fw(k.c);
    const n=o.lines.reduce((a,l)=>a+Math.max(1,Math.ceil(l.length*o.fi.k*1.08/Math.max(1,av-1.2))),0),need=n*o.fi.sz*1.36;
    if(o.force){const ns=xlClone(X,k.s,'wrap',nx=>xlAlign(X,nx,{vertical:'center',wrapText:true}));if(ns!==k.s){k.ce.setAttribute('s',String(ns));nWrap++}}
    if(!m||m.r2===m.r1)rowNeed.set(k.r,Math.max(rowNeed.get(k.r)||0,need))});
  let nRow=0;
  rowNeed.forEach((need,r)=>{const ro=S.rows.get(r);if(!ro||ro.hid)return;const h0=ro.ht!=null?ro.ht:S.defH;
    if(need>h0+.5){ro.el.setAttribute('ht',Math.min(need,409).toFixed(2));ro.el.setAttribute('customHeight','1');nRow++}});
  if(widths.size)xlSetCols(doc,widths,S.maxC);
  rep.fix('Nới rộng cột bị ##### hoặc cắt chữ (cột)',widths.size-nShr);rep.fix('Thu hẹp cột STT/số thứ tự đang rộng quá mức (cột)',nShr);rep.fix('Bật tự xuống dòng cho ô chữ dài (ô)',nWrap);rep.fix('Tăng độ cao dòng để không cắt chữ (dòng)',nRow);rep.fix('Gộp ngang ô tiêu đề/ghi chú dài để không bị cắt khi in (ô)',nMg);
  if(widths.size-nShr)rep.notes.push(nm+'nới cột '+Array.from(widths.keys()).filter(c=>!shrink.has(c)).map(colName).join(', ')+'.');
  if(nShr)rep.notes.push(nm+'thu hẹp cột '+Array.from(shrink.keys()).filter(c=>widths.has(c)).map(colName).join(', ')+' (cột số thứ tự quá rộng).');
  if(clip.length)rep.warn(nm+'chữ ở ô '+xlList(clip)+' dài hơn vùng in nên sẽ bị cắt khi in — hãy gộp ô hoặc cho xuống dòng.')}

/* Dòng có hình/mũi tên: lấy danh sách dòng bị hình đè lên (để không dồn khoảng trắng đã chừa chỗ cho mũi tên) */
async function xlDrawRows(zip,shPath){
  const dir=shPath.replace(/[^\/]*$/,''),nm=shPath.slice(dir.length),rf=zip.file(dir+'_rels/'+nm+'.rels');
  if(!rf)return null;
  const rd=pX(await rf.async('string'),'rels');let dp=null;
  Array.from(rd.getElementsByTagName('Relationship')).forEach(r=>{if(/\/drawing$/i.test(r.getAttribute('Type')||''))dp=rs(dir,r.getAttribute('Target')||'')});
  const df=dp&&zip.file(dp);if(!df)return null;
  const dd=pX(await df.async('string'),dp),rows=new Set(),kid=(a,n)=>Array.from(a.children).find(c=>c.localName===n)||null,
    num=(a,n)=>{const e=kid(a,n);return e?parseInt(e.textContent,10):NaN};
  Array.from(dd.documentElement.children).forEach(an=>{const f=kid(an,'from'),t=kid(an,'to')||f;if(!f)return;
    const r1=num(f,'row'),r2=num(t,'row');if(isFinite(r1)&&isFinite(r2))for(let r=Math.min(r1,r2);r<=Math.max(r1,r2)&&r<=r1+60;r++)rows.add(r+1)});
  return{rows,path:dp,doc:dd}}
/* Khi đổi độ rộng cột, giữ hình/mũi tên ở đúng vị trí tuyệt đối trên trang (không bị trôi sang chỗ khác) */
function xlRemapAnchors(dd,oldW,newW){
  const E=9525,px=w=>Math.max(0,Math.round(w*7)),kid=(a,n)=>Array.from(a.children).find(c=>c.localName===n)||null;
  let diff=false;for(let c=1;c<=60;c++)if(px(oldW(c))!==px(newW(c))){diff=true;break}
  if(!diff)return{n:0,mv:0};
  const absX=(col,off)=>{let x=0;for(let c=1;c<=col;c++)x+=px(oldW(c));return x+off/E};
  const place=x=>{let c=1;while(c<400){const w=px(newW(c));if(x<w)break;x-=w;c++}return{col:c-1,off:Math.max(0,Math.round(x*E))}};
  const get=(pt)=>{const c=kid(pt,'col'),o=kid(pt,'colOff');return c&&o?{c:parseInt(c.textContent,10),o:parseInt(o.textContent,10),ce:c,oe:o}:null};
  let n=0,mv=0;
  Array.from(dd.documentElement.children).forEach(an=>{const f=kid(an,'from'),t=kid(an,'to'),a=f&&get(f);if(!a||!isFinite(a.c)||!isFinite(a.o))return;
    let x1=absX(a.c,a.o),b=t&&get(t),x2=b&&isFinite(b.c)&&isFinite(b.o)?absX(b.c,b.o):null;
    /* Vị trí đã vẽ (a:xfrm) lệch hẳn so với neo ô (thường do cột bị kéo rộng sau khi vẽ) → trả hình về đúng chỗ đã vẽ */
    const xf=an.getElementsByTagNameNS('*','xfrm')[0],xo=xf&&Array.from(xf.children).find(c=>c.localName==='off'),xe=xf&&Array.from(xf.children).find(c=>c.localName==='ext'),
      fx=xo?parseInt(xo.getAttribute('x'),10)/E:NaN,fw=xe?parseInt(xe.getAttribute('cx'),10)/E:NaN;
    if(isFinite(fx)&&isFinite(fw)&&fx>=0&&Math.abs(fx-x1)>25){x2=fx+fw;x1=fx;mv++}
    const np=place(x1);
    a.ce.textContent=String(np.col);a.oe.textContent=String(np.off);
    if(b){const q=place(x1+Math.max(0,x2-x1));b.ce.textContent=String(q.col);b.oe.textContent=String(q.off)}n++});
  return{n,mv}}
/* Ước lượng độ rộng chữ (đơn vị “ký tự số” của Excel): chữ HOA rộng hơn chữ thường, i/l/dấu câu hẹp hơn */
function xlWordW(s){let w=0;for(const ch of String(s))w+=(ch!==ch.toLowerCase())?1.2:/[iljtfr.,:;'!|()\/\-]/.test(ch)?.55:/\d/.test(ch)?1:.95;return w}
/* Làm sạch dữ liệu + kiểm tra một sheet */
function xlFixSheet(doc,sh,C){
  const xo=C.xo,rep=C.rep,X=C.X,SS=C.SS,nm='Sheet “'+sh.name+'”: ';
  if(xo.fmerge){const n=xlFixMerges(doc);if(n)rep.fix('Gỡ vùng gộp ô trùng/chồng nhau (nguyên nhân báo “file bị hỏng” khi mở Excel)',n)}
  if(xo.links&&C.ext){const n=xlBreakSheet(doc);if(n)rep.fix('Ngắt liên kết ngoài: đổi công thức trỏ sang file khác thành giá trị (ô)',n)}
  let cells=xlCollect(doc,SS);if(!cells.length)return;
  if(xo.clean){let n=0;cells.forEach(k=>{if(k.t==='inlineStr'){const is=s1(k.ce,'is');if(is&&xlCleanTs(xlTs(is),sh.dRows&&sh.dRows.has(k.r))){n++;k.text=xlTs(is).map(x=>x.textContent).join('')}}});
    if(n)rep.fix(C.cleanLbl,n)}
  const S0=xlScan(doc),hdr=xlHeader(S0),start=hdr?hdr.b+1:S0.minR+1,anch=new Map();
  S0.merges.forEach(m=>anch.set(m.r1+','+m.c1,m));
  const msp=k=>{const m=anch.get(k.r+','+k.c);return!!m&&m.c2>m.c1},col=new Map(),cs=c=>{let o=col.get(c);if(!o){o={num:0,dnum:0,tn:[],td:[],toth:0};col.set(c,o)}return o};
  cells.forEach(k=>{if(k.r<start||!k.has||msp(k))return;const o=cs(k.c);
    if(k.t==='n'&&k.v!==''){if(X&&xlIsDate(xlFmtCode(X,xlFont(X,k.s).nf)))o.dnum++;else o.num++;return}
    if((k.t==='s'||k.t==='inlineStr')&&!k.f){const tx=(k.text||'').trim();if(!tx)return;
      if(xlParseDate(tx)!==null)o.td.push(k);else if(xlParseNum(tx)!==null)o.tn.push(k);else o.toth++}});
  let nN=0,nD=0;const badD=[],leftD=[];
  col.forEach(o=>{const all=o.num+o.dnum+o.tn.length+o.td.length+o.toth;
    if(o.td.length&&xo.date&&X&&(o.td.length+o.dnum)>=.6*all){o.td.forEach(k=>{const d=xlParseDate(k.text.trim());if(d==='bad'){badD.push(xlAddr(k));return}xlToNum(k,d,X,'date');nD++})}
    else{o.td.forEach(k=>leftD.push(xlAddr(k)));
      if(o.tn.length&&xo.num&&(o.num+o.tn.length)>=.6*all){o.tn.forEach(k=>{xlToNum(k,xlParseNum(k.text.trim()),X,'num');nN++})}}});
  rep.fix('Đổi số lưu dạng văn bản (vd “8,5”) thành số thật (ô)',nN);rep.fix('Đổi ngày lưu dạng văn bản thành ngày thật dd/mm/yyyy (ô)',nD);
  if(badD.length)rep.warn(nm+'ngày không hợp lệ (vd 31/02) tại '+xlList(badD)+' — cần sửa tay.');
  if(leftD.length&&xo.check)rep.warn(nm+leftD.length+' ô ngày tháng đang là văn bản (không sắp xếp/lọc theo ngày được) tại '+xlList(leftD)+'.');
  /* công thức lỗi */
  let nW=0,nCl=0,nK=0;
  if(xo.err!=='off'){
    const elig=xo.err==='all'?XL_ERRS:['#DIV/0!','#N/A'],masters=new Map(),wrapped=new Map();
    cells.forEach(k=>{if(k.f&&k.f.getAttribute('t')==='shared'&&(k.f.textContent||'').trim())masters.set(k.f.getAttribute('si'),k.f)});
    const key=k=>{const f=k.f;if(!f)return null;const t=f.getAttribute('t');return t==='dataTable'?null:t==='shared'?'s'+f.getAttribute('si'):'c'+k.r+','+k.c};
    cells.forEach(k=>{if(k.t==='e'&&elig.indexOf(k.text)>=0){
      if(k.f){const g2=key(k);if(!g2||wrapped.has(g2))return;const f=g2[0]==='s'?masters.get(g2.slice(1)):k.f;
        if(!f||!(f.textContent||'').trim())return;wrapped.set(g2,f);
        const tx=f.textContent;if(!/^\s*IF(ERROR|NA)\s*\(/i.test(tx)){f.textContent='IFERROR('+tx+',"")';nW++}}
      else{k.ce.removeAttribute('t');sk(k.ce,'v').forEach(e=>k.ce.removeChild(e));k.t='n';k.v='';nK++}}});
    cells.forEach(k=>{if(k.t==='e'&&k.f){const g2=key(k);if(g2&&wrapped.has(g2)){k.ce.setAttribute('t','str');let v=s1(k.ce,'v');if(!v){v=mkS(doc,'v');k.ce.appendChild(v)}v.textContent='';k.t='str';k.v='';k.text='';nCl++}}})}
  rep.fix('Bọc IFERROR cho công thức lỗi #DIV/0! / #N/A để ô trống thay vì hiện lỗi (công thức)',nW);rep.fix('Xóa giá trị lỗi dán cứng (ô)',nK);
  if(nN||nD||nW||nCl)C.recalc=true;
  let nSt=0;
  if(nN||nD)cells.forEach(k=>{if(k.t==='e'&&k.f&&k.text==='#VALUE!'){k.ce.removeAttribute('t');sk(k.ce,'v').forEach(e=>k.ce.removeChild(e));k.t='n';k.v='';nSt++}});
  rep.fix('Xóa kết quả #VALUE! cũ do số/ngày dạng chữ — Excel tự tính lại khi mở (ô)',nSt);if(nSt)C.recalc=true;
  const left=cells.filter(k=>k.t==='e');
  if(left.length)rep.warn(nm+left.length+' ô còn hiện lỗi công thức ('+xlList(left.map(k=>xlAddr(k)+' '+k.text))+') — nguyên nhân thường là tham chiếu bị xóa (#REF!) hoặc sai tên hàm (#NAME?), cần sửa tay.');
  /* kiểm tra & cảnh báo */
  if(xo.check){
    const hT=new Map(),addT=(c,t)=>hT.set(c,(hT.get(c)||'')+' '+t);
    if(hdr)cells.forEach(k=>{if(k.r>=hdr.a&&k.r<=hdr.b&&k.text){const m=anch.get(k.r+','+k.c);if(m)for(let c=m.c1;c<=m.c2;c++)addT(c,k.text);else addT(k.c,k.text)}});
    const bad=[],rv=new Map();
    cells.forEach(k=>{if(k.r<start||!k.has||msp(k))return;
      if(k.t==='n'&&!k.f&&k.v!==''&&/đđg|đtb|điểm|diem/i.test(hT.get(k.c)||'')&&!(X&&xlIsDate(xlFmtCode(X,xlFont(X,k.s).nf)))){const v=+k.v;if(v<0||v>10)bad.push(xlAddr(k)+'='+v)}
      if(/^\s*(stt|tt|số\s*tt|số thứ tự)\s*$/i.test(hT.get(k.c)||''))return;
      const val=k.t==='s'||k.t==='inlineStr'||k.t==='str'?String(k.text||'').trim().toLowerCase():k.v;if(val==='')return;
      let a=rv.get(k.r);if(!a){a=[];rv.set(k.r,a)}a.push(k.c+':'+val)});
    if(bad.length)rep.warn(nm+'điểm nằm ngoài khoảng 0–10 tại '+xlList(bad)+' — kiểm tra lại số liệu.');
    const seen=new Map(),dup=[];Array.from(rv.keys()).sort((a,b)=>a-b).forEach(r=>{const a=rv.get(r);if(a.length<3)return;const k=a.join('|');if(seen.has(k))dup.push('dòng '+r+' = dòng '+seen.get(k));else seen.set(k,r)});
    if(dup.length)rep.warn(nm+'có dòng trùng nội dung hoàn toàn ('+xlList(dup)+') — kiểm tra có nhập trùng không.');
    let hr=0,hc=0;for(let r=S0.minR;r<=S0.maxR;r++){const ro=S0.rows.get(r);if(ro&&ro.hid&&ro.cnt)hr++}for(let c=S0.minC;c<=S0.maxC;c++)if(S0.colW(c)===0)hc++;
    if(hr||hc)rep.warn(nm+'đang ẩn '+(hr?hr+' dòng có dữ liệu':'')+(hr&&hc?' và ':'')+(hc?hc+' cột':'')+' — bản in sẽ không có phần này, bỏ ẩn nếu cần in.')}
  if(xo.border){const S1=xlScan(doc);xlBorders(doc,X,S1,xlHeader(S1),rep,nm)}
  if(xo.fit)xlFit(doc,X,SS,rep,nm)}
function xlBreakSheet(doc){const cells=xlCollect(doc,[]),sh=new Set();let n=0;
  const ext=k=>/\[\d+\]/.test(k.f.textContent||'');
  cells.forEach(k=>{if(k.f&&k.f.getAttribute('t')==='shared'&&(k.f.textContent||'').trim()&&ext(k))sh.add(k.f.getAttribute('si'))});
  cells.forEach(k=>{if(!k.f)return;if(ext(k)||(k.f.getAttribute('t')==='shared'&&sh.has(k.f.getAttribute('si')))){
    k.ce.removeChild(k.f);n++;
    if(k.t==='str'){const tx=k.v;sk(k.ce,'v').forEach(e=>k.ce.removeChild(e));const is=mkS(doc,'is'),t=mkS(doc,'t');t.textContent=tx;if(/^\s|\s$/.test(tx))t.setAttributeNS(XMLNS,'xml:space','preserve');is.appendChild(t);k.ce.appendChild(is);k.ce.setAttribute('t','inlineStr')}}});
  return n}
async function xlDropExt(zip,wbRoot,rlDoc){
  const er=s1(wbRoot,'externalReferences');if(er)wbRoot.removeChild(er);
  Array.from(rlDoc.getElementsByTagName('Relationship')).forEach(r=>{if(/externalLink$/i.test(r.getAttribute('Type')||''))r.parentNode.removeChild(r)});
  const dn=s1(wbRoot,'definedNames');if(dn){sk(dn,'definedName').forEach(e=>{if(/\[\d+\]/.test(e.textContent))dn.removeChild(e)});if(!sk(dn,'definedName').length)wbRoot.removeChild(dn)}
  Object.keys(zip.files).filter(n=>/^xl\/externalLinks\//.test(n)).forEach(n=>zip.remove(n));
  const cf=zip.file('[Content_Types].xml');
  if(cf){const ct=pX(await cf.async('string'),'[Content_Types].xml');Array.from(ct.getElementsByTagName('Override')).forEach(o=>{if(/^\/xl\/externalLinks\//.test(o.getAttribute('PartName')||''))o.parentNode.removeChild(o)});zip.file('[Content_Types].xml',ser(ct))}}
function xlFonts(X,sd,ssDoc,name,rep){
  const legacy=new Set();let n=0;
  sk(X.fonts,'font').forEach(fo=>{const ne=s1(fo,'name'),cur=ne&&ne.getAttribute('val');if(!cur)return;
    if(LEGACY_FONT.test(cur)){legacy.add(cur);return}
    if(!name||SYM.test(cur)||cur===name)return;
    ne.setAttribute('val',name);sk(fo,'charset').concat(sk(fo,'scheme')).forEach(e=>fo.removeChild(e));n++;X.dirty=true});
  if(name&&ssDoc)sk(ssDoc.documentElement,'si').forEach(si=>sk(si,'r').forEach(r=>{const pr=s1(r,'rPr'),rf=pr&&s1(pr,'rFont');
    if(rf&&!SYM.test(rf.getAttribute('val')||'')&&!LEGACY_FONT.test(rf.getAttribute('val')||'')&&rf.getAttribute('val')!==name){rf.setAttribute('val',name);n++}}));
  if(n)rep.fix('Thống nhất font chữ thành '+name+' (kiểu font)',n);
  if(legacy.size)rep.warn('File dùng font Việt cũ ('+Array.from(legacy).join(', ')+'): chữ có thể hiện sai dấu. Hãy chuyển mã sang Unicode (Unikey: Công cụ chuyển mã) rồi mới in.')}
function xlRecalc(wbDoc,wbRoot){let cp=s1(wbRoot,'calcPr');
  if(!cp){cp=wbDoc.createElementNS(SN,'calcPr');cp.setAttribute('calcId','191029');const ref=Array.from(wbRoot.children).find(c=>XL_AFTER_DN.indexOf(c.localName)>0)||null;wbRoot.insertBefore(cp,ref)}
  cp.setAttribute('fullCalcOnLoad','1')}
async function auditExcel(buf,xo,hooks){
  const rep=mkRep(),zip=await JSZip.loadAsync(buf),prog=hooks&&hooks.progress?hooks.progress:()=>{};
  const wbF=zip.file('xl/workbook.xml'),rlF=zip.file('xl/_rels/workbook.xml.rels');
  if(!wbF||!rlF)throw new Error('Không phải file .xlsx hợp lệ (thiếu xl/workbook.xml).');
  const wbDoc=pX(await wbF.async('string'),'workbook.xml'),wbRoot=wbDoc.documentElement,rlDoc=pX(await rlF.async('string'),'workbook.xml.rels'),rel={};
  Array.from(rlDoc.getElementsByTagName('Relationship')).forEach(r=>{rel[r.getAttribute('Id')]=r.getAttribute('Target')});
  const shs=sk(s1(wbRoot,'sheets'),'sheet').map((e,i)=>({i,name:e.getAttribute('name'),hidden:(e.getAttribute('state')||'visible')!=='visible',path:rs('xl/',rel[e.getAttributeNS(RN,'id')]||'')}));
  if(!shs.length)throw new Error('File Excel không có sheet nào.');
  let stDoc=null;const stF=zip.file('xl/styles.xml');if(stF)stDoc=pX(await stF.async('string'),'styles.xml');
  const X=stDoc?xlStyles(stDoc):null;
  const fixOn=!!(xo.clean||xo.num||xo.date||xo.err!=='off'||xo.fit||xo.border||xo.fmerge||xo.links||xo.check);
  const C={xo,rep,X,SS:[],recalc:false,ext:!!s1(wbRoot,'externalReferences'),cleanLbl:'Dọn khoảng trắng thừa, ký tự ẩn, chuẩn hóa dấu tiếng Việt (chuỗi văn bản)'};
  /* chuỗi dùng chung */
  const keepSS=new Set(),dInfo=new Map();
  for(const sh of shs){if(!/^xl\/worksheets\//.test(sh.path)||!zip.file(sh.path))continue;
    try{const di=await xlDrawRows(zip,sh.path);if(di&&di.rows.size){dInfo.set(sh.i,di);sh.dRows=di.rows;
      const d0=pX(await zip.file(sh.path).async('string'),sh.path);
      sk(s1(d0.documentElement,'sheetData'),'row').forEach(re=>{if(di.rows.has(+re.getAttribute('r')))sk(re,'c').forEach(ce=>{if(ce.getAttribute('t')==='s'){const v=s1(ce,'v');if(v)keepSS.add(+v.textContent)}})})}}catch(e){}}
  let ssDoc=null;const ssF=zip.file('xl/sharedStrings.xml');
  if(ssF){ssDoc=pX(await ssF.async('string'),'sharedStrings.xml');const sis=sk(ssDoc.documentElement,'si');let n=0;
    if(xo.clean)sis.forEach((si,ix)=>{if(xlCleanTs(xlTs(si),keepSS.has(ix)))n++});
    if(n)rep.fix(C.cleanLbl,n);C.ssDirty=n>0}
  if(X)xlFonts(X,stDoc,ssDoc,xo.font,rep);
  if(keepSS.size&&xo.clean)rep.notes.push('Dòng có mũi tên/hình vẽ: giữ nguyên khoảng cách giữa các từ (chỗ chừa cho hình), chỉ dọn khoảng trắng đầu/cuối ô.');
  if(C.ssDirty||(ssDoc&&xo.font))zip.file('xl/sharedStrings.xml',ser(ssDoc));
  if(ssDoc)C.SS=sk(ssDoc.documentElement,'si').map(si=>xlTs(si).map(t=>t.textContent).join(''));
  if(C.ext&&!xo.links)rep.warn('File có liên kết tới file Excel khác (Excel sẽ hỏi “Cập nhật liên kết” khi mở). Bật mục “Ngắt liên kết ngoài” để loại bỏ.');
  const vcCache=new Map();let done=0,stDirty=false;
  for(const sh of shs){
    prog('Sheet “'+sh.name+'” ('+(sh.i+1)+'/'+shs.length+')...');await tick();
    if(!/^xl\/worksheets\//.test(sh.path)||!zip.file(sh.path)){rep.notes.push('Sheet “'+sh.name+'”: không phải bảng tính (biểu đồ/macro) — bỏ qua.');continue}
    const orig=await zip.file(sh.path).async('string');let doc=pX(orig,sh.path);
    if(fixOn){try{xlFixSheet(doc,sh,C)}catch(e){doc=pX(orig,sh.path);rep.warn('Sheet “'+sh.name+'”: không làm sạch được dữ liệu ('+e.message+') — giữ nguyên nội dung, chỉ căn trang in.')}}
    zip.file(sh.path,ser(doc));
    if(sh.hidden){rep.notes.push('Sheet “'+sh.name+'”: đang ẩn — đã làm sạch dữ liệu, không căn trang in.');continue}
    let S=xlScan(doc);
    if(S.empty){rep.notes.push('Sheet “'+sh.name+'”: không có dữ liệu — bỏ qua.');continue}
    /* vùng in: tự xác định theo vùng có dữ liệu, hoặc giữ vùng in cũ */
    let area={r1:S.minR,c1:S.minC,r2:S.maxR,c2:S.maxC};
    if(!xo.area){const dn=sk(s1(wbRoot,'definedNames'),'definedName').find(e=>e.getAttribute('name')==='_xlnm.Print_Area'&&e.getAttribute('localSheetId')===String(sh.i));
      const m=dn&&/!\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/.exec(dn.textContent.trim());
      if(m)area={c1:colNum(m[1]),r1:+m[2],c2:colNum(m[3]),r2:+m[4]}}
    S.minR=area.r1;S.maxR=area.r2;S.minC=area.c1;S.maxC=area.c2;
    let sz=xlSize(S);if(!(sz.cw>0&&sz.ch>0)){rep.notes.push('Sheet “'+sh.name+'”: toàn bộ cột/dòng bị ẩn — bỏ qua.');continue}
    let hdr=xlHeader(S),plan=xlPlan(sz.cw,sz.ch,xo),spreadN=0;
    /* Bảng bị giới hạn bởi chiều CAO trang (còn thừa bề ngang): giãn đều các cột để bảng lấp đầy chiều ngang, lề trái/phải bằng lề đã chọn */
    if(xo.spread&&plan.one&&plan.sa<plan.sw-0.02){
      const target=plan.aw/plan.sa,el=[];let cwEl=0,cwFix=0;
      for(let c=area.c1;c<=area.c2;c++){const w=S.colW(c);if(!(w>0))continue;if(w>=9){el.push(c);cwEl+=w*7*0.75}else cwFix+=w*7*0.75}
      const g=el.length?(target*0.99-cwFix)/cwEl:1;
      if(g>1.04){const k=Math.min(g,1.6),nw=new Map();el.forEach(c=>{nw.set(c,Math.min(255,Math.round(S.colW(c)*k*10)/10))});
        xlSetCols(doc,nw,area.c2);S=xlScan(doc);S.minR=area.r1;S.maxR=area.r2;S.minC=area.c1;S.maxC=area.c2;
        sz=xlSize(S);hdr=xlHeader(S);plan=xlPlan(sz.cw,sz.ch,xo);spreadN=nw.size}}
    /* kéo giãn độ cao dòng để bảng lấp đầy trang (chỉ khi bảng vừa 1 trang và còn chỗ trống) */
    let stretched=0,addPt=0;
    if(xo.stretch&&plan.one&&stDoc){
      const start=hdr?hdr.b+1:S.minR,el=[];
      for(let r=start;r<=S.maxR;r++){const ro=S.rows.get(r);if(ro&&!ro.hid&&ro.cnt>0&&(ro.ht==null||ro.ht<=40))el.push(ro)}
      const room=plan.ah/plan.sw*0.965-sz.ch;
      if(el.length&&room>0){
        const avg=el.reduce((a,ro)=>a+(ro.ht!=null?ro.ht:S.defH),0)/el.length,add=Math.min(room/el.length,0.7*avg);
        if(add>=2){addPt=add;
          el.forEach(ro=>{ro.el.setAttribute('ht',((ro.ht!=null?ro.ht:S.defH)+add).toFixed(2));ro.el.setAttribute('customHeight','1');
            sk(ro.el,'c').forEach(ce=>{const s=parseInt(ce.getAttribute('s')||'0',10)||0,n=xlVC(stDoc,vcCache,s);if(n!==s){ce.setAttribute('s',String(n));stDirty=true}})});
          stretched=el.length;stDirty=true}}}
    if(xo.stretch&&stDoc){for(let r=hdr?hdr.b+1:S.minR;r<=S.maxR;r++){const ro=S.rows.get(r);   /* dòng cao (ô xuống dòng): căn giữa theo chiều dọc cho đồng đều */
      if(ro&&!ro.hid&&ro.cnt>0&&ro.ht!=null&&ro.ht>40)sk(ro.el,'c').forEach(ce=>{const s=parseInt(ce.getAttribute('s')||'0',10)||0,n=xlVC(stDoc,vcCache,s);if(n!==s){ce.setAttribute('s',String(n));stDirty=true}})}}
    xlSetPrint(doc,plan,xo,plan.one);
    if(dInfo.has(sh.i)){try{const di=dInfo.get(sh.i),oS=xlScan(pX(orig,sh.path)),nS=xlScan(doc);
      const rr=xlRemapAnchors(di.doc,oS.colW,nS.colW);if(rr.n){zip.file(di.path,ser(di.doc));rep.notes.push('Sheet “'+sh.name+'”: đã căn lại '+rr.n+' hình/mũi tên theo độ rộng cột mới'+(rr.mv?' (trả '+rr.mv+' hình về đúng chỗ đã vẽ ban đầu, vì neo ô bị lệch do cột từng bị kéo rộng)':'')+'.')}}catch(e){}}
    const a1='$'+colName(area.c1)+'$'+area.r1+':$'+colName(area.c2)+'$'+area.r2;
    xlDefName(wbRoot,wbDoc,sh.i,'Print_Area',qName(sh.name)+'!'+a1);
    const useT=xo.titles&&!plan.one&&hdr;
    xlDefName(wbRoot,wbDoc,sh.i,'Print_Titles',useT?qName(sh.name)+'!$'+hdr.a+':$'+hdr.b:null);
    zip.file(sh.path,ser(doc));done++;
    rep.fix('Đặt khổ A4, hướng in, lề, căn giữa trang');rep.fix('Đặt vùng in = vùng có dữ liệu');rep.fix('Co vừa 1 trang theo chiều rộng');
    if(spreadN)rep.fix('Giãn đều cột để bảng lấp đầy chiều ngang trang, lề trái/phải cân đối (cột)',spreadN);
    if(stretched)rep.fix('Tăng độ cao dòng bảng để lấp đầy trang (dòng)',stretched);
    if(useT)rep.fix('Lặp dòng tiêu đề bảng ở mỗi trang');
    if(xo.footer&&!plan.one)rep.fix('Thêm số trang “Trang x/y” ở chân trang');
    const pct=Math.round(plan.e*100);
    rep.notes.push('Sheet “'+sh.name+'”: vùng in '+colName(area.c1)+area.r1+':'+colName(area.c2)+area.r2+', A4 '+(plan.o==='landscape'?'ngang':'dọc')+', ước tính thu còn ~'+pct+'%, '+(plan.one?'vừa 1 trang':'khoảng '+plan.pages+' trang (rộng 1 trang'+(useT?', lặp dòng '+hdr.a+(hdr.b>hdr.a?'–'+hdr.b:''):'')+')')+(stretched?'; tăng độ cao '+stretched+' dòng thêm ~'+addPt.toFixed(1)+' pt':'')+'.');
    if(plan.e<0.6)rep.warn('Sheet “'+sh.name+'”: bảng rất rộng, chữ sau khi thu nhỏ còn ~'+pct+'% — có thể khó đọc. Cân nhắc ẩn bớt cột hoặc chọn in ngang.');
    if(S.drawing)rep.warn('Sheet “'+sh.name+'”: có hình/biểu đồ/ghi chú — công cụ chỉ tính theo ô dữ liệu, hãy xem lại bản xem trước khi in.')}
  if(!done&&!rep.f.size)throw new Error('Không có sheet nào cần/được phép xử lý.');
  if(xo.links&&C.ext){await xlDropExt(zip,wbRoot,rlDoc);zip.file('xl/_rels/workbook.xml.rels',ser(rlDoc));rep.fix('Gỡ khai báo liên kết ngoài khỏi workbook (không còn hỏi “Cập nhật liên kết”)')}
  if(C.recalc)xlRecalc(wbDoc,wbRoot);
  if(stDoc&&(stDirty||(X&&X.dirty)))zip.file('xl/styles.xml',ser(stDoc));
  zip.file('xl/workbook.xml',ser(wbDoc));
  if(window.XlsxChuan){try{const fx=await XlsxChuan.fixZip(zip);rep.fix('Đặt toàn bộ ô sang Times New Roman cỡ '+XlsxChuan.SIZE+' (font gốc: '+fx.from+'), tự co giãn cột/dòng',fx.fonts)}catch(e){rep.warn('Chưa đổi được font Times New Roman cỡ 14: '+e.message)}}else rep.warn('Chưa nạp được excel-chuan.js nên chưa đổi font Times New Roman cỡ 14.');
  const data=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
  if(C.recalc)rep.notes.push('Đã đặt “tính lại toàn bộ công thức khi mở”: Excel sẽ tự cập nhật ĐTB/tổng sau khi sửa số liệu (có thể hỏi lưu khi đóng — chọn Save).');
  rep.notes.push('Số liệu, công thức (trừ chỗ bọc IFERROR), cột/dòng ẩn được giữ nguyên. Thu phóng thực tế do Excel tính khi in (đã đặt “vừa 1 trang theo chiều rộng”), nên kiểm tra lại ở File → Print.');
  return{data,rep}}

/* ====================== GIAO DIỆN ====================== */
const cb=(id,t,on)=>'<label class="raC"><input type="checkbox" id="ra_'+id+'"'+(on?' checked':'')+'> '+t+'</label>';
const num=(id,v)=>'<input type="number" id="ra_'+id+'" value="'+v+'" min="0" max="100" step="1" style="width:60px">';
const MARGINS={compact:[14,12,25,12],exam:[15,15,30,15],admin:[20,20,30,15]};
function setMargins(k){const m=MARGINS[k];if(!m)return;['mt','mb','ml','mr'].forEach((id,i)=>{g('ra_'+id).value=m[i]})}
function buildUI(){
  if(g('wtAudit'))return;
  const st=document.createElement('style');
  st.textContent='#wtAudit .raG{border:1px solid rgba(128,128,128,.35);border-radius:10px;margin:8px 0;padding:6px 10px}#wtAudit summary{cursor:pointer;font-weight:600;padding:4px 0;display:list-item}#wtAudit details:not([open])>*:not(summary){display:none!important}#wtAudit .raC{display:block;margin:5px 0;font-size:14px;line-height:1.4}#wtAudit .raR{margin:5px 0;font-size:14px}#wtAudit .raRes{border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:14px}#wtAudit .raRes ul{margin:4px 0 4px 18px;padding:0}#wtAudit .raRes li{margin:2px 0}';
  document.head.appendChild(st);
  const d=document.createElement('div');d.className='wtool';d.id='wtAudit';
  d.innerHTML='<div class="note">Đưa file .docx lên → công cụ tự rà soát và sửa lỗi bố cục, định dạng, bảng, hình, công thức, đánh số… rồi xuất file mới kèm báo cáo (đã gồm cả chức năng Chuẩn hóa Word). <b>Mới:</b> đưa file <b>.xlsx</b> lên → tự sửa lỗi dữ liệu (số/ngày lưu dạng chữ, công thức lỗi, cột hẹp ####, thiếu viền…) rồi căn trang in sẵn sàng in (A4, hướng ngang/dọc, lề, vùng in, vừa trang); mục Excel bên dưới chỉ áp dụng cho file .xlsx. <b>File gốc không bị thay đổi.</b> File xuất ra được tự kiểm tra cấu trúc; nếu có nguy cơ lỗi, công cụ tự thử lại ở chế độ an toàn. Mặc định đã chọn các mục an toàn; mở từng nhóm để tinh chỉnh.</div>'
  +'<div class="bar"><button class="ghost sm" id="ra_preset" type="button">⚡ Chuẩn hóa nhanh: Times New Roman 14, A4, lề đề thi gọn 14/12/25/12</button></div>'
  +'<div class="bar"><input type="file" id="ra_in" accept=".docx,.xlsx" multiple style="display:none"><button class="ghost" id="ra_pick" type="button">📁 Chọn file .docx / .xlsx (nhiều file / kéo thả vào đây)</button><button class="sec sm" id="ra_clear" type="button">🗑 Xóa danh sách</button></div><div id="ra_list"></div>'
  +'<details class="raG"><summary>📝 Văn bản &amp; định dạng</summary>'
  +cb('text','Dọn khoảng trắng thừa, dấu cách trước dấu câu, ký tự ẩn, NBSP; chuẩn hóa dấu tiếng Việt (NFC)',1)+cb('indent','Bỏ Tab/dấu cách thụt đầu dòng thủ công',1)+cb('num','Đánh số lại “Câu/Bài” bị nhảy hoặc trùng (reset theo PHẦN/ĐỀ)',1)+cb('spell','Sửa lỗi chính tả thường gặp chắc chắn sai (vd “xác xuất”→“xác suất”, “bổ xung”→“bổ sung”, “xử dụng”→“sử dụng”)',1)+cb('unify','Thống nhất kiểu nhãn theo kiểu đa số: đáp án “A.” hay “A)”, nhãn “Câu 1.” hay “Câu 1:”',1)+cb('decimal','Đổi số thập phân 3.5 → 3,5 (bỏ qua số mục/hình/bảng, ngày tháng) — chỉ bật nếu tài liệu dùng dấu phẩy',0)+cb('cap','Tự viết hoa chữ đầu câu / đầu đoạn (chỉ khi chắc chắn; mặc định chỉ đánh dấu Comment)',0)+cb('quotes','Đổi ngoặc kép thẳng (") thành ngoặc kép cong “ ” khi mở/đóng đúng cặp',1)+cb('phead','Nhận diện tiêu đề không dùng style Heading (dòng ngắn in đậm hoặc IN HOA) để không căn đều/thụt dòng nhầm',1)
  +'<div class="raR">Font: <select id="ra_font"><option>Times New Roman</option><option>Arial</option><option>Calibri</option><option>Cambria</option><option value="">Giữ nguyên font</option></select> &nbsp; Cỡ chữ: <select id="ra_size"><option value="auto">Tự nhận diện</option><option value="12">12</option><option value="13">13</option><option value="14" selected>14</option></select></div>'
  +'<div class="raR">Giãn dòng: <select id="ra_line"><option value="1">1.0</option><option value="1.15" selected>1.15</option><option value="1.3">1.3</option><option value="1.5">1.5</option></select> &nbsp; Sau đoạn (pt): <select id="ra_after"><option value="0">0</option><option value="3">3</option><option value="6" selected>6</option><option value="8">8</option></select></div>'
  +cb('spacing','Đồng nhất giãn dòng và khoảng cách đoạn theo 2 giá trị trên (bỏ tick để giữ nguyên giãn dòng/khoảng cách của file gốc)',1)+cb('justify','Căn đều hai bên cho đoạn văn dài (không đụng tiêu đề, danh sách, bảng, đoạn căn giữa/phải)',1)+cb('firstLine','Thụt đầu dòng 1 cm cho đoạn văn thường (tắt nếu là đề trắc nghiệm)',0)+cb('shd','Gỡ nền (shading) lạ khi dán từ web',1)+cb('color','Gỡ màu chữ và tô sáng (tắt nếu có đáp án tô màu)',0)+'</details>'
  +'<details class="raG"><summary>📘 Giáo án (KHBD) &amp; công thức MathType</summary>'
  +cb('lpfix','Giáo án: gom tiêu đề bài bị tách nhiều đoạn (căn giữa, in đậm đồng nhất), ghép đoạn bị ngắt giữa câu, tách gạch đầu dòng nằm giữa đoạn, sửa đáp số cặp số sai khi phép thay số dưới đã cho biết đúng, bỏ “-” thừa ở đầu trang, bảng 2 cột vừa vùng chữ, giữ lề của giáo án gốc',1)
  +cb('mtconv','Đổi công thức MathType (đối tượng nhúng) sang Equation của Word để cùng font, cùng cỡ chữ với văn bản; công thức nào đọc không chắc chắn thì giữ nguyên',1)+'</details>'
  +'<details class="raG"><summary>✅ Trắc nghiệm (đề kiểm tra)</summary>'
  +cb('mcq','Tự căn đáp án A, B, C, D thẳng hàng, cách đều nhau (ngắn: 1 hàng 4 cột · vừa: 2 hàng × 2 cột · dài: mỗi đáp án 1 dòng); giữ câu hỏi đi cùng đáp án, không tách trang',1)
  +'<div class="raR">Kiểu xếp đáp án: <select id="ra_mcqmode"><option value="auto">Tự chọn theo độ dài đáp án</option><option value="two">Ưu tiên 2 × 2 (A B / C D)</option><option value="one">Mỗi đáp án một dòng</option></select></div>'
  +cb('mcqdot','Tự thêm dấu chấm (.) cuối mỗi đáp án A, B, C, D nếu còn thiếu',1)+cb('mcqstem','Bỏ thụt lề lệch của dòng “Câu n.” để các câu thẳng hàng với nhau (bỏ qua nếu bật “thụt đầu dòng 1 cm”)',1)+'</details>'
  +'<details class="raG"><summary>🛠 Sửa lỗi nội dung (giáo án, bài tập) — chỉ sửa khi tính được chắc chắn</summary>'
  +cb('fixdot','Xóa dấu chấm thừa gõ nhầm (vd “. Phương trình…” đầu đoạn, “B. .x – 2y”)',1)+cb('fixlbl','Thêm nhãn “Câu 1.” còn thiếu khi câu trắc nghiệm đầu tiên bị mất nhãn (phía sau đã là “Câu 2.”)',1)+cb('fixkey','Điền đáp án trắc nghiệm còn để trống khi tự tính được từ đề (phương trình bậc nhất hai ẩn); đáp án ghi sai chỉ gắn Comment',1)+cb('fixmath','Sửa kết quả sai dạng “… ta có x = …” / “… ta có y = …” bằng cách tính lại từ phương trình bậc nhất hai ẩn',1)+cb('fixcopy','Sửa câu chữ sao chép nhầm “hai HĐ” vào hoạt động trắc nghiệm không có HĐ nào',1)+cb('fixarith','Sửa kết quả phép tính số học sai dạng “4.2 + 3.(-1) = 5” (dấu “.” là nhân); đoạn có từ “sai/không đúng/phút/điểm…” chỉ gắn Comment',1)+cb('unum','Thống nhất dấu trừ (− – -) và số thập phân (0,5 / 0.5) theo kiểu đa số; bỏ qua chỗ dấu “.” có thể là dấu nhân',1)+'</details>'
  +'<details class="raG"><summary>📄 Trang, ngắt trang, tiêu đề</summary>'
  +cb('blank','Xóa dòng trống thừa và ngắt trang thừa (trang trắng)',1)+cb('keep','Giữ tiêu đề/câu hỏi/hình đi cùng đoạn sau; bỏ ràng buộc gây đẩy đoạn sang trang mới',1)+cb('softbreak','Bỏ ngắt trang cứng (Ctrl+Enter) đặt trước “PHẦN / Câu / Bài” để hết khoảng trống cuối trang (vẫn giữ ngắt trang trước ĐỀ / ĐÁP ÁN / MA TRẬN)',1)
  +cb('page','Đưa khổ giấy về A4 và lề chuẩn:',1)+'<div class="raR">Mẫu lề: <select id="ra_marg"><option value="compact" selected>Đề thi gọn (14/12/25/12 mm) — khuyên dùng</option><option value="exam">Đề thi (15/15/30/15 mm)</option><option value="admin">Văn bản hành chính (20/20/30/15 mm)</option><option value="custom">Tùy chỉnh</option></select> <span class="note" style="margin:0">(thứ tự: Trên/Dưới/Trái/Phải; trang khổ ngang luôn dùng lề hẹp 8/8/10/10 để bảng đủ chỗ)</span></div><div class="raR">Lề (mm): Trên '+num('mt',12)+' Dưới '+num('mb',12)+' Trái '+num('ml',20)+' Phải '+num('mr',12)+'</div>'
  +cb('fitpages','Giữ số trang đề thi (đề ghi “gồm N trang” → tự thu gọn cỡ chữ/giãn dòng trong đề cho vừa N trang)',1)+cb('pgnum','Giữ số trang liên tục (bỏ “bắt đầu lại số trang” ở section sau)',1)+cb('fields','Tự cập nhật mục lục khi mở file (nếu có mục lục)',1)+cb('compat','Tắt Compatibility Mode (file .doc cũ)',1)+'</details>'
  +'<details class="raG"><summary>📊 Bảng &amp; 🖼 Hình &amp; ∑ Công thức</summary>'
  +cb('tbl','Bảng: vừa lề, không cắt đôi hàng, lặp hàng tiêu đề, căn giữa ô ngắn, gỡ bảng trôi',1)+cb('tbljust','Bảng: ô hẹp (dưới ~5,6 cm) căn trái thay vì căn đều hai bên để hết giãn chữ',1)+cb('listfix','Danh sách a./b./c. tự động: căn lại thụt lề và khoảng cách sau nhãn cho đều nhau',1)+cb('tblkeep','Bảng nhỏ (dưới 1/5 trang): giữ nguyên cả bảng trên một trang. Bảng lớn vẫn được tách theo hàng để không chừa khoảng trống',1)+cb('tblborder','Thêm viền cho bảng nhiều hàng chưa có viền',0)+cb('onepage','Biểu mẫu/sổ vốn chỉ 1 trang: giữ nguyên trong 1 trang (nếu cần sẽ tự thu gọn giãn dòng, khoảng cách đoạn, cuối cùng là cỡ chữ, tối thiểu 12 pt)',1)+cb('forcesz','Ép mọi chữ nhỏ hơn cỡ đã chọn (vd 8–10 pt trong biểu mẫu/sổ) về đúng cỡ chữ đã chọn ở trên (không áp dụng khi chọn “Tự nhận diện”; không đụng chỉ số trên/dưới, tiêu đề)',1)+cb('tblfit','Bảng nhiều cột (sổ, biểu mẫu): dùng đúng cỡ chữ văn bản trong bảng và dàn độ rộng cột theo nội dung cho đủ chỗ ghi, vừa khổ giấy',1)
  +'<div class="raR">Chiều cao tối đa của hình/bản vẽ: <select id="ra_imgmax"><option value="0.4">40% trang (ít khoảng trống nhất)</option><option value="0.5" selected>50% trang</option><option value="0.65">65% trang</option><option value="0.95">Gần cả trang (kiểu cũ)</option></select></div>'+cb('imgInline','Hình: chuyển hình “trôi” KHÔNG bao quanh chữ thành hình cùng dòng (mặc định tắt — hình có chữ chạy quanh luôn được giữ nguyên vị trí)',0)+cb('imgFix','Hình: sửa méo, thu nhỏ hình tràn lề/ô bảng, căn giữa hình đứng riêng',1)
  +cb('latex','Công thức: chuyển LaTeX ($...$, \\(...\\), \\[...\\]) thành Equation của Word',1)+cb('mathsz','Công thức: đồng bộ font/cỡ chữ với văn bản',1)+'</details>'
  +'<details class="raG"><summary>📗 Excel (.xlsx): sửa lỗi &amp; căn trang in</summary>'
  +'<div class="note" style="margin:4px 0">Chỉ áp dụng cho file .xlsx. Số liệu hợp lệ được giữ nguyên; mã dài/số 0 đầu (mã định danh, SĐT) luôn giữ dạng chữ. Chỗ không chắc chắn chỉ cảnh báo trong báo cáo, không tự sửa.</div>'
  +'<div class="raR"><b>① Làm sạch &amp; sửa lỗi dữ liệu</b></div>'
  +cb('xclean','Dọn khoảng trắng thừa, dấu cách lạ (NBSP), ký tự ẩn; chuẩn hóa dấu tiếng Việt (NFC) để tìm kiếm/lọc/sắp xếp không sai',1)
  +cb('xnum','Đổi số đang lưu dạng chữ (vd “8,5”, “7.5”, “10”) thành số thật — để công thức tính đúng, hết lỗi #VALUE!',1)
  +cb('xdate','Đổi ngày đang lưu dạng chữ (vd “12/05/2010”) thành ngày thật, hiển thị dd/mm/yyyy',1)
  +'<div class="raR">Công thức đang hiện lỗi: <select id="ra_xerr"><option value="basic" selected>Chia cho 0 (#DIV/0!) và không tìm thấy (#N/A) → để ô trống</option><option value="all">Mọi loại lỗi → để ô trống</option><option value="off">Không sửa (chỉ cảnh báo)</option></select></div>'
  +cb('xmerge','Gỡ vùng gộp ô trùng/chồng nhau (nguyên nhân hay gặp của báo lỗi “file bị hỏng, cần sửa” khi mở Excel)',1)
  +cb('xlinks','Ngắt liên kết ngoài (công thức trỏ sang file khác → giá trị hiện có; hết hộp thoại “Cập nhật liên kết”)',0)
  +'<div class="raR">Font chữ: <select id="ra_xfont" disabled><option value="Times New Roman" selected>Times New Roman, cỡ 14 (luôn áp dụng)</option></select></div>'
  +cb('xcheck','Kiểm tra &amp; cảnh báo: điểm ngoài 0–10, dòng trùng, dòng/cột đang ẩn, ngày không hợp lệ, font Việt cũ',1)
  +'<div class="raR"><b>② Bố cục để in đẹp</b></div>'
  +cb('xfit','Nới cột bị ##### hoặc cắt chữ; ô chữ dài tự xuống dòng và tăng độ cao dòng',1)
  +cb('xborder','Bảng chưa có viền → kẻ viền, căn giữa dòng tiêu đề (bảng đã có viền thì giữ nguyên)',1)
  +cb('xfooter','Bảng in nhiều trang: thêm số trang “Trang x/y” ở chân trang',1)
  +'<div class="raR"><b>③ Trang in</b></div>'
  +'<div class="raR">Hướng giấy (A4): <select id="ra_xorient"><option value="auto">Tự chọn (ngang/dọc cho chữ lớn nhất)</option><option value="landscape">Luôn ngang</option><option value="portrait">Luôn dọc</option></select></div>'
  +'<div class="raR">Lề (mm): Trên '+num('xmt',15)+' Dưới '+num('xmb',15)+' Trái '+num('xml',15)+' Phải '+num('xmr',15)+'</div>'
  +cb('xarea','Tự đặt vùng in = vùng có dữ liệu (bỏ cột/dòng trống thừa; bỏ tick để giữ vùng in cũ nếu có)',1)
  +cb('xcenter','Căn giữa trang (ngang; bảng 1 trang thì căn giữa cả dọc)',1)
  +cb('xspread','Bảng vừa 1 trang nhưng còn thừa bề ngang: giãn đều các cột để bảng lấp đầy chiều ngang, bốn lề cân đối (cột STT/cột hẹp giữ nguyên)',1)
  +cb('xstretch','Bảng vừa 1 trang mà còn trống phía dưới: tăng nhẹ độ cao dòng dữ liệu để bảng lấp đầy trang và căn chữ giữa ô',1)
  +cb('xtitles','Bảng dài nhiều trang: lặp dòng tiêu đề bảng ở đầu mỗi trang',1)
  +'<div class="raR">Ép vừa 1 trang nếu chữ sau khi thu nhỏ còn từ: <select id="ra_xmin"><option value="0.6">60% trở lên</option><option value="0.7" selected>70% trở lên</option><option value="0.8">80% trở lên</option></select> (nhỏ hơn thì chia nhiều trang, mỗi trang vẫn đủ cột)</div></details>'
  +'<details class="raG"><summary>🔎 Kiểm tra &amp; đánh dấu</summary>'
  +cb('mark','Đánh dấu bằng Comment tại chỗ cần kiểm tra tay (nghi gõ sai, ngoặc/ngoặc kép lệch, thiếu dấu chấm cuối, viết hoa, dấu câu lạ…)',1)
  +cb('hl','Tô màu đúng cụm chữ lỗi (đỏ: lỗi chắc chắn · vàng: nghi ngờ · lục lam: gợi ý) và neo Comment đúng chỗ đó — tắt thì Comment gắn cả đoạn',1)
  +cb('verify','Kiểm lại nhiều vòng: chạy lại rà soát trên file kết quả cho tới khi không còn lỗi tự sửa được',1)
  +cb('track','Ghi sửa đổi chữ/dấu câu dưới dạng Track Changes (duyệt từng chỗ trong Word)',0)
  +cb('dry','<b>Chỉ kiểm tra, KHÔNG sửa gì</b>: chỉ gắn Comment tại chỗ có lỗi (kể cả chỗ sẽ được tự sửa) và lập báo cáo',0)
  +'<div class="raR"><b>Mức cảnh báo cần hiển thị</b> (đỏ = lỗi chắc chắn · vàng = nghi ngờ · lục lam = gợi ý):</div>'
  +cb('s_err','LỖI chắc chắn: số câu trùng, điểm không khớp, đáp án trùng/sai nhãn, mã LaTeX còn sót…',1)+cb('s_sus','NGHI NGỜ (cần người xem): gõ sai, ngoặc lệch, không thống nhất, thiếu đáp án, hình/bảng nhắc mà không có…',1)+cb('s_sug','GỢI Ý (không bắt buộc): thiếu dấu chấm cuối câu, ký hiệu toán gõ chữ… — tắt nếu tổ trưởng không cần',1)
  +cb('meta','Xóa thông tin cá nhân trong thuộc tính file (tác giả, người sửa cuối, đơn vị) — nên bật khi gửi đề thi',0)
  +'<details class="raG" style="margin-left:6px"><summary>Chọn loại lỗi cần đánh dấu</summary>'
  +cb('l_typo','Nghi gõ sai/thiếu dấu (kiểm tra âm tiết tiếng Việt)',1)+cb('l_dup','Lặp từ liền nhau',1)+cb('l_bracket','Ngoặc ( ) [ ] không cân',1)+cb('l_quote','Ngoặc kép không cân',1)
  +cb('l_dollar','Dấu $ lẻ (LaTeX chưa đóng)',1)+cb('l_punct','Dấu câu liền nhau bất thường',1)+cb('l_lower','Đoạn bắt đầu bằng chữ thường',1)+cb('l_mid','Chữ thường sau dấu kết câu',1)+cb('l_struct','Cấu trúc & ngữ nghĩa: đáp án thiếu/lặp/trùng nội dung, số câu nhảy hoặc trùng, số câu–điểm ở tiêu đề không khớp, nhắc “hình/bảng sau” nhưng không có, mã LaTeX hoặc công thức gõ chữ còn sót, ô giữ chỗ chưa điền, “Câu n” dính giữa đoạn',1)+cb('l_noend','Câu chưa có dấu chấm cuối câu (tự luận…) — chỉ gợi ý bằng Comment, không tự sửa',1)
  +cb('l_pts','Đối chiếu điểm: các câu cộng lại có bằng điểm của Phần; các Phần cộng lại có đủ tổng điểm không',1)
  +cb('l_key','Đối chiếu đáp án: câu trắc nghiệm nào chưa có đáp án, đáp án thừa, một câu ghi hai đáp án',1)
  +cb('l_xref','Tham chiếu chéo: chú thích Hình/Bảng nhảy số hoặc trùng; nhắc Hình/Bảng/“câu n” không tồn tại',1)+cb('l_khbd','Kế hoạch bài dạy: cộng thời gian (n phút) so với 45 phút/tiết, mục A–D = tổng các HĐ, cấu trúc CV 5512 (mục I/II/III, thứ tự A–B–C–D, 4 bước), đầu trang còn dở / thiếu ngày soạn, tuần',1)+cb('l_fmiss','Công thức/hình bị mất (vd “( hoặc )”, “tại và”) khi không còn ảnh hoặc Equation',1)
  +'<div class="raR"><b>Quy ước trình bày của trường</b> (chọn để công cụ không báo nhầm):</div>'
  +cb('c_colon','Kiểm tra dấu “:” cuối tiêu đề Phần',1)+'<div class="raR">Quy ước: <select id="ra_conv_colon"><option value="auto">Theo đa số trong đề</option><option value="has">Luôn có dấu “:”</option><option value="none">Luôn không có dấu “:”</option></select></div>'
  +cb('c_unit','Kiểm tra đơn vị điểm “(điểm)” / “(đ)”',1)+'<div class="raR">Quy ước: <select id="ra_conv_unit"><option value="auto">Theo đa số trong đề</option><option value="diem">Luôn “(điểm)”</option><option value="d">Luôn “(đ)”</option></select></div>'
  +cb('c_ky','Kiểm tra “kì” / “kỳ”',1)+cb('c_ki','Kiểm tra “kĩ” / “kỹ”',1)+'</details></details>'
  +'<details class="raG"><summary>🤖 AI &amp; xử lý nâng cao</summary>'
  +cb('ai','AI (Gemini) soát chính tả/dấu/gõ nhầm — chỉ gửi chữ, <b>không gửi công thức/hình</b>; có thể mất vài phút',0)
  +'<div class="raR">Model: <select id="ra_model"><option value="">Tự động — ưu tiên Lite, rồi Flash, rồi Pro</option>'+MODELS.map(m=>'<option value="'+m[0]+'">'+m[1]+'</option>').join('')+'</select> <span class="note" style="margin:0">(dùng key Gemini đã nhập ở đầu trang)</span></div>'
  +'<div class="raR">Model thẩm định kép: <select id="ra_modelv"><option value="">Giống model rà soát</option>'+MODELS.map(m=>'<option value="'+m[0]+'">'+m[1]+'</option>').join('')+'</select></div>'
  +'<div class="raR">Cách áp dụng: <select id="ra_aimode"><option value="apply">Tự sửa lỗi chắc chắn, gợi ý còn lại ghi vào Comment</option><option value="comment">Chỉ ghi gợi ý vào Comment, không tự sửa</option></select></div>'
  +cb('aiexam','<b>AI rà soát đề thi toàn diện</b> (kiến thức, đáp án, logic, ngôn ngữ, hình thức, điểm số → ghi các lỗi và gợi ý sửa vào báo cáo .txt). <b>Tự chạy khi đã nhập key Gemini</b>; chưa có key thì công cụ vẫn rà soát và xuất Word bình thường. Chỉ gửi chữ/công thức, không gửi hình',1)
  +cb('aicmt','Ghi lỗi AI thành <b>Comment ngay tại câu</b> trong file Word (ngoài báo cáo .txt)',1)
  +'<div class="raR">Lớp/môn: <select id="ra_aigrade"><option value="auto">Tự nhận diện</option>'+['Toán 6','Toán 7','Toán 8','Toán 9','Toán 9 (ôn thi vào lớp 10)','Công nghệ 7','Công nghệ 8','Môn khác'].map(x=>'<option>'+x+'</option>').join('')+'</select> &nbsp; Dạng đề: <select id="ra_aikind"><option value="auto">Tự nhận diện</option><option>Trắc nghiệm</option><option>Tự luận</option><option>Trắc nghiệm + tự luận</option></select></div>'
  +cb('aiverify','Thẩm định kép: một lượt AI khác tự giải lại từng lỗi để loại báo nhầm (chính xác hơn, chậm hơn ~1,5–2 lần)',1)
  +'<div class="raR">Thông tin bổ sung cho AI (không bắt buộc): <textarea id="ra_aiinfo" rows="2" style="width:100%;box-sizing:border-box" placeholder="Môn, lớp, chương trình, thời gian, thang điểm, đáp án, ma trận/đặc tả..."></textarea></div>'
  +cb('accept','Chấp nhận toàn bộ Track Changes (không thể hoàn tác trong file xuất)',0)+cb('nocmt','Xóa toàn bộ ghi chú (Comment)',0)+'</details>'
  +'<div class="bar"><label class="note" style="margin:0"><input type="checkbox" id="ra_zip" checked> Nhiều file → nén .zip</label><label class="note" style="margin:0"><input type="checkbox" id="ra_pdf"> Xuất thêm PDF (bản xem nhanh)</label><button class="green" id="ra_run" type="button">🔍 Rà soát &amp; Xuất file hoàn thiện</button></div>'
  +'<div id="ra_st" class="status"></div><div id="ra_out"></div>';
  const tools=Array.from(t3.querySelectorAll('.wtool')),last=tools[tools.length-1];
  if(last)last.insertAdjacentElement('afterend',d);else t3.appendChild(d);
  const op=document.createElement('option');op.value='wtAudit';op.textContent='🔍 Rà soát & Chuẩn hóa toàn diện';sel.insertBefore(op,sel.options[1]||null);
  wire();
  const closeAll=()=>d.querySelectorAll('details').forEach(x=>{x.open=false;x.removeAttribute('open')});
  closeAll();setTimeout(closeAll,0);setTimeout(closeAll,600);
  sel.addEventListener('change',()=>{if(sel.value==='wtAudit')closeAll()})}

const q=[];
const fsz=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(1)+' MB';
function setSt(m,k){const e=g('ra_st');e.textContent=m;e.className='status'+(k==='e'?' err':k==='o'?' ok':' info')}
function renderList(){g('ra_list').innerHTML=q.map((f,i)=>'<div class="frow"><span>📄</span><span class="fnm" title="'+hx(f.name)+'">'+hx(f.name)+'</span><span class="fsz">'+fsz(f.size)+'</span><button class="sec sm" type="button" data-i="'+i+'">✕</button></div>').join('')}
async function addFiles(list){const bad=[];
  for(const f of Array.from(list)){if(!/\.(docx|xlsx)$/i.test(f.name)){bad.push(/\.doc$/i.test(f.name)?f.name+' (file .doc cũ — hãy mở bằng Word, Save As → .docx)':/\.xls$/i.test(f.name)?f.name+' (file .xls cũ — hãy mở bằng Excel, Save As → .xlsx)':f.name+' (không phải .docx/.xlsx)');continue}
    if(q.some(x=>x.name===f.name&&x.size===f.size))continue;q.push({name:f.name,size:f.size,buf:await f.arrayBuffer()})}
  renderList();setSt(bad.length?'Bỏ qua: '+bad.join('; '):(q.length?'Đã chọn '+q.length+' file, sẵn sàng rà soát.':''),bad.length?'e':'')}
function readOpts(){
  const c=id=>g('ra_'+id).checked,v=id=>g('ra_'+id).value,n=id=>parseFloat(String(v(id)).replace(',','.'));
  const o={text:c('text'),indent:c('indent'),num:c('num'),font:v('font'),size:v('size'),line:+v('line'),after:+v('after'),spacing:c('spacing'),justify:c('justify'),firstLine:c('firstLine'),shd:c('shd'),color:c('color'),
    blank:c('blank'),keep:c('keep'),page:c('page'),mt:n('mt'),mb:n('mb'),ml:n('ml'),mr:n('mr'),pgnum:c('pgnum'),fitPages:c('fitpages'),fields:c('fields'),compat:c('compat'),
    tbl:c('tbl'),tblfit:c('tblfit'),forcesz:c('forcesz'),onepage:c('onepage'),tblborder:c('tblborder'),tblkeep:c('tblkeep'),tbljust:c('tbljust'),listfix:c('listfix'),softbreak:c('softbreak'),imgMaxH:+v('imgmax'),mcq:c('mcq'),mcqMode:v('mcqmode'),mcqStem:c('mcqstem'),mcqDot:c('mcqdot'),imgInline:c('imgInline'),imgFix:c('imgFix'),latex:c('latex'),mathsz:c('mathsz'),ai:c('ai'),aiExam:c('aiexam'),aiVerify:c('aiverify'),aiInfo:v('aiinfo'),aiModel:v('model'),aiModelV:v('modelv'),aiComment:c('aicmt'),aiGrade:v('aigrade'),aiKind:v('aikind'),accept:c('accept'),nocmt:c('nocmt'),quotes:c('quotes'),phead:c('phead'),mark:c('mark'),hl:c('hl'),verify:c('verify'),track:c('track'),aiMode:v('aimode'),spell:c('spell'),unify:c('unify'),decimal:c('decimal')?'comma':'',cap:c('cap'),dry:c('dry'),fixdot:c('fixdot'),fixlbl:c('fixlbl'),fixkey:c('fixkey'),fixmath:c('fixmath'),fixcopy:c('fixcopy'),fixarith:c('fixarith'),unum:c('unum'),lpfix:c('lpfix'),mtconv:c('mtconv'),
    lintOff:{typo:!c('l_typo'),dup:!c('l_dup'),bracket:!c('l_bracket'),quote:!c('l_quote'),dollar:!c('l_dollar'),punct:!c('l_punct'),lower:!c('l_lower'),mid:!c('l_mid'),noend:!c('l_noend'),struct:!c('l_struct'),khbd:!c('l_khbd'),fmiss:!c('l_fmiss'),pts:!c('l_pts'),key:!c('l_key'),xref:!c('l_xref'),c_colon:!c('c_colon'),c_unit:!c('c_unit'),c_ky:!c('c_ky'),c_ki:!c('c_ki')},
    sevOn:{1:c('s_err'),2:c('s_sus'),3:c('s_sug')},conv:{colon:v('conv_colon'),unit:v('conv_unit')},meta:c('meta')};
  if([o.mt,o.mb,o.ml,o.mr].some(x=>!isFinite(x)||x<0||x>100)||o.ml+o.mr>=150||o.mt+o.mb>=200)throw new Error('Lề không hợp lệ (0–100 mm; trái+phải < 150, trên+dưới < 200).');
  return o}
function readXlOpts(){
  const c=id=>g('ra_'+id).checked,n=id=>parseFloat(String(g('ra_'+id).value).replace(',','.'));
  const o={orient:g('ra_xorient').value,mt:n('xmt'),mb:n('xmb'),ml:n('xml'),mr:n('xmr'),area:c('xarea'),center:c('xcenter'),stretch:c('xstretch'),spread:c('xspread'),titles:c('xtitles'),minScale:n('xmin'),
    clean:c('xclean'),num:c('xnum'),date:c('xdate'),err:g('ra_xerr').value,fmerge:c('xmerge'),links:c('xlinks'),font:g('ra_xfont').value,check:c('xcheck'),fit:c('xfit'),border:c('xborder'),footer:c('xfooter')};
  if([o.mt,o.mb,o.ml,o.mr].some(x=>!isFinite(x)||x<0||x>100)||o.ml+o.mr>=150||o.mt+o.mb>=150)throw new Error('Lề Excel không hợp lệ (0–100 mm; trái+phải < 150, trên+dưới < 150).');
  return o}
const MD='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function save(name,data,mime){const b=new Blob([data],{type:mime});if(typeof saveBlob==='function')return saveBlob(b,name);
  const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
async function run(){
  const out=g('ra_out'),btn=g('ra_run');out.innerHTML='';
  if(!q.length)return setSt('Chưa chọn file .docx/.xlsx nào.','e');
  if(typeof JSZip==='undefined')return setSt('Chưa tải được thư viện JSZip (cần mạng để tải từ cdnjs).','e');
  let o,xo=null;try{o=readOpts();if(q.some(x=>/\.xlsx$/i.test(x.name)))xo=readXlOpts()}catch(e){return setSt(e.message,'e')}
  const autoM=!o.aiModel;   /* để trống = tự động: Lite → Flash → Pro, tự chuyển khi model lỗi */
  btn.disabled=true;const res=[];let ok=0;
  for(let k=0;k<q.length;k++){const f=q[k],pre='('+(k+1)+'/'+q.length+') '+f.name+': ';
    const card=document.createElement('div');card.className='raRes';
    try{
      if(/\.xlsx$/i.test(f.name)){
        if(!xo)xo=readXlOpts();
        const r=await auditExcel(f.buf,xo,{progress:m=>setSt(pre+m)});
        const base=f.name.replace(/\.xlsx$/i,'')+'_hoanthien',rt=reportText(f.name,r.rep),total=Array.from(r.rep.f.values()).reduce((a,b)=>a+b,0),rb=new TextEncoder().encode('\ufeff'+rt);
        res.push({name:base+'.xlsx',data:r.data,mime:XL_MIME},{name:base+'_baocao.txt',data:rb,mime:'text/plain'});ok++;
        let h='✅ <b>'+hx(f.name)+'</b> — đã sửa <b>'+total+'</b> chỗ và căn trang in Excel';
        if(r.rep.f.size)h+='<ul>'+Array.from(r.rep.f).map(([t,n])=>'<li>'+hx(t)+': <b>'+n+'</b></li>').join('')+'</ul>';
        if(r.rep.notes.length)h+='<ul>'+r.rep.notes.slice(0,12).map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul>';
        if(r.rep.w.length)h+='<div>⚠ <b>Cần kiểm tra tay:</b><ul>'+r.rep.w.map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul></div>';
        card.innerHTML=h;
        [[base+'.xlsx',r.data,XL_MIME,'⬇ Tải file Excel hoàn thiện (sẵn sàng in)','green sm'],[base+'_baocao.txt',rb,'text/plain','📋 Báo cáo (.txt)','sec sm']].forEach(a=>{
          const b=document.createElement('button');b.type='button';b.className=a[4];b.textContent=a[3];b.onclick=()=>save(a[0],a[1],a[2]);card.appendChild(b);card.appendChild(document.createTextNode(' '))});
      }else{
      USED.clear();
      const r=await audit(f.buf,o,{progress:m=>setSt(pre+m)});
      if(window.WordDeThiFix&&o.examFix!==false){setSt(pre+'Sửa lỗi riêng của đề thi (đáp án, phiếu trả lời, ngắt trang)...');
        try{r.data=await WordDeThiFix.apply(r.data,r.rep,{fitPages:o.fitPages!==false})}catch(e){r.rep.warn('Bước sửa lỗi đề thi gặp lỗi và đã bỏ qua: '+e.message)}}
      let aiR=null;
      if(o.aiExam){try{aiR=await aiExamReview(r.data,o,{progress:m=>setSt(pre+m)},r.rep)}catch(e){r.rep.warn('AI rà soát đề gặp lỗi và đã bỏ qua: '+e.message)}
        if(aiR){r.rep.ai=aiR;if(aiR.data)r.data=aiR.data}}
      if(o.ai||o.aiExam)r.rep.notes.push('Model AI đã dùng'+(autoM?' (tự động, ưu tiên Lite → Flash → Pro)':'')+': '+(Array.from(USED).join(', ')||'chưa gọi được model nào'));
      const base=f.name.replace(/\.docx$/i,'')+'_rasoat',rt=reportText(f.name,r.rep),total=Array.from(r.rep.f.values()).reduce((a,b)=>a+b,0);
      let pdf=null;
      if(g('ra_pdf').checked){try{
        if(typeof docxToBlocks!=='function'||typeof blocksToPdfBytes!=='function')throw new Error('thiếu mô-đun xuất PDF');
        const z=await JSZip.loadAsync(r.data),dx=await z.file('word/document.xml').async('string');
        pdf=await blocksToPdfBytes(docxToBlocks(dx).blocks,(p,n)=>setSt(pre+'Đang tạo PDF, trang '+p+'/'+n+'...'));
      }catch(e){r.rep.warn('Không tạo được PDF: '+e.message+' (file Word vẫn xuất bình thường).')}}
      res.push({name:base+'.docx',data:r.data,mime:MD},{name:base+'_baocao.txt',data:new TextEncoder().encode('\ufeff'+rt),mime:'text/plain'});
      if(pdf)res.push({name:base+'.pdf',data:pdf,mime:'application/pdf'});
      let rdx=null;try{rdx=await reportDocx(f.name,r.rep)}catch(e){r.rep.warn('Không tạo được biên bản Word: '+e.message)}
      if(rdx)res.push({name:base+'_bienban.docx',data:rdx,mime:MD});
      ok++;
      let h='✅ <b>'+hx(f.name)+'</b> — đã sửa <b>'+total+'</b> chỗ ('+r.rep.f.size+' nhóm lỗi)';
      if(r.rep.f.size)h+='<ul>'+Array.from(r.rep.f).map(([t,n])=>'<li>'+hx(t)+': <b>'+n+'</b></li>').join('')+'</ul>';
      if(r.rep.notes.length)h+='<div class="note" style="margin:4px 0">'+r.rep.notes.slice(0,8).map(hx).join('<br>')+(r.rep.notes.length>8?'<br>… (xem đủ trong báo cáo .txt)':'')+'</div>';
      if(r.rep.lint&&r.rep.lint.length)h+='<div>📝 <b>'+r.rep.lint.length+' đoạn đã được đánh dấu Comment trong file Word</b> (chi tiết đầy đủ trong báo cáo .txt):<ul>'+r.rep.lint.slice(0,6).map(x=>'<li>Đoạn '+x.n+' “'+hx(x.snip)+'”: '+hx(x.issues.join('; '))+'</li>').join('')+(r.rep.lint.length>6?'<li>…</li>':'')+'</ul></div>';
      if(r.rep.changes&&r.rep.changes.length)h+='<div class="note" style="margin:4px 0">🧾 Báo cáo .txt có <b>nhật ký thay đổi trước → sau</b> của '+r.rep.changes.length+' đoạn để bạn đối chiếu.</div>';
      if(aiR)h+='<div>🤖 <b>AI đã rà soát đề thi</b>: '+aiR.d.loi.length+' lỗi đề xuất, '+aiR.d.canxacminh.length+' mục cần xác minh'+(aiR.ncmt?', đã ghi '+aiR.ncmt+' Comment tại câu trong file Word':'')+' — xem trong báo cáo .txt (bảng “Nội dung cần chú ý”).</div>';
      if(r.rep.w.length)h+='<div>⚠ <b>Cần kiểm tra tay:</b><ul>'+r.rep.w.map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul></div>';
      card.innerHTML=h;
      [[base+'.docx',r.data,MD,'⬇ Tải file Word đã rà soát','green sm'],].concat(pdf?[[base+'.pdf',pdf,'application/pdf','⬇ PDF (xem nhanh)','sec sm']]:[]).concat(rdx?[[base+'_bienban.docx',rdx,MD,'📄 Biên bản rà soát (.docx)','sec sm']]:[]).concat([[base+'_baocao.txt',new TextEncoder().encode('\ufeff'+rt),'text/plain','📋 Báo cáo (.txt)','sec sm']]).forEach(a=>{
        const b=document.createElement('button');b.type='button';b.className=a[4];b.textContent=a[3];b.onclick=()=>save(a[0],a[1],a[2]);card.appendChild(b);card.appendChild(document.createTextNode(' '))})
      }
    }catch(e){card.innerHTML='❌ <b>'+hx(f.name)+'</b>: bỏ qua — '+hx(e.message)}
    out.appendChild(card);await tick()}
  if(res.length>4&&g('ra_zip').checked&&typeof makeZip==='function'){const b=document.createElement('button');b.type='button';b.className='green';b.textContent='📦 Tải gộp tất cả (.zip)';
    b.onclick=()=>save('ra-soat-word.zip',makeZip(res.map(r=>({name:r.name,data:r.data}))),'application/zip');out.appendChild(b)}
  btn.disabled=false;setSt('['+VERSION+'] Xong: '+ok+'/'+q.length+' file. '+(q.every(x=>/\.xlsx$/i.test(x.name))?'Mở file Excel kết quả, xem trước ở File → Print rồi in.':'Hãy mở file kết quả bằng Word, bấm Ctrl+A rồi F9 nếu có mục lục/số trang cần cập nhật.'),ok?'o':'e')}
function wire(){
  g('ra_pick').onclick=()=>g('ra_in').click();
  g('ra_in').onchange=e=>{const f=Array.from(e.target.files||[]);e.target.value='';if(f.length)addFiles(f)};
  g('ra_list').onclick=e=>{const b=e.target.closest('button');if(b){q.splice(+b.dataset.i,1);renderList()}};
  g('ra_clear').onclick=()=>{q.length=0;renderList();g('ra_out').innerHTML='';setSt('')};
  ['dragover','drop'].forEach(ev=>g('wtAudit').addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'&&e.dataTransfer)addFiles(e.dataTransfer.files)}));
  g('ra_preset').onclick=()=>{
    g('ra_font').value='Times New Roman';g('ra_size').value='14';g('ra_line').value='1.15';g('ra_after').value='6';
    ['justify','page','text','indent','num','tbl','tblfit','forcesz','onepage','tblkeep','softbreak','mcq','mcqdot','mcqstem','imgFix','quotes','phead','mark','hl','verify','spell','unify','fixdot','fixlbl','fixkey','fixmath','fixcopy','fixarith','unum','lpfix','mtconv'].forEach(k=>g('ra_'+k).checked=true);
    g('ra_dry').checked=false;g('ra_firstLine').checked=false;
    g('ra_marg').value='compact';setMargins('compact');
    setSt('Đã đặt: Times New Roman 14pt, giãn dòng 1,15, căn đều, không thụt đầu dòng, A4, lề đề thi gọn 14/12/25/12 mm (khổ ngang: 8/8/10/10 mm), bảng dùng cỡ chữ chuẩn. Bấm “Rà soát & Xuất file” để chạy.','o')};
  g('ra_marg').onchange=e=>{if(e.target.value!=='custom')setMargins(e.target.value)};
  ['mt','mb','ml','mr'].forEach(id=>g('ra_'+id).addEventListener('input',()=>{const cur=['mt','mb','ml','mr'].map(i=>+g('ra_'+i).value).join(),hit=Object.keys(MARGINS).find(k=>MARGINS[k].join()===cur);g('ra_marg').value=hit||'custom'}));
  g('ra_run').onclick=run}
window.RaSoatWord={audit,auditExcel,reportText,reportDocx,readOpts,version:VERSION,_t:{solveMcq,arithScan,lnParse,docxToParas,structHints,evHit,ommlTex,aiExamReview,geminiJSON,answerKeyText}};
buildUI();
})();
