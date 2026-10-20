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
  /* ===== KEY DÙNG THỬ: hết hạn sau 60 phút kể từ lúc lưu; tối đa 10 lượt add/ngày; các key khác vẫn lưu bình thường, không hết hạn ===== */
  var TK='AQ.Ab8RN6LmPoErKQIDkx8g8lul2YxqgnoVlhy4o73v78QzzaaYPg',TMS=60*60*1000,TE='ph_gemini_trial_exp',MAXD=10,TC='ph_gemini_trial_cnt';
  var pendingMsg='',TRIAL_MSG='⏰ Key dùng thử đã hết hạn (60 phút). Vui lòng nhập lại key.';
  function today(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
  function trialCount(){try{var o=JSON.parse(rd('localStorage',TC)||'{}');return o.d===today()?(+o.n||0):0;}catch(e){return 0;}}
  function trialLeftToday(){return Math.max(0,MAXD-trialCount());}
  function trialBump(){wr('localStorage',TC,JSON.stringify({d:today(),n:trialCount()+1}));}
  var LIMIT_MSG='⛔ Đã hết '+MAXD+' lượt dùng thử trong hôm nay. Vui lòng dùng key riêng hoặc quay lại vào ngày mai.';
  function rawKey(){return rd('sessionStorage',SK)||rd('localStorage',K);}
  function isTrial(){return rawKey()===TK;}
  function trialExpired(){
    if(!isTrial()){rm('localStorage',TE);return false;}
    var e=+rd('localStorage',TE);
    if(!e){wr('localStorage',TE,String(Date.now()+TMS));return false;}  /* key dùng thử được ghi từ nơi khác → bắt đầu tính giờ */
    return Date.now()>e;}
  function expireTrial(){
    rm('localStorage',K);rm('localStorage',OLD);rm('sessionStorage',SK);rm('localStorage',TE);
    pendingMsg=TRIAL_MSG;
    setTimeout(function(){fire();if($('gkBox')){open(TRIAL_MSG);pendingMsg='';}},0);}
  function get(){if(trialExpired()){expireTrial();return '';}return rawKey();}
  function set(v,keep){
    v=String(v||'').trim(); if(!v) return false;
    if(v===TK&&trialLeftToday()<=0) return false;  /* hết lượt dùng thử hôm nay */
    if(keep===undefined) keep=remember();
    wr('localStorage',R,keep?'1':'0'); wr('sessionStorage',SK,v);
    if(keep) wr('localStorage',K,v); else rm('localStorage',K);
    if(v===TK){wr('localStorage',TE,String(Date.now()+TMS));trialBump();} else rm('localStorage',TE);
    rm('localStorage',OLD); fire(); return true;
  }
  function clear(){rm('localStorage',K);rm('localStorage',OLD);rm('sessionStorage',SK);rm('localStorage',TE);fire();}
  function copyText(t){
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);
    return new Promise(function(res,rej){try{var a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';
      document.body.appendChild(a);a.select();var ok=document.execCommand('copy');document.body.removeChild(a);ok?res():rej();}catch(e){rej(e);}});}
  /* chuyển khóa cũ (Chụp bài) sang khóa chung; đưa khóa đã lưu vào phiên */
  (function(){var cur=get(),old=rd('localStorage',OLD);
    if(!cur&&old){wr('localStorage',K,old);wr('sessionStorage',SK,old);rm('localStorage',OLD);}
    else if(cur){wr('sessionStorage',SK,cur);}})();
  /* nếu nơi khác (vd. tab Prompt AI) ghi khóa vào phiên thì đồng bộ sang bộ nhớ lâu dài */
  window.addEventListener('ph-key',function(){var ss=rd('sessionStorage',SK);
    if(ss&&remember()&&rd('localStorage',K)!==ss) wr('localStorage',K,ss); refresh();});
  var $=function(i){return document.getElementById(i);};
  var forced=false;   /* true = người dùng đang chủ động mở khung (xem/đổi key) */
  /* Đã có key → ẩn khung, chỉ còn nút tròn 🔑 nhỏ; chưa có key → hiện khung để nhập */
  function apply(){var bar=$('gkBar'),fab=$('gkFab');if(!bar)return;
    var hide=!!get()&&!forced;
    bar.style.display=hide?'none':'';
    bar.classList.toggle('gk-float',forced);
    if(fab)fab.style.display=hide?'flex':'none';
    var c=$('gkClose');if(c)c.style.display=(get()||forced)?'':'none';}
  function refresh(){var st=$('gkSt');if(!st)return;var k=get();
    var left=Math.max(0,Math.ceil(((+rd('localStorage',TE))-Date.now())/60000));
    st.textContent=k?(isTrial()?'đã nhập ✓ (key dùng thử – còn ~'+left+' phút)':'đã nhập ✓ (dùng cho mọi tính năng AI)'):'chưa nhập';st.className='gkst '+(k?'ok':'no');
    $('gkDel').style.display=k?'':'none';$('gkBtn').textContent=k?'🔑 Đổi / xem key':'🔑 Nhập key';apply();}
  function open(msg,quiet){var b=$('gkBox');if(!b)return;forced=true;apply();b.hidden=false;
    $('gkMsg').textContent=msg||'';
    if(!quiet){$('gkIn').focus();try{$('gkBar').scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}}}
  function build(){
    var hero=document.querySelector('.hero');if(!hero||$('gkBar'))return;
    var d=document.createElement('div');d.id='gkBar';
    d.innerHTML='<div class="gkrow"><span>API key Gemini: <span id="gkSt" class="gkst no">chưa nhập</span></span>'
      +'<button type="button" id="gkBtn" class="sm sec" style="flex:0 0 auto">🔑 Nhập key</button>'
      +'<button type="button" id="gkClose" class="sm sec" style="flex:0 0 auto;display:none" title="Thu gọn khung này">▲ Thu gọn</button></div>'
      +'<div id="gkBox" hidden style="margin-top:8px"><div class="gkrow">'
      +'<input type="password" id="gkIn" placeholder="Dán API key Gemini (nhập 1 lần, dùng cho mọi tính năng AI)" autocomplete="off" spellcheck="false">'
      +'<button type="button" id="gkSave" class="sm" style="flex:0 0 auto">Lưu</button>'
      +'<button type="button" id="gkDel" class="sm sec" style="flex:0 0 auto">Xóa key</button>'
      +'<button type="button" id="gkTrial" class="sm sec" style="flex:0 0 auto" title="Copy key dùng thử (hiệu lực 60 phút)">🎁 Key dùng thử</button></div>'
      +'<div class="gkrow" style="margin-top:6px"><label><input type="checkbox" id="gkRem"> Ghi nhớ trên máy này (bỏ chọn nếu dùng máy chung)</label>'
      +'<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Lấy key miễn phí tại Google AI Studio</a></div>'
      +'<div id="gkMsg"></div></div>';
    hero.insertAdjacentElement('afterend',d);
    var st=document.createElement('style');
    st.textContent='#gkFab{position:fixed;left:12px;bottom:calc(100px + env(safe-area-inset-bottom,0px));z-index:9000;width:32px;height:32px;min-width:0;padding:0;margin:0;border-radius:50%;'
      +'display:none;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer;color:#fff;border:2px solid var(--cy,#7dd3fc);background:var(--card2,#0a0f26);box-shadow:0 3px 12px rgba(0,0,0,.4);opacity:.85}'
      +'#gkFab:hover{opacity:1}@media print{#gkFab{display:none!important}}'
      +'#gkBar.gk-float{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);width:min(580px,calc(100vw - 20px));max-height:calc(100vh - 20px);overflow:auto;'
      +'z-index:99999;margin:0;padding:12px 14px;box-sizing:border-box;border-radius:14px;color:var(--fg,#fff);background:var(--card2,#0a2c37);border:2px solid var(--cy,#ffd166);'
      +'box-shadow:0 18px 50px rgba(0,0,0,.6);animation:gkIn .25s ease-out}'
      +'@keyframes gkIn{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}'
      +'@media (prefers-reduced-motion:reduce){#gkBar.gk-float{animation:none}}';
    document.head.appendChild(st);
    var fab=document.createElement('button');fab.id='gkFab';fab.type='button';fab.textContent='🔑';
    fab.title='API key Gemini: đã nhập — bấm để xem/đổi';fab.setAttribute('aria-label',fab.title);
    fab.onclick=function(){open('');};
    document.body.appendChild(fab);
    $('gkClose').onclick=function(){forced=false;$('gkBox').hidden=true;apply();};
    $('gkRem').checked=remember();
    $('gkBtn').onclick=function(){var b=$('gkBox');b.hidden=!b.hidden;if(!b.hidden)$('gkIn').focus();};
    function save(){var v=$('gkIn').value.trim();
      if(v.length<20||/\s/.test(v)){$('gkMsg').textContent='⚠ Key không hợp lệ — hãy dán đầy đủ key lấy từ Google AI Studio.';return;}
      if(v===TK&&trialLeftToday()<=0){$('gkMsg').textContent=LIMIT_MSG;return;}
      forced=true;set(v,$('gkRem').checked);$('gkIn').value='';$('gkMsg').textContent='✓ Đã lưu. Từ giờ không cần nhập lại cho các tính năng AI khác.';
      setTimeout(function(){$('gkBox').hidden=true;forced=false;apply();},1200);}
    $('gkSave').onclick=save;
    $('gkIn').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();save();}});
    $('gkDel').onclick=function(){clear();$('gkMsg').textContent='Đã xóa key khỏi trình duyệt này.';};
    $('gkTrial').onclick=function(){
      if(trialLeftToday()<=0){$('gkMsg').textContent=LIMIT_MSG;return;}
      copyText(TK).then(function(){
        $('gkMsg').textContent='✓ Đã copy key dùng thử. Dán vào ô trên rồi bấm Lưu — key có hiệu lực 60 phút, sau đó phải nhập lại. (Hôm nay còn '+trialLeftToday()+'/'+MAXD+' lượt)';
      }).catch(function(){
        $('gkIn').value=TK;$('gkMsg').textContent='Không copy được nên đã điền sẵn key vào ô — bấm Lưu (hiệu lực 60 phút).';
      });};
    refresh();
    if(pendingMsg){open(pendingMsg);pendingMsg='';}
    else if(!get()){open('Chưa có API key Gemini — dán key rồi bấm Lưu để dùng các tính năng AI.',true);}
  }
  /* Kiểm tra hết hạn định kỳ + khi quay lại tab */
  function tick(){if(trialExpired())expireTrial();else if(isTrial())refresh();}
  setInterval(tick,15000);
  window.addEventListener('focus',tick);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)tick();});
  /* Mọi lời gọi tới Gemini (ở bất kỳ tính năng nào) trả lỗi do key (sai/hết hạn/bị khóa) → khung key tự nổi lên */
  function keyProblem(){var b=$('gkBar');if(!b||b.classList.contains('gk-float'))return;
    open('⚠ Key Gemini đang gặp lỗi (sai, hết hạn hoặc bị khóa). Hãy dán key mới rồi bấm Lưu — khung sẽ tự đóng.');}
  var _f=window.fetch;
  if(typeof _f==='function'){window.fetch=function(){
    var a=arguments,u='';try{u=String((a[0]&&a[0].url)||a[0]);}catch(e){}
    var p=_f.apply(this,a);
    if(u.indexOf('generativelanguage.googleapis.com')<0)return p;
    return p.then(function(r){
      try{if(r&&!r.ok&&(r.status===400||r.status===401||r.status===403)){
        r.clone().text().then(function(t){
          if(r.status!==400||/API_KEY_INVALID|API key not valid|API key expired|key (is )?(invalid|expired)/i.test(t))keyProblem();
        }).catch(function(){});}}catch(e){}
      return r;});
  };}
  window.GKEY={get:get,set:set,clear:clear,has:function(){return !!get();},open:open};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
