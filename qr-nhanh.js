/* Tạo mã QR (link, WiFi, Zalo/Facebook/MXH, hàng loạt ZIP, văn bản, email, điện thoại, SMS, danh thiếp, vị trí, sự kiện) — tab "Công cụ thường dùng" (mục #utQr trong index.html).
   Bản nâng cấp: nhiều cỡ ảnh, màu (đơn sắc/chuyển màu), hình ô & 3 ô góc, viền, bo góc, logo (logo trường / logo riêng),
   dòng chữ dưới mã, xuất PNG / JPG / WebP / SVG (vector) / PDF, chia sẻ nhanh trên điện thoại,
   WiFi: tạo mã QR để vào WiFi + quét mã QR WiFi bằng camera/ảnh (hiện tên & mật khẩu).
   Các ô điều khiển mới được tạo bằng JS ngay dưới ô "Chèn logo", KHÔNG cần sửa index.html. Thư viện QR chỉ tải khi dùng. */
(function(){
  'use strict';
  var s=document.getElementById('utSel'),inp=document.getElementById('qrIn'),cv=document.getElementById('qrCv');
  if(!s||!inp||!cv)return;
  var LIB='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',loading=null;
  /* Thư viện phụ (qrcode-generator): chứa được tới ~2300 byte; chỉ tải khi nội dung dài hoặc có logo
     (qrcodejs chỉ chứa tối đa ~213 byte, ~119 byte nếu có logo → danh thiếp/sự kiện đầy đủ sẽ không tạo được mã). */
  var LIB2=['https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js','https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'],lib2Busy=false,lib2Wait=[];
  function byteLen(t){try{return unescape(encodeURIComponent(t)).length;}catch(e){return String(t).length*3;}}
  function need2(cb){
    if(typeof window.qrcode==='function'){cb();return;}
    lib2Wait.push(cb);if(lib2Busy)return;lib2Busy=true;
    var i=0;
    function fin(){lib2Busy=false;var w=lib2Wait;lib2Wait=[];w.forEach(function(f){f();});}
    function tryNext(){
      if(i>=LIB2.length){fin();return;}   /* không tải được thì vẫn chạy tiếp, nội dung quá dài sẽ được báo */
      var sc=document.createElement('script');sc.src=LIB2[i++];
      sc.onload=function(){if(typeof window.qrcode==='function')fin();else tryNext();};
      sc.onerror=function(){if(sc.parentNode)sc.parentNode.removeChild(sc);tryNext();};
      document.head.appendChild(sc);
    }
    tryNext();
  }
  function need(cb,fail){   /* chỉ tải thư viện QR khi thật sự dùng */
    function ok(){if(cur&&byteLen(cur)>((typeof logoChk!=='undefined'&&logoChk&&logoChk.checked)?100:190))need2(cb);else cb();}
    if(window.QRCode){ok();return;}
    if(!loading){loading=document.createElement('script');loading.src=LIB;document.head.appendChild(loading);}
    loading.addEventListener('load',ok);
    loading.addEventListener('error',function(){loading.parentNode&&loading.parentNode.removeChild(loading);loading=null;fail();});
  }
  function ensureOpt(){if(!s.querySelector('option[value="utQr"]')){var o=document.createElement('option');o.value='utQr';o.textContent='📱 Tạo mã QR';s.appendChild(o);}
    var ex=s.querySelector('option[value="utQr"]');if(ex&&ex.textContent!=='📱 Tạo mã QR')ex.textContent='📱 Tạo mã QR';}
  ensureOpt();window.addEventListener('load',ensureOpt);
  if(window.MutationObserver)new MutationObserver(ensureOpt).observe(s,{childList:true});

  function retitle(){   /* đổi tiêu đề mục thành "Tạo mã QR" */
    var root=document.getElementById('utQr')||cv.parentNode,all=root.querySelectorAll('*'),i,e;
    for(i=0;i<all.length;i++){e=all[i];
      if(e.children.length===0&&/^(\s*\S*\s*)?Tạo mã QR nhanh từ link\s*$/i.test(e.textContent)&&e.tagName!=='OPTION')e.textContent=e.textContent.replace(/Tạo mã QR nhanh từ link/i,'Tạo mã QR');}
  }
  retitle();
  var mode='link',stat=document.getElementById('qrStat'),size=document.getElementById('qrSize'),logoChk=document.getElementById('qrLogo'),
      dl=document.getElementById('qrDl'),cp=document.getElementById('qrCopy'),holder=document.createElement('div'),cur='',tm=0,rt=0,last=null,wifiStr='',extraStr='',extraName='',batchAbort=null,pvs=[];
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

  function say(t){stat.textContent=t;pvs.forEach(function(p){p.s.textContent=t;});}
  function mirror(show){   /* chép mã QR sang khung xem trước ngay dưới các ô nhập */
    pvs.forEach(function(p){
      if(!show){p.c.style.display='none';return;}
      try{p.c.width=cv.width;p.c.height=cv.height;var x=p.c.getContext('2d');x.clearRect(0,0,p.c.width,p.c.height);x.drawImage(cv,0,0);
          p.c.style.background=cv.style.background;p.c.style.display='block';}catch(e){p.c.style.display='none';}
    });
  }
  function norm(v){
    v=(v||'').trim();if(!v)return '';
    if(!/^[a-z][a-z0-9+.\-]*:/i.test(v))v='https://'+v;
    try{return new URL(v).href;}catch(e){return null;}
  }
  function off(msg){cur='';last=null;cv.style.display='none';mirror(false);dl.disabled=cp.disabled=true;if(shareBtn)shareBtn.disabled=true;say(msg);}

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
  /* Thư viện qrcodejs tự chèn 3 byte BOM (EF BB BF) đầu nội dung khi có chữ có dấu → danh thiếp/sự kiện/văn bản quét ra bị lỗi.
     Hàm này bỏ 3 byte đó rồi tạo lại ma trận; nếu cấu trúc thư viện khác dự kiến thì giữ nguyên bản gốc. */
  function noBom(qr,remake){
    try{
      var d=qr&&qr.dataList&&qr.dataList.length===1?qr.dataList[0]:null,p=d&&d.parsedData;
      if(p&&p[0]===239&&p[1]===187&&p[2]===191&&cur.charCodeAt(0)!==0xFEFF){
        p.splice(0,3);qr.dataCache=null;qr.make();
        if(!(qr.getModuleCount()>0))return remake();
      }
    }catch(e){try{return remake();}catch(e2){}}
    return qr;
  }
  function build(wantLogo){
    var order=['L','M','Q','H'],chain,qr=null,used='',lv=0;
    if(wantLogo)chain=['H'];
    else if(o.ecc==='auto')chain=['M','L'];
    else{lv=order.indexOf(o.ecc);chain=order.slice(0,lv+1).reverse();}
    for(var i=0;i<chain.length&&!qr;i++){
      try{holder.innerHTML='';var q=new QRCode(holder,{text:cur,width:128,height:128,correctLevel:QRCode.CorrectLevel[chain[i]]});qr=q._oQRCode;used=chain[i];
          qr=noBom(qr,function(){holder.innerHTML='';return new QRCode(holder,{text:cur,width:128,height:128,correctLevel:QRCode.CorrectLevel[chain[i]]})._oQRCode;});}catch(e){qr=null;}
    }
    if(!qr&&typeof window.qrcode==='function'){   /* nội dung dài: dùng thư viện phụ */
      try{window.qrcode.stringToBytes=function(t){var r=[],k;for(k=0;k<t.length;k++)r.push(t.charCodeAt(k)&255);return r;};}catch(e){}
      var bin=unescape(encodeURIComponent(cur));
      for(var j=0;j<chain.length&&!qr;j++){
        try{var g=window.qrcode(0,chain[j]);g.addData(bin,'Byte');g.make();if(g.getModuleCount()>0){qr=g;used=chain[j];}}catch(e){qr=null;}
      }
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
    if(!b.qr&&typeof window.qrcode!=='function'&&byteLen(cur)>100){off('⚠ Nội dung khá dài nên cần tải thêm thư viện QR (cần mạng). Hãy kiểm tra mạng rồi sửa nhẹ nội dung để thử lại, hoặc rút gọn bớt.');return;}
    if(!b.qr){off('⚠ Nội dung quá dài để tạo mã QR. Hãy rút gọn bớt (với link: dùng bit.ly, tinyurl…) rồi thử lại.');return;}
    var g=geometry(b.qr,wantLogo),S=getSize(),sc=Math.max(2,Math.floor(S/g.tot)),W=sc*g.tot,Hpx=lastFix(g,sc),c=cv.getContext('2d');
    try{
      cv.width=W;cv.height=Hpx;c.clearRect(0,0,W,Hpx);paint(c,g,sc,false);
    }catch(e){off('⚠ Kích thước quá lớn so với thiết bị — hãy chọn cỡ ảnh nhỏ hơn.');return;}
    last={g:g,sc:sc,W:W,Hpx:Hpx};
    cv.style.background=o.tr?'repeating-conic-gradient(#d0d0d0 0% 25%,#fff 0% 50%) 50%/16px 16px':'';
    if(btnMsg)btnMsg.textContent='';cv.style.display='inline-block';mirror(true);dl.disabled=cp.disabled=false;if(shareBtn)shareBtn.disabled=false;
    var cm=(W/300*2.54).toFixed(1);
    say('✅ Đã tạo mã QR ('+W+'×'+Hpx+' px, in 300 dpi ≈ '+cm+' cm). Hãy quét thử bằng điện thoại trước khi dùng.'
        +(logoChk.checked&&!wantLogo?' (Không chèn được logo.)':'')+(wantLogo?' (Có logo → tự dùng mức sửa lỗi cao H.)':'')
        +(warns()?' '+warns():''));
  }
  function refresh(){if(cur)need(render,function(){});}
  function update(){
    if(wifiStr){cur=wifiStr;say('Đang tạo mã QR WiFi…');need(render,function(){off('⚠ Chưa tải được thư viện tạo QR (cần mạng). Hãy kiểm tra mạng rồi thử lại.');});return;}
    if(extraStr&&mode!=='link'&&mode!=='wifi'){cur=extraStr;say('Đang tạo mã QR…');need(render,function(){off('⚠ Chưa tải được thư viện tạo QR (cần mạng). Hãy kiểm tra mạng rồi thử lại.');});return;}
    if(mode==='wifi'){off('Nhập tên WiFi (và mật khẩu) ở phía trên, mã QR sẽ tự hiện.');return;}
    if(mode!=='link'){off('');return;}
    var v=norm(inp.value);
    if(v===''){off('Dán link vào ô trên, mã QR tự hiện ngay.');return;}
    if(v===null){off('⚠ Link chưa hợp lệ — kiểm tra lại (không chứa dấu cách).');return;}
    cur=v;say('Đang tạo mã QR…');need(render,function(){off('⚠ Chưa tải được thư viện tạo QR (cần mạng). Hãy kiểm tra mạng rồi thử lại.');});
  }

  /* ====== GIAO DIỆN TUỲ CHỈNH (tạo bằng JS) ====== */
  var shareBtn=null,btnMsg=null,ui={},customRow=null;
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

  /* ====== WIFI: TẠO MÃ ĐỂ NGƯỜI KHÁC QUÉT + QUÉT MÃ WIFI (camera / ảnh) ====== */
  var gw=group('📶 WiFi — tạo mã & quét mã',false),wd=gw.parentNode;
  var wSsid=el('input',{type:'text',cls:inp.className,placeholder:'Tên WiFi (SSID)',maxLength:32,autocomplete:'off'}),
      wPass=el('input',{type:'text',cls:inp.className,placeholder:'Mật khẩu WiFi',maxLength:63,autocomplete:'off'}),
      wSec=el('select',{cls:size.className}),wHid=el('input',{type:'checkbox'}),
      wPassRow=el('label',{cls:'w'},[el('span',{text:'Mật khẩu'}),wPass]),
      wMsg=el('div',{cls:'sm'}),
      wRes=el('div',{cls:'w',style:'display:none;border:1px solid rgba(125,211,252,.3);border-radius:12px;padding:10px'});
  [['WPA','WPA / WPA2 / WPA3 (phổ biến)'],['WEP','WEP (cũ)'],['nopass','Không mật khẩu']].forEach(function(p){wSec.appendChild(el('option',{value:p[0],text:p[1]}));});

  gw.appendChild(el('div',{cls:'qt w',text:'① Tạo mã để người khác quét và vào WiFi'}));
  gw.appendChild(el('label',{cls:'w'},[el('span',{text:'Tên WiFi'}),wSsid]));
  gw.appendChild(wPassRow);
  gw.appendChild(el('label',{cls:'w'},[el('span',{text:'Kiểu bảo mật'}),wSec]));
  gw.appendChild(el('label',{cls:'w c'},[wHid,el('span',{text:'Mạng WiFi ẩn'})]));
  gw.appendChild(wMsg);

  function wq(v){var e=v.replace(/([\\;,:"])/g,'\\$1');return /^[0-9a-f]+$/i.test(v)?'"'+e+'"':e;}   /* thoát ký tự đặc biệt */
  function wClear(){var had=!!wifiStr;wifiStr='';if(had)update();}
  function wifiGen(){
    var ss=wSsid.value,pw=wPass.value,sec=wSec.value;
    wPassRow.style.display=sec==='nopass'?'none':'';
    if(!ss){wMsg.textContent='Nhập tên WiFi để tạo mã.';wClear();return;}
    if(sec!=='nopass'&&!pw){wMsg.textContent='Nhập mật khẩu WiFi (hoặc chọn "Không mật khẩu").';wClear();return;}
    wifiStr='WIFI:T:'+sec+';S:'+wq(ss)+';'+(sec!=='nopass'?'P:'+wq(pw)+';':'')+(wHid.checked?'H:true;':'')+';';
    wMsg.textContent=(sec==='WPA'&&pw.length<8?'⚠ WPA yêu cầu mật khẩu từ 8 ký tự. ':'')+'Mã WiFi hiện ở phần xem trước phía dưới — ai quét bằng camera điện thoại sẽ được hỏi kết nối. Mật khẩu không được lưu lại trong trình duyệt.';
    clearTimeout(tm);tm=setTimeout(update,150);
  }
  [wSsid,wPass].forEach(function(e){e.addEventListener('input',wifiGen);});
  wSec.addEventListener('change',wifiGen);wHid.addEventListener('change',wifiGen);

  /* --- quét mã --- */
  gw.appendChild(el('div',{cls:'qt w',text:'② Quét mã QR WiFi có sẵn'}));
  var camBtn=el('button',{type:'button',text:'📷 Mở camera quét mã',cls:dl.className}),
      fileScan=el('input',{type:'file',accept:'image/*'}),
      vid=el('video',{muted:true,style:'display:none;width:100%;border-radius:12px;background:#000'});
  vid.setAttribute('playsinline','');
  gw.appendChild(el('div',{cls:'w'},[camBtn]));
  gw.appendChild(vid);
  gw.appendChild(el('label',{cls:'w'},[el('span',{text:'…hoặc chọn ảnh có chứa mã QR'}),fileScan]));
  gw.appendChild(wRes);
  gw.appendChild(el('div',{cls:'sm',text:'Trang web không thể tự kết nối WiFi (do trình duyệt không cho phép). Sau khi quét, bạn sẽ thấy tên và mật khẩu để nhập vào máy.'}));

  var JSQR='https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js',jsLoad=null,bd=null;
  try{if(window.BarcodeDetector)bd=new BarcodeDetector({formats:['qr_code']});}catch(e){bd=null;}
  function needJs(cb,fail){
    if(window.jsQR){cb();return;}
    if(!jsLoad){jsLoad=document.createElement('script');jsLoad.src=JSQR;document.head.appendChild(jsLoad);}
    jsLoad.addEventListener('load',function(){cb();});
    jsLoad.addEventListener('error',function(){jsLoad.parentNode&&jsLoad.parentNode.removeChild(jsLoad);jsLoad=null;fail();});
  }
  function jsDecode(c){
    return new Promise(function(res){needJs(function(){
      try{var d=c.getContext('2d').getImageData(0,0,c.width,c.height),r=window.jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});res(r?r.data:null);}catch(e){res(null);}
    },function(){res(null);});});
  }
  function decodeCv(c){   /* ưu tiên bộ quét có sẵn của trình duyệt, dự phòng jsQR */
    if(bd)return bd.detect(c).then(function(r){return r&&r[0]?r[0].rawValue:jsDecode(c);},function(){return jsDecode(c);});
    return jsDecode(c);
  }

  /* đọc chuỗi WIFI:T:WPA;S:ten;P:matkhau;H:true;; (có xử lý ký tự thoát \) */
  function parseWifi(t){
    if(!/^WIFI:/i.test(t))return null;
    var b=t.slice(5),out={},k='',v='',isKey=true,i,ch;
    for(i=0;i<b.length;i++){
      ch=b.charAt(i);
      if(ch==='\\'&&i+1<b.length){ch=b.charAt(++i);if(isKey)k+=ch;else v+=ch;continue;}
      if(isKey){if(ch===':')isKey=false;else if(ch===';')k='';else k+=ch;}
      else if(ch===';'){out[k.toUpperCase()]=v;k='';v='';isKey=true;}
      else v+=ch;
    }
    if(!isKey&&k)out[k.toUpperCase()]=v;
    function unq(x){x=x||'';return /^".*"$/.test(x)&&x.length>=2?x.slice(1,-1):x;}
    if(!out.S)return null;
    return {ssid:unq(out.S),pass:unq(out.P),sec:out.T||(out.P?'WPA':'nopass'),hidden:/^true$/i.test(out.H||'')};
  }
  function cpy(txt,okMsg){
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(function(){wMsg.textContent='✅ '+okMsg;},function(){wMsg.textContent='Không sao chép được — hãy nhấn giữ vào chữ để chép.';});
    else wMsg.textContent='Trình duyệt không hỗ trợ sao chép — hãy nhấn giữ vào chữ để chép.';
  }
  function showResult(t){
    var w=parseWifi(t);
    wRes.innerHTML='';wRes.style.display='';
    function line(label,val){wRes.appendChild(el('div',{style:'margin:3px 0;word-break:break-all'},[el('b',{text:label+': '}),el('span',{text:val})]));}
    function btn(txt,fn){var b=el('button',{type:'button',text:txt,cls:dl.className,style:'margin:8px 8px 0 0'});b.addEventListener('click',fn);wRes.appendChild(b);}
    if(w){
      wRes.appendChild(el('div',{text:'📶 Đã đọc được mã WiFi',style:'font-weight:700;margin-bottom:4px'}));
      line('Tên WiFi',w.ssid);
      line('Mật khẩu',(w.sec==='nopass'||!w.pass)?'(không có)':w.pass);
      line('Bảo mật',w.sec);
      if(w.hidden)line('Mạng ẩn','có');
      btn('Sao chép tên WiFi',function(){cpy(w.ssid,'Đã sao chép tên WiFi.');});
      if(w.pass)btn('Sao chép mật khẩu',function(){cpy(w.pass,'Đã sao chép mật khẩu — vào Cài đặt › WiFi, chọn mạng rồi dán.');});
      btn('Tạo lại mã QR này',function(){
        wSsid.value=w.ssid;wPass.value=w.pass;wHid.checked=w.hidden;
        wSec.value=/^nopass$/i.test(w.sec)||!w.pass?'nopass':/^wep$/i.test(w.sec)?'WEP':'WPA';wifiGen();
      });
      wRes.appendChild(el('div',{cls:'sm',style:'margin-top:8px',text:'Mẹo: trên iPhone và Android 10 trở lên, quét mã này bằng camera mặc định sẽ có nút "Kết nối" ngay.'}));
    }else{
      wRes.appendChild(el('div',{text:'Đây không phải mã WiFi',style:'font-weight:700;margin-bottom:4px'}));
      line('Nội dung',t);
      if(/^https?:\/\//i.test(t)){wRes.appendChild(el('a',{href:t,target:'_blank',rel:'noopener noreferrer',text:'🔗 Mở liên kết',style:'display:inline-block;margin:8px 8px 0 0'}));}
      btn('Sao chép nội dung',function(){cpy(t,'Đã sao chép nội dung mã.');});
    }
  }

  /* camera */
  var stream=null,scTm=0,scBusy=false,scCv=document.createElement('canvas');
  function stopCam(){
    clearTimeout(scTm);scBusy=false;
    if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}
    vid.srcObject=null;vid.style.display='none';camBtn.textContent='📷 Mở camera quét mã';
  }
  function tick(){
    if(!stream)return;
    if(vid.readyState>=2&&vid.videoWidth&&!scBusy){
      scBusy=true;
      var k=Math.min(1,720/Math.max(vid.videoWidth,vid.videoHeight));
      scCv.width=Math.round(vid.videoWidth*k);scCv.height=Math.round(vid.videoHeight*k);
      scCv.getContext('2d').drawImage(vid,0,0,scCv.width,scCv.height);
      decodeCv(scCv).then(function(t){
        scBusy=false;
        if(t&&stream){stopCam();showResult(t);wMsg.textContent='✅ Đã quét xong.';}
        else if(stream)scTm=setTimeout(tick,150);
      });
    }else scTm=setTimeout(tick,150);
  }
  camBtn.addEventListener('click',function(){
    if(stream){stopCam();return;}
    if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){wMsg.textContent='⚠ Trình duyệt không mở được camera (cần HTTPS). Hãy dùng ô chọn ảnh bên dưới.';return;}
    wMsg.textContent='Đang mở camera…';
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}).then(function(st){
      stream=st;vid.srcObject=st;vid.style.display='block';camBtn.textContent='⏹ Tắt camera';
      var p=vid.play();if(p&&p.catch)p.catch(function(){});
      wRes.style.display='none';wMsg.textContent='Hướng camera vào mã QR WiFi…';tick();
    },function(){wMsg.textContent='⚠ Không mở được camera — hãy cho phép quyền camera, hoặc chọn ảnh có chứa mã.';});
  });

  /* ====== CÁC LOẠI MÃ QR: link / WiFi / văn bản / email / điện thoại / SMS / danh thiếp / vị trí / sự kiện ====== */
  function enc(x){return encodeURIComponent(x);}
  function esc(x){return String(x).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/([,;])/g,'\\$1');}
  function phone(p){p=(p||'').replace(/[\s().\-]/g,'');return /^\+?\d{6,15}$/.test(p)?p:null;}
  function dt(v){return v.replace(/[-:]/g,'')+(v.length===16?'00':'');}
  var FORMS={
    text:{label:'📝 Văn bản',name:'VanBan',hint:'Nhập nội dung văn bản, mã QR sẽ tự hiện.',
      f:[{k:'t',l:'Nội dung văn bản',ta:1,ph:'Nhập nội dung bất kỳ…',max:1000}],
      b:function(v){return v.t?{s:v.t}:null;}},
    email:{label:'✉ Email',name:'Email',hint:'Nhập địa chỉ email nhận để tạo mã.',
      f:[{k:'to',l:'Địa chỉ email nhận',ph:'ten@gmail.com',im:'email'},{k:'sub',l:'Tiêu đề (tuỳ chọn)'},{k:'body',l:'Nội dung thư (tuỳ chọn)',ta:1,max:500}],
      b:function(v){
        if(!v.to)return null;
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.to))return {e:'⚠ Địa chỉ email chưa hợp lệ.'};
        var q=[];if(v.sub)q.push('subject='+enc(v.sub));if(v.body)q.push('body='+enc(v.body));
        return {s:'mailto:'+v.to+(q.length?'?'+q.join('&'):'')};}},
    tel:{label:'📞 Gọi điện',name:'DienThoai',hint:'Nhập số điện thoại để tạo mã. Quét mã sẽ hiện nút gọi.',
      f:[{k:'p',l:'Số điện thoại',ph:'0901234567 hoặc +84901234567',im:'tel'}],
      b:function(v){if(!v.p)return null;var p=phone(v.p);return p?{s:'tel:'+p}:{e:'⚠ Số điện thoại chưa hợp lệ (chỉ gồm số, có thể bắt đầu bằng +).'};}},
    sms:{label:'💬 Tin nhắn SMS',name:'SMS',hint:'Nhập số điện thoại nhận để tạo mã.',
      f:[{k:'p',l:'Số điện thoại nhận',ph:'0901234567',im:'tel'},{k:'m',l:'Nội dung tin nhắn (tuỳ chọn)',ta:1,max:300}],
      b:function(v){if(!v.p)return null;var p=phone(v.p);if(!p)return {e:'⚠ Số điện thoại chưa hợp lệ.'};return {s:'sms:'+p+(v.m?'?body='+enc(v.m):'')};}},
    vcard:{label:'👤 Danh thiếp',name:'DanhThiep',hint:'Nhập họ tên (hoặc số điện thoại) để tạo danh thiếp.',
      f:[{k:'ho',l:'Họ và tên đệm',ph:'Nguyễn Văn'},{k:'ten',l:'Tên',ph:'An'},{k:'tel',l:'Số điện thoại',im:'tel'},{k:'mail',l:'Email',im:'email'},
         {k:'org',l:'Đơn vị / Công ty / Trường'},{k:'job',l:'Chức vụ'},{k:'web',l:'Website'},{k:'adr',l:'Địa chỉ',max:200}],
      b:function(v){
        if(!v.ho&&!v.ten&&!v.tel&&!v.mail)return null;
        if(v.tel&&!phone(v.tel))return {e:'⚠ Số điện thoại chưa hợp lệ.'};
        if(v.mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.mail))return {e:'⚠ Email chưa hợp lệ.'};
        var fn=((v.ho?v.ho+' ':'')+v.ten).trim()||v.org||v.tel||v.mail,L=['BEGIN:VCARD','VERSION:3.0','N:'+esc(v.ho)+';'+esc(v.ten)+';;;','FN:'+esc(fn)];
        if(v.org)L.push('ORG:'+esc(v.org));if(v.job)L.push('TITLE:'+esc(v.job));
        if(v.tel)L.push('TEL;TYPE=CELL:'+phone(v.tel));if(v.mail)L.push('EMAIL:'+v.mail);
        if(v.web)L.push('URL:'+v.web);if(v.adr)L.push('ADR:;;'+esc(v.adr)+';;;;');
        L.push('END:VCARD');return {s:L.join('\r\n')};}},
    geo:{label:'📍 Vị trí',name:'ViTri',hint:'Nhập toạ độ (vd: 10.7769, 106.7009) hoặc bấm nút lấy vị trí hiện tại. Quét mã sẽ tự mở Google Maps tại vị trí đó.',
      f:[{k:'c',l:'Toạ độ: vĩ độ, kinh độ',ph:'10.776889, 106.700806'}],
      b:function(v){
        if(!v.c)return null;
        var m=/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(v.c);
        if(!m||Math.abs(+m[1])>90||Math.abs(+m[2])>180)return {e:'⚠ Toạ độ chưa hợp lệ. Ví dụ: 10.776889, 106.700806 (dán từ Google Maps cũng được).'};
        return {s:'https://www.google.com/maps?q='+(+m[1])+','+(+m[2])};},
      after:function(g,ins,gen){
        var bt=el('button',{type:'button',text:'📍 Lấy vị trí hiện tại của tôi',cls:dl.className}),r=el('div',{cls:'w'},[bt]);
        bt.addEventListener('click',function(){
          if(!navigator.geolocation){say('Thiết bị không hỗ trợ lấy vị trí.');return;}
          bt.disabled=true;
          navigator.geolocation.getCurrentPosition(function(p){bt.disabled=false;ins.c.value=p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6);gen();},
            function(){bt.disabled=false;say('Không lấy được vị trí — hãy cho phép truy cập vị trí hoặc nhập toạ độ thủ công.');},{enableHighAccuracy:true,timeout:15000});
        });
        g.appendChild(r);}},
    social:{label:'💙 Zalo / Facebook / MXH',name:'MangXaHoi',hint:'Chọn nền tảng, nhập số điện thoại hoặc tên người dùng. Quét mã sẽ mở trang/chat của người đó.',
      f:[{k:'pl',l:'Nền tảng',sel:[['zalo','Zalo (theo số điện thoại)'],['facebook','Facebook'],['messenger','Messenger'],['instagram','Instagram'],['tiktok','TikTok'],['whatsapp','WhatsApp'],['telegram','Telegram']]},
         {k:'u',l:'Số điện thoại / tên người dùng',ph:'0901234567'}],
      b:function(v){
        var u=v.u.replace(/^@/,''),US=/^[A-Za-z0-9._\-]{3,60}$/,bad={e:'⚠ Tên người dùng chưa hợp lệ (chỉ gồm chữ, số, dấu chấm, gạch).'},p;
        if(!u)return null;
        switch(v.pl){
          case 'zalo':p=phone(u);return p?{s:'https://zalo.me/'+p.replace('+','')}:{e:'⚠ Số điện thoại chưa hợp lệ.'};
          case 'whatsapp':p=phone(u);if(!p)return {e:'⚠ Số điện thoại chưa hợp lệ.'};p=p.replace('+','');if(p.charAt(0)==='0')p='84'+p.slice(1);return {s:'https://wa.me/'+p};
          case 'facebook':
            if(/^https?:\/\/|facebook\.com|fb\.com/i.test(u)){var l=norm(u);return l?{s:l}:{e:'⚠ Link chưa hợp lệ.'};}
            if(/^\d{8,}$/.test(u))return {s:'https://www.facebook.com/profile.php?id='+u};
            return US.test(u)?{s:'https://www.facebook.com/'+u}:bad;
          case 'messenger':return US.test(u)?{s:'https://m.me/'+u}:bad;
          case 'instagram':return US.test(u)?{s:'https://www.instagram.com/'+u}:bad;
          case 'tiktok':return US.test(u)?{s:'https://www.tiktok.com/@'+u}:bad;
          case 'telegram':return US.test(u)?{s:'https://t.me/'+u}:bad;
        }
        return null;},
      after:function(g,ins){
        var PH={zalo:'Số điện thoại Zalo, vd: 0901234567',facebook:'Tên người dùng, ID hoặc link trang',messenger:'Tên người dùng Facebook / Trang',
                instagram:'tên_người_dùng (không cần @)',tiktok:'tên_người_dùng (không cần @)',whatsapp:'Số điện thoại, vd: 0901234567 hoặc +84901234567',telegram:'tên_người_dùng'};
        function ph(){ins.u.placeholder=PH[ins.pl.value]||'';}
        ins.pl.addEventListener('change',ph);ph();}},
    event:{label:'📅 Sự kiện',name:'SuKien',hint:'Nhập tên sự kiện và thời gian bắt đầu. Quét mã sẽ có nút thêm vào lịch.',
      f:[{k:'t',l:'Tên sự kiện',ph:'Họp phụ huynh'},{k:'s',l:'Bắt đầu',type:'datetime-local'},{k:'e',l:'Kết thúc (tuỳ chọn)',type:'datetime-local'},
         {k:'loc',l:'Địa điểm (tuỳ chọn)'},{k:'d',l:'Mô tả (tuỳ chọn)',ta:1,max:300}],
      b:function(v){
        if(!v.t&&!v.s)return null;
        if(!v.t)return {e:'Nhập tên sự kiện.'};if(!v.s)return {e:'Chọn thời gian bắt đầu.'};
        if(v.e&&v.e<v.s)return {e:'⚠ Thời gian kết thúc phải sau thời gian bắt đầu.'};
        var L=['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','SUMMARY:'+esc(v.t),'DTSTART:'+dt(v.s)];
        if(v.e)L.push('DTEND:'+dt(v.e));if(v.loc)L.push('LOCATION:'+esc(v.loc));if(v.d)L.push('DESCRIPTION:'+esc(v.d));
        L.push('END:VEVENT','END:VCALENDAR');return {s:L.join('\r\n')};}}
  };
  var ORDER=['link','wifi','social','text','email','tel','sms','vcard','geo','event','batch'];
  var qThis=document.getElementById('qrThis'),qPaste=document.getElementById('qrPaste'),
      root=document.getElementById('utQr')||cv.parentNode,hs=[inp,qPaste,qThis],linkEls,
      wifiWrap=el('div',{cls:'qx'}),
      typeSel=el('select',{cls:size.className}),
      tabs=el('div',{cls:'qx'},[el('label',{cls:'w',style:'display:flex;flex-direction:column;gap:4px;margin:10px 0'},[el('span',{text:'Loại mã QR',style:'font-weight:700'}),typeSel])]),formUI={};
  css.textContent+='.qx .tabs{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}'
   +'.qx .tabs button{flex:1 1 calc(50% - 8px);padding:10px 6px;border-radius:12px;border:2px solid rgba(125,211,252,.5);background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}'
   +'.qx .tabs button.on{background:linear-gradient(135deg,#4f46e5,#7c3aed);border-color:transparent;color:#fff}'
   +'.qx textarea{width:100%;max-width:100%;resize:vertical;font:inherit}'
   +'.qx input[type=datetime-local]{width:100%;max-width:100%}';
  /* các phần tử của chế độ "link": ô nhập, nút Dán, nút Link trang này (kèm khung chứa nếu khung chỉ chứa chúng) */
  (function(){
    function onlyHs(P){for(var i=0;i<P.children.length;i++)if(hs.indexOf(P.children[i])<0)return false;return true;}
    var ch=true;
    while(ch){ch=false;hs.slice().forEach(function(n){var P=n.parentNode;
      if(P&&P!==root&&P!==document.body&&hs.indexOf(P)<0&&!P.contains(cv)&&onlyHs(P)){hs.push(P);ch=true;}});}
    linkEls=hs.filter(function(n){return hs.indexOf(n.parentNode)<0;});
    linkEls.sort(function(a,b){return (a.compareDocumentPosition(b)&4)?-1:1;});
  })();
  css.textContent+='.qx{flex:0 0 100%;width:100%;grid-column:1/-1}';
  wifiWrap.appendChild(gw);if(wd.parentNode)wd.parentNode.removeChild(wd);   /* bỏ ô thu gọn, dùng tab thay thế */
  linkEls[0].parentNode.insertBefore(tabs,linkEls[0]);
  var lastLink=linkEls[linkEls.length-1],anc=lastLink,linkPv=el('div',{cls:'qx'});lastLink.parentNode.insertBefore(linkPv,anc.nextSibling);anc=linkPv;
  anc.parentNode.insertBefore(wifiWrap,anc.nextSibling);anc=wifiWrap;

  ORDER.forEach(function(id){
    var lab=id==='link'?'🔗 Tạo mã QR từ link':id==='wifi'?'📶 Tạo mã WiFi':id==='batch'?'📦 Tạo hàng loạt (ZIP)':FORMS[id].label;
    typeSel.appendChild(el('option',{value:id,text:lab}));
  });
  typeSel.addEventListener('change',function(){setMode(typeSel.value,true);});
  Object.keys(FORMS).forEach(function(id){
    var F=FORMS[id],g=el('div',{cls:'g'}),wrap=el('div',{cls:'qx',style:'display:none'},[g]),msg=el('div',{cls:'sm w'}),ins={},t2=0;
    function gen(){
      var v={};F.f.forEach(function(d){v[d.k]=(ins[d.k].value||'').trim();});
      var r=F.b(v);
      if(!r){msg.textContent=F.hint;extraStr='';}
      else if(r.e){msg.textContent=r.e;extraStr='';}
      else{
        var nb=utf8(r.s).length;
        msg.textContent=nb>2300?'⚠ Nội dung dài '+nb+' byte, vượt giới hạn của mã QR (khoảng 2300 byte; chữ có dấu tính 2–3 byte). Hãy rút gọn bớt.':(nb>700?'Nội dung khá dài ('+nb+' byte) — mã sẽ dày, khó quét; nên rút gọn bớt.':'');
        extraStr=r.s;extraName=F.name;}
      update();
    }
    F.f.forEach(function(d){
      var ctl=d.sel?el('select',{cls:size.className}):d.ta?el('textarea',{cls:inp.className,rows:3,maxLength:d.max||1000,placeholder:d.ph||''})
                  :el('input',{type:d.type||'text',cls:inp.className,placeholder:d.ph||'',maxLength:d.max||200,autocomplete:'off'});
      if(d.sel)d.sel.forEach(function(p){ctl.appendChild(el('option',{value:p[0],text:p[1]}));});
      if(d.im)ctl.setAttribute('inputmode',d.im);
      ctl.addEventListener('input',function(){clearTimeout(t2);t2=setTimeout(gen,250);});
      ctl.addEventListener('change',gen);
      ins[d.k]=ctl;g.appendChild(el('label',{cls:'w'},[el('span',{text:d.l}),ctl]));
    });
    if(F.after)F.after(g,ins,gen);
    g.appendChild(msg);msg.textContent=F.hint;
    anc.parentNode.insertBefore(wrap,anc.nextSibling);anc=wrap;
    formUI[id]={wrap:wrap,gen:gen};
  });

  /* ====== TẠO HÀNG LOẠT → FILE ZIP ====== */
  var CRCT=null;
  function crc32(u){
    if(!CRCT){CRCT=[];for(var n=0,c,k;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CRCT[n]=c>>>0;}}
    var c2=0xFFFFFFFF;for(var i=0;i<u.length;i++)c2=CRCT[(c2^u[i])&255]^(c2>>>8);return (c2^0xFFFFFFFF)>>>0;
  }
  function utf8(t){var x=unescape(encodeURIComponent(t)),u=new Uint8Array(x.length);for(var i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u;}
  function u16(v){return [v&255,(v>>>8)&255];}
  function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
  function makeZip(files){   /* ZIP không nén (ảnh QR vốn đã nén), tên file UTF-8 */
    var parts=[],cen=[],pos=0,d=new Date(),tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),
        dd=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
    files.forEach(function(f){
      var nm=utf8(f.name),crc=crc32(f.data),sz=f.data.length;
      var lh=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(tm),u16(dd),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0));
      parts.push(new Uint8Array(lh),nm,f.data);
      var ch=[].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(tm),u16(dd),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(pos));
      cen.push(new Uint8Array(ch),nm);
      pos+=lh.length+nm.length+sz;
    });
    var cs=0;cen.forEach(function(x){cs+=x.length;});
    var end=[].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cs),u32(pos),u16(0));
    return new Blob(parts.concat(cen,[new Uint8Array(end)]),{type:'application/zip'});
  }
  (function(){
    var ta=el('textarea',{cls:inp.className,rows:7,maxLength:30000,placeholder:'Mỗi dòng một mã QR.\nĐặt tên file bằng dấu |\nVí dụ:\nLop10A | https://example.com/10a\nhttps://example.com/10b'}),
        btn=el('button',{type:'button',text:'📦 Tạo tất cả & tải file ZIP',cls:dl.className}),bmsg=el('div',{cls:'sm w'}),
        g=el('div',{cls:'g'},[el('label',{cls:'w'},[el('span',{text:'Danh sách link / nội dung (tối đa 100 dòng)'}),ta]),el('div',{cls:'w'},[btn]),bmsg]),
        wrap=el('div',{cls:'qx',style:'display:none'},[g]),busy=false,HINT='Mỗi dòng một mã. Dòng có dấu cách được tạo thành văn bản, còn lại coi là link. Định dạng file, cỡ ảnh, màu, logo lấy theo cài đặt bên dưới.';
    bmsg.textContent=HINT;
    anc.parentNode.insertBefore(wrap,anc.nextSibling);anc=wrap;
    function done(msg){busy=false;btn.disabled=false;batchAbort=null;bmsg.textContent=msg;off(msg);}
    btn.addEventListener('click',function(){
      if(busy)return;
      var lines=ta.value.split(/\r?\n/).map(function(t){return t.trim();}).filter(Boolean),items=[],i;
      if(!lines.length){bmsg.textContent='Nhập ít nhất một dòng.';return;}
      if(lines.length>100){bmsg.textContent='⚠ Tối đa 100 dòng mỗi lần ('+lines.length+' dòng).';return;}
      for(i=0;i<lines.length;i++){
        var l=lines[i],p=l.indexOf('|'),nm='',v=l,c;
        if(p>0){nm=l.slice(0,p).trim();v=l.slice(p+1).trim();}
        if(!v){bmsg.textContent='⚠ Dòng '+(i+1)+' chưa có nội dung.';return;}
        c=/\s/.test(v)?v:norm(v);
        if(!c){bmsg.textContent='⚠ Dòng '+(i+1)+' chưa hợp lệ.';return;}
        items.push({n:nm,c:c,i:i+1});
      }
      busy=true;btn.disabled=true;wifiStr='';extraStr='';
      var files=[],used={},idx=0,pad=String(items.length).length;
      batchAbort=function(){done('⚠ Trình duyệt chặn xuất ảnh — hãy thử tắt logo hoặc chọn định dạng khác.');};
      function base(it){
        var b=it.n;
        if(!b){try{b=new URL(it.c).hostname;}catch(e){b=it.c;}}
        return b.replace(/[\\\/:*?"<>|\r\n]/g,'_').replace(/\s+/g,'_').slice(0,40)||'ma';
      }
      function next(){
        if(idx>=items.length){
          var z=makeZip(files),a=document.createElement('a');a.href=URL.createObjectURL(z);a.download='QR_hang_loat.zip';document.body.appendChild(a);a.click();
          setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},2000);
          done('✅ Đã tạo '+files.length+' mã QR và tải file ZIP.');return;
        }
        var it=items[idx];cur=it.c;bmsg.textContent='Đang tạo '+(idx+1)+'/'+items.length+'…';
        render();
        if(!last){done('⚠ Dòng '+it.i+' không tạo được mã QR (có thể quá dài).');return;}
        exportBlob(function(b,ext){
          var fr=new FileReader();
          fr.onload=function(){
            var name=('00000'+it.i).slice(-pad)+'_'+base(it),k=name;
            used[k]=(used[k]||0)+1;if(used[k]>1)name+='_'+used[k];
            files.push({name:name+'.'+ext,data:new Uint8Array(fr.result)});idx++;setTimeout(next,0);
          };
          fr.onerror=function(){done('⚠ Không đọc được ảnh vừa tạo.');};
          fr.readAsArrayBuffer(b);
        });
      }
      need2(function(){need(next,function(){done('⚠ Chưa tải được thư viện tạo QR (cần mạng).');});});
    });
    formUI.batch={wrap:wrap,gen:function(){extraStr='';off('Nhập danh sách ở phía trên rồi bấm nút tạo file ZIP.');}};
  })();

  function mkPreview(parent,before){
    var c=document.createElement('canvas'),sd=el('div',{cls:'sm'}),box=el('div',{cls:'w',style:'text-align:center'},[c,sd]);
    c.style.cssText='display:none;width:min(320px,100%);height:auto;margin:10px auto 4px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.35)';
    if(before)parent.insertBefore(box,before);else parent.appendChild(box);
    pvs.push({c:c,s:sd});
  }
  Object.keys(formUI).forEach(function(id){if(id!=='batch')mkPreview(formUI[id].wrap.firstChild);});
  mkPreview(linkPv);pvs[pvs.length-1].s.textContent=stat.textContent;
  /* chỉ giữ MỘT mã QR: ngay dưới ô nhập (ẩn mã + dòng trạng thái ở cuối trang) */
  if(cv.parentNode&&cv.parentNode!==root)cv.parentNode.style.display='none';
  stat.style.display='none';
  (function(){var kids=gw.children,mark=null,i;for(i=0;i<kids.length;i++)if(/^\s*②/.test(kids[i].textContent)){mark=kids[i];break;}mkPreview(gw,mark);})();
  function setMode(m,run){
    mode=m;
    linkEls.forEach(function(e){e.style.display=m==='link'?'':'none';});
    wifiWrap.style.display=m==='wifi'?'':'none';linkPv.style.display=m==='link'?'':'none';
    for(var id in formUI)formUI[id].wrap.style.display=id===m?'':'none';
    typeSel.value=m;
    if(m!=='wifi')stopCam();
    if(!run)return;
    wifiStr='';extraStr='';
    if(m==='link')update();
    else if(m==='wifi'){wifiGen();if(!wifiStr)update();}
    else formUI[m].gen();
  }
  setMode('link',false);
  document.addEventListener('visibilitychange',function(){if(document.hidden)stopCam();});

  /* quét từ ảnh */
  fileScan.addEventListener('change',function(){
    var fl=fileScan.files&&fileScan.files[0];if(!fl)return;
    wMsg.textContent='Đang đọc ảnh…';
    var rd=new FileReader();
    rd.onload=function(){
      var im=new Image();
      im.onload=function(){
        var k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        decodeCv(c).then(function(t){
          if(t){showResult(t);wMsg.textContent='✅ Đã quét xong.';}
          else{wRes.style.display='none';wMsg.textContent='⚠ Không tìm thấy mã QR trong ảnh (hoặc cần mạng để tải bộ quét). Hãy thử ảnh rõ nét hơn.';}
        });
      };
      im.onerror=function(){wMsg.textContent='⚠ Không đọc được ảnh này.';};
      im.src=rd.result;
    };
    rd.readAsDataURL(fl);
  });
  wifiGen();wMsg.textContent='Nhập tên và mật khẩu WiFi để tạo mã QR.';

  /* hàng chọn định dạng file — đặt ngay trên hai nút Tải / Sao chép */
  var FMT={png:['PNG','ảnh PNG'],jpg:['JPG','ảnh JPG'],webp:['WebP','ảnh WebP'],svg:['SVG','file SVG (vector)'],pdf:['PDF','file PDF (A4)']};
  var fmtRow=el('div',{cls:'qx'}),fg=el('div',{cls:'g'});fmtRow.appendChild(fg);
  addSel(fg,'Định dạng file','fmt',[['png','PNG — ảnh (nên dùng)'],['jpg','JPG — ảnh nhẹ, nền trắng'],['webp','WebP — ảnh nhẹ'],['svg','SVG — vector, phóng to không vỡ'],['pdf','PDF — in A4']],true);
  var cin=el('input',{type:'number',cls:inp.className,min:100,max:4000,step:10,placeholder:'100–4000'});
  customRow=el('label',{},[el('span',{text:'Cỡ tuỳ chọn (px)'}),cin]);fg.appendChild(customRow);
  cin.addEventListener('input',function(){o.custom=cin.value;persist();clearTimeout(rtm);rtm=setTimeout(refresh,300);});
  var btnRow=dl.parentNode;btnRow.parentNode.insertBefore(fmtRow,btnRow);
  shareBtn=el('button',{type:'button',text:'📤 Gửi qua Zalo, Messenger…',cls:cp.className,style:'width:100%;margin-top:10px',disabled:true});
  btnRow.parentNode.insertBefore(shareBtn,btnRow.nextSibling);
  btnMsg=el('div',{cls:'note',style:'text-align:center;margin-top:6px'});
  btnRow.parentNode.insertBefore(btnMsg,shareBtn.nextSibling);
  function act(t){say(t);btnMsg.textContent=t;}   /* phản hồi hiện ngay dưới các nút tải/sao chép/gửi */

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
  inp.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(function(){wifiStr='';update();},250);});
  size.addEventListener('change',function(){persist();sync();refresh();});
  logoChk.addEventListener('change',refresh);
  document.getElementById('qrThis').addEventListener('click',function(){wifiStr='';inp.value=location.href.split('#')[0];update();});
  document.getElementById('qrPaste').addEventListener('click',function(){
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(function(t){wifiStr='';inp.value=(t||'').trim();update();},function(){say('Trình duyệt không cho đọc bộ nhớ tạm — hãy nhấn giữ vào ô và chọn Dán.');inp.focus();});
    }else{say('Trình duyệt không hỗ trợ nút Dán — hãy nhấn giữ vào ô và chọn Dán.');inp.focus();}
  });

  /* ====== XUẤT FILE ====== */
  function fname(ext){if(extraStr)return 'QR_'+extraName+'.'+ext;if(wifiStr){var m=/;S:"?([^;]*)/.exec(wifiStr);return 'QR_WiFi_'+((m&&m[1]||'').replace(/[^\w\-]/g,'_').slice(0,30)||'mang')+'.'+ext;}try{return 'QR_'+new URL(cur).hostname.replace(/[^\w.\-]/g,'_')+'.'+ext;}catch(e){return 'QR.'+ext;}}
  function blobErr(){if(batchAbort){var f=batchAbort;batchAbort=null;f();return;}logoChk.checked=false;render();act('⚠ Trình duyệt chặn xuất ảnh khi có logo — đã tắt logo, hãy bấm lại.');}
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
      if(fm==='webp'&&b.type!=='image/webp'){act('ℹ Trình duyệt này không xuất được WebP — đã lưu PNG thay thế.');cb(b,'png');return;}
      cb(b,fm);
    },mime,.95);}catch(e){blobErr();}
  }
  dl.addEventListener('click',function(){
    if(!cur)return;
    exportBlob(function(b,ext){
      var a=document.createElement('a'),nm=fname(ext);a.href=URL.createObjectURL(b);a.download=nm;document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
      act('⬇ Đã tải file '+nm+' (xem trong mục Tải xuống của máy).');
    });
  });
  /* sao chép ảnh PNG vào bộ nhớ tạm; ok=thông báo khi thành công */
  function copyPng(b,ok){
    if(!(navigator.clipboard&&window.ClipboardItem)){act('Trình duyệt chưa hỗ trợ sao chép ảnh — hãy bấm nút Tải rồi gửi file qua Zalo/Messenger.');return;}
    try{navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(function(){act(ok);},function(){act('Không sao chép được — hãy bấm nút Tải rồi gửi file qua Zalo/Messenger.');});}
    catch(e){act('Không sao chép được — hãy bấm nút Tải rồi gửi file qua Zalo/Messenger.');}
  }
  cp.addEventListener('click',function(){
    if(!cur)return;
    try{cv.toBlob(function(b){if(!b){blobErr();return;}copyPng(b,'✅ Đã sao chép ảnh QR — dán (nhấn giữ → Dán, hoặc Ctrl+V) vào Word, PowerPoint, Zalo…');},'image/png');}catch(e){blobErr();}
  });
  /* gửi trực tiếp: mở bảng chia sẻ của điện thoại (chọn Zalo, Messenger, Gmail…). Luôn gửi ảnh PNG để người nhận xem được ngay. */
  if(shareBtn)shareBtn.addEventListener('click',function(){
    if(!cur)return;
    try{cv.toBlob(function(b){
      if(!b){blobErr();return;}
      var file=null;try{file=new File([b],fname('png'),{type:'image/png'});}catch(e){}
      if(file&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:'Mã QR'}).then(function(){act('✅ Đã mở bảng chia sẻ.');},function(e){if(e&&e.name==='AbortError')act('Đã huỷ gửi.');else act('Không mở được bảng chia sẻ — hãy bấm Tải ảnh rồi gửi file qua Zalo/Messenger.');});
      }else copyPng(b,'✅ Máy này chưa mở được bảng chia sẻ nên đã sao chép ảnh QR — mở Zalo/Messenger, nhấn giữ ô chat và chọn Dán (Ctrl+V trên máy tính).');
    },'image/png');}catch(e){blobErr();}
  });
})();
