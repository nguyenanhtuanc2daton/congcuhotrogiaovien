/* Công cụ Word · "Chuyển đổi định dạng" (không dùng AI)
   Word/PDF/Excel/CSV/JSON/PowerPoint/TXT/Markdown/HTML/Ảnh — 37 kiểu chuyển, gồm ghép/tách/xoay/đánh số trang PDF và nén ảnh (chạy hoàn toàn trên trình duyệt, file không gửi đi đâu)
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
async function lib(k){const L=LIBS[k];if(L.t())return L.t();
  for(const u of L.u){try{await loadScript(u)}catch(e){}if(L.t())break}
  if(!L.t())throw new Error('Không tải được thư viện "'+k+'" (cần kết nối mạng). Kiểm tra mạng rồi thử lại.');return L.t()}
async function pdfLib(){const p=await lib('pdfjs');
  if(!p._raInit){const url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    try{const r=await fetch(url);if(!r.ok)throw 0;p.GlobalWorkerOptions.workerSrc=URL.createObjectURL(await r.blob())}catch(e){p.GlobalWorkerOptions.workerSrc=url}p._raInit=1}
  return p}
const needLibs=()=>{if(typeof JSZip==='undefined')throw new Error('Chưa tải được thư viện JSZip (cần mạng để tải từ cdnjs).')};

/* ---------- Word → HTML (mammoth) ---------- */
async function mathCount(buf){try{const z=await JSZip.loadAsync(buf),f=z.file('word/document.xml');if(!f)return 0;return((await f.async('string')).match(/<m:oMath[ >]/g)||[]).length}catch(e){return 0}}
async function wordHtml(f,c,imgs){
  const m=await lib('mammoth'),opt={};
  if(imgs){let n=0;opt.convertImage=m.images.imgElement(im=>im.read('base64').then(d=>{const ext=(im.contentType.split('/')[1]||'png').replace('jpeg','jpg').replace(/\+.*/,'');const name='image-'+(++n)+'.'+ext;imgs.push({name:'images/'+name,data:d});return{src:'images/'+name}}))}
  let r;try{r=await m.convertToHtml({arrayBuffer:f.buf},opt)}catch(e){throw new Error('Không đọc được file Word (file hỏng hoặc có mật khẩu): '+e.message)}
  const n=await mathCount(f.buf);if(n)c.warn(n+' công thức Equation của Word không được chuyển (bị bỏ qua) — hãy kiểm tra lại kết quả.');
  c.warn('Hộp văn bản (text box), header/footer và định dạng phức tạp có thể không được giữ nguyên.');
  return r.value}

/* ---------- Dựng trang A4 từ HTML (cho Word → PDF / Ảnh) ---------- */
async function renderPages(html,c,kind){
  const h2c=await lib('h2c'),PW=794,PH=1123,PAD=60,S=2,Hc=PH-2*PAD;
  const box=document.createElement('div');box.id='raRender';box.className='rcBox';
  box.style.cssText='position:fixed;left:-12000px;top:0;width:'+PW+'px;box-sizing:border-box;padding:0 76px;background:#fff;color:#000;font:14.5px/1.5 "Times New Roman",Times,serif';
  box.innerHTML='<style>#raRender p{margin:0 0 8px}#raRender h1,#raRender h2,#raRender h3,#raRender h4{margin:14px 0 8px;line-height:1.3}#raRender h1{font-size:22px}#raRender h2{font-size:19px}#raRender h3{font-size:17px}#raRender table{border-collapse:collapse;max-width:100%;margin:6px 0}#raRender td,#raRender th{border:1px solid #444;padding:3px 6px;vertical-align:top}#raRender img{max-width:100%;max-height:940px}#raRender ul,#raRender ol{margin:0 0 8px;padding-left:28px}</style>'+html;
  document.body.appendChild(box);
  try{
    await Promise.all(Array.from(box.querySelectorAll('img')).map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));
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
  async w2pdf(fs,c){const f=fs[0],html=await wordHtml(f,c,null);const pages=await renderPages(html,c,'jpg'),J=await lib('jspdf');
    const pdf=new J({unit:'mm',format:'a4'});pages.forEach((d,i)=>{if(i)pdf.addPage();pdf.addImage(d,'JPEG',0,0,210,297)});
    c.warn('PDF dựng từ ảnh trang: hiển thị đúng chữ Việt nhưng không bôi chọn/copy chữ được.');
    return[{name:c.base+'.pdf',data:new Uint8Array(pdf.output('arraybuffer'))}]},
  async w2img(fs,c){const f=fs[0],html=await wordHtml(f,c,null),pages=await renderPages(html,c,'png');
    return pages.map((d,i)=>({name:c.base+'_trang'+String(i+1).padStart(2,'0')+'.png',data:d}))},
  async w2txt(fs,c){const m=await lib('mammoth'),f=fs[0];let r;try{r=await m.extractRawText({arrayBuffer:f.buf})}catch(e){throw new Error('Không đọc được file Word: '+e.message)}
    const n=await mathCount(f.buf);if(n)c.warn(n+' công thức Equation không được chuyển sang TXT.');
    return[{name:c.base+'.txt',data:new TextEncoder().encode('\ufeff'+r.value.replace(/\n{3,}/g,'\n\n').trim()+'\n')}]},
  async w2html(fs,c){const html=await wordHtml(fs[0],c,null);
    const doc='<!DOCTYPE html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+hx(c.base)+'</title><style>body{font-family:"Times New Roman",serif;max-width:820px;margin:0 auto;padding:16px;line-height:1.6}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #888;padding:4px 8px;vertical-align:top}img{max-width:100%;height:auto}</style></head><body>\n'+html+'\n</body></html>';
    return[{name:c.base+'.html',data:new TextEncoder().encode(doc)}]},
  async w2md(fs,c){const imgs=[],html=await wordHtml(fs[0],c,imgs),md=htmlToMd(parseHtml(html));
    if(!imgs.length)return[{name:c.base+'.md',data:new TextEncoder().encode(md)}];
    const z=new JSZip();z.file(c.base+'.md',md);imgs.forEach(i=>z.file(i.name,i.data,{base64:true}));
    c.warn('Tài liệu có hình: kết quả là file .zip gồm '+c.base+'.md và thư mục images/.');
    return[{name:c.base+'_markdown.zip',data:await z.generateAsync({type:'uint8array',compression:'DEFLATE'})}]},
  async w2xlsx(fs,c){const html=await wordHtml(fs[0],c,null),body=parseHtml(html),sheets=[];
    Array.from(body.querySelectorAll('table')).filter(t=>!t.parentElement.closest('table')).forEach((t,i)=>{const r=tblAoa(t);if(r.aoa.length)sheets.push({name:'Bảng '+(i+1),aoa:r.aoa,merges:r.merges})});
    if(!sheets.length){const rows=Array.from(body.children).map(e=>[e.textContent.replace(/\s+/g,' ').trim()]).filter(r=>r[0]);if(!rows.length)throw new Error('Tài liệu không có nội dung để chuyển.');
      sheets.push({name:'Văn bản',aoa:rows});c.warn('Không có bảng nào trong file — mỗi đoạn văn được đặt vào một dòng của sheet "Văn bản".')}
    else c.warn('Chỉ chuyển các bảng ('+sheets.length+' bảng, mỗi bảng một sheet); văn bản ngoài bảng không được đưa vào Excel.');
    return[{name:c.base+'.xlsx',data:xlsxBytes(sheets)}]},
  async w2pptx(fs,c){const html=await wordHtml(fs[0],c,null),body=parseHtml(html),P=await lib('pptx'),pp=new P();pp.layout='LAYOUT_16x9';
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
window.ChuyenDoiWord={docxParts,toLines,lineText,lineCells,toParas,htmlToMd,tblAoa,parseHtml,mdBlocks,mdInline,parseRange};
const sel=document.getElementById('wtSel'),t3=document.getElementById('t3');
if(!sel||!t3)return;
const g=id=>document.getElementById(id);
const GROUPS=[
  ['📝 Word →',[['w2pdf','Word → PDF','doc'],['w2pptx','Word → PowerPoint (PPTX)','doc'],['w2xlsx','Word → Excel (bảng)','doc'],['w2txt','Word → TXT','doc'],['w2md','Word → Markdown','doc'],['w2html','Word → HTML','doc'],['w2img','Word → Ảnh (PNG, mỗi trang 1 ảnh)','doc'],['w2imgs','Trích hình ảnh trong Word (.zip)','doc']]],
  ['📕 PDF',[['p2docx','PDF → Word','pdf'],['p2xlsx','PDF → Excel','pdf'],['p2txt','PDF → TXT','pdf'],['p2img','PDF → Ảnh (PNG, mỗi trang 1 ảnh)','pdf'],['pdfmerge','Ghép nhiều PDF thành 1','pdf'],['pdfsplit','Tách PDF (mỗi trang 1 file)','pdf'],['pdfextract','Trích trang PDF (nhập số trang)','pdf'],['pdfrotate','Xoay trang PDF','pdf'],['pdfnum','Đánh số trang PDF','pdf']]],
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
  d.innerHTML='<div class="note">Chuyển đổi định dạng ngay trên máy bạn — file <b>không được gửi đi đâu</b>. Chọn kiểu chuyển, chọn file (nhiều file / kéo thả), rồi bấm Chuyển đổi. Lần đầu dùng một số kiểu cần mạng để tải thư viện.</div>'
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
