/* Công cụ Word · "Trộn thư": Excel danh sách lớp → Word, MỖI HỌC SINH 1 TRANG
   Loại văn bản: 🏆 Giấy khen · 📢 Thông báo · 📝 Nhận xét · ✉ Giấy mời (AI soạn + tự kiểm tra, sai thì soạn lại trước khi xuất).
   Đọc được mẫu "BẢNG ĐIỂM HỌC KỲ" (cột STT · Mã định danh · Họ và tên · Ngày sinh · Giới tính · … · ĐTBmhk).
   Cần: JSZip, SheetJS (XLSX) (index.html đã nạp) · gkey.js (chỉ khi dùng AI soạn Giấy mời).
   Tự chèn mục "📬 Trộn thư" vào ô chọn công cụ #wtSel — chỉ cần thêm 1 thẻ <script src="word-mail-merge.js">.
   Quyền riêng tư: HỌ TÊN HỌC SINH KHÔNG BAO GIỜ được gửi cho AI — AI chỉ soạn phần nội dung chung, tên được chèn tại máy. */
(function(){
'use strict';
const sel=document.getElementById('wtSel'),t3=document.getElementById('t3');
if(!sel||!t3)return;
const VERSION='MM-1.1';
const WNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const FONT='Times New Roman';
const g=id=>document.getElementById(id);
const hx=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tick=()=>new Promise(r=>setTimeout(r,0));
const cs=v=>v==null?'':String(v).normalize('NFC').replace(/[\u00a0\s]+/g,' ').trim();
const nd=s=>cs(s).replace(/[đĐ]/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const xs=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ============================ 1. ĐỌC EXCEL ============================ */
function titleCaseVi(s){return cs(s).toLocaleLowerCase('vi').replace(/(^|[\s\-'’])(\p{L})/gu,(m,a,b)=>a+b.toLocaleUpperCase('vi'))}
function toNum(v){const s=cs(v).replace(',','.');if(!/^\d+(\.\d+)?$/.test(s))return null;const n=parseFloat(s);return n>=0&&n<=10?n:null}
function fmtDTB(n){return n==null?'':String(n).replace('.',',')}
function xepLoai(d){return d==null?'':d>=8?'Giỏi':d>=6.5?'Khá':d>=5?'Trung bình':'Yếu'}
function bandKey(d){return d==null?'none':d>=8?'gioi':d>=6.5?'kha':d>=5?'tb':'yeu'}
function fixDob(s){s=cs(s);if(/^\d{5}$/.test(s)){const d=new Date(Date.UTC(1899,11,30)+(+s)*864e5);return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear()}return s}
const ROMAN={'1':'I','2':'II','3':'III'};
function parseAoa(aoa,sheetName){
  const nr=aoa.length;let hr=-1,nc=-1;
  for(let r=0;r<Math.min(nr,40)&&hr<0;r++){const row=aoa[r]||[];
    for(let c=0;c<row.length;c++){if(/^(ho va ten|ho ten|ho va ten hoc sinh|ho ten hoc sinh)$/.test(nd(row[c]))){hr=r;nc=c;break}}}
  if(hr<0)return{ok:false,reason:'không tìm thấy cột “Họ và tên”'};
  const meta={lop:'',truong:'',nam:'',hocky:'',mon:'',gv:'',xa:''};
  for(let r=0;r<hr;r++)for(const raw of (aoa[r]||[])){
    const s=cs(raw);if(!s)continue;const n=nd(s);let m;
    if(/^lop\s*[:：]/.test(n))meta.lop=s.replace(/^[^:：]*[:：]\s*/,'');
    else if(/^truong\s*[:：]/.test(n))meta.truong=s.replace(/^[^:：]*[:：]\s*/,'');
    else if(/^(xa|phuong|thi tran)\s+\S/.test(n)&&!meta.xa)meta.xa=s;
    if(/nam hoc\s*[:：]/.test(n)){if((m=/(\d{4})\s*[-–—]\s*(\d{4})/.exec(s)))meta.nam=m[1]+' - '+m[2];if((m=/hoc\s*ky\s*[:：]?\s*(\d)/.exec(n)))meta.hocky=m[1]}
    if(/^mon hoc\s*[:：]/.test(n)){const body=s.replace(/^[^:：]*[:：]\s*/,'');const mm=/^(.+?)\s*[-–—]\s*GV\s*[:：]\s*(.+)$/i.exec(body);if(mm){meta.mon=cs(mm[1]);meta.gv=cs(mm[2])}else meta.mon=body}
  }
  let ds=-1;
  for(let r=hr+1;r<Math.min(nr,hr+8);r++){const nm=cs((aoa[r]||[])[nc]);if(nm&&/\p{L}/u.test(nm)){ds=r;break}}
  if(ds<0)return{ok:false,reason:'không có dòng học sinh nào dưới cột “Họ và tên”'};
  const ncol=Math.max(...aoa.slice(hr,ds+1).map(r=>(r||[]).length),nc+1);
  const head=[];for(let c=0;c<ncol;c++){const a=[];for(let r=hr;r<ds;r++){const t=cs((aoa[r]||[])[c]);if(t)a.push(t)}head.push(nd(a.join(' ')))}
  const col=re=>head.findIndex(h=>re.test(h));
  const cStt=col(/^stt$/),cMa=col(/ma dinh danh|ma hoc sinh|ma hs|dinh danh/),cDob=col(/ngay sinh|ngay thang nam sinh/),cGt=col(/gioi tinh/);
  let cDtb=-1;const dc=head.map((h,i)=>/dtb/.test(h)?i:-1).filter(i=>i>=0);
  for(const i of dc){let n=0;for(let r=ds;r<nr;r++)if(toNum((aoa[r]||[])[i])!=null)n++;if(n>0)cDtb=i}
  if(cDtb<0&&dc.length)cDtb=dc[dc.length-1];
  const students=[];
  for(let r=ds;r<nr;r++){const row=aoa[r]||[];const name=cs(row[nc]);if(!name||!/\p{L}/u.test(name))continue;
    if(cStt>=0&&!/^\d+$/.test(cs(row[cStt])))continue;
    const gt=cGt>=0?cs(row[cGt]):'';
    students.push({stt:cStt>=0?cs(row[cStt]):String(students.length+1),ma:cMa>=0?cs(row[cMa]):'',ten:name,dob:cDob>=0?fixDob(row[cDob]):'',gt:/^n[uữ]/i.test(nd(gt))?'Nữ':/^nam/i.test(nd(gt))?'Nam':gt,
      dtb:cDtb>=0?toNum(row[cDtb]):null,lop:meta.lop||sheetName||'',sheet:sheetName||'',on:true})}
  return{ok:true,meta,students,cols:{stt:cStt,ma:cMa,ten:nc,dob:cDob,gt:cGt,dtb:cDtb},headerRow:hr+1,dataRow:ds+1};
}

/* ============================ 2. NGÀY THÁNG & MẪU CHỮ ============================ */
const WD=['Chủ nhật','thứ Hai','thứ Ba','thứ Tư','thứ Năm','thứ Sáu','thứ Bảy'];
function parseISO(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));if(!m)return null;const y=+m[1],mo=+m[2],d=+m[3],dt=new Date(y,mo-1,d);
  if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return null;return{y,mo,d,dt}}
/* Nghị định 30/2020: ngày < 10 và tháng 1, 2 phải thêm số 0 ở trước */
function ngayThang(p){return 'ngày '+(p.d<10?'0'+p.d:p.d)+' tháng '+(p.mo<3?'0'+p.mo:p.mo)+' năm '+p.y}
function todayP(){const t=new Date();return{y:t.getFullYear(),mo:t.getMonth()+1,d:t.getDate(),dt:new Date(t.getFullYear(),t.getMonth(),t.getDate())}}
const VARS=['HoTen','Lop','NgaySinh','GioiTinh','MaDD','STT','DTB','XepLoai','Truong','NamHoc','HocKy','Mon','GV'];
function tplUnknown(t){const bad=new Set();String(t).replace(/\{([^{}]*)\}/g,(m,k)=>{if(VARS.indexOf(k.trim())<0)bad.add(m)});
  const rest=String(t).replace(/\{[^{}]*\}/g,'');if(/[{}]/.test(rest))bad.add('dấu { } lẻ');return[...bad]}
function fill(t,v){return String(t).replace(/\{([^{}]*)\}/g,(m,k)=>{k=k.trim();return v[k]!=null?v[k]:m})}
function varsOf(s,cfg){return{HoTen:s.ten,Lop:s.lop,NgaySinh:s.dob,GioiTinh:s.gt,MaDD:s.ma,STT:s.stt,DTB:s.dtb==null?'chưa có':fmtDTB(s.dtb),XepLoai:xepLoai(s.dtb)||'chưa xếp loại',
  Truong:cfg.truongRaw,NamHoc:cfg.nam,HocKy:ROMAN[cfg.hocky]||cfg.hocky,Mon:cfg.mon,GV:cfg.gv}}

/* ============================ 3. DỰNG WORD (XML) ============================ */
const PORTRAIT={w:11906,h:16838,t:1134,b:1134,l:1701,r:851,orient:''};
const LAND={w:16838,h:11906,t:1134,b:1134,l:1417,r:1417,orient:'landscape'};
function runX(r){const sz=r.sz||28;
  const rpr='<w:rFonts w:ascii="'+FONT+'" w:hAnsi="'+FONT+'" w:eastAsia="'+FONT+'" w:cs="'+FONT+'"/>'+(r.b?'<w:b/><w:bCs/>':'')+(r.i?'<w:i/><w:iCs/>':'')+(r.color?'<w:color w:val="'+r.color+'"/>':'')+'<w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/>'+(r.u?'<w:u w:val="single"/>':'');
  let inner='';String(r.t).split(/(\t|\n)/).forEach(p=>{if(p==='\t')inner+='<w:tab/>';else if(p==='\n')inner+='<w:br/>';else if(p!=='')inner+='<w:t xml:space="preserve">'+xs(p)+'</w:t>'});
  return '<w:r><w:rPr>'+rpr+'</w:rPr>'+inner+'</w:r>'}
function sectX(P,border){return '<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="'+P.w+'" w:h="'+P.h+'"'+(P.orient?' w:orient="'+P.orient+'"':'')+'/><w:pgMar w:top="'+P.t+'" w:right="'+P.r+'" w:bottom="'+P.b+'" w:left="'+P.l+'" w:header="567" w:footer="567" w:gutter="0"/>'+
  (border?'<w:pgBorders w:offsetFrom="page">'+['top','left','bottom','right'].map(s=>'<w:'+s+' w:val="double" w:sz="12" w:space="24" w:color="'+border+'"/>').join('')+'</w:pgBorders>':'')+'</w:sectPr>'}
function paraX(d,sect){
  let pp='';
  if(d.keepNext)pp+='<w:keepNext/>';
  if(d.border)pp+='<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>';
  pp+='<w:spacing w:before="'+(d.before||0)+'" w:after="'+(d.after==null?120:d.after)+'" w:line="'+(d.lineExact||Math.round((d.line||1.15)*240))+'" w:lineRule="'+(d.lineExact?'exact':'auto')+'"/>';
  if(d.ind){const i=d.ind;pp+='<w:ind w:left="'+(i.l||0)+'" w:right="'+(i.r||0)+'"'+(i.first?' w:firstLine="'+i.first+'"':'')+(i.hang?' w:hanging="'+i.hang+'"':'')+'/>'}
  pp+='<w:jc w:val="'+(d.jc||'left')+'"/>';
  if(d.markSz)pp+='<w:rPr><w:sz w:val="'+d.markSz+'"/><w:szCs w:val="'+d.markSz+'"/></w:rPr>';
  if(sect)pp+=sect;
  return '<w:p><w:pPr>'+pp+'</w:pPr>'+(d.t||[]).map(runX).join('')+'</w:p>'}
function tblX(widths,cells){const tw=widths.reduce((a,b)=>a+b,0);
  return '<w:tbl><w:tblPr><w:tblW w:w="'+tw+'" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>'+
    widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid><w:tr>'+cells.map((c,i)=>'<w:tc><w:tcPr><w:tcW w:w="'+widths[i]+'" w:type="dxa"/></w:tcPr>'+(c.length?c:[{t:[],after:0}]).map(d=>paraX(d)).join('')+'</w:tc>').join('')+'</w:tr></w:tbl>'}
const rule=(l,r)=>({border:1,lineExact:20,after:0,before:0,markSz:2,ind:{l,r},t:[]});
const blank=(n,sz)=>({t:[{t:' ',sz:sz||28}],after:0,lineExact:n||280});
/* mô tả trang → XML  (d.table = {w:[..],cells:[[desc..],[desc..]]}) */
function descX(d){return d.table?tblX(d.table.w,d.table.cells):paraX(d)}
/* Ước lượng chiều cao để biết có tràn sang trang 2 không (đơn vị twips) */
function descText(d){return d.table?d.table.cells.map(c=>c.map(descText).join('\n')).join('\n'):(d.t||[]).map(r=>r.t).join('')}
function descH(d,w){
  if(d.table){return Math.max(...d.table.cells.map((c,i)=>c.reduce((a,x)=>a+descH(x,d.table.w[i]),0)))}
  if(d.lineExact)return d.lineExact+(d.after==null?120:d.after)+(d.before||0);
  const runs=d.t||[];const sz=Math.max(24,...runs.map(r=>r.sz||28))/2;const avail=w-((d.ind&&((d.ind.l||0)+(d.ind.r||0)))||0)-(d.ind&&d.ind.first?d.ind.first/2:0);
  const txt=runs.map(r=>r.t).join('');const letters=txt.replace(/[^\p{L}]/gu,'');const caps=letters.length&&letters.replace(/[^\p{Lu}]/gu,'').length/letters.length>0.6;
  let lines=0;const f=caps?0.68:(runs.some(r=>r.b)?0.53:0.48);txt.split('\n').forEach(seg=>{lines+=Math.max(1,Math.ceil(seg.length*(sz*20)*f/Math.max(avail,500)))});
  return Math.round(lines*sz*20*1.15*(d.line||1.15)+(d.after==null?120:d.after)+(d.before||0))}
function pageH(descs,P){const w=P.w-P.l-P.r;return descs.reduce((a,d)=>a+descH(d,w),0)}
function pageCap(P){return P.h-P.t-P.b}
const FILL=0.94;   // chỉ cho dùng tối đa 94% chiều cao trang (chừa dư vì Word dàn chữ khác ước lượng)

/* ---------- các khối dùng chung ---------- */
function headerBlock(cfg,o){
  const left=[];if(cfg.coQuan)left.push({t:[{t:cfg.coQuan,sz:24}],jc:'center',after:0});
  left.push({t:[{t:cfg.truong,b:1,sz:26}],jc:'center',after:0});left.push(rule(1000,1000));
  if(o.so)left.push({t:[{t:'Số: '+o.so,sz:26}],jc:'center',before:80,after:0});
  const right=[];
  if(o.quocHieu){right.push({t:[{t:'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',b:1,sz:24}],jc:'center',after:0},{t:[{t:'Độc lập - Tự do - Hạnh phúc',b:1,sz:26}],jc:'center',after:0},rule(1000,1000))}
  right.push({t:[{t:cfg.diaDanh+', '+cfg.ngayLap,i:1,sz:28}],jc:'center',before:o.quocHieu?120:0,after:0});
  return{table:{w:[3900,5454],cells:[left,right]}}}
function signBlock(cfg,o){
  const left=[];if(o.noiNhan){left.push({t:[{t:'Nơi nhận:',b:1,i:1,sz:24}],after:0},...o.noiNhan.map(x=>({t:[{t:x,sz:22}],after:0})))}
  const right=[{t:[{t:cfg.chucVu,b:1,sz:28}],jc:'center',after:0},blank(1000),{t:[{t:cfg.nguoiKy,b:1,sz:28}],jc:'center',after:0}];
  return{table:{w:[4300,5054],cells:[left,right]}}}
const tiny={t:[],lineExact:20,after:0,before:0,markSz:2};

/* ---------- 4 loại văn bản ---------- */
function pageKhen(cfg,s,v){
  const d=[];
  if(cfg.coQuan)d.push({t:[{t:cfg.coQuan,sz:26}],jc:'center',after:0});
  d.push({t:[{t:cfg.truong,b:1,sz:30}],jc:'center',after:160});
  d.push({t:[{t:cfg.tieuDe,b:1,sz:88,color:'C00000'}],jc:'center',before:120,after:60});
  d.push({t:[{t:'Tặng học sinh',i:1,sz:32}],jc:'center',after:60});
  d.push({t:[{t:s.ten,b:1,sz:60,color:'1F3864'}],jc:'center',after:60});
  d.push({t:[{t:'Lớp '+s.lop,sz:32}],jc:'center',after:160});
  d.push({t:[{t:fill(cfg.thanhTich,v),sz:32}],jc:'center',after:200,ind:{l:1134,r:1134}});
  d.push({table:{w:[8000,6370],cells:[[],[{t:[{t:cfg.diaDanh+', '+cfg.ngayLap,i:1,sz:28}],jc:'center',after:0},{t:[{t:cfg.chucVu,b:1,sz:28}],jc:'center',after:0},blank(900),{t:[{t:cfg.nguoiKy,b:1,sz:28}],jc:'center',after:0}]]}});
  return{P:LAND,border:'C00000',descs:d,must:[cfg.tieuDe,s.ten,'Lớp '+s.lop,cfg.truong,cfg.chucVu]}}
function adminTop(cfg,title,trichYeu,so){
  const d=[headerBlock(cfg,{quocHieu:true,so})];
  d.push({t:[{t:title,b:1,sz:28}],jc:'center',before:240,after:40});
  if(trichYeu){d.push({t:[{t:trichYeu,b:1,sz:28}],jc:'center',after:20});d.push(rule(3300,3300));d.push(blank(160))}
  return d}
const BODY={ind:{first:720},jc:'both',after:100};
function pageThongBao(cfg,s,v){
  const d=adminTop(cfg,'THÔNG BÁO',fill(cfg.trichYeu,v),cfg.so);
  d.push({t:[{t:'Kính gửi: ',sz:28},{t:fill(cfg.kinhGui,v),b:1,sz:28}],before:60,after:120,ind:{l:0}});
  fill(cfg.noiDung,v).split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(x=>d.push(Object.assign({t:[{t:x,sz:28}]},BODY)));
  d.push({t:[],after:0,lineExact:120});d.push(signBlock(cfg,{noiNhan:['- Như trên;','- Lưu: VT.']}));
  return{P:PORTRAIT,descs:d,must:['THÔNG BÁO','CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM','Độc lập - Tự do - Hạnh phúc','Kính gửi',s.ten,'Nơi nhận:',cfg.chucVu]}}
function pageNhanXet(cfg,s,v){
  const d=[headerBlock(cfg,{quocHieu:false})];
  d.push({t:[{t:'PHIẾU NHẬN XÉT KẾT QUẢ HỌC TẬP',b:1,sz:30}],jc:'center',before:280,after:40});
  d.push({t:[{t:'Môn '+cfg.mon+(cfg.hocky?' - Học kì '+(ROMAN[cfg.hocky]||cfg.hocky):'')+(cfg.nam?' - Năm học '+cfg.nam:''),b:1,sz:28}],jc:'center',after:20});d.push(rule(3300,3300));d.push(blank(160));
  const kv=(k,val)=>d.push({t:[{t:k+': ',sz:28},{t:val,b:1,sz:28}],after:80});
  kv('Họ và tên',s.ten);kv('Lớp',s.lop);if(s.dob)kv('Ngày sinh',s.dob);if(s.ma)kv('Mã định danh',s.ma);
  if(cfg.showDTB)kv('Điểm trung bình môn',s.dtb==null?'chưa có':fmtDTB(s.dtb)+(xepLoai(s.dtb)?' ('+xepLoai(s.dtb)+')':''));
  d.push({t:[{t:'Nhận xét của giáo viên:',b:1,sz:28}],before:160,after:80});
  fill(cfg.band[bandKey(s.dtb)],v).split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(x=>d.push(Object.assign({t:[{t:x,sz:28}]},BODY)));
  d.push({t:[],after:0,lineExact:200});d.push(signBlock(cfg,{noiNhan:null}));
  return{P:PORTRAIT,descs:d,must:['PHIẾU NHẬN XÉT KẾT QUẢ HỌC TẬP','Họ và tên: '+s.ten,'Lớp: '+s.lop,'Nhận xét của giáo viên:',cfg.chucVu]}}
function pageMoi(cfg,s,v,c){
  const d=adminTop(cfg,'GIẤY MỜI',c.trichYeu,cfg.so);
  d.push({t:[{t:'Kính gửi: ',sz:28},{t:(cfg.doiTuong==='ph'?'Quý phụ huynh em '+s.ten+', học sinh lớp '+s.lop:'Em '+s.ten+', học sinh lớp '+s.lop),b:1,sz:28}],before:60,after:120});
  d.push(Object.assign({t:[{t:c.moDau,sz:28}]},BODY));
  d.push({t:[{t:'Thời gian: ',sz:28},{t:cfg.thoiGian,b:1,sz:28}],ind:{l:720},after:60});
  d.push({t:[{t:'Địa điểm: ',sz:28},{t:cfg.diaDiem,b:1,sz:28}],ind:{l:720},after:80});
  d.push({t:[{t:'Nội dung:',sz:28}],ind:{l:720},after:40,keepNext:1});
  c.noiDung.forEach(x=>d.push({t:[{t:'-\t'+x,sz:28}],ind:{l:1080,hang:360},jc:'both',after:40}));
  if(c.luuY.length){d.push({t:[{t:'Lưu ý:',sz:28}],ind:{l:720},before:60,after:40,keepNext:1});c.luuY.forEach(x=>d.push({t:[{t:'-\t'+x,sz:28}],ind:{l:1080,hang:360},jc:'both',after:40}))}
  d.push(Object.assign({t:[{t:c.ket,sz:28}]},BODY,{before:80}));
  d.push({t:[],after:0,lineExact:100});d.push(signBlock(cfg,{noiNhan:['- Như trên;','- Lưu: VT.']}));
  return{P:PORTRAIT,descs:d,must:['GIẤY MỜI','CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM','Độc lập - Tự do - Hạnh phúc','Kính gửi: ',s.ten,'Thời gian: '+cfg.thoiGian,'Địa điểm: '+cfg.diaDiem,'Nội dung:','Nơi nhận:',cfg.chucVu,cfg.nguoiKy]}}

/* ---------- ghép thành file .docx ---------- */
const CT='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>';
const RELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const DRELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>';
const STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="'+WNS+'"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="'+FONT+'" w:hAnsi="'+FONT+'" w:eastAsia="'+FONT+'" w:cs="'+FONT+'"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
const SETTINGS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="'+WNS+'"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>';
function pagesToXml(pages){
  const body=pages.map((pg,i)=>pg.descs.map(descX).join('')+paraX(tiny,i<pages.length-1?sectX(pg.P,pg.border):null)).join('');
  const last=pages[pages.length-1];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="'+WNS+'"><w:body>'+body+sectX(last.P,last.border)+'</w:body></w:document>'}
async function buildDocx(pages){
  const z=new JSZip();z.file('[Content_Types].xml',CT);z.file('_rels/.rels',RELS);z.file('word/_rels/document.xml.rels',DRELS);
  z.file('word/document.xml',pagesToXml(pages));z.file('word/styles.xml',STYLES);z.file('word/settings.xml',SETTINGS);
  return z.generateAsync({type:'uint8array',compression:'DEFLATE'})}

/* ---------- KIỂM TRA FILE WORD SAU KHI DỰNG ---------- */
function ptext(p){let t='';const w=p.getElementsByTagName('*');for(let i=0;i<w.length;i++){const n=w[i];if(n.namespaceURI!==WNS)continue;if(n.localName==='t')t+=n.textContent;else if(n.localName==='tab')t+='\t';else if(n.localName==='br')t+='\n'}return t}
async function checkDocx(bytes,pages){
  const E=[],ok=[];
  let zip;try{zip=await JSZip.loadAsync(bytes)}catch(e){return{errs:['File .docx tạo ra không mở lại được: '+e.message],ok}}
  for(const n of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/settings.xml','word/_rels/document.xml.rels'])if(!zip.file(n))E.push('Thiếu phần '+n);
  if(E.length)return{errs:E,ok};
  const xml=await zip.file('word/document.xml').async('string');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)return{errs:['Cấu trúc XML của file Word không hợp lệ.'],ok};
  ok.push('Cấu trúc file Word hợp lệ');
  const got=[];let cur=[];Array.from(doc.getElementsByTagNameNS(WNS,'p')).forEach(p=>{cur.push(ptext(p));if(p.getElementsByTagNameNS(WNS,'sectPr').length){got.push(cur.join('\n'));cur=[]}});got.push(cur.join('\n'));
  if(got.length!==pages.length)E.push('Số trang trong file ('+got.length+') khác số học sinh ('+pages.length+').');else ok.push('Đúng '+pages.length+' trang, mỗi học sinh 1 trang');
  let bad=0;
  pages.forEach((pg,i)=>{const t=(got[i]||'').normalize('NFC');
    for(const m of pg.must){if(m&&t.indexOf(m.normalize('NFC'))<0){E.push('Trang '+(i+1)+' thiếu “'+m+'”.');bad++;break}}
    if(/[{}]/.test(t)||/undefined|NaN|\bnull\b/.test(t)){E.push('Trang '+(i+1)+' còn ký tự lỗi ({ } / undefined / NaN).');bad++}
    if(/\$/.test(t)){E.push('Trang '+(i+1)+' còn ký tự $.');bad++}});
  if(!bad)ok.push('Mỗi trang đúng tên học sinh, không còn biến chưa thay, không còn ký tự lạ');
  const P=pages[0].P;let geo=true;
  Array.from(doc.getElementsByTagNameNS(WNS,'sectPr')).forEach(sp=>{const sz=sp.getElementsByTagNameNS(WNS,'pgSz')[0],mg=sp.getElementsByTagNameNS(WNS,'pgMar')[0];
    const a=n=>+(n.getAttributeNS(WNS,n.localName)||0);const gv=(e,k)=>+e.getAttributeNS(WNS,k);
    if(!sz||!mg||gv(sz,'w')!==P.w||gv(sz,'h')!==P.h||gv(mg,'top')!==P.t||gv(mg,'bottom')!==P.b||gv(mg,'left')!==P.l||gv(mg,'right')!==P.r)geo=false});
  if(!geo)E.push('Khổ giấy hoặc lề không đúng chuẩn.');else ok.push(P.orient?'Khổ A4 ngang, lề 20/20/25/25 mm':'Khổ A4 dọc, lề chuẩn 20/20/30/15 mm (Nghị định 30/2020)');
  const fonts=new Set(Array.from(doc.getElementsByTagNameNS(WNS,'rFonts')).map(f=>f.getAttributeNS(WNS,'ascii')));
  if(fonts.size!==1||!fonts.has(FONT))E.push('Phông chữ không thống nhất Times New Roman.');else ok.push('Phông chữ Times New Roman thống nhất');
  return{errs:E,ok}}

/* ============================ 5. AI SOẠN GIẤY MỜI + BỘ KIỂM TRA ============================ */
const INFORMAL=['nhé','nha','nhỉ','nhá','hen','ok','okay','oke','hihi','haha','kkk','mình','tụi','tớ','cậu','bạn','tui','tôi','ơi','nè','nhen','thôi nhé','đi nhé'];
const ENG=['the','and','please','invite','meeting','parents','dear','school','thank','you','your','will','date','time','place'];
const STOPKW=new Set(['muc','dich','buoi','cua','cac','voi','nhung','trong','duoc','cho','hoc','sinh','phu','huynh','truong','nam','lop','nay','khi','den','tai','ve','va','la','co','mot','nhu','de','theo','phan','sau','truoc','hoac','tham','du','nha','kinh','moi','tran','trong','nhan','vien','hop','thong','bao','ky','i','ii','iii']);
const L=(s)=>s.replace(/[^\p{L}]/gu,'');
const VIET=/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/giu;
function sanitizeInvite(o){
  const str=x=>cs(typeof x==='string'?x:'');
  const arr=x=>(Array.isArray(x)?x:[]).map(i=>cs(typeof i==='string'?i:'').replace(/^(?:[-•–+]|\d+[.)])\s+/,''));
  return{trichYeu:str(o&&(o.trich_yeu||o.trichYeu)),moDau:str(o&&(o.mo_dau||o.moDau)),noiDung:arr(o&&(o.noi_dung||o.noiDung)).filter(Boolean),luuY:arr(o&&(o.luu_y||o.luuY)).filter(Boolean),ket:str(o&&o.ket)}}
function checkText(label,t,o){
  const E=[];if(!t){E.push(label+': để trống.');return E}
  if(o.min&&t.length<o.min)E.push(label+': quá ngắn ('+t.length+' ký tự, tối thiểu '+o.min+').');
  if(o.max&&t.length>o.max)E.push(label+': quá dài ('+t.length+' ký tự, tối đa '+o.max+').');
  if(/[*#_`|<>{}\[\]\\]/.test(t))E.push(label+': chứa ký tự định dạng/markdown hoặc ngoặc không được phép.');
  if(/!/.test(t))E.push(label+': có dấu “!” (văn bản hành chính không dùng).');
  if(/\.{2,}|…/.test(t))E.push(label+': có dấu chấm lửng/“…” (nghi chỗ trống chưa điền).');
  if(/\b(xxx|n\/a|undefined|null|lorem|tbd)\b/i.test(t))E.push(label+': có từ giữ chỗ chưa điền.');
  if(/\p{Extended_Pictographic}/u.test(t))E.push(label+': có biểu tượng cảm xúc/emoji.');
  if(/[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(t))E.push(label+': lẫn chữ nước ngoài.');
  if(/ {2,}/.test(t))E.push(label+': có hai dấu cách liền nhau.');
  if(/\s[,.;:?)]/.test(t))E.push(label+': có dấu cách đứng trước dấu câu.');
  if(/[,;:?][^\s\d)"”]/.test(t.replace(/\d[,.]\d/g,'')))E.push(label+': thiếu dấu cách sau dấu câu.');
  if(/\.[\p{L}]/u.test(t.replace(/\d\.\d/g,'')))E.push(label+': thiếu dấu cách sau dấu chấm.');
  const open=(t.match(/\(/g)||[]).length,close=(t.match(/\)/g)||[]).length;if(open!==close)E.push(label+': ngoặc đơn không cân.');
  if(((t.match(/"/g)||[]).length%2)||((t.match(/“/g)||[]).length!==(t.match(/”/g)||[]).length))E.push(label+': ngoặc kép không cân.');
  if(!/^\p{Lu}/u.test(t))E.push(label+': không bắt đầu bằng chữ in hoa.');
  if(o.end&&!o.end.test(t))E.push(label+': câu không kết thúc bằng dấu câu đúng ('+o.endTxt+').');
  const low=' '+t.toLowerCase()+' ';
  INFORMAL.forEach(w=>{if(new RegExp('(?<![\\p{L}\\p{N}])'+w+'(?![\\p{L}\\p{N}])','iu').test(t))E.push(label+': dùng từ khẩu ngữ/không trang trọng “'+w+'”.')});
  ENG.forEach(w=>{if(new RegExp('(?<![\\p{L}\\p{N}])'+w+'(?![\\p{L}\\p{N}])','i').test(t)&&!/[àáảãạăâđêôơư]/i.test(w))E.push(label+': lẫn từ tiếng Anh “'+w+'”.')});
  const letters=L(t);if(letters.length>30){const v=(t.match(VIET)||[]).length;if(v/letters.length<0.05)E.push(label+': nghi thiếu dấu tiếng Việt.')}
  if(/(?<![\p{L}])(\p{L}{2,})\s+\1(?![\p{L}])/iu.test(t))E.push(label+': lặp từ liền nhau.');
  return E}
function validateInvite(c,ctx){
  const E=[];
  E.push(...checkText('Trích yếu',c.trichYeu,{min:12,max:110,end:/[^.;:,]$/,endTxt:'không kết thúc bằng dấu chấm'}));
  E.push(...checkText('Mở đầu',c.moDau,{min:50,max:380,end:/[.]$/,endTxt:'dấu chấm'}));
  if(c.moDau&&!/(trân trọng|kính mời|xin mời|trân trọng kính mời)/i.test(c.moDau))E.push('Mở đầu: thiếu lời mời trang trọng (“trân trọng kính mời”).');
  if(c.moDau&&nd(c.moDau).indexOf(nd(ctx.subj))<0)E.push('Mở đầu: phải nêu chủ thể mời là “'+ctx.subj+'”.');
  if(c.moDau&&ctx.audience==='ph'&&!/phụ huynh/i.test(c.moDau))E.push('Mở đầu: phải mời “phụ huynh”.');
  if(c.moDau&&ctx.audience==='hs'&&!/(học sinh|các em)/i.test(c.moDau))E.push('Mở đầu: phải mời “học sinh/các em”.');
  if(/kính gửi/i.test(c.moDau))E.push('Mở đầu: không được lặp “Kính gửi”.');
  if(c.noiDung.length<2||c.noiDung.length>5)E.push('Nội dung: cần từ 2 đến 5 ý (hiện có '+c.noiDung.length+').');
  c.noiDung.forEach((x,i)=>E.push(...checkText('Nội dung ý '+(i+1),x,{min:12,max:200,end:/[.;]$/,endTxt:'dấu chấm hoặc chấm phẩy'})));
  if(c.luuY.length>3)E.push('Lưu ý: tối đa 3 ý (hiện có '+c.luuY.length+').');
  c.luuY.forEach((x,i)=>E.push(...checkText('Lưu ý ý '+(i+1),x,{min:12,max:180,end:/[.;]$/,endTxt:'dấu chấm hoặc chấm phẩy'})));
  E.push(...checkText('Kết',c.ket,{min:25,max:240,end:/[.]$/,endTxt:'dấu chấm'}));
  if(c.ket&&!/(mong|cảm ơn|kính mong)/i.test(c.ket))E.push('Kết: thiếu lời đề nghị/cảm ơn (“rất mong…”, “trân trọng cảm ơn”).');
  const all=[c.trichYeu,c.moDau,...c.noiDung,...c.luuY,c.ket].join(' \n ');
  /* AI không được tự bịa thời gian/địa điểm/ngày tháng/tên người — các thông tin này do hệ thống chèn từ biểu mẫu */
  const tm=all.match(/(?<!\d)\d{1,2}\s*(?:giờ|h(?![\p{L}])|:\s*\d)\s*\d{0,2}/giu);if(tm)E.push('AI tự ghi thời gian “'+cs(tm[0])+'” — chỉ được dùng thời gian do người dùng nhập (hệ thống tự chèn).');
  const dm=all.match(/(?<!\d)\d{1,2}\s*[\/.\-]\s*\d{1,2}(?:\s*[\/.\-]\s*\d{2,4})?(?!\d)/);if(dm)E.push('AI tự ghi ngày tháng “'+dm[0]+'” — không được ghi ngày tháng.');
  if(/(?<![\p{L}])ngày\s*\d|(?<![\p{L}])tháng\s*\d|thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ nhật/iu.test(all))E.push('AI tự ghi ngày/tháng/thứ — không được ghi (hệ thống tự chèn).');
  (all.match(/\d{3,}/g)||[]).forEach(n=>{if(!ctx.nums.has(n))E.push('AI tự thêm con số “'+n+'” không có trong yêu cầu.')});
  if(/(?<![\p{L}])(tại|địa điểm)\s+(phòng|hội trường|trường|sân|nhà)/iu.test(all))E.push('AI tự nêu địa điểm — địa điểm do người dùng nhập, không được tự ghi.');
  ctx.names.forEach(nm=>{if(nm&&all.toLowerCase().indexOf(nm.toLowerCase())>=0)E.push('Nội dung chứa họ tên học sinh “'+nm+'” — không được ghi tên trong phần AI soạn.')});
  const nds=c.noiDung.map(nd);if(new Set(nds).size!==nds.length)E.push('Nội dung: có ý bị trùng lặp.');
  if(c.noiDung.some(x=>nd(x)===nd(c.moDau)))E.push('Nội dung: có ý trùng với phần mở đầu.');
  const kws=[...new Set(nd(ctx.purpose).split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!STOPKW.has(w)))];
  if(kws.length){const have=new Set(nd([c.trichYeu,c.moDau,...c.noiDung].join(' ')).split(/[^a-z0-9]+/));const hit=kws.filter(k=>have.has(k)).length,need=Math.min(3,kws.length);
    if(hit<need)E.push('Nội dung chưa bám sát mục đích người dùng nhập (chỉ khớp '+hit+'/'+need+' từ khóa chính).')}
  return E}
function promptInvite(inp,prevErr){
  return 'Bạn là cán bộ văn thư của một trường THCS ở Việt Nam, soạn nội dung GIẤY MỜI theo thể thức văn bản hành chính (Nghị định 30/2020/NĐ-CP), văn phong trang trọng, rõ ràng, đúng chính tả và dấu tiếng Việt.\n'+
  'THÔNG TIN NGƯỜI DÙNG CUNG CẤP:\n- Chủ thể mời: '+inp.subj+'\n- Đối tượng được mời: '+(inp.audience==='ph'?'phụ huynh học sinh':'học sinh')+'\n- Mục đích/nội dung buổi mời: '+inp.purpose+'\n'+(inp.note?'- Ghi chú thêm: '+inp.note+'\n':'')+(inp.nam?'- Năm học: '+inp.nam+'\n':'')+
  '\nCHỈ soạn các phần sau và trả về DUY NHẤT một JSON (không markdown):\n{"trich_yeu":"một cụm từ ngắn nêu mục đích, bắt đầu bằng chữ in hoa, KHÔNG kết thúc bằng dấu chấm, ví dụ: Họp phụ huynh học sinh cuối học kì I",\n "mo_dau":"một câu mời, bắt đầu bằng \\""+inp.subj+" trân trọng kính mời …\\", nêu rõ mục đích, kết thúc bằng dấu chấm",\n "noi_dung":["2 đến 5 ý nội dung chính của buổi mời, mỗi ý một câu hoàn chỉnh kết thúc bằng dấu chấm hoặc chấm phẩy"],\n "luu_y":["0 đến 3 lưu ý (mang theo gì, đến đúng giờ, liên hệ khi vắng…); có thể để mảng rỗng"],\n "ket":"một câu kết lịch sự bắt đầu bằng \\"Rất mong …\\" hoặc tương tự, kết thúc bằng dấu chấm"}\n'+
  '\nQUY TẮC BẮT BUỘC:\n1. TUYỆT ĐỐI KHÔNG ghi: quốc hiệu, tên trường, ngày, tháng, năm, thứ, giờ, địa điểm, số điện thoại, họ tên bất kỳ ai, chữ ký (hệ thống tự chèn các thông tin này).\n2. Không dùng dấu “!”, dấu “…”, emoji, markdown, ngoặc vuông/nhọn, tiếng Anh, từ khẩu ngữ (nhé, nha, mình, bạn, tôi…).\n3. Không tự bịa số liệu, con số có từ 3 chữ số trở lên.\n4. Ngắn gọn: tổng cộng không quá 900 ký tự; viết đủ dấu tiếng Việt; mỗi câu bắt đầu bằng chữ in hoa.\n5. Nội dung phải bám sát mục đích người dùng nêu, không lan man.\n'+
  (prevErr&&prevErr.length?'\nLẦN SOẠN TRƯỚC BỊ LOẠI VÌ CÁC LỖI SAU — hãy sửa tất cả:\n'+prevErr.slice(0,12).map((e,i)=>(i+1)+'. '+e).join('\n')+'\n':'')}
function parseJsonLoose(t){t=String(t).replace(/^\s*```(?:json)?/i,'').replace(/```\s*$/,'').trim();try{return JSON.parse(t)}catch(e){}
  const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(t.slice(a,b+1));throw new Error('không phải JSON')}
async function geminiJSON(prompt){
  const key=(window.GKEY&&window.GKEY.get&&window.GKEY.get())||(g('gAiK')&&g('gAiK').value.trim())||'';
  if(!key){if(window.GKEY&&window.GKEY.open)window.GKEY.open('Nhập key Gemini để AI soạn giấy mời.');const e=new Error('Chưa có API key Gemini — bấm “🔑 Nhập key” ở đầu trang rồi chạy lại.');e.fatal=true;throw e}
  let last=null;
  for(const m of ['gemini-flash-latest','gemini-flash-lite-latest']){
    let r;try{r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json'}})})}catch(e){last=new Error('Không kết nối được Gemini (kiểm tra mạng).');last.fatal=true;continue}
    if(!r.ok){const human=r.status===400?'API key không hợp lệ hoặc yêu cầu bị từ chối':r.status===403?'Key không có quyền hoặc bị chặn':r.status===429?'Hết lượt gọi (giới hạn miễn phí)':r.status===404?'Model không tồn tại':'Lỗi máy chủ Gemini';
      last=new Error(human+' (HTTP '+r.status+').');last.fatal=![404,429,500,503].includes(r.status);if(last.fatal)throw last;continue}
    const j=await r.json();const c=j.candidates&&j.candidates[0];const t=c&&c.content&&c.content.parts?c.content.parts.filter(p=>!p.thought).map(p=>p.text||'').join(''):'';
    if(!t){last=new Error('Gemini không trả về nội dung (có thể bị bộ lọc an toàn chặn).');continue}
    return t}
  throw last||new Error('Gemini không phản hồi.')}
const MAX_TRY=4;
async function composeInvite(inp,ctx,sample,log){
  let errs=[],lastC=null;
  for(let k=1;k<=MAX_TRY;k++){
    log('AI đang soạn giấy mời — lần '+k+'/'+MAX_TRY+(errs.length?' (sửa '+errs.length+' lỗi của lần trước)':'')+'…');
    let raw;try{raw=await geminiJSON(promptInvite(inp,errs))}catch(e){if(e.fatal)throw e;errs=['Lỗi gọi AI: '+e.message];continue}
    let obj;try{obj=parseJsonLoose(raw)}catch(e){errs=['Kết quả AI không phải JSON hợp lệ.'];log('Lần '+k+': bị loại — kết quả không phải JSON.');continue}
    const c=sanitizeInvite(obj);lastC=c;errs=validateInvite(c,ctx);
    if(!errs.length){const pg=pageMoi(sample.cfg,sample.s,sample.v,c),h=pageH(pg.descs,pg.P),cap=pageCap(pg.P)*FILL;
      if(h>cap){errs=['Hình thức: nội dung quá dài — ước tính chiếm '+Math.round(h/pageCap(pg.P)*100)+'% trang, có thể tràn sang trang 2. Hãy rút ngắn mở đầu, số ý nội dung và lưu ý.']}}
    if(!errs.length){log('Lần '+k+': ĐẠT toàn bộ tiêu chí nội dung và hình thức.');return{content:c,tries:k}}
    log('Lần '+k+': bị loại ('+errs.length+' lỗi): '+errs.slice(0,3).join(' | ')+(errs.length>3?' …':'')+' → soạn lại.')}
  const e=new Error('AI soạn '+MAX_TRY+' lần vẫn chưa đạt chuẩn nên KHÔNG xuất file.');e.errs=errs;e.last=lastC;throw e}

/* ============================ 6. ĐỌC CẤU HÌNH TỪ GIAO DIỆN + KIỂM TRA ĐẦU VÀO ============================ */
const S={books:[],students:[],meta:{},fileName:''};
const DEF_BAND={gioi:'Em nắm vững kiến thức, chủ động học tập và hoàn thành tốt các nhiệm vụ được giao. Em cần tiếp tục phát huy và giúp đỡ các bạn cùng tiến bộ.',
  kha:'Em có ý thức học tập tốt, nắm được kiến thức cơ bản của môn học. Em cần rèn luyện thêm kĩ năng vận dụng để đạt kết quả cao hơn.',
  tb:'Em đã hoàn thành các yêu cầu cơ bản của môn học. Em cần chăm chỉ hơn, chú ý nghe giảng và hoàn thành đầy đủ bài tập.',
  yeu:'Kết quả học tập của em chưa đạt yêu cầu. Em cần dành nhiều thời gian ôn tập, làm đầy đủ bài tập và trao đổi với giáo viên khi chưa hiểu bài. Đề nghị gia đình phối hợp nhắc nhở, hỗ trợ em.',
  none:'Hiện em chưa đủ điểm để đánh giá kết quả học kì. Đề nghị em và gia đình liên hệ giáo viên bộ môn để được hướng dẫn hoàn thành các bài kiểm tra còn thiếu.'};
function readCfg(selected){
  const E=[],W=[],v=id=>cs(g(id).value),mode=g('mm_mode').value;
  const cfg={mode,coQuan:v('mm_coquan').toUpperCase(),truong:v('mm_truong').toUpperCase(),truongRaw:S.meta.truong||v('mm_truong'),diaDanh:titleCaseVi(v('mm_diadanh')),chucVu:v('mm_chucvu').toUpperCase(),nguoiKy:v('mm_nguoiky')?titleCaseVi(v('mm_nguoiky')):'',
    nam:S.meta.nam||'',hocky:S.meta.hocky||'',mon:S.meta.mon||'',gv:S.meta.gv||'',so:v('mm_so')};
  if(!cfg.truong)E.push('Chưa nhập tên trường.');else if(!/^TRƯỜNG\s/.test(cfg.truong)){cfg.truong='TRƯỜNG '+cfg.truong}
  if(!cfg.diaDanh)E.push('Chưa nhập địa danh (nơi lập văn bản).');
  if(!cfg.chucVu)E.push('Chưa nhập chức vụ người ký.');
  const nl=parseISO(g('mm_ngaylap').value);if(!nl)E.push('Ngày lập văn bản không hợp lệ.');else cfg.ngayLap=ngayThang(nl);
  if(cfg.nguoiKy&&!/^[\p{L}\s.'’-]+$/u.test(cfg.nguoiKy))E.push('Họ tên người ký chứa ký tự không hợp lệ.');
  if(!cfg.nguoiKy&&mode!=='moi')W.push('Chưa nhập họ tên người ký — trang sẽ để trống phần tên để ký tay.');
  if(mode==='moi'&&!cfg.nguoiKy)E.push('Giấy mời cần ghi họ tên người ký.');
  const chk=(label,t)=>{tplUnknown(t).forEach(b=>E.push(label+': biến không hợp lệ '+b+'. Biến hợp lệ: '+VARS.map(x=>'{'+x+'}').join(' ')))};
  if(mode==='khen'){cfg.tieuDe=v('mm_khen_td').toUpperCase()||'GIẤY KHEN';cfg.thanhTich=v('mm_khen_tt');if(cfg.thanhTich.length<10)E.push('Nội dung thành tích quá ngắn.');chk('Thành tích',cfg.thanhTich)}
  if(mode==='tb'){cfg.trichYeu=v('mm_tb_ty');cfg.kinhGui=v('mm_tb_kg');cfg.noiDung=g('mm_tb_nd').value.replace(/\r/g,'').trim();
    if(cfg.trichYeu.length<8)E.push('Trích yếu thông báo quá ngắn.');if(cfg.noiDung.length<30)E.push('Nội dung thông báo quá ngắn.');if(!cfg.kinhGui)E.push('Chưa nhập “Kính gửi”.');
    [['Trích yếu',cfg.trichYeu],['Kính gửi',cfg.kinhGui],['Nội dung',cfg.noiDung]].forEach(a=>chk(a[0],a[1]))}
  if(mode==='nx'){cfg.showDTB=g('mm_nx_dtb').checked;cfg.band={};
    if(!cfg.mon)W.push('Không đọc được “Môn học” trong file Excel — tiêu đề phiếu sẽ ghi “Môn ”.');
    ['gioi','kha','tb','yeu','none'].forEach(k=>{cfg.band[k]=g('mm_nx_'+k).value.replace(/\r/g,'').trim();chk('Nhận xét '+k,cfg.band[k])});
    const need=new Set(selected.map(s=>bandKey(s.dtb)));need.forEach(k=>{if(cfg.band[k].length<15)E.push('Mẫu nhận xét “'+({gioi:'Giỏi',kha:'Khá',tb:'Trung bình',yeu:'Yếu',none:'Chưa có điểm'}[k])+'” quá ngắn hoặc để trống.')});
    if(selected.some(s=>s.dtb==null))W.push(selected.filter(s=>s.dtb==null).length+' học sinh chưa có ĐTB — dùng mẫu “Chưa có điểm”.')}
  if(mode==='moi'){cfg.doiTuong=g('mm_moi_dt').value;cfg.purpose=v('mm_moi_md');cfg.note=v('mm_moi_gc');cfg.diaDiem=v('mm_moi_dd');
    if(cfg.purpose.length<15)E.push('Mục đích buổi mời quá ngắn (ít nhất 15 ký tự) — hãy mô tả rõ để AI bám sát.');
    if(cfg.diaDiem.length<4)E.push('Địa điểm quá ngắn.');
    const nh=parseISO(g('mm_moi_ngay').value),tm=/^(\d{2}):(\d{2})$/.exec(g('mm_moi_gio').value||'');
    if(!nh)E.push('Ngày họp không hợp lệ.');if(!tm)E.push('Chưa chọn giờ.');
    if(nh){const t=todayP();if(nh.dt<t.dt)E.push('Ngày họp ('+ngayThang(nh)+') đã qua — giấy mời phải có ngày trong tương lai.');if(nl&&nh.dt<nl.dt)E.push('Ngày họp phải sau hoặc cùng ngày lập giấy mời.');
      if(nl&&nl.dt>t.dt&&((nl.dt-t.dt)/864e5)>30)W.push('Ngày lập văn bản cách hôm nay hơn 30 ngày.');if(nh.dt.getDay()===0)W.push('Ngày họp rơi vào Chủ nhật.')}
    if(tm){const h=+tm[1];if(h<6||h>21)E.push('Giờ họp '+tm[1]+':'+tm[2]+' nằm ngoài khung hợp lý (06:00–21:00).')}
    if(nh&&tm&&!E.some(e=>/Ngày họp|Giờ họp/.test(e)))cfg.thoiGian=tm[1]+' giờ '+tm[2]+' phút, '+WD[nh.dt.getDay()]+', '+ngayThang(nh);
    if(cfg.so&&!/^[\p{L}\p{N}\/\-.]+$/u.test(cfg.so))E.push('Số văn bản chỉ gồm chữ, số, “/”, “-”, “.” (ví dụ 12/GM-THCS).');
    cfg.subj=/hiệu trưởng|hiệu phó/i.test(cfg.chucVu)?'Nhà trường':/chủ nhiệm/i.test(cfg.chucVu)?'Giáo viên chủ nhiệm':'Nhà trường'}
  return{cfg,E,W}}

/* ============================ 7. GIAO DIỆN ============================ */
function save(name,data,mime){const b=new Blob([data],{type:mime});if(typeof saveBlob==='function')return saveBlob(b,name);
  const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
const MD='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const fileSafe=s=>String(s).replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'_');
function setSt(m,k){const e=g('mm_st');e.textContent=m;e.className='status'+(k==='e'?' err':k==='o'?' ok':' info')}
const todayISO=()=>{const t=todayP();return t.y+'-'+String(t.mo).padStart(2,'0')+'-'+String(t.d).padStart(2,'0')};
function buildUI(){
  if(g('wtMail'))return;
  const st=document.createElement('style');
  st.textContent='#wtMail .mmG{border:1px solid rgba(128,128,128,.35);border-radius:10px;margin:8px 0;padding:6px 10px}#wtMail label.mmL{display:block;margin:6px 0 2px;font-size:14px}#wtMail input[type=text],#wtMail input[type=date],#wtMail input[type=time],#wtMail select,#wtMail textarea{width:100%;box-sizing:border-box}#wtMail textarea{min-height:70px}#wtMail .mmTb{max-height:260px;overflow:auto;border:1px solid rgba(128,128,128,.35);border-radius:8px;margin:6px 0}#wtMail table{border-collapse:collapse;width:100%;font-size:13px}#wtMail td,#wtMail th{padding:3px 6px;border-bottom:1px solid rgba(128,128,128,.25);text-align:left}#wtMail .mmRes{border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:8px 10px;margin:8px 0}#wtMail .mmPv{white-space:pre-wrap;font-family:"Times New Roman",serif;font-size:14px;border:1px dashed rgba(128,128,128,.5);border-radius:8px;padding:8px;margin:6px 0;max-height:260px;overflow:auto}#wtMail .mmLog{font-size:13px;line-height:1.45;margin:6px 0}';
  document.head.appendChild(st);
  const d=document.createElement('div');d.className='wtool';d.id='wtMail';
  const f=(id,lab,val,ty)=>'<label class="mmL">'+lab+'</label><input type="'+(ty||'text')+'" id="'+id+'" value="'+hx(val||'')+'">';
  const ta=(id,lab,val,rows)=>'<label class="mmL">'+lab+'</label><textarea id="'+id+'" rows="'+(rows||3)+'">'+hx(val||'')+'</textarea>';
  d.innerHTML='<div class="note">Đưa file Excel danh sách/bảng điểm lớp (mẫu <b>BẢNG ĐIỂM HỌC KỲ</b>) lên → chọn loại văn bản → xuất <b>1 file Word, mỗi học sinh 1 trang</b>. Họ tên lấy từ cột “Họ và tên” (tự chuẩn hóa chữ hoa/thường). <b>Họ tên học sinh không bao giờ gửi cho AI.</b> Mọi file xuất ra đều được tự kiểm tra; không đạt thì không cho tải.</div>'+
  '<div class="bar"><input type="file" id="mm_in" style="display:none"><button class="ghost" id="mm_pick" type="button">📁 Chọn file Excel (.xlsx / .xls)</button><span class="note" id="mm_fn" style="margin:0"></span></div>'+
  '<div id="mm_sheets"></div>'+
  '<label class="mmL">Loại văn bản</label><select id="mm_mode"><option value="khen">🏆 Giấy khen</option><option value="tb">📢 Thông báo (gửi phụ huynh)</option><option value="nx">📝 Phiếu nhận xét kết quả học tập</option><option value="moi">✉ Giấy mời (AI soạn + tự kiểm tra)</option></select>'+
  '<details class="mmG" open><summary><b>🏫 Thông tin chung</b></summary>'+f('mm_coquan','Cơ quan chủ quản (viết hoa)','UBND XÃ BÁT TRÀNG')+f('mm_truong','Tên trường','')+f('mm_diadanh','Địa danh (nơi lập văn bản)','')+f('mm_ngaylap','Ngày lập văn bản',todayISO(),'date')+f('mm_chucvu','Chức vụ người ký','Hiệu trưởng')+f('mm_nguoiky','Họ tên người ký','')+f('mm_so','Số văn bản (tùy chọn, ví dụ 12/GM-THCS)','')+'</details>'+
  '<div class="mmM" data-m="khen"><details class="mmG" open><summary><b>🏆 Giấy khen</b></summary>'+f('mm_khen_td','Tiêu đề','GIẤY KHEN')+ta('mm_khen_tt','Nội dung thành tích (dùng {NamHoc}, {HocKy}, {Lop}, {DTB}, {XepLoai}…)','Đã đạt danh hiệu Học sinh Xuất sắc Học kì {HocKy}, năm học {NamHoc}.',3)+'<div class="bar"><span class="note" style="margin:0">Chọn nhanh học sinh theo ĐTB ≥</span><input type="text" id="mm_thr" value="8" style="width:70px"><button class="sec sm" id="mm_selthr" type="button">Chọn</button></div></details></div>'+
  '<div class="mmM" data-m="tb" style="display:none"><details class="mmG" open><summary><b>📢 Thông báo</b></summary>'+f('mm_tb_ty','Trích yếu','Về việc thông báo kết quả học tập học kì {HocKy}')+f('mm_tb_kg','Kính gửi','Quý phụ huynh em {HoTen}, học sinh lớp {Lop}')+ta('mm_tb_nd','Nội dung (mỗi dòng là một đoạn; dùng {HoTen}, {Lop}, {DTB}, {XepLoai}, {Mon}…)','Nhà trường xin thông báo: em {HoTen}, học sinh lớp {Lop}, có điểm trung bình môn {Mon} học kì {HocKy} là {DTB} ({XepLoai}).\nĐề nghị Quý phụ huynh quan tâm, nhắc nhở và phối hợp cùng nhà trường để giúp em học tập tốt hơn.\nMọi thông tin cần trao đổi, Quý phụ huynh vui lòng liên hệ giáo viên bộ môn.',6)+'</details></div>'+
  '<div class="mmM" data-m="nx" style="display:none"><details class="mmG" open><summary><b>📝 Phiếu nhận xét</b></summary><label class="mmL"><input type="checkbox" id="mm_nx_dtb" checked> In điểm trung bình môn và xếp loại (Giỏi ≥ 8 · Khá ≥ 6,5 · Trung bình ≥ 5 · còn lại Yếu)</label>'+
  ta('mm_nx_gioi','Nhận xét — Giỏi',DEF_BAND.gioi,3)+ta('mm_nx_kha','Nhận xét — Khá',DEF_BAND.kha,3)+ta('mm_nx_tb','Nhận xét — Trung bình',DEF_BAND.tb,3)+ta('mm_nx_yeu','Nhận xét — Yếu',DEF_BAND.yeu,3)+ta('mm_nx_none','Nhận xét — Chưa có điểm',DEF_BAND.none,3)+'</details></div>'+
  '<div class="mmM" data-m="moi" style="display:none"><details class="mmG" open><summary><b>✉ Giấy mời</b></summary><label class="mmL">Mời ai</label><select id="mm_moi_dt"><option value="ph">Phụ huynh học sinh (kính gửi theo tên từng em)</option><option value="hs">Học sinh</option></select>'+
  ta('mm_moi_md','Mục đích / nội dung buổi mời (mô tả rõ để AI bám sát)','Họp phụ huynh học sinh cuối học kì I, thông báo kết quả học tập và rèn luyện, triển khai kế hoạch học kì II.',3)+f('mm_moi_ngay','Ngày họp','','date')+f('mm_moi_gio','Giờ họp','07:30','time')+f('mm_moi_dd','Địa điểm (ví dụ: Phòng học lớp 7A1)','','text')+ta('mm_moi_gc','Ghi chú thêm cho AI (tùy chọn: cần mang theo gì, ai tham dự…)','',2)+
  '<div class="note">Ngày, giờ, địa điểm, tên người nhận và chữ ký do hệ thống chèn đúng như bạn nhập — AI chỉ soạn phần lời văn. Bài AI soạn phải qua bộ kiểm tra nội dung (chính tả, văn phong, bám mục đích, không bịa số liệu) và kiểm tra hình thức (thể thức, vừa 1 trang); sai thì tự soạn lại tối đa '+MAX_TRY+' lần.</div></details></div>'+
  '<details class="mmG" open><summary><b>👥 Danh sách học sinh</b> <span id="mm_cnt" class="note" style="margin:0"></span></summary><div class="bar"><input type="text" id="mm_q" placeholder="Tìm theo tên…" style="flex:1"><button class="sec sm" id="mm_all" type="button">Chọn tất cả</button><button class="sec sm" id="mm_none" type="button">Bỏ chọn</button></div><div class="mmTb"><table><thead><tr><th></th><th>STT</th><th>Họ và tên</th><th>Lớp</th><th>ĐTB</th></tr></thead><tbody id="mm_tb"></tbody></table></div></details>'+
  '<div class="bar"><label class="note" style="margin:0"><input type="checkbox" id="mm_split"> Mỗi lớp một file (nén .zip)</label><button class="green" id="mm_run" type="button">📬 Kiểm tra &amp; Xuất file Word</button></div>'+
  '<div id="mm_st" class="status"></div><div id="mm_out"></div>';
  const tools=Array.from(t3.querySelectorAll('.wtool')),last=tools[tools.length-1];if(last)last.insertAdjacentElement('afterend',d);else t3.appendChild(d);
  const op=document.createElement('option');op.value='wtMail';op.textContent='📬 Trộn thư: Giấy khen · Thông báo · Nhận xét · Giấy mời (Excel → Word)';sel.insertBefore(op,sel.options[1]||null);
  wire()}
function renderList(){
  const q=nd(g('mm_q').value),rows=[];S.students.forEach((s,i)=>{if(q&&nd(s.ten).indexOf(q)<0)return;
    rows.push('<tr><td><input type="checkbox" data-i="'+i+'"'+(s.on?' checked':'')+'></td><td>'+hx(s.stt)+'</td><td>'+hx(titleCaseVi(s.ten))+'</td><td>'+hx(s.lop)+'</td><td>'+hx(s.dtb==null?'':fmtDTB(s.dtb))+'</td></tr>')});
  g('mm_tb').innerHTML=rows.join('');g('mm_cnt').textContent=S.students.length?'— đã chọn '+S.students.filter(s=>s.on).length+'/'+S.students.length:''}
function readBook(buf){if(typeof XLSX==='undefined')throw new Error('Chưa tải được thư viện SheetJS (XLSX).');return XLSX.read(new Uint8Array(buf),{type:'array',cellDates:false})}
function loadSheets(){
  S.students=[];S.meta={};const info=[],pick=Array.from(document.querySelectorAll('#mm_sheets input[type=checkbox]:checked')).map(x=>x.value);let first=null;
  S.books.forEach(b=>{if(pick.indexOf(b.name)<0)return;b.res.students.forEach(s=>S.students.push(Object.assign({},s)));if(!first)first=b.res.meta});
  S.meta=first||{};renderList()}
async function onFile(f){
  if(!/\.(xlsx|xlsm|xls)$/i.test(f.name||''))return setSt('❌ Hãy chọn file Excel (đuôi .xlsx, .xlsm hoặc .xls).','e');
  try{setSt('Đang đọc file…');const wb=readBook(await f.arrayBuffer());S.books=[];const skipped=[];
    wb.SheetNames.forEach(n=>{const aoa=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''});const r=parseAoa(aoa,n);if(r.ok&&r.students.length)S.books.push({name:n,res:r});else skipped.push(n+' ('+(r.reason||'không có học sinh')+')')});
    g('mm_fn').textContent=f.name;S.fileName=f.name;
    if(!S.books.length){S.students=[];renderList();g('mm_sheets').innerHTML='';return setSt('Không tìm thấy danh sách học sinh. File cần có cột “Họ và tên” và cột STT (mẫu BẢNG ĐIỂM HỌC KỲ).'+(skipped.length?' Đã bỏ qua: '+skipped.join('; '):''),'e')}
    g('mm_sheets').innerHTML='<div class="raR">Chọn sheet (lớp):</div>'+S.books.map(b=>'<label class="note" style="display:block;margin:2px 0"><input type="checkbox" value="'+hx(b.name)+'" checked> '+hx(b.name)+' — lớp '+hx(b.res.meta.lop||b.name)+': '+b.res.students.length+' học sinh'+(b.res.cols.dtb>=0?'':' (không có cột ĐTB)')+'</label>').join('');
    Array.from(document.querySelectorAll('#mm_sheets input')).forEach(x=>x.onchange=loadSheets);
    loadSheets();const m=S.meta;
    const setIf=(id,v)=>{if(v&&!g(id).dataset.edited)g(id).value=v};
    setIf('mm_truong',m.truong?(/^Tr[ưu]ờng/i.test(m.truong)?m.truong:'Trường '+m.truong).toUpperCase():'');if(m.xa){setIf('mm_coquan','UBND '+m.xa.toUpperCase());setIf('mm_diadanh',m.xa.replace(/^(Xã|Phường|Thị trấn)\s+/i,''))}
    if(m.gv&&g('mm_mode').value==='nx')setIf('mm_nguoiky',m.gv);
    setSt('Đã đọc '+S.students.length+' học sinh từ '+S.books.length+' sheet.'+(skipped.length?' Bỏ qua: '+skipped.join('; ')+'.':''),'o')
  }catch(e){setSt('❌ '+e.message,'e')}}
function onMode(){const m=g('mm_mode').value;document.querySelectorAll('#wtMail .mmM').forEach(x=>x.style.display=x.dataset.m===m?'':'none');
  const cv=g('mm_chucvu'),ng=g('mm_nguoiky');
  if(!cv.dataset.edited)cv.value=m==='nx'?'Giáo viên bộ môn':m==='moi'?'Hiệu trưởng':'Hiệu trưởng';
  if(m==='nx'&&S.meta.gv&&!ng.dataset.edited)ng.value=S.meta.gv;if(m!=='nx'&&!ng.dataset.edited&&ng.value===S.meta.gv)ng.value=''}
function wire(){
  g('mm_pick').onclick=()=>g('mm_in').click();
  g('mm_in').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)onFile(f)};
  g('wtMail').addEventListener('input',e=>{if(e.target.id&&/^mm_(coquan|truong|diadanh|chucvu|nguoiky)$/.test(e.target.id))e.target.dataset.edited='1'});
  g('mm_mode').onchange=onMode;g('mm_q').oninput=renderList;
  g('mm_tb').onchange=e=>{const c=e.target;if(c.dataset.i!=null){S.students[+c.dataset.i].on=c.checked;renderList()}};
  g('mm_all').onclick=()=>{S.students.forEach(s=>s.on=true);renderList()};g('mm_none').onclick=()=>{S.students.forEach(s=>s.on=false);renderList()};
  g('mm_selthr').onclick=()=>{const t=parseFloat(String(g('mm_thr').value).replace(',','.'));if(!isFinite(t)||t<0||t>10)return setSt('Ngưỡng ĐTB không hợp lệ (0–10).','e');
    let n=0;S.students.forEach(s=>{s.on=s.dtb!=null&&s.dtb>=t;if(s.on)n++});renderList();setSt('Đã chọn '+n+' học sinh có ĐTB ≥ '+String(t).replace('.',','),n?'o':'e')};
  g('mm_run').onclick=run;
}
const builders={khen:pageKhen,tb:pageThongBao,nx:pageNhanXet};
let inviteCache=null;
async function run(){
  const out=g('mm_out'),btn=g('mm_run');out.innerHTML='';
  if(typeof JSZip==='undefined')return setSt('Chưa tải được thư viện JSZip (cần mạng để tải từ cdnjs).','e');
  const sel0=S.students.filter(s=>s.on);if(!sel0.length)return setSt('Chưa chọn học sinh nào (hãy đưa file Excel lên và tick chọn học sinh).','e');
  const students=sel0.map(s=>Object.assign({},s,{ten:titleCaseVi(s.ten)}));
  const {cfg,E,W}=readCfg(students);
  /* kiểm tra dữ liệu học sinh */
  const seen=new Map(),dup=[];students.forEach(s=>{const k=nd(s.ten)+'|'+s.dob;if(seen.has(k))dup.push(s.ten);seen.set(k,1)});
  if(dup.length)W.push('Trùng họ tên và ngày sinh: '+[...new Set(dup)].join(', ')+' (kiểm tra có nhập trùng dòng không).');
  const tplAll=[cfg.thanhTich,cfg.noiDung,cfg.trichYeu,cfg.kinhGui].concat(Object.values(cfg.band||{})).filter(Boolean).join(' ');
  const noDob=students.filter(s=>!s.dob).length;if(noDob&&/\{NgaySinh\}/.test(tplAll))W.push(noDob+' học sinh thiếu ngày sinh.');
  const noMa=students.filter(s=>!s.ma).length;if(noMa&&/\{MaDD\}/.test(tplAll))W.push(noMa+' học sinh thiếu mã định danh.');
  [['NamHoc',cfg.nam,'Năm học'],['HocKy',cfg.hocky,'Học kỳ'],['Mon',cfg.mon,'Môn học'],['GV',cfg.gv,'GV']].forEach(a=>{if(new RegExp('\\{'+a[0]+'\\}').test(tplAll)&&!a[1])E.push('Nội dung dùng {'+a[0]+'} nhưng file Excel không có thông tin “'+a[2]+'” ở phần đầu bảng.')});
  const showErr=(title,list)=>{out.innerHTML='<div class="mmRes"><b>❌ '+hx(title)+'</b><ul>'+list.map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul></div>'};
  if(E.length){setSt('Cần sửa '+E.length+' lỗi trước khi xuất file.','e');return showErr('Chưa thể xuất file — hãy sửa các mục sau:',E)}
  btn.disabled=true;
  try{
    let invite=null,tries=0,logs=[];const log=m=>{logs.push(m);setSt(m);const l=g('mm_log');if(l)l.innerHTML=logs.map(x=>'<div>• '+hx(x)+'</div>').join('')};
    out.innerHTML='<div class="mmLog" id="mm_log"></div>';
    if(cfg.mode==='moi'){
      const ctx={purpose:cfg.purpose,note:cfg.note,subj:cfg.subj,audience:cfg.doiTuong,nums:new Set((cfg.purpose+' '+cfg.note+' '+cfg.nam).match(/\d+/g)||[]),names:S.students.map(s=>titleCaseVi(s.ten))};
      const longest=students.reduce((a,b)=>b.ten.length>a.ten.length?b:a,students[0]);
      const key=JSON.stringify([cfg.purpose,cfg.note,cfg.subj,cfg.doiTuong,cfg.nam]);
      const sample={cfg,s:longest,v:varsOf(longest,cfg)};
      if(inviteCache&&inviteCache.key===key){const errs=validateInvite(inviteCache.c,ctx);const pg=pageMoi(cfg,longest,sample.v,inviteCache.c);
        if(!errs.length&&pageH(pg.descs,pg.P)<=pageCap(pg.P)*FILL){invite=inviteCache.c;tries=inviteCache.tries;log('Dùng lại bản giấy mời đã soạn và đã đạt kiểm tra (nội dung yêu cầu không đổi).')}}
      if(!invite){const r=await composeInvite({subj:cfg.subj,audience:cfg.doiTuong,purpose:cfg.purpose,note:cfg.note,nam:cfg.nam},ctx,sample,log);invite=r.content;tries=r.tries;inviteCache={key,c:invite,tries}}
    }
    /* dựng từng trang */
    log('Đang dựng '+students.length+' trang…');await tick();
    const mk=s=>{const v=varsOf(s,cfg);return cfg.mode==='moi'?pageMoi(cfg,s,v,invite):builders[cfg.mode](cfg,s,v)};
    const pages=students.map(s=>Object.assign(mk(s),{lop:s.lop,ten:s.ten}));
    /* kiểm tra hình thức: không tràn trang */
    const over=pages.filter(p=>pageH(p.descs,p.P)>pageCap(p.P)*FILL);
    if(over.length){const e=new Error('Nội dung quá dài, có thể tràn sang trang 2 ('+over.length+' trang, ví dụ: '+over[0].ten+'). Hãy rút ngắn nội dung rồi xuất lại.');throw e}
    /* chia file */
    const groups=new Map();const split=g('mm_split').checked;pages.forEach(p=>{const k=split?(p.lop||'lop'):'all';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)});
    const base={khen:'GiayKhen',tb:'ThongBao',nx:'NhanXet',moi:'GiayMoi'}[cfg.mode];
    const files=[],oks=[];let first=null;
    for(const [k,pg] of groups){
      const bytes=await buildDocx(pg);const ck=await checkDocx(bytes,pg);
      if(ck.errs.length)throw new Error('File Word tạo ra không đạt kiểm tra nên KHÔNG xuất: '+ck.errs.slice(0,4).join('; '));
      if(!oks.length)ck.ok.forEach(x=>oks.push(x));
      files.push({name:base+(k==='all'?'':'_'+fileSafe(k))+'_'+pg.length+'HS.docx',data:bytes,n:pg.length});if(!first)first=pg[0]}
    const card=document.createElement('div');card.className='mmRes';
    let h='✅ <b>Đã tạo '+pages.length+' trang ('+pages.length+' học sinh)</b> — đã qua kiểm tra:<ul>'+oks.map(x=>'<li>'+hx(x)+'</li>').join('')+'<li>Không tràn trang (ước tính ≤ '+Math.round(FILL*100)+'% chiều cao trang)</li>'+(cfg.mode==='moi'?'<li>Giấy mời: AI soạn đạt chuẩn ở lần '+tries+'/'+MAX_TRY+' (nội dung, chính tả, văn phong, bám mục đích, không bịa ngày giờ/địa điểm/tên)</li><li>Ngày tháng theo Nghị định 30/2020: '+hx(cfg.ngayLap)+'; thời gian họp: '+hx(cfg.thoiGian)+'</li>':'')+'</ul>';
    if(W.length)h+='<div>⚠ <b>Lưu ý:</b><ul>'+W.map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul></div>';
    h+='<div class="note" style="margin:4px 0">Xem trước trang 1 ('+hx(first.ten)+'):</div><div class="mmPv">'+hx(first.descs.map(descText).filter(x=>x.trim()).join('\n'))+'</div>';
    card.innerHTML=h;
    if(files.length===1){const b=document.createElement('button');b.type='button';b.className='green';b.textContent='⬇ '+files[0].name;b.onclick=()=>save(files[0].name,files[0].data,MD);card.appendChild(b)}
    else{const b=document.createElement('button');b.type='button';b.className='green';b.textContent='📦 Tải '+files.length+' file (.zip)';
      b.onclick=async()=>{const z=new JSZip();files.forEach(f=>z.file(f.name,f.data));save(base+'_cac_lop.zip',await z.generateAsync({type:'uint8array'}),'application/zip')};card.appendChild(b)}
    out.appendChild(card);setSt('Xong. Mở file bằng Word để in; mỗi học sinh một trang.','o');
  }catch(e){
    const list=e.errs&&e.errs.length?e.errs:[];setSt('❌ '+e.message,'e');
    const lg=document.getElementById('mm_log');const lh=lg?lg.outerHTML:'';out.innerHTML=lh+'<div class="mmRes"><b>❌ '+hx(e.message)+'</b>'+(list.length?'<div>Lỗi còn lại ở lần soạn cuối:</div><ul>'+list.slice(0,10).map(x=>'<li>'+hx(x)+'</li>').join('')+'</ul><div class="note">Gợi ý: mô tả mục đích cụ thể hơn, rút gọn ghi chú rồi bấm lại.</div>':'')+'</div>'}
  btn.disabled=false}
window.MailMerge={version:VERSION,parseAoa,titleCaseVi,validateInvite,sanitizeInvite,checkText,buildDocx,checkDocx,pageKhen,pageThongBao,pageNhanXet,pageMoi,pageH,pageCap,ngayThang,parseISO,xepLoai,fill,tplUnknown,_S:S};
buildUI();
})();
