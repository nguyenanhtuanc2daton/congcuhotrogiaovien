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
  if(LANGVI&&rPr.parentNode&&rPr.parentNode.localName==='r'){const l=one(rPr,'lang');if(l){sa(l,'val','vi-VN');sa(l,'eastAsia','vi-VN')}}   /* web hay gắn en-US → gạch đỏ chính tả */
  ['spacing','w','fitText','eastAsianLayout'].forEach(n=>{const e=one(rPr,n);if(e)rPr.removeChild(e)});   /* bỏ giãn/co chữ gây khoảng cách không đều */
  if(CLEAN&&rPr.parentNode&&rPr.parentNode.localName==='r'){   /* nền/màu rác khi dán từ web */
    const had=['highlight','shd'].map(n=>{const e=one(rPr,n);if(e)rPr.removeChild(e);return !!e}).some(Boolean);
    const c=one(rPr,'color');if(c){const v=ga(c,'val');if(/^(0563C1|0000FF|0000EE|1155CC|0066CC)$/i.test(v)||(had&&/^FFFFFF$/i.test(v))||(/^([0-9A-F]{2})\1\1$/i.test(v)&&parseInt(v.slice(0,2),16)<=128))rPr.removeChild(c)}
    const rs=one(rPr,'rStyle');if(rs&&/hyperlink/i.test(ga(rs,'val'))){rPr.removeChild(rs);const u=one(rPr,'u');if(u)rPr.removeChild(u)}}}
function fixStyles(d){const root=d.documentElement;let dd=one(root,'docDefaults');
  if(!dd){dd=mk(d,'docDefaults');root.insertBefore(dd,root.firstChild)}
  let rd=one(dd,'rPrDefault');if(!rd){rd=mk(d,'rPrDefault');dd.insertBefore(rd,dd.firstChild)}
  if(!one(rd,'rPr'))rd.appendChild(mk(d,'rPr'));
  if(LANGVI){const l=sc(d,one(rd,'rPr'),'lang',ORD.rPr);sa(l,'val','vi-VN');sa(l,'eastAsia','vi-VN')}}   /* ngôn ngữ kiểm tra chính tả = tiếng Việt */
const KEEPEL=['drawing','pict','br','object','sym','fldChar','fldSimple','sectPr','footnoteReference','endnoteReference','commentReference','ptab'];
const isEmpty=p=>p.localName==='p'&&p.namespaceURI===W&&!all(p,'t').some(t=>t.textContent.trim())&&!KEEPEL.some(n=>p.getElementsByTagNameNS(W,n).length)&&!p.getElementsByTagNameNS(MNS,'oMath').length&&!p.getElementsByTagNameNS(MNS,'oMathPara').length&&!hasBM(p);

function hasBM(p){return all(p,'bookmarkStart').some(b=>ga(b,'name')!=='_GoBack')}
const PHK=/^(chương|phần|phụ lục|chapter|part|appendix)\s+[\divxlc]+(?![\p{L}\p{N}])/iu;
/* tiêu đề "giả" (copy từ web mất style): đoạn ngắn, in đậm hoặc viết hoa hết, không kết thúc bằng dấu câu → trả về cấp 0-3, không phải tiêu đề → -1 */
function pseudoHead(p){
  if(anc(p,'tc'))return -1;
  const rs=Array.from(p.getElementsByTagNameNS(W,'r')).filter(r=>all(r,'t').some(t=>t.textContent.trim()));
  if(!rs.length)return -1;
  const tx=rs.map(r=>all(r,'t').map(t=>t.textContent).join('')).join('').replace(/\s+/g,' ').trim();
  if(tx.length<3||tx.length>100||/[.,;:!?…]$/.test(tx))return -1;
  const bold=rs.every(r=>{const rp=one(r,'rPr'),b=rp&&one(rp,'b');return !!b&&!/^(0|false|off)$/.test(ga(b,'val'))}),
    caps=!/\p{Ll}/u.test(tx)&&(tx.match(/\p{Lu}/gu)||[]).length>=3;
  if(!bold&&!caps)return -1;
  if(PHK.test(tx))return 0;
  if(/^[IVXLC]+[.)]\s/.test(tx)||/^mục\s/i.test(tx))return 1;
  if(/^\d+(?:\.\d+){1,3}[.)]?\s/.test(tx))return Math.min(3,1+tx.match(/^\d+(?:\.\d+)*/)[0].split('.').length);
  if(/^(?:\d+[.)]|điều\s+\d+)\s*/i.test(tx))return 2;
  return caps?1:2}
function pinfo(p,pPr){const st=pPr&&one(pPr,'pStyle'),sv=st?ga(st,'val'):'',je=pPr&&one(pPr,'jc'),jc=je?ga(je,'val'):'';
  const img=!!(p.getElementsByTagNameNS(W,'drawing').length||p.getElementsByTagNameNS(W,'pict').length)&&!all(p,'t').some(t=>t.textContent.trim());
  const lst=!!(pPr&&one(pPr,'numPr'))||/list|bullet|number|danh/i.test(sv),sh=/head|title|tiêu/i.test(sv)||!!(pPr&&one(pPr,'outlineLvl')),lv=HEADON&&!lst&&!sh&&!img?pseudoHead(p):-1;
  return {sv,jc,img,inTc:!!anc(p,'tc'),lv,
    list:lst,
    head:sh||lv>=0,
    keep:jc==='center'||jc==='right'||jc==='end'||img}}
let CLEAN=true,LANGVI=true,HEADON=true;
const isP=c=>c.localName==='p'&&c.namespaceURI===W;
const RI=['hanging','hangingChars','firstLine','firstLineChars','left','leftChars','start','startChars','right','rightChars','end','endChars'];
const CM=['top','start','left','bottom','end','right'];
const CELLJ=/^(both|distribute|thaiDistribute|)$/;

/* ===== Định dạng: lề, giãn dòng, thụt dòng, căn đều, bảng biểu ===== */
function floatToInline(body,rep){
  const WP='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',PIC='http://schemas.openxmlformats.org/drawingml/2006/picture';let n=0;
  Array.from(body.getElementsByTagNameNS(WP,'anchor')).forEach(an=>{
    if(an.getAttribute('behindDoc')==='1'||anc(an,'txbxContent'))return;
    const par=an.parentNode;if(!par||par.localName!=='drawing'||par.namespaceURI!==W)return;
    const kid=nm=>Array.from(an.children).find(c=>c.localName===nm&&c.namespaceURI===WP),gr=Array.from(an.children).find(c=>c.localName==='graphic');
    if(!gr||!gr.getElementsByTagNameNS(PIC,'pic').length||!kid('extent')||!kid('docPr'))return;
    const il=an.ownerDocument.createElementNS(WP,'wp:inline');['distT','distB','distL','distR'].forEach(a=>il.setAttribute(a,'0'));
    ['extent','effectExtent','docPr','cNvGraphicFramePr'].forEach(nm=>{const e=kid(nm);if(e)il.appendChild(e)});
    il.appendChild(gr);par.replaceChild(il,an);n++});
  if(n)rep.floats=n;
  const left=Array.from(body.getElementsByTagNameNS(WP,'anchor')).length;
  if(left)rep.warn.push(left+' hình/khung nổi (hình vẽ, khung văn bản, ảnh nền…) chưa chuyển về cùng dòng: hãy kiểm tra vị trí')}
function docNorm(d,cfg,rep){
  const body=d.getElementsByTagNameNS(W,'body')[0];if(!body)return;
  const bk=Array.from(body.children),secs=[];
  const fin=()=>{let s=one(body,'sectPr');if(!s){s=mk(d,'sectPr');body.appendChild(s)}return s};
  bk.forEach((c,i)=>{if(c.localName==='p'){const pp=one(c,'pPr'),s=pp&&one(pp,'sectPr');if(s)secs.push({end:i,sp:s})}});
  secs.push({end:bk.length,sp:fin()});
  secs.forEach(s=>{const sp=s.sp,z=sc(d,sp,'pgSz',ORD.sectPr);{const dg=one(sp,'docGrid');if(dg)sp.removeChild(dg)}
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
    const {inTc,list,head,keep,jc,img,lv}=pinfo(p,pPr);
    const sp=sc(d,pPr,'spacing',ORD.pPr);
    ['beforeLines','afterLines','beforeAutospacing','afterAutospacing'].forEach(a=>sp.removeAttributeNS(W,a));
    sa(sp,'before',head&&!inTc?120:0);sa(sp,'after',inTc?0:120);sa(sp,'line',276);sa(sp,'lineRule','auto');
    const cs=one(pPr,'contextualSpacing');if(cs)pPr.removeChild(cs);   /* làm mất khoảng cách giữa các đoạn cùng kiểu */
    {const fp=one(pPr,'framePr');if(fp&&!ga(fp,'dropCap'))pPr.removeChild(fp)}   /* khung định vị khi dán từ web */
    if(CLEAN){if(!inTc){const sh=one(pPr,'shd');if(sh)pPr.removeChild(sh)}
      if(!inTc&&!head&&!keep){const _t=p.textContent.trim(),_n=p.nextElementSibling,_nt=_n&&isP(_n)?_n.textContent.trim():'',
          _qs=/^(Câu|CÂU|Bài|BÀI)\s*\d+/,_keepQ=_qs.test(_t)&&!!_n&&!_qs.test(_nt)&&_nt.length>0;   /* câu hỏi đi cùng đáp án ngay sau; các câu liền nhau thì KHÔNG dính nhau */
        ['keepNext','keepLines'].forEach(n=>{const e=one(pPr,n);if(e&&!(_keepQ&&n==='keepNext'))pPr.removeChild(e)});   /* giữ-với-đoạn-sau từ web gây trống cả trang */
        if(!list){const e=one(pPr,'pBdr');if(e)pPr.removeChild(e)}}   /* khung viền đoạn (blockquote/hộp web) */                /* nền đoạn từ web */
      ['snapToGrid','autoSpaceDE','autoSpaceDN'].forEach(n=>sa(sc(d,pPr,n,ORD.pPr),'val',0))}   /* tắt lưới/khoảng cách tự động gây giãn không đều */
    if(head&&!inTc)sc(d,pPr,'keepNext',ORD.pPr);
    if(lv>=0&&!inTc&&!keep&&!one(pPr,'outlineLvl')){sa(sc(d,pPr,'outlineLvl',ORD.pPr),'val',lv);rep.heads=(rep.heads||0)+1}   /* cho hiện trong Navigation Pane */                         /* tiêu đề không bị rớt cuối trang */
    const setInd=(first,zero)=>{const ind=sc(d,pPr,'ind',ORD.pPr);
      RI.forEach(a=>{if(zero||/hanging|firstLine/.test(a))ind.removeAttributeNS(W,a)});
      if(zero){sa(ind,'left',0);sa(ind,'right',0)}sa(ind,'firstLine',first)};
    if(img&&!inTc&&cfg.img!==false){sa(sc(d,pPr,'jc',ORD.pPr),'val','center');setInd(0,true)}   /* ảnh đứng riêng: căn giữa, không thụt */
    else if(!inTc&&!list&&!head&&!keep){
      sa(sc(d,pPr,'jc',ORD.pPr),'val','both');setInd(567,cfg.ind!==false)}
    else if(inTc&&!list&&cfg.tbl!==false){
      setInd(0,true);                                                   /* ô bảng: không thụt đầu dòng */
      if(CELLJ.test(jc)){const tr=anc(p,'tr'),tb=tr&&anc(tr,'tbl'),first=!!tb&&wk(tb,'tr')[0]===tr,t=p.textContent.trim();
        sa(sc(d,pPr,'jc',ORD.pPr),'val',first||/^[\d\s.,%+\-–\/]{1,15}$/.test(t)?'center':'left')}}
    const ts=all(p,'t');
    for(const t of ts){const v=t.textContent.replace(/^[\s\u00a0]+/,'');if(v!==t.textContent)t.textContent=v;if(v)break}
    for(const t of ts.slice().reverse()){const v=t.textContent.replace(/[\s\u00a0]+$/,'');if(v!==t.textContent)t.textContent=v;if(v)break}
  });
  /* Chốt an toàn: cắt chuỗi "giữ với đoạn sau" quá dài (>8 đoạn liên tiếp) — nguyên nhân khoảng trống lớn cuối trang */
  {let run=[];const flush=()=>{if(run.length>8)run.forEach(q=>{const nq=q.nextElementSibling,pp=one(q,'pPr'),kn=pp&&one(pp,'keepNext');
      if(kn&&nq&&isP(nq)&&/^(Câu|CÂU|Bài|BÀI)\s*\d+/.test(nq.textContent.trim()))pp.removeChild(kn)});run=[]};
    Array.from(body.children).forEach(q=>{const pp=isP(q)&&one(q,'pPr');if(pp&&one(pp,'keepNext'))run.push(q);else flush()});flush()}
  if(cfg.img!==false)floatToInline(body,rep);   /* ảnh trôi nổi từ web đè lên chữ */
  if(cfg.img!==false){const mx=Math.min(...secs.map(s=>s.aw))*635,k=[0];   /* twip → EMU */
    const WP='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',A='http://schemas.openxmlformats.org/drawingml/2006/main';
    Array.from(body.getElementsByTagNameNS(WP,'inline')).forEach(il=>{
      const ex=il.getElementsByTagNameNS(WP,'extent')[0];if(!ex||anc(il,'tc'))return;
      const cx=+ex.getAttribute('cx'),cy=+ex.getAttribute('cy');if(!(cx>mx&&mx>0))return;
      const f=mx/cx;ex.setAttribute('cx',Math.floor(cx*f));ex.setAttribute('cy',Math.floor(cy*f));
      Array.from(il.getElementsByTagNameNS(A,'ext')).forEach(e=>{if(+e.getAttribute('cx')===cx){e.setAttribute('cx',Math.floor(cx*f));e.setAttribute('cy',Math.floor(+e.getAttribute('cy')*f))}});
      k[0]++});
    if(k[0])rep.imgs=k[0]}
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
      ['tblCellSpacing','tblpPr'].forEach(n=>{const e=one(pr,n);if(e)pr.removeChild(e)});   /* khe hở giữa ô, bảng trôi nổi */
      [['top',40],['left',108],['bottom',40],['right',108]].forEach(([n,v])=>{const e=sc(d,cm,n,CM);sa(e,'w',v);sa(e,'type','dxa')});
      const ncol=Math.max(0,...rows.map(r=>wk(r,'tc').length));
      if(!one(pr,'tblBorders')&&!one(pr,'tblStyle')&&!all(tbl,'tcBorders').length&&rows.length>=3&&ncol>=2){
        const b=sc(d,pr,'tblBorders',ORD.tblPr);
        ['top','left','bottom','right','insideH','insideV'].forEach(n=>{const e=mk(d,n);sa(e,'val','single');sa(e,'sz',4);sa(e,'space',0);sa(e,'color','auto');b.appendChild(e)});
        rep.borders=(rep.borders||0)+1}
      rows.forEach((tr,ri)=>{
        {const tcs=wk(tr,'tc');if(tcs.length&&tcs.every(tc=>!tc.textContent.trim()&&!tc.getElementsByTagNameNS(W,'drawing').length))rep.blankRows=(rep.blankRows||0)+1}
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
const REF=/\[(?:\d{1,3}(?:\s*[-–,]\s*\d{1,3})*|(?:cần |cần dẫn |cần có )?nguồn[^\]]{0,20}|cần làm rõ|chỉnh sửa|sửa(?: ?\| ?sửa mã nguồn)?|edit|citation needed|source needed)\]/giu;
const TONE=/(?<![qQ])([oOuU])([àáảãạèéẻẽẹýỳỷỹỵÀÁẢÃẠÈÉẺẼẸÝỲỶỸỴ])(?![\p{L}])/gu;
const TMAP={à:'òa',á:'óa',ả:'ỏa',ã:'õa',ạ:'ọa',è:'òe',é:'óe',ẻ:'ỏe',ẽ:'õe',ẹ:'ọe',ý:'úy',ỳ:'ùy',ỷ:'ủy',ỹ:'ũy',ỵ:'ụy'};
const toneFix=m=>{const a=m[1],b=m[2],lb=b.toLowerCase(),y='ýỳỷỹỵ'.includes(lb);if((a.toLowerCase()==='u')!==y)return null;const r=TMAP[lb];return b===lb?r:r.toUpperCase()};
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
  if(cfg.emoji!==false)ed(/(?:[\u{1F000}-\u{1FAFF}]|[\u2600-\u260F\u2613-\u26FF]|[\u2700-\u2712\u2715-\u27BF]|[\u2B50\u2B55])[\uFE0F\u200D]*/gu,'','emoji/biểu tượng từ web');
  ed(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u00AD\u180E\uFE0F\u20E3]/g,'','ký tự ẩn/rác');
  ed(/[\u2010\u2011\u2012\u2212\uFE63]/g,'-','gạch nối/dấu trừ lạ → gạch nối');ed(/\u2015/g,'–','gạch nối/dấu trừ lạ → gạch nối');
  ed(/[\u201E\u201F]/g,'“','nháy kép lạ → nháy cong');
  if(cfg.ref!==false)ed(REF,m=>m.index>0?'':null,'số chú thích/[sửa] của web ([1], [cần nguồn])');
  if(!info.inTc)ed(/^[\s\-_=*~–—•·]{5,}$/g,'','dòng kẻ phân cách từ web');
  if(cfg.junk!==false&&!info.inTc&&!info.head)ed(JUNK,'','dòng giao diện web thừa (Xem thêm, Chia sẻ…) đã xóa');
  if(cfg.tone===true)ed(TONE,toneFix,'bỏ dấu kiểu cũ → mới (hoà → hòa)');
  ed(/[\uFF01-\uFF5E]/g,m=>String.fromCharCode(m[0].charCodeAt(0)-0xFEE0),'ký tự full-width → thường');
  ed(/\u3002/g,'.','ký tự full-width → thường');ed(/\u3001/g,',','ký tự full-width → thường');
  ed(/[\uFB00-\uFB06]/g,m=>m[0].normalize('NFKC'),'chữ ghép của PDF (ﬁ → fi)');
  ed(/^[\u2022\u00B7\u25CF\u25AA\u25A0\u25A1\u25CB\u25E6\u2023\u2043\uF0B7\uF0A7\uF0D8\uF076\uF0FC]\s*(?=\S)/gu,()=>info.list?null:'- ','ký hiệu đầu dòng lạ → gạch đầu dòng');
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
  if(!info.inTc&&!info.keep){let n=0;const dd=()=>items.dead=items.dead||[];   /* ngắt dòng/Tab thừa đầu-cuối đoạn */
    while(items.length&&items[items.length-1].pl){dd().push(items.pop().el);n++}
    while(items.length&&items[0].pl){dd().push(items.shift().el);n++}
    if(!info.list&&!info.head)while(items.length&&items[0].c==='\t'&&items[0].el){dd().push(items.shift().el);n++}
    if(n)bump('ngắt dòng/Tab thừa đầu-cuối đoạn đã xóa',n)}
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
    if(w.length<2)return null;   /* a) b) … là ký hiệu mục, không viết hoa */
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
  {const t0=str().replace(/[\s”"’')\]]+$/u,'');items.end=t0?t0[t0.length-1]:'';items.len=t0.length}
  /* 6. dấu chấm cuối đoạn văn */
  if(cfg.dot!==false&&!info.inTc&&!info.list&&!info.head&&!info.keep){
    const s=str(),words=(s.match(/\p{L}+/gu)||[]).length,last=items[items.length-1];
    if(s.length>=60&&words>=8&&last&&last.n>=0&&/[\p{L}\p{N})\]”"’']$/u.test(s)&&!/[.!?…][)\]”"’']$/.test(s)&&/\p{Ll}/u.test(s)&&!/(?:https?:\/\/|www\.)\S+$|\S@\S+$/i.test(s)){
      items.push({c:'.',n:last.n});items.open=true;bump('thêm dấu chấm cuối đoạn',1)}}
  /* 7. cảnh báo các chỗ không rõ nghĩa (không tự sửa vì có thể đổi ý) */
  const s=str(),s2=s.replace(PROT,' ');
  items.broken=broken;
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
  if(/[\uE000-\uF8FF]/.test(s))note('Ký tự biểu tượng lạ (có thể hiện thành ô vuông)',s);
  if(!info.inTc&&s.length<120&&/^(?:xem thêm|đọc thêm|tin liên quan|bài liên quan|bài viết liên quan|quảng cáo|chia sẻ|bình luận|theo dõi|từ khóa|nguồn tin|tags?|tin cùng chuyên mục|tin mới nhất|tin nổi bật|đăng nhập|đăng ký|trang chủ|liên hệ|bản quyền|copyright|all rights reserved|facebook|twitter|zalo|in bài|gửi email|lượt xem|đọc tiếp|xem tất cả|ý kiến bạn đọc|tải thêm|cookie|©)(?!\p{L})/iu.test(s))note('Có thể là phần thừa của trang web (xem thêm, quảng cáo…)',s);
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
    if(!nodes.length){if(items.length&&!info.inTc&&!info.keep&&items.every(x=>x.pl)){items.forEach(x=>x.el.parentNode&&x.el.parentNode.removeChild(x.el));cnt['ngắt dòng/Tab thừa đầu-cuối đoạn đã xóa']=(cnt['ngắt dòng/Tab thừa đầu-cuối đoạn đã xóa']||0)+items.length}prev.set(par,null);continue}
    const lb=tag+'đoạn '+idx,pv=prev.get(par),body=!info.inTc&&!info.list&&!info.head&&!info.keep;
    const s=fixPara(items,info,pv,cnt,cfg,notes,lb);
    flush(nodes,items);
    if(cfg.join!==false&&items.broken&&pv&&pv.body&&body&&pv.p.parentNode===par&&!(pPr&&one(pPr,'sectPr'))&&!pv.p.getElementsByTagNameNS(W,'sectPr').length){
      /* ghép đoạn bị ngắt giữa câu (copy từ web/PDF) vào đoạn trước */
      if(pv.open&&pv.last)pv.last.textContent=pv.last.textContent.replace(/\.$/,'');
      const r=mk(d,'r'),t=mk(d,'t');t.setAttributeNS(XMLNS,'xml:space','preserve');t.textContent=' ';r.appendChild(t);pv.p.appendChild(r);
      Array.from(p.children).forEach(c=>{if(!(c.localName==='pPr'&&c.namespaceURI===W))pv.p.appendChild(c)});
      par.removeChild(p);
      const bi=notes.findIndex(x=>x.p===lb&&/ngắt giữa câu/.test(x.k));if(bi>=0)notes.splice(bi,1);
      cnt['đoạn bị ngắt giữa câu đã ghép lại']=(cnt['đoạn bị ngắt giữa câu đã ghép lại']||0)+1;
      prev.set(par,{end:items.end,len:pv.len+s.length,open:!!items.open,last:nodes[nodes.length-1],p:pv.p,body:true,t:pv.t+' '+s});
      continue}
    if(pv&&pv.t&&s.length>=20&&pv.t===s)notes.push({k:'Đoạn lặp lại y hệt đoạn trước (copy 2 lần?)',p:lb,s:s.slice(0,40)});
    prev.set(par,items.end?{end:items.end,len:items.len,open:!!items.open,last:nodes[nodes.length-1],p,body,t:s}:null)}}

/* ===== Font cũ TCVN3 (.VnTime…) và VNI (VNI-Times…) → Unicode ===== */
const TCU='àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ';
const TCC=[0xB5,0xB8,0xB6,0xB7,0xB9,0xA8,0xBB,0xBE,0xBC,0xBD,0xC6,0xA9,0xC7,0xCA,0xC8,0xC9,0xCB,0xAE,0xCC,0xD0,0xCE,0xCF,0xD1,0xAA,0xD2,0xD5,0xD3,0xD4,0xD6,0xD7,0xDD,0xD8,0xDC,0xDE,0xDF,0xE3,0xE1,0xE2,0xE4,0xAB,0xE5,0xE8,0xE6,0xE7,0xE9,0xAC,0xEA,0xED,0xEB,0xEC,0xEE,0xEF,0xF3,0xF1,0xF2,0xF4,0xAD,0xF5,0xF8,0xF6,0xF7,0xF9,0xFA,0xFD,0xFB,0xFC,0xFE];
const TCM={};TCC.forEach((c,k)=>{TCM[String.fromCharCode(c)]=TCU[k]});
'ĂÂÊÔƠƯĐ'.split('').forEach((c,k)=>{TCM[String.fromCharCode(0xA1+k)]=c});
const fromTC=(s,up)=>{let o='';for(const c of s)o+=TCM[c]||c;o=o.normalize('NFC');return up?o.toUpperCase():o};
const VS={'ñ':'đ','Ñ':'Đ','æ':'ỉ','Æ':'Ỉ','ó':'ĩ','Ó':'Ĩ','ò':'ị','Ò':'Ị','ô':'ơ','Ô':'Ơ','ö':'ư','Ö':'Ư'};
const VT={'ù':'\u0301','ø':'\u0300','û':'\u0309','õ':'\u0303','ï':'\u0323'};
const VC={'á':'\u0302\u0301','à':'\u0302\u0300','å':'\u0302\u0309','ã':'\u0302\u0303','ä':'\u0302\u0323','é':'\u0306\u0301','è':'\u0306\u0300','ú':'\u0306\u0309','ü':'\u0306\u0303','ë':'\u0306\u0323'};
function fromVNI(s){const u=[];
  for(const c of s){const l=c.toLowerCase(),last=u[u.length-1],b=last&&!last.m?last.b.toLowerCase():'';
    if(VS[c]){u.push({b:VS[c],m:''});continue}
    if(VT[l]&&/[aeouyơư]/.test(b)){last.m=VT[l];continue}
    if(l==='â'&&/[aeo]/.test(b)){last.m='\u0302';continue}
    if(l==='ê'&&b==='a'){last.m='\u0306';continue}
    if(VC[l]){const circ=/[áàåãä]/.test(l);if(circ?/[aeo]/.test(b):b==='a'){last.m=VC[l];continue}}
    u.push({b:c,m:''})}
  return u.map(x=>x.b+x.m).join('').normalize('NFC')}
function legacyFonts(d){let n=0;
  all(d,'r').forEach(r=>{const rp=one(r,'rPr'),f=rp&&one(rp,'rFonts');if(!f)return;
    const nm=ga(f,'ascii')||ga(f,'hAnsi')||ga(f,'cs')||'',tc=/^\.vn/i.test(nm),vn=/^vni[- ]/i.test(nm);if(!tc&&!vn)return;
    const up=tc&&/^\.vn.*h$/i.test(nm);   /* .VnTimeH… = font chữ hoa */
    all(r,'t').forEach(t=>{const v=tc?fromTC(t.textContent,up):fromVNI(t.textContent);
      if(v!==t.textContent){t.textContent=v;if(/^\s|\s$/.test(v))t.setAttributeNS(XMLNS,'xml:space','preserve')}});n++});
  return n}
/* ===== Chữ ẩn (hidden) của web ===== */
function dropHidden(d){let n=0;
  all(d,'r').forEach(r=>{const rp=one(r,'rPr'),v=rp&&one(rp,'vanish');if(!v||/^(0|false|off)$/.test(ga(v,'val')))return;
    if(r.getElementsByTagNameNS(W,'fldChar').length||r.getElementsByTagNameNS(W,'instrText').length||!all(r,'t').length)return;
    r.parentNode.removeChild(r);n++});
  return n}
/* ===== Danh sách đánh số ===== */
function numMap(nd){const abs={},num={};
  all(nd,'abstractNum').forEach(a=>{const l={};wk(a,'lvl').forEach(v=>{const f=one(v,'numFmt'),t=one(v,'lvlText');l[ga(v,'ilvl')]=(f?ga(f,'val'):'')+'|'+(t?ga(t,'val'):'')});abs[ga(a,'abstractNumId')]=l});
  all(nd,'num').forEach(x=>{const a=one(x,'abstractNumId');num[ga(x,'numId')]=a?ga(a,'val'):''});
  return {abs,num}}
/* web dán từng mục thành danh sách riêng → mỗi mục đều "1." : nối các mục liền nhau cùng kiểu về một danh sách để đánh số liên tục */
function mergeLists(d,nm){if(!nm)return 0;let n=0;
  const sig=(id,lv)=>{const a=nm.num[id];return (a&&nm.abs[a]&&nm.abs[a][lv])||''};
  [d.getElementsByTagNameNS(W,'body')[0]].concat(all(d,'tc')).forEach(ct=>{if(!ct)return;let run=null;
    Array.from(ct.children).forEach(c=>{
      const pp=isP(c)?one(c,'pPr'):null,np=pp&&one(pp,'numPr'),ni=np&&one(np,'numId'),il=np&&one(np,'ilvl'),id=ni?ga(ni,'val'):'';
      if(!id||id==='0'){run=null;return}
      if(!run){run=id;return}
      if(id===run)return;
      const lv=il?ga(il,'val'):'0',a=sig(run,lv),b=sig(id,lv);
      if(a&&a===b&&!/^(bullet|none)\|/.test(a)){sa(ni,'val',run);n++}else run=id})});
  return n}
/* số thứ tự gõ tay liền nhau bị trùng/nhảy (1. 1. 1. hoặc 1. 2. 4.) → đánh lại liên tục */
function renumber(d){let n=0;
  [d.getElementsByTagNameNS(W,'body')[0]].concat(all(d,'tc')).forEach(ct=>{if(!ct)return;let grp=[];
    const fl=()=>{if(grp.length>=3&&grp.some((g,i)=>i&&g.v!==grp[i-1].v+1)){
      grp.forEach((g,i)=>{const nv=grp[0].v+i;if(g.v===nv)return;
        for(let k=0;k<g.len;k++)if(g.items[g.off+k].n<0)return;
        g.items[g.off].c=String(nv);for(let k=1;k<g.len;k++)g.items[g.off+k].c='';
        flush(g.nodes,g.items);n++})}
      grp=[]};
    Array.from(ct.children).forEach(c=>{
      if(!isP(c)){fl();return}
      const pp=one(c,'pPr'),st=pp&&one(pp,'pStyle');
      if((st&&/toc|mục ?lục/i.test(ga(st,'val')))||(pp&&one(pp,'numPr'))||tocSdt(c)){fl();return}
      const {items,nodes}=collect(c),s=items.map(x=>x.c).join(''),m=/^(\s*)(\d{1,3})([.)])(?=\s)/.exec(s);
      if(!m){fl();return}
      if(grp.length&&grp[grp.length-1].d!==m[3])fl();
      grp.push({v:+m[2],d:m[3],items,nodes,off:m[1].length,len:m[2].length})});
    fl()});
  return n}
const JUNK=/^\s*(?:xem thêm|đọc thêm|tin liên quan|bài liên quan|bài viết liên quan|quảng cáo|chia sẻ|bình luận|theo dõi|từ khóa|tags?|in bài|gửi email|đọc tiếp|xem tất cả|tải thêm|lượt xem|sao chép liên kết|copy link|advertisement|share|print)\s*:?\s*$/giu;

const NDEF={t:20,b:20,l:30,r:15,txt:true,tbl:true,ind:true,dot:true,clean:true,join:true,img:true,lang:true,emoji:true,ref:true,tone:false,head:true,num:true,hid:true,junk:true};
async function norm(zip,cfg){
  cfg=Object.assign({},NDEF,cfg||{});CLEAN=cfg.clean!==false;LANGVI=cfg.lang!==false;HEADON=cfg.head!==false;
  const rep={paras:0,tables:0,warn:[],info:[]},cnt={},notes=[];
  const NM=zip.file('word/numbering.xml')?numMap(pX(await zip.file('word/numbering.xml').async('string'),'numbering.xml')):null;
  for(const n of Object.keys(zip.files).filter(n=>/^word\/(document|styles|numbering|footnotes|endnotes|header\d*|footer\d*)\.xml$/.test(n))){
    const d=pX(await zip.file(n).async('string'),n);
    if(/styles\.xml$/.test(n))fixStyles(d);
    {const lg=legacyFonts(d);if(lg)cnt['chữ font cũ (TCVN3/VNI) đã đổi sang Unicode']=(cnt['chữ font cũ (TCVN3/VNI) đã đổi sang Unicode']||0)+lg}
    if(cfg.hid!==false&&/^word\/(document|footnotes|endnotes|header\d*|footer\d*)\.xml$/.test(n)){const hd=dropHidden(d);if(hd)cnt['đoạn chữ ẩn của web đã xóa']=(cnt['đoạn chữ ẩn của web đã xóa']||0)+hd}
    all(d,'rPr').forEach(r=>fixR(d,r));
    if(CLEAN&&n==='word/document.xml')all(d,'hyperlink').forEach(h=>all(h,'rPr').forEach(r=>['u','color'].forEach(x=>{const e=one(r,x);if(e)r.removeChild(e)})));   /* link: bỏ gạch chân/màu xanh của web */
    if(cfg.txt!==false&&/^word\/(document|footnotes|endnotes|header\d*|footer\d*)\.xml$/.test(n))await fixText(d,n,cfg,cnt,notes);
    if(n==='word/document.xml'){
      if(cfg.num!==false){const a=mergeLists(d,NM),b=cfg.txt!==false?renumber(d):0;
        if(a)cnt['danh sách đánh số bị lặp (1,1,1) đã nối liên tục']=a;if(b)cnt['số thứ tự gõ tay bị trùng/nhảy đã đánh lại']=b}
      const vh=all(d,'vanish').filter(e=>!/^(0|false|off)$/.test(ga(e,'val'))).length;
      if(vh)rep.warn.push(vh+' đoạn chữ bị ẩn (hidden text, thường là phần ẩn của trang web): giữ nguyên, hãy kiểm tra/xóa nếu không cần');
      docNorm(d,cfg,rep)}
    zip.file(n,ser(d),{createFolders:false})}
  if(rep.empty)cnt['đoạn trống thừa đã xóa']=rep.empty;
  if(rep.borders)cnt['bảng thiếu viền đã kẻ viền']=rep.borders;
  if(rep.shrunk)cnt['bảng tràn lề đã co lại']=rep.shrunk;
  if(rep.imgs)cnt['ảnh vượt lề đã thu nhỏ']=rep.imgs;
  if(rep.heads)cnt['dòng tiêu đề mất style đã nhận diện (hiện trong Navigation Pane)']=rep.heads;
  if(rep.floats)cnt['ảnh trôi nổi đã chuyển về cùng dòng']=rep.floats;
  if(rep.blankRows)rep.warn.push(rep.blankRows+' hàng bảng hoàn toàn trống (có thể là hàng đệm của web): giữ nguyên, hãy kiểm tra');
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
  c.txt=ob('Txt',true);c.tbl=ob('Tbl',true);c.ind=ob('Ind',true);c.dot=ob('Dot',true);c.clean=ob('Clean',true);c.join=ob('Join',true);c.img=ob('Img',true);c.lang=ob('Lang',true);c.emoji=ob('Emoji',true);c.ref=ob('Ref',true);c.tone=ob('Tone',false);c.head=ob('Head',true);c.num=ob('Num',true);c.hid=ob('Hid',true);c.junk=ob('Junk',true);return c}
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
/* mặc định tự bật (thêm: Lang, Emoji, Ref; Tone mặc định TẮT): chuẩn hóa định dạng (Norm) + sửa chữ (Txt) + bảng (Tbl) + thụt lề (Ind) + dấu chấm cuối đoạn (Dot) + dọn rác web (Clean) + ghép đoạn ngắt (Join) + ảnh (Img) */
['Norm','Txt','Tbl','Ind','Dot','Clean','Join','Img'].forEach(k=>{const e=g('wtM'+k);if(e&&e.type==='checkbox')e.checked=true});
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
