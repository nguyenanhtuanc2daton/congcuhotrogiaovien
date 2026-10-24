/* =====================================================================
   luu-file-tam.js  —  "Lưu file tạm" (gửi file / thư mục, lấy link tải về)
   - Mở trang https://file.kiwi/vi ngay trong công cụ (khung toàn màn hình).
     Việc lưu file, tạo link, tự xóa file do file.kiwi xử lý; file này chỉ "mở cửa sổ" tới đó
     và giúp ghi nhớ các link đã tạo (lưu trên máy này, tự xóa khi hết hạn).
   - Giao diện luôn hiển thị rõ tên dịch vụ "file.kiwi" + trạng thái kết nối.
   - Chạy trong Shadow DOM nên không va chạm CSS & JS của trang.
   - Gọi tay:  LuuFileTam.open()  |  LuuFileTam.open(2)  |  LuuFileTam.close()
   - Gắn vào nút có sẵn:  data-luu-file  (mở tab Tải lên)  |  data-luu-file="links"  (mở tab Link của tôi)
   - Chỗ hiển thị số link đã lưu:  <span data-luu-count></span>
   - Nhúng vào index.html:  <script src="luu-file-tam.js?v=20261214"></script>
   ===================================================================== */
(function(){
'use strict';
if(window.LuuFileTam)return;

/* ---------- Cấu hình (sửa ở đây) ---------- */
const SITE='https://file.kiwi/vi';   // trang được nhúng
const KEEP_HOURS=90;                 // gói miễn phí của file.kiwi tự xóa sau 90 giờ
const LAUNCHER=false;                // true: thêm nút nổi "☁ file.kiwi"; false: chỉ mở qua nút trong tab "Công cụ thường dùng"
const LAUNCHER_POS={right:'14px',bottom:'92px'};
const CROP_TOP=0;                    // px cắt bớt phía trên trang file.kiwi (logo/tiêu đề) để khu "Chọn Tệp" nằm sát đầu khung. Tăng dần (vd 80, 120) nếu muốn đẩy lên cao hơn
const LOCK_DEFAULT=true;             // true: khóa cuộn khung file.kiwi (không kéo lên/xuống); bấm 🔒 để mở khóa khi cần
const LOAD_TIMEOUT=10000;            // quá thời gian này chưa tải được khung → hiện hướng dẫn mở tab mới
const STORE_KEY='luuFileTam.links.v1';
const LINK_RE=/https?:\/\/(?:[\w-]+\.)*file\.kiwi\/[^\s"'<>]+/i;

/* ---------- Lưu link trên máy này ---------- */
const load=()=>{try{const a=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
const save=a=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(a));return true}catch(e){return false}};
const alive=a=>a.filter(x=>x&&x.url&&Date.now()<x.exp);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- Giao diện (Shadow DOM) ---------- */
const host=document.createElement('div');
host.id='luuFileTamHost';
host.style.cssText='position:fixed;z-index:2147483000;left:0;top:0;width:0;height:0';
const root=host.attachShadow({mode:'open'});
root.innerHTML=`
<style>
*{box-sizing:border-box}
.fab{position:fixed;height:48px;padding:0 16px;border-radius:99px;border:2px solid #f5c542;background:#0f3340;color:#fff;font:700 14px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px #0006;display:flex;align-items:center;gap:6px}
.ov{position:fixed;inset:0;overscroll-behavior:none;touch-action:manipulation;background:#0b1f27;color:#e8f1f3;display:none;flex-direction:column;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.ov.on{display:flex}
.top{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 8px;background:#0f3340;border-bottom:1px solid #1d5666}
.ttl{flex:1;min-width:0}
.ttl h2{margin:0;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip{display:inline-flex;align-items:center;gap:6px;margin-top:3px;padding:2px 10px;border-radius:99px;border:1px solid #f5c542;background:rgba(245,197,66,.12);color:#f5c542;font-size:12.5px;font-weight:700}
.dot{width:8px;height:8px;border-radius:50%;background:#e0a030;flex:none}
.dot.ok{background:#3ecf5a}.dot.bad{background:#ef5350}
.dot.wait{animation:bl 1s infinite}
@keyframes bl{50%{opacity:.25}}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid #1d5666;background:#0b2630;color:#e8f1f3;padding:8px 12px}
button.pri{background:#2f8f2f;border-color:#2f8f2f;color:#fff}
button.sm{padding:6px 10px;font-size:13px}
button.gold{background:#f5c542;border-color:#f5c542;color:#1b1500;font-weight:700}
.tabs{display:flex;gap:6px;padding:8px 10px 0;background:#0b1f27}
.tabs button{flex:1;border-radius:10px 10px 0 0;border-bottom:none;opacity:.7}
.tabs button.on{opacity:1;background:#12404f;border-color:#f5c542}
.cnt{display:inline-block;min-width:20px;padding:0 6px;margin-left:4px;border-radius:99px;background:#f5c542;color:#1b1500;font-size:12px;font-weight:700;text-align:center}
.note{margin:0;padding:8px 12px;font-size:12.5px;color:#b8cfd5;background:#102f3a;border-bottom:1px solid #1d5666}
.note b{color:#f5c542}
.pane{flex:1;min-height:0;display:none;flex-direction:column}
.pane.on{display:flex}
.frwrap{position:relative;flex:1;min-height:0;overflow:hidden;overscroll-behavior:none}
iframe{position:absolute;left:0;top:calc(-1px * var(--crop,0));width:100%;height:calc(100% + 1px * var(--crop,0));border:0;background:#141210}
button.lock.on{background:#f5c542;border-color:#f5c542;color:#1b1500}
.help{display:none;position:absolute;left:10px;right:10px;top:10px;padding:14px;border-radius:12px;background:#3d2c08;border:1px solid #f5c542;color:#ffe2a8;font-size:14px;box-shadow:0 6px 20px #0008}
.help.on{display:block}
.help p{margin:0 0 10px}
.list{flex:1;overflow:auto;padding:12px}
.row{display:flex;gap:8px;margin-bottom:10px}
.row input,.row select{flex:1;min-width:0;padding:10px;border-radius:10px;border:1px solid #1d5666;background:#071820;color:#e8f1f3;font:inherit}
.item{border:1px solid #1d5666;border-radius:12px;padding:10px;margin-bottom:10px;background:#102f3a}
.item.low{border-color:#e0a030}
.item .u{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;word-break:break-all;color:#cfe8ee}
.item .m{font-size:12px;color:#9fbac2;margin:4px 0 8px}
.item .m .t{color:#7be08f;font-weight:700}
.item.low .m .t{color:#ffb74d}
.item .b{display:flex;gap:6px;flex-wrap:wrap}
.empty{color:#9fbac2;text-align:center;padding:24px 8px}
.msg{font-size:13px;color:#f5c542;min-height:18px;margin:0 0 8px}
</style>
<button class="fab" id="fab" type="button" title="Lưu file tạm (file.kiwi)" aria-label="Lưu file tạm (file.kiwi)">☁ <span>file.kiwi</span></button>
<div class="ov" id="ov" role="dialog" aria-label="Lưu file tạm - file.kiwi">
  <div class="top">
    <div class="ttl">
      <h2>☁ Lưu file tạm</h2>
      <span class="chip" title="Dịch vụ lưu file bên ngoài"><i class="dot wait" id="dot"></i><span id="stat">Đang kết nối file.kiwi…</span></span>
    </div>
    <button class="sm lock on" id="lock" type="button" title="Khóa / mở khóa cuộn khung">🔒</button>
    <button class="sm" id="tabOpen" type="button" title="Mở file.kiwi trong tab mới">↗ Tab mới</button>
    <button class="sm" id="reload" type="button" title="Tải lại file.kiwi">↻</button>
    <button class="sm" id="x" type="button" aria-label="Đóng">✕</button>
  </div>
  <div class="tabs">
    <button id="t1" class="on" type="button">⬆ Gửi file</button>
    <button id="t2" type="button">🔗 Link của tôi<span class="cnt" id="cnt">0</span></button>
  </div>
  <div class="pane on" id="p1">
    <div class="frwrap">
      <iframe id="fr" title="file.kiwi" scrolling="no" allow="clipboard-write; clipboard-read; fullscreen" referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"></iframe>
      <div class="help" id="help">
        <p><b>Chưa thấy trang file.kiwi hiện ra?</b> Có thể file.kiwi không cho hiển thị bên trong ứng dụng khác (hoặc mạng đang chậm). Bạn vẫn dùng bình thường:</p>
        <p style="margin:0"><button class="gold" id="helpOpen" type="button">↗ Mở file.kiwi trong tab mới</button> <button class="sm" id="helpWait" type="button">Chờ thêm</button></p>
        <p style="margin:10px 0 0;font-size:12.5px">Gửi file xong, sao chép link rồi quay lại đây — ứng dụng sẽ tự chuyển sang “Link của tôi” để bạn dán và lưu.</p>
      </div>
    </div>
  </div>
  <div class="pane" id="p2">
    <div class="list">
      <p class="note" style="margin:0 0 10px;border-radius:10px;border:1px solid #1d5666">Link được lưu ngay trên máy này (không gửi đi đâu) và tự xóa khỏi danh sách khi file hết hạn trên <b>file.kiwi</b> (khoảng ${KEEP_HOURS} giờ sau khi tạo).</p>
      <div class="row"><input id="inUrl" type="url" inputmode="url" placeholder="Dán link file.kiwi vừa tạo…" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="gold" id="paste" type="button">📋 Dán</button></div>
      <div class="row"><input id="inLab" type="text" placeholder="Ghi chú (vd: Đề cương toán 8)" maxlength="80" autocomplete="off"></div>
      <div class="row"><select id="inAge" aria-label="Link được tạo lúc nào">
        <option value="0">Link vừa tạo xong</option><option value="1">Tạo cách đây 1 giờ</option><option value="6">Tạo cách đây 6 giờ</option>
        <option value="24">Tạo cách đây 1 ngày</option><option value="48">Tạo cách đây 2 ngày</option><option value="72">Tạo cách đây 3 ngày</option></select>
        <button class="pri" id="add" type="button">＋ Lưu</button></div>
      <p class="msg" id="msg"></p>
      <div id="items"></div>
    </div>
  </div>
</div>`;

const $=id=>root.getElementById(id);
const ov=$('ov'),fr=$('fr'),fab=$('fab');
let loaded=false,frameOK=false,tickT=null,loadT=null,wentOut=false,pushed=false,locked=LOCK_DEFAULT;
$('p1').style.setProperty('--crop',CROP_TOP);

Object.assign(fab.style,LAUNCHER_POS);
if(!LAUNCHER)fab.style.display='none';

/* ---------- Trạng thái kết nối ---------- */
function setStat(kind,text){
  const d=$('dot');d.className='dot '+(kind||'');$('stat').textContent=text;
}
function loadFrame(force){
  if(loaded&&!force)return;
  loaded=true;frameOK=false;
  $('help').classList.remove('on');
  setStat('wait','Đang kết nối file.kiwi…');
  clearTimeout(loadT);
  loadT=setTimeout(()=>{if(!frameOK){setStat('bad','Chưa tải được file.kiwi');$('help').classList.add('on')}},LOAD_TIMEOUT);
  fr.src='about:blank';
  setTimeout(()=>{fr.src=SITE},30);
}
fr.addEventListener('load',()=>{
  if(fr.src==='about:blank'||!fr.getAttribute('src')||fr.getAttribute('src')==='about:blank')return;
  frameOK=true;clearTimeout(loadT);
  setStat('ok','Đã kết nối file.kiwi');
  $('help').classList.remove('on');
});

/* ---------- Khóa cuộn khung file.kiwi ---------- */
function applyLock(){
  fr.setAttribute('scrolling',locked?'no':'auto');
  const b=$('lock');b.classList.toggle('on',locked);
  b.textContent=locked?'🔒':'🔓';
  b.title=locked?'Đang khóa cuộn — bấm để mở khóa':'Đang cho cuộn — bấm để khóa';
}
$('lock').onclick=()=>{locked=!locked;applyLock()};
applyLock();

/* ---------- Điều khiển ---------- */
function tab(n){
  $('t1').classList.toggle('on',n===1);$('t2').classList.toggle('on',n===2);
  $('p1').classList.toggle('on',n===1);$('p2').classList.toggle('on',n===2);
  if(n===2)render();
}
function open(n){
  if(!host.isConnected)document.body.appendChild(host);
  n=n===2?2:1;
  const was=ov.classList.contains('on');
  ov.classList.add('on');
  if(n===1)loadFrame();
  tab(n);
  document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  clearInterval(tickT);tickT=setInterval(()=>{render(true)},60000);
  // Nút Back của điện thoại chỉ đóng cửa sổ, không thoát khỏi trang
  if(!was&&!pushed){try{history.pushState({luuFileTam:1},'');pushed=true}catch(e){}}
}
function close(fromPop){
  ov.classList.remove('on');
  document.documentElement.style.overflow='';document.body.style.overflow='';
  clearInterval(tickT);
  if(pushed){pushed=false;if(!fromPop){try{history.back()}catch(e){}}}
  // giữ nguyên khung đã tải: đang tải file lên thì việc tải vẫn tiếp tục khi đóng/mở lại
}
window.addEventListener('popstate',()=>{if(ov.classList.contains('on')&&pushed)close(true)});

/* ---------- Danh sách link ---------- */
function left(ms){
  const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);
  if(h>=24){const d=Math.floor(h/24);return d+' ngày '+(h%24)+' giờ'}
  return h>0?h+' giờ '+m+' phút':Math.max(m,1)+' phút';
}
async function copy(t){
  try{await navigator.clipboard.writeText(t);return true}catch(e){}
  try{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(e){return false}
}
function say(t){const m=$('msg');m.textContent=t;clearTimeout(say.t);say.t=setTimeout(()=>m.textContent='',4000)}
function updateCount(){
  const n=alive(load()).length;
  $('cnt').textContent=n;
  document.querySelectorAll('[data-luu-count]').forEach(e=>e.textContent=n);
}
function render(quiet){
  const all=load(),list=alive(all);
  if(list.length!==all.length)save(list);
  updateCount();
  if(quiet&&!$('p2').classList.contains('on'))return;
  const box=$('items');
  if(!list.length){box.innerHTML='<div class="empty">Chưa có link nào được lưu.<br>Gửi file ở tab “Gửi file”, rồi dán link vào ô phía trên.</div>';return}
  box.innerHTML=list.slice().sort((a,b)=>b.t-a.t).map(x=>{
    const ms=x.exp-Date.now();
    return `<div class="item${ms<6*3600000?' low':''}" data-id="${esc(x.id)}"><div class="u">${esc(x.url)}</div>
     <div class="m">${x.lab?'<b>'+esc(x.lab)+'</b> · ':''}<span class="t">còn khoảng ${left(ms)}</span></div>
     <div class="b"><button class="sm pri" data-a="copy">Sao chép</button><button class="sm" data-a="open">Mở</button><button class="sm" data-a="del">Xóa</button></div></div>`;
  }).join('');
}
function pickLink(text){
  const m=String(text||'').match(LINK_RE);
  return m?m[0].replace(/[)\].,;!?]+$/,''):'';
}
async function paste(auto){
  let t='';
  try{t=await navigator.clipboard.readText()}catch(e){}
  const u=pickLink(t);
  if(u){$('inUrl').value=u;say('Đã dán link từ bộ nhớ tạm. Bấm “＋ Lưu” để lưu.');return true}
  if(!auto)say(t?'Trong bộ nhớ tạm không có link file.kiwi.':'Không đọc được bộ nhớ tạm — hãy nhấn giữ vào ô và chọn Dán.');
  return false;
}
function add(){
  let u=pickLink($('inUrl').value)||$('inUrl').value.trim();
  if(!u){say('Hãy dán link vào ô phía trên.');return}
  if(!/^https?:\/\//i.test(u))u='https://'+u;
  let ok=false;try{ok=/(^|\.)file\.kiwi$/i.test(new URL(u).hostname)}catch(e){}
  if(!ok){say('Đây không phải link file.kiwi. Hãy kiểm tra lại.');return}
  if(u.indexOf('#')<0&&!confirm('Link này thiếu phần sau dấu # (khóa giải mã) nên có thể không mở được. Vẫn lưu?'))return;
  const list=alive(load());
  if(list.some(x=>x.url===u)){say('Link này đã có trong danh sách.');return}
  const age=Math.max(0,+$('inAge').value||0)*3600000,now=Date.now();
  const item={id:now.toString(36)+Math.random().toString(36).slice(2,6),url:u,lab:$('inLab').value.trim(),t:now,exp:now-age+KEEP_HOURS*3600000};
  if(item.exp<=now){say('Link này đã quá hạn, không cần lưu.');return}
  list.push(item);
  if(!save(list)){say('Không lưu được (trình duyệt đang chặn lưu dữ liệu).');return}
  $('inUrl').value='';$('inLab').value='';$('inAge').value='0';say('Đã lưu link.');render();
}

/* ---------- Sự kiện ---------- */
fab.onclick=()=>open(1);
$('x').onclick=()=>close();
$('t1').onclick=()=>tab(1);
$('t2').onclick=()=>tab(2);
function goOut(){wentOut=true;window.open(SITE,'_blank','noopener')}
$('tabOpen').onclick=goOut;
$('helpOpen').onclick=goOut;
$('helpWait').onclick=()=>$('help').classList.remove('on');
$('reload').onclick=()=>{if(confirm('Tải lại file.kiwi để gửi file khác? Link đã tạo vẫn dùng được; nếu đang tải lên dở thì sẽ bị dừng.')){tab(1);loadFrame(true)}};
$('paste').onclick=()=>paste(false);
$('add').onclick=add;
$('inUrl').addEventListener('keydown',e=>{if(e.key==='Enter')add()});
$('items').addEventListener('click',async e=>{
  const b=e.target.closest('button[data-a]');if(!b)return;
  const id=b.closest('.item').dataset.id,list=alive(load()),x=list.find(i=>i.id===id);if(!x)return;
  if(b.dataset.a==='copy')say(await copy(x.url)?'Đã sao chép link.':'Không sao chép được — hãy nhấn giữ vào link để chép.');
  else if(b.dataset.a==='open')window.open(x.url,'_blank','noopener');
  else if(b.dataset.a==='del'){save(list.filter(i=>i.id!==id));render()}
});
// Quay lại từ tab file.kiwi: tự chuyển sang "Link của tôi" và thử dán link vừa sao chép
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!wentOut||!ov.classList.contains('on'))return;
  wentOut=false;tab(2);setTimeout(()=>paste(true).then(ok=>{if(!ok)say('Đã quay lại. Bấm “📋 Dán” để lấy link vừa sao chép.')}),250);
});
window.addEventListener('storage',e=>{if(e.key===STORE_KEY)render(true)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov.classList.contains('on'))close()});
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-luu-file]');
  if(t){e.preventDefault();open(t.getAttribute('data-luu-file')==='links'?2:1)}
});

function start(){document.body.appendChild(host);render(true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.LuuFileTam={open,close,count:()=>alive(load()).length};
})();
