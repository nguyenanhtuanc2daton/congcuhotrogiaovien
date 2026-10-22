/* Tạo mã QR nhanh từ link — tab "Công cụ thường dùng" (mục #utQr trong index.html).
   Bản nâng cấp: nhiều cỡ ảnh, màu (đơn sắc/chuyển màu), hình ô & 3 ô góc, viền, bo góc, logo (logo trường / logo riêng),
   dòng chữ dưới mã, xuất PNG / JPG / WebP / SVG (vector) / PDF, chia sẻ nhanh trên điện thoại.
   Các ô điều khiển mới được tạo bằng JS ngay dưới ô "Chèn logo", KHÔNG cần sửa index.html. Thư viện QR chỉ tải khi dùng. */
(function(){
  'use strict';
  var s=document.getElementById('utSel'),inp=document.getElementById('qrIn'),cv=document.getElementById('qrCv');
  if(!s||!inp||!cv)return;
  var LIB='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',loading=null;
  function need(cb,fail){   /* chỉ tải thư viện QR khi thật sự dùng */
    if(window.QRCode){cb();return;}
    if(!loading){loading=document.createElement('script');loading.src=LIB;document.head.appendChild(loading);}
    loading.addEventListener('load',function(){cb();});
    loading.addEventListener('error',function(){loading.parentNode&&loading.parentNode.removeChild(loading);loading=null;fail();});
  }
  function ensureOpt(){if(!s.querySelector('option[value="utQr"]')){var o=document.createElement('option');o.value='utQr';o.textContent='📱 Tạo mã QR nhanh từ link';s.appendChild(o);}}
  ensureOpt();window.addEventListener('load',ensureOpt);
  if(window.MutationObserver)new MutationObserver(ensureOpt).observe(s,{childList:true});

  var stat=document.getElementById('qrStat'),size=document.getElementById('qrSize'),logoChk=document.getElementById('qrLogo'),
      dl=document.getElementById('qrDl'),cp=document.getElementById('qrCopy'),holder=document.createElement('div'),cur='',tm=0,rt=0,last=null;
  holder.style.cssText='position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden';document.body.appendChild(holder);

  /* ====== CÀI ĐẶT (nhớ lại lần sau) ====== */
  var KEY='qrNhanhOpts_v2',FONT='Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  var o={fg:'#000000',fg2:'#2563eb',grad:'none',eyeSep:false,eye:'#000000',bg:'#ffffff',tr:false,
         shape:'sq',eyeShape:'sq',quiet:'4',round:'0',ecc:'auto',logoSize:'m',logoBack:'sq',caption:'',fmt:'png',size:'',custom:''};
  try{var sv=JSON.parse(localStorage.getItem(KEY)||'{}');for(var k0 in o)if(Object.prototype.hasOwnProperty.call(sv,k0)&&typeof sv[k0]===typeof o[k0])o[k0]=sv[k0];}catch(e){}
  function persist(){try{o.size=size.value;localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}

  /* ====== LOGO ====== */
  var logo=new Image();logo.onload=function(){if(cur&&window.QRCode)render();};logo.src='logo.jpg?v=20261005';
  var logoCustom=null;
  function curLogo(){return (logoCustom&&logoCustom.complete&&logoCustom.naturalWidth>0)?logoCustom:logo;}
  var logoURLcache={key:'',url:null};
  function logoURL(im){   /* ảnh logo -> data URL (để nhúng vào SVG) */
    if(logoURLcache.key===im.src&&logoURLcache.url)return logoURLcache.url;
    try{
      var k=Math.min(1,256/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      logoURLcache={key:im.src,url:c.toDataURL('image/png')};return logoURLcache.url;
    }catch(e){return null;}
  }

  function say(t){stat.textContent=t;}
  function norm(v){
    v=(v||'').trim();if(!v)return '';
    if(!/^[a-z][a-z0-9+.\-]*:/i.test(v))v='https://'+v;
    try{return new URL(v).href;}catch(e){return null;}
  }
  function off(msg){cur='';last=null;cv.style.display='none';dl.disabled=cp.disabled=true;if(shareBtn)shareBtn.disabled=true;say(msg);}

  /* ====== HÌNH HỌC (đường vẽ SVG dùng chung cho canvas + file SVG) ====== */
  function f3(v){return String(+v.toFixed(3));}
  function rr(x,y,w,h,r){   /* hình chữ nhật bo góc; r = số hoặc [trên-trái, trên-phải, dưới-phải, dưới-trái] */
    var a=typeof r==='number'?[r,r,r,r]:r,m=Math.min(w,h)/2;
    a=a.map(function(v){return Math.min(v,m);});
    var tl=a[0],tr=a[1],br=a[2],bl=a[3];
    var d='M'+f3(x+tl)+' '+f3(y)+'H'+f3(x+w-tr);
    if(tr)d+='A'+f3(tr)+' '+f3(tr)+' 0 0 1 '+f3(x+w)+' '+f3(y+tr);
    d+='V'+f3(y+h-br);
    if(br)d+='A'+f3(br)+' '+f3(br)+' 0 0 1 '+f3(x+w-br)+' '+f3(y+h);
    d+='H'+f3(x+bl);
    if(bl)d+='A'+f3(bl)+' '+f3(bl)+' 0 0 1 '+f3(x)+' '+f3(y+h-bl);
    d+='V'+f3(y+tl);
    if(tl)d+='A'+f3(tl)+' '+f3(tl)+' 0 0 1 '+f3(x+tl)+' '+f3(y);
    return d+'Z';
  }
  var EYE={sq:[0,0,0],rd:[2,1,1],ci:[3.5,2.5,1.5],leaf:[3,2,1.5]};
  var LOGO_RATIO={s:.18,m:.22,l:.26};
  var mctx=document.createElement('canvas').getContext('2d');
  function geometry(qr,logoOn){
    var n=qr.getModuleCount(),Q=parseInt(o.quiet,10)||0,tot=n+2*Q,a,b,r,c,d='';
    function ine(r,c){return (r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);}
    function dm(r,c){return r>=0&&c>=0&&r<n&&c<n&&!ine(r,c)&&qr.isDark(r,c);}
    var sh=o.shape;
    if(sh==='vbar'||sh==='hbar'){
      for(a=0;a<n;a++){var run=-1;
        for(b=0;b<=n;b++){
          var on=sh==='vbar'?dm(b,a):dm(a,b);
          if(on&&run<0)run=b;
          if(!on&&run>=0){var len=b-run;d+=sh==='vbar'?rr(a+Q+.12,run+Q,.76,len,.38):rr(run+Q,a+Q+.12,len,.76,.38);run=-1;}
        }
      }
    }else{
      for(r=0;r<n;r++)for(c=0;c<n;c++){
        if(!dm(r,c))continue;var x=c+Q,y=r+Q;
        if(sh==='rd'){
          var U=dm(r-1,c),D=dm(r+1,c),L=dm(r,c-1),R=dm(r,c+1);
          d+=rr(x,y,1,1,[!U&&!L?.5:0,!U&&!R?.5:0,!D&&!R?.5:0,!D&&!L?.5:0]);
        }else if(sh==='dot')d+=rr(x+.06,y+.06,.88,.88,.44);
        else if(sh==='gap')d+=rr(x+.1,y+.1,.8,.8,.14);
        else if(sh==='dia'){var cx=x+.5,cy=y+.5,h=.64;d+='M'+f3(cx)+' '+f3(cy-h)+'L'+f3(cx+h)+' '+f3(cy)+'L'+f3(cx)+' '+f3(cy+h)+'L'+f3(cx-h)+' '+f3(cy)+'Z';}
        else d+=rr(x,y,1,1,0);
      }
    }
    /* 3 ô vuông ở góc */
    var E=EYE[o.eyeShape]||EYE.sq,e='',pos=[[0,0,0],[n-7,0,1],[0,n-7,3]];
    function rad(v,i){if(o.eyeShape==='sq')return 0;if(o.eyeShape==='leaf'){var z=[v,v,v,v];z[i]=0;return z;}return v;}
    pos.forEach(function(p){var x=p[0]+Q,y=p[1]+Q;e+=rr(x,y,7,7,rad(E[0],p[2]))+rr(x+1,y+1,5,5,rad(E[1],p[2]))+rr(x+2,y+2,3,3,rad(E[2],p[2]));});
    /* dòng chữ dưới mã */
    var cap=null,capH=0,txt=(o.caption||'').trim();
    if(txt){
      mctx.font='bold 100px '+FONT;var w100=mctx.measureText(txt).width||100;
      var fs=Math.min(2.4,(tot-2)*100/w100);capH=fs*1.8;
      cap={txt:txt,fs:fs,x:tot/2,y:Q+n+(Q+capH)/2+fs*.35};
    }
    var H=tot+capH,rd=parseFloat(o.round)||0,rad2=Math.min(tot*rd,Q*1.5);
    /* logo */
    var lg=null;
    if(logoOn){
      var im=curLogo(),B=n*(LOGO_RATIO[o.logoSize]||.22),cc=Q+n/2,back=o.logoBack,
          Cs=back==='none'?B:(back==='circle'?B*.68:B*.8),ar=im.naturalWidth/im.naturalHeight,iw=ar>=1?Cs:Cs*ar,ih=ar>=1?Cs/ar:Cs;
      lg={x:cc-B/2,y:cc-B/2,B:B,back:back,ix:cc-iw/2,iy:cc-ih/2,iw:iw,ih:ih};
    }
    return {n:n,Q:Q,tot:tot,H:H,data:d,eyes:e,cap:cap,capH:capH,rad:rad2,logo:lg};
  }
  function lastFix(g,sc){   /* làm tròn chiều cao theo điểm ảnh */
    var Hpx=Math.max(1,Math.round(g.H*sc));g.H=Hpx/sc;return Hpx;
  }
  function paint(ctx,g,sc,flat){
    ctx.save();ctx.scale(sc,sc);
    var bgc=o.tr?(flat?'#ffffff':null):o.bg;
    if(bgc){ctx.fillStyle=bgc;ctx.fill(new Path2D(rr(0,0,g.tot,g.H,g.rad)));}
    var fill=o.fg;
    if(o.grad!=='none'){
      var lg=o.grad==='h'?ctx.createLinearGradient(0,0,g.tot,0):o.grad==='v'?ctx.createLinearGradient(0,0,0,g.tot):ctx.createLinearGradient(0,0,g.tot,g.tot);
      lg.addColorStop(0,o.fg);lg.addColorStop(1,o.fg2);fill=lg;
    }
    ctx.fillStyle=fill;ctx.fill(new Path2D(g.data));
    ctx.fillStyle=o.eyeSep?o.eye:fill;ctx.fill(new Path2D(g.eyes),'evenodd');
    if(g.logo){
      var L=g.logo;
      if(L.back!=='none'){ctx.fillStyle=o.tr?'#ffffff':o.bg;ctx.fill(new Path2D(rr(L.x,L.y,L.B,L.B,L.back==='circle'?L.B/2:L.B*.12)));}
      ctx.drawImage(curLogo(),L.ix,L.iy,L.iw,L.ih);
    }
    if(g.cap){ctx.fillStyle=o.fg;ctx.font='bold '+g.cap.fs+'px '+FONT;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(g.cap.txt,g.cap.x,g.cap.y);}
    ctx.restore();
  }
  function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function toSVG(L){
    var g=L.g,t=f3(g.tot),sv='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 '+t+' '+f3(g.H)+'" width="'+L.W+'" height="'+L.Hpx+'">';
    var fill=o.fg;
    if(o.grad!=='none'){
      var x2=o.grad==='v'?0:t,y2=o.grad==='h'?0:t;
      sv+='<defs><linearGradient id="qg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="'+x2+'" y2="'+y2+'"><stop offset="0" stop-color="'+o.fg+'"/><stop offset="1" stop-color="'+o.fg2+'"/></linearGradient></defs>';
      fill='url(#qg)';
    }
    if(!o.tr)sv+='<path d="'+rr(0,0,g.tot,g.H,g.rad)+'" fill="'+o.bg+'"/>';
    sv+='<path d="'+g.data+'" fill="'+fill+'"/><path d="'+g.eyes+'" fill="'+(o.eyeSep?o.eye:fill)+'" fill-rule="evenodd"/>';
    if(g.logo){
      var Lg=g.logo,url=logoURL(curLogo());
      if(url){
        if(Lg.back!=='none')sv+='<path d="'+rr(Lg.x,Lg.y,Lg.B,Lg.B,Lg.back==='circle'?Lg.B/2:Lg.B*.12)+'" fill="'+(o.tr?'#ffffff':o.bg)+'"/>';
        sv+='<image x="'+f3(Lg.ix)+'" y="'+f3(Lg.iy)+'" width="'+f3(Lg.iw)+'" height="'+f3(Lg.ih)+'" href="'+url+'" xlink:href="'+url+'"/>';
      }else L.noLogo=true;
    }
    if(g.cap)sv+='<text x="'+f3(g.cap.x)+'" y="'+f3(g.cap.y)+'" font-family="'+FONT+'" font-size="'+f3(g.cap.fs)+'" font-weight="700" text-anchor="middle" fill="'+o.fg+'">'+esc(g.cap.txt)+'</text>';
    return sv+'</svg>';
  }

  /* ====== CẢNH BÁO MÀU ====== */
  function lum(h){
    var m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h);if(!m)return 0;
    var v=[1,2,3].map(function(i){var c=parseInt(m[i],16)/255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);});
    return .2126*v[0]+.7152*v[1]+.0722*v[2];
  }
  function cr(a,b){var x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05);}
  function warns(){
    var w=[];
    if(!o.tr){
      var cols=[o.fg];if(o.grad!=='none')cols.push(o.fg2);if(o.eyeSep)cols.push(o.eye);
      var low=cols.some(function(c){return cr(c,o.bg)<3;}),inv=cols.every(function(c){return lum(c)>lum(o.bg);});
      if(low)w.push('⚠ Màu mã và màu nền quá gần nhau, rất khó quét — hãy chọn màu mã đậm hơn.');
      else if(inv)w.push('⚠ Mã sáng trên nền tối (đảo màu): một số máy quét không đọc được.');
    }else w.push('ℹ Nền trong suốt: hãy đặt mã lên nền sáng.');
    if((parseInt(o.quiet,10)||0)<2)w.push('⚠ Viền trống quá nhỏ, có thể khó quét.');
    return w.join(' ');
  }

  /* ====== TẠO MÃ & VẼ ====== */
  function build(wantLogo){
    var order=['L','M','Q','H'],chain,qr=null,used='',lv=0;
    if(wantLogo)chain=['H'];
    else if(o.ecc==='auto')chain=['M','L'];
    else{lv=order.indexOf(o.ecc);chain=order.slice(0,lv+1).reverse();}
    for(var i=0;i<chain.length&&!qr;i++){
      try{holder.innerHTML='';var q=new QRCode(holder,{text:cur,width:128,height:128,correctLevel:QRCode.CorrectLevel[chain[i]]});qr=q._oQRCode;used=chain[i];}catch(e){qr=null;}
    }
    return {qr:qr,used:used};
  }
  function getSize(){
    if(size.value==='custom')return Math.min(4000,Math.max(100,parseInt(o.custom,10)||512));
    return parseInt(size.value,10)||512;
  }
  function render(){
    if(!window.QRCode){off('⚠ Chưa tải được thư viện tạo QR (cần mạng). Hãy tải lại trang rồi thử lại.');return;}
    if(!window.Path2D){off('⚠ Trình duyệt quá cũ, không vẽ được mã QR tuỳ chỉnh. Hãy cập nhật trình duyệt.');return;}
    var im=curLogo(),wantLogo=logoChk.checked&&im.complete&&im.naturalWidth>0,b=build(wantLogo);
    if(!b.qr&&wantLogo){wantLogo=false;b=build(false);}
    if(!b.qr){off('⚠ Link quá dài để tạo mã QR. Hãy rút gọn link (vd: bit.ly, tinyurl) rồi thử lại.');return;}
    var g=geometry(b.qr,wantLogo),S=getSize(),sc=Math.max(2,Math.floor(S/g.tot)),W=sc*g.tot,Hpx=lastFix(g,sc),c=cv.getContext('2d');
    try{
      cv.width=W;cv.height=Hpx;c.clearRect(0,0,W,Hpx);paint(c,g,sc,false);
    }catch(e){off('⚠ Kích thước quá lớn so với thiết bị — hãy chọn cỡ ảnh nhỏ hơn.');return;}
    last={g:g,sc:sc,W:W,Hpx:Hpx};
    cv.style.background=o.tr?'repeating-conic-gradient(#d0d0d0 0% 25%,#fff 0% 50%) 50%/16px 16px':'';
    cv.style.display='inline-block';dl.disabled=cp.disabled=false;if(shareBtn)shareBtn.disabled=false;
    var cm=(W/300*2.54).toFixed(1);
    say('✅ Đã tạo mã QR ('+W+'×'+Hpx+' px, in 300 dpi ≈ '+cm+' cm). Hãy quét thử bằng điện thoại trước khi dùng.'
        +(logoChk.checked&&!wantLogo?' (Không chèn được logo.)':'')+(wantLogo?' (Có logo → tự dùng mức sửa lỗi cao H.)':'')
        +(warns()?' '+warns():''));
  }
  function refresh(){if(cur)need(render,function(){});}
  function update(){
    var v=norm(inp.value);
    if(v===''){off('Dán link vào ô trên, mã QR tự hiện ngay.');return;}
    if(v===null){off('⚠ Link chưa hợp lệ — kiểm tra lại (không chứa dấu cách).');return;}
    cur=v;say('Đang tạo mã QR…');need(render,function(){off('⚠ Chưa tải được thư viện tạo QR (cần mạng). Hãy kiểm tra mạng rồi thử lại.');});
  }

  /* ====== GIAO DIỆN TUỲ CHỈNH (tạo bằng JS) ====== */
  var shareBtn=null,ui={},customRow=null;
  var css=document.createElement('style');
  css.textContent='.qx{margin:10px 0}.qx *{box-sizing:border-box}'
   +'.qx .qt{font-weight:700;margin:8px 0 4px}'
   +'.qx details{border:1px solid rgba(125,211,252,.3);border-radius:14px;margin:8px 0;padding:0 12px;background:rgba(255,255,255,.03)}'
   +'.qx summary{cursor:pointer;padding:11px 0;font-weight:700;list-style:none}.qx summary::-webkit-details-marker{display:none}'
   +'.qx summary:after{content:"▾";float:right;opacity:.7}.qx details[open] summary:after{content:"▴"}'
   +'.qx .g{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px 0 12px}'
   +'.qx .g label{display:flex;flex-direction:column;gap:4px;font-size:.92em;min-width:0}'
   +'.qx .g .w{grid-column:1/-1}.qx .g .c{flex-direction:row;align-items:center;gap:8px}'
   +'.qx select,.qx input[type=text],.qx input[type=number]{width:100%;max-width:100%}'
   +'.qx input[type=color]{width:100%;height:42px;padding:2px;border-radius:10px;border:2px solid rgba(125,211,252,.5);background:transparent;cursor:pointer}'
   +'.qx input[type=file]{width:100%;font-size:.85em}'
   +'.qx .sw{display:flex;flex-wrap:wrap;gap:9px;margin:4px 0 6px}'
   +'.qx .sw button{width:38px;height:38px;border-radius:50%;border:2px solid rgba(255,255,255,.75);cursor:pointer;padding:0}'
   +'.qx .sm{font-size:.82em;opacity:.8;grid-column:1/-1}';
  document.head.appendChild(css);

  function el(t,p,kids){var e=document.createElement(t);if(p)for(var a in p){if(a==='text')e.textContent=p[a];else if(a==='cls')e.className=p[a];else if(a==='style')e.style.cssText=p[a];else e[a]=p[a];}(kids||[]).forEach(function(k){e.appendChild(k);});return e;}
  var rtm=0;
  function changed(){persist();sync();clearTimeout(rtm);rtm=setTimeout(refresh,40);}
  function addSel(par,label,key,opts,wide){
    var se=el('select',{cls:size.className}),lb=el('label',{cls:wide?'w':''},[el('span',{text:label}),se]);
    opts.forEach(function(p){se.appendChild(el('option',{value:p[0],text:p[1]}));});
    se.addEventListener('change',function(){o[key]=se.value;changed();});
    par.appendChild(lb);ui[key]={row:lb,set:function(v){se.value=v;}};return se;
  }
  function addColor(par,label,key){
    var ip=el('input',{type:'color'}),lb=el('label',{},[el('span',{text:label}),ip]);
    ip.addEventListener('input',function(){o[key]=ip.value;changed();});
    par.appendChild(lb);ui[key]={row:lb,set:function(v){ip.value=v;}};
  }
  function addChk(par,label,key){
    var ip=el('input',{type:'checkbox'}),lb=el('label',{cls:'w c'},[ip,el('span',{text:label})]);
    ip.addEventListener('change',function(){o[key]=ip.checked;changed();});
    par.appendChild(lb);ui[key]={row:lb,set:function(v){ip.checked=!!v;}};
  }
  function addTxt(par,label,key,ph,max){
    var ip=el('input',{type:'text',cls:inp.className,placeholder:ph||'',maxLength:max||60}),lb=el('label',{cls:'w'},[el('span',{text:label}),ip]);
    ip.addEventListener('input',function(){o[key]=ip.value;changed();});
    par.appendChild(lb);ui[key]={row:lb,set:function(v){ip.value=v;}};
  }
  function group(title,open){
    var g=el('div',{cls:'g'}),d=el('details',{},[el('summary',{text:title}),g]);if(open)d.open=true;panel.appendChild(d);return g;
  }
  function applyPreset(p){o.fg=p[1];o.fg2=p[2]||p[1];o.grad=p[3]||'none';o.eyeSep=false;o.eye=p[1];o.bg='#ffffff';o.tr=false;syncAll();changed();}
  var PRESETS=[['Đen','#000000'],['Xanh dương','#1e40af'],['Xanh lá','#047857'],['Đỏ','#b91c1c'],['Tím','#6d28d9'],['Nâu cam','#b45309'],
               ['Xanh → Tím','#2563eb','#7c3aed','d'],['Cam → Đỏ','#ea580c','#9f1239','d'],['Lá → Dương','#059669','#1d4ed8','h']];

  /* chèn bảng tuỳ chỉnh ngay dưới dòng "Chèn logo" */
  var panel=el('div',{cls:'qx'}),anchor=logoChk.closest?(logoChk.closest('label')||logoChk.parentNode):logoChk.parentNode;
  anchor.parentNode.insertBefore(panel,anchor.nextSibling);

  /* cỡ ảnh: thêm nhiều mức */
  (function(){
    var prev=o.size||size.value,sizes=[256,384,512,768,1024,1536,2048];
    size.innerHTML='';
    sizes.forEach(function(v){size.appendChild(el('option',{value:String(v),text:v+' px'}));});
    size.appendChild(el('option',{value:'custom',text:'Tuỳ chọn…'}));
    size.value=sizes.indexOf(parseInt(prev,10))>=0||prev==='custom'?prev:'512';
  })();

  panel.appendChild(el('div',{cls:'qt',text:'🎨 Mẫu màu nhanh'}));
  var sw=el('div',{cls:'sw'});
  PRESETS.forEach(function(p){
    var bt=el('button',{type:'button',title:p[0]});
    bt.style.background=p[2]?'linear-gradient(135deg,'+p[1]+','+p[2]+')':p[1];
    bt.addEventListener('click',function(){applyPreset(p);});sw.appendChild(bt);
  });
  panel.appendChild(sw);

  var gc=group('🎨 Màu sắc',false);
  addColor(gc,'Màu mã','fg');addColor(gc,'Màu nền','bg');
  addSel(gc,'Kiểu màu mã','grad',[['none','Một màu'],['h','Chuyển ngang →'],['v','Chuyển dọc ↓'],['d','Chuyển chéo ↘']],true);
  addColor(gc,'Màu thứ hai (chuyển màu)','fg2');
  addChk(gc,'Nền trong suốt (PNG, WebP, SVG)','tr');
  addChk(gc,'Màu riêng cho 3 ô vuông ở góc','eyeSep');
  addColor(gc,'Màu 3 ô góc','eye');

  var gs=group('🔷 Hình dạng',false);
  addSel(gs,'Hình các ô nhỏ','shape',[['sq','Vuông (chuẩn)'],['rd','Bo tròn liền'],['dot','Chấm tròn'],['gap','Ô nhỏ bo góc'],['dia','Kim cương'],['vbar','Thanh dọc'],['hbar','Thanh ngang']]);
  addSel(gs,'Hình 3 ô góc','eyeShape',[['sq','Vuông'],['rd','Bo góc'],['ci','Tròn'],['leaf','Chiếc lá']]);
  addSel(gs,'Viền trống quanh mã','quiet',[['0','Không viền'],['1','Rất mỏng'],['2','Mỏng'],['4','Chuẩn'],['6','Rộng']]);
  addSel(gs,'Bo góc nền','round',[['0','Vuông góc'],['0.04','Bo nhẹ'],['0.1','Bo nhiều']]);
  addSel(gs,'Mức sửa lỗi (mã càng dày, càng bền)','ecc',[['auto','Tự động'],['L','L — thấp (mã thưa)'],['M','M — trung bình'],['Q','Q — cao'],['H','H — rất cao']],true);

  var gl=group('🖼 Logo & chữ',false);
  addSel(gl,'Cỡ logo','logoSize',[['s','Nhỏ'],['m','Vừa'],['l','Lớn']]);
  addSel(gl,'Nền logo','logoBack',[['sq','Ô vuông'],['circle','Hình tròn'],['none','Không nền']]);
  var fileIn=el('input',{type:'file',accept:'image/*'}),useDef=el('button',{type:'button',text:'↩ Dùng lại logo trường',cls:dl.className,style:'margin-top:4px'});
  gl.appendChild(el('label',{cls:'w'},[el('span',{text:'Logo riêng (tuỳ chọn)'}),fileIn,useDef]));
  fileIn.addEventListener('change',function(){
    var fl=fileIn.files&&fileIn.files[0];if(!fl)return;
    var rd=new FileReader();rd.onload=function(){var im=new Image();im.onload=function(){logoCustom=im;logoChk.checked=true;refresh();say('✅ Đã nạp logo riêng.');};im.onerror=function(){say('⚠ Không đọc được ảnh logo này.');};im.src=rd.result;};
    rd.readAsDataURL(fl);
  });
  useDef.addEventListener('click',function(){logoCustom=null;fileIn.value='';refresh();});
  addTxt(gl,'Dòng chữ dưới mã (vd: Quét để vào lớp học)','caption','Để trống nếu không cần',60);
  gl.appendChild(el('div',{cls:'sm',text:'Khi chèn logo, mã tự dùng mức sửa lỗi cao nhất (H) để vẫn quét được.'}));

  /* hàng chọn định dạng file — đặt ngay trên hai nút Tải / Sao chép */
  var FMT={png:['PNG','ảnh PNG'],jpg:['JPG','ảnh JPG'],webp:['WebP','ảnh WebP'],svg:['SVG','file SVG (vector)'],pdf:['PDF','file PDF (A4)']};
  var fmtRow=el('div',{cls:'qx'}),fg=el('div',{cls:'g'});fmtRow.appendChild(fg);
  addSel(fg,'Định dạng file','fmt',[['png','PNG — ảnh (nên dùng)'],['jpg','JPG — ảnh nhẹ, nền trắng'],['webp','WebP — ảnh nhẹ'],['svg','SVG — vector, phóng to không vỡ'],['pdf','PDF — in A4']],true);
  var cin=el('input',{type:'number',cls:inp.className,min:100,max:4000,step:10,placeholder:'100–4000'});
  customRow=el('label',{},[el('span',{text:'Cỡ tuỳ chọn (px)'}),cin]);fg.appendChild(customRow);
  cin.addEventListener('input',function(){o.custom=cin.value;persist();clearTimeout(rtm);rtm=setTimeout(refresh,300);});
  var btnRow=dl.parentNode;btnRow.parentNode.insertBefore(fmtRow,btnRow);
  if(navigator.share){
    shareBtn=el('button',{type:'button',text:'📤 Chia sẻ (Zalo, Messenger…)',cls:cp.className,style:'width:100%;margin-top:10px',disabled:true});
    btnRow.parentNode.insertBefore(shareBtn,btnRow.nextSibling);
  }

  function sync(){
    ui.fg2.row.style.display=o.grad==='none'?'none':'';
    ui.eye.row.style.display=o.eyeSep?'':'none';
    ui.bg.row.style.display=o.tr?'none':'';
    customRow.style.display=size.value==='custom'?'':'none';
    var fm=FMT[o.fmt]||FMT.png;dl.textContent='⬇ Tải '+fm[1];
  }
  function syncAll(){for(var k in ui)ui[k].set(o[k]);cin.value=o.custom;sync();}
  syncAll();

  /* ====== SỰ KIỆN CHÍNH ====== */
  inp.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(update,250);});
  size.addEventListener('change',function(){persist();sync();refresh();});
  logoChk.addEventListener('change',refresh);
  document.getElementById('qrThis').addEventListener('click',function(){inp.value=location.href.split('#')[0];update();});
  document.getElementById('qrPaste').addEventListener('click',function(){
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(function(t){inp.value=(t||'').trim();update();},function(){say('Trình duyệt không cho đọc bộ nhớ tạm — hãy nhấn giữ vào ô và chọn Dán.');inp.focus();});
    }else{say('Trình duyệt không hỗ trợ nút Dán — hãy nhấn giữ vào ô và chọn Dán.');inp.focus();}
  });

  /* ====== XUẤT FILE ====== */
  function fname(ext){try{return 'QR_'+new URL(cur).hostname.replace(/[^\w.\-]/g,'_')+'.'+ext;}catch(e){return 'QR.'+ext;}}
  function blobErr(){logoChk.checked=false;render();say('⚠ Trình duyệt chặn xuất ảnh khi có logo — đã tắt logo, hãy bấm lại.');}
  function ascii(t){var u=new Uint8Array(t.length);for(var i=0;i<t.length;i++)u[i]=t.charCodeAt(i)&255;return u;}
  function makePdf(jpg,w,h){   /* PDF A4 tối giản, nhúng 1 ảnh JPEG ở giữa phía trên */
    var parts=[],off=0,xr=[];
    function put(x){var u=typeof x==='string'?ascii(x):x;parts.push(u);off+=u.length;}
    function obj(n,body){xr[n]=off;put(n+' 0 obj\n'+body+'\nendobj\n');}
    var PW=595.28,PH=841.89,iw=340,ih=iw*h/w,x=(PW-iw)/2,y=PH-90-ih;
    put('%PDF-1.4\n');
    obj(1,'<</Type/Catalog/Pages 2 0 R>>');
    obj(2,'<</Type/Pages/Kids[3 0 R]/Count 1>>');
    obj(3,'<</Type/Page/Parent 2 0 R/MediaBox[0 0 595.28 841.89]/Resources<</XObject<</Im0 5 0 R>>>>/Contents 4 0 R>>');
    var cs='q '+iw+' 0 0 '+ih.toFixed(2)+' '+x.toFixed(2)+' '+y.toFixed(2)+' cm /Im0 Do Q';
    obj(4,'<</Length '+cs.length+'>>\nstream\n'+cs+'\nendstream');
    xr[5]=off;put('5 0 obj\n<</Type/XObject/Subtype/Image/Width '+w+'/Height '+h+'/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length '+jpg.length+'>>\nstream\n');
    put(jpg);put('\nendstream\nendobj\n');
    var xo=off,t='xref\n0 6\n0000000000 65535 f \n';
    for(var n=1;n<=5;n++)t+=('0000000000'+xr[n]).slice(-10)+' 00000 n \n';
    put(t+'trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n'+xo+'\n%%EOF');
    return new Blob(parts,{type:'application/pdf'});
  }
  function exportBlob(cb){   /* cb(blob, đuôi file) */
    if(!last)return;
    var fm=o.fmt;
    if(fm==='svg'){
      var L={g:last.g,W:last.W,Hpx:last.Hpx},sv=toSVG(L);
      if(L.noLogo)say('⚠ Không nhúng được logo vào SVG (trình duyệt chặn) — file SVG không có logo.');
      cb(new Blob([sv],{type:'image/svg+xml'}),'svg');return;
    }
    var flat=(fm==='jpg'||fm==='pdf'),c=cv;
    if(flat){c=document.createElement('canvas');c.width=last.W;c.height=last.Hpx;paint(c.getContext('2d'),last.g,last.sc,true);}
    var mime=flat?'image/jpeg':fm==='webp'?'image/webp':'image/png';
    try{c.toBlob(function(b){
      if(!b){blobErr();return;}
      if(fm==='pdf'){var fr=new FileReader();fr.onload=function(){cb(makePdf(new Uint8Array(fr.result),c.width,c.height),'pdf');};fr.readAsArrayBuffer(b);return;}
      if(fm==='webp'&&b.type!=='image/webp'){say('ℹ Trình duyệt này không xuất được WebP — đã lưu PNG thay thế.');cb(b,'png');return;}
      cb(b,fm);
    },mime,.95);}catch(e){blobErr();}
  }
  dl.addEventListener('click',function(){
    if(!cur)return;
    exportBlob(function(b,ext){
      var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fname(ext);document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
    });
  });
  cp.addEventListener('click',function(){
    if(!cur)return;
    if(!(navigator.clipboard&&window.ClipboardItem)){say('Trình duyệt chưa hỗ trợ sao chép ảnh — hãy bấm nút Tải.');return;}
    try{cv.toBlob(function(b){
      if(!b){blobErr();return;}
      navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(function(){say('✅ Đã sao chép ảnh QR — dán (Ctrl+V) vào Word, PowerPoint, Zalo…');},function(){say('Không sao chép được — hãy bấm nút Tải.');});
    },'image/png');}catch(e){blobErr();}
  });
  if(shareBtn)shareBtn.addEventListener('click',function(){
    if(!cur)return;
    exportBlob(function(b,ext){
      var file;try{file=new File([b],fname(ext),{type:b.type});}catch(e){say('Thiết bị chưa hỗ trợ chia sẻ — hãy bấm nút Tải.');return;}
      if(navigator.canShare&&navigator.canShare({files:[file]}))navigator.share({files:[file],title:'Mã QR'}).catch(function(){});
      else say('Thiết bị chưa hỗ trợ chia sẻ file này — hãy bấm nút Tải.');
    });
  });
})();
