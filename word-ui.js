/* Công cụ Word · Mô-đun 1: danh sách file, nút bấm, xuất .docx/.pdf */


/* ======================= Danh sách file (chọn nhiều file) & trạng thái giao diện ======================= */
const $$=id=>document.getElementById(id);
let queue=[];   // mỗi phần tử: {name,size,kind:'docx'|'txt',entries,docXml,plain,text}

function fmtSize(n){ return n<1024? n+' B' : n<1048576 ? (n/1024).toFixed(0)+' KB' : (n/1048576).toFixed(1)+' MB'; }
function renderFileList(){
  const box=$$('fileList');
  if(!queue.length){ box.innerHTML=''; $$('btnClearFiles').style.display='none'; return; }
  $$('btnClearFiles').style.display='';
  box.innerHTML=queue.map((f,i)=>'<div class="frow"><span>'+(f.kind==='docx'?'📄':'📃')+'</span><span class="fnm" title="'+escAttr(f.name)+'">'+esc(f.name)+'</span><span class="fsz">'+fmtSize(f.size)+'</span><button class="sec sm fx" data-i="'+i+'" type="button" title="Bỏ file này">✕</button></div>').join('');
}
function updateModeUI(){
  const badge=$$('modeBadge'), note=$$('modeNote'), ta=$$('input');
  if(queue.length===0){
    if(ta.value.trim()){
      badge.style.display='inline-block'; badge.textContent='Chế độ văn bản thuần (không có bảng)';
      note.textContent='Đang ở chế độ dán/văn bản thuần — KHÔNG giữ được bảng. Muốn giữ bảng, hãy chọn file .docx ở trên.';
    } else {
      badge.style.display='none';
      note.textContent='Chưa chọn file — bạn có thể chọn NHIỀU file .docx/.txt cùng lúc, hoặc dán văn bản thuần để thử nhanh (chế độ dán KHÔNG giữ được bảng).';
    }
  } else {
    const nd=queue.filter(f=>f.kind==='docx').length, nt=queue.length-nd;
    badge.style.display='inline-block';
    badge.textContent = queue.length===1 ? (nd? 'Chế độ file .docx (giữ nguyên bảng)' : 'Chế độ văn bản thuần (không có bảng)')
                                         : queue.length+' file đã chọn ('+nd+' .docx'+(nt?', '+nt+' .txt':'')+')';
    note.textContent = queue.length===1 && nt
      ? 'File .txt là văn bản thuần — KHÔNG giữ được bảng. Bạn có thể sửa nội dung ở ô bên dưới trước khi xuất.'
      : 'Mỗi file được chuyển riêng, file .docx giữ nguyên cấu trúc gốc (bảng, định dạng). Ô bên dưới chỉ để xem, không dùng để sửa khi xuất.';
  }
}
function syncInputBox(){
  const ta=$$('input');
  if(queue.length===0){
    if(ta.dataset.fromFile==='1'){ ta.value=''; delete ta.dataset.fromFile; }
    ta.readOnly=false;
  } else if(queue.length===1){
    const f=queue[0]; ta.dataset.fromFile='1';
    if(f.kind==='docx'){ ta.value=f.plain; ta.readOnly=true; } else { ta.value=f.text; ta.readOnly=false; }
  } else {
    ta.dataset.fromFile='1'; ta.readOnly=true;
    ta.value='Đã chọn '+queue.length+' file:\n'+queue.map((f,i)=>(i+1)+'. '+f.name).join('\n');
  }
  updateModeUI();
}
// Trả về danh sách mục cần xử lý: các file đã chọn, hoặc văn bản dán vào ô nhập nếu chưa chọn file.
function getItems(){
  if(queue.length===1 && queue[0].kind==='txt') return [{...queue[0], text:$$('input').value}];
  if(queue.length) return queue;
  const t=$$('input').value;
  return t.trim()? [{name:'giao-an.txt', kind:'txt', text:t, pasted:true}] : [];
}
function baseName(name){ return name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'_') || 'van-ban'; }

const TXT_CONTENT_TYPES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const TXT_ROOT_RELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const TXT_DOC_RELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
function itemToDocxBytes(item){
  if(item.kind==='docx'){
    const {xml}=convertDocumentXML(item.docXml);
    return makeZip(item.entries.map(e=>e.name==='word/document.xml' ? {name:e.name, data:strToBytes(xml)} : e));
  }
  if(!item.text.trim()) throw new Error('Không có nội dung để xuất.');
  return makeZip([
    {name:'[Content_Types].xml', data:strToBytes(TXT_CONTENT_TYPES)},
    {name:'_rels/.rels', data:strToBytes(TXT_ROOT_RELS)},
    {name:'word/_rels/document.xml.rels', data:strToBytes(TXT_DOC_RELS)},
    {name:'word/document.xml', data:strToBytes(buildDocumentXMLFromPlainText(item.text))}
  ]);
}
function itemToBlocks(item){
  return item.kind==='docx' ? docxToBlocks(item.docXml) : textToBlocks(item.text);
}

function showEqReport(){ const el=$$('eqReport'); if(!el) return; const h=eqSummaryHTML(); el.innerHTML=h; el.style.display=h?'block':'none'; }
function setBusy(b){ $$('btnConvert').disabled=b; $$('btnExport').disabled=b; $$('btnChoose').disabled=b; $$('btnClearFiles').disabled=b; }

function previewConvert(){
  const st=$$('exportStatus'), prev=$$('preview');
  const items=getItems();
  if(!items.length){ prev.innerHTML='<span style="color:#999">(Chưa có nội dung)</span>'; st.className='status err'; st.textContent='Chưa có file hoặc nội dung để chuyển đổi.'; return; }
  let html='', totalEq=0, totalParas=0, images=0; const errs=[];
  eqLogReset();
  for(const it of items){
    try{
      let r;
      if(it.kind==='docx'){
        const c=convertDocumentXML(it.docXml);           // kiểm tra chuyển được sang Equation của Word
        r=itemToBlocks(it); r.paras=c.changedParas; r.eq=c.totalEq;
      } else { buildDocumentXMLFromPlainText(it.text); r=itemToBlocks(it); }
      totalEq+=r.eq; totalParas+=(r.paras||0); images+=r.images||0;
      if(items.length>1) html+='<div class="fhead">📄 '+esc(it.name)+' — '+r.eq+' công thức</div>';
      html+=r.blocks.map(blockHTML).join('');
    }catch(err){ errs.push(it.name+': '+err.message); if(items.length>1) html+='<div class="fhead err">⚠ '+esc(it.name)+' — lỗi: '+esc(err.message)+'</div>'; }
  }
  prev.className='doc paper'; prev.innerHTML=html;
  showEqReport();
  if(errs.length && errs.length===items.length){ st.className='status err'; st.textContent='Lỗi khi chuyển đổi: '+errs.join(' | '); return; }
  st.className='status ok';
  st.textContent='Đã chuyển đổi '+(items.length-errs.length)+'/'+items.length+' file. Tìm thấy '+totalEq+' công thức'+(totalParas?' trong '+totalParas+' đoạn văn':'')+'.'
    +(images?' Lưu ý: '+images+' ảnh/đối tượng trong file .docx không hiển thị ở bản xem trước và bản PDF (bản Word vẫn giữ nguyên).':'')
    +(errs.length?' Lỗi: '+errs.join(' | '):'');
}

async function exportAll(){
  const st=$$('exportStatus');
  const items=getItems();
  if(!items.length){ st.className='status err'; st.textContent='Chưa có file hoặc nội dung để xuất.'; return; }
  const fmt=$$('fmt').value;               // 'docx' | 'pdf' | 'both'
  const outputs=[], fails=[], used=new Set(); let images=0;
  const uniq=n=>{ let out=n, k=2; const dot=n.lastIndexOf('.'); while(used.has(out)){ out=n.slice(0,dot)+'-'+(k++)+n.slice(dot); } used.add(out); return out; };
  setBusy(true); st.className='status info'; eqLogReset();
  try{
    for(let i=0;i<items.length;i++){
      const it=items[i], pre='('+(i+1)+'/'+items.length+') '+it.name+': ';
      const stem=it.pasted? 'giao-an' : baseName(it.name)+'-da-chuyen-doi';
      try{
        if(fmt!=='pdf'){
          st.textContent=pre+'đang tạo file Word...'; await new Promise(r=>setTimeout(r,0));
          outputs.push({name:uniq(stem+'.docx'), data:itemToDocxBytes(it), mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
        }
        if(fmt!=='docx'){
          const r=itemToBlocks(it); images+=r.images||0;
          const bytes=await blocksToPdfBytes(r.blocks,(p,n)=>{ st.textContent=pre+'đang tạo PDF, trang '+p+'/'+n+'...'; });
          outputs.push({name:uniq(stem+'.pdf'), data:bytes, mime:'application/pdf'});
        }
      }catch(err){ fails.push(it.name+': '+err.message); }
    }
    if(!outputs.length) throw new Error(fails.join(' | ') || 'Không tạo được file nào.');
    if(outputs.length>1 && $$('zipOpt').checked){
      st.textContent='Đang nén '+outputs.length+' file kết quả...';
      await downloadBlob(makeZip(outputs.map(o=>({name:o.name,data:o.data}))), 'ket-qua-chuyen-doi.zip', 'application/zip');
    } else {
      for(const o of outputs){ await downloadBlob(o.data, o.name, o.mime); if(outputs.length>1) await new Promise(r=>setTimeout(r,400)); }
    }
    showEqReport();
    st.className='status '+(fails.length?'info':'ok');
    st.textContent='Đã xuất '+outputs.length+' file'+(outputs.length>1&&$$('zipOpt').checked?' (nén trong ket-qua-chuyen-doi.zip)':'')+'.'
      +(images && fmt!=='docx'?' Lưu ý: ảnh/đối tượng trong file .docx không xuất được sang PDF (file Word vẫn giữ nguyên).':'')
      +(fails.length?' Không xử lý được: '+fails.join(' | '):'');
  }catch(err){
    st.className='status err';
    st.textContent='Lỗi khi xuất file: '+err.message;
  }finally{ setBusy(false); }
}

async function addFiles(files){
  const fs=$$('fileStatus'); fs.className='status info';
  let added=0; const bad=[];
  for(let k=0;k<files.length;k++){
    const file=files[k], lower=file.name.toLowerCase();
    fs.textContent='Đang đọc file '+(k+1)+'/'+files.length+': '+file.name+'...';
    if(queue.some(q=>q.name===file.name && q.size===file.size)){ bad.push(file.name+' (đã có trong danh sách)'); continue; }
    try{
      if(lower.endsWith('.docx')){
        const entries=await unzipAll(await file.arrayBuffer());
        const docEntry=entries.find(en=>en.name==='word/document.xml');
        if(!docEntry) throw new Error('không có word/document.xml (có thể không phải file Word hợp lệ)');
        const docXml=new TextDecoder('utf-8').decode(docEntry.data);
        queue.push({name:file.name, size:file.size, kind:'docx', entries, docXml,
          plain: docXml.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,4000)+' ...'});
        added++;
      } else if(lower.endsWith('.txt')){
        queue.push({name:file.name, size:file.size, kind:'txt', text:await file.text()});
        added++;
      } else bad.push(file.name+' (chỉ hỗ trợ .docx hoặc .txt)');
    }catch(err){ bad.push(file.name+': '+err.message); }
  }
  renderFileList(); syncInputBox();
  fs.className='status '+(bad.length? (added?'info':'err') : 'ok');
  fs.textContent=(added?'Đã thêm '+added+' file. ':'')+'Tổng: '+queue.length+' file, sẵn sàng chuyển đổi.'+(bad.length?' Bỏ qua: '+bad.join('; '):'');
}

$$('btnChoose').addEventListener('click', ()=>$$('fileInput').click());
$$('fileInput').addEventListener('change', async function(e){
  const files=Array.from(e.target.files||[]); e.target.value='';
  if(files.length) await addFiles(files);
});
$$('fileList').addEventListener('click', e=>{
  const b=e.target.closest('.fx'); if(!b) return;
  queue.splice(+b.dataset.i,1); renderFileList(); syncInputBox();
  $$('fileStatus').className='status info'; $$('fileStatus').textContent=queue.length?'Còn '+queue.length+' file trong danh sách.':'';
});
$$('btnClearFiles').addEventListener('click', ()=>{
  queue=[]; renderFileList(); syncInputBox(); $$('fileStatus').textContent=''; $$('preview').innerHTML='';
});
$$('input').addEventListener('input', updateModeUI);
$$('btnConvert').addEventListener('click', previewConvert);
$$('btnExport').addEventListener('click', exportAll);
renderFileList(); syncInputBox();
