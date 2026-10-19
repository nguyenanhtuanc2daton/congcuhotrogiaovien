/* Công cụ Word: Ghép file Word + Chuẩn hóa Word (norm): định dạng, bảng biểu, khoảng trắng, dấu câu, viết hoa, từ lặp/sai, cảnh báo chỗ khó hiểu.
   API ngoài: window.WordNormalize(buf,cfg) và window.WordPkgCheck(zip,full). */


/* ---- Tab 3 · Công cụ Word: Chuẩn hóa Word & Ghép file Word (IIFE riêng, tiền tố wt) ---- */
(function(){
'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',
MNS='http://schemas.openxmlformats.org/officeDocument/2006/math',VML='urn:schemas-microsoft-com:vml',
RELNS='http://schemas.openxmlformats.org/package/2006/relationships',CTNS='http://schemas.openxmlformats.org/package/2006/content-types',
XN='http://www.w3.org/2000/xmlns/',TNR='Times New Roman';
const ORD={
rPr:'rStyle rFonts b bCs i iCs caps smallCaps strike dstrike outline shadow emboss imprint noProof snapToGrid vanish webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs em lang eastAsianLayout specVanish oMath'.split(' '),
pPr:'pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange'.split(' '),
sectPr:'headerReference footerReference footnotePr endnotePr type pgSz pgMar paperSrc pgBorders lnNumType pgNumType cols formProt vAlign noEndnote titlePg textDirection bidi rtlGutter docGrid printerSettings sectPrChange'.split(' '),
tcPr:'cnfStyle tcW gridSpan hMerge vMerge tcBorders shd noWrap tcMar textDirection tcFitText vAlign hideMark'.split(' '),
tblPr:'tblStyle tblpPr tblOverlap bidiVisual tblStyleRowBandSize tblStyleColBandSize tblW jc tblCellSpacing tblInd tblBorders shd tblLayout tblCellMar tblLook'.split(' ')};
const g=id=>document.getElementById(id);
const hx=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tick=()=>new Promise(r=>setTimeout(r,0));
const pX=(s,n)=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('XML không đọc được'+(n?' ('+n+')':''));return d};
const ser=d=>{const s=new XMLSerializer().serializeToString(d);return /^<\?xml/.test(s)?s:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+s};
const one=(p,n)=>Array.from(p.children).find(c=>c.localName===n&&c.namespaceURI===W)||null;
const wk=(p,n)=>Array.from(p.children).filter(c=>c.localName===n&&c.namespaceURI===W);
const all=(r,n)=>Array.from(r.getElementsByTagNameNS(W,n));
const mk=(d,n)=>d.createElementNS(W,'w:'+n);
const sa=(e,n,v)=>e.setAttributeNS(W,'w:'+n,String(v));
const ga=(e,n)=>e.getAttributeNS(W,n)||'';
const anc=(e,n)=>{for(let p=e.parentNode;p&&p.nodeType===1;p=p.parentNode)if(p.localName===n&&p.namespaceURI===W)return p;return null};
function sc(d,par,n,ord){let e=one(par,n);if(e)return e;e=mk(d,n);const i=ord.indexOf(n);let ref=null;
  for(const c of Array.from(par.children)){const k=c.namespaceURI===W?ord.indexOf(c.localName):-1;if(k>i){ref=c;break}}
  par.insertBefore(e,ref);return e}
function inMath(e){for(let p=e.parentNode;p&&p.nodeType===1;p=p.parentNode)if(p.namespaceURI===MNS&&(p.localName==='oMath'||p.localName==='oMathPara'))return true;return false}
const mm2tw=v=>Math.round(v*56.6929);
function rs(dir,t){if(t[0]==='/')return t.slice(1);const o=[];(dir+t).split('/').forEach(s=>{if(s==='..')o.pop();else if(s&&s!=='.')o.push(s)});return o.join('/')}
async function relMap(z,path){const o={};const f=z.file(path);if(!f)return o;
  Array.from(pX(await f.async('string'),path).documentElement.children).forEach(r=>{o[r.getAttribute('Id')]={type:r.getAttribute('Type'),target:r.getAttribute('Target'),mode:r.getAttribute('TargetMode')||''}});return o}

/* ===== Chuẩn hóa ===== */
const SYM=/symbol|wingdings|webdings|cambria math/i;
function fixR(d,rPr){
  if(inMath(rPr)||(rPr.parentNode&&/Change$/.test(rPr.parentNode.localName)))return;
  let f=one(rPr,'rFonts');
  const sym=f&&SYM.test(ga(f,'ascii')+ga(f,'hAnsi')+ga(f,'cs'));
  if(!sym){if(!f)f=sc(d,rPr,'rFonts',ORD.rPr);
    ['asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'].forEach(a=>f.removeAttributeNS(W,a));
    ['ascii','hAnsi','cs','eastAsia'].forEach(a=>sa(f,a,TNR))}
  sa(sc(d,rPr,'sz',ORD.rPr),'val',28);sa(sc(d,rPr,'szCs',ORD.rPr),'val',28);
  ['spacing','w'].forEach(n=>{const e=one(rPr,n);if(e)rPr.removeChild(e)})}   /* bỏ giãn/co chữ gây khoảng cách không đều */
function fixStyles(d){const root=d.documentElement;let dd=one(root,'docDefaults');
  if(!dd){dd=mk(d,'docDefaults');root.insertBefore(dd,root.firstChild)}
  let rd=one(dd,'rPrDefault');if(!rd){rd=mk(d,'rPrDefault');dd.insertBefore(rd,dd.firstChild)}
  if(!one(rd,'rPr'))rd.appendChild(mk(d,'rPr'))}
const KEEPEL=['drawing','pict','br','object','sym','fldChar','fldSimple','sectPr','footnoteReference','endnoteReference','commentReference','ptab'];
const isEmpty=p=>p.localName==='p'&&p.namespaceURI===W&&!all(p,'t').some(t=>t.textContent.trim())&&!KEEPEL.some(n=>p.getElementsByTagNameNS(W,n).length)&&!p.getElementsByTagNameNS(MNS,'oMath').length&&!p.getElementsByTagNameNS(MNS,'oMathPara').length&&!hasBM(p);

function hasBM(p){return all(p,'bookmarkStart').some(b=>ga(b,'name')!=='_GoBack')}
function pinfo(p,pPr){const st=pPr&&one(pPr,'pStyle'),sv=st?ga(st,'val'):'',je=pPr&&one(pPr,'jc'),jc=je?ga(je,'val'):'';
  return {sv,jc,inTc:!!anc(p,'tc'),
    list:!!(pPr&&one(pPr,'numPr'))||/list|bullet|number|danh/i.test(sv),
    head:/head|title|tiêu/i.test(sv)||!!(pPr&&one(pPr,'outlineLvl')),
    keep:jc==='center'||jc==='right'||jc==='end'}}
const isP=c=>c.localName==='p'&&c.namespaceURI===W;
const RI=['hanging','hangingChars','firstLine','firstLineChars','left','leftChars','start','startChars','right','rightChars','end','endChars'];
const CM=['top','start','left','bottom','end','right'];
const CELLJ=/^(both|distribute|thaiDistribute|)$/;

/* ===== Định dạng: lề, giãn dòng, thụt dòng, căn đều, bảng biểu ===== */
function docNorm(d,cfg,rep){
  const body=d.getElementsByTagNameNS(W,'body')[0];if(!body)return;
  const bk=Array.from(body.children),secs=[];
  const fin=()=>{let s=one(body,'sectPr');if(!s){s=mk(d,'sectPr');body.appendChild(s)}return s};
  bk.forEach((c,i)=>{if(c.localName==='p'){const pp=one(c,'pPr'),s=pp&&one(pp,'sectPr');if(s)secs.push({end:i,sp:s})}});
  secs.push({end:bk.length,sp:fin()});
  secs.forEach(s=>{const sp=s.sp,z=sc(d,sp,'pgSz',ORD.sectPr);
    const land=ga(z,'orient')==='landscape'||(+ga(z,'w')>+ga(z,'h')&&+ga(z,'h')>0);
    sa(z,'w',land?16838:11906);sa(z,'h',land?11906:16838);
    if(land)sa(z,'orient','landscape');else z.removeAttributeNS(W,'orient');
    const created=!one(sp,'pgMar'),m=sc(d,sp,'pgMar',ORD.sectPr),L=mm2tw(cfg.l),Rr=mm2tw(cfg.r);
    sa(m,'top',mm2tw(cfg.t));sa(m,'bottom',mm2tw(cfg.b));sa(m,'left',L);sa(m,'right',Rr);
    if(created){sa(m,'header',709);sa(m,'footer',709);sa(m,'gutter',0)}
    s.aw=(land?16838:11906)-L-Rr});
  all(body,'p').forEach(p=>{
    if(anc(p,'txbxContent'))return;
    rep.paras++;
    let pPr=one(p,'pPr');if(!pPr){pPr=mk(d,'pPr');p.insertBefore(pPr,p.firstChild)}
    const {inTc,list,head,keep,jc}=pinfo(p,pPr);
    const sp=sc(d,pPr,'spacing',ORD.pPr);
    ['beforeLines','afterLines','beforeAutospacing','afterAutospacing'].forEach(a=>sp.removeAttributeNS(W,a));
    sa(sp,'before',head&&!inTc?120:0);sa(sp,'after',inTc?0:120);sa(sp,'line',276);sa(sp,'lineRule','auto');
    const cs=one(pPr,'contextualSpacing');if(cs)pPr.removeChild(cs);   /* làm mất khoảng cách giữa các đoạn cùng kiểu */
    if(head&&!inTc)sc(d,pPr,'keepNext',ORD.pPr);                         /* tiêu đề không bị rớt cuối trang */
    const setInd=(first,zero)=>{const ind=sc(d,pPr,'ind',ORD.pPr);
      RI.forEach(a=>{if(zero||/hanging|firstLine/.test(a))ind.removeAttributeNS(W,a)});
      if(zero){sa(ind,'left',0);sa(ind,'right',0)}sa(ind,'firstLine',first)};
    if(!inTc&&!list&&!head&&!keep){
      sa(sc(d,pPr,'jc',ORD.pPr),'val','both');setInd(567,cfg.ind!==false)}
    else if(inTc&&!list&&cfg.tbl!==false){
      setInd(0,true);                                                   /* ô bảng: không thụt đầu dòng */
      if(CELLJ.test(jc)){const tr=anc(p,'tr'),tb=tr&&anc(tr,'tbl'),first=!!tb&&wk(tb,'tr')[0]===tr,t=p.textContent.trim();
        sa(sc(d,pPr,'jc',ORD.pPr),'val',first||/^[\d\s.,%+\-–\/]{1,15}$/.test(t)?'center':'left')}}
    const ts=all(p,'t');
    for(const t of ts){const v=t.textContent.replace(/^[\s\u00a0]+/,'');if(v!==t.textContent)t.textContent=v;if(v)break}
    for(const t of ts.slice().reverse()){const v=t.textContent.replace(/[\s\u00a0]+$/,'');if(v!==t.textContent)t.textContent=v;if(v)break}
  });
  /* đoạn trống: gộp liên tiếp, bỏ đoạn trống đầu tài liệu và đầu/cuối ô */
  const isEP=c=>!!c&&isP(c)&&isEmpty(c);
  [body].concat(all(body,'tc')).forEach(ct=>{let prev=false;
    Array.from(ct.children).forEach(c=>{if(isP(c)){const e=isEmpty(c);if(e&&prev){ct.removeChild(c);rep.empty=(rep.empty||0)+1;return}prev=e}else prev=false});
    const kids=()=>Array.from(ct.children).filter(c=>c.localName!=='tcPr'&&c.localName!=='sectPr');
    let a=kids();
    while(a.length>1&&isEP(a[0])){ct.removeChild(a[0]);rep.empty=(rep.empty||0)+1;a=kids()}
    while(ct.localName==='tc'&&a.length>1&&isEP(a[a.length-1])&&isP(a[a.length-2])){ct.removeChild(a[a.length-1]);rep.empty=(rep.empty||0)+1;a=kids()}});
  /* bảng biểu */
  all(body,'tbl').forEach(tbl=>{
    const nested=!!anc(tbl,'tbl');
    if(nested)rep.nested=(rep.nested||0)+1;else rep.tables++;
    let pr=one(tbl,'tblPr');if(!pr){pr=mk(d,'tblPr');tbl.insertBefore(pr,tbl.firstChild)}
    const rows=wk(tbl,'tr');
    if(cfg.tbl!==false){
      const cm=sc(d,pr,'tblCellMar',ORD.tblPr);['start','end'].forEach(n=>{const e=one(cm,n);if(e)cm.removeChild(e)});
      [['top',40],['left',108],['bottom',40],['right',108]].forEach(([n,v])=>{const e=sc(d,cm,n,CM);sa(e,'w',v);sa(e,'type','dxa')});
      const ncol=Math.max(0,...rows.map(r=>wk(r,'tc').length));
      if(!one(pr,'tblBorders')&&!one(pr,'tblStyle')&&!all(tbl,'tcBorders').length&&rows.length>=3&&ncol>=2){
        const b=sc(d,pr,'tblBorders',ORD.tblPr);
        ['top','left','bottom','right','insideH','insideV'].forEach(n=>{const e=mk(d,n);sa(e,'val','single');sa(e,'sz',4);sa(e,'space',0);sa(e,'color','auto');b.appendChild(e)});
        rep.borders=(rep.borders||0)+1}
      rows.forEach((tr,ri)=>{
        let t=one(tr,'trPr');if(!t){t=mk(d,'trPr');tr.insertBefore(t,wk(tr,'tc')[0]||null)}
        if(!one(t,'cantSplit'))t.appendChild(mk(d,'cantSplit'));          /* hàng không bị cắt đôi giữa 2 trang */
        const h=one(t,'trHeight');if(h&&ga(h,'hRule')==='exact')sa(h,'hRule','atLeast');   /* chữ không bị cắt mất */
        if(!nested&&ri===0&&rows.length>=4&&!one(t,'tblHeader'))t.appendChild(mk(d,'tblHeader'));  /* lặp dòng tiêu đề */
        wk(tr,'tc').forEach(tc=>{let cp=one(tc,'tcPr');if(!cp){cp=mk(d,'tcPr');tc.insertBefore(cp,tc.firstChild)}
          ['noWrap','tcFitText'].forEach(n=>{const e=one(cp,n);if(e)cp.removeChild(e)});
          sa(sc(d,cp,'vAlign',ORD.tcPr),'val','center')})})}
    if(nested)return;
    const i=bk.indexOf(tbl),sec=secs.find(s=>s.end>=i)||secs[secs.length-1],aw=sec.aw;
    const ind=one(pr,'tblInd');let il=0;
    if(ind){const v=parseInt(ga(ind,'w'),10)||0;if(v<0||v>1440){sa(ind,'w',0);sa(ind,'type','dxa')}else il=v}
    const grid=one(tbl,'tblGrid'),cols=grid?wk(grid,'gridCol'):[];
    if(!cols.length){rep.warn.push('có bảng không có tblGrid: giữ nguyên độ rộng');return}
    const ws=cols.map(c=>parseInt(ga(c,'w'),10)||0),tot=ws.reduce((a,b)=>a+b,0),av=aw-il;
    if(!tot||ws.some(w=>!w))return;
    const tw=one(pr,'tblW'),pct=!!tw&&ga(tw,'type')==='pct';
    let nw=ws,shr=false;
    if(tot>av+5){const f=av/tot;nw=ws.map(w=>Math.floor(w*f));nw[nw.length-1]+=Math.floor(av)-nw.reduce((a,b)=>a+b,0);
      cols.forEach((c,k)=>sa(c,'w',nw[k]));shr=true;rep.shrunk=(rep.shrunk||0)+1}
    if(shr||!pct){
      rows.forEach(tr=>{let col=0;const tp=one(tr,'trPr'),gb=tp&&one(tp,'gridBefore');if(gb)col+=parseInt(ga(gb,'val'),10)||0;
        wk(tr,'tc').forEach(tc=>{let cp=one(tc,'tcPr');if(!cp){cp=mk(d,'tcPr');tc.insertBefore(cp,tc.firstChild)}
          const gs=one(cp,'gridSpan'),n=gs?(parseInt(ga(gs,'val'),10)||1):1;let w=0;
          for(let k=col;k<col+n&&k<nw.length;k++)w+=nw[k];col+=n;
          const x=sc(d,cp,'tcW',ORD.tcPr);sa(x,'w',w);sa(x,'type','dxa')})});     /* độ rộng ô khớp với lưới cột */
      if(!pct){const x=sc(d,pr,'tblW',ORD.tblPr);sa(x,'w',Math.min(nw.reduce((a,b)=>a+b,0),Math.floor(av)));sa(x,'type','dxa');
        sa(sc(d,pr,'tblLayout',ORD.tblPr),'type','fixed')}}
  });
  if(all(body,'txbxContent').length)rep.warn.push('có hộp văn bản: chỉ đổi font/cỡ chữ và sửa chữ, không chỉnh đoạn/lề bên trong');
}

/* ===== Sửa văn bản: khoảng trắng, dấu câu, viết hoa, từ lặp/sai chính tả; cảnh báo chỗ khó hiểu ===== */
const XMLNS='http://www.w3.org/XML/1998/namespace';
const PROT=/(?:https?:\/\/|ftp:\/\/|www\.)\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|[\w-]+(?:\.[\w-]+)*\.(?:com|vn|net|org|edu|gov|info|io|docx?|xlsx?|pptx?|pdf|png|jpe?g|txt|zip|html?)(?![\p{L}\p{N}])/giu;
const FW='của|và|là|các|những|để|trong|với|cho|được|tại|theo|về|thì|mà|rằng|nếu|sẽ|đã|đang';
const DUP=new RegExp('(?<![\\p{L}\\p{N}])('+FW+')( +)\\1(?![\\p{L}\\p{N}])','giu');
const TYPO=[['ko','không'],['đc','được'],['chia sẽ','chia sẻ'],['sơ xuất','sơ suất'],['xử dụng','sử dụng'],['sử lý','xử lý'],['chỉnh chu','chỉn chu'],
  ['trình bầy','trình bày'],['bổ xung','bổ sung'],['sắp sếp','sắp xếp'],['xắp xếp','sắp xếp'],['suất sắc','xuất sắc'],['xuất xắc','xuất sắc'],
  ['năng xuất','năng suất'],['sản suất','sản xuất'],['quang trọng','quan trọng'],['tập chung','tập trung'],['rà xoát','rà soát'],['ra soát','rà soát'],
  ['xem sét','xem xét'],['nghành','ngành']].map(([a,b])=>({re:new RegExp('(?<![\\p{L}\\p{N}])'+a.replace(/ /g,' +')+'(?![\\p{L}\\p{N}])','giu'),to:b}));
const ABBR=new Set('ths pgs nxb mrs prof etc fax tel tp tx tt cn bs ks gs ts vd vs mr ms dr st tr đt th'.split(' '));
const NOCAP=new Set('www http https ftp'.split(' '));
const CAP0=/^([-–—•●○▪■□✓✔+*]\s*|\(?\d+(?:\.\d+)*[.)]\s*)?(\p{Ll}[\p{Ll}\p{M}]*)(?![\p{L}\p{N}])/gu;
const CAP1=/([.!?])( +)(\p{Ll}[\p{Ll}\p{M}]*)(?![\p{L}\p{N}])/gu;
const VOW=/[aeiouyàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i;
const up=w=>w[0].toUpperCase()+w.slice(1);
const mcase=(w,r)=>{if(w.length>1&&w===w.toUpperCase()&&w!==w.toLowerCase())return r.toUpperCase();return w[0]!==w[0].toLowerCase()?up(r):r};
const isL=ch=>!!ch&&/\p{L}/u.test(ch);

function collect(p){const items=[],nodes=[];
  const SKIP=new Set(['pPr','rPr','del','moveFrom','instrText','delText']);
  (function walk(e){for(const c of Array.from(e.children)){const ln=c.localName,w=c.namespaceURI===W;
    if(w&&ln==='t'){const k=nodes.length,s=c.textContent;nodes.push(c);for(let i=0;i<s.length;i++)items.push({c:s[i],n:k})}
    else if(w&&(ln==='tab'||ln==='ptab'))items.push({c:'\t',n:-1,el:c});
    else if(w&&(ln==='br'||ln==='cr'))items.push({c:'\n',n:-1,el:c,pl:ln==='br'&&(!ga(c,'type')||ga(c,'type')==='textWrapping')&&!ga(c,'clear')});
    else if((w&&/^(drawing|pict|object|sym|footnoteReference|endnoteReference|noBreakHyphen)$/.test(ln))||ln==='AlternateContent')items.push({c:'\uFFFC',n:-1});
    else if(w&&!SKIP.has(ln))walk(c)}})(p);
  return {items,nodes}}
function flush(nodes,items){(items.dead||[]).forEach(e=>e.parentNode&&e.parentNode.removeChild(e));const buf=nodes.map(()=>'');for(const it of items)if(it.n>=0)buf[it.n]+=it.c;
  nodes.forEach((t,k)=>{if(t.textContent!==buf[k]){t.textContent=buf[k];if(/^\s|\s$/.test(buf[k]))t.setAttributeNS(XMLNS,'xml:space','preserve')}})}
function tocSdt(p){const s=anc(p,'sdt');if(!s)return false;const pr=one(s,'sdtPr');return !!pr&&all(pr,'docPartGallery').some(e=>/table of contents/i.test(ga(e,'val')))}

function fixPara(items,info,pv,cnt,cfg,notes,lb){
  const str=()=>{let s='';for(const x of items)s+=x.c;return s};
  const bump=(k,n)=>{cnt[k]=(cnt[k]||0)+n};
  const note=(k,sn)=>notes.push({k,p:lb,s:String(sn).replace(/\s+/g,' ').slice(0,40)});
  /* ed: thay thế theo regex nhưng chỉ sửa đúng ký tự khác biệt, giữ nguyên định dạng từng run; bỏ qua URL/email/tên file */
  const ed=(re,fn,kind)=>{const s=str(),ms=Array.from(s.matchAll(re));if(!ms.length)return;
    const pr=[];for(const m of s.matchAll(PROT))pr.push([m.index,m.index+m[0].length]);
    let n=0;
    for(let q=ms.length-1;q>=0;q--){const m=ms[q],a=m.index,o=m[0];
      if(pr.some(([x,y])=>a<y&&a+o.length>x))continue;
      const r=typeof fn==='function'?fn(m,s):fn;if(r==null||r===o)continue;
      let i=0;while(i<o.length&&i<r.length&&o[i]===r[i])i++;
      let j=0;while(j<o.length-i&&j<r.length-i&&o[o.length-1-j]===r[r.length-1-j])j++;
      const ds=a+i,de=a+o.length-j,ins=r.slice(i,r.length-j);
      if(items.slice(ds,de).some(x=>x.n<0))continue;
      let nd=-1;
      if(de>ds)nd=items[ds].n;
      else{if(ds>0&&items[ds-1].n>=0)nd=items[ds-1].n;else for(let k=ds;k<items.length;k++)if(items[k].n>=0){nd=items[k].n;break}}
      if(nd<0&&ins)continue;
      items.splice(ds,de-ds,...ins.split('').map(c=>({c,n:nd})));n++}
    if(n)bump(kind,n)};
  const s0=str();
  if(!s0.trim()&&!items.some(x=>x.n<0)){ed(/^[ \u00a0]+$/g,'','khoảng trắng thừa');return ''}
  /* 1. ký tự */
  if(/[\u0300-\u036f]/.test(s0))ed(/\S*[\u0300-\u036f]\S*/gu,m=>m[0].normalize('NFC'),'chữ Việt tổ hợp → dựng sẵn');
  ed(/[\u200B\uFEFF\u00AD\u2060]/g,'','ký tự ẩn/rác');
  ed(/[\u00A0\u2028\u2000-\u200A\u202F\u205F\u3000]/g,' ','dấu cách đặc biệt → dấu cách thường');
  {const s=str(),n=(s.match(/"/g)||[]).length;
   if(n&&n%2===0&&!/\d"/.test(s))ed(/"/g,(m,t)=>((t.slice(0,m.index).match(/"/g)||[]).length%2?'”':'“'),'nháy kép thẳng → nháy cong')}
  /* 1b. văn bản copy từ web: ngắt dòng mềm / Tab chen giữa câu → dấu cách (nguyên nhân chữ bị giãn xa khi căn đều) */
  if(!info.inTc&&!info.head&&!info.keep){let n=0;
    for(let i=1;i<items.length-1;i++){const x=items[i],a=items[i-1],b=items[i+1];
      if(!x.el||a.n<0||b.n<0)continue;
      if(x.c==='\n'?!x.pl:!(isL(a.c)&&isL(b.c)))continue;
      (items.dead=items.dead||[]).push(x.el);items[i]={c:' ',n:a.n};n++}
    if(n)bump('ngắt dòng/Tab giữa câu → dấu cách',n)}
  /* 2. khoảng trắng */
  ed(/(?<=\S) {2,}(?=\S)/g,' ','khoảng trắng thừa');
  ed(/^ +| +$/g,'','khoảng trắng thừa');
  ed(/ +(?=[\n\t])|(?<=\n) +/g,'','khoảng trắng thừa');
  ed(/ +(?=[,;:!?%)\]}])/g,'','dấu cách trước dấu câu');
  ed(/ +\.(?![.\d])/g,'.','dấu cách trước dấu câu');
  ed(/([(\[{“‘]) +/g,m=>m[1],'dấu cách sau ngoặc/nháy mở');
  ed(/ +(?=[”’])/g,'','dấu cách trước nháy đóng');
  /* 3. dấu câu */
  ed(/[,;:!?](?=\p{L})/gu,(m,s)=>{const a=m.index,pc=s[a-1];
    if(!pc||!/[\p{L}\p{N})\]”"’']/u.test(pc))return null;
    if(isL(pc)&&!isL(s[a-2])&&isL(s[a+1])&&!isL(s[a+2]))return null;     /* a,b / a:b một chữ cái: giữ nguyên */
    return m[0]+' '},'thiếu dấu cách sau dấu câu');
  ed(/(?<=\p{Ll}{2})\.(?=\p{Lu}\p{Ll})/gu,'. ','thiếu dấu cách sau dấu câu');
  ed(/(?<=\p{Ll}{2}|[)\]”])\.(?=\p{Ll}{2})/gu,(m,t)=>{const a=m.index,l=(t.slice(0,a).match(/\p{L}+$/u)||[''])[0],r=(t.slice(a+1).match(/^\p{L}+/u)||[''])[0];
    return /[^\x00-\x7f]/.test(l+r)?'. ':null},'thiếu dấu cách sau dấu chấm');   /* chỉ khi có chữ có dấu, tránh làm hỏng tên miền/viết tắt */
  ed(/(?<=\p{Ll})(?=\p{Lu}\p{Ll})/gu,(m,t)=>{const a=m.index,l=(t.slice(0,a).match(/\p{L}+$/u)||[''])[0],r=(t.slice(a).match(/^\p{L}+/u)||[''])[0];
    return /[^\x00-\x7f]/.test(l+r)?' ':null},'chữ dính liền (HàNội → Hà Nội)');
  ed(/(?<!\p{L})(Điều|Khoản|Chương|Mục|Phần|Số|ngày|tháng|năm|số)(?=\d)/gu,m=>m[1]+' ','chữ dính số (Điều5 → Điều 5)');
  ed(/(?<=\d)(?=(?:ngày|tháng|năm)(?!\p{L}))/gu,' ','chữ dính số (20tháng → 20 tháng)');
  ed(/\)(?=\p{L}{2})/gu,') ','thiếu dấu cách sau ngoặc đóng');
  ed(/%(?=\p{L})/gu,'% ','thiếu dấu cách sau %');
  ed(/([,;:])\1+/g,m=>m[1],'dấu câu bị lặp');
  ed(/(?<![.…])\.\.(?![.…])/g,'.','dấu câu bị lặp');
  ed(/([!?])\1+/g,m=>m[1],'dấu câu bị lặp');
  /* 4. từ ngữ */
  ed(DUP,m=>m[1],'từ lặp liền kề (của của, và và…)');
  for(const t of TYPO)ed(t.re,m=>mcase(m[0],t.to),'từ sai chính tả/viết tắt');
  /* 5. viết hoa */
  let broken=false;
  ed(CAP0,(m,s)=>{const pre=m[1]||'',w=m[2],e=m[0].length,nx=s[e],nn=s[e+1];
    if((s.match(/\p{L}+/gu)||[]).length<2&&w.length<4)return null;
    if(NOCAP.has(w))return null;
    if((nx==='.'||nx==='@'||nx==='/'||nx==='_'||nx===':')&&nn&&!/\s/.test(nn))return null;
    if(pv){const t=pv.end;
      if(/[,;]/.test(t))return null;
      if(t===':'){if(!pre)return null}
      else if(!/[.!?…]/.test(t)&&pv.len>100){broken=true;return null}}
    return pre+up(w)},'viết hoa đầu dòng');
  ed(CAP1,(m,s)=>{const a=m.index,pre=s.slice(0,a);
    if(/[.…]$/.test(pre))return null;
    {const e=a+m[0].length;if(s[e]==='.'&&isL(s[e+1]))return null}   /* v.v., p.s. … */
    const tk=((pre.match(/\S*$/)||[''])[0]).replace(/^[(\[“"‘']+/u,'');
    if(!/^\d+$/.test(tk)){const lt=tk.replace(/[^\p{L}]/gu,'');
      if(lt.length<=1||ABBR.has(lt.toLowerCase())||/\./.test(tk))return null}
    return m[1]+m[2]+up(m[3])},'viết hoa sau dấu chấm');
  /* 6. dấu chấm cuối đoạn văn */
  if(cfg.dot!==false&&!info.inTc&&!info.list&&!info.head&&!info.keep){
    const s=str(),words=(s.match(/\p{L}+/gu)||[]).length,last=items[items.length-1];
    if(s.length>=60&&words>=8&&last&&last.n>=0&&/[\p{L}\p{N})\]”"’']$/u.test(s)&&!/[.!?…][)\]”"’']$/.test(s)&&/\p{Ll}/u.test(s)&&!/(?:https?:\/\/|www\.)\S+$|\S@\S+$/i.test(s)){
      items.push({c:'.',n:last.n});bump('thêm dấu chấm cuối đoạn',1)}}
  /* 7. cảnh báo các chỗ không rõ nghĩa (không tự sửa vì có thể đổi ý) */
  const s=str(),s2=s.replace(PROT,' ');
  if(broken)note('Dòng có vẻ bị ngắt giữa câu (đoạn trước chưa kết thúc)',s);
  if(/Ã.|Ä‘|áº|á»|ï¿½|\uFFFD/.test(s))note('Lỗi mã hóa/font (ký tự lạ)',s);
  const bal=(a,b)=>(s.split(a).length-1)!==(s.split(b).length-1);
  if(bal('(',')')||bal('[',']')||bal('“','”'))note('Ngoặc/nháy không khớp cặp',s);
  if(/lorem ipsum|\bx{3,}\b|\?{3,}|\bTBD\b/i.test(s))note('Còn nội dung giữ chỗ (xxx, ???, lorem…)',s);
  s.split(/(?<=[.!?…])\s+/).forEach(x=>{if(x.split(/\s+/).length>70)note('Câu quá dài (>70 từ), nên tách câu',x)});
  if((s.match(/\p{L}+/gu)||[]).length>2&&/(?:^|\s)(?:và|của|để|với|là|các|những|cho|trong|tại|theo|hoặc|nhưng|mà|thì|rằng|nếu)\s*[.;]?$/i.test(s))note('Câu bỏ lửng (kết thúc bằng từ nối/giới từ)',s.slice(-40));
  const dup=s2.match(/(?<![\p{L}\p{N}])(\p{L}{2,})( +)\1(?![\p{L}\p{N}])/iu);
  if(dup)note('Từ lặp liền kề (kiểm tra có phải từ láy không)',dup[0]);
  for(const w of (s2.match(/(?<![\p{L}\p{N}])\p{Ll}{5,}(?![\p{L}\p{N}])/gu)||[])){if(!VOW.test(w)){note('Từ lạ, không có nguyên âm (có thể gõ sai)',w);break}}
  for(const w of (s2.match(/\p{L}{8,}/gu)||[])){if(/[^\x00-\x7f]/.test(w)){note('Từ quá dài, có thể bị dính chữ (ví dụ nhàcủa)',w);break}}
  const mc=s2.match(/(?<!\p{L})\p{Lu}{2,}\p{Ll}+(?!\p{L})/u);
  if(mc&&!/^\p{Lu}+s$/u.test(mc[0]))note('Chữ hoa/thường lẫn lộn (Caps Lock?)',mc[0]);
  if(s.length>80&&!info.head&&!info.keep&&!/\p{Ll}/u.test(s)&&/\p{Lu}/u.test(s))note('Cả đoạn viết hoa toàn bộ',s);
  return s}

async function fixText(d,part,cfg,cnt,notes){
  const prev=new Map(),tag=part==='word/document.xml'?'':part.replace(/^word\/|\.xml$/g,'')+' ';let idx=0,k=0;
  for(const p of all(d,'p')){
    if(++k%150===0)await tick();
    idx++;
    const pPr=one(p,'pPr'),info=pinfo(p,pPr),par=p.parentNode;
    if(/toc|mục ?lục|contents|code|source/i.test(info.sv)||tocSdt(p))continue;
    const {items,nodes}=collect(p);
    if(!nodes.length){prev.set(par,null);continue}
    const s=fixPara(items,info,prev.get(par),cnt,cfg,notes,tag+'đoạn '+idx);
    flush(nodes,items);
    const t=s.replace(/[\s”"’')\]]+$/u,'');
    prev.set(par,t?{end:t[t.length-1],len:s.length}:null)}}

const NDEF={t:20,b:20,l:30,r:15,txt:true,tbl:true,ind:true,dot:true};
async function norm(zip,cfg){
  cfg=Object.assign({},NDEF,cfg||{});
  const rep={paras:0,tables:0,warn:[],info:[]},cnt={},notes=[];
  for(const n of Object.keys(zip.files).filter(n=>/^word\/(document|styles|numbering|footnotes|endnotes|header\d*|footer\d*)\.xml$/.test(n))){
    const d=pX(await zip.file(n).async('string'),n);
    if(/styles\.xml$/.test(n))fixStyles(d);
    all(d,'rPr').forEach(r=>fixR(d,r));
    if(cfg.txt!==false&&/^word\/(document|footnotes|endnotes|header\d*|footer\d*)\.xml$/.test(n))await fixText(d,n,cfg,cnt,notes);
    if(n==='word/document.xml')docNorm(d,cfg,rep);
    zip.file(n,ser(d),{createFolders:false})}
  if(rep.empty)cnt['đoạn trống thừa đã xóa']=rep.empty;
  if(rep.borders)cnt['bảng thiếu viền đã kẻ viền']=rep.borders;
  if(rep.shrunk)cnt['bảng tràn lề đã co lại']=rep.shrunk;
  rep.fix=cnt;
  rep.info=Object.keys(cnt).map(k=>k+': '+cnt[k]);
  const grp={};notes.forEach(x=>(grp[x.k]=grp[x.k]||[]).push(x));
  Object.keys(grp).forEach(k=>{const a=grp[k];
    rep.warn.push(k+' ('+a.length+'): '+a.slice(0,5).map(x=>x.p+' “'+x.s+'”').join('; ')+(a.length>5?'; …':''))});
  if(rep.nested)rep.warn.push(rep.nested+' bảng lồng nhau: chỉ chỉnh ô/viền, chưa co độ rộng (giữ nguyên)');
  if(zip.file('word/comments.xml'))rep.warn.push('có chú thích (comments): giữ nguyên, chưa đổi font');
  return rep}

/* Chuẩn hóa một file .docx độc lập (dùng cho công cụ khác): trả {data, docXml, rep} */
window.WordNormalize=async function(buf,cfg){
  if(typeof JSZip==='undefined')throw new Error('Chưa tải được thư viện JSZip');
  const zip=await JSZip.loadAsync(buf);
  if(!zip.file('word/document.xml'))throw new Error('Không phải file .docx hợp lệ');
  const rep=await norm(zip,cfg),ck=await check(zip,true);
  if(ck.er.length)throw new Error('Kiểm tra thất bại: '+ck.er.slice(0,5).join('; '));
  return {data:await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),docXml:ck.docXml,rep}};

/* ===== Tự kiểm tra gói .docx ===== */
async function check(zip,full){
  const er=[];let docXml='';const cts=zip.file('[Content_Types].xml');let df=new Set(),ov=new Set();
  if(!cts)er.push('thiếu [Content_Types].xml');
  else{Array.from(pX(await cts.async('string')).documentElement.children).forEach(e=>{if(e.localName==='Default')df.add(e.getAttribute('Extension').toLowerCase());else ov.add(e.getAttribute('PartName'))})}
  for(const n of Object.keys(zip.files)){
    if(zip.files[n].dir)continue;
    if(full&&n!=='[Content_Types].xml'&&!ov.has('/'+n)&&!df.has(n.split('.').pop().toLowerCase()))er.push('part thiếu content type: '+n);
    if(!/\.(xml|rels)$/i.test(n))continue;
    const s=await zip.file(n).async('string');let d;
    try{d=pX(s,n)}catch(e){er.push(e.message);continue}
    if(n==='word/document.xml')docXml=s;
    if(!full)continue;
    if(/\.rels$/.test(n)){const dir=n.replace(/_rels\/[^/]*$/,'');
      Array.from(d.documentElement.children).forEach(r=>{if(r.getAttribute('TargetMode')!=='External'&&!zip.file(rs(dir,r.getAttribute('Target'))))er.push('rels trỏ tới part không tồn tại: '+r.getAttribute('Target')+' ('+n+')')})}
    else if(/^word\/[^/]+\.xml$/.test(n)){
      const rm=await relMap(zip,'word/_rels/'+n.slice(5)+'.rels');
      Array.from(d.getElementsByTagName('*')).forEach(e=>Array.from(e.attributes).forEach(a=>{if(a.namespaceURI===R&&!rm[a.value])er.push('r:id="'+a.value+'" không có trong rels ('+n+')')}));
      if(n==='word/document.xml'){
        [['bookmarkStart',W,'id'],['docPr',null,'id']].forEach(([ln,ns,at])=>{const seen=new Set();
          Array.from(d.getElementsByTagName('*')).filter(e=>e.localName===ln).forEach(e=>{const v=ns?e.getAttributeNS(ns,at):e.getAttribute(at);if(seen.has(v))er.push('id trùng ('+ln+'): '+v);seen.add(v)})})}}
  }
  if(docXml){try{docxToBlocks(docXml)}catch(e){er.push('docxToBlocks lỗi: '+e.message)}}else er.push('thiếu word/document.xml');
  return {er:Array.from(new Set(er)),docXml}}

window.WordPkgCheck=check;   /* dùng chung cho Rà soát Word: kiểm tra gói .docx đầy đủ */

/* ===== Ghép ===== */
async function merge(files,o,step){
  const zip=await JSZip.loadAsync(files[0].buf),S={n:0,rid:0,bm:0,dp:0},warns=[];
  if(!zip.file('word/document.xml'))throw new Error(files[0].name+': không phải .docx hợp lệ');
  const doc=pX(await zip.file('word/document.xml').async('string'),'document.xml'),body=doc.getElementsByTagNameNS(W,'body')[0];
  if(!body)throw new Error(files[0].name+': thiếu w:body');
  const relsN='word/_rels/document.xml.rels';
  const rels=zip.file(relsN)?pX(await zip.file(relsN).async('string')):pX('<Relationships xmlns="'+RELNS+'"/>');
  const ct=pX(await zip.file('[Content_Types].xml').async('string'));
  const opt=async n=>zip.file(n)?pX(await zip.file(n).async('string'),n):null;
  let sty=await opt('word/styles.xml'),num=await opt('word/numbering.xml');
  const ca=(tag,at)=>{const ex=Array.from(ct.documentElement.children).some(e=>e.localName===tag&&(tag==='Default'?e.getAttribute('Extension').toLowerCase()===at.Extension.toLowerCase():e.getAttribute('PartName')===at.PartName));
    if(ex)return;const e=ct.createElementNS(CTNS,tag);for(const k in at)e.setAttribute(k,at[k]);ct.documentElement.appendChild(e)};
  const addRel=(type,target,ext)=>{const id='rIdM'+(++S.rid),e=rels.createElementNS(RELNS,'Relationship');e.setAttribute('Id',id);e.setAttribute('Type',type);e.setAttribute('Target',target);if(ext)e.setAttribute('TargetMode','External');rels.documentElement.appendChild(e);return id};
  const ens=(path,root,type,cty)=>{addRel(R+'/'+type,path.slice(5));ca('Override',{PartName:'/'+path,ContentType:cty});return pX('<w:'+root+' xmlns:w="'+W+'"/>')};
  const cn=(a,b)=>Array.from(a.attributes).forEach(x=>{if(x.name.indexOf('xmlns:')===0&&!b.hasAttribute(x.name))b.setAttributeNS(XN,x.name,x.value)});
  for(const n of Object.keys(zip.files).filter(n=>/^word\/[^/]+\.xml$/.test(n))){const s=await zip.file(n).async('string');
    for(const m of s.matchAll(/<w:bookmarkStart[^>]*\sw:id="(\d+)"/g))S.bm=Math.max(S.bm,+m[1]);
    for(const m of s.matchAll(/<wp:docPr[^>]*?\sid="(\d+)"/g))S.dp=Math.max(S.dp,+m[1])}
  const fin=()=>one(body,'sectPr');
  const baseSp=fin(),baseSp0=baseSp?baseSp.cloneNode(true):null;
  if(!o.norm&&baseSp){const p=mk(doc,'p'),pp=mk(doc,'pPr');pp.appendChild(baseSp);p.appendChild(pp);body.appendChild(p)}
  const XS=new XMLSerializer();
  for(let i=1;i<files.length;i++){
    step(i+1,files.length);await tick();
    const ws=[];warns.push(ws);
    let sz;try{sz=await JSZip.loadAsync(files[i].buf)}catch(e){throw new Error(files[i].name+': không mở được ('+e.message+')')}
    if(!sz.file('word/document.xml'))throw new Error(files[i].name+': không phải .docx hợp lệ');
    const sd=pX(await sz.file('word/document.xml').async('string'),files[i].name),sb=sd.getElementsByTagNameNS(W,'body')[0];
    if(!sb)throw new Error(files[i].name+': thiếu w:body');
    cn(sd.documentElement,doc.documentElement);
    const sSect=Array.from(sb.children).find(c=>c.localName==='sectPr'&&c.namespaceURI===W);
    const box=mk(doc,'body');Array.from(sb.children).forEach(c=>{if(c!==sSect)box.appendChild(doc.importNode(c,true))});
    const rm=x=>{if(x.parentNode)x.parentNode.removeChild(x)};
    let nr=0;['footnoteReference','endnoteReference','commentReference'].forEach(n=>all(box,n).forEach(e=>{rm(e.parentNode);nr++}));
    ['commentRangeStart','commentRangeEnd'].forEach(n=>all(box,n).forEach(rm));
    if(nr)ws.push('đã bỏ '+nr+' ghi chú cuối trang/chú thích (chưa ghép được an toàn)');
    if(all(box,'txbxContent').length)ws.push('có hộp văn bản: giữ nội dung, kiểm tra lại định dạng trong Word');
    if(o.norm){let k=0;all(box,'sectPr').forEach(s=>{if(s.parentNode&&s.parentNode.localName==='pPr'){rm(s);k++}});if(k)ws.push('đã bỏ '+k+' ngắt section trong file (dùng một khổ giấy/lề chung)')}
    // Style
    const smap={},clones=[];
    const sst=sz.file('word/styles.xml')?pX(await sz.file('word/styles.xml').async('string')):null;
    if(sst){if(!sty)sty=ens('word/styles.xml','styles','styles','application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml');
      cn(sst.documentElement,sty.documentElement);
      const have={};wk(sty.documentElement,'style').forEach(s=>{have[ga(s,'styleId')]=s});
      wk(sst.documentElement,'style').forEach(s=>{const id=ga(s,'styleId'),b=have[id];let c=null;
        if(!b)c=sty.importNode(s,true);
        else if(XS.serializeToString(b)!==XS.serializeToString(s)){let nid=id+'_m'+i;while(have[nid])nid+='x';smap[id]=nid;
          c=sty.importNode(s,true);sa(c,'styleId',nid);c.removeAttributeNS(W,'default');const nm=one(c,'name');if(nm)sa(nm,'val',ga(nm,'val')+' (m'+i+')')}
        if(c){have[ga(c,'styleId')]=c;clones.push(c);sty.documentElement.appendChild(c)}})}
    // Numbering
    const nmap={},sn=await(async()=>sz.file('word/numbering.xml')?pX(await sz.file('word/numbering.xml').async('string')):null)();
    if(sn){if(!num)num=ens('word/numbering.xml','numbering','numbering','application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml');
      cn(sn.documentElement,num.documentElement);
      let ma=0,mn=0;all(num,'abstractNum').forEach(a=>{ma=Math.max(ma,+ga(a,'abstractNumId')||0)});all(num,'num').forEach(a=>{mn=Math.max(mn,+ga(a,'numId')||0)});
      const am={},nrt=num.documentElement;
      if(all(sn,'numPicBullet').length)ws.push('danh sách dùng ký hiệu ảnh: đã đổi sang ký hiệu mặc định');
      wk(sn.documentElement,'abstractNum').forEach(a=>{const c=num.importNode(a,true),nid=++ma;am[ga(a,'abstractNumId')]=nid;sa(c,'abstractNumId',nid);
        const ns=one(c,'nsid');if(ns)sa(ns,'val',('00000000'+Math.floor(Math.random()*4294967295).toString(16).toUpperCase()).slice(-8));
        all(c,'lvlPicBulletId').forEach(rm);nrt.insertBefore(c,one(nrt,'num'))});
      wk(sn.documentElement,'num').forEach(x=>{const c=num.importNode(x,true),nid=++mn;nmap[ga(x,'numId')]=nid;sa(c,'numId',nid);
        const an=one(c,'abstractNumId');if(an&&am[ga(an,'val')]!==undefined)sa(an,'val',am[ga(an,'val')]);
        nrt.insertBefore(c,one(nrt,'numIdMacAtCleanup'))})}
    const names={};
    const remap=root=>{
      all(root,'pStyle').concat(all(root,'rStyle'),all(root,'tblStyle')).forEach(e=>{const v=ga(e,'val');if(smap[v])sa(e,'val',smap[v])});
      all(root,'numId').forEach(e=>{const v=ga(e,'val');if(nmap[v])sa(e,'val',nmap[v])});
      const bm={};
      all(root,'bookmarkStart').forEach(e=>{const oid=ga(e,'id'),nm=ga(e,'name');bm[oid]=++S.bm;sa(e,'id',S.bm);if(nm){names[nm]=nm.slice(0,34)+'_m'+i;sa(e,'name',names[nm])}});
      all(root,'bookmarkEnd').forEach(e=>{const oid=ga(e,'id');if(bm[oid])sa(e,'id',bm[oid])});
      all(root,'hyperlink').forEach(e=>{const a=ga(e,'anchor');if(a&&names[a])sa(e,'anchor',names[a])});
      all(root,'sdtPr').forEach(s=>{const x=one(s,'id');if(x)sa(x,'val',Math.floor(Math.random()*2e9)+1)});
      [root].concat(Array.from(root.getElementsByTagName('*'))).forEach(e=>{const l=e.localName;
        if((l==='docPr'||l==='cNvPr')&&e.hasAttribute('id'))e.setAttribute('id',++S.dp);
        else if(l==='shape'&&e.namespaceURI===VML&&e.hasAttribute('id'))e.setAttribute('id','wtm'+i+'_'+(++S.n));
        Array.from(e.attributes).forEach(a=>{if(a.localName==='paraId'||a.localName==='textId')e.removeAttributeNode(a)})})};
    clones.forEach(c=>{['basedOn','next','link'].forEach(n=>{const e=one(c,n);if(e&&smap[ga(e,'val')])sa(e,'val',smap[ga(e,'val')])});all(c,'numId').forEach(e=>{const v=ga(e,'val');if(nmap[v])sa(e,'val',nmap[v])})});
    // Part + rels
    const sct=pX(await sz.file('[Content_Types].xml').async('string')),srel=await relMap(sz,'word/_rels/document.xml.rels'),done={},rmap={};
    const cta=(path,np)=>{const ch=Array.from(sct.documentElement.children),ovr=ch.find(e=>e.localName==='Override'&&e.getAttribute('PartName')==='/'+path);
      if(ovr)ca('Override',{PartName:'/'+np,ContentType:ovr.getAttribute('ContentType')});
      else{const ext=path.split('.').pop(),df=ch.find(e=>e.localName==='Default'&&e.getAttribute('Extension').toLowerCase()===ext.toLowerCase());if(df)ca('Default',{Extension:ext,ContentType:df.getAttribute('ContentType')})}};
    const cp=async path=>{
      if(done[path])return done[path];
      const f=sz.file(path);if(!f)throw new Error(files[i].name+': thiếu part '+path);
      const dir=path.slice(0,path.lastIndexOf('/')+1),nm=path.slice(dir.length);let np=dir+'m'+i+'_'+nm;
      while(zip.file(np))np=dir+'m'+i+'_'+(++S.n)+'_'+nm;
      done[path]=np;cta(path,np);
      if(/^word\/(header|footer)\d*\.xml$/.test(path)){const hd=pX(await f.async('string'),path);remap(hd.documentElement);zip.file(np,ser(hd),{createFolders:false})}
      else zip.file(np,await f.async('uint8array'),{createFolders:false});
      const rp=dir+'_rels/'+nm+'.rels';
      if(sz.file(rp)){const rd=pX(await sz.file(rp).async('string'));
        for(const r of Array.from(rd.documentElement.children)){if(r.getAttribute('TargetMode')==='External')continue;
          r.setAttribute('Target','/'+await cp(rs(dir,r.getAttribute('Target'))))}
        const nd=np.slice(0,np.lastIndexOf('/')+1);zip.file(nd+'_rels/'+np.slice(nd.length)+'.rels',ser(rd),{createFolders:false})}
      return np};
    const rr=async root=>{for(const e of [root].concat(Array.from(root.getElementsByTagName('*')))){for(const a of Array.from(e.attributes)){
      if(a.namespaceURI!==R)continue;const old=a.value;
      if(!(old in rmap)){const r=srel[old];if(!r){ws.push('không tìm thấy quan hệ '+old+' trong file');continue}
        if(r.mode==='External')rmap[old]=addRel(r.type,r.target,true);
        else{const np=await cp(rs('word/',r.target));rmap[old]=addRel(r.type,np.indexOf('word/')===0?np.slice(5):'/'+np)}}
      if(rmap[old])a.value=rmap[old]}}};
    remap(box);await rr(box);
    let sp=null;
    if(sSect&&!o.norm){sp=doc.importNode(sSect,true);remap(sp);await rr(sp);
      const t=one(sp,'type');if(o.brk){if(t)rm(t)}else sa(sc(doc,sp,'type',ORD.sectPr),'val','continuous')}
    if(o.brk&&!sp&&box.firstElementChild){const f=box.firstElementChild;
      if(f.localName==='p'){let pp=one(f,'pPr');if(!pp){pp=mk(doc,'pPr');f.insertBefore(pp,f.firstChild)}sc(doc,pp,'pageBreakBefore',ORD.pPr)}
      else{const p=mk(doc,'p'),r=mk(doc,'r'),b=mk(doc,'br');sa(b,'type','page');r.appendChild(b);p.appendChild(r);box.insertBefore(p,f)}}
    Array.from(box.children).forEach(c=>body.insertBefore(c,fin()));
    if(!o.norm){
      if(sp){if(i<files.length-1){const p=mk(doc,'p'),pp=mk(doc,'pPr');pp.appendChild(sp);p.appendChild(pp);body.appendChild(p)}else body.appendChild(sp)}
      else if(i===files.length-1&&baseSp0&&!fin())body.appendChild(baseSp0.cloneNode(true))}
  }
  step(files.length,files.length,'ghi & kiểm tra');await tick();
  const zf=(n,s)=>zip.file(n,s,{createFolders:false});zf('word/document.xml',ser(doc));zf(relsN,ser(rels));zf('[Content_Types].xml',ser(ct));
  if(sty)zf('word/styles.xml',ser(sty));if(num)zf('word/numbering.xml',ser(num));
  let rep={paras:0,tables:0,warn:[],info:[]};
  if(o.norm)rep=await norm(zip,o.cfg);
  const ck=await check(zip,true);
  if(ck.er.length)throw new Error('Kiểm tra thất bại, không cho tải: '+ck.er.slice(0,5).join('; '));
  return {data:await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),docXml:ck.docXml,rep,warns}}

/* ===== Giao diện ===== */
function readCfg(p){const v=k=>parseFloat(String(g(p+k).value).replace(',','.')),ob=(k,d)=>{const e=g(p+k);return e&&e.type==='checkbox'?e.checked:d};
  const c={t:v('Top'),b:v('Bot'),l:v('Left'),r:v('Right')};
  if(Object.values(c).some(x=>!isFinite(x)||x<0||x>100)||c.l+c.r>=150||c.t+c.b>=200)throw new Error('Lề không hợp lệ (0–100 mm; tổng trái+phải < 150, trên+dưới < 200).');
  /* tùy chọn (nếu giao diện có checkbox id = tiền tố + Txt/Tbl/Ind/Dot thì đọc, không thì mặc định bật) */
  c.txt=ob('Txt',true);c.tbl=ob('Tbl',true);c.ind=ob('Ind',true);c.dot=ob('Dot',true);return c}
const setSt=(id,m,k)=>{const e=g(id);e.textContent=m;e.style.color=k==='e'?'#f87171':k==='o'?'#34d399':''};
const isDocx=f=>/\.docx$/i.test(f.name);
function dl(name,data,mime){return saveBlob(new Blob([data],{type:mime}),name)}
const MD='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
async function addFiles(list,fl,msgId,after){const rej=[];
  for(const f of Array.from(list)){
    if(!isDocx(f)){rej.push(/\.doc$/i.test(f.name)?f.name+': file .doc (định dạng cũ) — cần lưu lại thành .docx':f.name+': không phải .docx');continue}
    fl.push({name:f.name,size:f.size,buf:await f.arrayBuffer()})}
  after();setSt(msgId,rej.join(' · '),rej.length?'e':'')}
function listHTML(a,mv){return a.map((f,i)=>'<div class="frow"><span>📄</span><span class="fnm" title="'+hx(f.name)+'">'+hx((mv?(i+1)+'. ':'')+f.name)+'</span><span class="fsz">'+fmtSize(f.size)+'</span>'+
  (mv?'<button class="sec sm" type="button" data-a="u" data-i="'+i+'">▲</button><button class="sec sm" type="button" data-a="d" data-i="'+i+'">▼</button>':'')+'<button class="sec sm" type="button" data-a="x" data-i="'+i+'">✕</button></div>').join('')}
function wire(box,inp,btn,clr,arr,rend,msg){
  btn.onclick=()=>inp.click();
  inp.onchange=()=>{addFiles(inp.files,arr,msg,rend);inp.value=''};
  clr.onclick=()=>{arr.length=0;rend()};
  ['dragover','drop'].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();if(ev==='drop')addFiles(e.dataTransfer.files,arr,msg,rend)}));
}
const mq=[];
function rM(){g('wtMList').innerHTML=listHTML(mq,true)}
g('wtMList').onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i,a=b.dataset.a;
  if(a==='x')mq.splice(i,1);else{const j=a==='u'?i-1:i+1;if(j<0||j>=mq.length)return;[mq[i],mq[j]]=[mq[j],mq[i]]}rM()};
/* mặc định tự bật: chuẩn hóa định dạng (Norm) + sửa chữ (Txt) + bảng (Tbl) + thụt lề (Ind) + dấu chấm cuối đoạn (Dot) */
['Norm','Txt','Tbl','Ind','Dot'].forEach(k=>{const e=g('wtM'+k);if(e&&e.type==='checkbox')e.checked=true});
wire(g('wtMerge'),g('wtMIn'),g('wtMPick'),g('wtMClear'),mq,rM,'wtMSt');
const PDFNOTE='PDF dựng dạng ảnh (không chọn/sao chép được chữ), chỉ giữ chữ đậm/nghiêng/gạch chân, căn lề, cỡ chữ và bảng; không giữ ảnh chèn trong file.';
async function pdfOf(docXml,st){return blocksToPdfBytes(docxToBlocks(docXml).blocks,(p,n)=>setSt(st,'Đang tạo PDF, trang '+p+'/'+n+'...'))}
g('wtMRun').onclick=async()=>{
  const out=g('wtMOut'),btn=g('wtMRun');out.innerHTML='';
  if(mq.length<2)return setSt('wtMSt','Cần ít nhất 2 file .docx để ghép.','e');
  if(typeof JSZip==='undefined')return setSt('wtMSt','Chưa tải được thư viện JSZip (cần mạng để tải từ cdnjs).','e');
  const tot=mq.reduce((a,f)=>a+f.size,0);
  if(tot>1e8&&!confirm('Tổng dung lượng '+fmtSize(tot)+' (>100 MB), có thể chậm hoặc hết bộ nhớ. Vẫn tiếp tục?'))return;
  let cfg;try{cfg=readCfg('wtM')}catch(e){return setSt('wtMSt',e.message,'e')}
  let nm=(g('wtMName').value.trim()||'ghep.docx').replace(/[\\/:*?"<>|]/g,'_');if(!/\.docx$/i.test(nm))nm+='.docx';
  const fm=g('wtMFmt').value;btn.disabled=true;
  try{
    const r=await merge(mq,{brk:g('wtMBrk').checked,norm:g('wtMNorm').checked,cfg},(i,n,m)=>setSt('wtMSt','Đang ghép file '+i+'/'+n+(m?' — '+m:'')+'...'));
    const res=[];
    if(fm!=='pdf')res.push({name:nm,mime:MD,data:r.data});
    if(fm!=='docx')res.push({name:nm.replace(/\.docx$/i,'')+'.pdf',mime:'application/pdf',data:await pdfOf(r.docXml,'wtMSt')});
    const row=document.createElement('div');row.className='note';
    row.textContent='✅ Đã ghép '+mq.length+' file (đã qua bước tự kiểm tra cấu trúc).';
    res.forEach(m=>{const b=document.createElement('button');b.className='green sm';b.type='button';b.textContent='⬇ '+m.name;b.onclick=()=>dl(m.name,m.data,m.mime);row.appendChild(document.createTextNode(' '));row.appendChild(b)});
    out.appendChild(row);
    if(r.rep.info&&r.rep.info.length){const d=document.createElement('div');d.className='note';d.textContent='🛠 Đã tự sửa — '+r.rep.info.join(' · ');out.appendChild(d)}
    const w=[];r.warns.forEach((a,k)=>a.forEach(x=>w.push(mq[k+1].name+': '+x)));r.rep.warn.forEach(x=>w.push(x));
    if(w.length){const d=document.createElement('div');d.className='note';d.innerHTML='⚠ '+w.map(hx).join('<br>⚠ ');out.appendChild(d)}
    setSt('wtMSt','Xong. '+(fm!=='docx'?PDFNOTE:''),'o');
  }catch(e){setSt('wtMSt','❌ '+e.message,'e')}
  btn.disabled=false};
})();
