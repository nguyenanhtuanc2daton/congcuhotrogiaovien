/* Công cụ Word · Mô-đun 1: ZIP tự viết, dựng xem trước công thức, xuất PDF */


/* ======================= ZIP đọc/ghi (tự viết, không cần thư viện ngoài) ======================= */
function strToBytes(str){ return new TextEncoder().encode(str); }
function crc32(buf){
  if(!crc32.table){
    const t=[];
    for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c; }
    crc32.table=t;
  }
  let crc=0^(-1);
  for(let i=0;i<buf.length;i++) crc=(crc>>>8)^crc32.table[(crc^buf[i])&0xFF];
  return (crc^(-1))>>>0;
}
function makeZip(files){
  const DOS_TIME=0x0000, DOS_DATE=0x0021;
  function u16(v){return new Uint8Array([v&255,(v>>8)&255]);}
  function u32(v){return new Uint8Array([v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255]);}
  function cat(arr){ let len=0; arr.forEach(a=>len+=a.length); const out=new Uint8Array(len); let p=0; arr.forEach(a=>{out.set(a,p); p+=a.length;}); return out; }
  const enc=new TextEncoder();
  let localParts=[], centralParts=[], offset=0;
  for(const f of files){
    const nameBytes=enc.encode(f.name), data=f.data, crc=crc32(data);
    const local=cat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(DOS_TIME),u16(DOS_DATE),u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0)]);
    const localEntry=cat([local,nameBytes,data]);
    localParts.push(localEntry);
    const central=cat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(DOS_TIME),u16(DOS_DATE),u32(crc),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset)]);
    centralParts.push(cat([central,nameBytes]));
    offset+=localEntry.length;
  }
  const localAll=cat(localParts), centralAll=cat(centralParts);
  const end=cat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralAll.length),u32(localAll.length),u16(0)]);
  return cat([localAll,centralAll,end]);
}
async function unzipAll(arrayBuffer){
  const bytes=new Uint8Array(arrayBuffer);
  const view=new DataView(arrayBuffer);
  let eocd=-1;
  for(let i=bytes.length-22;i>=0;i--){ if(view.getUint32(i,true)===0x06054b50){ eocd=i; break; } }
  if(eocd<0) throw new Error('Không phải file .docx/.zip hợp lệ');
  const totalEntries=view.getUint16(eocd+10,true);
  let offset=view.getUint32(eocd+16,true);
  const centralEntries=[];
  for(let e=0;e<totalEntries;e++){
    if(view.getUint32(offset,true)!==0x02014b50) break;
    const method=view.getUint16(offset+10,true);
    const compSize=view.getUint32(offset+20,true);
    const nameLen=view.getUint16(offset+28,true);
    const extraLen=view.getUint16(offset+30,true);
    const commentLen=view.getUint16(offset+32,true);
    const localHeaderOffset=view.getUint32(offset+42,true);
    const name=new TextDecoder().decode(bytes.slice(offset+46,offset+46+nameLen));
    centralEntries.push({name,method,compSize,localHeaderOffset});
    offset += 46+nameLen+extraLen+commentLen;
  }
  const result=[];
  for(const ce of centralEntries){
    const lNameLen=view.getUint16(ce.localHeaderOffset+26,true);
    const lExtraLen=view.getUint16(ce.localHeaderOffset+28,true);
    const dataStart=ce.localHeaderOffset+30+lNameLen+lExtraLen;
    const compData=bytes.slice(dataStart, dataStart+ce.compSize);
    let data;
    if(ce.method===0){ data=compData; }
    else if(ce.method===8){
      if(typeof DecompressionStream==='undefined') throw new Error('Trình duyệt chưa hỗ trợ giải nén .docx, hãy dùng Chrome/Edge bản mới nhất');
      const ds=new DecompressionStream('deflate-raw');
      const stream=new Blob([compData]).stream().pipeThrough(ds);
      data=new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('Định dạng nén không hỗ trợ trong mục '+ce.name);
    result.push({name:ce.name, data});
  }
  return result;
}
async function downloadBlob(bytes, filename, mime){
  const blob=new Blob([bytes], {type: mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  // Trên trang đã publish, trình duyệt không cho phép link <a download> tự bấm.
  // Dùng capability "downloads" của nền tảng nếu có; nếu không (mở file .html offline), quay lại cách cũ.
  if(window.claude && typeof window.claude.use==='function'){
    try{
      const downloads = await window.claude.use('downloads');
      if(downloads){
        await downloads.save({filename, data: blob});
        return;
      }
    }catch(err){
      // 'declined' = người dùng bấm Hủy trên hộp thoại xác nhận -> không cần báo lỗi thêm
      if(err && err.code==='declined') return;
      throw new Error('Không thể tải file: '+(err && err.message ? err.message : 'lỗi không xác định'));
    }
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 3000);
}

/* ======================= AST -> HTML dựng công thức thật (dùng cho xem trước & PDF) ======================= */
function escAttr(s){ return esc(s).replace(/"/g,'&quot;'); }
function mLetters(v){
  let o=''; for(const ch of v){ o += /[A-Za-z]/.test(ch) ? '<i>'+ch+'</i>' : esc(ch); } return o;
}
const M_TALL=['frac','matrix','nary','binom','sqrt','stackrel','groupbrace','limlow','xarrow'];
function hasTall(nodes){
  return (nodes||[]).some(n=>{
    if(M_TALL.includes(n.t)) return true;
    if(n.t==='seq') return hasTall(n.c);
    if(n.t==='sup'||n.t==='sub'||n.t==='subsup') return hasTall(n.base);
    if(n.t==='func') return hasTall(n.e);
    if(n.t==='delim') return hasTall(n.body);
    return false;
  });
}
function bigDel(ch, k){
  if(!ch) return '';
  return '<span class="mdl" style="transform:scaleY('+k.toFixed(2)+')">'+esc(ch)+'</span>';
}
function subsupHTML(subH, supH){
  if(subH && supH) return '<span class="mss"><span>'+supH+'</span><span>'+subH+'</span></span>';
  if(supH) return '<sup class="ms">'+supH+'</sup>';
  if(subH) return '<sub class="ms">'+subH+'</sub>';
  return '';
}
const ACC_PREVIEW={vec:'\u2192',overrightarrow:'\u2192',overleftarrow:'\u2190',overleftrightarrow:'\u2194',hat:'^',widehat:'^',
  tilde:'~',widetilde:'~',dot:'\u02d9',ddot:'\u00a8',dddot:'\u02d9\u02d9',check:'\u02c7',breve:'\u02d8',acute:'\u00b4',grave:'`',mathring:'\u02da'};
function richNodes(nodes, up){ return (nodes||[]).map(n=>richNode(n, up)).join(''); }
function richNode(node, up){
  switch(node.t){
    case 'text': return up ? esc(node.v) : mLetters(node.v);
    case 'rawtext': { let h=esc(node.v); if(node.b) h='<b>'+h+'</b>'; if(node.i) h='<i>'+h+'</i>'; return h; }
    case 'funcname': return esc(node.name);
    case 'seq': return richNodes(node.c, up);
    case 'styled': { const h=richNodes(node.c, node.sty==='bi'?false:(node.sty==='i'?false:true)); return node.sty==='b'||node.sty==='bi'?'<b>'+h+'</b>':h; }
    case 'frac': return '<span class="mf'+(node.noBar?' nobar':'')+'"><span class="mfn">'+richNodes(node.num,up)+'</span><span class="mfd">'+richNodes(node.den,up)+'</span></span>';
    case 'binom': return bigDel('(',1.9)+'<span class="mf nobar"><span class="mfn">'+richNodes(node.top,up)+'</span><span class="mfd">'+richNodes(node.bottom,up)+'</span></span>'+bigDel(')',1.9);
    case 'sqrt': {
      const tall=hasTall(node.rad);
      return '<span class="msq">'+(node.idx&&node.idx.length?'<sup class="ms mix">'+richNodes(node.idx,up)+'</sup>':'')+
        '<span class="msr'+(tall?' tall':'')+'">\u221a</span><span class="msc">'+richNodes(node.rad,up)+'</span></span>';
    }
    case 'sup': return richNodes(node.base,up)+subsupHTML('', richNodes(node.sup,up));
    case 'sub': return richNodes(node.base,up)+subsupHTML(richNodes(node.sub,up), '');
    case 'subsup': return richNodes(node.base,up)+subsupHTML(richNodes(node.sub,up), richNodes(node.sup,up));
    case 'narysym': return '<span class="mnb">'+esc(node.v)+'</span>';
    case 'nary': {
      const sb=node.sub?richNodes(node.sub,up):'', sp=node.sup?richNodes(node.sup,up):'';
      const body=richNodes(node.e,up);
      if(M_INTEGRALS.has(node.chr)) return '<span class="mnb int">'+esc(node.chr)+'</span>'+subsupHTML(sb,sp)+body;
      if(!sb&&!sp) return '<span class="mnb">'+esc(node.chr)+'</span>'+body;
      return '<span class="mn">'+(sp?'<span class="mns">'+sp+'</span>':'')+'<span class="mnb">'+esc(node.chr)+'</span>'+(sb?'<span class="mns">'+sb+'</span>':'')+'</span>'+body;
    }
    case 'func': return richNodes(node.name,true)+'\u2009'+richNodes(node.e,up);
    case 'limlow': return '<span class="mgb"><span>'+richNodes(node.base,up)+'</span><span class="mns">'+richNodes(node.lim,up)+'</span></span>';
    case 'xarrow': return '<span class="mgb"><span class="mns">'+richNodes(node.top,up)+'</span><span>'+esc(node.chr)+'</span>'+(node.bot&&node.bot.length?'<span class="mns">'+richNodes(node.bot,up)+'</span>':'')+'</span>';
    case 'upright': return richNodes(node.c, true);
    case 'accent': {
      const inner=richNodes(node.e,up);
      if(node.mark==='bar') return '<span class="mbar">'+inner+'</span>';
      if(node.mark==='underline') return '<span class="mund">'+inner+'</span>';
      if(node.mark==='boxed') return '<span class="mbox">'+inner+'</span>';
      if(node.mark==='cancel') return '<span style="text-decoration:line-through">'+inner+'</span>';
      return '<span class="mac"><span class="mam">'+(ACC_PREVIEW[node.mark]||'^')+'</span>'+inner+'</span>';
    }
    case 'groupbrace': {
      const b=node.mark==='over'?'\u23de':'\u23df', e=richNodes(node.e,up);
      return '<span class="mgb">'+(node.mark==='over'?'<span>'+b+'</span><span>'+e+'</span>':'<span>'+e+'</span><span>'+b+'</span>')+'</span>';
    }
    case 'stackrel': return '<span class="mgb"><span class="mns">'+richNodes(node.top,up)+'</span><span>'+richNodes(node.base,up)+'</span></span>';
    case 'delim': {
      const k=hasTall(node.body)?1.9:1;
      return bigDel(node.beg,k)+richNodes(node.body,up)+bigDel(node.end,k);
    }
    case 'matrix': {
      const rows=node.rows, anyTall=rows.some(r=>r.some(c=>hasTall(c)));
      const k=Math.max(1.4, rows.length*(anyTall?2.0:1.25));
      const cls=(node.kind==='cases'||node.kind==='rcases')?'mt cases':(node.kind==='aligned'?'mt aligned':'mt');
      const tbl='<table class="'+cls+'">'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+richNodes(c,up)+'</td>').join('')+'</tr>').join('')+'</table>';
      const d={pmatrix:['(',')'],bmatrix:['[',']'],Bmatrix:['{','}'],vmatrix:['|','|'],Vmatrix:['\u2016','\u2016'],cases:['{',''],rcases:['','}']}[node.kind];
      if(!d) return '<span class="mmw">'+tbl+'</span>';
      return '<span class="mmw">'+bigDel(d[0],k)+tbl+bigDel(d[1],k)+'</span>';
    }
    default: return '';
  }
}
const M_INTEGRALS=new Set(['\u222b','\u222e','\u222c','\u222d']);
function eqInline(latex){ return '<span class="eqi">'+richNodes(parseLatex(latex))+'</span>'; }
function eqBlock(latex){ return '<div class="eqd">'+richNodes(parseLatex(latex))+'</div>'; }

/* ---- Dựng danh sách "khối" (đoạn văn / hàng bảng) từ văn bản thuần ---- */
function textToBlocks(text){
  const segs=scanSegments(text); const blocks=[]; let cur='', eq=0;
  const flush=()=>{ blocks.push({h:'<div class="pp">'+(cur||'&nbsp;')+'</div>', gap:6}); cur=''; };
  for(const seg of segs){
    if(seg.type==='text'){
      const parts=seg.content.split(/\r\n|\r|\n/);
      for(let k=0;k<parts.length;k++){ cur+=esc(parts[k]); if(k<parts.length-1) flush(); }
    } else {
      eq++;
      if(seg.display){ if(cur.trim()!=='') flush(); else cur=''; blocks.push({h:eqBlock(seg.content), gap:6}); }
      else cur+=eqInline(seg.content);
    }
  }
  if(cur!=='' || blocks.length===0) flush();
  return {blocks, eq, images:0};
}

/* ---- Dựng danh sách "khối" từ document.xml của file .docx gốc (giữ đoạn văn, đậm/nghiêng/gạch chân, căn lề, bảng) ---- */
function fChild(el,name){ return el ? Array.from(el.children).find(c=>c.localName===name)||null : null; }
function wVal(el){ return el ? (el.getAttributeNS(WNS,'val') ?? el.getAttribute('w:val')) : null; }
function runFmt(rPr){
  const f={css:'',tags:[]};
  if(!rPr) return f;
  const on=n=>{ const e=fChild(rPr,n); if(!e) return false; const v=wVal(e); return !(v==='0'||v==='false'||v==='off'); };
  if(on('b')) f.tags.push('b');
  if(on('i')) f.tags.push('i');
  const u=fChild(rPr,'u'); if(u && wVal(u) && wVal(u)!=='none') f.tags.push('u');
  if(on('strike')) f.tags.push('s');
  const va=wVal(fChild(rPr,'vertAlign')); if(va==='superscript') f.tags.push('sup'); else if(va==='subscript') f.tags.push('sub');
  const sz=wVal(fChild(rPr,'sz')); if(sz && +sz>0) f.css+='font-size:'+(+sz/2)+'pt;';
  const col=wVal(fChild(rPr,'color')); if(col && /^[0-9A-Fa-f]{6}$/.test(col) && col.toUpperCase()!=='FFFFFF') f.css+='color:#'+col+';';
  return f;
}
function wrapTags(html, tags){ let h=html; for(const t of tags) h='<'+t+'>'+h+'</'+t+'>'; return h; }
function paraToHTML(p, ctx){
  const pPr=fChild(p,'pPr'); let style='';
  if(pPr){
    const j=wVal(fChild(pPr,'jc'));
    if(j==='center') style+='text-align:center;'; else if(j==='right'||j==='end') style+='text-align:right;'; else if(j==='both'||j==='distribute') style+='text-align:justify;';
    const ind=fChild(pPr,'ind');
    if(ind){
      const l=ind.getAttributeNS(WNS,'left')||ind.getAttributeNS(WNS,'start'), fl=ind.getAttributeNS(WNS,'firstLine');
      if(l && +l>0) style+='padding-left:'+Math.round(+l/15)+'px;';
      if(fl && +fl>0) style+='text-indent:'+Math.round(+fl/15)+'px;';
    }
  }
  const tNodes=Array.from(p.getElementsByTagNameNS(WNS,'t'));
  const fullText=tNodes.map(t=>t.textContent).join('');
  const segs=scanSegments(fullText);
  const hasEq=segs.some(s=>s.type==='eq');
  const wrapP=inner=>'<div class="pp"'+(style?' style="'+style+'"':'')+'>'+(inner||'&nbsp;')+'</div>';
  if(hasEq){
    ctx.paras++;
    if(segs.length===1 && segs[0].type==='eq' && segs[0].display){ ctx.eq++; return '<div class="eqd">'+richNodes(parseLatex(segs[0].content))+'</div>'; }
    let rPr=null; for(const c of p.children){ if(c.localName==='r'){ const rp=fChild(c,'rPr'); if(rp){ rPr=rp; break; } } }
    const f=runFmt(rPr); let inner='';
    for(const s of segs){
      if(s.type==='text'){ if(s.content.length) inner+=wrapTags(esc(s.content), f.tags); }
      else { ctx.eq++; inner+=eqInline(s.content); }
    }
    return wrapP(f.css?'<span style="'+f.css+'">'+inner+'</span>':inner);
  }
  let inner='';
  const walk=node=>{
    for(const c of Array.from(node.children)){
      const n=c.localName;
      if(n==='r'){
        const f=runFmt(fChild(c,'rPr')); let h='';
        for(const k of Array.from(c.children)){
          if(k.localName==='t') h+=esc(k.textContent);
          else if(k.localName==='tab') h+='&emsp;&emsp;';
          else if(k.localName==='br'||k.localName==='cr') h+='<br>';
          else if(k.localName==='drawing'||k.localName==='pict'||k.localName==='object') ctx.images++;
        }
        if(h){ h=wrapTags(h,f.tags); inner+=f.css?'<span style="'+f.css+'">'+h+'</span>':h; }
      } else if(n==='oMath'){ inner+='<span class="eqi">'+esc(omathToPreviewText(c))+'</span>'; }
      else if(n==='oMathPara'){ const om=fChild(c,'oMath'); if(om) inner+='<span class="eqi">'+esc(omathToPreviewText(om))+'</span>'; }
      else if(['hyperlink','ins','smartTag','sdt','sdtContent','fldSimple'].includes(n)) walk(c);
    }
  };
  walk(p);
  return wrapP(inner);
}
function tableRowsHTML(tbl, ctx){
  const grid=Array.from(fChild(tbl,'tblGrid')?fChild(tbl,'tblGrid').children:[]).map(g=>+(g.getAttributeNS(WNS,'w')||0));
  const sum=grid.reduce((a,b)=>a+b,0);
  const colgroup=(sum>0)?'<colgroup>'+grid.map(g=>'<col style="width:'+(g/sum*100).toFixed(2)+'%">').join('')+'</colgroup>':'';
  const rows=Array.from(tbl.children).filter(c=>c.localName==='tr').map(tr=>{
    let h='<tr>';
    for(const tc of Array.from(tr.children).filter(c=>c.localName==='tc')){
      const tcPr=fChild(tc,'tcPr'); const gs=tcPr?wVal(fChild(tcPr,'gridSpan')):null;
      let cell='';
      for(const k of Array.from(tc.children)){
        if(k.localName==='p') cell+=paraToHTML(k,ctx);
        else if(k.localName==='tbl'){ const r=tableRowsHTML(k,ctx); cell+='<table class="dt">'+r.colgroup+r.rows.join('')+'</table>'; }
      }
      h+='<td'+(gs&&+gs>1?' colspan="'+gs+'"':'')+'>'+(cell||'&nbsp;')+'</td>';
    }
    return h+'</tr>';
  });
  return {colgroup, rows};
}
function docxToBlocks(xmlString){
  const doc=new DOMParser().parseFromString(xmlString,'application/xml');
  if(doc.getElementsByTagName('parsererror').length>0) throw new Error('Không đọc được cấu trúc XML của file Word (file có thể bị lỗi).');
  const body=doc.getElementsByTagNameNS(WNS,'body')[0];
  const ctx={eq:0, paras:0, images:0}; const blocks=[];
  if(body) for(const child of Array.from(body.children)){
    if(child.localName==='p') blocks.push({h:paraToHTML(child,ctx), gap:6});
    else if(child.localName==='tbl'){
      const r=tableRowsHTML(child,ctx);
      // Mỗi hàng bảng là một khối riêng (cùng độ rộng cột) để có thể ngắt trang giữa các hàng.
      r.rows.forEach((row,i)=>blocks.push({h:'<table class="dt">'+r.colgroup+row+'</table>', gap:(i===r.rows.length-1?8:0), mt:(i>0?-1:0)}));
    }
  }
  if(!blocks.length) blocks.push({h:'<div class="pp">&nbsp;</div>', gap:6});
  return {blocks, eq:ctx.eq, images:ctx.images, paras:ctx.paras};
}
function blockHTML(b){ return '<div class="blk" style="padding-bottom:'+b.gap+'px;'+(b.mt?'margin-top:'+b.mt+'px;':'')+'">'+b.h+'</div>'; }

/* ======================= Xuất PDF: dàn trang A4, dựng từng trang thành ảnh rồi ghép vào PDF ======================= */
async function blocksToPdfBytes(blocks, onPage){
  if(!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF))
    throw new Error('Chưa tải được thư viện tạo PDF (jsPDF/html2canvas từ cdnjs). Hãy kiểm tra Internet rồi tải lại trang.');
  const PW=794, PH=1123, PAD=48, CW=PW-2*PAD, CH=PH-2*PAD;   // A4 ở 96 dpi, lề ~1,27 cm
  const mk=(id,extra)=>{ const d=document.createElement('div'); d.id=id; d.className='doc'; d.style.cssText='position:fixed;left:-12000px;top:0;background:#fff;z-index:-1;'+extra; document.body.appendChild(d); return d; };
  const stageHost=mk('pdfStage','width:'+CW+'px;'), pageHost=mk('pdfHost','width:'+PW+'px;');
  try{
    stageHost.innerHTML=blocks.map(blockHTML).join('');
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    const els=Array.from(stageHost.children);
    const hs=els.map(e=>e.offsetHeight);
    // Xếp khối vào trang; khối cao hơn 1 trang thì cắt lát theo chiều cao trang.
    const pages=[]; let cur=[], used=0;
    const newPage=()=>{ if(cur.length) pages.push(cur); cur=[]; used=0; };
    els.forEach((el,i)=>{
      const h=hs[i];
      if(h>CH){
        newPage();
        for(let off=0; off<h; off+=CH){ pages.push([{el, slice:{off, h:Math.min(CH,h-off)}}]); }
      } else {
        if(used+h>CH) newPage();
        cur.push({el}); used+=h;
      }
    });
    if(cur.length) pages.push(cur);
    if(!pages.length) pages.push([]);
    const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
    for(let pi=0; pi<pages.length; pi++){
      if(onPage) onPage(pi+1, pages.length);
      await new Promise(r=>setTimeout(r,0));
      const pg=document.createElement('div');
      pg.className='doc pdfpage';
      pg.style.cssText='width:'+PW+'px;height:'+PH+'px;padding:'+PAD+'px;box-sizing:border-box;background:#fff;overflow:hidden;position:relative;';
      const inner=document.createElement('div'); inner.style.width=CW+'px'; pg.appendChild(inner);
      for(const it of pages[pi]){
        if(it.slice){
          const wrap=document.createElement('div'); wrap.style.cssText='height:'+it.slice.h+'px;overflow:hidden;position:relative;';
          const c=it.el.cloneNode(true); c.style.cssText+='position:absolute;left:0;top:-'+it.slice.off+'px;width:100%;';
          wrap.appendChild(c); inner.appendChild(wrap);
        } else inner.appendChild(it.el.cloneNode(true));
      }
      pageHost.appendChild(pg);
      const canvas=await window.html2canvas(pg,{scale:2,backgroundColor:'#ffffff',logging:false,
        onclone:d=>{ const h=d.getElementById('pdfHost'); if(h){ h.style.left='0'; h.style.top='0'; } }});
      pageHost.removeChild(pg);
      if(pi>0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297,undefined,'FAST');
    }
    return new Uint8Array(pdf.output('arraybuffer'));
  } finally { stageHost.remove(); pageHost.remove(); }
}
