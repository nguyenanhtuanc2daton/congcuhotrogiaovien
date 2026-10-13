/* Công cụ Word · Đổi tên file hàng loạt (mọi loại file) → tải về 1 file ZIP */
(function(){
  var sel=document.getElementById('wtSel'); if(!sel) return;
  var files=[];   // {file:File}

  /* ---------- Giao diện: thêm mục vào danh sách chọn + khung công cụ ---------- */
  var opt=document.createElement('option'); opt.value='wtRename'; opt.textContent='✏️ Đổi tên file hàng loạt'; sel.appendChild(opt);
  var panel=document.createElement('div'); panel.className='wtool'; panel.id='wtRename';
  panel.innerHTML=
    '<div class="bar"><input type="file" id="wtRnIn" multiple style="display:none">'+
      '<button class="ghost" id="wtRnPick" type="button">📁 Chọn file (mọi định dạng, chọn được nhiều file)</button>'+
      '<button class="sec sm" id="wtRnSort" type="button">↧ Sắp A→Z</button>'+
      '<button class="sec sm" id="wtRnClear" type="button">🗑 Xóa tất cả</button></div>'+
    '<div class="bar">'+
      '<label class="note" style="margin:0">Tên file <input type="text" id="wtRnName" placeholder="VD: Đề thi" style="width:170px"></label>'+
      '<label class="note" style="margin:0">Số bắt đầu <input type="number" id="wtRnStart" value="1" min="0" step="1" style="width:70px"></label>'+
    '</div>'+
    '<div class="bar">'+
      '<label class="note" style="margin:0">Kiểu <select id="wtRnFmt"><option value="before">1. Đề thi</option><option value="after">Đề thi 1</option></select></label>'+
      '<label class="note" style="margin:0"><input type="checkbox" id="wtRnPad"> Số 2 chữ số (01, 02…)</label>'+
    '</div>'+
    '<div id="wtRnList"></div>'+
    '<div class="bar"><button class="green" id="wtRnRun" type="button">📦 Đổi tên &amp; tải về (ZIP)</button></div>'+
    '<div id="wtRnSt" class="status"></div>'+
    '<div class="note">Thứ tự đánh số theo danh sách bên trên (dùng ▲ ▼ để đổi, hoặc bấm “Sắp A→Z”). Giữ nguyên đuôi file (.docx, .pdf, .jpg…). Để trống ô tên thì giữ tên cũ và chỉ thêm số. File gốc trên máy không bị thay đổi, các file đã đổi tên nằm trong file ZIP.</div>';
  var all=document.querySelectorAll('.wtool'); var last=all[all.length-1];
  last.parentNode.insertBefore(panel,last.nextSibling);

  function $(id){return document.getElementById(id);}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fmtSize(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(1)+' MB';}
  function splitName(n){var d=n.lastIndexOf('.'); return d>0?{base:n.slice(0,d),ext:n.slice(d)}:{base:n,ext:''};}
  function clean(s){return s.replace(/[\\\/:*?"<>|\u0000-\u001f]+/g,'_').replace(/\s+/g,' ').trim();}
  function setSt(c,t){var e=$('wtRnSt'); e.className='status '+c; e.textContent=t;}

  /* ---------- Tạo tên mới theo thứ tự trong danh sách ---------- */
  function newNames(){
    var name=clean($('wtRnName').value), start=parseInt($('wtRnStart').value,10); if(isNaN(start)||start<0) start=1;
    var after=$('wtRnFmt').value==='after', pad=$('wtRnPad').checked, used={}, out=[];
    files.forEach(function(it,i){
      var p=splitName(it.file.name), num=String(start+i); if(pad&&num.length<2) num='0'+num;
      var stem=name||clean(p.base)||'file';
      var nn=after? stem+' '+num : num+'. '+stem;
      var full=nn+p.ext, k=2; while(used[full.toLowerCase()]) full=nn+' ('+(k++)+')'+p.ext;
      used[full.toLowerCase()]=1; out.push(full);
    });
    return out;
  }

  function render(){
    var box=$('wtRnList');
    if(!files.length){box.innerHTML='<div class="note">Chưa chọn file nào.</div>'; return;}
    var nn=newNames();
    box.innerHTML=files.map(function(it,i){
      return '<div class="frow" style="display:flex;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(128,128,128,.25)">'+
        '<div style="flex:1;min-width:0;word-break:break-word"><div style="opacity:.65;font-size:12px">'+esc(it.file.name)+' · '+fmtSize(it.file.size)+'</div>'+
        '<div style="font-weight:600">→ '+esc(nn[i])+'</div></div>'+
        '<button class="sec sm" data-act="up" data-i="'+i+'" type="button">▲</button>'+
        '<button class="sec sm" data-act="dn" data-i="'+i+'" type="button">▼</button>'+
        '<button class="sec sm" data-act="rm" data-i="'+i+'" type="button">✕</button></div>';
    }).join('');
  }

  function add(list){
    var n=0; Array.prototype.forEach.call(list,function(f){files.push({file:f}); n++;});
    render(); if(n) setSt('info','Đã thêm '+n+' file. Tổng: '+files.length+' file.');
  }

  /* ---------- Sự kiện ---------- */
  $('wtRnPick').addEventListener('click',function(){$('wtRnIn').click();});
  $('wtRnIn').addEventListener('change',function(e){var l=Array.from(e.target.files||[]); e.target.value=''; if(l.length) add(l);});
  ['wtRnName','wtRnStart','wtRnFmt','wtRnPad'].forEach(function(id){$(id).addEventListener('input',render); $(id).addEventListener('change',render);});
  $('wtRnClear').addEventListener('click',function(){files=[]; render(); setSt('','');});
  $('wtRnSort').addEventListener('click',function(){
    files.sort(function(a,b){return a.file.name.localeCompare(b.file.name,'vi',{numeric:true,sensitivity:'base'});}); render();
  });
  $('wtRnList').addEventListener('click',function(e){
    var b=e.target.closest('button[data-act]'); if(!b) return;
    var i=+b.dataset.i, a=b.dataset.act;
    if(a==='rm') files.splice(i,1);
    else if(a==='up'&&i>0){var t=files[i-1]; files[i-1]=files[i]; files[i]=t;}
    else if(a==='dn'&&i<files.length-1){var t2=files[i+1]; files[i+1]=files[i]; files[i]=t2;}
    render();
  });
  ['dragover','drop'].forEach(function(ev){panel.addEventListener(ev,function(e){
    e.preventDefault(); if(ev==='drop'&&e.dataTransfer&&e.dataTransfer.files.length) add(e.dataTransfer.files);
  });});

  /* ---------- Đổi tên & nén ZIP ---------- */
  function download(blob,name){
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
    document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href); a.remove();},4000);
  }
  $('wtRnRun').addEventListener('click',async function(){
    if(!files.length){setSt('err','Chưa chọn file nào.'); return;}
    if(typeof JSZip==='undefined'){setSt('err','Thiếu thư viện nén ZIP (JSZip). Kiểm tra kết nối mạng rồi tải lại trang.'); return;}
    var btn=this; btn.disabled=true;
    try{
      var nn=newNames(), zip=new JSZip();
      for(var i=0;i<files.length;i++){
        setSt('info','Đang đọc file '+(i+1)+'/'+files.length+'...');
        zip.file(nn[i], await files[i].file.arrayBuffer());
      }
      setSt('info','Đang nén...');
      var blob=await zip.generateAsync({type:'blob',compression:'STORE'});
      var zn=clean($('wtRnName').value)||'file'; download(blob, zn+' (da doi ten).zip');
      setSt('ok','Đã đổi tên và nén '+files.length+' file: '+nn[0]+(files.length>1?' … '+nn[files.length-1]:'')+'.');
    }catch(err){ setSt('err','Lỗi: '+err.message); }
    finally{ btn.disabled=false; }
  });

  render();
})();
