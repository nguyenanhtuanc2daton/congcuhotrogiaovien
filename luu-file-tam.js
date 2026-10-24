/* =====================================================================
   luu-file-tam.js  —  "Lưu file tạm" (gửi file / thư mục lên file.kiwi, lấy link tải về)
   - Bấm nút Upload → hiện khung nhỏ cố định chỉ lộ khu "Chọn Tệp" của https://file.kiwi/vi.
     Chạm vào khung (chọn file) thì khung mở rộng vừa đủ để thấy link + nút SAO CHÉP.
   - Bạn tự bấm SAO CHÉP trong file.kiwi; ngay sau đó đếm ngược rồi tự quay về trang.
   - Việc lưu file, tạo link, tự xóa file do file.kiwi xử lý.
   - Chạy trong Shadow DOM nên không va chạm CSS & JS của trang.
   - Gọi tay:  LuuFileTam.open()  |  LuuFileTam.close()
   - Gắn vào nút có sẵn:  thêm thuộc tính  data-luu-file
   - Nhúng vào index.html:  <script src="luu-file-tam.js?v=20261222"></script>
   ===================================================================== */
(function(){
'use strict';
if(window.LuuFileTam)return;

/* ---------- Cấu hình (sửa ở đây) ---------- */
const SITE='https://file.kiwi/vi';   // trang được nhúng
const LAUNCHER=false;                // true: thêm nút nổi "☁ file.kiwi"
const LAUNCHER_POS={right:'14px',bottom:'92px'};
const PEEK_H=230;                    // chiều cao (px) của khung nhỏ lúc chưa upload
const EXPAND_H=620;                  // chiều cao tối đa (px) của khung sau khi chọn file
const CROP_TOP=330;                  // MẶC ĐỊNH: số px đầu trang file.kiwi (logo, tiêu đề) bị cắt để khu "Chọn Tệp" nằm sát đầu khung. Chỉnh thêm bằng nút ▲▼ trên màn hình
const MID_TOP=90;                    // khi khung nhớ ra sau khi chọn file: số px đầu trang bị cắt (để bảng link/SAO CHÉP của file.kiwi nằm gọn trong khung). Chỉnh bằng ▲▼
const VIEW_H=800;                    // chiều cao cố định của trang file.kiwi trong khung nhỏ (giữ bố cục ổn định mọi máy)
const LOCK_DEFAULT=true;             // true: khóa cuộn khung file.kiwi (không kéo lên/xuống)
const RETURN_SECONDS=15;             // bấm SAO CHÉP link xong → tự quay về trang sau số giây này
const LOAD_TIMEOUT=10000;
const CROP_KEY='luuFileTam.crop.v2';
const CROP_MID_KEY='luuFileTam.cropmid.v1';
const LINK_RE=/https?:\/\/(?:[\w-]+\.)*file\.kiwi\/[^\s"'<>]+/i;

let crop=CROP_TOP,cropMid=MID_TOP;
try{const v=parseInt(localStorage.getItem(CROP_KEY),10);if(!isNaN(v))crop=Math.max(0,v)}catch(e){}
try{const v=parseInt(localStorage.getItem(CROP_MID_KEY),10);if(!isNaN(v))cropMid=Math.max(0,v)}catch(e){}

/* ---------- Giao diện (Shadow DOM) ---------- */
const host=document.createElement('div');
host.id='luuFileTamHost';
host.style.cssText='position:fixed;z-index:2147483000;left:0;top:0;width:0;height:0';
const root=host.attachShadow({mode:'open'});
root.innerHTML=`
<style>
*{box-sizing:border-box}
.fab{position:fixed;height:48px;padding:0 16px;border-radius:99px;border:2px solid #f5c542;background:#0f3340;color:#fff;font:700 14px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px #0006;display:flex;align-items:center;gap:6px}
.ov{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:calc(8px + env(safe-area-inset-top,0px)) 8px calc(8px + env(safe-area-inset-bottom,0px));background:rgba(4,14,19,.8);color:#e8f1f3;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overscroll-behavior:none;touch-action:manipulation}
.ov.on{display:flex}
.card{width:100%;max-width:560px;max-height:100%;display:flex;flex-direction:column;background:#0b1f27;border:1px solid #1d5666;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px #000a}
.card.mid{height:min(100%,${EXPAND_H}px)}
.top{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#0f3340;border-bottom:1px solid #1d5666}
.ttl{flex:1;min-width:0}
.ttl h2{margin:0;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip{display:inline-flex;align-items:center;gap:6px;margin-top:3px;padding:2px 10px;border-radius:99px;border:1px solid #f5c542;background:rgba(245,197,66,.12);color:#f5c542;font-size:12.5px;font-weight:700}
.dot{width:8px;height:8px;border-radius:50%;background:#e0a030;flex:none}
.dot.ok{background:#3ecf5a}.dot.bad{background:#ef5350}
.dot.wait{animation:bl 1s infinite}
@keyframes bl{50%{opacity:.25}}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid #1d5666;background:#0b2630;color:#e8f1f3;padding:8px 12px}
button.sm{padding:6px 10px;font-size:13px}
button.gold{background:#f5c542;border-color:#f5c542;color:#1b1500;font-weight:700}
.xbtn{width:38px;height:38px;padding:0;font-size:18px;line-height:1;border-radius:50%;flex:none}
.pane{display:flex;flex-direction:column;min-height:0;flex:1}
.frwrap{position:relative;overflow:hidden;background:#141210;overscroll-behavior:none}
.card:not(.mid) .frwrap{flex:none;height:${PEEK_H}px}
.card.mid .frwrap{flex:1;min-height:0}
iframe{position:absolute;left:0;width:100%;border:0;background:#141210}
.help{display:none;position:absolute;left:8px;right:8px;top:8px;max-height:calc(100% - 16px);overflow:auto;padding:12px;border-radius:12px;background:#3d2c08;border:1px solid #f5c542;color:#ffe2a8;font-size:13.5px;box-shadow:0 6px 20px #0008}
.help.on{display:block}
.help p{margin:0 0 8px}
.peekbar{display:flex;align-items:center;gap:6px;padding:6px 10px;background:#0f3340;border-top:1px solid #1d5666;font-size:12px;color:#b8cfd5}
.peekbar .sp{flex:1;min-width:0}
.done{display:none;align-items:center;gap:8px;padding:8px 10px;background:#12404f;border-top:2px solid #f5c542;font-size:13.5px}
.done.on{display:flex}.done span{flex:1;min-width:0}
</style>
<button class="fab" id="fab" type="button" title="Lưu file tạm" aria-label="Lưu file tạm">☁ <span>file.kiwi</span></button>
<div class="ov" id="ov" role="dialog" aria-label="Lưu file tạm - file.kiwi">
 <div class="card" id="card">
  <div class="top">
    <div class="ttl">
      <h2>☁ Lưu file tạm</h2>
      <span class="chip" title="Dịch vụ lưu file bên ngoài"><i class="dot wait" id="dot"></i><span id="stat">Đang kết nối với máy chủ…</span></span>
    </div>
    <button class="xbtn" id="x" type="button" aria-label="Đóng" title="Đóng">✕</button>
  </div>
  <div class="pane">
    <div class="frwrap" id="frwrap">
      <iframe id="fr" title="file.kiwi" scrolling="no" allow="clipboard-write; clipboard-read; fullscreen" referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"></iframe>
      <div class="help" id="help">
        <p><b>Chưa thấy file.kiwi?</b> Có thể file.kiwi không cho hiển thị trong ứng dụng khác, hoặc mạng đang chậm.</p>
        <p style="margin:0"><button class="gold sm" id="helpOpen" type="button">↗ Mở trong tab mới</button> <button class="sm" id="helpWait" type="button">Chờ thêm</button></p>
      </div>
    </div>
    <div class="peekbar" id="peekbar">
      <span>Căn khung:</span>
      <button class="sm" data-d="200" type="button" title="Đẩy nội dung lên nhiều">▲▲</button>
      <button class="sm" data-d="40" type="button" title="Đẩy nội dung lên">▲</button>
      <button class="sm" data-d="-40" type="button" title="Đẩy nội dung xuống">▼</button>
      <button class="sm" data-d="-200" type="button" title="Đẩy nội dung xuống nhiều">▼▼</button>
      <span class="sp"></span>
      <button class="sm gold" id="expand" type="button" title="Mở rộng khung">⤢</button>
    </div>
    <div class="done" id="done"><span id="doneTxt"></span><button class="sm gold" id="doneGo" type="button">Về ngay</button><button class="sm" id="doneStay" type="button">Ở lại</button></div>
  </div>
 </div>
</div>`;

const $=id=>root.getElementById(id);
const ov=$('ov'),card=$('card'),fr=$('fr'),fab=$('fab');
let loaded=false,frameOK=false,loadT=null,wentOut=false,pushed=false,expanded=false;

Object.assign(fab.style,LAUNCHER_POS);
if(!LAUNCHER)fab.style.display='none';

/* ---------- Bố cục: khung nhỏ cố định ↔ khung sau khi chọn file ---------- */
function layout(){
  card.classList.toggle('mid',expanded);
  const c=expanded?cropMid:crop;
  fr.style.top=(-c)+'px';
  fr.style.height=Math.max(VIEW_H,c+(expanded?EXPAND_H:PEEK_H)+20)+'px';
  fr.setAttribute('scrolling','no');
  $('expand').textContent=expanded?'⤡':'⤢';
  $('expand').title=expanded?'Thu nhỏ khung':'Mở rộng khung';
}
function expand(){if(expanded)return;expanded=true;layout()}
$('expand').onclick=()=>{expanded=!expanded;layout()};
$('peekbar').addEventListener('click',e=>{
  const b=e.target.closest('button[data-d]');if(!b)return;
  const d=+b.dataset.d;
  if(expanded){cropMid=Math.max(0,Math.min(cropMid+d,3000));try{localStorage.setItem(CROP_MID_KEY,String(cropMid))}catch(err){}}
  else{crop=Math.max(0,Math.min(crop+d,3000));try{localStorage.setItem(CROP_KEY,String(crop))}catch(err){}}
  layout();
});
window.addEventListener('resize',()=>{if(ov.classList.contains('on'))layout()});
/* Chạm "Chọn Tệp": khung GIỮ NGUYÊN nhỏ. Chỉ mở rộng khi bộ chọn file đã đóng lại (bạn quay về từ việc chọn file),
   hoặc sau 12 giây kể từ lúc chạm — để thấy bảng link + nút SAO CHÉP. */
let picking=false,pickT=null;
function pickDone(){if(!picking)return;picking=false;clearTimeout(pickT);setTimeout(()=>{if(ov.classList.contains('on'))expand()},500)}
window.addEventListener('blur',()=>{setTimeout(()=>{
  if(!ov.classList.contains('on')||expanded||picking||root.activeElement!==fr)return;
  picking=true;clearTimeout(pickT);pickT=setTimeout(pickDone,12000);
},200)});
window.addEventListener('focus',pickDone);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!wentOut)pickDone()});

/* ---------- Trạng thái kết nối ---------- */
function setStat(kind,text){const d=$('dot');d.className='dot '+(kind||'');$('stat').textContent=text}
function loadFrame(force){
  if(loaded&&!force)return;
  loaded=true;frameOK=false;
  $('help').classList.remove('on');
  setStat('wait','Đang kết nối với máy chủ…');
  clearTimeout(loadT);
  loadT=setTimeout(()=>{if(!frameOK){setStat('bad','Chưa kết nối được với máy chủ');$('help').classList.add('on')}},LOAD_TIMEOUT);
  fr.src='about:blank';
  setTimeout(()=>{fr.src=SITE},30);
}
fr.addEventListener('load',()=>{
  const s=fr.getAttribute('src');
  if(!s||s==='about:blank')return;
  frameOK=true;clearTimeout(loadT);
  setStat('ok','Đã kết nối với máy chủ của Nguyễn Tuấn');
  $('help').classList.remove('on');
});

/* ---------- Bấm SAO CHÉP xong → tự quay về trang ----------
   file.kiwi là trang của bên khác nên không đọc được nội dung khung. Cách nhận biết: khi bấm SAO CHÉP,
   link mới (có dấu #) nằm trong bộ nhớ tạm → đếm ngược rồi đóng cửa sổ. (Cần cho phép đọc bộ nhớ tạm.) */
let baseLink='',pollT=null,backT=null,polling=false,justCopied=false;
function pickLink(text){
  const m=String(text||'').match(LINK_RE);
  return m?m[0].replace(/[)\].,;!?]+$/,''):'';
}
async function clipLink(){try{return pickLink(await navigator.clipboard.readText())}catch(e){return null}}
async function clipDenied(){try{const p=await navigator.permissions.query({name:'clipboard-read'});return p.state==='denied'}catch(e){return false}}
function stopWatch(){clearInterval(pollT);pollT=null}
async function startWatch(){
  stopWatch();
  if(!navigator.clipboard||!navigator.clipboard.readText||await clipDenied())return;
  const c=await clipLink();baseLink=c||'';
  pollT=setInterval(poll,1500);
}
async function poll(){
  if(polling||backT||!ov.classList.contains('on'))return;
  polling=true;
  try{if(await clipDenied()){stopWatch();return}
    const c=await clipLink();if(c&&c!==baseLink&&c.indexOf('#')>0)copied(c)}
  finally{polling=false}
}
function copied(u){
  baseLink=u;justCopied=true;expand();
  let n=RETURN_SECONDS;
  const upd=()=>{$('doneTxt').textContent='✓ Đã sao chép link. Tự quay về sau '+n+' giây…'};
  setStat('ok','Đã sao chép link');$('done').classList.add('on');upd();
  backT=setInterval(()=>{n--;if(n<=0)close();else upd()},1000);
}
function cancelBack(){clearInterval(backT);backT=null;$('done').classList.remove('on')}
function resetFrame(){loaded=false;frameOK=false;expanded=false;clearTimeout(loadT);$('help').classList.remove('on');fr.src='about:blank';setStat('wait','Sẵn sàng upload')}
$('doneGo').onclick=()=>close();
$('doneStay').onclick=cancelBack;

/* ---------- Điều khiển ---------- */
function open(){
  if(!host.isConnected)document.body.appendChild(host);
  const was=ov.classList.contains('on');
  ov.classList.add('on');
  layout();loadFrame();
  if(!was)startWatch();
  document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  if(!was&&!pushed){try{history.pushState({luuFileTam:1},'');pushed=true}catch(e){}}
}
function close(fromPop){
  ov.classList.remove('on');
  document.documentElement.style.overflow='';document.body.style.overflow='';
  stopWatch();cancelBack();picking=false;clearTimeout(pickT);
  justCopied=false;resetFrame();   // mỗi lần đóng là bỏ khung cũ; lần mở sau luôn là khung mới sạch, upload file khác bình thường
  if(pushed){pushed=false;if(!fromPop){try{history.back()}catch(e){}}}
}
window.addEventListener('popstate',()=>{if(ov.classList.contains('on')&&pushed)close(true)});

/* ---------- Sự kiện ---------- */
fab.onclick=open;
$('x').onclick=()=>close();
function goOut(){wentOut=true;window.open(SITE,'_blank','noopener')}
$('helpOpen').onclick=goOut;
$('helpWait').onclick=()=>$('help').classList.remove('on');
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov.classList.contains('on'))close()});
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-luu-file]');
  if(t){e.preventDefault();open()}
});

function start(){document.body.appendChild(host)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.LuuFileTam={open,close};
})();
