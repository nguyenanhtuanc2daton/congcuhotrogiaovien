/* Công cụ Word · Đổi công thức MathType (đối tượng OLE "Equation.DSMT*") → Equation gốc của Word (OMML)
   · Đọc file .bin OLE (CFB) → luồng "Equation Native" → giải mã MTEF v5 → dựng OMML.
   · CHỈ chuyển khi đọc hiểu trọn vẹn từng ký hiệu; gặp mẫu lạ/không chắc → trả null (công thức gốc được giữ nguyên, không bao giờ đoán bừa).
   · Dùng: window.MathTypeOle.convert(Uint8Array của oleObjectN.bin) → {xml:'<m:oMath>…</m:oMath>', text:'a ≠ 0'} hoặc null.
   · Nạp TRƯỚC word-ra-soat.js. Không đụng tới chức năng nào khác. */
(function(){
'use strict';
var MNS='http://schemas.openxmlformats.org/officeDocument/2006/math';

/* ---------- 1. Đọc luồng "Equation Native" trong file OLE (Compound File Binary) ---------- */
function u16(b,o){return b[o]|(b[o+1]<<8)}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
function cfbStream(b,want){
  var sig=[0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1];
  for(var i=0;i<8;i++)if(b[i]!==sig[i])return null;
  var ss=1<<u16(b,0x1E),ms=1<<u16(b,0x20),nFat=u32(b,0x2C),dirStart=u32(b,0x30),cutoff=u32(b,0x38),
      mfStart=u32(b,0x3C),nMf=u32(b,0x40),difStart=u32(b,0x44),nDif=u32(b,0x48);
  var sec=function(n){var s=(n+1)*ss;return b.subarray(s,s+ss)};
  var difat=[];for(var k=0;k<109;k++){var v=u32(b,0x4C+k*4);if(v<0xFFFFFFFA)difat.push(v)}
  var ds=difStart,guard=0;
  while(nDif>0&&ds<0xFFFFFFFA&&guard++<64){var d=sec(ds);for(var q=0;q<ss/4-1;q++){var w=u32(d,q*4);if(w<0xFFFFFFFA)difat.push(w)}ds=u32(d,ss-4)}
  var fat=[];difat.slice(0,nFat).forEach(function(n){var d=sec(n);for(var q=0;q<ss/4;q++)fat.push(u32(d,q*4))});
  function chain(start,tbl){var out=[],n=start,g=0;while(n<0xFFFFFFFA&&g++<100000){out.push(n);n=tbl[n]}return out}
  function readBig(start,size){var ch=chain(start,fat),out=new Uint8Array(ch.length*ss);ch.forEach(function(n,i){out.set(sec(n),i*ss)});return size==null?out:out.subarray(0,size)}
  var dir=readBig(dirStart);var ents=[];
  for(var o=0;o+128<=dir.length;o+=128){
    var nl=u16(dir,o+64);if(!nl)continue;var nm='';for(var c=0;c<(nl>>1)-1;c++)nm+=String.fromCharCode(u16(dir,o+c*2));
    ents.push({name:nm,type:dir[o+66],start:u32(dir,o+116),size:u32(dir,o+120)})}
  var root=ents.find(function(e){return e.type===5}),ent=ents.find(function(e){return e.type===2&&e.name===want});
  if(!ent)return null;
  if(ent.size>=cutoff)return readBig(ent.start,ent.size);
  if(!root)return null;
  var mini=readBig(root.start,root.size),mf=[];
  chain(mfStart,fat).slice(0,nMf).forEach(function(n){var d=sec(n);for(var q=0;q<ss/4;q++)mf.push(u32(d,q*4))});
  var ch=chain(ent.start,mf),out=new Uint8Array(ch.length*ms);
  ch.forEach(function(n,i){out.set(mini.subarray(n*ms,n*ms+ms),i*ms)});
  return out.subarray(0,ent.size)}

/* ---------- 2. Giải mã MTEF v5 ---------- */
function fail(m){var e=new Error(m);e.mtef=true;throw e}
function parseMTEF(b){
  var p=0;var u8=function(){if(p>=b.length)fail('hết dữ liệu');return b[p++]};
  var rd16=function(){var a=u8();return a|(u8()<<8)};
  var str=function(){var s='';for(var c=u8();c!==0;c=u8())s+=String.fromCharCode(c);return s};
  if(u8()!==5)fail('không phải MTEF v5');
  u8();u8();u8();u8();str();u8();               /* nền tảng, sản phẩm, phiên bản, khóa ứng dụng, tùy chọn */
  function nudge(){var dx=u8(),dy=u8();if(dx===128&&dy===128)p+=4}
  function nibArr(){var n=u8(),got=0,half=0,cur=b[p];
    /* mỗi phần tử kết thúc bằng nibble 0xF */
    var i=p,hi=true;
    while(got<n){if(i>=b.length)fail('mảng EQN_PREFS bị cụt');var nb=hi?(b[i]>>4)&15:b[i]&15;if(nb===15)got++;if(!hi)i++;hi=!hi}
    if(!hi)i++;p=i}
  function prefs(){u8();nibArr();nibArr();var n=u8();for(var i=0;i<n;i++){if(u8()!==0)u8()}}
  function ruler(){var n=u8();for(var i=0;i<n;i++){u8();rd16()}}
  function objs(){
    var list=[];
    for(;;){
      var tag=u8();
      switch(tag){
        case 0:return list;
        case 1:{var o=u8();if(o&8)nudge();if(o&4)u8();if(o&2){if(u8()!==7)fail('thiếu RULER');ruler()}
          list.push({k:'line',nul:!!(o&1),c:(o&1)?[]:objs()});break}
        case 2:{var o2=u8();if(o2&8)nudge();var tf=u8(),mt=null,c8=null,c16=null;
          if(!(o2&0x20))mt=rd16();if(o2&4)c8=u8();if(o2&0x10)c16=rd16();
          var emb=[];if(o2&1)emb=objs();
          list.push({k:'char',tf:tf>=128?tf-128:tf,mt:mt,c8:c8,c16:c16,emb:emb});break}
        case 3:{var o3=u8();if(o3&8)nudge();var sel=u8(),v=u8();if(v&0x80)v=(v&0x7f)|(u8()<<8);u8();
          list.push({k:'tmpl',sel:sel,v:v,c:objs()});break}
        case 4:{var o4=u8();if(o4&8)nudge();var ha=u8(),va=u8();if(o4&2){if(u8()!==7)fail('thiếu RULER');ruler()}
          list.push({k:'pile',ha:ha,va:va,c:objs()});break}
        case 5:{var o5=u8();if(o5&8)nudge();u8();u8();u8();var rows=u8(),cols=u8();
          p+=Math.ceil((rows+1)*2/8);p+=Math.ceil((cols+1)*2/8);
          list.push({k:'matrix',rows:rows,cols:cols,c:objs()});break}
        case 6:{var o6=u8();if(o6&8)nudge();list.push({k:'emb',t:u8()});break}
        case 8:u8();u8();break;                  /* FONT_STYLE_DEF */
        case 9:{var s1=u8();if(s1===101)p+=2;else if(s1===100)p+=3;else u8();break}   /* SIZE */
        case 10:case 11:case 12:case 13:case 14:break;   /* FULL/SUB/SUB2/SYM/SUBSYM */
        case 15:u8();break;                      /* COLOR */
        case 16:{var oc=u8();p+=(oc&1)?8:6;if(oc&4)str();break}  /* COLOR_DEF */
        case 17:u8();str();break;                /* FONT_DEF */
        case 18:prefs();break;                   /* EQN_PREFS */
        case 19:str();break;                     /* ENCODING_DEF */
        default:fail('bản ghi MTEF lạ: '+tag)}}}
  var top=objs();
  return top}

/* ---------- 3. Dựng OMML ---------- */
var CLS={1:'nor',2:'p',5:'p',7:'bi',8:'p'};   /* kiểu chữ: TEXT, FUNCTION, UCGREEK, VECTOR, NUMBER */
var FENCE={0:['\u27E8','\u27E9'],1:['(',')'],2:['{','}'],3:['[',']'],4:['|','|'],5:['\u2016','\u2016'],6:['\u230A','\u230B'],7:['\u2308','\u2309']};
var ACC={2:'\u0307',3:'\u0308',4:'\u20DB',8:'\u0303',9:'\u0302',11:'\u20D7',12:'\u20D6',13:'\u20E1'};
var PRIME={5:'\u2032',6:'\u2033',7:'\u2035'};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
function chText(c){
  var cp=c.mt!=null?c.mt:(c.c16!=null?c.c16:c.c8);
  if(cp==null)fail('ký tự rỗng');
  if(cp>=0xE000&&cp<=0xF8FF)fail('ký tự riêng của MathType (U+'+cp.toString(16)+')');
  if(cp===0xA0)cp=0x20;
  return String.fromCodePoint(cp)}
var runXml=function(cls,text){
  var pr=cls==='nor'?'<m:rPr><m:nor/></m:rPr>':cls==='p'?'<m:rPr><m:sty m:val="p"/></m:rPr>':cls==='bi'?'<m:rPr><m:sty m:val="bi"/></m:rPr>':'';
  return '<m:r>'+pr+'<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t xml:space="preserve">'+esc(text)+'</m:t></m:r>'};
var plain=function(items){return items.map(function(i){return i.txt||''}).join('')};
function lineItems(line){return line?seq(line.c):[]}
function pack(items){      /* ghép các ký tự liền kề cùng kiểu thành một m:r */
  var out='',run=null;
  var flush=function(){if(run){out+=runXml(run.cls,run.text);run=null}};
  items.forEach(function(it){
    if(it.run){if(run&&run.cls===it.cls)run.text+=it.text;else{flush();run={cls:it.cls,text:it.text}}}
    else{flush();out+=it.xml}});
  flush();return out||runXml('p','')}
function slot(line){return pack(lineItems(line))}
function slotTxt(line){return plain(lineItems(line))}
function seq(objs){
  var items=[];
  objs.forEach(function(o){
    if(o.k==='char'){
      var t=chText(o),cls=CLS[o.tf]||'i',it={run:true,cls:cls,text:t,txt:t,base:true};
      if(o.emb&&o.emb.length){
        var xml=pack([it]),txt=t;
        o.emb.forEach(function(e){
          if(e.k!=='emb')fail('embellishment lạ');
          if(PRIME[e.t]){xml='<m:sSup><m:e>'+xml+'</m:e><m:sup>'+runXml('p',PRIME[e.t])+'</m:sup></m:sSup>';txt+=PRIME[e.t]}
          else if(ACC[e.t]){xml='<m:acc><m:accPr><m:chr m:val="'+ACC[e.t]+'"/></m:accPr><m:e>'+xml+'</m:e></m:acc>'}
          else if(e.t===17){xml='<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>'+xml+'</m:e></m:bar>'}
          else fail('dấu trên chữ chưa hỗ trợ: '+e.t)});
        items.push({xml:xml,txt:txt});
      }else items.push(it);
    }
    else if(o.k==='tmpl')tmpl(o,items);
    else if(o.k==='pile'){items.push(pile(o))}
    else if(o.k==='matrix')items.push(matrix(o));
    else if(o.k==='line'){items.push.apply(items,lineItems(o))}
    else if(o.k==='emb')fail('EMBELL lạc chỗ');
  });
  return items}
function pile(o){
  var rows=o.c.filter(function(x){return x.k==='line'});
  if(!rows.length||rows.length!==o.c.length)fail('PILE lạ');
  return {xml:'<m:eqArr><m:eqArrPr><m:baseJc m:val="center"/></m:eqArrPr>'+rows.map(function(r){return '<m:e>'+slot(r)+'</m:e>'}).join('')+'</m:eqArr>',txt:rows.map(function(r){return slotTxt(r)}).join('; ')}}
function matrix(o){
  var cells=o.c.filter(function(x){return x.k==='line'});
  if(cells.length!==o.rows*o.cols||o.c.length!==cells.length)fail('MATRIX lạ');
  var xml='<m:m>';for(var r=0;r<o.rows;r++){xml+='<m:mr>';for(var c=0;c<o.cols;c++)xml+='<m:e>'+slot(cells[r*o.cols+c])+'</m:e>';xml+='</m:mr>'}
  return {xml:xml+'</m:m>',txt:'[ma trận]'}}
function tmpl(t,items){
  var lines=t.c.filter(function(x){return x.k==='line'}),chars=t.c.filter(function(x){return x.k==='char'}),
      other=t.c.filter(function(x){return x.k!=='line'&&x.k!=='char'});
  if(other.length)fail('mẫu có thành phần lạ');
  var s=t.sel,v=t.v;
  if(s<=7){                                         /* ngoặc/đường kẻ bao quanh */
    var def=FENCE[s],L='',R='',fc=chars.map(chText);
    if((v&3)===3){L=fc[0]||def[0];R=fc[1]||def[1]}
    else if(v&1){L=fc[0]||def[0]}
    else if(v&2){R=fc[0]||def[1]}
    var inner=lines.length>1?lines.map(slot).join(''):slot(lines[0]);
    items.push({xml:'<m:d><m:dPr><m:begChr m:val="'+esc(L)+'"/><m:endChr m:val="'+esc(R)+'"/></m:dPr><m:e>'+inner+'</m:e></m:d>',txt:L+slotTxt(lines[0])+R});return}
  if(s===11){                                       /* phân số */
    if(lines.length!==2)fail('phân số thiếu tử/mẫu');
    var ty=(v&1)?'<m:fPr><m:type m:val="skw"/></m:fPr>':'';
    items.push({xml:'<m:f>'+ty+'<m:num>'+slot(lines[0])+'</m:num><m:den>'+slot(lines[1])+'</m:den></m:f>',txt:'('+slotTxt(lines[0])+')/('+slotTxt(lines[1])+')'});return}
  if(s===10){                                       /* căn */
    if(!lines.length)fail('căn rỗng');
    var nth=v===1&&lines.length>=2&&!lines[1].nul;
    items.push({xml:'<m:rad><m:radPr>'+(nth?'':'<m:degHide m:val="1"/>')+'</m:radPr><m:deg>'+(nth?slot(lines[1]):'')+'</m:deg><m:e>'+slot(lines[0])+'</m:e></m:rad>',txt:'√('+slotTxt(lines[0])+')'});return}
  if(s===12||s===13){                               /* gạch dưới / gạch trên */
    items.push({xml:'<m:bar><m:barPr><m:pos m:val="'+(s===13?'top':'bot')+'"/></m:barPr><m:e>'+slot(lines[0])+'</m:e></m:bar>',txt:slotTxt(lines[0])});return}
  if(s===27||s===28||s===29){                       /* chỉ số dưới/trên: áp lên ký tự đứng ngay trước */
    var base=items.pop(),bx=base?(base.run?runXml(base.cls,base.text.slice(-1)):base.xml):runXml('p','');
    if(base&&base.run&&base.text.length>1)items.push({run:true,cls:base.cls,text:base.text.slice(0,-1),txt:base.text.slice(0,-1)});
    var bt=base?(base.run?base.text.slice(-1):base.txt):'',xml,txt;
    var nn=lines.filter(function(l){return !l.nul&&l.c.length});
    if(s===27){if(nn.length!==1)fail('chỉ số dưới lạ');var sb=nn[0];xml='<m:sSub><m:e>'+bx+'</m:e><m:sub>'+slot(sb)+'</m:sub></m:sSub>';txt=bt+'_'+slotTxt(sb)}
    else if(s===28){if(nn.length!==1)fail('chỉ số trên lạ');var sp=nn[0];xml='<m:sSup><m:e>'+bx+'</m:e><m:sup>'+slot(sp)+'</m:sup></m:sSup>';txt=bt+'^'+slotTxt(sp)}
    else{if(lines.length!==2||!nn.length)fail('chỉ số dưới/trên lạ');var lb=lines[0],ub=lines[1];
      xml='<m:sSubSup><m:e>'+bx+'</m:e><m:sub>'+slot(lb)+'</m:sub><m:sup>'+slot(ub)+'</m:sup></m:sSubSup>';txt=bt+'_'+slotTxt(lb)+'^'+slotTxt(ub)}
    items.push({xml:xml,txt:txt});return}
  fail('mẫu MathType chưa hỗ trợ (selector '+s+')')}

function convert(bin){
  try{
    var ns=cfbStream(bin,'Equation Native');if(!ns||ns.length<40)return null;
    var hdr=u16(ns,0);                              /* EQNOLEFILEHDR.cbHdr = 28 */
    var tree=parseMTEF(ns.subarray(hdr));
    var lines=tree.filter(function(x){return x.k==='line'||x.k==='pile'});
    if(!lines.length)return null;
    var items=[];lines.forEach(function(l){items.push.apply(items,seq([l]))});
    var xml=pack(items),txt=plain(items);
    if(!/\S/.test(txt)&&!/<m:/.test(xml.replace(/<m:r>.*?<\/m:r>/g,'')))return null;
    return {xml:'<m:oMath>'+xml+'</m:oMath>',text:txt.replace(/\s+/g,' ').trim()}}
  catch(e){if(e&&e.mtef)return {err:e.message};return {err:'lỗi đọc: '+(e&&e.message)}}}

window.MathTypeOle={convert:convert,_cfb:cfbStream,_parse:parseMTEF,MNS:MNS};
})();
