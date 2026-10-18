/* Tạo mã QR nhanh từ link — tab "Công cụ thường dùng" (mục #utQr trong index.html). Thư viện QR chỉ tải khi dùng. */
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
      dl=document.getElementById('qrDl'),cp=document.getElementById('qrCopy'),holder=document.createElement('div'),cur='',tm=0;
  holder.style.cssText='position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden';document.body.appendChild(holder);
  var logo=new Image();logo.onload=function(){if(cur&&window.QRCode)render();};logo.src='logo.jpg?v=20261005';
  function say(t){stat.textContent=t;}
  function norm(v){
    v=(v||'').trim();if(!v)return '';
    if(!/^[a-z][a-z0-9+.\-]*:/i.test(v))v='https://'+v;
    try{return new URL(v).href;}catch(e){return null;}
  }
  function off(msg){cur='';cv.style.display='none';dl.disabled=cp.disabled=true;say(msg);}
  function render(){
    if(!window.QRCode){off('⚠ Chưa tải được thư viện tạo QR (cần mạng). Hãy tải lại trang rồi thử lại.');return;}
    var wantLogo=logoChk.checked&&logo.complete&&logo.naturalWidth>0,levels=wantLogo?['H','Q']:['M','L'],qr=null,used='';
    for(var i=0;i<levels.length&&!qr;i++){
      try{holder.innerHTML='';var q=new QRCode(holder,{text:cur,width:128,height:128,correctLevel:QRCode.CorrectLevel[levels[i]]});qr=q._oQRCode;used=levels[i];}catch(e){qr=null;}
    }
    if(!qr){off('⚠ Link quá dài để tạo mã QR. Hãy rút gọn link (vd: bit.ly, tinyurl) rồi thử lại.');return;}
    if(wantLogo&&used!=='H')wantLogo=false;
    var n=qr.getModuleCount(),Q=4,tot=n+2*Q,S=parseInt(size.value,10)||512,sc=Math.max(2,Math.floor(S/tot)),W=sc*tot,c=cv.getContext('2d');
    cv.width=cv.height=W;c.fillStyle='#fff';c.fillRect(0,0,W,W);c.fillStyle='#000';
    for(var r=0;r<n;r++)for(var k=0;k<n;k++)if(qr.isDark(r,k))c.fillRect((k+Q)*sc,(r+Q)*sc,sc,sc);
    if(wantLogo){
      var b=Math.round(W*0.2),p=Math.round(b*0.12),x=Math.round((W-b)/2);
      c.fillStyle='#fff';c.fillRect(x-p,x-p,b+2*p,b+2*p);c.drawImage(logo,x,x,b,b);
    }
    cv.style.display='inline-block';dl.disabled=cp.disabled=false;
    say('✅ Đã tạo mã QR ('+W+'×'+W+' px). Hãy quét thử bằng điện thoại trước khi dùng.'+(logoChk.checked&&!wantLogo?' (Không chèn được logo.)':''));
  }
  function update(){
    var v=norm(inp.value);
    if(v===''){off('Dán link vào ô trên, mã QR tự hiện ngay.');return;}
    if(v===null){off('⚠ Link chưa hợp lệ — kiểm tra lại (không chứa dấu cách).');return;}
    cur=v;say('Đang tạo mã QR…');need(render,function(){off('⚠ Chưa tải được thư viện tạo QR (cần mạng). Hãy kiểm tra mạng rồi thử lại.');});
  }
  inp.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(update,250);});
  size.addEventListener('change',function(){if(cur)need(render,function(){});});
  logoChk.addEventListener('change',function(){if(cur)need(render,function(){});});
  document.getElementById('qrThis').addEventListener('click',function(){inp.value=location.href.split('#')[0];update();});
  document.getElementById('qrPaste').addEventListener('click',function(){
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(function(t){inp.value=(t||'').trim();update();},function(){say('Trình duyệt không cho đọc bộ nhớ tạm — hãy nhấn giữ vào ô và chọn Dán.');inp.focus();});
    }else{say('Trình duyệt không hỗ trợ nút Dán — hãy nhấn giữ vào ô và chọn Dán.');inp.focus();}
  });
  function fname(){try{return 'QR_'+new URL(cur).hostname.replace(/[^\w.\-]/g,'_')+'.png';}catch(e){return 'QR.png';}}
  function blobErr(){logoChk.checked=false;render();say('⚠ Trình duyệt chặn xuất ảnh khi có logo — đã tắt logo, hãy bấm lại.');}
  dl.addEventListener('click',function(){
    if(!cur)return;
    try{cv.toBlob(function(b){
      if(!b){blobErr();return;}
      var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fname();document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
    },'image/png');}catch(e){blobErr();}
  });
  cp.addEventListener('click',function(){
    if(!cur)return;
    if(!(navigator.clipboard&&window.ClipboardItem)){say('Trình duyệt chưa hỗ trợ sao chép ảnh — hãy bấm "Tải ảnh PNG".');return;}
    try{cv.toBlob(function(b){
      if(!b){blobErr();return;}
      navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(function(){say('✅ Đã sao chép ảnh QR — dán (Ctrl+V) vào Word, PowerPoint, Zalo…');},function(){say('Không sao chép được — hãy bấm "Tải ảnh PNG".');});
    },'image/png');}catch(e){blobErr();}
  });
})();
