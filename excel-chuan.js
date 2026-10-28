/* ===== Chuẩn hóa file Excel xuất ra (dùng chung cho mọi công cụ xuất .xlsx) =====
   1) XlsxChuan.fixZip(zip)   : đổi MỌI ô sang Times New Roman cỡ 14; tự co giãn độ rộng cột & chiều cao dòng cho vừa chữ mới.
   2) XlsxChuan.fixBlob(blob) : như trên nhưng nhận/trả Blob (dùng cho nơi xuất file bằng cách khác).
   3) XlsxChuan.audit(zip)    : kiểm tra cấu trúc file (XML lỗi, ô gộp chồng nhau, font tham chiếu sai) – không cần mạng, không cần AI.
   4) XlsxChuan.askGemini(prompt, system) : gọi Gemini bằng khóa chung của gkey.js (trả về đối tượng JSON).
   Cần JSZip (đã nạp sẵn trong index.html). */
(function(){
'use strict';
const FONT='Times New Roman',SIZE=14;
/* độ rộng chữ số (đơn vị em) của vài font hay gặp – để tính lại độ rộng cột khi đổi font mặc định */
const DW={'arial':.556,'calibri':.507,'times new roman':.5,'tahoma':.546,'verdana':.636,'cambria':.5,'segoe ui':.55,'courier new':.6};
const mdw=(pt,name)=>Math.max(1,Math.round(pt*96/72*(DW[String(name||'').toLowerCase()]||.55)));
const r2=x=>Math.round(x*100)/100;
const parse=(t,n)=>{const d=new DOMParser().parseFromString(String(t).replace(/^\uFEFF/,''),'application/xml');
  if(d.getElementsByTagName('parsererror').length)throw new Error('XML không đọc được'+(n?' ('+n+')':''));return d;};
const ser=d=>{const s=new XMLSerializer().serializeToString(d);return /^<\?xml/.test(s)?s:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+s;};
const FLAGS=['b','i','strike','condense','extend','outline','shadow','u','vertAlign'];
const DROP=['sz','name','family','scheme','charset','rFont'];

/* Đổi 1 phần tử <font> trong styles.xml */
function patchFont(d,f,NS,pre){
  const kids=Array.from(f.children).filter(c=>DROP.indexOf(c.localName)<0);
  Array.from(f.children).forEach(c=>f.removeChild(c));
  const mk=(n,v)=>{const e=d.createElementNS(NS,pre+n);e.setAttribute('val',v);return e;};
  kids.filter(c=>FLAGS.indexOf(c.localName)>=0).forEach(c=>f.appendChild(c));
  kids.filter(c=>FLAGS.indexOf(c.localName)<0&&c.localName!=='color').forEach(c=>f.appendChild(c));
  f.appendChild(mk('sz',SIZE));
  kids.filter(c=>c.localName==='color').forEach(c=>f.appendChild(c));
  f.appendChild(mk('name',FONT));f.appendChild(mk('family',1));
}
/* Đổi font trong các đoạn chữ định dạng riêng (<rPr>) ở sharedStrings / ô inlineStr */
function patchRPr(xml){
  return xml.replace(/<((?:\w+:)?)rPr>([\s\S]*?)<\/\1rPr>/g,(m,p,inner)=>{
    inner=inner.replace(new RegExp('<'+p+'(?:sz|rFont|scheme|family|charset)\\b[^>]*/>','g'),'');
    return '<'+p+'rPr>'+inner+'<'+p+'sz val="'+SIZE+'"/><'+p+'rFont val="'+FONT+'"/><'+p+'family val="1"/></'+p+'rPr>';});
}

async function fixZip(zip){
  const sf=zip.file('xl/styles.xml');
  if(!sf)throw new Error('file không có xl/styles.xml (không phải .xlsx hợp lệ)');
  const d=parse(await sf.async('string'),'styles.xml');
  const NS=d.documentElement.namespaceURI,pre=d.documentElement.prefix?d.documentElement.prefix+':':'';
  const fontsEl=d.getElementsByTagNameNS(NS,'fonts')[0];
  const fl=fontsEl?Array.from(fontsEl.children).filter(c=>c.localName==='font'):[];
  if(!fl.length)throw new Error('styles.xml không có danh sách font');
  const val=(f,n)=>{const e=Array.from(f.children).find(c=>c.localName===n);return e?e.getAttribute('val'):'';};
  const base=parseFloat(val(fl[0],'sz'))||0,oldName=val(fl[0],'name');
  let s=1,wr=1;                         // s: hệ số chiều cao dòng · wr: hệ số độ rộng cột (đã bù độ rộng chữ số của font mới)
  if(base>=4&&base<=72){s=SIZE/base;wr=s*mdw(base,oldName)/mdw(SIZE,FONT);}
  fl.forEach(f=>patchFont(d,f,NS,pre));
  zip.file('xl/styles.xml',ser(d));
  let sheets=0;
  const ss=zip.file('xl/sharedStrings.xml');
  if(ss){const t=await ss.async('string'),u=patchRPr(t);if(u!==t)zip.file('xl/sharedStrings.xml',u);}
  const files=zip.file(/^xl\/worksheets\/[^\/]+\.xml$/);
  for(const f of files){
    let t=await f.async('string'),u=t;
    u=u.replace(/<((?:\w+:)?)row\b[^>]*>/g,tag=>tag.replace(/(\sht=")([\d.]+)(")/,(m,a,v,b)=>a+r2(parseFloat(v)*s)+b));
    u=u.replace(/<((?:\w+:)?)col\b[^>]*>/g,tag=>tag.replace(/(\swidth=")([\d.]+)(")/,(m,a,v,b)=>a+Math.min(255,r2(parseFloat(v)*wr))+b));
    u=u.replace(/<((?:\w+:)?)sheetFormatPr\b[^>]*>/g,tag=>tag
      .replace(/(\sdefaultRowHeight=")([\d.]+)(")/,(m,a,v,b)=>a+r2(parseFloat(v)*s)+b)
      .replace(/(\sdefaultColWidth=")([\d.]+)(")/,(m,a,v,b)=>a+Math.min(255,r2(parseFloat(v)*wr))+b));
    u=patchRPr(u);
    if(u!==t){zip.file(f.name,u);}
    sheets++;}
  return{fonts:fl.length,sheets,from:(oldName||'?')+' '+(base||'?'),factor:r2(s)};
}
async function fixBlob(blob){
  if(typeof JSZip==='undefined')throw new Error('chưa tải được thư viện JSZip');
  const zip=await JSZip.loadAsync(await blob.arrayBuffer()),info=await fixZip(zip);
  const out=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
  out.info=info;return out;
}

/* ---------- Kiểm tra cấu trúc file (không cần AI) ---------- */
const colN=a=>{let n=0;for(const ch of a)n=n*26+ch.charCodeAt(0)-64;return n;};
const rng=ref=>{const m=/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(ref);if(!m)return null;
  return[colN(m[1]),+m[2],colN(m[3]||m[1]),+(m[4]||m[2])];};
async function audit(zip){
  const bad=[];
  const names=Object.keys(zip.files).filter(n=>/\.(xml|rels)$/.test(n)&&!zip.files[n].dir);
  let nFonts=0;
  for(const n of names){
    let t;try{t=await zip.file(n).async('string');}catch(e){bad.push('Không đọc được phần '+n);continue;}
    let d;try{d=parse(t,n);}catch(e){bad.push('Phần '+n+' bị lỗi XML (Excel có thể báo "file cần sửa chữa").');continue;}
    if(n==='xl/styles.xml'){
      const NS=d.documentElement.namespaceURI,f=d.getElementsByTagNameNS(NS,'fonts')[0];
      nFonts=f?Array.from(f.children).filter(c=>c.localName==='font').length:0;
      const xfs=d.getElementsByTagNameNS(NS,'cellXfs')[0];
      if(xfs)Array.from(xfs.children).forEach((x,i)=>{const id=+x.getAttribute('fontId');if(id>=nFonts)bad.push('Kiểu ô số '+i+' trỏ tới font không tồn tại.');});}
    if(/^xl\/worksheets\/[^\/]+\.xml$/.test(n)){
      const NS=d.documentElement.namespaceURI,mc=Array.from(d.getElementsByTagNameNS(NS,'mergeCell')).map(e=>rng(e.getAttribute('ref'))).filter(Boolean);
      if(mc.length<=1500){let hit=0;
        for(let i=0;i<mc.length&&hit<3;i++)for(let j=i+1;j<mc.length;j++){const a=mc[i],b=mc[j];
          if(a[0]<=b[2]&&b[0]<=a[2]&&a[1]<=b[3]&&b[1]<=a[3]){bad.push('Trang tính '+n.replace(/^.*\//,'')+' có các ô gộp chồng lên nhau (Excel sẽ báo lỗi khi mở).');hit=3;break;}}}}
  }
  return bad;
}

/* ---------- Gemini (dùng khóa chung của gkey.js) ---------- */
const models=()=>{let m='',L=[];
  try{m=localStorage.getItem('ph_model_v1')||'';}catch(e){}
  try{const c=JSON.parse(localStorage.getItem('ph_models_cache_v2')||'null');L=c&&c.list?c.list.map(x=>x.id):[];}catch(e){}
  const out=[];if(/^gemini-[\w.\-]+$/.test(m)&&(!L.length||L.includes(m)))out.push(m);
  L.filter(x=>/flash/.test(x)&&!/lite/.test(x)).concat(['gemini-flash-latest','gemini-flash-lite-latest']).forEach(x=>{if(!out.includes(x))out.push(x);});
  return out.slice(0,4);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function askGemini(prompt,system){
  const key=window.GKEY&&window.GKEY.get();
  if(!key){const e=new Error('chưa nhập API key Gemini (bấm nút 🔑 để nhập).');e.nokey=1;throw e;}
  const body=JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],systemInstruction:{parts:[{text:system||''}]},
    generationConfig:{maxOutputTokens:4096,temperature:0.2,responseMimeType:'application/json'}});
  const chain=models();let res,M;
  for(let ci=0;ci<chain.length;ci++){M=chain[ci];
    for(let a=0;a<3;a++){
      const ctl=typeof AbortController==='function'?new AbortController():null,tm=ctl?setTimeout(()=>ctl.abort(),120000):0;
      try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+M+':generateContent',
        {method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body,signal:ctl?ctl.signal:undefined});}
      catch(e){if(tm)clearTimeout(tm);throw new Error(e&&e.name==='AbortError'?'Gemini phản hồi quá lâu.':'không kết nối được tới Gemini (kiểm tra mạng).');}
      if(tm)clearTimeout(tm);
      if((res.status===500||res.status===503)&&a<2){await wait(2500*(a+1));continue;}
      break;}
    if(res.status===404&&ci<chain.length-1)continue;
    break;}
  if(!res)throw new Error('không có model Gemini khả dụng.');
  let data=null;try{data=await res.json();}catch(e){}
  if(!res.ok){
    const raw=(data&&data.error&&data.error.message)||('HTTP '+res.status);
    if(res.status===401||res.status===403||(res.status===400&&/api key|API_KEY/i.test(raw)))throw new Error('API key không hợp lệ hoặc hết hạn.');
    if(res.status===429)throw new Error('đã hết hạn mức gọi của key, đợi khoảng 1 phút rồi thử lại.');
    throw new Error('Gemini lỗi: '+raw);}
  const c=data&&data.candidates&&data.candidates[0];
  const txt=c?((c.content&&c.content.parts)||[]).filter(p=>!p.thought).map(p=>p.text||'').join('').trim():'';
  if(!txt)throw new Error('Gemini trả về nội dung rỗng.');
  try{return JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch(e){return{text:txt};}
}

window.XlsxChuan={fixZip,fixBlob,audit,askGemini,FONT,SIZE};
})();
