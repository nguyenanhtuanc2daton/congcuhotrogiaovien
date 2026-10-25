/* =====================================================================
   luu-file-tam.js — "Lưu file tạm": khung riêng, gửi thẳng lên file.kiwi bằng API công khai (không dùng iframe)
   - Chọn tệp (tối đa 10 tệp/lần) → mã hóa ngay trên máy → tải lên file.kiwi → hiện link + nút SAO CHÉP.
   - Link dạng https://file.kiwi/xxxx#khoa — phần sau dấu # là khóa giải mã, không gửi lên máy chủ.
   - Thời gian lưu và tự xóa do file.kiwi xử lý (khoảng 90 giờ, theo tài liệu API v1 của họ).
   - Mã hóa dùng thư viện wormhole-crypto (RFC 8188), nạp từ jsDelivr.
   - Nếu trình duyệt chặn gọi thẳng api.file.kiwi (CORS) → đặt địa chỉ Worker vào PROXY bên dưới
     (xem filekiwi-proxy-worker.js).
   - Gọi tay:  LuuFileTam.open()  |  LuuFileTam.close()      Gắn vào nút: thêm thuộc tính data-luu-file
   - Nhúng:  <script src="luu-file-tam.js?v=20261223"></script>
   ===================================================================== */
(function(){
'use strict';
if(window.LuuFileTam)return;

/* ---------- Cấu hình ---------- */
const API='https://api.file.kiwi';
const PROXY='';                       // vd: 'https://filekiwi-proxy.ten-ban.workers.dev' (để trống = gọi thẳng)
const CRYPTO_URL='https://cdn.jsdelivr.net/npm/wormhole-crypto@0.2.2/+esm';
const SITE='https://file.kiwi/vi';    // dùng cho nút "Mở file.kiwi" khi có lỗi
const MAX_FILES=10;
const RETRY=3;                        // số lần thử lại mỗi phần khi lỗi mạng
const RETURN_SECONDS=15;              // sao chép link xong → tự đóng sau số giây này
const RETENTION_TEXT='khoảng 90 giờ';

/* ---------- Hàm phụ ---------- */
const enc=new TextEncoder();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const streamOf=b=>new ReadableStream({start(c){c.enqueue(b);c.close()}});
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
async function seal(kc,text){            // mã hóa chuỗi (khóa bí mật, tên tệp) → base64
  const out=await kc.encryptStream(streamOf(enc.encode(text)));
  return b64(new Uint8Array(await new Response(out).arrayBuffer()));
}
async function* pieces(stream,size){     // cắt luồng đã mã hóa thành các phần đúng chunkSize
  const rd=stream.getReader();let buf=new Uint8Array(size),len=0;
  while(true){
    const r=await rd.read();if(r.done)break;
    const v=r.value;let off=0;
    while(off<v.length){
      const n=Math.min(size-len,v.length-off);
      buf.set(v.subarray(off,off+n),len);len+=n;off+=n;
      if(len===size){yield buf;buf=new Uint8Array(size);len=0}
    }
  }
  if(len>0)yield buf.slice(0,len);
}
function fmtSize(n){const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<3){n/=1024;i++}return (i?n.toFixed(n<10?1:0):n)+' '+u[i]}

/* ---------- Giao diện (Shadow DOM) ---------- */
const host=document.createElement('div');
host.id='luuFileTamHost';
host.style.cssText='position:fixed;z-index:2147483000;left:0;top:0;width:0;height:0';
const root=host.attachShadow({mode:'open'});
root.innerHTML=`
<style>
*{box-sizing:border-box}
.ov{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:calc(8px + env(safe-area-inset-top,0px)) 8px calc(8px + env(safe-area-inset-bottom,0px));background:rgba(4,14,19,.8);color:#e8f1f3;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overscroll-behavior:none}
.ov.on{display:flex}
.card{width:100%;max-width:440px;max-height:100%;display:flex;flex-direction:column;background:#0b1f27;border:1px solid #1d5666;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px #000a}
.top{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#0f3340;border-bottom:1px solid #1d5666}
.ttl{flex:1;min-width:0}
.ttl h2{margin:0;font-size:16px;line-height:1.3}
.chip{display:inline-flex;align-items:center;gap:6px;margin-top:3px;padding:2px 10px;border-radius:99px;border:1px solid #f5c542;background:rgba(245,197,66,.12);color:#f5c542;font-size:12.5px;font-weight:700;max-width:100%}
.chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;background:#e0a030;flex:none}
.dot.ok{background:#3ecf5a}.dot.bad{background:#ef5350}
.dot.wait{animation:bl 1s infinite}
@keyframes bl{50%{opacity:.25}}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid #1d5666;background:#0b2630;color:#e8f1f3;padding:8px 12px}
button.sm{padding:6px 10px;font-size:13px}
button.gold{background:#f5c542;border-color:#f5c542;color:#1b1500;font-weight:700}
.xbtn{width:38px;height:38px;padding:0;font-size:18px;line-height:1;border-radius:50%;flex:none}
.body{padding:16px 14px;overflow:auto;background:#141210;min-height:0}
.view{display:none}
.card[data-view=idle] .v-idle,.card[data-view=busy] .v-busy,.card[data-view=done] .v-done,.card[data-view=err] .v-err{display:block}
.note{margin:0 0 14px;text-align:center;color:#a9a39a;font-size:13.5px}
.pick{display:block;width:100%;padding:16px;font-size:20px;font-weight:700;color:#fff;background:#5fa800;border:2px solid #4b8600;border-radius:12px}
.drop{border:2px dashed #3b4a4f;border-radius:14px;padding:18px 12px;text-align:center}
.drop.hot{border-color:#f5c542;background:rgba(245,197,66,.06)}
.hint{margin:10px 0 0;text-align:center;color:#8f8a82;font-size:12.5px}
.list{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:8px}
.li{background:#1b1815;border:1px solid #2c2a26;border-radius:10px;padding:8px 10px}
.li .nm{display:flex;gap:8px;justify-content:space-between;font-size:13.5px}
.li .nm b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.li .nm i{font-style:normal;color:#a9a39a;flex:none}
.bar{height:6px;margin-top:6px;border-radius:99px;background:#2c2a26;overflow:hidden}
.bar>div{height:100%;width:0;background:#5fa800;transition:width .2s}
.sum{text-align:center;color:#d8d2c8;font-size:14px;margin:0 0 6px}
.linkbox{width:100%;padding:10px;border-radius:10px;border:1px solid #1d5666;background:#0b2630;color:#e8f1f3;font:13px/1.3 ui-monospace,Menlo,Consolas,monospace}
.row{display:flex;gap:8px;margin-top:10px}
.row button{flex:1}
.ok{color:#7ee08f;text-align:center;font-weight:700;margin:0 0 10px}
.err{background:#3a1616;border:1px solid #ef5350;color:#ffd0cf;border-radius:10px;padding:10px 12px;font-size:13.5px;margin:0 0 10px;word-break:break-word}
.done-bar{display:none;align-items:center;gap:8px;margin-top:12px;padding:8px 10px;background:#12404f;border:1px solid #f5c542;border-radius:10px;font-size:13.5px}
.done-bar.on{display:flex}.done-bar span{flex:1;min-width:0}
</style>
<div class="ov" id="ov" role="dialog" aria-label="Lưu file tạm">
 <div class="card" id="card" data-view="idle">
  <div class="top">
    <div class="ttl">
      <h2>☁ Đã kết nối tới máy chủ của Nguyễn Tuấn</h2>
      <span class="chip"><i class="dot ok" id="dot"></i><span id="stat">Sẵn sàng</span></span>
    </div>
    <button class="xbtn" id="x" type="button" aria-label="Đóng" title="Đóng">✕</button>
  </div>
  <div class="body">
    <div class="view v-idle">
      <div class="drop" id="drop">
        <p class="note">Tệp được mã hóa ngay trên máy bạn rồi mới gửi đi. Tối đa ${MAX_FILES} tệp mỗi lần.</p>
        <button class="pick" id="pick" type="button">📦 Chọn Tệp</button>
        <p class="hint">hoặc kéo thả tệp vào đây · lưu ${RETENTION_TEXT}</p>
      </div>
      <input type="file" id="inp" multiple hidden>
    </div>
    <div class="view v-busy">
      <p class="sum" id="sum"></p>
      <ul class="list" id="list"></ul>
      <button class="sm" id="cancel" type="button" style="width:100%">Hủy</button>
    </div>
    <div class="view v-done">
      <p class="ok">✓ Đã tải lên xong</p>
      <input class="linkbox" id="link" type="text" readonly>
      <div class="row"><button class="gold" id="copy" type="button">SAO CHÉP</button><button id="more" type="button">Gửi thêm tệp</button></div>
      <p class="hint" id="keep"></p>
      <div class="done-bar" id="doneBar"><span id="doneTxt"></span><button class="sm gold" id="doneGo" type="button">Về ngay</button><button class="sm" id="doneStay" type="button">Ở lại</button></div>
    </div>
    <div class="view v-err">
      <div class="err" id="errTxt"></div>
      <div class="row"><button class="gold" id="retry" type="button">Thử lại</button><button id="out" type="button">↗ Mở file.kiwi</button></div>
    </div>
  </div>
 </div>
</div>`;

const $=id=>root.getElementById(id);
const ov=$('ov'),card=$('card');
let busy=false,pushed=false,ac=null,lastFiles=null,viaProxy=false,backT=null,libP=null;

function setView(v){card.dataset.view=v}
function setStat(kind,text){$('dot').className='dot '+(kind||'');$('stat').textContent=text}

/* ---------- Gọi API ---------- */
function loadLib(){return libP||(libP=import(CRYPTO_URL).catch(e=>{libP=null;throw new Error('Không nạp được thư viện mã hóa (kiểm tra mạng). '+(e&&e.message||'')) }))}
async function callApi(path,opt){
  if(!viaProxy){
    try{return await fetch(API+path,opt)}
    catch(e){if(!PROXY||(opt.signal&&opt.signal.aborted))throw e;viaProxy=true}
  }
  return fetch(PROXY+'/api'+path,opt);
}
async function putOnce(url,headers,body,signal){
  let r;
  if(!viaProxy){
    try{r=await fetch(url,{method:'PUT',headers,body,signal})}
    catch(e){if(!PROXY||(signal&&signal.aborted))throw e;viaProxy=true}
  }
  if(viaProxy)r=await fetch(PROXY+'/put?u='+encodeURIComponent(url),{method:'PUT',headers,body,signal});
  if(!r.ok)throw new Error('Máy chủ lưu trữ trả lỗi '+r.status);
}
async function putChunk(url,headers,body,signal){
  for(let t=1;;t++){
    try{return await putOnce(url,headers,body,signal)}
    catch(e){if((signal&&signal.aborted)||t>=RETRY)throw e;await sleep(1000*t)}
  }
}
async function apiError(r){
  let j={};try{j=await r.json()}catch(e){}
  if(r.status===403&&j.error==='upload_file_type_not_allowed'){
    const ex=Array.isArray(j.extensions)?' ('+j.extensions.join(', ')+')':'';
    return new Error('file.kiwi không cho gửi loại tệp chạy/cài đặt'+ex+'. Hãy nén thành .zip rồi gửi lại.');
  }
  return new Error((j.error||j.message||'Lỗi máy chủ')+' (mã '+r.status+')');
}

/* ---------- Tải lên ---------- */
function buildList(files){
  const ul=$('list');ul.textContent='';
  return files.map(f=>{
    const li=document.createElement('li');li.className='li';
    const nm=document.createElement('div');nm.className='nm';
    const b=document.createElement('b');b.textContent=f.name;
    const i=document.createElement('i');i.textContent=fmtSize(f.size);
    nm.append(b,i);
    const bar=document.createElement('div');bar.className='bar';
    const fill=document.createElement('div');bar.append(fill);
    li.append(nm,bar);ul.append(li);
    return fill;
  });
}
async function run(files){
  if(busy)return;
  files=Array.from(files);
  if(!files.length)return;
  if(files.length>MAX_FILES){fail(new Error('Chỉ gửi tối đa '+MAX_FILES+' tệp mỗi lần.'));return}
  if(files.some(f=>!f.size)){fail(new Error('Có tệp rỗng (0 byte), không gửi được.'));return}
  lastFiles=files;busy=true;ac=new AbortController();
  const sig=ac.signal;
  const fills=buildList(files);
  const totalSize=files.reduce((a,x)=>a+x.size,0);
  $('sum').textContent='Đang chuẩn bị…';
  setView('busy');setStat('wait','Đang mã hóa & kết nối…');
  try{
    const {Keychain}=await loadLib();
    const kc=new Keychain();
    const secret=kc.keyB64;
    const ske=await seal(kc,secret);
    const metas=[];
    for(const f of files){
      const m={filename:await seal(kc,f.name),filesize:f.size};
      if(f.type)m.mimetype=f.type;
      metas.push(m);
    }
    const r=await callApi('/v2/folders',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({title:'Lưu file tạm',mode:'send',encryption:{ske},files:metas}),signal:sig});
    if(!r.ok)throw await apiError(r);
    const j=await r.json();
    if(!j.folderId||!Array.isArray(j.files)||j.files.length!==files.length)throw new Error('Máy chủ trả về dữ liệu không như mong đợi.');
    for(let i=0;i<files.length;i++){
      const f=files[i],info=j.files[i],u=info.uploadUrls;
      $('sum').textContent='Đang tải tệp '+(i+1)+'/'+files.length+'…';
      setStat('wait','Đang tải lên '+(i+1)+'/'+files.length+' · 0%');
      const stream=await kc.encryptStream(f.stream());
      const base=u.head.replace(/\/?$/,'/')+u.path+'/';
      let n=0;
      const before=files.slice(0,i).reduce((a,x)=>a+x.size,0);
      for await(const piece of pieces(stream,info.chunkSize)){
        n++;
        if(n>info.chunks)throw new Error('Số phần dữ liệu không khớp với máy chủ.');
        const url=base+String(n).padStart(5,'0')+'?'+u.tail+'&X-Amz-Signature='+u.signatures[n-1];
        await putChunk(url,u.headers,piece,sig);
        fills[i].style.width=Math.round(n/info.chunks*100)+'%';
        const pct=Math.min(100,(before+f.size*n/info.chunks)/totalSize*100);
        setStat('wait','Đang tải lên '+(i+1)+'/'+files.length+' · '+pct.toFixed(pct<10||totalSize>1073741824?1:0)+'%');
      }
      if(n!==info.chunks)throw new Error('Thiếu phần dữ liệu khi tải lên.');
      let okFile=false;
      for(let t=0;t<4&&!okFile;t++){
        const s=await callApi('/v2/folders/'+j.folderId+'/files/'+info.fileId+'/upload-status?uploadAuth='+encodeURIComponent(j.uploadAuth||''),{signal:sig});
        if(s.ok){const sj=await s.json();okFile=!!sj.complete}
        if(!okFile)await sleep(1500);
      }
      if(!okFile)throw new Error('file.kiwi chưa xác nhận đã nhận đủ tệp "'+f.name+'". Hãy thử lại.');
      fills[i].style.width='100%';
    }
    const base=j.folderUrlBase||String(j.folderUrl||'').split('#')[0];
    $('link').value=base+'#'+secret;
    $('keep').textContent='Tệp được lưu '+RETENTION_TEXT+' rồi tự xóa. Chỉ ai có đủ link (kể cả phần sau dấu #) mới mở được.';
    setStat('ok','Đã tải lên xong');setView('done');
  }catch(e){
    if(sig.aborted)return;
    fail(e);
  }finally{busy=false}
}
function fail(e){
  let m=(e&&e.message)||String(e);
  if(e instanceof TypeError)m='Không kết nối được tới file.kiwi (có thể mạng lỗi hoặc trình duyệt chặn truy cập trực tiếp). '+(PROXY?'':'Cần cấu hình PROXY — xem filekiwi-proxy-worker.js. ')+'Chi tiết: '+m;
  $('errTxt').textContent=m;
  setStat('bad','Có lỗi');setView('err');
}

/* ---------- Sao chép & tự quay về ---------- */
function cancelBack(){clearInterval(backT);backT=null;$('doneBar').classList.remove('on')}
async function copyLink(){
  const t=$('link').value;let ok=false;
  try{await navigator.clipboard.writeText(t);ok=true}catch(e){}
  if(!ok){try{const el=$('link');el.focus();el.select();ok=document.execCommand('copy')}catch(e){}}
  if(!ok){$('link').select();$('doneTxt').textContent='Hãy nhấn giữ vào link để sao chép thủ công.';$('doneBar').classList.add('on');return}
  let n=RETURN_SECONDS;
  const upd=()=>{$('doneTxt').textContent='✓ Đã sao chép link. Tự quay về sau '+n+' giây…'};
  cancelBack();$('doneBar').classList.add('on');upd();
  backT=setInterval(()=>{n--;if(n<=0)close();else upd()},1000);
}
$('copy').onclick=copyLink;
$('doneGo').onclick=()=>close();
$('doneStay').onclick=cancelBack;
$('more').onclick=()=>{cancelBack();resetUI()};
$('retry').onclick=()=>{if(lastFiles)run(lastFiles);else resetUI()};
$('out').onclick=()=>window.open(SITE,'_blank','noopener');
$('cancel').onclick=()=>{if(ac)ac.abort();busy=false;resetUI()};

/* ---------- Chọn tệp ---------- */
const inp=$('inp'),drop=$('drop');
$('pick').onclick=()=>{inp.value='';inp.click()};
inp.onchange=()=>{if(inp.files&&inp.files.length)run(inp.files)};
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('hot')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('hot')}));
drop.addEventListener('drop',e=>{if(e.dataTransfer&&e.dataTransfer.files.length)run(e.dataTransfer.files)});

/* ---------- Điều khiển ---------- */
function resetUI(){setView('idle');setStat('ok','Sẵn sàng');$('link').value='';lastFiles=null}
function open(){
  if(!host.isConnected)document.body.appendChild(host);
  const was=ov.classList.contains('on');
  ov.classList.add('on');
  if(!was&&!busy)resetUI();
  document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  if(!was&&!pushed){try{history.pushState({luuFileTam:1},'');pushed=true}catch(e){}}
}
function close(fromPop){
  if(busy&&!confirm('Đang tải lên. Đóng bây giờ sẽ hủy việc tải. Vẫn đóng?')){
    if(fromPop&&pushed){try{history.pushState({luuFileTam:1},'')}catch(e){}}
    return;
  }
  if(ac)ac.abort();
  busy=false;cancelBack();
  ov.classList.remove('on');
  document.documentElement.style.overflow='';document.body.style.overflow='';
  resetUI();
  if(pushed){pushed=false;if(!fromPop){try{history.back()}catch(e){}}}
  try{window.dispatchEvent(new CustomEvent('luufiletam:close'))}catch(e){}
}
window.addEventListener('popstate',()=>{if(ov.classList.contains('on')&&pushed)close(true)});
$('x').onclick=()=>close();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov.classList.contains('on'))close()});
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-luu-file]');
  if(t){e.preventDefault();open()}
});

function start(){document.body.appendChild(host)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.LuuFileTam={open,close};
})();
