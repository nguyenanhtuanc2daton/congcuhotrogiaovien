/* =====================================================================
   luu-file-tam.js — "Lưu file tạm": khung riêng, gửi thẳng lên file.kiwi bằng API công khai (không dùng iframe)
   - Chọn tệp / thư mục (hoặc kéo thả) → mã hóa ngay trên máy → tải lên file.kiwi → hiện link + nút SAO CHÉP/CHIA SẺ.
   - Link dạng https://file.kiwi/xxxx#khoa — phần sau dấu # là khóa giải mã, không gửi lên máy chủ.
   - Tải tiếp được khi bị đứt giữa chừng (chọn lại đúng tệp đó trong vòng ~34 giờ, trên cùng trình duyệt).
   - Hiện phần trăm, tốc độ và thời gian còn lại. Nhiều tệp/thư mục có thể gộp thành 1 file .zip.
   - Chỉ dùng file.kiwi (đã bỏ đường dự phòng Litterbox). Sau khi gửi xong sẽ chờ file.kiwi xác nhận tối đa ~2 phút và tự gửi bù phần còn thiếu.
   - Mã hóa dùng thư viện wormhole-crypto (RFC 8188), nạp từ jsDelivr.
   - Nếu trình duyệt chặn gọi thẳng api.file.kiwi (CORS) → đặt địa chỉ Worker vào PROXY bên dưới
     (xem filekiwi-proxy-worker.js).
   - Gửi từng phần một (PARALLEL=1) theo đúng giới hạn của file.kiwi; thứ tự: phần đầu, phần cuối, rồi các phần giữa (để xem trước video).
   - Giữ máy không ngủ (Wake Lock) khi đang tải + cảnh báo khi lỡ tắt/tải lại tab.
   - Lịch sử link đã gửi: lưu trên máy (localStorage), kèm giờ hết hạn, nút sao chép / QR / xóa.
   - Mã QR cho link (bộ tạo QR gọn nằm ngay trong file này, không cần file khác).
   - Gọi tay:  LuuFileTam.open()  |  LuuFileTam.close()      Gắn vào nút: thêm thuộc tính data-luu-file
   ===================================================================== */
(function(){
'use strict';
if(window.LuuFileTam)return;

/* ---------- Cấu hình ---------- */
const API='https://api.file.kiwi';
const PROXY='';                       // vd: 'https://filekiwi-proxy.ten-ban.workers.dev' (để trống = gọi thẳng)
const CRYPTO_URL='https://cdn.jsdelivr.net/npm/wormhole-crypto@0.2.2/+esm';
const SITE='https://file.kiwi/vi';    // dùng cho nút "Mở file.kiwi" khi có lỗi
const MAX_FILES=10;                   // số tệp riêng lẻ tối đa mỗi lần (gộp .zip thì không giới hạn)
const RETRY=3;                        // số lần thử lại mỗi phần khi lỗi mạng
const RETURN_SECONDS=15;              // sao chép link xong → tự đóng sau số giây này
const RETENTION_TEXT='khoảng 90 giờ';
const RESUME_KEY='luuFileTam.resume.v1';
const RESUME_MAX_MS=34*3600*1000;     // link tải lên của file.kiwi hết hạn sau 36 giờ
const KEEPALIVE_MS=20*60*1000;        // báo "còn đang tải" để file.kiwi không xóa giữa chừng
const PARALLEL=1;                     // file.kiwi chỉ cho gửi 1 phần mỗi lúc (theo tài liệu API v2); gửi song song làm máy chủ không ghi nhận phần nào
const HIST_KEY='luuFileTam.history.v1';
const HIST_MAX=30;                    // số link nhớ tối đa
const KIWI_MS=90*3600*1000;           // khớp RETENTION_TEXT
const CONFIRM_TRIES=15;               // số lần hỏi file.kiwi "đã nhận đủ chưa" sau khi gửi xong
const CONFIRM_GAP_MS=3000;            // cách nhau 3 giây → chờ tối đa ~45 giây

/* ---------- Hàm phụ ---------- */
const enc=new TextEncoder();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const streamOf=b=>new ReadableStream({start(c){c.enqueue(b);c.close()}});
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
const toHex=u=>Array.from(u,x=>x.toString(16).padStart(2,'0')).join('');
const fromHex=h=>Uint8Array.from(h.match(/../g)||[],x=>parseInt(x,16));
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
/* Gửi nhiều phần cùng lúc (tối đa limit). Có phần lỗi (vd máy chủ không cho song song) → đợi xong việc đang chạy,
   rồi gửi lại các phần lỗi từng phần một; lỗi tiếp thì báo lỗi. run() phải tự thử lại mạng bên trong. */
function parSender(limit,sig){
  const fly=new Set(),bad=[];let par=limit;
  const drain=async()=>{
    while(fly.size)await Promise.race(fly);
    if(!bad.length)return;
    if(par===1)throw bad[0].e;
    par=1;
    for(const b of bad.splice(0))await b.run();
  };
  return{
    async add(run){
      if(bad.length)await drain();
      while(fly.size>=par)await Promise.race(fly);
      const job=async()=>{try{await run()}catch(e){if(sig&&sig.aborted)throw e;bad.push({run,e})}};
      let p;p=job().finally(()=>fly.delete(p));p.catch(()=>{});fly.add(p);
    },
    finish:drain
  };
}
function fmtSize(n){const u=['B','KB','MB','GB','TB'];let i=0;while(n>=1024&&i<4){n/=1024;i++}return (i?n.toFixed(n<10?1:0):n)+' '+u[i]}
function fmtTime(s){
  if(s<60)return Math.max(1,Math.ceil(s))+' giây';
  if(s<3600)return Math.round(s/60)+' phút';
  const h=Math.floor(s/3600),m=Math.round((s%3600)/60);
  return h+' giờ'+(m?' '+m+' phút':'');
}
function stamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())}

/*==HELPERS==*/
/* ----- CRC32 (cho file .zip) ----- */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crcUpdate(c,buf){const T=CRC_T;for(let i=0,n=buf.length;i<n;i++)c=T[(c^buf[i])&255]^(c>>>8);return c>>>0}

/* ----- ZIP "store" (không nén), ghi theo luồng, tự dùng ZIP64 khi cần (>4 GB) ----- */
function dosDT(ms){const d=new Date(ms||Date.now());const y=Math.max(1980,d.getFullYear());return[((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,(((y-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF]}
function zipLayout(entries,z64){let off=0,cd=0;for(const e of entries){const n=e.nameBytes.length;off+=30+n+(z64?20:0)+e.size+(z64?24:16);cd+=46+n+(z64?28:0)}return off+cd+(z64?98:22)}
function zipPlan(entries,force64){
  let z64=!!force64,total=zipLayout(entries,z64);
  if(!z64&&(total>=0xFFFFFFFF||entries.length>=0xFFFF||entries.some(e=>e.size>=0xFFFFFFFF))){z64=true;total=zipLayout(entries,true)}
  return{z64,total};
}
function zLocal(e,z64){
  const n=e.nameBytes.length,b=new Uint8Array(30+n+(z64?20:0)),v=new DataView(b.buffer),[t,d]=dosDT(e.mtime);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,z64?45:20,true);v.setUint16(6,0x0808,true);v.setUint16(8,0,true);
  v.setUint16(10,t,true);v.setUint16(12,d,true);v.setUint32(14,0,true);
  v.setUint32(18,z64?0xFFFFFFFF:0,true);v.setUint32(22,z64?0xFFFFFFFF:0,true);
  v.setUint16(26,n,true);v.setUint16(28,z64?20:0,true);b.set(e.nameBytes,30);
  if(z64){const o=30+n;v.setUint16(o,1,true);v.setUint16(o+2,16,true)}
  return b;
}
function zDesc(crc,size,z64){
  const b=new Uint8Array(z64?24:16),v=new DataView(b.buffer);
  v.setUint32(0,0x08074b50,true);v.setUint32(4,crc,true);
  if(z64){v.setBigUint64(8,BigInt(size),true);v.setBigUint64(16,BigInt(size),true)}
  else{v.setUint32(8,size,true);v.setUint32(12,size,true)}
  return b;
}
function zCentral(x,z64){
  const e=x.e,n=e.nameBytes.length,b=new Uint8Array(46+n+(z64?28:0)),v=new DataView(b.buffer),[t,d]=dosDT(e.mtime);
  v.setUint32(0,0x02014b50,true);v.setUint16(4,z64?45:20,true);v.setUint16(6,z64?45:20,true);v.setUint16(8,0x0808,true);v.setUint16(10,0,true);
  v.setUint16(12,t,true);v.setUint16(14,d,true);v.setUint32(16,x.crc,true);
  v.setUint32(20,z64?0xFFFFFFFF:e.size,true);v.setUint32(24,z64?0xFFFFFFFF:e.size,true);
  v.setUint16(28,n,true);v.setUint16(30,z64?28:0,true);v.setUint16(32,0,true);v.setUint16(34,0,true);v.setUint16(36,0,true);
  v.setUint32(38,0,true);v.setUint32(42,z64?0xFFFFFFFF:x.start,true);b.set(e.nameBytes,46);
  if(z64){const o=46+n;v.setUint16(o,1,true);v.setUint16(o+2,24,true);v.setBigUint64(o+4,BigInt(e.size),true);v.setBigUint64(o+12,BigInt(e.size),true);v.setBigUint64(o+20,BigInt(x.start),true)}
  return b;
}
function zEnd(count,cdSize,cdStart,z64){
  const b=new Uint8Array(z64?98:22),v=new DataView(b.buffer);let o=0;
  if(z64){
    v.setUint32(0,0x06064b50,true);v.setBigUint64(4,44n,true);v.setUint16(12,45,true);v.setUint16(14,45,true);
    v.setUint32(16,0,true);v.setUint32(20,0,true);v.setBigUint64(24,BigInt(count),true);v.setBigUint64(32,BigInt(count),true);
    v.setBigUint64(40,BigInt(cdSize),true);v.setBigUint64(48,BigInt(cdStart),true);
    v.setUint32(56,0x07064b50,true);v.setUint32(60,0,true);v.setBigUint64(64,BigInt(cdStart+cdSize),true);v.setUint32(72,1,true);
    o=76;
  }
  v.setUint32(o,0x06054b50,true);v.setUint16(o+4,0,true);v.setUint16(o+6,0,true);
  v.setUint16(o+8,z64?0xFFFF:count,true);v.setUint16(o+10,z64?0xFFFF:count,true);
  v.setUint32(o+12,z64?0xFFFFFFFF:cdSize,true);v.setUint32(o+16,z64?0xFFFFFFFF:cdStart,true);v.setUint16(o+20,0,true);
  return b;
}
async function* zipGen(entries,z64){
  let off=0;const done=[];
  for(const e of entries){
    const lh=zLocal(e,z64);yield lh;const start=off;off+=lh.length;
    let c=0xFFFFFFFF,sz=0;const rd=e.file.stream().getReader();
    while(true){const r=await rd.read();if(r.done)break;c=crcUpdate(c,r.value);sz+=r.value.length;off+=r.value.length;yield r.value}
    if(sz!==e.size)throw new Error('Tệp "'+e.file.name+'" bị thay đổi trong lúc nén.');
    const crc=(c^0xFFFFFFFF)>>>0,dd=zDesc(crc,sz,z64);yield dd;off+=dd.length;
    done.push({e,crc,start});
  }
  const cdStart=off;let cdSize=0;
  for(const x of done){const b=zCentral(x,z64);yield b;cdSize+=b.length}
  yield zEnd(done.length,cdSize,cdStart,z64);
}
function genStream(g){return new ReadableStream({async pull(c){const r=await g.next();if(r.done)c.close();else c.enqueue(r.value)}})}

/* ----- Mã hóa RFC 8188 (AES-128-GCM) tự điều khiển được muối → tải tiếp được từ giữa chừng ----- */
const ECE_RS=65536,ECE_HDR=21;
async function eceKeys(ikm,salt){
  const k=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);
  const hk=info=>({name:'HKDF',hash:'SHA-256',salt,info:enc.encode(info)});
  const cek=await crypto.subtle.deriveBits(hk('Content-Encoding: aes128gcm\0'),k,128);
  const nonce=await crypto.subtle.deriveBits(hk('Content-Encoding: nonce\0'),k,96);
  return{cek:await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']),nonce:new Uint8Array(nonce)};
}
async function eceCtx(ikm,salt,P,extraEmpty,rs){
  rs=rs||ECE_RS;const pl=rs-17,keys=await eceKeys(ikm,salt);
  let nrec=Math.max(1,Math.ceil(P/pl));if(extraEmpty&&P>0&&P%pl===0)nrec++;
  const lastLen=P-(nrec-1)*pl;
  const header=new Uint8Array(ECE_HDR);header.set(salt,0);new DataView(header.buffer).setUint32(16,rs,false);
  return{rs,pl,P,nrec,header,cek:keys.cek,nonce:keys.nonce,total:ECE_HDR+(nrec-1)*rs+lastLen+17};
}
async function eceRecord(ctx,seq,plain,final){
  const iv=ctx.nonce.slice(),hi=Math.floor(seq/4294967296),lo=seq>>>0;
  iv[4]^=hi>>>24;iv[5]^=(hi>>>16)&255;iv[6]^=(hi>>>8)&255;iv[7]^=hi&255;
  iv[8]^=lo>>>24;iv[9]^=(lo>>>16)&255;iv[10]^=(lo>>>8)&255;iv[11]^=lo&255;
  const d=new Uint8Array(plain.length+1);d.set(plain);d[plain.length]=final?2:1;
  return new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,tagLength:128},ctx.cek,d));
}
async function eceRange(ctx,blob,s,e){          // trả về byte [s,e) của luồng đã mã hóa
  const out=new Uint8Array(e-s);
  if(s<ECE_HDR)out.set(ctx.header.subarray(s,Math.min(ECE_HDR,e)),0);
  if(e>ECE_HDR){
    const lo=Math.max(s,ECE_HDR),r0=Math.floor((lo-ECE_HDR)/ctx.rs),r1=Math.floor((e-1-ECE_HDR)/ctx.rs);
    const p0=r0*ctx.pl,p1=Math.min((r1+1)*ctx.pl,ctx.P);
    const plain=new Uint8Array(await blob.slice(p0,p1).arrayBuffer());
    for(let r=r0;r<=r1;r++){
      const a=r*ctx.pl-p0,b=Math.min((r+1)*ctx.pl,ctx.P)-p0;
      const rec=await eceRecord(ctx,r,plain.subarray(a,b),r===ctx.nrec-1);
      const rs0=ECE_HDR+r*ctx.rs,from=Math.max(rs0,s),to=Math.min(rs0+rec.length,e);
      if(to>from)out.set(rec.subarray(from-rs0,to-rs0),from-s);
    }
  }
  return out;
}
/*==END-HELPERS==*/


/*==QR==*/
/* ----- Mã QR: chế độ byte, sửa lỗi mức M (L nếu link rất dài), chọn mặt nạ tốt nhất ----- */
const QR_ECC={
  M:{f:0,e:[0,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
        b:[0,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49]},
  L:{f:1,e:[0,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
        b:[0,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25]}
};
function qrMatrix(text){
  const bytes=Array.from(enc.encode(text));
  const rawMods=v=>{let r=(16*v+128)*v+64;if(v>=2){const a=Math.floor(v/7)+2;r-=(25*a-10)*a-55;if(v>=7)r-=36}return r};
  let ec=null,ver=0;
  for(const k of ['M','L']){
    const E=QR_ECC[k];
    for(let v=1;v<=40;v++){
      const cap=Math.floor(rawMods(v)/8)-E.e[v]*E.b[v];
      if(4+(v<=9?8:16)+bytes.length*8<=cap*8){ec=E;ver=v;break}
    }
    if(ec)break;
  }
  if(!ec)throw new Error('Link quá dài để tạo mã QR.');
  const capBytes=Math.floor(rawMods(ver)/8)-ec.e[ver]*ec.b[ver];
  const bits=[];const put=(val,n)=>{for(let i=n-1;i>=0;i--)bits.push((val>>>i)&1)};
  put(4,4);put(bytes.length,ver<=9?8:16);bytes.forEach(b=>put(b,8));
  put(0,Math.min(4,capBytes*8-bits.length));
  while(bits.length%8)bits.push(0);
  const data=[];
  for(let i=0;i<bits.length;i+=8){let x=0;for(let j=0;j<8;j++)x=(x<<1)|bits[i+j];data.push(x)}
  for(let pd=0xEC;data.length<capBytes;pd^=0xEC^0x11)data.push(pd);
  /* Reed–Solomon */
  const gmul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z};
  const nb=ec.b[ver],el=ec.e[ver],raw=Math.floor(rawMods(ver)/8),ns=nb-raw%nb,sl=Math.floor(raw/nb);
  const div=Array(el).fill(0);div[el-1]=1;
  for(let r=1,i=0;i<el;i++){for(let j=0;j<el;j++){div[j]=gmul(div[j],r);if(j+1<el)div[j]^=div[j+1]}r=gmul(r,2)}
  const blocks=[];
  for(let i=0,k=0;i<nb;i++){
    const d=data.slice(k,k+sl-el+(i<ns?0:1));k+=d.length;
    const rem=Array(el).fill(0);
    for(const b of d){const f=b^rem.shift();rem.push(0);div.forEach((c,j)=>{rem[j]^=gmul(c,f)})}
    if(i<ns)d.push(0);
    blocks.push(d.concat(rem));
  }
  const all=[];
  for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==sl-el||j>=ns)all.push(b[i])});
  /* Vẽ ma trận */
  const n=ver*4+17;
  const M=Array.from({length:n},()=>Array(n).fill(0)),F=Array.from({length:n},()=>Array(n).fill(false));
  const setF=(x,y,v)=>{M[y][x]=v?1:0;F[y][x]=true};
  for(let i=0;i<n;i++){setF(6,i,i%2===0);setF(i,6,i%2===0)}
  const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<n&&y>=0&&y<n)setF(x,y,d!==2&&d!==4)}};
  finder(3,3);finder(n-4,3);finder(3,n-4);
  const na=ver===1?0:Math.floor(ver/7)+2,ap=[];
  if(na){const step=ver===32?26:Math.ceil((ver*4+4)/(na*2-2))*2;ap.push(6);for(let q=n-7;ap.length<na;q-=step)ap.splice(1,0,q)}
  for(let i=0;i<na;i++)for(let j=0;j<na;j++){
    if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0))continue;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)setF(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
  }
  const fmt=mask=>{
    const d=(ec.f<<3)|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);
    const b=((d<<10)|r)^0x5412,g=i=>((b>>>i)&1)!==0;
    for(let i=0;i<=5;i++)setF(8,i,g(i));
    setF(8,7,g(6));setF(8,8,g(7));setF(7,8,g(8));
    for(let i=9;i<15;i++)setF(14-i,8,g(i));
    for(let i=0;i<8;i++)setF(n-1-i,8,g(i));
    for(let i=8;i<15;i++)setF(8,n-15+i,g(i));
    setF(8,n-8,true);
  };
  fmt(0);
  if(ver>=7){
    let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);
    const b=(ver<<12)|r;
    for(let i=0;i<18;i++){const c=((b>>>i)&1)!==0,a=n-11+i%3,q=Math.floor(i/3);setF(a,q,c);setF(q,a,c)}
  }
  let bi=0;
  for(let right=n-1;right>=1;right-=2){
    if(right===6)right=5;
    for(let vert=0;vert<n;vert++)for(let j=0;j<2;j++){
      const x=right-j,up=((right+1)&2)===0,y=up?n-1-vert:vert;
      if(!F[y][x]&&bi<all.length*8){M[y][x]=(all[bi>>>3]>>>(7-(bi&7)))&1;bi++}
    }
  }
  const maskFn=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,
    (x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,
    (x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const apply=m=>{for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!F[y][x]&&maskFn[m](x,y))M[y][x]^=1};
  const penalty=()=>{
    let p=0,dark=0;
    const lineScore=str=>{
      let q=0;
      for(const m of str.matchAll(/0{5,}|1{5,}/g))q+=3+(m[0].length-5);
      q+=(str.match(/(?=00001011101|10111010000)/g)||[]).length*40;
      return q;
    };
    for(let y=0;y<n;y++){p+=lineScore(M[y].join(''));for(let x=0;x<n;x++)dark+=M[y][x]}
    for(let x=0;x<n;x++){let c='';for(let y=0;y<n;y++)c+=M[y][x];p+=lineScore(c)}
    for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const v=M[y][x];if(v===M[y][x+1]&&v===M[y+1][x]&&v===M[y+1][x+1])p+=3}
    const tot=n*n;p+=(Math.ceil(Math.abs(dark*20-tot*10)/tot)-1)*10;
    return p;
  };
  let best=0,bestP=Infinity;
  for(let m=0;m<8;m++){apply(m);fmt(m);const sc=penalty();if(sc<bestP){bestP=sc;best=m}apply(m)}
  apply(best);fmt(best);
  return M;
}
function drawQr(cv,text,px){
  const m=qrMatrix(text),n=m.length,q=4,sc=Math.max(2,Math.floor(px/(n+q*2))),d=(n+q*2)*sc;
  cv.width=cv.height=d;
  const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,d,d);c.fillStyle='#000';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])c.fillRect((x+q)*sc,(y+q)*sc,sc,sc);
}
/*==END-QR==*/

/* ---------- Kiểm tra bộ mã hóa tự viết có cho ra đúng từng byte như thư viện không ---------- */
let ownP=null;
function ownConfig(lib){return ownP||(ownP=eceSelfTest(lib.Keychain).catch(()=>null))}
async function eceSelfTest(Keychain){
  const kc=new Keychain();
  const ikmFns={
    raw:async k=>k.key,
    hkdf:async k=>{
      const base=await crypto.subtle.importKey('raw',k.key,'HKDF',false,['deriveBits']);
      return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt:new Uint8Array(0),info:enc.encode('encryption')},base,128));
    }
  };
  const samples=[];
  for(const P of [1,1000,65518,65519,65520,131038,131039,200000]){
    const plain=new Uint8Array(P);
    for(let o=0;o<P;o+=65536)crypto.getRandomValues(plain.subarray(o,Math.min(o+65536,P)));
    const out=await kc.encryptStream(streamOf(plain));
    samples.push({plain,ct:new Uint8Array(await new Response(out).arrayBuffer())});
  }
  for(const id of Object.keys(ikmFns)){
    const ikm=await ikmFns[id](kc);
    for(const extra of [false,true]){
      let ok=true;
      for(const s of samples){
        const ctx=await eceCtx(ikm,s.ct.subarray(0,16),s.plain.length,extra);
        const mine=await eceRange(ctx,new Blob([s.plain]),0,ctx.total);
        if(mine.length!==s.ct.length||!mine.every((v,i)=>v===s.ct[i])){ok=false;break}
      }
      if(ok)return{id,extra,ikmFn:ikmFns[id]};
    }
  }
  return null;                          // không khớp → dùng thư viện, không tải tiếp được nhưng vẫn gửi bình thường
}

/* ---------- Lưu trạng thái để tải tiếp ---------- */
const fpOf=items=>items.map(f=>f.name+'|'+f.size+'|'+f.lastModified);
function readResume(){try{const r=JSON.parse(localStorage.getItem(RESUME_KEY)||'null');return(r&&r.v===1&&Date.now()-r.t<RESUME_MAX_MS)?r:null}catch(e){return null}}
function loadResume(fp){const r=readResume();return(r&&JSON.stringify(r.fp)===JSON.stringify(fp))?r:null}
function saveResume(r){try{localStorage.setItem(RESUME_KEY,JSON.stringify(r))}catch(e){}}
function clearResume(){try{localStorage.removeItem(RESUME_KEY)}catch(e){}}

/* ---------- Lịch sử link đã gửi (lưu trên máy này) ---------- */
function readHist(){
  try{const a=JSON.parse(localStorage.getItem(HIST_KEY)||'[]');return Array.isArray(a)?a.filter(h=>h&&Array.isArray(h.lines)&&h.lines.length&&h.exp):[]}
  catch(e){return[]}
}
function writeHist(a){try{localStorage.setItem(HIST_KEY,JSON.stringify(a))}catch(e){}}
function addHist(h){
  const a=readHist().filter(x=>Date.now()-x.exp<7*86400000);   // dọn mục đã hết hạn quá 7 ngày
  a.unshift(h);writeHist(a.slice(0,HIST_MAX));
}
function fmtDT(ms){const d=new Date(ms),p=n=>String(n).padStart(2,'0');return p(d.getHours())+':'+p(d.getMinutes())+' '+p(d.getDate())+'/'+p(d.getMonth()+1)}

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
.pick2{display:block;width:100%;margin-top:10px;padding:11px;font-size:16px;font-weight:700;background:#12404f;border:1px solid #1d5666;border-radius:12px}
.zip{display:flex;gap:8px;align-items:center;justify-content:center;margin-top:12px;font-size:13.5px;color:#d8d2c8;cursor:pointer}
.zip input{width:16px;height:16px;accent-color:#5fa800}
.drop{border:2px dashed #3b4a4f;border-radius:14px;padding:18px 12px;text-align:center}
.drop.hot{border-color:#f5c542;background:rgba(245,197,66,.06)}
.hint{margin:10px 0 0;text-align:center;color:#8f8a82;font-size:12.5px}
.resnote{color:#f5c542}
.list{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:8px}
.li{background:#1b1815;border:1px solid #2c2a26;border-radius:10px;padding:8px 10px}
.li .nm{display:flex;gap:8px;justify-content:space-between;font-size:13.5px}
.li .nm b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.li .nm i{font-style:normal;color:#a9a39a;flex:none}
.bar{height:6px;margin-top:6px;border-radius:99px;background:#2c2a26;overflow:hidden}
.bar>div{height:100%;width:0;background:#5fa800;transition:width .2s}
.sum{text-align:center;color:#d8d2c8;font-size:14px;margin:0 0 4px}
.spd{text-align:center;color:#a9a39a;font-size:13px;margin:0 0 10px;min-height:1.3em}
.linkbox{resize:none;width:100%;padding:10px;border-radius:10px;border:1px solid #1d5666;background:#0b2630;color:#e8f1f3;font:13px/1.3 ui-monospace,Menlo,Consolas,monospace}
.row{display:flex;gap:8px;margin-top:10px}
.row button{flex:1}
.row.sh{flex-wrap:wrap}.row.sh button{flex:1 1 45%}
.ok{color:#7ee08f;text-align:center;font-weight:700;margin:0 0 10px}
.err{background:#3a1616;border:1px solid #ef5350;color:#ffd0cf;border-radius:10px;padding:10px 12px;font-size:13.5px;margin:0 0 10px;word-break:break-word;white-space:pre-wrap}
.done-bar{display:none;align-items:center;gap:8px;margin-top:12px;padding:8px 10px;background:#12404f;border:1px solid #f5c542;border-radius:10px;font-size:13.5px}
.done-bar.on{display:flex}.done-bar span{flex:1;min-width:0}
button:disabled{opacity:.5;cursor:default}
.hist{margin-top:16px}
.hh{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;color:#d8d2c8;font-size:13.5px}
.hl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;max-height:240px;overflow:auto}
.hi.old{opacity:.55}
.when{margin-top:2px;color:#a9a39a;font-size:12px}
.acts{display:flex;gap:6px;margin-top:6px}
.acts button{flex:1}.acts button:last-child{flex:0 0 auto}
.qrm{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(4,14,19,.9)}
.qrm.on{display:flex}
.qrc{width:100%;max-width:340px;max-height:100%;overflow:auto;background:#0b1f27;border:1px solid #1d5666;border-radius:14px;padding:14px;text-align:center}
.qrc canvas{display:block;margin:0 auto;width:min(260px,100%);height:auto;background:#fff;border-radius:8px;image-rendering:pixelated}
.qrt{margin:10px 0 4px;font:12px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#a9a39a;word-break:break-all;max-height:3.9em;overflow:hidden}
.wl{color:#a9a39a}
</style>
<div class="ov" id="ov" role="dialog" aria-label="Lưu file tạm">
 <div class="card" id="card" data-view="idle">
  <div class="top">
    <div class="ttl">
      <h2>☁ Máy chủ Nguyễn Anh Tuấn</h2>
      <span class="chip"><i class="dot ok" id="dot"></i><span id="stat">Sẵn sàng</span></span>
    </div>
    <button class="xbtn" id="x" type="button" aria-label="Đóng" title="Đóng">✕</button>
  </div>
  <div class="body">
    <div class="view v-idle">
      <div class="drop" id="drop">
        <p class="note">Tệp được mã hóa ngay trên máy bạn rồi mới gửi đi. Tối đa ${MAX_FILES} tệp riêng lẻ mỗi lần; gộp .zip thì không giới hạn số tệp.</p>
        <button class="pick" id="pick" type="button">📦 Chọn Tệp</button>
        <button class="pick2" id="pickDir" type="button">📁 Chọn Thư Mục</button>
        <label class="zip"><input type="checkbox" id="zipChk" checked> Gộp nhiều tệp thành 1 file .zip</label>
        <p class="hint">hoặc kéo thả tệp/thư mục vào đây · lưu ${RETENTION_TEXT}</p>
        <p class="hint resnote" id="resNote"></p>
      </div>
      <input type="file" id="inp" multiple hidden>
      <input type="file" id="dirInp" webkitdirectory hidden>
      <div class="hist" id="hist" style="display:none">
        <div class="hh"><b>🕘 Link đã gửi</b><button class="sm" id="histClear" type="button">Xóa hết</button></div>
        <ul class="hl" id="histList"></ul>
        <p class="hint">Lưu trên máy này (có cả khóa giải mã), đóng khung không mất. Máy dùng chung thì nhớ bấm Xóa.</p>
      </div>
    </div>
    <div class="view v-busy">
      <p class="sum" id="sum"></p>
      <p class="spd" id="spd"></p>
      <ul class="list" id="list"></ul>
      <p class="hint wl" id="wlNote"></p>
      <button class="sm" id="cancel" type="button" style="width:100%">Hủy</button>
    </div>
    <div class="view v-done">
      <p class="ok">✓ Đã tải lên xong</p>
      <textarea class="linkbox" id="link" rows="1" readonly></textarea>
      <div class="row"><button class="gold" id="copy" type="button">SAO CHÉP</button><button id="more" type="button">Gửi thêm tệp</button></div>
      <div class="row sh">
        <button class="sm" id="shNative" type="button">📤 Chia sẻ</button>
        <button class="sm" id="shZalo" type="button">Zalo</button>
        <button class="sm" id="shMsg" type="button">Messenger</button>
        <button class="sm" id="shMail" type="button">✉ Email</button>
        <button class="sm" id="shQr" type="button">📱 Mã QR</button>
      </div>
      <p class="hint" id="keep"></p>
      <div class="done-bar" id="doneBar"><span id="doneTxt"></span><button class="sm gold" id="doneGo" type="button">Về ngay</button><button class="sm" id="doneStay" type="button">Ở lại</button></div>
    </div>
    <div class="view v-err">
      <div class="err" id="errTxt"></div>
      <div class="row"><button class="gold" id="retry" type="button">Thử lại</button><button id="out" type="button">↗ Mở file.kiwi</button></div>
    </div>
  </div>
 </div>
 <div class="qrm" id="qrm">
  <div class="qrc">
    <canvas id="qrCv" width="300" height="300"></canvas>
    <p class="qrt" id="qrTxt"></p>
    <p class="hint" id="qrNote"></p>
    <div class="row"><button class="gold" id="qrDl" type="button">⬇ Tải ảnh PNG</button><button id="qrX" type="button">Đóng</button></div>
  </div>
 </div>
</div>`;

const $=id=>root.getElementById(id);
const ov=$('ov'),card=$('card');
let busy=false,pushed=false,ac=null,lastInput=null,viaProxy=false,backT=null,libP=null,meter=null;
const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

/* ---------- Giữ máy không ngủ & cảnh báo khi lỡ đóng tab ---------- */
let wl=null,wlWant=false;
async function wakeOn(){
  wlWant=true;
  try{
    if(!navigator.wakeLock||wl)return;
    const l=await navigator.wakeLock.request('screen');
    if(!wlWant){try{l.release()}catch(e){}return}
    wl=l;l.addEventListener('release',()=>{if(wl===l)wl=null});
  }catch(e){wl=null}
}
function wakeOff(){wlWant=false;const l=wl;wl=null;try{if(l)l.release()}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(wlWant&&document.visibilityState==='visible')wakeOn()});   // trình duyệt tự nhả khi ẩn tab → xin lại
window.addEventListener('resize',()=>{if(card.dataset.view==='done')fitLink()});
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';return ''}});

function setView(v){card.dataset.view=v}
function setStat(kind,text){$('dot').className='dot '+(kind||'');$('stat').textContent=text}

/* ---------- Phần trăm, tốc độ, thời gian còn lại ---------- */
function newMeter(total){meter={total,samples:[],last:0}}
function pctText(done,total){const p=Math.max(0,Math.min(100,done/total*100));return p.toFixed(p<10||total>1073741824?1:0)+'%'}
function tick(done){
  if(!meter)return;
  const t=Date.now();
  if(!meter.samples.length){meter.samples.push([t,done]);return}
  meter.samples.push([t,done]);
  while(meter.samples.length>2&&t-meter.samples[0][0]>20000)meter.samples.shift();
  if(t-meter.last<400&&done<meter.total)return;
  meter.last=t;
  const a=meter.samples[0],b=meter.samples[meter.samples.length-1],dt=(b[0]-a[0])/1000;
  const sp=dt>0.5?(b[1]-a[1])/dt:0;
  let s='';
  if(sp>0){s=fmtSize(sp)+'/giây';const rem=(meter.total-done)/sp;if(rem>=1&&done<meter.total)s+=' · còn khoảng '+fmtTime(rem)}
  $('spd').textContent=s;
}
function report(label,done,total){setStat('wait','Đang Upload '+pctText(done,total));tick(done)}

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
    const er=new Error('file.kiwi không cho gửi loại tệp chạy/cài đặt'+ex+'. Hãy nén thành .zip rồi gửi lại.');er.noFallback=true;return er;
  }
  return new Error((j.error||j.message||'Lỗi máy chủ')+' (mã '+r.status+')');
}

/* ---------- Danh sách tệp trên giao diện ---------- */
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

/* ---------- Gộp .zip ---------- */
function planItems(files){
  const hasDir=files.some(f=>f.webkitRelativePath);
  const zip=hasDir||(files.length>1&&$('zipChk').checked);
  if(!zip)return{items:files,zip:false};
  const used=new Map();
  const entries=files.map(f=>{
    let p=(f.webkitRelativePath||f.name).replace(/\\/g,'/').replace(/^\/+/,'');
    const k=p.toLowerCase(),c=used.get(k)||0;used.set(k,c+1);
    if(c){const i=p.lastIndexOf('.'),sl=p.lastIndexOf('/');p=i>sl?p.slice(0,i)+' ('+(c+1)+')'+p.slice(i):p+' ('+(c+1)+')'}
    return{nameBytes:enc.encode(p),size:f.size,mtime:f.lastModified,file:f};
  });
  const plan=zipPlan(entries);
  const root=hasDir?(files[0].webkitRelativePath.split('/')[0]||'thu-muc'):'tep-gop-'+stamp();
  return{zip:true,items:[{name:root+'.zip',size:plan.total,type:'application/zip',lastModified:0,isZip:true,
    stream:()=>genStream(zipGen(entries,plan.z64))}]};
}

/* ---------- file.kiwi ---------- */
const statusPath=(j,i)=>'/v2/folders/'+j.folderId+'/files/'+j.files[i].fileId+'/upload-status?uploadAuth='+encodeURIComponent(j.uploadAuth||'');
function normMissing(m,total){
  m=(m||[]).map(Number);
  if(m.includes(0))m=m.map(x=>x+1);
  m=m.filter(x=>x>=1&&x<=total).sort((a,b)=>a-b);
  return m.length?m:Array.from({length:total},(_,i)=>i+1);
}
async function viaKiwi(items,fills,totalSize,sig){
  const lib=await loadLib(),Keychain=lib.Keychain;
  const own=items.some(i=>i.isZip)?null:await ownConfig(lib);
  const fp=fpOf(items);
  let kc=null,j=null,salts=null,resumed=false;

  /* 1) Thử tải tiếp lần dở dang */
  const rec=own?loadResume(fp):null;
  if(rec){
    try{
      kc=new Keychain(rec.secret);
      if(kc.keyB64!==rec.secret)throw new Error('key');
      j=rec.j;salts=rec.salts.map(fromHex);resumed=true;
    }catch(e){kc=null;j=null;clearResume()}
    if(resumed){
      const s=await callApi(statusPath(j,0),{signal:sig});          // lỗi mạng thì để lỗi nổi lên
      if(!s.ok){resumed=false;kc=null;j=null;salts=null;clearResume()}
    }
  }

  /* 2) Không có thì tạo thư mục mới */
  if(!resumed){
    kc=new Keychain();
    const secret=kc.keyB64,ske=await seal(kc,secret),metas=[];
    for(const f of items){
      const m={filename:await seal(kc,f.name),filesize:f.size};
      if(f.type)m.mimetype=f.type;
      metas.push(m);
    }
    const r=await callApi('/v2/folders',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({title:'Lưu file tạm',mode:'send',encryption:{ske},files:metas}),signal:sig});
    if(!r.ok)throw await apiError(r);
    j=await r.json();
    if(!j.folderId||!Array.isArray(j.files)||j.files.length!==items.length)throw new Error('Máy chủ trả về dữ liệu không như mong đợi.');
    if(own){
      salts=items.map(()=>crypto.getRandomValues(new Uint8Array(16)));
      saveResume({v:1,t:Date.now(),fp,secret,j,salts:salts.map(toHex)});
    }
  }else{
    $('sum').textContent='Tiếp tục lần tải dở dang trước đó…';
  }
  const secret=kc.keyB64;
  const ikm=own?await own.ikmFn(kc):null;

  /* 3) Giữ thư mục "còn đang tải" khi tải lâu */
  let cur=0;
  const ka=setInterval(()=>{callApi(statusPath(j,cur),{signal:sig}).catch(()=>{})},KEEPALIVE_MS);
  try{
    for(let i=0;i<items.length;i++){
      cur=i;
      const it=items[i],info=j.files[i],u=info.uploadUrls,cs=info.chunkSize;
      const base=u.head.replace(/\/?$/,'/')+u.path+'/';
      const put=(n,data)=>putChunk(base+String(n).padStart(5,'0')+'?'+u.tail+'&X-Amz-Signature='+u.signatures[n-1],u.headers,data,sig);
      const before=items.slice(0,i).reduce((a,x)=>a+x.size,0);
      const label='Đang tải lên '+(i+1)+'/'+items.length;
      $('sum').textContent=resumed?'Tiếp tục tải tệp '+(i+1)+'/'+items.length+'…':'Đang tải tệp '+(i+1)+'/'+items.length+'…';
      let n=0;

      if(own){
        const ctx=await eceCtx(ikm,salts[i],it.size,own.extra);
        if(Math.ceil(ctx.total/cs)!==info.chunks)throw new Error('Số phần dữ liệu không khớp với máy chủ.');
        let todo=Array.from({length:info.chunks},(_,k)=>k+1);
        if(resumed){
          const sr=await callApi(statusPath(j,i),{signal:sig});
          if(sr.ok){const sj=await sr.json();todo=sj.complete?[]:normMissing(sj.missing,info.chunks)}
        }
        if(todo.length>2){const f=todo[0],l=todo[todo.length-1];todo=[f,l].concat(todo.slice(1,-1))}
        n=info.chunks-todo.length;
        fills[i].style.width=Math.round(n/info.chunks*100)+'%';
        report(label,before+it.size*n/info.chunks,totalSize);
        const sender=parSender(PARALLEL,sig);
        for(const c of todo){
          await sender.add(async()=>{
            const data=await eceRange(ctx,it,(c-1)*cs,Math.min(c*cs,ctx.total));
            await put(c,data);
            n++;
            fills[i].style.width=Math.round(n/info.chunks*100)+'%';
            report(label,before+it.size*n/info.chunks,totalSize);
          });
        }
        await sender.finish();
      }else{
        report(label,before,totalSize);
        const stream=await kc.encryptStream(it.stream());
        const sender=parSender(PARALLEL,sig);let fin=0;
        for await(const piece of pieces(stream,cs)){
          n++;
          if(n>info.chunks)throw new Error('Số phần dữ liệu không khớp với máy chủ.');
          const k=n;
          await sender.add(async()=>{
            await put(k,piece);
            fin++;
            fills[i].style.width=Math.round(fin/info.chunks*100)+'%';
            report(label,before+it.size*fin/info.chunks,totalSize);
          });
        }
        await sender.finish();
        if(n!==info.chunks||fin!==info.chunks)throw new Error('Thiếu phần dữ liệu khi tải lên.');
      }

      /* Chờ file.kiwi ghép xong tệp; nếu còn thiếu phần nào thì gửi bù (chỉ với tệp gửi nguyên bản) */
      let okFile=false,lastErr='',lastRaw='',resent=0;
      const tries=resumed?10:CONFIRM_TRIES;      // phiên cũ mà quá 10 lần vẫn chưa xong → coi như hỏng, gửi mới
      for(let t=0;t<tries&&!okFile;t++){
        setStat('wait','Đang Upload 100%');
        $('sum').style.whiteSpace='pre-line';
        $('sum').textContent='Đã gửi xong, đang chờ file.kiwi xác nhận… ('+(t+1)+'/'+tries+')\nCác bạn hãy đợi chút xíu !';
        let sj=null;
        try{
          const s=await callApi(statusPath(j,i),{signal:sig});
          if(s.ok){sj=await s.json();lastRaw=JSON.stringify(sj).slice(0,220)}else lastErr='HTTP '+s.status;
        }catch(e){if(sig.aborted)throw e;lastErr=(e&&e.message)||String(e)}
        if(sj&&sj.complete){okFile=true;break}
        if(own&&sj&&Array.isArray(sj.missing)&&sj.missing.length&&resent<3){
          resent++;
          const miss=normMissing(sj.missing,info.chunks);
          const ctx2=await eceCtx(ikm,salts[i],it.size,own.extra);
          const sender2=parSender(PARALLEL,sig);
          for(const c of miss){
            await sender2.add(async()=>{
              const data=await eceRange(ctx2,it,(c-1)*cs,Math.min(c*cs,ctx2.total));
              await put(c,data);
            });
          }
          await sender2.finish();
          continue;
        }
        await sleep(CONFIRM_GAP_MS);
      }
      if(!okFile&&resumed){const er=new Error('stale');er.stale=true;throw er}
      if(!okFile){
        const testLink=(j.folderUrlBase||String(j.folderUrl||'').split('#')[0])+'#'+secret;
        throw new Error('file.kiwi chưa xác nhận đã nhận đủ tệp "'+it.name+'"'+(lastErr?' ('+lastErr+')':'')+'.\nPhản hồi của máy chủ: '+(lastRaw||'(không có)')+'\nLink thử (tệp có thể đã lên, hãy mở thử): '+testLink+'\nHoặc bấm "Thử lại" để tải tiếp phần còn thiếu.');
      }
      fills[i].style.width='100%';
    }
  }finally{clearInterval(ka)}
  clearResume();
  const baseUrl=j.folderUrlBase||String(j.folderUrl||'').split('#')[0];
  return baseUrl+'#'+secret;
}

function showDone(lines,note,meta){
  const t=$('link');t.value=lines.join('\n');
  if(meta)addHist({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:Date.now(),exp:Date.now()+KIWI_MS,
    lines,names:meta.names,size:meta.size,litter:false});
  $('keep').textContent=note+' Link cũng được lưu ở mục “Link đã gửi” trên máy này.';
  const nat=!!navigator.share;
  $('shNative').style.display=nat?'':'none';
  $('shZalo').style.display=$('shMsg').style.display=(isMobile&&nat)?'none':'';
  setStat('ok','Đã tải lên xong');setView('done');fitLink();
}
function fitLink(){const t=$('link');t.style.height='auto';t.style.height=Math.min(t.scrollHeight+4,160)+'px'}
async function run(input){
  if(busy)return;
  const files=Array.from(input);
  if(!files.length)return;
  lastInput=files;
  const plan=planItems(files),items=plan.items;
  if(items.length>MAX_FILES){fail(new Error('Chọn quá '+MAX_FILES+' tệp riêng lẻ. Hãy bật ô "Gộp nhiều tệp thành 1 file .zip" rồi chọn lại.'));return}
  if(!plan.zip&&items.some(f=>!f.size)){fail(new Error('Có tệp rỗng (0 byte), không gửi được.'));return}
  busy=true;ac=new AbortController();
  const sig=ac.signal,myAc=ac;
  wakeOn();
  $('wlNote').textContent=navigator.wakeLock?'🔒 Đang giữ màn hình sáng. Đừng đóng tab hoặc tắt trình duyệt cho tới khi xong.':'⚠ Trình duyệt này không giữ được màn hình sáng: hãy tự giữ máy không ngủ và đừng chuyển sang ứng dụng khác.';
  const fills=buildList(items);
  const totalSize=items.reduce((a,x)=>a+x.size,0);
  newMeter(totalSize);
  $('sum').textContent='Đang chuẩn bị…';$('spd').textContent='';
  setView('busy');setStat('wait','Đang mã hóa & kết nối…');
  try{
    let r1;
    try{r1=await viaKiwi(items,fills,totalSize,sig)}
    catch(e){
      if(!(e&&e.stale)||sig.aborted)throw e;
      clearResume();                       // bỏ phiên cũ bị kẹt, gửi lại từ đầu
      setStat('wait','Phiên cũ bị kẹt, đang gửi lại từ đầu…');
      r1=await viaKiwi(items,fills,totalSize,sig);
    }
    const lines=[r1];
    const meta={names:items.map(x=>x.name),size:totalSize,litter:false};
    const note='Tệp được lưu '+RETENTION_TEXT+' rồi tự xóa. Chỉ ai có đủ link (kể cả phần sau dấu #) mới mở được.';
    showDone(lines,note,meta);
  }catch(e){
    if(sig.aborted)return;
    fail(e);
  }finally{if(ac===myAc){busy=false;wakeOff()}}
}
function fail(e){
  let m=(e&&e.message)||String(e);
  if(e instanceof TypeError)m='Không kết nối được tới file.kiwi (có thể mạng lỗi hoặc trình duyệt chặn truy cập trực tiếp). '+(PROXY?'':'Cần cấu hình PROXY — xem filekiwi-proxy-worker.js. ')+'Chi tiết: '+m;
  if(readResume())m+='\n\nTệp này có thể tải tiếp: bấm "Thử lại" hoặc chọn lại đúng tệp đó.';
  $('errTxt').textContent=m;
  setStat('bad','Có lỗi');setView('err');
}

/* ---------- Sao chép, chia sẻ & tự quay về ---------- */
function cancelBack(){clearInterval(backT);backT=null;$('doneBar').classList.remove('on')}
async function copyQuiet(){
  const t=$('link').value;let ok=false;
  try{await navigator.clipboard.writeText(t);ok=true}catch(e){}
  if(!ok){try{const el=$('link');el.focus();el.select();ok=document.execCommand('copy')}catch(e){}}
  return ok;
}
function noteBar(msg){cancelBack();$('doneTxt').textContent=msg;$('doneBar').classList.add('on')}
async function copyLink(){
  const ok=await copyQuiet();
  if(!ok){$('link').select();noteBar('Hãy nhấn giữ vào link để sao chép thủ công.');return}
  let n=RETURN_SECONDS;
  const upd=()=>{$('doneTxt').textContent='✓ Đã sao chép link. Tự quay về sau '+n+' giây…'};
  cancelBack();$('doneBar').classList.add('on');upd();
  backT=setInterval(()=>{n--;if(n<=0)close();else upd()},1000);
}
$('copy').onclick=copyLink;
$('shNative').onclick=async()=>{
  /* Gọi share() và sao chép ngay trong cùng lượt bấm (iOS yêu cầu). Chỉ gửi 1 chuỗi text thuần, không title/url riêng,
     để Zalo/Messenger không cắt mất phần sau dấu # (khóa giải mã). Đồng thời đã sao chép sẵn để dán tay nếu app vẫn cắt. */
  const cp=copyQuiet();
  const msg='Tệp gửi bạn — hãy mở link ĐẦY ĐỦ (kể cả phần sau dấu #):\n'+$('link').value.trim();
  try{await navigator.share({text:msg})}
  catch(e){if(e&&e.name==='AbortError')return}
  const ok=await cp;
  noteBar(ok?'Link đã được sao chép sẵn. Nếu người nhận không mở được, hãy dán link vào khung chat.':'Nếu người nhận không mở được, hãy sao chép link rồi dán vào khung chat.');
};
$('shZalo').onclick=async()=>{const p=copyQuiet();window.open('https://chat.zalo.me/','_blank','noopener');noteBar(await p?'Đã sao chép link — dán vào cuộc trò chuyện Zalo.':'Hãy sao chép link rồi dán vào Zalo.')};
$('shMsg').onclick=async()=>{
  const p=copyQuiet();
  if(isMobile)location.href='fb-messenger://';
  else window.open('https://www.messenger.com/','_blank','noopener');
  noteBar(await p?'Đã sao chép link — dán vào cuộc trò chuyện Messenger.':'Hãy sao chép link rồi dán vào Messenger.');
};
$('shMail').onclick=()=>{location.href='mailto:?subject='+encodeURIComponent('Tệp gửi bạn')+'&body='+encodeURIComponent($('link').value)};
$('doneGo').onclick=()=>close();
$('doneStay').onclick=cancelBack;
$('more').onclick=()=>{cancelBack();resetUI()};
$('retry').onclick=()=>{if(lastInput)run(lastInput);else resetUI()};
$('out').onclick=()=>window.open(SITE,'_blank','noopener');
$('cancel').onclick=()=>{if(ac)ac.abort();busy=false;clearResume();resetUI()};

/* ---------- Chọn tệp / thư mục / kéo thả ---------- */
const inp=$('inp'),dirInp=$('dirInp'),drop=$('drop');
$('pick').onclick=()=>{inp.value='';inp.click()};
$('pickDir').onclick=()=>{dirInp.value='';dirInp.click()};
inp.onchange=()=>{if(inp.files&&inp.files.length)run(inp.files)};
dirInp.onchange=()=>{if(dirInp.files&&dirInp.files.length)run(dirInp.files)};
['dragover','drop'].forEach(ev=>ov.addEventListener(ev,e=>e.preventDefault()));
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('hot')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('hot')}));
const entFile=en=>new Promise((res,rej)=>en.file(res,rej));
async function entWalk(en,path,out){
  if(en.isFile){
    const f=await entFile(en);
    try{Object.defineProperty(f,'webkitRelativePath',{value:path+en.name,configurable:true})}catch(e){}
    out.push(f);
  }else if(en.isDirectory){
    const rd=en.createReader();
    while(true){
      const batch=await new Promise((res,rej)=>rd.readEntries(res,rej));
      if(!batch.length)break;
      for(const c of batch)await entWalk(c,path+en.name+'/',out);
    }
  }
}
drop.addEventListener('drop',e=>{
  const dt=e.dataTransfer;if(!dt)return;
  const ents=Array.from(dt.items||[]).map(i=>(i.kind==='file'&&i.webkitGetAsEntry)?i.webkitGetAsEntry():null).filter(Boolean); // phải lấy ngay, trước mọi await
  const plain=Array.from(dt.files||[]);
  if(!ents.some(en=>en.isDirectory)){if(plain.length)run(plain);return}
  (async()=>{
    const out=[];
    for(const en of ents){
      if(en.isFile)out.push(await entFile(en));
      else await entWalk(en,'',out);
    }
    if(out.length)run(out);
  })().catch(err=>fail(err));
});

/* ---------- Sao chép (dùng cho lịch sử) ---------- */
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true}catch(e){}
  try{
    const el=document.createElement('textarea');el.value=t;el.style.cssText='position:fixed;opacity:0;left:0;top:0';
    root.appendChild(el);el.focus();el.select();const ok=document.execCommand('copy');el.remove();return ok;
  }catch(e){return false}
}

/* ---------- Mã QR ---------- */
const qrm=$('qrm');
function hideQr(){qrm.classList.remove('on')}
function showQr(text){
  const urls=String(text).match(/https?:\/\/\S+/g)||[];
  if(!urls.length)return;
  cancelBack();                                   // đang cho người khác quét thì đừng tự đóng khung
  const cv=$('qrCv');
  $('qrTxt').textContent=urls[0];
  $('qrNote').textContent=urls.length>1?'Có '+urls.length+' link — mã QR này là của link đầu tiên.':'Mở camera điện thoại và quét để mở link.';
  try{drawQr(cv,urls[0],640);cv.style.display='';$('qrDl').disabled=false}
  catch(e){cv.style.display='none';$('qrDl').disabled=true;$('qrNote').textContent=(e&&e.message)||'Không tạo được mã QR.'}
  qrm.classList.add('on');
}
$('qrX').onclick=hideQr;
qrm.addEventListener('click',e=>{if(e.target===qrm)hideQr()});
$('qrDl').onclick=()=>$('qrCv').toBlob(b=>{
  if(!b)return;
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='qr-'+stamp()+'.png';
  root.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
},'image/png');
$('shQr').onclick=()=>showQr($('link').value);

/* ---------- Danh sách lịch sử ---------- */
function renderHist(){
  const a=readHist(),box=$('hist'),ul=$('histList'),now=Date.now();
  ul.textContent='';box.style.display=a.length?'':'none';
  const mk=(txt,fn)=>{const x=document.createElement('button');x.type='button';x.className='sm';x.textContent=txt;x.onclick=fn;return x};
  for(const h of a){
    const old=now>=h.exp;
    const li=document.createElement('li');li.className='li hi'+(old?' old':'');
    const nm=document.createElement('div');nm.className='nm';
    const b=document.createElement('b');b.textContent=(h.names||[]).join(', ')||'Tệp';
    const sz=document.createElement('i');sz.textContent=h.size?fmtSize(h.size):'';
    nm.append(b,sz);
    const w=document.createElement('div');w.className='when';
    w.textContent='Gửi '+fmtDT(h.t)+' · '+(old?'đã hết hạn':'hết hạn '+(h.litter?'':'khoảng ')+fmtDT(h.exp))+(h.litter?' · không mã hóa':'');
    const acts=document.createElement('div');acts.className='acts';
    if(!old){
      const cp=mk('📋 Sao chép',async()=>{
        const ok=await copyText(h.lines.join('\n'));
        cp.textContent=ok?'✓ Đã chép':'Không chép được';setTimeout(()=>{cp.textContent='📋 Sao chép'},1500);
      });
      acts.append(cp,mk('📱 QR',()=>showQr(h.lines.join('\n'))));
    }
    acts.append(mk('🗑',()=>{writeHist(readHist().filter(x=>x.id!==h.id));renderHist()}));
    li.append(nm,w,acts);ul.append(li);
  }
}
$('histClear').onclick=()=>{if(confirm('Xóa toàn bộ lịch sử link đã gửi trên máy này?')){writeHist([]);renderHist()}};

/* ---------- Điều khiển ---------- */
function resumeHint(){
  const r=readResume();
  $('resNote').textContent=r?('Có lần tải dở dang ('+String(r.fp[0]).split('|')[0]+(r.fp.length>1?' và '+(r.fp.length-1)+' tệp khác':'')+'). Chọn lại đúng tệp đó để tải tiếp.'):'';
}
function resetUI(){setView('idle');setStat('ok','Sẵn sàng');$('link').value='';lastInput=null;resumeHint();renderHist()}
function open(){
  if(!host.isConnected)document.body.appendChild(host);
  const was=ov.classList.contains('on');
  ov.classList.add('on');
  if(!was&&!busy)resetUI();
  document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  if(!was&&!pushed){try{history.pushState({luuFileTam:1},'');pushed=true}catch(e){}}
}
function close(fromPop){
  if(busy&&!confirm('Đang tải lên. Đóng bây giờ sẽ dừng việc tải (chọn lại đúng tệp này trong vòng 34 giờ để tải tiếp). Vẫn đóng?')){
    if(fromPop&&pushed){try{history.pushState({luuFileTam:1},'')}catch(e){}}
    return;
  }
  if(ac)ac.abort();
  busy=false;wakeOff();cancelBack();hideQr();
  ov.classList.remove('on');
  document.documentElement.style.overflow='';document.body.style.overflow='';
  resetUI();
  if(pushed){pushed=false;if(!fromPop){try{history.back()}catch(e){}}}
  try{window.dispatchEvent(new CustomEvent('luufiletam:close'))}catch(e){}
}
window.addEventListener('popstate',()=>{if(ov.classList.contains('on')&&pushed)close(true)});
$('x').onclick=()=>close();
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!ov.classList.contains('on'))return;
  if(qrm.classList.contains('on'))hideQr();else close();
});
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('[data-luu-file]');
  if(t){e.preventDefault();open()}
});

function start(){document.body.appendChild(host)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.LuuFileTam={open,close};
})();
