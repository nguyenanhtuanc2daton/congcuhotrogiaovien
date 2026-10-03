/* Trộn đề Word & sinh nhiều mã đề */


/* ---- Tab 5 (mở rộng): Trộn đề Word & sinh nhiều mã đề ---- */
(function(){
const $=id=>document.getElementById(id),W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const kids=n=>[...n.childNodes].filter(c=>c.nodeType==1),txt=n=>[...n.getElementsByTagName('w:t')].map(t=>t.textContent).join('');
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function rep(p,re,val){const ts=[...p.getElementsByTagName('w:t')],full=ts.map(t=>t.textContent).join(''),m=re.exec(full);if(!m)return false;
 const s=m.index+m[0].indexOf(m[1]),e=s+m[1].length;let pos=0,done=false;
 ts.forEach(t=>{const a=pos,b=pos+t.textContent.length;pos=b;if(b<=s||a>=e)return;const x=Math.max(s,a)-a,y=Math.min(e,b)-a;
  t.textContent=t.textContent.slice(0,x)+(done?'':val)+t.textContent.slice(y);done=true;t.setAttribute('xml:space','preserve')});return true}
function ch(par,tag,at,before){let e=kids(par).find(c=>c.nodeName==tag);if(!e){e=par.ownerDocument.createElementNS(W,tag);const r=kids(par).find(c=>before.includes(c.nodeName));r?par.insertBefore(e,r):par.appendChild(e)}for(const k in at)e.setAttributeNS(W,'w:'+k,at[k]);return e}
const RB=['w:b','w:bCs','w:i','w:iCs','w:caps','w:smallCaps','w:strike','w:dstrike','w:outline','w:shadow','w:emboss','w:imprint','w:noProof','w:snapToGrid','w:vanish','w:webHidden','w:color','w:spacing','w:w','w:kern','w:position','w:sz','w:szCs','w:highlight','w:u','w:effect','w:bdr','w:shd','w:fitText','w:vertAlign','w:rtl','w:cs','w:em','w:lang'];
const PB=['w:ind','w:contextualSpacing','w:mirrorIndents','w:suppressOverlap','w:jc','w:textDirection','w:textAlignment','w:textboxTightWrap','w:outlineLvl','w:divId','w:cnfStyle','w:rPr','w:sectPr','w:pPrChange'];
const first=(p,t)=>{for(const n of p.getElementsByTagName('w:t'))if(n.textContent.trim())return n.parentNode};
function marked(p,m){const r=m=='u'?null:first(p,0);
 if(m=='u')return[...p.getElementsByTagName('w:u')].some(u=>(u.getAttribute('w:val')||'single')!='none');
 const pr=r&&kids(r).find(c=>c.nodeName=='w:rPr');if(!pr)return false;
 if(m=='b'){const b=kids(pr).find(c=>c.nodeName=='w:b');return !!b&&!['0','false'].includes(b.getAttribute('w:val'))}
 const c=kids(pr).find(c=>c.nodeName=='w:color'),v=c?(c.getAttribute('w:val')||'').toUpperCase():'';return /^(FF|C0|E0|D0)/.test(v)&&!/^(FFFFFF)$/.test(v)}
function strip(p,m){const rs=m=='u'?[...p.getElementsByTagName('w:r')]:[first(p,0)];rs.forEach(r=>{const pr=r&&kids(r).find(c=>c.nodeName=='w:rPr');if(!pr)return;
 kids(pr).filter(c=>c.nodeName==({u:'w:u',b:'w:b',r:'w:color'})[m]).forEach(c=>pr.removeChild(c))})}
const QRE=/^\s*(?:Câu|Bài)\s*(\d+)\s*[.:)]/i,ORE=/^\s*([A-D])\s*[.)]/,FIX=/(tất cả|cả\s+[ABCD]|đều đúng|đều sai|không có)/i;
function parse(doc){const body=doc.getElementsByTagName('w:body')[0],all=kids(body),sect=all.filter(n=>n.nodeName=='w:sectPr').pop(),it=all.filter(n=>n!==sect);
 const isQ=n=>n.nodeName=='w:p'&&QRE.test(txt(n));let f=it.findIndex(isQ);if(f<0)return null;
 let end=it.length;for(let i=f+1;i<it.length;i++)if(it[i].nodeName=='w:p'&&/^\s*[-–—*\s]*HẾT/i.test(txt(it[i]))){end=i;break}
 const head=it.slice(0,f),tail=it.slice(end),bl=[];let cur=null;
 it.slice(f,end).forEach(n=>{if(isQ(n)){cur={pre:[n],opts:[],post:[]};bl.push(cur)}else if(n.nodeName=='w:p'&&ORE.test(txt(n))&&!cur.post.length)cur.opts.push(n);else(cur.opts.length?cur.post:cur.pre).push(n)});
 return{body,sect,head,tail,bl}}
function fmt(doc,o){const body=doc.getElementsByTagName('w:body')[0];
 doc.getElementsByTagName('w:sectPr');[...doc.getElementsByTagName('w:sectPr')].forEach(s=>{const c=v=>Math.round(v*567);
  ch(s,'w:pgSz',{w:11906,h:16838},['w:pgMar','w:cols']);const g=ch(s,'w:pgMar',{top:c(o.T),bottom:c(o.B),left:c(o.L),right:c(o.R)},['w:paperSrc','w:pgBorders','w:cols','w:docGrid']);
  ['header','footer','gutter'].forEach(a=>{if(!g.hasAttributeNS(W,a))g.setAttributeNS(W,'w:'+a,a=='gutter'?0:708)})});
 if(o.fmt)[...body.getElementsByTagName('w:r')].forEach(r=>{let pr=kids(r).find(c=>c.nodeName=='w:rPr');if(!pr){pr=doc.createElementNS(W,'w:rPr');r.insertBefore(pr,r.firstChild)}
  const f=ch(pr,'w:rFonts',{ascii:o.font,hAnsi:o.font,cs:o.font,eastAsia:o.font},RB);['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>f.removeAttributeNS(W,a));
  const z=String(Math.round(o.sz*2));ch(pr,'w:sz',{val:z},RB.slice(RB.indexOf('w:szCs')));ch(pr,'w:szCs',{val:z},RB.slice(RB.indexOf('w:highlight')))});
 if(o.sp)[...body.getElementsByTagName('w:p')].forEach(p=>{let pr=kids(p).find(c=>c.nodeName=='w:pPr');if(!pr){pr=doc.createElementNS(W,'w:pPr');p.insertBefore(pr,p.firstChild)}ch(pr,'w:spacing',{line:276,lineRule:'auto',after:60},PB)})}
$('xGo').onclick=async()=>{
 const f=$('xFile').files[0],R=$('xRes');if(!f){R.textContent='Hãy chọn file .docx.';return}
 if(typeof JSZip=='undefined'){R.textContent='Chưa tải được thư viện JSZip (cần mạng để tải từ cdnjs).';return}
 R.textContent='Đang xử lý...';$('xKey').innerHTML='';
 try{
  const buf=await f.arrayBuffer(),z0=await JSZip.loadAsync(buf),src=await z0.file('word/document.xml').async('string');
  const codes=$('xCodes').value.split(/[,;\s]+/).filter(Boolean),m=$('xM').value,K=Math.max(0,+$('xK').value||0);
  const o={T:+$('xT').value,B:+$('xB').value,L:+$('xL').value,R:+$('xR').value,fmt:$('xFmt').checked,font:$('xFont').value||'Times New Roman',sz:+$('xSz').value||13,sp:$('xSp').checked};
  const probe=parse(new DOMParser().parseFromString(src,'application/xml'));if(!probe){R.textContent='Không nhận diện được câu hỏi ("Câu 1.", "Câu 2."…).';return}
  const n4=probe.bl.filter(b=>b.opts.length==4).length,nm=probe.bl.filter(b=>b.opts.some(p=>marked(p,m))).length,odd=probe.bl.filter(b=>b.opts.length>0&&b.opts.length!=4).length;
  const master=new JSZip(),keys=[],maps=[];
  for(const code of codes){
   const doc=new DOMParser().parseFromString(src,'application/xml'),P=parse(doc),ans=[],map=[];
   let blocks=P.bl.map((b,i)=>({b,i}));const keep=blocks.slice(0,K),rest=blocks.slice(K);if($('xQ').checked)shuf(rest);blocks=keep.concat(rest);
   blocks.forEach(({b,i},qi)=>{
    rep(b.pre[0],QRE,String(qi+1));map.push(i+1);let letter='?';
    if(b.opts.length>1&&$('xO').checked){const fixed=b.opts.map(p=>FIX.test(txt(p)));const mv=b.opts.map((p,j)=>j).filter(j=>!fixed[j]),pm=shuf(mv.slice());const na=b.opts.slice();mv.forEach((j,k)=>na[j]=b.opts[pm[k]]);b.opts=na}
    b.opts.forEach((p,j)=>{rep(p,ORE,'ABCD'[j]);if(marked(p,m)){letter='ABCD'[j];if($('xStrip').checked)strip(p,m)}});
    ans.push(letter)});
   const anchor=P.sect||null;[...P.head,...P.bl.flatMap(b=>[...b.pre,...b.opts,...b.post]),...P.tail].forEach(n=>n.parentNode&&n.parentNode.removeChild(n));
   const put=n=>P.body.insertBefore(n,anchor);
   let done=false;P.head.forEach(h=>{if(h.nodeName=='w:p')[...h.getElementsByTagName('w:t')].forEach(t=>{if(/\{MADE\}|\[MÃ ĐỀ\]/i.test(t.textContent)){t.textContent=t.textContent.replace(/\{MADE\}|\[MÃ ĐỀ\]/ig,code);done=true}})});
   if(!done){const p=doc.createElementNS(W,'w:p'),pr=doc.createElementNS(W,'w:pPr'),jc=doc.createElementNS(W,'w:jc'),r=doc.createElementNS(W,'w:r'),rp=doc.createElementNS(W,'w:rPr'),t=doc.createElementNS(W,'w:t');
    jc.setAttributeNS(W,'w:val','right');pr.appendChild(jc);p.appendChild(pr);rp.appendChild(doc.createElementNS(W,'w:b'));r.appendChild(rp);t.textContent='Mã đề: '+code;r.appendChild(t);p.appendChild(r);put(p)}
   P.head.forEach(put);blocks.forEach(({b})=>[...b.pre,...b.opts,...b.post].forEach(put));P.tail.forEach(put);
   fmt(doc,o);
   let xml=new XMLSerializer().serializeToString(doc);if(!xml.startsWith('<?xml'))xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+xml;
   const z=await JSZip.loadAsync(buf);z.file('word/document.xml',xml);
   master.file('De_'+code+'.docx',await z.generateAsync({type:'uint8array',compression:'DEFLATE'}));keys.push(ans);maps.push(map)}
  const N=probe.bl.length,hdr=['Câu',...codes],rows=[hdr],rows2=[['Câu mới',...codes.map(c=>c+' (câu gốc)')]];
  for(let i=0;i<N;i++){rows.push([i+1,...keys.map(k=>k[i])]);rows2.push([i+1,...maps.map(k=>k[i])])}
  if(typeof XLSX!='undefined'){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Dap an');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows2),'Doi chieu');master.file('Dap_an_va_doi_chieu.xlsx',XLSX.write(wb,{type:'array',bookType:'xlsx'}))}
  $('xKey').innerHTML='<table style="border-collapse:collapse;font-size:13px">'+rows.map((r,i)=>'<tr>'+r.map(c=>`<${i?'td':'th'} style="border:1px solid var(--bd);padding:3px 8px">${c}</${i?'td':'th'}>`).join('')+'</tr>').join('')+'</table>';
  const blob=await master.generateAsync({type:'blob'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cac_ma_de_'+f.name.replace(/\.docx$/i,'')+'.zip';a.click();
  R.innerHTML=`Nhận diện <b>${N}</b> câu · ${n4} câu có đủ 4 phương án · ${nm} câu có đáp án được đánh dấu`+(odd?` · <span style="color:var(--warn)">${odd} câu có số phương án khác 4 (kiểm tra lại)</span>`:'')+(nm<N?` · <span style="color:var(--warn)">${N-nm} câu chưa có đáp án (hiện dấu ?)</span>`:'')+`<br>Đã tạo ${codes.length} mã đề và tải về file .zip.`;
 }catch(e){R.textContent='Lỗi: '+e.message}};
})();
