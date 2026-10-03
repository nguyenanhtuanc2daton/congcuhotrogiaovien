/* ===== Khóa Gemini API DÙNG CHUNG: nhập 1 lần – mọi tính năng AI trong trang đều dùng khóa này =====
   Lưu ở localStorage (khóa 'ph_gemini_key_v2') nếu bật "Ghi nhớ trên máy này"; nếu tắt thì chỉ lưu trong phiên (sessionStorage).
   Đồng thời ghi vào 'ph_gemini_key_s' để tương thích mã cũ. Khóa KHÔNG nằm trong file sao lưu. */
(function(){
  var K='ph_gemini_key_v2',SK='ph_gemini_key_s',OLD='tc_gemini_key_v1',R='ph_gemini_remember';
  function rd(st,k){try{return String(window[st].getItem(k)||'').trim();}catch(e){return '';}}
  function wr(st,k,v){try{window[st].setItem(k,v);}catch(e){}}
  function rm(st,k){try{window[st].removeItem(k);}catch(e){}}
  function fire(){try{window.dispatchEvent(new Event('ph-key'));}catch(e){}}
  function remember(){return rd('localStorage',R)!=='0';}
  function get(){return rd('sessionStorage',SK)||rd('localStorage',K);}
  function set(v,keep){
    v=String(v||'').trim(); if(!v) return false;
    if(keep===undefined) keep=remember();
    wr('localStorage',R,keep?'1':'0'); wr('sessionStorage',SK,v);
    if(keep) wr('localStorage',K,v); else rm('localStorage',K);
    rm('localStorage',OLD); fire(); return true;
  }
  function clear(){rm('localStorage',K);rm('localStorage',OLD);rm('sessionStorage',SK);fire();}
  /* chuyển khóa cũ (Chụp bài) sang khóa chung; đưa khóa đã lưu vào phiên */
  (function(){var cur=get(),old=rd('localStorage',OLD);
    if(!cur&&old){wr('localStorage',K,old);wr('sessionStorage',SK,old);rm('localStorage',OLD);}
    else if(cur){wr('sessionStorage',SK,cur);}})();
  /* nếu nơi khác (vd. tab Prompt AI) ghi khóa vào phiên thì đồng bộ sang bộ nhớ lâu dài */
  window.addEventListener('ph-key',function(){var ss=rd('sessionStorage',SK);
    if(ss&&remember()&&rd('localStorage',K)!==ss) wr('localStorage',K,ss); refresh();});
  var $=function(i){return document.getElementById(i);};
  function refresh(){var st=$('gkSt');if(!st)return;var k=get();
    st.textContent=k?'đã nhập ✓ (dùng cho mọi tính năng AI)':'chưa nhập';st.className='gkst '+(k?'ok':'no');
    $('gkDel').style.display=k?'':'none';$('gkBtn').textContent=k?'🔑 Đổi / xem key':'🔑 Nhập key';}
  function open(msg){var b=$('gkBox');if(!b)return;b.hidden=false;$('gkIn').focus();
    $('gkMsg').textContent=msg||'';try{$('gkBar').scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}}
  function build(){
    var hero=document.querySelector('.hero');if(!hero||$('gkBar'))return;
    var d=document.createElement('div');d.id='gkBar';
    d.innerHTML='<div class="gkrow"><span>API key Gemini: <span id="gkSt" class="gkst no">chưa nhập</span></span>'
      +'<button type="button" id="gkBtn" class="sm sec" style="flex:0 0 auto">🔑 Nhập key</button></div>'
      +'<div id="gkBox" hidden style="margin-top:8px"><div class="gkrow">'
      +'<input type="password" id="gkIn" placeholder="Dán API key Gemini (nhập 1 lần, dùng cho mọi tính năng AI)" autocomplete="off" spellcheck="false">'
      +'<button type="button" id="gkSave" class="sm" style="flex:0 0 auto">Lưu</button>'
      +'<button type="button" id="gkDel" class="sm sec" style="flex:0 0 auto">Xóa key</button></div>'
      +'<div class="gkrow" style="margin-top:6px"><label><input type="checkbox" id="gkRem"> Ghi nhớ trên máy này (bỏ chọn nếu dùng máy chung)</label>'
      +'<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Lấy key miễn phí tại Google AI Studio</a></div>'
      +'<div id="gkMsg"></div></div>';
    hero.insertAdjacentElement('afterend',d);
    $('gkRem').checked=remember();
    $('gkBtn').onclick=function(){var b=$('gkBox');b.hidden=!b.hidden;if(!b.hidden)$('gkIn').focus();};
    function save(){var v=$('gkIn').value.trim();
      if(v.length<20||/\s/.test(v)){$('gkMsg').textContent='⚠ Key không hợp lệ — hãy dán đầy đủ key lấy từ Google AI Studio.';return;}
      set(v,$('gkRem').checked);$('gkIn').value='';$('gkMsg').textContent='✓ Đã lưu. Từ giờ không cần nhập lại cho các tính năng AI khác.';
      setTimeout(function(){$('gkBox').hidden=true;},1200);}
    $('gkSave').onclick=save;
    $('gkIn').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();save();}});
    $('gkDel').onclick=function(){clear();$('gkMsg').textContent='Đã xóa key khỏi trình duyệt này.';};
    refresh();
  }
  window.GKEY={get:get,set:set,clear:clear,has:function(){return !!get();},open:open};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
