/* Công cụ Word · "Chuyển đổi định dạng" (không dùng AI) — đọc được cả công thức MathType (OLE/MTEF) lẫn Equation của Word
   Word/PDF/Excel/CSV/JSON/PowerPoint/TXT/Markdown/HTML/Ảnh — kiểu chuyển, gồm ghép/tách/xoay/đánh số trang PDF và nén ảnh (chạy hoàn toàn trên trình duyệt, file không gửi đi đâu)
   Cần sẵn trong index.html: JSZip, SheetJS (XLSX), jsPDF, html2canvas. Các thư viện còn lại (mammoth, pdf.js, PptxGenJS, pdf-lib, heic2any) tự tải khi cần (cần mạng).
   Tự chèn mục "🔄 Chuyển đổi định dạng" vào ô chọn công cụ #wtSel — chỉ cần thêm 1 thẻ <script>. */
(function(){
'use strict';
const hx=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tick=()=>new Promise(r=>setTimeout(r,0));
const baseOf=n=>n.replace(/\.[^.]+$/,'');
const parseHtml=h=>new DOMParser().parseFromString('<!DOCTYPE html><body>'+h+'</body>','text/html').body;
const cleanXml=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const bytesOf=u=>{const b=atob(u.split(',')[1]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};

/* ---------- Tạo file .docx tối giản (văn bản + ảnh) ---------- */
function rXml(r){if(r.br)return '<w:r><w:br/></w:r>';let pr='';if(r.b)pr+='<w:b/>';if(r.i)pr+='<w:i/>';if(r.sup)pr+='<w:vertAlign w:val="superscript"/>';else if(r.sub)pr+='<w:vertAlign w:val="subscript"/>';
  return '<w:r>'+(pr?'<w:rPr>'+pr+'</w:rPr>':'')+'<w:t xml:space="preserve">'+cleanXml(r.t===undefined?'':r.t)+'</w:t></w:r>'}
function pXml(b){const runs=b.runs||[{t:b.t===undefined?'':b.t}];let pp='';
  if(b.h)pp+='<w:pStyle w:val="Heading'+b.h+'"/>';else pp+='<w:spacing w:after="120"/>';
  if(b.ind)pp+='<w:ind w:left="'+(b.ind*360)+'"/>';if(b.jc)pp+='<w:jc w:val="'+b.jc+'"/>';
  return '<w:p>'+(pp?'<w:pPr>'+pp+'</w:pPr>':'')+runs.map(rXml).join('')+'</w:p>'}
function tXml(rows,hdr){const n=Math.max.apply(null,[0].concat(rows.map(r=>r.length)));if(!n)return '';const w=Math.floor(9638/n);
  const bd=['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:space="0" w:color="808080"/>').join('');
  let x='<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'+bd+'</w:tblBorders><w:tblLayout w:type="autofit"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+('<w:gridCol w:w="'+w+'"/>').repeat(n)+'</w:tblGrid>';
  rows.forEach((r,i)=>{x+='<w:tr>'+(i===0&&hdr?'<w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>':'<w:trPr><w:cantSplit/></w:trPr>');
    for(let k=0;k<n;k++)x+='<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/></w:tcPr>'+pXml({runs:[{t:r[k]===undefined?'':String(r[k]),b:!!(hdr&&i===0)}]})+'</w:tc>';
    x+='</w:tr>'});
  return x+'</w:tbl><w:p/>'}
function docxParts(blocks){
  const parts={},rels=[];let body='',n=0;
  blocks.forEach(b=>{
    if(b.tbl){body+=tXml(b.tbl,b.hdr);return}
    if(!b.data){body+=pXml(b);return}
    n++;const rid='rIdImg'+n,name='image'+n+'.'+b.ext;parts['word/media/'+name]=b.data;rels.push('<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+name+'"/>');
    let cx=b.w*9525,cy=b.h*9525;const f=Math.min(1,6118860/cx,8800000/cy);cx=Math.round(cx*f);cy=Math.round(cy*f);
    body+='<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+n+'" name="Picture '+n+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+n+'" name="'+name+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'});
  if(!body)body='<w:p/>';
  const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',hs=(id,sz)=>'<w:style w:type="paragraph" w:styleId="Heading'+id+'"><w:name w:val="heading '+id+'"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="'+(id-1)+'"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/></w:rPr></w:style>';
  parts['[Content_Types].xml']=H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  parts['_rels/.rels']=H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  parts['word/_rels/document.xml.rels']=H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+rels.join('')+'</Relationships>';
  parts['word/styles.xml']=H+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+hs(1,36)+hs(2,30)+hs(3,27)+'</w:styles>';
  parts['word/document.xml']=H+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>';
  return parts}
async function makeDocx(blocks){const z=new JSZip(),p=docxParts(blocks);Object.keys(p).forEach(k=>z.file(k,p[k]));return z.generateAsync({type:'uint8array',compression:'DEFLATE'})}

/* ---------- Đọc chữ từ PDF: gom thành dòng / ô / đoạn ---------- */
function toLines(items){
  const its=items.filter(i=>typeof i.str==='string'&&i.str.trim()!=='').map(i=>({s:i.str.normalize('NFC'),x:i.transform[4],y:i.transform[5],fs:Math.hypot(i.transform[0],i.transform[1])||Math.abs(i.transform[3])||10,w:i.width||0}));
  its.sort((a,b)=>b.y-a.y||a.x-b.x);
  const L=[];its.forEach(it=>{const c=L[L.length-1];if(c&&Math.abs(c.y-it.y)<=Math.max(c.fs,it.fs)*0.45){c.its.push(it);c.fs=Math.max(c.fs,it.fs)}else L.push({y:it.y,fs:it.fs,its:[it]})});
  L.forEach(l=>{l.its.sort((a,b)=>a.x-b.x);const f=l.its[0],e=l.its[l.its.length-1];l.x0=f.x;l.width=e.x+e.w-f.x});
  return L}
function lineText(l){let s='',px=null;l.its.forEach(it=>{if(px!==null&&it.x-px>l.fs*0.15&&!/\s$/.test(s)&&!/^\s/.test(it.s))s+=' ';s+=it.s;px=it.x+it.w});return s.replace(/\s+/g,' ').trim()}
function lineCells(l){const cells=[];let cur='',px=null;
  l.its.forEach(it=>{if(px!==null&&it.x-px>l.fs*1.0){cells.push(cur.trim());cur=''}else if(px!==null&&it.x-px>l.fs*0.15&&!/\s$/.test(cur)&&!/^\s/.test(it.s))cur+=' ';cur+=it.s;px=it.x+it.w});
  cells.push(cur.trim());return cells.map(c=>c.replace(/\s+/g,' '))}
const NEWP=/^(\d+[.)]|[a-zA-Zđ][.)]|[-•●▪–])\s|^(Câu|CÂU|Bài|BÀI|PHẦN|Phần|ĐỀ|Đề)\s*\d*/;
function toParas(lines){
  const out=[];let cur='',prev=null;const maxW=Math.max.apply(null,[1].concat(lines.map(l=>l.width)));
  lines.forEach(l=>{const t=lineText(l);if(!t)return;
    if(prev){const gap=prev.y-l.y;
      const brk=gap>prev.fs*2.0||Math.abs(l.fs-prev.fs)>1.2||NEWP.test(t)||(prev.width<maxW*0.7&&/[.:;!?)”"]$/.test(cur));
      if(brk){out.push(cur);cur=t}else cur+=' '+t}else cur=t;
    prev=l});
  if(cur)out.push(cur);return out}

/* ---------- Tải thư viện khi cần ---------- */
const LIBS={
  mammoth:{t:()=>window.mammoth,u:['https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js','https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js']},
  pptx:{t:()=>window.PptxGenJS,u:['https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js']},
  pdfjs:{t:()=>window.pdfjsLib||window['pdfjs-dist/build/pdf'],u:['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js']},
  pdflib:{t:()=>window.PDFLib,u:['https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js','https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js']},
  heic:{t:()=>window.heic2any,u:['https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js']},
  h2c:{t:()=>window.html2canvas,u:['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js']},
  jspdf:{t:()=>window.jspdf&&window.jspdf.jsPDF,u:['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js']}};
const loadScript=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('load'));document.head.appendChild(s)});
/* MathJax 3 (xuất SVG, không dùng font ngoài → html2canvas chụp được). Phải đặt cấu hình TRƯỚC khi nạp script. */
async function mathjaxLib(){
  if(window.MathJax&&window.MathJax.typesetPromise){await window.MathJax.startup.promise;return window.MathJax}
  window.MathJax={tex:{inlineMath:[['\\(','\\)']],displayMath:[['\\[','\\]']],processEscapes:false},svg:{fontCache:'none'},startup:{typeset:false}};
  const us=['https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js','https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js'];
  for(const u of us){try{await loadScript(u)}catch(e){}if(window.MathJax&&window.MathJax.typesetPromise)break}
  if(!(window.MathJax&&window.MathJax.typesetPromise))throw new Error('Không tải được MathJax để vẽ công thức (cần kết nối mạng). Kiểm tra mạng rồi thử lại.');
  await window.MathJax.startup.promise;return window.MathJax}
async function lib(k){const L=LIBS[k];if(L.t())return L.t();
  for(const u of L.u){try{await loadScript(u)}catch(e){}if(L.t())break}
  if(!L.t())throw new Error('Không tải được thư viện "'+k+'" (cần kết nối mạng). Kiểm tra mạng rồi thử lại.');return L.t()}
async function pdfLib(){const p=await lib('pdfjs');
  if(!p._raInit){const url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    try{const r=await fetch(url);if(!r.ok)throw 0;p.GlobalWorkerOptions.workerSrc=URL.createObjectURL(await r.blob())}catch(e){p.GlobalWorkerOptions.workerSrc=url}p._raInit=1}
  return p}
const needLibs=()=>{if(typeof JSZip==='undefined')throw new Error('Chưa tải được thư viện JSZip (cần mạng để tải từ cdnjs).')};

/* ---------- Word → HTML (mammoth) ---------- */
/* ---------- Công thức Word (Equation / OMML) → LaTeX ---------- */
const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships',MNS='http://schemas.openxmlformats.org/officeDocument/2006/math',WNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const PH=i=>'\uE000'+i+'\uE001',PHRE=/\uE000(\d+)\uE001/g;
const LFUNCS=new Set('sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh coth log ln lg exp lim limsup liminf max min sup inf det gcd deg dim ker arg hom Pr'.split(' '));
const LIMOPS=new Set('lim limsup liminf max min sup inf det gcd Pr'.split(' '));
const SYM={'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\varepsilon','ϵ':'\\epsilon','ζ':'\\zeta','η':'\\eta','θ':'\\theta','ϑ':'\\vartheta','ι':'\\iota','κ':'\\kappa','λ':'\\lambda','μ':'\\mu','ν':'\\nu','ξ':'\\xi','π':'\\pi','ϖ':'\\varpi','ρ':'\\rho','ϱ':'\\varrho','σ':'\\sigma','ς':'\\varsigma','τ':'\\tau','υ':'\\upsilon','φ':'\\varphi','ϕ':'\\phi','χ':'\\chi','ψ':'\\psi','ω':'\\omega',
'Γ':'\\Gamma','Δ':'\\Delta','Θ':'\\Theta','Λ':'\\Lambda','Ξ':'\\Xi','Π':'\\Pi','Σ':'\\Sigma','Υ':'\\Upsilon','Φ':'\\Phi','Ψ':'\\Psi','Ω':'\\Omega',
'Α':'A','Β':'B','Ε':'E','Ζ':'Z','Η':'H','Ι':'I','Κ':'K','Μ':'M','Ν':'N','Ο':'O','Ρ':'P','Τ':'T','Χ':'X','ο':'o',
'±':'\\pm','∓':'\\mp','×':'\\times','÷':'\\div','·':'\\cdot','⋅':'\\cdot','∙':'\\cdot','∗':'*','∘':'\\circ','•':'\\bullet','−':'-','–':'-','—':'-',
'≤':'\\leq','⩽':'\\leq','≥':'\\geq','⩾':'\\geq','≠':'\\neq','≈':'\\approx','≡':'\\equiv','∼':'\\sim','≃':'\\simeq','≅':'\\cong','∝':'\\propto','≪':'\\ll','≫':'\\gg','≮':'\\nless','≯':'\\ngtr',
'∞':'\\infty','∂':'\\partial','∇':'\\nabla','∅':'\\emptyset','∈':'\\in','∉':'\\notin','∋':'\\ni','⊂':'\\subset','⊃':'\\supset','⊆':'\\subseteq','⊇':'\\supseteq','⊄':'\\not\\subset','⊊':'\\subsetneq','∪':'\\cup','∩':'\\cap','∖':'\\setminus',
'∀':'\\forall','∃':'\\exists','∄':'\\nexists','¬':'\\neg','∧':'\\wedge','∨':'\\vee','⊕':'\\oplus','⊗':'\\otimes','⊥':'\\perp','∥':'\\parallel','∦':'\\nparallel','∠':'\\angle','∡':'\\measuredangle','△':'\\triangle','°':'^{\\circ}','′':"'",'″':"''",
'…':'\\ldots','⋯':'\\cdots','⋮':'\\vdots','⋱':'\\ddots','∴':'\\therefore','∵':'\\because','∣':'\\mid','∤':'\\nmid','‖':'\\|',
'→':'\\to','←':'\\leftarrow','↔':'\\leftrightarrow','⇒':'\\Rightarrow','⇐':'\\Leftarrow','⇔':'\\Leftrightarrow','↦':'\\mapsto','↑':'\\uparrow','↓':'\\downarrow','⟶':'\\longrightarrow','⟹':'\\Longrightarrow','⟺':'\\Longleftrightarrow','⟵':'\\longleftarrow','⟸':'\\Longleftarrow',
'ℝ':'\\mathbb{R}','ℕ':'\\mathbb{N}','ℤ':'\\mathbb{Z}','ℚ':'\\mathbb{Q}','ℂ':'\\mathbb{C}','ℙ':'\\mathbb{P}','ℓ':'\\ell','ℏ':'\\hbar','ℎ':'h','ℵ':'\\aleph',
'√':'\\surd','∑':'\\sum','∏':'\\prod','∫':'\\int','∮':'\\oint','⌊':'\\lfloor','⌋':'\\rfloor','⌈':'\\lceil','⌉':'\\rceil','⟨':'\\langle','⟩':'\\rangle','〈':'\\langle','〉':'\\rangle','〈':'\\langle','〉':'\\rangle',
'{':'\\{','}':'\\}','\\':'\\backslash','#':'\\#','%':'\\%','$':'\\$','_':'\\_','^':'\\^{}','~':'\\sim','²':'^{2}','³':'^{3}','¹':'^{1}',
'\u2061':'','\u2062':'','\u2063':'','\u2064':'','\u200B':'','\u00A0':'\\ ','\u2009':'\\,','\u2002':'\\ ','\u2003':'\\quad '};
const ALN=[['\\mathbf',0x1D400],['',0x1D434],['\\boldsymbol',0x1D468],['\\mathcal',0x1D49C],['\\mathcal',0x1D4D0],['\\mathfrak',0x1D504],['\\mathbb',0x1D538],['\\mathfrak',0x1D56C],['\\mathsf',0x1D5A0],['\\mathsf',0x1D5D4],['\\mathsf',0x1D608],['\\mathsf',0x1D63C],['\\mathtt',0x1D670]];
function mAlnum(cp){for(const a of ALN){if(cp>=a[1]&&cp<a[1]+52){const k=cp-a[1],ch=String.fromCharCode(k<26?65+k:97+k-26);return a[0]?a[0]+'{'+ch+'}':ch}}
  if(cp>=0x1D7CE&&cp<=0x1D7FF){const k=cp-0x1D7CE,d=k%10;return Math.floor(k/10)===0?'\\mathbf{'+d+'}':String(d)}return null}
const NARY={'∑':'\\sum','∏':'\\prod','∐':'\\coprod','∫':'\\int','∬':'\\iint','∭':'\\iiint','∮':'\\oint','∯':'\\oint','∰':'\\oint','⋃':'\\bigcup','⋂':'\\bigcap','⋁':'\\bigvee','⋀':'\\bigwedge','⨁':'\\bigoplus','⨂':'\\bigotimes'};
const DELIM={'(':'(',')':')','[':'[',']':']','{':'\\{','}':'\\}','|':'|','‖':'\\|','⟨':'\\langle','⟩':'\\rangle','〈':'\\langle','〉':'\\rangle','〈':'\\langle','〉':'\\rangle','⌊':'\\lfloor','⌋':'\\rfloor','⌈':'\\lceil','⌉':'\\rceil','/':'/','\\':'\\backslash','':'.'};
const ACC={'\u0302':'hat','^':'hat','\u0303':'tilde','~':'tilde','\u0304':'bar','¯':'bar','\u0305':'overline','\u0307':'dot','˙':'dot','\u0308':'ddot','¨':'ddot','\u20DB':'dddot','\u20D7':'vec','→':'vec','\u0301':'acute','´':'acute','\u0300':'grave','`':'grave','\u0306':'breve','˘':'breve','\u030C':'check','ˇ':'check','\u20D6':'overleftarrow','←':'overleftarrow','\u20E1':'overleftrightarrow','↔':'overleftrightarrow'};
const kids=(n,name)=>Array.from(n.childNodes).filter(c=>c.nodeType===1&&c.namespaceURI===MNS&&c.localName===name);
const kid=(n,name)=>{if(!n)return null;const a=kids(n,name);return a.length?a[0]:null};
const mval=e=>{if(!e)return null;let v=e.getAttributeNS(MNS,'val');if(v===null)v=e.getAttribute('m:val');if(v===null)v=e.getAttribute('val');return v};
const mon=e=>{if(!e)return false;const v=mval(e);return !(v==='0'||v==='false'||v==='off')};
const mprop=(n,pr,nm)=>kid(kid(n,pr),nm);
const lcmd=s=>/[A-Za-z]$/.test(s)?s+' ':s;
const escText=s=>String(s).replace(/([{}#%&$_])/g,'\\$1').replace(/\\(?![{}#%&$_\\])/g,'\\textbackslash{}').replace(/\^/g,'\\^{}').replace(/~/g,'\\sim ');
function singleTex(s){s=s.trim();if(!s)return false;
  if(/^(\\[A-Za-z]+|\\.|[^\\{}\s])$/.test(s)||/^\d+$/.test(s))return true;
  const wrapped=()=>{let d=0;const re=/\\left(?![A-Za-z])\s*(?:\\[A-Za-z]+|\\.|.)|\\right(?![A-Za-z])\s*(?:\\[A-Za-z]+|\\.|.)|\\\\|\\[{}]|[{}]/g;let m;
    while((m=re.exec(s))){const t=m[0];if(t.indexOf('\\left')===0||t==='{')d++;else if(t.indexOf('\\right')===0||t==='}')d--;
      if(d===0&&re.lastIndex<s.length)return false}return d===0};
  if(s[0]==='{'&&s[s.length-1]==='}')return wrapped();
  if(/^\\left(?![A-Za-z])/.test(s))return wrapped();
  return false}
const baseTex=e=>{e=e.trim();return !e?'{}':(singleTex(e)?e:'{'+e+'}')};
const funcTex=nm=>LFUNCS.has(nm)?'\\'+nm+' ':'\\operatorname{'+nm+'} ';
function runTex(r,ctx){
  const rp=kid(r,'rPr');let nor=false,sty='',scr='';
  if(rp){nor=mon(kid(rp,'nor'));sty=mval(kid(rp,'sty'))||'';scr=mval(kid(rp,'scr'))||''}
  const aln=rp&&mon(kid(rp,'aln')),t=Array.from(r.childNodes).filter(n=>n.nodeType===1&&n.localName==='t').map(n=>n.textContent).join('');
  if(aln&&!t)return '&';
  if(!t)return '';
  if(nor)return '\\text{'+escText(t)+'} ';
  if(/^[A-Za-z]+$/.test(t.trim())&&(ctx.fname||sty==='p')&&(ctx.fname||LFUNCS.has(t.trim())))return funcTex(t.trim());
  const SC={'double-struck':'\\mathbb','script':'\\mathcal','fraktur':'\\mathfrak','sans-serif':'\\mathsf','monospace':'\\mathtt'};
  const wrapCmd=SC[scr]||(sty==='p'?'\\mathrm':sty==='b'?'\\mathbf':sty==='bi'?'\\boldsymbol':'');
  let out='',buf='';
  const flush=()=>{if(!buf)return;if(/[^\x00-\x7f]/.test(buf))out+='\\text{'+buf+'} ';else out+=wrapCmd?wrapCmd+'{'+buf+'} ':buf;buf=''};
  for(const ch of t){const cp=ch.codePointAt(0);
    if(Object.prototype.hasOwnProperty.call(SYM,ch)){flush();out+=lcmd(SYM[ch]);continue}
    const al=cp>=0x1D400?mAlnum(cp):null;if(al!==null){flush();out+=lcmd(al);continue}
    if(/\p{L}/u.test(ch)){buf+=ch;continue}
    flush();
    if(ch==='&'){out+=ctx.eq?'&':'\\&';continue}
    out+=ch}
  flush();return out}
function nodeTex(n,ctx){
  if(n.namespaceURI!==MNS){const ln=n.localName;return /^(ins|smartTag|hyperlink|sdt|sdtContent|customXml)$/.test(ln)?childTex(n,ctx):''}
  const nm=n.localName;if(/Pr$/.test(nm))return '';
  const arg=k=>{const e=kid(n,k);return e?childTex(e,ctx).trim():''};
  switch(nm){
    case 'r':return runTex(n,ctx);
    case 'f':{const ty=mval(mprop(n,'fPr','type'))||'bar',a=arg('num'),b=arg('den');
      if(ty==='noBar')return '\\genfrac{}{}{0pt}{}{'+a+'}{'+b+'}';
      if(ty==='lin'||ty==='skw')return '{'+a+'}/{'+b+'}';
      return '\\frac{'+a+'}{'+b+'}'}
    case 'rad':{const dg=arg('deg'),hide=mon(mprop(n,'radPr','degHide')),e=arg('e');return (hide||!dg)?'\\sqrt{'+e+'}':'\\sqrt['+dg+']{'+e+'}'}
    case 'sSup':return baseTex(arg('e'))+'^{'+arg('sup')+'}';
    case 'sSub':return baseTex(arg('e'))+'_{'+arg('sub')+'}';
    case 'sSubSup':return baseTex(arg('e'))+'_{'+arg('sub')+'}^{'+arg('sup')+'}';
    case 'sPre':return '{}_{'+arg('sub')+'}^{'+arg('sup')+'}'+baseTex(arg('e'));
    case 'nary':{const pr=kid(n,'naryPr'),ce=pr&&kid(pr,'chr'),ch=ce?(mval(ce)||''):'∫';
      const op=ch===''?'':(NARY[ch]||ch),ll=pr&&mval(kid(pr,'limLoc')),sh=pr&&mon(kid(pr,'subHide')),ph=pr&&mon(kid(pr,'supHide'));
      const sb=sh?'':arg('sub'),sp=ph?'':arg('sup');
      return op+(ll==='undOvr'?'\\limits':ll==='subSup'?'\\nolimits':'')+(sb?'_{'+sb+'}':'')+(sp?'^{'+sp+'}':'')+' '+arg('e')}
    case 'd':{const pr=kid(n,'dPr');let b='(',e=')',sp='|';
      if(pr){const x=kid(pr,'begChr'),y=kid(pr,'endChr'),z=kid(pr,'sepChr');if(x)b=mval(x)||'';if(y)e=mval(y)||'';if(z)sp=mval(z)||''}
      const dl=(c,open)=>Object.prototype.hasOwnProperty.call(DELIM,c)?DELIM[c]:'.';
      const sepT=sp===''?' ':(sp==='|'?' \\middle| ':' '+(Object.prototype.hasOwnProperty.call(SYM,sp)?lcmd(SYM[sp]):sp)+' ');
      return '\\left'+dl(b,1)+' '+kids(n,'e').map(x=>childTex(x,ctx).trim()).join(sepT)+' \\right'+dl(e,0)}
    case 'func':{const fn=kid(n,'fName'),f=fn?childTex(fn,Object.assign({},ctx,{fname:true})).trim():'';return f+' '+arg('e')}
    case 'limLow':{const e=arg('e'),l=arg('lim'),op=e.replace(/^\\/,'').trim();
      if(!l)return e;
      if(/^\\underbrace\{/.test(e))return e+'_{'+l+'}';
      return (LIMOPS.has(op)||/^\\operatorname\{/.test(e))?e+'\\limits_{'+l+'}':'\\underset{'+l+'}{'+e+'}'}
    case 'limUpp':{const e=arg('e'),l=arg('lim');if(!l)return e;
      if(/^\\overbrace\{/.test(e))return e+'^{'+l+'}';
      const AR={'\\to':'\\overrightarrow','\\rightarrow':'\\overrightarrow','\\leftarrow':'\\overleftarrow','\\leftrightarrow':'\\overleftrightarrow'};
      if(AR[l])return AR[l]+'{'+e+'}';
      return '\\overset{'+l+'}{'+e+'}'}
    case 'acc':{const pr=kid(n,'accPr'),ce=pr&&kid(pr,'chr'),ch=ce?(mval(ce)||''):'\u0302',e=arg('e'),
        wide=e.replace(/\\[A-Za-z]+/g,'X').replace(/[{}\s]/g,'').length>1,k=ACC[ch];
      if(!k)return '\\overset{'+(SYM[ch]||ch)+'}{'+e+'}';
      if(k==='hat'&&wide)return '\\widehat{'+e+'}';if(k==='tilde'&&wide)return '\\widetilde{'+e+'}';
      if(k==='vec'&&wide)return '\\overrightarrow{'+e+'}';
      return '\\'+k+'{'+e+'}'}
    case 'bar':{const p=mval(mprop(n,'barPr','pos'))||'bot',e=arg('e');return p==='top'?'\\overline{'+e+'}':'\\underline{'+e+'}'}
    case 'groupChr':{const pr=kid(n,'groupChrPr'),ce=pr&&kid(pr,'chr'),ch=ce?(mval(ce)||''):'⏟',pos=(pr&&mval(kid(pr,'pos')))||'bot',e=arg('e');
      if(ch==='⏞')return '\\overbrace{'+e+'}';if(ch==='⏟')return '\\underbrace{'+e+'}';
      if(pos==='top'){if(ch==='→')return '\\overrightarrow{'+e+'}';if(ch==='←')return '\\overleftarrow{'+e+'}';if(ch==='↔')return '\\overleftrightarrow{'+e+'}'}
      const c2=SYM[ch]||ch;return pos==='top'?'\\overset{'+c2+'}{'+e+'}':'\\underset{'+c2+'}{'+e+'}'}
    case 'm':{const rows=kids(n,'mr').map(r=>kids(r,'e').map(e=>childTex(e,ctx).trim())),nc=Math.max.apply(null,[1].concat(rows.map(r=>r.length))),
        js=Array.from(n.getElementsByTagNameNS(MNS,'mcJc')).map(mval),body=rows.map(r=>r.join(' & ')).join(' \\\\ ');
      if(js.length&&js.every(j=>j==='left'||j==='right')){const L=js[0]==='left'?'l':'r';return '\\begin{array}{'+L.repeat(nc)+'} '+body+' \\end{array}'}
      return '\\begin{matrix} '+body+' \\end{matrix}'}
    case 'eqArr':{const rows=kids(n,'e').map(e=>childTex(e,Object.assign({},ctx,{eq:true})).trim()),al=rows.some(r=>/(^|[^\\])&/.test(r));
      return al?'\\begin{aligned} '+rows.join(' \\\\ ')+' \\end{aligned}':'\\begin{array}{l} '+rows.join(' \\\\ ')+' \\end{array}'}
    case 'borderBox':return '\\boxed{'+arg('e')+'}';
    case 'box':case 'phant':return arg('e');
    default:return childTex(n,ctx)}}
function childTex(n,ctx){let s='';Array.from(n.childNodes).forEach(c=>{if(c.nodeType===1)s+=nodeTex(c,ctx)});return s}
const tidyTex=s=>s.replace(/\s+/g,' ').replace(/\s+([}\]),;])/g,'$1').replace(/\^\{\^\{\\circ\}\}/g,'^{\\circ}').trim();
function ommlToLatex(el){return tidyTex(childTex(el,{eq:false,fname:false}))}
function ommlParaToLatex(el){const ms=kids(el,'oMath').map(ommlToLatex).filter(Boolean);
  if(!ms.length)return ommlToLatex(el);return ms.length===1?ms[0]:'\\begin{gathered} '+ms.join(' \\\\ ')+' \\end{gathered}'}
function texSane(s){let d=0,l=0;const re=/\\\\|\\[{}]|\\left\b|\\right\b|[{}]/g;let m;
  while((m=re.exec(s))){const t=m[0];if(t==='{')d++;else if(t==='}')d--;else if(t==='\\left')l++;else if(t==='\\right')l--;if(d<0||l<0)return false}
  return d===0&&l===0&&((s.match(/\\begin\{/g)||[]).length===(s.match(/\\end\{/g)||[]).length)}

/* ---------- Đọc công thức MathType (đối tượng OLE "Equation Native", định dạng MTEF v5) → LaTeX ---------- */
function oleStream(u8,name){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  if(u8.length<512||dv.getUint32(0,true)!==0xE011CFD0||dv.getUint32(4,true)!==0xE11AB1A1)return null;
  const ssz=1<<dv.getUint16(30,true),mssz=1<<dv.getUint16(32,true),nfat=dv.getUint32(44,true),dir0=dv.getUint32(48,true),
    cut=dv.getUint32(56,true),mf0=dv.getUint32(60,true),dif0=dv.getUint32(68,true),ndif=dv.getUint32(72,true);
  const off=s=>(s+1)*ssz,fs=[];
  for(let i=0;i<109;i++){const v=dv.getUint32(76+i*4,true);if(v<0xFFFFFFFA)fs.push(v)}
  let d=dif0;for(let k=0;k<ndif&&d<0xFFFFFFFA;k++){const o=off(d);for(let i=0;i<ssz/4-1;i++){const v=dv.getUint32(o+i*4,true);if(v<0xFFFFFFFA)fs.push(v)}d=dv.getUint32(o+ssz-4,true)}
  const fat=[];fs.slice(0,nfat).forEach(s=>{const o=off(s);for(let i=0;i<ssz/4;i++)fat.push(dv.getUint32(o+i*4,true))});
  const chain=(s,tab)=>{const r=[];let g=0;while(s<0xFFFFFFFA&&g++<100000){r.push(s);s=tab[s]}return r};
  const rd=s=>{const ch=chain(s,fat),o=new Uint8Array(ch.length*ssz);ch.forEach((c,i)=>o.set(u8.subarray(off(c),off(c)+ssz),i*ssz));return o};
  const dir=rd(dir0),ddv=new DataView(dir.buffer),ents=[];
  for(let i=0;i<dir.length/128;i++){const b=i*128,nl=ddv.getUint16(b+64,true);if(!nl||dir[b+66]===0)continue;
    let n='';for(let k=0;k<(nl-2)/2;k++)n+=String.fromCharCode(ddv.getUint16(b+k*2,true));
    ents.push({n:n,t:dir[b+66],s:ddv.getUint32(b+116,true),z:ddv.getUint32(b+120,true)})}
  const e=ents.find(x=>x.n===name&&x.t===2);if(!e)return null;
  if(e.z>=cut)return rd(e.s).subarray(0,e.z);
  const root=ents.find(x=>x.t===5);if(!root)return null;
  const mini=rd(root.s),mfat=[];
  for(const s of chain(mf0,fat)){const o=off(s);for(let i=0;i<ssz/4;i++)mfat.push(dv.getUint32(o+i*4,true))}
  const ch=chain(e.s,mfat),o=new Uint8Array(ch.length*mssz);ch.forEach((c,i)=>o.set(mini.subarray(c*mssz,c*mssz+mssz),i*mssz));
  return o.subarray(0,e.z)}

function mtefRead(u8){
  let p=28;const L=u8.length;
  const b=()=>{if(p>=L)throw new Error('EOF');return u8[p++]};
  const w=()=>{const x=b();return x|(b()<<8)};
  const str=()=>{let s='';for(;;){const c=b();if(!c)break;s+=String.fromCharCode(c)}return s};
  if(b()!==5)throw new Error('Không phải MTEF v5');
  b();b();b();b();str();b();
  const nudge=()=>{const x=b()<<24>>24,y=b()<<24>>24;if(x===-128&&y===-128){w();w()}};
  const ruler=()=>{const n=b();for(let i=0;i<n;i++){b();w()}};
  const nib=()=>{let hi=true,cb=0;return()=>{if(hi){cb=b();hi=false;return cb>>4}hi=true;return cb&15}};
  const embells=()=>{const a=[];for(;;){const t=b();if(t===0)break;if(t!==6)throw new Error('embell '+t);const at=b();if(at&8)nudge();a.push(b())}return a};
  function objs(){const o=[];
    for(;;){const t=b();
      if(t===0)return o;
      if(t===1){const at=b();if(at&8)nudge();if(at&4)w();if(at&2)ruler();o.push(at&1?{k:'line',nul:true,c:[]}:{k:'line',c:objs()});continue}
      if(t===2){const at=b();if(at&8)nudge();const tf=b();let mt=null,c8=null;
        if(!(at&0x20))mt=w();if(at&4)c8=b();if(at&0x10)w();
        const n={k:'char',tf:tf,mt:mt,c8:c8};if(at&2)n.emb=embells();o.push(n);continue}
      if(t===3){const at=b();if(at&8)nudge();const sel=b();let v=b();if(v&0x80)v=(v&0x7f)|(b()<<8);b();o.push({k:'tmpl',sel:sel,v:v,c:objs()});continue}
      if(t===4){const at=b();if(at&8)nudge();const ha=b();b();if(at&2)ruler();o.push({k:'pile',ha:ha,c:objs()});continue}
      if(t===5){const at=b();if(at&8)nudge();b();b();b();const rows=b(),cols=b();p+=Math.ceil((rows+1)/4)+Math.ceil((cols+1)/4);o.push({k:'matrix',rows:rows,cols:cols,c:objs()});continue}
      if(t===7){ruler();continue}
      if(t===8){b();b();continue}
      if(t===9){const l=b();if(l===101)w();else b();continue}
      if(t>=10&&t<=14)continue;
      if(t===15){b();continue}
      if(t===16){const op=b();p+=(op&1)?4:3;if(op&4)str();continue}
      if(t===17){b();str();continue}
      if(t===18){b();for(let k=0;k<2;k++){const n=b(),nb=nib();let e=0;while(e<n)if(nb()===15)e++}const n=b();for(let i=0;i<n;i++){if(b())b()}continue}
      if(t===19){str();continue}
      throw new Error('record '+t)}}
  const top=[];try{top.push.apply(top,objs())}catch(e){if(e.message!=='EOF')throw e}
  return top}

const MT_GREEK={0x391:'A',0x392:'B',0x393:'\\Gamma ',0x394:'\\Delta ',0x395:'E',0x396:'Z',0x397:'H',0x398:'\\Theta ',0x399:'I',0x39A:'K',0x39B:'\\Lambda ',0x39C:'M',0x39D:'N',0x39E:'\\Xi ',0x39F:'O',0x3A0:'\\Pi ',0x3A1:'P',0x3A3:'\\Sigma ',0x3A4:'T',0x3A5:'\\Upsilon ',0x3A6:'\\Phi ',0x3A7:'X',0x3A8:'\\Psi ',0x3A9:'\\Omega ',
 0x3B1:'\\alpha ',0x3B2:'\\beta ',0x3B3:'\\gamma ',0x3B4:'\\delta ',0x3B5:'\\varepsilon ',0x3B6:'\\zeta ',0x3B7:'\\eta ',0x3B8:'\\theta ',0x3B9:'\\iota ',0x3BA:'\\kappa ',0x3BB:'\\lambda ',0x3BC:'\\mu ',0x3BD:'\\nu ',0x3BE:'\\xi ',0x3BF:'o',0x3C0:'\\pi ',0x3C1:'\\rho ',0x3C2:'\\varsigma ',0x3C3:'\\sigma ',0x3C4:'\\tau ',0x3C5:'\\upsilon ',0x3C6:'\\varphi ',0x3C7:'\\chi ',0x3C8:'\\psi ',0x3C9:'\\omega ',
 0x3D1:'\\vartheta ',0x3D5:'\\phi ',0x3D6:'\\varpi ',0x3F1:'\\varrho ',0x3F5:'\\epsilon '};
const MT_SYM={0x2212:'-',0xB1:'\\pm ',0x2213:'\\mp ',0xD7:'\\times ',0xF7:'\\div ',0xB7:'\\cdot ',0x22C5:'\\cdot ',0x2217:'*',0x2218:'\\circ ',0x2219:'\\cdot ',0x2022:'\\bullet ',
 0x2264:'\\le ',0x2265:'\\ge ',0x2260:'\\ne ',0x2248:'\\approx ',0x2261:'\\equiv ',0x2262:'\\not\\equiv ',0x2245:'\\cong ',0x223C:'\\sim ',0x223D:'\\backsim ',0x2243:'\\simeq ',0x221D:'\\propto ',0x226A:'\\ll ',0x226B:'\\gg ',
 0x221E:'\\infty ',0x2202:'\\partial ',0x2207:'\\nabla ',0x2208:'\\in ',0x2209:'\\notin ',0x220B:'\\ni ',0x2282:'\\subset ',0x2283:'\\supset ',0x2286:'\\subseteq ',0x2287:'\\supseteq ',0x2284:'\\not\\subset ',0x2288:'\\not\\subseteq ',
 0x222A:'\\cup ',0x2229:'\\cap ',0x2205:'\\emptyset ',0x2200:'\\forall ',0x2203:'\\exists ',0x2204:'\\nexists ',0x2227:'\\wedge ',0x2228:'\\vee ',0xAC:'\\neg ',
 0x2192:'\\to ',0x2190:'\\leftarrow ',0x2194:'\\leftrightarrow ',0x2191:'\\uparrow ',0x2193:'\\downarrow ',0x21D2:'\\Rightarrow ',0x21D0:'\\Leftarrow ',0x21D4:'\\Leftrightarrow ',0x21A6:'\\mapsto ',0x2197:'\\nearrow ',0x2198:'\\searrow ',
 0x22A5:'\\perp ',0x2225:'\\parallel ',0x2226:'\\nparallel ',0x2220:'\\angle ',0x2221:'\\measuredangle ',0x25B3:'\\triangle ',0x25A1:'\\square ',0xB0:'^{\\circ}',0x2032:"'",0x2033:"''",
 0x2026:'\\ldots ',0x22EF:'\\cdots ',0x22EE:'\\vdots ',0x22F1:'\\ddots ',0x2234:'\\therefore ',0x2235:'\\because ',0x221A:'\\surd ',0x2211:'\\sum ',0x220F:'\\prod ',
 0x222B:'\\int ',0x222C:'\\iint ',0x222D:'\\iiint ',0x222E:'\\oint ',0x2223:'|',0x2016:'\\| ',0x27E8:'\\langle ',0x27E9:'\\rangle ',0x2329:'\\langle ',0x232A:'\\rangle ',
 0x230A:'\\lfloor ',0x230B:'\\rfloor ',0x2308:'\\lceil ',0x2309:'\\rceil ',0x2102:'\\mathbb{C}',0x2115:'\\mathbb{N}',0x211A:'\\mathbb{Q}',0x211D:'\\mathbb{R}',0x2124:'\\mathbb{Z}',0x2113:'\\ell ',0x210F:'\\hbar ',
 0xB2:'^{2}',0xB3:'^{3}',0xB9:'^{1}',0xBD:'\\frac{1}{2}',0xBC:'\\frac{1}{4}',0xBE:'\\frac{3}{4}',0x2190:'\\leftarrow ',0x21CC:'\\rightleftharpoons ',0x2020:'\\dagger ',0x2021:'\\ddagger ',0x2605:'\\star ',0x22C6:'\\star ',0x2295:'\\oplus ',0x2297:'\\otimes ',0x2299:'\\odot ',0x2216:'\\setminus ',0x22A4:'\\top ',0x22A2:'\\vdash ',0x22A8:'\\models ',0x2040:'\\frown ',0x2312:'\\frown ',0x2322:'\\frown ',0x2323:'\\smile '};
const MT_ASCII={'\\':'\\backslash ','^':'\\^{}','~':'\\sim ','#':'\\#','$':'\\$','%':'\\%','&':'\\&','_':'\\_','{':'\\{','}':'\\}'};
const MT_FUNCS=new Set(['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan','sinh','cosh','tanh','coth','log','ln','lg','lim','liminf','limsup','max','min','sup','inf','det','dim','exp','gcd','deg','ker','arg','hom','Pr']);
const MT_DELIM={0x28:'(',0x29:')',0x5B:'[',0x5D:']',0x7B:'\\{ ',0x7D:'\\} ',0x7C:'|',0x2223:'|',0x2016:'\\| ',0x2225:'\\| ',0x27E8:'\\langle ',0x27E9:'\\rangle ',0x2329:'\\langle ',0x232A:'\\rangle ',0x230A:'\\lfloor ',0x230B:'\\rfloor ',0x2308:'\\lceil ',0x2309:'\\rceil ',0x3008:'\\langle ',0x3009:'\\rangle '};
const MT_FENCE=[['\\langle ','\\rangle '],['(',')'],['\\{ ','\\} '],['[',']'],['|','|'],['\\| ','\\| '],['\\lfloor ','\\rfloor '],['\\lceil ','\\rceil '],['[',')'],['(',']']];
const mtSingle=s=>{s=s.trim();return /^(\\[A-Za-z]+|\\.|[^\\{}\s])$/.test(s)||/^\d+$/.test(s)};
const mtBase=s=>{s=s.trim();return !s?'{}':(mtSingle(s)||/^\\left[\s\S]*\\right.$/.test(s)&&false?s:'{'+s+'}')};

function mtefTex(top,st){
  st=st||{unk:0};
  const fail=m=>{throw new Error(m)};
  const code=n=>n.mt!==null?n.mt:(n.c8!==null?n.c8:fail('Ký tự không có mã'));
  const escT=s=>s.replace(/([{}#%&$_])/g,'\\$1').replace(/\\(?![{}#%&$_\\])/g,'\\textbackslash{}').replace(/\^/g,'\\^{}').replace(/~/g,'\\sim ');
  // một ký tự → {t:'t'|'f'|'x', s}
  function charAtom(n){
    const cp=code(n),id=n.tf>=128?n.tf-128:n.tf;let ch=String.fromCodePoint(cp),s;
    if(cp===0xEF00||cp===0xEF01||cp===0xEF02||cp===0xEF03||cp===0xEF04||cp===0xEF05||cp===0xEF06||cp===0xEF07||cp===0xEF08||cp===0xEF09||cp===0xEF0A||cp===0x200B||cp===0xFEFF)return {t:'x',s:'',sp:true};
    if(id===1&&cp>=0x20)return {t:'t',ch:ch};              // kiểu chữ Text
    if(id===2&&/[A-Za-z]/.test(ch))return {t:'f',ch:ch};    // kiểu chữ Function (sin, cos, lim…)
    if(cp===0x20||cp===0xA0)return {t:'x',s:'',sp:true};
    if(MT_GREEK[cp]!==undefined)s=MT_GREEK[cp];
    else if(MT_SYM[cp]!==undefined)s=MT_SYM[cp];
    else if(cp<0x80){s=MT_ASCII[ch]!==undefined?MT_ASCII[ch]:ch;if(id===7&&/[A-Za-z]/.test(ch))s='\\mathbf{'+ch+'}'}
    else{st.unk++;s=ch}
    return {t:'x',s:s,cp:cp,rel:cp===0x3D}}
  const embl=(e,s)=>{const one=mtSingle(s);
    switch(e){
      case 2:return '\\dot{'+s+'}';case 3:return '\\ddot{'+s+'}';case 4:return '\\dddot{'+s+'}';
      case 5:return mtBase(s)+"'";case 6:return mtBase(s)+"''";case 7:return mtBase(s)+'^{\\backprime}';
      case 8:return one?'\\tilde{'+s+'}':'\\widetilde{'+s+'}';case 9:return one?'\\hat{'+s+'}':'\\widehat{'+s+'}';
      case 11:case 14:return '\\overrightarrow{'+s+'}';case 12:case 15:return '\\overleftarrow{'+s+'}';case 13:return '\\overleftrightarrow{'+s+'}';
      case 17:return one?'\\bar{'+s+'}':'\\overline{'+s+'}';case 18:return '\\overset{\\frown}{'+s+'}';case 19:return '\\overset{\\smile}{'+s+'}';
      default:fail('Dấu phụ '+e)}};
  const txt=s=>/^[A-Za-z0-9.,]+$/.test(s)?'\\mathrm{'+s+'}':'\\text{'+escT(s)+'}';
  const atomStr=a=>a.t==='t'?txt(a.ch):a.t==='f'?'\\operatorname{'+a.ch+'}':a.s;
  function seq(list,cx){
    cx=cx||{};const at=[];let eqDone=false;
    for(const n of list){
      if(n.k==='char'){const a=charAtom(n);
        if(n.emb&&n.emb.length){let s=atomStr(a);n.emb.forEach(e=>{s=embl(e,s)});at.push({t:'x',s:s});continue}
        if(cx.eq&&a.rel&&!eqDone){eqDone=true;at.push({t:'x',s:'&'})}
        at.push(a);continue}
      if(n.k==='line'){at.push({t:'x',s:seq(n.c,cx)});continue}
      if(n.k==='tmpl'){
        const sel=n.sel;
        if(sel===27||sel===28||sel===29){ // chỉ số dưới / trên: gắn vào đối tượng đứng ngay trước
          const ls=n.c.filter(c=>c.k==='line'),r=ls.map(l=>l.nul?'':seq(l.c,{}).trim());
          let sub='',sup='';
          if(sel===27)sub=r.find(x=>x)||'';else if(sel===28)sup=r.find(x=>x)||'';else{sub=r[0]||'';sup=r[1]||''}
          const prev=at.pop();const b=prev?atomStr(prev).trim():'';
          const bs=!b?'{}':(prev&&prev.t!=='x'||mtSingle(b)||/^\\(left|operatorname|text|mathbf|overline|bar|hat|widehat)/.test(b)||/\\right.$/.test(b)?b:'{'+b+'}');
          // nếu đối tượng trước đã có chỉ số cùng loại thì bọc nhóm để không lỗi "double superscript"
          let base=bs;if(prev&&prev.sc&&((sub&&/_\{/.test(prev.sc))||(sup&&/\^\{/.test(prev.sc))))base='{'+b+'}';
          let sc=(sub?'_{'+sub+'}':'')+(sup?'^{'+sup+'}':'');
          at.push({t:'x',s:base+sc,sc:(prev&&prev.sc?prev.sc:'')+sc});continue}
        at.push({t:'x',s:tmpl(n,cx)});continue}
      if(n.k==='pile'){at.push({t:'x',s:pile(n,cx.cases)});continue}
      if(n.k==='matrix'){at.push({t:'x',s:matrix(n)});continue}
    }
    // gộp: chuỗi chữ Text → \text{…}, chuỗi chữ Function → tên hàm
    let out='',i=0;
    while(i<at.length){const a=at[i];
      if(a.t==='t'){let s='';while(i<at.length&&at[i].t==='t'){s+=at[i].ch;i++}out+=txt(s);continue}
      if(a.t==='f'){let s='';while(i<at.length&&at[i].t==='f'){s+=at[i].ch;i++}out+=MT_FUNCS.has(s)?'\\'+s+' ':'\\operatorname{'+s+'} ';continue}
      out+=a.s;if(a.s&&/[A-Za-z]$/.test(a.s)&&a.s[0]==='\\')out+=' ';i++}
    return out}
  const lines=(n)=>n.c.filter(c=>c.k==='line');
  const ln=(l,cx)=>(!l||l.nul)?'':seq(l.c,cx||{}).trim();
  function pile(n,cases){
    const rows=lines(n).map(l=>seq(l.c,{eq:n.ha===4&&!cases}).trim());
    if(cases)return rows.join(' \\\\ ');
    if(n.ha===4)return '\\begin{aligned} '+rows.join(' \\\\ ')+' \\end{aligned}';
    return '\\begin{array}{'+(n.ha===1?'l':n.ha===3?'r':'c')+'} '+rows.join(' \\\\ ')+' \\end{array}'}
  function matrix(n){
    const ls=lines(n),rows=[];
    if(ls.length!==n.rows*n.cols)fail('Ma trận không khớp');
    for(let r=0;r<n.rows;r++)rows.push(ls.slice(r*n.cols,(r+1)*n.cols).map(l=>ln(l)).join(' & '));
    return '\\begin{matrix} '+rows.join(' \\\\ ')+' \\end{matrix}'}
  function tmpl(n,cx){
    const sel=n.sel,v=n.v,ls=lines(n),chars=n.c.filter(c=>c.k==='char'),l=i=>ln(ls[i]);
    if(sel<=9){ // ngoặc / dấu rào
      const dl=chars.map(c=>MT_DELIM[code(c)]);
      let lf=(v&1)?(dl[0]!==undefined?dl[0]:MT_FENCE[sel][0]):'.',rt=(v&2)?(dl[(v&1)?1:0]!==undefined?dl[(v&1)?1:0]:MT_FENCE[sel][1]):'.';
      const main=ls[0],kids=main?main.c:[];
      if(kids.length===1&&kids[0].k==='matrix'&&lf!=='.'&&rt!=='.'){
        const env={'(|)':'pmatrix','[|]':'bmatrix','|||':'vmatrix','\\{ |\\} ':'Bmatrix','\\| |\\| ':'Vmatrix'}[lf+'|'+rt];
        if(env){const m=matrix(kids[0]);return m.replace('{matrix}','{'+env+'}').replace('{matrix}','{'+env+'}')}}
      if(kids.length===1&&kids[0].k==='pile'&&lf==='\\{ '&&rt==='.')return '\\begin{cases} '+pile(kids[0],true)+' \\end{cases}';
      if(kids.length===1&&kids[0].k==='pile'&&lf==='.'&&rt==='\\} ')return '\\begin{rcases} '+pile(kids[0],true)+' \\end{rcases}';
      return '\\left'+lf.trim()+' '+l(0)+' \\right'+rt.trim()}
    switch(sel){
      case 10:{const idx=ls[1]&&!ls[1].nul?l(1):'';return idx?'\\sqrt['+idx+']{'+l(0)+'}':'\\sqrt{'+l(0)+'}'}
      case 11:return '\\frac{'+l(0)+'}{'+l(1)+'}';
      case 12:return '\\underline{'+l(0)+'}';
      case 13:return '\\overline{'+l(0)+'}';
      case 14:{ // mũi tên có chữ trên/dưới
        if(chars.length!==1)fail('Mũi tên');const a=code(chars[0]),top=l(0),bot=l(1);
        const R={0x2192:'\\xrightarrow',0x2190:'\\xleftarrow',0x21D2:'\\xRightarrow',0x21D0:'\\xLeftarrow',0x2194:'\\xleftrightarrow',0x21CC:'\\xrightleftharpoons'};
        const arr=MT_SYM[a];if(!arr)fail('Mũi tên lạ');
        if(!top&&!bot)return arr;
        if(R[a]&&(a===0x2192||a===0x2190||a===0x2194||a===0x21CC)){return R[a]+(bot?'['+bot+']':'')+'{'+top+'}'}
        return '\\overset{'+top+'}{\\underset{'+bot+'}{'+arr.trim()+'}}'}
      case 15:case 16:case 17:case 18:case 19:case 20:{
        const defs={15:'\\int ',16:'\\sum ',17:'\\prod ',18:'\\coprod ',19:'\\bigcup ',20:'\\bigcap '};
        let op=defs[sel];const c0=chars.find(c=>code(c)>=0x222B&&code(c)<=0x2230);
        if(sel===15&&c0)op={0x222B:'\\int ',0x222C:'\\iint ',0x222D:'\\iiint ',0x222E:'\\oint ',0x222F:'\\oiint ',0x2230:'\\oiiint '}[code(c0)];
        const lo=ls[1]&&!ls[1].nul?l(1):'',up=ls[2]&&!ls[2].nul?l(2):'';
        return op.trim()+(lo?'_{'+lo+'}':'')+(up?'^{'+up+'}':'')+' '+l(0)}
      case 23:{const nm=l(0),lo=ls[1]&&!ls[1].nul?l(1):'',up=ls[2]&&!ls[2].nul?l(2):'';return nm+(lo?'_{'+lo+'}':'')+(up?'^{'+up+'}':'')+' '}
      case 31:{ // vectơ
        const e=l(0),c=chars[0]?code(chars[0]):0;let L=!!(v&1),R=!!(v&2);
        if(c===0x2190||c===0x20D6)L=true,R=false;else if(c===0x2192||c===0x20D7)R=true,L=false;else if(c===0x2194||c===0x20E1)L=R=true;
        if(!L&&!R)R=true;
        const un=!!(v&4);return (un?(L&&R?'\\underleftrightarrow':L?'\\underleftarrow':'\\underrightarrow'):(L&&R?'\\overleftrightarrow':L?'\\overleftarrow':'\\overrightarrow'))+'{'+e+'}'}
      case 32:{const e=l(0);return mtSingle(e)?'\\tilde{'+e+'}':'\\widetilde{'+e+'}'}
      case 33:{const e=l(0);return mtSingle(e)?'\\hat{'+e+'}':'\\widehat{'+e+'}'}
      case 34:return '\\overset{\\frown}{'+l(0)+'}';
      case 35:return l(0);
      case 36:return '\\cancel{'+l(0)+'}';
      case 37:return '\\boxed{'+l(0)+'}';
      default:fail('Mẫu '+sel+'/'+v+' chưa hỗ trợ')}}
  const s=seq(top,{}).replace(/\s+/g,' ').replace(/\s+([}\]),;])/g,'$1').replace(/\{\s+/g,'{').trim();
  return s}

function mathtypeToLatex(bin){
  const st={unk:0};
  try{const s=oleStream(bin,'Equation Native');if(!s)return {tex:null,why:'Không phải OLE MathType'};
    const t=mtefRead(s),tex=mtefTex(t,st);return {tex:tex,unk:st.unk}}
  catch(e){return {tex:null,why:e.message}}}

/* Đổi công thức Equation trong .docx thành ký hiệu giữ chỗ để thư viện đọc Word (mammoth) không làm mất */
async function texifyDocx(buf){
  const res={buf,maths:[],mt:0,mtOk:0,mtUnk:0,mtWhy:[],hf:0,fail:0,bad:0};
  let z;try{z=await JSZip.loadAsync(buf)}catch(e){return res}
  let changed=false;
  for(const p of ['word/document.xml','word/footnotes.xml','word/endnotes.xml']){
    const f=z.file(p);if(!f)continue;const xml=await f.async('string');
    if(xml.indexOf('officeDocument/2006/math')<0&&xml.indexOf('<w:object')<0)continue;
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.getElementsByTagName('parsererror').length){res.fail+=(xml.match(/<m:oMath[ >]/g)||[]).length;continue}
    const mkRun=txt=>{const r=doc.createElementNS(WNS,'w:r'),t=doc.createElementNS(WNS,'w:t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=txt;r.appendChild(t);return r};
    const paras=Array.from(doc.getElementsByTagNameNS(MNS,'oMathPara')),
      inl=Array.from(doc.getElementsByTagNameNS(MNS,'oMath')).filter(o=>!(o.parentNode&&o.parentNode.namespaceURI===MNS&&o.parentNode.localName==='oMathPara')),
      items=paras.map(e=>({e,d:true})).concat(inl.map(e=>({e,d:false})));
    const objs=Array.from(doc.getElementsByTagNameNS(WNS,'object')).filter(o=>o.parentNode&&Array.from(o.getElementsByTagName('*')).some(e=>e.localName==='OLEObject'&&/Equation|MathType/i.test(e.getAttribute('ProgID')||''))).map(e=>({e,o:true}));
    if(objs.length){ // đọc dữ liệu MathType (file .bin nhúng) cho từng đối tượng
      const rf=z.file(p.replace(/^word\//,'word/_rels/')+'.rels'),rels={};
      if(rf){const rd=new DOMParser().parseFromString(await rf.async('string'),'application/xml');Array.from(rd.getElementsByTagName('Relationship')).forEach(r=>{rels[r.getAttribute('Id')]=r.getAttribute('Target')})}
      for(const it of objs){it.mt=null;
        try{const ole=Array.from(it.e.getElementsByTagName('*')).find(e=>e.localName==='OLEObject'),
            rid=ole&&(ole.getAttributeNS(RNS,'id')||ole.getAttribute('r:id')),tg=rid&&rels[rid];
          if(tg){const path=tg.charAt(0)==='/'?tg.slice(1):'word/'+tg.replace(/^\.\//,''),bf=z.file(path);
            if(bf)it.mt=mathtypeToLatex(new Uint8Array(await bf.async('arraybuffer')))}
        }catch(er){it.mt=null}}}
    const all=items.concat(objs).sort((x,y)=>x.e.compareDocumentPosition(y.e)&4?-1:1);
    all.forEach(it=>{
      if(it.o){const i=res.maths.length,m=it.mt;
        if(m&&m.tex){res.maths.push({tex:m.tex,d:false,fromMt:true});res.mtOk++;if(m.unk)res.mtUnk++;if(!texSane(m.tex))res.bad++}
        else{res.maths.push({tex:null,mt:true});res.mt++;if(m&&m.why)res.mtWhy.push(m.why)}
        it.e.parentNode.replaceChild(mkRun(PH(i)),it.e);return}
      let tex=null;
      try{tex=it.d?ommlParaToLatex(it.e):ommlToLatex(it.e);if(tex&&!texSane(tex)){res.bad++}}catch(er){tex=null}
      const i=res.maths.length;res.maths.push({tex,d:it.d});if(it.e.parentNode)it.e.parentNode.replaceChild(mkRun(PH(i)),it.e)});
    if(all.length){z.file(p,new XMLSerializer().serializeToString(doc));changed=true}}
  for(const nm of Object.keys(z.files)){if(/^word\/(header|footer)\d*\.xml$/.test(nm)){const x=await z.file(nm).async('string');res.hf+=(x.match(/<m:oMath[ >]/g)||[]).length}}
  if(changed)res.buf=await z.generateAsync({type:'arraybuffer'});
  return res}
/* Thay ký hiệu giữ chỗ bằng công thức LaTeX. mode: html (\(..\)), cell (HTML, $..$), md/txt ($..$) */
function fillTex(s,maths,mode){
  const isH=mode==='html'||mode==='cell';
  return s.replace(PHRE,(m,i)=>{const x=maths[+i];if(!x)return '';
    if(x.mt||x.tex===null)return '[⚠ công thức '+(x.mt?'MathType ':'')+'#'+(+i+1)+' chưa chuyển được]';
    if(!x.tex)return '';
    if(mode==='html')return (x.d?'\\[':'\\(')+hx(x.tex)+(x.d?'\\]':'\\)');
    if(mode==='cell')return '$'+hx(x.tex)+'$';
    return x.d?'$$'+x.tex+'$$':'$'+x.tex+'$'})}
function texNotes(c,tx,target){
  const n=tx.maths.filter(x=>x.tex&&!x.fromMt).length;
  if(n)c.note(n+' công thức Word (Equation) đã được đổi sang LaTeX '+target+'.');
  if(tx.mtOk)c.note(tx.mtOk+' công thức MathType đã được đọc trực tiếp và đổi sang LaTeX '+target+'.');
  if(tx.mtUnk)c.warn(tx.mtUnk+' công thức MathType có ký hiệu hiếm (giữ nguyên ký tự gốc) — hãy đối chiếu với file gốc.');
  if(tx.mt)c.warn(tx.mt+' công thức MathType chưa đọc được'+(tx.mtWhy.length?' ('+Array.from(new Set(tx.mtWhy)).slice(0,3).join('; ')+')':'')+' — đã đánh dấu [⚠ …] trong kết quả. Cách khắc phục: trong Word chọn tab MathType → Convert Equations → Word equations (OMML), lưu lại rồi chuyển lại.');
  const nf=tx.maths.filter(x=>!x.mt&&x.tex===null).length+tx.fail;
  if(nf)c.warn(nf+' công thức không đọc được — đã đánh dấu [⚠ …], hãy đối chiếu với file gốc.');
  if(tx.bad)c.warn(tx.bad+' công thức có cấu trúc lạ (ngoặc/nhóm không cân) — hãy kiểm tra lại.');
  if(tx.hf)c.warn(tx.hf+' công thức trong header/footer không được chuyển.');
  c.warn('Công thức dạng ảnh chụp, hộp văn bản (text box) và ghi chú trong header/footer không được nhận dạng — hãy đối chiếu với file gốc.')}
async function guardNoMath(f,what){const tx=await texifyDocx(f.buf),n=tx.maths.length+tx.fail;if(n)throw new Error('File có '+n+' công thức (Equation/MathType) — kiểu chuyển "'+what+'" không giữ được công thức. Hãy dùng Word → HTML/Markdown/TXT (công thức dạng LaTeX) hoặc Lưu thành PDF ngay trong Microsoft Word.')}

async function mathCount(buf){try{const z=await JSZip.loadAsync(buf),f=z.file('word/document.xml');if(!f)return 0;return((await f.async('string')).match(/<m:oMath[ >]/g)||[]).length}catch(e){return 0}}
async function wordHtml(f,c,imgs,mode){
  if(mode===undefined)mode='cell';
  const m=await lib('mammoth'),opt={};
  if(imgs){let n=0;opt.convertImage=m.images.imgElement(im=>im.read('base64').then(d=>{const ext=(im.contentType.split('/')[1]||'png').replace('jpeg','jpg').replace(/\+.*/,'');const name='image-'+(++n)+'.'+ext;imgs.push({name:'images/'+name,data:d});return{src:'images/'+name}}))}
  const tx=await texifyDocx(f.buf);
  let r;try{r=await m.convertToHtml({arrayBuffer:tx.buf},opt)}catch(e){throw new Error('Không đọc được file Word (file hỏng hoặc có mật khẩu): '+e.message)}
  c.maths=tx.maths;texNotes(c,tx,c.texTarget||(mode==='html'?'(hiển thị bằng MathJax khi mở file HTML, cần mạng)':'($…$)'));
  c.warn('Hộp văn bản (text box), header/footer và định dạng phức tạp có thể không được giữ nguyên.');
  return mode?fillTex(r.value,tx.maths,mode):r.value}

/* ---------- Dựng trang A4 từ HTML (cho Word → PDF / Ảnh) ---------- */
async function renderPages(html,c,kind,math){
  const h2c=await lib('h2c'),PW=794,PH=1123,PAD=60,S=2,Hc=PH-2*PAD;
  const box=document.createElement('div');box.id='raRender';box.className='rcBox';
  box.style.cssText='position:fixed;left:-12000px;top:0;width:'+PW+'px;box-sizing:border-box;padding:0 76px;background:#fff;color:#000;font:14.5px/1.5 "Times New Roman",Times,serif';
  box.innerHTML='<style>#raRender p{margin:0 0 8px}#raRender h1,#raRender h2,#raRender h3,#raRender h4{margin:14px 0 8px;line-height:1.3}#raRender h1{font-size:22px}#raRender h2{font-size:19px}#raRender h3{font-size:17px}#raRender table{border-collapse:collapse;max-width:100%;margin:6px 0}#raRender td,#raRender th{border:1px solid #444;padding:3px 6px;vertical-align:top}#raRender img{max-width:100%;max-height:940px}#raRender ul,#raRender ol{margin:0 0 8px;padding-left:28px}#raRender mjx-container{margin:0!important;color:#000}#raRender mjx-container[display="true"]{display:block;text-align:center;margin:6px 0!important}#raRender mjx-container svg{max-width:100%}</style>'+html;
  document.body.appendChild(box);
  try{
    await Promise.all(Array.from(box.querySelectorAll('img')).map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));
    if(math){c.prog('Đang vẽ công thức...');await tick();const MJ=await mathjaxLib();
      try{await MJ.typesetPromise([box])}catch(e){throw new Error('MathJax không vẽ được công thức: '+(e&&e.message||e))}
      const er=box.querySelectorAll('mjx-merror,[data-mjx-error]').length;
      if(er)c.warn(er+' công thức bị MathJax báo lỗi cú pháp — hãy đối chiếu với file gốc.');
      await tick()}
    await tick();
    const kids=Array.from(box.children).filter(e=>e.tagName!=='STYLE'),total=box.scrollHeight,pages=[];let top=0;
    kids.forEach(k=>{const t=k.offsetTop,b=t+k.offsetHeight;
      if(b-top>Hc){if(t>top+1){pages.push([top,t]);top=t}while(b-top>Hc){pages.push([top,top+Hc]);top+=Hc}}});
    if(total-top>1||!pages.length)pages.push([top,Math.max(total,top+1)]);
    const out=[];
    for(let i=0;i<pages.length;i++){
      c.prog('Đang dựng trang '+(i+1)+'/'+pages.length+'...');await tick();
      const [y0,y1]=pages[i];
      const cv=await h2c(box,{scale:S,x:0,y:y0,width:PW,height:y1-y0,scrollX:0,scrollY:0,backgroundColor:'#fff',useCORS:true,logging:false,onclone:d=>{const e=d.getElementById('raRender');if(e){e.style.left='0px';e.style.top='0px'}}});
      const pg=document.createElement('canvas');pg.width=PW*S;pg.height=PH*S;const x=pg.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,pg.width,pg.height);x.drawImage(cv,0,PAD*S);
      out.push(kind==='jpg'?pg.toDataURL('image/jpeg',0.92):await new Promise(r=>pg.toBlob(b=>b.arrayBuffer().then(a=>r(new Uint8Array(a))),'image/png')))}
    return out}
  finally{box.remove()}}

/* ---------- HTML → Markdown ---------- */
const mdEsc=t=>t.replace(/([\\`*_\[\]])/g,'\\$1');
function inl(n){
  if(n.nodeType===3)return mdEsc(n.nodeValue.replace(/\s+/g,' '));
  if(n.nodeType!==1)return '';
  const t=n.tagName.toLowerCase(),k=()=>Array.from(n.childNodes).map(inl).join('');
  if(t==='strong'||t==='b'){const x=k().trim();return x?'**'+x+'**':''}
  if(t==='em'||t==='i'){const x=k().trim();return x?'*'+x+'*':''}
  if(t==='a'){const h=n.getAttribute('href')||'',x=k();return h?'['+x+']('+h+')':x}
  if(t==='img')return '!['+(n.getAttribute('alt')||'hình')+']('+(n.getAttribute('src')||'')+')';
  if(t==='br')return '  \n';
  if(t==='sup'||t==='sub')return '<'+t+'>'+k()+'</'+t+'>';
  return k()}
const inlKids=n=>Array.from(n.childNodes).map(inl).join('');
function mdList(l,d){let i=0;const o=[];
  Array.from(l.children).forEach(li=>{if(li.tagName.toLowerCase()!=='li')return;
    const mark=l.tagName.toLowerCase()==='ol'?(++i)+'. ':'- ',subs=[];let txt='';
    li.childNodes.forEach(c=>{if(c.nodeType===1&&/^(ul|ol)$/i.test(c.tagName))subs.push(c);else txt+=inl(c)});
    o.push('   '.repeat(d)+mark+txt.trim());subs.forEach(s=>o.push(mdList(s,d+1)))});
  return o.join('\n')}
function mdTable(t){
  const rows=Array.from(t.querySelectorAll('tr')).map(tr=>Array.from(tr.children).map(td=>inlKids(td).replace(/\s*\n\s*/g,' ').replace(/\|/g,'\\|').trim()));
  const w=Math.max.apply(null,[0].concat(rows.map(r=>r.length)));if(!rows.length||!w)return '';
  const row=r=>'| '+Array.from({length:w},(_,i)=>r[i]||'').join(' | ')+' |';
  return [row(rows[0]),'|'+' --- |'.repeat(w)].concat(rows.slice(1).map(row)).join('\n')}
function htmlToMd(body){const o=[];
  Array.from(body.children).forEach(e=>{const t=e.tagName.toLowerCase();let s='';
    if(/^h[1-6]$/.test(t))s='#'.repeat(+t[1])+' '+inlKids(e).trim();
    else if(t==='ul'||t==='ol')s=mdList(e,0);
    else if(t==='table')s=mdTable(e);
    else s=inlKids(e).trim();
    if(s)o.push(s)});
  return o.join('\n\n')+'\n'}

/* ---------- Bảng → mảng 2 chiều (Excel) ---------- */
function tblAoa(t,raw){const a=[],mg=[];
  Array.from(t.querySelectorAll('tr')).filter(tr=>tr.closest('table')===t).forEach((tr,r)=>{a[r]=a[r]||[];let c=0;
    Array.from(tr.children).forEach(td=>{while(a[r][c]!==undefined)c++;
      const cs=Math.max(1,parseInt(td.getAttribute('colspan'),10)||1),rs=Math.max(1,parseInt(td.getAttribute('rowspan'),10)||1);
      let v=td.textContent.replace(/\s+/g,' ').trim();if(!raw&&/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)&&v.length<=15)v=+v;
      a[r][c]=v;for(let k=1;k<cs;k++)a[r][c+k]='';
      for(let q=1;q<rs;q++){a[r+q]=a[r+q]||[];for(let k=0;k<cs;k++)a[r+q][c+k]=''}
      if(cs>1||rs>1)mg.push({s:{r:r,c:c},e:{r:r+rs-1,c:c+cs-1}});c+=cs})});
  const w=Math.max.apply(null,[0].concat(a.map(r=>r.length)));
  return{aoa:a.map(r=>Array.from({length:w},(_,i)=>r[i]===undefined?'':r[i])),merges:mg}}
function xlsxBytes(sheets){const wb=XLSX.utils.book_new(),used=new Set();
  sheets.forEach(s=>{let nm=s.name.replace(/[:\\\/?*\[\]]/g,' ').slice(0,31),k=2;while(used.has(nm.toLowerCase()))nm=nm.slice(0,28)+' '+(k++);used.add(nm.toLowerCase());
    const ws=s.ws||XLSX.utils.aoa_to_sheet(s.aoa);if(s.merges&&s.merges.length)ws['!merges']=s.merges;XLSX.utils.book_append_sheet(wb,ws,nm)});
  return new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}))}

/* ---------- Ảnh ---------- */
async function loadImg(buf){const u=URL.createObjectURL(new Blob([buf])),im=new Image();
  try{await new Promise((ok,no)=>{im.onload=ok;im.onerror=()=>no(new Error('Không đọc được ảnh (định dạng không hỗ trợ, vd HEIC).'));im.src=u})}finally{URL.revokeObjectURL(u)}return im}
const cvOf=(im,max,bg)=>{let w=im.naturalWidth,h=im.naturalHeight;const f=Math.min(1,(max||1e9)/Math.max(w,h));w=Math.round(w*f);h=Math.round(h*f);
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');if(bg){x.fillStyle='#fff';x.fillRect(0,0,w,h)}x.drawImage(im,0,0,w,h);return cv};
async function pageCanvas(pg,scale){const vp=pg.getViewport({scale}),cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
  const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);await pg.render({canvasContext:x,viewport:vp}).promise;return cv}
const cvPng=cv=>new Promise(r=>cv.toBlob(b=>b.arrayBuffer().then(a=>r(new Uint8Array(a))),'image/png'));

/* ====================== CÁC PHÉP CHUYỂN ====================== */
const RUN={
  async w2pdf(fs,c){const f=fs[0];c.texTarget='(đã vẽ thành công thức trong PDF bằng MathJax)';const html=await wordHtml(f,c,null,'html');const pages=await renderPages(html,c,'jpg',!!(c.maths&&c.maths.some(x=>x.tex))),J=await lib('jspdf');
    const pdf=new J({unit:'mm',format:'a4'});pages.forEach((d,i)=>{if(i)pdf.addPage();pdf.addImage(d,'JPEG',0,0,210,297)});
    c.warn('PDF dựng từ ảnh trang: hiển thị đúng chữ Việt và công thức nhưng không bôi chọn/copy chữ được. Bố cục có thể khác Word gốc; muốn giống 100% hãy dùng File → Save As → PDF trong Word.');
    return[{name:c.base+'.pdf',data:new Uint8Array(pdf.output('arraybuffer'))}]},
  async w2img(fs,c){const f=fs[0];c.texTarget='(đã vẽ thành công thức trong ảnh bằng MathJax)';const html=await wordHtml(f,c,null,'html'),pages=await renderPages(html,c,'png',!!(c.maths&&c.maths.some(x=>x.tex)));
    return pages.map((d,i)=>({name:c.base+'_trang'+String(i+1).padStart(2,'0')+'.png',data:d}))},
  async w2txt(fs,c){const m=await lib('mammoth'),f=fs[0],tx=await texifyDocx(f.buf);let r;try{r=await m.extractRawText({arrayBuffer:tx.buf})}catch(e){throw new Error('Không đọc được file Word: '+e.message)}
    texNotes(c,tx,'($…$)');r.value=fillTex(r.value,tx.maths,'txt');
    return[{name:c.base+'.txt',data:new TextEncoder().encode('\ufeff'+r.value.replace(/\n{3,}/g,'\n\n').trim()+'\n')}]},
  async w2html(fs,c){const html=await wordHtml(fs[0],c,null,'html');
    const doc='<!DOCTYPE html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+hx(c.base)+'</title><style>body{font-family:"Times New Roman",serif;max-width:820px;margin:0 auto;padding:16px;line-height:1.6}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #888;padding:4px 8px;vertical-align:top}img{max-width:100%;height:auto}</style>'+(c.maths&&c.maths.some(x=>x.tex)?'<script async src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-chtml.js"></script>':'')+'</head><body>\n'+html+'\n</body></html>';
    return[{name:c.base+'.html',data:new TextEncoder().encode(doc)}]},
  async w2md(fs,c){const imgs=[],html=await wordHtml(fs[0],c,imgs,null),md=fillTex(htmlToMd(parseHtml(html)),c.maths,'md');
    if(!imgs.length)return[{name:c.base+'.md',data:new TextEncoder().encode(md)}];
    const z=new JSZip();z.file(c.base+'.md',md);imgs.forEach(i=>z.file(i.name,i.data,{base64:true}));
    c.warn('Tài liệu có hình: kết quả là file .zip gồm '+c.base+'.md và thư mục images/.');
    return[{name:c.base+'_markdown.zip',data:await z.generateAsync({type:'uint8array',compression:'DEFLATE'})}]},
  async w2xlsx(fs,c){const html=await wordHtml(fs[0],c,null,'cell'),body=parseHtml(html),sheets=[];
    Array.from(body.querySelectorAll('table')).filter(t=>!t.parentElement.closest('table')).forEach((t,i)=>{const r=tblAoa(t);if(r.aoa.length)sheets.push({name:'Bảng '+(i+1),aoa:r.aoa,merges:r.merges})});
    if(!sheets.length){const rows=Array.from(body.children).map(e=>[e.textContent.replace(/\s+/g,' ').trim()]).filter(r=>r[0]);if(!rows.length)throw new Error('Tài liệu không có nội dung để chuyển.');
      sheets.push({name:'Văn bản',aoa:rows});c.warn('Không có bảng nào trong file — mỗi đoạn văn được đặt vào một dòng của sheet "Văn bản".')}
    else c.warn('Chỉ chuyển các bảng ('+sheets.length+' bảng, mỗi bảng một sheet); văn bản ngoài bảng không được đưa vào Excel.');
    return[{name:c.base+'.xlsx',data:xlsxBytes(sheets)}]},
  async w2pptx(fs,c){await guardNoMath(fs[0],'Word → PPTX');const html=await wordHtml(fs[0],c,null),body=parseHtml(html),P=await lib('pptx'),pp=new P();pp.layout='LAYOUT_16x9';
    const F='Arial',TC='1F3864';let cur={title:'',items:[]};
    const head=(s,t)=>s.addText(t,{x:0.5,y:0.3,w:9,h:0.8,fontSize:26,bold:true,fontFace:F,color:TC,fit:'shrink'});
    const t0=pp.addSlide();t0.addText(c.base,{x:0.7,y:1.8,w:8.6,h:1.6,fontSize:36,bold:true,fontFace:F,color:TC,align:'center',valign:'middle',fit:'shrink'});
    const flush=()=>{if(!cur.items.length)return;let chunk=[],len=0,part=0;
      const emit=()=>{if(!chunk.length)return;const s=pp.addSlide();head(s,(cur.title||c.base)+(part?' (tiếp)':''));
        s.addText(chunk.map(it=>({text:it.text,options:{bullet:it.bullet?true:false,indentLevel:it.lvl||0,breakLine:true,paraSpaceAfter:6}})),{x:0.5,y:1.2,w:9,h:4.1,fontSize:18,fontFace:F,valign:'top',fit:'shrink'});
        chunk=[];len=0;part++};
      cur.items.forEach(it=>{if(chunk.length&&(chunk.length>=8||len+it.text.length>650))emit();chunk.push(it);len+=it.text.length});emit();cur.items=[]};
    const walkList=(l,d)=>Array.from(l.children).forEach(li=>{if(li.tagName.toLowerCase()!=='li')return;let txt='';
      li.childNodes.forEach(n=>{if(!(n.nodeType===1&&/^(ul|ol)$/i.test(n.tagName)))txt+=n.textContent});
      txt=txt.replace(/\s+/g,' ').trim();if(txt)cur.items.push({text:txt,bullet:true,lvl:Math.min(d,3)});
      li.querySelectorAll(':scope > ul, :scope > ol').forEach(s=>walkList(s,d+1))});
    let skipped=0;
    for(const e of Array.from(body.children)){const t=e.tagName.toLowerCase(),tx=e.textContent.replace(/\s+/g,' ').trim();
      if(/^h[1-3]$/.test(t)){flush();cur.title=tx||cur.title}
      else if(/^h[4-6]$/.test(t)){if(tx)cur.items.push({text:tx})}
      else if(t==='ul'||t==='ol')walkList(e,0);
      else if(t==='table'){flush();const r=tblAoa(e,1).aoa;if(!r.length)continue;
        for(let i=(r.length>1?1:0),part=0;i<r.length||!part;part++){const rows=r.slice(i,i+9);if(r.length>1)rows.unshift(r[0]);const s=pp.addSlide();head(s,(cur.title||c.base)+(part?' (tiếp)':''));
          s.addTable(rows.map((row,ri)=>row.map(v=>({text:String(v),options:{bold:r.length>1&&ri===0,fontSize:12,fontFace:F,valign:'middle',border:{type:'solid',pt:0.5,color:'888888'}}}))),{x:0.5,y:1.2,w:9});
          i+=9;if(i>=r.length)break}}
      else{const im=e.querySelector('img');
        if(im){const src=im.getAttribute('src')||'';
          if(/^data:image\/(png|jpe?g|gif);base64,/.test(src)){flush();try{const el=await loadImg(bytesOf(src)),mw=9,mh=4.1,f=Math.min(mw/el.naturalWidth,mh/el.naturalHeight),w=el.naturalWidth*f,h=el.naturalHeight*f,s=pp.addSlide();
              head(s,cur.title||c.base);s.addImage({data:src.replace(/^data:/,''),x:0.5+(mw-w)/2,y:1.2+(mh-h)/2,w:w,h:h})}catch(er){skipped++}}
          else skipped++}
        if(tx)cur.items.push({text:tx})}}
    flush();if(skipped)c.warn(skipped+' hình (SVG/EMF/WMF hoặc lỗi) không đưa được vào PPTX.');
    c.warn('PPTX tách slide theo Heading 1–3 của Word (nếu file không dùng Heading, toàn bộ nội dung nằm dưới slide tiêu đề đầu); chữ dài được tự chia thêm slide. Hãy chỉnh lại bố cục/giao diện trong PowerPoint.');
    return[{name:c.base+'.pptx',data:await pp.write({outputType:'uint8array'})}]},
  async p2img(fs,c){const p=await pdfLib(),f=fs[0];let pdf;try{pdf=await p.getDocument({data:new Uint8Array(f.buf)}).promise}catch(e){throw new Error('Không đọc được PDF: '+e.message)}
    const out=[];for(let i=1;i<=pdf.numPages;i++){c.prog('Trang '+i+'/'+pdf.numPages+'...');await tick();const pg=await pdf.getPage(i);
      out.push({name:c.base+'_trang'+String(i).padStart(2,'0')+'.png',data:await cvPng(await pageCanvas(pg,2))})}
    return out},
  async p2docx(fs,c){const p=await pdfLib(),f=fs[0];let pdf;try{pdf=await p.getDocument({data:new Uint8Array(f.buf)}).promise}catch(e){throw new Error('Không đọc được PDF: '+e.message)}
    const blocks=[],scanned=[];
    for(let i=1;i<=pdf.numPages;i++){c.prog('Trang '+i+'/'+pdf.numPages+'...');await tick();const pg=await pdf.getPage(i),tc=await pg.getTextContent(),lines=toLines(tc.items);
      const chars=lines.reduce((a,l)=>a+lineText(l).length,0);
      if(chars<15){const cv=await pageCanvas(pg,1.6);blocks.push({data:bytesOf(cv.toDataURL('image/jpeg',0.85)),ext:'jpg',w:cv.width/1.6*96/72,h:cv.height/1.6*96/72});scanned.push(i)}
      else toParas(lines).forEach(t=>blocks.push({t}))}
    if(scanned.length)c.warn('Trang '+scanned.slice(0,10).join(', ')+(scanned.length>10?'…':'')+' là bản quét/ảnh (không có chữ) — được chèn dạng hình, chưa nhận dạng chữ (OCR).');
    c.warn('PDF → Word chỉ lấy chữ và tự gom thành đoạn: bảng, cột, công thức, hình trong trang có chữ sẽ không giữ nguyên bố cục. Hãy đối chiếu với bản gốc.');
    return[{name:c.base+'.docx',data:await makeDocx(blocks)}]},
  async p2xlsx(fs,c){const p=await pdfLib(),f=fs[0];let pdf;try{pdf=await p.getDocument({data:new Uint8Array(f.buf)}).promise}catch(e){throw new Error('Không đọc được PDF: '+e.message)}
    const sheets=[];
    for(let i=1;i<=pdf.numPages;i++){c.prog('Trang '+i+'/'+pdf.numPages+'...');await tick();const pg=await pdf.getPage(i),tc=await pg.getTextContent(),lines=toLines(tc.items);
      const rows=lines.map(lineCells).filter(r=>r.some(x=>x));if(!rows.length)continue;
      const w=Math.max.apply(null,rows.map(r=>r.length));sheets.push({name:'Trang '+i,aoa:rows.map(r=>Array.from({length:w},(_,k)=>r[k]||''))})}
    if(!sheets.length)throw new Error('PDF không có chữ để chuyển (có thể là bản quét/ảnh).');
    c.warn('Cột được đoán theo khoảng cách giữa các cụm chữ, mỗi trang là một sheet; mọi ô là văn bản. Bảng phức tạp có thể lệch cột — hãy kiểm tra và chỉnh lại.');
    return[{name:c.base+'.xlsx',data:xlsxBytes(sheets)}]},
  async i2docx(fs,c){const blocks=[];
    for(const f of fs){const im=await loadImg(f.buf);let data,ext;
      if(/\.png$/i.test(f.name)){data=new Uint8Array(f.buf);ext='png'}
      else if(/\.jpe?g$/i.test(f.name)){data=new Uint8Array(f.buf);ext='jpg'}
      else{data=await cvPng(cvOf(im,0,false));ext='png'}
      blocks.push({data,ext,w:im.naturalWidth,h:im.naturalHeight})}
    c.warn('Ảnh được chèn vào Word dạng hình, chưa nhận dạng chữ (OCR) nên chưa sửa được chữ trong ảnh.');
    return[{name:c.base+'.docx',data:await makeDocx(blocks)}]},
  async i2pdf(fs,c){const J=await lib('jspdf');let pdf=null;
    for(const f of fs){const im=await loadImg(f.buf),cv=cvOf(im,3000,true),land=cv.width>cv.height,pw=land?297:210,ph=land?210:297;
      if(!pdf)pdf=new J({unit:'mm',format:'a4',orientation:land?'l':'p'});else pdf.addPage('a4',land?'l':'p');
      const r=Math.min((pw-16)/cv.width,(ph-16)/cv.height),w=cv.width*r,h=cv.height*r;
      pdf.addImage(cv.toDataURL('image/jpeg',0.9),'JPEG',(pw-w)/2,(ph-h)/2,w,h)}
    return[{name:c.base+'.pdf',data:new Uint8Array(pdf.output('arraybuffer'))}]}
};

/* ====================== BỔ SUNG: Excel / PPTX / văn bản / PDF / ảnh ====================== */
const px=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('XML không đọc được');return d};
const pad2=n=>String(n).padStart(2,'0');
const safeName=s=>String(s).replace(/[\\\/:*?"<>|]+/g,'_').trim()||'sheet';
function decodeText(buf,c){let s=new TextDecoder('utf-8').decode(buf);
  if((s.match(/\uFFFD/g)||[]).length>2){try{s=new TextDecoder('windows-1258').decode(buf);c.warn('File không phải UTF-8 — đã thử đọc bằng bảng mã Windows-1258 (tiếng Việt cũ); hãy kiểm tra lại dấu.')}catch(e){}}
  return s.replace(/^\uFEFF/,'')}
function readBook(buf,asText,c){
  if(typeof XLSX==='undefined')throw new Error('Chưa tải được thư viện SheetJS (XLSX).');
  try{return asText?XLSX.read(decodeText(buf,c),{type:'string'}):XLSX.read(new Uint8Array(buf),{type:'array',cellDates:true})}catch(e){throw new Error('Không đọc được file bảng tính: '+e.message)}}
function sheetAoa(ws){const a=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
  while(a.length&&a[a.length-1].every(v=>String(v).trim()===''))a.pop();
  let w=0;a.forEach(r=>{for(let k=r.length;k>0;k--){if(String(r[k-1]).trim()!==''){w=Math.max(w,k);break}}});
  return a.map(r=>Array.from({length:w},(_,k)=>String(r[k]===undefined?'':r[k])))}
const tHtml=a=>'<table>'+a.map((r,i)=>'<tr>'+r.map(v=>'<'+(i?'td':'th')+'>'+hx(v)+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('')+'</table>';
function bookHtml(wb){let n=0,h='';wb.SheetNames.forEach(nm=>{const a=sheetAoa(wb.Sheets[nm]);if(!a.length||!a[0].length)return;n++;h+=(wb.SheetNames.length>1?'<h2>'+hx(nm)+'</h2>':'')+tHtml(a)});
  if(!n)throw new Error('File Excel không có dữ liệu.');return h}
async function pdfFromPages(pages){const J=await lib('jspdf'),pdf=new J({unit:'mm',format:'a4'});pages.forEach((d,i)=>{if(i)pdf.addPage();pdf.addImage(d,'JPEG',0,0,210,297)});return new Uint8Array(pdf.output('arraybuffer'))}

/* PPTX */
async function pptxSlides(buf){
  let z;try{z=await JSZip.loadAsync(buf)}catch(e){throw new Error('Không đọc được file PPTX: '+e.message)}
  const pf=z.file('ppt/presentation.xml'),rf=z.file('ppt/_rels/presentation.xml.rels');if(!pf||!rf)throw new Error('Không phải file .pptx hợp lệ.');
  const NA='http://schemas.openxmlformats.org/drawingml/2006/main',NP='http://schemas.openxmlformats.org/presentationml/2006/main',NR='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const pd=px(await pf.async('string')),rd=px(await rf.async('string')),map={},out=[];
  Array.from(rd.getElementsByTagName('Relationship')).forEach(r=>map[r.getAttribute('Id')]=r.getAttribute('Target'));
  const ids=Array.from(pd.getElementsByTagNameNS(NP,'sldId')).map(s=>s.getAttributeNS(NR,'id'));
  for(let i=0;i<ids.length;i++){const t=map[ids[i]];if(!t)continue;const f=z.file(t.charAt(0)==='/'?t.slice(1):'ppt/'+t);if(!f)continue;
    const d=px(await f.async('string')),paras=[];
    Array.from(d.getElementsByTagNameNS(NA,'p')).forEach(p=>{const s=Array.from(p.getElementsByTagNameNS(NA,'t')).map(x=>x.textContent).join('').trim();if(s)paras.push(s)});
    out.push({n:i+1,paras})}
  if(!out.length)throw new Error('Không tìm thấy slide nào.');return out}
async function zipMedia(buf,dir,c){
  let z;try{z=await JSZip.loadAsync(buf)}catch(e){throw new Error('Không đọc được file: '+e.message)}
  const names=Object.keys(z.files).filter(n=>n.indexOf(dir)===0&&!z.files[n].dir);
  if(!names.length)throw new Error('File không có hình nhúng nào.');
  const o=new JSZip();let emf=0;
  for(const n of names){const nm=n.slice(dir.length);if(/\.(emf|wmf)$/i.test(nm))emf++;o.file(nm,await z.file(n).async('uint8array'))}
  if(emf)c.warn(emf+' hình dạng EMF/WMF (vector của Office) — nhiều phần mềm xem ảnh không mở được; hãy mở bằng Word/PowerPoint hoặc chuyển sang PNG.');
  c.note(names.length+' hình được trích ra.');
  return[{name:c.base+'_hinh.zip',data:await o.generateAsync({type:'uint8array'})}]}

/* Markdown → khối Word */
function mdInline(s,st){st=st||{};const out=[],re=/\*\*(.+?)\*\*|__(.+?)__|\*([^*\s][^*]*?)\*|`([^`]+)`|!\[[^\]]*\]\([^)]*\)|\[([^\]]+)\]\(([^)]*)\)/,un=t=>t.replace(/\\([\\`*_{}\[\]()#+\-.!|])/g,'$1');
  let rest=s;
  while(rest){const m=re.exec(rest);if(!m){out.push({t:un(rest),b:st.b,i:st.i});break}
    if(m.index)out.push({t:un(rest.slice(0,m.index)),b:st.b,i:st.i});
    if(m[1]!==undefined||m[2]!==undefined)mdInline(m[1]!==undefined?m[1]:m[2],{b:true,i:st.i}).forEach(r=>out.push(r));
    else if(m[3]!==undefined)mdInline(m[3],{b:st.b,i:true}).forEach(r=>out.push(r));
    else if(m[4]!==undefined)out.push({t:m[4],b:st.b,i:st.i});
    else if(m[5]!==undefined)mdInline(m[5],st).forEach(r=>out.push(r));
    rest=rest.slice(m.index+m[0].length)}
  return out}
function mdBlocks(src){
  const L=src.replace(/\r\n?/g,'\n').split('\n'),B=[];let para=[],code=false;
  const flush=()=>{if(para.length){B.push({runs:mdInline(para.join(' '))});para=[]}};
  for(let i=0;i<L.length;i++){const l=L[i];let m;
    if(/^\s*```/.test(l)){flush();code=!code;continue}
    if(code){B.push({t:l});continue}
    if(!l.trim()){flush();continue}
    if((m=/^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))){flush();B.push({runs:mdInline(m[2]),h:Math.min(m[1].length,3)});continue}
    if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){flush();continue}
    if(/^\s*\|.*\|\s*$/.test(l)&&i+1<L.length&&/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(L[i+1])){flush();
      const split=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim().replace(/\*\*|`/g,'')),rows=[split(l)];
      i+=2;while(i<L.length&&L[i].trim()&&/\|/.test(L[i])){rows.push(split(L[i]));i++}i--;B.push({tbl:rows,hdr:true});continue}
    if((m=/^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l))){flush();const d=Math.min(Math.floor(m[1].replace(/\t/g,'    ').length/2),4);
      B.push({runs:[{t:(/\d/.test(m[2])?m[2]:'•')+' '}].concat(mdInline(m[3])),ind:d+1});continue}
    if((m=/^>\s?(.*)$/.exec(l))){flush();B.push({runs:mdInline(m[1]),ind:1});continue}
    para.push(l.trim())}
  flush();return B}

/* HTML → khối Word */
const BLK=/^(p|div|h[1-6]|ul|ol|table|pre|blockquote|section|article|li)$/;
async function htmlBlocks(root){
  const B=[];let skipped=0;
  const runs=(n,st,acc)=>{n.childNodes.forEach(ch=>{
    if(ch.nodeType===3){const t=ch.nodeValue.replace(/\s+/g,' ');if(t)acc.push({t,b:st.b,i:st.i,sup:st.sup,sub:st.sub})}
    else if(ch.nodeType===1){const g=ch.tagName.toLowerCase();if(g==='br'){acc.push({br:1});return}
      if(/^(script|style|img|ul|ol|table)$/.test(g))return;
      runs(ch,{b:st.b||/^(b|strong|th|h[1-6])$/.test(g),i:st.i||/^(i|em)$/.test(g),sup:st.sup||g==='sup',sub:st.sub||g==='sub'},acc)}})};
  const trim=a=>{while(a.length&&!a[0].br&&!a[0].t.trim())a.shift();if(a.length&&a[0].t)a[0].t=a[0].t.replace(/^\s+/,'');
    while(a.length&&!a[a.length-1].br&&!a[a.length-1].t.trim())a.pop();if(a.length&&a[a.length-1].t)a[a.length-1].t=a[a.length-1].t.replace(/\s+$/,'');return a};
  const para=(el,extra)=>{const a=[];runs(el,{},a);trim(a);if(a.length)B.push(Object.assign({runs:a},extra||{}))};
  const imgs=async list=>{for(const im of list){const src=im.getAttribute('src')||'';
    if(/^data:image\/(png|jpe?g);base64,/.test(src)){try{const bytes=bytesOf(src),el=await loadImg(bytes);B.push({data:bytes,ext:/^data:image\/png/.test(src)?'png':'jpg',w:el.naturalWidth,h:el.naturalHeight})}catch(e){skipped++}}else skipped++}};
  const list=async(l,d)=>{let n=0;
    for(const li of Array.from(l.children)){if(li.tagName.toLowerCase()!=='li')continue;
      const a=[{t:l.tagName.toLowerCase()==='ol'?(++n)+'. ':'• '}];runs(li,{},a);trim(a);B.push({runs:a,ind:d+1});await imgs(Array.from(li.querySelectorAll('img')));
      for(const s of Array.from(li.children).filter(x=>/^(ul|ol)$/i.test(x.tagName)))await list(s,d+1)}};
  const walk=async el=>{for(const n of Array.from(el.childNodes)){
    if(n.nodeType===3){const t=n.nodeValue.replace(/\s+/g,' ').trim();if(t)B.push({t});continue}
    if(n.nodeType!==1)continue;const g=n.tagName.toLowerCase();
    if(/^(script|style|head|title|meta|link|noscript)$/.test(g))continue;
    if(/^h[1-6]$/.test(g)){para(n,{h:Math.min(+g[1],3)});await imgs(Array.from(n.querySelectorAll('img')))}
    else if(g==='ul'||g==='ol')await list(n,0);
    else if(g==='table'){const r=tblAoa(n,1).aoa.map(x=>x.map(String));if(r.length)B.push({tbl:r,hdr:!!n.querySelector('tr th')})}
    else if(g==='pre')n.textContent.split('\n').forEach(l=>B.push({t:l}));
    else if(g==='img')await imgs([n]);
    else if(Array.from(n.children).some(ch=>BLK.test(ch.tagName.toLowerCase())))await walk(n);
    else{para(n,g==='blockquote'?{ind:1}:{});await imgs(Array.from(n.querySelectorAll('img')))}}};
  await walk(root);return{blocks:B,skipped}}

/* PDF (pdf-lib) */
const parseRange=(s,n)=>{const set=new Set();
  s.split(',').forEach(tk=>{tk=tk.trim();if(!tk)return;const m=/^(\d+)(?:\s*-\s*(\d+))?$/.exec(tk);if(!m)throw new Error('Khoảng trang không hợp lệ: "'+tk+'" (ví dụ đúng: 1-3,5,8-10).');
    const a=+m[1],b=m[2]?+m[2]:a;if(a<1||b<a||b>n)throw new Error('Trang "'+tk+'" nằm ngoài phạm vi (PDF có '+n+' trang).');for(let k=a;k<=b;k++)set.add(k-1)});
  return Array.from(set).sort((x,y)=>x-y)};
async function pdfLoad(P,f){try{return await P.PDFDocument.load(f.buf,{ignoreEncryption:true})}catch(e){throw new Error('Không đọc được PDF "'+f.name+'": '+e.message)}}
async function pdfCopy(P,src,idx){const d=await P.PDFDocument.create(),pg=await d.copyPages(src,idx);pg.forEach(p=>d.addPage(p));return d}
async function pdfText(f,c){const p=await pdfLib();let pdf;try{pdf=await p.getDocument({data:new Uint8Array(f.buf)}).promise}catch(e){throw new Error('Không đọc được PDF: '+e.message)}
  const pages=[];for(let i=1;i<=pdf.numPages;i++){c.prog('Trang '+i+'/'+pdf.numPages+'...');await tick();const pg=await pdf.getPage(i),tc=await pg.getTextContent();pages.push(toParas(toLines(tc.items)))}
  return pages}

/* Ảnh: đổi định dạng / nén */
const IMGT={i2png:['image/png','png'],i2jpg:['image/jpeg','jpg'],i2webp:['image/webp','webp'],i2small:['image/jpeg','jpg'],heic2jpg:['image/jpeg','jpg']};
async function imgConvert(fs,c,type){
  const o=c.opt,T=IMGT[type],out=[];let before=0,after=0;
  for(const f of fs){let buf=f.buf;
    if(type==='heic2jpg'){const h=await lib('heic');let r;try{r=await h({blob:new Blob([buf]),toType:'image/jpeg',quality:0.92})}catch(e){throw new Error('Không đọc được ảnh HEIC "'+f.name+'": '+(e.message||e))}
      buf=await (Array.isArray(r)?r[0]:r).arrayBuffer()}
    const im=await loadImg(buf),cv=cvOf(im,o.max,T[0]!=='image/png'),blob=await new Promise(r=>cv.toBlob(r,T[0],o.q));
    if(!blob)throw new Error('Không xuất được ảnh "'+f.name+'".');
    let ext=T[1];if(blob.type!==T[0]){ext=blob.type==='image/png'?'png':ext;c.warn('Trình duyệt này không xuất được '+T[0].replace('image/','').toUpperCase()+' — ảnh được lưu dạng '+(blob.type||'khác')+'.')}
    const data=new Uint8Array(await blob.arrayBuffer());before+=f.size;
    if(type==='i2small'&&data.length>=buf.byteLength){after+=buf.byteLength;out.push({name:f.name,data:new Uint8Array(buf)});c.warn('"'+f.name+'" đã gọn sẵn — giữ nguyên bản gốc.');continue}
    after+=data.length;out.push({name:baseOf(f.name)+(type==='i2small'?'_nho':'')+'.'+ext,data})}
  if(type==='i2small')c.note('Dung lượng: '+fsz(before)+' → '+fsz(after)+' (giảm '+Math.max(0,Math.round((1-after/before)*100))+'%).');
  return out}

Object.assign(RUN,{
  async w2imgs(fs,c){return zipMedia(fs[0].buf,'word/media/',c)},
  async pp2img(fs,c){return zipMedia(fs[0].buf,'ppt/media/',c)},
  async pp2txt(fs,c){const s=await pptxSlides(fs[0].buf);
    c.warn('Chỉ lấy chữ trên slide (không lấy ghi chú, hình, biểu đồ).');
    return[{name:c.base+'.txt',data:new TextEncoder().encode('\ufeff'+s.map(x=>'--- Slide '+x.n+' ---\n'+x.paras.join('\n')).join('\n\n')+'\n')}]},
  async pp2docx(fs,c){const s=await pptxSlides(fs[0].buf),B=[];
    s.forEach(x=>{B.push({t:'Slide '+x.n,h:2});x.paras.forEach(t=>B.push({t}))});
    c.warn('Chỉ lấy chữ trên slide (không lấy ghi chú, hình, biểu đồ); mỗi slide là một mục tiêu đề.');
    return[{name:c.base+'.docx',data:await makeDocx(B)}]},
  async x2docx(fs,c){const wb=readBook(fs[0].buf,false,c),B=[];
    wb.SheetNames.forEach(nm=>{const a=sheetAoa(wb.Sheets[nm]);if(!a.length||!a[0].length)return;if(wb.SheetNames.length>1)B.push({t:nm,h:2});B.push({tbl:a,hdr:true})});
    if(!B.length)throw new Error('File Excel không có dữ liệu.');
    c.warn('Ô gộp (merge), màu nền, công thức và biểu đồ không được giữ; bảng quá nhiều cột sẽ bị chật trong Word.');
    return[{name:c.base+'.docx',data:await makeDocx(B)}]},
  async x2pdf(fs,c){const wb=readBook(fs[0].buf,false,c),html='<style>#raRender td,#raRender th{word-break:break-word;font-size:11px}#raRender table{width:100%}</style>'+bookHtml(wb);
    const pages=await renderPages(html,c,'jpg');c.warn('Bảng rất rộng bị co chữ nhỏ; PDF dựng từ ảnh trang nên không bôi chọn/copy chữ được.');
    return[{name:c.base+'.pdf',data:await pdfFromPages(pages)}]},
  async x2html(fs,c){const wb=readBook(fs[0].buf,false,c),
    doc='<!DOCTYPE html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+hx(c.base)+'</title><style>body{font-family:Arial,sans-serif;padding:16px}table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #888;padding:4px 8px;vertical-align:top}th{background:#eee}</style></head><body>\n'+bookHtml(wb)+'\n</body></html>';
    return[{name:c.base+'.html',data:new TextEncoder().encode(doc)}]},
  async x2csv(fs,c){const wb=readBook(fs[0].buf,false,c),out=[];
    wb.SheetNames.forEach(nm=>{const a=sheetAoa(wb.Sheets[nm]);if(!a.length||!a[0].length)return;
      out.push({name:c.base+(wb.SheetNames.length>1?'_'+safeName(nm):'')+'.csv',data:new TextEncoder().encode('\ufeff'+XLSX.utils.sheet_to_csv(wb.Sheets[nm],{blankrows:false}))})});
    if(!out.length)throw new Error('File Excel không có dữ liệu.');c.note('CSV lưu UTF-8 có BOM để Excel đọc đúng tiếng Việt; công thức được xuất dạng giá trị.');return out},
  async x2json(fs,c){const wb=readBook(fs[0].buf,false,c),o={};
    wb.SheetNames.forEach(nm=>{o[nm]=XLSX.utils.sheet_to_json(wb.Sheets[nm],{defval:''})});
    c.note('Dòng đầu mỗi sheet được dùng làm tên trường.');
    return[{name:c.base+'.json',data:new TextEncoder().encode(JSON.stringify(o,null,2))}]},
  async csv2xlsx(fs,c){const wb=readBook(fs[0].buf,true,c);
    c.warn('Excel tự nhận số: giá trị như 007 có thể mất số 0 đầu. Nếu cần giữ nguyên, hãy đặt cột là văn bản trong file CSV nguồn.');
    return[{name:c.base+'.xlsx',data:new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}))}]},
  async json2xlsx(fs,c){let d;try{d=JSON.parse(decodeText(fs[0].buf,c))}catch(e){throw new Error('File JSON không hợp lệ: '+e.message)}
    const flat=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v&&typeof v==='object'?JSON.stringify(v):v])),sheets=[],
      mkws=v=>{if(!Array.isArray(v))v=[v];
        if(v.every(x=>x&&typeof x==='object'&&!Array.isArray(x)))return XLSX.utils.json_to_sheet(v.map(flat));
        if(v.every(Array.isArray))return XLSX.utils.aoa_to_sheet(v);
        return XLSX.utils.aoa_to_sheet(v.map(x=>[x&&typeof x==='object'?JSON.stringify(x):x]))};
    if(Array.isArray(d))sheets.push({name:'Sheet1',ws:mkws(d)});
    else if(d&&typeof d==='object'&&Object.keys(d).length&&Object.keys(d).every(k=>Array.isArray(d[k])))Object.keys(d).forEach(k=>sheets.push({name:k,ws:mkws(d[k])}));
    else sheets.push({name:'Sheet1',ws:mkws([d])});
    c.note('Đối tượng lồng nhau được ghi dạng chuỗi JSON trong ô.');
    return[{name:c.base+'.xlsx',data:xlsxBytes(sheets)}]},
  async t2docx(fs,c){const t=decodeText(fs[0].buf,c),B=t.replace(/\r\n?/g,'\n').split('\n').filter(l=>l.trim()).map(l=>({t:l.replace(/\t/g,'    ').trim()}));
    if(!B.length)throw new Error('File TXT trống.');c.note('Mỗi dòng không trống của TXT thành một đoạn Word.');
    return[{name:c.base+'.docx',data:await makeDocx(B)}]},
  async m2docx(fs,c){const B=mdBlocks(decodeText(fs[0].buf,c));if(!B.length)throw new Error('File Markdown trống.');
    c.warn('Hình, link, code block và công thức trong Markdown chỉ được giữ ở dạng chữ.');
    return[{name:c.base+'.docx',data:await makeDocx(B)}]},
  async h2docx(fs,c){const doc=new DOMParser().parseFromString(decodeText(fs[0].buf,c),'text/html'),r=await htmlBlocks(doc.body);
    if(!r.blocks.length)throw new Error('Không có nội dung để chuyển.');
    if(r.skipped)c.warn(r.skipped+' hình không đưa được vào Word (chỉ hỗ trợ ảnh PNG/JPG nhúng dạng data:, không tải ảnh từ web/đường dẫn).');
    c.warn('CSS, màu sắc, bố cục nhiều cột của trang HTML không được giữ — chỉ giữ tiêu đề, đoạn, danh sách, bảng, đậm/nghiêng.');
    return[{name:c.base+'.docx',data:await makeDocx(r.blocks)}]},
  async p2txt(fs,c){const pages=await pdfText(fs[0],c),n=pages.reduce((a,p)=>a+p.length,0);
    if(!n)throw new Error('PDF không có chữ để lấy (có thể là bản quét/ảnh — cần OCR).');
    c.warn('Chữ được tự gom thành đoạn; PDF nhiều cột/bảng có thể bị lẫn thứ tự.');
    return[{name:c.base+'.txt',data:new TextEncoder().encode('\ufeff'+pages.map(p=>p.join('\n')).filter(Boolean).join('\n\n')+'\n')}]},
  async pdfmerge(fs,c){if(fs.length<2)throw new Error('Cần chọn ít nhất 2 file PDF để ghép.');
    const P=await lib('pdflib'),out=await P.PDFDocument.create();
    for(const f of fs){c.prog('Đang ghép '+f.name+'...');const src=await pdfLoad(P,f),pg=await out.copyPages(src,src.getPageIndices());pg.forEach(p=>out.addPage(p))}
    c.note('Ghép theo thứ tự trong danh sách: '+fs.length+' file → '+out.getPageCount()+' trang.');
    return[{name:baseOf(fs[0].name)+'_gop.pdf',data:await out.save()}]},
  async pdfsplit(fs,c){const P=await lib('pdflib'),d=await pdfLoad(P,fs[0]),n=d.getPageCount(),out=[];
    for(let i=0;i<n;i++){c.prog('Tách trang '+(i+1)+'/'+n+'...');await tick();out.push({name:c.base+'_trang'+pad2(i+1)+'.pdf',data:await (await pdfCopy(P,d,[i])).save()})}
    return out},
  async pdfextract(fs,c){if(!c.opt.pages)throw new Error('Hãy nhập các trang cần trích ở ô "Trang" (ví dụ 1-3,5,8-10).');
    const P=await lib('pdflib'),d=await pdfLoad(P,fs[0]),idx=parseRange(c.opt.pages,d.getPageCount());
    if(!idx.length)throw new Error('Chưa chọn trang nào.');
    return[{name:c.base+'_trich.pdf',data:await (await pdfCopy(P,d,idx)).save()}]},
  async pdfrotate(fs,c){const P=await lib('pdflib'),d=await pdfLoad(P,fs[0]),pg=d.getPages(),idx=c.opt.pages?parseRange(c.opt.pages,pg.length):pg.map((_,i)=>i);
    idx.forEach(i=>{const p=pg[i];p.setRotation(P.degrees((p.getRotation().angle+c.opt.rot)%360))});
    c.note('Đã xoay '+idx.length+'/'+pg.length+' trang '+c.opt.rot+'° theo chiều kim đồng hồ.');
    return[{name:c.base+'_xoay.pdf',data:await d.save()}]},
  async pdfnum(fs,c){const P=await lib('pdflib'),d=await pdfLoad(P,fs[0]),font=await d.embedFont(P.StandardFonts.Helvetica),pg=d.getPages(),n=pg.length,o=c.opt;
    if(pg.some(p=>p.getRotation().angle%360))c.warn('Có trang đang bị xoay — số trang có thể nằm lệch vị trí trên các trang đó.');
    pg.forEach((p,i)=>{const w=p.getSize().width,t=o.pnfmt==='full'?'Trang '+(i+1)+'/'+n:String(i+1),tw=font.widthOfTextAtSize(t,10);
      p.drawText(t,{x:o.pnpos==='right'?w-40-tw:(w-tw)/2,y:22,size:10,font,color:P.rgb(0,0,0)})});
    return[{name:c.base+'_danhso.pdf',data:await d.save()}]},
  async i2png(fs,c){return imgConvert(fs,c,'i2png')},
  async i2jpg(fs,c){return imgConvert(fs,c,'i2jpg')},
  async i2webp(fs,c){return imgConvert(fs,c,'i2webp')},
  async i2small(fs,c){return imgConvert(fs,c,'i2small')},
  async heic2jpg(fs,c){return imgConvert(fs,c,'heic2jpg')}
});

/* ====================== GIAO DIỆN ====================== */
window.ChuyenDoiWord={mathtypeToLatex,ommlToLatex,ommlParaToLatex,texifyDocx,fillTex,docxParts,toLines,lineText,lineCells,toParas,htmlToMd,tblAoa,parseHtml,mdBlocks,mdInline,parseRange};
const sel=document.getElementById('wtSel'),t3=document.getElementById('t3');
if(!sel||!t3)return;
const g=id=>document.getElementById(id);
const GROUPS=[
  ['📝 Word →',[['w2imgs','Trích hình ảnh trong Word (.zip)','doc'],['w2html','Word → HTML (công thức → LaTeX/MathJax)','doc'],['w2md','Word → Markdown (công thức $…$)','doc'],['w2txt','Word → TXT (công thức $…$)','doc'],['w2xlsx','Word → Excel (bảng)','doc']]],
  ['📕 PDF',[['p2img','PDF → Ảnh (PNG, mỗi trang 1 ảnh)','pdf'],['pdfmerge','Ghép nhiều PDF thành 1','pdf'],['pdfsplit','Tách PDF (mỗi trang 1 file)','pdf'],['pdfextract','Trích trang PDF (nhập số trang)','pdf'],['pdfrotate','Xoay trang PDF','pdf'],['pdfnum','Đánh số trang PDF','pdf']]],
  ['📊 Excel / CSV / JSON',[['x2docx','Excel → Word','xls'],['x2pdf','Excel → PDF','xls'],['x2csv','Excel → CSV','xls'],['x2html','Excel → HTML','xls'],['x2json','Excel → JSON','xls'],['csv2xlsx','CSV → Excel','csv'],['json2xlsx','JSON → Excel','json']]],
  ['📽 PowerPoint',[['pp2txt','PowerPoint → TXT','ppt'],['pp2docx','PowerPoint → Word','ppt'],['pp2img','Trích hình ảnh trong PowerPoint (.zip)','ppt']]],
  ['🔤 Văn bản → Word',[['t2docx','TXT → Word','txt'],['m2docx','Markdown → Word','md'],['h2docx','HTML → Word','html']]],
  ['🖼 Ảnh',[['i2docx','Ảnh → Word','img'],['i2pdf','Ảnh → PDF','img'],['i2png','Ảnh → PNG','img'],['i2jpg','Ảnh → JPG','img'],['i2webp','Ảnh → WEBP','img'],['i2small','Nén / thu nhỏ ảnh','img'],['heic2jpg','HEIC (ảnh iPhone) → JPG','heic']]]];
const CONV=[].concat.apply([],GROUPS.map(x=>x[1]));
const mkK=(acc,re,lab)=>({acc,ok:n=>re.test(n),lab});
const KIND={doc:mkK('.docx',/\.docx$/i,'.docx'),pdf:mkK('.pdf,application/pdf',/\.pdf$/i,'.pdf'),img:mkK('image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif',/\.(png|jpe?g|webp|bmp|gif)$/i,'ảnh (PNG/JPG/WEBP/BMP/GIF)'),
  xls:mkK('.xlsx,.xlsm,.xls',/\.(xlsx|xlsm|xls)$/i,'.xlsx/.xls'),csv:mkK('.csv,.tsv,.txt',/\.(csv|tsv|txt)$/i,'.csv/.tsv'),json:mkK('.json',/\.json$/i,'.json'),ppt:mkK('.pptx',/\.pptx$/i,'.pptx'),
  txt:mkK('.txt',/\.txt$/i,'.txt'),md:mkK('.md,.markdown,.txt',/\.(md|markdown|txt)$/i,'.md'),html:mkK('.html,.htm',/\.html?$/i,'.html'),heic:mkK('.heic,.heif',/\.(heic|heif)$/i,'.heic')};
const MERGE=['i2docx','i2pdf'],ALLIN=['pdfmerge'];
const OPTS={pages:['pdfextract','pdfrotate'],rot:['pdfrotate'],pn:['pdfnum'],img:['i2png','i2jpg','i2webp','i2small','heic2jpg']};
const EXT_MIME={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain;charset=utf-8',csv:'text/csv;charset=utf-8',json:'application/json',md:'text/markdown;charset=utf-8',html:'text/html;charset=utf-8',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',zip:'application/zip'};
const mimeOf=n=>EXT_MIME[(n.split('.').pop()||'').toLowerCase()]||'application/octet-stream';
const fsz=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(1)+' MB';
const q=[];
const cur=()=>CONV.find(x=>x[0]===g('cv_type').value)||CONV[0];
const kind=()=>KIND[cur()[2]];
function setSt(m,k){const e=g('cv_st');e.textContent=m;e.className='status'+(k==='e'?' err':k==='o'?' ok':' info')}
function renderList(){g('cv_list').innerHTML=q.map((f,i)=>'<div class="frow"><span>📄</span><span class="fnm" title="'+hx(f.name)+'">'+hx(f.name)+'</span><span class="fsz">'+fsz(f.size)+'</span><button class="sec sm" type="button" data-i="'+i+'">✕</button></div>').join('')}
function syncType(){const t=g('cv_type').value;g('cv_in').accept=kind().acc;
  g('cv_mergeW').style.display=MERGE.indexOf(t)>=0?'':'none';
  [['pages','cv_oPages'],['rot','cv_oRot'],['pn','cv_oPn'],['img','cv_oImg']].forEach(a=>{g(a[1]).style.display=OPTS[a[0]].indexOf(t)>=0?'':'none'});
  q.length=0;renderList();g('cv_out').innerHTML='';setSt('')}
async function addFiles(list){const K=kind(),bad=[];
  for(const f of Array.from(list)){if(!K.ok(f.name)&&!(cur()[2]==='img'&&/^image\//.test(f.type))){bad.push(/\.(doc|ppt)$/i.test(f.name)?f.name+' (định dạng Office cũ — hãy mở bằng Office, Save As bản mới .docx/.pptx)':f.name+' (cần '+K.lab+')');continue}
    if(q.some(x=>x.name===f.name&&x.size===f.size))continue;q.push({name:f.name,size:f.size,buf:await f.arrayBuffer()})}
  renderList();setSt(bad.length?'Bỏ qua: '+bad.join('; '):(q.length?'Đã chọn '+q.length+' file, sẵn sàng chuyển đổi.':''),bad.length?'e':'')}
function save(name,data){const b=new Blob([data],{type:mimeOf(name)});if(typeof saveBlob==='function')return saveBlob(b,name);
  const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
const readOpt=()=>({pages:g('cv_pages').value.trim(),rot:+g('cv_rot').value,pnpos:g('cv_pnpos').value,pnfmt:g('cv_pnfmt').value,q:(+g('cv_q').value)/100,max:+g('cv_max').value});
async function run(){
  const out=g('cv_out'),btn=g('cv_run'),type=g('cv_type').value;out.innerHTML='';
  if(!q.length)return setSt('Chưa chọn file nào.','e');
  try{needLibs()}catch(e){return setSt(e.message,'e')}
  const opt=readOpt(),merge=MERGE.indexOf(type)>=0&&g('cv_merge').checked&&q.length>1,one=merge||ALLIN.indexOf(type)>=0,groups=one?[q.slice()]:q.map(f=>[f]),all=[];let ok=0;btn.disabled=true;
  for(let k=0;k<groups.length;k++){const fs=groups[k],label=fs.length>1?fs.length+' file':fs[0].name,pre='('+(k+1)+'/'+groups.length+') '+label+': ';
    const warns=[],notes=[],c={opt,base:baseOf(fs[0].name)+(merge?'_gop':''),warn:m=>{if(warns.indexOf(m)<0)warns.push(m)},note:m=>notes.push(m),prog:m=>setSt(pre+m)};
    const card=document.createElement('div');card.style.cssText='border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:14px';
    try{setSt(pre+'đang chuyển đổi...');await tick();const res=await RUN[type](fs,c);ok++;res.forEach(r=>all.push(r));
      let h='✅ <b>'+hx(label)+'</b> → '+res.length+' file';
      if(notes.length)h+='<div class="note" style="margin:4px 0">'+notes.map(hx).join('<br>')+'</div>';
      if(warns.length)h+='<div style="margin:4px 0">⚠ <b>Lưu ý:</b><ul style="margin:4px 0 4px 18px;padding:0">'+warns.map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul></div>';
      card.innerHTML=h;
      res.slice(0,12).forEach(r=>{const b=document.createElement('button');b.type='button';b.className='green sm';b.textContent='⬇ '+r.name;b.onclick=()=>save(r.name,r.data);card.appendChild(b);card.appendChild(document.createTextNode(' '))});
      if(res.length>12)card.appendChild(document.createTextNode('… và '+(res.length-12)+' file nữa (có trong file .zip bên dưới)'))}
    catch(e){card.innerHTML='❌ <b>'+hx(label)+'</b>: bỏ qua — '+hx(e.message||String(e))}
    out.appendChild(card);await tick()}
  if(all.length>1&&g('cv_zip').checked){const b=document.createElement('button');b.type='button';b.className='green';b.textContent='📦 Tải gộp tất cả ('+all.length+' file, .zip)';
    b.onclick=async()=>{const z=new JSZip(),seen={};all.forEach(r=>{let n=r.name;if(seen[n]){const i=n.lastIndexOf('.');n=n.slice(0,i)+'_'+seen[n]+n.slice(i)}seen[r.name]=(seen[r.name]||0)+1;z.file(n,r.data)});
      save('chuyen-doi.zip',await z.generateAsync({type:'uint8array',compression:'DEFLATE'}))};out.appendChild(b)}
  btn.disabled=false;setSt('Xong: '+ok+'/'+groups.length+' mục.',ok?'o':'e')}
function buildUI(){
  if(g('wtConv'))return;
  const d=document.createElement('div');d.className='wtool';d.id='wtConv';
  const so=(id,arr,def)=>'<select id="'+id+'">'+arr.map(a=>'<option value="'+a[0]+'"'+(a[0]===def?' selected':'')+'>'+a[1]+'</option>').join('')+'</select>';
  d.innerHTML='<div class="note">Chuyển đổi định dạng ngay trên máy bạn — file <b>không được gửi đi đâu</b>. Chọn kiểu chuyển, chọn file (nhiều file / kéo thả), rồi bấm Chuyển đổi. Lần đầu dùng một số kiểu cần mạng để tải thư viện. Với file Word có công thức, chỉ dùng các kiểu <b>Word → HTML / Markdown / TXT / Excel</b> (công thức Equation được đổi sang LaTeX); muốn PDF giữ nguyên công thức hãy dùng <i>Lưu thành PDF</i> trong Word.</div>'
  +'<div class="bar"><label for="cv_type" style="font-weight:600">Kiểu chuyển:</label><select id="cv_type">'+GROUPS.map(gr=>'<optgroup label="'+gr[0].trim()+'">'+gr[1].map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('')+'</optgroup>').join('')+'</select></div>'
  +'<div class="bar"><input type="file" id="cv_in" multiple style="display:none"><button class="ghost" id="cv_pick" type="button">📁 Chọn file (nhiều file / kéo thả vào đây)</button><button class="sec sm" id="cv_clear" type="button">🗑 Xóa danh sách</button></div><div id="cv_list"></div>'
  +'<label class="note" id="cv_mergeW" style="display:none;margin:6px 0"><input type="checkbox" id="cv_merge" checked> Gộp nhiều ảnh thành 1 file (theo thứ tự trong danh sách)</label>'
  +'<div class="note" id="cv_oPages" style="display:none;margin:6px 0">Trang: <input type="text" id="cv_pages" placeholder="vd 1-3,5,8-10" style="width:150px"> <span>(để trống = tất cả trang, với kiểu Xoay)</span></div>'
  +'<div class="note" id="cv_oRot" style="display:none;margin:6px 0">Xoay: '+so('cv_rot',[['90','90° phải'],['180','180°'],['270','90° trái']],'90')+'</div>'
  +'<div class="note" id="cv_oPn" style="display:none;margin:6px 0">Vị trí: '+so('cv_pnpos',[['center','Giữa dưới'],['right','Phải dưới']],'center')+' &nbsp; Kiểu: '+so('cv_pnfmt',[['num','1, 2, 3'],['full','Trang 1/N']],'num')+'</div>'
  +'<div class="note" id="cv_oImg" style="display:none;margin:6px 0">Chất lượng (JPG/WEBP): '+so('cv_q',[['60','60%'],['75','75%'],['85','85%'],['92','92%']],'85')+' &nbsp; Cạnh dài tối đa: '+so('cv_max',[['0','Giữ nguyên'],['3000','3000 px'],['2000','2000 px'],['1600','1600 px'],['1200','1200 px']],'0')+'</div>'
  +'<div class="bar"><label class="note" style="margin:0"><input type="checkbox" id="cv_zip" checked> Nhiều file kết quả → có nút tải gộp .zip</label><button class="green" id="cv_run" type="button">🔄 Chuyển đổi</button></div>'
  +'<div id="cv_st" class="status"></div><div id="cv_out"></div>';
  const tools=Array.from(t3.querySelectorAll('.wtool')),last=tools[tools.length-1];
  if(last)last.insertAdjacentElement('afterend',d);else t3.appendChild(d);
  const op=document.createElement('option');op.value='wtConv';op.textContent='🔄 Chuyển đổi định dạng';sel.appendChild(op);
  g('cv_type').onchange=syncType;g('cv_pick').onclick=()=>g('cv_in').click();
  g('cv_in').onchange=e=>{const f=Array.from(e.target.files||[]);e.target.value='';if(f.length)addFiles(f)};
  g('cv_list').onclick=e=>{const b=e.target.closest('button');if(b){q.splice(+b.dataset.i,1);renderList()}};
  g('cv_clear').onclick=()=>{q.length=0;renderList();g('cv_out').innerHTML='';setSt('')};
  ['dragover','drop'].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'&&e.dataTransfer)addFiles(e.dataTransfer.files)}));
  g('cv_run').onclick=run;syncType()}
buildUI();
})();
